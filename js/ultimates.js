"use strict";
/* =========================================================
   ULTIMATES CINEMATOGRÁFICAS
   1. Arranque: o Pokémon concentra energia e dispara (ou avança, nos roteiros de investida).
   2. Se acertar: a luta "congela", o cenário escurece, entram as barras de cinema e começa o roteiro:
      várias tomadas de câmera + poses + efeitos, e o dano entra no momento do impacto.
   3. No fim tudo volta ao normal com transição suave.
   Roteiros: meteoro, tempestade, esfera, ilusao, onda, rajada, nova (definidos em dados.js → IDENTIDADE)
   ========================================================= */
const ULT_PODER = 175;
const ROTEIRO_INVESTIDA = ['rajada', 'ilusao'];

function iniciarUlt(L){
  const A = inimigoDe(L);
  if (L.en < 100 || !livre(L) || L.combo || L.carga || JOGO.cineAtiva || L.assistindo || !A || !A.vivo) return;
  L.en = 0;
  const tipo = L.p.ult.tipo || L.p.tipos[0], e = estilo(tipo);
  SOM.ult(); banner('★ ' + L.p.ult.nome, TYPES[tipo][1], true);
  L.ataque = { t: 0, dur: .7, jeito: 'chuva' }; L.inv = Math.max(L.inv, .8); L.travaRumo = .7;
  L.rumo = Math.atan2(A.pos.x - L.pos.x, A.pos.z - L.pos.z);
  FX.lento = Math.max(FX.lento, .35); zoomImpacto(.6);
  // concentrando energia
  const p = centroDe(L);
  for (let k = 0; k < 40; k++) { const a = Math.random()*7, r = rnd(1.5, 3);
    part(escolher(['brilho','faisca', ...e.rastro]), { x: p.x + Math.cos(a)*r, y: p.y + rnd(-1, 1.5), z: p.z + Math.sin(a)*r, vx: -Math.cos(a)*r*3, vy: 0, vz: -Math.sin(a)*r*3, cor: e.c1, tam: .45, vida: .32, atrito: 0, tingir: true, brilhar: true }); }
  onda(L.pos.x, L.pos.z, 4, e.c1, .6); pilar(L.pos.x, L.pos.z, 1.4, e.c1, .7, 12);
  depois(.38, () => {
    if (!L.emCampo || !L.vivo || JOGO.cineAtiva) return;
    const A2 = inimigoDe(L); if (!A2) return;
    const dir = new THREE.Vector3(A2.pos.x - L.pos.x, 0, A2.pos.z - L.pos.z).normalize();
    L.rumo = Math.atan2(dir.x, dir.z);
    const g = { nome: L.p.ult.nome, tipo, poder: 0, jeito: 'projetil', visual: L.p.ult.visual, ult: true };
    if (ROTEIRO_INVESTIDA.includes(L.p.roteiro)) { L.dash = { t: .45, dx: dir.x, dz: dir.z, v: 32, g, acertou: false }; L.inv = .5; }
    else { criarProjetil(L, g, centroDe(L).addScaledVector(dir, L.raio + .6), dir, 30, .95, { vida: 1.1, ult: true }); SOM.raio(); }
  });
}

