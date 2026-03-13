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

test.describe('Testing prints page', () => {
  test('loads at /#/testing/prints and shows all severity variant sections', async ({ page }) => {
    await seedAgentProfile(page)
    await page.goto('/#/testing/prints')

    await expect(page.getByTestId('print-variant-dossier-cleared')).toBeVisible()
    await expect(page.getByTestId('print-variant-dossier-warning')).toBeVisible()
    await expect(page.getByTestId('print-variant-dossier-critical')).toBeVisible()
    await expect(page.getByTestId('print-variant-badge-cleared')).toBeVisible()
    await expect(page.getByTestId('print-variant-badge-warning')).toBeVisible()
    await expect(page.getByTestId('print-variant-badge-critical')).toBeVisible()
  })

  test('page has Print all button that can be clicked', async ({ page }) => {
    await seedAgentProfile(page)
    await page.goto('/#/testing/prints')

    const printBtn = page.getByRole('button', { name: /print all/i })
    await expect(printBtn).toBeVisible()
    await printBtn.click()
    // window.print() may open dialog; we only check it does not throw
  })

  test('dossier sections show SCP document structure', async ({ page }) => {
    await seedAgentProfile(page)
    await page.goto('/#/testing/prints')

    const dossier = page.getByTestId('print-variant-dossier-cleared')
    await expect(dossier.getByText('Secure. Contain. Protect.')).toBeVisible()
    await expect(dossier.getByText('CONFIDENTIAL!')).toBeVisible()
  })
})
