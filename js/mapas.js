"use strict";
/* =========================================================
   MAPAS (Fase 5)
   - texturas de chão dos mapas novos (TEXTURAS_CHAO)
   - melhorias do Estádio, Vulcão e Geleira
   - mapas novos: Floresta Ancestral, Cidade Neon, Templo dos Dragões, Ilhas Celestiais
   - clima de cada mapa (A.clima), perigos (perigosDoMapa) e reações aos golpes (reagirAmbiente)

   Como um mapa funciona:
     1) MAPAS em dados.js tem as cores e o nome
     2) MONTAR_MAPA[id](A) coloca os objetos no A.grupo e os obstáculos com addObstaculo
     3) A.animar = funções chamadas todo quadro (dt)
     4) A.clima(dt) = partículas do ambiente (chuva, folhas…), já multiplicadas pela qualidade gráfica
     5) A.reagir = funções chamadas quando um golpe forte acerta (x, z, forca, tipo)
     6) A.perigos = áreas especiais no chão { tipo, x, z, r }
   ========================================================= */

const TEXTURAS_CHAO = {};
const POUCO = () => QUAL.particulas < .6;        // qualidade baixa: menos enfeites
const matPadrao = (cor, o = {}) => new THREE.MeshStandardMaterial(Object.assign({ color: cor, roughness: .9 }, o));
const matNeon = (cor, op = 1) => new THREE.MeshBasicMaterial({ color: cor, transparent: op < 1, opacity: op, fog: false });
const emBatalha = () => typeof JOGO !== 'undefined' && JOGO.estado === 'batalha' && !JOGO.cineAtiva && !JOGO.fim && JOGO.intro <= 0;
function emCampo(){ return typeof JOGO === 'undefined' ? [] : [lutador(0), lutador(1)].filter(L => L && L.vivo && L.emCampo); }
function marcaCirculo(g, m, esc, raio, cor, larg){ g.strokeStyle = cor; g.lineWidth = larg*esc; g.beginPath(); g.arc(m, m, raio*esc, 0, 7); g.stroke(); }
// desenha uma área de perigo na própria textura do chão (posição em metros)
function areaNaTextura(g, T, x, z, r, desenho){ const esc = T/(RAIO_ARENA*2 + 4); desenho(T/2 + x*esc, T/2 + z*esc, r*esc, esc); }

/* ----- Reação do cenário a golpes fortes (chamada em aplicarDano) ----- */
function reagirAmbiente(x, z, forca, tipo){
  if (!ARENA) return;
  if (forca > 1.1) poeira(x, z, 10, ARENA.mapa.poeira ?? 0xb8a98a);
  for (const f of ARENA.reagir) f(x, z, forca, tipo);
}
// perigo (objeto) no ponto
function perigoObjEm(x, z){
  if (!ARENA) return null;
  for (const p of ARENA.perigos) if ((x - p.x)**2 + (z - p.z)**2 < p.r*p.r) return p;
  return null;
}
/* ----- Perigos dos mapas novos (chamado em atualizarLutador) ----- */
function perigosDoMapa(L, dt){
  const p = perigoObjEm(L.pos.x, L.pos.z); if (!p || !L.vivo) return;
  if (p.tipo === 'lama' && !L.noAr && !L.p.voa && Math.random() < dt*8)
    FUMACA.add({ x: L.pos.x + rnd(-.4, .4), y: .1, z: L.pos.z + rnd(-.4, .4), vx: rnd(-1, 1), vy: rnd(1, 2.5), vz: rnd(-1, 1), cor: 0x4a3420, tam: rnd(.15, .3), vida: .5, grav: 9, cel: 'mudwisp' });
  if (p.tipo === 'eletrico' && p.ativo && !L.noAr && !L.p.voa) {
    L.choqueT = (L.choqueT || 0) - dt;
    if (L.choqueT <= 0) { L.choqueT = .5; aplicarDano(null, L, 10, 'electric', 'Piso elétrico'); soltar('electric', L.pos.x, .5, L.pos.z, 12, 4, .4, .4); }
  }
  if (p.tipo === 'runa' && !L.noAr) {
    L.en = Math.min(100, L.en + 9*dt);            // a runa do dragão carrega a Ultimate
    if (Math.random() < dt*10) BRILHO.add({ x: L.pos.x + rnd(-.6, .6), y: .2, z: L.pos.z + rnd(-.6, .6), vy: rnd(2, 4), cor: 0xffc04a, tam: rnd(.15, .3), vida: .7, atrito: .5, cel: 'brilho' });
  }
  if (p.tipo === 'vento') {
    if (L.noAr) L.vy = Math.min(L.vy + 30*dt, 9);     // corrente de ar: sobe mais e cai devagar
    if (Math.random() < dt*12) FUMACA.add({ x: L.pos.x + rnd(-.8, .8), y: rnd(0, 1), z: L.pos.z + rnd(-.8, .8), vy: rnd(5, 8), cor: 0xffffff, tam: rnd(.2, .4), vida: .6, atrito: .2, cel: 'wisp' });
  }
}

/* =========================================================
   TEXTURAS DE CHÃO
   ========================================================= */
