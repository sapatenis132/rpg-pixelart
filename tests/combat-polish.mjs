import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {createCanvas} from '@napi-rs/canvas';
import {loadGame} from './helpers/headless-game.mjs';

const game=await loadGame(),d=game.debug;
const archetypes=['warrior','guardian','rebel','arcanist','hunter'];
const races=['human','elf','orc','dwarf','halfling'];
const tick=seconds=>{for(let left=seconds;left>1e-8;left-=1/120)d.testTick(Math.min(left,1/120));};
const checksum=canvas=>createHash('sha256').update(canvas.getContext('2d')
 .getImageData(0,0,canvas.width,canvas.height).data).digest('hex');
function laboratory(archetype){
 game.elements.get('drillArchetype').value=archetype;
 game.elements.get('drillRace').value='human';
 d.chooseDrill('sandbox','dummy',0);
 d.debugSetFoes([{x:8,z:0,hp:10000,maxHp:10000,cooldown:999}]);
}
function until(predicate,message){
 for(let i=0;i<360;i++){if(predicate())return;d.testTick(1/120);}
 assert.fail(message);
}

// Um comando aceito sobrevive a toques duplicados, sem abrir uma segunda fila.
for(const archetype of archetypes){
 laboratory(archetype);
 d.action('L');tick(.13);d.action('L');
 assert.equal(d.snapshot().buffer,'L',archetype+': segundo golpe aceito');
 for(let i=0;i<8;i++)d.action(i%2?'L':'H');
 assert.equal(d.snapshot().buffer,'L',archetype+': comando não pode ser apagado ou trocado');
 until(()=>d.snapshot().seq==='LL',archetype+': LL deve executar');
 assert.equal(d.snapshot().acceptedInputs,2);
 tick(.13);d.action('L');
 until(()=>d.snapshot().seq==='LLL',archetype+': LLL deve executar');
 assert.equal(d.snapshot().acceptedInputs,3);
 assert.ok(d.snapshot().maxChain>=3);
}

// Entrada no fim da recuperação espera o fim do lock, sem encurtar a arma.
laboratory('warrior');d.action('H');
until(()=>d.snapshot().attack===null,'Pesado deve terminar');
const before=d.snapshot();
assert.ok(before.attackLock>0);
tick(.08);d.action('L');
assert.equal(d.snapshot().buffer,'L');
assert.equal(d.snapshot().acceptedInputs,1,'buffer não executa antes da recuperação');
until(()=>d.snapshot().acceptedInputs===2,'entrada deve executar depois do lock');

// Flechas usam a origem do tiro; o cajado continua sem custo de mana.
for(const [distance,expected] of [[0,.8],[1.2,.8],[2.2,.95],[3.2,1.1],[8,1.1]])
 assert.ok(Math.abs(d.arrowDamageMultiplier(distance)-expected)<1e-9);
for(let distance=0;distance<8;distance+=.1)
 assert.ok(d.arrowDamageMultiplier(distance)<=d.arrowDamageMultiplier(distance+.1));
function fire(archetype,distance,key='L'){
 laboratory(archetype);
 d.debugSet({player:{face:{x:1,z:0}}});
 d.debugSetFoes([{x:distance,z:0,hp:10000,maxHp:10000,balance:10000,maxBalance:10000,
  cooldown:999,guardCooldown:999,evadeCooldown:999,knockX:0,knockZ:0}]);
 const mana=d.snapshot().mp;
 d.action(key);tick(1.1);
 return{...d.snapshot(),mana};
}
const near=fire('hunter',1),far=fire('hunter',3.3);
assert.equal(near.damageDealt,9,'flecha de 11 causa 9 perto');
assert.equal(far.damageDealt,12,'flecha de 11 causa 12 com espaço');
const magic=fire('arcanist',3.3);
assert.equal(magic.damageDealt,10,'distância não altera dano mágico');
assert.equal(magic.mp,magic.mana,'ataque básico de cajado não usa mana');
laboratory('hunter');
d.debugSetFoes([{x:2,z:0,hp:10000,maxHp:10000,balance:10000,maxBalance:10000,
 cooldown:999,guardCooldown:999,evadeCooldown:999}]);
