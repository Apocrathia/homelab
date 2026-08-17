/**
 * Registers the LiteLLM gateway as a model provider, discovering the model
 * catalog from the gateway at startup instead of keeping a local copy.
 *
 * Authentication:
 *   Run /login and select "LiteLLM Gateway". Prime Agent stores the virtual
 *   key in ~/.prime/agent/auth.json with mode 0600.
 *
 * Optional configuration:
 *   LITELLM_BASE_URL  OpenAI-compatible base URL, including /v1
 *
 * Run /litellm-refresh to re-read the catalog without restarting.
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

const PROVIDER = "litellm";
const DEFAULT_BASE_URL = "https://ai.gateway.services.apocrathia.com/v1";
const FETCH_TIMEOUT_MS = 5000;
const DEFAULT_CONTEXT_WINDOW = 1_000_000;
const DEFAULT_MAX_TOKENS = 16384;

/** Modes LiteLLM reports for endpoints that are not chat completions. */
const CHAT_MODES = new Set(["chat", "completion"]);
const LOGIN_MODEL_ID = "login-required";
const DEFAULT_MODEL_ID = "qwen3.8-prime";

type ModelDefinition = {
  id: string;
  name: string;
  reasoning: boolean;
  input: ("text" | "image")[];
  cost: {
    input: number;
    output: number;
    cacheRead: number;
    cacheWrite: number;
  };
  contextWindow: number;
  maxTokens: number;
  compat: { supportsDeveloperRole: boolean; supportsReasoningEffort: boolean };
};

type LiteLlmModelInfo = {
  mode?: string | null;
  supports_vision?: boolean | null;
  supports_reasoning?: boolean | null;
  input_cost_per_token?: number | null;
  output_cost_per_token?: number | null;
  cache_read_input_token_cost?: number | null;
  cache_creation_input_token_cost?: number | null;
};

function baseUrl(): string {
  return (process.env.LITELLM_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, "");
}

function agentDir(): string {
  const envDir =
    process.env.PRIME_AGENT_CODING_AGENT_DIR || process.env.PI_CODING_AGENT_DIR;
  if (envDir) {
    return envDir.startsWith("~") ? join(homedir(), envDir.slice(1)) : envDir;
  }
  return join(homedir(), ".prime", "agent");
}

/** Derived catalog only; gateway credentials are never persisted here. */
function cachePath(): string {
  return join(agentDir(), "cache", "litellm-models.json");
}

function authPath(): string {
  return join(agentDir(), "auth.json");
}

/**
 * Read the credential written by Prime Agent's /login flow. The key stays in
 * auth.json; it is used only as the Authorization header for catalog discovery.
 */
function readApiKey(): string | undefined {
  try {
    const credential = JSON.parse(readFileSync(authPath(), "utf8"))?.[PROVIDER];
    return credential?.type === "api_key" &&
      typeof credential.key === "string" &&
      credential.key
      ? credential.key
      : undefined;
  } catch {
    return undefined;
  }
}

function isOffline(): boolean {
  return (
    process.env.PI_OFFLINE === "1" || process.env.PRIME_AGENT_OFFLINE === "1"
  );
}

/** LiteLLM reports per-token costs; Prime Agent expects cost per million tokens. */
function perMillion(costPerToken: number | null | undefined): number {
  return typeof costPerToken === "number" && Number.isFinite(costPerToken)
    ? costPerToken * 1_000_000
    : 0;
}

function toModelDefinition(
  id: string,
  info: LiteLlmModelInfo | undefined,
): ModelDefinition {
  const reasoning = info?.supports_reasoning === true;

  return {
    id,
    name: id,
    reasoning,
    input: info?.supports_vision === true ? ["text", "image"] : ["text"],
    cost: {
      input: perMillion(info?.input_cost_per_token),
      output: perMillion(info?.output_cost_per_token),
      cacheRead: perMillion(info?.cache_read_input_token_cost),
      cacheWrite: perMillion(info?.cache_creation_input_token_cost),
    },
    contextWindow: DEFAULT_CONTEXT_WINDOW,
    maxTokens: DEFAULT_MAX_TOKENS,
    // The gateway fans out to backends (Ollama, vLLM) that reject the
    // `developer` role, and reasoning_effort only applies to reasoning models.
    compat: {
      supportsDeveloperRole: false,
      supportsReasoningEffort: reasoning,
    },
  };
}

