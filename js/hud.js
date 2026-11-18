"use strict";
/* =========================================================
   HUD — um painel para cada jogador (esquerda = time 0, direita = time 1)
   ========================================================= */
const $ = s => document.querySelector(s);
const hud = $('#hud');
const COR_TIME = ['#3a8bff', '#ff4a5a'];
const corDoTime = t => COR_TIME[t];
function nomeDoTime(t){
  if (JOGO.nomes && JOGO.nomes[t]) return JOGO.nomes[t];
  return JOGO.controle[t] === 'jogador' ? 'J' + (JOGO.jogadorDoTime[t] + 1) : JOGO.controle[t] === 'boneco' ? 'Boneco' : 'CPU';
}

function montarHUD(){
  hud.classList.remove('hidden');
  hud.classList.toggle('toque', TOQUE.ativo && JOGO.controle[0] === 'jogador');
  for (const t of [0, 1]) {
    $('#pj' + t).innerHTML = `
      <div class="ret"><img alt=""><span class="quem" style="background:${COR_TIME[t]}">${nomeDoTime(t)}</span></div>
      <div class="info">
        <div class="nome"><b></b><span class="tipos"></span></div>
        <div class="vida"><i class="atraso"></i><i class="atual"></i><span class="num"></span></div>
        <div class="linha2">
          <div class="energia" title="Ultimate"><i></i><span>ULT</span></div>
          <div class="guarda" title="Guarda"><i></i></div>
          <div class="subs" title="Substituições">${'<b></b>'.repeat(COMBATE.subsMax)}</div>
          <div class="megaIcone" title="Mega Evolução">M</div>
        </div>
        <div class="equipe"></div>
      </div>`;
    $('#golpesJ' + t).innerHTML = '';
  }
  atualizarPaineis(true);
  document.querySelectorAll('#toque [data-acao]').forEach(el => { if (!el._ligado) { el._ligado = true; ligarBotaoToque(el); } });
  $('#treinoPainel').classList.toggle('hidden', !JOGO.regras.treino);
  $('#relogio').classList.toggle('hidden', !JOGO.relogio);
}

// partes que só mudam quando troca o Pokémon em campo
function atualizarPaineis(forcar){
  for (const t of [0, 1]) {
    const L = lutador(t), el = $('#pj' + t); if (!L || !el) continue;
    if (!forcar && el._id === L.p.id && el._ativo === JOGO.ativo[t] && el._mega === !!L.mega) continue;
    el._id = L.p.id; el._ativo = JOGO.ativo[t]; el._mega = !!L.mega;
    { const im = el.querySelector('.ret img'); im.className = 'retr'; im.dataset.id = L.p.id; delete im.dataset.caiu; im.onerror = () => retratoErro(im); const rid = L.mega && S.retratos !== 'home' && typeof idSpriteMega === 'function' ? (idSpriteMega(L.p.id, megaDe(L)) || L.p.id) : L.p.id; im.src = RETRATO(rid); }   // V17: retrato da Mega
    el.querySelector('.nome b').textContent = L.mega ? megaDe(L).nome : L.p.nome;
    el.querySelector('.tipos').innerHTML = L.p.tipos.map(tp => `<span style="background:${TYPES[tp][1]}">${TYPES[tp][0]}</span>`).join('') +
      `<span class="estilo">${ESTILOS_LUTA[L.p.estilo].nome}</span>`;
    // reserva (assistências)
    const reserva = membrosReserva(t);
    el.querySelector('.equipe').innerHTML = JOGO.times[t].map((m, i) => {
      if (i === JOGO.ativo[t]) return '';
      const k = reserva.indexOf(m);
      return `<div class="mini ${m.vivo ? '' : 'caido'}" data-i="${i}"><img class="retr" src="${RETRATO(m.p.id)}" data-id="${m.p.id}" alt="" onerror="retratoErro(this)"><i class="hp"></i><i class="cd"></i>${k >= 0 && JOGO.controle[t] === 'jogador' ? `<kbd>${rotulo(JOGO.jogadorDoTime[t], 'assist' + k)}</kbd>` : ''}</div>`;
    }).join('');
    // golpes
    const n = JOGO.jogadorDoTime[t], mostrarTeclas = JOGO.controle[t] === 'jogador';
    $('#golpesJ' + t).innerHTML = L.p.golpes.map((g, i) => `<div class="golpe" style="--c:${TYPES[g.tipo][1]}">
      <b>${g.nome}</b>${mostrarTeclas ? `<kbd>${rotulo(n, 'golpe' + i)}</kbd>` : ''}<i class="cd"></i></div>`).join('') +
      (mostrarTeclas ? `<div class="golpe ult"><b>★ ${L.p.ult.nome}</b><kbd>${rotulo(n, 'ult')}</kbd><i class="cd"></i></div>` : '');
  }
  // botões de toque mostram os nomes dos golpes do J1
  const L0 = lutador(0);
  if (L0) document.querySelectorAll('#toque [data-acao^="golpe"]').forEach(b => { const g = L0.p.golpes[+b.dataset.acao.slice(5)]; b.textContent = g ? g.nome.split(' ')[0] : ''; b.style.setProperty('--c', g ? TYPES[g.tipo][1] : '#888'); });
}

