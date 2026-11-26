import {Room,RoomEvent,Track,ConnectionState,type RemoteParticipant,type RemoteTrack,type RemoteTrackPublication} from 'livekit-client';
import {command} from './network';
import {audio} from './audio';
export class TableVoice {
 room:Room|null=null;elements=new Map<string,HTMLMediaElement>();muted=new Set<string>();volume=.8;deaf=false;generation=0;
 private opening:Promise<void>|null=null;private micRequest=0;private micWanted=false;
 onChange:(s:{connected:boolean;mic:boolean;speakers:string[];error:string})=>void=()=>{};
 async connect(){
  if(this.opening)return this.opening;
  const task=this.open();this.opening=task;
  try{await task;}finally{if(this.opening===task)this.opening=null;}
 }
 private async open(){
  const generation=++this.generation;await this.disconnect(false);
  const data=await command<{url:string;token:string;identity:string}>({type:'voice'});
  if(generation!==this.generation)return;
  const room=new Room({adaptiveStream:true,dynacast:true,audioCaptureDefaults:{echoCancellation:true,noiseSuppression:true,autoGainControl:true}});this.room=room;
  room.on(RoomEvent.TrackSubscribed,(track:RemoteTrack,_pub:RemoteTrackPublication,p:RemoteParticipant)=>{if(track.kind!==Track.Kind.Audio)return;const el=track.attach();el.autoplay=true;el.dataset.voice=p.identity;document.body.appendChild(el);this.elements.set(p.identity,el);this.apply();void el.play().catch(()=>this.update('Trình duyệt chặn âm thanh. Bấm Nghe lại để tiếp tục.'));});
  room.on(RoomEvent.TrackUnsubscribed,(track)=>track.detach().forEach(el=>{this.elements.delete(el.dataset.voice||'');el.remove();}));
  room.on(RoomEvent.ActiveSpeakersChanged,()=>{audio.duck(room.activeSpeakers.length>0);this.update();});
  room.on(RoomEvent.LocalTrackPublished,()=>this.update());room.on(RoomEvent.LocalTrackUnpublished,()=>this.update());
  room.on(RoomEvent.TrackMuted,()=>this.update());room.on(RoomEvent.TrackUnmuted,()=>this.update());
  room.on(RoomEvent.MediaDevicesError,()=>this.update('Không truy cập được micro. Kiểm tra quyền và thiết bị.'));
  room.on(RoomEvent.Reconnecting,()=>this.update('Voice đang nối lại…'));
  room.on(RoomEvent.Disconnected,()=>{this.elements.forEach(el=>el.remove());this.elements.clear();audio.duck(false);this.update('Kênh thoại đã ngắt. Bấm Nghe để nối lại.');});
  try{await room.connect(data.url,data.token,{autoSubscribe:true});if(generation!==this.generation){await room.disconnect();return;}await room.startAudio();this.update();}
  catch(e){if(this.room===room){await this.disconnect(false);throw e;}}
 }
 private waitForPublish(room:Room){
  if(room.localParticipant.permissions?.canPublish)return Promise.resolve();
  return new Promise<void>((resolve,reject)=>{
   const finish=(error?:Error)=>{clearTimeout(timer);room.off(RoomEvent.ParticipantPermissionsChanged,check);room.off(RoomEvent.Disconnected,disconnected);error?reject(error):resolve();};
   const check=()=>{if(room.localParticipant.permissions?.canPublish)finish();};
   const disconnected=()=>finish(new Error('Kênh thoại đã ngắt. Bấm Nghe bàn để nối lại.'));
   const timer=setTimeout(()=>finish(new Error('Máy chủ chưa cấp quyền nói. Thả N và thử lại sau một chút.')),5000);
   room.on(RoomEvent.ParticipantPermissionsChanged,check);room.on(RoomEvent.Disconnected,disconnected);check();
  });
 }
 async mic(enabled:boolean){
  const request=++this.micRequest;this.micWanted=enabled;
  if(!enabled){await this.room?.localParticipant.setMicrophoneEnabled(false);this.update();return;}
  try{
   if(!this.room||this.room.state!==ConnectionState.Connected)await this.connect();
   if(request!==this.micRequest||!this.micWanted)return;
   const room=this.room;if(!room||room.state!==ConnectionState.Connected)throw new Error('Kênh thoại chưa nối được. Thả N rồi thử lại.');
   await this.waitForPublish(room);
   if(request!==this.micRequest||!this.micWanted||this.room!==room)return;
   await room.localParticipant.setMicrophoneEnabled(true,{echoCancellation:true,noiseSuppression:true,autoGainControl:true});
   if(request!==this.micRequest||!this.micWanted||this.room!==room)await room.localParticipant.setMicrophoneEnabled(false);
   this.update();
  }catch(e){if(request!==this.micRequest)return;this.micWanted=false;this.update('Micro chưa bật. Kiểm tra quyền micro và kết nối thoại.');throw e;}
 }
 setListen(enabled:boolean){this.deaf=!enabled;this.apply();}
 setVolume(v:number){this.volume=v;this.apply();}
 mute(id:string){if(this.muted.has(id))this.muted.delete(id);else this.muted.add(id);this.apply();}
 apply(){for(const [id,el] of this.elements){el.volume=this.volume;el.muted=this.deaf||this.muted.has(id.split('.')[0]);}}
 update(error=''){this.onChange({connected:this.room?.state===ConnectionState.Connected,mic:!!this.room?.localParticipant.isMicrophoneEnabled,speakers:this.room?.activeSpeakers.map(p=>p.identity.split('.')[0])||[],error});}
 async disconnect(increment=true){if(increment){this.generation++;this.micRequest++;this.micWanted=false;}const room=this.room;this.room=null;if(room)await room.disconnect(true);this.elements.forEach(e=>e.remove());this.elements.clear();audio.duck(false);this.update();}
}
export const voice=new TableVoice();