async function getJson(path: string, apiKey: string): Promise<any> {
  const response = await fetch(`${baseUrl()}${path}`, {
    headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new Error(`${path} returned ${response.status}`);
  }
  return await response.json();
}

/** Rich catalog: capabilities and pricing per deployed model. */
async function fetchFromModelInfo(apiKey: string): Promise<ModelDefinition[]> {
  const payload = await getJson("/model/info", apiKey);
  const entries: Array<{ model_name?: string; model_info?: LiteLlmModelInfo }> =
    payload?.data ?? [];

  return entries
    .filter((entry) => {
      const mode = entry.model_info?.mode;
      return Boolean(entry.model_name) && (!mode || CHAT_MODES.has(mode));
    })
    .map((entry) =>
      toModelDefinition(entry.model_name as string, entry.model_info),
    );
}

/** Fallback for gateways that expose only the OpenAI model listing. */
async function fetchFromModels(apiKey: string): Promise<ModelDefinition[]> {
  const payload = await getJson("/models", apiKey);
  const entries: Array<{ id?: string }> = payload?.data ?? [];
  return entries
    .filter((entry) => Boolean(entry.id))
    .map((entry) => toModelDefinition(entry.id as string, undefined));
}

function readCache(): ModelDefinition[] {
  try {
    const cached = JSON.parse(readFileSync(cachePath(), "utf8"));
    return Array.isArray(cached?.models) ? cached.models : [];
  } catch {
    return [];
  }
}

function writeCache(models: ModelDefinition[]): void {
  try {
    mkdirSync(dirname(cachePath()), { recursive: true });
    writeFileSync(
      cachePath(),
      `${JSON.stringify(
        { fetchedAt: new Date().toISOString(), models },
        null,
        2,
      )}\n`,
      {
        mode: 0o600,
      },
    );
  } catch {
    // A cache write failure must not prevent the provider from registering.
  }
}

type DiscoveryResult = { models: ModelDefinition[]; source: string };

async function discoverModels(): Promise<DiscoveryResult> {
  const apiKey = readApiKey();
  if (!apiKey) {
    return { models: readCache(), source: "not logged in; using cache" };
  }
  if (isOffline()) {
    return { models: readCache(), source: "offline; using cache" };
  }

  try {
    const models = await fetchFromModelInfo(apiKey);
    if (models.length > 0) {
      writeCache(models);
      return { models, source: "gateway /model/info" };
    }
  } catch {
    // Fall through to the plain model listing.
  }

  try {
    const models = await fetchFromModels(apiKey);
    if (models.length > 0) {
      writeCache(models);
      return { models, source: "gateway /models" };
    }
  } catch {
    // Fall through to the cache.
  }

  return { models: readCache(), source: "gateway unreachable; using cache" };
}

export default async function (pi: ExtensionAPI) {
  const register = (models: ModelDefinition[]) => {
    // Prime Agent builds its API-key /login menu from registered model
    // providers. Keep one temporary entry only until the first login.
    const registeredModels =
      models.length > 0
        ? models
        : [
            {
              ...toModelDefinition(LOGIN_MODEL_ID, undefined),
              name: "Run /login, then /litellm-refresh",
            },
          ];

    pi.registerProvider(PROVIDER, {
      name: "LiteLLM Gateway",
      baseUrl: baseUrl(),
      // Stored auth.json credentials take precedence. This unresolved env
      // name merely satisfies provider validation before the first /login.
      apiKey: "LITELLM_API_KEY",
      api: "openai-completions",
      models: registeredModels.sort((a, b) => a.id.localeCompare(b.id)),
    });
  };

  const initial = await discoverModels();
  register(initial.models);

  pi.registerCommand("litellm-refresh", {
    description: "Re-read the model catalog from the LiteLLM gateway",
    handler: async (_args, ctx) => {
      const result = await discoverModels();
      register(result.models);

      // The placeholder stays selected once chosen, so move off it now that
      // real models exist.
      if (result.models.length > 0 && ctx.model?.id === LOGIN_MODEL_ID) {
        const preferred =
          ctx.modelRegistry.find(PROVIDER, DEFAULT_MODEL_ID) ??
          ctx.modelRegistry.find(PROVIDER, result.models[0].id);
        if (preferred) {
          await pi.setModel(preferred);
        }
      }

      ctx.ui.notify(
        `LiteLLM: ${result.models.length} models (${result.source})`,
        result.models.length > 0 ? "success" : "error",
      );
    },
  });
}
