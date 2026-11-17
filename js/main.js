"use strict";
/* =========================================================
   PRINCIPAL — configurações, carregamento da luta, loop do jogo, vitrine
   ========================================================= */
const guardar = {
  get(k, padrao){ try { const v = localStorage.getItem('pa3d_' + k); return v === null ? padrao : JSON.parse(v); } catch (e) { return padrao; } },
  set(k, v){ try { localStorage.setItem('pa3d_' + k, JSON.stringify(v)); } catch (e) {} },
};
const S = {
  mapa: guardar.get('mapa', 'estadio'), dif: guardar.get('dif', 'normal'), tamanhoTime: guardar.get('tamanhoTime', 3),
  qualidade: guardar.get('qualidade', 'auto'), mostrarFps: guardar.get('mostrarFps', false), ultAnim: guardar.get('ultAnim', 'completa'), tempo: guardar.get('tempo', 99),
  vibracao: guardar.get('vibracao', true), som: guardar.get('som', true), musica: guardar.get('musica', true),
  torneioQtd: guardar.get('torneioQtd', 4), torneioHumanos: guardar.get('torneioHumanos', 1), p2Teclado: guardar.get('p2Teclado', false),
};
if (!MAPAS[S.mapa]) S.mapa = 'estadio';
// Migração da V8: primeiro acesso mobile usa Auto, mesmo que a V8 guardasse Média/Alta.
if (DISPOSITIVO_MOVEL && !guardar.get('v9MobileMigrado', false)) { S.qualidade = 'auto'; guardar.set('qualidade','auto'); guardar.set('v9MobileMigrado',true); }
function salvar(){ for (const k of Object.keys(S)) guardar.set(k, S[k]); }
somLigado = S.som;

/* ----- Carregar uma luta (uma rodada) ----- */
async function carregarLuta(P){
  const carga = $('#carregando'), barra = $('#carregando i'), txt = $('#carregando p');
  carga.classList.remove('hidden');
  const ids = [...P.times[0], ...P.times[1]];
  try {
    const times = [[], []];
    let feitos = 0;
    for (const t of [0, 1]) for (const id of P.times[t]) {
      txt.textContent = `Carregando ${POR_ID[id].nome}${POR_ID[id].online && !CACHE_MODELOS[id] ? ' (baixando modelo online…)' : ''}`;
      times[t].push(await criarMembro(id, t)); feitos++; barra.style.width = (feitos/ids.length*100) + '%';
    }
    limparVitrine(); limparEfeitos();
    criarArena(P.mapa);
    Object.assign(JOGO, { times, ativo: [0, 0], projeteis: [], agenda: [], tempo: 0, trocaCd: [0, 0], megas: [0, 0], cineAtiva: null, fim: false, pausado: false,
      controle: P.controle.slice(), jogadorDoTime: P.jogadorDoTime.slice(), nomes: P.nomes || null, difId: S.dif, dif: DIFICULDADE[S.dif],
      estat: [novaEstat(), novaEstat()], ultsVistas: new Set(), intro: 0,
      treino: { comportamento: 'parado', vidaInfinita: true, energiaInf: false, semRecarga: false, invencivel: false } });
    JOGO.estado = 'batalha';
    colocarEmCampo(lutador(1), posInicial(1));
    colocarEmCampo(lutador(0), posInicial(0));
    lutador(0).rumo = Math.atan2(-posInicial(0).x, -posInicial(0).z); lutador(1).rumo = Math.atan2(-posInicial(1).x, -posInicial(1).z);
    document.querySelectorAll('.tela').forEach(t => t.classList.add('hidden'));
    carga.classList.add('hidden');
    cameraInicial(); limparToqueMobile(); montarHUD();
    tocarMusica(true);
    return true;
  } catch (err) {
    console.error(err);
    txt.textContent = 'Não consegui carregar um modelo. Se escolheu um Pokémon "online", verifique a internet.';
    setTimeout(() => { carga.classList.add('hidden'); mostrarTela('telaInicio'); }, 3500);
    return false;
  }
}
function limparLuta(){
  for (const t of [0, 1]) for (const m of JOGO.times[t]) { tirarDeCampo(m); liberarInstancia(m.inst); }
  for (const P of JOGO.projeteis) cena.remove(P.mesh);
  if (JOGO.cineAtiva) { for (const x of JOGO.cineAtiva.extras) cena.remove(x); JOGO.cineAtiva = null; }
  JOGO.times = [[], []]; JOGO.projeteis = []; JOGO.agenda = []; JOGO.fim = false; JOGO.pausado = false;
  CAM.cine = null; document.body.classList.remove('cine', 'velocidade'); ambienteCine(0);
  limparEfeitos();
}
function voltarAoMenu(){
  limparToqueMobile(); limparLuta(); JOGO.estado = 'menu'; tocarMusica(false);
  ['#hud', '#pausa', '#resultado'].forEach(s => $(s).classList.add('hidden'));
  camera.clearViewOffset(); criarArena(S.mapa); mostrarTela('telaInicio');
}

