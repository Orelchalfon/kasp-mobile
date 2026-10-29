import DateTimePicker, { DateTimePickerAndroid, type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { useState } from "react";
import { Platform, Pressable, View } from "react-native";

import { Text } from "@/components/ui/text";
import { formatDate, toDateInput } from "@/lib/format";

/** Native date picker bound to a "YYYY-MM-DD" string (local date, no UTC shift). */
export function DateField({
  label,
  value,
  onChange,
  minimumDate,
  maximumDate,
  error,
}: {
  label: string;
  value: string | null;
  onChange: (value: string) => void;
  minimumDate?: Date;
  maximumDate?: Date;
  error?: string | null;
}) {
  const [iosOpen, setIosOpen] = useState(false);
  const date = value ? new Date(`${value}T12:00:00`) : (maximumDate ?? new Date());

  const handle = (event: DateTimePickerEvent, picked?: Date) => {
    if (Platform.OS === "ios") setIosOpen(false);
    if (event.type === "set" && picked) onChange(toDateInput(picked));
  };

  const open = () => {
    if (Platform.OS === "android") {
      DateTimePickerAndroid.open({ value: date, mode: "date", onChange: handle, minimumDate, maximumDate });
    } else {
      setIosOpen((o) => !o);
    }
  };

  return (
    <View className="gap-1.5">
      <Text variant="label">{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value ? formatDate(`${value}T12:00:00`) : "לא נבחר"}`}
        onPress={open}
        className={`min-h-12 justify-center rounded-xl border bg-card px-4 ${error ? "border-destructive" : "border-input"}`}
      >
        <Text variant="body" className={value ? "" : "text-muted-foreground"}>
          {value ? formatDate(`${value}T12:00:00`) : "בחרו תאריך"}
        </Text>
      </Pressable>
      {Platform.OS === "ios" && iosOpen ? (
        <DateTimePicker
          value={date}
          mode="date"
          display="inline"
          locale="he-IL"
          minimumDate={minimumDate}
          maximumDate={maximumDate}
          onChange={handle}
        />
      ) : null}
      {error ? (
        <Text variant="small" className="text-destructive">
          {error}
        </Text>
      ) : null}
    </View>
  );
}
