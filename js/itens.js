"use strict";
/* =========================================================
   MINI PODERES NO MAPA (V15) — iguais aos do jogo 2D
   De tempos em tempos aparece um item flutuando na arena. Quem passar
   por cima (no chão) pega. Somem depois de 25 s (piscam no fim).
   ========================================================= */
const ITENS_3D = {
  oran:    { nome: 'FRUTA ORAN',   cor: 0x3b7bff, icone: '🫐', texto: 'cura 25% da vida' },
  ataque:  { nome: 'ATAQUE X',     cor: 0xff4d6a, icone: '⚔',  texto: '+30% de dano por 8 s' },
  veloz:   { nome: 'VELOCIDADE X', cor: 0xffd23f, icone: '➤',  texto: '+30% de velocidade por 8 s' },
  escudo:  { nome: 'ESCUDO',       cor: 0x9cf0ff, icone: '⛨',  texto: 'bloqueia o próximo golpe' },
  energia: { nome: 'ENERGIA',      cor: 0xffb300, icone: '⚡', texto: '+40 de energia da Ultimate' },
};
const SORTEIO_ITENS_3D = ['oran', 'oran', 'ataque', 'veloz', 'escudo', 'energia'];
const REGRAS_ITENS = { primeiro: 9, intervalo: [11, 17], maximo: 2, duracao: 25, buff: 8 };

const ITENS_MAPA = { lista: [], timer: REGRAS_ITENS.primeiro };
const _texItem = {};
// ícone do item: círculo colorido com o símbolo (desenhado em canvas, sem imagens)
function texturaItem(tipo){
  if (_texItem[tipo]) return _texItem[tipo];
  const I = ITENS_3D[tipo], c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d'), cor = '#' + I.cor.toString(16).padStart(6, '0');
  const gr = g.createRadialGradient(64, 54, 6, 64, 64, 60); gr.addColorStop(0, '#ffffff'); gr.addColorStop(.35, cor); gr.addColorStop(1, '#0b1020');
  g.fillStyle = gr; g.beginPath(); g.arc(64, 64, 58, 0, 7); g.fill();
  g.lineWidth = 6; g.strokeStyle = '#ffffff'; g.stroke();
  g.font = 'bold 64px "Segoe UI Emoji", "Apple Color Emoji", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = '#ffffff'; g.shadowColor = '#000'; g.shadowBlur = 8; g.fillText(I.icone, 64, 68);
  const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding;
  return (_texItem[tipo] = t);
}

function lugarLivreItem(){
  for (let k = 0; k < 30; k++) {
    const a = Math.random()*Math.PI*2, r = rnd(3, RAIO_ARENA - 4), x = Math.cos(a)*r, z = Math.sin(a)*r;
    if (ARENA.obstaculos.some(o => o.vivo && Math.hypot(o.x - x, o.z - z) < o.raio + 1.5)) continue;
    if (JOGO.times.some(t => t.some(L => L.emCampo && Math.hypot(L.pos.x - x, L.pos.z - z) < 4))) continue;
    if (ITENS_MAPA.lista.some(i => Math.hypot(i.x - x, i.z - z) < 5)) continue;
    return { x, z };
  }
  return { x: rnd(-6, 6), z: rnd(-6, 6) };
}

