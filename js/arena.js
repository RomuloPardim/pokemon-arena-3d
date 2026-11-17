"use strict";
/* =========================================================
   ARENA 3D — renderizador, luzes, chão, arquibancada, obstáculos
   ========================================================= */
const RAIO_ARENA = 22;           // raio do campo (em metros do jogo)

const DISPOSITIVO_MOVEL = matchMedia('(pointer: coarse)').matches && Math.min(innerWidth, innerHeight) < 900;
const MEMORIA_CURTA = (navigator.deviceMemory && navigator.deviceMemory <= 4) || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4);
const renderer = new THREE.WebGLRenderer({ antialias: !DISPOSITIVO_MOVEL, powerPreference: 'high-performance', alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, DISPOSITIVO_MOVEL ? 1 : 1.5));
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMapping = THREE.NoToneMapping;   // cores fiéis aos modelos (ACES deixava tudo desbotado)
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.shadowMap.autoUpdate = false;
let relogioSombra = 1;
document.getElementById('palco').appendChild(renderer.domElement);

const cena = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(55, 1, .1, 400);

let ARENA = null;   // { mapa, grupo, obstaculos:[], perigos:[], sol, atualizar(dt) }

/* ----- Qualidade gráfica ----- */
const QUALIDADE = {
  baixa: { pixel: 1,    sombra: 0,    particulas: .5, pos: 'baixa' },
  media: { pixel: 1.25, sombra: 1024, particulas: .8, pos: 'media' },
  alta:  { pixel: 1.75, sombra: 2048, particulas: 1,  pos: 'alta' },
  auto:  { pixel: 1, sombra: 0, particulas: .5, pos: 'baixa' },
};
let QUAL = QUALIDADE.media;
let ESCALA_AUTO = 1, TEMPO_FPS = 0, AMOSTRAS_FPS = 0, QUADROS_FPS = 0;
let TEMPO_MEDIDOR = 0, QUADROS_MEDIDOR = 0, FPS_ATUAL = 60;
function aplicarQualidade(nome){
  if (nome === 'auto') QUAL = DISPOSITIVO_MOVEL
    ? (MEMORIA_CURTA ? { pixel: .86, sombra: 0, particulas: .46, pos: 'baixa' } : { pixel: 1.02, sombra: 512, particulas: .65, pos: 'baixa' })
    : { pixel: MEMORIA_CURTA ? 1.05 : 1.35, sombra: MEMORIA_CURTA ? 512 : 1024, particulas: MEMORIA_CURTA ? .72 : .95, pos: 'media' };
  else QUAL = QUALIDADE[nome] || QUALIDADE.media;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, QUAL.pixel * (nome === 'auto' ? ESCALA_AUTO : 1)));
  if (typeof ARENA !== 'undefined' && ARENA && ARENA.torcida) ARENA.torcida.mesh.count = Math.max(260, Math.round(900 * QUAL.particulas));
  renderer.shadowMap.needsUpdate = true;
  renderer.shadowMap.enabled = QUAL.sombra > 0;
  if (ARENA && ARENA.sol) { ARENA.sol.castShadow = QUAL.sombra > 0; if (QUAL.sombra) { ARENA.sol.shadow.mapSize.set(QUAL.sombra, QUAL.sombra); ARENA.sol.shadow.map && ARENA.sol.shadow.map.dispose(); ARENA.sol.shadow.map = null; } }
  cena.traverse(o => { if (o.material) [].concat(o.material).forEach(m => m.needsUpdate = true); });
  configurarPos(QUAL.pos);
}
// V10: mede FPS no celular E no desktop; modo Automático faz ajustes sem mudar física/velocidade.
// Alterações pequenas e espaçadas evitam oscilações, travadas por realocação de buffers e perda excessiva de nitidez.
function avaliarDesempenho(dt){
  if (document.hidden || dt <= 0) return;
  TEMPO_MEDIDOR += dt; QUADROS_MEDIDOR++;
  if (TEMPO_MEDIDOR >= 1.2) {
    FPS_ATUAL = Math.round(QUADROS_MEDIDOR/TEMPO_MEDIDOR);
    const medidor = document.getElementById('indicadorFps');
    if (medidor) medidor.textContent = FPS_ATUAL + ' FPS · ' + (DISPOSITIVO_MOVEL ? 'Mobile' : 'Desktop');
    TEMPO_MEDIDOR = 0; QUADROS_MEDIDOR = 0;
  }
  if (typeof S === 'undefined' || S.qualidade !== 'auto') return;
  // Ajustar de acordo com o peso real das batalhas, não apenas do menu.
  if (typeof EM_BATALHA === 'function' && !EM_BATALHA()) { TEMPO_FPS = 0; QUADROS_FPS = 0; return; }
  TEMPO_FPS += dt; QUADROS_FPS++;
  if (TEMPO_FPS < 3.5) return;
  const fps = QUADROS_FPS / TEMPO_FPS;
  if (AMOSTRAS_FPS++ >= 1) {
    const minimo = DISPOSITIVO_MOVEL ? .62 : .72;
    const perda = fps < 34 ? .12 : fps < 49 ? .07 : 0;
    const ganho = fps > 58 ? .035 : 0;
    const nova = Math.min(1, Math.max(minimo, ESCALA_AUTO - perda + ganho));
    if (Math.abs(nova - ESCALA_AUTO) > .01) {
      ESCALA_AUTO = nova;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, QUAL.pixel * ESCALA_AUTO));
      if (typeof ajustarTamanhoPos === 'function') ajustarTamanhoPos();
    }
    // Também diminui os espectadores desenhados quando a GPU/CPU não acompanha.
    if (ARENA && ARENA.torcida) {
      const fator = fps < 36 ? .55 : fps < 48 ? .75 : 1;
      ARENA.torcida.mesh.count = Math.min(900, Math.max(260, Math.round(900 * QUAL.particulas * fator)));
    }
  }
  TEMPO_FPS = 0; QUADROS_FPS = 0;
}
// Cinemáticas: escurece o cenário (k de 0 a 1)
function ambienteCine(k, forca = .7){
  if (!ARENA || !ARENA.luzesBase) return;
  for (const [l, base] of ARENA.luzesBase) l.intensity = base*(1 - forca*k);
  if (cena.fog) cena.fog.color.copy(ARENA.neblinaBase).lerp(new THREE.Color(0x05030a), k*forca);
}

