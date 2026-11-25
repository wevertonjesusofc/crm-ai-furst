import { SupabaseClient } from "@supabase/supabase-js";
import { lerIntegracao } from "@/lib/integracoes/servidor";
import { responderComoGerente, Turno } from "@/lib/gerente";
import { transcrever } from "@/lib/transcricao";
import { ContextoMcp } from "@/lib/mcp/auth";

// Telegram: recebe a mensagem (texto ou voz), confere se a pessoa está liberada,
// passa para o Gerente (IA) e responde no mesmo chat.

type Update = {
  update_id: number;
  message?: {
    chat: { id: number; type: string };
    from?: { first_name?: string; last_name?: string; username?: string };
    text?: string;
    voice?: { file_id: string; mime_type?: string };
    audio?: { file_id: string; mime_type?: string };
  };
};

export function tg(token: string) {
  const chamar = async (metodo: string, corpo?: Record<string, unknown>) => {
    const r = await fetch(`https://api.telegram.org/bot${token}/${metodo}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(corpo ?? {}),
    });
    const d = (await r.json()) as { ok: boolean; result?: unknown; description?: string };
    if (!d.ok) throw new Error(d.description ?? `Telegram ${metodo} falhou`);
    return d.result;
  };
  return {
    chamar,
    enviar: (chatId: number | string, texto: string) => chamar("sendMessage", { chat_id: chatId, text: texto.slice(0, 4000) }),
    digitando: (chatId: number | string) => chamar("sendChatAction", { chat_id: chatId, action: "typing" }).catch(() => null),
    async baixar(fileId: string) {
      const f = (await chamar("getFile", { file_id: fileId })) as { file_path: string };
      const r = await fetch(`https://api.telegram.org/file/bot${token}/${f.file_path}`);
      return r.arrayBuffer();
    },
  };
}

async function contextoDaClinica(db: SupabaseClient, clinicaId: string, nome: string): Promise<ContextoMcp> {
  const { data } = await db.from("clinicas").select("nome").eq("id", clinicaId).maybeSingle();
  return { userId: `telegram:${nome}`, email: null, admin: false, clinicaId, clinicaNome: data?.nome ?? "Clínica" };
}

/** Processa uma atualização do Telegram para a clínica. */
export async function processarTelegram(db: SupabaseClient, clinicaId: string, up: Update) {
  const msg = up.message;
  if (!msg || msg.chat.type !== "private") return;
  const cfg = await lerIntegracao(db, clinicaId, "telegram");
  if (!cfg.bot_token) return;
  const bot = tg(cfg.bot_token);
  const chatId = String(msg.chat.id);
  const nome = [msg.from?.first_name, msg.from?.last_name].filter(Boolean).join(" ") || msg.from?.username || "";

  const { data: liberado } = await db
    .from("canais_autorizados")
    .select("id, nome, ativo, sessao_id")
    .eq("clinica_id", clinicaId)
    .eq("canal", "telegram")
    .eq("externo_id", chatId)
    .maybeSingle();

  // Liberação: /start CÓDIGO
  const texto = msg.text?.trim() ?? "";
  if (!liberado || !liberado.ativo) {
    const codigo = texto.replace(/^\/start\s*/i, "").trim();
    if (texto.toLowerCase().startsWith("/start") && cfg.codigo_acesso && codigo === cfg.codigo_acesso.trim()) {
      const { data: gerente } = await db.from("agentes").select("id").eq("clinica_id", clinicaId).eq("nome", "Gerente").maybeSingle();
      const { data: sessao } = gerente
        ? await db.from("agente_sessoes").insert({ clinica_id: clinicaId, agente_id: gerente.id, canal: "telegram" }).select("id").single()
        : { data: null };
      await db.from("canais_autorizados").upsert(
        { clinica_id: clinicaId, canal: "telegram", externo_id: chatId, nome, ativo: true, sessao_id: sessao?.id ?? null },
        { onConflict: "clinica_id,canal,externo_id" }
      );
      await bot.enviar(chatId, `Oi${nome ? `, ${nome.split(" ")[0]}` : ""}! Sou o Gerente da clínica. Pode me perguntar por texto ou áudio. Experimenta: "como tá meu dia?"`);
    } else {
      await bot.enviar(chatId, "Oi! Para falar comigo, mande /start seguido do código de acesso da clínica.");
    }
    return;
  }

  // Texto ou voz
  let pergunta = texto;
  const voz = msg.voice ?? msg.audio;
  if (!pergunta && voz) {
    await bot.digitando(chatId);
    const audio = await bot.baixar(voz.file_id);
    const t = await transcrever(clinicaId, audio, voz.mime_type ?? "audio/ogg");
    if (!t) {
      await bot.enviar(chatId, "Ainda não consigo ouvir áudio. Coloque a chave do Gemini ou da OpenAI em Conexões › Inteligência artificial, ou me escreva.");
      return;
    }
    pergunta = t;
  }
  if (!pergunta || pergunta.toLowerCase() === "/start") {
    await bot.enviar(chatId, 'Pode perguntar! Ex.: "como tá meu dia?", "quem precisa voltar essa semana?", "qual anúncio tá vendendo?"');
    return;
  }

  await bot.digitando(chatId);
  let historico: Turno[] = [];
  if (liberado.sessao_id) {
    const { data } = await db.from("agente_mensagens").select("direction, body").eq("sessao_id", liberado.sessao_id).order("created_at", { ascending: false }).limit(16);
    historico = ((data ?? []) as { direction: string; body: string }[]).reverse().map((m) => ({ quem: m.direction === "enviada" ? "pessoa" : "gerente", texto: m.body }));
  }
  historico.push({ quem: "pessoa", texto: pergunta });

  const resposta = await responderComoGerente(db, await contextoDaClinica(db, clinicaId, nome), historico, liberado.nome ?? nome);
  await bot.enviar(chatId, voz ? `🎙️ "${pergunta.slice(0, 200)}"\n\n${resposta}` : resposta);

  if (liberado.sessao_id) {
    await db.from("agente_mensagens").insert([
      { clinica_id: clinicaId, sessao_id: liberado.sessao_id, direction: "enviada", body: pergunta },
      { clinica_id: clinicaId, sessao_id: liberado.sessao_id, direction: "recebida", body: resposta },
    ]);
    await db.from("agente_sessoes").update({ last_message_at: new Date().toISOString() }).eq("id", liberado.sessao_id);
  }
}
