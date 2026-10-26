
'use strict';
const $=id=>document.getElementById(id), clamp=(n,a,b)=>Math.max(a,Math.min(b,n)), rnd=(a,b)=>a+Math.random()*(b-a), pick=a=>a[Math.floor(Math.random()*a.length)];
const SAVE='last_day_save_20261025_public_staff_sky_01';const SAVE_SCHEMA=3;let hiringMenuActive=false,pointerUnlockForModal=false,pointerReentryPending=false;let scene,camera,renderer,world,clock3,amb,sun,interiorLight,windowLights=[],nightFog;let raidWaveStarted=false,raidPane=null,raidAlarm=0;let running=false,paused=true,modalOpen=false,dead=false,keys={},yaw=0,pitch=0,last=0,toastTimer=0,focus=null,hitFlash=0;let player={x:2.2,z:-.3,hp:100,st:100,hunger:90,thirst:90};let state,checkpoint,stats,elapsed=0,queue=[],customers=[],zombies=[],bodies=[],staff=[],objects=[],obstacles=[],doors=[],decor=[],attackCd=0,spawnCd=4,zombieCd=40,raid=0,held=null,waterJob=0,cookJob=0,filterBatch=0,nightTriggered=false,servedToday=0;const W=8,D=6,H=3.8,FRONT=-6,BACK=6,PART=1.4;const C={wall:0x77766a,plaster:0x9a9787,wood:0x554235,metal:0x4e5552,rust:0x704a35,glass:0x9da7a2};
const surfaceCache=new Map();
const materialFamilies={
 concrete:new Set([0x77766a,0x777367,0x89897c,0x43473e,0x66645c,0x777267,0x5c615b,0x686960,0x515952]),
 wood:new Set([0x63503c,0x554235,0x66503c,0x47382b,0x82725a,0x554638]),
 rust:new Set([0x705044,0x704a35,0x6c5c50,0x61251f]),
 asphalt:new Set([0x343a37,0x252e30,0x2d302e,0x34373c]),
 fabric:new Set([0x646e59,0x8b6d4d,0x454b4a,0x99988a,0x5a6550,0x626c4e,0x353a35,0x4a463c,0x55594f,0x414943,0x3e4939,0x4a4d46,0x51453f,0x625b50])
};
function familyFor(color,metal){if(metal>.35)return 'metal';for(const [name,values] of Object.entries(materialFamilies))if(values.has(color))return name;return 'other'}
function textureFor(family,color){
 const key=family+':'+color;if(surfaceCache.has(key))return surfaceCache.get(key);
 const c=document.createElement('canvas');c.width=c.height=256;const g=c.getContext('2d');
 let seed=(Math.imul(color,1664525)+1013904223)>>>0;
 const rand=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
 g.fillStyle='#ddd9cf';g.fillRect(0,0,256,256);
 const dot=(x,y,w,h,col)=>{g.fillStyle=col;g.fillRect(x,y,w,h)};
 if(family==='wood'){
  g.fillStyle='#e5d5ba';g.fillRect(0,0,256,256);
  for(let i=0;i<85;i++){let y=rand()*256;g.strokeStyle=`rgba(62,39,23,${.05+rand()*.21})`;g.lineWidth=.4+rand()*2;g.beginPath();g.moveTo(0,y);g.bezierCurveTo(80,y+rand()*12-6,170,y+rand()*12-6,256,y+rand()*6-3);g.stroke()}
  for(let i=0;i<5;i++){let x=rand()*256,y=rand()*256;g.strokeStyle='rgba(62,38,20,.27)';g.beginPath();g.ellipse(x,y,5+rand()*12,2+rand()*4,0,0,Math.PI*2);g.stroke()}
 }else if(family==='concrete'){
  for(let i=0;i<11000;i++){let v=rand()>.48?38:-45;dot(rand()*256,rand()*256,1+rand()*6,1+rand()*5,`rgba(${v>0?255:30},${v>0?247:26},${v>0?225:20},${.025+rand()*.13})`)}
  for(let i=0;i<15;i++){let x=rand()*256,y=rand()*256;g.strokeStyle=`rgba(52,42,32,${.07+rand()*.14})`;g.lineWidth=1+rand()*3;g.beginPath();g.moveTo(x,y);g.lineTo(x+rand()*55-25,y+rand()*70);g.stroke()}
 }else if(family==='rust'||family==='metal'){
  g.fillStyle=family==='rust'?'#c5aa8c':'#c6c8c2';g.fillRect(0,0,256,256);
  for(let i=0;i<2600;i++){let x=rand()*256,y=rand()*256;dot(x,y,1+rand()*13,1+rand()*6,family==='rust'?`rgba(99,40,15,${rand()*.32})`:`rgba(57,63,62,${rand()*.17})`)}
  for(let i=0;i<20;i++){let y=rand()*256;g.strokeStyle='rgba(40,35,28,.13)';g.beginPath();g.moveTo(rand()*50,y);g.lineTo(180+rand()*76,y+rand()*2);g.stroke()}
 }else if(family==='asphalt'){
  g.fillStyle='#bbb9b0';g.fillRect(0,0,256,256);
  for(let i=0;i<13000;i++){let shade=rand()>.55?245:43;dot(rand()*256,rand()*256,1+rand()*3,1+rand()*3,`rgba(${shade},${shade},${shade},${rand()*.22})`)}
  for(let i=0;i<7;i++){let x=rand()*256,y=rand()*256;g.strokeStyle='rgba(40,38,35,.24)';g.beginPath();g.moveTo(x,y);g.lineTo(x+rand()*30-15,y+rand()*45);g.stroke()}
 }else if(family==='fabric'){
  g.fillStyle='#ddd8ca';g.fillRect(0,0,256,256);
  for(let i=0;i<256;i+=3){g.fillStyle='rgba(65,58,47,.09)';g.fillRect(i,0,1,256);g.fillRect(0,i,256,1)}
  for(let i=0;i<2800;i++)dot(rand()*256,rand()*256,1,1,`rgba(40,35,30,${rand()*.15})`);
 }else{
  for(let i=0;i<3400;i++)dot(rand()*256,rand()*256,1+rand()*4,1+rand()*4,`rgba(48,40,33,${rand()*.11})`);
 }
 const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.colorSpace=THREE.SRGBColorSpace;
 surfaceCache.set(key,t);return t;
}
let metalEnvironment=null;
function getMetalEnvironment(){
 if(metalEnvironment)return metalEnvironment;
 const faces=[];
 for(let face=0;face<6;face++){
  const c=document.createElement('canvas');c.width=c.height=128;const g=c.getContext('2d');
  const grad=g.createLinearGradient(0,0,128,128);
  grad.addColorStop(0,'#272d2b');grad.addColorStop(.38,'#77776b');grad.addColorStop(.58,'#333a37');grad.addColorStop(1,'#171d1d');
  g.fillStyle=grad;g.fillRect(0,0,128,128);
  g.fillStyle='rgba(231,215,177,.48)';g.fillRect(face%2?78:19,5,face%2?12:20,118);
  g.fillStyle='rgba(220,227,217,.20)';g.fillRect(0,face%2?93:23,128,7);
  faces.push(c);
 }
 metalEnvironment=new THREE.CubeTexture(faces);metalEnvironment.needsUpdate=true;
 metalEnvironment.mapping=THREE.CubeReflectionMapping;
 return metalEnvironment;
}
function mat(color,rough=.86,metal=0){
 const m=new THREE.MeshStandardMaterial({color,roughness:rough,metalness:metal,emissive:0x000000});
 if(metal>.35){m.roughness=Math.min(.88,Math.max(.34,rough));m.envMap=getMetalEnvironment();m.envMapIntensity=.42;}

 // Distinct surface families; skin and hair use plain materials to avoid mottled faces.
 const family=familyFor(color,metal);
 if(metal>.35 && family==='metal' && color===0x704a35){m.roughness=.84;m.metalness=.65;}

 if(rough>.35 && (family!=='other'||metal>.35))m.map=textureFor(family,color);
 return m;
}
function cube(parent,x,y,z,w,h,d,m){let o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o}
function ball(parent,x,y,z,r,m){let o=new THREE.Mesh(new THREE.SphereGeometry(r,12,10),m);o.position.set(x,y,z);o.castShadow=true;parent.add(o);return o}
function cyl(parent,x,y,z,r1,r2,h,m,segments=12){let o=new THREE.Mesh(new THREE.CylinderGeometry(r1,r2,h,segments),m);o.position.set(x,y,z);o.castShadow=true;parent.add(o);return o}
function rod(parent,a,b,r,m){let v1=new THREE.Vector3(...a),v2=new THREE.Vector3(...b),dir=v2.clone().sub(v1),o=new THREE.Mesh(new THREE.CylinderGeometry(r,r,dir.length(),9),m);o.position.copy(v1.add(v2).multiplyScalar(.5));o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),dir.normalize());o.castShadow=true;parent.add(o);return o}
function addSolid(x,z,w,d){obstacles.push({x,z,w,d})}
function solid(x,y,z,w,h,d,m){cube(world,x,y,z,w,h,d,m);addSolid(x,z,w,d)}
function wall(x,z,w,d,material=wallMat){solid(x,H/2,z,w,H,d,material)}
function wallWithDoor(axis,coord,start,end,center,width){let left=center-width/2,right=center+width/2;const seg=(a,b)=>{if(b-a<.02)return;axis==='z'?wall((a+b)/2,coord,b-a,.24):wall(coord,(a+b)/2,.24,b-a)};seg(start,left);seg(right,end);if(axis==='z')cube(world,center,(H+2.55)/2,coord,width,H-2.55,.24,wallMat);else cube(world,coord,(H+2.55)/2,center,.24,H-2.55,width,wallMat);let door=makeDoor(axis,coord,center,width);return door}
function makeDoor(axis,coord,center,width){const g=new THREE.Group();world.add(g);const trim=mat(0x47382b),panel=mat(0x66503c),metal=mat(0x9a8d6c,.55,.5);if(axis==='z'){cube(g,center-width/2,1.27,coord,.11,2.55,.32,trim);cube(g,center+width/2,1.27,coord,.11,2.55,.32,trim);cube(g,center,2.57,coord,width+.14,.13,.32,trim)}else{cube(g,coord,1.27,center-width/2,.32,2.55,.11,trim);cube(g,coord,1.27,center+width/2,.32,2.55,.11,trim);cube(g,coord,2.57,center,.32,.13,width+.14,trim)}let pivot=new THREE.Group();if(axis==='z')pivot.position.set(center-width/2,0,coord);else pivot.position.set(coord,0,center-width/2);g.add(pivot);let panelMesh;if(axis==='z'){panelMesh=cube(pivot,width/2,1.24,0,width-.12,2.42,.095,panel);for(let yy of [.55,1.52])cube(pivot,width/2,yy,-.061,width-.38,.65,.025,trim);ball(pivot,width-.23,1.2,-.12,.065,metal)}else{panelMesh=cube(pivot,0,1.24,width/2,.095,2.42,width-.12,panel);for(let yy of [.55,1.52])cube(pivot,-.061,yy,width/2,.025,.65,width-.38,trim);ball(pivot,-.12,1.2,width-.23,.065,metal)}let d={axis,coord,center,width,pivot,open:false,angle:0,target:0,auto:0};doors.push(d);return d}
function toggleDoor(d,open=!d.open,manual=false){
 if(d===frontDoor()&&manual){d.manualHold=!open;d.manualUntil=open?0:Infinity;}
 if(open&&d.manualHold&&!manual)return false;
 if(!open&&d===frontDoor()&&[...customers,...zombies,...employees].some(p=>p.mode!=='dead'&&Math.abs(p.x-d.center)<.72&&Math.abs(p.z-FRONT)<.48)){
  if(!manual)return false;
  notice('Проход занят — дверь закроется, когда освободится');d.pendingClose=true;d.auto=0;return false;
 }
 d.pendingClose=false;d.open=open;AudioManager.sound('door',d.axis==='z'?d.center:d.coord,d.axis==='z'?d.coord:d.center,.5);d.target=open?Math.PI*.52:0;d.auto=open&&!manual?3:0;return true;
}
// Single source of truth for a doorway's geometry and current passability.
function doorPassability(d,x,z,r=.22,forPlanning=false){
 const across=d.axis==='z'?z-d.coord:x-d.coord;
 const lateral=d.axis==='z'?x-d.center:z-d.center;
 const half=d.width/2;
 if(Math.abs(across)>.22+r||Math.abs(lateral)>half+r)return {ok:true,reason:'outside_door'};
 if(Math.abs(lateral)>half-r-.065)return {ok:false,reason:'DOOR_JAMB'};
 if(forPlanning)return {ok:true,reason:'door_route'};
 // The panel is hinged on the negative-lateral side. Its physical collider follows
 // the animated rotation, instead of a boolean open flag or arbitrary angle threshold.
 const theta=d.angle;
 const along=lateral+half;
 const panelLen=d.width-.12;
 const localAlong=along*Math.cos(theta)+across*Math.sin(theta);
 const localDepth=-along*Math.sin(theta)+across*Math.cos(theta);
 const hitsPanel=localAlong>=-r&&localAlong<=panelLen+r&&Math.abs(localDepth)<.055+r;
 // At a wide opening angle the hinged leaf is parallel to the passage;
 // the central lane has no leaf collision. Keep jamb and closed-leaf checks.
 if(Math.abs(theta)>=1.12&&Math.abs(lateral)<=Math.min(.27,half-r-.065))
  return {ok:true,reason:'OPEN_CENTRAL_LANE'};
 return hitsPanel?{ok:false,reason:'DOOR_COLLIDER'}:{ok:true,reason:'OPEN_PASSAGE'};
}
function doorGeometrySelfTest(){
 const d=frontDoor();if(!d)return {ok:false,errors:['FRONT_DOOR_MISSING']};
 const errors=[];const radius=.20,original=d.angle;
 d.angle=Math.PI*.52;
 for(const z of [FRONT-.32,FRONT-.16,FRONT,FRONT+.16,FRONT+.32]){
  const wall=obstacles.some(o=>Math.abs(0-o.x)<o.w/2+radius&&Math.abs(z-o.z)<o.d/2+radius);
  if(wall)errors.push('WALL_COLLIDER @ z='+z.toFixed(2));
  const result=doorPassability(d,0,z,radius);
  if(!result.ok)errors.push(result.reason+' @ z='+z.toFixed(2));
  if(!isPublic(0,z,radius))errors.push('RESTRICTED_ZONE @ z='+z.toFixed(2));
 }
 d.angle=original;
 return {ok:errors.length===0,errors};
}
let doorDebug=false,doorDebugVisuals=null;
function toggleDoorDebug(){
 doorDebug=!doorDebug;
 if(doorDebugVisuals){world.remove(doorDebugVisuals);doorDebugVisuals=null;}
 if(doorDebug){
  const g=new THREE.Group();doorDebugVisuals=g;world.add(g);
  const lineMat=new THREE.LineBasicMaterial({color:0x00ff88,depthTest:false});
  const d=frontDoor();if(d){
   const pts=[[-d.width/2,0],[d.width/2,0],[d.width/2,2.55],[-d.width/2,2.55],[-d.width/2,0]];
   const geo=new THREE.BufferGeometry().setFromPoints(pts.map(q=>new THREE.Vector3(d.center+q[0],q[1],d.coord)));
   g.add(new THREE.Line(geo,lineMat));
   for(const z of [FRONT-1.1,FRONT,FRONT+1.12]){
    const m=new THREE.Mesh(new THREE.SphereGeometry(.12,8,6),new THREE.MeshBasicMaterial({color:0x00ffff,depthTest:false}));m.position.set(0,.25,z);g.add(m);
   }
  }
  for(const o of obstacles){if(Math.abs(o.z-FRONT)>1.1)continue;
   const m=new THREE.Mesh(new THREE.BoxGeometry(o.w,.08,o.d),new THREE.MeshBasicMaterial({color:0xff4444,transparent:true,opacity:.5,depthTest:false}));m.position.set(o.x,.12,o.z);g.add(m);
  }
 }
 const report=doorGeometrySelfTest();console.info('[LAST DAY DOOR TEST]',report);
 notice('F9 ДВЕРЬ: '+(doorDebug?'ДИАГНОСТИКА ВКЛ':'ВЫКЛ')+' · '+(report.ok?'ГЕОМЕТРИЯ OK':report.errors.join(',')));
}
function doorCrossingClear(d,p,r=.20){
 const center=d.axis==='z'?p.x:p.z;
 return Math.abs(center-d.center)<=d.width/2-r-.065;
}
function doorBlocked(d,x,z,r=.3){return !doorPassability(d,x,z,r).ok}
// Navigation permission is independent of static collision geometry.
function isPublic(x,z,r=.22){
 // PUBLIC ends at the service partition; staff access is never granted to customers.
 if(z>=PART-.24-r)return false;
 // A solid restricted strip behind the counter. This is checked at every movement substep.
 if(x < -2.42+r && z > -1.95-r && z < .95+r)return false;
 return true;
}
function nearestPublicTarget(x,z){
 if(isPublic(x,z,.22)&&canMove(x,z,.22))return {x,z};
 let best=null,bestD=Infinity;
 for(let zz=-5.65;zz<.94;zz+=.35)for(let xx=-7.45;xx<7.45;xx+=.35){
  if(!isPublic(xx,zz,.22)||!canMove(xx,zz,.22))continue;
  const d=(xx-x)**2+(zz-z)**2;if(d<bestD){best={x:xx,z:zz};bestD=d;}
 }
 return best||{x:0,z:-3};
}
function npcBlockReason(p,x,z,r=.22){
 if(Math.abs(x)>W-.35||z>BACK+9||z<FRONT-25)return 'WORLD_BOUNDARY';
 if(customers.includes(p)&&!isPublic(x,z,r))return 'RESTRICTED_ZONE';
 for(const o of obstacles)if(Math.abs(x-o.x)<o.w/2+r&&Math.abs(z-o.z)<o.d/2+r)return 'WALL_OR_FURNITURE_COLLIDER';
 for(const d of doors){const test=doorPassability(d,x,z,r);if(!test.ok)return test.reason;}
 return null;
}
function npcCanMove(p,x,z,r=.22){return !npcBlockReason(p,x,z,r);}

