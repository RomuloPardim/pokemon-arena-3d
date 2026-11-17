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

function atualizarCamera(dt){
  const P = lutador(0), Q = lutador(1);
  if (!P || !Q) return;
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
  CAM.lado = 1; CAM.cine = null; CAM.mistura = 0;
  CAM.pos.set(22, 9, 6); CAM.alvo.set(0, 1.5, 0);
  for (let i = 0; i < 60; i++) atualizarCamera(1/30);
}
