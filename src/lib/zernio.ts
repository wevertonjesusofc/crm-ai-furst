import { NextRequest } from "next/server";
import { SupabaseClient } from "@supabase/supabase-js";
import { clientFromRequest, serviceClient } from "@/lib/supabaseServer";
import { clinicaDoUsuario, lerIntegracao } from "@/lib/integracoes/servidor";

// Cliente da API da Zernio (https://docs.zernio.com). Só no servidor.
// A chave fica em integracoes_segredos (tipo "redes_sociais", nome "zernio_api_key")
// e nunca sai daqui: não vai para log, resposta nem navegador.

const BASE = "https://zernio.com/api/v1";

export class ErroZernio extends Error {
  constructor(public status: number, msg: string) {
    super(msg);
  }
}

export type ZernioConta = {
  _id: string;
  platform: string;
  username?: string;
  displayName?: string;
  profilePicture?: string | null;
  profileUrl?: string | null;
  isActive?: boolean;
  enabled?: boolean;
  needsReconnection?: boolean;
  platformStatus?: string;
  followersCount?: number | null;
  permissions?: string[];
  inboundActivity?: { lastMessageAt?: string | null; lastCommentAt?: string | null };
};

export type ZernioConversa = {
  id: string;
  accountId: string;
  accountUsername?: string;
  platform: string;
  participantId?: string;
  participantName?: string;
  participantUsername?: string;
  participantPicture?: string | null;
  lastMessage?: string;
  updatedTime?: string;
  status?: string;
  unreadCount?: number;
};

export type ZernioMensagem = {
  id: string;
  conversationId: string;
  message?: string;
  senderId?: string;
  senderName?: string;
  direction: "incoming" | "outgoing";
  createdAt?: string;
  sentAt?: string;
  attachments?: { type?: string; url?: string }[];
  isDeleted?: boolean;
  isStoryMention?: boolean;
};

type Metricas = {
  impressions?: number;
  reach?: number;
  views?: number;
  likes?: number;
  comments?: number;
  shares?: number;
  saves?: number;
  clicks?: number;
  engagementRate?: number;
};

export type ZernioPost = {
  _id: string;
  content?: string;
  publishedAt?: string;
  platform?: string;
  platformPostUrl?: string;
  thumbnailUrl?: string;
  mediaType?: string;
  mediaProductType?: string;
  analytics?: Metricas;
  mediaItems?: { type?: string; url?: string | null; thumbnail?: string | null }[];
  platforms?: { platform: string; platformPostId?: string; accountId?: string; accountUsername?: string; platformPostUrl?: string; analytics?: Metricas }[];
};

export type ZernioLogAutomacao = {
  id: string;
  commentId?: string;
  commenterId?: string;
  commenterName?: string | null;
  commenterUsername?: string | null;
  commentText?: string | null;
  status?: "pending" | "sent" | "failed" | "skipped" | "gated";
  error?: string | null;
  commentReplyStatus?: string | null;
  clickCount?: number;
  createdAt?: string;
};