function npcMove(p,dx,dz,r=.22){
 const n=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.12));
 for(let i=0;i<n;i++){
  const nx=p.x+dx/n,nz=p.z+dz/n;
  if(npcCanMove(p,nx,p.z,r))p.x=nx;else p.stopReason=npcBlockReason(p,nx,p.z,r);
  if(npcCanMove(p,p.x,nz,r))p.z=nz;else p.stopReason=npcBlockReason(p,p.x,nz,r);
 }
}
function canMove(x,z,r=.31){if(Math.abs(x)>W-.35||z>BACK+9||z<FRONT-25)return false;for(let o of obstacles){if(Math.abs(x-o.x)<o.w/2+r&&Math.abs(z-o.z)<o.d/2+r)return false}for(let d of doors)if(doorBlocked(d,x,z,r))return false;return true}
function moveWithCollision(entity,dx,dz,r=.31){let n=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.15));for(let i=0;i<n;i++){let x=entity.x+dx/n,z=entity.z+dz/n;if(canMove(x,entity.z,r))entity.x=x;if(canMove(entity.x,z,r))entity.z=z}}
let wallMat,floorMat,steel,wood,accent,dirty,skin,cloth;
function makeTexture(base,seed=1){let c=document.createElement('canvas');c.width=c.height=256;let ctx=c.getContext('2d');ctx.fillStyle=base;ctx.fillRect(0,0,256,256);let rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};for(let i=0;i<9000;i++){let v=Math.floor(rand()*60);ctx.fillStyle=`rgba(${rand()>.5?0:230},${rand()>.5?0:225},${rand()>.5?0:212},${rnd(.015,.07)})`;ctx.fillRect(rand()*256,rand()*256,rand()*5+1,rand()*5+1)}for(let i=0;i<18;i++){ctx.strokeStyle=`rgba(34,28,22,${rnd(.08,.24)})`;ctx.lineWidth=rnd(1,4);ctx.beginPath();let x=rand()*256,y=rand()*256;ctx.moveTo(x,y);ctx.lineTo(x+rand()*30,y+rand()*90);ctx.stroke()}let t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.encoding=THREE.sRGBEncoding;return t}
function textPanel(text,x,y,z,w,h,rot=0,bg='#c8b99b',fg='#2b2923'){let c=document.createElement('canvas');c.width=512;c.height=256;let ctx=c.getContext('2d');ctx.fillStyle=bg;ctx.fillRect(0,0,512,256);for(let i=0;i<900;i++){ctx.fillStyle='rgba(30,20,15,.04)';ctx.fillRect(Math.random()*512,Math.random()*256,Math.random()*7+1,Math.random()*7+1)}ctx.fillStyle=fg;ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='bold 54px Arial';let lines=text.split('\n');lines.forEach((t,i)=>ctx.fillText(t,256,128+(i-(lines.length-1)/2)*65,475));let tex=new THREE.CanvasTexture(c);tex.encoding=THREE.sRGBEncoding;let mesh=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:tex,side:THREE.DoubleSide}));mesh.position.set(x,y,z);mesh.rotation.y=rot;world.add(mesh);return mesh}
function makeWindow(x,z,width=2.2){const frame=mat(0x51483b);cube(world,x,2.3,z,width+.18,2.1,.18,frame);cube(world,x,2.3,z,width,1.9,.045,new THREE.MeshStandardMaterial({color:0x91a29a,roughness:.18,metalness:.08,transparent:true,opacity:.17,depthWrite:false}));cube(world,x,2.3,z,width,.055,.21,frame);cube(world,x,2.3,z,.07,1.9,.21,frame);cube(world,x,1.26,z,width+.25,.17,.32,wallMat);cube(world,x,3.36,z,width+.25,.14,.25,wallMat)}
function makePanorama(x,z,w){addSolid(x,z,w,.13);const frame=mat(0x414947,.65,.65);cube(world,x,1.99,z,w,2.95,.055,new THREE.MeshStandardMaterial({color:0x94a9a6,roughness:.18,metalness:.12,transparent:true,opacity:.17,depthWrite:false,side:THREE.DoubleSide}));for(let side of [-1,1])cube(world,x+side*w/2,1.99,z,.075,3.04,.18,frame);cube(world,x,1.99,z,w,.065,.18,frame);cube(world,x,3.47,z,w,.10,.2,frame);cube(world,x,.51,z,w,.10,.2,frame)}

let hiringBoard=null,neonSign=null,neonLamp=null,ceilingFixtures=[];
function labelCanvas(text,bg='#33281e',fg='#e7d6b6'){
 let c=document.createElement('canvas');c.width=1024;c.height=256;let q=c.getContext('2d');q.fillStyle=bg;q.fillRect(0,0,1024,256);q.fillStyle=fg;q.textAlign='center';q.textBaseline='middle';q.font='bold 100px Arial';q.fillText(text,512,130,980);let t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t}
function addFacadeDetails(){
 const woodFrame=mat(0x514034),cork=mat(0x8c6d46),paper=mat(0xd2c3a3);
 const g=new THREE.Group();g.position.set(2.5,1.55,FRONT-.22);world.add(g);cube(g,0,0,0,1.55,1.05,.10,woodFrame);cube(g,0,0,-.062,1.38,.89,.025,cork);
 for(let i=0;i<3;i++){cube(g,-.42+i*.42,-.08,-.085,.33,.52,.015,paper);ball(g,-.42+i*.42,.18,-.11,.033,mat(0xa45537))}
 const heading=new THREE.Mesh(new THREE.PlaneGeometry(1.33,.19),new THREE.MeshBasicMaterial({map:labelCanvas('НАЁМ СОТРУДНИКОВ'),transparent:false}));heading.position.set(0,.34,-.101);g.add(heading);hiringBoard={x:2.5,z:FRONT-.22};
 const n=new THREE.Group();n.position.set(0,3.68,FRONT-.33);world.add(n);cube(n,0,0,.11,4.0,.16,.12,mat(0x232a26,.7,.65));const letters='КОРДОН';neonSign=[];for(let i=0;i<letters.length;i++){let canvas=document.createElement('canvas');canvas.width=128;canvas.height=160;let g=canvas.getContext('2d');g.clearRect(0,0,128,160);g.textAlign='center';g.textBaseline='middle';g.font='bold 117px Arial';g.lineJoin='round';g.lineWidth=13;g.strokeStyle='#136e36';g.strokeText(letters[i],64,82);g.lineWidth=5;g.strokeStyle='#a1ffad';g.strokeText(letters[i],64,82);g.fillStyle='#64f58d';g.fillText(letters[i],64,82);let tex=new THREE.CanvasTexture(canvas);let m=new THREE.MeshBasicMaterial({map:tex,transparent:true,side:THREE.DoubleSide,depthWrite:false});let glyph=new THREE.Mesh(new THREE.PlaneGeometry(.56,.69),m);glyph.position.set((2.5-i)*.57,0,-.035);glyph.rotation.y=Math.PI;n.add(glyph);neonSign.push(glyph)}neonLamp=new THREE.PointLight(0x4aa76b,.35,5,2);neonLamp.position.set(0,3.5,FRONT-.55);scene.add(neonLamp);
 for(const [x,z] of [[-4,-1.5],[2,-2],[-3,3.5],[3.5,4.3]]){const m=mat(0x424541,.65,.55);cube(world,x,3.66,z,.75,.20,.46,m);cube(world,x,3.54,z,.63,.045,.34,mat(0x8f7941,.85));const light=new THREE.SpotLight(0xe3c889,1.6,8.5,Math.PI/3.25,.78,2);
 light.position.set(x,3.43,z);light.target.position.set(x,.05,z);scene.add(light);scene.add(light.target);
 light.castShadow=ceilingFixtures.length<2;
 if(light.castShadow){light.shadow.mapSize.set(512,512);light.shadow.bias=-.00035;light.shadow.normalBias=.035;light.shadow.camera.near=.3;light.shadow.camera.far=8.5;}
 ceilingFixtures.push(light)}
}
function openHiringBoard(){
 hiringMenuActive=true;
 showModal('ДОСКА НАЙМА','Разведчик — работает за кадром и каждый вечер приносит детали для улучшений; охранник — защита; кассир — обслуживание. Стоимость найма: 30 жетонов.',[]);
 refreshHiringBoard();
}
function refreshHiringBoard(){
 if(!hiringMenuActive||!modalOpen)return;
 const container=$('modalButtons');container.replaceChildren();
 for(const [name,day] of [['Разведчик',1],['Охранник',2],['Кассир',3]]){
  const hired=state.staff.some(v=>v===name||v?.role===name);
  const locked=state.day<day;
  const button=document.createElement('button');button.type='button';button.className='action';
  button.textContent=hired?name+' — НАНЯТ':locked?name+' — С ДНЯ '+day:name+' — 30 жетонов';
  button.disabled=hired||locked;button.style.pointerEvents='auto';
  button.addEventListener('click',event=>{
   event.preventDefault();event.stopPropagation();
   if(state.staff.some(v=>v===name||v?.role===name)||state.day<day){refreshHiringBoard();return}
   if(state.coins<30){$('modalText').textContent='Недостаточно жетонов для найма '+name.toLowerCase()+'. Нужно 30, есть '+state.coins+'.';return}
   state.coins-=30;state.staff.push(name);spawnEmployee(name);saveGame();
   $('modalText').textContent=name+' — НАНЯТ. Сотрудник добавлен. Осталось жетонов: '+state.coins+'.';
   refreshHiringBoard();
  },{once:true});container.appendChild(button);
 }
 const close=document.createElement('button');close.type='button';close.className='action';close.textContent='ЗАКРЫТЬ';
 close.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();hideModal()},{once:true});container.appendChild(close);
}

let moonDisc=null;let employees=[];
function spawnEmployee(role){
 // The scout is an off-screen staff record only: no mesh, collider or NPC array entry.
 if(role==='Разведчик')return;
 if(employees.some(e=>e.role===role))return;
 const positions={'Охранник':[0,-9.0],'Кассир':[-5.65,-.55]};
 const [x,z]=positions[role]||[0,0];
let p=npc(role==='Охранник'?2:role==='Кассир'?1:0,x,z);p.role=role;p.mode='employee';p.workTimer=0;p.workState='В кафе';p.mesh.userData.employee=true;
 if(role==='Охранник'){p.patrolIndex=0;p.guardState='PATROLLING';p.attackPhase=0;p.attackCooldown=0;attachGuardCrowbar(p)}
 if(role==='Кассир'){p.mesh.rotation.y=Math.PI; p.mesh.position.set(x,0,z)}
 employees.push(p);
}
function restoreEmployees(){
 for(const e of employees)removeNpc(e);
 employees=[];
 for(const entry of state.staff||[])spawnEmployee(typeof entry==='string'?entry:entry.role);
}
function scoutHired(){return !!state?.staff?.some(v=>(typeof v==='string'?v:v?.role)==='Разведчик')}
function scoutEveningDelivery(){
 if(!scoutHired()||elapsed<540||state.scoutDeliveryDay===state.day)return;
 const amount=2+Math.floor(Math.random()*3);
 const before=Number(state.parts)||0;
 state.parts=before+amount;
 state.scoutDeliveryDay=state.day;
 state.scoutLastLoot=amount;
 saveGame();
 if(state.parts===before+amount)notice('Разведчик вернулся с вылазки. В коробку добавлено: +'+amount+' детали');
}
function attachGuardCrowbar(e){
 const hand=e.mesh.userData.arms?.[0];if(!hand)return;
 const iron=new THREE.MeshStandardMaterial({color:0x424b4a,metalness:.82,roughness:.44});
 const bar=new THREE.Group();bar.position.set(0,-.45,.02);hand.add(bar);
 cyl(bar,0,-.23,0,.042,.042,.73,iron);
 const tip=cyl(bar,.075,-.60,0,.042,.042,.23,iron);tip.rotation.z=-.8;
 cube(bar,.15,-.69,0,.12,.055,.085,iron);e.crowbar=bar;
}
const GUARD_PATROL=[[-4,-9],[0,-10],[4,-9],[3,-12],[-3,-12]];
function employeeUpdate(dt){for(const e of employees){e.workTimer+=dt;
 if(e.role==='Кассир'){
  e.workState='Ожидает заказ';e.mesh.position.set(-5.65,0,-.55);e.x=-5.65;e.z=-.55;e.mesh.rotation.y=Math.PI;
  const p=customers.find(c=>c.mode==='wait');if(p&&e.workTimer>6){const available=p.order===1?state.water>0:state.food>0;if(available){e.workTimer=0;serve(p);e.workState='Обслуживает'}else e.workState='Нет запасов'}
 }else if(e.role==='Охранник'){
  if(!Number.isFinite(e.life))e.life=100;
  e.attackCooldown=Math.max(0,(e.attackCooldown||0)-dt);
  const threats=zombies.filter(z=>z.mode!=='dead'&&z.life>0&&Math.hypot(z.x,z.z+10)<13);
  threats.sort((a,b)=>Math.hypot(a.x-e.x,a.z-e.z)-Math.hypot(b.x-e.x,b.z-e.z));
  const z=threats[0],dist=z?Math.hypot(z.x-e.x,z.z-e.z):Infinity;
  const arm=e.mesh.userData.arms?.[0];
  if(z&&dist<9){
   e.guardState=dist>1.55?'CHASING':'ATTACKING';e.workState=dist>1.55?'Преследует зомби':'Атакует ломом';
   if(dist>1.55){moveNpc(e,z.x,z.z,dt,1.85);e.attackPhase=0;}
   else{e.mesh.rotation.y=Math.atan2(z.x-e.x,z.z-e.z);if(e.attackCooldown<=0){e.attackCooldown=1.15;e.attackPhase=.001;}}
   if(e.attackPhase>0){e.attackPhase+=dt;const t=e.attackPhase/0.52;
    if(arm)arm.rotation.x=-1.65*Math.sin(Math.min(1,t)*Math.PI);
    if(t>=.52/ .52 && !e.attackLanded){e.attackLanded=true;
     if(z.mode!=='dead'&&z.life>0&&Math.hypot(z.x-e.x,z.z-e.z)<1.85){AudioManager.sound('hit',z.x,z.z,.5);z.life-=17;if(z.life<=0){AudioManager.sound('death',z.x,z.z,.7);z.mode='dead';zombies=zombies.filter(q=>q!==z);bodies.push(z);z.mesh.rotation.z=-Math.PI/2;z.mesh.position.y=.35;stats.kills++}}}
    if(t>=1){e.attackPhase=0;e.attackLanded=false;if(arm)arm.rotation.x=0;}
   }
  }else{
   e.guardState='PATROLLING';e.workState='Патрулирует улицу';e.attackPhase=0;e.attackLanded=false;
   if(arm)arm.rotation.x=0;
   const target=GUARD_PATROL[e.patrolIndex||0];if(moveNpc(e,target[0],target[1],dt,1.2)<.45)e.patrolIndex=((e.patrolIndex||0)+1)%GUARD_PATROL.length;
  }
 }
}}
function attachStaffOnlySign(door){
 if(!door)return;
 const c=document.createElement('canvas');c.width=512;c.height=160;
 const g=c.getContext('2d');g.fillStyle='#262a28';g.fillRect(0,0,512,160);
 g.strokeStyle='#85877d';g.lineWidth=12;g.strokeRect(8,8,496,144);
 g.fillStyle='#e5e0d4';g.font='bold 65px Arial';g.textAlign='center';g.textBaseline='middle';g.fillText('STAFF ONLY',256,85);
 const tex=new THREE.CanvasTexture(c);tex.encoding=THREE.sRGBEncoding;
 const sign=new THREE.Mesh(new THREE.PlaneGeometry(.99,.31),new THREE.MeshStandardMaterial({map:tex,roughness:.78,metalness:.15,side:THREE.FrontSide}));
 sign.position.set(door.width*.5,1.95,-.067);sign.rotation.y=Math.PI;
 door.pivot.add(sign);
}
function createCafe(){const ground=mat(0x43473e);cube(world,0,-.24,-6,200,.45,200,ground);floorMat=new THREE.MeshStandardMaterial({color:0xb0afa6,roughness:1,metalness:0,emissive:0x000000});floorMat.map=new THREE.TextureLoader().load('assets/textures/texture_1.jpg');floorMat.map.wrapS=floorMat.map.wrapT=THREE.RepeatWrapping;floorMat.map.repeat.set(4,3);floorMat.map.encoding=THREE.sRGBEncoding;cube(world,0,-.055,0,16,.12,12,floorMat);wallMat=new THREE.MeshStandardMaterial({color:0xb6b2a7,roughness:1,metalness:0,emissive:0x000000});wallMat.map=new THREE.TextureLoader().load('assets/textures/texture_2.jpg');wallMat.map.colorSpace=THREE.SRGBColorSpace;wallMat.map.wrapS=wallMat.map.wrapT=THREE.RepeatWrapping;wallMat.needsUpdate=true;steel=mat(0x545b58,.55,.55);wood=mat(0x63503c);accent=mat(0xa77a4b);dirty=mat(0x454b44);
// Фасад: стена — окно — стена — дверь — стена — окно — стена.
const sections=[[-8,-7.4],[-3.5,-.85],[.85,3.5],[7.4,8]];sections.forEach(([a,b])=>wall((a+b)/2,FRONT,b-a,.28));for(let x of [-5.45,5.45]){cube(world,x,.25,FRONT,3.9,.50,.28,wallMat);cube(world,x,3.49,FRONT,3.9,.62,.28,wallMat);makePanorama(x,FRONT,3.82)}cube(world,0,3.3,FRONT,1.7,1,.28,wallMat);let front=makeDoor('z',FRONT,0,1.7);front.auto=0;raidPane=new THREE.Group();world.add(raidPane);raidPane.visible=false;for(let x of [-5.45,5.45])for(let j=0;j<5;j++){let crack=rod(raidPane,[x-.65+j*.26,1.7,-6.19],[x-.3+j*.21,2.6,-6.19],.014,mat(0x242625));} 
wall(-8,0,.28,12);wall(8,0,.28,12);wallWithDoor('z',PART,-8,8,1.5,1.75);let rear=wallWithDoor('z',BACK,-8,8,0,1.75);attachStaffOnlySign(doors.find(d=>d.axis==='z'&&Math.abs(d.coord-PART)<.02));cube(world,0,H+.05,0,16.3,.18,12.3,mat(0x494b43));
// Выделенный путь: перед дверями и в центральном коридоре нет мебели.
// Стойка слева от входа, линия выдачи со стороны посетителей.
cube(world,-4.55,.53,-1.3,3.35,1.06,.78,wood);cube(world,-4.55,1.1,-1.3,3.65,.13,.95,mat(0x82725a));addSolid(-4.55,-1.3,3.5,.8);cube(world,-4.55,1.2,-1.7,2.5,.16,.22,mat(0x393e3b));
// Tip jar is visual only; no collider or interaction.
{const jar=new THREE.Group();jar.position.set(-3.25,1.19,-1.26);world.add(jar);
 const glass=new THREE.MeshPhysicalMaterial({color:0xc6d5cb,metalness:0,roughness:.14,transparent:true,opacity:.28,depthWrite:false,side:THREE.DoubleSide});
 cyl(jar,0,.19,0,.17,.17,.36,glass);cyl(jar,0,.015,0,.17,.17,.035,mat(0x565e58,.65,.25));
 cyl(jar,0,.39,0,.18,.18,.035,mat(0x646a60,.65,.45));
 // Stable, hand-tuned scatter: varied coin diameters, metals, tilts and heights.
 // All coin centres remain within the jar's inner radius; no per-frame randomness.
 const coinSpots=[
  [-.074,-.049,.033,.023, .10,-.12,0], [.032,-.072,.044,.025,-.13,.08,1],
  [.083,.015,.037,.024, .21,.18,2],[-.013,.071,.047,.025,-.09,-.18,0],
  [-.095,.031,.034,.027,.16,.10,1],[.045,.050,.033,.029,-.19,.11,2],
  [-.031,-.019,.043,.040,.15,-.08,1],[.088,-.043,.030,.041,-.11,.22,0],
  [-.062,.083,.032,.041,.09,-.21,2],[.008,-.099,.029,.044,.19,.06,1],
  [.016,.004,.045,.056,-.18,.11,0],[-.101,-.007,.027,.053,.17,-.06,2],
  [.060,.087,.030,.056,-.13,.15,1],[-.037,.043,.035,.069,.12,.13,0],
  [.052,-.021,.036,.072,-.12,-.15,2],[.001,-.047,.031,.081,.23,.07,1]
 ];
 const coinFinishes=[
  new THREE.MeshStandardMaterial({color:0x92938c,metalness:.65,roughness:.57}),
  new THREE.MeshStandardMaterial({color:0x80634d,metalness:.58,roughness:.65}),
  new THREE.MeshStandardMaterial({color:0xa18b5c,metalness:.64,roughness:.59})
 ];
 coinSpots.forEach(([x,z,r,y,rx,rz,finish],i)=>{
  const thickness=.007+(i%4)*.0015;
  const coin=cyl(jar,x,y,z,r,r,thickness,coinFinishes[finish],14);
  coin.rotation.set(rx,(i*2.39996)%(Math.PI*2),rz);
 });
 // Банка без надписей и взаимодействия.
}
// Зал: компактные столики по правой стене, не на маршруте к двери.
for(let z of [-3.7,-.55]){cube(world,5.1,.73,z,1.35,.12,1.1,wood);cyl(world,5.1,.37,z,.10,.1,.68,steel);addSolid(5.1,z,1.45,1.25);for(let xx of [4.0,6.2]){cube(world,xx,.45,z,.55,.10,.55,wood);cube(world,xx,.23,z,.1,.4,.1,steel)}}
// Подсобка: установки у стен; проход вдоль x=0 всегда свободен.
makeMachine('filter',-6.35,4.65);makeMachine('grinder',-3.9,4.7);makeMachine('grill',-3.1,2.65);makeMachine('fridge',-6.85,-.18);makeMachine('bed',1.9,5.0);makeMachine('crate',5.5,4.2);
// Бочка сразу снаружи у задней стены, доступ с прохода.
makeMachine('barrel',-2.8,8.1);for(let i=0;i<30;i++){let x=rnd(-7.4,7.4),z=rnd(-5.3,5.4);if(Math.abs(x)<2.6||Math.abs(z-PART)<1.5)continue;let o=cube(world,x,.03,z,rnd(.08,.3),.04,rnd(.08,.3),pick([dirty,steel,wood]));o.rotation.y=rnd(0,6)}
// Плакаты на боковых стенах, обычная печать без свечения.
textPanel('ЗОНА\nКАРАНТИНА',-7.82,2.3,-2.3,1.35,.85,Math.PI/2,'#d2c6a6','#812c25');textPanel('ОПАСНО\nЗАРАЖЁННЫЕ',7.82,2.2,-2.7,1.45,.86,-Math.PI/2,'#d5c6a1','#6e2c24');textPanel('ПРОВЕРЯЙ\nКАЖДОГО',-7.82,2.25,3.8,1.2,.85,Math.PI/2);
createStreet();setupWindowControls();addFacadeDetails();setupWallLevers();}
const UPGRADES={
 grinderLevel:{name:'Мясорубка',output:[3,5],cost:[5],unit:'мяса за цикл'},
 filterLevel:{name:'Опреснитель',output:[3,5],cost:[5],unit:'воды за цикл'},
 grillLevel:{name:'Жаровня',output:[1,3,5],cost:[5,10],unit:'пайков за цикл'}
};
function openPartsUpgrades(){
 const buttons=[],details=['Деталей в коробке: '+(state.parts||0)];
 for(const [key,info] of Object.entries(UPGRADES)){
  const level=Math.max(1,Math.min(info.output.length,state[key]||1));
  let line=info.name+' — уровень '+level+'/'+info.output.length+'\nСейчас: '+info.output[level-1]+' '+info.unit;
  if(level<info.output.length){const cost=info.cost[level-1];line+='\nПосле улучшения: '+info.output[level]+' '+info.unit+'\nСтоимость: '+cost+' деталей';
   buttons.push([info.name+': '+((state.parts||0)>=cost?'УЛУЧШИТЬ':'НЕДОСТАТОЧНО ДЕТАЛЕЙ')+' ('+cost+')',()=>{
    if((state[key]||1)!==level)return openPartsUpgrades();
    if((state.parts||0)<cost)return openPartsUpgrades();
    state.parts-=cost;state[key]=level+1;saveGame();openPartsUpgrades();
   }]);
  }else line+='\nМАКСИМАЛЬНЫЙ УРОВЕНЬ';details.push(line);
 }
 showModal('УЛУЧШЕНИЯ ОБОРУДОВАНИЯ',details.join('\n\n'),buttons);
 const buttonsDom=$('modalButtons').querySelectorAll('button');
 let index=0;for(const [key,info] of Object.entries(UPGRADES)){const level=state[key]||1;if(level>=info.output.length)continue;
  if(buttonsDom[index])buttonsDom[index].disabled=(state.parts||0)<info.cost[level-1];index++;
 }
}

