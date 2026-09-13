const assert=require('node:assert/strict');
const {chromium}=require(process.env.VISTA_PLAYWRIGHT_MODULE||'playwright');
const readLinks=()=>[...document.querySelectorAll('.va-sky-link')].map(el=>{
 const r=el.getBoundingClientRect();
 return {text:el.textContent.trim(),x:r.x,y:r.y,width:r.width,height:r.height};
});
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.VISTA_CHROME_PATH?{executablePath:process.env.VISTA_CHROME_PATH}:{})});
 try{
  const base=process.env.VISTA_SITE_URL||'http://127.0.0.1:8137';
  for(const [width,height] of [[1440,900],[2560,720],[390,844],[320,568]]){
   const page=await browser.newPage({viewport:{width,height},reducedMotion:'reduce'});
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.route('**/*googletagmanager.com/**',r=>r.abort());
   let releaseApp;const gate=new Promise(resolve=>releaseApp=resolve);
   await page.route('**/app.js*',async route=>{await gate;await route.continue();});
   await page.goto(base+'/?debug-motion',{waitUntil:'commit'});
   await page.waitForFunction(()=>{
    const el=document.querySelector('.va-github');
    return el&&getComputedStyle(el).position==='absolute';
   });
   // Hold JS long enough to inspect the real CSS-only first composition.
   await page.evaluate(()=>document.fonts.ready);
   assert.equal(await page.evaluate(()=>typeof window.vistaDebug),'undefined');
   const opening=await page.evaluate(readLinks);
   assert.ok(opening.every(r=>r.x>=0&&r.x+r.width<=width),'opening labels fit the viewport');
   assert.equal(await page.locator('.va-github .va-constellation').evaluate(el=>getComputedStyle(el).visibility),'hidden','unpositioned markers never flash beside the labels');
   await page.evaluate(()=>{
    window.startupSamples=[];
    const sample=()=>{
     startupSamples.push([...document.querySelectorAll('.va-sky-link')].map(el=>{
      const r=el.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};
     }));
     window.startupFrame=requestAnimationFrame(sample);
    };sample();
   });
   releaseApp();
   await page.waitForFunction(()=>window.vistaDebug?.snapshot().graphicsReady);
   await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
   const samples=await page.evaluate(()=>{cancelAnimationFrame(startupFrame);return startupSamples;});
   samples.push(await page.evaluate(readLinks));
   for(const sample of samples)sample.forEach((rect,i)=>{
    for(const key of ['x','y','width','height'])assert.ok(Math.abs(rect[key]-opening[i][key])<.1,
     `${width}px ${opening[i].text} ${key} moved: ${opening[i][key]} -> ${rect[key]}`);
   });
   assert.equal(await page.locator('.va-sky-art .va-constellation').first().evaluate(el=>getComputedStyle(el).visibility),'visible');
   // Default alignment must not disable the visitor's layout controls.
   await page.getByRole('button',{name:'Arrange sky',exact:true}).click();
   const github=page.locator('.va-github');await github.focus();await github.press('ArrowRight');
   await page.waitForFunction(x=>document.querySelector('.va-github').getBoundingClientRect().x>x,opening[0].x);
   await page.getByRole('button',{name:'Reset',exact:true}).click();
   await page.waitForFunction(x=>Math.abs(document.querySelector('.va-github').getBoundingClientRect().x-x)<.1,opening[0].x);
   assert.deepEqual(errors,[]);
   console.log(`PASS ${width}x${height}: ${samples.length} startup frames stable; sky arrangement and Reset work`);
   await page.close();
  }
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
