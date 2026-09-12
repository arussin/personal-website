const assert=require('node:assert/strict');
const {chromium}=require(process.env.VISTA_PLAYWRIGHT_MODULE||'playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.VISTA_CHROME_PATH?{executablePath:process.env.VISTA_CHROME_PATH}:{})});
 try{
  const base=process.env.VISTA_SITE_URL||'http://127.0.0.1:8137';
  const page=await browser.newPage({viewport:{width:1280,height:900},reducedMotion:'no-preference'});
  page.setDefaultTimeout(8000);
  await page.route('**/*googletagmanager.com/**',route=>route.abort());
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  for(const [path,view] of [['/events','Events'],['/events.html','Events'],['/events/index.html','Events'],['/photography','Photography'],['/photography.html','Photography']]){
   const response=await page.goto(base+path+'?debug-motion',{waitUntil:'domcontentloaded'});
   assert.equal(response.status(),200,path);
   await page.waitForFunction(()=>document.querySelector('#adam-vista').dataset.open==='true');
   assert.equal(await page.locator('.va-heading h2').textContent(),view,path);
   await page.waitForFunction(()=>window.vistaDebug?.snapshot().graphicsReady);
   assert.equal(await page.locator('meta[name="robots"]').count(),0,'production is indexable');
   if(view==='Events'){
    assert.ok(await page.locator('.va-event details').evaluateAll(items=>items.length===3&&items.every(item=>item.open)));
    assert.equal(await page.locator('.va-event').filter({hasText:'Bar Freda'}).locator('a').getAttribute('href'),'https://www.instagram.com/stories/highlights/17973199365102891/');
   }else{
    await page.waitForFunction(()=>[...document.querySelectorAll('.va-photo img')].every(img=>img.complete&&img.naturalWidth>0));
   }
   console.log('PASS direct '+path);
  }
  await page.goto(base+'/?debug-motion',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.vistaDebug?.snapshot().graphicsReady);
  await page.evaluate(()=>window.routeIdentity={});
  await page.locator('.va-events').click();await page.waitForTimeout(700);
  assert.equal(new URL(page.url()).pathname,'/events/');
  await page.locator('.va-earlier').click();
  assert.ok(await page.locator('.va-event details').evaluateAll(items=>items.length===11&&items.every(item=>item.open)));
  await page.locator('.va-panel-tabs [data-view="photography"]').click();await page.waitForTimeout(450);
  assert.equal(new URL(page.url()).pathname,'/photography/');
  await page.goBack();await page.waitForTimeout(450);
  assert.equal(await page.locator('.va-heading h2').textContent(),'Events');
  await page.goBack();await page.waitForTimeout(650);
  assert.equal(await page.locator('#adam-vista').getAttribute('data-open'),'false');
  assert.ok(await page.evaluate(()=>!!window.routeIdentity),'Back does not reload the vista');
  await page.goForward();await page.waitForTimeout(700);
  assert.equal(await page.locator('#adam-vista').getAttribute('data-open'),'true');
  await page.locator('.va-close').click();await page.waitForTimeout(650);
  assert.equal(new URL(page.url()).pathname,'/');
  assert.ok(await page.evaluate(()=>!!window.routeIdentity),'close retains animation state');
  const layers=await page.evaluate(()=>({art:+getComputedStyle(document.querySelector('.va-sky-art')).zIndex,moon:+getComputedStyle(document.querySelector('.va-moon-layer')).zIndex,labels:+getComputedStyle(document.querySelector('.va-sky-nav')).zIndex,pointer:getComputedStyle(document.querySelector('.va-moon-layer')).pointerEvents}));
  assert.ok(layers.art<layers.moon&&layers.moon<layers.labels);assert.equal(layers.pointer,'none');
  await page.locator('.va-github').hover();await page.waitForTimeout(1400);
  assert.equal(await page.locator('.va-sky-art [data-active="true"]').count(),1,'hover follows the extracted constellation');
  console.log('PASS history, expanded archive, live scene retention, and moon layer order');
  await page.setViewportSize({width:390,height:844});
  await page.locator('.va-events').click();await page.waitForTimeout(700);
  await page.locator('.va-earlier').scrollIntoViewIfNeeded();
  assert.ok(await page.evaluate(()=>scrollY>0),'expanded mobile page scrolls');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  const noJS=await browser.newPage({javaScriptEnabled:false});
  await noJS.goto(base+'/events/',{waitUntil:'domcontentloaded'});
  assert.ok((await noJS.locator('body').innerText()).includes('Bar Freda'));
  assert.equal(await noJS.locator('noscript a[href*="17973199365102891"]').count(),1);
  await noJS.close();assert.deepEqual(errors,[]);
  console.log('PASS phone scrolling and no-JavaScript event fallback');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
