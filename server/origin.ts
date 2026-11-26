import type {IncomingHttpHeaders} from 'node:http';

/** Same-origin polling requests may omit Origin; WebSocket handshakes include it. */
export function allowedSocketRequest(headers:IncomingHttpHeaders,origins:readonly string[]):boolean {
 if(headers.origin!==undefined)return origins.includes(headers.origin);
 // Browsers control Sec-Fetch-Site. Also require the request's actual host to
 // match a configured game origin; do not trust forwarded host headers here.
 if(headers['sec-fetch-site']!=='same-origin'||!headers.host)return false;
 return origins.some(origin=>new URL(origin).host.toLowerCase()===headers.host!.toLowerCase());
}
