"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

// Últimas mensagens do paciente (WhatsApp/Instagram), para ver como está o pós-venda sem abrir o Inbox.

type Msg = { id: string; direction: "enviada" | "recebida"; body: string; created_at: string };

export default function UltimasMensagens({ contactId, limite = 3 }: { contactId: string | null; limite?: number }) {
  const [msgs, setMsgs] = useState<Msg[] | null>(null);

  useEffect(() => {
    if (!contactId) return setMsgs([]);
    (async () => {
      const { data: convs } = await supabase.from("conversas").select("id").eq("contact_id", contactId);
      const ids = (convs ?? []).map((c) => c.id);
      if (!ids.length) return setMsgs([]);
      const { data } = await supabase
        .from("mensagens")
        .select("id, direction, body, created_at")
        .in("conversa_id", ids)
        .order("created_at", { ascending: false })
        .limit(limite);
      setMsgs(((data as Msg[]) ?? []).reverse());
    })();
  }, [contactId, limite]);

  if (!msgs) return null;
  if (!msgs.length) return <p className="text-[11px] text-muted mt-2 pl-12">Nenhuma mensagem trocada ainda.</p>;

  return (
    <div className="mt-3 pl-12 space-y-1.5">
      {msgs.map((m) => (
        <div key={m.id} className={`flex ${m.direction === "enviada" ? "justify-end" : "justify-start"}`}>
          <div className={`max-w-[75%] rounded-xl px-3 py-1.5 text-xs ${m.direction === "enviada" ? "bg-accent/15 text-white" : "bg-panelmuted text-white"}`}>
            <span className="block text-[10px] text-muted mb-0.5">
              {m.direction === "enviada" ? "Clínica" : "Paciente"} · {new Date(m.created_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
            </span>
            {m.body}
          </div>
        </div>
      ))}
      {contactId && (
        <Link href={`/comercial/leads/${contactId}`} className="block text-right text-[11px] text-accent">
          Abrir ficha do paciente
        </Link>
      )}
    </div>
  );
}
