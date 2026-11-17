/* =========================================================
   EFEITOS VISUAIS (partículas e texturas)
   ========================================================= */
const TFX = {
  fire:{c2:'#ffe27a', trail:'flame', burst:['flame','flame','smoke'], smoke:'#5a4a44'},
  water:{c2:'#d6f0ff', trail:'drop', burst:['drop','bubble','glow']},
  electric:{c2:'#fffbd0', trail:'spark', burst:['bolt','spark','glow']},
  grass:{c2:'#d4ff9e', trail:'leaf', burst:['leaf','leaf','glow']},
  ice:{c2:'#ffffff', trail:'shard', burst:['shard','glow','spark']},
  fighting:{c2:'#ffd27a', trail:'glow', burst:['star','spark','spark']},
  poison:{c2:'#e7a6ff', trail:'bubble', burst:['bubble','smoke','glow'], smoke:'#5d2d6e'},
  ground:{c2:'#f3dc9a', trail:'dust', burst:['rock','dust','dust'], smoke:'#b49a6a'},
  flying:{c2:'#ffffff', trail:'wind', burst:['wind','wind','glow']},
  psychic:{c2:'#ffd0e6', trail:'ring', burst:['ring','glow','star']},
  bug:{c2:'#efff9a', trail:'spark', burst:['spark','glow']},
  rock:{c2:'#efe0a8', trail:'dust', burst:['rock','rock','dust'], smoke:'#a89670'},
  ghost:{c2:'#d2b4ff', trail:'smoke', burst:['smoke','glow','ring'], smoke:'#3b2356'},
  dragon:{c2:'#c9b4ff', trail:'flame', burst:['flame','star','glow']},
  dark:{c2:'#c9b4a6', trail:'smoke', burst:['smoke','spark'], smoke:'#241a28'},
  steel:{c2:'#ffffff', trail:'spark', burst:['spark','star','glow']},
  fairy:{c2:'#fff0f8', trail:'star', burst:['star','star','glow']},
  normal:{c2:'#ffffff', trail:'glow', burst:['star','glow','spark']}
};
const glowCache = {};
function glowTex(col){
  if (glowCache[col]) return glowCache[col];
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
  const rg = g.createRadialGradient(32,32,0,32,32,32);
  rg.addColorStop(0,'#ffffff'); rg.addColorStop(.25,col); rg.addColorStop(1,col+'00');
  g.fillStyle = rg; g.fillRect(0,0,64,64);
  return glowCache[col] = c;
}
const softTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
  const rg = g.createRadialGradient(32,32,0,32,32,32); rg.addColorStop(0,'rgba(255,255,255,1)'); rg.addColorStop(.5,'rgba(255,255,255,.6)'); rg.addColorStop(1,'rgba(255,255,255,0)');
  g.fillStyle = rg; g.fillRect(0,0,64,64); return c; })();
const TC = t => TYPES[t][1];
const C2 = t => TFX[t].c2;
function P(o){ if (G.parts.length > (FX_LEVE() ? 260 : 900)) return; o.max = o.t; G.parts.push(o); }
function part(kind, type, x, y, sp=1){
  const col = Math.random() < .5 ? TC(type) : C2(type), a = rand(0, Math.PI*2), v = rand(60, 220)*sp;
  const base = {kind, x, y, col, vx:Math.cos(a)*v, vy:Math.sin(a)*v, t:rand(.3,.55), size:rand(4,8), rot:rand(0,7), vr:rand(-8,8), grav:0};
  switch (kind) {
    case 'flame': base.vy = -rand(40,140)*sp; base.vx *= .5; base.size = rand(7,14); base.col = Math.random()<.6 ? TC(type) : C2(type); break;
    case 'smoke': case 'dust': base.col = TFX[type].smoke || '#8a8f9c'; base.size = rand(8,16); base.t = rand(.5,.8); base.vx *= .35; base.vy = base.vy*.35 - 25; break;
    case 'drop': base.grav = 700; base.vy -= 120; base.size = rand(2.5,5); break;
    case 'bubble': base.vx *= .4; base.vy = -rand(30,80); base.size = rand(4,9); base.t = rand(.4,.7); break;
    case 'spark': case 'wind': base.t = rand(.18,.32); base.size = rand(2,4); if (kind === 'wind') { base.col = '#ffffff'; base.size = 2.5; } break;
    case 'bolt': { base.t = .14; const L = rand(30,70)*sp; base.pts = zig(x, y, x+Math.cos(a)*L, y+Math.sin(a)*L, 5, 10); base.vx = base.vy = 0; break; }
    case 'leaf': base.grav = 60; base.size = rand(5,8); base.t = rand(.5,.8); break;
    case 'shard': base.size = rand(4,8); break;
    case 'star': base.size = rand(6,12); base.vx *= .6; base.vy *= .6; break;
    case 'rock': base.grav = 900; base.vy = -rand(150,360)*sp; base.vx *= .7; base.size = rand(4,9); base.t = rand(.5,.8); base.col = Math.random()<.5 ? '#8a7a5a' : '#a8946a'; break;
    case 'ring': base.size = rand(4,8); base.size2 = rand(18,34); base.vx *= .2; base.vy *= .2; break;
    case 'glow': base.size = rand(8,16); base.vx *= .4; base.vy *= .4; base.t = rand(.2,.4); break;
  }
  P(base);
}
function burst(type, x, y, n, sp=1){ if (FX_LEVE()) n = Math.ceil(n/2); const ks = TFX[type].burst; for (let i=0;i<n;i++) part(ks[i % ks.length], type, x, y, sp); }
function trail(type, x, y){ if (FX_LEVE() && Math.random() < .5) return; const p0 = G.parts.length; part(TFX[type].trail, type, x + rand(-3,3), y + rand(-3,3), .25); const p = G.parts[p0]; if (p) { p.t *= .8; p.max = p.t; } }
function zig(x1,y1,x2,y2,segs,amp){
  const pts = [[x1,y1]], dx = x2-x1, dy = y2-y1, L = Math.hypot(dx,dy)||1, nx = -dy/L, ny = dx/L;
  for (let i=1;i<segs;i++){ const k = i/segs, o = rand(-amp,amp); pts.push([x1+dx*k+nx*o, y1+dy*k+ny*o]); }
  pts.push([x2,y2]); return pts;
}
function impact(x, y, type, big){
  P({kind:'impact', x, y, col:'#ffffff', t:big ? .22 : .16, size:big ? 70 : 44, rot:rand(0,1)});
  P({kind:'ring', x, y, col:TC(type), t:.25, size:8, size2:big ? 70 : 46, vx:0, vy:0});
  burst(type, x, y, big ? 18 : 10, big ? 1.4 : 1);
  G.hitstop = Math.max(G.hitstop, big ? .07 : .035);
}
function floatText(x,y,txt,col,size){ G.texts.push({x,y,txt:String(txt),col,size,t:1,pop:0}); }
function shake(n){ G.shake = Math.min(14, G.shake + n); }
function banner(txt, sub, col){
  const b = $('#banner'); b.innerHTML = `<b style="color:${col||'#ffd23f'}">${txt}</b>${sub ? `<small>${sub}</small>` : ''}`;
  b.classList.remove('show'); void b.offsetWidth; b.classList.add('show');
}

