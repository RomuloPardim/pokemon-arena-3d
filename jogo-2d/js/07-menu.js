/* =========================================================
   ESTADO / MENU
   ========================================================= */
const S = {
  size: store.get('size',6), diff: store.get('diff','normal'), aim: store.get('aim','mouse'),
  mapa: store.get('mapa','estadio'), som: store.get('som',true), musica: store.get('musica',true),
  fx: store.get('fx','completo'),
  team: store.get('team',[]).filter(id => BYID[id])
};
function save(){ store.set('size',S.size); store.set('diff',S.diff); store.set('aim',S.aim); store.set('team',S.team); store.set('mapa',S.mapa); store.set('som',S.som); store.set('musica',S.musica); store.set('fx',S.fx); }
function show(id){ for (const s of document.querySelectorAll('.screen')) s.classList.toggle('hidden', s.id !== id); }

function setupSeg(el, key, after){
  const btns = [...el.querySelectorAll('button')];
  const paint = () => btns.forEach(b => b.classList.toggle('on', b.dataset.v == S[key]));
  btns.forEach(b => b.onclick = () => { S[key] = isNaN(+b.dataset.v) ? b.dataset.v : +b.dataset.v; paint(); save(); after && after(); });
  paint();
}
setupSeg($('#segSize'),'size',() => { S.team = S.team.slice(0,S.size); save(); renderHome(); });
setupSeg($('#segDiff'),'diff');
setupSeg($('#segAim'),'aim');
setupSeg($('#segFx'),'fx');
// botões de áudio (true/false)
function paintAudio(){
  document.querySelectorAll('#segSom button').forEach(b => b.classList.toggle('on', (b.dataset.v === '1') === S.som));
  document.querySelectorAll('#segMus button').forEach(b => b.classList.toggle('on', (b.dataset.v === '1') === S.musica));
}
document.querySelectorAll('#segSom button').forEach(b => b.onclick = () => { S.som = b.dataset.v === '1'; save(); paintAudio(); audioInit(); sfx('click'); });
document.querySelectorAll('#segMus button').forEach(b => b.onclick = () => { S.musica = b.dataset.v === '1'; save(); paintAudio(); });
paintAudio();
// lista de mapas com miniatura
function renderMaps(){
  const box = $('#mapList');
  box.innerHTML = MAPS.map(m => `<button class="mapc ${S.mapa===m.id?'on':''}" data-id="${m.id}" title="${m.mecanica}"><canvas width="216" height="146"></canvas><b>${m.nome}</b><small>${m.desc}</small></button>`).join('')
    + `<button class="mapc ${S.mapa==='aleatorio'?'on':''}" data-id="aleatorio"><div class="rnd">🎲</div><b>Aleatório</b><small>Sorteia um mapa a cada batalha.</small></button>`;
  box.querySelectorAll('.mapc').forEach(c => {
    const cvs = c.querySelector('canvas');
    if (cvs) { const m = MAPBYID[c.dataset.id], g = cvs.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(buildThumb(m), 0, 0, 216, 146);
      const k = 216/(W + MARGEM*2);
      for (const [x,y,r,tipo] of m.obstaculos) { const sp = obstSprite(tipo, r); g.drawImage(sp.c, (x + MARGEM - sp.ox)*k, (y + MARGEM - sp.oy)*k, sp.c.width*PXA*k, sp.c.height*PXA*k); } }
    c.onclick = () => { S.mapa = c.dataset.id; save(); renderMaps(); sfx('click'); };
  });
}
if (isTouch) $('#aimPanel').classList.add('hidden');
$('#ctrlHint').innerHTML = isTouch
  ? 'Celular: joystick à esquerda para mover, botões à direita para os golpes (mira automática) e o botão PULO para esquivar. Toque nos retratos do topo para trocar de Pokémon. Pegue os itens que aparecem no mapa!'
  : 'PC: WASD ou setas para mover • mouse para mirar • clique ou teclas 1-4 para os golpes • Espaço (ou botão direito) para pular e esquivar • clique no retrato do seu time para trocar de Pokémon • P pausa. Pegue os itens que aparecem no mapa!';

