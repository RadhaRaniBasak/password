// Quick self-check for the logic in lib/. Run with: bun lib/password.check.ts
import assert from 'node:assert/strict'
import { checkPassword } from './check'
import { spokenLabel, spokenName } from './names'
import {
  cleanSymbols,
  DEFAULT_SETTINGS,
  DEFAULT_SYMBOLS,
  entropyBits,
  generatePassword,
  isTrivialPin,
  LOOKALIKES,
  MAX_LENGTH,
  MAX_PIN_LENGTH,
  MIN_LENGTH,
  parseSettings,
  strengthLevel,
  toggleSymbol,
} from './password'
import { wifiProblem, wifiQrText } from './wifi'

const allSets = { upper: true, lower: true, numbers: true, symbols: true }
const close = (actual: number, expected: number) => assert.ok(Math.abs(actual - expected) < 0.01, `${actual} ≈ ${expected}`)

// Random: right length, only allowed characters, and every selected type always present.
for (let length = MIN_LENGTH; length <= MAX_LENGTH; length++) {
  const password = generatePassword({ ...DEFAULT_SETTINGS, length })
  assert.match(password, new RegExp(`^[A-Za-z0-9]{${length}}$`))
  for (const pattern of [/[A-Z]/, /[a-z]/, /[0-9]/]) assert.match(password, pattern)
}
for (let i = 0; i < 2000; i++) {
  const password = generatePassword({ ...DEFAULT_SETTINGS, length: 6, characters: allSets, avoidLookalikes: true })
  for (const pattern of [/[A-Z]/, /[a-z]/, /[0-9]/, /[^A-Za-z0-9]/]) assert.match(password, pattern)
  assert.ok(![...password].some((char) => LOOKALIKES.includes(char)), `look-alike in ${password}`)
}

// Symbols: same default set as the original repo, editable, and only chosen ones are used.
assert.equal(cleanSymbols('!@#$%^&*()_+-=[]{}|;:,.<>?'), DEFAULT_SYMBOLS)
assert.equal(cleanSymbols('a!b!~ '), '!~')
assert.equal(toggleSymbol('!#', '#'), '!')
assert.equal(toggleSymbol('#', '!'), '!#')
const onlyBang = generatePassword({ ...DEFAULT_SETTINGS, characters: { ...allSets, upper: false, lower: false, numbers: false }, symbols: '!' })
assert.equal(onlyBang, '!'.repeat(20))

// Memorable: EFF words joined by "-", optional capitals and a 3-digit number.
const memorable = { ...DEFAULT_SETTINGS, mode: 'memorable' as const }
assert.match(generatePassword({ ...memorable, wordCount: 6 }), /^([A-Z][a-z]+-){6}\d{3}$/)
assert.match(generatePassword({ ...memorable, wordCount: 3, capitalize: false, appendNumber: false }), /^[a-z]+(-[a-z]+){2}$/)

// PIN: digits only, never a repeat or a straight run.
assert.deepEqual(['1111', '1234', '9876', '0123456789', '1243', '8901'].map(isTrivialPin), [true, true, true, true, false, false])
for (let i = 0; i < 3000; i++) {
  const pin = generatePassword({ ...DEFAULT_SETTINGS, mode: 'pin', pinLength: 4 })
  assert.match(pin, /^\d{4}$/)
  assert.ok(!isTrivialPin(pin), pin)
}

// Entropy: exact for a single set, a little under length × log2(pool) when several sets are required.
close(entropyBits({ ...DEFAULT_SETTINGS, length: 10, characters: { ...allSets, upper: false, numbers: false, symbols: false } }), 10 * Math.log2(26))
close(entropyBits({ ...memorable, wordCount: 6 }), 6 * Math.log2(7772) + Math.log2(1000))
close(entropyBits({ ...DEFAULT_SETTINGS, mode: 'pin', pinLength: 4 }), Math.log2(10_000 - 24))
close(entropyBits({ ...DEFAULT_SETTINGS, mode: 'pin', pinLength: MAX_PIN_LENGTH }), Math.log2(1e12 - 10))
const defaultBits = entropyBits(DEFAULT_SETTINGS)
assert.ok(defaultBits < 20 * Math.log2(62) && defaultBits > 20 * Math.log2(62) - 0.1, String(defaultBits))

// Strength: one level per 20 bits.
assert.deepEqual([0, 39.9, 40, 59.9, 60, 79.9, 80, 99.9, 100, 400].map(strengthLevel), [1, 1, 2, 2, 3, 3, 4, 4, 5, 5])

// Saved settings: anything invalid falls back to the defaults.
assert.deepEqual(parseSettings(null), DEFAULT_SETTINGS)
assert.deepEqual(parseSettings('not json'), DEFAULT_SETTINGS)
assert.deepEqual(parseSettings('[1,2]').characters, DEFAULT_SETTINGS.characters)
assert.equal(parseSettings('{"length":999}').length, MAX_LENGTH)
assert.equal(parseSettings('{"length":2.5}').length, DEFAULT_SETTINGS.length)
assert.deepEqual(
  parseSettings('{"characters":{"upper":false,"lower":false,"numbers":false,"symbols":false}}').characters,
  DEFAULT_SETTINGS.characters,
)
assert.deepEqual(parseSettings('{"mode":"memorable","wordCount":7,"capitalize":"yes"}'), { ...memorable, wordCount: 7 })
assert.deepEqual(parseSettings('{"mode":"pin","pinLength":40,"symbols":"ab!!~"}'), {
  ...DEFAULT_SETTINGS,
  mode: 'pin',
  pinLength: MAX_PIN_LENGTH,
  symbols: '!~',
})
assert.equal(parseSettings('{"symbols":"abc"}').symbols, DEFAULT_SYMBOLS)

// Spoken names.
assert.deepEqual(['K', 'k', '7', '#', '\\'].map(spokenName), ['KILO', 'kilo', 'seven', 'hash', 'backslash'])
assert.equal(spokenLabel('K'), 'capital kilo')

// Wi-Fi QR payload and validation.
assert.equal(
  wifiQrText({ ssid: 'Home;Net', password: 'pa:ss"word', security: 'WPA', hidden: true }),
  'WIFI:T:WPA;S:Home\\;Net;P:pa\\:ss\\"word;H:true;;',
)
assert.equal(wifiQrText({ ssid: 'Cafe', password: 'ignored', security: 'nopass', hidden: false }), 'WIFI:T:nopass;S:Cafe;;')
assert.equal(wifiProblem({ ssid: 'Home', password: 'short', security: 'WPA', hidden: false }), 'WPA passwords need 8–63 characters')
assert.equal(wifiProblem({ ssid: ' ', password: 'long enough', security: 'WPA', hidden: false }), 'Add the network name to make a code')
assert.equal(wifiProblem({ ssid: 'Home', password: 'long enough', security: 'WPA', hidden: false }), null)

// Checker: common passwords are weak, generated ones aren't.
const common = checkPassword('password123')
assert.ok(common.bits < 20 && common.warning, JSON.stringify(common))
assert.ok(checkPassword(generatePassword(DEFAULT_SETTINGS)).bits > 60)

console.log('password checks passed')
