'use client'

import { useEffect } from 'react'

/** Registers the service worker in production builds so the app keeps working with no connection. */
export function OfflineSupport() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return

    navigator.serviceWorker
      .register('/sw.js')
      .then(() => navigator.serviceWorker.ready)
      .then((registration) => {
        // Hand the worker what this first visit already loaded, so the next visit works offline too.
        const loaded = performance.getEntriesByType('resource').map((entry) => entry.name)
        const urls = [location.href, ...loaded.filter((url) => url.startsWith(location.origin))]
        registration.active?.postMessage({ type: 'cache', urls })
      })
      .catch(() => {
        // No service worker here (a sandboxed frame, say): everything still works, just not offline.
      })
  }, [])

  return null
}
