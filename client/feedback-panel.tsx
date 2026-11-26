import {useState} from 'react';
import {Send,Check} from 'lucide-react';
import {FEEDBACK_CATEGORIES,FEEDBACK_LABELS,feedbackSchema,type FeedbackInput} from '../shared/feedback';
import {command} from './network';
export function FeedbackPanel(){
 const [category,setCategory]=useState<FeedbackInput['category']>('idea'),[text,setText]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[saved,setSaved]=useState('');
 const length=text.trim().length;
 async function send(e:React.FormEvent){
  e.preventDefault();if(busy)return;setError('');const input=feedbackSchema.safeParse({category,text});
  if(!input.success){setError(length<10?`Góp ý cần ít nhất 10 ký tự. Bạn viết thêm ${10-length} ký tự nhé.`:'Góp ý chỉ được tối đa 1.000 ký tự. Bạn rút gọn rồi gửi lại nhé.');return;}
  setBusy(true);try{
   const result=await command<{id:string;createdAt:string}>({type:'feedback',...input.data});
   if(!result||typeof result.id!=='string')throw new Error('Chưa nhận được xác nhận lưu góp ý. Bạn giữ lại nội dung và thử lại.');
   setSaved(result.id);setText('');
  }catch(e){setError(e instanceof Error?e.message:'Chưa gửi được góp ý. Bạn thử lại nhé.');}finally{setBusy(false);}
 }
 if(saved)return <div className="feedback-confirmation" role="status"><Check size={28}/><h3>Đã lưu góp ý của bạn</h3><p>Cảm ơn bạn giúp quán tốt hơn. Người phát triển có thể đọc góp ý này trong báo cáo riêng.</p><small>Mã góp ý: {saved.slice(0,8)}</small></div>;
 return <form className="feedback-form" onSubmit={send} noValidate><p className="modal-intro">Bạn muốn quán có thêm gì, hoặc gặp lỗi ở đâu? Góp ý gửi riêng cho người phát triển, không hiện trong chat quán.</p>
  <label htmlFor="feedback-category">Nhóm góp ý</label><select id="feedback-category" value={category} disabled={busy} onChange={e=>setCategory(e.target.value as FeedbackInput['category'])}>{FEEDBACK_CATEGORIES.map(c=><option key={c} value={c}>{FEEDBACK_LABELS[c]}</option>)}</select>
  <label htmlFor="feedback-text">Nội dung góp ý</label><textarea id="feedback-text" aria-describedby="feedback-hint" placeholder="Mô tả điều bạn muốn cải thiện. Nếu báo lỗi, kể các bước đã làm…" minLength={10} maxLength={1000} required value={text} disabled={busy} onChange={e=>{setText(e.target.value);setError('');}}/>
  <small id="feedback-hint">{length}/1.000 ký tự · {length<10?`Viết thêm ${10-length} ký tự để đủ tối thiểu 10.`:'Đủ độ dài để gửi.'} Lưu kèm biệt danh, mã quán và thời gian; không cần thông tin liên hệ.</small>
  {error&&<p className="feedback-error" role="alert">{error}</p>}
  <button className="primary full" type="submit" disabled={busy}><Send size={17}/>{busy?'Đang lưu góp ý…':'Gửi góp ý'}</button>
 </form>;
}
