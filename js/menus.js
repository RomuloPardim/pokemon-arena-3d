"use strict";
/* =========================================================
   MENUS — tela inicial, seleção (J1 e J2 ao mesmo tempo), torneio, configurações, controles
   ========================================================= */
function mostrarTela(id){
  document.querySelectorAll('.tela').forEach(t => t.classList.toggle('hidden', t.id !== id));
  if (id === 'telaSelecao') desenharSelecao();
  const t = document.getElementById(id);
  if (t && !t.dataset.navPropria) setTimeout(() => moverFoco(t, ''), 30);
}

/* ----- Tela inicial ----- */
function montarInicio(){
  $('#modos').innerHTML = Object.entries(MODOS).map(([id, m]) => `<button class="modo nav" data-modo="${id}"><b>${m.nome}</b><small>${m.desc}</small></button>`).join('');
  $('#modos').querySelectorAll('.modo').forEach(b => b.onclick = () => { iniciarAudio(); escolherModo(b.dataset.modo); });
  $('#btnConfig').onclick = () => mostrarTela('telaConfig');
  $('#btnControles').onclick = () => { desenharControles(); mostrarTela('telaControles'); };
}
function statusControles(){
  const pads = controles();
  const txt = n => pads[n] ? `🎮 ${n + 1}: ${pads[n].id.replace(/\(.*?\)/g, '').trim().slice(0, 28) || 'controle'}` : `⌨️ J${n + 1}: teclado`;
  const el = $('#statusControles'); if (el) el.textContent = txt(0) + '   •   ' + txt(1);
}
function escolherModo(id){
  const M = MODOS[id];
  if (M.aleatorio) {        // sorteia tudo e começa
    const lista = embaralhar(POKEMON.filter(p => !p.online));
    comecarPartida({ modo: id, times: [lista.slice(0, S.tamanhoTime).map(p => p.id), lista.slice(S.tamanhoTime, S.tamanhoTime*2).map(p => p.id)],
      controle: ['jogador', controles().length >= 2 || S.p2Teclado ? 'jogador' : 'ia'], jogadorDoTime: [0, 1], mapa: escolher(Object.keys(MAPAS)) });
    return;
  }
  if (id === 'torneio') { mostrarTela('telaTorneio'); $('#torneioConfig').classList.remove('hidden'); $('#chave').innerHTML = ''; $('#btnProximaLuta').classList.add('hidden'); return; }
  abrirSelecao(id);
}

