import { useId, type ReactNode } from 'react'
import { type CharacterSet, STRENGTH_LABELS } from '@/lib/password'

export const FOCUS_RING = 'outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'
export const LABEL = 'text-[11px] font-medium uppercase tracking-[0.08em] text-muted'
export const FIELD = `h-11 w-full min-w-0 rounded-xl bg-chip px-3.5 font-mono text-[15px] text-ink placeholder:font-sans placeholder:text-[14px] placeholder:text-muted ${FOCUS_RING}`

// Digits and symbols are tinted so 0/O and 1/l are easy to tell apart when reading a password out.
export const CHARACTER_COLORS: Record<CharacterSet, string> = {
  upper: 'text-ink',
  lower: 'text-ink',
  numbers: 'text-accent',
  symbols: 'text-symbol',
}

// One colour per strength level; the pill tints itself from it, so it works on light and dark panels.
const STRENGTH_COLORS = ['#e5484d', '#f76b15', '#f5b000', '#46a758', '#12a594']

/** The paper card: grey shell with a title row, a raised white panel, and a footer line. */
export function Card({
  title,
  badge,
  action,
  footer,
  children,
}: {
  title: string
  badge?: ReactNode
  action?: ReactNode
  footer: ReactNode
  children: ReactNode
}) {
  const titleId = useId()

  return (
    <section aria-labelledby={titleId} className="w-full rounded-[28px] bg-shell shadow-card">
      <header className="flex flex-wrap items-center justify-between gap-3 px-6 pt-5 pb-4">
        <div className="flex items-center gap-2.5">
          <h2 id={titleId} className="text-base font-semibold tracking-tight">
            {title}
          </h2>
          {badge && <span className="rounded-md bg-pill px-1.5 py-0.5 font-mono text-xs text-muted tabular-nums">{badge}</span>}
        </div>
        {action}
      </header>
      <div className="mx-2.5 rounded-[20px] bg-panel px-6 shadow-panel">{children}</div>
      <footer className="flex flex-wrap items-center gap-x-3 gap-y-2 px-6 pt-3.5 pb-4">{footer}</footer>
    </section>
  )
}

/** level 0 = nothing to rate yet. */
export function StrengthMeter({ level }: { level: number }) {
  const color = STRENGTH_COLORS[level - 1]

  return (
    <div className="flex items-center gap-4">
      <div aria-hidden="true" className="flex flex-1 gap-1">
        {STRENGTH_COLORS.map((_, index) => (
          <span
            key={index}
            className="h-1 flex-1 rounded-full bg-track transition-colors duration-500 motion-reduce:transition-none"
            style={index < level ? { backgroundColor: color } : undefined}
          />
        ))}
      </div>
      <div className="flex w-[108px] shrink-0 justify-end">
        {level > 0 && (
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
            style={{ backgroundColor: `color-mix(in srgb, ${color} 16%, transparent)` }}
          >
            <span aria-hidden="true" className="size-1.5 rounded-full" style={{ backgroundColor: color }} />
            <span className="sr-only">Strength: </span>
            {STRENGTH_LABELS[level - 1]}
          </span>
        )}
      </div>
    </div>
  )
}

/** A range input drawn as a ruler: dark ticks up to the value, a blue "tape hook" thumb (styled in globals.css). */
export function RulerSlider({
  id,
  min,
  max,
  labelEvery,
  value,
  onChange,
}: {
  id: string
  min: number
  max: number
  labelEvery: number
  value: number
  onChange: (value: number) => void
}) {
  const ticks = Array.from({ length: max - min + 1 }, (_, index) => min + index)
  // Lines a tick up with the centre of the 24px-wide thumb.
  const position = (tick: number) => `calc(12px + ${(tick - min) / (max - min)} * (100% - 24px))`

  return (
    <div>
      <div className="relative h-7">
        <div aria-hidden="true" className="absolute inset-x-0 bottom-1.5 h-3">
          {ticks.map((tick) => (
            <span
              key={tick}
              className={`absolute bottom-0 w-px ${tick % labelEvery === 0 ? 'h-3' : 'h-1.5'} ${tick <= value ? 'bg-ink' : 'bg-tick'}`}
              style={{ left: position(tick) }}
            />
          ))}
        </div>
        <input
          id={id}
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
          className="length-slider absolute inset-0"
        />
      </div>
      <div aria-hidden="true" className="relative h-4 font-mono text-[10px] text-muted">
        {ticks
          .filter((tick) => tick % labelEvery === 0)
          .map((tick) => (
            <span key={tick} className="absolute top-0 -translate-x-1/2" style={{ left: position(tick) }}>
              {tick}
            </span>
          ))}
      </div>
    </div>
  )
}

