import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {Game} from '../server/game';
import {VoiceService} from '../server/voice';
import {seatPosition,CHEERS_MS,advance,TABLES,SPEED,walkable,spawnPosition,STREET,ENTRANCE,RECEPTION,WC,MOTORBIKES} from '../shared/world';
import {drunkLevel,floorHeight,STAGE,STAGE_RAMPS,stageWaypoint,STAGE_AUDIENCE_RADIUS,onStage,DANCE_STYLES} from '../shared/social';
import {AvatarRig,AVATAR_PARTS} from '../client/avatar';
const profile={name:'Bạn thử',color:'#547f75',avatar:0};
function setup(){let now=1000;const effects:string[]=[];const game=new Game(new VoiceService('','',''),{state:()=>{},chat:()=>{},effect:(_r,_p,e)=>effects.push(e),kick:()=>{}},()=>now);const a=game.enter({mode:'create',profile},'a');return {game,a,effects,wait:(ms:number)=>{now+=ms;},add:(socket:string)=>game.enter({mode:'join',code:a.room.code,profile:{...profile,name:socket}},socket)};}
function place(p:{x:number;z:number},x:number,z:number){p.x=x;p.z=z;}
test('intoxication starts at cup 5 and increases every three completed cups',()=>{
 assert.deepEqual([0,1,4,5,7,8,10,11,14,17,20].map(drunkLevel),[0,0,0,1,1,2,2,3,4,5,6]);
});
test('server counts only completed drinks, prevents duplicates and supports reset',async()=>{
 const f=setup(),p=f.a.player;Object.assign(p,seatPosition({table:1,index:0}));await f.game.command('a',{type:'sit',table:1,seat:0});
 for(let i=1;i<=11;i++){
  await f.game.command('a',{type:'emote',emote:'cheers'});assert.equal(p.beerCount,i-1);f.wait(CHEERS_MS-1);f.game.tick();assert.equal(p.beerCount,i-1);
  f.wait(1);f.game.tick();assert.equal(p.beerCount,i);f.game.tick();assert.equal(p.beerCount,i);
 }
 assert.equal(drunkLevel(p.beerCount),3);await f.game.command('a',{type:'sober'});assert.equal(p.beerCount,0);
});
test('walking or disconnecting cancels an unfinished carried drink',async()=>{
 const f=setup(),p=f.a.player;place(p,TABLES[14].x,TABLES[14].z+3);await f.game.command('a',{type:'carry',enabled:true});await f.game.command('a',{type:'emote',emote:'cheers'});
 f.wait(1000);f.game.input('a',{x:1,z:0});f.game.tick();f.wait(4000);f.game.tick();assert.equal(p.beerCount,0);assert.equal(p.drinkDue,0);
 await f.game.command('a',{type:'emote',emote:'cheers'});f.wait(1000);f.game.disconnect('a');f.wait(4000);f.game.tick();assert.equal(p.beerCount,0);
});
test('a command immediately after the deadline settles the previous drink first',async()=>{
 const f=setup(),p=f.a.player;place(p,TABLES[14].x,TABLES[14].z+3);await f.game.command('a',{type:'carry',enabled:true});await f.game.command('a',{type:'emote',emote:'cheers'});f.wait(CHEERS_MS);await f.game.command('a',{type:'emote',emote:'wave'});assert.equal(p.beerCount,1);assert.equal(p.drinkDue,0);
});
test('picking up a glass and inviting a table require real proximity and occupants',async()=>{
 const f=setup(),p=f.a.player,b=f.add('b');await assert.rejects(f.game.command('a',{type:'carry',enabled:true}),/Đến gần/);
 place(p,TABLES[14].x,TABLES[14].z+3);await f.game.command('a',{type:'carry',enabled:true});await assert.rejects(f.game.command('a',{type:'invite',table:15}),/chưa có/);
 Object.assign(b.player,seatPosition({table:15,index:0}));await f.game.command('b',{type:'sit',table:15,seat:0});await f.game.command('a',{type:'invite',table:15});assert.ok(f.effects.includes('invite:15'));assert.equal(p.beerCount,0);
 f.wait(2100);await assert.rejects(f.game.command('a',{type:'invite',table:1}),/Đến gần/);
});
test('carried glass survives standing but dancing/clapping require putting it away',async()=>{
 const f=setup(),p=f.a.player;Object.assign(p,seatPosition({table:1,index:0}));await f.game.command('a',{type:'sit',table:1,seat:0});await f.game.command('a',{type:'carry',enabled:true});await f.game.command('a',{type:'stand'});assert.equal(p.carryingBeer,true);
 await assert.rejects(f.game.command('a',{type:'dance',style:'shuffle'}),/Cất cốc/);await assert.rejects(f.game.command('a',{type:'emote',emote:'clap'}),/Cất cốc/);await f.game.command('a',{type:'carry',enabled:false});await f.game.command('a',{type:'dance',style:'shuffle'});assert.equal(p.dance,'shuffle');
 f.game.input('a',{x:1,z:0});f.game.tick();assert.equal(p.dance,null);
});
test('both stage ramps permit ascent and descent while platform edges remain solid',()=>{
 assert.equal(STAGE_RAMPS.length,2);
 for(const r of STAGE_RAMPS){
  const low=r.up===1?r.x:r.x+r.w,high=r.up===1?r.x+r.w:r.x;
  assert.equal(floorHeight(low,r.z),0);assert.equal(floorHeight(high,r.z),STAGE.height);
  assert.equal(floorHeight(r.x+r.w/2,r.z),STAGE.height/2);
  let p={x:low-r.up*.1,z:r.z};
  for(let i=0;i<25;i++)p=advance(p,r.up,0,.1);
  assert.ok(onStage(p),'ascending through each ramp');
  for(let i=0;i<25;i++)p=advance(p,-r.up,0,.1);
  assert.equal(floorHeight(p.x,p.z),0,'descending through each ramp');
  assert.equal(stageWaypoint({x:low,z:r.z+2}).x,r.up===1?r.x+.3:r.x+r.w-.3);
 }
 const edge=STAGE.z+STAGE.d/2+.05,blocked=advance({x:STAGE.x,z:edge},0,-1,.1);assert.equal(blocked.z,edge);
});
test('dance-off requires consent; spectators vote once, timers determine the winner',async()=>{
 const f=setup(),a=f.a.player,b=f.add('b'),v=f.add('v');place(a,STAGE.x-2,STAGE.z);place(b.player,STAGE.x+2,STAGE.z);Object.assign(v.player,seatPosition({table:1,index:0}));await f.game.command('v',{type:'sit',table:1,seat:0});
 await f.game.command('a',{type:'battle',action:'challenge',target:b.player.id});assert.equal(f.a.room.stage.battle?.status,'invited');
 await assert.rejects(f.game.command('v',{type:'battle',action:'accept'}),/không dành/);await f.game.command('b',{type:'battle',action:'accept'});assert.equal(a.dance,'shuffle');assert.equal(b.player.dance,'shuffle');
 await assert.rejects(f.game.command('a',{type:'battle',action:'vote',target:a.id}),/Khán giả/);await f.game.command('v',{type:'battle',action:'vote',target:a.id});await assert.rejects(f.game.command('v',{type:'battle',action:'vote',target:b.player.id}),/một lần/);
 f.wait(20001);f.game.tick();assert.equal(f.a.room.stage.battle?.status,'finished');assert.equal(f.a.room.stage.battle?.winner,a.id);
});
test('leaving the stage cancels a dance-off without inventing a winner',async()=>{
 const f=setup(),b=f.add('b');place(f.a.player,STAGE.x-2,STAGE.z);place(b.player,STAGE.x+2,STAGE.z);await f.game.command('a',{type:'battle',action:'challenge',target:b.player.id});await f.game.command('b',{type:'battle',action:'accept'});place(b.player,0,26);f.game.tick();assert.equal(f.a.room.stage.battle?.status,'cancelled');assert.equal(f.a.room.stage.battle?.winner,null);
});
test('new gestures and dances have finite joint poses; held beer follows a walking hand',()=>{
 const rig=new AvatarRig(),base={phase:1,motion:1,seated:false,cheers:null,wave:null,time:1,avatar:0,reduced:false};
 rig.sample({...base,carry:true});assert.ok(rig.cupVisible&&rig.cupInHand);assert.ok(Math.abs(rig.cupPosition.distanceTo(rig.rightHand)-Math.hypot(.15,.025))<1e-8);
 const poses=[];
 for(const dance of DANCE_STYLES){rig.sample({...base,dance,danceTime:.4});poses.push(rig.limbs.armR.end.clone());for(const p of AVATAR_PARTS)assert.ok(rig.matrices[p.key].elements.every(Number.isFinite));}
 assert.ok(poses[0].distanceTo(poses[1])>.1&&poses[1].distanceTo(poses[2])>.1,'dance moves are distinct');
 for(const gesture of ['clap','nod','shake'] as const){rig.sample({...base,gesture,gestureTime:.6});for(const p of AVATAR_PARTS)assert.ok(rig.matrices[p.key].elements.every(Number.isFinite));}
 for(const t of [2.15,2.4,2.8]){rig.sample({...base,carry:true,intoxication:11,cheers:t});assert.ok(rig.mouthPosition.distanceTo(rig.cupRimContact)<1e-8);}
});

