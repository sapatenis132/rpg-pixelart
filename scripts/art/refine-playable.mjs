// Pixel art revision 7: material clusters and authored facial features.
// Runs once per PNG (tEXt revision marker makes repeat runs byte-idempotent).
// Restore a source asset from its Git history to reproduce a fresh revision.
// No resampling: frame geometry, alpha masks, palette transparency and layout survive.
import {createCanvas,loadImage} from '@napi-rs/canvas';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
const ROOT=resolve(import.meta.dirname,'../..');
const REV='playable-pixel-art-v7';
const rgb=h=>h.match(/[\da-f]{2}/gi).map(x=>parseInt(x,16));
const hex=(p,i)=>'#'+[p[i],p[i+1],p[i+2]].map(x=>x.toString(16).padStart(2,'0')).join('');
const raceNames=['human','elf','orc','dwarf','halfling'];
const P={
 human:{skin:'#dcaa83',shade:'#aa7559',skinHi:'#f5c79d',hair:'#4a342e',hairHi:'#80604c',cloth:'#43829b',clothHi:'#6aacc0',clothDark:'#315266',pants:'#354e63',boot:'#252d3b',outline:'#101b28',belt:'#70513c',eye:'#d4bb82',hairNew:'#664436',hairGlint:'#a47c56',cheek:'#e9b591',fold:'#28617c'},
 elf:{skin:'#efcf9c',shade:'#b79775',skinHi:'#fff0bc',hair:'#c7b77a',hairHi:'#f5d995',cloth:'#36816b',clothHi:'#75c19d',clothDark:'#235847',pants:'#2b5b50',boot:'#23413d',outline:'#112b31',belt:'#8b684b',eye:'#ead796',hairNew:'#b49b62',hairGlint:'#fff0b8',cheek:'#f8dfb5',fold:'#245f56'},
 orc:{skin:'#8fb76a',shade:'#466e45',skinHi:'#bcd28a',hair:'#30413a',hairHi:'#5a6a48',cloth:'#835849',clothHi:'#b17a5d',clothDark:'#59403b',pants:'#424c4a',boot:'#323f3b',outline:'#1b2929',belt:'#5f493a',eye:null,hairNew:'#293d36',hairGlint:'#77865a',cheek:'#a4c479',fold:'#6d453e'},
 dwarf:{skin:'#d9a477',shade:'#986a49',skinHi:'#f7c192',hair:'#763b25',hairHi:'#c97836',cloth:'#667b85',clothHi:'#9cb4b2',clothDark:'#46515d',pants:'#3d4e58',boot:'#283d46',outline:'#1a2c37',belt:'#5e4934',eye:null,hairNew:'#a14f29',hairGlint:'#e5a557',cheek:'#edbc88',fold:'#526574'},
 halfling:{skin:'#eab68b',shade:'#b77c5f',skinHi:'#f8d1a5',hair:'#8e572f',hairHi:'#b8803e',cloth:'#5e8e5e',clothHi:'#a5c18a',clothDark:'#376247',pants:'#857151',boot:'#534638',outline:'#1c2830',belt:'#795c3f',eye:'#e6bd70',hairNew:'#ac7136',hairGlint:'#e4b06b',cheek:'#f4c59c',fold:'#3d724e'}
};
const roles={
 warrior:{outline:'#1a2530',metal:'#a4b7c0',metalHi:'#e7e5cf',metalShade:'#718a9a',cloth:'#515767',clothFold:'#3c4759',leather:'#794b40',leatherHi:'#c97756',accent:'#ecb982'},
 guardian:{outline:'#172b34',metal:'#6094a7',metalHi:'#d7e6df',metalShade:'#456f88',cloth:'#3a5d74',clothFold:'#2a455f',leather:'#42786f',leatherHi:'#85bca8',accent:'#bbd0d2'},
 rebel:{outline:'#211d30',metal:'#a68970',metalHi:'#e9d1aa',metalShade:'#756e71',cloth:'#4c3c48',clothFold:'#372b3e',leather:'#835057',leatherHi:'#c57865',accent:'#302b3d'},
 arcanist:{outline:'#171d36',metal:'#a2a8e0',metalHi:'#e0e0ef',metalShade:'#848ac5',cloth:'#313d70',clothFold:'#252e55',leather:'#5960a2',leatherHi:'#7778ba',accent:'#4b9da5'},
 hunter:{outline:'#1b302d',metal:'#c29b61',metalHi:'#f0d099',metalShade:'#9c794e',cloth:'#355f44',clothFold:'#274c3c',leather:'#74573e',leatherHi:'#a68054',accent:'#a7bd72'}
};
// Connected islands give hair, exposed hands and armour plates their own
// local light planes. Detail positions follow each animated material island.
function islands(src,w,h,colors){
 const wanted=new Set(colors),seen=new Uint8Array(w*h),out=[];
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  let i=y*w+x;if(seen[i]||!src[i*4+3]||!wanted.has(hex(src,i*4)))continue;
  let q=[i],pts=[],minX=x,maxX=x,minY=y,maxY=y;seen[i]=1;
  for(let k=0;k<q.length;k++){let at=q[k],a=at%w,b=Math.floor(at/w);pts.push([a,b]);minX=Math.min(minX,a);maxX=Math.max(maxX,a);minY=Math.min(minY,b);maxY=Math.max(maxY,b);
   for(let [nx,ny]of[[a-1,b],[a+1,b],[a,b-1],[a,b+1]]){let n=ny*w+nx;if(nx<0||ny<0||nx>=w||ny>=h||seen[n]||!src[n*4+3]||!wanted.has(hex(src,n*4)))continue;seen[n]=1;q.push(n);}
  }out.push({pts,minX,maxX,minY,maxY,w:maxX-minX+1,h:maxY-minY+1});
 }return out;
}
const HEAD_ANCHORS=new Map();
function refineFrame(src,w,h,race,dir,frame,state,role=null,sourceKind=''){
 let dst=new Uint8ClampedArray(src);const put=(x,y,col)=>{if(x<0||y<0||x>=w||y>=h)return;let i=(y*w+x)*4;if(!src[i+3])return;const c=rgb(col);dst[i]=c[0];dst[i+1]=c[1];dst[i+2]=c[2];};
 if(role){let p=roles[role];
  for(let island of islands(src,w,h,[p.metal]))for(let [x,y]of island.pts){let lx=x-island.minX,ly=y-island.minY;
   // Metal has a short sharp upper-left bevel and a broad dark lower plane.
   if((ly===0&&lx<island.w-1)||(lx===0&&ly<Math.min(3,island.h)))put(x,y,p.metalHi);
   else if(lx===island.w-1||ly===island.h-1)put(x,y,p.metalShade);
   // A single warm rivet in larger shoulder/chest plates.
   else if(island.w>=5&&island.h>=4&&lx===1&&ly===1)put(x,y,'#eed5a0');
  }
  for(let island of islands(src,w,h,[p.cloth]))for(let [x,y]of island.pts){let lx=x-island.minX,ly=y-island.minY;
   if(island.w>=5&&island.h>=5&&lx===Math.max(1,Math.floor(island.w*.65))&&ly>1&&ly<island.h-1)put(x,y,p.clothFold);
   else if(island.h>=7&&ly===island.h-2&&lx>0&&lx<island.w-1)put(x,y,p.clothFold);
  }
  for(let island of islands(src,w,h,[p.leather]))for(let [x,y]of island.pts){let lx=x-island.minX,ly=y-island.minY;
   if(ly===0&&island.w>=3&&lx<island.w-1)put(x,y,p.leatherHi);
   else if(island.w>=4&&island.h>=4&&lx===island.w-1)put(x,y,p.clothFold);
   // Paired stitches on the pouch/belt edge, not screen-space noise.
   else if(island.h>=5&&lx===1&&(ly===2||ly===island.h-2))put(x,y,p.metalShade);
  }
  // Arcane embroidery and hunter clasp use a deliberately sparse bright edge.
  for(let island of islands(src,w,h,[p.accent]))if(island.w>=3&&island.h>=3)for(let [x,y]of island.pts){let lx=x-island.minX,ly=y-island.minY;if(ly===0&&lx<island.w-1)put(x,y,p.metalHi);else if(lx===island.w-1&&ly>0)put(x,y,p.metalShade);}
  return dst;
 }
 let p=P[race];
 // Hair locks have broken curved highlight clusters instead of flat rectangles.
 for(let island of islands(src,w,h,[p.hair,p.hairHi]))for(let [x,y]of island.pts){let lx=x-island.minX,ly=y-island.minY;
  if(island.w>=4&&island.h>=3){
   if((ly===1&&lx>=1&&lx<Math.min(island.w-1,5))||(lx===1&&ly>1&&ly<Math.min(island.h-1,5)))put(x,y,p.hairGlint);
   else if(lx===island.w-1&&ly>1)put(x,y,p.hairNew);
   else if(island.h>=6&&lx===Math.floor(island.w*.6)&&ly>=2&&ly<island.h-1)put(x,y,p.hairNew);
   else if(hex(src,(y*w+x)*4)===p.hairHi)put(x,y,p.hairNew);
  }
 }
 // Skin islands include each hand independently. Their broad left plane and
 // lower-right shadow read as knuckles/cheeks without anti-aliasing.
 for(let island of islands(src,w,h,[p.skin,p.shade,p.skinHi]))for(let [x,y]of island.pts){let lx=x-island.minX,ly=y-island.minY;
  if(island.w>=3&&island.h>=3){
   if(ly===1&&lx>=1&&lx<Math.min(island.w-1,4))put(x,y,p.cheek);
   else if(lx===island.w-1&&ly>1)put(x,y,p.shade);
   else if(island.w<=6&&ly===island.h-1&&lx>0)put(x,y,p.shade);
  }
 }
 for(let island of islands(src,w,h,[p.cloth,p.clothHi]))for(let [x,y]of island.pts){let lx=x-island.minX,ly=y-island.minY;
  if(island.w>=4&&island.h>=5){if(lx===island.w-2&&ly>1&&ly<island.h-1)put(x,y,p.fold);
   else if(ly===1&&lx>0&&lx<Math.min(4,island.w-1))put(x,y,p.clothHi);
  }
 }
 for(let island of islands(src,w,h,[p.boot,p.pants]))for(let [x,y]of island.pts){let lx=x-island.minX,ly=y-island.minY;
  if(island.w>=4&&island.h>=2&&ly===island.h-1&&lx>0&&lx<island.w-1)put(x,y,p.clothDark);
 }
 const rear=[4,5,6].includes(dir),profile=[3,7].includes(dir),side=[0,6,7].includes(dir)?1:-1;
 // Eye islands are deliberate two-pixel irises, distinct from gold buckles.
 if(!rear&&p.eye)for(let island of islands(src,w,h,[p.eye])){
  if(island.maxY>33||island.w>3||island.h>4)continue;
  for(let [x,y]of island.pts)put(x,y,'#17232d');
  if(island.w>=2&&island.h>=2)put(island.minX,island.minY,'#f5ead1');
 }
 // Locate the animated head by the hair island, including movement/anticipation.
 const heads=islands(src,w,h,[p.hair,p.hairHi]).filter(z=>z.minY<30&&z.w>=4&&z.h>=3).sort((a,b)=>a.minY-b.minY||b.pts.length-a.pts.length);
 const anchorKey=[race,dir,frame,state].join(':');
 if(sourceKind==='playable/races')HEAD_ANCHORS.set(anchorKey,heads[0]);
 const head=sourceKind==='playable/race-traits'?HEAD_ANCHORS.get(anchorKey):heads[0];
 if(head&&!(state===5&&frame>=2)){
  const left=head.minX,right=head.maxX,top=head.minY;
  if(race==='orc'&&!rear){
   // Low brow, luminous amber eyes and one chipped tusk light edge.
   const ey=top+7;
   const ex=profile?[side>0?right-2:left+2]:[left+3,right-3];
   for(let a of ex){put(a,ey,'#17282b');put(a,ey+1,'#e2c578');}
   for(let island of islands(src,w,h,['#f2e6c0']))for(let [x,y]of island.pts)if(y===island.maxY)put(x,y,'#b9bd9c');
  }
  if(race==='dwarf'){
   // Separate the brow, nose and eyes from the formerly solid beard mask.
   if(!rear){
    const ey=top+4;
    const mid=Math.round((left+right)/2),ex=profile?[side>0?right-2:left+2]:[left+3,right-3];
    for(let y=ey;y<=ey+2;y++)for(let x=left+1;x<right;x++)put(x,y,p.skin);
    for(let a of ex){put(a,ey+1,'#162a30');if(!profile)put(a+1,ey+1,'#162a30');}
    put(mid,ey+1,p.skinHi);put(mid,ey+2,p.cheek);
    // Moustache below the nose, paired beard braids and warm copper clasps.
    for(let x=left+2;x<=right-2;x++)put(x,ey+3,p.hairNew);
   }
   for(let island of islands(src,w,h,[p.hair,p.hairHi]))if(island.h>=5&&island.maxY>top+7)for(let [x,y]of island.pts){let lx=x-island.minX,ly=y-island.minY;if((lx===2||lx===island.w-3)&&ly>3&&ly%3===1)put(x,y,p.hairGlint);if(ly===island.h-2&&(lx===2||lx===island.w-3))put(x,y,'#dec084');}
  }
  if(race==='elf'){
   // Long trailing locks retain smooth bands; the ear tips get a pale rim.
   for(let island of islands(src,w,h,[p.skin,p.shade]))if(island.w>=4&&island.h<=4)for(let [x,y]of island.pts)if(y===island.minY&&x<island.maxX)put(x,y,p.skinHi);
  }
 }
 return dst;
}
function crc32(b){let c=0xffffffff;for(let v of b){c^=v;for(let n=0;n<8;n++)c=(c>>>1)^((c&1)?0xedb88320:0);}return(c^0xffffffff)>>>0;}
function marker(png){const payload=Buffer.from('ArtRevision\0'+REV),t=Buffer.from('tEXt'),out=Buffer.alloc(payload.length+12);out.writeUInt32BE(payload.length);t.copy(out,4);payload.copy(out,8);out.writeUInt32BE(crc32(Buffer.concat([t,payload])),8+payload.length);return Buffer.concat([png.subarray(0,png.length-12),out,png.subarray(png.length-12)]);}
const jobs=[];
for(let race of raceNames)for(let folder of ['playable/races','playable/race-traits','actors','animated'])jobs.push({path:`assets/sprites/${folder}/${race}.png`,race,sourceKind:folder});
for(let role of Object.keys(roles))jobs.push({path:`assets/sprites/playable/${role}-outfit.png`,role});
jobs.push({path:'assets/sprites/legacy/hero_sheet.png',race:'human',legacy:true});
const report=[];const before={};
for(let job of jobs){let path=resolve(ROOT,job.path),bytes=readFileSync(path);if(bytes.includes(Buffer.from(REV))){report.push({path:job.path,skipped:true});continue;}
 let image=await loadImage(bytes),c=createCanvas(image.width,image.height),ctx=c.getContext('2d');ctx.drawImage(image,0,0);let data=ctx.getImageData(0,0,c.width,c.height),old=new Uint8ClampedArray(data.data);before[job.path]={image,width:c.width,height:c.height};
 const fw=32,fh=48;let changed=0,frames=0,changedFrames=0;
 for(let sy=0;sy<c.height;sy+=fh)for(let sx=0;sx<c.width;sx+=fw){let frame=new Uint8ClampedArray(fw*fh*4);for(let y=0;y<fh;y++)for(let x=0;x<fw;x++)for(let k=0;k<4;k++)frame[(y*fw+x)*4+k]=old[((sy+y)*c.width+sx+x)*4+k];
  // The legacy sheet has its own old palette: first translate to material hues.
  if(job.legacy){let swaps={'#2d779e':P.human.cloth,'#4ab5c8':P.human.clothHi,'#ddae82':P.human.skin,'#24334c':P.human.pants,'#192a3e':P.human.outline,'#1c2131':P.human.boot,'#c2e6e7':P.human.skinHi,'#ebc15f':P.human.eye,'#dea94a':P.human.belt};for(let i=0;i<frame.length;i+=4){let h=hex(frame,i);if(frame[i+3]&&swaps[h]){let col=rgb(swaps[h]);for(let k=0;k<3;k++)frame[i+k]=col[k];}}}
  const dst=refineFrame(frame,fw,fh,job.race,Math.floor(sy/fh)%8,sx/fw,Math.floor(sy/fh/8),job.role,job.sourceKind);let fc=0;
  for(let y=0;y<fh;y++)for(let x=0;x<fw;x++){let i=((sy+y)*c.width+sx+x)*4,j=(y*fw+x)*4;for(let k=0;k<4;k++)data.data[i+k]=dst[j+k];if(data.data[i]!==old[i]||data.data[i+1]!==old[i+1]||data.data[i+2]!==old[i+2]){changed++;fc++;}if(data.data[i+3]!==old[i+3])throw new Error('Alpha drift '+job.path);}
  frames++;if(fc)changedFrames++;
 }
 ctx.putImageData(data,0,0);writeFileSync(path,marker(c.toBuffer('image/png')));report.push({path:job.path,width:c.width,height:c.height,changedPixels:changed,frames,changedFrames,alphaIdentical:true});
}
if(report.every(item=>item.skipped)){
 console.log('All 26 playable assets already carry '+REV+'; no bytes changed.');
 process.exit(0);
}
mkdirSync(resolve(ROOT,'screenshots'),{recursive:true});
const contact=createCanvas(1200,940),brush=contact.getContext('2d');brush.imageSmoothingEnabled=false;brush.fillStyle='#12232d';brush.fillRect(0,0,1200,940);brush.font='18px sans-serif';brush.fillStyle='#ebd5a0';brush.fillText('PLAYABLE V7 — ANTES / DEPOIS — ROSTO, CABELO, BARBA E MATERIAIS',15,25);
for(let r=0;r<raceNames.length;r++){const race=raceNames[r],path=`assets/sprites/playable/races/${race}.png`,orig=before[path]?.image;if(!orig)continue;const now=await loadImage(resolve(ROOT,path));brush.fillStyle='#d8e5df';brush.fillText(race,15,65+r*170);for(let d=0;d<4;d++){let dir=[1,0,3,5][d],x=140+d*260,y=45+r*170;brush.drawImage(orig,0,dir*48,32,48,x,y,96,144);brush.drawImage(now,0,dir*48,32,48,x+115,y,96,144);}}
writeFileSync(resolve(ROOT,'screenshots/playable-v7-before-after.png'),contact.toBuffer('image/png'));
writeFileSync(resolve(ROOT,'scripts/art/playable-v7-report.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