const embeddedAudioAssets={game:"./assets/audio/music/gameplay.ogg",menu:"./assets/audio/music/menu.ogg",zombie1:"./assets/audio/zombies/zombie1.ogg",zombie2:"./assets/audio/zombies/zombie2.ogg",zombie3:"./assets/audio/zombies/zombie3.ogg",human1:"./assets/audio/humans/human1.ogg",human2:"./assets/audio/humans/human2.ogg",human3:"./assets/audio/humans/human3.ogg"};
/* LAST DAY audio: real OGG files for music and synthetic vocal samples; procedural ambience/effects retained. */
const AudioManager=(()=>{
 const KEY='last_day_audio_preferences_v1',defaults={master:70,music:25,ambient:50,effects:75,mute:false};
 let cfg={...defaults};try{cfg={...cfg,...JSON.parse(localStorage.getItem(KEY)||'{}')}}catch(_){}
 let ctx,master,buses={},layers={},last={},voices=0,gameBlend=0,clock=0,noiseBuffer;
 let decoded={},musicTracks={},sampleVoices=0;
 async function decodeAssets(){if(!ctx)return;for(const [name,url] of Object.entries(embeddedAudioAssets)){if(decoded[name])continue;try{const response=await fetch(new URL(url,document.baseURI));if(!response.ok)throw new Error('HTTP '+response.status+' '+url);decoded[name]=await ctx.decodeAudioData(await response.arrayBuffer())}catch(e){console.warn('Audio asset load/decode failed:',name,e)}}}
 function playSample(name,x,z,vol=1,preview=false){if(!ctx||ctx.state!=='running'||!decoded[name]||sampleVoices>=5||cfg.mute)return false;const t=ctx.currentTime,src=ctx.createBufferSource(),g=ctx.createGain();src.buffer=decoded[name];src.playbackRate.value=.94+Math.random()*.12;g.gain.value=vol*(preview?1:distance(x,z));if(g.gain.value<.025)return false;src.connect(g);g.connect(buses.effects);sampleVoices++;src.onended=()=>{sampleVoices--;src.disconnect();g.disconnect()};src.start();return true}
 function startMusic(){if(!ctx||ctx.state!=='running')return;for(const name of ['menu','game']){if(musicTracks[name]||!decoded[name])continue;const src=ctx.createBufferSource(),gain=ctx.createGain();src.buffer=decoded[name];src.loop=true;gain.gain.value=0;src.connect(gain);gain.connect(buses.music);src.start();musicTracks[name]={src,gain}}}
 function musicPreview(name){if(!ctx||ctx.state!=='running'||!decoded[name])return false;const src=ctx.createBufferSource(),gain=ctx.createGain();src.buffer=decoded[name];gain.gain.value=.6;src.connect(gain);gain.connect(buses.music);src.onended=()=>{src.disconnect();gain.disconnect()};src.start();src.stop(ctx.currentTime+8);return true}

 const clamp01=v=>Math.max(0,Math.min(1,v));
 function init(){if(ctx)return;const C=window.AudioContext||window.webkitAudioContext;if(!C)return;ctx=new C();master=ctx.createGain();master.connect(ctx.destination);for(const k of ['music','ambient','effects']){buses[k]=ctx.createGain();buses[k].connect(master)}noiseBuffer=ctx.createBuffer(1,ctx.sampleRate*3,ctx.sampleRate);let a=noiseBuffer.getChannelData(0);for(let i=0;i<a.length;i++)a[i]=(Math.random()*2-1);levels();
  function layer(name,kind,freq,gain,filter){let o=ctx.createOscillator(),f=ctx.createBiquadFilter(),v=ctx.createGain();o.type=kind;o.frequency.value=freq;f.type='lowpass';f.frequency.value=filter;v.gain.value=0;o.connect(f);f.connect(v);v.connect(buses[name.startsWith('menu')||name.startsWith('game')?'music':'ambient']);o.start();layers[name]={o,v,base:gain}}
  layer('menu','sine',55,.22,180);layer('menuHigh','triangle',82.41,.045,220);layer('game','sine',48.99,.12,140);layer('gameHigh','triangle',73.42,.035,180);layer('fridge','sine',61,.13,120);layer('grinder','sawtooth',74,.15,420);layer('grinderMotor','triangle',111,.10,350);layer('waterMotor','triangle',84,.09,250);layer('grillHeat','triangle',43,.035,140);layer('menuChord','triangle',110,.065,320);layer('gameChord','triangle',98,.05,270);
  let n=ctx.createBufferSource(),f=ctx.createBiquadFilter(),g=ctx.createGain();n.buffer=noiseBuffer;n.loop=true;f.type='lowpass';f.frequency.value=320;g.gain.value=0;n.connect(f);f.connect(g);g.connect(buses.ambient);n.start();layers.wind={v:g,base:.24};
  function noiseLayer(name,cutoff,base){let src=ctx.createBufferSource(),fl=ctx.createBiquadFilter(),gain=ctx.createGain();src.buffer=noiseBuffer;src.loop=true;fl.type='lowpass';fl.frequency.value=cutoff;gain.gain.value=0;src.connect(fl);fl.connect(gain);gain.connect(buses.ambient);src.start();layers[name]={v:gain,base,filter:fl}}
  noiseLayer('city',90,.045);noiseLayer('waterFlow',950,.13);noiseLayer('grillSizzle',2700,.12);noiseLayer('grinderRattle',580,.16);
 }
 async function unlock(){try{init();if(!ctx)return false;if(ctx.state!=='running')await ctx.resume();if(ctx.state==='running'){await decodeAssets();startMusic()}return ctx.state==='running'}catch(e){console.warn('Audio unavailable:',e.message);return false}}
 function levels(){if(!ctx)return;master.gain.setTargetAtTime(cfg.mute?0:clamp01(cfg.master/100),ctx.currentTime,.04);for(const k of Object.keys(buses))buses[k].gain.setTargetAtTime(clamp01(cfg[k]/100),ctx.currentTime,.04)}
 function set(k,v){if(!(k in defaults))return;cfg[k]=k==='mute'?!!v:Math.max(0,Math.min(100,Number(v)||0));try{localStorage.setItem(KEY,JSON.stringify(cfg))}catch(_){}levels()}
 function distance(x,z){if(!player)return 1;const d=Math.hypot(player.x-x,player.z-z);let v=1/(1+(d/6)**2);if(player.z>-6&&z<-8||player.z<-8&&z>-6)v*=.53;return v}
 function sound(kind,x,z,vol=1){if(!ctx||ctx.state!=='running'||cfg.mute)return; if(['groan','breath','zombieAlert','zombieAttack','zombieHurt','death','scare','human','humanHurt','humanDeath'].includes(kind)){const cooldown={groan:3,breath:3,zombieAlert:2,zombieAttack:.55,zombieHurt:.25,death:.5,scare:1,human:2,humanHurt:.5,humanDeath:.5}[kind];if(ctx.currentTime-(last['sample:'+kind]??-100)<cooldown)return;last['sample:'+kind]=ctx.currentTime;const zombie=['groan','breath','zombieAlert','zombieAttack','zombieHurt','death'].includes(kind);const id=(zombie?'zombie':'human')+(1+Math.floor(Math.random()*3));if(playSample(id,x,z,vol*(zombie?.95:1.15)))return;}if(voices>=9)return;const now=ctx.currentTime;if(now-(last[kind]||0)<({groan:3.5,breath:4,scare:1.5,attack:.3,hit:.15,death:.3,metal:4,windGust:5,click:4,door:.3,shutter:.35,footstep:.19,zombieAlert:2,zombieHurt:.28,zombieAttack:.6,human:.9,waterDrop:.45,grillDone:.5,waterDone:.5,grinderStart:.5,grinderStop:.5,ui:.08,thud:.3}[kind]||.12))return;last[kind]=now;let v=vol*(Number.isFinite(x)?distance(x,z):1);if(v<.018)return;voices++;let duration=({groan:.9,breath:.65,scare:.38,attack:.4,hit:.23,miss:.16,death:1.15,metal:.9,windGust:1.7,click:.09,door:.6,shutter:.75,footstep:.15,zombieAlert:.85,zombieHurt:.43,zombieAttack:.48,human:.52,waterDrop:.27,grillDone:.55,waterDone:.45,grinderStart:.7,grinderStop:.65,ui:.09,thud:.36}[kind]||.5),out=ctx.createGain(),filter=ctx.createBiquadFilter();filter.type='lowpass';filter.frequency.value=kind==='hit'?950:kind==='metal'?520:kind==='miss'?1800:kind==='scare'?850:kind==='footstep'?300:kind==='waterDrop'?1700:kind==='shutter'?650:kind==='door'?570:kind==='zombieAlert'?480:kind==='human'?730:kind==='grinderStart'?440:kind==='grillDone'?1300:350;out.gain.setValueAtTime(.0001,now);out.gain.exponentialRampToValueAtTime(Math.max(.0002,v*.38),now+.025);out.gain.exponentialRampToValueAtTime(.0001,now+duration);filter.connect(out);out.connect(buses[kind==='windGust'||kind==='metal'?'ambient':'effects']);let src;
 if(['hit','miss','metal','click','windGust','door','shutter','footstep','waterDrop','grillDone','waterDone','grinderStart','grinderStop','ui','thud'].includes(kind)){src=ctx.createBufferSource();src.buffer=noiseBuffer;src.playbackRate.value=.75+Math.random()*.45;src.connect(filter)}else{src=ctx.createOscillator();src.type=kind==='scare'?'triangle':'sawtooth';let f=kind==='scare'?205:kind==='death'?75:kind==='attack'?105:kind==='breath'?88:kind==='human'?160:kind==='zombieAlert'?95:kind==='zombieAttack'?130:kind==='zombieHurt'?102:64;src.frequency.setValueAtTime(f*(.90+Math.random()*.2),now);src.frequency.exponentialRampToValueAtTime(Math.max(30,f*.64),now+duration);src.connect(filter)}src.onended=()=>{voices=Math.max(0,voices-1);try{src.disconnect();filter.disconnect();out.disconnect()}catch(_){}};src.start(now);src.stop(now+duration+.01)}
 function tick(dt){if(!ctx||ctx.state!=='running')return;clock+=dt;const live=running&&!paused&&!dead,menu=!running||paused;gameBlend+=(Number(live)-gameBlend)*Math.min(1,dt*.8);const inside=player?.z>-8;const tm=ctx.currentTime;for(const [name,m] of Object.entries(musicTracks)){m.gain.gain.setTargetAtTime(name==='game'?.75*gameBlend:.8*(1-gameBlend),tm,.6)}for(const [name,l] of Object.entries(layers)){let target=0;if(['menu','menuHigh','game','gameHigh'].includes(name))target=0;else if(name==='menuChord') {target=0;l.o.frequency.setTargetAtTime([110,123.47,98,130.81][Math.floor(clock/22)%4],tm,2)}else if(name==='gameChord'){target=0;l.o.frequency.setTargetAtTime([98,87.31,110,82.41][Math.floor(clock/28)%4],tm,3)}else if(name==='fridge')target=l.base*gameBlend*(inside?.8:.12)*distance(-6,-1);else if(name==='grinder')target=l.base*gameBlend*(typeof waterJob!=='undefined'&&false?0:(typeof grinderSoundUntil!=='undefined'&&grinderSoundUntil>performance.now()?distance(0,1):0));else if(name==='grinderMotor'||name==='grinderRattle')target=l.base*gameBlend*(grinderSoundUntil>performance.now()?distance(0,1):0);else if(name==='waterMotor'||name==='waterFlow')target=l.base*gameBlend*(waterJob>0?distance(-2,1):0);else if(name==='grillHeat'||name==='grillSizzle')target=l.base*gameBlend*(cookJob>0?distance(2,1):0);else if(name==='city')target=l.base*gameBlend*(inside?.24:1);else if(name==='wind')target=l.base*gameBlend*(inside?.24:.9)*(1+.18*Math.sin(clock*.19));l.v.gain.setTargetAtTime(target,tm,.24)}if(live&&clock-(last.ambientEvent||0)>8){last.ambientEvent=clock;if(Math.random()<.35)sound('metal',undefined,undefined,.22);if(Math.random()<.35)sound('windGust',undefined,undefined,.32);if(Math.random()<.26)sound('door',-2,-14,.24)} }
 async function test(){const ok=await unlock();if(!ok||!ctx){return 'Браузер не разрешил запуск звука. Нажмите ещё раз или проверьте разрешения вкладки.'}if(cfg.mute||cfg.master===0||cfg.effects===0)return 'Звук отключён в настройках: включите общую громкость и эффекты.';const t=ctx.currentTime,o=ctx.createOscillator(),v=ctx.createGain();o.type='sine';o.frequency.setValueAtTime(440,t);o.frequency.linearRampToValueAtTime(550,t+.24);v.gain.setValueAtTime(.0001,t);v.gain.linearRampToValueAtTime(.28,t+.035);v.gain.exponentialRampToValueAtTime(.0001,t+.42);o.connect(v);v.connect(buses.effects);o.onended=()=>{o.disconnect();v.disconnect()};o.start(t);o.stop(t+.44);return 'Тестовый сигнал отправлен на аудиовыход. Если его не слышно, проверьте звук вкладки и устройства.'}
 async function testCategory(kind){const ok=await unlock();if(!ok)return 'Аудиоконтекст заблокирован браузером';if(cfg.mute||cfg.master===0||cfg[kind]===0)return 'Эта категория отключена настройками';if(kind==='effects'){sound('hit',undefined,undefined,.85);return 'Воспроизведён пример эффекта'}if(kind==='ambient'){sound('windGust',undefined,undefined,1);return 'Воспроизведён пример окружения'}const t=ctx.currentTime,o=ctx.createOscillator(),g=ctx.createGain();o.type='triangle';o.frequency.value=164.81;g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(.35,t+.18);g.gain.exponentialRampToValueAtTime(.0001,t+1.6);o.connect(g);g.connect(buses.music);o.onended=()=>{o.disconnect();g.disconnect()};o.start(t);o.stop(t+1.65);return 'Воспроизведён пример музыки'}
 function panel(){const wrap=document.createElement('div');wrap.className='audioSettings';let title=document.createElement('strong');title.textContent='ЗВУК';wrap.append(title);for(const [k,label] of [['master','Общая громкость'],['music','Музыка'],['ambient','Окружение'],['effects','Эффекты']]){let row=document.createElement('label');row.className='audioRow';let span=document.createElement('span');span.textContent=label;let val=document.createElement('output');val.textContent=cfg[k]+'%';let input=document.createElement('input');input.type='range';input.min=0;input.max=100;input.value=cfg[k];input.oninput=()=>{set(k,input.value);val.textContent=cfg[k]+'%';unlock()};row.append(span,val,input);wrap.append(row)}let row=document.createElement('label');row.className='audioMute';let check=document.createElement('input');check.type='checkbox';check.checked=cfg.mute;check.onchange=()=>set('mute',check.checked);row.append(check,document.createTextNode('Выключить весь звук'));wrap.append(row);const testButton=document.createElement('button');testButton.type='button';testButton.className='action';testButton.textContent='ПРОВЕРИТЬ ЗВУК';const status=document.createElement('small');status.style.cssText='display:block;margin-top:6px;line-height:1.35;opacity:.85';testButton.onclick=async()=>{status.textContent=await test()};wrap.append(testButton,status);for(const [kind,label] of [['music','ПРОВЕРИТЬ МУЗЫКУ'],['ambient','ПРОВЕРИТЬ ОКРУЖЕНИЕ'],['effects','ПРОВЕРИТЬ ЭФФЕКТЫ']]){const b=document.createElement('button');b.type='button';b.className='action';b.textContent=label;b.onclick=async()=>{status.textContent=await testCategory(kind)};wrap.append(b)}for(const [label,kind] of [['СЛУШАТЬ ИГРОВУЮ МУЗЫКУ','game'],['СЛУШАТЬ МУЗЫКУ МЕНЮ','menu'],['СЛУШАТЬ РЫЧАНИЕ ЗОМБИ','zombie1'],['СЛУШАТЬ КРИК ЧЕЛОВЕКА','human1']]){const b=document.createElement('button');b.type='button';b.className='action';b.textContent=label;b.onclick=async()=>{if(!await unlock()){status.textContent='Браузер заблокировал звук';return}if(cfg.mute||!cfg.master||!(kind==='game'||kind==='menu'?cfg.music:cfg.effects)){status.textContent='Соответствующая категория звука выключена';return}const ok=kind==='game'||kind==='menu'?musicPreview(kind):playSample(kind,0,0,.75,true);status.textContent=ok?'Воспроизводится встроенная запись: '+label:'Запись недоступна — проверьте аудио'};wrap.append(b)}return wrap}
 return {unlock,set,sound,tick,panel,test,get settings(){return {...cfg}}};
})();
let grinderSoundUntil=0;
window.addEventListener('pointerdown',()=>AudioManager.unlock(),{capture:true});
window.addEventListener('keydown',()=>AudioManager.unlock(),{capture:true});