TEXTURAS_CHAO.musgo = (g, T) => {
  const m = T/2, esc = T/(RAIO_ARENA*2 + 4);
  g.fillStyle = '#3d5a2a'; g.fillRect(0, 0, T, T);
  ruidoPontos(g, T, 9000, ['#4a6e30','#33501f','#57803a','#2c4419','#6b5a3a'], 2, 14);
  ruidoPontos(g, T, 2500, ['#7aa04a55','#a0c06033'], 1, 4);
  // trilha de terra em círculo e raízes
  marcaCirculo(g, m, esc, RAIO_ARENA - 2, '#6b5338', 1.6);
  marcaCirculo(g, m, esc, 5.5, '#6b5338', 1.2);
  g.strokeStyle = '#4a3420'; g.lineCap = 'round';
  for (let i = 0; i < 26; i++) {
    let a = i/26*7, r = RAIO_ARENA + 1, x = m + Math.cos(a)*r*esc, y = m + Math.sin(a)*r*esc;
    g.lineWidth = rnd(.2, .5)*esc; g.beginPath(); g.moveTo(x, y);
    for (let k = 0; k < 6; k++) { a += rnd(-.25, .25); r -= rnd(.8, 1.6); g.lineTo(m + Math.cos(a)*r*esc, m + Math.sin(a)*r*esc); }
    g.stroke();
  }
  // poças de lama
  for (const [x, z, r] of MAPA_LAMA) areaNaTextura(g, T, x, z, r, (cx, cy, rr) => {
    const gr = g.createRadialGradient(cx, cy, rr*.2, cx, cy, rr); gr.addColorStop(0, '#3a2814'); gr.addColorStop(.8, '#4a3420'); gr.addColorStop(1, '#4a342000');
    g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, rr, 0, 7); g.fill();
    g.fillStyle = '#6a502e88'; for (let i = 0; i < 30; i++) { g.beginPath(); g.arc(cx + rnd(-rr, rr)*.7, cy + rnd(-rr, rr)*.7, rnd(2, 8), 0, 7); g.fill(); }
  });
};
TEXTURAS_CHAO.asfalto = (g, T) => {
  const m = T/2, esc = T/(RAIO_ARENA*2 + 4);
  g.fillStyle = '#1b1a24'; g.fillRect(0, 0, T, T);
  ruidoPontos(g, T, 16000, ['#25242f','#15141c','#2c2a38','#201f2a'], 1, 5);
  // poças (refletem o neon)
  for (let i = 0; i < 40; i++) { g.fillStyle = Math.random() < .5 ? '#3a2a5a55' : '#1f4a6a44'; g.beginPath(); g.ellipse(rnd(0, T), rnd(0, T), rnd(10, 60), rnd(6, 30), rnd(0, 3), 0, 7); g.fill(); }
  // grade e anéis neon
  g.strokeStyle = '#ffffff10'; g.lineWidth = 2;
  for (let k = 0; k < T; k += 4*esc) { g.beginPath(); g.moveTo(k, 0); g.lineTo(k, T); g.stroke(); g.beginPath(); g.moveTo(0, k); g.lineTo(T, k); g.stroke(); }
  g.shadowBlur = 18;
  g.shadowColor = '#ff3af0'; marcaCirculo(g, m, esc, RAIO_ARENA - 1.5, '#ff5af4', .25);
  g.shadowColor = '#3af0ff'; marcaCirculo(g, m, esc, 5, '#5af4ff', .2); marcaCirculo(g, m, esc, RAIO_ARENA - 2.3, '#5af4ff', .1);
  g.strokeStyle = '#5af4ff'; g.lineWidth = .12*esc; g.beginPath(); g.moveTo(m - (RAIO_ARENA - 1.5)*esc, m); g.lineTo(m + (RAIO_ARENA - 1.5)*esc, m); g.stroke();
  g.shadowBlur = 0;
  // placas elétricas
  for (const [x, z, r] of MAPA_ELETRICO) areaNaTextura(g, T, x, z, r, (cx, cy, rr, e) => {
    g.fillStyle = '#2a2a10'; g.fillRect(cx - rr, cy - rr, rr*2, rr*2);
    g.strokeStyle = '#f7d02c'; g.lineWidth = .15*e; g.strokeRect(cx - rr, cy - rr, rr*2, rr*2);
    g.fillStyle = '#f7d02c'; for (let k = -rr; k < rr; k += .9*e) { g.save(); g.beginPath(); g.rect(cx - rr, cy - rr, rr*2, rr*2); g.clip(); g.translate(cx + k, cy - rr); g.rotate(.6); g.fillRect(0, 0, .3*e, rr*3); g.restore(); }
  });
};
TEXTURAS_CHAO.pedra = (g, T) => {
  const m = T/2, esc = T/(RAIO_ARENA*2 + 4);
  g.fillStyle = '#8a7a68'; g.fillRect(0, 0, T, T);
  // lajotas
  const lado = 3*esc;
  for (let y = 0; y < T; y += lado) for (let x = (y/lado % 2)*lado/2 - lado; x < T; x += lado) {
    const c = 120 + Math.random()*30 | 0; g.fillStyle = `rgb(${c},${c*.9|0},${c*.78|0})`; g.fillRect(x + 2, y + 2, lado - 4, lado - 4);
  }
  ruidoPontos(g, T, 9000, ['#00000014','#ffffff0c','#5a4a3a22'], 1, 5);
  // rachaduras
  g.strokeStyle = '#3a2e2466'; g.lineWidth = 2;
  for (let i = 0; i < 40; i++) { let x = rnd(0, T), y = rnd(0, T); g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 5; k++) { x += rnd(-30, 30); y += rnd(-30, 30); g.lineTo(x, y); } g.stroke(); }
  // mosaico do dragão no centro
  g.fillStyle = '#7a1e1e'; g.beginPath(); g.arc(m, m, 7.5*esc, 0, 7); g.fill();
  marcaCirculo(g, m, esc, 7.5, '#d9a43a', .45); marcaCirculo(g, m, esc, 6.6, '#d9a43a', .15);
  g.strokeStyle = '#e8b84a'; g.lineWidth = .7*esc; g.lineCap = 'round';
  g.beginPath(); for (let k = 0; k <= 80; k++) { const a = k/80*Math.PI*3.2, r = (1 + k/80*4.8)*esc; const fn = k ? 'lineTo' : 'moveTo'; g[fn](m + Math.cos(a)*r, m + Math.sin(a)*r); } g.stroke();
  g.fillStyle = '#e8b84a'; const a = Math.PI*3.2, cx = m + Math.cos(a)*5.8*esc, cy = m + Math.sin(a)*5.8*esc;
  g.beginPath(); g.arc(cx, cy, .9*esc, 0, 7); g.fill();
  marcaCirculo(g, m, esc, RAIO_ARENA - 1.5, '#d9a43a', .25);
  // runas
  for (const [x, z, r] of MAPA_RUNA) areaNaTextura(g, T, x, z, r, (rx, ry, rr, e) => {
    g.strokeStyle = '#ffc04a'; g.lineWidth = .14*e; g.beginPath(); g.arc(rx, ry, rr, 0, 7); g.stroke(); g.beginPath(); g.arc(rx, ry, rr*.7, 0, 7); g.stroke();
    for (let k = 0; k < 6; k++) { const b = k/6*7; g.beginPath(); g.moveTo(rx + Math.cos(b)*rr*.7, ry + Math.sin(b)*rr*.7); g.lineTo(rx + Math.cos(b + 2.1)*rr*.7, ry + Math.sin(b + 2.1)*rr*.7); g.stroke(); }
  });
};
TEXTURAS_CHAO.nuvem = (g, T) => {
  const m = T/2, esc = T/(RAIO_ARENA*2 + 4);
  g.fillStyle = '#4f9a3a'; g.fillRect(0, 0, T, T);
  ruidoPontos(g, T, 11000, ['#5aa844','#46902f','#64b04c','#3d8228'], 2, 10);
  // flores
  for (let i = 0; i < 1400; i++) { g.fillStyle = escolher(['#ffffff','#ffe14a','#ff8ac8','#a8d8ff']); g.beginPath(); g.arc(rnd(0, T), rnd(0, T), rnd(2, 4), 0, 7); g.fill(); }
  // caminho de pedras em anel
  for (let i = 0; i < 90; i++) { const a = i/90*7, r = (RAIO_ARENA - 1.6)*esc; g.fillStyle = i % 2 ? '#d8d4c8' : '#c8c2b4'; g.beginPath(); g.ellipse(m + Math.cos(a)*r, m + Math.sin(a)*r, .55*esc, .4*esc, a, 0, 7); g.fill(); }
  marcaCirculo(g, m, esc, 5, '#ffffffaa', .15);
  // correntes de vento
  for (const [x, z, r] of MAPA_VENTO) areaNaTextura(g, T, x, z, r, (cx, cy, rr, e) => {
    g.fillStyle = '#d8f4ff88'; g.beginPath(); g.arc(cx, cy, rr, 0, 7); g.fill();
    g.strokeStyle = '#ffffff'; g.lineWidth = .12*e;
    for (let k = 0; k < 3; k++) { g.beginPath(); for (let j = 0; j <= 30; j++) { const b = j/30*5 + k*2.1, r = rr*(.2 + j/30*.75); g[j ? 'lineTo' : 'moveTo'](cx + Math.cos(b)*r, cy + Math.sin(b)*r); } g.stroke(); }
  });
};
const MAPA_LAMA = [[-12, 3, 3.2], [12, -3, 3.2], [0, -12, 2.6]];
const MAPA_ELETRICO = [[-12, 0, 2.6], [12, 0, 2.6], [0, 12, 2.2]];
const MAPA_RUNA = [[-13, 0, 2.2], [13, 0, 2.2]];
const MAPA_VENTO = [[-12, -2, 2.6], [12, 2, 2.6], [0, 13, 2.2]];

/* =========================================================
   ESTÁDIO melhorado: telões, bandeiras e cones de luz
   ========================================================= */
