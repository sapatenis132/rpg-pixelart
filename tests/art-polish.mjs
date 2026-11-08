// Asset contracts and directional bow regression. No browser/layout claims here.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {createCanvas,loadImage} from '@napi-rs/canvas';
import {loadGame} from './helpers/headless-game.mjs';

// Decoded RGBA signatures of the published v6 assets, before this art pass.
const before={
  "assets/sprites/playable/arcanist-outfit.png": [
    128,
    2688,
    "e50223bd830d725ea563a12e8ee9620e4f2f001424fe3e252c88bd1be088b915"
  ],
  "assets/sprites/playable/guardian-outfit.png": [
    128,
    2688,
    "c31c77836cdec6e3d9db3c09a0a47d12408c9e73e1f6f69d4c7e17397b10c8c1"
  ],
  "assets/sprites/playable/hunter-outfit.png": [
    128,
    2688,
    "4740e9853819f4c57f9d870c3feeda0010129aa7b30db03d5d7c7712132ff745"
  ],
  "assets/sprites/playable/rebel-outfit.png": [
    128,
    2688,
    "bf3474726cc9fc6bb5869e3670204c56080b5af8289e4dbb0d1d0cddc5e65d76"
  ],
  "assets/sprites/playable/warrior-outfit.png": [
    128,
    2688,
    "b4e44848957bc1ae39a75a585f75b1c2d464db61305cfeb924fcfc1af88f4685"
  ],
  "assets/sprites/playable/races/dwarf.png": [
    128,
    2688,
    "5b1a7d0aa8da7dd0d82e5ad4f5b024813cd2b034b323fe630898e4e91901ed84"
  ],
  "assets/sprites/playable/races/elf.png": [
    128,
    2688,
    "d6c41af0fad86baa1f021908ba4a8b4e444a5e4a1acc0f8325260f7cd1b52468"
  ],
  "assets/sprites/playable/races/halfling.png": [
    128,
    2688,
    "1a74e4a0333eec68c2d3d734812606d0d486874cedfc6b322b0c40924dd267e9"
  ],
  "assets/sprites/playable/races/human.png": [
    128,
    2688,
    "030590290a32ec72d91afcc8668c0b7e7e489f94370d2c08cddb356dcd02f94a"
  ],
  "assets/sprites/playable/races/orc.png": [
    128,
    2688,
    "87bf5e6bf60622dcd74be390de8e0e3e5f8b7b9a1e9a69fd5da00c885a3b148d"
  ],
  "assets/sprites/playable/race-traits/dwarf.png": [
    128,
    2688,
    "4192d2a0e06f6d61129f378b61e4e8a28123a6e28bcc8eef648f5d3553694c47"
  ],
  "assets/sprites/playable/race-traits/elf.png": [
    128,
    2688,
    "296fd897b47f0440fa4be2e99e187ff9ace9d91c8b2564755dfe03e746873e21"
  ],
  "assets/sprites/playable/race-traits/halfling.png": [
    128,
    2688,
    "7386a0c37c7d211e435176a409ef40159a059cc710d28838ec630d29c1c673d8"
  ],
  "assets/sprites/playable/race-traits/human.png": [
    128,
    2688,
    "ed755542e6863b383295fdab407e0cd7b953021ad056409b12219886c11f6715"
  ],
  "assets/sprites/playable/race-traits/orc.png": [
    128,
    2688,
    "4723612d46d228fb61bba003c7ad7c51671c7b8b2d1ef464121b20996da751b3"
  ],
  "assets/sprites/legacy/berserker_sheet.png": [
    128,
    384,
    "010bb44a435996205182072c1fd97f89bf7873f8684f49a1ef6219a3ab3cbdb4"
  ],
  "assets/sprites/legacy/duelist_sheet.png": [
    128,
    384,
    "da223f75468dea3ef31918b80bb7e663cf57c1375e78831ace6106b184c09f69"
  ],
  "assets/sprites/legacy/elite_sheet.png": [
    128,
    384,
    "d9ea57eb506902e5c8100b5b97c0e94be15a05e7f79cf4e7ffd4ce81a676514b"
  ],
  "assets/sprites/legacy/enemy_sheet.png": [
    128,
    384,
    "588c990d793350353882a4c8c5a6ce7d2270401065e176426f4fa7e146f9ac14"
  ],
  "assets/sprites/legacy/guardian_sheet.png": [
    128,
    384,
    "901185b191dd1eaa458ca3ef7ba7b82e7bea4787dce457ef58094ab3e217afa7"
  ],
  "assets/sprites/legacy/hero_sheet.png": [
    128,
    384,
    "b91ad30d3d4a1c0ead4ff3993d0454584b302bd520a22e2ee65c4dddaddeca20"
  ],
  "assets/sprites/legacy/tile_0.png": [
    72,
    36,
    "6ef7e38b6b70e77e4418d023e587e14b0d56c1e7e15ab8a8c5a210a75ee3d6ee"
  ],
  "assets/sprites/legacy/tile_1.png": [
    72,
    36,
    "b2ba8e7ac0bb6b85540eee46bc4016a62ab33699ab7512440f9b1e93e4638dd1"
  ],
  "assets/sprites/legacy/tile_2.png": [
    72,
    36,
    "4327469fe0e339ccbd4ae2400d43eb142977cabdd323fcba92f671a2615103af"
  ],
  "assets/sprites/legacy/tile_3.png": [
    72,
    36,
    "40ee77efa856bcfb452cbf44569f059ce815eb47e9bc51b0bb59caab65e60eae"
  ],
  "assets/sprites/forest/ground.png": [
    256,
    544,
    "52217ad8720ddfe83db32c40b20234639b2bd7c164935273e8b7d20bc45e509a"
  ],
  "assets/sprites/forest/props.png": [
    192,
    64,
    "0486a27aad5a317af49a21a81268053d98ae69a1027c14ed7b6e110ef74e3ff8"
  ],
  "assets/sprites/forest/trees.png": [
    384,
    96,
    "ff0f4d8c204a29dbb1ca1d23156a70febe3351f5ac6c6d1d709e7d51d391c239"
  ],
  "assets/sprites/equipment/fx.png": [
    128,
    16,
    "2280306c103c1bda4efa0fc0b2e398d9d79f3bb3fe3917b02481b6a116acc645"
  ],
  "assets/sprites/equipment/weapons.png": [
    216,
    48,
    "76a57ca05cb88b854948d35e35e899a19a3007b811a9907cd180b1dc4ede4c9b"
  ],
  "assets/sprites/enemies/berserker.png": [
    128,
    768,
    "a7d0d4b036394799b8a5ee67513d6f89112f5a5829a4ff03ba839498f6b75791"
  ],
  "assets/sprites/enemies/duelist.png": [
    128,
    768,
    "fd82fbc804ded7e0371580869372d708159f13513e6db3d93ef4aa1ed61ca48a"
  ],
  "assets/sprites/enemies/elite.png": [
    128,
    768,
    "9b12b6a9ffa13fc7b1f1021801c9e2b764263c5f42c3a1a6de34125e8c498b01"
  ],
  "assets/sprites/enemies/enemy.png": [
    128,
    768,
    "2d429681bd09d65cc5b5a918b1357045f347a26e4a2b473e2e33a9ddb570544a"
  ],
  "assets/sprites/enemies/guardian.png": [
    128,
    768,
    "d6acdeddc033a17a56640b5432f80380ee048a066f654e20267f3cd2e7ee46c1"
  ],
  "assets/sprites/animated/berserker-enemy.png": [
    128,
    2688,
    "1de8f2cc6c25369b2fa8b7c750faa546fe8fd2b1217cd0b0291257d301b1c88d"
  ],
  "assets/sprites/animated/duelist-enemy.png": [
    128,
    2688,
    "e01ac6ad05db56ebd3f6d1f4aa7e131e961beafa89a5932d6a778de967f74abf"
  ],
  "assets/sprites/animated/dwarf.png": [
    128,
    2688,
    "f88fd547efdca7e2410f702389fcf4320de524ba573ecd8e8d384b59d28a05a6"
  ],
  "assets/sprites/animated/elf.png": [
    128,
    2688,
    "e3bf9bc7f623b893d99ff4504eb11d5f4dc72df184cfbf1bff22e798c7ae7897"
  ],
  "assets/sprites/animated/elite-enemy.png": [
    128,
    2688,
    "44307cad456fee7a929abca46eaca7ff511900e181878a2d7d5f60d1b60cd30e"
  ],
  "assets/sprites/animated/enemy-enemy.png": [
    128,
    2688,
    "3538150943ed280265dcd5b00306c10dfa99cb8b442651e44f6ed038d77f4952"
  ],
  "assets/sprites/animated/guardian-enemy.png": [
    128,
    2688,
    "88e24886046db27787eff2c0d3bddfc4944eb7925ac249986e8143c8e143ec5e"
  ],
  "assets/sprites/animated/halfling.png": [
    128,
    2688,
    "545a3c6a7637a75072d3025f5b053540fc9da489275a9a0c53f6d32d9c3c485b"
  ],
  "assets/sprites/animated/human.png": [
    128,
    2688,
    "7c30b8d5dda24491153201dcc9b2c19a53272e89c9f5c805c618c076035a5d36"
  ],
  "assets/sprites/animated/orc.png": [
    128,
    2688,
    "ba7f4b3f9217072a24949945778b9ae6d50bebff9b16418bdf08b890176c3715"
  ],
  "assets/sprites/actors/dwarf.png": [
    128,
    768,
    "f4c5c2b0d94e84cae92220a427934ac3e28f1f90932415dc5bb82aa3ea368816"
  ],
  "assets/sprites/actors/elf.png": [
    128,
    768,
    "ad0071fd4787bfc388eee60d55e8a9951a9d5c67e6ec72eff1307a587e51935b"
  ],
  "assets/sprites/actors/halfling.png": [
    128,
    768,
    "a7c3da5495111c60584f5e17da359888521f782727507524a675475950f91b1c"
  ],
  "assets/sprites/actors/human.png": [
    128,
    768,
    "2aad2ffd620a95ff970de9889d31a36ce6f4748f435f3de84d23d31e06da44cc"
  ],
  "assets/sprites/actors/orc.png": [
    128,
    768,
    "08f9413ec1c37de70238f8a046fc33df37e7d5538b3474d95cc3e288702bd01f"
  ]
};
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
let cells=0;
for(const [path,[width,height,previous]] of Object.entries(before)){
 const image=await loadImage(resolve(path));
 assert.equal(image.width,width,path+': atlas width is part of the renderer contract');
 assert.equal(image.height,height,path+': atlas height is part of the renderer contract');
 const canvas=createCanvas(width,height),c=canvas.getContext('2d');c.drawImage(image,0,0);
 assert.notEqual(hash(c.getImageData(0,0,width,height).data),previous,path+': actual pixels must improve, not just PNG encoding');
 const [cw,ch]=path.includes('/forest/ground')?[64,32]:
  path.includes('/forest/props')?[24,32]:path.includes('/forest/trees')?[64,96]:
  path.includes('/equipment/weapons')?[24,48]:path.includes('/equipment/fx')?[16,16]:
  path.includes('/legacy/tile')?[72,36]:[32,48];
 for(let y=0;y<height;y+=ch)for(let x=0;x<width;x+=cw){
  const pixels=c.getImageData(x,y,cw,ch).data;
  let ink=0;for(let k=3;k<pixels.length;k+=4)if(pixels[k])ink++;
  assert.ok(ink>0,path+': visible frame at '+x+','+y);
  cells++;
 }
}
assert.equal(Object.keys(before).length,50,'every original sprite sheet has an art pass');

