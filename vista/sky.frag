precision highp float;
uniform vec2 u_size;
uniform float u_time;
uniform float u_phase;
uniform float u_day;
uniform float u_cameraX;
uniform sampler2D u_land;
uniform sampler2D u_edge;
uniform sampler2D u_air;
uniform sampler2D u_left_land;
uniform sampler2D u_right_land;
uniform sampler2D u_side_edge;
uniform vec4 u_extensions;
const float PI=3.14159265359;
float luminance(vec3 c){return dot(c,vec3(.2126,.7152,.0722));}
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
vec4 sprite(sampler2D image,vec2 uv){if(uv.x<0.0||uv.x>1.0||uv.y<0.0||uv.y>1.0)return vec4(0.0);return texture2D(image,uv);}
vec4 air(vec2 uv,float row){if(uv.x<0.0||uv.x>1.0||uv.y<0.0||uv.y>1.0)return vec4(0.0);vec4 c=texture2D(u_air,vec2(uv.x,(row+uv.y)/3.0));c.a*=smoothstep(0.0,.08,uv.x)*(1.0-smoothstep(.92,1.0,uv.x))*smoothstep(0.0,.08,uv.y)*(1.0-smoothstep(.92,1.0,uv.y));return c;}
// Only the moving regions get subpixel filtering. Static rock keeps its native
// pixel edges; a fractional breeze never snaps from one texture pixel to another.
vec3 movingLand(vec2 uv){
 vec2 p=uv*vec2(1536.0,1024.0)-.5,b=floor(p),f=fract(p),s=vec2(1.0/1536.0,1.0/1024.0);
 vec3 a=texture2D(u_land,(b+.5)*s).rgb,c=texture2D(u_land,(b+vec2(1.5,.5))*s).rgb;
 vec3 d=texture2D(u_land,(b+vec2(.5,1.5))*s).rgb,e=texture2D(u_land,(b+1.5)*s).rgb;
 return mix(mix(a,c,f.x),mix(d,e,f.x),f.y);
}
float breeze(float t){return (.26+.74*pow(.5+.5*sin(t*.57-.70+sin(t*.071)*.28),1.5))*(.90+.10*sin(t*.113));}
float bank(vec2 p,vec2 a,vec2 b,float width){
 float k=clamp((p.x-a.x)/(b.x-a.x),0.0,1.0);
 float endMask=smoothstep(a.x-.015,a.x+.02,p.x)*(1.0-smoothstep(b.x-.02,b.x+.015,p.x));
 return (1.0-smoothstep(width*.30,width,abs(p.y-mix(a.y,b.y,k))))*endMask;
}
// The existing center texture and its silhouette are never blended or warped.
// Only the new exterior strips receive seam registration and edge matching.
vec4 landscape(vec2 uv){
 if(uv.x>=0.0&&uv.x<=1.0)return texture2D(u_land,uv);
 bool left=uv.x<0.0;
 float distance=left?-uv.x:uv.x-1.0;
 float seam=1.0-smoothstep(0.0,.16,distance);
 float offset=left?u_extensions.z:u_extensions.w;
 vec2 sideUV=vec2(left?1.0+uv.x/u_extensions.x:(uv.x-1.0)/u_extensions.y,uv.y-offset*seam);
 vec4 side=left?texture2D(u_left_land,sideUV):texture2D(u_right_land,sideUV);
 vec3 join=texture2D(u_land,vec2(left?0.0:1.0,uv.y)).rgb;
 side.rgb=mix(side.rgb,join,1.0-smoothstep(0.0,.018,distance));
 return side;
}
float landscapeEdge(float x){
 if(x>=0.0&&x<=1.0){vec4 edge=texture2D(u_edge,vec2(x,.5));return(edge.r*255.0*256.0+edge.g*255.0)/1024.0;}
 bool left=x<0.0;
 float t=left?1.0+x/u_extensions.x:(x-1.0)/u_extensions.y;
 vec4 edge=texture2D(u_side_edge,vec2(clamp(t,0.0,1.0),left?.25:.75));
 return(edge.r*255.0*256.0+edge.g*255.0)/1024.0+(left?u_extensions.z:u_extensions.w)*(1.0-smoothstep(0.0,.16,left?-x:x-1.0));
}
void main(){
 vec2 screen=vec2(gl_FragCoord.x/u_size.x,1.0-gl_FragCoord.y/u_size.y);
 float aspect=u_size.x/u_size.y;
 vec2 uv=vec2((screen.x-.5)*aspect/1.5+u_cameraX,screen.y);
 float altitude=-cos(u_phase*2.0*PI),day=u_day;
 float twilight=exp(-pow(altitude/.20,2.0))*(1.0-smoothstep(.35,.65,day));
 float skyT=smoothstep(.02,.59,screen.y);
 vec3 skyNight=mix(vec3(.174,.151,.208),vec3(.405,.329,.429),pow(skyT,2.1));
 vec3 skyDay=mix(vec3(.535,.699,.809),vec3(.970,.863,.704),pow(skyT,2.6));
 vec3 sky=mix(skyNight,skyDay,day);
 float horizonGlow=exp(-pow((screen.y-.54)/.125,2.0));
 sky+=vec3(.22,.088,.028)*horizonGlow*twilight*.8;
 float granule=hash(floor(vec2(screen.x*aspect,screen.y)*650.0));
 sky+=(granule-.5)*.005;

 // Fixed vertical corridors: both lights sink behind the terrain texture's real alpha edge.
 float sunY=.555-.416*altitude;
 float sunX=.255-.14*clamp((u_cameraX-.5)/.22,0.0,1.0);
 vec2 sunDelta=vec2((screen.x-sunX)*aspect,screen.y-sunY);
 vec2 sunPixel=floor(sunDelta*550.0+.5)/550.0;
 float sunDisk=1.0-step(.0195,length(sunPixel));
 float sunGlow=exp(-dot(sunDelta,sunDelta)/.0008)*.055;
 sky+=vec3(1.0,.75,.40)*sunGlow;
 sky=mix(sky,vec3(1.0,.89,.67),sunDisk*.97);

 // The thin background clouds travel independently of the navigation clouds.
 // Each veil gently spreads and thins before its invisible cycle restarts.
 float ageA=fract(u_time/112.0+.31),ageB=fract(u_time/167.0+.68);
 float lifeA=smoothstep(0.0,.14,ageA)*(1.0-smoothstep(.54,1.0,ageA));
 float lifeB=smoothstep(0.0,.16,ageB)*(1.0-smoothstep(.58,1.0,ageB));
 float driftA=.09+ageA*.24,driftB=.55+ageB*.21;
 float spreadA=.34+ageA*.10,spreadB=.27+ageB*.10;
 vec2 cloudUV=vec2((uv.x-driftA)/spreadA,(uv.y-.113-sin(u_time*.024)*.002)/.052);
 vec2 cloudUV2=vec2((uv.x-driftB)/spreadB,(uv.y-.250-sin(u_time*.017+1.4)*.002)/.041);
 // Slight differential wind within the wisp, with no rigid silhouette snapping.
 cloudUV.x+=sin(cloudUV.y*3.0+u_time*.022)*.018;
 cloudUV2.x+=sin(cloudUV2.y*3.4+u_time*.016)*.014;
 vec4 veil=air(cloudUV,2.0),veil2=air(cloudUV2,2.0);
 float cloudAlpha=min(.38,(veil.a*lifeA+veil2.a*lifeB)*(.23+.24*day));
 sky=mix(sky,mix(vec3(.57,.51,.62),vec3(.985,.936,.835),day),cloudAlpha);

 vec4 land=landscape(uv);
 float gust=breeze(u_time);
 // The approved cactus is part of this terrain. Flex its upper branches in
 // place; no new sprite, doubled plant, moving root, or rectangular overlay.
 vec2 native=uv*vec2(1536.0,1024.0);
 float cactusArea=smoothstep(1291.0,1300.0,native.x)*(1.0-smoothstep(1348.0,1356.0,native.x));
 float cactusTip=pow(clamp((814.0-native.y)/64.0,0.0,1.0),1.55)*(1.0-smoothstep(66.0,79.0,814.0-native.y));
 float cactusMove=(gust*8.1+sin(u_time*1.55+native.x*.13)*gust*1.0)*cactusArea*cactusTip;
 if(cactusArea*cactusTip>.001){
  land.rgb=movingLand(uv-vec2(cactusMove/1536.0,0.0));
 }
 // Advect the existing mist's texture only inside its pale valley lanes.
 // The material gate excludes dark crags; feathered banks protect ridge edges.
 float rearBank=max(bank(uv,vec2(.20,.558),vec2(.47,.591),.030),bank(uv,vec2(.42,.591),vec2(.79,.576),.026));
 float leftBank=max(bank(uv,vec2(.12,.617),vec2(.30,.646),.027),bank(uv,vec2(.26,.646),vec2(.48,.676),.027));
 float rightBank=max(bank(uv,vec2(.47,.705),vec2(.71,.688),.026),bank(uv,vec2(.67,.691),vec2(.90,.644),.030));
 float fogBank=max(rearBank,max(leftBank,rightBank));
 float fogMaterial=smoothstep(.26,.355,luminance(land.rgb))*fogBank;
 if(fogMaterial>.001){
  float flow=sin(u_time*.145)*20.0+sin(u_time*.051)*7.0;
  float laneFlow=mix(flow*.66,-flow,leftBank+rightBank);
  vec3 flowing=movingLand(uv-vec2(laneFlow/1536.0,sin(u_time*.14+uv.x*9.0)*.30/1024.0));
  float sourceGate=smoothstep(.245,.325,luminance(flowing));
  land.rgb=mix(land.rgb,flowing,fogMaterial*sourceGate);
 }
 float skyline=landscapeEdge(uv.x);
 land.a=smoothstep(skyline-.0005,skyline+.0005,uv.y);
 float value=luminance(land.rgb);
 float nearGround=smoothstep(.66,.81,uv.y);
 vec3 dayDark=mix(vec3(.31,.365,.447),vec3(.43,.367,.308),nearGround);
 vec3 dayLight=mix(vec3(.889,.880,.817),vec3(.970,.827,.627),nearGround);
 float tone=clamp((value-.132)/.335,0.0,1.0);
 vec3 dayLand=mix(dayDark,dayLight,tone);
 // Preserve the tiny cactus's muted green and gold local accents.
 float warmAccent=smoothstep(.06,.16,land.r-land.b)*nearGround;
 dayLand=mix(dayLand,vec3(.83,.61,.31),warmAccent*.48);
 vec3 terrain=mix(land.rgb,dayLand,day);
 terrain+=vec3(.09,.032,.012)*twilight*(.45+tone*.4);

 // Distinct banks slide past one another. The darker ridges occlude the far fog;
 // a nearer wisp can pass in front of the valley floor without distorting terrain.
 float farZone=smoothstep(.525,.553,uv.y)*(1.0-smoothstep(.639,.675,uv.y));
 float nearZone=smoothstep(.613,.652,uv.y)*(1.0-smoothstep(.713,.756,uv.y));
 float farMaterial=smoothstep(.22,.34,value)*farZone;
 float nearMaterial=smoothstep(.185,.295,value)*nearZone;
 float windA=sin(u_time*.12)*.10+sin(u_time*.041+1.2)*.018;
 float windB=sin(u_time*.094+2.0)*.082+sin(u_time*.077)*.013;
 vec4 fog1=air(vec2((uv.x+.08+windA)/.89,(uv.y-.517)/.125),0.0);
 vec4 fog2=air(vec2((uv.x-.14-windB)/.95,(uv.y-.582)/.130),1.0);
 vec4 fog3=air(vec2((uv.x-.28+windA*.72)/.74,(uv.y-.650)/.118),0.0);
 float fogAlpha=min(.56,fog1.a*.72*farMaterial+fog2.a*.63*farMaterial+fog3.a*.66*nearMaterial);
 vec3 fogColor=mix(vec3(.695,.607,.724),vec3(.970,.917,.814),day);
 float valleyOnly=1.0-smoothstep(.692,.716,uv.y);
 terrain=mix(terrain,fogColor,fogAlpha*valleyOnly);
 // A nearer filament has a traveling silhouette, not just changing texture
 // within the old painted mist. Its bank mask follows the valley floor.
 float wispDrift=sin(u_time*.11)*.071+sin(u_time*.039)*.018;
 vec4 lowWisp=air(vec2((uv.x-.23-wispDrift)/.53,(uv.y-.651)/.078),1.0);
 vec4 rightWisp=air(vec2((uv.x-.47+wispDrift*.56)/.43,(uv.y-.653)/.074),0.0);
 float lowAlpha=(lowWisp.a*leftBank+rightWisp.a*rightBank)*.46;
 terrain=mix(terrain,fogColor,lowAlpha*valleyOnly);

 // Clear foreground: no fog sprites or luminous dust streaks beneath the name.
 vec3 color=mix(sky,terrain,land.a);
 gl_FragColor=vec4(color,1.0);
}
