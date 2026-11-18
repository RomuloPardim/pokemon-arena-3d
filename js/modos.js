"use strict";
/* =========================================================
   MODOS DE JOGO, RODADAS, TORNEIO, TREINO E CAOS
   PARTIDA = uma disputa (1, 2 ou 3 vitórias para ganhar). Cada rodada = uma luta até um time cair.
   ========================================================= */
const MODOS = {
  cpu:       { nome: '1 Jogador',          desc: 'Você contra a IA.',                                p2: 'ia',      precisa: 1 },
  versus:    { nome: 'Versus Local',       desc: 'J1 contra J2, uma luta.',                          p2: 'jogador', precisa: 1 },
  md3:       { nome: 'Melhor de 3',        desc: 'Quem ganhar 2 rodadas vence.',                     p2: 'jogador', precisa: 2 },
  md5:       { nome: 'Melhor de 5',        desc: 'Quem ganhar 3 rodadas vence.',                     p2: 'jogador', precisa: 3 },
  torneio:   { nome: 'Torneio Local',      desc: 'Chave eliminatória com jogadores e CPUs.',         p2: 'ia',      precisa: 1 },
  aleatoria: { nome: 'Batalha Aleatória',  desc: 'Equipes e arena sorteadas.',                       p2: 'jogador', precisa: 1, aleatorio: true },
  treino:    { nome: 'Treinamento',        desc: 'Pratique combos com um boneco configurável.',      p2: 'boneco',  precisa: 1, treino: true },
  caos:      { nome: 'Modo Caótico',       desc: 'Recargas curtas, Ultimate frequente e meteoros.', p2: 'jogador', precisa: 1, caos: true },
};
let PARTIDA = null;

// cfg: { modo, times:[[ids],[ids]], controle:['jogador','ia'], jogadorDoTime:[0,1], mapa, nomes }
async function comecarPartida(cfg){
  const M = MODOS[cfg.modo];
  PARTIDA = Object.assign({ vitorias: [0, 0], rodada: 1, precisa: M.precisa, estat: [novaEstat(), novaEstat()] }, cfg);
  await iniciarRodada();
}
const novaEstat = () => ({ dano: 0, maiorCombo: 0, ults: 0, contras: 0 });

async function iniciarRodada(){
  const P = PARTIDA, M = MODOS[P.modo];
  const ok = await carregarLuta(P);
  if (!ok) return;
  JOGO.regras = { caos: !!M.caos, treino: !!M.treino };
  JOGO.relogio = M.treino ? 0 : S.tempo;
  JOGO.caosT = 4;
  $('#treinoPainel').classList.toggle('hidden', !JOGO.regras.treino);
  $('#relogio').classList.toggle('hidden', !JOGO.relogio);
  banner(P.precisa > 1 ? `RODADA ${P.rodada}` : 'LUTEM!', '#ffd84a', true); SOM.rodada();
  JOGO.intro = 1.4;
}
function fimDeRodada(venc){
  if (JOGO.fim) return;
  JOGO.fim = true;
  const P = PARTIDA; P.vitorias[venc]++;
  for (const t of [0, 1]) { P.estat[t].dano += JOGO.estat[t].dano; P.estat[t].maiorCombo = Math.max(P.estat[t].maiorCombo, JOGO.estat[t].maiorCombo); P.estat[t].ults += JOGO.estat[t].ults; }
  SOM.vitoria(); if (ARENA.torcida) ARENA.torcida.empolgacao = 1;
  JOGO.finalizando = false;
  confete(lutador(venc)); cameraVencedor(lutador(venc));
  const acabou = P.vitorias[venc] >= P.precisa;
  banner(acabou ? `${nomeDoTime(venc)} VENCEU!` : `${nomeDoTime(venc)} vence a rodada ${P.rodada}`, corDoTime(venc), true);
  setTimeout(() => { if (acabou) fimDaPartida(venc); else { P.rodada++; limparLuta(); iniciarRodada(); } }, 2600);
}
function tempoEsgotado(){
  const soma = t => JOGO.times[t].reduce((s, m) => s + (m.vivo ? m.hp/m.hpMax : 0), 0);
  const a = soma(0), b = soma(1);
  banner('TEMPO!', '#ffffff', true);
  if (Math.abs(a - b) < .001) { JOGO.relogio = 30; banner('EMPATE — PRORROGAÇÃO!', '#ffd84a', true); return; }
  fimDeRodada(a > b ? 0 : 1);
}
function fimDaPartida(venc){
  const P = PARTIDA, r = $('#resultado');
  if (document.pointerLockElement) document.exitPointerLock();
  r.querySelector('h2').textContent = `${nomeDoTime(venc)} VENCEU!`;
  r.querySelector('h2').style.color = corDoTime(venc);
  r.querySelector('p').textContent = P.precisa > 1 ? `Placar: ${P.vitorias[0]} × ${P.vitorias[1]}` : '';
  r.querySelector('.estat').innerHTML = [0, 1].map(t => `<div class="col" style="--c:${corDoTime(t)}"><b>${nomeDoTime(t)}</b>
    <span>Dano causado: <em>${Math.round(P.estat[t].dano)}</em></span><span>Maior combo: <em>${P.estat[t].maiorCombo}</em></span><span>Ultimates: <em>${P.estat[t].ults}</em></span></div>`).join('');
  const torneio = P.modo === 'torneio';
  $('#btnRevanche').classList.toggle('hidden', torneio);
  $('#btnContinuarTorneio').classList.toggle('hidden', !torneio);
  r.classList.remove('hidden');
  if (torneio) registrarResultadoTorneio(venc);
  setTimeout(() => moverFoco(r, ''), 50);
}
// estatísticas por luta
function contarEstat(atac, dano){
  if (!atac || !JOGO.estat) return;
  const t = atac.time, s = JOGO.estat[t]; s.dano += dano;
  const dono = atac.assistindo ? lutador(t) : atac;
  s.maiorCombo = Math.max(s.maiorCombo, dono.comboHits);
}

