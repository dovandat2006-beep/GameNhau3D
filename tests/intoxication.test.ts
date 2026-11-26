import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {Game} from '../server/game';
import {VoiceService} from '../server/voice';
import {advance,movementSpeed,seatPosition,CHEERS_MS} from '../shared/world';
import {drunkLevel,SOBER_INTERVAL_MS,MAX_INTOXICATION,recoveredIntoxication,gestureDuration} from '../shared/social';
import {AvatarRig,AVATAR_PARTS} from '../client/avatar';
function fixture(){
 let now=1000;const patches:any[]=[];const game=new Game(new VoiceService('','',''),{state:()=>{},chat:()=>{},effect:()=>{},kick:()=>{},players:(_r,p)=>patches.push(p)},()=>now);
 const joined=game.enter({mode:'create',profile:{name:'[TEST] Say ảo',color:'#547f75',avatar:0}},'a');
 return {game,...joined,patches,now:()=>now,wait:(ms:number)=>{now+=ms;}};
}
const base={phase:0,motion:0,seated:false,cheers:null,wave:null,time:0,avatar:0,reduced:false};
test('completed drinks cap the load at level 10; recovery keeps the lifetime count',async()=>{
 const f=fixture(),p=f.player;Object.assign(p,seatPosition({table:1,index:0}));await f.game.command('a',{type:'sit',table:1,seat:0});
 for(let i=0;i<35;i++){await f.game.command('a',{type:'emote',emote:'cheers'});f.wait(CHEERS_MS);f.game.tick();}
 assert.equal(p.beerCount,35);assert.equal(p.intoxication,MAX_INTOXICATION);assert.equal(drunkLevel(p.intoxication),10);
 f.wait(SOBER_INTERVAL_MS-1);f.game.tick();assert.equal(drunkLevel(p.intoxication),10);
 f.wait(1);f.game.tick();assert.equal(drunkLevel(p.intoxication),9);assert.equal(p.beerCount,35);
 for(let level=8;level>=0;level--){f.wait(SOBER_INTERVAL_MS);f.game.tick();assert.equal(drunkLevel(p.intoxication),level);}
 assert.equal(p.soberAt,0);assert.equal(p.intoxication,0);assert.equal(p.beerCount,35);
 const count=f.patches.length;f.wait(200000);f.game.tick();assert.equal(f.patches.length,count,'no needless recovery patches while sober');
 await f.game.command('a',{type:'emote',emote:'cheers'});f.wait(CHEERS_MS);f.game.tick();assert.equal(p.intoxication,1);assert.equal(drunkLevel(p.intoxication),0,'a recovered guest starts again from zero load');
});
test('idle time catches up across timer delays and reconnect; uncompleted drinks stay cancelled',async()=>{
 const f=fixture(),p=f.player;Object.assign(p,{beerCount:8,intoxication:8,soberAt:f.now()+SOBER_INTERVAL_MS,carryingBeer:true});
 await f.game.command('a',{type:'emote',emote:'cheers'});f.wait(CHEERS_MS+SOBER_INTERVAL_MS*2);f.game.tick();
 assert.equal(p.beerCount,9);assert.equal(p.intoxication,0,'settle the drink at its deadline, then catch up recovery');
 Object.assign(p,{intoxication:5,soberAt:f.now()+10000});const token=p.token;
 f.game.disconnect('a');f.wait(12000);
 const resumed=f.game.enter({mode:'resume',code:f.room.code,token,profile:{name:'[TEST] Say ảo',color:'#547f75',avatar:0}},'b');
 assert.equal(resumed.player.intoxication,0);assert.equal(resumed.player.beerCount,9);
});
test('recovery thresholds and movement stay bounded; crawling is slower and collision checked',()=>{
 assert.equal(drunkLevel(10000),10);assert.equal(drunkLevel(32),10);assert.equal(drunkLevel(31),9);
 assert.deepEqual(recoveredIntoxication(8,60000,60000),{intoxication:5,soberAt:120000});
 assert.deepEqual(recoveredIntoxication(5,60000,60000),{intoxication:0,soberAt:0});
 const sober=advance({x:0,z:40},1,0,.1,[],750),stagger=advance({x:0,z:40,intoxication:29},1,0,.1,[],750),crawl=advance({x:0,z:40,intoxication:32},1,0,.1,[],750);
 assert.equal(sober.x,.2);assert.ok(Math.abs(stagger.z-40)>.005);assert.ok(Math.hypot(stagger.x,stagger.z-40)<=movementSpeed(29)*.1+1e-10);assert.equal(crawl.x,.06);assert.equal(crawl.z,40);
 const wall=advance({x:27,z:40,intoxication:32},1,0,.1,[],750);assert.equal(wall.x,27);
});
test('level 10 blocks standing dances/carry/gestures, permits seating, and resumes walking after recovery',async()=>{
 const f=fixture(),p=f.player;Object.assign(p,{beerCount:32,intoxication:32,soberAt:f.now()+SOBER_INTERVAL_MS});
 await assert.rejects(f.game.command('a',{type:'dance',style:'hiphop'}),/cấp 10/);
 await assert.rejects(f.game.command('a',{type:'carry',enabled:true}),/cấp 10/);
 await assert.rejects(f.game.command('a',{type:'emote',emote:'smoke'}),/cấp 10/);
 Object.assign(p,seatPosition({table:1,index:0}));await f.game.command('a',{type:'sit',table:1,seat:0});
 await f.game.command('a',{type:'carry',enabled:true});await f.game.command('a',{type:'stand'});assert.equal(p.carryingBeer,false);assert.equal(p.seat,null);
 f.wait(SOBER_INTERVAL_MS);f.game.tick();assert.equal(drunkLevel(p.intoxication),9);await f.game.command('a',{type:'dance',style:'hiphop'});assert.equal(p.dance,'hiphop');
 await assert.rejects(f.game.command('a',{type:'sober',intoxication:0}),/không hợp lệ/);
});
test('smoking is a synchronized finite gesture, needs a free hand and cancels on walking',async()=>{
 const f=fixture(),p=f.player;p.carryingBeer=true;
 await assert.rejects(f.game.command('a',{type:'emote',emote:'smoke'}),/Cất cốc/);p.carryingBeer=false;
 await f.game.command('a',{type:'emote',emote:'smoke'});assert.equal(p.emoteUntil-f.now(),gestureDuration('smoke'));assert.equal(p.intoxication,0);
 f.wait(1000);f.game.input('a',{x:1,z:0});f.game.tick();assert.equal(p.emote,'');assert.equal(p.beerCount,0);
});
test('crawl pose stays low on hands and knees with continuous fixed-length limbs',()=>{
 const rig=new AvatarRig();
 for(let i=0;i<120;i++){
  rig.sample({...base,phase:i/120*Math.PI*2,motion:1,intoxication:32,carry:true,dance:'hiphop',wave:1,gesture:'smoke',gestureTime:1});
  const head=new THREE.Vector3().setFromMatrixPosition(rig.matrices.head);assert.ok(head.y<1,'head lowers into a crawl');assert.ok(rig.rightHand.y<.2);assert.equal(rig.cupVisible,false);
  for(const part of AVATAR_PARTS)assert.ok(rig.matrices[part.key].elements.every(Number.isFinite));
  for(const [name,j] of Object.entries(rig.limbs)){
   const lengths=name.startsWith('arm')?[.32,.32]:[.5,.52];
   assert.ok(Math.abs(j.start.distanceTo(j.joint)-lengths[0])<1e-6,`${name} upper`);assert.ok(Math.abs(j.joint.distanceTo(j.end)-lengths[1])<1e-6,`${name} lower`);
   assert.ok(j.joint.y>=.03,`${name} joints above the floor`);
  }
 }
 rig.sample({...base,intoxication:29});assert.ok(new THREE.Vector3().setFromMatrixPosition(rig.matrices.head).y>1.8,'recovery restores upright stance');
});
test('smoking brings the filter to the mouth and hides the cigarette at the end',()=>{
 const rig=new AvatarRig();
 for(const seated of [false,true])for(const t of [1,1.5,2,2.8]){
  rig.sample({...base,seated,gesture:'smoke',gestureTime:t});assert.ok(rig.smokeContact.distanceTo(rig.mouthPosition)<1e-8);
  for(const [name,j] of Object.entries(rig.limbs))if(name.startsWith('arm')){assert.ok(Math.abs(j.start.distanceTo(j.joint)-.32)<1e-6);assert.ok(Math.abs(j.joint.distanceTo(j.end)-.32)<1e-6);}
 }
 rig.sample({...base,gesture:'smoke',gestureTime:5});assert.equal(rig.matrices.cigarette.determinant(),0);
 rig.sample({...base,gesture:'smoke',gestureTime:3,reduced:true});assert.equal(rig.matrices.smoke0.determinant(),0);
});

