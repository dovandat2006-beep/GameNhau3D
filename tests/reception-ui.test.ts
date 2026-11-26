import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {Game} from '../server/game';
import {VoiceService} from '../server/voice';
import {RECEPTION} from '../shared/world';
const dom=new JSDOM('<!doctype html><html><body></body></html>',{url:'http://localhost:5173'});
Object.assign(globalThis,{window:dom.window,document:dom.window.document,HTMLElement:dom.window.HTMLElement,HTMLInputElement:dom.window.HTMLInputElement,Element:dom.window.Element,IS_REACT_ACT_ENVIRONMENT:true});
const React=await import('react'),{createRoot}=await import('react-dom/client'),{ReceptionPanel}=await import('../client/reception-panel'),{socket,targets}=await import('../client/network');

test('typing and sending reception questions keeps the panel mounted when scrolling returns a Promise',async()=>{
 const game=new Game(new VoiceService('','','')),joined=game.enter({mode:'create',profile:{name:'[TEST] Chat UI',color:'#547f75',avatar:0}},'ui');
 const self=joined.player;Object.assign(self,{x:RECEPTION.x+4,z:RECEPTION.z});targets.set(self.id,self);
 // Some DOM implementations return a scroll result. It must never become a React effect cleanup.
 const originalScroll=dom.window.Element.prototype.scrollIntoView,originalTimeout=socket.timeout;
 dom.window.Element.prototype.scrollIntoView=(()=>Promise.resolve()) as any;
 socket.timeout=(()=>({emit:(_event:string,data:any,ack:any)=>queueMicrotask(()=>ack(null,{ok:true,data:{reply:`Hạnh trả lời: ${data.text}`}}))})) as any;
 const host=document.createElement('div');document.body.append(host);const root=createRoot(host);
 try{
  await React.act(async()=>{root.render(React.createElement(ReceptionPanel,{self}));});
  const input=host.querySelector('input')!;assert.equal(input.disabled,false);
  const setter=Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype,'value')!.set!;
  await React.act(async()=>{setter.call(input,'WC ở đâu?');input.dispatchEvent(new dom.window.Event('input',{bubbles:true}));});
  assert.equal(host.querySelector<HTMLButtonElement>('button[aria-label="Gửi câu hỏi cho lễ tân"]')!.disabled,false);
  await React.act(async()=>{host.querySelector('form')!.dispatchEvent(new dom.window.Event('submit',{bubbles:true,cancelable:true}));});
  assert.match(host.textContent!,/Hạnh trả lời: WC ở đâu/);assert.ok(host.querySelector('form'),'chat remains mounted after reply');
  await React.act(async()=>{host.querySelector<HTMLButtonElement>('.reception-prompts button')!.click();});
  assert.match(host.textContent!,/Hạnh trả lời: Chào chị/);assert.ok(host.querySelector('form'),'second reply also survives effect cleanup');
 }finally{
  await React.act(async()=>root.unmount());host.remove();targets.delete(self.id);socket.timeout=originalTimeout;dom.window.Element.prototype.scrollIntoView=originalScroll;
 }
});

test('malformed or rejected replies show an error in place and the user can retry',async()=>{
 const game=new Game(new VoiceService('','','')),joined=game.enter({mode:'create',profile:{name:'[TEST] Retry',color:'#547f75',avatar:0}},'retry');
 const self=joined.player;Object.assign(self,{x:RECEPTION.x+4,z:RECEPTION.z});targets.set(self.id,self);
 const originalTimeout=socket.timeout;let result:any={ok:true,data:{reply:{bad:true}}};
 socket.timeout=(()=>({emit:(_event:string,_data:any,ack:any)=>queueMicrotask(()=>ack(null,result))})) as any;
 const host=document.createElement('div');document.body.append(host);const root=createRoot(host);
 try{
  await React.act(async()=>root.render(React.createElement(ReceptionPanel,{self})));
  await React.act(async()=>host.querySelector<HTMLButtonElement>('.reception-prompts button')!.click());
  assert.match(host.querySelector('[role=alert]')!.textContent!,/chưa gửi được câu trả lời/);assert.ok(host.querySelector('form'));
  result={ok:false,error:'Quầy đang bận, thử lại nhé.'};
  await React.act(async()=>host.querySelector<HTMLButtonElement>('.reception-prompts button')!.click());
  assert.match(host.querySelector('[role=alert]')!.textContent!,/Quầy đang bận/);
  result={ok:true,data:{reply:'Chào bạn, mình đã nhận được tin.'}};
  await React.act(async()=>host.querySelector<HTMLButtonElement>('.reception-prompts button')!.click());
  assert.equal(host.querySelector('[role=alert]'),null);assert.match(host.textContent!,/mình đã nhận được tin/);assert.ok(host.querySelector('form'));
 }finally{await React.act(async()=>root.unmount());host.remove();targets.delete(self.id);socket.timeout=originalTimeout;}
});