function melhorarEstadio(A){
  // cones de luz dos refletores
  for (let i = 0; i < 4; i++) {
    const a = i*Math.PI/2 + Math.PI/4, r = RAIO_ARENA + 14;
    const topo = new THREE.Vector3(Math.cos(a)*r, 22, Math.sin(a)*r), chao = new THREE.Vector3(Math.cos(a)*5, 0, Math.sin(a)*5);
    const dir = topo.clone().sub(chao), alt = dir.length();
    const cone = new THREE.Mesh(new THREE.ConeGeometry(7, alt, 24, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xfff6d0, transparent: true, opacity: .06, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
    cone.position.copy(chao).addScaledVector(dir, .5);
    cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    A.grupo.add(cone);
  }
  // telões
  const can = document.createElement('canvas'); can.width = 512; can.height = 256;
  const ctx = can.getContext('2d'), tex = new THREE.CanvasTexture(can); tex.encoding = THREE.sRGBEncoding;
  for (const lado of [0, 1]) {
    const a = lado ? Math.PI*.5 : -Math.PI*.5, r = RAIO_ARENA + 17;
    const g = new THREE.Group();
    const moldura = new THREE.Mesh(new THREE.BoxGeometry(15, 8.4, .8), matPadrao(0x1d2233, { metalness: .5, roughness: .4 }));
    const tela = new THREE.Mesh(new THREE.PlaneGeometry(14, 7.4), new THREE.MeshBasicMaterial({ map: tex, fog: false }));
    tela.position.z = .41; g.add(moldura, tela);
    const pe = new THREE.Mesh(new THREE.BoxGeometry(1, 10, 1), matPadrao(0x6a7080)); pe.position.y = -8; g.add(pe);
    g.position.set(Math.cos(a)*r, 15, Math.sin(a)*r); g.lookAt(0, 15, 0); A.grupo.add(g);
  }
  A.telao = { aviso: '', avisoT: 0, t: 0 };
  const desenharTelao = () => {
    const T = A.telao;
    ctx.fillStyle = '#071024'; ctx.fillRect(0, 0, 512, 256);
    ctx.fillStyle = '#ffffff08'; for (let y = 0; y < 256; y += 4) ctx.fillRect(0, y, 512, 2);
    ctx.textAlign = 'center'; ctx.font = '900 30px Rubik, sans-serif';
    if (T.avisoT > 0) {
      ctx.fillStyle = (T.t*8 | 0) % 2 ? '#ffd84a' : '#ff5a6a'; ctx.font = '900 64px Rubik, sans-serif'; ctx.fillText(T.aviso, 256, 150); return;
    }
    const P = emCampo(), [a, b] = [typeof lutador === 'function' ? lutador(0) : null, typeof lutador === 'function' ? lutador(1) : null];
    if (!a || !b || JOGO.estado !== 'batalha') { ctx.fillStyle = '#ffd84a'; ctx.fillText('POKÉMON ARENA', 256, 120); ctx.font = '600 20px Rubik, sans-serif'; ctx.fillStyle = '#6fd0ff'; ctx.fillText('ULTIMATE BATTLE', 256, 156); return; }
    for (const [L, x, cor] of [[a, 128, '#3a8bff'], [b, 384, '#ff4a5a']]) {
      ctx.fillStyle = cor; ctx.font = '900 30px Rubik, sans-serif'; ctx.fillText(L.p.nome.toUpperCase(), x, 70);
      ctx.fillStyle = '#000'; ctx.fillRect(x - 100, 96, 200, 22);
      ctx.fillStyle = L.hp/L.hpMax > .3 ? '#3ddc84' : '#ff5a4a'; ctx.fillRect(x - 100, 96, 200*L.hp/L.hpMax, 22);
      if (L.comboHits > 1) { ctx.fillStyle = '#ffd84a'; ctx.font = '900 40px Rubik, sans-serif'; ctx.fillText(L.comboHits + ' HITS', x, 180); }
    }
    ctx.fillStyle = '#fff'; ctx.font = '900 34px Rubik, sans-serif'; ctx.fillText('VS', 256, 118);
    void P;
  };
  let tTela = 0;
  A.animar.push(dt => { A.telao.t += dt; A.telao.avisoT -= dt; tTela -= dt; if (tTela <= 0) { tTela = .2; desenharTelao(); tex.needsUpdate = true; } });
  // bandeiras tremulando em cima da arquibancada
  const bandeiras = [];
  const cores = [0xe8383d, 0x2f6fd6, 0xf7c531, 0x3bb54a, 0x7a3fd0, 0xff8a3d];
  const qtdB = POUCO() ? 6 : 12;
  for (let i = 0; i < qtdB; i++) {
    const a = i/qtdB*Math.PI*2 + .2, r = RAIO_ARENA + 13.5;
    const mastro = new THREE.Mesh(new THREE.CylinderGeometry(.08, .08, 5, 6), matPadrao(0xdddddd, { metalness: .6 }));
    mastro.position.set(Math.cos(a)*r, 9, Math.sin(a)*r); A.grupo.add(mastro);
    const geo = new THREE.PlaneGeometry(3, 1.8, 12, 3); geo.translate(1.5, 0, 0);
    const b = new THREE.Mesh(geo, matPadrao(cores[i % cores.length], { side: THREE.DoubleSide, roughness: .8 }));
    b.position.set(Math.cos(a)*r, 10.6, Math.sin(a)*r); b.rotation.y = -a + Math.PI/2;
    A.grupo.add(b); bandeiras.push({ geo, base: geo.attributes.position.array.slice(), f: Math.random()*7 });
  }
  A.animar.push(dt => {
    const t = performance.now()/1000;
    for (const B of bandeiras) {
      const p = B.geo.attributes.position, b = B.base;
      for (let i = 0; i < p.count; i++) { const x = b[i*3]; p.array[i*3 + 2] = Math.sin(x*2.2 - t*5 + B.f)*.22*x/3; }
      p.needsUpdate = true;
    }
  });
  // a torcida comemora golpes fortes e o telão mostra
  A.reagir.push((x, z, forca) => {
    if (A.torcida) A.torcida.empolgacao = Math.min(1, A.torcida.empolgacao + forca*.5);
    if (forca > 1.2) { A.telao.aviso = escolher(['INCRÍVEL!', 'QUE GOLPE!', 'UAU!', 'BRUTAL!']); A.telao.avisoT = 1.6; }
  });
  // flashes de câmeras na torcida
  A.clima = dt => {
    const n = dt*60;
    for (let i = 0; i < n; i++) {
      if (Math.random() < .08) { const a = Math.random()*7, r = Math.random()*RAIO_ARENA*1.2; BRILHO.add({ x: Math.cos(a)*r, y: rnd(.5, 5), z: Math.sin(a)*r, vx: rnd(-.2, .2), vy: rnd(-.1, .2), vz: rnd(-.2, .2), cor: 0xfff2b0, tam: rnd(.06, .12), vida: rnd(2, 4), atrito: 0, cel: 'brilho' }); }
      if (Math.random() < .12 + (A.torcida ? A.torcida.empolgacao*.6 : 0)) { const a = Math.random()*7, f = Math.random()*5 | 0, r = RAIO_ARENA + 3.5 + f*2.2; BRILHO.add({ x: Math.cos(a)*r, y: 2.2 + f*1.4, z: Math.sin(a)*r, cor: 0xffffff, tam: rnd(.4, .7), vida: .12, atrito: 0, cel: 'brilho' }); }
    }
  };
}

/* =========================================================
   VULCÃO melhorado: rio de lava, fumaça e erupções
   ========================================================= */
function melhorarVulcao(A){
  const texLava = texturaCanvas(256, (g, T) => { g.fillStyle = '#ff4a08'; g.fillRect(0, 0, T, T); ruidoPontos(g, T, 600, ['#ffb32a','#ff7a1a','#ffd86b','#c02a00'], 4, 20); }, 8);
  const rio = new THREE.Mesh(new THREE.RingGeometry(RAIO_ARENA + 2.05, RAIO_ARENA + 3.2, 96), new THREE.MeshBasicMaterial({ map: texLava }));
  rio.rotation.x = -Math.PI/2; rio.position.y = .02; A.grupo.add(rio);
  A.animar.push(dt => { texLava.offset.x += dt*.03; });
  // erupções: o vulcão cospe pedras que caem no campo (aviso vermelho antes)
  const caindo = [];
  let prox = 14;
  A.animar.push(dt => {
    for (let i = caindo.length - 1; i >= 0; i--) {
      const c = caindo[i]; c.t += dt;
      const k = Math.min(1, c.t/1.3);
      c.mesh.position.set(c.x, 34*(1 - k*k), c.z); c.mesh.rotation.x += dt*5;
      if (Math.random() < .6) BRILHO.add({ x: c.x, y: c.mesh.position.y, z: c.z, vy: 2, cor: 0xff7a1a, tam: .6, vida: .4, cel: 'brilho' });
      if (c.t > .2 && (c.t*6 | 0) !== (c.aviso | 0)) { c.aviso = c.t*6; onda(c.x, c.z, 2.6, 0xff2a00, .25); }
      if (k >= 1) {
        A.grupo.remove(c.mesh); caindo.splice(i, 1);
        onda(c.x, c.z, 5, 0xff6a1a, .5); flash('brilho', 0xff7a1a, c.x, 1, c.z, 6, .3); pedacos(c.x, .5, c.z, 10, 'rock', 7); rachaduras(c.x, c.z, 2.5);
        soltar('fire', c.x, .5, c.z, 18, 5, .5, .6); tremer(.25); SOM.explosao();
        for (const L of emCampo()) if (Math.hypot(L.pos.x - c.x, L.pos.z - c.z) < 2.6 && !L.inv) aplicarDano(null, L, 14, 'rock', 'Erupção');
      }
    }
    if (!emBatalha() || JOGO.regras.treino) return;
    prox -= dt;
    if (prox <= 0) {
      prox = rnd(14, 20); tremer(.35); SOM.area();
      flash('brilho', 0xff6a1a, -30, 32, -120, 40, .6);
      for (let k = 0; k < 40; k++) BRILHO.add({ x: -30 + rnd(-4, 4), y: 31, z: -120 + rnd(-4, 4), vx: rnd(-8, 8), vy: rnd(10, 22), vz: rnd(-8, 8), grav: 9, cor: 0xff7a1a, tam: rnd(.8, 1.6), vida: 2, atrito: .1, cel: 'brilho' });
      const alvos = emCampo();
      for (let k = 0; k < 3; k++) {
        const L = alvos[k % Math.max(1, alvos.length)], a = Math.random()*7, r = rnd(1, 6);
        const x = THREE.MathUtils.clamp((L ? L.pos.x : 0) + Math.cos(a)*r, -RAIO_ARENA + 2, RAIO_ARENA - 2), z = THREE.MathUtils.clamp((L ? L.pos.z : 0) + Math.sin(a)*r, -RAIO_ARENA + 2, RAIO_ARENA - 2);
        const mesh = rochaMesh(.9, 0x3a2420); mesh.material.emissive = new THREE.Color(0xff4a00); mesh.material.emissiveIntensity = .7;
        A.grupo.add(mesh); caindo.push({ x, z, t: -k*.35, mesh, aviso: 0 });
      }
    }
  });
  // golpes perto da lava espirram lava; água vira vapor
  A.reagir.push((x, z, forca, tipo) => {
    if (tipo === 'water' || tipo === 'ice') for (let k = 0; k < 14*forca; k++) FUMACA.add({ x: x + rnd(-1, 1), y: .3, z: z + rnd(-1, 1), vx: rnd(-1, 1), vy: rnd(2, 5), vz: rnd(-1, 1), cor: 0xe8e8e8, tam: rnd(.6, 1.2), vida: 1.2, cresce: 1.5, atrito: .8, cel: 'fumaca0' });
    for (const p of A.perigos) if (Math.hypot(p.x - x, p.z - z) < p.r + 3)
      for (let k = 0; k < 16*forca; k++) BRILHO.add({ x: p.x + rnd(-p.r, p.r)*.6, y: .2, z: p.z + rnd(-p.r, p.r)*.6, vx: rnd(-3, 3), vy: rnd(5, 10), vz: rnd(-3, 3), grav: 18, cor: escolher([0xff7a1a, 0xffb32a]), tam: rnd(.2, .4), vida: 1, atrito: .2, cel: 'brilho' });
  });
  A.clima = dt => {
    const n = dt*60;
    for (let i = 0; i < n; i++) {
      const a = Math.random()*7, r = Math.random()*RAIO_ARENA*1.2;
      if (Math.random() < .5) BRILHO.add({ x: Math.cos(a)*r, y: 0, z: Math.sin(a)*r, vx: rnd(-.3, .3), vy: rnd(1, 2.5), vz: rnd(-.3, .3), cor: Math.random() < .5 ? 0xff7a1a : 0xffc04a, tam: rnd(.1, .2), vida: rnd(2, 4), atrito: .2, cel: 'brilho' });
      if (Math.random() < .25) FUMACA.add({ x: -30 + rnd(-5, 5), y: 32, z: -120 + rnd(-5, 5), vx: rnd(1, 3), vy: rnd(3, 6), vz: rnd(-1, 1), cor: 0x2a2220, tam: rnd(6, 10), vida: 6, cresce: 2, atrito: 0, cel: 'fumaca0', some: 1 });
    }
  };
}

/* =========================================================
   GELEIRA melhorada: aurora boreal e cristais que soltam neve
   ========================================================= */
function melhorarGelo(A){
  const aurora = new THREE.Mesh(new THREE.CylinderGeometry(150, 150, 46, 96, 1, true, -.6, Math.PI*1.3),
    new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, side: THREE.BackSide, blending: THREE.AdditiveBlending, fog: false,
      uniforms: { t: { value: 0 } },
      vertexShader: 'varying vec2 vU; void main(){ vU = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }',
      fragmentShader: `uniform float t; varying vec2 vU;
        void main(){
          float x = vU.x*14.;
          float onda = sin(x + t*.4)*.12 + sin(x*2.3 - t*.7)*.06;
          float faixa = smoothstep(.15, .5, vU.y + onda) * (1. - smoothstep(.5, 1., vU.y + onda));
          float raios = .55 + .45*sin(x*9. + t*1.3 + sin(x*3.)*2.);
          vec3 cor = mix(vec3(.15,1.,.55), vec3(.6,.3,1.), smoothstep(.35,.9,vU.y + onda*.5));
          float bordas = smoothstep(0., .08, vU.x)*smoothstep(1., .92, vU.x);
          gl_FragColor = vec4(cor*faixa*raios*bordas*.55, 1.);
        }`,
    }));
  aurora.position.y = 62; A.grupo.add(aurora);
  A.animar.push(dt => { aurora.material.uniforms.t.value += dt; });
  // golpes de gelo congelam o chão por um instante; golpes fortes derrubam neve dos cristais
  A.reagir.push((x, z, forca, tipo) => {
    if (tipo === 'ice') { onda(x, z, 4*forca, 0xbfe6ff, .6); flash('anel', 0xbfe6ff, x, .1, z, 4, .4); }
    for (const o of A.obstaculos) if (o.vivo && Math.hypot(o.x - x, o.z - z) < 6)
      for (let k = 0; k < 12; k++) FUMACA.add({ x: o.x + rnd(-1, 1), y: o.altura, z: o.z + rnd(-1, 1), vx: rnd(-1, 1), vy: rnd(0, 1), vz: rnd(-1, 1), grav: 4, cor: 0xffffff, tam: rnd(.12, .25), vida: 1.4, cel: 'brilho' });
  });
  A.clima = dt => {
    const n = dt*60, vento = Math.sin(performance.now()/3000)*1.5;
    for (let i = 0; i < n; i++) {
      const a = Math.random()*7, r = Math.random()*RAIO_ARENA*1.3;
      if (Math.random() < .8) FUMACA.add({ x: Math.cos(a)*r, y: rnd(8, 14), z: Math.sin(a)*r, vx: vento + rnd(-.6, .6), vy: -rnd(1, 2), vz: rnd(-.6, .6), cor: 0xffffff, tam: rnd(.1, .22), vida: 7, atrito: 0, cel: 'brilho' });
      if (Math.random() < .05) { const o = escolher(A.obstaculos); if (o && o.vivo) BRILHO.add({ x: o.x + rnd(-.8, .8), y: rnd(.5, o.altura), z: o.z + rnd(-.8, .8), cor: 0xd8f4ff, tam: rnd(.2, .4), vida: .5, atrito: 0, cel: 'brilho' }); }
    }
  };
}

