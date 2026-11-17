"use strict";
/* =========================================================
   ENTRADA — teclado, controles (Gamepad API) e toque, separados por jogador
   Cada quadro, lerEntradas() monta para o Jogador 1 e o Jogador 2 um objeto:
     { x, y (analógico, -1..1), agora: Set (segurando), disparou: Set (apertou agora), solto: Set (soltou agora) }
   A IA monta exatamente o mesmo objeto (ia.js) — por isso tudo que vale para o jogador vale para a IA.
   ========================================================= */
const ACOES = ['ataque','pulo','esquiva','guarda','golpe0','golpe1','golpe2','golpe3','ult','assist0','assist1','trocar','mega','pausa'];
const NOME_ACAO = { ataque:'Ataque (combo)', pulo:'Pular', esquiva:'Esquiva / Perseguir', guarda:'Guarda / Substituição',
  golpe0:'Golpe 1', golpe1:'Golpe 2', golpe2:'Golpe 3', golpe3:'Golpe 4', ult:'Ultimate', assist0:'Assistência 1', assist1:'Assistência 2', trocar:'Trocar Pokémon', mega:'Mega Evolução', pausa:'Pausa' };

// Teclado: códigos de tecla (e.code), funcionam em qualquer layout (ABNT, US...)
const TECLADO_PADRAO = [
  { cima:'KeyW', baixo:'KeyS', esq:'KeyA', dir:'KeyD', ataque:'KeyJ', pulo:'Space', esquiva:'KeyK', guarda:'KeyL',
    golpe0:'KeyU', golpe1:'KeyI', golpe2:'KeyO', golpe3:'KeyP', ult:'KeyY', assist0:'KeyQ', assist1:'KeyE', trocar:'KeyR', mega:'KeyG', pausa:'Escape' },
  { cima:'ArrowUp', baixo:'ArrowDown', esq:'ArrowLeft', dir:'ArrowRight', ataque:'Numpad1', pulo:'Numpad0', esquiva:'Numpad2', guarda:'Numpad3',
    golpe0:'Numpad4', golpe1:'Numpad5', golpe2:'Numpad6', golpe3:'NumpadAdd', ult:'Numpad8', assist0:'Numpad7', assist1:'Numpad9', trocar:'NumpadEnter', mega:'NumpadMultiply', pausa:'Backspace' },
];
// Controle (padrão Xbox / PlayStation): número do botão
const CONTROLE_PADRAO = { ataque:2, pulo:0, esquiva:1, guarda:5, golpe0:3, golpe1:4, golpe2:7, golpe3:6, ult:12, assist0:14, assist1:15, trocar:13, mega:10, pausa:9 };
const NOME_BOTAO = ['A','B','X','Y','LB','RB','LT','RT','Select','Start','L3','R3','↑','↓','←','→'];
const NOME_BOTAO_PS = ['✕','◯','▢','△','L1','R1','L2','R2','Share','Options','L3','R3','↑','↓','←','→'];

// Mapas atuais (o jogador pode trocar em Configurações → Controles; fica salvo no navegador)
const MAPAS_ENTRADA = (() => {
  let salvo = null; try { salvo = JSON.parse(localStorage.getItem('pa3d_mapas') || 'null'); } catch (e) {}
  return {
    teclado: [Object.assign({}, TECLADO_PADRAO[0], salvo?.teclado?.[0]), Object.assign({}, TECLADO_PADRAO[1], salvo?.teclado?.[1])],
    controle: [Object.assign({}, CONTROLE_PADRAO, salvo?.controle?.[0]), Object.assign({}, CONTROLE_PADRAO, salvo?.controle?.[1])],
  };
})();
function salvarMapas(){ try { localStorage.setItem('pa3d_mapas', JSON.stringify(MAPAS_ENTRADA)); } catch (e) {} }
function restaurarMapas(n){
  MAPAS_ENTRADA.teclado[n] = Object.assign({}, TECLADO_PADRAO[n]); MAPAS_ENTRADA.controle[n] = Object.assign({}, CONTROLE_PADRAO); salvarMapas();
}

