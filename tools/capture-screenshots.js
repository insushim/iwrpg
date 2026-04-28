#!/usr/bin/env node
// Capture key game screens with Puppeteer for Visual QA.
// Output: /tmp/rwc-qa/<scene>.png

import puppeteer from 'puppeteer';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const OUT_DIR = resolve('/tmp/rwc-qa');
mkdirSync(OUT_DIR, { recursive: true });

const URL = process.env.QA_URL ?? 'http://localhost:5173';

(async () => {
  console.log('▶ Launching Puppeteer…');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1280, height: 720 },
  });
  const page = await browser.newPage();

  page.on('console', (m) => console.log('[browser]', m.text()));
  page.on('pageerror', (e) => console.error('[pageerror]', e.message));

  try {
    // 1. Login screen
    console.log('▶ Capturing login screen');
    await page.goto(URL, { waitUntil: 'networkidle0', timeout: 20000 });
    await new Promise(r => setTimeout(r, 2000));
    await page.screenshot({ path: `${OUT_DIR}/01_login.png` });

    // 2. Fill login form
    console.log('▶ Logging in');
    await page.type('#nickname', 'QA봇', { delay: 50 });
    await page.click('#enter-btn');
    await new Promise(r => setTimeout(r, 1500));
    await page.screenshot({ path: `${OUT_DIR}/02_charcreate.png` });

    // 3. Select class
    console.log('▶ Selecting class');
    await page.click('[data-class-id="iron-sentinel"]');
    await new Promise(r => setTimeout(r, 300));
    await page.screenshot({ path: `${OUT_DIR}/03_class_selected.png` });

    // 4. Enter world
    console.log('▶ Entering world');
    await page.click('#confirm-char');
    await page.waitForFunction(() => (window).gameReady === true, { timeout: 15000 });
    await new Promise(r => setTimeout(r, 1500));
    await page.screenshot({ path: `${OUT_DIR}/04_world_aurora_town.png` });

    // 5. Open inventory
    console.log('▶ Opening inventory');
    await page.keyboard.press('KeyI');
    await new Promise(r => setTimeout(r, 600));
    await page.screenshot({ path: `${OUT_DIR}/05_inventory.png` });
    await page.keyboard.press('Escape');
    await new Promise(r => setTimeout(r, 300));

    // 6. Open gacha modal
    console.log('▶ Opening gacha');
    await page.keyboard.press('KeyG');
    await new Promise(r => setTimeout(r, 600));
    await page.screenshot({ path: `${OUT_DIR}/06_gacha.png` });
    await page.keyboard.press('Escape');
    await new Promise(r => setTimeout(r, 300));

    // 7. Move a few steps and final
    console.log('▶ Final overview');
    for (let i = 0; i < 3; i++) {
      await page.keyboard.press('KeyD');
      await new Promise(r => setTimeout(r, 220));
    }
    await page.screenshot({ path: `${OUT_DIR}/07_movement.png` });

    console.log(`✅ Captured 7 screenshots → ${OUT_DIR}`);
  } catch (e) {
    console.error('❌ QA failed:', e.message);
    await page.screenshot({ path: `${OUT_DIR}/error.png` }).catch(() => {});
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
