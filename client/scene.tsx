import React,{useMemo,useRef,useEffect,Suspense} from 'react';
import {Canvas,useFrame,useThree} from '@react-three/fiber';
import {Html,Environment,Lightformer} from '@react-three/drei';
import {Avatars} from './avatars';
import {avatarDimensions} from '../shared/appearance';
import {Stage} from './stage';
import {floorHeight,STAGE,stageWaypoint,drunkLevel} from '../shared/social';
import {audio} from './audio';
import {plasticMaterial} from './materials';
import {Box,Cylinder,Sign,boxGeo,sphereGeo,cylinderGeo,material} from './scenery';
import {Venue} from './venue';
import * as THREE from 'three';
import {TABLES,MENU,AWNING_POSTS,seatPosition,type Player,type RoomState} from '../shared/world';
import {controls,targets,visuals,socket,netClock} from './network';
const palette={wall:'#d9af71',trim:'#654a36',roof:'#5a7772',ground:'#8d8980',street:'#565e60',steel:'#b8c7c3',red:'#a84437',green:'#426f64',skin:'#e9b789',hair:'#3c302c',night:'#233f4b'};
const leafGeometry=(()=>{
 const vertices:number[]=[],uv:number[]=[],indices:number[]=[];
 for(let i=0;i<=8;i++){const t=i/8,width=Math.sin(Math.PI*t)*.18;for(const side of [-1,1]){vertices.push(side*width,t*1.45,Math.sin(t*Math.PI*.8)*.55);uv.push(side<0?0:1,t);}}
 for(let i=0;i<8;i++){const a=i*2;indices.push(a,a+1,a+2,a+1,a+3,a+2);}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();return g;
})();
const leafMaterial=new THREE.MeshStandardMaterial({color:'#ffffff',roughness:.87,side:THREE.DoubleSide});
function Plant({x,z,large=false}:{x:number;z:number;large?:boolean}){
 const leaves=useRef<THREE.InstancedMesh>(null);
 useEffect(()=>{const d=new THREE.Object3D(),c=new THREE.Color();for(let i=0;i<15;i++){
  d.position.set(Math.sin(i*2.4)*.12,.48+(i%3)*.13,Math.cos(i*2.4)*.12);d.rotation.set((i%4)*.22,i*2.4,(i%3-1)*.24);d.scale.setScalar((large?1.2:.8)*(1+(i%4)*.08));d.updateMatrix();leaves.current!.setMatrixAt(i,d.matrix);leaves.current!.setColorAt(i,c.set(i%3===0?'#6d8151':i%3===1?'#365e3c':'#507346'));
 }leaves.current!.instanceMatrix.needsUpdate=true;},[large]);
 return <group position={[x,0,z]}><Cylinder p={[0,.35,0]} s={[.55,.7,.55]} c="#9b6649"/><Cylinder p={[0,.69,0]} s={[.49,.025,.49]} c="#41382a"/><instancedMesh ref={leaves} args={[leafGeometry,leafMaterial,15]} castShadow/></group>;
}
function Building({x,w,c,variant=0}:{x:number;w:number;c:string;variant?:number}){return <group position={[x,0,-20]}>
 <Box p={[0,5,-2]} s={[w,10,5]} c={c} surface="plaster"/><Box p={[0,3.5,.6]} s={[w+.4,.22,1.7]} c="#6b7065"/>
 <Box p={[0,1.7,.55]} s={[w-1,3.4,.16]} c={variant===1?'#7d9b8c':'#9aa28e'} surface="metal"/>
 {Array.from({length:Math.floor(w*2)},(_,i)=><Box key={i} p={[-w/2+.6+i*.5,1.7,.66]} s={[.035,3.3,.04]} c="#4b5854"/>)}
 {[-w*.27,w*.27].map((wx,i)=><group key={i}><Box p={[wx,6,.54]} s={[w*.28,2.2,.15]} c="#394e50"/><Box p={[wx,6,.65]} s={[.1,2.2,.1]} c="#c0b88f"/><Box p={[wx,6,.65]} s={[w*.28,.1,.1]} c="#c0b88f"/>{variant===2&&<Box p={[wx,5.4,.8]} s={[w*.3,.7,.7]} c="#83765d"/>}</group>)}
 <Box p={[0,8.5,.6]} s={[w+.15,.18,.25]} c="#b49c78"/><Box p={[0,9.9,.8]} s={[w+.6,.24,1.7]} c={palette.roof} surface="metal"/>
 {variant===0&&<><Box p={[w*.2,7,.8]} s={[1.3,.8,.6]} c="#c0bba7"/><Box p={[w*.2,7,1.12]} s={[.9,.06,.03]} c="#5d6863"/></>}
 </group>;}
