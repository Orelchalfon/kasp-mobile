import { Feather } from "@expo/vector-icons";
import { Redirect } from "expo-router";
import { useState } from "react";
import { View } from "react-native";

import { Button } from "@/components/ui/button";
import { Screen } from "@/components/ui/screen";
import { Text } from "@/components/ui/text";
import { colors } from "@/constants/theme";
import { routeForAuth } from "@/lib/routing";
import { useAuth } from "@/providers/auth-provider";

/**
 * Signed in, but no parent/child role (no user_roles row, an 'admin' account — which has
 * no app UI — or the lookup failed). The web shows an endless loader here.
 */
export default function NoAccess() {
  const auth = useAuth();
  const [retrying, setRetrying] = useState(false);
  const target = routeForAuth(auth);
  if (target && target !== "/no-access") return <Redirect href={target} />;

  const failed = auth.roleStatus === "error";
  return (
    <Screen scroll={false} contentClassName="items-center justify-center gap-4">
      <View className="size-16 items-center justify-center rounded-full bg-accent">
        <Feather name={failed ? "wifi-off" : "lock"} size={28} color={colors.primary} />
      </View>
      <Text variant="title" className="text-center" accessibilityRole="header">
        {failed ? "לא הצלחנו לטעון את החשבון" : "אין לחשבון הזה גישה לאפליקציה"}
      </Text>
      <Text variant="caption" className="text-center">
        {failed
          ? "בדקו את החיבור לאינטרנט ונסו שוב."
          : "החשבון לא משויך למשפחה כהורה או כילד. אם זו טעות, פנו לתמיכה."}
      </Text>
      <View className="w-full gap-3">
        {failed ? (
          <Button
            title="נסו שוב"
            icon="rotate-cw"
            loading={retrying}
            onPress={async () => {
              setRetrying(true);
              await auth.refreshRole();
              setRetrying(false);
            }}
          />
        ) : null}
        <Button title="התנתקות" variant="outline" icon="log-out" onPress={() => void auth.signOut()} />
      </View>
    </Screen>
  );
}
