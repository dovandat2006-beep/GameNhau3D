import {test} from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {ConnectionState,RoomEvent} from 'livekit-client';
import {TableVoice} from '../client/voice';
function fakeRoom(allowed=true){
 const events=new EventEmitter(),calls:boolean[]=[],participant={permissions:{canPublish:allowed},isMicrophoneEnabled:false,setMicrophoneEnabled:async(enabled:boolean)=>{calls.push(enabled);participant.isMicrophoneEnabled=enabled;}};
 const room=Object.assign(events,{state:ConnectionState.Connected,localParticipant:participant,activeSpeakers:[],disconnect:async()=>{room.state=ConnectionState.Disconnected;room.emit(RoomEvent.Disconnected);}});
 return {room:room as any,participant,calls};
}
test('PTT release during connection never opens the microphone after connection finishes',async()=>{
 const voice=new TableVoice(),f=fakeRoom();let finish!:()=>void;const connection=new Promise<void>(r=>{finish=r;});voice.connect=async()=>{await connection;voice.room=f.room;};
 const start=voice.mic(true);await voice.mic(false);finish();await start;assert.equal(f.calls.includes(true),false);
});
test('PTT waits for server permissions and release cancels a pending grant',async()=>{
 const voice=new TableVoice(),f=fakeRoom(false);voice.room=f.room;const start=voice.mic(true);await voice.mic(false);f.participant.permissions.canPublish=true;f.room.emit(RoomEvent.ParticipantPermissionsChanged);await start;assert.deepEqual(f.calls,[false]);
 const held=voice.mic(true);await held;assert.equal(f.participant.isMicrophoneEnabled,true);await voice.mic(false);assert.equal(f.participant.isMicrophoneEnabled,false);
});
test('release during microphone device setup leaves the microphone muted',async()=>{
 const voice=new TableVoice(),f=fakeRoom();voice.room=f.room;let ready!:()=>void;const device=new Promise<void>(r=>{ready=r;});
 f.participant.setMicrophoneEnabled=async(enabled:boolean)=>{f.calls.push(enabled);if(enabled)await device;f.participant.isMicrophoneEnabled=enabled;};
 const start=voice.mic(true);await Promise.resolve();await voice.mic(false);ready();await start;assert.equal(f.participant.isMicrophoneEnabled,false);assert.equal(f.calls.at(-1),false);
});
test('disconnect cancels a pending publish permission without opening the microphone',async()=>{
 const voice=new TableVoice(),f=fakeRoom(false);voice.room=f.room;const start=voice.mic(true);await voice.disconnect();await start;assert.equal(f.calls.includes(true),false);assert.equal(voice.room,null);
});
test('missing publish permission times out safely',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});const voice=new TableVoice(),f=fakeRoom(false);voice.room=f.room;const start=voice.mic(true);t.mock.timers.tick(5001);await assert.rejects(start,/cấp quyền/);assert.equal(f.calls.includes(true),false);
});
