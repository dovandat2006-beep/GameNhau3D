import {avatarDimensions,type Appearance} from './appearance';
import {STAGE_SPEAKERS,floorHeight,drunkLevel,type DanceStyle,type StageState} from './social';
export const CAPACITY = 100;
export const SEATS = 6;
export const GRACE_MS = 20_000;
export const SPEED = 2;
export const RUN_SPEED = 2.5;
export const CHEERS_MS = 3600;
export const CHEERS_CLINK_MS = 1850;
export const WAVE_MS = 2400;
export const TICK_MS = 50;
export const ENTRANCE={z:34,width:12};
export const STREET={minZ:35,maxZ:46};
export const RECEPTION={x:-11,z:32,w:5,d:2};
export const RECEPTION_HOST={x:RECEPTION.x,z:RECEPTION.z-1.9,w:.7,d:.7};
export const WC={x:-22,z:-13,w:7,d:6,door:2.2};
export const WC_WALLS=[
 {x:WC.x-WC.w/2,z:WC.z,w:.25,d:WC.d},
 {x:WC.x+WC.w/2,z:WC.z,w:.25,d:WC.d},
 {x:WC.x,z:WC.z-WC.d/2,w:WC.w,d:.25},
 ...[-1,1].map(side=>({x:WC.x+side*(WC.w+WC.door)/4,z:WC.z+WC.d/2,w:(WC.w-WC.door)/2,d:.25})),
];
export const AWNING_POSTS=[-27,-16,16,27].map(x=>({x,z:-11.8,w:.15,d:.15}));
export const FRONT_FENCES=[-1,1].map(side=>({x:side*(27+ENTRANCE.width/2)/2,z:ENTRANCE.z,w:27-ENTRANCE.width/2,d:.35}));
export const MOTORBIKES=[-22,-18,-14,14,18,22].map((x,i)=>({x,z:37.8,w:2.5,d:1.2,style:i%2?'dream' as const:'xipo' as const,color:['#9c4036','#583c56','#3d665a','#7b332c','#477585','#d4bd8d'][i]}));
export function spawnPosition(index:number){return {x:(index%9-4)*.8,z:40+Math.floor(index/9)%3*.8};}
// All tables are in the courtyard, in front of the rear stage. The middle aisle leads in from the road.
export const TABLES = [
 ...[-20,-10,0,10,20].map(x=>({x,z:0})),
 ...[9,18,27].flatMap(z=>[-18,-8,8,18].map(x=>({x,z}))),
].map((position,i)=>({id:i+1,...position}));
export const MENU = [
  {id:'peanut',name:'Đậu phộng',detail:'Rang giòn, chuyện rôm rả',color:'#b97b42'},
  {id:'nem',name:'Nem chua',detail:'Vị quê nhà thân thuộc',color:'#c96c6b'},
  {id:'squid',name:'Mực nướng',detail:'Thơm lừng góc hẻm',color:'#bc8753'},
  {id:'tofu',name:'Đậu hũ chiên',detail:'Vàng giòn, nóng hổi',color:'#e9c97d'},
  {id:'beer',name:'Bia ảo',detail:'Chỉ nâng ly trong game',color:'#d8aa4d'},
  {id:'soda',name:'Nước ngọt',detail:'Một chút ngọt ngào',color:'#b65843'},
  {id:'tea',name:'Trà đá',detail:'Mát lòng mát dạ',color:'#9c9b54'},
] as const;
export const QUESTIONS = [
  'Nếu mở một quán ăn, bạn sẽ đặt tên gì?', 'Món ăn tuổi thơ bạn nhớ nhất là món nào?',
  'Kể một lần bạn cười đến đau bụng.', 'Nếu có một ngày nghỉ trọn vẹn, bạn sẽ làm gì?',
  'Bài hát nào khiến bạn muốn hát theo ngay?', 'Nếu có thể học ngay một kỹ năng, bạn chọn gì?',
  'Điều nhỏ bé nào hôm nay làm bạn vui?', 'Bạn muốn đưa cả bàn đi du lịch ở đâu?',
  'Món nào bạn có thể ăn cả tuần mà không chán?', 'Biệt danh hài hước nhất bạn từng có là gì?',
  'Một bộ phim bạn muốn giới thiệu với cả bàn?', 'Nếu được quay lại một buổi chiều tuổi thơ, bạn chọn buổi nào?',
  'Bạn có tài lẻ nào ít người biết?', 'Món ăn bạn nấu tự tin nhất là gì?',
  'Một người bạn đã giúp bạn như thế nào?', 'Nếu nuôi một chú mèo, bạn sẽ đặt tên gì?',
  'Mùi hương nào làm bạn nhớ quê nhà?', 'Kể một chuyện dễ thương trên đường đi làm hoặc đi học.',
  'Nếu viết một tấm bưu thiếp, bạn muốn gửi cho ai?', 'Kỷ niệm vui nhất của bạn với xe đạp là gì?',
  'Nếu quán có linh vật, bạn chọn con gì?', 'Bạn thích mưa đầu mùa hay nắng sớm? Vì sao?',
  'Một lời cảm ơn bạn muốn nói hôm nay?', 'Nếu cả bàn lập ban nhạc, bạn sẽ chơi nhạc cụ gì?',
];
export type Seat = {table:number;index:number};
export type Player = Appearance&{id:string;name:string;x:number;z:number;angle:number;moving:boolean;running:boolean;lying:boolean;seat:Seat|null;connected:boolean;joinedAt:number;seatedAt:number;emote:string;emoteUntil:number;carryingBeer:boolean;beerCount:number;intoxication:number;soberAt:number;dance:DanceStyle|null;danceStartedAt:number};
export type Round = {selected:string;question:string;coordinator:string;turn:number};
export type TableState = {id:number;seats:(string|null)[];food:string[];round:Round|null};
export type RoomState = {code:string;name:string;private:boolean;hostId:string;players:Player[];tables:TableState[];revision:number;stage:StageState};
export type ChatMessage = {id:string;sender:string;name:string;channel:'room'|'table';table:number|null;text:string;time:number};
export type RoomListing = {code:string;name:string;count:number;capacity:number};
export type Result<T=unknown> = {ok:true;data:T}|{ok:false;error:string};
export function seatPosition(seat:Seat) {
  const t=TABLES[seat.table-1]; const a=seat.index*Math.PI/3;
  return {x:t.x+Math.sin(a)*2.1,z:t.z+Math.cos(a)*2.1,angle:a+Math.PI};
}
export const OBSTACLES = [
  ...STAGE_SPEAKERS, // stage speakers
  ...FRONT_FENCES,...[-1,1].map(side=>({x:side*ENTRANCE.width/2,z:ENTRANCE.z,w:.35,d:.35})),
  RECEPTION,RECEPTION_HOST,...WC_WALLS,...MOTORBIKES,...AWNING_POSTS,
  {x:WC.x-1.8,z:WC.z-1.6,w:.8,d:1.1}, // toilet
  {x:WC.x+2.5,z:WC.z-1.7,w:.8,d:.7}, // wash basin
  {x:23,z:-15,w:7,d:2.2}, // serving counter
  {x:26,z:-7,w:2,d:3}, // ice box
  {x:26,z:20,w:1.5,d:3}, // planters
];
export function walkable(x:number,z:number,others:readonly Player[]=[]):boolean {
  if(x < -27 || x > 27 || z < -17 || z > STREET.maxZ) return false;
  if(TABLES.some(t=>Math.hypot(x-t.x,z-t.z)<1.85))return false;
  if(OBSTACLES.some(o=>Math.abs(x-o.x)<o.w/2+.4&&Math.abs(z-o.z)<o.d/2+.4))return false;
  // Stools become solid while occupied. Empty stools are low and traversable.
  return !others.some(p=>p.seat&&Math.hypot(x-p.x,z-p.z)<.65);
}
export function movementSpeed(intoxication:number,running=false){const level=drunkLevel(intoxication);return level===10?SPEED*.3:running?RUN_SPEED:SPEED*(1-Math.max(0,level-1)*.035);}
export function advance(p:Pick<Player,'x'|'z'>&Partial<Pick<Player,'intoxication'|'running'>>,dx:number,dz:number,dt:number,others:readonly Player[]=[],now=0){
  const level=drunkLevel(p.intoxication||0);
  // Server-clock sway changes heading gently, while all wall/seat/step checks still apply.
  const sway=level>0&&level<10?(p.running?Math.sin(now/1000*3.5)*.05*level:level>1?Math.sin(now/1000*2.4)*.035*(level-1):0):0;
  const inputX=dx;dx=inputX*Math.cos(sway)-dz*Math.sin(sway);dz=inputX*Math.sin(sway)+dz*Math.cos(sway);
  const len=Math.hypot(dx,dz); if(!len)return {x:p.x,z:p.z};
  const step=Math.min(dt,.1)*movementSpeed(p.intoxication||0,p.running)/Math.max(1,len);
  let {x,z}=p; if(walkable(x+dx*step,z,others)&&Math.abs(floorHeight(x+dx*step,z)-floorHeight(x,z))<.12)x+=dx*step;
  if(walkable(x,z+dz*step,others)&&Math.abs(floorHeight(x,z+dz*step)-floorHeight(x,z))<.12)z+=dz*step;
  return {x,z};
}
export function safeExit(seat:Seat,players:readonly Player[]){
  const s=seatPosition(seat);
  for(let n=0;n<12;n++){
    const a=seat.index*Math.PI/3+n*Math.PI/6;
    const t=TABLES[seat.table-1]; const x=t.x+Math.sin(a)*3.2,z=t.z+Math.cos(a)*3.2;
    if(walkable(x,z,players))return {x,z};
  }
  return spawnPosition(4);
}

export type Snapshot={time:number;players:[id:string,x:number,z:number,angle:number,moving:0|1][]};

/** Full body clearance on a single flat surface, not only the standing centre point. */
export function canLie(p:Pick<Player,'x'|'z'|'angle'|'height'|'weight'|'avatar'|'face'>,others:readonly Player[]=[]){
 const d=avatarDimensions(p),halfLength=p.height/2+.1,halfWidth=.32*d.scale*d.width+.1,base=floorHeight(p.x,p.z);
 for(const along of [-1,-.5,0,.5,1])for(const across of [-1,0,1]){
  const localX=across*halfWidth,localZ=along*halfLength,x=p.x+localX*Math.cos(p.angle)+localZ*Math.sin(p.angle),z=p.z-localX*Math.sin(p.angle)+localZ*Math.cos(p.angle);
  if(!walkable(x,z,others)||Math.abs(floorHeight(x,z)-base)>.03)return false;
 }
 return true;
}
