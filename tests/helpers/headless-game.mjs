// Executa a simulação e os canvases reais, sem navegador.
// O DOM mínimo abaixo não valida CSS, acessibilidade ou layout mobile:
// essas verificações continuam em tests/ui-smoke.mjs com Playwright.
import {readFileSync} from 'node:fs';
import {webcrypto} from 'node:crypto';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {createCanvas,Image} from '@napi-rs/canvas';

export async function loadGame({html, width=960, height=540}={}){
 const root=fileURLToPath(new URL('../../',import.meta.url));
 html??=readFileSync(new URL('../../index.html',import.meta.url),'utf8');
 const elements=new Map(),images=[];
 const style=()=>({setProperty(key,value){this[key]=value;}});
 function element(tag='div'){
  const classes=new Set(),listeners=new Map();
  const el=tag==='canvas'?createCanvas(300,150):{};
  Object.assign(el,{
   tagName:tag.toUpperCase(),style:style(),dataset:{},children:[],attributes:{},
   value:'',textContent:'',disabled:false,
   classList:{
    add(...names){names.forEach(n=>classes.add(n));},
    remove(...names){names.forEach(n=>classes.delete(n));},
    contains(name){return classes.has(name);},
    toggle(name,force){const next=force===undefined?!classes.has(name):!!force;
     next?classes.add(name):classes.delete(name);return next;}
   },
   addEventListener(name,fn){listeners.set(name,fn);},
   click(){listeners.get('click')?.({target:el,preventDefault(){}});},
   setAttribute(name,value){el.attributes[name]=String(value);},
   getAttribute(name){return el.attributes[name]??null;},
   append(...nodes){for(const node of nodes){el.children.push(node);node.parentElement=el;}},
   appendChild(node){el.append(node);return node;},
   prepend(...nodes){el.children.unshift(...nodes);},
   replaceChildren(...nodes){el.children=[];el.append(...nodes);},
   getBoundingClientRect(){return{x:0,y:0,left:0,top:0,right:width,bottom:height,width,height};},
   querySelector(){return element();},
   setPointerCapture(){},releasePointerCapture(){},focus(){}
  });
  Object.defineProperty(el,'className',{get(){return [...classes].join(' ');},
   set(value){classes.clear();String(value).split(/\s+/).filter(Boolean).forEach(n=>classes.add(n));}});
  return el;
 }
 for(const [,tag,attributes,id] of html.matchAll(/<([a-z][\w-]*)\b([^>]*?)\bid="([^"]+)"[^>]*>/gi)){
  const el=element(tag);el.id=id;
  el.className=attributes.match(/\bclass="([^"]*)"/)?.[1]||'';
  elements.set(id,el);
 }
 const document={
  hidden:false,fullscreenElement:null,
  getElementById(id){if(!elements.has(id))throw new Error('ID desconhecido: '+id);return elements.get(id);},
  createElement:element,createTextNode:text=>({textContent:String(text)}),
  querySelector(){return element();},querySelectorAll(){return[];},
  addEventListener(){}
 };
 const stored=new Map([['iso_rpg_etapa8_settings',JSON.stringify({sound:false,haptics:false})]]);
 const sandbox={
  document,console,Math,Date,Map,Set,Array,Uint8ClampedArray,Uint32Array,
  crypto:webcrypto,innerWidth:width,innerHeight:height,devicePixelRatio:1,
  localStorage:{getItem:key=>stored.get(key)??null,setItem:(key,v)=>stored.set(key,String(v)),
   removeItem:key=>stored.delete(key)},
  navigator:{vibrate(){}},screen:{orientation:{}},performance:{now:()=>0},
  Image:class extends Image{
   constructor(){super();images.push(this);}
   set src(value){this.requestPath=String(value);super.src=this.requestPath.startsWith('data:')?
    this.requestPath:resolve(root,this.requestPath);}
   get src(){return this.requestPath||'';}
   getAttribute(name){return name==='src'?this.requestPath:null;}
  },
  addEventListener(){},requestAnimationFrame(fn){sandbox.frame=fn;return 1;},
  cancelAnimationFrame(){},setTimeout,clearTimeout,confirm:()=>true
 };
 sandbox.window=sandbox;
 const context=vm.createContext(sandbox);
 const script=html.match(/<script>([\s\S]*?)<\/script>/i)?.[1];
 if(!script)throw new Error('Script principal ausente');
 // Expõe o render somente no ambiente de teste, sem mudar o jogo publicado.
 const protectedConfiguration=['RACE_OPTIONS','ATTACKS','WEAPON_MOVES','BALANCE',
  'POSTURE_PROFILES','COMBAT_MOVE_FACTORS','EXTENSIONS','FOES','ABILITIES'];
 const probe='window.__protectedForTest=()=>({configuration:{'+
  protectedConfiguration.join(',')+'}});window.__legacyEnemyForTest=style=>PIXEL_ART[style];';
 const instrumented=script.replace('resize();reset();',
  'window.__renderForTest=render;'+probe+'resize();reset();');
 new vm.Script(instrumented,{filename:'index.html'}).runInContext(context,{timeout:20000});
 await Promise.all(images.map(image=>image.decode().catch(()=>{})));
 return{debug:sandbox.__rpgDebug,canvas:elements.get('scene'),elements,
  render:()=>sandbox.__renderForTest(),frame:time=>sandbox.frame(time),context,
  protectedState:()=>sandbox.__protectedForTest(),
  legacyEnemy:style=>sandbox.__legacyEnemyForTest(style)};
}
