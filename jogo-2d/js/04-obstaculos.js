/* =========================================================
   OBSTÁCULOS — desenho em pixel art e comportamento
   ========================================================= */
// hp = pode ser destruído; respawn = volta depois de x segundos; solta = item que cai; explode / campo / esporos = efeito ao quebrar
const OBJ = {
  cristal:  {hp:110, respawn:25, solta:'energia', quebra:'cristal'},
  rocha_q:  {hp:150, respawn:30, quebra:'pedra'},
  caixa:    {hp:70,  respawn:20, solta:'sorteio', quebra:'madeira'},
  barril:   {hp:45,  respawn:22, explode:{p:85, r:140, t:'fire'}, quebra:'madeira'},
  gerador:  {hp:60,  respawn:20, campo:{t:'electric', r:150, dur:3}, quebra:'metal'},
  cogumelo: {hp:15,  respawn:14, esporos:{r:115}, quebra:'esporo'},
  tronco:   {hp:220, respawn:35, queima:true, quebra:'madeira'},
  alavanca: {interruptor:true, cd:12}
};
// obstáculos compridos usam mais de um círculo de colisão: [dx, dy, raio relativo]
const PARTES = { tronco:[[-1,0,.85],[1,0,.85]], carro:[[-1.1,0,1],[1.1,0,1]], ruina:[[0,-1.2,.9],[0,1.2,.9]] };
const obstCache = {};
function obstSprite(tipo, r){
  const k = tipo + r; if (obstCache[k]) return obstCache[k];
  const wid = Math.ceil(r*5.6), hei = Math.ceil(r*(tipo === 'poste' ? 11 : 8));
  const c = document.createElement('canvas'); c.width = Math.ceil(wid/PXA); c.height = Math.ceil(hei/PXA);
  const g = c.getContext('2d'); g.scale(1/PXA, 1/PXA);
  const ox = wid/2, oy = hei - r*1.4;
  const sombra = (sx=1.25, sy=.5) => { g.fillStyle = '#0000004a'; g.beginPath(); g.ellipse(ox+8, oy+6, r*sx, r*sy, 0, 0, 7); g.fill(); };
  const blob = (x,y,rr,c1,c2) => { const rg = g.createRadialGradient(x-rr*.35, y-rr*.4, 1, x, y, rr); rg.addColorStop(0,c1); rg.addColorStop(1,c2); g.fillStyle = rg; g.beginPath(); g.arc(x,y,rr,0,7); g.fill(); };
  const rocha = (cor1, cor2, cor3, alt=1.7) => { g.fillStyle = cor1; g.beginPath(); g.moveTo(ox-r*1.1, oy); g.lineTo(ox-r*1.05, oy-r*.9*alt/1.7); g.lineTo(ox-r*.5, oy-r*1.6*alt/1.7); g.lineTo(ox+r*.4, oy-r*alt); g.lineTo(ox+r*1.1, oy-r*.9*alt/1.7); g.lineTo(ox+r*1.05, oy); g.closePath(); g.fill();
    g.fillStyle = cor2; g.beginPath(); g.moveTo(ox-r*1.05, oy-r*.9*alt/1.7); g.lineTo(ox-r*.5, oy-r*1.6*alt/1.7); g.lineTo(ox+r*.4, oy-r*alt); g.lineTo(ox+r*.1, oy-r*.8*alt/1.7); g.closePath(); g.fill();
    g.fillStyle = cor3; g.beginPath(); g.moveTo(ox-r*.5, oy-r*1.6*alt/1.7); g.lineTo(ox+r*.4, oy-r*alt); g.lineTo(ox, oy-r*1.35*alt/1.7); g.closePath(); g.fill(); };
  const cilindro = (cor1, cor2, cor3, alt) => { const lg = g.createLinearGradient(ox-r, 0, ox+r, 0); lg.addColorStop(0,cor1); lg.addColorStop(.35,cor3); lg.addColorStop(1,cor1);
    g.fillStyle = lg; g.fillRect(ox-r, oy-alt, r*2, alt); g.beginPath(); g.ellipse(ox, oy, r, r*.45, 0, 0, Math.PI); g.fill();
    g.fillStyle = cor2; g.beginPath(); g.ellipse(ox, oy-alt, r, r*.45, 0, 0, 7); g.fill(); };
  switch (tipo) {
    case 'pedestal': sombra(); cilindro('#7f879b','#eef0f5','#e1e4ec', r*1.5);
      g.fillStyle = '#d63a3a'; g.beginPath(); g.arc(ox, oy-r*1.5, r*.38, Math.PI, 0); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(ox, oy-r*1.5, r*.38, 0, Math.PI); g.fill();
      g.fillStyle = '#222'; g.fillRect(ox-r*.38, oy-r*1.5-2, r*.76, 4); break;
    case 'arvore': case 'arvore_flor': { sombra(1.6, .6);
      g.fillStyle = '#5b3a1e'; g.fillRect(ox-r*.3, oy-r*1.7, r*.6, r*1.7); g.fillStyle = '#44291a'; g.fillRect(ox+r*.05, oy-r*1.7, r*.25, r*1.7);
      const fl = tipo === 'arvore_flor';
      const c1 = fl ? '#ffc6e0' : '#6dbb47', c2 = fl ? '#d77aa8' : '#255f1b';
      blob(ox-r*.95, oy-r*2.2, r*1.05, c1, c2); blob(ox+r*.95, oy-r*2.2, r*1.05, c1, c2);
      blob(ox, oy-r*3.1, r*1.3, fl ? '#ffd9ea' : '#82cc56', c2); blob(ox, oy-r*2.0, r*1.1, c1, c2);
      for (let i=0;i<14;i++){ const a = hash2(i, r, 70)*7, rr = hash2(i, r, 71)*r*1.6; g.fillStyle = fl ? '#ffffff' : '#9adf6a'; g.fillRect(ox + Math.cos(a)*rr, oy - r*2.6 + Math.sin(a)*rr*.8, 4, 4); }
      break; }
    case 'arvore_torta': { sombra(1.5, .55);
      g.strokeStyle = '#3a2a1c'; g.lineWidth = r*.5; g.lineCap = 'round';
      g.beginPath(); g.moveTo(ox, oy); g.quadraticCurveTo(ox-r*.8, oy-r*1.2, ox-r*.2, oy-r*2.2); g.stroke();
      g.lineWidth = r*.22; for (const [dx,dy] of [[-1.2,-2.6],[.9,-2.8],[-.4,-3.2]]) { g.beginPath(); g.moveTo(ox-r*.2, oy-r*2.2); g.quadraticCurveTo(ox+dx*r*.5, oy+dy*r*.9, ox+dx*r, oy+dy*r); g.stroke(); }
      blob(ox-r*.9, oy-r*2.7, r*.8, '#4f6a3a', '#1f2e18'); blob(ox+r*.8, oy-r*2.9, r*.75, '#4f6a3a', '#1f2e18');
      g.fillStyle = '#7f9a5a'; for (let i=0;i<6;i++) g.fillRect(ox - r + i*r*.4, oy - r*2.1 + (i%2)*10, 3, r*.6); break; }
    case 'tronco': { g.fillStyle = '#0000004a'; g.beginPath(); g.ellipse(ox+6, oy+8, r*2.4, r*.6, 0, 0, 7); g.fill();
      g.fillStyle = '#6e4424'; g.fillRect(ox-r*2.1, oy-r*1.3, r*4.2, r*1.3);
      g.fillStyle = '#8a5a30'; g.fillRect(ox-r*2.1, oy-r*1.3, r*4.2, r*.4);
      g.fillStyle = '#c99a62'; g.beginPath(); g.ellipse(ox+r*2.1, oy-r*.65, r*.35, r*.65, 0, 0, 7); g.fill();
      g.strokeStyle = '#8a5a30'; g.lineWidth = 2; g.beginPath(); g.ellipse(ox+r*2.1, oy-r*.65, r*.18, r*.35, 0, 0, 7); g.stroke();
      g.fillStyle = '#4f8a3a'; g.fillRect(ox-r*1.2, oy-r*1.4, r*.9, 6); g.fillRect(ox+r*.4, oy-r*1.4, r*.5, 5); break; }
    case 'pedra_musgo': sombra(); rocha('#6b6f76','#8a8e95','#a3a7ad', 1.5); g.fillStyle = '#4f8a3a'; g.beginPath(); g.ellipse(ox-r*.2, oy-r*1.3, r*.6, r*.22, -.3, 0, 7); g.fill(); break;
    case 'rocha_q': sombra(); rocha('#6e655a','#8f8577','#aaa092', 1.5); g.strokeStyle = '#3e3830'; g.lineWidth = 2; g.beginPath(); g.moveTo(ox-r*.3, oy-r*1.3); g.lineTo(ox, oy-r*.7); g.lineTo(ox-r*.2, oy-r*.2); g.stroke(); break;
    case 'rocha_praia': sombra(); rocha('#8b8378','#a9a093','#c4bcae', 1.6); g.fillStyle = '#5c8a6a'; g.fillRect(ox-r*.8, oy-r*.25, r*1.6, 4); break;
    case 'basalto': sombra(); rocha('#211917','#33282a','#4a3a35', 1.8); g.strokeStyle = '#ff7a2a'; g.lineWidth = 3; g.beginPath(); g.moveTo(ox-r*.6, oy-r*.2); g.lineTo(ox-r*.2, oy-r*.7); g.lineTo(ox+r*.3, oy-r*.4); g.lineTo(ox+r*.6, oy-r*1.0); g.stroke(); break;
    case 'rocha_montanha': sombra(); rocha('#3a3e46','#555a64','#6e737e', 1.9); break;
    case 'cristal': { sombra(1.1, .45);
      const prism = (x, h, w, c) => { g.fillStyle = c; g.beginPath(); g.moveTo(x-w, oy); g.lineTo(x-w, oy-h); g.lineTo(x, oy-h-w*1.3); g.lineTo(x+w, oy-h); g.lineTo(x+w, oy); g.closePath(); g.fill();
        g.fillStyle = '#ffffff80'; g.beginPath(); g.moveTo(x-w, oy-h); g.lineTo(x, oy-h-w*1.3); g.lineTo(x, oy); g.lineTo(x-w, oy); g.closePath(); g.fill(); g.strokeStyle = '#e8fbff'; g.lineWidth = 2; g.stroke(); };
      prism(ox-r*.65, r*1.4, r*.4, '#6fc3ecc8'); prism(ox+r*.65, r*1.8, r*.42, '#6fc3ecc8'); prism(ox, r*2.5, r*.5, '#94daf6dd'); break; }
    case 'estalagmite': sombra(1, .4); g.fillStyle = '#6d8fa8'; g.beginPath(); g.moveTo(ox-r, oy); g.lineTo(ox-r*.2, oy-r*3); g.lineTo(ox+r, oy); g.closePath(); g.fill();
      g.fillStyle = '#a9cde3'; g.beginPath(); g.moveTo(ox-r*.5, oy); g.lineTo(ox-r*.2, oy-r*3); g.lineTo(ox, oy); g.closePath(); g.fill(); break;
    case 'palmeira': { sombra(1.6, .5);
      g.strokeStyle = '#9a6b3c'; g.lineWidth = r*.5; g.lineCap = 'round'; g.beginPath(); g.moveTo(ox, oy); g.quadraticCurveTo(ox+r*.9, oy-r*1.8, ox+r*.3, oy-r*3.6); g.stroke();
      g.strokeStyle = '#7a5230'; g.lineWidth = 2; for (let i=1;i<7;i++){ const yy = oy - i*r*.5; g.beginPath(); g.moveTo(ox + r*.1 + i*2, yy); g.lineTo(ox + r*.5 + i*2, yy); g.stroke(); }
      const tx = ox+r*.3, ty = oy-r*3.6;
      for (let i=0;i<7;i++){ const a = -Math.PI/2 + (i-3)*.55; g.strokeStyle = i%2 ? '#3f9a3a' : '#2c7a2a'; g.lineWidth = r*.38;
        g.beginPath(); g.moveTo(tx,ty); g.quadraticCurveTo(tx+Math.cos(a)*r*1.5, ty+Math.sin(a)*r*1.5-r*.4, tx+Math.cos(a)*r*2.4, ty+Math.sin(a)*r*1.3+r*.6); g.stroke(); }
      g.fillStyle = '#6b4a2a'; g.beginPath(); g.arc(tx-6, ty+7, 6, 0, 7); g.arc(tx+6, ty+9, 6, 0, 7); g.fill(); break; }
    case 'barril': sombra(1.1, .45); cilindro('#6e4424','#a8703a','#9a6334', r*1.6);
      g.strokeStyle = '#3a2412'; g.lineWidth = 4; for (const kk of [.4, 1.15]) { g.beginPath(); g.moveTo(ox-r, oy-r*kk); g.lineTo(ox+r, oy-r*kk); g.stroke(); }
      g.fillStyle = '#ffcf33'; g.beginPath(); g.moveTo(ox, oy-r*1.25); g.lineTo(ox+r*.35, oy-r*.6); g.lineTo(ox-r*.35, oy-r*.6); g.closePath(); g.fill(); g.fillStyle = '#222'; g.fillRect(ox-1.5, oy-r*1.05, 3, r*.25); break;
    case 'caixa': sombra(1.15, .45); g.fillStyle = '#9a6a3a'; g.fillRect(ox-r, oy-r*1.7, r*2, r*1.7); g.fillStyle = '#b98348'; g.fillRect(ox-r, oy-r*1.7, r*2, r*.35);
      g.strokeStyle = '#5e3e1e'; g.lineWidth = 3; g.strokeRect(ox-r, oy-r*1.7, r*2, r*1.7); g.beginPath(); g.moveTo(ox-r, oy-r*1.35); g.lineTo(ox+r, oy); g.moveTo(ox+r, oy-r*1.35); g.lineTo(ox-r, oy); g.stroke(); break;
    case 'coluna': sombra(); cilindro('#9c845c','#e4d2a8','#d7c08f', r*2.4); g.fillStyle = '#c2a873'; g.fillRect(ox-r*1.15, oy-r*2.4-6, r*2.3, 10); g.fillRect(ox-r*1.15, oy-8, r*2.3, 8); break;
    case 'coluna_q': sombra(); cilindro('#9c845c','#cbb486','#d7c08f', r*1.2); g.fillStyle = '#b39b6e'; g.beginPath(); g.moveTo(ox-r, oy-r*1.2); g.lineTo(ox-r*.3, oy-r*1.7); g.lineTo(ox+r*.4, oy-r*1.3); g.lineTo(ox+r, oy-r*1.45); g.lineTo(ox+r, oy-r*1.2); g.closePath(); g.fill();
      g.fillStyle = '#9c845c'; g.fillRect(ox+r*1.3, oy-r*.5, r*.9, r*.5); break;
    case 'estatua': { sombra(1.3, .5);
      g.fillStyle = '#8f8a80'; g.fillRect(ox-r*1.1, oy-r*.8, r*2.2, r*.8); g.fillStyle = '#a9a398'; g.fillRect(ox-r*1.1, oy-r*.8, r*2.2, r*.2);
      g.fillStyle = '#b8b2a6'; g.beginPath(); g.ellipse(ox, oy-r*1.7, r*.7, r*.9, 0, 0, 7); g.fill();
      g.beginPath(); g.arc(ox, oy-r*2.7, r*.5, 0, 7); g.fill();
      g.fillStyle = '#9d978b'; g.beginPath(); g.moveTo(ox-r*.5, oy-r*3); g.lineTo(ox-r*.75, oy-r*3.6); g.lineTo(ox-r*.25, oy-r*3.1); g.fill(); g.beginPath(); g.moveTo(ox+r*.5, oy-r*3); g.lineTo(ox+r*.75, oy-r*3.6); g.lineTo(ox+r*.25, oy-r*3.1); g.fill();
      g.fillStyle = '#67e0ff'; g.fillRect(ox-r*.25, oy-r*2.75, 5, 5); g.fillRect(ox+r*.15, oy-r*2.75, 5, 5);
      g.fillStyle = '#5f8a3a'; g.fillRect(ox-r*.9, oy-r*.85, r*.5, 5); break; }
    case 'ruina': { g.fillStyle = '#0000004a'; g.beginPath(); g.ellipse(ox+6, oy+6, r*1.2, r*2.4, 0, 0, 7); g.fill();
      for (let i=-2;i<=2;i++){ const hh = r*(1.1 + hash2(i, r, 72)*.7); g.fillStyle = '#a58c62'; g.fillRect(ox-r*.9, oy + i*r*.55 - hh, r*1.8, hh); g.fillStyle = '#c9b086'; g.fillRect(ox-r*.9, oy + i*r*.55 - hh, r*1.8, 6); }
      g.fillStyle = '#5f8a3a'; g.fillRect(ox-r*.9, oy - r*.4, 8, r*.8); break; }
    case 'alavanca': sombra(1, .4); g.fillStyle = '#6e6658'; g.fillRect(ox-r, oy-r*.8, r*2, r*.8); g.strokeStyle = '#3e3830'; g.lineWidth = 5; g.beginPath(); g.moveTo(ox, oy-r*.6); g.lineTo(ox+r*.7, oy-r*2.2); g.stroke();
      g.fillStyle = '#e04040'; g.beginPath(); g.arc(ox+r*.7, oy-r*2.2, r*.38, 0, 7); g.fill(); break;
    case 'carro': { g.fillStyle = '#0000004a'; g.beginPath(); g.ellipse(ox+6, oy+6, r*2.5, r*.9, 0, 0, 7); g.fill();
      const cor = ['#d63a3a','#3a7bd6','#e0b030','#2fa86a'][(r*7|0)%4];
      g.fillStyle = '#111'; for (const dx of [-1.5, 1.5]) for (const dy of [-.8, .05]) g.fillRect(ox + dx*r - 7, oy + dy*r - 4, 14, 10);
      g.fillStyle = cor; g.beginPath(); g.roundRect(ox-r*2.3, oy-r*1.4, r*4.6, r*1.5, 10); g.fill();
      g.fillStyle = '#9fd3ff'; g.fillRect(ox-r*.9, oy-r*1.3, r*1.6, r*.45); g.fillStyle = '#ffffff55'; g.fillRect(ox-r*2.2, oy-r*1.4, r*4.4, 4);
      g.fillStyle = '#fff7a8'; g.fillRect(ox+r*2.1, oy-r*1.1, 5, 7); g.fillRect(ox+r*2.1, oy-r*.5, 5, 7); break; }
    case 'gerador': sombra(1.1, .45); g.fillStyle = '#3c4250'; g.fillRect(ox-r, oy-r*2, r*2, r*2); g.fillStyle = '#566074'; g.fillRect(ox-r, oy-r*2, r*2, r*.4);
      g.fillStyle = '#ffd23f'; g.beginPath(); g.moveTo(ox+2, oy-r*1.6); g.lineTo(ox-r*.4, oy-r*.9); g.lineTo(ox, oy-r*.9); g.lineTo(ox-3, oy-r*.3); g.lineTo(ox+r*.4, oy-r*1.1); g.lineTo(ox, oy-r*1.1); g.closePath(); g.fill();
      g.fillStyle = '#29e3ff'; g.fillRect(ox-r*.8, oy-r*1.8, 5, 5); break;
    case 'maquina': sombra(1, .4); g.fillStyle = '#c62828'; g.fillRect(ox-r, oy-r*3, r*2, r*3); g.fillStyle = '#9fd3ff'; g.fillRect(ox-r*.75, oy-r*2.7, r*1.5, r*1.4);
      g.fillStyle = '#ffd23f'; for (let i=0;i<3;i++) g.fillRect(ox-r*.6 + i*r*.45, oy-r*2.4, r*.3, r*.3); g.fillStyle = '#222'; g.fillRect(ox-r*.5, oy-r*.8, r, r*.35); break;
    case 'poste': sombra(1.4, .4); g.fillStyle = '#2b2f3a'; g.fillRect(ox-4, oy-r*9, 8, r*9); g.fillRect(ox-4, oy-r*9, r*2.4, 6); g.fillStyle = '#fff3b0'; g.fillRect(ox+r*1.8, oy-r*8.8, 10, 8); break;
    case 'cogumelo': g.fillStyle = '#0000003a'; g.beginPath(); g.ellipse(ox+3, oy+3, r*1.1, r*.4, 0, 0, 7); g.fill();
      g.fillStyle = '#e8e0d0'; g.fillRect(ox-r*.3, oy-r*1.3, r*.6, r*1.3); g.fillStyle = '#7a3fd0'; g.beginPath(); g.ellipse(ox, oy-r*1.4, r*1.1, r*.7, 0, Math.PI, 0); g.fill();
      g.fillStyle = '#d6b8ff'; g.fillRect(ox-r*.5, oy-r*1.8, 4, 4); g.fillRect(ox+r*.3, oy-r*1.6, 4, 4); break;
    case 'para_raios': sombra(1.2, .45); g.fillStyle = '#4d525e'; g.fillRect(ox-r*.8, oy-r*1.2, r*1.6, r*1.2); g.fillStyle = '#9aa0ad'; g.fillRect(ox-3, oy-r*5, 6, r*3.8);
      g.fillStyle = '#d9c04a'; g.beginPath(); g.moveTo(ox, oy-r*5.8); g.lineTo(ox+6, oy-r*5); g.lineTo(ox-6, oy-r*5); g.closePath(); g.fill(); break;
    default: sombra(); cilindro('#8e95a8','#eef0f5','#d3d7e1', r*1.7);
  }
  return obstCache[k] = {c, ox, oy, w:wid, h:hei};
}


