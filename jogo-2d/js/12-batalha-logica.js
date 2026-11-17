/* ----- Entrada ----- */
const keys = {};
const held = [false,false,false,false];
let pularPedido = false, ultPedido = false;
let mouse = {x:0,y:0,down:false};
const joy = {id:null, ox:0, oy:0, dx:0, dy:0};
const tem = (lista, k) => lista.includes(k);
addEventListener('keydown', e => {
  const k = e.key.toLowerCase(); keys[k] = true;
  if (G && !G.over) {
    CONTROLES.golpes.forEach((lista,i) => { if (tem(lista,k)) held[i] = true; });
    if (tem(CONTROLES.pular,k) && !e.repeat) pularPedido = true;
    if (tem(CONTROLES.ultimate,k) && !e.repeat) ultPedido = performance.now();
    if (tem(CONTROLES.pausar,k)) togglePause();
  }
  if ([' ','arrowup','arrowdown','arrowleft','arrowright'].includes(k)) e.preventDefault();
});
addEventListener('keyup', e => { const k = e.key.toLowerCase(); keys[k] = false; CONTROLES.golpes.forEach((lista,i) => { if (tem(lista,k)) held[i] = false; }); });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; held.fill(false); mouse.down = false; });
cv.addEventListener('mousemove', e => { mouse.x = e.clientX; mouse.y = e.clientY; });
cv.addEventListener('mousedown', e => { if (e.button === 0) mouse.down = true; if (e.button === 2) pularPedido = true; });
addEventListener('mouseup', () => mouse.down = false);
cv.addEventListener('contextmenu', e => e.preventDefault());
const joyEl = $('#joy'), joyB = $('#joyB'), joyK = $('#joyK');
joyEl.addEventListener('pointerdown', e => {
  if (e.pointerType === 'mouse') return;
  joy.id = e.pointerId; joy.ox = e.clientX; joy.oy = e.clientY; joy.dx = joy.dy = 0;
  joyB.style.display = 'block'; joyB.style.left = e.clientX+'px'; joyB.style.top = (e.clientY - joyEl.getBoundingClientRect().top)+'px';
  joyK.style.transform = 'translate(-50%,-50%)';
  joyEl.setPointerCapture(e.pointerId);
});
joyEl.addEventListener('pointermove', e => {
  if (e.pointerId !== joy.id) return;
  let dx = e.clientX - joy.ox, dy = e.clientY - joy.oy; const d = Math.hypot(dx,dy), max = 50;
  if (d > max) { dx = dx/d*max; dy = dy/d*max; }
  joy.dx = dx/max; joy.dy = dy/max;
  joyK.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
});
const joyEnd = e => { if (e.pointerId !== joy.id) return; joy.id = null; joy.dx = joy.dy = 0; joyB.style.display = 'none'; };
joyEl.addEventListener('pointerup', joyEnd); joyEl.addEventListener('pointercancel', joyEnd);
if (!isTouch) joyEl.style.display = 'none';
$('#jumpBtn').addEventListener('pointerdown', e => { e.preventDefault(); pularPedido = true; });
$('#ultBtn').addEventListener('pointerdown', e => { e.preventDefault(); ultPedido = performance.now(); });

// Lê teclado/mouse/toque do jogador 1 e devolve o que ele quer fazer neste quadro
function lerEntradaJogador(me, foe){
  let mx = 0, my = 0;
  const k = lista => lista.some(x => keys[x]);
  if (k(CONTROLES.esquerda)) mx -= 1; if (k(CONTROLES.direita)) mx += 1;
  if (k(CONTROLES.cima)) my -= 1;     if (k(CONTROLES.baixo)) my += 1;
  if (joy.id !== null) { mx = joy.dx; my = joy.dy; }
  const ml = Math.hypot(mx,my); if (ml > 1) { mx /= ml; my /= ml; }
  let aim, tx, ty;
  if (isTouch || S.aim === 'auto') {
    if (foe) { aim = Math.atan2(foe.y-me.y, foe.x-me.x); tx = foe.x; ty = foe.y; }
    else { aim = ml > .2 ? Math.atan2(my,mx) : me.aim; tx = me.x + Math.cos(aim)*200; ty = me.y + Math.sin(aim)*200; }
  } else {
    const w = screenToWorld(mouse.x, mouse.y); aim = Math.atan2(w.y-me.y, w.x-me.x); tx = w.x; ty = w.y;
  }
  const golpes = held.slice();
  if (mouse.down && !isTouch && CONTROLES.golpeDoMouse >= 0) golpes[CONTROLES.golpeDoMouse] = true;
  const pular = pularPedido; pularPedido = false;
  return {mx, my, aim, tx, ty, golpes, pular};
}

