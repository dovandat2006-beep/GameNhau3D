import 'dotenv/config';
import express from 'express';
import {createServer} from 'node:http';
import {resolve} from 'node:path';
import {Server} from 'socket.io';
import {performance,monitorEventLoopDelay} from 'node:perf_hooks';
import {FeedbackStore} from './feedback';
import {Game,GameError} from './game';
import {gestureDuration,type Gesture} from '../shared/social';
import {allowedSocketRequest} from './origin';
const app=express(),http=createServer(app);
if(process.env.TRUST_PROXY)app.set('trust proxy',process.env.TRUST_PROXY);
const origins=(process.env.ALLOWED_ORIGINS||'http://localhost:5173,http://127.0.0.1:5173,http://localhost:3001').split(',').map(x=>x.trim());
const io=new Server(http,{maxHttpBufferSize:4096,perMessageDeflate:false,pingInterval:10000,pingTimeout:10000,cors:{origin:origins},allowRequest:(req,cb)=>cb(null,allowedSocketRequest(req.headers,origins))});
app.disable('x-powered-by');
app.use((req,res,next)=>{res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','same-origin');res.setHeader('Permissions-Policy','microphone=(self), camera=()');next();});
const feedbackStore=new FeedbackStore();
const game=new Game(undefined,{
 feedback:async(r,p,input)=>{try{return await feedbackStore.save(input,{playerName:p.name,roomCode:r.code});}catch(e){console.error('Không lưu được góp ý:',e instanceof Error?e.message:'lỗi lưu trữ');throw new GameError('Chưa lưu được góp ý. Bạn giữ nội dung và gửi lại sau nhé.');}},
 state:r=>io.to(r.code).emit('state',game.state(r)),
 chat:(r,m)=>{if(m.channel==='room')io.to(r.code).emit('chat',m);else for(const p of r.players.values())if(p.connected&&p.seat?.table===m.table&&p.socketId)io.to(p.socketId).emit('chat',m);},
 effect:(r,p,emote)=>{const table=emote.startsWith('invite:')?Number(emote.split(':')[1]):null;for(const q of r.players.values()){
  const nearby=Math.hypot(q.x-p.x,q.z-p.z)<16;
  if(q.connected&&q.socketId&&(emote==='cheers'&&p.seat?q.seat?.table===p.seat.table:nearby||!!table&&q.seat?.table===table))io.to(q.socketId).emit('effect',{id:p.id,name:p.name,emote:p.emote,table,x:p.x,z:p.z,at:p.emoteUntil-gestureDuration(p.emote as Gesture)});
 }},
 players:(r,players)=>io.to(r.code).emit('players',{code:r.code,revision:r.revision,players}),
 stage:r=>io.to(r.code).emit('stage',{code:r.code,revision:r.revision,stage:r.stage}),
 kick:id=>{io.to(id).emit('kicked');io.sockets.sockets.get(id)?.disconnect(true);},
 voiceReset:(r,table,excluded)=>{for(const p of r.players.values())if(p.id!==excluded&&p.connected&&p.seat?.table===table&&p.socketId)io.to(p.socketId).emit('voice-reset');},
});
// A signed LiveKit webhook is the media authorization gate, not a client UI flag.
app.post('/api/livekit/webhook',express.text({type:['application/webhook+json','application/json'],limit:'32kb'}),async(req,res)=>{
 if(!game.voice.receiver||!game.voice.client){res.sendStatus(503);return;}
 try{
  const event=await game.voice.receiver.receive(req.body,req.headers.authorization);
  if(event.event==='participant_joined'&&event.participant&&event.room){
   const identity=event.participant.identity;const [id,epoch]=identity.split('.');
   const session=[...game.sessions.values()].find(s=>s.player.id===id);
   // Serialize with seating, kicks and token issuance, closing permission races.
   if(session){await game.enqueue(session.room,async()=>{
    const {room:r,player:p}=session;
    if(p.connected&&p.voiceActive&&p.voiceEpoch===Number(epoch)&&p.seat&&event.room!.name===game.voice.room(r.code,p.seat.table)){
     await game.voice.client!.updateParticipant(event.room!.name,identity,undefined,{canPublish:true,canSubscribe:true,canPublishData:false,canPublishSources:[2]});
    }else await game.voice.client!.removeParticipant(event.room!.name,identity);
   });}else await game.voice.client.removeParticipant(event.room.name,identity);
  }
  res.sendStatus(200);
 }catch{res.status(400).json({error:'Webhook không hợp lệ hoặc SFU tạm lỗi.'});}
});
app.get('/api/health',(_req,res)=>res.json({ok:true,rooms:game.rooms.size,voiceConfigured:game.voice.enabled}));
app.use(express.static(resolve('dist'),{index:'index.html'}));
app.get('/',(_req,res)=>res.sendFile(resolve('dist/index.html')));
const ipBuckets=new Map<string,{tokens:number;at:number;last:number}>();
function limitIP(ip:string,cost=1){const now=Date.now();const b=ipBuckets.get(ip)||{tokens:120,at:now,last:now};b.tokens=Math.min(120,b.tokens+(now-b.at)/15000);b.at=now;b.last=now;ipBuckets.set(ip,b);if(b.tokens<cost)throw new GameError('Quá nhiều yêu cầu vào quán. Thử lại sau một phút.');b.tokens-=cost;}
const failure=(err:unknown)=>({ok:false,error:err instanceof GameError?err.message:err instanceof Error&&err.message.startsWith('Voice')?err.message:'Máy chủ chưa xử lý được. Hãy thử lại.'});
io.on('connection',socket=>{
 const ip=socket.handshake.address;let listAt=0,entryWindow=0,entryAttempts=0;
 socket.on('rooms',(ack)=>{if(typeof ack!=='function')return;if(Date.now()-listAt<1000){ack({ok:false,error:'Chờ một chút trước khi tải lại.'});return;}listAt=Date.now();ack({ok:true,data:game.list()});});
 socket.on('enter',(data,ack)=>{if(typeof ack!=='function')return;try{if(Date.now()-entryWindow>10000){entryWindow=Date.now();entryAttempts=0;}if(++entryAttempts>3)throw new GameError('Quá nhiều lần thử. Chờ 10 giây rồi thử lại.');if(data?.mode!=='resume')limitIP(ip,data?.mode==='create'?20:1);const {room,player}=game.enter(data,socket.id);socket.join(room.code);ack({ok:true,data:{state:game.state(room),id:player.id,token:player.token,voiceConfigured:game.voice.enabled}});}catch(e){ack(failure(e));}});
 socket.on('input',data=>game.input(socket.id,data));
 let pingAt=0;socket.on('latency',ack=>{if(typeof ack==='function'&&Date.now()-pingAt>1000){pingAt=Date.now();ack();}});
 socket.on('command',async(data,ack)=>{if(typeof ack!=='function')return;try{const result=await game.command(socket.id,data);ack({ok:true,data:result});}catch(e){ack(failure(e));}});
 socket.on('leave',async ack=>{try{const s=game.findSocket(socket.id);await game.leave(socket.id);if(s)socket.leave(s.room.code);if(typeof ack==='function')ack({ok:true,data:{}});}catch(e){if(typeof ack==='function')ack(failure(e));}});
 socket.on('disconnect',()=>game.disconnect(socket.id));
});
let last=performance.now(),tick=0,bytes=0,packets=0;
const loop=monitorEventLoopDelay({resolution:20});loop.enable();
setInterval(()=>{
 const now=performance.now();game.tick(Math.min(.1,(now-last)/1000));last=now;if(++tick%2)return;
 for(const r of game.rooms.values()){
  const cells=new Map<string,typeof r.players extends Map<string,infer P>?P[]:never>();
  for(const p of r.players.values()){const key=`${Math.floor(p.x/8)},${Math.floor(p.z/8)}`;const a=cells.get(key)||[];a.push(p);cells.set(key,a);}
  for(const p of r.players.values()){
   if(!p.connected||!p.socketId)continue;
   const near=new Set<string>(),cx=Math.floor(p.x/8),cz=Math.floor(p.z/8);
   for(let x=cx-1;x<=cx+1;x++)for(let z=cz-1;z<=cz+1;z++)for(const q of cells.get(`${x},${z}`)||[])near.add(q.id);
   const moving=[...r.players.values()].filter(q=>near.has(q.id)||tick%20===0).map(q=>[q.id,Math.round(q.x*100)/100,Math.round(q.z*100)/100,Math.round(q.angle*100)/100,q.moving?1:0]);
   const payload={time:Date.now(),players:moving};const size=Buffer.byteLength(JSON.stringify(payload));bytes+=size;packets++;io.to(p.socketId).volatile.emit('snapshot',payload);
  }
 }
},50);
setInterval(()=>{const now=Date.now();for(const [key,b] of ipBuckets)if(now-b.last>300000)ipBuckets.delete(key);},60000).unref();
if(process.env.LOG_METRICS==='true')setInterval(()=>{console.log(JSON.stringify({kind:'metrics',rooms:game.rooms.size,players:[...game.rooms.values()].reduce((n,r)=>n+r.players.size,0),rssMB:Math.round(process.memoryUsage().rss/1048576),heapMB:Math.round(process.memoryUsage().heapUsed/1048576),eventLoopP99ms:Math.round(loop.percentile(99)/1e6),outKBs:Math.round(bytes/1024/5),packetsPerSecond:Math.round(packets/5),cpu:process.cpuUsage()}));bytes=0;packets=0;loop.reset();},5000).unref();
const port=Number(process.env.PORT)||3001;http.listen(port,process.env.HOST||'0.0.0.0',()=>console.log(`Quán Nhậu Đầu Hẻm: http://localhost:${port} · voice ${game.voice.enabled?'đã cấu hình':'chưa cấu hình'}`));
for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>{io.emit('shutdown');io.close();http.close(()=>process.exit(0));setTimeout(()=>process.exit(0),3000).unref();});
