# Pokémon Arena — projeto de estudo (2D + 3D V8 "Ultimate Battle")

Dois jogos de batalha em tempo real feitos só com HTML, CSS e JavaScript, sem instalar nada.
Funcionam no navegador do PC e do celular.

> Projeto pessoal de estudo, sem fins comerciais. Pokémon © Nintendo / Game Freak / The Pokémon Company.

---

## Como abrir

| O quê | Como |
|---|---|
| **Jogo 3D** | Abra `jogo-3d/index.html` no navegador (dois cliques). |
| **Jogo 2D** | Abra `jogo-2d/index.html`. |
| **Jogo 2D em um arquivo só** | `jogo-2d-arquivo-unico/pokemon-arena.html` (bom para mandar para o celular). |

Precisa de internet na primeira vez: as fontes, os ícones e os sprites 2D vêm da internet. Os modelos 3D
de **35 Pokémon** estão **dentro do projeto** (funcionam offline). Os 3 marcados como **online**
(Greninja, Dragonite, Mewtwo) baixam o modelo na hora (10–16 MB cada).

**No VS Code:** abra a pasta `PokemonArena` inteira (*Arquivo → Abrir Pasta*). Se quiser que a página recarregue
sozinha quando você salva, instale a extensão **Live Server** (o VS Code vai sugerir) e clique com o botão direito
no `index.html` → *Open with Live Server*.

---

## Estrutura das pastas

```
PokemonArena/
├── LEIA-ME.md                  ← este arquivo
├── jogo-3d/                    ← arena 3D V8 (estilo luta de anime, 1 ou 2 jogadores)
│   ├── index.html              telas, HUD e ordem dos scripts
│   ├── css/estilo.css          menus, seleção, HUD, botões de toque, cinemática
│   ├── js/
│   │   ├── lib/three-r149-bundle.js   motor 3D (three.js + carregador .glb + pós-processamento)
│   │   ├── dados.js            tipos, golpes, Pokémon, mapas, ESTILOS_LUTA (combos) e IDENTIDADE
│   │   ├── modelos.js          carrega os modelos e anima o esqueleto por código
│   │   ├── arena.js            renderizador, qualidade gráfica, chão, Estádio/Vulcão/Geleira
│   │   ├── mapas.js            Floresta, Cidade Neon, Templo, Ilhas + clima, perigos e reações
│   │   ├── posfx.js            brilho (bloom), distorção de impacto e vinheta
│   │   ├── efeitos.js          partículas, raios, explosões, números de dano, sons e música
│   │   ├── entrada.js          teclado, 2 controles, toque, remapeamento e vibração
│   │   ├── batalha.js          movimento, golpes especiais, dano, desmaio e troca
│   │   ├── combate.js          combos, guarda, contra-ataque, substituição, assistências
│   │   ├── golpes-especiais.js Flamethrower, Thunderbolt, Aura Sphere, Shadow Ball, Dragon Rush
│   │   ├── ultimates.js        Ultimates cinematográficas (roteiros de câmera)
│   │   ├── ia.js               a CPU (gera as mesmas entradas que um controle)
│   │   ├── camera.js           câmera compartilhada estilo Storm
│   │   ├── hud.js              painéis dos 2 jogadores, combo, avisos
│   │   ├── modos.js            rodadas, Melhor de 3/5, Torneio, Treino, Caótico
│   │   ├── menus.js            menu, seleção J1/J2, configurações, controles, pausa
│   │   └── main.js             configurações salvas, carregar a luta, loop principal
│   ├── modelos/                modelos 3D embutidos (um .js por Pokémon, comprimidos)
│   ├── efeitos-originais/      os .png dos efeitos (do Pokémon Showdown)
│   └── ferramentas/            preparar_modelo.py, glb_para_js.py, sprites_para_js.py, three-entry.js
├── jogo-2d/                    ← o jogo 2D (versão 5), separado em arquivos
│   ├── index.html
│   ├── css/estilo.css
│   ├── js/01-dados.js … 14-desenho-e-loop.js
│   └── ferramentas/montar.py   junta tudo em jogo-2d-arquivo-unico/
├── jogo-2d-arquivo-unico/      ← o 2D num único .html
├── assets-originais/glb/       ← os .glb originais (para abrir no Blender, por exemplo)
└── docs/
    ├── ONDE-FICA-2D.md         em qual arquivo está cada trecho citado nos guias
    ├── GUIAS.md                links dos guias passo a passo
    └── CREDITOS.md             de onde vieram modelos, sprites e bibliotecas
```

---

## Jogo 3D V8 — modos

