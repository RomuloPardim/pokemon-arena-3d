# Onde fica cada coisa (jogo 2D em pastas)

Os guias foram escritos para o **arquivo único** `pokemon-arena.html`. Eles mandam você procurar (Ctrl+F) um trecho de código.
Na versão em pastas, o mesmo trecho está em um destes arquivos. No VS Code, use **Ctrl+Shift+F** (buscar em todos os arquivos)
com o trecho do guia — ou consulte a tabela:

| Trecho procurado no guia | Arquivo |
|---|---|
| `<div class="panel" id="aimPanel">` | `index.html` |
| `size: store.get('size',6),` | `js/07-menu.js` |
| `setupSeg($('#segAim'),'aim');` | `js/07-menu.js` |
| `if (tem(CONTROLES.pausar,k)) togglePause();` | `js/12-batalha-logica.js` |
| `/* ----- HUD ----- */` | `js/12-batalha-logica.js` |
| `  if (foe2 && !G.over) { updateAI(foe2, dt);` | `js/12-batalha-logica.js` |
| `const dm = att.team === 1 ? G.diff.mul : 1;` | `js/12-batalha-logica.js` |
| `const tgt = me ?` | `js/14-desenho-e-loop.js` |
| `RIVAL` | `js/10-batalha-criacao.js` |
| `return {mx, my, aim, tx, ty, golpes, pular};` | `js/12-batalha-logica.js` |
| `def.hp -= dmg; def.flash = .12; def.hurtT = .25;` | `js/12-batalha-logica.js` |
| `const dt = Math.min(.033, (now-last)/1000); last = now;` | `js/14-desenho-e-loop.js` |
| `// ----- Novos na versão 3 -----` | `js/01-dados.js` |
| `// Golpes da versão 3` | `js/01-dados.js` |
| `default: sombra(); cilindro(` | `js/04-obstaculos.js` |
| `case 'neve_borda':` | `js/02-mapas-motor.js` |
| `case 'neblina': banner(` | `js/12-batalha-logica.js` |
| `if (it.kind === 'energia')` | `js/12-batalha-logica.js` |
| `const ULT_ESPECIAL` | `js/10-batalha-criacao.js` |
| `// combos` | `js/12-batalha-logica.js` |
| `function ruimPara` | `js/10-batalha-criacao.js` |
| `pal('montanha',` | `js/02-mapas-motor.js` |
| `const MATERIAL = {` | `js/02-mapas-motor.js` |
| `const TERRENO_EFEITO = {` | `js/02-mapas-motor.js` |
| `const SORTEIO_ITENS` | `js/10-batalha-criacao.js` |
| `const OBJ = {` | `js/04-obstaculos.js` |
| `const CONTROLES` | `js/08-controles.js` |
| `const POKES` | `js/01-dados.js` |
| `const MAPS` | `js/03-mapas.js` |
| `const KIND_DEF` | `js/01-dados.js` |
| `const PMD = ` | `js/05-sprites-pmd.js` |
| `function renderMaps` | `js/07-menu.js` |
| `function startBattle` | `js/10-batalha-criacao.js` |
| `function updateAI` | `js/12-batalha-logica.js` |
| `function useMove` | `js/12-batalha-logica.js` |

## O que tem em cada arquivo

| Arquivo | Conteúdo |
|---|---|
| `index.html` | Telas do menu, montagem de equipe, HUD (só HTML) |
| `css/estilo.css` | Todo o visual das telas |
| `js/01-dados.js` | Tipos, tabela de efetividade, golpes (`mv(...)`) e os 44 Pokémon (`POKES`) |
| `js/02-mapas-motor.js` | Motor de cenário em pixel art: ruído, formas de terreno, materiais, pintura do chão |
| `js/03-mapas.js` | Os 10 mapas (`MAPS`) |
| `js/04-obstaculos.js` | Desenho e comportamento dos obstáculos (`OBJ`, `PARTES`, `obstSprite`) |
| `js/05-sprites-pmd.js` | Dados das animações de 8 direções (PMD Sprite Collab) |
| `js/06-utilidades.js` | Funções pequenas de apoio |
| `js/07-menu.js` | Estado do menu, configurações (`S`), montagem de equipe |
| `js/08-controles.js` | Teclas (`CONTROLES`) |
| `js/09-som.js` | Efeitos sonoros e música sintetizados |
| `js/10-batalha-criacao.js` | Ultimates, criação dos lutadores, sprites andando, terreno |
| `js/11-efeitos.js` | Partículas e efeitos visuais |
| `js/12-batalha-logica.js` | Entrada, HUD, física, dano, golpes, eventos do mapa, IA, atualização |
| `js/13-ambiente.js` | Clima, partículas do cenário, luz |
| `js/14-desenho-e-loop.js` | Desenho de tudo na tela e o loop principal |

> A ordem das `<script>` no `index.html` importa: um arquivo pode usar o que foi definido nos anteriores.
> Depois de editar, rode `python ferramentas/montar.py` para gerar de novo o arquivo único.
