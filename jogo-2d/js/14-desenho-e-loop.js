/* =========================================================
   DESENHO
   ========================================================= */
function drawSheetFrame(id, name, elapsed, rate, dir, x, feetY, alpha, loop=true){
  const info = animInfo(id, name); if (!info) return false;
  const [src, fw, fh, rows, durs] = info, sheet = getSheet(id, src);
  if (!sheet.complete || !sheet.naturalWidth || sheet.failed) return false;
  const total = durs.reduce((s,v) => s+v, 0);
  let tk = elapsed*60*rate; tk = loop ? tk % total : Math.min(tk, total-1);
  let col = 0; for (let acc=0; col<durs.length; col++) { acc += durs[col]; if (tk < acc) break; }
  col = Math.min(col, durs.length-1);
  const row = rows >= 8 ? dirRow(dir) : 0;
  const dw = fw*SPR, dh = fh*SPR;
  ctx.globalAlpha = alpha; ctx.imageSmoothingEnabled = false;
  ctx.drawImage(sheet, col*fw, row*fh, fw, fh, x - dw/2, feetY - 6*SPR - dh/2, dw, dh);
  return true;
}
// Desenha o Pokémon (sprite PMD de 8 direções). Devolve false se nada estiver pronto.
function drawPoke(f, x, feetY, alpha, opts={}){
  const now = performance.now()/1000;
  let id = f.p.id, nm = opts.name || f.animName;
  if (f.spr) { id = f.spr; if (!animInfo(id, nm)) nm = animInfo(id, 'Idle') ? 'Idle' : (id = f.p.id, nm); }   // forma Mega: sprite próprio
  return drawSheetFrame(id, nm, opts.el ?? (now - f.animStart), opts.rate ?? 1, opts.dir ?? f.dir, x, feetY, alpha, opts.loop ?? true);
}
function drawFighter(f, now){
  if (f.entrada && !f.entrada.abriu) return;          // ainda dentro da Pokébola
  let name;
  if (f.act && now < f.act.end) name = f.act.name;
  else { f.act = null;
    name = f.jump ? 'Hop' : f.leap ? 'Walk' : f.windup ? 'Charge' : f.dash ? 'Walk' : (f.st.stun > 0 || f.mk.congelado > 0) ? 'Hurt' : f.moving ? 'Walk' : 'Idle'; }
  const key = f.act ? name + f.act.start : name;
  if (key !== f.animKey) { f.animKey = key; f.animName = name; f.animStart = f.act ? f.act.start : now; }
  const feetY = f.y + FOOT - f.z;
  let alpha = 1;
  if (f.inv > 0 && Math.floor(f.inv*12)%2 && !f.rush) alpha = .45;
  if (f.hidden) alpha = f.team === 0 ? .5 : .28;
  if (f.bAtk > 0 || f.windup || f.en >= 100) { ctx.globalCompositeOperation = 'lighter'; const col = f.windup ? (f.windup.ult ? TC(f.ult.t) : TC(f.moves[f.windup.i].t)) : f.bAtk > 0 ? '#ff5050' : TC(f.ult.t), s = 46 + Math.sin(now*12)*6;
    ctx.globalAlpha = (f.en >= 100 && !f.bAtk && !f.windup ? .3 : .55)*alpha; ctx.drawImage(glowTex(col), f.x - s, feetY - 22 - s, s*2, s*2); ctx.globalCompositeOperation = 'source-over'; }
  if (f.megaCor) { ctx.globalCompositeOperation = 'lighter'; const s = 50 + Math.sin(now*6)*5;   // Mega sem sprite próprio: aura da cor
    ctx.globalAlpha = .35*alpha; ctx.drawImage(glowTex(f.megaCor), f.x - s, feetY - 26 - s, s*2, s*2); ctx.globalCompositeOperation = 'source-over'; }
  ctx.save();
  if (f.megaEscala) { ctx.translate(f.x, feetY); ctx.scale(f.megaEscala, f.megaEscala); ctx.translate(-f.x, -feetY); }
  if (f.spawnT > 0) { const k = 1 - f.spawnT/.5, sc = k < .7 ? k/.7*1.15 : 1.15 - (k-.7)/.3*.15; ctx.translate(f.x, feetY); ctx.scale(sc, sc); ctx.translate(-f.x, -feetY); }
  let rate = f.animName === 'Walk' ? f.animRate : 1;
  if (f.animName === 'Hop' && f.jump) { const hi = animInfo(f.p.id, 'Hop'); if (hi) rate = hi[4].reduce((a,b) => a+b, 0)/60/f.jump.dur; }
  if (f.leap) rate = 2.2;
  const loop = !f.act && !f.jump;
  const ok = drawPoke(f, f.x, feetY, alpha, {rate, loop});
  if (!ok) {
    const im = getImg(f.p.id); ctx.globalAlpha = alpha;
    if (im.complete && im.naturalWidth && !im.failed) { ctx.save(); ctx.translate(f.x, feetY - 40); if (Math.cos(f.dir) > 0) ctx.scale(-1,1); ctx.drawImage(im, -40, -40, 80, 80); ctx.restore(); }
    else { ctx.fillStyle = TC(f.p.types[0]); ctx.beginPath(); ctx.arc(f.x, feetY-24, 24, 0, 7); ctx.fill(); }
  }
  if ((f.flash > 0 || f.spawnT > .25) && ok) { ctx.globalCompositeOperation = 'lighter';
    for (let i=0;i<2;i++) drawPoke(f, f.x, feetY, .7*alpha, {rate, loop});
    ctx.globalCompositeOperation = 'source-over'; }
  const sil = Math.max(f.sil || 0, silhuetaMega(f));       // silhueta branca (Pokébola / Mega Evolução)
  if (sil > 0 && ok) { ctx.filter = 'brightness(0) invert(1)'; drawPoke(f, f.x, feetY, sil, {rate, loop});
    ctx.filter = 'none'; }
  ctx.restore(); ctx.globalAlpha = 1;
  if (f.mk.congelado > 0) { const h = Math.min(130, f.topH + 6), w = 70; ctx.fillStyle = 'rgba(170,230,255,.45)'; ctx.strokeStyle = '#e8fbff'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.roundRect(f.x - w/2, feetY - h, w, h, 10); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#ffffff99'; ctx.fillRect(f.x - w/2 + 8, feetY - h + 8, 8, h*.5); }
  if (f.shield) { ctx.strokeStyle = `rgba(156,240,255,${.5 + Math.sin(now*6)*.2})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(f.x, feetY - 24, 40, 46, 0, 0, 7); ctx.stroke(); }
  // mato alto cobre os pés
  if (f.terr === 'mato' && !f.air) { ctx.fillStyle = '#2f6b22'; for (let i=-4;i<=4;i++){ const sw = Math.sin(now*3 + i + f.x*.01)*3; ctx.beginPath(); ctx.moveTo(f.x + i*7 - 4, feetY + 2); ctx.lineTo(f.x + i*7 + sw, feetY - 18 - (i%2)*6); ctx.lineTo(f.x + i*7 + 4, feetY + 2); ctx.fill(); } }
}
function drawDying(d, now){
  const f = d.f, k = d.t, feetY = d.y + FOOT;
  ctx.save(); ctx.translate(d.x, feetY); ctx.scale(1 + k*.3, Math.max(.05, 1 - k*.95)); ctx.translate(-d.x, -feetY);
  { drawSheetFrame(f.p.id, 'Hurt', 9, 1, d.dir, d.x, feetY, 1 - k, false);
    ctx.globalCompositeOperation = 'lighter'; drawSheetFrame(f.p.id, 'Hurt', 9, 1, d.dir, d.x, feetY, (1-k)*Math.min(1, k*3), false); }
  ctx.restore(); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
}
function drawGhosts(now){
  for (const g of G.ghosts) { ctx.globalCompositeOperation = 'lighter';
    drawPoke(g.f, g.x, g.y + FOOT - g.z, (g.t/g.max)*.35, {name:g.name, el:g.el, rate:2.6, dir:g.dir}); }
  for (const c of G.clones) { if (c.t < -.3 || (c.done && c.t > .6)) continue; const a = c.t < 0 ? (c.t + .3)/.3 : c.done ? 1 - (c.t - .3)/.3 : 1;
    ctx.globalCompositeOperation = 'source-over'; drawPoke(c.f, c.x, c.y + FOOT, .55*Math.max(0, a), {name:'Walk', el:now, rate:2, dir:c.dir});
    ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = .4*Math.max(0, a); ctx.drawImage(glowTex('#8a4ad8'), c.x-40, c.y-50, 80, 80); }
  for (const r of G.recalls) { const k = r.t/r.max; ctx.save(); ctx.translate(r.x, r.y + FOOT); ctx.scale(k, k); ctx.translate(-r.x, -(r.y + FOOT));
    ctx.globalCompositeOperation = 'lighter'; drawPoke(r.f, r.x, r.y + FOOT, k, {name:'Idle', el:0, dir:r.dir}); drawPoke(r.f, r.x, r.y + FOOT, k, {name:'Idle', el:0, dir:r.dir}); ctx.restore();
    ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = k; ctx.drawImage(glowTex('#ff4d4d'), r.x-40, r.y-60, 80, 80);
    ctx.strokeStyle = `rgba(255,80,80,${k})`; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(r.x, r.y - 20); ctx.lineTo(r.x - (r.f.team ? -1 : 1)*300, r.y - 400); ctx.stroke(); }
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
}
function drawFloor(now){
  const g = ctx;
  g.imageSmoothingEnabled = false;
  g.drawImage(buildGround(MAP), -MARGEM, -MARGEM, W + MARGEM*2, H + MARGEM*2);
  drawDecor(now, 'fundo');
  drawTerrainAnim(now);
  drawDecor(now, 'chao');
  for (const d of G.decals) {
    g.globalAlpha = Math.min(1, d.t/2)*.45;
    if (d.k === 'scorch') { const rg = g.createRadialGradient(d.x,d.y,0,d.x,d.y,d.r); rg.addColorStop(0,'#1a1410cc'); rg.addColorStop(.6,'#2a201855'); rg.addColorStop(1,'#00000000'); g.fillStyle = rg; g.beginPath(); g.ellipse(d.x,d.y,d.r,d.r*.6,0,0,7); g.fill(); }
    else { g.strokeStyle = '#4a4438'; g.lineWidth = 3; let s = d.seed*1000;
      for (let i=0;i<7;i++){ const a = i/7*Math.PI*2 + (s%1); let x = d.x, y = d.y; g.beginPath(); g.moveTo(x,y);
        for (let k=1;k<=4;k++){ s = (s*9301+49297)%233280; x = d.x + Math.cos(a + (s/233280-.5)*.6)*d.r*k/4; y = d.y + Math.sin(a + (s/233280-.5)*.6)*d.r*k/4*.6; g.lineTo(x,y); } g.stroke(); } }
  }
  g.globalAlpha = 1;
  for (const p of G.pools) {
    const k = Math.min(1, p.t*1.5, (p.max - p.t)*6 + .2), col = TC(p.m.t);
    g.globalAlpha = k*.75;
    const rg = g.createRadialGradient(p.x, p.y, p.r*.1, p.x, p.y, p.r); rg.addColorStop(0, C2(p.m.t)); rg.addColorStop(.5, col); rg.addColorStop(1, col+'00');
    g.fillStyle = rg; g.beginPath();
    for (let i=0;i<=24;i++){ const a = i/24*Math.PI*2, wob = 1 + Math.sin(a*5 + now*3)*.06; g.lineTo(p.x + Math.cos(a)*p.r*wob, p.y + Math.sin(a)*p.r*.6*wob); }
    g.fill();
  }
  g.globalAlpha = 1;
  for (const z of G.zones) {
    const k = 1 - z.t/z.max, col = TC(z.m.t), pulse = .6 + Math.sin(now*20)*.4;
    g.save(); g.translate(z.x, z.y); g.scale(1, .6);
    g.fillStyle = col + (z.m.ult ? '60' : '40'); g.beginPath(); g.arc(0,0,z.r*k,0,7); g.fill();
    g.strokeStyle = z.owner.team === 0 ? `rgba(80,140,255,${.5+pulse*.5})` : `rgba(255,60,90,${.5+pulse*.5})`; g.lineWidth = z.m.ult ? 6 : 4; g.setLineDash([14,10]); g.lineDashOffset = -now*60;
    g.beginPath(); g.arc(0,0,z.r,0,7); g.stroke(); g.setLineDash([]);
    g.strokeStyle = '#ffffffaa'; g.lineWidth = 2; g.beginPath(); g.moveTo(-14,0); g.lineTo(14,0); g.moveTo(0,-14); g.lineTo(0,14); g.stroke();
    g.restore();
  }
  for (const w of G.waves) {
    const k = 1 - w.t/w.maxT, r = w.r + (w.max - w.r)*(1 - Math.pow(1-k, 3));
    g.save(); g.translate(w.x, w.y + FOOT); g.scale(1, .6);
    g.globalAlpha = (1-k)*.55; g.fillStyle = w.col; g.beginPath(); g.arc(0,0,r,0,7); g.fill();
    g.restore();
  }
  g.globalAlpha = 1;
  for (const it of G.items) {
    const I = ITENS[it.kind], bob = Math.sin(now*4 + it.x)*5, fade = it.t > 26 ? (Math.floor(now*8)%2 ? .4 : 1) : 1;
    g.fillStyle = '#00000035'; g.beginPath(); g.ellipse(it.x, it.y+8, 16, 6, 0, 0, 7); g.fill();
    g.globalAlpha = fade; g.globalCompositeOperation = 'lighter'; g.drawImage(glowTex(I.cor), it.x-34, it.y-34-14+bob, 68, 68); g.globalCompositeOperation = 'source-over';
    g.fillStyle = '#ffffff'; g.beginPath(); g.arc(it.x, it.y-14+bob, 15, 0, 7); g.fill();
    g.strokeStyle = I.cor; g.lineWidth = 3; g.stroke();
    g.font = '16px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = I.cor; g.fillText(I.icone, it.x, it.y-13+bob); g.textBaseline = 'alphabetic';
    g.globalAlpha = 1;
  }
  for (const ti of [0,1]) { const f = active(ti); if (!f || !f.alive) continue;
    const sw = f.shadow*SPR*.55*(f.z > 20 ? .7 : 1);
    g.globalAlpha = f.hidden ? .3 : 1;
    g.fillStyle = '#00000045'; g.beginPath(); g.ellipse(f.x, f.y+FOOT, sw, sw*.4, 0, 0, 7); g.fill();
    g.strokeStyle = ti === 0 ? '#3b7bffcc' : '#ff4d6acc'; g.lineWidth = 3; g.beginPath(); g.ellipse(f.x, f.y+FOOT, sw+5, (sw+5)*.4, 0, 0, 7); g.stroke();
    if (f.en >= 100) { g.strokeStyle = TC(f.ult.t); g.lineWidth = 2; g.beginPath(); g.ellipse(f.x, f.y+FOOT, sw+10 + Math.sin(now*8)*3, (sw+10)*.4, 0, 0, 7); g.stroke(); }
    g.globalAlpha = 1; }
  for (const p of G.proj) { g.fillStyle = '#00000030'; g.beginPath(); g.ellipse(p.x, p.y+FOOT*.6, p.r*1.2, p.r*.5, 0, 0, 7); g.fill(); }
  const pm = active(0);
  if (pm && !G.over && !isTouch && S.aim !== 'auto') { g.strokeStyle = '#ffffffaa'; g.lineWidth = 4; g.setLineDash([10,10]); g.lineDashOffset = -now*40; g.beginPath();
    g.moveTo(pm.x + Math.cos(pm.aim)*40, pm.y + FOOT + Math.sin(pm.aim)*40*.8); g.lineTo(pm.x + Math.cos(pm.aim)*120, pm.y + FOOT + Math.sin(pm.aim)*120*.8); g.stroke(); g.setLineDash([]);
    const ax = pm.x + Math.cos(pm.aim)*130, ay = pm.y + FOOT + Math.sin(pm.aim)*130*.8; g.fillStyle = '#ffffffcc'; g.beginPath(); g.arc(ax, ay, 6, 0, 7); g.fill(); }
}
function star(c, x, y, r, inner, pts=4){
  c.beginPath(); for (let i=0;i<pts*2;i++){ const a = i/(pts*2)*Math.PI*2 - Math.PI/2, rr = i%2 ? r*inner : r; c.lineTo(x+Math.cos(a)*rr, y+Math.sin(a)*rr); } c.closePath();
}
function drawPart(p){
  const k = Math.max(0, p.t/p.max);
  switch (p.kind) {
    case 'glow': case 'flame': { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = Math.min(1, k*1.4);
      const s = p.size*(p.kind === 'flame' ? (.35 + .65*k) : (.5 + .5*k)); ctx.drawImage(glowTex(p.col), p.x-s, p.y-s, s*2, s*2); break; }
    case 'smoke': case 'dust': ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = k*.4; ctx.fillStyle = p.col;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size*(1.7 - k*.7), 0, 7); ctx.fill(); break;
    case 'drop': ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = k; ctx.fillStyle = p.col; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, 7); ctx.fill(); break;
    case 'bubble': ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = k; ctx.strokeStyle = p.col; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size*(1.2-k*.2), 0, 7); ctx.stroke(); ctx.fillStyle = '#ffffff88'; ctx.beginPath(); ctx.arc(p.x-p.size*.35, p.y-p.size*.35, p.size*.25, 0, 7); ctx.fill(); break;
    case 'spark': case 'wind': ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = k; ctx.strokeStyle = p.col; ctx.lineWidth = p.size*(.4+.6*k); ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx*.045, p.y - p.vy*.045); ctx.stroke(); break;
    case 'bolt': { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = k; ctx.lineJoin = 'round';
      for (const [lw,c] of [[6,p.col],[2,'#ffffff']]) { ctx.strokeStyle = c; ctx.lineWidth = lw*((p.size||2)/2.5); ctx.beginPath(); p.pts.forEach(([x,y],i) => i ? ctx.lineTo(x,y) : ctx.moveTo(x,y)); ctx.stroke(); } break; }
    case 'leaf': ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = k; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
      ctx.fillStyle = p.col; ctx.beginPath(); ctx.ellipse(0, 0, p.size, p.size*.45, 0, 0, 7); ctx.fill();
      ctx.strokeStyle = '#2f6b1a'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-p.size, 0); ctx.lineTo(p.size, 0); ctx.stroke(); ctx.restore(); break;
    case 'shard': ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = k; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
      ctx.fillStyle = p.col; ctx.beginPath(); ctx.moveTo(0, -p.size*1.3); ctx.lineTo(p.size*.5, 0); ctx.lineTo(0, p.size*1.3); ctx.lineTo(-p.size*.5, 0); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1; ctx.stroke(); ctx.restore(); break;
    case 'star': ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = k; ctx.fillStyle = p.col; star(ctx, p.x, p.y, p.size*(.6+.4*k), .38); ctx.fill(); break;
    case 'impact': { ctx.globalCompositeOperation = 'lighter'; const e = 1 - k; ctx.globalAlpha = k;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillStyle = p.col; star(ctx, 0, 0, p.size*(.4 + e*.8), .18, 4); ctx.fill();
      ctx.rotate(Math.PI/4); star(ctx, 0, 0, p.size*(.25 + e*.5), .2, 4); ctx.fill(); ctx.restore(); break; }
    case 'rock': ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = Math.min(1, k*2); ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
      ctx.fillStyle = p.col; ctx.beginPath(); ctx.moveTo(-p.size, -p.size*.4); ctx.lineTo(-p.size*.2, -p.size); ctx.lineTo(p.size, -p.size*.3); ctx.lineTo(p.size*.6, p.size*.8); ctx.lineTo(-p.size*.6, p.size*.7); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#ffffff33'; ctx.fillRect(-p.size*.4, -p.size*.6, p.size*.6, p.size*.3); ctx.restore(); break;
    case 'ring': ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = k; ctx.strokeStyle = p.col; ctx.lineWidth = 4*k + 1;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size + (p.size2 - p.size)*(1-k), 0, 7); ctx.stroke(); break;
    case 'plus': { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = k; ctx.fillStyle = p.col; const s = p.size;
      ctx.fillRect(p.x - s, p.y - s*.3, s*2, s*.6); ctx.fillRect(p.x - s*.3, p.y - s, s*.6, s*2); break; }
    case 'spike': { ctx.globalCompositeOperation = 'source-over'; const e = 1 - k, h = p.size*2.4*Math.sin(Math.min(1, e*3)*Math.PI/2)*(k < .3 ? k/.3 : 1);
      ctx.globalAlpha = 1; ctx.fillStyle = p.col; ctx.beginPath(); ctx.moveTo(p.x - p.size*.5, p.y); ctx.lineTo(p.x, p.y - h); ctx.lineTo(p.x + p.size*.5, p.y); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#ffffff40'; ctx.beginPath(); ctx.moveTo(p.x - p.size*.15, p.y); ctx.lineTo(p.x, p.y - h); ctx.lineTo(p.x + p.size*.1, p.y); ctx.closePath(); ctx.fill(); break; }
  }
}
function drawProj(p, now){
  const x = p.x, y = p.y - HGT, t = p.type, col = TC(t), c2 = C2(t), r = p.r, a = Math.atan2(p.vy, p.vx);
  ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 1;
  ctx.drawImage(glowTex(col), x - r*3.2, y - r*3.2, r*6.4, r*6.4);
  ctx.save(); ctx.translate(x, y);
  if (p.m.ult) { ctx.rotate(now*4); ctx.strokeStyle = c2; ctx.lineWidth = 4; for (let i=0;i<3;i++){ ctx.beginPath(); ctx.arc(0, 0, r*(.7 + i*.25), i, i + 4); ctx.stroke(); }
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(0, 0, r*.5, 0, 7); ctx.fill(); ctx.restore(); return; }
  switch (t) {
    case 'grass': ctx.globalCompositeOperation = 'source-over'; ctx.rotate(p.rot);
      ctx.fillStyle = '#5fb83a'; ctx.beginPath(); ctx.ellipse(0, 0, r*1.5, r*.6, 0, 0, 7); ctx.fill();
      ctx.fillStyle = c2; ctx.beginPath(); ctx.ellipse(-r*.2, -r*.1, r*.9, r*.25, 0, 0, 7); ctx.fill(); break;
    case 'rock': case 'ground': ctx.globalCompositeOperation = 'source-over'; ctx.rotate(p.rot*.5);
      ctx.fillStyle = t === 'rock' ? '#9c8a62' : '#b8945a'; ctx.beginPath(); ctx.moveTo(-r, -r*.4); ctx.lineTo(-r*.2, -r); ctx.lineTo(r, -r*.3); ctx.lineTo(r*.7, r*.8); ctx.lineTo(-r*.6, r*.8); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#ffffff40'; ctx.fillRect(-r*.4, -r*.6, r*.7, r*.3); break;
    case 'ice': ctx.rotate(a); ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = '#c8f4ff'; ctx.beginPath(); ctx.moveTo(r*2, 0); ctx.lineTo(0, r*.6); ctx.lineTo(-r*1.2, 0); ctx.lineTo(0, -r*.6); ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke(); break;
    case 'water': ctx.rotate(a);
      ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(0, 0, r*1.8, r*.9, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(r*.4, -r*.25, r*.6, r*.25, 0, 0, 7); ctx.fill(); break;
    case 'electric': ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(0, 0, r*.8, 0, 7); ctx.fill();
      ctx.strokeStyle = col; ctx.lineWidth = 2;
      for (let i=0;i<3;i++){ const b = rand(0,7); ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(Math.cos(b)*r*1.2 + rand(-4,4), Math.sin(b)*r*1.2 + rand(-4,4)); ctx.lineTo(Math.cos(b)*r*2.2, Math.sin(b)*r*2.2); ctx.stroke(); } break;
    case 'ghost': case 'dark': ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = t === 'ghost' ? '#22113a' : '#1a1218'; ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.fill();
      ctx.strokeStyle = c2; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(0, 0, r, now*6, now*6 + 4.2); ctx.stroke();
      ctx.fillStyle = c2; ctx.beginPath(); ctx.arc(-r*.3, -r*.3, r*.2, 0, 7); ctx.fill(); break;
    case 'psychic': ctx.strokeStyle = c2; ctx.lineWidth = 3; for (let i=0;i<2;i++){ ctx.beginPath(); ctx.arc(0, 0, r*(.6 + ((now*3 + i*.5)%1)*.9), 0, 7); ctx.stroke(); }
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(0, 0, r*.5, 0, 7); ctx.fill(); break;
    case 'fairy': case 'normal': ctx.rotate(p.rot); ctx.fillStyle = '#ffffff'; star(ctx, 0, 0, r*1.6, .4, 5); ctx.fill();
      ctx.fillStyle = col; star(ctx, 0, 0, r*.9, .4, 5); ctx.fill(); break;
    case 'fire': case 'dragon': { const fl = 1 + Math.sin(now*40 + p.seed)*.15;
      ctx.drawImage(glowTex(c2), -r*1.6*fl, -r*1.6*fl, r*3.2*fl, r*3.2*fl);
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(0, 0, r*.55, 0, 7); ctx.fill(); break; }
    case 'fighting': case 'steel': ctx.strokeStyle = c2; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, r*1.1, now*8, now*8 + 5); ctx.stroke();
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(0, 0, r*.6, 0, 7); ctx.fill(); break;
    default: ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(0, 0, r*.6, 0, 7); ctx.fill();
  }
  ctx.restore();
}
function drawBeam(b, now){
  const k = b.t/b.max, env = k > .85 ? (1-k)/.15 : Math.pow(k/.85, .6);
  const w = b.w * (.35 + .65*env), col = TC(b.type), c2 = C2(b.type);
  ctx.save(); ctx.translate(b.x, b.y - HGT); ctx.rotate(b.a); ctx.globalCompositeOperation = 'lighter';
  const wave = (wd, amp, ph) => { ctx.beginPath(); const n = Math.max(6, Math.ceil(b.len/24));
    for (let i=0;i<=n;i++){ const x = i/n*b.len; ctx.lineTo(x, -wd/2 + Math.sin(x*.05 + now*40 + ph)*amp); }
    for (let i=n;i>=0;i--){ const x = i/n*b.len; ctx.lineTo(x, wd/2 + Math.sin(x*.05 + now*40 + ph + 1.7)*amp); } ctx.closePath(); };
  ctx.globalAlpha = .45*env; ctx.fillStyle = col; wave(w*2.4, 4, 0); ctx.fill();
  ctx.globalAlpha = .9*env; ctx.fillStyle = col; wave(w, 2.5, 1); ctx.fill();
  ctx.globalAlpha = env; ctx.fillStyle = c2; wave(w*.45, 1.5, 2); ctx.fill();
  ctx.fillStyle = '#ffffff'; ctx.fillRect(0, -w*.1, b.len, w*.2);
  const g1 = w*2.2; ctx.drawImage(glowTex(col), -g1, -g1, g1*2, g1*2);
  const g2 = w*2.8*(.8 + Math.sin(now*50)*.2); ctx.drawImage(glowTex(col), b.len - g2, -g2, g2*2, g2*2);
  ctx.restore(); ctx.globalCompositeOperation = 'source-over';
}
function drawSlash(s){
  const k = s.t/s.max, e = 1 - k, col = TC(s.type), c2 = C2(s.type);
  ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(s.a); ctx.globalAlpha = Math.min(1, k*1.6);
  const R = s.r*.95;
  if (s.style === 'fang') {
    const off = 26*(1 - Math.min(1, e*2.5)), cx = R*.75;
    for (const sg of [-1, 1]) {
      ctx.fillStyle = '#ffffff'; ctx.strokeStyle = col; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(cx-28, sg*(off+4)); ctx.quadraticCurveTo(cx, sg*(off+20), cx+28, sg*(off+4));
      for (let i=4;i>=0;i--){ const x = cx-24 + i*12; ctx.lineTo(x+6, sg*(off+4)); ctx.lineTo(x, sg*(off-10)); }
      ctx.closePath(); ctx.fill(); ctx.stroke();
    }
  } else if (s.style === 'punch') {
    ctx.globalCompositeOperation = 'lighter';
    const px = R*.55 + e*R*.45;
    ctx.drawImage(glowTex(col), px-40, -40, 80, 80);
    ctx.fillStyle = '#ffffff'; star(ctx, px, 0, 30*(.5+e), .3, 6); ctx.fill();
    ctx.strokeStyle = c2; ctx.lineWidth = 4; for (let i=-2;i<=2;i++){ ctx.beginPath(); ctx.moveTo(px-50-e*30, i*9); ctx.lineTo(px-20-e*30, i*9); ctx.stroke(); }
  } else {
    const sweeps = s.style === 'cross' ? [-1, 1] : [1];
    ctx.globalCompositeOperation = 'lighter';
    for (const sg of sweeps) {
      ctx.save(); if (s.style === 'cross') ctx.rotate(sg*.5);
      const a0 = -1.1, a1 = a0 + 2.2*Math.min(1, e*2.2);
      const grad = ctx.createLinearGradient(0, -R, 0, R); grad.addColorStop(0, c2); grad.addColorStop(.5, col); grad.addColorStop(1, c2);
      ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(0, 0, R, a0, a1); ctx.arc(R*.18, 0, R*.78, a1, a0, true); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, R, a0, a1); ctx.stroke();
      ctx.restore();
    }
  }
  ctx.restore(); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
}
function drawZoneFall(z, now){
  const k = 1 - z.t/z.max, t = z.m.t, col = TC(t);
  if (z.marker || t === 'electric' || t === 'ground') return;
  if (t === 'psychic') { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = .8; ctx.strokeStyle = C2(t); ctx.lineWidth = 3;
    for (let i=0;i<3;i++){ const rr = z.r*(1 - ((k*2 + i/3)%1)); ctx.beginPath(); ctx.ellipse(z.x, z.y-10, rr, rr*.55, 0, 0, 7); ctx.stroke(); }
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; return; }
  if (k < .25) return;
  const hh = 600*(1 - (k-.25)/.75), r = Math.min(z.m.ult ? 60 : 40, z.r*.32);
  const x = z.x, y = z.y - hh;
  ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 1;
  ctx.drawImage(glowTex(col), x - r*3, y - r*3, r*6, r*6);
  ctx.globalCompositeOperation = 'source-over';
  if (t === 'rock') { ctx.fillStyle = '#9c8a62'; ctx.beginPath(); ctx.arc(x, y, r*.8, 0, 7); ctx.fill(); }
  else if (t === 'ice') { ctx.fillStyle = '#d8f6ff'; ctx.beginPath(); ctx.moveTo(x, y+r*1.4); ctx.lineTo(x+r*.5, y-r*.6); ctx.lineTo(x-r*.5, y-r*.6); ctx.closePath(); ctx.fill(); }
  else { ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(glowTex(C2(t)), x - r*1.4, y - r*1.4, r*2.8, r*2.8); ctx.globalCompositeOperation = 'source-over'; }
}
function drawBars(f){
  const top = f.y + FOOT - f.z - f.topH - 14;
  ctx.save(); ctx.translate(f.x, top); ctx.globalAlpha = f.hidden && f.team === 1 ? .35 : 1;
  const bw = 66, r = Math.max(0, f.hp/f.maxhp);
  ctx.fillStyle = '#0b1030dd'; ctx.fillRect(-bw/2-2, -2, bw+4, 13);
  ctx.fillStyle = r > .5 ? '#3ddc84' : r > .2 ? '#ffd23f' : '#ff4d6a'; ctx.fillRect(-bw/2, 0, bw*r, 6);
  ctx.fillStyle = '#ffffff55'; ctx.fillRect(-bw/2, 0, bw*r, 2);
  ctx.fillStyle = f.en >= 100 ? (Math.floor(performance.now()/150)%2 ? '#ffffff' : TC(f.ult.t)) : '#ffb300'; ctx.fillRect(-bw/2, 8, bw*f.en/100, 3);
  ctx.font = '600 12px Rubik, sans-serif'; ctx.textAlign = 'center';
  ctx.lineWidth = 3; ctx.strokeStyle = '#0b1030'; ctx.strokeText(f.p.name, 0, -6); ctx.fillStyle = '#fff'; ctx.fillText(f.p.name, 0, -6);
  const sts = [['burn','#ff7a2e'],['poison','#b04fd0'],['slow','#7fd6ff'],['stun','#ffe14d']].filter(([k]) => f.st[k] > 0);
  if (f.bAtk > 0) sts.push(['atk','#ff4d6a']); if (f.bSpd > 0) sts.push(['spd','#ffd23f']);
  if (f.mk.molhado > 0) sts.push(['mol','#2a72c7']); if (f.mk.frio > 0) sts.push(['frio','#cfefff']);
  sts.forEach(([k,c],i) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(bw/2 + 9 + i*10, 3, 4, 0, 7); ctx.fill(); });
  if (f.labelT > 0) {
    ctx.globalAlpha = Math.min(1, f.labelT*3); ctx.font = '9px "Press Start 2P", monospace';
    const tw = ctx.measureText(f.label).width + 14;
    ctx.fillStyle = '#0b1030e6'; ctx.fillRect(-tw/2, -38, tw, 19);
    ctx.fillStyle = f.team === 0 ? '#9cc2ff' : '#ffb0c0'; ctx.fillRect(-tw/2, -38, 3, 19);
    ctx.fillStyle = '#fff'; ctx.fillText(f.label, 0, -24); ctx.globalAlpha = 1;
  }
  ctx.restore();
}
function drawObstaculo(o, fs){
  if (o.filho || o.dead) return;
  const sp = obstSprite(o.tipo, o.r);
  const atras = fs.some(f => f.y < o.y && f.y > o.y - o.r*4.5 && Math.abs(f.x - o.x) < o.r*2.2);
  ctx.globalAlpha = atras ? .55 : 1; ctx.imageSmoothingEnabled = false;
  const sx = o.hitT > 0 ? Math.sin(o.hitT*80)*3 : 0;
  ctx.drawImage(sp.c, o.x - sp.ox + sx, o.y - sp.oy, sp.c.width*PXA, sp.c.height*PXA);
  if (o.hitT > 0) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = .5; ctx.drawImage(sp.c, o.x - sp.ox + sx, o.y - sp.oy, sp.c.width*PXA, sp.c.height*PXA); ctx.globalCompositeOperation = 'source-over'; }
  ctx.globalAlpha = 1;
  if (o.maxhp && o.hp < o.maxhp) { const w = 40; ctx.fillStyle = '#0008'; ctx.fillRect(o.x - w/2, o.y + 10, w, 5); ctx.fillStyle = '#ffd23f'; ctx.fillRect(o.x - w/2, o.y + 10, w*o.hp/o.maxhp, 5); }
  if (o.tipo === 'cristal') { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = .25 + Math.sin(performance.now()/400 + o.x)*.1; ctx.drawImage(glowTex('#9fe2ff'), o.x-50, o.y-90, 100, 100); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; }
  if (o.tipo === 'gerador') { if (Math.random() < .08) P({kind:'bolt', x:0, y:0, pts:zig(o.x, o.y-o.r*1.6, o.x+rand(-30,30), o.y-o.r*1.6-rand(10,30), 4, 6), t:.1, col:'#29e3ff', vx:0, vy:0, size:2}); }
  if (o.tipo === 'alavanca' && o.cd > 0) { ctx.fillStyle = '#ffffffcc'; ctx.font = '700 12px Rubik'; ctx.textAlign = 'center'; ctx.fillText(Math.ceil(o.cd), o.x, o.y - o.r*3); }
}
function drawCine(now){
  const c = G.cine; if (!c) return;
  c.t -= 1/60; if (c.t <= 0) { G.cine = null; return; }
  const k = c.t/c.max, e = 1 - k, ent = Math.min(1, e*5), sai = Math.min(1, k*4), a = Math.min(ent, sai);
  ctx.setTransform(DPR,0,0,DPR,0,0);
  ctx.fillStyle = `rgba(0,0,0,${.45*a})`; ctx.fillRect(0, 0, VW, VH);
  const bh = Math.min(170, VH*.28), by = VH*.5 - bh/2;
  ctx.save(); ctx.globalAlpha = a;
  const lg = ctx.createLinearGradient(0, by, VW, by); lg.addColorStop(0, c.f.team === 0 ? '#1d3fb8' : '#b81d3f'); lg.addColorStop(1, c.col);
  ctx.fillStyle = lg; ctx.beginPath(); ctx.moveTo(0, by + 20); ctx.lineTo(VW, by); ctx.lineTo(VW, by + bh - 20); ctx.lineTo(0, by + bh); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#ffffff40'; ctx.lineWidth = 2; for (let i=0;i<14;i++){ const yy = by + 10 + i*bh/14, off = ((now*900 + i*137) % (VW + 300)) - 300; ctx.beginPath(); ctx.moveTo(off, yy); ctx.lineTo(off + 220, yy); ctx.stroke(); }
  const im = getImg(c.f.p.id); const slide = (1 - ent)*-300;
  if (im.complete && im.naturalWidth) { ctx.imageSmoothingEnabled = false; const s = bh*1.25; ctx.save(); ctx.translate(VW*.22 + slide, by + bh/2); if (c.f.team === 0) ctx.scale(-1,1); ctx.drawImage(im, -s/2, -s/2, s, s); ctx.restore(); }
  const fs = Math.min(34, VW/22);
  ctx.font = `${fs}px "Press Start 2P", monospace`; ctx.textAlign = 'left'; ctx.lineWidth = 6; ctx.strokeStyle = '#000';
  const tx = VW*.4 - slide*.5;
  ctx.strokeText(c.nome.toUpperCase(), tx, by + bh/2 + fs*.35); ctx.fillStyle = '#ffffff'; ctx.fillText(c.nome.toUpperCase(), tx, by + bh/2 + fs*.35);
  ctx.font = `700 ${Math.max(12, fs*.45)}px Rubik, sans-serif`; ctx.fillStyle = '#ffe9a8'; ctx.fillText(c.f.p.name + ' · ULTIMATE', tx, by + bh/2 - fs*.6);
  ctx.restore();
}
function render(){
  ctx.setTransform(DPR,0,0,DPR,0,0);
  ctx.fillStyle = '#15182a'; ctx.fillRect(0,0,VW,VH);
  if (!G) return;
  const now = performance.now()/1000;
  G.scale = clamp(VW > VH ? Math.min(VW/1150, VH/720) : Math.min(VW/620, VH/900), .45, 1.4);
  const foco = focoCinematico();                          // V15: câmera das cinemáticas
  G.zoom = (G.zoom || 1) + ((foco ? foco.zoom : 1) - (G.zoom || 1))*.08;
  G.scale *= G.zoom;
  const me = active(0) || active(1);
  const tgt = foco ? foco : me ? {x:me.x, y:me.y} : (G.teams[0].last ? {x:G.teams[0].last[0], y:G.teams[0].last[1]} : {x:W/2,y:H/2});
  G.cam.x += (tgt.x - G.cam.x)*.12; G.cam.y += (tgt.y - G.cam.y)*.12;
  const hw = VW/2/G.scale, hh = VH/2/G.scale, mg = MARGEM*.85 + (G.zoom > 1.05 ? 200 : 0);
  const cx = hw*2 >= W + mg*2 ? W/2 : clamp(G.cam.x, hw - mg, W - hw + mg), cy = hh*2 >= H + mg*2 ? H/2 : clamp(G.cam.y, hh - mg, H - hh + mg);
  G.cam.x = cx; G.cam.y = cy;
  const shx = rand(-G.shake, G.shake), shy = rand(-G.shake, G.shake);
  const ox = VW/2 - cx*G.scale + shx, oy = VH/2 - cy*G.scale + shy;
  ctx.setTransform(DPR*G.scale, 0, 0, DPR*G.scale, DPR*ox, DPR*oy);
  drawFloor(now);
  drawGhosts(now);
  const objs = OBST.filter(o => !o.filho && !o.dead).map(o => ({y:o.y, o}));
  for (const ti of [0,1]) { const f = active(ti); if (f && f.alive) objs.push({y:f.y, f}); }
  for (const d of G.dying) objs.push({y:d.y, d});
  objs.sort((a,b) => a.y - b.y);
  const fs = [active(0), active(1)].filter(f => f && f.alive);
  for (const ob of objs) { if (ob.f) drawFighter(ob.f, now); else if (ob.d) drawDying(ob.d, now); else drawObstaculo(ob.o, fs); }
  desenharAuraMega(now); desenharPokebolas(now);
  drawWarnFalls(now);
  for (const z of G.zones) drawZoneFall(z, now);
  for (const s of G.slashes) drawSlash(s);
  for (const b of G.beams) drawBeam(b, now);
  for (const p of G.proj) drawProj(p, now);
  ctx.globalCompositeOperation = 'source-over';
  for (const p of G.parts) drawPart(p);
  ctx.globalCompositeOperation = 'lighter';
  for (const s of G.strikes) { const k = s.t/s.max; ctx.globalAlpha = k; ctx.lineJoin = 'round';
    for (const [lw,c] of [[16, '#f7d02c88'],[7, '#f7d02c'],[3,'#ffffff']]) { ctx.strokeStyle = c; ctx.lineWidth = lw; ctx.beginPath(); s.pts.forEach(([x,y],i) => i ? ctx.lineTo(x,y) : ctx.moveTo(x,y)); ctx.stroke(); } }
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  drawAmbient(now);
  drawDecor(now, 'luz');
  drawLighting(now, ox, oy);
  ctx.setTransform(DPR*G.scale, 0, 0, DPR*G.scale, DPR*ox, DPR*oy);
  for (const ti of [0,1]) { const f = active(ti); if (f && f.alive && !(f.entrada && !f.entrada.abriu)) drawBars(f); }
  ctx.textAlign = 'center';
  for (const t of G.texts) {
    const pop = t.pop < .12 ? 1 + (1 - t.pop/.12)*.6 : 1;
    ctx.globalAlpha = Math.min(1, t.t*2); ctx.font = `800 ${Math.round(t.size*pop)}px Rubik, sans-serif`; ctx.lineWidth = 5; ctx.strokeStyle = '#0b1030';
    ctx.strokeText(t.txt, t.x, t.y); ctx.fillStyle = t.col; ctx.fillText(t.txt, t.x, t.y);
  }
  ctx.globalAlpha = 1;
  ctx.setTransform(DPR,0,0,DPR,0,0);
  desenharCinema2D(now);
  if (G.flash > 0) { ctx.fillStyle = `rgba(${G.flashCol},${Math.min(.5, G.flash*2)})`; ctx.fillRect(0,0,VW,VH); }
  if (G.time <= 10 && !G.over && G.started) { ctx.fillStyle = `rgba(255,40,70,${.08 + Math.sin(now*8)*.05})`; ctx.fillRect(0,0,VW,VH); }
  drawCine(now);
}

/* ----- Loop ----- */
let last = performance.now(), hudT = 0;
function loop(now){
  const dt = Math.min(.033, (now-last)/1000); last = now;
  try {
    update(dt); render();
    if (G) { hudT -= dt; if (hudT <= 0) { hudT = .05; updateHud(); } }
  } catch (err) { console.error(err); }
  requestAnimationFrame(loop);
}
renderHome();
if (!isTouch) { atualizarDicas(); $('#btnCtrl').onclick = () => abrirControles(); } else $('#btnCtrl').classList.add('hidden');
iniciarAbertura2D();
requestAnimationFrame(loop);
