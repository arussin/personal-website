
(() => {
const root=document.getElementById('adam-vista');if(!root)return;
const state={layout:'archive',surfaceOpacity:89,nameWidth:56};
// The original 3:2 art retains its exact scale and central position. Additional
// terrain is drawn outside its bounds; clipping and figures share these units.
function landscapeFrame(width,height){
 return {height,top:0,scale:height/1024};
}
const panel=root.querySelector('.va-reading'),home=root.querySelector('.va-home'),stage=root.querySelector('.va-stage');
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const siteData=globalThis.vistaContent;
const assetRoot=root.dataset.siteBase||'../';
const runtimeBase=new URL('.',document.currentScript.src);
const runtimeVersion=new URL(document.currentScript.src).search;
const productionRoutes=root.dataset.siteBase==='/';
const routeFor=view=>productionRoutes?(view==='home'?'/':'/'+view+'/'):(location.pathname+location.search+(view==='home'?'':'#'+view));
function viewFromLocation(){
 const match=location.pathname.match(/^\/(events|photography)(?:\/(?:index\.html)?|\.html)?$/);
 return match?.[1]||(!productionRoutes&&['#events','#photography'].includes(location.hash)?location.hash.slice(1):'home');
}
let current='home',allEvents=false,sheet=0,selected=-1,lastLink=null,transition=0;
const eventHost=root.querySelector('.va-event-content'),photoHost=root.querySelector('.va-photo-content');
const say=text=>{root.querySelector('.va-announcement').textContent=text;};
function renderDesign(){root.dataset.layout=state.layout;root.style.setProperty('--va-glass','rgba(32,28,43,'+(state.surfaceOpacity/100)+')');root.style.setProperty('--va-name-width',state.nameWidth+'%');root.dispatchEvent(new CustomEvent('vista-design-change'));}
renderDesign();


const source=document.createElement('template');source.innerHTML=siteData.events;
const events=[...source.content.querySelectorAll('.event-entry')].map(entry=>{
 const pick=s=>entry.querySelector(s)?.textContent.trim()||'';
 return{date:entry.dataset.date,title:pick('.event-header'),kind:pick('.event-tag').replace(/[\[\]]/g,''),place:pick('.bullet-location').replace(/^\(|\)$/g,''),venue:pick('.event-location-full'),description:pick('.event-desc'),links:[...entry.querySelectorAll('.event-link')].map(a=>({href:a.getAttribute('href'),label:a.textContent.replace(/[\[\]]/g,'').trim()}))};
}).sort((a,b)=>b.date.localeCompare(a.date));
const el=(tag,cls,text)=>{const node=document.createElement(tag);if(cls)node.className=cls;if(text!==undefined)node.textContent=text;return node;};
function renderEvents(){
 const list=root.querySelector('.va-event-list');list.replaceChildren();let group='';
 events.slice(0,allEvents?events.length:3).forEach((event,index)=>{
  const year=event.date.slice(0,4),upcoming=event.date>=new Date().toLocaleDateString('en-CA'),heading=upcoming?'Coming up':year;
  if(group!==heading){group=heading;list.append(el('h3','va-era',heading));}
  const article=el('article','va-event');article.dataset.kind=event.kind.toLowerCase().startsWith('speaking')?'speaking':event.kind.toLowerCase().startsWith('attending')?'attending':'playing';
  const date=new Date(event.date+'T12:00:00'),time=el('time','',date.toLocaleDateString('en-US',{month:'short',day:'numeric'}));time.dateTime=event.date;time.append(el('span','',year));
  const details=el('details'),summary=el('summary');details.open=true;summary.setAttribute('aria-label',event.title+', '+event.venue+', '+event.date);
  summary.append(el('span','va-kind',event.kind),el('h3','',event.title),el('div','va-venue',event.venue+' · '+event.place));
  const description=el('div','va-event-detail');description.append(el('p','',event.description));
  event.links.forEach(link=>{const a=el('a','',link.label);a.href=link.href;a.target='_blank';a.rel='noopener noreferrer';description.append(a);});
  details.append(summary,description);article.append(time,details);list.append(article);
 });
 root.querySelector('.va-earlier').textContent=allEvents?'[ fewer entries ]':'[ earlier events · '+(events.length-3)+' ]';
}
renderEvents();root.querySelector('.va-earlier').addEventListener('click',()=>{allEvents=!allEvents;renderEvents();});
function photoUrl(index,thumb){return assetRoot+siteData.photos[index].replace('assets/photos/',thumb?'assets/thumbs/':'assets/photos/');}
function renderPhotos(){
 const grid=root.querySelector('.va-photo-grid');grid.replaceChildren();
 siteData.photos.slice(sheet*6,sheet*6+6).forEach((path,j)=>{const index=sheet*6+j,button=el('button','va-photo');button.type='button';button.setAttribute('aria-label','Enlarge photograph '+(index+1));
 const img=el('img');img.src=photoUrl(index,true);img.alt='Photograph '+(index+1)+' by Adam J. Russin';img.loading='lazy';img.decoding='async';
 const label=el('span','',String(index+1).padStart(2,'0'));label.append(el('em','',path.split('/').pop().replace('.jpg','')));button.append(img,label);button.addEventListener('click',()=>focusPhoto(index));grid.append(button);});
 root.querySelector('.va-photo-pager>span').textContent=String(sheet*6+1).padStart(2,'0')+'–'+String(Math.min(sheet*6+6,siteData.photos.length)).padStart(2,'0')+' / '+siteData.photos.length;
 root.querySelector('.va-sheet-prev').disabled=sheet===0;root.querySelector('.va-sheet-next').disabled=sheet===Math.floor((siteData.photos.length-1)/6);
}
function focusPhoto(index){selected=(index+siteData.photos.length)%siteData.photos.length;root.querySelector('.va-photo-focus').hidden=false;root.querySelector('.va-photo-grid').hidden=true;root.querySelector('.va-photo-pager').hidden=true;const img=root.querySelector('.va-full-photo');img.src=photoUrl(selected,false);img.alt='Photograph '+(selected+1)+' by Adam J. Russin';root.querySelector('.va-focus-index').textContent=String(selected+1).padStart(2,'0')+' / '+siteData.photos.length;say('Photograph '+(selected+1));}
function returnSheet(){selected=-1;root.querySelector('.va-photo-focus').hidden=true;root.querySelector('.va-photo-grid').hidden=false;root.querySelector('.va-photo-pager').hidden=false;}
root.querySelector('.va-sheet-return').addEventListener('click',returnSheet);
root.querySelector('.va-photo-prev').addEventListener('click',()=>focusPhoto(selected-1));root.querySelector('.va-photo-next').addEventListener('click',()=>focusPhoto(selected+1));
root.querySelector('.va-sheet-prev').addEventListener('click',()=>{sheet--;renderPhotos();});root.querySelector('.va-sheet-next').addEventListener('click',()=>{sheet++;renderPhotos();});
renderPhotos();
let panelMotion=null,stageMotion=null,contentMotion=null;
const panelContent=root.querySelector('.va-content');
const panelEase='cubic-bezier(.22,.68,.18,1)';
function stopPanelMotion(){panelMotion?.cancel();stageMotion?.cancel();contentMotion?.cancel();panelMotion=stageMotion=contentMotion=null;}
function animateStage(from,to,duration){
 if(reduced.matches||Math.abs(from-to)<1)return null;
 return stage.animate([{height:from+'px'},{height:to+'px'}],{duration,easing:panelEase,fill:'both'});
}
function setPanelContent(view){
 eventHost.hidden=view!=='events';photoHost.hidden=view!=='photography';
 root.querySelector('.va-heading h2').textContent=view==='events'?'Events':'Photography';
 const years=events.map(event=>event.date.slice(0,4)).sort();
 root.querySelector('.va-record-count').textContent=view==='events'?events.length+' entries · '+years[0]+'–'+years.at(-1):siteData.photos.length+' photographs · contact sheet';
 root.querySelector('.va-foot-path').textContent='/ '+view;
 root.querySelectorAll('[data-view]').forEach(b=>{const active=b.dataset.view===view;if(b.closest('.va-panel-tabs')){if(active)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');}else b.setAttribute('aria-expanded',String(active));});
}
async function open(view,trigger,{instant=false}={}){
 if(view===current)return;
 const token=++transition,wasHome=current==='home',wasHidden=panel.hidden;
 const before=stage.getBoundingClientRect().height,oldPanelHeight=panel.getBoundingClientRect().height;
 const visual=wasHidden?{opacity:'0',transform:'translateY(16px)'}:getComputedStyle(panel);
 const from={opacity:visual.opacity,transform:visual.transform==='none'?'translateY(0)':visual.transform};
 stopPanelMotion();
 if(trigger?.classList.contains('va-sky-link'))lastLink=trigger;
 current=view;home.inert=true;panel.inert=false;panel.hidden=false;root.dataset.open='true';
 if(!wasHome&&!reduced.matches&&!instant){
  contentMotion=panelContent.animate([{opacity:1},{opacity:0}],{duration:110,fill:'both'});
  try{await contentMotion.finished;}catch{}if(token!==transition)return;
 }
 setPanelContent(view);
 const targetHeight=stage.getBoundingClientRect().height;
 if(!reduced.matches&&!instant){
  const duration=wasHome?610:340;
  stageMotion=animateStage(before,targetHeight,duration);
  if(wasHome){panelMotion=panel.animate([from,{opacity:1,transform:'translateY(0)'}],{duration,easing:panelEase,fill:'both'});}
  else{
   const newHeight=panel.getBoundingClientRect().height;
   panelMotion=panel.animate([{height:oldPanelHeight+'px'},{height:newHeight+'px'}],{duration,easing:panelEase,fill:'both'});
   contentMotion?.cancel();contentMotion=panelContent.animate([{opacity:0,transform:'translateY(3px)'},{opacity:1,transform:'translateY(0)'}],{duration:270,easing:panelEase,fill:'both'});
  }
  try{await panelMotion.finished;}catch{}
 }
 if(token!==transition)return;
 stopPanelMotion();if(wasHome)root.querySelector('.va-close').focus({preventScroll:true});say(view==='events'?'Events opened':'Photography opened');
}
async function close(){
 if(current==='home')return;
 const token=++transition,before=stage.getBoundingClientRect().height,visual=getComputedStyle(panel);
 const from={opacity:visual.opacity,transform:visual.transform==='none'?'translateY(0)':visual.transform};
 stopPanelMotion();current='home';panel.inert=true;root.dataset.open='false';
 if(!reduced.matches){
  stageMotion=animateStage(before,home.getBoundingClientRect().height,520);
  panelMotion=panel.animate([from,{opacity:0,transform:'translateY(12px)'}],{duration:440,easing:panelEase,fill:'both'});
  try{await Promise.all([panelMotion.finished,stageMotion?.finished]);}catch{}
 }
 if(token!==transition)return;
 panel.hidden=true;stopPanelMotion();home.inert=false;root.querySelectorAll('.va-sky-link[aria-expanded]').forEach(b=>b.setAttribute('aria-expanded','false'));lastLink?.focus({preventScroll:true});say('Home');
}
// Resizing ends the temporary height interpolation; the content reflows normally.
let panelWidth=0;
const panelResize=new ResizeObserver(entries=>{const w=entries[0].contentRect.width;if(panelWidth&&Math.abs(w-panelWidth)>.5){stageMotion?.cancel();if(panelMotion?.effect?.getKeyframes().some(k=>'height' in k))panelMotion.cancel();}panelWidth=w;});
panelResize.observe(root);window.addEventListener('pagehide',event=>{stopPanelMotion();if(!event.persisted)panelResize.disconnect();});

function updateRouteMetadata(view){
 document.title=(view==='home'?'':view==='events'?'Events · ':'Photography · ')+'Adam J. Russin';
 const canonical=document.querySelector('link[rel="canonical"]');
 if(canonical)canonical.href='https://adamrussin.com'+(view==='home'?'/':'/'+view+'/');
}
async function navigate(view,trigger,{historyMode='push',instant=false}={}){
 if(view===current)return;
 if(historyMode==='push')history.pushState({vista:view},'',routeFor(view));
 updateRouteMetadata(view);
 if(view==='home')await close();else await open(view,trigger,{instant});
 if(!instant&&productionRoutes&&typeof globalThis.gtag==='function')globalThis.gtag('event','page_view',{page_location:location.href,page_title:document.title});
}
root.querySelectorAll('[data-view]').forEach(b=>{
 if(b.tagName==='A')b.href=routeFor(b.dataset.view);
 b.addEventListener('click',event=>{
  if(event.defaultPrevented||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey||event.button>0)return;
  event.preventDefault();navigate(b.dataset.view,b);
 });
});
root.querySelector('.va-close').addEventListener('click',()=>navigate('home'));
window.addEventListener('popstate',()=>navigate(viewFromLocation(),null,{historyMode:'none'}));
root.addEventListener('keydown',event=>{if(event.key==='Escape'&&current!=='home'){event.preventDefault();if(current==='photography'&&selected>=0)returnSheet();else navigate('home');}else if(current==='photography'&&selected>=0&&['ArrowLeft','ArrowRight'].includes(event.key)){event.preventDefault();focusPhoto(selected+(event.key==='ArrowLeft'?-1:1));}});
history.replaceState({...history.state,vista:viewFromLocation()},'');
const initialView=viewFromLocation();
if(initialView!=='home')navigate(initialView,null,{historyMode:'none',instant:true});

// Existing dotted glyph sampling and architectural projection, frozen intact for this study.
const canvas=root.querySelector('.va-name'),ctx=canvas.getContext('2d');
const W=1296,H=236,UNIT=16;
const glyphs={
    A:{bits:['01110','10001','10001','11111','10001','10001','10001'],path:'M.65 6.4 2.5 .6 4.35 6.4 M1.27 4.5H3.73'},
    D:{bits:['11110','10001','10001','10001','10001','10001','11110'],path:'M.75 .6H2.45Q4.3 .6 4.3 2.35V4.65Q4.3 6.4 2.45 6.4H.75Z'},
    M:{bits:['10001','11011','10101','10101','10001','10001','10001'],path:'M.65 6.4V.6L2.5 3.6 4.35 .6V6.4'},
    J:{bits:['00111','00010','00010','00010','10010','10010','01100'],path:'M1 .6H4.3 M3.4 .6V4.95Q3.4 6.45 2 6.45 .65 6.45 .65 5.05'},
    R:{bits:['11110','10001','10001','11110','10100','10010','10001'],path:'M.75 6.4V.6H2.8Q4.25 .6 4.25 2.12 4.25 3.62 2.8 3.62H.75 M2.5 3.85L4.35 6.4'},
    U:{bits:['10001','10001','10001','10001','10001','10001','01110'],path:'M.65 .6V4.85Q.65 6.45 2.5 6.45 4.35 6.45 4.35 4.85V.6'},
    S:{bits:['01111','10000','10000','01110','00001','00001','11110'],path:'M4.18 .95Q3.55 .55 2.4 .55 .7 .55 .7 2.05 .7 3.25 2.45 3.5 4.3 3.75 4.3 4.95 4.3 6.45 2.55 6.45 1.25 6.45 .75 6.04'},
    I:{bits:['11111','00100','00100','00100','00100','00100','11111'],path:'M.7 .6H4.3 M2.5 .6V6.4 M.7 6.4H4.3'},
    N:{bits:['10001','11001','11001','10101','10011','10011','10001'],path:'M.65 6.4V.6L4.35 6.4V.6'},
    '.':{bits:['0','0','0','0','0','0','1'],path:'M.5 6.14V6.5',width:1}
  };
const layout=[['A',1],['D',7],['A',13],['M',19],['J',27],['.',33],['R',38],['U',44],['S',50],['S',56],['I',62],['N',68]].map(([letter,x])=>({letter,x:(x+1)*UNIT+40,y:26}));
const mask=document.createElement('canvas'),mc=mask.getContext('2d',{willReadFrequently:true});
if(!mc)return;
const samples={},paths={};
function collect(){const pixels=mc.getImageData(0,0,mask.width,mask.height).data,points=[];for(let y=2;y<mask.height;y+=4)for(let x=2;x<mask.width;x+=4)if(pixels[(y*mask.width+x)*4+3]>120)points.push({x,y:y*1.32});return points;}
Object.entries(glyphs).forEach(([letter,g])=>{
  mask.width=(g.width||5)*UNIT;mask.height=7*UNIT;mc.fillStyle='#000';
  g.bits.forEach((row,y)=>[...row].forEach((bit,x)=>{if(bit==='1')mc.fillRect(x*UNIT+1.25,y*UNIT+1.25,UNIT-2.5,UNIT-2.5);}));
  const low=collect();mc.clearRect(0,0,mask.width,mask.height);
  const path=new Path2D(g.path);paths[letter]=path;
  mc.save();mc.scale(UNIT,UNIT);mc.strokeStyle='#000';mc.lineWidth=.82;mc.lineCap='square';mc.lineJoin='round';mc.stroke(path);mc.restore();samples[letter]={low,high:collect().map(p=>({x:p.x,y:p.y+3.5}))};
});
const particles=[];
layout.forEach(g=>{const {low,high}=samples[g.letter],total=Math.max(low.length,high.length);for(let i=0;i<total;i++){const a=low[Math.floor(i*low.length/total)],b=high[Math.floor(i*high.length/total)],seed=(particles.length*.61803398875)%1;particles.push({lx:a.x+g.x,ly:a.y+g.y,hx:b.x+g.x,hy:b.y+g.y,bx:a.x+g.x,by:a.y+g.y,t:0,ox:0,oy:0,vx:0,vy:0,seed,dot:g.letter==='.'||g.letter==='J'});}});

const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x)),mix=(a,b,t)=>a+(b-a)*t,ease=x=>{const t=clamp(x);return t*t*(3-2*t);};
const progress=0,letterWear={intact:()=>true};particles.forEach(p=>{p.size=3.94;});
const letterScene={baseline:172,depth:8,recession:.012};
function volumeLayer(){const c=document.createElement('canvas');c.width=W;c.height=H;return c;}
const perspectiveBase=volumeLayer(),perspectiveDepth=volumeLayer(),perspectiveShadow=volumeLayer();
const mainFace=volumeLayer(),accentFace=volumeLayer(),edgeMask=volumeLayer(),shadeLayer=volumeLayer();
const perspectiveBaseContext=perspectiveBase.getContext('2d'),perspectiveDepthContext=perspectiveDepth.getContext('2d'),perspectiveShadowContext=perspectiveShadow.getContext('2d');
let maskWear=-1,perspectiveWear=-1,perspectiveProgress=-1,perspectivePalette='',perspectiveLight='',maskProgress=-1;
function resetLayer(c){const g=c.getContext('2d');g.setTransform(1,0,0,1,0,0);g.globalAlpha=1;g.globalCompositeOperation='source-over';g.filter='none';g.clearRect(0,0,W,H);return g;}
function buildStoneMask(layer,dot){
 const g=resetLayer(layer),fade=1-ease((progress-.74)/.25);g.fillStyle='#fff';g.strokeStyle='#fff';
 if(fade>.001){g.globalAlpha=fade;for(const p of particles){if(p.dot!==dot||!letterWear.intact(p))continue;const span=p.size+1.5;g.fillRect(p.bx-span/2,p.by-span/2,span,span*1.32);}g.globalAlpha=1;}
 const vector=ease((progress-.68)/.32);
 if(vector>.001){g.globalAlpha=vector;for(const letter of layout){if((letter.letter==='J'||letter.letter==='.')!==dot)continue;g.save();g.translate(letter.x,letter.y+3.5);g.scale(UNIT,UNIT*1.32);g.lineWidth=mix(.52,.82,vector);g.lineCap='square';g.lineJoin='round';g.stroke(paths[letter.letter]);g.restore();}g.globalAlpha=1;}
}
function tintLayer(layer,color){const g=layer.getContext('2d');g.save();g.globalCompositeOperation='source-in';g.fillStyle=color;g.fillRect(0,0,W,H);g.restore();}
function projectStone(layer,t){
 const k=1-letterScene.recession*t;
 return{x:W*.5*(1-k),y:letterScene.baseline*(1-k)-letterScene.depth*t,width:W*k,height:H*k};
}
function drawStoneSlice(g,mask,t){const p=projectStone(mask,t);g.drawImage(mask,p.x,p.y,p.width,p.height);}
function extrudeStone(mask,sideColor,topColor){
 // One centered vanishing point: opposite edges recede symmetrically.
 const side=resetLayer(shadeLayer);
 for(let s=8;s>=0;s--)drawStoneSlice(side,mask,s/8);
 tintLayer(shadeLayer,sideColor);perspectiveDepthContext.drawImage(shadeLayer,0,0);
 const edge=resetLayer(edgeMask);edge.drawImage(mask,0,0);edge.globalCompositeOperation='destination-out';edge.drawImage(mask,0,.85);edge.globalCompositeOperation='source-over';
 const top=resetLayer(shadeLayer);for(let s=8;s>=0;s--)drawStoneSlice(top,edgeMask,s/8);
 tintLayer(shadeLayer,topColor);perspectiveDepthContext.drawImage(shadeLayer,0,0);
}


buildStoneMask(mainFace,false);buildStoneMask(accentFace,true);
perspectiveBaseContext.drawImage(mainFace,0,0);perspectiveBaseContext.drawImage(accentFace,0,0);
// Upright, head-on dotted stone; the same light-directed ground shadow.
let lastNameLight='';
function paintNameLighting(day,altitude){
 const key=day.toFixed(3)+'/'+altitude.toFixed(3);if(key===lastNameLight)return;lastNameLight=key;
 const blend=(a,b,t)=>'#'+[1,3,5].map(i=>Math.round(mix(parseInt(a.slice(i,i+2),16),parseInt(b.slice(i,i+2),16),t)).toString(16).padStart(2,'0')).join('');
 resetLayer(perspectiveDepth);
 extrudeStone(mainFace,blend('#40304d','#71575c',day),blend('#c8c19f','#e7d8b7',day));
 extrudeStone(accentFace,blend('#744634','#88513d',day),blend('#d99b72','#cf9368',day));
 const shadow=resetLayer(perspectiveShadow),base=172,lowLight=1-Math.abs(altitude);
 const castX=mix(-.23,.24,day)*(1+.40*lowLight),castY=.12+lowLight*.19;
 shadow.save();shadow.globalAlpha=.24+day*.07;shadow.filter='blur(1.3px)';
 shadow.setTransform(1,0,-castX,-castY,base*castX,base*(1+castY)+1);shadow.drawImage(perspectiveBase,0,0);shadow.restore();
 shadow.save();shadow.globalCompositeOperation='source-in';shadow.fillStyle=blend('#302438','#6d5343',day);shadow.fillRect(0,0,W,H);shadow.restore();
 ctx.clearRect(0,0,W,H);ctx.drawImage(perspectiveShadow,0,0);ctx.drawImage(perspectiveDepth,0,0);
 const face=blend('#cdc5a5','#ecdcba',day),accent=blend('#d79971','#c4875d',day);
 for(const p of particles){ctx.fillStyle=p.dot?accent:face;ctx.fillRect(p.bx-p.size/2,p.by-p.size/2,p.size,p.size*1.32);}
}
paintNameLighting(0,-.93);

// Keep the annotated anchor at [37,30] and the established hover reveal.
// Distinct small silhouettes live inside the same footprint around each link.
const linkConstellations=[
 // GitHub: a quiet fork, with unequal arms.
 {stars:[[37,30],[24,13],[7,7],[52,5],[75,15]],edges:[[0,1],[1,2],[1,3],[3,4]]},
 // LinkedIn: a shallow, open crescent.
 {stars:[[37,30],[53,12],[79,7],[99,18]],edges:[[0,1],[1,2],[2,3]]},
 // Events: a compact, off-center kite with one trailing star.
 {stars:[[37,30],[15,16],[42,3],[66,15],[85,6]],edges:[[0,1],[1,2],[2,3],[3,0],[3,4]]},
 // Photography: a loose, broken zigzag, seen below its inverted anchor.
 {stars:[[37,30],[55,9],[73,24],[98,14],[112,31],[88,43]],edges:[[0,1],[1,2],[2,3],[3,4],[4,5]]}
];
function drawLinkConstellations(){root.querySelectorAll('.va-constellation canvas').forEach((chart,index)=>{
 const dpr=Math.min(devicePixelRatio||1,2),{stars,edges}=linkConstellations[index];
 chart.width=160*dpr;chart.height=100*dpr;
 const g=chart.getContext('2d');g.scale(dpr,dpr);g.strokeStyle='#dacebd60';g.lineWidth=.6;g.beginPath();
 for(const [a,b] of edges){g.moveTo(...stars[a]);g.lineTo(...stars[b]);}g.stroke();
 stars.forEach(([x,y],i)=>{
  if(!i)return;
  const size=i===2?2:1.35;g.fillStyle=i===2?'#e4d3b9':'#d8c8b2bb';
  g.fillRect(x-size/2,y-size/2,size,size);
 });
});}
drawLinkConstellations();



function createSkyLayout(root){
 const nav=root.querySelector('.va-sky-nav'),home=root.querySelector('.va-home'),world=root.querySelector('.va-world');
 const skyArt=document.createElement('div');skyArt.className='va-sky-art';skyArt.setAttribute('aria-hidden','true');root.querySelector('.va-stage').append(skyArt);
 const defaults=[{id:'github',x:31.16,y:16.21,direction:'se'},{id:'linkedin',x:22.83,y:27.61,direction:'sw'},{id:'events',x:70.19,y:24.93,direction:'ne'},{id:'photography',x:61.86,y:36.57,direction:'nw'}];
 const items=defaults.map(d=>{
  const link=root.querySelector('.va-'+d.id),host=link.querySelector('.va-constellation'),label=document.createElement('span');
  label.className='va-link-label';label.textContent=[...link.childNodes].filter(n=>n.nodeType===3).map(n=>n.textContent).join('').trim();
  [...link.childNodes].filter(n=>n.nodeType===3).forEach(n=>n.remove());link.append(label);
  skyArt.append(host);
  for(const event of ['pointerenter','pointerleave','focus','blur'])link.addEventListener(event,()=>{host.dataset.active=String(link.matches(':hover,:focus-visible'));});
  return {...d,link,host,label,line:host.querySelector('i'),canvas:host.querySelector('canvas'),actualY:d.y/100};
 });
 const tools=document.createElement('div');tools.className='va-layout-tools';tools.setAttribute('aria-label','Sky arrangement');
 const button=(text,cls)=>{const b=document.createElement('button');b.type='button';b.textContent=text;b.className=cls;tools.append(b);return b;};
 const toggle=button('Arrange sky','va-arrange');toggle.setAttribute('aria-pressed','false');
 const direction=document.createElement('select');direction.setAttribute('aria-label','Star position for the selected link');
 for(const [value,label] of [['nw','Upper left'],['ne','Upper right'],['sw','Lower left'],['se','Lower right']]){const o=document.createElement('option');o.value=value;o.textContent=label;direction.append(o);}tools.append(direction);
 const reset=button('Reset','va-layout-reset');root.querySelector('.va-identity').append(tools);
 let editing=false,selected=items[0],drag=null,frame=0,time=0,daylight=0,disposed=false,skyline=null,getCamera=()=>.5;
 const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
 const announce=text=>{root.querySelector('.va-announcement').textContent=text;};
 function select(item){selected=item;direction.value=item.direction;items.forEach(i=>i.link.dataset.selected=String(editing&&i===item));}
 function edit(value){editing=value;root.dataset.arranging=String(editing);toggle.textContent=editing?'Done':'Arrange sky';toggle.setAttribute('aria-pressed',String(editing));direction.hidden=reset.hidden=!editing;select(selected);announce(editing?'Drag a word to move it. Arrow keys make small adjustments.':'Sky arrangement finished.');}
 toggle.addEventListener('click',()=>edit(!editing));
 function geometry(){
  frame=0;if(disposed)return;
  const wr=world.getBoundingClientRect(),nr=nav.getBoundingClientRect();
  for(const item of items){
   const half=item.link.offsetWidth/2;
   item.minX=Math.max(4,(half+10-(nr.left-wr.left))/nr.width*100);
   item.maxX=Math.min(96,(wr.width-half-10-(nr.left-wr.left))/nr.width*100);
   item.link.style.left=clamp(item.x,item.minX,item.maxX)+'%';item.link.style.top=item.y+'%';
  }
  // Preserve authored coordinates; only resolve overlapping touch targets when
  // the scene is narrow. Reset and returning to desktop recover the exact layout.
  if(wr.width<=460){
   const fitted=items.map(item=>({item,x:parseFloat(item.link.style.left)/100*nr.width,y:item.y/100*nr.height,w:item.link.offsetWidth,h:item.link.offsetHeight}));
   for(let pass=0;pass<2;pass++){
    fitted.sort((a,b)=>a.x-b.x);
    for(let a=0;a<fitted.length;a++)for(let b=a+1;b<fitted.length;b++){
     const left=fitted[a],right=fitted[b];
     if(left.y+left.h<=right.y||right.y+right.h<=left.y)continue;
     const overlap=(left.w+right.w)/2+8-(right.x-left.x);if(overlap<=0)continue;
     left.x=clamp(left.x-overlap/2,left.item.minX/100*nr.width,left.item.maxX/100*nr.width);
     right.x=clamp(right.x+overlap/2,right.item.minX/100*nr.width,right.item.maxX/100*nr.width);
    }
   }
   fitted.forEach(({item,x})=>item.link.style.left=x/nr.width*100+'%');
  }
  for(const item of items){
   const r=item.link.getBoundingClientRect(),left=item.direction.endsWith('w'),up=item.direction.startsWith('n');
   const rawX=left?-20:r.width+20,rawY=up?-15:r.height+13;
   const sx=clamp(rawX,14-(r.left-wr.left),wr.width-14-(r.left-wr.left));
   let sy=rawY;
   if(skyline){
    const terrain=landscapeFrame(wr.width,wr.height);
    const u=(r.left-wr.left+sx-wr.width/2)/(terrain.height*1.5)+getCamera();
    const ridge=typeof skyline==='function'?skyline(u):skyline[clamp(Math.round(u*(skyline.length-1)),0,skyline.length-1)]/1024;
    const ceiling=terrain.top+ridge*terrain.height-22-(r.top-wr.top);sy=Math.min(rawY,ceiling);
   }
   item.hostX=sx-37;item.hostY=sy-30;item.endX=(left?4:r.width-4)-item.hostX;item.endY=(up?9:r.height-9)-item.hostY;
   item.host.style.left=(r.left-wr.left+item.hostX).toFixed(2)+'px';item.host.style.top=(r.top-wr.top+item.hostY).toFixed(2)+'px';
   item.canvas.style.transform='scale('+(left?1:-1)+','+(up?1:-1)+')';
   item.actualY=(r.top-wr.top+r.height/2)/wr.height;
   item.cloud=item.host.querySelector('.va-link-cloud');
  }
  animate(time,daylight);root.dispatchEvent(new CustomEvent('vista-design-change'));
 }
 function scheduleGeometry(){if(!frame&&!disposed)frame=requestAnimationFrame(geometry);}
 function render(){scheduleGeometry();}
 function animate(t,blend){
  time=t;daylight=blend;
  items.forEach((item,index)=>{
   if(item.endX===undefined)return;
   const dx=Math.sin(t*.085+index*1.8)*4.2,dy=Math.cos(t*.053+index*1.2)*1.1;
   // The alpha-weighted center of the 240×57 cloud asset is at (116.28,29.99).
   // Place that visible center at the annotated star, not the image box center.
   if(item.cloud)item.cloud.style.transform='translate('+dx.toFixed(2)+'px,'+dy.toFixed(2)+'px)';
   const x=37+dx*blend,y=30+(dy+(item.direction.startsWith('n')?2.7:-2.7))*blend;
   const ex=item.endX-x,ey=item.endY-y;
   item.line.style.left=x.toFixed(2)+'px';item.line.style.top=y.toFixed(2)+'px';item.line.style.width=Math.hypot(ex,ey).toFixed(2)+'px';item.line.style.transform='rotate('+Math.atan2(ey,ex)+'rad)';
  });
 }
 for(const item of items){
  item.link.addEventListener('click',event=>{if(!editing)return;event.preventDefault();event.stopImmediatePropagation();select(item);},true);
  item.link.addEventListener('pointerdown',event=>{
   if(!editing||event.button!==0)return;event.preventDefault();select(item);item.link.focus({preventScroll:true});
   const r=nav.getBoundingClientRect();drag={item,id:event.pointerId,x:event.clientX,y:event.clientY,startX:parseFloat(item.link.style.left),startY:item.y,width:r.width,height:r.height};item.link.setPointerCapture(event.pointerId);
  });
  item.link.addEventListener('pointermove',event=>{
   if(!drag||drag.item!==item||drag.id!==event.pointerId)return;
   item.x=clamp(drag.startX+(event.clientX-drag.x)/drag.width*100,item.minX,item.maxX);item.y=clamp(drag.startY+(event.clientY-drag.y)/drag.height*100,12,46);render();
  });
  const release=event=>{if(!drag||event.pointerId!==drag.id)return;drag=null;if(item.link.hasPointerCapture(event.pointerId))item.link.releasePointerCapture(event.pointerId);};
  item.link.addEventListener('pointerup',release);item.link.addEventListener('pointercancel',release);
  item.link.addEventListener('keydown',event=>{
   if(!editing)return;if(event.key==='Escape'){event.preventDefault();edit(false);toggle.focus();return;}
   const delta={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[event.key];if(!delta)return;
   event.preventDefault();select(item);const step=event.shiftKey?2:.35;item.x=clamp(item.x+delta[0]*step,item.minX,item.maxX);item.y=clamp(item.y+delta[1]*step,12,46);render();
  });
 }
 direction.addEventListener('change',()=>{selected.direction=direction.value;scheduleGeometry();});
 reset.addEventListener('click',()=>{items.forEach((item,index)=>Object.assign(item,defaults[index]));select(items[0]);render();});
 const observer=new ResizeObserver(scheduleGeometry);observer.observe(nav);items.forEach(i=>observer.observe(i.link));
 window.addEventListener('pagehide',event=>{cancelAnimationFrame(frame);frame=0;if(!event.persisted){disposed=true;observer.disconnect();}});
 window.addEventListener('pageshow',()=>{if(!disposed)scheduleGeometry();});
 edit(false);render();
 return {items,animate,refresh:scheduleGeometry,setTerrain:(edge,camera)=>{skyline=edge;getCamera=camera;scheduleGeometry();}};
}
const skyLayout=createSkyLayout(root);

function createLivingVista({root,onLight,getSurfaceOpacity}){
 const assets={"land": "assets/03cd3fed69d7.webp", "moon": "assets/66a91181c39d.png", "air": "assets/0c083a60182e.webp", "cloud": "assets/6f7913482299.png", "plane": "assets/cf4422e0bd45.png", "skyline": [506, 506, 506, 506, 506, 506, 505, 503, 503, 503, 503, 503, 501, 501, 501, 501, 501, 501, 501, 498, 497, 497, 497, 497, 497, 496, 495, 495, 494, 494, 493, 491, 491, 491, 491, 491, 491, 491, 491, 491, 491, 492, 492, 494, 494, 494, 494, 495, 496, 496, 496, 496, 496, 497, 498, 498, 498, 498, 499, 500, 500, 501, 501, 501, 503, 503, 503, 503, 502, 500, 500, 500, 500, 498, 498, 497, 495, 495, 493, 493, 492, 491, 491, 491, 491, 490, 490, 488, 488, 486, 486, 485, 484, 482, 480, 480, 480, 477, 477, 475, 475, 475, 475, 475, 475, 475, 475, 475, 475, 475, 475, 475, 476, 476, 477, 477, 476, 475, 475, 474, 473, 473, 472, 472, 471, 470, 469, 469, 468, 467, 467, 465, 464, 463, 462, 462, 460, 459, 459, 458, 458, 456, 456, 456, 454, 454, 453, 453, 452, 451, 451, 449, 449, 448, 448, 447, 446, 444, 444, 444, 442, 442, 442, 440, 440, 440, 441, 441, 441, 440, 440, 440, 441, 442, 442, 444, 444, 445, 447, 447, 449, 449, 451, 451, 453, 453, 455, 456, 456, 456, 458, 459, 461, 462, 464, 464, 464, 468, 468, 468, 469, 470, 470, 471, 471, 473, 473, 475, 475, 477, 477, 479, 479, 480, 482, 484, 484, 485, 488, 488, 488, 488, 488, 488, 488, 488, 488, 487, 487, 487, 486, 486, 486, 486, 486, 488, 489, 490, 490, 490, 491, 492, 495, 495, 497, 498, 499, 500, 501, 502, 503, 505, 506, 506, 508, 509, 511, 512, 513, 514, 516, 516, 518, 518, 520, 520, 521, 521, 522, 522, 522, 522, 522, 522, 522, 522, 522, 522, 522, 522, 522, 522, 521, 521, 521, 520, 520, 520, 520, 519, 518, 518, 517, 517, 517, 517, 516, 516, 516, 516, 516, 516, 515, 515, 515, 514, 514, 513, 513, 513, 513, 513, 513, 512, 510, 510, 510, 510, 510, 508, 508, 508, 507, 506, 506, 505, 505, 505, 505, 503, 503, 503, 503, 503, 503, 503, 503, 503, 503, 503, 504, 505, 505, 505, 506, 506, 506, 507, 508, 508, 509, 509, 510, 510, 511, 511, 511, 512, 512, 513, 515, 515, 515, 517, 518, 518, 518, 518, 518, 518, 518, 518, 518, 518, 518, 518, 520, 520, 520, 521, 521, 522, 523, 524, 524, 525, 525, 526, 527, 527, 528, 528, 530, 530, 530, 530, 532, 532, 532, 532, 532, 532, 532, 532, 532, 532, 532, 532, 530, 530, 530, 530, 530, 530, 530, 529, 529, 526, 526, 526, 526, 526, 526, 526, 525, 523, 523, 523, 523, 523, 523, 523, 522, 522, 521, 521, 521, 521, 521, 521, 521, 521, 520, 520, 520, 521, 522, 522, 523, 524, 524, 524, 526, 526, 526, 526, 526, 526, 527, 529, 529, 530, 530, 530, 530, 532, 532, 532, 532, 532, 534, 534, 535, 535, 535, 535, 535, 535, 535, 535, 537, 537, 537, 537, 537, 537, 537, 537, 537, 534, 534, 534, 534, 534, 534, 534, 534, 534, 534, 534, 534, 534, 534, 535, 535, 536, 537, 537, 537, 538, 539, 539, 539, 539, 539, 540, 541, 541, 542, 543, 543, 543, 543, 543, 543, 544, 545, 546, 547, 547, 547, 547, 547, 547, 548, 550, 550, 550, 550, 550, 550, 550, 550, 550, 550, 550, 550, 550, 552, 552, 552, 552, 552, 551, 551, 550, 550, 550, 549, 548, 548, 547, 547, 546, 546, 546, 545, 544, 544, 543, 543, 543, 543, 543, 543, 545, 545, 545, 546, 547, 547, 547, 547, 549, 549, 549, 549, 549, 550, 550, 551, 551, 551, 551, 552, 552, 552, 552, 552, 552, 553, 553, 552, 552, 552, 550, 550, 550, 550, 550, 550, 550, 550, 550, 550, 550, 548, 547, 547, 547, 547, 547, 546, 545, 545, 544, 544, 544, 544, 544, 544, 544, 544, 543, 543, 543, 543, 543, 543, 542, 540, 539, 538, 538, 538, 538, 538, 538, 538, 538, 538, 537, 537, 537, 537, 535, 535, 535, 535, 535, 533, 533, 533, 533, 533, 533, 533, 533, 533, 533, 532, 532, 532, 533, 533, 533, 534, 535, 535, 536, 536, 537, 538, 538, 538, 538, 538, 538, 540, 540, 540, 540, 540, 541, 542, 542, 542, 542, 544, 544, 544, 545, 547, 547, 549, 549, 549, 549, 549, 549, 550, 550, 550, 551, 552, 552, 552, 552, 552, 552, 553, 553, 554, 554, 555, 555, 556, 557, 557, 557, 557, 559, 559, 559, 559, 559, 560, 560, 560, 561, 562, 562, 562, 562, 563, 563, 563, 563, 565, 565, 565, 565, 565, 565, 564, 563, 562, 562, 562, 562, 562, 562, 562, 562, 562, 562, 562, 562, 563, 563, 564, 565, 565, 566, 566, 566, 566, 568, 568, 568, 569, 569, 570, 571, 571, 571, 571, 571, 571, 571, 571, 571, 573, 575, 575, 575, 575, 575, 575, 575, 577, 578, 578, 578, 578, 578, 577, 578, 577, 577, 576, 576, 576, 576, 576, 576, 576, 576, 576, 576, 575, 575, 575, 575, 575, 575, 575, 574, 574, 574, 574, 571, 571, 571, 571, 571, 571, 571, 571, 571, 571, 571, 571, 570, 569, 569, 569, 569, 569, 568, 567, 567, 567, 567, 567, 567, 567, 567, 567, 567, 567, 566, 565, 565, 564, 563, 563, 563, 563, 563, 562, 560, 560, 560, 560, 560, 558, 558, 558, 558, 558, 558, 558, 558, 558, 558, 558, 558, 560, 560, 560, 560, 560, 560, 560, 560, 561, 563, 563, 563, 563, 563, 563, 563, 563, 563, 563, 563, 563, 566, 566, 566, 566, 566, 566, 566, 566, 566, 566, 565, 564, 563, 563, 563, 563, 563, 563, 562, 562, 562, 562, 561, 560, 560, 560, 560, 560, 560, 560, 560, 560, 558, 558, 556, 555, 555, 555, 555, 555, 555, 555, 554, 553, 553, 553, 552, 551, 550, 550, 550, 550, 550, 550, 550, 550, 548, 547, 547, 547, 546, 545, 544, 543, 543, 543, 542, 542, 541, 540, 539, 538, 538, 537, 537, 537, 537, 535, 535, 535, 534, 532, 532, 533, 533, 533, 533, 532, 532, 532, 532, 534, 534, 535, 535, 535, 535, 535, 535, 535, 535, 535, 537, 537, 537, 537, 535, 535, 535, 535, 535, 533, 532, 532, 532, 532, 532, 532, 532, 532, 530, 529, 529, 529, 529, 527, 527, 527, 527, 527, 525, 525, 525, 524, 523, 523, 521, 521, 521, 521, 521, 521, 521, 521, 522, 522, 523, 523, 524, 525, 525, 525, 525, 526, 526, 526, 528, 529, 529, 529, 529, 530, 531, 532, 532, 532, 532, 533, 533, 534, 534, 535, 535, 535, 535, 535, 537, 537, 537, 537, 537, 539, 540, 540, 540, 541, 542, 542, 542, 542, 542, 542, 541, 541, 540, 539, 539, 539, 539, 537, 537, 537, 537, 537, 537, 537, 537, 537, 537, 537, 537, 537, 539, 539, 539, 540, 540, 540, 541, 542, 542, 543, 543, 543, 543, 544, 544, 544, 546, 546, 546, 546, 546, 546, 546, 546, 546, 546, 546, 546, 548, 548, 548, 549, 550, 550, 550, 550, 550, 550, 550, 550, 550, 550, 550, 550, 550, 551, 552, 552, 552, 552, 552, 552, 552, 552, 552, 553, 553, 553, 553, 553, 553, 553, 550, 550, 550, 550, 550, 550, 550, 549, 547, 547, 547, 547, 547, 547, 547, 544, 544, 544, 543, 542, 542, 541, 540, 540, 540, 540, 539, 538, 538, 538, 537, 537, 535, 535, 535, 535, 535, 534, 533, 532, 529, 529, 529, 527, 527, 527, 526, 526, 523, 523, 521, 521, 520, 520, 520, 520, 520, 520, 520, 518, 518, 518, 516, 516, 514, 514, 514, 514, 512, 511, 511, 511, 511, 510, 509, 507, 507, 504, 504, 504, 504, 503, 502, 502, 502, 502, 502, 502, 502, 502, 502, 502, 503, 504, 505, 505, 505, 506, 507, 507, 507, 508, 508, 508, 508, 509, 509, 509, 510, 511, 511, 512, 512, 513, 513, 513, 514, 515, 515, 515, 516, 516, 516, 516, 516, 518, 518, 518, 519, 520, 520, 520, 520, 520, 521, 521, 520, 520, 520, 519, 519, 519, 518, 518, 516, 516, 515, 514, 513, 511, 511, 510, 509, 508, 507, 506, 506, 506, 504, 504, 504, 502, 500, 500, 498, 498, 497, 496, 493, 493, 493, 493, 494, 494, 494, 494, 494, 494, 494, 494, 495, 495, 495, 495, 495, 495, 495, 495, 495, 496, 496, 496, 496, 496, 496, 496, 496, 497, 497, 497, 497, 497, 497, 497, 497, 497, 499, 500, 500, 502, 502, 502, 502, 502, 502, 502, 502, 502, 502, 503, 504, 505, 505, 506, 508, 508, 509, 509, 511, 511, 511, 511, 510, 510, 509, 509, 508, 508, 506, 506, 506, 505, 505, 504, 504, 503, 503, 503, 503, 503, 500, 500, 500, 500, 500, 500, 500, 498, 498, 497, 497, 498, 498, 497, 496, 496, 495, 495, 494, 494, 494, 492, 492, 491, 490, 490, 489, 488, 488, 487, 487, 487, 487, 487, 487, 488, 488, 489, 489, 490, 490, 491, 491, 492, 492, 492, 492, 494, 494, 494, 494, 494, 495, 497, 497, 497, 497, 498, 498, 499, 500, 501, 502, 502, 502, 502, 502, 502, 502, 502, 504, 504, 505, 505, 505, 505, 506, 506, 506, 508, 508, 509, 509, 509, 509, 509, 509, 509, 511, 511, 511, 512, 512, 512, 513, 514, 514, 515, 515, 515, 515, 514, 514]};
 const world=root.querySelector('.va-world'),surface=root.querySelector('.va-world-light'),fx=root.querySelector('.va-world-accents');
 const moonSurface=root.querySelector('.va-moon-layer'),moonContext=moonSurface.getContext('2d');
 const clockCanvas=root.querySelector('.va-time-compass canvas'),clockContext=clockCanvas.getContext('2d'),clockInput=root.querySelector('.va-time-input');
 const output=root.querySelector('.va-time-value'),pause=root.querySelector('.va-time-pause'),speedSelect=root.querySelector('.va-time-speed');
 const motionPreference=matchMedia('(prefers-reduced-motion: reduce)');
 let paused=motionPreference.matches,phase=.06,speed=1,throwVelocity=0,drag=null,frame=0,lastTime=0,lastPaint=0,lastUI=-1,elapsed=0,visible=true,disposed=false,ready=false,program=null;
 let rotorTarget=phase,rotorVelocity=0,suspended=false,initialization=0,assetLoad=null,resizeFrame=0,densityQuery=null,maxDrawSize=4096;
 let width=1024,height=700,ratio=1,cameraX=.5,gl=null,fxContext=fx.getContext('2d'),lastTheme='',lastClock='',skyClip=null,lastAccentPaint=0;
 const abort=new AbortController(),observers=[],gpuTextures=[];
 const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x)),wrap=x=>((x%1)+1)%1;
 const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t);};
 const mix=(a,b,t)=>a+(b-a)*t;
 const color=(a,b,t)=>a.map((v,i)=>Math.round(mix(v,b[i],t)));
 const rgb=c=>'rgb('+c.join(',')+')';
 const on=(node,type,fn,options={})=>node.addEventListener(type,fn,{...options,signal:abort.signal});
 let seed=947312;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 const stars=Array.from({length:84},(_,i)=>({x:.028+random()*.944,y:.025+random()*.39,base:.14+random()*.42,phase:random()*Math.PI*2,rate:.22+random()*.55,size:i%19===0?2:1,kind:i%17===0?'diamond':i%11===0?'cross':'point'}));
 let meteor=null,flock=null,plane=null,nextMeteor=13+random()*7,nextBird=9+random()*5,nextPlane=26+random()*10;
 // Keep this small ground visitor on its own schedule and off the lettering.
 let lizard=null,nextLizard=20+Math.random()*16;
 // Sparse, separate grains stay registered to the ground on desktop and phone.
 // A separate deterministic sequence leaves the existing celestial timings intact.
 const sand=Array.from({length:16},(_,i)=>({x:i<8?320+(i*67)%255:1214+((i-8)*39)%126,y:886+(i*23)%60,period:9.5+(i*1.71)%6,offset:(i*.173)%1,distance:35+(i*17)%35,lift:2+(i*7)%4,size:i%5===0?1.15:.8}));
 const images={},skyLinks=[...root.querySelectorAll('.va-sky-link')];let daylightInk=false,readingDaylightInk=null;
 let panorama=null;
 function registrationAt(side,y){
  const points=side.registration;let k=0;while(k<points.length-2&&y>points[k+1][0])k++;
  const a=points[k],b=points[k+1],t=clamp((y-a[0])/(b[0]-a[0]));
  return a.slice(1).map((value,i)=>value+(b[i+1]-value)*t);
 }
 function terrainEdge(u){
  if(u>=0&&u<=1||!panorama)return assets.skyline[Math.round(clamp(u)*(assets.skyline.length-1))]/1024;
  const left=u<0,side=panorama[left?'left':'right'],distance=left?-u:u-1,t=left?1+u/side.span:(u-1)/side.span,weight=1-smooth(0,.36,distance);
  let y=.5;for(let i=0;i<3;i++){const offset=registrationAt(side,y*1024),x=t+offset[0]*weight/(side.span*1536);y=side.ridge[Math.round(clamp(x)*(side.ridge.length-1))]/1024-offset[1]*weight/1024;}
  return y;
 }
 skyLayout.setTerrain(terrainEdge,()=>cameraX);
 function image(src){return new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=reject;i.src=new URL(src+runtimeVersion,runtimeBase).href;});}
 const cloudNodes=[...root.querySelectorAll('.va-constellation')].map(host=>{const img=document.createElement('img');img.className='va-link-cloud';img.alt='';img.src=new URL(assets.cloud,runtimeBase).href;host.append(img);return img;});
 skyLayout.refresh();
 const uniforms={};
 function shader(type,source){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){const message=gl.getShaderInfoLog(s);gl.deleteShader(s);throw new Error(message);}return s;}
 function texture(unit,uniform,source,textureWidth=assets.skyline.length,textureHeight=1){
  const t=gl.createTexture();gpuTextures.push(t);gl.activeTexture(gl.TEXTURE0+unit);gl.bindTexture(gl.TEXTURE_2D,t);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,false);
  if(source instanceof Uint8Array){gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,textureWidth,textureHeight,0,gl.RGBA,gl.UNSIGNED_BYTE,source);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);}
  else gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,source);
  if(uniform==='u_land')gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);
  gl.uniform1i(gl.getUniformLocation(program,uniform),unit);
 }
 async function initialize(){
  const attempt=++initialization;
  try{
   gl=surface.getContext('webgl',{alpha:false,antialias:false,depth:false,stencil:false,preserveDrawingBuffer:false,powerPreference:'low-power'});
   if(!gl)throw new Error('WebGL unavailable');
   if(gl.isContextLost())return;
   // A monitor/GPU switch can interrupt setup, including an earlier recovery.
   // Keep decoded artwork and let only the current, live context finish setup.
   assetLoad??=Promise.all([image(assets.land),image(assets.moon),image(assets.air),image(assets.plane),fetch(new URL('sky.frag'+runtimeVersion,runtimeBase)).then(r=>{if(!r.ok)throw new Error('Sky shader could not load');return r.text();}),image('assets/panorama-left-v1.webp'),image('assets/panorama-right-v1.webp'),fetch(new URL('assets/panorama-edges-v1.json'+runtimeVersion,runtimeBase)).then(r=>{if(!r.ok)throw new Error('Panorama edges could not load');return r.json();})]).catch(error=>{assetLoad=null;throw error;});
   const loaded=await assetLoad;if(disposed||attempt!==initialization||gl.isContextLost())return;
   maxDrawSize=Math.min(gl.getParameter(gl.MAX_RENDERBUFFER_SIZE),...gl.getParameter(gl.MAX_VIEWPORT_DIMS));
   [images.land,images.moon,images.air,images.plane]=loaded;
   panorama=loaded[7];panorama.left.offset=(assets.skyline[0]-panorama.left.ridge.at(-1))/1024;panorama.right.offset=(assets.skyline.at(-1)-panorama.right.ridge[0])/1024;skyClip=null;
   const vertex=shader(gl.VERTEX_SHADER,'attribute vec2 a_position;void main(){gl_Position=vec4(a_position,0.0,1.0);}');
   const fragment=shader(gl.FRAGMENT_SHADER,loaded[4]);
   program=gl.createProgram();gl.attachShader(program,vertex);gl.attachShader(program,fragment);gl.linkProgram(program);gl.deleteShader(vertex);gl.deleteShader(fragment);
   if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program));
   gl.useProgram(program);const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
   const location=gl.getAttribLocation(program,'a_position');gl.enableVertexAttribArray(location);gl.vertexAttribPointer(location,2,gl.FLOAT,false,0,0);
   const edge=new Uint8Array(assets.skyline.length*4);assets.skyline.forEach((y,i)=>{edge[i*4]=Math.floor(y/256);edge[i*4+1]=y%256;edge[i*4+3]=255;});
   texture(0,'u_land',images.land);texture(1,'u_air',images.air);texture(2,'u_edge',edge);
   texture(3,'u_left_land',loaded[5]);texture(4,'u_right_land',loaded[6]);
   const sideEdge=new Uint8Array(1536*2*4);
   for(const [row,side] of [panorama.left,panorama.right].entries())for(let x=0;x<1536;x++){
    const y=side.ridge[Math.round(x/1535*(side.ridge.length-1))],i=(row*1536+x)*4;sideEdge[i]=Math.floor(y/256);sideEdge[i+1]=y%256;sideEdge[i+3]=255;
   }
   texture(5,'u_side_edge',sideEdge,1536,2);
   const registration=new Uint8Array(1024*6*4);
   for(const [row,side] of [panorama.left,panorama.right].entries())for(let y=0;y<1024;y++){
    const offsets=registrationAt(side,y);
    for(let axis=0;axis<2;axis++){const value=Math.round((offsets[axis]+128)*64),i=(row*1024+y)*4+axis*2;registration[i]=value>>8;registration[i+1]=value&255;}
    for(let channel=0;channel<3;channel++){
     const gain=offsets[2+channel],bias=offsets[5+channel];
     registration[((row+2)*1024+y)*4+channel]=Math.round(gain/2*255);
     registration[((row+4)*1024+y)*4+channel]=Math.round((bias/.5+.5)*255);
    }
   }
   texture(6,'u_registration',registration,1024,6);
   gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
   const correction=panorama.edgeCorrection;
   const runs=Uint8Array.from(atob(correction.data),c=>c.charCodeAt(0)),field=new Uint8Array(correction.width*correction.height*4);let run=0;
   for(let y=0;y<correction.height;y++)for(let channel=0;channel<3;channel++){
    let x=0;while(x<correction.width){const count=runs[run++],value=runs[run++];if(!count||x+count>correction.width)throw new Error('Invalid panorama calibration');for(let end=x+count;x<end;x++){const i=(y*correction.width+x)*4;field[i+channel]=value;field[i+3]=255;}}
   }
   texture(7,'u_edge_correction',field,correction.width,correction.height);
   gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
   gl.uniform4f(gl.getUniformLocation(program,'u_extensions'),panorama.left.span,panorama.right.span,panorama.left.offset,panorama.right.offset);
   for(const key of ['u_size','u_phase','u_time','u_day','u_cameraX'])uniforms[key]=gl.getUniformLocation(program,key);
   if(disposed||attempt!==initialization||gl.isContextLost())return;
   ready=true;delete root.dataset.skyError;clockInput.disabled=speedSelect.disabled=pause.disabled=false;output.removeAttribute('aria-label');lastClock='';
   resize();root.dataset.skyReady='true';wake();
  }catch(error){
   if(disposed||attempt!==initialization||gl?.isContextLost())return;
   ready=false;stopLoop();root.dataset.skyReady='false';root.dataset.skyError=String(error.message||error);output.textContent='night';output.setAttribute('aria-label','Static night scene; animated sky unavailable in this browser');clockInput.disabled=true;speedSelect.disabled=true;pause.disabled=true;console.warn('Vista renderer unavailable:',error);
  }
 }
 // Keep the same central valley at every width; narrower views crop both sides
 // equally instead of traveling toward the foreground cactus.
 function dimensions(){const bounds=world.getBoundingClientRect();width=Math.max(1,bounds.width);height=Math.max(1,bounds.height);ratio=Math.min(devicePixelRatio||1,2,Math.sqrt(5000000/(width*height)),maxDrawSize/width,maxDrawSize/height);cameraX=.5;root.style.setProperty('--va-camera-shift','0px');}
 function resize(){
  if(disposed)return;
  const oldWidth=width,oldHeight=height;dimensions();
  const changed=Math.abs(width-oldWidth)>.01||Math.abs(height-oldHeight)>.01;
  if(drag&&changed)cancelDrag();
  const pixelWidth=Math.max(1,Math.round(width*ratio)),pixelHeight=Math.max(1,Math.round(height*ratio));
  // Setting either dimension clears a canvas and reallocates its backing store.
  // Coalesce resize notifications and leave unchanged buffers alone.
  for(const canvas of [surface,fx,moonSurface]){
   if(canvas.width!==pixelWidth)canvas.width=pixelWidth;
   if(canvas.height!==pixelHeight)canvas.height=pixelHeight;
  }
  if(changed||!skyClip){
   skyClip=new Path2D();skyClip.moveTo(-height*2,-100);skyClip.lineTo(width+height*2,-100);
   const terrain=landscapeFrame(width,height);
   for(let x=width+2;x>=-2;x-=2)skyClip.lineTo(x,terrain.top+terrainEdge((x-width/2)/(terrain.height*1.5)+cameraX)*terrain.height);
   skyClip.closePath();
  }
  if(gl&&!gl.isContextLost())gl.viewport(0,0,surface.width,surface.height);
  if(ready){paint(true);wake();}
 }
 function scheduleResize(){if(!resizeFrame&&!disposed)resizeFrame=requestAnimationFrame(()=>{resizeFrame=0;resize();});}
 function watchDensity(){
  densityQuery?.removeEventListener('change',densityChanged);
  densityQuery=matchMedia('(resolution: '+(devicePixelRatio||1)+'dppx)');
  densityQuery.addEventListener('change',densityChanged);
 }
 function densityChanged(){watchDensity();drawLinkConstellations();scheduleResize();}
 function luminance(c){return c.map(v=>{v/=255;return v<=.04045?v/12.92:Math.pow((v+.055)/1.055,2.4);}).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);}
 function contrast(a,b){const x=luminance(a),y=luminance(b);return(Math.max(x,y)+.05)/(Math.min(x,y)+.05);}
 // Keep a stable polarity around twilight; the shared CSS palette eases its
 // handover. Solve contrast continuously instead of jumping in ten-percent steps.
 function legible(bg,light,dark){
  const base=readingDaylightInk?dark:light,end=readingDaylightInk?[0,0,0]:[255,255,255];
  if(contrast(base,bg)>=4.6)return base;
  let low=0,high=1;
  for(let i=0;i<12;i++){const mid=(low+high)/2;if(contrast(color(base,end,mid),bg)<4.6)low=mid;else high=mid;}
  return color(base,end,high);
 }
 function skyColor(y,day,altitude){
  const t=Math.pow(smooth(.02,.59,y),2.1),d=Math.pow(smooth(.02,.59,y),2.6);
  const night=color([44.37,38.505,53.04],[103.275,83.895,109.395],t),sun=color([136.425,178.245,206.295],[247.35,220.065,179.52],d);
  const twilight=Math.exp(-Math.pow(altitude/.20,2))*(1-smooth(.35,.65,day));
  const glow=Math.exp(-Math.pow((y-.54)/.125,2))*twilight*.8;
  return color(night,sun,day).map((v,i)=>clamp(v+[.22,.088,.028][i]*255*glow,0,255));
 }
 function theme(day,altitude,force){
  const key=day.toFixed(3)+'/'+altitude.toFixed(3)+'/'+getSurfaceOpacity();if(key===lastTheme&&!force){onLight(day,altitude);return;}lastTheme=key;
  const glass=color([32,28,43],[239,222,188],day),ground=color([109,88,108],[200,169,130],day),alpha=getSurfaceOpacity()/100;
  const readingBg=color(skyColor(.46,day,altitude),glass,alpha);
  const readingLight=luminance(readingBg);
  if(readingDaylightInk===null)readingDaylightInk=readingLight>.179;
  else if(readingLight>.195)readingDaylightInk=true;else if(readingLight<.165)readingDaylightInk=false;
  const ink=legible(readingBg,[231,229,199],[57,51,60]),soft=legible(readingBg,[192,180,191],[99,84,86]),accent=legible(readingBg,[221,153,125],[158,85,56]);
  // One coordinated, eased handover. Hold a readable endpoint instead of leaving
  // labels at the sky's own midtone when time is stopped during twilight.
  // Hysteresis keeps a gently thrown ruler from repeatedly reversing the change.
  if(day>.58)daylightInk=true;else if(day<.46)daylightInk=false;
  const skyInk=daylightInk?color([79,87,75],[66,82,78],day):color([232,222,197],[227,217,193],day);
  const skyHover=daylightInk?color([98,100,72],[85,94,68],day):color([246,229,195],[244,229,199],day);
  const groundInk=daylightInk?color([106,89,66],[91,77,58],day):color([222,208,189],[232,216,192],day);
  const dockInk=daylightInk?[82,88,73]:[215,199,178];
  const night=1-smooth(.03,.45,day);
  root.style.setProperty('--va-ink',rgb(ink));root.style.setProperty('--va-soft',rgb(soft));root.style.setProperty('--va-accent',rgb(accent));
  root.style.setProperty('--va-glass','rgba('+glass.join(',')+','+alpha+')');root.style.setProperty('--va-sky-ink',rgb(skyInk));
  // All four labels share the same sunlight curve, regardless of their placement.
  // A very fine, soft edge provides separation through the midtone interval.
  const edge=daylightInk?[247,231,200]:[37,34,39];
  root.style.setProperty('--va-type-edge','rgba('+edge.join(',')+',.26)');
  root.style.setProperty('--va-ink-duration',Math.max(.4,1.6/Math.sqrt(speed)).toFixed(3)+'s');
  for(const item of skyLayout.items){
   item.link.style.setProperty('--va-link-ink',rgb(skyInk));item.link.style.setProperty('--va-link-hover',rgb(skyHover));
   item.link.style.setProperty('--va-connector-color','rgba(230,211,178,.72)');
   item.host.style.setProperty('--va-connector-color','rgba(230,211,178,.72)');
  }
  root.style.setProperty('--va-ground-ink',rgb(groundInk));root.style.setProperty('--va-dock-ink',rgb(dockInk));root.style.setProperty('--va-ground-color',rgb(ground));
  root.style.setProperty('--va-surround-sky',rgb(skyColor(0,day,altitude)));root.style.setProperty('--va-surround-horizon',rgb(skyColor(.54,day,altitude)));
  root.style.setProperty('--va-surround-upper',rgb(skyColor(.25,day,altitude)));root.style.setProperty('--va-surround-mid',rgb(skyColor(.40,day,altitude)));
  root.style.setProperty('--va-rule','rgba('+color([196,179,155],[111,87,66],day).join(',')+',.23)');
  root.style.setProperty('--va-playing',rgb(legible(readingBg,[162,189,165],[55,108,72])));root.style.setProperty('--va-speaking',rgb(legible(readingBg,[215,185,133],[128,83,33])));root.style.setProperty('--va-attending',rgb(legible(readingBg,[167,187,207],[62,98,132])));
  root.style.setProperty('--va-night',night.toFixed(4));root.style.setProperty('--va-day',smooth(.12,.65,day).toFixed(4));root.style.setProperty('--va-cloud-light',(.8+day*.5).toFixed(3));root.style.colorScheme=day>.6?'light':'dark';onLight(day,altitude);
 }
 function compass(day){
  const minutes=Math.floor(wrap(phase)*1440),label=String(Math.floor(minutes/60)).padStart(2,'0')+':'+String(minutes%60).padStart(2,'0');
  if(label!==lastClock){lastClock=label;output.textContent=label;clockInput.setAttribute('aria-valuetext',label);clockInput.value=wrap(phase);}
  const g=clockContext,c=color([215,199,178],[82,88,73],smooth(.10,.88,day));g.clearRect(0,0,300,76);g.lineWidth=1;
  const spacing=31,center=150,unit=wrap(phase)*24,whole=Math.floor(unit);
  for(let i=-6;i<=6;i++){const hour=whole+i,x=center+(hour-unit)*spacing,alpha=Math.max(0,1-Math.abs(x-center)/145);if(x<8||x>292)continue;
   g.strokeStyle='rgba('+c.join(',')+','+(alpha*.58)+')';g.beginPath();g.moveTo(x,25);g.lineTo(x,hour%3===0?41:34);g.stroke();
   if(hour%3===0){g.font='20px "IBM Plex Mono", monospace';g.textAlign='center';g.fillStyle='rgba('+c.join(',')+','+(alpha*.69)+')';g.fillText(String((hour+48)%24).padStart(2,'0'),x,61);}
  }
  g.fillStyle=rgb(color([231,177,137],[157,93,51],day));g.fillRect(149,18,2,27);g.fillRect(147,17,6,2);
 }
 function skyEffects(day){
  const g=fxContext;g.setTransform(ratio,0,0,ratio,0,0);g.clearRect(0,0,width,height);const night=1-smooth(.02,.40,day);
  for(const star of stars){
   const shimmer=Math.pow(Math.max(0,Math.sin(elapsed*star.rate+star.phase)),8);const alpha=night*(star.base+shimmer*.4);if(alpha<.008)continue;
   const x=Math.round(star.x*width),y=Math.round(star.y*height),size=star.size*(width<500?.8:1);
   g.fillStyle='rgba(226,207,174,'+alpha.toFixed(3)+')';
   if(star.kind==='cross'){g.fillRect(x-size*2,y-.5,size*4,1);g.fillRect(x-.5,y-size*2,1,size*4);g.fillRect(x-1,y-1,2,2);}
   else if(star.kind==='diamond'){g.fillRect(x-1,y-2,2,4);g.fillRect(x-2,y-1,4,2);}else g.fillRect(x,y,size,size);
  }
  if(meteor){const t=(elapsed-meteor.born)/meteor.life;if(t>1)meteor=null;else{
   const x=meteor.x*width+t*width*.12,y=meteor.y*height+t*height*.065,alpha=Math.sin(Math.PI*t)*night*.62;
   const trail=g.createLinearGradient(x-30,y-17,x,y);trail.addColorStop(0,'rgba(230,218,191,0)');trail.addColorStop(1,'rgba(230,218,191,'+alpha+')');g.strokeStyle=trail;g.lineWidth=.85;g.beginPath();g.moveTo(x-30,y-17);g.lineTo(x,y);g.stroke();g.fillStyle='rgba(246,230,199,'+alpha+')';g.fillRect(x,y,1.2,1.2);
  }}
  if(flock){const t=(elapsed-flock.born)/flock.life;if(t>1)flock=null;else{
   const leadX=width*(1.08-t*1.24),leadY=height*(.415-.028*Math.sin(t*Math.PI)+.012*Math.sin(t*Math.PI*2));
   for(let i=0;i<2;i++){const x=leadX+i*17,y=leadY+i*8+Math.sin(elapsed*.38+i)*1.6;const wing=Math.sin(elapsed*5.7-i*.8),span=3.0;
    g.globalAlpha=.48*Math.min(1,t*8,(1-t)*8);g.fillStyle=rgb(color([161,147,161],[84,77,94],day));g.save();g.translate(x,y);g.rotate(.05*Math.sin(t*5));g.fillRect(-.5,-.5,1,1);
    for(let k=1;k<=3;k++){const wy=-wing*k*.66;g.fillRect(k-.3,wy,.95,.85);g.fillRect(-k-.6,wy,.95,.85);}g.restore();g.globalAlpha=1;
   }
  }}
  if(plane&&images.plane){const t=(elapsed-plane.born)/plane.life;if(t>1)plane=null;else{const x=width*(1.08-1.18*t),y=height*(.14+.015*Math.sin(t*Math.PI));g.globalAlpha=.4+night*.1;g.drawImage(images.plane,x-12,y-6,24,12);g.globalAlpha=1;
   const blink=Math.pow(Math.max(0,Math.sin((elapsed-plane.born)*Math.PI*1.65)),22)*(.35+.6*night);if(blink>.02){const glow=g.createRadialGradient(x+3,y,0,x+3,y,5);glow.addColorStop(0,'rgba(245,109,91,'+(blink*.6)+')');glow.addColorStop(1,'rgba(245,109,91,0)');g.fillStyle=glow;g.fillRect(x-2,y-5,10,10);g.fillStyle='rgba(255,153,118,'+blink+')';g.fillRect(x+2.5,y-.5,1,1);}
  }}
  moonContext.setTransform(ratio,0,0,ratio,0,0);moonContext.clearRect(0,0,width,height);drawMoon(moonContext,day);
  drawSand(g,day);
  drawLizard(g,day);
  skyLayout.animate(elapsed,smooth(.12,.65,day));
 }
 function drawLizard(g,day){
  if(!lizard)return;
  const age=elapsed-lizard.born,t=age/lizard.life;
  if(t>=1){lizard=null;return;}
  // Two short runs separated by watching pauses; feet follow distance traveled,
  // not a looping walk while stationary. Coordinates belong to the terrain art.
  const travel=smooth(.03,.20,t)*17+smooth(.48,.64,t)*19+smooth(.82,.98,t)*25;
  const terrain=landscapeFrame(width,height),scale=terrain.scale,x=width/2+(lizard.x+travel-cameraX*1536)*scale;
  const y=terrain.top+(lizard.y-Math.sin(travel/61*Math.PI)*3)*scale;
  const alpha=smooth(0,.065,t)*(1-smooth(.94,1,t))*smooth(.12,.52,day)*.85;
  const tone=color([84,72,85],[94,94,66],day),light=color([119,99,107],[151,137,92],day);
  const stepping=(t>.03&&t<.20)||(t>.48&&t<.64)||(t>.82&&t<.98);
  const stride=stepping?Math.sin(travel*1.1):0;
  g.save();g.translate(x,y);g.scale(scale,scale);g.globalAlpha=alpha;
  const pixel=(px,py,w=1,h=1)=>g.fillRect(px,py,w,h);
  // A small tapered tail, low body, pointed head and four splayed feet.
  g.fillStyle=rgb(tone);
  for(let i=0;i<9;i++)pixel(-i-1,Math.round(Math.sin(i*.36+stride*.22)*1.1),i<4?2:1,1);
  pixel(0,-1,7,3);pixel(7,-1,3,2);pixel(10,0,1,1);
  for(const [lx,sign] of [[1,-1],[5,1]]){
   const step=Math.round(stride*sign);
   pixel(lx+step,-2,2,1);pixel(lx+step-1,-3,1,1);
   pixel(lx-step,2,2,1);pixel(lx-step-1,3,1,1);
  }
  g.fillStyle=rgb(light);pixel(1,-1,5,1);pixel(7,-1,2,1);
  g.fillStyle=rgb(color([57,49,65],[66,66,48],day));pixel(9,-1,1,1);
  g.restore();
 }
 function drawSand(g,day){
  const gust=(.26+.74*Math.pow(.5+.5*Math.sin(elapsed*.57-.70+Math.sin(elapsed*.071)*.28),1.5))*(.90+.10*Math.sin(elapsed*.113));
  const terrain=landscapeFrame(width,height),scale=terrain.scale,ink=color([170,140,150],[224,188,138],day);
  g.fillStyle=rgb(ink);
  for(const grain of sand){
   const cycle=wrap(elapsed/grain.period+grain.offset);if(cycle>.46)continue;
   const t=cycle/.46,envelope=Math.pow(Math.sin(t*Math.PI),1.2);
   const x=width/2+(grain.x-cameraX*1536+t*grain.distance)*scale;
   const y=terrain.top+(grain.y-Math.sin(t*Math.PI)*grain.lift)*scale;
   if(x<0||x>width)continue;
   g.globalAlpha=envelope*(.10+gust*.34);g.fillRect(x,y,grain.size,grain.size);
  }
  g.globalAlpha=1;
 }
 // Move the unchanged pixel artwork at subpixel positions on the faster accent
 // pass. A cached skyline path keeps the moon behind the actual ridge geometry.
 function drawMoon(g,day){
  if(!images.moon||!skyClip)return;
  const opacity=(1-smooth(.02,.26,day))*.88;if(opacity<=0)return;
  const altitude=-Math.cos(phase*Math.PI*2),x=width*(.735+.175*clamp((cameraX-.5)/.22)),y=height*(.555+.414*altitude+Math.sin(elapsed*.105)*.00085),size=height*.058;
  g.save();g.clip(skyClip);g.globalAlpha=opacity;g.imageSmoothingEnabled=true;g.imageSmoothingQuality='high';g.drawImage(images.moon,x-size/2,y-size/2,size,size);g.restore();
 }
 function scheduleEvents(day){
  if(elapsed>=nextMeteor){if(day<.15&&!meteor&&!plane){meteor={born:elapsed,life:1.8+random()*.7,x:.15+random()*.5,y:.055+random()*.18};nextMeteor=elapsed+34+random()*32;}else nextMeteor=elapsed+3;}
  if(elapsed>=nextBird){if(day>.6&&!flock&&!plane){flock={born:elapsed,life:24+random()*8};nextBird=elapsed+47+random()*33;}else nextBird=elapsed+3;}
  if(elapsed>=nextPlane){if(!flock&&!meteor&&!plane){plane={born:elapsed,life:39+random()*9};nextPlane=elapsed+88+random()*40;}else nextPlane=elapsed+4;}
  if(elapsed>=nextLizard){
   if(day>.55&&!lizard){
    // A pebble cluster remains in the central crop on phones. On wider screens
    // alternate with the low rock shelf left of the name.
    const narrow=width/height<.85,near=narrow||Math.random()<.55;
    lizard={born:elapsed,life:13+Math.random()*4,x:near?535:395,y:near?949:814};
    nextLizard=elapsed+75+Math.random()*65;
   }else nextLizard=elapsed+5;
  }
 }
 function paint(force=false){
  const altitude=-Math.cos(phase*Math.PI*2),day=smooth(-.035,.48,altitude);
  if(ready){gl.useProgram(program);gl.uniform2f(uniforms.u_size,surface.width,surface.height);gl.uniform1f(uniforms.u_phase,wrap(phase));gl.uniform1f(uniforms.u_day,day);gl.uniform1f(uniforms.u_time,elapsed);gl.uniform1f(uniforms.u_cameraX,cameraX);gl.drawArrays(gl.TRIANGLES,0,6);skyEffects(day);}
  if(force||elapsed-lastUI>.10||drag||Math.abs(throwVelocity)>.001){theme(day,altitude,force);lastUI=elapsed;}compass(day);recordMotion("paint");
 }
 const motionTrace={state:'starting',ticks:0,paints:0,lastTickAt:0,lastPaintAt:0,events:[],error:null};
