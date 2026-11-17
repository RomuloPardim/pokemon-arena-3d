"use strict";
/* =========================================================
   EFEITOS VISUAIS
   - ATLAS: uma imagem 1024x1024 com 64 "células" de sprite (8x8):
     metade desenhada por código (chamas, faíscas, gotas, fumaça...) e
     metade vinda de sprites-efeitos.js (folhas, pedras, raio, punho...).
   - Partículas: um THREE.Points que desenha qualquer célula do atlas,
     com cor, tamanho, rotação e transparência próprios (rápido até no celular).
   - Sprites grandes (núcleo dos projéteis, clarões) usam THREE.Sprite.
   ========================================================= */
const CEL = 128, GRADE = 8;
const ATLAS_CANVAS = document.createElement('canvas'); ATLAS_CANVAS.width = ATLAS_CANVAS.height = CEL*GRADE;
const ATLAS = new THREE.CanvasTexture(ATLAS_CANVAS);
ATLAS.encoding = THREE.sRGBEncoding; ATLAS.minFilter = THREE.LinearFilter; ATLAS.generateMipmaps = false;
const CELULAS = {};          // nome -> índice da célula
const rnd = (a, b) => a + Math.random()*(b - a);

/* ----- Desenhos feitos por código (em branco/cinza: a cor vem depois, na hora de usar) ----- */
const DESENHOS = {
  brilho(g){ const r = g.createRadialGradient(64,64,0,64,64,62); r.addColorStop(0,'#fff'); r.addColorStop(.25,'rgba(255,255,255,.85)'); r.addColorStop(1,'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0,0,128,128); },
  nucleo(g){ const r = g.createRadialGradient(64,64,0,64,64,40); r.addColorStop(0,'#fff'); r.addColorStop(.6,'rgba(255,255,255,.9)'); r.addColorStop(1,'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0,0,128,128); },
  chama0(g){ chama(g, 0); }, chama1(g){ chama(g, 1); }, chama2(g){ chama(g, 2); },
  fumaca0(g){ fumaca(g, 1); }, fumaca1(g){ fumaca(g, 2); },
  faisca(g){ estrelaPontas(g, 4, 60, 6); },
  estrela(g){ g.fillStyle = '#fff'; g.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI/2 + i*Math.PI/5, r = i % 2 ? 22 : 54; g.lineTo(64 + Math.cos(a)*r, 64 + Math.sin(a)*r); } g.fill(); },
  anel(g){ g.strokeStyle = '#fff'; g.lineWidth = 7; g.shadowColor = '#fff'; g.shadowBlur = 10; g.beginPath(); g.arc(64,64,52,0,7); g.stroke(); },
  onda(g){ const r = g.createRadialGradient(64,64,30,64,64,62); r.addColorStop(0,'rgba(255,255,255,0)'); r.addColorStop(.75,'rgba(255,255,255,.95)'); r.addColorStop(1,'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0,0,128,128); },
  raio0(g){ zigue(g, 1); }, raio1(g){ zigue(g, 2); },
  gota(g){ const r = g.createRadialGradient(56,76,4,64,72,34); r.addColorStop(0,'#fff'); r.addColorStop(1,'rgba(255,255,255,.35)'); g.fillStyle = r; g.beginPath(); g.moveTo(64,14); g.bezierCurveTo(98,62,96,106,64,106); g.bezierCurveTo(32,106,30,62,64,14); g.fill(); },
  bolha(g){ g.strokeStyle = 'rgba(255,255,255,.9)'; g.lineWidth = 5; g.beginPath(); g.arc(64,64,44,0,7); g.stroke(); g.fillStyle = 'rgba(255,255,255,.18)'; g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.ellipse(48,46,12,7,-.7,0,7); g.fill(); },
  corte(g){ g.fillStyle = '#fff'; g.shadowColor = '#fff'; g.shadowBlur = 12; g.beginPath(); g.arc(64,80,56,Math.PI*1.1,Math.PI*1.9); g.arc(64,96,50,Math.PI*1.85,Math.PI*1.15,true); g.fill(); },
  shuriken(g){ g.translate(64,64); g.fillStyle = '#fff'; for (let i = 0; i < 4; i++) { g.rotate(Math.PI/2); g.beginPath(); g.moveTo(0,-8); g.quadraticCurveTo(30,-22,58,0); g.quadraticCurveTo(26,-4,0,8); g.fill(); } g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.arc(0,0,8,0,7); g.fill(); },
  runa(g){ g.translate(64,64); g.strokeStyle = '#fff'; g.lineWidth = 3; g.beginPath(); g.arc(0,0,58,0,7); g.stroke(); g.beginPath(); g.arc(0,0,46,0,7); g.stroke();
    g.lineWidth = 2; g.beginPath(); for (let i = 0; i < 6; i++) { const a = i*Math.PI/3; g.lineTo(Math.cos(a)*46, Math.sin(a)*46); } g.closePath(); g.stroke();
    g.beginPath(); for (let i = 0; i < 6; i++) { const a = i*Math.PI/3 + Math.PI/6; g.lineTo(Math.cos(a)*46, Math.sin(a)*46); } g.closePath(); g.stroke();
    g.font = 'bold 9px serif'; g.fillStyle = '#fff'; for (let i = 0; i < 16; i++) { g.save(); g.rotate(i*Math.PI/8); g.fillText('ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛇᛈᛉᛊ'[i], -3, -49); g.restore(); } },
  estilhaco(g){ g.fillStyle = '#fff'; g.beginPath(); g.moveTo(64,6); g.lineTo(84,70); g.lineTo(64,122); g.lineTo(46,70); g.fill(); g.fillStyle = 'rgba(255,255,255,.5)'; g.beginPath(); g.moveTo(64,6); g.lineTo(64,122); g.lineTo(46,70); g.fill(); },
  listra(g){ const l = g.createLinearGradient(0,0,128,0); l.addColorStop(0,'rgba(255,255,255,0)'); l.addColorStop(.7,'#fff'); l.addColorStop(1,'rgba(255,255,255,0)'); g.fillStyle = l; g.fillRect(0,58,128,12); },
  orbe(g){ const r = g.createRadialGradient(64,64,10,64,64,60); r.addColorStop(0,'#fff'); r.addColorStop(.45,'rgba(255,255,255,.75)'); r.addColorStop(.75,'rgba(255,255,255,.95)'); r.addColorStop(1,'rgba(255,255,255,0)'); g.fillStyle = r; g.beginPath(); g.arc(64,64,62,0,7); g.fill();
    g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 3; for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(64,64,24 + i*10, i*2, i*2 + 2.2); g.stroke(); } },
  espiral(g){ g.translate(64,64); g.strokeStyle = '#fff'; g.lineWidth = 5; g.shadowColor = '#fff'; g.shadowBlur = 8; g.beginPath(); for (let a = 0; a < 12; a += .1) g.lineTo(Math.cos(a)*a*4.6, Math.sin(a)*a*4.6); g.stroke(); },
  nota(g){ g.fillStyle = '#fff'; g.beginPath(); g.ellipse(46,92,18,13,-.4,0,7); g.fill(); g.fillRect(58,24,8,68); g.beginPath(); g.moveTo(66,24); g.quadraticCurveTo(100,40,90,70); g.quadraticCurveTo(92,46,66,44); g.fill(); },
  coluna(g){ const l = g.createLinearGradient(0,0,128,0); l.addColorStop(0,'rgba(255,255,255,0)'); l.addColorStop(.5,'#fff'); l.addColorStop(1,'rgba(255,255,255,0)'); g.fillStyle = l; g.fillRect(0,0,128,128); },
  marca(g){ const r = g.createRadialGradient(64,64,10,64,64,62); r.addColorStop(0,'rgba(0,0,0,.85)'); r.addColorStop(.7,'rgba(0,0,0,.5)'); r.addColorStop(1,'rgba(0,0,0,0)'); g.fillStyle = r; g.beginPath(); for (let i = 0; i < 24; i++) { const a = i/24*Math.PI*2, rr = 44 + Math.random()*18; g.lineTo(64 + Math.cos(a)*rr, 64 + Math.sin(a)*rr); } g.fill(); },
};
function chama(g, v){
  const r = g.createRadialGradient(64,84,2,64,76,46); r.addColorStop(0,'#fff'); r.addColorStop(.5,'rgba(255,255,255,.8)'); r.addColorStop(1,'rgba(255,255,255,0)');
  g.fillStyle = r; g.beginPath(); g.moveTo(64, 8 + v*6);
  g.bezierCurveTo(84 + v*6, 40, 102, 70, 92, 96); g.bezierCurveTo(84, 120, 44, 120, 36, 96); g.bezierCurveTo(26, 70, 48 - v*6, 46, 64, 8 + v*6); g.fill();
  if (v === 2) { g.globalCompositeOperation = 'destination-out'; g.beginPath(); g.ellipse(70, 54, 8, 16, .3, 0, 7); g.fill(); g.globalCompositeOperation = 'source-over'; }
}
function fumaca(g, v){
  for (let i = 0; i < 9; i++) {
    const x = 64 + Math.cos(i*2.4 + v)*22, y = 64 + Math.sin(i*2.4 + v)*18, rr = 26 + (i % 3)*6;
    const r = g.createRadialGradient(x, y, 0, x, y, rr); r.addColorStop(0, 'rgba(255,255,255,.55)'); r.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = r; g.beginPath(); g.arc(x, y, rr, 0, 7); g.fill();
  }
}
function estrelaPontas(g, n, R, r){
  g.translate(64,64); const gr = g.createRadialGradient(0,0,0,0,0,R); gr.addColorStop(0,'#fff'); gr.addColorStop(1,'rgba(255,255,255,0)');
  g.fillStyle = gr; g.beginPath(); for (let i = 0; i < n*2; i++) { const a = i*Math.PI/n, rr = i % 2 ? r : R; g.lineTo(Math.cos(a)*rr, Math.sin(a)*rr); } g.fill();
}
function zigue(g, v){
  g.strokeStyle = '#fff'; g.lineWidth = 6; g.lineJoin = 'miter'; g.shadowColor = '#fff'; g.shadowBlur = 12;
  g.beginPath(); let x = 64, y = 4; g.moveTo(x, y);
  while (y < 124) { x = 64 + (Math.random() - .5)*50; y += 14 + Math.random()*10; g.lineTo(x, y); }
  g.stroke(); if (v === 2) { g.lineWidth = 2; g.stroke(); }
}

// Coloca as imagens no atlas
(function montarAtlas(){
  const g = ATLAS_CANVAS.getContext('2d'); let i = 0;
  const celula = nome => { CELULAS[nome] = i; const x = (i % GRADE)*CEL, y = Math.floor(i/GRADE)*CEL; i++; return [x, y]; };
  for (const [nome, fn] of Object.entries(DESENHOS)) {
    const [x, y] = celula(nome); g.save(); g.beginPath(); g.rect(x, y, CEL, CEL); g.clip(); g.translate(x, y); fn(g); g.restore();
  }
  for (const [nome, url] of Object.entries(typeof SPRITES_EFEITOS !== 'undefined' ? SPRITES_EFEITOS : {})) {
    if (i >= GRADE*GRADE) break;
    const [x, y] = celula(nome), img = new Image();
    img.onload = () => {
      const k = Math.min((CEL - 8)/img.width, (CEL - 8)/img.height), w = img.width*k, h = img.height*k;
      g.imageSmoothingEnabled = true; g.drawImage(img, x + (CEL - w)/2, y + (CEL - h)/2, w, h);
      ATLAS.needsUpdate = true; delete TEX_CACHE[nome];
    };
    img.src = url;
  }
  ATLAS.needsUpdate = true;
})();
// Textura separada de uma célula (para THREE.Sprite e malhas)
const TEX_CACHE = {};
function texturaDe(nome){
  if (TEX_CACHE[nome]) return TEX_CACHE[nome];
  const i = CELULAS[nome] ?? CELULAS.brilho, c = document.createElement('canvas'); c.width = c.height = CEL;
  const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding;
  const copiar = () => { c.getContext('2d').clearRect(0,0,CEL,CEL); c.getContext('2d').drawImage(ATLAS_CANVAS, (i % GRADE)*CEL, Math.floor(i/GRADE)*CEL, CEL, CEL, 0, 0, CEL, CEL); t.needsUpdate = true; };
  copiar(); setTimeout(copiar, 300); setTimeout(copiar, 1200);    // as imagens do atlas carregam um pouquinho depois
  return TEX_CACHE[nome] = t;
}

/* ----- Partículas com sprites do atlas ----- */
class Particulas {
  constructor(max, aditivo){
    this.max = max; this.n = 0; this.estaticosAlterados = false;
    const F = n => new Float32Array(n);
    Object.assign(this, { pos: F(max*3), vel: F(max*3), cor: F(max*3), tam: F(max), alfa: F(max), cel: F(max), rot: F(max),
      vrot: F(max), vida: F(max), vidaMax: F(max), tam0: F(max), grav: F(max), atrito: F(max), cresce: F(max), some: F(max) });
    const g = new THREE.BufferGeometry();
    const at = (nome, arr, n) => g.setAttribute(nome, new THREE.BufferAttribute(arr, n).setUsage(THREE.DynamicDrawUsage));
    at('position', this.pos, 3); at('cor', this.cor, 3); at('tam', this.tam, 1); at('alfa', this.alfa, 1); at('cel', this.cel, 1); at('rot', this.rot, 1);
    this.mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: aditivo ? THREE.AdditiveBlending : THREE.NormalBlending,
      uniforms: { escala: { value: 600 }, atlas: { value: ATLAS }, forca: { value: aditivo ? .62 : 1 } },
      vertexShader: `attribute vec3 cor; attribute float tam, alfa, cel, rot; varying vec3 vC; varying float vA, vCel, vRot; uniform float escala;
        void main(){ vC = cor; vA = alfa; vCel = cel; vRot = rot; vec4 mv = modelViewMatrix*vec4(position,1.); gl_PointSize = tam*escala/max(.1,-mv.z); gl_Position = projectionMatrix*mv; }`,
      fragmentShader: `uniform sampler2D atlas; uniform float forca; varying vec3 vC; varying float vA, vCel, vRot;
        void main(){
          vec2 p = gl_PointCoord - .5; float c = cos(vRot), s = sin(vRot); p = mat2(c,-s,s,c)*p*1.41 + .5;
          if (p.x < 0. || p.x > 1. || p.y < 0. || p.y > 1.) discard;
          vec2 cel = vec2(mod(vCel, 8.), floor(vCel/8.));
          vec4 t = texture2D(atlas, vec2((cel.x + p.x)/8., 1. - (cel.y + p.y)/8.));
          if (t.a < .01) discard;
          gl_FragColor = vec4(vC*t.rgb, t.a*vA*forca);
        }`,
    });
    this.geo = g; this.pontos = new THREE.Points(g, this.mat); this.pontos.frustumCulled = false; this.pontos.renderOrder = aditivo ? 3 : 2;
    cena.add(this.pontos);
  }
  // o = {x,y,z, vx,vy,vz, cor, tam, vida, grav, atrito, cresce, cel:'nome', rot, vrot}
  add(o){
    if (this.n >= this.max) return;
    const i = this.n++, i3 = i*3; this.estaticosAlterados = true;
    this.pos[i3] = o.x; this.pos[i3+1] = o.y; this.pos[i3+2] = o.z;
    this.vel[i3] = o.vx || 0; this.vel[i3+1] = o.vy || 0; this.vel[i3+2] = o.vz || 0;
    const c = o.cor instanceof THREE.Color ? o.cor : _cor.setHex(o.cor ?? 0xffffff);
    this.cor[i3] = c.r; this.cor[i3+1] = c.g; this.cor[i3+2] = c.b;
    this.tam0[i] = this.tam[i] = o.tam || .3; this.vida[i] = this.vidaMax[i] = o.vida || .6;
    this.grav[i] = o.grav || 0; this.atrito[i] = o.atrito ?? 1.5; this.cresce[i] = o.cresce ?? 0; this.alfa[i] = 1;
    this.cel[i] = CELULAS[o.cel || 'brilho'] ?? 0; this.rot[i] = o.rot ?? Math.random()*6.28; this.vrot[i] = o.vrot || 0;
    this.some[i] = o.some ?? 2.2;
  }
  atualizar(dt){
    if (!this.n) { this.geo.setDrawRange(0, 0); return; }
    let i = 0;
    while (i < this.n) {
      this.vida[i] -= dt;
      if (this.vida[i] <= 0) { this.copiar(--this.n, i); continue; }
      const i3 = i*3, k = Math.max(0, 1 - this.atrito[i]*dt);
      this.vel[i3] *= k; this.vel[i3+1] = this.vel[i3+1]*k - this.grav[i]*dt; this.vel[i3+2] *= k;
      this.pos[i3] += this.vel[i3]*dt; this.pos[i3+1] += this.vel[i3+1]*dt; this.pos[i3+2] += this.vel[i3+2]*dt;
      if (this.grav[i] > 0 && this.pos[i3+1] < .05) { this.pos[i3+1] = .05; this.vel[i3+1] *= -.3; this.vel[i3] *= .6; this.vel[i3+2] *= .6; }
      const v = this.vida[i]/this.vidaMax[i];
      this.alfa[i] = Math.min(1, v*this.some[i]);
      this.tam[i] = this.tam0[i]*(1 + this.cresce[i]*(1 - v));
      this.rot[i] += this.vrot[i]*dt;
      i++;
    }
    this.geo.setDrawRange(0, this.n);
    if (this.n) {
      // Apenas os vértices ativos são transferidos; cor e célula só mudam ao criar/remover partículas.
      for (const nome of ['position','tam','alfa','rot']) {
        const a = this.geo.attributes[nome]; a.updateRange.offset = 0;
        a.updateRange.count = this.n * a.itemSize; a.needsUpdate = true;
      }
      if (this.estaticosAlterados) for (const nome of ['cor','cel']) {
        const a = this.geo.attributes[nome]; a.updateRange.offset = 0;
        a.updateRange.count = this.n * a.itemSize; a.needsUpdate = true;
      }
    }
    this.estaticosAlterados = false;
    this.mat.uniforms.escala.value = renderer.domElement.height*.5;
  }
  copiar(de, para){
    this.estaticosAlterados = true;
    const a = de*3, b = para*3;
    for (let k = 0; k < 3; k++) { this.pos[b+k] = this.pos[a+k]; this.vel[b+k] = this.vel[a+k]; this.cor[b+k] = this.cor[a+k]; }
    for (const arr of [this.tam, this.alfa, this.cel, this.rot, this.vrot, this.vida, this.vidaMax, this.tam0, this.grav, this.atrito, this.cresce, this.some]) arr[para] = arr[de];
  }
  limpar(){ this.n = 0; this.estaticosAlterados = false; this.geo.setDrawRange(0, 0); }
}
const _cor = new THREE.Color();
let BRILHO, FUMACA;   // partículas que somam luz (fogo, raio) e partículas normais (fumaça, folhas, pedras)

/* ----- Como cada tipo aparece -----
   c1/c2: cores | orbe: sprite do núcleo do projétil | rastro: partículas que ficam para trás
   estouro: partículas da explosão | normal: true = sprite com cores próprias (não colorir)       */
const ESTILO = {
  fire:     { c1:0xff6a10, c2:0xffd04a, orbe:'flareball',  rastro:['chama0','chama1','chama2'], estouro:'fogo' },
  water:    { c1:0x2f7bff, c2:0xbfe4ff, orbe:'waterwisp',  rastro:['gota','bolha'], estouro:'agua' },
  electric: { c1:0xffd81a, c2:0xffffff, orbe:'electroball', rastro:['faisca','raio0','raio1'], estouro:'eletrico' },
  grass:    { c1:0x4fc43a, c2:0xc6f27a, orbe:'energyball', rastro:['leaf1','leaf2'], normal:true, estouro:'folhas' },
  ice:      { c1:0x8fe0ff, c2:0xffffff, orbe:'iceball',    rastro:['estilhaco','faisca'], estouro:'gelo' },
  fighting: { c1:0x3d9bff, c2:0xbfe2ff, orbe:'orbe',       rastro:['brilho','faisca'], estouro:'luta' },
  poison:   { c1:0xb04ad8, c2:0xe7a6ff, orbe:'poisonwisp', rastro:['bolha','fumaca0'], estouro:'veneno' },
  ground:   { c1:0xc9a25a, c2:0x8a6a3a, orbe:'mudwisp',    rastro:['rock1','rock2','rock3'], normal:true, estouro:'terra' },
  flying:   { c1:0xe6eeff, c2:0xa9c2ff, orbe:'corte',      rastro:['feather','listra'], estouro:'vento' },
  psychic:  { c1:0xff4aa8, c2:0xffc1e3, orbe:'mistball',   rastro:['anel','faisca'], estouro:'psiquico' },
  bug:      { c1:0xa6c31a, c2:0xe2f07a, orbe:'energyball', rastro:['faisca','estilhaco'], estouro:'luta' },
  rock:     { c1:0xb8a06a, c2:0x7d6a45, orbe:'rock1',      rastro:['rock2','rock3'], normal:true, estouro:'terra' },
  ghost:    { c1:0x8a52d6, c2:0x3a1a6a, orbe:'shadowball', rastro:['fumaca0','fumaca1'], estouro:'sombra' },
  dragon:   { c1:0x6a4dff, c2:0x5fd0ff, orbe:'orbe',       rastro:['chama0','chama1','faisca'], estouro:'dragao' },
  dark:     { c1:0x6a3a8a, c2:0x1a1020, orbe:'blackwisp',  rastro:['fumaca0','fumaca1'], estouro:'sombra' },
  steel:    { c1:0xd8e2f0, c2:0x9aa8c0, orbe:'orbe',       rastro:['faisca','estilhaco'], estouro:'metal' },
  fairy:    { c1:0xff8ad8, c2:0xffffff, orbe:'mistball',   rastro:['heart','faisca','estrela'], estouro:'fada' },
  normal:   { c1:0xfff0c0, c2:0xffc94a, orbe:'orbe',       rastro:['estrela','faisca'], estouro:'normal' },
};
const estilo = t => ESTILO[t] || ESTILO.normal;
const SPRITES_COLORIDOS = new Set(['leaf1','leaf2','petal','feather','rock1','rock2','rock3','icicle','fist','foot','lightning','topbite','bottombite','leftslash','leftclaw','shine','impact','hitmarker','heart','moon','shell','bone','web','flareball','electroball','energyball','iceball','mistball','shadowball','waterwisp','poisonwisp','mudwisp','blackwisp','wisp','purplewisp','sword','caltrop','fireball','bluefireball']);
const escolher = a => a[Math.floor(Math.random()*a.length)];

// solta uma partícula com o sprite certo (decide sozinho se soma luz ou não)
// Só estes somam luz (brilho aditivo). Os outros são desenhados com a cor certa, para não "estourar" em branco
// sobre o gramado e o céu claros.
const ADITIVOS = new Set(['brilho','nucleo','faisca','raio0','raio1','listra','anel','onda','coluna']);
function part(cel, o){
  const colorido = SPRITES_COLORIDOS.has(cel);
  const sis = (ADITIVOS.has(cel) || o.brilhar) && !o.normal ? BRILHO : FUMACA;
  o.cel = cel; if (colorido && !o.tingir) o.cor = 0xffffff;
  sis.add(o);
}
// solta partículas de um tipo num ponto (explosão pequena, faíscas)
function soltar(tipo, x, y, z, qtd, forca = 3, tam = .35, vida = .6){
  const e = estilo(tipo);
  qtd = Math.max(1, Math.round(qtd * QUAL.particulas));
  for (let i = 0; i < qtd; i++) {
    const a = Math.random()*Math.PI*2, b = rnd(-.6, 1.2), f = forca*rnd(.3, 1);
    const cel = escolher(e.rastro);
    part(cel, { x, y, z, vx: Math.cos(a)*Math.cos(b)*f, vy: Math.sin(b)*f + (tipo === 'fire' ? 2 : 0), vz: Math.sin(a)*Math.cos(b)*f,
      cor: cel.startsWith('fumaca') && (tipo === 'ghost' || tipo === 'dark') ? 0x2a1240 : Math.random() < .5 ? e.c1 : e.c2, tam: tam*rnd(.7, 1.4)*(SPRITES_COLORIDOS.has(cel) ? 1.3 : 1), vida: vida*rnd(.6, 1.2),
      grav: ['water','ground','rock','grass'].includes(tipo) ? 9 : 0, atrito: 1.6, cresce: cel.startsWith('chama') || cel.startsWith('fumaca') ? 1.2 : .2, vrot: rnd(-6, 6),
      escura: tipo === 'ghost' || tipo === 'dark' });
  }
}
function poeira(x, z, qtd = 8, cor = 0xb8a98a){
  qtd = Math.max(1, Math.round(qtd * QUAL.particulas));
  for (let i = 0; i < qtd; i++) {
    const a = Math.random()*7;
    FUMACA.add({ x: x + Math.cos(a)*.3, y: .2, z: z + Math.sin(a)*.3, vx: Math.cos(a)*rnd(1, 3), vy: rnd(.3, 1.2), vz: Math.sin(a)*rnd(1, 3),
      cor, tam: rnd(.5, 1), vida: rnd(.5, .9), atrito: 3, cresce: 1.5, cel: Math.random() < .5 ? 'fumaca0' : 'fumaca1', vrot: rnd(-1, 1), some: 1.5 });
  }
}

/* ----- Luzes de impacto (fixas na cena, só acendem; evita recompilar shaders) ----- */
const LUZES = [];
function criarLuzes(){
  for (let i = 0; i < 4; i++) { const l = new THREE.PointLight(0xffffff, 0, 10, 2); l.userData.t = 0; cena.add(l); LUZES.push(l); }
}
function clarao(cor, x, y, z, forca = 4, alcance = 9, dur = .25){
  const l = LUZES.reduce((a, b) => a.userData.t < b.userData.t ? a : b);
  l.color.setHex(cor); l.position.set(x, y, z); l.distance = alcance; l.userData.t = dur; l.userData.dur = dur; l.userData.forca = forca;
}
function atualizarLuzes(dt){
  for (const l of LUZES) { l.userData.t = Math.max(0, l.userData.t - dt); l.intensity = l.userData.t > 0 ? l.userData.forca*(l.userData.t/l.userData.dur) : 0; }
}

/* ----- Malhas e sprites de efeito com tempo de vida ----- */
const EFEITOS = [];   // {mesh, t, dur, atualizar(e, k, dt)}
const matBrilho = cor => new THREE.MeshBasicMaterial({ color: cor, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
const GEO = {
  esfera: new THREE.SphereGeometry(1, 20, 14),
  disco: new THREE.PlaneGeometry(2, 2),
  cilindro: new THREE.CylinderGeometry(1, 1, 1, 20, 1, true),
  toro: new THREE.TorusGeometry(1, .07, 8, 40),
};
function efeito(mesh, dur, atualizar){ cena.add(mesh); const e = { mesh, t: 0, dur, atualizar }; EFEITOS.push(e); return e; }
function atualizarEfeitos(dt){
  for (let i = EFEITOS.length - 1; i >= 0; i--) {
    const e = EFEITOS[i]; e.t += dt; const k = Math.min(1, e.t/e.dur);
    e.atualizar && e.atualizar(e, k, dt);
    if (k >= 1) { cena.remove(e.mesh); e.mesh.traverse(o => o.material && o.material.dispose()); EFEITOS.splice(i, 1); }
  }
}
// sprite que sempre olha para a câmera
function spriteFx(nome, cor, tam, aditivo = true){
  const colorido = SPRITES_COLORIDOS.has(nome);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: texturaDe(nome), color: colorido ? 0xffffff : cor, transparent: true, depthWrite: false,
    blending: aditivo ? THREE.AdditiveBlending : THREE.NormalBlending }));
  s.scale.setScalar(tam); s.renderOrder = 4; return s;
}
// decalque deitado no chão (anel, runa, marca de queimado)
function decalque(nome, cor, raio, aditivo = true){
  const m = new THREE.Mesh(GEO.disco, new THREE.MeshBasicMaterial({ map: texturaDe(nome), color: cor, transparent: true, depthWrite: false,
    blending: aditivo ? THREE.AdditiveBlending : THREE.NormalBlending }));
  m.rotation.x = -Math.PI/2; m.scale.setScalar(raio); m.renderOrder = 1; return m;
}
// anel no chão que se expande
function onda(x, z, raio, cor, dur = .45, y = .06){
  const m = decalque('onda', cor, 1); m.position.set(x, y, z);
  return efeito(m, dur, (e, k) => { m.scale.setScalar(.3 + raio*Math.sqrt(k)); m.material.opacity = 1 - k*k; });
}
// clarão (sprite que cresce e some)
function flash(nome, cor, x, y, z, tam, dur = .25, giro = 0, op = 1){
  const s = spriteFx(nome, cor, tam*.3); s.position.set(x, y, z); s.material.rotation = Math.random()*6.28;
  return efeito(s, dur, (e, k) => { s.scale.setScalar(tam*(.3 + k*.9)); s.material.opacity = op*(1 - k); s.material.rotation += giro*.016; });
}
// marca escura no chão (queimado / cratera)
function marcaChao(x, z, raio, dur = 4){
  const m = decalque('marca', 0xffffff, raio, false); m.position.set(x, .04, z); m.rotation.z = Math.random()*7; m.material.opacity = .75;
  efeito(m, dur, (e, k) => { m.material.opacity = .75*(1 - k*k); });
}

/* ----- Explosão de cada tipo ----- */
function explosao(tipo, x, y, z, raio = 1.5){
  const e = estilo(tipo);
  flash('brilho', e.c1, x, y, z, raio*2.6, .3, 0, .45);
  flash('nucleo', 0xffffff, x, y, z, raio*1.1, .14, 0, .7);
  flash('faisca', e.c2, x, y, z, raio*2, .22, 4, .8);
  onda(x, z, raio*1.7, e.c1, .4);
  clarao(e.c1, x, y + .5, z, 6, raio*6, .3);
  const n = Math.round(14 + raio*8);
  const burst = (cel, qtd, o) => { for (let i = 0; i < qtd; i++) { const a = Math.random()*7, b = rnd(-.2, 1.2), f = (o.forca || 6)*rnd(.4, 1)*raio/1.5;
    part(typeof cel === 'function' ? cel() : cel, { x, y, z, vx: Math.cos(a)*Math.cos(b)*f, vy: Math.sin(b)*f + (o.sobe || 0), vz: Math.sin(a)*Math.cos(b)*f,
      cor: o.cor ?? (Math.random() < .5 ? e.c1 : e.c2), tam: (o.tam || .5)*rnd(.7, 1.4)*Math.sqrt(raio/1.5), vida: (o.vida || .6)*rnd(.7, 1.3),
      grav: o.grav || 0, atrito: o.atrito ?? 2, cresce: o.cresce ?? .3, vrot: rnd(-8, 8), escura: o.escura, normal: o.normal, some: o.some }); } };
  switch (e.estouro) {
    case 'fogo':   burst(() => escolher(['chama0','chama1','chama2']), n, { sobe: 3, tam: .8, cresce: 1.4 }); burst('fumaca0', 8, { cor: 0x3a2a22, escura: true, sobe: 2, tam: 1, vida: 1.1, normal: true, cresce: 1.5, forca: 3 });
                   burst('faisca', 10, { cor: 0xffd04a, forca: 9, tam: .25, grav: 6 }); marcaChao(x, z, raio*1.2); break;
    case 'agua':   burst('gota', n, { grav: 12, sobe: 5, tam: .45, forca: 6 }); burst('bolha', 8, { tam: .45, sobe: 1.5, vida: .9, forca: 2 }); break;
    case 'eletrico': burst(() => escolher(['raio0','raio1']), 8, { tam: 1.1, forca: 3, vida: .25 }); burst('faisca', n, { forca: 11, tam: .35, vida: .35, atrito: 3 });
                   for (let i = 0; i < 3; i++) flash('lightning', 0xffffff, x + rnd(-raio, raio)*.5, y + raio*.4, z + rnd(-raio, raio)*.5, raio*1.6, .18); break;
    case 'folhas': burst(() => escolher(['leaf1','leaf2']), n, { grav: 3, sobe: 3, tam: .55, vida: 1, atrito: 2.5 }); burst('faisca', 8, { forca: 6, tam: .3 }); break;
    case 'gelo':   burst('icicle', 10, { grav: 10, sobe: 4, tam: .6, vida: .9 }); burst('estilhaco', n, { forca: 8, tam: .4, grav: 6 }); burst('fumaca0', 6, { cor: 0xdff6ff, tam: 1, forca: 2, cresce: 1.5 }); break;
    case 'luta':   burst('faisca', n, { forca: 9, tam: .4 }); flash('onda', e.c1, x, y, z, raio*2.4, .3); break;
    case 'veneno': burst('bolha', n, { sobe: 2, tam: .45, vida: .9, forca: 4 }); burst('fumaca0', 8, { cor: 0x8a3ab0, tam: 1, forca: 2, cresce: 1.5, vida: 1 }); break;
    case 'terra':  burst(() => escolher(['rock1','rock2','rock3']), Math.round(n*.7), { grav: 16, sobe: 6, tam: .55, vida: 1.2, atrito: .5 });
                   burst('fumaca1', 10, { cor: 0xb59a6a, tam: 1.3, forca: 3, cresce: 1.4, vida: 1, normal: true }); marcaChao(x, z, raio); break;
    case 'vento':  burst('feather', 8, { grav: 1, tam: .5, vida: 1.1, atrito: 2 }); burst('listra', n, { forca: 10, tam: .8, vida: .3, atrito: 3 }); break;
    case 'psiquico': for (let i = 0; i < 3; i++) setTimeout(() => flash('anel', e.c1, x, y, z, raio*(1.5 + i), .4), i*70);
                   burst('faisca', n, { forca: 6, tam: .35 }); break;
    case 'sombra': burst('fumaca0', n, { cor: 0x2a1240, escura: true, normal: true, tam: 1, cresce: 1.4, vida: .9, forca: 4 }); burst('brilho', 10, { cor: e.c1, tam: .5, forca: 5 }); break;
    case 'dragao': burst(() => escolher(['chama0','chama1']), n, { sobe: 2, tam: .7, cresce: 1.2 }); burst('faisca', 10, { cor: 0x5fd0ff, forca: 9, tam: .35 }); break;
    case 'metal':  burst('faisca', n, { forca: 12, tam: .3, grav: 10, vida: .5, atrito: 1 }); burst('estilhaco', 8, { forca: 7, tam: .35, grav: 8 }); break;
    case 'fada':   burst(() => escolher(['heart','estrela','faisca']), n, { sobe: 2, tam: .45, vida: .9, forca: 5, atrito: 2.5 }); break;
    default:       burst(() => escolher(['estrela','faisca']), n, { forca: 7, tam: .4 });
  }
}

/* ----- Círculo mágico no chão (aviso antes do golpe cair) ----- */
function marcaAlvo(x, z, raio, cor, dur){
  const g = new THREE.Group(); g.position.set(x, .08, z);
  const runa = decalque('runa', cor, raio); g.add(runa);
  const fundo = decalque('brilho', cor, raio*.2); fundo.material.opacity = .5; g.add(fundo);
  return efeito(g, dur, (e, k) => { runa.rotation.z += .05; runa.material.opacity = .6 + Math.sin(k*40)*.3; fundo.scale.setScalar(raio*(.2 + k*.9)); });
}

/* ----- Feixe (raio) ----- */
const TEX_FEIXE = (() => {
  const c = document.createElement('canvas'); c.width = 64; c.height = 256; const g = c.getContext('2d');
  const l = g.createLinearGradient(0,0,64,0); l.addColorStop(0,'rgba(255,255,255,0)'); l.addColorStop(.35,'rgba(255,255,255,.7)'); l.addColorStop(.5,'#fff'); l.addColorStop(.65,'rgba(255,255,255,.7)'); l.addColorStop(1,'rgba(255,255,255,0)');
  g.fillStyle = l; g.fillRect(0,0,64,256);
  for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(255,255,255,${Math.random()*.5})`; g.fillRect(Math.random()*64, Math.random()*256, 2 + Math.random()*6, 10 + Math.random()*40); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
})();
function feixe(tipo, de, ate, largura = .5, dur = .45){
  const e = estilo(tipo), g = new THREE.Group();
  const dir = ate.clone().sub(de), comp = dir.length(); dir.normalize();
  g.position.copy(de).addScaledVector(dir, comp/2);
  g.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0), dir);
  const tex = TEX_FEIXE.clone(); tex.needsUpdate = true; tex.repeat.set(1, comp/3);
  // camadas de fora com a cor do tipo (mistura normal) e só o miolo somando luz
  const mk = (cor, w, op, aditivo) => { const m = new THREE.Mesh(GEO.cilindro, new THREE.MeshBasicMaterial({ map: tex, color: cor, transparent: true, opacity: op, blending: aditivo ? THREE.AdditiveBlending : THREE.NormalBlending, depthWrite: false, side: aditivo ? THREE.DoubleSide : THREE.FrontSide })); m.userData.w = w; m.userData.op = op; g.add(m); return m; };
  const fora = mk(e.c1, largura*1.7, .45, false), meio = mk(e.c1, largura*1.05, .85, false), dentro = mk(e.c2, largura*.4, .8, true);
  // anéis que correm pelo feixe
  const aneis = [];
  for (let i = 0; i < 4; i++) { const a = new THREE.Mesh(GEO.toro, new THREE.MeshBasicMaterial({ color: e.c1, transparent: true, depthWrite: false })); a.rotation.x = Math.PI/2; a.userData.f = i/4; g.add(a); aneis.push(a); }
  const boca = spriteFx('brilho', e.c1, largura*5, false); boca.position.copy(de); cena.add(boca);
  const ponta = spriteFx('brilho', e.c1, largura*6, false); ponta.position.copy(ate); cena.add(ponta);
  efeito(g, dur, (ef, k, dt) => {
    const w = (k < .12 ? k/.12 : 1 - Math.pow((k - .12)/.88, 2)) * (1 + Math.sin(ef.t*60)*.08);
    for (const m of [fora, meio, dentro]) { m.scale.set(m.userData.w*w, comp, m.userData.w*w); m.material.opacity = m.userData.op*Math.min(1, w*1.5); }
    tex.offset.y -= dt*8;
    for (const a of aneis) { a.userData.f = (a.userData.f + dt*2.5) % 1; a.position.y = (a.userData.f - .5)*comp; a.scale.setScalar(largura*1.4*w*(1 + a.userData.f*.6)); a.material.opacity = (1 - a.userData.f)*w; }
    boca.scale.setScalar(largura*3.5*w); ponta.scale.setScalar(largura*4.5*w*(1 + Math.random()*.3)); boca.material.opacity = ponta.material.opacity = .55*w;
    // partículas ao longo do feixe
    if (Math.random() < .9) { const p = de.clone().lerp(ate, Math.random()); soltar(tipo, p.x, p.y, p.z, 1, 2.5, .4, .4); }
    if (Math.random() < .5) soltar(tipo, ate.x, ate.y, ate.z, 2, 5, .45, .45);
    if (k >= 1) { cena.remove(boca); cena.remove(ponta); boca.material.dispose(); ponta.material.dispose(); }
  });
  // raio elétrico: além do feixe, vários relâmpagos tremendo
  if (tipo === 'electric') for (let i = 0; i < 5; i++) setTimeout(() => zigueZague(de, ate, e.c1, .1), i*60);
}
// relâmpago entre dois pontos (segmentos tortos)
function zigueZague(a, b, cor, dur = .15, desvio = .5){
  const g = new THREE.Group(), n = Math.max(4, Math.round(a.distanceTo(b)/1.2));
  let p0 = a.clone();
  for (let i = 1; i <= n; i++) {
    const p1 = a.clone().lerp(b, i/n); if (i < n) p1.add(new THREE.Vector3(rnd(-desvio, desvio), rnd(-desvio, desvio), rnd(-desvio, desvio)));
    const d = p1.clone().sub(p0), seg = new THREE.Mesh(GEO.cilindro, matBrilho(i % 2 ? cor : 0xffffff));
    seg.position.copy(p0).addScaledVector(d, .5); seg.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0), d.clone().normalize()); seg.scale.set(.06, d.length(), .06);
    g.add(seg); p0 = p1;
  }
  efeito(g, dur, (e, k) => g.children.forEach(s => s.material.opacity = (1 - k)*(Math.random() < .8 ? 1 : .3)));
}
/* ----- Relâmpago do céu ----- */
function relampago(x, z, cor = 0xfff27a){
  zigueZague(new THREE.Vector3(x + rnd(-2, 2), 30, z + rnd(-2, 2)), new THREE.Vector3(x, 0, z), cor, .3, 1.2);
  zigueZague(new THREE.Vector3(x + rnd(-2, 2), 30, z + rnd(-2, 2)), new THREE.Vector3(x, 0, z), 0xffffff, .2, .9);
  flash('brilho', cor, x, 1, z, 6, .35, 0, .5); clarao(cor, x, 3, z, 12, 22, .3);
}
// coluna de luz (para golpes que caem do céu e Ultimates)
function pilar(x, z, raio, cor, dur = .6, altura = 18){
  const m = new THREE.Mesh(GEO.cilindro, new THREE.MeshBasicMaterial({ map: texturaDe('coluna'), color: cor, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  m.position.set(x, altura/2, z);
  efeito(m, dur, (e, k) => { m.scale.set(raio*(1 - k*.6), altura, raio*(1 - k*.6)); m.material.opacity = .5*(1 - k); m.rotation.y += .1; });
}

/* ----- Tremor de câmera, câmera lenta e "congelar" no impacto ----- */
const FX = { tremor: 0, lento: 0, congela: 0 };
function tremer(forca){ FX.tremor = Math.min(1.2, FX.tremor + forca); }
function congelar(seg){ FX.congela = Math.max(FX.congela, seg); }

/* ----- Números de dano (HTML por cima do 3D) ----- */
const camadaNumeros = document.getElementById('numeros');
const _v = new THREE.Vector3();
const NUMEROS = [];
function numeroDano(texto, pos, classe){
  const d = document.createElement('div'); d.className = 'num ' + (classe || ''); d.textContent = texto;
  d._pos = pos.clone(); d._t = 0; d._dx = rnd(-20, 20);
  camadaNumeros.appendChild(d); NUMEROS.push(d);
}
function atualizarNumeros(dt){
  const w = renderer.domElement.clientWidth, h = renderer.domElement.clientHeight;
  for (let i = NUMEROS.length - 1; i >= 0; i--) {
    const d = NUMEROS[i]; d._t += dt;
    if (d._t > .9) { d.remove(); NUMEROS.splice(i, 1); continue; }
    _v.copy(d._pos); _v.y += d._t*1.2; _v.project(camera);
    if (_v.z > 1) { d.style.display = 'none'; continue; }
    d.style.display = '';
    d.style.transform = `translate(${(_v.x*.5 + .5)*w + d._dx*d._t}px, ${(-_v.y*.5 + .5)*h}px) translate(-50%,-50%) scale(${d._t < .12 ? .6 + d._t*4 : 1.08 - d._t*.2})`;
    d.style.opacity = d._t > .6 ? (.9 - d._t)/.3 : 1;
  }
}
function limparEfeitos(){
  for (const e of EFEITOS) cena.remove(e.mesh); EFEITOS.length = 0;
  for (const d of NUMEROS) d.remove(); NUMEROS.length = 0;
  BRILHO && BRILHO.limpar(); FUMACA && FUMACA.limpar();
}

/* ----- Partículas do ambiente ----- */
function ambiente(dt){
  if (!ARENA) return;
  if (ARENA.clima) { ARENA.clima(dt*QUAL.particulas); return; }    // clima próprio do mapa (mapas.js)
  const id = ARENA.id, n = dt*60;
  for (let i = 0; i < n; i++) {
    const a = Math.random()*7, r = Math.random()*RAIO_ARENA*1.2, x = Math.cos(a)*r, z = Math.sin(a)*r;
    if (id === 'vulcao' && Math.random() < .5) BRILHO.add({ x, y: 0, z, vx: rnd(-.3, .3), vy: rnd(1, 2.5), vz: rnd(-.3, .3), cor: Math.random() < .5 ? 0xff7a1a : 0xffc04a, tam: rnd(.1, .2), vida: rnd(2, 4), atrito: .2, cel: 'brilho' });
    else if (id === 'gelo' && Math.random() < .6) FUMACA.add({ x, y: rnd(8, 14), z, vx: rnd(-.6, .6), vy: -rnd(1, 2), vz: rnd(-.6, .6), cor: 0xffffff, tam: rnd(.1, .2), vida: 7, atrito: 0, cel: 'brilho' });
    else if (id === 'estadio' && Math.random() < .08) BRILHO.add({ x, y: rnd(.5, 5), z, vx: rnd(-.2, .2), vy: rnd(-.1, .2), vz: rnd(-.2, .2), cor: 0xfff2b0, tam: rnd(.06, .12), vida: rnd(2, 4), atrito: 0, cel: 'brilho' });
  }
}

/* =========================================================
   SOM (sintetizado com WebAudio — não precisa de arquivos)
   ========================================================= */
let audio = null, somLigado = true;
function iniciarAudio(){ if (!audio) try { audio = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} if (audio && audio.state === 'suspended') audio.resume(); }
function tom(freq, dur, tipo = 'square', vol = .06, deslize = 0){
  if (!audio || !somLigado) return;
  const t = audio.currentTime, o = audio.createOscillator(), g = audio.createGain();
  o.type = tipo; o.frequency.setValueAtTime(freq, t);
  if (deslize) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq*deslize), t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
  o.connect(g).connect(audio.destination); o.start(t); o.stop(t + dur);
}
function ruido(dur, vol = .08, filtro = 1200){
  if (!audio || !somLigado) return;
  const t = audio.currentTime, n = audio.sampleRate*dur, buf = audio.createBuffer(1, n, audio.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random()*2 - 1)*(1 - i/n);
  const s = audio.createBufferSource(), f = audio.createBiquadFilter(), g = audio.createGain();
  s.buffer = buf; f.type = 'lowpass'; f.frequency.value = filtro; g.gain.value = vol;
  s.connect(f).connect(g).connect(audio.destination); s.start(t);
}
const SOM = {
  tiro:    () => tom(rnd(500, 700), .12, 'square', .04, .5),
  carga:   () => tom(200, .3, 'sawtooth', .03, 3),
  raio:    () => { tom(180, .45, 'sawtooth', .05, 2.5); ruido(.35, .05, 3000); },
  area:    () => { tom(90, .5, 'sine', .12, .4); ruido(.4, .08, 600); },
  investida: () => ruido(.25, .07, 2000),
  buff:    () => { tom(400, .12, 'triangle', .06, 1.5); setTimeout(() => tom(600, .15, 'triangle', .06, 1.5), 90); },
  acerto:  () => { tom(140, .12, 'square', .07, .4); ruido(.1, .06, 1500); },
  super:   () => { tom(220, .18, 'square', .07, .3); ruido(.18, .09, 2500); },
  explosao:() => { ruido(.5, .14, 700); tom(70, .5, 'sine', .14, .5); },
  pulo:    () => tom(300, .15, 'triangle', .05, 2),
  esquiva: () => ruido(.15, .05, 4000),
  ult:     () => { tom(110, 1, 'sawtooth', .06, 4); setTimeout(() => ruido(.8, .12, 900), 300); },
  desmaio: () => tom(400, .7, 'triangle', .07, .2),
  pokebola:() => { tom(900, .08, 'square', .04); setTimeout(() => tom(1200, .1, 'square', .04), 80); },
};

/* =========================================================
   EFEITOS ESPECIAIS (usados pelo campo "visual" dos golpes)
   ========================================================= */
const GEO_ROCHA = new THREE.DodecahedronGeometry(1, 0), GEO_ESPINHO = new THREE.ConeGeometry(1, 1, 6);
GEO_ESPINHO.translate(0, .5, 0);               // a base do espinho fica no chão
const COR_ROCHA = { rock: 0x8a7350, ground: 0x9a7a4a, ice: 0x9fdcff, steel: 0xb8c4d8 };

// pedaços 3D que voam, quicam e somem (pedras, gelo)
function pedacos(x, y, z, qtd, tipo, forca = 6, tam = .25){
  const gelo = tipo === 'ice';
  const mat = new THREE.MeshStandardMaterial({ color: COR_ROCHA[tipo] || 0x8a7350, roughness: gelo ? .15 : .95, flatShading: true, transparent: true, opacity: gelo ? .85 : 1 });
  const g = new THREE.Group(), lista = [];
  for (let i = 0; i < qtd; i++) {
    const m = new THREE.Mesh(GEO_ROCHA, mat); m.castShadow = true;
    m.scale.setScalar(tam*rnd(.5, 1.3)); m.position.set(x, y, z);
    const a = Math.random()*7; lista.push({ m, v: new THREE.Vector3(Math.cos(a)*forca*rnd(.3, 1), rnd(.5, 1.2)*forca, Math.sin(a)*forca*rnd(.3, 1)), w: new THREE.Vector3(rnd(-9, 9), rnd(-9, 9), rnd(-9, 9)) });
    g.add(m);
  }
  efeito(g, 1.3, (e, k, dt) => {
    for (const p of lista) {
      p.v.y -= 20*dt; p.m.position.addScaledVector(p.v, dt);
      if (p.m.position.y < p.m.scale.x*.5) { p.m.position.y = p.m.scale.x*.5; p.v.y *= -.35; p.v.x *= .7; p.v.z *= .7; p.w.multiplyScalar(.7); }
      p.m.rotation.x += p.w.x*dt; p.m.rotation.y += p.w.y*dt; p.m.rotation.z += p.w.z*dt;
    }
    mat.opacity = (gelo ? .85 : 1)*(k < .7 ? 1 : (1 - k)/.3);
  });
}
// espinhos que saem do chão (Stone Edge, gelo)
function espinhos(x, z, raio, tipo, qtd = 8){
  const gelo = tipo === 'ice';
  const mat = new THREE.MeshStandardMaterial({ color: COR_ROCHA[tipo] || 0x8a7350, roughness: gelo ? .1 : .9, metalness: gelo ? .2 : 0, flatShading: true,
    transparent: true, opacity: gelo ? .88 : 1, emissive: gelo ? 0x1d5fa8 : 0x000000, emissiveIntensity: .3 });
  const g = new THREE.Group(), lista = [];
  for (let i = 0; i < qtd; i++) {
    const a = i/qtd*Math.PI*2 + rnd(-.3, .3), r = i === 0 ? 0 : raio*rnd(.35, .9);
    const m = new THREE.Mesh(GEO_ESPINHO, mat); m.castShadow = true;
    m.position.set(x + Math.cos(a)*r, 0, z + Math.sin(a)*r);
    m.rotation.set(rnd(-.35, .35), rnd(0, 7), rnd(-.35, .35));
    lista.push({ m, h: (i === 0 ? 3.2 : rnd(1.4, 2.6))*(raio/3), w: rnd(.3, .55)*(raio/3), atraso: i*.03 });
    g.add(m);
  }
  efeito(g, 1.5, (e, k) => {
    for (const p of lista) {
      const t = Math.max(0, e.t - p.atraso), sobe = Math.min(1, t/.12), desce = e.t > 1.1 ? (e.t - 1.1)/.4 : 0;
      const s = sobe*(1 + .15*Math.sin(Math.min(1, t/.25)*Math.PI))*(1 - desce);
      p.m.scale.set(p.w*Math.max(.01, s), p.h*Math.max(.01, s), p.w*Math.max(.01, s));
    }
  });
  pedacos(x, .3, z, 10, tipo, 7, .18); poeira(x, z, 12, gelo ? 0xffffff : 0xb59a6a);
}
// rachaduras no chão (Earthquake)
function rachaduras(x, z, raio){
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
  g.strokeStyle = 'rgba(40,25,10,.9)'; g.lineCap = 'round';
  for (let i = 0; i < 9; i++) {
    let px = 128, py = 128, a = i/9*Math.PI*2 + rnd(-.2, .2); g.lineWidth = 7; g.beginPath(); g.moveTo(px, py);
    for (let k = 0; k < 7; k++) { a += rnd(-.5, .5); px += Math.cos(a)*18; py += Math.sin(a)*18; g.lineTo(px, py); g.lineWidth = Math.max(1, 7 - k); }
    g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  const m = new THREE.Mesh(GEO.disco, new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false }));
  m.rotation.x = -Math.PI/2; m.position.set(x, .05, z); m.scale.setScalar(raio);
  efeito(m, 3, (e, k) => { m.material.opacity = k < .8 ? 1 : (1 - k)/.2; m.scale.setScalar(raio*Math.min(1, e.t*6)); });
}
// jato contínuo (lança-chamas, jato d'água): segue a boca do Pokémon
function jato(L, g, dir, dur = .6){
  const e = estilo(g.tipo), o = new THREE.Object3D();
  efeito(o, dur, (ef, k) => {
    if (!L.emCampo) return;
    const d = new THREE.Vector3(Math.sin(L.rumo), 0, Math.cos(L.rumo));
    const p = centroDe(L).addScaledVector(d, L.raio*.9);
    for (let i = 0; i < 9; i++) {
      const v = d.clone().multiplyScalar(rnd(16, 22)).add(new THREE.Vector3(rnd(-1.2, 1.2), rnd(-.6, 1), rnd(-1.2, 1.2)));
      const cel = escolher(e.rastro);
      part(cel, { x: p.x, y: p.y, z: p.z, vx: v.x, vy: v.y, vz: v.z, cor: Math.random() < .55 ? e.c1 : e.c2, tam: rnd(.35, .6), vida: rnd(.45, .6),
        atrito: 1.2, cresce: 2.2, vrot: rnd(-5, 5), grav: g.tipo === 'water' ? 5 : 0, escura: g.tipo === 'ghost' || g.tipo === 'dark' });
    }
    part('brilho', { x: p.x, y: p.y, z: p.z, vx: d.x*18, vy: 0, vz: d.z*18, cor: e.c2, tam: .9, vida: .3, atrito: 1 });
    if (g.tipo === 'fire' && Math.random() < .5) FUMACA.add({ x: p.x + d.x*6, y: p.y + .5, z: p.z + d.z*6, vx: d.x*4, vy: 2, vz: d.z*4, cor: 0x3a2a22, tam: 1.2, vida: .9, cel: 'fumaca0', cresce: 1.5 });
  });
}
// redemoinho em volta do Pokémon (Fire Spin, Leaf Storm, Blizzard, Whirlpool)
function redemoinho(L, g, raio, dur = .9){
  const e = estilo(g.tipo), o = new THREE.Object3D();
  efeito(o, dur, (ef, k) => {
    const cx = L.pos.x, cz = L.pos.z;
    for (let i = 0; i < 12; i++) {
      const a = ef.t*12 + i*Math.PI*2/12, r = raio*(.4 + .6*Math.sin(k*Math.PI)), y = rnd(0, 4);
      part(escolher(e.rastro), { x: cx + Math.cos(a)*r, y, z: cz + Math.sin(a)*r, vx: -Math.sin(a)*9, vy: rnd(2, 5), vz: Math.cos(a)*9,
        cor: Math.random() < .55 ? e.c1 : e.c2, tam: rnd(.4, .75), vida: .45, atrito: .5, cresce: 1, vrot: 10, escura: g.tipo === 'ghost' || g.tipo === 'dark' });
    }
  });
  const anel = decalque('onda', e.c1, raio); anel.position.set(L.pos.x, .07, L.pos.z);
  efeito(anel, dur, (ef, k) => { anel.position.set(L.pos.x, .07, L.pos.z); anel.rotation.z += .2; anel.material.opacity = Math.sin(k*Math.PI); });
}
// parede (onda) que se expande em volta (Surf, Heat Wave, Muddy Water)
const TEX_PAREDE = (() => {
  const c = document.createElement('canvas'); c.width = 256; c.height = 128; const g = c.getContext('2d');
  const l = g.createLinearGradient(0, 0, 0, 128); l.addColorStop(0, 'rgba(255,255,255,0)'); l.addColorStop(.25, 'rgba(255,255,255,.95)'); l.addColorStop(1, 'rgba(255,255,255,.35)');
  g.fillStyle = l; g.fillRect(0, 0, 256, 128);
  g.globalCompositeOperation = 'destination-out';
  for (let x = 0; x < 256; x += 16) { g.beginPath(); g.arc(x + 8, 10 + Math.random()*10, 9, 0, 7); g.fill(); }
  const t = new THREE.CanvasTexture(c); t.wrapS = THREE.RepeatWrapping; t.repeat.set(6, 1); return t;
})();
function parede(x, z, raio, g, altura = 2.4){
  const e = estilo(g.tipo);
  const m = new THREE.Mesh(new THREE.CylinderGeometry(1, 1.15, 1, 48, 1, true), new THREE.MeshBasicMaterial({ map: TEX_PAREDE, color: e.c1, transparent: true, side: THREE.DoubleSide, depthWrite: false }));
  const m2 = new THREE.Mesh(m.geometry, new THREE.MeshBasicMaterial({ map: TEX_PAREDE, color: e.c2, transparent: true, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }));
  const gr = new THREE.Group(); gr.add(m); gr.add(m2); gr.position.set(x, 0, z);
  efeito(gr, .7, (ef, k) => {
    const r = .5 + raio*Math.sqrt(k), h = altura*Math.sin(Math.min(1, k*1.6)*Math.PI*.5)*(1 - k*.5);
    m.scale.set(r, h, r); m.position.y = h/2; m2.scale.set(r*.98, h*.8, r*.98); m2.position.y = h*.4;
    m.material.opacity = .85*(1 - k); m2.material.opacity = .5*(1 - k); TEX_PAREDE.offset.x += .01;
    for (let i = 0; i < 10; i++) { const a = Math.random()*7;
      part(escolher(e.rastro), { x: x + Math.cos(a)*r, y: h, z: z + Math.sin(a)*r, vx: Math.cos(a)*4, vy: rnd(1, 4), vz: Math.sin(a)*4, cor: Math.random() < .5 ? e.c1 : e.c2, tam: rnd(.35, .6), vida: .5, grav: g.tipo === 'water' || g.tipo === 'ground' ? 10 : 0, cresce: 1 }); }
  });
}
// descarga elétrica: raios saindo do Pokémon para vários lados
function descarga(L, raio, cor){
  const o = centroDe(L);
  for (let i = 0; i < 9; i++) setTimeout(() => {
    const a = Math.random()*7, r = raio*rnd(.5, 1);
    zigueZague(o, new THREE.Vector3(L.pos.x + Math.cos(a)*r, .1, L.pos.z + Math.sin(a)*r), cor, .14, .45);
  }, i*40);
}
// explosão de fogo em forma de estrela (Fire Blast)
function estrelaDeFogo(x, z, raio){
  for (let b = 0; b < 5; b++) {
    const a = b*Math.PI*2/5 - Math.PI/2;
    for (let i = 0; i < 14; i++) { const d = raio*i/14;
      part(escolher(['chama0','chama1','chama2']), { x: x + Math.cos(a)*d, y: .3, z: z + Math.sin(a)*d, vx: Math.cos(a)*2, vy: rnd(2, 5), vz: Math.sin(a)*2, cor: i % 2 ? 0xff6a10 : 0xffd04a, tam: rnd(.7, 1.1), vida: rnd(.5, .8), cresce: 1.5, atrito: 1 }); }
  }
  marcaChao(x, z, raio*.9, 5);
}

/* ----- Raio elétrico ramificado (galhos saindo do raio principal) ----- */
function raioRamificado(a, b, cor, nivel = 3, dur = .22){
  const pontos = [a.clone()], n = Math.max(6, Math.round(a.distanceTo(b)/.9));
  for (let i = 1; i < n; i++) pontos.push(a.clone().lerp(b, i/n).add(new THREE.Vector3(rnd(-.7, .7), rnd(-.7, .7), rnd(-.7, .7))));
  pontos.push(b.clone());
  const g = new THREE.Group();
  const seg = (p, q, larg, c) => { const d = q.clone().sub(p), m = new THREE.Mesh(GEO.cilindro, matBrilho(c));
    m.position.copy(p).addScaledVector(d, .5); m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0), d.clone().normalize()); m.scale.set(larg, d.length(), larg); g.add(m); };
  for (let i = 0; i < pontos.length - 1; i++) { seg(pontos[i], pontos[i+1], .09*nivel/3, cor); seg(pontos[i], pontos[i+1], .035*nivel/3, 0xffffff); }
  // galhos
  for (let i = 1; i < pontos.length - 1; i++) if (Math.random() < .45) {
    let p = pontos[i].clone(); const dir = new THREE.Vector3(rnd(-1, 1), rnd(-1, 1), rnd(-1, 1)).normalize();
    for (let k = 0; k < 3; k++) { const q = p.clone().addScaledVector(dir, rnd(.4, .9)).add(new THREE.Vector3(rnd(-.3, .3), rnd(-.3, .3), rnd(-.3, .3))); seg(p, q, .04, cor); p = q; }
  }
  efeito(g, dur, (e, k) => g.children.forEach(s => s.material.opacity = (1 - k)*(Math.random() < .75 ? 1 : .25)));
  clarao(cor, b.x, b.y, b.z, 6, 14, dur);
  return g;
}
/* ----- Carga antes de um golpe especial (a "preparação") ----- */
function cargaGolpe(L, tipo, dur){
  const e = estilo(tipo), o = new THREE.Object3D();
  const anel = decalque('runa', e.c1, .5); anel.position.set(L.pos.x, .08, L.pos.z); cena.add(anel);
  efeito(o, dur, (ef, k) => {
    anel.position.set(L.pos.x, .08, L.pos.z); anel.scale.setScalar(.5 + k*1.6 + L.raio); anel.rotation.z += .15; anel.material.opacity = Math.sin(k*Math.PI);
    const c = centroDe(L);
    for (let i = 0; i < 2; i++) { const a = Math.random()*7, b = rnd(-.6, 1), r = 1.6 + L.raio;
      part(escolher(['brilho', ...e.rastro]), { x: c.x + Math.cos(a)*r, y: c.y + b*r, z: c.z + Math.sin(a)*r, vx: -Math.cos(a)*r/(dur*.8), vy: -b*r/(dur*.8), vz: -Math.sin(a)*r/(dur*.8), cor: e.c1, tam: .3, vida: dur*.8, atrito: 0, tingir: true, brilhar: true }); }
    clarao(e.c1, c.x, c.y, c.z, 2 + k*3, 6, .05);
    if (k >= 1) { cena.remove(anel); anel.material.dispose(); }
  });
}
// aura de energia em volta do corpo (dragão, buffs, Ultimate)
function auraCorpo(L, tipo, dur, forca = 1){
  const e = estilo(tipo), o = new THREE.Object3D();
  efeito(o, dur, () => {
    for (let i = 0; i < 3*forca; i++) { const a = Math.random()*7, r = L.raio*1.1;
      part(escolher(e.rastro), { x: L.pos.x + Math.cos(a)*r, y: L.y + rnd(0, L.altura), z: L.pos.z + Math.sin(a)*r, vx: Math.cos(a)*.5, vy: rnd(1.5, 4), vz: Math.sin(a)*.5, cor: Math.random() < .6 ? e.c1 : e.c2, tam: rnd(.35, .6), vida: .45, cresce: 1.2, tingir: true }); }
  });
}
// brilho extra em volta de projéteis poderosos (Ultimate)
function auraProjetil(P, forca = 1){
  const e = estilo(P.g.tipo);
  for (let i = 0; i < forca*2; i++) part(escolher(['brilho', ...e.rastro]), { x: P.pos.x + rnd(-.6, .6), y: P.pos.y + rnd(-.6, .6), z: P.pos.z + rnd(-.6, .6), vx: rnd(-1, 1), vy: rnd(-1, 1), vz: rnd(-1, 1), cor: Math.random() < .5 ? e.c1 : e.c2, tam: .8, vida: .35, cresce: 1, tingir: true });
}

/* ----- Sons do combate (V8) ----- */
Object.assign(SOM, {
  soco:     n => { ruido(.08 + n*.04, .05 + n*.02, 1800 - n*500); tom(120 - n*25, .08 + n*.04, 'square', .05, .5); },
  vento:    () => ruido(.12, .035, 5000),
  acertoCombo: forte => { tom(forte ? 90 : 160, forte ? .22 : .1, 'square', forte ? .1 : .06, .35); ruido(forte ? .25 : .1, forte ? .13 : .07, forte ? 1100 : 2200); },
  guarda:   () => tom(500, .05, 'triangle', .03, 1.2),
  bloqueio: () => { tom(900, .08, 'triangle', .06, .7); ruido(.06, .04, 6000); },
  parry:    () => { tom(1300, .15, 'triangle', .08, 1.5); setTimeout(() => tom(1900, .2, 'triangle', .06, 1.3), 60); },
  quebraGuarda: () => { ruido(.4, .12, 3000); tom(300, .4, 'sawtooth', .07, .3); },
  esquivaPerfeita: () => { tom(700, .25, 'sine', .07, 2); setTimeout(() => tom(1400, .25, 'sine', .05, 1.5), 90); },
  puf:      () => ruido(.25, .06, 1200),
  assist:   () => { tom(660, .1, 'square', .04); setTimeout(() => tom(990, .14, 'square', .04), 90); },
  queda:    () => { tom(60, .3, 'sine', .14, .6); ruido(.25, .08, 500); },
  cine:     () => { tom(80, 1.4, 'sawtooth', .06, 3); ruido(1, .05, 400); },
  cineImpacto: () => { ruido(1.2, .2, 600); tom(45, 1.2, 'sine', .2, .4); },
  rodada:   () => { [0, 150, 300].forEach((d, i) => setTimeout(() => tom(440*(1 + i*.25), .18, 'square', .05), d)); },
  vitoria:  () => { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => tom(f, .25, 'square', .05), i*140)); },
});

/* ----- Música de batalha (sequência simples sintetizada) ----- */
const MUSICA = { tocando: false, passo: 0, timer: null, ganho: null };
function tocarMusica(sim){
  if (!audio || !S.musica || !sim) { MUSICA.tocando = false; clearInterval(MUSICA.timer); return; }
  if (MUSICA.tocando) return;
  MUSICA.tocando = true; MUSICA.passo = 0;
  const baixo = [55, 55, 65.4, 55, 73.4, 55, 65.4, 49], melodia = [0, 7, 12, 10, 7, 3, 5, 7, 0, 7, 12, 15, 14, 12, 10, 7];
  MUSICA.timer = setInterval(() => {
    if (!somLigado || JOGO.pausado || !EM_BATALHA()) return;
    const i = MUSICA.passo++, t = audio.currentTime;
    const nota = (f, dur, tipo, vol) => { const o = audio.createOscillator(), g = audio.createGain(); o.type = tipo; o.frequency.value = f;
      g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur); o.connect(g).connect(audio.destination); o.start(t); o.stop(t + dur); };
    nota(baixo[Math.floor(i/2) % 8], .2, 'sawtooth', .025);
    if (i % 2 === 0) nota(220*Math.pow(2, melodia[(i/2) % 16]/12), .16, 'square', .012);
    if (i % 4 === 0) { const n = audio.sampleRate*.08, b = audio.createBuffer(1, n, audio.sampleRate), d = b.getChannelData(0);
      for (let k = 0; k < n; k++) d[k] = (Math.random()*2 - 1)*(1 - k/n); const s = audio.createBufferSource(), g = audio.createGain(); s.buffer = b; g.gain.value = .04; s.connect(g).connect(audio.destination); s.start(t); }
  }, 140);
}
