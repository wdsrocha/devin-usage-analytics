import {
  startOfWeek,
  startOfMonth,
  format,
  isWithinInterval,
  parseISO,
  eachWeekOfInterval,
  eachMonthOfInterval,
} from 'date-fns'
import type { BucketGranularity } from '@/types'

/**
 * Returns an ordered list of bucket start dates covering the entire range,
 * including buckets with zero activity so charts have no gaps.
 */
export function getBucketStarts(
  start: Date,
  end: Date,
  granularity: BucketGranularity,
): Date[] {
  if (start > end) return []
  if (granularity === 'week') {
    return eachWeekOfInterval({ start, end }, { weekStartsOn: 1 })
  }
  return eachMonthOfInterval({ start, end })
}

/**
 * Returns the bucket start date (week or month) that contains the given date.
 */
export function getBucketStart(date: Date, granularity: BucketGranularity): Date {
  return granularity === 'week'
    ? startOfWeek(date, { weekStartsOn: 1 })
    : startOfMonth(date)
}

/**
 * Display label for a bucket.
 * Week  → "Jan 6"
 * Month → "Jan 2025"
 */
export function formatBucketLabel(date: Date, granularity: BucketGranularity): string {
  return granularity === 'week' ? format(date, 'MMM d') : format(date, 'MMM yyyy')
}

/**
 * Stable string key for a bucket (used as Map key).
 * Week  → "2025-W03"
 * Month → "2025-03"
 */
export function getBucketKey(date: Date, granularity: BucketGranularity): string {
  return granularity === 'week' ? format(date, "yyyy-'W'ww") : format(date, 'yyyy-MM')
}

/**
 * Returns true if the ISO string date falls within [start, end] inclusive.
 * Returns false for unparseable strings or inverted ranges (start > end).
 */
export function isInDateRange(isoString: string, start: Date, end: Date): boolean {
  if (start > end) return false
  try {
    const date = parseISO(isoString)
    return isWithinInterval(date, { start, end })
  } catch {
    return false
  }
}

/**
 * Formats a Date as "yyyy-MM-dd" for use in <input type="date"> values.
 */
export function toDateInputValue(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}
