"use strict";
/* =========================================================
   BATALHA — lutadores, golpes, dano, IA e Ultimates
   ========================================================= */
const DIFICULDADE = {
  facil:   { nome:'Fácil',   reacao:.85, erro:.45, dano:.7,  esquiva:.12 },
  normal:  { nome:'Normal',  reacao:.5,  erro:.22, dano:1,   esquiva:.35 },
  dificil: { nome:'Difícil', reacao:.26, erro:.08, dano:1.25, esquiva:.65 },
};
const GRAVIDADE = 22, VEL_PULO = 8.5;

const JOGO = {
  estado: 'menu', pausado: false, fim: false, dif: DIFICULDADE.normal,
  times: [[], []],           // cada time: lista de membros (um por Pokémon)
  ativo: [0, 0],             // índice do Pokémon em campo de cada time
  projeteis: [], agenda: [], // agenda = coisas que acontecem depois de um tempo
  tempo: 0, trocaCd: [0, 0], cineAtiva: null,
  controle: ['jogador', 'ia'],   // quem controla cada time: 'jogador', 'ia' ou 'boneco' (treino)
  jogadorDoTime: [0, 1],         // qual jogador (0 = J1, 1 = J2) controla cada time
  regras: {},                    // caos, treino... (modos.js)
};
const EM_BATALHA = () => JOGO.estado === 'batalha';
const lutador = t => JOGO.times[t][JOGO.ativo[t]];
const inimigoDe = L => lutador(1 - L.time);
function depois(seg, fn){ JOGO.agenda.push({ t: seg, fn }); }

/* ----- Criação ----- */
async function criarMembro(id, time){
  const p = POR_ID[id], inst = await criarInstancia(id);
  const hpMax = Math.round(120 + p.hp*2.4);
  return {
    p, inst, time, hp: hpMax, hpMax, en: 0, vivo: true, emCampo: false,
    atk: p.atk, def: p.def, velBase: 5.2 + p.vel/28, raio: inst.raio, altura: inst.altura,
    pos: new THREE.Vector3(), vel: new THREE.Vector3(), rumo: 0, y: 0, vy: 0, noAr: false,
    cds: [0, 0, 0, 0], esqCd: 0, inv: 0, buffT: 0, ataque: null, dash: null, esquiva: null,
    danoT: 0, desmaio: 0, viraT: 0, travaRumo: 0,
    // combate (combate.js)
    combo: null, recup: 0, segura: 0, carga: 0, aereos: 0, aereoCd: 0, perseguir: null, persCd: 0, posLancar: 0,
    atordoado: 0, lancado: false, caido: 0, caidoT: 0, quebrado: 0, comboRecebido: 0, contraT: 0, esqInicio: -9,
    guardando: false, guardaT: 0, guardaMax: p.guardaForte ? 160 : 100, guardaHP: p.guardaForte ? 160 : 100, guardaRegen: 0,
    subs: COMBATE.subsMax, assistCd: 0, assistindo: null, comboHits: 0, comboDano: 0, comboT: 0, puloDuplo: false,
    ai: { pensar: 0, lado: 1, dist: 8, cdAtaque: 1, pularT: 3, guardaT: 0, apertar: 0 },
  };
}
function posInicial(time){ return time === 0 ? new THREE.Vector3(0, 0, 11) : new THREE.Vector3(0, 0, -11); }
function colocarEmCampo(L, pos, opc = {}){
  L.pos.copy(pos); L.vel.set(0, 0, 0); L.y = 0; L.vy = 0; L.noAr = false;
  L.ataque = L.dash = L.esquiva = L.combo = L.perseguir = null; L.danoT = 0; L.inv = 1;
  L.atordoado = 0; L.lancado = false; L.caido = 0; L.quebrado = 0; L.carga = 0; L.guardando = false; L.comboRecebido = 0;
  const alvo = lutador(1 - L.time);
  L.rumo = alvo && alvo !== L ? Math.atan2(alvo.pos.x - pos.x, alvo.pos.z - pos.z) : (L.time === 0 ? Math.PI : 0);
  L.inst.raiz.position.copy(pos); L.inst.raiz.rotation.y = L.rumo; L.inst.raiz.scale.setScalar(.01);
  cena.add(L.inst.raiz); L.emCampo = true;
  // V14: a Pokébola é lançada e abre; o Pokémon só cresce quando ela abre (surgir negativo = esperando)
  const tAbrir = lancarPokebola({ de: origemTreinador(L, pos), ate: pos, altura: Math.min(1.6, .55 + L.altura*.45), alturaPokemon: L.altura,
    rapido: !!opc.rapido, cor: 0xffffff, alvo: alvo && alvo !== L ? alvo.pos : null });
  L.surgir = -tAbrir*2.6;
  silhuetaInicio(L.inst); L.silhueta = 1; silhueta(L.inst, 1);
  L.inv = Math.max(L.inv, tAbrir + .5);
}
function tirarDeCampo(L){
  cena.remove(L.inst.raiz); L.emCampo = false;
  if (L.silhueta) { L.silhueta = 0; silhuetaFim(L.inst); }
}

/* ----- Física / movimento ----- */
function frenteDe(L){ return new THREE.Vector3(Math.sin(L.rumo), 0, Math.cos(L.rumo)); }
function centroDe(L){ return new THREE.Vector3(L.pos.x, L.y + L.altura*.55, L.pos.z); }

