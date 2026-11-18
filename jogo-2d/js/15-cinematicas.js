"use strict";
/* =========================================================
   CINEMÁTICAS DO JOGO 2D (V15)
   1. Pokébola: é lançada, abre com luz e o Pokémon sai como silhueta branca.
   2. Mega Evolução (tecla G ou botão MEGA): a luta para, a câmera aproxima,
      energia do arco-íris, a forma Mega aparece. Charizard e Mewtwo escolhem X ou Y.
   3. Finalização: no último Pokémon — câmera lenta, "K.O.!" e close no vencedor.
   ========================================================= */

/* ----- Mega Evoluções -----
   spr = sprite da forma Mega no PMD Sprite Collab ("id/forma"); null = usa o sprite normal maior, com aura da cor
   atk / def / spe = multiplicadores    outra = segunda forma (X e Y)    primal = Reversão Primitiva */
const MEGAS_2D = {
  3: { nome:'Mega Venusaur', cor:'#7ac74c', atk:1.15, def:1.3, spe:1, spr:null },
  6: { nome:'Mega Charizard X', cor:'#3a8bff', atk:1.3, def:1.15, spe:1.05, spr:'6/0001', letra:'X', outra:{ nome:'Mega Charizard Y', cor:'#ff8a2a', atk:1.35, def:1.05, spe:1.05, spr:null, letra:'Y' } },
  9: { nome:'Mega Blastoise', cor:'#6390f0', atk:1.2, def:1.25, spe:1, spr:null },
  18: { nome:'Mega Pidgeot', cor:'#a98ff3', atk:1.2, def:1.1, spe:1.2, spr:null },
  26: { nome:'Mega Raichu X', cor:'#ffd84a', atk:1.25, def:1.05, spe:1.15, spr:null },
  65: { nome:'Mega Alakazam', cor:'#f95587', atk:1.25, def:1.05, spe:1.15, spr:'65/0001' },
  94: { nome:'Mega Gengar', cor:'#7a3fd0', atk:1.25, def:1.1, spe:1.1, spr:'94/0001' },
  130: { nome:'Mega Gyarados', cor:'#2a2a6a', atk:1.25, def:1.2, spe:1, spr:null },
  142: { nome:'Mega Aerodactyl', cor:'#b6a136', atk:1.2, def:1.1, spe:1.15, spr:'142/0001' },
  150: { nome:'Mega Mewtwo X', cor:'#9a6bff', atk:1.35, def:1.1, spe:1.05, spr:null, letra:'X', outra:{ nome:'Mega Mewtwo Y', cor:'#f95587', atk:1.25, def:1.05, spe:1.15, spr:'150/0002', letra:'Y' } },
  160: { nome:'Mega Feraligatr', cor:'#3a8bff', atk:1.25, def:1.15, spe:1.05, spr:null },
  181: { nome:'Mega Ampharos', cor:'#ffd84a', atk:1.25, def:1.15, spe:1, spr:null },
  212: { nome:'Mega Scizor', cor:'#b7b7ce', atk:1.2, def:1.25, spe:1, spr:null },
  214: { nome:'Mega Heracross', cor:'#4a6ad0', atk:1.3, def:1.15, spe:1, spr:null },
  229: { nome:'Mega Houndoom', cor:'#ee8130', atk:1.25, def:1.1, spe:1.1, spr:'229/0001' },
  248: { nome:'Mega Tyranitar', cor:'#705746', atk:1.2, def:1.25, spe:1, spr:'248/0001' },
  254: { nome:'Mega Sceptile', cor:'#7ac74c', atk:1.2, def:1.1, spe:1.15, spr:'254/0001' },
  257: { nome:'Mega Blaziken', cor:'#ee8130', atk:1.25, def:1.1, spe:1.15, spr:null },
  260: { nome:'Mega Swampert', cor:'#6390f0', atk:1.25, def:1.2, spe:1, spr:null },
  282: { nome:'Mega Gardevoir', cor:'#d685ad', atk:1.25, def:1.15, spe:1.05, spr:'282/0001' },
  306: { nome:'Mega Aggron', cor:'#b7b7ce', atk:1.1, def:1.35, spe:1, spr:null },
  359: { nome:'Mega Absol', cor:'#f0f0ff', atk:1.25, def:1.05, spe:1.15, spr:'359/0001' },
  376: { nome:'Mega Metagross', cor:'#b7b7ce', atk:1.2, def:1.2, spe:1.1, spr:null },
  380: { nome:'Mega Latias', cor:'#a66bff', atk:1.2, def:1.2, spe:1.05, spr:'380/0001' },
  381: { nome:'Mega Latios', cor:'#a66bff', atk:1.25, def:1.15, spe:1.05, spr:'381/0001' },
  382: { nome:'Kyogre Primitivo', cor:'#2a6aff', atk:1.2, def:1.2, spe:1.05, spr:'382/0001', primal:true },
  383: { nome:'Groudon Primitivo', cor:'#ff5a1a', atk:1.25, def:1.2, spe:1, spr:'383/0001', primal:true },
  384: { nome:'Mega Rayquaza', cor:'#3ddc84', atk:1.25, def:1.1, spe:1.1, spr:'384/0001' },
  445: { nome:'Mega Garchomp', cor:'#6f35fc', atk:1.25, def:1.15, spe:1, spr:null },
  448: { nome:'Mega Lucario', cor:'#3a8bff', atk:1.25, def:1.05, spe:1.15, spr:'448/0001' },
  475: { nome:'Mega Gallade', cor:'#7ac74c', atk:1.25, def:1.1, spe:1.1, spr:'475/0001' },
  491: { nome:'Mega Darkrai', cor:'#7a3fd0', atk:1.25, def:1.1, spe:1.1, spr:'491/0002' },
  658: { nome:'Mega Greninja', cor:'#3a8bff', atk:1.25, def:1.05, spe:1.15, spr:null },
};
const REGRAS_MEGA_2D = { custo: 50, liberaEm: 20, duracao: 2.2 };
let megaPedido = false;

