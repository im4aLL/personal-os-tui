export type RepoMode = "mock" | "turso";

export interface RepoResolveInput {
  mockFlag: boolean;
  tursoFlag: boolean;
  /** Raw POS_MOCK value; undefined when unset. */
  mockEnv: string | undefined;
  /** False when no config file exists, credentials are missing, or onboarding is incomplete. */
  configComplete: boolean;
}