function mover(L, dx, dz, dt){
  // dx,dz = direção desejada (comprimento 0..1)
  const gelo = !L.noAr && !L.p.voa && perigoEm(L.pos.x, L.pos.z) === 'gelo';
  const lama = !L.noAr && !L.p.voa && perigoEm(L.pos.x, L.pos.z) === 'lama';
  const vMax = (lama ? .55 : 1)*L.velBase*(L.buffT > 0 ? 1.25 : 1)*(L.itemVelT > 0 ? 1.3 : 1)*(L.ataque && L.ataque.t < .5 ? .45 : 1)*(L.danoT > 0 ? .5 : 1)*(JOGO.regras.caos ? 1.15 : 1);
  const acel = gelo ? 2.2 : 14;
  const preso = L.atordoado > 0 || L.lancado || L.caido > 0 || L.quebrado > 0;
  if (preso && !L.dash && !L.esquiva) {
    // sem controle: só desliza com o empurrão do golpe
    const k = Math.max(0, 1 - (L.noAr ? .6 : 5)*dt); L.vel.x *= k; L.vel.z *= k;
  } else if (L.dash) {
    L.dash.t -= dt; L.vel.set(L.dash.dx*L.dash.v, 0, L.dash.dz*L.dash.v);
    if (L.dash.t <= 0) L.dash = null;
  } else if (L.esquiva) {
    L.esquiva.t -= dt; L.vel.set(L.esquiva.dx*16, 0, L.esquiva.dz*16);
    if (Math.random() < .6) poeira(L.pos.x, L.pos.z, 1);
    if (L.esquiva.t <= 0) L.esquiva = null;
  } else {
    const k = Math.min(1, acel*dt);
    L.vel.x += (dx*vMax - L.vel.x)*k; L.vel.z += (dz*vMax - L.vel.z)*k;
  }
  L.pos.x += L.vel.x*dt; L.pos.z += L.vel.z*dt;
  // pulo
  if (L.noAr || L.y > 0) {
    L.vy -= GRAVIDADE*dt; L.y += L.vy*dt;
    if (L.y <= 0) {
      L.y = 0; L.vy = 0; L.noAr = false; poeira(L.pos.x, L.pos.z, 8);
      if (L.lancado) {        // caiu depois de ser lançado: fica no chão um pouco
        L.lancado = false; L.caido = .85; L.caidoT = 0; L.atordoado = 0;
        poeira(L.pos.x, L.pos.z, 16); SOM.queda(); tremer(.15);
        if (Math.hypot(L.vel.x, L.vel.z) > 8) rachaduras(L.pos.x, L.pos.z, 1.6);
      }
    }
  }
  colidir(L);
  // virar para onde anda (a não ser logo depois de atacar)
  const v = Math.hypot(L.vel.x, L.vel.z);
  if (L.travaRumo > 0) L.travaRumo -= dt;
  else if (v > .6 && !L.esquiva && !preso) L.rumo = girarAngulo(L.rumo, Math.atan2(L.vel.x, L.vel.z), dt*12);
  // lava machuca
  if (!L.noAr && !L.p.voa && perigoEm(L.pos.x, L.pos.z) === 'lava' && L.vivo) {
    L.lavaT = (L.lavaT || 0) - dt;
    if (L.lavaT <= 0) { L.lavaT = .35; aplicarDano(null, L, 12, 'fire', 'lava'); soltar('fire', L.pos.x, .4, L.pos.z, 10, 2, .4, .6); }
  }
  if (typeof perigosDoMapa === 'function') perigosDoMapa(L, dt);   // perigos dos mapas novos (mapas.js)
  if (!L.noAr && v > 1 && Math.random() < dt*6) poeira(L.pos.x, L.pos.z, 1, ARENA.mapa.poeira ?? 0xb8a98a);
}
function girarAngulo(a, b, k){
  let d = b - a; while (d > Math.PI) d -= Math.PI*2; while (d < -Math.PI) d += Math.PI*2;
  return a + d*Math.min(1, k);
}
function colidir(L){
  // borda da arena
  const r = Math.hypot(L.pos.x, L.pos.z), max = RAIO_ARENA - L.raio;
  if (r > max) { L.pos.x *= max/r; L.pos.z *= max/r; }
  // obstáculos
  for (const o of ARENA.obstaculos) {
    if (!o.vivo || L.y > o.altura) continue;
    const dx = L.pos.x - o.x, dz = L.pos.z - o.z, d = Math.hypot(dx, dz), min = o.raio + L.raio;
    if (d < min && d > .0001) { L.pos.x = o.x + dx/d*min; L.pos.z = o.z + dz/d*min; if (L.dash) L.dash.t = Math.min(L.dash.t, .03); }
  }
  // o outro lutador
  const I = inimigoDe(L);
  if (I && I.emCampo && I.vivo) {
    const dx = L.pos.x - I.pos.x, dz = L.pos.z - I.pos.z, d = Math.hypot(dx, dz), min = I.raio + L.raio;
    if (d < min && d > .0001) { const p = (min - d)/2; L.pos.x += dx/d*p; L.pos.z += dz/d*p; I.pos.x -= dx/d*p; I.pos.z -= dz/d*p; }
  }
}
function pular(L){
  if (L.noAr || !L.vivo || L.desmaio || !livre(L)) return;
  L.noAr = true; L.vy = VEL_PULO; SOM.pulo(); poeira(L.pos.x, L.pos.z, 6);
}
function esquivar(L, dx, dz){
  if (L.esqCd > 0 || !L.vivo || L.esquiva || !livre(L)) return;
  const d = Math.hypot(dx, dz);
  if (d < .1) { const f = frenteDe(L); dx = -f.x; dz = -f.z; } else { dx /= d; dz /= d; }
  L.combo = null; L.ataque = null; L.carga = 0;
  L.esqInicio = JOGO.tempo; L.esqCd = .8;
  if (L.p.teleporte) {        // fantasmas e psíquicos: a esquiva é um teletransporte
    L.esquiva = { t: .12, dx: 0, dz: 0 }; L.inv = Math.max(L.inv, .4);
    teleportar(L, L.pos.clone().add(new THREE.Vector3(dx*4.5, 0, dz*4.5)), inimigoDe(L));
    return;
  }
  L.esquiva = { t: .22, dx, dz }; L.inv = Math.max(L.inv, .3); SOM.esquiva();
  // rastro
  soltar('normal', L.pos.x, L.altura*.5, L.pos.z, 8, 1.5, .3, .35);
}

/* ----- Golpes ----- */
function podeAtacar(L){ return L.vivo && L.emCampo && !L.desmaio && !(L.ataque && L.ataque.t < .55) && !L.dash && !L.esquiva && L.surgir >= 1 && (L.assistindo || livre(L)) && !L.guardando && !L.combo && !L.carga; }

// Visual padrão de cada tipo (pode ser trocado no golpe com {visual:'...'} em dados.js)
const VISUAL_PROJETIL = { grass:'folhas', rock:'rocha3d', ground:'pedra', flying:'corte', ice:'gelo', fairy:'orbe' };
const VISUAL_RAIO = { fire:'jato', poison:'jato' };                                   // lança-chamas em vez de feixe
const VISUAL_AREA = { water:'parede', fire:'parede', ground:'fissura', rock:'fissura', electric:'descarga', ice:'redemoinho', grass:'redemoinho', flying:'redemoinho' };
const VISUAL_CHUVA = { rock:'espinhos', ice:'espinhos' };
const VISUAL_INVESTIDA = { dark:'mordida', fighting:'punho', dragon:'garra', bug:'corte', steel:'corte', grass:'corte', flying:'corte', ghost:'garra' };

