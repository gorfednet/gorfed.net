import { test, expect } from '@playwright/test'

async function configureContactForm(page: import('@playwright/test').Page) {
  await page.route('**/contact/', async (route) => {
    const response = await route.fetch()
    const body = (await response.text()).replace(
      /data-web3forms-key="[^"]*"/,
      'data-web3forms-key="test-access-key"',
    )
    await route.fulfill({ response, body })
  })
}

async function fillContactForm(page: import('@playwright/test').Page) {
  await page.locator('#contact-name').fill('Test User')
  await page.locator('#contact-email').fill('test@example.com')
  await page.locator('#contact-subject').selectOption('general')
  await page
    .locator('#contact-message')
    .fill('This message is long enough to be valid.')
}

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
    await configureContactForm(page)

    let requestBody = ''
    let contentType = ''
    await page.route('https://api.web3forms.com/submit', async (route) => {
      requestBody = route.request().postData() ?? ''
      contentType = route.request().headers()['content-type'] ?? ''
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      })
    })

    await page.goto('/contact/')

    const botcheck = page.locator('input[name="botcheck"]')
    await expect(botcheck).toHaveCount(1)
    await expect(botcheck).toBeHidden()
    await expect(botcheck).not.toBeChecked()
    await expect(page.locator('input[name="company_website"]')).toHaveCount(0)

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
    expect(contentType).toContain('application/json')
    const payload = JSON.parse(requestBody)
    expect(payload).toMatchObject({
      access_key: 'test-access-key',
      name: 'Test User',
      email: 'test@example.com',
      botcheck: false,
    })
    expect(payload.subject).toContain('[gorfed.net] General inquiry / Test User')
    expect(payload.message).toContain('Topic: General inquiry (general)')
  })

  test('contact form prevents duplicate in-flight submissions', async ({ page }) => {
    await configureContactForm(page)
    let requestCount = 0
    await page.route('https://api.web3forms.com/submit', async (route) => {
      requestCount += 1
      await new Promise((resolve) => setTimeout(resolve, 250))
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      })
    })

    await page.goto('/contact/')
    await fillContactForm(page)
    await page.waitForTimeout(2800)
    await page.locator('#contact-form').evaluate((form: HTMLFormElement) => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    })

    await expect(page.locator('#contact-form-result')).toHaveClass(/is-success/)
    expect(requestCount).toBe(1)
  })

  test('contact form masks anti-spam errors and preserves values', async ({ page }) => {
    await configureContactForm(page)
    await page.route('https://api.web3forms.com/submit', async (route) => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          message: 'Honeypot Error. Botcheck field should be hidden and should not check.',
        }),
      })
    })

    await page.goto('/contact/')
    await fillContactForm(page)
    await page.waitForTimeout(2800)
    await page.getByRole('button', { name: 'Send message' }).click()

    const result = page.locator('#contact-form-result')
    await expect(result).toHaveAttribute('role', 'alert')
    await expect(result).toHaveText(
      'Could not verify your submission. Refresh the page and try again.',
    )
    await expect(page.locator('#contact-name')).toHaveValue('Test User')
    await expect(page.locator('#contact-email')).toHaveValue('test@example.com')
    await expect(page.locator('#contact-subject')).toHaveValue('general')
    await expect(page.locator('#contact-message')).toHaveValue(
      'This message is long enough to be valid.',
    )
  })

  test('contact honeypot reads submitted DOM state without a change event', async ({
    page,
  }) => {
    await configureContactForm(page)
    let requestCount = 0
    await page.route('https://api.web3forms.com/submit', async (route) => {
      requestCount += 1
      await route.abort()
    })

    await page.goto('/contact/')
    await page.waitForTimeout(2800)
    await page.locator('#contact-form').evaluate((form: HTMLFormElement) => {
      const botcheck = form.elements.namedItem('botcheck') as HTMLInputElement
      botcheck.checked = true
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    })

    await expect(page.locator('#contact-form-result')).toHaveClass(/is-success/)
    await expect(page.locator('#contact-form-result')).toHaveText('Message sent.')
    expect(requestCount).toBe(0)
  })
})
