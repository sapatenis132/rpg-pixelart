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
   assert.equal(generated.shapes.length,5,'cinco topologias de sala');
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
  await page.close();
  console.log('OK',width+'x'+height,'raças, controles, HUD, FPS e chefe');
 }
 assert.deepEqual(failures,[],'erros de execução no navegador');
}finally{
 if(browser)await browser.close();
 await new Promise(resolve=>server.close(resolve));
}
