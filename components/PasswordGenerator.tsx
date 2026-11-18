'use client'

import { useEffect, useEffectEvent, useRef, useState } from 'react'
import { spokenName } from '@/lib/names'
import {
  ALL_SYMBOLS,
  type CharacterSet,
  type Settings,
  characterSetOf,
  countCharacterSets,
  DEFAULT_SETTINGS,
  DEFAULT_SYMBOLS,
  entropyBits,
  generatePassword,
  LOOKALIKES,
  MAX_LENGTH,
  MAX_PIN_LENGTH,
  MAX_WORDS,
  MIN_LENGTH,
  MIN_PIN_LENGTH,
  MIN_WORDS,
  parseSettings,
  strengthLevel,
  toggleSymbol,
} from '@/lib/password'
import { HISTORY_SIZE, HistoryCard, type HistoryEntry } from './HistoryCard'
import { ReadOutDialog } from './ReadOutDialog'
import { StrengthCheckCard } from './StrengthCheckCard'
import {
  Card,
  CHARACTER_COLORS,
  Divider,
  FOCUS_RING,
  Icon,
  IconButton,
  LABEL,
  RulerSlider,
  SegmentedControl,
  StrengthMeter,
  Switch,
  ToggleChip,
} from './ui'
import { WifiQrCard } from './WifiQrCard'

type Status = 'idle' | 'copied' | 'copy-failed' | 'need-a-set' | 'need-a-symbol'

const SETTINGS_KEY = 'password-generator:settings'
const SCRAMBLE_MS = 420
const SCRAMBLE_GLYPHS = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'

const MODES = [
  { value: 'random' as const, label: 'Random' },
  { value: 'memorable' as const, label: 'Memorable' },
  { value: 'pin' as const, label: 'PIN' },
]

const WORD_COUNTS = Array.from({ length: MAX_WORDS - MIN_WORDS + 1 }, (_, index) => {
  const count = MIN_WORDS + index
  return { value: count, label: String(count) }
})

const CHARACTER_TOGGLES: { set: CharacterSet; label: string; name: string }[] = [
  { set: 'upper', label: 'A–Z', name: 'uppercase' },
  { set: 'lower', label: 'a–z', name: 'lowercase' },
  { set: 'numbers', label: '0–9', name: 'numbers' },
  { set: 'symbols', label: '!@#', name: 'symbols' },
]

const STATUS_MESSAGES: Record<Status, string> = {
  idle: 'Generated locally · never sent anywhere',
  copied: 'Copied to clipboard',
  'copy-failed': 'Copy blocked, select the text instead',
  'need-a-set': 'Keep at least one character type on',
  'need-a-symbol': 'Keep at least one symbol on',
}
const PIN_HINT = 'PINs are only safe where attempts are limited'

const clockFormat = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
const clockTime = () => clockFormat.format(new Date())

// Settings (never passwords) are remembered in this browser. Storage can be blocked, e.g. in private windows.
function readSavedSettings(): Settings {
  try {
    return parseSettings(localStorage.getItem(SETTINGS_KEY))
  } catch {
    return DEFAULT_SETTINGS
  }
}

function saveSettings(settings: Settings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
  } catch {
    // Storage blocked: settings just won't persist.
  }
}

async function writeClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

// Typing in a text field shouldn't trigger the R and C shortcuts.
function isTypingTarget(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || target instanceof HTMLTextAreaElement || (target instanceof HTMLInputElement && target.type !== 'range'))
  )
}

