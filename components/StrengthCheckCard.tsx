'use client'

import { useState, type ReactNode } from 'react'
import type { CheckResult } from '@/lib/check'
import { strengthLevel } from '@/lib/password'
import { Card, Divider, FIELD, FOCUS_RING, Icon, LABEL, StrengthMeter } from './ui'

type Checker = (password: string) => CheckResult

/** Rates a password someone already uses, with zxcvbn, entirely in the browser. Nothing is stored or sent. */
export function StrengthCheckCard() {
  const [value, setValue] = useState('')
  const [visible, setVisible] = useState(false)
  const [checker, setChecker] = useState<Checker | null>(null)
  const [failed, setFailed] = useState(false)

  // The word lists are large, so they load the first time the field is used.
  function loadChecker() {
    if (checker || failed) return
    import('@/lib/check')
      .then((module) => setChecker(() => module.checkPassword))
      .catch(() => setFailed(true))
  }

  const result = value && checker ? checker(value) : null

  return (
    <Card
      title="Check a password"
      badge="zxcvbn"
      footer={<p className="text-[13px] text-muted">Checked on this device · nothing is sent or saved</p>}
    >
      <div className="flex flex-col gap-4 py-5">
        <div className="flex gap-2">
          <label htmlFor="check-password" className="sr-only">
            Password to check
          </label>
          <input
            id="check-password"
            type={visible ? 'text' : 'password'}
            value={value}
            onChange={(event) => {
              setValue(event.target.value)
              loadChecker()
            }}
            onFocus={loadChecker}
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            placeholder="Type or paste a password"
            className={FIELD}
          />
          <button
            type="button"
            onClick={() => setVisible(!visible)}
            aria-label="Show password"
            aria-pressed={visible}
            className={`grid size-11 shrink-0 place-items-center rounded-xl bg-chip text-muted transition-colors hover:text-ink ${FOCUS_RING}`}
          >
            <Icon name={visible ? 'eyeOff' : 'eye'} />
          </button>
        </div>
        <StrengthMeter level={result ? strengthLevel(result.bits) : 0} />
      </div>

      <Divider />

      <dl className="grid grid-cols-3 py-4">
        <Stat label="Bits" large>
          {result ? Math.floor(result.bits) : '—'}
        </Stat>
        <Stat label="Offline attack">{result?.offline ?? '—'}</Stat>
        <Stat label="Online attack">{result?.online ?? '—'}</Stat>
      </dl>

      <Divider />

      <div className="py-4 text-[13px]">
        {failed ? (
          <p className="text-muted">The word lists didn&apos;t load. Reconnect and try again.</p>
        ) : !value ? (
          <p className="text-muted">Offline assumes 10 billion guesses a second against a fast hash; online, 100 an hour.</p>
        ) : !result ? (
          <p className="text-muted">Loading word lists…</p>
        ) : result.warning || result.suggestions.length ? (
          <>
            {result.warning && (
              <p className="flex items-start gap-2 font-medium">
                <span className="mt-0.5 text-symbol">
                  <Icon name="alert" size={14} />
                </span>
                {result.warning}
              </p>
            )}
            <ul className="mt-1.5 list-disc space-y-0.5 pl-5 text-muted">
              {result.suggestions.map((suggestion) => (
                <li key={suggestion}>{suggestion}</li>
              ))}
            </ul>
          </>
        ) : (
          <p className="text-muted">No common words, names, dates or keyboard patterns found.</p>
        )}
      </div>
    </Card>
  )
}

function Stat({ label, large = false, children }: { label: string; large?: boolean; children: ReactNode }) {
  return (
    <div className="min-w-0 border-line px-3 first:pl-0 [&:not(:first-child)]:border-l">
      <dt className={LABEL}>{label}</dt>
      <dd className={`mt-1 ${large ? 'font-mono text-2xl font-semibold tabular-nums' : 'text-[13px] font-medium'}`}>{children}</dd>
    </div>
  )
}