function makeMachine(type,x,z){let root=new THREE.Group();root.position.set(x,0,z);world.add(root);let range=1.65,act=()=>{};if(type==='filter'){cyl(root,0,1,0,.43,.43,1.7,steel);cyl(root,0,1.86,0,.48,.48,.16,accent);for(let i=0;i<3;i++){let xx=-.6+i*.6;cyl(root,xx,1.2,-.5,.13,.13,1.2,mat(0x94a8a2,.32,.25));rod(root,[xx,1.85,-.5],[0,1.9,0],.055,steel)}rod(root,[.35,.6,0],[.75,.6,0],.08,accent);cyl(root,.75,.36,0,.22,.18,.36,mat(0x6a7270));act=()=>{if(player.waterCarry){player.waterCarry=false;waterJob=14/state.filterLevel;AudioManager.sound('waterDrop',x,z,.8);notice('Вода загружена. Фильтрация: '+Math.ceil(waterJob)+' сек.');}else if(waterJob>0)notice('Очистка воды: '+Math.ceil(waterJob)+' сек.');else if(filterBatch){state.water+=filterBatch;notice('Получено '+filterBatch+' порций чистой воды');filterBatch=0}else notice('Нужна грязная вода из бочки за задней дверью')};addSolid(x,z,1.1,1.05)}
if(type==='grinder'){cube(root,0,.9,0,1.1,.65,.55,steel);cyl(root,0,1.38,0,.39,.22,.38,accent);let h=cyl(root,.5,1.03,0,.26,.26,.43,dirty);h.rotation.z=Math.PI/2;for(let i=0;i<9;i++){let a=i*Math.PI*2/9;ball(root,.76,1.03+Math.sin(a)*.17,Math.cos(a)*.17,.035,mat(0xb3b5a8))}cube(root,-.65,.65,0,.7,.12,.6,wood);for(let xx of [-.4,.4])for(let zz of [-.2,.2])cube(root,xx,.35,zz,.08,.7,.08,steel);act=()=>{if(held&&held.mode==='dead'){grinderSoundUntil=performance.now()+1300;AudioManager.sound('grinderStart',x,z,.8);if(held.mesh.parent)held.mesh.parent.remove(held.mesh);held=null;state.meat+=state.grinderLevel>=2?5:3;notice('Тело переработано: +'+(state.grinderLevel>=2?5:3)+' мяса')}else notice('Для переработки нужно принести тело зомби')};addSolid(x,z,1.15,.9)}
if(type==='grill'){// Узнаваемая длинная жаровня: колёса, топка, столешницы, дымоход.
for(let xx of [-.75,.75])for(let zz of [-.35,.35]){cyl(root,xx,.25,zz,.17,.17,.14,dirty).rotation.x=Math.PI/2;cube(root,xx,.55,zz,.07,.6,.07,steel)}cube(root,0,.82,0,2.8,.32,.8,steel);cube(root,0,1.04,0,1.7,.23,.65,mat(0x2d302e));for(let i=0;i<12;i++)cube(root,-.75+i*.135,1.18,0,.035,.04,.64,accent);cube(root,-1.15,.96,0,.5,.1,.85,steel);cube(root,1.15,.96,0,.5,.1,.85,steel);cyl(root,-.5,1.55,-.25,.13,.13,1.5,steel);cyl(root,-.5,2.33,-.25,.22,.22,.06,steel);act=()=>{if(cookJob>0)return notice('Готовится паёк: '+Math.ceil(cookJob)+' сек.');if(state.meat<1)return notice('Нет сырого мяса');state.meat--;cookJob=7;AudioManager.sound('grillDone',x,z,.35);notice('Паёк готовится...')};addSolid(x,z,2.8,1.05)}
if(type==='fridge'){cube(root,0,1,0,1.05,1.95,.85,mat(0x77827d,.55,.4));cube(root,0,1.08,-.44,.98,1.65,.045,mat(0x9fa6a0,.5,.35));cube(root,.38,1.1,-.49,.045,.45,.06,dirty);act=()=>notice('Холодильник: мясо '+state.meat+' · готовые пайки '+state.food+' · припасы '+state.ingredients);addSolid(x,z,1.2,1)}
if(type==='bed'){cube(root,0,.13,0,1.2,.15,1.8,mat(0x505a3d));cube(root,0,.24,.58,.8,.17,.42,mat(0x9a9382));for(let i=0;i<3;i++)cube(root,-.6+i*.35,.11,-.5,.12,.08,.4,mat(0x7c7359));act=()=>sleep();addSolid(x,z,1.3,1.9)}
if(type==='crate'){cube(root,0,.32,0,1.0,.62,.9,wood);for(let xx of [-.46,.46])cube(root,xx,.36,0,.06,.7,.93,steel);act=()=>openPartsUpgrades();addSolid(x,z,1.1,1)}
if(type==='barrel'){cyl(root,0,.7,0,.5,.5,1.4,mat(0x657a76,.55,.5));for(let y of [.25,.7,1.15])cyl(root,0,y,0,.51,.51,.06,steel);cyl(root,0,1.43,0,.35,.35,.06,dirty);act=()=>{if(player.waterCarry)return notice('У тебя уже есть ёмкость грязной воды');player.waterCarry=true;notice('Набрана грязная вода. Отнеси к опреснителю в подсобке.')};addSolid(x,z,1,1)}
objects.push({root,x,z,type,range,act})}
function createStreet(){
 const asphalt=mat(0x343a37),concrete=mat(0x77766a),windowMat=mat(0x252e30),brick=mat(0x66645c),rusty=mat(0x705044);
 cube(world,0,-.11,-22,75,.09,35,asphalt);
 // Ломаные разметки, тротуары, люки.
 for(let z=-10;z>-67;z-=7)cube(world,0,.012,z,.13,.014,3,mat(0x9a957d));
 for(let x of [-9.8,9.8])cube(world,x,.05,-30,3,.15,67,concrete);
 for(let side of [-1,1])for(let i=0;i<12;i++){
  let x=side*(13.5+(i%3)*.35),z=-9-i*5.3,w=6.4,h=rnd(8,20),depth=4.6;
  const building=new THREE.Group();building.position.set(x,0,z);world.add(building);
  cube(building,0,h/2,0,w,h,depth,mat(pick([0x5c615b,0x686960,0x515952,0x777267])));
  for(let yy=1.8;yy<h-1;yy+=2.1)for(let xx=-w/2+.75;xx<w/2-.3;xx+=1.2){
   const front=side===1?-depth/2-.024:depth/2+.024;
   cube(building,xx,yy,front,.68,.92,.055,windowMat);
   cube(building,xx,yy,front+(side===1?-.04:.04),.06,.96,.07,brick);
   if(Math.random()<.26)cube(building,xx,yy+.3,front+(side===1?-.06:.06),.74,.13,.09,rusty);
  }
  if(i%4===0){cube(building,-w*.3,h+.2,.2,w*.4,.5,depth*.65,concrete);cube(building,w*.3,h-.6,0,w*.5,1.4,depth*.7,asphalt)}
  for(let r=0;r<9;r++){let xx=rnd(-w/2,w/2),zz=rnd(-depth/2,depth/2);cube(building,xx,.12,zz,rnd(.2,.8),rnd(.2,.55),rnd(.3,.9),pick([brick,concrete,rusty]))}
 }
 function wreck(x,z,flip=false){let g=new THREE.Group();g.position.set(x,0,z);world.add(g);g.rotation.z=flip?Math.PI*.83:rnd(-.07,.07);g.rotation.y=rnd(-.4,.4);
  const shell=mat(pick([0x565e59,0x6c5c50,0x4c5357,0x777366]));cube(g,0,.72,0,1.9,.55,3.4,shell);cube(g,0,1.2,-.18,1.45,.54,1.55,shell);
  for(let zz of [-1.15,1.15])for(let xx of [-.98,.98]){let wheel=cyl(g,xx,.4,zz,.36,.36,.2,mat(0x222625));wheel.rotation.z=Math.PI/2;}
  cube(g,0,1.23,-1.02,1.25,.42,.055,windowMat);cube(g,0,1.23,.69,1.25,.42,.055,windowMat);
  for(let xx of [-.6,.6])cube(g,xx,.77,-1.74,.32,.15,.07,mat(0x9d8c6e));
 }
 for(let i=0;i<7;i++)wreck(rnd(-6,6),-12-i*7,i===2||i===5);
 for(let i=0;i<95;i++){let x=rnd(-11,11),z=rnd(-68,-7.5);cube(world,x,.06,z,rnd(.16,.8),rnd(.08,.5),rnd(.18,1.1),pick([dirty,steel,wood,concrete,rusty]))}
 // Задний двор — замкнутый ряд складов, а не пустая площадка.
 cube(world,0,-.11,23,50,.1,39,concrete);
 for(let side of [-1,1])for(let i=0;i<6;i++){
  let x=side*12,z=9+i*5.7,h=5+i%3*1.7;
  cube(world,x,h/2,z,7,h,5.3,brick);
  for(let yy=1.8;yy<h-1;yy+=2.1)for(let zz=-1.7;zz<=1.7;zz+=1.7)cube(world,x-side*3.56,yy,z+zz,.07,.85,.85,windowMat);
 }
 for(let i=0;i<50;i++){let x=rnd(-8,8),z=rnd(10,40);if(Math.abs(x)<2&&z<12)continue;cube(world,x,.1,z,rnd(.2,.8),rnd(.1,.5),rnd(.3,1),pick([dirty,steel,wood,brick]))}
}
function makeHuman(kind=0,x=0,z=0,female=false){
 // Читаемый силуэт: суставы, ладони, пальцы, лицо и различимая одежда.
 const root=new THREE.Group();root.position.set(x,0,z);root.userData.kind=kind;root.userData.female=female;
 const infected=kind===5, suspect=kind===4;
 const skin=mat(infected?0x849b76:suspect?0xa09b81:pick([0xd0a382,0xb7896d,0x9b715c]));
 const jacket=mat([0x646e59,0x8b6d4d,0x454b4a,0x99988a,0x5a6550,0x626c4e][kind%6]);
 const trousers=mat([0x353a35,0x4a463c,0x34373c,0x55594f,0x414943,0x3e4939][kind%6]);
 const hair=mat(pick([0x29251f,0x554233,0x37332b]));const blood=mat(0x61251f);
 function ell(parent,x,y,z,sx,sy,sz,m){const o=new THREE.Mesh(new THREE.SphereGeometry(1,18,12),m);o.position.set(x,y,z);o.scale.set(sx,sy,sz);o.castShadow=true;parent.add(o);return o}
 ell(root,0,1.31,0,female?.305:.36,.49,.22,jacket);ell(root,0,1.03,0,female?.345:.29,.20,.21,trousers);
 // Подвижные ноги, колени, голени и ботинки.
 for(const side of [-1,1]){
  const leg=new THREE.Group();leg.position.set(side*.17,.91,0);leg.userData.leg=true;leg.userData.side=side;root.add(leg);
  ell(leg,0,-.19,0,.145,.29,.15,trousers);ell(leg,0,-.43,-.015,.13,.12,.13,trousers);
  ell(leg,0,-.61,.015,.115,.24,.12,trousers);ell(leg,0,-.83,-.095,.16,.105,.265,mat(0x554638));
  const arm=new THREE.Group();arm.position.set(side*.41,1.58,0);arm.userData.arm=true;arm.userData.side=side;root.add(arm);
  ell(arm,side*.035,-.20,0,.15,.27,.155,jacket);ell(arm,side*.045,-.43,-.025,.12,.11,.12,jacket);
  ell(arm,side*.035,-.57,-.055,.115,.20,.12,jacket);
  ell(arm,side*.035,-.76,-.055,.105,.12,.07,skin);
  for(let f=0;f<4;f++)ell(arm,side*.035+(f-1.5)*.043,-.855,-.10,.019,.085,.025,skin);
  ell(arm,side*.035-side*.115,-.765,-.09,.045,.10,.05,skin);
 }
 ell(root,0,1.77,0,.115,.14,.12,skin);
 ell(root,0,2.035,-.012,.235,.315,.21,skin);
 // Глаза с белками и зрачками, брови, нос, губы, уши.
 for(const side of [-1,1]){
  ell(root,side*.245,2.02,0,.055,.095,.07,skin);
  ell(root,side*.095,2.08,-.199,.064,.042,.018,infected?mat(0xc2b86c):mat(0xd1c9b7));
  ell(root,side*.095,2.08,-.217,.026,.028,.012,infected?mat(0x8b2923):mat(0x303432));
  const brow=cube(root,side*.095,2.16,-.199,.13,.022,.025,hair);brow.rotation.z=side*(infected?.22:-.06);
 }
 ell(root,0,1.999,-.22,.058,.095,.075,skin);
 ell(root,0,1.875,-.209,.10,.024,.018,infected?blood:mat(0x554638));
 // Scalp covers the crown and sides; no bald skull with attached little ponytails.
 ell(root,0,2.245,.035,.247,.155,.225,hair);
 if(female&&!infected){
  const style=Math.floor(Math.random()*4);
  if(style===0){ // straight shoulder-length hair
   ell(root,-.205,1.94,.075,.105,.37,.175,hair);
   ell(root,.205,1.94,.075,.105,.37,.175,hair);
   ell(root,0,1.94,.18,.205,.38,.125,hair);
  }else if(style===1){ // bob
   ell(root,-.205,2.01,.045,.11,.29,.18,hair);
   ell(root,.205,2.01,.045,.11,.29,.18,hair);
   ell(root,0,2.03,.19,.22,.28,.12,hair);
  }else if(style===2){ // long layered hair
   ell(root,-.20,1.84,.09,.12,.49,.17,hair);
   ell(root,.20,1.84,.09,.12,.49,.17,hair);
   ell(root,0,1.88,.19,.20,.48,.14,hair);
  }else{ // short cropped cut, full sides
   ell(root,-.17,2.13,.055,.115,.18,.18,hair);
   ell(root,.17,2.13,.055,.115,.18,.18,hair);
  }
  // Fringe rather than a bare forehead.
  if(style!==3)ell(root,-.075,2.265,-.125,.16,.075,.115,hair);
  if(Math.random()<.45){const skirt=new THREE.Mesh(new THREE.CylinderGeometry(.29,.43,.55,12),mat(pick([0x4a4d46,0x51453f,0x625b50])));skirt.position.y=.88;root.add(skirt)}
  root.scale.setScalar(.93+Math.random()*.055);
 }
 if(kind===1){cube(root,-.37,1.23,-.19,.12,.7,.10,mat(0x554638));cube(root,.26,1.24,-.24,.35,.34,.11,mat(0x554638))}
 if(kind===2){cube(root,0,1.34,-.225,.56,.35,.075,mat(0x626a67));cube(root,0,2.39,.02,.54,.11,.42,mat(0x303432))}
 if(kind===3){cube(root,0,1.30,-.235,.64,.76,.07,mat(0xd1c9b7));for(let s of [-1,1])cube(root,s*.105,2.09,-.232,.17,.08,.04,mat(0x99a6a0))}
 if(infected){ell(root,-.14,1.45,-.218,.15,.24,.03,blood);ell(root,.13,1.84,-.19,.10,.09,.035,blood);ell(root,-.09,2.02,-.222,.045,.07,.024,blood);for(const a of root.children)if(a.userData.arm)a.rotation.x=-.35}
 root.userData.arms=root.children.filter(a=>a.userData.arm);root.userData.legs=root.children.filter(a=>a.userData.leg);world.add(root);return root;
}
function zombify(root){
 const pallor=mat(0x9c9685),rot=mat(0x423d31),wound=mat(0x622c29),bone=mat(0xd3c3a0);
 // Сохраняем одежду и силуэт человека; меняем только видимую кожу, добавляем повреждения.
 root.traverse(o=>{if(o.isMesh&&o.material&&o.material.color&&o.material.color.r>.46&&o.material.color.g>.34&&o.material.color.b>.28&&o.geometry?.type==='SphereGeometry'&&o.position.y>1.85)o.material=pallor});
 for(const [x,y,z,r] of [[-.18,2.05,-.195,.075],[.12,1.98,-.205,.045],[-.21,1.43,-.22,.09],[.23,1.17,-.20,.075]]){
  const w=ball(root,x,y,z,r,wound);w.scale.z=.25;ball(root,x+.015,y+.012,z-.015,r*.36,rot);
 }
 for(let i=0;i<4;i++){let t=cube(root,-.23+i*.12,1.38,-.248,.065,.22,.025,rot);t.rotation.z=(i-1.5)*.22}
 for(let i=0;i<3;i++)ball(root,-.06+i*.06,1.86,-.22,.027,bone);
 root.userData.zombie=true;
}
function mutate(p){AudioManager.sound('groan',p.x,p.z,.7);p.zombie=true;p.mode='zombie';p.kind=5;p.mesh.userData.kind=5;zombify(p.mesh);for(let a of p.mesh.userData.arms)a.rotation.x=-.6;notice('ЗАРАЖЁННЫЙ! Остальные посетители убегают!');for(let c of customers)if(c!==p&&c.mode!=='dead'){if(c.mode!=='flee')c.prePanicMode=c.mode;c.mode='flee';AudioManager.sound('scare',c.x,c.z,.5);c.panicTimer=3;c.path=null;c.navGoal=null;};zombies.push(p);customers=customers.filter(c=>c!==p)}
function orderIcon(order){let c=document.createElement('canvas');c.width=c.height=128;let q=c.getContext('2d');q.fillStyle='#252a26';q.beginPath();q.roundRect(7,7,114,114,25);q.fill();q.strokeStyle='#e1b47b';q.lineWidth=5;q.stroke();q.font='70px Arial';q.textAlign='center';q.textBaseline='middle';q.fillText(['🍲','💧','🍲'][order],64,66);let t=new THREE.CanvasTexture(c);t.encoding=THREE.sRGBEncoding;let sp=new THREE.Sprite(new THREE.SpriteMaterial({map:t,depthTest:false}));sp.scale.set(1.05,1.05,1);sp.position.set(0,2.95,0);sp.visible=false;return sp}
function npc(kind,x,z){const female=kind!==5&&Math.random()<.48;return {mesh:makeHuman(kind,x,z,female),female,x,z,kind,mode:'enter',order:Math.floor(Math.random()*3),life:kind===5?65:45,wait:0,step:0,walk:0,attack:0,atDoor:false,zombie:false,seat:Math.random()>.65}}
// Навигация по сетке: учитываем стены, мебель и дверные проёмы.
const NAV_STEP=.55;
function navPath(p,tx,tz){
 if(customers.includes(p)&&(!isPublic(tx,tz,.27)||!canMove(tx,tz,.27))){const target=nearestPublicTarget(tx,tz);tx=target.x;tz=target.z;}
 const originX=-10,originZ=-24, cols=37,rows=69;
 const cell=(x,z)=>[Math.max(0,Math.min(cols-1,Math.round((x-originX)/NAV_STEP))),Math.max(0,Math.min(rows-1,Math.round((z-originZ)/NAV_STEP)))];
 const key=(a,b)=>a+','+b, [sx,sz]=cell(p.x,p.z),[gx,gz]=cell(tx,tz);
 let open=[[sx,sz]],seen=new Set([key(sx,sz)]),parent=new Map(),goal=null,iterations=0;
 while(open.length&&iterations++<2200){let [x,z]=open.shift();if(Math.abs(x-gx)+Math.abs(z-gz)<=1){goal=[x,z];break}
 for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){let a=x+dx,b=z+dz,k=key(a,b);if(a<0||a>=cols||b<0||b>=rows||seen.has(k))continue;
 let wx=originX+a*NAV_STEP,wz=originZ+b*NAV_STEP;
 // Закрытые двери проходимы для планировщика: NPC откроет их на подходе.
 let valid=canMove(wx,wz,.27);if(customers.includes(p)&&!isPublic(wx,wz,.27))valid=false;if(!valid&&(!customers.includes(p)||isPublic(wx,wz,.27))&&obstacles.every(o=>!(Math.abs(wx-o.x)<o.w/2+.27&&Math.abs(wz-o.z)<o.d/2+.27)))valid=doors.some(d=>doorPassability(d,wx,wz,.27,true).reason==='door_route');
 if(!valid)continue;seen.add(k);parent.set(k,[x,z]);open.push([a,b])}}
 if(!goal)return null;let path=[],cur=goal;while(cur&&key(...cur)!==key(sx,sz)){path.push({x:originX+cur[0]*NAV_STEP,z:originZ+cur[1]*NAV_STEP});cur=parent.get(key(...cur))}path.reverse();path.push({x:tx,z:tz});return path;
}
// Door crossing is a reserved, bidirectional three-point lane.
// The front wall is at FRONT=-6 and the 1.7 m opening is centred at x=0.
const frontLane={owner:null,queue:[]};
function frontDoor(){return doors.find(d=>d.axis==='z'&&Math.abs(d.coord-FRONT)<.1&&Math.abs(d.center)<.1)}
function doorLane(p,dt,speed=1.2,outbound=false){
 const d=frontDoor();if(!d){p.stopReason='front_door_missing';return false;}
 const endZ=outbound?FRONT-1.12:FRONT+1.12;
 const night=elapsed>=600;
 if(night&&d.manualHold){p.stopReason='night_manual_hold';return false;}
 if(!night&&d.manualHold){d.manualHold=false;d.pendingClose=false;}
 if(!d.open)toggleDoor(d,true);
 d.auto=Math.max(d.auto,2.5);
 const ox=p.x,oz=p.z;
 // Never aim at a jamb: centre the NPC before advancing across the facade.
 const aligned=Math.abs(p.x-d.center)<.12;
 const tx=d.center,tz=aligned?endZ:p.z;
 const dx=tx-p.x,dz=tz-p.z,dist=Math.hypot(dx,dz);
 let reason='moving';
 // Wait for the real leaf to clear the collision radius; never advance through a closed leaf.
 const inThreshold=Math.abs(p.z-FRONT)<.80;
 const leafReady=d.open&&d.angle>=1.12;
 if(inThreshold&&!leafReady){reason='door_leaf_opening';}
 else if(dist>.001){const step=Math.min(dist,speed*dt);npcMove(p,dx/dist*step,dz/dist*step,.20);}
 const moved=Math.hypot(p.x-ox,p.z-oz);
 if(moved<.0001&&dist>.18&&reason==='moving'){
  const testX=p.x+Math.sign(dx)*Math.min(.05,Math.abs(dx));
  const testZ=p.z+Math.sign(dz)*Math.min(.05,Math.abs(dz));
  reason=!isPublic(testX,testZ,.20)&&customers.includes(p)?'staff_only':
   obstacles.some(o=>Math.abs(testX-o.x)<o.w/2+.20&&Math.abs(testZ-o.z)<o.d/2+.20)?'static_obstacle':
   doorPassability(d,testX,testZ,.20).reason;
 }
 p.stopReason=reason==='moving'?null:reason;
 p.doorDiagnostic={state:p.mode,x:p.x,z:p.z,targetX:tx,targetZ:tz,doorOpen:d.open,angle:d.angle,collision:reason,moved,stage:aligned?'CROSSING':'ALIGNING',nextMode:outbound?'LEAVING':'GOING_TO_COUNTER'};
 if(moved<.0001&&dist>.18&&reason!=='door_leaf_opening')p.doorStuck=(p.doorStuck||0)+dt;
 else p.doorStuck=0;
 if(moved>.0001)p.mesh.rotation.y+=Math.atan2(Math.sin(Math.atan2(-dx,-dz)-p.mesh.rotation.y),Math.cos(Math.atan2(-dx,-dz)-p.mesh.rotation.y))*Math.min(1,dt*8);
 animateGait(p,moved,dt);p.mesh.position.set(p.x,Math.abs(Math.sin(p.step))*.03,p.z);
 if(Math.abs(p.x-d.center)<.24&&(outbound?p.z<=endZ+.16:p.z>=endZ-.16)){
  p.laneDirection=null;p.laneStage=0;p.path=null;p.navTimer=0;p.doorStuck=0;return true;
 }
 return false;
}
function moveDoorCorridor(p,dt,speed=1.15){return doorLane(p,dt,speed,false)}
function clearLine(ax,az,bx,bz,r=.25){let dist=Math.hypot(bx-ax,bz-az),n=Math.max(2,Math.ceil(dist/.18));for(let i=1;i<=n;i++){let t=i/n,x=ax+(bx-ax)*t,z=az+(bz-az)*t;if(!canMove(x,z,r))return false}return true}
function animateGait(p,moved,dt,turning=false){p.step=(p.step||0)+moved*10;const amp=Math.min(1,moved/Math.max(.001,dt*1.15));const swing=Math.sin(p.step)*amp;for(let i=0;i<2;i++){let leg=p.mesh.userData.legs?.[i],arm=p.mesh.userData.arms?.[i];if(leg)leg.rotation.x+=( (i===0?swing:-swing)*.70-leg.rotation.x)*Math.min(1,dt*14);if(arm)arm.rotation.x+=((i===0?-swing:swing)*.42-arm.rotation.x)*Math.min(1,dt*14)}}
function npcClearLine(p,ax,az,bx,bz,r=.22){
 if(!clearLine(ax,az,bx,bz,r))return false;
 if(!customers.includes(p))return true;
 const n=Math.max(1,Math.ceil(Math.hypot(bx-ax,bz-az)/.16));
 for(let i=0;i<=n;i++){let t=i/n;if(!isPublic(ax+(bx-ax)*t,az+(bz-az)*t,r))return false;}
 return true;
}
function moveNpc(p,x,z,dt,speed=1.15){
 if(customers.includes(p)&&!isPublic(x,z,.26)){const goal=nearestPublicTarget(x,z);x=goal.x;z=goal.z;}
 if(!npcCanMove(p,x,z,.22)){const alternative=nearestPublicTarget(x,z);if(customers.includes(p)&&alternative){x=alternative.x;z=alternative.z;}}
 const distance=Math.hypot(x-p.x,z-p.z);
 if(distance<.16){animateGait(p,0,dt);p.mesh.position.set(p.x,p.mode==='eat'?-.28:0,p.z);return distance}
 p.navTimer=(p.navTimer||0)-dt;
 if(!p.path||p.navTimer<=0||Math.hypot(x-(p.navGoal?.x??999),z-(p.navGoal?.z??999))>.65){p.path=navPath(p,x,z)||[];p.navGoal={x,z};p.navTimer=.9+Math.random()*.4}
 while(p.path.length&&Math.hypot(p.path[0].x-p.x,p.path[0].z-p.z)<.34)p.path.shift();
 if(customers.includes(p)&&p.path.some(q=>!isPublic(q.x,q.z,.25))){p.path=[];p.navTimer=0;}
 while(p.path.length>1&&npcClearLine(p,p.x,p.z,p.path[1].x,p.path[1].z,.24))p.path.shift();if(npcClearLine(p,p.x,p.z,x,z,.24))p.path=[{x,z}];let target=p.path[0];if(!target){p.stuck=(p.stuck||0)+dt;if(p.stuck>1.6){p.navTimer=0;p.path=null;p.blockFailures=(p.blockFailures||0)+1;p.stopReason='unreachable_path';p.stuck=0;if(customers.includes(p)&&p.blockFailures>3){p.mode='leave';p.passedExit=false;p.blockFailures=0}}animateGait(p,0,dt);return distance}let dx=target.x-p.x,dz=target.z-p.z,d=Math.hypot(dx,dz);
 if(d>.01){for(const door of doors){let cx=door.axis==='z'?door.center:door.coord,cz=door.axis==='z'?door.coord:door.center;
 if(Math.hypot(p.x-cx,p.z-cz)<2.5&&!door.open&&!(door===frontDoor()&&door.manualHold))toggleDoor(door,true)}
 let step=Math.min(d,speed*dt),ox=p.x,oz=p.z;let nx=p.x+dx/d*step,nz=p.z+dz/d*step;// NPCs do not physically block each other; geometry collisions remain enforced.
 npcMove(p,dx/d*step,dz/d*step,.26);
 let moved=Math.hypot(p.x-ox,p.z-oz);if(moved<.015){p.navTimer=0;p.stuck=(p.stuck||0)+dt;if(p.stuck>1.8){p.path=null;p.navTimer=0;p.stuck=0;p.blockFailures=(p.blockFailures||0)+1;if(customers.includes(p)&&p.blockFailures>3){p.path=null;p.navTimer=0;p.blockFailures=0;if(p.mode==='seat'){p.mode='leave';p.passedExit=false}else if(p.mode==='line'){p.queueOffset=(p.queueOffset||0)+1;if(p.queueOffset>3){p.mode='leave';p.passedExit=false}}else if(p.mode==='recover'){p.recoverTimer=(p.recoverTimer||0)-dt;if(p.recoverTimer<=0){p.mode='leave';p.passedExit=false;p.path=null;p.navTimer=0;p.stuck=0;}else animateGait(p,0,dt);}
  else if(p.mode==='flee'){p.fleeTarget=null;p.fleeReplan=0}}}}else{p.stuck=0;p.blockFailures=0;p.stopReason=null;p.mesh.rotation.y+=Math.atan2(Math.sin(Math.atan2(-dx,-dz)-p.mesh.rotation.y),Math.cos(Math.atan2(-dx,-dz)-p.mesh.rotation.y))*Math.min(1,dt*8)}
 animateGait(p,moved,dt);
 }p.mesh.position.set(p.x,Math.abs(Math.sin(p.step))*.045,p.z);return distance
}
function removeNpc(p){world.remove(p.mesh);}
function createQueue(){queue=[];let n=15+Math.floor(Math.random()*6);for(let i=0;i<n;i++)queue.push({kind:Math.random()<Math.min(.15,.012*state.day)?5:Math.floor(Math.random()*5),order:Math.floor(Math.random()*3)});}
function spawnCustomer(){if(!queue.length||elapsed>540)return;let info=queue.shift();let p=npc(info.kind,rnd(-.18,.18),-12.3);if(info.kind===4&&Math.random()<.65)p.infectionTimer=rnd(20,65);p.order=info.order;p.mode='enter';p.icon=orderIcon(p.order);p.mesh.add(p.icon);customers.push(p);stats.visitors++}
function spawnZombie(){let max=Math.min(2+Math.floor((state.day-1)/2),7);let active=zombies.filter(z=>z.mode!=='dead').length;if(active>=max)return;let z=npc(5,rnd(-6,6),rnd(-19,-13));z.zombie=true;z.mode='zombie';z.life=48+state.day*3;mutateVisual(z);zombies.push(z)}
function mutateVisual(z){z.mesh.userData.kind=5;let sick=mat(0x969489),wound=mat(0x743e35);let head=z.mesh.children.find(o=>o.geometry?.type==='SphereGeometry');if(head)head.material=sick;for(let [x,y] of [[-.1,2.05],[.19,1.42],[-.2,1.26]]){let b=ball(z.mesh,x,y,-.22,.085,wound);b.scale.z=.15}}
function serve(p){if(p.mode!=='wait')return;if(p.order===1){if(state.water<=0)return notice('Нет чистой воды. Наполни опреснитель!');state.water--}else{if(state.food<=0)return notice('Нет готовых пайков. Используй жаровню!');state.food--}stats.sold++;servedToday++;let price=p.order===1?5:p.order===2?12:9;state.coins+=price;stats.earned+=price;state.xp+=10;state.rating=clamp(state.rating+1,0,100);p.mode=p.seat?'seat':'leave';p.wait=0;p.path=null;p.navGoal=null;p.navTimer=0;p.stuck=0;p.blockFailures=0;if(p.kind===5&&!p.zombie){p.infectionTimer=2.2;}notice('Заказ выдан. +'+price+' жетонов · +10 XP')}
function attack(){if(!running||paused||modalOpen||attackCd>0)return;attackCd=.48;AudioManager.sound('miss',player.x,player.z,.48);weapon.userData.swing=1;let best=null,dist=2.6;for(let p of [...zombies,...customers]){if(p.mode==='dead')continue;let dx=p.x-player.x,dz=p.z-player.z,d=Math.hypot(dx,dz);let facing=(dx*-Math.sin(yaw)+dz*-Math.cos(yaw))/Math.max(d,.01);if(d<dist&&facing>.25){best=p;dist=d}}if(!best)return;AudioManager.sound('hit',best.x,best.z,.95);AudioManager.sound('zombieHurt',best.x,best.z,.7);best.life-=34;if(!best.zombie)AudioManager.sound('humanHurt',best.x,best.z,.8);if(best.kind===5&&!best.zombie){mutate(best)}else if(!best.zombie){state.rating=Math.max(0,state.rating-8);notice('Ты ударил обычного посетителя! −8 рейтинга');best.mode='flee'}else notice('Удар ломом: −34 здоровья');if(best.life<=0){best.mode='dead';AudioManager.sound('death',best.x,best.z,.85);stats.kills++;bodies.push(best);zombies=zombies.filter(z=>z!==best);customers=customers.filter(c=>c!==best);best.mesh.rotation.z=-Math.PI/2;best.mesh.position.y=.35;notice('Зомби уничтожен. Наведись на тело и нажми E, затем отнеси его к мясорубке.')}}
function playerHurt(amount){if(dead)return;player.hp-=amount;hitFlash=.35;if(player.hp<=0){player.hp=0;die('Тебя убили заражённые')}}
function die(reason){dead=true;paused=true;document.exitPointerLock?.();showModal('ВЫ УМЕРЛИ',reason+'\n\n«День до»: опыт, жетоны и продажи текущего дня потеряны. Ты проснёшься у спальника утром этого же дня.',[['ПРОСНУТЬСЯ',()=>{dayStart(checkpoint,true);hideModal();resume()}],['В МЕНЮ',()=>{hideModal();showMenu()}]])}