/* ----- Estado bruto dos dispositivos ----- */
const TECLAS = new Set();
const TOQUE = { x: 0, y: 0, agora: new Set(), ativo: matchMedia('(pointer: coarse)').matches };
let esperandoTecla = null;      // remapeamento: função que recebe a próxima tecla
addEventListener('keydown', e => {
  if (esperandoTecla) { e.preventDefault(); const f = esperandoTecla; esperandoTecla = null; f(e.code); return; }
  TECLAS.add(e.code);
  if (EM_BATALHA() && (e.code === 'Space' || e.code.startsWith('Arrow') || e.code.startsWith('Numpad') || e.code === 'Tab' || e.code === 'Backspace')) e.preventDefault();
});
addEventListener('keyup', e => TECLAS.delete(e.code));
addEventListener('blur', () => TECLAS.clear());

// Controles conectados, na ordem em que foram ligados. 1º = Jogador 1, 2º = Jogador 2.
function controles(){ return [...(navigator.getGamepads ? navigator.getGamepads() : [])].filter(p => p && p.connected); }
function controleDoJogador(n){ return controles()[n] || null; }
const ehPlayStation = pad => pad && /054c|playstation|dualshock|dualsense/i.test(pad.id);

/* ----- Leitura por jogador (uma vez por quadro) ----- */
const ENTRADAS = [null, null];
const _antes = [new Set(), new Set()];
let usouControle = [false, false];      // para os rótulos do HUD (tecla ou botão)
function lerEntradas(){
  const pads = controles();
  for (const n of [0, 1]) {
    const T = MAPAS_ENTRADA.teclado[n], B = MAPAS_ENTRADA.controle[n], pad = pads[n];
    const dpad = { x: 0, y: 0 };      // setinhas cruas (para os menus, mesmo que estejam ligadas a ações)
    let x = (TECLAS.has(T.dir) ? 1 : 0) - (TECLAS.has(T.esq) ? 1 : 0);
    let y = (TECLAS.has(T.cima) ? 1 : 0) - (TECLAS.has(T.baixo) ? 1 : 0);
    const agora = new Set(ACOES.filter(a => TECLAS.has(T[a])));
    if (agora.size || x || y) usouControle[n] = false;
    if (pad) {
      const ax = pad.axes[0] || 0, ay = pad.axes[1] || 0;
      if (Math.hypot(ax, ay) > .22) { x += ax; y -= ay; usouControle[n] = true; }
      const b = i => i != null && pad.buttons[i] && (pad.buttons[i].pressed || pad.buttons[i].value > .5);
      for (const a of ACOES) if (b(B[a])) { agora.add(a); usouControle[n] = true; }
      // setinhas também andam, quando não estão ligadas a uma ação
      dpad.x = (b(15) ? 1 : 0) - (b(14) ? 1 : 0); dpad.y = (b(12) ? 1 : 0) - (b(13) ? 1 : 0);
      const usadas = new Set(Object.values(B));
      if (!usadas.has(12) && b(12)) y += 1; if (!usadas.has(13) && b(13)) y -= 1;
      if (!usadas.has(14) && b(14)) x -= 1; if (!usadas.has(15) && b(15)) x += 1;
    }
    if (n === 0) { x += TOQUE.x; y += TOQUE.y; for (const a of TOQUE.agora) agora.add(a); }
    const d = Math.hypot(x, y); if (d > 1) { x /= d; y /= d; }
    const disparou = new Set([...agora].filter(a => !_antes[n].has(a)));
    const solto = new Set([..._antes[n]].filter(a => !agora.has(a)));
    _antes[n] = agora;
    ENTRADAS[n] = { x, y, agora, disparou, solto, pad, dpad };
  }
}
// Entrada vazia (Pokémon parado)
const ENTRADA_VAZIA = () => ({ x: 0, y: 0, agora: new Set(), disparou: new Set(), solto: new Set(), dpad: { x: 0, y: 0 } });

