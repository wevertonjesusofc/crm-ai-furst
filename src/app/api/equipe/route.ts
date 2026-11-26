import { NextRequest, NextResponse } from "next/server";
import { clientFromRequest, serviceClient } from "@/lib/supabaseServer";
import { clinicaDoUsuario } from "@/lib/integracoes/servidor";

// Equipe da clínica: quem já entrou (com e-mail), convites pendentes,
// convidar pessoa (convite + pessoa no organograma + WhatsApp) e tirar acesso.
// GET  /api/equipe
// POST /api/equipe?acao=convidar  {email, papel, nome, cargo, whatsapp}
// POST /api/equipe?acao=remover   {email}

export const dynamic = "force-dynamic";

const soDigitos = (v: unknown) => (typeof v === "string" ? v.replace(/\D/g, "") : "");

async function contexto(req: NextRequest) {
  const db = serviceClient();
  if (!db) return { erro: NextResponse.json({ error: "Servidor sem SUPABASE_SERVICE_ROLE_KEY." }, { status: 500 }) };
  const { data: u } = await clientFromRequest(req).auth.getUser();
  if (!u.user) return { erro: NextResponse.json({ error: "Faça login de novo." }, { status: 401 }) };
  const { clinicaId, podeEditar } = await clinicaDoUsuario(db, u.user.id);
  if (!clinicaId) return { erro: NextResponse.json({ error: "Usuário sem clínica." }, { status: 403 }) };
  return { db, cid: clinicaId, podeEditar, eu: u.user };
}

export async function GET(req: NextRequest) {
  const c = await contexto(req);
  if ("erro" in c) return c.erro;
  const { db, cid, podeEditar, eu } = c;
  const [{ data: membros }, { data: convites }, { data: pessoas }, { data: zaps }] = await Promise.all([
    db.from("clinica_membros").select("user_id, papel, created_at").eq("clinica_id", cid).order("created_at"),
    db.from("convites").select("email, papel, suporte_plataforma, usado_em, created_at").order("created_at", { ascending: false }),
    db.from("agentes").select("id, nome, cargo, email").eq("clinica_id", cid).eq("tipo", "pessoa"),
    db.from("canais_autorizados").select("externo_id, agente_id, nome").eq("clinica_id", cid).eq("canal", "whatsapp").eq("ativo", true),
  ]);
  const lista = await Promise.all(
    (membros ?? []).map(async (m) => {
      const { data } = await db.auth.admin.getUserById(m.user_id);
      const email = data.user?.email ?? "";
      const pessoa = (pessoas ?? []).find((p) => p.email && p.email.toLowerCase() === email.toLowerCase());
      const zap = (zaps ?? []).find((z) => pessoa && z.agente_id === pessoa.id);
      return {
        email,
        nome: pessoa?.nome ?? (data.user?.user_metadata?.nome as string) ?? email.split("@")[0],
        cargo: pessoa?.cargo ?? null,
        papel: m.papel,
        whatsapp: zap?.externo_id ?? null,
        desde: m.created_at,
        sou_eu: m.user_id === eu.id,
        status: "ativo" as const,
      };
    })
  );
  const pendentes = (convites ?? [])
    .filter((v) => !v.usado_em && !v.suporte_plataforma)
    .map((v) => {
      const pessoa = (pessoas ?? []).find((p) => p.email && p.email.toLowerCase() === v.email.toLowerCase());
      const zap = (zaps ?? []).find((z) => pessoa && z.agente_id === pessoa.id);
      return { email: v.email, nome: pessoa?.nome ?? v.email.split("@")[0], cargo: pessoa?.cargo ?? null, papel: v.papel, whatsapp: zap?.externo_id ?? null, desde: v.created_at, sou_eu: false, status: "convidado" as const };
    });
  return NextResponse.json({ podeEditar, equipe: [...lista, ...pendentes] });
}

export async function POST(req: NextRequest) {
  const c = await contexto(req);
  if ("erro" in c) return c.erro;
  const { db, cid, podeEditar, eu } = c;
  if (!podeEditar) return NextResponse.json({ error: "Só o dono da clínica mexe na equipe." }, { status: 403 });
  const acao = req.nextUrl.searchParams.get("acao");
  const b = await req.json().catch(() => ({}));
  const email = typeof b.email === "string" ? b.email.trim().toLowerCase() : "";
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return NextResponse.json({ error: "E-mail inválido." }, { status: 400 });

  if (acao === "convidar") {
    const papel = b.papel === "dono" ? "dono" : "equipe";
    const nome = typeof b.nome === "string" && b.nome.trim() ? b.nome.trim().slice(0, 80) : email.split("@")[0];
    const cargo = typeof b.cargo === "string" && b.cargo.trim() ? b.cargo.trim().slice(0, 60) : null;
    const zap = soDigitos(b.whatsapp);

    const { error: ec } = await db.from("convites").upsert({ email, papel, suporte_plataforma: false, usado_em: null }, { onConflict: "email" });
    if (ec) return NextResponse.json({ error: ec.message }, { status: 500 });

    // Pessoa no organograma (aparece em Agentes › Organograma e pode receber tarefas).
    const { data: ja } = await db.from("agentes").select("id").eq("clinica_id", cid).eq("tipo", "pessoa").ilike("email", email).maybeSingle();
    let pessoaId = ja?.id as string | undefined;
    if (pessoaId) {
      await db.from("agentes").update({ nome, cargo }).eq("id", pessoaId);
    } else {
      const { data: nova } = await db
        .from("agentes")
        .insert({ clinica_id: cid, nome, cargo, email, tipo: "pessoa", emoji: "👤", tier: "specialist" })
        .select("id")
        .single();
      pessoaId = nova?.id;
    }
    // WhatsApp da pessoa: é por ele que o Gerente reconhece quem fala.
    if (zap && pessoaId) {
      await db.from("canais_autorizados").update({ ativo: false }).eq("clinica_id", cid).eq("canal", "whatsapp").eq("agente_id", pessoaId).neq("externo_id", zap);
      await db
        .from("canais_autorizados")
        .upsert({ clinica_id: cid, canal: "whatsapp", externo_id: zap, nome, papel, agente_id: pessoaId, ativo: true }, { onConflict: "clinica_id,canal,externo_id" });
    }
    return NextResponse.json({ ok: true });
  }

  if (acao === "remover") {
    if (email === (eu.email ?? "").toLowerCase()) return NextResponse.json({ error: "Você não pode tirar o seu próprio acesso." }, { status: 400 });
    await db.from("convites").delete().eq("email", email).is("usado_em", null);
    const { data: membros } = await db.from("clinica_membros").select("user_id").eq("clinica_id", cid);
    for (const m of membros ?? []) {
      const { data } = await db.auth.admin.getUserById(m.user_id);
      if ((data.user?.email ?? "").toLowerCase() === email) await db.from("clinica_membros").delete().eq("clinica_id", cid).eq("user_id", m.user_id);
    }
    const { data: pessoa } = await db.from("agentes").select("id").eq("clinica_id", cid).eq("tipo", "pessoa").ilike("email", email).maybeSingle();
    if (pessoa) await db.from("canais_autorizados").update({ ativo: false }).eq("clinica_id", cid).eq("agente_id", pessoa.id);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Ação desconhecida." }, { status: 400 });
}
