// ── Raw data shapes (from uploaded JSON) ─────────────────────────────────────

export interface PullRequest {
  pr_url: string
  pr_status: 'open' | 'closed' | 'merged'
}

export interface Session {
  user_name: string
  user_email: string
  session_name: string
  created_at: string // ISO 8601
  acu_used: number
  url: string
  org_id: string
  org_name: string
  pull_requests: PullRequest[]
}

export interface DateRange {
  start: string // ISO 8601 date string
  end: string   // ISO 8601 date string
}

export interface SessionsData {
  sessions: Session[]
  date_range: DateRange
}

// ── Filter state ──────────────────────────────────────────────────────────────

export interface FilterState {
  dateRange: DateRange
  selectedUsers: string[] // emails; empty = all users
}

// ── Derived / computed types ──────────────────────────────────────────────────

export type BucketGranularity = 'week' | 'month'

export interface SummaryMetrics {
  totalAcus: number
  totalSessions: number
  totalMergedPrs: number
  /** null when totalMergedPrs === 0 — "undefined / no value produced" */
  acusPerMergedPr: number | null
  /** 0–100 */
  pctSessionsWithMerge: number
}

export interface TrendBucket {
  label: string
  periodStart: Date
  acus: number
  mergedPrs: number
  /** null when mergedPrs === 0 */
  efficiency: number | null
}

export interface AdoptionBucket {
  label: string
  key: string
  /** Distinct users with at least one session in this period */
  activeUsers: number
  /** Users whose first-ever session (across all data) falls in this period */
  newUsers: number
}

export interface UserEfficiencyRow {
  userName: string
  userEmail: string
  totalSessions: number
  totalAcus: number
  mergedPrCount: number
  /** null when mergedPrCount === 0 */
  acusPerMergedPr: number | null
}

export interface SessionRow {
  sessionId: string
  date: Date
  userName: string
  userEmail: string
  sessionName: string
  acuUsed: number
  sessionUrl: string
  mergedPrs: PullRequest[]
  allPrs: PullRequest[]
}

export interface UniqueUser {
  email: string
  name: string
}
