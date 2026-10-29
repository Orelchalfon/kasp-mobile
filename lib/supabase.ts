import "react-native-url-polyfill/auto";

import { createClient } from "@supabase/supabase-js";
import { AppState, Platform } from "react-native";

import type { Database } from "@/lib/database.types";
import { env } from "@/lib/env";
import { secureSessionStorage } from "@/lib/secure-storage";

// Anon/publishable client — every query runs under the signed-in user's RLS.
// Mobile sessions persist in the keychain/keystore; web (dev preview) uses localStorage.
export const supabase = createClient<Database>(env.supabaseUrl, env.supabasePublishableKey, {
  auth: {
    storage: Platform.OS === "web" ? undefined : secureSessionStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});

// Native apps don't get browser visibility events: refresh tokens only while foregrounded.
if (Platform.OS !== "web") {
  AppState.addEventListener("change", (state) => {
    if (state === "active") supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}
