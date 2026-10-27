// Live voice call with an AI tutor — native port of kaspii-web/src/routes/child/tutors.$tutorId.tsx.
// Imports @elevenlabs/react-native (LiveKit + WebRTC native modules), so this module must
// only be loaded in a development/production build — never in Expo Go. The route loads it
// lazily after checking the runtime (see app/child/tutors/[tutorId].tsx).
import { ConversationProvider, useConversation } from "@elevenlabs/react-native";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Linking, LogBox, PermissionsAndroid, Platform, ScrollView, View } from "react-native";

import { Button } from "@/components/ui/button";
import { InlineError } from "@/components/ui/feedback";
import { Text } from "@/components/ui/text";
import { useToast } from "@/components/ui/toast";
import { colors } from "@/constants/theme";
import { mintTutorToken, tutorErrorMessage, type TranscriptMessage, type TutorRow } from "@/features/tutors/api";
import { RpcError } from "@/lib/rpc";
import { supabase } from "@/lib/supabase";

// livekit-client 2.23 logs console.error from its signal read loop when the socket closes
// after a normal hang-up (RN's WebSocket reports the close as an error). It fires after
// "connected -> disconnected", so it isn't a call failure; real failures still reach onError.
// Dev-only noise: LogBox doesn't exist in release builds.
LogBox.ignoreLogs(["error reading from signal stream"]);

type Phase = "idle" | "connecting" | "active" | "ended";

async function ensureMicPermission(): Promise<boolean> {
  if (Platform.OS !== "android") return true; // iOS prompts on first microphone use.
  const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO, {
    title: "גישה למיקרופון",
    message: "כדי לדבר עם החונך צריך לאשר גישה למיקרופון.",
    buttonPositive: "אישור",
    buttonNegative: "ביטול",
  });
  return result === PermissionsAndroid.RESULTS.GRANTED;
}

export function VoiceCall(props: { tutor: TutorRow; childId: string; householdId: string }) {
  return (
    <ConversationProvider>
      <VoiceCallInner {...props} />
    </ConversationProvider>
  );
}

