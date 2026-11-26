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

## 1. Banco (SQL Editor do Supabase)

**Projeto novo e vazio:** rode só o arquivo `instalar_completo.sql` (tem todas as migrações, da 001 à 030, na ordem).
Depois, ainda no SQL Editor, crie o convite do dono (sem isso ninguém consegue se cadastrar):

```sql
insert into public.convites (email, papel) values ('EMAIL_DO_DONO', 'dono') on conflict (email) do nothing;
```

**Instalação que já existe:** rode só as migrações que faltam, na ordem do número (ex.: `029`, depois `030`).

**Atenção aos acentos:** abra o arquivo num editor e copie de lá, ou copie pelo terminal com
`LANG=en_US.UTF-8 pbcopy < instalar_completo.sql`. O `pbcopy` sem o `LANG` embaralha acentos e emojis.
Se isso já aconteceu, rode `corrigir_acentos.sql`.

## 2. Variáveis do `.env.local` (e no Vercel: Settings › Environment Variables)

| Variável | Onde pegar |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase › Project Settings › API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase › Project Settings › API (anon / publishable) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase › Project Settings › API (service_role / secret). **Só no servidor.** |
| `CRON_SECRET` | **Obrigatória.** Qualquer texto longo e aleatório. A Vercel usa para chamar a rotina das 7h (`/api/rotinas/manha`); sem ela a rotina não roda. |

Não coloque chaves da Aura (Anthropic, Zernio, Meta, Gemini) na Vercel de um cliente. **Cada clínica cadastra as próprias em Conexões**, dentro do sistema. As variáveis `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`, `ZERNIO_API_KEY`, `META_ACCESS_TOKEN` e `META_AD_ACCOUNT_ID` servem só para testar no seu computador.

No Supabase › Authentication › URL Configuration:
- **Site URL**: `https://dominio-da-clinica`
- **Redirect URLs**: `https://dominio-da-clinica/**`

Sem isso, o link de confirmação do e-mail volta para `localhost`.

**Plano da Vercel:** use o **Pro** para cliente. O Hobby (grátis) não permite uso comercial e corta as rotinas longas (importar direct, social selling, Comenta & Recebe) em 60 segundos.

## 3. Sua instalação (central) pela primeira vez

1. Rode as migrações que faltam (até a 030) e crie o seu convite de dono (passo 1).
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
2. **Supabase**: crie um projeto novo, rode o `instalar_completo.sql` e crie o convite do dono com o e-mail dele (passo 1).
3. Ainda no SQL Editor, crie o seu convite de suporte:
   ```sql
   insert into public.convites (email, papel, suporte_plataforma)
   values ('SEU_EMAIL', 'equipe', true) on conflict (email) do nothing;
   ```
4. **Vercel**: importe este código como projeto novo, preencha as 4 variáveis (Supabase da clínica + `CRON_SECRET`) e ligue o domínio.
   Depois, no sistema, em **Conexões**, cadastre as chaves da clínica (Claude, Zernio, WhatsApp, Telegram).
5. Mande o link `https://dominio-da-clinica/cadastro` para o dono. Só o e-mail convidado como dono consegue assumir a clínica; o sistema já nasce com o funil e o organograma.
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

- Google Ads: puxar o gasto pela API exige aprovação do Google (developer token). Enquanto isso, o lead que chega com `gclid`/UTM já fica marcado.
- WhatsApp da equipe pela UAZAPI (o oficial da Meta já recebe pelo webhook).
- Tela para o dono convidar a equipe (hoje é pelo SQL Editor, com `insert into convites`).
- Formulário do site direto no navegador para `/api/rastreio/lead` (falta liberar CORS; por enquanto mande pelo servidor, Make ou n8n).
- Login do MCP por OAuth (hoje é por token, que funciona no Claude Code).
