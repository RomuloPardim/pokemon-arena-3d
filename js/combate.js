"use strict";
/* =========================================================
   COMBATE — o mesmo controlador para Jogador 1, Jogador 2 e IA
   controlarLutador(L, E, dt) recebe a entrada E (entrada.js ou ia.js) e decide o que o Pokémon faz.
   Estados do lutador:
     livre → pode andar, atacar, defender
     combo (L.combo)        → executando um golpe do combo corpo a corpo
     carregando (L.carga)   → segurando o ataque para um golpe carregado
     guardando              → defendendo (gasta a barra de guarda)
     atordoado (s)          → levou um golpe, não age (só pode usar a Substituição)
     lancado                → foi jogado para o alto/para longe
     caido (s)              → no chão depois de cair; pode levantar rápido (Pular)
   ========================================================= */
const COMBATE = {
  janelaContra: .16,        // tempo (s) depois de apertar a guarda em que o bloqueio vira contra-ataque
  janelaEsquiva: .2,        // tempo (s) do começo da esquiva que conta como esquiva perfeita
  maxCombo: 14,             // golpes seguidos recebidos antes da "quebra de combo" automática
  subsMax: 4, subsRecarga: 10,
  assistRecarga: 15, trocaRecarga: 4,
};
const livre = L => L.vivo && L.emCampo && !L.assistindo && L.surgir >= 1 && !L.atordoado && !L.lancado && !L.caido && !L.quebrado;
const _v3 = () => new THREE.Vector3();

function controlarLutador(L, E, dt, yawCam){
  if (!L || !L.emCampo || L.assistindo) return;
  if (!L.vivo || L.surgir < 1 || JOGO.fim || JOGO.finalizando) { mover(L, 0, 0, dt); return; }
  if (L.megaT > 0) { mover(L, 0, 0, dt); return; }        // Mega Evoluindo: não anda nem ataca
  const A = inimigoDe(L);
  // direção pedida: jogadores = relativo à câmera; IA = já vem no mundo
  let mx, mz;
  if (E.mundo) { mx = E.x; mz = E.y; }
  else { const fx = -Math.sin(yawCam), fz = -Math.cos(yawCam), rx = Math.cos(yawCam), rz = -Math.sin(yawCam); mx = fx*E.y + rx*E.x; mz = fz*E.y + rz*E.x; }
  const d = E.disparou;

  // ----- caído: só pode levantar rápido -----
  if (L.caido > 0) {
    mover(L, 0, 0, dt);
    if (d.has('pulo') && L.caidoT > .15) levantarRapido(L, mx, mz);
    return;
  }
  // ----- atordoado / lançado / guarda quebrada: só a Substituição -----
  if (L.atordoado > 0 || L.lancado || L.quebrado > 0) {
    if (d.has('guarda') && !L.quebrado) substituir(L);
    mover(L, 0, 0, dt);
    return;
  }
  // ----- guarda -----
  const querGuarda = E.agora.has('guarda') && !L.noAr && !L.combo && !L.ataque && !L.dash && !L.esquiva && !L.perseguir;
  if (querGuarda && !L.guardando) { L.guardando = true; L.guardaT = 0; SOM.guarda(); }
  if (!querGuarda) L.guardando = false;
  if (L.guardando) {
    mover(L, mx*.15, mz*.15, dt);
    if (A) L.rumo = girarAngulo(L.rumo, Math.atan2(A.pos.x - L.pos.x, A.pos.z - L.pos.z), dt*10);
    return;
  }
  // ----- golpe carregado (segurar o ataque) -----
  if (E.agora.has('ataque')) L.segura += dt; else L.segura = 0;
  if (L.carga > 0) {
    L.carga += dt;
    auraCarga(L, Math.min(1, L.carga/1.2));
    mover(L, 0, 0, dt);
    if (!E.agora.has('ataque') || L.carga > 1.3) { const forca = Math.min(1, L.carga/1.2); L.carga = 0; iniciarGolpe(L, GOLPE_CARREGADO, -1, 1 + forca*.6); }
    return;
  }
  if (L.segura > .42 && !L.noAr && (!L.combo || L.combo.i === 0 && L.combo.t > L.combo.h.dur*.8)) { L.combo = null; L.carga = .001; SOM.carga(); }

  // ----- pulo (pulo duplo e planar para quem voa) -----
  if (d.has('pulo')) {
    if (L.posLancar > 0 && A && A.lancado) superSalto(L, A);
    else if (!L.noAr) pular(L);
    else if (L.p.voo && !L.puloDuplo) { L.puloDuplo = true; L.vy = VEL_PULO*.9; SOM.pulo(); soltar('flying', L.pos.x, L.y, L.pos.z, 12, 3, .4, .4); }
  }
  if (L.p.voo && L.noAr && E.agora.has('pulo') && L.vy < -2 && !L.lancado) L.vy = -2;     // plana
  // ----- esquiva (com direção) ou perseguição (sem direção) -----
  if (d.has('esquiva')) {
    const parado = Math.hypot(mx, mz) < .3, dist = A ? Math.hypot(A.pos.x - L.pos.x, A.pos.z - L.pos.z) : 0;
    if (parado && A && A.vivo && (dist > 3.5 || A.lancado)) perseguir(L, A);
    else esquivar(L, mx, mz);
  }
  // ----- ataque corpo a corpo -----
  if (d.has('ataque')) {
    if (L.posLancar > 0 && A && A.lancado && !L.noAr) superSalto(L, A);
    else pedirGolpe(L);
  }
  // ----- golpes especiais, Ultimate, assistências, troca -----
  const alvo = A && A.vivo ? new THREE.Vector3(A.pos.x, A.y + A.altura*.5, A.pos.z) : L.pos.clone().addScaledVector(frenteDe(L), 10);
  for (let i = 0; i < 4; i++) if (d.has('golpe' + i) && !L.combo) usarGolpe(L, i, alvo);
  if (d.has('ult')) iniciarUlt(L);
  if (d.has('assist0')) chamarAssist(L, 0);
  if (d.has('assist1')) chamarAssist(L, 1);
  if (d.has('trocar')) trocarProximo(L.time);
  if (d.has('mega')) megaEvoluir(L);

  // ----- andar (o combo controla o corpo sozinho) -----
  if (L.combo || L.perseguir) mover(L, 0, 0, dt);
  else mover(L, mx, mz, dt);
}