function killCustomer(p){
 if(!p||p.mode==='dead')return;
 AudioManager.sound('humanDeath',p.x,p.z,1);p.mode='dead';p.path=null;p.navGoal=null;p.fleeTarget=null;p.wait=0;
 if(p.icon)p.icon.visible=false;
 customers=customers.filter(c=>c!==p);
 if(!bodies.includes(p))bodies.push(p);
 p.fallProgress=0;p.mesh.position.set(p.x,0,p.z);
 notice('Зомби убил посетителя!');
}
function updateFallenCustomers(dt){for(const b of bodies){if(b.fallProgress===undefined||b.fallProgress>=1)continue;
 b.fallProgress=Math.min(1,b.fallProgress+dt*2.5);
 b.mesh.rotation.z=-Math.PI/2*b.fallProgress;
 b.mesh.position.set(b.x,.34*b.fallProgress,b.z);
 if(b.fallProgress>=1){for(const limb of [...(b.mesh.userData.legs||[]),...(b.mesh.userData.arms||[])])limb.rotation.x=0;}
}}
function clearBodies(){for(const b of bodies){if(b.mesh?.parent)b.mesh.parent.remove(b.mesh)}bodies=[];if(held){if(held.mesh?.parent)held.mesh.parent.remove(held.mesh);held=null}}
function dropBody(){if(!held)return;const b=held;held=null;camera.remove(b.mesh);world.add(b.mesh);const fx=-Math.sin(yaw),fz=-Math.cos(yaw);let px=player.x+fx*1.1,pz=player.z+fz*1.1;if(!canMove(px,pz,.32)){px=player.x;pz=player.z}b.x=px;b.z=pz;b.mode='dead';b.mesh.position.set(px,0,pz);b.mesh.rotation.set(0,0,Math.PI/2);b.mesh.scale.setScalar(1);bodies.push(b);notice('Тело положено. E — поднять снова')}
const STAFF_DAILY_WAGES=Object.freeze({'Разведчик':15,'Охранник':20,'Кассир':25});
function settleDailyPayroll(){
 // Persist a per-day settlement so reopening a report or loading a save cannot charge twice.
 if(state.lastPayrollDay===state.day&&state.lastPayrollReport)return state.lastPayrollReport;
 const lines=[];let total=0;
 for(const member of state.staff||[]){
  const role=typeof member==='string'?member:member?.role;
  const wage=STAFF_DAILY_WAGES[role];
  if(wage===undefined)continue;
  lines.push({role,amount:wage});total+=wage;
 }
 const revenue=Number(stats.earned)||0;
 // Other purchases are already debited when they occur; they are not debited again here.
 const report={day:state.day,lines,total,revenue,net:revenue-total};
 state.coins-=total;
 state.lastPayrollDay=state.day;
 state.lastPayrollReport=report;
 stats.payroll=total;
 saveGame();
 return report;
}
function sleep(){
 if(elapsed<600)return notice('Ещё рано спать. Смена закончится после 18:00.');
 if(!state.shutters||!state.lightsOff)return notice('Перед сном закрой ставни и выключи свет у витрины!');
 const payroll=settleDailyPayroll();
 clearBodies();state.hp=100;state.hunger=90;state.thirst=90;
 const wageLines=payroll.lines.length?payroll.lines.map(e=>`${e.role}: −${e.amount} жетонов`).join('\n'):'Расходы на персонал: 0';
 const report=`Пришло посетителей: ${stats.visitors}\nПродано заказов: ${stats.sold}\nУничтожено зомби: ${stats.kills}\nВыручка от продаж: +${payroll.revenue} жетонов\n\nЗАРПЛАТЫ СОТРУДНИКОВ\n${wageLines}\nВсего зарплат: −${payroll.total} жетонов\nЧистый результат дня (продажи − зарплаты): ${payroll.net>=0?'+':''}${payroll.net} жетонов\n\nРейтинг: ${state.rating}%\nОпыт: ${state.xp} XP\nОстаток денег: ${state.coins} жетонов`;
 paused=true;document.exitPointerLock?.();
 showModal('ДЕНЬ '+state.day+' ЗАВЕРШЁН',report,[['НАСТУПИТ СЛЕДУЮЩЕЕ УТРО',()=>{state.day++;saveGame();dayStart(state);hideModal();resume()}],['В МЕНЮ',()=>{saveGame();hideModal();showMenu()}]]);
}
function showModal(title,text,buttons){modalOpen=true;keys={};pointerReentryPending=false;if(document.pointerLockElement){pointerUnlockForModal=true;document.exitPointerLock?.()}document.body.style.cursor='auto';$('modal').classList.remove('hidden');$('modal').style.pointerEvents='auto';$('modal').style.zIndex='100';$('modalButtons').style.pointerEvents='auto';$('modalTitle').textContent=title;$('modalText').textContent=text;$('modalButtons').replaceChildren();if(title==='НАСТРОЙКИ')$('modalButtons').appendChild(AudioManager.panel());buttons.forEach(([name,fn])=>{let b=document.createElement('button');b.type='button';b.className='action';b.textContent=name;b.style.pointerEvents='auto';b.onclick=e=>{e.stopPropagation();fn()};$('modalButtons').appendChild(b)})}
function requestGamePointer(){if(!renderer||!running||paused||modalOpen||dead)return;try{const result=renderer.domElement.requestPointerLock?.();if(result?.catch)result.catch(()=>{pointerReentryPending=true;notice('Нажми ЛКМ по игре, чтобы вернуть управление мышью')})}catch(e){pointerReentryPending=true;notice('Нажми ЛКМ по игре, чтобы вернуть управление мышью')}}
function hideModal(){hiringMenuActive=false;modalOpen=false;pointerUnlockForModal=false;pointerReentryPending=true;$('modal').classList.add('hidden');document.body.style.cursor='auto';keys={};if(running&&!paused&&!dead){pointerReentryPending=true;requestGamePointer();if(document.pointerLockElement!==renderer?.domElement)notice('Нажмите ЛКМ по игре, чтобы продолжить')}}
function notice(text){$('toast').textContent=text;$('toast').style.opacity=1;toastTimer=3.2}
function readSave(){try{const data=JSON.parse(localStorage.getItem(SAVE));if(!data||data.schema!==SAVE_SCHEMA||data.build!==SAVE||!data.progress||!Number.isInteger(data.progress.day)||data.progress.day<1||!Array.isArray(data.progress.staff))return null;return data.progress}catch(e){return null}}
function saveGame(){try{localStorage.setItem(SAVE,JSON.stringify({schema:SAVE_SCHEMA,build:SAVE,progress:state}))}catch(e){notice('Не удалось сохранить игру')}}
function defaults(){return {day:1,hp:100,hunger:90,thirst:90,stamina:100,meat:4,food:4,water:3,ingredients:0,parts:0,scoutDeliveryDay:0,scoutLastLoot:0,lastPayrollDay:0,lastPayrollReport:null,boxes:0,filterLevel:1,grinderLevel:1,grillLevel:1,xp:0,coins:20,rating:80,staff:[],shutters:false,lightsOff:false}}
function dayStart(data,rollback=false){grinderSoundUntil=0;state=JSON.parse(JSON.stringify(data));state.scoutDeliveryDay=Number.isInteger(state.scoutDeliveryDay)?state.scoutDeliveryDay:0;state.scoutLastLoot=Number(state.scoutLastLoot)||0;state.lastPayrollDay=Number.isInteger(state.lastPayrollDay)?state.lastPayrollDay:0;state.lastPayrollReport=state.lastPayrollReport||null;state.shutters=false;state.lightsOff=false;updateWindowControls();checkpoint=JSON.parse(JSON.stringify(state));player.x=3;player.z=4.5;player.hp=rollback?100:state.hp;player.hunger=state.hunger;player.thirst=state.thirst;player.st=100;player.waterCarry=false;elapsed=0;spawnCd=5;zombieCd=10;nightTriggered=false;raidWaveStarted=false;raidAlarm=0;if(raidPane)raidPane.visible=false;raid=0;filterBatch=0;waterJob=0;cookJob=0;if(held?.mesh?.parent===camera)camera.remove(held.mesh);held=null;dead=false;stats={visitors:0,sold:0,kills:0,earned:0,payroll:0};for(let p of [...customers,...zombies])removeNpc(p);customers=[];zombies=[];clearBodies();for(let d of doors){d.open=false;d.target=0;d.angle=0;d.auto=0;d.manualHold=false;d.pendingClose=false;d.pivot.rotation.y=0}createQueue();restoreEmployees();resetNight();if(renderer)renderer.domElement.style.filter="";updateHud();if(rollback)notice('ДЕНЬ ДО. Утро '+state.day+'-го дня.');else notice('День '+state.day+'. Открой кафе и обслуживай посетителей.');}
function nearestDoor(x,z){let best=null,dist=2;for(let d of doors){let dd=d.axis==='z'?Math.hypot(x-d.center,z-d.coord):Math.hypot(x-d.coord,z-d.center);if(dd<dist){best=d;dist=dd}}return best}
function interact(){if(!running||paused||modalOpen)return;let nearby=customers.filter(p=>p.mode==='wait'&&Math.hypot(p.x-player.x,p.z-player.z)<5.3).sort((a,b)=>Math.hypot(a.x-player.x,a.z-player.z)-Math.hypot(b.x-player.x,b.z-player.z));const door=frontDoor();const doorDistance=door?Math.hypot(player.x-door.center,player.z-door.coord):Infinity;
 if(door&&doorDistance<2.25&&focus?.door===door){focus.act();return}
 if(nearby.length&&player.z<0.2&&player.z>-3.8&&player.x<-.8){serve(nearby[0]);return}if(focus)focus.act();else notice('Рядом нет доступного предмета')}
