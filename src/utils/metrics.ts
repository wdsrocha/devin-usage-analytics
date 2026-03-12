import { parseISO } from 'date-fns'
import {
  getBucketStart,
  getBucketKey,
  getBucketStarts,
  formatBucketLabel,
  isInDateRange,
} from './dates'
import type {
  Session,
  FilterState,
  SummaryMetrics,
  TrendBucket,
  AdoptionBucket,
  UserEfficiencyRow,
  SessionRow,
  SessionsData,
  BucketGranularity,
  UniqueUser,
} from '@/types'

// ── Internal helpers ──────────────────────────────────────────────────────────

function countMergedPrs(session: Session): number {
  return session.pull_requests.filter((pr) => pr.pr_status === 'merged').length
}

/** Returns null instead of Infinity/NaN when mergedPrs === 0. */
function safeEfficiency(acus: number, mergedPrs: number): number | null {
  if (mergedPrs === 0) return null
  return acus / mergedPrs
}

// ── JSON validation ───────────────────────────────────────────────────────────

export function validateSessionsData(raw: unknown): raw is SessionsData {
  if (typeof raw !== 'object' || raw === null) return false
  const obj = raw as Record<string, unknown>
  if (!Array.isArray(obj['sessions'])) return false
  const dr = obj['date_range']
  if (typeof dr !== 'object' || dr === null) return false
  const drObj = dr as Record<string, unknown>
  return typeof drObj['start'] === 'string' && typeof drObj['end'] === 'string'
}

// ── Core filter ───────────────────────────────────────────────────────────────

/**
 * Single source of truth for what sessions are "visible" given the active
 * filters. All derived computations operate on the result of this function.
 */
export function applyFilters(sessions: Session[], filters: FilterState): Session[] {
  const startDate = parseISO(filters.dateRange.start)
  const endDate = parseISO(filters.dateRange.end)

  return sessions.filter((session) => {
    if (!isInDateRange(session.created_at, startDate, endDate)) return false
    if (
      filters.selectedUsers.length > 0 &&
      !filters.selectedUsers.includes(session.user_email)
    ) {
      return false
    }
    return true
  })
}

// ── Summary KPIs ──────────────────────────────────────────────────────────────

export function computeSummaryMetrics(sessions: Session[]): SummaryMetrics {
  const totalSessions = sessions.length
  const totalAcus = sessions.reduce((sum, s) => sum + s.acu_used, 0)
  const totalMergedPrs = sessions.reduce((sum, s) => sum + countMergedPrs(s), 0)
  const sessionsWithMerge = sessions.filter((s) => countMergedPrs(s) > 0).length
  const pctSessionsWithMerge =
    totalSessions === 0 ? 0 : (sessionsWithMerge / totalSessions) * 100

  return {
    totalAcus,
    totalSessions,
    totalMergedPrs,
    acusPerMergedPr: safeEfficiency(totalAcus, totalMergedPrs),
    pctSessionsWithMerge,
  }
}

// ── Trend (time-series) ───────────────────────────────────────────────────────

/**
 * Produces an ordered array of TrendBuckets covering the full date range,
 * including buckets with zero activity so the chart x-axis has no gaps.
 */
export function computeTrendBuckets(
  sessions: Session[],
  dateRangeStart: Date,
  dateRangeEnd: Date,
  granularity: BucketGranularity,
): TrendBucket[] {
  const bucketMap = new Map<
    string,
    { acus: number; mergedPrs: number; periodStart: Date }
  >()

  for (const session of sessions) {
    const date = parseISO(session.created_at)
    const bucketStart = getBucketStart(date, granularity)
    const key = getBucketKey(bucketStart, granularity)
    const existing = bucketMap.get(key) ?? {
      acus: 0,
      mergedPrs: 0,
      periodStart: bucketStart,
    }
    existing.acus += session.acu_used
    existing.mergedPrs += countMergedPrs(session)
    bucketMap.set(key, existing)
  }

  const bucketStarts = getBucketStarts(dateRangeStart, dateRangeEnd, granularity)

  return bucketStarts.map((bucketStart) => {
    const key = getBucketKey(bucketStart, granularity)
    const data = bucketMap.get(key) ?? { acus: 0, mergedPrs: 0, periodStart: bucketStart }

    return {
      label: formatBucketLabel(bucketStart, granularity),
      periodStart: bucketStart,
      acus: data.acus,
      mergedPrs: data.mergedPrs,
      efficiency: safeEfficiency(data.acus, data.mergedPrs),
    }
  })
}

// ── Per-user efficiency ───────────────────────────────────────────────────────

/**
 * Returns rows sorted by efficiency ascending (best = lowest ACUs/PR first).
 * Users with null efficiency (0 merged PRs) sort to the end.
 */
