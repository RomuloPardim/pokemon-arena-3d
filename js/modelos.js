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
  // "007_LThigh" / "LThigh_44" / "EarR_Armature_8" -> "LThigh" / "EarR"
  const n = nomeOriginal.replace(/^\d+[\s_]+/, '').replace(/_Armature(_\d+)?$/, '').replace(/_\d+$/, '');
  let lado = 0;
  if (/^(left_|L(?=[A-Z])|L_(?=[A-Za-z]))/.test(n)) lado = -1;
  else if (/^(right_|R(?=[A-Z])|R_(?=[A-Za-z]))/.test(n)) lado = 1;
  let b = n.replace(/^(left_|right_|L(?=[A-Z])|R(?=[A-Z])|L_(?=[A-Za-z])|R_(?=[A-Za-z]))/, '').toLowerCase();
  if (!lado) { const m = n.match(/[a-z_](R|L)$/); if (m) { lado = m[1] === 'L' ? -1 : 1; b = b.slice(0, -1).replace(/_$/, ''); } }   // "EarR", "Ear_tipL"
  let numLado = '';
  if (!lado) { const m = n.match(/_(L|R)(\d*)$/); if (m) { lado = m[1] === 'L' ? -1 : 1; numLado = m[2]; b = b.replace(/_(l|r)\d*$/, ''); } }   // "Front_Leg_L001" (quadrúpedes)
  let parte = null;
  // quadrúpedes com nomes "Front_Leg / Back_Leg" (ex.: Zacian): patas da frente = braços, de trás = pernas
  const nl = numLado === '' ? 0 : +numLado;
  if (/^front_?leg$/.test(b) && lado) parte = nl === 0 ? 'braco' : nl === 1 ? 'antebraco' : 'mao';
  else if (/^front_?foot$/.test(b) && lado) parte = 'mao';
  else if (/^(back|hind|rear)_?leg$/.test(b) && lado) parte = nl === 0 ? 'coxa' : nl === 1 ? 'perna' : 'pe';
  else if (/^(back|hind|rear)_?foot$/.test(b) && lado) parte = 'pe';
  else if (/^thigh|^leg_?0?1$|^upperleg/.test(b)) parte = 'coxa';
  else if (/^leg$|^calf$/.test(b) && lado) parte = 'perna';
  else if (/^arm\d?$|^arm_0?1$|^upperarm|^arma$/.test(b) && lado) parte = 'braco';
  else if (/^forearm\d?$|^arm_0?2$/.test(b) && lado) parte = 'antebraco';
  else if (/^wing_?0?1$|^wing$|^wing1$/.test(b) && lado) parte = 'asa';
  else if (/^wing_?0?[2-3]$/.test(b) && lado) parte = 'asa2';
  else if (/tail/.test(b)) parte = 'cauda';
  else if (/^head$/.test(b)) parte = 'cabeca';
  else if (/^neck_?0?\d?$/.test(b)) parte = 'pescoco';             // Neck1, Neck2, neck_03 (pescoços longos)
  else if (/^spine_?0?1$|^spine$|^body$/.test(b)) parte = 'coluna';
  else if (/^ear_?0?1$|^ear$|^ear1$/.test(b) && lado) parte = 'orelha';
  else if (/^(lower)?jaw_?0?1?$|^lowerjaw\d?$|^mouth$|^mouse$/.test(b)) parte = 'mandibula';     // boca abre nos golpes
  else if (/^shoulder\d?$/.test(b) && lado) parte = 'ombro';
  else if (/^foot(sub)?\d?$/.test(b) && lado) parte = 'pe';
  else if (/^hand(sub)?\d?$/.test(b) && lado) parte = 'mao';
  else if (/^(finger|toe|index|middle|ring|pinky|thumb)/.test(b)) parte = 'dedo';
  // pedaços soltos (penas, cabelo, roupa, barbatanas...): balançam com "mola"
  else if (/^(feeler|hair|cloth|curl|wing_?ex|tongue|ribbon|cape|scarf|fin|whisker|antenna|horn|crest|feather|petal|vine|tentacle|ear|sleeve|skirt|plume|mane|nose|cheek|leaf|flame|fire)/.test(b)) parte = 'apendice';
  const num = +(b.match(/(\d+)$/)?.[1] || 0);
  return { lado, parte, num };
}

