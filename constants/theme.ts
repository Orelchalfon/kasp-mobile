// JS mirror of the tokens in global.css, for APIs that take raw values instead of
// classes (navigation options, icon colors, placeholderTextColor, ActivityIndicator).
export const colors = {
  background: "#fafcff",
  foreground: "#131a29",
  card: "#ffffff",
  muted: "#f3f5f9",
  mutedForeground: "#6c727e",
  primary: "#076be3",
  primaryForeground: "#f8fcff",
  accent: "#e5f0fe",
  accentForeground: "#22477d",
  border: "#e2e5e9",
  success: "#2eac66",
  successText: "#00783f",
  destructive: "#df202e",
  warning: "#f0b135",
  coin: "#eab532",
  coinForeground: "#3b2400",
  navy: "#252e40",
  vizTasks: "#3082f6",
  vizQuizzes: "#be8700",
  vizGifts: "#714ca6",
} as const;

export const fonts = {
  regular: "sans-regular",
  medium: "sans-medium",
  semibold: "sans-semibold",
  bold: "sans-bold",
} as const;

export const theme = { colors, fonts } as const;
