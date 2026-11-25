export const TOOL_CATALOG = [
  { key: "buscar_nota", label: "buscar_nota", desc: "Busca semântica nas notas (RAG). Use quando NÃO souber título exato." },
  { key: "check_availability", label: "check_availability", desc: "Lista próximos slots livres." },
  { key: "confirm_meeting", label: "confirm_meeting", desc: "Marca reunião/consulta como confirmada." },
  { key: "current_time_br", label: "current_time_br", desc: "Retorna data e hora atual no fuso de Brasília." },
  { key: "listar_notas", label: "listar_notas", desc: "Lista notas do agente com preview. Filtra por tag ou busca textual." },
  { key: "notify_human", label: "notify_human", desc: "Pede ajuda do humano e pausa o agente. Use quando não conseguir resolver." },
  { key: "reschedule_meeting", label: "reschedule_meeting", desc: "Atualiza data/hora de uma reunião/consulta." },
  { key: "salvar_nota", label: "salvar_nota", desc: "Cria ou atualiza nota do agente (overwrite/append/nova versão)." },
  { key: "schedule_meeting", label: "schedule_meeting", desc: "Cria reunião/consulta + atividade no CRM." },
  { key: "update_lead", label: "update_lead", desc: "Atualiza campos do contato (whitelist)." },
] as const;

export type ToolPolicy = "sempre" | "aprovacao" | "desativada";
