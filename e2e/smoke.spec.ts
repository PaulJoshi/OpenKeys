import { test, expect } from '@playwright/test';

test('computer keys play and light the on-screen keyboard', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  await page.goto('/');
  await page.getByRole('button', { name: /Free play/ }).click();
  await page.locator('body').click({ position: { x: 600, y: 20 } });
  await page.keyboard.down('KeyA');
  await expect(page.locator('[data-midi="60"]')).toHaveClass(/down/);
  await page.keyboard.up('KeyA');
  await expect(page.locator('[data-midi="60"]')).not.toHaveClass(/down/);
  await page.keyboard.press('KeyX'); // octave up
  await page.keyboard.down('KeyW'); // C#5
  await expect(page.locator('[data-midi="73"]')).toHaveClass(/down/);
  await page.keyboard.up('KeyW');
  await expect(page.getByTestId('recent-notes')).toContainText('C4');
  await expect(page.getByTestId('recent-notes')).toContainText('C♯5');
  // Clicking a key
  await page.locator('[data-midi="64"]').dispatchEvent('pointerdown', { pointerId: 1, clientX: 0, clientY: 0 });
  expect(errors.filter((e) => !/favicon|samples/.test(e))).toEqual([]);
});

test('reloads offline after the first load', async ({ page, context }) => {
  await page.goto('/');
  // Wait until the service worker has installed (precached the app shell) and activated.
  await page.evaluate(async () => {
    const reg = await navigator.serviceWorker.ready;
    const sw = reg.active!;
    if (sw.state !== 'activated') await new Promise<void>((r) => sw.addEventListener('statechange', () => sw.state === 'activated' && r()));
  });
  await page.reload();
  expect(await page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByText('OpenKeys').first()).toBeVisible();
  await page.getByRole('button', { name: /Free play/ }).click();
  await expect(page.locator('[data-midi="60"]')).toBeVisible();
  await context.setOffline(false);
});

test('loads the Salamander piano samples', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Free play/ }).click();
  await page.keyboard.press('KeyA');
  await page.waitForFunction(() => {
    const ok = (globalThis as unknown as { __openkeys: { useApp: { getState: () => { pianoProgress: number } } } }).__openkeys;
    return ok.useApp.getState().pianoProgress >= 1;
  }, null, { timeout: 45_000 });
  const ready = await page.evaluate(() => {
    const ok = (globalThis as unknown as { __openkeys: { runtime: { engine: { piano: { ready: boolean } } } } }).__openkeys;
    return ok.runtime.engine.piano.ready;
  });
  expect(ready).toBe(true);
});
