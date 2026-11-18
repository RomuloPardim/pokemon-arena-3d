"use strict";
/* =========================================================
   CINEMÁTICAS V14
   1. Pokébola: é lançada, abre com luz e o Pokémon sai como uma silhueta branca (igual no anime).
      Na troca/desmaio ele volta com o raio vermelho.
   2. Mega Evolução: a luta para, a câmera foca no Pokémon, gira em volta dele e termina num close de baixo.
   3. Finalização: no último Pokémon do time — tempo lento, "K.O.!", câmera dramática e close no vencedor.
   ========================================================= */

/* ---------- Pokébola 3D (feita com formas simples) ---------- */
const GEO_POKEBOLA = {
  meia: new THREE.SphereGeometry(1, 28, 14, 0, Math.PI*2, 0, Math.PI/2),
  faixa: new THREE.CylinderGeometry(1.012, 1.012, .16, 36, 1, true),
  botao: new THREE.CylinderGeometry(.3, .3, .14, 24),
  aro: new THREE.TorusGeometry(.3, .075, 8, 28),
};
function criarPokebola(raio = .32){
  const mat = (c, e) => new THREE.MeshStandardMaterial({ color: c, roughness: .3, metalness: .05, emissive: e || 0x000000 });
  const g = new THREE.Group();
  const dobradica = new THREE.Group(); dobradica.position.set(0, 0, -1);        // a tampa abre para trás
  const topo = new THREE.Mesh(GEO_POKEBOLA.meia, mat(0xe3262e)); topo.position.z = 1; dobradica.add(topo);
  const base = new THREE.Mesh(GEO_POKEBOLA.meia, mat(0xf2f2f2)); base.rotation.x = Math.PI;
  const faixa = new THREE.Mesh(GEO_POKEBOLA.faixa, mat(0x1b1b1b));
  const botao = new THREE.Mesh(GEO_POKEBOLA.botao, mat(0xffffff, 0x000000)); botao.rotation.x = Math.PI/2; botao.position.z = .97;
  const aro = new THREE.Mesh(GEO_POKEBOLA.aro, mat(0x1b1b1b)); aro.position.z = .99;
  g.add(dobradica, base, faixa, botao, aro);
  g.scale.setScalar(raio);
  g.userData = { dobradica, botao };
  return g;
}

/* ---------- Silhueta de luz (branca ao sair, vermelha ao voltar) ---------- */
function silhuetaInicio(inst){
  inst.raiz.traverse(o => { if (!o.isMesh) return; for (const m of [].concat(o.material)) if (m && m.emissive)
    m.userData.emisBase = { cor: m.emissive.clone(), int: m.emissiveIntensity }; });
}
const _corSil = new THREE.Color();
function silhueta(inst, k, cor = 0xffffff){
  _corSil.set(cor);
  inst.raiz.traverse(o => { if (!o.isMesh) return; for (const m of [].concat(o.material)) { const b = m && m.userData.emisBase; if (!b) continue;
    m.emissive.copy(b.cor).lerp(_corSil, k); m.emissiveIntensity = b.int + (1.8 - b.int)*k; } });
}
function silhuetaFim(inst){
  inst.raiz.traverse(o => { if (!o.isMesh) return; for (const m of [].concat(o.material)) { const b = m && m.userData.emisBase; if (!b) continue;
    m.emissive.copy(b.cor); m.emissiveIntensity = b.int; delete m.userData.emisBase; } });
}

/* ---------- De onde a Pokébola vem (o "treinador", atrás do Pokémon) ---------- */
function origemTreinador(L, pos){
  const A = lutador(1 - L.time);
  const d = new THREE.Vector3();
  if (A && A !== L && A.emCampo) d.set(pos.x - A.pos.x, 0, pos.z - A.pos.z);
  if (d.lengthSq() < 1) { const p = posInicial(L.time); d.set(p.x, 0, p.z); }
  if (d.lengthSq() < .01) d.set(0, 0, L.time ? -1 : 1);
  d.normalize();
  return new THREE.Vector3(pos.x + d.x*7, 2.8, pos.z + d.z*7);
}

/* ---------- Fita de luz entre dois pontos (raio da Pokébola) ---------- */
function raioDeLuz(a, b, corA, corB, largura = .18, dur = .3, curva = .6){
  if (typeof FitaVFX !== 'function') return;
  const n = 14, pts = [], larg = [];
  const lado = new THREE.Vector3(rnd(-1, 1), rnd(.2, 1), rnd(-1, 1)).normalize().multiplyScalar(curva);
  for (let i = 0; i < n; i++) { const s = i/(n - 1);
    pts.push(a.clone().lerp(b, s).addScaledVector(lado, Math.sin(s*Math.PI))); larg.push(largura*(.35 + Math.sin(s*Math.PI)*.65)); }
  const f = new FitaVFX('normal', largura, n, true); f.definir(pts, larg);
  const u = f.mesh.material.uniforms; u.cA.value.set(0xffffff); u.cB.value.set(corA); u.cC.value.set(corB);
  soltarFita(f, dur);
}

