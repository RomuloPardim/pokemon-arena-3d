"use strict";
/* =========================================================
   MODELOS 3D
   - Carrega os .glb (embutidos em modelos/*.js ou baixados da internet)
   - Cria uma cópia (instância) para cada lutador
   - Anima: se o modelo tem animações próprias (online), usa elas;
     se não tem, mexe os ossos do esqueleto por código ("animação procedural")
   ========================================================= */

// Os arquivos modelos/<id>-<nome>.js preenchem este objeto com o .glb em base64.
// (Base64 porque o navegador não deixa ler arquivos .glb soltos ao abrir via file://)
window.MODELOS_EMBUTIDOS = window.MODELOS_EMBUTIDOS || {};

const CACHE_MODELOS = {};   // id -> Promise do gltf carregado
const loaderGLTF = new THREE.GLTFLoader();
loaderGLTF.setMeshoptDecoder(THREE.MeshoptDecoder);   // os modelos são comprimidos com meshopt (4x menores)

function base64ParaBuffer(s){
  const bin = atob(s), u = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
  return u.buffer;
}
function parseGLB(buf){
  return new Promise((ok, erro) => loaderGLTF.parse(buf, '', ok, erro));
}
// Baixa da internet mostrando o progresso (0..1)
async function baixarComProgresso(url, progresso){
  const r = await fetch(url);
  if (!r.ok) throw new Error('HTTP ' + r.status);
  const total = +r.headers.get('content-length') || 0;
  if (!r.body || !total) return r.arrayBuffer();
  const leitor = r.body.getReader(), partes = []; let lido = 0;
  for (;;) {
    const { done, value } = await leitor.read(); if (done) break;
    partes.push(value); lido += value.length; progresso && progresso(lido/total);
  }
  const u = new Uint8Array(lido); let o = 0; for (const p of partes) { u.set(p, o); o += p.length; }
  return u.buffer;
}
const SCRIPTS_MODELOS = {};
function modeloDisponivel(id){ return !!MODELOS_ARQUIVOS[id] || !!POR_ID[id]?.online; }
function carregarScriptModelo(id){
  if (MODELOS_EMBUTIDOS[id]) return Promise.resolve();
  if (SCRIPTS_MODELOS[id]) return SCRIPTS_MODELOS[id];
  const caminho = MODELOS_ARQUIVOS[id];
  if (!caminho) return Promise.reject(new Error('Modelo '+id+' não cadastrado'));
  SCRIPTS_MODELOS[id] = new Promise((ok, falha) => {
    const tag = document.createElement('script'); tag.src = caminho;
    tag.onload = () => { tag.remove(); ok(); };
    tag.onerror = () => { tag.remove(); delete SCRIPTS_MODELOS[id]; falha(new Error('Não foi possível carregar '+caminho)); };
    document.head.appendChild(tag);
  });
  return SCRIPTS_MODELOS[id];
}

function carregarModelo(id, progresso){
  if (CACHE_MODELOS[id]) return CACHE_MODELOS[id];
  const p = (async () => {
    let buf;
    if (MODELOS_ARQUIVOS[id]) {
      await carregarScriptModelo(id);
      buf = base64ParaBuffer(MODELOS_EMBUTIDOS[id]);
    } else buf = await baixarComProgresso(URL_MODELO_ONLINE(id), progresso);
    const gltf = await parseGLB(buf);
    if (MODELOS_ARQUIVOS[id]) delete MODELOS_EMBUTIDOS[id]; // libera base64 após processar com sucesso
    progresso && progresso(1);
    return gltf;
  })();
  CACHE_MODELOS[id] = p;
  p.catch(() => delete CACHE_MODELOS[id]);   // deixa tentar de novo se falhar
  return p;
}

/* ----- Caixa (tamanho) real de um modelo com esqueleto -----
   A caixa padrão do three.js ignora o esqueleto, então medimos os vértices já deformados. */
function medirModelo(obj){
  obj.updateMatrixWorld(true);
  const caixa = new THREE.Box3(), v = new THREE.Vector3();
  obj.traverse(o => {
    if (!o.isMesh || !o.visible) return;
    const pos = o.geometry.attributes.position; if (!pos) return;
    if (o.isSkinnedMesh) o.skeleton.update();
    const passo = Math.max(1, Math.floor(pos.count / 1500));
    for (let i = 0; i < pos.count; i += passo) {
      v.fromBufferAttribute(pos, i);
      if (o.isSkinnedMesh) o.boneTransform(i, v);
      v.applyMatrix4(o.matrixWorld); caixa.expandByPoint(v);
    }
  });
  return caixa;
}

