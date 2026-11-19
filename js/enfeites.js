"use strict";
/* =========================================================
   V20: EFEITOS MAIS ENFEITADOS (inspirados no PokeBrawl/Cobblemon)
   Camada extra por cima dos efeitos que já existiam — tudo usa o mesmo lote de partículas da GPU,
   então o custo é baixo. Cada parte respeita a qualidade (QUAL.particulas).
   - cargaBrilhante: energia sendo puxada para a boca/mão antes de soltar o golpe especial
   - brilhoProjetil: purpurina cintilante que fica no caminho do projétil
   - impactoEnfeitado: estrela de luz + faíscas esticadas + purpurina subindo no acerto
   - fluxoFeixe: faíscas correndo ao longo do raio, da boca até o alvo
   Ajuste a quantidade em ENFEITE (1 = padrão).
   ========================================================= */
const ENFEITE = { carga: 1, purpurina: 1, impacto: 1, feixe: 1 };
const qtdEnf = (n, k) => Math.max(0, Math.round(n*k*QUAL.particulas));
const CORES_EXTRA = { fire: 0xffe08a, water: 0xd8f2ff, electric: 0xffffc0, ice: 0xffffff, psychic: 0xffd0ef, fairy: 0xfff0fb, dragon: 0xc8e8ff, ghost: 0xd8b8ff, dark: 0xff90b0 };
const corClara = tipo => CORES_EXTRA[tipo] || 0xffffff;