/* ----- Começa a cinemática ----- */
function acertouUlt(L, A){
  if (JOGO.cineAtiva || !A.vivo) return;
  // Ultimate também pode ser evitada com esquiva/invencibilidade
  if (A.inv > 0 && !A.caido) return;
  const vel = S.ultAnim === 'rapida' ? 1.6 : (S.ultAnim === 'curta' && JOGO.ultsVistas.has(L.p.id)) ? 2.4 : 1;
  JOGO.ultsVistas.add(L.p.id); JOGO.estat[L.time].ults++;
  // palco: perto do centro, para a câmera não sair do estádio
  const O = A.pos.clone().setY(0); if (O.length() > 9) O.setLength(9);
  let u = new THREE.Vector3(L.pos.x - A.pos.x, 0, L.pos.z - A.pos.z); if (u.lengthSq() < .01) u.set(0, 0, 1); u.normalize();
  let w = new THREE.Vector3(-u.z, 0, u.x); if (w.dot(O.clone().negate()) < 0) w.negate();      // lado da câmera = para o centro
  const D = 5.5;
  for (const P of JOGO.projeteis) { cena.remove(P.mesh); } JOGO.projeteis.length = 0;
  for (const X of [L, A]) { X.combo = null; X.ataque = null; X.dash = null; X.esquiva = null; X.perseguir = null; X.guardando = false; X.carga = 0; X.vel.set(0, 0, 0); X.vy = 0; X.noAr = false; X.lancado = false; X.caido = 0; }
  A.pos.copy(O); A.y = 0; A.rumo = Math.atan2(u.x, u.z);
  L.pos.copy(O).addScaledVector(u, D); L.y = 0; L.rumo = Math.atan2(-u.x, -u.z);
  A.atordoado = 99; L.inv = 99; A.inv = 0;
  JOGO.cineAtiva = { L, A, O, u, w, D, t: 0, vel, ev: new Set(), roteiro: L.p.roteiro || 'nova', tipo: L.p.ult.tipo || L.p.tipos[0], extras: [] };
  JOGO.cineAtiva.dur = DURACAO_ROTEIRO[JOGO.cineAtiva.roteiro] || 4;
  for (const o of ARENA.obstaculos) if (o.vivo) o.mesh.visible = false;
  document.body.classList.add('cine');
  SOM.cine(); congelar(.15); ondaDeChoque(centroDe(A), 1);
  avisoCombate(L.time, L.p.ult.nome.toUpperCase(), TYPES[JOGO.cineAtiva.tipo][1]);
}
const DURACAO_ROTEIRO = { meteoro: 4.6, tempestade: 4.4, esfera: 4.2, ilusao: 4.8, onda: 4.4, rajada: 4.1, nova: 4 };

/* ----- Ajudantes de posição no "palco" ----- */
// ponto = O + u*fu + cima*fy + w*fw  (u aponta do alvo para quem usou a Ultimate; w aponta para o centro da arena)
function palco(R, fu, fy, fw){ return R.O.clone().addScaledVector(R.u, fu).add(new THREE.Vector3(0, fy, 0)).addScaledVector(R.w, fw); }
const suave = k => k*k*(3 - 2*k);
const entre = (t, a, b) => THREE.MathUtils.clamp((t - a)/(b - a), 0, 1);
function tomada(pos, alvo, fov){ CAM.cine = { pos, alvo, fov }; }
function uma(R, nome, fn){ if (!R.ev.has(nome)) { R.ev.add(nome); fn(); } }
function danoUlt(R, forca = 1){
  uma(R, 'dano', () => {
    const dir = new THREE.Vector3(R.A.pos.x - R.L.pos.x, 0, R.A.pos.z - R.L.pos.z);
    R.A.inv = 0; R.A.atordoado = 0;
    aplicarDano(R.L, R.A, ULT_PODER*forca, R.tipo, R.L.p.ult.nome, dir, { ult: true, final: 'arremessar' });
    R.A.atordoado = 99; R.A.lancado = false; R.A.vel.set(0, 0, 0); R.A.vy = 0; R.A.noAr = false;
    R.lancarNoFim = dir.normalize();
    vibrarTime(R.A.time, 1, 500); vibrarTime(R.L.time, .6, 300);
  });
}
// esfera de energia gigante (fogo, aura, sombra...)
function esferaEnergia(tipo){
  const e = estilo(tipo), g = new THREE.Group();
  const nucleo = new THREE.Mesh(GEO.esfera, new THREE.MeshBasicMaterial({ color: e.c2 })); nucleo.scale.setScalar(.55); g.add(nucleo);
  const casca = new THREE.Mesh(GEO.esfera, new THREE.MeshBasicMaterial({ color: e.c1, transparent: true, opacity: .55, blending: THREE.AdditiveBlending, depthWrite: false })); casca.scale.setScalar(.85); g.add(casca);
  const halo = spriteFx('brilho', e.c1, 3.2, false); halo.material.opacity = .6; g.add(halo);
  const orbe = spriteFx(e.orbe, e.c1, 2.2, false); g.add(orbe);
  g.userData = { casca, orbe, nucleo };
  cena.add(g);
  return g;
}

