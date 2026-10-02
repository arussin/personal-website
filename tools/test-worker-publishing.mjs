import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {packageWorker,publicPath} from './package-worker.mjs';
import {verifyWorker} from './verify-worker.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const source=process.argv[2];if(!source)throw Error('Pass approved package directory');
const approved=JSON.parse(fs.readFileSync(path.join(source,'public-asset-manifest.json')));
const allow=JSON.parse(fs.readFileSync(path.join(root,'deploy/public-allowlist.json')));
const cache=process.argv[3];if(!cache)throw Error('Pass external test cache');fs.mkdirSync(cache,{recursive:true});const base=fs.mkdtempSync(path.join(cache,'publishing-tests-'));
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
let count=0;const checks=[];
function test(name,fn){fn();count++;checks.push(name);}
async function atest(name,fn){await fn();count++;checks.push(name);}
function fixture(name,list){const p=path.join(base,name);fs.mkdirSync(path.join(p,'deploy'),{recursive:true});fs.writeFileSync(path.join(p,'deploy/public-allowlist.json'),JSON.stringify(list));return p;}
const data=new Map(approved.files.map(e=>[e.path,fs.readFileSync(path.join(source,'public-dist',e.path))]));
const git=args=>{
 if(args[0]==='rev-parse')return Buffer.from(approved.revision);
 const name=args[0]==='show'?args[1].slice(5):args.at(-1);
 if(args[0]==='ls-tree')return Buffer.from(`100644 blob ${'a'.repeat(40)}\t${name}\n`);
 return data.get(name);
};
test('allowlist exactly equals approved 79 paths',()=>assert.deepEqual([...allow].sort(),approved.files.map(e=>e.path).sort()));
test('all approved source bytes match approved hashes and sizes',()=>{assert.equal(data.size,79);for(const e of approved.files){assert.equal(data.get(e.path).length,e.size);assert.equal(sha(data.get(e.path)),e.sha256);}});
const full=fixture('approved-package',allow);
// Deliberate files outside the allowlist must never enter the output.
for(const p of ['.env','CNAME','private.json','tools/deploy.js','maimai/index.html','home/state.json']){const dest=path.join(full,p);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,'SYNTHETIC MUST NOT PUBLISH');}
test('package exact approved committed bytes',()=>assert.deepEqual(packageWorker(full,{git}),{revision:approved.revision,assets:79,bytes:20897073}));
const built=JSON.parse(fs.readFileSync(path.join(full,'.worker-build/manifest.json')));
test('packaged manifest matches all approved hashes',()=>assert.deepEqual(built.files,approved.files.map(({path,size,sha256})=>({path,size,sha256}))));
function listFiles(dir,prefix=''){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?listFiles(path.join(dir,e.name),prefix+e.name+'/'):[prefix+e.name]);}
test('private and nonpublic files excluded from actual output',()=>assert.deepEqual(listFiles(path.join(full,'.worker-build/public')).sort(),[...allow].sort()));
test('existing output cannot be overwritten',()=>assert.throws(()=>packageWorker(full,{git}),/prior build/));
for(const bad of ['CNAME','.env','private.json','tools/build-vista.py','maimai/index.html','home/state.json','../index.html','/index.html','vista/assets/.env','assets/photos/secret.txt'])test('reject '+bad,()=>{assert.equal(publicPath(bad),false);assert.throws(()=>packageWorker(fixture('bad-'+count,[bad]),{git}),/allowlist/);});
test('reject duplicate allowlist',()=>assert.throws(()=>packageWorker(fixture('duplicate',['index.html','index.html']),{git}),/allowlist/));
test('reject symlink git mode before output',()=>assert.throws(()=>packageWorker(fixture('symlink',['index.html']),{git:a=>a[0]==='ls-tree'?Buffer.from(`120000 blob ${'a'.repeat(40)}\tindex.html\n`):git(a)}),/regular file/));
// Real local Git verifies the adapter reads committed bytes despite dirty/untracked files.
const real=fixture('real-git',['index.html']);
const run=(args)=>execFileSync('git',args,{cwd:real,stdio:'pipe'});
run(['init','--quiet']);fs.writeFileSync(path.join(real,'index.html'),'committed-public');
run(['add','index.html','deploy/public-allowlist.json']);run(['-c','user.name=Local Fixture','-c','user.email=fixture@example.invalid','-c','commit.gpgsign=false','commit','--quiet','-m','offline fixture']);
fs.writeFileSync(path.join(real,'index.html'),'DIRTY CONTENT');fs.writeFileSync(path.join(real,'.env'),'SYNTHETIC SECRET');
test('real Git packaging ignores dirty file and untracked secret',()=>{packageWorker(real);assert.equal(fs.readFileSync(path.join(real,'.worker-build/public/index.html'),'utf8'),'committed-public');});
const fakeFetch=async(url,options)=>{assert.equal(url.origin,'https://adamrussin.com');assert.equal(options.credentials,'omit');return new Response(data.get(url.pathname.slice(1)),{status:200});};
await atest('verify all 79 assets using local responses',async()=>assert.equal((await verifyWorker(built,fakeFetch)).assets,79));
const one={revision:approved.revision,files:[built.files.find(e=>e.path==='index.html')]};
await atest('reject corrupt bytes',()=>assert.rejects(()=>verifyWorker(one,async()=>new Response('bad'))));
await atest('reject unexpected 404',()=>assert.rejects(()=>verifyWorker(one,async()=>new Response(null,{status:404}))));
await atest('reject oversized response',()=>assert.rejects(()=>verifyWorker(one,async()=>new Response(Buffer.alloc(one.files[0].size+1))),/too large/));
await atest('reject external redirect without contacting it',async()=>{let calls=0;await assert.rejects(()=>verifyWorker(one,async()=>{calls++;return new Response(null,{status:302,headers:{Location:'https://example.invalid/'}});}),/Out-of-scope/);assert.equal(calls,1);});
await atest('bounded redirect loop',async()=>{let calls=0;await assert.rejects(()=>verifyWorker(one,async()=>{calls++;return new Response(null,{status:307,headers:{Location:'/index.html'}});}));assert.equal(calls,5);});
await atest('same-origin redirect verifies final bytes',async()=>{let calls=0;await verifyWorker(one,async()=>++calls===1?new Response(null,{status:307,headers:{Location:'/?x=1'}}):new Response(data.get('index.html')));assert.equal(calls,2);});
await atest('reject nonpublic manifest before any fetch',()=>assert.rejects(()=>verifyWorker({revision:approved.revision,files:[{...one.files[0],path:'.env'}]},()=>{throw Error('Must not fetch');}),/Invalid manifest/));
test('content config cannot manage routes or bindings',()=>{const c=JSON.parse(fs.readFileSync(path.join(root,'deploy/wrangler.content.json')));assert.deepEqual(Object.keys(c).sort(),['assets','compatibility_date','name','preview_urls','workers_dev'].sort());assert.equal(c.name,'adamrussin-website');assert.equal(c.workers_dev,false);assert.equal(c.preview_urls,false);assert.deepEqual(c.assets,{directory:'../.worker-build/public',html_handling:'auto-trailing-slash',not_found_handling:'none'});});
const {activeDeployment,assertUnchanged,publish,verifyContracts}=await import('./publish-worker.mjs');
const deployment={id:'11111111-1111-1111-1111-111111111111',created_on:'2026-10-01T01:00:00Z',versions:[{version_id:'22222222-2222-2222-2222-222222222222',percentage:100}]};
test('choose latest deployment independent of API order',()=>assert.deepEqual(activeDeployment([deployment,{...deployment,id:'33333333-3333-3333-3333-333333333333',created_on:'2026-10-02T01:00:00Z'}]).deployment,'33333333-3333-3333-3333-333333333333'));
test('reject split traffic before publication',()=>assert.throws(()=>activeDeployment([{...deployment,versions:[{...deployment.versions[0],percentage:50}]}]),/full-traffic/));
test('reject absent deployment before publication',()=>assert.throws(()=>activeDeployment([])));
test('detect intervening production deployment',()=>assert.throws(()=>assertUnchanged({deployment:'a',version:'b'},{deployment:'c',version:'b'}),/Production changed/));
test('accept stable production identity',()=>assertUnchanged(activeDeployment([deployment]),activeDeployment([deployment])));
await atest('explicit execute gate precedes all operations',()=>assert.rejects(()=>publish({execute:false}),/Explicit/));
await atest('integration failure blocks acceptance',()=>assert.rejects(()=>verifyContracts(async()=>new Response(null,{status:503})),/integration failed/));
const result={checkedAt:new Date().toISOString(),passed:true,count,checks,approvedRevision:approved.revision,assets:79,bytes:20897073,evidenceDirectory:base,networkCalls:0,providerCommands:0,scope:'Offline fixture tests only; no provider upload/promotion permission or CI runtime validation'};
fs.writeFileSync(path.join(base,'local-test-results.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
