"use client";

// Carrega no navegador, com a sessão de quem está logado: a proteção por linha
// do banco só devolve os dados da clínica dessa pessoa.

import { useEffect, useState } from "react";
import DashboardTabs from "@/components/DashboardTabs";
import MetaDoMes from "@/components/MetaDoMes";
import { supabase } from "@/lib/supabase";

async function getData() {
  const [{ count: contactsCount }, { data: stagesRaw }, { data: dealsRaw }] = await Promise.all([
    supabase.from("contacts").select("*", { count: "exact", head: true }),
    supabase.from("pipeline_stages").select("id, name, position").order("position"),
    supabase.from("deals").select("id, value, stage_id, status"),
  ]);

  const stagesData = stagesRaw ?? [];
  const deals = dealsRaw ?? [];

  const stages = stagesData.map((s) => {
    const stageDeals = deals.filter((d) => d.stage_id === s.id);
    return {
      id: s.id,
      name: s.name,
      position: s.position,
      count: stageDeals.length,
      value: stageDeals.reduce((sum, d) => sum + (d.value ?? 0), 0),
    };
  });

  const ganhoStage = stages.find((s) => s.name === "Ganho");
  const perdidoStage = stages.find((s) => s.name === "Perdido");
  const openDeals = deals.filter((d) => d.stage_id !== ganhoStage?.id && d.stage_id !== perdidoStage?.id);
  const openValue = openDeals.reduce((sum, d) => sum + (d.value ?? 0), 0);
  const ganhoCount = ganhoStage?.count ?? 0;
  const ganhoValue = ganhoStage?.value ?? 0;
  const ticketMedio = ganhoCount > 0 ? ganhoValue / ganhoCount : 0;

  return {
    contactsCount: contactsCount ?? 0,
    stages,
    openCount: openDeals.length,
    openValue,
    ganhoCount,
    ganhoValue,
    perdidoCount: perdidoStage?.count ?? 0,
    ticketMedio,
  };
}

type Dados = Awaited<ReturnType<typeof getData>>;

export default function DashboardPage() {
  const [data, setData] = useState<Dados | null>(null);
  useEffect(() => {
    getData().then(setData);
  }, []);
  if (!data) return <div className="mx-8 pt-8 text-muted text-sm">Carregando…</div>;
  return (
    <>
      <MetaDoMes />
      <DashboardTabs {...data} />
    </>
  );
}
