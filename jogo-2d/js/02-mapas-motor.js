/* =========================================================
   MAPAS — motor de cenário em pixel art
   ========================================================= */
const W = 1800, H = 1100;      // tamanho da arena jogável
const MARGEM = 180;            // cenário desenhado em volta da arena (arquibancada, árvores...)
const PXA = 2.5;               // tamanho do "pixel" do cenário (igual aos sprites)

/* ----- Ruído (para texturas e bordas orgânicas) ----- */
function hash2(x, y, s=0){ let h = Math.imul(x|0, 374761393) + Math.imul(y|0, 668265263) + Math.imul(s|0, 1442695041); h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; }
function vnoise(x, y, s=0){ const ix = Math.floor(x), iy = Math.floor(y), fx = x-ix, fy = y-iy, ux = fx*fx*(3-2*fx), uy = fy*fy*(3-2*fy);
  const a = hash2(ix,iy,s), b = hash2(ix+1,iy,s), c = hash2(ix,iy+1,s), d = hash2(ix+1,iy+1,s);
  return a + (b-a)*ux + (c-a)*uy + (a-b-c+d)*ux*uy; }
function fbm(x, y, s=0){ return vnoise(x,y,s)*.6 + vnoise(x*2.1,y*2.1,s+7)*.3 + vnoise(x*4.3,y*4.3,s+13)*.1; }
const BAYER = [0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5].map(v => v/16);

/* ----- Formas de terreno -----
   {tipo, x, y, rx, ry}                 elipse
   {tipo, forma:'linha', pts:[[x,y]...], larg}   rio, caminho, ponte
   {tipo, forma:'ret', x, y, w, h}      retângulo (mar, calçada)
   liso:true tira a borda irregular; wob muda o quanto ela é irregular (padrão 0.22) */
function shapeD(t, x, y){
  let d;
  if (t.forma === 'linha') { let best = 1e12; const p = t.pts;
    for (let i=0;i<p.length-1;i++){ const ax = p[i][0], ay = p[i][1], vx = p[i+1][0]-ax, vy = p[i+1][1]-ay, L = vx*vx+vy*vy;
      let k = L ? ((x-ax)*vx + (y-ay)*vy)/L : 0; k = k < 0 ? 0 : k > 1 ? 1 : k;
      const dx = x - ax - vx*k, dy = y - ay - vy*k, dd = dx*dx + dy*dy; if (dd < best) best = dd; }
    d = Math.sqrt(best)/(t.larg/2); }
  else if (t.forma === 'ret') { const hh = (t.h + (t.extra || 0))/2; d = Math.max(Math.abs(x - t.x - t.w/2)/(t.w/2), Math.abs(y - t.y - hh)/hh); }
  else { const dx = (x-t.x)/t.rx, dy = (y-t.y)/t.ry; d = Math.sqrt(dx*dx + dy*dy); }
  const wob = t.liso ? 0 : (t.wob ?? .22);
  return wob ? d + (fbm(x*.012, y*.012, 3) - .5)*wob*2 : d;
}
function prepTerrain(t){
  const pad = 1 + (t.liso ? 0 : (t.wob ?? .22)) + .05;
  if (t.forma === 'linha') { const xs = t.pts.map(p => p[0]), ys = t.pts.map(p => p[1]), r = t.larg/2*pad;
    t.bb = [Math.min(...xs)-r, Math.min(...ys)-r, Math.max(...xs)+r, Math.max(...ys)+r]; }
  else if (t.forma === 'ret') t.bb = [t.x - 40, t.y - 40, t.x + t.w + 40, t.y + t.h + (t.mare ? 320 : 40)];
  else t.bb = [t.x - t.rx*pad, t.y - t.ry*pad, t.x + t.rx*pad, t.y + t.ry*pad];
  return t;
}
function inTerrain(t, x, y){ const b = t.bb; if (x < b[0] || y < b[1] || x > b[2] || y > b[3]) return false; return shapeD(t, x, y) < 1; }

/* espelhar(lista): copia cada item para o lado direito (x → 1800 − x). Itens bem no meio (x = 900) não são duplicados. */
function espelhar(lista){
  const out = [];
  for (const o of lista) {
    out.push(o);
    if (Array.isArray(o)) { if (o[0] !== W/2) out.push([W - o[0], ...o.slice(1)]); }
    else if (o.forma === 'linha') { if (!o.pts.every(p => p[0] === W/2)) out.push({...o, pts:o.pts.map(([x,y]) => [W - x, y]).reverse()}); }
    else if (o.forma === 'ret') { if (o.x + o.w/2 !== W/2) out.push({...o, x: W - o.x - o.w}); }
    else if (o.x !== W/2) out.push({...o, x: W - o.x});
  }
  return out;
}