function criarItemMapa(tipo, x, z){
  const I = ITENS_3D[tipo], g = new THREE.Group();
  const icone = new THREE.Sprite(new THREE.SpriteMaterial({ map: texturaItem(tipo), depthWrite: false }));
  icone.scale.setScalar(1.1); icone.position.y = 1.2; g.add(icone);
  const halo = spriteFx('brilho', I.cor, 2.6, true); halo.position.y = 1.2; g.add(halo);
  const anel = new THREE.Mesh(new THREE.RingGeometry(.55, .75, 32), new THREE.MeshBasicMaterial({ color: I.cor, transparent: true, opacity: .8, depthWrite: false, side: THREE.DoubleSide }));
  anel.rotation.x = -Math.PI/2; anel.position.y = .06; g.add(anel);
  const coluna = new THREE.Mesh(new THREE.CylinderGeometry(.35, .5, 3, 16, 1, true), new THREE.MeshBasicMaterial({ color: I.cor, transparent: true, opacity: .18, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
  coluna.position.y = 1.5; g.add(coluna);
  g.position.set(x, 0, z); cena.add(g);
  onda(x, z, 2.5, I.cor, .5); soltar('normal', x, 1, z, 12, 3, .3, .5);
  const it = { tipo, x, z, t: 0, g, icone, halo, anel, coluna };
  ITENS_MAPA.lista.push(it);
  return it;
}
function removerItemMapa(it){
  cena.remove(it.g);
  it.g.traverse(o => { if (o.material) o.material.dispose(); if (o.geometry && o.geometry !== GEO.esfera) o.geometry.dispose(); });
  ITENS_MAPA.lista.splice(ITENS_MAPA.lista.indexOf(it), 1);
}
function limparItensMapa(){
  for (const it of [...ITENS_MAPA.lista]) removerItemMapa(it);
  ITENS_MAPA.timer = REGRAS_ITENS.primeiro;
}

function pegarItem(L, it){
  const I = ITENS_3D[it.tipo], cor = '#' + I.cor.toString(16).padStart(6, '0');
  if (it.tipo === 'oran') { const cura = Math.round(L.hpMax*.25); L.hp = Math.min(L.hpMax, L.hp + cura); numeroDano('+' + cura, centroDe(L).setY(L.y + L.altura + .6), 'buff'); }
  if (it.tipo === 'ataque') L.itemAtkT = REGRAS_ITENS.buff;
  if (it.tipo === 'veloz') L.itemVelT = REGRAS_ITENS.buff;
  if (it.tipo === 'escudo') { L.escudo = true; criarBolhaEscudo(L); }
  if (it.tipo === 'energia') L.en = Math.min(100, L.en + 40);
  avisoCombate(L.time, I.nome + '!', cor);
  const c = new THREE.Vector3(it.x, 1.2, it.z);
  flash('anel', I.cor, it.x, .1, it.z, 3, .35); clarao(I.cor, c.x, c.y, c.z, 5, 8, .3);
  for (let k = 0; k < 16; k++) { const a = k/16*Math.PI*2;
    part('faisca', { x: c.x, y: c.y, z: c.z, vx: Math.cos(a)*5, vy: rnd(1, 5), vz: Math.sin(a)*5, cor: I.cor, tam: .35, vida: .5, atrito: 2, brilhar: true }); }
  SOM.buff ? SOM.buff() : SOM.menu();
  vibrarTime(L.time, .4, 120);
  removerItemMapa(it);
  atualizarPaineis(true);
}

// bolha transparente em volta de quem tem escudo
function criarBolhaEscudo(L){
  if (L.bolha) return;
  const m = new THREE.Mesh(GEO.esfera, new THREE.MeshBasicMaterial({ color: 0x9cf0ff, transparent: true, opacity: .22, depthWrite: false, blending: THREE.AdditiveBlending }));
  cena.add(m); L.bolha = m;
}
function quebrarEscudo(L){
  L.escudo = false;
  const c = centroDe(L);
  flash('anel', 0x9cf0ff, c.x, c.y, c.z, L.altura*2.2, .35); soltar('ice', c.x, c.y, c.z, 20, 6, .3, .5);
  avisoCombate(L.time, 'BLOQUEADO!', '#9cf0ff'); SOM.bloqueio && SOM.bloqueio();
  if (L.bolha) { cena.remove(L.bolha); L.bolha.material.dispose(); L.bolha = null; }
}

// chamado todo quadro na luta (main.js)
function atualizarItensMapa(dt){
  // aparece um item novo de vez em quando
  if (!JOGO.fim && !JOGO.finalizando && JOGO.intro <= 0) {
    ITENS_MAPA.timer -= dt;
    if (ITENS_MAPA.timer <= 0) {
      ITENS_MAPA.timer = rnd(...REGRAS_ITENS.intervalo);
      if (ITENS_MAPA.lista.length < REGRAS_ITENS.maximo) { const p = lugarLivreItem(); criarItemMapa(escolher(SORTEIO_ITENS_3D), p.x, p.z); }
    }
  }
  for (const it of [...ITENS_MAPA.lista]) {
    it.t += dt;
    const sobe = Math.sin(it.t*3)*.15;
    it.icone.position.y = it.halo.position.y = 1.2 + sobe;
    it.anel.rotation.z += dt*1.5; it.anel.scale.setScalar(1 + Math.sin(it.t*4)*.08);
    const piscar = it.t > REGRAS_ITENS.duracao - 4 ? (Math.floor(it.t*8) % 2 ? .25 : 1) : 1;
    it.icone.material.opacity = piscar; it.halo.material.opacity = .55*piscar;
    if (it.t > REGRAS_ITENS.duracao) { removerItemMapa(it); continue; }
    // quem está no chão e passa por cima pega
    const quem = JOGO.times.flat().find(L => L.emCampo && L.vivo && !L.assistindo && L.y < 1.2 && Math.hypot(L.pos.x - it.x, L.pos.z - it.z) < L.raio + .8);
    if (quem) pegarItem(quem, it);
  }
  // tempo dos bônus de quem pegou
  for (const t of [0, 1]) for (const L of JOGO.times[t]) {
    if (L.itemAtkT > 0) { L.itemAtkT -= dt; if (L.emCampo && Math.random() < dt*6) auraCorpo(L, 'fire', .35, .4); }
    if (L.itemVelT > 0) { L.itemVelT -= dt; if (L.emCampo && Math.random() < dt*6) auraCorpo(L, 'electric', .35, .4); }
    if (L.bolha) {
      L.bolha.visible = L.emCampo;
      const c = centroDe(L); L.bolha.position.copy(c); L.bolha.scale.setScalar(Math.max(1, L.altura*.75)*(1 + Math.sin(JOGO.tempo*6)*.03));
    }
  }
}
// tira as bolhas de escudo da cena (fim da luta)
function limparBonusItens(){
  for (const t of [0, 1]) for (const L of JOGO.times[t]) if (L.bolha) { cena.remove(L.bolha); L.bolha.material.dispose(); L.bolha = null; }
}
