import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
const exact=new Set(['index.html','events.html','photography.html','favicon.svg','robots.txt','sitemap.xml','events/index.html','photography/index.html','vista/app.js','vista/content.js','vista/index.html','vista/sky.frag','vista/style.css','vista/asset-manifest.json']);
export function publicPath(name){
 return typeof name==='string' && /^[A-Za-z0-9_./-]+$/.test(name) && !name.split('/').some(p=>!p||p==='.'||p==='..'||p.startsWith('.')) &&
 (exact.has(name)||/^(assets\/(photos|thumbs)\/|vista\/assets\/)[A-Za-z0-9_-]+\.(jpg|jpeg|png|webp|svg|json)$/.test(name)||/^fitbit-archive\/[A-Za-z0-9_-]+\.(html|css)$/.test(name));
}
export function packageWorker(root,{outputDir,git=(args)=>execFileSync('git',args,{cwd:root,maxBuffer:26*1024*1024})}={}){
const revision=git(['rev-parse','HEAD']).toString().trim();
if(!/^[a-f0-9]{40}$/.test(revision))throw Error('Invalid source revision');
const allow=JSON.parse(fs.readFileSync(path.join(root,'deploy/public-allowlist.json'),'utf8'));
if(!Array.isArray(allow)||!allow.length||new Set(allow).size!==allow.length||allow.length>20000||!allow.every(publicPath))throw Error('Invalid public allowlist');
const output=path.resolve(outputDir || path.join(root,'.worker-build'));
if(process.platform==='win32'&&!outputDir&&!path.resolve(root).toLowerCase().startsWith('c:'+path.sep+'devcache'+path.sep))throw Error('Specify an external C:/DevCache outputDir');
if(outputDir && (output===path.resolve(root)||output.startsWith(path.resolve(root)+path.sep)))throw Error('Output must be outside canonical source');
if(fs.existsSync(output))throw Error('Preserve/remove prior build explicitly before packaging');
const entries=[];
for(const name of allow){
 const entry=git(['ls-tree','HEAD','--',name]).toString().trimEnd();
 if(!/^100644 blob [0-9a-f]{40}\t/.test(entry)||entry.split('\t')[1]!==name)throw Error('Expected tracked regular file: '+name);
 const bytes=git(['show',`HEAD:${name}`]);
 if(bytes.length>25*1024*1024)throw Error('Asset exceeds reviewed size limit');
 entries.push({path:name,size:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex'),bytes});
}
for(const e of entries){const dest=path.join(output,'public',e.path);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,e.bytes);}
fs.writeFileSync(path.join(output,'manifest.json'),JSON.stringify({revision,files:entries.map(({bytes,...e})=>e)},null,2)+'\n');
return {revision,assets:entries.length,bytes:entries.reduce((n,e)=>n+e.size,0)};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)console.log(JSON.stringify(packageWorker(process.cwd(),{outputDir:process.argv[2]})));