export default function PasswordGenerator() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const [password, setPassword] = useState('')
  const [scramble, setScramble] = useState<{ text: string; settled: number } | null>(null)
  const [status, setStatus] = useState<Status>('idle')
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const statusTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const scrambleFrame = useRef(0)
  const nextHistoryId = useRef(0)
  const readOutDialog = useRef<HTMLDialogElement>(null)

  // Saved settings and the first password exist only in the browser, so server-rendered HTML never holds a password.
  useEffect(() => {
    const saved = readSavedSettings()
    setSettings(saved)
    setPassword(generatePassword(saved))
  }, [])

  const bits = entropyBits(settings)

  function flashStatus(next: Status) {
    clearTimeout(statusTimer.current)
    setStatus(next)
    statusTimer.current = setTimeout(() => setStatus('idle'), 2000)
  }

  function stopScramble() {
    cancelAnimationFrame(scrambleFrame.current)
    setScramble(null)
  }

  function updateSettings(changes: Partial<Settings>) {
    const nextSettings = { ...settings, ...changes }
    stopScramble()
    setSettings(nextSettings)
    setPassword(generatePassword(nextSettings))
    saveSettings(nextSettings)
  }

  function toggleCharacterSet(set: CharacterSet) {
    const characters = { ...settings.characters, [set]: !settings.characters[set] }
    if (!Object.values(characters).some(Boolean)) {
      flashStatus('need-a-set')
      return
    }
    updateSettings({ characters })
  }

  function toggleSymbolKey(char: string) {
    const symbols = toggleSymbol(settings.symbols, char)
    if (!symbols) {
      flashStatus('need-a-symbol')
      return
    }
    updateSettings({ symbols })
  }

  // Keeps passwords you move past or copy, newest first. Copying one that's already listed just marks it.
  function remember(entryPassword: string, copied: boolean) {
    if (!entryPassword) return
    const entry: HistoryEntry = { id: nextHistoryId.current++, password: entryPassword, mode: settings.mode, bits, time: clockTime(), copied }
    setHistory((entries) =>
      entries.some((existing) => existing.password === entry.password)
        ? entries.map((existing) => (existing.password === entry.password ? { ...existing, copied: existing.copied || copied } : existing))
        : [entry, ...entries].slice(0, HISTORY_SIZE),
    )
  }

  // New password with a short scramble-and-settle reveal, skipped when the user prefers reduced motion.
  function regenerate() {
    const next = generatePassword(settings)
    remember(password, false)
    stopScramble()
    setPassword(next)
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return

    let startedAt: number | undefined
    const step = (now: number) => {
      startedAt ??= now
      const progress = (now - startedAt) / SCRAMBLE_MS
      if (progress >= 1) {
        setScramble(null)
        return
      }
      const settled = Math.floor(progress * next.length)
      const noise = Array.from(next.slice(settled), (char) =>
        char === '-' ? char : SCRAMBLE_GLYPHS[Math.floor(Math.random() * SCRAMBLE_GLYPHS.length)],
      ).join('')
      setScramble({ text: next.slice(0, settled) + noise, settled })
      scrambleFrame.current = requestAnimationFrame(step)
    }
    scrambleFrame.current = requestAnimationFrame(step)
  }

  async function copyPassword() {
    if (!password) return
    if (await writeClipboard(password)) {
      flashStatus('copied')
      remember(password, true)
    } else {
      flashStatus('copy-failed')
    }
  }

  async function copyFromHistory(entry: HistoryEntry) {
    const copied = await writeClipboard(entry.password)
    if (copied) remember(entry.password, true)
    else flashStatus('copy-failed')
    return copied
  }

  // R regenerates, C copies. Combinations with ⌘, Ctrl or Alt keep their usual browser meaning.
  const onKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if (event.metaKey || event.ctrlKey || event.altKey || event.repeat) return
    if (readOutDialog.current?.open || isTypingTarget(event.target)) return
    const key = event.key.toLowerCase()
    if (key === 'r') regenerate()
    if (key === 'c') void copyPassword()
  })

  useEffect(() => {
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const shownText = scramble?.text ?? password
  const settledCount = scramble?.settled ?? shownText.length
  const counts = countCharacterSets(password)

  return (
    <main className="min-h-screen bg-page px-4 py-10 font-sans text-ink antialiased sm:px-6 sm:py-14">
      <h1 className="sr-only">Password generator</h1>
      <div className="mx-auto grid max-w-[500px] items-start gap-6 lg:max-w-[1024px] lg:grid-cols-2">
        <div className="flex flex-col gap-6">
          <Card
            title="Password"
            badge={
              <>
                <span className="sr-only">Entropy: </span>
                {Math.floor(bits)} bits
              </>
            }
            action={
              <SegmentedControl label="Password type" tone="shell" options={MODES} value={settings.mode} onChange={(mode) => updateSettings({ mode })} />
            }
            footer={
              <>
                <p aria-live="polite" className="min-w-48 flex-1 text-[13px] text-muted">
                  {status === 'idle' && settings.mode === 'pin' ? PIN_HINT : STATUS_MESSAGES[status]}
                </p>
                <div className="ml-auto flex items-center gap-2">
                  <IconButton label="Copy password" shortcut="C" onClick={() => void copyPassword()}>
                    <Icon name={status === 'copied' ? 'check' : 'copy'} />
                  </IconButton>
                  <button
                    type="button"
                    onClick={regenerate}
                    aria-keyshortcuts="R"
                    title="Generate (R)"
                    className={`inline-flex h-9 items-center gap-1.5 rounded-full bg-ink pr-4 pl-3.5 text-sm font-medium text-inverse transition hover:bg-ink/85 active:scale-[0.98] pointer-fine:pr-2 ${FOCUS_RING}`}
                  >
                    <Icon name="refresh" size={14} />
                    Generate
                    <kbd className="ml-1 hidden h-5 min-w-5 place-items-center rounded-[5px] bg-inverse/15 px-1 font-mono text-[11px] text-inverse/70 pointer-fine:grid">
                      R
                    </kbd>
                  </button>
                </div>
              </>
            }
          >
            <div className="flex flex-col gap-4 py-5">
              <div className="flex items-center gap-3">
                <p className="flex min-h-[60px] flex-1 items-center font-mono text-xl leading-[30px] font-medium tracking-[0.02em]">
                  <span className="min-w-0 select-all wrap-anywhere">
                    {shownText ? (
                      Array.from(shownText, (char, index) =>
                        index < settledCount ? (
                          <span
                            key={index}
                            data-tip={scramble ? undefined : `${index + 1} · ${spokenName(char)}`}
                            className={`${CHARACTER_COLORS[characterSetOf(char)]} ${scramble ? '' : 'char-tip'}`}
                          >
                            {char}
                          </span>
                        ) : (
                          <span key={index} className="text-muted">
                            {char}
                          </span>
                        ),
                      )
                    ) : (
                      <span className="text-muted">Generating…</span>
                    )}
                  </span>
                </p>
                <IconButton label="Read it out in large type" tone="panel" onClick={() => readOutDialog.current?.showModal()}>
                  <Icon name="expand" size={14} />
                </IconButton>
              </div>
              <StrengthMeter level={strengthLevel(bits)} />
            </div>

            <Divider />

            {settings.mode === 'random' && (
              <>
                <div className="flex flex-col gap-2.5 py-5">
                  <div className="flex items-baseline justify-between">
                    <label htmlFor="password-length" className={LABEL}>
                      Length
                    </label>
                    <span className="font-mono text-[15px] font-semibold tabular-nums">{settings.length}</span>
                  </div>
                  <RulerSlider
                    id="password-length"
                    min={MIN_LENGTH}
                    max={MAX_LENGTH}
                    labelEvery={8}
                    value={settings.length}
                    onChange={(length) => updateSettings({ length })}
                  />
                </div>

                <Divider />

                <div role="group" aria-label="Characters" className="flex flex-wrap gap-2 py-4">
                  {CHARACTER_TOGGLES.map(({ set, label, name }) => {
                    const included = settings.characters[set]
                    return (
                      <ToggleChip key={set} pressed={included} label={`${label} ${name}`} onToggle={() => toggleCharacterSet(set)}>
                        <span className="font-mono">{label}</span>
                        <span className={`font-mono tabular-nums ${included ? 'text-inverse/70' : ''}`}>{counts[set]}</span>
                      </ToggleChip>
                    )
                  })}
                </div>

                {settings.characters.symbols && (
                  <>
                    <Divider />
                    <div className="flex flex-col gap-3 py-4">
                      <div className="flex items-baseline justify-between gap-3">
                        <span id="symbol-keys-label" className={LABEL}>
                          Symbols
                        </span>
                        <span className="text-xs text-muted tabular-nums">
                          {settings.symbols.length} of {ALL_SYMBOLS.length}
                          {settings.symbols !== DEFAULT_SYMBOLS && (
                            <>
                              {' · '}
                              <button
                                type="button"
                                onClick={() => updateSettings({ symbols: DEFAULT_SYMBOLS })}
                                className={`text-accent hover:underline ${FOCUS_RING}`}
                              >
                                Reset
                              </button>
                            </>
                          )}
                        </span>
                      </div>
                      <div role="group" aria-labelledby="symbol-keys-label" className="flex flex-wrap gap-1">
                        {[...ALL_SYMBOLS].map((char) => {
                          const included = settings.symbols.includes(char)
                          return (
                            <button
                              key={char}
                              type="button"
                              aria-pressed={included}
                              aria-label={spokenName(char)}
                              title={spokenName(char)}
                              onClick={() => toggleSymbolKey(char)}
                              className={`grid size-7 place-items-center rounded-md font-mono text-[13px] transition-colors ${FOCUS_RING} ${
                                included ? 'bg-ink text-inverse' : 'bg-chip text-muted hover:text-ink'
                              }`}
                            >
                              {char}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  </>
                )}

                <Divider />

                <div className="flex items-center justify-between gap-4 py-4">
                  <label htmlFor="avoid-lookalikes" className="flex flex-wrap items-baseline gap-x-2 text-[13px] font-medium">
                    Avoid look-alikes
                    <span
                      aria-hidden="true"
                      className={`font-mono text-xs tracking-[0.15em] text-muted ${settings.avoidLookalikes ? 'line-through' : ''}`}
                    >
                      {[...LOOKALIKES].join(' ')}
                    </span>
                  </label>
                  <Switch
                    id="avoid-lookalikes"
                    checked={settings.avoidLookalikes}
                    onChange={(avoidLookalikes) => updateSettings({ avoidLookalikes })}
                  />
                </div>
              </>
            )}

            {settings.mode === 'memorable' && (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3 py-4">
                  <span className={LABEL}>Words</span>
                  <SegmentedControl
                    label="Words"
                    tone="panel"
                    options={WORD_COUNTS}
                    value={settings.wordCount}
                    onChange={(wordCount) => updateSettings({ wordCount })}
                  />
                </div>

                <Divider />

                <div role="group" aria-label="Options" className="flex flex-wrap gap-2 py-4">
                  <ToggleChip pressed={settings.capitalize} onToggle={() => updateSettings({ capitalize: !settings.capitalize })}>
                    <span className="font-mono">Aa</span> Capitalize
                  </ToggleChip>
                  <ToggleChip pressed={settings.appendNumber} onToggle={() => updateSettings({ appendNumber: !settings.appendNumber })}>
                    <span className="font-mono">0–9</span> Number
                  </ToggleChip>
                </div>
              </>
            )}

            {settings.mode === 'pin' && (
              <div className="flex flex-col gap-2.5 py-5">
                <div className="flex items-baseline justify-between">
                  <label htmlFor="pin-length" className={LABEL}>
                    Digits
                  </label>
                  <span className="font-mono text-[15px] font-semibold tabular-nums">{settings.pinLength}</span>
                </div>
                <RulerSlider
                  id="pin-length"
                  min={MIN_PIN_LENGTH}
                  max={MAX_PIN_LENGTH}
                  labelEvery={2}
                  value={settings.pinLength}
                  onChange={(pinLength) => updateSettings({ pinLength })}
                />
                <p className="text-xs text-muted">Skips repeats and runs like 1111 or 1234.</p>
              </div>
            )}
          </Card>

          <HistoryCard entries={history} onCopy={copyFromHistory} onClear={() => setHistory([])} />
        </div>

        <div className="flex flex-col gap-6">
          <StrengthCheckCard />
          <WifiQrCard generatedPassword={password} />
        </div>
      </div>

      <ReadOutDialog ref={readOutDialog} password={password} mode={settings.mode} />
    </main>
  )
}
