import { SupabaseClient } from "@supabase/supabase-js";
import { segredo } from "@/lib/integracoes/servidor";
import { zernio } from "@/lib/zernio";

// Social selling: quem está engajando com a clínica (comentários) e a análise
// da IA de quem tem cara de comprar, com a mensagem de abordagem sugerida.

type Comentario = { texto: string; link: string | null; quando: string | null };

/** Lê os comentários dos posts recentes e atualiza o ranking de engajados. */
export async function atualizarEngajados(db: SupabaseClient, clinicaId: string, api: ReturnType<typeof zernio>, maxPosts = 40) {
  const contas = (await api.contas()).accounts.filter((a) => a.platform === "instagram" && a.isActive);
  const mapa = new Map<string, { usuario?: string; nome?: string; comentarios: number; posts: Set<string>; ultimos: Comentario[]; ultimo: string | null }>();
  let postsLidos = 0;

  for (const conta of contas) {
    let cursor: string | undefined;
    while (postsLidos < maxPosts) {
      const pg = await api.postsComentados({ accountId: conta._id, limit: 50, cursor });
      for (const post of pg.data ?? []) {
        if (postsLidos >= maxPosts) break;
        if (!post.commentCount) continue;
        postsLidos++;
        const r = await api.comentarios(post.id, { accountId: conta._id, limit: 100 });
        for (const c of r.comments ?? []) {
          const quem = c.from;
          if (!quem?.id || quem.isOwner) continue;
          const e = mapa.get(quem.id) ?? { usuario: quem.username, nome: quem.name, comentarios: 0, posts: new Set<string>(), ultimos: [], ultimo: null };
          e.comentarios++;
          e.posts.add(post.id);
          if (e.ultimos.length < 5 && c.message) e.ultimos.push({ texto: c.message.slice(0, 280), link: post.permalink ?? r.post?.permalink ?? null, quando: c.createdTime ?? null });
          if (c.createdTime && (!e.ultimo || c.createdTime > e.ultimo)) e.ultimo = c.createdTime;
          mapa.set(quem.id, e);
        }
      }
      if (!pg.pagination?.hasMore || !pg.pagination.nextCursor) break;
      cursor = pg.pagination.nextCursor;
    }
  }

  const linhas = [...mapa.entries()].map(([id, e]) => ({
    clinica_id: clinicaId,
    plataforma: "instagram",
    externo_id: id,
    usuario: e.usuario ?? null,
    nome: e.nome ?? null,
    comentarios: e.comentarios,
    posts: e.posts.size,
    ultimos: e.ultimos,
    ultimo_em: e.ultimo,
    atualizado_em: new Date().toISOString(),
  }));
  for (let i = 0; i < linhas.length; i += 200) {
    await db.from("engajados").upsert(linhas.slice(i, i + 200), { onConflict: "clinica_id,plataforma,externo_id" });
  }
  // Liga a quem já é paciente (mesmo id do Instagram)
  const { data: pacientes } = await db.from("contacts").select("id, instagram_id").eq("clinica_id", clinicaId).not("instagram_id", "is", null);
  for (const p of pacientes ?? []) {
    await db.from("engajados").update({ contact_id: p.id }).eq("clinica_id", clinicaId).eq("externo_id", p.instagram_id).is("contact_id", null);
  }
  return { posts: postsLidos, pessoas: linhas.length };
}

export type Analise = { potencial: "alto" | "medio" | "baixo"; perfil: string; por_que: string; mensagem: string };

/** A IA analisa as pessoas e diz quem tem cara de comprar, com a mensagem sugerida. */
export async function analisarEngajados(db: SupabaseClient, clinicaId: string, ids: string[]) {
  const chave = await segredo(clinicaId, "ia", "anthropic_api_key");
  if (!chave) throw new Error("Coloque a chave da Anthropic em Conexões › Inteligência artificial.");
  const [{ data: pessoas }, { data: clinica }, { data: tom }, { data: procs }] = await Promise.all([
    db.from("engajados").select("id, usuario, nome, comentarios, posts, ultimos").eq("clinica_id", clinicaId).in("id", ids),
    db.from("clinicas").select("nome, especialidade").eq("id", clinicaId).maybeSingle(),
    db.from("conhecimento_clinica").select("conteudo").eq("clinica_id", clinicaId).eq("tipo", "tom_de_voz").maybeSingle(),
    db.from("produtos").select("nome").eq("clinica_id", clinicaId).eq("status", "ativo").limit(20),
  ]);
  if (!pessoas?.length) return { analisadas: 0 };

  const lista = pessoas
    .map((p, i) => `${i + 1}. id=${p.id} · @${p.usuario ?? "?"} · nome: ${p.nome ?? "?"} · ${p.comentarios} comentário(s) em ${p.posts} post(s)\n   comentários: ${((p.ultimos as Comentario[]) ?? []).map((c) => `"${c.texto}"`).join(" | ")}`)
    .join("\n");

  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": chave, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({
      model: "claude-sonnet-5-5",
      max_tokens: 4000,
      system:
        `Você faz social selling para a clínica "${clinica?.nome ?? ""}" (${clinica?.especialidade ?? "estética"}). ` +
        `Procedimentos: ${(procs ?? []).map((p) => p.nome).join(", ") || "não cadastrados"}. ` +
        "Para cada pessoa que comentou nos posts, avalie o potencial de virar paciente pagante, só com o que está nos comentários, no @ e no nome (não invente fatos da vida da pessoa). " +
        "Considere: interesse explícito (preço, agendamento, procedimento), elogios ao resultado, perguntas, homem que comenta pensando na esposa, conta comercial ou spam (baixo). " +
        "Escreva uma mensagem de direct curta, leve e educada, sem citar dados pessoais nem apontar defeitos, sem prometer resultado, terminando com uma pergunta. " +
        (tom?.conteudo ? `Tom de voz da clínica: ${tom.conteudo.slice(0, 600)} ` : "") +
        'Responda SÓ com JSON: [{"id": "...", "potencial": "alto"|"medio"|"baixo", "perfil": "frase curta", "por_que": "frase curta", "mensagem": "..."}].',
      messages: [{ role: "user", content: lista }],
    }),
  });
  if (!resp.ok) throw new Error(`A IA respondeu ${resp.status}.`);
  const d = (await resp.json()) as { content: { type: string; text?: string }[] };
  const t = d.content.find((b) => b.type === "text")?.text ?? "[]";
  let res: (Analise & { id: string })[] = [];
  try {
    res = JSON.parse(t.slice(t.indexOf("["), t.lastIndexOf("]") + 1));
  } catch {
    throw new Error("A IA não devolveu a análise no formato certo. Tente de novo.");
  }
  for (const r of res) {
    const { id, ...analise } = r;
    await db.from("engajados").update({ analise, analisado_em: new Date().toISOString() }).eq("id", id).eq("clinica_id", clinicaId);
  }
  return { analisadas: res.length, altos: res.filter((r) => r.potencial === "alto").length };
}
