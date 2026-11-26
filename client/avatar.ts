import * as THREE from 'three';
import {CHARACTERS,FACES} from '../shared/appearance';
import {CHEERS_MS,WAVE_MS} from '../shared/world';
import {drunkLevel,gestureDuration,STAGE_BPM,type Gesture,type DanceStyle} from '../shared/social';
import type {LimbJoints,LimbName} from './limbs';

export const STRIDE_METRES=1.3;
export const RUN_STRIDE_METRES=1.5;
const unit=new THREE.Vector3(1,1,1),identity=new THREE.Quaternion(),zeroRotation=new THREE.Euler();
const smooth=(n:number)=>{const t=THREE.MathUtils.clamp(n,0,1);return t*t*(3-2*t);};
const capsule=new THREE.CapsuleGeometry(.5,1,4,10);capsule.scale(1,.5,1);
const sphere=new THREE.SphereGeometry(1,20,16);
const torso=new THREE.LatheGeometry([new THREE.Vector2(.68,-1),new THREE.Vector2(.83,-.85),new THREE.Vector2(.90,-.25),new THREE.Vector2(.98,.45),new THREE.Vector2(.95,.63),new THREE.Vector2(.75,.86),new THREE.Vector2(.32,1)],24);
const leftElbowPole=new THREE.Vector3(-1,-.65,.2),rightElbowPole=new THREE.Vector3(1,-.65,.2);
const mouthLocal=new THREE.Vector3(0,-.14,.268),rimLocal=new THREE.Vector3(0,.17,-.133);
const ikDirection=new THREE.Vector3(),ikBend=new THREE.Vector3();
const sole=new THREE.BoxGeometry(1,1,1,1,1,1);
const cylinder=new THREE.CylinderGeometry(1,1,1,16);
const glass=new THREE.CylinderGeometry(.135,.115,.34,20,1,true);
const rim=new THREE.TorusGeometry(.133,.012,5,20);rim.rotateX(Math.PI/2);
const handle=new THREE.TorusGeometry(.075,.018,6,16);
export const AVATAR_PARTS=[
 {key:'torso',geometry:torso,material:'shirt'}, {key:'hips',geometry:sphere,material:'pants'},
 {key:'neck',geometry:cylinder,material:'skin'}, {key:'head',geometry:sphere,material:'skin'},
 {key:'hair',geometry:sphere,material:'hair'}, {key:'hairBack',geometry:sphere,material:'hair'}, {key:'hairBun',geometry:sphere,material:'hair'},
 {key:'browL',geometry:capsule,material:'hair'}, {key:'browR',geometry:capsule,material:'hair'},
 {key:'earL',geometry:sphere,material:'skin'}, {key:'earR',geometry:sphere,material:'skin'},
 {key:'eyeL',geometry:sphere,material:'eye'}, {key:'eyeR',geometry:sphere,material:'eye'},
 {key:'nose',geometry:sphere,material:'skin'},
 {key:'mouth',geometry:sphere,material:'mouth'},
 {key:'cheekL',geometry:sphere,material:'blush'}, {key:'cheekR',geometry:sphere,material:'blush'},
 {key:'tipsy0',geometry:sphere,material:'spark'}, {key:'tipsy1',geometry:sphere,material:'spark'}, {key:'tipsy2',geometry:sphere,material:'spark'},
 {key:'glassesL',geometry:new THREE.TorusGeometry(.066,.009,5,16),material:'eye'},
 {key:'glassesR',geometry:new THREE.TorusGeometry(.066,.009,5,16),material:'eye'},
 {key:'glassesBridge',geometry:capsule,material:'eye'},
 {key:'handL',geometry:sphere,material:'skin'}, {key:'handR',geometry:sphere,material:'skin'},
 {key:'sandalL',geometry:sole,material:'shoe'}, {key:'sandalR',geometry:sole,material:'shoe'},
 {key:'toesL',geometry:sphere,material:'skin'}, {key:'toesR',geometry:sphere,material:'skin'},
 {key:'strapL',geometry:capsule,material:'shoe'}, {key:'strapR',geometry:capsule,material:'shoe'},
 {key:'mugGlass',geometry:glass,material:'glass'}, {key:'mugRim',geometry:rim,material:'glass'},
 {key:'mugHandle',geometry:handle,material:'glass'}, {key:'beer',geometry:cylinder,material:'beer'},
 {key:'foam',geometry:cylinder,material:'foam'},
 {key:'vomit0',geometry:sphere,material:'vomit'}, {key:'vomit1',geometry:sphere,material:'vomit'}, {key:'vomit2',geometry:sphere,material:'vomit'}, {key:'vomit3',geometry:sphere,material:'vomit'},
 {key:'cigarette',geometry:cylinder,material:'paper'}, {key:'ember',geometry:sphere,material:'ember'},
 {key:'smoke0',geometry:sphere,material:'smoke'}, {key:'smoke1',geometry:sphere,material:'smoke'}, {key:'smoke2',geometry:sphere,material:'smoke'},
] as const;
export type PartKey=typeof AVATAR_PARTS[number]['key'];
export type PoseInput={phase:number;motion:number;seated:boolean;cheers:number|null;wave:number|null;time:number;avatar:number;face?:number;running?:boolean;lying?:boolean;reduced:boolean;carry?:boolean;intoxication?:number;gesture?:Gesture|null;gestureTime?:number|null;dance?:DanceStyle|null;danceTime?:number};