function findFocus(){let candidates=[];let fwd=new THREE.Vector3(-Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),-Math.cos(yaw)*Math.cos(pitch));function add(x,y,z,label,act,range=2.4){let dx=x-player.x,dz=z-player.z,dist=Math.hypot(dx,dz);let v=new THREE.Vector3(dx,y-1.7,dz).normalize();let facing=v.dot(fwd);if(dist<range&&facing>.05)candidates.push({dist:dist-facing*.2,label,act,door:label.includes('дверь · E')?nearestDoor(x,z):null})}if(hiringBoard)add(hiringBoard.x,1.55,hiringBoard.z,'Доска найма · E',openHiringBoard,2.4);for(let o of objects)add(o.x,1.1,o.z,({filter:'Опреснитель',grinder:'Мясорубка',grill:'Жаровня',fridge:'Холодильник',bed:'Спальник — завершить день',crate:'Ящик снабжения',barrel:'Бочка — набрать грязную воду'})[o.type]+' · E',o.act,o.range);for(let d of doors){let x=d.axis==='z'?d.center:d.coord,z=d.axis==='z'?d.coord:d.center;add(x,1.2,z,(d.open?'Закрыть':'Открыть')+' дверь · E',()=>toggleDoor(d,!d.open,true),2.3)}for(let p of customers)if(p.mode==='wait')add(p.x,1.5,p.z,'Выдать '+['мясной паёк','чистую воду','горячий паёк'][p.order]+' · E',()=>serve(p),4.2);for(let b of bodies)if(b.mode==='dead')add(b.x,0.6,b.z,held?'Тело уже в руках':'Поднять тело · E',()=>{if(held)return;held=b;bodies=bodies.filter(x=>x!==b);camera.add(b.mesh);b.mesh.visible=true;b.mesh.position.set(.38,-.83,-1.30);b.mesh.rotation.set(Math.PI/2,-.35,Math.PI/2);b.mesh.scale.setScalar(.56);b.mesh.traverse(o=>{if(o.isMesh){o.frustumCulled=false;o.renderOrder=4}});notice('Несёшь тело. Подойди к мясорубке и нажми E')},2.0);add(-7.8,1.56,-3.55,state.shutters?'Ставни закрыты':'Опустить ставни · E',()=>{state.shutters=!state.shutters;updateWindowControls();notice(state.shutters?'Ставни закрыты':'Ставни открыты')},2.4);add(-7.8,1.56,-4.8,state.lightsOff?'Включить свет':'Выключить свет · E',()=>{state.lightsOff=!state.lightsOff;updateWindowControls();notice(state.lightsOff?'Свет выключен':'Свет включён')},2.3);candidates.sort((a,b)=>a.dist-b.dist);focus=candidates[0]||null;$('hint').classList.toggle('hidden',!focus);if(focus)$('hint').textContent=focus.label+(held?' · G — бросить тело':'');else if(held){$('hint').classList.remove('hidden');$('hint').textContent='G — бросить тело'}}
let shutterPanels=[];
function setupWindowControls(){const metal=mat(0x4a5153,.75,.55),stripes=mat(0x737d7d,.7,.5);for(const x of [-5.45,5.45]){let group=new THREE.Group();group.position.set(x,3.95,FRONT-.17);world.add(group);cube(group,0,0,0,3.86,2.94,.11,metal);for(let y=-1.4;y<1.45;y+=.18)cube(group,0,y,-.07,3.78,.035,.035,stripes);shutterPanels.push(group)}updateWindowControls()}
function updateNeonGlow(){if(!Array.isArray(neonSign))return;for(const letter of neonSign){letter.material.opacity=state?.lightsOff?.07:1;letter.material.color.set(state?.lightsOff?0x3e5644:0xffffff)}}
function updateWindowControls(){shutterPanels.forEach(g=>{g.visible=true;g.userData.targetY=state?.shutters?1.99:5.0});if(interiorLight)interiorLight.intensity=state?.lightsOff?.02:1.25;if(neonLamp)neonLamp.intensity=state?.lightsOff?0:.45;updateNeonGlow();ceilingFixtures.forEach(l=>l.intensity=state?.lightsOff?0:.42)}
let wallLevers=[];function setupWallLevers(){const metal=mat(0x454b48,.56,.65),red=mat(0x9a5c37,.55,.45),handle=mat(0xc1b59b,.48,.5);for(const [z,kind] of [[-4.8,'light'],[-3.55,'shutter']]){let g=new THREE.Group();g.position.set(-7.80,1.56,z);world.add(g);cube(g,0,0,0,.14,.72,.48,metal);for(let yy of [-.29,.29])for(let zz of [-.17,.17])ball(g,.09,yy,zz,.026,handle);let pivot=new THREE.Group();pivot.position.set(.14,0,0);g.add(pivot);rod(pivot,[0,0,0],[.22,.22,0],.052,red);ball(pivot,.22,.22,0,.09,handle);wallLevers.push({kind,pivot})}}
function animateWallLevers(dt){for(let sw of wallLevers){let down=sw.kind==='light'?state.lightsOff:state.shutters;sw.pivot.rotation.z+=( (down?-.85:.35)-sw.pivot.rotation.z)*Math.min(1,dt*9)}for(let g of shutterPanels){let target=g.userData.targetY??5;g.position.y+=(target-g.position.y)*Math.min(1,dt*3);g.visible=true}}
function createWeapon(){let g=new THREE.Group();camera.add(g);g.position.set(.52,-.54,-.85);const iron=mat(0x606e71,.4,.75),edge=mat(0x9ba5a1,.36,.8),grip=mat(0x342b27);rod(g,[0,-.3,0],[.06,.75,-.08],.048,iron);rod(g,[.06,.75,-.08],[.25,.96,-.09],.055,edge);rod(g,[.25,.96,-.09],[.38,.86,-.11],.045,edge);rod(g,[.25,.96,-.09],[.36,1.02,-.11],.045,edge);rod(g,[0,-.28,0],[0,-.02,0],.061,grip);g.rotation.z=-.25;return g}
let weapon;
let skyDome,skyUniforms,ashParticles,ashCoords,ashVelocities;
function setupAtmosphere(){
 skyUniforms={topColor:{value:new THREE.Color()},midColor:{value:new THREE.Color()},horizonColor:{value:new THREE.Color()}};
 const sm=new THREE.ShaderMaterial({uniforms:skyUniforms,side:THREE.BackSide,depthWrite:false,fog:false,
 vertexShader:`varying vec3 vDirection;void main(){vDirection=position;vec4 pos=projectionMatrix*modelViewMatrix*vec4(position,1.0);gl_Position=pos.xyww;}`,
 fragmentShader:`varying vec3 vDirection;uniform vec3 topColor;uniform vec3 midColor;uniform vec3 horizonColor;void main(){float h=normalize(vDirection).y;vec3 col=mix(horizonColor,midColor,smoothstep(-.12,.34,h));col=mix(col,topColor,smoothstep(.25,.92,h));gl_FragColor=vec4(col,1.);}`});
 skyDome=new THREE.Mesh(new THREE.SphereGeometry(125,24,16),sm);skyDome.frustumCulled=false;skyDome.renderOrder=-100;scene.add(skyDome);
 const count=1100;ashCoords=new Float32Array(count*3);ashVelocities=new Float32Array(count);
 for(let i=0;i<count;i++){let x,z;do{x=rnd(-17,17);z=rnd(-18,18)}while(Math.abs(x)<8.6&&z>-6.7&&z<6.7);
 ashCoords[i*3]=x;ashCoords[i*3+1]=rnd(.4,12);ashCoords[i*3+2]=z;ashVelocities[i]=rnd(.12,.43);}
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(ashCoords,3));
 ashParticles=new THREE.Points(geo,new THREE.PointsMaterial({color:0xb7b5ae,size:.23,transparent:true,opacity:.76,depthWrite:false,depthTest:true,sizeAttenuation:true}));scene.add(ashParticles);
}
function updateAtmosphere(dt,hour){
 if(!skyDome)return;skyDome.position.copy(camera.position);
 const keys=[{h:8,c:['#78a9d1','#b8c9d1','#efb88e']},{h:11,c:['#3386cf','#87c3ed','#c7dfed']},{h:16,c:['#3575b4','#d7a0ae','#e98563']},{h:18,c:['#242c68','#b34b79','#ef3c2e']},{h:19,c:['#172348','#6b385f','#a74150']},{h:21,c:['#08172e','#213754','#46546c']}];
 let a=keys[0],b=keys[keys.length-1];for(let i=0;i<keys.length-1;i++)if(hour>=keys[i].h&&hour<=keys[i+1].h){a=keys[i];b=keys[i+1];break}
 const t=clamp((hour-a.h)/(b.h-a.h),0,1),ease=t*t*(3-2*t);
 for(let i=0;i<3;i++)skyUniforms[['topColor','midColor','horizonColor'][i]].value.set(a.c[i]).lerp(new THREE.Color(b.c[i]),ease);
 scene.fog.color.copy(skyUniforms.horizonColor.value).lerp(skyUniforms.midColor.value,.35);
 const pos=ashParticles.geometry.attributes.position;
 for(let i=0;i<ashVelocities.length;i++){
  const j=i*3;ashCoords[j+1]-=dt*ashVelocities[i];ashCoords[j]+=(Math.sin(elapsed*.02+i)*.07+.04)*dt;
  if(Math.abs(ashCoords[j]-camera.position.x)>25||Math.abs(ashCoords[j+2]-camera.position.z)>25){ashCoords[j]=camera.position.x+rnd(-17,17);ashCoords[j+2]=camera.position.z+rnd(-17,17);ashCoords[j+1]=rnd(2,13);}
  if(ashCoords[j+1]<.1){ashCoords[j+1]=rnd(8,13);ashCoords[j]=camera.position.x+rnd(-17,17);ashCoords[j+2]=camera.position.z+rnd(-17,17);}
  // The cafe footprint is excluded even when wind shifts a particle.
  if(Math.abs(ashCoords[j])<8.6&&ashCoords[j+2]>-6.7&&ashCoords[j+2]<6.7)ashCoords[j]=ashCoords[j]<0?-9:9;
 }
 pos.needsUpdate=true;ashParticles.material.opacity=hour>19?.43:hour>16?.68:.82;
 ashParticles.material.color.set(hour>16&&hour<19?0xc1a09b:0xa6a4a0);
}
function setup(){if(!window.THREE){$('menu').querySelector('.small').textContent='Three.js не загрузился. Проверь подключение к интернету.';return}scene=new THREE.Scene();scene.background=new THREE.Color(0x68736b);scene.fog=new THREE.FogExp2(0x657067,.013);world=new THREE.Group();scene.add(world);camera=new THREE.PerspectiveCamera(76,innerWidth/innerHeight,.07,170);camera.rotation.order='YXZ';camera.position.set(2.2,1.7,-2.4);camera.rotation.y=.45;renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,1.7));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputEncoding=THREE.sRGBEncoding;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=0.67;$('view').appendChild(renderer.domElement);amb=new THREE.HemisphereLight(0x7d8780,0x24231f,.42);scene.add(amb);sun=new THREE.DirectionalLight(0xd6c7a9,1.05);sun.position.set(-20,30,-25);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);sun.shadow.camera.left=-30;sun.shadow.camera.right=30;sun.shadow.camera.top=30;sun.shadow.camera.bottom=-30;scene.add(sun);interiorLight=new THREE.PointLight(0xc6aa70,.16,6,2);interiorLight.position.set(-2,3,-1);scene.add(interiorLight);let second=new THREE.PointLight(0xbca474,.12,5.5,2);second.position.set(0,3,4);scene.add(second);windowLights=[interiorLight,second];createCafe();setupAtmosphere();const moonMat=new THREE.MeshBasicMaterial({color:0xd9e7f2,transparent:true,opacity:0,depthWrite:false});moonDisc=new THREE.Mesh(new THREE.SphereGeometry(2.1,24,16),moonMat);moonDisc.position.set(48,55,-70);scene.add(moonDisc);weapon=createWeapon();scene.add(camera);requestAnimationFrame(loop);refreshMenu()}
function recoverInvalidCustomer(p){
 if(isPublic(p.x,p.z,.22))return;
 const target=nearestPublicTarget(p.x,p.z);
 // Prefer walking out when a geometrically clear route exists. Only an already-invalid
 // NPC may be relocated to a collision-tested PUBLIC point as emergency recovery.
 if(canMove(target.x,target.z,.26)&&isPublic(target.x,target.z,.26)){
  p.x=target.x;p.z=target.z;p.mesh.position.set(p.x,0,p.z);
  p.path=null;p.navGoal=null;p.navTimer=0;p.stuck=0;p.blockFailures=0;
  p.fleeTarget=null;p.mode='leave';p.passedExit=false;
 }
}
function updateNpc(dt){if(running&&!paused&&Math.random()<dt*.35){const z=zombies.find(z=>z.mode!=='dead'&&z.life>0&&Math.hypot(z.x-player.x,z.z-player.z)<14);if(z)AudioManager.sound(Math.random()<.35?'breath':'groan',z.x,z.z,.5)}if(running&&!paused&&Math.random()<dt*.11){const c=customers.find(p=>p.mode!=='dead'&&Math.hypot(p.x-player.x,p.z-player.z)<8);if(c)AudioManager.sound(c.mode==='flee'?'scare':'human',c.x,c.z,.35)}scoutEveningDelivery();employeeUpdate(dt);updateFallenCustomers(dt);
 for(const p of customers)recoverInvalidCustomer(p);
 spawnCd-=dt;
 if(spawnCd<=0&&queue.length&&elapsed<595&&customers.filter(p=>!['leave','flee','seat','eat','dead'].includes(p.mode)).length<4&&customers.every(p=>p.mode!=='enter')){spawnCustomer();spawnCd=rnd(7,12)}
 zombieCd-=dt;if(zombieCd<=0){spawnZombie();zombieCd=rnd(18,32)*Math.max(.55,1-state.day*.025)}
 const inLine=customers.filter(p=>['enter','line','wait'].includes(p.mode));
 for(let i=0;i<inLine.length;i++){
  const p=inLine[i];
  // The serving counter is at x=-4.55,z=-1.30. Customers stand on its FRONT side (negative z).
  // Reserve separate accessible slots parallel to the counter, not a line extending through the partition.
  const slots=[[-4.7,-2.48],[-3.65,-2.48],[-5.7,-2.48],[-2.7,-2.48],[-6.6,-2.48],[-4.7,-3.45],[-3.65,-3.45],[-5.7,-3.45]];
  const slot=slots[Math.min(i+(p.queueOffset||0),slots.length-1)];const tx=slot[0],tz=slot[1];
  if(p.mode==='enter'||p.laneDirection==='in'){
   // Approach the real exterior doorway with collision-aware pathfinding first.
   // The door corridor owns approach, crossing and completion. Do not route to
   // an exterior waypoint with A*: the closed leaf can make that route fail.
   if(moveDoorCorridor(p,dt,1.25)){
    p.mode='line';p.laneDirection=null;p.path=null;p.navGoal=null;
    p.navTimer=0;p.stuck=0;p.blockFailures=0;p.queueOffset=0;
   }
  }else if(Math.hypot(p.x-tx,p.z-tz)>.27){
   moveNpc(p,tx,tz,dt,1.05);p.mode='line';
   if((p.stuck||0)>1.4){p.path=null;p.navTimer=0;p.stuck=0}
  }else if(i===0){if(p.mode!=='wait'){p.mode='wait';p.wait=0;notice('У стойки: '+['🍲 мясной паёк','💧 вода','🍲 горячий паёк'][p.order])}}
  else p.mode='line';
 }
 for(let p of [...customers]){
  if(p.mode==='recover'){p.recoverTimer-=dt;if(p.recoverTimer<=0){const prior=p.prePanicMode;p.mode=prior==='seat'||prior==='eat'?'leave':prior==='leave'?'leave':'line';p.prePanicMode=null;p.passedExit=false;p.fleeTarget=null;p.path=null;p.navGoal=null;p.navTimer=0;p.stuck=0;p.blockFailures=0;}}
  if(p.infectionTimer>0){p.infectionTimer-=dt;if(p.infectionTimer<=0){mutate(p);continue}}
  if(p.icon)p.icon.visible=p.mode==='wait';
  if(p.mode==='wait'){p.wait+=dt;if(p.wait>100){state.rating=Math.max(0,state.rating-2);p.mode='leave'}}
  else if(p.mode==='seat'){
   // Фиксированные отдельные места у двух столиков. Не двигаться в центр мебели.
   if(p.seatTarget===undefined){p.seatTarget=(stats.sold%4);}
   const spots=[[3.65,-3.7],[6.5,-3.7],[3.65,-.55],[6.5,-.55]];
   let [sx,sz]=spots[p.seatTarget];
   if(Math.hypot(p.x-sx,p.z-sz)<.55){
    p.mode='eat';p.wait=7;
    // Голова и колени должны смотреть к столу. Перед модели — локальная ось -Z.
    const tableX=p.seatTarget%2===0?4.6:5.6;
    const tableZ=p.seatTarget<2?-3.7:-.55;
    p.mesh.rotation.y=Math.atan2(-(tableX-p.x),-(tableZ-p.z));
    p.mesh.userData.legs.forEach(l=>{l.rotation.x=1.18;l.rotation.z=0});
    p.mesh.userData.arms.forEach(a=>a.rotation.x=-.5);
    p.mesh.position.y=-.28;
   }
   else {let waypoint=p.z>1?{x:2.6,z:-1.6}:null;if(waypoint&&Math.hypot(p.x-waypoint.x,p.z-waypoint.z)>.6)moveNpc(p,waypoint.x,waypoint.z,dt);else moveNpc(p,sx,sz,dt)}
  }
  else if(p.mode==='eat'){p.wait-=dt;if(p.wait<=0){p.mode='leave';p.mesh.position.y=0;p.mesh.userData.legs.forEach(l=>l.rotation.x=0);p.mesh.userData.arms.forEach(a=>a.rotation.x=0);p.path=null}}
  else if(p.mode==='leave'){
   if(!p.passedExit){
    // Never run straight from a table or the counter to the door through furniture.
    if(p.z>FRONT+1.10+.22&&Math.hypot(p.x,p.z-(FRONT+1.10))>.42)moveNpc(p,0,FRONT+1.10,dt,1.3);
    else if(doorLane(p,dt,1.3,true)){p.passedExit=true;p.path=null;p.navGoal=null;p.navTimer=0;}
   }
   else if(moveNpc(p,p.exitX??(p.exitX=(Math.random()-.5)*5),-14,dt,1.3)<.4){removeNpc(p);customers=customers.filter(q=>q!==p)}
  }else if(p.mode==='flee'){
   const dangers=zombies.filter(z=>z.mode!=='dead'&&Math.hypot(z.x-p.x,z.z-p.z)<11);
   if(!dangers.length){p.panicTimer=(p.panicTimer||0)-dt;if(p.panicTimer<=0){p.mode='recover';p.recoverTimer=.65;p.passedExit=false;p.fleeTarget=null;p.fleeReplan=0;p.path=null;p.navGoal=null;p.navTimer=0;p.stuck=0;p.blockFailures=0}continue}
   p.panicTimer=3;p.fleeReplan=(p.fleeReplan||0)-dt;
   if(p.fleeReplan<=0||!p.fleeTarget||Math.hypot(p.x-p.fleeTarget.x,p.z-p.fleeTarget.z)<.5){
    p.fleeReplan=.8;
    let best=null,bestScore=-Infinity;
    for(let j=0;j<16;j++){
     const angle=j*Math.PI/8,tx=p.x+Math.cos(angle)*4,tz=p.z+Math.sin(angle)*4;
     if(!npcCanMove(p,tx,tz,.27))continue;
     const path=navPath(p,tx,tz);if(!path)continue;
     let closest=Infinity,penalty=0;
     for(const z of dangers){const distance=Math.hypot(tx-z.x,tz-z.z);closest=Math.min(closest,distance);for(const q of path){const dd=Math.hypot(q.x-z.x,q.z-z.z);if(dd<2.3)penalty+=(2.3-dd)*5}}
     const current=Math.min(...dangers.map(z=>Math.hypot(p.x-z.x,p.z-z.z)));
     const score=closest-current-penalty-path.length*.08;
     if(score>bestScore){bestScore=score;best={x:tx,z:tz}}
    }
    if(best){p.fleeTarget=best;p.path=null;p.navTimer=0}else{p.fleeTarget=null;p.path=null}
   }
   if(p.fleeTarget)moveNpc(p,p.fleeTarget.x,p.fleeTarget.z,dt,2.35);
   // Only defend when pinned at close range; never approach a zombie to fight.
   const near=dangers.find(z=>Math.hypot(z.x-p.x,z.z-p.z)<1.05);
   if(near&&(p.stuck||0)>.55&&(p.defendCooldown||0)<=0){near.life-=7;p.defendCooldown=1.6;p.fleeReplan=0;if(near.life<=0){near.mode='dead';bodies.push(near);zombies=zombies.filter(z=>z!==near);near.mesh.rotation.z=-Math.PI/2;near.mesh.position.y=.35;stats.kills++}}
   p.defendCooldown=Math.max(0,(p.defendCooldown||0)-dt);
  }
 }
 for(let z of [...zombies]){
  if(z.mode==='dead')continue;
  let targets=[{x:player.x,z:player.z,player:true}];
  for(let c of customers)if(c.mode!=='dead'&&c.mode!=='leave')targets.push(c);
  let target=targets.reduce((a,b)=>Math.hypot(z.x-a.x,z.z-a.z)<Math.hypot(z.x-b.x,z.z-b.z)?a:b);
  let dist=Math.hypot(z.x-target.x,z.z-target.z);
  if(dist<1.35){z.attack-=dt;if(z.attack<=0){z.attack=.95;AudioManager.sound('zombieAttack',z.x,z.z,.7);if(target.player)playerHurt(14+state.day*.6);else{target.life-=20;AudioManager.sound('humanHurt',target.x,target.z,.9);if(target.mode!=='dead'){if(target.mode!=='flee'&&target.mode!=='recover')target.prePanicMode=target.mode;target.mode='flee';target.passedExit=false;target.panicTimer=3;target.path=null}if(target.life<=0){killCustomer(target)}}}}
  else if(z.z<-6.8&&target.z>-5.5)moveNpc(z,0,-5.3,dt,.8+state.day*.02);
  else moveNpc(z,target.x,target.z,dt,1.15+state.day*.025);if(dist<7&&!z.audioAlerted){z.audioAlerted=true;AudioManager.sound('zombieAlert',z.x,z.z,.85)}
  for(let c of customers){if(c.mode==='dead')continue;let d=Math.hypot(c.x-z.x,c.z-z.z);if(d<4.2&&c.mode!=='flee'&&c.mode!=='leave'&&c.mode!=='dead'){c.prePanicMode=c.mode;c.mode='flee';AudioManager.sound('human',c.x,c.z,.55);c.panicTimer=3;c.passedExit=false;c.path=null;c.navTimer=0;c.fleeReplan=0}}
 }
}
let windDebris=null;
function initWindDebris(){if(windDebris||!world)return;windDebris=[];
const mats=[mat(0x95846b),mat(0x57584d),mat(0x977d57),mat(0x393e3a),mat(0x706d5e),mat(0x625047)];
for(let i=0;i<115;i++){
 let kind=i%6,mesh;
 if(kind===0){mesh=new THREE.Mesh(new THREE.PlaneGeometry(.25,.17),mats[i%6]);mesh.material.side=THREE.DoubleSide}
 else if(kind===1){mesh=new THREE.Mesh(new THREE.BoxGeometry(.26,.04,.1),mats[i%6])}
 else if(kind===2){mesh=new THREE.Mesh(new THREE.TetrahedronGeometry(.12),mats[i%6])}
 else if(kind===3){mesh=new THREE.Mesh(new THREE.BoxGeometry(.12,.07,.3),mats[i%6])}
 else if(kind===4){mesh=new THREE.Mesh(new THREE.PlaneGeometry(.12,.37),mats[i%6]);mesh.material.side=THREE.DoubleSide}
 else {mesh=new THREE.Mesh(new THREE.DodecahedronGeometry(.09),mats[i%6])}
 mesh.position.set(rnd(-35,35),rnd(.08,1.8),rnd(-55,32));mesh.rotation.set(rnd(0,6),rnd(0,6),rnd(0,6));world.add(mesh);
 windDebris.push({mesh,kind,speed:rnd(.7,3),phase:rnd(0,6.28),height:mesh.position.y})
}}
function updateWindDebris(dt){initWindDebris();for(let d of windDebris){let p=d.mesh.position,t=elapsed*.55+d.phase;p.x+=dt*d.speed*(1+.3*Math.sin(t));p.z+=dt*(.3+Math.sin(t*.4)*.45)*d.speed;p.y=Math.max(.045,d.height+Math.sin(t*1.7)*(.13+d.kind*.07));d.mesh.rotation.x+=dt*(.8+d.kind*.2);d.mesh.rotation.y+=dt*(1.2+d.kind*.3);d.mesh.rotation.z+=dt*.8;if(p.x>36){p.x=-36;p.z=rnd(-55,32);d.height=rnd(.08,1.8)}}}
let nightStage=0,nightTimer=0,nightZombies=[];
function resetNight(){nightStage=0;nightTimer=0;nightZombies=[]}
function glassSound(){try{let ctx=new (window.AudioContext||window.webkitAudioContext)();let buf=ctx.createBuffer(1,ctx.sampleRate*.7,ctx.sampleRate),a=buf.getChannelData(0);for(let i=0;i<a.length;i++)a[i]=(Math.random()*2-1)*Math.pow(1-i/a.length,3);let src=ctx.createBufferSource();src.buffer=buf;let filter=ctx.createBiquadFilter();filter.type='highpass';filter.frequency.value=800;src.connect(filter);filter.connect(ctx.destination);src.start();src.onended=()=>ctx.close()}catch(e){}}
function updateNightEvents(dt){if(elapsed<600)return;
 const safe=state.shutters&&state.lightsOff;
 if(nightStage===0){nightStage=1;nightTimer=0;notice('Солнце садится. Скоро заражённые выйдут на улицы. Закрой ставни и выключи свет.');return}
 if(safe&&nightStage<3){nightStage=5;notice('Кафе подготовлено к ночи.');return}
 if(nightStage===5)return;
 nightTimer+=dt;
 if(nightStage===1&&nightTimer>18){nightStage=2;nightTimer=0;notice('Снаружи слышны шаги и рычание. Немедленно закрой окна и погаси свет!');glassSound();return}
 if(nightStage===2&&nightTimer>18){nightStage=3;nightTimer=0;nightZombies=[];let count=3+Math.floor(Math.random()*3);for(let i=0;i<count;i++){let z=npc(5,-2+i*1.1,-18-i*.8);z.zombie=true;z.mode='zombie';z.life=55+state.day*5;mutateVisual(z);zombies.push(z);nightZombies.push(z)}notice('Заражённые идут к двери!');return}
 if(nightStage===3){if(safe&&nightZombies.every(z=>z.mode==='dead')){nightStage=5;notice('Нападение отбито. Теперь можно спать.');return}if(nightTimer>85&&!safe){nightStage=4;glassSound();document.body.style.background='#000';if(renderer)renderer.domElement.style.filter='brightness(0)';die('Заражённые прорвались через окна. Кафе не пережило эту ночь.');return}}
}
function update(dt){elapsed+=dt*2.2;updateWindDebris(dt);animateWallLevers(dt);attackCd=Math.max(0,attackCd-dt);if(waterJob>0){waterJob-=dt;if(waterJob<=0){filterBatch=state.filterLevel>=2?5:3;AudioManager.sound('waterDone',-2,1,.7);notice('Опреснитель закончил очистку. Забери воду!')}}if(cookJob>0){cookJob-=dt;if(cookJob<=0){const batch=UPGRADES.grillLevel.output[(state.grillLevel||1)-1];state.food+=batch;AudioManager.sound('grillDone',2,1,.7);notice('Готовые пайки: +'+batch)}}const hour=8+elapsed/60;
 const sunset=clamp((hour-16)/2,0,1),dark=clamp((hour-18)/2,0,1),warm=Math.sin(sunset*Math.PI);
 sun.intensity=.88*(1-dark)+.008*dark;amb.intensity=.34*(1-dark)+.018*dark;
 sun.color.setRGB(1,.95-.43*warm,.84-.60*warm);
 scene.background.setRGB(.32*(1-dark)+.018*dark+.28*warm*(1-dark),.41*(1-dark)+.025*dark-.23*warm*(1-dark),.49*(1-dark)+.058*dark-.34*warm*(1-dark));
 scene.fog.color.copy(scene.background);updateAtmosphere(dt,hour);sun.position.set(-20,Math.max(-3,27-36*sunset),-25);
 if(moonDisc){moonDisc.material.opacity=clamp((hour-18.5)/1.4,0,.9);moonDisc.visible=hour>=18.5}
 windowLights.forEach((l,i)=>l.intensity=state.lightsOff?0:(i===0?.16:.12));ceilingFixtures.forEach(l=>l.intensity=state.lightsOff?0:1.6);
 if(neonLamp)neonLamp.intensity=state.lightsOff?0:.35;if(interiorLight)interiorLight.intensity=state.lightsOff?0:.16;
 updateNeonGlow();updateNightEvents(dt);
 player.jumpY=player.jumpY||0;player.jumpV=player.jumpV||0;player.crouch=player.crouch||0;if(keys.Space&&player.jumpY<.001&&player.jumpV===0)player.jumpV=5.3;player.jumpV-=14*dt;player.jumpY=Math.max(0,player.jumpY+player.jumpV*dt);if(player.jumpY===0)player.jumpV=0;player.crouch+=( (keys.ControlLeft||keys.ControlRight?1:0)-player.crouch)*Math.min(1,dt*9);let mx=(keys.KeyD?1:0)-(keys.KeyA?1:0),mz=(keys.KeyS?1:0)-(keys.KeyW?1:0),len=Math.hypot(mx,mz)||1;let sprint=(keys.ShiftLeft||keys.ShiftRight)&&player.st>4&&(mx||mz);let speed=(sprint?5.0:2.8)*(1-.48*player.crouch);if(sprint)player.st=Math.max(0,player.st-dt*24);else player.st=Math.min(100,player.st+dt*13);if((mx||mz)&&player.jumpY<.08){player.audioStep=(player.audioStep||0)+dt*(sprint?3.7:2.3);if(player.audioStep>=1){player.audioStep=0;AudioManager.sound('footstep',player.x,player.z,sprint?.34:.22)}}let dx=(Math.cos(yaw)*mx+Math.sin(yaw)*mz)/len*speed*dt,dz=(-Math.sin(yaw)*mx+Math.cos(yaw)*mz)/len*speed*dt;moveWithCollision(player,dx,dz,.33);player.hunger=Math.max(0,player.hunger-dt*.018);player.thirst=Math.max(0,player.thirst-dt*.027);if((player.hunger<=0||player.thirst<=0)&&Math.random()<dt*.5)playerHurt(2);camera.position.set(player.x,1.72+player.jumpY-player.crouch*.60+Math.sin(elapsed*.35)*.012,player.z);if(held?.mesh?.parent===camera){held.mesh.position.y=-.83+Math.sin(elapsed*.4)*.025;held.mesh.visible=true;}camera.rotation.set(pitch,yaw,0,'YXZ');for(let d of doors){
 if(d.pendingClose){const busy=[...customers,...zombies,...employees].some(p=>p.mode!=='dead'&&Math.abs(p.x-d.center)<.72&&Math.abs(p.z-d.coord)<.48);if(!busy)toggleDoor(d,false);}
 if(d===frontDoor()&&elapsed>=600&&d.manualHold){d.auto=0;}
 if(d.auto>0){d.auto-=dt;if(d.auto<=0){let near=[player,...customers,...zombies].some(p=>Math.hypot(p.x-(d.axis==='z'?d.center:d.coord),p.z-(d.axis==='z'?d.coord:d.center))<1.5);if(!near)toggleDoor(d,false);else d.auto=2}}d.angle+=(d.target-d.angle)*Math.min(1,dt*9);d.pivot.rotation.y=d.angle}if(weapon.userData.swing>0){weapon.userData.swing=Math.max(0,weapon.userData.swing-dt*3);weapon.rotation.x=-Math.sin((1-weapon.userData.swing)*Math.PI)*.8}else weapon.rotation.x+=(0-weapon.rotation.x)*Math.min(1,dt*8);updateNpc(dt);findFocus();updateHud();if(toastTimer>0){toastTimer-=dt;if(toastTimer<=0)$('toast').style.opacity=0}if(hitFlash>0){hitFlash-=dt;$('damage').style.opacity=hitFlash*.5}else $('damage').style.opacity=0}