test('street entry reaches 102 courtyard seats, WC, reception and both rear-stage ramps at speed 2',()=>{
 assert.equal(SPEED,2);assert.ok(STAGE.w*STAGE.d>120);assert.ok(TABLES.every(t=>t.z-2.7>STAGE.z+STAGE.d/2),'all chair rings are in front of stage');
 assert.equal(TABLES.length,17);
 const seats=TABLES.flatMap(t=>Array.from({length:6},(_,index)=>seatPosition({table:t.id,index})));
 for(const seat of seats){
  assert.equal(floorHeight(seat.x,seat.z),0,'seats must not overlap the platform or ramp');
  assert.ok(walkable(seat.x,seat.z),'seats must clear tables and equipment');
  assert.ok(Math.hypot(seat.x-STAGE.x,seat.z-STAGE.z)<=STAGE_AUDIENCE_RADIUS,'seated viewers can vote');
 }
 for(const t of TABLES)for(const other of TABLES)if(t.id!==other.id)assert.ok(Math.hypot(t.x-other.x,t.z-other.z)>=8,'clear space between chair rings');
 // Flood the actual floor graph from the entry, including platform edge-height rules.
 const queue=[spawnPosition(4)],seen=new Set([`${queue[0].x},${queue[0].z}`]);
 for(let i=0;i<queue.length;i++){
  const p=queue[i];for(const [dx,dz] of [[.5,0],[-.5,0],[0,.5],[0,-.5]]){
   const x=p.x+dx,z=p.z+dz,key=`${x},${z}`;
   if(!seen.has(key)&&walkable(x,z)&&Math.abs(floorHeight(x,z)-floorHeight(p.x,p.z))<.12){seen.add(key);queue.push({x,z});}
  }
 }
 assert.ok(seen.has(`${STAGE.x},${STAGE.z}`),'walk from entry through the ramp to the stage');
 for(const r of STAGE_RAMPS)assert.ok(queue.some(p=>Math.hypot(p.x-r.x-r.w/2,p.z-r.z)<.3),'both ramps are reachable');
 assert.ok(seen.has(`${WC.x},${WC.z}`),'WC interior is reachable through its door');
 assert.ok(queue.some(p=>Math.hypot(p.x-RECEPTION.x,p.z-RECEPTION.z)<3.5),'reception approach is reachable');
 for(const seat of seats)assert.ok(queue.some(p=>Math.hypot(p.x-seat.x,p.z-seat.z)<.75),'every seat has a reachable approach');
});