// alvo = ponto (Vector3) para onde mirar
function usarGolpe(L, i, alvo){
  if (!podeAtacar(L) || L.cds[i] > 0) return false;
  const g = L.p.golpes[i];
  L.cds[i] = g.recarga*(JOGO.regras.caos ? .35 : 1);
  const dir = alvo.clone().sub(L.pos).setY(0); const dist = dir.length(); if (dist > .01) dir.divideScalar(dist); else dir.copy(frenteDe(L));
  L.rumo = Math.atan2(dir.x, dir.z); L.travaRumo = .5;
  L.ataque = { t: 0, dur: .55, jeito: g.jeito };
  const e = estilo(g.tipo);
  const origem = centroDe(L).addScaledVector(dir, L.raio*.9);
  if (L.mega) golpeMega(L, g, origem);      // Mega: aura na cor da Mega a cada golpe (mega.js)
  // golpe com coreografia própria (golpes-especiais.js)?
  if (ASSINATURAS[g.nome] && ASSINATURAS[g.nome](L, g, alvo, dir)) { L.en = Math.min(100, L.en + 2); return true; }
  if (g.jeito !== 'buff' && g.jeito !== 'chuva') cargaGolpe(L, g.tipo, g.jeito === 'raio' ? .25 : .2);

  switch (g.jeito) {
    case 'projetil': {
      L.ataque.dur = .55;
      const atraso = .2;       // preparação: o golpe sai no meio do movimento de "arremesso"
      depois(atraso, () => {
        if (!L.vivo || !L.emCampo) return;
        SOM.tiro();
        const o = centroDe(L).addScaledVector(dir, L.raio*.9);
        flash('brilho', e.c1, o.x, o.y, o.z, 1.4, .18, 0, .6); soltar(g.tipo, o.x, o.y, o.z, 6, 3, .35, .3);
        const qtd = g.qtd || 1, abre = g.abertura ?? .22;
        for (let k = 0; k < qtd; k++) {
          const ang = (k - (qtd - 1)/2)*abre, c = Math.cos(ang), s = Math.sin(ang);
          const d = new THREE.Vector3(dir.x*c + dir.z*s, 0, -dir.x*s + dir.z*c);
          const alvoY = alvo.y || 0; d.y = THREE.MathUtils.clamp((alvoY - o.y)/Math.max(1, dist), -.4, .4); d.normalize();
          criarProjetil(L, g, o.clone(), d, g.vel || 24, g.tam || .4, { mult: 1/Math.sqrt(qtd) });
        }
      });
      break; }
    case 'raio': {
      L.ataque.dur = .8; SOM.carga();
      // carga: partículas sendo "puxadas" para a boca
      for (let k = 0; k < 22; k++) {
        const v = new THREE.Vector3(rnd(-1, 1), rnd(-1, 1), rnd(-1, 1)).normalize().multiplyScalar(rnd(1.2, 2));
        part(escolher(e.rastro), { x: origem.x + v.x, y: origem.y + v.y, z: origem.z + v.z, vx: -v.x*4.5, vy: -v.y*4.5, vz: -v.z*4.5, cor: e.c1, tam: .3, vida: .24, atrito: 0, brilhar: true, tingir: true });
      }
      const bola = spriteFx('brilho', e.c1, .2); bola.position.copy(origem);
      efeito(bola, .25, (ef, k) => { bola.position.copy(centroDe(L).addScaledVector(dir, L.raio*.9)); bola.scale.setScalar(.2 + k*1.8); });
      depois(.25, () => {
        if (!L.vivo || !L.emCampo) return;
        const o = centroDe(L).addScaledVector(dir, L.raio*.9);
        if ((g.visual || VISUAL_RAIO[g.tipo]) === 'jato') {
          // jato contínuo: acerta 3 vezes enquanto sai
          L.ataque.dur = 1; jato(L, g, dir, .6); SOM.raio();
          for (let k = 0; k < 3; k++) depois(k*.18, () => { if (L.emCampo) tracarRaio(L, centroDe(L).addScaledVector(frenteDe(L), L.raio*.9), frenteDe(L), 11, g, .4); });
          return;
        }
        const fim = tracarRaio(L, o, dir, 17, g, 1);
        feixe(g.tipo, o, fim, (g.largura || .65)*(L.mega ? 1.4 : 1), .5); SOM.raio(); tremer(.15);
        clarao(e.c1, o.x, o.y, o.z, 5, 9, .4);
      });
      break; }
    case 'area': {
      L.ataque.dur = .75;
      depois(.22, () => {                 // pula e bate no chão
        if (!L.vivo || !L.emCampo) return;
        SOM.area(); tremer(.35);
        const raio = g.raio || 5.5, v = g.visual || VISUAL_AREA[g.tipo];
        if (v === 'redemoinho') {          // gira em volta e acerta 3 vezes
          redemoinho(L, g, raio*.75, .9); onda(L.pos.x, L.pos.z, raio, e.c1, .5);
          for (let k = 0; k < 3; k++) depois(k*.28, () => { if (L.emCampo) acertarArea(L, L.pos.x, L.pos.z, raio, g, .4); });
          return;
        }
        ondaDeArea(L, g, L.pos.x, L.pos.z, raio);
        if (v === 'parede') parede(L.pos.x, L.pos.z, raio, g);
        if (v === 'fissura') { rachaduras(L.pos.x, L.pos.z, raio*1.1); pedacos(L.pos.x, .3, L.pos.z, 14, g.tipo === 'rock' ? 'rock' : 'ground', 8, .28); tremer(.4); }
        if (v === 'descarga') descarga(L, raio, e.c1);
        acertarArea(L, L.pos.x, L.pos.z, raio, g, 1);
      });
      break; }
    case 'investida': {
      L.ataque.dur = .6; auraCorpo(L, g.tipo, .18, 2);
      depois(.15, () => { if (!L.emCampo || !L.vivo || L.atordoado) return; SOM.investida();
        L.dash = { t: .3, dx: dir.x, dz: dir.z, v: 24, g, acertou: false }; L.inv = Math.max(L.inv, .15); });
      onda(L.pos.x, L.pos.z, L.altura*1.2, e.c1, .3);
      break; }
    case 'chuva': {
      L.ataque.dur = .7;
      const alcance = 17, p = alvo.clone().setY(0);
      const dd = p.clone().sub(L.pos).setY(0); if (dd.length() > alcance) p.copy(L.pos).addScaledVector(dd.normalize(), alcance);
      const raio = g.raio || 3;
      marcaAlvo(p.x, p.z, raio, e.c1, .7);
      // o Pokémon "lança" a energia para o céu
      const o = centroDe(L).setY(L.altura + .3);
      for (let k = 0; k < 14; k++) part(escolher(e.rastro), { x: o.x, y: o.y, z: o.z, vx: rnd(-1, 1), vy: rnd(8, 14), vz: rnd(-1, 1), cor: e.c1, tam: .45, vida: .5, atrito: .5, tingir: true });
      pilar(L.pos.x, L.pos.z, .7, e.c1, .5, 10);
      depois(.7, () => cairDoCeu(L, g, p, raio, 1));
      break; }
    case 'buff': {
      SOM.buff(); L.buffT = 7; L.ataque.dur = .9;
      const run = decalque('runa', e.c1, 2.2); run.position.set(L.pos.x, .08, L.pos.z);
      efeito(run, 1, (ef, k) => { run.rotation.z += .06; run.material.opacity = 1 - k; run.scale.setScalar(2.2 + k*.8); });
      pilar(L.pos.x, L.pos.z, 1.3, e.c1, .9, L.altura*2.2);
      for (let k = 0; k < 36; k++) part(escolher(['faisca','brilho', ...e.rastro]), { x: L.pos.x + rnd(-1, 1), y: rnd(0, .5), z: L.pos.z + rnd(-1, 1), vx: 0, vy: rnd(2, 5), vz: 0, cor: e.c1, tam: rnd(.25, .5), vida: rnd(.6, 1.1), atrito: .5, tingir: true });
      for (let k = 0; k < 3; k++) setTimeout(() => flash('shine', 0xffffff, L.pos.x + rnd(-.8, .8), rnd(.5, L.altura), L.pos.z + rnd(-.8, .8), 1.2, .4), k*120);
      numeroDano(g.nome === 'Agility' ? 'VELOCIDADE ↑' : 'ATAQUE ↑', centroDe(L).setY(L.altura + .6), 'buff');
      break; }
  }
  L.en = Math.min(100, L.en + 2);
  return true;
}

// Onda de um golpe de área: anel no chão + bolha de energia + o elemento sendo espalhado pela frente da onda
function ondaDeArea(L, g, x, z, raio){
  const e = estilo(g.tipo);
  onda(x, z, raio, e.c1, .55); onda(x, z, raio*.75, e.c2, .45);
  const domo = new THREE.Mesh(GEO.esfera, matBrilho(e.c1)); domo.position.set(x, 0, z);
  efeito(domo, .45, (ef, k) => { domo.scale.set(raio*k, raio*k*.5, raio*k); domo.material.opacity = .18*(1 - k); });
  flash('brilho', e.c1, x, 1, z, raio*1.3, .3, 0, .4); clarao(e.c1, x, 1, z, 8, raio*3, .45);
  const terra = g.tipo === 'ground' || g.tipo === 'rock';
  const frente = new THREE.Object3D();
  efeito(frente, .5, (ef, k) => {
    const r = raio*Math.sqrt(k), n = terra ? 6 : 14;
    for (let i = 0; i < n; i++) {
      const a = Math.random()*Math.PI*2, cel = escolher(e.rastro);
      part(cel, { x: x + Math.cos(a)*r, y: .2, z: z + Math.sin(a)*r, vx: Math.cos(a)*2, vy: terra ? rnd(5, 9) : rnd(1.5, 4), vz: Math.sin(a)*2,
        cor: Math.random() < .6 ? e.c1 : e.c2, tam: rnd(.4, .8), vida: rnd(.4, .7), grav: terra || g.tipo === 'water' ? 14 : 0, atrito: 1, cresce: .8, vrot: rnd(-6, 6), escura: g.tipo === 'ghost' || g.tipo === 'dark' });
    }
    if (terra && Math.random() < .5) poeira(x + rnd(-r, r), z + rnd(-r, r), 2, 0xb59a6a);
  });
  if (terra) { marcaChao(x, z, raio*.8, 5); tremer(.4); }
  if (g.visual === 'som') for (let k = 0; k < 4; k++) setTimeout(() => { flash('anel', e.c1, x, 1, z, raio*(.6 + k*.35), .35); for (let i = 0; i < 4; i++) part('nota', { x: x + rnd(-1, 1), y: 1.5, z: z + rnd(-1, 1), vx: rnd(-6, 6), vy: rnd(1, 3), vz: rnd(-6, 6), cor: e.c1, tam: .6, vida: .8, atrito: 1.5, tingir: true }); }, k*90);
}

