import { SupabaseClient } from "@supabase/supabase-js";
import { serviceClient } from "@/lib/supabaseServer";

// Só no servidor. Lê as chaves da clínica e, se não tiver, usa a do .env (instalação).

const ENV_PADRAO: Record<string, string> = {
  "ia.anthropic_api_key": "ANTHROPIC_API_KEY",
  "ia.gemini_api_key": "GEMINI_API_KEY",
  "meta_ads.access_token": "META_ACCESS_TOKEN",
  "meta_ads.ad_account_id": "META_AD_ACCOUNT_ID",
};

/** Clínica em que a pessoa está trabalhando e se ela pode mexer nas integrações. */
export async function clinicaDoUsuario(db: SupabaseClient, userId: string) {
  const [{ data: adm }, { data: ctx }, { data: membro }] = await Promise.all([
    db.from("plataforma_admins").select("user_id").eq("user_id", userId).maybeSingle(),
    db.from("admin_contexto").select("clinica_id").eq("user_id", userId).maybeSingle(),
    db.from("clinica_membros").select("clinica_id, papel").eq("user_id", userId).order("created_at").limit(1).maybeSingle(),
  ]);
  const admin = !!adm;
  const clinicaId = (admin && ctx?.clinica_id) || membro?.clinica_id || null;
  return { clinicaId: clinicaId as string | null, podeEditar: admin || membro?.papel === "dono" };
}

export async function lerIntegracao(db: SupabaseClient, clinicaId: string, tipo: string) {
  const [{ data: pub }, { data: seg }] = await Promise.all([
    db.from("integracoes").select("config").eq("clinica_id", clinicaId).eq("tipo", tipo).maybeSingle(),
    db.from("integracoes_segredos").select("nome, valor").eq("clinica_id", clinicaId).eq("tipo", tipo),
  ]);
  const valores: Record<string, string> = { ...((pub?.config as Record<string, string>) ?? {}) };
  for (const s of seg ?? []) valores[s.nome] = s.valor;
  for (const [chave, env] of Object.entries(ENV_PADRAO)) {
    const [t, nome] = chave.split(".");
    if (t === tipo && !valores[nome] && process.env[env]) valores[nome] = process.env[env]!;
  }
  return valores;
}

/** Atalho: uma chave só, com o .env como reserva. Usa o cliente de serviço. */
export async function segredo(clinicaId: string, tipo: string, nome: string): Promise<string | null> {
  const db = serviceClient();
  if (db) {
    const v = await lerIntegracao(db, clinicaId, tipo);
    if (v[nome]) return v[nome];
  }
  const env = ENV_PADRAO[`${tipo}.${nome}`];
  return (env && process.env[env]) || null;
}

async function get(url: string, headers: Record<string, string> = {}) {
  const r = await fetch(url, { headers });
  const corpo = await r.text();
  let json: Record<string, unknown> = {};
  try {
    json = JSON.parse(corpo);
  } catch {}
  return { ok: r.ok, status: r.status, json, corpo };
}

/** Testa a conexão de verdade com a plataforma. */
export async function testarIntegracao(tipo: string, v: Record<string, string>): Promise<{ ok: boolean; msg: string }> {
  const versao = process.env.META_GRAPH_VERSION || "v23.0";
  try {
    switch (tipo) {
      case "ia": {
        if (v.anthropic_api_key) {
          const r = await get("https://api.anthropic.com/v1/models?limit=1", { "x-api-key": v.anthropic_api_key, "anthropic-version": "2023-06-01" });
          return r.ok ? { ok: true, msg: "Anthropic conectada." } : { ok: false, msg: `Anthropic recusou a chave (${r.status}).` };
        }
        if (v.gemini_api_key) {
          const r = await get(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(v.gemini_api_key)}`);
          return r.ok ? { ok: true, msg: "Gemini conectado." } : { ok: false, msg: `Google recusou a chave (${r.status}).` };
        }
        return { ok: false, msg: "Preencha a chave da Anthropic ou do Gemini." };
      }
      case "meta_ads": {
        if (!v.access_token || !v.ad_account_id) return { ok: false, msg: "Preencha o ID da conta e o token." };
        const conta = v.ad_account_id.startsWith("act_") ? v.ad_account_id : `act_${v.ad_account_id}`;
        const r = await get(`https://graph.facebook.com/${versao}/${conta}?fields=name,account_status&access_token=${encodeURIComponent(v.access_token)}`);
        return r.ok ? { ok: true, msg: `Conta de anúncios "${r.json.name}" conectada.` } : { ok: false, msg: `A Meta recusou: ${(r.json.error as { message?: string })?.message ?? r.status}` };
      }
      case "whatsapp_oficial": {
        if (!v.access_token || !v.phone_number_id) return { ok: false, msg: "Preencha o Phone Number ID e o token." };
        const r = await get(`https://graph.facebook.com/${versao}/${v.phone_number_id}?fields=display_phone_number,verified_name&access_token=${encodeURIComponent(v.access_token)}`);
        return r.ok
          ? { ok: true, msg: `Número ${r.json.display_phone_number} (${r.json.verified_name}) conectado.` }
          : { ok: false, msg: `A Meta recusou: ${(r.json.error as { message?: string })?.message ?? r.status}` };
      }
      case "whatsapp_uazapi": {
        if (!v.servidor || !v.token) return { ok: false, msg: "Preencha o servidor e o token." };
        const r = await get(`${v.servidor.replace(/\/$/, "")}/instance/status`, { token: v.token });
        return r.ok ? { ok: true, msg: "Instância da UAZAPI respondeu." } : { ok: false, msg: `A UAZAPI respondeu ${r.status}. Confira o endereço e o token.` };
      }
      case "telegram": {
        if (!v.bot_token) return { ok: false, msg: "Preencha o token do bot." };
        const r = await get(`https://api.telegram.org/bot${v.bot_token}/getMe`);
        return r.ok
          ? { ok: true, msg: `Bot @${(r.json.result as { username?: string })?.username} conectado. Agora mande /start ${v.codigo_acesso || "SEU-CÓDIGO"} para ele no Telegram.` }
          : { ok: false, msg: "O Telegram recusou o token. Confira com o @BotFather." };
      }
      case "email_marketing": {
        if (!v.resend_api_key) return { ok: false, msg: "Preencha a chave da Resend." };
        const r = await get("https://api.resend.com/domains", { Authorization: `Bearer ${v.resend_api_key}` });
        return r.ok ? { ok: true, msg: "Resend conectada." } : { ok: false, msg: `A Resend recusou a chave (${r.status}).` };
      }
      default:
        return { ok: true, msg: "Dados salvos. Esta integração ainda não tem teste automático." };
    }
  } catch (e) {
    return { ok: false, msg: `Não consegui falar com a plataforma: ${(e as Error).message}` };
  }
}
