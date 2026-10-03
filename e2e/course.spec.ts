import { test, expect, type Page } from '@playwright/test';

type OK = {
  runtime: { bus: { push: (e: object) => void }; engine: { now: () => number; player: { timeline: { timeAt: (b: number) => number } } } };
  useApp: { getState: () => { settingsLoaded: boolean; updateSettings: (p: object) => void; score: { notes: { midi: number; startBeat: number; hand: string }[] } } };
};

/** Plays every note of the current score perfectly by injecting events (wait or play-along). */
async function playPerfectly(page: Page, mode: 'wait' | 'playalong') {
  await page.evaluate(async (m) => {
    const ok = (globalThis as unknown as { __openkeys: OK }).__openkeys;
    const notes = [...ok.useApp.getState().score.notes].filter((n) => n.hand !== 'L').sort((a, b) => a.startBeat - b.startBeat);
    const eng = ok.runtime.engine;
    await new Promise((r) => setTimeout(r, 300));
    for (const n of notes) {
      let t = eng.now();
      if (m === 'playalong') {
        t = eng.player.timeline.timeAt(n.startBeat);
        const wait = (t - eng.now()) * 1000;
        if (wait > 0) await new Promise((r) => setTimeout(r, wait));
      } else await new Promise((r) => setTimeout(r, 30));
      ok.runtime.bus.push({ kind: 'noteOn', midi: n.midi, time: t, velocity: 0.6, confidence: 1, source: 'virtual' });
      ok.runtime.bus.push({ kind: 'noteOff', midi: n.midi, time: t + 0.2, velocity: 0, confidence: 1, source: 'virtual' });
    }
  }, mode);
}

/** The practice screen hides the nav; bring it down from the top edge like a mouse user would. */
async function nav(page: Page, name: RegExp) {
  await page.mouse.move(400, 1);
  await page.getByRole('button', { name }).first().click();
}

test('a new user completes lessons 1 to 3 with tracked progress', async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto('/');
  await page.waitForFunction(() => (globalThis as unknown as { __openkeys: OK }).__openkeys.useApp.getState().settingsLoaded);
  await page.evaluate(() => (globalThis as unknown as { __openkeys: OK }).__openkeys.useApp.getState().updateSettings({ inputSource: 'virtual', countInBars: 0, onboarded: true }));
  for (const [n, mode] of [
    [1, 'wait'],
    [2, 'wait'],
    [3, 'playalong'],
  ] as const) {
    await nav(page, /Course/);
    const node = page.locator('.lesson-node', { hasText: `${n}.` }).first();
    await expect(node).toContainText('Next');
    await node.getByRole('button').click();
    await page.getByRole('button', { name: 'Play the piece' }).click();
    await page.getByRole('button', { name: /Start/ }).click();
    await playPerfectly(page, mode);
    if (mode === 'playalong') await page.waitForTimeout(500);
    const results = page.getByRole('dialog', { name: 'Take results' });
    await expect(results).toBeVisible({ timeout: 20_000 });
    await expect(results).toContainText('Excellent');
  }
  await nav(page, /Course/);
  await expect(page.locator('.lesson-node', { hasText: '4.' }).first()).toContainText('Next');
  await expect(page.locator('.lesson-node.done')).toHaveCount(3);
  await nav(page, /Progress/);
  await expect(page.getByText('takes logged')).toBeVisible();
  await expect(page.locator('.big-number').nth(3)).toHaveText('3');
});
