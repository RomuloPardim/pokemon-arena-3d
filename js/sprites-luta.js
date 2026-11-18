"use strict";
/* =========================================================
   V17: POKÉMON DA LUTA COMO SPRITES ANIMADOS
   Os mesmos GIFs da seleção (PokeAPI, pasta "showdown"), de frente e de costas.
   O modelo 3D continua carregado, mas invisível: ele ainda mede o tamanho, a colisão e
   de onde saem os golpes. O sprite fica no "corpo", então pula, encolhe e avança junto.
   Configurações → Visual da luta → "Modelos 3D" volta ao jeito antigo.
   O GIF é decodificado com gifuct-js (MIT, js/lib/gifuct.min.js) e vira uma folha de quadros.
   ========================================================= */
const URL_SPRITE = (id, costas) => `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/${costas ? 'back/' : ''}${id}.gif`;
// número da forma Mega/Primitiva na PokeAPI (o sprite animado dela). Sem número = usa o normal maior e com cor.
const SPRITE_MEGA = { 3:10033, 6:{X:10034, Y:10035}, 9:10036, 18:10073, 65:10037, 94:10038, 130:10041, 142:10042, 150:{X:10043, Y:10044},
  181:10045, 212:10046, 214:10047, 229:10048, 248:10049, 254:10065, 257:10050, 260:10064, 282:10051, 306:10053, 359:10057, 376:10076,
  380:10062, 381:10063, 382:10077, 383:10078, 384:10079, 445:10058, 448:10059, 475:10068 };
const REGRAS_SPRITE = { altura: 1.3, alphaTest: .35, velAnim: 1 };
const usarSprites = () => typeof S === 'undefined' || S.visual !== 'modelos';

const CACHE_FOLHAS = new Map();
// baixa o GIF e monta a folha: { canvas, colunas, linhas, fw, fh, delays[] } (só a área ocupada pelo Pokémon)
function folhaDoGif(url){
  if (CACHE_FOLHAS.has(url)) return CACHE_FOLHAS.get(url);
  const p = fetch(url).then(r => { if (!r.ok) throw new Error('sprite ' + r.status); return r.arrayBuffer(); }).then(buf => {
    const gif = gifuct.parseGIF(buf), quadros = gifuct.decompressFrames(gif, true);
    if (!quadros.length) throw new Error('gif vazio');
    const W = gif.lsd.width, H = gif.lsd.height;
    const tela = document.createElement('canvas'); tela.width = W; tela.height = H; const ct = tela.getContext('2d', { willReadFrequently: true });
    const tmp = document.createElement('canvas'), tc = tmp.getContext('2d');
    const imagens = []; let antes = null, guardado = null;
    for (const q of quadros) {
      if (antes) {                                     // descarte do quadro anterior
        if (antes.disposalType === 2) ct.clearRect(antes.dims.left, antes.dims.top, antes.dims.width, antes.dims.height);
        else if (antes.disposalType === 3 && guardado) ct.putImageData(guardado, 0, 0);
      }
      if (q.disposalType === 3) guardado = ct.getImageData(0, 0, W, H);
      tmp.width = q.dims.width; tmp.height = q.dims.height;
      tc.putImageData(new ImageData(q.patch, q.dims.width, q.dims.height), 0, 0);
      ct.drawImage(tmp, q.dims.left, q.dims.top);
      imagens.push(ct.getImageData(0, 0, W, H)); antes = q;
    }
    // caixa que cobre o Pokémon em todos os quadros
    let x0 = W, y0 = H, x1 = -1, y1 = -1;
    for (const im of imagens) { const d = im.data;
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (d[(y*W + x)*4 + 3] > 40) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; } }
    if (x1 < 0) { x0 = 0; y0 = 0; x1 = W - 1; y1 = H - 1; }
    const fw = x1 - x0 + 3, fh = y1 - y0 + 3, n = imagens.length, colunas = Math.ceil(Math.sqrt(n)), linhas = Math.ceil(n/colunas);
    const folha = document.createElement('canvas'); folha.width = colunas*fw; folha.height = linhas*fh;
    const cf = folha.getContext('2d');
    imagens.forEach((im, i) => { ct.putImageData(im, 0, 0); cf.drawImage(tela, x0 - 1, y0 - 1, fw, fh, (i % colunas)*fw, Math.floor(i/colunas)*fh, fw, fh); });
    return { canvas: folha, colunas, linhas, fw, fh, n, delays: quadros.map(q => Math.max(20, q.delay || 60)/1000) };
  });
  CACHE_FOLHAS.set(url, p); p.catch(() => CACHE_FOLHAS.delete(url));
  return p;
}
function texturaDa(folha){
  if (!folha.tex) { const t = new THREE.CanvasTexture(folha.canvas);
    t.magFilter = THREE.NearestFilter; t.minFilter = THREE.LinearFilter; t.generateMipmaps = false; t.encoding = THREE.sRGBEncoding; folha.tex = t; }
  const t = folha.tex.clone(); t.needsUpdate = true; return t;
}
// carrega frente e costas de um número de Pokémon (costas é opcional)
async function carregarSprite(id){
  const [frente, costas] = await Promise.all([folhaDoGif(URL_SPRITE(id)), folhaDoGif(URL_SPRITE(id, true)).catch(() => null)]);
  return { frente, costas };
}

