import {useEffect,useRef,useState} from 'react';
import {MessageCircle,Send} from 'lucide-react';
import {RECEPTION,type Player} from '../shared/world';
import {command,controls,targets} from './network';
export function ReceptionPanel({self}:{self:Player}){
 const [distance,setDistance]=useState(100),[messages,setMessages]=useState<{speaker:string;text:string}[]>([]),[text,setText]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const log=useRef<HTMLDivElement>(null);
 useEffect(()=>{const update=()=>{const p=targets.get(self.id)||self;setDistance(Math.hypot(p.x-RECEPTION.x,p.z-RECEPTION.z));};update();const timer=setInterval(update,200);return()=>clearInterval(timer);},[self.id,self.x,self.z]);
 useEffect(()=>{const element=log.current;if(element)element.scrollTop=element.scrollHeight;},[messages,busy]);
 const near=distance<=5.5&&!self.seat&&!self.lying;
 async function send(value:string){
  const question=value.trim();if(busy||!question)return;
  if(!near){setError('Bạn đã đi xa quầy. Đến gần lễ tân rồi gửi lại nhé.');return;}
  setBusy(true);setError('');setMessages(m=>[...m,{speaker:'Bạn',text:question}].slice(-24));
  try{
   const response=await command<{reply:string}>({type:'reception',text:question});
   if(!response||typeof response.reply!=='string')throw new Error('Lễ tân chưa gửi được câu trả lời. Bạn thử lại nhé.');
   setMessages(m=>[...m,{speaker:'Hạnh · NPC',text:response.reply}].slice(-24));setText('');
  }catch(e){setError(e instanceof Error?e.message:'Chưa gửi được câu hỏi. Bạn thử lại nhé.');}
  finally{setBusy(false);}
 }
 return <div className="reception-panel"><p className="panel-intro">Hạnh là lễ tân NPC, trả lời theo kịch bản về quán. Câu chuyện này chỉ hiện cho bạn.</p>
  {!near?<p className="reception-distance">{self.lying?'Dậy trước khi trò chuyện với lễ tân.':self.seat?'Đứng dậy và đến gần quầy lễ tân để trò chuyện.':`Đến gần quầy lễ tân bên trái cổng để trò chuyện · còn ${Math.round(distance)} bước.`}</p>:<p className="small muted">Hạnh sẵn sàng giúp bạn tìm một chỗ ngồi.</p>}
  <div className="reception-log" ref={log} role="log" aria-live="polite">{messages.length?messages.map((m,i)=><p key={i}><strong>{m.speaker}</strong><span>{m.text}</span></p>):<p className="small muted">Bấm “Chào chị” để bắt đầu.</p>}{busy&&<p role="status">Hạnh đang trả lời…</p>}</div>
  <div className="reception-prompts">{['Chào chị','Bàn nào còn chỗ?','WC ở đâu?','Sân khấu ở đâu?'].map(q=><button className="secondary" key={q} disabled={!near||busy} onClick={()=>send(q)}><MessageCircle size={14}/>{q}</button>)}</div>
  <form className="reception-input" onSubmit={e=>{e.preventDefault();void send(text);}}><label htmlFor="reception-text">Hỏi lễ tân</label><div><input id="reception-text" value={text} maxLength={160} placeholder="Hỏi về quán…" disabled={!near||busy} onFocus={()=>{controls.keys.clear();controls.running=false;}} onChange={e=>setText(e.target.value)}/><button className="primary" aria-label="Gửi câu hỏi cho lễ tân" disabled={!near||busy||!text.trim()}><Send size={17}/></button></div></form>
  {error&&<p role="alert" className="reception-error">{error}</p>}
 </div>;
}
