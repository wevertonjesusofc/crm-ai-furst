import { SupabaseClient } from "@supabase/supabase-js";
import { TOOLS } from "@/lib/mcp/tools";
import { ContextoMcp } from "@/lib/mcp/auth";
import { segredo } from "@/lib/integracoes/servidor";

// O Gerente (IA) conversando por Telegram/WhatsApp com o dono e o time.
// Usa o Claude com as MESMAS ações do MCP (resumo do dia, jornada, retornos, giro…),
// então ele responde com os números reais da clínica.

const MODELO = "claude-sonnet-5-5";
const MAX_VOLTAS = 6;

// Ações que o Gerente pode usar sozinho pelo celular (só leitura + ajustes simples).
const PERMITIDAS = new Set([
  "quem_sou_eu",
  "resumo_do_dia",
  "jornada_do_paciente",
  "retornos_pendentes",
  "giro_30_dias",
  "desempenho_anuncios",
  "ver_funil",
  "conversas_recentes",
  "ver_organograma",
  "definir_meta_mensal",
  "detectar_vendas_nas_conversas",
  "combinados_atrasados",
]);

type Bloco = { type: string; text?: string; id?: string; name?: string; input?: Record<string, unknown> };
type MsgClaude = { role: "user" | "assistant"; content: string | Bloco[] | Record<string, unknown>[] };

export type Turno = { quem: "pessoa" | "gerente"; texto: string };

async function promptDoGerente(db: SupabaseClient, ctx: ContextoMcp, nomePessoa: string) {
  const [{ data: ag }, { data: tom }] = await Promise.all([
    db.from("agentes").select("prompt").eq("clinica_id", ctx.clinicaId).eq("nome", "Gerente").maybeSingle(),
    db.from("conhecimento_clinica").select("conteudo").eq("clinica_id", ctx.clinicaId).eq("tipo", "tom_de_voz").maybeSingle(),
  ]);
  const hoje = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "America/Sao_Paulo" });
  return [
    `Você é o Gerente (IA) da clínica ${ctx.clinicaNome}. Está conversando pelo celular com ${nomePessoa || "alguém do time"}. Hoje é ${hoje}.`,
    ag?.prompt ?? "",
    "Responda como mensagem de WhatsApp: curto, direto, sem markdown pesado, no máximo uns 8 itens. Use as ferramentas para buscar números reais antes de responder; nunca invente dados.",
    'Quando perguntarem "como tá meu dia?", use resumo_do_dia e, se fizer sentido, retornos_pendentes e giro_30_dias, e termine dizendo o que fazer primeiro.',
    "Você não manda mensagem para paciente por aqui. Se pedirem algo que você não consegue fazer, diga como fazer no sistema.",
    tom?.conteudo ? `Tom de voz da clínica:\n${tom.conteudo}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

/** Gera a resposta do Gerente para a conversa (o último turno é da pessoa). */
export async function responderComoGerente(db: SupabaseClient, ctx: ContextoMcp, historico: Turno[], nomePessoa = ""): Promise<string> {
  const chave = await segredo(ctx.clinicaId, "ia", "anthropic_api_key");
  if (!chave) return "Ainda não tenho cérebro ligado 😅 Coloque a chave da Anthropic em Conexões › Inteligência artificial.";

  const ferramentas = TOOLS.filter((t) => PERMITIDAS.has(t.name)).map(({ name, description, inputSchema }) => ({ name, description, input_schema: inputSchema }));
  const mensagens: MsgClaude[] = historico.slice(-20).map((t) => ({ role: t.quem === "pessoa" ? "user" : "assistant", content: t.texto }));
  const system = await promptDoGerente(db, ctx, nomePessoa);

  for (let volta = 0; volta < MAX_VOLTAS; volta++) {
    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": chave, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: MODELO, max_tokens: 1200, system, tools: ferramentas, messages: mensagens }),
    });
    if (!resp.ok) return `Deu um problema pra falar com a IA (${resp.status}). Tenta de novo em instantes.`;
    const data = (await resp.json()) as { content: Bloco[]; stop_reason: string };

    const pedidos = data.content.filter((b) => b.type === "tool_use");
    if (data.stop_reason !== "tool_use" || !pedidos.length) {
      return data.content.filter((b) => b.type === "text").map((b) => b.text).join("\n").trim() || "Pronto.";
    }

    mensagens.push({ role: "assistant", content: data.content });
    const resultados: Record<string, unknown>[] = [];
    for (const p of pedidos) {
      const ferramenta = TOOLS.find((t) => t.name === p.name && PERMITIDAS.has(t.name));
      let saida: string;
      let erro = false;
      try {
        saida = ferramenta ? await ferramenta.run(db, ctx, p.input ?? {}) : "Ferramenta não disponível por aqui.";
      } catch (e) {
        saida = (e as Error).message;
        erro = true;
      }
      resultados.push({ type: "tool_result", tool_use_id: p.id, content: saida, ...(erro ? { is_error: true } : {}) });
    }
    mensagens.push({ role: "user", content: resultados });
  }
  return "Demorei demais pra montar essa resposta. Pergunta de um jeito mais direto?";
}