test('new players start on the road; fences, parked bikes and buildings are solid',()=>{
 const f=setup();for(let i=0;i<100;i++){
  const p=i?f.add(`arrival${i}`).player:f.a.player;
  assert.deepEqual({x:p.x,z:p.z},spawnPosition(i));assert.ok(p.z>=STREET.minZ&&p.z<=STREET.maxZ);assert.ok(walkable(p.x,p.z));
 }
 assert.ok(walkable(0,ENTRANCE.z));
 for(const x of [-20,20]){const p={x,z:ENTRANCE.z+.7};assert.equal(advance(p,0,-1,.1).z,p.z,'cannot enter through perimeter wall');}
 for(const o of [RECEPTION,...MOTORBIKES])assert.equal(walkable(o.x,o.z),false);
 assert.equal(walkable(WC.x,WC.z-WC.d/2),false);assert.ok(walkable(WC.x,WC.z+WC.d/2));
});
test('hiphop, krump and running man have distinct strong motion with valid hidden bones',async()=>{
 const rig=new AvatarRig(),f=setup();const peaks:Record<string,number>={};
 for(const dance of ['hiphop','krump','runningman'] as const){
  await f.game.command('a',{type:'dance',style:dance});assert.equal(f.a.player.dance,dance);f.wait(1000);
  peaks[dance]=0;
  for(let frame=0;frame<=120;frame++){
   rig.sample({phase:0,motion:0,seated:false,cheers:null,wave:null,time:frame/60,avatar:0,reduced:false,dance,danceTime:frame/60});
   peaks[dance]=Math.max(peaks[dance],rig.leftFoot.y-.1,rig.rightFoot.y-.1);
   assert.ok(Math.min(rig.leftFoot.y,rig.rightFoot.y)<=.10001,'at least one foot supports the dance');
   for(const part of AVATAR_PARTS)assert.ok(rig.matrices[part.key].elements.every(Number.isFinite));
   for(const [name,j] of Object.entries(rig.limbs)){
    const [upper,lower]=name.startsWith('arm')?[.32,.32]:[.50,.52];
    assert.ok(Math.abs(j.start.distanceTo(j.joint)-upper)<1e-6,`${dance} ${name} upper`);
    assert.ok(Math.abs(j.joint.distanceTo(j.end)-lower)<1e-6,`${dance} ${name} lower`);
   }
  }
 }
 assert.ok(peaks.hiphop>.19&&peaks.krump>.12&&peaks.runningman>.25,'energetic steps, beyond the existing gentle dances');
});
