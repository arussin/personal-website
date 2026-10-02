import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {publicPath} from './package-worker.mjs';
export async function verifyWorker(manifest,fetchImpl=fetch){
if(!/^[a-f0-9]{40}$/.test(manifest.revision)||!Array.isArray(manifest.files)||!manifest.files.length||new Set(manifest.files.map(e=>e.path)).size!==manifest.files.length)throw Error('Invalid manifest');
for(const e of manifest.files)if(!publicPath(e.path)||!Number.isSafeInteger(e.size)||e.size<0||e.size>25*1024*1024||!/^[a-f0-9]{64}$/.test(e.sha256))throw Error('Invalid manifest entry');
for(const e of manifest.files){
 let url=new URL('/'+e.path,'https://adamrussin.com');
 let response;
 for(let hops=0;hops<5;hops++){
  if(url.origin!=='https://adamrussin.com')throw Error('Out-of-scope redirect');
  response=await fetchImpl(url,{redirect:'manual',credentials:'omit',signal:AbortSignal.timeout(20000)});
  if([301,302,307,308].includes(response.status)&&response.headers.has('location')){await response.body?.cancel();url=new URL(response.headers.get('location'),url);continue;}
  break;
 }
 if(response.status!==200){await response.body?.cancel();throw Error('Public status mismatch: '+e.path);}
 const chunks=[];let size=0;
 for await(const chunk of response.body||[]){size+=chunk.length;if(size>e.size)throw Error('Public asset too large: '+e.path);chunks.push(chunk);}
 const bytes=Buffer.concat(chunks);
 if(response.status!==200||bytes.length!==e.size||crypto.createHash('sha256').update(bytes).digest('hex')!==e.sha256)throw Error('Public asset mismatch: '+e.path);
}
return {assets:manifest.files.length,revision:manifest.revision};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){const manifest=JSON.parse(fs.readFileSync(process.argv[2] || '.worker-build/manifest.json','utf8'));console.log(JSON.stringify(await verifyWorker(manifest)));}
