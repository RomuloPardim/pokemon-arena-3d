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
   ========================================================= */
const REGRAS_MEGA = {
  porRodada: 1,        // quantas Megas cada time pode fazer por rodada
  custo: 50,           // energia gasta
  liberaEm: 20,        // segundos de rodada até liberar
  duracao: 1.5,        // tempo da transformação
  escala: 1.15,        // o modelo fica 15% maior
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

function megaEvoluir(L){
  const pode = podeMegaEvoluir(L);
  if (pode !== true) { if (L.time !== undefined && pode !== 'sem Mega' && pode !== 'ocupado') avisoCombate(L.time, pode.toUpperCase(), '#9aa6c0'); return false; }
  const M = MEGAS[L.p.id];
  JOGO.megas[L.time]++;
  L.en -= REGRAS_MEGA.custo;
  L.megaT = REGRAS_MEGA.duracao;            // tempo restante da transformação
  L.inv = Math.max(L.inv, REGRAS_MEGA.duracao);
  L.ataque = { t: 0, dur: REGRAS_MEGA.duracao, jeito: 'buff' };   // pose de "carregar energia"
  banner('MEGA EVOLUÇÃO!', '#' + M.cor.toString(16).padStart(6, '0'), true);
  SOM.ult(); vibrarTime(L.time, .8, 400);
  return true;
}

// Chamado todo quadro para cada lutador em campo (batalha.js)
function atualizarMega(L, dt){
  if (L.megaT > 0) {
    const M = MEGAS[L.p.id], antes = L.megaT;
    L.megaT -= dt;
    if (Math.random() < dt*30) soltar(L.p.tipos[0], L.pos.x, L.y + L.altura*.5, L.pos.z, 3, 2.5, .35, .5);
    // no meio da transformação: explode, aplica os atributos e cresce
    if (antes > REGRAS_MEGA.duracao/2 && L.megaT <= REGRAS_MEGA.duracao/2) {
      L.mega = true;
      L.atk = Math.round(L.atk*M.atk); L.def = Math.round(L.def*M.def); L.velBase *= M.vel;
      L.inst.ajuste.scale.multiplyScalar(REGRAS_MEGA.escala);
      const centro = new THREE.Vector3(L.pos.x, L.y + L.altura*.5, L.pos.z);
      clarao(M.cor, centro.x, centro.y, centro.z, 8, 14, .5); ondaDeChoque(centro, 1.2); tremer(.5); zoomImpacto(.6);
      onda(L.pos.x, L.pos.z, 6, M.cor, .6); soltar(L.p.tipos[0], centro.x, centro.y, centro.z, 40, 7, .5, .8);
      avisoCombate(L.time, M.nome.toUpperCase(), '#' + M.cor.toString(16).padStart(6, '0'));
    }
    if (L.megaT <= 0) L.ataque = null;
  }
  if (L.mega && Math.random() < dt*4) auraCorpo(L, L.p.tipos[0], .5, .5);   // aura leve enquanto for Mega
}