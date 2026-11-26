// Catálogo das integrações: o que cada tela pede.
// Campo "segredo" é guardado só no servidor e nunca volta para a tela.

export type Campo = {
  nome: string;
  rotulo: string;
  segredo?: boolean;
  dica?: string;
  placeholder?: string;
  opcoes?: { valor: string; rotulo: string }[];
};

export type Integracao = {
  tipo: string;
  titulo: string;
  descricao: string;
  campos: Campo[];
  testavel: boolean;
  comoConseguir: string[];
  webhook?: string; // caminho do webhook que a plataforma precisa chamar
};

export const INTEGRACOES: Record<string, Integracao> = {
  ia: {
    tipo: "ia",
    titulo: "Inteligência artificial (cérebro dos agentes)",
    descricao: "A chave que faz os agentes pensarem e responderem. Sem ela, o Playground e o teste do agente não respondem.",
    campos: [
      { nome: "anthropic_api_key", rotulo: "Chave da Anthropic (Claude)", segredo: true, placeholder: "sk-ant-...", dica: "Recomendada. Tem prioridade se estiver preenchida." },
      { nome: "gemini_api_key", rotulo: "Chave do Google Gemini (opcional)", segredo: true, placeholder: "AIza...", dica: "Alternativa com cota grátis para testes. Também entende áudio." },
      { nome: "openai_api_key", rotulo: "Chave da OpenAI (opcional, para ouvir áudios)", segredo: true, placeholder: "sk-...", dica: "Usada só para transcrever mensagens de voz (Whisper). Sem ela, o Gemini transcreve." },
    ],
    testavel: true,
    comoConseguir: [
      "Anthropic: console.anthropic.com › API Keys › Create Key. Coloque créditos em Billing.",
      "Gemini: aistudio.google.com/apikey › Create API key.",
    ],
  },
  telegram: {
    tipo: "telegram",
    titulo: "Telegram (Gerente no celular)",
    descricao: "O Gerente (IA) conversa com você no Telegram: pergunte \"como tá meu dia?\" por texto ou áudio.",
    campos: [
      { nome: "bot_token", rotulo: "Token do bot", segredo: true, placeholder: "123456:ABC-...", dica: "Quem cria o bot é o @BotFather, no próprio Telegram." },
      { nome: "bot_usuario", rotulo: "@ do bot", placeholder: "@PronttoClinicaBot" },
      { nome: "codigo_acesso", rotulo: "Código de acesso", placeholder: "Ex.: prontto-4821", dica: "Quem mandar /start CÓDIGO para o bot passa a falar com o Gerente. Troque o código para bloquear novas pessoas." },
    ],
    testavel: true,
    comoConseguir: [
      "No Telegram, abra o @BotFather e mande /newbot. Escolha um nome e um @ terminado em bot.",
      "Ele responde com o token (123456:ABC-...). Cole aqui em Token do bot.",
      "Invente um código de acesso e salve.",
      "No Telegram, abra o seu bot e mande: /start SEU-CÓDIGO",
    ],
  },
  whatsapp_oficial: {
    tipo: "whatsapp_oficial",
    titulo: "WhatsApp Oficial (Cloud API da Meta)",
    descricao: "Recebe as mensagens do WhatsApp da clínica no CRM, com a origem do anúncio de clique para WhatsApp.",
    campos: [
      { nome: "phone_number_id", rotulo: "Phone Number ID", placeholder: "1234567890" },
      { nome: "waba_id", rotulo: "WhatsApp Business Account ID", placeholder: "1234567890" },
      { nome: "access_token", rotulo: "Token de acesso permanente", segredo: true, placeholder: "EAAG..." },
      { nome: "verify_token", rotulo: "Token de verificação do webhook", dica: "Invente uma palavra (ex.: prontto-2026) e cole a mesma na Meta." },
      { nome: "app_secret", rotulo: "App Secret (obrigatório)", segredo: true, dica: "Configurações do app › Básico › Chave secreta do app. Garante que só a Meta consegue mandar mensagens para o CRM." },
    ],
    testavel: true,
    webhook: "/api/webhooks/whatsapp",
    comoConseguir: [
      "developers.facebook.com › Meus apps › crie um app do tipo Empresa › adicione o produto WhatsApp.",
      "Em WhatsApp › Configuração da API: copie o Phone Number ID e o WhatsApp Business Account ID.",
      "Token permanente: Configurações do negócio › Usuários do sistema › Gerar token (permissões whatsapp_business_messaging e whatsapp_business_management).",
      "Em WhatsApp › Configuração › Webhook: cole o endereço abaixo e o token de verificação, e assine o campo messages.",
    ],
  },
  whatsapp_uazapi: {
    tipo: "whatsapp_uazapi",
    titulo: "WhatsApp (UAZAPI)",
    descricao: "Conecta um número de WhatsApp comum pela UAZAPI, sem a aprovação da Meta.",
    campos: [
      { nome: "servidor", rotulo: "Endereço do servidor", placeholder: "https://suaempresa.uazapi.com" },
      { nome: "instancia", rotulo: "Nome da instância", placeholder: "clinica-principal" },
      { nome: "token", rotulo: "Token da instância", segredo: true },
    ],
    testavel: true,
    comoConseguir: ["No painel da UAZAPI, crie a instância, leia o QR Code com o celular da clínica e copie o token."],
  },
  meta_ads: {
    tipo: "meta_ads",
    titulo: "Meta Ads (Facebook e Instagram)",
    descricao: "Puxa o gasto, os cliques e as conversas de cada anúncio para a tela Tráfego e Vendas.",
    campos: [
      { nome: "ad_account_id", rotulo: "ID da conta de anúncios", placeholder: "act_1234567890" },
      { nome: "access_token", rotulo: "Token de acesso (ads_read)", segredo: true, placeholder: "EAAG..." },
      { nome: "page_id", rotulo: "ID da página do Facebook (opcional)" },
      { nome: "pixel_id", rotulo: "ID do Pixel (opcional)" },
    ],
    testavel: true,
    comoConseguir: [
      "Gerenciador de Negócios › Configurações › Contas de anúncios: copie o ID (coloque act_ na frente).",
      "Usuários do sistema › Gerar token com a permissão ads_read para essa conta.",
    ],
  },
  redes_sociais: {
    tipo: "redes_sociais",
    titulo: "Redes sociais (Instagram e Zernio)",
    descricao: "Instagram da clínica e a Zernio para publicar e puxar métricas das redes.",
    campos: [
      { nome: "instagram_usuario", rotulo: "@ do Instagram", placeholder: "@clinica" },
      { nome: "instagram_business_id", rotulo: "ID da conta profissional do Instagram (opcional)" },
      { nome: "zernio_api_key", rotulo: "Chave da API da Zernio", segredo: true },
    ],
    testavel: false,
    comoConseguir: [
      "Instagram: a conta precisa ser profissional e estar ligada a uma página do Facebook.",
      "Zernio: no painel da Zernio, em configurações da API, gere a chave.",
    ],
  },
  google_ads: {
    tipo: "google_ads",
    titulo: "Google Ads",
    descricao: "Gasto e resultado das campanhas do Google. O lead que chega com gclid já fica marcado mesmo sem isso.",
    campos: [
      { nome: "customer_id", rotulo: "ID do cliente (Customer ID)", placeholder: "123-456-7890" },
      { nome: "developer_token", rotulo: "Developer token", segredo: true, dica: "Precisa ser aprovado pelo Google. Peça com antecedência." },
      { nome: "refresh_token", rotulo: "Refresh token (OAuth)", segredo: true },
    ],
    testavel: false,
    comoConseguir: ["ads.google.com › Ferramentas › Central da API: solicite o developer token. A aprovação leva alguns dias."],
  },
  email_marketing: {
    tipo: "email_marketing",
    titulo: "E-mail marketing (Resend)",
    descricao: "Envio de e-mails e campanhas pela Resend.",
    campos: [
      { nome: "remetente", rotulo: "Remetente", placeholder: "Clínica <contato@clinica.com.br>" },
      { nome: "resend_api_key", rotulo: "Chave da API da Resend", segredo: true, placeholder: "re_..." },
    ],
    testavel: true,
    comoConseguir: ["resend.com › API Keys › Create. Verifique o domínio da clínica em Domains."],
  },
  telefonia: {
    tipo: "telefonia",
    titulo: "Telefonia (VoIP)",
    descricao: "Ligações pelo CRM com o provedor de VoIP da clínica.",
    campos: [
      {
        nome: "provedor",
        rotulo: "Provedor",
        opcoes: [
          { valor: "", rotulo: "Escolha" },
          { valor: "twilio", rotulo: "Twilio" },
          { valor: "zenvia", rotulo: "Zenvia" },
          { valor: "outro", rotulo: "Outro" },
        ],
      },
      { nome: "numero", rotulo: "Número da clínica", placeholder: "+55 62 9...." },
      { nome: "conta_id", rotulo: "ID da conta / Account SID" },
      { nome: "api_key", rotulo: "Chave / Auth token", segredo: true },
    ],
    testavel: false,
    comoConseguir: ["No painel do provedor, copie o ID da conta e o token de autenticação."],
  },
  google_calendar: {
    tipo: "google_calendar",
    titulo: "Google Calendar",
    descricao: "Agenda da clínica para marcar avaliações.",
    campos: [
      { nome: "calendar_id", rotulo: "ID da agenda", placeholder: "clinica@gmail.com" },
      { nome: "service_account_json", rotulo: "Credencial da conta de serviço (JSON)", segredo: true },
    ],
    testavel: false,
    comoConseguir: ["console.cloud.google.com › crie uma conta de serviço, gere a chave JSON e compartilhe a agenda com o e-mail dela."],
  },
};

// Tela de Configurações › chave da tela → tipo da integração.
export const TELA_PARA_TIPO: Record<string, string> = {
  "chaves-api": "ia",
  "whatsapp-oficial": "whatsapp_oficial",
  "whatsapp-uazapi": "whatsapp_uazapi",
  "meta-ads": "meta_ads",
  "redes-sociais": "redes_sociais",
  "google-ads": "google_ads",
  "email-marketing": "email_marketing",
  telefonia: "telefonia",
  "google-calendar": "google_calendar",
};
