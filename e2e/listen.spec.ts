import { test, expect, type Page } from '@playwright/test';

type OK = { useApp: { getState: () => { settingsLoaded: boolean; updateSettings: (p: object) => void } } };

/** Mocked Web MIDI: one keyboard with an input and an output that records what it is sent. */
const MOCK = () => {
  const input = { id: 'in1', name: 'CASIO USB-MIDI', manufacturer: 'Casio', state: 'connected', type: 'input', onmidimessage: null };
  const sent: number[][] = [];
  const output = { id: 'out1', name: 'CASIO USB-MIDI', manufacturer: 'Casio', state: 'connected', type: 'output', send: (b: number[]) => sent.push([...b]) };
  const access = { inputs: new Map([[input.id, input]]), outputs: new Map([[output.id, output]]), onstatechange: null, sysexEnabled: false };
  (navigator as unknown as { requestMIDIAccess: () => Promise<unknown> }).requestMIDIAccess = async () => access;
  (window as unknown as { __midiSent: number[][] }).__midiSent = sent;
};

async function openOde(page: Page, settings: object) {
  await page.goto('/');
  await page.waitForFunction(() => (globalThis as unknown as { __openkeys: OK }).__openkeys.useApp.getState().settingsLoaded);
  await page.evaluate((s) => (globalThis as unknown as { __openkeys: OK }).__openkeys.useApp.getState().updateSettings({ countInBars: 0, metronome: false, onboarded: true, ...s }), settings);
  await page.getByRole('button', { name: /Library/ }).first().click();
  await page.locator('.card', { hasText: 'Ode to Joy' }).getByRole('button', { name: 'Right hand' }).click();
  await expect(page.getByRole('button', { name: /Start/ })).toBeVisible();
}

test('listen: options appear only in listen mode and the keys play along', async ({ page }) => {
  await openOde(page, { inputSource: 'virtual' });
  const animate = page.getByRole('switch', { name: 'Animate keys' });
  const menu = page.getByRole('button', { name: 'Listen options' });
  await expect(menu).toHaveCount(0);
  await page.getByRole('button', { name: 'Listen', exact: true }).click();
  await menu.click();
  await expect(animate).toHaveAttribute('aria-checked', 'true');
  // No MIDI keyboard: no speaker option.
  await expect(page.getByRole('switch', { name: 'Keyboard speakers' })).toHaveCount(0);

  // Count every key going down and coming back up (the gaps between notes are too short to sample).
  await page.evaluate(() => {
    const moves = { down: 0, up: 0 };
    (window as unknown as { __keyMoves: typeof moves }).__keyMoves = moves;
    new MutationObserver((records) => {
      for (const r of records) {
        const el = r.target as HTMLElement;
        const lit = (c: string[]) => c.some((x) => x === 'down' || x === 'play-R' || x === 'play-L');
        const was = lit((r.oldValue ?? '').split(' '));
        const is = lit([...el.classList]);
        if (!was && is) moves.down++;
        if (was && !is) moves.up++;
      }
    }).observe(document.querySelector('.keyboard')!, { subtree: true, attributeFilter: ['class'], attributeOldValue: true });
  });
  await page.getByRole('button', { name: /Start/ }).click();
  const moves = () => page.evaluate(() => (window as unknown as { __keyMoves: { down: number; up: number } }).__keyMoves);
  await expect.poll(async () => (await moves()).up, { timeout: 10_000 }).toBeGreaterThanOrEqual(3);
  expect((await moves()).down).toBeGreaterThanOrEqual(3);

  // Hand colours (on by default): Ode to Joy's right hand lights blue, never the neutral pressed look.
  await expect(page.locator('.keyboard .key.play-R').first()).toBeVisible();
  expect(await page.locator('.keyboard .key.down, .keyboard .key.play-L').count()).toBe(0);

  // Clicking Start closed the menu; open it again while the piece plays.
  await expect(animate).toHaveCount(0);
  await menu.click();
  const colours = page.getByRole('switch', { name: 'Hand colours' });
  await colours.click();
  await expect(colours).toHaveAttribute('aria-checked', 'false');
  await expect(page.locator('.keyboard .key.down').first()).toBeVisible();
  await expect(page.locator('.keyboard .key.play-R')).toHaveCount(0);

  await animate.click();
  await expect(colours).toBeDisabled();
  await expect(animate).toHaveAttribute('aria-checked', 'false');
  const lit = page.locator('.keyboard .key.down, .keyboard .key.play-R, .keyboard .key.play-L');
  await expect(lit).toHaveCount(0);
  await page.waitForTimeout(1500);
  await expect(lit).toHaveCount(0);
  await page.getByRole('button', { name: /Stop/ }).click();
});

test('listen: plays through the MIDI keyboard speakers when one is connected', async ({ page }) => {
  await page.addInitScript(MOCK);
  await openOde(page, { inputSource: 'midi' });
  await page.getByRole('button', { name: 'Connect MIDI keyboard' }).click();
  await expect(page.locator('.meter')).toContainText('CASIO USB-MIDI');
  await page.getByRole('button', { name: 'Listen', exact: true }).click();
  await page.getByRole('button', { name: 'Listen options' }).click();
  const speakers = page.getByRole('switch', { name: 'Keyboard speakers' });
  await expect(speakers).toHaveAttribute('aria-checked', 'false');
  await speakers.click();
  await expect(speakers).toHaveAttribute('aria-checked', 'true');
  await page.keyboard.press('Escape');
  await expect(speakers).toHaveCount(0);
  await page.getByRole('button', { name: /Start/ }).click();
  // E4 (64) is the first note of Ode to Joy.
  await expect.poll(() => page.evaluate(() => (window as unknown as { __midiSent: number[][] }).__midiSent.some((b) => b[0] === 0x90 && b[1] === 64))).toBe(true);
  await expect(page.locator('.keyboard .key.play-R').first()).toBeVisible();
  await page.getByRole('button', { name: /Stop/ }).click();
});

test('the practice bar switches the input between computer keys, MIDI and microphone', async ({ page }) => {
  await openOde(page, { inputSource: 'virtual' });
  const input = page.getByRole('radiogroup', { name: 'Input' });
  const meter = page.locator('.meter .detail');
  await expect(input.getByRole('radio', { name: 'Computer keys' })).toHaveAttribute('aria-checked', 'true');
  await expect(meter).toHaveText('Computer keys / on-screen piano');

  await input.getByRole('radio', { name: 'MIDI keyboard' }).click();
  await expect(input.getByRole('radio', { name: 'MIDI keyboard' })).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByRole('button', { name: 'Connect MIDI keyboard' })).toBeVisible();
  await expect(meter).not.toHaveText('Computer keys / on-screen piano');

  await input.getByRole('radio', { name: 'Microphone' }).click();
  await expect(page.getByRole('button', { name: 'Turn on the microphone' })).toBeVisible();

  await input.getByRole('radio', { name: 'Computer keys' }).click();
  await expect(meter).toHaveText('Computer keys / on-screen piano');
  await expect(page.getByRole('button', { name: 'Turn on the microphone' })).toHaveCount(0);

  // Locked while a take runs.
  await page.getByRole('button', { name: 'Listen', exact: true }).click();
  await page.getByRole('button', { name: /Start/ }).click();
  await expect(input.getByRole('radio', { name: 'Microphone' })).toBeDisabled();
  await page.getByRole('button', { name: /Stop/ }).click();
  await expect(input.getByRole('radio', { name: 'Microphone' })).toBeEnabled();
});
