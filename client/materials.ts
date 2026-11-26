import * as THREE from 'three';

export type Surface='concrete'|'plaster'|'asphalt'|'metal';
const loader=new THREE.TextureLoader();
const textures=new Map<string,THREE.Texture>();
const surfaces=new Map<string,THREE.MeshStandardMaterial>();
const geometries=new Map<string,THREE.BoxGeometry>();

function map(surface:Surface,kind:'diff'|'nor_gl'|'rough'){
 const key=`${surface}-${kind}`;
 if(!textures.has(key)){
  const texture=loader.load(`/textures/${key}.jpg`,undefined,undefined,()=>{
   console.warn(`Không tải được texture ${key}; dùng màu vật liệu dự phòng.`);
   for(const [name,material] of surfaces)if(name.startsWith(surface+':')){
    if(kind==='diff')material.map=null;
    if(kind==='nor_gl')material.normalMap=null;
    if(kind==='rough')material.roughnessMap=null;
    material.needsUpdate=true;
   }
  });
  texture.colorSpace=kind==='diff'?THREE.SRGBColorSpace:THREE.NoColorSpace;
  texture.wrapS=texture.wrapT=THREE.RepeatWrapping;
  texture.anisotropy=4;
  textures.set(key,texture);
 }
 return textures.get(key)!;
}

/** Share the same 12 GPU textures; physical UVs live on cached box geometry. */
export function surfaceMaterial(surface:Surface,color:string){
 const key=`${surface}:${color}`;
 if(!surfaces.has(key))surfaces.set(key,new THREE.MeshStandardMaterial({
  color,map:map(surface,'diff'),normalMap:map(surface,'nor_gl'),roughnessMap:map(surface,'rough'),
  normalScale:new THREE.Vector2(surface==='metal'?.45:.65,surface==='metal'?.45:.65),
  roughness:surface==='metal'?.7:1,metalness:surface==='metal'?.35:0,
 }));
 return surfaces.get(key)!;
}

export function surfaceBox(size:readonly number[],tileSize=3){
 const key=`${size.join(',')}:${tileSize}`;
 if(!geometries.has(key)){
  const [w,h,d]=size,geometry=new THREE.BoxGeometry(w,h,d),uv=geometry.attributes.uv;
  // ±X, ±Y, ±Z faces. Correct scale prevents large walls stretching a photo.
  const faces=[[d,h],[d,h],[w,d],[w,d],[w,h],[w,h]];
  for(let face=0;face<6;face++)for(let v=0;v<4;v++){
   const i=face*4+v;uv.setXY(i,uv.getX(i)*faces[face][0]/tileSize,uv.getY(i)*faces[face][1]/tileSize);
  }
  geometries.set(key,geometry);
 }
 return geometries.get(key)!;
}

export const steelMaterial=new THREE.MeshStandardMaterial({color:'#b7c0bd',roughness:.31,metalness:.82});
export const wornSteelMaterial=new THREE.MeshStandardMaterial({color:'#687873',roughness:.52,metalness:.64});
export const plasticMaterial=new THREE.MeshStandardMaterial({color:'#ffffff',roughness:.48,metalness:0});
