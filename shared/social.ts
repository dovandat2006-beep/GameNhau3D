export const GESTURES=['cheers','wave','clap','nod','shake','smoke','vomit'] as const;
export type Gesture=typeof GESTURES[number]|'invite';
export const DANCE_STYLES=['shuffle','disco','robot','sway','hiphop','krump','runningman'] as const;
export type DanceStyle=typeof DANCE_STYLES[number];
export const DANCES:Record<DanceStyle,{name:string;description:string}>={
 shuffle:{name:'Shuffle',description:'Đổi chân, lướt bước'},disco:{name:'Disco',description:'Chỉ tay theo nhịp'},
 hiphop:{name:'Hiphop',description:'Nhún sâu, bật chân, đánh tay theo nhịp'},
 krump:{name:'Krump',description:'Dậm chân, bật ngực, tung tay mạnh'},
 runningman:{name:'Running Man',description:'Kéo chân, nâng gối, đánh tay đối nhịp'},
 robot:{name:'Robot',description:'Khóa nhịp, đổi hướng'},sway:{name:'Lắc lư',description:'Nhún gối, đưa vai'},
};
export const STAGE={x:0,z:-12,w:16,d:8,height:.45};
export const STAGE_RAMPS=[
 {x:STAGE.x-STAGE.w/2-3.5,z:STAGE.z,w:3.5,d:3,up:1},
 {x:STAGE.x+STAGE.w/2,z:STAGE.z,w:3.5,d:3,up:-1},
];
// Rear-corner equipment leaves the performance floor and both approaches open.
export const STAGE_SPEAKERS=[-1,1].map(side=>({x:STAGE.x+side*(STAGE.w/2-.6),z:STAGE.z-STAGE.d/2+.6,w:.9,d:.7}));
export const STAGE_AUDIENCE_RADIUS=48;
export const STAGE_BPM=120;
export function onStage(p:{x:number;z:number}){return Math.abs(p.x-STAGE.x)<=STAGE.w/2&&Math.abs(p.z-STAGE.z)<=STAGE.d/2;}
export function floorHeight(x:number,z:number){
 if(onStage({x,z}))return STAGE.height;
 for(const r of STAGE_RAMPS)if(x>=r.x&&x<=r.x+r.w&&Math.abs(z-r.z)<=r.d/2){const t=(x-r.x)/r.w;return (r.up===1?t:1-t)*STAGE.height;}
 return 0;
}
export function stageWaypoint(p:{x:number;z:number}){
 if(floorHeight(p.x,p.z)>0)return {x:STAGE.x,z:STAGE.z};
 const points=STAGE_RAMPS.map(r=>({x:r.up===1?r.x+.3:r.x+r.w-.3,z:r.z}));
 return points.sort((a,b)=>Math.hypot(p.x-a.x,p.z-a.z)-Math.hypot(p.x-b.x,p.z-b.z))[0];
}
export const MAX_DRUNK_LEVEL=10;
export const MAX_INTOXICATION=32;
export const SOBER_INTERVAL_MS=60_000;
export function drunkLevel(cups:number){return !Number.isFinite(cups)||cups<5?0:Math.min(MAX_DRUNK_LEVEL,1+Math.floor((cups-5)/3));}
// Alcohol load is separate from the lifetime drink count. One quiet minute removes one level.
export function recoveredIntoxication(value:number,nextAt:number,now:number){
 if(!value||!nextAt||now<nextAt)return {intoxication:value,soberAt:nextAt};
 const steps=1+Math.floor((now-nextAt)/SOBER_INTERVAL_MS),remaining=Math.max(0,value-steps*3);
 const intoxication=remaining<5?0:remaining;
 return {intoxication,soberAt:intoxication?nextAt+steps*SOBER_INTERVAL_MS:0};
}
export function gestureDuration(emote:Gesture){return emote==='cheers'?3600:emote==='wave'?2400:emote==='invite'?2000:emote==='smoke'?4800:emote==='vomit'?4200:2200;}
export type DanceBattle={id:string;challenger:string;opponent:string;status:'invited'|'running'|'finished'|'cancelled';endsAt:number;votes:[number,number];winner:string|null;reason:string};
export type StageState={epoch:number;battle:DanceBattle|null};
