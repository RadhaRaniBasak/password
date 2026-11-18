import { expect, test, type Page } from '@playwright/test'

const generator = (page: Page) => page.getByRole('region', { name: 'Password', exact: true })
const passwordText = (page: Page) => generator(page).locator('p.font-mono span.select-all')

async function bits(page: Page) {
  return Number((await generator(page).locator('header').innerText()).match(/(\d+) bits/)?.[1])
}

async function strength(page: Page, region = generator(page)) {
  return (await region.textContent())?.match(/Strength: (Weak|Fair|Good|Strong|Very strong)/)?.[1]
}

async function open(page: Page) {
  await page.goto('/')
  await expect(passwordText(page)).not.toHaveText('Generating…')
}

test('generates a strong password on load without contacting other hosts', async ({ page, baseURL }) => {
  const foreign: string[] = []
  const errors: string[] = []
  page.on('request', (request) => {
    if (!request.url().startsWith(baseURL!) && !request.url().startsWith('data:')) foreign.push(request.url())
  })
  page.on('console', (message) => message.type() === 'error' && errors.push(message.text()))

  const response = await page.goto('/')
  expect(response?.headers()['content-security-policy']).toContain("connect-src 'self'")
  await expect(passwordText(page)).toHaveText(/^[A-Za-z0-9]{20}$/)
  const text = await passwordText(page).innerText()
  for (const pattern of [/[A-Z]/, /[a-z]/, /[0-9]/]) expect(text).toMatch(pattern)
  expect(await bits(page)).toBe(119)
  expect(await strength(page)).toBe('Very strong')

  // The checker's word lists load on first use, from this site too.
  await page.getByLabel('Password to check').fill('hunter2')
  await expect(page.getByText('Loading word lists…')).toBeHidden()

  expect(foreign).toEqual([])
  expect(errors).toEqual([])
})

test('every selected character type always appears, even in short passwords', async ({ page }) => {
  await open(page)
  await page.locator('#password-length').fill('8')
  expect(await bits(page)).toBe(47)
  expect(await strength(page)).toBe('Fair')

  for (let i = 0; i < 30; i++) {
    await page.keyboard.press('r')
    const text = await passwordText(page).innerText()
    expect(text).toHaveLength(8)
    for (const pattern of [/[A-Z]/, /[a-z]/, /[0-9]/]) expect(text).toMatch(pattern)
  }
})

