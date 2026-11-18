"use strict";
/* =========================================================
   TELA DE ABERTURA (V14)
   Aparece quando o jogo abre: logo, câmera passeando pela arena e
   Pokémon saindo da Pokébola em sequência. Qualquer tecla, toque ou
   botão do controle leva para a tela dos modos.
   Enquanto isso, os modelos mais usados vão sendo carregados.
   ========================================================= */
const ABERTURA = { ativa: false, t: 0, prox: 1.6, inst: null, ids: [], fila: 0, pronto: false, pode: false };

function iniciarAbertura(){
  ABERTURA.ativa = true; ABERTURA.t = 0; ABERTURA.prox = 1.6;
  ABERTURA.ids = embaralhar([6, 25, 94, 448, 445, 658, 150, 384, 9, 3, 143, 249].filter(id => modeloDisponivel(id))).slice(0, 6);
  mostrarTela('telaAbertura');
  $('#abToque').classList.add('esperando');
  // carrega os modelos da abertura (a barra mostra o progresso)
  let feitos = 0; const total = ABERTURA.ids.length;
  const barra = $('#abCarga i');
  Promise.all(ABERTURA.ids.map(id => carregarModelo(id).catch(() => null).then(() => { feitos++; barra.style.width = (feitos/total*100) + '%'; })))
    .then(() => { ABERTURA.pronto = true; $('#abCarga').classList.add('pronto'); });
  // dá um tempinho para o logo entrar antes de aceitar a tecla
  setTimeout(() => { ABERTURA.pode = true; $('#abToque').classList.remove('esperando');
    $('#abToque').textContent = DISPOSITIVO_MOVEL ? 'TOQUE PARA COMEÇAR' : 'PRESSIONE QUALQUER TECLA'; }, 1300);
}

function sairAbertura(){
  if (!ABERTURA.ativa || !ABERTURA.pode) return;
  ABERTURA.ativa = false;
  if (ABERTURA.inst) { liberarInstancia(ABERTURA.inst); ABERTURA.inst = null; }
  flashTela('#ffffff'); SOM.pokebola();
  const tela = $('#telaAbertura'); tela.classList.add('saindo');
  setTimeout(() => { tela.classList.remove('saindo'); mostrarTela('telaInicio'); }, 380);
}

// qualquer tecla / clique / toque (só enquanto a abertura está na tela)
addEventListener('keydown', e => { if (!ABERTURA.ativa) return; e.preventDefault(); e.stopImmediatePropagation(); sairAbertura(); }, true);
addEventListener('pointerdown', e => { if (!ABERTURA.ativa) return; e.preventDefault(); e.stopImmediatePropagation(); sairAbertura(); }, true);

// chamado pelo loop do menu; devolve true enquanto a abertura estiver ativa
function atualizarAbertura(dt){
  if (!ABERTURA.ativa) return false;
  ABERTURA.t += dt;
  const t = ABERTURA.t;
  // botão do controle
  for (const gp of (navigator.getGamepads ? navigator.getGamepads() : [])) if (gp && gp.buttons.some(b => b.pressed)) { sairAbertura(); break; }
  for (const V of VITRINE) if (V) V.raiz.visible = false;
  // câmera passeando devagar pela arena
  const a = t*.12;
  camera.position.set(Math.sin(a)*8.5, 2.9 + Math.sin(t*.3)*.5, Math.cos(a)*8.5);
  camera.lookAt(0, 2.7, 0);                     // Pokémon fica no terço de baixo, o logo em cima
  // um Pokémon diferente sai da Pokébola a cada ~4 s
  ABERTURA.prox -= dt;
  if (ABERTURA.prox <= 0 && ABERTURA.ids.length) {
    ABERTURA.prox = 4.2;
    const id = ABERTURA.ids[ABERTURA.fila++ % ABERTURA.ids.length];
    trocarPokemonAbertura(id);
  }
  const I = ABERTURA.inst;
  if (I) {
    if (I.surgir < 1) { I.surgir = Math.min(1, I.surgir + dt*2.6); const s = Math.max(0, I.surgir); I.raiz.scale.setScalar(.01 + (1 - Math.pow(1 - s, 3))*.99); }
    if (I.sil > 0 && I.surgir >= 0) { I.sil = Math.max(0, I.sil - dt*(I.surgir >= 1 ? 2.4 : .35)); silhueta(I, I.sil); if (!I.sil) silhuetaFim(I); }
    I.raiz.rotation.y = Math.atan2(camera.position.x, camera.position.z);      // olha para a câmera
    animarInstancia(I, dt, { vel: 0, voa: !!POR_ID[I.id]?.voa, ataque: I.ataque });
    if (I.ataque) { I.ataque.t += dt/I.ataque.dur; if (I.ataque.t >= 1) I.ataque = null; }
    if (I.surgir >= 1 && !I.rugiu) { I.rugiu = true; I.ataque = { t: 0, dur: .8, jeito: 'area' }; }
  }
  BRILHO.atualizar(dt); FUMACA.atualizar(dt); atualizarEfeitos(dt); atualizarLuzes(dt); ambiente(dt);
  return true;
}

async function trocarPokemonAbertura(id){
  const velho = ABERTURA.inst;
  if (velho) {           // volta com o raio vermelho
    silhuetaInicio(velho); const s0 = velho.raiz.scale.x;
    efeito(new THREE.Object3D(), .35, (e, k) => { silhueta(velho, Math.min(1, k*4), 0xff3a3a); velho.raiz.scale.setScalar(s0*Math.max(.01, 1 - k*k)); if (k >= 1) liberarInstancia(velho); });
    ABERTURA.inst = null;
  }
  let inst;
  try { inst = await criarInstancia(id); } catch (e) { return; }
  if (!ABERTURA.ativa) { liberarInstancia(inst); return; }
  inst.id = id;
  cena.add(inst.raiz); inst.raiz.position.set(0, 0, 0); inst.raiz.scale.setScalar(.01);
  const de = new THREE.Vector3(camera.position.x*.55, 3, camera.position.z*.55);
  const tAbrir = lancarPokebola({ de, ate: new THREE.Vector3(0, 0, 0), altura: Math.min(1.6, .55 + inst.altura*.45), alturaPokemon: inst.altura, alvo: camera.position });
  inst.surgir = -tAbrir*2.6; silhuetaInicio(inst); inst.sil = 1; silhueta(inst, 1);
  ABERTURA.inst = inst;
}
