'use client'
/**
 * CrisisClient — Crisis Event Management Dashboard
 *
 * Lists all unresolved crisis events. Admins can:
 * - View full trigger phrase and user details
 * - Mark events as resolved with optional notes
 * - Toggle between unresolved/resolved views
 */

import { useState, useTransition } from 'react'

export interface CrisisEvent {
  id: string
  user_id: string
  entry_id: string | null
  severity: 'low' | 'medium' | 'high' | 'crisis'
  trigger_phrase: string | null
  detected_tags: string[]
  response_sent: boolean
  resolved: boolean
  resolved_by: string | null
  resolved_at: string | null
  notes: string | null
  created_at: string
  users: {
    email: string | null
    display_name: string | null
    current_streak: number
  } | null
}

interface Props {
  initialEvents: CrisisEvent[]
  showResolved: boolean
}

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString(undefined, {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

const SEVERITY_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  low:    { bg: '#10B98122', text: '#10B981', label: 'Low' },
  medium: { bg: '#F59E0B22', text: '#F59E0B', label: 'Medium' },
  high:   { bg: '#EF444422', text: '#EF4444', label: 'High' },
  crisis: { bg: '#8B5CF622', text: '#8B5CF6', label: 'Crisis' },
}

function SeverityBadge({ severity }: { severity: string }) {
  const style = SEVERITY_STYLES[severity] ?? SEVERITY_STYLES.medium
  return (
    <span
      className="inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
      style={{ backgroundColor: style.bg, color: style.text }}
    >
      {style.label}
    </span>
  )
}

function ResolveModal({
  event,
  onClose,
  onResolved,
}: {
  event: CrisisEvent
  onClose: () => void
  onResolved: (id: string) => void
}) {
  const [notes, setNotes] = useState(event.notes ?? '')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  async function handleResolve() {
    setError(null)
    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/crisis?id=${event.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ resolved: true, notes: notes.trim() || null }),
        })
        if (!res.ok) {
          const data = await res.json()
          setError(data.error ?? 'Failed to resolve')
          return
        }
        onResolved(event.id)
        onClose()
      } catch {
        setError('Network error — please try again')
      }
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="bg-[#141620] border border-[#1E2030] rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <h2 className="text-lg font-semibold text-white mb-1">Resolve crisis event</h2>
        <p className="text-sm text-[#8B8FA8] mb-5">
          User: <span className="text-white">{event.users?.email ?? event.user_id}</span>
          {' · '}Severity: <SeverityBadge severity={event.severity} />
        </p>

        {event.trigger_phrase && (
          <div className="bg-[#0A0B0F] border border-[#2A2D3E] rounded-lg p-3 mb-5 text-sm text-[#C8CAD8] italic">
            &ldquo;{event.trigger_phrase}&rdquo;
          </div>
        )}

        <label className="block text-xs text-[#8B8FA8] uppercase tracking-wider mb-2">
          Resolution notes (optional)
        </label>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={3}
          placeholder="How was this handled? Any follow-up needed?"
          className="w-full bg-[#0A0B0F] border border-[#2A2D3E] rounded-lg px-3 py-2 text-sm text-white placeholder-[#4B4F6B] outline-none focus:border-[#7B6CF6] resize-none"
        />

        {error && (
          <p className="mt-2 text-sm text-red-400">{error}</p>
        )}

        <div className="flex items-center gap-3 mt-5">
          <button
            onClick={handleResolve}
            disabled={isPending}
            className="flex-1 bg-[#7B6CF6] hover:bg-[#6A5CE5] text-white text-sm font-semibold rounded-xl py-2.5 transition-colors disabled:opacity-50"
          >
            {isPending ? 'Resolving…' : 'Mark resolved'}
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-[#1E2030] hover:bg-[#252840] text-[#8B8FA8] text-sm font-semibold rounded-xl py-2.5 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

export function CrisisClient({ initialEvents, showResolved }: Props) {
  const [events, setEvents] = useState<CrisisEvent[]>(initialEvents)
  const [selectedEvent, setSelectedEvent] = useState<CrisisEvent | null>(null)

  function handleResolved(id: string) {
    setEvents(prev => prev.filter(e => e.id !== id))
  }

  const urgentCount = events.filter(e => e.severity === 'crisis' || e.severity === 'high').length

  return (
    <>
      {/* Stats strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        {[
          { label: 'Total',           value: events.length },
          { label: 'Critical / High', value: urgentCount },
          { label: 'Response sent',   value: events.filter(e => e.response_sent).length },
          { label: 'Pending review',  value: events.filter(e => !e.resolved).length },
        ].map(({ label, value }) => (
          <div key={label} className="bg-[#141620] border border-[#1E2030] rounded-xl p-4">
            <p className="text-[11px] text-[#8B8FA8] uppercase tracking-widest font-medium">{label}</p>
            <p className="text-2xl font-bold text-white mt-1 tabular-nums">{value}</p>
          </div>
        ))}
      </div>

      {/* Toggle resolved/unresolved */}
      <div className="flex items-center gap-3 mb-6">
        <a
          href="/admin/crisis"
          className={`text-sm px-4 py-2 rounded-lg transition-colors ${!showResolved ? 'bg-[#7B6CF6]/20 text-[#7B6CF6] font-medium' : 'text-[#8B8FA8] hover:text-white'}`}
        >
          Unresolved
        </a>
        <a
          href="/admin/crisis?resolved=true"
          className={`text-sm px-4 py-2 rounded-lg transition-colors ${showResolved ? 'bg-[#7B6CF6]/20 text-[#7B6CF6] font-medium' : 'text-[#8B8FA8] hover:text-white'}`}
        >
          Resolved
        </a>
      </div>

      {/* Event list */}
      {events.length === 0 ? (
        <div className="py-20 text-center">
          <p className="text-4xl mb-4">{showResolved ? '✓' : '✦'}</p>
          <p className="text-[#8B8FA8] text-sm">
            {showResolved ? 'No resolved events in this view' : 'No unresolved crisis events — all clear'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {events.map(event => (
            <div
              key={event.id}
              className="bg-[#141620] border border-[#1E2030] rounded-xl p-5 hover:border-[#2A2D3E] transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  {/* Meta row */}
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <SeverityBadge severity={event.severity} />
                    <span className="text-[11px] text-[#4B4F6B] tabular-nums">
                      {fmtDate(event.created_at)}
                    </span>
                    {event.response_sent && (
                      <span className="text-[11px] text-[#10B981] bg-[#10B98115] px-2 py-0.5 rounded-full">
                        Response sent
                      </span>
                    )}
                    {event.resolved && event.resolved_by && (
                      <span className="text-[11px] text-[#7B6CF6] bg-[#7B6CF615] px-2 py-0.5 rounded-full">
                        Resolved by {event.resolved_by.split('@')[0]}
                      </span>
                    )}
                  </div>

                  {/* User */}
                  <p className="text-sm text-white font-medium mb-1">
                    {event.users?.display_name ?? 'unnamed'}{' '}
                    <span className="text-[#8B8FA8] font-normal font-mono text-xs">
                      {event.users?.email ?? event.user_id}
                    </span>
                    {event.users?.current_streak ? (
                      <span className="text-[#F6A26C] ml-2 text-xs">
                        🔥 {event.users.current_streak} day streak
                      </span>
                    ) : null}
                  </p>

                  {/* Trigger phrase */}
                  {event.trigger_phrase && (
                    <p className="text-sm text-[#C8CAD8] italic bg-[#0A0B0F] rounded-lg px-3 py-2 border border-[#2A2D3E] mt-2 mb-2 line-clamp-2">
                      &ldquo;{event.trigger_phrase}&rdquo;
                    </p>
                  )}

                  {/* Tags */}
                  {event.detected_tags?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {event.detected_tags.map(tag => (
                        <span key={tag} className="text-[10px] bg-[#1E2030] text-[#8B8FA8] px-2 py-0.5 rounded-full">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Notes */}
                  {event.notes && (
                    <p className="text-xs text-[#4B4F6B] mt-2 bg-[#0A0B0F] px-3 py-2 rounded-lg border border-[#1E2030]">
                      Note: {event.notes}
                    </p>
                  )}
                </div>

                {/* Action */}
                {!event.resolved && (
                  <button
                    onClick={() => setSelectedEvent(event)}
                    className="shrink-0 text-xs bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/20 hover:bg-[#10B981]/20 rounded-lg px-3 py-1.5 font-medium transition-colors"
                  >
                    Resolve
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Resolve modal */}
      {selectedEvent && (
        <ResolveModal
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onResolved={handleResolved}
        />
      )}
    </>
  )
}
