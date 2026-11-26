import {useEffect,useState} from 'react';
import {Beer,Hand,Music,Pause,Users,Flag,Check,RotateCcw} from 'lucide-react';
import {TABLES,type Player,type RoomState} from '../shared/world';
import {DANCES,DANCE_STYLES,STAGE,STAGE_AUDIENCE_RADIUS,SOBER_INTERVAL_MS,onStage,drunkLevel,type DanceStyle} from '../shared/social';
import type {Command} from '../shared/protocol';
import {controls,netClock,targets} from './network';

type Props={mode:'social'|'stage';state:RoomState;self:Player;busy:boolean;act:(command:Command)=>Promise<boolean>;reduced:boolean};
export function SocialPanel({mode,state,self,busy,act,reduced}:Props){
 const [now,setNow]=useState(Date.now()),[voted,setVoted]=useState('');
 useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),250);return()=>clearInterval(timer);},[]);
 const me=targets.get(self.id)||self,atStage=onStage(me),level=drunkLevel(self.intoxication),battle=state.stage.battle;
 const nearest=TABLES.map(t=>({...t,distance:Math.hypot(me.x-t.x,me.z-t.z)})).sort((a,b)=>a.distance-b.distance)[0];
 const people=state.players.filter(p=>p.connected&&onStage(targets.get(p.id)||p)&&!p.seat);
 const name=(id:string)=>state.players.find(p=>p.id===id)?.name||'Bạn cùng quán';
 const remaining=battle?Math.max(0,Math.ceil((battle.endsAt-now-netClock.offset)/1000)):0;
 return <div className="social-panel-content">
  {mode==='social'?<>
   <p className="panel-intro">Cầm cốc ở gần bàn hoặc quầy rồi đi mời bạn bè. Di chuyển sẽ hủy động tác uống đang dở, không cộng cốc.</p>
   <div className="carry-controls"><button className="primary full" disabled={busy} onClick={()=>act({type:'carry',enabled:!self.carryingBeer})}><Beer size={18}/>{self.carryingBeer?'Cất cốc':'Cầm cốc đi giao lưu'}</button>
    {self.carryingBeer&&!self.seat&&<button className="secondary full" disabled={busy||nearest.distance>4.5} onClick={()=>act({type:'invite',table:nearest.id})}><Users size={17}/>Mời bàn {nearest.id}{nearest.distance>4.5?' · đến gần hơn':''}</button>}
   </div>
   <button className="secondary full" disabled={busy||!!self.seat||self.carryingBeer} onClick={()=>act({type:'lie',enabled:!self.lying})}>{self.lying?(level===10?'Bò tiếp':'Đứng dậy'):'Nằm nghỉ'}</button>
   {(self.seat||self.carryingBeer)&&<p className="small muted">Đứng dậy khỏi ghế và cất cốc trước khi nằm.</p>}
   {self.lying&&<p className="small muted">Đang nằm nghỉ. Nhấn di chuyển hoặc Đứng dậy để dậy.</p>}
   <h3 className="social-section-title">Chào nhau một chút</h3>
   <div className="gesture-grid">{([{id:'wave',name:'Vẫy tay'},{id:'clap',name:'Vỗ tay'},{id:'nod',name:'Gật đầu'},{id:'shake',name:'Lắc đầu'},{id:'smoke',name:'Hút thuốc lá ảo'},{id:'vomit',name:'Nôn · Say cấp 5+'}] as const).map(g=><button key={g.id} disabled={busy||self.lying||((g.id==='clap'||g.id==='smoke'||g.id==='vomit')&&self.carryingBeer)||(g.id==='vomit'&&level<5)||(level===10&&!self.seat&&g.id!=='vomit')} title={g.id==='vomit'&&level<5?'Cần say từ cấp 5 trở lên':(g.id==='clap'||g.id==='smoke'||g.id==='vomit')&&self.carryingBeer?'Cất cốc trước khi dùng cử chỉ này':''} onClick={()=>act({type:'emote',emote:g.id})}><Hand size={20}/>{g.name}</button>)}</div>
   <div className="tipsy-summary"><strong>{self.beerCount} cốc bia ảo · {level?`Say ${level}/10${level===10?self.seat?' · Ngồi nghỉ':' · Chỉ có thể bò':''}`:'Chưa có hiệu ứng say'}</strong><p>Bắt đầu đỏ mặt ở mức 1; mức 2–9 đi loạng choạng tăng dần, mức 10 bò chậm. Bắt đầu sau 5 cốc, mỗi 3 cốc thêm một mức, tối đa 10. Không uống thêm: giảm một mức mỗi {SOBER_INTERVAL_MS/1000} giây. Số cốc vẫn là tổng đã uống; mức say tính lượng còn lại sau hồi phục.</p>{self.intoxication>0&&<small>Còn {Math.max(0,Math.ceil((self.soberAt-now-netClock.offset)/1000))} giây để hồi phục tiếp.</small>}<button className="text-button" disabled={busy||!self.beerCount} onClick={()=>act({type:'sober'})}><RotateCcw size={14}/>Đặt lại hiệu ứng say</button>{reduced&&<small>Giảm chuyển động đang bật: hạn chế lắc lư và đèn nháy.</small>}</div>
  </>:<>
   <p className="panel-intro">Sân khấu ở cuối sân, phía sau tất cả các bàn. Có hai dốc lên ở hai bên trái và phải. Cất cốc trước khi nhảy; ai cũng có thể tham gia.</p>
   {self.seat&&<button className="secondary full" onClick={()=>{controls.stageView=!controls.stageView;setNow(Date.now());}}><Music size={18}/>{controls.stageView?'Trở lại góc nhìn nhân vật':'Xem sân khấu từ ghế'}</button>}
   <div className="stage-summary"><Music size={22}/><div><strong>{atStage?'Bạn đang trên sân khấu':`Cách sân khấu ${Math.round(Math.hypot(me.x-STAGE.x,me.z-STAGE.z))} bước`}</strong><small>{people.length} bạn trên sân khấu · 120 BPM</small></div></div>
  </>}
  <h3 className="social-section-title">Chọn điệu nhảy</h3>
  {(self.seat||self.carryingBeer)&&<p className="small muted">{self.seat?'Đứng dậy để nhảy.':'Cất cốc để nhảy bằng cả hai tay.'}</p>}
  <div className="dance-list">{DANCE_STYLES.map(style=><button key={style} disabled={busy||!!self.seat||self.carryingBeer||level===10||self.lying} className={self.dance===style?'selected':''} onClick={()=>act({type:'dance',style})}><Music size={20}/><span><strong>{DANCES[style].name}</strong><small>{DANCES[style].description}</small></span>{self.dance===style&&<Check size={17}/>}</button>)}</div>
  {self.dance&&<button className="secondary full" disabled={busy} onClick={()=>act({type:'dance',style:'stop'})}><Pause size={16}/>Dừng nhảy</button>}
  {mode==='stage'&&<section className="dance-battle"><h3 className="social-section-title">So tài 20 giây</h3>
   {battle&&['invited','running'].includes(battle.status)?<>
    <p className="battle-pair"><strong>{name(battle.challenger)}</strong><span>cùng</span><strong>{name(battle.opponent)}</strong></p>
    <div className="battle-clock">{remaining}s <small>{battle.status==='invited'?'chờ nhận lời':'còn lại để nhảy & bình chọn'}</small></div>
    {battle.status==='invited'?<>{battle.opponent===self.id?<div className="battle-buttons"><button className="primary" disabled={busy} onClick={()=>act({type:'battle',action:'accept'})}>Nhận lời</button><button className="secondary" disabled={busy} onClick={()=>act({type:'battle',action:'decline'})}>Bỏ qua</button></div>:battle.challenger===self.id?<button className="secondary full" disabled={busy} onClick={()=>act({type:'battle',action:'decline'})}>Hủy lời mời</button>:<p className="small muted">Đang chờ {name(battle.opponent)} nhận lời.</p>}</>:<div className="battle-votes">{[battle.challenger,battle.opponent].map((id,i)=><button key={id} disabled={busy||[battle.challenger,battle.opponent].includes(self.id)||voted===battle.id} onClick={async()=>{if(await act({type:'battle',action:'vote',target:id}))setVoted(battle.id);}}><Flag size={16}/><span>{name(id)}</span><strong>{battle.votes[i]}</strong></button>)}</div>}
   </>:<>
    {battle&&<p className="battle-result">{battle.status==='finished'&&battle.winner?`${name(battle.winner)} được khán giả chọn!`:battle.reason}</p>}
    {!atStage?<p className="small muted">Lên sân khấu để mời một bạn so tài.</p>:people.filter(p=>p.id!==self.id&&!p.carryingBeer).length?<div className="opponents">{people.filter(p=>p.id!==self.id&&!p.carryingBeer).map(p=><button key={p.id} className="secondary full" disabled={busy||self.carryingBeer||!!battle&&battle.endsAt>now+netClock.offset} onClick={()=>act({type:'battle',action:'challenge',target:p.id})}><Users size={16}/>Rủ {p.name} so tài</button>)}</div>:<p className="small muted">Chưa có bạn khác sẵn sàng trên sân khấu. Rủ bạn bè lên nhảy cùng nhé.</p>}
   </>}
   <p className="small muted battle-rules">Khán giả trong {STAGE_AUDIENCE_RADIUS} bước được chọn một lần mỗi lượt. Người dự thi không tự bình chọn. Rời sân khấu hoặc dừng nhảy sẽ hủy lượt.</p>
  </section>}
 </div>;
}
