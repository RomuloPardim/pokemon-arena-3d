/* =========================================================
   ULTIMATES
   jeitos: meteoro (chuva de meteoros), tempestade (raios em sequência), ilusao (clones sombrios),
           rajada (sequência rapidíssima de golpes), esfera (esfera gigante teleguiada), nova (explosão enorme)
   ========================================================= */
const ULT_NOME = { fire:'Inferno Ancestral', water:'Maremoto', grass:'Fúria da Floresta', electric:'Gigavolt', ice:'Era Glacial', fighting:'Golpe Final',
  poison:'Praga Tóxica', ground:'Terremoto Titânico', flying:'Furacão Celeste', psychic:'Psicoerupção', bug:'Enxame Devastador', rock:'Avalanche',
  ghost:'Pesadelo Sombrio', dragon:'Fúria Dracônica', dark:'Noite Eterna', steel:'Colapso de Aço', fairy:'Luz Feérica', normal:'Hiper Explosão' };
const ULT_JEITO = { fire:'meteoro', dragon:'meteoro', rock:'meteoro', ground:'meteoro', electric:'tempestade', ghost:'ilusao', dark:'ilusao',
  fighting:'esfera', psychic:'esfera', steel:'esfera' };
// Ultimates próprias de alguns Pokémon: id → [jeito, nome, tipo]
const ULT_ESPECIAL = {
  6:['meteoro','Inferno Ancestral','fire'], 25:['tempestade','Gigavolt','electric'], 26:['tempestade','Supercarga','electric'],
  94:['ilusao','Pesadelo Sombrio','ghost'], 658:['rajada','Shuriken Supremo','water'], 448:['esfera','Aura Absoluta','fighting'],
  150:['esfera','Psicoerupção','psychic'], 135:['tempestade','Trovão Veloz','electric'], 461:['rajada','Garra da Nevasca','ice'],
  778:['ilusao','Brincadeira Sombria','ghost'], 9:['nova','Hidrocanhão Total','water'], 143:['nova','Soneca Sísmica','normal'],
  149:['meteoro','Chuva de Dragões','dragon'], 373:['meteoro','Fúria Celeste','dragon'], 445:['rajada','Investida Sísmica','dragon']
};
function ultOf(p){
  const e = ULT_ESPECIAL[p.id]; if (e) return {k:e[0], nome:e[1], t:e[2]};
  const t = p.types[0]; let k = ULT_JEITO[t] || 'nova';
  if (p.spe >= 120 && k !== 'tempestade') k = 'rajada';
  return {k, nome:ULT_NOME[t], t};
}
const ULT_DESC = { meteoro:'chuva de meteoros na área do alvo', tempestade:'sequência de raios na área do alvo', ilusao:'clones sombrios atacam de todos os lados',
  rajada:'sequência rapidíssima de golpes, invencível', esfera:'carrega e lança uma esfera gigante teleguiada', nova:'explosão gigante ao redor de si' };

/* =========================================================
   BATALHA
   ========================================================= */
const FOOT = 12;   // distância do centro do Pokémon até o "pé" (onde fica a sombra)
const HGT = 18;    // altura em que os golpes voam acima do chão
const SPR = 2.5;   // escala dos sprites andando (PMD)
let MAP = MAPS[0], OBST = [], TERR = [];
const DIFF = {
  easy:{think:.45, err:.35, mul:.8, lead:false, dodge:0, jump:0},
  normal:{think:.25, err:.14, mul:1, lead:false, dodge:.35, jump:.25},
  hard:{think:.12, err:.05, mul:1.15, lead:true, dodge:.75, jump:.6}
};
const ITENS = {
  oran:    {nome:'Fruta Oran', cor:'#3b7bff', icone:'🫐'},
  ataque:  {nome:'Ataque X',  cor:'#ff4d6a', icone:'⚔'},
  veloz:   {nome:'Velocidade X', cor:'#ffd23f', icone:'➤'},
  escudo:  {nome:'Escudo',    cor:'#9cf0ff', icone:'⛨'},
  energia: {nome:'Energia',   cor:'#ffb300', icone:'⚡'}
};
const SORTEIO_ITENS = ['oran','oran','ataque','veloz','escudo','energia'];
// "Natureza": quem causa o dano de eventos e explosões (não pertence a nenhum time)
const NAT = {p:{atk:100, types:[], name:'Natureza'}, team:-1, alive:true, en:0, dmg:0, bAtk:0, x:0, y:0};
let G = null;
const cv = $('#cv'), ctx = cv.getContext('2d');
let VW = 0, VH = 0, DPR = 1;
function resize(){
  DPR = Math.min(window.devicePixelRatio||1, 2);
  VW = innerWidth; VH = innerHeight;
  cv.width = VW*DPR; cv.height = VH*DPR;
}
addEventListener('resize', resize); resize();
if (window.visualViewport) visualViewport.addEventListener('resize', resize);
addEventListener('orientationchange', () => setTimeout(resize, 300));
const FX_LEVE = () => S.fx === 'leve';

