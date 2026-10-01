export interface OpenUrlResult {
  ok: boolean;
  /** Present when launching the system opener failed. */
  error?: string;
}
