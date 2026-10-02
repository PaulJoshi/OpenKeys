// Renders public/icon.svg to the PNG icons used by the PWA manifest (needs Playwright's Chromium).
import { chromium } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';

const svg = readFileSync('public/icon.svg', 'utf8');
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const page = await browser.newPage();
for (const size of [192, 512]) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<html><body style="margin:0;background:transparent">${svg.replace('<svg ', `<svg width="${size}" height="${size}" `)}</body></html>`);
  writeFileSync(`public/icon-${size}.png`, await page.screenshot({ omitBackground: true }));
}
await browser.close();
console.log('icons rendered');