function World(){
 const wire=useMemo(()=>new THREE.CatmullRomCurve3([new THREE.Vector3(-31,8,-16),new THREE.Vector3(0,6.4,-9),new THREE.Vector3(31,8,-16)]),[]);
 return <>
 <color attach="background" args={[palette.night]}/><fog attach="fog" args={[palette.night,35,110]}/>
 <ambientLight intensity={.24} color="#bec9d6"/><hemisphereLight args={['#bccddd','#7f715a',.78]}/><Environment resolution={128} frames={1}><mesh scale={60}><sphereGeometry args={[1,16,12]}/><meshBasicMaterial color="#607380" side={THREE.BackSide}/></mesh><Lightformer form="rect" intensity={3} color="#ffe0ae" position={[0,6,-8]} rotation={[Math.PI/2,0,0]} scale={[22,7,1]}/><Lightformer form="rect" intensity={1.3} color="#b9d0dd" position={[0,10,10]} rotation={[Math.PI/2,0,0]} scale={[35,25,1]}/></Environment>
 <directionalLight position={[-15,30,10]} intensity={1.75} color="#ffdfad" castShadow shadow-mapSize={[2048,2048]} shadow-camera-left={-32} shadow-camera-right={32} shadow-camera-top={30} shadow-camera-bottom={-30} shadow-normalBias={.04} shadow-bias={-.00015} shadow-radius={3}/>
 <pointLight position={[0,5,-14]} intensity={90} distance={28} decay={1.8} color="#ffbd73"/>
 <pointLight position={[-20,4,10]} intensity={40} distance={22} decay={1.8} color="#ffce8b"/>
 <Box p={[0,-.3,5]} s={[62,.6,58]} c="#d9d3bc" surface="concrete"/><Box p={[0,-.3,40.5]} s={[62,.6,13]} c="#b6beb8" surface="asphalt"/>

 {Array.from({length:14},(_,i)=><Box key={`seam${i}`} p={[0,.002,-22+i*4]} s={[58,.009,.035]} c="#77796f"/>)}
 {Array.from({length:11},(_,i)=><Box key={`seamx${i}`} p={[-28+i*5.5,.002,4]} s={[.025,.009,53]} c="#7d7e74"/>)}
 {[-24,-16,-8,0,8,16,24].map(x=><Box key={`road${x}`} p={[x,.008,43.5]} s={[3.5,.012,.12]} c="#d4caae"/>)}
 <Building x={-23} w={11} c="#af977a" variant={1}/><Building x={-11} w={12} c="#cfb176"/><Building x={3} w={15} c="#ddba78"/><Building x={18} w={14} c="#b28e6c" variant={2}/>
 <Box p={[-29,3,5]} s={[2,6,49]} c="#b5ac8c" surface="plaster"/>
 {/* A striped canvas awning, supported by simple steel poles. */}
 {Array.from({length:20},(_,i)=><Box key={i} p={[-22+i*2.45,5.8,-14.7]} s={[2.46,.09,6]} c={i%2?'#c8c29c':'#48786b'} rotation={[.16,0,0]}/>)}
 {AWNING_POSTS.map(({x,z})=><Cylinder key={x} p={[x,2.85,z]} s={[.075,5.7,.075]} c="#596d63"/>)}
 <mesh><tubeGeometry args={[wire,32,.025,4,false]}/><meshStandardMaterial color="#333c3a"/></mesh>
 {[-22,-11,0,11,22].map(x=><group key={x} position={[x,6.6+Math.abs(x)*.035,-10]}><Cylinder p={[0,-.28,0]} s={[.025,.6,.025]} c="#3f4743"/><mesh position={[0,-.7,0]} scale={[.2,.24,.2]} geometry={sphereGeo}><meshStandardMaterial color="#ffe3a0" emissive="#efb259" emissiveIntensity={1.5}/></mesh><mesh position={[0,-.55,0]}><coneGeometry args={[.5,.25,12]}/><meshStandardMaterial color="#4c6a59" side={THREE.DoubleSide}/></mesh></group>)}
 {/* Serving counter, plates, original-label drinks and a chalk menu. */}
 <Box p={[23,.95,-15]} s={[7,1.9,2.2]} c="#a78f6b" surface="plaster"/><Box p={[23,1.95,-15]} s={[7.3,.16,2.5]} c="#b7b9a3"/>
 {[21,22,23,24,25].map(x=><Cylinder key={x} p={[x,2.1,-15]} s={[.34,.12,.34]} c="#eee0bc"/>)}
 <Sign text="BẾP NHÀ · MỜI BẠN GỌI MÓN" p={[23,2.8,-17.3]} size={[6,.8]} bg="#315c51" fg="#ecdfb8"/>
 <Box p={[26,.75,-7]} s={[2,1.5,3]} c="#8c4238"/><Box p={[26,1.55,-7]} s={[2.1,.15,3.1]} c="#ddd4b5"/>
 <Sign text="ĐÁ LẠNH" p={[24.96,.8,-7]} size={[1.8,.7]} rotation={[0,-Math.PI/2,0]}/>
 <Sign text="THỰC ĐƠN" p={[16,4.2,-18.2]} size={[4.4,1.1]} bg="#31594e" fg="#eee1b9"/>
 <Sign text="ĐẬU · NEM · MỰC · TRÀ" p={[16,3.2,-18.2]} size={[4.4,.8]} bg="#31594e" fg="#eee1b9"/>
 <Plant x={26} z={20} large/><Plant x={-26} z={-6} large/><Plant x={27} z={-17}/><Plant x={-27} z={17}/>
 {/* Old fan, radio and a parked bicycle. */}
 <Cylinder p={[-24,1,-5]} s={[.1,2,.1]} c="#60786f"/><Cylinder p={[-24,.1,-5]} s={[.6,.2,.6]} c="#536e65"/>
 <mesh position={[-24,2.2,-5]} rotation={[Math.PI/2,0,0]}><torusGeometry args={[.65,.07,6,20]}/><meshStandardMaterial color="#7e8d79"/></mesh>
 {[0,1,2].map(i=><Box key={i} p={[-24,2.2,-5]} s={[.17,1.1,.08]} c="#8b9b86" rotation={[0,0,i*Math.PI/3]}/>)}
 <Box p={[19,2.32,-15]} s={[1.3,.6,.45]} c="#553f31"/><Box p={[19.3,2.33,-14.75]} s={[.5,.35,.02]} c="#b59d73"/>
 {[0,2].map(i=><mesh key={i} position={[27, .8,8+i]} rotation={[0,Math.PI/2,0]}><torusGeometry args={[.7,.06,6,20]}/><meshStandardMaterial color="#3a4341"/></mesh>)}
 <Box p={[27,1.2,9]} s={[.08,.08,2]} c="#726f56" rotation={[.3,0,0]}/><Box p={[27,1.7,8.1]} s={[.7,.08,.1]} c="#817859"/>
 {/* Enamel notices on perimeter walls keep the audience sightlines open. */}
 <Sign text={'KHÔNG BÁN RƯỢU BIA\nCHO NGƯỜI DƯỚI 18 TUỔI'} p={[-15,3.2,33.8]} size={[8,2]} bg="#f3e4bf" fg="#823c2d"/>
 <Sign text={'ĐÃ UỐNG RƯỢU BIA\nTHÌ KHÔNG LÁI XE'} p={[-27.96,3,16]} size={[7,2]} bg="#f3e4bf" fg="#823c2d" rotation={[0,Math.PI/2,0]}/>
 <Sign text={'VUI CÓ CHỪNG MỰC\nGIỮ GÌN TRẬT TỰ CHUNG'} p={[-27.96,3,3]} size={[6,1.7]} bg="#315e55" fg="#f0dca6" rotation={[0,Math.PI/2,0]}/>
 <Venue/>
 <Sign text="HẺM 17" p={[-28,3,24]} size={[2.6,1]} bg="#416875" fg="#f4ebcd" rotation={[0,Math.PI/2,0]}/>
 </>;
}
function Stools({players}:{players:Player[]}){const seats=useRef<THREE.InstancedMesh>(null),legs=useRef<THREE.InstancedMesh>(null);useEffect(()=>{const d=new THREE.Object3D(),color=new THREE.Color();let n=0;for(const t of TABLES)for(let i=0;i<6;i++){
 const p=seatPosition({table:t.id,index:i}),occupant=players.find(p=>p.seat?.table===t.id&&p.seat.index===i),lift=occupant?avatarDimensions(occupant).seatLift:0;d.position.set(p.x,.59+lift,p.z);d.scale.set(.62,.15,.62);d.rotation.set(0,0,0);d.updateMatrix();seats.current!.setMatrixAt(n,d.matrix);seats.current!.setColorAt(n,color.set(t.id%3===0?palette.green:palette.red));
 for(let j=0;j<4;j++){d.position.set(p.x+(j%2?1:-1)*.23,.28+lift/2,p.z+(j<2?1:-1)*.23);d.scale.set(.065,.58+lift,.065);d.updateMatrix();legs.current!.setMatrixAt(n*4+j,d.matrix);legs.current!.setColorAt(n*4+j,color);}n++;}
 seats.current!.instanceMatrix.needsUpdate=true;legs.current!.instanceMatrix.needsUpdate=true;
 },[players]);return <><instancedMesh ref={seats} args={[boxGeo,plasticMaterial,102]} castShadow receiveShadow/><instancedMesh ref={legs} args={[boxGeo,plasticMaterial,408]} castShadow/></>;}
