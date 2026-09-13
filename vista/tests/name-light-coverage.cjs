const assert=require('node:assert/strict');
const {chromium}=require(process.env.VISTA_PLAYWRIGHT_MODULE||'playwright');

// This hook is injected only into this test browser. Sample the actual renderer
// at exact spring ages so the dark-center regression is independent of frame rate.
const probe=`window.nameCoverageProbe=({x=176,y=92,age=.2,day=0,automatic=false})=>{
 resetNameLight();paintNameLighting(day,day?1:-.93);nameStudy.pointerAt=-100;
 const pixels=()=>ctx.getImageData(0,0,canvas.width,canvas.height).data;
 const resting=pixels();
 if(automatic){
  const random=Math.random;Math.random=()=>.5;
  try{nameStudy.lastPatchX=null;nameSweep();}finally{Math.random=random;}
 }else nameRipple(x,y,11);
 for(let t=0;t<age;t+=1/120){nameStudy.time+=1/120;advanceNameWater(1000/120);}
 drawNameStudy();const active=pixels();let darkened=0,brightened=0,checked=0;
 const luminance=(p,i)=>.2126*p[i]+.7152*p[i+1]+.0722*p[i+2];
 for(let i=0;i<resting.length;i+=4){
  if(resting[i+3]<250||resting[i]<170||resting[i+1]<125)continue;
  checked++;const delta=luminance(active,i)-luminance(resting,i);
  if(delta < -4)darkened++;if(delta>4)brightened++;
 }
 const moving=nameStudy.moving.size,lights=nameDots.filter(p=>p.light>.025).length;
 resetNameLight();const settled=pixels();
 let restoreDelta=0;for(let i=0;i<resting.length;i++)restoreDelta=Math.max(restoreDelta,Math.abs(resting[i]-settled[i]));
 return {darkened,brightened,checked,moving,lights,restoreDelta};
};`;
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.VISTA_CHROME_PATH?{executablePath:process.env.VISTA_CHROME_PATH}:{})});
 try{
  const base=process.env.VISTA_SITE_URL||'http://127.0.0.1:8137';
  for(const width of [1440,390]){
   const page=await browser.newPage({viewport:{width,height:900},deviceScaleFactor:2});
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.route('**/*googletagmanager.com/**',r=>r.abort());
   await page.route('**/app.js*',async route=>{
    const response=await route.fetch(),source=await response.text();
    const marker='// Keep the annotated anchor at [37,30]';assert.ok(source.includes(marker));
    await route.fulfill({response,body:source.replace(marker,probe+'\n'+marker)});
   });
   await page.goto(base+'/?debug-motion',{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>window.nameLightDebug?.snapshot().allowed);
   for(const day of [0,1]){
    for(const [x,y] of [[176,92],[540,92],[680,40]]){
     for(const age of [.08,.2,.45,.85]){
      const result=await page.evaluate(args=>window.nameCoverageProbe(args),{x,y,age,day});
      assert.ok(result.checked>1000);assert.ok(result.moving>0);
      assert.equal(result.darkened,0,JSON.stringify({width,day,x,y,age,...result}));
      assert.ok(result.restoreDelta<=1,'resting texture returns within canvas rounding: '+JSON.stringify({width,day,x,y,age,...result}));
      if(age===.2)assert.ok(result.brightened>0,'glints remain visible');
     }
    }
    const idle=await page.evaluate(args=>window.nameCoverageProbe(args),{automatic:true,age:3,day});
    assert.ok(idle.moving>0&&idle.brightened>0,'automatic shimmer remains alive');
    assert.equal(idle.darkened,0,'automatic shimmer never opens dark gaps');
    assert.ok(idle.restoreDelta<=1);
   }
   assert.deepEqual(errors,[]);
   console.log('PASS '+width+'px: no dark gaps in pointer or idle shimmer, day/night; stable resting texture');
   await page.close();
  }
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