let hudT = 0, tempoHud = 0;
function atualizarHUD(dt){
  // V10: interface a 30 Hz no desktop / 24 Hz no celular; a física continua na frequência da tela.
  // Evita dezenas de consultas e alterações de estilo HTML por quadro.
  tempoHud += dt;
  if (tempoHud < (DISPOSITIVO_MOVEL ? 1/24 : 1/30)) return;
  dt = tempoHud; tempoHud = 0;
  atualizarPaineis(false);
  for (const t of [0, 1]) {
    const L = lutador(t), el = $('#pj' + t); if (!L || !el) continue;
    const f = Math.max(0, L.hp/L.hpMax);
    const mg = el.querySelector('.megaIcone');
    mg.classList.toggle('some', !MEGAS[L.p.id] && !L.mega);
    mg.classList.toggle('pronta', podeMegaEvoluir(L) === true);
    mg.classList.toggle('ativa', !!L.mega);
    const atual = el.querySelector('.vida .atual'), atraso = el.querySelector('.vida .atraso');
    atual.style.width = (f*100) + '%';
    atual.style.background = f > .5 ? 'linear-gradient(90deg,#3ddc84,#8af0a8)' : f > .2 ? 'linear-gradient(90deg,#ffc93a,#ffe08a)' : 'linear-gradient(90deg,#ff4a5a,#ff8a8a)';
    // a barra branca "atrasada" desce devagar e mostra o tamanho do dano
    L._vidaAtraso = Math.max(f, (L._vidaAtraso ?? f) - dt*(L.atordoado > 0 || L.lancado ? .02 : .35));
    atraso.style.width = (L._vidaAtraso*100) + '%';
    el.querySelector('.vida .num').textContent = Math.ceil(L.hp);
    const en = el.querySelector('.energia'); en.querySelector('i').style.width = L.en + '%'; en.classList.toggle('cheia', L.en >= 100);
    const gd = el.querySelector('.guarda'); gd.querySelector('i').style.width = (L.guardaHP/L.guardaMax*100) + '%'; gd.classList.toggle('quebrada', L.quebrado > 0);
    el.querySelectorAll('.subs b').forEach((b, i) => { b.className = L.subs >= i + 1 ? 'on' : L.subs > i ? 'enchendo' : ''; });
    el.querySelectorAll('.equipe .mini').forEach(mini => {
      const m = JOGO.times[t][+mini.dataset.i];
      mini.querySelector('.hp').style.width = (m.hp/m.hpMax*100) + '%';
      mini.querySelector('.cd').style.height = (m.assistCd/(COMBATE.assistRecarga*(JOGO.regras.caos ? .4 : 1))*100) + '%';
      mini.classList.toggle('caido', !m.vivo);
    });
    $('#golpesJ' + t).querySelectorAll('.golpe').forEach((b, i) => {
      const cd = b.querySelector('.cd');
      if (b.classList.contains('ult')) { cd.style.height = (100 - L.en) + '%'; b.classList.toggle('pronto', L.en >= 100); return; }
      const g = L.p.golpes[i]; cd.style.height = (L.cds[i]/(g.recarga*(JOGO.regras.caos ? .35 : 1))*100) + '%';
    });
    // contador de combo
    const c = $('#combo' + t);
    if (L.comboHits >= 2) { c.innerHTML = `<b>${L.comboHits}</b> GOLPES<small>${Math.round(L.comboDano)} de dano</small>`; c.classList.add('mostrar'); }
    else c.classList.remove('mostrar');
  }
  // No celular os golpes aparecem como botões; indicar recarga e Ultimate pronta.
  if (hud.classList.contains('toque')) {
    const L = lutador(0);
    if (L) {
      for (let i = 0; i < 4; i++) {
        const b = document.querySelector('#toque [data-acao="golpe'+i+'"]'), g = L.p.golpes[i];
        if (!b || !g) continue;
        const rec = Math.max(0, L.cds[i]/Math.max(.01,g.recarga*(JOGO.regras.caos ? .35 : 1)));
        b.style.setProperty('--recarga', ((1-Math.min(1,rec))*100).toFixed(0)+'%');
        b.classList.toggle('recarregando', rec > .02);
        b.title = g.nome + (rec > .02 ? ' (recarregando)' : ' (pronto)');
      }
      const ult = document.querySelector('#toque .t-ult');
      ult.classList.toggle('pronto', L.en >= 100);
      ult.classList.toggle('recarregando', L.en < 100);
      ult.style.setProperty('--recarga', Math.max(0, L.en).toFixed(0)+'%');
      const reserva = membrosReserva(0);
      for (let i = 0; i < 2; i++) {
        const b = document.querySelector('#toque [data-acao="assist'+i+'"]'), m = reserva[i];
        b.classList.toggle('recarregando', !m || m.assistCd > 0);
        b.style.setProperty('--recarga', m ? ((1 - Math.min(1, m.assistCd/COMBATE.assistRecarga))*100).toFixed(0)+'%' : '0%');
      }
    }
  }
  // relógio
  if (JOGO.relogio) { const r = $('#relogio'); r.textContent = Math.max(0, Math.ceil(JOGO.relogio)); r.classList.toggle('pouco', JOGO.relogio < 10); }
  hudT -= dt;
  if (hudT <= 0) { hudT = .5; $('#rodadas').innerHTML = rodadasHTML(); }
}
function rodadasHTML(){
  const P = PARTIDA; if (!P || P.precisa <= 1) return '';
  return [0, 1].map(t => `<span class="r t${t}">${Array.from({ length: P.precisa }, (_, i) => `<i class="${P.vitorias[t] > i ? 'on' : ''}"></i>`).join('')}</span>`).join('<em>VS</em>');
}

let bannerT = null;
function banner(texto, cor, grande){
  const b = $('#banner');
  b.textContent = texto; b.style.setProperty('--c', cor || '#fff');
  b.className = 'mostrar' + (grande ? ' grande' : '');
  clearTimeout(bannerT); bannerT = setTimeout(() => b.className = '', grande ? 1600 : 1300);
}
// aviso do lado do jogador (CONTRA-ATAQUE!, ESQUIVA PERFEITA!...)
const avisoT = [null, null];
function avisoCombate(t, texto, cor){
  const a = $('#aviso' + t); if (!a) return;
  a.textContent = texto; a.style.setProperty('--c', cor); a.classList.remove('mostrar'); void a.offsetWidth; a.classList.add('mostrar');
  clearTimeout(avisoT[t]); avisoT[t] = setTimeout(() => a.classList.remove('mostrar'), 1300);
}
