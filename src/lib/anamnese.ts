// Modelos de anamnese por especialidade.
// É uma ficha de relacionamento e triagem. Não substitui o prontuário médico oficial.

export type Especialidade = "clinico" | "estetica" | "odonto" | "outro";
export type Pergunta = { id: string; texto: string; tipo: "texto" | "sim_nao" | "longo" };

export const ESPECIALIDADES: Record<Especialidade, string> = {
  clinico: "Clínica médica",
  estetica: "Estética",
  odonto: "Odontologia",
  outro: "Outra",
};

// Retorno padrão (em dias) sugerido por tipo de procedimento.
export const RETORNO_PADRAO: { palavra: string; dias: number }[] = [
  { palavra: "botox", dias: 120 },
  { palavra: "toxina", dias: 120 },
  { palavra: "preenchimento", dias: 270 },
  { palavra: "bioestimulador", dias: 90 },
  { palavra: "limpeza", dias: 180 },
  { palavra: "clareamento", dias: 365 },
  { palavra: "manutenção", dias: 30 },
  { palavra: "consulta", dias: 180 },
  { palavra: "exame", dias: 30 },
];

export function sugerirRetorno(procedimento: string, realizadoEm: string): string | null {
  const regra = RETORNO_PADRAO.find((r) => procedimento.toLowerCase().includes(r.palavra));
  if (!regra) return null;
  const d = new Date(realizadoEm + "T12:00:00");
  d.setDate(d.getDate() + regra.dias);
  return d.toISOString().slice(0, 10);
}

const COMUNS: Pergunta[] = [
  { id: "queixa", texto: "O que trouxe você até a clínica?", tipo: "longo" },
  { id: "alergias", texto: "Tem alguma alergia? (medicamentos, látex, anestésicos, alimentos)", tipo: "texto" },
  { id: "medicamentos", texto: "Usa algum medicamento contínuo?", tipo: "texto" },
  { id: "doencas", texto: "Tem alguma doença ou condição de saúde (diabetes, pressão alta, problema de coagulação)?", tipo: "texto" },
  { id: "gestante", texto: "Está gestante ou amamentando?", tipo: "sim_nao" },
];

export const MODELOS: Record<Especialidade, Pergunta[]> = {
  clinico: [
    ...COMUNS,
    { id: "cirurgias", texto: "Já fez alguma cirurgia? Quais?", tipo: "texto" },
    { id: "historico_familiar", texto: "Histórico de doenças na família?", tipo: "texto" },
    { id: "habitos", texto: "Fuma, bebe ou pratica atividade física?", tipo: "texto" },
    { id: "exames", texto: "Tem exames recentes para trazer?", tipo: "sim_nao" },
  ],
  estetica: [
    ...COMUNS,
    { id: "procedimentos_anteriores", texto: "Já fez procedimentos estéticos? Quais e quando?", tipo: "texto" },
    { id: "reacao_anterior", texto: "Teve alguma reação ou complicação em procedimento anterior?", tipo: "texto" },
    { id: "queloide", texto: "Tem tendência a queloide ou manchas na pele?", tipo: "sim_nao" },
    { id: "herpes", texto: "Tem histórico de herpes labial?", tipo: "sim_nao" },
    { id: "objetivo", texto: "Qual resultado você espera?", tipo: "longo" },
  ],
  odonto: [
    ...COMUNS,
    { id: "ultima_consulta", texto: "Quando foi a última consulta com dentista?", tipo: "texto" },
    { id: "sangramento", texto: "Sua gengiva sangra ao escovar?", tipo: "sim_nao" },
    { id: "sensibilidade", texto: "Sente sensibilidade ou dor nos dentes?", tipo: "texto" },
    { id: "bruxismo", texto: "Range ou aperta os dentes?", tipo: "sim_nao" },
    { id: "anestesia", texto: "Já teve reação a anestesia odontológica?", tipo: "sim_nao" },
  ],
  outro: [...COMUNS],
};