function Food({item,i}:{item:string;i:number}){const color=MENU.find(m=>m.id===item)?.color||'#cda66d';const a=i*2.4;const drink=['beer','soda','tea'].includes(item);return <group position={[Math.sin(a)*.8,1.31,Math.cos(a)*.8]}>{drink?<><Cylinder p={[0,.24,0]} s={[.16,.48,.16]} c={color}/><Cylinder p={[0,.49,0]} s={[.16,.025,.16]} c="#eee2bb"/></>:<><Cylinder p={[0,.04,0]} s={[.4,.07,.4]} c="#e7dfcc"/>{[0,1,2,3].map(j=><mesh key={j} position={[Math.sin(j*2)*.17,.12,Math.cos(j*2)*.17]} scale={[.15,.09,.13]} geometry={sphereGeo} material={material(color)}/>)}</>}</group>;}
function Tables({state,target}:{state:RoomState|null;target:number|null}){return <>{TABLES.map(t=><group key={t.id} position={[t.x,0,t.z]}>
 <Cylinder p={[0,1.2,0]} s={[1.45,.14,1.45]} c={palette.steel}/><Cylinder p={[0,.6,0]} s={[.13,1.1,.13]} c="#6e7d78"/>
 <Box p={[0,.05,0]} s={[1.8,.12,.13]} c="#687b75"/><Box p={[0,.05,0]} s={[.13,.12,1.8]} c="#687b75"/>
 <Cylinder p={[-.5,1.47,0]} s={[.12,.42,.12]} c="#9f6b43"/>{[0,1,2,3].map(i=><Box key={i} p={[-.5+i*.025,1.8,.02]} s={[.016,.5,.016]} c="#d6b482"/>)}
 <Sign text={String(t.id).padStart(2,'0')} p={[0,1.65,-.25]} size={[.65,.45]} bg={target===t.id?'#f3c765':'#f0dbad'} fg="#813f31"/>
 {state?.tables[t.id-1]?.food.map((item,i)=><Food key={i} item={item} i={i}/>)}
 {target===t.id&&<mesh rotation={[-Math.PI/2,0,0]} position={[0,.015,0]}><ringGeometry args={[2.8,2.9,48]}/><meshBasicMaterial color="#efd18c" transparent opacity={.8}/></mesh>}
 </group>)}</>;}