function podeMega(f){
  const M = MEGAS_2D[f.p.id];
  if (!M) return 'sem Mega';
  if (f.mega) return 'já é Mega';
  if (G.megaUsada[f.team]) return 'Mega já usada';
  if (G.clock < REGRAS_MEGA_2D.liberaEm) return 'ainda não';
  if (f.en < REGRAS_MEGA_2D.custo) return 'pouca energia';
  if (!podeAgir(f) || f.air || f.dash || f.windup || f.entrada) return 'ocupado';
  return true;
}
function pedirMega(f, forma){
  const pode = podeMega(f);
  if (pode !== true) { if (f.team === 0 && pode !== 'sem Mega' && pode !== 'ocupado') floatText(f.x, f.y - f.topH - 30, pode.toUpperCase(), '#9aa6c0', 15); return false; }
  const base = MEGAS_2D[f.p.id];
  if (base.outra && !forma) {
    if (f.team === 0) { abrirEscolhaMega2D(f); return false; }
    forma = Math.random() < .5 ? base : base.outra;
  }
  const M = forma || base;
  f.en -= REGRAS_MEGA_2D.custo; G.megaUsada[f.team] = true;
  f.inv = Math.max(f.inv, REGRAS_MEGA_2D.duracao + .4); f.dir = f.team ? Math.PI : 0;
  if (M.spr) preloadSprites({ id: M.spr });
  G.megaCine = { f, M, t: 0, dur: REGRAS_MEGA_2D.duracao, trocou: false };
  setAct(f, animInfo(f.p.id, 'Charge') ? 'Charge' : 'Idle', 1.2, false);
  sfx('ult'); shake(4);
  return true;
}
// aplica a forma Mega (no meio da cinemática)
function aplicarMega(f, M){
  f.mega = M; f.megaMul = { atk: M.atk, def: M.def }; f.speed *= M.spe;
  if (M.spr && PMD[M.spr]) { f.spr = M.spr; const idle = animInfo(M.spr, 'Idle'); if (idle) f.topH = (idle[2]/2 + 8)*SPR; }
  else { f.megaEscala = 1.18; f.megaCor = M.cor; }
}
function atualizarMegaCine(dt){
  const R = G.megaCine, f = R.f; R.t += dt;
  if (R.t < R.dur*.45 && Math.random() < .6) {             // energia do arco-íris sendo puxada
    const a = rand(0, 7), d = rand(80, 160), cor = ['#ff5a9a','#ffd84a','#5af4ff','#a66bff', R.M.cor][Math.floor(rand(0, 5))];
    P({kind:'glow', x:f.x + Math.cos(a)*d, y:f.y - 30 + Math.sin(a)*d*.7, vx:-Math.cos(a)*d*2.2, vy:-Math.sin(a)*d*1.6, t:.45, size:9, col:cor});
  }
  if (!R.trocou && R.t >= R.dur*.5) {
    R.trocou = true; aplicarMega(f, R.M);
    G.flash = .5; G.flashCol = '255,255,255'; shake(10); sfx('boom');
    P({kind:'ring', x:f.x, y:f.y - 30, col:R.M.cor, t:.6, size:20, size2:260, vx:0, vy:0});
    P({kind:'ring', x:f.x, y:f.y - 30, col:'#ffffff', t:.4, size:10, size2:160, vx:0, vy:0});
    burst(f.p.types[0], f.x, f.y - 30, 40, 1.6);
    floatText(f.x, f.y - f.topH - 40, R.M.nome + '!', R.M.cor, 22);
    banner(R.M.primal ? 'REVERSÃO PRIMITIVA!' : 'MEGA EVOLUÇÃO!', R.M.nome, R.M.cor);
  }
  if (R.t >= R.dur) { G.megaCine = null; f.inv = Math.max(f.inv, .5); }
}
// silhueta branca durante a transformação (0..1)
function silhuetaMega(f){
  const R = G.megaCine; if (!R || R.f !== f) return 0;
  const k = R.t/R.dur;
  return k < .25 ? 0 : k < .5 ? (k - .25)/.25 : Math.max(0, 1 - (k - .5)/.25);
}

