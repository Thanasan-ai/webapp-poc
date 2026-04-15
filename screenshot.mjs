import puppeteer from 'puppeteer';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { fileURLToPath, URL } from 'url';

const dir = fileURLToPath(new URL('.', import.meta.url));
const screenshotDir = join(dir, 'temporary screenshots');

async function getNextIndex(label) {
  let i = 1;
  while (true) {
    const name = label ? `screenshot-${i}-${label}.png` : `screenshot-${i}.png`;
    if (!existsSync(join(screenshotDir, name))) return { index: i, name };
    i++;
  }
}

const [,, url = 'http://localhost:3000', label] = process.argv;

if (!existsSync(screenshotDir)) {
  await mkdir(screenshotDir, { recursive: true });
}

const browser = await puppeteer.launch({
  headless: 'new',
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});

const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

// Wait for fonts and animations to settle
await new Promise(r => setTimeout(r, 1500));

// Trigger all scroll reveal elements so full page screenshot shows content
await page.evaluate(() => {
  document.querySelectorAll('.reveal').forEach(el => el.classList.add('visible'));
  document.querySelectorAll('.divider-line').forEach(el => el.classList.add('visible'));
  // Pre-fill stat counters for screenshot
  document.querySelectorAll('[data-target]').forEach(el => {
    const target = el.dataset.target;
    const suffix = el.dataset.suffix || '';
    const isFloat = el.dataset.float === 'true';
    el.textContent = (isFloat ? parseFloat(target).toFixed(1) : target) + suffix;
  });
});
await new Promise(r => setTimeout(r, 400));

const { name } = await getNextIndex(label);
const path = join(screenshotDir, name);
await page.screenshot({ path, fullPage: true });
console.log(`Screenshot saved: temporary screenshots/${name}`);

await browser.close();
