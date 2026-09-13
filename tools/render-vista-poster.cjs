// Export the existing renderer's opening frame, excluding text and overlay
// figures. This does not generate, retouch, or change any landscape artwork.
// Serve the repository, run this, and update the content-hashed image references
// only when the opening landscape itself changes. Playwright is a dev dependency.
const {chromium}=require(process.env.VISTA_PLAYWRIGHT_MODULE||'playwright');
const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto');
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.VISTA_CHROME_PATH?{executablePath:process.env.VISTA_CHROME_PATH}:{})});
 try{
  const page=await browser.newPage({viewport:{width:4608,height:1024},deviceScaleFactor:1,reducedMotion:'reduce'});
  await page.route('**/*googletagmanager.com/**',route=>route.abort());
  await page.goto((process.env.VISTA_SITE_URL||'http://127.0.0.1:8137')+'/?debug-motion',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.vistaDebug?.snapshot().graphicsReady);
  const capture=await page.evaluate(()=>{
   const time=document.querySelector('.va-time-input');time.value='.06';time.dispatchEvent(new Event('input',{bubbles:true}));
   const c=document.querySelector('.va-world-light');
   if(c.width!==4608||c.height!==1024||window.vistaDebug.snapshot().elapsed!==0)throw new Error('A full-resolution, paused opening frame is required');
   return c.toDataURL('image/webp',.88);
  });
  const bytes=Buffer.from(capture.split(',')[1],'base64');
  const name='opening-'+crypto.createHash('sha256').update(bytes).digest('hex').slice(0,12)+'.webp';
  await fs.writeFile(path.resolve(__dirname,'../vista/assets',name),bytes);
  console.log(JSON.stringify({name,bytes:bytes.length,width:4608,height:1024}));
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
