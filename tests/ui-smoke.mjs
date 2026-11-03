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
  // Verifica 160 sprites (cinco raças, oito direções, quatro quadros)
  // e confere a visibilidade dos olhos em todos os perfis.
  if(width===854&&height===480){
   const facial=await page.evaluate(()=>{
    const colors={
     human:[24,45,57],elf:[27,54,53],orc:[37,50,44],
     dwarf:[40,49,57],halfling:[53,65,56]
    };
    let frameCount=0,eyeCount=0;const errors=[];
    for(const [race,color] of Object.entries(colors)){
     const sprite=window.__rpgDebug.spriteAtlas(race),shape=window.__rpgDebug.spriteShape(race);
     const ctx=sprite.getContext('2d'),hx=16-Math.floor(shape.headW/2);
     for(let dir=0;dir<8;dir++)for(let frame=0;frame<4;frame++){
      frameCount++;
      const px=ctx.getImageData(frame*32,dir*48,32,48).data;
      let painted=0;for(let k=3;k<px.length;k+=4)if(px[k]>0)painted++;
      if(painted<150)errors.push({race,dir,frame,reason:'sprite incompleta',painted});
      if(dir===5||dir===6)continue; // costas: sem olhos
      const side=dir!==1,left=dir===2||dir===3||dir===4;
      const ex=side?(left?hx+2:hx+shape.headW-4):hx+2;
      const ey=shape.headY+(race==='halfling'?6:7)+(frame===1||frame===3?1:0);
      const idx=(ey*32+ex)*4,rgb=[px[idx],px[idx+1],px[idx+2]];
      eyeCount++;
      if(rgb.some((v,i)=>v!==color[i]))errors.push({race,dir,frame,reason:'olho invisível',rgb,expected:color,ex,ey});
      if(!side){
       const k=(ey*32+hx+shape.headW-4)*4,rgb2=[px[k],px[k+1],px[k+2]];
       eyeCount++;
       if(rgb2.some((v,i)=>v!==color[i]))errors.push({race,dir,frame,reason:'segundo olho invisível',rgb:rgb2,expected:color});
      }
     }
    }
    return{frameCount,eyeCount,errors};
   });
   assert.equal(facial.frameCount,160,'cinco raças, oito direções e quatro quadros');
   assert.equal(facial.eyeCount,140,'todos os olhos das visões frontais e laterais');
   assert.deepEqual(facial.errors,[],'olhos e sprite consistentes durante caminhada');
  }
  // Confere matematicamente que a ponta da arma jamais retorna ao rosto.
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
       if(!Number.isFinite(pose.x2)||!Number.isFinite(pose.y2)||
         pose.side*(pose.x2-pose.x1)<=0||
         Math.sign(pose.x1)!==pose.side)
         failures.push({archetype,face,angle:i/10,pose});
      }
     }
    }
    return{count,failures};
   });
   assert.equal(poseCheck.count,1000);
   assert.deepEqual(poseCheck.failures,[],'a arma deve ficar para fora do rosto em todo o arco');
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
  // Regressão: as duas espadas e a adaga acompanham o joystick de modo
  // contínuo. Antes o ângulo era quase fixo independentemente da direção.
  if(width===854&&height===480){
   const following=await page.evaluate(()=>{
    const d=window.__rpgDebug,archetypes=['warrior','guardian','rebel'];
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
      maxJump=Math.max(maxJump,Math.abs(next.a-prev.a));
     }
     output.push({
      archetype,
      angleRange:Math.max(...poses.map(p=>p.a))-Math.min(...poses.map(p=>p.a)),
      gripRange:Math.max(...poses.map(p=>p.y1))-Math.min(...poses.map(p=>p.y1)),
      maxJump
     });
    }
    return output;
   });
   for(const weapon of following){
    assert.ok(weapon.angleRange>.85,weapon.archetype+' deve acompanhar a direção do joystick');
    assert.ok(weapon.gripRange>5,weapon.archetype+' deve deslocar a empunhadura');
    assert.ok(weapon.maxJump<.11,weapon.archetype+' não pode saltar de direção');
   }
   // Integração: mover o joystick real via teclas usa a mesma entrada de movimento.
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
  await page.close();
  console.log('OK',width+'x'+height,'raças, controles, HUD, FPS e chefe');
 }
 assert.deepEqual(failures,[],'erros de execução no navegador');
}finally{
 if(browser)await browser.close();
 await new Promise(resolve=>server.close(resolve));
}
