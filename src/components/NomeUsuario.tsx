"use client";

// Nome de quem está logado (do cadastro), no lugar de nome fixo.
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function NomeUsuario() {
  const [nome, setNome] = useState("");
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const u = data.user;
      setNome((u?.user_metadata?.nome as string) || u?.email?.split("@")[0] || "Você");
    });
  }, []);
  return <>{nome}</>;
}