/* =========================================================
   FLORESTA ANCESTRAL
   ========================================================= */
function arvore(alt, raio, corCopa){
  const g = new THREE.Group();
  const tronco = new THREE.Mesh(new THREE.CylinderGeometry(raio*.7, raio, alt, 9), matPadrao(0x5a3e28, { flatShading: true }));
  tronco.position.y = alt/2; g.add(tronco);
  for (let k = 0; k < 4; k++) {
    const c = new THREE.Mesh(new THREE.IcosahedronGeometry(raio*rnd(2.6, 3.6), 0), matPadrao(corCopa, { flatShading: true }));
    c.position.set(rnd(-1, 1)*raio*1.5, alt + rnd(-2, 2), rnd(-1, 1)*raio*1.5); c.rotation.set(rnd(0, 3), rnd(0, 3), 0); g.add(c);
  }
  return g;
}
function montarFloresta(A){
  cena.fog.near = 28; cena.fog.far = 130;
  const copas = [0x2f5a24, 0x3a6b2a, 0x24481c, 0x41762f];
  const qtd = POUCO() ? 22 : 38;
  for (let i = 0; i < qtd; i++) {
    const a = i/qtd*Math.PI*2 + rnd(-.05, .05), r = RAIO_ARENA + rnd(6.5, 16);
    const t = arvore(rnd(14, 24), rnd(.9, 1.6), escolher(copas));
    t.position.set(Math.cos(a)*r, 0, Math.sin(a)*r); t.traverse(o => { if (o.isMesh) o.castShadow = true; }); A.grupo.add(t);
  }
  // árvore ancestral gigante ao fundo
  const gigante = arvore(60, 7, 0x2a5a2a); gigante.position.set(0, 0, -78); gigante.scale.setScalar(1.3); A.grupo.add(gigante);
  // runas brilhando no tronco da árvore ancestral
  for (let k = 0; k < 6; k++) {
    const runa = new THREE.Mesh(new THREE.TorusGeometry(1.2, .15, 6, 6), matNeon(0x8affc0));
    runa.position.set(rnd(-3, 3), 8 + k*7, -78 + 9); A.grupo.add(runa);
  }
  // raios de sol entre as árvores
  if (!POUCO()) for (let k = 0; k < 7; k++) {
    const raio = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 3.5, 50, 12, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xfff0b0, transparent: true, opacity: .028, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, side: THREE.DoubleSide }));
    raio.position.set(rnd(-18, 18), 22, rnd(-18, 18)); raio.rotation.set(.25, 0, rnd(-.3, .3)); A.grupo.add(raio);
  }
  // cogumelos que brilham na borda
  for (let k = 0; k < 26; k++) {
    const a = rnd(0, 7), r = RAIO_ARENA + rnd(.8, 2.4), g = new THREE.Group(), s = rnd(.4, 1);
    const pe = new THREE.Mesh(new THREE.CylinderGeometry(.08*s, .1*s, .5*s, 6), matPadrao(0xeee6d0)); pe.position.y = .25*s;
    const chapeu = new THREE.Mesh(new THREE.SphereGeometry(.3*s, 10, 6, 0, 7, 0, Math.PI/2), matPadrao(0x40c0ff, { emissive: 0x2090ff, emissiveIntensity: .9 }));
    chapeu.position.y = .5*s; g.add(pe, chapeu); g.position.set(Math.cos(a)*r, 0, Math.sin(a)*r); A.grupo.add(g);
  }
  // lama (deixa lento)
  for (const [x, z, r] of MAPA_LAMA) A.perigos.push({ tipo: 'lama', x, z, r });
  // tocos (quebráveis) e pedras com musgo
  const texToco = texturaCanvas(128, (g, T) => { g.fillStyle = '#b08a5a'; g.fillRect(0, 0, T, T); g.strokeStyle = '#7a5a38'; g.lineWidth = 3; for (let r = 6; r < T/2; r += 7) { g.beginPath(); g.arc(T/2, T/2, r, 0, 7); g.stroke(); } });
  POSICOES_OBST.forEach(([x, z], i) => {
    const g = new THREE.Group();
    if (i < 4) {
      const t = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.35, 1.8, 12), [matPadrao(0x6a4a30), new THREE.MeshStandardMaterial({ map: texToco, roughness: .9 }), matPadrao(0x6a4a30)]);
      t.position.y = .9; g.add(t);
      const musgo = new THREE.Mesh(new THREE.SphereGeometry(.6, 8, 6), matPadrao(0x4a8a30, { flatShading: true })); musgo.position.set(.7, 1.6, .3); musgo.scale.y = .4; g.add(musgo);
      addObstaculo(A, g, x, z, 1.3, { hp: 110, altura: 2, cor: 0x8a6a40 });
    } else {
      const p = rochaMesh(1.5, 0x6a6a5a); p.position.y = 1; g.add(p);
      const m = rochaMesh(1.1, 0x4a8a30); m.position.y = 1.9; m.scale.set(1.1, .35, 1.1); g.add(m);
      addObstaculo(A, g, x, z, 1.5, { altura: 2.6 });
    }
  });
  // reações: folhas caem das árvores, fogo deixa marca queimada
  const queimadas = [];
  A.reagir.push((x, z, forca, tipo) => {
    const qtdF = 18*forca;
    for (let k = 0; k < qtdF; k++) { const a = rnd(0, 7), r = RAIO_ARENA + rnd(2, 8); FUMACA.add({ x: Math.cos(a)*r*.8, y: rnd(10, 16), z: Math.sin(a)*r*.8, vx: rnd(-1, 1), vy: -rnd(1, 2), vz: rnd(-1, 1), cor: escolher([0x5aa040, 0x8ac050, 0xc0a040]), tam: rnd(.25, .4), vida: 6, atrito: .3, vrot: rnd(-3, 3), cel: escolher(['leaf1', 'leaf2']) }); }
    if (tipo === 'fire') {
      const m = new THREE.Mesh(new THREE.CircleGeometry(1.4*forca + .6, 20), new THREE.MeshBasicMaterial({ color: 0x1a0f08, transparent: true, opacity: .7, depthWrite: false }));
      m.rotation.x = -Math.PI/2; m.position.set(x, .04, z); A.grupo.add(m); queimadas.push({ m, t: 6, x, z });
    }
  });
  A.animar.push(dt => {
    for (let i = queimadas.length - 1; i >= 0; i--) {
      const q = queimadas[i]; q.t -= dt; q.m.material.opacity = Math.min(.7, q.t/3*.7);
      if (q.t > 4 && Math.random() < dt*20) part('chama0', { x: q.x + rnd(-.8, .8), y: .2, z: q.z + rnd(-.8, .8), vy: rnd(1.5, 3), cor: 0xffffff, tam: rnd(.3, .6), vida: .5, atrito: .5 });
      if (q.t <= 0) { A.grupo.remove(q.m); q.m.geometry.dispose(); queimadas.splice(i, 1); }
    }
  });
  A.clima = dt => {
    const n = dt*60;
    for (let i = 0; i < n; i++) {
      const a = Math.random()*7, r = Math.random()*RAIO_ARENA*1.3;
      if (Math.random() < .25) BRILHO.add({ x: Math.cos(a)*r, y: rnd(.4, 4), z: Math.sin(a)*r, vx: rnd(-.5, .5), vy: rnd(-.3, .3), vz: rnd(-.5, .5), cor: escolher([0xd8ff6a, 0xa8ff8a]), tam: rnd(.08, .16), vida: rnd(2, 4), atrito: 0, cel: 'brilho' });
      if (Math.random() < .12) FUMACA.add({ x: Math.cos(a)*r, y: rnd(12, 16), z: Math.sin(a)*r, vx: rnd(-.8, .8), vy: -rnd(.8, 1.5), vz: rnd(-.8, .8), cor: escolher([0x5aa040, 0x8ac050, 0xc0a040]), tam: rnd(.2, .35), vida: 9, atrito: 0, vrot: rnd(-2, 2), cel: escolher(['leaf1', 'leaf2']) });
    }
  };
}

