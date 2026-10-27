import { Switch, View } from "react-native";

import { ChipRow } from "@/components/ui/controls";
import { TextField } from "@/components/ui/text-field";
import { Text } from "@/components/ui/text";
import { colors } from "@/constants/theme";
import type { TutorInput } from "@/features/tutors/api";
import {
  LANGUAGE_LABELS_HE,
  PERSONALITY_LABELS_HE,
  TUTOR_LANGUAGES,
  TUTOR_PERSONALITIES,
  TUTOR_VOICES,
} from "@/lib/tutors";

/** Shared tutor fields (create + edit), same catalogs and limits as the web. */
export function TutorFields({
  value,
  onChange,
  errors,
  active,
  onActiveChange,
}: {
  value: TutorInput;
  onChange: (next: TutorInput) => void;
  errors: Partial<Record<"name" | "subject" | "topic", string>>;
  active?: boolean;
  onActiveChange?: (v: boolean) => void;
}) {
  const set = <K extends keyof TutorInput>(k: K, v: TutorInput[K]) => onChange({ ...value, [k]: v });
  return (
    <View className="gap-4">
      <TextField label="שם החונך" value={value.name} onChangeText={(t) => set("name", t)} placeholder="מורה נועה" maxLength={60} error={errors.name} />
      <TextField label="מקצוע" value={value.subject} onChangeText={(t) => set("subject", t)} placeholder="אנגלית" maxLength={60} error={errors.subject} />
      <TextField
        label="נושא השיחה"
        value={value.topic}
        onChangeText={(t) => set("topic", t)}
        placeholder="שיחון באנגלית לחיי היומיום"
        maxLength={200}
        multiline
        hint={`${value.topic.length}/200`}
        error={errors.topic}
      />
      <View className="gap-2">
        <Text variant="label">סגנון</Text>
        <ChipRow
          label="סגנון"
          options={TUTOR_PERSONALITIES.map((p) => ({ value: p, label: PERSONALITY_LABELS_HE[p] }))}
          value={value.personality}
          onChange={(v) => set("personality", v)}
        />
      </View>
      <View className="gap-2">
        <Text variant="label">קול</Text>
        <ChipRow
          label="קול"
          options={TUTOR_VOICES.map((v) => ({ value: v.id, label: v.label }))}
          value={value.voice_id}
          onChange={(v) => set("voice_id", v)}
        />
      </View>
      <View className="gap-2">
        <Text variant="label">שפת שיחה</Text>
        <ChipRow
          label="שפת שיחה"
          options={TUTOR_LANGUAGES.map((l) => ({ value: l, label: LANGUAGE_LABELS_HE[l] }))}
          value={value.language}
          onChange={(v) => set("language", v)}
        />
      </View>
      {onActiveChange ? (
        <View className="flex-row items-center justify-between rounded-2xl border border-border bg-card p-4">
          <Text variant="label">פעיל (מוצג לילדים)</Text>
          <Switch
            accessibilityLabel="פעיל (מוצג לילדים)"
            value={!!active}
            onValueChange={onActiveChange}
            trackColor={{ true: colors.primary, false: colors.border }}
            thumbColor={colors.card}
          />
        </View>
      ) : null}
    </View>
  );
}
