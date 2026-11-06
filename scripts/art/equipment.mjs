// Authored at native resolution: nine 24×48 weapons and eight 16×16 effects.
// Run from the repository root: node scripts/art/equipment.mjs
import {createCanvas} from '@napi-rs/canvas';
import {writeFileSync} from 'node:fs';
const sheet=createCanvas(216,48),c=sheet.getContext('2d');
const ink='#172330',steel='#789aa9',light='#e2e9ce',shade='#3c5669',gold='#d7a85f',wood='#805235';
let ox=0;
function r(x,y,w,h,color){c.fillStyle=color;c.fillRect(ox+x,y,w,h);}
function line(x,y,xx,yy,color,n=1){
 let dx=Math.abs(xx-x),dy=-Math.abs(yy-y),sx=x<xx?1:-1,sy=y<yy?1:-1,e=dx+dy;
 for(;;){r(x,y,n,n,color);if(x===xx&&y===yy)break;let ee=e*2;if(ee>=dy){e+=dy;x+=sx;}if(ee<=dx){e+=dx;y+=sy;}}
}
function grip(x=11,y=36,len=8){r(x-1,y,4,len,ink);r(x,y,2,len,wood);for(let j=1;j<len;j+=3)r(x,y+j,2,1,gold);r(x-1,y+len,4,2,gold);r(x,y+len,1,1,light);}
function blade(x,top,bottom,width=5,color=steel){
 const mid=x+Math.floor(width/2);line(mid,top,x,top+4,ink);line(mid,top,x+width-1,top+4,ink);
 r(x,top+4,width,bottom-top-4,ink);r(x+1,top+4,width-2,bottom-top-4,color);
 line(mid,top+1,mid,bottom-1,light);if(width>4)r(mid+1,top+5,1,bottom-top-6,shade);
}
// Sword: tapered steel, fuller and brass crossguard.
blade(9,2,35,6);r(5,34,14,3,ink);r(6,34,12,1,gold);r(10,33,4,4,gold);r(11,34,2,1,light);grip();
ox=24;blade(9,15,34,6);r(6,33,12,3,ink);r(7,33,10,1,gold);grip(11,36,8);
// Staff: bound wood and a faceted violet crystal in a forked setting.
ox=48;r(10,13,4,34,ink);r(11,13,2,33,wood);r(11,16,1,29,gold);
for(let y=17;y<44;y+=7)r(10,y,4,2,shade);
line(6,7,8,16,gold,2);line(17,7,15,16,gold,2);r(7,14,10,3,ink);r(8,14,8,2,gold);
for(let y=1;y<14;y++){let half=Math.min(4,y,14-y);r(12-half,y,half*2+1,1,ink);if(half)r(13-half,y,half*2-1,1,'#7962a8');}
line(12,3,10,9,'#d7c6f1');line(12,3,14,10,'#a299dd');r(11,10,3,3,'#574875');r(11,46,3,2,gold);
// Bow faces +X. Tips at x=6, y=3/44; string is a separate animated layer.
ox=72;const bow=[[6,3],[9,5],[12,9],[15,15],[17,22],[17,25],[15,32],[12,38],[9,42],[6,44]];
for(let i=1;i<bow.length;i++){let [x,y]=bow[i-1],[xx,yy]=bow[i];line(x-1,y,xx-1,yy,ink,3);line(x,y,xx,yy,wood,2);line(x+1,y,xx+1,yy,gold);}
r(15,20,5,8,ink);r(16,20,3,8,'#4d3732');for(let y=20;y<28;y+=2)r(16,y,3,1,'#b7824e');r(5,3,3,2,light);r(5,43,3,2,light);
// Shield: bevelled heater with a raised central boss and a split field.
ox=96;for(let y=7;y<41;y++){let cut=y>30?Math.floor((y-30)/2):0;r(4+cut,y,16-cut*2,1,ink);r(5+cut,y,14-cut*2,1,steel);if(y>9&&y<36)r(7+cut,y,10-cut*2,1,'#45657a');}
r(6,8,12,2,light);r(6,11,1,19,light);r(11,12,2,21,gold);r(7,21,10,2,gold);r(10,19,4,6,ink);r(11,20,2,3,light);r(9,35,6,1,gold);
// Bandit sword: worn iron, nicked cutting edge and red wrapping.
ox=120;blade(9,5,35,6,'#9a9294');r(14,15,1,2,ink);r(9,25,1,2,ink);r(6,34,12,2,ink);r(7,34,10,1,'#a57561');grip();r(11,37,2,5,'#9f4e50');
// Duelist: narrow polished blade and a swept basket guard.
ox=144;blade(11,1,35,3);line(7,34,17,34,gold);line(17,34,17,40,gold);line(17,40,12,43,gold);grip(11,36,8);r(9,34,5,2,light);
// Berserker axe: asymmetric steel head, riveted cheek and heavy haft.
ox=168;r(10,4,4,43,ink);r(11,5,2,41,wood);r(11,5,1,35,gold);
for(let y=5;y<22;y++){let spread=y<10?y-3:Math.max(3,13-Math.floor(y/2));r(13,y,Math.min(9,spread),1,ink);r(13,y,Math.min(8,spread-1),1,steel);r(13+Math.min(7,spread-2),y,1,1,light);}
r(12,8,3,10,shade);r(13,10,1,2,gold);for(let y=33;y<46;y+=3)r(10,y,4,1,'#b27d55');
// Eclipse greatsword: broad dark steel, gold collar and violet inlay.
ox=192;blade(7,1,35,10,'#687287');r(11,6,2,24,'#ae92ca');r(11,8,1,19,'#e1cef0');r(3,34,18,3,ink);r(4,34,16,1,gold);r(10,32,4,6,gold);grip(11,37,7);
writeFileSync('assets/sprites/equipment/weapons.png',sheet.toBuffer('image/png'));
// Effects use the same native pixel grid and semantic palettes as the renderer.
const fx=createCanvas(128,16);c.canvas;const fc=fx.getContext('2d');
function p(x,y,color){if(x>=0&&x<16&&y>=0&&y<16){fc.fillStyle=color;fc.fillRect(ox+x,y,1,1);}}
function ray(x,y,xx,yy,color){let n=Math.max(Math.abs(xx-x),Math.abs(yy-y));for(let i=0;i<=n;i++)p(Math.round(x+(xx-x)*i/n),Math.round(y+(yy-y)*i/n),color);}
for(let k=0;k<8;k++){
 ox=k*16;
 if(k<2){
  let rad=k?7:5;for(let y=0;y<16;y++)for(let x=0;x<16;x++){
   let dx=x-7,dy=y-7,dd=dx*dx+dy*dy;if(dd<rad*rad){p(x,y,dd>(rad-1.5)**2?'#4e527e':dx+dy<-2?'#cce9e3':'#8279bb');}
  }
  ray(5,4,7,3,'#f5f3d3');ray(4,5,4,7,'#b9e9e4');p(10,10,'#564775');p(1,7,'#8dbfce');p(12,2,'#8dbfce');
 }else if(k===2||k===3){
  // Both arrowheads face +X, shared by nocked and flying arrows.
  ray(1,8,13,8,'#4a3732');ray(2,7,13,7,k===3?'#edc87c':'#d5ba85');
  ray(10,4,14,7,'#eef1d7');ray(10,10,14,7,'#96b0b6');ray(10,5,10,9,'#78929f');
  ray(1,4,4,7,'#d5d6bc');ray(1,10,4,8,'#c3b8a1');p(1,5,'#698985');
  if(k===3){p(7,6,'#fff3b0');p(5,9,'#e2b46d');}
 }else{
  const main=k===4?'#86d8c5':k===5?'#d88a83':k===6?'#e1b076':'#94bedb';
  const spokes=k===6?8:4;
  for(let i=0;i<spokes;i++){
   const a=i*Math.PI*2/spokes,rad=i%2?4:7;
   ray(Math.round(7+Math.cos(a)*3),Math.round(7+Math.sin(a)*3),Math.round(7+Math.cos(a)*rad),Math.round(7+Math.sin(a)*rad),main);
  }
  for(let y=4;y<=10;y++)for(let x=4;x<=10;x++)if(Math.abs(x-7)+Math.abs(y-7)<4)p(x,y,Math.abs(x-7)+Math.abs(y-7)<2?'#fff3ce':main);
  p(3,3,main);p(11,11,main);p(10,2,main);p(2,10,main);
 }
}
writeFileSync('assets/sprites/equipment/fx.png',fx.toBuffer('image/png'));
console.log('Authored 9 weapons + 8 effects; bow limbs and arrowheads face +X.');
