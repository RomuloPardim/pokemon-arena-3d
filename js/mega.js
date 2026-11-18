"use strict";
/* =========================================================
   MEGA EVOLUÇÃO — regras:
     1. Só quem está na tabela MEGAS (dados.js).
     2. Cada time pode Mega Evoluir UMA vez por rodada.
     3. Custa 50 de energia da Ultimate.
     4. Só libera depois de 20 segundos de rodada.
     5. Precisa estar livre: no chão, sem atacar, sem apanhar.
     6. A transformação leva 1,5 s: parado e invencível.
     7. A Mega dura até o Pokémon desmaiar (trocar não desfaz).
   V12: troca o modelo pelo da Mega (ou recolore), Reversão Primitiva e golpes com visual de Mega.
   ========================================================= */
const REGRAS_MEGA = {
  porRodada: 1,        // quantas Megas cada time pode fazer por rodada
  custo: 50,           // energia gasta
  liberaEm: 20,        // segundos de rodada até liberar
  duracao: 1.5,        // tempo da transformação
  escala: 1.15,        // a Mega fica 15% maior
};

// Devolve true se pode, ou um texto dizendo o motivo de não poder
function podeMegaEvoluir(L){
  const M = MEGAS[L.p.id];
  if (!M) return 'sem Mega';
  if (L.mega) return 'já é Mega';
  if (JOGO.megas[L.time] >= REGRAS_MEGA.porRodada) return 'Mega já usada';
  if (JOGO.tempo < REGRAS_MEGA.liberaEm && !JOGO.regras.treino) return 'ainda não';
  if (L.en < REGRAS_MEGA.custo) return 'pouca energia';
  if (!livre(L) || L.noAr || L.ataque || L.combo || L.megaT > 0) return 'ocupado';
  return true;
}
const corCSS = c => '#' + c.toString(16).padStart(6, '0');

// Ficha usada para montar o modelo da Mega: a do Pokémon, com os ajustes da Mega por cima
function fichaDaMega(L){
  const M = MEGAS[L.p.id], p = L.p;
  return Object.assign({}, p, {
    altura: (M.altura || p.altura)*REGRAS_MEGA.escala,
    escalaModelo: M.escalaModelo ?? p.escalaModelo, enrolar: M.enrolar ?? p.enrolar,
    asasBracos: M.asasBracos ?? p.asasBracos, voa: M.voa ?? p.voa, ocultarMalhas: M.ocultarMalhas, ampAsa: M.ampAsa ?? p.ampAsa,
  });
}

function megaEvoluir(L){
  const pode = podeMegaEvoluir(L);
  if (pode !== true) { if (L.time !== undefined && pode !== 'sem Mega' && pode !== 'ocupado') avisoCombate(L.time, pode.toUpperCase(), '#9aa6c0'); return false; }
  const M = MEGAS[L.p.id];
  JOGO.megas[L.time]++;
  L.en -= REGRAS_MEGA.custo;
  L.megaT = REGRAS_MEGA.duracao;            // tempo restante da transformação
  L.inv = Math.max(L.inv, REGRAS_MEGA.duracao);
  L.ataque = { t: 0, dur: REGRAS_MEGA.duracao, jeito: 'buff' };   // pose de "carregar energia"
  // começa a montar o modelo da Mega agora (fica pronto antes do meio da transformação)
  if (M.modelo && !L.megaInst) L.megaInst = criarInstancia(M.modelo, null, fichaDaMega(L)).catch(() => null);
  banner(M.primal ? 'REVERSÃO PRIMITIVA!' : 'MEGA EVOLUÇÃO!', corCSS(M.cor), true);
  SOM.ult(); vibrarTime(L.time, .8, 400);
  esferaMega(L, M);
  iniciarCineMega(L, M);                    // V14: câmera foca no Pokémon durante a transformação
  return true;
}

