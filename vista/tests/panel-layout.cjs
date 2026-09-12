const assert=require('node:assert/strict');
const {chromium}=require(process.env.VISTA_PLAYWRIGHT_MODULE||'playwright');

(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.VISTA_CHROME_PATH?{executablePath:process.env.VISTA_CHROME_PATH}:{})});
 try{
  const base=process.env.VISTA_SITE_URL||'http://127.0.0.1:8137';
  const page=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'no-preference'});
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto(base+'/?debug-motion',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.vistaDebug?.snapshot().graphicsReady);
  await page.evaluate(()=>document.fonts.ready);
  // Headless Chromium normally overlays its scrollbar. Reserving the real
  // browser gutter only while a panel is open reproduces Windows' width change.
  await page.addStyleTag({content:'html:has(#adam-vista[data-open="true"]){scrollbar-gutter:stable}'});
  const anchors=['.va-name','.va-email','.pd-copy','.va-github','.va-linkedin','.va-events','.va-photography','.va-time-dock'];
  const positions=()=>page.evaluate(selectors=>Object.fromEntries(selectors.map(selector=>{
   const r=document.querySelector(selector).getBoundingClientRect();return [selector,{x:r.x,width:r.width}];
  })),anchors);
  const home=await positions();
  for(const view of ['events','photography']){
   await page.evaluate(selectors=>{
    window.panelLayoutFrames=[];window.capturePanelLayout=true;
    const sample=()=>{
     if(!window.capturePanelLayout)return;
     window.panelLayoutFrames.push(Object.fromEntries(selectors.map(s=>{const r=document.querySelector(s).getBoundingClientRect();return [s,{x:r.x,width:r.width}]})));
     requestAnimationFrame(sample);
    };requestAnimationFrame(sample);
   },anchors);
   await page.locator('.va-'+view).click();await page.waitForTimeout(720);
   const panelX=await page.locator('.va-reading').evaluate(el=>el.getBoundingClientRect().x);
   // A rapid close/open must also keep the panel and underlying labels stable.
   await page.locator('.va-close').click();await page.waitForTimeout(90);
   await page.goBack();await page.waitForTimeout(720);
   assert.equal(await page.locator('.va-reading').evaluate(el=>el.getBoundingClientRect().x),panelX);
   await page.locator('.va-close').click();await page.waitForTimeout(650);
   const frames=await page.evaluate(()=>{window.capturePanelLayout=false;return window.panelLayoutFrames});
   assert.ok(frames.length>5,'observed the transition rather than just its end');
   for(const frame of frames)for(const selector of anchors){
    assert.ok(Math.abs(frame[selector].x-home[selector].x)<.1,view+': '+selector+' does not shift');
    assert.ok(Math.abs(frame[selector].width-home[selector].width)<.1,view+': '+selector+' does not reflow');
   }
   assert.equal(await page.evaluate(()=>document.documentElement.scrollHeight),900,'home still fits');
   console.log('PASS stable '+view+' opening, interrupted close, reopening, and closing with a classic scrollbar');
  }
  await page.setViewportSize({width:390,height:844});
  await page.locator('.va-events').click();await page.waitForTimeout(720);
  await page.locator('.va-earlier').click();await page.locator('.va-window-foot').scrollIntoViewIfNeeded();
  assert.ok(await page.evaluate(()=>scrollY>0),'reading content still scrolls');
  await page.evaluate(()=>scrollTo(100,scrollY));
  assert.equal(await page.evaluate(()=>scrollX),0,'no horizontal scrolling');
  // A short viewport scrolls through a minimum-height scene. Both panels must
  // still reveal their header and return to reachable navigation when closed.
  await page.locator('.va-close').click();await page.waitForTimeout(700);
  for(const [width,height] of [[1280,340],[390,400]]){
   await page.setViewportSize({width,height});
   await page.waitForTimeout(200);
   const minimum=width===390?660:600;
   assert.equal(await page.evaluate(()=>document.documentElement.scrollHeight),minimum);
   await page.locator('.va-layout-tools').scrollIntoViewIfNeeded();
   assert.ok(await page.evaluate(()=>scrollY>0),'short home can scroll to Arrange sky');
   for(const view of ['events','photography']){
    await page.locator('.va-'+view).click();await page.waitForTimeout(750);
    assert.equal(await page.evaluate(()=>scrollY),0,'opening '+view+' reveals the panel header');
    await page.locator('.va-window-foot').scrollIntoViewIfNeeded();
    assert.ok(await page.evaluate(()=>scrollY>0),view+' content still scrolls');
    await page.keyboard.press('Escape');await page.waitForTimeout(750);
    assert.equal(await page.evaluate(()=>scrollY),0,'closing '+view+' returns to the sky navigation');
    assert.equal(await page.locator('.va-reading').isVisible(),false);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollHeight),minimum);
   }
  }
  assert.deepEqual(errors,[]);
  console.log('PASS reading scroll, narrow layout, and short-window navigation for both panels');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1});
