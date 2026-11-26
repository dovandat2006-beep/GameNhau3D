import {Canvas} from '@react-three/fiber';
import {OrbitControls} from '@react-three/drei';
import {Avatars,IDLE_ACTOR} from './avatars';
import type {Appearance} from '../shared/appearance';
export default function AvatarPreview({appearance}:{appearance:Appearance}){
 return <div className="avatar-preview" aria-label="Xem trước nhân vật 3D, kéo để xoay"><Canvas camera={{position:[1.3,1.3,4.4],fov:35}} dpr={[1,1.5]}><ambientLight intensity={1.5}/><directionalLight position={[3,5,5]} intensity={2}/><Avatars players={[{...IDLE_ACTOR,...appearance,id:'preview',x:0,z:0,angle:0}]} preview me={null} reduced quality="low"/><OrbitControls target={[0,.95,0]} enablePan={false} minDistance={3} maxDistance={6}/></Canvas><small>Kéo để xoay nhân vật</small></div>;
}
