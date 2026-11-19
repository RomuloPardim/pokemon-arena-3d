"use strict";
/* =========================================================
   PÓS-PROCESSAMENTO (depois de desenhar a cena)
   - Bloom (brilho que "vaza" das partes muito claras) — qualidade Alta
   - Onda de choque: distorce a imagem em um anel que cresce — qualidade Média e Alta
   - Vinheta: escurece as bordas nas cinemáticas
   Qualidade Baixa desenha direto, sem nada disso (mais rápido).
   ========================================================= */
const POS = { composer: null, bloom: null, distorcao: null, ondas: [] };

const SHADER_DISTORCAO = {
  uniforms: { tDiffuse: { value: null }, centro: { value: new THREE.Vector2(.5, .5) }, raio: { value: -1 }, forca: { value: 0 },
    aspecto: { value: 1 }, vinheta: { value: 0 }, cor: { value: new THREE.Color(0, 0, 0) } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform vec2 centro; uniform float raio, forca, aspecto, vinheta; uniform vec3 cor; varying vec2 vUv;
    void main(){
      vec2 uv = vUv;
      if (raio > 0.) {
        vec2 d = uv - centro; d.x *= aspecto; float r = length(d);
        float anel = smoothstep(raio - .09, raio, r)*(1. - smoothstep(raio, raio + .09, r));
        vec2 desloc = (r > 0.0001 ? d/r : vec2(0.))*anel*forca; desloc.x /= aspecto;
        uv -= desloc;
      }
      vec4 c = texture2D(tDiffuse, uv);
      if (vinheta > 0.) { vec2 v = vUv - .5; float e = smoothstep(.25, .8, length(v)*1.2); c.rgb = mix(c.rgb, cor, e*vinheta); c.rgb *= 1. - vinheta*.25; }
      gl_FragColor = c;
    }`,
};

function configurarPos(qualidade){
  POS.composer = null; POS.bloom = null; POS.distorcao = null;
  if (qualidade === 'baixa') return;
  const C = new THREE.EffectComposer(renderer);
  C.addPass(new THREE.RenderPass(cena, camera));
  if (qualidade === 'alta') {
    POS.bloom = new THREE.UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), .5, .45, .86);
    C.addPass(POS.bloom);
  } else if (qualidade === 'media' && !DISPOSITIVO_MOVEL) {
    // V20: bloom leve na qualidade Média, em meia resolução (os efeitos "brilham" sem pesar)
    const B = new THREE.UnrealBloomPass(new THREE.Vector2(innerWidth/2, innerHeight/2), .38, .4, .88);
    const tam = B.setSize.bind(B); B.setSize = (w, h) => tam(Math.max(1, w/2), Math.max(1, h/2));
    POS.bloom = B; C.addPass(B);
  }
  POS.distorcao = new THREE.ShaderPass(SHADER_DISTORCAO);
  C.addPass(POS.distorcao);
  C.addPass(new THREE.ShaderPass(THREE.GammaCorrectionShader));    // a cena é desenhada em cores lineares; converte para a tela
  POS.composer = C;
  ajustarTamanhoPos();
}
function ajustarTamanhoPos(){
  if (!POS.composer) return;
  POS.composer.setPixelRatio(renderer.getPixelRatio());
  POS.composer.setSize(innerWidth, innerHeight);
}
// Onda de choque saindo de um ponto 3D (forca ~ .3 fraca, 1.5 enorme)
function ondaDeChoque(pos, forca = 1){
  if (!POS.distorcao) return;
  const p = pos.clone().project(camera);
  if (p.z > 1) return;
  POS.ondas = [{ c: new THREE.Vector2(p.x*.5 + .5, p.y*.5 + .5), t: 0, forca }];
}
function atualizarPos(dt){
  if (!POS.distorcao) return;
  const u = POS.distorcao.uniforms;
  u.aspecto.value = innerWidth/innerHeight;
  const o = POS.ondas[0];
  if (o) {
    o.t += dt;
    const k = o.t/.55;
    if (k >= 1) { POS.ondas.length = 0; u.raio.value = -1; }
    else { u.centro.value.copy(o.c); u.raio.value = .04 + k*.6*Math.min(1.4, o.forca); u.forca.value = .035*o.forca*(1 - k); }
  } else u.raio.value = -1;
  // vinheta das cinemáticas
  const alvo = JOGO.cineAtiva ? .85 : 0;
  u.vinheta.value += (alvo - u.vinheta.value)*(1 - Math.exp(-dt*4));
}
function desenharCena(){
  if (POS.composer) POS.composer.render(); else renderer.render(cena, camera);
}
