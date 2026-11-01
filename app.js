'use strict';
const canvas = document.querySelector('#fireworks');
const ctx = canvas.getContext('2d');
const image = document.querySelector('#fallback');
const secondary = document.querySelector('#secondary-logo');
const swapButton = document.querySelector('#swap-logo');
let swapped = false;
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
let width = 0, height = 0, pixels = [], sparks = [], last = 0, previous = null;
let bounds = {x:0,y:0,w:0,h:0};
const random = (min,max) => min + Math.random() * (max-min);
function prepare() {
  if (!ctx || !image.naturalWidth || !secondary.naturalWidth) return;
  width = window.innerWidth; height = window.innerHeight;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = width*dpr; canvas.height = height*dpr;
  ctx.setTransform(dpr,0,0,dpr,0,0);
  const primaryImage = swapped ? secondary : image;
  const smallImage = swapped ? image : secondary;
  const w = Math.min(width*.86,1100,height*.66*primaryImage.naturalWidth/primaryImage.naturalHeight);
  const h = w*primaryImage.naturalHeight/primaryImage.naturalWidth;
  bounds = {x:(width-w)/2,y:height*.47-h/2,w,h};
  const slot = swapButton.getBoundingClientRect();
  const smallW = Math.min(slot.width,slot.height*smallImage.naturalWidth/smallImage.naturalHeight);
  const smallH = smallW*smallImage.naturalHeight/smallImage.naturalWidth;
  pixels = []; sparks = []; previous = null;
  for (const [source, box, step] of [
    [primaryImage,bounds,width < 600 ? 2 : 3],
    [smallImage,{x:slot.left+(slot.width-smallW)/2,y:slot.top+(slot.height-smallH)/2,w:smallW,h:smallH},1.5]
  ]) {
    const sample = document.createElement('canvas');
    sample.width = Math.ceil(box.w); sample.height = Math.ceil(box.h);
    const sampleCtx = sample.getContext('2d',{willReadFrequently:true});
    if (!sampleCtx) return;
    sampleCtx.drawImage(source,0,0,box.w,box.h);
    const data = sampleCtx.getImageData(0,0,sample.width,sample.height).data;
    for(let y=0;y<sample.height;y+=step) for(let x=0;x<sample.width;x+=step) {
      const i=(Math.floor(y)*sample.width+Math.floor(x))*4;
      if(data[i+3]<30 || Math.max(data[i],data[i+1],data[i+2])<45) continue;
      pixels.push({x:box.x+x,y:box.y+y,size:step+.4,color:`rgb(${data[i]},${data[i+1]},${data[i+2]})`,hiddenUntil:0});
    }
  }
  document.body.classList.add('ready');
}
function burst(x,y,radius=55,force=1) {
  const now = performance.now();
  let emitted = 0;
  for(const p of pixels) {
    const dx=p.x-x,dy=p.y-y,dist=Math.hypot(dx,dy);
    if(dist>radius || p.hiddenUntil>now) continue;
    p.hiddenUntil=now+random(1200,2300);
    // Each bright piece of the logo becomes a colored firework fragment.
    if (sparks.length >= 4200 || emitted >= 420) continue;
    const angle=Math.atan2(dy,dx)+random(-.65,.65);
    const velocity=random(1.5,5.8)*force;
    sparks.push({x:p.x,y:p.y,vx:Math.cos(angle)*velocity,vy:Math.sin(angle)*velocity-1.8,life:random(35,65),max:65,color:p.color,size:random(.8,2),trail:[]});
    emitted++;
  }
}
function interact(event) {
  const x=event.clientX,y=event.clientY;
  const spacing=18;
  if(previous) {
    const distance=Math.hypot(x-previous.x,y-previous.y);
    const steps=Math.min(12,Math.ceil(distance/spacing));
    for(let i=1;i<=steps;i++) burst(previous.x+(x-previous.x)*i/steps,previous.y+(y-previous.y)*i/steps,width<600?38:52);
  } else burst(x,y,width<600?38:52);
  previous={x,y};
}
swapButton.addEventListener('click',()=>{
  swapped = !swapped;
  swapButton.setAttribute('aria-label',swapped ? 'Mostrar Ciclismo Córdoba como logo principal' : 'Mostrar M3 como logo principal');
  prepare();
});
swapButton.addEventListener('pointermove',event=>{if(!reduced.matches)interact(event);});
swapButton.addEventListener('pointerdown',event=>{previous=null;if(!reduced.matches)interact(event);});
swapButton.addEventListener('pointerleave',()=>{previous=null;});
canvas.addEventListener('pointermove',event=>{if(!reduced.matches)interact(event);});
canvas.addEventListener('pointerdown',event=>{previous=null;interact(event);});
canvas.addEventListener('pointerleave',()=>{previous=null;});
canvas.addEventListener('pointerup',event=>{if(event.pointerType!=='mouse')previous=null;});
function frame(now) {
  const dt=last?Math.min((now-last)/16.67,2):1;last=now;
  ctx.clearRect(0,0,width,height);
  for(const p of pixels) {
    const remaining=p.hiddenUntil-now;
    if(remaining>450) continue;
    ctx.globalAlpha=remaining>0?1-remaining/450:1;
    ctx.fillStyle=p.color;
    ctx.fillRect(p.x,p.y,p.size,p.size);
  }
  ctx.globalAlpha=1;
  ctx.globalCompositeOperation='lighter';
  for(let i=sparks.length-1;i>=0;i--) {
    const s=sparks[i];
    s.trail.push({x:s.x,y:s.y}); if(s.trail.length>5)s.trail.shift();
    s.vx*=Math.pow(.982,dt);s.vy+=.045*dt;
    s.x+=s.vx*dt;s.y+=s.vy*dt;s.life-=dt;
    if(s.life<=0){sparks.splice(i,1);continue;}
    ctx.globalAlpha=Math.min(1,s.life/22);
    ctx.strokeStyle=s.color;ctx.lineWidth=s.size*.65;
    ctx.beginPath();ctx.moveTo(s.trail[0].x,s.trail[0].y);ctx.lineTo(s.x,s.y);ctx.stroke();
    ctx.fillStyle=s.color;ctx.beginPath();ctx.arc(s.x,s.y,s.size,0,Math.PI*2);ctx.fill();
    if(s.life>35){ctx.fillStyle='#d8f8ff';ctx.fillRect(s.x,s.y,1.2,1.2);}
  }
  ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1;
  requestAnimationFrame(frame);
}
if(ctx) {
  for (const logo of [image,secondary]) {
    if (!logo.complete) logo.addEventListener('load',prepare,{once:true});
  }
  prepare();
  window.addEventListener('resize',prepare);
  requestAnimationFrame(frame);
}