/* ----- Classificação dos ossos pelo nome -----
   Os modelos usam nomes como "LThigh", "RArm", "Tail3", "left_leg_01", "head_8"... */
function classificarOsso(nomeOriginal){
  const n = nomeOriginal.replace(/^\d+[\s_]+/, '').replace(/_\d+$/, '');   // "007_LThigh" / "LThigh_44" -> "LThigh"
  let lado = 0;
  if (/^(left_|L(?=[A-Z])|L_(?=[A-Za-z]))/.test(n)) lado = -1;
  else if (/^(right_|R(?=[A-Z])|R_(?=[A-Za-z]))/.test(n)) lado = 1;
  const b = n.replace(/^(left_|right_|L(?=[A-Z])|R(?=[A-Z])|L_(?=[A-Za-z])|R_(?=[A-Za-z]))/, '').toLowerCase();
  let parte = null;
  if (/^thigh|^leg_?0?1$|^upperleg/.test(b)) parte = 'coxa';
  else if (/^leg$|^calf$/.test(b) && lado) parte = 'perna';
  else if (/^arm\d?$|^arm_0?1$|^upperarm/.test(b) && lado) parte = 'braco';
  else if (/^forearm|^arm_0?2$/.test(b) && lado) parte = 'antebraco';
  else if (/^wing_?0?1$|^wing$|^wing1$/.test(b) && lado) parte = 'asa';
  else if (/^wing_?0?[2-3]$/.test(b) && lado) parte = 'asa2';
  else if (/tail/.test(b)) parte = 'cauda';
  else if (/^head$/.test(b)) parte = 'cabeca';
  else if (/^neck_?0?1$|^neck1?$/.test(b)) parte = 'pescoco';
  else if (/^spine_?0?1$|^spine$/.test(b)) parte = 'coluna';
  else if (/^ear_?0?1$|^ear$|^ear1$/.test(b) && lado) parte = 'orelha';
  const num = +(b.match(/(\d+)$/)?.[1] || 0);
  return { lado, parte, num };
}

/* ----- Monta o "rig" procedural: guarda a pose original de cada osso ----- */
function montarRig(obj, opcoes = {}){
  obj.updateMatrixWorld(true);
  const raizInv = new THREE.Quaternion(); obj.getWorldQuaternion(raizInv); raizInv.invert();
  const ossos = [], vistos = new Set();
  // se o modelo não tem "coxa", usa a "perna" no lugar
  const todos = []; obj.traverse(o => { if (o.isBone && !vistos.has(o.uuid)) { vistos.add(o.uuid); todos.push(o); } });
  const temCoxa = todos.some(o => classificarOsso(o.name).parte === 'coxa');
  for (const o of todos) {
    const c = classificarOsso(o.name); let parte = c.parte;
    if (parte === 'perna' && !temCoxa) parte = 'coxa';
    if (!parte) continue;
    const qW = new THREE.Quaternion(); o.getWorldQuaternion(qW); qW.premultiply(raizInv);   // rotação no espaço do modelo
    // direção do osso (até o primeiro filho) — usada para detectar "pose em T"
    let dir = null; const filho = o.children.find(f => f.isBone);
    if (filho) {
      const a = new THREE.Vector3(), b = new THREE.Vector3(); o.getWorldPosition(a); filho.getWorldPosition(b);
      dir = b.sub(a).applyQuaternion(raizInv); if (dir.lengthSq() > 1e-8) dir.normalize(); else dir = null;
    }
    ossos.push({ o, parte, lado: c.lado, num: c.num, b0: o.quaternion.clone(), qW, qWi: qW.clone().invert(), dir });
  }
  // braços esticados para os lados (pose em T): abaixa ~65°
  // (aves cujas asas são os "braços" do esqueleto ficam com as asas abertas)
  if (!opcoes.asasBracos) for (const r of ossos) if (r.parte === 'braco' && r.dir && Math.abs(r.dir.y) < .5 && Math.abs(r.dir.x) > .6)
    r.descanso = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1), -Math.sign(r.dir.x)*1.1);
  // índice da cauda (para a onda passar do começo para a ponta)
  const caudas = ossos.filter(r => r.parte === 'cauda').sort((a,b) => a.num - b.num);
  caudas.forEach((r, i) => r.idx = i);
  return ossos;
}

