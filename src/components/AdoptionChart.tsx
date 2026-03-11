import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import type { AdoptionBucket, BucketGranularity } from '@/types'

interface AdoptionChartProps {
  buckets: AdoptionBucket[]
  granularity: BucketGranularity
  onGranularityChange: (g: BucketGranularity) => void
}

interface TooltipPayloadItem {
  name: string
  value: number
  color: string
}

interface CustomTooltipProps {
  active?: boolean
  label?: string
  payload?: TooltipPayloadItem[]
}

function CustomTooltip({ active, label, payload }: CustomTooltipProps) {
  if (!active || !payload?.length) return null

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-md p-3 text-sm space-y-1.5 min-w-40">
      <p className="font-semibold text-gray-700 border-b border-gray-100 pb-1.5 mb-1.5">
        {label}
      </p>
      {payload.map((item) => (
        <div key={item.name} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-gray-500">
            <span
              className="inline-block w-2.5 h-2.5 rounded-sm"
              style={{ backgroundColor: item.color }}
            />
            {item.name}
          </span>
          <span className="font-medium text-gray-900">{item.value.toLocaleString()}</span>
        </div>
      ))}
    </div>
  )
}

export default function AdoptionChart({
  buckets,
  granularity,
  onGranularityChange,
}: AdoptionChartProps) {
  const hasData = buckets.some((b) => b.activeUsers > 0)

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-base font-semibold text-gray-900">User Adoption Over Time</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Monthly active users — line shows new users (first session ever)
          </p>
        </div>
        <div className="flex rounded-lg border border-gray-200 overflow-hidden">
          {(['week', 'month'] as BucketGranularity[]).map((g) => (
            <button
              key={g}
              onClick={() => onGranularityChange(g)}
              className={`px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                granularity === g
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-gray-500 hover:bg-gray-50'
              }`}
            >
              {g === 'week' ? 'Weekly' : 'Monthly'}
            </button>
          ))}
        </div>
      </div>

      {!hasData ? (
        <div className="h-64 flex items-center justify-center text-gray-400 text-sm">
          No activity in this period
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={320}>
          <ComposedChart data={buckets} margin={{ top: 4, right: 24, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 12, fill: '#6b7280' }}
              tickLine={false}
              axisLine={{ stroke: '#e5e7eb' }}
            />
            <YAxis
              yAxisId="active"
              orientation="left"
              tick={{ fontSize: 12, fill: '#6b7280' }}
              tickLine={false}
              axisLine={false}
              label={{
                value: 'Active Users',
                angle: -90,
                position: 'insideLeft',
                style: { fontSize: 11, fill: '#9ca3af' },
                offset: 10,
              }}
            />
            <YAxis
              yAxisId="new"
              orientation="right"
              tick={{ fontSize: 12, fill: '#6b7280' }}
              tickLine={false}
              axisLine={false}
              label={{
                value: 'New Users',
                angle: 90,
                position: 'insideRight',
                style: { fontSize: 11, fill: '#9ca3af' },
                offset: 12,
              }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: 12, paddingTop: 16 }}
              iconType="circle"
              iconSize={8}
            />
            <Bar
              yAxisId="active"
              dataKey="activeUsers"
              name="Active Users"
              fill="#818cf8"
              radius={[2, 2, 0, 0]}
              maxBarSize={48}
            />
            <Line
              yAxisId="new"
              dataKey="newUsers"
              name="New Users"
              stroke="#10b981"
              strokeWidth={2}
              dot={{ r: 3, fill: '#10b981' }}
              activeDot={{ r: 5 }}
              connectNulls={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