/* ----- Atualiza a cinemática a cada quadro ----- */
function atualizarCine(dt){
  const R = JOGO.cineAtiva; if (!R) return;
  R.t += dt*R.vel;
  const t = R.t, L = R.L, A = R.A, e = estilo(R.tipo);
  ambienteCine(Math.min(1, t*3) * (t > R.dur - .5 ? (R.dur - t)/.5 : 1), R.roteiro === 'ilusao' ? 1 : .7);
  L.pose = null;
  ROTEIROS[R.roteiro](R, t, dt, e);
  // os dois continuam animando
  for (const X of [L, A]) {
    X.inst.raiz.position.set(X.pos.x, X.y, X.pos.z); X.inst.raiz.rotation.y = X.rumo;
    animarInstancia(X.inst, dt, { vel: 0, ataque: X.ataque, dano: X === A ? .7 : 0, pose: X.pose, noAr: X.y > .3, voa: X.p.voa });
    if (X.ataque) { X.ataque.t += dt*R.vel/X.ataque.dur; if (X.ataque.t >= 1) X.ataque = null; }
  }
  if (t >= R.dur) terminarCine(R);
}
function terminarCine(R){
  const { L, A } = R;
  danoUlt(R);
  for (const x of R.extras) { cena.remove(x); }
  for (const o of ARENA.obstaculos) if (o.vivo) o.mesh.visible = true;
  document.body.classList.remove('cine', 'velocidade');
  ambienteCine(0);
  L.pose = null; A.pose = null; L.y = 0; L.inv = .6; L.ataque = null;
  A.atordoado = 0;
  if (A.vivo && R.lancarNoFim) { A.lancado = true; A.noAr = true; A.vy = 6; A.vel.set(R.lancarNoFim.x*12, 0, R.lancarNoFim.z*12); A.atordoado = 1; }
  CAM.cine = null; JOGO.cineAtiva = null;
}