/* ----- Seleção de personagens ----- */
const SEL = { modo: 'versus', times: [[], []], cursor: [0, 5], pronto: [false, false], ctrl: ['jogador', 'jogador'], editando: 0, mapa: 'estadio', repetir: [0, 0], antesDir: ['', ''], humanos: 2 };
function abrirSelecao(modo, opcoes = {}){
  const M = MODOS[modo];
  Object.assign(SEL, { modo, times: [[], []], pronto: [false, false], ctrl: ['jogador', M.p2 === 'jogador' ? 'jogador' : M.p2], editando: 0, mapa: S.mapa, humanos: opcoes.humanos || 2 });
  if (modo === 'torneio') SEL.ctrl = ['jogador', SEL.humanos > 1 ? 'jogador' : 'nenhum'];
  SEL.cursor = [0, Math.min(5, POKEMON.length - 1)];
  $('#selTitulo').textContent = M.nome;
  mostrarTela('telaSelecao');
}
function desenharSelecao(){
  const grade = $('#selGrade');
  if (!grade.children.length) {
    grade.innerHTML = POKEMON.map((p, i) => `<button class="carta ${p.online ? 'online' : ''} ${p.lendario ? 'lendario' : ''}" data-i="${i}">
      <img src="${ICONE(p.id)}" alt="" loading="lazy" onerror="this.style.visibility='hidden'"><b>${p.nome}</b>
      <div class="tipos">${p.tipos.map(t => `<span style="background:${TYPES[t][1]}">${TYPES[t][0]}</span>`).join('')}</div>
      <small>${ESTILOS_LUTA[p.estilo].nome}</small>${p.online ? '<em>online</em>' : p.lendario ? '<em class="lend">LENDÁRIO</em>' : ''}<i class="c0">J1</i><i class="c1">J2</i></button>`).join('');
    grade.querySelectorAll('.carta').forEach(c => {
      c.onclick = () => { iniciarAudio(); adicionarAoTime(SEL.editando, +c.dataset.i); };
      c.onmouseenter = () => { SEL.cursor[SEL.editando] = +c.dataset.i; desenharCursores(); };
    });
  }
  $('#selTamanho').innerHTML = [1, 2, 3].map(n => `<button data-v="${n}" class="${S.tamanhoTime === n ? 'on' : ''}">${n}×${n}</button>`).join('');
  $('#selTamanho').querySelectorAll('button').forEach(b => b.onclick = () => { S.tamanhoTime = +b.dataset.v; salvar(); for (const t of [0, 1]) SEL.times[t] = SEL.times[t].slice(0, S.tamanhoTime); desenharSelecao(); });
  $('#selArenas').innerHTML = Object.entries(MAPAS).map(([id, m]) => `<button data-m="${id}" class="${SEL.mapa === id ? 'on' : ''}" style="--a:${m.cor || '#345'}">${m.nome}</button>`).join('') +
    `<button data-m="aleatorio" class="${SEL.mapa === 'aleatorio' ? 'on' : ''}">🎲 Aleatória</button>`;
  $('#selArenas').querySelectorAll('button').forEach(b => b.onclick = () => { SEL.mapa = b.dataset.m; if (SEL.mapa !== 'aleatorio') { S.mapa = SEL.mapa; salvar(); criarArena(SEL.mapa); } desenharSelecao(); });
  for (const t of [0, 1]) desenharPainelSelecao(t);
  desenharCursores();
  atualizarBotaoComecar();
}
function desenharPainelSelecao(t){
  const el = $('#selJ' + t), ctrl = SEL.ctrl[t];
  if (ctrl === 'nenhum') { el.classList.add('hidden'); return; }
  el.classList.remove('hidden');
  const pads = controles();
  const disp = ctrl === 'jogador' ? (pads[t] ? `Controle ${t + 1}` : 'Teclado') : ctrl === 'boneco' ? 'Boneco de treino' : 'CPU';
  const slots = Array.from({ length: S.tamanhoTime }, (_, i) => { const id = SEL.times[t][i]; return id ? `<div class="slot"><img src="${ICONE(id)}" alt=""><span>${POR_ID[id].nome}</span></div>` : `<div class="slot vazio">${i + 1}</div>`; }).join('');
  const n = t;
  const dica = ctrl === 'jogador' ? `${rotulo(n, 'pulo')} escolher • ${rotulo(n, 'esquiva')} tirar • ${rotulo(n, 'golpe0')} aleatório • ${rotulo(n, 'pausa')} pronto` : 'clique nas cartas para montar a equipe';
  el.innerHTML = `<h3 style="color:${COR_TIME[t]}">${ctrl === 'jogador' ? 'JOGADOR ' + (t + 1) : disp}<small>${ctrl === 'jogador' ? disp : ''}</small></h3>
    <div class="slots">${slots}</div>
    <div class="estado ${SEL.pronto[t] ? 'ok' : ''}">${SEL.pronto[t] ? 'PRONTO!' : 'Escolhendo…'}</div>
    <div class="acoes"><button data-a="editar" class="${SEL.editando === t ? 'on' : ''}">✎ Editar</button><button data-a="aleatorio">🎲</button><button data-a="limpar">✕</button>
      ${t === 1 && SEL.modo !== 'torneio' && SEL.modo !== 'treino' ? `<button data-a="ctrl">${ctrl === 'jogador' ? '→ CPU' : '→ Jogador 2'}</button>` : ''}
      <button data-a="pronto" class="pri">${SEL.pronto[t] ? 'Desfazer' : 'Pronto'}</button></div>
    <p class="dica">${dica}</p>`;
  el.querySelectorAll('[data-a]').forEach(b => b.onclick = () => {
    const a = b.dataset.a;
    if (a === 'editar') SEL.editando = t;
    if (a === 'aleatorio') sortearTime(t);
    if (a === 'limpar') { SEL.times[t] = []; SEL.pronto[t] = false; }
    if (a === 'ctrl') { SEL.ctrl[1] = SEL.ctrl[1] === 'jogador' ? 'ia' : 'jogador'; SEL.pronto[1] = false; }
    if (a === 'pronto') alternarPronto(t);
    desenharSelecao();
  });
}
function desenharCursores(){
  document.querySelectorAll('#selGrade .carta').forEach(c => {
    const i = +c.dataset.i;
    for (const t of [0, 1]) c.classList.toggle('cur' + t, SEL.cursor[t] === i && SEL.ctrl[t] === 'jogador' && !SEL.pronto[t]);
    c.classList.toggle('noTime0', SEL.times[0].includes(POKEMON[i].id));
    c.classList.toggle('noTime1', SEL.times[1].includes(POKEMON[i].id));
  });
  // vitrine: o Pokémon que cada cursor está olhando
  for (const t of [0, 1]) { const id = SEL.times[t].length && SEL.pronto[t] ? SEL.times[t][0] : POKEMON[SEL.cursor[t]].id; mostrarNaVitrine(t, SEL.ctrl[t] === 'nenhum' ? null : id); }
}
function adicionarAoTime(t, i){
  if (SEL.pronto[t] || SEL.ctrl[t] === 'nenhum') return;
  const id = POKEMON[i].id, time = SEL.times[t];
  if (time.includes(id)) { time.splice(time.indexOf(id), 1); }
  else { if (time.length >= S.tamanhoTime) time.shift(); time.push(id); SOM.pokebola(); }
  desenharSelecao();
}
function sortearTime(t){ SEL.times[t] = embaralhar(POKEMON.filter(p => !p.online)).slice(0, S.tamanhoTime).map(p => p.id); }
function alternarPronto(t){
  if (!SEL.pronto[t] && SEL.times[t].length < S.tamanhoTime) sortearTime(t);
  SEL.pronto[t] = !SEL.pronto[t];
  if (SEL.pronto[t]) SOM.assist();
  atualizarBotaoComecar();
  if (podeComecar() && SEL.ctrl.every((c, k) => c !== 'jogador' || SEL.pronto[k])) setTimeout(comecarDaSelecao, 350);
}
function podeComecar(){
  return [0, 1].every(t => SEL.ctrl[t] === 'nenhum' || (SEL.ctrl[t] !== 'jogador' ? true : SEL.pronto[t]));
}
// sempre dá para começar: quem não completou a equipe recebe Pokémon sorteados
function atualizarBotaoComecar(){ const falta = [0, 1].some(t => SEL.ctrl[t] !== 'nenhum' && SEL.times[t].length < S.tamanhoTime);
  $('#btnComecar').textContent = falta ? '▶ COMEÇAR (sorteia o resto)' : '▶ COMEÇAR'; }
