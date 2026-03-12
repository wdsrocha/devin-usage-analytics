import { useState, useMemo, useEffect } from 'react'
import { format } from 'date-fns'
import type { SessionRow, PullRequest } from '@/types'

const PAGE_SIZE = 25

interface SessionTableProps {
  rows: SessionRow[]
}

type SortKey = 'date' | 'userName' | 'acuUsed' | 'mergedPrCount'
type SortDir = 'asc' | 'desc'
type PrStatus = 'merged' | 'open' | 'closed' | 'none'

function PrBadge({ pr }: { pr: PullRequest }) {
  const colors: Record<PullRequest['pr_status'], string> = {
    merged: 'bg-purple-100 text-purple-700 border-purple-200',
    open:   'bg-green-100  text-green-700  border-green-200',
    closed: 'bg-gray-100   text-gray-500   border-gray-200',
  }
  const labels: Record<PullRequest['pr_status'], string> = {
    merged: 'Merged',
    open:   'Open',
    closed: 'Closed',
  }
  return (
    <a
      href={pr.pr_url}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-block text-xs border rounded px-1.5 py-0.5 hover:opacity-80 transition-opacity ${colors[pr.pr_status]}`}
    >
      {labels[pr.pr_status]}
    </a>
  )
}

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <span className="text-gray-300 ml-1">↕</span>
  return <span className="text-indigo-500 ml-1">{dir === 'asc' ? '↑' : '↓'}</span>
}

interface PaginationBarProps {
  currentPage: number
  totalPages: number
  onPrev: () => void
  onNext: () => void
}

function PaginationBar({ currentPage, totalPages, onPrev, onNext }: PaginationBarProps) {
  return (
    <div className="flex items-center justify-center gap-4 px-5 py-3 border-t border-gray-100">
      <button
        onClick={onPrev}
        disabled={currentPage === 1}
        className="text-sm text-gray-500 hover:text-gray-800 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
      >
        ← Prev
      </button>
      <span className="text-sm text-gray-500">
        Page <span className="font-medium text-gray-800">{currentPage}</span> of{' '}
        <span className="font-medium text-gray-800">{totalPages}</span>
      </span>
      <button
        onClick={onNext}
        disabled={currentPage === totalPages}
        className="text-sm text-gray-500 hover:text-gray-800 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
      >
        Next →
      </button>
    </div>
  )
}

const PR_STATUS_OPTIONS: { value: PrStatus; label: string }[] = [
  { value: 'merged', label: 'Merged' },
  { value: 'open',   label: 'Open' },
  { value: 'closed', label: 'Closed' },
  { value: 'none',   label: 'No PRs' },
]

export default function SessionTable({ rows }: SessionTableProps) {
  const [searchQuery, setSearchQuery]   = useState('')
  const [sortKey, setSortKey]           = useState<SortKey>('date')
  const [sortDir, setSortDir]           = useState<SortDir>('desc')
  const [currentPage, setCurrentPage]   = useState(1)
  const [acuMin, setAcuMin]             = useState('')
  const [acuMax, setAcuMax]             = useState('')
  const [prStatusFilter, setPrStatusFilter] = useState<Set<PrStatus>>(new Set())

  // Reset to page 1 when the incoming rows change (global filter changed)
  useEffect(() => { setCurrentPage(1) }, [rows])

  // Reset to page 1 when local filters change
  useEffect(() => { setCurrentPage(1) }, [acuMin, acuMax, prStatusFilter])

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir(key === 'date' ? 'desc' : 'asc')
    }
    setCurrentPage(1)
  }

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSearchQuery(e.target.value)
    setCurrentPage(1)
  }

  function togglePrStatus(status: PrStatus) {
    setPrStatusFilter((prev) => {
      const next = new Set(prev)
      if (next.has(status)) next.delete(status)
      else next.add(status)
      return next
    })
  }

  const hasActiveFilters = acuMin !== '' || acuMax !== '' || prStatusFilter.size > 0

  function clearFilters() {
    setAcuMin('')
    setAcuMax('')
    setPrStatusFilter(new Set())
  }

  const processed = useMemo(() => {
    const query = searchQuery.toLowerCase().trim()
    let result = rows

    // Text search
    if (query) {
      result = result.filter(
        (r) =>
          r.userName.toLowerCase().includes(query) ||
          r.userEmail.toLowerCase().includes(query) ||
          r.sessionName.toLowerCase().includes(query),
      )
    }

    // ACU range
    const minVal = acuMin !== '' ? parseFloat(acuMin) : null
    const maxVal = acuMax !== '' ? parseFloat(acuMax) : null
    if (minVal !== null && !isNaN(minVal)) result = result.filter((r) => r.acuUsed >= minVal)
    if (maxVal !== null && !isNaN(maxVal)) result = result.filter((r) => r.acuUsed <= maxVal)

    // PR status (OR logic)
    if (prStatusFilter.size > 0) {
      result = result.filter((r) => {
        if (prStatusFilter.has('none')   && r.allPrs.length === 0) return true
        if (prStatusFilter.has('merged') && r.allPrs.some((p) => p.pr_status === 'merged')) return true
        if (prStatusFilter.has('open')   && r.allPrs.some((p) => p.pr_status === 'open'))   return true
        if (prStatusFilter.has('closed') && r.allPrs.some((p) => p.pr_status === 'closed')) return true
        return false
      })
    }

    return [...result].sort((a, b) => {
      let cmp = 0
      switch (sortKey) {
        case 'date':
          cmp = a.date.getTime() - b.date.getTime()
          break
        case 'userName':
          cmp = (a.userName ?? '').localeCompare(b.userName ?? '')
          break
        case 'acuUsed':
          cmp = a.acuUsed - b.acuUsed
          break
        case 'mergedPrCount':
          cmp = a.mergedPrs.length - b.mergedPrs.length
          break
      }
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [rows, searchQuery, acuMin, acuMax, prStatusFilter, sortKey, sortDir])

  const totalPages = Math.max(1, Math.ceil(processed.length / PAGE_SIZE))
  const safePage = Math.min(currentPage, totalPages)
  const pageRows = processed.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  const firstItem = processed.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1
  const lastItem = Math.min(safePage * PAGE_SIZE, processed.length)

  function ThBtn({ label, col, className = '' }: { label: string; col: SortKey; className?: string }) {
    return (
      <th
        className={`text-left py-3 px-4 text-xs font-medium text-gray-400 uppercase tracking-wide cursor-pointer select-none hover:text-gray-600 whitespace-nowrap ${className}`}
        onClick={() => toggleSort(col)}
      >
        {label}
        <SortIcon active={sortKey === col} dir={sortDir} />
      </th>
    )
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-gray-100">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Session Details</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {processed.length === 0
                ? 'No sessions'
                : `Showing ${firstItem}–${lastItem} of ${processed.length.toLocaleString()}`}
              {processed.length !== rows.length && ` (filtered from ${rows.length.toLocaleString()})`}
            </p>
          </div>
          <input
            type="search"
            placeholder="Search by user or session name…"
            value={searchQuery}
            onChange={handleSearchChange}
            className="text-sm border border-gray-300 rounded-lg px-3 py-2 w-64 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Filter bar */}
        <div className="mt-3 flex items-center gap-4 flex-wrap">
          {/* ACU range */}
          <div className="flex items-center gap-1.5 text-sm text-gray-500">
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">ACUs</span>
            <input
              type="number"
              min="0"
              placeholder="Min"
              value={acuMin}
              onChange={(e) => setAcuMin(e.target.value)}
              className="w-20 text-sm border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <span className="text-gray-300">–</span>
            <input
              type="number"
              min="0"
              placeholder="Max"
              value={acuMax}
              onChange={(e) => setAcuMax(e.target.value)}
              className="w-20 text-sm border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Divider */}
          <div className="h-5 w-px bg-gray-200" />

          {/* PR Status pills */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">PR Status</span>
            {PR_STATUS_OPTIONS.map(({ value, label }) => {
              const active = prStatusFilter.has(value)
              return (
                <button
                  key={value}
                  onClick={() => togglePrStatus(value)}
                  className={`text-xs px-2.5 py-1 rounded-full border cursor-pointer transition-colors ${
                    active
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white text-gray-500 border-gray-300 hover:border-indigo-400 hover:text-indigo-600'
                  }`}
                >
                  {label}
                </button>
              )
            })}
          </div>

          {/* Clear filters */}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-xs text-gray-400 hover:text-gray-700 cursor-pointer transition-colors ml-auto"
            >
              Clear filters ×
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <ThBtn label="Date" col="date" />
              <ThBtn label="User" col="userName" />
              <th className="text-left py-3 px-4 text-xs font-medium text-gray-400 uppercase tracking-wide whitespace-nowrap">
                Session
              </th>
              <ThBtn label="ACUs" col="acuUsed" className="text-right" />
              <ThBtn label="Merged PRs" col="mergedPrCount" />
              <th className="text-left py-3 px-4 text-xs font-medium text-gray-400 uppercase tracking-wide">
                All PRs
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {pageRows.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-sm text-gray-400">
                  No sessions match your filters.
                </td>
              </tr>
            ) : (
              pageRows.map((row) => (
                <tr key={row.sessionId} className="hover:bg-gray-50 transition-colors">
                  <td className="py-3 px-4 text-sm text-gray-500 whitespace-nowrap">
                    {format(row.date, 'MMM d, yyyy')}
                  </td>
                  <td className="py-3 px-4">
                    <div className="text-sm font-medium text-gray-800">{row.userName}</div>
                    <div className="text-xs text-gray-400">{row.userEmail}</div>
                  </td>
                  <td className="py-3 px-4 max-w-xs">
                    <a
                      href={row.sessionUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-indigo-600 hover:text-indigo-800 hover:underline line-clamp-2"
                      title={row.sessionName}
                    >
                      {row.sessionName}
                    </a>
                  </td>
                  <td className="py-3 px-4 text-sm text-right font-mono text-gray-700 whitespace-nowrap">
                    {row.acuUsed.toFixed(2)}
                  </td>
                  <td className="py-3 px-4">
                    {row.mergedPrs.length === 0 ? (
                      <span className="text-xs text-gray-300">—</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {row.mergedPrs.map((pr, i) => <PrBadge key={i} pr={pr} />)}
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    {row.allPrs.length === 0 ? (
                      <span className="text-xs text-gray-300">None</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {row.allPrs
                          .filter((pr) => pr.pr_status !== 'merged')
                          .map((pr, i) => <PrBadge key={i} pr={pr} />)}
                        {row.allPrs.filter((pr) => pr.pr_status !== 'merged').length === 0 && (
                          <span className="text-xs text-gray-300">—</span>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <PaginationBar
          currentPage={safePage}
          totalPages={totalPages}
          onPrev={() => setCurrentPage((p) => Math.max(1, p - 1))}
          onNext={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
        />
      )}
    </div>
  )
}
