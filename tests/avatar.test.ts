import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {AvatarRig,AVATAR_PARTS,STRIDE_METRES} from '../client/avatar';
import {limbPoint,limbGeometry} from '../client/limbs';
import {CHEERS_MS,WAVE_MS} from '../shared/world';
const base={phase:0,motion:0,seated:false,cheers:null,wave:null,time:0,avatar:0,reduced:false};
const rig=new AvatarRig();
const position=(m:THREE.Matrix4)=>new THREE.Vector3().setFromMatrixPosition(m);
test('walking keeps the stance foot planted as the body advances',()=>{
 const u1=.10,u2=.30;
 rig.sample({...base,motion:1,phase:u1*Math.PI*2});const first=rig.leftFoot.clone();
 rig.sample({...base,motion:1,phase:u2*Math.PI*2});const second=rig.leftFoot.clone();
 assert.ok(Math.abs((second.z+STRIDE_METRES*(u2-u1))-first.z)<1e-10);
 assert.equal(first.y,.10);assert.equal(second.y,.10);
});
test('swing foot clears the floor and the legs alternate',()=>{
 rig.sample({...base,motion:1,phase:.81*Math.PI*2});
 assert.ok(rig.leftFoot.y>.20);assert.equal(rig.rightFoot.y,.10);
});
test('seated knees bend toward table, both feet stay on ground',()=>{
 rig.sample({...base,seated:true});
 const limb=rig.limbs.legL;
 assert.ok(limb.joint.z>limb.start.z);assert.ok(limb.end.z>limb.joint.z);assert.equal(rig.leftFoot.y,.10);assert.equal(rig.rightFoot.y,.10);
 assert.ok(rig.cupVisible);assert.ok(!rig.cupInHand);
});
test('cheers picks up a mug, raises it with the hand and returns it to the table',()=>{
 rig.sample({...base,seated:true,cheers:0});const table=rig.cupPosition.clone();assert.equal(rig.cupInHand,false);
 rig.sample({...base,seated:true,cheers:1.3});const raised=rig.cupPosition.clone();
 assert.equal(rig.cupInHand,true);assert.ok(raised.y>table.y+.12);
 assert.ok(Math.abs(rig.rightHand.distanceTo(raised)-Math.hypot(.15,.025))<1e-8);
 assert.ok(position(rig.matrices.mugGlass).distanceTo(raised)<1e-8);
 rig.sample({...base,seated:true,cheers:3.3});assert.equal(rig.cupInHand,false);assert.ok(rig.cupPosition.distanceTo(table)<1e-8);
});
test('walking and waving do not conjure a glass; reduced motion preserves necessary walking',()=>{
 rig.sample({...base,motion:1,phase:1.2,wave:.8,reduced:true});
 assert.equal(rig.cupVisible,false);assert.ok(rig.rightHand.y>1.8);
 const a=rig.leftFoot.z;rig.sample({...base,motion:1,phase:1.5,reduced:true});assert.notEqual(rig.leftFoot.z,a);
});
test('all joint matrices remain finite throughout complete action cycles',()=>{
 for(let frame=0;frame<=120;frame++)for(const seated of [false,true]){
  const t=frame/30;rig.sample({...base,motion:seated?0:1,phase:t*6,seated,cheers:seated?t:null,wave:!seated?t:null,time:t});
  for(const part of AVATAR_PARTS)assert.ok(rig.matrices[part.key].elements.every(Number.isFinite),`${part.key} at ${t}s`);
 }
 assert.equal(CHEERS_MS,3600);assert.equal(WAVE_MS,2400);
});

