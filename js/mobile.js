"use strict";
/* Recursos de experiência no navegador mobile. */
if (DISPOSITIVO_MOVEL) {
  document.documentElement.classList.add('dispositivo-movel');
  // Jogos travados por perda de foco devem liberar botões de toque.
  document.addEventListener('visibilitychange', () => { if (document.hidden) limparToqueMobile(); });
  // Não forçamos orientação: Safari iOS não permite bloquear landscape.
}
