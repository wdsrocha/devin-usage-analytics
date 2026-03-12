import { useState, useMemo, useCallback } from 'react'
import { parseISO } from 'date-fns'

import FileUpload from '@/components/FileUpload'
import Filters from '@/components/Filters'
import SummaryCards from '@/components/SummaryCards'
import TrendChart from '@/components/TrendChart'
import AdoptionChart from '@/components/AdoptionChart'
import UserEfficiencyChart from '@/components/UserEfficiencyChart'
import SessionTable from '@/components/SessionTable'

import {
  applyFilters,
  computeSummaryMetrics,
  computeTrendBuckets,
  computeAdoptionBuckets,
  computeUserEfficiency,
  computeSessionRows,
  getUniqueUsers,
} from '@/utils/metrics'

import type { SessionsData, FilterState, BucketGranularity } from '@/types'

function EmptyState({ filters }: { filters: FilterState }) {
  const userMsg =
    filters.selectedUsers.length > 0
      ? ` for ${filters.selectedUsers.length} selected user(s)`
      : ''
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="text-4xl mb-3">🔍</div>
      <p className="text-gray-600 font-medium">No sessions found</p>
      <p className="text-sm text-gray-400 mt-1">
        No sessions between {filters.dateRange.start} and {filters.dateRange.end}
        {userMsg}. Try adjusting your filters.
      </p>
    </div>
  )
}

export default function App() {
  const [data, setData] = useState<SessionsData | null>(null)
  const [filters, setFilters] = useState<FilterState | null>(null)
  const [granularity, setGranularity] = useState<BucketGranularity>('week')
  const [uploadError, setUploadError] = useState<string | null>(null)

  const handleDataLoaded = useCallback((incoming: SessionsData) => {
    setData(incoming)
    setUploadError(null)
    setFilters({
      dateRange: incoming.date_range,
      selectedUsers: [],
    })
  }, [])

  function resetFilters() {
    if (!data) return
    setFilters({ dateRange: data.date_range, selectedUsers: [] })
  }

  // Derived — all computed via useMemo, recomputed only when inputs change

  const availableUsers = useMemo(
    () => (data ? getUniqueUsers(data.sessions) : []),
    [data],
  )

  const filteredSessions = useMemo(
    () => (data && filters ? applyFilters(data.sessions, filters) : []),
    [data, filters],
  )

  const summaryMetrics = useMemo(
    () => computeSummaryMetrics(filteredSessions),
    [filteredSessions],
  )

  const trendBuckets = useMemo(() => {
    if (!filters) return []
    return computeTrendBuckets(
      filteredSessions,
      parseISO(filters.dateRange.start),
      parseISO(filters.dateRange.end),
      granularity,
    )
  }, [filteredSessions, filters, granularity])

  const adoptionBuckets = useMemo(() => {
    if (!data || !filters) return []
    return computeAdoptionBuckets(
      data.sessions,
      filteredSessions,
      parseISO(filters.dateRange.start),
      parseISO(filters.dateRange.end),
      granularity,
    )
  }, [data, filteredSessions, filters, granularity])

  const userEfficiency = useMemo(
    () => computeUserEfficiency(filteredSessions),
    [filteredSessions],
  )

  const sessionRows = useMemo(
    () => computeSessionRows(filteredSessions),
    [filteredSessions],
  )

  // ── Render: upload gate ────────────────────────────────────────────────────
  if (!data || !filters) {
    return (
      <FileUpload
        onDataLoaded={handleDataLoaded}
        onError={setUploadError}
        error={uploadError}
      />
    )
  }

  // ── Render: dashboard ──────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Devin Usage Analytics</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            {data.sessions.length.toLocaleString()} sessions · {data.date_range.start.slice(0, 10)} → {data.date_range.end.slice(0, 10)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="https://github.com/wdsrocha/devin-usage-analytics"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="View source on GitHub"
            className="text-gray-400 hover:text-gray-700 transition-colors p-1.5"
          >
            <svg viewBox="0 0 16 16" fill="currentColor" className="w-5 h-5" aria-hidden="true">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
            </svg>
          </a>
          <button
            onClick={() => {
              setData(null)
              setFilters(null)
              setUploadError(null)
            }}
            className="text-sm text-gray-400 hover:text-gray-600 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50 transition-colors cursor-pointer"
          >
            Load new file
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* Filters */}
        <Filters
          filters={filters}
          availableUsers={availableUsers}
          onFiltersChange={setFilters}
          onReset={resetFilters}
        />

        {filteredSessions.length === 0 ? (
          <EmptyState filters={filters} />
        ) : (
          <>
            {/* KPI Cards */}
            <SummaryCards metrics={summaryMetrics} />

            {/* Trend chart */}
            <TrendChart
              buckets={trendBuckets}
              granularity={granularity}
              onGranularityChange={setGranularity}
            />

            {/* Adoption chart */}
            <AdoptionChart
              buckets={adoptionBuckets}
              granularity={granularity}
              onGranularityChange={setGranularity}
            />

            {/* Per-user efficiency */}
            <UserEfficiencyChart rows={userEfficiency} />

            {/* Session drill-down */}
            <SessionTable rows={sessionRows} />
          </>
        )}
      </main>
    </div>
  )
}