/* ----- Texturas desenhadas por código (canvas) ----- */
function texturaCanvas(tam, desenhar, repetir){
  const c = document.createElement('canvas'); c.width = c.height = tam;
  desenhar(c.getContext('2d'), tam);
  const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding;
  t.anisotropy = renderer.capabilities.getMaxAnisotropy();
  if (repetir) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repetir, repetir); }
  return t;
}
function ruidoPontos(g, tam, n, cores, rMin, rMax){
  for (let i = 0; i < n; i++) {
    g.fillStyle = cores[i % cores.length];
    const r = rMin + Math.random()*(rMax - rMin);
    g.beginPath(); g.arc(Math.random()*tam, Math.random()*tam, r, 0, 7); g.fill();
  }
}
// Chão do campo (um círculo grande). As marcações ficam no centro da textura.
function texturaChao(tipo){
  if (typeof TEXTURAS_CHAO !== 'undefined' && TEXTURAS_CHAO[tipo]) return texturaCanvas(DISPOSITIVO_MOVEL ? 1024 : 2048, TEXTURAS_CHAO[tipo]);
  return texturaCanvas(DISPOSITIVO_MOVEL ? 1024 : 2048, (g, T) => {
    const m = T/2, esc = T/(RAIO_ARENA*2 + 4);       // pixels por metro
    if (tipo === 'grama') {
      for (let i = 0; i < 24; i++) { g.fillStyle = i % 2 ? '#4f9a3a' : '#5aa844'; g.fillRect(i*T/24, 0, T/24 + 1, T); }
      ruidoPontos(g, T, 9000, ['#ffffff10','#00000012','#6fbf5518'], 1, 4);
      g.strokeStyle = '#f4f7ef'; g.lineWidth = .18*esc;
      g.beginPath(); g.arc(m, m, (RAIO_ARENA - 1.5)*esc, 0, 7); g.stroke();
      g.beginPath(); g.moveTo(m - (RAIO_ARENA-1.5)*esc, m); g.lineTo(m + (RAIO_ARENA-1.5)*esc, m); g.stroke();
      g.beginPath(); g.arc(m, m, 5*esc, 0, 7); g.stroke();
      // Pokébola no centro
      const pr = 2.6*esc;
      g.fillStyle = '#e8383d'; g.beginPath(); g.arc(m, m, pr, Math.PI, 0); g.fill();
      g.fillStyle = '#f5f5f5'; g.beginPath(); g.arc(m, m, pr, 0, Math.PI); g.fill();
      g.fillStyle = '#222'; g.fillRect(m - pr, m - .2*esc, pr*2, .4*esc);
      g.beginPath(); g.arc(m, m, .8*esc, 0, 7); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(m, m, .5*esc, 0, 7); g.fill();
      for (const s of [-1, 1]) { g.strokeStyle = '#f4f7ef'; g.strokeRect(m + s*(RAIO_ARENA-1.5)*esc - (s > 0 ? 5*esc : 0), m - 4*esc, 5*esc, 8*esc); }
    } else if (tipo === 'basalto') {
      g.fillStyle = '#2b2321'; g.fillRect(0, 0, T, T);
      ruidoPontos(g, T, 14000, ['#3a2f2b','#1d1716','#47362f','#2f2523'], 2, 9);
      // rachaduras brilhantes
      g.lineCap = 'round';
      for (let i = 0; i < 70; i++) {
        let x = Math.random()*T, y = Math.random()*T, a = Math.random()*7;
        g.strokeStyle = Math.random() < .5 ? '#ff7a1a' : '#ffb347'; g.lineWidth = 1 + Math.random()*3;
        g.beginPath(); g.moveTo(x, y);
        for (let k = 0; k < 8; k++) { a += (Math.random() - .5)*1.2; x += Math.cos(a)*30; y += Math.sin(a)*30; g.lineTo(x, y); }
        g.stroke();
      }
    } else {   // neve
      g.fillStyle = '#dbe8f5'; g.fillRect(0, 0, T, T);
      ruidoPontos(g, T, 12000, ['#f4f9ff','#c3d6ec','#b5cbe6','#e6f0fb'], 2, 10);
      g.strokeStyle = '#9fc4e6'; g.lineWidth = .14*esc;
      g.beginPath(); g.arc(m, m, (RAIO_ARENA - 1.5)*esc, 0, 7); g.stroke();
      g.beginPath(); g.arc(m, m, 5*esc, 0, 7); g.stroke();
    }
  });
}
function texturaCaixa(){
  return texturaCanvas(256, (g, T) => {
    g.fillStyle = '#b57a3e'; g.fillRect(0, 0, T, T);
    for (let i = 0; i < 6; i++) { g.fillStyle = i % 2 ? '#a96f37' : '#c08547'; g.fillRect(0, i*T/6, T, T/6 - 3); }
    g.strokeStyle = '#6b4320'; g.lineWidth = 14; g.strokeRect(7, 7, T - 14, T - 14);
    g.beginPath(); g.moveTo(10, 10); g.lineTo(T - 10, T - 10); g.stroke();
  });
}
function texturaPlaca(){
  return texturaCanvas(DISPOSITIVO_MOVEL ? 512 : 1024, (g, T) => {
    const cores = ['#e8383d','#2f6fd6','#f7c531','#3bb54a','#ffffff','#7a3fd0'];
    for (let i = 0; i < 8; i++) {
      g.fillStyle = cores[i % cores.length]; g.fillRect(i*T/8, 0, T/8, T);
      g.fillStyle = i % cores.length === 4 ? '#222' : '#fff';
      g.font = 'bold 54px sans-serif'; g.textAlign = 'center';
      g.fillText(['ARENA','POKÉ','LIGA','3D','REAL','TIME','GO!','BATALHA'][i], i*T/8 + T/16, T*.62);
    }
  });
}
// Céu: esfera grande com degradê
function criarCeu(corCima, corBaixo){
  const geo = new THREE.SphereGeometry(300, 32, 16);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { cima: { value: new THREE.Color(corCima) }, baixo: { value: new THREE.Color(corBaixo) } },
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: 'uniform vec3 cima; uniform vec3 baixo; varying vec3 vP; void main(){ float h = clamp(vP.y*1.6+.15,0.,1.); gl_FragColor = vec4(mix(baixo,cima,h),1.); }',
  });
  return new THREE.Mesh(geo, mat);
}

