// Turso stub (M0). Throws until the Setup wiring milestone lands.
import type { ApplySchemaResult, ConnectionTestResult, SetupRepo } from "../types";

function notWired(what: string): Error {
  return new Error(`turso ${what} is not wired yet`);
}

export const tursoSetupRepo: SetupRepo = {
  testConnection(_url: string, _token: string): Promise<ConnectionTestResult> {
    throw notWired("setup.testConnection");
  },
  applySchema(): Promise<ApplySchemaResult> {
    throw notWired("setup.applySchema");
  },
};