/* ----- Escolha Mega X / Mega Y (luta parada) ----- */
function abrirEscolhaMega2D(f){
  const M = MEGAS_2D[f.p.id], formas = [M, M.outra].sort((a, b) => (a.letra || '').localeCompare(b.letra || ''));
  G.escolha = { f, formas, sel: 0 };
  const el = $('#escolhaMega');
  el.innerHTML = `<h3>ESCOLHA A MEGA EVOLUÇÃO</h3><div class="opcoes">` +
    formas.map((m, i) => `<button class="opMega" data-i="${i}" style="--c:${m.cor}"><b>${m.letra}</b><span>${m.nome}</span></button>`).join('') +
    `</div><p class="dica">${isTouch ? 'toque para escolher' : '← → escolhe · ENTER ou G confirma · ESC cancela'}</p>`;
  el.querySelectorAll('.opMega').forEach(b => b.addEventListener('click', () => escolherMega2D(+b.dataset.i)));
  el.classList.remove('hidden'); marcarEscolha2D(); sfx('click');
}
function marcarEscolha2D(){ if (!G || !G.escolha) return; $('#escolhaMega').querySelectorAll('.opMega').forEach((b, i) => b.classList.toggle('sel', i === G.escolha.sel)); }
function fecharEscolha2D(){ if (G) G.escolha = null; $('#escolhaMega').classList.add('hidden'); }
function escolherMega2D(i){ if (!G || !G.escolha) return; const E = G.escolha; fecharEscolha2D(); pedirMega(E.f, E.formas[i]); }
addEventListener('keydown', e => {
  if (!G || !G.escolha) return;
  const k = e.key.toLowerCase();
  if (['arrowleft','arrowright','a','d'].includes(k)) { G.escolha.sel = 1 - G.escolha.sel; marcarEscolha2D(); sfx('click'); }
  else if (k === '1' || k === 'x') escolherMega2D(0);
  else if (k === '2' || k === 'y') escolherMega2D(1);
  else if (k === 'enter' || k === 'g' || k === ' ') escolherMega2D(G.escolha.sel);
  else if (k === 'escape') fecharEscolha2D();
  e.stopImmediatePropagation(); e.preventDefault();
}, true);
addEventListener('keydown', e => { if (G && !G.over && !G.escolha && CONTROLES.mega.includes(e.key.toLowerCase()) && !e.repeat) megaPedido = true; });