/* ----- Monta a arena de um mapa ----- */
function criarArena(idMapa){
  if (ARENA) {
    cena.remove(ARENA.grupo);
    const geometrias = new Set(), materiais = new Set(), texturas = new Set();
    ARENA.grupo.traverse(o => {
      if (o.geometry) geometrias.add(o.geometry);
      if (o.material) for (const m of (Array.isArray(o.material) ? o.material : [o.material])) materiais.add(m);
    });
    for (const m of materiais) {
      for (const chave of ['map','normalMap','emissiveMap','alphaMap','roughnessMap','metalnessMap','bumpMap'])
        if (m[chave] && m[chave].isTexture) texturas.add(m[chave]);
      m.dispose();
    }
    for (const g of geometrias) g.dispose();
    for (const t of texturas) t.dispose();
    if (ARENA.sol && ARENA.sol.shadow && ARENA.sol.shadow.map) ARENA.sol.shadow.map.dispose();
    renderer.shadowMap.needsUpdate = true;
  }
  const mapa = MAPAS[idMapa], grupo = new THREE.Group();
  const A = { id: idMapa, mapa, grupo, obstaculos: [], perigos: [], animar: [], reagir: [] };
  cena.add(grupo);
  cena.fog = new THREE.Fog(mapa.neblina, 45, 160);
  grupo.add(criarCeu(mapa.ceuCima ?? 0x4a9be8, mapa.neblina));

  // luzes
  const hemi = mapa.hemi || [0xdff0ff, 0x5a6b48];
  grupo.add(new THREE.HemisphereLight(hemi[0], hemi[1], mapa.amb));
  const sol = new THREE.DirectionalLight(mapa.sol, mapa.solForca);
  sol.position.set(14, 30, 10); sol.castShadow = true;
  const q = window.innerWidth < 700 ? 1024 : 2048;
  sol.shadow.mapSize.set(q, q);
  Object.assign(sol.shadow.camera, { left: -28, right: 28, top: 28, bottom: -28, near: 1, far: 80 });
  sol.shadow.bias = -.0006; sol.shadow.normalBias = .03;
  grupo.add(sol); grupo.add(sol.target); A.sol = sol;
  sol.castShadow = QUAL.sombra > 0; if (QUAL.sombra) sol.shadow.mapSize.set(QUAL.sombra, QUAL.sombra);

  // chão do campo
  const chao = new THREE.Mesh(new THREE.CircleGeometry(RAIO_ARENA + 2, 96),
    new THREE.MeshStandardMaterial({ map: texturaChao(mapa.chao), roughness: mapa.rugosidade ?? (mapa.chao === 'neve' ? .55 : .95), metalness: mapa.metal ?? 0 }));
  chao.rotation.x = -Math.PI/2; chao.receiveShadow = true; grupo.add(chao);
  // borda + chão de fora
  if (mapa.fora !== null) {
    const fora = new THREE.Mesh(new THREE.RingGeometry(RAIO_ARENA + 2, 140, 96, 1),
      new THREE.MeshStandardMaterial({ color: mapa.fora ?? 0x8c8f96, roughness: 1 }));
    fora.rotation.x = -Math.PI/2; fora.position.y = -.01; fora.receiveShadow = true; grupo.add(fora);
  }

  (MONTAR_MAPA[idMapa] || montarEstadio)(A);
  // guarda a força original das luzes (para escurecer nas cinemáticas)
  A.luzesBase = []; grupo.traverse(o => { if (o.isLight) A.luzesBase.push([o, o.intensity]); });
  A.neblinaBase = cena.fog.color.clone();
  ARENA = A;
  return A;
}