| Modo | O que é |
|---|---|
| 1 Jogador | Você contra a CPU (fácil, normal ou difícil). |
| Versus Local | J1 contra J2 na mesma tela, câmera compartilhada. |
| Melhor de 3 / Melhor de 5 | Rodadas; quem ganhar 2 (ou 3) vence. |
| Torneio Local | Chave de 4 ou 8 com 1 ou 2 jogadores e CPUs. |
| Batalha Aleatória | Equipes e arena sorteadas. |
| Treinamento | Boneco configurável (parado, andando, pulando, defendendo, esquivando ou lutando). |
| Modo Caótico | Recargas curtas, Ultimate frequente e meteoros. |

Cada jogador escolhe a própria equipe de 1, 2 ou 3 Pokémon na mesma tela de seleção. São 7 arenas:
Estádio, Vulcão, Geleira, Floresta Ancestral, Cidade Neon, Templo dos Dragões e Ilhas Celestiais.

## Jogo 3D V8 — controles

O 1º controle ligado é o J1 e o 2º é o J2. Sem controle, os dois jogadores podem usar o teclado.
Tudo pode ser trocado em **Controles** no menu (fica salvo no navegador).

| Ação | Teclado J1 | Teclado J2 | Controle (Xbox / PlayStation) |
|---|---|---|---|
| Andar | WASD | setas | analógico esquerdo |
| Ataque (combo; segurar = carregado) | J | Num 1 | X / ▢ |
| Pular (no ar: pulo duplo de quem voa) | Espaço | Num 0 | A / ✕ |
| Esquiva (sem direção: perseguir) | K | Num 2 | B / ◯ |
| Guarda (apanhando: substituição) | L | Num 3 | RB / R1 |
| Golpes 1 a 4 | U I O P | Num 4 5 6 + | Y, LB, RT, LT |
| Ultimate | Y | Num 8 | ↑ |
| Assistências 1 e 2 | Q, E | Num 7, Num 9 | ←, → |
| Trocar Pokémon | R | Num Enter | ↓ |
| Pausa | Esc | Backspace | Start / Options |

No celular aparecem um analógico à esquerda e os botões à direita (J1).

Técnicas: guarda logo antes do golpe = **contra-ataque**; esquiva no instante certo = **esquiva perfeita** (câmera lenta);
golpe final de combo **lança**, **arremessa** ou **derruba**; no chão, Pular = **levantar rápido**;
14 golpes seguidos recebidos = **quebra de combo** automática.

## Jogo 3D V8 — onde mexer

- **Pokémon novo:** dentro de `jogo-3d`, rode `python ferramentas/preparar_modelo.py 1 bulbasaur`, adicione
  `<script src="modelos/1-bulbasaur.js"></script>` no `index.html` e copie uma linha `P(...)` em `dados.js`.
  Para dar estilo de luta e Ultimate, adicione o número dele em `IDENTIDADE` (`dados.js`).
- **Golpe novo:** `golpe('Nome','tipo','jeito',poder,recarga,extras)` em `dados.js`
  (jeitos: `projetil`, `raio`, `area`, `investida`, `chuva`, `buff`). Animação própria: `ASSINATURAS` em `golpes-especiais.js`.
- **Combo novo:** um estilo em `ESTILOS_LUTA` (`dados.js`).
- **Ultimate nova:** uma função em `ROTEIROS` (`ultimates.js`) e a duração em `DURACAO_ROTEIRO`.
- **Mapa novo:** entrada em `MAPAS` (`dados.js`) e uma função `montarXxx(A)` registrada em `MONTAR_MAPA` (`mapas.js`).

O guia **Tarefas de treino** (link em `docs/GUIAS.md`) ensina 10 mudanças passo a passo.

---

## Jogo 2D (versão 5)

Controles (PC): WASD mover • mouse mirar • clique ou 1–4 golpes • Espaço pular/esquivar • Q Ultimate • P/Esc pausa.


Igual à versão 4, com duas mudanças:
- **Saiu o estilo "Moderno 3D"**: os GIFs do Showdown só tinham frente e costas, então o Pokémon não virava para os lados
  nem mexia as pernas. Ficou só o estilo **Pixel de 8 direções** (PMD Sprite Collab), que anda e pula de verdade.
  Procurei sprites mais novos com 8 direções e não existe outra coleção assim — por isso o 3D virou o jogo novo.
- **Código separado em 14 arquivos** (`jogo-2d/js/`), para ler no VS Code. O arquivo único continua existindo.

Os guias (links em `docs/GUIAS.md`) continuam valendo: eles citam trechos para buscar com Ctrl+F.
Na versão em pastas, use **Ctrl+Shift+F** no VS Code ou veja `docs/ONDE-FICA-2D.md`.
Depois de editar os arquivos, rode `python ferramentas/montar.py` (dentro de `jogo-2d`) para atualizar o arquivo único.
