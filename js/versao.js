"use strict";
/* Versão do jogo: mude SÓ aqui a cada push.
   O título da aba, o logo do menu e o aplicativo (sw.js) usam este número. */
const VERSAO = '15';

document.title = 'Pokémon Arena V' + VERSAO + ' — Desktop + Mobile';
{ const logo = document.getElementById('versaoLogo'); if (logo) logo.textContent = 'V' + VERSAO; }