const _D = new THREE.Quaternion(), _Q = new THREE.Quaternion(), _T = new THREE.Quaternion();
const EIXO_X = new THREE.Vector3(1,0,0), EIXO_Y = new THREE.Vector3(0,1,0), EIXO_Z = new THREE.Vector3(0,0,1);
// Gira um osso em torno de um eixo do MODELO (X = lado, Y = cima, Z = frente)
function poseOsso(r, rotX, rotY, rotZ){
  _D.identity();
  if (r.descanso) _D.copy(r.descanso);
  if (rotZ) _D.premultiply(_T.setFromAxisAngle(EIXO_Z, rotZ));
  if (rotY) _D.premultiply(_T.setFromAxisAngle(EIXO_Y, rotY));
  if (rotX) _D.premultiply(_T.setFromAxisAngle(EIXO_X, rotX));
  // local = b0 * (qW⁻¹ * D * qW)
  _Q.copy(r.qWi).multiply(_D).multiply(r.qW);
  r.o.quaternion.copy(r.b0).multiply(_Q);
}

/* ----- Animações próprias do modelo (só os online têm) ----- */
const PADROES_ANIM = {
  parado:   [/battlewait01_loop/, /defaultwait01_loop/, /wait.*loop/],
  andar:    [/walk01_loop/, /walk/],
  correr:   [/run01_loop/, /run/],
  ataque:   [/_attack01$/, /attack01/],
  distancia:[/rangeattack01$/, /rangeattack/],
  dano:     [/damage01$/, /damage/],
  desmaio:  [/down01_start/, /down/],
  pulo:     [/jumpup01_start/, /jump/],
};

/* ----- Cria uma instância (lutador ou vitrine) -----
   Estrutura: raiz (posição/rumo) > corpo (balanço/inclinação) > ajuste (escala/centro) > modelo */
