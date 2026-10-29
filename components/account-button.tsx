import { IconButton } from "@/components/ui/button";
import { confirmAction } from "@/components/ui/controls";
import { useAuth } from "@/providers/auth-provider";

/** Sign-out control shown in each area's home header (the web's AppHeader menu). */
export function SignOutButton() {
  const { signOut } = useAuth();
  return (
    <IconButton
      icon="log-out"
      label="התנתקות"
      onPress={async () => {
        const ok = await confirmAction({ title: "להתנתק מהחשבון?", confirmLabel: "התנתקות" });
        if (ok) await signOut();
      }}
    />
  );
}
