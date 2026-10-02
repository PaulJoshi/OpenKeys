import { test, expect } from '@playwright/test';

/** A mocked Web MIDI layer: one "CASIO USB-MIDI" input whose messages the test injects. */
const MOCK = () => {
  type Listener = ((e: unknown) => void) | null;
  const input = {
    id: 'in1',
    name: 'CASIO USB-MIDI',
    manufacturer: 'Casio',
    state: 'connected',
    type: 'input',
    onmidimessage: null as Listener,
  };
  const access = {
    inputs: new Map([[input.id, input]]),
    outputs: new Map(),
    onstatechange: null as Listener,
    sysexEnabled: false,
  };
  (navigator as unknown as { requestMIDIAccess: () => Promise<unknown> }).requestMIDIAccess = async () => access;
  (window as unknown as { __midiSend: (b: number[]) => void }).__midiSend = (bytes: number[]) => {
    input.onmidimessage?.({ data: new Uint8Array(bytes), timeStamp: performance.now() });
  };
  (window as unknown as { __midiUnplug: () => void }).__midiUnplug = () => {
    input.state = 'disconnected';
    access.inputs.delete(input.id);
    access.onstatechange?.({ port: input });
  };
};

test('MIDI keyboard: connects, judges exactly, handles unplugging', async ({ page }) => {
  await page.addInitScript(MOCK);
  await page.goto('/');
  await page.waitForFunction(() => (globalThis as unknown as { __openkeys: { useApp: { getState: () => { settingsLoaded: boolean } } } }).__openkeys.useApp.getState().settingsLoaded);
  await page.evaluate(() =>
    (globalThis as unknown as { __openkeys: { useApp: { getState: () => { updateSettings: (p: object) => void } } } }).__openkeys.useApp.getState().updateSettings({ inputSource: 'midi', onboarded: true }),
  );
  await page.getByRole('button', { name: /Library/ }).first().click();
  await page.locator('.card', { hasText: 'Ode to Joy' }).getByRole('button', { name: 'Right hand' }).click();
  await page.getByRole('button', { name: 'Connect MIDI keyboard' }).click();
  await expect(page.locator('.meter')).toContainText('CASIO USB-MIDI');
  await page.getByRole('button', { name: 'Wait', exact: true }).click();
  await page.getByRole('button', { name: /Start/ }).click();
  // E E F G G F E D C C D E E D D, with one wrong note (D# before the first F) and real velocities.
  const seq = [64, 64, 65, 67, 67, 65, 64, 62, 60, 60, 62, 64, 64, 62, 62];
  for (const [i, m] of seq.entries()) {
    if (i === 2) await page.evaluate(() => (window as unknown as { __midiSend: (b: number[]) => void }).__midiSend([0x90, 63, 50]));
    await page.evaluate((note) => (window as unknown as { __midiSend: (b: number[]) => void }).__midiSend([0x90, note, 80]), m);
    await page.waitForTimeout(30);
    await page.evaluate((note) => (window as unknown as { __midiSend: (b: number[]) => void }).__midiSend([0x90, note, 0]), m); // note-on velocity 0 = note-off
    await page.waitForTimeout(30);
  }
  // Clock/active sensing must be ignored.
  await page.evaluate(() => (window as unknown as { __midiSend: (b: number[]) => void }).__midiSend([0xfe]));
  await page.getByRole('button', { name: /Stop/ }).click();
  const results = page.getByRole('dialog', { name: 'Take results' });
  await expect(results).toContainText('93%');
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await page.evaluate(() => (window as unknown as { __midiUnplug: () => void }).__midiUnplug());
  await expect(page.getByText(/CASIO USB-MIDI disconnected/)).toBeVisible();
});