/* ----- Pokébola ----- */
const POKEBOLA = { voo: .45, abre: .62, fim: 1.35 };
// chamado em bringOut: o Pokémon só aparece quando a bola abre
function iniciarEntrada(f, rapido){
  const lado = f.team ? 1 : -1;
  f.entrada = { t: 0, rapido, abre: rapido ? .22 : POKEBOLA.abre, voo: rapido ? .14 : POKEBOLA.voo, fim: rapido ? .9 : POKEBOLA.fim,
    ox: f.x + lado*280, oy: f.y + 60, abriu: false };
  f.inv = Math.max(f.inv, f.entrada.fim + .4); f.spawnT = 0;
}
function atualizarEntradas(dt){
  for (const ti of [0, 1]) { const f = active(ti); if (!f || !f.entrada) continue;
    const E = f.entrada; E.t += dt;
    if (!E.abriu && E.t >= E.abre) {
      E.abriu = true; f.spawnT = .5; f.sil = 1;
      for (let i = 0; i < 18; i++) { const a = i/18*Math.PI*2; P({kind:'spark', x:f.x, y:f.y - 40, vx:Math.cos(a)*300, vy:Math.sin(a)*260, t:.35, size:3, col:i % 2 ? '#ff4d6a' : '#ffffff'}); }
      P({kind:'ring', x:f.x, y:f.y - 20, col:'#ffffff', t:.4, size:10, size2:110, vx:0, vy:0});
      P({kind:'impact', x:f.x, y:f.y - 30, col:'#ffffff', t:.3, size:120, rot:0});
      G.flash = Math.max(G.flash, .15); G.flashCol = '255,255,255'; sfx('spawn');
    }
    if (E.abriu && f.sil > 0) f.sil = Math.max(0, f.sil - dt*(E.t > E.abre + .45 ? 3 : .4));
    if (E.t >= E.fim) { f.entrada = null; f.sil = 0; }
  }
}
// posição da bola no ar (mundo)
function posBola(f){
  const E = f.entrada, s = Math.min(1, E.t/E.voo), ax = f.x, ay = f.y - 40;
  const x = E.ox + (ax - E.ox)*s, y = E.oy + (ay - E.oy)*s - Math.sin(s*Math.PI)*(E.rapido ? 60 : 170);
  return { x, y, s };
}
function desenharPokebolas(now){
  for (const ti of [0, 1]) { const f = active(ti); if (!f || !f.entrada) continue;
    const E = f.entrada, b = posBola(f);
    let abre = E.t >= E.abre ? Math.min(1, (E.t - E.abre)/.12) : 0, alpha = E.t > E.fim - .25 ? Math.max(0, (E.fim - E.t)/.25) : 1;
    let y = b.y; if (E.t >= E.abre) y -= (E.t - E.abre)*60;
    const giro = b.s < 1 ? E.t*22 : Math.sin(E.t*40)*.25*Math.max(0, 1 - (E.t - E.voo)/(E.abre - E.voo));
    const r = 13;
    ctx.save(); ctx.translate(b.x, y); ctx.globalAlpha = alpha;
    // raios de luz saindo da bola aberta
    if (abre > 0 && E.t < E.abre + .45) { ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 7; i++) { const a = -Math.PI/2 + (i - 3)*.32 + Math.sin(now*20 + i)*.05;
        ctx.strokeStyle = i % 2 ? 'rgba(255,90,110,.75)' : 'rgba(255,255,255,.85)'; ctx.lineWidth = 6 - Math.abs(i - 3);
        const L = 55 + Math.sin(now*30 + i*2)*15; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a)*L, Math.sin(a)*L); ctx.stroke(); }
      ctx.globalCompositeOperation = 'source-over'; }
    ctx.rotate(giro);
    // metade de baixo (branca)
    ctx.fillStyle = '#f4f4f4'; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI); ctx.fill();
    // metade de cima (vermelha) — gira para abrir
    ctx.save(); ctx.translate(-r, 0); ctx.rotate(-abre*1.9); ctx.translate(r, 0);
    ctx.fillStyle = '#e3262e'; ctx.beginPath(); ctx.arc(0, 0, r, Math.PI, 0); ctx.fill();
    ctx.fillStyle = '#ffffff55'; ctx.beginPath(); ctx.ellipse(-4, -6, 4, 2.5, -.5, 0, 7); ctx.fill();
    ctx.restore();
    ctx.strokeStyle = '#1b1b1b'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-r, 0); ctx.lineTo(r, 0); ctx.stroke();
    ctx.fillStyle = E.t > E.voo && E.t < E.abre ? '#fffbcc' : '#ffffff'; ctx.beginPath(); ctx.arc(0, 0, 4.5, 0, 7); ctx.fill(); ctx.stroke();
    ctx.restore();
    // feixe de luz da bola até o Pokémon
    if (abre > 0 && E.t < E.abre + .4) { const k = 1 - (E.t - E.abre)/.4;
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = k;
      const g = ctx.createLinearGradient(b.x, y, f.x, f.y);
      g.addColorStop(0, '#ffffff'); g.addColorStop(1, 'rgba(255,90,110,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(b.x - 4, y); ctx.lineTo(b.x + 4, y); ctx.lineTo(f.x + 36, f.y); ctx.lineTo(f.x - 36, f.y); ctx.closePath(); ctx.fill();
      ctx.restore(); }
    ctx.globalAlpha = 1;
  }
}

