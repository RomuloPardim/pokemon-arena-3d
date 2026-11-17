/* =========================================================
   UTILIDADES
   ========================================================= */
const $ = s => document.querySelector(s);
const clamp = (v,a,b) => Math.max(a, Math.min(b, v));
const rand = (a,b) => a + Math.random()*(b-a);
const angDiff = (a,b) => { let d = a-b; while(d>Math.PI) d-=2*Math.PI; while(d<-Math.PI) d+=2*Math.PI; return d; };
const pad3 = n => String(n).padStart(3,'0');
const store = {
  get(k,d){ try{ const v = localStorage.getItem('pkarena_'+k); return v==null ? d : JSON.parse(v); }catch(e){ return d; } },
  set(k,v){ try{ localStorage.setItem('pkarena_'+k, JSON.stringify(v)); }catch(e){} }
};
const imgCache = {};
function getImg(id){
  if (!imgCache[id]) { const im = new Image(); im.onerror = () => im.failed = true; im.src = SPRITE(id); imgCache[id] = im; }
  return imgCache[id];
}
function typeChip(t){ return `<span class="tchip" style="background:${TYPES[t][1]}">${TYPES[t][0]}</span>`; }
// Sprite animado (GIF do Showdown hospedado na PokeAPI). Se falhar, usa o PNG parado; se falhar de novo, um círculo.
const ANI = id => `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/${id}.gif`;
function fallbackEl(p, size){
  const d = document.createElement('div'); d.className = 'fallback';
  d.style.cssText = `width:${size}px;height:${size}px;background:${TYPES[p.types[0]][1]}`; d.textContent = p.name.slice(0,3);
  return d;
}
function sprErr(img){
  const p = BYID[+img.dataset.id];
  if (img.dataset.step !== '1' && img.src.endsWith('.gif')) { img.dataset.step = '1'; img.src = SPRITE(p.id); return; }
  img.replaceWith(fallbackEl(p, +img.dataset.size || 48));
}
function sprHTML(p, size, animated){
  return `<img class="spr" src="${animated ? ANI(p.id) : SPRITE(p.id)}" alt="${p.name}" data-id="${p.id}" data-size="${size}" onerror="sprErr(this)">`;
}
const isTouch = matchMedia('(pointer:coarse)').matches || 'ontouchstart' in window;
if (isTouch) document.body.classList.add('touch');

