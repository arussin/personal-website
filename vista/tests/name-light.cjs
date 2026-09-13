const assert=require('node:assert/strict');
const {chromium}=require(process.env.VISTA_PLAYWRIGHT_MODULE||'playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.VISTA_CHROME_PATH?{executablePath:process.env.VISTA_CHROME_PATH}:{})});
 try{
  const base=process.env.VISTA_SITE_URL||'http://127.0.0.1:8137';
  const page=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'no-preference'});
  await page.route('**/*googletagmanager.com/**',route=>route.abort());
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto(base+'/?debug-motion',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.vistaDebug?.snapshot().graphicsReady);
  const state=()=>page.evaluate(()=>window.nameLightDebug.snapshot());
  await page.waitForFunction(()=>{const s=window.nameLightDebug.snapshot();return s.sweep&&s.lights>10;},{},{timeout:12000});
  const automatic=await state();
  assert.ok(automatic.patch.width<1296*.3,'idle glimmer stays within a small area');
  assert.ok(automatic.patch.dots<automatic.dots*.3,'idle glimmer does not scan the entire name');
  console.log('PASS automatic local shimmer paints shortly after arrival');

  await page.locator('.va-time-pause').click();const frozen=await state();
  await page.waitForTimeout(350);assert.equal((await state()).time,frozen.time);
  const session=await page.context().newCDPSession(page);
  await session.send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1.5,mobile:false});
  await page.waitForFunction(()=>window.nameLightDebug.snapshot().dpr===1.5);
  const painted=await page.locator('.va-name').evaluate(c=>({width:c.width,css:c.getBoundingClientRect().width,
   opaque:c.getContext('2d').getImageData(0,0,c.width,c.height).data.some((v,i)=>i%4===3&&v>0)}));
  assert.equal(painted.width,Math.round(painted.css*1.5));assert.ok(painted.opaque);
  assert.equal((await state()).time,frozen.time,'density change preserves pause');
  await session.send('Emulation.clearDeviceMetricsOverride');await page.setViewportSize({width:1440,height:900});
  await page.locator('.va-time-pause').click();await page.waitForFunction(()=>window.nameLightDebug.snapshot().allowed);
  await page.evaluate(()=>window.nameLightDebug.reset());
  const before=await page.locator('.va-name').evaluate(c=>c.toDataURL());
  const r=await page.locator('.va-name').boundingBox();
  await page.mouse.move(r.x+r.width*.18,r.y+r.height*.45);
  await page.waitForFunction(()=>window.nameLightDebug.snapshot().lights>10);
  assert.notEqual(await page.locator('.va-name').evaluate(c=>c.toDataURL()),before,'pointer response reaches the canvas');
  await page.mouse.move(10,500);
  await page.waitForFunction(()=>window.nameLightDebug.snapshot().moving===0,{},{timeout:6500});
  console.log('PASS pointer glints settle; paused name survives display-density change');

  for(const section of ['events','photography']){
   await page.locator('.va-'+section).click();await page.waitForTimeout(600);
   const opened=await state();assert.equal(opened.allowed,false);
   await page.waitForTimeout(300);assert.equal((await state()).time,opened.time);
   await page.locator('.va-close').click();await page.waitForFunction(()=>window.nameLightDebug.snapshot().allowed);
  }
  await page.locator('.va-name').focus();await page.keyboard.press('Space');
  await page.waitForFunction(()=>window.nameLightDebug.snapshot().sweep);
  await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(100);
  const reduced=await state();assert.equal(reduced.moving,0);assert.equal(reduced.allowed,false);
  console.log('PASS panels suspend and resume the effect; keyboard and reduced motion work');

  const phone=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true,reducedMotion:'no-preference'});
  phone.on('pageerror',error=>errors.push(error.message));
  await phone.route('**/*googletagmanager.com/**',route=>route.abort());
  await phone.goto(base+'/?debug-motion',{waitUntil:'domcontentloaded'});
  await phone.waitForFunction(()=>window.nameLightDebug?.snapshot().allowed);
  await phone.locator('.va-name').tap();
  await phone.waitForFunction(()=>window.nameLightDebug.snapshot().moving>0);
  assert.equal(await phone.evaluate(()=>document.documentElement.scrollWidth),390);
  assert.equal(await phone.locator('.va-name').evaluate(c=>getComputedStyle(c).touchAction),'pan-y');
  assert.equal(await phone.evaluate(()=>window.nameLightDebug.snapshot().dpr),2);
  assert.deepEqual(errors,[]);
  console.log('PASS phone tap, density, native vertical scrolling and no browser errors');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
