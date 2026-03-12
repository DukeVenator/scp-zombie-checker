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

/** Quick flow to create a patient and land on patient detail page */
async function createPatientAndGoToDetail(page: Page, subjectName: string) {
  await page.goto('/#/')
  await page.locator('.hero-actions').getByRole('link', { name: 'New patient' }).click()
  await expect(page.locator('.sticky-header')).toBeVisible({ timeout: 6000 })

  await page.getByLabel('Subject name').fill(subjectName)
  await continueBtn(page).click()
  await page.getByLabel('Age').fill('28')
  await continueBtn(page).click()
  await page.locator('.step-option-btn', { hasText: 'Female' }).click()
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

  await expect(page.getByRole('heading', { name: subjectName })).toBeVisible({ timeout: 5000 })
}

test.describe('Patient detail print', () => {
  test('print card is present and contains SCP dossier content', async ({ page }) => {
    await seedAgentProfile(page)
    await createPatientAndGoToDetail(page, 'Print Dossier Subject')

    const card = page.locator('.scp-print-card')
    await expect(card).toBeAttached()

    const border = card.locator('.scp-print-card__border')
    await expect(border).toContainText('Secure. Contain. Protect.')
    await expect(border).toContainText('Item #')
    await expect(border).toContainText('Object Class')
    await expect(border).toContainText('Special Containment Procedures:')
    await expect(border).toContainText('Description:')
    await expect(border).toContainText('CONFIDENTIAL!')
    await expect(border).toContainText('This document may not be shared with or used by personnel below the designated clearance level')
    await expect(border).toContainText('Print Dossier Subject')
  })

  test('print card Item # matches SCP-XXXXXXXX format', async ({ page }) => {
    await seedAgentProfile(page)
    await createPatientAndGoToDetail(page, 'Item Number Test')

    const itemRow = page.locator('.scp-print-card .scp-print__meta-row').filter({ has: page.locator('dt:has-text("Item #")') })
    const dd = itemRow.locator('dd')
    await expect(dd).toHaveText(/^SCP-[A-F0-9]{8}$/i)
  })

  test('Print button is visible and invokes print', async ({ page }) => {
    await page.addInitScript(() => {
      ;(window as unknown as { __printCalled?: boolean }).__printCalled = false
      window.print = function () {
        ;(window as unknown as { __printCalled?: boolean }).__printCalled = true
      }
    })

    await seedAgentProfile(page)
    await createPatientAndGoToDetail(page, 'Print Button Test')

    const printBtn = page.getByRole('button', { name: /print/i })
    await expect(printBtn).toBeVisible()
    await printBtn.click()

    const printCalled = await page.evaluate(() => (window as unknown as { __printCalled?: boolean }).__printCalled)
    expect(printCalled).toBe(true)
  })
})
