import {useMemo,useRef,useEffect} from 'react';
import {useFrame} from '@react-three/fiber';
import * as THREE from 'three';
import {AVATAR_PARTS,AvatarRig,STRIDE_METRES,RUN_STRIDE_METRES} from './avatar';
import {CHEERS_MS,WAVE_MS,movementSpeed,type Player} from '../shared/world';
import {floorHeight,gestureDuration,drunkLevel,type Gesture} from '../shared/social';
import {CHARACTERS,avatarDimensions,type Appearance} from '../shared/appearance';
import {targets,visuals,netClock} from './network';
import {limbGeometry,limbMaterial,type LimbName} from './limbs';
const limbNames:LimbName[]=['armL','armR','legL','legR'];

export type AvatarActor=Pick<Player,'id'|'avatar'|'face'|'height'|'weight'|'color'|'x'|'z'|'angle'|'moving'|'running'|'lying'|'joinedAt'|'seat'|'intoxication'|'carryingBeer'|'emote'|'emoteUntil'|'dance'|'danceStartedAt'>;
export const IDLE_ACTOR={moving:false,running:false,lying:false,joinedAt:0,seat:null,intoxication:0,carryingBeer:false,emote:'',emoteUntil:0,dance:null,danceStartedAt:0} as const;
type Walk={phase:number;weight:number};
export function Avatars({players,reduced,me,quality,preview=false}:{players:AvatarActor[];reduced:boolean;me:string|null;quality:string;preview?:boolean}){
 const localVisuals=useRef(new Map<string,{x:number;z:number;angle:number;moving:boolean}>());
 const refs=useRef<Record<string,THREE.InstancedMesh>>({}),walk=useRef(new Map<string,Walk>()),frame=useRef(0);
 const rig=useMemo(()=>new AvatarRig(),[]),root=useMemo(()=>new THREE.Object3D(),[]),matrix=useMemo(()=>new THREE.Matrix4(),[]),color=useMemo(()=>new THREE.Color(),[]);
 const zero=useMemo(()=>new THREE.Vector3(0,0,0),[]);
 const limbAssets=useMemo(()=>{const arm=limbMaterial(true),leg=limbMaterial(false);return Object.fromEntries(limbNames.map(name=>[name,{geometry:limbGeometry(),...(name.startsWith('arm')?arm:leg)}])) as Record<LimbName,ReturnType<typeof limbMaterial>&{geometry:THREE.BufferGeometry}>;},[]);
 const limbColors=useMemo(()=>({skin:new THREE.Color(),shirt:new THREE.Color(),pants:new THREE.Color('#404c4b')}),[]);
 const materials=useMemo(()=>({
  vomit:new THREE.MeshStandardMaterial({color:'#a2a15d',roughness:.8}),
  paper:new THREE.MeshStandardMaterial({color:'#e1d4b8',roughness:.9}),ember:new THREE.MeshStandardMaterial({color:'#a8562e',emissive:'#a83d1d',emissiveIntensity:.5}),
  smoke:new THREE.MeshBasicMaterial({color:'#d8d6cd',transparent:true,opacity:.22,depthWrite:false}),
  shirt:new THREE.MeshStandardMaterial({color:'#ffffff',roughness:.9}),pants:new THREE.MeshStandardMaterial({color:'#404c4b',roughness:.96}),
  skin:new THREE.MeshStandardMaterial({color:'#ffffff',roughness:.68}),hair:new THREE.MeshStandardMaterial({color:'#ffffff',roughness:.88}),
  blush:new THREE.MeshStandardMaterial({color:'#cc776a',transparent:true,opacity:.6,roughness:.8}),spark:new THREE.MeshStandardMaterial({color:'#e3bc70',emissive:'#775419',emissiveIntensity:.2,roughness:.6}),
  mouth:new THREE.MeshStandardMaterial({color:'#8c5148',roughness:.76}),
  eye:new THREE.MeshStandardMaterial({color:'#202925',roughness:.3}),shoe:new THREE.MeshStandardMaterial({color:'#65523b',roughness:.73}),
  glass:quality==='low'?new THREE.MeshStandardMaterial({color:'#e0f0e9',transparent:true,opacity:.32,roughness:.12,depthWrite:false}):new THREE.MeshPhysicalMaterial({color:'#f0f6e8',transmission:.7,thickness:.025,roughness:.09,ior:1.46,transparent:true,opacity:.72,depthWrite:false}),
  beer:new THREE.MeshStandardMaterial({color:'#d7a332',roughness:.26,metalness:.04}),foam:new THREE.MeshStandardMaterial({color:'#fcf4dc',roughness:.82}),
 }),[quality]);
 useEffect(()=>()=>{for(const material of Object.values(materials))material.dispose();},[materials]);
 useEffect(()=>()=>{const dispose=new Set<THREE.Material>();for(const asset of Object.values(limbAssets)){asset.geometry.dispose();dispose.add(asset.material);dispose.add(asset.depth);}for(const material of dispose)material.dispose();},[limbAssets]);
 useFrame(({clock},dt)=>{
  frame.current++;const positions=preview?localVisuals.current:visuals,viewer=me?positions.get(me):null,now=Date.now()+netClock.offset;
  const ids=new Set(players.map(p=>p.id));for(const id of walk.current.keys())if(!ids.has(id))walk.current.delete(id);
  for(let i=0;i<players.length;i++){
   const p=players[i],target=preview?p:targets.get(p.id)||p,distant=!!viewer&&Math.hypot(target.x-viewer.x,target.z-viewer.z)>22;
   if(distant&&frame.current%4!==0)continue;
   const elapsed=dt*(distant?4:1);let v=positions.get(p.id);if(!v){v={...target};positions.set(p.id,v);}
   let gait=walk.current.get(p.id);if(!gait){gait={phase:(p.joinedAt%700)/700*Math.PI*2,weight:0};walk.current.set(p.id,gait);}
   const oldX=v.x,oldZ=v.z,teleport=Math.hypot(v.x-target.x,v.z-target.z)>5;
   const k=p.seat||teleport?1:1-Math.exp(-14*elapsed);
   v.x=THREE.MathUtils.lerp(v.x,target.x,k);v.z=THREE.MathUtils.lerp(v.z,target.z,k);v.moving=target.moving;
   v.angle+=Math.atan2(Math.sin(target.angle-v.angle),Math.cos(target.angle-v.angle))*k;
   const distance=Math.hypot(v.x-oldX,v.z-oldZ);
   if(!p.seat&&!teleport)gait.phase+=distance/(drunkLevel(p.intoxication)===10?.75:p.running?RUN_STRIDE_METRES:STRIDE_METRES)*Math.PI*2;
   const moving=p.seat||teleport?0:Math.min(1,distance/Math.max(.001,elapsed)/movementSpeed(p.intoxication,p.running));
   gait.weight=THREE.MathUtils.damp(gait.weight,moving,12,elapsed);
   rig.sample({phase:gait.phase,motion:gait.weight,seated:!!p.seat,cheers:p.emote==='cheers'?(now-p.emoteUntil+CHEERS_MS)/1000:null,wave:p.emote==='wave'?(now-p.emoteUntil+WAVE_MS)/1000:null,time:clock.elapsedTime,avatar:p.avatar,face:p.face,running:p.running,lying:p.lying,reduced:reduced||distant,carry:p.carryingBeer,intoxication:p.intoxication,gesture:p.emote as Gesture,gestureTime:(now-p.emoteUntil+gestureDuration(p.emote as Gesture))/1000,dance:p.dance,danceTime:(now-p.danceStartedAt)/1000});
   const dimensions=avatarDimensions(p);
   root.position.set(v.x,(preview?0:floorHeight(v.x,v.z))+(p.seat?dimensions.seatOffset:0),v.z);root.rotation.set(0,v.angle,0);root.scale.set(dimensions.scale*dimensions.width,dimensions.scale,dimensions.scale*dimensions.depth);root.updateMatrix();
   for(const part of AVATAR_PARTS){
    matrix.multiplyMatrices(root.matrix,rig.matrices[part.key]);
    if(distant&&['eyeL','eyeR','nose'].includes(part.key))matrix.scale(zero);
    const mesh=refs.current[part.key];if(!mesh)continue;mesh.setMatrixAt(i,matrix);
    if(part.material==='shirt'||part.material==='skin'||part.material==='hair'){
     color.set(part.material==='shirt'?p.color:part.material==='hair'?CHARACTERS[p.avatar].hairColor:CHARACTERS[p.avatar].skin);mesh.setColorAt(i,color);
    }
   }
   limbColors.skin.set(CHARACTERS[p.avatar].skin);limbColors.shirt.set(p.color);
   for(const name of limbNames){
    const mesh=refs.current[name];if(!mesh)continue;mesh.setMatrixAt(i,root.matrix);
    const geometry=limbAssets[name].geometry,joints=rig.limbs[name];
    for(const [attribute,point] of [['limbStart',joints.start],['limbJoint',joints.joint],['limbEnd',joints.end]] as const)(geometry.getAttribute(attribute) as THREE.InstancedBufferAttribute).setXYZ(i,point.x,point.y,point.z);
    const cloth=name.startsWith('arm')?limbColors.shirt:limbColors.pants;
    (geometry.getAttribute('limbSkin') as THREE.InstancedBufferAttribute).setXYZ(i,limbColors.skin.r,limbColors.skin.g,limbColors.skin.b);
    (geometry.getAttribute('limbCloth') as THREE.InstancedBufferAttribute).setXYZ(i,cloth.r,cloth.g,cloth.b);
   }
  }
  for(const asset of Object.values(limbAssets))for(const name of ['limbStart','limbJoint','limbEnd','limbSkin','limbCloth'])asset.geometry.getAttribute(name).needsUpdate=true;
  for(const mesh of Object.values(refs.current)){mesh.count=players.length;mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;}
 });
 return <>{AVATAR_PARTS.map(part=><instancedMesh key={part.key} ref={m=>{if(m)refs.current[part.key]=m;}} args={[part.geometry,materials[part.material],100]} frustumCulled={false} castShadow={!['glass','beer','foam','spark','blush','smoke','ember'].includes(part.material)}/>)}{limbNames.map(name=><instancedMesh key={name} ref={mesh=>{if(mesh)refs.current[name]=mesh;}} args={[limbAssets[name].geometry,limbAssets[name].material,100]} customDepthMaterial={limbAssets[name].depth} frustumCulled={false} castShadow receiveShadow/>)}</>;
}