/* ----- Sprites andando (PMD Sprite Collab) ----- */
// id pode ser "6/0001" = forma (ex.: Mega Charizard X) dentro da pasta do Pokémon
const PMD_URL = (id, anim) => { const [n, forma] = String(id).split('/');
  return `https://raw.githubusercontent.com/PMDCollab/SpriteCollab/master/sprite/${n.padStart(4,'0')}/${forma ? forma + '/' : ''}${anim}-Anim.png`; };
const sheetCache = {};
function getSheet(id, src){
  const k = id + '/' + src;
  if (!sheetCache[k]) { const im = new Image(); im.onerror = () => im.failed = true; im.src = PMD_URL(id, src); sheetCache[k] = im; }
  return sheetCache[k];
}
function animInfo(id, name){
  const d = PMD[id]; if (!d) return null;
  const a = d.a;
  return a[name] || (['Shoot','Strike','Swing','Rotate'].includes(name) ? a.Attack : null) || a.Idle || a.Walk;
}
// linhas da folha: 0 baixo, 1 baixo-dir, 2 dir, 3 cima-dir, 4 cima, 5 cima-esq, 6 esq, 7 baixo-esq
const DIR_ROW = [2,1,0,7,6,5,4,3];
const dirRow = a => DIR_ROW[((Math.round(a/(Math.PI/4)) % 8) + 8) % 8];

function preloadSprites(p){
  for (const n of ['Idle','Walk','Attack','Shoot','Charge','Hurt','Hop','Rotate','Strike']) { const i = animInfo(p.id, n); if (i) getSheet(p.id, i[0]); }
  if (typeof p.id === 'number') getImg(p.id);
  const M = typeof MEGAS_2D !== 'undefined' && MEGAS_2D[p.id];          // já deixa a Mega carregando
  if (M) for (const f of [M, M.outra]) if (f && f.spr) for (const n of ['Idle','Walk','Attack']) { const i = animInfo(f.spr, n); if (i) getSheet(f.spr, i[0]); }
}
/* ----- Terreno ----- */
function terrainAt(x, y){
  if (G) {
    for (const t of G.tempTerr) { const dx = (x-t.x)/t.rx, dy = (y-t.y)/t.ry; if (dx*dx + dy*dy < 1) return t.tipo; }
  }
  for (let i=TERR.length-1;i>=0;i--) { const t = TERR[i];
    if (inTerrain(t, x, y)) { if (t.tipo === 'mato' && G && G.burnt.some(b => Math.hypot(b.x-x, b.y-y) < b.r)) return 'queimado'; return t.tipo; } }
  return MAP.base === 'abismo' ? 'abismo' : null;
}
const voa = f => f.lev || f.p.types.includes('flying');
const solid = o => !(o.pai || o).dead;
function ruimPara(f, x, y){
  const t = terrainAt(x, y);
  if (t === 'abismo' && !voa(f)) return 3;
  if (t === 'lava' && !f.p.types.includes('fire') && !voa(f)) return 2;
  if (t === 'veneno' && !f.p.types.includes('poison') && !f.p.types.includes('steel') && !voa(f)) return 1.5;
  for (const z of G.fields) if (!f.p.types.includes('electric') && Math.hypot(z.x-x, z.y-y) < z.r) return 1.5;
  for (const z of G.fires) if (z.team !== f.team && Math.hypot(z.x-x, z.y-y) < z.r) return 1.5;
  for (const z of G.warns) if (Math.hypot(z.x-x, z.y-y) < z.r + 10) return 2;
  return 0;
}