/* ----- Quem controla cada time neste quadro ----- */
function entradaDoTime(t, dt){
  const L = lutador(t);
  if (JOGO.intro > 0) return ENTRADA_VAZIA();
  switch (JOGO.controle[t]) {
    case 'jogador': return ENTRADAS[JOGO.jogadorDoTime[t]] || ENTRADA_VAZIA();
    case 'boneco':  return entradaIA(L, dt, JOGO.treino.comportamento);
    default:        return entradaIA(L, dt);
  }
}

/* ----- Loop principal ----- */
let ultimo = performance.now();
function loop(agora){
  requestAnimationFrame(loop);
  if (document.hidden) { ultimo = agora; return; }
  const real = Math.min(.05, (agora - ultimo)/1000); ultimo = agora;
  avaliarDesempenho(real);
  try {
    lerEntradas();
    navegarMenus(real); navegarSelecao(real);
    if (EM_BATALHA()) {
      // pausa: qualquer jogador humano
      for (const t of [0, 1]) if (JOGO.controle[t] === 'jogador' && ENTRADAS[JOGO.jogadorDoTime[t]].disparou.has('pausa') && !JOGO.fim) pausar(!JOGO.pausado);
      if (!JOGO.pausado) passoBatalha(real);
    } else passoVitrine(real);
    atualizarArena(real); atualizarPos(real);
    desenharCena();
  } catch (err) { console.error(err); }
}
function passoBatalha(real){
  if (FX.lento > 0) FX.lento -= real;
  // "congela" por um instante quando um golpe acerta (hit-stop)
  if (FX.congela > 0) { FX.congela -= real; atualizarCamera(real); atualizarNumeros(real); atualizarHUD(real); return; }
  const dt = real*(FX.lento > 0 ? .35 : 1);
  JOGO.tempo += dt;
  for (const t of [0, 1]) JOGO.trocaCd[t] = Math.max(0, JOGO.trocaCd[t] - dt);
  for (let i = JOGO.agenda.length - 1; i >= 0; i--) { const a = JOGO.agenda[i]; a.t -= dt; if (a.t <= 0) { JOGO.agenda.splice(i, 1); a.fn(); } }
  if (JOGO.cineAtiva) {
    atualizarCine(dt);
  } else {
    if (JOGO.intro > 0) JOGO.intro -= dt;
    if (JOGO.relogio && !JOGO.fim && JOGO.intro <= 0) { JOGO.relogio -= dt; if (JOGO.relogio <= 0) { JOGO.relogio = 0; tempoEsgotado(); } }
    for (const t of [0, 1]) { const L = lutador(t); if (L && L.emCampo) controlarLutador(L, entradaDoTime(t, dt), dt, CAM.yaw); }
    for (const t of [0, 1]) for (const m of JOGO.times[t]) if (m.emCampo) atualizarLutador(m, dt);
    if (JOGO.regras.treino) atualizarTreino(dt);
    if (JOGO.regras.caos && !JOGO.fim) atualizarCaos(dt);
    atualizarProjeteis(dt);
  }
  atualizarEfeitos(dt);
  BRILHO.atualizar(dt); FUMACA.atualizar(dt); atualizarLuzes(dt); atualizarNumeros(real); ambiente(dt);
  atualizarCamera(real); atualizarHUD(real);
  // o sol acompanha a luta (sombras nítidas perto dos lutadores)
  const P = lutador(0), Q = lutador(1);
  if (P && Q) { const mx = (P.pos.x + Q.pos.x)/2, mz = (P.pos.z + Q.pos.z)/2; ARENA.sol.position.set(mx + 14, 30, mz + 10); ARENA.sol.target.position.set(mx, 0, mz); }
}
// Para testes: avança o jogo N quadros de 1/60 s (no Console: avancar(30))
function avancar(n){ for (let i = 0; i < n; i++) passoBatalha(1/60); desenharCena(); }

