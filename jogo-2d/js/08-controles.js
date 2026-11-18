/* =========================================================
   CONTROLES (edite aqui para mudar as teclas)
   ========================================================= */
const CONTROLES = {
  cima:     ['w','arrowup'],
  baixo:    ['s','arrowdown'],
  esquerda: ['a','arrowleft'],
  direita:  ['d','arrowright'],
  golpes:   [['1','j'], ['2','k'], ['3','l'], ['4','i']],  // golpe 1, 2, 3 e 4
  pular:    [' ','shift'],                                  // pulo / esquiva
  ultimate: ['q','e'],                                      // golpe especial (barra cheia)
  mega:     ['g','m'],                                      // Mega Evolução (V15)
  pausar:   ['escape','p'],
  golpeDoMouse: 0,  // clique esquerdo usa este golpe (0 = primeiro). Use -1 para desligar.
  cliqueDireito: 'pular'   // botão direito: 'pular', 'ultimate', 'mega', 'golpe0'…'golpe3' ou 'nada'
};

/* =========================================================
   V16: TROCAR AS TECLAS PELA TELA (botão "⌨ CONTROLES" no menu)
   As teclas escolhidas ficam salvas no navegador (localStorage 'pa2d_teclas').
   ========================================================= */
const CONTROLES_PADRAO = JSON.parse(JSON.stringify(CONTROLES));
(function carregarTeclas(){
  try { const s = JSON.parse(localStorage.getItem('pa2d_teclas') || 'null');
    if (s) for (const k in CONTROLES_PADRAO) if (k in s) CONTROLES[k] = s[k]; } catch (e) {}
})();
function salvarTeclas(){ try { localStorage.setItem('pa2d_teclas', JSON.stringify(CONTROLES)); } catch (e) {} }
// nome bonito de uma tecla
function nomeTecla(k){
  if (!k) return '—';
  const N = {' ':'ESPAÇO', arrowup:'↑', arrowdown:'↓', arrowleft:'←', arrowright:'→', escape:'ESC', shift:'SHIFT', control:'CTRL',
    alt:'ALT', enter:'ENTER', tab:'TAB', backspace:'⌫', capslock:'CAPS'};
  return N[k] || k.toUpperCase();
}
// lista de ações que aparecem na tela: [nome, caminho no CONTROLES]
const ACOES_2D = [
  ['Andar ↑', 'cima'], ['Andar ↓', 'baixo'], ['Andar ←', 'esquerda'], ['Andar →', 'direita'],
  ['Golpe 1', 'golpes.0'], ['Golpe 2', 'golpes.1'], ['Golpe 3', 'golpes.2'], ['Golpe 4', 'golpes.3'],
  ['Pular / esquivar', 'pular'], ['Ultimate', 'ultimate'], ['Mega Evolução', 'mega'], ['Pausar', 'pausar']
];
const listaDe = cam => cam.startsWith('golpes.') ? CONTROLES.golpes[+cam.split('.')[1]] : CONTROLES[cam];
let esperandoTecla2D = null;           // { cam, slot } enquanto espera a próxima tecla