/* ----- Treino ----- */
function atualizarTreino(dt){
  const T = JOGO.treino, P = lutador(0);
  if (!P) return;
  if (T.energiaInf) P.en = 100;
  if (T.semRecarga) { P.cds = [0, 0, 0, 0]; for (const m of JOGO.times[0]) m.assistCd = 0; JOGO.trocaCd[0] = 0; }
  for (const m of JOGO.times[1]) if (T.vidaInfinita && m.hp < m.hpMax && m.atordoado <= 0 && !m.lancado && !m.caido) m.hp = Math.min(m.hpMax, m.hp + m.hpMax*dt*.5);
}
function reposicionarTreino(){
  for (const t of [0, 1]) { const L = lutador(t); if (!L) continue; L.pos.copy(posInicial(t)).multiplyScalar(.5); L.vel.set(0, 0, 0); L.y = 0; L.vy = 0; L.atordoado = 0; L.lancado = false; L.caido = 0; L.hp = L.hpMax; }
}

/* ----- Caos: meteoros caem pela arena de tempos em tempos ----- */
function atualizarCaos(dt){
  JOGO.caosT -= dt;
  if (JOGO.caosT > 0) return;
  JOGO.caosT = rnd(3, 5.5);
  const alvo = lutador(Math.random() < .5 ? 0 : 1); if (!alvo) return;
  const p = alvo.pos.clone().add(new THREE.Vector3(rnd(-3, 3), 0, rnd(-3, 3)));
  const tipo = escolher(['fire', 'electric', 'rock', 'ice', 'psychic']);
  marcaAlvo(p.x, p.z, 3, estilo(tipo).c1, .9);
  depois(.9, () => {
    cairDoCeu(null, { nome: 'Meteoro', tipo, poder: 0 }, p, 3, 1);
    for (const t of [0, 1]) { const L = lutador(t); if (L && L.vivo && Math.hypot(L.pos.x - p.x, L.pos.z - p.z) < 3.5) aplicarDano(null, L, 30, tipo, 'meteoro'); }
  });
}

/* ----- Confete quando alguém vence ----- */
function confete(L){
  if (!L) return;
  const cores = [0xe8383d, 0x2f6fd6, 0xf7c531, 0x3bb54a, 0xffffff, 0x7a3fd0];
  for (let i = 0; i < 120; i++) FUMACA.add({ x: L.pos.x + rnd(-4, 4), y: rnd(6, 10), z: L.pos.z + rnd(-4, 4), vx: rnd(-1, 1), vy: rnd(-1, 1), vz: rnd(-1, 1), cor: escolher(cores), tam: .25, vida: 3, cel: 'estrela', grav: 1.5, atrito: .8, vrot: rnd(-6, 6), some: 4 });
}

/* =========================================================
   TORNEIO LOCAL (chave eliminatória de 4 ou 8)
   ========================================================= */
