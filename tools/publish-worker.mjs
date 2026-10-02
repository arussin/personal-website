import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {publicPath} from './package-worker.mjs';
import {verifyWorker} from './verify-worker.mjs';
import integrations from './verify-website-integrations.cjs';

const uuid=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/;
export function activeDeployment(rows){
 if(!Array.isArray(rows)||!rows.length)throw Error('No deployment history');
 const current=[...rows].sort((a,b)=>Date.parse(b.created_on)-Date.parse(a.created_on))[0];
 if(!uuid.test(current.id)||!Array.isArray(current.versions)||current.versions.length!==1||current.versions[0].percentage!==100||!uuid.test(current.versions[0].version_id))throw Error('Expected one full-traffic version');
 return {deployment:current.id,version:current.versions[0].version_id};
}
export function assertUnchanged(before,after){if(JSON.stringify(before)!==JSON.stringify(after))throw Error('Production changed: stop without promotion');}
export async function verifyContracts(fetchImpl=fetch){
 const result=await integrations.collect(fetchImpl);
 if(result.rows.some(r=>r.failures.length))throw Error('Preserved integration failed: '+result.rows.filter(r=>r.failures.length).map(r=>r.id).join(', '));
 const cases=[
 ['https://www.adamrussin.com/events?release-check=1&x=a%20b',301,'https://adamrussin.com/events?release-check=1&x=a%20b'],
 ['http://www.adamrussin.com/events?release-check=1&x=a%20b',301,'https://www.adamrussin.com/events?release-check=1&x=a%20b'],
 ['https://adamrussin.com/events.html?release-check=1',307,'/events?release-check=1'],
 ['https://adamrussin.com/goshen?release-check=1',302,'https://chromewebstore.google.com/detail/goshen-terminal/jlhlihmmbllkllglociipkhafbpmhcle'],
 ['https://adamrussin.com/goshen/?release-check=1',302,'https://chromewebstore.google.com/detail/goshen-terminal/jlhlihmmbllkllglociipkhafbpmhcle'],
 ...['/CNAME','/.env','/public-asset-manifest.json','/unlisted-release-check'].map(p=>['https://adamrussin.com'+p,404,null])];
 for(const [url,status,location] of cases){const r=await fetchImpl(url,{method:'HEAD',credentials:'omit',redirect:'manual',signal:AbortSignal.timeout(20000)});await r.body?.cancel();if(r.status!==status||r.headers.get('location')!==location)throw Error('Route failed: '+url);}
 return {integrations:result.rows.length,routes:cases.length};
}
export async function publish({root,build,wrangler,expectedVersion,expectedRevision,execute=false}){
 if(!execute||!uuid.test(expectedVersion)||!/^[a-f0-9]{40}$/.test(expectedRevision))throw Error('Explicit --execute, expected version and revision required');
 root=path.resolve(root);build=path.resolve(build);
 if(build===root||build.startsWith(root+path.sep))throw Error('Build must be outside canonical source');
 const manifest=JSON.parse(fs.readFileSync(path.join(build,'manifest.json')));
 if(!Array.isArray(manifest.files)||!manifest.files.length||new Set(manifest.files.map(e=>e.path)).size!==manifest.files.length||manifest.files.some(e=>!publicPath(e.path)||!Number.isSafeInteger(e.size)||e.size<0||e.size>25*1024*1024||!/^[a-f0-9]{64}$/.test(e.sha256)))throw Error('Invalid manifest');
 if(manifest.revision!==expectedRevision)throw Error('Manifest revision mismatch');
 const git=args=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim();
 const checkSource=()=>{if(git(['rev-parse','HEAD'])!==expectedRevision||git(['status','--porcelain','--untracked-files=no']))throw Error('Tracked source is dirty or changed');
  const remote=git(['ls-remote','https://github.com/arussin/personal-website.git','refs/heads/main']).split(/\s+/)[0];if(remote!==expectedRevision)throw Error('Candidate is no longer GitHub main');};
 checkSource();
 const committedAllow=JSON.parse(git(['show','HEAD:deploy/public-allowlist.json']));
 if(JSON.stringify([...committedAllow].sort())!==JSON.stringify(manifest.files.map(e=>e.path).sort()))throw Error('Manifest differs from committed allowlist');
 for(const e of manifest.files){const b=fs.readFileSync(path.join(build,'public',e.path));const committed=execFileSync('git',['show','HEAD:'+e.path],{cwd:root,maxBuffer:26*1024*1024});if(!b.equals(committed))throw Error('Package differs from committed bytes: '+e.path);if(b.length!==e.size||crypto.createHash('sha256').update(b).digest('hex')!==e.sha256)throw Error('Package changed: '+e.path);}
 const config=JSON.parse(fs.readFileSync(path.join(root,'deploy/wrangler.content.json')));
 if(JSON.stringify(Object.keys(config).sort())!==JSON.stringify(['assets','compatibility_date','name','preview_urls','workers_dev'].sort())||config.name!=='adamrussin-website'||config.workers_dev!==false||config.preview_urls!==false||config.assets.html_handling!=='auto-trailing-slash'||config.assets.not_found_handling!=='none'||Object.keys(config.assets).length!==3)throw Error('Unreviewed Worker configuration');
 config.assets.directory=path.join(build,'public');
 const configPath=path.join(build,'wrangler.content.json');fs.writeFileSync(configPath,JSON.stringify(config,null,2),{flag:'wx'});
 const env={...process.env,CLOUDFLARE_ACCOUNT_ID:'30f2b0382e0303b0f28cb2fe2e5c1320',WRANGLER_SEND_METRICS:'false',CI:'true',WRANGLER_LOG_PATH:path.join(build,'wrangler.log')};
 const cli=args=>execFileSync(process.execPath,[wrangler,...args,'--config',configPath],{cwd:build,env,encoding:'utf8',maxBuffer:8*1024*1024});
 const list=()=>activeDeployment(JSON.parse(cli(['deployments','list','--json'])));
 const before=list();if(before.version!==expectedVersion)throw Error('Live version differs from reviewed version');
 const receipt={startedAt:new Date().toISOString(),revision:expectedRevision,before,status:'prepared'};
 const save=()=>fs.writeFileSync(path.join(build,'publication-receipt.json'),JSON.stringify(receipt,null,2));save();
 try{
  receipt.preflight=await verifyContracts();save();
  const upload=cli(['versions','upload','--strict','--message',expectedRevision]);
  const match=upload.match(/(?:Worker |Current )?Version ID:\s*([a-f0-9-]{36})/);
  if(!match||!uuid.test(match[1]))throw Error('Cannot identify uploaded version; do not promote');
  receipt.uploadedVersion=match[1];receipt.status='uploaded-not-promoted';save();
  checkSource();assertUnchanged(before,list());
  cli(['versions','deploy',match[1]+'@100','--yes','--message',expectedRevision]);
  receipt.status='promoted-verification-pending';save();
  receipt.after=list();if(receipt.after.version!==match[1])throw Error('Promoted version mismatch');
  receipt.assets=await verifyWorker(manifest);receipt.contracts=await verifyContracts();
  receipt.status='verified';receipt.finishedAt=new Date().toISOString();save();return receipt;
 }catch(e){receipt.error=e.message;receipt.failedAt=new Date().toISOString();save();throw e;}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 const [build,wrangler,expectedVersion,expectedRevision,flag]=process.argv.slice(2);
 console.log(JSON.stringify(await publish({root:process.cwd(),build,wrangler,expectedVersion,expectedRevision,execute:flag==='--execute'}),null,2));
}
