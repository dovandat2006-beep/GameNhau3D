import {STAGE_BPM,STAGE_AUDIENCE_RADIUS} from '../shared/social';
export type AudioSettings={music:number;stage:number;sfx:number;voice:number};
// Original short pentatonic composition, synthesized locally. No samples or recordings.
class TavernAudio {
 context:AudioContext|null=null;musicGain:GainNode|null=null;sfxGain:GainNode|null=null;ambience:AudioBufferSourceNode|null=null;
 settings:AudioSettings={music:.22,stage:.28,sfx:.3,voice:.8};timer:ReturnType<typeof setInterval>|null=null;step=0;speaking=false;
 stageGain:GainNode|null=null;stageTimer:ReturnType<typeof setInterval>|null=null;stageEpoch=0;stageOffset=0;stageAmount=0;lastStageStep=-1;
 start(){
  if(!this.context){
   this.context=new AudioContext();const c=this.context;
   this.musicGain=c.createGain();this.musicGain.connect(c.destination);
   this.stageGain=c.createGain();this.stageGain.connect(c.destination);this.stageTimer=setInterval(()=>this.stageSequence(),50);
   this.sfxGain=c.createGain();this.sfxGain.connect(c.destination);
   const buffer=c.createBuffer(1,c.sampleRate*3,c.sampleRate),d=buffer.getChannelData(0);
   // Soft filtered fan / street air, not a voice recording.
   for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*.12;
   const noise=c.createBufferSource();noise.buffer=buffer;noise.loop=true;
   const filter=c.createBiquadFilter();filter.type='lowpass';filter.frequency.value=240;
   const g=c.createGain();g.gain.value=.14;noise.connect(filter).connect(g).connect(this.sfxGain);noise.start();this.ambience=noise;
   this.timer=setInterval(()=>this.compose(),480);this.apply(this.settings);
  }
  void this.context.resume();
 }
 note(freq:number,time:number,duration:number,gain:number,dest:AudioNode,type:OscillatorType='triangle'){
  const c=this.context;if(!c)return;const o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.value=freq;
  g.gain.setValueAtTime(0,time);g.gain.linearRampToValueAtTime(gain,time+.008);g.gain.exponentialRampToValueAtTime(.0001,time+duration);
  o.connect(g).connect(dest);o.start(time);o.stop(time+duration+.05);
 }
 compose(){if(!this.context||!this.musicGain||this.context.state!=='running')return;
  const melody=[0,7,12,14,12,7,4,7,0,4,7,12,9,7,4,2,0,7,9,12,14,12,9,7,4,7,4,2,0,-1,-1,-1];
  const n=melody[this.step%melody.length],t=this.context.currentTime;
  if(n>=0)this.note(196*2**(n/12),t,1.4,.12,this.musicGain);
  if(this.step%4===0)this.note([98,110,130.81,98][Math.floor(this.step/8)%4],t,1.8,.13,this.musicGain,'sine');
  // Occasional original insect chirp, distant traffic swell and crockery click.
  if(this.sfxGain&&this.step%19===0){this.note(2600,t,.08,.012,this.sfxGain,'sine');this.note(2800,t+.13,.07,.009,this.sfxGain,'sine');}
  if(this.sfxGain&&this.step%37===0)this.note(90,t,3,.015,this.sfxGain,'sine');
  if(this.sfxGain&&this.step%29===0)this.note(1200,t,.15,.012,this.sfxGain,'sine');this.step++;
 }
 apply(s:AudioSettings){this.settings=s;if(!this.context)return;this.musicGain?.gain.setTargetAtTime(s.music*(1-this.stageAmount*.85)*(this.speaking?.35:1),this.context.currentTime,.45);this.stageGain?.gain.setTargetAtTime(s.stage*this.stageAmount*(this.speaking?.3:1),this.context.currentTime,.25);this.sfxGain?.gain.setTargetAtTime(s.sfx,this.context.currentTime,.1);}
 stageMix(epoch:number,serverNow:number,distance:number){
  if(this.stageEpoch!==epoch){this.stageEpoch=epoch;this.lastStageStep=-1;}
  this.stageOffset=serverNow-Date.now();const amount=epoch?Math.max(0,Math.min(1,(STAGE_AUDIENCE_RADIUS-distance)/(STAGE_AUDIENCE_RADIUS-5))):0;
  if(Math.abs(amount-this.stageAmount)>.01){this.stageAmount=amount;this.apply(this.settings);}
 }
 stageSequence(){
  const c=this.context,gain=this.stageGain;if(!c||!gain||c.state!=='running'||!this.stageEpoch||this.stageAmount<=0)return;
  const now=Date.now()+this.stageOffset,stepMs=60000/STAGE_BPM/4,current=Math.floor((now-this.stageEpoch)/stepMs);
  if(this.lastStageStep<current-1)this.lastStageStep=current;
  for(let step=this.lastStageStep+1;step<=current+2;step++){
   const delay=(this.stageEpoch+step*stepMs-now)/1000;if(delay<0||delay>.18)continue;
   const t=c.currentTime+delay,index=step%32;
   if(step%4===0){const o=c.createOscillator(),g=c.createGain();o.frequency.setValueAtTime(135,t);o.frequency.exponentialRampToValueAtTime(43,t+.13);g.gain.setValueAtTime(.42,t);g.gain.exponentialRampToValueAtTime(.0001,t+.20);o.connect(g).connect(gain);o.start(t);o.stop(t+.22);}
   if(step%8===4)this.note(185,t,.08,.12,gain,'triangle');
   if(step%2===0)this.note(6200,t,.025,.022,gain,'square');
   if(step%2===0){const notes=[0,0,7,3,0,10,7,3,5,5,12,8,5,3,7,10];this.note(55*2**(notes[Math.floor(index/2)]/12),t,.16,.15,gain,'triangle');}
   if(step%4===2)this.note([440,523.25,659.25,587.33][Math.floor(index/8)],t,.13,.045,gain,'sawtooth');
   this.lastStageStep=step;
  }
 }
 duck(speaking:boolean){this.speaking=speaking;this.apply(this.settings);}
 clap(distance=0){if(!this.context||!this.sfxGain)return;const c=this.context,duration=.08,buffer=c.createBuffer(1,Math.ceil(c.sampleRate*duration),c.sampleRate),data=buffer.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*Math.exp(-i/(c.sampleRate*.015));const source=c.createBufferSource(),gain=c.createGain();source.buffer=buffer;gain.gain.value=.12/(1+distance*.3);source.connect(gain).connect(this.sfxGain);source.start();}
 cheers(distance=0){if(!this.context||!this.sfxGain)return;const t=this.context.currentTime,g=.18/(1+distance*.4);this.note(1850,t,.7,g,this.sfxGain,'sine');this.note(2700,t+.055,.55,g*.45,this.sfxGain,'sine');}
 stop(){if(this.stageTimer)clearInterval(this.stageTimer);this.stageTimer=null;this.stageEpoch=0;this.stageAmount=0;this.lastStageStep=-1;if(this.timer)clearInterval(this.timer);this.timer=null;void this.context?.close();this.context=null;}
}
export const audio=new TavernAudio();