function Name({p,me,bubble}:{p:Player;me:string;bubble?:string}){const ref=useRef<THREE.Group>(null);const [visible,setVisible]=React.useState(false);const last=useRef(0);useFrame(({clock})=>{const v=visuals.get(p.id)||p;ref.current?.position.set(v.x,(p.lying?.85*avatarDimensions(p).scale:p.seat?avatarDimensions(p).seatOffset+2.2*avatarDimensions(p).scale:drunkLevel(p.intoxication)===10?1.15*avatarDimensions(p).scale:p.height+.12)+floorHeight(v.x,v.z),v.z);if(clock.elapsedTime-last.current>.3){const self=visuals.get(me);setVisible(p.id===me||!!self&&Math.hypot(v.x-self.x,v.z-self.z)<13);last.current=clock.elapsedTime;}});return <group ref={ref}>{visible&&<Html center distanceFactor={8} zIndexRange={[12,0]} style={{pointerEvents:'none'}}><div className={`nameplate ${p.id===me?'you':''}`}>{bubble&&<span className="speech">{bubble}</span>}{p.name}{p.id===me?' · bạn':''}{drunkLevel(p.intoxication)>0?` · Say ${drunkLevel(p.intoxication)}`:''}{!p.connected?' · nối lại…':''}</div></Html>}</group>;}
function Controller({me,lobby,onFPS,stageEpoch,seated,crawling,height,lying}:{me:string|null;lobby:boolean;onFPS:(n:number)=>void;stageEpoch:number;seated:boolean;crawling:boolean;height:number;lying:boolean}){const {camera,gl,scene}=useThree();const blockers=useRef<THREE.Object3D[]>([]);const ray=useMemo(()=>new THREE.Raycaster(),[]);const look=useRef(new THREE.Vector3(0,1,18)),frame=useRef({at:0,count:0}),sent=useRef(0),drag=useRef<{id:number;x:number;y:number}|null>(null);const pitch=useRef(.25);
 useEffect(()=>{const objects:THREE.Object3D[]=[];scene.traverse(o=>{if(o.userData.cameraBlocker)objects.push(o);});blockers.current=objects;},[scene]);
 useEffect(()=>{const el=gl.domElement;const down=(e:PointerEvent)=>{if(!controls.enabled||e.button!==0)return;controls.stageView=false;drag.current={id:e.pointerId,x:e.clientX,y:e.clientY};el.setPointerCapture(e.pointerId);};
 const move=(e:PointerEvent)=>{if(!drag.current||drag.current.id!==e.pointerId)return;controls.yaw-=(e.clientX-drag.current.x)*.006;pitch.current=THREE.MathUtils.clamp(pitch.current+(e.clientY-drag.current.y)*.004,.2,1.05);drag.current={id:e.pointerId,x:e.clientX,y:e.clientY};};const up=()=>{drag.current=null;};const wheel=(e:WheelEvent)=>{e.preventDefault();controls.zoom=THREE.MathUtils.clamp(controls.zoom+e.deltaY*.01,3.8,14);};
 el.addEventListener('pointerdown',down);el.addEventListener('pointermove',move);el.addEventListener('pointerup',up);el.addEventListener('pointercancel',up);el.addEventListener('wheel',wheel,{passive:false});return ()=>{el.removeEventListener('pointerdown',down);el.removeEventListener('pointermove',move);el.removeEventListener('pointerup',up);el.removeEventListener('pointercancel',up);el.removeEventListener('wheel',wheel);};},[gl]);
 useFrame(({clock},dt)=>{
  if(lobby){controls.stageView=false;audio.stageMix(0,Date.now(),100);const desired=new THREE.Vector3(30,27,51);camera.position.lerp(desired,1-Math.exp(-dt*3));look.current.lerp(new THREE.Vector3(0,1,9),1-Math.exp(-dt*3));camera.lookAt(look.current);return;}
  const p=me?visuals.get(me):null;if(!p)return;
  audio.stageMix(stageEpoch,Date.now()+netClock.offset,Math.hypot(p.x-STAGE.x,p.z-STAGE.z));
  if(!seated)controls.stageView=false;
  const watching=controls.stageView&&seated;
  const focus=watching?new THREE.Vector3(STAGE.x,STAGE.height+1.4,STAGE.z):new THREE.Vector3(p.x,(lying?height*.2:seated?1.25:crawling?height*.28:height*.55)+floorHeight(p.x,p.z),p.z);look.current.lerp(focus,1-Math.exp(-dt*12));
  const outward=new THREE.Vector3(p.x-STAGE.x,0,p.z-STAGE.z).normalize();
  const desired=watching?new THREE.Vector3(p.x+outward.x*4.5,3.5,p.z+outward.z*4.5):focus.clone().add(new THREE.Vector3(Math.sin(controls.yaw)*controls.zoom,Math.sin(pitch.current)*controls.zoom+.4,Math.cos(controls.yaw)*controls.zoom));
  // Camera remains in front of the solid back/side facades and above table tops.
  desired.x=THREE.MathUtils.clamp(desired.x,-27.6,29);desired.z=Math.max(-17.8,desired.z);desired.y=Math.max(2.1+floorHeight(p.x,p.z),desired.y);
  const offset=desired.clone().sub(focus);ray.set(focus,offset.clone().normalize());ray.far=offset.length();
  const hit=ray.intersectObjects(blockers.current,false)[0];if(hit)desired.copy(focus).addScaledVector(offset.normalize(),Math.max(1.2,hit.distance-.4));
  camera.position.lerp(desired,1-Math.exp(-dt*10));camera.lookAt(look.current);
  if(clock.elapsedTime-sent.current>1/15){
   let x=0,z=0;if(controls.enabled){x=(controls.keys.has('d')||controls.keys.has('arrowright')?1:0)-(controls.keys.has('a')||controls.keys.has('arrowleft')?1:0)+controls.joystick.x;z=(controls.keys.has('s')||controls.keys.has('arrowdown')?1:0)-(controls.keys.has('w')||controls.keys.has('arrowup')?1:0)+controls.joystick.z;}
   const worldX=x*Math.cos(controls.yaw)+z*Math.sin(controls.yaw),worldZ=-x*Math.sin(controls.yaw)+z*Math.cos(controls.yaw),len=Math.max(1,Math.hypot(worldX,worldZ));
   if(socket.connected)socket.emit('input',{x:worldX/len,z:worldZ/len,run:controls.enabled&&(controls.keys.has('shift')||controls.running)});sent.current=clock.elapsedTime;
  }
  frame.current.count++;if(clock.elapsedTime-frame.current.at>1){onFPS(Math.round(frame.current.count/(clock.elapsedTime-frame.current.at)));frame.current={count:0,at:clock.elapsedTime};}
 });return null;
}
function DirectionMarker({me,target}:{me:string|null;target:number|null}){
 const ref=useRef<THREE.Group>(null);
 useFrame(()=>{if(!ref.current||!me||!target)return;const p=visuals.get(me),t=target===18?stageWaypoint(p||{x:0,z:40}):TABLES[target-1];if(!p)return;const dx=t.x-p.x,dz=t.z-p.z,d=Math.hypot(dx,dz);ref.current.visible=d>3.5;ref.current.position.set(p.x+dx/d*2.8,floorHeight(p.x+dx/d*2.8,p.z+dz/d*2.8)+.06,p.z+dz/d*2.8);ref.current.rotation.y=Math.atan2(dx,dz);});
 return target?<group ref={ref}><mesh rotation={[Math.PI/2,0,0]}><coneGeometry args={[.35,.85,3]}/><meshBasicMaterial color="#efd18c"/></mesh></group>:null;
}
export default function Scene({state,me,quality,reduced,target,bubbles,onFPS}:{state:RoomState|null;me:string|null;quality:string;reduced:boolean;target:number|null;bubbles:Record<string,string>;onFPS:(n:number)=>void}){
 const self=state?.players.find(p=>p.id===me);
 return <Canvas shadows={quality==='high'} dpr={quality==='low'?1:[1,1.5]} camera={{position:[30,27,51],fov:48,near:.1,far:160}} gl={{antialias:quality==='high',powerPreference:'high-performance'}} onCreated={({gl})=>{gl.toneMapping=THREE.ACESFilmicToneMapping;gl.toneMappingExposure=1.04;gl.shadowMap.type=THREE.PCFSoftShadowMap;}}>
 <Suspense fallback={null}><World/><Stage epoch={state?.stage?.epoch||0} reduced={reduced} quality={quality}/><Stools players={state?.players||[]}/><Tables state={state} target={target}/><Avatars players={state?.players||[]} reduced={reduced} me={me} quality={quality}/><DirectionMarker me={me} target={target}/>{state?.players.map(p=><Name key={p.id} p={p} me={me||''} bubble={bubbles[p.id]}/>)}<Controller me={me} lobby={!state} onFPS={onFPS} stageEpoch={state?.stage?.epoch||0} seated={!!self?.seat} crawling={!!self&&!self.seat&&drunkLevel(self.intoxication)===10} height={self?.height||1.7} lying={!!self?.lying}/></Suspense>
 </Canvas>;
}
