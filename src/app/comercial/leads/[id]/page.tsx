"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import LeadDetailPage from "@/components/LeadDetailPage";

type Props = React.ComponentProps<typeof LeadDetailPage>;

export default function Page() {
  const { id } = useParams<{ id: string }>();
  const [dados, setDados] = useState<Props | null>(null);
  const [naoAchou, setNaoAchou] = useState(false);

  useEffect(() => {
    (async () => {
      const [{ data: contact }, { data: stages }, { data: deals }, { data: activities }, { data: tasks }] = await Promise.all([
        supabase.from("contacts").select("*").eq("id", id).maybeSingle(),
        supabase.from("pipeline_stages").select("id, name, position").order("position"),
        supabase.from("deals").select("id, title, value, stage_id, status, created_at").eq("contact_id", id).order("created_at", { ascending: false }),
        supabase.from("activities").select("id, type, description, created_at").eq("contact_id", id).order("created_at", { ascending: false }),
        supabase.from("tasks").select("id, title, due_date, done").eq("contact_id", id).order("due_date"),
      ]);
      if (!contact) return setNaoAchou(true);
      setDados({
        contact,
        stages: stages ?? [],
        deals: deals ?? [],
        activities: activities ?? [],
        tasks: tasks ?? [],
      } as Props);
    })();
  }, [id]);

  if (naoAchou) return <div className="mx-8 pt-8 text-muted text-sm">Paciente não encontrado nesta clínica.</div>;
  if (!dados) return <div className="mx-8 pt-8 text-muted text-sm">Carregando…</div>;
  return <LeadDetailPage {...dados} />;
}
