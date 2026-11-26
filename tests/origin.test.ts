import {test} from 'node:test';
import assert from 'node:assert/strict';
import {allowedSocketRequest} from '../server/origin';
const origins=['http://localhost:5173','https://quan.example.com'];
test('accepts browser same-origin polling without an Origin header',()=>{
 assert.equal(allowedSocketRequest({host:'localhost:5173','sec-fetch-site':'same-origin'},origins),true);
 assert.equal(allowedSocketRequest({host:'quan.example.com','sec-fetch-site':'same-origin'},origins),true);
});
test('accepts configured explicit Origin for WebSocket and cross-origin dev requests',()=>{
 assert.equal(allowedSocketRequest({host:'127.0.0.1:3001',origin:'http://localhost:5173'},origins),true);
});
test('rejects foreign or null origins even if other headers look local',()=>{
 for(const origin of ['https://evil.example','null','http://localhost:9999'])assert.equal(allowedSocketRequest({host:'localhost:5173',origin,'sec-fetch-site':'same-origin'},origins),false);
});
test('missing Origin does not permit unknown hosts, cross-site, same-site or bare requests',()=>{
 assert.equal(allowedSocketRequest({host:'evil.example','sec-fetch-site':'same-origin'},origins),false);
 for(const site of ['cross-site','same-site','none',undefined])assert.equal(allowedSocketRequest({host:'localhost:5173','sec-fetch-site':site},origins),false);
 assert.equal(allowedSocketRequest({'sec-fetch-site':'same-origin','x-forwarded-host':'localhost:5173'},origins),false);
});
