export type NavItem = { label: string; href: string };
export type NavSection = { title: string; items: NavItem[] };

// Menu principal: só o que o dono da clínica usa no dia a dia.
export const nav: NavSection[] = [
  {
    title: "Início",
    items: [{ label: "Painel da clínica", href: "/inicio" }],
  },
  {
    title: "Pacientes",
    items: [
      { label: "Pacientes", href: "/pacientes" },
      { label: "Funil de vendas", href: "/comercial/pipeline" },
      { label: "Agenda", href: "/comercial/consultas" },
      { label: "Pós-venda", href: "/comercial/pos-vendas" },
      { label: "Inbox", href: "/comercial/inbox" },
    ],
  },
  {
    title: "Marketing",
    items: [
      { label: "Tráfego e vendas", href: "/marketing/trafego" },
      { label: "Redes sociais", href: "/marketing/redes-sociais" },
      { label: "Social selling", href: "/marketing/social-selling" },
      { label: "Comenta & Recebe", href: "/marketing/comenta-recebe" },
      { label: "Páginas", href: "/marketing/paginas" },
    ],
  },
  {
    title: "Agentes IA",
    items: [
      { label: "Organograma", href: "/agentes/organograma" },
      { label: "Meus agentes", href: "/agentes" },
      { label: "Treinar pelo Claude", href: "/sistema/conectar-ia" },
    ],
  },
  {
    title: "Equipe",
    items: [
      { label: "Treinamento", href: "/comercial/treinamento" },
      { label: "Tarefas", href: "/gestao/tarefas" },
    ],
  },
  {
    title: "Sistema",
    items: [
      { label: "Conexões", href: "/conexoes" },
      { label: "Configurações", href: "/sistema/configuracoes" },
    ],
  },
];

// Telas que continuam existindo, mas ficam guardadas em "Avançado".
export const navAvancado: NavItem[] = [
  { label: "Cockpit", href: "/comercial/cockpit" },
  { label: "Painel comercial", href: "/comercial/dashboard" },
  { label: "Descobrir pacientes", href: "/prospeccao" },
  { label: "Visão geral do marketing", href: "/marketing" },
  { label: "Canais de entrada", href: "/marketing/canais-entrada" },
  { label: "Formulários", href: "/marketing/formularios" },
  { label: "Anúncios de cadastro (Lead Ads)", href: "/marketing/lead-ads" },
  { label: "Importar contatos", href: "/marketing/importar-leads" },
  { label: "Campanhas de e-mail", href: "/marketing/campanhas-email" },
  { label: "Campanhas de WhatsApp", href: "/marketing/campanhas-whatsapp" },
  { label: "Automações", href: "/marketing/automacoes" },
  { label: "Modelos de e-mail", href: "/marketing/templates-email" },
  { label: "Modelos de WhatsApp", href: "/marketing/templates-whatsapp" },
  { label: "Habilidades dos agentes", href: "/agentes/habilidades" },
  { label: "Credenciais dos agentes", href: "/agentes/credenciais" },
  { label: "Reuniões", href: "/gestao/reunioes" },
  { label: "Meu WhatsApp", href: "/meu-whatsapp" },
];