test('drinking keeps the actual near rim against the mouth through the whole tilt',()=>{
 for(const avatar of [0,1,2])for(let i=0;i<=70;i++){
  const t=2.15+i*.01;rig.sample({...base,seated:true,cheers:t,avatar,time:t});
  assert.ok(rig.cupRimContact.distanceTo(rig.mouthPosition)<1e-8,`lip contact at ${t}`);
  const renderedRim=new THREE.Vector3(0,0,-.133).applyMatrix4(rig.matrices.mugRim);
  assert.ok(renderedRim.distanceTo(rig.mouthPosition)<1e-8);
  const eyes=position(rig.matrices.eyeL);assert.ok(eyes.y-rig.cupRimContact.y>.12);
  assert.ok(Math.abs(rig.rightHand.distanceTo(rig.cupPosition)-Math.hypot(.15,.025))<1e-8);
 }
 rig.sample({...base,seated:true,cheers:2.5});
 const cupUp=new THREE.Vector3(0,1,0).applyQuaternion(rig.cupRotation);
 assert.ok(cupUp.z<-.8,'cup genuinely tilts toward the mouth');
});
test('continuous skin passes through hidden joints without a break in tangent',()=>{
 for(const frame of [0,.7,1.3,2.5]){
  rig.sample({...base,motion:1,phase:frame*3,seated:frame>1,cheers:frame>1?frame:null});
  for(const joints of Object.values(rig.limbs)){
   assert.ok(limbPoint(joints,0).distanceTo(joints.start)<1e-10);
   assert.ok(limbPoint(joints,.5).distanceTo(joints.joint)<1e-10);
   assert.ok(limbPoint(joints,1).distanceTo(joints.end)<1e-10);
   const left=limbPoint(joints,.5).sub(limbPoint(joints,.5-.00001)).normalize();
   const right=limbPoint(joints,.5+.00001).sub(limbPoint(joints,.5)).normalize();
   assert.ok(left.dot(right)>.99999,'no visible seam/cusp at joint');
  }
 }
 assert.ok(!AVATAR_PARTS.some(p=>/upperArm|forearm|thigh|shin/.test(p.key)),'old disconnected capsules no longer rendered');
 const geometry=limbGeometry();assert.equal(geometry.getAttribute('limbJoint').count,100);geometry.dispose();
});

test('hidden arm/leg bones retain their lengths while walking, waving and drinking',()=>{
 for(let frame=0;frame<=108;frame++)for(const seated of [false,true]){
  const t=frame/30;rig.sample({...base,motion:seated?0:1,phase:t*6,seated,cheers:seated?t:null,wave:seated?null:t,time:t});
  for(const [name,j] of Object.entries(rig.limbs)){
   const [upper,lower]=name.startsWith('arm')?[.32,.32]:[.50,.52];
   assert.ok(Math.abs(j.start.distanceTo(j.joint)-upper)<1e-6,`${name} upper at ${t}`);
   assert.ok(Math.abs(j.joint.distanceTo(j.end)-lower)<1e-6,`${name} lower at ${t}`);
  }
 }
});

test('standing legs and hanging arms are nearly straight instead of crouched',()=>{
 rig.sample({...base});
 for(const [name,j] of Object.entries(rig.limbs)){
  const upper=j.joint.clone().sub(j.start).normalize(),lower=j.end.clone().sub(j.joint).normalize();
  assert.ok(upper.dot(lower)>Math.cos(12*Math.PI/180),`${name} bends less than 12 degrees at rest`);
  assert.ok(j.end.y<j.joint.y&&j.joint.y<j.start.y);
 }
 assert.ok(rig.limbs.legL.start.y>1.11,'hips above extended legs');
 assert.ok(rig.limbs.armL.end.y<rig.limbs.legL.start.y-.1,'hands reach naturally below waist');
});
test('walking extends the supporting leg and only flexes the free leg',()=>{
 for(let frame=0;frame<100;frame++){
  const phase=frame/100*Math.PI*2;rig.sample({...base,motion:1,phase});
  const grounded=Object.values({left:rig.limbs.legL,right:rig.limbs.legR}).filter(j=>j.end.y<=.1005);
  assert.ok(grounded.length>=1,'walking always has ground support');
  const longest=grounded.sort((a,b)=>b.start.distanceTo(b.end)-a.start.distanceTo(a.end))[0];
  const a=longest.joint.clone().sub(longest.start).normalize(),b=longest.end.clone().sub(longest.joint).normalize();
  assert.ok(a.dot(b)>Math.cos(25*Math.PI/180),'brief weight transfer never becomes a deep crouch');
  assert.ok(rig.leftFoot.y<=.211&&rig.rightFoot.y<=.211,'no exaggerated knee lift');
  const leftArm=rig.limbs.armL;
  assert.ok(leftArm.start.y-leftArm.end.y>.60,'arms swing downward beside the torso');
 }
});
