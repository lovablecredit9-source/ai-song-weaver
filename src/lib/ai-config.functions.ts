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

// Supabase publishable/anon key memang aman untuk berada di client.
// Service-role key TIDAK pernah dimasukkan ke frontend; Edge Function yang menyimpan data.
const SUPABASE_FUNCTION_URL =
  "https://ochqpzpsfqytemrgsdir.supabase.co/functions/v1/ai-router-config";

const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9jaHFwenBzZnF5dGVtcmdzZGlyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkxNjAxMDIsImV4cCI6MjEwNDczNjEwMn0.anRItCJpJtI9dta-A9KfGp9tEvjQB1wmGMNP1AGFVAA";

async function callConfig<T>(
  action: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${SUPABASE_ANON_KEY}`);
  headers.set("apikey", SUPABASE_ANON_KEY);
  headers.set("Accept", "application/json");
  if (init.body) headers.set("Content-Type", "application/json");

  const response = await fetch(
    `${SUPABASE_FUNCTION_URL}?action=${encodeURIComponent(action)}`,
    {
      ...init,
      headers,
      cache: "no-store",
    },
  );

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      typeof body?.error === "string"
        ? body.error
        : `Server Supabase HTTP ${response.status}`,
    );
  }

  return body as T;
}

export async function getAiConfig(): Promise<RouterConfig> {
  return callConfig<RouterConfig>("get");
}

export async function loadRouterModels(data: {
  baseUrl: string;
  apiKey: string;
}) {
  return callConfig<{ models: string[] }>("models", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function saveAiConfig(data: SaveInput): Promise<RouterConfig> {
  return callConfig<RouterConfig>("save", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function testOnlineStorage(): Promise<{
  ok: boolean;
  message: string;
}> {
  try {
    return await callConfig<{ ok: boolean; message: string }>("test");
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Penyimpanan online gagal dihubungi.",
    };
  }
}