/* ----- Materiais do chão (paletas de 4 tons, do escuro ao claro) ----- */
const hexRGB = h => [parseInt(h.slice(1,3),16), parseInt(h.slice(3,5),16), parseInt(h.slice(5,7),16)];
const PAL = {};
function pal(n, cores){ PAL[n] = cores.map(hexRGB); }
pal('grama', ['#4b8a33','#5a9b3b','#69ab45','#7bbb51']);
pal('grama2', ['#356b28','#3f7a2e','#4a8935','#56973d']);
pal('terra', ['#7d5f3c','#8d6d46','#9c7b51','#ab8a5e']);
pal('areia', ['#dcc184','#e5cc92','#ecd7a1','#f3e3b5']);
pal('areia_molhada', ['#b99b62','#c4a66d','#cdb07a','#d6bb86']);
pal('estadio1', ['#3d8a4f','#43935a','#4a9c61','#51a568']);
pal('estadio2', ['#36804a','#3b8851','#419158','#479a5f']);
pal('piso', ['#9a9eac','#a7abb8','#b4b8c4','#c1c5d0']);
pal('templo', ['#a8875a','#b59566','#c2a273','#cfb083']);
pal('basalto', ['#2a221f','#352b27','#40342f','#4c3e37']);
pal('gelo', ['#9fcde6','#b1d8ed','#c3e3f3','#d6eef8']);
pal('neve', ['#dfe9f1','#e9f1f7','#f2f7fb','#fbfdff']);
pal('agua', ['#1d5aa8','#2a72c7','#3f8ad9','#62a9e8']);
pal('agua_escura', ['#22301f','#2a3a26','#33452d','#3d5135']);
pal('lava', ['#b5230e','#ee5a17','#ff9a22','#ffd75a']);
pal('mato', ['#2a6420','#337428','#3e8530','#4b9739']);
pal('veneno', ['#4f1f63','#5f2a74','#733886','#8a4a9e']);
pal('asfalto', ['#1d2029','#22252f','#272b36','#2d313d']);
pal('calcada', ['#5b5f6c','#646876','#6e7280','#787c8a']);
pal('rocha', ['#565b67','#626773','#6e737f','#7b808c']);
pal('nuvemchao', ['#6fbf6a','#80cb78','#92d787','#a6e298']);
pal('pantano', ['#34432a','#3c4d30','#455836','#4f623d']);
pal('madeira', ['#6e4424','#7f512c','#8f5f35','#a06d3f']);
pal('pedra_caminho', ['#7b7f8a','#8a8e99','#9a9ea8','#aaaeb7']);
pal('copa', ['#1d4a16','#27601d','#337726','#438c31']);
pal('copa_escura', ['#1a2a14','#22361a','#2b4320','#365128']);
pal('ceu', ['#7fb4ef','#93c1f3','#a9cff7','#c2defb']);
pal('penhasco', ['#1c1513','#261d1a','#302521','#3b2e29']);
pal('paredegelo', ['#3d6f93','#4b80a5','#5b93b7','#6da6c8']);
pal('muralha', ['#7e6644','#8d7350','#9c815c','#ab8f69']);
pal('predio', ['#14161f','#191c27','#1f2230','#262a39']);
pal('montanha', ['#3e424c','#484c57','#535863','#5f6470']);
const tonal = (p, n, px, py) => { const P = PAL[p]; let k = n*P.length + (BAYER[(py&3)*4 + (px&3)] - .5)*.9; k = k < 0 ? 0 : k >= P.length ? P.length-1 : k|0; return P[k]; };
const mix = (a, b, k) => [a[0]+(b[0]-a[0])*k, a[1]+(b[1]-a[1])*k, a[2]+(b[2]-a[2])*k];
const C = h => hexRGB(h);
const FLORES = ['#ffffff','#ffe066','#ff8fb1','#9ad0ff','#ffb347'].map(hexRGB);
const TORCIDA = ['#ff6b6b','#ffd93d','#6bcbff','#ffffff','#ff9ff3','#7bed9f','#ffa94d','#c0eb75'].map(hexRGB);

