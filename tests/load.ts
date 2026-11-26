/** Synthetic clients: real Socket.IO transport + authoritative movement/interaction.
 * Does not render 3D, send microphone audio or represent 100 human devices. */
import {spawn} from 'node:child_process';
import {writeFile,mkdir} from 'node:fs/promises';
import {performance} from 'node:perf_hooks';
import assert from 'node:assert/strict';
import {io,type Socket} from 'socket.io-client';
import {floorHeight} from '../shared/social';
import {TABLES,walkable,seatPosition,type Player,type RoomState,type Result,type Snapshot} from '../shared/world';
const port=Number(process.env.LOAD_PORT)||3002,origin=`http://localhost:${port}`,url=`http://127.0.0.1:${port}`;
const duration=Number(process.env.LOAD_SECONDS)||45;
const sleep=(ms:number)=>new Promise(r=>setTimeout(r,ms));
let stderr='',metrics:any[]=[];
const server=spawn(process.execPath,['--import','tsx','server/index.ts'],{cwd:process.cwd(),env:{...process.env,PORT:String(port),HOST:'127.0.0.1',ALLOWED_ORIGINS:origin,LOG_METRICS:'true',LIVEKIT_WEBHOOK_ENABLED:'false'},stdio:['ignore','pipe','pipe']});
server.stdout.on('data',(b)=>{for(const line of b.toString().split('\n')){try{const m=JSON.parse(line);if(m.kind==='metrics')metrics.push(m);}catch{if(line)console.log(line);}}});server.stderr.on('data',b=>stderr+=b.toString());
const sockets:Socket[]=[];
async function connect(){const s=io(url,{transports:['websocket'],extraHeaders:{Origin:origin},reconnection:false,timeout:4000});sockets.push(s);await new Promise<void>((resolve,reject)=>{s.once('connect',resolve);s.once('connect_error',reject);});return s;}
function req<T>(s:Socket,event:string,data?:unknown):Promise<T>{return new Promise((resolve,reject)=>{const cb=(err:Error|null,r:Result<T>)=>err?reject(err):r.ok?resolve(r.data):reject(Error(r.error));if(data===undefined)s.timeout(6000).emit(event,cb);else s.timeout(6000).emit(event,data,cb);});}
type Join={id:string;token:string;state:RoomState};
type Bot={socket:Socket;id:string;start:{x:number;z:number};position:{x:number;z:number};path:{x:number;z:number}[];seat:{table:number;index:number};seated:boolean;working:boolean;distance:number;chat:number;input:number;failed:number;lastDistance:number;stuckTicks:number};
const profile=(i:number)=>({name:`[BOT TẢI] ${String(i).padStart(3,'0')}`,color:'#547f75',avatar:i%3});
function pathTo(from:{x:number;z:number},to:{x:number;z:number},players:readonly Player[]=[]){
 const start={x:Math.round(from.x),z:Math.round(from.z)},goal={x:Math.round(to.x),z:Math.round(to.z)};
 const key=(p:{x:number;z:number})=>`${p.x},${p.z}`,queue=[start],prev=new Map<string,string|null>([[key(start),null]]);let found='';
 for(let n=0;n<queue.length;n++){const p=queue[n];if(Math.hypot(p.x-goal.x,p.z-goal.z)<=.8){found=key(p);break;}for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){const q={x:p.x+dx,z:p.z+dz},k=key(q);if(!prev.has(k)&&walkable(q.x,q.z,players)&&Math.abs(floorHeight(q.x,q.z)-floorHeight(p.x,p.z))<.2){prev.set(k,key(p));queue.push(q);}}}
 if(!found)throw Error('No synthetic route to '+JSON.stringify(goal));
 const result:{x:number;z:number}[]=[];while(found){const [x,z]=found.split(',').map(Number);result.unshift({x,z});found=prev.get(found)||'';}result.shift();return result;
}
const latencies:number[]=[],bots:Bot[]=[];let snapshotBytes=0,snapshots=0,lastState:RoomState|null=null,interval:ReturnType<typeof setInterval>|undefined,peakSeats=0,rounds=0;
try{
 let ready=false;for(let i=0;i<50;i++){try{const r=await fetch(url+'/api/health');if(r.ok){ready=true;break;}}catch{}if(server.exitCode!==null)throw Error(stderr);await sleep(100);}assert.ok(ready,'load server ready');
 const host=await connect();const joined=await req<Join>(host,'enter',{mode:'create',name:'Kiểm thử mô phỏng 100 phiên',private:false,profile:profile(0)});const code=joined.state.code;lastState=joined.state;
 const joinedClients=[{socket:host,joined},...await Promise.all(Array.from({length:99},async(_,j)=>{const i=j+1,socket=await connect();return {socket,joined:await req<Join>(socket,'enter',{mode:'join',code,profile:profile(i)})};}))];
 lastState=joinedClients.map(c=>c.joined.state).sort((a,b)=>b.revision-a.revision)[0];
 for(let i=0;i<100;i++){
  const {socket,joined:j}=joinedClients[i],p=j.state.players.find(p=>p.id===j.id)!;
  const seat={table:Math.floor(i/6)+1,index:i%6},t=TABLES[seat.table-1],a=seat.index*Math.PI/3;
  const dest={x:t.x+Math.sin(a)*3.35,z:t.z+Math.cos(a)*3.35};
  const bot:Bot={socket,id:j.id,start:{x:p.x,z:p.z},position:{x:p.x,z:p.z},seat,path:pathTo(p,dest),seated:false,working:false,distance:0,chat:0,input:0,failed:0,lastDistance:0,stuckTicks:0};bots.push(bot);
  socket.on('snapshot',(snap:Snapshot)=>{snapshots++;snapshotBytes+=Buffer.byteLength(JSON.stringify(snap));const me=snap.players.find(p=>p[0]===bot.id);if(me){bot.distance+=Math.hypot(me[1]-bot.position.x,me[2]-bot.position.z);bot.position={x:me[1],z:me[2]};}});
  socket.on('state',(s:RoomState)=>{if(!lastState||s.revision>=lastState.revision)lastState=s;bot.seated=!!s.players.find(p=>p.id===bot.id)?.seat;peakSeats=Math.max(peakSeats,s.players.filter(p=>p.seat).length);});
 }
 const rejected=await connect();await assert.rejects(req(rejected,'enter',{mode:'join',code,profile:profile(101)}),/100 người/);rejected.disconnect();
 assert.equal(lastState!.players.length,100);
 const command=async(bot:Bot,data:unknown)=>{const t=performance.now();try{const result=await req(bot.socket,'command',data);latencies.push(performance.now()-t);return result;}catch(e){bot.failed++;throw e;}};
 for(const bot of bots){await command(bot,{type:'chat',channel:'room',text:'[TẢI MÔ PHỎNG] Xin chào cả quán.'});bot.chat++;}
 const start=performance.now();let lastChat=0;
 interval=setInterval(()=>{
  const elapsed=(performance.now()-start)/1000;
  for(const bot of bots){
   if(bot.seated)continue;
   while(bot.path.length&&Math.hypot(bot.position.x-bot.path[0].x,bot.position.z-bot.path[0].z)<.6)bot.path.shift();
   const pos=seatPosition(bot.seat);
   if(!bot.working){
    if(bot.distance-bot.lastDistance<.02)bot.stuckTicks++;else bot.stuckTicks=0;bot.lastDistance=bot.distance;
    if(bot.stuckTicks>12){const t=TABLES[bot.seat.table-1],a=bot.seat.index*Math.PI/3;try{bot.path=pathTo(bot.position,{x:t.x+Math.sin(a)*3.35,z:t.z+Math.cos(a)*3.35},lastState?.players||[]);}catch{}bot.stuckTicks=0;}
   }
   const point=bot.path[0];
   if(!bot.working&&Math.hypot(bot.position.x-pos.x,bot.position.z-pos.z)<2.7){
    bot.working=true;bot.socket.emit('input',{x:0,z:0});
    void (async()=>{try{await command(bot,{type:'sit',table:bot.seat.table,seat:bot.seat.index});bot.seated=true;await command(bot,{type:'order',item:'tea'});await command(bot,{type:'emote',emote:'cheers'});await command(bot,{type:'chat',channel:'table',text:'[TẢI MÔ PHỎNG] Mình đã ngồi vào bàn.'});bot.chat++;}catch{}finally{bot.working=false;}})();
   }else if(point){const dx=point.x-bot.position.x,dz=point.z-bot.position.z,l=Math.max(1,Math.hypot(dx,dz));bot.socket.emit('input',{x:dx/l,z:dz/l});bot.input++;}
   else if(!bot.working){const dx=pos.x-bot.position.x,dz=pos.z-bot.position.z,l=Math.max(1,Math.hypot(dx,dz));bot.socket.emit('input',{x:dx/l,z:dz/l});bot.input++;}
  }
  if(elapsed-lastChat>8){lastChat=elapsed;for(const bot of bots)void command(bot,{type:'chat',channel:bot.seated?'table':'room',text:'[TẢI MÔ PHỎNG] Kiểm tra đồng bộ đang hoạt động.'}).then(()=>bot.chat++).catch(()=>{});}
 },100);
 for(let second=0;second<duration;second++){await sleep(1000);if(second%10===9)console.log(`Synthetic ${second+1}s: ${bots.filter(b=>b.seated).length}/100 seated, ${Math.round(bots.reduce((n,b)=>n+b.distance,0))}m server-confirmed movement`);}
 clearInterval(interval);interval=undefined;
 for(const bot of bots)bot.socket.emit('input',{x:0,z:0});await sleep(200);
 for(const t of lastState!.tables){const players=lastState!.players.filter(p=>t.seats.includes(p.id)&&p.connected).sort((a,b)=>a.seatedAt-b.seatedAt||a.id.localeCompare(b.id));if(players.length){const bot=bots.find(b=>b.id===players[0].id)!;try{await command(bot,{type:'round',action:'start'});rounds++;}catch{}}}
 latencies.sort((a,b)=>a-b);const result={kind:'synthetic-socket-load',date:new Date().toISOString(),seconds:duration,clients:100,rejected101:true,clientsThatMoved:bots.filter(b=>b.distance>.5).length,clientsThatChatted:bots.filter(b=>b.chat>0).length,serverConfirmedMetres:Math.round(bots.reduce((n,b)=>n+b.distance,0)),seated:peakSeats,unseated:bots.filter(b=>!b.seated).map(b=>({seat:b.seat,position:b.position,next:b.path[0],failures:b.failed})),roundsStarted:rounds,commands:latencies.length,commandP50ms:Math.round(latencies[Math.floor(latencies.length*.5)]||0),commandP95ms:Math.round(latencies[Math.floor(latencies.length*.95)]||0),commandP99ms:Math.round(latencies[Math.floor(latencies.length*.99)]||0),snapshots,snapshotMB:Number((snapshotBytes/1048576).toFixed(2)),peakRssMB:Math.max(...metrics.map(m=>m.rssMB)),peakEventLoopP99ms:Math.max(...metrics.map(m=>m.eventLoopP99ms)),metrics,limitations:['Simulated clients on one machine, not 100 human devices','No GPU rendering or SFU/audio load','Short functional load run, not endurance or Internet latency test']};
 await mkdir('docs/results',{recursive:true});await writeFile('docs/results/load.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({...result,metrics:undefined},null,2));
 assert.equal(result.clientsThatMoved,100,'Every simulated client must move');assert.equal(result.clientsThatChatted,100);assert.ok(peakSeats>=80,'At least 80 synthetic players seated via real movement');assert.ok(rounds>=14);assert.ok(result.commandP95ms<500);assert.equal(server.exitCode,null,'server remained alive');
}finally{if(interval)clearInterval(interval);for(const s of sockets)s.disconnect();server.kill('SIGTERM');if(stderr)console.error(stderr.slice(-2000));}
