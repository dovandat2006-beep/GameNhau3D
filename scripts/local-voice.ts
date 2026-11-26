import {readFile,writeFile,mkdir,chmod} from 'node:fs/promises';
import {randomBytes} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {parse} from 'dotenv';
if(process.platform!=='darwin')throw new Error('Lệnh này dành cho Mac. Linux dùng compose.yaml hoặc cấu hình LiveKit theo docs/DEPLOYMENT.md.');
if(spawnSync('livekit-server',['--version'],{stdio:'ignore'}).status!==0){
 const installed=spawnSync('brew',['install','livekit'],{stdio:'inherit',env:{...process.env,HOMEBREW_NO_AUTO_UPDATE:'1'}});
 if(installed.status!==0)throw new Error('Cài LiveKit bằng Homebrew trước: brew install livekit');
}
const text=await readFile('.env','utf8').catch(()=>''),env=parse(text),url=env.LIVEKIT_URL||'';
if(url&&!/^ws:\/\/(localhost|127\.0\.0\.1):7880\/?$/.test(url))throw new Error('Đang có URL LiveKit khác. Giữ cấu hình đó; local setup chỉ dùng cho localhost.');
await mkdir('.runtime',{recursive:true,mode:0o700});await writeFile('.runtime/.env.before-voice',text,{mode:0o600,flag:'wx'}).catch(e=>{if(e.code!=='EEXIST')throw e;});
const key='qndhlocal',secret=env.LIVEKIT_API_KEY===key&&env.LIVEKIT_API_SECRET?.length>=32?env.LIVEKIT_API_SECRET:randomBytes(32).toString('hex');
const config=`port: 7880\nbind_addresses: [127.0.0.1]\nrtc:\n  tcp_port: 7881\n  udp_port: 7882\n  node_ip: 127.0.0.1\n  use_external_ip: false\nkeys:\n  ${JSON.stringify(key)}: ${JSON.stringify(secret)}\nroom:\n  auto_create: true\n  max_participants: 6\n  empty_timeout: 60\n  departure_timeout: 20\nwebhook:\n  api_key: ${JSON.stringify(key)}\n  urls: [http://127.0.0.1:3001/api/livekit/webhook]\nlogging:\n  level: info\n`;
await writeFile('deploy/livekit.local.yaml',config,{mode:0o600});await chmod('deploy/livekit.local.yaml',0o600);
const values:Record<string,string>={LIVEKIT_URL:'ws://127.0.0.1:7880',LIVEKIT_API_KEY:key,LIVEKIT_API_SECRET:secret,LIVEKIT_WEBHOOK_ENABLED:'true'};
let updated=text;for(const [name,value] of Object.entries(values)){const pattern=new RegExp(`^${name}=.*$`,'m');updated=pattern.test(updated)?updated.replace(pattern,`${name}=${value}`):updated.trimEnd()+`\n${name}=${value}\n`;}
await writeFile('.env',updated,{mode:0o600});await chmod('.env',0o600);
console.log('Đã cấu hình LiveKit native local. npm run dev sẽ chạy game + voice; mở game bằng localhost để dùng micro. Key chỉ lưu trong các tệp cấu hình riêng.');
