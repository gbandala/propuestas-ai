/**
 * E2E Test — PropuestasAI full flow
 *
 * Prerrequisitos:
 *   1. npm run dev corriendo
 *   2. SUPABASE_SERVICE_ROLE_KEY en .env.local
 *   3. npx playwright install chromium
 *
 * Correr: npx playwright test
 */
import { test, expect } from '@playwright/test'

const BASE = 'http://localhost:3000'
const TEST_EMAIL = 'test@propuestasai.dev'
const TEST_PASSWORD = 'Test1234!'

test.describe('PropuestasAI E2E', () => {
  test.beforeAll(async ({ request }) => {
    // Crear usuario de prueba
    const res = await request.post(`${BASE}/api/dev/seed`)
    const body = await res.json()
    if (!body.ok && !body.userId) {
      throw new Error(`Seed failed: ${JSON.stringify(body)}`)
    }
    console.log('✓ Test user ready:', TEST_EMAIL)
  })

  test('1. Login con email/password', async ({ page }) => {
    await page.goto(`${BASE}/login`)
    await page.fill('input[name="email"]', TEST_EMAIL)
    await page.fill('input[name="password"]', TEST_PASSWORD)
    await page.click('button[type="submit"]')
    await page.waitForURL(`${BASE}/dashboard`)
    await expect(page.locator('h1')).toContainText('Proyectos')
    console.log('✓ Login exitoso')
  })

  test('2. Crear proyecto', async ({ page }) => {
    await page.goto(`${BASE}/login`)
    await page.fill('input[name="email"]', TEST_EMAIL)
    await page.fill('input[name="password"]', TEST_PASSWORD)
    await page.click('button[type="submit"]')
    await page.waitForURL(`${BASE}/dashboard`)

    await page.click('text=+ Nuevo proyecto')
    await page.fill('input[name="name"]', 'Proyecto E2E Test')
    await page.fill('input[name="client_name"]', 'Cliente Test')
    await page.fill('textarea[name="description"]', 'Descripción de prueba automatizada')
    await page.click('text=Crear proyecto')

    await expect(page.locator('text=Proyecto E2E Test')).toBeVisible({ timeout: 10000 })
    console.log('✓ Proyecto creado')
  })

  test('3. Navegar al brief técnico', async ({ page }) => {
    await page.goto(`${BASE}/login`)
    await page.fill('input[name="email"]', TEST_EMAIL)
    await page.fill('input[name="password"]', TEST_PASSWORD)
    await page.click('button[type="submit"]')
    await page.waitForURL(`${BASE}/dashboard`)

    await page.click('text=Proyecto E2E Test')
    await page.click('text=Brief Técnico')

    await expect(page.locator('h1')).toContainText('Brief Técnico')
    console.log('✓ Brief técnico accesible')
  })
})
