import 'dotenv/config';
import {existsSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {concurrently} from 'concurrently';
const commands=[{name:'server',command:'node --import tsx server/index.ts'},{name:'web',command:'vite --host 0.0.0.0'}];
const local=/^ws:\/\/(localhost|127\.0\.0\.1):7880\/?$/.test(process.env.LIVEKIT_URL||'');
if(local&&process.env.LIVEKIT_WEBHOOK_ENABLED==='true'&&existsSync('deploy/livekit.local.yaml')){
 if(spawnSync('livekit-server',['--version'],{stdio:'ignore'}).status===0)commands.push({name:'voice',command:'livekit-server --config deploy/livekit.local.yaml'});
 else console.log('Chưa có LiveKit native. Chạy npm run voice:local trên Mac hoặc cấu hình dịch vụ LiveKit theo README.');
}
try{await concurrently(commands,{killOthersOn:['success','failure']}).result;}catch{process.exitCode=1;}
