// Ported from kaspii-web/src/hooks/use-auth.tsx. Same role resolution
// (user_roles -> child_profiles), plus explicit states the web leaves implicit:
//  - roleStatus "missing": signed in but no parent/child role (no user_roles row, or
//    'admin', which has no UI) -> show a "no access" screen instead of loading forever.
//  - roleStatus "error": the role lookup itself failed -> offer retry.
// Screen guards are UX only; authorization is enforced by RLS and the RPCs.
import type { Session, User } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";

import { supabase } from "@/lib/supabase";

export type AppRole = "parent" | "child";
export type RoleStatus = "idle" | "loading" | "ready" | "missing" | "error";

interface RoleInfo {
  role: AppRole | null;
  householdId: string | null;
  childProfileId: string | null;
  childBirthdate: string | null;
}

const EMPTY_ROLE: RoleInfo = {
  role: null,
  householdId: null,
  childProfileId: null,
  childBirthdate: null,
};

export interface AuthState extends RoleInfo {
  /** True until the persisted session and (if signed in) the role have been read. */
  isLoading: boolean;
  isAuthenticated: boolean;
  user: User | null;
  session: Session | null;
  roleStatus: RoleStatus;
  signOut: () => Promise<void>;
  refreshRole: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

async function fetchRoleInfo(userId: string): Promise<{ status: RoleStatus; info: RoleInfo }> {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role, household_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) return { status: "error", info: EMPTY_ROLE };
  if (!data || (data.role !== "parent" && data.role !== "child")) {
    return { status: "missing", info: EMPTY_ROLE };
  }
  if (data.role === "parent") {
    return {
      status: "ready",
      info: { ...EMPTY_ROLE, role: "parent", householdId: data.household_id },
    };
  }
  const { data: cp, error: cpError } = await supabase
    .from("child_profiles")
    .select("id, birthdate")
    .eq("user_id", userId)
    .maybeSingle();
  if (cpError) return { status: "error", info: EMPTY_ROLE };
  if (!cp) return { status: "missing", info: EMPTY_ROLE };
  return {
    status: "ready",
    info: {
      role: "child",
      householdId: data.household_id,
      childProfileId: cp.id,
      childBirthdate: cp.birthdate,
    },
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [sessionLoaded, setSessionLoaded] = useState(false);
  const [roleStatus, setRoleStatus] = useState<RoleStatus>("idle");
  const [roleInfo, setRoleInfo] = useState<RoleInfo>(EMPTY_ROLE);
  // Ignore stale role lookups when the user changes mid-flight.
  const latestUserId = useRef<string | null>(null);
  const queryClient = useQueryClient();

  const loadRole = useCallback(async (userId: string) => {
    latestUserId.current = userId;
    setRoleStatus("loading");
    const result = await fetchRoleInfo(userId).catch(() => ({
      status: "error" as const,
      info: EMPTY_ROLE,
    }));
    if (latestUserId.current !== userId) return;
    setRoleInfo(result.info);
    setRoleStatus(result.status);
  }, []);

  const applySession = useCallback(
    (next: Session | null) => {
      setSession(next);
      const nextUserId = next?.user.id ?? null;
      if (!nextUserId) {
        // Never show one account's cached household data to the next account.
        if (latestUserId.current) queryClient.clear();
        latestUserId.current = null;
        setRoleInfo(EMPTY_ROLE);
        setRoleStatus("idle");
        return;
      }
      if (nextUserId !== latestUserId.current) {
        if (latestUserId.current) queryClient.clear();
        // Defer so the query doesn't run while supabase-js holds its auth lock.
        setTimeout(() => void loadRole(nextUserId), 0);
      }
    },
    [loadRole, queryClient],
  );

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      applySession(data.session);
      setSessionLoaded(true);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      applySession(next);
      setSessionLoaded(true);
    });
    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, [applySession]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    queryClient.clear();
    latestUserId.current = null;
    setSession(null);
    setRoleInfo(EMPTY_ROLE);
    setRoleStatus("idle");
  }, [queryClient]);

  const refreshRole = useCallback(async () => {
    const id = session?.user.id;
    if (id) await loadRole(id);
  }, [session, loadRole]);

  const user = session?.user ?? null;
  const roleResolving = !!user && (roleStatus === "idle" || roleStatus === "loading");

  const value: AuthState = {
    ...roleInfo,
    isLoading: !sessionLoaded || roleResolving,
    isAuthenticated: !!user,
    user,
    session,
    roleStatus,
    signOut,
    refreshRole,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

/** Narrowed accessors for screens that sit behind a role guard. */
export function useParentAuth() {
  const auth = useAuth();
  if (auth.role !== "parent" || !auth.householdId || !auth.user) {
    throw new Error("useParentAuth used outside the parent area");
  }
  return { ...auth, householdId: auth.householdId, user: auth.user };
}

export function useChildAuth() {
  const auth = useAuth();
  if (auth.role !== "child" || !auth.householdId || !auth.childProfileId || !auth.user) {
    throw new Error("useChildAuth used outside the child area");
  }
  return {
    ...auth,
    householdId: auth.householdId,
    childProfileId: auth.childProfileId,
    user: auth.user,
  };
}