/** Internal two-bone IK. The pole keeps elbows out/down and knees forward. */
export function jointBetween(root:THREE.Vector3,end:THREE.Vector3,upper:number,lower:number,bend:number,out=new THREE.Vector3(),pole?:THREE.Vector3){
 ikDirection.copy(end).sub(root);const length=Math.max(.00001,ikDirection.length());ikDirection.multiplyScalar(1/length);
 const distance=THREE.MathUtils.clamp(length,Math.abs(upper-lower)+.00001,upper+lower-.00001);
 const along=(upper*upper-lower*lower+distance*distance)/(2*distance);
 const height=Math.sqrt(Math.max(0,upper*upper-along*along));
 if(pole)ikBend.copy(pole);else ikBend.set(0,0,bend);
 ikBend.addScaledVector(ikDirection,-ikBend.dot(ikDirection));
 if(ikBend.lengthSq()<.000001)ikBend.set(1,0,0).addScaledVector(ikDirection,-ikDirection.x);
 ikBend.normalize();return out.copy(root).addScaledVector(ikDirection,along).addScaledVector(ikBend,height);
}

/** Reusable articulated rig; outputs matrices for shared instanced meshes. */
export class AvatarRig {
 readonly matrices=Object.fromEntries(AVATAR_PARTS.map(p=>[p.key,new THREE.Matrix4()])) as Record<PartKey,THREE.Matrix4>;
 readonly leftFoot=new THREE.Vector3();readonly rightFoot=new THREE.Vector3();
 readonly rightHand=new THREE.Vector3();readonly cupPosition=new THREE.Vector3();
 readonly smokeContact=new THREE.Vector3();readonly smokeTip=new THREE.Vector3();
 readonly mouthPosition=new THREE.Vector3();readonly cupRimContact=new THREE.Vector3();readonly cupRotation=new THREE.Quaternion();
 readonly limbs:Record<LimbName,LimbJoints>;
 drinking=false;
 cupInHand=false;cupVisible=false;
 private body=new THREE.Object3D();private head=new THREE.Object3D();
 private child=new THREE.Object3D();private cupMatrix=new THREE.Matrix4();private idleHand=new THREE.Vector3();private raised=new THREE.Vector3(.49,1.60,.64);private extended=new THREE.Vector3(.42,1.60,.72);
 private tmp=new THREE.Object3D();private v=new THREE.Vector3();private lipCup=new THREE.Vector3();private toastCup=new THREE.Vector3();private sipRotation=new THREE.Euler();
 private shoulderL=new THREE.Vector3();private shoulderR=new THREE.Vector3();
 private elbowL=new THREE.Vector3();private elbowR=new THREE.Vector3();private handL=new THREE.Vector3();
 private hipL=new THREE.Vector3();private hipR=new THREE.Vector3();private kneeL=new THREE.Vector3();private kneeR=new THREE.Vector3();
 private lyingRotation=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),-Math.PI/2);
 private lyingMatrix=new THREE.Matrix4().compose(new THREE.Vector3(0,.37,1.2),this.lyingRotation,new THREE.Vector3(1,1,1));
 private faceMouth=new THREE.Vector3();
 private smokeDirection=new THREE.Vector3();private smokeRotation=new THREE.Quaternion();private smokeCenter=new THREE.Vector3();
 private restGrip=new THREE.Vector3();private actionTarget=new THREE.Vector3();
 private tableGrip=new THREE.Vector3(.39,1.47,.79);private cupOffset=new THREE.Vector3(-.15,-.025,0);
 constructor(){
  this.limbs={armL:{start:this.shoulderL,joint:this.elbowL,end:this.handL},armR:{start:this.shoulderR,joint:this.elbowR,end:this.rightHand},legL:{start:this.hipL,joint:this.kneeL,end:this.leftFoot},legR:{start:this.hipR,joint:this.kneeR,end:this.rightFoot}};
 }

 private put(key:PartKey,p:THREE.Vector3,scale:readonly number[],rotation?:THREE.Quaternion){
  this.tmp.position.copy(p);this.tmp.scale.set(scale[0],scale[1],scale[2]);this.tmp.quaternion.copy(rotation||identity);this.tmp.updateMatrix();this.matrices[key].copy(this.tmp.matrix);
 }
 private local(key:PartKey,node:THREE.Object3D,p:readonly number[],scale:readonly number[],rotation?:THREE.Euler){
  this.tmp.position.set(p[0],p[1],p[2]);this.tmp.scale.set(scale[0],scale[1],scale[2]);this.tmp.rotation.copy(rotation||zeroRotation);this.tmp.updateMatrix();this.matrices[key].multiplyMatrices(node.matrix,this.tmp.matrix);
 }
 private foot(phase:number,motion:number,seated:boolean,x:number,out:THREE.Vector3,running=false){
  if(seated)return out.set(x,.10,.53);
  const u=((phase/(Math.PI*2))%1+1)%1,duty=.54,reach=(running?RUN_STRIDE_METRES:STRIDE_METRES)*duty/2;
  const z=u<duty?reach-u/duty*reach*2:-reach+smooth((u-duty)/(1-duty))*reach*2;
  const lift=u<duty?0:Math.sin((u-duty)/(1-duty)*Math.PI)*(running?.18:.11);
  return out.set(x,.10+lift*motion,z*motion);
 }
 private standingHipHeight(){
  // Extend the supporting leg; respect the free foot reach during weight transfer.
  const reach=1.018;let height=Infinity;
  for(const [foot,hipX] of [[this.leftFoot,-.145],[this.rightFoot,.145]] as const){
   const horizontal=foot.z*foot.z+(foot.x-hipX)**2;
   height=Math.min(height,foot.y+Math.sqrt(Math.max(.01,reach*reach-horizontal)));
  }
  return Number.isFinite(height)?height:1.118;
 }
 sample(input:PoseInput){
  const {seated,cheers,wave,time,avatar,reduced}=input;
  const lying=!!input.lying&&!seated,phase=lying?0:input.phase,motion=lying?0:input.motion;
  const character=CHARACTERS[avatar]||CHARACTERS[0],face=FACES[input.face||0]||FACES[0],female=character.gender==='Nữ',fx=face.x*(female?.94:1);
  const running=!!input.running&&!lying&&!seated&&drunkLevel(input.intoxication||0)<10;
  const level=drunkLevel(input.intoxication||0),crawling=level===10&&!seated&&!lying,carry=!!input.carry&&!crawling&&!lying,intensity=level/10,dance=input.dance&&!seated&&!carry&&!crawling&&!lying?input.dance:null;
  const beat=(input.danceTime||0)*STAGE_BPM/60,groove=beat*Math.PI*2;
  const gesture=lying?null:crawling&&input.gesture!=='vomit'?null:input.gesture,et=input.gestureTime??-1,gestureActive=gesture&&et>=0&&et<gestureDuration(gesture)/1000;
  const gestureEnvelope=gestureActive?smooth(et/.25)*(1-smooth((et-gestureDuration(gesture)/1000+.25)/.25)):0;
  const vomiting=gestureActive&&gesture==='vomit'&&level>=5&&!carry;
  const retch=vomiting?smooth(et/.55)*(1-smooth((et-3.6)/.6)):0;
  const cheering=!lying&&!vomiting&&!crawling&&(seated||carry)&&cheers!==null&&cheers>=0&&cheers<CHEERS_MS/1000;
  const t=cheers||0,breath=reduced?0:Math.sin(time*1.8)*.006;
  const reach=cheering?(t<.5?smooth(t/.5):t<3.3?1:1-smooth((t-3.3)/.3)):0;
  this.drinking=cheering&&t>=2.15&&t<=2.85;
  this.foot(phase,motion,seated,-.15,this.leftFoot,running);this.foot(phase+Math.PI,motion,seated,.15,this.rightFoot,running);
  if(dance){
   for(const [foot,side] of [[this.leftFoot,-1],[this.rightFoot,1]] as const){
    const step=Math.sin(groove+(side===1?Math.PI:0));
    foot.set(side*.15,.10,0);
    if(dance==='shuffle'){foot.x+=Math.sin(groove*.5)*.06;foot.z=step*.17;foot.y+=Math.max(0,step)*.075;}
    else if(dance==='disco'){foot.z=step*.04;foot.y+=Math.max(0,step)*.035;}
    else if(dance==='robot'){foot.z=(Math.floor(beat*2)%2===0?side:-side)*.06;foot.y+=Math.max(0,step)*.025;}
    else if(dance==='hiphop'){foot.x=side*(.23+.07*Math.sin(groove));foot.z=step*.23;foot.y+=Math.max(0,step)*.20;}
    else if(dance==='krump'){foot.x=side*(.27+.07*Math.abs(step));foot.z=step*.10;foot.y+=Math.max(0,step)*.13;}
    else if(dance==='runningman'){foot.z=step*.34;foot.y+=Math.max(0,step)*.26;}
    else foot.x=side*.21;
   }
  }
  if(crawling)for(const [foot,side] of [[this.leftFoot,-1],[this.rightFoot,1]] as const){
   const step=Math.sin(phase+(side===1?Math.PI:0));foot.set(side*.23,.10+Math.max(0,step)*.04*motion,-.45+step*.12*motion);
  }
  const danceDip=dance==='hiphop'?.10+.10*(.5+.5*Math.cos(groove)):dance==='krump'?.08+.14*Math.abs(Math.sin(groove)):dance==='runningman'?.04:dance==='sway'?.025:0;
  const hipY=seated?.75:crawling?.56:this.standingHipHeight()-danceDip-retch*.12;
  this.body.position.set(0,hipY+breath,seated?.06:0);
  this.body.rotation.set((seated?.07:motion*(running?.10:.025))+reach*.19,Math.sin(phase)*motion*.025,reduced?0:Math.sin(phase)*motion*.006);
  if(dance){this.body.rotation.z+=Math.sin(groove)*(dance==='sway'?.065:.025);this.body.rotation.y+=dance==='robot'?(Math.floor(beat*2)%2?-.10:.10):Math.sin(groove)*.08;}
  if(dance==='hiphop'||dance==='krump'||dance==='runningman'){this.body.rotation.x+=Math.sin(groove)*.13;this.body.rotation.y+=Math.sin(groove*.5)*.20;this.body.rotation.z+=Math.sin(groove)*.06;}
  if(!reduced)this.body.rotation.z+=Math.sin(time*.9)*intensity*.010;
  if(!reduced&&level>1&&!crawling){this.body.rotation.z+=Math.sin(time*(running?3.5:2.4))*(running?.025*level:.012+(level-1)*.012);this.body.rotation.x+=Math.cos(time*1.8)*(level-1)*.005;}
  if(crawling)this.body.rotation.set(1.35,0,reduced?0:Math.sin(phase)*motion*.025);
  if(vomiting&&!crawling)this.body.rotation.x+=retch*(.55+(reduced?0:Math.sin(et*12)*.025));
  if(lying)this.body.rotation.set(0,0,0);
  this.body.scale.copy(unit);this.body.updateMatrix();
  this.local('hips',this.body,[0,.02,0],[female?.255:.245,.17,.18]);
  this.local('torso',this.body,[0,.32,0],[female?.28:.30,.345,.19]);
  this.local('neck',this.body,[0,.65,0],[.095,.12,.095]);
  this.head.position.set(0,.87,.005);this.head.rotation.set(cheering?-.055*smooth((t-2.15)/.2)*(1-smooth((t-2.65)/.2)):0,reduced?0:Math.sin(time*.65)*.035*(1-reach),0);if(gesture==='nod')this.head.rotation.x+=Math.sin(et*10)*.18*gestureEnvelope;if(gesture==='shake')this.head.rotation.y+=Math.sin(et*10)*.25*gestureEnvelope;
  if(vomiting)this.head.rotation.x+=retch*(.12+(reduced?0:Math.sin(et*12)*.035));
  if(lying)this.head.rotation.set(0,0,0);
  this.head.scale.copy(unit);this.head.updateMatrix();
  this.head.matrix.premultiply(this.body.matrix);
  this.local('head',this.head,[0,0,0],[.315*fx,.355*face.y,.29]);
  this.local('hair',this.head,[0,.17,-.057],[(character.hair==='glasses'?.345:.322)*fx,character.hairY,.287]);
  const back=character.hair==='bob'?[.31*fx,.30,.20]:character.hair==='long'?[.30*fx,.52,.16]:character.hair==='pony'?[.15,.34,lying?.12:.15]:[0,0,0];
  this.local('hairBack',this.head,[lying&&character.hair==='pony'?.18:0,character.hair==='long'?-.30:-.08,character.hair==='pony'?(lying?-.15:-.39):-.17],back);
  this.local('hairBun',this.head,[0,.31,lying?-.20:-.23],character.hair==='bun'?[.16,.16,lying?.08:.15]:[0,0,0]);
  this.local('browL',this.head,[-.105*fx,.105*face.y,.278],[.085,.016,.015],new THREE.Euler(0,0,-.08));
  this.local('browR',this.head,[.105*fx,.105*face.y,.278],[.085,.016,.015],new THREE.Euler(0,0,.08));
  this.local('earL',this.head,[-.312*fx,-.015,0],[.057,.085,.05]);this.local('earR',this.head,[.312*fx,-.015,0],[.057,.085,.05]);
  this.local('eyeL',this.head,[-.105*fx,.025*face.y,.275],[(character.hair==='glasses'?.047:.028)*face.eye,.038,.018]);
  this.local('eyeR',this.head,[.105*fx,.025*face.y,.275],[(character.hair==='glasses'?.047:.028)*face.eye,.038,.018]);
  this.local('nose',this.head,[0,-.055,.293],[.033*face.nose,.034*face.nose,.035*face.nose]);
  this.faceMouth.copy(mouthLocal);this.faceMouth.y*=face.y;this.local('mouth',this.head,this.faceMouth.toArray(),[.044*face.mouth,.012,.008]);
  const cheek=level?Math.min(1,.35+level*.065):0;this.local('cheekL',this.head,[-.18,-.07,.247],[.065*cheek,.035*cheek,.009*cheek]);this.local('cheekR',this.head,[.18,-.07,.247],[.065*cheek,.035*cheek,.009*cheek]);
  for(let i=0;i<3;i++){const a=i*Math.PI*2/3+(reduced?0:time*.8);this.local(`tipsy${i}` as PartKey,this.head,[Math.cos(a)*.4,.45+Math.sin(a)*.04,Math.sin(a)*.2],level>=3?[.018+level*.002,.018+level*.002,.018+level*.002]:[0,0,0]);}
  this.mouthPosition.copy(this.faceMouth).applyMatrix4(this.head.matrix);
  const glassesScale=character.hair==='glasses'?1:0;
  this.local('glassesL',this.head,[-.105*fx,.025*face.y,.3],[glassesScale,glassesScale,glassesScale]);
  this.local('glassesR',this.head,[.105*fx,.025*face.y,.3],[glassesScale,glassesScale,glassesScale]);
  this.local('glassesBridge',this.head,[0,.025,.3],[.012*glassesScale,.08*glassesScale,.012*glassesScale],new THREE.Euler(0,0,Math.PI/2));
  this.hipL.set(-.145,hipY,0);this.hipR.set(.145,hipY,0);
  jointBetween(this.hipL,this.leftFoot,.50,.52,1,this.kneeL);jointBetween(this.hipR,this.rightFoot,.50,.52,1,this.kneeR);
  for(const side of ['L','R'] as const){
   const foot=side==='L'?this.leftFoot:this.rightFoot;
   this.v.set(foot.x,foot.y-.06,foot.z+.065);this.put(`sandal${side}`,this.v,[.23,.055,.39]);
   this.v.set(foot.x,foot.y-.016,foot.z+.115);this.put(`toes${side}`,this.v,[.094,.035,.13]);
   this.v.set(foot.x,foot.y+.015,foot.z+.065);this.put(`strap${side}`,this.v,[.215,.035,.08]);
  }
  this.shoulderL.set(-.28,.53,.015).applyMatrix4(this.body.matrix);this.shoulderR.set(.28,.53,.015).applyMatrix4(this.body.matrix);
  if(seated){
   this.handL.set(-.34,hipY-.02,.345);this.rightHand.set(.34,hipY-.02,.345);
  }else{
   const swing=Math.cos(phase)*motion*(running?.24:.14),armReach=.638-motion*.004;
   for(const side of ['L','R'] as const){
    const shoulder=side==='L'?this.shoulderL:this.shoulderR,hand=side==='L'?this.handL:this.rightHand;
    const dx=side==='L'?-.025:.025,dz=side==='L'?-swing:swing;
    hand.set(shoulder.x+dx,shoulder.y-Math.sqrt(armReach*armReach-dx*dx-dz*dz),shoulder.z+dz);
   }
  }
  if(dance){
   for(const [hand,shoulder,side] of [[this.handL,this.shoulderL,-1],[this.rightHand,this.shoulderR,1]] as const){
    const s=Math.sin(groove+(side===1?Math.PI:0));
    if(dance==='shuffle')hand.set(shoulder.x+side*.08,shoulder.y-.38,shoulder.z+s*.20);
    else if(dance==='disco')hand.set(shoulder.x+side*.25,shoulder.y+s*.33,shoulder.z+.10);
    else if(dance==='robot')hand.set(shoulder.x+side*.27,shoulder.y+(Math.floor(beat*2)%2===0?-.12:.08),shoulder.z+.32);
    else if(dance==='hiphop')hand.set(shoulder.x+side*(.24+.12*s),shoulder.y-.10+s*.26,shoulder.z+.32);
    else if(dance==='krump'){const punch=Math.max(0,s);hand.set(shoulder.x+side*(.15+.15*punch),shoulder.y-.20+.32*punch,shoulder.z+.15+.35*punch);}
    else if(dance==='runningman')hand.set(shoulder.x+side*.08,shoulder.y-.24+s*.19,shoulder.z+.20+s*.29);
    else hand.set(shoulder.x+side*.16,shoulder.y-.26+Math.sin(groove)*.05,shoulder.z+.30);
   }
  }
  if(crawling){
   this.handL.set(-.33,.12+Math.max(0,-Math.sin(phase))*.05*motion,.72-Math.sin(phase)*.09*motion);
   this.rightHand.set(.33,.12+Math.max(0,Math.sin(phase))*.05*motion,.72+Math.sin(phase)*.09*motion);
  }
  if(vomiting&&!crawling){
   this.actionTarget.set(-.12,.30,.22).applyMatrix4(this.body.matrix);this.handL.lerp(this.actionTarget,retch);
   this.rightHand.lerp(this.actionTarget.set(this.shoulderR.x,this.shoulderR.y-.48,this.shoulderR.z+.15),retch);
  }
  if(lying){this.handL.set(-.12,hipY+.32,.32);this.rightHand.set(.12,hipY+.32,.32);}
  if(carry)this.rightHand.set(.36,seated?1.28:1.40,.36);
  this.restGrip.copy(carry?this.rightHand:this.tableGrip);
  this.cupVisible=seated||carry;this.cupInHand=carry||cheering&&t>=.5&&t<3.3;
  this.cupRotation.identity();this.cupPosition.copy(this.restGrip).add(this.cupOffset);
  this.lipCup.copy(this.mouthPosition).sub(rimLocal);
  if(cheering){
   const idle=this.idleHand.copy(this.rightHand);
   if(t<.5)this.rightHand.lerpVectors(idle,this.restGrip,smooth(t/.5));
   else if(t<1.1)this.rightHand.lerpVectors(this.restGrip,this.raised,smooth((t-.5)/.6));
   else if(t<1.85)this.rightHand.lerpVectors(this.raised,this.extended,smooth((t-1.1)/.75));
   else if(t<2.15){
    this.toastCup.copy(this.extended).add(this.cupOffset);
    this.cupPosition.lerpVectors(this.toastCup,this.lipCup,smooth((t-1.85)/.3));
   }else if(t<=2.85){
    const tilt=t<2.45?smooth((t-2.15)/.3):t<2.65?1:1-smooth((t-2.65)/.2);
    this.cupRotation.setFromEuler(this.sipRotation.set(-tilt*1.05,0,0));
    // Rotate around the actual lip contact, not around the glass center/face.
    this.v.copy(rimLocal).applyQuaternion(this.cupRotation);
    this.cupPosition.copy(this.mouthPosition).sub(this.v);
   }else if(t<3.3){
    this.toastCup.copy(this.restGrip).add(this.cupOffset);
    this.cupPosition.lerpVectors(this.lipCup,this.toastCup,smooth((t-2.85)/.45));
   }else this.rightHand.lerpVectors(this.restGrip,idle,smooth((t-3.3)/.3));
   if(this.cupInHand){
    if(t<1.85)this.cupPosition.copy(this.rightHand).add(this.cupOffset);
    else this.rightHand.copy(this.cupPosition).sub(this.v.copy(this.cupOffset).applyQuaternion(this.cupRotation));
   }
  }else if(!lying&&!crawling&&wave!==null&&wave>=0&&wave<WAVE_MS/1000){
   const envelope=smooth(wave/.3)*(1-smooth((wave-WAVE_MS/1000+.4)/.4));
   if(carry)this.handL.lerp(this.v.set(-.51-Math.sin(wave*12)*.12,1.98,.05),envelope);else this.rightHand.lerp(this.v.set(.51+Math.sin(wave*12)*.12,1.98,.05),envelope);
  }
  if(gestureActive&&gesture==='clap'&&!carry){
   const gap=.075+.17*(.5+.5*Math.cos(et*Math.PI*6));
   this.handL.lerp(this.actionTarget.set(-gap,this.shoulderL.y-.25,this.shoulderL.z+.38),gestureEnvelope);
   this.rightHand.lerp(this.actionTarget.set(gap,this.shoulderR.y-.25,this.shoulderR.z+.38),gestureEnvelope);
  }
  if(gestureActive&&gesture==='invite'&&carry){const lift=Math.sin(et/2*Math.PI);this.rightHand.y+=.18*lift;this.rightHand.z+=.18*lift;}
  if(carry&&!cheering)this.cupPosition.copy(this.rightHand).add(this.cupOffset);
  const smoking=gestureActive&&gesture==='smoke'&&!carry;
  this.smokeDirection.set(0,0,1).transformDirection(this.head.matrix);
  this.smokeRotation.setFromUnitVectors(this.v.set(0,1,0),this.smokeDirection);
  if(smoking){
   const lift=smooth(et/.8)*(1-smooth((et-2.9)/.8));
   this.actionTarget.copy(this.mouthPosition).addScaledVector(this.smokeDirection,.12);this.actionTarget.y-=.025;
   this.rightHand.lerp(this.actionTarget,lift);
  }
  this.smokeCenter.copy(this.rightHand).addScaledVector(this.smokeDirection,-.02);this.smokeCenter.y+=.025;
  this.smokeContact.copy(this.smokeCenter).addScaledVector(this.smokeDirection,-.10);
  this.smokeTip.copy(this.smokeCenter).addScaledVector(this.smokeDirection,.10);
  this.put('cigarette',this.smokeCenter,smoking?[.012,.20,.012]:[0,0,0],this.smokeRotation);
  this.put('ember',this.smokeTip,smoking?[.014,.014,.014]:[0,0,0]);
  for(let i=0;i<3;i++){
   const age=et-(3.4+i*.12),progress=THREE.MathUtils.clamp(age/1.1,0,1),visible=smoking&&age>=0&&age<1.1&&!reduced;
   // Exhale from the mouth after the hand lowers; clouds travel forward, rise and dissipate.
   this.v.copy(this.mouthPosition).addScaledVector(this.smokeDirection,.035+progress*.65);this.v.y+=progress*.22;this.v.x+=Math.sin(progress*4+i)*progress*.045;
   const size=visible?(.035+progress*.10)*smooth(age/.12)*(1-smooth((progress-.65)/.35)):0;
   this.put(`smoke${i}` as PartKey,this.v,[size*1.25,size*.85,size*1.5]);
  }
  // Brief stylized droplets leave the mouth and disappear above the floor; no persistent puddles.
  for(let i=0;i<4;i++){
   const progress=((et-1.05+i*.18)%.75+.75)%.75/.75,visible=vomiting&&et>1.05&&et<3.35&&(!reduced||i===0);
   this.v.copy(this.mouthPosition);this.v.x+=Math.sin(i*2.4)*progress*.035;this.v.z+=progress*.28;
   this.v.y=Math.max(.04,this.v.y-(.25*progress+.9*progress*progress)*(this.v.y-.04)/1.15);
   const size=visible?.024*(.7+Math.sin(progress*Math.PI)*.3):0;this.put(`vomit${i}` as PartKey,this.v,[size,size*(1.5+progress),size]);
  }
  jointBetween(this.shoulderL,this.handL,.32,.32,-1,this.elbowL,leftElbowPole);
  jointBetween(this.shoulderR,this.rightHand,.32,.32,-1,this.elbowR,rightElbowPole);
  this.put('handL',this.handL,[.071,.095,.06]);this.put('handR',this.rightHand,[.071,.095,.06],this.cupInHand?this.cupRotation:identity);
  this.cupRimContact.copy(rimLocal).applyQuaternion(this.cupRotation).add(this.cupPosition);
  const cupScale=this.cupVisible?1:0;
  const cupNode=this.tmp;cupNode.position.copy(this.cupPosition);cupNode.quaternion.copy(this.cupRotation);cupNode.scale.setScalar(cupScale);cupNode.updateMatrix();const cupMatrix=this.cupMatrix.copy(cupNode.matrix);
  for(const key of ['mugGlass','mugRim','mugHandle','beer','foam'] as const){
   const child=this.child;child.position.set(0,0,0);child.rotation.set(0,0,0);child.scale.setScalar(1);
   if(key==='mugRim')child.position.y=.17;
   if(key==='mugHandle'){child.position.set(.173,0,0);child.scale.set(1,1.25,1);}
   if(key==='beer'){child.position.y=-.025;child.scale.set(.113,.245,.113);}
   if(key==='foam'){child.position.y=.107;child.scale.set(.116,.025,.116);}
   child.updateMatrix();this.matrices[key].multiplyMatrices(cupMatrix,child.matrix);
  }
  if(lying){
   for(const part of AVATAR_PARTS)this.matrices[part.key].premultiply(this.lyingMatrix);
   const points=new Set([this.mouthPosition,this.cupPosition,this.cupRimContact,this.smokeContact,this.smokeTip,...Object.values(this.limbs).flatMap(j=>[j.start,j.joint,j.end])]);
   for(const point of points)point.applyMatrix4(this.lyingMatrix);
  }
  return this;
 }
}
