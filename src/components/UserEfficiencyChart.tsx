import { useState, useMemo } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import type { UserEfficiencyRow } from '@/types'

const TABLE_PAGE_SIZE = 25

interface UserEfficiencyChartProps {
  rows: UserEfficiencyRow[]
}

// ── Tooltip ───────────────────────────────────────────────────────────────────

interface TooltipPayloadItem {
  payload: UserEfficiencyRow & { _effValue: number }
}

interface CustomTooltipProps {
  active?: boolean
  payload?: TooltipPayloadItem[]
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload?.length) return null
  const row = payload[0].payload
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-md p-3 text-sm space-y-1 min-w-48">
      <p className="font-semibold text-gray-800">{row.userName}</p>
      <p className="text-xs text-gray-400">{row.userEmail}</p>
      <div className="border-t border-gray-100 pt-2 mt-2 space-y-1">
        <div className="flex justify-between gap-6">
          <span className="text-gray-500">ACUs/Merged PR</span>
          <span className="font-medium text-gray-900">
            {row.acusPerMergedPr === null ? 'No merged PRs' : row.acusPerMergedPr.toFixed(1)}
          </span>
        </div>
        <div className="flex justify-between gap-6">
          <span className="text-gray-500">Total ACUs</span>
          <span className="font-medium text-gray-900">{row.totalAcus.toFixed(1)}</span>
        </div>
        <div className="flex justify-between gap-6">
          <span className="text-gray-500">Merged PRs</span>
          <span className="font-medium text-gray-900">{row.mergedPrCount}</span>
        </div>
        <div className="flex justify-between gap-6">
          <span className="text-gray-500">Sessions</span>
          <span className="font-medium text-gray-900">{row.totalSessions}</span>
        </div>
      </div>
    </div>
  )
}

// ── Bar color ─────────────────────────────────────────────────────────────────

const NULL_SENTINEL = 0.001

function getBarColor(row: UserEfficiencyRow, allEfficiencies: number[]): string {
  if (row.acusPerMergedPr === null) return '#d1d5db'
  if (allEfficiencies.length === 0) return '#6366f1'
  const min = Math.min(...allEfficiencies)
  const max = Math.max(...allEfficiencies)
  if (max === min) return '#6366f1'
  const normalized = (row.acusPerMergedPr - min) / (max - min)
  if (normalized < 0.33) return '#10b981'
  if (normalized < 0.67) return '#6366f1'
  return '#f59e0b'
}

// ── Sort icon ─────────────────────────────────────────────────────────────────

type TableSortKey = 'userName' | 'totalSessions' | 'totalAcus' | 'mergedPrCount' | 'acusPerMergedPr'
type SortDir = 'asc' | 'desc'

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <span className="text-gray-300 ml-1">↕</span>
  return <span className="text-indigo-500 ml-1">{dir === 'asc' ? '↑' : '↓'}</span>
}

// ── Main component ────────────────────────────────────────────────────────────

