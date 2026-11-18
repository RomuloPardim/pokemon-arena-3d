"use strict";
/* =====================================================================
   VFX V13 — efeitos de golpe feitos por shader (sem imagens baixadas)
   - Núcleo de energia: esfera com "ruído" animado (fogo, plasma, água, sombra...)
   - Rastro: fita que segue o projétil, com cor e brilho do tipo
   - Arcos elétricos, bolha de impacto, faíscas esticadas
   - Feixe (raio) com textura animada por shader
   Tudo é gerado por código: leve, sem downloads e roda no celular.
   ===================================================================== */

const VFX_T = { value: 0 };          // relógio compartilhado por todos os shaders

// Cores e "modo" de cada tipo. a = miolo quente, b = cor principal, c = borda/escuro
// modo: 0 fogo, 1 plasma, 2 água, 3 espiral (planta), 4 cristal (gelo), 5 fumaça (sombra), 6 anéis (psíquico)
const VFX_TIPO = {
  fire:     { a: 0xfff3b0, b: 0xff7a18, c: 0xc81e00, modo: 0, desloc: .22 },
  water:    { a: 0xffffff, b: 0x2f8bff, c: 0x0b3fa8, modo: 2, desloc: .08 },
  electric: { a: 0xffffff, b: 0xffe23a, c: 0xff9a00, modo: 1, desloc: .05 },
  grass:    { a: 0xeaffb0, b: 0x52c83a, c: 0x1d6b1a, modo: 3, desloc: .06 },
  ice:      { a: 0xffffff, b: 0x9fe6ff, c: 0x3a8fd0, modo: 4, desloc: 0 },
  fighting: { a: 0xfff1d0, b: 0xff8a3a, c: 0xb8321a, modo: 1, desloc: .08 },
  poison:   { a: 0xf3b6ff, b: 0xb04ad8, c: 0x3a0a52, modo: 5, desloc: .18 },
  ground:   { a: 0xffe6b0, b: 0xc9a25a, c: 0x5a3a18, modo: 5, desloc: .2 },
  flying:   { a: 0xffffff, b: 0xb8d0ff, c: 0x5a7ad8, modo: 3, desloc: .04 },
  psychic:  { a: 0xffe0f2, b: 0xff4aa8, c: 0x8a1060, modo: 6, desloc: .04 },
  bug:      { a: 0xf4ffb0, b: 0xa6c31a, c: 0x4a5a08, modo: 3, desloc: .06 },
  rock:     { a: 0xfff0c8, b: 0xb8a06a, c: 0x4a3a20, modo: 5, desloc: .2 },
  ghost:    { a: 0xe8b8ff, b: 0x7a3ad0, c: 0x12051e, modo: 5, desloc: .2 },
  dragon:   { a: 0xd8f4ff, b: 0x6a4dff, c: 0x1a0a6a, modo: 0, desloc: .18 },
  dark:     { a: 0xff6a8a, b: 0x5a2a7a, c: 0x0a0410, modo: 5, desloc: .22 },
  steel:    { a: 0xffffff, b: 0xc8d6ea, c: 0x5a6a8a, modo: 4, desloc: 0 },
  fairy:    { a: 0xffffff, b: 0xff8ad8, c: 0xb03a90, modo: 6, desloc: .04 },
  normal:   { a: 0xffffff, b: 0xfff0b0, c: 0xd89a2a, modo: 1, desloc: .06 },
};
const vfxTipo = t => VFX_TIPO[t] || VFX_TIPO.normal;
const VFX_ESCUROS = new Set(['ghost', 'dark', 'poison']);

const GLSL_RUIDO = `
float h3(vec3 p){ return fract(sin(dot(p, vec3(127.1, 311.7, 74.7)))*43758.5453); }
float ruido(vec3 p){
  vec3 i = floor(p), f = fract(p); f = f*f*(3. - 2.*f);
  return mix(mix(mix(h3(i), h3(i + vec3(1,0,0)), f.x), mix(h3(i + vec3(0,1,0)), h3(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(h3(i + vec3(0,0,1)), h3(i + vec3(1,0,1)), f.x), mix(h3(i + vec3(0,1,1)), h3(i + vec3(1,1,1)), f.x), f.y), f.z);
}
float fbm(vec3 p){ float a = .5, s = 0.; for (int i = 0; i < 4; i++) { s += a*ruido(p); p *= 2.03; a *= .5; } return s; }
`;

