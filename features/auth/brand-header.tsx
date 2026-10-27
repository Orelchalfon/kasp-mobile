import { Image } from "expo-image";
import { View } from "react-native";

import { Text } from "@/components/ui/text";

const logo = require("@/assets/images/logo.png");

export function BrandHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <View className="items-center gap-2">
      <Image source={logo} style={{ width: 88, height: 88 }} accessibilityLabel="Kasp" />
      <Text variant="title" className="text-center" accessibilityRole="header">
        {title}
      </Text>
      <Text variant="caption" className="text-center">
        {subtitle}
      </Text>
    </View>
  );
}
