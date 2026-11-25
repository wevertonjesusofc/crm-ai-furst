// Organograma de funcionalidades: o que já está pronto, o que está em teste
// e os próximos passos, na ordem. Atualize aqui conforme o projeto anda.

export type Status = "pronto" | "testando" | "proximo";
export type Funcionalidade = { nome: string; status: Status; ordem?: number; nota?: string };
export type Modulo = { nome: string; descricao: string; itens: Funcionalidade[] };

export const ROADMAP: Modulo[] = [
  {
    nome: "Marketing",
    descricao: "De onde vem cada paciente",
    itens: [
      { nome: "Redes sociais com métricas (Zernio)", status: "pronto" },
      { nome: "Tráfego e vendas por anúncio", status: "pronto" },
      { nome: "Origem do paciente: post, anúncio, indicação", status: "pronto" },
      { nome: "Social selling: quem engaja, análise da IA e mensagem pronta", status: "pronto" },
      { nome: "Social selling: \"comente PALAVRA\" e a IA chama no direct sozinha", status: "proximo", ordem: 3 },
      { nome: "Agente de conteúdo: carrossel e vídeo do dia", status: "proximo", ordem: 4 },
      { nome: "Google Ads (aguarda aprovação do Google)", status: "proximo", ordem: 7 },
    ],
  },
  {
    nome: "Vendas",
    descricao: "Do primeiro contato ao fechamento",
    itens: [
      { nome: "Funil de vendas com arrastar", status: "pronto" },
      { nome: "Inbox do Instagram", status: "pronto" },
      { nome: "Venda detectada sozinha na conversa (Pix, comprovante)", status: "testando", nota: "liga com a chave da Anthropic" },
      { nome: "Combinados (\"me chama dia 17\") e cobrança às 7h", status: "testando", nota: "liga com o bot do Telegram" },
      { nome: "WhatsApp da equipe (UAZAPI): todos os números no Inbox", status: "proximo", ordem: 2 },
    ],
  },
  {
    nome: "Clínica",
    descricao: "O paciente bem cuidado",
    itens: [
      { nome: "Pacientes em cards e ficha clínica", status: "pronto" },
      { nome: "Anamnese por especialidade", status: "pronto" },
      { nome: "Agenda em quadro (confirmado, realizado, faltou)", status: "pronto" },
      { nome: "Pós-venda com as mensagens", status: "pronto" },
      { nome: "Retornos e caminho completo do paciente", status: "pronto" },
    ],
  },
  {
    nome: "Agentes de IA",
    descricao: "O time que trabalha 24h",
    itens: [
      { nome: "Organograma com pessoas e agentes", status: "pronto" },
      { nome: "Treinar pelo Claude (MCP) e tom de voz", status: "pronto" },
      { nome: "Gerente no Telegram (texto e áudio)", status: "testando", nota: "falta criar o bot" },
      { nome: "Treinar e validar cada agente no Playground", status: "proximo", ordem: 1 },
      { nome: "Treinamento do time pelo WhatsApp (áudio da reunião)", status: "proximo", ordem: 6 },
    ],
  },
  {
    nome: "Gestão",
    descricao: "O dono enxergando tudo",
    itens: [
      { nome: "Painel da clínica: meta, prêmio e jornada", status: "pronto" },
      { nome: "Painel de clientes e MCP central", status: "pronto" },
      { nome: "Conexões (IA, redes, WhatsApp, anúncios)", status: "pronto" },
      { nome: "Colocar no ar: Vercel + domínio", status: "proximo", ordem: 5 },
      { nome: "Página de vendas da Prontto", status: "proximo", ordem: 8 },
    ],
  },
];