/* ----- Finalização (último Pokémon desmaiou) ----- */
function finalizacao2D(f){
  G.finalKO = { f, t: 0, x: f.x, y: f.y };
  G.slowT = Math.max(G.slowT, 1.6); G.hitstop = .2; shake(14);
  G.flash = .6; G.flashCol = '255,255,255'; sfx('boom');
  P({kind:'ring', x:f.x, y:f.y - 30, col:'#ffffff', t:.7, size:20, size2:320, vx:0, vy:0});
  const el = $('#textoKO'); if (el) { el.classList.remove('mostrar'); void el.offsetWidth; el.classList.add('mostrar'); setTimeout(() => el.classList.remove('mostrar'), 2200); }
  cv.classList.add('ko');
  setTimeout(() => cv.classList.remove('ko'), 1700);
}

/* ----- Câmera das cinemáticas: devolve { x, y, zoom } ou null ----- */
function focoCinematico(){
  if (!G) return null;
  if (G.megaCine) { const f = G.megaCine.f, k = G.megaCine.t/G.megaCine.dur; return { x: f.x, y: f.y - 40, zoom: 1.6 + Math.sin(Math.min(1, k)*Math.PI)*.2 }; }
  if (G.finalKO && G.finalKO.t < 2.2) return { x: G.finalKO.x, y: G.finalKO.y - 30, zoom: 1.4 + G.finalKO.t*.08 };
  if (G.vencedor && G.vencedor.f && G.vencedor.f.alive) return { x: G.vencedor.f.x, y: G.vencedor.f.y - 40, zoom: 1.6 };
  return null;
}
// barras de cinema e escurecido (tela)
function desenharCinema2D(now){
  const ativo = G.megaCine || (G.finalKO && G.finalKO.t < 2.2) || G.vencedor;
  G.barras = (G.barras || 0) + ((ativo ? 1 : 0) - (G.barras || 0))*.12;
  if (G.barras < .01) return;
  const h = VH*.1*G.barras;
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  if (G.megaCine) { ctx.fillStyle = `rgba(10,6,30,${.35*G.barras})`; ctx.fillRect(0, 0, VW, VH); }
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, VW, h); ctx.fillRect(0, VH - h, VW, h);
  if (G.megaCine) {                       // nome da Mega no rodapé
    const R = G.megaCine, a = Math.min(1, R.t*3)*(R.t > R.dur - .3 ? (R.dur - R.t)/.3 : 1);
    ctx.globalAlpha = a; ctx.font = `${Math.min(26, VW/30)}px "Press Start 2P", monospace`; ctx.textAlign = 'center';
    ctx.lineWidth = 6; ctx.strokeStyle = '#000'; const txt = R.trocou ? R.M.nome.toUpperCase() + '!' : 'MEGA EVOLUÇÃO...';
    ctx.strokeText(txt, VW/2, VH - h - 18); ctx.fillStyle = R.M.cor; ctx.fillText(txt, VW/2, VH - h - 18); ctx.globalAlpha = 1;
  }
}
// aura de arco-íris em volta de quem está Mega Evoluindo (mundo)
function desenharAuraMega(now){
  const R = G.megaCine; if (!R) return;
  const f = R.f, k = R.t/R.dur, r = 60 + Math.sin(Math.min(1, k*2)*Math.PI)*40;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 12; i++) { const a = now*2 + i/12*Math.PI*2, cor = `hsla(${(i*30 + now*200) % 360},100%,60%,${.35*(1 - Math.max(0, k - .5)*2)})`;
    ctx.strokeStyle = cor; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(f.x, f.y - 35, r + i*2, a, a + .9); ctx.stroke(); }
  ctx.globalAlpha = .5; const s = r*2.2; ctx.drawImage(glowTex(R.M.cor), f.x - s/2, f.y - 35 - s/2, s, s);
  ctx.restore();
}

