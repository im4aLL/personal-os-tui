export type ConnectionDotTone = "ok" | "error" | "stub";

export interface ConnectionDotProps {
  tone: ConnectionDotTone;
  label: string;
}
