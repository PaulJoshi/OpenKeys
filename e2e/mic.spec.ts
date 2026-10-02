import { test, expect, chromium } from '@playwright/test';
import { join } from 'node:path';
import { existsSync } from 'node:fs';

const wav = join(process.cwd(), 'tests', 'fixtures', 'generated', 'mic-melody.wav');

test('mic mode detects notes from fake audio capture', async () => {
  test.skip(!existsSync(wav), 'run `npx vitest run tests/accuracy/fixtures.test.ts` first');
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || undefined,
    args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', `--use-file-for-fake-audio-capture=${wav}`, '--autoplay-policy=no-user-gesture-required'],
  });
  const page = await browser.newPage();
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('http://localhost:4173/');
  await page.waitForFunction(() => (globalThis as unknown as { __openkeys: { useApp: { getState: () => { settingsLoaded: boolean } } } }).__openkeys.useApp.getState().settingsLoaded);
  await page.evaluate(() => {
    const ok = (globalThis as unknown as { __openkeys: { useApp: { getState: () => { updateSettings: (p: object) => void } } } }).__openkeys;
    ok.useApp.getState().updateSettings({ inputSource: 'mic' });
  });
  await page.getByRole('button', { name: /Free play/ }).click();
  await page.getByRole('button', { name: 'Turn on the microphone' }).click();
  const recent = page.getByTestId('recent-notes');
  await expect(recent).toContainText('C4', { timeout: 15000 });
  await expect(recent).toContainText('G4', { timeout: 15000 });
  // After a full loop of the file, the four fast repeated E4s are separate notes.
  await page.waitForTimeout(5000);
  const text = await recent.textContent();
  const notes = (text ?? '').split(/\s+/).filter(Boolean);
  expect(notes).toEqual(expect.arrayContaining(['C4', 'D4', 'E4', 'F4', 'G4']));
  let maxRun = 0;
  let run = 0;
  for (const n of notes) {
    run = n === 'E4' ? run + 1 : 0;
    maxRun = Math.max(maxRun, run);
  }
  expect(maxRun).toBeGreaterThanOrEqual(4);
  expect(errors).toEqual([]);
  await browser.close();
});
