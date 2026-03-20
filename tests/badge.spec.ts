import { expect, test } from '@playwright/test'

/** Encode a badge payload as the `d` query param (base64url JSON with v:1). */
function encodeBadgeParam(payload: {
  id: string
  name: string
  status: string
  infectionPct: number
  updatedAt: string
  summary: string
  containment?: string
  variant?: string
  threatLevel?: string
  exportedBy?: { callsign: string; agentName: string }
}): string {
  const blob = JSON.stringify({ v: 1, ...payload })
  return Buffer.from(blob, 'utf-8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

const basePayload = {
  id: 'e2e-badge-test-id',
  name: 'E2E Badge Subject',
  updatedAt: '2026-03-12T12:00:00.000Z',
  summary: 'Low anomaly. Standard observation.',
}

test('badge page with invalid or missing d shows error', async ({ page }) => {
  await page.goto('/#/badge')
  await expect(page.getByRole('heading', { name: /invalid or expired check/i })).toBeVisible()
  await expect(page.getByText(/link may be corrupted or no longer valid/i)).toBeVisible()

  await page.goto('/#/badge?d=not-valid-base64')
  await expect(page.getByRole('heading', { name: /invalid or expired check/i })).toBeVisible()

  const validD = encodeBadgeParam({
    ...basePayload,
    status: 'Cleared',
    infectionPct: 10,
    containment: 'Normal',
    variant: 'Normal',
    threatLevel: 'Low',
  })
  await page.goto(`/#/badge?d=${validD}`)
  await expect(page.getByRole('heading', { name: /invalid or expired check/i })).not.toBeVisible()
})

test('badge page with valid payload shows document content', async ({ page }) => {
  const d = encodeBadgeParam({
    ...basePayload,
    status: 'Cleared',
    infectionPct: 25,
    containment: 'Normal',
    variant: 'Normal',
    threatLevel: 'Low',
  })
  await page.goto(`/#/badge?d=${d}`)

  // Loading state may be 0ms when prefers-reduced-motion; wait for doc
  await expect(page.locator('.badge-doc')).toBeVisible({ timeout: 8000 })

  await expect(page.getByText(/SCP FIELD INTAKE — SUBJECT CHECK/i)).toBeVisible()
  await expect(page.getByText(/DOC #E2E/i)).toBeVisible()
  await expect(page.getByRole('heading', { name: 'E2E Badge Subject' })).toBeVisible()
  await expect(page.locator('.badge-doc__meta').getByText('Cleared').first()).toBeVisible()
  await expect(page.getByText('25%')).toBeVisible()
  await expect(page.locator('.badge-doc__summary').getByText('Low anomaly. Standard observation.')).toBeVisible()
  await expect(page.getByText('Scan to view or update this record')).toBeVisible()
  await expect(page.locator('.badge-doc__qr-wrap')).toBeVisible()
})

test('badge page shows Exported by when payload includes exportedBy', async ({ page }) => {
  const d = encodeBadgeParam({
    ...basePayload,
    status: 'Cleared',
    infectionPct: 25,
    containment: 'Normal',
    variant: 'Normal',
    threatLevel: 'Low',
    exportedBy: { callsign: 'MTF-11', agentName: 'Dana Voss' },
  })
  await page.goto(`/#/badge?d=${d}`)

  await expect(page.locator('.badge-doc')).toBeVisible({ timeout: 8000 })
  await expect(page.locator('.badge-doc').getByText('Exported by')).toBeVisible()
  await expect(page.locator('.badge-doc').getByText(/MTF-11/)).toBeVisible()
  await expect(page.locator('.badge-doc').getByText(/Dana Voss/)).toBeVisible()
})

test('badge page at mobile viewport shows stacked layout with subject info and QR visible', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  const d = encodeBadgeParam({
    ...basePayload,
    status: 'Cleared',
    infectionPct: 25,
    containment: 'Normal',
    variant: 'Normal',
    threatLevel: 'Low',
  })
  await page.goto(`/#/badge?d=${d}`)

  // Loading state may be 0ms when prefers-reduced-motion; wait for doc
  await expect(page.locator('.badge-doc')).toBeVisible({ timeout: 8000 })
  await expect(page.locator('.badge-unlock-overlay')).not.toBeVisible({ timeout: 5000 })

  await expect(page.getByRole('heading', { name: 'E2E Badge Subject' })).toBeVisible()
  await expect(page.locator('.badge-doc__col--info')).toBeVisible()
  await expect(page.locator('.badge-doc__meta').getByText('Cleared').first()).toBeVisible()
  await expect(page.getByText('25%')).toBeVisible()
  await expect(page.locator('.badge-doc__qr-wrap')).toBeVisible()
})

test('badge page loading state shows shield icon and loading text', async ({ page }) => {
  const d = encodeBadgeParam({
    ...basePayload,
    status: 'Cleared',
    infectionPct: 10,
    containment: 'Normal',
    variant: 'Normal',
    threatLevel: 'Low',
  })
  await page.goto(`/#/badge?d=${d}`)

  // With prefers-reduced-motion the loading state can be 0ms; accept either loading or doc
  const loading = page.locator('.badge-page__loading')
  const doc = page.locator('.badge-doc')
  await expect(loading.or(doc)).toBeVisible({ timeout: 8000 })
  const sawLoading = await loading.isVisible().catch(() => false)
  if (sawLoading) {
    await expect(page.getByText('Loading document…')).toBeVisible()
    await expect(page.locator('.badge-page__loading-icon')).toBeVisible()
  }
  // else: loading was skipped (reduced motion); page still works, test passes
})

test('badge page entry animation: page gets entered class and doc sections have entry classes', async ({ page }) => {
  const d = encodeBadgeParam({
    ...basePayload,
    status: 'Cleared',
    infectionPct: 15,
    containment: 'Normal',
    variant: 'Normal',
    threatLevel: 'Low',
  })
  await page.goto(`/#/badge?d=${d}`)

  await expect(page.locator('.badge-doc')).toBeVisible({ timeout: 8000 })
  await expect(page.locator('.badge-unlock-overlay')).not.toBeVisible({ timeout: 5000 })

  const badgePage = page.locator('.badge-page')
  await expect(badgePage).toHaveClass(/badge-page--entered/)
  await expect(page.locator('.badge-doc__stripe--entry')).toBeVisible()
  await expect(page.locator('.badge-doc__header--entry')).toBeVisible()
  await expect(page.locator('.badge-doc__body--entry')).toBeVisible()
})

test('badge page infection percentage gets danger class when >= 70%', async ({ page }) => {
  const d = encodeBadgeParam({
    ...basePayload,
    status: 'Critical',
    infectionPct: 75,
    containment: 'Normal',
    variant: 'Normal',
    threatLevel: 'Critical',
  })
  await page.goto(`/#/badge?d=${d}`)

  await expect(page.locator('.badge-doc')).toBeVisible({ timeout: 8000 })
  await expect(page.locator('.badge-doc__meta dd.badge-doc__danger')).toContainText('75')
})

test('badge page infection percentage gets warn class when 40-69%', async ({ page }) => {
  const d = encodeBadgeParam({
    ...basePayload,
    status: 'Suspected',
    infectionPct: 50,
    containment: 'Normal',
    variant: 'Normal',
    threatLevel: 'Elevated',
  })
  await page.goto(`/#/badge?d=${d}`)

  await expect(page.locator('.badge-doc')).toBeVisible({ timeout: 8000 })
  await expect(page.locator('.badge-doc__meta dd.badge-doc__warn')).toContainText('50')
})

test('badge page applies severity styling for cleared payload', async ({ page }) => {
  const d = encodeBadgeParam({
    ...basePayload,
    status: 'Cleared',
    infectionPct: 6,
    containment: 'Normal',
    variant: 'Normal',
    threatLevel: 'Low',
  })
  await page.goto(`/#/badge?d=${d}`)

  await expect(page.locator('.badge-doc')).toBeVisible({ timeout: 8000 })
  const pageEl = page.locator('.badge-page')
  await expect(pageEl).toHaveAttribute('data-severity', 'cleared')
  await expect(pageEl).toHaveClass(/badge-page--severity-cleared/)
})

test('badge page applies severity styling for warning payload', async ({ page }) => {
  const d = encodeBadgeParam({
    ...basePayload,
    status: 'Suspected',
    infectionPct: 50,
    containment: 'Normal',
    variant: 'Normal',
    threatLevel: 'Elevated',
  })
  await page.goto(`/#/badge?d=${d}`)

  await expect(page.locator('.badge-doc')).toBeVisible({ timeout: 8000 })
  await expect(page.locator('.badge-page')).toHaveAttribute('data-severity', 'warning')
  await expect(page.locator('.badge-page')).toHaveClass(/badge-page--severity-warning/)
})

test('badge page applies severity styling for critical payload', async ({ page }) => {
  const d = encodeBadgeParam({
    ...basePayload,
    status: 'Critical',
    infectionPct: 75,
    containment: 'Escaped',
    variant: 'Alpha',
    threatLevel: 'Critical',
  })
  await page.goto(`/#/badge?d=${d}`)

  await expect(page.locator('.badge-doc')).toBeVisible({ timeout: 8000 })
  await expect(page.locator('.badge-page')).toHaveAttribute('data-severity', 'critical')
  await expect(page.locator('.badge-page')).toHaveClass(/badge-page--severity-critical/)
})

test('badge page shows status clear unlock overlay for cleared low-risk under 20%', async ({ page }) => {
  const d = encodeBadgeParam({
    ...basePayload,
    status: 'Cleared',
    infectionPct: 6,
    containment: 'Normal',
    variant: 'Normal',
    threatLevel: 'Low',
  })
  await page.goto(`/#/badge?d=${d}`)

  await expect(page.getByText('Loading document…')).toBeVisible()
  await expect(page.locator('.badge-unlock-overlay')).toBeVisible({ timeout: 6000 })
  await expect(page.getByText('VERIFYING…').or(page.getByText('STATUS CLEAR'))).toBeVisible()

  await expect(page.getByText('STATUS CLEAR')).toBeVisible({ timeout: 2000 })
  await expect(page.getByText('CLEARED — LOW RISK')).toBeVisible({ timeout: 2000 })

  await expect(page.locator('.badge-unlock-overlay')).not.toBeVisible({ timeout: 5000 })
  await expect(page.locator('.badge-doc')).toBeVisible()
  await expect(page.locator('.badge-doc.badge-doc--unlocking-cleared')).toBeVisible()
})

test('badge page shows unlock overlay for cleared 25% then reveals doc with unlocking animation', async ({ page }) => {
  const d = encodeBadgeParam({
    ...basePayload,
    status: 'Cleared',
    infectionPct: 25,
    containment: 'Normal',
    variant: 'Normal',
    threatLevel: 'Low',
  })
  await page.goto(`/#/badge?d=${d}`)

  await expect(page.locator('.badge-unlock-overlay')).toBeVisible({ timeout: 6000 })
  await expect(page.locator('.badge-unlock-overlay')).not.toBeVisible({ timeout: 5000 })
  await expect(page.locator('.badge-doc.badge-doc--unlocking-cleared')).toBeVisible()
})

test('badge page shows warning unlock overlay and unlocking animation', async ({ page }) => {
  const d = encodeBadgeParam({
    ...basePayload,
    status: 'Suspected',
    infectionPct: 50,
    containment: 'Normal',
    variant: 'Normal',
    threatLevel: 'Elevated',
  })
  await page.goto(`/#/badge?d=${d}`)

  await expect(page.locator('.badge-unlock-overlay.badge-unlock-overlay--warning')).toBeVisible({ timeout: 6000 })
  await expect(page.locator('.badge-unlock-overlay').getByText(/ELEVATED RISK|VERIFYING…/)).toBeVisible()
  await expect(page.getByText('VERIFY THREAT LEVEL')).toBeVisible({ timeout: 2000 })
  await expect(page.locator('.badge-unlock-overlay')).not.toBeVisible({ timeout: 5000 })
  await expect(page.locator('.badge-doc.badge-doc--unlocking-warning')).toBeVisible()
})

test('badge page shows critical unlock overlay and unlocking animation', async ({ page }) => {
  const d = encodeBadgeParam({
    ...basePayload,
    status: 'Critical',
    infectionPct: 75,
    containment: 'Escaped',
    variant: 'Alpha',
    threatLevel: 'Critical',
  })
  await page.goto(`/#/badge?d=${d}`)

  await expect(page.locator('.badge-unlock-overlay.badge-unlock-overlay--critical')).toBeVisible({ timeout: 6000 })
  await expect(page.getByText('HIGH THREAT').or(page.getByText('VERIFYING…'))).toBeVisible()
  await expect(page.getByText('CONTAINMENT ALERT')).toBeVisible({ timeout: 2000 })
  await expect(page.locator('.badge-unlock-overlay')).not.toBeVisible({ timeout: 5000 })
  await expect(page.locator('.badge-doc.badge-doc--unlocking-critical')).toBeVisible()
})

test('badge page does not show welcome back overlay', async ({ page }) => {
  await page.addInitScript(() => {
    window.sessionStorage.setItem('scp-zombie-checker:startup-done', '1')
    window.localStorage.setItem(
      'scp-zombie-checker:agent-profile',
      JSON.stringify({
        agentName: 'Dana Voss',
        callsign: 'MTF-11',
        taskForceUnit: 'MTF Nu-7',
        clearanceLevel: '4',
      }),
    )
  })

  const d = encodeBadgeParam({
    ...basePayload,
    status: 'Cleared',
    infectionPct: 10,
    containment: 'Normal',
    variant: 'Normal',
    threatLevel: 'Low',
  })
  await page.goto(`/#/badge?d=${d}`)

  await expect(page.getByText('WELCOME BACK')).not.toBeVisible()
  await expect(page.locator('.unlock-overlay--welcome')).not.toBeVisible()
  await expect(page.locator('.badge-doc')).toBeVisible({ timeout: 8000 })
})

test('badge page has background layer and content on top', async ({ page }) => {
  const d = encodeBadgeParam({
    ...basePayload,
    status: 'Cleared',
    infectionPct: 15,
    containment: 'Normal',
    variant: 'Normal',
    threatLevel: 'Low',
  })
  await page.goto(`/#/badge?d=${d}`)

  await expect(page.locator('.badge-doc')).toBeVisible({ timeout: 8000 })
  await expect(page.locator('.badge-unlock-overlay')).not.toBeVisible({ timeout: 5000 })

  await expect(page.locator('.badge-page__bg')).toBeVisible()
  await expect(page.locator('.badge-page__bg-canvas')).toBeVisible()
  await expect(page.locator('.badge-page__vignette')).toBeVisible()
  await expect(page.locator('.badge-page__scanlines')).toBeVisible()
  await expect(page.locator('.badge-page__content')).toBeVisible()
  await expect(page.locator('.badge-page__content').locator('.badge-doc')).toBeVisible()
})

test('cleared badge shows SCP FIELD INTAKE stripe not hazard', async ({ page }) => {
  const d = encodeBadgeParam({
    ...basePayload,
    status: 'Cleared',
    infectionPct: 10,
    containment: 'Normal',
    variant: 'Normal',
    threatLevel: 'Low',
  })
  await page.goto(`/#/badge?d=${d}`)

  await expect(page.locator('.badge-doc')).toBeVisible({ timeout: 8000 })
  await expect(page.getByText('SCP FIELD INTAKE — SUBJECT CHECK')).toBeVisible()
  await expect(page.locator('.badge-doc__stripe--hazard')).not.toBeVisible()
  await expect(page.getByText('CONTAINMENT HAZARD — TERMINATE')).not.toBeVisible()
})

test('critical badge shows hazard stripe and CONTAINMENT HAZARD TERMINATE', async ({ page }) => {
  const d = encodeBadgeParam({
    ...basePayload,
    status: 'Critical',
    infectionPct: 75,
    containment: 'Escaped',
    variant: 'Alpha',
    threatLevel: 'Critical',
  })
  await page.goto(`/#/badge?d=${d}`)

  await expect(page.locator('.badge-doc')).toBeVisible({ timeout: 8000 })
  await expect(page.locator('.badge-unlock-overlay')).not.toBeVisible({ timeout: 5000 })

  const stripe = page.locator('.badge-doc__stripe').first()
  await expect(stripe).toHaveClass(/badge-doc__stripe--hazard/)
  await expect(stripe.getByText('CONTAINMENT HAZARD — TERMINATE')).toBeVisible()
  await expect(page.locator('.badge-doc__header')).toHaveClass(/badge-doc__header--hazard/)
  await expect(page.locator('.badge-doc__humor--critical')).toBeVisible()
})

test('badge page severity-specific vignette and scanlines classes', async ({ page }) => {
  const d = encodeBadgeParam({
    ...basePayload,
    status: 'Suspected',
    infectionPct: 50,
    containment: 'Normal',
    variant: 'Normal',
    threatLevel: 'Elevated',
  })
  await page.goto(`/#/badge?d=${d}`)

  await expect(page.locator('.badge-doc')).toBeVisible({ timeout: 8000 })
  await expect(page.locator('.badge-page__vignette--warning')).toBeVisible()
  await expect(page.locator('.badge-page__scanlines--warning')).toBeVisible()
})

test('badge page applies severity styling for terminated payload', async ({ page }) => {
  const d = encodeBadgeParam({
    ...basePayload,
    status: 'Terminated',
    infectionPct: 100,
    containment: 'Terminated',
    variant: 'Normal',
    threatLevel: 'Low',
  })
  await page.goto(`/#/badge?d=${d}`)

  await expect(page.locator('.badge-doc')).toBeVisible({ timeout: 8000 })
  await expect(page.locator('.badge-page')).toHaveAttribute('data-severity', 'terminated')
  await expect(page.locator('.badge-page')).toHaveClass(/badge-page--severity-terminated/)
  await expect(page.locator('.badge-doc__terminated').getByText(/no longer a threat|terminated/i)).toBeVisible()
})
