const assert = require('node:assert/strict');
const {chromium} = require(process.env.VISTA_PLAYWRIGHT_MODULE || 'playwright');

(async () => {
  const browser = await chromium.launch({headless:true,
    ...(process.env.VISTA_CHROME_PATH ? {executablePath:process.env.VISTA_CHROME_PATH} : {})});
  const base = process.env.VISTA_SITE_URL || 'http://127.0.0.1:8137';
  const errors = [];
  try {
    const page = await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'no-preference'});
    page.on('pageerror', error => errors.push(error.message));
    let releaseShader;
    const gate = new Promise(resolve => {releaseShader=resolve;});
    let shaderRequests=0;
    await page.route('**/sky.frag*', async route => {shaderRequests++;await gate;await route.continue();});
    await page.goto(base+'/?debug-motion',{waitUntil:'domcontentloaded'});
    await page.waitForFunction(() => window.vistaDebug);
    const snapshot = () => page.evaluate(() => window.vistaDebug.snapshot());
    const lose = async () => {
      await page.evaluate(() => {
        window.displayLoss=document.querySelector('.va-world-light').getContext('webgl').getExtension('WEBGL_lose_context');
        if(!window.displayLoss)throw new Error('Context loss extension required for this regression');
        window.displayLoss.loseContext();
      });
      await page.waitForFunction(() => !window.vistaDebug.snapshot().graphicsReady);
      await page.waitForTimeout(120);
    };
    const restore = async () => {
      await page.evaluate(() => window.displayLoss.restoreContext());
      await page.waitForFunction(() => window.vistaDebug.snapshot().graphicsReady);
    };
    const advances = async label => {
      const before=await snapshot();await page.waitForTimeout(500);const after=await snapshot();
      assert.equal(after.paused,false,label+': no unintended pause');
      assert.equal(after.graphicsError,null,label+': no graphics error');
      assert.ok(after.elapsed>before.elapsed+.1&&after.paints>before.paints+2,label+': motion continues');
      assert.equal(await page.locator('.va-time-input').isEnabled(),true,label+': controls enabled');
      console.log('PASS '+label);
    };

    // Previously a reset while loading entered the fatal-error branch, setting
    // paused=true and leaving every control disabled even after restoration.
    await lose();releaseShader();await page.waitForTimeout(700);await restore();
    await advances('graphics reset during initial scene loading');
    const cdp=await page.context().newCDPSession(page);
    const metrics=async (width,height,deviceScaleFactor) => cdp.send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor,mobile:false});
    const fitted=async () => {
      await page.waitForFunction(() => {
        const c=document.querySelector('.va-world-light'),r=c.getBoundingClientRect(),gl=c.getContext('webgl');
        const limit=Math.min(gl.getParameter(gl.MAX_RENDERBUFFER_SIZE),...gl.getParameter(gl.MAX_VIEWPORT_DIMS));
        const ratio=Math.min(devicePixelRatio,2,Math.sqrt(5000000/(r.width*r.height)),limit/r.width,limit/r.height);
        return [c,document.querySelector('.va-world-accents'),document.querySelector('.va-moon-layer')].every(layer =>
          layer.width===Math.max(1,Math.round(r.width*ratio))&&layer.height===Math.max(1,Math.round(r.height*ratio))) &&
          gl.drawingBufferWidth===c.width&&gl.drawingBufferHeight===c.height;
      });
      // Force a paint and inspect actual terrain pixels, not only CSS boxes.
      const sample=await page.evaluate(() => {
        const time=document.querySelector('.va-time-input');time.dispatchEvent(new Event('input',{bubbles:true}));
        const c=document.querySelector('.va-world-light'),gl=c.getContext('webgl'),pixel=new Uint8Array(4);
        gl.readPixels(Math.floor(c.width/2),Math.floor(c.height*.2),1,1,gl.RGBA,gl.UNSIGNED_BYTE,pixel);
        return [...pixel];
      });
      assert.equal(sample[3],255,'landscape has been painted after resize');
      assert.ok(sample[0]+sample[1]+sample[2]>40,'landscape is not a black graphics surface');
    };
    for(const dpr of [1.25,1.5,2,1]){
      await metrics(1440,900,dpr);await fitted();
      await page.waitForFunction(() => [...document.querySelectorAll('.va-constellation canvas')].every(c=>c.width===160*Math.min(devicePixelRatio,2)));
    }
    await advances('DPI-only monitor changes with unchanged CSS dimensions');
    for(const [w,h,dpr] of [[2560,1440,2],[800,600,1.25],[3840,2160,1.5],[1,1,1],[390,844,3],[2560,720,1],[1440,900,1.5]])await metrics(w,h,dpr);
    await fitted();await advances('rapid resize, tiny transient window, and return to desktop');

    await page.locator('.va-events').click();
    await metrics(1440,650,1.25);await fitted();await page.waitForTimeout(700);
    await page.locator('.va-close').click();await metrics(1440,1000,1.5);await fitted();await page.waitForTimeout(700);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollHeight),1000,'height-only resize during panel close settles to the viewport');
    await advances('resize during Events open and close');
    for(let i=0;i<2;i++){await lose();await metrics(1440,900,i?1:2);await restore();await fitted();}
    await advances('repeated graphics resets and resize during recovery');
    assert.equal(shaderRequests,1,'recovery reuses loaded scene resources');

    await page.locator('.va-time-pause').click();const paused=await snapshot();
    await metrics(1440,900,1.25);await fitted();await lose();await restore();await page.waitForTimeout(300);
    assert.equal((await snapshot()).paused,true,'intentional pause survives recovery');
    assert.equal((await snapshot()).elapsed,paused.elapsed,'recovery does not advance paused time');
    await page.locator('.va-time-pause').click();await advances('intentional pause and resume after recovery');
    assert.deepEqual(errors,[]);console.log('PASS no page errors');
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