test('symbols: pick which ones, avoid look-alikes, keep at least one type', async ({ page }) => {
  await open(page)
  await page.getByRole('button', { name: '!@# symbols' }).click()
  await page.getByRole('button', { name: 'hash', exact: true }).click()
  await expect(page.getByRole('button', { name: 'hash', exact: true })).toHaveAttribute('aria-pressed', 'false')
  await page.getByRole('switch', { name: 'Avoid look-alikes' }).click()

  for (let i = 0; i < 30; i++) {
    await page.keyboard.press('r')
    const text = await passwordText(page).innerText()
    expect(text).toMatch(/[^A-Za-z0-9]/)
    expect(text).not.toMatch(/[#0O1lI|]/)
  }

  for (const name of ['A–Z uppercase', 'a–z lowercase', '0–9 numbers']) await page.getByRole('button', { name }).click()
  await page.getByRole('button', { name: '!@# symbols' }).click()
  await expect(page.getByText('Keep at least one character type on')).toBeVisible()
  await expect(page.getByRole('button', { name: '!@# symbols' })).toHaveAttribute('aria-pressed', 'true')
  await expect(passwordText(page)).toHaveText(/^[^A-Za-z0-9]{20}$/)
})

test('memorable passphrases use 3–8 EFF words', async ({ page }) => {
  await open(page)
  await page.getByRole('button', { name: 'Memorable' }).click()
  await expect(passwordText(page)).toHaveText(/^([A-Z][a-z]+-){5}\d{3}$/)
  expect(await bits(page)).toBe(74)
  expect(await strength(page)).toBe('Good')

  const words = page.getByRole('group', { name: 'Words' }).getByRole('button')
  await expect(words).toHaveText(['3', '4', '5', '6', '7', '8'])
  await words.filter({ hasText: '7' }).click()
  await expect(passwordText(page)).toHaveText(/^([A-Z][a-z]+-){7}\d{3}$/)
  expect(await strength(page)).toBe('Very strong')
})

test('PIN mode makes non-trivial PINs and says when they are safe', async ({ page }) => {
  await open(page)
  await page.getByRole('button', { name: 'PIN' }).click()
  await expect(passwordText(page)).toHaveText(/^\d{6}$/)
  expect(await strength(page)).toBe('Weak')
  await expect(page.getByText('PINs are only safe where attempts are limited')).toBeVisible()
  await page.locator('#pin-length').fill('12')
  await expect(passwordText(page)).toHaveText(/^\d{12}$/)
})

test('copy shortcut, history and clearing it', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await open(page)
  const first = await passwordText(page).innerText()

  await page.keyboard.press('c')
  await expect(page.getByText('Copied to clipboard')).toBeVisible()
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(first)

  await page.keyboard.press('r')
  await page.keyboard.press('r')
  const history = page.getByRole('list', { name: 'Recent passwords' })
  await expect(history.getByRole('listitem')).toHaveCount(2)
  await expect(history.getByRole('listitem').last()).toContainText(first)
  await expect(history.getByRole('listitem').last()).toContainText('(copied)')

  await page.getByRole('button', { name: 'Clear' }).click()
  await expect(page.getByText('Passwords you generate past or copy show up here.')).toBeVisible()
})

test('read-out view spells each character, and hover shows names', async ({ page }) => {
  await open(page)
  const text = await passwordText(page).innerText()
  await expect(passwordText(page).locator('span').first()).toHaveAttribute('data-tip', /^1 · \S/)

  await page.getByRole('button', { name: 'Read it out in large type' }).click()
  const dialog = page.getByRole('dialog', { name: 'Read it out' })
  await expect(dialog.getByRole('listitem')).toHaveCount(text.length)
  await page.keyboard.press('r') // shortcuts pause while the dialog is open
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(passwordText(page)).toHaveText(text)
})

test('checker rates typed passwords on this device', async ({ page }) => {
  await open(page)
  const checker = page.getByRole('region', { name: 'Check a password' })
  await checker.getByLabel('Password to check').fill('password123')
  await expect(checker.getByText('This is a commonly used password.')).toBeVisible()
  expect(await strength(page, checker)).toBe('Weak')

  await checker.getByLabel('Password to check').fill('vmLX1fqEzIMCivno4401')
  await expect(checker.getByText('No common words, names, dates or keyboard patterns found.')).toBeVisible()
})

test('Wi-Fi QR follows the generated password and explains what is missing', async ({ page }) => {
  await open(page)
  const wifi = page.getByRole('region', { name: 'Wi-Fi QR' })
  await expect(wifi.getByText('Add the network name to make a code')).toBeVisible()
  await wifi.getByLabel('Network name').fill('Home-5G')
  await expect(wifi.getByRole('img', { name: 'QR code to join Home-5G' })).toBeVisible()
  await expect(wifi.getByLabel('Password', { exact: true })).toHaveValue(await passwordText(page).innerText())

  await page.getByRole('button', { name: 'PIN' }).click()
  await expect(wifi.getByText('WPA passwords need 8–63 characters')).toBeVisible()
})

test('settings survive a reload; passwords are never stored', async ({ page }) => {
  await open(page)
  await page.getByRole('button', { name: 'Memorable' }).click()
  await page.getByRole('group', { name: 'Words' }).getByRole('button', { name: '6' }).click()
  const shown = await passwordText(page).innerText()

  await page.reload()
  await expect(page.getByRole('button', { name: 'Memorable' })).toHaveAttribute('aria-pressed', 'true')
  await expect(passwordText(page)).toHaveText(/^([A-Z][a-z]+-){6}\d{3}$/)
  const stored = await page.evaluate(() => JSON.stringify(localStorage))
  expect(stored).not.toContain(shown)
  expect(stored).not.toContain(await passwordText(page).innerText())
})

test('dark theme follows the system setting', async ({ browser }) => {
  const page = await browser.newPage({ colorScheme: 'dark' })
  await open(page)
  await expect(generator(page)).toHaveCSS('background-color', 'rgb(22, 22, 22)')
  await page.close()
})

test('Generate plays a short scramble when motion is allowed', async ({ browser }) => {
  const page = await browser.newPage({ reducedMotion: 'no-preference' })
  await open(page)
  await page.getByRole('button', { name: 'Generate' }).click()
  await expect.poll(() => passwordText(page).locator('span.text-muted').count(), { timeout: 300 }).toBeGreaterThan(0)
  await expect(passwordText(page).locator('span.text-muted')).toHaveCount(0)
  await page.close()
})

test('works offline after the first visit', async ({ page, context }) => {
  await open(page)
  await page.evaluate(() => navigator.serviceWorker.ready)
  await expect.poll(() => page.evaluate(() => caches.keys().then((keys) => keys.length))).toBeGreaterThan(0)
  await page.waitForTimeout(500) // let the worker finish storing the first visit's files

  await context.setOffline(true)
  await page.reload()
  await expect(passwordText(page)).toHaveText(/^[A-Za-z0-9]{20}$/)
  await page.getByRole('button', { name: 'Generate' }).click()
  await expect(passwordText(page)).toHaveText(/^[A-Za-z0-9]{20}$/)
})