export function zernio(chave: string) {
  async function chamar<T>(caminho: string, init?: RequestInit): Promise<T> {
    const r = await fetch(`${BASE}${caminho}`, {
      ...init,
      headers: { Authorization: `Bearer ${chave}`, "Content-Type": "application/json", ...(init?.headers ?? {}) },
      cache: "no-store",
    });
    const texto = await r.text();
    let json: Record<string, unknown> = {};
    try {
      json = JSON.parse(texto);
    } catch {}
    if (!r.ok) {
      const msg = (json.error as string) || (json.message as string) || `HTTP ${r.status}`;
      const explica: Record<number, string> = {
        401: "A Zernio recusou a chave. Confira em Configurações › Redes sociais.",
        402: "O plano da Zernio não inclui métricas (add-on de analytics).",
        403: "O plano da Zernio não inclui o inbox (add-on de inbox).",
        429: "A Zernio pediu para esperar (limite de chamadas). Tente de novo em 1 minuto.",
      };
      throw new ErroZernio(r.status, explica[r.status] ?? `Zernio: ${msg}`);
    }
    return json as T;
  }

  return {
    contas: () => chamar<{ accounts: ZernioConta[]; hasAnalyticsAccess?: boolean }>("/accounts"),

    /** Automações "comentou a palavra → recebe no direct". */
    automacoes: () =>
      chamar<{ automations?: { id: string; name?: string; platform?: string; accountId?: string; platformPostId?: string; keywords?: string[]; matchMode?: string; dmMessage?: string; commentReply?: string; commentReplyVariations?: string[]; isActive?: boolean; stats?: Record<string, number>; createdAt?: string }[] }>(
        "/comment-automations"
      ),
    criarAutomacao: (corpo: Record<string, unknown>) =>
      chamar<{ automation?: { id: string } }>("/comment-automations", { method: "POST", body: JSON.stringify(corpo) }),
    mudarAutomacao: (id: string, corpo: Record<string, unknown>) =>
      chamar<{ automation?: { id: string } }>(`/comment-automations/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(corpo) }),

    /** Quem comentou a palavra: cada comentário que disparou a automação e o que aconteceu. */
    logsAutomacao: (id: string, p: { limit?: number; skip?: number } = {}) =>
      chamar<{ logs?: ZernioLogAutomacao[]; pagination?: { total: number; hasMore: boolean } }>(
        `/comment-automations/${encodeURIComponent(id)}/logs?limit=${Math.min(p.limit ?? 50, 200)}&skip=${p.skip ?? 0}`
      ),

    /** Posts com comentários (mais recentes primeiro). */
    postsComentados: (p: { accountId: string; limit?: number; cursor?: string }) => {
      const q = new URLSearchParams({ accountId: p.accountId, limit: String(Math.min(p.limit ?? 50, 100)) });
      if (p.cursor) q.set("cursor", p.cursor);
      return chamar<{ data: { id: string; permalink?: string; content?: string; createdTime?: string; commentCount: number }[]; pagination?: { hasMore?: boolean; nextCursor?: string } }>(`/inbox/comments?${q}`);
    },

    /** Comentários de um post. */
    comentarios: (postId: string, p: { accountId: string; limit?: number }) => {
      const q = new URLSearchParams({ accountId: p.accountId, limit: String(Math.min(p.limit ?? 100, 100)) });
      return chamar<{ comments?: { id: string; message?: string; createdTime?: string; url?: string; from?: { id?: string; name?: string; username?: string; isOwner?: boolean } }[]; post?: { permalink?: string } }>(
        `/inbox/comments/${encodeURIComponent(postId)}?${q}`
      );
    },

    conversas: (p: { accountId: string; limit?: number; cursor?: string; updatedSince?: string }) => {
      const q = new URLSearchParams({ accountId: p.accountId, limit: String(Math.min(p.limit ?? 50, 100)) });
      if (p.cursor) q.set("cursor", p.cursor);
      if (p.updatedSince) q.set("updatedSince", p.updatedSince);
      return chamar<{ data: ZernioConversa[]; pagination?: { hasMore?: boolean; nextCursor?: string | null } }>(`/inbox/conversations?${q}`);
    },

    mensagens: (conversaId: string, p: { accountId: string; limit?: number; cursor?: string }) => {
      const q = new URLSearchParams({ accountId: p.accountId, limit: String(Math.min(p.limit ?? 100, 100)), sortOrder: "desc" });
      if (p.cursor) q.set("cursor", p.cursor);
      return chamar<{ messages: ZernioMensagem[]; pagination?: { hasMore?: boolean; nextCursor?: string | null } }>(
        `/inbox/conversations/${encodeURIComponent(conversaId)}/messages?${q}`
      );
    },

    enviarMensagem: (conversaId: string, accountId: string, texto: string) =>
      chamar<{ success: boolean; data?: { messageId?: string } }>(`/inbox/conversations/${encodeURIComponent(conversaId)}/messages`, {
        method: "POST",
        body: JSON.stringify({ accountId, message: texto }),
      }),

    posts: (p: { accountId?: string; platform?: string; page?: number; limit?: number; fromDate?: string; toDate?: string }) => {
      const q = new URLSearchParams({ source: "all", page: String(p.page ?? 1), limit: String(p.limit ?? 100) });
      if (p.accountId) q.set("accountId", p.accountId);
      if (p.platform) q.set("platform", p.platform);
      if (p.fromDate) q.set("fromDate", p.fromDate);
      if (p.toDate) q.set("toDate", p.toDate);
      return chamar<{
        overview?: { totalPosts?: number; lastSync?: string };
        posts: ZernioPost[];
        pagination?: { page: number; pages: number; total: number };
        accounts?: { _id: string; platform: string; username?: string; followersCount?: number }[];
      }>(`/analytics?${q}`);
    },
  };
}

/**
 * Descobre a clínica de quem chamou e devolve o banco (serviço) e o cliente da Zernio.
 * Em desenvolvimento local (npm run dev, chamando de localhost sem login), usa a
 * clínica demo para dar para testar com curl. Em produção sempre exige login.
 */
export async function contextoZernio(req: NextRequest): Promise<
  { ok: true; db: SupabaseClient; cid: string; api: ReturnType<typeof zernio> } | { ok: false; status: number; error: string }
> {
  const db = serviceClient();
  if (!db) return { ok: false, status: 500, error: "Servidor sem SUPABASE_SERVICE_ROLE_KEY configurada." };

  let cid: string | null = null;
  const temLogin = !!req.headers.get("authorization");
  const host = req.headers.get("host") ?? "";
  const local = process.env.NODE_ENV === "development" && /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host);
  if (temLogin) {
    const { data: u } = await clientFromRequest(req).auth.getUser();
    if (!u.user) return { ok: false, status: 401, error: "Faça login de novo." };
    cid = (await clinicaDoUsuario(db, u.user.id)).clinicaId;
  } else if (local) {
    cid = process.env.CLINICA_DEMO_ID || "00000000-0000-0000-0000-000000000001";
  } else {
    return { ok: false, status: 401, error: "Faça login de novo." };
  }
  if (!cid) return { ok: false, status: 403, error: "Usuário sem clínica." };

  const v = await lerIntegracao(db, cid, "redes_sociais");
  // Em produção cada clínica usa a PRÓPRIA chave (Conexões). A do .env é só para testar aqui.
  const chave = v.zernio_api_key || (process.env.NODE_ENV === "development" ? process.env.ZERNIO_API_KEY : undefined);
  if (!chave) return { ok: false, status: 400, error: "Conecte a Zernio em Configurações › Redes sociais (chave da API)." };
  return { ok: true, db, cid, api: zernio(chave) };
}

/** Confere se a migração 022 já foi rodada (colunas e tabela novas). */
export async function migracao022Pronta(db: SupabaseClient) {
  const [a, b] = await Promise.all([
    db.from("mensagens").select("externo_id").limit(1),
    db.from("redes_posts").select("id").limit(1),
  ]);
  return !a.error && !b.error;
}
