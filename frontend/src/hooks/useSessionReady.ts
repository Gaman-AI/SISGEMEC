import { useMemo } from "react";
import { useAuth } from "@/auth/auth.store";

export type UseSessionReadyResult = {
  ready: boolean;
  hasSession: boolean;
};

export function useSessionReady(): UseSessionReadyResult {
  const { state } = (useAuth() as unknown) as { state?: Record<string, unknown> };

  const hasSession = useMemo(() => {
    const s = state ?? {};
    const candidate =
      (s as any).session ??
      (s as any).user ??
      (s as any).currentUser ??
      (s as any).token ??
      (s as any).isLoggedIn ??
      (s as any).authenticated;
    return Boolean(candidate);
  }, [state]);

  return { ready: true, hasSession };
}

export default useSessionReady;