/* ----- Núcleo de energia (esfera com shader) ----- */
const GEO_NUCLEO = new THREE.IcosahedronGeometry(1, 3);
const GEO_CRISTAL = new THREE.IcosahedronGeometry(1, 0);
const GEO_ANEL_VFX = new THREE.RingGeometry(.82, 1, 48);
const _matNucleo = {};
function materialNucleo(tipo){
  const base = _matNucleo[tipo] || (_matNucleo[tipo] = (() => {
    const v = vfxTipo(tipo);
    return new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, side: THREE.FrontSide,
      uniforms: { t: VFX_T, opac: { value: 1 }, modo: { value: v.modo }, desloc: { value: v.desloc }, semente: { value: 0 },
        cA: { value: new THREE.Color(v.a) }, cB: { value: new THREE.Color(v.b) }, cC: { value: new THREE.Color(v.c) } },
      vertexShader: GLSL_RUIDO + `
        uniform float t, desloc, semente; varying vec3 vN, vV, vO;
        void main(){
          vec3 p = position;
          float d = fbm(p*2.2 + vec3(semente, -t*2.6, t*.8));
          p += normal*(d - .45)*desloc*2.;
          vO = position; vec4 mv = modelViewMatrix*vec4(p, 1.);
          vN = normalize(normalMatrix*normal); vV = -mv.xyz; gl_Position = projectionMatrix*mv;
        }`,
      fragmentShader: GLSL_RUIDO + `
        uniform float t, opac, modo, semente; uniform vec3 cA, cB, cC; varying vec3 vN, vV, vO;
        void main(){
          float fr = 1. - abs(dot(normalize(vN), normalize(vV)));      // 0 no centro, 1 na borda
          vec3 p = vO + semente; vec3 col; float a; float n;
          if (modo < .5) {                 // fogo: chamas subindo, miolo branco-amarelo
            n = fbm(p*2.4 + vec3(0., -t*3.2, t*.6));
            float calor = clamp((1. - fr)*1.15 + n*.8 - .45, 0., 1.);
            col = mix(cC, cB, smoothstep(.05, .45, calor)); col = mix(col, cA, smoothstep(.55, .95, calor));
            a = smoothstep(0., .3, calor + .12);
          } else if (modo < 1.5) {         // plasma: linhas finas de energia
            n = fbm(p*2.6 + vec3(t*1.7, -t*1.1, t));
            float l = pow(1. - abs(sin(n*16. + t*5.)), 5.);
            col = mix(cB, cA, clamp(l + (1. - fr)*.55, 0., 1.)); col = mix(col, cC, fr*fr*.5);
            a = .55 + l*.45 + fr*.25;
          } else if (modo < 2.5) {         // água: ondas e espuma
            n = fbm(p*2.6 + vec3(t*1.4, t*.6, -t));
            float esp = smoothstep(.6, .74, n);
            col = mix(cB, cC, fr*.7); col = mix(col, cA, esp*.9 + pow(1. - fr, 5.)*.35);
            a = .78 + fr*.22;
          } else if (modo < 3.5) {         // espiral (planta, vento, inseto)
            float ang = atan(p.z, p.x); n = fbm(p*2. + t);
            float e = .5 + .5*sin(ang*3. + p.y*5. - t*7. + n*3.);
            col = mix(cC, cB, e); col = mix(col, cA, pow(1. - fr, 3.)*.75 + smoothstep(.85, 1., e)*.4);
            a = .72 + fr*.28;
          } else if (modo < 4.5) {         // cristal (gelo, aço): brilho nas faces
            n = fbm(p*3.5 + t*.3);
            float brilho = smoothstep(.62, .7, n) + pow(fr, 2.)*.8;
            col = mix(cB, cA, clamp(brilho, 0., 1.)); col = mix(col, cC, (1. - fr)*.25);
            a = .7 + fr*.3;
          } else if (modo < 5.5) {         // fumaça escura com borda brilhante (sombra, veneno, terra)
            n = fbm(p*2.1 + vec3(0., t*1.3, t*.5));
            float borda = pow(fr, 2.2);
            col = mix(cC, cB, smoothstep(.35, .78, n)*.85 + borda*.5); col += cA*pow(borda, 3.)*1.1;
            a = .88;
          } else {                         // anéis (psíquico, fada)
            float r = length(p); float an = .5 + .5*sin(r*13. - t*7.);
            n = fbm(p*2. + t*.5);
            col = mix(cB, cA, an*.65 + (1. - fr)*.35 + n*.2); col = mix(col, cC, fr*.3);
            a = .55 + an*.3 + fr*.25;
          }
          gl_FragColor = vec4(col, clamp(a, 0., 1.)*opac);
        }`,
    });
  })());
  const m = base.clone(); m.uniforms.t = VFX_T; m.uniforms.semente.value = Math.random()*20; return m;
}
// esfera (ou cristal) de energia de um tipo
function nucleoEnergia(tipo, raio){
  const cristal = vfxTipo(tipo).modo === 4;
  const m = new THREE.Mesh(cristal ? GEO_CRISTAL : GEO_NUCLEO, materialNucleo(tipo));
  m.scale.setScalar(raio); m.renderOrder = 5; m.frustumCulled = false; return m;
}

