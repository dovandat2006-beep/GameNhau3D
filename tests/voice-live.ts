/** Real local SFU + signed webhook check using generated audio, never microphone capture. */
import 'dotenv/config';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {io,type Socket} from 'socket.io-client';
import {RoomServiceClient} from 'livekit-server-sdk';
import {Room,RoomEvent,AudioSource,AudioFrame,AudioStream,LocalAudioTrack,TrackSource,TrackPublishOptions,dispose} from '@livekit/rtc-node';
import {TABLES,type Player,type RoomState,type Result,type Snapshot} from '../shared/world';
const clients:Socket[]=[],rtc:Room[]=[],readers:ReadableStreamDefaultReader<AudioFrame>[]=[],sleep=(ms:number)=>new Promise(r=>setTimeout(r,ms));
let source:AudioSource|null=null,track:LocalAudioTrack|null=null;
const req=<T=any>(s:Socket,event:string,data?:unknown):Promise<T>=>new Promise((resolve,reject)=>{const cb=(e:Error|null,r:Result<T>)=>e?reject(e):r.ok?resolve(r.data):reject(Error(r.error));if(data===undefined)s.timeout(5000).emit(event,cb);else s.timeout(5000).emit(event,data,cb);});
async function connect(){const s=io('http://localhost:5173',{extraHeaders:{Origin:'http://localhost:5173'},forceNew:true,reconnection:false});clients.push(s);await new Promise<void>((resolve,reject)=>{s.once('connect',resolve);s.once('connect_error',reject);});return s;}
async function until(check:()=>boolean|Promise<boolean>,message:string,ms=8000){const end=Date.now()+ms;while(Date.now()<end){if(await check())return;await sleep(100);}throw Error(message);}
const channel=(token:string)=>JSON.parse(Buffer.from(token.split('.')[1],'base64url').toString()).video.room as string;
try{
 assert.equal((await fetch('http://localhost:5173/api/health').then(r=>r.json())).voiceConfigured,true,'configure local LiveKit before this test');
 const a=await connect(),b=await connect(),c=await connect(),profile={name:'[TEST VOICE] A',color:'#547f75',avatar:0};
 const aj=await req(a,'enter',{mode:'create',private:true,profile}),bj=await req(b,'enter',{mode:'join',code:aj.state.code,profile:{...profile,name:'[TEST VOICE] B'}}),cj=await req(c,'enter',{mode:'join',code:aj.state.code,profile:{...profile,name:'[TEST VOICE] Other table'}});
 const positions=new Map<string,{x:number;z:number}>();for(const p of (cj.state as RoomState).players)positions.set(p.id,p);
 for(const s of clients){s.on('snapshot',(snap:Snapshot)=>{for(const [id,x,z] of snap.players)positions.set(id,{x,z});});s.on('state',(state:RoomState)=>{for(const p of state.players)if(p.seat)positions.set(p.id,p);});}
 async function walk(s:Socket,id:string,points:{x:number;z:number}[]){for(const point of points){const end=Date.now()+15000;while(true){const me=positions.get(id)!,x=point.x-me.x,z=point.z-me.z,d=Math.hypot(x,z);if(d<.18)break;if(Date.now()>end)throw Error('Voice test walking timeout');s.emit('input',{x:x/Math.max(.7,d),z:z/Math.max(.7,d),run:true});await sleep(80);}s.emit('input',{x:0,z:0,run:false});await sleep(120);}}
 await assert.rejects(req(a,'command',{type:'voice'}),/Ngồi/);
 const entry=[{x:0,z:36},{x:0,z:31}],t=TABLES[14],other=TABLES[15];
 await Promise.all([walk(a,aj.id,[...entry,{x:t.x+1,z:t.z+3.2}]),walk(b,bj.id,[...entry,{x:t.x,z:t.z+3.2}]),walk(c,cj.id,[...entry,{x:other.x,z:other.z+3.2}])]);
 await req(a,'command',{type:'sit',table:15,seat:0});await req(b,'command',{type:'sit',table:15,seat:1});await req(c,'command',{type:'sit',table:16,seat:0});
 const [va,vb,vc]=await Promise.all(clients.map(s=>req(s,'command',{type:'voice'})));
 for(const v of [va,vb,vc]){const permissions=JSON.parse(Buffer.from(v.token.split('.')[1],'base64url').toString()).video;assert.equal(permissions.canPublish,false);assert.equal(permissions.canSubscribe,false);}
 assert.equal(channel(va.token),channel(vb.token));assert.notEqual(channel(va.token),channel(vc.token));
 const api=new RoomServiceClient(process.env.LIVEKIT_URL!.replace(/^ws/,'http'),process.env.LIVEKIT_API_KEY!,process.env.LIVEKIT_API_SECRET!);
 const ra=new Room(),rb=new Room(),rc=new Room();rtc.push(ra,rb,rc);let frames=0,energy=0,otherTracks=0;
 rb.on(RoomEvent.TrackSubscribed,remote=>{const reader=new AudioStream(remote,48000,1).getReader();readers.push(reader);void(async()=>{try{while(true){const next=await reader.read();if(next.done)break;frames++;for(let i=0;i<next.value.data.length;i+=16)energy+=Math.abs(next.value.data[i]);}}catch{}})();});
 rc.on(RoomEvent.TrackSubscribed,()=>{otherTracks++;});
 console.log('Connecting three real RTC peers with zero-rights game tokens…');
 await Promise.all([ra.connect(va.url,va.token),rb.connect(vb.url,vb.token),rc.connect(vc.url,vc.token)]);
 for(const v of [va,vb,vc])await until(async()=>{const info=await api.getParticipant(channel(v.token),v.identity);return !!info.permission?.canPublish&&!!info.permission?.canSubscribe;},'Signed participant webhook did not open media permissions');
 await sleep(250);source=new AudioSource(48000,1,100);track=LocalAudioTrack.createAudioTrack('[TEST] synthesized tone',source);const options=new TrackPublishOptions();options.source=TrackSource.SOURCE_MICROPHONE;
 const publication=await ra.localParticipant!.publishTrack(track,options);
 for(let n=0;n<200;n++){const pcm=new Int16Array(480);for(let i=0;i<pcm.length;i++)pcm[i]=Math.round(Math.sin((n*480+i)*2*Math.PI*440/48000)*3000);await source.captureFrame(new AudioFrame(pcm,48000,1,480));}
 await until(()=>frames>=10&&energy>1000,'Other seated peer did not receive decoded audio');assert.equal(otherTracks,0,'another table must never subscribe');
 await ra.localParticipant!.unpublishTrack(publication.sid!);await until(async()=>!(await api.getParticipant(channel(va.token),va.identity)).tracks.length,'Unpublish did not remove the audio track');
 await req(b,'command',{type:'stand'});await until(()=>!ra.isConnected&&!rb.isConnected,'Leaving did not disconnect the old room generation');
 for(const s of clients)await req(s,'leave');
 const result={kind:'real-local-livekit-synthetic-audio',date:new Date().toISOString(),gameClients:3,rtcPeers:3,decodedAudioFrames:frames,nonzeroAudio:energy>1000,otherTableTracks:otherTracks,passed:['seated authorization','zero initial media rights','signed webhook revalidation and grant','generated audio published through SFU','same-table peer receives decoded nonzero audio','different table receives no track','unpublish removes audio','standing revokes old channel generation','clean leave'],limits:['Generated tone, not physical microphones or speaker-device listening','PTT release/connection/permission/device races tested with client unit mocks','No browser permissions-dialog, GPU, WAN or TURN acceptance']};await mkdir('docs/results',{recursive:true});await writeFile('docs/results/voice-live.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
}finally{
 for(const reader of readers)await reader.cancel().catch(()=>{});
 if(track)await track.close().catch(()=>{});if(source)await source.close().catch(()=>{});
 for(const room of rtc)await room.disconnect().catch(()=>{});for(const s of clients){try{await req(s,'leave');}catch{}s.disconnect();}await dispose();
}