/* ----- Modelos sem esqueleto (ex.: Snorlax): cria um esqueleto simples pela forma do modelo -----
   Assim o corpo, a cabeça, os braços e as pernas também se mexem. */
function autoRig(obj){
  let temOsso = false; obj.traverse(o => { if (o.isBone) temOsso = true; });
  if (temOsso) return;
  const malhas = []; obj.traverse(o => { if (o.isMesh && !o.isSkinnedMesh) malhas.push(o); });
  if (!malhas.length) return;
  obj.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(obj.matrixWorld).invert(), rel = new THREE.Matrix4();
  const caixa = new THREE.Box3(), v = new THREE.Vector3();
  for (const m of malhas) { rel.multiplyMatrices(inv, m.matrixWorld); const pos = m.geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) caixa.expandByPoint(v.fromBufferAttribute(pos, i).applyMatrix4(rel)); }
  const tam = caixa.getSize(new THREE.Vector3()), mn = caixa.min, cx = (mn.x + caixa.max.x)/2, cz = (mn.z + caixa.max.z)/2;
  const P = (x, y) => new THREE.Vector3(cx + x*tam.x, mn.y + y*tam.y, cz);
  const def = [['Hips', null, P(0,.3)], ['Spine', 'Hips', P(0,.55)], ['Neck', 'Spine', P(0,.74)], ['Head', 'Neck', P(0,.84)],
    ['LArm', 'Spine', P(.3,.62)], ['LForeArm', 'LArm', P(.42,.5)], ['RArm', 'Spine', P(-.3,.62)], ['RForeArm', 'RArm', P(-.42,.5)],
    ['LThigh', 'Hips', P(.2,.2)], ['LLeg', 'LThigh', P(.22,.08)], ['RThigh', 'Hips', P(-.2,.2)], ['RLeg', 'RThigh', P(-.22,.08)]];
  const ossos = {}, lista = [];
  for (const [nome, pai, pos] of def) {
    const o = new THREE.Bone(); o.name = nome; o.userData.pos = pos; o.userData.auto = true; ossos[nome] = o; lista.push(o);
    if (pai) { ossos[pai].add(o); o.position.copy(pos).sub(ossos[pai].userData.pos); } else { obj.add(o); o.position.copy(pos); }
  }
  const idx = Object.fromEntries(lista.map((o, i) => [o.name, i]));
  const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a)/(b - a))); return t*t*(3 - 2*t); };
  const esqueleto = new THREE.Skeleton(lista);
  for (const m of malhas) {
    rel.multiplyMatrices(inv, m.matrixWorld);
    const g = m.geometry.clone();
    for (const nome of ['position', 'normal']) {          // malha compactada (inteiros) -> números normais antes de mexer
      const a = g.attributes[nome]; if (!a || a.array instanceof Float32Array) continue;
      const f = new Float32Array(a.count*3); for (let i = 0; i < a.count; i++) { f[i*3] = a.getX(i); f[i*3+1] = a.getY(i); f[i*3+2] = a.getZ(i); }
      g.setAttribute(nome, new THREE.Float32BufferAttribute(f, 3));
    }
    g.applyMatrix4(rel);
    const pos = g.attributes.position, n = pos.count, si = new Uint16Array(n*4), sw = new Float32Array(n*4);
    for (let i = 0; i < n; i++) {
      v.fromBufferAttribute(pos, i);
      const xr = (v.x - cx)/tam.x, yr = (v.y - mn.y)/tam.y, lado = xr >= 0 ? 'L' : 'R', ax = Math.abs(xr);
      const pesos = {};
      const braco = sm(.3, .42, ax)*sm(.36, .46, yr)*(1 - sm(.74, .84, yr));
      const perna = sm(.3, .14, yr)*sm(.05, .14, ax);
      const cabeca = sm(.7, .8, yr)*(1 - braco);
      if (braco > 0) pesos[lado + (ax > .4 ? 'ForeArm' : 'Arm')] = braco;
      if (perna > 0) pesos[lado + (yr < .12 ? 'Leg' : 'Thigh')] = perna;
      if (cabeca > 0) pesos.Head = cabeca;
      const resto = Math.max(0, 1 - braco - perna - cabeca);
      if (resto > 0) { pesos.Spine = resto*sm(.3, .5, yr); pesos.Hips = resto - pesos.Spine; }
      const ord = Object.entries(pesos).filter(e => e[1] > .001).sort((a, b) => b[1] - a[1]).slice(0, 4);
      const tot = ord.reduce((a, e) => a + e[1], 0) || 1;
      ord.forEach(([k, w], j) => { si[i*4 + j] = idx[k]; sw[i*4 + j] = w/tot; });
      if (!ord.length) { si[i*4] = idx.Hips; sw[i*4] = 1; }
    }
    g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4));
    g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sw, 4));
    const s = new THREE.SkinnedMesh(g, m.material); s.name = m.name; s.castShadow = m.castShadow; s.frustumCulled = false;
    m.parent.remove(m); obj.add(s);
  }
  obj.updateMatrixWorld(true);
  obj.traverse(o => { if (o.isSkinnedMesh) o.bind(esqueleto, o.matrixWorld); });
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
    let dir = null; let filho = o.children.find(f => f.isBone);
    if (!filho) o.traverse(f => { if (!filho && f !== o && f.isBone) filho = f; });   // filho "escondido" atrás de um nó comum (ex.: trLFeelerA2)
    if (filho) {
      const a = new THREE.Vector3(), b = new THREE.Vector3(); o.getWorldPosition(a); filho.getWorldPosition(b);
      dir = b.sub(a).applyQuaternion(raizInv); if (dir.lengthSq() > 1e-8) dir.normalize(); else dir = null;
    }
    ossos.push({ o, parte, lado: c.lado, num: c.num, b0: o.quaternion.clone(), qW, qWi: qW.clone().invert(), dir });
  }
  // braços esticados para os lados (pose em T): abaixa ~65°
  // (aves cujas asas são os "braços" do esqueleto ficam com as asas abertas)
  if (!opcoes.asasBracos) for (const r of ossos) if (r.parte === 'braco' && !r.o.userData.auto && r.dir && Math.abs(r.dir.y) < .5 && Math.abs(r.dir.x) > .6)
    r.descanso = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1), -Math.sign(r.dir.x)*1.1);
  // corrente genérica "Bone001, Bone002..." sem nenhuma parte reconhecida (ex.: Onix): vira uma cauda que ondula
  if (!ossos.length) obj.traverse(o => {
    if (!o.isBone) return; const m = o.name.match(/^bone_?(\d+)/i); if (!m) return;
    const qW = new THREE.Quaternion(); o.getWorldQuaternion(qW); qW.premultiply(raizInv);
    ossos.push({ o, parte: 'cauda', lado: 0, num: +m[1], b0: o.quaternion.clone(), qW, qWi: qW.clone().invert(), dir: null });
  });
  // índice da cauda (para a onda passar do começo para a ponta)
  const caudas = ossos.filter(r => r.parte === 'cauda').sort((a,b) => a.num - b.num);
  caudas.forEach((r, i) => r.idx = i);
  const porOsso = new Map(ossos.map(r => [r.o, r]));
  const temAsa = ossos.some(r => r.parte === 'asa');
  // Voadores sem asa no esqueleto (ex.: Zapdos): o "ombro" sem braço embaixo vira a asa
  if (opcoes.voa && !opcoes.asasBracos && !temAsa) for (const r of ossos) if (r.parte === 'ombro') {
    let temBraco = false; r.o.traverse(f => { const q = porOsso.get(f); if (q && q !== r && (q.parte === 'braco' || q.parte === 'antebraco')) temBraco = true; });
    if (!temBraco) r.parte = 'asa';
  }
  const asaNoModelo = ossos.some(r => r.parte === 'asa');
  // mandíbula: para que lado ela abre
  for (const r of ossos) if (r.parte === 'mandibula') r.sinal = r.dir && r.dir.z < -.3 ? -1 : 1;
  // pedaços soltos: profundidade na corrente, em que parte do corpo estão presos e se fazem papel de asa
  for (const r of ossos) if (r.parte === 'apendice') {
    let prof = 0, p = r.o.parent, ancora = null;
    while (p && p.isBone) { const q = porOsso.get(p); if (q && q.parte === 'apendice') prof++; else if (q) { ancora = q.parte; break; } p = p.parent; }
    r.prof = Math.min(prof, 6); r.ancora = ancora; r.fase = Math.random()*6.28;
    r.noBraco = ['braco', 'antebraco', 'mao', 'dedo', 'asa', 'asa2'].includes(ancora);
    // penas laterais presas no tronco de quem voa e não tem asa própria (ex.: asas do Charizard, do Hydreigon)
    r.asaCadeia = !!(opcoes.voa && !opcoes.asasBracos && r.lado && (ancora === 'coluna' || ancora === 'ombro') && !asaNoModelo
      && (!r.dir || Math.abs(r.dir.x) > .35 || prof > 0));
    r.vx = 0; r.vz = 0; r.x = 0; r.z = 0;
  }
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
  parado:   [/battlewait01_loop/, /defaultwait01_loop/, /wait.*loop/, /bd_wait00/, /bd_battle/, /idle/i],
  andar:    [/walk01_loop/, /walk/],
  correr:   [/run01_loop/, /run$/, /bd_run/],
  ataque:   [/_attack01$/, /attack01/, /bd_attack$/],
  distancia:[/rangeattack01$/, /rangeattack/, /bd_special/, /bd_throw/],
  dano:     [/damage01$/, /damage/],
  desmaio:  [/down01_start/, /down/, /bd_fall/],
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
  // V19 rotModelo: [x, y, z] gira o modelo inteiro antes de medir (ex.: Pikachu deitado, Flareon/Onix virados para trás)
  if (dados.rotModelo) { obj.rotation.set(...dados.rotModelo); obj.updateMatrixWorld(true); }
  // V19 escalaOssos: [[/nome/, fator]] encolhe uma parte a partir de um osso (ex.: cauda comprida da Mega Charizard Y)
  if (dados.escalaOssos) { obj.traverse(o => { if (!o.isBone) return; for (const [re, k] of dados.escalaOssos) if (re.test(o.name)) o.scale.multiplyScalar(k); }); obj.updateMatrixWorld(true); }
  // poseFixa: gira um nó do modelo uma vez (no espaço do modelo), ex.: abaixar os braços-fita do Deoxys
  if (dados.poseFixa) { obj.updateMatrixWorld(true); const qR = new THREE.Quaternion(), qP = new THREE.Quaternion(), qN = new THREE.Quaternion();
    for (const [nome, [rx, ry, rz]] of Object.entries(dados.poseFixa)) obj.traverse(o => {
      if (!o.name.startsWith(nome) || !o.parent) return;
      qR.setFromEuler(new THREE.Euler(rx, ry, rz)); o.parent.getWorldQuaternion(qP); o.getWorldQuaternion(qN);
      o.quaternion.copy(qP.invert().multiply(qR).multiply(qN)); o.updateMatrixWorld(true);
    }); }
  if (!dados.semAutoRig) autoRig(obj);               // modelo sem esqueleto ganha um simples (semAutoRig: desliga, ex.: Snorlax)
  const caixa = medirModelo(obj), tam = caixa.getSize(new THREE.Vector3()), centro = caixa.getCenter(new THREE.Vector3());
  // escalaModelo: corrige modelos cuja medição engana (ex.: Giratina) sem mudar a altura usada no combate
  // crescer: aumenta o Pokémon inteiro (visual e colisão) — usado nos que ficavam pequenos demais na tela
  const altura = dados.altura * (dados.crescer || 1);
  const k = altura / Math.max(tam.y, .001) * (dados.escalaModelo || 1);
  const ajuste = new THREE.Group(); ajuste.add(obj);
  ajuste.scale.setScalar(k);
  ajuste.position.set(-centro.x*k, -caixa.min.y*k, -centro.z*k);
  const corpo = new THREE.Group(); corpo.add(ajuste);
  const raiz = new THREE.Group(); raiz.add(corpo);

  const inst = {
    id, raiz, corpo, ajuste, obj, materiais,
    altura,
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
    sombra.scale.set(Math.max(1.5, altura*1.25), Math.max(1.5, altura*1.25), 1); raiz.add(sombra); inst.sombraVoo = sombra;
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
    // com a cauda curvada o ponto mais baixo muda: mede de novo para os pés ficarem no chão (ex.: Arbok, Inteleon)
    if (inst.enrolar && inst.ossos.length) {
      for (let f = 0; f < 45; f++) animarInstancia(inst, 1/30, { vel: 0, voa: dados.voa });   // deixa a curva assentar
      corpo.position.set(0, 0, 0); corpo.rotation.set(0, 0, 0); corpo.scale.set(1, 1, 1); raiz.updateMatrixWorld(true);
      obj.traverse(o => { if (o.isSkinnedMesh) o.skeleton.update(); });
      ajuste.position.y -= medirModelo(obj).min.y;
    }
  }
  // emissivo original (para o "piscar" ao levar dano)
  for (const m of materiais) if (m.emissive) m.userData.emi0 = m.emissive.clone();
  if (dados.fogoCauda) montarFogo(inst, dados.fogoCauda);   // V19: fogo de verdade na cauda
  // V17: sprite animado no lugar do modelo (Configurações → Visual da luta). Megas com modelo próprio usam o sprite da forma.
  if (usarSprites()) { const sid = dados.spriteId || (typeof id === 'number' ? id : null); if (sid) await vestirSprite(inst, sid); }
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
/* V20: corpo inteiro — mola = rapidez da pose (maior = mais "duro"), amortecer < 1 passa um pouco do ponto (mais fluido).
   Os outros números (1 = padrão) aumentam ou diminuem cada tipo de movimento. */
