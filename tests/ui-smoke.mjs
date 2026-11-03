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
  await page.close();
  console.log('OK',width+'x'+height,'raças, controles, HUD, FPS e chefe');
 }
 assert.deepEqual(failures,[],'erros de execução no navegador');
}finally{
 if(browser)await browser.close();
 await new Promise(resolve=>server.close(resolve));
}
