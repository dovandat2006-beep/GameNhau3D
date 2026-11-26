import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {Game} from '../server/game';
import {VoiceService} from '../server/voice';
import {appearanceSchema,profileSchema,inputSchema} from '../shared/protocol';
import {CHARACTERS,FACES,DEFAULT_APPEARANCE,avatarDimensions,normalizedAppearance} from '../shared/appearance';
import {advance,RECEPTION,seatPosition,CAPACITY} from '../shared/world';
import {AvatarRig,AVATAR_PARTS} from '../client/avatar';
const profile={name:'[TEST] Tạo hình',color:'#547f75',avatar:0};
function fixture(){let now=1000;const chats:any[]=[],patches:any[]=[];const game=new Game(new VoiceService('','',''),{state:()=>{},chat:(_r,m)=>chats.push(m),effect:()=>{},kick:()=>{},players:(_r,p)=>patches.push(p)},()=>now);const a=game.enter({mode:'create',profile},'a');return {game,a,chats,patches,wait:(ms:number)=>{now+=ms;}};}
const base={phase:0,motion:0,seated:false,cheers:null,wave:null,time:0,avatar:0,reduced:false};
test('appearance bounds are authoritative and legacy profiles migrate to defaults',()=>{
 assert.equal(CHARACTERS.length,8);assert.equal(CHARACTERS.filter(c=>c.gender==='Nữ').length,4);assert.equal(FACES.length,6);
 const old=profileSchema.parse(profile);assert.equal(old.height,1.7);assert.equal(old.weight,65);assert.equal(old.face,0);
 for(const height of [1,2])for(const weight of [40,150])assert.ok(appearanceSchema.safeParse({...DEFAULT_APPEARANCE,height,weight,avatar:7,face:5}).success);
 for(const patch of [{height:.99},{height:2.01},{height:Infinity},{weight:39},{weight:151},{weight:65.5},{avatar:8},{face:6},{height:'1.7'}])assert.equal(appearanceSchema.safeParse({...DEFAULT_APPEARANCE,...patch}).success,false);
 assert.deepEqual(normalizedAppearance({avatar:200,face:-1,height:3,weight:2}),{...DEFAULT_APPEARANCE,height:2,weight:40});
 assert.equal(inputSchema.safeParse({x:1,z:0,run:'yes'}).success,false);assert.equal(inputSchema.parse({x:1,z:0}).run,false);
});
test('appearance updates only the caller, broadcasts public fields, and survives reconnect',async()=>{
 const f=fixture(),b=f.game.enter({mode:'join',code:f.a.room.code,profile},'b'),p=f.a.player;
 const appearance={...DEFAULT_APPEARANCE,avatar:7,face:5,height:1,weight:150};
 await f.game.command('a',{type:'appearance',appearance});assert.equal(b.player.avatar,0);assert.equal(p.avatar,7);assert.equal(p.height,1);
 const visible=f.game.state(f.a.room).players.find(q=>q.id===p.id)!;assert.equal(visible.face,5);assert.equal(visible.weight,150);assert.ok(f.patches.length);assert.equal(visible.seat,null);
 await assert.rejects(f.game.command('b',{type:'appearance',appearance:{...appearance,height:3}}),/không hợp lệ/);
 await assert.rejects(f.game.command('b',{type:'appearance',appearance,target:p.id}),/không hợp lệ/);
 const token=p.token;f.game.disconnect('a');f.wait(1000);const resumed=f.game.enter({mode:'resume',code:f.a.room.code,token,profile},'new');assert.equal(resumed.player.avatar,7);assert.equal(resumed.player.height,1);
});
test('run speed is 2.5, input timeout stops it, and crawling cannot be bypassed by running',()=>{
 const f=fixture(),p=f.a.player;Object.assign(p,{x:0,z:40});f.game.input('a',{x:1,z:0,run:true});f.game.tick(.1);assert.equal(p.x,.25);assert.equal(p.running,true);
 f.wait(300);f.game.tick(.1);assert.equal(p.x,.25);assert.equal(p.running,false);
 Object.assign(p,{intoxication:32,soberAt:100000});f.game.input('a',{x:1,z:0,run:true});f.game.tick(.1);assert.equal(p.running,false);assert.ok(Math.abs(p.x-.31)<1e-10);
 const diagonal=advance({x:0,z:40,running:true},1,1,1);assert.ok(Math.abs(Math.hypot(diagonal.x,diagonal.z-40)-.25)<1e-10);
 assert.equal(advance({x:27,z:40,running:true},1,0,.1).x,27);
 let walkDrift=0,runDrift=0;for(let now=0;now<4000;now+=50){const w=advance({x:0,z:40,intoxication:17},1,0,.1,[],now),r=advance({x:0,z:40,intoxication:17,running:true},1,0,.1,[],now);walkDrift+=Math.abs(Math.atan2(w.z-40,w.x));runDrift+=Math.abs(Math.atan2(r.z-40,r.x));assert.ok(Math.hypot(r.x,r.z-40)<=.250001);}
 assert.ok(runDrift>walkDrift*1.5,'drunk running has stronger direction sway');
});
test('all character/face combinations scale to requested standing height and retain cup-mouth contact',()=>{
 const rig=new AvatarRig(),root=new THREE.Matrix4(),matrix=new THREE.Matrix4();
 for(let avatar=0;avatar<CHARACTERS.length;avatar++)for(let face=0;face<FACES.length;face++)for(const height of [1,2])for(const weight of [40,150]){
  const d=avatarDimensions({avatar,face,height,weight});root.makeScale(d.scale*d.width,d.scale,d.scale*d.depth);
  rig.sample({...base,avatar,face});let highest=0;
  for(const part of AVATAR_PARTS){const local=rig.matrices[part.key];if(local.determinant()===0)continue;part.geometry.computeBoundingBox();matrix.multiplyMatrices(root,local);const bounds=part.geometry.boundingBox!.clone().applyMatrix4(matrix);highest=Math.max(highest,bounds.max.y);}
  assert.ok(Math.abs(highest-height)<.015,`height ${height}, avatar ${avatar}, face ${face}: ${highest}`);
  rig.sample({...base,avatar,face,seated:true,cheers:2.5});root.setPosition(0,d.seatOffset,0);matrix.multiplyMatrices(root,rig.matrices.mugRim);
  const rim=new THREE.Vector3(0,0,-.133).applyMatrix4(matrix),mouth=rig.mouthPosition.clone().applyMatrix4(root);assert.ok(rim.distanceTo(mouth)<1e-8);
  assert.ok(Math.abs(.75*d.scale+d.seatOffset-(.75+d.seatLift))<1e-10,'seat and pelvis lift together');
 }
 const slim=avatarDimensions({weight:40}),wide=avatarDimensions({weight:150});assert.ok(wide.width>slim.width*1.5);
});
test('new characters retain fixed hidden bone lengths through running and seated drinking',()=>{
 const rig=new AvatarRig();for(let avatar=0;avatar<8;avatar++)for(let face=0;face<6;face++)for(let i=0;i<24;i++){
  const t=i/8;rig.sample({...base,avatar,face,running:true,motion:1,phase:t*5,intoxication:17,time:t});
  for(const part of AVATAR_PARTS)assert.ok(rig.matrices[part.key].elements.every(Number.isFinite));
  for(const [name,j] of Object.entries(rig.limbs)){const [a,b]=name.startsWith('arm')?[.32,.32]:[.5,.52];assert.ok(Math.abs(j.start.distanceTo(j.joint)-a)<1e-6);assert.ok(Math.abs(j.joint.distanceTo(j.end)-b)<1e-6);}
 }
});
test('reception NPC requires proximity, answers from live seats, and does not occupy a player slot/chat',async()=>{
 const f=fixture(),p=f.a.player;await assert.rejects(f.game.command('a',{type:'reception',text:'Chào chị'}),/Đến gần/);
 Object.assign(p,{x:RECEPTION.x+4,z:RECEPTION.z});const hello=await f.game.command('a',{type:'reception',text:'Chào chị'}) as {reply:string};assert.match(hello.reply,/Hạnh.*NPC/);
 f.wait(2200);const seats=await f.game.command('a',{type:'reception',text:'Bàn nào còn chỗ?'}) as {reply:string};assert.match(seats.reply,/102 ghế/);
 for(const [text,expected] of [['WC ở đâu?',/góc cuối sân bên trái/],['Sân khấu ở đâu?',/Hai bên có dốc/],['Mình chạy thế nào?',/2,5/],['Có món gì?',/đậu phộng/],['Bạn là ai?',/NPC/]] as const){f.wait(2200);assert.match(((await f.game.command('a',{type:'reception',text})) as {reply:string}).reply,expected);}
 assert.equal(f.a.room.players.size,1);assert.equal(f.game.list()[0].count,1);assert.equal(f.chats.length,0);assert.equal(CAPACITY,100);
 f.wait(2200);await assert.rejects(f.game.command('a',{type:'reception',text:'a'.repeat(161)}),/không hợp lệ/);
});
