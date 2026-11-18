'use client'

import { useState } from 'react'
import type { Mode } from '@/lib/password'
import { Card, FOCUS_RING, Icon } from './ui'

export const HISTORY_SIZE = 10

export type HistoryEntry = { id: number; password: string; mode: Mode; bits: number; time: string; copied: boolean }

/** Recent passwords, Logs-card style. Lives only in this tab's memory: nothing is written to storage. */
export function HistoryCard({
  entries,
  onCopy,
  onClear,
}: {
  entries: HistoryEntry[]
  onCopy: (entry: HistoryEntry) => Promise<boolean>
  onClear: () => void
}) {
  const [copiedId, setCopiedId] = useState<number | null>(null)

  async function copy(entry: HistoryEntry) {
    if (await onCopy(entry)) {
      setCopiedId(entry.id)
      setTimeout(() => setCopiedId((id) => (id === entry.id ? null : id)), 2000)
    }
  }

  return (
    <Card
      title="History"
      badge="this tab only"
      action={
        <button
          type="button"
          onClick={onClear}
          disabled={!entries.length}
          className={`h-8 rounded-full bg-ink px-3.5 text-[13px] font-medium text-inverse transition hover:bg-ink/85 disabled:opacity-40 ${FOCUS_RING}`}
        >
          Clear
        </button>
      }
      footer={
        <>
          <p className="font-mono text-xs text-muted">
            {entries.length} of {HISTORY_SIZE} kept
          </p>
          <p className="ml-auto font-mono text-xs text-muted">never written to disk</p>
        </>
      }
    >
      {entries.length ? (
        <ol aria-label="Recent passwords" className="-mx-6 py-2.5 font-mono text-[12.5px]">
          {entries.map((entry) => (
            <li key={entry.id} className="relative flex items-center gap-3 px-6 py-1">
              {entry.copied && (
                <span aria-hidden="true" className="absolute inset-y-1.5 left-2.5 w-0.5 rounded-full bg-accent" />
              )}
              <span className="text-muted tabular-nums">{entry.time}</span>
              <span className="hidden w-[76px] text-[11px] tracking-wide text-muted uppercase sm:inline">{entry.mode}</span>
              <span className="min-w-0 flex-1 truncate">{entry.password}</span>
              <span className="shrink-0 text-muted tabular-nums">{Math.floor(entry.bits)} bits</span>
              {entry.copied && <span className="sr-only">(copied)</span>}
              <button
                type="button"
                onClick={() => void copy(entry)}
                aria-label={`Copy the ${entry.mode} password from ${entry.time}`}
                className={`grid size-7 shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-chip hover:text-ink ${FOCUS_RING}`}
              >
                <Icon name={copiedId === entry.id ? 'check' : 'copy'} size={13} />
              </button>
            </li>
          ))}
        </ol>
      ) : (
        <p className="py-8 text-center text-[13px] text-muted">Passwords you generate past or copy show up here.</p>
      )}
    </Card>
  )
}
