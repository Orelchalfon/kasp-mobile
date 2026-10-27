// Gift sender flow — ported from kaspii-web/src/routes/give.$token.tsx.
// get_gift_target is the only gift RPC open to anon and returns { display_name, avatar }
// (never ids). submit_gift creates a *pending* gift (no ledger rows) and is idempotent on
// `_request_id`, the one client idempotency key in the backend.
import { useMutation, useQuery } from "@tanstack/react-query";

import type { GiftReason } from "@/lib/gifts";
import { qk } from "@/lib/query-keys";
import { unwrapJson } from "@/lib/rpc";
import { supabase } from "@/lib/supabase";

export interface GiftTarget {
  display_name: string;
  avatar: string | null;
}

export function useGiftTarget(token: string, enabled: boolean) {
  return useQuery({
    queryKey: qk.giftTarget(token),
    enabled,
    queryFn: async (): Promise<GiftTarget | null> => {
      const { data, error } = await supabase.rpc("get_gift_target", { _token: token });
      if (error) throw error;
      const p = data as { display_name?: string; avatar?: string | null; error?: string } | null;
      if (!p || p.error || !p.display_name) return null;
      return { display_name: p.display_name, avatar: p.avatar ?? null };
    },
  });
}

export function useSubmitGift() {
  return useMutation({
    mutationFn: async (vars: {
      token: string;
      amount: number;
      reason: GiftReason;
      senderName: string;
      requestId: string;
    }) =>
      unwrapJson<{ success: boolean }>(
        await supabase.rpc("submit_gift", {
          _token: vars.token,
          _amount: vars.amount,
          _reason: vars.reason,
          _sender_name: vars.senderName,
          _request_id: vars.requestId,
        }),
      ),
  });
}
