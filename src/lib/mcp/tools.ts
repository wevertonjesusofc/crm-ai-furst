import { SupabaseClient } from "@supabase/supabase-js";
import { ContextoMcp } from "./auth";
import { calcularMeta, brl } from "@/lib/meta";

type Args = Record<string, unknown>;
type Tool = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  run: (db: SupabaseClient, ctx: ContextoMcp, args: Args) => Promise<string>;
};

const TIERS = ["ceo", "manager", "specialist"];
const CAMPOS_AGENTE = ["nome", "emoji", "proposito", "prompt", "tier", "reportar_a_id", "temperatura", "ativo", "responsavel"];

function str(v: unknown): string | undefined {
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
}

async function agenteDaClinica(db: SupabaseClient, ctx: ContextoMcp, id: unknown) {
  const agenteId = str(id);
  if (!agenteId) throw new Error("Informe o agente_id.");
  const { data } = await db.from("agentes").select("*").eq("id", agenteId).eq("clinica_id", ctx.clinicaId).maybeSingle();
  if (!data) throw new Error("Agente não encontrado nesta clínica.");
  return data;
}

export const TOOLS: Tool[] = [
  {
    name: "quem_sou_eu",
    description: "Mostra em qual conta (clínica) você está conectado agora. Use no início da conversa e sempre que houver dúvida sobre qual clínica está sendo alterada.",
    inputSchema: { type: "object", properties: {} },
    run: async (_db, ctx) =>
      `Conta conectada: ${ctx.clinicaNome}\nUsuário: ${ctx.email ?? ctx.userId}${ctx.admin ? " (administrador da plataforma)" : ""}\nID da clínica: ${ctx.clinicaId}`,
  },
  {
    name: "ver_organograma",
    description: "Mostra o organograma dos agentes de IA da clínica (gerente, coordenadores e especialistas) com o propósito de cada um.",
    inputSchema: { type: "object", properties: {} },
    run: async (db, ctx) => {
      const { data } = await db.from("agentes").select("id, nome, emoji, tier, proposito, reportar_a_id, ativo").eq("clinica_id", ctx.clinicaId).order("created_at");
      const ags = data ?? [];
      if (!ags.length) return `A clínica ${ctx.clinicaNome} ainda não tem agentes.`;
      const filhos = (pai: string | null) => ags.filter((a) => (a.reportar_a_id ?? null) === pai);
      const linhas: string[] = [`Organograma de ${ctx.clinicaNome}:`];
      const desenhar = (pai: string | null, nivel: number) => {
        for (const a of filhos(pai)) {
          linhas.push(`${"  ".repeat(nivel)}- ${a.emoji} ${a.nome} [${a.tier}${a.ativo ? "" : ", inativo"}] (id ${a.id}): ${a.proposito ?? ""}`);
          desenhar(a.id, nivel + 1);
        }
      };
      desenhar(null, 0);
      const ids = new Set(ags.map((a) => a.id));
      ags.filter((a) => a.reportar_a_id && !ids.has(a.reportar_a_id)).forEach((a) => linhas.push(`- ${a.emoji} ${a.nome} (sem chefe válido, id ${a.id})`));
      return linhas.join("\n");
    },
  },
  {
    name: "ver_agente",
    description: "Mostra a configuração completa de um agente: prompt, regras e conhecimentos cadastrados.",
    inputSchema: { type: "object", properties: { agente_id: { type: "string" } }, required: ["agente_id"] },
    run: async (db, ctx, args) => {
      const a = await agenteDaClinica(db, ctx, args.agente_id);
      const [{ data: regras }, { data: notas }] = await Promise.all([
        db.from("agente_regras").select("nome, ativa, evento, palavras_chave, acao_tipo, mensagem").eq("agente_id", a.id).eq("clinica_id", ctx.clinicaId),
        db.from("agente_notas").select("titulo, conteudo").eq("agente_id", a.id).eq("clinica_id", ctx.clinicaId),
      ]);
      return [
        `${a.emoji} ${a.nome} (${a.tier}, versão ${a.versao}, ${a.ativo ? "ativo" : "inativo"})`,
        `Propósito: ${a.proposito ?? "-"}`,
        `Temperatura: ${a.temperatura}`,
        `\nPrompt:\n${a.prompt || "(vazio)"}`,
        `\nRegras (${regras?.length ?? 0}):`,
        ...(regras ?? []).map((r) => `- ${r.nome} [${r.ativa ? "ativa" : "desligada"}] quando ${r.evento}${r.palavras_chave ? ` com "${r.palavras_chave}"` : ""} → ${r.acao_tipo}${r.mensagem ? `: ${r.mensagem}` : ""}`),
        `\nConhecimentos (${notas?.length ?? 0}):`,
        ...(notas ?? []).map((n) => `- ${n.titulo}: ${n.conteudo}`),
      ].join("\n");
    },
  },
  {
    name: "criar_agente",
    description: "Cria um novo agente de IA na clínica conectada. tier: ceo, manager ou specialist. reportar_a_id liga o agente ao chefe no organograma.",
    inputSchema: {
      type: "object",
      properties: {
        nome: { type: "string" },
        proposito: { type: "string" },
        prompt: { type: "string", description: "Instruções completas de como o agente deve agir e falar." },
        tier: { type: "string", enum: TIERS },
        reportar_a_id: { type: "string" },
        emoji: { type: "string" },
      },
      required: ["nome", "proposito"],
    },
    run: async (db, ctx, args) => {
      const tier = TIERS.includes(String(args.tier)) ? String(args.tier) : "specialist";
      if (str(args.reportar_a_id)) await agenteDaClinica(db, ctx, args.reportar_a_id);
      const { data, error } = await db
        .from("agentes")
        .insert({
          clinica_id: ctx.clinicaId,
          nome: str(args.nome),
          proposito: str(args.proposito),
          prompt: str(args.prompt) ?? "",
          tier,
          reportar_a_id: str(args.reportar_a_id) ?? null,
          emoji: str(args.emoji) ?? "🤖",
        })
        .select("id, nome")
        .single();
      if (error) throw new Error(error.message);
      return `Agente "${data.nome}" criado em ${ctx.clinicaNome} (id ${data.id}).`;
    },
  },
  {
    name: "atualizar_agente",
    description: "Altera um agente: nome, emoji, propósito, prompt, tier, chefe (reportar_a_id), temperatura, ativo ou responsável. Mudar o prompt gera uma nova versão.",
    inputSchema: {
      type: "object",
      properties: {
        agente_id: { type: "string" },
        nome: { type: "string" },
        emoji: { type: "string" },
        proposito: { type: "string" },
        prompt: { type: "string" },
        tier: { type: "string", enum: TIERS },
        reportar_a_id: { type: "string" },
        temperatura: { type: "number" },
        ativo: { type: "boolean" },
        responsavel: { type: "string" },
      },
      required: ["agente_id"],
    },
    run: async (db, ctx, args) => {
      const a = await agenteDaClinica(db, ctx, args.agente_id);
      const mudancas: Record<string, unknown> = {};
      for (const c of CAMPOS_AGENTE) if (args[c] !== undefined) mudancas[c] = args[c];
      if (mudancas.tier !== undefined && !TIERS.includes(String(mudancas.tier))) throw new Error("tier precisa ser ceo, manager ou specialist.");
      if (mudancas.reportar_a_id) await agenteDaClinica(db, ctx, mudancas.reportar_a_id);
      if (!Object.keys(mudancas).length) return "Nada para alterar.";
      if (mudancas.prompt !== undefined && mudancas.prompt !== a.prompt) mudancas.versao = (a.versao ?? 1) + 1;
      const { error } = await db.from("agentes").update(mudancas).eq("id", a.id).eq("clinica_id", ctx.clinicaId);
      if (error) throw new Error(error.message);
      return `Agente "${a.nome}" atualizado em ${ctx.clinicaNome}: ${Object.keys(mudancas).filter((k) => k !== "versao").join(", ")}.`;
    },
  },
  {
    name: "adicionar_conhecimento",
    description: "Ensina algo ao agente: preço, procedimento, política, jeito de falar, exemplo de boa resposta. Fica salvo como conhecimento do agente.",
    inputSchema: {
      type: "object",
      properties: { agente_id: { type: "string" }, titulo: { type: "string" }, conteudo: { type: "string" } },
      required: ["agente_id", "titulo", "conteudo"],
    },
    run: async (db, ctx, args) => {
      const a = await agenteDaClinica(db, ctx, args.agente_id);
      const { error } = await db.from("agente_notas").insert({ clinica_id: ctx.clinicaId, agente_id: a.id, titulo: str(args.titulo), conteudo: str(args.conteudo) });
      if (error) throw new Error(error.message);
      return `Conhecimento "${str(args.titulo)}" adicionado ao agente ${a.nome}.`;
    },
  },
  {
    name: "adicionar_regra",
    description: "Cria uma regra de comportamento para o agente. Ex.: quando o lead falar 'reclamação', notificar um humano.",
    inputSchema: {
      type: "object",
      properties: {
        agente_id: { type: "string" },
        nome: { type: "string" },
        palavras_chave: { type: "string", description: "Palavras separadas por vírgula que disparam a regra." },
        acao_tipo: { type: "string", description: "Ex.: notificar_humano, responder_mensagem, pausar_agente." },
        mensagem: { type: "string" },
      },
      required: ["agente_id", "nome"],
    },
    run: async (db, ctx, args) => {
      const a = await agenteDaClinica(db, ctx, args.agente_id);
      const { error } = await db.from("agente_regras").insert({
        clinica_id: ctx.clinicaId,
        agente_id: a.id,
        nome: str(args.nome),
        palavras_chave: str(args.palavras_chave) ?? null,
        acao_tipo: str(args.acao_tipo) ?? "notificar_humano",
        mensagem: str(args.mensagem) ?? null,
      });
      if (error) throw new Error(error.message);
      return `Regra "${str(args.nome)}" criada para ${a.nome}.`;
    },
  },
  {
    name: "ver_funil",
    description: "Mostra as etapas do funil de vendas da clínica e quantas oportunidades há em cada uma.",
    inputSchema: { type: "object", properties: {} },
    run: async (db, ctx) => {
      const [{ data: etapas }, { data: deals }] = await Promise.all([
        db.from("pipeline_stages").select("id, name, position").eq("clinica_id", ctx.clinicaId).order("position"),
        db.from("deals").select("stage_id, status").eq("clinica_id", ctx.clinicaId),
      ]);
      return [`Funil de ${ctx.clinicaNome}:`, ...(etapas ?? []).map((e) => `${e.position}. ${e.name} (${(deals ?? []).filter((d) => d.stage_id === e.id).length})`)].join("\n");
    },
  },
  {
    name: "definir_funil",
    description: "Substitui as etapas do funil pela lista informada, na ordem. Só funciona se nenhuma oportunidade estiver usando as etapas atuais.",
    inputSchema: { type: "object", properties: { etapas: { type: "array", items: { type: "string" } } }, required: ["etapas"] },
    run: async (db, ctx, args) => {
      const etapas = Array.isArray(args.etapas) ? args.etapas.map((e) => String(e).trim()).filter(Boolean) : [];
      if (etapas.length < 2) throw new Error("Informe pelo menos 2 etapas.");
      const { count } = await db.from("deals").select("id", { count: "exact", head: true }).eq("clinica_id", ctx.clinicaId).not("stage_id", "is", null);
      if (count) throw new Error(`Há ${count} oportunidade(s) usando o funil atual. Mova ou feche antes de trocar as etapas.`);
      await db.from("pipeline_stages").delete().eq("clinica_id", ctx.clinicaId);
      const { error } = await db.from("pipeline_stages").insert(etapas.map((name, i) => ({ clinica_id: ctx.clinicaId, name, position: i + 1 })));
      if (error) throw new Error(error.message);
      return `Funil de ${ctx.clinicaNome} atualizado: ${etapas.join(" → ")}.`;
    },
  },
  {
    name: "conversas_recentes",
    description: "Lista as conversas mais recentes do WhatsApp e do Instagram, com a última mensagem de cada uma.",
    inputSchema: { type: "object", properties: { limite: { type: "number" } } },
    run: async (db, ctx, args) => {
      const limite = Math.min(Math.max(Number(args.limite) || 10, 1), 50);
      const { data: conversas } = await db
        .from("conversas")
        .select("id, channel, status, last_message_at, contacts(name)")
        .eq("clinica_id", ctx.clinicaId)
        .order("last_message_at", { ascending: false, nullsFirst: false })
        .limit(limite);
      if (!conversas?.length) return `Nenhuma conversa registrada em ${ctx.clinicaNome}.`;
      const linhas = [`Conversas recentes de ${ctx.clinicaNome}:`];
      for (const c of conversas) {
        const { data: ult } = await db.from("mensagens").select("direction, body").eq("conversa_id", c.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
        const contato = (c.contacts as unknown as { name?: string } | null)?.name ?? "Sem nome";
        linhas.push(`- ${contato} (${c.channel}, ${c.status}): ${ult ? `${ult.direction === "recebida" ? "paciente" : "clínica"}: ${ult.body.slice(0, 120)}` : "sem mensagens"}`);
      }
      return linhas.join("\n");
    },
  },
  {
    name: "salvar_tom_de_voz",
    description:
      "Salva o tom de voz da clínica, que passa a valer para TODOS os agentes. Para descobrir o tom: simule um paciente mandando direct, deixe o dono responder do jeito dele e extraia as características (formalidade, tamanho das frases, expressões, risadas, emojis, como trata o paciente, o que nunca fazer). Substitui o tom anterior.",
    inputSchema: {
      type: "object",
      properties: { conteudo: { type: "string", description: "Descrição completa do tom de voz, com exemplos de frases." } },
      required: ["conteudo"],
    },
    run: async (db, ctx, args) => {
      const conteudo = str(args.conteudo);
      if (!conteudo) throw new Error("Informe o tom de voz.");
      await db.from("conhecimento_clinica").delete().eq("clinica_id", ctx.clinicaId).eq("tipo", "tom_de_voz");
      const { error } = await db.from("conhecimento_clinica").insert({ clinica_id: ctx.clinicaId, tipo: "tom_de_voz", titulo: "Tom de voz", conteudo });
      if (error) throw new Error(error.message);
      return `Tom de voz salvo em ${ctx.clinicaNome}. Todos os agentes passam a usar.`;
    },
  },
  {
    name: "adicionar_conhecimento_clinica",
    description: "Ensina algo que TODOS os agentes precisam saber: horário, endereço, formas de pagamento, política de remarcação, convênios, diferenciais da clínica.",
    inputSchema: {
      type: "object",
      properties: { titulo: { type: "string" }, conteudo: { type: "string" }, tipo: { type: "string", enum: ["politica", "geral"] } },
      required: ["titulo", "conteudo"],
    },
    run: async (db, ctx, args) => {
      const tipo = args.tipo === "politica" ? "politica" : "geral";
      const { error } = await db.from("conhecimento_clinica").insert({ clinica_id: ctx.clinicaId, tipo, titulo: str(args.titulo), conteudo: str(args.conteudo) });
      if (error) throw new Error(error.message);
      return `Conhecimento "${str(args.titulo)}" salvo para todos os agentes de ${ctx.clinicaNome}.`;
    },
  },
  {
    name: "cadastrar_procedimento",
    description: "Cadastra ou atualiza um procedimento da clínica com preço e descrição. Os agentes só oferecem procedimentos cadastrados.",
    inputSchema: {
      type: "object",
      properties: { nome: { type: "string" }, preco: { type: "number" }, descricao: { type: "string" }, categoria: { type: "string" } },
      required: ["nome"],
    },
    run: async (db, ctx, args) => {
      const nome = str(args.nome);
      if (!nome) throw new Error("Informe o nome do procedimento.");
      const dados = {
        clinica_id: ctx.clinicaId,
        nome,
        preco: Number(args.preco) || 0,
        descricao: str(args.descricao) ?? null,
        categoria: str(args.categoria) ?? null,
        status: "ativo",
      };
      const { data: existe } = await db.from("produtos").select("id").eq("clinica_id", ctx.clinicaId).ilike("nome", nome).maybeSingle();
      const { error } = existe
        ? await db.from("produtos").update(dados).eq("id", existe.id).eq("clinica_id", ctx.clinicaId)
        : await db.from("produtos").insert(dados);
      if (error) throw new Error(error.message);
      return `Procedimento "${nome}" ${existe ? "atualizado" : "cadastrado"} em ${ctx.clinicaNome}.`;
    },
  },
  {
    name: "testar_agente",
    description:
      "Testa um agente de verdade: manda a conversa (o que o paciente disse e o que o agente já respondeu) e recebe a próxima resposta do agente, usando o prompt, o tom de voz, os conhecimentos e as regras atuais. Use para simular pacientes difíceis, achar falhas e corrigir antes de ligar o agente.",
    inputSchema: {
      type: "object",
      properties: {
        agente_id: { type: "string" },
        conversa: {
          type: "array",
          description: "Mensagens em ordem. A última deve ser do paciente.",
          items: {
            type: "object",
            properties: { quem: { type: "string", enum: ["paciente", "agente"] }, texto: { type: "string" } },
            required: ["quem", "texto"],
          },
        },
      },
      required: ["agente_id", "conversa"],
    },
    run: async (db, ctx, args) => {
      const a = await agenteDaClinica(db, ctx, args.agente_id);
      const conversa = Array.isArray(args.conversa) ? (args.conversa as { quem?: string; texto?: string }[]) : [];
      if (!conversa.length) throw new Error("Informe pelo menos uma mensagem do paciente.");
      const historico = conversa.map((m) => ({ direction: (m.quem === "agente" ? "recebida" : "enviada") as "recebida" | "enviada", body: String(m.texto ?? "") }));
      const { responder } = await import("@/lib/agenteRuntime");
      const resposta = await responder(db, ctx.clinicaId, a.id, historico);
      return `Resposta de ${a.nome}:\n${resposta}`;
    },
  },
  {
    name: "resumo_do_dia",
    description: "Responde 'como tá meu dia?': conversas de hoje, de onde vieram, oportunidades novas, ganhas e tarefas atrasadas. Use quando o dono pedir um resumo.",
    inputSchema: { type: "object", properties: {} },
    run: async (db, ctx) => {
      const inicio = new Date();
      inicio.setHours(0, 0, 0, 0);
      const desde = inicio.toISOString();
      const hoje = desde.slice(0, 10);
      const [msgs, convs, novos, ganhos, atrasadas] = await Promise.all([
        db.from("mensagens").select("conversa_id, direction").eq("clinica_id", ctx.clinicaId).gte("created_at", desde),
        db.from("conversas").select("id, channel").eq("clinica_id", ctx.clinicaId),
        db.from("deals").select("id", { count: "exact", head: true }).eq("clinica_id", ctx.clinicaId).gte("created_at", desde),
        db.from("deals").select("value").eq("clinica_id", ctx.clinicaId).eq("status", "won").gte("updated_at", desde),
        db.from("tasks").select("id", { count: "exact", head: true }).eq("clinica_id", ctx.clinicaId).eq("done", false).lt("due_date", hoje),
      ]);
      const recebidas = (msgs.data ?? []).filter((m) => m.direction === "recebida");
      const conversasHoje = new Set(recebidas.map((m) => m.conversa_id));
      const canal: Record<string, number> = {};
      for (const c of convs.data ?? []) if (conversasHoje.has(c.id)) canal[c.channel] = (canal[c.channel] ?? 0) + 1;
      const valorGanho = (ganhos.data ?? []).reduce((s, d) => s + Number(d.value ?? 0), 0);
      return [
        `Resumo de hoje em ${ctx.clinicaNome}:`,
        `- Conversas com mensagem de paciente: ${conversasHoje.size}${Object.keys(canal).length ? ` (${Object.entries(canal).map(([k, v]) => `${k}: ${v}`).join(", ")})` : ""}`,
        `- Oportunidades novas: ${novos.count ?? 0}`,
        `- Vendas ganhas hoje: ${(ganhos.data ?? []).length} (R$ ${valorGanho.toFixed(2)})`,
        `- Tarefas atrasadas: ${atrasadas.count ?? 0}`,
        await linhaMeta(db, ctx),
        `Observação: só conta o que está registrado no CRM.`,
      ].join("\n");
    },
  },
  {
    name: "jornada_do_paciente",
    description:
      "Mostra a jornada dos pacientes do período: quantos chegaram (e de onde), foram atendidos, agendaram avaliação, fecharam (e por que não fecharam), fizeram procedimento e voltaram no retorno (e por que não voltaram). Aponta o maior vazamento.",
    inputSchema: { type: "object", properties: { dias: { type: "number", description: "Período em dias. Padrão 30." } } },
    run: async (db, ctx, args) => {
      const dias = Math.min(Math.max(Number(args.dias) || 30, 1), 365);
      const { calcularJornada } = await import("@/lib/jornada");
      const j = await calcularJornada(db, new Date(Date.now() - dias * 86400000).toISOString(), ctx.clinicaId);
      if (!j.etapas.length) return `Nenhum paciente novo nos últimos ${dias} dias em ${ctx.clinicaNome}.`;
      const linhas = [`Jornada dos últimos ${dias} dias em ${ctx.clinicaNome}:`];
      for (const e of j.etapas) {
        linhas.push(`- ${e.titulo}: ${e.total}`);
        for (const d of (e.detalhe ?? []).slice(0, 4)) linhas.push(`    · ${d.rotulo}: ${d.n}`);
      }
      if (j.maiorVazamento) linhas.push(`Maior vazamento: ${j.maiorVazamento.perdidos} entre "${j.maiorVazamento.de}" e "${j.maiorVazamento.para}".`);
      return linhas.join("\n");
    },
  },
  {
    name: "detectar_vendas_nas_conversas",
    description: "Lê as conversas recentes do WhatsApp e do Instagram que têm sinal de pagamento (Pix, comprovante, fechado) e marca como Ganho as vendas que fecharam, com o valor e os procedimentos.",
    inputSchema: { type: "object", properties: { dias: { type: "number", description: "Quantos dias para trás. Padrão 7." } } },
    run: async (db, ctx, args) => {
      const { varrerVendas } = await import("@/lib/vendaAutomatica");
      const r = await varrerVendas(db, ctx.clinicaId, Math.min(Math.max(Number(args.dias) || 7, 1), 60));
      if (!r.fechadas.length) return `Analisei ${r.analisadas} conversa(s) com sinal de pagamento em ${ctx.clinicaNome}. Nenhuma venda nova fechada.`;
      return [`Vendas fechadas encontradas em ${ctx.clinicaNome}:`, ...r.fechadas.map((f) => `- ${f.titulo ?? "Venda"}${f.valor ? `: ${brl(f.valor)}` : ""}`)].join("\n");
    },
  },
  {
    name: "definir_meta_mensal",
    description: "Define a meta de faturamento do mês da clínica (em reais). Ela aparece no Dashboard para o time ver quanto falta.",
    inputSchema: { type: "object", properties: { valor: { type: "number" } }, required: ["valor"] },
    run: async (db, ctx, args) => {
      const valor = Number(args.valor);
      if (!(valor >= 0)) throw new Error("Informe um valor em reais.");
      const { error } = await db.from("sistema_config").update({ meta_mensal: valor }).eq("clinica_id", ctx.clinicaId).eq("id", "default");
      if (error) throw new Error(error.message);
      return `Meta do mês de ${ctx.clinicaNome}: ${brl(valor)}.\n${await linhaMeta(db, ctx)}`;
    },
  },
  {
    name: "desempenho_anuncios",
    description: "Mostra, por anúncio, quanto gastou, quantos pacientes trouxe, quantas vendas e a receita, com a recomendação: escalar, observar ou cortar.",
    inputSchema: { type: "object", properties: {} },
    run: async (db, ctx) => {
      const { data } = await db.from("desempenho_anuncios").select("*").eq("clinica_id", ctx.clinicaId).order("gasto", { ascending: false });
      if (!data?.length) return `Nenhum anúncio registrado em ${ctx.clinicaNome}. Sincronize a Meta ou mande leads com o id do anúncio.`;
      return [
        `Anúncios de ${ctx.clinicaNome} (regra: escalar se trouxe venda e retorno ≥ R$ 3 por R$ 1; cortar se gastou ≥ R$ 300 sem venda):`,
        ...data.map((l) => {
          const rec = l.vendas > 0 && Number(l.retorno_por_real ?? 0) >= 3 ? "ESCALAR" : Number(l.gasto) >= 300 && l.vendas === 0 ? "CORTAR/TROCAR CRIATIVO" : "OBSERVAR";
          return `- ${l.nome} (${l.plataforma}${l.campanha ? `, ${l.campanha}` : ""}): gasto ${brl(Number(l.gasto))}, ${l.pacientes} paciente(s), ${l.vendas} venda(s), receita ${brl(Number(l.receita))}${l.retorno_por_real ? `, R$ ${l.retorno_por_real} por R$ 1` : ""} → ${rec}`;
        }),
      ].join("\n");
    },
  },
  {
    name: "retornos_pendentes",
    description: "Lista os pacientes com retorno vencido ou vencendo nos próximos dias (ex.: botox de 4 a 6 meses, manutenção, revisão).",
    inputSchema: { type: "object", properties: { proximos_dias: { type: "number", description: "Padrão 15." } } },
    run: async (db, ctx, args) => {
      const dias = Math.min(Math.max(Number(args.proximos_dias) || 15, 1), 120);
      const ate = new Date();
      ate.setDate(ate.getDate() + dias);
      const { data } = await db
        .from("procedimentos_realizados")
        .select("nome, retorno_em, contacts(name, whatsapp)")
        .eq("clinica_id", ctx.clinicaId)
        .eq("retorno_status", "pendente")
        .not("retorno_em", "is", null)
        .lte("retorno_em", ate.toISOString().slice(0, 10))
        .order("retorno_em");
      if (!data?.length) return `Nenhum retorno pendente nos próximos ${dias} dias em ${ctx.clinicaNome}.`;
      const hoje = new Date().toISOString().slice(0, 10);
      return [
        `Retornos de ${ctx.clinicaNome} (até ${dias} dias):`,
        ...data.map((p) => {
          const c = p.contacts as unknown as { name?: string } | null;
          return `- ${c?.name ?? "Paciente"}: ${p.nome}, retorno ${p.retorno_em}${p.retorno_em! < hoje ? " (ATRASADO)" : ""}`;
        }),
      ].join("\n");
    },
  },
  {
    name: "giro_30_dias",
    description: "Faz o giro de recuperação: orçamentos pendentes há 7 dias ou mais, retornos atrasados e conversas em que o paciente falou por último e ficou sem resposta. Use para montar as mensagens de retomada.",
    inputSchema: { type: "object", properties: {} },
    run: async (db, ctx) => {
      const seteDias = new Date(Date.now() - 7 * 86400000).toISOString();
      const trintaDias = new Date(Date.now() - 30 * 86400000).toISOString();
      const hoje = new Date().toISOString().slice(0, 10);
      const [orc, ret, convs] = await Promise.all([
        db.from("orcamentos").select("descricao, valor, enviado_em, contacts(name)").eq("clinica_id", ctx.clinicaId).eq("status", "pendente").lte("enviado_em", seteDias).gte("enviado_em", trintaDias),
        db.from("procedimentos_realizados").select("nome, retorno_em, contacts(name)").eq("clinica_id", ctx.clinicaId).eq("retorno_status", "pendente").lt("retorno_em", hoje),
        db.from("conversas").select("id, channel, contacts(name)").eq("clinica_id", ctx.clinicaId).eq("status", "aberta").gte("last_message_at", trintaDias),
      ]);
      const semResposta: string[] = [];
      for (const c of convs.data ?? []) {
        const { data: ult } = await db.from("mensagens").select("direction, created_at").eq("conversa_id", c.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
        if (ult?.direction === "recebida") semResposta.push(`- ${(c.contacts as unknown as { name?: string } | null)?.name ?? "Paciente"} (${c.channel}), última mensagem do paciente em ${ult.created_at.slice(0, 10)}`);
      }
      const nome = (x: unknown) => (x as { name?: string } | null)?.name ?? "Paciente";
      return [
        `Giro de 30 dias em ${ctx.clinicaNome}:`,
        `\nOrçamentos parados (${orc.data?.length ?? 0}):`,
        ...(orc.data ?? []).map((o) => `- ${nome(o.contacts)}: ${o.descricao} (${brl(Number(o.valor))}), enviado em ${o.enviado_em.slice(0, 10)}`),
        `\nRetornos atrasados (${ret.data?.length ?? 0}):`,
        ...(ret.data ?? []).map((r) => `- ${nome(r.contacts)}: ${r.nome}, retorno era ${r.retorno_em}`),
        `\nConversas sem resposta da clínica (${semResposta.length}):`,
        ...semResposta,
        `\nSugestão: para cada caso, escreva uma mensagem curta de retomada no tom de voz da clínica e peça aprovação antes de enviar.`,
      ].join("\n");
    },
  },
];

async function linhaMeta(db: SupabaseClient, ctx: ContextoMcp): Promise<string> {
  const inicio = new Date();
  inicio.setDate(1);
  inicio.setHours(0, 0, 0, 0);
  const [{ data: cfg }, { data: ganhos }] = await Promise.all([
    db.from("sistema_config").select("meta_mensal").eq("clinica_id", ctx.clinicaId).eq("id", "default").maybeSingle(),
    db.from("deals").select("value").eq("clinica_id", ctx.clinicaId).eq("status", "won").gte("updated_at", inicio.toISOString()),
  ]);
  const meta = Number(cfg?.meta_mensal ?? 0);
  if (!meta) return "- Meta do mês: não definida.";
  const faturado = (ganhos ?? []).reduce((s, d) => s + Number(d.value ?? 0), 0);
  const m = calcularMeta(meta, faturado, (ganhos ?? []).length);
  return `- Meta do mês: ${brl(m.faturado)} de ${brl(m.meta)} (${m.percentual.toFixed(0)}%). Falta ${brl(m.falta)}: ${brl(m.porDiaUtil)} por dia útil nos ${m.restantes} dias úteis restantes. Projeção: ${brl(m.projecao)}.`;
}
