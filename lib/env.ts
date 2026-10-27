// Public, build-time configuration. Every EXPO_PUBLIC_* value is inlined into the app
// bundle and visible to anyone holding the binary — never put secrets here (no
// service-role key, no ElevenLabs key: those live only in Supabase Edge Function secrets).

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Missing ${name}. Copy .env.example to .env and fill it in.`);
  }
  return value;
}

export const env = {
  supabaseUrl: required("EXPO_PUBLIC_SUPABASE_URL", process.env.EXPO_PUBLIC_SUPABASE_URL),
  supabasePublishableKey: required(
    "EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  ),
  /** The deployed web app. Gift QR codes and auth email links point here. */
  webOrigin: (process.env.EXPO_PUBLIC_WEB_ORIGIN ?? "https://kasp-web.kasp.workers.dev").replace(
    /\/$/,
    "",
  ),
} as const;
