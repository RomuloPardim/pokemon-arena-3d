/* =========================================================
   AMBIENTE (clima, partículas do cenário, luz)
   ========================================================= */
function viewRect(){ const hw = VW/2/G.scale, hh = VH/2/G.scale; return [G.cam.x - hw, G.cam.y - hh, G.cam.x + hw, G.cam.y + hh]; }
function updateAmbient(dt){
  const cap = FX_LEVE() ? 45 : 140, [x0,y0,x1,y1] = viewRect(), A = G.amb;
  const novo = (o) => { if (A.length < cap) A.push(o); };
  const taxa = {folhas:4, cinzas:9, neve:16, brisa:3, poeira:4, chuva_leve:40, chuva:90, vagalumes:0, petalas:5, confete:G.hype > 0 ? 25 : 1}[MAP.clima] || 0;
  let n = taxa*dt*(FX_LEVE() ? .4 : 1); while (n > 0) { if (Math.random() < n) {
    const x = rand(x0 - 100, x1 + 100), y = rand(y0 - 100, y0 + 20);
    switch (MAP.clima) {
      case 'folhas': novo({k:'folha', x, y, vx:rand(10,50), vy:rand(30,60), rot:rand(0,7), vr:rand(-3,3), t:8, col:['#7cbf4a','#a8c94a','#e0a040'][Math.floor(Math.random()*3)]}); break;
      case 'petalas': novo({k:'folha', x, y, vx:rand(20,70), vy:rand(25,50), rot:rand(0,7), vr:rand(-4,4), t:8, col:['#ffc6e0','#ffe0ee','#ffffff'][Math.floor(Math.random()*3)]}); break;
      case 'cinzas': Math.random() < .3 ? novo({k:'brasa', x:rand(x0,x1), y:rand(y0,y1)+200, vx:rand(-10,10), vy:-rand(30,70), t:4, col:'#ff8a2a'}) : novo({k:'cinza', x, y:rand(y0,y1), vx:rand(-15,15), vy:rand(-10,15), t:6, col:'#9a8f8a'}); break;
      case 'neve': novo({k:'neve', x, y, vx:rand(-15,15), vy:rand(40,80), t:12, s:rand(1.5,3.5)}); break;
      case 'brisa': novo({k:'cinza', x:x0 - 50, y:rand(y0,y1), vx:rand(120,200), vy:rand(-10,10), t:9, col:'#fff5d6'}); break;
      case 'poeira': novo({k:'brasa', x:rand(x0,x1), y:rand(y0,y1), vx:rand(-8,8), vy:rand(-15,5), t:5, col:'#ffe9a8'}); break;
      case 'chuva_leve': case 'chuva': novo({k:'chuva', x:rand(x0-100,x1+100), y:rand(y0-60,y1), vx:MAP.clima === 'chuva' ? -180 : -60, vy:900, t:rand(.25,.6)}); break;
      case 'confete': novo({k:'confete', x:rand(x0,x1), y:y0 - 20, vx:rand(-30,30), vy:rand(80,160), rot:rand(0,7), vr:rand(-8,8), t:6, col:['#ff6b6b','#ffd93d','#6bcbff','#7bed9f','#ff9ff3'][Math.floor(Math.random()*5)]}); break;
    } } n -= 1; }
  if (MAP.clima === 'vagalumes') while (A.length < (FX_LEVE() ? 8 : 22)) A.push({k:'vagalume', x:rand(0,W), y:rand(0,H), vx:rand(-20,20), vy:rand(-20,20), t:rand(6,12), ph:rand(0,7)});
  for (const p of A) { p.t -= dt; p.x += p.vx*dt; p.y += p.vy*dt; if (p.vr) p.rot += p.vr*dt;
    if (p.k === 'folha') p.vx += Math.sin(G.clock*2 + p.rot)*20*dt;
    if (p.k === 'vagalume') { p.vx += rand(-30,30)*dt; p.vy += rand(-30,30)*dt; }
    if (p.k === 'chuva' && p.t <= 0 && !FX_LEVE() && Math.random() < .3) G.amb.push({k:'respingo', x:p.x, y:p.y, vx:0, vy:0, t:.25}); }
  G.amb = A.filter(p => p.t > 0 && p.y < y1 + 150);
  // relâmpagos de fundo no templo
  if (MAP.clima === 'chuva' && Math.random() < dt*.08) { G.flash = .18; G.flashCol = '220,230,255'; setTimeout(() => sfx('thunder'), 300); }
  // fumaça das crateras
  for (const d of (MAP.decor || [])) if (d[2] === 'cratera' && Math.random() < dt*4) P({kind:'smoke', x:d[0]+rand(-12,12), y:d[1]-10, vx:rand(-10,10), vy:-rand(30,60), t:rand(1,1.6), size:rand(12,20), col:'#5a4a44'});
  // bolhas de lava
  if (Math.random() < dt*6) for (const t of TERR) if (t.tipo === 'lava' && Math.random() < .3) { const px = rand(t.bb[0], t.bb[2]), py = rand(t.bb[1], t.bb[3]); if (inTerrain(t, px, py)) P({kind:'flame', x:px, y:py, vx:0, vy:-rand(20,60), t:.6, size:rand(6,11), col:'#ffb03a'}); }
}
function drawAmbient(now){
  for (const p of G.amb) {
    switch (p.k) {
      case 'folha': case 'confete': ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillStyle = p.col; ctx.globalAlpha = Math.min(1, p.t);
        if (p.k === 'folha') { ctx.beginPath(); ctx.ellipse(0, 0, 6, 3, 0, 0, 7); ctx.fill(); } else ctx.fillRect(-4, -2, 8, 4); ctx.restore(); break;
      case 'cinza': ctx.globalAlpha = Math.min(.8, p.t*.4); ctx.fillStyle = p.col; ctx.fillRect(p.x, p.y, 3, 3); break;
      case 'brasa': ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = Math.min(1, p.t*.5)*(.6 + Math.sin(now*9 + p.x)*.4); ctx.drawImage(glowTex(p.col), p.x-5, p.y-5, 10, 10); ctx.globalCompositeOperation = 'source-over'; break;
      case 'neve': ctx.globalAlpha = .85; ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(p.x + Math.sin(now + p.y*.02)*6, p.y, p.s, 0, 7); ctx.fill(); break;
      case 'chuva': ctx.globalAlpha = .45; ctx.strokeStyle = '#cfe0ff'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + p.vx*.03, p.y + p.vy*.03); ctx.stroke(); break;
      case 'respingo': ctx.globalAlpha = p.t*3; ctx.strokeStyle = '#cfe0ff'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(p.x, p.y, 8*(1-p.t*3)+2, 3, 0, 0, 7); ctx.stroke(); break;
      case 'vagalume': ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = .5 + Math.sin(now*3 + p.ph)*.5; ctx.drawImage(glowTex('#d6ff6a'), p.x-9, p.y-9, 18, 18); ctx.globalCompositeOperation = 'source-over'; break;
    }
  }
  ctx.globalAlpha = 1;
}
// enfeites animados do mapa (telão, bandeiras, holofotes, neon, cachoeiras, teleportes...)
function drawDecor(now, fase){
  for (const d of (MAP.decor || [])) {
    const [x, y, tipo] = d;
    if (fase === 'chao') {
      if (tipo === 'cratera') { ctx.fillStyle = '#140c0a'; ctx.beginPath(); ctx.ellipse(x, y, 46, 26, 0, 0, 7); ctx.fill(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = .5 + Math.sin(now*3 + x)*.2; ctx.drawImage(glowTex('#ff6a1a'), x-40, y-26, 80, 52); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; }
      if (tipo === 'cogumelo_luz') { for (const [dx,dy,s] of [[0,0,1],[-14,6,.7],[12,8,.6]]) { ctx.fillStyle = '#e8e0d0'; ctx.fillRect(x+dx-2*s, y+dy-10*s, 4*s, 10*s); ctx.fillStyle = '#5fe3c8'; ctx.beginPath(); ctx.ellipse(x+dx, y+dy-10*s, 8*s, 5*s, 0, Math.PI, 0); ctx.fill(); }
        ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = .45 + Math.sin(now*2 + x)*.2; ctx.drawImage(glowTex('#5fe3c8'), x-34, y-40, 68, 68); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; }
      if (tipo === 'cachoeira') { ctx.save(); ctx.globalAlpha = .9;
        for (let i=0;i<6;i++){ const xx = x - 30 + i*12, off = (now*160 + i*37) % 40; ctx.fillStyle = i%2 ? '#d8f0ff' : '#9fd3ff'; ctx.fillRect(xx, y, 9, 130);
          ctx.fillStyle = '#ffffff'; ctx.fillRect(xx, y + off, 9, 10); ctx.fillRect(xx, y + off + 60, 9, 8); }
        ctx.globalAlpha = .6; ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(x, y + 130, 46, 12, 0, 0, 7); ctx.fill(); ctx.restore(); }
    } else if (fase === 'fundo') {
      if (tipo === 'telao') { const a0 = active(0), a1 = active(1);
        ctx.fillStyle = '#10131c'; ctx.fillRect(x-270, y-80, 540, 150); ctx.fillStyle = '#05070c'; ctx.fillRect(x-258, y-70, 516, 130);
        ctx.fillStyle = '#e3350d'; ctx.beginPath(); ctx.arc(x-230, y-48, 6, 0, 7); ctx.fill(); if (Math.floor(now*2)%2) { ctx.font = '700 14px Rubik, sans-serif'; ctx.textAlign = 'left'; ctx.fillStyle = '#fff'; ctx.fillText('AO VIVO', x-218, y-43); }
        ctx.textAlign = 'center'; ctx.font = '700 26px "Press Start 2P", monospace'; ctx.fillStyle = '#ffd23f'; const s = Math.max(0, Math.ceil(G.time)); ctx.fillText(`${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`, x, y+18);
        for (const [f, sx, cor] of [[a0, -150, '#3b7bff'], [a1, 150, '#ff4d6a']]) if (f) { ctx.font = '700 15px Rubik, sans-serif'; ctx.fillStyle = cor; ctx.fillText(f.p.name, x+sx, y-20);
          ctx.fillStyle = '#222'; ctx.fillRect(x+sx-80, y-8, 160, 12); ctx.fillStyle = f.hp/f.maxhp > .5 ? '#3ddc84' : f.hp/f.maxhp > .2 ? '#ffd23f' : '#ff4d6a'; ctx.fillRect(x+sx-80, y-8, 160*Math.max(0, f.hp/f.maxhp), 12); }
        ctx.fillStyle = '#ffffff10'; for (let i=0;i<130;i+=4) ctx.fillRect(x-258, y-70+i, 516, 1); }
      if (tipo === 'bandeira') { const cor = x < W/2 ? '#3b7bff' : '#ff4d6a'; ctx.fillStyle = '#ccd'; ctx.fillRect(x-2, y-70, 4, 70);
        ctx.fillStyle = cor; ctx.beginPath(); ctx.moveTo(x+2, y-70); for (let i=0;i<=10;i++) ctx.lineTo(x + 2 + i*6, y - 70 + Math.sin(now*6 + i*.8 + x)*4*(i/10)); for (let i=10;i>=0;i--) ctx.lineTo(x + 2 + i*6, y - 42 + Math.sin(now*6 + i*.8 + x)*4*(i/10)); ctx.fill(); }
      if (tipo === 'neon') { const cor = d[3], txt = d[4], on = !(G.ev && G.ev.tipo === 'apagao' && Math.random() < .3) && !(Math.sin(now*13 + x) > .97);
        ctx.fillStyle = '#0a0b12'; ctx.fillRect(x-70, y-24, 140, 48);
        if (on) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = .6; ctx.drawImage(glowTex(cor), x-110, y-60, 220, 120); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }
        ctx.strokeStyle = on ? cor : '#333'; ctx.lineWidth = 3; ctx.strokeRect(x-66, y-20, 132, 40);
        ctx.font = '16px "Press Start 2P", monospace'; ctx.textAlign = 'center'; ctx.fillStyle = on ? '#ffffff' : '#444'; ctx.fillText(txt, x, y+8);
        if (on) { const ry = y < 0 ? 60 : H - 60; ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = .18; ctx.drawImage(glowTex(cor), x-80, ry-30, 160, 60); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; } }
    } else if (fase === 'luz') {
      if (tipo === 'holofote') { const a = Math.atan2(H/2 - y, W/2 - x) + Math.sin(now*.6 + x)*.35;
        ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = .07 + G.hype*.02;
        const lg = ctx.createLinearGradient(0, 0, 900, 0); lg.addColorStop(0, '#fff8d0'); lg.addColorStop(1, '#fff8d000');
        ctx.fillStyle = lg; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(900, -160); ctx.lineTo(900, 160); ctx.closePath(); ctx.fill(); ctx.restore(); ctx.globalAlpha = 1; }
    }
  }
  if (fase === 'chao') {
    for (const par of (MAP.teleportes || [])) for (const [x,y] of par) { const pulse = .6 + Math.sin(now*3 + x)*.4;
      ctx.strokeStyle = `rgba(120,220,255,${pulse})`; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(x, y, 34, 20, 0, 0, 7); ctx.stroke();
      ctx.save(); ctx.translate(x, y); ctx.scale(1, .6); ctx.rotate(now); ctx.strokeStyle = `rgba(160,240,255,${pulse*.8})`; ctx.lineWidth = 3;
      for (let i=0;i<6;i++){ const a = i/6*Math.PI*2; ctx.beginPath(); ctx.moveTo(Math.cos(a)*16, Math.sin(a)*16); ctx.lineTo(Math.cos(a)*28, Math.sin(a)*28); ctx.stroke(); } ctx.restore();
      ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = .35*pulse; ctx.drawImage(glowTex('#7cf0ff'), x-40, y-30, 80, 60); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
      if (Math.random() < .1) P({kind:'glow', x:x+rand(-20,20), y:y, vx:0, vy:-50, t:.6, size:6, col:'#7cf0ff'}); }
  }
}
function drawTerrainAnim(now){
  // brilho da lava, água, maré, poças de lava temporárias
  for (const t of TERR) {
    if (t.tipo === 'lava') { const [bx0,by0,bx1,by1] = t.bb; ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = .12 + Math.sin(now*2 + bx0)*.06;
      const R = Math.max(bx1-bx0, by1-by0)*.7; ctx.drawImage(glowTex('#ff9a2a'), (bx0+bx1)/2 - R, (by0+by1)/2 - R, R*2, R*2); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; }
    if ((t.tipo === 'agua' || t.tipo === 'agua_escura') && !FX_LEVE()) { const [bx0,by0,bx1,by1] = t.bb; ctx.strokeStyle = t.tipo === 'agua' ? '#ffffff60' : '#a0c08040'; ctx.lineWidth = 2;
      const n = Math.min(30, Math.max(4, (bx1-bx0)*(by1-by0)/12000));
      for (let i=0;i<n;i++){ const sx = bx0 + ((i*137.5 + now*22) % (bx1-bx0)), sy = by0 + ((i*73.3) % (by1-by0)) + Math.sin(now*2+i)*4;
        if (!inTerrain(t, sx, sy)) continue; ctx.beginPath(); ctx.moveTo(sx-9, sy); ctx.quadraticCurveTo(sx, sy-4, sx+9, sy); ctx.stroke(); } }
    if (t.mare) { const base = t.y + t.h;
      if (G.tide > 0) { const y1 = base + G.tide; const lg = ctx.createLinearGradient(0, base - 20, 0, y1); lg.addColorStop(0, '#3f8ad9'); lg.addColorStop(1, '#62a9e8cc');
        ctx.fillStyle = lg; ctx.beginPath(); ctx.moveTo(-MARGEM, base - 20); for (let x=-MARGEM; x<=W+MARGEM; x+=40) ctx.lineTo(x, y1 + Math.sin(x*.02 + now*2)*8); ctx.lineTo(W+MARGEM, base - 20); ctx.fill(); }
      const fy = base + G.tide;
      ctx.strokeStyle = '#ffffffcc'; ctx.lineWidth = 5; ctx.beginPath(); for (let x=-MARGEM; x<=W+MARGEM; x+=30) { const yy = fy + Math.sin(x*.02 + now*2)*8 + Math.sin(now*1.3)*6; x === -MARGEM ? ctx.moveTo(x, yy) : ctx.lineTo(x, yy); } ctx.stroke();
      const wv = (now*40) % 80; ctx.strokeStyle = '#ffffff55'; ctx.lineWidth = 3; ctx.beginPath(); for (let x=-MARGEM; x<=W+MARGEM; x+=30) { const yy = fy - 80 + wv + Math.sin(x*.03 + now)*6; x === -MARGEM ? ctx.moveTo(x, yy) : ctx.lineTo(x, yy); } ctx.stroke(); }
  }
  for (const t of G.tempTerr) { const k = Math.min(1, t.t); ctx.globalAlpha = .85*k; const rg = ctx.createRadialGradient(t.x, t.y, 4, t.x, t.y, t.rx); rg.addColorStop(0,'#ffd75a'); rg.addColorStop(.6,'#ff6a1a'); rg.addColorStop(1,'#c2280f00');
    ctx.fillStyle = rg; ctx.beginPath(); ctx.ellipse(t.x, t.y, t.rx, t.ry, 0, 0, 7); ctx.fill(); ctx.globalAlpha = 1; }
  for (const b of G.burnt) { ctx.globalAlpha = Math.min(.55, b.t*.1); ctx.fillStyle = '#1a140e'; ctx.beginPath(); ctx.ellipse(b.x, b.y, b.r, b.r*.65, 0, 0, 7); ctx.fill(); ctx.globalAlpha = 1; }
  for (const v of G.vines) { ctx.globalAlpha = Math.min(1, v.t)*.75; ctx.strokeStyle = '#2f7a24'; ctx.lineWidth = 5;
    for (let i=0;i<7;i++){ const a = i/7*Math.PI*2 + now*.2; ctx.beginPath(); ctx.moveTo(v.x, v.y); ctx.quadraticCurveTo(v.x + Math.cos(a+.6)*v.r*.6, v.y + Math.sin(a+.6)*v.r*.35, v.x + Math.cos(a)*v.r, v.y + Math.sin(a)*v.r*.6); ctx.stroke(); }
    ctx.fillStyle = '#5fb83a'; for (let i=0;i<10;i++){ const a = i*2.4, r = v.r*(.3 + (i%3)*.25); ctx.beginPath(); ctx.ellipse(v.x + Math.cos(a)*r, v.y + Math.sin(a)*r*.6, 6, 3, a, 0, 7); ctx.fill(); } ctx.globalAlpha = 1; }
  for (const z of G.fires) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = Math.min(1, z.t)*.5; ctx.drawImage(glowTex('#ff6a1a'), z.x - z.r*1.2, z.y - z.r*.8, z.r*2.4, z.r*1.6); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; }
  for (const z of G.fields) { ctx.globalAlpha = Math.min(1, z.t)*.5; ctx.strokeStyle = '#ffe14d'; ctx.lineWidth = 3; ctx.setLineDash([8,8]); ctx.lineDashOffset = -now*80; ctx.beginPath(); ctx.ellipse(z.x, z.y, z.r, z.r*.6, 0, 0, 7); ctx.stroke(); ctx.setLineDash([]);
    ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = .2; ctx.drawImage(glowTex('#ffe14d'), z.x - z.r, z.y - z.r*.6, z.r*2, z.r*1.2); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; }
  // avisos de eventos
  for (const w of G.warns) { const k = 1 - w.t/w.max, pulse = .5 + Math.sin(now*18)*.5;
    ctx.save(); ctx.translate(w.x, w.y); ctx.scale(1, .6);
    ctx.fillStyle = w.tipo === 'gelo' ? `rgba(20,30,50,${.25 + k*.4})` : `rgba(255,${w.tipo === 'raio' ? 220 : 60},40,${.15 + k*.3})`; ctx.beginPath(); ctx.arc(0, 0, w.r*(w.tipo === 'gelo' ? k : 1), 0, 7); ctx.fill();
    ctx.strokeStyle = `rgba(255,${w.tipo === 'raio' ? 230 : 70},60,${.5 + pulse*.5})`; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(0, 0, w.r, 0, 7); ctx.stroke(); ctx.restore();
    ctx.font = '700 22px Rubik, sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.globalAlpha = pulse; ctx.fillText('!', w.x, w.y + 8); ctx.globalAlpha = 1; }
  for (const tr of G.traps) { if (tr.fired) continue; const pulse = .5 + Math.sin(now*20)*.5;
    ctx.strokeStyle = `rgba(255,90,40,${.4 + pulse*.6})`; ctx.lineWidth = 10; ctx.setLineDash([20,14]); ctx.beginPath(); ctx.moveTo(tr.x1, tr.y1); ctx.lineTo(tr.x2, tr.y2); ctx.stroke(); ctx.setLineDash([]); }
}
function drawWarnFalls(now){
  for (const w of G.warns) { const k = 1 - w.t/w.max; if (k < .55) continue; const hh = 600*(1 - (k-.55)/.45);
    if (w.tipo === 'lava') { ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(glowTex('#ff6a1a'), w.x-40, w.y-hh-40, 80, 80); ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = '#3a2420'; ctx.beginPath(); ctx.arc(w.x, w.y-hh, 14, 0, 7); ctx.fill(); }
    if (w.tipo === 'gelo') { ctx.fillStyle = '#cfefff'; ctx.beginPath(); ctx.moveTo(w.x-14, w.y-hh-50); ctx.lineTo(w.x+14, w.y-hh-50); ctx.lineTo(w.x, w.y-hh+20); ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#7fb0cd'; ctx.lineWidth = 2; ctx.stroke(); }
  }
}
// escuridão com luzes (noite, apagão, caverna) e neblina
const lightCv = document.createElement('canvas'), lightCtx = lightCv.getContext('2d');
function drawLighting(now, ox, oy){
  if (G.dark > 0) {
    if (FX_LEVE()) { ctx.setTransform(DPR,0,0,DPR,0,0); ctx.fillStyle = `rgba(6,8,24,${G.dark*.6})`; ctx.fillRect(0,0,VW,VH); }
    else {
      const q = 4, lw = Math.ceil(VW/q), lh = Math.ceil(VH/q);
      if (lightCv.width !== lw || lightCv.height !== lh) { lightCv.width = lw; lightCv.height = lh; }
      const L = lightCtx; L.globalCompositeOperation = 'source-over'; L.clearRect(0,0,lw,lh);
      const cor = {cidade:'8,10,32', pantano:'6,16,10', vulcao:'26,8,2', gelo:'4,16,34', tempestade:'8,10,20', ruinas:'20,14,6'}[MAP.id] || '6,8,24';
      L.fillStyle = `rgba(${cor},${Math.min(.85, G.dark)})`; L.fillRect(0,0,lw,lh);
      L.globalCompositeOperation = 'destination-out';
      const sc = G.scale/q, luz = (x, y, r, a=1) => { const sx = (x*G.scale + ox)/q, sy = (y*G.scale + oy)/q, rr = r*sc; L.globalAlpha = a; L.drawImage(softTex, sx-rr, sy-rr, rr*2, rr*2); };
      for (const ti of [0,1]) { const f = active(ti); if (f && f.alive) luz(f.x, f.y - 20, f.hidden ? 90 : 190); }
      for (const p of G.proj) luz(p.x, p.y - HGT, 90, .8);
      for (const b of G.beams) for (let k=0;k<=1;k+=.25) luz(b.x + Math.cos(b.a)*b.len*k, b.y + Math.sin(b.a)*b.len*k - HGT, 120, .9);
      for (const o of OBST) if (o.tipo === 'poste' && !o.filho) luz(o.x + o.r*2, o.y - 10, 260, .9);
      for (const d of (MAP.decor || [])) { if (d[2] === 'neon') luz(d[0], d[1] < 0 ? 40 : H - 40, 230, .7); if (d[2] === 'cogumelo_luz') luz(d[0], d[1], 150, .8); if (d[2] === 'cratera') luz(d[0], d[1], 160, .7); }
      for (const t of TERR) if (t.tipo === 'lava') { const [a,b,c,d] = t.bb; luz((a+c)/2, (b+d)/2, Math.max(c-a, d-b)*.7, .8); }
      for (const t of G.tempTerr) luz(t.x, t.y, 120, .9);
      for (const z of [...G.fires, ...G.fields, ...G.zones, ...G.warns]) luz(z.x, z.y, (z.r || 80)*1.4, .8);
      for (const par of (MAP.teleportes || [])) for (const [x,y] of par) luz(x, y, 110, .7);
      for (const it of G.items) luz(it.x, it.y - 14, 90, .7);
      for (const p of G.parts) if ((p.kind === 'flame' || p.kind === 'impact' || p.kind === 'bolt') && Math.random() < .3) luz(p.x, p.y, 60, .5);
      L.globalAlpha = 1;
      ctx.setTransform(DPR,0,0,DPR,0,0); ctx.imageSmoothingEnabled = true; ctx.drawImage(lightCv, 0, 0, VW, VH);
    }
  }
  if (G.fog > 0 && !FX_LEVE()) {
    ctx.setTransform(DPR*G.scale, 0, 0, DPR*G.scale, DPR*ox, DPR*oy);
    for (let i=0;i<6;i++){ const x = ((i*397 + now*18) % (W + 600)) - 300, y = (i*211) % H, r = 380;
      ctx.globalAlpha = G.fog*.22; ctx.drawImage(softTex, x - r, y - r*.6, r*2, r*1.2); }
    ctx.globalAlpha = 1;
    if (G.fog > .8) { ctx.setTransform(DPR,0,0,DPR,0,0); const rg = ctx.createRadialGradient(VW/2, VH/2, Math.min(VW,VH)*.2, VW/2, VH/2, Math.max(VW,VH)*.65);
      rg.addColorStop(0, 'rgba(200,215,200,0)'); rg.addColorStop(1, 'rgba(200,215,200,.75)'); ctx.fillStyle = rg; ctx.fillRect(0,0,VW,VH); }
  }
  if (MAP.raiosDeSol && !FX_LEVE()) { ctx.setTransform(DPR,0,0,DPR,0,0); ctx.globalCompositeOperation = 'lighter';
    for (let i=0;i<4;i++){ const x = (i*.27 + .1)*VW + Math.sin(now*.2 + i)*40; ctx.globalAlpha = .05 + Math.sin(now*.5 + i*2)*.03;
      const lg = ctx.createLinearGradient(x, 0, x + VH*.5, VH); lg.addColorStop(0, '#fff6c8'); lg.addColorStop(1, '#fff6c800'); ctx.fillStyle = lg;
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + 90, 0); ctx.lineTo(x + 90 + VH*.5, VH); ctx.lineTo(x + VH*.5, VH); ctx.closePath(); ctx.fill(); }
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; }
}