// Instrument the actual production functions inside their IIFE, without a test
// implementation of the bow. Capture local string segments and native transforms.
const probe=`window.__artProbe={
 string:bowStringGeometry,
 enemy(style,state,direction,frame){
  const savedClock=clock,actor=makeEnemy(0),step=(frame+.1)/4;
  Object.assign(actor,{style,x:0,z:0,hp:100,maxHp:100,phase:'chase',
   moveMagnitude:1,walk:(frame+.1)/.52,face:{x:Math.cos(direction*Math.PI/4),z:Math.sin(direction*Math.PI/4)},
   strikeMax:1,strike:1-step,downTotal:1,downTimer:0,reaction:0,evade:0});
  if(state==='attack')actor.phase='strike';
  if(state==='guard'){actor.phase='guard';clock=step*.8;}
  if(state==='dodge'){actor.phase='evade';actor.evade=.27*(1-step);}
  if(state==='hurt'){actor.phase='stun';actor.reaction=.3*(1-step);}
  if(state==='down'){actor.phase='down';actor.downTimer=1-step;}
  if(state==='dead'){actor.hp=0;actor.phase='dead';actor.visualDeathAt=0;clock=.58*step;}
  if(state==='crush'||state==='dash'){actor.phase='strike';actor.type=state;}
  const image=characterImage(actor,false),motion=characterMotion(actor,false),draws=[],original=ctx.drawImage;
  ctx.clearRect(0,0,w,h);
  ctx.drawImage=function(img,...args){draws.push({src:img.getAttribute?.('src'),args});return original.call(ctx,img,...args);};
  try{figure(actor,'enemy');}
  finally{ctx.drawImage=original;clock=savedClock;}
  return{motion,draws,src:image.getAttribute('src'),width:image.naturalWidth,height:image.naturalHeight};
 },
 capture(face,progress,key='H'){
  const move=WEAPON_MOVES.hunter[key],actor={face,act:{move,time:progress*move.dur}};
  const pose=visualWeaponPose(actor,'hunter',true,0,false,1,progress,move);
  const segments=[],images=[],originalSegment=pixelSegment,originalDraw=ctx.drawImage;
  pixelSegment=function(...args){segments.push({args,transform:(()=>{const t=ctx.getTransform();return{a:t.a,b:t.b,c:t.c,d:t.d,e:t.e,f:t.f};})()});return originalSegment(...args);};
  ctx.drawImage=function(image,...args){images.push({src:image.getAttribute?.('src'),args,transform:(()=>{const t=ctx.getTransform();return{a:t.a,b:t.b,c:t.c,d:t.d,e:t.e,f:t.f};})()});return originalDraw.call(ctx,image,...args);};
  try{drawEquipmentSprites(actor,true,'hunter',pose,1,true,false,progress);}
  finally{pixelSegment=originalSegment;ctx.drawImage=originalDraw;}
  return{pose,segments,images,stage:playableAttackTiming(move,progress),impact:move.impact};
 }
};`;
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8')
 .replace('resize();reset();',probe+'resize();reset();');
