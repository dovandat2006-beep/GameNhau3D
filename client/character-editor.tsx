import {lazy,Suspense} from 'react';
import {CHARACTERS,FACES,COLORS,type Appearance} from '../shared/appearance';
const AvatarPreview=lazy(()=>import('./avatar-preview'));
export function CharacterEditor({value,onChange}:{value:Appearance;onChange:(a:Appearance)=>void}){
 const change=(patch:Partial<Appearance>)=>onChange({...value,...patch});
 return <div className="character-editor">
  <Suspense fallback={<div className="avatar-preview">Đang dựng nhân vật…</div>}><AvatarPreview appearance={value}/></Suspense>
  <label>Mẫu nhân vật<select value={value.avatar} onChange={e=>change({avatar:Number(e.target.value)})}>{CHARACTERS.map((c,i)=><option key={c.name} value={i}>{c.name} · {c.gender}</option>)}</select></label>
  <label>Khuôn mặt<select value={value.face} onChange={e=>change({face:Number(e.target.value)})}>{FACES.map((f,i)=><option key={f.name} value={i}>{f.name}</option>)}</select></label>
  <label>Chiều cao <output>{value.height.toFixed(2)} m</output><input type="range" min="1" max="2" step=".01" value={value.height} onChange={e=>change({height:Number(e.target.value)})}/></label>
  <label>Cân nặng <output>{value.weight} kg</output><input type="range" min="40" max="150" step="1" value={value.weight} onChange={e=>change({weight:Number(e.target.value)})}/></label>
  <div className="shirt-colors" role="group" aria-label="Màu áo">{COLORS.map((c,i)=><button key={c} aria-label={`Màu áo ${['đỏ gạch','xanh rêu','vàng','xanh dương','hồng','kem'][i]}`} aria-pressed={value.color===c} className={value.color===c?'selected':''} style={{background:c}} onClick={()=>change({color:c})}/>)}</div>
 </div>;
}