// purpurina: estrelinhas que piscam e somem devagar
function purpurina(tipo, x, y, z, n, espalha = .5, forca = 1, vida = .7){
  const e = estilo(tipo);
  for (let i = 0; i < n; i++) {
    part(Math.random() < .55 ? 'estrela' : 'faisca', { x: x + rnd(-espalha, espalha), y: y + rnd(-espalha, espalha), z: z + rnd(-espalha, espalha),
      vx: rnd(-1, 1)*forca, vy: rnd(-.2, 1.2)*forca, vz: rnd(-1, 1)*forca, cor: Math.random() < .4 ? corClara(tipo) : (Math.random() < .5 ? e.c1 : e.c2),
      tam: rnd(.18, .38), vida: vida*rnd(.6, 1.3), atrito: 2.2, cresce: -.5, vrot: rnd(-8, 8), tingir: true, brilhar: true });
  }
}
// energia sendo puxada para o ponto de onde o golpe vai sair (antes de disparar)
function cargaBrilhante(L, tipo, dur = .3){
  const n = qtdEnf(3, ENFEITE.carga); if (!n || !L.inst) return;
  const e = estilo(tipo);
  const ancora = new THREE.Object3D(); cena.add(ancora);
  const brilho = spriteFx('brilho', e.c1, .2, true); cena.add(brilho);
  efeito(ancora, dur, (ef, k) => {
    const f = frenteDe(L), p = centroDe(L).addScaledVector(f, L.raio*1.1 + .2);
    brilho.position.copy(p); brilho.scale.setScalar(L.altura*(.3 + k*.9)); brilho.material.opacity = .8*(k < .85 ? 1 : (1 - k)/.15);
    for (let i = 0; i < n; i++) {
      const a = Math.random()*Math.PI*2, b = rnd(-1, 1), r = L.altura*rnd(.9, 1.6);
      const ox = Math.cos(a)*Math.cos(b)*r, oy = Math.sin(b)*r, oz = Math.sin(a)*Math.cos(b)*r;
      part(Math.random() < .5 ? 'faisca' : 'estrela', { x: p.x + ox, y: p.y + oy, z: p.z + oz, vx: -ox*4, vy: -oy*4, vz: -oz*4,
        cor: Math.random() < .5 ? e.c2 : corClara(tipo), tam: rnd(.15, .3), vida: .24, atrito: 0, cresce: -.6, tingir: true, brilhar: true });
    }
    if (k >= 1) { cena.remove(brilho); brilho.material.dispose(); cena.remove(ancora); }
  });
}
// a cada quadro de um projétil
function brilhoProjetil(P, dt){
  P._purp = (P._purp || 0) + dt*24*ENFEITE.purpurina*QUAL.particulas*(P.raio > .8 ? 1.6 : 1);
  if (P._purp < 1) return;
  const n = Math.floor(P._purp); P._purp -= n;
  purpurina(P.g.tipo, P.pos.x, P.pos.y, P.pos.z, n, P.raio*.8, .8, .6);
}
// acerto: estrela de luz, faíscas esticadas para fora e purpurina subindo
function impactoEnfeitado(tipo, x, y, z, raio = 1){
  const e = estilo(tipo), n = qtdEnf(14, ENFEITE.impacto);
  if (!n) return;
  flash('brilho', 0xffffff, x, y, z, raio*3.2, .12, 0, .95);
  flash('brilho', e.c1, x, y, z, raio*5.5, .3, 0, .7);
  flash('impact', e.c2, x, y, z, raio*3.6, .22, rnd(0, 6), .9);
  for (let i = 0; i < n; i++) {
    const a = Math.random()*Math.PI*2, b = rnd(-.5, 1), f = rnd(9, 16)*Math.min(1.6, .6 + raio*.5);
    part('listra', { x, y, z, vx: Math.cos(a)*Math.cos(b)*f, vy: Math.sin(b)*f, vz: Math.sin(a)*Math.cos(b)*f,
      cor: Math.random() < .5 ? corClara(tipo) : e.c1, tam: rnd(.3, .55)*Math.max(.8, raio*.7), vida: rnd(.18, .3), atrito: 6, cresce: -.3, tingir: true, brilhar: true });
  }
  purpurina(tipo, x, y, z, qtdEnf(10, ENFEITE.impacto), raio*.6, 2.2, .9);
  if (y < 1.2) onda(x, z, raio*2.4, e.c1, .35);
}
// golpe corpo a corpo acertando (menor)
function faiscaCombo(tipo, x, y, z, forte){
  const e = estilo(tipo || 'normal'), n = qtdEnf(forte ? 10 : 6, ENFEITE.impacto);
  flash('brilho', 0xffffff, x, y, z, forte ? 2.4 : 1.5, .1, 0, .9);
  for (let i = 0; i < n; i++) { const a = Math.random()*Math.PI*2, b = rnd(-.4, .9), f = rnd(7, 12);
    part('listra', { x, y, z, vx: Math.cos(a)*Math.cos(b)*f, vy: Math.sin(b)*f, vz: Math.sin(a)*Math.cos(b)*f, cor: Math.random() < .5 ? 0xffffff : e.c2, tam: rnd(.22, .4), vida: .18, atrito: 7, tingir: true, brilhar: true }); }
}
// faíscas correndo ao longo do raio (chamado a cada quadro do feixe)
function fluxoFeixe(tipo, de, ate, largura, w){
  const n = qtdEnf(3, ENFEITE.feixe); if (!n || w < .2) return;
  const e = estilo(tipo), dir = ate.clone().sub(de), comp = dir.length(); dir.normalize();
  for (let i = 0; i < n; i++) {
    const p = de.clone().addScaledVector(dir, Math.random()*comp), v = rnd(14, 24);
    const a = Math.random()*Math.PI*2, off = largura*rnd(.4, 1.1);
    part(Math.random() < .7 ? 'faisca' : 'estrela', { x: p.x + Math.cos(a)*off, y: p.y + Math.sin(a)*off, z: p.z + Math.sin(a*1.3)*off,
      vx: dir.x*v, vy: dir.y*v, vz: dir.z*v, cor: Math.random() < .5 ? corClara(tipo) : e.c2, tam: rnd(.2, .4)*Math.max(1, largura), vida: .2, atrito: 1, tingir: true, brilhar: true });
  }
  if (Math.random() < .5*QUAL.particulas) purpurina(tipo, de.x, de.y, de.z, 2, largura*.6, 2, .5);
}
