import {Html} from '@react-three/drei';
import {Avatars,IDLE_ACTOR} from './avatars';
import {useMemo,useEffect} from 'react';
import * as THREE from 'three';
import {Box,Cylinder,Sign} from './scenery';
import {ENTRANCE,FRONT_FENCES,RECEPTION,WC,WC_WALLS,MOTORBIKES,RECEPTION_HOST} from '../shared/world';

function Bar({a,b,r=.025,color='#aeb7aa'}:{a:[number,number,number];b:[number,number,number];r?:number;color?:string}){
 const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b),delta=end.clone().sub(start);
 const rotation=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),delta.clone().normalize());
 return <mesh position={start.add(end).multiplyScalar(.5)} quaternion={rotation} castShadow><cylinderGeometry args={[r,r,delta.length(),8]}/><meshStandardMaterial color={color} metalness={.65} roughness={.36}/></mesh>;
}
function Wheel({z}:{z:number}){return <group position={[0,.37,z]}>
 <mesh rotation={[0,Math.PI/2,0]} castShadow><torusGeometry args={[.30,.075,8,24]}/><meshStandardMaterial color="#242a28" roughness={.92}/></mesh>
 <mesh rotation={[0,Math.PI/2,0]}><torusGeometry args={[.25,.022,5,24]}/><meshStandardMaterial color="#bdc3b1" metalness={.85} roughness={.25}/></mesh>
 {Array.from({length:8},(_,i)=>{const a=i*Math.PI/4;return <Bar key={i} a={[0,0,0]} b={[0,Math.cos(a)*.25,Math.sin(a)*.25]} r={.009}/>;})}
 <mesh rotation={[0,0,Math.PI/2]}><cylinderGeometry args={[.08,.08,.19,12]}/><meshStandardMaterial color="#8f998d" metalness={.7} roughness={.3}/></mesh>
 </group>;}
function Motorbike({style,color,x,z}:{style:'dream'|'xipo';color:string;x:number;z:number}){
 const sport=style==='xipo';
 // Original side profiles: slim sport tank/fairing versus an upright step-through leg shield.
 const fairing=useMemo(()=>{
  const shape=new THREE.Shape(),points=sport?[[-.67,.73],[-.35,1.0],[.17,1.02],[.48,.81],[.28,.58],[-.40,.59]]:[[-.55,.64],[-.25,.87],[.25,.69],[.47,.95],[.57,.93],[.42,.48],[-.32,.47]];
  shape.moveTo(points[0][0],points[0][1]);for(const p of points.slice(1))shape.lineTo(p[0],p[1]);shape.closePath();
  const g=new THREE.ExtrudeGeometry(shape,{depth:.32,bevelEnabled:true,bevelSize:.045,bevelThickness:.035,bevelSegments:2,steps:1});g.translate(0,0,-.16);g.rotateY(-Math.PI/2);return g;
 },[sport]);
 useEffect(()=>()=>fairing.dispose(),[fairing]);
 return <group position={[x,0,z]} rotation={[0,Math.PI/2,0]}>
  <Wheel z={-.82}/><Wheel z={.87}/>
  <Bar a={[0,.4,-.82]} b={[0,.7,.12]} r={.055} color="#4b514b"/>
  {[-.12,.12].map(side=><group key={side}><Bar a={[side,.37,.87]} b={[side,1.08,.60]} r={.034}/><Bar a={[side,.42,-.75]} b={[side,.86,-.35]} r={.035}/></group>)}
  <mesh geometry={fairing} castShadow><meshStandardMaterial color={color} metalness={.28} roughness={.4}/></mesh>
  <Box p={[0,.96,-.35]} s={[.42,.13,.89]} c="#292f2b"/>
  <Box p={[0,.54,-.10]} s={[.31,.28,.35]} c="#9ca398"/>
  {[0,1,2,3].map(i=><Box key={i} p={[0,.46+i*.052,.01]} s={[.34,.018,.31]} c="#515c54"/>)}
  {!sport&&<Box p={[0,.78,.43]} s={[.48,.52,.13]} c="#ddd5b9" rotation={[-.18,0,0]}/>}
  <Box p={[0,1.10,.64]} s={[sport?.32:.42,.20,.22]} c={color}/>
  <Box p={[0,1.10,.765]} s={[sport?.23:.32,.135,.035]} c="#e8dfb6"/>
  <Box p={[0,.92,-.85]} s={[.30,.10,.08]} c="#a64030"/>
  <Bar a={[-.39,1.12,.56]} b={[.39,1.12,.56]} r={.035} color="#333f37"/>
  {[-1,1].map(side=><group key={side}><Bar a={[side*.28,1.12,.56]} b={[side*.39,1.43,.63]} r={.014}/><mesh position={[side*.40,1.44,.63]} scale={[.10,.065,.035]}><sphereGeometry args={[1,12,8]}/><meshStandardMaterial color="#b2c0b9" metalness={.8} roughness={.22}/></mesh><mesh position={[side*.13,.38,.80]}><sphereGeometry args={[.045,10,8]}/><meshStandardMaterial color="#be8040"/></mesh></group>)}
  <Bar a={[.24,.40,-.10]} b={[.24,.45,-.98]} r={.065} color="#b5bdac"/>
  <Bar a={[-.12,.48,-.20]} b={[-.38,.04,-.38]} r={.025} color="#596052"/>
  <Box p={[0,.73,-.94]} s={[.22,.17,.025]} c="#e4dab9"/>
 </group>;
}
function Washroom(){return <>
 <Box p={[WC.x,.012,WC.z]} s={[WC.w,.024,WC.d]} c="#c2c8b2"/>
 {WC_WALLS.map((wall,i)=><Box key={i} p={[wall.x,1.65,wall.z]} s={[wall.w,3.3,wall.d]} c="#bac5ae" surface="plaster"/>)}
 <Box p={[WC.x,3.15,WC.z+WC.d/2]} s={[WC.door,.3,.25]} c="#57746a"/>
 <Box p={[WC.x,3.35,WC.z-WC.d/4]} s={[WC.w+.3,.15,WC.d/2+.3]} c="#60796d" surface="metal"/>
 <Sign text={'WC · NHÀ VỆ SINH'} p={[WC.x,2.85,WC.z+WC.d/2+.14]} size={[3.2,.55]} bg="#315e55" fg="#f0dca6"/>
 <Sign text="WC ←" p={[-16,2.2,-9.9]} size={[2,.65]} bg="#315e55" fg="#f0dca6"/>
 <group position={[WC.x-1.8,0,WC.z-1.6]}>
  <Cylinder p={[0,.22,0]} s={[.24,.44,.29]} c="#dddcc6"/>
  <mesh position={[0,.43,.12]} scale={[.32,.17,.43]}><sphereGeometry args={[1,20,12]}/><meshStandardMaterial color="#e5e3ce" roughness={.23}/></mesh>
  <mesh position={[0,.54,.12]} rotation={[Math.PI/2,0,0]} scale={[1,1.3,1]}><torusGeometry args={[.24,.05,8,20]}/><meshStandardMaterial color="#f0e9d0" roughness={.2}/></mesh>
  <Box p={[0,.70,-.30]} s={[.60,.65,.22]} c="#e5e3ce"/>
 </group>
 <group position={[WC.x+2.5,.8,WC.z-1.7]}><Box p={[0,0,0]} s={[.8,.12,.6]} c="#e5e3ce"/><Cylinder p={[0,.03,0]} s={[.26,.035,.20]} c="#7b958c"/><Bar a={[0,.08,-.18]} b={[0,.32,-.18]} r={.025}/><Bar a={[0,.32,-.18]} b={[0,.32,.03]} r={.025}/></group>
 </>;}
