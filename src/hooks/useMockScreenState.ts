// Shared M0 screen state: skeletons while the mock resolves slowly, an
// error view for the error scenario, then the placeholder content.
import { useEffect, useState } from "react";
import { useSession } from "../store/session";
import type { MockScreenState } from "./useMockScreenState.types";

export function useMockScreenState(): MockScreenState {
  const scenario = useSession((state) => state.scenario);
  const latencyMs = useSession((state) => state.latencyMs);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (scenario === "error" || scenario === "loading") {
      return;
    }
    setReady(false);
    const timer = setTimeout(() => {
      setReady(true);
    }, latencyMs);
    return () => {
      clearTimeout(timer);
    };
  }, [scenario, latencyMs]);

  if (scenario === "error") {
    return "error";
  }
  if (scenario === "loading" || !ready) {
    return "loading";
  }
  return "ready";
}
