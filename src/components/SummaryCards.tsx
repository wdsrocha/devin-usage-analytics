import type { SummaryMetrics } from '@/types'

interface SummaryCardsProps {
  metrics: SummaryMetrics
}

interface CardProps {
  label: string
  value: string
  sub?: string
  highlight?: boolean
  dimmed?: boolean
}

function Card({ label, value, sub, highlight, dimmed }: CardProps) {
  return (
    <div
      className={`rounded-xl border p-5 flex flex-col gap-1 ${
        highlight
          ? 'bg-indigo-50 border-indigo-200'
          : dimmed
            ? 'bg-gray-50 border-gray-200'
            : 'bg-white border-gray-200'
      }`}
    >
      <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</span>
      <span
        className={`text-2xl font-bold ${
          highlight ? 'text-indigo-700' : dimmed ? 'text-gray-400' : 'text-gray-900'
        }`}
      >
        {value}
      </span>
      {sub && <span className="text-xs text-gray-400">{sub}</span>}
    </div>
  )
}

export default function SummaryCards({ metrics }: SummaryCardsProps) {
  const {
    totalAcus,
    totalSessions,
    totalMergedPrs,
    acusPerMergedPr,
    pctSessionsWithMerge,
  } = metrics

  const efficiencyValue =
    acusPerMergedPr === null
      ? '—'
      : acusPerMergedPr < 10
        ? acusPerMergedPr.toFixed(2)
        : acusPerMergedPr.toFixed(1)

  const efficiencySub =
    acusPerMergedPr === null ? 'No merged PRs in this period' : 'lower is better'

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      <Card
        label="Total ACUs"
        value={totalAcus.toFixed(1)}
        sub="Agent Compute Units consumed"
      />
      <Card
        label="Sessions"
        value={totalSessions.toLocaleString()}
        sub="total Devin sessions"
      />
      <Card
        label="Merged PRs"
        value={totalMergedPrs.toLocaleString()}
        sub="code actually shipped"
      />
      <Card
        label="ACUs / Merged PR"
        value={efficiencyValue}
        sub={efficiencySub}
        highlight={acusPerMergedPr !== null}
        dimmed={acusPerMergedPr === null}
      />
      <Card
        label="Sessions w/ Merge"
        value={`${pctSessionsWithMerge.toFixed(0)}%`}
        sub={`${metrics.totalSessions > 0 ? Math.round((pctSessionsWithMerge / 100) * totalSessions) : 0} of ${totalSessions} sessions`}
      />
    </div>
  )
}