function comecarDaSelecao(){
  if (!EM_SELECAO()) return;
  for (const t of [0, 1]) if (SEL.ctrl[t] !== 'nenhum' && SEL.times[t].length < S.tamanhoTime) sortearTime(t);
  const mapa = SEL.mapa === 'aleatorio' ? escolher(Object.keys(MAPAS)) : SEL.mapa;
  if (SEL.modo === 'torneio') { criarTorneio(S.torneioQtd, SEL.humanos, SEL.humanos > 1 ? [SEL.times[0], SEL.times[1]] : [SEL.times[0]]); return; }
  comecarPartida({ modo: SEL.modo, times: [SEL.times[0], SEL.times[1]], controle: [SEL.ctrl[0], SEL.ctrl[1]], jogadorDoTime: [0, 1], mapa });
}
const EM_SELECAO = () => !$('#telaSelecao').classList.contains('hidden');
// cursores com controle/teclado
function navegarSelecao(dt){
  if (!EM_SELECAO()) return;
  const cartas = [...document.querySelectorAll('#selGrade .carta')]; if (!cartas.length) return;
  const colunas = Math.max(1, cartas.filter(c => c.offsetTop === cartas[0].offsetTop).length);
  for (const t of [0, 1]) {
    if (SEL.ctrl[t] !== 'jogador') continue;
    const E = ENTRADAS[t]; if (!E) continue;
    const x = E.x + E.dpad.x, y = E.y + E.dpad.y;
    const dir = Math.abs(x) > .5 ? (x > 0 ? 'dir' : 'esq') : Math.abs(y) > .5 ? (y > 0 ? 'cima' : 'baixo') : '';
    SEL.repetir[t] -= dt;
    if (dir && !SEL.pronto[t] && (dir !== SEL.antesDir[t] || SEL.repetir[t] <= 0)) {
      let c = SEL.cursor[t];
      if (dir === 'dir') c++; if (dir === 'esq') c--; if (dir === 'baixo') c += colunas; if (dir === 'cima') c -= colunas;
      SEL.cursor[t] = (c + cartas.length) % cartas.length;
      SEL.repetir[t] = dir !== SEL.antesDir[t] ? .35 : .11;
      cartas[SEL.cursor[t]].scrollIntoView({ block: 'nearest' }); desenharCursores(); SOM.guarda();
    }
    SEL.antesDir[t] = dir;
    const d = E.disparou;
    if (d.has('pulo') || d.has('ataque')) { SEL.editando = t; adicionarAoTime(t, SEL.cursor[t]); }
    if (d.has('esquiva')) {
      if (SEL.pronto[t]) SEL.pronto[t] = false;
      else if (SEL.times[t].length) SEL.times[t].pop();
      else if (t === 0) { mostrarTela('telaInicio'); return; }
      desenharSelecao();
    }
    if (d.has('golpe0')) { sortearTime(t); desenharSelecao(); }
    if (d.has('pausa')) { alternarPronto(t); desenharSelecao(); }
    if (t === 0 && (d.has('golpe1') || d.has('guarda'))) {
      const ids = [...Object.keys(MAPAS), 'aleatorio'], i = ids.indexOf(SEL.mapa);
      SEL.mapa = ids[(i + (d.has('guarda') ? 1 : -1) + ids.length) % ids.length];
      if (SEL.mapa !== 'aleatorio') { S.mapa = SEL.mapa; criarArena(SEL.mapa); }
      desenharSelecao();
    }
    if (t === 0 && d.has('golpe2')) { S.tamanhoTime = S.tamanhoTime % 3 + 1; for (const k of [0, 1]) SEL.times[k] = SEL.times[k].slice(0, S.tamanhoTime); salvar(); desenharSelecao(); }
  }
}

