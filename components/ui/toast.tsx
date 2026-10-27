import { Feather } from "@expo/vector-icons";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { AccessibilityInfo, Animated, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Text } from "@/components/ui/text";
import { colors } from "@/constants/theme";

type ToastKind = "success" | "error" | "info";

interface ToastItem {
  id: number;
  kind: ToastKind;
  message: string;
}

interface ToastApi {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

const ICONS = { success: "check-circle", error: "alert-circle", info: "info" } as const;
const TINT = { success: colors.success, error: colors.destructive, info: colors.primary } as const;

/** Top-center transient messages (the web's sonner Toaster). Announced to screen readers. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastItem | null>(null);
  const counter = useRef(0);
  const opacity = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();

  const show = useCallback((kind: ToastKind, message: string) => {
    counter.current += 1;
    setToast({ id: counter.current, kind, message });
    AccessibilityInfo.announceForAccessibility(message);
  }, []);

  useEffect(() => {
    if (!toast) return;
    Animated.timing(opacity, { toValue: 1, duration: 150, useNativeDriver: true }).start();
    const timer = setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: 250, useNativeDriver: true }).start(() =>
        setToast((t) => (t?.id === toast.id ? null : t)),
      );
    }, 3200);
    return () => clearTimeout(timer);
  }, [toast, opacity]);

  const api = useRef<ToastApi>({
    success: (m) => show("success", m),
    error: (m) => show("error", m),
    info: (m) => show("info", m),
  }).current;

  return (
    <ToastContext.Provider value={api}>
      {children}
      {toast ? (
        <Animated.View
          pointerEvents="none"
          style={{ opacity, position: "absolute", top: insets.top + 8, start: 16, end: 16 }}
        >
          <View
            accessibilityLiveRegion="polite"
            className="flex-row items-center gap-2 rounded-2xl border border-border bg-card px-4 py-3"
            style={{ boxShadow: "0 4px 12px rgba(0,0,0,0.12)" }}
          >
            <Feather name={ICONS[toast.kind]} size={18} color={TINT[toast.kind]} />
            <Text variant="label" className="flex-1">
              {toast.message}
            </Text>
          </View>
        </Animated.View>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