/* ----- Fita (rastro, arco elétrico, hélice do feixe) ----- */
const _matFita = {};
function materialFita(tipo, aditivo){
  const chave = tipo + (aditivo ? '+' : '');
  const base = _matFita[chave] || (_matFita[chave] = (() => {
    const v = vfxTipo(tipo);
    return new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, side: THREE.DoubleSide,
      blending: aditivo ? THREE.AdditiveBlending : THREE.NormalBlending,
      uniforms: { t: VFX_T, opac: { value: 1 }, modo: { value: v.modo }, semente: { value: 0 },
        cA: { value: new THREE.Color(v.a) }, cB: { value: new THREE.Color(v.b) }, cC: { value: new THREE.Color(v.c) } },
      vertexShader: `attribute float aU, aV; varying float vU, vV; void main(){ vU = aU; vV = aV; gl_Position = projectionMatrix*modelViewMatrix*vec4(position, 1.); }`,
      fragmentShader: GLSL_RUIDO + `
        uniform float t, opac, modo, semente; uniform vec3 cA, cB, cC; varying float vU, vV;
        void main(){
          float borda = 1. - pow(abs(vV*2. - 1.), 1.6);
          float n = fbm(vec3(vU*7. - t*6. + semente, vV*3., t*1.5));
          float a = pow(1. - vU, 1.25)*borda*(.55 + n*.75);
          vec3 col = mix(cA, cB, smoothstep(0., .3, vU + (1. - borda)*.4));
          col = mix(col, cC, smoothstep(.45, 1., vU));
          if (modo > 4.5 && modo < 5.5) col = mix(cC, cB, n*.8) + cA*pow(borda, 6.)*(1. - vU)*.6;   // fumaça escura
          col = mix(col, cA, pow(borda, 10.)*(1. - vU)*.8);                                             // fio quente no meio
          gl_FragColor = vec4(col, clamp(a, 0., 1.)*opac);
        }`,
    });
  })());
  const m = base.clone(); m.uniforms.t = VFX_T; m.uniforms.semente.value = Math.random()*20; return m;
}
const _vfxA = new THREE.Vector3(), _vfxB = new THREE.Vector3(), _vfxC = new THREE.Vector3();
class FitaVFX {
  constructor(tipo, largura, n = 22, aditivo = false){
    this.n = n; this.largura = largura; this.pts = []; this.larg = null;
    const g = new THREE.BufferGeometry();
    this.pos = new Float32Array(n*2*3);
    const u = new Float32Array(n*2), v = new Float32Array(n*2), idx = [];
    for (let i = 0; i < n; i++) { u[i*2] = u[i*2 + 1] = i/(n - 1); v[i*2] = 0; v[i*2 + 1] = 1;
      if (i < n - 1) { const a = i*2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } }
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aU', new THREE.BufferAttribute(u, 1)); g.setAttribute('aV', new THREE.BufferAttribute(v, 1));
    g.setIndex(idx);
    this.mesh = new THREE.Mesh(g, materialFita(tipo, aditivo)); this.mesh.frustumCulled = false; this.mesh.renderOrder = 4;
    cena.add(this.mesh);
  }
  // rastro: guarda as últimas posições
  empurrar(p){
    if (!this.pts.length || this.pts[0].distanceToSquared(p) > .004) { this.pts.unshift(p.clone()); if (this.pts.length > this.n) this.pts.pop(); }
    else this.pts[0].copy(p);
    this.montar();
  }
  // forma livre (arco, hélice)
  definir(pts, larg){ this.pts = pts; this.larg = larg || null; this.montar(); }
  montar(){
    const P = this.pts, n = this.n, cam = camera.position;
    if (P.length < 2) { this.mesh.visible = false; return; }
    this.mesh.visible = true;
    for (let i = 0; i < n; i++) {
      const j = Math.min(i, P.length - 1), p = P[j];
      const a = P[Math.max(0, j - 1)], b = P[Math.min(P.length - 1, j + 1)];
      _vfxA.subVectors(b, a); if (_vfxA.lengthSq() < 1e-8) _vfxA.set(1, 0, 0);
      _vfxB.subVectors(cam, p); _vfxC.crossVectors(_vfxA, _vfxB).normalize();
      const k = j/(Math.max(1, P.length - 1));
      const w = this.larg ? this.larg[j] : this.largura*Math.pow(1 - k*.85, .8);
      const o = i*6;
      this.pos[o] = p.x + _vfxC.x*w; this.pos[o + 1] = p.y + _vfxC.y*w; this.pos[o + 2] = p.z + _vfxC.z*w;
      this.pos[o + 3] = p.x - _vfxC.x*w; this.pos[o + 4] = p.y - _vfxC.y*w; this.pos[o + 5] = p.z - _vfxC.z*w;
    }
    this.mesh.geometry.attributes.position.needsUpdate = true;
  }
  set opacidade(o){ this.mesh.material.uniforms.opac.value = o; }
  liberar(){ cena.remove(this.mesh); this.mesh.geometry.dispose(); this.mesh.material.dispose(); }
}
// rastro que ainda some devagar depois que o projétil acaba
const FITAS_SOLTAS = [];
function soltarFita(f, dur = .25){ f.morrendo = 0; f.dur = dur; FITAS_SOLTAS.push(f); }
function atualizarFitas(dt){
  for (let i = FITAS_SOLTAS.length - 1; i >= 0; i--) {
    const f = FITAS_SOLTAS[i]; f.morrendo += dt; const k = f.morrendo/f.dur;
    if (f.pts.length > 2 && !f.larg) { f.pts.pop(); f.montar(); }
    f.opacidade = Math.max(0, 1 - k);
    if (k >= 1) { f.liberar(); FITAS_SOLTAS.splice(i, 1); }
  }
}

