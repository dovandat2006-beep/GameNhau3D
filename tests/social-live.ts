/** Functional multiplayer check against the running local Vite/game server.
 * Creates three explicitly labeled synthetic players in a private room. */
import {io,type Socket} from 'socket.io-client';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {floorHeight,drunkLevel,STAGE,STAGE_RAMPS} from '../shared/social';
import {TABLES,STREET,ENTRANCE,type Player,type RoomState,type Result,type Snapshot} from '../shared/world';
const clients:Socket[]=[],sleep=(ms:number)=>new Promise(r=>setTimeout(r,ms)),url='http://localhost:5173';
async function connect(){const s=io(url,{extraHeaders:{'Sec-Fetch-Site':'same-origin'},reconnection:false,forceNew:true});clients.push(s);await new Promise<void>((resolve,reject)=>{s.once('connect',resolve);s.once('connect_error',reject);});return s;}
function req<T=any>(s:Socket,event:string,data?:unknown):Promise<T>{return new Promise((resolve,reject)=>{const ack=(err:Error|null,r:Result<T>)=>err?reject(err):r.ok?resolve(r.data):reject(Error(r.error));if(data===undefined)s.timeout(5000).emit(event,ack);else s.timeout(5000).emit(event,data,ack);});}
try{
 const a=await connect(),b=await connect(),v=await connect();const profile={name:'[TEST] Giao lưu A',color:'#547f75',avatar:0};
 const aj=await req(a,'enter',{mode:'create',private:true,profile}),bj=await req(b,'enter',{mode:'join',code:aj.state.code,profile:{...profile,name:'[TEST] Nhảy B'}}),vj=await req(v,'enter',{mode:'join',code:aj.state.code,profile:{...profile,name:'[TEST] Khán giả'}});
 let state:RoomState=vj.state;const positions=new Map<string,{x:number;z:number}>();for(const p of state.players)positions.set(p.id,p);
 for(const s of clients){s.on('snapshot',(snap:Snapshot)=>{for(const [id,x,z] of snap.players)positions.set(id,{x,z});});s.on('state',(r:RoomState)=>{state=r;});s.on('players',(patch:{players:Player[]})=>{state={...state,players:state.players.map(p=>patch.players.find(q=>q.id===p.id)||p)};});s.on('stage',(patch:any)=>{state={...state,stage:patch.stage};});}
 async function walk(s:Socket,id:string,points:{x:number;z:number}[]){for(const p of points){const end=Date.now()+18000;while(true){const me=positions.get(id)!;if(Math.hypot(me.x-p.x,me.z-p.z)<.20)break;if(Date.now()>end)throw Error('Walk timed out: '+JSON.stringify({me,p}));const x=p.x-me.x,z=p.z-me.z,len=Math.max(.6,Math.hypot(x,z));s.emit('input',{x:x/len,z:z/len});await sleep(90);}s.emit('input',{x:0,z:0});await sleep(130);}}
 for(const p of state.players)assert.ok(p.z>=STREET.minZ,'new players start outside on the road');
 const table=TABLES[14];
 const entry=[{x:0,z:ENTRANCE.z+2},{x:0,z:ENTRANCE.z-3}];
 await Promise.all([walk(a,aj.id,[...entry,{x:table.x+1,z:table.z+3.2}]),walk(b,bj.id,[...entry,{x:table.x,z:table.z+3.2}]),walk(v,vj.id,[...entry,{x:table.x+2,z:table.z+3.2}])]);
 await req(b,'command',{type:'sit',table:15,seat:0});await req(a,'command',{type:'carry',enabled:true});
 let invite=false;b.on('effect',e=>{if(e.emote==='invite'&&e.table===15)invite=true;});await req(a,'command',{type:'invite',table:15});await sleep(2100);assert.ok(invite);
 for(let i=1;i<=5;i++){await req(a,'command',{type:'emote',emote:'cheers'});const deadline=Date.now()+6000;while((state.players.find(p=>p.id===aj.id)?.beerCount||0)<i&&Date.now()<deadline)await sleep(100);assert.equal(state.players.find(p=>p.id===aj.id)?.beerCount,i,JSON.stringify(state.players.find(p=>p.id===aj.id)));}
 const recoveryAt=state.players.find(p=>p.id===aj.id)!.soberAt;
 assert.equal(drunkLevel(state.players.find(p=>p.id===aj.id)!.intoxication),1);console.log('PASS: carried glass, invitation received at another table, 5 completed drinks = level 1.');
 await req(a,'command',{type:'carry',enabled:false});await req(b,'command',{type:'stand'});
 const rampRoute=(side:number)=>{
  const ramp=STAGE_RAMPS[side===-1?0:1],outside=side===-1?ramp.x-1:ramp.x+ramp.w+1;
  return [{x:side*3,z:31},{x:side*3,z:23},{x:side*3,z:14},{x:side*3,z:5},{x:side*6,z:-5},{x:outside,z:-5},{x:outside,z:STAGE.z},{x:ramp.x+ramp.w/2,z:STAGE.z},{x:STAGE.x+side*2,z:STAGE.z}];
 };
 await req(v,'command',{type:'sit',table:15,seat:0});
 await Promise.all([walk(a,aj.id,rampRoute(-1)),walk(b,bj.id,rampRoute(1))]);
 assert.equal(floorHeight(positions.get(aj.id)!.x,positions.get(aj.id)!.z),.45);
 await req(a,'command',{type:'dance',style:'hiphop'});await req(b,'command',{type:'dance',style:'krump'});await req(a,'command',{type:'battle',action:'challenge',target:bj.id});await req(b,'command',{type:'battle',action:'accept'});await req(v,'command',{type:'battle',action:'vote',target:aj.id});
 await assert.rejects(req(v,'command',{type:'battle',action:'vote',target:bj.id}),/một lần/);console.log('PASS: real movement onto ramp/stage; consent and one vote per spectator. Waiting for result…');
 await sleep(20500);assert.equal(state.stage.battle?.status,'finished');assert.equal(state.stage.battle?.winner,aj.id);
 while(state.players.find(p=>p.id===aj.id)!.intoxication>0&&Date.now()<recoveryAt+3000)await sleep(100);
 assert.equal(state.players.find(p=>p.id===aj.id)!.intoxication,0);assert.equal(state.players.find(p=>p.id===aj.id)!.beerCount,5);
 let smokeReceived=false;b.on('effect',e=>{if(e.id===aj.id&&e.emote==='smoke')smokeReceived=true;});
 await req(a,'command',{type:'emote',emote:'smoke'});await sleep(100);assert.ok(smokeReceived);assert.equal(state.players.find(p=>p.id===aj.id)!.emote,'smoke');
 const position=positions.get(aj.id)!;await walk(a,aj.id,[{x:position.x+.7,z:position.z}]);assert.equal(state.players.find(p=>p.id===aj.id)!.emote,'');
 await req(a,'command',{type:'sober'});await sleep(100);assert.equal(state.players.find(p=>p.id===aj.id)?.beerCount,0);
 for(const s of clients)await req(s,'leave');
 const result={kind:'synthetic-functional-social',date:new Date().toISOString(),clients:3,transport:'Socket.IO through Vite :5173',passed:['road spawn and walk through entrance','walking and pickup','table invitation delivery','5 completed drinks => level 1','both ramps and elevated rear stage','simultaneous hiphop and krump','consented dance-off','seated spectator vote','duplicate vote rejected','20-second authoritative result','automatic real-time recovery without clearing total','smoking effect received by another client','walking cancels smoking','reset intoxication','clean leave'],limits:['No browser/GPU/audio-device inspection','Not an SFU or 100-device load test']};await mkdir('docs/results',{recursive:true});await writeFile('docs/results/social-live.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
}finally{for(const s of clients)s.disconnect();}
