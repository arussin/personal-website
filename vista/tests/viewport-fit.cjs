const assert = require('node:assert/strict');
const {chromium} = require(process.env.VISTA_PLAYWRIGHT_MODULE || 'playwright');

(async () => {
  const browser = await chromium.launch({headless: true,
    ...(process.env.VISTA_CHROME_PATH ? {executablePath: process.env.VISTA_CHROME_PATH} : {})});
  try {
    const base = process.env.VISTA_SITE_URL || 'http://127.0.0.1:8137';
    const page = await browser.newPage({viewport: {width: 1440, height: 900}, reducedMotion: 'no-preference'});
    await page.route('**/*googletagmanager.com/**', route => route.abort());
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(base + '/?debug-motion', {waitUntil: 'domcontentloaded'});
    await page.waitForFunction(() => window.vistaDebug?.snapshot().graphicsReady);
    await page.evaluate(() => document.fonts.ready);
    const fit = async label => {
      const sizes = await page.evaluate(() => {
        const rect = selector => document.querySelector(selector).getBoundingClientRect().toJSON();
        return {width: innerWidth, height: innerHeight, documentWidth: document.documentElement.scrollWidth,
          documentHeight: document.documentElement.scrollHeight, scrollY,
          layers: ['#adam-vista', '.va-stage', '.va-home', '.va-world', '.va-sky-art', '.va-moon-layer'].map(rect),
          controls: ['.va-time-dock', '.va-name', '.va-credit', '.va-layout-tools'].map(rect),
          credit: rect('.va-credit'), tools: rect('.va-layout-tools'),
          stars: [...document.querySelectorAll('.va-constellation b')].map(el => el.getBoundingClientRect().toJSON())};
      });
      assert.equal(sizes.documentWidth, sizes.width, label + ': no horizontal overflow');
      assert.equal(sizes.documentHeight, sizes.height, label + ': no scrollbar or unused bottom area');
      assert.equal(sizes.scrollY, 0, label + ': home begins at the top');
      for (const layer of sizes.layers) {
        assert.ok(Math.abs(layer.height - sizes.height) < 1, label + ': every scene layer fills the viewport');
      }
      for (const control of sizes.controls) {
        assert.ok(control.top >= 0 && control.bottom <= sizes.height + 1, label + ': content stays visible');
      }
      assert.ok(sizes.credit.bottom <= sizes.tools.top, label + ': contact and arrangement controls do not overlap');
      assert.equal(sizes.layers[1].width, sizes.width, label + ': panorama fills the available width');
      for (const star of sizes.stars) {
        assert.ok(star.top >= 0 && star.bottom < sizes.height * .65, label + ': annotated stars stay in the sky');
      }
      console.log('PASS ' + label);
    };
    for (const [width, height] of [[1440,900], [1920,1080], [1366,768], [1280,600], [2560,1080], [2560,720],
                                   [390,844], [375,667], [430,932], [844,390], [390,744], [390,844]]) {
      await page.setViewportSize({width, height});
      await page.waitForTimeout(160);
      await fit(width + '×' + height);
    }
    const centerAsset = Buffer.from(await (await page.request.get(base + '/vista/assets/03cd3fed69d7.webp')).body());
    const centerBlob = require('node:crypto').createHash('sha1').update(Buffer.concat([Buffer.from('blob ' + centerAsset.length + '\0'),centerAsset])).digest('hex');
    assert.equal(centerBlob, 'e57f03afc33ac4e5b31bb3611b46160adad31831', 'approved center artwork is unchanged');
    await page.locator('.va-time-pause').click();
    await page.setViewportSize({width:1080,height:720}); await page.waitForTimeout(200);
    const pixels = baseline => page.evaluate(baseline => {
      const time=document.querySelector('.va-time-input');time.value='.06';time.dispatchEvent(new Event('input',{bubbles:true}));
      const canvas=document.querySelector('.va-world-light'),gl=canvas.getContext('webgl');
      const width=1080,height=324,data=new Uint8Array(width*height*4);
      gl.readPixels(Math.round((canvas.width-width)/2),0,width,height,gl.RGBA,gl.UNSIGNED_BYTE,data);
      if(baseline){window.centerPixels=data;return null;}
      let changed=0;for(let i=0;i<data.length;i+=4)if(Math.max(...[0,1,2].map(c=>Math.abs(data[i+c]-window.centerPixels[i+c])))>3)changed++;
      return changed/(width*height);
    }, baseline);
    await pixels(true);
    await page.setViewportSize({width:2560,height:720}); await page.waitForTimeout(200);
    assert.ok(await pixels(false)<.002, 'widening the view preserves the rendered central terrain and its position');
    await page.locator('.va-time-pause').click();
    await page.setViewportSize({width:390,height:844}); await page.waitForTimeout(200);
    await page.locator('.va-events').click(); await page.waitForTimeout(700);
    await page.locator('.va-earlier').click();
    await page.locator('.va-window-foot').scrollIntoViewIfNeeded();
    assert.ok(await page.evaluate(() => scrollY > 0), 'expanded reading content still scrolls');
    await page.locator('.va-close').click(); await page.waitForTimeout(700);
    await fit('return home after scrolling the archive');
    const before = await page.evaluate(() => window.vistaDebug.snapshot().elapsed);
    await page.waitForTimeout(500);
    assert.ok(await page.evaluate(() => window.vistaDebug.snapshot().elapsed) > before, 'motion survives viewport and panel changes');

    // A fresh mobile context also covers the first load, rather than just a
    // desktop page resized to phone width. Changing height simulates browser chrome.
    const phone = await browser.newPage({viewport: {width: 390, height: 744}, isMobile: true, hasTouch: true});
    await phone.goto(base + '/', {waitUntil: 'domcontentloaded'});
    for (const height of [744, 844]) {
      await phone.setViewportSize({width: 390, height}); await phone.waitForTimeout(200);
      assert.deepEqual(await phone.evaluate(() => [document.documentElement.scrollHeight, document.querySelector('.va-world').clientHeight]), [height, height]);
    }
    await phone.close();
    assert.deepEqual(errors, []);
    console.log('PASS unchanged central art, fresh phone load, browser-height changes, reading scroll, and animation continuity');
  } finally { await browser.close(); }
})().catch(error => {console.error(error); process.exitCode = 1;});
