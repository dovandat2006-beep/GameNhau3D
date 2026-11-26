/** Isolated real Socket.IO test. Synthetic feedback is kept in a temp directory and removed. */
import {spawn,type ChildProcess} from 'node:child_process';
import {once} from 'node:events';
import {mkdtemp,rm,mkdir,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {io,type Socket} from 'socket.io-client';
import assert from 'node:assert/strict';
import {FeedbackStore} from '../server/feedback';
import type {RoomState,Player,Result} from '../shared/world';
const dir=await mkdtemp(join(tmpdir(),'qndh-live-feedback-')),port=3004,url=`http://127.0.0.1:${port}`,origin=`http://localhost:${port}`,clients:Socket[]=[],sleep=(ms:number)=>new Promise(r=>setTimeout(r,ms));
let server:ChildProcess|null=null,logs='';
async function stop(){if(server&&server.exitCode===null){const exited=once(server,'exit');server.kill('SIGTERM');await exited;}server=null;}
async function start(){
 server=spawn(process.execPath,['--import','tsx','server/index.ts'],{cwd:process.cwd(),env:{...process.env,PORT:String(port),HOST:'127.0.0.1',ALLOWED_ORIGINS:origin,DATA_DIR:dir,LIVEKIT_WEBHOOK_ENABLED:'false',LOG_METRICS:'false'},stdio:['ignore','pipe','pipe']});server.stderr?.on('data',d=>{logs+=String(d);});
 for(let i=0;i<80;i++){if(server.exitCode!==null)throw Error(logs||'Test server exited');try{if((await fetch(url+'/api/health')).ok)return;}catch{}await sleep(100);}throw Error('Test server did not start');
}
async function connect(){const s=io(url,{transports:['websocket'],extraHeaders:{Origin:origin},forceNew:true,reconnection:false});clients.push(s);await new Promise<void>((resolve,reject)=>{s.once('connect',resolve);s.once('connect_error',reject);});return s;}
const req=<T=any>(s:Socket,event:string,data?:unknown):Promise<T>=>new Promise((resolve,reject)=>{const cb=(e:Error|null,r:Result<T>)=>e?reject(e):r.ok?resolve(r.data):reject(Error(r.error));if(data===undefined)s.timeout(5000).emit(event,cb);else s.timeout(5000).emit(event,data,cb);});
try{
 await start();const a=await connect(),b=await connect(),profile={name:'[TEST] Nằm / góp ý',color:'#547f75',avatar:0};const aj=await req(a,'enter',{mode:'create',private:true,profile});const bj=await req(b,'enter',{mode:'join',code:aj.state.code,profile:{...profile,name:'[TEST] Quan sát'}});
 let state:RoomState=bj.state,chat=0;b.on('state',s=>{state=s;});b.on('players',(patch:{players:Player[]})=>{state={...state,players:state.players.map(p=>patch.players.find(q=>q.id===p.id)||p)};});b.on('chat',()=>chat++);
 await req(a,'command',{type:'lie',enabled:true});await sleep(120);assert.equal(state.players.find(p=>p.id===aj.id)!.lying,true);
 await req(a,'command',{type:'stand'});await sleep(120);assert.equal(state.players.find(p=>p.id===aj.id)!.lying,false);
 const receipt=await req(a,'command',{type:'feedback',category:'idea',text:'[TEST] Mong có thêm trò chơi nhịp điệu.'});assert.ok(receipt.id);const entries=await new FeedbackStore(dir).read();assert.equal(entries.length,1);assert.equal(entries[0].id,receipt.id);assert.equal(entries[0].playerName,profile.name);
 await assert.rejects(req(a,'command',{type:'feedback',category:'bug',text:'[TEST] Một góp ý gửi quá nhanh.'}),/60 giây/);assert.equal(chat,0);assert.equal((await fetch(url+'/data/feedback.jsonl')).status,404);
 for(const s of [a,b]){await req(s,'leave');s.disconnect();}await stop();await start();assert.equal((await new FeedbackStore(dir).read()).length,1,'feedback survives server restart');
 const result={kind:'isolated-synthetic-rest-feedback',date:new Date().toISOString(),clients:2,passed:['lying state received by observer','stand clears lying','feedback acknowledged after durable write','rate limit enforced','feedback absent from room chat','private data URL not served','feedback survives a restarted server'],limits:['Temporary test data only; production feedback untouched','No browser/GPU visual inspection']};await mkdir('docs/results',{recursive:true});await writeFile('docs/results/rest-feedback-live.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
}finally{for(const s of clients)s.disconnect();await stop();await rm(dir,{recursive:true,force:true});}
