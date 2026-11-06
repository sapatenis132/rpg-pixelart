// Forest art revision: deterministic, authored pixel clusters; no gameplay geometry.
// Original v6 sheets are embedded so regeneration is idempotent from any checkout.
import {createCanvas,loadImage} from '@napi-rs/canvas';
import {writeFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../../',import.meta.url));
const rgb=h=>[parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16),255];
const blend=(a,b,t)=>a.map((v,i)=>i===3?255:Math.round(v*(1-t)+b[i]*t));
function raster(data,w,h){
 const original=new Uint8ClampedArray(data),out=new Uint8ClampedArray(data);
 const has=(x,y)=>x>=0&&y>=0&&x<w&&y<h&&original[(y*w+x)*4+3]>0;
 const set=(x,y,c)=>{x=Math.round(x);y=Math.round(y);if(has(x,y)){const i=(y*w+x)*4;out.set(c,i);out[i+3]=original[i+3];}};
 const rect=(x,y,ww,hh,c)=>{for(let j=y;j<y+hh;j++)for(let i=x;i<x+ww;i++)set(i,j,c);};
 const line=(x,y,xx,yy,c)=>{const n=Math.max(Math.abs(xx-x),Math.abs(yy-y));for(let k=0;k<=n;k++)set(Math.round(x+(xx-x)*k/(n||1)),Math.round(y+(yy-y)*k/(n||1)),c);};
 const ellipse=(cx,cy,rx,ry,c)=>{for(let y=Math.floor(cy-ry);y<=cy+ry;y++)for(let x=Math.floor(cx-rx);x<=cx+rx;x++)if(((x-cx)/rx)**2+((y-cy)/ry)**2<=1)set(x,y,c);};
 return {original,out,has,set,rect,line,ellipse,w,h};
}
const GROUND_PALETTES=[
 ['#163b30','#28523b','#3c7047','#71945b'],['#153e50','#20596a','#388894','#9bcdb9'],
 ['#57412c','#8a6843','#b5915b','#e0bb7c'],['#514c35','#756e4c','#9c8c60','#c1ae7a'],
 ['#294c38','#416d4d','#5e8954','#a9bb74'],['#153646','#205466','#3c7f8f','#85b7b1'],
 ['#452f26','#734b30','#a37245','#cda068'],['#343f49','#596977','#82969b','#bdc7ae'],
 ['#354c3e','#536f4f','#809267','#b5b582'],['#20472f','#376b40','#689053','#a6be6a'],
 ['#303d43','#53636c','#85938e','#b6b8a0'],['#1f4230','#345c3d','#5b8753','#a2b875'],
 ['#382e25','#66462d','#936a42','#c8a36b'],['#214c4e','#356a69','#5c9690','#aad0b5'],
 ['#355a54','#557a6b','#7d9e88','#c2d5b5'],['#274c39','#466d4c','#78995b','#c5d58c'],
 ['#14372b','#294b37','#427052','#7b9e72']
].map(p=>p.map(rgb));
function groundArt(r,legacy=false,legacyVariant=0){
 const tw=legacy?72:64,th=legacy?36:32,rows=legacy?1:17,cols=legacy?1:4;
 for(let row=0;row<rows;row++)for(let column=0;column<cols;column++){
  const v=column+(legacy?legacyVariant:0),ox=column*tw,oy=row*th;
  const stonePalettes=[['#172731','#2a414d','#42606a','#759096'],['#242b31','#414c55','#67757b','#a3afa3'],['#1b302d','#354c42','#547565','#93a780'],['#2e2c29','#4e4940','#77705d','#b4a587']];
  const p=legacy?stonePalettes[legacyVariant].map(rgb):GROUND_PALETTES[row];
  const pix=(x,y,c)=>r.set(ox+x,oy+y,c),rec=(x,y,w,h,c)=>r.rect(ox+x,oy+y,w,h,c),ln=(x,y,xx,yy,c)=>r.line(ox+x,oy+y,ox+xx,oy+yy,c);
  for(let y=0;y<th;y++)for(let x=0;x<tw;x++)if(r.has(ox+x,oy+y)){
   const nx=(x-tw/2)/(tw/2),ny=(y-th/2)/(th/2),edge=Math.abs(nx)+Math.abs(ny);
   const patch=(Math.floor((x+v*7)/9)+Math.floor(y/5)*2+v)%5;
   let c=patch===0?blend(p[1],p[2],.22):p[1];
   if(edge>.92)c=y<th/2?p[2]:p[0];
   else if(y>th-5)c=blend(p[1],p[0],.35);
   pix(x,y,c);
  }
  if(!legacy&&[1,5,13,14].includes(row)){
   // Broken horizontal bands form water planes, with paired shadows beneath crests.
   for(let k=0;k<6;k++){
    const y=5+k*4,xx=9+(k*11+v*9)%31,length=8+(k*3+v)%12;
    ln(xx,y,xx+length,y,p[2]);ln(xx+3,y+1,xx+length+3,y+1,p[0]);
    if(k%2===0){ln(xx+2,y-1,xx+length-3,y-1,p[3]);pix(xx+length+2,y,p[2]);}
   }
   if(row===13){rec(21+v,17,5,2,p[0]);ln(22+v,16,25+v,16,p[2]);}
   continue;
  }
  if(!legacy&&row===2){
   for(let k=0;k<6;k++){const y=5+k*4;ln(8,y,56,y,p[0]);ln(10,y+1,53,y+1,p[2]);ln(22+(k*7+v*5)%20,y+2,30+(k*7+v*5)%20,y+2,p[3]);}
   for(const x of [20,43])for(const y of [10,21])pix(x+v,y,p[0]);continue;
  }
  if(!legacy&&[6,12].includes(row)){
   for(let k=0;k<5;k++){
    const x=10+k*10+v;ln(x,9,x+12,20,p[0]);ln(x,8,x+12,19,p[2]);ln(x+2,8,x+7,12,p[3]);
    if(k%2===0)ln(x+6,14,x+3,19,p[0]);
   }continue;
  }
  if(legacy||[7,10].includes(row)){
   // Broad fitted stone faces, irregular seams, lower-right contact shadows.
   for(let k=0;k<7;k++){
    const x=8+(k*17+v*9)%43,y=7+(k*7+v*3)%20,ww=5+k%4;
    rec(x,y,ww,3,p[0]);rec(x,y-1,ww-1,2,k%2?p[2]:blend(p[1],p[2],.5));
    ln(x+1,y-2,x+ww-3,y-2,p[3]);pix(x+ww,y+1,p[0]);
   }
   if(!legacy){rec(26+v,17,4,1,rgb('#517850'));pix(29+v,16,rgb('#8a9d62'));}continue;
  }
  // Grass blades are composed into tufts, with soil gaps and paired leaf clusters.
  for(let k=0;k<10;k++){
   const x=8+(k*17+v*11)%47,y=7+(k*7+v*3)%19;
   rec(x-1,y+2,5,1,p[0]);ln(x,y+1,x-1,y-1,p[2]);ln(x+1,y+1,x+2,y-2,p[2]);pix(x+2,y-3,k%3===0?p[3]:p[2]);
   if(k%4===0){rec(x+3,y,3,1,p[2]);pix(x+5,y-1,p[3]);}
  }
  if(!legacy&&[3,4,8,15].includes(row)){
   for(let k=0;k<5;k++){const x=13+(k*9+v*6)%36,y=10+(k*5)%12;ln(x,y,x+4,y,p[0]);ln(x,y-1,x+3,y-1,p[2]);}
   if(row===15){pix(28+v*3,13,rgb('#e0d997'));pix(43-v,21,rgb('#bdcc8b'));}
  }
 }
}
const TREE_PALETTES=[
 ['#122e27','#214a32','#376a40','#568b4c','#8eb867'],['#16372c','#2b5738','#477d46','#70a25b','#accb7a'],
 ['#123c39','#225b4d','#36816a','#58a387','#a1cdb0'],['#17392b','#28573a','#3d7947','#649953','#a1be71'],
 ['#103938','#215957','#347c72','#58a297','#9ccbc0'],['#303b25','#4c5b31','#728044','#98a65e','#c6cf84']
].map(p=>p.map(rgb));
function treesArt(r){
 for(let n=0;n<6;n++){
  const ox=n*64,p=TREE_PALETTES[n],pine=n===3||n===4;
  const canopy=(x,y)=>{const i=(y*r.w+ox+x)*4,o=r.original;return r.has(ox+x,y)&&!(o[i]>o[i+1]*1.06&&o[i]>o[i+2]*1.2);};
  // Group individual leaves into structural boughs, preserving original cutout edges.
  for(let y=0;y<96;y++)for(let x=0;x<64;x++)if(r.has(ox+x,y)){
   const i=(y*r.w+ox+x)*4;
   if(canopy(x,y)&&y<83){
    let c=p[x<31?2:1];
    if(!canopy(x-1,y)||!canopy(x,y+1))c=p[0];
    r.set(ox+x,y,c);
   }else{
    const phase=(x+n)%5;
    let c=phase===0?rgb('#4a3429'):phase<3?rgb('#876044'):rgb('#b38958');
    if(x>34||y>88)c=rgb('#513c2d');
    r.set(ox+x,y,c);
   }
   // Keep every original transparent pixel and leaf silhouette.
   r.out[i+3]=r.original[i+3];
  }
  const boughs=pine?[[30,11,8,9],[29,21,12,10],[32,31,16,10],[29,41,20,11],[32,51,22,10]]:
   [[29,10,18,10],[17,22,16,12],[42,23,17,13],[29,32,19,13],[12,38,13,11],[47,39,16,13],[29,44,20,13],[19,50,14,9],[40,51,14,9]];
  for(const [cx,cy,rx,ry] of boughs){
   for(let y=Math.ceil(cy-ry);y<=cy+ry;y++)for(let x=Math.ceil(cx-rx);x<=cx+rx;x++){
    const dx=(x-cx)/rx,dy=(y-cy)/ry;
    if(dx*dx+dy*dy>1||!canopy(x,y))continue;
    let c=p[2];
    if(dx*.6+dy>.45)c=p[1];
    else if(dx*.6+dy<-.35)c=p[3];
    if(dy>.7)c=p[0];
    if(dx<-.15&&dx>-.7&&dy<-.55)c=p[4];
    if(x>47)c=blend(c,p[1],.35);
    r.set(ox+x,y,c);
   }
  }
  const leaf=(x,y,highlight)=>{
   const shade=highlight?p[3]:p[2],glint=highlight?p[4]:p[3];
   for(const [dx,dy,c] of [[0,0,shade],[1,0,glint],[2,0,glint],[3,0,shade],[1,-1,glint],[2,-1,glint],[1,1,shade],[2,1,shade],[3,2,p[1]]])
    if(canopy(x+dx,y+dy))r.set(ox+x+dx,y+dy,c);
  };
  for(let tier=0;tier<5;tier++){
   const y=6+tier*11;
   for(let k=0;k<4;k++){
    const x=7+k*13+(tier%2)*5;
    if(canopy(x,y)&&canopy(x+3,y+2))leaf(x,y,x<38&&tier%3!==2);
   }
   // Lower edges of boughs have a broken darker underside, never straight stripes.
   for(let k=0;k<4;k++){const x=8+k*13+(tier%2)*3;
    if(canopy(x,y+6)&&canopy(x+4,y+6)){
     for(let dx=0;dx<5;dx++)r.set(ox+x+dx,y+6,p[1]);
     r.set(ox+x+1,y+5,p[2]);
    }
   }
  }
  // Bark ridges and a small knot make trunks read at gameplay scale.
  for(let y=67;y<87;y++)if(r.has(ox+28,y)&&!canopy(28,y))r.set(ox+28,y,rgb('#c29962'));
  for(const [x,y,c] of [[31,77,'#47342a'],[30,76,'#d0a872'],[32,78,'#b88a56'],[27,89,'#b38b5a'],[34,90,'#8b6a43']])
   if(r.has(ox+x,y)&&!canopy(x,y))r.set(ox+x,y,rgb(c));
 }
}
function propsArt(r){
 for(let n=0;n<16;n++){
  const ox=n%8*24,oy=Math.floor(n/8)*32;
  for(let y=0;y<32;y++)for(let x=0;x<24;x++)if(r.has(ox+x,oy+y)){
   const i=((oy+y)*r.w+ox+x)*4,o=r.original,c=[...o.slice(i,i+4)];
   const edge=!r.has(ox+x+1,oy+y)||!r.has(ox+x,oy+y+1);
   if(edge){for(let k=0;k<3;k++)c[k]=Math.round(c[k]*.77);}
   else if(x<11&&y<24){c[0]=Math.min(255,c[0]+5);c[1]=Math.min(255,c[1]+7);}
   r.set(ox+x,oy+y,c);
  }
  const set=(x,y,c)=>r.set(ox+x,oy+y,rgb(c)),line=(x,y,xx,yy,c)=>r.line(ox+x,oy+y,ox+xx,oy+yy,rgb(c));
  if(n===0||n===14){
   for(const y of [23,25,27])line(n===0?7:11,y,n===0?17:15,y,'#805632');
   line(n===0?6:9,21,n===0?16:15,21,'#d4b17b');
   for(const [x,y] of [[5,25],[10,24],[16,26]])set(x,y,'#dda96c');
  }else if(n===1){
   line(8,19,13,19,'#c1d1bc');line(7,20,11,20,'#a1b5ae');line(15,23,17,25,'#32454b');line(8,26,14,26,'#738c8c');
  }else if(n===2||n===10||n===11){
   line(11,12,11,27,'#294b33');line(10,12,10,24,'#a2bf70');
   for(const y of [15,19,23]){line(4,y,8,y,'#b0c987');line(13,y+1,17,y+1,'#77a45f');}
  }else if(n===3){
   line(5,11,16,11,'#ef9a8f');line(5,12,8,12,'#ffd9ac');line(8,20,15,20,'#8e4248');line(11,24,11,28,'#baa97f');set(17,16,'#793d46');
  }else if([4,5,6,7,8,15].includes(n)){
   line(12,13,12,15,'#fff1bd');set(13,17,'#ae795c');line(11,23,11,27,'#659953');set(9,26,'#add178');
   set(11,10,'#fff0d7');set(16,15,'#eee2b0');
  }else if(n===9||n===13){
   for(const [x,y] of [[7,17],[11,15],[15,19],[9,23]]){line(x,y,x+3,y,'#9abc73');line(x+1,y+1,x+3,y+1,'#5a8e54');set(x+3,y+2,'#244c38');}
  }else if(n===12){
   for(const x of [5,10,16]){line(x,23,x,28,'#69452e');line(x+1,22,x+1,26,'#cca36a');}line(8,28,13,24,'#5f422d');
  }
 }
}
async function main(){
 const entries=[],stats=[];
 for(const [path,base64] of Object.entries(SOURCES)){
  const image=await loadImage(Buffer.from(base64,'base64')),c=createCanvas(image.width,image.height),ctx=c.getContext('2d');
  ctx.drawImage(image,0,0);const before=ctx.getImageData(0,0,c.width,c.height),r=raster(before.data,c.width,c.height);
  if(path.includes('ground')||path.includes('/tile_'))groundArt(r,path.includes('/tile_'),path.includes('/tile_')?Number(path.match(/tile_(\d)/)[1]):0);
  else if(path.includes('trees'))treesArt(r);else propsArt(r);
  let changed=0,visible=0;for(let i=0;i<r.out.length;i+=4){
   if(r.out[i+3]!==r.original[i+3])throw Error('Alpha changed '+path);
   if(r.out[i+3]){visible++;if(r.out[i]!==r.original[i]||r.out[i+1]!==r.original[i+1]||r.out[i+2]!==r.original[i+2])changed++;}
  }
  const after=ctx.createImageData(c.width,c.height);after.data.set(r.out);ctx.putImageData(after,0,0);
  await writeFile(root+path,c.toBuffer('image/png'));entries.push({path,before:image,after:c});stats.push({path,width:c.width,height:c.height,changed,visible,alpha:'identical'});
 }
 const contact=createCanvas(1100,1900),ctx=contact.getContext('2d');ctx.imageSmoothingEnabled=false;ctx.fillStyle='#14242a';ctx.fillRect(0,0,1100,1900);ctx.font='18px monospace';ctx.fillStyle='#e0cc8e';ctx.fillText('AMBIENTE / ANTES                                      DEPOIS',18,30);
 let y=48;
 for(const e of entries){
  ctx.fillStyle='#b4d3bf';ctx.fillText(e.path.split('/').pop(),18,y+16);y+=25;
  const scale=e.path.includes('ground')?1.5:e.path.includes('trees')?1.3:e.path.includes('props')?2.5:2;
  ctx.drawImage(e.before,18,y,e.before.width*scale,e.before.height*scale);ctx.drawImage(e.after,565,y,e.after.width*scale,e.after.height*scale);y+=Math.max(e.before.height*scale+22,e.path.includes('ground')?0:0);
 }
 await mkdir(root+'../../world-art-review',{recursive:true});await writeFile(root+'../../world-art-review/before-after.png',contact.toBuffer('image/png'));await writeFile(root+'../../world-art-review/coverage.json',JSON.stringify(stats,null,2));
 console.log(JSON.stringify(stats,null,2));
}
setImmediate(()=>main().catch(e=>{console.error(e);process.exitCode=1;}));
const SOURCES={"assets/sprites/forest/ground.png": "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", "assets/sprites/forest/props.png": "iVBORw0KGgoAAAANSUhEUgAAAMAAAABACAMAAAB7sojtAAAANlBMVEUAAAAbKCd0TTS4h1VVZGrtx4g1ZUmfsq7L2qFwS0IiUj6Mv3L06sHMXmTvnb3myHO2oO2DxcGUPkiGAAAAAXRSTlMAQObYZgAAAxlJREFUeNrtmYmWqyAMhkErVzI61vd/2csiypJY3FpPh/9MPZ1oJZ8kgIGxoqKior+i31/cPgy4/fnE7V13rZdW3wbQti3KpeyDFmJ/aiH2TuuQjz+TGBNGy5m+7x2A+ooBcAKAEwCcAODvBmD8FwVgfEABGH+iAIx3xwGcAGJL33XaS33se7+frdWeDcN/GLQ9jiLtu7bHUdR52u+4mATgemJ6OFw57f/xEKBpcABlRwGUHQVQ9ssAev3g3ZHfFYAKIQuwKAa4TQi5JAYIk3gF4GNJ/G/RFwHsCKGrZ+J6kXmmtbE+Hg/luJo6DID6L8riKYmzAdJh9yR7VZ0FEOsTAFbrAOsNcCpErwLgVSoPwMkDCJP48wDKtUdt/J6Psz2Qi4n7ATTNJoDtIWSJU95T7DSANEoBiCT+KAAyfLwCAK1MgOtzYBOAuw+gTbwdgJIBcytPEQBMOQw6jW8MoDUDBDOTPwrhvys1mKKioqKioq2Kqpm31Th+I4B68zWVhBPuL650Xvk5apEA/BSApmkuBkj9nGo6xwHgUgDGRxTAFpRtYfmNADCv1gVkhv84aj+TKDIATZMP8OMpBchNBAXg3nI3ACg/jwLYdlst07q12uduAEDgP4tegE4GyA+hTACxBSArjsgQ2pTEMLfrWj8AMOdAZjcQSXwKgPUYRBJHUnoA0h8TaYCwTJsBsGEmJgFgBUB/HIADWuuBujYbGQnA2lIit1wBXrvBHg0BUEtZRx8EIMyBSgFIKVEA0s/ohMpQb8yMAKrqBAB4E8Ay2FtfdUGrqmAROxuAeyX/tMaUCxBMWnMSupoiZANUKwCehGjbiwD8UfDlKgIBqKSMPyGA8hwO9gBVzvbjR4WUYOcBaI/VHYMB4SUA6eeLE1FSbwKYfHHO2+98noUnADsl7AegusauFrYsRCkABzF5NQP4k5kHsFwq5YEcMLwtMpLuA/Ae69ID4GfCJQCuJzIAID0gu8e2/A7zPo/J4WU8s/Y9AOur/zbrqkivAYS3XwXLiknMV6YAO5QVQAQA3V1ATihr+/23EeH7n9N/ffVbr27n6FMAAAAASUVORK5CYII=", "assets/sprites/forest/trees.png": "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", "assets/sprites/legacy/tile_0.png": "iVBORw0KGgoAAAANSUhEUgAAAEgAAAAkCAYAAAAq23xmAAABG0lEQVR42uXaTQoCMQwF4HkXEARdFFy78gDi/REP4Mq10IWC4AUUBgQZdP7aJC9tNt2WjzRNQ5uGLBZh+2LaD5hhnvGC6oG+YXaHfbuejycaKDDB3OOtXVdhTQMFJphuMECBEYYJCswwDFDwAGMJBU8wFlDwCDMGKhcSPMNoQKEEGEkolAQjAYUSYXJCoWSYHFCoASYFCjXBzIFCjTBToNAdVGngbMKyucaHC6ifGWSdRdqAvRnUV4NKP26TalBNUEm3mAeouUcwax9UUm8k2kl7hlJ9i42FYsAyfc2z1qkPCs08iAVKcpqYHUgTShpGFEgSSgtGBSgnlDaMKlBKi2AFYwY0FsoaxhxoqJeyhqEB+lenrGFog+0L3hv8rUsWDyR6BwAAAABJRU5ErkJggg==", "assets/sprites/legacy/tile_1.png": "iVBORw0KGgoAAAANSUhEUgAAAEgAAAAkCAYAAAAq23xmAAABNElEQVR42uXaTwqCUBAGcL8LlEIuvECrDhDdn+gArbqACwOtCxQIgkj+Kd/MfG96mwFX8uNz3ryHSUK2NsX+xfQ+YIZ5ljf8PVAf5nA6tvV6vtBAgQmmru5tzfIdDRSYYIaLAQqMMExQYIZhgEIMMJZQiAnGAgoxwiyBCoWEmGE0oOABRhIKnmAkoOARJiQUPMEUeZqUVRMUCh4TEzJR0IZp6kdb02wbBRSsEtNBfYMlhTsFheFFlcXnNIbVf66Ruk9QHxOkCTVsrL8kSzRBUz0otgY9t4ut6kGeoER3Mc9QQecgT7OR6CQdM5TqWWwpFAOW6WmetU91KDT3QSxQkreJwYE0oaRhRIEkobRgVIBCQmnDqAKtGRGsYMyAlkJZw5gDzc1S1jA0QGN9yhqGdrH9gvcGtWtdFuFpxY0AAAAASUVORK5CYII=", "assets/sprites/legacy/tile_2.png": "iVBORw0KGgoAAAANSUhEUgAAAEgAAAAkCAYAAAAq23xmAAABIElEQVR42uXaQQrCQAwF0P4DKNiF4AVceQDx/ogHcOUFBBcV6gEUFEHU1hlnkvzMdNNFuyiP9DcJbRqyY7pYXpmeB8ww/fGA6oFeYVab9f283+5ooMAE03fnx7V2RgMFJpiPewmgwAjDBAVmGAYoeICxhIInGAsoeIQJgcqFBM8wGlAoAUYSCiww83bSnLoLHRS8VkwMaAoUPL9KGhWFGmBSoFATzD9QyAkjEbTWUHhfVJVeNbFQXyuoNqjRChrLoNKhojKoJqikr1jJUFn7oJJ6I9FO2jOU6iwWCsWAZTrNs+bUE4VmH8QCJblNzA6kCSUNIwokCaUFowKUE0obRhUopUWwgjEDCoWyhjEH+tVLWcPQAA3llDUM79xE9gveDRltSxb+B9QMAAAAAElFTkSuQmCC", "assets/sprites/legacy/tile_3.png": "iVBORw0KGgoAAAANSUhEUgAAAEgAAAAkCAYAAAAq23xmAAABM0lEQVR42uXaXwqCQBAGcL8LZEQgdYCeOkB0f6ID9NQBCiEiu0CBIIioac6fb9d5GfBp+TE7O7uYJGSx2Ow+TOsBM8z7fsXsgeow++OhzJfTmQYKTDDP/FHmVbamgQITTDMYoMAIwwQFZhgGKIQA4wmFkGA8oBAizBAoKSSEDGMBhRhgNKEQE4wGFGKEkYRCzDASULCG2WbL5Ja/goGCdcUURVHmNE2DqCh4baUKagyWFm4fFJoPVRI4Y7dRF1b9u0XVtUG1VpBnQ/6nslQrqK8HxXByifWgOUFNOsVihhKdg2KajVQn6ZCna9O72FAoBizX2zxrn6pQaN6DWKA0XxPFgSyhtGFUgTShrGBMgCShrGFMgaaMCF4wbkBDobxh3IF+zVLeMDRAXX3KG4Y22H7B+wLRS10Wg8bbpQAAAABJRU5ErkJggg=="};