export default function UserEfficiencyChart({ rows }: UserEfficiencyChartProps) {
  const [tableSortKey, setTableSortKey] = useState<TableSortKey>('acusPerMergedPr')
  const [tableSortDir, setTableSortDir] = useState<SortDir>('asc')
  const [tablePage, setTablePage] = useState(1)

  if (rows.length === 0) return null

  // Chart: top 20 by total ACUs, then sorted by efficiency for visual ranking
  const chartRows = useMemo(() => {
    return [...rows]
      .sort((a, b) => b.totalAcus - a.totalAcus)
      .slice(0, 20)
      .sort((a, b) => {
        if (a.acusPerMergedPr === null && b.acusPerMergedPr === null) return 0
        if (a.acusPerMergedPr === null) return 1
        if (b.acusPerMergedPr === null) return -1
        return a.acusPerMergedPr - b.acusPerMergedPr
      })
  }, [rows])

  const chartEfficiencies = chartRows
    .map((r) => r.acusPerMergedPr)
    .filter((v): v is number => v !== null)

  const chartData = chartRows.map((row) => ({
    ...row,
    _effValue: row.acusPerMergedPr ?? NULL_SENTINEL,
  }))

  const chartHeight = Math.max(180, chartRows.length * 36 + 60)
  const labelWidth = Math.min(160, Math.max(80, chartRows.reduce(
    (max, r) => Math.max(max, r.userName.length * 7), 0)
  ))

  // Table: sortable on all columns, paginated
  const sortedRows = useMemo(() => {
    return [...rows].sort((a, b) => {
      let cmp = 0
      switch (tableSortKey) {
        case 'userName':
          cmp = a.userName.localeCompare(b.userName)
          break
        case 'totalSessions':
          cmp = a.totalSessions - b.totalSessions
          break
        case 'totalAcus':
          cmp = a.totalAcus - b.totalAcus
          break
        case 'mergedPrCount':
          cmp = a.mergedPrCount - b.mergedPrCount
          break
        case 'acusPerMergedPr':
          if (a.acusPerMergedPr === null && b.acusPerMergedPr === null) cmp = 0
          else if (a.acusPerMergedPr === null) cmp = 1
          else if (b.acusPerMergedPr === null) cmp = -1
          else cmp = a.acusPerMergedPr - b.acusPerMergedPr
          break
      }
      return tableSortDir === 'asc' ? cmp : -cmp
    })
  }, [rows, tableSortKey, tableSortDir])

  const totalTablePages = Math.max(1, Math.ceil(sortedRows.length / TABLE_PAGE_SIZE))
  const safePage = Math.min(tablePage, totalTablePages)
  const pageRows = sortedRows.slice((safePage - 1) * TABLE_PAGE_SIZE, safePage * TABLE_PAGE_SIZE)

  const allEfficiencies = rows
    .map((r) => r.acusPerMergedPr)
    .filter((v): v is number => v !== null)

  function toggleTableSort(key: TableSortKey) {
    if (tableSortKey === key) {
      setTableSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setTableSortKey(key)
      setTableSortDir(key === 'userName' ? 'asc' : key === 'acusPerMergedPr' ? 'asc' : 'desc')
    }
    setTablePage(1)
  }

  function ThBtn({ label, col, className = '' }: { label: string; col: TableSortKey; className?: string }) {
    return (
      <th
        className={`py-2 px-4 text-xs font-medium text-gray-400 uppercase tracking-wide cursor-pointer select-none hover:text-gray-600 whitespace-nowrap ${className}`}
        onClick={() => toggleTableSort(col)}
      >
        {label}
        <SortIcon active={tableSortKey === col} dir={tableSortDir} />
      </th>
    )
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-8">
      {/* ── Chart ── */}
      <div>
        <div className="mb-4">
          <h2 className="text-base font-semibold text-gray-900">Efficiency by User</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Top 20 users by ACU usage, ranked by efficiency — lower ACUs/PR is better. Grey = no merged PRs.
          </p>
        </div>
        <ResponsiveContainer width="100%" height={chartHeight}>
          <BarChart
            layout="vertical"
            data={chartData}
            margin={{ top: 4, right: 48, left: 0, bottom: 4 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
            <XAxis
              type="number"
              tick={{ fontSize: 12, fill: '#6b7280' }}
              tickLine={false}
              axisLine={{ stroke: '#e5e7eb' }}
              label={{
                value: 'ACUs per merged PR',
                position: 'insideBottom',
                offset: -4,
                style: { fontSize: 11, fill: '#9ca3af' },
              }}
            />
            <YAxis
              type="category"
              dataKey="userName"
              width={labelWidth}
              tick={{ fontSize: 12, fill: '#374151' }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f9fafb' }} />
            <Bar dataKey="_effValue" name="ACUs/Merged PR" radius={[0, 3, 3, 0]} maxBarSize={28}>
              {chartData.map((row, index) => (
                <Cell key={index} fill={getBarColor(row, chartEfficiencies)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ── Table ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-700">All Users</h3>
          <p className="text-xs text-gray-400">
            {rows.length} users · showing {(safePage - 1) * TABLE_PAGE_SIZE + 1}–{Math.min(safePage * TABLE_PAGE_SIZE, sortedRows.length)} of {sortedRows.length}
          </p>
        </div>
        <div className="overflow-x-auto rounded-lg border border-gray-100">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <ThBtn label="User" col="userName" className="text-left" />
                <ThBtn label="Sessions" col="totalSessions" className="text-right" />
                <ThBtn label="Total ACUs" col="totalAcus" className="text-right" />
                <ThBtn label="Merged PRs" col="mergedPrCount" className="text-right" />
                <ThBtn label="ACUs / PR" col="acusPerMergedPr" className="text-right" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {pageRows.map((row) => (
                <tr key={row.userEmail} className="hover:bg-gray-50 transition-colors">
                  <td className="py-2 px-4">
                    <div className="font-medium text-gray-900">{row.userName}</div>
                    <div className="text-xs text-gray-400">{row.userEmail}</div>
                  </td>
                  <td className="py-2 px-4 text-right text-gray-600">{row.totalSessions}</td>
                  <td className="py-2 px-4 text-right text-gray-600">{row.totalAcus.toFixed(1)}</td>
                  <td className="py-2 px-4 text-right text-gray-600">{row.mergedPrCount}</td>
                  <td className="py-2 px-4 text-right font-semibold">
                    {row.acusPerMergedPr === null ? (
                      <span className="text-gray-300">—</span>
                    ) : (
                      <span className={
                        allEfficiencies.length > 1 && row.acusPerMergedPr === Math.min(...allEfficiencies)
                          ? 'text-emerald-600'
                          : 'text-gray-900'
                      }>
                        {row.acusPerMergedPr.toFixed(1)}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Table pagination */}
        {totalTablePages > 1 && (
          <div className="flex items-center justify-center gap-4 pt-3">
            <button
              onClick={() => setTablePage((p) => Math.max(1, p - 1))}
              disabled={safePage === 1}
              className="text-sm text-gray-500 hover:text-gray-800 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            >
              ← Prev
            </button>
            <span className="text-sm text-gray-500">
              Page <span className="font-medium text-gray-800">{safePage}</span> of{' '}
              <span className="font-medium text-gray-800">{totalTablePages}</span>
            </span>
            <button
              onClick={() => setTablePage((p) => Math.min(totalTablePages, p + 1))}
              disabled={safePage === totalTablePages}
              className="text-sm text-gray-500 hover:text-gray-800 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
