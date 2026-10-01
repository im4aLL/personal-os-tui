// Turso HTTP v2 pipeline client. This module owns the active credentials in
// `currentConfig` (set during Setup, read by every Turso repository), the
// request/response mapping, and one retry on transient network or 5xx errors.
import type { TursoCredentials } from "./config.types";
import type { TursoArg, TursoColValue, TursoResult, TursoStatement } from "./turso.types";

let currentConfig: TursoCredentials | null = null;

export function setTursoConfig(config: TursoCredentials): void {
  currentConfig = { url: config.url, token: config.token };
}

export function clearTursoConfig(): void {
  currentConfig = null;
}

export function normalizeUrl(url: string): string {
  // The Turso HTTP API requires https://. libsql:// is the connection-string
  // scheme users see in the Turso dashboard.
  return url.replace(/^libsql:\/\//, "https://").replace(/\/+$/, "");
}

function getActiveConfig(): TursoCredentials {
  if (currentConfig === null) {
    throw new Error("Turso not configured");
  }
  return { url: normalizeUrl(currentConfig.url), token: currentConfig.token };
}

function toArg(value: unknown): TursoArg {
  if (value === null || value === undefined) {
    return { type: "null" };
  }
  if (typeof value === "number") {
    return { type: Number.isInteger(value) ? "integer" : "real", value: String(value) };
  }
  return { type: "text", value: String(value) };
}

function parseValue(value: TursoColValue): string | number | null {
  if (value === null || value.type === "null") {
    return null;
  }
  if (value.type === "integer") {
    return Number.parseInt(value.value ?? "0", 10);
  }
  if (value.type === "real") {
    return Number.parseFloat(value.value ?? "0");
  }
  return value.value ?? null;
}

function redactMessage(message: string): string {
  const config = currentConfig;
  if (config === null) {
    return message;
  }
  // Replace both the normalized https:// token and any libsql:// URL form that
  // might appear in error bodies.
  let result = message;
  if (config.token !== "") {
    result = result.replaceAll(config.token, "***");
  }
  if (config.url !== "") {
    result = result.replaceAll(config.url, "***");
    result = result.replaceAll(config.url.replace(/^https:\/\//, "libsql://"), "***");
  }
  return result;
}

interface PipelineRequest {
  type: "execute";
  stmt: { sql: string; args: TursoArg[] };
}

interface PipelineClose {
  type: "close";
}

type PipelineItem = PipelineRequest | PipelineClose;

interface PipelineError {
  type: "error";
  error: { message: string };
}

interface PipelineOk {
  type: "ok";
  response: { result: TursoResult };
}

type PipelineResult = PipelineOk | PipelineError;

interface PipelineResponse {
  results: PipelineResult[];
}

function isRetryable(status: number, error?: Error): boolean {
  if (error !== undefined) {
    return true;
  }
  return status === 429 || status >= 500;
}

/** Bounded per-attempt timeout for every Turso request. A hung request aborts
 * and throws a `timed out` error instead of leaving the skeleton or an
 * optimistic write in place forever. The timeout is deliberately not retried:
 * `pipeline` only retries transient network and 429/5xx failures. */
const REQUEST_TIMEOUT_MS = 15000;

async function postPipeline(
  url: string,
  token: string,
  items: PipelineItem[],
): Promise<PipelineResponse> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(`${url}/v2/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ requests: items }),
      signal: controller.signal,
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Turso HTTP ${response.status}: ${text || response.statusText}`);
    }
    return (await response.json()) as PipelineResponse;
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error(`Turso request timed out after ${REQUEST_TIMEOUT_MS}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

async function pipeline(items: PipelineItem[]): Promise<TursoResult[]> {
  const config = getActiveConfig();
  const executeCount = items.filter((item) => item.type === "execute").length;

  let lastError: Error | undefined;
  for (let attempt = 0; attempt <= 1; attempt++) {
    try {
      const data = await postPipeline(config.url, config.token, items);
      const results: TursoResult[] = [];
      for (let i = 0; i < data.results.length; i++) {
        const item = data.results[i];
        if (item === undefined) {
          continue;
        }
        if (item.type === "error") {
          const index = executeCount > 1 && i < executeCount ? i : undefined;
          throw new Error(formatStatementError(item.error.message, index));
        }
        results.push(item.response.result);
      }
      return results;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      const status = extractHttpStatus(lastError.message);
      if (attempt === 0 && isRetryable(status, error instanceof TypeError ? error : undefined)) {
        await sleep(300);
        continue;
      }
      break;
    }
  }

  const message = redactMessage(lastError?.message ?? "Turso request failed");
  throw new Error(message);
}

function formatStatementError(message: string, index?: number): string {
  if (index === undefined) {
    return message;
  }
  return `statement ${index + 1}: ${message}`;
}

function extractHttpStatus(message: string): number {
  const match = /Turso HTTP (\d+):/.exec(message);
  if (match === null) {
    return 0;
  }
  return Number.parseInt(match[1], 10);
}

export function classifyTursoError(error: unknown): {
  kind: "credentials" | "network" | "other";
  message: string;
} {
  const message = error instanceof Error ? error.message : String(error);
  const statusMatch = /Turso HTTP (\d{3}):/.exec(message);
  if (statusMatch !== null) {
    const status = Number.parseInt(statusMatch[1], 10);
    if (status === 401 || status === 403) {
      return {
        message: "Could not authenticate with Turso. Check your token.",
        kind: "credentials",
      };
    }
  }
  if (message.toLowerCase().includes("unauthorized")) {
    return { message: "Could not authenticate with Turso. Check your token.", kind: "credentials" };
  }
  const lower = message.toLowerCase();
  if (
    lower.includes("fetch failed") ||
    lower.includes("enotfound") ||
    lower.includes("econnrefused") ||
    lower.includes("certificate")
  ) {
    return {
      message: "Could not reach Turso. Check your network and database URL.",
      kind: "network",
    };
  }
  return { message, kind: "other" };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function buildItems(statements: TursoStatement[]): PipelineItem[] {
  return [
    ...statements.map((statement) => ({
      type: "execute" as const,
      stmt: { sql: statement.sql, args: (statement.args ?? []).map(toArg) },
    })),
    { type: "close" as const },
  ];
}

export async function tursoExecute(sql: string, args: unknown[] = []): Promise<void> {
  await pipeline(buildItems([{ sql, args }]));
}

/** Run a batch of statements in one `/v2/pipeline` request (N executes +
 * close). A failed statement throws with its index, so a bad position write is
 * attributable. An empty batch is a no-op.
 *
 * Caveat: the Turso v2 pipeline applies statements one at a time and is not
 * transactional, so a mid-batch failure leaves the earlier statements
 * committed. This is the same exposure the desktop has with sequential writes;
 * callers reload on error to reconcile. */
export async function tursoBatchExecute(statements: TursoStatement[]): Promise<void> {
  if (statements.length === 0) {
    return;
  }
  await pipeline(buildItems(statements));
}

export async function tursoSelect<T>(sql: string, args: unknown[] = []): Promise<T[]> {
  const results = await pipeline(buildItems([{ sql, args }]));
  const result = results[0];
  if (result === undefined) {
    return [];
  }
  return result.rows.map((row) => {
    const obj: Record<string, unknown> = {};
    for (let i = 0; i < result.cols.length; i++) {
      obj[result.cols[i].name] = parseValue(row[i]);
    }
    return obj as T;
  });
}