const game=await loadGame({html}),p=game.context.__artProbe;
assert.ok(p,'instrumented production renderer');
const base=p.string(24,48,0,1),drawn=p.string(24,48,1,1);
assert.deepEqual({...drawn.top},{...base.top},'upper limb tip stays anchored');
assert.deepEqual({...drawn.bottom},{...base.bottom},'lower limb tip stays anchored');
assert.ok(drawn.top.y<drawn.nock.y&&drawn.nock.y<drawn.bottom.y,'nock lies between limb tips');
assert.ok(drawn.nock.x<base.nock.x,'string retracts away from the target');
assert.ok(drawn.nock.x<drawn.top.x&&drawn.nock.x<drawn.bottom.x,'drawn string forms a rearward V');
assert.deepEqual({...p.string(24,48,-1,1).nock},{...base.nock},'pull is clamped at rest');
assert.deepEqual({...p.string(24,48,2,1).nock},{...drawn.nock},'pull is clamped at full draw');

const weapons=await loadImage(resolve('assets/sprites/equipment/weapons.png'));
const bow=createCanvas(24,48),bc=bow.getContext('2d');bc.drawImage(weapons,72,0,24,48,0,0,24,48);
const alpha=bc.getImageData(0,0,24,48).data;
function centerX(y0,y1){let sum=0,n=0;for(let y=y0;y<=y1;y++)for(let x=0;x<24;x++)if(alpha[(y*24+x)*4+3]){sum+=x;n++;}assert.ok(n);return sum/n;}
assert.ok(centerX(20,27)>centerX(3,5)+5,'limbs bow toward +X, string lies toward the shooter');