/* =========================================================
   CIDADE NEON
   ========================================================= */
function texturaJanelas(){
  return texturaCanvas(256, (g, T) => {
    g.fillStyle = '#0c0a18'; g.fillRect(0, 0, T, T);
    for (let y = 6; y < T; y += 14) for (let x = 6; x < T; x += 12) {
      if (Math.random() < .45) continue;
      g.fillStyle = escolher(['#ffd86a', '#5af4ff', '#ff5af4', '#ffffff', '#8a7aff']); g.globalAlpha = rnd(.4, 1); g.fillRect(x, y, 7, 9);
    }
    g.globalAlpha = 1;
  });
}
function letreiro(texto, cor){
  const c = document.createElement('canvas'); c.width = 512; c.height = 160;
  const g = c.getContext('2d');
  g.font = '900 96px Rubik, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.shadowColor = cor; g.shadowBlur = 30; g.fillStyle = cor; g.fillText(texto, 256, 84); g.shadowBlur = 8; g.fillStyle = '#ffffff'; g.fillText(texto, 256, 84);
  const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding;
  return new THREE.Mesh(new THREE.PlaneGeometry(12, 3.75), new THREE.MeshBasicMaterial({ map: t, transparent: true, fog: false, side: THREE.DoubleSide }));
}
function montarCidade(A){
  cena.fog.near = 40; cena.fog.far = 170;
  const texJ = texturaJanelas();
  const qtd = POUCO() ? 16 : 24, letreiros = [];
  const nomes = [['POKÉ MART', '#5af4ff'], ['ARENA', '#ff5af4'], ['24H', '#ffd84a'], ['NEON', '#8a7aff'], ['BATALHA', '#ff5a6a'], ['CENTRO', '#7dff9a']];
  for (let i = 0; i < qtd; i++) {
    const a = i/qtd*Math.PI*2 + rnd(-.04, .04), r = rnd(38, 66), alt = rnd(22, 70), lar = rnd(9, 14);
    const tj = texJ.clone(); tj.needsUpdate = true; tj.wrapS = tj.wrapT = THREE.RepeatWrapping; tj.repeat.set(lar/6, alt/10);
    const m = new THREE.Mesh(new THREE.BoxGeometry(lar, alt, lar), new THREE.MeshStandardMaterial({ color: 0x1a1828, roughness: .6, metalness: .3, emissive: 0xffffff, emissiveMap: tj, emissiveIntensity: .6 }));
    m.position.set(Math.cos(a)*r, alt/2, Math.sin(a)*r); m.rotation.y = -a; A.grupo.add(m);
    if (i % 3 === 0) {
      const [txt, cor] = nomes[(i/3 | 0) % nomes.length], l = letreiro(txt, cor);
      const rr = r - lar/2 - .3; l.scale.setScalar(Math.min(1, (lar - .6)/12));
      l.position.set(Math.cos(a)*rr, Math.min(alt - 3, rnd(10, 20)), Math.sin(a)*rr); l.lookAt(0, l.position.y, 0); A.grupo.add(l);
      letreiros.push({ m: l, f: Math.random()*7, apagado: 0 });
    }
  }
  // anéis de neon em volta do campo
  for (const [y, cor] of [[.25, 0xff3af0], [.9, 0x3af0ff]]) {
    const anel = new THREE.Mesh(new THREE.TorusGeometry(RAIO_ARENA + 1.8, .07, 6, 128), matNeon(cor)); anel.rotation.x = Math.PI/2; anel.position.y = y; A.grupo.add(anel);
  }
  // postes de luz
  for (let k = 0; k < 8; k++) {
    const a = k/8*Math.PI*2 + .2, r = RAIO_ARENA + 3;
    const poste = new THREE.Mesh(new THREE.CylinderGeometry(.12, .16, 7, 6), matPadrao(0x3a3a4a, { metalness: .7, roughness: .3 })); poste.position.set(Math.cos(a)*r, 3.5, Math.sin(a)*r);
    const luz = new THREE.Mesh(new THREE.BoxGeometry(.5, .2, 1.6), matNeon(k % 2 ? 0xff5af4 : 0x5af4ff)); luz.position.set(Math.cos(a)*(r - .7), 7, Math.sin(a)*(r - .7)); luz.rotation.y = -a;
    A.grupo.add(poste, luz);
  }
  const luzRosa = new THREE.PointLight(0xff3af0, 1.4, 50, 2); luzRosa.position.set(-14, 8, -10);
  const luzAzul = new THREE.PointLight(0x3af0ff, 1.4, 50, 2); luzAzul.position.set(14, 8, 10);
  A.grupo.add(luzRosa, luzAzul);
  // pisos elétricos: ligam a cada 6 s (piscam antes)
  const grades = MAPA_ELETRICO.map(([x, z, r]) => {
    const p = { tipo: 'eletrico', x, z, r, ativo: false };
    A.perigos.push(p);
    const brilho = new THREE.Mesh(new THREE.PlaneGeometry(r*2, r*2), new THREE.MeshBasicMaterial({ color: 0xf7d02c, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
    brilho.rotation.x = -Math.PI/2; brilho.position.set(x, .05, z); A.grupo.add(brilho);
    return { p, brilho };
  });
  let ciclo = 0;
  A.animar.push(dt => {
    ciclo = (ciclo + dt) % 6;
    const aviso = ciclo > 3.7 && ciclo < 4.5, ativo = ciclo >= 4.5;
    for (const G of grades) {
      G.p.ativo = ativo && emBatalha();
      G.brilho.material.opacity = ativo ? .35 + Math.random()*.3 : aviso ? ((ciclo*10 | 0) % 2)*.2 : 0;
      if (G.p.ativo && Math.random() < dt*25) raioRamificado(new THREE.Vector3(G.p.x + rnd(-G.p.r, G.p.r), .1, G.p.z + rnd(-G.p.r, G.p.r)), new THREE.Vector3(G.p.x + rnd(-G.p.r, G.p.r), rnd(.8, 2), G.p.z + rnd(-G.p.r, G.p.r)), 0xf7e05a, 1, .12);
    }
    // letreiros piscam
    const t = performance.now()/1000;
    for (const L of letreiros) {
      L.apagado -= dt;
      L.m.material.opacity = L.apagado > 0 ? (Math.random() < .3 ? 1 : .08) : .85 + Math.sin(t*3 + L.f)*.15;
    }
  });
  // golpes elétricos fazem os letreiros perto falharem; golpes fortes soltam faíscas dos postes
  A.reagir.push((x, z, forca, tipo) => {
    for (const L of letreiros) if (tipo === 'electric' || Math.random() < .15*forca) L.apagado = rnd(.6, 1.5);
    if (tipo === 'water') for (let k = 0; k < 20*forca; k++) FUMACA.add({ x: x + rnd(-1, 1), y: .1, z: z + rnd(-1, 1), vx: rnd(-3, 3), vy: rnd(2, 5), vz: rnd(-3, 3), grav: 14, cor: 0x9fd8ff, tam: rnd(.1, .2), vida: .8, cel: 'gota' });
    for (let k = 0; k < 10*forca; k++) { const a = rnd(0, 7), r = RAIO_ARENA + 2.3; BRILHO.add({ x: Math.cos(a)*r, y: 7, z: Math.sin(a)*r, vx: rnd(-2, 2), vy: rnd(0, 3), vz: rnd(-2, 2), grav: 12, cor: 0xffe08a, tam: rnd(.08, .15), vida: .8, atrito: .3, cel: 'faisca' }); }
  });
  // máquinas de bebida (quebráveis) e colunas holográficas
  POSICOES_OBST.forEach(([x, z], i) => {
    const g = new THREE.Group();
    if (i < 4) {
      const corpo = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.4, 1.2), matPadrao(i % 2 ? 0xd03a5a : 0x2a6ad0, { roughness: .4, metalness: .3 })); corpo.position.y = 1.2;
      const frente = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.6), matNeon(0xdff6ff, .9)); frente.position.set(0, 1.4, .61);
      g.add(corpo, frente); g.rotation.y = Math.atan2(-x, -z);
      addObstaculo(A, g, x, z, 1.2, { hp: 100, altura: 2.4, cor: i % 2 ? 0xd03a5a : 0x2a6ad0 });
    } else {
      const base = new THREE.Mesh(new THREE.CylinderGeometry(1, 1.2, .5, 16), matPadrao(0x2a2a3a, { metalness: .6, roughness: .3 })); base.position.y = .25;
      const holo = new THREE.Mesh(new THREE.CylinderGeometry(.8, .8, 4, 16, 1, true), new THREE.MeshBasicMaterial({ color: 0x5af4ff, transparent: true, opacity: .25, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
      holo.position.y = 2.5; const nucleo = new THREE.Mesh(new THREE.OctahedronGeometry(.5), matNeon(0xff5af4)); nucleo.position.y = 2.6;
      g.add(base, holo, nucleo); A.animar.push(dt => { nucleo.rotation.y += dt*2; nucleo.position.y = 2.6 + Math.sin(performance.now()/500)*.3; });
      addObstaculo(A, g, x, z, 1.2, { altura: 3.5 });
    }
  });
  A.clima = dt => {
    const n = dt*60;
    for (let i = 0; i < n*3; i++) {
      const a = Math.random()*7, r = Math.random()*RAIO_ARENA*1.4;
      FUMACA.add({ x: Math.cos(a)*r, y: rnd(10, 16), z: Math.sin(a)*r, vx: .8, vy: -22, vz: 0, cor: 0x9fb4ff, tam: rnd(.08, .14), vida: .7, atrito: 0, rot: 0, cel: 'gota' });
      if (Math.random() < .15) BRILHO.add({ x: Math.cos(a)*r, y: .08, z: Math.sin(a)*r, cor: 0x9fd8ff, tam: rnd(.15, .3), vida: .15, atrito: 0, cel: 'anel' });
    }
  };
}

/* =========================================================
   TEMPLO DOS DRAGÕES
   ========================================================= */
function montarTemplo(A){
  const vermelho = matPadrao(0xb02a22, { roughness: .6 }), ouro = matPadrao(0xd9a43a, { roughness: .35, metalness: .7 }), pedra = matPadrao(0x8a7a68, { flatShading: true });
  // degraus em volta
  for (let i = 0; i < 3; i++) {
    const d = new THREE.Mesh(new THREE.CylinderGeometry(RAIO_ARENA + 2.4 + i*1.6, RAIO_ARENA + 2.4 + i*1.6, .6 + i*.6, 64, 1, true), new THREE.MeshStandardMaterial({ color: 0x7a6a58, side: THREE.BackSide, roughness: .95 }));
    d.position.y = (.6 + i*.6)/2; A.grupo.add(d);
    const tampa = new THREE.Mesh(new THREE.RingGeometry(RAIO_ARENA + 2.4 + i*1.6 - 1.6, RAIO_ARENA + 2.4 + i*1.6, 64), matPadrao(0x9a8a76)); tampa.rotation.x = -Math.PI/2; tampa.position.y = .6 + i*.6; A.grupo.add(tampa);
  }
  // colunas vermelhas com lanternas penduradas
  const lanternas = [];
  for (let k = 0; k < 12; k++) {
    const a = k/12*Math.PI*2, r = RAIO_ARENA + 5;
    const col = new THREE.Mesh(new THREE.CylinderGeometry(.6, .7, 9, 12), vermelho); col.position.set(Math.cos(a)*r, 6, Math.sin(a)*r);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(1.8, .6, 1.8), ouro); cap.position.set(Math.cos(a)*r, 10.7, Math.sin(a)*r); cap.rotation.y = -a;
    A.grupo.add(col, cap);
    const piv = new THREE.Group(); piv.position.set(Math.cos(a)*(r - 1.2), 10, Math.sin(a)*(r - 1.2));
    const fio = new THREE.Mesh(new THREE.CylinderGeometry(.02, .02, 1.4, 4), matPadrao(0x222222)); fio.position.y = -.7;
    const lan = new THREE.Mesh(new THREE.SphereGeometry(.45, 12, 8), matPadrao(0xff6a2a, { emissive: 0xff5a1a, emissiveIntensity: 1.1 })); lan.scale.y = 1.3; lan.position.y = -1.7;
    piv.add(fio, lan); A.grupo.add(piv); lanternas.push({ piv, vx: 0, vz: 0, f: Math.random()*7 });
  }
  // portões (torii) nos dois lados
  for (const s of [-1, 1]) {
    const g = new THREE.Group();
    for (const lx of [-4, 4]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(.45, .55, 10, 10), vermelho); p.position.set(lx, 5, 0); g.add(p); }
    const v1 = new THREE.Mesh(new THREE.BoxGeometry(11, .7, .9), vermelho); v1.position.y = 10; const v2 = new THREE.Mesh(new THREE.BoxGeometry(9.5, .45, .6), vermelho); v2.position.y = 8.4;
    const topo = new THREE.Mesh(new THREE.BoxGeometry(12, .35, 1.3), matPadrao(0x2a1a1a)); topo.position.y = 10.5;
    g.add(v1, v2, topo); g.position.set(0, 0, s*(RAIO_ARENA + 9)); A.grupo.add(g);
  }
  // montanhas ao pôr do sol
  for (let i = 0; i < 10; i++) {
    const a = i/10*Math.PI*2, m = new THREE.Mesh(new THREE.ConeGeometry(rnd(20, 34), rnd(30, 60), 6), matPadrao(escolher([0x6a4a7a, 0x5a3e6a, 0x7a5a8a]), { flatShading: true }));
    m.position.set(Math.cos(a)*125, 12, Math.sin(a)*125); A.grupo.add(m);
  }
  // estátua do dragão serpente enrolada ao fundo
  const pts = []; for (let k = 0; k <= 40; k++) { const t = k/40; pts.push(new THREE.Vector3(Math.cos(t*9)*(14 - t*6), 4 + t*48, -95 + Math.sin(t*9)*(14 - t*6))); }
  const curva = new THREE.CatmullRomCurve3(pts);
  const corpo = new THREE.Mesh(new THREE.TubeGeometry(curva, 160, 2.6, 10, false), matPadrao(0x3aa07a, { roughness: .4, metalness: .4, flatShading: true }));
  A.grupo.add(corpo);
  const fim = curva.getPoint(1), tang = curva.getTangent(1);
  const cabeca = new THREE.Group(); cabeca.position.copy(fim);
  const cranio = new THREE.Mesh(new THREE.ConeGeometry(3, 9, 8), matPadrao(0x3aa07a, { flatShading: true, metalness: .4 })); cranio.rotation.x = Math.PI/2; cranio.position.z = 3;
  const olhos = [];
  for (const s of [-1, 1]) {
    const chifre = new THREE.Mesh(new THREE.ConeGeometry(.5, 6, 6), ouro); chifre.position.set(s*1.6, 2.6, -1); chifre.rotation.set(-.8, 0, s*.3); cabeca.add(chifre);
    const olho = new THREE.Mesh(new THREE.SphereGeometry(.55, 10, 8), matNeon(0xffc04a)); olho.position.set(s*1.4, 1.1, 2); cabeca.add(olho); olhos.push(olho);
  }
  cabeca.add(cranio); cabeca.lookAt(fim.clone().add(new THREE.Vector3(0, -.3, 1).add(tang.multiplyScalar(.3)))); A.grupo.add(cabeca);
  // runas que carregam a Ultimate
  for (const [x, z, r] of MAPA_RUNA) {
    A.perigos.push({ tipo: 'runa', x, z, r });
    const anel = new THREE.Mesh(new THREE.RingGeometry(r - .2, r, 40), new THREE.MeshBasicMaterial({ color: 0xffc04a, transparent: true, opacity: .5, blending: THREE.AdditiveBlending, depthWrite: false }));
    anel.rotation.x = -Math.PI/2; anel.position.set(x, .05, z); A.grupo.add(anel);
    A.animar.push(() => { anel.material.opacity = .35 + Math.sin(performance.now()/300)*.25; });
  }
  const braseiro = new THREE.PointLight(0xff8a3a, 1.6, 40, 2); braseiro.position.set(0, 6, 0); A.grupo.add(braseiro);
  // lanternas de pedra (quebráveis) e pilares do dragão
  POSICOES_OBST.forEach(([x, z], i) => {
    const g = new THREE.Group();
    if (i < 4) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(1.4, .5, 1.4), pedra); b.position.y = .25;
      const h = new THREE.Mesh(new THREE.CylinderGeometry(.3, .35, 1.2, 8), pedra); h.position.y = 1.1;
      const c = new THREE.Mesh(new THREE.BoxGeometry(1, .8, 1), matPadrao(0x8a7a68, { emissive: 0xff7a2a, emissiveIntensity: .5 })); c.position.y = 2.1;
      const t = new THREE.Mesh(new THREE.ConeGeometry(1.1, .7, 4), pedra); t.position.y = 2.85; t.rotation.y = Math.PI/4;
      g.add(b, h, c, t); addObstaculo(A, g, x, z, 1.1, { hp: 120, altura: 3.2, cor: 0x8a7a68 });
    } else {
      const p = new THREE.Mesh(new THREE.CylinderGeometry(.9, 1, 5, 12), vermelho); p.position.y = 2.5;
      const anel = new THREE.Mesh(new THREE.TorusGeometry(1, .18, 6, 16), ouro); anel.rotation.x = Math.PI/2; anel.position.y = 4;
      const esfera = new THREE.Mesh(new THREE.SphereGeometry(.7, 14, 10), matPadrao(0x3aa07a, { emissive: 0x1a6a4a, emissiveIntensity: .6, metalness: .4 })); esfera.position.y = 5.5;
      g.add(p, anel, esfera); addObstaculo(A, g, x, z, 1.1, { altura: 6 });
    }
  });
  // lanternas balançam com o impacto; os olhos do dragão brilham nas Ultimates
  let olhoT = 0;
  A.reagir.push((x, z, forca) => {
    for (const L of lanternas) { const dx = L.piv.position.x - x, dz = L.piv.position.z - z, d = Math.hypot(dx, dz) || 1; L.vx += dx/d*forca*1.4/Math.max(1, d/10); L.vz += dz/d*forca*1.4/Math.max(1, d/10); }
    if (forca >= 1.5) olhoT = 2.5;
    for (let k = 0; k < 8*forca; k++) { const a = rnd(0, 7), r = RAIO_ARENA + 5; FUMACA.add({ x: Math.cos(a)*r, y: 10, z: Math.sin(a)*r, vx: rnd(-.5, .5), vy: -rnd(0, 1), vz: rnd(-.5, .5), grav: 3, cor: 0xa08a70, tam: rnd(.4, .8), vida: 1.5, cresce: 1, cel: 'fumaca0' }); }
  });
  A.animar.push(dt => {
    for (const L of lanternas) {
      L.vx -= L.piv.rotation.z*18*dt; L.vz -= L.piv.rotation.x*18*dt; L.vx *= 1 - dt*1.2; L.vz *= 1 - dt*1.2;
      L.piv.rotation.z += L.vx*dt; L.piv.rotation.x += L.vz*dt;
      L.piv.rotation.z += Math.sin(performance.now()/1200 + L.f)*.0006;
    }
    olhoT = Math.max(0, olhoT - dt);
    for (const o of olhos) o.scale.setScalar(1 + olhoT*.6 + Math.sin(performance.now()/200)*olhoT*.1);
  });
  A.clima = dt => {
    const n = dt*60;
    for (let i = 0; i < n; i++) {
      const a = Math.random()*7, r = Math.random()*RAIO_ARENA*1.3;
      if (Math.random() < .3) FUMACA.add({ x: Math.cos(a)*r - 6, y: rnd(10, 16), z: Math.sin(a)*r, vx: rnd(.6, 1.4), vy: -rnd(.6, 1.2), vz: rnd(-.4, .4), cor: escolher([0xffb8d8, 0xffd0e6, 0xff9ac8]), tam: rnd(.18, .3), vida: 10, atrito: 0, vrot: rnd(-3, 3), cel: 'petal' });
      if (Math.random() < .05) BRILHO.add({ x: rnd(-1, 1), y: rnd(.2, 1), z: rnd(-1, 1), vy: rnd(1, 2), cor: 0xffc04a, tam: rnd(.08, .15), vida: 2, atrito: 0, cel: 'brilho' });
    }
  };
}

