import { SupabaseClient } from "@supabase/supabase-js";

// Jornada do paciente na clínica, do primeiro contato ao retorno.
// Cada etapa mostra quantos chegaram, quantos passaram e onde está vazando.

export const MOTIVOS_PERDA = [
  "Achou caro",
  "Medo ou insegurança",
  "Foi para outra clínica",
  "Parou de responder",
  "Só estava pesquisando",
  "Não era o momento",
  "Outro",
];

export const MOTIVOS_NAO_RETORNO = [
  "Não ficou satisfeito",
  "Achou caro manter",
  "Foi para outra clínica",
  "Ninguém lembrou o paciente",
  "Mudou de cidade",
  "Outro",
];

export type Etapa = { chave: string; titulo: string; pergunta: string; total: number; detalhe?: { rotulo: string; n: number }[] };

const conta = <T,>(xs: T[], f: (x: T) => string | null | undefined) => {
  const m = new Map<string, number>();
  for (const x of xs) {
    const k = f(x) || "Não informado";
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return [...m.entries()].map(([rotulo, n]) => ({ rotulo, n })).sort((a, b) => b.n - a.n);
};

const ORIGEM: Record<string, string> = {
  instagram: "Instagram",
  anuncio_meta: "Anúncio Meta",
  anuncio_google: "Anúncio Google",
  google: "Google",
  indicacao: "Indicação",
  formulario: "Site",
  whatsapp: "WhatsApp",
  outro: "Outro",
};

/** Calcula a jornada dos pacientes que chegaram a partir de `desde` (ISO). */
export async function calcularJornada(db: SupabaseClient, desde: string, clinicaId?: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const f = (q: any) => (clinicaId ? q.eq("clinica_id", clinicaId) : q);
  const { data: contatos } = (await f(db.from("contacts").select("id, origem_canal, primeira_resposta_em, created_at").gte("created_at", desde))) as {
    data: { id: string; origem_canal: string | null; primeira_resposta_em: string | null; created_at: string }[] | null;
  };
  const ids = (contatos ?? []).map((c) => c.id as string);
  const vazio = { etapas: [] as Etapa[], maiorVazamento: null as null | { de: string; para: string; perdidos: number } };
  if (!ids.length) return vazio;

  const [{ data: deals }, { data: stages }, { data: procs }] = (await Promise.all([
    f(db.from("deals").select("contact_id, status, stage_id, motivo_perda").in("contact_id", ids)),
    f(db.from("pipeline_stages").select("id, name, position")),
    f(db.from("procedimentos_realizados").select("contact_id, retorno_em, retorno_status, motivo_nao_retorno").in("contact_id", ids)),
  ])) as {
    data: Record<string, unknown>[] | null;
  }[];

  const pos = new Map<string, number>((stages ?? []).map((s) => [s.id as string, Number(s.position)]));
  const posAvaliacao = Number((stages ?? []).find((s) => /avalia|reuni/i.test(s.name as string))?.position ?? 4);
  const dealsPorContato = new Map<string, { status: string; stage_id: string | null; motivo_perda: string | null }[]>();
  for (const d of deals ?? []) {
    const k = d.contact_id as string;
    dealsPorContato.set(k, [...(dealsPorContato.get(k) ?? []), d as { status: string; stage_id: string | null; motivo_perda: string | null }]);
  }

  const responderam = (contatos ?? []).filter((c) => c.primeira_resposta_em);
  const avaliacao = ids.filter((id) => (dealsPorContato.get(id) ?? []).some((d) => d.status === "won" || (d.stage_id && (pos.get(d.stage_id) ?? 0) >= posAvaliacao)));
  const fecharam = ids.filter((id) => (dealsPorContato.get(id) ?? []).some((d) => d.status === "won"));
  const perdidos = (deals ?? []).filter((d) => d.status === "lost");
  const comProc = new Set((procs ?? []).map((p) => p.contact_id as string));
  const hoje = new Date().toISOString().slice(0, 10);
  const retornoDevido = (procs ?? []).filter((p) => p.retorno_em && (p.retorno_em as string) <= hoje);
  const voltaram = retornoDevido.filter((p) => p.retorno_status === "feito" || p.retorno_status === "agendado");
  const naoVoltaram = retornoDevido.filter((p) => p.retorno_status === "nao_vai" || p.retorno_status === "pendente");

  const etapas: Etapa[] = [
    { chave: "chegaram", titulo: "Chegaram", pergunta: "De onde vieram?", total: ids.length, detalhe: conta(contatos ?? [], (c) => ORIGEM[c.origem_canal as string] ?? c.origem_canal) },
    { chave: "responderam", titulo: "Foram atendidos", pergunta: "A clínica respondeu?", total: responderam.length },
    { chave: "avaliacao", titulo: "Agendaram avaliação", pergunta: "Viraram consulta?", total: avaliacao.length },
    { chave: "fecharam", titulo: "Fecharam", pergunta: "Por que não fecharam?", total: fecharam.length, detalhe: conta(perdidos, (d) => d.motivo_perda as string) },
    { chave: "procedimento", titulo: "Fizeram procedimento", pergunta: "Passaram pela cadeira?", total: [...comProc].length },
    {
      chave: "retorno",
      titulo: "Voltaram no retorno",
      pergunta: "Por que não voltaram?",
      total: new Set(voltaram.map((p) => p.contact_id as string)).size,
      detalhe: conta(naoVoltaram, (p) => (p.retorno_status === "pendente" ? "Retorno atrasado (ninguém chamou)" : (p.motivo_nao_retorno as string))),
    },
  ];

  let maior: { de: string; para: string; perdidos: number } | null = null;
  for (let i = 1; i < 4; i++) {
    const perdidosAqui = etapas[i - 1].total - etapas[i].total;
    if (perdidosAqui > 0 && (!maior || perdidosAqui > maior.perdidos)) maior = { de: etapas[i - 1].titulo, para: etapas[i].titulo, perdidos: perdidosAqui };
  }
  return { etapas, maiorVazamento: maior };
}