export function Venue(){return <>
 {FRONT_FENCES.map((f,i)=><group key={i}><Box p={[f.x,.48,f.z]} s={[f.w,.96,f.d]} c="#a58d6e" surface="plaster"/><Box p={[f.x,1,f.z]} s={[f.w,.10,.46]} c="#6b7767"/></group>)}
 {[-1,1].map(side=><Box key={side} p={[side*ENTRANCE.width/2,2.2,ENTRANCE.z]} s={[.35,4.4,.35]} c="#586c5d"/>)}
 <Box p={[0,4.4,ENTRANCE.z]} s={[ENTRANCE.width+.6,.2,.6]} c="#586c5d"/>
 <Sign text="QUÁN NHẬU ĐẦU HẺM" p={[0,4.12,ENTRANCE.z+.32]} size={[10.5,.95]}/>
 <Sign text="MỜI BẠN VÀO QUÁN" p={[0,3.35,ENTRANCE.z+.32]} size={[6,.55]} bg="#315e55" fg="#f0dca6"/>
 <group position={[RECEPTION.x,0,RECEPTION.z]}>
  <Box p={[0,.5,0]} s={[RECEPTION.w,1,RECEPTION.d]} c="#8c6347" surface="plaster"/>
  <Box p={[0,1.07,0]} s={[RECEPTION.w+.2,.14,RECEPTION.d+.15]} c="#b9a17a"/>
  <Sign text="LỄ TÂN · MỜI BẠN" p={[0,.62,RECEPTION.d/2+.02]} size={[4,.7]} bg="#315e55" fg="#f0dca6"/>
  <Box p={[-.6,1.17,0]} s={[.75,.05,.48]} c="#e4d8af" rotation={[0,.15,0]}/>
  <Box p={[-.6,1.20,0]} s={[.015,.01,.43]} c="#7e6549" rotation={[0,.15,0]}/>
  <Cylinder p={[1.4,1.37,0]} s={[.035,.5,.035]} c="#6a7662"/>
  <mesh position={[1.4,1.72,0]}><coneGeometry args={[.32,.28,16]}/><meshStandardMaterial color="#b39159" emissive="#b39159" emissiveIntensity={.25}/></mesh>
 </group>
 <Avatars players={[{...IDLE_ACTOR,id:'reception-npc',x:RECEPTION_HOST.x,z:RECEPTION_HOST.z,angle:0,avatar:4,face:1,height:1.66,weight:62,color:'#547f75'}]} preview me={null} reduced={false} quality="low"/>
 <group position={[RECEPTION_HOST.x,1.9,RECEPTION_HOST.z]}><Html center distanceFactor={8} style={{pointerEvents:'none'}}><div className="nameplate">Hạnh · Lễ tân NPC</div></Html></group>
 <Washroom/>
 {MOTORBIKES.map(b=><Motorbike key={b.x} {...b}/>)}
 <Sign text="BÃI XE · GIỮ LỐI VÀO" p={[18,2.5,35.7]} size={[7,.8]} bg="#315e55" fg="#f0dca6"/>
 </>;}