export function computeUserEfficiency(sessions: Session[]): UserEfficiencyRow[] {
  const userMap = new Map<
    string,
    { userName: string; sessions: number; acus: number; mergedPrs: number }
  >()

  for (const session of sessions) {
    const key = session.user_email ?? '(unknown)'
    const existing = userMap.get(key) ?? {
      userName: session.user_name ?? '(unknown)',
      sessions: 0,
      acus: 0,
      mergedPrs: 0,
    }
    existing.sessions += 1
    existing.acus += session.acu_used
    existing.mergedPrs += countMergedPrs(session)
    userMap.set(key, existing)
  }

  const rows: UserEfficiencyRow[] = Array.from(userMap.entries()).map(
    ([email, data]) => ({
      userName: data.userName,
      userEmail: email,
      totalSessions: data.sessions,
      totalAcus: data.acus,
      mergedPrCount: data.mergedPrs,
      acusPerMergedPr: safeEfficiency(data.acus, data.mergedPrs),
    }),
  )

  rows.sort((a, b) => {
    if (a.acusPerMergedPr === null && b.acusPerMergedPr === null) return 0
    if (a.acusPerMergedPr === null) return 1
    if (b.acusPerMergedPr === null) return -1
    return a.acusPerMergedPr - b.acusPerMergedPr
  })

  return rows
}

// ── Session table rows ────────────────────────────────────────────────────────

export function computeSessionRows(sessions: Session[]): SessionRow[] {
  return sessions.map((session, index) => ({
    sessionId: `session-${index}-${session.created_at}`,
    date: parseISO(session.created_at),
    userName: session.user_name ?? '(unknown)',
    userEmail: session.user_email ?? '(unknown)',
    sessionName: session.session_name,
    acuUsed: session.acu_used,
    sessionUrl: session.url,
    mergedPrs: session.pull_requests.filter((pr) => pr.pr_status === 'merged'),
    allPrs: session.pull_requests,
  }))
}

// ── Adoption (unique users per period) ───────────────────────────────────────

/**
 * Computes per-bucket active users (MAU) and new users (first-ever session).
 *
 * - activeUsers: distinct user_emails in filteredSessions for the bucket.
 * - newUsers: users whose first-ever session (across ALL sessions, unfiltered)
 *   falls in this bucket. Uses allSessions so a user who joined in Feb/2025
 *   but is only searched from Mar/2025 is still correctly marked as "existing".
 */
export function computeAdoptionBuckets(
  allSessions: Session[],
  filteredSessions: Session[],
  dateRangeStart: Date,
  dateRangeEnd: Date,
  granularity: BucketGranularity,
): AdoptionBucket[] {
  // Build first-session-date map from ALL sessions (unfiltered)
  const firstSessionDate = new Map<string, Date>()
  for (const s of allSessions) {
    const date = parseISO(s.created_at)
    const email = s.user_email ?? '(unknown)'
    const existing = firstSessionDate.get(email)
    if (!existing || date < existing) {
      firstSessionDate.set(email, date)
    }
  }

  // Build per-bucket sets from filteredSessions
  const activeUsersMap = new Map<string, Set<string>>()
  const newUsersMap = new Map<string, Set<string>>()

  for (const s of filteredSessions) {
    const date = parseISO(s.created_at)
    const bucketStart = getBucketStart(date, granularity)
    const key = getBucketKey(bucketStart, granularity)
    const email = s.user_email ?? '(unknown)'

    if (!activeUsersMap.has(key)) activeUsersMap.set(key, new Set())
    activeUsersMap.get(key)!.add(email)

    const firstDate = firstSessionDate.get(email)
    if (firstDate) {
      const firstKey = getBucketKey(getBucketStart(firstDate, granularity), granularity)
      if (firstKey === key) {
        if (!newUsersMap.has(key)) newUsersMap.set(key, new Set())
        newUsersMap.get(key)!.add(email)
      }
    }
  }

  const bucketStarts = getBucketStarts(dateRangeStart, dateRangeEnd, granularity)

  return bucketStarts.map((bucketStart) => {
    const key = getBucketKey(bucketStart, granularity)
    return {
      label: formatBucketLabel(bucketStart, granularity),
      key,
      activeUsers: activeUsersMap.get(key)?.size ?? 0,
      newUsers: newUsersMap.get(key)?.size ?? 0,
    }
  })
}

// ── Unique users list (for filter dropdown — from unfiltered data) ─────────────

export function getUniqueUsers(sessions: Session[]): UniqueUser[] {
  const map = new Map<string, string>()
  for (const s of sessions) {
    map.set(s.user_email ?? '(unknown)', s.user_name ?? '(unknown)')
  }
  return Array.from(map.entries())
    .map(([email, name]) => ({ email, name }))
    .sort((a, b) => a.name.localeCompare(b.name))
}
