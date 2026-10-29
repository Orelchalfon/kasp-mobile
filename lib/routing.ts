import type { AppRole, RoleStatus } from "@/providers/auth-provider";

export type EntryRoute =
  | "/(auth)/sign-in"
  | "/parent/dashboard"
  | "/child/dashboard"
  | "/no-access"
  | null;

/** Where "/" sends the user. `null` = still resolving (keep the splash/loader up). */
export function routeForAuth(input: {
  isLoading: boolean;
  isAuthenticated: boolean;
  role: AppRole | null;
  roleStatus: RoleStatus;
}): EntryRoute {
  if (input.isLoading) return null;
  if (!input.isAuthenticated) return "/(auth)/sign-in";
  if (input.role === "parent") return "/parent/dashboard";
  if (input.role === "child") return "/child/dashboard";
  if (input.roleStatus === "missing" || input.roleStatus === "error") return "/no-access";
  return null;
}
