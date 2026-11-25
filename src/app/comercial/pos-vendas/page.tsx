"use client";

import { useEffect, useState } from "react";
import PosVendasPage from "@/components/PosVendasPage";
import { supabase } from "@/lib/supabase";

type Linha = {
  id: string;
  contact_id: string;
  procedimento: string | null;
  data_procedimento: string;
  dias_recuperacao: number;
  ultimo_checkin_at: string | null;
  follow_ups_realizados: number;
  satisfacao: "nao_avaliado" | "insatisfeito" | "neutro" | "satisfeito";
  status: "em_recuperacao" | "recuperado" | "enviado_pipeline";
  observacoes: string | null;
  contacts: { name: string } | null;
};

export default function Page() {
  const [initial, setInitial] = useState<(Linha & { paciente_nome: string })[] | null>(null);

  useEffect(() => {
    supabase
      .from("pos_venda")
      .select(
        "id, contact_id, procedimento, data_procedimento, dias_recuperacao, ultimo_checkin_at, follow_ups_realizados, satisfacao, status, observacoes, contacts(name)"
      )
      .order("data_procedimento", { ascending: false })
      .then(({ data }) => {
        setInitial(((data as unknown as Linha[]) ?? []).map((d) => ({ ...d, paciente_nome: d.contacts?.name ?? "—" })));
      });
  }, []);

  if (!initial) return <div className="mx-8 pt-8 text-muted text-sm">Carregando…</div>;
  return <PosVendasPage initial={initial} />;
}
