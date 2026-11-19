"use strict";
/* =========================================================
   CÂMERA DE COMBATE (estilo Ultimate Ninja Storm)
   - Fica de lado em relação à linha entre os dois lutadores, um pouco atrás do Jogador 1
   - Afasta quando eles se separam, aproxima no corpo a corpo
   - Lado contínuo: não "pula" para o outro lado quando os lutadores trocam de posição
   - Cinemática (Ultimates): outra câmera assume com transição suave
   ========================================================= */
const CAM = {
  pos: new THREE.Vector3(0, 8, 24), alvo: new THREE.Vector3(0, 1, 0),
  lado: 1,              // de que lado da linha entre os lutadores a câmera está (+1 / -1)
  yaw: 0,               // para onde a câmera olha (os comandos de andar são relativos a isso)
  zoom: 0,              // aproximação rápida em golpes decisivos
  cine: null,           // { pos, alvo } vindo de ultimates.js
  mistura: 0,           // 0 = câmera de combate, 1 = câmera da cinemática
};
const _cm = new THREE.Vector3(), _cn = new THREE.Vector3(), _cp = new THREE.Vector3(), _ca = new THREE.Vector3();

/* ----- V20: câmera "seguir" (atrás do seu Pokémon, olhando para o rival) -----
   Usada quando só há 1 jogador humano (1 Jogador, Treinamento, Torneio/Aleatória contra a CPU).
   Configurações → Câmera muda para a lateral clássica. */
