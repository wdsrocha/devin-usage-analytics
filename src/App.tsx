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