// golpe que cai do céu — cada tipo cai de um jeito
function cairDoCeu(L, g, p, raio, mult){
  const e = estilo(g.tipo);
  const bater = () => { explosao(g.tipo, p.x, .6, p.z, raio); SOM.explosao(); tremer(.3); acertarArea(L, p.x, p.z, raio, g, mult);
    if (g.tipo === 'fire') estrelaDeFogo(p.x, p.z, raio*1.3);
    if (g.tipo === 'rock' || g.tipo === 'ground') pedacos(p.x, .5, p.z, 10, g.tipo, 7, .25); };
  if ((g.visual || VISUAL_CHUVA[g.tipo]) === 'espinhos') {
    espinhos(p.x, p.z, raio, g.tipo === 'ice' ? 'ice' : 'rock', 9); explosao(g.tipo, p.x, .4, p.z, raio*.7);
    SOM.explosao(); tremer(.35); acertarArea(L, p.x, p.z, raio, g, mult); return;
  }
  switch (g.tipo) {
    case 'electric': relampago(p.x, p.z, e.c1); bater(); return;
    case 'psychic': case 'fairy': case 'normal':
      pilar(p.x, p.z, raio*.8, e.c1, .5, 25); for (let k = 0; k < 3; k++) setTimeout(() => flash('anel', e.c1, p.x, .5 + k, p.z, raio*1.5, .3), k*60); bater(); return;
    case 'ghost': case 'dark': {
      // sombra que sobe do chão
      pilar(p.x, p.z, raio*.7, e.c1, .6, 8);
      for (let k = 0; k < 30; k++) FUMACA.add({ x: p.x + rnd(-raio, raio)*.6, y: .2, z: p.z + rnd(-raio, raio)*.6, vx: 0, vy: rnd(3, 7), vz: 0, cor: 0x24103a, tam: rnd(.8, 1.4), vida: .8, cel: 'fumaca0', cresce: 1, atrito: 1 });
      bater(); return; }
    case 'water': case 'grass': case 'flying': {
      // gêiser / tornado subindo do chão
      const giro = new THREE.Object3D();
      efeito(giro, .5, (ef, k) => {
        for (let i = 0; i < 6; i++) { const a = ef.t*14 + i, r = raio*.5*(1 - k*.4);
          part(escolher(e.rastro), { x: p.x + Math.cos(a)*r, y: rnd(0, 6)*k + .3, z: p.z + Math.sin(a)*r, vx: -Math.sin(a)*6, vy: rnd(4, 9), vz: Math.cos(a)*6, cor: e.c1, tam: .5, vida: .5, atrito: 1, vrot: 8, tingir: g.tipo !== 'grass' }); }
      });
      pilar(p.x, p.z, raio*.5, e.c1, .5, 10);
      bater(); return; }
    case 'ice': {
      for (let k = 0; k < 7; k++) {
        const q = p.clone().add(new THREE.Vector3(rnd(-raio, raio)*.7, 0, rnd(-raio, raio)*.7)), s = spriteFx('icicle', 0xffffff, 1.4, false); s.material.rotation = Math.PI*.75;
        efeito(s, .3 + k*.04, (ef, kk) => { s.position.set(q.x, 14*(1 - kk) + .5, q.z); if (kk >= 1) explosao('ice', q.x, .3, q.z, 1); });
      }
      setTimeout(bater, 380); return; }
  }
  // meteoro (fogo, dragão, pedra, terra, veneno...)
  const pedra = g.tipo === 'rock' || g.tipo === 'ground';
  const bola = spriteFx(pedra ? 'rock1' : e.orbe, e.c1, raio*1.1, !pedra && !SPRITES_COLORIDOS.has(e.orbe) ? true : !pedra);
  const halo = spriteFx('brilho', e.c1, raio*2.2);
  const grupo = new THREE.Group(); grupo.add(halo); grupo.add(bola);
  efeito(grupo, .36, (ef, k) => {
    grupo.position.set(p.x + 5*(1 - k), 18*(1 - k) + .6, p.z - 5*(1 - k)); bola.material.rotation += .2;
    for (let i = 0; i < 3; i++) part(escolher(e.rastro), { x: grupo.position.x + rnd(-.4, .4), y: grupo.position.y, z: grupo.position.z + rnd(-.4, .4), vx: rnd(-1, 1), vy: rnd(1, 3), vz: rnd(-1, 1), cor: e.c1, tam: .7, vida: .45, cresce: 1.2, tingir: !pedra });
    if (k >= 1) bater();
  });
}

