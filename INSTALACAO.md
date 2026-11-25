# CRM AURA · Instalação, clientes e transferência

## Como está organizado

- **Um código só** (esta pasta). Ele é instalado uma vez para cada clínica.
- **Cada clínica tem o próprio** Supabase (banco), Vercel (site) e domínio. Nada é misturado.
- **A sua instalação (central da Aura)** é igual às outras, mais o **Painel de clientes** (`/admin/clientes`) e o **MCP central** (`/api/mcp/central`).
- **Cada instalação tem o próprio MCP** (`/api/mcp`). A clínica pode conectar o Claude dela direto, como a Mari fez na imersão.

```
Claude (você) ── MCP central (sua instalação) ──► MCP do Rafael ──► banco do Rafael
                         │                     └► MCP do Cláudio ──► banco do Cláudio
                         └── Painel de clientes: "Usar no Claude" troca a conta ativa
```

## 1. Ordem das migrações (SQL Editor do Supabase)

Rode na ordem, colando o arquivo inteiro e clicando em **Run**:

`001` → `002` → `003` → `005` → `006` → `007` → `008` → `009` → `010` → `011` → `012` → `013` → `014` → `015` → `016` → **`017_multiclinica`** → **`018_instalacao_por_clinica`** → **`019_conhecimento_clinica`** → **`020_ficha_paciente_e_trafego`** → **`021_integracoes`**

Na sua instalação atual (que já tem 001 a 016), rode só **017 a 021**.

Num projeto **novo e vazio**, use o arquivo único `instalar_completo.sql`.

**Atenção aos acentos:** abra o arquivo num editor e copie de lá, ou copie pelo terminal com
`LANG=en_US.UTF-8 pbcopy < instalar_completo.sql`. O `pbcopy` sem o `LANG` embaralha acentos e emojis.
Se isso já aconteceu, rode `corrigir_acentos.sql`.

## 2. Variáveis do `.env.local` (e no Vercel: Settings › Environment Variables)

| Variável | Onde pegar |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase › Project Settings › API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase › Project Settings › API (anon / publishable) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase › Project Settings › API (service_role / secret). **Só no servidor.** |
| `ANTHROPIC_API_KEY` | console.anthropic.com › API Keys (o cérebro dos agentes) |
| `META_ACCESS_TOKEN` | Opcional. Token com permissão `ads_read` da conta de anúncios **da clínica** (Gerenciador de Negócios › Usuários do sistema) |
| `META_AD_ACCOUNT_ID` | Opcional. Ex.: `act_1234567890` |

No Supabase › Authentication › URL Configuration, coloque o domínio da clínica em **Site URL** (para o link de confirmação de e-mail voltar para o lugar certo).

## 3. Sua instalação (central) pela primeira vez

1. Rode 017, 018 e 019.
2. Coloque `SUPABASE_SERVICE_ROLE_KEY` no `.env.local`.
3. Abra `/cadastro` e crie a sua conta. Você assume a clínica desta instalação.
4. No SQL Editor, vire administrador (troque o e-mail):
   ```sql
   insert into public.plataforma_admins (user_id)
     select id from auth.users where email = 'SEU_EMAIL' on conflict do nothing;
   ```
5. Em **Sistema › Conectar IA**, gere o token. No comando que aparecer, troque `/api/mcp` por `/api/mcp/central` e rode no terminal do Claude Code.

## 4. Nova clínica

1. **Domínio**: de preferência comprado no CNPJ da clínica (facilita transferir depois).
2. **Supabase**: crie um projeto novo e rode as migrações 001 a 019.
3. Ainda no SQL Editor, crie o seu convite de suporte:
   ```sql
   insert into public.convites (email, papel, suporte_plataforma)
   values ('SEU_EMAIL', 'equipe', true) on conflict (email) do nothing;
   ```
4. **Vercel**: importe este código como projeto novo, preencha as variáveis com as chaves **do Supabase da clínica** e ligue o domínio.
5. Mande o link `https://dominio-da-clinica/cadastro` para o dono. **Ele se cadastra primeiro** e vira o dono; o sistema já nasce com o funil e o organograma.
6. Você se cadastra no mesmo link com o seu e-mail e entra como suporte.
7. No sistema da clínica, em **Sistema › Conectar IA**, gere um token.
8. Na sua central, em **Painel de clientes**, cadastre a clínica (endereço do sistema, projetos) e cole o token em **Token do MCP**.
9. Clique em **Usar no Claude**. A partir daí o Claude trabalha nessa conta e avisa quando você trocar.

