"use strict";
/* Recursos de experiência no navegador mobile. */
if (DISPOSITIVO_MOVEL) {
  document.documentElement.classList.add('dispositivo-movel');
  // Jogos travados por perda de foco devem liberar botões de toque.
  document.addEventListener('visibilitychange', () => { if (document.hidden) limparToqueMobile(); });
  // Não forçamos orientação: Safari iOS não permite bloquear landscape.
}
/* Botão "Tela cheia" da pausa: some onde o navegador não deixa (iPhone) */
const btnTelaCheia = document.getElementById('btnTelaCheia');
const raiz = document.documentElement;
const pedirTelaCheia = raiz.requestFullscreen || raiz.webkitRequestFullscreen;
const emTelaCheia = () => document.fullscreenElement || document.webkitFullscreenElement;
btnTelaCheia.classList.toggle('hidden', !pedirTelaCheia);
btnTelaCheia.onclick = () => {
  if (emTelaCheia()) { (document.exitFullscreen || document.webkitExitFullscreen).call(document); return; }
  const pedido = pedirTelaCheia.call(raiz);
  if (pedido && pedido.then) pedido.then(() => {
    if (screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(() => {});
  }).catch(() => {});
};
document.addEventListener('fullscreenchange', () => { btnTelaCheia.textContent = emTelaCheia() ? 'Sair da tela cheia' : 'Tela cheia'; });