/* ----- Tela de abertura ----- */
function iniciarAbertura2D(){
  const el = $('#abertura'); if (!el) return;
  show('abertura');
  const ids = POKES.map(p => p.id).sort(() => Math.random() - .5);
  // desfile de Pokémon andando embaixo
  const fila = $('#abFila'); fila.innerHTML = '';
  ids.slice(0, 12).forEach((id, i) => { const im = document.createElement('img'); im.src = ANI(id); im.onerror = () => im.remove();
    im.style.animationDelay = (-i*1.6) + 's'; fila.appendChild(im); });
  // Pokébola do meio: abre de tempos em tempos e solta um Pokémon
  let n = 0;
  const soltar = () => {
    if (el.classList.contains('hidden')) return;
    const bola = $('#abBola'), poke = $('#abPoke');
    bola.classList.remove('abre'); poke.classList.remove('sai'); void bola.offsetWidth;
    poke.src = ANI(ids[(n++) % ids.length]);
    bola.classList.add('abre'); poke.classList.add('sai');
    setTimeout(soltar, 3600);
  };
  setTimeout(soltar, 700);
  const sair = e => {
    if (el.classList.contains('hidden')) return;
    if (e && e.preventDefault) e.preventDefault();
    sfx('go'); el.classList.add('saindo');
    setTimeout(() => { el.classList.remove('saindo'); show('home'); renderHome(); }, 350);
  };
  addEventListener('keydown', e => { if (!el.classList.contains('hidden')) { e.stopImmediatePropagation(); sair(e); } }, true);
  el.addEventListener('pointerdown', sair);
  $('#abToque').textContent = isTouch ? 'TOQUE PARA COMEÇAR' : 'PRESSIONE QUALQUER TECLA';
}