/* ----- Roteiros ----- */
const ROTEIROS = {
  // Charizard: sobe, cria uma esfera de fogo gigante e arremessa
  meteoro(R, t, dt, e){
    const { L, A } = R, topo = () => new THREE.Vector3(L.pos.x, L.y + L.altura + 2.4, L.pos.z);
    L.y = suave(entre(t, .1, 1.3))*6*(1 - suave(entre(t, 3.9, 4.6)));
    L.pose = { bracosCima: t > .8 && t < 2.8 };
    if (t < 1.3) {
      tomada(palco(R, -2.2, .8, 4.5), new THREE.Vector3(L.pos.x, L.y + L.altura*.6, L.pos.z), 62);
      if (Math.random() < .7) soltar(R.tipo, L.pos.x, L.y + L.altura*.5, L.pos.z, 2, 3, .5, .5);
    }
    if (t >= .9 && t < 3.2) {
      uma(R, 'bola', () => { R.bola = esferaEnergia(R.tipo); R.extras.push(R.bola); SOM.carga(); });
      const k = suave(entre(t, .9, 2.4)), b = R.bola;
      if (t < 2.6) { b.position.copy(topo()); b.scale.setScalar(.1 + k*3.4); }
      b.userData.orbe.material.rotation += dt*3; b.rotation.y += dt*2;
      if (Math.random() < .9) { const a = Math.random()*7, r = 5; part(escolher(e.rastro), { x: b.position.x + Math.cos(a)*r, y: b.position.y + rnd(-2, 2), z: b.position.z + Math.sin(a)*r, vx: -Math.cos(a)*r*2, vy: 0, vz: -Math.sin(a)*r*2, cor: e.c1, tam: .7, vida: .45, atrito: 0, tingir: true }); }
      clarao(e.c1, b.position.x, b.position.y, b.position.z, 6 + k*8, 25, .1);
      if (t >= 1.3 && t < 2.6) tomada(palco(R, R.D*.4, 3.5, 13), b.position.clone().lerp(centroDe(L), .35), 55);
      if (t >= 2.6) {   // arremessa
        const k2 = suave(entre(t, 2.6, 3.2)), de = palco(R, R.D, L.y + L.altura + 2.4, 0), ate = centroDe(A);
        b.position.copy(de).lerp(ate, k2); b.position.y += Math.sin(k2*Math.PI)*2;
        for (let i = 0; i < 4; i++) part(escolher(e.rastro), { x: b.position.x + rnd(-1, 1), y: b.position.y + rnd(-1, 1), z: b.position.z + rnd(-1, 1), vx: 0, vy: rnd(0, 2), vz: 0, cor: e.c1, tam: 1.2, vida: .5, cresce: 1.5, tingir: true });
        tomada(b.position.clone().addScaledVector(R.w, 6).add(new THREE.Vector3(0, 2.5, 0)).addScaledVector(R.u, 3), b.position, 58);
      }
    }
    if (t >= 3.2) {
      uma(R, 'impacto', () => {
        cena.remove(R.bola);
        const p = A.pos.clone();
        explosao(R.tipo, p.x, 1.2, p.z, 5); onda(p.x, p.z, 14, e.c1, .7); onda(p.x, p.z, 9, 0xffffff, .5);
        for (let i = 0; i < 5; i++) { const a = i/5*Math.PI*2; pilar(p.x + Math.cos(a)*3, p.z + Math.sin(a)*3, 1.2, e.c1, .9, 16); }
        if (R.tipo === 'fire') estrelaDeFogo(p.x, p.z, 7); else pedacos(p.x, .5, p.z, 16, R.tipo === 'rock' ? 'rock' : 'ground', 10, .35);
        rachaduras(p.x, p.z, 6); tremer(1.1); ondaDeChoque(centroDe(A), 1.6); SOM.explosao(); SOM.cineImpacto();
        danoUlt(R);
      });
      const k = entre(t, 3.2, 4.6);
      tomada(palco(R, 1 + k*2, 5 + k*4, 15 + k*5), centroDe(A), 60);
    }
  },
  // Pikachu: carrega eletricidade, sequência de raios e um raio final enorme
  tempestade(R, t, dt, e){
    const { L, A } = R;
    if (t < 1) {
      L.pose = { incl: .15 };
      tomada(palco(R, R.D - 2.6, L.altura*.8, 1.2), centroDe(L), 50);
      if (Math.random() < .5) { const c = centroDe(L); zigueZague(c, c.clone().add(new THREE.Vector3(rnd(-1.5, 1.5), rnd(-1, 1.5), rnd(-1.5, 1.5))), e.c1, .08, .3); }
      if (Math.random() < .8) soltar(R.tipo, L.pos.x, L.altura*.5, L.pos.z, 2, 3, .35, .3);
      clarao(e.c1, L.pos.x, 1.5, L.pos.z, 4, 8, .1);
    }
    const quedas = [1, 1.25, 1.5, 1.72, 1.95, 2.25];
    quedas.forEach((q, i) => { if (t >= q) uma(R, 'r' + i, () => { const p = A.pos.clone().add(new THREE.Vector3(rnd(-1.5, 1.5), 0, rnd(-1.5, 1.5)));
      relampago(p.x, p.z, e.c1); explosao(R.tipo, p.x, .6, p.z, 1.6); A.inst.flash = 1; tremer(.3); SOM.explosao(); }); });
    if (t >= 1 && t < 2.6) tomada(Math.floor((t - 1)/.4) % 2 ? palco(R, -4, 2.2, 6) : palco(R, -3, 3.4, -5.5).addScaledVector(R.w, 0), centroDe(A), 55);
    if (t >= 2.6) {
      L.y = Math.sin(Math.min(1, (t - 2.6)/1.2)*Math.PI)*3;
      L.pose = { bracosCima: true };
      tomada(palco(R, R.D*.5, 4, 14), palco(R, R.D*.5, 1.5, 0), 58);
    }
    if (t >= 3) uma(R, 'final', () => {
      const de = centroDe(L), ate = centroDe(A);
      raioRamificado(de, ate, e.c1, 4); raioRamificado(new THREE.Vector3(A.pos.x, 30, A.pos.z), ate, 0xffffff, 3);
      flash('brilho', 0xffffff, ate.x, ate.y, ate.z, 18, .5, 0, .9); explosao(R.tipo, ate.x, ate.y, ate.z, 4);
      onda(A.pos.x, A.pos.z, 12, e.c1, .6); tremer(1); ondaDeChoque(ate, 1.5); SOM.cineImpacto(); danoUlt(R);
    });
  },
  // Lucario: esfera de aura cresce entre as mãos e é disparada
  esfera(R, t, dt, e){
    const { L, A } = R, f = frenteDe(L), maos = () => centroDe(L).addScaledVector(f, L.raio + .9);
    if (t < 1.6) {
      L.pose = { bracosFrente: true };
      uma(R, 'bola', () => { R.bola = esferaEnergia(R.tipo); R.extras.push(R.bola); SOM.carga(); });
      const k = suave(entre(t, .1, 1.5));
      R.bola.position.copy(maos()); R.bola.scale.setScalar(.15 + k*1.5); R.bola.userData.orbe.material.rotation += dt*5;
      for (let i = 0; i < 2; i++) { const a = Math.random()*7, b = rnd(-1, 1), r = 3, p = maos();
        part(escolher(['brilho','faisca', ...e.rastro]), { x: p.x + Math.cos(a)*r, y: p.y + b*r, z: p.z + Math.sin(a)*r, vx: -Math.cos(a)*r*3, vy: -b*r*3, vz: -Math.sin(a)*r*3, cor: e.c1, tam: .35, vida: .3, atrito: 0, tingir: true, brilhar: true }); }
      if (Math.random() < .1) onda(L.pos.x, L.pos.z, 3, e.c1, .3);
      const giro = t*.25;
      tomada(palco(R, R.D + Math.cos(giro)*1.5, 1.4, 3 + Math.sin(giro)), maos(), 45);
      clarao(e.c1, maos().x, maos().y, maos().z, 3 + k*6, 12, .1);
    } else if (t < 2.3) {
      L.pose = { bracosFrente: true, incl: .25 };
      const k = suave(entre(t, 1.6, 2.3)), de = palco(R, R.D - L.raio - .9, L.altura*.55, 0), ate = centroDe(A);
      R.bola.position.copy(de).lerp(ate, k); R.bola.scale.setScalar(1.65 + k*.6);
      for (let i = 0; i < 5; i++) part(escolher(['brilho', ...e.rastro]), { x: R.bola.position.x, y: R.bola.position.y, z: R.bola.position.z, vx: rnd(-1, 1), vy: rnd(-1, 1), vz: rnd(-1, 1), cor: e.c1, tam: .9, vida: .4, cresce: 1, tingir: true, brilhar: true });
      if (Math.random() < .3) flash('anel', e.c1, R.bola.position.x, R.bola.position.y, R.bola.position.z, 4, .25);
      tomada(palco(R, R.D + 3.5, 2.2, .9), centroDe(A), 55);
    } else {
      uma(R, 'impacto', () => { cena.remove(R.bola); const p = centroDe(A);
        explosao(R.tipo, p.x, p.y, p.z, 4.5); for (let i = 0; i < 4; i++) setTimeout(() => flash('anel', e.c1, p.x, p.y, p.z, 6 + i*3, .4), i*90);
        onda(A.pos.x, A.pos.z, 12, e.c1, .6); tremer(1); ondaDeChoque(p, 1.5); SOM.cineImpacto(); danoUlt(R); });
      const k = entre(t, 2.3, 4.2);
      tomada(palco(R, -3 - k*2, 3 + k*2, 9 + k*3), centroDe(A), 58);
    }
  },
  // Gengar: escuridão, clones atacando de todos os lados e explosão fantasmagórica
  ilusao(R, t, dt, e){
    const { L, A } = R;
    if (t < 1) {
      uma(R, 'sombra', () => { for (let i = 0; i < 40; i++) { const a = i/40*Math.PI*2; FUMACA.add({ x: A.pos.x + Math.cos(a)*4, y: .3, z: A.pos.z + Math.sin(a)*4, vx: -Math.cos(a)*2, vy: rnd(.5, 2), vz: -Math.sin(a)*2, cor: 0x1a0828, tam: 2, vida: 1.5, cel: 'fumaca0', cresce: 1 }); } });
      L.escondido = t > .5;
    }
    // câmera girando em volta do alvo
    const ang = t*(t < 3 ? .9 : .4);
    tomada(A.pos.clone().add(new THREE.Vector3(Math.cos(ang)*8, 2.6, Math.sin(ang)*8)), centroDe(A), 60);
    if (t >= 1 && t < 3) {
      uma(R, 'clones', () => {
        R.clones = [];
        for (let i = 0; i < 4; i++) {
          const c = THREE.SkeletonUtils.clone(L.inst.ajuste), g = new THREE.Group(); g.add(c);
          c.traverse(o => { if (o.isMesh) { o.material = o.material.clone(); o.material.transparent = true; o.material.opacity = .75; if (o.material.emissive) { o.material.emissive.setHex(0x5a1a9a); } } });
          const a = i/4*Math.PI*2 + .4; g.position.copy(A.pos).add(new THREE.Vector3(Math.cos(a)*4, 0, Math.sin(a)*4));
          g.rotation.y = Math.atan2(A.pos.x - g.position.x, A.pos.z - g.position.z); g.userData.a = a;
          cena.add(g); R.extras.push(g); R.clones.push(g);
          soltar('ghost', g.position.x, 1, g.position.z, 12, 3, .6, .5);
        }
      });
      R.clones.forEach((g, i) => {
        const ini = 1.25 + i*.4, k = entre(t, ini, ini + .2), volta = entre(t, ini + .25, ini + .4);
        const r = 4 - 3*suave(k) + 3*suave(volta), a = g.userData.a;
        g.position.set(A.pos.x + Math.cos(a)*r, Math.sin(k*Math.PI)*.6, A.pos.z + Math.sin(a)*r);
        if (t >= ini + .2) uma(R, 'golpe' + i, () => { const p = centroDe(A); flash('leftclaw', 0xffffff, p.x, p.y, p.z, 2.6, .25); flash('brilho', e.c1, p.x, p.y, p.z, 3, .3, 0, .6); A.inst.flash = 1; tremer(.35); SOM.acertoCombo(true); });
      });
    }
    if (t >= 3) {
      uma(R, 'fim', () => { for (const g of R.clones || []) { soltar('ghost', g.position.x, 1, g.position.z, 14, 3, .7, .6); cena.remove(g); }
        L.escondido = false; L.pos.copy(A.pos).addScaledVector(R.u, 3); L.rumo = Math.atan2(-R.u.x, -R.u.z);
        R.bola = esferaEnergia(R.tipo); R.extras.push(R.bola); });
      L.pose = { bracosCima: true };
      const k = suave(entre(t, 3, 3.6));
      R.bola.position.set(A.pos.x, A.altura*.5 + 4*(1 - k), A.pos.z); R.bola.scale.setScalar(.5 + k*2.5);
    }
    if (t >= 3.6) uma(R, 'impacto', () => { cena.remove(R.bola); const p = centroDe(A);
      explosao(R.tipo, p.x, p.y, p.z, 5); for (let i = 0; i < 60; i++) FUMACA.add({ x: p.x, y: p.y, z: p.z, vx: rnd(-9, 9), vy: rnd(-2, 7), vz: rnd(-9, 9), cor: 0x2a1240, tam: 2.2, vida: 1.2, cel: 'fumaca0', cresce: 1.5, atrito: 2 });
      onda(A.pos.x, A.pos.z, 12, e.c1, .7); tremer(1); ondaDeChoque(p, 1.6); SOM.cineImpacto(); danoUlt(R); });
  },
  // Gyarados: onda gigante que atravessa a arena
  onda(R, t, dt, e){
    const { L, A } = R;
    if (t < 1.1) {
      L.pose = { incl: -.35*suave(entre(t, 0, .5)), bracosCima: true };
      tomada(palco(R, R.D - 3, .9, 1.8), new THREE.Vector3(L.pos.x, L.altura + .5, L.pos.z), 62);
      if (Math.random() < .8) { const a = Math.random()*7; part(escolher(e.rastro), { x: L.pos.x + Math.cos(a)*2, y: 0, z: L.pos.z + Math.sin(a)*2, vx: 0, vy: rnd(6, 10), vz: 0, cor: e.c1, tam: .5, vida: .8, grav: 6 }); }
      uma(R, 'pilares', () => { for (let i = 0; i < 4; i++) { const a = i/4*Math.PI*2; pilar(L.pos.x + Math.cos(a)*2.5, L.pos.z + Math.sin(a)*2.5, .8, e.c1, 1, 8); } SOM.area(); });
    }
    if (t >= 1) {
      uma(R, 'onda', () => { R.onda = muralhaDeOnda(R.tipo); R.extras.push(R.onda); });
      const k = entre(t, 1, 3.1), pos = palco(R, R.D + 3 - k*14, 0, 0);
      R.onda.position.copy(pos); R.onda.rotation.y = Math.atan2(R.u.x, R.u.z);
      const alt = Math.sin(Math.min(1, k*1.5)*Math.PI*.5)*(1 - entre(t, 3, 3.6)*.9);
      R.onda.scale.set(1, .1 + alt, 1); R.onda.userData.tex.offset.y -= dt*1.5;
      for (let i = 0; i < 6; i++) { const lado = rnd(-9, 9), p = pos.clone().addScaledVector(R.w, lado);
        part(escolher(e.rastro), { x: p.x, y: 7*alt, z: p.z, vx: -R.u.x*6, vy: rnd(2, 6), vz: -R.u.z*6, cor: Math.random() < .5 ? e.c1 : 0xffffff, tam: .7, vida: .7, grav: 10 }); }
      tomada(palco(R, R.D*.4, 3.2, 16), palco(R, R.D*.35, 2, 0), 62);
      if (k > .55 && k < .95) A.y = Math.sin((k - .55)/.4*Math.PI)*3;
      if (k > .55) uma(R, 'impacto', () => { explosao(R.tipo, A.pos.x, 1.5, A.pos.z, 4); tremer(1); ondaDeChoque(centroDe(A), 1.4); SOM.cineImpacto(); danoUlt(R); });
    }
  },
  // Greninja, Machamp...: ataques em sequência de todos os lados e golpe final de cima
  rajada(R, t, dt, e){
    const { L, A } = R;
    document.body.classList.toggle('velocidade', t > .3 && t < 3.3);
    const ang = t*1.6;
    tomada(A.pos.clone().add(new THREE.Vector3(Math.cos(ang)*7.5, 2.4, Math.sin(ang)*7.5)), centroDe(A), 58);
    if (t < 2.8) {
      const i = Math.floor(Math.max(0, t - .35)/.33), k = ((t - .35)/.33) % 1;
      if (t > .35) {
        const a = i*2.4, r = 2.6 - 1.3*Math.min(1, k*2);
        L.pos.set(A.pos.x + Math.cos(a)*r, 0, A.pos.z + Math.sin(a)*r); L.y = i % 3 === 2 ? 1.2 : 0;
        L.rumo = Math.atan2(A.pos.x - L.pos.x, A.pos.z - L.pos.z);
        if (k > .45) uma(R, 'g' + i, () => { L.ataque = { t: 0, dur: .2, jeito: 'combo', membro: i % 2 ? 'bracoE' : 'bracoD' };
          const p = centroDe(A); efeitoContato({ tipo: R.tipo, visual: L.p.ult.visual === 'shuriken' ? 'corte' : (VISUAL_INVESTIDA[R.tipo] || 'punho') }, p);
          A.inst.flash = 1; tremer(.3); SOM.acertoCombo(true); rastroVelocidade(L); });
      }
    } else {
      L.pos.copy(A.pos).addScaledVector(R.u, .3);
      const k = entre(t, 2.8, 3.3); L.y = 6*(1 - suave(k)) + .1;
      L.pose = { incl: .6 };
      tomada(palco(R, 2.5, 1, 8), new THREE.Vector3(A.pos.x, 2.5, A.pos.z), 62);
      if (t >= 3.3) uma(R, 'impacto', () => { const p = A.pos.clone();
        explosao(R.tipo, p.x, .8, p.z, 4.5); onda(p.x, p.z, 12, e.c1, .6); rachaduras(p.x, p.z, 5); pedacos(p.x, .4, p.z, 14, 'ground', 9, .3);
        tremer(1.1); ondaDeChoque(centroDe(A), 1.5); SOM.cineImpacto(); danoUlt(R); });
    }
  },
  // os outros: energia concentrando e uma explosão enorme em volta
  nova(R, t, dt, e){
    const { L, A } = R;
    const ang = t*.7;
    tomada(L.pos.clone().add(new THREE.Vector3(Math.cos(ang)*9, 3 + t*.5, Math.sin(ang)*9)), palco(R, R.D*.5, 1.5, 0), 60);
    if (t < 1.6) {
      L.pose = { bracosCima: true };
      uma(R, 'runa', () => { const r = decalque('runa', e.c1, 6); r.position.set(L.pos.x, .08, L.pos.z); R.extras.push(r); cena.add(r); R.runa = r; SOM.carga(); });
      R.runa.rotation.z += dt*2;
      if (Math.random() < .2) onda(L.pos.x, L.pos.z, 1 + Math.random()*3, e.c1, .4);
      for (let i = 0; i < 3; i++) { const a = Math.random()*7, r = 6; part(escolher(['brilho', ...e.rastro]), { x: L.pos.x + Math.cos(a)*r, y: rnd(0, 4), z: L.pos.z + Math.sin(a)*r, vx: -Math.cos(a)*r*2, vy: 0, vz: -Math.sin(a)*r*2, cor: e.c1, tam: .5, vida: .5, atrito: 0, tingir: true }); }
      if (t > .8) uma(R, 'pilares', () => { for (let i = 0; i < 6; i++) { const a = i/6*Math.PI*2; pilar(L.pos.x + Math.cos(a)*4, L.pos.z + Math.sin(a)*4, 1, e.c1, 1, 14); } });
    } else {
      uma(R, 'nova', () => { cena.remove(R.runa);
        ondaDeArea(L, { tipo: R.tipo, poder: 0 }, L.pos.x, L.pos.z, 11); pilar(L.pos.x, L.pos.z, 4, e.c1, .9, 30);
        const d = new THREE.Mesh(GEO.esfera, matBrilho(e.c1)); d.position.copy(L.pos);
        efeito(d, 1, (ef, k) => { d.scale.set(11*k, 7*k, 11*k); d.material.opacity = .4*(1 - k); });
        tremer(1); ondaDeChoque(centroDe(L), 1.6); SOM.cineImpacto(); });
      if (t > 1.8) danoUlt(R);
    }
  },
};
// muralha de água/fogo para o roteiro "onda"
function muralhaDeOnda(tipo){
  const e = estilo(tipo), tex = TEX_PAREDE.clone(); tex.needsUpdate = true; tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(4, 1);
  const geo = new THREE.CylinderGeometry(9, 9, 7, 32, 1, true, -Math.PI*.35, Math.PI*.7); geo.translate(0, 3.5, 9);
  const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: tex, color: e.c1, transparent: true, side: THREE.DoubleSide, depthWrite: false }));
  const g = new THREE.Group(); g.add(m); g.userData.tex = tex;
  const espuma = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: tex, color: 0xffffff, transparent: true, opacity: .35, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }));
  espuma.scale.set(.98, 1.02, .98); g.add(espuma);
  cena.add(g); return g;
}
