// Mock SetupRepo: deterministic success/failure so the Setup flow is
// reviewable. Succeeds when the URL has a scheme and the token is at least
// 8 characters and not "bad".
import type { ApplySchemaResult, ConnectionTestResult, SetupRepo } from "../types";
import { mockCall } from "./guard";

export const mockSetupRepo: SetupRepo = {
  testConnection(url: string, token: string): Promise<ConnectionTestResult> {
    return mockCall(() => {
      const trimmedUrl = url.trim();
      if (!trimmedUrl.startsWith("https://") && !trimmedUrl.startsWith("libsql://")) {
        return { ok: false, error: "URL must start with https:// or libsql://" };
      }
      if (token.length < 8 || token === "bad") {
        return { ok: false, error: "Turso HTTP 401: unauthorized" };
      }
      return { ok: true };
    });
  },

  applySchema(): Promise<ApplySchemaResult> {
    return mockCall(() => ({ applied: 22 }));
  },
};