/* ----- Torneio (configuração) ----- */
function montarTorneio(){
  seg('#segTorQtd', 'torneioQtd', null, v => +v);
  seg('#segTorHum', 'torneioHumanos', null, v => +v);
  $('#btnTorneioEquipes').onclick = () => abrirSelecao('torneio', { humanos: S.torneioHumanos });
  $('#btnProximaLuta').onclick = () => { if (TORNEIO && TORNEIO.terminado) { voltarAoMenu(); return; } proximaLutaTorneio(); };
}

/* ----- Configurações ----- */
function montarConfig(){
  seg('#segQual', 'qualidade', v => aplicarQualidade(v));
  seg('#segFps', 'mostrarFps', v => $('#indicadorFps').classList.toggle('hidden', !v), v => v === 'true');
  seg('#segUlt', 'ultAnim'); seg('#segTempo', 'tempo', null, v => +v); seg('#segDif', 'dif');
  seg('#segVib', 'vibracao', null, v => v === 'true'); seg('#segSom', 'som', v => { somLigado = v; }, v => v === 'true');
  seg('#segMus', 'musica', v => tocarMusica(v && EM_BATALHA()), v => v === 'true');
  seg('#segP2', 'p2Teclado', null, v => v === 'true');
}
function seg(sel, chave, aoMudar, conv = v => v){
  const el = $(sel); if (!el) return;
  el.querySelectorAll('button').forEach(b => b.classList.add('nav'));
  const marcar = () => el.querySelectorAll('button').forEach(b => b.classList.toggle('on', conv(b.dataset.v) === S[chave]));
  el.querySelectorAll('button').forEach(b => b.onclick = () => { S[chave] = conv(b.dataset.v); salvar(); marcar(); aoMudar && aoMudar(S[chave]); });
  marcar();
}

