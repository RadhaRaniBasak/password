'use client'

import type { MouseEvent, Ref } from 'react'
import { spokenLabel, spokenName } from '@/lib/names'
import { characterSetOf, type Mode } from '@/lib/password'
import { CHARACTER_COLORS, FOCUS_RING, Icon } from './ui'

const closeDialog = (event: MouseEvent<HTMLElement>) => event.currentTarget.closest('dialog')?.close()

/** Large type for reading a password aloud or typing it on a TV or phone. Memorable passwords go word by word. */
export function ReadOutDialog({ ref, password, mode }: { ref: Ref<HTMLDialogElement>; password: string; mode: Mode }) {
  const byWord = mode === 'memorable'

  return (
    <dialog
      ref={ref}
      aria-labelledby="read-out-title"
      onClick={(event) => {
        // A click on the dialog itself (not its content) is a click on the backdrop.
        if (event.target === event.currentTarget) event.currentTarget.close()
      }}
      className="m-auto max-h-[calc(100%-2rem)] w-[min(680px,calc(100%-2rem))] overflow-y-auto rounded-[28px] bg-shell p-0 text-ink shadow-card backdrop:bg-black/50"
    >
      <header className="flex items-center justify-between gap-3 px-6 pt-5 pb-4">
        <div className="flex items-center gap-2.5">
          <h2 id="read-out-title" className="text-base font-semibold tracking-tight">
            Read it out
          </h2>
          <span className="rounded-md bg-pill px-1.5 py-0.5 font-mono text-xs text-muted tabular-nums">
            {password.length} characters
          </span>
        </div>
        <button
          type="button"
          onClick={closeDialog}
          aria-label="Close"
          className={`grid size-9 place-items-center rounded-full bg-pill transition-colors hover:bg-pill-hover ${FOCUS_RING}`}
        >
          <Icon name="close" />
        </button>
      </header>

      <div className="mx-2.5 rounded-[20px] bg-panel px-6 py-5 shadow-panel">
        {byWord ? <WordCells password={password} /> : <CharacterCells password={password} />}
      </div>

      <footer className="flex items-center gap-3 px-6 pt-3.5 pb-4">
        <p className="flex-1 text-[13px] text-muted">
          {byWord ? 'Type a hyphen between the words' : 'Capitals are spelled in capitals, like KILO'}
        </p>
        <button
          type="button"
          onClick={closeDialog}
          className={`h-9 rounded-full bg-ink px-4 text-sm font-medium text-inverse transition hover:bg-ink/85 ${FOCUS_RING}`}
        >
          Done
        </button>
      </footer>
    </dialog>
  )
}

function CharacterCells({ password }: { password: string }) {
  return (
    <ol className="grid grid-cols-[repeat(auto-fill,minmax(68px,1fr))] gap-2">
      {Array.from(password, (char, index) => (
        <li key={index} className="flex flex-col items-center gap-1.5 rounded-xl bg-chip px-1 pt-3 pb-2 text-center">
          <span className="sr-only">{`${index + 1}: ${spokenLabel(char)}`}</span>
          <span aria-hidden="true" className={`font-mono text-3xl leading-none font-medium ${CHARACTER_COLORS[characterSetOf(char)]}`}>
            {char}
          </span>
          <span aria-hidden="true" className="text-[11px] leading-tight">
            {spokenName(char)}
          </span>
          <span aria-hidden="true" className="font-mono text-[10px] text-muted">
            {index + 1}
          </span>
        </li>
      ))}
    </ol>
  )
}

function WordCells({ password }: { password: string }) {
  return (
    <ol className="flex flex-col gap-2">
      {password.split('-').map((word, index) => {
        const isNumber = /^\d+$/.test(word)
        const note = isNumber
          ? [...word].map(spokenName).join(' ')
          : /^[A-Z]/.test(word)
            ? 'capital first letter'
            : 'all lowercase'
        return (
          <li key={index} className="flex flex-wrap items-baseline gap-x-4 gap-y-1 rounded-xl bg-chip px-4 py-3">
            <span className="w-4 font-mono text-[11px] text-muted">{index + 1}</span>
            <span className={`font-mono text-2xl font-medium ${isNumber ? 'text-accent' : ''}`}>{word}</span>
            <span className="ml-auto text-xs text-muted">{note}</span>
          </li>
        )
      })}
    </ol>
  )
}
