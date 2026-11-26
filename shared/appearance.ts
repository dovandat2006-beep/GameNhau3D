export const COLORS=['#c65a43','#547f75','#d9b65b','#7187ae','#b386a1','#e8dfc6'] as const;
export const CHARACTERS=[
 {name:'Anh Hai',gender:'Nam',hair:'short',skin:'#e9b789',hairColor:'#322923',hairY:.235},
 {name:'Anh Ba',gender:'Nam',hair:'wave',skin:'#ce9875',hairColor:'#302923',hairY:.275},
 {name:'Chú Tư',gender:'Nam',hair:'glasses',skin:'#efc8a6',hairColor:'#4a4037',hairY:.235},
 {name:'Anh Năm',gender:'Nam',hair:'crop',skin:'#d4a37d',hairColor:'#272b29',hairY:.19},
 {name:'Chị Mai',gender:'Nữ',hair:'bob',skin:'#e9b789',hairColor:'#332820',hairY:.235},
 {name:'Chị Lan',gender:'Nữ',hair:'long',skin:'#ce9875',hairColor:'#423025',hairY:.235},
 {name:'Chị Vy',gender:'Nữ',hair:'pony',skin:'#efc8a6',hairColor:'#2d2a28',hairY:.235},
 {name:'Cô Sáu',gender:'Nữ',hair:'bun',skin:'#d4a37d',hairColor:'#514335',hairY:.235},
] as const;
export const FACES=[
 {name:'Tròn',x:1,y:1,eye:1,nose:1,mouth:1},
 {name:'Trái xoan',x:.91,y:1.04,eye:.85,nose:.85,mouth:.9},
 {name:'Góc cạnh',x:1.06,y:.94,eye:.80,nose:1.2,mouth:.95},
 {name:'Dài',x:.88,y:1.10,eye:.90,nose:1.15,mouth:.85},
 {name:'Bầu bĩnh',x:1.10,y:.94,eye:1.15,nose:.80,mouth:1.1},
 {name:'Cằm nhỏ',x:.89,y:.97,eye:1.20,nose:.85,mouth:.8},
] as const;
export type Appearance={avatar:number;face:number;height:number;weight:number;color:typeof COLORS[number]};
export const DEFAULT_APPEARANCE={avatar:0,face:0,height:1.7,weight:65,color:COLORS[0]};
/** Storage migration only; the server rejects invalid input instead of silently clamping it. */
export function normalizedAppearance(value:Partial<Appearance>):Appearance{
 return {avatar:Number.isInteger(value.avatar)&&value.avatar!>=0&&value.avatar!<CHARACTERS.length?value.avatar!:0,
  face:Number.isInteger(value.face)&&value.face!>=0&&value.face!<FACES.length?value.face!:0,
  height:Number.isFinite(value.height)?Math.max(1,Math.min(2,value.height!)):1.7,
  weight:Number.isFinite(value.weight)?Math.round(Math.max(40,Math.min(150,value.weight!))):65,
  color:COLORS.includes(value.color as typeof COLORS[number])?value.color!:COLORS[0]};
}
export function avatarDimensions(a:Partial<Appearance>){
 const character=CHARACTERS[a.avatar||0]||CHARACTERS[0],face=FACES[a.face||0]||FACES[0];
 const nativeHeight=1.118+.87+Math.max(.355*face.y,.17+character.hairY,character.hair==='bun'?.47:0);
 const scale=(a.height||1.7)/nativeHeight,width=.84+((a.weight||65)-40)/110*.48;
 return {scale,width,depth:Math.sqrt(width),seatOffset:1.27*(1-scale),seatLift:.52*(1-scale)};
}
