const assert = require('node:assert/strict');
const {chromium} = require(process.env.VISTA_PLAYWRIGHT_MODULE || 'playwright');

(async () => {
  const browser = await chromium.launch({headless: true,
    ...(process.env.VISTA_CHROME_PATH ? {executablePath: process.env.VISTA_CHROME_PATH} : {})});
  try {
    const page = await browser.newPage({viewport: {width: 1280, height: 900}, reducedMotion: 'no-preference'});
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto((process.env.VISTA_TEST_URL || 'http://127.0.0.1:8137/vista/') + '?debug-motion');
    await page.waitForFunction(() => window.vistaDebug?.snapshot().graphicsReady);
    await page.locator('.va-time-pause').click();
    const time = value => page.locator('.va-time-input').evaluate((el, value) => {
      el.value = value; el.dispatchEvent(new Event('input', {bubbles: true}));
    }, String(value));
    const read = () => page.evaluate(() => {
      const css = el => getComputedStyle(el);
      return {
        links: [...document.querySelectorAll('.va-sky-link')].map(el => css(el).color),
        lines: [...document.querySelectorAll('.va-constellation i')].map(el => +css(el).opacity),
        email: css(document.querySelector('.va-email')).color,
        credit: css(document.querySelector('.pd-copy')).color,
        band: css(document.querySelector('.pd-band')).color,
      };
    });
    const coordinated = sample => {
      assert.equal(new Set(sample.links).size, 1, 'all sky words change together');
      assert.equal(sample.email, sample.credit, 'email and credit share their fade');
      assert.equal(sample.band, sample.credit, 'band link does not add a delayed fade');
    };
    await time(.06); await page.waitForTimeout(1800);
    const night = await read(); coordinated(night);
    assert.ok(night.lines.every(opacity => opacity === 1), 'night leaders visible');
    await time(.5);
    const immediate = await read();
    assert.equal(immediate.email, night.email, 'contact color does not jump');
    await page.waitForTimeout(420);
    const midway = await read(); coordinated(midway);
    await page.waitForTimeout(1450);
    const day = await read(); coordinated(day);
    assert.notEqual(midway.links[0], night.links[0], 'transition has begun');
    assert.notEqual(midway.links[0], day.links[0], 'transition takes time to settle');
    assert.notEqual(midway.email, day.email, 'contact text is also eased');
    assert.ok(day.lines.every(opacity => opacity === 0), 'day cloud leaders absent');
    await time(.06); await page.waitForTimeout(420);
    const dusk = await read(); coordinated(dusk);
    assert.notEqual(dusk.links[0], day.links[0]);
    assert.notEqual(dusk.links[0], night.links[0]);
    await page.waitForTimeout(1450);
    assert.deepEqual((await read()).links, night.links, 'night colors return without drift');
    // The reading palette must ease as one inherited value, including content
    // revealed midway through a color change rather than only visible labels.
    await page.locator('.va-events').click(); await page.waitForTimeout(700);
    const reading = () => page.evaluate(() => {
      const css = selector => getComputedStyle(document.querySelector(selector));
      return {surface: css('.va-reading').backgroundColor, ink: css('.va-heading h2').color,
        soft: css('.va-venue').color, photo: css('.va-photo span').color,
        kind: css('.va-kind').color};
    });
    const panelNight = await reading();
    await time(.5);
    assert.deepEqual(await reading(), panelNight, 'reading surface and text do not jump');
    await page.waitForTimeout(420);
    const panelMid = await reading();
    await page.locator('.va-panel-tabs [data-view="photography"]').click();
    await page.waitForTimeout(160);
    const switched = await reading();
    assert.equal(switched.photo, switched.soft, 'new section inherits the current fade without restarting');
    await page.waitForTimeout(1350);
    const panelDay = await reading();
    for (const key of ['surface', 'ink', 'soft', 'kind']) {
      assert.notEqual(panelMid[key], panelNight[key], key + ' has started easing');
      assert.notEqual(panelMid[key], panelDay[key], key + ' does not pop to its endpoint');
    }
    await time(.06); await page.waitForTimeout(1900);
    assert.deepEqual(await reading(), panelNight, 'reading palette returns without drift');
    await page.locator('.va-close').click(); await page.waitForTimeout(650);
    await page.setViewportSize({width: 390, height: 844});
    await time(.5); await page.waitForTimeout(1800);
    coordinated(await read());
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    assert.deepEqual(errors, []);
    console.log('PASS eased day/dusk colors, coordinated reading palettes, section changes during fades, night-only leaders, and mobile layout');
  } finally { await browser.close(); }
})().catch(error => {console.error(error); process.exitCode = 1;});