// Rótulo de uma ação para mostrar no HUD ("J", "X", "△"...)
function rotulo(n, acao){
  const pad = controleDoJogador(n);
  if (pad && usouControle[n]) { const i = MAPAS_ENTRADA.controle[n][acao]; return (ehPlayStation(pad) ? NOME_BOTAO_PS : NOME_BOTAO)[i] ?? ('B' + i); }
  if (n === 0 && TOQUE.ativo) return '';
  return nomeTecla(MAPAS_ENTRADA.teclado[n][acao]);
}
function nomeTecla(code){
  if (!code) return '—';
  return code.replace(/^Key/, '').replace(/^Digit/, '').replace('Numpad', 'Num ').replace('Arrow', '').replace('Space', 'Espaço')
    .replace('Up', '↑').replace('Down', '↓').replace('Left', '←').replace('Right', '→').replace('Add', '+').replace('Subtract', '-').replace('Escape', 'Esc');
}

/* ----- Vibração ----- */
function vibrar(n, forca, ms){
  if (!S.vibracao) return;
  const pad = controleDoJogador(n);
  if (pad && pad.vibrationActuator) pad.vibrationActuator.playEffect('dual-rumble', { duration: ms, strongMagnitude: forca, weakMagnitude: forca*.6 }).catch(() => {});
}

/* ----- Remapear: espera a próxima tecla ou botão ----- */
function esperarTeclaPara(n, acao, pronto){
  esperandoTecla = code => { MAPAS_ENTRADA.teclado[n][acao] = code; salvarMapas(); pronto(); };
}
let esperandoBotao = null;
function esperarBotaoPara(n, acao, pronto){
  const pad0 = controleDoJogador(n);
  if (!pad0) { pronto('sem controle'); return; }
  const antes = pad0.buttons.map(b => b.pressed);
  esperandoBotao = () => {
    const pad = controleDoJogador(n); if (!pad) return;
    const i = pad.buttons.findIndex((b, k) => b.pressed && !antes[k]);
    pad.buttons.forEach((b, k) => { if (!b.pressed) antes[k] = false; });
    if (i >= 0) { MAPAS_ENTRADA.controle[n][acao] = i; salvarMapas(); esperandoBotao = null; pronto(); }
  };
}

/* ----- CONTROLES MOBILE V9: multitouch real com Pointer Events -----
   O joystick e os botões capturam ponteiros diferentes, então andar e atacar
   podem acontecer ao mesmo tempo. Sem listeners touchstart globais. */
const tela = renderer.domElement;
tela.addEventListener('contextmenu', e => e.preventDefault());
const joyZona = document.getElementById('joyZona');
const joyBase = document.getElementById('joy'), joyPino = document.getElementById('joyPino');
let joyId = null;
function moverAnalogico(e){
  const r = joyBase.getBoundingClientRect();
  const cx = r.left+r.width*.5, cy = r.top+r.height*.5;
  let dx = e.clientX-cx, dy = e.clientY-cy;
  const max = Math.max(30, r.width*.34), d = Math.hypot(dx,dy);
  if (d > max) { dx *= max/d; dy *= max/d; }
  const deadzone = .12;
  const intensidade = Math.min(1, Math.hypot(dx,dy)/max);
  const v = intensidade < deadzone ? 0 : (intensidade-deadzone)/(1-deadzone);
  const ang = Math.atan2(dy,dx);
  TOQUE.x = Math.cos(ang)*v; TOQUE.y = -Math.sin(ang)*v;
  joyPino.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
}
function soltarAnalogico(e){
  if (e.pointerId !== joyId) return;
  joyId = null; TOQUE.x = TOQUE.y = 0;
  joyPino.style.transform = 'translate(-50%, -50%)';
  joyZona.classList.remove('pressionado');
}
joyZona.addEventListener('pointerdown', e => {
  if (joyId !== null || !EM_BATALHA()) return;
  e.preventDefault(); TOQUE.ativo = true; iniciarAudio();
  joyId = e.pointerId; joyZona.setPointerCapture(e.pointerId);
  joyZona.classList.add('pressionado'); moverAnalogico(e);
});
joyZona.addEventListener('pointermove', e => { if (e.pointerId === joyId) { e.preventDefault(); moverAnalogico(e); } });
for (const ev of ['pointerup','pointercancel','lostpointercapture']) joyZona.addEventListener(ev, soltarAnalogico);
function ligarBotaoToque(el){
  const acao = el.dataset.acao;
  const ativos = new Set();
  el.addEventListener('pointerdown', e => {
    if (!EM_BATALHA()) return;
    e.preventDefault(); e.stopPropagation();
    TOQUE.ativo = true; iniciarAudio();
    ativos.add(e.pointerId); TOQUE.agora.add(acao);
    el.classList.add('ativo');
    el.setPointerCapture(e.pointerId);
  });
  const terminar = e => {
    if (!ativos.has(e.pointerId)) return;
    ativos.delete(e.pointerId);
    if (!ativos.size) { TOQUE.agora.delete(acao); el.classList.remove('ativo'); }
  };
  for (const ev of ['pointerup','pointercancel','lostpointercapture']) el.addEventListener(ev, terminar);
}
function limparToqueMobile(){
  TOQUE.x = TOQUE.y = 0; TOQUE.agora.clear(); joyId = null;
  joyZona.classList.remove('pressionado');
  joyPino.style.transform = 'translate(-50%, -50%)';
  document.querySelectorAll('#toque button').forEach(el => el.classList.remove('ativo'));
}
addEventListener('blur', limparToqueMobile);
addEventListener('pagehide', limparToqueMobile);