function renderHome(){
  renderMaps();
  $('#teamCount').textContent = `${S.team.length}/${S.size}`;
  let h = '';
  for (let i=0;i<6;i++){
    if (i >= S.size) { h += `<div class="slot" style="opacity:.25">—</div>`; continue; }
    const p = BYID[S.team[i]];
    h += p ? `<div class="slot full" data-i="${i}">${sprHTML(p,40)}<span class="x">✕</span></div>` : `<div class="slot" data-add>+</div>`;
  }
  $('#homeSlots').innerHTML = h;
  $('#homeSlots').querySelectorAll('.slot.full').forEach(s => s.onclick = () => { S.team.splice(+s.dataset.i,1); save(); renderHome(); });
  $('#homeSlots').querySelectorAll('[data-add]').forEach(s => s.onclick = openBuilder);
}
$('#btnTeam').onclick = openBuilder;
$('#btnPlay').onclick = () => {
  if (S.team.length < S.size) fillRandom();
  startBattle();
};
function fillRandom(){
  const pool = POKES.map(p=>p.id).filter(id => !S.team.includes(id)).sort(() => Math.random()-.5);
  while (S.team.length < S.size) S.team.push(pool.pop());
  save();
}

/* ----- Montagem de equipe ----- */
let bFilter = 'all', bQuery = '';
function openBuilder(){ show('builder'); renderChips(); renderGrid(); }
$('#bBack').onclick = () => { show('home'); renderHome(); };
$('#bRand').onclick = () => { S.team = []; fillRandom(); renderGrid(); };
$('#bClear').onclick = () => { S.team = []; save(); renderGrid(); };
$('#bGo').onclick = () => { if (S.team.length < S.size) fillRandom(); startBattle(); };
$('#bSearch').oninput = e => { bQuery = e.target.value.toLowerCase().trim(); renderGrid(); };
function renderChips(){
  let h = `<button class="chip ${bFilter==='all'?'on':''}" data-t="all" style="${bFilter==='all'?'background:var(--blu)':''}">Todos</button>`;
  for (const [t,[pt,c]] of Object.entries(TYPES)) h += `<button class="chip ${bFilter===t?'on':''}" data-t="${t}" style="${bFilter===t?'background:'+c:''}">${pt}</button>`;
  $('#bChips').innerHTML = h;
  $('#bChips').querySelectorAll('.chip').forEach(c => c.onclick = () => { bFilter = c.dataset.t; renderChips(); renderGrid(); });
}
function statBar(v, c){ return `<div class="bar"><i style="width:${Math.min(100,v/160*100)}%;background:${c}"></i></div>`; }
function renderGrid(){
  $('#bCount').textContent = `· ${S.team.length}/${S.size}`;
  const list = POKES.filter(p => (bFilter==='all' || p.types.includes(bFilter)) &&
    (!bQuery || p.name.toLowerCase().includes(bQuery) || String(p.id).includes(bQuery)));
  $('#bGrid').innerHTML = list.map(p => {
    const idx = S.team.indexOf(p.id);
    return `<div class="card ${idx>=0?'sel':''}" data-id="${p.id}">
      ${idx>=0?`<span class="badge">${idx+1}</span>`:''}
      <div class="num">#${pad3(p.id)}</div>
      <div class="im">${sprHTML(p,70,true)}</div>
      <div class="nm">${p.name}</div>
      <div>${p.types.map(typeChip).join('')}</div>
      <div class="mini"><span>HP</span>${statBar(p.hp,'#3ddc84')}<span>ATQ</span>${statBar(p.atk,'#ff7a45')}<span>DEF</span>${statBar(p.def,'#3b7bff')}<span>VEL</span>${statBar(p.spe,'#ffd23f')}</div>
    </div>`;
  }).join('') || '<p class="hint">Nenhum Pokémon encontrado.</p>';
  $('#bGrid').querySelectorAll('.card').forEach(c => c.onclick = () => openDetail(+c.dataset.id));
}
function moveDesc(m){
  const x = [KIND_PT[m.k]];
  if (m.k==='heal') x.push(`recupera ${Math.round(m.amount*100)}% do HP`);
  if (m.k==='buff') { if (m.atk) x.push('dano +40%'); if (m.spd) x.push('velocidade +35%'); if (m.healPct) x.push('cura um pouco'); x.push(`por ${m.dur}s`); }
  if (m.k==='leap') x.push('invencível no ar, dano ao cair');
  if (m.burn) x.push('pode queimar');
  if (m.poison) x.push('pode envenenar');
  if (m.slow) x.push('deixa lento');
  if (m.stun) x.push('pode paralisar');
  if (m.drain) x.push('drena vida');
  if (m.homing) x.push('teleguiado');
  if (m.windup) x.push('precisa carregar');
  if (m.leavePool) x.push('deixa poça tóxica');
  if (m.recoil) x.push('causa dano em si mesmo');
  return x.join(' · ');
}
function openDetail(id){
  const p = BYID[id], idx = S.team.indexOf(id);
  const weak = Object.keys(TYPES).filter(t => effectiveness(t,p.types) >= 2);
  const resist = Object.keys(TYPES).filter(t => effectiveness(t,p.types) < 1);
  const st = [['HP',p.hp,'#3ddc84'],['ATQ',p.atk,'#ff7a45'],['DEF',p.def,'#3b7bff'],['VEL',p.spe,'#ffd23f']];
  openModal(`
    <div class="dtop">
      <div class="big">${sprHTML(p,110,true)}</div>
      <div style="flex:1;min-width:200px">
        <div style="color:var(--mut);font-size:12px">#${pad3(p.id)}</div>
        <div class="dname">${p.name}</div>
        <div>${p.types.map(typeChip).join('')}</div>
        <div class="stats">${st.map(([n,v,c]) => `<span>${n}</span><b>${v}</b>${statBar(v,c)}`).join('')}</div>
      </div>
    </div>
    <div class="mvlist">${p.moves.map((n,i) => { const m = MV[n]; return `
      <div class="mv" style="border-color:${TYPES[m.t][1]}">
        <b>${i+1}. ${m.n}</b> ${typeChip(m.t)}
        <p>${m.k==='heal'||m.k==='buff'?'':'Poder '+m.p+' · '}Recarga ${m.cd}s<br>${moveDesc(m)}</p>
      </div>`; }).join('')}</div>
    <div class="weak"><b style="color:var(--red)">Fraco contra:</b> ${weak.map(typeChip).join('') || '—'}</div>
    <div class="weak"><b style="color:var(--grn)">Resiste:</b> ${resist.map(typeChip).join('') || '—'}</div>
    <div class="mfoot">
      <button class="smbtn" id="mClose">Fechar</button>
      <button class="smbtn go" id="mToggle">${idx>=0 ? 'Remover da equipe' : (S.team.length>=S.size ? 'Equipe cheia' : '+ Adicionar à equipe')}</button>
    </div>`);
  $('#mClose').onclick = closeModal;
  $('#mToggle').onclick = () => {
    if (idx>=0) S.team.splice(idx,1); else if (S.team.length < S.size) S.team.push(id); else return;
    save(); closeModal(); renderGrid();
  };
}
function openModal(html){ $('#mbox').innerHTML = html; $('#modal').classList.remove('hidden'); }
function closeModal(){ $('#modal').classList.add('hidden'); }
$('#modal').onclick = e => { if (e.target.id === 'modal' && !G) closeModal(); };

