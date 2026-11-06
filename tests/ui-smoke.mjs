import assert from 'node:assert/strict';
import {readFileSync, mkdirSync} from 'node:fs';
import http from 'node:http';
import {fileURLToPath} from 'node:url';
import {dirname, resolve} from 'node:path';
import {chromium} from 'playwright';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const html=readFileSync(resolve(root,'index.html'),'utf8');
const script=html.match(/<script>([\s\S]*?)<\/script>/i)?.[1];
assert.ok(script,'O script principal deve existir');
new Function(script); // A sintaxe completa do jogo precisa compilar.

const server=http.createServer((req,res)=>{
 res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});
 res.end(html);
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const url='http://127.0.0.1:'+server.address().port;
let browser;
const failures=[];
function overlap(a,b){
 return Math.min(a.x+a.width,b.x+b.width)>Math.max(a.x,b.x)+2
  &&Math.min(a.y+a.height,b.y+b.height)>Math.max(a.y,b.y)+2;
}
try{
 browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 mkdirSync(resolve(root,'screenshots'),{recursive:true});
 for(const [width,height] of [[568,320],[640,360],[740,360],[854,480],[915,412]]){
  const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1,isMobile:true,hasTouch:true});
  page.on('pageerror',error=>failures.push(width+'x'+height+': '+error.message));
  await page.goto(url);
  await page.waitForFunction(()=>Boolean(window.__rpgDebug));
  assert.equal(await page.evaluate(()=>window.__rpgDebug.snapshot().settings.leftHanded),false);
  await page.evaluate(()=>document.querySelector('#campaignOverlay').classList.remove('open'));
  // Os cinco personagens devem ter miniaturas pixel art únicas e desenhadas.
  await page.evaluate(()=>window.__rpgDebug.openCharacterCreator());
  const portraits=await page.locator('.racePortrait').evaluateAll(els=>els.map(el=>el.toDataURL()));
  assert.equal(portraits.length,5,'cinco retratos');
  assert.equal(new Set(portraits).size,5,'as raças precisam de silhuetas diferentes');
  const portraitsValid=await page.locator('.racePortrait').evaluateAll(els=>els.map(canvas=>{
   const style=getComputedStyle(canvas);
   const rect=canvas.getBoundingClientRect(),card=canvas.closest('.raceOption').getBoundingClientRect();
   const {width,height}=canvas,ctx=canvas.getContext('2d');
   const pixels=ctx.getImageData(0,0,width,height).data;
   let painted=0;for(let i=3;i<pixels.length;i+=4)if(pixels[i]>0)painted++;
   return{
    width,height,cssWidth:rect.width,cssHeight:rect.height,
    position:style.position,
    insideCard:rect.left>=card.left-2&&rect.top>=card.top-2&&
     rect.right<=card.right+2&&rect.bottom<=card.bottom+2,
    painted
   };
  }));
  for(const p of portraitsValid){
   assert.equal(p.width,48,'retrato interno: 48px');
   assert.equal(p.height,72,'retrato interno: 72px');
   assert.equal(p.position,'static','a imagem de raça não pode ser absoluta');
   assert.ok(p.insideCard,'retrato precisa ficar DENTRO da opção de raça');
   assert.ok(p.cssWidth>=35&&p.cssHeight>=53,'a miniatura precisa ser legível');
   assert.ok(Math.abs(p.cssWidth/p.cssHeight-2/3)<.018,'proporção correta');
   assert.ok(p.painted>150,'a imagem tem que conter pixels visíveis');
  }
  assert.equal(await page.locator('#scene').evaluate(el=>getComputedStyle(el).position),'absolute',
   'apenas a arena deve ocupar a tela');
  await page.screenshot({path:resolve(root,'screenshots','racas-'+width+'x'+height+'.png')});
  await page.evaluate(()=>document.querySelector('#creatorOverlay').classList.remove('open'));
  await page.evaluate(()=>window.__rpgDebug.openOptions());
  await page.evaluate(()=>{document.querySelector('#fpsToggle').click();document.querySelector('[data-pad-size="large"]').click();});
  assert.equal(await page.evaluate(()=>window.__rpgDebug.snapshot().settings.padSize),'large');
  for(const hand of ['normal','canhoto']){
   if(hand==='canhoto')await page.evaluate(()=>document.querySelector('#handedToggle').click());
   const snap=await page.evaluate(()=>window.__rpgDebug.snapshot());
   assert.equal(snap.settings.leftHanded,hand==='canhoto');
   const joy=await page.locator('#joystick').boundingBox();
   assert.ok(joy,'joystick visível');
   for(const id of ['light','heavy','parry','dodge']){
    const rect=await page.locator('#'+id).boundingBox();
    assert.ok(rect,id+' visível');
    assert.ok(!overlap(joy,rect),id+' não pode cobrir o joystick');
    assert.ok(rect.x>=-2&&rect.x+rect.width<=width+2,id+' deve caber na largura da tela');
    assert.ok(rect.y>=-2&&rect.y+rect.height<=height+2,id+' deve caber na altura');
   }
   const light=await page.locator('#light').boundingBox();
   assert.ok(hand==='canhoto'?joy.x>light.x:joy.x<light.x,'o lado selecionado deve funcionar');
   await page.screenshot({path:resolve(root,'screenshots',width+'x'+height+'-'+hand+'.png')});
  }
  // Com o joystick flutuante desligado, o toque na arena não pode movê-lo.
  await page.evaluate(()=>document.querySelector('#floatingToggle').click());
  assert.equal(await page.evaluate(()=>window.__rpgDebug.snapshot().settings.floatingJoystick),false);
  await page.evaluate(()=>{
   const c=document.querySelector('#scene');
   c.dispatchEvent(new PointerEvent('pointerdown',{pointerId:92,pointerType:'touch',clientX:innerWidth*.8,clientY:innerHeight*.7,bubbles:true,cancelable:true}));
  });
  assert.equal(await page.locator('#joystick').evaluate(el=>el.classList.contains('floating')),false);
  await page.evaluate(()=>window.__rpgDebug.closeOptions());
  await page.evaluate(()=>window.__rpgDebug.toggleElite());
  const aim=await page.locator('#aimToggle').boundingBox();
  const boss=await page.locator('#eliteHud').boundingBox();
  const fps=await page.locator('#fpsPanel').boundingBox();
  assert.ok(aim&&boss&&fps,'mira, chefe e FPS devem estar presentes');
  assert.ok(!overlap(aim,boss),'painel do chefe não pode ficar sob a mira');
  assert.ok(!overlap(aim,fps),'FPS não pode ficar sob a mira');
  assert.ok(!overlap(boss,fps),'FPS não pode ficar sob o chefe');
  await page.locator('#eliteHud summary').click();
  assert.equal(await page.locator('#eliteHud').evaluate(el=>el.open),true);
  // As oito direções têm perfis e silhuetas próprios; os olhos só existem
  // em vistas frontais e laterais, nunca nas três vistas traseiras.
  if(width===854&&height===480){
   const visual=await page.evaluate(()=>{
    const debug=window.__rpgDebug,races=['human','elf','orc','dwarf','halfling'];
    const expected=['frontQuarter','front','frontQuarter','profile',
     'backQuarter','back','backQuarter','profile'];
    const facings=debug.spriteFacings();
    const problems=[];let frames=0,eyes=0;
    if(facings.map(v=>v.kind).join('|')!==expected.join('|'))
     problems.push({reason:'mapeamento de 8 direções',facings});
    const checksum=pixels=>{
     let hash=2166136261;
     for(const value of pixels)hash=Math.imul(hash^value,16777619)>>>0;
     return hash;
    };
    for(const race of races){
     const atlas=debug.spriteAtlas(race),ctx=atlas.getContext('2d');
     if(atlas.width!==128||atlas.height!==384)
      problems.push({race,reason:'medidas do atlas',width:atlas.width,height:atlas.height});
     const ids=[],bottoms=[];
     let frontWidth=0,sideWidth=0;
     for(let dir=0;dir<8;dir++){
      const hashes=[];
      for(let frame=0;frame<4;frame++){
       frames++;
       const pixels=ctx.getImageData(frame*32,dir*48,32,48).data;
       hashes.push(checksum(pixels));
       let painted=0,minX=32,maxX=-1,maxY=-1;
       let eyePixels=0;
       for(let y=0;y<48;y++)for(let x=0;x<32;x++){
        const k=(y*32+x)*4;
        if(pixels[k+3]){
         painted++;minX=Math.min(x,minX);maxX=Math.max(x,maxX);maxY=Math.max(y,maxY);
        }
        if(pixels[k]===11&&pixels[k+1]===21&&pixels[k+2]===36&&pixels[k+3]===255)eyePixels++;
       }
       if(painted<130)problems.push({race,dir,frame,reason:'sprite incompleta',painted});
       const positions=debug.spriteFaceEyes(race,dir,frame);
       if(positions.length!==[1,2,1,1,0,0,0,1][dir])
        problems.push({race,dir,frame,reason:'quantidade de olhos',positions});
       eyes+=positions.length;
       for(const e of positions){
        for(let yy=e.y;yy<e.y+2;yy++)for(let xx=e.x;xx<e.x+2;xx++){
         const k=(yy*32+xx)*4;
         if(pixels[k]!==11||pixels[k+1]!==21||pixels[k+2]!==36||pixels[k+3]!==255)
          problems.push({race,dir,frame,reason:'pixel de olho ausente',xx,yy});
        }
       }
       if(eyePixels!==positions.length*4)
        problems.push({race,dir,frame,reason:'olhos a mais ou a menos',eyePixels});
       if(frame===0){
        ids.push(hashes[0]);bottoms.push(maxY);
        if(dir===1)frontWidth=maxX-minX+1;
        if(dir===3)sideWidth=maxX-minX+1;
       }
      }
      if(new Set(hashes).size!==4)
       problems.push({race,dir,reason:'ciclo de caminhada duplicado',hashes});
     }
     if(new Set(ids).size!==8)
      problems.push({race,reason:'direções visualmente idênticas',unique:new Set(ids).size});
     if(frontWidth<=sideWidth)
      problems.push({race,reason:'perfil não afina a silhueta',frontWidth,sideWidth});
     if(Math.max(...bottoms)-Math.min(...bottoms)>3)
      problems.push({race,reason:'ponto do chão inconsistente',bottoms});
    }
    return{frames,eyes,problems};
   });
   assert.equal(visual.frames,160,'5 raças × 8 ângulos × 4 quadros');
   assert.equal(visual.eyes,120,'olhos só nas vistas frontais e perfis');
   assert.deepEqual(visual.problems,[],'todos os quadros direcionais devem ser distintos e corretos');

   // Montagem visual em grade 5×8 (apenas capturas, não altera o jogo).
   await page.evaluate(()=>{
    const overlay=document.createElement('div');
    overlay.id='spriteAtlasReview';
    Object.assign(overlay.style,{position:'fixed',inset:'0',zIndex:'999999',
     background:'#08131d',display:'grid',placeItems:'center'});
    const canvas=document.createElement('canvas');
    canvas.width=824;canvas.height=470;
    canvas.style.cssText='width:100%;height:100%;object-fit:contain;image-rendering:pixelated;position:static';
    const c=canvas.getContext('2d');c.imageSmoothingEnabled=false;
    c.fillStyle='#08131d';c.fillRect(0,0,824,470);
    const races=['human','elf','orc','dwarf','halfling'];
    const names=['3/4 frente →','frente','3/4 frente ←','perfil ←',
     '3/4 costas ←','costas','3/4 costas →','perfil →'];
    c.textAlign='center';c.font='bold 12px monospace';c.fillStyle='#dbecff';
    for(let dir=0;dir<8;dir++)c.fillText(names[dir],88+dir*94,23);
    for(let ri=0;ri<5;ri++){
     c.textAlign='left';c.font='bold 13px monospace';
     c.fillStyle='#a5ffde';c.fillText(races[ri],4,72+ri*86);
     const atlas=window.__rpgDebug.spriteAtlas(races[ri]);
     for(let dir=0;dir<8;dir++){
      const x=88+dir*94-24,y=30+ri*86;
      c.fillStyle='#142736';c.fillRect(x-3,y-2,55,75);
      c.drawImage(atlas,0,dir*48,32,48,x,y,48,72);
     }
    }
    overlay.append(canvas);document.body.append(overlay);
   });
   await page.screenshot({path:resolve(root,'screenshots','atlas-5-racas-8-direcoes.png')});
   await page.locator('#spriteAtlasReview').evaluate(el=>el.remove());
  }
  // A ponta acompanha o vetor do joystick em todos os oito octantes,
  // inclusive esquerda e costas: a verificação anterior proibia o lado esquerdo.
  if(width===854&&height===480){
   const poseCheck=await page.evaluate(()=>{
    const directions=[];
    for(let k=0;k<8;k++)directions.push({x:Math.cos(k*Math.PI/4),z:Math.sin(k*Math.PI/4)});
    let count=0;const failures=[];
    for(const archetype of ['warrior','arcanist','guardian','rebel','hunter']){
     for(const face of directions){
      for(let i=-12;i<=12;i++){
       const progress=(i+12)/24;
       const pose=window.__rpgDebug.weaponVisualPose(face,archetype,i/10,progress,{impact:.48});
       count++;
       const ux=face.x-face.z,uy=(face.x+face.z)*.52;
       const vx=pose.x2-pose.x1,vy=pose.y2-pose.y1;
       const dot=(ux*vx+uy*vy)/(Math.hypot(ux,uy)*Math.hypot(vx,vy)||1);
       if(!Number.isFinite(pose.x2)||!Number.isFinite(pose.y2)||
        Math.hypot(vx,vy)<8||dot<.36)
        failures.push({archetype,face,angle:i/10,dot,pose});
      }
     }
    }
    return{count,failures};
   });
   assert.equal(poseCheck.count,1000);
   assert.deepEqual(poseCheck.failures,[],'a ponta segue o joystick nos oito octantes');
  }
  // Checa movimento real de cajado, arco, espada, escudo e adaga.
  if(width===854&&height===480){
   const checks=await page.evaluate(()=>{
    const d=window.__rpgDebug,face={x:Math.SQRT1_2,z:Math.SQRT1_2};
    const make=(arch,t)=>d.weaponVisualPose(face,arch,(t-.5)*2,t,{impact:.48,heavyShot:t>.5});
    const distance=(p,q)=>Math.hypot(p.x2-q.x2,p.y2-q.y2);
    return{
     staff:distance(make('arcanist',.2),make('arcanist',.58)),
     bow:[make('hunter',0).pull,make('hunter',.40).pull,make('hunter',.75).pull],
     melee:['warrior','guardian','rebel'].map(arch=>({arch,delta:distance(make(arch,.05),make(arch,.85))}))
    };
   });
   assert.ok(checks.staff>12,'cajado deve se mover durante conjuração e disparo');
   assert.ok(checks.bow[0]<.01&&checks.bow[1]>.9&&checks.bow[2]<.1,
    'arco deve tensionar, soltar e recuperar a corda');
   for(const m of checks.melee)assert.ok(m.delta>8,m.arch+' deve ter golpe visível');
  }
  // Regressão: TODAS as cinco armas seguem 72 direções contínuas do
  // joystick (espadas, adaga, cajado e arco).
  if(width===854&&height===480){
   const following=await page.evaluate(()=>{
    const d=window.__rpgDebug,archetypes=['warrior','guardian','rebel','arcanist','hunter'];
    const output=[];
    for(const archetype of archetypes){
     const poses=[];
     for(let i=0;i<72;i++){
      const theta=i*Math.PI*2/72;
      const face={x:Math.cos(theta),z:Math.sin(theta)};
      poses.push(d.weaponVisualPose(face,archetype,0,0,{impact:.48}));
     }
     let maxJump=0;
     for(let i=0;i<poses.length;i++){
      const prev=poses[i],next=poses[(i+1)%poses.length];
      maxJump=Math.max(maxJump,Math.abs(Math.atan2(Math.sin(next.a-prev.a),Math.cos(next.a-prev.a))));
     }
     output.push({
      archetype,
      angleRange:Math.max(...poses.map(p=>p.a))-Math.min(...poses.map(p=>p.a)),
      gripRange:Math.max(...poses.map(p=>p.y1))-Math.min(...poses.map(p=>p.y1)),
      sectors:poses.reduce((acc,p)=>{
       const angle=Math.atan2(p.y2-p.y1,p.x2-p.x1);
       const sector=(Math.round((angle+Math.PI)*4/Math.PI)+8)%8;
       acc[sector]=true;return acc;
      },{}),
      xRange:[Math.min(...poses.map(p=>p.x2-p.x1)),Math.max(...poses.map(p=>p.x2-p.x1))],
      yRange:[Math.min(...poses.map(p=>p.y2-p.y1)),Math.max(...poses.map(p=>p.y2-p.y1))],
      maxJump
     });
    }
    return output;
   });
   for(const weapon of following){
    assert.ok(weapon.angleRange>6,weapon.archetype+' deve completar 360 graus');
    assert.ok(weapon.gripRange>10,weapon.archetype+' deve deslocar a mão de modo perceptível');
    assert.equal(Object.keys(weapon.sectors).length,8,weapon.archetype+' deve apontar para oito setores');
    assert.ok(weapon.xRange[0]<-15&&weapon.xRange[1]>15,
     weapon.archetype+' deve apontar para esquerda E direita');
    assert.ok(weapon.yRange[0]<-15&&weapon.yRange[1]>15,
     weapon.archetype+' deve apontar para cima E baixo');
    assert.ok(weapon.maxJump<.23,weapon.archetype+' não pode saltar de direção');
   }
   // Integração: input real de movimento alimenta a direção visual partilhada
   // pelas cinco armas (mesmo com dano, projéteis e combos separados).
   const keyboardAim=await page.evaluate(()=>{
    const debug=window.__rpgDebug;
    const initial=debug.weaponJoystickFacing();
    return{initial};
   });
   await page.keyboard.down('ArrowLeft');
   await page.evaluate(()=>{for(let n=0;n<9;n++)window.__rpgDebug.testTick(.016);});
   await page.keyboard.up('ArrowLeft');
   const leftAim=await page.evaluate(()=>window.__rpgDebug.weaponJoystickFacing());
   await page.keyboard.down('ArrowRight');
   await page.evaluate(()=>{for(let n=0;n<14;n++)window.__rpgDebug.testTick(.016);});
   await page.keyboard.up('ArrowRight');
   const rightAim=await page.evaluate(()=>window.__rpgDebug.weaponJoystickFacing());
   assert.ok(Math.hypot(leftAim.x-rightAim.x,leftAim.z-rightAim.z)>.6,
    'a orientação visual deve responder às direções opostas do joystick');
  }
  // Teste integrado do joystick DE TOQUE: oito direções reais.
  // Não basta variar internamente um ângulo de arma.
  if(width===854&&height===480){
   const touch=await page.evaluate(()=>{
    const joy=document.querySelector('#joystick'),d=window.__rpgDebug;
    const rect=joy.getBoundingClientRect();
    const cx=rect.left+rect.width/2,cy=rect.top+rect.height/2;
    const points=[],pointerId=830;
    const event=(type,dx,dy)=>joy.dispatchEvent(new PointerEvent(type,{
     pointerId,pointerType:'touch',bubbles:true,cancelable:true,
     clientX:cx+dx*rect.width*.36,clientY:cy+dy*rect.width*.36
    }));
    for(let i=0;i<8;i++){
     const theta=i*Math.PI/4,dx=Math.cos(theta),dy=Math.sin(theta);
     event(i===0?'pointerdown':'pointermove',dx,dy);
     for(let tick=0;tick<10;tick++)d.testTick(.016);
     const vector=d.weaponJoystickFacing(),pose=d.weaponIdlePose(vector,'warrior');
     const sx=vector.x-vector.z,sy=(vector.x+vector.z)*.52;
     const vx=pose.x2-pose.x1,vy=pose.y2-pose.y1;
     const dot=(sx*vx+sy*vy)/(Math.hypot(sx,sy)*Math.hypot(vx,vy)||1);
     points.push({i,vector,tip:{x:vx,y:vy},dot});
    }
    event('pointerup',0,0);
    return points;
   });
   assert.equal(touch.length,8,'o joystick deve gerar oito direções');
   for(const p of touch)assert.ok(p.dot>.98,'a espada deve obedecer toque '+p.i);
   const quadrants=new Set(touch.map(p=>
    (p.tip.x>0?'D':'E')+(p.tip.y>0?'B':'C')));
   assert.equal(quadrants.size,4,'o joystick deve apontar para quatro quadrantes');
  }
  // Problema relatado: a arma ficava rígida durante o ataque e ignorava
  // mudanças do joystick. Verifica 5 armas, 3 fases de ataque e 2 direções.
  if(width===854&&height===480){
   const motion=await page.evaluate(()=>{
    const d=window.__rpgDebug,face={x:1,z:0};
    const up={x:-Math.SQRT1_2,z:-Math.SQRT1_2};
    const down={x:Math.SQRT1_2,z:Math.SQRT1_2};
    const report=[];
    for(const archetype of ['warrior','guardian','rebel','arcanist','hunter']){
     for(const progress of [.12,.48,.83]){
      const u=d.weaponDisplayFacing(face,up,archetype,progress,true);
      const v=d.weaponDisplayFacing(face,down,archetype,progress,true);
      const p=d.weaponVisualPose(u,archetype,0,progress,{impact:.48});
      const q=d.weaponVisualPose(v,archetype,0,progress,{impact:.48});
      report.push({archetype,progress,angle:Math.abs(p.a-q.a),
       tip:Math.hypot(p.x2-q.x2,p.y2-q.y2)});
     }
    }
    return report;
   });
   assert.equal(motion.length,15,'cinco armas × três fases da animação');
   for(const m of motion){
    assert.ok(m.tip>14,
     m.archetype+' precisa seguir o joystick mesmo durante o ataque '+m.progress);
    assert.ok(m.angle>.25,
     m.archetype+' nao pode travar no angulo de ataque '+m.progress);
   }
  }
  // Testa a renderização das cinco raças usando as cinco armas.
  if(width===854&&height===480){
   for(const [race,archetype] of [
    ['human','warrior'],['elf','arcanist'],['orc','guardian'],
    ['dwarf','rebel'],['halfling','hunter']
   ]){
    await page.evaluate(({race,archetype})=>{
     const debug=window.__rpgDebug;
     document.querySelector('#drillRace').value=race;
     document.querySelector('#drillArchetype').value=archetype;
     debug.chooseDrill('sandbox','dummy',0);
     debug.debugSet({player:{face:{x:0,z:1}}});
     debug.action('L');
     debug.testTick(.12);
    },{race,archetype});
    await page.screenshot({path:resolve(root,'screenshots','golpe-'+race+'-'+archetype+'.png')});
   }
  }
  // ETAPA 27A: geração, conectividade, geometria, retorno e persistência.
  if(width===854&&height===480){
   const generated=await page.evaluate(()=>{
    const d=window.__rpgDebug,errors=[],worlds=new Set(),shapes=new Set();
    let singles=0,bigs=0;
    for(let seed=1;seed<=100;seed++){
     let world;
     try{world=d.worldForSeed(seed);}catch(err){errors.push({seed,message:err.message});continue;}
     if(JSON.stringify(world)!==JSON.stringify(d.worldForSeed(seed)))errors.push({seed,reason:'não determinístico'});
     worlds.add(JSON.stringify(world.areas.map(a=>[a.biome,a.rooms.length])));
     const rooms=world.rooms,ids=Object.keys(rooms).map(Number),seen=new Set([1]),queue=[1];
     while(queue.length)for(const e of rooms[queue.shift()].exits)if(!seen.has(e.to)){seen.add(e.to);queue.push(e.to);}
     if(seen.size!==ids.length)errors.push({seed,reason:'desconectado'});
     for(const area of world.areas){if(area.rooms.length===1)singles++;}
     for(const id of ids){
      const r=rooms[id],g=d.worldRoomShape(r);shapes.add(r.shape);
      if(r.width>=22||r.height>=22)bigs++;
      if(new Set(r.exits.map(x=>x.dir)).size!==r.exits.length)errors.push({seed,id,reason:'saídas duplicadas'});
      if(!g.floor.includes('0,0'))errors.push({seed,id,reason:'origem bloqueada'});
      for(const exit of r.exits){
       if(!rooms[exit.to]?.exits.some(x=>x.to===id&&x.dir===(exit.dir+2)%4))
        errors.push({seed,id,reason:'sem volta'});
      }
      for(const exit of g.exits){
       const key=Math.floor(exit.x)+','+Math.floor(exit.z);
       if(!g.floor.includes(key)||g.solids.includes(key))errors.push({seed,id,reason:'portal bloqueado',key});
      }
     }
    }
    return{errors:errors.slice(0,12),worlds:worlds.size,shapes:[...shapes],
     singles,bigs};
   });
   assert.deepEqual(generated.errors,[],'todas as áreas e passagens devem ser acessíveis');
   assert.ok(generated.worlds>=70,'cada run deve variar bastante');
   assert.ok(generated.shapes.includes('spawn'),'salas autorais aparecem entre os formatos');
    assert.equal(generated.shapes.length,6,'cinco formatos genéricos mais o formato autoral');
   assert.ok(generated.singles>=100,'cada mundo terá áreas de sala única');
   assert.ok(generated.bigs>=100,'salas de tamanho grande');
   await page.evaluate(()=>window.__rpgDebug.newCampaign());
   const initial=await page.evaluate(()=>window.__rpgDebug.snapshot());
   assert.ok(initial.run.world&&initial.run.world.areas.length>=5);
   assert.equal(initial.run.world.current,1);
   await page.screenshot({path:resolve(root,'screenshots','etapa27-mundo-procedural.png')});
   const travel=await page.evaluate(()=>{
    const d=window.__rpgDebug;
    d.debugClearRoom();
    const start=d.worldRoomInfo(),e=start.exits[0];
    const v=[{dx:1,dz:0},{dx:0,dz:1},{dx:-1,dz:0},{dx:0,dz:-1}][e.dir];
    d.debugSet({player:{x:e.at.x-v.dx*.4,z:e.at.z-v.dz*.4,invuln:90,hp:1000}});
    const joy=document.querySelector('#joystick'),r=joy.getBoundingClientRect();
    const ix=(v.dx-v.dz)/1.28,iy=(v.dx+v.dz)/2.08;
    joy.dispatchEvent(new PointerEvent('pointerdown',{pointerId:701,pointerType:'touch',
     clientX:r.left+r.width/2+ix*r.width*.36,
     clientY:r.top+r.height/2+iy*r.width*.36,bubbles:true,cancelable:true}));
    for(let i=0;i<64;i++)d.testTick(.016);
    joy.dispatchEvent(new PointerEvent('pointerup',{pointerId:701,pointerType:'touch',bubbles:true,cancelable:true}));
    return{target:e.to,current:d.snapshot().run.world.current,firstMemory:d.snapshot().run.world.memories[1]};
   });
   assert.equal(travel.current,travel.target,'joystick deve atravessar uma passagem');
   assert.equal(travel.firstMemory.cleared,true,'sala limpa deve manter estado');
   const back=await page.evaluate(()=>{
    const d=window.__rpgDebug,edge=d.worldRoomInfo().exits.find(e=>e.to===1);
    d.worldTravelNeighbor(edge.dir);d.worldSave();
    return{snap:d.snapshot(),room:d.worldRoomInfo(),saved:!!localStorage.getItem('rpg_pixelart_active_run_v21')};
   });
   assert.equal(back.snap.run.world.current,1,'volta à mesma sala');
   assert.ok(back.room.walkable,'chegada em piso transitável');
   assert.ok(back.snap.foes.every(f=>f.hp<=0),'sem reaparecimento imediato');
   assert.ok(back.saved,'salva estado do mundo');
   await page.reload();await page.waitForFunction(()=>Boolean(window.__rpgDebug));
   await page.evaluate(()=>window.__rpgDebug.resumeCampaign(
    JSON.parse(localStorage.getItem('rpg_pixelart_active_run_v21'))));
   const loaded=await page.evaluate(()=>({state:window.__rpgDebug.snapshot(),room:window.__rpgDebug.worldRoomInfo()}));
   assert.equal(loaded.state.run.world.current,1,'retorno após recarregar página');
   assert.ok(loaded.room.walkable,'colisões persistem após reload');
   assert.ok(loaded.state.run.world.memories[1].cleared,'salvou a vitória');
  }

  // ETAPA 27B: os dois mapas usam apenas informações descobertas e
  // não permitem viagem rápida fora de pontos específicos.
  if(width===854&&height===480){
   const d=await page.evaluate(()=>{
    const dbg=window.__rpgDebug;
    const area=dbg.mapData('area'),world=dbg.mapData('world');
    return{area,world,run:dbg.snapshot().run};
   });
   assert.equal(d.area.tab,'area');
   assert.equal(d.world.tab,'world');
   assert.equal(d.area.current,1);
   assert.equal(d.area.states[1],2,'sala atual visitada');
   const visitedInArea=d.area.nodes.filter(id=>d.run.world.discovered.includes(id)).length;
   assert.equal(d.area.seen,visitedInArea,'salas descobertas correspondem ao save');
   for(const id of d.area.nodes){
    assert.equal(d.area.states[id]===2,d.run.world.discovered.includes(id),
     'não revelar sala '+id+' como visitada prematuramente');
   }
   assert.equal(d.world.seen,1,'não revelar áreas ainda não visitadas');
   assert.ok(Object.values(d.world.states).some(x=>x===0),'mundo deve manter regiões ocultas');
   assert.ok(Object.values(d.world.states).some(x=>x===1),'regiões vizinhas só aparecem como desconhecidas');
   assert.ok(d.area.nodes.every(id=>d.area.coords[id]),'cada sala deve ter posição no desenho');
   assert.ok(d.world.nodes.every(id=>d.world.coords[id]),'cada área deve ter posição no desenho');
   assert.equal(await page.locator('#worldMapBtn').isVisible(),true,'botão de mapa visível na campanha');
   await page.locator('#worldMapBtn').click();
   assert.equal(await page.locator('#worldMapOverlay').isVisible(),true,'mapa abre por toque');
   assert.equal(await page.locator('#mapGraph [data-map-node][data-current="true"]').count(),1,'posição destacada');
   assert.equal(await page.locator('#mapGraph [data-discovery="2"]').count(),visitedInArea,'não revela salas não visitadas');
   await page.screenshot({path:resolve(root,'screenshots','etapa27b-mapa-area.png')});
   await page.locator('#worldMapTab').click();
   assert.equal(await page.locator('#worldMapTab').getAttribute('aria-pressed'),'true');
   assert.equal(await page.locator('#mapGraph [data-discovery="2"]').count(),1,'mapa-múndi com apenas uma área descoberta');
   assert.equal(await page.locator('#mapGraph [data-current="true"]').count(),1);
   await page.screenshot({path:resolve(root,'screenshots','etapa27b-mapa-mundi.png')});
   const prior=await page.evaluate(()=>window.__rpgDebug.snapshot().run.world.current);
   await page.locator('#mapGraph [data-discovery="1"]').first().click();
   const after=await page.evaluate(()=>window.__rpgDebug.snapshot().run.world.current);
   assert.equal(after,prior,'tocar em mapa não teletransporta jogador');
   await page.locator('#closeWorldMap').click();
   assert.equal(await page.locator('#worldMapOverlay').isVisible(),false);
   await page.keyboard.press('Tab');
   assert.equal(await page.locator('#worldMapOverlay').isVisible(),true,'TAB abre mapa');
   await page.keyboard.press('Escape');
   assert.equal(await page.locator('#worldMapOverlay').isVisible(),false,'Escape fecha mapa');
   // A exploração atualiza o mapa-múndi sem perder os pontos já descobertos.
   const discovery=await page.evaluate(()=>{
    const dbg=window.__rpgDebug;let steps=0;
    const startArea=dbg.snapshot().run.world.rooms[dbg.snapshot().run.world.current].area;
    while(steps<30){
     const run=dbg.snapshot().run,room=run.world.rooms[run.world.current];
     if(room.area!==startArea)break;
     const next=room.exits.find(e=>run.world.rooms[e.to].area!==startArea)
      ||room.exits.find(e=>!run.world.discovered.includes(e.to))
      ||room.exits[0];
     if(!next||!dbg.worldTravelNeighbor(next.dir))break;
     steps++;
    }
    dbg.worldSave();
    const area=dbg.mapData('area'),world=dbg.mapData('world');
    return{steps,area,world,run:dbg.snapshot().run};
   });
   assert.ok(discovery.steps>0,'mapa registra novas salas');
   assert.ok(discovery.run.world.discovered.length>1,'salas visitadas permanecem descobertas');
   assert.ok(discovery.world.seen>=1,'mapa-múndi acompanha descoberta');
  }
  // Equilíbrio: o risco de combate próximo deve render mobilidade real e um
  // aparo limitado, sem reduzir danos globalmente ou criar invulnerabilidade.
  if(width===854&&height===480){
   const balance=await page.evaluate(()=>{
    const d=window.__rpgDebug,arch=['warrior','guardian','rebel','arcanist','hunter'];
    const factors=Object.fromEntries(arch.map(a=>[a,{
     light:d.combatMoveFactor(a,{key:'L'}),heavy:d.combatMoveFactor(a,{key:'H'}),
     free:d.combatMoveFactor(a,null)
    }]));
    d.debugKill();
    d.chooseDrill('sandbox','dummy',0);
    d.debugSet({player:{x:0,z:0,face:{x:1,z:0},meleeGuard:0,invuln:0}});
    d.debugSetFoes([{x:1.38,z:0,phase:'chase',cooldown:5,stun:0,iframe:0}]);
    d.action('L');for(let n=0;n<15;n++)d.testTick(1/60);
    return{factors,contact:d.combatProfile(),snap:d.snapshot()};
   });
   for(const [name,p] of Object.entries(balance.factors)){
    assert.equal(p.free,1,name+' não deve perder velocidade fora do ataque');
    assert.ok(p.heavy>0&&p.light>p.heavy,name+' pesado exige mais compromisso');
   }
   assert.ok(balance.factors.warrior.heavy>balance.factors.hunter.heavy);
   assert.ok(balance.factors.guardian.light>balance.factors.arcanist.light);
   assert.ok(balance.factors.rebel.light>balance.factors.hunter.light);
   assert.equal(balance.contact.archetype,'warrior','teste com espada');
   assert.ok(balance.contact.meleeGuard>0,'acerto em combate próximo gera aparo temporário');
   assert.ok(balance.contact.meleeGuard<=.46,'não deve gerar defesa permanente');
   assert.ok(balance.snap.hits>0,'benefício apenas após impacto conectado');
  }

  // ETAPA 27C: os três spawns são templates físicos, não apenas imagens.
  if(width===854&&height===480){
   const analysis=await page.evaluate(()=>{
    const debug=window.__rpgDebug,seen=new Set(),seeds={},errors=[],count={};
    const expected={
     flower_clearing:[1],
     ruined_gate:[3],
     colossal_tree:[0,1]
    };
    for(let seed=1;seed<=300;seed++){
     const data=debug.spawnGeometry(seed),world=debug.worldForSeed(seed);
     const type=data.template,room=data.room,spawn=data.spawn;
     if(world.areas[0].biome!=='forest')
      errors.push({seed,type,reason:'spawn fora da floresta',biome:world.areas[0].biome});
     seen.add(type);count[type]=(count[type]||0)+1;
     if(seeds[type]===undefined)seeds[type]=seed;
     if(room.id!==1||room.kind!=='empty'||world.rooms[1].spawnTemplate!==type)
      errors.push({seed,type,reason:'primeira sala não está segura'});
     if(JSON.stringify(world)!==JSON.stringify(debug.worldForSeed(seed)))
      errors.push({seed,type,reason:'seed instável'});
     const connected=room.exits.map(e=>e.dir);
     for(const dir of expected[type]||[])if(!connected.includes(dir))
      errors.push({seed,type,reason:'saída da referência desapareceu',dir});
     const floor=new Set(data.walkable),solid=new Set(data.solid);
     const start=Math.floor(spawn.x)+','+Math.floor(spawn.z);
     if(!floor.has(start)||solid.has(start))
      errors.push({seed,type,reason:'nascimento sem chão livre',start});
     const visited=new Set([start]),queue=[start],neighbors=[[1,0],[-1,0],[0,1],[0,-1]];
     while(queue.length){
      const [x,z]=queue.shift().split(',').map(Number);
      for(const [dx,dz] of neighbors){
       const key=(x+dx)+','+(z+dz);
       if(visited.has(key)||!floor.has(key)||solid.has(key))continue;
       visited.add(key);queue.push(key);
      }
     }
     for(const e of room.exits){
      const k=(e.dir===0?Math.floor(room.width/2-.72):e.dir===2?Math.floor(-room.width/2+.72):0)+','+
        (e.dir===1?Math.floor(room.height/2-.72):e.dir===3?Math.floor(-room.height/2+.72):0);
      if(!visited.has(k))errors.push({seed,type,reason:'saída sem caminho',k});
      if(!world.rooms[e.to]?.exits.some(x=>x.to===1&&x.dir===(e.dir+2)%4))
       errors.push({seed,type,reason:'passagem sem retorno'});
     }
     if(data.props.some(o=>o.type==='bush'))
      errors.push({seed,type,reason:'vegetação aleatória em spawn autoral'});
     if(type==='flower_clearing'){
      const flowers=data.decor.filter(x=>x.type==='flower');
      const trees=data.props.filter(x=>x.type==='tree');
      if(flowers.length<40||trees.length<8)errors.push({seed,type,reason:'flores ou árvores ausentes',flowers:flowers.length,trees:trees.length});
      for(const flo of flowers)if(Math.abs(flo.x)<2.1&&flo.z>=-1||Math.hypot(flo.x,flo.z)<1.9)
       errors.push({seed,type,reason:'canteiro invade o caminho/spawn'});
     }
     if(type==='ruined_gate'){
      if(data.props.filter(x=>x.type==='tree').length<8)
       errors.push({seed,type,reason:'portão não está cercado pela floresta'});
      if(data.props.filter(x=>x.type==='archPillar').length<10)
       errors.push({seed,type,reason:'pilares do arco ausentes'});
      if(solid.has('0,-4')||solid.has('0,-3'))
       errors.push({seed,type,reason:'vão central do arco bloqueado'});
     }
     if(type==='colossal_tree'){
      if(data.props.filter(x=>x.type==='trunk').length<12)
       errors.push({seed,type,reason:'árvore monumental sem tronco'});
      if(data.paths.filter(x=>x[1]==='water').length<15)errors.push({seed,type,reason:'falta água abaixo das raízes'});
      if(data.paths.filter(x=>x[1]==='rootFloor').length<40)
       errors.push({seed,type,reason:'raízes não são o chão de ponte'});
     }
    }
    return{count,seen:[...seen],seeds,errors:errors.slice(0,15)};
   });
   assert.deepEqual(analysis.errors,[],'todos os pontos de nascimento devem ser transitáveis');
   assert.deepEqual(new Set(analysis.seen),new Set(['flower_clearing','ruined_gate','colossal_tree']));
   for(const [name,n] of Object.entries(analysis.count))
    assert.ok(n>=60&&n<=145,'frequência do spawn '+name+' deve ser razoável: '+n);
   for(const [kind,seed] of Object.entries(analysis.seeds)){
    await page.evaluate(seed=>window.__rpgDebug.debugStartSeed(seed),seed);
    // Aguarda o aviso de entrada desaparecer para inspecionar a arte real.
    await page.evaluate(()=>{for(let t=0;t<250;t++)window.__rpgDebug.testTick(1/60);});
    const started=await page.evaluate(()=>({
     snapshot:window.__rpgDebug.snapshot(),
     info:window.__rpgDebug.worldRoomInfo()
    }));
    assert.equal(started.snapshot.run.world.rooms[1].spawnTemplate,kind,'o cenário deve aparecer na campanha real');
    assert.equal(started.snapshot.run.world.areas[0].biome,'forest','todos os spawns pertencem à floresta');
    assert.equal(started.snapshot.run.region,'forest','HUD deve indicar floresta');
    assert.equal(started.snapshot.foes.length,0,'jogador não começa no meio de combate');
    assert.equal(started.snapshot.run.cleared,true,'spawn é área segura');
    assert.ok(started.info.walkable,'personagem está no solo e não preso');
    assert.equal(started.snapshot.run.world.memories[1].cleared,true,'spawn fica persistido');
    await page.screenshot({path:resolve(root,'screenshots','spawn-'+kind+'.png')});
    const back=await page.evaluate(()=>{
     const d=window.__rpgDebug,from=d.snapshot().run.world.rooms[1].exits[0];
     const next=d.worldTravelNeighbor(from.dir);
     if(!next)return{ok:false};
     const edge=d.snapshot().run.world.rooms[d.snapshot().run.world.current].exits.find(e=>e.to===1);
     const home=d.worldTravelNeighbor(edge.dir);
     d.worldSave();
     return{ok:home,kind:d.snapshot().run.world.rooms[1].spawnTemplate,cleared:d.snapshot().run.world.memories[1].cleared};
    });
    assert.ok(back.ok,'o spawn deve permitir ida e volta');
    assert.equal(back.kind,kind,'modelo não se perde ao retornar');
    assert.ok(back.cleared,'sem resetar spawn ao voltar');
   }
   const last=await page.evaluate(()=>window.__rpgDebug.snapshot().run.world.rooms[1].spawnTemplate);
   await page.reload();
   await page.waitForFunction(()=>Boolean(window.__rpgDebug));
   await page.evaluate(()=>{
    const raw=JSON.parse(localStorage.getItem('rpg_pixelart_active_run_v21'));
    window.__rpgDebug.resumeCampaign(raw);
   });
   const restored=await page.evaluate(()=>({
    kind:window.__rpgDebug.snapshot().run.world.rooms[1].spawnTemplate,
    passable:window.__rpgDebug.worldRoomInfo().walkable
   }));
   assert.equal(restored.kind,last,'retomar campanha conserva mapa inicial sorteado');
   assert.ok(restored.passable,'colisões restauradas corretamente');
   // Migra um save da antiga classificação indevida do portão.
   await page.evaluate(seed=>window.__rpgDebug.debugStartSeed(seed),analysis.seeds.ruined_gate);
   await page.evaluate(()=>{
    const key='rpg_pixelart_active_run_v21',saved=JSON.parse(localStorage.getItem(key));
    saved.run.world.areas[0].biome='ruins';
    saved.run.region='ruins';
    saved.run.startRegion='ruins';
    localStorage.setItem(key,JSON.stringify(saved));
   });
   await page.reload();await page.waitForFunction(()=>Boolean(window.__rpgDebug));
   await page.evaluate(()=>window.__rpgDebug.resumeCampaign(
    JSON.parse(localStorage.getItem('rpg_pixelart_active_run_v21'))));
   const migrated=await page.evaluate(()=>{
    const d=window.__rpgDebug,state=d.snapshot().run;
    return{biome:state.world.areas[0].biome,region:state.region,
     startRegion:state.startRegion,spawn:state.world.rooms[1].spawnTemplate,
     room:d.worldRoomInfo()};
   });
   assert.equal(migrated.spawn,'ruined_gate','save mantém o portal arruinado');
   assert.equal(migrated.biome,'forest','saves antigos migram para floresta');
   assert.equal(migrated.region,'forest','bioma atual migrado sem apagar progresso');
   assert.equal(migrated.startRegion,'forest');
   assert.ok(migrated.room.walkable,'personagem continua livre depois da migração');
  }

  // REGRESSÃO DE COMBOS: cada arma deve encadear três ataques mesmo
  // quando não há inimigos no alcance (sala de nascimento segura).
  // O golpe seguinte respeita debounce e a janela de um único buffer.
  if(width===854&&height===480){
   // A fila de um único comando tolera toques duplicados no navegador real.
   const bufferedInput=await page.evaluate(()=>{
    const d=window.__rpgDebug,out=[];
    for(const archetype of ['warrior','guardian','rebel','arcanist','hunter']){
     d.newCampaign({name:'Fila',race:'human',archetype},47);
     d.action('L');d.testTick(.13);d.action('L');
     for(let i=0;i<8;i++)d.action(i%2?'L':'H');
     const buffer=d.snapshot().buffer;
     let steps=0;
     while(d.snapshot().seq==='L'&&steps++<90)d.testTick(1/60);
     out.push({archetype,buffer,seq:d.snapshot().seq,accepted:d.snapshot().acceptedInputs});
    }
    return out;
   });
   for(const row of bufferedInput){
    assert.equal(row.buffer,'L',row.archetype+': toques extras preservam o comando');
    assert.equal(row.seq,'LL',row.archetype+': comando preservado deve executar');
    assert.equal(row.accepted,2,row.archetype+': nenhuma ação adicional pode escapar');
   }
   // Figurinos e poses são sprites rasterizados e distintos, para as 25 combinações.
   const art=await page.evaluate(()=>{
    const d=window.__rpgDebug,issues=[];let frames=0;
    const hash=pixels=>{let h=2166136261;for(const v of pixels)h=Math.imul(h^v,16777619)>>>0;return h;};
    for(const race of ['human','elf','orc','dwarf','halfling']){
     const looks=[];
     for(const archetype of ['warrior','guardian','rebel','arcanist','hunter']){
      const walk=d.heroSpriteAtlas(race,archetype),attack=d.heroSpriteAtlas(race,archetype,true);
      looks.push(hash(walk.getContext('2d').getImageData(0,0,128,384).data));
      for(let dir=0;dir<8;dir++){
       const poses=[];
       for(let frame=0;frame<4;frame++){
        poses.push(hash(attack.getContext('2d').getImageData(frame*32,dir*48,32,48).data));
        frames++;
       }
       if(new Set(poses).size!==4)issues.push({race,archetype,dir});
      }
     }
     if(new Set(looks).size!==5)issues.push({race,reason:'figurinos iguais'});
    }
    return{frames,issues};
   });
   assert.equal(art.frames,800);
   assert.deepEqual(art.issues,[],'figurinos e poses devem ser distintos no canvas do navegador');
   const sequences=await page.evaluate(()=>{
    const d=window.__rpgDebug,output=[];
    for(const archetype of ['warrior','guardian','rebel','arcanist','hunter']){
     d.newCampaign({name:'Teste',race:'human',archetype},47);
     d.action('L');
     d.testTick(.13);
     d.action('L'); // agenda LL durante L, mesmo sem acerto
     const buffered=d.snapshot().buffer;
     let steps=0;
     while(d.snapshot().seq==='L'&&steps++<90)d.testTick(1/60);
     const second=d.snapshot();
     d.testTick(.14);
     d.action('L'); // agenda LLL durante LL
     const thirdBuffered=d.snapshot().buffer;
     steps=0;
     while(d.snapshot().seq==='LL'&&steps++<90)d.testTick(1/60);
     const third=d.snapshot();
     output.push({archetype,buffered,second:second.seq,
      thirdBuffered,third:third.seq,maxChain:third.maxChain,
      accepted:third.acceptedInputs,foes:third.foes.filter(e=>e.hp>0).length});
    }
    // Dois toques simultâneos não representam dois golpes.
    d.newCampaign({name:'Anti spam',race:'human',archetype:'rebel'},48);
    d.action('L');d.action('L');
    const antiSpam=d.snapshot();
    return{output,antiSpam:{accepted:antiSpam.acceptedInputs,buffer:antiSpam.buffer}};
   });
   for(const seq of sequences.output){
    assert.equal(seq.foes,0,seq.archetype+' testado sem alvo');
    assert.equal(seq.buffered,'L',seq.archetype+' deve agendar segundo golpe');
    assert.equal(seq.second,'LL',seq.archetype+' deve executar segundo golpe');
    assert.equal(seq.thirdBuffered,'L',seq.archetype+' deve agendar terceiro golpe');
    assert.equal(seq.third,'LLL',seq.archetype+' deve executar terceiro golpe');
    assert.ok(seq.maxChain>=3,seq.archetype+' deve completar combo de três golpes');
    assert.equal(seq.accepted,3,seq.archetype+' deve executar um golpe por entrada');
   }
   assert.equal(sequences.antiSpam.accepted,1,'dois toques simultâneos não duplicam ataques');
   assert.equal(sequences.antiSpam.buffer,null,'duplo toque não enfileira ataque extra');
  }

  // REGRESSÃO VISUAL + GEOMÉTRICA DOS FINALIZADORES:
  // Perfuração precisa ter ponta axial, não um arco genérico.
  // Seu colisor deve ser fino; giro e corte realmente alcançam lados.
  if(width===854&&height===480){
   const combatMotion=await page.evaluate(()=>{
    const d=window.__rpgDebug;
    const form=(a,key)=>d.attackForm(a,key);
    const pose=(key,t)=>d.attackWeaponPose('rebel',key,t);
    const pre=pose('LLH',.12),impact=pose('LLH',.47);
    const extension=p=>Math.hypot(p.x2-p.x1,p.y2-p.y1);
    return{
     daggerKeys:['L','LL','LLL','H','HH','LLH','LHL','HLL','LHH','HLH',
      'LLLH','LLHL','LHLH','LHHL','HLLH','HLHL','HHL']
      .map(key=>({key,...form('rebel',key)})),
     slashSide:d.attackHitProbe('rebel','L',1,.70),
     pierceSide:d.attackHitProbe('rebel','LLH',1,.70),
     pierceFront:d.attackHitProbe('rebel','LLH',1.22,0),
     spinBehind:d.attackHitProbe('rebel','LLL',-.80,0),
     thrustBehind:d.attackHitProbe('rebel','LLH',-.80,0),
     startingExtent:extension(pre),impactExtent:extension(impact),
     forms:{
      swordSpin:form('warrior','LLL').motion,
      swordUppercut:form('warrior','LLH').motion,
      guardianBash:form('guardian','H').motion,
      guardianFinisherFX:form('guardian','LLH').fxStyle,
      daggerPierce:form('rebel','LLH').motion,
      daggerPierceFX:form('rebel','LLH').fxStyle,
      daggerDouble:form('rebel','HH').motion,
      daggerCross:form('rebel','LHH').motion
     }
    };
   });
   assert.equal(combatMotion.daggerKeys.length,17);
   assert.ok(new Set(combatMotion.daggerKeys.map(x=>x.motion)).size>=7,
    'adaga deve ter golpes com ao menos sete geometrias distintas');
   assert.equal(combatMotion.forms.daggerPierce,'thrust');
   assert.equal(combatMotion.forms.daggerPierceFX,'daggerPierce');
   assert.equal(combatMotion.forms.daggerDouble,'doubleThrust');
   assert.equal(combatMotion.forms.daggerCross,'cross');
   assert.equal(combatMotion.forms.swordSpin,'spin');
   assert.equal(combatMotion.forms.swordUppercut,'uppercut');
   assert.equal(combatMotion.forms.guardianBash,'bash');
   assert.equal(combatMotion.forms.guardianFinisherFX,'shieldShock');
   assert.equal(combatMotion.slashSide,true,'corte da adaga atinge em arco lateral');
   assert.equal(combatMotion.pierceSide,false,'Perfuração não pode usar hitbox lateral');
   assert.equal(combatMotion.pierceFront,true,'Perfuração precisa atingir sua linha frontal');
   assert.equal(combatMotion.spinBehind,true,'giro alcança área traseira');
   assert.equal(combatMotion.thrustBehind,false,'estocada não pode acertar atrás');
   assert.ok(combatMotion.impactExtent>combatMotion.startingExtent*1.6,
    'a lâmina deve avançar em linha reta, não apenas girar');
   const scene=await page.evaluate(()=>{
    const d=window.__rpgDebug;
    d.newCampaign({name:'Teste',race:'human',archetype:'rebel'},47);
    d.action('L');d.testTick(.13);d.action('L');d.testTick(.10);
    d.testTick(.13);d.action('H');d.testTick(.17);
    d.testTick(.16); // enquadra a extensão frontal da Perfuração para captura visual
    const s=d.snapshot();
    return {sequence:s.seq,attack:s.attack,accepted:s.acceptedInputs,
     specialTypes:s.specialTypes,weapon:s.weapon,fin:s.maxChain};
   });
   assert.equal(scene.weapon,'rebel');
   assert.equal(scene.sequence,'LLH','L, L, H deve manter o combo de Perfuração');
   assert.equal(scene.attack,'Perfuração','o golpe executado deve ser o finalizador, e não corte comum');
   assert.equal(scene.accepted,3,'os três ataques devem ser realmente executados');
   await page.waitForTimeout(90);
   await page.screenshot({path:resolve(root,'screenshots','adaga-perfuracao-animacao.png')});
  }

  // FLORESTA PROCEDURAL: somente um dos três spawns autorais por seed.
  // As travessias são salas intermediárias de exploração, não novos spawns.
  if(width===854&&height===480){
   const forestCheck=await page.evaluate(()=>{
    const d=window.__rpgDebug,seenSpawns=new Set(),types=new Set(),
      samples={},errors=[],totals={rooms:0,water:0,trees:0,roads:0};
    for(let seed=1;seed<=300;seed++){
     const world=d.worldForSeed(seed),rooms=Object.values(world.rooms);
     const spawnRooms=rooms.filter(r=>r.spawnTemplate);
     if(spawnRooms.length!==1||spawnRooms[0].id!==1)
      errors.push({seed,issue:'spawn deve continuar aleatório e único'});
     if(world.areas[0].biome!=='forest')
      errors.push({seed,issue:'região de nascimento deve ser floresta'});
     seenSpawns.add(spawnRooms[0].spawnTemplate);
     if(world.rooms[2].kind!=='empty'||!world.rooms[2].forestTraversal)
      errors.push({seed,issue:'primeira travessia não é uma sala livre'});
     for(const r of rooms){
      const biome=world.areas[r.area].biome;
      if(r.spawnTemplate&&r.forestTraversal)
       errors.push({seed,room:r.id,issue:'spawn não pode ser travessia genérica'});
      if(!r.spawnTemplate&&r.area!==2&&world.areas[r.area].type==='wild'&&biome==='forest'&&!r.forestTraversal)
       errors.push({seed,room:r.id,issue:'sala comum da floresta sem trilha'});
      if(biome!=='forest'&&r.forestTraversal)
       errors.push({seed,room:r.id,issue:'travessia florestal fora da floresta'});
      if(!r.forestTraversal)continue;
      totals.rooms++;types.add(r.forestTraversal);
      if(r.id===2&&samples[r.forestTraversal]===undefined)
       samples[r.forestTraversal]=seed;
      const shape=d.forestGeometry(seed,r.id);
      if(!shape||shape.forestTraversal!==r.forestTraversal)
       {errors.push({seed,room:r.id,issue:'geometria ausente'});continue;}
      const road=new Map(shape.paths),solid=new Set(shape.solid),walkable=new Set(shape.walkable);
      totals.trees+=shape.props.filter(p=>p.type==='tree').length;
      totals.roads+=shape.paths.filter(([,kind])=>kind==='forestTrail').length;
      if(shape.props.some(p=>!['tree','stone','log','rootWall'].includes(p.type)))
       errors.push({seed,room:r.id,issue:'tipo de obstáculo desconhecido'});
      for(const p of shape.props)if(!solid.has(p.x+','+p.z))
       errors.push({seed,room:r.id,issue:'tronco não tem colisão'});
      for(const [key,kind] of road)if(['forestTrail','forestBridge','forestClearing'].includes(kind)&&solid.has(key))
       errors.push({seed,room:r.id,issue:'estrada bloqueada por objeto',key});
      if(shape.decor.some(p=>p.type==='flower'))
       errors.push({seed,room:r.id,issue:'flora da travessia não deve mexer nos canteiros autorais'});
      if(r.forestTraversal==='stream'){
       if(!shape.paths.some(([,kind])=>kind==='forestWater'))
        errors.push({seed,room:r.id,issue:'riacho sem água'});
       else totals.water++;
      }
      // BFS: toda célula transitável deve ser alcançável a partir do centro.
      const visited=new Set(['0,0']),queue=[[0,0]];
      if(!walkable.has('0,0')||solid.has('0,0'))
       errors.push({seed,room:r.id,issue:'centro inacessível'});
      for(let i=0;i<queue.length;i++){
       const [x,z]=queue[i];
       for(const [dx,dz] of [[1,0],[0,1],[-1,0],[0,-1]]){
        const key=(x+dx)+','+(z+dz);
        if(visited.has(key)||!walkable.has(key)||solid.has(key))continue;
        visited.add(key);queue.push([x+dx,z+dz]);
       }
      }
      for(const key of walkable)if(!solid.has(key)&&!visited.has(key)){
       errors.push({seed,room:r.id,issue:'trecho de piso isolado',key});break;
      }
      for(const e of shape.exits)if(!visited.has(e.at.x+','+e.at.z))
       errors.push({seed,room:r.id,issue:'saída isolada',dir:e.dir});
      if(JSON.stringify(shape)!==JSON.stringify(d.forestGeometry(seed,r.id)))
       errors.push({seed,room:r.id,issue:'seed não determinística'});
     }
    }
    return{spawns:[...seenSpawns],types:[...types],samples,totals,errors:errors.slice(0,18),
     errorCount:errors.length};
   });
   assert.equal(forestCheck.errorCount,0,JSON.stringify(forestCheck.errors));
   assert.deepEqual(new Set(forestCheck.spawns),new Set(['flower_clearing','ruined_gate','colossal_tree']),
    'os três spawns existentes devem continuar escolhidos aleatoriamente');
   assert.deepEqual(new Set(forestCheck.types),
    new Set(['winding','grove','fork','stream','moss','fallen','stones','ferns',
     'ring','roots','marsh','mist','fireflies','ridge','hollow']),
    'os 15 mapas-base de travessia devem surgir em seeds diferentes');
   assert.ok(forestCheck.totals.rooms>1000,'variedade ao longo de muitas salas');
   assert.ok(forestCheck.totals.water>100,'riachos reais em parte das florestas');
   assert.ok(forestCheck.totals.trees>1200,'passagens entre árvores sólidas');
   assert.ok(forestCheck.totals.roads>4000,'trilhas físicas conectam entradas e saídas');

   const uniqueFeatures=await page.evaluate(()=>{
    const d=window.__rpgDebug,found={},want={
     moss:'forestMoss',fallen:'log',stones:'stone',ferns:'forestFern',
     ring:'forestClearing',roots:'forestRoot',marsh:'forestShallow',
     mist:'forestMist',fireflies:'firefly',ridge:'forestStone',
     hollow:'forestShade'
    };
    for(let seed=1;seed<=300;seed++){
     const world=d.worldForSeed(seed);
     for(const room of Object.values(world.rooms)){
      const feature=want[room.forestTraversal];
      if(!feature||found[room.forestTraversal])continue;
      const g=d.forestGeometry(seed,room.id);
      if(g.paths.some(([,kind])=>kind===feature)||
         g.props.some(o=>o.type===feature)||
         g.decor.some(o=>o.type===feature))found[room.forestTraversal]=seed;
     }
    }
    return{found,want};
   });
   assert.deepEqual(Object.keys(uniqueFeatures.found).sort(),Object.keys(uniqueFeatures.want).sort(),
    'cada um dos 11 novos mapas deve ter uma característica física ou visual própria');

   // ETAPA VISUAL: personagens, troncos e copas compartilham a mesma
   // profundidade isométrica. A arte é maior que a colisão de um tile.
   const depthCheck=await page.evaluate(()=>{
    const d=window.__rpgDebug;
    let sample=null;
    for(let seed=1;seed<=45&&!sample;seed++){
     const world=d.worldForSeed(seed);
     for(const room of Object.values(world.rooms)){
      if(!room.spawnTemplate&&!room.forestTraversal)continue;
      const data=room.spawnTemplate?d.spawnGeometry(seed):d.forestGeometry(seed,room.id);
      const tree=data.props.find(o=>o.type==='tree');
      if(tree){sample={seed,id:room.id,tree};break;}
     }
    }
    if(!sample)return{error:'nenhuma árvore procedimental para verificar'};
    const {seed,id,tree}=sample;
    const order=(x,z)=>d.forestSceneOrder(seed,id,x,z);
    const index=(entries,kind)=>entries.findIndex(e=>kind==='actor'?
     e.kind==='actor':e.kind==='feature'&&e.type==='tree'&&
     e.x===tree.x+.5&&e.z===tree.z+.5);
    const behind=order(tree.x-2,tree.z-2);
    const front=order(tree.x+3,tree.z+3);
    d.debugStartSeed(seed);
    const scale=d.forestVisualScale();
    return{sample,behind: index(behind,'actor')<index(behind,'tree'),
     front:index(front,'actor')>index(front,'tree'),scale};
   });
   assert.equal(depthCheck.error,undefined,depthCheck.error||'');
   assert.ok(depthCheck.behind,'árvore deve cobrir personagem que está atrás');
   assert.ok(depthCheck.front,'personagem deve ficar à frente da árvore ao ultrapassar o tronco');
   assert.ok(depthCheck.scale.actor<depthCheck.scale.training*.75,
    'ator na campanha deve ser proporcionalmente menor que na arena');
   assert.ok(depthCheck.scale.treeWidth>32*depthCheck.scale.actor*2,
    'árvores devem ser pelo menos duas vezes mais largas que o boneco');
   assert.ok(depthCheck.scale.treeHeight>48*depthCheck.scale.actor*2,
    'árvores devem ser pelo menos duas vezes mais altas que o boneco');
   await page.screenshot({path:resolve(root,'screenshots','floresta-escala-e-camadas.png')});

   for(const [variant,seed] of Object.entries(forestCheck.samples)){
    const result=await page.evaluate(seed=>{
     const d=window.__rpgDebug;
     d.debugStartSeed(seed);
     const before=d.snapshot().run.world,
      edge=before.rooms[1].exits.find(x=>x.to===2);
     const ok=edge&&d.worldTravelNeighbor(edge.dir);
     if(!ok)return{error:'não conectou o spawn à primeira travessia'};
     const state=d.snapshot(),position=d.worldRoomInfo();
     return{from:before.rooms[1].spawnTemplate,
      variant:state.run.world.rooms[2].forestTraversal,
      cleared:state.run.cleared,region:state.run.region,
      location:state.run.world.current,position,foes:state.foes.length};
    },seed);
    assert.equal(result.error,undefined,result.error||'');
    assert.equal(result.location,2);
    assert.equal(result.variant,variant,'travessia selecionada pela seed');
    assert.equal(result.region,'forest');
    assert.equal(result.cleared,true,'primeira travessia é livre');
    assert.equal(result.foes,0,'sala de travessia segura não gera inimigos indevidos');
    assert.ok(result.position.walkable,'entrada física não prende o personagem');
    await page.waitForTimeout(110);
    await page.screenshot({path:resolve(root,'screenshots','floresta-travessia-'+variant+'.png')});
    const returned=await page.evaluate(()=>{
     const d=window.__rpgDebug,previous=d.snapshot().run.world.rooms[2].exits.find(x=>x.to===1);
     const back=d.worldTravelNeighbor(previous.dir);
     return{back,room:d.snapshot().run.world.current,visited:d.snapshot().run.world.discovered,
      variant:d.snapshot().run.world.rooms[2].forestTraversal};
    });
    assert.ok(returned.back,'pode voltar ao spawn');
    assert.equal(returned.room,1,'regresso pela passagem física');
    assert.ok(returned.visited.includes(2),'travessia permanece descoberta');
    assert.equal(returned.variant,variant,'retorno não regenera outro mapa');
   }
   await page.evaluate(()=>window.__rpgDebug.worldSave());
   await page.reload();
   await page.waitForFunction(()=>Boolean(window.__rpgDebug));
   await page.evaluate(()=>window.__rpgDebug.resumeCampaign(
    JSON.parse(localStorage.getItem('rpg_pixelart_active_run_v21'))));
   assert.ok((await page.evaluate(()=>window.__rpgDebug.snapshot().run.world.discovered)).includes(2),
    'save preserva a descoberta da travessia');
  }
  await page.close();
  console.log('OK',width+'x'+height,'raças, controles, HUD, FPS e chefe');
 }
 assert.deepEqual(failures,[],'erros de execução no navegador');
}finally{
 if(browser)await browser.close();
 await new Promise(resolve=>server.close(resolve));
}

