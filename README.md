# Pokémon Arena 3D

Jogo de luta 3D em arena com Pokémon, inspirado em jogos de luta de anime. Feito em **HTML, CSS e JavaScript puro** com [three.js](https://threejs.org), roda direto no navegador do PC e do celular, sem instalar nada.

Link para jogar: https://romulopardim.github.io/pokemon-arena-3d/

> Projeto pessoal de estudo, **sem fins comerciais** e não afiliado à Nintendo, Game Freak ou The Pokémon Company. Veja [Créditos e aviso legal](#créditos-e-aviso-legal).

<!-- Dica: coloque aqui um print ou GIF do jogo, por exemplo: ![Pokémon Arena 3D](docs/screenshot.png) -->

## Destaques

- **83 Pokémon jogáveis**, sendo **22 lendários** (Arceus, Rayquaza, Kyogre, Groudon, Lugia, Ho-Oh, Dialga, Palkia, Giratina e outros).
- **Modelos 3D animados por código**: o esqueleto de cada modelo é reconhecido e animado (andar, correr, voar, atacar), com movimento suavizado.
- **Pokémon voadores voam de verdade**, e as aves batem as asas.
- **Animação viva em todas as partes**: boca, pés, mãos e dedos se mexem, e penas, cabelo, roupa e barbatanas balançam com física de mola.
- **Efeitos de golpe por shader**: núcleo de energia de cada tipo, rastro, arcos elétricos, impactos com onda de choque e raios com energia correndo por dentro.
- **Combate completo**: combos de 3 a 5 golpes, lançamentos, golpes aéreos, golpe carregado, guarda com barra, contra-ataque, esquiva perfeita, substituição, levantar rápido, quebra de combo.
- **Mega Evolução e Reversão Primitiva**: 33 formas (31 com modelo 3D próprio), com transformação animada, golpes mais fortes e regras para não ficar desequilibrado (1 por time, só depois de 20 s, custa 50 de energia).
- **Equipes de 1 a 3 Pokémon**, com troca durante a luta e assistências.
- **Ultimates cinematográficas** com câmera de cinema, e golpes com animações próprias (Flamethrower, Thunderbolt, Aura Sphere, Shadow Ball, Dragon Rush…).
- **Multiplayer local** para 2 jogadores na mesma tela, com 2 controles ou teclado, câmera compartilhada e controles remapeáveis.
- **7 arenas** com clima, perigos e cenário que reage aos golpes.
- **8 modos de jogo**, incluindo Torneio Local, Treinamento e Modo Caótico.
- **Otimizado para celular**: controles de toque, 3 níveis de qualidade gráfica, e modelos que só carregam quando o Pokémon é escolhido.

## Como jogar

### Online

Se o projeto estiver publicado (por exemplo, no Netlify ou no GitHub Pages), é só abrir o link no navegador.

### No seu computador

1. Baixe ou clone o repositório.
2. Abra o arquivo `index.html` no navegador (Chrome, Edge ou Firefox).

O jogo funciona abrindo o arquivo direto, porque os modelos 3D vêm embutidos em arquivos `.js`. Se preferir um servidor local:

```bash
# Python
python -m http.server 8000
# ou Node
npx serve .
```

Depois acesse `http://localhost:8000`.

### Publicar no Netlify

O repositório já tem um `netlify.toml` que publica a pasta raiz. Basta conectar o repositório no Netlify ou arrastar a pasta para o painel de deploy.

## Controles

O 1º controle conectado é o Jogador 1 e o 2º é o Jogador 2. Sem controle, os dois podem usar o teclado. Tudo pode ser trocado na tela **Controles** do menu, e as escolhas ficam salvas no navegador.

| Ação | Teclado J1 | Teclado J2 | Controle (Xbox / PlayStation) |
| --- | --- | --- | --- |
| Andar | W A S D | Setas | Analógico esquerdo |
| Ataque (combo; segurar = carregado) | J | Num 1 | X / ▢ |
| Pular (no ar: pulo duplo de quem voa) | Espaço | Num 0 | A / ✕ |
| Esquiva (sem direção: perseguir) | K | Num 2 | B / ◯ |
| Guarda (apanhando: substituição) | L | Num 3 | RB / R1 |
| Golpes especiais 1 a 4 | U I O P | Num 4 5 6 + | Y, LB, RT, LT |
| Ultimate | Y | Num 8 | Direcional ↑ |
| Assistências 1 e 2 | Q, E | Num 7, Num 9 | Direcional ←, → |
| Trocar Pokémon | R | Num Enter | Direcional ↓ |
| Mega Evolução | G | Num * | L3 (apertar o analógico) |
| Pausa | Esc | Backspace | Start / Options |

No celular aparecem um analógico à esquerda e os botões à direita.

**Técnicas:** apertar Guarda logo antes de um golpe faz um **contra-ataque**. Esquivar no instante certo faz uma **esquiva perfeita** (câmera lenta). O último golpe do combo **lança**, **arremessa** ou **derruba** o rival. No chão, Pular faz **levantar rápido**.

## Modos de jogo

| Modo | Descrição |
| --- | --- |
| 1 Jogador | Contra a CPU, nas dificuldades fácil, normal ou difícil |
| Versus Local | Jogador 1 contra Jogador 2 na mesma tela |
| Melhor de 3 / Melhor de 5 | Partidas em rodadas |
| Torneio Local | Chave de 4 ou 8 participantes, com 1 ou 2 jogadores e CPUs |
| Batalha Aleatória | Equipes e arena sorteadas |
| Treinamento | Boneco configurável (parado, andando, pulando, defendendo, esquivando ou lutando) |
| Modo Caótico | Recargas curtas, Ultimate frequente e meteoros caindo |

## Arenas

| Arena | Destaque |
| --- | --- |
| Estádio | Telões, torcida e bandeiras que reagem aos golpes |
| Vulcão | Rio de lava e erupções que lançam pedras no campo |
| Geleira | Aurora boreal e neve |
| Floresta Ancestral | Lama que deixa lento, folhas caindo e marcas de queimado |
| Cidade Neon | Chuva, letreiros que falham e pisos elétricos |
| Templo dos Dragões | Runas que carregam a Ultimate e lanternas que balançam |
| Ilhas Celestiais | Correntes de vento que fazem subir e cachoeiras flutuantes |

## Estrutura do projeto

```
├── index.html               telas, HUD e ordem dos scripts
├── css/estilo.css           menus, seleção, HUD, botões de toque e efeitos de tela
├── js/
│   ├── lib/                 three.js r149 (empacotado)
│   ├── dados.js             tipos, golpes, Pokémon, arenas, estilos de combo
│   ├── catalogo-modelos.js  lista de modelos carregados sob demanda
│   ├── modelos.js           carrega os modelos e anima o esqueleto por código (com molas)
│   ├── arena.js, mapas.js   cenários, clima, perigos e qualidade gráfica
│   ├── posfx.js             brilho, distorção de impacto e vinheta
│   ├── efeitos.js           partículas, raios, explosões, sons e música
│   ├── vfx.js               efeitos por shader: núcleo de energia, rastros, arcos, impactos
│   ├── particulas-kenney.js texturas de partícula CC0 (fogo, fumaça, faísca)
│   ├── mega.js              Mega Evolução e Reversão Primitiva
│   ├── entrada.js           teclado, controles, toque e remapeamento
│   ├── mobile.js            ajustes para navegador de celular
│   ├── batalha.js           movimento, golpes especiais, dano e troca
│   ├── combate.js           combos, guarda, contra-ataque, substituição, assistências
│   ├── golpes-especiais.js  animações próprias de golpes famosos
│   ├── ultimates.js         Ultimates cinematográficas
│   ├── ia.js                comportamento da CPU
│   ├── camera.js            câmera compartilhada
│   ├── hud.js               barras de vida, energia, combos e avisos
│   ├── modos.js             rodadas, torneio, treinamento e modo caótico
│   ├── menus.js             menu, seleção, configurações e pausa
│   └── main.js              configurações salvas e loop principal
├── modelos/                 modelos 3D embutidos (um .js por Pokémon)
├── efeitos-originais/       imagens originais dos efeitos
├── assets-originais/glb/    modelos 3D originais (.glb otimizados)
├── ferramentas/             scripts para preparar modelos e sprites
├── jogo-2d/                 versão 2D anterior do jogo
└── docs/                    créditos e guias
```

## Como adicionar coisas

| O que | Onde |
| --- | --- |
| Pokémon novo | Rode `python ferramentas/preparar_modelo.py <número> <nome>`, adicione o arquivo gerado em `js/catalogo-modelos.js` e crie a ficha com `P(...)` em `js/dados.js` |
| Estilo de luta e Ultimate de um Pokémon | Tabela `IDENTIDADE` em `js/dados.js` |
| Golpe novo | `golpe('Nome', 'tipo', 'jeito', poder, recarga)` em `js/dados.js` |
| Combo novo | `ESTILOS_LUTA` em `js/dados.js` |
| Ultimate nova | `ROTEIROS` em `js/ultimates.js` |
| Arena nova | `MAPAS` em `js/dados.js` e uma função registrada em `MONTAR_MAPA` (`js/mapas.js`) |

Para preparar modelos são necessários **Python 3** e **Node.js** (a ferramenta usa o glTF-Transform via `npx`).

## Tecnologias

- HTML5, CSS3 e JavaScript (sem frameworks)
- [three.js](https://threejs.org) r149, com pós-processamento (bloom)
- Gamepad API, Web Audio API e eventos de toque
- [glTF-Transform](https://gltf-transform.dev) e meshoptimizer para comprimir os modelos

## Créditos e aviso legal

Este é um **projeto de fã, feito para estudo, sem fins comerciais**. Pokémon e todos os personagens, nomes e marcas relacionados são © Nintendo / Creatures Inc. / GAME FREAK inc. / The Pokémon Company. Este projeto não é afiliado, patrocinado nem aprovado por essas empresas.

- **Texturas de partícula:** [Particle Pack](https://kenney.nl/assets/particle-pack) de Kenney, licença CC0 (domínio público).
- **Modelos 3D das Megas:** projeto [Pokemon-3D-api/assets](https://github.com/Pokemon-3D-api/assets). Uso educacional e não comercial.
- **Modelos 3D:** projeto [Pokemon-3D](https://github.com/Sudhanshu-Ambastha/Pokemon-3D), de Sudhanshu Ambastha, que reúne modelos de artistas do Sketchfab (créditos de cada artista nas coleções do autor). Uso educacional e não comercial.
- **Sprites de efeitos:** [Pokémon Showdown client](https://github.com/smogon/pokemon-showdown-client).
- **Ícones dos Pokémon:** [PokeAPI sprites](https://github.com/PokeAPI/sprites).
- **Sprites do jogo 2D:** [PMD Sprite Collab](https://sprites.pmdcollab.org) (CC BY-NC 4.0).
- **Motor 3D:** [three.js](https://threejs.org) (licença MIT).
- **Fontes:** Press Start 2P e Rubik, do Google Fonts (SIL Open Font License).
- Arenas, clima, efeitos procedurais, Ultimates, músicas e sons foram feitos por código neste projeto.

A lista completa está em [`docs/CREDITOS.md`](docs/CREDITOS.md).

Se algum detentor de direitos quiser que algum conteúdo seja removido, abra uma *issue* que ele será retirado.