// cor de um ponto do chão. m = material, d = profundidade dentro do terreno (0 centro, 1 borda)
function matColor(m, x, y, px, py, d){
  const n = fbm(x*.008, y*.008, 1), h = hash2(px, py, 2);
  switch (m) {
    case 'grama': case 'grama2': case 'nuvemchao': {
      if (h < .010) return FLORES[(hash2(px,py,5)*FLORES.length)|0];
      if (h < .07 && n > .45) return PAL[m][0];
      return tonal(m, n*.85 + fbm(x*.05, y*.05, 9)*.25, px, py); }
    case 'terra': if (h < .05) return h < .025 ? C('#6b4f31') : C('#c4a37a'); return tonal('terra', n, px, py);
    case 'areia': if (h < .004) return h < .002 ? C('#ffd1dc') : C('#ffffff'); return tonal('areia', n*.7 + fbm(x*.04,y*.04,4)*.3, px, py);
    case 'estadio': return tonal(Math.floor(x/90) % 2 ? 'estadio1' : 'estadio2', n*.5 + .25, px, py);
    case 'piso': case 'templo': case 'calcada': case 'pedra_caminho': {
      const s = m === 'templo' ? 56 : m === 'calcada' ? 40 : m === 'pedra_caminho' ? 26 : 48;
      const row = Math.floor(y/s), ox = (m === 'templo' || m === 'pedra_caminho') && row % 2 ? s/2 : 0;
      const tx = Math.floor((x+ox)/s), lx = (x+ox) - tx*s, ly = y - row*s;
      if (lx < 3 || ly < 3) return mix(PAL[m][0], [0,0,0], .35);
      if (m === 'templo' && fbm(x*.01, y*.01, 6) > .62 && h < .5) return C(h < .25 ? '#5f7f34' : '#6f913d');
      if (vnoise(x*.06, y*.06, 8) > .93) return mix(PAL[m][0], [0,0,0], .25);
      return tonal(m, hash2(tx, row, 3)*.6 + n*.4, px, py); }
    case 'basalto': { const r = 1 - Math.abs(vnoise(x*.011, y*.011, 5)*2 - 1);
      if (r > .975 && fbm(x*.006, y*.006, 8) > .45) return C('#ff8a2a'); if (r > .95 && fbm(x*.006, y*.006, 8) > .45) return C('#7a2a10');
      return tonal('basalto', n, px, py); }
    case 'gelo': { if (Math.sin((x + y*.35)*.03 + n*7) > .992 && fbm(x*.01, y*.01, 4) > .5) return C('#ffffff');
      const r = 1 - Math.abs(vnoise(x*.012, y*.012, 6)*2 - 1); if (r > .975) return C('#8dbcd6');
      return tonal('gelo', n, px, py); }
    case 'neve': if (h < .01) return C('#c8d8e6'); return tonal('neve', n*.6 + .4, px, py);
    case 'agua': { if (d > .86) return d > .93 ? C('#f2fbff') : C('#bfe6fb');
      const dep = d < .45 ? 0 : d < .7 ? 1 : 2;
      if (Math.sin(x*.07 + fbm(x*.02, y*.02, 2)*9) > .93) return PAL.agua[Math.min(3, dep+1)];
      return PAL.agua[dep]; }
    case 'agua_escura': { if (d > .86) return C('#4a3f2a'); if (h < .005) return C('#4f8a3a'); return tonal('agua_escura', n, px, py); }
    case 'lava': { if (d > .9) return C('#140b09'); if (d > .8) return C('#6e1a0b');
      const c = fbm(x*.02, y*.02, 12); if (c > .66) return c > .72 ? C('#2e1c18') : C('#4a2a1e');
      return tonal('lava', 1 - d*.6 + (n-.5)*.4, px, py); }
    case 'mato': { const blade = ((px + ((hash2(px >> 1, 0, 4)*3)|0)) % 3) === 0;
      if (d > .88) return PAL.mato[0]; return blade ? PAL.mato[0] : tonal('mato', n*.7 + .2, px, py); }
    case 'veneno': if (h < .03) return C('#c27ee0'); if (d > .88) return C('#2e1238'); return tonal('veneno', n, px, py);
    case 'asfalto': { if (fbm(x*.006, y*.006, 11) > .6) return mix(C('#1a2433'), C('#2b3b55'), (Math.sin(x*.1)+1)*.15);
      if (h < .01) return C('#3a3f4d'); return tonal('asfalto', n, px, py); }
    case 'rocha': { if (h < .03 && n > .5) return C('#5f7f3a'); const r = 1 - Math.abs(vnoise(x*.03, y*.03, 7)*2 - 1);
      if (r > .96) return C('#3a3e46'); return tonal('rocha', n, px, py); }
    case 'pantano': if (h < .015) return C('#6b5a2e'); return tonal('pantano', n, px, py);
    case 'ponte': { const vert = d === -2; const k = vert ? y : x; if ((k % 16) < 2) return C('#3e2614');
      if (d > .82 || d === -1) return C('#4a2f18'); return tonal('madeira', hash2(Math.floor(k/16), 0, 9)*.7 + .2, px, py); }
    case 'neve_borda': return tonal('neve', .5, px, py);
    case 'abismo': { const c = fbm(x*.004 + 3, y*.007, 14); if (c > .58) return mix(C('#ffffff'), C('#d9ecff'), (c-.58)*3);
      return tonal('ceu', (y + MARGEM)/(H + MARGEM*2)*.8 + n*.2, px, py); }
  }
  return [255,0,255];
}
// cenário fora da arena (dOut = distância até a borda da arena)
function borderColor(estilo, x, y, px, py, dOut){
  const n = fbm(x*.02, y*.02, 9), h = hash2(px, py, 21);
  switch (estilo) {
    case 'arquibancada': {
      if (dOut < 22) { const seg = Math.floor((x + y)/170) % 3; if (dOut < 4) return C('#e9edf5');
        return seg === 0 ? C('#1e3a8a') : seg === 1 ? C('#c62828') : C('#f9c80e'); }
      const row = Math.floor((dOut-22)/24), ly = (dOut-22) % 24;
      if (ly < 3) return C('#59627a');
      const cell = hash2(Math.floor(x/9), Math.floor(y/9) + row*31, 22);
      if (ly > 7 && ly < 19 && cell < .78) return TORCIDA[(cell*TORCIDA.length*1.3|0) % TORCIDA.length];
      return row % 2 ? C('#2f3c66') : C('#384678'); }
    case 'arvores': case 'pantano_b': { const p = estilo === 'arvores' ? 'copa' : 'copa_escura';
      const blob = vnoise(x*.03, y*.03, 31); if (blob > .62) return PAL[p][3];
      if (dOut < 10) return mix(PAL[p][0], [0,0,0], .3);
      return tonal(p, n*.7 + blob*.3, px, py); }
    case 'penhasco': { const r = 1 - Math.abs(vnoise(x*.02, y*.02, 33)*2 - 1); if (r > .96) return C('#ff6a1a'); if (r > .93) return C('#7a1d0b');
      return tonal('penhasco', n*.8 + (dOut < 14 ? .3 : 0), px, py); }
    case 'paredegelo': { if (hash2(px>>2, py>>2, 34) < .04) return C('#d8f3ff'); return tonal('paredegelo', n*.6 + Math.max(0, .4 - dOut/400), px, py); }
    case 'praia': { if (y < 0) return null; if (vnoise(x*.018, y*.018, 35) > .74) return tonal('copa', n, px, py); return tonal('areia', n, px, py); }
    case 'predios': { const bx = Math.floor((x + 400)/150), by = Math.floor((y + 400)/130), lx = (x + 400) - bx*150, ly = (y + 400) - by*130;
      if (lx < 16 || ly < 16) return tonal('asfalto', n, px, py);
      if (lx < 19 || ly < 19) return hash2(bx, by, 36) < .5 ? C('#ff3fa4') : C('#29e3ff');
      if ((lx % 14) < 6 && (ly % 16) < 7) return hash2(px>>1, py>>1, 37) < .35 ? C('#ffd56b') : C('#1a2234');
      return PAL.predio[(hash2(bx, by, 38)*4)|0]; }
    case 'muralha': { const row = Math.floor(y/30), ox = row % 2 ? 30 : 0, bx = Math.floor((x+ox)/60), lx = (x+ox) - bx*60, ly = y - row*30;
      if (lx < 3 || ly < 3) return C('#4e3e28'); if (vnoise(x*.03, y*.03, 39) > .6) return C(h < .5 ? '#3f6b2a' : '#4d7d33');
      return tonal('muralha', hash2(bx, row, 40)*.7 + .15, px, py); }
    case 'ceu': return matColor('abismo', x, y, px, py, 0);
    case 'montanha': { const r = 1 - Math.abs(vnoise(x*.025, y*.025, 41)*2 - 1); if (r > .95) return C('#262931');
      if (h < .02) return C('#4f6a33'); return tonal('montanha', n, px, py); }
  }
  return [40,40,50];
}

