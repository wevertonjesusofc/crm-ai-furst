export type NavItem = { label: string; href: string };
export type NavSection = { title: string; items: NavItem[] };

export const nav: NavSection[] = [
  {
    title: "Comercial",
    items: [
      { label: "Cockpit", href: "/comercial/cockpit" },
      { label: "Dashboard", href: "/comercial/dashboard" },
      { label: "Pós-Vendas", href: "/comercial/pos-vendas" },
      { label: "Pipeline", href: "/comercial/pipeline" },
      { label: "Consultas", href: "/comercial/consultas" },
      { label: "Inbox", href: "/comercial/inbox" },
      { label: "Treinamento", href: "/comercial/treinamento" },
    ],
  },
  {
    title: "Prospecção",
    items: [{ label: "Descobrir Leads", href: "/prospeccao" }],
  },
  {
    title: "Agentes IA",
    items: [
      { label: "Meus Agentes", href: "/agentes" },
      { label: "Habilidades", href: "/agentes/habilidades" },
      { label: "Credenciais", href: "/agentes/credenciais" },
      { label: "Organograma", href: "/agentes/organograma" },
    ],
  },
  {
    title: "Marketing",
    items: [
      { label: "Visão Geral", href: "/marketing" },
      { label: "Tráfego e Vendas", href: "/marketing/trafego" },
      { label: "Canais de Entrada", href: "/marketing/canais-entrada" },
      { label: "Páginas", href: "/marketing/paginas" },
      { label: "Redes Sociais", href: "/marketing/redes-sociais" },
      { label: "Formulários", href: "/marketing/formularios" },
      { label: "Lead Ads", href: "/marketing/lead-ads" },
      { label: "Importar Leads", href: "/marketing/importar-leads" },
      { label: "Campanhas Email", href: "/marketing/campanhas-email" },
      { label: "Campanhas WhatsApp", href: "/marketing/campanhas-whatsapp" },
      { label: "Automações", href: "/marketing/automacoes" },
      { label: "Templates Email", href: "/marketing/templates-email" },
      { label: "Templates WhatsApp", href: "/marketing/templates-whatsapp" },
    ],
  },
  {
    title: "Gestão",
    items: [
      { label: "Tarefas", href: "/gestao/tarefas" },
      { label: "Reuniões", href: "/gestao/reunioes" },
    ],
  },
  {
    title: "Meu Espaço",
    items: [{ label: "Meu WhatsApp", href: "/meu-whatsapp" }],
  },
  {
    title: "Sistema",
    items: [
      { label: "Conectar minha IA", href: "/sistema/conectar-ia" },
      { label: "Configurações", href: "/sistema/configuracoes" },
    ],
  },
];
