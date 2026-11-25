import { NextRequest, NextResponse } from "next/server";
import { serviceClient } from "@/lib/supabaseServer";
import { resolverToken } from "@/lib/mcp/auth";
import { TOOLS } from "@/lib/mcp/tools";

// Servidor MCP do CRM AURA (transporte HTTP, respostas em JSON).
// Cada instalação do CRM (uma por clínica) tem o seu próprio /api/mcp.
// Autenticação: cabeçalho "Authorization: Bearer aura_..." gerado em Sistema › Conectar IA.

export const dynamic = "force-dynamic";

const VERSOES = ["2025-06-18", "2025-03-26", "2024-11-05"];

type Rpc = { jsonrpc: "2.0"; id?: string | number | null; method: string; params?: Record<string, unknown> };

function ok(id: Rpc["id"], result: unknown) {
  return { jsonrpc: "2.0", id: id ?? null, result };
}
function erro(id: Rpc["id"], code: number, message: string) {
  return { jsonrpc: "2.0", id: id ?? null, error: { code, message } };
}

export async function GET() {
  return new NextResponse("Use POST para falar com o MCP do CRM AURA.", { status: 405, headers: { Allow: "POST" } });
}

export async function POST(req: NextRequest) {
  const db = serviceClient();
  if (!db) {
    return NextResponse.json(erro(null, -32603, "Servidor sem SUPABASE_SERVICE_ROLE_KEY configurada."), { status: 500 });
  }

  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  const ctx = token ? await resolverToken(db, token) : null;
  if (!ctx) {
    return NextResponse.json(erro(null, -32001, "Token inválido. Gere um em Sistema › Conectar IA."), {
      status: 401,
      headers: { "WWW-Authenticate": 'Bearer realm="crm-aura"' },
    });
  }

  let body: Rpc | Rpc[];
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(erro(null, -32700, "JSON inválido."), { status: 400 });
  }

  const lote = Array.isArray(body) ? body : [body];
  const respostas = [];
  for (const msg of lote) {
    const r = await tratar(msg, db, ctx);
    if (r) respostas.push(r);
  }

  if (!respostas.length) return new NextResponse(null, { status: 202 });
  return NextResponse.json(Array.isArray(body) ? respostas : respostas[0]);
}

async function tratar(msg: Rpc, db: NonNullable<ReturnType<typeof serviceClient>>, ctx: NonNullable<Awaited<ReturnType<typeof resolverToken>>>) {
  const semResposta = msg.id === undefined || msg.id === null;
  switch (msg.method) {
    case "initialize": {
      const pedida = String(msg.params?.protocolVersion ?? "");
      return ok(msg.id, {
        protocolVersion: VERSOES.includes(pedida) ? pedida : VERSOES[0],
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: "crm-aura", title: `CRM AURA · ${ctx.clinicaNome}`, version: "0.1.0" },
        instructions:
          `Você está conectado ao CRM AURA da clínica "${ctx.clinicaNome}". ` +
          `Ao começar, diga ao usuário em qual clínica você está trabalhando. ` +
          `Antes de alterar qualquer agente, confirme o que vai mudar. ` +
          `Nunca invente dados de pacientes. Mensagens para pacientes não podem prometer resultado nem expor dados pessoais.`,
      });
    }
    case "notifications/initialized":
    case "notifications/cancelled":
      return null;
    case "ping":
      return ok(msg.id, {});
    case "tools/list":
      return ok(msg.id, { tools: TOOLS.map(({ name, description, inputSchema }) => ({ name, description, inputSchema })) });
    case "tools/call": {
      const nome = String(msg.params?.name ?? "");
      const tool = TOOLS.find((t) => t.name === nome);
      if (!tool) return erro(msg.id, -32602, `Ferramenta desconhecida: ${nome}`);
      try {
        const texto = await tool.run(db, ctx, (msg.params?.arguments as Record<string, unknown>) ?? {});
        return ok(msg.id, { content: [{ type: "text", text: `[${ctx.clinicaNome}]\n${texto}` }] });
      } catch (e) {
        return ok(msg.id, { content: [{ type: "text", text: `[${ctx.clinicaNome}] Não deu certo: ${(e as Error).message}` }], isError: true });
      }
    }
    default:
      return semResposta ? null : erro(msg.id, -32601, `Método não suportado: ${msg.method}`);
  }
}
