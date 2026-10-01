// Real SetupRepo: validate credentials with SELECT 1, then apply REMOTE_SCHEMAS
// idempotently. Credentials are held in the temporary transport config; they
// are persisted to disk only by the caller after success. applySchema and
// getProfile rely on currentConfig set by a successful testConnection; the
// caller owns clearing it on failure.

import { applyRemoteSchema } from "../../lib/schema";
import {
  classifyTursoError,
  clearTursoConfig,
  normalizeUrl,
  setTursoConfig,
  tursoExecute,
  tursoSelect,
} from "../../lib/turso";
import type { ApplySchemaResult, ConnectionTestResult, SetupRepo } from "../types";

export const tursoSetupRepo: SetupRepo = {
  async testConnection(url: string, token: string): Promise<ConnectionTestResult> {
    setTursoConfig({ url: normalizeUrl(url), token });
    try {
      await tursoSelect("SELECT 1");
      return { ok: true };
    } catch (error) {
      clearTursoConfig();
      const { message, kind } = classifyTursoError(error);
      return { ok: false, error: message, kind };
    }
  },

  async applySchema(): Promise<ApplySchemaResult> {
    const { applied, ensured } = await applyRemoteSchema((sql) => tursoExecute(sql));
    return { applied, ensured };
  },
};
