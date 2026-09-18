import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const sectionSchema = z.object({
  section: z.string(),
  notation: z.string(),
  confidence: z.number(),
});

const inputSchema = z.object({
  fileName: z.string(),
  duration: z.number(),
  bpm: z.number(),
  key: z.string(),
  timeSignature: z.string(),
  rangeLow: z.string(),
  rangeHigh: z.string(),
  confidence: z.number(),
  sections: z.array(sectionSchema).max(24),
});

export type RefinedSong = {
  song_info: { title: string; duration: number; bpm: number; key: string; time_signature: string };
  number_notation: { section: string; notation: string; confidence: number }[];
  warnings: string[];
  aiUsed: boolean;
};

export const refineNotation = createServerFn({ method: "POST" })
  .inputValidator((data) => inputSchema.parse(data))
  .handler(async ({ data }): Promise<RefinedSong> => {
    const fallback: RefinedSong = {
      song_info: {
        title: data.fileName.replace(/\.[^.]+$/, ""),
        duration: data.duration,
        bpm: data.bpm,
        key: data.key,
        time_signature: data.timeSignature,
      },
      number_notation: data.sections,
      warnings: [],
      aiUsed: false,
    };

    if (!data.sections.length) return fallback;

    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: row } = await supabaseAdmin
        .from("ai_router_config")
        .select("*")
        .eq("id", "default")
        .maybeSingle();
      const cfg = row as any;
      if (!cfg?.base_url || !cfg?.api_key || !cfg?.model) {
        return { ...fallback, warnings: ["Konfigurasi AI belum lengkap, hasil ditampilkan apa adanya."] };
      }

      const prompt = [
        "Kamu adalah asisten musik. Kamu HANYA boleh merapikan data hasil analisis audio berikut.",
        "DILARANG mengarang atau mengubah angka not. Kamu hanya boleh:",
        "1) memberi nama bagian (Intro, Verse, Pre-Chorus, Chorus, Bridge, Outro) berdasarkan urutan & pengulangan pola,",
        "2) merapikan spasi/pemisah birama '|' tanpa menambah atau menghapus not,",
        "3) menulis peringatan bila ada bagian dengan confidence rendah.",
        "Balas HANYA JSON valid dengan bentuk:",
        '{"number_notation":[{"section":"","notation":"","confidence":0}],"warnings":[]}',
        "",
        `Nada dasar: ${data.key}. BPM: ${data.bpm}. Birama: ${data.timeSignature}. Keyakinan global: ${data.confidence}%.`,
        `Data: ${JSON.stringify(data.sections)}`,
      ].join("\n");

      const response = await fetch(`${String(cfg.base_url).replace(/\/+$/, "")}/chat/completions`, {
        method: "POST",
        headers: { Authorization: `Bearer ${cfg.api_key}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: cfg.model,
          messages: [{ role: "user", content: prompt }],
          temperature: 0.1,
        }),
      });
      if (!response.ok) {
        return { ...fallback, warnings: [`AI tidak dapat dihubungi (HTTP ${response.status}); hasil dari analisis audio tetap ditampilkan.`] };
      }
      const body: any = await response.json();
      const text: string = body?.choices?.[0]?.message?.content ?? "";
      const match = text.match(/\{[\s\S]*\}/);
      if (!match) return { ...fallback, warnings: ["Jawaban AI tidak terbaca; hasil analisis audio tetap ditampilkan."] };
      const parsed = JSON.parse(match[0]);
      const validated = z
        .object({ number_notation: z.array(sectionSchema).min(1), warnings: z.array(z.string()).optional() })
        .safeParse(parsed);
      if (!validated.success) return { ...fallback, warnings: ["Struktur jawaban AI tidak valid; hasil analisis audio dipakai."] };

      // Jaga jumlah bagian tetap sama dengan hasil analisis audio.
      const sections = validated.data.number_notation.slice(0, data.sections.length).map((s, i) => ({
        section: s.section || data.sections[i]!.section,
        notation: data.sections[i]!.notation, // not angka selalu dari analisis audio
        confidence: data.sections[i]!.confidence,
      }));

      return {
        ...fallback,
        number_notation: sections,
        warnings: validated.data.warnings ?? [],
        aiUsed: true,
      };
    } catch (error) {
      console.error("refineNotation", error);
      return { ...fallback, warnings: ["Penamaan bagian oleh AI gagal; hasil analisis audio tetap ditampilkan."] };
    }
  });
