import {io} from 'socket.io-client';
import type {Enter,Command} from '../shared/protocol';
import type {Result,RoomState,Player} from '../shared/world';
export const socket=io({autoConnect:false,reconnection:true,reconnectionDelay:700,reconnectionDelayMax:2500,timeout:7000});
export type Joined={state:RoomState;id:string;token:string;voiceConfigured:boolean};
export function request<T>(event:string,data?:unknown):Promise<T>{
 return new Promise((resolve,reject)=>{
  const callback=(err:Error|null,result:Result<T>)=>{if(err)reject(new Error('Máy chủ chưa phản hồi. Kiểm tra kết nối rồi thử lại.'));else if(result?.ok)resolve(result.data);else reject(new Error(result?.error||'Kết nối gặp lỗi.'));};
  if(data===undefined)socket.timeout(8000).emit(event,callback);else socket.timeout(8000).emit(event,data,callback);
 });
}
export const command=<T=unknown>(c:Command)=>request<T>('command',c);
export const enter=(data:Enter)=>request<Joined>('enter',data);
export const targets=new Map<string,Pick<Player,'x'|'z'|'angle'|'moving'>>();
export const visuals=new Map<string,{x:number;z:number;angle:number;moving:boolean}>();
export const controls={keys:new Set<string>(),joystick:{x:0,z:0},yaw:0,zoom:7.5,dragging:false,enabled:false,stageView:false,running:false};

export const netClock={offset:0,ready:false};
