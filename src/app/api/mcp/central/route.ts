import { NextRequest, NextResponse } from "next/server";
import { serviceClient } from "@/lib/supabaseServer";
import { resolverToken } from "@/lib/mcp/auth";
import { TOOLS } from "@/lib/mcp/tools";

// MCP CENTRAL (só na instalação da Aura).
// Você conecta o Claude UMA vez aqui. Ele enxerga todos os clientes do painel,
// trabalha no cliente que estiver ativo e avisa quando você troca de conta.
// Cada pedido é repassado para o MCP da instalação do cliente (o banco dele).

export const dynamic = "force-dynamic";

type Rpc = { jsonrpc: "2.0"; id?: string | number | null; method: string; params?: Record<string, unknown> };
type Db = NonNullable<ReturnType<typeof serviceClient>>;
type Cliente = { id: string; nome: string; url_sistema: string; status: string; gestao: string };

const ok = (id: Rpc["id"], result: unknown) => ({ jsonrpc: "2.0", id: id ?? null, result });
const erro = (id: Rpc["id"], code: number, message: string) => ({ jsonrpc: "2.0", id: id ?? null, error: { code, message } });
const texto = (id: Rpc["id"], t: string, isError = false) => ok(id, { content: [{ type: "text", text: t }], ...(isError ? { isError } : {}) });

const FERRAMENTAS_CENTRAIS = [
  {
    name: "listar_clientes",
    description: "Lista as clínicas clientes do painel, mostra qual está ativa agora e quem cuida da hospedagem (Aura ou o próprio cliente).",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "usar_cliente",
    description: "Troca a conta em que o Claude está trabalhando. Informe o nome (ou parte do nome) da clínica.",
    inputSchema: { type: "object", properties: { cliente: { type: "string" } }, required: ["cliente"] },
  },
];

export async function GET() {
  return new NextResponse("Use POST para falar com o MCP central.", { status: 405, headers: { Allow: "POST" } });
}

export async function POST(req: NextRequest) {
  const db = serviceClient();
  if (!db) return NextResponse.json(erro(null, -32603, "Servidor sem SUPABASE_SERVICE_ROLE_KEY configurada."), { status: 500 });
  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  const ctx = token ? await resolverToken(db, token) : null;
  if (!ctx?.admin) {
    return NextResponse.json(erro(null, -32001, "Token inválido ou sem permissão de administrador."), { status: 401 });
  }

  let body: Rpc | Rpc[];
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(erro(null, -32700, "JSON inválido."), { status: 400 });
  }
  const lote = Array.isArray(body) ? body : [body];
  const respostas = [];
  for (const m of lote) {
    const r = await tratar(m, db, ctx.userId);
    if (r) respostas.push(r);
  }
  if (!respostas.length) return new NextResponse(null, { status: 202 });
  return NextResponse.json(Array.isArray(body) ? respostas : respostas[0]);
}

async function clienteAtivo(db: Db, userId: string) {
  const { data } = await db.from("cliente_ativo").select("cliente_id, visto_cliente_id").eq("user_id", userId).maybeSingle();
  if (!data?.cliente_id) return { cliente: null as Cliente | null, trocou: false };
  const { data: cliente } = await db.from("clientes_hub").select("id, nome, url_sistema, status, gestao").eq("id", data.cliente_id).maybeSingle();
  return { cliente: (cliente as Cliente) ?? null, trocou: data.visto_cliente_id !== data.cliente_id };
}