/* ----- Combo corpo a corpo ----- */
function golpesDoEstilo(L){ return ESTILOS_LUTA[L.p.estilo || 'equilibrado'].golpes; }
function pedirGolpe(L){
  if (L.noAr) { golpeAereo(L); return; }
  if (!L.combo) { if (!L.ataque && !L.dash && !L.esquiva && L.recup <= 0) iniciarGolpe(L, golpesDoEstilo(L)[0], 0); return; }
  L.combo.prox = true;      // guarda o aperto: o próximo golpe sai assim que este terminar
}
function iniciarGolpe(L, h, i, mult = 1){
  const A = inimigoDe(L);
  L.combo = { i, h, t: 0, prox: false, acertou: false, mult };
  L.ataque = { t: 0, dur: h.dur, jeito: 'combo', membro: h.membro, giro: h.giro, i };
  if (A && A.vivo) {
    const dx = A.pos.x - L.pos.x, dz = A.pos.z - L.pos.z, dist = Math.hypot(dx, dz);
    if (dist < 7) L.rumo = Math.atan2(dx, dz);
    // estilo sobrenatural: some e aparece atrás do rival
    if (h.teleporte && dist < 7) teleportar(L, A.pos.clone().addScaledVector(frenteDe(A), -1.6), A);
  }
  L.travaRumo = h.dur;
  SOM.soco(i < 0 ? 2 : h.poder > 25 ? 1 : 0);
}
function atualizarCombo(L, dt){
  const c = L.combo; if (!c) return;
  const h = c.h, A = inimigoDe(L);
  c.t += dt;
  const k = c.t/h.dur;
  // avanço em direção ao rival até encostar
  if (k < h.ativo && A && A.vivo) {
    const dx = A.pos.x - L.pos.x, dz = A.pos.z - L.pos.z, dist = Math.hypot(dx, dz), encosta = A.raio + L.raio + .35;
    if (dist < 6) L.rumo = girarAngulo(L.rumo, Math.atan2(dx, dz), dt*20);
    if (dist > encosta) { const v = Math.min(dist - encosta, h.avanco*(dist < 4.5 ? 1.6 : 1))/(h.dur*h.ativo); L.pos.x += Math.sin(L.rumo)*v*dt; L.pos.z += Math.cos(L.rumo)*v*dt; }
  }
  if (!c.acertou && k >= h.ativo) {
    c.acertou = true;
    const f = frenteDe(L);
    rastroGolpe(L, h);
    if (A && A.vivo && A.emCampo) {
      const dx = A.pos.x - L.pos.x, dz = A.pos.z - L.pos.z, dist = Math.hypot(dx, dz);
      const frente = (dx*f.x + dz*f.z)/(dist || 1);
      if (dist < h.alcance + A.raio + L.raio*.5 && frente > .1 && Math.abs(A.y - L.y) < 1.8) {
        const dano = aplicarDano(L, A, h.poder*c.mult, null, 'combo', f, { hitstun: h.hitstun, final: h.final, quebraGuarda: h.quebraGuarda, combo: true });
        if (dano >= 0) efeitoGolpeCombo(L, A, h, c.i);
        if (h.final === 'lancar') L.posLancar = .7;           // janela para perseguir no ar
      }
    }
  }
  if (k >= 1) {
    const lista = golpesDoEstilo(L);
    if (c.prox && c.i >= 0 && c.i + 1 < lista.length) iniciarGolpe(L, lista[c.i + 1], c.i + 1);
    else { L.combo = null; L.ataque = null; L.recup = c.i < 0 ? .3 : .12; }
  }
}
// golpe no ar: até 3 seguidos; o 3º joga o rival no chão
function golpeAereo(L){
  if (L.aereoCd > 0 || L.aereos >= 3) return;
  const A = inimigoDe(L); L.aereoCd = .24; L.aereos++;
  const ultimo = L.aereos >= 3;
  L.ataque = { t: 0, dur: .26, jeito: 'combo', membro: ultimo ? 'corpo' : (L.aereos % 2 ? 'bracoD' : 'bracoE'), i: L.aereos };
  L.vy = Math.max(L.vy, 2.2);
  SOM.soco(0);
  if (A && A.vivo) {
    const dist = Math.hypot(A.pos.x - L.pos.x, A.pos.z - L.pos.z), dy = Math.abs((A.y + A.altura*.5) - (L.y + L.altura*.5));
    L.rumo = Math.atan2(A.pos.x - L.pos.x, A.pos.z - L.pos.z);
    if (dist < 2.6 + A.raio && dy < 2.4) {
      const h = Object.assign({}, GOLPE_AEREO, ultimo ? { poder: 22, final: 'derrubar', efeito: 'impacto' } : {});
      const dano = aplicarDano(L, A, h.poder, null, 'aereo', frenteDe(L), { hitstun: h.hitstun, final: h.final, combo: true });
      if (dano >= 0) { efeitoGolpeCombo(L, A, h, L.aereos); if (!ultimo && A.lancado) A.vy = 3; }
    }
  }
}
// pulo alto atrás do rival lançado
function superSalto(L, A){
  L.posLancar = 0; L.noAr = true; L.vy = 13; L.aereos = 0;
  L.perseguir = { t: .5, alvo: A, ar: true };
  SOM.pulo(); poeira(L.pos.x, L.pos.z, 10);
}
function perseguir(L, A){
  if (L.persCd > 0) return;
  L.persCd = .7; L.perseguir = { t: .55, alvo: A, ar: A.y > 1.5 };
  SOM.investida();
}
function atualizarPerseguicao(L, dt){
  const P = L.perseguir; if (!P) return;
  P.t -= dt;
  const A = P.alvo, alvoY = A.y + (P.ar ? A.altura*.2 : 0);
  const dx = A.pos.x - L.pos.x, dz = A.pos.z - L.pos.z, dist = Math.hypot(dx, dz);
  L.rumo = Math.atan2(dx, dz);
  const encosta = A.raio + L.raio + .6, v = 28;
  if (dist > encosta) { L.pos.x += dx/dist*Math.min(v*dt, dist - encosta); L.pos.z += dz/dist*Math.min(v*dt, dist - encosta); }
  if (P.ar) { L.noAr = true; L.vy = (alvoY - L.y)*8; }
  rastroVelocidade(L);
  if (P.t <= 0 || (dist <= encosta + .05 && (!P.ar || Math.abs(alvoY - L.y) < .6))) { L.perseguir = null; if (P.ar) L.vy = 2; }
}

