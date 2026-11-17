# Password Generator

A client-side password toolkit built with Next.js 16, React 19, and Tailwind CSS 4, styled as a set of paper cards. Runs entirely in the browser, works offline, and never sends a password anywhere.

## Features

**Generator**

- **Random** — length 6–64 with toggles for uppercase, lowercase, numbers, and symbols. Every type you switch on is guaranteed to appear. Pick exactly which of the 32 keyboard symbols are allowed, and switch on "avoid look-alikes" to leave out `0 O 1 l I |`
- **Memorable** — 3–8 words from the [EFF long word list](https://www.eff.org/deeplinks/2016/07/new-wordlists-random-passphrases) (about 12.9 bits per word), with optional capitals and a 3-digit number
- **PIN** — 4–12 digits, skipping repeats and runs like 1111 or 1234
- **Accurate strength meter** — graded on the real entropy of your settings, shown in bits: Weak < 40, Fair 40–59, Good 60–79, Strong 80–99, Very strong 100+
- Unbiased, cryptographically secure generation via `crypto.getRandomValues`
- Hover a character for its position and spoken name; open the read-out view for large type spelled out (KILO, seven, hash…)
- Keyboard shortcuts: **R** generates, **C** copies

**Around it**

- **History** — the last 10 passwords you generated past or copied, kept in this tab's memory only
- **Check a password** — rates a password you already use with [zxcvbn](https://github.com/zxcvbn-ts/zxcvbn), which spots common words, names, dates and keyboard patterns. Runs locally; its word lists load the first time you use it
- **Wi-Fi QR** — turns a network name and password (the generated one by default) into a code phones can scan to join

**Everywhere**

- Light and dark themes (follows the system setting)
- Remembers your settings (never your passwords) in this browser
- Installable, and works offline after the first visit
- Private by design: fonts are bundled, and a Content-Security-Policy (in `next.config.ts`) stops the page loading from, or connecting to, any other host. If you add analytics or outside images, add their hosts there

The EFF word list (`lib/eff-wordlist.ts`) is © Electronic Frontier Foundation, licensed under [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/).

## Stack

- [Next.js](https://nextjs.org) 16 (via [vinext](https://github.com/nicholasgasior/vinext) — Vite-based Next.js runner)
- React 19 with Server Components
- Tailwind CSS 4
- Deployed to Cloudflare via `@cloudflare/vite-plugin`

## Getting Started

```bash
bun install
bun dev
```

Open [http://localhost:3000](http://localhost:3000).

To try the production build the way Cloudflare serves it (including offline support), run `bun run build && bun run preview`.

## Testing

- `bun run check` — fast checks of the generator, entropy, PIN, Wi-Fi and checker logic
- `bun run test:e2e` — Playwright tests of the whole app against a production build. First run `bunx playwright install chromium`, or set `CHROME_PATH` to an installed Chrome
- GitHub Actions (`.github/workflows/ci.yml`) runs lint, type checks, the checks and the browser tests on every push and pull request

## Deploying

- **From your machine:** `bun run deploy` signs you in to Cloudflare on first use, then publishes.
- **From CI:** add `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` as repository secrets. Every push to `main` that passes the tests then deploys.

## Scripts

| Command | Description |
|---|---|
| `bun dev` | Start dev server |
| `bun run build` | Production build |
| `bun run preview` | Serve the production build in Cloudflare's local runtime |
| `bun start` | Serve the production build with vinext (doesn't serve `public/` files) |
| `bun run deploy` | Deploy to Cloudflare |
| `bun lint` | Run ESLint |
| `bun run typecheck` | Run the TypeScript compiler |
| `bun run check` | Logic self-check |
| `bun run test:e2e` | Browser tests |