/* ----- Arco elétrico (fita torta que pisca) ----- */
function arcoEletrico(a, b, largura = .07, dur = .09, desvio = .35, tipo = 'electric'){
  const n = 10, pts = [], larg = [];
  for (let i = 0; i < n; i++) {
    const p = a.clone().lerp(b, i/(n - 1));
    if (i && i < n - 1) p.add(new THREE.Vector3(rnd(-desvio, desvio), rnd(-desvio, desvio), rnd(-desvio, desvio)));
    pts.push(p); larg.push(largura*(i === 0 || i === n - 1 ? .4 : 1));
  }
  const f = new FitaVFX(tipo, largura, n, false); f.definir(pts, larg);
  f.mesh.material.uniforms.cA.value.set(0xffffff); f.mesh.material.uniforms.cB.value.set(0xfff27a); f.mesh.material.uniforms.cC.value.set(0xffb000);
  soltarFita(f, dur);
  return f;
}

/* ----- Impacto: bolha de energia que estoura, faíscas esticadas e anel ----- */
function impactoVFX(tipo, x, y, z, raio = 1, vel = null){
  if (typeof cena === 'undefined') return;
  const v = vfxTipo(tipo), q = QUAL.particulas;
  // bolha de energia
  const b = nucleoEnergia(tipo, raio*.4); b.position.set(x, y, z); b.rotation.set(Math.random()*6, Math.random()*6, 0);
  efeito(b, .32, (e, k) => { b.scale.setScalar(raio*(.4 + Math.pow(k, .6)*1.9)); b.material.uniforms.opac.value = (1 - k)*(1 - k); });
  // segunda bolha maior e transparente (onda de choque no ar)
  if (q > .55) {
    const s = new THREE.Mesh(GEO_NUCLEO, materialNucleo(tipo)); s.position.set(x, y, z); s.renderOrder = 5;
    s.material.uniforms.desloc.value = 0;
    efeito(s, .38, (e, k) => { s.scale.setScalar(raio*(.6 + k*3.2)); s.material.uniforms.opac.value = .35*(1 - k); });
  }
  // faíscas esticadas na direção em que voam
  const nF = Math.round((10 + raio*6)*q);
  for (let i = 0; i < nF; i++) {
    const a = Math.random()*Math.PI*2, el = rnd(-.4, 1.1), f = rnd(5, 13)*Math.sqrt(raio);
    const vx = Math.cos(a)*Math.cos(el)*f, vy = Math.sin(el)*f, vz = Math.sin(a)*Math.cos(el)*f;
    _vfxA.set(vx, vy, vz);
    part('listra', { x, y, z, vx, vy, vz, cor: Math.random() < .5 ? v.a : v.b, tam: rnd(.5, 1)*Math.sqrt(raio), vida: rnd(.16, .3), atrito: 3.5,
      rot: anguloNaTela(new THREE.Vector3(x, y, z), _vfxA), brilhar: !VFX_ESCUROS.has(tipo), tingir: true, grav: 4 });
  }
  // anel no chão (com borda escura para aparecer no gramado claro)
  if (y < 3) {
    const anel = new THREE.Mesh(GEO_ANEL_VFX, new THREE.MeshBasicMaterial({ color: v.b, transparent: true, depthWrite: false, side: THREE.DoubleSide }));
    anel.rotation.x = -Math.PI/2; anel.position.set(x, .07, z); anel.renderOrder = 2;
    efeito(anel, .42, (e, k) => { anel.scale.setScalar(raio*(.5 + k*3)); anel.material.opacity = .8*(1 - k); });
  }
  // extras de cada tipo
  if (tipo === 'electric') for (let i = 0; i < 4; i++) { const d = new THREE.Vector3(rnd(-1, 1), rnd(-.2, 1), rnd(-1, 1)).normalize().multiplyScalar(raio*rnd(1.5, 2.6));
    arcoEletrico(new THREE.Vector3(x, y, z), new THREE.Vector3(x + d.x, y + d.y, z + d.z), .08, .14, .3*raio); }
  if (tipo === 'fire' || tipo === 'dragon') {
    const bola = nucleoEnergia(tipo, raio*.5); bola.position.set(x, y + raio*.2, z);
    efeito(bola, .55, (e, k) => { bola.scale.setScalar(raio*(.5 + k*1.4)); bola.position.y = y + raio*(.2 + k*1.1); bola.material.uniforms.opac.value = (1 - k)*.9; });
  }
}

