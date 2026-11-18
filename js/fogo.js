"use strict";
/* =========================================================
   V19: FOGO DE VERDADE NA PONTA DA CAUDA (Charizard, Mega Charizard Y)
   O modelo traz a chama "cinza" (no jogo original ela é pintada por um shader especial).
   Aqui a chama do modelo é encolhida (escalaOssos) ou escondida (ocultarMalhas) e, no lugar, entra um fogo feito por shader:
   ruído subindo, núcleo branco-amarelo, borda laranja-vermelha, tremendo e com brilho em volta.
   Uso na ficha (js/dados.js):  fogoCauda: { osso: /^EndTail/, tam: .3, cor: 'laranja' }
     osso = osso da ponta da cauda (onde o fogo fica) · tam = tamanho (× altura do Pokémon) · cor = 'laranja' ou 'azul'
   ========================================================= */
const CORES_FOGO = {
  laranja: { nucleo: [1, .9, .5], meio: [1, .62, .12], borda: [.85, .16, .02], brilho: 0xff7a1a },
  azul:    { nucleo: [.85, 1, 1],   meio: [.25, .75, 1],  borda: [.1, .25, .9],   brilho: 0x3aa8ff },
};
const VERT_FOGO = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const FRAG_FOGO = `
uniform float uT; uniform vec3 uNucleo, uMeio, uBorda; uniform float uSeed; varying vec2 vUv;
float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7)))*43758.5453); }
float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0 - 2.0*f);
  return mix(mix(h(i), h(i + vec2(1,0)), f.x), mix(h(i + vec2(0,1)), h(i + vec2(1,1)), f.x), f.y); }
float fbm(vec2 p){ float v = 0.0, a = .5; for (int k = 0; k < 4; k++){ v += a*n(p); p *= 2.03; a *= .5; } return v; }
void main(){
  vec2 uv = vUv; uv.x = (uv.x - .5)*2.0;               // -1..1 na largura, 0 (base) .. 1 (ponta)
  float t = uT*1.6 + uSeed;
  float r1 = fbm(vec2(uv.x*2.0, uv.y*2.4 - t*2.0)), r2 = fbm(vec2(uv.x*4.0 + 3.0, uv.y*4.6 - t*3.2));
  // gota: base redonda (y ~ .12-.3) que afina até a ponta; a ponta tremula com o ruído
  float base = sqrt(clamp((uv.y - .02)/.24, 0.0, 1.0));
  float corpo = 1.0 - smoothstep(.2, 1.0, uv.y);
  float largura = .78*base*(.25 + .75*corpo);
  float x = abs(uv.x + (r1 - .5)*.5*uv.y);
  float forma = largura - x - (r2 - .45)*.5*uv.y*uv.y;
  float a = smoothstep(0.0, .12, forma);
  if (a < .02) discard;
  float calor = clamp(forma*2.2*(1.15 - uv.y*.6), 0.0, 1.0);
  vec3 c = mix(uBorda, uMeio, smoothstep(.05, .45, calor)); c = mix(c, uNucleo, smoothstep(.55, .95, calor));
  gl_FragColor = vec4(c*1.1, a*(.85 + .15*calor));
}`;
let _texBrilho = null;
function texBrilhoFogo(){
  if (_texBrilho) return _texBrilho;
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
  const r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, 'rgba(255,255,255,.9)'); r.addColorStop(.35, 'rgba(255,255,255,.35)'); r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r; g.fillRect(0, 0, 64, 64); _texBrilho = new THREE.CanvasTexture(c); return _texBrilho;
}
function montarFogo(inst, cfg){
  const ossos = []; inst.obj.traverse(o => { if (o.isBone && cfg.osso.test(o.name)) ossos.push(o); });
  if (!ossos.length) return;
  const C = CORES_FOGO[cfg.cor || 'laranja'];
  const mat = new THREE.ShaderMaterial({ vertexShader: VERT_FOGO, fragmentShader: FRAG_FOGO, transparent: true, depthWrite: false, side: THREE.DoubleSide,
    uniforms: { uT: { value: 0 }, uSeed: { value: Math.random()*50 }, uNucleo: { value: new THREE.Vector3(...C.nucleo) }, uMeio: { value: new THREE.Vector3(...C.meio) }, uBorda: { value: new THREE.Vector3(...C.borda) } } });
  const geo = new THREE.PlaneGeometry(1, 1); geo.translate(0, .42, 0);                         // a base fica um pouco abaixo do osso
  const chama = new THREE.Mesh(geo, mat); chama.renderOrder = 5; chama.frustumCulled = false;
  const brilho = new THREE.Sprite(new THREE.SpriteMaterial({ map: texBrilhoFogo(), color: C.brilho, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: .55 }));
  brilho.renderOrder = 4;
  const grupo = new THREE.Group(); grupo.add(brilho, chama); inst.raiz.add(grupo);
  inst.fogo = { grupo, chama, brilho, mat, osso: ossos[0], tam: (cfg.tam || .4)*inst.altura, t: Math.random()*10 };
}
const _pf = new THREE.Vector3(), _qf = new THREE.Quaternion(), _qr = new THREE.Quaternion();
function atualizarFogo(inst, dt){
  const F = inst.fogo; F.t += dt; F.mat.uniforms.uT.value = F.t;
  inst.raiz.updateMatrixWorld(true);
  F.osso.getWorldPosition(_pf); inst.raiz.worldToLocal(_pf); F.grupo.position.copy(_pf);
  // a chama olha para a câmera, mas continua em pé (sobe no sentido do "céu")
  inst.raiz.getWorldQuaternion(_qr).invert();
  const ang = Math.atan2(camera.position.x - (inst.raiz.position.x + _pf.x), camera.position.z - (inst.raiz.position.z + _pf.z));
  _qf.setFromAxisAngle(new THREE.Vector3(0, 1, 0), ang); F.chama.quaternion.copy(_qr).multiply(_qf);
  const s = inst.raiz.scale.x || 1, k = F.tam/s;
  const pulsa = 1 + Math.sin(F.t*13)*.05 + Math.sin(F.t*7.3)*.04;
  F.chama.scale.set(k*.62*pulsa, k*(1 + Math.sin(F.t*9.1)*.07), 1);
  F.brilho.scale.setScalar(k*1.5*pulsa); F.brilho.position.y = k*.25; F.brilho.material.opacity = .45 + Math.sin(F.t*11)*.08;
}
function liberarFogo(inst){ if (!inst.fogo) return; inst.fogo.mat.dispose(); inst.fogo.chama.geometry.dispose(); inst.fogo.brilho.material.dispose(); }