/* ----- Vitrine (Pokémon no menu e na seleção) ----- */
const VITRINE = [null, null], vitrineId = [null, null];
let vitrineAng = 0;
async function mostrarNaVitrine(lado, id){
  if (vitrineId[lado] === id) return;
  vitrineId[lado] = id;
  if (VITRINE[lado]) { liberarInstancia(VITRINE[lado]); VITRINE[lado] = null; }
  if (id == null || !modeloDisponivel(id)) return;
  const inst = await criarInstancia(id);
  if (vitrineId[lado] !== id || EM_BATALHA()) { liberarInstancia(inst); return; }
  if (VITRINE[lado]) liberarInstancia(VITRINE[lado]);
  VITRINE[lado] = inst; cena.add(inst.raiz); inst.raiz.scale.setScalar(.01); inst.surgir = 0;
  soltar('normal', 0, inst.altura*.5, 0, 16, 4, .35, .5);
}
function limparVitrine(){ for (const l of [0, 1]) { if (VITRINE[l]) liberarInstancia(VITRINE[l]); VITRINE[l] = null; vitrineId[l] = null; } }
function passoVitrine(dt){
  vitrineAng += dt*.2;
  const sel = EM_SELECAO();
  if (sel) {
    // seleção: um de frente para o outro, câmera de frente
    camera.position.set(0, 2.6, 11); camera.lookAt(0, 1.4, 0);
  } else {
    const d = 9;
    camera.position.set(Math.sin(vitrineAng)*d, 3, Math.cos(vitrineAng)*d); camera.lookAt(0, 1.3, 0);
  }
  for (const l of [0, 1]) {
    const V = VITRINE[l]; if (!V) continue;
    V.surgir = Math.min(1, (V.surgir || 0) + dt*3); V.raiz.scale.setScalar(.01 + V.surgir*.99);
    if (sel) { V.raiz.position.set(l ? 3.2 : -3.2, 0, 0); V.raiz.rotation.y = l ? -1.1 : 1.1; }
    else { V.raiz.position.set(0, 0, 0); V.raiz.rotation.y = vitrineAng*2; }
    V.raiz.visible = sel || l === 0;
    animarInstancia(V, dt, { vel: 0, voa: !!POR_ID[V.id]?.voa });
  }
  BRILHO.atualizar(dt); FUMACA.atualizar(dt); atualizarEfeitos(dt); atualizarLuzes(dt); ambiente(dt);
  if (Math.random() < dt) statusControles();
}

/* ----- Início ----- */
const embaralhar = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random()*(i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
BRILHO = new Particulas(DISPOSITIVO_MOVEL ? 1250 : 3000, true);
FUMACA = new Particulas(DISPOSITIVO_MOVEL ? 2000 : 5000, false);
criarLuzes();
aplicarQualidade(S.qualidade);
$('#indicadorFps').classList.toggle('hidden', !S.mostrarFps);
criarArena(S.mapa);
montarInicio(); montarConfig(); montarTorneio(); montarPausaResultado();
$('#btnComecar').onclick = comecarDaSelecao;
document.querySelectorAll('[data-voltar]').forEach(b => b.addEventListener('click', () => mostrarTela(b.dataset.voltar)));
mostrarTela('telaInicio');
mostrarNaVitrine(0, escolher([6, 25, 448, 94, 445, 658].filter(id => modeloDisponivel(id))));
statusControles();
addEventListener('gamepadconnected', statusControles); addEventListener('gamepaddisconnected', statusControles);
requestAnimationFrame(loop);