/* ----- Feixe por shader ----- */
const _matFeixe = {};
function materialFeixe(tipo, nucleo){
  const chave = tipo + (nucleo ? 'n' : '');
  const base = _matFeixe[chave] || (_matFeixe[chave] = (() => {
    const v = vfxTipo(tipo);
    return new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, side: nucleo ? THREE.DoubleSide : THREE.FrontSide,
      blending: nucleo && !VFX_ESCUROS.has(tipo) ? THREE.AdditiveBlending : THREE.NormalBlending,
      uniforms: { t: VFX_T, opac: { value: 1 }, comp: { value: 8 }, modo: { value: v.modo }, nucleo: { value: nucleo ? 1 : 0 },
        cA: { value: new THREE.Color(v.a) }, cB: { value: new THREE.Color(v.b) }, cC: { value: new THREE.Color(v.c) } },
      vertexShader: `varying vec2 vUv; varying vec3 vN, vV; void main(){ vUv = uv; vec4 mv = modelViewMatrix*vec4(position, 1.); vN = normalize(normalMatrix*normal); vV = -mv.xyz; gl_Position = projectionMatrix*mv; }`,
      fragmentShader: GLSL_RUIDO + `
        uniform float t, opac, comp, modo, nucleo; uniform vec3 cA, cB, cC; varying vec2 vUv; varying vec3 vN, vV;
        void main(){
          float fr = 1. - abs(dot(normalize(vN), normalize(vV)));
          float ang = vUv.x*6.2832;
          vec3 q = vec3(cos(ang)*1.5, sin(ang)*1.5, vUv.y*comp*.9 - t*(modo < .5 ? 7. : 10.));
          float n = fbm(q + vec3(0., 0., t*.5));
          float miolo = pow(1. - fr, 2.);
          vec3 col; float a;
          if (nucleo > .5) { col = mix(cB, cA, .6 + n*.4); a = miolo*(.7 + n*.5); }
          else if (modo > 4.5 && modo < 5.5) { col = mix(cC, cB, smoothstep(.3, .8, n)) + cA*pow(fr, 3.)*.8; a = (.45 + n*.55)*(1. - fr*.35); }
          else { col = mix(cC, cB, smoothstep(.2, .6, n + miolo*.4)); col = mix(col, cA, smoothstep(.62, .9, n + miolo*.3)); a = (.35 + n*.6)*(1. - fr*.55) + miolo*.25; }
          // pontas suaves
          a *= smoothstep(0., .04, vUv.y)*smoothstep(1., .96, vUv.y);
          gl_FragColor = vec4(col, clamp(a, 0., 1.)*opac);
        }`,
    });
  })());
  const m = base.clone(); m.uniforms.t = VFX_T; return m;
}
// faixas em hélice que giram em volta do feixe
function heliceFeixe(tipo, de, ate, raio, fase){
  const n = 26, f = new FitaVFX(tipo, raio*.18, n, !VFX_ESCUROS.has(tipo));
  const dir = ate.clone().sub(de), comp = dir.length(); dir.normalize();
  const lado = new THREE.Vector3().crossVectors(dir, Math.abs(dir.y) < .9 ? new THREE.Vector3(0,1,0) : new THREE.Vector3(1,0,0)).normalize();
  const cima = new THREE.Vector3().crossVectors(lado, dir);
  f.atualizarHelice = (tempo, w) => {
    const pts = [], larg = [];
    for (let i = 0; i < n; i++) { const s = i/(n - 1), a = fase + s*comp*1.6 - tempo*14;
      pts.push(de.clone().addScaledVector(dir, s*comp).addScaledVector(lado, Math.cos(a)*raio*w).addScaledVector(cima, Math.sin(a)*raio*w));
      larg.push(raio*.16*w*Math.sin(Math.min(1, s*6)*Math.PI*.5)); }
    f.definir(pts, larg);
  };
  return f;
}

/* ----- liga o relógio e as fitas ao laço de efeitos ----- */
{
  const original = atualizarEfeitos;
  atualizarEfeitos = function(dt){ VFX_T.value += dt; atualizarFitas(dt); original(dt); };
  const limparOriginal = limparEfeitos;
  limparEfeitos = function(){ limparOriginal(); for (const f of FITAS_SOLTAS) f.liberar(); FITAS_SOLTAS.length = 0; };
}
