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

/* ----- Tela inicial: blocos coloridos (cada um é um modo) ----- */
const ICONES_MENU = {
  boneco: '<svg viewBox="0 0 64 64"><circle cx="32" cy="12" r="8"/><rect x="28" y="20" width="8" height="30" rx="3"/><rect x="12" y="26" width="40" height="7" rx="3"/><rect x="22" y="50" width="20" height="6" rx="3"/></svg>',
  trofeu: '<svg viewBox="0 0 64 64"><path d="M18 8h28v12a14 14 0 0 1-28 0z"/><path d="M18 12H8v4a10 10 0 0 0 10 10M46 12h10v4a10 10 0 0 1-10 10" fill="none" stroke="currentColor" stroke-width="4"/><rect x="29" y="33" width="6" height="12"/><rect x="20" y="45" width="24" height="7" rx="2"/></svg>',
  dado: '<svg viewBox="0 0 64 64"><rect x="10" y="10" width="44" height="44" rx="9"/><g fill="#0004"><circle cx="22" cy="22" r="4.5"/><circle cx="42" cy="22" r="4.5"/><circle cx="32" cy="32" r="4.5"/><circle cx="22" cy="42" r="4.5"/><circle cx="42" cy="42" r="4.5"/></g></svg>',
  engrenagem: '<svg viewBox="0 0 64 64"><path d="M27 6h10l2 8 6 3 7-4 7 7-4 7 3 6 8 2v10l-8 2-3 6 4 7-7 7-7-4-6 3-2 8H27l-2-8-6-3-7 4-7-7 4-7-3-6-8-2V27l8-2 3-6-4-7 7-7 7 4 6-3z"/><circle cx="32" cy="32" r="9" fill="#0005"/></svg>',
  controle: '<svg viewBox="0 0 64 64"><path d="M14 20h36a10 10 0 0 1 10 10l2 14a7 7 0 0 1-12 5l-6-7H20l-6 7a7 7 0 0 1-12-5l2-14a10 10 0 0 1 10-10z"/><g fill="#0005"><rect x="15" y="27" width="4" height="12"/><rect x="11" y="31" width="12" height="4"/><circle cx="44" cy="29" r="3"/><circle cx="50" cy="35" r="3"/></g></svg>'
};
const BLOCOS_MENU = [
  { id: 'cpu', cls: 'mnCombate', nome: 'COMBATE', sub: 'Você contra a CPU', arte: [9, 94] },
  { id: 'versus', cls: 'mnVersus', nome: 'VERSUS', sub: 'Jogador 1 contra Jogador 2', arte: [6, 25], opcoes: [['versus', '1 luta'], ['md3', 'Melhor de 3'], ['md5', 'Melhor de 5']] },
  { id: 'treino', cls: 'mnTreino', nome: 'TREINO', icone: 'boneco' },
  { id: 'torneio', cls: 'mnTorneio', nome: 'TORNEIO', icone: 'trofeu' },
  { id: 'aleatoria', cls: 'mnAleatoria', nome: 'ALEATÓRIA', icone: 'dado' },
  { id: 'caos', cls: 'mnCaos', nome: 'CAÓTICO', arte: [384] },
  { id: 'config', cls: 'mnCinza', nome: 'OPÇÕES', icone: 'engrenagem', desc: 'Gráficos, câmera, som, tempo e dificuldade.' },
  { id: 'controles', cls: 'mnCinza', nome: 'CONTROLES', icone: 'controle', desc: 'Veja e mude as teclas e os botões do controle.' }
];
// abre Configurações ou Controles lembrando para onde o "Voltar" leva (menu ou pausa)
function abrirSubtela(id, volta){
  const v = document.querySelector('#' + id + ' [data-voltar]'); if (v) v.dataset.voltar = volta;
  if (id === 'telaControles') desenharControles();
  mostrarTela(id);
}
function montarInicio(){
  const arte = ids => ids.map((id, k) => `<img class="mnArte a${k}" src="${ICONE(id)}" alt="" onerror="this.remove()">`).join('');
  $('#modos').innerHTML = BLOCOS_MENU.map((b, i) => {
    const desc = b.desc || MODOS[b.id].desc;
    const fundo = (b.arte ? arte(b.arte) : '') + (b.icone ? `<span class="mnIcone">${ICONES_MENU[b.icone]}</span>` : '');
    const texto = `<span class="mnNome">${b.nome}</span>${b.sub ? `<small class="mnSub">${b.sub}</small>` : ''}`;
    if (b.opcoes) return `<div class="mnBloco ${b.cls}" style="--i:${i}" data-desc="${desc}">${fundo}${texto}
      <span class="mnChips">${b.opcoes.map(([m, r]) => `<button class="nav mnChip" data-modo="${m}" data-desc="${MODOS[m].desc}">${r}</button>`).join('')}</span></div>`;
    const idBtn = b.id === 'config' ? ' id="btnConfig"' : b.id === 'controles' ? ' id="btnControles"' : '';
    return `<button class="mnBloco nav ${b.cls}"${idBtn} style="--i:${i}" data-modo="${b.id}" data-desc="${desc}">${fundo}${texto}</button>`;
  }).join('');
  $('#modos').querySelectorAll('[data-modo]').forEach(b => b.onclick = e => {
    e.stopPropagation(); iniciarAudio();
    const m = b.dataset.modo;
    if (m === 'config') abrirSubtela('telaConfig', 'telaInicio');
    else if (m === 'controles') abrirSubtela('telaControles', 'telaInicio');
    else escolherModo(m);
  });
  // tocar no bloco do Versus (fora dos botões) começa uma luta simples
  $('#modos').querySelector('.mnVersus').onclick = () => { iniciarAudio(); escolherModo('versus'); };
  // a barra de baixo descreve o bloco em foco (controle/teclado) ou embaixo do mouse
  const descrever = e => { const el = e.target.closest && e.target.closest('[data-desc]'); if (el) $('#mnDesc').textContent = el.dataset.desc; };
  $('#modos').addEventListener('focusin', descrever);
  $('#modos').addEventListener('mouseover', descrever);
  $('#mnDesc').textContent = MODOS.cpu.desc;
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
      <img class="retr" src="${RETRATO(p.id)}" data-id="${p.id}" alt="" loading="lazy" onerror="retratoErro(this)"><b>${p.nome}</b>
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
  const slots = Array.from({ length: S.tamanhoTime }, (_, i) => { const id = SEL.times[t][i]; return id ? `<div class="slot"><img class="retr" src="${RETRATO(id)}" data-id="${id}" alt="" onerror="retratoErro(this)"><span>${POR_ID[id].nome}</span></div>` : `<div class="slot vazio">${i + 1}</div>`; }).join('');
  const n = t;
  const dica = ctrl === 'jogador' ? `${rotulo(n, 'pulo')} escolher • ${rotulo(n, 'esquiva')} tirar • ${rotulo(n, 'golpe0')} aleatório • ${rotulo(n, 'pausa')} pronto` : 'clique nas cartas para montar a equipe';
  const tag = ctrl === 'jogador' ? (t + 1) + 'P' : ctrl === 'boneco' ? 'TREINO' : 'CPU';
  el.className = `selPainel lado${t} ${ctrl === 'jogador' ? 'humano' : 'cpu'} ${SEL.pronto[t] ? 'pronto' : ''}`;
  el._infoId = null;
  el.innerHTML = `<div class="spTopo"><span class="spTag">${tag}</span><span class="spCtrl">${ctrl === 'jogador' ? disp : ''}</span>
      <span class="estado ${SEL.pronto[t] ? 'ok' : ''}">${SEL.pronto[t] ? 'PRONTO!' : 'Escolhendo…'}</span></div>
    <div class="spInfo"></div>
    <div class="slots">${slots}</div>
    <div class="acoes"><button data-a="editar" class="${SEL.editando === t ? 'on' : ''}">✎ Editar</button><button data-a="aleatorio">🎲</button><button data-a="limpar">✕</button>
      ${t === 1 && SEL.modo !== 'torneio' && SEL.modo !== 'treino' ? `<button data-a="ctrl">${ctrl === 'jogador' ? '→ CPU' : '→ Jogador 2'}</button>` : ''}
      <button data-a="pronto" class="pri">${SEL.pronto[t] ? 'Desfazer' : 'Pronto'}</button></div>
    <p class="dica">${dica}</p>`;
  desenharInfoSelecao(t);
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
  for (const t of [0, 1]) { const id = SEL.times[t].length && SEL.pronto[t] ? SEL.times[t][0] : POKEMON[SEL.cursor[t]].id; mostrarNaVitrine(t, SEL.ctrl[t] === 'nenhum' ? null : id); desenharInfoSelecao(t); }
}
// a parte de cima do painel: arte grande, nome, tipos, estilo e golpes do Pokémon em foco
function desenharInfoSelecao(t){
  const el = $('#selJ' + t), info = el && el.querySelector('.spInfo'); if (!info) return;
  const id = SEL.times[t].length && SEL.pronto[t] ? SEL.times[t][0] : POKEMON[SEL.cursor[t]].id;
  if (el._infoId === id) return;
  el._infoId = id;
  const p = POR_ID[id];
  info.innerHTML = `<img class="spArte" src="${ICONE(id)}" alt="" onerror="this.style.visibility='hidden'">
    <div class="spTexto"><small>${ESTILOS_LUTA[p.estilo].nome}${p.lendario ? ' · Lendário' : ''}</small><h3>${p.nome}</h3>
      <div class="tipos">${p.tipos.map(tp => `<span style="background:${TYPES[tp][1]}">${TYPES[tp][0]}</span>`).join('')}</div>
      <ul class="spGolpes">${p.golpes.map(g => `<li style="--c:${TYPES[g.tipo][1]}">${g.nome}</li>`).join('')}</ul></div>`;
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
  seg('#segVisual', 'visual', v => guardar.set('visualV18', v));
  seg('#segCamera', 'camera');   // vale a partir da próxima luta
  seg('#segRetratos', 'retratos', () => {            // troca todos os retratos já desenhados
    document.querySelectorAll('img.retr').forEach(im => { delete im.dataset.caiu; im.src = RETRATO(+im.dataset.id); });
  });
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
const DICAS_PAUSA = ['Ataque várias vezes para fazer um <b>combo</b>.', 'Segure Ataque para um <b>golpe carregado</b>.', 'Esquiva sem direção: <b>persegue</b> o adversário.',
  'Guarda logo antes do golpe: <b>contra-ataque</b>.', 'Guarda quando apanha: <b>substituição</b>.', 'Pular no chão: <b>levanta rápido</b>.'];
function pausar(sim){
  if (JOGO.fim && sim) return;
  JOGO.pausado = sim;
  if (!sim) ['#telaConfig', '#telaControles'].forEach(s => $(s).classList.add('hidden'));   // despausou com Opções aberto
  $('#pausa').classList.toggle('hidden', !sim);
  if (sim) { montarPainelPausa(); setTimeout(() => moverFoco($('#pausa'), ''), 30); }
}
// painel da direita: os dois times com a vida de cada Pokémon e os golpes do seu
function montarPainelPausa(){
  const P = PARTIDA, M = P && MODOS[P.modo];
  $('#psModo').textContent = M ? M.nome + (P.precisa > 1 ? ` · Rodada ${P.rodada} · ${P.vitorias[0]} × ${P.vitorias[1]}` : '') : '';
  $('#psArena').textContent = P && MAPAS[P.mapa] ? '· ' + MAPAS[P.mapa].nome : '';
  $('#psTimes').innerHTML = [0, 1].map(t => `<div class="psTime" style="--t:${COR_TIME[t]}"><b>${nomeDoTime(t)}</b>` +
    JOGO.times[t].map((m, i) => {
      const f = Math.max(0, m.hp/m.hpMax), cor = f > .5 ? '#3ddc84' : f > .2 ? '#ffc93a' : '#ff4a5a';
      return `<div class="psLinha ${m.vivo ? '' : 'caido'} ${i === JOGO.ativo[t] ? 'ativo' : ''}"><img class="retr" src="${RETRATO(m.p.id)}" data-id="${m.p.id}" alt="" onerror="retratoErro(this)">
        <span>${m.p.nome}</span><i><em style="width:${f*100}%;background:${cor}"></em></i><small>${Math.round(f*100)}%</small></div>`;
    }).join('') + '</div>').join('');
  const L = lutador(0);
  $('#psNomeGolpes').textContent = L ? L.p.nome.toUpperCase() : '';
  $('#psGolpes').innerHTML = L ? L.p.golpes.map(g => `<li style="--c:${TYPES[g.tipo][1]}">${g.nome}<small>${TYPES[g.tipo][0]}</small></li>`).join('') : '';
  $('#psDica').innerHTML = 'Dica: ' + DICAS_PAUSA[Math.floor(Math.random()*DICAS_PAUSA.length)];
}
function montarPausaResultado(){
  $('#btnContinuar').onclick = () => pausar(false);
  $('#btnSairPausa').onclick = () => {   // sair pede dois toques, para não perder a luta sem querer
    const b = $('#btnSairPausa'), rotulo = b.querySelector('b');
    if (b.dataset.confirmar) { delete b.dataset.confirmar; rotulo.textContent = 'Sair da luta'; voltarAoMenu(); return; }
    b.dataset.confirmar = '1'; rotulo.textContent = 'Sair? Aperte de novo';
    setTimeout(() => { delete b.dataset.confirmar; rotulo.textContent = 'Sair da luta'; }, 3000);
  };
  $('#btnPsOpcoes').onclick = () => abrirSubtela('telaConfig', 'pausa');
  $('#btnPsControles').onclick = () => abrirSubtela('telaControles', 'pausa');
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