const _proj = new THREE.Vector3(), _proj2 = new THREE.Vector3();
function anguloNaTela(pos, vel){
  _proj.copy(pos).project(camera); _proj2.copy(pos).add(vel).project(camera);
  return Math.atan2((_proj2.y - _proj.y)*innerHeight, (_proj2.x - _proj.x)*innerWidth);
}
// Monta o "corpo" visual de um projétil
function visualProjetil(g, raio){
  const e = estilo(g.tipo), v = g.visual || VISUAL_PROJETIL[g.tipo] || 'orbe', grupo = new THREE.Group(), partes = [];
  const add = (s, o = {}) => { grupo.add(s); partes.push(Object.assign({ s, giro: 0, orbita: 0, fase: 0, orienta: null }, o)); return s; };
  // V13: núcleo de energia feito por shader (fogo que ferve, plasma, água, fumaça...) no lugar da "bola colorida"
  const nucleo = k => { const m = nucleoEnergia(g.tipo, Math.max(.32, raio*1.12)*k); grupo.add(m); partes.push({ s: m, nucleo: true }); return m; };
  const halo = add(spriteFx('brilho', e.c1, raio*4.4, false), { pulsa: .55 });     // auréola colorida (sem somar luz)
  const miolo = add(spriteFx('brilho', e.c2, raio*2.2), { pulsa: .35 });           // um pouco de brilho no centro
  switch (v) {
    case 'folhas': nucleo(.6); for (let k = 0; k < 3; k++) add(spriteFx(k % 2 ? 'leaf1' : 'leaf2', 0xffffff, raio*2.2, false), { orbita: raio*1.1, fase: k*2.09, giro: 9 }); break;
    case 'estrelas': nucleo(.5); for (let k = 0; k < 3; k++) add(spriteFx('estrela', 0xffd84a, raio*2.2, false), { orbita: raio, fase: k*2.09, giro: 6 }); break;
    case 'pedra': add(spriteFx(escolher(['rock1','rock2','rock3']), 0xffffff, raio*3.2, false), { giro: 6 }); break;
    case 'shuriken': add(spriteFx('shuriken', e.c1, raio*3.6, false), { giro: 25 }); add(spriteFx('shuriken', e.c2, raio*2.2, false), { giro: 25 }); break;
    case 'punho': add(spriteFx('fist', 0xffffff, raio*3.2, false), { orienta: Math.PI }); break;
    case 'corte': add(spriteFx('corte', e.c1, raio*4.4, false), { orienta: -Math.PI/2 }); add(spriteFx('corte', e.c2, raio*3), { orienta: -Math.PI/2 }); break;
    case 'gelo': nucleo(.75); add(spriteFx('icicle', 0xffffff, raio*3.2, false), { orienta: -Math.PI/4 }); add(spriteFx('estilhaco', e.c1, raio*2.5), { orienta: -Math.PI/2 }); break;
    case 'agulhas': for (let k = 0; k < 3; k++) add(spriteFx('estilhaco', e.c1, raio*2), { orbita: raio*.7, fase: k*2.09, orienta: -Math.PI/2 }); break;
    case 'osso': add(spriteFx('bone', 0xffffff, raio*3, false), { giro: 14 }); break;
    case 'rocha3d': {
      const m = new THREE.Mesh(GEO_ROCHA, new THREE.MeshStandardMaterial({ color: COR_ROCHA[g.tipo] || 0x8a7350, roughness: .95, flatShading: true }));
      m.scale.setScalar(raio*1.3); m.castShadow = true; grupo.add(m); partes.push({ s: m, malha: true });
      grupo.children[0].material.opacity = .25; break; }
    case 'lua': nucleo(.6); add(spriteFx('moon', 0xffffff, raio*2.8), { giro: 2 }); break;
    default: {
      nucleo(1);
      add(spriteFx('espiral', e.c2, raio*2.6), { giro: -8 });
      // Concentração de energia: símbolo elemental + partículas ao redor em vez de uma esfera lisa.
      if (QUAL.particulas > .5) {
        const selo = ['psychic','ghost','dragon','dark','fairy'].includes(g.tipo) ? 'runa'
          : ['electric','steel'].includes(g.tipo) ? 'raio0'
          : ['fire','poison'].includes(g.tipo) ? 'chama1'
          : ['water','ice'].includes(g.tipo) ? 'bolha' : 'anel';
        add(spriteFx(selo, e.c2, raio*3.3, !SPRITES_COLORIDOS.has(selo)), { giro: g.tipo === 'electric' ? 11 : -3 });
      }
      if (!DISPOSITIVO_MOVEL && QUAL.particulas >= .8) {
        for (let k = 0; k < 2; k++) add(spriteFx(g.tipo === 'electric' ? 'faisca' : 'estrela', e.c2, raio*1.2), { orbita: raio*1.45, fase: k*Math.PI, giro: 8 });
      }
    }
  }
  // com núcleo de shader, o brilho branco do centro fica fraco (senão apaga as cores do núcleo)
  if (partes.some(pt => pt.nucleo)) { const pm = partes.find(pt => pt.s === miolo); pm.pulsa = .12; }
  return { grupo, partes };
}
function criarProjetil(L, g, pos, dir, vel, raio, opcoes = {}){
  if (L && L.mega && !opcoes.ult) raio *= 1.3;      // Mega: projéteis maiores e com brilho
  const vis = visualProjetil(g, raio);
  vis.grupo.position.copy(pos); cena.add(vis.grupo);
  const fita = QUAL.particulas > .45 ? new FitaVFX(g.tipo, Math.max(.3, raio*(opcoes.ult ? 1.6 : 1.35)), QUAL.particulas > .7 ? 22 : 14) : null;
  if (fita) fita.empurrar(pos);
  JOGO.projeteis.push({ fita, dono: L, g, pos: pos.clone(), vel: dir.clone().multiplyScalar(vel), raio, vida: opcoes.vida || 1.1, mesh: vis.grupo, partes: vis.partes,
    mult: opcoes.mult || 1, atravessa: !!opcoes.atravessa, acertados: new Set(), t: 0, ult: !!opcoes.ult, ondas: !!opcoes.ondas, sombra: !!opcoes.sombra, mega: !!(L && L.mega) });
}
function atualizarProjeteis(dt){
  for (let i = JOGO.projeteis.length - 1; i >= 0; i--) {
    const P = JOGO.projeteis[i], e = estilo(P.g.tipo);
    if (P.ult) {           // a Ultimate persegue um pouco o alvo
      const A = inimigoDe(P.dono);
      if (A && A.vivo) { const d = new THREE.Vector3(A.pos.x, A.y + A.altura*.5, A.pos.z).sub(P.pos).normalize().multiplyScalar(P.vel.length()); P.vel.lerp(d, Math.min(1, dt*2.5)); }
      auraProjetil(P, 2);
    }
    if (P.mega && !P.ult && Math.random() < .5) auraProjetil(P, 1);
    if (P.ondas && Math.random() < .25) flash('anel', estilo(P.g.tipo).c1, P.pos.x, P.pos.y, P.pos.z, 1.6, .25);
    if (P.sombra) for (let k = 0; k < 2; k++) FUMACA.add({ x: P.pos.x + rnd(-.3, .3), y: P.pos.y + rnd(-.3, .3), z: P.pos.z + rnd(-.3, .3), vx: 0, vy: rnd(0, 1), vz: 0, cor: 0x2a1240, tam: .9, vida: .5, cel: 'fumaca0', cresce: 1.2 });
    P.vida -= dt; P.t += dt; P.pos.addScaledVector(P.vel, dt); P.mesh.position.copy(P.pos);
    if (P.fita) P.fita.empurrar(P.pos);
    if (P.g.tipo === 'electric' && Math.random() < .55*QUAL.particulas) {      // arcos elétricos saindo da bola
      const d = new THREE.Vector3(rnd(-1, 1), rnd(-1, 1), rnd(-1, 1)).normalize().multiplyScalar(P.raio*rnd(1.6, 2.6));
      arcoEletrico(P.pos, P.pos.clone().add(d), .08 + P.raio*.08, .08, P.raio*.4);
    }
    const ang = anguloNaTela(P.pos, P.vel);
    for (const pt of P.partes) {
      if (pt.nucleo) { pt.s.rotation.y += 2.4*dt; pt.s.rotation.x += 1.1*dt; pt.s.scale.setScalar(pt.s.scale.x*(1 + Math.sin(P.t*24)*.004)); continue; }
      if (pt.malha) { pt.s.rotation.x += 7*dt; pt.s.rotation.y += 5*dt; continue; }
      if (pt.orbita) { const a = P.t*10 + pt.fase; pt.s.position.set(Math.cos(a)*pt.orbita, Math.sin(a)*pt.orbita*.6, Math.sin(a)*pt.orbita); }
      if (pt.giro) pt.s.material.rotation += pt.giro*dt;
      if (pt.orienta !== null) pt.s.material.rotation = ang + pt.orienta;
      if (pt.pulsa) pt.s.material.opacity = pt.pulsa*(1 + Math.sin(P.t*30)*.25);
    }
    // Trilha helicoidal: elemento em movimento; usa o mesmo lote de partículas da GPU.
    if (P.t - (P._ultimoDetalhe || 0) >= (DISPOSITIVO_MOVEL ? .105 : .065)) {
      P._ultimoDetalhe = P.t;
      const ang = P.t * 19, dist = P.raio * (1.15 + Math.sin(P.t*11)*.15);
      for (let j = 0; j < (QUAL.particulas > .7 ? 3 : 2); j++) {
        const a = ang + j*Math.PI*2/3, s = Math.sin(a), c = Math.cos(a);
        part(P.g.tipo === 'electric' ? 'faisca' : P.g.tipo === 'fire' ? 'chama1' : P.g.tipo === 'water' ? 'gota' : P.g.tipo === 'ice' ? 'estilhaco' : P.g.tipo === 'grass' ? 'leaf1' : 'brilho', {
          x: P.pos.x + c*dist, y: P.pos.y + s*dist, z: P.pos.z + Math.sin(a*1.4)*dist*.75,
          vx: -P.vel.x*.1, vy: s, vz: -P.vel.z*.1, cor: j % 2 ? e.c1 : e.c2,
          tam: P.raio*.75, vida: .28, atrito: .8, cresce: .35, tingir: true, brilhar: P.g.tipo !== 'grass'
        });
      }
    }
    // rastro
    const n = Math.max(1, Math.round((P.raio > .8 ? 5 : 2) * QUAL.particulas));
    for (let k = 0; k < n; k++) {
      const cel = escolher(e.rastro);
      part(cel, { x: P.pos.x + rnd(-.15, .15), y: P.pos.y + rnd(-.15, .15), z: P.pos.z + rnd(-.15, .15), vx: -P.vel.x*.08 + rnd(-.6, .6), vy: rnd(-.3, .8) + (P.g.tipo === 'fire' ? 1.5 : 0), vz: -P.vel.z*.08 + rnd(-.6, .6),
        cor: Math.random() < .6 ? e.c1 : e.c2, tam: P.raio*rnd(1.2, 2.2)*(SPRITES_COLORIDOS.has(cel) ? .8 : 1), vida: rnd(.25, .45), atrito: 2, cresce: cel.startsWith('chama') || cel.startsWith('fumaca') ? 1.3 : .2, vrot: rnd(-6, 6),
        grav: P.g.tipo === 'water' ? 6 : 0, escura: P.g.tipo === 'ghost' || P.g.tipo === 'dark' });
    }
    let bateu = P.vida <= 0 || P.pos.y < 0 || Math.hypot(P.pos.x, P.pos.z) > RAIO_ARENA + 1;
    if (!bateu) for (const o of ARENA.obstaculos) {
      if (o.vivo && P.pos.y < o.altura && Math.hypot(P.pos.x - o.x, P.pos.z - o.z) < o.raio + P.raio*.6) { danificarObstaculo(o, P.g.poder*P.mult); bateu = true; break; }
    }
    const A = inimigoDe(P.dono);
    if (!bateu && A && A.emCampo && A.vivo && !P.acertados.has(A)) {
      const dy = P.pos.y - (A.y + A.altura*.5);
      if (Math.hypot(P.pos.x - A.pos.x, P.pos.z - A.pos.z) < A.raio + P.raio && Math.abs(dy) < A.altura*.6 + P.raio) {
        P.acertados.add(A);
        if (P.ult) acertouUlt(P.dono, A);
        else aplicarDano(P.dono, A, P.g.poder*P.mult, P.g.tipo, P.g.nome, P.vel);
        if (!P.atravessa) bateu = true;
      }
    }
    if (bateu) {
      explosao(P.g.tipo, P.pos.x, Math.max(.3, P.pos.y), P.pos.z, P.raio*2.6);
      impactoVFX(P.g.tipo, P.pos.x, Math.max(.3, P.pos.y), P.pos.z, Math.max(.6, P.raio*1.7), P.vel);
      if (P.fita) { soltarFita(P.fita, .22); P.fita = null; }
      if (QUAL.particulas > .55) {
        flash('anel', e.c2, P.pos.x, P.pos.y, P.pos.z, P.raio*5, .27);
        if (P.raio > .5) flash(['electric','dragon'].includes(P.g.tipo) ? 'raio0' : 'corte', e.c1, P.pos.x, P.pos.y, P.pos.z, P.raio*4, .20);
      }
      if (P.sombra) { for (let k = 0; k < 30; k++) FUMACA.add({ x: P.pos.x, y: P.pos.y, z: P.pos.z, vx: rnd(-6, 6), vy: rnd(-1, 5), vz: rnd(-6, 6), cor: 0x2a1240, tam: 1.4, vida: .9, cel: 'fumaca0', cresce: 1.4, atrito: 2.5 });
        const d = new THREE.Mesh(GEO.esfera, matBrilho(0x8a52d6)); d.position.copy(P.pos); efeito(d, .45, (ef, k) => { d.scale.setScalar(.3 + k*3.5); d.material.opacity = .45*(1 - k); }); ondaDeChoque(P.pos, .7); }
      if (P.ondas) { for (let k = 0; k < 3; k++) setTimeout(() => flash('anel', estilo(P.g.tipo).c1, P.pos.x, P.pos.y, P.pos.z, 3 + k*2, .35), k*80); ondaDeChoque(P.pos, .6); }
      if (P.partes.some(pt => pt.malha)) pedacos(P.pos.x, Math.max(.3, P.pos.y), P.pos.z, 8, P.g.tipo, 5, P.raio*.45);
      if (P.raio > .8) { SOM.explosao(); tremer(.4); acertarArea(P.dono, P.pos.x, P.pos.z, P.raio*3, P.g, P.mult*.5); }
      cena.remove(P.mesh); P.mesh.traverse(o => o.material && o.material.dispose());
      JOGO.projeteis.splice(i, 1);
    }
  }
}
// Efeito do golpe corpo a corpo quando acerta (mordida, corte, garra, soco)
function efeitoContato(g, pos, dir){
  const e = estilo(g.tipo), v = g.visual || VISUAL_INVESTIDA[g.tipo] || 'impacto';
  const x = pos.x, y = pos.y, z = pos.z;
  switch (v) {
    case 'mordida': {
      const cima = spriteFx('topbite', 0xffffff, 2.2, false), baixo = spriteFx('bottombite', 0xffffff, 2.2, false);
      const g2 = new THREE.Group(); g2.add(cima); g2.add(baixo); g2.position.set(x, y, z);
      efeito(g2, .32, (ef, k) => { const f = k < .4 ? 1 - k/.4 : 0; cima.position.y = .2 + f*.9; baixo.position.y = -.2 - f*.9; cima.material.opacity = baixo.material.opacity = k > .7 ? (1 - k)/.3 : 1; });
      break; }
    case 'corte': case 'garra': {
      const nome = v === 'garra' ? 'leftclaw' : 'leftslash';
      for (let k = 0; k < 2; k++) { const s = spriteFx(nome, 0xffffff, 2.4, false); s.material.rotation = k ? -.6 : .6; s.position.set(x, y, z);
        efeito(s, .3, (ef, kk) => { s.scale.setScalar(2.4*(.6 + kk*.6)); s.material.opacity = 1 - kk; }); }
      flash('corte', e.c1, x, y, z, 2.6, .25);
      break; }
    case 'punho':
      for (let k = 0; k < 3; k++) setTimeout(() => { const s = spriteFx('fist', 0xffffff, 1.5, false); s.position.set(x + rnd(-.5, .5), y + rnd(-.4, .4), z + rnd(-.5, .5));
        efeito(s, .2, (ef, kk) => { s.scale.setScalar(1.2 + kk*1.2); s.material.opacity = 1 - kk; }); flash('faisca', e.c1, s.position.x, s.position.y, s.position.z, 1.8, .15); }, k*70);
      break;
  }
  explosao(g.tipo, x, y, z, 1.4);
}
// Raio: acerta o primeiro alvo/obstáculo na linha. Devolve o ponto final.
function tracarRaio(L, o, dir, alcance, g, mult){
  let fim = alcance, alvo = null, obst = null;
  const A = inimigoDe(L);
  const perto = (px, pz) => { const vx = px - o.x, vz = pz - o.z, t = vx*dir.x + vz*dir.z; if (t < 0) return null; return { t, d: Math.hypot(vx - dir.x*t, vz - dir.z*t) }; };
  for (const ob of ARENA.obstaculos) { if (!ob.vivo) continue; const r = perto(ob.x, ob.z); if (r && r.d < ob.raio && r.t < fim) { fim = r.t; obst = ob; } }
  if (A && A.emCampo && A.vivo) { const r = perto(A.pos.x, A.pos.z); if (r && r.d < A.raio + .6 && r.t < fim + A.raio) { fim = Math.min(fim, r.t); alvo = A; obst = null; } }
  const ponto = o.clone().addScaledVector(dir, fim);
  if (alvo) { ponto.y = alvo.y + alvo.altura*.5; aplicarDano(L, alvo, g.poder*mult, g.tipo, g.nome, dir); }
  if (obst) danificarObstaculo(obst, g.poder*mult);
  explosao(g.tipo, ponto.x, ponto.y, ponto.z, 1.3);
  return ponto;
}
function acertarArea(L, x, z, raio, g, mult){
  if (!L) return;
  const A = inimigoDe(L);
  if (A && A.emCampo && A.vivo && Math.hypot(A.pos.x - x, A.pos.z - z) < raio + A.raio && A.y < 3) {
    aplicarDano(L, A, g.poder*mult, g.tipo, g.nome, new THREE.Vector3(A.pos.x - x, 0, A.pos.z - z));
  }
  for (const o of ARENA.obstaculos) if (o.vivo && Math.hypot(o.x - x, o.z - z) < raio + o.raio) danificarObstaculo(o, g.poder*mult*.6);
}
function danificarObstaculo(o, poder){
  if (!o.quebravel || !o.vivo) return;
  o.hp -= poder;
  o.mesh.position.x = o.x + rnd(-.1, .1);
  setTimeout(() => o.mesh.position.x = o.x, 60);
  if (o.hp <= 0) {
    o.vivo = false; o.mesh.parent && o.mesh.parent.remove(o.mesh);
    const lasca = ARENA.id === 'gelo' ? 'estilhaco' : ARENA.id === 'vulcao' ? 'rock2' : 'rock3';
    for (let i = 0; i < 26; i++) part(i % 2 ? lasca : 'brilho', { x: o.x, y: rnd(.3, 2), z: o.z, vx: rnd(-5, 5), vy: rnd(2, 7), vz: rnd(-5, 5), cor: o.cor, tam: rnd(.3, .6), vida: rnd(.6, 1.1), grav: 14, atrito: .5, normal: true, tingir: true, vrot: rnd(-8, 8) });
    poeira(o.x, o.z, 14); SOM.explosao(); tremer(.2);
  }
}

