'use strict';
// Read-only, public HTTP contract checks. Never follows redirects, sends credentials,
// saves bodies or invokes sync, OAuth, home commands or deployment APIs.
const fs=require('node:fs');
const path=require('node:path');
const cases=[
 {id:'maimai-canonical',url:'https://adamrussin.com/maimai',status:308,location:'https://adamrussin.com/maimai/'},
 {id:'maimai-report',url:'https://adamrussin.com/maimai/',status:200,type:'text/html',private:true},
 {id:'maimai-history',url:'https://adamrussin.com/maimai/history',status:200,type:'text/html',private:true},
 {id:'maimai-b50',url:'https://adamrussin.com/maimai/b50.webp',status:200,type:'image/webp',private:true},
 {id:'party-allowed',url:'https://adamrussin.com/maimai/party/latest.json',origin:'https://maimai.party',status:200,type:'application/json',cors:'https://maimai.party',private:true},
 {id:'party-disallowed',url:'https://adamrussin.com/maimai/party/latest.json',origin:'https://example.invalid',status:200,type:'application/json',private:true},
 {id:'report-no-cors',url:'https://adamrussin.com/maimai/',origin:'https://maimai.party',status:200,type:'text/html',private:true},
 {id:'maimai-unknown',url:'https://adamrussin.com/maimai/migration-audit-nonexistent',status:404,private:true},
 {id:'home-health',url:'https://home.adamrussin.com/healthz',status:200,type:'application/json',noStore:true},
 {id:'home-private-state',url:'https://home.adamrussin.com/night-state.json',status:404,noStore:true},
 {id:'traffic-get',url:'https://traffic.maimai.party/traffic.json',method:'GET',status:200,type:'application/json'}
];
const fields=['content-type','cache-control','access-control-allow-origin','access-control-allow-credentials','vary','referrer-policy'];
async function collect(fetchImpl=fetch){
 const rows=[];
 for(const c of cases){
  try{
   const r=await fetchImpl(c.url,{method:c.method||'HEAD',redirect:'manual',credentials:'omit',headers:c.origin?{Origin:c.origin}:{},signal:AbortSignal.timeout(10000)});
   const headers=Object.fromEntries(fields.map(k=>[k,r.headers.get(k)]));
   const raw=r.headers.get('location');
   // Access login parameters can contain ephemeral state. Do not retain them.
   const location=raw&&raw.includes('cloudflareaccess.com')?'Access login (parameters omitted)':raw;
   if(r.body) await r.body.cancel();
   const failures=[];
   if(r.status!==c.status)failures.push(`status expected ${c.status}`);
   if(c.type&&!headers['content-type']?.startsWith(c.type))failures.push('content type');
   if(c.location&&location!==c.location)failures.push('canonical redirect');
   if(headers['access-control-allow-origin']!==(c.cors||null))failures.push('CORS origin');
   if(headers['access-control-allow-credentials'])failures.push('credentialed CORS');
   if((c.private||c.noStore)&&!headers['cache-control']?.includes('no-store'))failures.push('no-store');
   if(c.private&&!headers['cache-control']?.includes('private'))failures.push('private cache');
   rows.push({id:c.id,url:c.url,method:c.method||'HEAD',status:r.status,headers,location,failures});
  }catch(e){rows.push({id:c.id,url:c.url,error:e.cause?.code||e.name,failures:['request failed']});}
 }
 return {schema:1,checkedAt:new Date().toISOString(),scope:'Public HTTP metadata only; not full end-to-end acceptance',rows};
}

module.exports={cases,collect};
if(require.main===module)collect().then(result=>{result.passed=result.rows.every(r=>!r.failures.length);console.log(JSON.stringify(result,null,2));process.exitCode=result.passed?0:1;});