function abrirControles(){
  if (esperandoTecla2D) esperandoTecla2D = null;
  const linhas = ACOES_2D.map(([nome, cam]) => { const l = listaDe(cam);
    return `<tr><td>${nome}</td>` + [0, 1].map(s => `<td><button class="tecla" data-c="${cam}" data-s="${s}">${nomeTecla(l[s])}</button></td>`).join('') + '</tr>'; }).join('');
  const opG = sel => [['-1','Nada'],['0','Golpe 1'],['1','Golpe 2'],['2','Golpe 3'],['3','Golpe 4']].map(([v,t]) => `<option value="${v}" ${String(sel) === v ? 'selected' : ''}>${t}</option>`).join('');
  const opD = sel => [['pular','Pular / esquivar'],['ultimate','Ultimate'],['mega','Mega Evolução'],['golpe0','Golpe 1'],['golpe1','Golpe 2'],['golpe2','Golpe 3'],['golpe3','Golpe 4'],['nada','Nada']]
    .map(([v,t]) => `<option value="${v}" ${sel === v ? 'selected' : ''}>${t}</option>`).join('');
  openModal(`<div class="ctrl2d"><h2>⌨ CONTROLES</h2>
    <p class="hint">Clique numa tecla e aperte a nova. <b>ESC</b> cancela, <b>⌫</b> apaga. Cada ação aceita duas teclas.
    Se a tecla já era de outra ação, ela sai de lá.</p>
    <table><tr><th>Ação</th><th>Tecla 1</th><th>Tecla 2</th></tr>${linhas}</table>
    <div class="mouse2d">
      <label>Clique esquerdo <select id="selEsq">${opG(CONTROLES.golpeDoMouse)}</select></label>
      <label>Clique direito <select id="selDir">${opD(CONTROLES.cliqueDireito)}</select></label>
    </div>
    <p class="hint" id="ctrlAviso">&nbsp;</p>
    <div class="row"><button class="smbtn" id="ctrlPadrao">Restaurar padrão</button><button class="smbtn go" id="ctrlOk">Pronto</button></div></div>`);
  $('#mbox').querySelectorAll('.tecla').forEach(b => b.onclick = () => {
    $('#mbox').querySelectorAll('.tecla.esperando').forEach(x => { x.classList.remove('esperando'); });
    esperandoTecla2D = { cam: b.dataset.c, slot: +b.dataset.s, btn: b };
    b.textContent = 'aperte…'; b.classList.add('esperando');
  });
  $('#selEsq').onchange = e => { CONTROLES.golpeDoMouse = +e.target.value; salvarTeclas(); atualizarDicas(); };
  $('#selDir').onchange = e => { CONTROLES.cliqueDireito = e.target.value; salvarTeclas(); atualizarDicas(); };
  $('#ctrlPadrao').onclick = () => { const P = JSON.parse(JSON.stringify(CONTROLES_PADRAO)); for (const k in P) CONTROLES[k] = P[k]; salvarTeclas(); atualizarDicas(); abrirControles(); };
  $('#ctrlOk').onclick = () => { esperandoTecla2D = null; closeModal(); };
}
// pega a próxima tecla (antes de qualquer outro atalho do jogo)
addEventListener('keydown', e => {
  if (!esperandoTecla2D) return;
  e.preventDefault(); e.stopImmediatePropagation();
  const k = e.key.toLowerCase(), { cam, slot } = esperandoTecla2D; esperandoTecla2D = null;
  if (k === 'escape') { abrirControles(); return; }
  const l = listaDe(cam);
  if (k === 'backspace' || k === 'delete') { l.splice(slot, 1); }
  else {
    let tirou = '';
    for (const [nome, c] of ACOES_2D) { const o = listaDe(c), i = o.indexOf(k);        // tira a tecla de quem já usava
      if (i >= 0 && !(c === cam && i === slot)) { o.splice(i, 1); if (c !== cam) tirou = nome; } }
    const l2 = listaDe(cam); if (slot < l2.length) l2[slot] = k; else l2.push(k);
    if (tirou) setTimeout(() => { const a = $('#ctrlAviso'); if (a) a.textContent = `${nomeTecla(k)} saiu de "${tirou}".`; }, 0);
  }
  salvarTeclas(); atualizarDicas(); abrirControles();
}, true);
// textos de ajuda (menu e batalha) montados a partir das teclas atuais
function atualizarDicas(){
  const t = cam => nomeTecla(listaDe(cam)[0]), C = CONTROLES;
  const mov = [t('cima'), t('esquerda'), t('baixo'), t('direita')].join('');
  const esq = C.golpeDoMouse >= 0 ? ` • clique: golpe ${C.golpeDoMouse + 1}` : '';
  const dirN = {pular:'pular', ultimate:'Ultimate', mega:'Mega', nada:''}[C.cliqueDireito] ?? ('golpe ' + (+C.cliqueDireito.slice(5) + 1));
  const help = document.querySelector('#battle .help');
  if (help) help.textContent = `${mov}: mover • Mouse: mirar • ${[0,1,2,3].map(i => t('golpes.' + i)).join('/')}: golpes${esq} • ${t('pular')}: pular • ${t('ultimate')}: Ultimate • ${t('mega')}: Mega${dirN ? ' • botão direito: ' + dirN : ''} • Retrato: trocar`;
  const h = $('#ctrlHint');
  if (h && !isTouch) h.innerHTML = `PC: ${mov} para mover • mouse para mirar • ${[0,1,2,3].map(i => t('golpes.' + i)).join(', ')} para os golpes${esq} • ${t('pular')} para pular e esquivar${dirN ? ' • botão direito: ' + dirN : ''} • ${t('ultimate')} Ultimate • ${t('mega')} Mega • ${t('pausar')} pausa. <b>Mude as teclas em ⌨ CONTROLES.</b>`;
}

