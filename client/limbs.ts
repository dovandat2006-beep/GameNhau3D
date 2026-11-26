import * as THREE from 'three';

export type LimbName='armL'|'armR'|'legL'|'legR';
export type LimbJoints={start:THREE.Vector3;joint:THREE.Vector3;end:THREE.Vector3};
const RINGS=24,SIDES=12;

/** One continuous skin surface; the elbow/knee is an internal control point. */
export function limbGeometry(){
 const positions:number[]=[],normals:number[]=[],indices:number[]=[];
 for(let ring=0;ring<=RINGS;ring++)for(let side=0;side<=SIDES;side++){
  const angle=side/SIDES*Math.PI*2;
  positions.push(Math.cos(angle),ring/RINGS,Math.sin(angle));
  normals.push(Math.cos(angle),0,Math.sin(angle));
 }
 for(let ring=0;ring<RINGS;ring++)for(let side=0;side<SIDES;side++){
  const a=ring*(SIDES+1)+side,b=a+SIDES+1;
  indices.push(a,b,a+1,b,b+1,a+1);
 }
 const g=new THREE.BufferGeometry();
 g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
 g.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));g.setIndex(indices);
 for(const name of ['limbStart','limbJoint','limbEnd','limbSkin','limbCloth']){
  g.setAttribute(name,new THREE.InstancedBufferAttribute(new Float32Array(100*3),3).setUsage(THREE.DynamicDrawUsage));
 }
 return g;
}

// Cubic Hermite interpolation passes through all three controls with the same
// tangent on both sides of the joint. No separate caps or exposed joint meshes.
const skinGLSL=`
attribute vec3 limbStart;
attribute vec3 limbJoint;
attribute vec3 limbEnd;
attribute vec3 limbSkin;
attribute vec3 limbCloth;
uniform vec2 limbRadius;
vec3 hermiteLimb(vec3 a,vec3 b,vec3 ta,vec3 tb,float t){
 float t2=t*t,t3=t2*t;
 return (2.0*t3-3.0*t2+1.0)*a+(t3-2.0*t2+t)*ta+(-2.0*t3+3.0*t2)*b+(t3-t2)*tb;
}
vec3 limbCenter(float u){
 vec3 tangent=(limbEnd-limbStart)*0.5;
 if(u<0.5)return hermiteLimb(limbStart,limbJoint,limbJoint-limbStart,tangent,u*2.0);
 return hermiteLimb(limbJoint,limbEnd,tangent,limbEnd-limbJoint,(u-0.5)*2.0);
}
vec3 limbRadial(vec3 p){
 float u=p.y;
 vec3 tangent=normalize(limbCenter(min(1.0,u+0.002))-limbCenter(max(0.0,u-0.002)));
 vec3 reference=abs(tangent.x)>0.95?vec3(0.0,1.0,0.0):vec3(1.0,0.0,0.0);
 vec3 side=normalize(cross(tangent,reference));
 return side*p.x-cross(tangent,side)*p.z;
}
vec3 skinPosition(vec3 p){
 float radius=mix(limbRadius.x,limbRadius.y,p.y)+sin(p.y*3.14159265)*0.006;
 radius*=smoothstep(0.0,0.06,p.y)*smoothstep(0.0,0.04,1.0-p.y);
 return limbCenter(p.y)+limbRadial(p)*radius;
}
`;

export function limbMaterial(arm:boolean){
 const material=new THREE.MeshStandardMaterial({color:'#ffffff',roughness:arm?.78:.94});
 material.customProgramCacheKey=()=>`continuous-limb-v1-${arm?'arm':'leg'}`;
 material.onBeforeCompile=shader=>{
  shader.uniforms.limbRadius={value:new THREE.Vector2(arm?.105:.128,arm?.063:.095)};
  shader.vertexShader=shader.vertexShader.replace('#include <common>',`#include <common>\n${skinGLSL}\nvarying vec3 vLimbColor;`)
   .replace('#include <beginnormal_vertex>','vec3 objectNormal=limbRadial(position);')
   .replace('#include <begin_vertex>',`vec3 transformed=skinPosition(position);\nvLimbColor=${arm?'mix(limbCloth,limbSkin,smoothstep(0.29,0.31,position.y))':'limbCloth'};`);
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vLimbColor;')
   .replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor.rgb*=vLimbColor;');
 };
 const depth=new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking});
 depth.customProgramCacheKey=()=>`continuous-limb-depth-v1-${arm?'arm':'leg'}`;
 depth.onBeforeCompile=shader=>{
  shader.uniforms.limbRadius={value:new THREE.Vector2(arm?.105:.128,arm?.063:.095)};
  shader.vertexShader=shader.vertexShader.replace('#include <common>',`#include <common>\n${skinGLSL}`)
   .replace('#include <begin_vertex>','vec3 transformed=skinPosition(position);');
 };
 return {material,depth};
}

/** CPU equivalent of the centerline, for joint continuity/coverage verification. */
export function limbPoint(j:LimbJoints,u:number,out=new THREE.Vector3()){
 const first=u<.5,t=first?u*2:(u-.5)*2,t2=t*t,t3=t2*t;
 const a=first?j.start:j.joint,b=first?j.joint:j.end;
 const ta=first?j.joint.clone().sub(j.start):j.end.clone().sub(j.start).multiplyScalar(.5);
 const tb=first?j.end.clone().sub(j.start).multiplyScalar(.5):j.end.clone().sub(j.joint);
 return out.copy(a).multiplyScalar(2*t3-3*t2+1).addScaledVector(ta,t3-2*t2+t).addScaledVector(b,-2*t3+3*t2).addScaledVector(tb,t3-t2);
}
