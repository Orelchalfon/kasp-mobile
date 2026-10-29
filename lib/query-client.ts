import { focusManager, onlineManager, QueryClient } from "@tanstack/react-query";
import * as Network from "expo-network";
import { AppState, Platform, type AppStateStatus } from "react-native";

/**
 * Defaults for every mutation. Money moves (approve/deposit/adjust/quiz payout) have no
 * client idempotency key except submit_gift, so they must never be retried
 * automatically or queued while offline and replayed later:
 *  - retry: 0           -> one attempt; the user decides whether to try again.
 *  - networkMode always -> fires immediately and fails fast offline instead of pausing
 *                          and silently re-sending when connectivity returns.
 */
export const MUTATION_DEFAULTS = { retry: 0, networkMode: "always" } as const;

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: 2,
      },
      mutations: MUTATION_DEFAULTS,
    },
  });
}

let wired = false;

/** Refetch on app foreground and track connectivity (queries only — see MUTATION_DEFAULTS). */
export function wireQueryLifecycle() {
  if (wired || Platform.OS === "web") return;
  wired = true;

  AppState.addEventListener("change", (status: AppStateStatus) => {
    focusManager.setFocused(status === "active");
  });

  onlineManager.setEventListener((setOnline) => {
    const sub = Network.addNetworkStateListener((state) => {
      setOnline(state.isConnected !== false && state.isInternetReachable !== false);
    });
    return () => sub.remove();
  });
}
