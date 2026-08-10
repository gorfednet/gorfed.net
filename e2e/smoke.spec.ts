import { test, expect } from '@playwright/test'

test.describe('smoke', () => {
  test('homepage loads without fatal errors', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))

    const response = await page.goto('/')
    expect(response?.status()).toBeLessThan(400)

    await expect(page.locator('body')).toBeVisible()
    const title = await page.title()
    expect(title.trim().length).toBeGreaterThan(0)

    expect(errors, `page errors: ${errors.join('; ')}`).toEqual([])
  })

  test('contact form counts characters and shows success', async ({ page }) => {
    let requestBody = ''
    await page.route('https://api.web3forms.com/submit', async (route) => {
      requestBody = route.request().postData() ?? ''
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      })
    })

    await page.goto('/contact/')

    await expect(page.locator('input[name="botcheck"]')).toBeHidden()

    const message = 'This message is long enough to be valid.'
    await page.locator('#contact-message').pressSequentially(message)
    await expect(page.locator('.contact-field-note')).toHaveText(
      `${message.length} / 8000 · min 30 characters`,
    )

    await page.locator('#contact-name').fill('Test User')
    await page.locator('#contact-email').fill('test@example.com')
    await page.locator('#contact-subject').selectOption('general')
    await page.waitForTimeout(2800)
    await page.getByRole('button', { name: 'Send message' }).click()

    const result = page.locator('#contact-form-result')
    await expect(result).toHaveClass(/is-success/)
    await expect(result).toHaveText('Message sent. Expect a reply in a few business days.')
    await expect(page.locator('#contact-message')).toHaveValue('')
    await expect(page.locator('.contact-field-note')).toHaveText('0 / 8000 · min 30 characters')
    expect(requestBody).not.toContain('name="botcheck"')
  })
})
