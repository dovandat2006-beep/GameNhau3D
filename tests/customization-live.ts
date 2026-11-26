/** Two explicitly labeled synthetic clients; real transport, no browser rendering. */
import {io,type Socket} from 'socket.io-client';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import type {Player,RoomState,Result,Snapshot} from '../shared/world';
const clients:Socket[]=[],sleep=(ms:number)=>new Promise(r=>setTimeout(r,ms));
const req=<T=any>(s:Socket,event:string,data?:unknown):Promise<T>=>new Promise((resolve,reject)=>{const cb=(e:Error|null,r:Result<T>)=>e?reject(e):r.ok?resolve(r.data):reject(Error(r.error));if(data===undefined)s.timeout(5000).emit(event,cb);else s.timeout(5000).emit(event,data,cb);});
async function connect(){const s=io('http://localhost:5173',{extraHeaders:{Origin:'http://localhost:5173'},forceNew:true,reconnection:false});clients.push(s);await new Promise<void>((resolve,reject)=>{s.once('connect',resolve);s.once('connect_error',reject);});return s;}
try{
 const a=await connect(),b=await connect(),profile={name:'[TEST] Tạo hình A',color:'#547f75',avatar:4,face:1,height:1,weight:40};
 const aj=await req(a,'enter',{mode:'create',private:true,profile}),bj=await req(b,'enter',{mode:'join',code:aj.state.code,profile:{...profile,name:'[TEST] Quan sát B',avatar:3,face:2,height:2,weight:150}});
 let state:RoomState=bj.state,chatCount=0;const positions=new Map<string,{x:number;z:number}>();for(const p of state.players)positions.set(p.id,p);
 b.on('state',(s:RoomState)=>{state=s;});b.on('players',(patch:{players:Player[]})=>{state={...state,players:state.players.map(p=>patch.players.find(q=>q.id===p.id)||p)};});b.on('chat',()=>chatCount++);
 a.on('snapshot',(s:Snapshot)=>{for(const [id,x,z] of s.players)positions.set(id,{x,z});});
 const appearance={color:'#b386a1',avatar:7,face:5,height:1.53,weight:95};await req(a,'command',{type:'appearance',appearance});await sleep(100);const seen=state.players.find(p=>p.id===aj.id)!;for(const [key,value] of Object.entries(appearance))assert.equal((seen as any)[key],value);
 await assert.rejects(req(a,'command',{type:'appearance',appearance:{...appearance,height:2.1}}),/không hợp lệ/);
 await assert.rejects(req(a,'command',{type:'reception',text:'Chào chị'}),/Đến gần/);
 let ran=false;b.on('players',(patch:{players:Player[]})=>{if(patch.players.some(p=>p.id===aj.id&&p.running))ran=true;});
 const start={...positions.get(aj.id)!};
 for(const point of [{x:-7,z:40},{x:-7,z:35.5}]){
  const deadline=Date.now()+12000;
  while(true){const p=positions.get(aj.id)!;const x=point.x-p.x,z=point.z-p.z,d=Math.hypot(x,z);if(d<.18)break;if(Date.now()>deadline)throw Error('Run path timeout '+JSON.stringify(p));a.emit('input',{x:x/Math.max(.7,d),z:z/Math.max(.7,d),run:true});await sleep(80);}
 }
 a.emit('input',{x:0,z:0,run:false});await sleep(200);assert.ok(ran);assert.ok(Math.hypot(start.x-positions.get(aj.id)!.x,start.z-positions.get(aj.id)!.z)>4);
 assert.match((await req(a,'command',{type:'reception',text:'Chào chị'})).reply,/Hạnh.*NPC/);await sleep(2200);
 assert.match((await req(a,'command',{type:'reception',text:'Bàn nào còn chỗ?'})).reply,/102 ghế/);assert.equal(state.players.length,2);assert.equal(chatCount,0);
 for(const s of clients)await req(s,'leave');
 const result={kind:'synthetic-customization-run-reception',date:new Date().toISOString(),clients:2,passed:['female/male profiles with height and weight extremes','appearance patch received by observer','invalid height rejected','run input and running state','real running from road to reception','NPC proximity validation','private scripted greeting and live seat response','NPC absent from player count and room chat','clean leave'],limits:['No browser preview, GPU, touch or visual inspection','Drunk running and body geometry checked in controlled unit tests']};await mkdir('docs/results',{recursive:true});await writeFile('docs/results/customization-live.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
}finally{for(const s of clients)s.disconnect();}
