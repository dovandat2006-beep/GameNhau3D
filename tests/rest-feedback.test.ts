import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,writeFile,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import * as THREE from 'three';
import {Game} from '../server/game';
import {VoiceService} from '../server/voice';
import {FeedbackStore} from '../server/feedback';
import {renderFeedbackReport} from '../server/feedback-report';
import {feedbackSchema} from '../shared/feedback';
import {seatPosition,canLie} from '../shared/world';
import {STAGE,STAGE_RAMPS} from '../shared/social';
import {AvatarRig,AVATAR_PARTS} from '../client/avatar';
import {avatarDimensions} from '../shared/appearance';
const profile={name:'[TEST] Nằm và góp ý',color:'#547f75',avatar:0};
function fixture(){let now=1000;const patches:any[]=[],game=new Game(new VoiceService('','',''),{state:()=>{},chat:()=>{},effect:()=>{},kick:()=>{},players:(_r,p)=>patches.push(p)},()=>now),a=game.enter({mode:'create',profile},'a');return {game,a,patches,wait:(ms:number)=>{now+=ms;}};}
test('lying persists, publishes to observers and exits by stand or actual movement',async()=>{
 const f=fixture(),p=f.a.player;Object.assign(p,{x:0,z:40});assert.ok(canLie(p));await f.game.command('a',{type:'lie',enabled:true});assert.equal(p.lying,true);assert.equal(p.running,false);
 for(let i=0;i<10;i++){f.wait(100);f.game.tick();}assert.equal(p.lying,true);assert.equal(p.z,40);assert.ok(f.patches.some(list=>list.some((q:any)=>q.lying)));
 await assert.rejects(f.game.command('a',{type:'dance',style:'hiphop'}),/Dậy/);await assert.rejects(f.game.command('a',{type:'carry',enabled:true}),/Dậy/);await assert.rejects(f.game.command('a',{type:'emote',emote:'smoke'}),/Dậy/);
 await f.game.command('a',{type:'stand'});assert.equal(p.lying,false);f.wait(1100);await f.game.command('a',{type:'lie',enabled:true});
 f.game.input('a',{x:1,z:0,run:true});f.game.tick(.1);assert.equal(p.lying,false);assert.equal(p.x,.25);
});
test('lying requires free flat space, no carried glass and no occupied chair',async()=>{
 const f=fixture(),p=f.a.player;p.carryingBeer=true;await assert.rejects(f.game.command('a',{type:'lie',enabled:true}),/Cất cốc/);p.carryingBeer=false;
 Object.assign(p,seatPosition({table:1,index:0}));await f.game.command('a',{type:'sit',table:1,seat:0});f.wait(1100);await assert.rejects(f.game.command('a',{type:'lie',enabled:true}),/Đứng dậy/);
 await f.game.command('a',{type:'stand'});
 Object.assign(p,{x:27,z:40,angle:Math.PI/2});assert.equal(canLie(p),false);
 Object.assign(p,{x:STAGE.x,z:STAGE.z+STAGE.d/2-.2,angle:0});assert.equal(canLie(p),false);
 const ramp=STAGE_RAMPS[0];Object.assign(p,{x:ramp.x+ramp.w/2,z:ramp.z,angle:Math.PI/2});assert.equal(canLie(p),false);
 Object.assign(p,{x:0,z:40,angle:0,intoxication:32,soberAt:100000});f.wait(1100);await f.game.command('a',{type:'lie',enabled:true});assert.equal(p.lying,true);
 const token=p.token;f.game.disconnect('a');f.wait(1000);const resumed=f.game.enter({mode:'resume',code:f.a.room.code,token,profile},'resumed');assert.equal(resumed.player.lying,true);
 f.game.input('resumed',{x:1,z:0,run:true});f.game.tick(.1);assert.equal(p.lying,false);assert.equal(p.running,false);assert.equal(p.x,.06);
});
test('lying poses are horizontal, keep hidden bone lengths and clear the ground across all appearances',()=>{
 const rig=new AvatarRig(),base={phase:2,motion:1,seated:false,cheers:2.5,wave:1,time:1,avatar:0,reduced:false,carry:true,lying:true,intoxication:32,dance:'hiphop' as const};
 for(let avatar=0;avatar<8;avatar++)for(let face=0;face<6;face++)for(const height of [1,2])for(const weight of [40,150]){
  rig.sample({...base,avatar,face});const d=avatarDimensions({avatar,face,height,weight}),root=new THREE.Matrix4().makeScale(d.scale*d.width,d.scale,d.scale*d.depth);assert.equal(rig.cupVisible,false);
  for(const part of AVATAR_PARTS){const m=rig.matrices[part.key];assert.ok(m.elements.every(Number.isFinite));if(m.determinant()===0)continue;part.geometry.computeBoundingBox();const b=part.geometry.boundingBox!.clone().applyMatrix4(root.clone().multiply(m));assert.ok(b.min.y>=-.00001,`${part.key} clips floor for ${avatar}/${face}: ${b.min.y}`);assert.ok(b.max.y<height*.45,`${part.key} not low enough`);}
  for(const [name,j] of Object.entries(rig.limbs)){const [a,b]=name.startsWith('arm')?[.32,.32]:[.5,.52];assert.ok(Math.abs(j.start.distanceTo(j.joint)-a)<1e-6);assert.ok(Math.abs(j.joint.distanceTo(j.end)-b)<1e-6);}
 }
 rig.sample({...base,lying:false,intoxication:0,carry:false,cheers:null,wave:null,motion:0,dance:undefined});assert.ok(new THREE.Vector3().setFromMatrixPosition(rig.matrices.head).y>1.8,'upright after lying');
});
test('feedback saves serialized concurrent entries and survives a new store instance',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'qndh-feedback-'));try{
  const store=new FeedbackStore(dir),meta={playerName:profile.name,roomCode:'HEM234'};
  const saved=await Promise.all(Array.from({length:3},(_,i)=>store.save({category:'idea',text:`[TEST] Mong thêm điệu nhảy ${i}\ncho bạn bè cùng chơi.`},meta)));
  assert.equal(new Set(saved.map(s=>s.id)).size,3);const records=await new FeedbackStore(dir).read();assert.equal(records.length,3);assert.equal((await readFile(store.file,'utf8')).trim().split('\n').length,3);assert.ok(records[0].text.includes('\n'));
  assert.equal(await readFile(store.file,'utf8').then(s=>s.includes('token')),false);
 }finally{await rm(dir,{recursive:true,force:true});}
});
test('feedback validation, rate limiting and storage failure preserve retry semantics',async()=>{
 const f=fixture();let saved=0,fail=true;
 f.game.hooks.feedback=async()=>{if(fail)throw new Error('Storage offline');saved++;return {id:'saved',createdAt:new Date().toISOString()};};
 await assert.rejects(f.game.command('a',{type:'feedback',category:'idea',text:'quá ngắn'}),/không hợp lệ/);
 assert.equal(feedbackSchema.safeParse({category:'fake',text:'Mong có thêm nhiều món mới'}).success,false);assert.equal(feedbackSchema.safeParse({category:'bug',text:'x'.repeat(1001)}).success,false);
 await assert.rejects(f.game.command('a',{type:'feedback',category:'idea',text:'Mong có thêm điệu nhảy mới'}),/Storage offline/);
 fail=false;await f.game.command('a',{type:'feedback',category:'idea',text:'Mong có thêm điệu nhảy mới'});assert.equal(saved,1);
 await assert.rejects(f.game.command('a',{type:'feedback',category:'idea',text:'Mong có thêm trò chơi bàn'}),/60 giây/);f.wait(60000);await f.game.command('a',{type:'feedback',category:'bug',text:'Báo lỗi bàn ghế khi đứng dậy'});assert.equal(saved,2);
});
test('feedback reports aggregate real 7/30-day trends and escape untrusted content',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'qndh-report-'));try{
  const now=Date.UTC(2026,10,3,10),store=new FeedbackStore(dir,()=>now),meta={playerName:'<khách>',roomCode:'HEM234'};
  await store.save({category:'idea',text:'Mong thêm <img src=x onerror=alert(1)> nhé'},meta);const entries=await store.read();
  entries.push({...entries[0],id:'c199c173-d2c0-49b2-978c-88ed233bb423',createdAt:new Date(now-45*86400000).toISOString()});
  const html=renderFeedbackReport(entries,now);assert.ok(html.includes('&lt;img'));assert.equal(html.includes('<img'),false);assert.ok(html.includes('&lt;khách&gt;'));assert.match(html,/<td>Ý tưởng tính năng<\/td><td>1<\/td><td>1<\/td><td>2<\/td>/);
  await writeFile(store.file,'not json\n');await assert.rejects(store.read(),/dòng 1/);
 }finally{await rm(dir,{recursive:true,force:true});}
});