/* ----- Defesa ----- */
// bloqueio perfeito: o atacante fica atordoado e quem defendeu ganha a chance de contra-atacar
function contraAtaque(def, atac){
  def.guardando = false; def.contraT = .6;
  atac.combo = null; atac.ataque = null; atac.atordoado = .75; atac.dash = null;
  const p = centroDe(def);
  flash('anel', 0xffffff, p.x, p.y, p.z, 3, .3); flash('faisca', 0x8ad8ff, p.x, p.y, p.z, 3.5, .25);
  avisoCombate(def.time, 'CONTRA-ATAQUE!', '#8ad8ff'); SOM.parry(); congelar(.1); FX.lento = Math.max(FX.lento, .25);
  vibrarTime(def.time, .4, 120);
}
function quebrarGuarda(L){
  L.guardando = false; L.guardaHP = 0; L.quebrado = 1.1;
  const p = centroDe(L);
  for (let i = 0; i < 18; i++) part('estilhaco', { x: p.x, y: p.y, z: p.z, vx: rnd(-6, 6), vy: rnd(1, 7), vz: rnd(-6, 6), cor: 0x8ad8ff, tam: .4, vida: .7, grav: 12, tingir: true });
  flash('onda', 0x8ad8ff, p.x, p.y, p.z, 4, .35);
  avisoCombate(L.time, 'GUARDA QUEBRADA!', '#ffb14a'); SOM.quebraGuarda(); tremer(.3);
}
function bloqueou(def, atac, poder){
  const p = centroDe(def), f = frenteDe(def);
  flash('anel', 0x6ab8ff, p.x + f.x*.8, p.y, p.z + f.z*.8, 1.8, .18);
  part('faisca', { x: p.x + f.x*.8, y: p.y, z: p.z + f.z*.8, vx: 0, vy: 0, vz: 0, cor: 0x8ad8ff, tam: 1.2, vida: .15 });
  if (atac) { const dx = def.pos.x - atac.pos.x, dz = def.pos.z - atac.pos.z, d = Math.hypot(dx, dz) || 1; def.vel.x += dx/d*3; def.vel.z += dz/d*3; }
  SOM.bloqueio();
}
function esquivaPerfeita(def, atac){
  def.inv = Math.max(def.inv, .5); def.contraT = .7;
  atac.atordoado = Math.max(atac.atordoado, .55); atac.combo = null; atac.ataque = null;
  FX.lento = Math.max(FX.lento, .55);
  const p = centroDe(def); flash('anel', 0xffffff, p.x, p.y, p.z, 2.5, .35);
  avisoCombate(def.time, 'ESQUIVA PERFEITA!', '#7dff9a'); SOM.esquivaPerfeita();
}
// Substituição: troca de lugar com um boneco e aparece atrás de quem atacou
function substituir(L){
  if (L.subs < 1) return;
  const A = inimigoDe(L); if (!A) return;
  L.subs -= 1;
  bonecoSubstituto(L.pos.x, L.y, L.pos.z, L.altura);
  const destino = A.pos.clone().addScaledVector(frenteDe(A), -2.2);
  L.atordoado = 0; L.lancado = false; L.quebrado = 0; L.y = 0; L.vy = 0; L.noAr = false; L.comboRecebido = 0;
  teleportar(L, destino, A);
  L.inv = Math.max(L.inv, .45);
  A.combo = null; A.ataque = null;
  avisoCombate(L.time, 'SUBSTITUIÇÃO!', '#ffd84a'); SOM.puf();
}
function levantarRapido(L, mx, mz){
  const A = inimigoDe(L);
  L.caido = 0; L.comboRecebido = 0;
  let dx = -mx, dz = -mz;
  if (Math.hypot(dx, dz) < .2 && A) { dx = L.pos.x - A.pos.x; dz = L.pos.z - A.pos.z; }
  const d = Math.hypot(dx, dz) || 1;
  L.esquiva = { t: .3, dx: dx/d, dz: dz/d }; L.esqInicio = -9; L.inv = Math.max(L.inv, .55);
  poeira(L.pos.x, L.pos.z, 10); SOM.esquiva();
}
// "Quebra de combo": depois de muitos golpes seguidos, o alvo se solta sozinho (evita combo infinito)
function quebraDeCombo(alvo, atac){
  alvo.atordoado = 0; alvo.lancado = false; alvo.comboRecebido = 0; alvo.inv = .9; alvo.vy = 0;
  if (atac) { const dx = atac.pos.x - alvo.pos.x, dz = atac.pos.z - alvo.pos.z, d = Math.hypot(dx, dz) || 1; atac.vel.x = dx/d*14; atac.vel.z = dz/d*14; atac.combo = null; atac.ataque = null; atac.atordoado = .4; }
  const p = centroDe(alvo); onda(alvo.pos.x, alvo.pos.z, 5, 0xffffff, .4); flash('brilho', 0xffffff, p.x, p.y, p.z, 4, .3, 0, .6);
  avisoCombate(alvo.time, 'QUEBRA DE COMBO', '#ffffff'); SOM.area();
}

