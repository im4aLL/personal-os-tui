// Mock latency: repos resolve slowly so loading and skeleton states are reviewable.
//
// POS_MOCK_LATENCY sets an exact millisecond delay. When unset, mock calls
// take 150-400 ms by default.
export function resolveLatencyMs(raw: string | undefined): number {
  if (raw !== undefined && raw !== "") {
    const parsed = Number(raw);
    if (Number.isFinite(parsed) && parsed >= 0) {
      return Math.floor(parsed);
    }
  }
  return 150 + Math.floor(Math.random() * 250);
}

export function currentLatencyMs(): number {
  return resolveLatencyMs(process.env.POS_MOCK_LATENCY);
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