function recordMotion(kind){
 const now=performance.now();
 if(kind==='tick'){motionTrace.ticks++;motionTrace.lastTickAt=now;}
 if(kind==='paint'){motionTrace.paints++;motionTrace.lastPaintAt=now;}
 const reason=disposed?'disposed':suspended?'page-suspended':!root.isConnected?'detached':document.hidden?'document-hidden':!ready?'graphics-not-ready':!visible?'outside-viewport':paused?'user-or-reduced-motion-pause':drag?'time-drag-held':'running';
 if(reason!==motionTrace.state){motionTrace.events.push({at:Math.round(now),from:motionTrace.state,to:reason});motionTrace.events=motionTrace.events.slice(-40);motionTrace.state=reason;}
}
on(window,'error',event=>{motionTrace.error={message:event.message,file:event.filename,line:event.lineno,at:Math.round(performance.now())};});
on(window,'unhandledrejection',event=>{motionTrace.error={message:String(event.reason?.stack||event.reason),at:Math.round(performance.now())};});
if(new URLSearchParams(location.search).has('debug-motion')){
 globalThis.vistaDebug=Object.freeze({snapshot:()=>{
  recordMotion('inspect');
  return JSON.parse(JSON.stringify({...motionTrace,phase,elapsed,paused,dragHeld:!!drag,graphicsReady:ready,graphicsError:root.dataset.skyError||null,hidden:document.hidden,intersectionVisible:visible,connected:root.isConnected,reducedMotion:motionPreference.matches,framesStaleForMs:Math.round(performance.now()-motionTrace.lastPaintAt),activeFigures:{meteor:!!meteor,birds:!!flock,plane:!!plane,lizard:!!lizard},nextLizardInSeconds:Math.max(0,nextLizard-elapsed)}));
 }});
}

 function tick(now){
  recordMotion("tick");
  frame=0;if(disposed||suspended||!ready||!visible||document.hidden||!root.isConnected)return;
  const dt=lastTime?Math.min(.1,(now-lastTime)/1000):0;lastTime=now;
  if(!paused){
   elapsed+=dt;
   // An unwrapped target avoids a spring jump at midnight. The target coasts;
   // the visible ruler and sky follow it with a lightly damped elastic lag.
   if(!drag){const damping=.95;rotorTarget+=dt*speed/300+throwVelocity*(1-Math.exp(-damping*dt))/damping;throwVelocity*=Math.exp(-damping*dt);if(Math.abs(throwVelocity)<.00001)throwVelocity=0;}
   const steps=Math.max(1,Math.ceil(dt*120)),h=dt/steps;
   for(let i=0;i<steps;i++){rotorVelocity+=(110*(rotorTarget-phase)-17*rotorVelocity)*h;phase+=rotorVelocity*h;}
   scheduleEvents(smooth(-.035,.48,-Math.cos(phase*Math.PI*2)));
  }
  if(now-lastPaint>=32||drag){paint();lastPaint=now;lastAccentPaint=now;}
  else if(ready&&now-lastAccentPaint>=14){skyEffects(smooth(-.035,.48,-Math.cos(phase*Math.PI*2)));lastAccentPaint=now;}
  if(!paused||drag)frame=requestAnimationFrame(tick);
 }
 function stopLoop(){cancelAnimationFrame(frame);frame=0;lastTime=0;}
 function wake(){if(!frame&&!disposed&&!suspended&&ready&&visible&&!document.hidden&&root.isConnected&&(!paused||drag)){lastTime=0;frame=requestAnimationFrame(tick);}}
 function syncPause(){cancelDrag();pause.setAttribute('aria-label',paused?'Resume sky motion':'Pause sky motion');pause.setAttribute('aria-pressed',String(paused));if(paused){throwVelocity=0;rotorVelocity=0;rotorTarget=phase;stopLoop();}else wake();paint(true);}
 on(pause,'click',()=>{paused=!paused;syncPause();});on(speedSelect,'change',()=>{speed=Number(speedSelect.value);});
 on(clockInput,'pointerdown',event=>{if(event.button!==0)return;const bounds=clockInput.getBoundingClientRect();drag={id:event.pointerId,x:event.clientX,y:event.clientY,startPhase:phase,lastTarget:phase,time:event.timeStamp,velocity:0,width:bounds.width,moved:false};rotorTarget=phase;rotorVelocity*=.2;throwVelocity=0;clockInput.setPointerCapture(event.pointerId);clockInput.focus({preventScroll:true});event.preventDefault();wake();});
 on(clockInput,'pointermove',event=>{
  if(!drag||event.pointerId!==drag.id)return;const dx=event.clientX-drag.x,dy=event.clientY-drag.y;
  if(event.pointerType==='mouse'&&event.buttons===0){cancelDrag();return;}
  if(!drag.moved&&Math.abs(dy)>Math.abs(dx)+5){drag=null;rotorTarget=phase;rotorVelocity=0;if(clockInput.hasPointerCapture(event.pointerId))clockInput.releasePointerCapture(event.pointerId);return;}
  if(Math.abs(dx)>2)drag.moved=true;if(!drag.moved)return;
  const rubber=dx/(1+Math.abs(dx)/(drag.width*2.6)),target=drag.startPhase-rubber/drag.width*.28;
  const delta=Math.max(.008,(event.timeStamp-drag.time)/1000),velocity=(target-drag.lastTarget)/delta;
  drag.velocity=mix(drag.velocity,clamp(velocity,-.18,.18),.3);drag.time=event.timeStamp;drag.lastTarget=target;rotorTarget=target;
  if(paused||motionPreference.matches){phase=target;rotorVelocity=0;paint(true);}event.preventDefault();wake();
 });
 function release(event){
  if(!drag||event.pointerId!==drag.id)return;
  if(!drag.moved){const bounds=clockInput.getBoundingClientRect();rotorTarget=phase+(event.clientX-bounds.left-bounds.width/2)/bounds.width*.22;}
  else{const idle=Math.max(0,(event.timeStamp-drag.time-90)/1000);throwVelocity=paused||motionPreference.matches?0:drag.velocity*.78*Math.exp(-idle*12);}
  if(paused||motionPreference.matches){phase=rotorTarget;rotorVelocity=0;}
  drag=null;if(clockInput.hasPointerCapture(event.pointerId))clockInput.releasePointerCapture(event.pointerId);paint(true);wake();
 }
 // Pointer capture can end without a pointerup on the ruler: switching windows,
 // iframe resizing, and a browser gesture can all interrupt it. Never leave the
 // automatic clock waiting for a pointer that is no longer held.
 function cancelDrag(){
  if(!drag)return;
  const id=drag.id;drag=null;throwVelocity=0;rotorTarget=phase;rotorVelocity=0;
  if(clockInput.hasPointerCapture(id))clockInput.releasePointerCapture(id);
  wake();
 }
 on(clockInput,'pointerup',release);
 on(clockInput,'pointercancel',cancelDrag);
 on(clockInput,'lostpointercapture',event=>{if(drag?.id===event.pointerId)cancelDrag();});
 on(window,'pointerup',release);
 on(window,'pointercancel',cancelDrag);
 on(window,'blur',cancelDrag);
 on(root,'pointerdown',()=>{if(drag)cancelDrag();},{capture:true});
 function setTime(value){cancelDrag();phase=wrap(value);rotorTarget=phase;rotorVelocity=0;throwVelocity=0;paint(true);wake();}
 on(clockInput,'keydown',event=>{const steps={ArrowLeft:-1/144,ArrowDown:-1/144,ArrowRight:1/144,ArrowUp:1/144,PageDown:-1/24,PageUp:1/24};if(event.key in steps){event.preventDefault();setTime(phase+steps[event.key]);}else if(event.key==='Home'||event.key==='End'){event.preventDefault();setTime(event.key==='Home'?0:.5);}});
 on(clockInput,'input',()=>{if(!drag)setTime(Number(clockInput.value));});
 on(document,'visibilitychange',()=>{if(document.hidden){cancelDrag();stopLoop();}else{scheduleResize();wake();}});
 on(motionPreference,'change',()=>{paused=motionPreference.matches;syncPause();});
 on(root,'vista-design-change',()=>{paint(true);wake();});
 on(surface,'webglcontextlost',event=>{event.preventDefault();initialization++;ready=false;cancelDrag();stopLoop();root.dataset.skyReady='false';});
 on(surface,'webglcontextrestored',()=>{program=null;gpuTextures.length=0;initialize();});
 const resizeObserver=new ResizeObserver(scheduleResize);resizeObserver.observe(world);observers.push(resizeObserver);
 on(window,'resize',scheduleResize);on(window,'focus',()=>{scheduleResize();wake();});
 watchDensity();
 const intersection=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(!visible)stopLoop();else wake();});intersection.observe(root);observers.push(intersection);
 function destroy(){disposed=true;initialization++;cancelAnimationFrame(frame);cancelAnimationFrame(resizeFrame);densityQuery?.removeEventListener('change',densityChanged);abort.abort();observers.forEach(o=>o.disconnect());if(gl){gpuTextures.forEach(t=>gl.deleteTexture(t));if(program)gl.deleteProgram(program);}}
 // A browser may preserve this document for Back/Forward or preview restoration.
 // Suspend a preserved page; destroying its listeners makes it permanently inert.
 on(window,'pagehide',event=>{if(event.persisted){suspended=true;cancelDrag();stopLoop();cancelAnimationFrame(resizeFrame);resizeFrame=0;}else destroy();});
 on(window,'pageshow',()=>{if(disposed)return;suspended=false;lastTime=0;watchDensity();drawLinkConstellations();resize();wake();});
 syncPause();initialize();
 recordMotion("initialization");
 return{destroy};
}
createLivingVista({root,onLight:paintNameLighting,getSurfaceOpacity:()=>state.surfaceOpacity});

})();