/* ----- Assistência e troca ----- */
function membrosReserva(t){ return JOGO.times[t].filter((m, i) => i !== JOGO.ativo[t] && m.vivo); }
function chamarAssist(L, k){
  const m = membrosReserva(L.time)[k], A = inimigoDe(L);
  if (!m || m.assistCd > 0 || m.assistindo || !A || !A.vivo || JOGO.cineAtiva) return;
  m.assistCd = COMBATE.assistRecarga*(JOGO.regras.caos ? .4 : 1);
  const emCombo = !!L.combo || A.atordoado > 0;
  // fantasmas/psíquicos aparecem atrás do rival; os outros ao lado de quem chamou
  const atras = m.p.estilo === 'sobrenatural';
  const perp = new THREE.Vector3(Math.cos(L.rumo), 0, -Math.sin(L.rumo));
  const pos = atras ? A.pos.clone().addScaledVector(frenteDe(A), -3) : L.pos.clone().addScaledVector(perp, 2.4);
  colocarEmCampo(m, pos, { rapido: true });
  m.assistindo = { t: 0, modo: emCombo ? 'equipe' : 'golpe', feito: false };
  m.rumo = Math.atan2(A.pos.x - pos.x, A.pos.z - pos.z);
  avisoCombate(L.time, (emCombo ? 'COMBO DE EQUIPE: ' : 'ASSISTÊNCIA: ') + m.p.nome, '#ffd84a'); SOM.assist();
}
function atualizarAssist(m, dt){
  const S_ = m.assistindo; S_.t += dt;
  const A = lutador(1 - m.time);
  m.inv = 1;
  if (!S_.feito && S_.t > .38 && A && A.vivo) {
    S_.feito = true;
    m.rumo = Math.atan2(A.pos.x - m.pos.x, A.pos.z - m.pos.z);
    if (S_.modo === 'equipe') {
      // golpe de equipe: avança e lança o rival para o alto
      const dir = new THREE.Vector3(A.pos.x - m.pos.x, 0, A.pos.z - m.pos.z).normalize();
      m.dash = { t: .32, dx: dir.x, dz: dir.z, v: 26, g: { nome: 'Combo de equipe', tipo: m.p.tipos[0], poder: 40, equipe: true }, acertou: false };
    } else {
      const ordem = ['raio', 'projetil', 'chuva', 'investida', 'area'];
      let i = -1; for (const j of ordem) { i = m.p.golpes.findIndex(g => g.jeito === j); if (i >= 0) break; }
      m.cds = [0, 0, 0, 0]; m.ataque = null; m.surgir = 1;
      if (i >= 0) usarGolpe(m, i, new THREE.Vector3(A.pos.x, A.y + A.altura*.5, A.pos.z));
    }
  }
  if (S_.t > 1.6) {
    const p = centroDe(m); flash('brilho', 0xff4a4a, p.x, p.y, p.z, 2.5, .3, 0, .6); SOM.pokebola();
    m.assistindo = null; m.dash = null; if (m.silhueta) { m.silhueta = 0; silhuetaFim(m.inst); } recolherPokebola(m);
  }
}
function trocarProximo(t){
  const time = JOGO.times[t];
  for (let k = 1; k < time.length; k++) { const i = (JOGO.ativo[t] + k) % time.length; if (time[i].vivo && !time[i].assistindo) { trocarPara(t, i); return; } }
}

