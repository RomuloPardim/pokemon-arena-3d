"use strict";
/* =========================================================
   IA — gera a mesma "entrada" que um jogador (x, y, agora, disparou)
   Assim ela usa exatamente os mesmos combos, guarda, esquivas e regras que você.
   ========================================================= */
const DIFICULDADE_IA = {
  facil:   { reacao: .75, guarda: .12, subs: .03, tecnica: .2,  combo: .5,  erro: .45 },
  normal:  { reacao: .42, guarda: .35, subs: .1,  tecnica: .45, combo: .8,  erro: .22 },
  dificil: { reacao: .2,  guarda: .62, subs: .25, tecnica: .8,  combo: 1,   erro: .08 },
};
// boneco do Modo Treinamento: 'parado', 'andar', 'pular', 'guarda', 'esquiva', 'ia'
function entradaIA(L, dt, comportamento){
  const E = { x: 0, y: 0, agora: new Set(), disparou: new Set(), solto: new Set(), mundo: true };
  const A = inimigoDe(L), ai = L.ai, D = DIFICULDADE_IA[JOGO.difId] || DIFICULDADE_IA.normal;
  if (!A || !A.emCampo || !A.vivo || !L.vivo) return E;
  const aperta = acao => { if (!ai['seg_' + acao]) E.disparou.add(acao); E.agora.add(acao); ai['seg_' + acao] = true; };
  const solta = acao => { ai['seg_' + acao] = false; };
  for (const a of ['ataque','guarda','pulo','esquiva']) if (!E.agora.has(a)) { /* cada quadro decide de novo */ }
  const dx = A.pos.x - L.pos.x, dz = A.pos.z - L.pos.z, dist = Math.hypot(dx, dz) || .01, ux = dx/dist, uz = dz/dist;
  const andar = (x, z) => { const m = Math.hypot(x, z) || 1; E.x = x/m; E.y = z/m; };
  ai.pensar -= dt; ai.cdAtaque -= dt; ai.guardaT -= dt; ai.apertar -= dt;

  // ----- boneco do treino -----
  if (comportamento && comportamento !== 'ia') {
    if (comportamento === 'andar') andar(-uz*(Math.sin(JOGO.tempo*.7) > 0 ? 1 : -1), ux*(Math.sin(JOGO.tempo*.7) > 0 ? 1 : -1));
    if (comportamento === 'pular' && !L.noAr && Math.random() < dt*1.5) aperta('pulo');
    if (comportamento === 'guarda') aperta('guarda');
    if (comportamento === 'esquiva' && (A.combo || A.ataque) && dist < 4 && Math.random() < dt*6) { andar(-uz, ux); aperta('esquiva'); }
    if (L.caido > .3) aperta('pulo');
    for (const a of ['ataque','guarda','pulo','esquiva']) if (!E.agora.has(a)) solta(a);
    return E;
  }

  // ----- em apuros -----
  if (L.caido > 0) { if (L.caidoT > .2 && Math.random() < D.tecnica*dt*8) aperta('pulo'); return E; }
  if (L.atordoado > 0 || L.lancado) {
    if (L.subs >= 1 && L.comboRecebido >= 3 && Math.random() < D.subs*dt*10) aperta('guarda');
    for (const a of ['ataque','pulo','esquiva']) solta(a);
    return E;
  }
  // ----- V20: quem voa às vezes levanta voo (mais quando está longe) -----
  if (podeVoar(L) && !L.noAr && Math.random() < dt*(dist > 6 ? .35 : .12)*(.5 + D.tecnica)) iniciarVoo(L);
  // ----- defesa: rival atacando perto ou projétil vindo -----
  const ameaça = (A.combo || A.carga || (A.ataque && A.ataque.t < .5) || A.dash) && dist < 4.5;
  if (ameaça && ai.guardaT <= 0 && Math.random() < D.guarda*dt*9) ai.guardaT = rnd(.35, .8);
  if (ai.guardaT > 0 && !A.carga) {
    // às vezes esquiva em vez de segurar a guarda (contra golpes que quebram a guarda)
    if (A.combo && A.combo.h.quebraGuarda && Math.random() < D.tecnica) { andar(-uz, ux); aperta('esquiva'); ai.guardaT = 0; }
    else { aperta('guarda'); solta('ataque'); return E; }
  }
  solta('guarda');
  for (const P of JOGO.projeteis) {
    if (P.dono.time === L.time) continue;
    const px = L.pos.x - P.pos.x, pz = L.pos.z - P.pos.z, d = Math.hypot(px, pz);
    if (d < 7 && (P.vel.x*px + P.vel.z*pz) > 0 && Math.random() < D.guarda*dt*8) {
      if (Math.random() < .5) { const v = Math.hypot(P.vel.x, P.vel.z); andar(-P.vel.z/v*ai.lado, P.vel.x/v*ai.lado); aperta('esquiva'); }
      else { ai.guardaT = .5; aperta('guarda'); }
      return E;
    }
  }
  // ----- decisões -----
  if (ai.pensar <= 0) {
    ai.pensar = D.reacao*rnd(.8, 2);
    if (Math.random() < .3) ai.lado *= -1;
    const corpo = ['tecnico','pesado','agressivo','rapido','sobrenatural','aereo'].includes(L.p.estilo);
    ai.dist = corpo && Math.random() < .7 ? 1.8 : rnd(6, 11);
    if (L.hp/L.hpMax < .25 && Math.random() < .4) ai.dist = rnd(9, 13);
    // trocar quando está mal e tem alguém melhor
    const reserva = membrosReserva(L.time).filter(m => !m.assistindo);
    if (L.hp/L.hpMax < .22 && reserva.some(m => m.hp/m.hpMax > .6) && Math.random() < .25) aperta('trocar');
  }
  // persegue de longe
  if (dist > 13 && Math.random() < dt*1.2) { aperta('esquiva'); return E; }
  // aproxima / afasta + anda de lado
  let rad = dist > ai.dist + .8 ? 1 : dist < ai.dist - .8 ? -.8 : 0;
  let mx = ux*rad - uz*ai.lado*(ai.dist > 3 ? .7 : .2), mz = uz*rad + ux*ai.lado*(ai.dist > 3 ? .7 : .2);
  if (perigoEm(L.pos.x + mx*2, L.pos.z + mz*2) === 'lava' || perigoEm(L.pos.x, L.pos.z) === 'lava') { mx = -L.pos.x; mz = -L.pos.z; ai.lado *= -1; }
  for (const o of ARENA.obstaculos) if (o.vivo) { const ox = L.pos.x - o.x, oz = L.pos.z - o.z, d = Math.hypot(ox, oz); if (d < o.raio + 1.8) { mx += ox/d; mz += oz/d; } }
  if (Math.hypot(L.pos.x, L.pos.z) > RAIO_ARENA - 3) { mx -= L.pos.x*.1; mz -= L.pos.z*.1; ai.lado *= -1; }
  if (Math.hypot(mx, mz) > .05) andar(mx, mz);

  // ----- ataque -----
  // continuar o combo / perseguir no ar depois de lançar
  if (L.combo && ai.apertar <= 0 && Math.random() < D.combo) { aperta('ataque'); ai.apertar = .12; return E; }
  if (L.posLancar > 0 && A.lancado && Math.random() < D.tecnica*dt*12) { aperta('pulo'); return E; }
  if (L.noAr && A.lancado && dist < 3) { if (ai.apertar <= 0) { aperta('ataque'); ai.apertar = .2; } return E; }
  solta('ataque');
  // Ultimate
  if (podeMegaEvoluir(L) === true && dist > 4 && Math.random() < dt*.7) { aperta('mega'); return E; }   // Mega quando está a uma distância segura
  if (L.en >= 100 && dist < 10 && Math.random() < dt*1.5) { aperta('ult'); return E; }
  // contra-ataque depois de bloquear/esquivar
  if (L.contraT > 0 && dist < 3.5) { aperta('ataque'); return E; }
  if (ai.cdAtaque > 0) return E;
  // assistência
  if (dist < 9 && Math.random() < .12) { const k = Math.random() < .5 ? 0 : 1, m = membrosReserva(L.time)[k]; if (m && m.assistCd <= 0) { aperta('assist' + k); ai.cdAtaque = D.reacao; return E; } }
  // corpo a corpo
  if (dist < 2.8) { aperta('ataque'); ai.apertar = .12; ai.cdAtaque = D.reacao*rnd(.3, .9); return E; }
  // golpe especial pela distância
  const op = [];
  L.p.golpes.forEach((g, i) => {
    if (L.cds[i] > 0) return;
    let nota = 0;
    switch (g.jeito) {
      case 'projetil':  nota = dist < 20 && dist > 3 ? 1 : 0; break;
      case 'raio':      nota = dist < 14 && dist > 3 ? 2 : 0; break;
      case 'area':      nota = dist < 5 ? 2.6 : 0; break;
      case 'investida': nota = dist < 8 && dist > 2.5 ? 2.2 : 0; break;
      case 'chuva':     nota = dist < 15 && dist > 4 ? 1.8 : 0; break;
      case 'buff':      nota = L.buffT <= 0 && dist > 8 ? 1.2 : 0; break;
    }
    if (nota) op.push({ i, nota: nota*effectiveness(g.tipo, A.p.tipos)*rnd(.6, 1.4) });
  });
  if (op.length) { op.sort((a, b) => b.nota - a.nota); aperta('golpe' + op[0].i); }
  ai.cdAtaque = D.reacao*rnd(.5, 1.3);
  if (Math.random() < .08 && !L.noAr) aperta('pulo');
  return E;
}
