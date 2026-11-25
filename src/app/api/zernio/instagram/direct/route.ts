import { NextRequest, NextResponse } from "next/server";
import { contextoZernio, ErroZernio, migracao022Pronta, ZernioMensagem } from "@/lib/zernio";
import { registrarLead } from "@/lib/leads";

// POST /api/zernio/instagram/direct
// Traz as conversas do direct do Instagram (via Zernio) para o Inbox do CRM:
// cada pessoa vira paciente (origem "instagram"), cada conversa vira uma linha em
// `conversas` (canal instagram) e as mensagens entram em `mensagens`, sem duplicar.
// Parâmetros (na URL):
//   conta=<id da conta do Instagram na Zernio>   opcional (padrão: todas as de Instagram)
//   conversas=20     quantas conversas mais recentes (máx. 200)
//   mensagens=50     quantas mensagens mais recentes por conversa (máx. 300)
//   desde=<ISO>      só conversas atualizadas depois dessa data (sincronização incremental)
//   simular=1        só lê e resume, não grava nada

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function texto(m: ZernioMensagem) {
  if (m.isDeleted) return "[mensagem apagada]";
  if (m.message?.trim()) return m.message.trim().slice(0, 4000);
  if (m.isStoryMention) return "[mencionou você no story]";
  const tipo = m.attachments?.[0]?.type;
  if (tipo) return `[${tipo === "image" ? "foto" : tipo === "video" ? "vídeo" : tipo === "audio" ? "áudio" : "anexo"}]`;
  return "[mensagem sem texto]";
}

export async function POST(req: NextRequest) {
  const ctx = await contextoZernio(req);
  if (!ctx.ok) return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  const { db, cid, api } = ctx;

  const sp = req.nextUrl.searchParams;
  const limiteConversas = Math.min(Math.max(Number(sp.get("conversas")) || 20, 1), 200);
  const limiteMensagens = Math.min(Math.max(Number(sp.get("mensagens")) || 50, 1), 300);
  const desde = sp.get("desde") || undefined;
  const simular = sp.get("simular") === "1";

  if (!simular && !(await migracao022Pronta(db))) {
    return NextResponse.json({ error: "Falta rodar a supabase_migration_022_zernio.sql no Supabase." }, { status: 409 });
  }

  try {
    let contas = sp.get("conta") ? [sp.get("conta")!] : [];
    if (!contas.length) {
      const r = await api.contas();
      contas = r.accounts.filter((a) => a.platform === "instagram" && a.isActive && !a.needsReconnection).map((a) => a._id);
    }
    if (!contas.length) return NextResponse.json({ error: "Nenhum Instagram conectado na Zernio." }, { status: 404 });

    const resumo = { contas: contas.length, conversas: 0, mensagens: 0, recebidas: 0, enviadas: 0, pacientes_novos: 0, mensagens_novas: 0, erros: [] as string[] };

    for (const accountId of contas) {
      let cursor: string | undefined;
      let lidas = 0;
      while (lidas < limiteConversas) {
        const pg = await api.conversas({ accountId, limit: Math.min(limiteConversas - lidas, 100), cursor, updatedSince: desde });
        for (const c of pg.data ?? []) {
          lidas++;
          resumo.conversas++;

          // Mensagens mais recentes primeiro, até o limite.
          const msgs: ZernioMensagem[] = [];
          let mc: string | undefined;
          do {
            const r = await api.mensagens(c.id, { accountId, limit: Math.min(limiteMensagens - msgs.length, 100), cursor: mc });
            msgs.push(...(r.messages ?? []));
            mc = r.pagination?.hasMore ? r.pagination.nextCursor ?? undefined : undefined;
          } while (mc && msgs.length < limiteMensagens);
          for (const m of msgs) {
            resumo.mensagens++;
            if (m.direction === "incoming") resumo.recebidas++;
            else resumo.enviadas++;
          }
          if (simular) continue;

          try {
            const usuario = c.participantUsername ?? null;
            const lead = await registrarLead(db, cid, {
              nome: c.participantName || (usuario ? `@${usuario}` : "Instagram"),
              instagram_id: c.participantId || `zernio:${c.id}`,
              instagram_usuario: usuario,
              origem_canal: "instagram",
              origem_detalhe: `Direct do Instagram${c.accountUsername ? ` @${c.accountUsername}` : ""}`,
            });
            if (lead.novo) resumo.pacientes_novos++;

            const ultima = msgs.reduce<string | null>((max, m) => {
              const t = m.createdAt || m.sentAt || null;
              return t && (!max || t > max) ? t : max;
            }, c.updatedTime ?? null);

            const { data: conversa, error: ec } = await db
              .from("conversas")
              .upsert(
                { clinica_id: cid, contact_id: lead.contatoId, channel: "instagram", externo_id: c.id, last_message_at: ultima ?? new Date().toISOString() },
                { onConflict: "contact_id,channel" }
              )
              .select("id")
              .single();
            if (ec || !conversa) throw new Error(ec?.message ?? "conversa não gravou");

            if (msgs.length) {
              const linhas = msgs.map((m) => ({
                clinica_id: cid,
                conversa_id: conversa.id,
                externo_id: m.id,
                direction: m.direction === "incoming" ? "recebida" : "enviada",
                body: texto(m),
                created_at: m.createdAt || m.sentAt || new Date().toISOString(),
              }));
              const { data: novas, error: em } = await db
                .from("mensagens")
                .upsert(linhas, { onConflict: "clinica_id,externo_id", ignoreDuplicates: true })
                .select("id");
              if (em) throw new Error(em.message);
              resumo.mensagens_novas += novas?.length ?? 0;
            }
          } catch (e) {
            resumo.erros.push(`conversa ${c.id}: ${(e as Error).message}`);
          }
          if (lidas >= limiteConversas) break;
        }
        cursor = pg.pagination?.hasMore ? pg.pagination.nextCursor ?? undefined : undefined;
        if (!cursor) break;
      }
    }

    return NextResponse.json({ ok: true, simulado: simular, ...resumo, erros: resumo.erros.slice(0, 10) });
  } catch (e) {
    const st = e instanceof ErroZernio ? e.status : 502;
    return NextResponse.json({ error: (e as Error).message }, { status: st >= 400 && st < 600 ? st : 502 });
  }
}