// põe o sprite na instância (chamado por criarInstancia). Se falhar, o modelo 3D continua aparecendo.
// V17.1: em vez de um THREE.Sprite (que fica "colado na tela"), é uma placa em pé no chão que só gira para os lados,
// recebe a luz e a neblina do mapa e faz sombra com o formato do Pokémon.
const GEO_PLACA = (() => { const g = new THREE.PlaneGeometry(1, 1); g.translate(0, .5, 0); return g; })();
async function vestirSprite(inst, id){
  let par; try { par = await carregarSprite(id); } catch (e) { return false; }
  const map = texturaDa(par.frente);
  const mat = new THREE.MeshLambertMaterial({ map, emissiveMap: map, emissive: 0xffffff, emissiveIntensity: .42,
    alphaTest: REGRAS_SPRITE.alphaTest, side: THREE.DoubleSide });
  const placa = new THREE.Mesh(GEO_PLACA, mat); placa.castShadow = true; placa.receiveShadow = false;
  const grupo = new THREE.Group(); grupo.add(placa); inst.raiz.add(grupo);
  inst.spr = { spr: placa, grupo, mat, par, folha: par.frente, costas: false, vira: false, q: 0, tq: 0, id, escala: 1,
    cor: new THREE.Color(1, 1, 1), lean: 0, avanco: 0, pulo: 0 };
  medirSprite(inst);
  if (inst.fogo) inst.fogo.grupo.visible = false;           // no modo sprite o desenho já tem o fogo
  inst.obj.visible = false;                                   // o modelo fica escondido (mas continua medindo e animando)
  if (!inst.sombraVoo) {                                      // sombra redonda e suave no chão, embaixo da sombra de verdade
    const sm = new THREE.MeshBasicMaterial({ map: TEXTURA_SOMBRA_VOO, transparent: true, depthWrite: false, opacity: .38, polygonOffset: true, polygonOffsetFactor: -1 });
    const s = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), sm); s.rotation.x = -Math.PI/2; s.position.y = .04; s.renderOrder = 2;
    const r = Math.max(.8, inst.raio*2.2); s.scale.set(r, r*.7, 1); inst.raiz.add(s); inst.sombraSpr = s;
  }
  return true;
}
function medirSprite(inst){
  const S2 = inst.spr, f = S2.folha, h = inst.altura*REGRAS_SPRITE.altura*S2.escala;
  S2.larg = h*f.fw/f.fh; S2.alt = h;
  S2.mat.map.repeat.set(1/f.colunas, 1/f.linhas);
}
// troca o desenho (ex.: Mega Evolução). Devolve true se achou o sprite.
async function trocarSprite(inst, id, escala = 1){
  if (!inst.spr) return false;
  let par; try { par = await carregarSprite(id); } catch (e) { return false; }
  const S2 = inst.spr; S2.par = par; S2.id = id; S2.escala = escala;
  S2.costas = false; S2.folha = par.frente; S2.mat.map.dispose(); S2.mat.map = texturaDa(par.frente); S2.mat.needsUpdate = true; S2.q = 0;
  medirSprite(inst); return true;
}
function idSpriteMega(baseId, M){
  const v = SPRITE_MEGA[baseId]; if (!v) return null;
  return typeof v === 'object' ? v[M.letra || 'X'] : v;
}

