export type WifiSecurity = 'WPA' | 'WEP' | 'nopass'

export type WifiDetails = { ssid: string; password: string; security: WifiSecurity; hidden: boolean }

// The payload phone cameras read: WIFI:T:<security>;S:<network>;P:<password>;H:true;;
// The format reserves \ ; , : and " so they are backslash-escaped.
const escapeField = (value: string) => value.replace(/[\\;,:"]/g, (char) => `\\${char}`)

export function wifiQrText({ ssid, password, security, hidden }: WifiDetails): string {
  const passwordField = security === 'nopass' ? '' : `P:${escapeField(password)};`
  return `WIFI:T:${security};S:${escapeField(ssid)};${passwordField}${hidden ? 'H:true;' : ''};`
}

/** Why these details can't make a joinable code yet, or null when they can. */
export function wifiProblem({ ssid, password, security }: WifiDetails): string | null {
  if (!ssid.trim()) return 'Add the network name to make a code'
  if (security === 'nopass') return null
  if (!password) return 'Add the network password'
  if (security === 'WPA' && (password.length < 8 || password.length > 63)) return 'WPA passwords need 8–63 characters'
  if (!/^[\x20-\x7e]+$/.test(password)) return 'Use plain keyboard characters in the password'
  return null
}
