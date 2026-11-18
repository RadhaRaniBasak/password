// How to say each character aloud, for reading a password to someone or typing it on another device.
const NATO: Record<string, string> = {
  a: 'alfa', b: 'bravo', c: 'charlie', d: 'delta', e: 'echo', f: 'foxtrot', g: 'golf', h: 'hotel', i: 'india',
  j: 'juliett', k: 'kilo', l: 'lima', m: 'mike', n: 'november', o: 'oscar', p: 'papa', q: 'quebec', r: 'romeo',
  s: 'sierra', t: 'tango', u: 'uniform', v: 'victor', w: 'whiskey', x: 'x-ray', y: 'yankee', z: 'zulu',
}

const DIGITS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine']

const SYMBOLS: Record<string, string> = {
  '!': 'exclamation', '"': 'double quote', '#': 'hash', $: 'dollar', '%': 'percent', '&': 'ampersand',
  "'": 'apostrophe', '(': 'open paren', ')': 'close paren', '*': 'asterisk', '+': 'plus', ',': 'comma',
  '-': 'hyphen', '.': 'period', '/': 'slash', ':': 'colon', ';': 'semicolon', '<': 'less than', '=': 'equals',
  '>': 'greater than', '?': 'question mark', '@': 'at', '[': 'open bracket', '\\': 'backslash',
  ']': 'close bracket', '^': 'caret', _: 'underscore', '`': 'backtick', '{': 'open brace', '|': 'pipe',
  '}': 'close brace', '~': 'tilde',
}

/** Name to show: NATO words for letters (capitals in capitals, e.g. KILO vs kilo), names for digits and symbols. */
export function spokenName(char: string): string {
  const word = NATO[char.toLowerCase()]
  if (word) return char === char.toLowerCase() ? word : word.toUpperCase()
  if (/[0-9]/.test(char)) return DIGITS[Number(char)]
  return SYMBOLS[char] ?? char
}

/** Name for screen readers, which may not voice capitals: "capital kilo". */
export function spokenLabel(char: string): string {
  return /[A-Z]/.test(char) ? `capital ${spokenName(char).toLowerCase()}` : spokenName(char)
}