/* ----- Pinta o chão inteiro de um mapa num canvas pequeno (pixel art) ----- */
function terrainTopo(mp, x, y){
  for (let i = mp.terrenos.length - 1; i >= 0; i--) { const t = mp.terrenos[i];
    const b = t.bb; if (x < b[0] || y < b[1] || x > b[2] || y > b[3]) continue;
    const d = shapeD(t, x, y); if (d < 1) return [t, d]; }
  return null;
}
function paintMap(mp, px){
  const cw = Math.ceil((W + MARGEM*2)/px), ch = Math.ceil((H + MARGEM*2)/px);
  const c = document.createElement('canvas'); c.width = cw; c.height = ch;
  const g = c.getContext('2d'), img = g.createImageData(cw, ch), D = img.data;
  const solo = new Uint8Array(cw*ch); // 1 = abismo (para desenhar os penhascos depois)
  for (let j=0;j<ch;j++) for (let i=0;i<cw;i++) {
    const x = (i+.5)*px - MARGEM, y = (j+.5)*px - MARGEM;
    const dentro = x >= 0 && y >= 0 && x <= W && y <= H;
    const tt = terrainTopo(mp, x, y);
    let col, m;
    if (tt) { const [t, d] = tt; m = t.tipo === 'ponte' ? 'ponte' : (MATERIAL[t.tipo] || t.tipo);
      col = matColor(m, x, y, i, j, m === 'ponte' ? (d > .82 ? -1 : t.vertical ? -2 : d) : d); }
    else if (dentro || mp.borda === 'praia' && y < 0 && false) { m = mp.base; col = matColor(m, x, y, i, j, .5); }
    else { m = 'borda'; col = borderColor(mp.borda, x, y, i, j, Math.max(-x, -y, x - W, y - H)) || matColor('agua', x, y, i, j, .3); }
    if (m === 'abismo') solo[j*cw+i] = 1;
    // sombra na borda de dentro da arena + leve variação de luz
    let lum = 1 + (fbm(x*.002, y*.002, 50) - .5)*.12;
    if (dentro) { const e = Math.min(x, y, W - x, H - y); if (e < 24) lum *= .78 + e/24*.22; }
    const k = (j*cw + i)*4; D[k] = Math.min(255, col[0]*lum); D[k+1] = Math.min(255, col[1]*lum); D[k+2] = Math.min(255, col[2]*lum); D[k+3] = 255;
  }
  // penhascos embaixo das ilhas (Jardim Celestial)
  const cliff = Math.max(2, Math.round(46/px));
  for (let i=0;i<cw;i++) for (let j=1;j<ch;j++) {
    if (!solo[j*cw+i]) continue;
    let up = 0; for (let k=1;k<=cliff && j-k >= 0;k++) if (!solo[(j-k)*cw+i]) { up = k; break; }
    if (!up) continue;
    const t = up/cliff, base = t < .25 ? [92,78,58] : t < .6 ? [74,61,45] : [56,46,34], kk = (j*cw+i)*4;
    const n = hash2(i, j, 60)*.12 + .94;
    D[kk] = base[0]*n; D[kk+1] = base[1]*n; D[kk+2] = base[2]*n;
  }
  g.putImageData(img, 0, 0);
  // marcações desenhadas por cima (linhas do estádio, faixas da rua, runas)
  g.save(); g.scale(1/px, 1/px); g.translate(MARGEM, MARGEM);
  if (mp.marcas) mp.marcas(g);
  g.restore();
  return c;
}
// tipo de terreno → material usado na pintura
const MATERIAL = { mato:'mato', agua:'agua', lava:'lava', neve:'neve', veneno:'veneno', agua_escura:'agua_escura', terra:'terra',
  calcada:'calcada', templo:'templo', grama:'grama', ilha:'nuvemchao', pedra_caminho:'pedra_caminho', areia:'areia', piso:'piso' };