// adiciona um obstáculo com colisão circular
function addObstaculo(A, mesh, x, z, raio, opcoes = {}){
  mesh.position.x = x; mesh.position.z = z;
  mesh.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  A.grupo.add(mesh);
  const ob = { mesh, x, z, raio, altura: opcoes.altura || 2, hp: opcoes.hp || 0, hpMax: opcoes.hp || 0, quebravel: !!opcoes.hp, vivo: true, cor: opcoes.cor || 0x888888 };
  A.obstaculos.push(ob); return ob;
}
const MONTAR_MAPA = { estadio: a => montarEstadio(a), vulcao: a => montarVulcao(a), gelo: a => montarGelo(a) };
const POSICOES_OBST = [[-8, -5], [8, 5], [-8, 5], [8, -5], [-15, 9], [15, -9]];

function montarEstadio(A){
  // muro e placas
  const muro = new THREE.Mesh(new THREE.CylinderGeometry(RAIO_ARENA + 2.2, RAIO_ARENA + 2.2, 1.6, 96, 1, true),
    new THREE.MeshStandardMaterial({ map: texturaPlaca(), side: THREE.BackSide, roughness: .7 }));
  muro.material.map.wrapS = THREE.RepeatWrapping; muro.material.map.repeat.set(4, 1);
  muro.position.y = .8; A.grupo.add(muro);
  // arquibancada (degraus) com torcida
  const corDegrau = [0x2e3a55, 0x34426a, 0x3b4b78, 0x2e3a55, 0x34426a];
  for (let i = 0; i < 5; i++) {
    const r0 = RAIO_ARENA + 2.4 + i*2.2;
    const deg = new THREE.Mesh(new THREE.CylinderGeometry(r0 + 2.2, r0 + 2.2, 1.4 + i*1.4, 96, 1, true),
      new THREE.MeshStandardMaterial({ color: corDegrau[i], side: THREE.BackSide, roughness: .9 }));
    deg.position.y = (1.4 + i*1.4)/2; A.grupo.add(deg);
    const tampa = new THREE.Mesh(new THREE.RingGeometry(r0, r0 + 2.2, 96), new THREE.MeshStandardMaterial({ color: 0x48557a, roughness: .9 }));
    tampa.rotation.x = -Math.PI/2; tampa.position.y = 1.4 + i*1.4; A.grupo.add(tampa);
  }
  // torcida: muitos "bonequinhos" numa InstancedMesh (rápido de desenhar)
  const qtd = 900, geo = new THREE.CapsuleGeometry(.35, .5, 3, 6);
  const mat = new THREE.MeshStandardMaterial({ roughness: .8 });
  const torcida = new THREE.InstancedMesh(geo, mat, qtd), base = [];
  const m4 = new THREE.Matrix4(), cor = new THREE.Color();
  const paleta = [0xe8383d, 0x2f6fd6, 0xf7c531, 0x3bb54a, 0xffffff, 0x7a3fd0, 0xff8a3d, 0x29c6c6];
  for (let i = 0; i < qtd; i++) {
    const fileira = i % 5, a = Math.random()*Math.PI*2, r = RAIO_ARENA + 3.5 + fileira*2.2 + Math.random()*.6;
    const y = 1.4 + fileira*1.4 + .6;
    base.push({ x: Math.cos(a)*r, y, z: Math.sin(a)*r, f: Math.random()*7, v: 4 + Math.random()*5 });
    m4.makeTranslation(Math.cos(a)*r, y, Math.sin(a)*r); torcida.setMatrixAt(i, m4);
    torcida.setColorAt(i, cor.setHex(paleta[i % paleta.length]));
  }
  torcida.count = Math.max(260, Math.round(qtd * QUAL.particulas));
  A.grupo.add(torcida);
  A.torcida = { mesh: torcida, base, empolgacao: 0 };
  let relogioTorcida = 0;
  A.animar.push(dt => {
    const T = A.torcida; T.empolgacao = Math.max(0, T.empolgacao - dt*.5);
    relogioTorcida += dt;
    // Torcida é detalhe de fundo: 18 Hz mobile / 24 Hz desktop basta.
    if (relogioTorcida < (DISPOSITIVO_MOVEL ? 1/18 : 1/24)) return;
    relogioTorcida %= (DISPOSITIVO_MOVEL ? 1/18 : 1/24);
    const t = performance.now()/1000;
    for (let i = 0; i < torcida.count; i++) {
      const b = base[i], pulo = Math.max(0, Math.sin(t*b.v + b.f)) * (.08 + T.empolgacao*.6);
      m4.makeTranslation(b.x, b.y + pulo, b.z); torcida.setMatrixAt(i, m4);
    }
    torcida.instanceMatrix.needsUpdate = true;
  });
  // refletores
  for (let i = 0; i < 4; i++) {
    const a = i*Math.PI/2 + Math.PI/4, r = RAIO_ARENA + 14;
    const poste = new THREE.Mesh(new THREE.CylinderGeometry(.35, .5, 22, 8), new THREE.MeshStandardMaterial({ color: 0x9aa3b5, metalness: .6, roughness: .4 }));
    poste.position.set(Math.cos(a)*r, 11, Math.sin(a)*r); A.grupo.add(poste);
    const luz = new THREE.Mesh(new THREE.BoxGeometry(4, 2.4, .6), new THREE.MeshBasicMaterial({ color: 0xfffbe8 }));
    luz.position.set(Math.cos(a)*r, 22, Math.sin(a)*r); luz.lookAt(0, 0, 0); A.grupo.add(luz);
  }
  // caixas quebráveis
  const tex = texturaCaixa();
  POSICOES_OBST.slice(0, 4).forEach(([x, z]) => {
    const cx = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), new THREE.MeshStandardMaterial({ map: tex, roughness: .85 }));
    cx.position.y = 1; cx.rotation.y = Math.random();
    const g = new THREE.Group(); g.add(cx);
    addObstaculo(A, g, x, z, 1.3, { hp: 120, altura: 2, cor: 0xb57a3e });
  });
  // pilares (indestrutíveis)
  POSICOES_OBST.slice(4).forEach(([x, z]) => {
    const g = new THREE.Group();
    const p = new THREE.Mesh(new THREE.CylinderGeometry(1, 1.2, 3, 16), new THREE.MeshStandardMaterial({ color: 0xe8e8ee, roughness: .5 }));
    p.position.y = 1.5; g.add(p);
    const topo = new THREE.Mesh(new THREE.SphereGeometry(.9, 20, 12, 0, 7, 0, Math.PI/2), new THREE.MeshStandardMaterial({ color: 0xe8383d, roughness: .35 }));
    topo.position.y = 3; g.add(topo);
    addObstaculo(A, g, x, z, 1.2, { altura: 3.5 });
  });
}

