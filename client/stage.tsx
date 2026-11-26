import {useMemo,useRef,useEffect} from 'react';
import {useFrame} from '@react-three/fiber';
import * as THREE from 'three';
import {STAGE,STAGE_BPM,STAGE_SPEAKERS,STAGE_RAMPS} from '../shared/social';
import {netClock} from './network';

const colors=['#e3a15f','#8dbbc0','#d68577','#c1c987'];
export function Stage({epoch,reduced,quality}:{epoch:number;reduced:boolean;quality:string}){
 const lamps=useRef<(THREE.Mesh|null)[]>([]),lights=useRef<(THREE.PointLight|null)[]>([]);
 const ramps=useMemo(()=>STAGE_RAMPS.map(r=>{
  const x=r.x,w=r.w,z=r.z,d=r.d/2,h=STAGE.height,left=r.up===1?0:h,right=h-left;
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute([x,left,z-d,x,left,z+d,x+w,right,z-d,x+w,right,z+d,x,0,z-d,x,0,z+d,x+w,0,z-d,x+w,0,z+d],3));
  geometry.setIndex([0,1,2,1,3,2,0,2,4,2,6,4,1,5,3,3,5,7,0,4,1,1,4,5,2,3,6,3,7,6]);geometry.computeVertexNormals();return geometry;
 }),[]);
 const sign=useMemo(()=>{const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=180;const c=canvas.getContext('2d')!;c.fillStyle='#294c46';c.fillRect(0,0,1024,180);c.strokeStyle='#d2bb85';c.lineWidth=4;c.strokeRect(12,12,1000,156);c.fillStyle='#f1ddaf';c.font='bold 66px Georgia';c.textAlign='center';c.fillText('SÂN KHẤU ĐẦU HẺM',512,112);const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;return texture;},[]);
 useEffect(()=>()=>{ramps.forEach(r=>r.dispose());sign.dispose();},[ramps,sign]);
 useFrame(({clock})=>{
  const beat=epoch?(Date.now()+netClock.offset-epoch)/60000*STAGE_BPM:clock.elapsedTime*2;
  for(let i=0;i<4;i++){
   const pulse=reduced?.45:.30+.70*(.5+.5*Math.sin(beat*Math.PI*2+i*Math.PI/2));
   const material=lamps.current[i]?.material as THREE.MeshStandardMaterial|undefined;if(material)material.emissiveIntensity=.4+pulse*.7;
   const light=lights.current[i];if(light)light.intensity=(quality==='low'?0:8)+pulse*(quality==='low'?16:26);
  }
 });
 return <group>
  <mesh position={[STAGE.x,STAGE.height/2,STAGE.z]} receiveShadow castShadow><boxGeometry args={[STAGE.w,STAGE.height,STAGE.d]}/><meshStandardMaterial color="#635646" roughness={.8}/></mesh>
  {ramps.map((r,i)=><mesh key={i} geometry={r} receiveShadow><meshStandardMaterial color="#a7997b" roughness={.9} side={THREE.DoubleSide}/></mesh>)}
  {Array.from({length:STAGE.w},(_,i)=><mesh key={i} position={[STAGE.x-STAGE.w/2+.5+i,STAGE.height+.005,STAGE.z]}><boxGeometry args={[.025,.012,STAGE.d]}/><meshStandardMaterial color="#403e34"/></mesh>)}
  {STAGE_SPEAKERS.map(({x,z})=><group key={x}><mesh position={[x,2.5,z]} userData={{cameraBlocker:true}}><cylinderGeometry args={[.07,.07,4.5,8]}/><meshStandardMaterial color="#69766d" metalness={.6} roughness={.5}/></mesh><mesh position={[x,1.25,z]}><boxGeometry args={[.9,1.6,.7]}/><meshStandardMaterial color="#28342f"/></mesh>{[.85,1.5].map(y=><mesh key={y} position={[x,y,z+.36]} rotation={[Math.PI/2,0,0]}><cylinderGeometry args={[.29,.29,.035,16]}/><meshStandardMaterial color="#101c19" roughness={.9}/></mesh>)}</group>)}
  <mesh position={[STAGE.x,4.5,STAGE_SPEAKERS[0].z]}><boxGeometry args={[STAGE.w-1.2,.12,.12]}/><meshStandardMaterial color="#6c786b" metalness={.6} roughness={.5}/></mesh>
  <mesh position={[STAGE.x,4.85,STAGE_SPEAKERS[0].z+.08]}><planeGeometry args={[8.3,.85]}/><meshBasicMaterial map={sign} side={THREE.DoubleSide}/></mesh>
  {colors.map((color,i)=><group key={color} position={[STAGE.x-STAGE.w/2+2+i*(STAGE.w-4)/3,4.2,STAGE_SPEAKERS[0].z+.3]}><mesh><boxGeometry args={[.5,.38,.44]}/><meshStandardMaterial color="#3c4840" metalness={.4} roughness={.6}/></mesh><mesh ref={mesh=>{lamps.current[i]=mesh;}} position={[0,-.08,-.23]} rotation={[Math.PI/2,0,0]}><circleGeometry args={[.17,16]}/><meshStandardMaterial color={color} emissive={color} emissiveIntensity={1}/></mesh>{(quality!=='low'||i%2===0)&&<pointLight ref={light=>{lights.current[i]=light;}} position={[0,-1,2]} color={color} intensity={22} distance={9} decay={2}/>}</group>)}
 </group>;
}
