# Guias passo a passo

## Jogo 3D (V8)

- **Tarefas de treino + guia passo a passo (10 mudanças para fazer à mão):**
  https://claude.ai/artifact/8foyfvFH8PAoaZ1VTuDjYc
- *Antigo (V7):* controle e tela dividida — https://claude.ai/artifact/JVnGXhpkbnihNe4EvTtJSa
  Na V8 isso já vem pronto (2 controles, câmera compartilhada, remapeamento), então esse guia não se aplica mais.

## Jogo 2D

- **Botões, modo local para 2 jogadores e controle (gamepad):**
  https://claude.ai/artifact/P11dFxJg2tmNhwQ1MNX8KX
- **Adicionar Pokémon, golpes, mapas, obstáculos, terrenos, itens, eventos e Ultimates:**
  https://claude.ai/artifact/L2Mz98cP4Pjcc6eeVERyUD

Os guias mandam buscar trechos de código com Ctrl+F no arquivo único (`jogo-2d-arquivo-unico/pokemon-arena.html`).
Você pode seguir assim mesmo, ou editar a versão em pastas: no VS Code use **Ctrl+Shift+F** com o mesmo trecho,
ou veja a tabela em [ONDE-FICA-2D.md](ONDE-FICA-2D.md). Depois rode `python jogo-2d/ferramentas/montar.py`.

Para o **jogo 3D**, o resumo de onde mexer está no `LEIA-ME.md` da raiz.

## Controles do 2D (PC)
WASD/setas: mover • Mouse: mirar • Clique ou 1–4: golpes • Espaço: pular/esquivar • Q: Ultimate • clique no retrato: trocar • P/Esc: pausa.
No celular: analógico à esquerda, golpes à direita, mira automática.