// Chamado todo quadro para cada lutador em campo (batalha.js)
function atualizarMega(L, dt){
  const M = MEGAS[L.p.id];
  // deixa o modelo da Mega carregando em segundo plano assim que o Pokémon entra em campo
  if (M && M.modelo && !L.megaPre) { L.megaPre = true; carregarModelo(M.modelo).catch(() => {}); }
  if (L.megaT > 0) {
    const antes = L.megaT;
    L.megaT -= dt;
    if (Math.random() < dt*30) soltar(L.p.tipos[0], L.pos.x, L.y + L.altura*.5, L.pos.z, 3, 2.5, .35, .5);
    // no meio da transformação: explode, aplica os atributos e troca o visual
    if (antes > REGRAS_MEGA.duracao/2 && L.megaT <= REGRAS_MEGA.duracao/2) {
      L.mega = true;
      L.atk = Math.round(L.atk*M.atk); L.def = Math.round(L.def*M.def); L.velBase *= M.vel;
      visualDaMega(L, M);
      const centro = new THREE.Vector3(L.pos.x, L.y + L.altura*.5, L.pos.z);
      clarao(M.cor, centro.x, centro.y, centro.z, 8, 14, .5); ondaDeChoque(centro, 1.2); tremer(.5); zoomImpacto(.6);
      onda(L.pos.x, L.pos.z, 6, M.cor, .6); soltar(L.p.tipos[0], centro.x, centro.y, centro.z, 40, 7, .5, .8);
      avisoCombate(L.time, M.nome.toUpperCase(), corCSS(M.cor));
      atualizarPaineis(true);
    }
    if (L.megaT <= 0) L.ataque = null;
  }
  if (L.mega && Math.random() < dt*4) auraCorpo(L, L.p.tipos[0], .5, .5);   // aura leve enquanto for Mega
}

// Troca o modelo pelo da Mega; sem modelo próprio, recolore (tinta) e cresce
async function visualDaMega(L, M){
  if (M.modelo && L.megaInst) {
    const nova = await L.megaInst;
    if (nova && L.vivo) { trocarModelo(L, nova); return; }
  }
  L.inst.ajuste.scale.multiplyScalar(REGRAS_MEGA.escala);
  if (M.tinta) for (const m of L.inst.materiais) {
    if (m.color) m.color.lerp(new THREE.Color(M.tinta.cor), M.tinta.forca ?? .7);
    if (m.emissive) { m.emissive.setHex(M.tinta.brilho); m.emissiveIntensity = M.tinta.intensidade ?? .35; }
  }
}
function trocarModelo(L, nova){
  const velha = L.inst;
  nova.raiz.position.copy(velha.raiz.position); nova.raiz.rotation.copy(velha.raiz.rotation); nova.raiz.scale.copy(velha.raiz.scale);
  if (velha.raiz.parent) velha.raiz.parent.add(nova.raiz);
  liberarInstancia(velha);
  L.inst = nova;
}

// Esfera de energia com as cores do arco-íris envolvendo o Pokémon (início da transformação)
function esferaMega(L, M){
  const c = centroDe(L), r = L.altura*.9;
  const bola = new THREE.Mesh(GEO.esfera, matBrilho(M.cor)); bola.position.copy(c);
  efeito(bola, REGRAS_MEGA.duracao/2, (e, k) => {
    bola.position.copy(centroDe(L)); bola.scale.setScalar(r*(.3 + k*1.1)); bola.material.opacity = .55*(1 - k*.6);
    if (Math.random() < .5) {
      const a = Math.random()*Math.PI*2, h = rnd(-r, r);
      part('brilho', { x: c.x + Math.cos(a)*r*1.4, y: c.y + h, z: c.z + Math.sin(a)*r*1.4, vx: -Math.cos(a)*4, vy: 0, vz: -Math.sin(a)*4,
        cor: escolher([0xff5a9a, 0xffd84a, 0x5af4ff, 0xa66bff, M.cor]), tam: .35, vida: .35, atrito: 0, brilhar: true });
    }
  });
}

/* ----- Golpes com visual de Mega (chamado em usarGolpe) ----- */
function golpeMega(L, g, origem){
  const M = MEGAS[L.p.id]; if (!M) return;
  flash('anel', M.cor, L.pos.x, .1, L.pos.z, L.altura*1.6, .35);
  flash('brilho', M.cor, origem.x, origem.y, origem.z, 2.2, .22);
  for (let k = 0; k < 10; k++) {
    const a = k/10*Math.PI*2;
    part('brilho', { x: L.pos.x + Math.cos(a)*L.raio*1.4, y: .2, z: L.pos.z + Math.sin(a)*L.raio*1.4, vx: Math.cos(a)*1.5, vy: rnd(3, 5), vz: Math.sin(a)*1.5,
      cor: M.cor, tam: .3, vida: .45, atrito: .5, brilhar: true });
  }
}
