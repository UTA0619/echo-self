'use client'

import { useState } from 'react'
import { EntryComposer } from '@/components/echo/EntryComposer'
import { EntryCard } from '@/components/echo/EntryCard'
import type { Entry } from '@/lib/entries'

interface DashboardClientProps {
  initialEntries: Entry[]
}

export function DashboardClient({ initialEntries }: DashboardClientProps) {
  const [entries, setEntries] = useState<Entry[]>(initialEntries)
  const [newEntryIds, setNewEntryIds] = useState<Set<string>>(new Set())

  function handleEntryCreated(entry: Entry) {
    setEntries((prev) => {
      const exists = prev.some((e) => e.id === entry.id)
      if (exists) {
        // Update in place (AI response arrived via Realtime)
        return prev.map((e) => (e.id === entry.id ? entry : e))
      }
      // New entry — prepend and mark as new
      setNewEntryIds((ids) => new Set([...ids, entry.id]))
      return [entry, ...prev]
    })
  }

  return (
    <div className="space-y-6">
      <EntryComposer onEntryCreated={handleEntryCreated} />

      {entries.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs font-medium text-[#8B8FA8] uppercase tracking-widest">
            Recent
          </h2>
          {entries.map((entry) => (
            <EntryCard
              key={entry.id}
              entry={entry}
              isNew={newEntryIds.has(entry.id)}
            />
          ))}
        </section>
      )}

      {entries.length === 0 && (
        <p className="text-center text-sm text-[#8B8FA8] py-8">
          Your memory layer is ready. Write your first entry above.
        </p>
      )}
    </div>
  )
}