function rochaMesh(raio, cor, detalhe = 0){
  const geo = new THREE.DodecahedronGeometry(raio, detalhe);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) { const k = .8 + Math.random()*.35; pos.setXYZ(i, pos.getX(i)*k, pos.getY(i)*k*1.1, pos.getZ(i)*k); }
  geo.computeVertexNormals();
  return new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: cor, roughness: .95, flatShading: true }));
}

function montarVulcao(A){
  // paredão de rochas em volta
  for (let i = 0; i < 46; i++) {
    const a = i/46*Math.PI*2, r = RAIO_ARENA + 3 + Math.random()*3;
    const ro = rochaMesh(2.5 + Math.random()*2.5, Math.random() < .5 ? 0x2a201d : 0x3a2c27);
    ro.position.set(Math.cos(a)*r, 1 + Math.random()*2, Math.sin(a)*r); ro.rotation.set(Math.random(), Math.random()*7, Math.random());
    ro.castShadow = true; A.grupo.add(ro);
  }
  // vulcão ao fundo
  const cone = new THREE.Mesh(new THREE.ConeGeometry(40, 45, 24, 1, true), new THREE.MeshStandardMaterial({ color: 0x24191a, roughness: 1, flatShading: true }));
  cone.position.set(-30, 18, -120); A.grupo.add(cone);
  const boca = new THREE.Mesh(new THREE.CircleGeometry(9, 24), new THREE.MeshBasicMaterial({ color: 0xff6a1a }));
  boca.rotation.x = -Math.PI/2; boca.position.set(-30, 30.5, -120); A.grupo.add(boca);
  // poças de lava (machucam)
  const texLava = texturaCanvas(256, (g, T) => {
    g.fillStyle = '#ff5a10'; g.fillRect(0, 0, T, T);
    ruidoPontos(g, T, 500, ['#ffb32a','#ff7a1a','#ffd86b','#e03a00'], 4, 18);
  }, 2);
  for (const [x, z, r] of [[-14, 0, 3.2], [14, 0, 3.2], [0, 0, 2.2]]) {
    const lava = new THREE.Mesh(new THREE.CircleGeometry(r, 40), new THREE.MeshBasicMaterial({ map: texLava, color: 0xffffff }));
    lava.rotation.x = -Math.PI/2; lava.position.set(x, .03, z); A.grupo.add(lava);
    const borda = new THREE.Mesh(new THREE.RingGeometry(r, r + .5, 40), new THREE.MeshStandardMaterial({ color: 0x1a1110, roughness: 1 }));
    borda.rotation.x = -Math.PI/2; borda.position.set(x, .035, z); A.grupo.add(borda);
    const luz = new THREE.PointLight(0xff6a1a, 2.2, r*4, 2); luz.position.set(x, 1.2, z); A.grupo.add(luz);
    A.perigos.push({ tipo: 'lava', x, z, r });
  }
  A.animar.push(dt => { texLava.offset.x += dt*.05; texLava.offset.y += dt*.03; });
  // rochas no campo
  POSICOES_OBST.forEach(([x, z]) => {
    const ro = rochaMesh(1.4, 0x3d302b); ro.position.y = 1.1;
    const g = new THREE.Group(); g.add(ro);
    addObstaculo(A, g, x, z, 1.4, { altura: 2.4 });
  });
}