const _fr = new THREE.Vector3(), _dirCam = new THREE.Vector3(), _dirDir = new THREE.Vector3(), _q = new THREE.Quaternion(), _pw = new THREE.Vector3();
const _onda = (t, a, b) => t < a ? 0 : t > b ? 0 : Math.sin((t - a)/(b - a)*Math.PI);
// movimento extra de cada tipo de golpe (o sprite é chato, então precisa exagerar mais que o modelo)
//   avanco = anda para frente (×altura) · lean = inclina para frente (rad) · pulo = sobe (×altura) · sx/sy = estica/amassa
function poseDoGolpe(at){
  const P = { avanco: 0, lean: 0, pulo: 0, sx: 1, sy: 1, treme: 0, rapido: 1 };
  if (!at) return P;
  const t = Math.min(1, at.t), j = at.jeito; P.rapido = 2;
  switch (j) {
    case 'investida': case 'combo': {                       // avança com tudo e estica
      const f = _onda(t, 0, .7); P.avanco = .75*f; P.lean = .35*f; P.sx = 1 + .22*f; P.sy = 1 - .12*f; break; }
    case 'projetil': case 'rajada': {                       // recua, depois arremessa para frente
      const r = t < .25 ? t/.25 : 0, v = _onda(t, .25, .75); P.avanco = -.18*r + .3*v; P.lean = -.25*r + .3*v; P.sx = 1 + .15*v - .05*r; P.sy = 1 + .08*r - .08*v; break; }
    case 'raio': {                                          // inclina para trás carregando e dispara tremendo
      if (t < .32) { const k = t/.32; P.lean = -.3*k; P.sy = 1 + .1*k; P.sx = 1 - .05*k; }
      else { P.lean = .15; P.avanco = .08; P.treme = .04; P.sx = 1.08; P.sy = .95; } break; }
    case 'area': case 'nova': {                             // pula e bate no chão
      const s = _onda(t, 0, .35), q = _onda(t, .3, .55); P.pulo = .55*s; P.sy = 1 + .15*s - .25*q; P.sx = 1 - .08*s + .25*q; break; }
    case 'chuva': case 'tempestade': case 'meteoro': {     // empina e chama o golpe do céu
      const f = _onda(t, 0, 1); P.lean = -.35*f; P.pulo = .2*f; P.sy = 1 + .14*f; P.sx = 1 - .06*f; P.treme = t > .4 ? .02 : 0; break; }
    case 'buff': {                                          // pulsa de energia
      const p = Math.abs(Math.sin(t*Math.PI*4)); P.sy = 1 + .12*p; P.sx = 1 + .06*p; P.treme = .015; break; }
    default: { const f = _onda(t, 0, .6); P.avanco = .2*f; P.lean = .2*f; P.sx = 1 + .1*f; }
  }
  return P;
}
// todo quadro (fim de animarInstancia): quadro do GIF, frente/costas, espelhar, golpes, piscar, desmaio
function atualizarSprite(inst, dt, e){
  const S2 = inst.spr, placa = S2.spr, A = inst.altura, c = inst.corpo;
  // para onde o Pokémon olha, comparado com a câmera
  inst.raiz.getWorldQuaternion(_q); _fr.set(0, 0, 1).applyQuaternion(_q); _fr.y = 0; _fr.normalize();
  camera.getWorldDirection(_dirCam); _dirCam.y = 0; _dirCam.normalize();
  _dirDir.set(-_dirCam.z, 0, _dirCam.x);                     // direita da tela
  const longe = _fr.dot(_dirCam), lado = _fr.dot(_dirDir);
  const querCostas = S2.par.costas && (S2.costas ? longe > .2 : longe > .55);
  if (querCostas !== S2.costas) { S2.costas = querCostas; S2.folha = querCostas ? S2.par.costas : S2.par.frente;
    S2.mat.map.dispose(); S2.mat.map = texturaDa(S2.folha); S2.mat.emissiveMap = S2.mat.map; S2.mat.needsUpdate = true; S2.q %= S2.folha.n; medirSprite(inst); }
  // o desenho de frente olha para a esquerda da tela; o de costas, para a direita
  if (Math.abs(lado) > .12) S2.vira = S2.costas ? lado < 0 : lado > 0;
  const olhaDireita = S2.costas ? !S2.vira : S2.vira;        // para que lado da tela o Pokémon está olhando
  const fs = olhaDireita ? 1 : -1;

  // pose: o que o corpo do modelo faria + o extra do golpe, tudo suavizado
  const G = poseDoGolpe(e.ataque), ks = 1 - Math.exp(-dt*14);
  const anda = Math.min(1, inst.velSuave || 0), f = inst.fase || 0;
  const leanAlvo = ((inst.sm ? inst.sm.inclX : 0)*1.4 + G.lean - (e.dano || 0)*.3)*(e.voa ? 1 : 1) + Math.sin(f)*.06*anda;
  S2.lean += (leanAlvo - S2.lean)*ks;
  S2.avanco += (G.avanco*A - S2.avanco)*ks;
  S2.pulo += (G.pulo*A - S2.pulo)*ks;
  // posição: segue o corpo (pulo, voo, tremida) + avanço do golpe para a frente
  const passo = e.voa ? 0 : Math.abs(Math.sin(f))*.07*A*anda;
  const treme = (G.treme + (e.dano ? .03*e.dano : 0))*A*Math.sin(inst.t*75);
  S2.grupo.position.set(c.position.x + treme, c.position.y + passo + S2.pulo, c.position.z + S2.avanco);
  // gira só para os lados (fica em pé no chão) e olha para a câmera
  inst.raiz.getWorldPosition(_pw);
  const rumoMundo = Math.atan2(_fr.x, _fr.z), paraCam = Math.atan2(camera.position.x - _pw.x, camera.position.z - _pw.z);
  const desmaio = e.desmaio || 0;
  S2.grupo.rotation.set(0, paraCam - rumoMundo, 0);
  placa.rotation.set(0, 0, -fs*S2.lean + desmaio*1.45*-fs);
  // tamanho: altura do Pokémon × esticar/amassar do corpo e do golpe (o giro vira um "virar de lado")
  const giro = c.rotation.y, gx = Math.cos(giro);
  const sxC = (c.scale.x + c.scale.z)/2, syC = c.scale.y;
  placa.scale.set(S2.larg*sxC*G.sx*Math.max(.15, Math.abs(gx)), S2.alt*syC*G.sy, 1);
  if (inst.sombraSpr) { const k = 1/(1 + Math.max(0, S2.grupo.position.y)*.5); inst.sombraSpr.scale.set(Math.max(.8, inst.raio*2.2)*k*(1 + .3*Math.abs(S2.avanco)/A), Math.max(.8, inst.raio*2.2)*.7*k, 1);
    inst.sombraSpr.position.z = S2.avanco; inst.sombraSpr.visible = !e.voa; }

  // quadro atual (mais rápido correndo e atacando; parado no desmaio)
  const fo = S2.folha, ritmo = REGRAS_SPRITE.velAnim*(1 + anda*.7)*G.rapido*(desmaio ? 0 : 1);
  S2.tq += dt*ritmo;
  while (S2.tq > fo.delays[S2.q % fo.n]) { S2.tq -= fo.delays[S2.q % fo.n]; S2.q = (S2.q + 1) % fo.n; }
  const col = S2.q % fo.colunas, lin = Math.floor(S2.q/fo.colunas), t = S2.mat.map;
  const espelha = (gx < 0) !== S2.vira;
  t.repeat.x = (espelha ? -1 : 1)/fo.colunas; t.offset.x = (col + (espelha ? 1 : 0))/fo.colunas;
  t.offset.y = 1 - (lin + 1)/fo.linhas;
  // piscar ao levar dano, brilho ao atacar + cor da Mega sem sprite próprio
  const k = inst.flash || 0;
  S2.mat.color.copy(S2.cor); S2.mat.emissive.copy(S2.cor);
  S2.mat.emissiveIntensity = .42 + k*1.6 + (e.ataque ? .12 : 0);
  S2.mat.opacity = 1;
  placa.visible = !(desmaio > .98 && Math.floor(inst.t*8) % 2);
}