/* =========================================================
   ILHAS CELESTIAIS
   ========================================================= */
function ilhaFlutuante(raio, comCachoeira){
  const g = new THREE.Group();
  const topo = new THREE.Mesh(new THREE.CylinderGeometry(raio, raio*.95, 1.2, 14), matPadrao(0x6cc04a, { flatShading: true }));
  const base = new THREE.Mesh(new THREE.ConeGeometry(raio*.95, raio*2.2, 10), matPadrao(0x8a6a4a, { flatShading: true }));
  base.rotation.x = Math.PI; base.position.y = -raio*1.1 - .6; g.add(topo, base);
  if (raio > 4) for (let k = 0; k < 3; k++) { const t = arvore(rnd(3, 6), .4, 0x4aa040); t.position.set(rnd(-raio, raio)*.5, .6, rnd(-raio, raio)*.5); g.add(t); }
  if (comCachoeira) { const c = cachoeira(raio*.5, raio*3); c.position.set(0, -raio*1.5, raio*.85); g.add(c); }
  return g;
}
let TEX_AGUA_CAINDO = null;
function cachoeira(lar, alt){
  if (!TEX_AGUA_CAINDO) TEX_AGUA_CAINDO = texturaCanvas(128, (g, T) => { g.fillStyle = '#bfe8ff'; g.fillRect(0, 0, T, T); for (let i = 0; i < 60; i++) { g.fillStyle = escolher(['#ffffff', '#8ad0ff', '#e6f6ff']); g.fillRect(rnd(0, T), rnd(0, T), rnd(2, 5), rnd(20, 50)); } }, 1);
  const t = TEX_AGUA_CAINDO.clone(); t.needsUpdate = true; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1, alt/lar/2);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(lar, alt), new THREE.MeshBasicMaterial({ map: t, transparent: true, opacity: .8, side: THREE.DoubleSide, fog: true }));
  m.userData.agua = t; return m;
}
function montarIlhas(A){
  cena.fog.near = 80; cena.fog.far = 280;
  // a arena é uma ilha: parte de baixo de rocha, raízes, borda de pedrinhas
  const baixo = new THREE.Mesh(new THREE.ConeGeometry(RAIO_ARENA + 2, 26, 20), matPadrao(0x7a5a40, { flatShading: true }));
  baixo.rotation.x = Math.PI; baixo.position.y = -13.05; A.grupo.add(baixo);
  const lado = new THREE.Mesh(new THREE.CylinderGeometry(RAIO_ARENA + 2, RAIO_ARENA + 2, 1.2, 64, 1, true), matPadrao(0x5a8a3a)); lado.position.y = -.6; A.grupo.add(lado);
  for (let k = 0; k < 60; k++) { const a = k/60*Math.PI*2, r = RAIO_ARENA + 1.6, p = rochaMesh(rnd(.35, .6), escolher([0xd8d4c8, 0xb8b2a4])); p.position.set(Math.cos(a)*r, .2, Math.sin(a)*r); A.grupo.add(p); }
  // cachoeiras caindo da borda
  const aguas = [];
  for (let k = 0; k < 4; k++) {
    const a = k/4*Math.PI*2 + .5, c = cachoeira(3.5, 40);
    c.position.set(Math.cos(a)*(RAIO_ARENA + 2.1), -20, Math.sin(a)*(RAIO_ARENA + 2.1)); c.lookAt(0, -20, 0); A.grupo.add(c); aguas.push(c.userData.agua);
  }
  // ilhas menores flutuando
  const ilhas = [];
  const qtd = POUCO() ? 6 : 11;
  for (let k = 0; k < qtd; k++) {
    const a = k/qtd*Math.PI*2 + rnd(-.2, .2), r = rnd(42, 95), raio = rnd(3, 9);
    const i = ilhaFlutuante(raio, k % 3 === 0); i.position.set(Math.cos(a)*r, rnd(-10, 25), Math.sin(a)*r); A.grupo.add(i);
    i.traverse(o => { if (o.userData.agua) aguas.push(o.userData.agua); });
    ilhas.push({ i, y0: i.position.y, f: rnd(0, 7), v: rnd(.3, .6) });
  }
  // mar de nuvens embaixo
  const matNuvem = matPadrao(0xffffff, { roughness: 1, flatShading: true, emissive: 0xc8dcf0, emissiveIntensity: .25 });
  const nuvens = [];
  for (let k = 0; k < (POUCO() ? 30 : 60); k++) {
    const a = rnd(0, 7), r = rnd(10, 130), n = new THREE.Mesh(new THREE.IcosahedronGeometry(rnd(6, 14), 1), matNuvem);
    n.scale.y = .35; n.position.set(Math.cos(a)*r, rnd(-42, -32), Math.sin(a)*r); A.grupo.add(n); nuvens.push(n);
  }
  for (let k = 0; k < 10; k++) {
    const n = new THREE.Mesh(new THREE.IcosahedronGeometry(rnd(5, 9), 1), matNuvem); n.scale.y = .4;
    n.position.set(rnd(-110, 110), rnd(30, 50), rnd(-110, 110)); A.grupo.add(n); nuvens.push(n);
  }
  A.animar.push(dt => {
    const t = performance.now()/1000;
    for (const I of ilhas) { I.i.position.y = I.y0 + Math.sin(t*I.v + I.f)*1.4; I.i.rotation.y += dt*.02; }
    for (const n of nuvens) { n.position.x += dt*1.2; if (n.position.x > 140) n.position.x = -140; }
    for (const a of aguas) a.offset.y += dt*1.5;
  });
  // correntes de vento (sobem)
  for (const [x, z, r] of MAPA_VENTO) {
    A.perigos.push({ tipo: 'vento', x, z, r });
    const espiral = new THREE.Mesh(new THREE.CylinderGeometry(r*.8, r, 7, 20, 1, true), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .045, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    espiral.position.set(x, 3.5, z); A.grupo.add(espiral); A.animar.push(dt => { espiral.rotation.y += dt*3; });
  }
  // cristais flutuantes (quebráveis) e rochas com cristal
  const matCristal = matPadrao(0x9ad8ff, { roughness: .1, metalness: .2, transparent: true, opacity: .85, emissive: 0x3a8ad8, emissiveIntensity: .5 });
  POSICOES_OBST.forEach(([x, z], i) => {
    const g = new THREE.Group();
    if (i < 4) {
      const c = new THREE.Mesh(new THREE.OctahedronGeometry(1), matCristal); c.scale.y = 1.8; c.position.y = 1.9; g.add(c);
      A.animar.push(dt => { c.rotation.y += dt; c.position.y = 1.9 + Math.sin(performance.now()/600 + i)*.25; });
      addObstaculo(A, g, x, z, 1.1, { hp: 90, altura: 3, cor: 0x9ad8ff });
    } else {
      const r = rochaMesh(1.4, 0xb8b2a4); r.position.y = 1; g.add(r);
      for (let k = 0; k < 3; k++) { const c = new THREE.Mesh(new THREE.OctahedronGeometry(.4), matCristal); c.scale.y = 2; c.position.set(rnd(-.6, .6), 2, rnd(-.6, .6)); c.rotation.z = rnd(-.5, .5); g.add(c); }
      addObstaculo(A, g, x, z, 1.4, { altura: 3 });
    }
  });
  // golpes fortes: rajada de vento e pedrinhas caindo da borda
  A.reagir.push((x, z, forca) => {
    for (let k = 0; k < 14*forca; k++) { const a = rnd(0, 7), r = RAIO_ARENA + 1.6; FUMACA.add({ x: Math.cos(a)*r, y: 0, z: Math.sin(a)*r, vx: Math.cos(a)*2, vy: rnd(1, 3), vz: Math.sin(a)*2, grav: 14, cor: 0xb8b2a4, tam: rnd(.15, .3), vida: 2.5, atrito: 0, cel: escolher(['rock1', 'rock2']) }); }
    for (let k = 0; k < 18*forca; k++) { const a = rnd(0, 7); FUMACA.add({ x: x + Math.cos(a), y: .5, z: z + Math.sin(a), vx: Math.cos(a)*8, vy: rnd(0, 1), vz: Math.sin(a)*8, cor: 0xffffff, tam: rnd(.3, .6), vida: .5, atrito: 2, cel: 'wisp' }); }
  });
  A.clima = dt => {
    const n = dt*60;
    for (let i = 0; i < n; i++) {
      if (Math.random() < .08) FUMACA.add({ x: -40, y: rnd(1, 12), z: rnd(-30, 30), vx: rnd(6, 10), vy: rnd(-.3, .3), vz: 0, cor: 0xffffff, tam: rnd(1.5, 3), vida: 9, atrito: 0, cel: 'fumaca0', some: 1 });
      if (Math.random() < .05) FUMACA.add({ x: rnd(-20, 20), y: rnd(6, 12), z: rnd(-20, 20), vx: rnd(1, 2), vy: -rnd(.3, .6), vz: rnd(-.5, .5), cor: 0xffffff, tam: rnd(.2, .35), vida: 8, atrito: 0, vrot: rnd(-2, 2), cel: 'feather' });
    }
  };
}

/* ----- Registra os mapas ----- */
Object.assign(MONTAR_MAPA, {
  estadio: a => { montarEstadio(a); melhorarEstadio(a); },
  vulcao:  a => { montarVulcao(a); melhorarVulcao(a); },
  gelo:    a => { montarGelo(a); melhorarGelo(a); },
  floresta: montarFloresta,
  cidade:   montarCidade,
  templo:   montarTemplo,
  ilhas:    montarIlhas,
});
