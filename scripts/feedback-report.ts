import 'dotenv/config';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {FeedbackStore} from '../server/feedback';
import {renderFeedbackReport} from '../server/feedback-report';
const entries=await new FeedbackStore().read(),file=resolve('artifacts/gop-y-nguoi-choi.html');
await mkdir(resolve('artifacts'),{recursive:true});await writeFile(file,renderFeedbackReport(entries),'utf8');
console.log(`Đã tổng hợp ${entries.length} góp ý: ${file}`);
