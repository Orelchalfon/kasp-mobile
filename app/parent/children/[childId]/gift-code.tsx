import * as Clipboard from "expo-clipboard";
import { useLocalSearchParams } from "expo-router";
import { Share, View } from "react-native";
import QRCode from "react-native-qrcode-svg";

import { Button } from "@/components/ui/button";
import { confirmAction } from "@/components/ui/controls";
import { LoadError, Skeleton } from "@/components/ui/feedback";
import { Screen } from "@/components/ui/screen";
import { LtrText, Text } from "@/components/ui/text";
import { useToast } from "@/components/ui/toast";
import { useChildrenList, useGiftToken, useRotateGiftToken } from "@/features/children/api";
import { giftUrl } from "@/lib/gifts";
import { useParentAuth } from "@/providers/auth-provider";

/**
 * "קוד מתנה": the child's gift QR + link. The QR encodes the public web URL so any adult
 * can open it in a phone browser, with or without the app. Rotating kills old codes.
 */
export default function GiftCode() {
  const { childId } = useLocalSearchParams<{ childId: string }>();
  const { householdId } = useParentAuth();
  const toast = useToast();
  const child = useChildrenList(householdId).data?.find((c) => c.id === childId);
  const token = useGiftToken(householdId, childId);
  const rotate = useRotateGiftToken(householdId, childId);
  const url = token.data ? giftUrl(token.data) : null;
  const name = child?.display_name ?? "";

  return (
    <Screen edges={["bottom"]} contentClassName="items-stretch">
      <Text variant="heading">{name}</Text>
      <Text variant="caption">
        סבים, דודים וחברים יכולים לסרוק את הקוד ולשלוח מתנה. כל מתנה ממתינה לאישור שלכם, ואת הכסף עצמו
        מקבלים אתם.
      </Text>

      {token.isLoading ? (
        <Skeleton className="h-64 w-64 self-center" />
      ) : !url ? (
        <LoadError message="לא הצלחנו לטעון את קוד המתנה. נסו שוב." onRetry={() => void token.refetch()} />
      ) : (
        <>
          <View
            accessible
            accessibilityRole="image"
            accessibilityLabel={`קוד QR למתנה ל${name}`}
            className="items-center self-center rounded-3xl bg-white p-5"
          >
            <QRCode value={url} size={220} />
          </View>
          <LtrText variant="small" selectable className="text-center">
            {url}
          </LtrText>
          <View className="flex-row gap-2">
            <Button
              title="העתקת קישור"
              icon="copy"
              variant="outline"
              className="flex-1"
              onPress={async () => {
                try {
                  await Clipboard.setStringAsync(url);
                  toast.success("הקישור הועתק");
                } catch {
                  toast.error("לא הצלחנו להעתיק. סמנו את הקישור והעתיקו ידנית.");
                }
              }}
            />
            <Button
              title="שיתוף"
              icon="share-2"
              className="flex-1"
              onPress={() => void Share.share({ title: `מתנה ל${name} ב-Kasp`, message: url, url })}
            />
          </View>
          <Button
            title="צור קוד חדש"
            icon="refresh-cw"
            variant="ghost"
            loading={rotate.isPending}
            onPress={async () => {
              const ok = await confirmAction({
                title: "ליצור קוד חדש?",
                message:
                  "הקוד הנוכחי יפסיק לעבוד, כולל קישורים ששיתפתם או הדפסתם. מתנות שכבר נשלחו יישארו ממתינות לאישור.",
                confirmLabel: "צור קוד חדש",
              });
              if (!ok) return;
              try {
                await rotate.mutateAsync();
                toast.success("נוצר קוד חדש. הקוד הקודם כבר לא פעיל.");
              } catch {
                toast.error("לא הצלחנו ליצור קוד חדש. נסו שוב.");
              }
            }}
          />
        </>
      )}
    </Screen>
  );
}
