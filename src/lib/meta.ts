// Cálculo da meta do mês: quanto falta, ritmo necessário e projeção.

export function diasUteis(inicio: Date, fim: Date): number {
  let n = 0;
  const d = new Date(inicio);
  d.setHours(12, 0, 0, 0);
  const f = new Date(fim);
  f.setHours(12, 0, 0, 0);
  while (d <= f) {
    const dia = d.getDay();
    if (dia !== 0 && dia !== 6) n++;
    d.setDate(d.getDate() + 1);
  }
  return n;
}

export function calcularMeta(meta: number, faturado: number, vendas: number, hoje = new Date()) {
  const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  const fim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
  const totalUteis = diasUteis(inicio, fim);
  const passados = diasUteis(inicio, hoje);
  const amanha = new Date(hoje);
  amanha.setDate(hoje.getDate() + 1);
  const restantes = Math.max(diasUteis(amanha, fim), 0);
  const falta = Math.max(meta - faturado, 0);
  const ritmoAtual = passados > 0 ? faturado / passados : 0;
  const projecao = ritmoAtual * totalUteis;
  const ticket = vendas > 0 ? faturado / vendas : 0;
  return {
    meta,
    faturado,
    falta,
    percentual: meta > 0 ? Math.min((faturado / meta) * 100, 999) : 0,
    restantes,
    porDiaUtil: restantes > 0 ? falta / restantes : falta,
    projecao,
    ticket,
    vendasQueFaltam: ticket > 0 ? Math.ceil(falta / ticket) : null,
    vaiBater: meta > 0 && projecao >= meta,
  };
}

export const brl = (v: number) => Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
