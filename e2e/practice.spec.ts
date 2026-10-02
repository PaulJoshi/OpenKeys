import { test, expect, type Page } from '@playwright/test';

type OK = {
  runtime: { bus: { push: (e: object) => void }; engine: { now: () => number; player: { timeline: { timeAt: (b: number) => number } } } };
  useApp: { getState: () => { settingsLoaded: boolean; updateSettings: (p: object) => void; score: { notes: { midi: number; startBeat: number; hand: string }[] } } };
};

async function openOdeRH(page: Page) {
  await page.goto('/');
  await page.waitForFunction(() => (globalThis as unknown as { __openkeys: OK }).__openkeys.useApp.getState().settingsLoaded);
  await page.evaluate(() => (globalThis as unknown as { __openkeys: OK }).__openkeys.useApp.getState().updateSettings({ inputSource: 'virtual', countInBars: 0, metronome: false }));
  await page.getByRole('button', { name: /Library/ }).first().click();
  const card = page.locator('.card', { hasText: 'Ode to Joy' });
  await card.getByRole('button', { name: 'Right hand' }).click();
  await expect(page.getByRole('button', { name: /Start/ })).toBeVisible();
}

test('wait mode: right notes advance, a wrong note is graded and coached', async ({ page }) => {
  await openOdeRH(page);
  await page.getByRole('button', { name: 'Wait', exact: true }).click();
  await page.getByRole('button', { name: /Start/ }).click();
  // Ode to Joy RH: E E F G | G F E D | C C D E | E D D  (computer keys: D=E4, F=F4, G=G4, S=D4, A=C4)
  const seq = ['KeyD', 'KeyD', 'KeyF', 'KeyG', 'KeyG', 'KeyF', 'KeyD', 'KeyS', 'KeyA', 'KeyA', 'KeyS', 'KeyD', 'KeyD', 'KeyS', 'KeyS'];
  for (const [i, k] of seq.entries()) {
    if (i === 2) {
      // deliberate mistake: G instead of F
      await page.keyboard.down('KeyG');
      await page.keyboard.up('KeyG');
      await expect(page.locator('.feedback-line')).toContainText('try F4');
    }
    await page.keyboard.down(k);
    await page.waitForTimeout(40);
    await page.keyboard.up(k);
    await page.waitForTimeout(40);
  }
  await page.getByRole('button', { name: /Stop/ }).click();
  const results = page.getByRole('dialog', { name: 'Take results' });
  await expect(results).toBeVisible();
  // 15 notes reached, 1 wrong first try -> 93%
  await expect(results).toContainText('93%');
  await expect(results).toContainText('Wrong note 1');
});

test('play-along: timing, a wrong note and a missed note are graded', async ({ page }) => {
  await openOdeRH(page);
  await page.getByRole('button', { name: 'Play along', exact: true }).click();
  await page.getByRole('button', { name: /Start/ }).click();
  // Inject key presses at the exact scheduled times (on the audio clock), with mistakes.
  await page.evaluate(async () => {
    const ok = (globalThis as unknown as { __openkeys: OK }).__openkeys;
    const notes = ok.useApp.getState().score.notes.slice(0, 16);
    const eng = ok.runtime.engine;
    await new Promise((r) => setTimeout(r, 300));
    for (const [i, n] of notes.entries()) {
      if (i === 5) continue; // missed
      const t = eng.player.timeline.timeAt(n.startBeat);
      const midi = i === 9 ? n.midi + 2 : n.midi; // wrong pitch
      const wait = (t - eng.now()) * 1000;
      if (wait > 0) await new Promise((r) => setTimeout(r, wait));
      ok.runtime.bus.push({ kind: 'noteOn', midi, time: t + (i === 3 ? 0.07 : 0), velocity: 0.6, confidence: 1, source: 'virtual' });
      ok.runtime.bus.push({ kind: 'noteOff', midi, time: t + 0.3, velocity: 0, confidence: 1, source: 'virtual' });
    }
  });
  await page.getByRole('button', { name: /Stop/ }).click();
  const results = page.getByRole('dialog', { name: 'Take results' });
  await expect(results).toBeVisible();
  await expect(results).toContainText('Missed 1');
  await expect(results).toContainText('Wrong note 1');
  await expect(results).toContainText('Trouble spots');
});
