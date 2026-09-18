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
  const url =
    env("SUPABASE_URL") ||
    env("SUPABASE_PROJECT_URL") ||
    env("VITE_SUPABASE_URL");

  const key =
    env("SUPABASE_SERVICE_ROLE_KEY") ||
    env("SERVICE_ROLE_KEY") ||
    env("SUPABASE_SERVICE_KEY");

  return { url: url.replace(/\/$/, ""), key };
}

async function supabaseRequest(path: string, init: RequestInit = {}) {
  const { url, key } = supabaseEnv();

  if (!url || !key) {
    throw new Error(
      "Supabase server belum dikonfigurasi. Pastikan SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY (atau SERVICE_ROLE_KEY) tersedia di server."
    );
  }

  const headers = new Headers(init.headers);
  headers.set("apikey", key);
  headers.set("Authorization", `Bearer ${key}`);
  headers.set("Content-Type", "application/json");
  headers.set("Accept", "application/json");
  headers.set("Content-Profile", "public");
  headers.set("Accept-Profile", "public");

  const response = await fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Supabase ${response.status}: ${detail || response.statusText}`);
  }

  return response;
}

async function fetchModels(baseUrl: string, apiKey: string) {
  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/models`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Router /models mengembalikan HTTP ${response.status}`);
  }

  const json = (await response.json()) as {
    data?: unknown[];
    models?: unknown[];
  };

  const raw = Array.isArray(json.data)
    ? json.data
    : Array.isArray(json.models)
      ? json.models
      : [];

  const models = raw
    .map((item) =>
      typeof item === "string"
        ? item
        : (item as { id?: unknown })?.id
    )
    .filter(
      (id): id is string =>
        typeof id === "string" && id.trim().length > 0
    );

  if (!models.length) {
    throw new Error("Router tidak mengembalikan model.");
  }

  return models;
}

async function readStoredConfig(): Promise<RouterConfig> {
  const response = await supabaseRequest(
    "ai_settings?select=base_url,model,allowed_models,updated_at&id=eq.1&limit=1"
  );

  const rows = (await response.json()) as Array<{
    base_url?: string;
    model?: string;
    allowed_models?: unknown;
    updated_at?: string;
  }>;

  const row = rows[0];

  if (!row) {
    return {
      configured: false,
      baseUrl: "",
      model: "",
      models: [],
      storageReady: true,
    };
  }

  return {
    configured: Boolean(row.base_url && row.model),
    baseUrl: row.base_url || "",
    model: row.model || "",
    models: Array.isArray(row.allowed_models)
      ? row.allowed_models.filter(
          (m): m is string => typeof m === "string"
        )
      : [],
    storageReady: true,
    updatedAt: row.updated_at,
  };
}

export const getAiConfig = createServerFn({ method: "GET" }).handler(
  async (): Promise<RouterConfig> => {
    const { url, key } = supabaseEnv();

    if (!url || !key) {
      return {
        configured: false,
        baseUrl: "",
        model: "",
        models: [],
        storageReady: false,
      };
    }

    try {
      return await readStoredConfig();
    } catch (error) {
      console.error("getAiConfig:", error);
      throw new Error(
        error instanceof Error
          ? error.message
          : "Konfigurasi online gagal dimuat dari Supabase."
      );
    }
  }
);

export const loadRouterModels = createServerFn({ method: "POST" })
  .validator((data: { baseUrl: string; apiKey: string }) => data)
  .handler(async ({ data }) => {
    const baseUrl = data.baseUrl.trim();
    const apiKey = data.apiKey.trim();

    if (!baseUrl || !apiKey) {
      throw new Error("Base URL dan API Key wajib diisi.");
    }

    return { models: await fetchModels(baseUrl, apiKey) };
  });

export const saveAiConfig = createServerFn({ method: "POST" })
  .validator((data: SaveInput) => data)
  .handler(async ({ data }) => {
    const baseUrl = data.baseUrl.trim().replace(/\/$/, "");

    if (!baseUrl) {
      throw new Error("Base URL wajib diisi.");
    }

    const existing = await supabaseRequest(
      "ai_settings?select=id,api_key,model&id=eq.1&limit=1"
    );
    const existingRows = (await existing.json()) as Array<{
      id?: number;
      api_key?: string;
      model?: string;
    }>;

    const previousKey = existingRows[0]?.api_key?.trim() || "";
    const apiKey = data.apiKey?.trim() || previousKey;

    if (!apiKey) {
      throw new Error("API Key wajib diisi pada perangkat pertama.");
    }

    const models = await fetchModels(baseUrl, apiKey);
    const requestedModel = data.model?.trim() || "";
    const model =
      requestedModel && models.includes(requestedModel)
        ? requestedModel
        : models[0];

    const payload = {
      id: 1,
      base_url: baseUrl,
      api_key: apiKey,
      model,
      allowed_models: models,
      updated_at: new Date().toISOString(),
    };

    if (existingRows.length > 0) {
      await supabaseRequest("ai_settings?id=eq.1", {
        method: "PATCH",
        headers: {
          Prefer: "return=minimal",
        },
        body: JSON.stringify(payload),
      });
    } else {
      await supabaseRequest("ai_settings", {
        method: "POST",
        headers: {
          Prefer: "return=minimal",
        },
        body: JSON.stringify(payload),
      });
    }

    // Jangan menganggap berhasil hanya karena request tulis sukses.
    // Baca kembali baris dari database dan kembalikan data yang benar-benar tersimpan.
    const persisted = await readStoredConfig();

    if (!persisted.configured) {
      throw new Error(
        "Konfigurasi belum terbaca kembali dari Supabase setelah disimpan."
      );
    }

    return persisted;
  });

export const testOnlineStorage = createServerFn({ method: "GET" }).handler(
  async () => {
    const { url, key } = supabaseEnv();

    if (!url || !key) {
      return {
        ok: false,
        message:
          "Supabase server belum dikonfigurasi. Pastikan variabel server tersedia.",
      };
    }

    try {
      await supabaseRequest("ai_settings?select=id&limit=1");
      return {
        ok: true,
        message: "Penyimpanan online aktif.",
      };
    } catch (error) {
      console.error("testOnlineStorage:", error);
      return {
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : "Supabase belum siap.",
      };
    }
  }
);
