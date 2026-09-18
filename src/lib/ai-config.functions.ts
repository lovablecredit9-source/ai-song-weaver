import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

type RouterConfig = {
  configured: boolean;
  baseUrl: string;
  model: string;
  models: string[];
  storageReady: boolean;
  updatedAt?: string;
};

const ROW_ID = "default";

async function getAdmin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

function toConfig(row: any | null, storageReady: boolean): RouterConfig {
  if (!row) {
    return { configured: false, baseUrl: "", model: "", models: [], storageReady };
  }
  return {
    configured: Boolean(row.base_url && row.api_key),
    baseUrl: row.base_url ?? "",
    model: row.model ?? "",
    models: Array.isArray(row.models) ? (row.models as string[]) : [],
    storageReady,
    updatedAt: row.updated_at ?? undefined,
  };
}

function normalizeBaseUrl(url: string) {
  return url.trim().replace(/\/+$/, "");
}

async function fetchModels(baseUrl: string, apiKey: string) {
  const response = await fetch(`${normalizeBaseUrl(baseUrl)}/models`, {
    headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
  });
  const body: any = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body?.error?.message || `API router menolak permintaan (HTTP ${response.status}).`);
  }
  const list: string[] = (body?.data ?? body?.models ?? [])
    .map((item: any) => (typeof item === "string" ? item : item?.id))
    .filter((id: unknown): id is string => typeof id === "string" && id.length > 0);
  if (!list.length) throw new Error("Daftar model kosong dari API router.");
  return list.sort();
}

export const getAiConfig = createServerFn({ method: "GET" }).handler(async (): Promise<RouterConfig> => {
  try {
    const supabaseAdmin = await getAdmin();
    const { data, error } = await supabaseAdmin
      .from("ai_router_config")
      .select("*")
      .eq("id", ROW_ID)
      .maybeSingle();
    if (error) throw error;
    return toConfig(data, true);
  } catch (error) {
    console.error("getAiConfig", error);
    return { configured: false, baseUrl: "", model: "", models: [], storageReady: false };
  }
});

export const loadRouterModels = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({ baseUrl: z.string().min(1), apiKey: z.string().min(1) }).parse(data))
  .handler(async ({ data }) => {
    const models = await fetchModels(data.baseUrl, data.apiKey);
    return { models };
  });

export const saveAiConfig = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z
      .object({
        baseUrl: z.string().min(1),
        apiKey: z.string().optional(),
        model: z.string().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data }): Promise<RouterConfig> => {
    const supabaseAdmin = await getAdmin();
    const { data: existing } = await supabaseAdmin
      .from("ai_router_config")
      .select("*")
      .eq("id", ROW_ID)
      .maybeSingle();

    const baseUrl = normalizeBaseUrl(data.baseUrl);
    const apiKey = data.apiKey?.trim() || (existing as any)?.api_key || null;
    if (!apiKey) throw new Error("API Key wajib diisi untuk menghubungkan AI Router.");

    // Uji koneksi sebelum menyimpan.
    const models = await fetchModels(baseUrl, apiKey);
    const model = data.model && models.includes(data.model) ? data.model : (models[0] ?? "");

    const { data: saved, error } = await supabaseAdmin
      .from("ai_router_config")
      .upsert({
        id: ROW_ID,
        base_url: baseUrl,
        api_key: apiKey,
        model,
        models,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return toConfig(saved, true);
  });

export const testOnlineStorage = createServerFn({ method: "POST" }).handler(async () => {
  try {
    const supabaseAdmin = await getAdmin();
    const { error } = await supabaseAdmin.from("ai_router_config").select("id").limit(1);
    if (error) throw new Error(error.message);
    return { ok: true, message: "Penyimpanan online aktif." };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Penyimpanan online gagal dihubungi.",
    };
  }
});