function updateHud(){if(!state)return;$('day').textContent=state.day;$('clock').textContent=String(8+Math.floor(elapsed/60)).padStart(2,'0')+':'+String(Math.floor(elapsed%60)).padStart(2,'0');$('hp').textContent=Math.ceil(player.hp);$('hpbar').style.width=clamp(player.hp,0,100)+'%';$('stbar').style.width=clamp(player.st,0,100)+'%';$('rating').textContent=state.rating+'%';$('coins').textContent=state.coins;$('stats').innerHTML=`🍲 Пайки: <b>${state.food}</b> · 🥩 Мясо: <b>${state.meat}</b> · 💧 Вода: <b>${state.water}</b><br>Голод: ${Math.ceil(player.hunger)}% · Жажда: ${Math.ceil(player.thirst)}%<br>XP: ${state.xp} · Заказов: ${stats.sold} · Зомби: ${stats.kills}<br>${player.waterCarry?'🪣 Несёшь грязную воду':''}`;let waiting=customers.filter(p=>p.mode==='wait');$('order').innerHTML=waiting.length?'<b>ЗАКАЗ У СТОЙКИ</b><br>'+waiting.map(p=>['🍲 МЯСНОЙ ПАЁК','💧 ЧИСТАЯ ВОДА','🍲 ГОРЯЧИЙ ПАЁК'][p.order]).join('<br>')+'<br><small>Подойди к стойке и нажми E</small>':'Ожидаем посетителей · В очереди: '+queue.length;let canvas=$('minimap').querySelector('canvas'),ctx=canvas.getContext('2d');ctx.clearRect(0,0,300,240);ctx.fillStyle='#3c423c';ctx.fillRect(0,0,300,240);ctx.strokeStyle='#b6b4a2';ctx.lineWidth=4;ctx.strokeRect(35,25,230,190);ctx.beginPath();ctx.moveTo(35,120);ctx.lineTo(265,120);ctx.stroke();ctx.fillStyle='#dcb273';ctx.beginPath();ctx.arc(150+player.x*13.5,120+player.z*13.5,5,0,7);ctx.fill();ctx.fillStyle='#d75b53';for(let z of zombies){ctx.beginPath();ctx.arc(150+z.x*13.5,120+z.z*13.5,3,0,7);ctx.fill()}}
function loop(t){requestAnimationFrame(loop);let dt=Math.min(.04,(t-last)/1000||0);last=t;if(running&&!paused&&!modalOpen&&!dead)update(dt);AudioManager.tick(dt);if(renderer)renderer.render(scene,camera)}
function start(data){AudioManager.unlock();if(!scene)return;running=true;paused=false;dayStart(data);$('menu').classList.add('hidden');$('hud').classList.remove('hidden');renderer.domElement.requestPointerLock?.()}
function resume(){AudioManager.unlock();if(!scene)return;running=true;paused=false;dead=false;$('menu').classList.add('hidden');$('hud').classList.remove('hidden');renderer.domElement.requestPointerLock?.()}
function showMenu(){paused=true;keys={};document.exitPointerLock?.();$('menu').classList.remove('hidden');$('hud').classList.add('hidden');refreshMenu()}
function refreshMenu(){$('continue').disabled=!readSave()&&!running}
$('new').onclick=()=>{if(running){showModal('НОВАЯ ИГРА','Текущий день будет сброшен. Начать заново?',[['ДА, НАЧАТЬ',()=>{hideModal();start(defaults())}],['ОТМЕНА',hideModal]])}else start(defaults())};$('continue').onclick=()=>{if(running)resume();else{const saved=readSave();if(saved)start(saved);else refreshMenu()}};$('help').onclick=()=>showModal('КАК ИГРАТЬ','WASD — перемещение; Shift — бег (тратит выносливость).\nE — открыть дверь, выдать заказ, использовать оборудование.\nG — бросить тело; Space — прыжок; Ctrl — присесть; L — свет; O — ставни.\nЛКМ / F — удар ломом. Можно ударить подозрительного посетителя ДО заказа.\n1 — съесть готовый паёк (+голод, +здоровье).\n2 — выпить чистую воду (+жажда).\n3 — перевязка: расходует паёк, восстанавливает здоровье.\n\nВода: задняя дверь → бочка → опреснитель → ожидание → забрать воду.\nМясо: убить зомби → поднять тело → мясорубка → жаровня.\nПосле 15:30: выключить свет и закрыть ставни у левой стены зала, затем спать.\nСохранение происходит после завершения дня.',[['ПОНЯТНО',hideModal]]);$('settings').onclick=()=>showModal('НАСТРОЙКИ','Для плавной игры отключи тяжёлые тени. Чувствительность мыши меняется ниже.',[['ТЕНИ: ВКЛ/ВЫКЛ',()=>{renderer.shadowMap.enabled=!renderer.shadowMap.enabled;notice(renderer.shadowMap.enabled?'Тени включены':'Тени отключены')}],['ЧУВСТВИТЕЛЬНОСТЬ +',()=>{sensitivity=Math.min(.006,sensitivity+.0004)}],['ЧУВСТВИТЕЛЬНОСТЬ −',()=>{sensitivity=Math.max(.0008,sensitivity-.0004)}],['ЗАКРЫТЬ',hideModal]]);
let sensitivity=.0023;document.addEventListener('keydown',e=>{if(['Space','ArrowUp','ArrowDown'].includes(e.code))e.preventDefault();if(!modalOpen)keys[e.code]=true;if(e.repeat)return;if(e.code==='Escape'){if(modalOpen){e.preventDefault();pointerReentryPending=true;hideModal();return}if(running){if(paused)resume();else showMenu()}}if(!running||paused||modalOpen)return;if(e.code==='KeyL'){state.lightsOff=!state.lightsOff;updateWindowControls();notice(state.lightsOff?'Свет выключен':'Свет включён')}if(e.code==='KeyO'){state.shutters=!state.shutters;updateWindowControls();notice(state.shutters?'Ставни закрыты':'Ставни открыты')}if(e.code==='KeyE')interact();if(e.code==='KeyG')dropBody();if(e.code==='KeyF')attack();if(e.code==='Digit1'){if(state.food>0){state.food--;player.hunger=clamp(player.hunger+38,0,100);player.hp=clamp(player.hp+12,0,100);notice('Паёк съеден: +38 голода, +12 здоровья')}else notice('Нет готового пайка')}if(e.code==='Digit2'){if(state.water>0){state.water--;player.thirst=clamp(player.thirst+48,0,100);notice('Вода выпита: +48 жажды')}else notice('Нет чистой воды')}if(e.code==='Digit3'){if(state.food>0){state.food--;player.hp=clamp(player.hp+35,0,100);notice('Перевязка: +35 здоровья, −1 паёк')}else notice('Для перевязки нужен паёк')}});document.addEventListener('keyup',e=>keys[e.code]=false);document.addEventListener('mousemove',e=>{if(document.pointerLockElement===renderer?.domElement&&!paused&&!modalOpen){yaw-=e.movementX*sensitivity;pitch=clamp(pitch-e.movementY*sensitivity,-1.35,1.35)}});document.addEventListener('mousedown',e=>{if(e.button===0&&document.pointerLockElement===renderer?.domElement&&!modalOpen)attack()});renderer?.domElement?.addEventListener('click',()=>{if(running&&!paused&&!modalOpen&&!dead&&document.pointerLockElement!==renderer.domElement)requestGamePointer()});$('modalClose').addEventListener('click',e=>{e.preventDefault();e.stopPropagation();hideModal()});document.addEventListener('pointerlockchange',()=>{const locked=document.pointerLockElement===renderer?.domElement;if(locked){pointerUnlockForModal=false;pointerReentryPending=false;return}if(pointerUnlockForModal){pointerUnlockForModal=false;return}if(modalOpen||paused||!running||dead||pointerReentryPending)return;showMenu()});document.addEventListener('pointerlockerror',()=>{if(running&&!paused&&!modalOpen){pointerReentryPending=true;notice('Нажми ЛКМ по игре, чтобы вернуть управление мышью')}});document.addEventListener('visibilitychange',()=>{if(document.hidden&&running&&!paused)showMenu()});window.addEventListener('resize',()=>{if(!camera)return;camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight)});setup();

window.addEventListener('keydown',e=>{if(e.code==='F9'){e.preventDefault();if(world)toggleDoorDebug();console.info('SCOUT OFFSCREEN', {hired:scoutHired(),lastDeliveryDay:state?.scoutDeliveryDay,parts:state?.parts});}});
setInterval(()=>{if(!doorDebug||!running)return;const p=customers.find(p=>p.mode==='enter')||customers[0];if(!p)return;const d=frontDoor();console.info('[DOOR NPC]',{mode:p.mode,position:[+p.x.toFixed(2),+p.z.toFixed(2)],goal:p.navGoal,path:p.path?.slice(0,4),stop:p.stopReason,doorOpen:d?.open,doorAngle:d?.angle,block:npcBlockReason(p,p.x,p.z,.20),diagnostic:p.doorDiagnostic});},1500);
