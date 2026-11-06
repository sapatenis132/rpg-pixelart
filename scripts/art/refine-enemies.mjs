/**
 * Enemy/Sentinela pixel art source. Each frame is authored on the original
 * 32x48 integer grid: 8 views, four poses, seven visual states. The compact
 * and legacy sheets are built from the same source, so fallback art retains
 * the same identity. No simulation, animation timing or gameplay data lives
 * here. Run from the repository root: node scripts/art/refine-enemies.mjs
 */
import {createCanvas,loadImage} from '@napi-rs/canvas';
import {writeFile,mkdir} from 'node:fs/promises';

const profiles={
 enemy:{name:'Saqueador',width:13,skin:'#ce9b72',skinHi:'#f0c191',skinShade:'#986451',cloth:'#96525b',clothHi:'#ca7771',clothShade:'#5c3548',metal:'#9cafb0',metalHi:'#d1dad0',metalShade:'#566874',hair:'#4c3540',hairHi:'#80554a',gold:'#d6a35c',leather:'#77513d',dark:'#24303b'},
 duelist:{name:'Duelista',width:11,skin:'#c99a86',skinHi:'#edc9a4',skinShade:'#977169',cloth:'#66538c',clothHi:'#a186ba',clothShade:'#3c355d',metal:'#9da6c2',metalHi:'#d8d7e1',metalShade:'#566080',hair:'#352e4c',hairHi:'#62506d',gold:'#d5b77a',leather:'#5d4553',dark:'#242638'},
 berserker:{name:'Berserker',width:19,skin:'#bd8268',skinHi:'#e5af7b',skinShade:'#825445',cloth:'#a44e42',clothHi:'#db8059',clothShade:'#66353a',metal:'#9e9584',metalHi:'#ddd1aa',metalShade:'#5e6565',hair:'#663b33',hairHi:'#a36343',gold:'#d4ad66',leather:'#6f4d37',dark:'#2e2a30'},
 guardian:{name:'Guardião',width:18,skin:'#b78d7c',skinHi:'#e1b99b',skinShade:'#806766',cloth:'#3c7581',clothHi:'#78b1b1',clothShade:'#2d4e62',metal:'#8fa9b5',metalHi:'#c9d7d3',metalShade:'#51677e',hair:'#35475b',hairHi:'#64788c',gold:'#d1b879',leather:'#685049',dark:'#24303e'},
 elite:{name:'Sentinela',width:20,skin:'#94869e',skinHi:'#cbb5cf',skinShade:'#655d7c',cloth:'#635175',clothHi:'#a284aa',clothShade:'#3e354f',metal:'#788a9e',metalHi:'#bbc6c9',metalShade:'#465369',hair:'#353245',hairHi:'#625772',gold:'#d7af5f',leather:'#5d454f',dark:'#242835'}
};
const views=[['quarter',1],['front',0],['quarter',-1],['profile',-1],['backQuarter',-1],['back',0],['backQuarter',1],['profile',1]];
const stateNames=['walk','attack','guard','dodge','hurt','down','finisher'];
function makeFrame(id,dir,state,frame){
 const p=profiles[id],c=createCanvas(32,48),g=c.getContext('2d');
 g.imageSmoothingEnabled=false;
 const [view,side]=views[dir],back=view.startsWith('back'),profile=view==='profile';
 const wide=id==='berserker'||id==='guardian'||id==='elite';
 const feet=[0,1,0,-1][frame],walking=state===0;
 const bob=walking?[0,1,0,1][frame]:state===2?[0,0,1,0][frame]:
  state===3?[1,3,2,0][frame]:state===4?[0,1,1,0][frame]:0;
 const drive=(state===1||state===6)?([0,-1,1,0][frame])*(side||1):
  state===3?[0,-1,1,0][frame]*(side||1):state===4?[-1,-1,0,0][frame]*(side||1):0;
 g.translate(drive,bob);
 const R=(x,y,w,h,col)=>{g.fillStyle=col;g.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));};
 const P=(pts,col)=>{g.fillStyle=col;g.beginPath();pts.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.closePath();g.fill();};
 const line=(x,y,w,col)=>R(x,y,w,1,col);
 const x=16-Math.floor(p.width/2)+(profile?side:0),w=profile?Math.ceil(p.width*.76):p.width;
 const cx=x+w/2,headX=Math.round(cx-(wide?6:5)+(profile?side:0)),headW=profile?8:wide?12:10;
 const hy=id==='duelist'?8:9,torsoY=23;
 // Cloaks sit behind the hips and shoulders, never hide the feet. Their
 // folds are deliberate 2-3px clusters rather than per-pixel texture.
 if(['duelist','guardian','elite'].includes(id)){
  const flare=(state===1||state===6)&&frame===2?2:state===3?2:0;
  const hem=id==='duelist'?43:id==='elite'?44:38;
  P([[x-1,22],[x+w,22],[x+w+2+flare,hem-1],[x+w-2,hem],[cx,hem-2],[x-3-flare,hem]],p.dark);
  P([[x,23],[x+w-1,23],[x+w+flare,hem-2],[cx+1,hem-3],[cx-1,hem-1],[x-1-flare,hem-2]],p.clothShade);
  R(x+1,27,2,hem-30,p.cloth);R(x+3,31,1,hem-34,p.clothHi);
  R(x+w-3,27,1,hem-29,p.cloth);line(x,hem-3,4,p.gold);
 }
 // Legs and boots: alternating knees remain distinct from the pelvis.
 const legW=id==='berserker'?6:wide?5:4,spread=wide?5:4;
 const ly=walking?feet:0,ry=walking?-feet:0;
 const left=Math.round(cx-spread-legW/2),right=Math.round(cx+spread-legW/2);
 for(const [lx,dy,near] of [[left,ly,false],[right,ry,true]]){
  R(lx-1,34,legW+2,10,p.dark);R(lx,35,legW,7,near?p.metalShade:p.clothShade);
  R(lx,36,1,5,near?p.metal:p.cloth);R(lx+1,38,legW-1,1,p.dark);
  R(lx-1,42+dy,legW+3,4,p.dark);R(lx,42+dy,legW+1,2,p.leather);
  R(lx,42+dy,legW,1,wide?p.metal:p.metalShade);R(lx,45+dy,legW+1,1,'#141f2a');
 }
 // Rear arm is darker and a pixel shorter, giving a readable overlap.
 let armY=26,armEnd=35;
 if(state===1||state===6){armY=frame===1?21:frame===2?25:26;armEnd=frame===1?27:frame===2?29:34;}
 if(state===6){armY=[23,18,23,26][frame];armEnd=[30,25,28,34][frame];}
 if(state===2){armY=[25,24,24,25][frame];armEnd=[31,29,30,31][frame];}
 if(state===3){armY=[26,27,29,26][frame];armEnd=[33,31,32,34][frame];}
 if(state===4){armY=[24,26,27,26][frame];armEnd=[34,36,36,35][frame];}
 const armW=wide?5:3,farX=side<0?x+w:x-armW;
 R(farX,armY,armW,armEnd-armY,p.dark);R(farX+1,armY+1,armW-2,armEnd-armY-2,p.clothShade);
 R(farX+1,armEnd-1,Math.max(2,armW-2),3,p.skinShade);
 // Chest armour/tunic: outline + lit shoulder + broad shadow plane.
 P([[x+1,22],[x+w-2,22],[x+w,25],[x+w,35],[x+w-2,37],[x,36],[x-1,25]],p.dark);
 P([[x+1,24],[x+w-2,24],[x+w-1,26],[x+w-1,34],[x+1,35]],back?p.clothShade:p.cloth);
 R(x+1,25,2,8,p.clothHi);R(x+w-4,25,3,9,p.clothShade);
 if(back){
  R(Math.round(cx)-1,25,2,9,p.cloth);line(x+3,26,w-6,p.clothHi);
  if(id==='enemy'){R(x+3,25,3,8,p.leather);R(x+3,25,1,8,p.gold);}
 }else if(id==='enemy'){
  // Cross-body strap, red neckerchief, single metal shoulder and pouch.
  for(let q=0;q<8;q++)R(x+2+Math.floor(q*.75),24+q,2,2,p.leather);
  R(x+2,23,w-4,2,p.clothHi);R(x+3,25,3,2,p.clothShade);
  R(x+1,29,3,4,p.metalShade);R(x+1,29,2,1,p.metalHi);
  R(x+w-4,32,4,5,p.leather);R(x+w-3,32,2,1,p.gold);
 }else if(id==='duelist'){
  R(Math.round(cx)-1,24,2,10,p.clothShade);R(Math.round(cx)-2,24,1,10,p.gold);
  for(let q=0;q<3;q++)R(Math.round(cx)+1,26+q*3,1,1,p.metalHi);
  P([[x+1,23],[cx,28],[x+3,29]],p.clothHi);P([[x+w-2,23],[cx+1,27],[x+w-4,30]],p.clothShade);
  R(x+1,30,2,3,p.metal);line(x+1,30,2,p.metalHi);
 }else if(id==='berserker'){
  R(x+3,24,w-6,8,p.skin);R(x+3,24,2,7,p.skinHi);R(x+w-6,26,3,6,p.skinShade);
  R(x+3,28,w-7,1,p.skinShade);R(Math.round(cx),24,1,9,p.skinShade);
  R(x+2,25,2,8,p.cloth);R(x+w-4,25,2,8,p.clothShade);
  R(x+5,25,1,2,p.clothShade);R(x+6,27,1,1,p.clothShade);
 }else{
  P([[x+2,24],[x+w-3,24],[x+w-3,29],[cx,32],[x+2,29]],p.metalShade);
  P([[x+3,25],[x+w-4,25],[x+w-4,28],[cx,30],[x+3,28]],p.metal);
  line(x+3,25,w-7,p.metalHi);R(x+3,26,1,3,p.metalHi);
  R(Math.round(cx)-2,28,4,7,p.cloth);R(Math.round(cx)-1,28,2,5,p.clothHi);
  if(id==='elite'){R(Math.round(cx)-1,29,2,2,p.gold);R(Math.round(cx),28,1,1,p.metalHi);}
 }
 // Belt separates armour from legs; buckle never becomes a 1px stripe.
 R(x,34,w,3,p.dark);R(x+1,34,w-2,2,p.leather);R(Math.round(cx)-1,34,3,2,p.gold);R(Math.round(cx),34,1,1,p.metalHi);
 // Neck with cast shadow.
 R(Math.round(cx)-3,19,6,5,p.dark);R(Math.round(cx)-2,20,4,3,p.skinShade);R(Math.round(cx)-2,20,2,2,p.skin);
 // Skull/face box, shaded toward the lower right.
 R(headX-1,hy,headW+2,11,p.dark);R(headX,hy+1,headW,10,p.skin);
 R(headX,hy+1,2,7,p.skinHi);R(headX+headW-3,hy+3,3,8,p.skinShade);
 R(headX+2,hy+10,headW-4,1,p.skinShade);
 const eyeY=hy+6;
 if(!back){
  if(!profile){
   const faceShift=view==='quarter'?side:0;
   R(headX+2+faceShift,eyeY,2,1,p.dark);R(headX+headW-4+faceShift,eyeY,2,1,p.dark);
   R(headX+2+faceShift,eyeY,1,1,id==='elite'?'#c4a7dc':p.skinHi);
   R(headX+Math.floor(headW/2)+faceShift,eyeY+1,1,2,p.skinHi);
   line(headX+3+faceShift,eyeY+4,headW-6,p.skinShade);
  }else{
   const ex=side>0?headX+headW-3:headX+1;R(ex,eyeY,2,1,p.dark);R(side>0?headX+headW:headX-1,eyeY+1,1,2,p.skin);
  }
 }
 // Individual headwear/anatomy gives each foe a recognizable silhouette.
 if(id==='enemy'){
  R(headX-1,hy-2,headW+2,5,p.hair);R(headX,hy-3,headW-2,2,p.hairHi);
  R(headX+1,hy-2,headW-3,1,'#ae7a59');R(headX-1,hy+1,3,5,p.hair);
  if(back){R(headX,hy+1,headW,7,p.hair);R(headX+1,hy+2,2,4,p.hairHi);}
  else{R(headX+1,eyeY+3,headW-2,3,p.clothShade);R(headX+2,eyeY+3,headW-4,1,p.clothHi);R(headX+headW-3,eyeY-1,1,3,'#9a5f53');}
 }else if(id==='duelist'){
  P([[headX-3,hy+1],[headX,hy-1],[headX+1,hy-5],[headX+headW-2,hy-5],[headX+headW,hy-1],[headX+headW+3,hy+1]],p.dark);
  P([[headX-2,hy],[headX+1,hy-1],[headX+2,hy-4],[headX+headW-3,hy-4],[headX+headW-1,hy-1],[headX+headW+1,hy]],p.clothShade);
  line(headX+1,hy-1,headW-1,p.gold);line(headX+2,hy-4,headW-5,p.clothHi);
  R(headX+headW-2,hy-6,1,5,p.metal);R(headX+headW-1,hy-7,2,3,p.metalHi);R(headX+headW-1,hy-4,1,2,p.clothHi);
  if(back){R(headX-1,hy+2,headW+1,8,p.hair);R(headX+1,hy+3,2,6,p.hairHi);}else{
   R(headX,eyeY+2,headW,4,p.clothShade);line(headX+1,eyeY+2,headW-2,p.cloth);
   R(headX+headW-2,eyeY+3,3,2,p.clothHi);
  }
 }else if(id==='berserker'){
  R(headX-1,hy-2,headW+2,4,p.leather);R(headX,hy-2,headW,1,p.gold);
  for(const hx of [headX-3,headX+headW+1]){R(hx,hy-4,3,8,p.dark);R(hx+1,hy-4,2,7,p.gold);R(hx+1,hy-5,1,4,p.metalHi);}
  if(back){R(headX,hy+1,headW,8,p.hair);R(headX+2,hy+2,2,7,p.hairHi);}else{
   P([[headX,eyeY+3],[headX+headW,eyeY+3],[headX+headW-2,hy+14],[headX+4,hy+15],[headX+1,hy+12]],p.hair);
   R(headX+2,eyeY+4,2,5,p.hairHi);R(headX+5,eyeY+5,2,5,p.leather);R(headX+4,hy+13,2,1,p.gold);
   line(headX+3,eyeY+3,headW-6,p.skinShade);
  }
  // Fur collar is four grouped locks, not isolated noise.
  for(let q=0;q<4;q++){R(x+q*4,22,4,3,p.dark);R(x+q*4+1,22,3,2,p.metal);R(x+q*4+1,22,2,1,p.metalHi);}
 }else{
  const crest=id==='elite'?p.gold:p.clothHi;
  R(headX-2,hy-2,headW+4,12,p.dark);R(headX-1,hy-2,headW+2,10,p.metalShade);
  R(headX,hy-2,headW,3,p.metal);line(headX,hy-2,headW-1,p.metalHi);R(headX-1,hy,2,7,p.metal);
  R(headX+headW-1,hy+1,2,7,p.metalShade);
  if(back){R(headX+2,hy+2,headW-3,5,p.metalShade);R(headX+2,hy+2,1,5,p.metal);}
  else{
   R(headX+1,hy+3,headW-2,3,p.dark);R(headX+2,hy+4,Math.max(2,headW-4),1,id==='elite'?'#bca0d4':'#83c3c5');
   R(headX+1,hy+7,headW-2,2,p.metal);R(headX+2,hy+7,headW-5,1,p.metalHi);
   R(headX+Math.floor(headW/2),hy+4,1,5,p.metalShade);
  }
  if(id==='guardian'){
   R(Math.round(cx)-2,hy-7,4,6,p.dark);R(Math.round(cx)-1,hy-7,2,5,crest);R(Math.round(cx)-1,hy-7,1,4,p.metalHi);
  }else{
   // Crown/horn silhouette distinguishes the Sentinela from a large guard.
   for(const hx of [headX-4,headX+headW+1]){R(hx,hy-7,3,8,p.dark);R(hx+1,hy-7,2,7,p.gold);R(hx+1,hy-7,1,5,'#f0d796');}
   R(headX-1,hy-5,headW+2,3,p.dark);R(headX,hy-4,headW,2,p.gold);line(headX,hy-4,headW-1,'#f0d796');
  }
 }
 // The front arm carries a shaped elbow and closed fist; attack poses
 // open the silhouette, while guard poses bring the gauntlet to the chest.
 const nearLeft=side<0,nearX=nearLeft?x-armW:x+w-1;
 const extension=(state===1||state===6)&&frame===2?3:state===2?-2:state===3?1:0;
 const handX=Math.max(1,Math.min(31-armW,nearX+(nearLeft?-extension:extension)));
 const shoulderY=armY-1;
 P([[nearX,shoulderY],[nearX+armW,shoulderY],[handX+armW,armEnd],[handX,armEnd]],p.dark);
 P([[nearX+1,shoulderY+1],[nearX+armW-1,shoulderY+1],[handX+armW-1,armEnd-1],[handX+1,armEnd-1]],wide?p.metalShade:p.cloth);
 R(nearX+1,shoulderY+1,Math.max(1,armW-2),1,wide?p.metalHi:p.clothHi);
 if(wide){R(nearX+1,shoulderY+2,1,Math.max(1,armEnd-shoulderY-3),p.metal);R(handX,armEnd-3,armW,2,p.leather);line(handX,armEnd-3,armW,p.gold);}
 else{R(nearX+1,shoulderY+2,1,3,p.clothHi);R(handX,armEnd-2,armW,2,p.leather);}
 R(handX,armEnd,armW,3,p.dark);R(handX+1,armEnd,Math.max(2,armW-2),2,p.skin);R(handX+1,armEnd,1,1,p.skinHi);
 // Shoulders are last, visibly overlapping the upper arm.
 if(wide){
  for(const sx of [x-2,x+w-4]){R(sx,22,7,5,p.dark);R(sx+1,22,5,3,p.metalShade);R(sx+1,22,4,1,p.metalHi);R(sx+1,23,2,1,p.metal);if(id==='elite')line(sx+1,24,5,p.gold);}
 }
 g.resetTransform();
 if(state===5){
  const out=createCanvas(32,48),b=out.getContext('2d');b.imageSmoothingEnabled=false;
  // Kneel -> collapse; all output remains within the original cell.
  if(frame<2)b.drawImage(c,0,0,32,48,0,frame===0?5:10,32,frame===0?40:35);
  else b.drawImage(c,0,0,32,48,frame===2?1:0,frame===2?29:34,31,frame===2?16:11);
  return out;
 }
 return c;
}