function montarGelo(A){
  const matGelo = new THREE.MeshStandardMaterial({ color: 0x7cc4ff, roughness: .12, metalness: .15, transparent: true, opacity: .88, emissive: 0x1d5fa8, emissiveIntensity: .35 });
  // paredes de gelo
  for (let i = 0; i < 40; i++) {
    const a = i/40*Math.PI*2, r = RAIO_ARENA + 3 + Math.random()*2.5;
    const h = 3 + Math.random()*6;
    const c = new THREE.Mesh(new THREE.ConeGeometry(1.4 + Math.random(), h, 5), matGelo);
    c.position.set(Math.cos(a)*r, h/2 - .3, Math.sin(a)*r); c.rotation.set((Math.random() - .5)*.4, Math.random()*7, (Math.random() - .5)*.4);
    A.grupo.add(c);
  }
  // montanhas ao fundo
  for (let i = 0; i < 9; i++) {
    const a = i/9*Math.PI*2, m = new THREE.Mesh(new THREE.ConeGeometry(22 + Math.random()*12, 40 + Math.random()*25, 7), new THREE.MeshStandardMaterial({ color: 0xe9f2fb, roughness: 1, flatShading: true }));
    m.position.set(Math.cos(a)*120, 14, Math.sin(a)*120); A.grupo.add(m);
  }
  // placas de gelo liso (escorrega)
  for (const [x, z, r] of [[-12, 0, 4], [12, 0, 4], [0, 0, 3.2]]) {
    const p = new THREE.Mesh(new THREE.CircleGeometry(r, 40), new THREE.MeshStandardMaterial({ color: 0xbfe6ff, roughness: .05, metalness: .2, transparent: true, opacity: .75 }));
    p.rotation.x = -Math.PI/2; p.position.set(x, .03, z); p.receiveShadow = true; A.grupo.add(p);
    A.perigos.push({ tipo: 'gelo', x, z, r });
  }
  // cristais (quebráveis)
  POSICOES_OBST.forEach(([x, z], i) => {
    const g = new THREE.Group();
    for (let k = 0; k < 3; k++) {
      const c = new THREE.Mesh(new THREE.OctahedronGeometry(.7 + Math.random()*.4), matGelo);
      c.scale.y = 2.2; c.position.set((k - 1)*.55, 1.3 + Math.random()*.3, (Math.random() - .5)*.6); c.rotation.z = (k - 1)*.3;
      g.add(c);
    }
    addObstaculo(A, g, x, z, 1.3, i < 4 ? { hp: 100, altura: 2.8, cor: 0xa8dcff } : { altura: 2.8 });
  });
}

