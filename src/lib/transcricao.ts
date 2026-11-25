import { segredo } from "@/lib/integracoes/servidor";

// Transcreve áudio (mensagem de voz) para texto.
// 1º OpenAI Whisper (se tiver a chave), 2º Gemini (aceita áudio direto).

export async function transcrever(clinicaId: string, audio: ArrayBuffer, mime = "audio/ogg"): Promise<string | null> {
  const [openai, gemini] = await Promise.all([segredo(clinicaId, "ia", "openai_api_key"), segredo(clinicaId, "ia", "gemini_api_key")]);

  if (openai) {
    const form = new FormData();
    form.append("file", new Blob([audio], { type: mime }), mime.includes("ogg") ? "audio.ogg" : "audio.mp3");
    form.append("model", "whisper-1");
    form.append("language", "pt");
    const r = await fetch("https://api.openai.com/v1/audio/transcriptions", { method: "POST", headers: { Authorization: `Bearer ${openai}` }, body: form });
    if (r.ok) return ((await r.json()) as { text?: string }).text?.trim() || null;
  }

  if (gemini) {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(gemini)}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              { text: "Transcreva este áudio em português, exatamente como foi falado. Responda só com a transcrição." },
              { inline_data: { mime_type: mime, data: Buffer.from(audio).toString("base64") } },
            ],
          },
        ],
      }),
    });
    if (r.ok) {
      const d = (await r.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
      return d.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null;
    }
  }
  return null;
}
