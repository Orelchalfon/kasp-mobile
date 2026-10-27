import Constants, { ExecutionEnvironment } from "expo-constants";
import { router, useLocalSearchParams } from "expo-router";
import type { ComponentType } from "react";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/components/ui/button";
import { EmptyState, LoadError, LoadingView } from "@/components/ui/feedback";
import { colors } from "@/constants/theme";
import { useTutor, type TutorRow } from "@/features/tutors/api";
import { useChildAuth } from "@/providers/auth-provider";

type VoiceCallComponent = ComponentType<{ tutor: TutorRow; childId: string; householdId: string }>;

/**
 * Voice calls need LiveKit/WebRTC native modules that Expo Go doesn't ship. Load the call
 * UI lazily and only outside Expo Go, so the rest of the app keeps working there.
 */
function loadVoiceCall(): VoiceCallComponent | null {
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return (require("@/features/tutors/voice-call") as { VoiceCall: VoiceCallComponent }).VoiceCall;
  } catch {
    return null;
  }
}

export default function TutorCallScreen() {
  const { tutorId } = useLocalSearchParams<{ tutorId: string }>();
  const { householdId, childProfileId } = useChildAuth();
  const tutor = useTutor(householdId, tutorId);

  let body;
  if (tutor.isLoading) body = <LoadingView label="טוען חונך..." />;
  else if (tutor.data === undefined)
    body = <LoadError message="לא הצלחנו לטעון את החונך." onRetry={() => void tutor.refetch()} />;
  else if (!tutor.data || !tutor.data.active)
    body = (
      <EmptyState
        icon="slash"
        title="החונך הזה לא זמין כרגע."
        action={<Button title="חזרה לחונכים" variant="outline" onPress={() => router.back()} />}
      />
    );
  else {
    const VoiceCall = loadVoiceCall();
    body = VoiceCall ? (
      <VoiceCall tutor={tutor.data} childId={childProfileId} householdId={householdId} />
    ) : (
      <EmptyState
        icon="smartphone"
        title="שיחה קולית דורשת את גרסת האפליקציה המלאה"
        description="השיחה עם החונך משתמשת ברכיבים שלא זמינים ב-Expo Go. פתחו את האפליקציה בגרסת הפיתוח (Development Build)."
        action={<Button title="חזרה לחונכים" variant="outline" onPress={() => router.back()} />}
      />
    );
  }

  return (
    <SafeAreaView edges={["bottom"]} style={{ flex: 1, backgroundColor: colors.background }}>
      <View className="flex-1 px-4">{body}</View>
    </SafeAreaView>
  );
}