test('vomit requires current level 5+, accepts crawling, and keeps counts/recovery unchanged',async()=>{
 const f=fixture(),p=f.player;p.intoxication=16;p.beerCount=32;p.soberAt=f.now()+SOBER_INTERVAL_MS;
 await assert.rejects(f.game.command('a',{type:'emote',emote:'vomit'}),/cấp 5/);
 p.intoxication=17;p.carryingBeer=true;await assert.rejects(f.game.command('a',{type:'emote',emote:'vomit'}),/Cất cốc/);p.carryingBeer=false;
 const deadline=p.soberAt;await f.game.command('a',{type:'emote',emote:'vomit'});
 assert.equal(p.emote,'vomit');assert.equal(p.emoteUntil-f.now(),4200);assert.equal(p.intoxication,17);assert.equal(p.beerCount,32);assert.equal(p.soberAt,deadline);
 f.wait(1000);f.game.input('a',{x:1,z:0});f.game.tick();assert.equal(p.emote,'');
 f.wait(4000);p.intoxication=32;await f.game.command('a',{type:'emote',emote:'vomit'});assert.equal(p.emote,'vomit','can vomit while crawling');
 f.wait(4500);Object.assign(p,seatPosition({table:1,index:0}));await f.game.command('a',{type:'sit',table:1,seat:0});await f.game.command('a',{type:'emote',emote:'vomit'});assert.ok(p.seat,'can vomit seated');
});
test('recovering below level 5 cancels vomiting and blocks starting it again',async()=>{
 const f=fixture(),p=f.player;Object.assign(p,{beerCount:17,intoxication:17,soberAt:f.now()+1000});
 await f.game.command('a',{type:'emote',emote:'vomit'});f.wait(1000);f.game.tick();assert.equal(drunkLevel(p.intoxication),4);assert.equal(p.emote,'');
 await assert.rejects(f.game.command('a',{type:'emote',emote:'vomit'}),/cấp 5/);
});
test('vomiting bends the torso, keeps limb lengths and emits bounded droplets only while eligible',()=>{
 const rig=new AvatarRig(),position=(m:THREE.Matrix4)=>new THREE.Vector3().setFromMatrixPosition(m);
 for(const seated of [false,true])for(const intoxication of [17,29,32])for(const reduced of [false,true])for(let frame=0;frame<=84;frame++){
  const t=frame*.05;rig.sample({...base,seated,intoxication,reduced,gesture:'vomit',gestureTime:t});
  for(const part of AVATAR_PARTS)assert.ok(rig.matrices[part.key].elements.every(Number.isFinite));
  for(const [name,j] of Object.entries(rig.limbs)){
   const [upper,lower]=name.startsWith('arm')?[.32,.32]:[.5,.52];assert.ok(Math.abs(j.start.distanceTo(j.joint)-upper)<1e-6,`${name} upper ${t}`);assert.ok(Math.abs(j.joint.distanceTo(j.end)-lower)<1e-6,`${name} lower ${t}`);
  }
  for(const key of ['vomit0','vomit1','vomit2','vomit3'] as const)if(rig.matrices[key].determinant()>0){const droplet=position(rig.matrices[key]);assert.ok(droplet.y>=.04);assert.ok(droplet.y<=rig.mouthPosition.y);assert.ok(droplet.distanceTo(rig.mouthPosition)<2);}
 }
 rig.sample({...base,intoxication:17,gesture:'vomit',gestureTime:1.5});const bent=position(rig.matrices.head);assert.ok(rig.matrices.vomit0.determinant()>0);
 rig.sample({...base,intoxication:17});assert.ok(bent.y<position(rig.matrices.head).y-.2,'visible forward bend');
 for(const intoxication of [0,16]){rig.sample({...base,intoxication,gesture:'vomit',gestureTime:2});assert.equal(rig.matrices.vomit0.determinant(),0);}
 rig.sample({...base,intoxication:17,gesture:'vomit',gestureTime:5});assert.equal(rig.matrices.vomit0.determinant(),0);
});

