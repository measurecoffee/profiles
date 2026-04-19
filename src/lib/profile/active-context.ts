export interface ActiveContextActivity {
  type: string
  summary: string
  at: string | null
}

export interface ActiveContextSummary {
  currentFocus: string | null
  sessionHint: string | null
  activeIssues: string[]
  recentActivity: ActiveContextActivity[]
}