let TORNEIO = null;
const NOMES_CPU = ['CPU Brasa', 'CPU Maré', 'CPU Trovão', 'CPU Raiz', 'CPU Sombra', 'CPU Geada', 'CPU Rocha', 'CPU Aura'];
function criarTorneio(qtd, humanos, timesHumanos){
  const part = [];
  for (let h = 0; h < humanos; h++) part.push({ nome: 'J' + (h + 1), humano: h, time: timesHumanos[h] });
  const usados = new Set(timesHumanos.flat());
  const cpus = embaralhar(NOMES_CPU);
  while (part.length < qtd) {
    const time = embaralhar(POKEMON.filter(p => !p.online && !usados.has(p.id))).slice(0, S.tamanhoTime).map(p => p.id);
    part.push({ nome: cpus.pop(), humano: -1, time });
  }
  TORNEIO = { qtd, rodadas: [embaralhar(part)], atual: 0, eliminados: [], campeao: null };
  mostrarChave();
}
function partidaAtualTorneio(){
  const R = TORNEIO.rodadas[TORNEIO.rodadas.length - 1];
  for (let i = 0; i < R.length; i += 2) if (!R[i].venceu && !R[i + 1].venceu) return [R[i], R[i + 1], i];
  return null;
}
function mostrarChave(){
  const el = $('#chave');
  el.innerHTML = TORNEIO.rodadas.map((R, r) => `<div class="fase"><h4>${['Quartas','Semifinal','Final'][r + (TORNEIO.qtd === 4 ? 1 : 0)] || 'Rodada'}</h4>` +
    Array.from({ length: R.length/2 }, (_, i) => { const a = R[i*2], b = R[i*2 + 1];
      const lado = x => `<div class="part ${x.venceu ? 'venceu' : ''} ${x.perdeu ? 'perdeu' : ''} ${x.humano >= 0 ? 'humano' : ''}"><span>${x.nome}</span>${x.time.map(id => `<img src="${ICONE(id)}" alt="">`).join('')}</div>`;
      return `<div class="jogo">${lado(a)}${lado(b)}</div>`; }).join('') + '</div>').join('') +
    (TORNEIO.campeao ? `<div class="fase"><h4>Campeão</h4><div class="campeao">🏆 ${TORNEIO.campeao.nome}</div></div>` : '');
  const prox = partidaAtualTorneio();
  $('#btnProximaLuta').textContent = TORNEIO.campeao ? 'Ver classificação' : prox ? (prox[0].humano < 0 && prox[1].humano < 0 ? `Simular: ${prox[0].nome} × ${prox[1].nome}` : `Lutar: ${prox[0].nome} × ${prox[1].nome}`) : 'Avançar';
  mostrarTela('telaTorneio');
  $('#torneioConfig').classList.add('hidden'); $('#btnProximaLuta').classList.remove('hidden');
}
async function proximaLutaTorneio(){
  if (TORNEIO.campeao) { mostrarClassificacao(); return; }
  const prox = partidaAtualTorneio();
  if (!prox) { avancarFaseTorneio(); return; }
  const [a, b] = prox;
  if (a.humano < 0 && b.humano < 0) {     // CPU × CPU: simula (time mais forte tem mais chance)
    const forca = x => x.time.reduce((s, id) => { const p = POR_ID[id]; return s + p.hp + p.atk + p.def + p.vel; }, 0);
    const venc = Math.random() < forca(a)/(forca(a) + forca(b)) ? a : b;
    marcarVencedor(venc, venc === a ? b : a); mostrarChave(); return;
  }
  TORNEIO.lutando = [a, b];
  await comecarPartida({ modo: 'torneio', times: [a.time, b.time],
    controle: [a.humano >= 0 ? 'jogador' : 'ia', b.humano >= 0 ? 'jogador' : 'ia'],
    jogadorDoTime: [Math.max(0, a.humano), b.humano >= 0 ? b.humano : 1], mapa: escolher(Object.keys(MAPAS)), nomes: [a.nome, b.nome] });
}
function marcarVencedor(v, p){ v.venceu = true; p.perdeu = true; TORNEIO.eliminados.unshift({ nome: p.nome, fase: TORNEIO.rodadas.length }); if (!partidaAtualTorneio()) avancarFaseTorneio(); }
function avancarFaseTorneio(){
  const R = TORNEIO.rodadas[TORNEIO.rodadas.length - 1], venc = R.filter(x => x.venceu).map(x => ({ ...x, venceu: false, perdeu: false }));
  if (venc.length === 1) { TORNEIO.campeao = venc[0]; return; }
  TORNEIO.rodadas.push(venc);
}
function registrarResultadoTorneio(vencTime){
  const [a, b] = TORNEIO.lutando; marcarVencedor(vencTime === 0 ? a : b, vencTime === 0 ? b : a);
}
function mostrarClassificacao(){
  const lista = [TORNEIO.campeao.nome, ...TORNEIO.eliminados.map(e => e.nome)];
  $('#chave').innerHTML = `<div class="classificacao"><h3>Classificação final</h3>${lista.map((n, i) => `<div><b>${i + 1}º</b> ${n}${i === 0 ? ' 🏆' : ''}</div>`).join('')}</div>`;
  $('#btnProximaLuta').textContent = 'Voltar ao menu'; TORNEIO.terminado = true;
}