/* ----- Dano -----
   op (opcional): hitstun (s atordoado), final ('lancar' | 'arremessar' | 'derrubar'), quebraGuarda, combo, ult */
function aplicarDano(atac, alvo, poder, tipo, nome, empurrao, op = {}){
  if (!alvo.vivo || alvo.assistindo || JOGO.fim) return -1;
  if (alvo.caido > 0 && !op.ult) return -1;                               // não bate em quem está no chão
  if (atac && alvo.esquiva && JOGO.tempo - alvo.esqInicio < COMBATE.janelaEsquiva && !op.ult) { esquivaPerfeita(alvo, atac); return -1; }
  if (alvo.inv > 0 && !op.ult) return -1;
  if (atac && alvo.escudo && !op.ult) { quebrarEscudo(alvo); return -1; }    // item Escudo
  if (JOGO.regras.treino && alvo.time === 1 && JOGO.treino.invencivel) alvo.hp = alvo.hpMax;
  const ef = tipo ? effectiveness(tipo, alvo.p.tipos) : 1;
  let d;
  if (!atac) d = poder;      // dano do cenário (lava)
  else {
    const stab = tipo && atac.p.tipos.includes(tipo) ? 1.2 : 1, buff = (atac.buffT > 0 ? 1.4 : 1)*(atac.itemAtkT > 0 ? 1.3 : 1);   // itemAtkT: item Ataque X
    const dif = JOGO.controle[atac.time] === 'ia' && JOGO.controle[1 - atac.time] === 'jogador' ? JOGO.dif.dano : 1;
    d = poder*.56*Math.sqrt(atac.atk/alvo.def)*ef*stab*buff*dif*rnd(.92, 1.08);
    // combo longo: cada golpe a mais tira menos (evita combos devastadores)
    if (alvo.comboRecebido > 0) d *= Math.max(.45, 1 - .06*alvo.comboRecebido);
    if (alvo.contraT > 0) d *= .8;
  }
  // ----- guarda -----
  if (atac && alvo.guardando && !op.ult) {
    if (alvo.guardaT < COMBATE.janelaContra*(alvo.p.contraForte ? 1.6 : 1)) { contraAtaque(alvo, atac); return -1; }
    if (op.quebraGuarda) { quebrarGuarda(alvo); d *= .6; }
    else {
      const chip = Math.max(1, Math.round(d*.1));
      alvo.hp = Math.max(1, alvo.hp - chip);
      alvo.guardaHP -= poder*(alvo.p.guardaForte ? .35 : .6);
      bloqueou(alvo, atac, poder);
      atac.en = Math.min(100, atac.en + chip*.2*(JOGO.regras.caos ? 3 : 1));
      if (alvo.guardaHP <= 0) quebrarGuarda(alvo);
      return chip;
    }
  }
  d = Math.max(ef === 0 ? 0 : 1, Math.round(d));
  alvo.hp = Math.max(0, alvo.hp - d);
  contarEstat(atac, d);
  if (JOGO.regras.treino && alvo.time === 1 && JOGO.treino.vidaInfinita) alvo.hp = Math.max(alvo.hp, 1);
  alvo.danoT = .35; alvo.inst.flash = 1;
  alvo.inst.corFlash.setHex(ef > 1 ? 0xffe14a : 0xff4a4a);
  // ----- reação de quem levou o golpe -----
  const final = op.final || (!op.combo && poder >= 95 ? 'arremessar' : null);
  const armadura = alvo.p.armadura && (alvo.combo || alvo.carga || (alvo.ataque && alvo.ataque.t < .8)) && poder < 45 && !final && !op.ult;
  if (atac && !armadura) {
    alvo.combo = null; alvo.ataque = null; alvo.carga = 0; alvo.guardando = false; alvo.dash = null; alvo.perseguir = null; alvo.esquiva = null;
    alvo.atordoado = Math.max(alvo.atordoado, op.hitstun ?? (.28 + Math.min(.45, poder/220)));
    const dir = (empurrao ? empurrao.clone() : new THREE.Vector3(alvo.pos.x - atac.pos.x, 0, alvo.pos.z - atac.pos.z)).setY(0);
    if (dir.lengthSq() > 0) dir.normalize();
    if (final === 'lancar') { alvo.lancado = true; alvo.noAr = true; alvo.vy = 11.5; alvo.vel.set(dir.x*2, 0, dir.z*2); alvo.atordoado = 1.2; }
    else if (final === 'arremessar') { alvo.lancado = true; alvo.noAr = true; alvo.vy = 5.5; alvo.vel.set(dir.x*16, 0, dir.z*16); alvo.atordoado = 1; }
    else if (final === 'derrubar') { alvo.lancado = true; alvo.noAr = alvo.y > .1; alvo.vy = -20; alvo.atordoado = 1; if (!alvo.noAr) { alvo.lancado = false; alvo.caido = .85; alvo.caidoT = 0; } }
    else {
      if (alvo.noAr) { alvo.lancado = true; alvo.vy = Math.max(alvo.vy, 2.5); }
      alvo.vel.addScaledVector(dir, op.combo ? 3 : 6 + poder/25);
    }
    if (final) { tremer(.35); ondaDeChoque(centroDe(alvo), .7); congelar(.08); }
    alvo.comboRecebido++;
    if (alvo.comboRecebido >= COMBATE.maxCombo) quebraDeCombo(alvo, atac);
  }
  if (atac) {
    const h = centroDe(alvo);
    if (!op.combo) { flash('faisca', 0xffffff, h.x, h.y, h.z, ef > 1 ? 3.2 : 2.2, .16); flash('hitmarker', 0xffffff, h.x, h.y, h.z, 1.3, .14); }
    congelar(final ? .08 : ef > 1 ? .06 : op.combo ? .035 : .03);
    // contador de combo e energia da Ultimate
    const dono = atac.assistindo ? lutador(atac.time) : atac;
    dono.comboHits++; dono.comboDano += d; dono.comboT = 1.3;
    const caos = JOGO.regras.caos ? 3 : 1;
    dono.en = Math.min(100, dono.en + d*.32*caos);
    vibrarTime(alvo.time, ef > 1 || final ? .9 : .45, final ? 220 : 110);
  }
  // o cenário reage aos golpes fortes (mapas.js)
  if (atac && (poder >= 40 || final || op.ult) && typeof reagirAmbiente === 'function') reagirAmbiente(alvo.pos.x, alvo.pos.z, Math.min(2, poder/80 + (op.ult ? 1 : 0)), tipo);
  alvo.en = Math.min(100, alvo.en + d*.18*(JOGO.regras.caos ? 3 : 1));
  // texto
  const c = centroDe(alvo).setY(alvo.y + alvo.altura + .3);
  numeroDano(ef === 0 ? 'imune' : '-' + d, c, ef > 1 ? 'super' : ef < 1 ? 'fraco' : '');
  if (ef > 1) { numeroDano('Super efetivo!', c.clone().setY(c.y + .7), 'texto super'); SOM.super(); tremer(.25); }
  else if (ef > 0 && ef < 1) numeroDano('Pouco efetivo', c.clone().setY(c.y + .7), 'texto');
  else if (!op.combo) SOM.acerto();
  if (ARENA.torcida) ARENA.torcida.empolgacao = Math.min(1, ARENA.torcida.empolgacao + d/120);
  // golpes fortes marcam o chão
  if (poder >= 80 && !alvo.noAr) { rachaduras(alvo.pos.x, alvo.pos.z, 1.4 + poder/80); poeira(alvo.pos.x, alvo.pos.z, 10); }
  if (alvo.hp <= 0) desmaiar(alvo);
  return d;
}
function desmaiar(L){
  L.vivo = false; L.desmaio = .001; L.ataque = L.dash = L.esquiva = L.combo = null; L.guardando = false; SOM.desmaio(); tremer(.5);
  FX.lento = Math.max(FX.lento, .6);
  if (ARENA.torcida) ARENA.torcida.empolgacao = 1;
  // V14: era o último do time? → finalização com câmera lenta e "K.O.!"
  const ultimo = !JOGO.fim && !JOGO.finalizando && !JOGO.times[L.time].some(m => m.vivo);
  if (ultimo) finalizacaoKO(L);
  depois(ultimo ? 2.1 : 1.6, () => {
    if (L.silhueta) { L.silhueta = 0; silhuetaFim(L.inst); }
    if (L.emCampo) recolherPokebola(L);
    const t = L.time, prox = JOGO.times[t].findIndex(m => m.vivo);
    if (prox < 0) { fimDeRodada(t === 0 ? 1 : 0); return; }
    JOGO.ativo[t] = prox;
    const pos = L.pos.clone().multiplyScalar(.6);
    colocarEmCampo(lutador(t), pos);
    banner(`${nomeDoTime(t)}: vai, ${lutador(t).p.nome}!`, corDoTime(t));
  });
}