## 5. Transferir para o cliente

Quando a clínica quiser assumir:

1. **Supabase**: Project Settings › General › Transfer project, para a organização do cliente.
2. **Vercel**: Settings › General › Transfer project, para a conta do cliente.
3. **Domínio**: se estiver no seu nome, transfira no registro (registro.br › titularidade).
4. **Chaves**: o cliente cria a própria chave da Anthropic e troca no Vercel.
5. No Painel de clientes, mude **Status** para *Transferido ao cliente*. O MCP central para de mexer nessa conta.
6. Se ele quiser tirar o seu acesso: no sistema dele, apagar o seu usuário e os tokens em **Conectar IA**.

Tudo o que foi feito até ali (agentes, tom de voz, funil, conversas) vai junto, porque está no banco dele.

## 6. Custo por clínica (conferir preços atuais antes de fechar)

- Supabase: o plano gratuito aceita poucos projetos e pausa quando fica parado. Para cliente de verdade, conte com o plano pago por projeto.
- Vercel: uso comercial pede plano pago.
- Anthropic: por uso (mensagens dos agentes).

Se a **Aura cuida** da hospedagem, isso entra na mensalidade. Se o **cliente assumiu**, ele paga direto.

## 7. O que o Claude consegue fazer pelo MCP

`quem_sou_eu`, `ver_organograma`, `ver_agente`, `criar_agente`, `atualizar_agente`, `adicionar_conhecimento`, `adicionar_regra`, `ver_funil`, `definir_funil`, `conversas_recentes`, `salvar_tom_de_voz`, `adicionar_conhecimento_clinica`, `cadastrar_procedimento`, `testar_agente`, `resumo_do_dia`, `definir_meta_mensal`, `desempenho_anuncios`, `retornos_pendentes`, `giro_30_dias`.
Na central, também `listar_clientes` e `usar_cliente`.

**Treino igual ao da imersão:** peça ao Claude para simular um paciente mandando direct, responda do seu jeito, peça para ele extrair o tom e salvar com `salvar_tom_de_voz`. Depois peça para ele testar o agente com `testar_agente` simulando pacientes difíceis e corrigir o prompt até ficar bom.

## 8. Clínica no dia a dia

- **Cadastro:** a clínica escolhe a área (estética, clínica médica, odontologia). Isso define o modelo de anamnese.
- **Paciente › Ficha clínica:** alergias e medicamentos em destaque, preferências (o café, o chá), consentimento LGPD, de onde veio, procedimentos com produto/lote e **retorno sugerido automaticamente** (botox 4 meses, limpeza 6 meses…), orçamentos e anamnese. É ficha de relacionamento: não substitui o prontuário oficial.
- **Dashboard › Meta do mês:** meta, faturado, quanto falta, quanto vender por dia útil e projeção no ritmo atual. Faturado = oportunidades marcadas como ganhas no mês.
- **Marketing › Tráfego e Vendas:** gasto × pacientes × vendas por anúncio, com a indicação *Escalar*, *Observar* ou *Cortar*. Botão para puxar o gasto da Meta.
- **Entrada de leads:** `POST /api/rastreio/lead` com o cabeçalho `x-chave-clinica` (a chave aparece na tela de Tráfego). Formulário do site, webhook do WhatsApp, Zernio, Make ou n8n mandam o paciente já com a origem e o anúncio.

## Ainda não feito

- Google Ads: puxar o gasto pela API exige aprovação do Google (developer token). Peça logo. Enquanto isso, o lead que chega com `gclid`/UTM já fica marcado.
- Webhook oficial do WhatsApp (receber e responder mensagens dentro do CRM) e Instagram Direct.

- Ligar WhatsApp e Instagram de verdade (o motor já responde no Playground e no `testar_agente`).
- Login do MCP por OAuth (hoje é por token, que funciona no Claude Code).
- Trazer o agente de conteúdo da ilha de edição para dentro do CRM.
