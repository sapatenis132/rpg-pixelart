import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {createCanvas} from '@napi-rs/canvas';
import {loadGame} from './helpers/headless-game.mjs';

const expected=JSON.parse(readFileSync(new URL('./fixtures/before-racial-v6.json',import.meta.url)));
const game=await loadGame(),d=game.debug;
const hash=value=>createHash('sha256').update(value).digest('hex');
const jsonHash=value=>hash(JSON.stringify(value));
const races=['human','elf','orc','dwarf','halfling'];
const roles=['warrior','guardian','rebel','arcanist','hunter'];
const tile=createCanvas(32,48),ctx=tile.getContext('2d');
const traitTile=createCanvas(32,48),tc=traitTile.getContext('2d');
ctx.imageSmoothingEnabled=false;
for(const [name,value] of Object.entries(game.protectedState().configuration))
 assert.equal(jsonHash(value),expected.configuration[name],name+': balanceamento publicado preservado');
for(const sample of expected.raceCases){
 d.newCampaign({name:'Contrato',race:sample.race,archetype:sample.archetype},47);
 d.action('dodge');const state=d.snapshot();
 assert.equal(state.hp,sample.hp);assert.equal(state.mp,sample.mp);
 assert.equal(jsonHash(state.bonuses),jsonHash(sample.bonuses));
 assert.equal(state.dodgeCooldown,sample.dodgeCooldown);
}
for(const [style,signature] of Object.entries(expected.enemies)){
 const image=game.legacyEnemy(style),canvas=createCanvas(image.width,image.height);
 const c=canvas.getContext('2d');c.drawImage(image,0,0);
 assert.equal(hash(c.getImageData(0,0,canvas.width,canvas.height).data),signature,
  style+': arte dos inimigos publicada preservada');
}
for(const sample of expected.worldSeeds){
 assert.equal(jsonHash(d.worldForSeed(sample.seed)),sample.world);
 assert.equal(jsonHash(d.spawnGeometry(sample.seed)),sample.spawn);
}
const assets=d.refinedRaces();
for(const race of races){
 for(const image of [assets[race].body,assets[race].traits]){
  assert.ok(image.loaded,race+': atlas real carregado');
  assert.equal(image.width,128);assert.equal(image.height,2688);
 }
}
let frames=0;
const silhouettes=new Map();
for(const role of roles)for(const race of races)
 for(let state=0;state<7;state++)for(let dir=0;dir<8;dir++)for(let frame=0;frame<4;frame++){
  ctx.clearRect(0,0,32,48);
  assert.ok(d.paintPlayableFrame(ctx,race,role,state,dir,frame));
  const pixels=ctx.getImageData(0,0,32,48).data;
  let ink=0;const alpha=[];
  for(let k=3;k<pixels.length;k+=4){alpha.push(pixels[k]?1:0);if(pixels[k])ink++;}
  assert.ok(ink>25,race+'/'+role+': quadro deve permanecer visível');
  // Examina a camada anatômica real: todo pixel opaco deve sobreviver ao traje.
  tc.clearRect(0,0,32,48);
  tc.drawImage(d.raceTraitsImage(race),frame*32,(state*8+dir)*48,32,48,0,0,32,48);
  const traits=tc.getImageData(0,0,32,48).data;
  for(let k=0;k<traits.length;k+=4)if(traits[k+3]===255){
   for(let component=0;component<4;component++)
    assert.equal(pixels[k+component],traits[k+component],race+'/'+role+': anatomia sobre a roupa');
  }
  if(state===0&&frame===0&&[1,3,5].includes(dir)){
   const key=role+':'+dir;if(!silhouettes.has(key))silhouettes.set(key,[]);
   silhouettes.get(key).push(hash(Uint8Array.from(alpha)));
  }
  frames++;
 }
assert.equal(frames,5600,'25 combinações × 7 estados × 8 direções × 4 quadros');
for(const [key,signatures] of silhouettes)
 assert.equal(new Set(signatures).size,5,key+': cinco silhuetas, mesmo usando a mesma classe');

// A proteção passiva não pode esconder a pose de um comando já aceito.
for(const fin of [false,true]){
 const actor={hp:100,act:{move:{impact:.43,dur:.4,fin},time:.2},
  meleeGuard:.4,guardWindow:.2,reaction:.15};
 const motion=d.animationState(actor,true);
 assert.equal(motion.name,fin?'finisher':'attack');
 assert.equal(motion.frame,2);
 assert.equal(actor.meleeGuard,.4);assert.equal(actor.guardWindow,.2);
}
assert.equal(d.animationState({hp:100,parryWindow:.15},true).name,'guard');
assert.equal(d.animationState({hp:100,dodge:.15},true).name,'dodge');
assert.equal(d.animationState({hp:100,reaction:.15},true).name,'hurt');

// Confirma que o render principal usa corpo, traje e anatomia da atualização v6.
const main=game.canvas.getContext('2d'),draw=main.drawImage.bind(main);
for(const race of races)for(const role of roles){
 d.newCampaign({name:'Arte',race,archetype:role},47);
 const calls=new Set();main.drawImage=(image,...args)=>{calls.add(image);return draw(image,...args);};
 game.render();
 assert.ok(calls.has(d.refinedRaceImage(race)),'render usa corpo v6: '+race);
 assert.ok(calls.has(d.playableCostume(role)),'render usa roupa da classe: '+role);
 assert.ok(calls.has(d.raceTraitsImage(race)),'render preserva anatomia: '+race);
}
main.drawImage=draw;
if(process.argv.includes('--render')){
 const output=resolve('screenshots');mkdirSync(output,{recursive:true});
 const sheet=createCanvas(1120,830),c=sheet.getContext('2d');c.imageSmoothingEnabled=false;
 const silhouette=createCanvas(32,48),silhouetteContext=silhouette.getContext('2d');
 c.fillStyle='#12232b';c.fillRect(0,0,sheet.width,sheet.height);
 c.font='bold 19px monospace';c.fillStyle='#ead3a5';
 c.fillText('IDENTIDADE RACIAL V6 / CORPO + CLASSE + ANATOMIA',20,28);
 roles.forEach((role,col)=>c.fillText(role,145+col*192,59));
 races.forEach((race,row)=>{
  c.fillStyle='#b6d8c8';c.font='bold 15px monospace';c.fillText(race,12,112+row*145);
  roles.forEach((role,col)=>{
   const x=132+col*192,y=70+row*145;c.fillStyle='#1c353b';c.fillRect(x,y,182,136);
   ctx.clearRect(0,0,32,48);d.paintPlayableFrame(ctx,race,role,0,1,0);
   c.drawImage(tile,x+5,y-1,96,144);
   const mask=ctx.getImageData(0,0,32,48);
   for(let pixel=0;pixel<mask.data.length;pixel+=4){
    mask.data[pixel]=8;mask.data[pixel+1]=14;mask.data[pixel+2]=19;
   }
   silhouetteContext.putImageData(mask,0,0);
   c.drawImage(silhouette,x+85,y-1,96,144);
  });
 });
 writeFileSync(resolve(output,'identidade-racial-v6.png'),sheet.toBuffer('image/png'));
}
console.log('PASS: 5.600 composições v6, silhuetas em 5 classes, anatomia visível, prioridades visuais, 25 atributos raciais, inimigos e 24 seeds preservados.');