// fichaForcada: usada pela Mega Evolução (modelo da Mega com a ficha do Pokémon, altura maior etc.)
async function criarInstancia(id, progresso, fichaForcada){
  const gltf = await carregarModelo(id, progresso);
  const dados = fichaForcada || POR_ID[id];
  const obj = THREE.SkeletonUtils.clone(gltf.scene);
  const materiais = [];
  obj.traverse(o => {
    if (!o.isMesh) return;
    // peças que o modelo traz e não devem aparecer (ex.: cipós esticados do Bulbasaur); somem antes de medir o tamanho
    if (dados.ocultarMalhas && dados.ocultarMalhas.test(o.name)) { o.visible = false; return; }
    o.castShadow = true; o.receiveShadow = false;
    if (o.isSkinnedMesh) o.frustumCulled = false;     // a caixa de recorte ignora o esqueleto
    const lista = Array.isArray(o.material) ? o.material : [o.material];
    const novos = lista.map(m => { const c = m.clone(); materiais.push(c); return c; });
    o.material = Array.isArray(o.material) ? novos : novos[0];
  });
  const caixa = medirModelo(obj), tam = caixa.getSize(new THREE.Vector3()), centro = caixa.getCenter(new THREE.Vector3());
  // escalaModelo: corrige modelos cuja medição engana (ex.: Giratina) sem mudar a altura usada no combate
  const k = dados.altura / Math.max(tam.y, .001) * (dados.escalaModelo || 1);
  const ajuste = new THREE.Group(); ajuste.add(obj);
  ajuste.scale.setScalar(k);
  ajuste.position.set(-centro.x*k, -caixa.min.y*k, -centro.z*k);
  const corpo = new THREE.Group(); corpo.add(ajuste);
  const raiz = new THREE.Group(); raiz.add(corpo);

  const inst = {
    id, raiz, corpo, ajuste, obj, materiais,
    altura: dados.altura,
    raio: THREE.MathUtils.clamp(Math.max(tam.x, tam.z)*k*.32, .35, 1.3),
    fase: Math.random()*6, t: Math.random()*10, flash: 0, corFlash: new THREE.Color(1,1,1),
    mixer: null, acoes: {}, acaoAtual: null,
  };
  // Sombra suave sob Pokémon voadores (visual, sem interferir nas colisões).
  if (dados.voa) {
    const sg = new THREE.PlaneGeometry(1, 1);
    const sm = new THREE.MeshBasicMaterial({ map: TEXTURA_SOMBRA_VOO, transparent: true, depthWrite: false, opacity: .26, polygonOffset: true, polygonOffsetFactor: -1 });
    const sombra = new THREE.Mesh(sg, sm);
    sombra.rotation.x = -Math.PI/2; sombra.position.y = .055; sombra.renderOrder = 2;
    sombra.scale.set(Math.max(1.5, dados.altura*1.25), Math.max(1.5, dados.altura*1.25), 1); raiz.add(sombra); inst.sombraVoo = sombra;
  }
  // animações reais?
  if (gltf.animations && gltf.animations.length > 3) {
    inst.mixer = new THREE.AnimationMixer(obj);
    for (const [nome, padroes] of Object.entries(PADROES_ANIM)) {
      let clip = null;
      for (const re of padroes) { clip = gltf.animations.find(a => re.test(a.name)); if (clip) break; }
      if (clip) {
        clip = semMovimentoDeRaiz(clip);
        const a = inst.mixer.clipAction(clip);
        if (['ataque','distancia','dano','desmaio','pulo'].includes(nome)) { a.setLoop(THREE.LoopOnce); a.clampWhenFinished = true; }
        inst.acoes[nome] = a;
      }
    }
    tocar(inst, 'parado', 0);
    inst.mixer.update(.01);
  } else {
    inst.ossos = montarRig(obj, dados);
    inst.asasBracos = !!dados.asasBracos;
    inst.ampAsa = dados.ampAsa ?? 1;          // < 1 = asas mais duras (ex.: Mega Latias, que é um "jato")
    inst.enrolar = dados.enrolar || null;     // serpentes (Rayquaza): curva fixa em cada pedaço da cauda
  }
  // emissivo original (para o "piscar" ao levar dano)
  for (const m of materiais) if (m.emissive) m.userData.emi0 = m.emissive.clone();
  return inst;
}

/* O clipe de andar/correr de alguns modelos já anda sozinho para frente ("movimento de raiz").
   Como o jogo já move o Pokémon, isso fazia ele andar em dobro e voltar a cada ciclo (o "bug" do Greninja).
   Aqui travamos o X e o Z do osso raiz no valor do primeiro quadro (o sobe-e-desce continua). */
const CACHE_CLIPES = new WeakMap();
function semMovimentoDeRaiz(clip){
  if (CACHE_CLIPES.has(clip)) return CACHE_CLIPES.get(clip);
  const novo = clip.clone();
  for (const tr of novo.tracks) {
    if (!/\.position$/.test(tr.name) || !/^(origin|root|gltf_created_0_rootjoint)/i.test(tr.name)) continue;
    const v = tr.values, x0 = v[0], z0 = v[2];
    for (let i = 0; i < v.length; i += 3) { v[i] = x0; v[i + 2] = z0; }
  }
  CACHE_CLIPES.set(clip, novo);
  return novo;
}

function tocar(inst, nome, fade = .18, vel = 1){
  const a = inst.acoes[nome] || inst.acoes.parado; if (!a) return;
  a.timeScale = vel;
  if (inst.acaoAtual === a) return;                 // já está tocando
  a.reset().play();
  if (inst.acaoAtual) { if (fade) a.crossFadeFrom(inst.acaoAtual, fade, false); else inst.acaoAtual.stop(); }
  inst.acaoAtual = a;
}

/* ----- Atualiza a animação a cada quadro -----
   e = { vel: 0..1 (quão rápido anda), noAr, ataque: {t: 0..1, jeito} | null, dano: 0..1, desmaio: 0..1 } */
