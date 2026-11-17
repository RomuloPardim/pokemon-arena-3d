"use strict";
/* =========================================================
   GOLPES-ASSINATURA — coreografia própria para golpes famosos
   Cada um segue as etapas: preparação (postura) → carregamento (energia) → execução → impacto → finalização.
   Para criar um novo: ASSINATURAS['Nome do Golpe'] = (L, g, alvo, dir) => { ... return true; }
   (usado em usarGolpe, batalha.js). Quem não tem assinatura usa o comportamento padrão do "jeito".
   ========================================================= */
const bocaDe = L => centroDe(L).add(new THREE.Vector3(0, L.altura*.3, 0)).addScaledVector(frenteDe(L), L.raio*.9);
const maosDe = L => centroDe(L).addScaledVector(frenteDe(L), L.raio + .7);

const ASSINATURAS = {
  // Charizard: abre as asas, inclina, junta chamas na boca e solta um jato enorme
  'Flamethrower'(L, g, alvo, dir){
    const e = estilo(g.tipo);
    L.ataque = { t: 0, dur: 1.3, jeito: 'raio' }; L.pose = { asas: true }; SOM.carga();
    const prep = new THREE.Object3D();
    efeito(prep, .5, (ef, k) => {
      const b = bocaDe(L);
      for (let i = 0; i < 3; i++) part(escolher(['chama0','chama1','chama2']), { x: b.x + rnd(-.5, .5), y: b.y + rnd(-.3, .4), z: b.z + rnd(-.5, .5), vx: rnd(-.5, .5), vy: rnd(1, 2), vz: rnd(-.5, .5), cor: i ? e.c1 : e.c2, tam: .35 + k*.3, vida: .3, cresce: 1 });
      clarao(e.c1, b.x, b.y, b.z, 2 + k*4, 7, .05);
      if (k >= 1) L.pose = null;
    });
    depois(.5, () => {
      if (!L.emCampo || !L.vivo || L.atordoado) return;
      jato(L, g, dir, .75); SOM.raio(); tremer(.12);
      for (let k = 0; k < 4; k++) depois(k*.17, () => { if (L.emCampo && !L.atordoado) { const f = frenteDe(L); tracarRaio(L, bocaDe(L), f, 12, g, .3); const b = bocaDe(L); clarao(e.c1, b.x + f.x*4, b.y, b.z + f.z*4, 8, 16, .2); } });
    });
    return true;
  },
  // Pikachu: descargas pelo corpo e um raio poderoso, ramificado
  'Thunderbolt'(L, g, alvo, dir){
    const e = estilo(g.tipo);
    L.ataque = { t: 0, dur: .9, jeito: 'raio' }; SOM.carga();
    const prep = new THREE.Object3D();
    efeito(prep, .38, () => {
      const c = centroDe(L);
      if (Math.random() < .6) zigueZague(c, c.clone().add(new THREE.Vector3(rnd(-1.2, 1.2), rnd(-.5, 1.4), rnd(-1.2, 1.2))), e.c1, .07, .25);
      soltar('electric', c.x, c.y, c.z, 2, 3, .3, .25); clarao(e.c1, c.x, c.y, c.z, 4, 7, .05);
    });
    depois(.38, () => {
      if (!L.emCampo || !L.vivo || L.atordoado) return;
      const o = centroDe(L).addScaledVector(dir, L.raio*.9);
      const fim = tracarRaio(L, o, dir, 17, g, 1);
      for (let k = 0; k < 5; k++) setTimeout(() => raioRamificado(o, fim, e.c1, 4 - k*.5, .14), k*55);
      flash('brilho', e.c1, fim.x, fim.y, fim.z, 5, .3, 0, .7);
      for (let k = 0; k < 18; k++) part('faisca', { x: fim.x, y: fim.y, z: fim.z, vx: rnd(-10, 10), vy: rnd(-2, 8), vz: rnd(-10, 10), cor: e.c1, tam: .35, vida: .4, grav: 10, atrito: 1, tingir: true, brilhar: true });
      SOM.raio(); tremer(.25); ondaDeChoque(fim, .6);
    });
    return true;
  },
  // Lucario: posiciona as mãos, a esfera azul cresce e é disparada
  'Aura Sphere'(L, g, alvo, dir){
    const e = estilo(g.tipo);
    L.ataque = { t: 0, dur: .95, jeito: 'projetil' }; L.pose = { bracosFrente: true }; SOM.carga();
    const bola = esferaEnergia(g.tipo); bola.scale.setScalar(.05);
    efeito(new THREE.Object3D(), .5, (ef, k) => {
      const m = maosDe(L); bola.position.copy(m); bola.scale.setScalar(.05 + k*.45); bola.userData.orbe.material.rotation += .2;
      const a = Math.random()*7, r = 1.4; part('brilho', { x: m.x + Math.cos(a)*r, y: m.y + rnd(-1, 1), z: m.z + Math.sin(a)*r, vx: -Math.cos(a)*r*4, vy: 0, vz: -Math.sin(a)*r*4, cor: e.c1, tam: .25, vida: .25, atrito: 0 });
      if (Math.random() < .15) flash('anel', e.c1, m.x, m.y, m.z, 1.5, .2);
    });
    depois(.5, () => {
      cena.remove(bola); L.pose = null;
      if (!L.emCampo || !L.vivo || L.atordoado) return;
      const A = inimigoDe(L), m = maosDe(L);
      const d = A ? new THREE.Vector3(A.pos.x, A.y + A.altura*.5, A.pos.z).sub(m).normalize() : dir;
      criarProjetil(L, Object.assign({}, g, { visual: 'orbe' }), m, d, 22, .62, { ondas: true });
      flash('anel', e.c1, m.x, m.y, m.z, 2.5, .25); SOM.tiro(); tremer(.1);
    });
    return true;
  },
  // Gengar: esfera sombria com fumaça roxa e fragmentos girando
  'Shadow Ball'(L, g, alvo, dir){
    L.ataque = { t: 0, dur: .85, jeito: 'projetil' }; L.pose = { bracosFrente: true }; SOM.carga();
    const bola = esferaEnergia(g.tipo);
    efeito(new THREE.Object3D(), .42, (ef, k) => {
      const m = maosDe(L); bola.position.copy(m); bola.scale.setScalar(.1 + k*.4);
      FUMACA.add({ x: m.x + rnd(-.5, .5), y: m.y + rnd(-.5, .5), z: m.z + rnd(-.5, .5), vx: 0, vy: rnd(.5, 1.5), vz: 0, cor: 0x2a1240, tam: .7, vida: .5, cel: 'fumaca0', cresce: 1 });
      const a = ef.t*12; part('estilhaco', { x: m.x + Math.cos(a)*.8, y: m.y + Math.sin(a*1.3)*.5, z: m.z + Math.sin(a)*.8, vx: 0, vy: 0, vz: 0, cor: 0x8a52d6, tam: .3, vida: .15, tingir: true });
    });
    depois(.42, () => {
      cena.remove(bola); L.pose = null;
      if (!L.emCampo || !L.vivo || L.atordoado) return;
      const A = inimigoDe(L), m = maosDe(L);
      const d = A ? new THREE.Vector3(A.pos.x, A.y + A.altura*.5, A.pos.z).sub(m).normalize() : dir;
      criarProjetil(L, g, m, d, 20, .62, { sombra: true }); SOM.tiro();
    });
    return true;
  },
  // Garchomp: concentra energia dracônica e avança com um grande rastro
  'Dragon Rush'(L, g, alvo, dir){
    L.ataque = { t: 0, dur: .75, jeito: 'investida' }; SOM.carga();
    auraCorpo(L, 'dragon', .35, 2);
    L.pose = { incl: .35 };
    depois(.32, () => {
      L.pose = null;
      if (!L.emCampo || !L.vivo || L.atordoado) return;
      const A = inimigoDe(L), d = A ? new THREE.Vector3(A.pos.x - L.pos.x, 0, A.pos.z - L.pos.z).normalize() : dir;
      L.rumo = Math.atan2(d.x, d.z);
      L.dash = { t: .38, dx: d.x, dz: d.z, v: 27, g: Object.assign({}, g, { dragao: true }), acertou: false };
      L.inv = Math.max(L.inv, .2); auraCorpo(L, 'dragon', .4, 3); SOM.investida();
    });
    return true;
  },
};