const MOV = { mola: 170, amortecer: .62, corrida: 1, arranque: 1, pulo: 1, esquiva: 1, parado: 1 };
/* V18: quanto cada parte "solta" mexe (1 = padrão). Aumente para ficar mais vivo, diminua se algum modelo exagerar. */
const VIDA = { cauda: 1.25, orelha: 1.2, apendice: 1.3, cabeca: 1.15, inercia: 1.3 };
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
  // ----- V20: movimento mais fluido (uma pose para cada coisa) -----
  const vs = inst.velSuave || 0, corre = THREE.MathUtils.clamp((vs - .55)/.5, 0, 1);
  // aceleração (suavizada): inclina para frente ao arrancar e para trás ao frear
  const acel = THREE.MathUtils.clamp((vs - (inst._vsAnt ?? vs))/Math.max(dt, 1e-3), -8, 8); inst._vsAnt = vs;
  inst._acel = (inst._acel || 0) + (acel - (inst._acel || 0))*(1 - Math.exp(-dt*10));
  if (!j && !e.noAr) {
    inclX += corre*.13*MOV.corrida + THREE.MathUtils.clamp(inst._acel*.035, -.2, .22)*MOV.arranque;
    const pisada = Math.abs(Math.cos(f));                              // amassa um pouco a cada pisada correndo
    sy *= 1 - pisada*.035*corre*MOV.corrida; sx *= 1 + pisada*.018*corre*MOV.corrida;
  }
  // pulo em fases: impulso (estica) → topo (encolhe) → queda (estica e abre)
  if (e.noAr && !vooAtivo && !e.lancado && e.vy !== undefined && !j) {
    const vy = e.vy;
    if (vy > 3) { const k = Math.min(1, (vy - 3)/8); sy *= 1 + .12*k*MOV.pulo; sx *= 1 - .06*k*MOV.pulo; sz *= 1 - .06*k*MOV.pulo; inclX -= .1*k; }
    else if (vy > -3) { sy *= 1 - .06*MOV.pulo; inclX += .1*MOV.pulo; }
    else { const k = Math.min(1, (-vy - 3)/10); sy *= 1 + .07*k*MOV.pulo; inclX -= .06*k; }
  }
  // esquiva: abaixa e gira rápido
  if (e.esquiva > 0) { const k = Math.sin(e.esquiva*Math.PI); giroY += (inst._esqLado || 1)*e.esquiva*Math.PI*2*MOV.esquiva; sy *= 1 - .18*k; sx *= 1 + .08*k; sz *= 1 + .08*k; }
  else inst._esqLado = Math.random() < .5 ? 1 : -1;
  // parado: passa o peso de um pé para o outro
  const parado = Math.max(0, 1 - vs*4)*(e.noAr || j ? 0 : 1);
  // apanhou: torce o corpo de leve
  if (e.dano) giroY += Math.sin(inst.t*31)*.06*e.dano;
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
  sy *= 1 - inst.pouso*.22*MOV.pulo; sx *= 1 + inst.pouso*.1*MOV.pulo; sz *= 1 + inst.pouso*.1*MOV.pulo;   // V20: pouso mais marcado
  if (inst.pouso > .6) inclX += .12*MOV.pulo;
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
  const S = inst.sm || (inst.sm = { inclX: 0, sobe: 0, sx: 1, sy: 1, sz: 1, rolar: 0, v: { inclX: 0, sobe: 0, sx: 0, sy: 0, sz: 0 } });
  // V20: em vez de só "perseguir" a pose, cada valor é uma mola: chega rápido e passa um pouquinho (follow-through)
  const dtm = Math.min(dt, .05), kM = e.dano ? 320 : MOV.mola, cM = 2*MOV.amortecer*Math.sqrt(kM);
  for (const [n, alvo] of [['inclX', inclX], ['sobe', sobe], ['sx', sx], ['sy', sy], ['sz', sz]]) {
    S.v[n] += ((alvo - S[n])*kM - S.v[n]*cM)*dtm; S[n] += S.v[n]*dtm;
  }
  const rolar = (e.inclinar || 0)*(vooAtivo ? 1.8 : 1) + (inst.mixer ? 0 : Math.sin(f)*(.045 + .035*corre)*Math.min(1, vel)*MOV.corrida)
    + Math.sin(t*.8)*.035*parado*MOV.parado;                                     // balanço de um pé para o outro / peso parado
  S.rolar += (rolar - S.rolar)*(1 - Math.exp(-dt*(vooAtivo ? 7 : 10)));
  c.position.set(tremeX + (e.dano ? Math.sin(inst.t*70)*.04*e.dano : 0),
    (inst.mixer || e.voa ? 0 : Math.abs(Math.sin(f))*(.05 + .05*corre*MOV.corrida)*A*Math.min(1, vel)) + (e.alturaPulo || 0) + S.sobe + voo, 0);
  c.rotation.set(S.inclX + (vooAtivo ? -.04 - inst.velSuave*.095 - THREE.MathUtils.clamp((e.voando ? e.vy || 0 : 0)*.03, -.2, .25) : 0), giroY + (vooAtivo ? Math.sin(t*.8)*.045 : 0), (e.desmaio || 0)*1.45 + S.rolar + (vooAtivo ? Math.sin(t*1.3)*.035 : 0));
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
    // forças para as "molas" (penas, cabelo, roupa): aceleração, inclinação e subida do corpo
    const dtm = Math.min(dt, .05), idt = 1/Math.max(dtm, 1e-3);
    const dV = THREE.MathUtils.clamp((inst.velSuave - (inst._vAnt ?? inst.velSuave))*idt, -12, 12); inst._vAnt = inst.velSuave;
    const dI = THREE.MathUtils.clamp((S.inclX - (inst._iAnt ?? S.inclX))*idt, -12, 12); inst._iAnt = S.inclX;
    const yC = c.position.y, dY = THREE.MathUtils.clamp((yC - (inst._yAnt ?? yC))*idt/Math.max(.5, A), -8, 8); inst._yAnt = yC;
    const dG = THREE.MathUtils.clamp(((e.inclinar || 0) - (inst._gAnt ?? (e.inclinar || 0)))*idt, -10, 10); inst._gAnt = e.inclinar || 0;
    for (const r of inst.ossos) {
      const ld = r.lado || 1;
      if (r.parte === 'apendice') {        // mola amortecida: balança sozinho e "atrasa" quando o corpo mexe
        const p = r.prof, solto = 1 + p*.35;
        // V18: balanço maior e com dois ritmos (fica menos "duro"); a ponta mexe mais que a base
        let ax = (Math.sin(t*1.7 + r.fase - p*.7)*(.08 + p*.035) + Math.sin(t*3.1 + r.fase*2 - p)*.025)*VIDA.apendice,
            az = (Math.sin(t*1.25 + r.fase*1.3 - p*.5)*(.06 + p*.025) + Math.sin(t*2.6 + r.fase - p*.8)*.02)*ld*VIDA.apendice;
        ax += (inst.velSuave || 0)*(.12 + p*.05);                    // correndo, joga para trás
        if (vooAtivo && r.asaCadeia) { az = ld*(p ? Math.sin(asaFase - .5 - p*.45)*.16 : .3 + Math.sin(asaFase - .2)*(.5 - inst.velSuave*.1)); ax = -.06; }
        else if (vooAtivo && r.noBraco && inst.asasBracos) az += ld*Math.sin(asaFase - .9 - p*.4)*.16;
        if (e.pose && e.pose.asas && r.asaCadeia) az = ld*(p ? .1 : .9);
        if (e.ataque && (j === 'area' || j === 'chuva')) ax -= atkCurva*.25*solto;
        r.vx += ((ax - r.x)*55 - r.vx*6.5 - (dV*.13 + dI*.6 + dY*.45)*solto*VIDA.inercia)*dtm;
        r.vz += ((az - r.z)*55 - r.vz*6.5 + dG*.5*ld*solto*VIDA.inercia)*dtm;
        r.x = THREE.MathUtils.clamp(r.x + r.vx*dtm, -.9, .9); r.z = THREE.MathUtils.clamp(r.z + r.vz*dtm, -.9, .9);
        poseOsso(r, r.x, 0, r.z); continue;
      }
      let x = 0, y = 0, z = 0, rapidez = 14;
      switch (r.parte) {
        case 'mandibula': {      // boca: respira de leve, abre ao atacar, ao apanhar e ao carregar
          let ab = .02 + Math.max(0, Math.sin(t*.9 + 1))*.035;
          if (e.ataque) ab = j === 'combo' ? atkCurva*(e.ataque.membro === 'cabeca' ? .55 : .2)
            : Math.min(1, t1*4)*(1 - Math.max(0, (t1 - .7)/.3))*(j === 'raio' ? .55 : .42);
          if (e.dano) ab = Math.max(ab, e.dano*.4);
          if (e.carga) ab = Math.max(ab, .3*e.carga);
          if (e.desmaio) ab = .3;
          x = ab*r.sinal; rapidez = 18; break; }
        case 'ombro':
          x = -atkCurva*.12 - vel*Math.sin(passo + lado(ld))*.05; z = e.guarda ? .1*ld : 0; rapidez = 10; break;
        case 'pe': {             // pé acompanha o passo (fica mais "plantado" no chão)
          const coxaX = Math.sin(passo + lado(ld))*.55*vel, joelho = Math.max(0, Math.sin(passo + lado(ld) - Math.PI/2))*.75*vel;
          x = vooAtivo ? .4 + Math.sin(t*2.6 + lado(ld))*.06 : e.noAr ? .35 : -(coxaX + joelho)*.55 + joelho*.4;
          rapidez = 14; break; }
        case 'mao':
          x = -atkCurva*.3 + Math.sin(t*1.3 + ld)*.05 - vel*Math.sin(passo + lado(-ld))*.12; z = e.guarda ? .15*ld : 0; rapidez = 11; break;
        case 'dedo':
          x = (vooAtivo || e.noAr ? .32 : 0) + Math.sin(t*1.1 + (r.num || 0)*.7)*.035 + (j === 'combo' ? atkCurva*.4 : 0); rapidez = 9; break;
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
          if (inst.enrolar) {      // serpentes (Rayquaza, Arbok): curva fixa + onda suave, sem mola
            x = Math.sin(t*2 - i*.5)*.05 - vel*.08 + (inst.enrolar.x || 0);
            y = Math.sin(t*(1.8 + vel*4) - i*.7)*(.12 + vel*.1) + (e.inclinar || 0)*1.2 + (inst.enrolar.y || 0) + Math.sin(t*1.1 - i*.45)*.06;
            rapidez = 6 - Math.min(3, i*.6); break; }
          // V18: abana de verdade (a ponta mais que a base), levanta ao pular e "chicoteia" com mola nas curvas e arrancadas
          const amp = (.16 + i*.035 + vel*.12)*VIDA.cauda, rit = 2.3 + vel*3.5 + (e.ataque ? 2 : 0);
          let tx = Math.sin(t*1.5 - i*.6)*.07*VIDA.cauda - vel*.12 + (e.noAr ? -.22 : 0) + (e.dano || 0)*.25;
          let ty = Math.sin(t*rit - i*.8)*amp + Math.sin(t*.7 - i*.3)*.06*VIDA.cauda + (e.inclinar || 0)*1.2;
          if (j === 'combo' && e.ataque.membro === 'cauda') ty += Math.sin(t1*Math.PI)*.9;
          if (j === 'area' || j === 'chuva') tx -= atkCurva*.35;
          const solto = 1 + i*.35, kM = Math.max(22, 60 - i*7);
          r.wx = (r.wx || 0) + ((tx - (r.x || 0))*kM - (r.wx || 0)*6 + (dV*.1 + dY*.35)*solto*VIDA.inercia)*dtm;
          r.wy = (r.wy || 0) + ((ty - (r.y || 0))*kM - (r.wy || 0)*6 - dG*.35*solto*VIDA.inercia)*dtm;
          r.x = THREE.MathUtils.clamp((r.x || 0) + r.wx*dtm, -1.2, 1.2); r.y = THREE.MathUtils.clamp((r.y || 0) + r.wy*dtm, -1.2, 1.2);
          poseOsso(r, r.x, r.y, 0); continue; }
        case 'cabeca':
          // a cabeça compensa o balanço do corpo (fica mais "olhando para frente")
          x = Math.sin(t*1.7)*.04 - Math.sin(passo*2)*.04*vel - atkCurva*(j === 'chuva' ? .6 : .15) + (e.dano || 0)*.3 - vel*.08;
          y = (Math.sin(t*.5)*.2 + Math.sin(t*.23)*.13)*(1 - Math.min(1, vel))*VIDA.cabeca;
          z = Math.sin(t*.41 + 1)*.05*(1 - Math.min(1, vel))*VIDA.cabeca;       // inclina a cabeça de leve, curioso
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
        case 'orelha': {         // V18: balança de leve, "mexe" de vez em quando e sacode com mola ao pular/correr
          const mexe = Math.sin(t*.37 + ld) > .7 ? 1 : 0;
          const tx = (mexe*Math.max(0, Math.sin(t*9))*.22 + Math.sin(t*1.3 + ld)*.05)*VIDA.orelha - vel*.2 + (e.dano || 0)*.3;
          const tz = Math.sin(t*.9 + ld*2)*.05*ld*VIDA.orelha;
          r.wx = (r.wx || 0) + ((tx - (r.x || 0))*65 - (r.wx || 0)*7 - (dV*.12 + dY*.5)*VIDA.inercia)*dtm;
          r.wz = (r.wz || 0) + ((tz - (r.z || 0))*65 - (r.wz || 0)*7 + dG*.3*ld*VIDA.inercia)*dtm;
          r.x = THREE.MathUtils.clamp((r.x || 0) + r.wx*dtm, -.9, .9); r.z = THREE.MathUtils.clamp((r.z || 0) + r.wz*dtm, -.9, .9);
          poseOsso(r, r.x, 0, r.z); continue; }
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
  if (inst.spr) atualizarSprite(inst, dt, e);
  if (inst.fogo) atualizarFogo(inst, dt);
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
  if (inst.spr) { inst.spr.mat.map.dispose(); inst.spr.mat.dispose(); }
  if (inst.sombraSpr) inst.sombraSpr.material.dispose();
  liberarFogo(inst);
}