function VoiceCallInner({ tutor, childId, householdId }: { tutor: TutorRow; childId: string; householdId: string }) {
  const toast = useToast();
  const [phase, setPhase] = useState<Phase>("idle");
  const [transcript, setTranscript] = useState<TranscriptMessage[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [micDenied, setMicDenied] = useState(false);
  const sessionIdRef = useRef<string | null>(null);
  const transcriptRef = useRef<TranscriptMessage[]>([]);
  transcriptRef.current = transcript;

  const finishSession = async (status: "completed" | "failed") => {
    const sid = sessionIdRef.current;
    if (!sid) return;
    sessionIdRef.current = null;
    await supabase
      .from("tutor_sessions")
      .update({
        ended_at: new Date().toISOString(),
        status,
        transcript: transcriptRef.current as unknown as never,
        transcript_source: "client",
      })
      .eq("id", sid);
  };

  const conversation = useConversation({
    onConnect: async ({ conversationId }: { conversationId: string }) => {
      setPhase("active");
      const sid = sessionIdRef.current;
      if (sid) {
        await supabase.from("tutor_sessions").update({ elevenlabs_conversation_id: conversationId }).eq("id", sid);
      }
    },
    onDisconnect: async () => {
      setPhase("ended");
      setIsThinking(false);
      await finishSession("completed");
    },
    onMessage: ({ message, role }: { message: string; role: string }) => {
      setTranscript((prev) => [...prev, { role: role === "agent" ? "assistant" : "user", content: message }]);
    },
    onAgentTyping: ({ is_typing }: { is_typing: boolean }) => setIsThinking(is_typing),
    onError: async () => {
      toast.error("אירעה שגיאה בשיחה");
      setPhase("ended");
      setIsThinking(false);
      await finishSession("failed");
    },
  });

  const isSpeaking = conversation.isSpeaking;
  useEffect(() => {
    if (isSpeaking || phase !== "active") setIsThinking(false);
  }, [isSpeaking, phase]);

  // Hang up if the screen is closed mid-call.
  useEffect(() => {
    return () => {
      if (sessionIdRef.current) void conversation.endSession();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startCall = async () => {
    setMicDenied(false);
    setPhase("connecting");
    if (!(await ensureMicPermission())) {
      setMicDenied(true);
      setPhase("idle");
      return;
    }
    setTranscript([]);
    sessionIdRef.current = null;
    const [insertResult, tokenResult] = await Promise.allSettled([
      supabase
        .from("tutor_sessions")
        .insert({ household_id: householdId, tutor_id: tutor.id, child_id: childId, status: "active" })
        .select("id")
        .single(),
      mintTutorToken(tutor.id),
    ]);
    const created = insertResult.status === "fulfilled" ? insertResult.value.data : null;
    if (created) sessionIdRef.current = created.id;
    if (!created || tokenResult.status === "rejected") {
      if (created) await finishSession("failed");
      const reason =
        tokenResult.status === "rejected" && tokenResult.reason instanceof RpcError ? tokenResult.reason.reason : "";
      toast.error(tutorErrorMessage(reason));
      setPhase("idle");
      return;
    }
    try {
      await conversation.startSession({
        conversationToken: tokenResult.value.conversationToken,
        connectionType: "webrtc",
        overrides: tokenResult.value.overrides,
      });
    } catch {
      await finishSession("failed");
      toast.error("לא הצלחנו להתחיל את השיחה. נסו שוב.");
      setPhase("idle");
    }
  };

  const statusText =
    phase === "connecting"
      ? "מתחבר לחונך..."
      : phase === "ended"
        ? "השיחה הסתיימה"
        : phase === "active"
          ? isSpeaking
            ? "החונך מדבר"
            : isThinking
              ? "החונך חושב..."
              : conversation.isMuted
                ? "המיקרופון מושתק"
                : "השיחה פעילה. אפשר לדבר."
          : "";

  return (
    <View className="flex-1 gap-5">
      <View className="items-center gap-3 pt-6">
        <View
          className={`size-32 items-center justify-center rounded-full ${isSpeaking ? "bg-primary" : "bg-accent"}`}
          accessibilityElementsHidden
        >
          <Feather name="headphones" size={56} color={isSpeaking ? colors.primaryForeground : colors.primary} />
        </View>
        <Text variant="title" accessibilityRole="header">
          {tutor.name}
        </Text>
        <Text variant="caption">
          {tutor.subject} · {tutor.topic}
        </Text>
        <Text variant="label" accessibilityLiveRegion="polite" className="text-primary">
          {statusText}
        </Text>
      </View>

      {micDenied ? (
        <View className="gap-2">
          <InlineError message="כדי לדבר עם החונך צריך לאשר גישה למיקרופון. אפשר לאשר בהגדרות הטלפון." />
          <Button title="פתיחת הגדרות" variant="outline" icon="settings" onPress={() => void Linking.openSettings()} />
        </View>
      ) : null}

      <View className="gap-2">
        {phase === "idle" ? (
          <Button title={micDenied ? "נסו שוב" : "התחל שיחה"} icon="phone" onPress={startCall} />
        ) : phase === "connecting" ? (
          <View className="min-h-12 flex-row items-center justify-center gap-2">
            <ActivityIndicator color={colors.primary} />
            <Text variant="label">מתחבר...</Text>
          </View>
        ) : phase === "active" ? (
          <View className="flex-row gap-2">
            <Button
              title={conversation.isMuted ? "הפעל מיקרופון" : "השתק"}
              icon={conversation.isMuted ? "mic" : "mic-off"}
              variant="outline"
              className="flex-1"
              onPress={() => conversation.setMuted(!conversation.isMuted)}
            />
            <Button
              title="סיים שיחה"
              icon="phone-off"
              variant="destructive"
              className="flex-1"
              onPress={() => void conversation.endSession()}
            />
          </View>
        ) : (
          <View className="gap-2">
            <Text variant="caption" className="text-center">
              השיחה הסתיימה.
            </Text>
            <Button title="חזרה לחונכים" variant="outline" onPress={() => router.back()} />
          </View>
        )}
      </View>

      {transcript.length > 0 ? (
        <View className="flex-1 gap-2">
          <Text variant="heading">תמליל</Text>
          <ScrollView contentContainerClassName="gap-2 pb-6">
            {transcript.map((m, i) => (
              <View
                key={i}
                className={`max-w-[85%] rounded-2xl px-4 py-2 ${m.role === "assistant" ? "self-start bg-accent" : "self-end border border-border bg-card"}`}
              >
                <Text variant="small" className="font-sans-semibold text-foreground">
                  {m.role === "assistant" ? `${tutor.name}:` : "אני:"}
                </Text>
                <Text variant="body">{m.content}</Text>
              </View>
            ))}
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
}