function animarInstancia(inst, dt, e){
  inst.t += dt;
  const t = inst.t, vel = e.vel || 0;
  // ritmo dos passos proporcional à velocidade de verdade (m/s) e ao tamanho do Pokémon: os pés escorregam menos
  const vooAtivo = !!e.voa && !e.caido && !e.desmaio;
  const deslocamento = Math.min(1.5, (e.velMS ?? vel*7) / 7);
  inst.velSuave = (inst.velSuave || 0) + (deslocamento - (inst.velSuave || 0))*(1 - Math.exp(-dt*9));
  inst.fase += dt*(1.4 + Math.PI*(e.velMS ?? vel*7)/Math.max(.65, inst.altura*.9));
  const f = inst.fase;
  const atkT = e.ataque ? e.ataque.t : 0;
  const atkCurva = e.ataque ? Math.sin(Math.min(1, atkT) * Math.PI) : 0;
  const melee = e.ataque && (e.ataque.jeito === 'investida');

  // ----- corpo inteiro: balanço, inclinação, pulo, golpes, desmaio -----
  const c = inst.corpo, A = inst.altura, j = e.ataque ? e.ataque.jeito : null, t1 = e.ataque ? Math.min(1, e.ataque.t) : 0;
  let inclX = vel*.12 - (e.dano || 0)*.35, giroY = 0, sobe = 0, sx = 1, sy = 1, sz = 1, tremeX = 0;
  switch (j) {
    case 'projetil': {            // recua e arremessa
      const k = t1 < .22 ? -t1/.22 : t1 < .4 ? -1 + (t1 - .22)/.18*2 : 1 - (t1 - .4)/.6;
      inclX += k*.2; sz = 1 + Math.max(0, k)*.08; break; }
    case 'raio':                  // inclina para trás carregando, depois dispara tremendo
      if (t1 < .32) { inclX -= .25*(t1/.32); sy = 1 + .06*(t1/.32); }
      else { inclX += .18; tremeX = Math.sin(inst.t*90)*.03*A; } break;
    case 'area':                  // pulinho girando e pancada no chão
      if (t1 < .3) { sobe = Math.sin(t1/.3*Math.PI/2)*.45*A; giroY = (t1/.3)*Math.PI*2; sy = 1.08; }
      else if (t1 < .5) { const k = (t1 - .3)/.2; sobe = Math.max(0, .45*A*(1 - k*3)); sy = 1 - .2*Math.sin(k*Math.PI); sx = sz = 1 + .14*Math.sin(k*Math.PI); }
      break;
    case 'investida':             // corpo esticado para frente
      inclX += .5*Math.sin(t1*Math.PI); sz = 1 + .18*Math.sin(t1*Math.PI); sy = 1 - .08*Math.sin(t1*Math.PI); break;
    case 'chuva':                 // empina e "chama" o golpe do céu
      inclX -= .38*Math.sin(t1*Math.PI); sobe = .12*A*Math.sin(t1*Math.PI); break;
    case 'combo': {               // golpes do combo corpo a corpo
      const m = e.ataque.membro, ida = Math.sin(Math.min(1, t1/.45)*Math.PI*.5), volta = t1 > .6 ? (t1 - .6)/.4 : 0, f = ida*(1 - volta);
      if (m === 'bracoD' || m === 'bracoE') { giroY = (m === 'bracoD' ? -.45 : .45)*f; inclX += .22*f; sz = 1 + .06*f; }
      else if (m === 'perna') { inclX -= .18*f; giroY = .3*f; }
      else if (m === 'cauda') { giroY = e.ataque.giro ? t1*Math.PI*2 : 1.2*f; }
      else { inclX += .4*f; sz = 1 + .14*f; sy = 1 - .06*f; if (e.ataque.giro) giroY = t1*Math.PI*2; }
      break; }
    case 'buff':                  // pulsa de energia
      sy = 1 + .1*Math.abs(Math.sin(t1*Math.PI*3)); sx = sz = 1 - .04*Math.abs(Math.sin(t1*Math.PI*3)); inclX -= .15*Math.sin(t1*Math.PI); break;
  }
  // guarda, carga, caído, lançado
  if (e.guarda) { inclX += .12; sy *= .92; sx *= 1.04; }
  if (e.carga) { sy *= 1 - .12*e.carga; sx *= 1 + .06*e.carga; inclX += .1; tremeX = Math.sin(inst.t*80)*.02*A*e.carga; }
  if (e.quebrado) { inclX -= .25; tremeX = Math.sin(inst.t*25)*.03*A; }
  if (e.lancado) inclX -= .9;
  if (e.caido) { inclX = -1.35*e.caido; sobe -= A*.25*e.caido; }
  if (e.pose && e.pose.sobe) sobe += e.pose.sobe;
  if (e.pose && e.pose.incl) inclX += e.pose.incl;
  // pouso do pulo: amassa um pouco
  if (inst._noAr && !e.noAr) inst.pouso = 1;
  inst._noAr = !!e.noAr; inst.pouso = Math.max(0, (inst.pouso || 0) - dt*5);
  sy *= 1 - inst.pouso*.16; sx *= 1 + inst.pouso*.08; sz *= 1 + inst.pouso*.08;
  // quem voa fica flutuando
  // Voo constante com batidas de asa, planeio e impulso sutil nas acelerações.
  const asaFase = t*(vooAtivo ? (4.5 - inst.velSuave*1.2) : 2.6);
  const voo = vooAtivo ? Math.max(.55, A*.65) + Math.sin(t*2.4)*(.10 + A*.035) + Math.sin(asaFase)*.035*A : 0;
  if (inst.sombraVoo) {
    inst.sombraVoo.visible = !!e.voa;
    const sombraK = 1 + Math.max(0, voo) * .06;
    inst.sombraVoo.scale.set(Math.max(1.5,A*1.25)*sombraK, Math.max(1.5,A*1.25)*sombraK, 1);
    inst.sombraVoo.material.opacity = .26 - Math.min(.11, voo*.022);
  }
  // suaviza tudo que não precisa ser instantâneo
  const S = inst.sm || (inst.sm = { inclX: 0, sobe: 0, sx: 1, sy: 1, sz: 1, rolar: 0 });
  const ks = 1 - Math.exp(-dt*(e.dano ? 20 : 12));
  S.inclX += (inclX - S.inclX)*ks; S.sobe += (sobe - S.sobe)*ks; S.sx += (sx - S.sx)*ks; S.sy += (sy - S.sy)*ks; S.sz += (sz - S.sz)*ks;
  const rolar = (e.inclinar || 0) + (inst.mixer ? 0 : Math.sin(f)*.045*Math.min(1, vel));      // balanço de um pé para o outro
  S.rolar += (rolar - S.rolar)*(1 - Math.exp(-dt*(vooAtivo ? 7 : 10)));
  c.position.set(tremeX + (e.dano ? Math.sin(inst.t*70)*.04*e.dano : 0),
    (inst.mixer || e.voa ? 0 : Math.abs(Math.sin(f))*.05*A*Math.min(1, vel)) + (e.alturaPulo || 0) + S.sobe + voo, 0);
  c.rotation.set(S.inclX + (vooAtivo ? -.04 - inst.velSuave*.095 : 0), giroY + (vooAtivo ? Math.sin(t*.8)*.045 : 0), (e.desmaio || 0)*1.45 + S.rolar + (vooAtivo ? Math.sin(t*1.3)*.035 : 0));
  const resp = inst.mixer ? 1 : 1 + Math.sin(t*2.2)*.018*(1 - Math.min(1, vel));
  c.scale.set(S.sx/Math.sqrt(resp), S.sy*resp, S.sz/Math.sqrt(resp));
  if (e.desmaio) c.position.y -= e.desmaio*.25*A;

  if (inst.mixer) {
    // escolhe a animação certa
    let quer = 'parado', v = 1;
    if (e.desmaio) quer = 'desmaio';
    else if (e.dano > .5) quer = 'dano';
    else if (e.caido || e.lancado) quer = 'desmaio';
    else if (e.ataque && e.ataque.t < .9) { quer = melee || j === 'combo' ? 'ataque' : 'distancia';
      const a = inst.acoes[quer]; if (a) v = Math.max(.8, a.getClip().duration/(e.ataque.dur*.95)); }
    else if (e.noAr) quer = 'pulo';
    else if (vel > .55) { quer = 'correr'; v = .8 + vel*.5; }
    else if (vel > .08) { quer = 'andar'; v = .6 + vel; }
    if (!inst.acoes[quer]) quer = quer === 'correr' ? 'andar' : 'parado';
    tocar(inst, quer, .15, v);
    inst.mixer.update(dt);
  } else if (inst.ossos) {
    // Calcula a pose-alvo de cada osso e "persegue" ela com suavização (nada de estalos)
    const passo = f, lado = s => s < 0 ? 0 : Math.PI;
    for (const r of inst.ossos) {
      const ld = r.lado || 1;
      let x = 0, y = 0, z = 0, rapidez = 14;
      switch (r.parte) {
        case 'coxa': {
          x = (vooAtivo ? -.12 + Math.sin(t*3 + lado(ld))*.075 : Math.sin(passo + lado(ld))*.55*vel);
          if (e.noAr) x = -.55; else if (j === 'area' && t1 > .3 && t1 < .5) x = -.35;
          if (j === 'combo' && e.ataque.membro === 'perna' && ld > 0) x = -1.35*atkCurva;     // chute
          if (e.guarda || e.carga) x = ld > 0 ? -.35 : .25;
          rapidez = 18; break; }
        case 'perna': {          // joelho: dobra quando a perna vai para frente (levantando o pé)
          x = vooAtivo ? .25 + Math.sin(t*2.8 + lado(ld))*.07 : Math.max(0, Math.sin(passo + lado(ld) - Math.PI/2))*.75*vel + (e.noAr ? .7 : 0);
          rapidez = 18; break; }
        case 'braco': {
          if (inst.asasBracos && vooAtivo) {        // aves: os "braços" do esqueleto são as asas -> batem como asas
            const flap = Math.sin(asaFase);
            z = ld*(.18 + flap*(.42 - inst.velSuave*.14))*inst.ampAsa;
            x = -.08 - Math.max(0, flap)*.16 + (e.dano || 0)*.3;
            if (e.pose && e.pose.asas) { z = ld*.75; x = -.1; }
            if (e.ataque && j !== 'combo') x -= atkCurva*.35;
            rapidez = 13; break;
          }
          x = (vooAtivo ? -.22 + Math.sin(t*2.8 + ld)*.07 : -Math.sin(passo + lado(ld))*.38*vel) + Math.sin(t*2.2 + ld)*.05;
          const mb = e.ataque && e.ataque.membro;
          if (j === 'combo' && (mb === 'bracoD' && ld > 0 || mb === 'bracoE' && ld < 0)) x -= atkCurva*1.8;   // soco
          else if (j === 'combo' && mb === 'corpo') x -= atkCurva*1.2;
          else if (j === 'combo') x -= atkCurva*.25;
          else if (j === 'chuva' || j === 'buff' || (e.pose && e.pose.bracosCima)) x -= Math.max(atkCurva, e.pose && e.pose.bracosCima ? 1 : 0)*2.4;          // braços para cima
          else if (j === 'area') x -= atkCurva*.6;
          else if (e.ataque) x -= atkCurva*(melee ? (ld > 0 ? 1.6 : .3) : 1.15);
          if (e.dano) x += e.dano*.5;
          z = e.noAr ? -ld*.4 : -ld*Math.sin(t*1.1)*.04;
          if (e.guarda) { x = -1.25; z = ld*.55; }                       // braços cruzados na frente
          if (e.carga) { x = .7*e.carga; z = -ld*.3*e.carga; }
          if (e.pose && e.pose.bracosFrente) { x = -1.45; z = ld*.25; }
          if (e.caido || e.lancado) { x = -.4; z = -ld*.8; }
          rapidez = j === 'combo' ? 22 : 11; break; }
        case 'antebraco':
          if (inst.asasBracos && vooAtivo) { z = ld*Math.sin(asaFase - .7)*.32*inst.ampAsa; x = -.05; rapidez = 12; break; }   // ponta da asa atrasada: batida mais natural
          x = -atkCurva*.4 - .1*vel*Math.max(0, Math.sin(passo + lado(ld))); rapidez = 9; break;
        case 'cauda': {          // a onda passa do começo para a ponta (cada pedaço atrasado)
          const i = r.idx || 0;
          x = Math.sin(t*2 - i*.5)*.05 - vel*.08;
          y = Math.sin(t*(1.8 + vel*4) - i*.7)*(.12 + vel*.1) + (e.inclinar || 0)*1.2;
          if (inst.enrolar) { x += inst.enrolar.x || 0; y += (inst.enrolar.y || 0) + Math.sin(t*1.1 - i*.45)*.06; }
          if (j === 'combo' && e.ataque.membro === 'cauda') y += Math.sin(t1*Math.PI)*.8;
          rapidez = 6 - Math.min(3, i*.6); break; }
        case 'cabeca':
          // a cabeça compensa o balanço do corpo (fica mais "olhando para frente")
          x = Math.sin(t*1.7)*.04 - Math.sin(passo*2)*.04*vel - atkCurva*(j === 'chuva' ? .6 : .15) + (e.dano || 0)*.3 - vel*.08;
          y = Math.sin(t*.5)*.15*(1 - Math.min(1, vel)) + Math.sin(t*.23)*.1*(1 - Math.min(1, vel));
          rapidez = 8; break;
        case 'pescoco':
          x = Math.sin(t*1.7 + .5)*.03; rapidez = 8; break;
        case 'coluna':
          x = Math.sin(t*2.2)*.035 - atkCurva*.1; y = Math.sin(passo)*.08*vel; z = Math.sin(passo)*.04*vel; rapidez = 10; break;
        case 'asa': {
          if (e.pose && e.pose.asas) { z = ld*1.1; rapidez = 10; break; }        // asas abertas (Flamethrower)
          const flap = Math.sin(asaFase);
          z = (vooAtivo ? ld*(.34 + flap*(.35 - inst.velSuave*.12)) : (e.noAr ? .5*Math.sin(t*12) : Math.sin(t*2.5)*.1 + vel*Math.sin(passo)*.12)*ld)*inst.ampAsa;
          x = (vooAtivo ? -.15 - Math.max(0,flap)*.22 : 0)*inst.ampAsa;
          y = (vooAtivo ? ld*(.10 + Math.sin(asaFase - .5)*.1) : 0)*inst.ampAsa;
          rapidez = vooAtivo ? 12 : 20; break; }
        case 'asa2':
          z = (vooAtivo ? .25 + Math.sin(asaFase - .65)*.45 : e.noAr ? Math.sin(t*12 - .7)*.4 : Math.sin(t*2.5 - .6)*.07)*ld*inst.ampAsa; rapidez = vooAtivo ? 10 : 20; break;
        case 'orelha': {
          const mexe = Math.sin(t*.37 + ld) > .7 ? 1 : 0;            // de vez em quando a orelha "mexe"
          x = mexe*Math.max(0, Math.sin(t*9))*.18 - vel*.15; rapidez = 7; break; }
      }
      const k = 1 - Math.exp(-dt*rapidez);
      r.x = (r.x || 0) + (x - (r.x || 0))*k; r.y = (r.y || 0) + (y - (r.y || 0))*k; r.z = (r.z || 0) + (z - (r.z || 0))*k;
      poseOsso(r, r.x, r.y, r.z);
    }
  }

  // piscar ao levar dano
  if (inst.flash > 0 || inst._piscando) {
    inst.flash = Math.max(0, inst.flash - dt*4);
    const k = inst.flash;
    for (const m of inst.materiais) if (m.emissive) {
      m.emissive.copy(m.userData.emi0 || _preto).lerp(inst.corFlash, k);
    }
    inst._piscando = k > 0;
  }
}
const _preto = new THREE.Color(0,0,0);
// Uma única textura radial de 64px compartilhada por todas as sombras.
const TEXTURA_SOMBRA_VOO = (() => {
  const can = document.createElement('canvas'); can.width = can.height = 64;
  const ctx = can.getContext('2d'), grad = ctx.createRadialGradient(32,32,2,32,32,31);
  grad.addColorStop(0,'rgba(4,11,24,.55)'); grad.addColorStop(.45,'rgba(4,11,24,.32)'); grad.addColorStop(1,'rgba(4,11,24,0)');
  ctx.fillStyle = grad; ctx.fillRect(0,0,64,64);
  const tex = new THREE.CanvasTexture(can); tex.generateMipmaps = false; tex.minFilter = THREE.LinearFilter; return tex;
})();

function liberarInstancia(inst){
  inst.raiz.parent && inst.raiz.parent.remove(inst.raiz);
  for (const m of inst.materiais) m.dispose();
  if (inst.sombraVoo) { inst.sombraVoo.material.dispose(); inst.sombraVoo.geometry.dispose(); }
}