function atualizarArena(dt){
  if (ARENA) for (const f of ARENA.animar) f(dt);
  if (renderer.shadowMap.enabled) {
    relogioSombra += dt;
    const intervalo = DISPOSITIVO_MOVEL ? 1/24 : (typeof S !== 'undefined' && S.qualidade === 'alta' ? 1/60 : 1/30);
    if (relogioSombra >= intervalo) { renderer.shadowMap.needsUpdate = true; relogioSombra %= intervalo; }
  }
}

// Obstáculo entre a câmera e o jogador fica transparente
function transparenciaObstaculos(lutadores){
  if (!ARENA) return;
  const cx = camera.position.x, cz = camera.position.z;
  for (const o of ARENA.obstaculos) {
    if (!o.vivo) continue;
    let tapa = false;
    for (const L of lutadores) {
      if (!L) continue;
      const dx = L.pos.x - cx, dz = L.pos.z - cz, L2 = dx*dx + dz*dz || 1;
      const t = THREE.MathUtils.clamp(((o.x - cx)*dx + (o.z - cz)*dz)/L2, 0, 1);
      const px = cx + dx*t - o.x, pz = cz + dz*t - o.z;
      if (t < .98 && px*px + pz*pz < (o.raio + .8)**2 && camera.position.y < o.altura + 6) tapa = true;
    }
    if (tapa !== !!o.tapando) {
      o.tapando = tapa;
      o.mesh.traverse(m => { if (m.isMesh) {
        if (m.userData.op0 === undefined) { m.userData.op0 = m.material.opacity; m.userData.tr0 = m.material.transparent; }
        m.material.transparent = tapa || m.userData.tr0; m.material.opacity = tapa ? .22 : m.userData.op0; m.material.needsUpdate = true; m.castShadow = !tapa; } });
    }
  }
}

// Em qual "perigo" (lava/gelo) está o ponto?
function perigoEm(x, z){
  if (!ARENA) return null;
  for (const p of ARENA.perigos) if ((x - p.x)**2 + (z - p.z)**2 < p.r*p.r) return p.tipo;
  return null;
}

function redimensionar(){
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h); camera.aspect = w/h;
  camera.fov = w < h ? 72 : 52;           // celular em pé: campo de visão maior
  camera.userData.fov0 = camera.fov;
  camera.updateProjectionMatrix();
  if (typeof ajustarTamanhoPos === 'function') ajustarTamanhoPos();
}
window.addEventListener('resize', redimensionar);
redimensionar();
