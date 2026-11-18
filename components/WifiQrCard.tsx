'use client'

import { useState } from 'react'
import { encode } from 'uqr'
import { type WifiSecurity, wifiProblem, wifiQrText } from '@/lib/wifi'
import { Card, Divider, FIELD, FOCUS_RING, Icon, LABEL, SegmentedControl, Switch } from './ui'

const SECURITY_OPTIONS = [
  { value: 'WPA' as const, label: 'WPA' },
  { value: 'WEP' as const, label: 'WEP' },
  { value: 'nopass' as const, label: 'None' },
]

/** A QR code phones can scan to join a Wi-Fi network. Drawn on the page; nothing is uploaded. */
export function WifiQrCard({ generatedPassword }: { generatedPassword: string }) {
  const [ssid, setSsid] = useState('')
  const [typedPassword, setTypedPassword] = useState<string | null>(null) // null = follow the generator
  const [visible, setVisible] = useState(false)
  const [security, setSecurity] = useState<WifiSecurity>('WPA')
  const [hidden, setHidden] = useState(false)

  const details = { ssid, password: typedPassword ?? generatedPassword, security, hidden }
  const problem = wifiProblem(details)
  const matrix = problem ? null : encode(wifiQrText(details), { ecc: 'M', border: 0 }).data

  return (
    <Card
      title="Wi-Fi QR"
      badge={security === 'nopass' ? 'open' : security}
      footer={<p className="text-[13px] text-muted">Point a phone camera at the code to join</p>}
    >
      <div className="flex flex-col gap-4 py-5">
        <div className="flex flex-col gap-2">
          <label htmlFor="wifi-ssid" className={LABEL}>
            Network name
          </label>
          <input
            id="wifi-ssid"
            value={ssid}
            onChange={(event) => setSsid(event.target.value)}
            autoComplete="off"
            spellCheck={false}
            placeholder="e.g. Home-5G"
            className={FIELD}
          />
        </div>

        {security !== 'nopass' && (
          <div className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between">
              <label htmlFor="wifi-password" className={LABEL}>
                Password
              </label>
              {typedPassword === null ? (
                <span className="text-xs text-muted">Using the generated one</span>
              ) : (
                <button type="button" onClick={() => setTypedPassword(null)} className={`text-xs text-accent hover:underline ${FOCUS_RING}`}>
                  Use generated
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <input
                id="wifi-password"
                type={visible ? 'text' : 'password'}
                value={details.password}
                onChange={(event) => setTypedPassword(event.target.value)}
                autoComplete="off"
                autoCapitalize="off"
                spellCheck={false}
                className={FIELD}
              />
              <button
                type="button"
                onClick={() => setVisible(!visible)}
                aria-label="Show Wi-Fi password"
                aria-pressed={visible}
                className={`grid size-11 shrink-0 place-items-center rounded-xl bg-chip text-muted transition-colors hover:text-ink ${FOCUS_RING}`}
              >
                <Icon name={visible ? 'eyeOff' : 'eye'} />
              </button>
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className={LABEL}>Security</span>
          <SegmentedControl label="Security" tone="panel" options={SECURITY_OPTIONS} value={security} onChange={setSecurity} />
        </div>

        <div className="flex items-center justify-between gap-4">
          <label htmlFor="wifi-hidden" className="text-[13px] font-medium">
            Hidden network
          </label>
          <Switch id="wifi-hidden" checked={hidden} onChange={setHidden} />
        </div>
      </div>

      <Divider />

      <div className="grid place-items-center py-6">
        {matrix ? (
          <QrCode matrix={matrix} label={`QR code to join ${ssid}`} />
        ) : (
          <p className="grid size-44 place-items-center rounded-2xl border border-dashed border-line p-5 text-center text-[13px] text-muted">
            {problem}
          </p>
        )}
      </div>
    </Card>
  )
}

// Black on white in both themes: some scanners can't read inverted codes. The white frame is the quiet zone.
function QrCode({ matrix, label }: { matrix: boolean[][]; label: string }) {
  const modules = matrix.flatMap((row, y) => row.map((dark, x) => (dark ? `M${x} ${y}h1v1h-1z` : ''))).join('')

  return (
    <div className="rounded-2xl bg-white p-5 shadow-panel">
      <svg role="img" aria-label={label} viewBox={`0 0 ${matrix.length} ${matrix.length}`} shapeRendering="crispEdges" className="block size-36">
        <path d={modules} fill="#000" />
      </svg>
    </div>
  )
}
