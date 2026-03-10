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

interface UserEfficiencyChartProps {
  rows: UserEfficiencyRow[]
}

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

// Sentinel value for users with no merged PRs — used only for rendering the bar
const NULL_SENTINEL = 0.001

function getBarColor(row: UserEfficiencyRow, allEfficiencies: number[]): string {
  if (row.acusPerMergedPr === null) return '#d1d5db' // grey — no merged PRs

  if (allEfficiencies.length === 0) return '#6366f1'

  const min = Math.min(...allEfficiencies)
  const max = Math.max(...allEfficiencies)

  if (max === min) return '#6366f1'

  // Normalize 0–1 (0 = best = lowest ACUs/PR)
  const normalized = (row.acusPerMergedPr - min) / (max - min)

  if (normalized < 0.33) return '#10b981' // green — efficient
  if (normalized < 0.67) return '#6366f1' // indigo — mid
  return '#f59e0b'                         // amber — expensive
}

export default function UserEfficiencyChart({ rows }: UserEfficiencyChartProps) {
  if (rows.length === 0) return null

  const efficiencies = rows
    .map((r) => r.acusPerMergedPr)
    .filter((v): v is number => v !== null)

  // Chart data: use sentinel for null so bars appear
  const chartData = rows.map((row) => ({
    ...row,
    _effValue: row.acusPerMergedPr ?? NULL_SENTINEL,
  }))

  const barHeight = 36
  const chartHeight = Math.max(180, rows.length * barHeight + 60)
  const labelWidth = Math.min(160, Math.max(80, rows.reduce((max, r) => Math.max(max, r.userName.length * 7), 0)))

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-gray-900">Efficiency by User</h2>
        <p className="text-xs text-gray-400 mt-0.5">
          ACUs per merged PR — lower is better. Grey = no merged PRs.
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
              <Cell key={index} fill={getBarColor(row, efficiencies)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Data table */}
      <div className="mt-6 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-gray-400 uppercase tracking-wide border-b border-gray-100">
              <th className="text-left pb-2 pr-4 font-medium">User</th>
              <th className="text-right pb-2 px-4 font-medium">Sessions</th>
              <th className="text-right pb-2 px-4 font-medium">Total ACUs</th>
              <th className="text-right pb-2 px-4 font-medium">Merged PRs</th>
              <th className="text-right pb-2 pl-4 font-medium">ACUs / PR</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {rows.map((row) => (
              <tr key={row.userEmail} className="hover:bg-gray-50 transition-colors">
                <td className="py-2 pr-4">
                  <div className="font-medium text-gray-900">{row.userName}</div>
                  <div className="text-xs text-gray-400">{row.userEmail}</div>
                </td>
                <td className="py-2 px-4 text-right text-gray-600">{row.totalSessions}</td>
                <td className="py-2 px-4 text-right text-gray-600">
                  {row.totalAcus.toFixed(1)}
                </td>
                <td className="py-2 px-4 text-right text-gray-600">{row.mergedPrCount}</td>
                <td className="py-2 pl-4 text-right font-semibold">
                  {row.acusPerMergedPr === null ? (
                    <span className="text-gray-300">—</span>
                  ) : (
                    <span
                      className={
                        efficiencies.length > 1 &&
                        row.acusPerMergedPr === Math.min(...efficiencies)
                          ? 'text-emerald-600'
                          : 'text-gray-900'
                      }
                    >
                      {row.acusPerMergedPr.toFixed(1)}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