async function tratar(msg: Rpc, db: Db, userId: string) {
  switch (msg.method) {
    case "initialize": {
      const { cliente } = await clienteAtivo(db, userId);
      return ok(msg.id, {
        protocolVersion: String(msg.params?.protocolVersion ?? "2025-06-18"),
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: "crm-aura-central", title: "CRM AURA · Central", version: "0.1.0" },
        instructions:
          `Central da Aura: você trabalha em várias clínicas, uma de cada vez. ` +
          (cliente ? `A conta ativa agora é "${cliente.nome}". ` : `Nenhuma conta ativa: use listar_clientes e usar_cliente. `) +
          `Sempre diga em qual clínica está trabalhando antes de alterar algo. Quando uma resposta avisar que a conta mudou, comente isso com o usuário.`,
      });
    }
    case "notifications/initialized":
    case "notifications/cancelled":
      return null;
    case "ping":
      return ok(msg.id, {});
    case "tools/list":
      return ok(msg.id, {
        tools: [...FERRAMENTAS_CENTRAIS, ...TOOLS.map(({ name, description, inputSchema }) => ({ name, description: `${description} (Age na clínica ativa.)`, inputSchema }))],
      });
    case "tools/call": {
      const nome = String(msg.params?.name ?? "");
      const args = (msg.params?.arguments as Record<string, unknown>) ?? {};

      if (nome === "listar_clientes") {
        const [{ data }, { cliente }] = await Promise.all([
          db.from("clientes_hub").select("id, nome, url_sistema, status, gestao").order("nome"),
          clienteAtivo(db, userId),
        ]);
        const lista = (data as Cliente[]) ?? [];
        if (!lista.length) return texto(msg.id, "Nenhum cliente cadastrado no painel ainda.");
        return texto(msg.id, lista.map((c) => `${c.id === cliente?.id ? "▶ " : "- "}${c.nome} · ${c.status} · hospedagem: ${c.gestao === "aura" ? "Aura" : "cliente"} · ${c.url_sistema}`).join("\n"));
      }

      if (nome === "usar_cliente") {
        const busca = String(args.cliente ?? "").trim();
        const { data } = await db.from("clientes_hub").select("id, nome, status").ilike("nome", `%${busca}%`);
        if (!data?.length) return texto(msg.id, `Não achei cliente com "${busca}".`, true);
        if (data.length > 1) return texto(msg.id, `Achei mais de um: ${data.map((c) => c.nome).join(", ")}. Seja mais específico.`, true);
        await db.from("cliente_ativo").upsert({ user_id: userId, cliente_id: data[0].id, visto_cliente_id: data[0].id, updated_at: new Date().toISOString() });
        return texto(msg.id, `Pronto. Agora estamos na conta de ${data[0].nome}.`);
      }

      if (!TOOLS.some((t) => t.name === nome)) return erro(msg.id, -32602, `Ferramenta desconhecida: ${nome}`);

      const { cliente, trocou } = await clienteAtivo(db, userId);
      if (!cliente) return texto(msg.id, "Nenhuma clínica ativa. Escolha uma no painel de clientes ou use usar_cliente.", true);
      if (cliente.status === "transferido") return texto(msg.id, `${cliente.nome} foi transferida para o próprio cliente. Não alteramos mais essa conta por aqui.`, true);
      const { data: tk } = await db.from("clientes_hub_tokens").select("token").eq("cliente_id", cliente.id).maybeSingle();
      if (!tk) return texto(msg.id, `${cliente.nome} ainda não tem token do MCP salvo no painel de clientes.`, true);

      let resultado: { content?: { type: string; text: string }[]; isError?: boolean } | undefined;
      try {
        const resp = await fetch(`${cliente.url_sistema.replace(/\/$/, "")}/api/mcp`, {
          method: "POST",
          headers: { "content-type": "application/json", accept: "application/json", authorization: `Bearer ${tk.token}` },
          body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: nome, arguments: args } }),
        });
        const data = await resp.json();
        if (data.error) return texto(msg.id, `${cliente.nome}: ${data.error.message}`, true);
        resultado = data.result;
      } catch (e) {
        return texto(msg.id, `Não consegui falar com o sistema de ${cliente.nome} (${cliente.url_sistema}): ${(e as Error).message}`, true);
      }

      if (trocou) await db.from("cliente_ativo").update({ visto_cliente_id: cliente.id }).eq("user_id", userId);
      const aviso = trocou ? `Você trocou de conta: agora estamos em ${cliente.nome}.\n\n` : "";
      const corpo = (resultado?.content ?? []).map((c) => c.text).join("\n");
      return texto(msg.id, aviso + corpo, !!resultado?.isError);
    }
    default:
      return msg.id === undefined || msg.id === null ? null : erro(msg.id, -32601, `Método não suportado: ${msg.method}`);
  }
}