/* ----- Navegar nos menus com controle/teclado -----
   Elementos com a classe "nav" recebem foco; o analógico/setas move o foco para o mais próximo naquela direção;
   A (pular) ou Ataque confirma; B (esquiva) volta. */
const NAV = { repetir: [0, 0], foco: null, antesDir: ['', ''] };
function navegarMenus(dt){
  if (EM_BATALHA() && !JOGO.pausado && !JOGO.fim) return;
  if (esperandoBotao) { esperandoBotao(); return; }
  const tela = document.querySelector('.tela:not(.hidden)'); if (!tela) return;
  // a tela de seleção tem cursores próprios para cada jogador (menus.js)
  if (tela.dataset.navPropria) return;
  for (const n of [0, 1]) {
    const E = ENTRADAS[n]; if (!E) continue;
    const ex = E.x + E.dpad.x, ey = E.y + E.dpad.y;
    const dir = Math.abs(ex) > .5 ? (ex > 0 ? 'dir' : 'esq') : Math.abs(ey) > .5 ? (ey > 0 ? 'cima' : 'baixo') : '';
    NAV.repetir[n] -= dt;
    if (dir && (dir !== NAV.antesDir[n] || NAV.repetir[n] <= 0)) { moverFoco(tela, dir); NAV.repetir[n] = dir !== NAV.antesDir[n] ? .4 : .14; }
    NAV.antesDir[n] = dir;
    if (E.disparou.has('pulo') || E.disparou.has('ataque')) { const f = document.activeElement; if (f && f.classList.contains('nav') && tela.contains(f)) f.click(); else moverFoco(tela, ''); }
    if (E.disparou.has('esquiva')) { const v = tela.querySelector('[data-voltar]'); v && v.click(); }
  }
}
function moverFoco(tela, dir){
  const itens = [...tela.querySelectorAll('.nav')].filter(el => el.offsetParent !== null && !el.disabled);
  if (!itens.length) return;
  const atual = document.activeElement && itens.includes(document.activeElement) ? document.activeElement : null;
  if (!atual || !dir) { itens[0].focus(); return; }
  const a = atual.getBoundingClientRect(), ax = a.left + a.width/2, ay = a.top + a.height/2;
  let melhor = null, nota = Infinity;
  for (const el of itens) {
    if (el === atual) continue;
    const r = el.getBoundingClientRect(), x = r.left + r.width/2, y = r.top + r.height/2, dx = x - ax, dy = y - ay;
    const ok = dir === 'dir' ? dx > 5 : dir === 'esq' ? dx < -5 : dir === 'baixo' ? dy > 5 : dy < -5;
    if (!ok) continue;
    const principal = dir === 'dir' || dir === 'esq' ? Math.abs(dx) : Math.abs(dy), lateral = dir === 'dir' || dir === 'esq' ? Math.abs(dy) : Math.abs(dx);
    const n = principal + lateral*2.5;
    if (n < nota) { nota = n; melhor = el; }
  }
  if (melhor) { melhor.focus(); melhor.scrollIntoView({ block: 'nearest' }); }
}
