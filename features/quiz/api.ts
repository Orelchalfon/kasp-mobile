// Educational quizzes — ported from kaspii-web/src/routes/child/educate.{index,$subject}.tsx.
// Questions come from the local bank by grade band (no DB); the payout is
// complete_quiz_and_pay, which pays only the first pass per subject per Asia/Jerusalem day.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { jerusalemDateKey } from "@/lib/format";
import { isQuizSubject, type QuizSubject } from "@/lib/quiz-bank";
import { hhKey, qk } from "@/lib/query-keys";
import { must, mustList, unwrapJson } from "@/lib/rpc";
import { supabase } from "@/lib/supabase";

export interface QuizHome {
  subjects: QuizSubject[];
  reward: number;
  paidToday: Set<QuizSubject>;
}

export function useQuizHome(hh: string, childId: string) {
  return useQuery({
    queryKey: qk.quizzes(hh, childId),
    queryFn: async (): Promise<QuizHome> => {
      const [settings, attempts] = await Promise.all([
        supabase
          .from("household_settings")
          .select("quiz_subjects, quiz_reward_amount")
          .eq("household_id", hh)
          .maybeSingle()
          .then(must),
        supabase
          .from("quiz_attempts")
          .select("subject, paid, created_at")
          .eq("child_id", childId)
          .order("created_at", { ascending: false })
          .limit(50)
          .then(mustList),
      ]);
      const today = jerusalemDateKey();
      const paidToday = new Set<QuizSubject>();
      for (const a of attempts) {
        if (a.paid && isQuizSubject(a.subject) && jerusalemDateKey(new Date(a.created_at)) === today) {
          paidToday.add(a.subject);
        }
      }
      return {
        subjects: (settings?.quiz_subjects ?? []).filter(isQuizSubject),
        reward: settings?.quiz_reward_amount ?? 5,
        paidToday,
      };
    },
  });
}

export type QuizResult =
  | { passed: true; paid: true; reward: number; wallet_delta: number; savings_delta: number }
  | { passed: true; paid: false }
  | { passed: false; paid: false; correct: number };

interface CompletePayload {
  passed?: boolean;
  paid?: boolean;
  reward?: number;
  wallet_delta?: number;
  savings_delta?: number;
}

export function useCompleteQuiz(hh: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { subject: QuizSubject; correct: number; total: number }): Promise<QuizResult> => {
      const p = unwrapJson<CompletePayload>(
        await supabase.rpc("complete_quiz_and_pay", {
          _subject: vars.subject,
          _correct: vars.correct,
          _total: vars.total,
        }),
      );
      if (p.passed && p.paid) {
        return {
          passed: true,
          paid: true,
          reward: Number(p.reward ?? 0),
          wallet_delta: Number(p.wallet_delta ?? 0),
          savings_delta: Number(p.savings_delta ?? 0),
        };
      }
      if (p.passed) return { passed: true, paid: false };
      return { passed: false, paid: false, correct: vars.correct };
    },
    onSettled: () => qc.invalidateQueries({ queryKey: hhKey(hh) }),
  });
}
