/* Run against the served repository; Playwright is a development-only dependency. */
const assert = require('node:assert/strict');
const {chromium} = require(process.env.VISTA_PLAYWRIGHT_MODULE || 'playwright');

(async () => {
  const browser = await chromium.launch({headless: true,
    ...(process.env.VISTA_CHROME_PATH ? {executablePath: process.env.VISTA_CHROME_PATH} : {})});
  const errors = [];
  try {
    const page = await browser.newPage({viewport: {width: 1280, height: 960}, reducedMotion: 'no-preference'});
    page.on('pageerror', error => errors.push(error.message));
    await page.goto((process.env.VISTA_TEST_URL || 'http://127.0.0.1:8137/vista/') + '?debug-motion');
    await page.waitForFunction(() => window.vistaDebug?.snapshot().graphicsReady);
    const snapshot = () => page.evaluate(() => window.vistaDebug.snapshot());
    const advances = async label => {
      const before = await snapshot();
      await page.waitForTimeout(800);
      const after = await snapshot();
      assert.equal(after.state, 'running', label + ': playback state');
      assert.ok(after.elapsed > before.elapsed + .2, label + ': ambient time advances');
      assert.ok(after.phase > before.phase, label + ': automatic sky time advances');
      assert.ok(after.paints > before.paints + 3, label + ': renderer continues');
      console.log('PASS ' + label);
    };
    await advances('initial playback');

    // A paused visitor must not be resumed by resizing or panel activity.
    await page.locator('.va-time-pause').click();
    const paused = await snapshot();
    await page.setViewportSize({width: 390, height: 844});
    await page.waitForTimeout(600);
    assert.equal((await snapshot()).elapsed, paused.elapsed);
    assert.equal((await snapshot()).paused, true);
    console.log('PASS intentional pause survives resize');
    await page.locator('.va-time-pause').click();
    await advances('resume at phone width');

    await page.locator('.va-sky-link[data-view="events"]').click();
    await page.waitForTimeout(700);
    await advances('Events open');
    await page.locator('.va-close').click();
    await page.waitForTimeout(700);
    await advances('Events close');

    const control = page.locator('.va-time-input');
    const bounds = await control.boundingBox();
    await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
    await page.mouse.down();
    await page.mouse.move(bounds.x + bounds.width * .65, bounds.y + bounds.height / 2, {steps: 5});
    await page.evaluate(() => window.dispatchEvent(new Event('blur')));
    await page.mouse.up();
    await page.waitForTimeout(600);
    assert.equal((await snapshot()).dragHeld, false);
    await advances('interrupted time drag');

    // Synthetic lifecycle events test our handlers; actual browser history is a separate release check.
    await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide', {persisted: true})));
    const suspended = await snapshot();
    await page.waitForTimeout(500);
    assert.equal((await snapshot()).elapsed, suspended.elapsed);
    await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pageshow', {persisted: true})));
    await advances('preserved-page restoration handler');

    const canLoseContext = await page.evaluate(() => {
      const gl = document.querySelector('.va-world-light').getContext('webgl');
      window.testContextLoss = gl.getExtension('WEBGL_lose_context');
      window.testContextLoss?.loseContext();
      return !!window.testContextLoss;
    });
    if (canLoseContext) {
      await page.waitForFunction(() => !window.vistaDebug.snapshot().graphicsReady);
      await page.waitForTimeout(400);
      await page.evaluate(() => window.testContextLoss.restoreContext());
      await page.waitForFunction(() => window.vistaDebug.snapshot().graphicsReady);
      await advances('graphics context restoration');
    } else console.log('SKIP graphics context loss extension unavailable');

    await page.emulateMedia({reducedMotion: 'reduce'});
    await page.waitForTimeout(300);
    assert.equal((await snapshot()).paused, true);
    await page.emulateMedia({reducedMotion: 'no-preference'});
    await advances('reduced-motion preference restoration');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    assert.deepEqual(errors, []);
    console.log('PASS no page errors or horizontal overflow at 390px');
  } finally {
    await browser.close();
  }
})().catch(error => {console.error(error); process.exitCode = 1;});