export function SegmentedControl<T extends string | number>({
  label,
  tone,
  options,
  value,
  onChange,
}: {
  label: string
  tone: 'shell' | 'panel'
  options: { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
}) {
  const selectedStyle = tone === 'shell' ? 'bg-raised text-ink shadow-raised' : 'bg-ink text-inverse'

  return (
    <div role="group" aria-label={label} className={`flex gap-0.5 rounded-full p-[3px] ${tone === 'shell' ? 'bg-pill' : 'bg-chip'}`}>
      {options.map((option) => {
        const selected = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(option.value)}
            className={`h-7 min-w-9 rounded-full px-3 text-[13px] font-medium transition-colors ${FOCUS_RING} ${
              selected ? selectedStyle : 'text-muted hover:text-ink'
            }`}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

export function ToggleChip({
  pressed,
  label,
  onToggle,
  children,
}: {
  pressed: boolean
  label?: string
  onToggle: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      aria-label={label}
      onClick={onToggle}
      className={`inline-flex h-9 items-center justify-center gap-2 rounded-full px-3.5 text-[13px] font-medium transition-colors ${FOCUS_RING} ${
        pressed ? 'bg-ink text-inverse' : 'bg-chip text-muted hover:text-ink'
      }`}
    >
      {children}
    </button>
  )
}

export function Switch({ id, checked, onChange }: { id: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${FOCUS_RING} ${checked ? 'bg-accent' : 'bg-tick'}`}
    >
      <span
        aria-hidden="true"
        className={`absolute top-0.5 left-0.5 size-4 rounded-full bg-white shadow-raised transition-transform motion-reduce:transition-none ${
          checked ? 'translate-x-4' : ''
        }`}
      />
    </button>
  )
}

export function IconButton({
  label,
  onClick,
  tone = 'shell',
  shortcut,
  children,
}: {
  label: string
  onClick: () => void
  tone?: 'shell' | 'panel'
  shortcut?: string
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-keyshortcuts={shortcut}
      title={shortcut ? `${label} (${shortcut})` : label}
      className={`grid size-9 shrink-0 place-items-center rounded-full transition-colors ${FOCUS_RING} ${
        tone === 'shell' ? 'bg-pill hover:bg-pill-hover' : 'bg-chip hover:bg-pill'
      }`}
    >
      {children}
    </button>
  )
}

export function Divider() {
  return <div aria-hidden="true" className="-mx-6 border-t border-dashed border-line" />
}

// Feather-style stroke icons, drawn at 24×24.
const ICON_PATHS = {
  copy: ['M11 9h9a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-9a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2z', 'M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1'],
  check: ['M20 6 9 17l-5-5'],
  refresh: ['M23 4v6h-6', 'M20.49 15a9 9 0 1 1-2.12-9.36L23 10'],
  expand: ['M15 3h6v6', 'M9 21H3v-6', 'M21 3l-7 7', 'M3 21l7-7'],
  eye: ['M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z', 'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z'],
  eyeOff: [
    'M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94',
    'M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19',
    'M14.12 14.12a3 3 0 1 1-4.24-4.24',
    'M1 1l22 22',
  ],
  close: ['M18 6 6 18', 'M6 6l12 12'],
  alert: ['M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z', 'M12 9v4', 'M12 17h.01'],
}

export function Icon({ name, size = 15 }: { name: keyof typeof ICON_PATHS; size?: number }) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {ICON_PATHS[name].map((path) => (
        <path key={path} d={path} />
      ))}
    </svg>
  )
}
