import { parseISO, format } from 'date-fns'
import type { FilterState, UniqueUser } from '@/types'

function toDateInput(iso: string): string {
  try { return format(parseISO(iso), 'yyyy-MM-dd') } catch { return iso }
}

interface FiltersProps {
  filters: FilterState
  availableUsers: UniqueUser[]
  onFiltersChange: (next: FilterState) => void
  onReset: () => void
}

export default function Filters({
  filters,
  availableUsers,
  onFiltersChange,
  onReset,
}: FiltersProps) {
  function handleStartChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newStart = e.target.value
    // If start > end, clamp end to start
    const newEnd = newStart > filters.dateRange.end ? newStart : filters.dateRange.end
    onFiltersChange({ ...filters, dateRange: { start: newStart, end: newEnd } })
  }

  function handleEndChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newEnd = e.target.value
    // If end < start, clamp start to end
    const newStart = newEnd < filters.dateRange.start ? newEnd : filters.dateRange.start
    onFiltersChange({ ...filters, dateRange: { start: newStart, end: newEnd } })
  }

  function toggleUser(email: string) {
    const selected = filters.selectedUsers
    const next = selected.includes(email)
      ? selected.filter((e) => e !== email)
      : [...selected, email]
    onFiltersChange({ ...filters, selectedUsers: next })
  }

  function clearUsers() {
    onFiltersChange({ ...filters, selectedUsers: [] })
  }

  const activeUserCount = filters.selectedUsers.length

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-wrap gap-6 items-start">
      {/* Date range */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm font-medium text-gray-700 whitespace-nowrap">Date range</span>
        <input
          type="date"
          value={toDateInput(filters.dateRange.start)}
          onChange={handleStartChange}
          className="text-sm border border-gray-300 rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <span className="text-gray-400 text-sm">→</span>
        <input
          type="date"
          value={toDateInput(filters.dateRange.end)}
          onChange={handleEndChange}
          className="text-sm border border-gray-300 rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* User filter */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-gray-700 whitespace-nowrap">
          Users
          {activeUserCount > 0 && (
            <span className="ml-1 text-xs bg-indigo-100 text-indigo-700 rounded-full px-1.5 py-0.5">
              {activeUserCount}
            </span>
          )}
        </span>
        <div className="flex flex-wrap gap-1.5">
          {availableUsers.map((user) => {
            const active = filters.selectedUsers.includes(user.email)
            return (
              <button
                key={user.email}
                onClick={() => toggleUser(user.email)}
                title={user.email}
                className={`text-xs rounded-full px-2.5 py-1 border transition-colors cursor-pointer ${
                  active
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-gray-600 border-gray-300 hover:border-indigo-400 hover:text-indigo-600'
                }`}
              >
                {user.name}
              </button>
            )
          })}
          {activeUserCount > 0 && (
            <button
              onClick={clearUsers}
              className="text-xs text-gray-400 hover:text-gray-600 px-1 cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Reset to full range */}
      <div className="ml-auto">
        <button
          onClick={onReset}
          className="text-xs text-gray-400 hover:text-gray-600 underline cursor-pointer"
        >
          Reset filters
        </button>
      </div>
    </div>
  )
}