/* ----- Criação ----- */
function mkFighter(p, team){
  preloadSprites(p);
  const idle = animInfo(p.id, 'Idle');
  return { p, team, moves:p.moves.map(n => MV[n]), maxhp:p.hp*2+150, hp:p.hp*2+150, x:0, y:0, r:24,
    cds:[0,0,0,0], aim: team ? Math.PI : 0, dir: team ? Math.PI : 0, st:{burn:0,poison:0,slow:0,stun:0}, mk:{molhado:0, frio:0, congelado:0},
    dash:null, windup:null, jump:null, leap:null, rush:null, air:false, jumpCd:0, alive:true, inv:0, flash:0, moving:false,
    label:null, labelT:0, hurtT:0, ghostT:0, vx:0, vy:0, mvx:0, mvy:0, z:0, spawnT:0, tpCd:0, bob:0, atkT:0,
    bAtk:0, bSpd:0, shield:false, hidden:false, reveal:0, terr:null, dmg:0, en:0, ult:ultOf(p), lastMove:null,
    act:null, animName:'Idle', animStart:0, animRate:1,
    topH: idle ? (idle[2]/2 + 8)*SPR : 70, shadow: [12,16,22][PMD[p.id] ? PMD[p.id].sh : 1] || 16,
    lev: p.types.includes('flying') || p.types.includes('ghost') || [151, 251, 380, 381, 385, 386, 491, 800].includes(p.id),   // flutuam
    speed:150 + p.spe*1.5, ai:{t:0, mx:0, my:0, strafe:1, strafeT:0, lastX:W/2, lastY:H/2, swT:0} };
}
function prepObstacles(){
  OBST = [];
  for (const [x,y,r,tipo] of MAP.obstaculos) {
    const d = OBJ[tipo] || {};
    const o = {x, y, r, tipo, hp:d.hp || 0, maxhp:d.hp || 0, dead:false, respawnT:0, hitT:0, cd:0};
    OBST.push(o);
    for (const [dx,dy,rr] of (PARTES[tipo] || [])) OBST.push({x:x + dx*r, y:y + dy*r, r:r*rr, tipo, pai:o, filho:true});
    if (PARTES[tipo]) o.r = r*.85;
  }
}
function startBattle(){
  closeModal();
  if (S.team.length < S.size) fillRandom();
  const escolha = S.mapa === 'aleatorio' ? MAPS[Math.floor(Math.random()*MAPS.length)] : (MAPBYID[S.mapa] || MAPS[0]);
  MAP = escolha; prepMap(MAP); TERR = MAP.terrenos; for (const t of TERR) t.extra = 0;
  prepObstacles();
  const mine = S.team.slice(0,S.size).map(id => BYID[id]);
  const foe = POKES.slice().sort(() => Math.random()-.5).slice(0,S.size);
  G = {
    teams:[], time:180, proj:[], zones:[], pools:[], beams:[], parts:[], texts:[], waves:[], slashes:[],
    strikes:[], ghosts:[], decals:[], dying:[], items:[], itemT:9, hitstop:0, flash:0, flashCol:'255,255,255',
    amb:[], warns:[], fields:[], fires:[], vines:[], burnt:[], tempTerr:[], traps:[], clones:[], recalls:[], sched:[],
    ev:null, evT:rand(15, 21), clock:0, evIdx:0, tide:0, hype:0, slowT:0, cine:null, dark:0, fog:0, wind:0,
    over:false, paused:true, started:false, stats:{dealt:[0,0], ko:[0,0], combos:[0,0], perfeitas:[0,0], ults:[0,0]}, cam:{x:W/2,y:H/2}, shake:0,
    diff:DIFF[S.diff], scale:1, megaUsada:[false,false], megaCine:null, escolha:null, finalKO:null, vencedor:null
  };
  cv.classList.remove('ko');
  G.teams = [ {f:mine.map(p => mkFighter(p,0)), a:-1, sw:0, pend:0},
              {f:foe.map(p => mkFighter(p,1)), a:-1, sw:0, pend:0} ];
  bringOut(0,0,250,H/2,true); bringOut(1,0,W-250,H/2,true);
  buildHud();
  show('battle');
  showVs();
  setTimeout(() => { if (G) buildGround(MAP); }, 30);
}
function showVs(){
  const card = (f,i) => `<div class="vsc" style="animation-delay:${i*.06}s">${sprHTML(f.p,60,true)}<span>${f.p.name}</span></div>`;
  const vs = $('#vs');
  vs.innerHTML = `<div class="vsl" style="color:#9cc2ff">VOCÊ</div>
    <div class="vsrow">${G.teams[0].f.map(card).join('')}</div>
    <div class="vsmid" id="vsN">VS</div>
    <div class="vsrow">${G.teams[1].f.map(card).join('')}</div>
    <div class="vsl" style="align-self:flex-end;margin-right:6px;color:#ffb0c0">RIVAL · ${{easy:'Fácil',normal:'Normal',hard:'Difícil'}[S.diff]}</div>
    <div class="vsmap">📍 ${MAP.nome}<small>${MAP.mecanica}</small></div>`;
  vs.classList.remove('hidden');
  let n = 3; const g = G;
  const tick = () => {
    if (G !== g) return;
    if (n === 0) { $('#vsN').textContent = 'LUTE!'; sfx('go'); setTimeout(() => { vs.classList.add('hidden'); if (G === g){ G.paused = false; G.started = true; } }, 600); return; }
    sfx('click'); $('#vsN').textContent = n--; setTimeout(tick, 750);
  };
  setTimeout(tick, 900);
}
function active(ti){ const t = G.teams[ti]; return t.a >= 0 ? t.f[t.a] : null; }
function bringOut(ti, idx, x, y, silent){
  const t = G.teams[ti], f = t.f[idx];
  t.a = idx; f.x = x; f.y = y; f.inv = 1.2; f.dash = null; f.windup = null; f.jump = null; f.leap = null; f.rush = null; f.air = false; f.z = 0;
  f.mvx = f.mvy = 0; f.spawnT = .5; f.act = null;
  f.aim = f.dir = ti ? Math.PI : 0;
  pushOut(f);
  iniciarEntrada(f, !!G.started);          // V15: Pokébola lançada; o Pokémon sai quando ela abre
  sfx('recall');
  if (!silent) floatText(f.x, f.y-90, (ti ? 'Rival: ' : 'Vai, ') + f.p.name + '!', '#fff', 18);
}
// Troca: animação de volta para a pokébola, entrada com impacto e bônus de "Troca Tática"
function switchTo(ti, i){
  const t = G.teams[ti], cur = active(ti), nf = t.f[i];
  G.recalls.push({f:cur, x:cur.x, y:cur.y, dir:cur.dir, t:.35, max:.35}); sfx('recall');
  bringOut(ti, i, cur.x, cur.y);
  t.sw = 6;
  const opp = active(1-ti);
  // entrada com impacto
  G.sched.push({t:.35, fn:() => { if (!nf.alive || active(ti) !== nf) return;
    const m = {n:'Entrada', t:nf.p.types[0], k:'nova', p:35, radius:110};
    G.waves.push({x:nf.x, y:nf.y, r:20, max:110, t:.35, maxT:.35, type:m.t, col:TC(m.t)});
    if (opp && Math.hypot(opp.x-nf.x, opp.y-nf.y) < 110 + opp.r) { hit(nf, opp, m); const a = Math.atan2(opp.y-nf.y, opp.x-nf.x); opp.x += Math.cos(a)*40; opp.y += Math.sin(a)*40; pushOut(opp); } }});
  // troca tática: entrou resistindo ao último golpe do rival
  if (opp && opp.lastMove && G.clock - opp.lastMove.at < 2 && effectiveness(opp.lastMove.t, nf.p.types) < 1) {
    nf.en = Math.min(100, nf.en + 25); nf.bAtk = Math.max(nf.bAtk, 4);
    floatText(nf.x, nf.y - nf.topH - 40, 'Troca Tática!', '#7cf0ff', 18); sfx('combo');
  }
}