const SEGUIR = { atras: 4.2, porAltura: 1.25, cima: 2.3, ombro: .7, ombroAltura: .55, olharRival: .7, suave: 6, giro: 5 };
function timeHumanoUnico(){
  if (!JOGO.controle) return -1;
  const h = [0, 1].filter(t => JOGO.controle[t] === 'jogador');
  return h.length === 1 ? h[0] : -1;
}
const usarCameraSeguir = () => (typeof S === 'undefined' || S.camera !== 'classica') && timeHumanoUnico() >= 0;
function alvoCameraSeguir(dt, P, Q){
  // direção do rival para o meu Pokémon: a câmera fica "atrás" dessa linha
  let dx = P.pos.x - Q.pos.x, dz = P.pos.z - Q.pos.z; const dist = Math.hypot(dx, dz);
  const yawQuer = dist > 1.2 ? Math.atan2(dx, dz) : (CAM.yawSeg ?? Math.atan2(dx, dz));
  if (CAM.yawSeg === undefined) CAM.yawSeg = yawQuer;
  let dy = yawQuer - CAM.yawSeg; while (dy > Math.PI) dy -= Math.PI*2; while (dy < -Math.PI) dy += Math.PI*2;
  // gira mais rápido quando o rival passa pelo lado (não perde ele de vista), devagar no resto
  CAM.yawSeg += dy*(1 - Math.exp(-dt*SEGUIR.giro*(1 + Math.abs(dy)*1.5)));
  const ux = Math.sin(CAM.yawSeg), uz = Math.cos(CAM.yawSeg), rx = uz, rz = -ux;      // atrás e "direita" da câmera
  const A = P.altura, longe = (SEGUIR.atras + A*SEGUIR.porAltura + Math.min(6, dist*.12))*(1 - CAM.zoom*.25);
  const yP = P.y*.75;                                                     // voando, a câmera sobe junto (um pouco menos)
  _cp.set(P.pos.x + ux*longe + rx*(SEGUIR.ombro + A*SEGUIR.ombroAltura), yP + SEGUIR.cima + A*1.2 + longe*.16, P.pos.z + uz*longe + rz*(SEGUIR.ombro + A*SEGUIR.ombroAltura));
  // olha para um ponto entre o meu Pokémon e o rival (o rival fica no meio da tela, eu embaixo)
  const k = THREE.MathUtils.clamp(SEGUIR.olharRival*(dist > 2 ? 1 : dist/2), 0, .6);
  _cm.set(P.pos.x + (Q.pos.x - P.pos.x)*k, yP*.9 + A*.62 + (Q.y + Q.altura*.5 - (P.y + A*.5))*k*.6, P.pos.z + (Q.pos.z - P.pos.z)*k);
  // não atravessa a borda do estádio
  const r = Math.hypot(_cp.x, _cp.z), lim = RAIO_ARENA + 1.2;
  if (r > lim) { _cp.x *= lim/r; _cp.z *= lim/r; _cp.y += (r - lim)*.5; }
  if (_cp.y < .8) _cp.y = .8;
  const kp = 1 - Math.exp(-dt*(JOGO.cineAtiva ? 2 : SEGUIR.suave)), ka = 1 - Math.exp(-dt*(SEGUIR.suave + 3));
  CAM.pos.lerp(_cp, kp); CAM.alvo.lerp(_cm, ka);
}
function atualizarCamera(dt){
  let P = lutador(0), Q = lutador(1);
  if (!P || !Q) return;
  const th = usarCameraSeguir() ? timeHumanoUnico() : -1;
  if (th >= 0) { if (th === 1) { const x = P; P = Q; Q = x; } CAM.zoom = Math.max(0, CAM.zoom - dt*2.5); alvoCameraSeguir(dt, P, Q); }
  else {
  CAM.yawSeg = undefined;
  // ----- câmera de combate -----
  const a = P.pos, b = Q.pos;
  const dx = b.x - a.x, dz = b.z - a.z, dist = Math.max(.1, Math.hypot(dx, dz));
  const ux = dx/dist, uz = dz/dist;               // de P para Q
  // perpendicular (lado da câmera): escolhe o lado mais perto de onde a câmera já está (continuidade)
  let nx = -uz, nz = ux;
  const mx = (a.x + b.x)/2, mz = (a.z + b.z)/2;
  if ((CAM.pos.x - mx)*nx*CAM.lado + (CAM.pos.z - mz)*nz*CAM.lado < 0 && dist > 2) CAM.lado *= -1;
  nx *= CAM.lado; nz *= CAM.lado;
  const atras = .42;                               // um pouco atrás do Jogador 1
  let ox = nx - ux*atras, oz = nz - uz*atras; const ol = Math.hypot(ox, oz); ox /= ol; oz /= ol;
  CAM.zoom = Math.max(0, CAM.zoom - dt*2.5);
  const longe = THREE.MathUtils.clamp(dist*.78 + 6.5, 8.5, 27)*(1 - CAM.zoom*.3);
  const alturaMedia = (P.y + Q.y)/2;
  _cm.set(mx, 1.2 + alturaMedia*.7 + Math.max(P.altura, Q.altura)*.35, mz);
  _cp.set(mx + ox*longe, _cm.y + 2.2 + longe*.27, mz + oz*longe);
  // não sai do estádio: se passar da borda, sobe e chega mais perto
  const r = Math.hypot(_cp.x, _cp.z), lim = RAIO_ARENA + 1.5;
  if (r > lim) { _cp.x *= lim/r; _cp.z *= lim/r; _cp.y += (r - lim)*.6; }
  const k = 1 - Math.exp(-dt*(JOGO.cineAtiva ? 2 : 5));
  CAM.pos.lerp(_cp, k); CAM.alvo.lerp(_cm, 1 - Math.exp(-dt*7));
  }

  // ----- mistura com a cinemática -----
  CAM.mistura += ((CAM.cine ? 1 : 0) - CAM.mistura)*(1 - Math.exp(-dt*(CAM.cine ? 6 : 3)));
  if (CAM.cine) { CAM._cineP = (CAM._cineP || new THREE.Vector3()).copy(CAM.cine.pos); CAM._cineA = (CAM._cineA || new THREE.Vector3()).copy(CAM.cine.alvo); }
  const m = CAM.mistura;
  if (m > .001 && CAM._cineP) { _cp.copy(CAM.pos).lerp(CAM._cineP, m); _ca.copy(CAM.alvo).lerp(CAM._cineA, m); }
  else { _cp.copy(CAM.pos); _ca.copy(CAM.alvo); }
  camera.position.copy(_cp);
  if (FX.tremor > 0) { camera.position.x += rnd(-1, 1)*FX.tremor*.22; camera.position.y += rnd(-1, 1)*FX.tremor*.22; FX.tremor = Math.max(0, FX.tremor - dt*2.5); }
  camera.lookAt(_ca);
  if (CAM.cine && CAM.cine.fov) { camera.fov += (CAM.cine.fov - camera.fov)*(1 - Math.exp(-dt*5)); camera.updateProjectionMatrix(); }
  else if (Math.abs(camera.fov - camera.userData.fov0) > .1) { camera.fov += (camera.userData.fov0 - camera.fov)*(1 - Math.exp(-dt*4)); camera.updateProjectionMatrix(); }
  CAM.yaw = Math.atan2(camera.position.x - _ca.x, camera.position.z - _ca.z);
  // obstáculos na frente de qualquer um dos dois ficam transparentes
  transparenciaObstaculos([P, Q]);
}
// aproximação rápida (golpe decisivo)
function zoomImpacto(forca = 1){ CAM.zoom = Math.min(1, CAM.zoom + forca); }
// posiciona a câmera instantaneamente (início da luta)
function cameraInicial(){
  const P = lutador(0), Q = lutador(1); if (!P || !Q) return;
  CAM.lado = 1; CAM.cine = null; CAM.mistura = 0; CAM.yawSeg = undefined;
  CAM.pos.set(22, 9, 6); CAM.alvo.set(0, 1.5, 0);
  for (let i = 0; i < 60; i++) atualizarCamera(1/30);
}