test('smoking exhales from the mouth after lowering the cigarette, then clouds rise and disappear',()=>{
 const rig=new AvatarRig(),position=(m:THREE.Matrix4)=>new THREE.Vector3().setFromMatrixPosition(m);
 for(const seated of [false,true]){
  for(const t of [0,1,2.8,3.3]){rig.sample({...base,seated,gesture:'smoke',gestureTime:t});assert.equal(rig.matrices.smoke0.determinant(),0,'no exhale during inhaling');}
  rig.sample({...base,seated,gesture:'smoke',gestureTime:3.5});const start=position(rig.matrices.smoke0),mouth=rig.mouthPosition.clone();
  assert.ok(rig.matrices.smoke0.determinant()>0);assert.ok(start.distanceTo(mouth)<.15,'smoke starts at mouth');assert.ok(start.distanceTo(rig.smokeTip)>.2,'not attached to lowered cigarette');
  rig.sample({...base,seated,gesture:'smoke',gestureTime:4});const later=position(rig.matrices.smoke0);
  assert.ok(later.z>start.z+.2,'exhaled smoke moves forward');assert.ok(later.y>start.y+.05,'smoke rises');
  rig.sample({...base,seated,gesture:'smoke',gestureTime:4.8});for(const key of ['smoke0','smoke1','smoke2'] as const)assert.equal(rig.matrices[key].determinant(),0);
  rig.sample({...base,seated,gesture:'smoke',gestureTime:3.8,reduced:true});assert.equal(rig.matrices.smoke0.determinant(),0);
 }
});