test('an unexpected UI exception leaves a reload screen instead of an empty root',async()=>{
 const {GameBoundary}=await import('../client/game-boundary');const errors:unknown[]=[];
 const host=document.createElement('div');document.body.append(host);const root=createRoot(host,{onCaughtError:e=>errors.push(e)});
 function Broken():never{throw new Error('Intentional UI test failure');}
 try{
  await React.act(async()=>root.render(React.createElement(GameBoundary,null,React.createElement(Broken))));
  assert.match(host.querySelector('[role=alert]')!.textContent!,/Giao diện vừa gặp lỗi/);assert.match(host.querySelector('button')!.textContent!,/Tải lại game/);assert.equal(errors.length,1);
 }finally{await React.act(async()=>root.unmount());host.remove();}
});

test('feedback form keeps the draft after a failed save and confirms only an acknowledged save',async()=>{
 const {FeedbackPanel}=await import('../client/feedback-panel'),originalTimeout=socket.timeout;let result:any={ok:false,error:'Chưa lưu được góp ý.'};const sent:any[]=[];
 socket.timeout=(()=>({emit:(_event:string,data:any,ack:any)=>{sent.push(data);queueMicrotask(()=>ack(null,result));}})) as any;
 const host=document.createElement('div');document.body.append(host);const root=createRoot(host);
 try{
  await React.act(async()=>root.render(React.createElement(FeedbackPanel)));
  assert.equal(host.querySelector<HTMLButtonElement>('button[type=submit]')!.disabled,false);
  const textarea=host.querySelector('textarea')!,setter=Object.getOwnPropertyDescriptor(dom.window.HTMLTextAreaElement.prototype,'value')!.set!,text='Mình bị kẹt khi đứng dậy ở bàn số 2.';
  await React.act(async()=>{const select=host.querySelector('select')!;select.value='bug';select.dispatchEvent(new dom.window.Event('change',{bubbles:true}));setter.call(textarea,text);textarea.dispatchEvent(new dom.window.Event('input',{bubbles:true}));});
  await React.act(async()=>host.querySelector('form')!.dispatchEvent(new dom.window.Event('submit',{bubbles:true,cancelable:true})));
  assert.equal(textarea.value,text);assert.match(host.querySelector('[role=alert]')!.textContent!,/Chưa lưu/);assert.equal(sent[0].category,'bug');assert.equal(sent[0].text,text);
  result={ok:true,data:{id:'f58b07d9-f1fb-419a-98db-6e0de203ce1c',createdAt:new Date().toISOString()}};
  await React.act(async()=>host.querySelector('form')!.dispatchEvent(new dom.window.Event('submit',{bubbles:true,cancelable:true})));
  assert.match(host.querySelector('[role=status]')!.textContent!,/Đã lưu góp ý/);assert.equal(host.querySelector('textarea'),null);assert.equal(sent.length,2);
 }finally{await React.act(async()=>root.unmount());host.remove();socket.timeout=originalTimeout;}
});

test('feedback submit stays clickable and explains empty or short text before sending at the minimum',async()=>{
 const {FeedbackPanel}=await import('../client/feedback-panel'),originalTimeout=socket.timeout,sent:any[]=[];
 socket.timeout=(()=>({emit:(_event:string,data:any,ack:any)=>{sent.push(data);queueMicrotask(()=>ack(null,{ok:true,data:{id:'f58b07d9-f1fb-419a-98db-6e0de203ce1c',createdAt:new Date().toISOString()}}));}})) as any;
 const host=document.createElement('div');document.body.append(host);const root=createRoot(host);
 try{
  await React.act(async()=>root.render(React.createElement(FeedbackPanel)));
  const textarea=host.querySelector('textarea')!,setter=Object.getOwnPropertyDescriptor(dom.window.HTMLTextAreaElement.prototype,'value')!.set!;
  for(const text of ['', '   ', 'thêm xe', '123456789']){
   await React.act(async()=>{setter.call(textarea,text);textarea.dispatchEvent(new dom.window.Event('input',{bubbles:true}));});
   const button=host.querySelector<HTMLButtonElement>('button[type=submit]')!;assert.equal(button.disabled,false);
   await React.act(async()=>button.click());
   assert.match(host.querySelector('[role=alert]')!.textContent!,new RegExp(`viết thêm ${10-text.trim().length} ký tự`));assert.equal(textarea.value,text);assert.equal(sent.length,0);
  }
  await React.act(async()=>{setter.call(textarea,'1234567890');textarea.dispatchEvent(new dom.window.Event('input',{bubbles:true}));});
  assert.equal(host.querySelector('[role=alert]'),null);assert.match(host.querySelector('#feedback-hint')!.textContent!,/Đủ độ dài/);
  await React.act(async()=>host.querySelector<HTMLButtonElement>('button[type=submit]')!.click());
  assert.equal(sent.length,1);assert.equal(sent[0].text,'1234567890');assert.match(host.querySelector('[role=status]')!.textContent!,/Đã lưu góp ý/);
 }finally{await React.act(async()=>root.unmount());host.remove();socket.timeout=originalTimeout;}
});
