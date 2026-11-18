import { EFF_LARGE_WORDLIST } from './eff-wordlist'

export type Mode = 'random' | 'memorable' | 'pin'
export type CharacterSet = 'upper' | 'lower' | 'numbers' | 'symbols'

export type Settings = {
  mode: Mode
  length: number
  characters: Record<CharacterSet, boolean>
  symbols: string
  avoidLookalikes: boolean
  wordCount: number
  capitalize: boolean
  appendNumber: boolean
  pinLength: number
}

export const MIN_LENGTH = 6
export const MAX_LENGTH = 64
export const MIN_WORDS = 3
export const MAX_WORDS = 8
export const MIN_PIN_LENGTH = 4
export const MAX_PIN_LENGTH = 12

/** Every printable ASCII symbol, in character-code order. Sites differ in which ones they accept. */
export const ALL_SYMBOLS = '!"#$%&\'()*+,-./:;<=>?@[\\]^_`{|}~'
export const DEFAULT_SYMBOLS = '!#$%&()*+,-.:;<=>?@[]^_{|}'

export const DEFAULT_SETTINGS: Settings = {
  mode: 'random',
  length: 20,
  characters: { upper: true, lower: true, numbers: true, symbols: false },
  symbols: DEFAULT_SYMBOLS,
  avoidLookalikes: false,
  wordCount: 5,
  capitalize: true,
  appendNumber: true,
  pinLength: 6,
}

export const CHARACTER_SETS: CharacterSet[] = ['upper', 'lower', 'numbers', 'symbols']

const LETTERS_AND_DIGITS = {
  upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  lower: 'abcdefghijklmnopqrstuvwxyz',
  numbers: '0123456789',
}

/** Characters that are easy to misread for one another. */
export const LOOKALIKES = '0O1lI|'

// The four hyphenated entries (t-shirt, yo-yo…) are left out so words never blur into the "-" separator.
const WORDS = EFF_LARGE_WORDLIST.filter((word) => /^[a-z]+$/.test(word))

export const STRENGTH_LABELS = ['Weak', 'Fair', 'Good', 'Strong', 'Very strong']

/** Uniform random integer in [0, max) from Web Crypto, rejecting the top values that would bias the modulo. */
function randomInt(max: number): number {
  const limit = 2 ** 32 - (2 ** 32 % max)
  const value = new Uint32Array(1)
  do crypto.getRandomValues(value)
  while (value[0] >= limit)
  return value[0] % max
}

/** Keeps only printable ASCII symbols, once each, in character-code order. */
export function cleanSymbols(text: string): string {
  return [...ALL_SYMBOLS].filter((char) => text.includes(char)).join('')
}

export function toggleSymbol(symbols: string, char: string): string {
  return cleanSymbols(symbols.includes(char) ? symbols.replace(char, '') : symbols + char)
}

export function charactersFor(set: CharacterSet, { symbols, avoidLookalikes }: Pick<Settings, 'symbols' | 'avoidLookalikes'>): string {
  const characters = set === 'symbols' ? symbols : LETTERS_AND_DIGITS[set]
  return avoidLookalikes ? [...characters].filter((char) => !LOOKALIKES.includes(char)).join('') : characters
}

function selectedSets(settings: Settings): string[] {
  const sets = CHARACTER_SETS.filter((set) => settings.characters[set])
    .map((set) => charactersFor(set, settings))
    .filter(Boolean)
  return sets.length ? sets : [charactersFor('lower', settings)]
}

// Draws from the whole pool and retries until every selected set shows up, so each valid password is equally
// likely. Needs MIN_LENGTH >= the number of sets (6 >= 4); the hardest setting (6 characters, all four sets,
// look-alikes removed) averages about four draws.
function generateRandom(settings: Settings): string {
  const sets = selectedSets(settings)
  const pool = sets.join('')

  for (;;) {
    const password = Array.from({ length: settings.length }, () => pool[randomInt(pool.length)]).join('')
    if (sets.every((set) => [...password].some((char) => set.includes(char)))) return password
  }
}

// EFF long-list words, e.g. "Unwashed-Gravy-Overhand-Shrank-Clammy-418".
function generateMemorable({ wordCount, capitalize, appendNumber }: Settings): string {
  const words = Array.from({ length: wordCount }, () => {
    const word = WORDS[randomInt(WORDS.length)]
    return capitalize ? word[0].toUpperCase() + word.slice(1) : word
  })

  if (appendNumber) words.push(String(randomInt(1000)).padStart(3, '0'))
  return words.join('-')
}

/** Repeats and straight runs (1111, 1234, 9876) are the first PINs anyone tries, and many systems refuse them. */
export function isTrivialPin(pin: string): boolean {
  const steps = [...pin].slice(1).map((digit, index) => Number(digit) - Number(pin[index]))
  return [0, 1, -1].some((step) => steps.every((value) => value === step))
}

