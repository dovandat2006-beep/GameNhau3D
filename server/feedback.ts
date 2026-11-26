import {mkdir,open,readFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {feedbackSchema,feedbackEntrySchema,type FeedbackInput,type FeedbackEntry} from '../shared/feedback';
/** Canonical private append-only storage, independent of in-memory game rooms. */
export class FeedbackStore{
 readonly directory:string;readonly file:string;private pending:Promise<unknown>=Promise.resolve();
 constructor(directory=process.env.DATA_DIR||'data',readonly now=()=>Date.now()){this.directory=resolve(directory);this.file=join(this.directory,'feedback.jsonl');}
 save(input:FeedbackInput,context:{playerName:string;roomCode:string}):Promise<{id:string;createdAt:string}>{
  const value=feedbackSchema.parse(input),entry=feedbackEntrySchema.parse({...value,...context,id:randomUUID(),createdAt:new Date(this.now()).toISOString()});
  const task=this.pending.then(async()=>{
   await mkdir(this.directory,{recursive:true,mode:0o700});const handle=await open(this.file,'a',0o600);
   try{await handle.appendFile(JSON.stringify(entry)+'\n','utf8');await handle.sync();}finally{await handle.close();}
   return {id:entry.id,createdAt:entry.createdAt};
  });this.pending=task.catch(()=>{});return task;
 }
 async read():Promise<FeedbackEntry[]>{
  await this.pending;let content:string;try{content=await readFile(this.file,'utf8');}catch(e){if((e as NodeJS.ErrnoException).code==='ENOENT')return [];throw e;}
  return content.split('\n').filter(line=>line.trim()).map((line,i)=>{try{return feedbackEntrySchema.parse(JSON.parse(line));}catch{throw new Error(`Dữ liệu góp ý không hợp lệ ở dòng ${i+1}; bản gốc được giữ nguyên.`);}});
 }
}
