import {randomUUID} from 'node:crypto';
import {AccessToken,RoomServiceClient,WebhookReceiver} from 'livekit-server-sdk';
import type {Player} from '../shared/world';
export type VoiceIdentity={id:string;voiceEpoch:number;voiceActive:boolean};
export class VoiceService {
 readonly enabled:boolean;readonly client:RoomServiceClient|null;readonly receiver:WebhookReceiver|null;
 private channels=new Map<string,string>();
 private created=new Set<string>();
 onRotate:((code:string,table:number,excluded:string)=>void)|null=null;
 constructor(readonly url=process.env.LIVEKIT_URL||'',private readonly key=process.env.LIVEKIT_API_KEY||'',private readonly secret=process.env.LIVEKIT_API_SECRET||''){
  this.enabled=!!(url&&key&&secret&&secret!=='replace-with-long-random-secret'&&process.env.LIVEKIT_WEBHOOK_ENABLED==='true');
  this.client=this.enabled?new RoomServiceClient(url.replace(/^ws/,'http'),key,secret,{requestTimeout:3,failover:false}):null;
  this.receiver=this.enabled?new WebhookReceiver(key,secret):null;
 }
 room(code:string,table:number){const key=`${code}-${table}`;let channel=this.channels.get(key);if(!channel){channel=`qndh-${key}-${randomUUID()}`;this.channels.set(key,channel);}return channel;}
 identity(p:VoiceIdentity){return `${p.id}.${p.voiceEpoch}`;}
 async token(code:string,p:Player&VoiceIdentity){
  if(!this.enabled||!p.seat)throw Error('Voice chưa cấu hình. Xem hướng dẫn LiveKit trong README.');
  const channel=this.room(code,p.seat.table);
  if(!this.created.has(channel)){await this.client!.createRoom({name:channel,maxParticipants:6,emptyTimeout:60,departureTimeout:20});this.created.add(channel);}
  const at=new AccessToken(this.key,this.secret,{identity:this.identity(p),name:p.name,ttl:30});
  // Media rights are opened only by the signed webhook after a fresh seat check.
  at.addGrant({roomJoin:true,room:channel,canPublish:false,canSubscribe:false,canPublishData:false});
  return {url:this.url,token:await at.toJwt(),identity:this.identity(p)};
 }
 async revoke(code:string,p:Player&VoiceIdentity){
  if(p.voiceActive&&p.seat&&this.client){
   const table=p.seat.table,old=this.room(code,table);
   // Delete every media track in this generation. SDK-refreshed privileged tokens
   // can only recreate an empty obsolete room; they can never hear the new room.
   try{await this.client.deleteRoom(old);}
   catch(e:any){if(e?.status!==404&&e?.code!=='not_found')throw Error('Voice: chưa ngắt được kênh cũ. Ghế vẫn được giữ; hãy thử lại.');}
   this.created.delete(old);
   this.channels.set(`${code}-${table}`,`qndh-${code}-${table}-${randomUUID()}`);
   this.onRotate?.(code,table,p.id);
  }
  p.voiceEpoch++;p.voiceActive=false;
 }
 forget(code:string){for(const key of this.channels.keys())if(key.startsWith(code+'-')){this.created.delete(this.channels.get(key)!);this.channels.delete(key);}}
}