/* ---------- Lança a Pokébola ----------
   o = { de, ate, altura, rapido, cor }  →  devolve o tempo até abrir */
function lancarPokebola(o){
  const bola = criarPokebola(.3);
  const de = o.de.clone(), ate = o.ate.clone().setY(o.altura ?? 1.1);
  const tVoo = o.rapido ? .1 : .42, tAbrir = o.rapido ? .17 : .6, dur = tAbrir + .6;
  const { dobradica, botao } = bola.userData;
  let abriu = false;
  bola.position.copy(de);
  efeito(bola, dur, (e, k) => {
    const t = k*dur;
    if (t < tVoo) {                                   // voo em arco, girando
      const s = t/tVoo; bola.position.lerpVectors(de, ate, s); bola.position.y += Math.sin(s*Math.PI)*(o.rapido ? .6 : 2.4);
      bola.rotation.x = -t*24;
      if (Math.random() < .6) part('brilho', { x: bola.position.x, y: bola.position.y, z: bola.position.z, cor: 0xffffff, tam: .35, vida: .18 });
    } else if (t < tAbrir) {                          // para no ar e treme, o botão acende
      const s = (t - tVoo)/(tAbrir - tVoo);
      bola.position.copy(ate); bola.position.y += Math.sin(s*Math.PI)*.15;
      bola.rotation.x *= .7; bola.rotation.z = Math.sin(t*45)*.22*(1 - s);
      botao.material.emissive.setRGB(s, s, s*.9);
      if (o.alvo) bola.lookAt(o.alvo.x, bola.position.y, o.alvo.z);
    } else {                                          // abre!
      if (!abriu) {
        abriu = true;
        const p = bola.position.clone(), chao = new THREE.Vector3(ate.x, (o.alturaPokemon || 1)*.5, ate.z);
        flash('brilho', 0xffffff, p.x, p.y, p.z, 5, .3, 0, 1);
        clarao(0xffffff, p.x, p.y, p.z, 7, 12, .35);
        for (let i = 0; i < (o.rapido ? 3 : 6); i++) raioDeLuz(p, chao.clone().add(new THREE.Vector3(rnd(-.6, .6), rnd(-.5, .8), rnd(-.6, .6))),
          i % 2 ? 0xff5a5a : 0xfff2b0, 0xffffff, .16, .32, rnd(.3, 1));
        for (let i = 0; i < 22*QUAL.particulas; i++) { const a = Math.random()*7, r = rnd(.3, 1.2);
          part('faisca', { x: chao.x + Math.cos(a)*r, y: chao.y + rnd(-.4, 1), z: chao.z + Math.sin(a)*r, vx: Math.cos(a)*3, vy: rnd(1, 4), vz: Math.sin(a)*3,
            cor: Math.random() < .5 ? 0xffffff : 0xffe68a, tam: rnd(.2, .4), vida: rnd(.35, .6), atrito: 2, brilhar: true }); }
        onda(ate.x, ate.z, 2.4 + (o.alturaPokemon || 1)*.6, o.cor || 0xffffff, .5);
        if (typeof ondaDeChoque === 'function' && !o.rapido) ondaDeChoque(chao, .5);
        SOM.pokebola();
      }
      const s = (t - tAbrir)/(dur - tAbrir);
      dobradica.rotation.x = -Math.min(1, s*5)*1.9*(s > .65 ? Math.max(0, (1 - s)/.35) : 1);
      botao.material.emissive.setRGB(1 - s, 1 - s, 1 - s);
      bola.position.y = ate.y + s*.9; bola.position.x += (de.x - bola.position.x)*s*.08; bola.position.z += (de.z - bola.position.z)*s*.08;
      bola.scale.setScalar(.3*(s > .7 ? Math.max(.01, 1 - (s - .7)/.3) : 1));
    }
  });
  return tAbrir;
}