// efeito de cada terreno no jogo (o desenho vem de MATERIAL)
const TERRENO_EFEITO = {
  mato:{esconde:true}, agua:{lento:.6, rapidoAgua:1.25}, agua_escura:{lento:.55, rapidoAgua:1.15}, lava:{queima:true},
  neve:{firme:true, lento:.9}, veneno:{envenena:true}, abismo:{bloqueia:true}
};
const groundCache = {}, thumbCache = {};
function buildGround(mp){ if (!groundCache[mp.id]) { prepMap(mp); groundCache[mp.id] = paintMap(mp, PXA); } return groundCache[mp.id]; }
function buildThumb(mp){ if (!thumbCache[mp.id]) { prepMap(mp); thumbCache[mp.id] = paintMap(mp, 12); } return thumbCache[mp.id]; }
function prepMap(mp){ if (mp._prep) return; mp._prep = true; mp.terrenos.forEach(prepTerrain); }

/* ----- Marcações (linhas do estádio, rua, runas) ----- */
function marcasEstadio(g){
  g.strokeStyle = '#ffffffdd'; g.lineWidth = 8;
  g.strokeRect(40, 40, W-80, H-80);
  g.beginPath(); g.moveTo(W/2, 40); g.lineTo(W/2, H-40); g.stroke();
  g.beginPath(); g.arc(W/2, H/2, 150, 0, 7); g.stroke();
  g.fillStyle = '#ffffffdd'; g.beginPath(); g.arc(W/2, H/2, 46, 0, 7); g.fill();
  g.fillStyle = '#d63a3a'; g.beginPath(); g.arc(W/2, H/2, 40, Math.PI, 0); g.fill();
  g.fillStyle = '#f4f4f4'; g.beginPath(); g.arc(W/2, H/2, 40, 0, Math.PI); g.fill();
  g.fillStyle = '#222'; g.fillRect(W/2-40, H/2-4, 80, 8); g.beginPath(); g.arc(W/2, H/2, 13, 0, 7); g.fill();
  g.fillStyle = '#fff'; g.beginPath(); g.arc(W/2, H/2, 8, 0, 7); g.fill();
  for (const [x, c] of [[40,'#3b7bff40'],[W-300,'#ff6a8040']]) { g.fillStyle = c; g.fillRect(x + (x>40?0:0), H/2-200, 260, 400); g.strokeStyle = '#ffffffaa'; g.lineWidth = 6; g.strokeRect(x, H/2-200, 260, 400); }
}
function marcasCidade(g){
  g.strokeStyle = '#f5c542cc'; g.lineWidth = 6; g.setLineDash([40,30]);
  g.beginPath(); g.moveTo(0, H/2); g.lineTo(W, H/2); g.stroke(); g.setLineDash([]);
  g.fillStyle = '#e9edf5bb'; for (let i=0;i<8;i++) { g.fillRect(W/2 - 70, 160 + i*30, 140, 14); g.fillRect(W/2 - 70, 700 + i*30, 140, 14); }
  g.strokeStyle = '#ffffff55'; g.lineWidth = 4; g.beginPath(); g.moveTo(0, 130); g.lineTo(W, 130); g.moveTo(0, H-130); g.lineTo(W, H-130); g.stroke();
}
function marcasRuinas(g){
  g.strokeStyle = '#6b5a3a'; g.lineWidth = 5;
  g.beginPath(); g.arc(W/2, H/2, 210, 0, 7); g.stroke(); g.beginPath(); g.arc(W/2, H/2, 250, 0, 7); g.stroke();
  for (let i=0;i<12;i++){ const a = i/12*Math.PI*2; g.beginPath(); g.moveTo(W/2+Math.cos(a)*210, H/2+Math.sin(a)*210); g.lineTo(W/2+Math.cos(a)*250, H/2+Math.sin(a)*250); g.stroke(); }
}
function marcasTemplo(g){
  g.strokeStyle = '#2e3138'; g.lineWidth = 6; g.beginPath(); g.arc(W/2, H/2, 230, 0, 7); g.stroke();
  g.strokeStyle = '#d9c04a88'; g.lineWidth = 4; for (let i=0;i<6;i++){ const a = i/6*Math.PI*2; g.beginPath(); g.moveTo(W/2, H/2); g.lineTo(W/2+Math.cos(a)*230, H/2+Math.sin(a)*230); g.stroke(); }
}