/* ----- Trocar de Pokémon ----- */
function trocarPara(t, i){
  const atual = lutador(t), novo = JOGO.times[t][i];
  if (!novo || novo === atual || !novo.vivo || novo.assistindo || !atual.vivo || !livre(atual) || JOGO.trocaCd[t] > 0 || JOGO.fim) return;
  JOGO.trocaCd[t] = COMBATE.trocaRecarga*(JOGO.regras.caos ? .4 : 1);
  const pos = atual.pos.clone();
  novo.en = Math.max(novo.en, atual.en); atual.en = 0;          // a energia da Ultimate passa para quem entra
  if (atual.silhueta) { atual.silhueta = 0; silhuetaFim(atual.inst); }
  recolherPokebola(atual);                                       // volta para a Pokébola (raio vermelho)
  JOGO.ativo[t] = i; colocarEmCampo(novo, pos); novo.inv = .5;
  banner(`${nomeDoTime(t)}: vai, ${novo.p.nome}!`, corDoTime(t));
}

/* ----- Atualização de um lutador (tempos, animação) ----- */
function atualizarLutador(L, dt){
  for (let i = 0; i < 4; i++) L.cds[i] = Math.max(0, L.cds[i] - dt);
  L.esqCd = Math.max(0, L.esqCd - dt); L.inv = Math.max(0, L.inv - dt); L.buffT = Math.max(0, L.buffT - dt); L.danoT = Math.max(0, L.danoT - dt);
  if (L.surgir < 1) { L.surgir = Math.min(1, L.surgir + dt*2.6); const s = Math.max(0, L.surgir); L.inst.raiz.scale.setScalar(.01 + (1 - Math.pow(1 - s, 3))*.99); }
  // silhueta branca: fica acesa enquanto cresce e depois some (a cor "aparece")
  if (L.silhueta > 0 && L.surgir >= 0) { L.silhueta = Math.max(0, L.silhueta - dt*(L.surgir >= 1 ? 2.4 : .35)); silhueta(L.inst, L.silhueta); if (!L.silhueta) silhuetaFim(L.inst); }
  atualizarMega(L, dt);
  atualizarCombate(L, dt);
  if (L.ataque) { L.ataque.t += dt/L.ataque.dur; if (L.ataque.t >= 1) L.ataque = null; }
  if (L.desmaio) L.desmaio = Math.min(1, L.desmaio + dt*1.5);
  // investida acerta quem estiver na frente
  if (L.dash && L.dash.g && L.dash.g.dragao) auraCorpo(L, 'dragon', .05, 4);
  if (L.dash && !L.dash.acertou) {
    const A = inimigoDe(L);
    if (A && A.vivo && Math.hypot(A.pos.x - L.pos.x, A.pos.z - L.pos.z) < A.raio + L.raio + .5 && L.dash.g.ult) {
      L.dash.acertou = true; L.dash = null; acertouUlt(L, A);
    } else if (A && A.vivo && Math.hypot(A.pos.x - L.pos.x, A.pos.z - L.pos.z) < A.raio + L.raio + .5) {
      if (L.dash.g.dragao) { const p = centroDe(A); onda(A.pos.x, A.pos.z, 7, 0x6a4dff, .5); ondaDeChoque(p, 1); flash('brilho', 0x6a4dff, p.x, p.y, p.z, 6, .35, 0, .6); zoomImpacto(.5); }
      L.dash.acertou = true; aplicarDano(L, A, L.dash.g.poder, L.dash.g.tipo, L.dash.g.nome, new THREE.Vector3(L.dash.dx, 0, L.dash.dz), L.dash.g.equipe ? { final: 'lancar' } : {});
      if (L.dash.g.equipe) { const dono = lutador(L.time); dono.posLancar = 1; }
      efeitoContato(L.dash.g, new THREE.Vector3((A.pos.x + L.pos.x)/2, A.y + A.altura*.5, (A.pos.z + L.pos.z)/2)); tremer(.3);
      L.dash.t = Math.min(L.dash.t, .05);
    }
  }
  if (L.dash && !L.dash.acertou) {
    // rastro da investida: linhas de velocidade + elemento
    const e = estilo(L.dash.g.tipo);
    for (let k = 0; k < 3; k++) part('listra', { x: L.pos.x + rnd(-.4, .4), y: rnd(.2, L.altura), z: L.pos.z + rnd(-.4, .4), vx: -L.dash.dx*4, vy: 0, vz: -L.dash.dz*4, cor: e.c2, tam: L.altura*.8, vida: .2, atrito: 0, rot: -Math.atan2(L.dash.dz, L.dash.dx)*0 + anguloNaTela(L.pos, new THREE.Vector3(L.dash.dx, 0, L.dash.dz)), brilhar: true, tingir: true });
    soltar(L.dash.g.tipo, L.pos.x, L.altura*.5, L.pos.z, 3, 1, .45, .3);
  }
  // buff: aura
  if (L.buffT > 0 && Math.random() < dt*20) soltar(L.p.tipos[0], L.pos.x + rnd(-.6, .6), rnd(0, L.altura), L.pos.z + rnd(-.6, .6), 1, .5, .25, .6);
  // posição do modelo
  const r = L.inst.raiz; r.position.set(L.pos.x, 0, L.pos.z);
  r.rotation.y = L.rumo;
  const v = Math.hypot(L.vel.x, L.vel.z)/L.velBase;
  L.inst.raiz.visible = !(L.inv > 0 && L.surgir >= 1 && L.esquiva && Math.floor(JOGO.tempo*30) % 2) && !L.escondido;
  // inclina nas curvas (como uma moto)
  let dr = L.rumo - (L._rumoAnt ?? L.rumo); while (dr > Math.PI) dr -= Math.PI*2; while (dr < -Math.PI) dr += Math.PI*2;
  L._rumoAnt = L.rumo; L.incl = (L.incl || 0) + (THREE.MathUtils.clamp(-dr/Math.max(dt, .001)*.035, -.22, .22)*Math.min(1, v) - (L.incl || 0))*Math.min(1, dt*8);
  animarInstancia(L.inst, dt, { vel: L.esquiva ? 0 : Math.min(1.2, v), velMS: L.esquiva ? 0 : Math.hypot(L.vel.x, L.vel.z), noAr: L.noAr, alturaPulo: L.y, ataque: L.ataque, dano: Math.max(L.danoT/.35, L.atordoado > 0 ? .6 : 0), desmaio: L.desmaio, voa: L.p.voa, inclinar: L.incl,
    guarda: L.guardando, carga: L.carga ? Math.min(1, L.carga/1.2) : 0, caido: L.caido > 0 ? Math.min(1, L.caidoT*6) : 0, lancado: L.lancado, quebrado: L.quebrado > 0, pose: L.pose });
}