d.action('L');tick(.17);
assert.ok(d.snapshot().projectiles.length>0,'flecha ainda deve estar viajando');
d.debugSet({player:{x:-2,z:0}});
tick(.6);
assert.equal(d.snapshot().damageDealt,10,'recuar depois do disparo não aumenta o dano');
const volley=fire('hunter',1,'H');
assert.equal(volley.hits,3,'rajada preserva os três contatos');
assert.equal(volley.damageDealt,24,'dano é aplicado por flecha, sem duplicar a salva');
assert.ok(volley.enemyBalance>=9976,'rajada distribui a pressão de postura');

// As 25 combinações têm figurino próprio e quatro poses reais de ataque.
for(const race of races){
 const looks=[];
 for(const archetype of archetypes){
  const walk=d.heroSpriteAtlas(race,archetype),attack=d.heroSpriteAtlas(race,archetype,true);
  assert.equal(walk.width,128);assert.equal(walk.height,384);
  assert.equal(walk,d.heroSpriteAtlas(race,archetype),'atlas deve ser reutilizado');
  looks.push(checksum(walk));
  assert.notEqual(checksum(walk),checksum(attack),'ataque deve possuir outro atlas');
  for(let dir=0;dir<8;dir++){
   const poses=[];
   for(let frame=0;frame<4;frame++){
    const data=attack.getContext('2d').getImageData(frame*32,dir*48,32,48).data;
    poses.push(createHash('sha256').update(data).digest('hex'));
    let painted=0;for(let i=3;i<data.length;i+=4)if(data[i])painted++;
    assert.ok(painted>130,race+'/'+archetype+': pose deve estar desenhada');
   }
   assert.equal(new Set(poses).size,4,race+'/'+archetype+': quatro poses distintas');
  }
 }
 assert.equal(new Set(looks).size,5,race+': cinco figurinos distintos');
}
for(const archetype of archetypes){
 const impact=d.attackWeaponPose(archetype,'L',0).impact;
 const frames=[0,impact,impact+.15,1].map(t=>d.attackSpriteFrame(archetype,'L',t));
 assert.deepEqual(frames,[0,1,2,3],archetype+': preparação, impacto, continuação e recuperação');
 laboratory(archetype);game.render();d.action('H');tick(.15);game.render();
}

if(process.argv.includes('--render')){
 const output=resolve('screenshots');mkdirSync(output,{recursive:true});
 const sheet=createCanvas(1220,830),c=sheet.getContext('2d');
 c.imageSmoothingEnabled=false;c.fillStyle='#10202b';c.fillRect(0,0,sheet.width,sheet.height);
 c.font='bold 17px monospace';c.fillStyle='#ead6ae';
 c.fillText('VIDEOJOGO  /  FIGURINOS E POSES EM PIXEL ART',24,30);
 archetypes.forEach((name,i)=>c.fillText(name,180+i*204,59));
 races.forEach((race,row)=>{
  c.fillStyle='#a6bfb4';c.font='bold 14px monospace';c.fillText(race,20,115+row*145);
  archetypes.forEach((archetype,col)=>{
   const atlas=d.heroSpriteAtlas(race,archetype);
   const x=160+col*204,y=72+row*145;
   c.fillStyle='#172e36';c.fillRect(x,y,190,134);
   c.drawImage(atlas,0,48,32,48,x+8,y-1,96,144);
   c.drawImage(atlas,0,5*48,32,48,x+92,y-1,96,144);
  });
 });
 writeFileSync(resolve(output,'figurinos-polimento.png'),sheet.toBuffer('image/png'));
 laboratory('hunter');game.render();
 writeFileSync(resolve(output,'arena-polimento.png'),game.canvas.toBuffer('image/png'));
}
console.log('PASS: combos de 5 armas, fila preservada, recuperação, dano por distância, rajadas, mana e 800 poses de ataque.');