(() => {
  const installDrummer=function installDrummer(root,options={}){
    const host=root.matches('[data-pixel-drummer]')?root:root.querySelector('[data-pixel-drummer]');
    if(!host)return null;
    if(host.__pixelDrummer)return host.__pixelDrummer;
    const button=host.querySelector('.pd-play');
    const band=host.querySelector('.pd-band');
    const cymbal=host.querySelector('.pd-cymbal');
    const arm=host.querySelector('.pd-arm-right');
    const hand=host.querySelector('.pd-hand-right');
    const stick=host.querySelector('.pd-stick-right');
    const head=host.querySelector('.pd-head');
    const reduced=matchMedia('(prefers-reduced-motion: reduce)');
    const abort=new AbortController();
    const pivot={x:86,y:28};
    const restTip={x:74,y:12};
    const windupTip={x:69,y:7};
    const reboundTip={x:77,y:13};
    const contactTime=.20;
    const duration=.52;
    let angle=0,angularVelocity=0,stroke=null,pendingHits=0;
    let frame=0,lastTime=null,visible=true,destroyed=false,flashTimer=0,lastEntryTime=-Infinity;
    const allowed=()=>typeof options.motionAllowed==='function'?Boolean(options.motionAllowed()):!reduced.matches;
    const canRun=()=>!destroyed&&host.isConnected&&visible&&!document.hidden&&allowed();
    const active=()=>Boolean(stroke||pendingHits||Math.abs(angle)>.0005||Math.abs(angularVelocity)>.002);
    const ease=t=>t*t*(3-2*t);
    const mix=(a,b,t)=>({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t});

    function contactPoint(){
      const x=-8,y=0;
      return {x:pivot.x+x*Math.cos(angle)-y*Math.sin(angle),y:pivot.y+x*Math.sin(angle)+y*Math.cos(angle)};
    }

    function pose(){
      let tip=restTip,nod=0;
      if(stroke){
        const t=stroke.elapsed;
        const contact=contactPoint();
        if(t<.10)tip=mix(restTip,windupTip,ease(t/.10));
        else if(t<=contactTime)tip=mix(windupTip,contact,ease((t-.10)/.10));
        else if(t<.34)tip=mix(contact,reboundTip,ease((t-contactTime)/.14));
        else tip=mix(reboundTip,restTip,ease(Math.min(1,(t-.34)/.18)));
        nod=Math.max(0,1-Math.abs(t-contactTime)/.13)*1.1;
      }
      const dx=tip.x-60,dy=tip.y-37;
      const distance=Math.hypot(dx,dy)||1;
      const wrist={x:tip.x-dx/distance*20,y:tip.y-dy/distance*20};
      arm.setAttribute('d','M54 35L59 40L'+wrist.x.toFixed(3)+' '+wrist.y.toFixed(3));
      stick.setAttribute('d','M'+wrist.x.toFixed(3)+' '+wrist.y.toFixed(3)+'L'+tip.x.toFixed(3)+' '+tip.y.toFixed(3));
      hand.setAttribute('x',(wrist.x-2).toFixed(3));
      hand.setAttribute('y',(wrist.y-2).toFixed(3));
      cymbal.setAttribute('transform','rotate('+(angle*180/Math.PI).toFixed(4)+' 86 28)');
      head.setAttribute('transform','translate(0 '+nod.toFixed(3)+')');
    }

    function stop(reset){
      if(frame)cancelAnimationFrame(frame);
      frame=0;lastTime=null;
      if(reset){angle=0;angularVelocity=0;stroke=null;pendingHits=0;pose();}
    }

    function colorFeedback(){
      clearTimeout(flashTimer);
      host.dataset.pdFeedback='true';
      flashTimer=setTimeout(()=>{delete host.dataset.pdFeedback;},150);
    }

    function integrate(dt){
      // Angular spring/damper: radians, radians/second, unit moment of inertia.
      const spring=310,damping=6.2;
      const count=Math.max(1,Math.ceil(dt/(1/120)));
      const h=dt/count;
      for(let i=0;i<count;i++){
        angularVelocity+=(-spring*angle-damping*angularVelocity)*h;
        angle+=angularVelocity*h;
      }
      if(Math.abs(angle)<.0005&&Math.abs(angularVelocity)<.002){angle=0;angularVelocity=0;}
    }

    function tick(time){
      frame=0;
      if(!canRun()){stop(!allowed());return;}
      const dt=lastTime===null?0:Math.min((time-lastTime)/1000,.035);
      lastTime=time;
      integrate(dt);
      if(!stroke&&pendingHits){pendingHits--;stroke={elapsed:0,contacted:false};}
      if(stroke){
        stroke.elapsed+=dt;
        if(!stroke.contacted&&stroke.elapsed>=contactTime){
          // Hold the exact contact pose for this frame, then recoil next frame.
          stroke.elapsed=contactTime;
          stroke.contacted=true;
          angularVelocity=Math.max(-8.5,angularVelocity-3.8);
          if(typeof options.onContact==='function')options.onContact({angle,angularVelocity});
        }
        if(stroke.elapsed>=duration)stroke=null;
      }
      pose();
      if(active())frame=requestAnimationFrame(tick);
      else lastTime=null;
    }

    function wake(){
      if(typeof options.wake==='function')options.wake();
      if(!frame&&active()&&canRun())frame=requestAnimationFrame(tick);
    }

    function strike(){
      if(destroyed)return;
      if(!allowed()){stop(true);colorFeedback();return;}
      pendingHits=Math.min(3,pendingHits+1);
      wake();
    }

    function sync(){
      if(destroyed)return;
      if(!allowed()){stop(true);return;}
      if(!visible||document.hidden){stop(false);return;}
      wake();
    }

    function onEntry(event){
      // Focus immediately caused by a mouse entry shares that entry's one hit.
      const now=performance.now();
      if(event.type==='focus'&&now-lastEntryTime<220)return;
      if(event.type==='pointerenter')lastEntryTime=now;
      strike();
    }

    const listen=(target,type,handler)=>target.addEventListener(type,handler,{signal:abort.signal});
    listen(band,'pointerenter',onEntry);
    listen(band,'focus',onEntry);
    listen(button,'click',()=>{
      if(!allowed()&&typeof options.enableMotion==='function')options.enableMotion();
      strike();
    });
    listen(document,'visibilitychange',sync);
    listen(reduced,'change',sync);
    const intersection=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;sync();},{threshold:0});
    intersection.observe(host);
    const controller={
      strike,
      sync,
      isActive:active,
      destroy(){
        destroyed=true;stop(true);abort.abort();intersection.disconnect();clearTimeout(flashTimer);
        delete host.dataset.pdFeedback;delete host.__pixelDrummer;
      }
    };
    host.__pixelDrummer=controller;
    pose();
    return controller;
  };
  installDrummer(document.getElementById('adam-vista'));
})();