/* ----- Atualização por quadro (chamado em atualizarLutador) ----- */
function atualizarCombate(L, dt){
  L.recup = Math.max(0, L.recup - dt); L.aereoCd = Math.max(0, L.aereoCd - dt); L.persCd = Math.max(0, L.persCd - dt);
  L.posLancar = Math.max(0, L.posLancar - dt); L.contraT = Math.max(0, L.contraT - dt); L.assistCd = Math.max(0, L.assistCd - dt);
  if (L.guardando) L.guardaT += dt;
  else { L.guardaRegen += dt; if (L.guardaRegen > 1) L.guardaHP = Math.min(L.guardaMax, L.guardaHP + dt*22); }
  if (L.guardando) L.guardaRegen = 0;
  L.subs = Math.min(COMBATE.subsMax, L.subs + dt/(COMBATE.subsRecarga*(L.p.subsRapida ? .6 : 1)));
  if (L.quebrado > 0) { L.quebrado = Math.max(0, L.quebrado - dt); if (!L.quebrado) L.guardaHP = L.guardaMax*.5; }
  if (L.atordoado > 0) { L.atordoado = Math.max(0, L.atordoado - dt); if (!L.atordoado && !L.lancado) L.comboRecebido = 0; }
  if (L.caido > 0) { L.caidoT += dt; L.caido = Math.max(0, L.caido - dt); L.inv = Math.max(L.inv, .05); if (!L.caido) { L.comboRecebido = 0; L.inv = .35; } }
  if (!L.noAr) { L.aereos = 0; L.puloDuplo = false; }
  atualizarCombo(L, dt);
  atualizarPerseguicao(L, dt);
  if (L.assistindo) atualizarAssist(L, dt);
  // contador de combo de quem ataca
  if (L.comboT > 0) { L.comboT -= dt; if (L.comboT <= 0) { L.comboHits = 0; L.comboDano = 0; } }
}