/* ---------- Volta para a Pokébola (raio vermelho) ---------- */
function recolherPokebola(L){
  const inst = L.inst, raiz = inst.raiz;
  L.emCampo = false;                                   // já saiu da luta; o visual some em seguida
  const s0 = raiz.scale.x, de = origemTreinador(L, L.pos), c = new THREE.Vector3(L.pos.x, L.y + L.altura*.5, L.pos.z);
  silhuetaInicio(inst);
  for (let i = 0; i < 3; i++) raioDeLuz(de, c, 0xff2a2a, 0xffffff, .14, .35, rnd(.2, .8));
  SOM.pokebola();
  efeito(new THREE.Object3D(), .38, (e, k) => {
    silhueta(inst, Math.min(1, k*4), 0xff3a3a);
    raiz.scale.setScalar(s0*Math.max(.01, 1 - k*k));
    if (k >= 1) { if (!L.emCampo) cena.remove(raiz); raiz.scale.setScalar(s0); silhuetaFim(inst); }
  });
}

/* =========================================================
   MEGA EVOLUÇÃO — cinemática com foco no Pokémon
   ========================================================= */
function iniciarCineMega(L, M){
  if (JOGO.cineAtiva || JOGO.cineMega) return;
  const vel = S.ultAnim === 'rapida' ? 1.5 : 1;
  JOGO.cineMega = { L, M, t: 0, dur: 2.5, vel, ev: new Set() };
  for (const X of [L, inimigoDe(L)]) if (X) { X.vel.set(0, 0, 0); X.dash = null; X.combo = null; X.perseguir = null; }
  L.inv = Math.max(L.inv, 3);
  document.body.classList.add('cine', 'velocidade');
  if (SOM.cine) SOM.cine();
}
function atualizarCineMega(dt){
  const R = JOGO.cineMega, L = R.L, d = dt*R.vel;
  R.t += d; const t = R.t;
  atualizarMega(L, d);                                 // a transformação continua (o modelo troca no meio)
  if (L.ataque) { L.ataque.t += d/L.ataque.dur; if (L.ataque.t >= 1) L.ataque = null; }
  // todos continuam respirando; o rival fica em "câmera lenta"
  for (const t2 of [0, 1]) for (const X of JOGO.times[t2]) if (X.emCampo) {
    X.inst.raiz.position.set(X.pos.x, X.y, X.pos.z); X.inst.raiz.rotation.y = X.rumo;
    animarInstancia(X.inst, X === L ? d : d*.25, { vel: 0, ataque: X.ataque, pose: X.pose, voa: X.p.voa, noAr: X.y > .3 });
  }
  const M = R.M, H = L.altura, c = new THREE.Vector3(L.pos.x, L.y + H*.55, L.pos.z);
  const fr = new THREE.Vector3(Math.sin(L.rumo), 0, Math.cos(L.rumo)), lado = new THREE.Vector3(fr.z, 0, -fr.x);
  const dist = Math.max(3.4, H*2.3), cima = new THREE.Vector3(0, 1, 0);
  ambienteCine(Math.min(1, t*4)*(t > R.dur - .35 ? Math.max(0, (R.dur - t)/.35) : 1), .75);
  if (t < .5) {                                        // aproxima rápido
    const s = suave(t/.5);
    tomada(c.clone().addScaledVector(fr, dist*(2.2 - s*1.1)).addScaledVector(lado, dist*.5).addScaledVector(cima, H*.25 + (1 - s)*2), c, 60 - s*14);
  } else if (t < 1.6) {                                // gira em volta enquanto a energia envolve
    document.body.classList.remove('velocidade');
    const s = (t - .5)/1.1, a = .45 + s*Math.PI*1.15;
    const dir = fr.clone().multiplyScalar(Math.cos(a)).addScaledVector(lado, Math.sin(a));
    tomada(c.clone().addScaledVector(dir, dist*(1.05 - s*.15)).addScaledVector(cima, H*(.1 + Math.sin(s*Math.PI)*.35)), c, 46);
    if (Math.random() < .5) { const ang = Math.random()*7, r = H*rnd(.8, 1.4);
      part('brilho', { x: c.x + Math.cos(ang)*r, y: c.y + rnd(-H*.5, H*.6), z: c.z + Math.sin(ang)*r, vx: -Math.cos(ang)*r*2.5, vy: 0, vz: -Math.sin(ang)*r*2.5,
        cor: new THREE.Color().setHSL(Math.random(), 1, .6).getHex(), tam: .45, vida: .35, atrito: 0, brilhar: true }); }
  } else {                                             // close de baixo para cima: a forma nova "ruge"
    const s = suave(Math.min(1, (t - 1.6)/.35));
    tomada(c.clone().addScaledVector(fr, dist*(1.15 - s*.1)).addScaledVector(lado, -dist*.28).addScaledVector(cima, -H*.3),
      c.clone().addScaledVector(cima, H*.12), 42 - s*4);
    if (!R.ev.has('rugido')) {
      R.ev.add('rugido');
      L.ataque = { t: 0, dur: .7, jeito: 'area' }; L.pose = null;
      ondaDeChoque(c, 1.3); tremer(.45); onda(L.pos.x, L.pos.z, 7, M.cor, .6);
      soltar(L.p.tipos[0], c.x, c.y, c.z, 30, 6, .45, .7);
      banner(M.nome.toUpperCase() + '!', corCSS(M.cor), true);
      flashTela(corCSS(M.cor));
      if (SOM.rodada) SOM.rodada();
    }
  }
  if (t >= R.dur) terminarCineMega(R);
}
function terminarCineMega(R){
  const L = R.L;
  if (L.megaT > 0) atualizarMega(L, L.megaT + .01);     // garante que a transformação terminou
  document.body.classList.remove('cine', 'velocidade');
  ambienteCine(0); CAM.cine = null; JOGO.cineMega = null;
  L.inv = Math.max(L.inv, .6); L.pose = null;
}

