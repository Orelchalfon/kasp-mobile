import { I18nManager, Platform } from "react-native";

/**
 * Kasp is Hebrew-only, so the layout is always right-to-left.
 *
 * - Development/production builds: the expo-localization config plugin
 *   (`supportsRTL` + `forcesRTL` in app.json) bakes RTL into the native binary. Changing
 *   it requires a rebuild.
 * - Expo Go: honors `extra.supportsRTL/forcesRTL` from app.json. As a fallback this also
 *   forces RTL at runtime; React Native applies that on the next launch, so the very
 *   first launch may render LTR once and `needsReload` reports it.
 */
export function ensureRtl(): { needsReload: boolean } {
  if (Platform.OS === "web") return { needsReload: false };
  if (I18nManager.isRTL) return { needsReload: false };
  I18nManager.allowRTL(true);
  I18nManager.forceRTL(true);
  return { needsReload: true };
}