/* ----- Visual dos golpes corpo a corpo ----- */
function rastroGolpe(L, h){
  const e = estilo(L.p.tipos[0]), f = frenteDe(L), p = centroDe(L).addScaledVector(f, L.raio + .6);
  const s = spriteFx(h.efeito === 'garra' ? 'leftclaw' : 'corte', h.efeito === 'garra' ? 0xffffff : e.c2, 1.6 + L.altura*.4, h.efeito !== 'garra');
  s.position.copy(p); s.material.rotation = (h.membro === 'perna' ? -.4 : h.membro === 'bracoE' ? 2.4 : .8) + rnd(-.3, .3);
  efeito(s, .16, (ef, k) => { s.scale.setScalar((1.6 + L.altura*.4)*(.7 + k*.5)); s.material.opacity = (1 - k)*.9; });
  SOM.vento();
}
function efeitoGolpeCombo(L, A, h, i){
  const e = estilo(L.p.tipos[0]), f = frenteDe(L), p = centroDe(A).addScaledVector(f, -A.raio*.5);
  const forte = h.final || h.poder >= 30;
  flash('faisca', 0xffffff, p.x, p.y, p.z, forte ? 3.4 : 2.2, .14, 6);
  flash('brilho', e.c1, p.x, p.y, p.z, forte ? 3 : 1.8, .2, 0, .5);
  soltar(L.p.tipos[0], p.x, p.y, p.z, forte ? 16 : 7, forte ? 6 : 4, .35, .4);
  switch (h.efeito) {
    case 'garra': flash('leftclaw', 0xffffff, p.x, p.y, p.z, 2, .2); break;
    case 'mordida': efeitoContato({ tipo: L.p.tipos[0], visual: 'mordida' }, p); break;
    case 'sombra': for (let k = 0; k < 14; k++) FUMACA.add({ x: p.x, y: p.y, z: p.z, vx: rnd(-4, 4), vy: rnd(-1, 3), vz: rnd(-4, 4), cor: 0x2a1240, tam: 1, vida: .7, cel: 'fumaca0', cresce: 1.2 }); break;
    case 'terremoto': onda(A.pos.x, A.pos.z, 4.5, 0xc9a25a, .4); rachaduras(A.pos.x, A.pos.z, 3); pedacos(A.pos.x, .3, A.pos.z, 8, 'ground', 6, .2); break;
    case 'soco': if (i % 2 === 0) flash('fist', 0xffffff, p.x, p.y, p.z, 1.2, .12); break;
  }
  if (forte) { onda(A.pos.x, A.pos.z, 3, e.c1, .35); tremer(.25); ondaDeChoque(p, .5); }
  SOM.acertoCombo(forte);
}
function rastroVelocidade(L){
  const e = estilo(L.p.tipos[0]);
  for (let k = 0; k < 3; k++) part('listra', { x: L.pos.x + rnd(-.4, .4), y: L.y + rnd(.2, L.altura), z: L.pos.z + rnd(-.4, .4), vx: -Math.sin(L.rumo)*5, vy: 0, vz: -Math.cos(L.rumo)*5,
    cor: e.c2, tam: L.altura*.9, vida: .18, atrito: 0, rot: anguloNaTela(L.pos, frenteDe(L)), brilhar: true, tingir: true });
  if (Math.random() < .5) soltar(L.p.tipos[0], L.pos.x, L.y + L.altura*.5, L.pos.z, 2, 1, .4, .3);
}
function auraCarga(L, k){
  const e = estilo(L.p.tipos[0]);
  if (Math.random() < .6 + k*.4) {
    const a = Math.random()*7, r = 1.2 + L.raio;
    part(escolher(['brilho','faisca', ...e.rastro]), { x: L.pos.x + Math.cos(a)*r, y: rnd(0, L.altura*1.2), z: L.pos.z + Math.sin(a)*r,
      vx: -Math.cos(a)*r*2.5, vy: rnd(.5, 2), vz: -Math.sin(a)*r*2.5, cor: e.c1, tam: .3 + k*.3, vida: .35, atrito: 0, tingir: true, brilhar: true });
  }
  if (Math.random() < .08) onda(L.pos.x, L.pos.z, 1.5 + k*2, e.c1, .3);
}
function teleportar(L, destino, olharPara){
  const p = centroDe(L);
  for (let k = 0; k < 10; k++) FUMACA.add({ x: p.x, y: p.y, z: p.z, vx: rnd(-2, 2), vy: rnd(0, 2), vz: rnd(-2, 2), cor: 0x6a4a8a, tam: .9, vida: .45, cel: 'fumaca0', cresce: 1 });
  const r = Math.hypot(destino.x, destino.z), max = RAIO_ARENA - L.raio - .5;
  if (r > max) destino.multiplyScalar(max/r);
  L.pos.x = destino.x; L.pos.z = destino.z;
  if (olharPara) L.rumo = Math.atan2(olharPara.pos.x - L.pos.x, olharPara.pos.z - L.pos.z);
  const q = centroDe(L);
  for (let k = 0; k < 10; k++) FUMACA.add({ x: q.x, y: q.y, z: q.z, vx: rnd(-2, 2), vy: rnd(0, 2), vz: rnd(-2, 2), cor: 0x6a4a8a, tam: .9, vida: .45, cel: 'fumaca0', cresce: 1 });
  SOM.puf();
}
// o boneco que fica no lugar na Substituição (um bonequinho de pelúcia simples)
function bonecoSubstituto(x, y, z, alt){
  const g = new THREE.Group(), mat = new THREE.MeshStandardMaterial({ color: 0xe8d9a8, roughness: .9 });
  const corpo = new THREE.Mesh(new THREE.CapsuleGeometry(.32, .35, 4, 8), mat); corpo.position.y = .5; g.add(corpo);
  const cabeca = new THREE.Mesh(new THREE.SphereGeometry(.3, 10, 8), mat); cabeca.position.y = 1.05; g.add(cabeca);
  for (const s of [-1, 1]) { const o = new THREE.Mesh(new THREE.ConeGeometry(.09, .35, 6), mat); o.position.set(s*.16, 1.38, 0); o.rotation.z = -s*.25; g.add(o); }
  const s = Math.max(.7, alt*.5); g.scale.setScalar(s); g.position.set(x, y, z);
  g.traverse(o => o.isMesh && (o.castShadow = true));
  efeito(g, 1.1, (e, k) => { g.rotation.z = Math.min(1.4, k*5); g.position.y = Math.max(0, y*(1 - k*3)); if (k > .8) g.scale.setScalar(s*(1 - (k - .8)*5)); });
  for (let k = 0; k < 16; k++) FUMACA.add({ x, y: y + .8, z, vx: rnd(-3, 3), vy: rnd(0, 3), vz: rnd(-3, 3), cor: 0xffffff, tam: 1.1, vida: .6, cel: 'fumaca1', cresce: 1.4 });
}
function vibrarTime(t, forca, ms){ if (JOGO.controle[t] === 'jogador') vibrar(JOGO.jogadorDoTime[t], forca, ms); }