await mkdir('scripts/art',{recursive:true});
const coverage=[];
for(const id of Object.keys(profiles)){
 for(const [folder,file,states] of [
  ['animated',id+'-enemy.png',7],['enemies',id+'.png',2],['legacy',id+'_sheet.png',1]
 ]){
  const path=`assets/sprites/${folder}/${file}`,canvas=createCanvas(128,states*384),g=canvas.getContext('2d');
  for(let st=0;st<states;st++)for(let dir=0;dir<8;dir++)for(let f=0;f<4;f++)g.drawImage(makeFrame(id,dir,st,f),f*32,(st*8+dir)*48);
  // The source generator contains only integer opaque authored pixels.
  await writeFile(path,canvas.toBuffer('image/png'));
  coverage.push({path,width:canvas.width,height:canvas.height,frames:states*32});
 }
}
console.log(JSON.stringify({families:5,files:coverage.length,coverage},null,2));

// Review plate is optional and remains outside the repository by default.
if(process.argv.includes('--review')){
 const c=createCanvas(1160,710),g=c.getContext('2d');g.fillStyle='#13242c';g.fillRect(0,0,c.width,c.height);g.imageSmoothingEnabled=false;
 const ids=Object.keys(profiles);g.font='bold 17px sans-serif';g.fillStyle='#edce8b';g.fillText('ANTES / DEPOIS — INIMIGOS E SENTINELA',18,25);
 for(let i=0;i<ids.length;i++){
  const id=ids[i],x=15+i*230;g.fillStyle='#e3d2ad';g.fillText(profiles[id].name,x,54);
  for(let j=0;j<4;j++){
   const original=await loadImage(`/workspace/work/enemy-art-originals/${j===0?'legacy/'+id+'_sheet.png':'animated/'+id+'-enemy.png'}`);
   const state=j===3?6:j===2?1:0,row=state*8+(j===2?4:1),now=makeFrame(id,j===2?4:1,state,j===3?2:0);
   g.fillStyle='#213941';g.fillRect(x,68+j*155,215,148);
   g.drawImage(original,0,row*48,32,48,x+4,70+j*155,96,144);
   g.drawImage(now,x+110,70+j*155,96,144);
  }
 }
 await writeFile('/workspace/work/enemies-art-before-after.png',c.toBuffer('image/png'));
}
