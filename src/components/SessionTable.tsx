import { useState, useMemo } from 'react'
import { format } from 'date-fns'
import type { SessionRow, PullRequest } from '@/types'

interface SessionTableProps {
  rows: SessionRow[]
}

type SortKey = 'date' | 'userName' | 'acuUsed' | 'mergedPrCount'
type SortDir = 'asc' | 'desc'

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

export default function SessionTable({ rows }: SessionTableProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('date')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir(key === 'date' ? 'desc' : 'asc')
    }
  }

  const processed = useMemo(() => {
    const query = searchQuery.toLowerCase().trim()

    let result = rows
    if (query) {
      result = rows.filter(
        (r) =>
          r.userName.toLowerCase().includes(query) ||
          r.userEmail.toLowerCase().includes(query) ||
          r.sessionName.toLowerCase().includes(query),
      )
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
  }, [rows, searchQuery, sortKey, sortDir])

  function ThBtn({
    label,
    col,
    className = '',
  }: {
    label: string
    col: SortKey
    className?: string
  }) {
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
      <div className="p-5 border-b border-gray-100 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Session Details</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            {processed.length} of {rows.length} sessions
          </p>
        </div>
        <input
          type="search"
          placeholder="Search by user or session name…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="text-sm border border-gray-300 rounded-lg px-3 py-2 w-64 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
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
            {processed.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-sm text-gray-400">
                  No sessions match your search.
                </td>
              </tr>
            ) : (
              processed.map((row) => (
                <tr key={row.sessionId} className="hover:bg-gray-50 transition-colors">
                  {/* Date */}
                  <td className="py-3 px-4 text-sm text-gray-500 whitespace-nowrap">
                    {format(row.date, 'MMM d, yyyy')}
                  </td>

                  {/* User */}
                  <td className="py-3 px-4">
                    <div className="text-sm font-medium text-gray-800">{row.userName}</div>
                    <div className="text-xs text-gray-400">{row.userEmail}</div>
                  </td>

                  {/* Session name */}
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

                  {/* ACUs */}
                  <td className="py-3 px-4 text-sm text-right font-mono text-gray-700 whitespace-nowrap">
                    {row.acuUsed.toFixed(2)}
                  </td>

                  {/* Merged PRs count + links */}
                  <td className="py-3 px-4">
                    {row.mergedPrs.length === 0 ? (
                      <span className="text-xs text-gray-300">—</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {row.mergedPrs.map((pr, i) => (
                          <PrBadge key={i} pr={pr} />
                        ))}
                      </div>
                    )}
                  </td>

                  {/* All PRs */}
                  <td className="py-3 px-4">
                    {row.allPrs.length === 0 ? (
                      <span className="text-xs text-gray-300">None</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {row.allPrs
                          .filter((pr) => pr.pr_status !== 'merged')
                          .map((pr, i) => (
                            <PrBadge key={i} pr={pr} />
                          ))}
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
    </div>
  )
}