/* ----- Controles (remapear) ----- */
let controlesDe = 0;
function desenharControles(){
  const n = controlesDe, T = MAPAS_ENTRADA.teclado[n], B = MAPAS_ENTRADA.controle[n], pad = controleDoJogador(n);
  const nomes = ehPlayStation(pad) ? NOME_BOTAO_PS : NOME_BOTAO;
  $('#ctrlAbas').innerHTML = [0, 1].map(k => `<button class="nav ${k === n ? 'on' : ''}" data-k="${k}">Jogador ${k + 1}</button>`).join('');
  $('#ctrlAbas').querySelectorAll('button').forEach(b => b.onclick = () => { controlesDe = +b.dataset.k; desenharControles(); });
  $('#ctrlPad').textContent = pad ? `Controle ${n + 1}: ${pad.id}` : `Nenhum controle ${n + 1} conectado (aperte um botão no controle para ele aparecer).`;
  const linhas = [['cima','Andar ↑'],['baixo','Andar ↓'],['esq','Andar ←'],['dir','Andar →'], ...ACOES.map(a => [a, NOME_ACAO[a]])];
  $('#ctrlTabela').innerHTML = `<tr><th>Ação</th><th>Teclado</th><th>Controle</th></tr>` + linhas.map(([a, nome]) => `<tr><td>${nome}</td>
    <td><button class="nav tecla" data-t="${a}">${nomeTecla(T[a])}</button></td>
    <td>${B[a] !== undefined ? `<button class="nav botao" data-b="${a}">${nomes[B[a]] ?? 'B' + B[a]}</button>` : '<span class="cinza">analógico</span>'}</td></tr>`).join('');
  $('#ctrlTabela').querySelectorAll('.tecla').forEach(b => b.onclick = () => { b.textContent = 'aperte uma tecla…'; b.classList.add('esperando'); esperarTeclaPara(n, b.dataset.t, desenharControles); });
  $('#ctrlTabela').querySelectorAll('.botao').forEach(b => b.onclick = () => { b.textContent = 'aperte um botão…'; b.classList.add('esperando'); esperarBotaoPara(n, b.dataset.b, e => { if (e) b.textContent = 'sem controle'; else desenharControles(); }); });
  $('#btnCtrlPadrao').onclick = () => { restaurarMapas(n); desenharControles(); };
}

/* ----- Pausa e resultado ----- */
function pausar(sim){
  if (JOGO.fim && sim) return;
  JOGO.pausado = sim; $('#pausa').classList.toggle('hidden', !sim);
  if (sim) setTimeout(() => moverFoco($('#pausa'), ''), 30);
}
function montarPausaResultado(){
  $('#btnContinuar').onclick = () => pausar(false);
  $('#btnSairPausa').onclick = voltarAoMenu;
  $('#btnMenu').onclick = voltarAoMenu;
  $('#btnRevanche').onclick = async () => { $('#resultado').classList.add('hidden'); const cfg = { ...PARTIDA }; limparLuta(); await comecarPartida(cfg); };
  $('#btnContinuarTorneio').onclick = () => { $('#resultado').classList.add('hidden'); limparLuta(); mostrarChave(); };
  $('#btnTorneioIniciar') && ($('#btnTorneioIniciar').onclick = () => abrirSelecao('torneio', { humanos: S.torneioHumanos }));
  // painel do treino
  const T = () => JOGO.treino;
  $('#treinoComp').onchange = e => T().comportamento = e.target.value;
  $('#treinoVida').onchange = e => T().vidaInfinita = e.target.checked;
  $('#treinoEnergia').onchange = e => T().energiaInf = e.target.checked;
  $('#treinoRecarga').onchange = e => T().semRecarga = e.target.checked;
  $('#treinoRepos').onclick = () => reposicionarTreino();
}
