import {randomBytes,randomInt,randomUUID} from 'node:crypto';
import {advance,canLie,spawnPosition,RECEPTION,CAPACITY,CHEERS_MS,WAVE_MS,GRACE_MS,QUESTIONS,safeExit,seatPosition,SEATS,TABLES,type Player,type RoomState,type ChatMessage} from '../shared/world';
import {commandSchema,enterSchema,inputSchema,type Command,type Enter} from '../shared/protocol';
import type {FeedbackInput} from '../shared/feedback';
import {receptionReply} from './reception';
import {VoiceService} from './voice';
import {onStage,STAGE,STAGE_BPM,STAGE_AUDIENCE_RADIUS,gestureDuration,drunkLevel,MAX_INTOXICATION,SOBER_INTERVAL_MS,recoveredIntoxication,type StageState} from '../shared/social';
export class GameError extends Error {}
type Member=Player&{token:string;socketId:string|null;expires:number;input:{x:number;z:number;at:number;run?:boolean};buckets:Map<string,{tokens:number;at:number}>;voiceEpoch:number;voiceActive:boolean;cleaning:boolean;drinkDue:number};
export type Room={code:string;name:string;private:boolean;hostId:string;players:Map<string,Member>;tables:RoomState['tables'];revision:number;emptySince:number;queue:Promise<unknown>;stage:StageState;voters:Set<string>};
type Hooks={state:(r:Room)=>void;chat:(r:Room,m:ChatMessage)=>void;effect:(r:Room,p:Player,emote:string)=>void;kick:(socketId:string)=>void;voiceReset?:(r:Room,table:number,excluded:string)=>void;players?:(r:Room,players:Player[])=>void;stage?:(r:Room)=>void;feedback?:(r:Room,p:Player,input:FeedbackInput)=>Promise<{id:string;createdAt:string}>};
const noop=()=>{};
export class Game {
 rooms=new Map<string,Room>(); sessions=new Map<string,{room:Room;player:Member}>();
 constructor(readonly voice=new VoiceService(),readonly hooks:Hooks={state:noop,chat:noop,effect:noop,kick:noop},readonly now=()=>Date.now()){
  voice.onRotate=(code,table,excluded)=>{const r=this.rooms.get(code);if(!r)return;for(const p of r.players.values())if(p.seat?.table===table&&p.id!==excluded){p.voiceActive=false;p.voiceEpoch++;}this.hooks.voiceReset?.(r,table,excluded);};
 }
 publicPlayer(p:Member):Player {const {id,name,color,avatar,face,height,weight,x,z,angle,moving,running,lying,seat,connected,joinedAt,seatedAt,emote,emoteUntil,carryingBeer,beerCount,intoxication,soberAt,dance,danceStartedAt}=p;return {id,name,color,avatar,face,height,weight,x,z,angle,moving,running,lying,seat,connected,joinedAt,seatedAt,emote,emoteUntil,carryingBeer,beerCount,intoxication,soberAt,dance,danceStartedAt};}
 state(r:Room):RoomState{return {code:r.code,name:r.name,private:r.private,hostId:r.hostId,players:[...r.players.values()].map(p=>this.publicPlayer(p)),tables:r.tables.map(t=>({...t,seats:[...t.seats],food:[...t.food],round:t.round?{...t.round}:null})),revision:r.revision,stage:{epoch:r.stage.epoch,battle:r.stage.battle?{...r.stage.battle,votes:[...r.stage.battle.votes]}:null}};}
 touchPlayers(r:Room,players:Member[]){r.revision++;if(this.hooks.players)this.hooks.players(r,players.map(p=>this.publicPlayer(p)));else this.hooks.state(r);}
 touchStage(r:Room){r.revision++;if(this.hooks.stage)this.hooks.stage(r);else this.hooks.state(r);}
 stopEmote(p:Member){p.emote='';p.emoteUntil=0;p.drinkDue=0;}
 recover(p:Member,at:number){const state=recoveredIntoxication(p.intoxication,p.soberAt,at),changed=state.intoxication!==p.intoxication;Object.assign(p,state);return changed;}
 finishDrink(p:Member){
  const complete=!!p.drinkDue&&p.drinkDue<=this.now()&&p.connected&&p.emote==='cheers';
  let changed=this.recover(p,complete?p.drinkDue:this.now());
  if(complete){
   p.beerCount++;p.intoxication=Math.min(MAX_INTOXICATION,p.intoxication+1);p.soberAt=p.drinkDue+SOBER_INTERVAL_MS;
   if(drunkLevel(p.intoxication)===10){p.dance=null;if(!p.seat)p.carryingBeer=false;}
   this.stopEmote(p);changed=true;
  }
  return this.recover(p,this.now())||changed;
 }
 touch(r:Room){r.revision++;this.hooks.state(r);}
 list(){return [...this.rooms.values()].filter(r=>!r.private).map(r=>({code:r.code,name:r.name,count:r.players.size,capacity:CAPACITY}));}
 findSocket(socketId:string){for(const r of this.rooms.values())for(const p of r.players.values())if(p.socketId===socketId)return {room:r,player:p};return null;}
 enter(raw:unknown,socketId:string){
  const parsed=enterSchema.safeParse(raw);if(!parsed.success)throw new GameError('Thông tin vào quán không hợp lệ.');
  const data=parsed.data;
  if(this.findSocket(socketId))throw new GameError('Bạn đã ở trong một quán.');
  if(data.mode==='resume'){
   const session=data.token?this.sessions.get(data.token):undefined;
   if(!session||session.room.code!==data.code||session.player.expires<=this.now())throw new GameError('Phiên đã hết hạn. Hãy vào quán lại.');
   const {room,player}=session;
   if(player.connected)throw new GameError('Phiên này đang được dùng ở cửa sổ khác.');
   this.recover(player,this.now());player.connected=true;player.socketId=socketId;player.expires=Infinity;
   // Rotate the bearer on reconnect; a leaked stale token cannot take the next reconnect.
   this.sessions.delete(player.token);player.token=randomBytes(32).toString('base64url');this.sessions.set(player.token,{room,player});
   if(player.seat)this.repairRound(room,player.seat.table);this.touch(room);return {room,player};
  }
  let room:Room|undefined;
  if(data.mode==='create'){
   if(this.rooms.size>=200)throw new GameError('Máy chủ đã đủ quán. Hãy thử lại sau.');
   let code='';const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
   do{code=Array.from({length:6},()=>alphabet[randomInt(alphabet.length)]).join('');}while(this.rooms.has(code));
   room={code,name:data.name||`Quán của ${data.profile.name}`,private:!!data.private,hostId:'',players:new Map(),tables:TABLES.map(t=>({id:t.id,seats:Array(SEATS).fill(null),food:[],round:null})),revision:0,emptySince:0,queue:Promise.resolve(),stage:{epoch:this.now(),battle:null},voters:new Set()};
   this.rooms.set(code,room);
  }else room=this.rooms.get(data.code||'');
  if(!room)throw new GameError('Không tìm thấy quán. Kiểm tra mã hoặc chọn quán khác.');
  // Synchronous reservation in the one owner process: no await between size check and insertion.
  if(room.players.size>=CAPACITY)throw new GameError('Quán đã đủ 100 người. Vui lòng chọn quán khác.');
  const n=room.players.size;
  const player:Member={...data.profile,id:randomUUID(),token:randomBytes(32).toString('base64url'),socketId,...spawnPosition(n),angle:Math.PI,moving:false,running:false,lying:false,seat:null,connected:true,joinedAt:this.now(),seatedAt:0,expires:Infinity,input:{x:0,z:0,at:0},buckets:new Map(),voiceEpoch:0,voiceActive:false,cleaning:false,emote:'',emoteUntil:0,carryingBeer:false,beerCount:0,intoxication:0,soberAt:0,dance:null,danceStartedAt:0,drinkDue:0};
  room.players.set(player.id,player);room.emptySince=0;this.sessions.set(player.token,{room,player});if(!room.hostId)room.hostId=player.id;
  this.touch(room);return {room,player};
 }
 limit(p:Member,key:string,rate:number,burst:number){
  const now=this.now();const b=p.buckets.get(key)||{tokens:burst,at:now};
  b.tokens=Math.min(burst,b.tokens+(now-b.at)*rate/1000);b.at=now;p.buckets.set(key,b);
  if(b.tokens<1)throw new GameError('Thao tác hơi nhanh. Chờ một chút nhé.');b.tokens--;
 }
 input(socketId:string,raw:unknown){const s=this.findSocket(socketId);if(!s)return;const data=inputSchema.safeParse(raw);if(!data.success)return;
  try{this.limit(s.player,'move',22,30);}catch{return;}s.player.input={...data.data,at:this.now()};}
 enqueue<T>(r:Room,task:()=>Promise<T>):Promise<T>{const next=r.queue.then(task,task);r.queue=next.catch(()=>{});return next;}
 async command(socketId:string,raw:unknown){
  const parsed=commandSchema.safeParse(raw);if(!parsed.success)throw new GameError('Thao tác không hợp lệ.');
  const s=this.findSocket(socketId);if(!s)throw new GameError('Bạn chưa vào quán.');
  const {room:r,player:p}=s;this.limit(p,'all',8,12);
  return this.enqueue(r,async()=>{
   if(!p.connected||p.socketId!==socketId||!r.players.has(p.id))throw new GameError('Phiên không còn hoạt động.');
   if(this.finishDrink(p))this.touchPlayers(r,[p]);
   return this.perform(r,p,parsed.data);
  });
 }
 coordinator(r:Room,table:number){return r.tables[table-1].seats.map(id=>id?r.players.get(id):undefined).filter((p):p is Member=>!!p&&p.connected).sort((a,b)=>a.seatedAt-b.seatedAt||a.id.localeCompare(b.id))[0];}
 async perform(r:Room,p:Member,c:Command):Promise<unknown>{
  const table=p.seat?r.tables[p.seat.table-1]:null,crawling=drunkLevel(p.intoxication)===10&&!p.seat;
  if(c.type==='feedback'){
   if(!this.hooks.feedback)throw new GameError('Máy chủ chưa bật phần góp ý.');
   try{this.limit(p,'feedback',1/60,1);}catch{throw new GameError('Mỗi người gửi một góp ý mỗi 60 giây. Bạn chờ một chút nhé.');}
   try{return await this.hooks.feedback(r,this.publicPlayer(p),{category:c.category,text:c.text});}catch(e){const bucket=p.buckets.get('feedback');if(bucket)bucket.tokens=1;throw e;}
  }else if(c.type==='lie'){
   if(p.lying===c.enabled)return {};this.limit(p,'lie',1,2);
   if(c.enabled){
    if(p.seat)throw new GameError('Đứng dậy khỏi ghế trước khi nằm nghỉ.');
    if(p.carryingBeer)throw new GameError('Cất cốc trước khi nằm nghỉ.');
    if(p.emoteUntil>this.now())throw new GameError('Đợi cử chỉ hiện tại kết thúc.');
    if(!canLie(p,[...r.players.values()].filter(q=>q.id!==p.id)))throw new GameError('Ra chỗ trống, bằng phẳng để nằm nghỉ nhé.');
   }
   p.lying=c.enabled;p.dance=null;this.stopEmote(p);p.moving=false;p.running=false;p.input={x:0,z:0,at:0};this.touchPlayers(r,[p]);return {};
  }else if(c.type==='appearance'){
   if(p.lying)throw new GameError('Dậy trước khi đổi tạo hình.');
   this.limit(p,'appearance',.5,2);if(p.emoteUntil>this.now())throw new GameError('Đợi cử chỉ kết thúc rồi đổi tạo hình.');
   Object.assign(p,c.appearance);this.touchPlayers(r,[p]);return {};
  }else if(c.type==='reception'){
   this.limit(p,'reception',.5,2);if(p.seat||p.lying||Math.hypot(p.x-RECEPTION.x,p.z-RECEPTION.z)>5.5)throw new GameError('Đến gần quầy lễ tân ở cổng để trò chuyện.');
   return {reply:receptionReply(c.text,p,r.tables)};
  }else if(c.type==='sit'){
   if(p.lying)throw new GameError('Dậy trước khi ngồi vào ghế.');
   this.limit(p,'seat',2,3);if(p.seat)throw new GameError('Hãy đứng dậy trước khi chuyển bàn.');
   const t=r.tables[c.table-1],pos=seatPosition({table:c.table,index:c.seat});
   if(t.seats[c.seat])throw new GameError('Ghế vừa có người ngồi. Hãy chọn ghế khác.');
   if(Math.hypot(p.x-pos.x,p.z-pos.z)>3)throw new GameError('Hãy đến gần ghế hơn rồi nhấn E.');
   p.dance=null;p.carryingBeer=false;this.stopEmote(p);p.seat={table:c.table,index:c.seat};p.seatedAt=this.now();t.seats[c.seat]=p.id;Object.assign(p,pos);p.moving=false;p.running=false;p.input={x:0,z:0,at:0};
  }else if(c.type==='stand'){
   if(p.lying){p.lying=false;p.input={x:0,z:0,at:0};this.touchPlayers(r,[p]);return {};}
   if(!p.seat)return {};await this.voice.revoke(r.code,p);this.releaseSeat(r,p);if(drunkLevel(p.intoxication)===10)p.carryingBeer=false;p.input={x:0,z:0,at:0};
  }else if(c.type==='chat'){
   this.limit(p,'chat',.6,3);if(c.channel==='table'&&!table)throw new GameError('Bạn cần ngồi vào bàn để chat bàn.');
   const text=c.text.replace(/[\u0000-\u001F\u007F]/g,'').trim();if(!text)throw new GameError('Tin nhắn đang trống.');
   this.hooks.chat(r,{id:randomUUID(),sender:p.id,name:p.name,channel:c.channel,table:p.seat?.table||null,text,time:this.now()});return {};
  }else if(c.type==='order'){
   this.limit(p,'food',1,2);if(!table)throw new GameError('Ngồi vào bàn để gọi món.');
   if(table.food.length>=7)throw new GameError('Bàn đã có 7 món. Nhờ người điều phối dọn bàn.');table.food.push(c.item);
  }else if(c.type==='clear'){
   if(!table||this.coordinator(r,table.id)?.id!==p.id)throw new GameError('Chỉ người điều phối đang ngồi tại bàn được dọn món.');table.food=[];
  }else if(c.type==='carry'){
   if(c.enabled&&p.lying)throw new GameError('Dậy trước khi cầm cốc.');
   if(c.enabled&&crawling)throw new GameError('Say cấp 10: đang bò, chưa thể cầm cốc.');
   if(p.carryingBeer===c.enabled)return {};this.limit(p,'carry',1,2);
   if(p.emoteUntil>this.now())throw new GameError('Đợi cử chỉ hiện tại kết thúc rồi đổi cốc nhé.');
   if(c.enabled&&!p.seat&&!TABLES.some(t=>Math.hypot(t.x-p.x,t.z-p.z)<4)&&Math.hypot(p.x-23,p.z+15)>4)throw new GameError('Đến gần bàn hoặc quầy để cầm cốc.');
   p.dance=null;p.carryingBeer=c.enabled;this.touchPlayers(r,[p]);return {};
  }else if(c.type==='sober'){
   if(!p.beerCount)return {};this.limit(p,'sober',.33,1);
   if(p.drinkDue)throw new GameError('Uống xong rồi đặt lại hiệu ứng nhé.');p.beerCount=0;p.intoxication=0;p.soberAt=0;this.touchPlayers(r,[p]);return {};
  }else if(c.type==='dance'){
   if(p.lying)throw new GameError('Dậy trước khi nhảy.');
   if(c.style==='stop'){p.dance=null;this.touchPlayers(r,[p]);return {};}
   if(drunkLevel(p.intoxication)===10)throw new GameError('Say cấp 10: chờ tỉnh bớt trước khi nhảy.');
   if(p.dance===c.style)return {};this.limit(p,'dance',2,3);
   if(p.seat)throw new GameError('Đứng dậy trước khi nhảy.');
   if(p.carryingBeer)throw new GameError('Cất cốc trước khi nhảy nhé.');
   if(p.emoteUntil>this.now())throw new GameError('Đợi cử chỉ hiện tại kết thúc.');
   p.dance=c.style;p.danceStartedAt=r.stage.epoch+Math.floor((this.now()-r.stage.epoch)/(60000/STAGE_BPM))*(60000/STAGE_BPM);
   this.touchPlayers(r,[p]);return {};
  }else if(c.type==='invite'){
   if(p.lying||crawling||p.seat||!p.carryingBeer)throw new GameError('Đứng và cầm cốc để đi mời bàn khác.');
   const t=TABLES[c.table-1];if(Math.hypot(p.x-t.x,p.z-t.z)>4.5)throw new GameError('Đến gần bàn muốn mời hơn nhé.');
   if(!r.tables[c.table-1].seats.some(id=>id&&r.players.get(id)?.connected))throw new GameError('Bàn này chưa có bạn ngồi.');
   if(p.emoteUntil>this.now())throw new GameError('Đợi cử chỉ hiện tại kết thúc.');this.limit(p,'invite',.25,1);
   p.angle=Math.atan2(t.x-p.x,t.z-p.z);p.dance=null;p.emote='invite';p.emoteUntil=this.now()+gestureDuration('invite');this.hooks.effect(r,this.publicPlayer(p),`invite:${c.table}`);this.touchPlayers(r,[p]);return {};
  }else if(c.type==='emote'){
   if(p.lying)throw new GameError('Dậy trước khi dùng cử chỉ khác.');
   if(crawling&&c.emote!=='vomit')throw new GameError('Say cấp 10: ngồi xuống hoặc chờ tỉnh bớt để dùng cử chỉ.');
   if(c.emote==='vomit'&&drunkLevel(p.intoxication)<5)throw new GameError('Cử chỉ nôn chỉ dùng khi say từ cấp 5 trở lên.');
   if(c.emote==='vomit'&&p.carryingBeer)throw new GameError('Cất cốc trước khi dùng cử chỉ nôn.');
   if(c.emote==='smoke'&&p.carryingBeer)throw new GameError('Cất cốc trước khi hút thuốc lá ảo.');
   if(p.emoteUntil>this.now())throw new GameError('Đợi cử chỉ hiện tại kết thúc nhé.');
   if(c.emote==='cheers'&&!table&&!p.carryingBeer)throw new GameError('Ngồi cùng bàn hoặc cầm cốc rồi Dô nhé!');
   if(c.emote==='clap'&&p.carryingBeer)throw new GameError('Cất cốc để vỗ tay bằng hai tay.');
   this.limit(p,'emote',.33,1);p.dance=null;
   p.emote=c.emote;p.emoteUntil=this.now()+gestureDuration(c.emote);
   if(c.emote==='cheers')p.drinkDue=p.emoteUntil;
   if(c.emote==='cheers'||c.emote==='vomit'){p.input={x:0,z:0,at:0};p.moving=false;}
   this.hooks.effect(r,this.publicPlayer(p),c.emote);this.touchPlayers(r,[p]);return {};
  }else if(c.type==='battle'){
   this.limit(p,'battle',1,3);const b=r.stage.battle;
   if(c.action==='challenge'){
    if(b&&(['invited','running'].includes(b.status)||b.endsAt>this.now()))throw new GameError('Sân khấu đang có lượt. Chờ lượt sau nhé.');
    const opponent=c.target?r.players.get(c.target):null;
    if(p.lying||drunkLevel(p.intoxication)===10||!onStage(p)||p.seat||p.carryingBeer||!opponent||opponent.id===p.id||!opponent.connected||!onStage(opponent)||opponent.lying||opponent.seat||opponent.carryingBeer||drunkLevel(opponent.intoxication)===10)throw new GameError('Hai bạn cần đứng trên sân khấu, cất cốc và chọn đúng người.');
    r.voters.clear();r.stage.battle={id:randomUUID(),challenger:p.id,opponent:opponent.id,status:'invited',endsAt:this.now()+12000,votes:[0,0],winner:null,reason:''};
   }else if(c.action==='accept'){
    if(!b||b.status!=='invited'||b.opponent!==p.id||b.endsAt<=this.now())throw new GameError('Lời mời đã hết hoặc không dành cho bạn.');
    const a=r.players.get(b.challenger);if(!a||a.lying||p.lying||drunkLevel(a.intoxication)===10||drunkLevel(p.intoxication)===10||!a.connected||!onStage(a)||!onStage(p)||a.seat||p.seat||a.carryingBeer||p.carryingBeer||a.emoteUntil>this.now()||p.emoteUntil>this.now())throw new GameError('Cả hai cần sẵn sàng trên sân khấu, không cầm cốc.');
    b.status='running';b.endsAt=this.now()+20000;a.angle=Math.atan2(p.x-a.x,p.z-a.z);p.angle=Math.atan2(a.x-p.x,a.z-p.z);
    for(const dancer of [a,p]){dancer.dance=dancer.dance||'shuffle';dancer.danceStartedAt=r.stage.epoch;}
    this.touchPlayers(r,[a,p]);
   }else if(c.action==='decline'){
    if(!b||b.status!=='invited'||![b.challenger,b.opponent].includes(p.id))throw new GameError('Không có lời mời để hủy.');b.status='cancelled';b.reason='Lời mời được bỏ qua.';b.endsAt=this.now()+4000;
   }else{
    if(!b||b.status!=='running'||b.endsAt<=this.now())throw new GameError('Lượt bình chọn chưa mở hoặc đã kết thúc.');
    if([b.challenger,b.opponent].includes(p.id)||r.voters.has(p.id)||Math.hypot(p.x-STAGE.x,p.z-STAGE.z)>STAGE_AUDIENCE_RADIUS||!c.target||![b.challenger,b.opponent].includes(c.target))throw new GameError('Khán giả gần sân khấu được bình chọn một lần, cho một trong hai bạn.');
    r.voters.add(p.id);b.votes[c.target===b.challenger?0:1]++;
   }
   this.touchStage(r);return {};
  }else if(c.type==='round'){
   if(!table||this.coordinator(r,table.id)?.id!==p.id)throw new GameError('Chỉ người điều phối bàn được điều khiển lượt.');
   if(c.action==='end')table.round=null;
   else {
    if(c.action==='start'&&table.round)throw new GameError('Bàn đã có một lượt đang chạy.');
    if(c.action!=='start'&&!table.round)throw new GameError('Chưa có lượt nào.');
    const members=table.seats.filter((id):id is string=>!!id&&!!r.players.get(id)?.connected);
    if(!members.length)throw new GameError('Bàn đang trống.');
    const selected=c.action==='next'&&table.round?table.round.selected:members[randomInt(members.length)];
    let q=QUESTIONS[randomInt(QUESTIONS.length)];if(q===table.round?.question)q=QUESTIONS[(QUESTIONS.indexOf(q)+1)%QUESTIONS.length];
    table.round={selected,question:q,coordinator:p.id,turn:(table.round?.turn||0)+1};
   }
  }else if(c.type==='kick'){
   if(r.hostId!==p.id||c.target===p.id)throw new GameError('Chỉ chủ quán được mời người khác ra.');
   const target=r.players.get(c.target);if(!target)throw new GameError('Người này đã rời quán.');
   await this.voice.revoke(r.code,target);this.remove(r,target,true);return {};
  }else if(c.type==='voice'){
   this.limit(p,'voice',.2,2);if(!p.seat)throw new GameError('Ngồi vào bàn trước khi bật voice.');
   // Invalidate every previous token identity; reconnects must request fresh credentials.
   await this.voice.revoke(r.code,p);p.voiceActive=true;
   try{return await this.voice.token(r.code,p);}catch(e){p.voiceActive=false;throw e;}
  }
  this.touch(r);return {};
 }
 repairRound(r:Room,table:number){
  const t=r.tables[table-1];if(!t.round)return;
  const coordinator=this.coordinator(r,table);
  if(!coordinator){t.round=null;return;}
  t.round.coordinator=coordinator.id;
  if(!t.seats.includes(t.round.selected)||!r.players.get(t.round.selected)?.connected){
   const ids=t.seats.filter((id):id is string=>!!id&&!!r.players.get(id)?.connected);
   t.round.selected=ids[randomInt(ids.length)];t.round.turn++;
  }
 }
 releaseSeat(r:Room,p:Member){if(!p.seat)return;const old=p.seat;Object.assign(p,safeExit(old,[...r.players.values()].filter(q=>q.id!==p.id)));r.tables[old.table-1].seats[old.index]=null;p.seat=null;p.seatedAt=0;this.stopEmote(p);this.repairRound(r,old.table);}
 remove(r:Room,p:Member,kicked=false){
  this.releaseSeat(r,p);r.players.delete(p.id);this.sessions.delete(p.token);
  const socketId=p.socketId;p.socketId=null;p.connected=false;
  if(r.hostId===p.id)r.hostId=[...r.players.values()].sort((a,b)=>a.joinedAt-b.joinedAt||a.id.localeCompare(b.id))[0]?.id||'';
  if(!r.players.size)r.emptySince=this.now();this.touch(r);if(socketId&&kicked)this.hooks.kick(socketId);
 }
 async leave(socketId:string){const s=this.findSocket(socketId);if(!s)return;await this.enqueue(s.room,async()=>{await this.voice.revoke(s.room.code,s.player);this.remove(s.room,s.player);});}
 disconnect(socketId:string){const s=this.findSocket(socketId);if(!s)return;const {room:r,player:p}=s;
  this.finishDrink(p);this.stopEmote(p);p.dance=null;p.connected=false;p.socketId=null;p.moving=false;p.running=false;p.input={x:0,z:0,at:0};p.expires=this.now()+GRACE_MS;
  if(p.seat)this.repairRound(r,p.seat.table);this.touch(r);
  void this.enqueue(r,()=>this.voice.revoke(r.code,p)).catch(()=>{}); // Media rights are also denied by webhook while disconnected.
 }
 tick(dt=.05){const now=this.now();for(const r of this.rooms.values()){
  const players=[...r.players.values()],changed=new Set<Member>();
  for(const p of players){
   if(this.finishDrink(p))changed.add(p);
   if(p.emote==='vomit'&&p.emoteUntil>now&&drunkLevel(p.intoxication)<5){this.stopEmote(p);changed.add(p);}
   if(!p.connected){if(p.expires<=now&&!p.cleaning){p.cleaning=true;void this.enqueue(r,async()=>{if(p.connected)return;await this.voice.revoke(r.code,p);this.remove(r,p);}).catch(()=>{}).finally(()=>{p.cleaning=false;});}continue;}
   if(p.seat)continue;
   const input=now-p.input.at<250?p.input:{x:0,z:0,run:false};
   if(Math.hypot(input.x,input.z)>.01){if(p.lying){p.lying=false;changed.add(p);}if((p.emote==='smoke'||p.emote==='vomit')&&p.emoteUntil>now){this.stopEmote(p);changed.add(p);}if(p.dance){p.dance=null;changed.add(p);}if(p.drinkDue){this.stopEmote(p);changed.add(p);}}
   const running=!!input.run&&drunkLevel(p.intoxication)<10&&Math.hypot(input.x,input.z)>.01;
   if(p.running!==running){p.running=running;changed.add(p);}
   const next=advance(p,input.x,input.z,dt,players.filter(q=>q.id!==p.id),now);
   p.moving=Math.hypot(next.x-p.x,next.z-p.z)>.001;if(p.moving)p.angle=Math.atan2(input.x,input.z);Object.assign(p,next);
  }
  if(changed.size)this.touchPlayers(r,[...changed]);
  const battle=r.stage.battle;
  if(battle&&['invited','running'].includes(battle.status)){
   const a=r.players.get(battle.challenger),b=r.players.get(battle.opponent);
   if(!a?.connected||!b?.connected||!onStage(a)||!onStage(b)||a.seat||b.seat||(battle.status==='running'&&(!a.dance||!b.dance))){battle.status='cancelled';battle.reason='Lượt dừng vì một bạn rời sân khấu hoặc dừng nhảy.';battle.endsAt=now+4000;this.touchStage(r);}
   else if(battle.endsAt<=now){if(battle.status==='invited'){battle.status='cancelled';battle.reason='Lời mời hết hạn.';}else{battle.status='finished';battle.winner=battle.votes[0]===battle.votes[1]?null:battle.votes[0]>battle.votes[1]?battle.challenger:battle.opponent;battle.reason=battle.winner?'Khán giả đã chọn!':'Hai bạn hòa nhau.';}battle.endsAt=now+6000;this.touchStage(r);}
  }
  if(!r.players.size&&r.emptySince&&now-r.emptySince>60_000){this.voice.forget(r.code);this.rooms.delete(r.code);}
 }}
}
