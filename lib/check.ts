import { ZxcvbnFactory } from '@zxcvbn-ts/core'
import * as common from '@zxcvbn-ts/language-common'
import * as english from '@zxcvbn-ts/language-en'

// zxcvbn spots dictionary words, names, dates, keyboard runs and l33t swaps in passwords people choose.
// Its word lists are large, so the app imports this module only when the checker is first used.
const zxcvbn = new ZxcvbnFactory({
  dictionary: { ...common.dictionary, ...english.dictionary },
  graphs: common.adjacencyGraphs,
  translations: english.translations,
})

export type CheckResult = {
  bits: number
  offline: string
  online: string
  warning: string | null
  suggestions: string[]
}

export function checkPassword(password: string): CheckResult {
  const result = zxcvbn.check(password)
  return {
    bits: result.guessesLog10 * Math.log2(10),
    offline: result.crackTimes.offlineFastHashingXPerSecond.display,
    online: result.crackTimes.onlineThrottlingXPerHour.display,
    warning: result.feedback.warning,
    suggestions: result.feedback.suggestions,
  }
}
