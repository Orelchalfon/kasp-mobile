// Every key starts with the household, so one `invalidateQueries({ queryKey: hhKey(hh) })`
// after a money move refreshes every balance, ledger and task list in that household.
export const hhKey = (hh: string) => ["hh", hh] as const;

export const qk = {
  dashboard: (hh: string) => ["hh", hh, "dashboard"] as const,
  children: (hh: string) => ["hh", hh, "children"] as const,
  childOptions: (hh: string) => ["hh", hh, "child-options"] as const,
  task: (hh: string, taskId: string) => ["hh", hh, "task", taskId] as const,
  transactions: (hh: string, childId: string | null) => ["hh", hh, "transactions", childId] as const,
  monthlySummary: (hh: string, childId: string | null, month: string) =>
    ["hh", hh, "monthly-summary", childId, month] as const,
  settings: (hh: string) => ["hh", hh, "settings"] as const,
  childHome: (hh: string, childId: string) => ["hh", hh, "child", childId, "home"] as const,
  childLedger: (hh: string, childId: string) => ["hh", hh, "child", childId, "ledger"] as const,
  savings: (hh: string, childId: string) => ["hh", hh, "child", childId, "savings"] as const,
  quizzes: (hh: string, childId: string) => ["hh", hh, "child", childId, "quizzes"] as const,
  giftToken: (hh: string, childId: string) => ["hh", hh, "gift-token", childId] as const,
  tutors: (hh: string, includeInactive: boolean) => ["hh", hh, "tutors", includeInactive] as const,
  tutor: (hh: string, tutorId: string) => ["hh", hh, "tutor", tutorId] as const,
  tutorSessions: (hh: string, tutorId: string) => ["hh", hh, "tutor", tutorId, "sessions"] as const,
  tutorSession: (hh: string, sessionId: string) => ["hh", hh, "tutor-session", sessionId] as const,
  giftTarget: (token: string) => ["gift-target", token] as const,
};
