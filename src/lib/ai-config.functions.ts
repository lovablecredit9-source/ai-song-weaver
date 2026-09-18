import { createServerFn } from "@tanstack/react-start";

type RouterConfig = {
  configured: boolean;
  baseUrl: string;
  model: string;
  models: string[];
  storageReady: boolean;
  updatedAt?: string;
};

type SaveInput = {
  baseUrl: string;
  apiKey?: string;
  model?: string;
};

function env(name: string) {
  return process.env[name]?.trim() || "";
}

function supabaseEnv() {
  const url = env("SUPABASE_URL");
  const key =
    env("SUPABASE_SERVICE_ROLE_KEY") ||
    env("SERVICE_ROLE_KEY") ||
    env("SUPABASE_SERVICE_KEY");
  return { url: url.replace(/\/$/, ""), key };
}

async function supabaseRequest(path: string, init: RequestInit = {}) {
  const { url, key } = supabaseEnv();
  if (!url || !key) throw new Error("Supabase server belum dikonfigurasi.");
  const headers = new Headers(init.headers);
  headers.set("apikey", key);
  headers.set("Authorization", `Bearer ${key}`);
  headers.set("Content-Type", "application/json");
  const response = await fetch(`${url}/rest/v1/${path}`, { ...init, headers });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Supabase ${response.status}: ${detail || response.statusText}`);
  }
  return response;
}

async function fetchModels(baseUrl: string, apiKey: string) {
  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/models`, {
    headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
  });
  if (!response.ok) throw new Error(`Router /models mengembalikan HTTP ${response.status}`);
  const json = (await response.json()) as { data?: unknown[]; models?: unknown[] };
  const raw = Array.isArray(json.data) ? json.data : Array.isArray(json.models) ? json.models : [];
  const models = raw
    .map((item) => typeof item === "string" ? item : (item as { id?: unknown })?.id)
    .filter((id): id is string => typeof id === "string" && id.length > 0);
  if (!models.length) throw new Error("Router tidak mengembalikan model.");
  return models;
}

export const getAiConfig = createServerFn({ method: "GET" }).handler(async (): Promise<RouterConfig> => {
  const { url, key } = supabaseEnv();
  if (!url || !key) {
    return { configured: false, baseUrl: "", model: "", models: [], storageReady: false };
  }

  try {
    const response = await supabaseRequest("ai_router_config?select=base_url,model,allowed_models,updated_at&id=eq.1&limit=1");
    const rows = (await response.json()) as Array<{
      base_url?: string;
      model?: string;
      models?: unknown;
      updated_at?: string;
    }>;
    const row = rows[0];
    if (!row) return { configured: false, baseUrl: "", model: "", models: [], storageReady: true };
    return {
      configured: Boolean(row.base_url && row.model),
      baseUrl: row.base_url || "",
      model: row.model || "",
      models: Array.isArray(row.models) ? row.models.filter((m): m is string => typeof m === "string") : [],
      storageReady: true,
      updatedAt: row.updated_at,
    };
  } catch (error) {
    console.error(error);
    return { configured: false, baseUrl: "", model: "", models: [], storageReady: false };
  }
});

export const loadRouterModels = createServerFn({ method: "POST" })
  .validator((data: { baseUrl: string; apiKey: string }) => data)
  .handler(async ({ data }) => {
    const baseUrl = data.baseUrl.trim();
    const apiKey = data.apiKey.trim();
    if (!baseUrl || !apiKey) throw new Error("Base URL dan API Key wajib diisi.");
    return { models: await fetchModels(baseUrl, apiKey) };
  });

export const saveAiConfig = createServerFn({ method: "POST" })
  .validator((data: SaveInput) => data)
  .handler(async ({ data }) => {
    const baseUrl = data.baseUrl.trim().replace(/\/$/, "");
    if (!baseUrl) throw new Error("Base URL wajib diisi.");

    const existing = await supabaseRequest("ai_router_config?select=api_key,model&id=eq.1&limit=1");
    const existingRows = (await existing.json()) as Array<{ api_key?: string; model?: string }>;
    const previousKey = existingRows[0]?.api_key?.trim() || "";
    const apiKey = data.apiKey?.trim() || previousKey;
    if (!apiKey) throw new Error("API Key wajib diisi pada perangkat pertama.");

    const models = await fetchModels(baseUrl, apiKey);
    const model = data.model?.trim() && models.includes(data.model.trim()) ? data.model.trim() : models[0];

    await supabaseRequest("ai_router_config?on_conflict=id", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify({
        id: 1,
        base_url: baseUrl,
        api_key: apiKey,
        model,
        allowed_models: models,
        updated_at: new Date().toISOString(),
      }),
    });

    return {
      configured: true,
      baseUrl,
      model,
      models,
      storageReady: true,
    } satisfies RouterConfig;
  });

export const testOnlineStorage = createServerFn({ method: "GET" }).handler(async () => {
  const { url, key } = supabaseEnv();
  if (!url || !key) return { ok: false, message: "Supabase server belum dikonfigurasi." };
  try {
    await supabaseRequest("ai_router_config?select=id&limit=1");
    return { ok: true, message: "Penyimpanan online aktif." };
  } catch (error) {
    console.error(error);
    return { ok: false, message: "Supabase belum siap. Pastikan tabel ai_router_config sudah dibuat." };
  }
});
