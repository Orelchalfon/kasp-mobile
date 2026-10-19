export const colors = {
    background: "#fafcff",
    foreground: "#131a29",
    card: "#ffffff",
    muted: "#f3f5f9",
    mutedForeground: "#6c727e",
    primary: "#076be3",
    accent: "#e5f0fe",
    border: "#e2e5e9",
    success: "#2eac66",
    destructive: "#df202e",
    subscription: "#ddedff",
} as const;

export const spacing = {
    0: 0,
    1: 4,
    2: 8,
    3: 12,
    4: 16,
    5: 20,
    6: 24,
    7: 28,
    8: 32,
    9: 36,
    10: 40,
    11: 44,
    12: 48,
    14: 56,
    16: 64,
    18: 72,
    20: 80,
    24: 96,
    30: 120,
} as const;

export const components = {
    tabBar: {
        height: spacing[18],
        horizontalInset: spacing[5],
        radius: spacing[8],
        iconFrame: spacing[12],
        itemPaddingVertical: spacing[2],
    },
} as const;

export const theme = {
    colors,
    spacing,
    components,
} as const;