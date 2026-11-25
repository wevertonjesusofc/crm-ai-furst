import { SupabaseClient } from "@supabase/supabase-js";
import { segredo } from "@/lib/integracoes/servidor";

// Motor simples dos agentes: monta o "cérebro" (prompt + tom de voz da clínica +
// conhecimentos + procedimentos + regras) e chama o modelo de IA.

export type Turno = { direction: "enviada" | "recebida"; body: string };

const MODELO_CLAUDE = "claude-sonnet-5-5";

/** Junta tudo o que o agente precisa saber antes de responder. */
export async function montarPrompt(db: SupabaseClient, clinicaId: string, agenteId: string) {
  const [{ data: agente }, { data: clinica }, { data: conhecimento }, { data: notas }, { data: regras }, { data: produtos }] =
    await Promise.all([
      db.from("agentes").select("nome, proposito, prompt, temperatura, max_tokens").eq("id", agenteId).eq("clinica_id", clinicaId).maybeSingle(),
      db.from("clinicas").select("nome").eq("id", clinicaId).maybeSingle(),
      db.from("conhecimento_clinica").select("tipo, titulo, conteudo").eq("clinica_id", clinicaId),
      db.from("agente_notas").select("titulo, conteudo").eq("agente_id", agenteId).eq("clinica_id", clinicaId),
      db.from("agente_regras").select("nome, palavras_chave, acao_tipo, mensagem").eq("agente_id", agenteId).eq("clinica_id", clinicaId).eq("ativa", true),
      db.from("produtos").select("nome, preco, descricao").eq("clinica_id", clinicaId).eq("status", "ativo"),
    ]);
  if (!agente) return null;

  const tom = (conhecimento ?? []).find((c) => c.tipo === "tom_de_voz");
  const outros = (conhecimento ?? []).filter((c) => c.tipo !== "tom_de_voz");
  const partes = [
    `Você é ${agente.nome}, da clínica ${clinica?.nome ?? ""}. ${agente.proposito ?? ""}`.trim(),
    agente.prompt || "",
    tom ? `## Tom de voz da clínica (siga sempre)\n${tom.conteudo}` : "",
    outros.length ? `## O que a clínica quer que você saiba\n${outros.map((c) => `- ${c.titulo}: ${c.conteudo}`).join("\n")}` : "",
    produtos?.length
      ? `## Procedimentos e valores cadastrados (só ofereça estes)\n${produtos.map((p) => `- ${p.nome}${Number(p.preco) ? ` (R$ ${Number(p.preco).toFixed(2)})` : ""}${p.descricao ? `: ${p.descricao}` : ""}`).join("\n")}`
      : "",
    notas?.length ? `## Conhecimentos deste agente\n${notas.map((n) => `- ${n.titulo}: ${n.conteudo}`).join("\n")}` : "",
    regras?.length
      ? `## Regras\n${regras.map((r) => `- ${r.nome}${r.palavras_chave ? ` (quando aparecer: ${r.palavras_chave})` : ""}: ${r.acao_tipo}${r.mensagem ? ` — ${r.mensagem}` : ""}`).join("\n")}`
      : "",
    "## Sempre\n- Não prometa resultado de tratamento e não faça diagnóstico.\n- Não exponha dados pessoais de ninguém.\n- Se não souber algo, diga que vai confirmar com a equipe.",
  ];
  return { system: partes.filter(Boolean).join("\n\n"), temperatura: Number(agente.temperatura ?? 0.7), maxTokens: Number(agente.max_tokens ?? 1024) };
}

async function chamarClaude(key: string, system: string, historico: Turno[], temperatura: number, maxTokens: number) {
  const messages = historico.map((m) => ({ role: m.direction === "enviada" ? "user" : "assistant", content: m.body }));
  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({
      model: MODELO_CLAUDE,
      max_tokens: Math.min(maxTokens || 1024, 4000),
      temperature: temperatura,
      system,
      messages: messages.length ? messages : [{ role: "user", content: "oi" }],
    }),
  });
  if (!resp.ok) throw new Error(await resp.text());
  const data = await resp.json();
  return (data.content ?? []).filter((b: { type: string }) => b.type === "text").map((b: { text: string }) => b.text).join("\n");
}

async function chamarGemini(key: string, system: string, historico: Turno[], temperatura: number, maxTokens: number) {
  const contents = historico.map((m) => ({ role: m.direction === "enviada" ? "user" : "model", parts: [{ text: m.body }] }));
  if (!contents.length) contents.push({ role: "user", parts: [{ text: "oi" }] });
  const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: system }] },
      contents,
      generationConfig: { temperature: temperatura, maxOutputTokens: maxTokens || 1024 },
    }),
  });
  if (!resp.ok) throw new Error(await resp.text());
  const data = await resp.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

/** Gera a resposta do agente para a conversa. "enviada" = paciente, "recebida" = agente. */
export async function responder(db: SupabaseClient, clinicaId: string, agenteId: string, historico: Turno[]) {
  // Chave da clínica (Configurações › Inteligência artificial), com o .env como reserva.
  const [anthropicKey, geminiKey] = await Promise.all([
    segredo(clinicaId, "ia", "anthropic_api_key"),
    segredo(clinicaId, "ia", "gemini_api_key"),
  ]);
  if (!anthropicKey && !geminiKey) throw new Error("Nenhuma chave de IA configurada. Coloque em Configurações › Inteligência artificial.");
  const cerebro = await montarPrompt(db, clinicaId, agenteId);
  if (!cerebro) throw new Error("Agente não encontrado nesta clínica.");
  return anthropicKey
    ? chamarClaude(anthropicKey, cerebro.system, historico, cerebro.temperatura, cerebro.maxTokens)
    : chamarGemini(geminiKey!, cerebro.system, historico, cerebro.temperatura, cerebro.maxTokens);
}