function generatePin({ pinLength }: Settings): string {
  for (;;) {
    const pin = Array.from({ length: pinLength }, () => String(randomInt(10))).join('')
    if (!isTrivialPin(pin)) return pin
  }
}

export function generatePassword(settings: Settings): string {
  if (settings.mode === 'memorable') return generateMemorable(settings)
  if (settings.mode === 'pin') return generatePin(settings)
  return generateRandom(settings)
}

// Inclusion–exclusion: how many strings of `length` over the pooled sets leave none of the sets out.
function countStringsUsingEverySet(setSizes: number[], length: number): number {
  const total = setSizes.reduce((sum, size) => sum + size, 0)
  let count = 0

  for (let leftOut = 0; leftOut < 1 << setSizes.length; leftOut++) {
    const missing = setSizes.filter((_, index) => leftOut & (1 << index))
    const remaining = total - missing.reduce((sum, size) => sum + size, 0)
    count += (missing.length % 2 ? -1 : 1) * remaining ** length
  }
  return count
}

/** Entropy of the generator for these settings: log2 of how many equally likely passwords it can produce. */
export function entropyBits(settings: Settings): number {
  if (settings.mode === 'memorable') {
    // Capitals and separators are fixed, so only the words and the number add uncertainty.
    return settings.wordCount * Math.log2(WORDS.length) + (settings.appendNumber ? Math.log2(1000) : 0)
  }
  if (settings.mode === 'pin') {
    // Skipped: 10 repeats, plus 11 − length ascending and as many descending runs (when they fit).
    const skipped = 10 + 2 * Math.max(0, 11 - settings.pinLength)
    return Math.log2(10 ** settings.pinLength - skipped)
  }
  const setSizes = selectedSets(settings).map((set) => set.length)
  return Math.log2(countStringsUsingEverySet(setSizes, settings.length))
}

/**
 * 1 (weak) to 5 (very strong), one step per 20 bits: under 40, 40–59, 60–79, 80–99, 100+.
 * At a trillion guesses a second, 60 bits falls in about two weeks; 80 bits takes about 38,000 years.
 */
export function strengthLevel(bits: number): number {
  return Math.min(Math.max(Math.floor(bits / 20), 1), 5)
}

export function characterSetOf(char: string): CharacterSet {
  if (/[A-Z]/.test(char)) return 'upper'
  if (/[a-z]/.test(char)) return 'lower'
  if (/[0-9]/.test(char)) return 'numbers'
  return 'symbols'
}

export function countCharacterSets(password: string): Record<CharacterSet, number> {
  const counts = { upper: 0, lower: 0, numbers: 0, symbols: 0 }
  for (const char of password) counts[characterSetOf(char)]++
  return counts
}

/** Rebuilds settings from saved JSON, keeping only valid values; anything missing or broken uses the default. */
export function parseSettings(json: string | null): Settings {
  let saved: Partial<Record<keyof Settings, unknown>> = {}
  try {
    const parsed: unknown = JSON.parse(json ?? '{}')
    if (parsed && typeof parsed === 'object') saved = parsed
  } catch {
    // Unreadable: fall back to the defaults below.
  }

  const flag = (value: unknown, fallback: boolean) => (typeof value === 'boolean' ? value : fallback)
  const wholeNumber = (value: unknown, min: number, max: number, fallback: number) =>
    Number.isInteger(value) ? Math.min(Math.max(value as number, min), max) : fallback

  const savedCharacters = (saved.characters ?? {}) as Partial<Record<CharacterSet, unknown>>
  const characters = Object.fromEntries(
    CHARACTER_SETS.map((set) => [set, flag(savedCharacters[set], DEFAULT_SETTINGS.characters[set])]),
  ) as Record<CharacterSet, boolean>
  const symbols = typeof saved.symbols === 'string' ? cleanSymbols(saved.symbols) : ''

  return {
    mode: saved.mode === 'memorable' || saved.mode === 'pin' ? saved.mode : 'random',
    length: wholeNumber(saved.length, MIN_LENGTH, MAX_LENGTH, DEFAULT_SETTINGS.length),
    characters: Object.values(characters).some(Boolean) ? characters : DEFAULT_SETTINGS.characters,
    symbols: symbols || DEFAULT_SETTINGS.symbols,
    avoidLookalikes: flag(saved.avoidLookalikes, DEFAULT_SETTINGS.avoidLookalikes),
    wordCount: wholeNumber(saved.wordCount, MIN_WORDS, MAX_WORDS, DEFAULT_SETTINGS.wordCount),
    capitalize: flag(saved.capitalize, DEFAULT_SETTINGS.capitalize),
    appendNumber: flag(saved.appendNumber, DEFAULT_SETTINGS.appendNumber),
    pinLength: wholeNumber(saved.pinLength, MIN_PIN_LENGTH, MAX_PIN_LENGTH, DEFAULT_SETTINGS.pinLength),
  }
}
