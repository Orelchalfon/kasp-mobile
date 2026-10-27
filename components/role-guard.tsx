import { Redirect } from "expo-router";
import type { ReactNode } from "react";

import { LoadingView } from "@/components/ui/feedback";
import { useAuth, type AppRole } from "@/providers/auth-provider";

/**
 * Role-gated area (the web's parent.tsx / child.tsx layouts). Hiding screens is UX only:
 * every query and mutation is still authorized by RLS and the RPCs on the server.
 */
export function RoleGuard({ role, children }: { role: AppRole; children: ReactNode }) {
  const auth = useAuth();
  if (auth.isLoading) return <LoadingView />;
  if (!auth.isAuthenticated) return <Redirect href="/(auth)/sign-in" />;
  if (auth.role !== role) return <Redirect href="/" />;
  return <>{children}</>;
}