const directions=Array.from({length:8},(_,i)=>({x:Math.cos(i*Math.PI/4),z:Math.sin(i*Math.PI/4)}));
let shots=0;
for(const face of directions)for(const key of ['L','H','LLL','HH']){
 const initial=p.capture(face,.12,key),wind=p.capture(face,initial.impact*.86,key),released=p.capture(face,Math.min(.99,initial.impact+.22),key);
 const expected={x:face.x-face.z,y:(face.x+face.z)*.52};
 const magnitude=Math.hypot(expected.x,expected.y);
 const aligned=Math.cos(wind.pose.aimAngle)*expected.x/magnitude+Math.sin(wind.pose.aimAngle)*expected.y/magnitude;
 assert.ok(aligned>.999,'bow rotates with the projected firing axis in every direction');
 assert.ok(wind.pose.pull>initial.pose.pull,'accepted shot visibly pulls the string');
 assert.ok(released.pose.pull<.01,'string settles after projectile release');
 assert.ok(wind.segments.length>=2,'real renderer draws the two string segments');
 const shape=p.string(24*.88,Math.max(12,Math.max(7,wind.pose.r)*48/38),wind.pose.pull,1);
 const near=(a,b)=>Math.abs(a-b)<.01;
 const connects=(segment,a,b)=>{
  const v=segment.args;return near(v[0],a.x)&&near(v[1],a.y)&&near(v[2],b.x)&&near(v[3],b.y)||
   near(v[0],b.x)&&near(v[1],b.y)&&near(v[2],a.x)&&near(v[3],a.y);
 };
 assert.ok(wind.segments.some(s=>connects(s,shape.top,shape.nock)),'actual upper string joins the real nock');
 assert.ok(wind.segments.some(s=>connects(s,shape.bottom,shape.nock)),'actual lower string joins the real nock');
 const arrows=capture=>capture.images.filter(i=>i.src?.endsWith('/fx.png')&&[32,48].includes(i.args[0]));
 assert.ok(arrows(wind).length>0,'nocked arrow exists during windup');
 for(const arrow of arrows(wind)){
  const a=arrow.args;
  assert.ok(a[6]>0,'nocked arrow keeps the +X orientation of the flying projectile');
  assert.ok(Math.abs(a[4]+a[6]/16-shape.nock.x)<=.6,'arrow tail is attached to the moving nock');
  assert.ok(Math.abs(a[5]+a[7]*7/16)<=.6,'arrow shaft follows the string nock axis');
 }
 assert.equal(arrows(released).length,0,'released arrow does not remain nocked');
 for(const s of wind.segments){const t=s.transform;
  assert.ok(near(t.a,Math.cos(wind.pose.aimAngle))&&near(t.b,Math.sin(wind.pose.aimAngle)),
   'string uses the same rotation as bow and projectile');
 }
 shots++;
}
// The live figure renderer must use the seven-state sprites, rather than
// displaying an upgraded gallery while silently retaining legacy combat art.
let enemyFrames=0;
const expectedStates={walk:0,attack:1,guard:2,dodge:3,hurt:4,down:5,dead:5,crush:6,dash:6};
for(const style of ['enemy','guardian','duelist','berserker','elite']){
 const states=['walk','attack','guard','dodge','hurt','down','dead'];
 if(style==='elite')states.push('crush','dash');
 for(const state of states)for(let dir=0;dir<8;dir++)for(let frame=0;frame<4;frame++){
  const actual=p.enemy(style,state,dir,frame),source='assets/sprites/animated/'+style+'-enemy.png';
  assert.equal(actual.src,source,style+': production selects seven-state enemy atlas');
  assert.equal(actual.width,128);assert.equal(actual.height,2688);
  assert.equal(actual.motion.state,expectedStates[state],style+'/'+state+': correct animation row');
  assert.equal(actual.motion.frame,frame,style+'/'+state+': all four animation frames reachable');
  const body=actual.draws.filter(call=>call.src===source);
  assert.equal(body.length,1,style+': production figure draws the selected PNG once');
  const [sx,sy,sw,sh,dx,dy,dw,dh]=body[0].args;
  assert.equal(sx,frame*32);assert.equal(sy,(dir+expectedStates[state]*8)*48);
  assert.equal(sw,32);assert.equal(sh,48);
  assert.ok(sx>=0&&sx+sw<=128&&sy>=0&&sy+sh<=2688,'enemy crop remains inside the atlas');
  assert.ok(Number.isFinite(dx)&&Number.isFinite(dy)&&dw>0&&dh>0,'native figure has a valid visible destination');
  assert.ok(!actual.draws.some(call=>call.src?.includes('/legacy/')),'no legacy art in a loaded enemy render');
  if(state!=='dead')assert.ok(actual.draws.some(call=>call.src?.endsWith('/equipment/weapons.png')),
   style+': live enemy uses the refined equipment atlas');
  enemyFrames++;
 }
}
if(process.argv.includes('--render')){
 mkdirSync(resolve('screenshots'),{recursive:true});
 const c=createCanvas(960,480),out=c.getContext('2d');out.imageSmoothingEnabled=false;
 out.fillStyle='#12232b';out.fillRect(0,0,960,480);out.font='bold 18px monospace';out.fillStyle='#ead3a5';
 out.fillText('ARCO / OITO DIREÇÕES / CORDA NA DIREÇÃO DO ATIRADOR',18,28);
 for(let i=0;i<8;i++){
  const face=directions[i],capture=p.capture(face,.25,'H');
  const x=120+(i%4)*240,y=145+Math.floor(i/4)*215;
  out.fillStyle='#1b363e';out.fillRect(x-103,y-85,206,175);
  out.save();out.translate(x,y);out.rotate(capture.pose.aimAngle);
  out.drawImage(bow,-24,-48,48,96);
  const v=p.string(48,96,.95,2);out.strokeStyle='#e8e6c4';out.lineWidth=2;
  out.beginPath();out.moveTo(v.top.x,v.top.y);out.lineTo(v.nock.x,v.nock.y);out.lineTo(v.bottom.x,v.bottom.y);out.stroke();
  out.fillStyle='#d5ba85';out.fillRect(v.nock.x,-1,46,2);out.fillStyle='#e8edda';out.fillRect(v.nock.x+43,-3,3,6);
  out.restore();out.fillStyle='#aed1c5';out.fillText((i*45)+'°',x-16,y+80);
 }
 writeFileSync(resolve('screenshots/arco-oito-direcoes.png'),c.toBuffer('image/png'));
}
console.log('PASS: all 50 art sheets, '+cells+' atlas cells, bow orientation/string/nocked release across 8 directions, '+shots+' shot cases and '+enemyFrames+' live enemy animation frames.');