/* =========================================================
   FINALIZAÇÃO — o último Pokémon do time desmaiou
   ========================================================= */
function finalizacaoKO(L){
  JOGO.finalizando = true;
  const V = lutador(1 - L.time);
  const c0 = centroDe(L);
  congelar(.25); FX.lento = Math.max(FX.lento, 1.9);
  tremer(1); ondaDeChoque(c0, 1.6); zoomImpacto(1);
  clarao(0xffffff, c0.x, c0.y, c0.z, 10, 18, .5);
  if (typeof impactoVFX === 'function') impactoVFX(V ? V.p.tipos[0] : 'normal', c0.x, c0.y, c0.z, .7);
  flashTela('#ffffff');
  textoKO();
  document.body.classList.add('cine', 'ko');
  for (const P of JOGO.projeteis) P.vida = Math.min(P.vida, .05);
  // câmera: lado do golpe, baixa, girando devagar em volta de quem caiu
  const base = V ? new THREE.Vector3(L.pos.x - V.pos.x, 0, L.pos.z - V.pos.z) : new THREE.Vector3(0, 0, 1);
  if (base.lengthSq() < .01) base.set(0, 0, 1); base.normalize();
  const lado = new THREE.Vector3(base.z, 0, -base.x);
  efeito(new THREE.Object3D(), 1.9, (e, k) => {
    const c = centroDe(L), dist = Math.max(3.6, L.altura*2.6), a = -.9 + k*.9;
    const dir = lado.clone().multiplyScalar(Math.cos(a)).addScaledVector(base, Math.sin(a));
    tomada(c.clone().addScaledVector(dir, dist).add(new THREE.Vector3(0, L.altura*.15 + .5 - k*.3, 0)), c, 44 - k*8);
    ambienteCine(Math.min(1, k*5)*.55, .7);
  });
}
// câmera no vencedor (fim da rodada, por K.O. ou por tempo)
function cameraVencedor(V){
  if (!V || !V.emCampo) return;
  document.body.classList.remove('ko'); document.body.classList.add('cine');
  V.ataque = { t: 0, dur: .8, jeito: 'area' };
  efeito(new THREE.Object3D(), 2.6, (e, k) => {
    const fr = new THREE.Vector3(Math.sin(V.rumo), 0, Math.cos(V.rumo)), lado = new THREE.Vector3(fr.z, 0, -fr.x);
    const c = new THREE.Vector3(V.pos.x, V.y + V.altura*.55, V.pos.z), dist = Math.max(3.8, V.altura*2.5), a = .35 + k*.5;
    const dir = fr.clone().multiplyScalar(Math.cos(a)).addScaledVector(lado, Math.sin(a));
    tomada(c.clone().addScaledVector(dir, dist).add(new THREE.Vector3(0, V.altura*.05, 0)), c, 44);
    ambienteCine(Math.min(1, k*4)*(k > .85 ? (1 - k)/.15 : 1)*.35, .7);
    if (Math.random() < .25) auraCorpo(V, V.p.tipos[0], .4, .6);
  });
}
// "K.O.!" gigante no meio da tela
function textoKO(){
  const el = document.getElementById('textoKO'); if (!el) return;
  el.classList.remove('mostrar'); void el.offsetWidth; el.classList.add('mostrar');
  setTimeout(() => el.classList.remove('mostrar'), 2200);
}
// clarão na tela inteira
function flashTela(cor){
  const el = document.getElementById('flashTela'); if (!el) return;
  el.style.background = cor; el.classList.remove('mostrar'); void el.offsetWidth; el.classList.add('mostrar');
}
