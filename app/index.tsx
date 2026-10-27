import { Redirect } from "expo-router";
import { useEffect, useState } from "react";

import { LoadingView } from "@/components/ui/feedback";
import { takeGiveReturn } from "@/lib/gifts";
import { routeForAuth } from "@/lib/routing";
import { useAuth } from "@/providers/auth-provider";

/**
 * Entry: send the user to sign-in or their role's home (the web's `/` redirect).
 * A sender who signed in from a gift link is sent back to that link first.
 */
export default function Index() {
  const auth = useAuth();
  const [giveToken, setGiveToken] = useState<string | null | undefined>(undefined);
  const ready = !auth.isLoading;

  useEffect(() => {
    if (!ready) return;
    if (!auth.isAuthenticated) {
      setGiveToken(null);
      return;
    }
    let active = true;
    takeGiveReturn().then((t) => {
      if (active) setGiveToken(t);
    });
    return () => {
      active = false;
    };
  }, [ready, auth.isAuthenticated]);

  if (!ready || giveToken === undefined) return <LoadingView />;
  if (giveToken && auth.role !== "child") {
    return <Redirect href={{ pathname: "/give/[token]", params: { token: giveToken } }} />;
  }
  const target = routeForAuth(auth);
  if (!target) return <LoadingView />;
  return <Redirect href={target} />;
}
