import { expect, test, type Page } from '@playwright/test'

const seedAgentProfile = async (page: Page) => {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      'scp-zombie-checker:agent-profile',
      JSON.stringify({
        agentName: 'Dana Voss',
        callsign: 'MTF-11',
        taskForceUnit: 'MTF Nu-7 (Hammer Down)',
        clearanceLevel: '4',
      }),
    )
  })
}

const continueBtn = (page: Page) => page.locator('.step-card').getByRole('button', { name: /continue/i })
const skipBtn = (page: Page) => page.locator('.step-nav').getByRole('button', { name: /skip/i })

test('first run agent onboarding can activate a local agent profile', async ({ page }) => {
  await page.goto('/#/')

  await expect(page.getByText('Booting field console')).toBeVisible()
  // Boot sequence is 1800ms; wait for form so we're past it (CI can be slow)
  await expect(page.getByRole('heading', { name: /configure agent profile/i })).toBeVisible({ timeout: 6000 })

  await page.getByLabel('Agent name').fill('Dana Voss')
  await page.getByLabel('Callsign').fill('MTF-11')
  await page.getByLabel('Task force unit').selectOption('MTF Nu-7 (Hammer Down)')
  await page.getByLabel('Clearance level').selectOption('4')
  await page.getByRole('button', { name: /activate agent profile/i }).click()

  await expect(page.getByRole('heading', { name: 'SCP Zombie Checker' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Dashboard' })).toBeVisible()
})

test('dashboard loads and navigation works', async ({ page }) => {
  await seedAgentProfile(page)
  await page.goto('/#/')

  await expect(page.getByRole('heading', { name: 'SCP Zombie Checker' })).toBeVisible()
  await expect(page.getByText('Field dashboard')).toBeVisible()

  await page.locator('.hero-actions').getByRole('link', { name: 'New patient' }).click()
  await expect(page.getByText('New patient intake')).toBeVisible()

  await page.getByRole('link', { name: 'Transfers' }).click()
  await expect(page.getByText('Export or import patient files')).toBeVisible()
})

test('new patient wizard steps through and saves a record', async ({ page }) => {
  await seedAgentProfile(page)
  await page.goto('/#/')
  await page.locator('.hero-actions').getByRole('link', { name: 'New patient' }).click()

  await expect(page.locator('.sticky-header')).toBeVisible()
  await expect(page.locator('.sticky-header').getByText(/infection/i)).toBeVisible()

  await page.locator('.sticky-header').click()
  await expect(page.getByText('Live SCP threat board')).toBeVisible()
  await expect(page.getByText(/zombie infection probability/i)).toBeVisible()
  await page.locator('.sticky-header').click()

  // Step 1: Name
  await page.getByLabel('Subject name').fill('E2E Subject')
  await continueBtn(page).click()

  // Step 2: Age
  await page.getByLabel('Age').fill('29')
  await continueBtn(page).click()

  // Step 3: Sex
  await page.locator('.step-option-btn', { hasText: 'Female' }).click()

  // Step 4: Hair colour
  await page.getByLabel('Hair colour').fill('Black')
  await continueBtn(page).click()

  // Step 5: Eye colour
  await page.getByLabel('Eye colour').fill('Brown')
  await continueBtn(page).click()

  // Step 6: Skin pigmentation
  await page.getByLabel('Skin pigmentation').fill('Light')
  await continueBtn(page).click()

  // Step 7: Photo (skip)
  await skipBtn(page).click()

  // Step 8: Pupils
  await page.locator('.step-option-btn', { hasText: 'Clouded' }).click()

  // Step 9: Temperature — pick Normal range (no warning)
  await page.getByRole('button', { name: /^Normal / }).click()

  // Step 10: Heartbeat detected
  await page.locator('.step-option-btn', { hasText: 'YES' }).click()

  // Step 11: Heartbeat BPM
  await continueBtn(page).click()

  // Step 12: EMF — pick High (triggers warning)
  await page.locator('.step-option-btn', { hasText: 'High' }).first().click()
  await page.getByRole('button', { name: /acknowledged/i }).click()

  // Step 13: Symptoms — toggling aggression shows warning
  const aggressionLabel = page.locator('label.symptom-card', { hasText: 'Aggression' })
  await aggressionLabel.scrollIntoViewIfNeeded()
  await aggressionLabel.click()
  await page.getByRole('button', { name: /acknowledged/i }).click()
  await continueBtn(page).click()

  // Step 14: Notes (skip)
  await skipBtn(page).click()

  // Step 15: Review — infection probability should be shown
  await expect(page.getByText(/infection probability/i)).toBeVisible()
  await page.getByRole('button', { name: /save patient/i }).click()

  await expect(page.getByRole('heading', { name: 'E2E Subject' })).toBeVisible()
  await expect(page.getByRole('button', { name: /update symptoms/i })).toBeVisible()
  await expect(page.getByRole('button', { name: /change status/i })).toBeVisible()
  await expect(page.getByRole('button', { name: /assign variant/i })).toBeVisible()

  // Patient detail page sticky header should be visible
  await expect(page.locator('.sticky-header').first()).toBeVisible()

  // Click header to expand — shows most pressing alert
  await page.locator('.sticky-header').first().click()
  await expect(page.getByText(/primary warning condition/i)).toBeVisible()

  // Expand all alerts
  const viewMore = page.getByRole('button', { name: /view all alerts/i })
  if (await viewMore.isVisible()) {
    await viewMore.click()
    await expect(page.getByText(/active warning conditions/i)).toBeVisible()
  }

  // Collapse again
  await page.locator('.sticky-header').first().click()
  await expect(page.getByText(/record history/i)).toBeVisible()
})

test('no heartbeat triggers urgent warning and skips BPM', async ({ page }) => {
  await seedAgentProfile(page)
  await page.goto('/#/')
  await page.locator('.hero-actions').getByRole('link', { name: 'New patient' }).click()

  await page.getByLabel('Subject name').fill('Pulse Test')
  await continueBtn(page).click()
  await continueBtn(page).click() // age
  await page.locator('.step-option-btn', { hasText: 'Unknown' }).click() // sex
  await skipBtn(page).click() // hair
  await skipBtn(page).click() // eye
  await skipBtn(page).click() // skin
  await skipBtn(page).click() // photo
  await page.locator('.step-option-btn', { hasText: 'Normal' }).click() // pupils

  // Temperature — pick Normal range
  await page.getByRole('button', { name: /^Normal / }).click()

  // Click NO for heartbeat
  await page.locator('.step-option-btn', { hasText: 'NO' }).click()

  await expect(page.getByText('NO PULSE DETECTED')).toBeVisible()
  await expect(page.locator('.step-urgent-warning')).toBeVisible()
  await expect(page.locator('.step-urgent-warning').getByText(/POTENTIAL ZOMBIE/)).toBeVisible()

  await page.getByRole('button', { name: /acknowledged/i }).click()

  await expect(page.getByRole('heading', { name: 'EMF reading' })).toBeVisible()

  await expect(page.locator('.sticky-header').getByText('POTENTIAL ZOMBIE')).toBeVisible()
})

test('temperature warning appears for abnormal ranges', async ({ page }) => {
  await seedAgentProfile(page)
  await page.goto('/#/')
  await page.locator('.hero-actions').getByRole('link', { name: 'New patient' }).click()

  await page.getByLabel('Subject name').fill('Temp Test')
  await continueBtn(page).click()
  await continueBtn(page).click() // age
  await page.locator('.step-option-btn', { hasText: 'Unknown' }).click()
  await skipBtn(page).click() // hair
  await skipBtn(page).click() // eye
  await skipBtn(page).click() // skin
  await skipBtn(page).click() // photo
  await page.locator('.step-option-btn', { hasText: 'Normal' }).click() // pupils

  // Pick High Fever
  await page.locator('.step-option-btn', { hasText: 'High Fever' }).click()

  await expect(page.getByText(/HIGH FEVER/i)).toBeVisible()
  await page.getByRole('button', { name: /acknowledged/i }).click()

  await expect(page.getByRole('heading', { name: 'Heartbeat detected?' })).toBeVisible()
})

test('EMF extreme triggers containment warning', async ({ page }) => {
  await seedAgentProfile(page)
  await page.goto('/#/')
  await page.locator('.hero-actions').getByRole('link', { name: 'New patient' }).click()

  await page.getByLabel('Subject name').fill('EMF Test')
  await continueBtn(page).click()
  await continueBtn(page).click() // age
  await page.locator('.step-option-btn', { hasText: 'Unknown' }).click()
  await skipBtn(page).click() // hair
  await skipBtn(page).click() // eye
  await skipBtn(page).click() // skin
  await skipBtn(page).click() // photo
  await page.locator('.step-option-btn', { hasText: 'Normal' }).click() // pupils
  await page.getByRole('button', { name: /^Normal / }).click() // temp Normal
  await page.locator('.step-option-btn', { hasText: 'YES' }).click() // heartbeat
  await continueBtn(page).click() // BPM

  // Pick Extreme EMF
  await page.locator('.step-option-btn', { hasText: 'Extreme' }).click()

  await expect(page.getByText(/CONTAINMENT REQUIRED/i)).toBeVisible()
  await page.getByRole('button', { name: /acknowledged/i }).click()

  await expect(page.getByRole('heading', { name: /observed symptoms/i })).toBeVisible()
})

test('status editor and variant wizard work on patient detail page', async ({ page }) => {
  await seedAgentProfile(page)
  await page.goto('/#/')
  await page.locator('.hero-actions').getByRole('link', { name: 'New patient' }).click()

  // Quick-create a patient
  await page.getByLabel('Subject name').fill('Status Test')
  await continueBtn(page).click()
  await continueBtn(page).click() // age
  await page.locator('.step-option-btn', { hasText: 'Unknown' }).click()
  await skipBtn(page).click() // hair
  await skipBtn(page).click() // eye
  await skipBtn(page).click() // skin
  await skipBtn(page).click() // photo
  await page.locator('.step-option-btn', { hasText: 'Normal' }).click() // pupils
  await page.getByRole('button', { name: /^Normal / }).click() // temp
  await page.locator('.step-option-btn', { hasText: 'YES' }).click() // heartbeat
  await continueBtn(page).click() // BPM
  await page.locator('.step-option-btn', { hasText: 'Low' }).click() // EMF
  await continueBtn(page).click() // symptoms
  await skipBtn(page).click() // notes
  await page.getByRole('button', { name: /save patient/i }).click()

  // Now on detail page
  await expect(page.getByRole('heading', { name: 'Status Test' })).toBeVisible()

  // Open status wizard
  await page.getByRole('button', { name: /change status/i }).click()
  await expect(page.getByText(/select containment status/i)).toBeVisible()

  // Pick Threat — triggers warning
  await page.locator('.step-option-btn', { hasText: 'Threat' }).first().click()
  await expect(page.getByText(/THREAT DESIGNATION ACTIVE/i)).toBeVisible()
  await page.getByRole('button', { name: /acknowledged/i }).click()

  // Confirm
  await page.getByRole('button', { name: /set status to threat/i }).click()

  // Status should be updated
  await expect(page.locator('.review-list').getByText('Threat')).toBeVisible()

  // Open variant wizard
  await page.getByRole('button', { name: /assign variant/i }).click()
  await expect(page.getByText(/select confirmed variant/i)).toBeVisible()

  // Pick Alpha — triggers warning
  await page.locator('.step-option-btn', { hasText: /Alpha/ }).click()
  await expect(page.getByText(/EXTREME THREAT/i)).toBeVisible()
  await page.getByRole('button', { name: /acknowledged/i }).click()

  // Confirm
  await page.getByRole('button', { name: /confirm alpha/i }).click()

  // Variant should be updated
  await expect(page.locator('.review-list').getByText(/Alpha/)).toBeVisible()

  // History should show the changes
  await expect(page.locator('.history-entry').getByText(/status change/i).first()).toBeVisible()
  await expect(page.locator('.history-entry').getByText(/variant assigned/i).first()).toBeVisible()
})

test('new patient wizard accepts a patient photo upload', async ({ page }) => {
  await seedAgentProfile(page)
  await page.goto('/#/')
  await page.locator('.hero-actions').getByRole('link', { name: 'New patient' }).click()

  await page.getByLabel('Subject name').fill('Photo Subject')
  await continueBtn(page).click()

  await page.getByLabel('Age').fill('29')
  await continueBtn(page).click()

  await page.locator('.step-option-btn', { hasText: 'Female' }).click()

  await page.getByLabel('Hair colour').fill('Black')
  await continueBtn(page).click()

  await page.getByLabel('Eye colour').fill('Brown')
  await continueBtn(page).click()

  await page.getByLabel('Skin pigmentation').fill('Light')
  await continueBtn(page).click()

  await page.getByLabel('Upload patient photo').setInputFiles({
    name: 'patient-photo.jpg',
    mimeType: 'image/jpeg',
    buffer: Buffer.from('mock-patient-photo'),
  })

  await expect(page.getByAltText('Patient preview')).toBeVisible()
})
