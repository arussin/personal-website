const assert=require('node:assert/strict');
const {chromium}=require(process.env.VISTA_PLAYWRIGHT_MODULE||'playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.VISTA_CHROME_PATH?{executablePath:process.env.VISTA_CHROME_PATH}:{})});
 try{
  const base=process.env.VISTA_SITE_URL||'http://127.0.0.1:8137';
  const page=await browser.newPage({viewport:{width:1920,height:900},reducedMotion:'reduce'});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*googletagmanager.com/**',r=>r.abort());
  let releaseApp;const gate=new Promise(resolve=>releaseApp=resolve);
  await page.route('**/app.js*',async route=>{await gate;await route.continue();});
  await page.goto(base+'/?debug-motion',{waitUntil:'commit'});
  await page.waitForFunction(()=>document.querySelector('.va-landscape')&&performance.getEntriesByType('resource').filter(x=>/panorama-(left|right)-v1/.test(x.name)).length===2);
  assert.equal(await page.evaluate(()=>typeof window.vistaDebug),'undefined','test truly holds application startup');
  for(const [width,height] of [[1920,900],[2560,720],[390,844]]){
   await page.setViewportSize({width,height});
   const initial=await page.locator('.va-landscape').evaluate(el=>{
    const r=el.getBoundingClientRect(),style=getComputedStyle(el);
    return {x:r.x,width:r.width,height:r.height,background:style.backgroundImage,clip:style.clipPath,size:style.backgroundSize};
   });
   assert.equal(initial.x,0);assert.equal(initial.width,width);assert.equal(initial.height,height);
   assert.equal(initial.clip,'none');assert.match(initial.background,/opening-[a-f0-9]+\.webp/);
   assert.equal(initial.size,'auto '+height+'px','poster uses the live scene height, preserving center scale');
  }
  console.log('PASS full-width opening scene and early panorama downloads before application startup');
  await page.setViewportSize({width:1920,height:900});releaseApp();
  await page.waitForFunction(()=>window.vistaDebug?.snapshot().graphicsReady);
  const loads=await page.evaluate(()=>performance.getEntriesByType('resource').filter(x=>/\/vista\//.test(x.name)).map(x=>({name:x.name,initiator:x.initiatorType})));
  for(const path of ['03cd3fed69d7.webp','panorama-left-v1.webp','panorama-right-v1.webp','0c083a60182e.webp','66a91181c39d.png','cf4422e0bd45.png','sky.frag','panorama-edges-v1.json']){
   const matching=loads.filter(x=>x.name.includes('/'+path));
   assert.equal(matching.length,1,path+': no duplicate download');assert.equal(matching[0].initiator,'link',path+': response reused from preload');
  }
  assert.equal(await page.locator('.va-landscape').evaluate(el=>getComputedStyle(el).backgroundImage),'none');
  assert.equal(await page.locator('.va-world').evaluate(el=>getComputedStyle(el).opacity),'1');
  const terrain=await page.evaluate(()=>{
   document.querySelector('.va-time-input').dispatchEvent(new Event('input',{bubbles:true}));
   const c=document.querySelector('.va-world-light'),gl=c.getContext('webgl'),pixels=[];
   for(const x of [.03,.5,.97]){const p=new Uint8Array(4);gl.readPixels(Math.floor(c.width*x),Math.floor(c.height*.2),1,1,gl.RGBA,gl.UNSIGNED_BYTE,p);pixels.push([...p]);}
   return pixels;
  });
  assert.ok(terrain.every(p=>p[3]===255&&p[0]+p[1]+p[2]>40),'all three terrain regions are painted on handoff');
  assert.deepEqual(errors,[]);
  console.log('PASS one download per scene resource and a painted full-panorama handoff');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