/* ----- HUD ----- */
function buildHud(){
  const pt = (f,i,ti) => `<div class="pt" data-i="${i}" data-t="${ti}">${sprHTML(f.p,40)}<div class="hp"><i></i></div><div class="en"><i></i></div><div class="sw"></div></div>`;
  $('#hudL').innerHTML = G.teams[0].f.map((f,i) => pt(f,i,0)).join('');
  $('#hudR').innerHTML = G.teams[1].f.map((f,i) => pt(f,i,1)).join('');
  $('#hudL').querySelectorAll('.pt').forEach(el => el.onclick = () => playerSwitch(+el.dataset.i));
  $('#timer').onclick = togglePause;
  $('#jumpBtn .key').textContent = CONTROLES.pular[0] === ' ' ? 'ESPAÇO' : CONTROLES.pular[0].toUpperCase();
  $('#ultBtn .key').textContent = CONTROLES.ultimate[0].toUpperCase();
  buildMoves();
}
let movesFor = null;
function buildMoves(){
  const f = active(0); movesFor = f;
  if (!f) { $('#moves').innerHTML = ''; return; }
  const keysLbl = CONTROLES.golpes.map((l,i) => l[0].toUpperCase() + (i === CONTROLES.golpeDoMouse ? ' / 🖱' : ''));
  $('#moves').innerHTML = f.moves.map((m,i) => `<button class="mb" data-i="${i}">
      <span class="ty" style="background:${TYPES[m.t][1]}"></span>
      <span class="n">${m.n}</span><span class="k">${TYPES[m.t][0]} · ${KIND_PT[m.k]}</span>
      <span class="key">${keysLbl[i]}</span><div class="cd"></div><div class="cdt"></div></button>`).join('');
  $('#moves').querySelectorAll('.mb').forEach(b => {
    const i = +b.dataset.i;
    b.addEventListener('pointerdown', e => { e.preventDefault(); held[i] = true; b.setPointerCapture(e.pointerId); });
    const up = () => held[i] = false;
    b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up); b.addEventListener('lostpointercapture', up);
  });
  $('#ultBtn .nm').textContent = f.ult.nome;
  $('#ultBtn').style.setProperty('--uc', TC(f.ult.t));
}
function updateHud(){
  for (const ti of [0,1]) {
    const t = G.teams[ti], els = (ti ? $('#hudR') : $('#hudL')).children;
    t.f.forEach((f,i) => {
      const el = els[i]; if (!el) return;
      el.classList.toggle('act', t.a === i); el.classList.toggle('dead', !f.alive);
      const r = f.hp/f.maxhp; const bar = el.querySelector('.hp i');
      bar.style.width = (r*100)+'%'; bar.style.background = r > .5 ? '#3ddc84' : r > .2 ? '#ffd23f' : '#ff4d6a';
      el.querySelector('.en i').style.width = f.en + '%';
      if (ti === 0) { const sw = el.querySelector('.sw'); const showSw = t.sw > 0 && f.alive && t.a !== i;
        sw.style.display = showSw ? 'flex' : 'none'; if (showSw) sw.textContent = Math.ceil(t.sw); }
    });
  }
  const s = Math.max(0, Math.ceil(G.time));
  $('#timer').textContent = G.paused && G.started && !G.over ? '❚❚' : `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;
  $('#timer').classList.toggle('low', s <= 20 && !G.over);
  const f = active(0);
  if (f !== movesFor) buildMoves();
  if (f) {
    $('#moves').querySelectorAll('.mb').forEach((b,i) => {
      const m = f.moves[i], c = f.cds[i];
      b.querySelector('.cd').style.height = (c > 0 ? c/m.cd*100 : 0) + '%';
      b.querySelector('.cdt').textContent = c > 0 ? (c >= 1 ? Math.ceil(c) : c.toFixed(1)) : '';
    });
    $('#jumpBtn .cd').style.height = (f.jumpCd > 0 ? f.jumpCd/2.2*100 : 0) + '%';
    $('#ultBtn .fill').style.height = f.en + '%';
    $('#ultBtn').classList.toggle('ready', f.en >= 100);
  }
  const bf = $('#buffs'); let h = '';
  if (f) { if (f.bAtk > 0) h += `<span style="background:#ff4d6a">⚔ ${Math.ceil(f.bAtk)}s</span>`; if (f.bSpd > 0) h += `<span style="background:#e0a800">➤ ${Math.ceil(f.bSpd)}s</span>`;
    if (f.shield) h += `<span style="background:#3aa8c8">⛨</span>`; if (f.hidden) h += `<span style="background:#2e6b1f">🌿 escondido</span>`;
    if (f.mk.molhado > 0) h += `<span style="background:#2a72c7">💧 molhado</span>`; if (f.mk.frio > 0) h += `<span style="background:#5fb4d6">❄ gelado</span>`; if (f.mk.congelado > 0) h += `<span style="background:#7fd6ff;color:#063040">🧊 congelado</span>`; }
  if (bf.innerHTML !== h) bf.innerHTML = h;
}
function playerSwitch(i){
  if (!G || G.over || G.paused) return;
  const t = G.teams[0], cur = active(0), f = t.f[i];
  if (!cur || !f.alive || t.a === i || t.sw > 0 || cur.dash || cur.windup || cur.leap || cur.jump || cur.rush) return;
  switchTo(0, i);
}
function togglePause(){
  if (!G || G.over || !G.started) return;
  G.paused = !G.paused;
  if (G.paused) {
    openModal(`<div class="dname" style="text-align:center">PAUSADO</div>
      <p class="hint" style="margin-top:8px">📍 ${MAP.nome}: ${MAP.mecanica}</p>
      <div class="row" style="margin-top:12px"><button class="smbtn" id="pSom">${S.som ? '🔊 Som ligado' : '🔇 Som desligado'}</button><button class="smbtn" id="pMus">${S.musica ? '🎵 Música ligada' : '🎵 Música desligada'}</button></div>
      <div class="mfoot"><button class="smbtn" id="pQuit">Sair para o menu</button><button class="smbtn go" id="pGo">Continuar</button></div>`);
    $('#pGo').onclick = togglePause; $('#pQuit').onclick = quitBattle;
    $('#pSom').onclick = () => { S.som = !S.som; save(); $('#pSom').textContent = S.som ? '🔊 Som ligado' : '🔇 Som desligado'; paintAudio(); };
    $('#pMus').onclick = () => { S.musica = !S.musica; save(); $('#pMus').textContent = S.musica ? '🎵 Música ligada' : '🎵 Música desligada'; paintAudio(); };
  } else closeModal();
}
function quitBattle(){ G = null; closeModal(); held.fill(false); show('home'); renderHome(); }

/* ----- Física / colisão ----- */
function pushOut(f){
  for (const p of OBST) { if (!solid(p)) continue;
    const dx = f.x-p.x, dy = f.y-p.y, d = Math.hypot(dx,dy) || 1, min = p.r+f.r;
    if (d < min) { f.x = p.x + dx/d*min; f.y = p.y + dy/d*min; }
  }
  const bx = clamp(f.x, f.r+14, W-f.r-14), by = clamp(f.y, f.r+14, H-f.r-14);
  const hitWall = bx !== f.x || by !== f.y; f.x = bx; f.y = by; return hitWall;
}
// impede quem não voa de entrar no abismo (volta para a posição anterior, deslizando pela borda)
function evitarAbismo(f, ox, oy){
  if (voa(f) || terrainAt(f.x, f.y) !== 'abismo') return false;
  const nx = f.x, ny = f.y;
  if (terrainAt(nx, oy) !== 'abismo') { f.y = oy; return true; }
  if (terrainAt(ox, ny) !== 'abismo') { f.x = ox; return true; }
  f.x = ox; f.y = oy; return true;
}
function rayCircle(ox,oy,dx,dy,cx,cy,r){
  const fx = ox-cx, fy = oy-cy, b = fx*dx+fy*dy, c = fx*fx+fy*fy-r*r, disc = b*b-c;
  if (disc < 0) return Infinity;
  const t = -b - Math.sqrt(disc);
  return t >= 0 ? t : (c < 0 ? 0 : Infinity);
}
function rayHit(ox,oy,a,max){
  const dx = Math.cos(a), dy = Math.sin(a); let t = max, o = null;
  for (const p of OBST) { if (!solid(p)) continue; const tt = rayCircle(ox,oy,dx,dy,p.x,p.y,p.r); if (tt < t) { t = tt; o = p; } }
  return {t, o};
}
const rayLimit = (ox,oy,a,max) => rayHit(ox,oy,a,max).t;
function clearShot(a, b){ const ang = Math.atan2(b.y-a.y, b.x-a.x), d = Math.hypot(b.x-a.x,b.y-a.y); return rayLimit(a.x,a.y,ang,d) >= d - b.r; }
function moveRange(m){ return {proj:m.range,multi:m.range,beam:m.range,zone:m.range,pool:m.range,nova:m.radius,melee:m.range,dash:m.dist+40,leap:m.range,heal:1e9,buff:1e9}[m.k]; }
function freeSpot(){
  for (let i=0;i<60;i++){ const x = rand(420, W-420), y = rand(140, H-140);
    if (OBST.some(o => solid(o) && Math.hypot(o.x-x, o.y-y) < o.r + 40)) continue;
    const tr = terrainAt(x, y); if (tr === 'lava' || tr === 'agua' || tr === 'abismo' || tr === 'agua_escura' || tr === 'veneno') continue;
    return {x, y}; }
  return {x:W/2, y:H/2 - 200};
}

/* ----- Objetos interativos ----- */
function damageObst(o, amt, att, m){
  o = o.pai || o; const d = OBJ[o.tipo]; if (!d || o.dead) return;
  if (d.interruptor) { if (o.cd > 0) return; o.cd = d.cd; acionarAlavanca(o); return; }
  if (!d.hp) return;
  if (d.queima && m && m.t === 'fire') amt *= 3;
  o.hp -= amt; o.hitT = .15;
  burst(m ? m.t : 'normal', o.x, o.y - o.r, 4, .6);
  if (o.hp <= 0) quebrarObst(o, att);
}
function quebrarObst(o, att){
  const d = OBJ[o.tipo]; o.dead = true; o.respawnT = d.respawn || 25;
  const cor = {cristal:'#9fe2ff', pedra:'#8f8577', madeira:'#9a6a3a', metal:'#c8ccd6', esporo:'#b07ae0'}[d.quebra] || '#cccccc';
  for (let i=0;i<22;i++) P({kind:d.quebra === 'cristal' ? 'shard' : d.quebra === 'esporo' ? 'smoke' : 'rock', x:o.x+rand(-o.r,o.r), y:o.y-rand(0,o.r*1.5), vx:rand(-220,220), vy:rand(-300,-60), grav:d.quebra === 'esporo' ? 0 : 800, t:rand(.5,.9), size:rand(4,9), col:cor, rot:rand(0,7), vr:rand(-9,9)});
  sfx(d.quebra === 'cristal' ? 'shatter' : 'land');
  if (d.solta === 'energia') G.items.push({x:o.x, y:o.y, kind:'energia', t:0});
  if (d.solta === 'sorteio' && Math.random() < .5) G.items.push({x:o.x, y:o.y, kind:SORTEIO_ITENS[Math.floor(Math.random()*SORTEIO_ITENS.length)], t:0});
  if (d.explode) { const e = d.explode, m = {n:'Explosão', t:e.t, k:'nova', p:e.p, radius:e.r, burn:.4};
    hitNature(o.x, o.y, e.r, m);
    G.waves.push({x:o.x, y:o.y, r:20, max:e.r, t:.45, maxT:.45, type:e.t, col:TC(e.t)});
    burst(e.t, o.x, o.y - 20, 30, 1.5); P({kind:'impact', x:o.x, y:o.y-20, col:'#ffffff', t:.22, size:e.r, rot:0});
    G.decals.push({k:'scorch', x:o.x, y:o.y, r:e.r*.8, t:8, max:8, seed:Math.random()}); shake(12); sfx('boom');
    for (const q of OBST) if (q !== o && !q.filho && solid(q) && Math.hypot(q.x-o.x, q.y-o.y) < e.r + q.r) G.sched.push({t:.15, fn:() => damageObst(q, 60, NAT, m)}); }
  if (d.campo) { G.fields.push({x:o.x, y:o.y, r:d.campo.r, t:d.campo.dur, tick:0}); sfx('thunder'); G.flash = .15; }
  if (d.esporos) { const m = {n:'Esporos', t:'poison', k:'nova', p:20, radius:d.esporos.r, poison:1, slow:.8};
    hitNature(o.x, o.y, d.esporos.r, m); for (let i=0;i<26;i++) P({kind:'smoke', x:o.x+rand(-40,40), y:o.y-rand(0,30), vx:rand(-120,120), vy:rand(-80,10), t:rand(.8,1.3), size:rand(14,24), col:'#8a4ab0'}); }
}
function acionarAlavanca(o){
  const ladoDireito = o.x < W/2;
  const x0 = ladoDireito ? W/2 + 60 : 60, x1 = ladoDireito ? W - 60 : W/2 - 60;
  for (let i=0;i<3;i++){ const y = 200 + i*350 + rand(-40,40); G.traps.push({x1:x0, y1:y, x2:x1, y2:y + rand(-60,60), t:1.1, max:1.1}); }
  banner('Armadilha acionada!', 'Espinhos no lado ' + (ladoDireito ? 'direito' : 'esquerdo'), '#ff8a3d'); sfx('trap');
}
function hitObstArea(x, y, r, att, m){
  for (const o of OBST) if (!o.filho && solid(o) && OBJ[o.tipo] && Math.hypot(o.x-x, o.y-y) < r + o.r) damageObst(o, m.p*.6, att, m);
}

/* ----- Fogo no mato e vinhas (interações do cenário) ----- */
function igniteAt(x, y, team){
  for (const v of G.vines) if (Math.hypot(v.x-x, v.y-y) < v.r) { // COMBO: Planta + Fogo
    G.vines.splice(G.vines.indexOf(v), 1);
    G.fires.push({x:v.x, y:v.y, r:v.r*1.15, t:5, max:5, tick:0, team});
    comboBanner(null, 'Incêndio!', '#ff8a3d', v.x, v.y); return; }
  const t = terrainAt(x, y);
  if (t === 'mato') { G.fires.push({x, y, r:85, t:5, max:5, tick:0, team}); G.burnt.push({x, y, r:95, t:25}); floatText(x, y-30, 'O mato pegou fogo!', '#ff8a3d', 14); }
}
function comboBanner(att, nome, col, x, y){
  floatText(x, y - 110, 'COMBO! ' + nome, col, 22);
  if (att && att.team >= 0) { att.en = Math.min(100, att.en + 10); G.stats.combos[att.team]++; }
  P({kind:'ring', x, y:y-30, col, t:.4, size:10, size2:110, vx:0, vy:0}); sfx('combo');
}

/* ----- Dano ----- */
function hit(att, def, m, mult=1){
  if (!def || !def.alive) return;
  if (def.air) { if (def.jump && def.jump.t < .25 && !def.jump.perf && att.team !== def.team) perfectDodge(def); return; }
  if (def.inv > 0) return;
  const e = effectiveness(m.t, def.p.types);
  const stab = att.p.types.includes(m.t) ? 1.25 : 1;
  const dm = att.team === 1 ? G.diff.mul : 1;
  if (e === 0) { floatText(def.x, def.y-60, 'Não afeta…', '#ccc', 14); return; }
  if (def.shield) { def.shield = false; floatText(def.x, def.y-def.topH-20, 'Bloqueado!', '#9cf0ff', 17); P({kind:'ring', x:def.x, y:def.y-HGT, col:'#9cf0ff', t:.35, size:20, size2:70, vx:0, vy:0}); sfx('block'); return; }
  // combos
  let cm = 1;
  if (m.t === 'electric' && def.mk.molhado > 0) { cm = 1.5; def.mk.molhado = 0; def.st.stun = Math.max(def.st.stun, .9); comboBanner(att, 'Eletrocutado!', '#ffe14d', def.x, def.y);
    for (let i=0;i<6;i++){ const a = i/6*Math.PI*2; P({kind:'bolt', x:0, y:0, pts:zig(def.x, def.y-30, def.x+Math.cos(a)*70, def.y-30+Math.sin(a)*50, 5, 12), t:.25, col:'#ffe14d', vx:0, vy:0, size:3}); } }
  else if ((m.t === 'water' && def.mk.frio > 0) || (m.t === 'ice' && def.mk.molhado > 0)) { cm = 1.15; def.mk.frio = def.mk.molhado = 0; def.mk.congelado = 1.4; comboBanner(att, 'Congelado!', '#9fe8ff', def.x, def.y); }
  else if (def.mk.congelado > 0 && (['melee','dash','leap'].includes(m.k) || ['rock','fighting','steel'].includes(m.t))) { cm = 1.6; def.mk.congelado = 0; comboBanner(att, 'Estilhaçar!', '#bfeaff', def.x, def.y);
    for (let i=0;i<20;i++) part('shard','ice', def.x, def.y-30, 1.6); sfx('shatter'); }
  else if (m.t === 'flying' && def.st.burn > 0) { cm = 1.4; comboBanner(att, 'Tornado de Fogo!', '#ff8a3d', def.x, def.y); G.fires.push({x:def.x, y:def.y, r:90, t:4, max:4, tick:0, team:att.team}); }
  // clima
  let clima = 1;
  if (MAP.clima === 'chuva') clima = m.t === 'water' ? 1.2 : m.t === 'fire' ? .8 : 1;
  const crit = Math.random() < .0625;
  const boost = att.bAtk > 0 ? 1.4 : 1;
  const dmg = Math.max(1, Math.round(m.p * (att.p.atk/def.p.def) * .42 * stab * e * rand(.9,1) * mult * dm * boost * cm * clima * (crit ? 1.5 : 1)));
  def.hp -= dmg; def.flash = .12; def.hurtT = .25;
  if (!def.windup && !def.dash && !(def.act && def.act.atk)) setAct(def, 'Hurt', .3);
  if (att.team >= 0) { G.stats.dealt[att.team] += dmg; att.dmg += dmg; att.en = Math.min(100, att.en + dmg/def.maxhp*70); }
  def.en = Math.min(100, def.en + dmg/def.maxhp*35);
  if (!cm || cm === 1) { if (m.t === 'water') def.mk.molhado = 4; if (m.t === 'ice') def.mk.frio = 4; }
  impact(def.x, def.y - HGT, m.t, e > 1 || m.p >= 100 || crit);
  sfx(crit ? 'crit' : e > 1 ? 'super' : 'hit');
  floatText(def.x + rand(-14,14), def.y-50, dmg, crit ? '#ff8a3d' : e > 1 ? '#ffd23f' : e < 1 ? '#c8cbe0' : '#fff', crit || e > 1 ? 30 : 22);
  if (crit) floatText(def.x, def.y-def.topH-46, 'Crítico!', '#ff8a3d', 16);
  if (e > 1) { floatText(def.x, def.y-def.topH-26, 'Super efetivo!', '#ffd23f', 15); G.flash = Math.max(G.flash, .12); }
  else if (e < 1) floatText(def.x, def.y-def.topH-26, 'Pouco efetivo', '#aab', 12);
  const roll = () => Math.random();
  if (m.burn && roll() < m.burn * (MAP.clima === 'chuva' ? .5 : 1)) { def.st.burn = 3; floatText(def.x, def.y+44, 'Queimado!', '#ff8c3a', 13); }
  if (m.poison && roll() < m.poison) { def.st.poison = 4; floatText(def.x, def.y+44, 'Envenenado!', '#c06ad6', 13); }
  if (m.slow && roll() < m.slow) def.st.slow = 2;
  if (m.stun && roll() < m.stun) { def.st.stun = .6; floatText(def.x, def.y+44, 'Paralisado!', '#ffe14d', 13); }
  if (m.drain && att.team >= 0) { heal(att, dmg*m.drain); for (let i=0;i<8;i++) P({kind:'glow', x:def.x+rand(-15,15), y:def.y-HGT+rand(-15,15), vx:(att.x-def.x)*2, vy:(att.y-def.y)*2, t:.45, size:8, col:'#7AC74C'}); }
  if (m.recoil && att.team >= 0) { att.hp -= Math.round(dmg*m.recoil); att.hurtT = .2; if (att.hp <= 0) faint(att); }
  const ka = Math.atan2(def.y-att.y, def.x-att.x), kb = m.p >= 100 ? 26 : 12;
  if (!def.dash && !def.mk.congelado) { const ox = def.x, oy = def.y; def.x += Math.cos(ka)*kb; def.y += Math.sin(ka)*kb; pushOut(def); evitarAbismo(def, ox, oy); }
  if (MAP.id === 'estadio') G.hype = Math.max(G.hype, .6);
  shake(att.team === 0 ? 3 : 2);
  if (def.hp <= 0) { if (att.team >= 0) att.en = Math.min(100, att.en + 20); faint(def); }
}
function perfectDodge(f){
  f.jump.perf = true;
  f.cds = f.cds.map(c => c*.5); f.en = Math.min(100, f.en + 15);
  G.slowT = Math.max(G.slowT, .3); G.stats.perfeitas[f.team]++;
  floatText(f.x, f.y - f.topH - 40, 'Esquiva Perfeita!', '#7cf0ff', 19);
  P({kind:'ring', x:f.x, y:f.y-30, col:'#7cf0ff', t:.4, size:20, size2:90, vx:0, vy:0});
  for (let i=0;i<12;i++) P({kind:'star', x:f.x, y:f.y-30, vx:rand(-200,200), vy:rand(-200,200), t:.4, size:7, col:'#bff6ff', rot:0, vr:5});
  sfx('perfeita');
}
function heal(f, amt){
  const before = f.hp; f.hp = Math.min(f.maxhp, f.hp + amt); const d = Math.round(f.hp-before);
  if (d > 0) floatText(f.x, f.y-f.topH-20, '+'+d, '#3ddc84', 20);
  for (let i=0;i<10;i++) P({kind:'plus', x:f.x+rand(-26,26), y:f.y+rand(-50,10), vx:0, vy:-rand(40,90), t:rand(.5,.9), size:rand(4,7), col:'#5dff9e'});
}
function hitCircle(x,y,r,att,m){
  const e = active(1-att.team);
  if (e && Math.hypot(e.x-x, e.y-y) < r + e.r) hit(att, e, m);
  hitObstArea(x, y, r, att, m);
  if (m.t === 'fire') igniteAt(x, y, att.team);
  if (m.t === 'grass' && (m.k === 'zone' || m.k === 'nova')) G.vines.push({x, y, r:Math.min(140, r), t:6, max:6, team:att.team});
}
function hitNature(x, y, r, m){
  NAT.x = x; NAT.y = y;
  for (const ti of [0,1]) { const e = active(ti); if (e && Math.hypot(e.x-x, e.y-y) < r + e.r) hit(NAT, e, m); }
  hitObstArea(x, y, r, NAT, m);
}
function faint(f){
  if (!f.alive) return;
  f.alive = false; f.hp = 0; f.windup = null; f.dash = null; f.leap = null; f.jump = null; f.rush = null; f.air = false;
  const t = G.teams[f.team];
  G.stats.ko[1-f.team]++;
  G.dying.push({f, t:0, x:f.x, y:f.y, dir:f.dir});
  burst('normal', f.x, f.y-30, 24, 1.3);
  P({kind:'ring', x:f.x, y:f.y-20, col:'#ffffff', t:.5, size:10, size2:110, vx:0, vy:0});
  floatText(f.x, f.y-80, f.p.name + ' desmaiou!', '#ff7b8f', 17);
  shake(6); sfx('faint');
  if (MAP.id === 'estadio') { G.hype = 3; sfx('cheer'); }
  t.a = -1; t.pend = 1.4; t.last = [f.x, f.y];
  G.proj = G.proj.filter(p => p.owner !== f);
}

/* ----- Animação do sprite ----- */
function setAct(f, name, maxDur, atk){
  const info = animInfo(f.p.id, name);
  const total = info ? info[4].reduce((s,v) => s+v, 0)/60 : .3;
  const now = performance.now()/1000;
  f.act = {name, start:now, end:now + Math.min(total, maxDur || total), atk:!!atk};
  if (atk) f.atkT = .22;
}

/* ----- Usar golpes ----- */
function podeAgir(f){ return f.alive && f.st.stun <= 0 && f.mk.congelado <= 0 && !f.dash && !f.windup && !f.jump && !f.leap && !f.rush; }
function useMove(f, i, a, tx, ty){
  const m = f.moves[i];
  if (f.cds[i] > 0 || !podeAgir(f)) return false;
  f.cds[i] = m.cd; f.aim = a; f.dir = a; f.reveal = 1.2;
  f.label = m.n.toUpperCase(); f.labelT = 1.1; f.lastMove = {t:m.t, at:G.clock};
  const sx = f.x + Math.cos(a)*f.r, sy = f.y + Math.sin(a)*f.r;
  P({kind:'glow', x:sx, y:sy-HGT, vx:0, vy:0, t:.18, size:26, col:TC(m.t)});
  const anim = {melee:'Strike', proj:'Shoot', multi:'Shoot', beam:'Shoot', zone:'Shoot', pool:'Shoot', nova:'Rotate', heal:'Charge', buff:'Charge'}[m.k];
  if (anim && !(m.k === 'beam' && m.windup)) setAct(f, animInfo(f.p.id, anim) ? anim : 'Attack', .55, true);
  switch (m.k) {
    case 'proj': spawnProj(f, m, sx, sy, a); sfx('shoot'); break;
    case 'multi': for (let k=0;k<m.count;k++) spawnProj(f, m, sx, sy, a + (m.count>1 ? (k/(m.count-1)-.5)*m.spread*2 : 0)); sfx('shoot'); break;
    case 'beam': if (m.windup) { f.windup = {t:m.windup, max:m.windup, i, a}; sfx('charge'); } else fireBeam(f, m, a); break;
    case 'nova': doNova(f, m); break;
    case 'melee': {
      const e = active(1-f.team);
      if (e) { const d = Math.hypot(e.x-f.x, e.y-f.y); if (d < m.range + e.r && Math.abs(angDiff(Math.atan2(e.y-f.y,e.x-f.x), a)) < m.arc/2) hit(f, e, m); }
      for (const o of OBST) if (!o.filho && solid(o) && OBJ[o.tipo] && Math.hypot(o.x-f.x, o.y-f.y) < m.range + o.r && Math.abs(angDiff(Math.atan2(o.y-f.y, o.x-f.x), a)) < m.arc/2) damageObst(o, m.p*.6, f, m);
      if (m.t === 'fire') igniteAt(f.x + Math.cos(a)*m.range*.7, f.y + Math.sin(a)*m.range*.7, f.team);
      const style = m.t === 'dark' || m.n === 'Poison Fang' || m.n === 'Lick' || m.n === 'Fire Fang' ? 'fang' : (m.t === 'fighting' || m.t === 'steel' || m.n === 'Ice Punch') ? 'punch' : m.n === 'X-Scissor' ? 'cross' : 'slash';
      G.slashes.push({x:f.x, y:f.y-HGT, a, r:m.range, t:.26, max:.26, style, type:m.t});
      sfx('swing'); break;
    }
    case 'dash': f.dash = {a, left:m.dist, m, hit:false}; for (let k=0;k<10;k++) part('dust','ground', f.x, f.y+FOOT); sfx('dash'); break;
    case 'zone': case 'pool': {
      let dx = tx-f.x, dy = ty-f.y; const d = Math.hypot(dx,dy);
      if (d > m.range) { tx = f.x + dx/d*m.range; ty = f.y + dy/d*m.range; }
      if (m.k === 'zone') { G.zones.push({x:tx, y:ty, r:m.radius, t:m.delay, max:m.delay, owner:f, m}); sfx('shoot'); }
      else { G.pools.push({x:tx, y:ty, r:m.radius, t:m.dur, max:m.dur, tick:0, owner:f, m}); burst(m.t, tx, ty, 14); sfx('swing');
        if (m.t === 'grass') G.vines.push({x:tx, y:ty, r:m.radius, t:6, max:6, team:f.team}); }
      break;
    }
    case 'leap': {
      let dx = tx-f.x, dy = ty-f.y; const d = Math.hypot(dx,dy);
      if (d > m.range) { tx = f.x + dx/d*m.range; ty = f.y + dy/d*m.range; }
      tx = clamp(tx, 40, W-40); ty = clamp(ty, 40, H-40);
      f.leap = {sx:f.x, sy:f.y, tx, ty, t:0, dur:.7, m}; f.air = true;
      G.zones.push({x:tx, y:ty, r:m.radius, t:.7, max:.7, owner:f, m, marker:true});
      for (let k=0;k<12;k++) part('dust','ground', f.x, f.y+FOOT); sfx('jump'); break;
    }
    case 'heal': heal(f, f.maxhp*m.amount); G.waves.push({x:f.x, y:f.y, r:10, max:80, t:.5, maxT:.5, type:'grass', col:'#5dff9e'}); sfx('heal'); break;
    case 'buff':
      if (m.atk) f.bAtk = Math.max(f.bAtk, m.dur);
      if (m.spd) f.bSpd = Math.max(f.bSpd, m.dur);
      if (m.healPct) heal(f, f.maxhp*m.healPct);
      floatText(f.x, f.y-f.topH-24, m.atk && m.spd ? 'Ataque e Velocidade ↑' : m.atk ? 'Ataque ↑' : 'Velocidade ↑', '#ff8a8a', 15);
      for (let k=0;k<16;k++) P({kind:'flame', x:f.x+rand(-24,24), y:f.y+FOOT-rand(0,10), vx:0, vy:-rand(80,160), t:rand(.4,.7), size:rand(8,13), col:k%2 ? TC(m.t) : '#ff6a6a'});
      G.waves.push({x:f.x, y:f.y, r:10, max:90, t:.45, maxT:.45, type:m.t, col:TC(m.t)}); sfx('buff');
      break;
  }
  return true;
}
function doJump(f, a){
  if (f.jumpCd > 0 || f.air || f.dash || f.windup || f.leap || f.rush || f.st.stun > 0 || f.mk.congelado > 0 || !f.alive) return false;
  f.jump = {t:0, dur:.42, a}; f.jumpCd = 2.2; f.air = true; f.dir = a;
  for (let k=0;k<8;k++) part('dust','ground', f.x, f.y+FOOT);
  sfx('jump'); return true;
}
function spawnProj(f, m, x, y, a){
  G.proj.push({x, y, vx:Math.cos(a)*m.speed, vy:Math.sin(a)*m.speed, r:m.r, dist:0, owner:f, m, type:m.t, rot:rand(0,7), seed:rand(0,100)});
}
function fireBeam(f, m, a){
  const rh = rayHit(f.x, f.y, a, m.range), len = rh.t;
  const e = active(1-f.team);
  setAct(f, animInfo(f.p.id,'Shoot') ? 'Shoot' : 'Attack', .5, true);
  if (e) {
    const dx = Math.cos(a), dy = Math.sin(a), ex = e.x-f.x, ey = e.y-f.y;
    const t = ex*dx + ey*dy, perp = Math.abs(ex*dy - ey*dx);
    if (t > 0 && t < len + e.r && perp < m.w/2 + e.r) hit(f, e, m);
  }
  if (rh.o) damageObst(rh.o, m.p*.6, f, m);
  G.beams.push({x:f.x, y:f.y, a, len, w:m.w, t:.4, max:.4, type:m.t});
  const ex2 = f.x + Math.cos(a)*len, ey2 = f.y + Math.sin(a)*len;
  for (let i=0;i<24;i++){ const k = Math.random(); part(TFX[m.t].trail, m.t, f.x + Math.cos(a)*len*k, f.y + Math.sin(a)*len*k - HGT, .8); }
  if (m.t === 'fire') for (let k=.3;k<=1;k+=.35) igniteAt(f.x + Math.cos(a)*len*k, f.y + Math.sin(a)*len*k, f.team);
  burst(m.t, ex2, ey2 - HGT, 14, 1.2);
  shake(m.w > 25 ? 8 : 3); sfx('beam');
}
function doNova(f, m, x, y){
  x = x ?? f.x; y = y ?? f.y;
  hitCircle(x, y, m.radius, f, m);
  G.waves.push({x, y, r:f.r, max:m.radius, t:.45, maxT:.45, type:m.t, col:TC(m.t)});
  G.waves.push({x, y, r:f.r, max:m.radius*.7, t:.35, maxT:.35, type:m.t, col:C2(m.t)});
  const n = FX_LEVE() ? 14 : 28;
  for (let i=0;i<n;i++){ const a = i/n*Math.PI*2, s = m.radius*2.4; const kind = TFX[m.t].burst[i%TFX[m.t].burst.length];
    const p0 = G.parts.length; part(kind, m.t, x + Math.cos(a)*20, y + Math.sin(a)*12 - 10, 1); const p = G.parts[p0];
    if (p && kind !== 'bolt') { p.vx = Math.cos(a)*s*rand(.7,1); p.vy = Math.sin(a)*s*.6*rand(.7,1); } }
  if (m.t === 'electric') for (let i=0;i<8;i++){ const a = i/8*Math.PI*2 + rand(-.2,.2); P({kind:'bolt', x:0, y:0, pts:zig(x, y-HGT, x+Math.cos(a)*m.radius, y+Math.sin(a)*m.radius*.7-HGT, 7, 14), t:.2, col:TC(m.t), vx:0, vy:0, size:3}); }
  if (m.t === 'ground' || m.t === 'rock' || m.t === 'steel') { G.decals.push({k:'crack', x, y:y+FOOT, r:m.radius*.8, t:6, max:6, seed:Math.random()}); for (let i=0;i<14;i++) part('rock', 'ground', x+rand(-m.radius,m.radius)*.6, y+rand(-30,30)); }
  if (m.t === 'water') for (let i=0;i<20;i++) part('drop','water', x + rand(-m.radius, m.radius)*.8, y + rand(-m.radius,m.radius)*.5);
  shake(m.radius > 180 ? 10 : 5); sfx('boom');
}
function detonateZone(z){
  if (z.marker) return;
  const t = z.m.t;
  if (z.owner.alive || z.owner.team === -1) hitCircle(z.x, z.y, z.r, z.owner, z.m);
  G.waves.push({x:z.x, y:z.y, r:z.r*.2, max:z.r*1.15, t:.4, maxT:.4, type:t, col:TC(t)});
  burst(t, z.x, z.y-10, 26, 1.3);
  P({kind:'impact', x:z.x, y:z.y-20, col:'#ffffff', t:.2, size:z.r*.9, rot:0});
  if (t === 'electric') { for (let k=0;k<3;k++) G.strikes.push({pts:zig(z.x+rand(-20,20), z.y-700, z.x+rand(-10,10), z.y, 14, 30), t:.3, max:.3, col:TC(t)}); G.flash = .25; }
  if (t === 'rock' || t === 'ground' || t === 'ice') for (let i=0;i<9;i++){ const a = i/9*Math.PI*2; P({kind:'spike', x:z.x+Math.cos(a)*z.r*.55, y:z.y+Math.sin(a)*z.r*.35, t:.6, size:rand(14,22), col:t==='rock'?'#a8946a':t==='ice'?'#bfeaff':'#c9a35a', vx:0, vy:0}); }
  if (t === 'fire' || t === 'dragon') for (let arm=0; arm<5; arm++){ const a = arm/5*Math.PI*2 - Math.PI/2; for (let k=0;k<8;k++){ P({kind:'flame', x:z.x+Math.cos(a)*k*z.r/8, y:z.y+Math.sin(a)*k*z.r/8*.6 - 10, vx:0, vy:-rand(30,90), t:rand(.35,.6), size:rand(12,18), col:k%2?TC(t):C2(t)}); } }
  if (t === 'fire' || t === 'dragon' || t === 'rock' || t === 'ground') G.decals.push({k:t==='fire'||t==='dragon'?'scorch':'crack', x:z.x, y:z.y, r:z.r, t:6, max:6, seed:Math.random()});
  shake(z.r > 100 ? 12 : 7); sfx('boom');
}

/* ----- Ultimate ----- */
function useUlt(f, aim, tx, ty){
  if (f.en < 100 || !podeAgir(f)) return false;
  const e = active(1-f.team); const U = f.ult, t = U.t;
  f.en = 0; f.inv = Math.max(f.inv, .6); f.reveal = 2; G.stats.ults[f.team]++;
  G.cine = {f, nome:U.nome, t:1.1, max:1.1, col:TC(t)}; G.slowT = .5; sfx('ult'); shake(6);
  f.label = U.nome.toUpperCase(); f.labelT = 1.6; f.dir = aim;
  setAct(f, animInfo(f.p.id, 'Charge') ? 'Charge' : 'Attack', .6, true);
  const alvoX = e ? e.x : tx, alvoY = e ? e.y : ty;
  const mk = (k, p, extra={}) => Object.assign({n:U.nome, t, k, p, ult:true}, extra);
  switch (U.k) {
    case 'meteoro':
      G.zones.push({x:alvoX, y:alvoY, r:190, t:1.15, max:1.15, owner:f, m:mk('zone', 130, {radius:190})});
      for (let i=0;i<5;i++){ const a = rand(0,7), d = rand(60,170); G.sched.push({t:.15*i, fn:() => G.zones.push({x:clamp(alvoX+Math.cos(a)*d,30,W-30), y:clamp(alvoY+Math.sin(a)*d,30,H-30), r:100, t:.6, max:.6, owner:f, m:mk('zone', 80, {radius:100})})}); }
      break;
    case 'tempestade':
      for (let i=0;i<7;i++) G.sched.push({t:i*.2, fn:() => { const ee = active(1-f.team), bx = ee ? ee.x : alvoX, by = ee ? ee.y : alvoY;
        const a = rand(0,7), d = i === 0 ? 0 : rand(30,160); G.zones.push({x:clamp(bx+Math.cos(a)*d,30,W-30), y:clamp(by+Math.sin(a)*d,30,H-30), r:78, t:.35, max:.35, owner:f, m:mk('zone', 72, {radius:78, stun:.3})}); }});
      break;
    case 'ilusao':
      for (let i=0;i<4;i++){ const a = i/4*Math.PI*2 + rand(-.3,.3); G.clones.push({f, x:alvoX + Math.cos(a)*230, y:alvoY + Math.sin(a)*230, t:-.45 - i*.12, dir:a + Math.PI, hit:false, m:mk('dash', 58)}); }
      G.flash = .2; G.flashCol = '120,60,200';
      break;
    case 'rajada': f.rush = {n:6, t:.15, m:mk('melee', 48, {range:90, arc:6.3})}; f.inv = 1.4; break;
    case 'esfera':
      f.windup = {t:.6, max:.6, ult:true, a:aim, fn:() => { const ee = active(1-f.team), a2 = ee ? Math.atan2(ee.y-f.y, ee.x-f.x) : f.aim;
        G.proj.push({x:f.x + Math.cos(a2)*30, y:f.y + Math.sin(a2)*30, vx:Math.cos(a2)*560, vy:Math.sin(a2)*560, r:32, dist:0, owner:f, m:mk('proj', 190, {range:1100, homing:true, explode:140}), type:t, rot:0, seed:0}); sfx('beam'); }};
      break;
    default:
      G.sched.push({t:.25, fn:() => { if (!f.alive) return; doNova(f, mk('nova', 165, {radius:280})); G.waves.push({x:f.x, y:f.y, r:30, max:340, t:.7, maxT:.7, type:t, col:C2(t)}); G.flash = .3; }});
  }
  return true;
}

/* ----- Eventos do mapa ----- */
function aviso(x, y, r, dur, tipo, fn){ G.warns.push({x:clamp(x,40,W-40), y:clamp(y,40,H-40), r, t:dur, max:dur, tipo, fn}); }
function pertoDe(f, min=60, max=150){ const a = rand(0,7), d = rand(min, max); return [f.x + Math.cos(a)*d, f.y + Math.sin(a)*d]; }
function iniciarEvento(){
  const lista = MAP.eventos || []; if (!lista.length) return;
  const tipo = lista[G.evIdx++ % lista.length];
  const fs = [active(0), active(1)].filter(Boolean);
  switch (tipo) {
    case 'torcida': banner('A torcida está empolgada!', 'Energia +25 para os dois lados', '#ffd23f'); sfx('cheer'); G.hype = 4;
      for (const f of fs) f.en = Math.min(100, f.en + 25);
      G.items.push({x:W/2, y:H/2, kind:'energia', t:0}); break;
    case 'frutas': banner('Frutas caíram das árvores!', '', '#7cff6b');
      for (const s of [-1, 1]) { const x = W/2 + s*rand(250, 500), y = rand(250, H-250); G.items.push({x, y, kind:'oran', t:0}); } sfx('pickup'); break;
    case 'erupcao': banner('Erupção!', 'Saia dos círculos vermelhos', '#ff6a1a'); sfx('rumble'); shake(8);
      for (const f of fs) { const [x,y] = pertoDe(f); aviso(x, y, 75, 1.8, 'lava', w => { hitNature(w.x, w.y, w.r, {n:'Bomba de Lava', t:'fire', k:'zone', p:70, burn:.5});
        G.tempTerr.push({tipo:'lava', x:w.x, y:w.y, rx:55, ry:40, t:5}); burst('fire', w.x, w.y-10, 24, 1.3); shake(8); sfx('boom'); }); }
      { const s = freeSpot(); aviso(s.x, s.y, 75, 1.8, 'lava', w => { hitNature(w.x, w.y, w.r, {n:'Bomba de Lava', t:'fire', k:'zone', p:70, burn:.5}); G.tempTerr.push({tipo:'lava', x:w.x, y:w.y, rx:55, ry:40, t:5}); burst('fire', w.x, w.y-10, 24, 1.3); sfx('boom'); }); }
      break;
    case 'estalactites': banner('Estalactites caindo!', 'Fique longe das sombras', '#9fe8ff'); sfx('rumble');
      for (const f of fs) for (let k=0;k<2;k++) { const [x,y] = pertoDe(f, 40, 170); aviso(x, y, 55, 1.3, 'gelo', w => { hitNature(w.x, w.y, w.r, {n:'Estalactite', t:'rock', k:'zone', p:60, slow:.5}); for (let i=0;i<14;i++) part('shard','ice', w.x, w.y-10, 1.3); shake(6); sfx('shatter'); }); }
      break;
    case 'mare': banner('A maré está subindo!', 'A parte de cima vira água por alguns segundos', '#62a9e8'); G.ev = {tipo:'mare', t:0, dur:15}; break;
    case 'armadilhas': banner('Armadilhas antigas!', 'Saia das runas vermelhas', '#ff8a3d'); sfx('trap');
      for (let i=0;i<2;i++) { const y = rand(160, H-160); G.traps.push({x1:60, y1:y, x2:W-60, y2:y + rand(-80,80), t:1.2, max:1.2}); }
      break;
    case 'apagao': banner('Apagão!', 'Só o neon ilumina a rua', '#b26bff'); sfx('alarm'); G.ev = {tipo:'apagao', t:0, dur:9}; break;
    case 'neblina': banner('A neblina engrossou', 'A visão fica curta', '#c8d8c0'); G.ev = {tipo:'neblina', t:0, dur:10}; break;
    case 'vento': case 'vendaval': { const dir = Math.random() < .5 ? -1 : 1;
      banner('Rajada de vento!', dir < 0 ? '← para a esquerda' : 'para a direita →', '#dff3ff'); G.ev = {tipo:'vento', t:0, dur:3.5, dir}; sfx('dash'); break; }
    case 'raios': banner('Raios caindo!', 'Os para-raios atraem as descargas', '#ffe14d'); sfx('thunder');
      { const rods = OBST.filter(o => o.tipo === 'para_raios'), alvos = [];
        for (const f of fs) alvos.push(pertoDe(f, 50, 150));
        for (let i=0;i<2 && rods.length;i++){ const r = rods[Math.floor(Math.random()*rods.length)]; alvos.push([r.x + rand(-40,40), r.y + 60]); }
        for (const [x,y] of alvos) aviso(x, y, 70, 1.3, 'raio', w => { G.strikes.push({pts:zig(w.x, w.y-700, w.x, w.y, 14, 30), t:.3, max:.3, col:'#ffe14d'}); G.flash = .3;
          hitNature(w.x, w.y, w.r, {n:'Raio', t:'electric', k:'zone', p:75, stun:.5}); G.fields.push({x:w.x, y:w.y, r:80, t:2.5, tick:0}); sfx('thunder'); }); }
      break;
  }
}
function updateEvento(dt){
  if (!G.ev) { G.evT -= dt; if (G.evT <= 0 && G.warns.length === 0) { G.evT = rand(18, 26); iniciarEvento(); } }
  else { const e = G.ev; e.t += dt;
    if (e.tipo === 'mare') { const k = e.t < 3 ? e.t/3 : e.t < e.dur - 3 ? 1 : Math.max(0, (e.dur - e.t)/3); G.tide = 230*k; }
    if (e.tipo === 'vento' && e.t > 1) for (const ti of [0,1]) { const f = active(ti); if (!f || f.air) continue;
      const ox = f.x, oy = f.y, forca = f.p.def >= 110 ? 110 : 210; f.x += e.dir*forca*dt; pushOut(f); evitarAbismo(f, ox, oy); }
    if (e.t >= e.dur) { G.ev = null; G.tide = 0; } }
  for (const t of TERR) if (t.mare) t.extra = G.tide;
  G.dark = (MAP.luz || 0) + (G.ev && G.ev.tipo === 'apagao' ? .35 : 0);
  G.fog = (MAP.neblina ? .5 : 0) + (G.ev && G.ev.tipo === 'neblina' ? .5 : 0);
  // avisos
  for (const w of G.warns) { w.t -= dt; if (w.t <= 0) w.fn(w); }
  G.warns = G.warns.filter(w => w.t > 0);
  // armadilhas
  for (const tr of G.traps) { tr.t -= dt;
    if (tr.t <= 0 && !tr.fired) { tr.fired = true; sfx('land'); shake(5);
      const n = Math.ceil(Math.hypot(tr.x2-tr.x1, tr.y2-tr.y1)/45);
      for (let i=0;i<=n;i++) P({kind:'spike', x:tr.x1 + (tr.x2-tr.x1)*i/n, y:tr.y1 + (tr.y2-tr.y1)*i/n, t:.7, size:rand(14,20), col:'#b8a27a', vx:0, vy:0});
      for (const ti of [0,1]) { const f = active(ti); if (!f) continue;
        const vx = tr.x2-tr.x1, vy = tr.y2-tr.y1, L = vx*vx+vy*vy; let k = ((f.x-tr.x1)*vx + (f.y-tr.y1)*vy)/L; k = clamp(k,0,1);
        if (Math.hypot(f.x - tr.x1 - vx*k, f.y - tr.y1 - vy*k) < 42) hit(NAT, f, {n:'Espinhos', t:'rock', k:'zone', p:70}); } } }
  G.traps = G.traps.filter(tr => tr.t > -.7);
  // campos elétricos e fogo
  for (const z of G.fields) { z.t -= dt; z.tick -= dt;
    if (z.tick <= 0) { z.tick = .5; for (const ti of [0,1]) { const f = active(ti); if (!f || Math.hypot(f.x-z.x, f.y-z.y) > z.r + f.r) continue;
      if (f.p.types.includes('electric')) { f.en = Math.min(100, f.en + 5); continue; } hit(NAT, f, {n:'Campo Elétrico', t:'electric', k:'zone', p:18, stun:.15}); } }
    if (Math.random() < .6) part('bolt', 'electric', z.x + rand(-z.r, z.r)*.7, z.y + rand(-z.r, z.r)*.45, .6); }
  G.fields = G.fields.filter(z => z.t > 0);
  for (const z of G.fires) { z.t -= dt; z.tick -= dt;
    if (z.tick <= 0) { z.tick = .5; for (const ti of [0,1]) { const f = active(ti); if (!f || ti === z.team || f.air || Math.hypot(f.x-z.x, f.y-z.y) > z.r + f.r) continue;
      hit(NAT, f, {n:'Fogo', t:'fire', k:'zone', p:18, burn:.3}); } }
    if (Math.random() < (FX_LEVE() ? .3 : .9)) { const a = rand(0,7), r = Math.sqrt(Math.random())*z.r; P({kind:'flame', x:z.x+Math.cos(a)*r, y:z.y+Math.sin(a)*r*.6, vx:0, vy:-rand(40,110), t:rand(.3,.6), size:rand(9,16), col:Math.random()<.5?'#ff7a2a':'#ffd75a'}); } }
  G.fires = G.fires.filter(z => z.t > 0);
  for (const v of G.vines) { v.t -= dt; const f = active(1-v.team); if (f && !f.air && Math.hypot(f.x-v.x, f.y-v.y) < v.r) f.st.slow = Math.max(f.st.slow, .25); }
  G.vines = G.vines.filter(v => v.t > 0);
  for (const b of G.burnt) b.t -= dt; G.burnt = G.burnt.filter(b => b.t > 0);
  for (const t of G.tempTerr) t.t -= dt; G.tempTerr = G.tempTerr.filter(t => t.t > 0);
  // obstáculos destruídos voltam
  for (const o of OBST) { if (o.filho) continue; o.hitT = Math.max(0, o.hitT - dt); o.cd = Math.max(0, o.cd - dt);
    if (o.dead) { o.respawnT -= dt; if (o.respawnT <= 0 && ![0,1].some(ti => { const f = active(ti); return f && Math.hypot(f.x-o.x, f.y-o.y) < o.r*2 + f.r; })) { o.dead = false; o.hp = o.maxhp; P({kind:'ring', x:o.x, y:o.y-20, col:'#ffffff', t:.4, size:10, size2:60, vx:0, vy:0}); } } }
  // teleportes (Ruínas)
  for (const par of (MAP.teleportes || [])) for (const ti of [0,1]) { const f = active(ti); if (!f || f.air || f.tpCd > 0) continue;
    for (let k=0;k<2;k++) { const [ax,ay] = par[k], [bx,by] = par[1-k];
      if (Math.hypot(f.x-ax, f.y-ay) < 34) { burst('psychic', f.x, f.y-20, 16); f.x = bx; f.y = by; f.mvx = f.mvy = 0; f.tpCd = 3; pushOut(f); burst('psychic', f.x, f.y-20, 16); sfx('tp'); break; } } }
  G.hype = Math.max(0, G.hype - dt);
}

/* ----- IA ----- */
function updateAI(f, dt){
  const ai = f.ai, D = G.diff, e = active(0);
  ai.t -= dt; ai.strafeT -= dt; ai.swT -= dt;
  if (ai.strafeT <= 0) { ai.strafe *= -1; ai.strafeT = rand(.8, 2.2); }
  if (!e) {
    const dx = W*0.7 - f.x, dy = H/2 - f.y, d = Math.hypot(dx,dy);
    ai.mx = d > 20 ? dx/d : 0; ai.my = d > 20 ? dy/d : 0; return;
  }
  if (f.jumpCd <= 0 && !f.air && Math.random() < D.jump*dt*6) {
    for (const p of G.proj) { if (p.owner.team === 1) continue;
      const rx = f.x-p.x, ry = f.y-p.y, rd = Math.hypot(rx,ry); if (rd > 170) continue;
      const sp = Math.hypot(p.vx,p.vy); if ((rx*p.vx + ry*p.vy)/sp < 0) continue;
      const side = (rx*p.vy - ry*p.vx) > 0 ? 1 : -1; doJump(f, Math.atan2(-p.vx*side, p.vy*side)); break; }
    for (const z of G.zones) if (!f.air && z.owner.team === 0 && !z.marker && z.t < .4 && Math.hypot(f.x-z.x, f.y-z.y) < z.r + f.r) doJump(f, Math.atan2(f.y-z.y, f.x-z.x));
  }
  if (ai.t > 0) return;
  ai.t = D.think * rand(.8, 1.2);
  const alcanceVisao = G.fog > .8 ? 240 : G.fog > 0 ? 400 : 1e9;
  const distReal = Math.hypot(e.x-f.x, e.y-f.y);
  const visto = (!e.hidden || distReal < 230 || e.reveal > 0) && distReal < alcanceVisao;
  if (visto || (distReal < 800 && Math.random() < .08)) { ai.lastX = e.x + (visto ? 0 : rand(-120,120)); ai.lastY = e.y + (visto ? 0 : rand(-120,120)); }
  const txp = visto ? e.x : ai.lastX, typ = visto ? e.y : ai.lastY;
  const dx = txp-f.x, dy = typ-f.y, d = Math.hypot(dx,dy) || 1;
  const ranges = f.moves.filter(m => m.k !== 'heal' && m.k !== 'buff').map(m => moveRange(m));
  const pref = visto ? clamp(ranges.reduce((s,v) => s+v, 0)/ranges.length * .6, 110, 420) : 40;
  let mx = 0, my = 0;
  if (d > pref + 50) { mx += dx/d; my += dy/d; } else if (d < pref - 50) { mx -= dx/d; my -= dy/d; }
  mx += -dy/d * ai.strafe * .8; my += dx/d * ai.strafe * .8;
  for (const it of G.items) { const id = Math.hypot(it.x-f.x, it.y-f.y);
    if (id < 380 && (it.kind !== 'oran' || f.hp/f.maxhp < .7) && ruimPara(f, it.x, it.y) === 0) { mx += (it.x-f.x)/id*1.6; my += (it.y-f.y)/id*1.6; } }
  for (const p of OBST) { if (!solid(p)) continue; const px = f.x-p.x, py = f.y-p.y, pd = Math.hypot(px,py); if (pd < p.r + 90) { mx += px/pd*1.2; my += py/pd*1.2; } }
  if (Math.random() < D.dodge) for (const p of G.proj) {
    if (p.owner.team === 1) continue;
    const rx = f.x-p.x, ry = f.y-p.y, rd = Math.hypot(rx,ry); if (rd > 260) continue;
    const sp = Math.hypot(p.vx,p.vy), along = (rx*p.vx + ry*p.vy)/sp; if (along < 0) continue;
    const side = (rx*p.vy - ry*p.vx) > 0 ? 1 : -1;
    mx += p.vy/sp * side * 2; my += -p.vx/sp * side * 2;
  }
  for (const z of [...G.zones, ...G.pools, ...G.warns]) if ((z.owner ? z.owner.team === 0 : true) && Math.hypot(f.x-z.x, f.y-z.y) < z.r + f.r + 10) { const zx = f.x-z.x, zy = f.y-z.y, zd = Math.hypot(zx,zy)||1; mx += zx/zd*2.5; my += zy/zd*2.5; }
  let ml = Math.hypot(mx,my); if (ml) { mx /= ml; my /= ml; }
  // desviar de terreno perigoso (lava, abismo, veneno, campos, avisos)
  if (ml && ruimPara(f, f.x + mx*70, f.y + my*70) > 0) {
    let ok = false;
    for (const da of [.6, -.6, 1.2, -1.2, 1.8, -1.8, Math.PI]) { const a = Math.atan2(my, mx) + da;
      if (ruimPara(f, f.x + Math.cos(a)*70, f.y + Math.sin(a)*70) === 0) { mx = Math.cos(a); my = Math.sin(a); ok = true; break; } }
    if (!ok) { mx = -mx; my = -my; }
  }
  ai.mx = mx; ai.my = my;
  // trocar de Pokémon quando está em desvantagem (treinador esperto)
  const t1 = G.teams[1];
  if (ai.swT <= 0 && t1.sw <= 0 && f.hp/f.maxhp < .5 && podeAgir(f) && Math.random() < (S.diff === 'hard' ? .5 : S.diff === 'normal' ? .25 : 0)) {
    ai.swT = 3;
    const ameaca = e.moves.some(m => m.k !== 'heal' && m.k !== 'buff' && effectiveness(m.t, f.p.types) > 1 && e.p.types.includes(m.t));
    if (ameaca) { const i = t1.f.findIndex((g,j) => g.alive && j !== t1.a && e.moves.every(m => effectiveness(m.t, g.p.types) <= 1));
      if (i >= 0) { switchTo(1, i); return; } }
  }
  if (!podeAgir(f) || !visto || e.air) return;
  const realD = distReal;
  // Ultimate
  if (f.en >= 100 && realD < (f.ult.k === 'nova' ? 260 : 520)) { const a = Math.atan2(e.y-f.y, e.x-f.x); if (useUlt(f, a, e.x, e.y)) return; }
  const shot = clearShot(f, e);
  let best = -1, bestW = 0;
  f.moves.forEach((m,i) => {
    if (f.cds[i] > 0) return;
    let w;
    if (m.k === 'heal') { if (f.hp/f.maxhp > .4) return; w = 999; }
    else if (m.k === 'buff') { if (f.bAtk > 0 || realD > 520) return; w = 140 * rand(.5, 1.3); }
    else {
      const R = moveRange(m), reach = (m.k === 'melee' || m.k === 'nova') ? R + e.r : R;
      if (realD > reach) return;
      if (['proj','multi','beam','dash'].includes(m.k) && !shot) return;
      w = m.p * effectiveness(m.t, e.p.types) * (f.p.types.includes(m.t) ? 1.25 : 1) * rand(.6, 1.4);
      if (m.t === 'electric' && e.mk.molhado > 0) w *= 1.8;
      if (e.mk.congelado > 0 && ['melee','dash'].includes(m.k)) w *= 1.8;
      if (m.windup) w *= .8;
    }
    if (w > bestW) { bestW = w; best = i; }
  });
  if (best >= 0) {
    const m = f.moves[best];
    let tx = e.x, ty = e.y;
    if (D.lead && (m.k === 'proj' || m.k === 'multi' || m.k === 'zone' || m.k === 'leap')) {
      const tt = m.k === 'zone' ? m.delay : m.k === 'leap' ? .7 : realD / m.speed;
      tx += (e.vx||0)*tt*.8; ty += (e.vy||0)*tt*.8;
    }
    const aim = Math.atan2(ty-f.y, tx-f.x) + rand(-D.err, D.err);
    const zoneErr = D.err * 250;
    useMove(f, best, aim, tx + rand(-zoneErr, zoneErr), ty + rand(-zoneErr, zoneErr));
  }
}

/* ----- Atualização ----- */
function screenToWorld(sx, sy){ return {x:(sx - VW/2)/G.scale + G.cam.x, y:(sy - VH/2)/G.scale + G.cam.y}; }
function updateFighter(f, dt, mx, my){
  f.cds = f.cds.map(c => Math.max(0, c-dt));
  f.inv = Math.max(0, f.inv-dt); f.flash = Math.max(0, f.flash-dt); f.labelT -= dt; f.spawnT = Math.max(0, f.spawnT-dt);
  f.hurtT = Math.max(0, f.hurtT-dt); f.jumpCd = Math.max(0, f.jumpCd-dt); f.reveal = Math.max(0, f.reveal-dt); f.tpCd = Math.max(0, f.tpCd-dt);
  f.bAtk = Math.max(0, f.bAtk-dt); f.bSpd = Math.max(0, f.bSpd-dt); f.atkT = Math.max(0, f.atkT-dt);
  for (const k in f.st) f.st[k] = Math.max(0, f.st[k]-dt);
  for (const k in f.mk) f.mk[k] = Math.max(0, f.mk[k]-dt);
  if (f.st.burn > 0) { f.hp -= f.maxhp*.02*dt; if (Math.random() < dt*14) part('flame','fire', f.x+rand(-18,18), f.y-rand(0,f.topH*.7)); }
  if (f.st.poison > 0) { f.hp -= f.maxhp*.025*dt; if (Math.random() < dt*8) part('bubble','poison', f.x+rand(-18,18), f.y-rand(0,f.topH*.6)); }
  if (f.st.stun > 0 && Math.random() < dt*14) part('bolt','electric', f.x+rand(-20,20), f.y-rand(0,f.topH*.7), .5);
  if (f.st.slow > 0 && Math.random() < dt*8) part('shard','ice', f.x+rand(-20,20), f.y-rand(0,f.topH*.5), .3);
  if (f.mk.molhado > 0 && Math.random() < dt*10) P({kind:'drop', x:f.x+rand(-16,16), y:f.y-rand(10,f.topH*.6), vx:0, vy:0, grav:500, t:.4, size:3, col:'#62a9e8'});
  if (f.mk.frio > 0 && Math.random() < dt*8) P({kind:'glow', x:f.x+rand(-18,18), y:f.y-rand(0,f.topH*.6), vx:0, vy:-20, t:.4, size:6, col:'#cfefff'});
  if (f.bAtk > 0 && Math.random() < dt*10) P({kind:'flame', x:f.x+rand(-20,20), y:f.y+FOOT, vx:0, vy:-rand(60,120), t:.4, size:8, col:'#ff5a5a'});
  if (f.bSpd > 0 && f.moving && Math.random() < dt*20) P({kind:'wind', x:f.x+rand(-20,20), y:f.y-rand(0,30), vx:-f.vx*.8, vy:-f.vy*.8, t:.18, size:2, col:'#ffe066'});
  if (f.en >= 100 && Math.random() < dt*6) P({kind:'star', x:f.x+rand(-22,22), y:f.y-rand(0,f.topH), vx:0, vy:-40, t:.5, size:6, col:TC(f.ult.t), rot:0, vr:4});
  // terreno
  f.terr = f.air ? null : terrainAt(f.x, f.y);
  if (f.terr === 'lava' && !f.p.types.includes('fire') && !voa(f)) {
    f.hp -= f.maxhp*.07*dt;
    if (Math.random() < dt*1.2 && f.st.burn <= 0) { f.st.burn = 2.5; floatText(f.x, f.y+44, 'Queimado!', '#ff8c3a', 13); }
    if (Math.random() < dt*20) part('flame','fire', f.x+rand(-20,20), f.y+FOOT);
  }
  if (f.terr === 'veneno' && !f.p.types.includes('poison') && !f.p.types.includes('steel') && !voa(f)) {
    if (f.st.poison <= 0) { f.st.poison = 3; floatText(f.x, f.y+44, 'Envenenado!', '#c06ad6', 13); }
  }
  f.hidden = f.terr === 'mato' && f.reveal <= 0;
  if (f.hp <= 0) { faint(f); return; }
  const ox = f.x, oy = f.y;
  let zt = f.lev ? 10 + Math.sin(G.clock*3 + f.p.id)*4 : 0;
  if ((f.st.stun > 0 || f.mk.congelado > 0) && !f.leap) { f.moving = false; f.vx = f.vy = f.mvx = f.mvy = 0; f.z = zt; return; }
  if (f.rush) {
    const R = f.rush; R.t -= dt;
    if (R.t <= 0) { const e = active(1-f.team);
      if (e && R.n > 0) { const a = rand(0,7); const ox2 = f.x, oy2 = f.y; f.x = e.x + Math.cos(a)*60; f.y = e.y + Math.sin(a)*60; pushOut(f); evitarAbismo(f, ox2, oy2);
        f.dir = Math.atan2(e.y-f.y, e.x-f.x); G.ghosts.push({f, x:ox2, y:oy2, z:0, dir:f.dir, name:'Walk', el:0, t:.3, max:.3});
        hit(f, e, R.m); G.slashes.push({x:e.x, y:e.y-HGT, a:f.dir, r:70, t:.2, max:.2, style:'cross', type:R.m.t}); setAct(f, 'Strike', .12, true); sfx('swing');
        R.n--; R.t = .13; }
      else f.rush = null; }
  } else if (f.leap) {
    const L = f.leap; L.t += dt; const k = Math.min(1, L.t/L.dur);
    f.x = L.sx + (L.tx-L.sx)*k; f.y = L.sy + (L.ty-L.sy)*k; zt = Math.sin(k*Math.PI)*150;
    f.dir = Math.atan2(L.ty-L.sy, L.tx-L.sx);
    if (Math.random() < .5) trail(L.m.t, f.x, f.y - zt - 10);
    if (k >= 1) { f.leap = null; f.air = false; pushOut(f);
      if (!voa(f) && terrainAt(f.x, f.y) === 'abismo') { for (let s=0;s<20 && terrainAt(f.x, f.y) === 'abismo';s++) { f.x += (L.sx-f.x)*.15; f.y += (L.sy-f.y)*.15; } }
      doNova(f, L.m); for (let i=0;i<16;i++) part('dust','ground', f.x+rand(-30,30), f.y+FOOT); sfx('land'); }
  } else if (f.jump) {
    const J = f.jump; J.t += dt; const k = Math.min(1, J.t/J.dur);
    const sp = f.speed*1.7*(f.bSpd > 0 ? 1.35 : 1);
    f.x += Math.cos(J.a)*sp*dt; f.y += Math.sin(J.a)*sp*dt; pushOut(f); evitarAbismo(f, ox, oy);
    if (k >= 1) { f.jump = null; f.air = false; for (let i=0;i<6;i++) part('dust','ground', f.x, f.y+FOOT); }
  } else if (f.windup) {
    const w = f.windup; w.t -= dt;
    const col = w.ult ? TC(f.ult.t) : TC(f.moves[w.i].t), col2 = w.ult ? C2(f.ult.t) : C2(f.moves[w.i].t);
    for (let k=0;k<(w.ult ? 4 : 2);k++){ const a = rand(0,7), r = rand(50,w.ult ? 140 : 90), px = f.x + Math.cos(a)*r, py = f.y - HGT + Math.sin(a)*r;
      P({kind:'glow', x:px, y:py, vx:(f.x-px)*3.2, vy:(f.y-HGT-py)*3.2, t:.3, size:rand(5,w.ult ? 14 : 9), col:Math.random()<.5?col:col2}); }
    if (w.t <= 0) { f.windup = null; if (w.fn) w.fn(); else fireBeam(f, f.moves[w.i], f.team === 0 ? f.aim : w.a); }
  } else if (f.dash) {
    const ds = f.dash, step = Math.min(ds.left, ds.m.speed*dt);
    f.x += Math.cos(ds.a)*step; f.y += Math.sin(ds.a)*step; ds.left -= step; f.dir = ds.a;
    f.ghostT -= dt;
    if (f.ghostT <= 0) { f.ghostT = .03; G.ghosts.push({f, x:f.x, y:f.y, z:zt, dir:f.dir, name:f.animName, el:performance.now()/1000 - f.animStart, t:.22, max:.22}); }
    trail(ds.m.t, f.x, f.y - HGT); trail(ds.m.t, f.x, f.y - HGT);
    P({kind:'wind', x:f.x+rand(-20,20), y:f.y-HGT+rand(-20,20), vx:-Math.cos(ds.a)*500, vy:-Math.sin(ds.a)*500, t:.15, size:2, col:'#ffffff'});
    const e = active(1-f.team);
    if (e && !ds.hit && Math.hypot(e.x-f.x, e.y-f.y) < f.r + e.r + 8) { ds.hit = true; hit(f, e, ds.m); ds.left = 0; }
    if (pushOut(f)) ds.left = 0;
    for (const p of OBST) if (solid(p) && Math.hypot(f.x-p.x,f.y-p.y) <= p.r+f.r+.5) { ds.left = 0; if (!ds.hitO) { ds.hitO = true; damageObst(p, ds.m.p*.6, f, ds.m); } }
    if (evitarAbismo(f, ox, oy)) ds.left = 0;
    if (ds.left <= 0) { f.dash = null; f.mvx = f.mvy = 0; }
  } else {
    let sp = f.speed * (f.st.slow > 0 ? .55 : 1) * (f.bSpd > 0 ? 1.35 : 1);
    const ef = TERRENO_EFEITO[f.terr];
    if (ef && ef.lento && !voa(f)) sp *= f.p.types.includes('water') ? (ef.rapidoAgua || 1) : ef.lento;
    const slide = MAP.escorregadio && f.terr !== 'neve' && !voa(f);
    const tvx = mx*sp, tvy = my*sp;
    if (slide) { const k = Math.min(1, dt*2.2); f.mvx += (tvx - f.mvx)*k; f.mvy += (tvy - f.mvy)*k; }
    else { f.mvx = tvx; f.mvy = tvy; }
    f.x += f.mvx*dt; f.y += f.mvy*dt;
    if (pushOut(f) && slide) { f.mvx *= -.4; f.mvy *= -.4; }
    if (evitarAbismo(f, ox, oy)) { f.mvx *= .3; f.mvy *= .3; }
    if (slide && Math.hypot(f.mvx, f.mvy) > 60 && Math.random() < dt*12) P({kind:'glow', x:f.x+rand(-10,10), y:f.y+FOOT, vx:0, vy:0, t:.3, size:6, col:'#ffffff'});
  }
  f.z = zt;
  const e = active(1-f.team);
  if (e && !f.dash && !f.air && !e.air && !f.rush) { const dx = f.x-e.x, dy = f.y-e.y, d = Math.hypot(dx,dy)||1, min = f.r+e.r; if (d < min) { f.x = e.x + dx/d*min; f.y = e.y + dy/d*min; pushOut(f); } }
  f.vx = (f.x-ox)/dt; f.vy = (f.y-oy)/dt;
  const spd = Math.hypot(f.vx, f.vy);
  f.moving = spd > 20 && !f.rush;
  if (f.moving) f.bob += dt*12;
  if (f.moving && !f.dash && !f.leap && !f.jump && !(f.act && f.act.atk)) f.dir = Math.atan2(f.vy, f.vx);
  else if (!f.moving && e && !f.leap && !f.jump && !(f.act && f.act.atk) && !f.windup && !f.rush) f.dir = Math.atan2(e.y-f.y, e.x-f.x);
  if (f.windup) f.dir = f.aim;
  f.animRate = f.dash ? 2.6 : clamp(spd/190, .7, 2.2);
  if (f.moving && !f.lev && !f.air && f.terr !== 'agua' && f.terr !== 'agua_escura' && Math.random() < dt*6) part('dust', MAP.base === 'gelo' ? 'ice' : 'ground', f.x+rand(-10,10), f.y+FOOT, .3);
  if (f.moving && (f.terr === 'agua' || f.terr === 'agua_escura') && Math.random() < dt*14) part('drop', 'water', f.x+rand(-14,14), f.y+FOOT);
  for (const it of G.items) if (!it.taken && !f.air && Math.hypot(it.x-f.x, it.y-f.y) < f.r + 22) pickItem(f, it);
}
function pickItem(f, it){
  it.taken = true; const I = ITENS[it.kind];
  if (it.kind === 'oran') heal(f, f.maxhp*.25);
  if (it.kind === 'ataque') f.bAtk = Math.max(f.bAtk, 8);
  if (it.kind === 'veloz') f.bSpd = Math.max(f.bSpd, 8);
  if (it.kind === 'escudo') f.shield = true;
  if (it.kind === 'energia') f.en = Math.min(100, f.en + 40);
  floatText(f.x, f.y-f.topH-30, I.nome + '!', I.cor, 16);
  P({kind:'ring', x:it.x, y:it.y-10, col:I.cor, t:.35, size:10, size2:60, vx:0, vy:0});
  for (let i=0;i<12;i++) P({kind:'star', x:it.x, y:it.y-14, vx:rand(-160,160), vy:rand(-200,40), t:.5, size:7, col:I.cor, rot:0, vr:4});
  sfx('pickup');
}
function updateClones(dt){
  for (const c of G.clones) { c.t += dt; if (c.t < 0 || c.done) continue;
    const e = active(1-c.f.team); if (!e) { c.done = true; continue; }
    if (!c.tx) { c.tx = e.x; c.ty = e.y; c.dir = Math.atan2(c.ty-c.y, c.tx-c.x); }
    const sp = 1300*dt, dx = c.tx-c.x, dy = c.ty-c.y, d = Math.hypot(dx,dy);
    if (d < sp) c.done = true; else { c.x += dx/d*sp; c.y += dy/d*sp; }
    trail(c.m.t, c.x, c.y - HGT);
    if (!c.hit && Math.hypot(e.x-c.x, e.y-c.y) < e.r + 30) { c.hit = true; hit(c.f, e, c.m); }
  }
  G.clones = G.clones.filter(c => !c.done || c.t < .6);
}
function updateFx(dt){
  for (const p of G.parts) { p.t -= dt; p.vy += (p.grav||0)*dt; p.x += (p.vx||0)*dt; p.y += (p.vy||0)*dt; p.rot += (p.vr||0)*dt;
    if (p.kind === 'flame' || p.kind === 'glow') { p.vx *= .96; p.vy *= .96; } }
  G.parts = G.parts.filter(p => p.t > 0);
  for (const l of [G.beams, G.waves, G.slashes, G.strikes, G.ghosts, G.decals, G.recalls]) for (const o of l) o.t -= dt;
  for (const d of G.dying) d.t += dt;
  G.beams = G.beams.filter(b => b.t > 0); G.waves = G.waves.filter(w => w.t > 0); G.slashes = G.slashes.filter(s => s.t > 0);
  G.strikes = G.strikes.filter(s => s.t > 0); G.ghosts = G.ghosts.filter(g => g.t > 0); G.decals = G.decals.filter(d => d.t > 0);
  G.recalls = G.recalls.filter(r => r.t > 0); G.dying = G.dying.filter(d => d.t < 1);
  for (const t of G.texts) { t.t -= dt; t.pop += dt; t.y -= 38*dt; } G.texts = G.texts.filter(t => t.t > 0);
  G.shake = Math.max(0, G.shake - dt*35); G.flash = Math.max(0, G.flash - dt);
  if (G.flash <= 0) G.flashCol = '255,255,255';
}
function update(dtReal){
  if (!G || G.paused) return;
  let dt = dtReal;
  if (G.slowT > 0) { G.slowT -= dtReal; dt *= .3; }
  updateAmbient(dtReal);
  if (G.hitstop > 0) { G.hitstop -= dt; updateFx(dt*.3); return; }
  G.clock = (G.clock || 0) + dt;
  if (!G.over) G.time -= dt;
  for (const s of G.sched) { s.t -= dt; if (s.t <= 0 && !s.done) { s.done = true; s.fn(); } }
  G.sched = G.sched.filter(s => !s.done);
  const me = active(0), foe = active(1);
  if (me && !G.over) {
    const inp = lerEntradaJogador(me, foe);
    if (!me.dash) me.aim = inp.aim;
    if (inp.pular) doJump(me, Math.hypot(inp.mx, inp.my) > .2 ? Math.atan2(inp.my, inp.mx) : me.dir);
    if (ultPedido) { if (useUlt(me, inp.aim, inp.tx, inp.ty) || performance.now() - ultPedido > 500) ultPedido = false; }
    updateFighter(me, dt, inp.mx, inp.my);
    if (me.alive) for (let i=0;i<4;i++) if (inp.golpes[i]) useMove(me, i, inp.aim, inp.tx, inp.ty);
  } else { pularPedido = false; ultPedido = false; }
  const foe2 = active(1);
  if (foe2 && !G.over) { updateAI(foe2, dt); if (foe2.alive) updateFighter(foe2, dt, foe2.ai.mx, foe2.ai.my); }
  for (const ti of [0,1]) {
    const t = G.teams[ti]; t.sw = Math.max(0, t.sw-dt);
    if (t.a === -1 && !G.over) {
      t.pend -= dt;
      if (t.pend <= 0) {
        const next = t.f.findIndex(f => f.alive);
        if (next < 0) endBattle(1-ti);
        else bringOut(ti, next, ti ? W-250 : 250, H/2 + rand(-150,150));
      }
    }
  }
  if (!G.over) updateEvento(dt);
  updateClones(dt);
  // itens no mapa
  G.itemT -= dt;
  if (G.itemT <= 0 && !G.over) { G.itemT = rand(11, 17);
    if (G.items.filter(i => !i.taken).length < 2) { const s = freeSpot(); G.items.push({...s, kind:SORTEIO_ITENS[Math.floor(Math.random()*SORTEIO_ITENS.length)], t:0});
      P({kind:'ring', x:s.x, y:s.y-10, col:'#ffffff', t:.5, size:5, size2:60, vx:0, vy:0}); } }
  for (const it of G.items) it.t += dt;
  G.items = G.items.filter(i => !i.taken && i.t < 30);
  // projéteis
  for (const p of G.proj) {
    if (p.m.homing) { const e = active(1-p.owner.team); if (e) { const cur = Math.atan2(p.vy,p.vx), want = Math.atan2(e.y-p.y, e.x-p.x), sp = Math.hypot(p.vx,p.vy);
      const na = cur + clamp(angDiff(want,cur), -3*dt, 3*dt); p.vx = Math.cos(na)*sp; p.vy = Math.sin(na)*sp; } }
    p.x += p.vx*dt; p.y += p.vy*dt; p.dist += Math.hypot(p.vx,p.vy)*dt; p.rot += dt*12;
    trail(p.type, p.x, p.y - HGT);
    if (p.r >= 13) trail(p.type, p.x, p.y - HGT);
    if (p.dist > p.m.range || p.x < 0 || p.y < 0 || p.x > W || p.y > H) { p.dead = true; burst(p.type, p.x, p.y-HGT, 5, .6); }
    for (const c of OBST) if (!p.dead && solid(c) && Math.hypot(p.x-c.x, p.y-c.y) < c.r + p.r) { p.dead = true; damageObst(c, p.m.p*.6, p.owner, p.m); burst(p.type, p.x, p.y-HGT, 10); P({kind:'ring', x:p.x, y:p.y-HGT, col:TC(p.type), t:.2, size:5, size2:30, vx:0, vy:0}); }
    const e = active(1-p.owner.team);
    if (!p.dead && e && Math.hypot(p.x-e.x, p.y-e.y) < p.r + e.r) {
      if (e.air) { if (e.jump && e.jump.t < .25 && !e.jump.perf) perfectDodge(e); }
      else { hit(p.owner, e, p.m); p.dead = true; } }
    if (p.dead) {
      if (p.m.t === 'fire') igniteAt(p.x, p.y, p.owner.team);
      if (p.m.explode) { doNova(p.owner, {n:p.m.n, t:p.m.t, k:'nova', p:90, radius:p.m.explode}, p.x, p.y); G.flash = .2; }
      if (p.m.leavePool) G.pools.push({x:p.x, y:p.y, r:60, t:2.5, max:2.5, tick:0, owner:p.owner, m:Object.assign({}, MV['Toxic'], {p:15, poison:.5})});
    }
  }
  G.proj = G.proj.filter(p => !p.dead);
  for (const z of G.zones) {
    z.t -= dt;
    const k = 1 - z.t/z.max, t = z.m.t;
    if (!z.marker && t !== 'electric' && t !== 'psychic' && t !== 'ground' && k > .25) { const hh = 600*(1-(k-.25)/.75); trail(t, z.x + rand(-6,6), z.y - hh); trail(t, z.x, z.y - hh); }
    if (t === 'psychic' && Math.random() < .5) { const a = rand(0,7); P({kind:'glow', x:z.x+Math.cos(a)*z.r, y:z.y+Math.sin(a)*z.r*.5-10, vx:-Math.cos(a)*z.r*2.5, vy:-Math.sin(a)*z.r*1.2, t:.35, size:8, col:C2(t)}); }
    if (t === 'electric' && Math.random() < .4) part('spark','electric', z.x+rand(-z.r,z.r)*.6, z.y+rand(-z.r,z.r)*.4);
    if (z.t <= 0) detonateZone(z);
  }
  G.zones = G.zones.filter(z => z.t > 0);
  for (const p of G.pools) { p.t -= dt; p.tick -= dt;
    if (Math.random() < .5) { const a = rand(0,7), r = Math.sqrt(Math.random())*p.r*.85; part('bubble', p.m.t, p.x+Math.cos(a)*r, p.y+Math.sin(a)*r*.55, .4); }
    if (p.tick <= 0) { p.tick = .5; if (p.owner.alive) hitCircle(p.x, p.y, p.r, p.owner, p.m); } }
  G.pools = G.pools.filter(p => p.t > 0);
  updateFx(dt);
  if (G.time <= 0 && !G.over) {
    const score = ti => G.teams[ti].f.reduce((s,f) => s + Math.max(0,f.hp)/f.maxhp, 0);
    const a = score(0), b = score(1);
    endBattle(Math.abs(a-b) < .01 ? -1 : a > b ? 0 : 1, true);
  }
}
function endBattle(winner, timeout){
  if (G.over) return;
  G.over = true; held.fill(false);
  const g = G;
  setTimeout(() => sfx(winner === 0 ? 'win' : 'lose'), 600);
  setTimeout(() => {
    if (G !== g) return;
    const title = winner === 0 ? 'VITÓRIA!' : winner === 1 ? 'DERROTA' : 'EMPATE';
    const col = winner === 0 ? 'var(--yel)' : winner === 1 ? 'var(--red)' : '#fff';
    const used = Math.round(180 - Math.max(0, g.time));
    const mvp = g.teams[0].f.slice().sort((a,b) => b.dmg - a.dmg)[0];
    openModal(`<div class="dname resultado ${winner === 0 ? 'win' : ''}" style="text-align:center;color:${col};font-size:24px;margin:8px 0 14px">${title}</div>
      ${timeout ? '<p class="hint">Tempo esgotado — venceu quem tinha mais HP restante.</p>' : ''}
      ${mvp && mvp.dmg > 0 ? `<div class="mvp">${sprHTML(mvp.p,70,true)}<div><small>DESTAQUE DO SEU TIME</small><b>${mvp.p.name}</b><span>${mvp.dmg} de dano</span></div></div>` : ''}
      <div class="stats" style="grid-template-columns:1fr auto;font-size:15px;max-width:320px;margin:14px auto">
        <span>Mapa</span><b>${MAP.nome}</b>
        <span>Dano causado</span><b>${g.stats.dealt[0]}</b>
        <span>Dano recebido</span><b>${g.stats.dealt[1]}</b>
        <span>Nocautes</span><b>${g.stats.ko[0]} x ${g.stats.ko[1]}</b>
        <span>Combos</span><b>${g.stats.combos[0]}</b>
        <span>Esquivas perfeitas</span><b>${g.stats.perfeitas[0]}</b>
        <span>Ultimates usadas</span><b>${g.stats.ults[0]}</b>
        <span>Duração</span><b>${Math.floor(used/60)}:${String(used%60).padStart(2,'0')}</b>
      </div>
      <div class="mfoot"><button class="smbtn" id="rMenu">Menu</button><button class="smbtn" id="rTeam">Mudar equipe</button><button class="smbtn go" id="rAgain">Jogar de novo</button></div>`);
    $('#rMenu').onclick = quitBattle;
    $('#rTeam').onclick = () => { G = null; closeModal(); openBuilder(); };
    $('#rAgain').onclick = startBattle;
  }, 1300);
}

