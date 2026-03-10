import { useRef, useState, useEffect } from 'react'
import { parseISO, format } from 'date-fns'
import type { FilterState, UniqueUser } from '@/types'

function toDateInput(iso: string): string {
  try { return format(parseISO(iso), 'yyyy-MM-dd') } catch { return iso }
}

// ── UserCombobox ──────────────────────────────────────────────────────────────

interface UserComboboxProps {
  availableUsers: UniqueUser[]
  selectedUsers: string[]
  onToggle: (email: string) => void
  onClear: () => void
}

function UserCombobox({ availableUsers, selectedUsers, onToggle, onClear }: UserComboboxProps) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const filtered = availableUsers.filter(
    (u) =>
      u.name.toLowerCase().includes(query.toLowerCase()) ||
      u.email.toLowerCase().includes(query.toLowerCase()),
  )

  const count = selectedUsers.length

  return (
    <div ref={wrapperRef} className="relative">
      {/* Input trigger */}
      <div
        className={`flex items-center gap-2 border rounded-lg px-3 py-1.5 cursor-text bg-white min-w-52 ${
          open ? 'border-indigo-500 ring-2 ring-indigo-100' : 'border-gray-300'
        }`}
        onClick={() => setOpen(true)}
      >
        <svg className="w-3.5 h-3.5 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
        </svg>
        <input
          type="text"
          className="text-sm outline-none bg-transparent flex-1 min-w-0 placeholder-gray-400"
          placeholder={count > 0 ? `${count} user${count > 1 ? 's' : ''} selected` : 'Search users…'}
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
        />
        {count > 0 && (
          <button
            onMouseDown={(e) => { e.stopPropagation(); onClear(); setQuery('') }}
            className="text-xs text-gray-400 hover:text-gray-600 cursor-pointer shrink-0"
          >
            Clear
          </button>
        )}
      </div>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 top-full left-0 mt-1 w-72 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
          <div className="max-h-60 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="px-4 py-3 text-sm text-gray-400">No users found</div>
            ) : (
              filtered.map((user) => {
                const checked = selectedUsers.includes(user.email)
                return (
                  <label
                    key={user.email}
                    className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => onToggle(user.email)}
                      className="accent-indigo-600 shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-gray-800 truncate">{user.name}</div>
                      <div className="text-xs text-gray-400 truncate">{user.email}</div>
                    </div>
                  </label>
                )
              })
            )}
          </div>
          {filtered.length > 0 && (
            <div className="px-3 py-2 border-t border-gray-100 text-xs text-gray-400">
              {filtered.length} of {availableUsers.length} users
            </div>
          )}
        </div>
      )}

      {/* Selected chips */}
      {count > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {selectedUsers.map((email) => {
            const user = availableUsers.find((u) => u.email === email)
            return (
              <span
                key={email}
                className="inline-flex items-center gap-1 text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full px-2 py-0.5"
              >
                {user?.name ?? email}
                <button
                  onClick={() => onToggle(email)}
                  className="hover:text-indigo-900 cursor-pointer leading-none"
                >
                  ×
                </button>
              </span>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Filters ───────────────────────────────────────────────────────────────────

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
    const newEnd = newStart > filters.dateRange.end ? newStart : filters.dateRange.end
    onFiltersChange({ ...filters, dateRange: { start: newStart, end: newEnd } })
  }

  function handleEndChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newEnd = e.target.value
    const newStart = newEnd < filters.dateRange.start ? newEnd : filters.dateRange.start
    onFiltersChange({ ...filters, dateRange: { start: newStart, end: newEnd } })
  }

  function toggleUser(email: string) {
    const next = filters.selectedUsers.includes(email)
      ? filters.selectedUsers.filter((e) => e !== email)
      : [...filters.selectedUsers, email]
    onFiltersChange({ ...filters, selectedUsers: next })
  }

  function clearUsers() {
    onFiltersChange({ ...filters, selectedUsers: [] })
  }

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

      {/* User combobox */}
      <div className="flex items-start gap-3">
        <span className="text-sm font-medium text-gray-700 whitespace-nowrap pt-1.5">Users</span>
        <UserCombobox
          availableUsers={availableUsers}
          selectedUsers={filters.selectedUsers}
          onToggle={toggleUser}
          onClear={clearUsers}
        />
      </div>

      {/* Reset */}
      <div className="ml-auto pt-1">
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
