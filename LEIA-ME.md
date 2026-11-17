# Pokémon Arena V11 — 83 Pokémon (com 22 lendários)

## O que mudou na V11

- **45 Pokémon novos**, no mesmo padrão de modelos 3D dos que já existiam (total: 83).
  - **Lendários (22):** Moltres, Raikou, Lugia, Ho-Oh, Latias, Latios, Kyogre, Groudon, Rayquaza, Jirachi, Dialga, Palkia,
    Giratina, Darkrai, Arceus, Reshiram, Zekrom, Xerneas, Yveltal, Solgaleo, Lunala e Necrozma (com a marca **LENDÁRIO** na seleção).
  - **Outros (23):** Bulbasaur, Charmander, Pidgeot, Raichu, Ninetales, Golem, Hitmonchan, Scyther, Aerodactyl, Typhlosion,
    Feraligatr, Ampharos, Heracross, Houndoom, Aggron, Metagross, Infernape, Weavile, Gallade, Decidueye, Incineroar, Primarina e Dragapult.
- Cada um tem atributos, 4 golpes, Ultimate, estilo de combo e roteiro de cinemática próprios (`js/dados.js`).
- **Voo:** quem voa continua voando como na V10. Aves cujas asas são os "braços" do esqueleto (Moltres, Lugia, Ho-Oh, Yveltal,
  Lunala, Pidgeot, Aerodactyl) agora batem as asas no voo, com a ponta da asa atrasada para a batida ficar natural.
- **Rayquaza** tem o corpo enrolado em espiral (o modelo original vem esticado com mais de 20 m).
- **Animação:** só entraram modelos com esqueleto reconhecido, então todos andam com pernas, braços, cauda e cabeça animados e suavizados.
  O reconhecimento de ossos passou a aceitar nomes como `007_LThigh` e `L_UpperArm` / `L_Calf`.
- **Leveza:** os modelos novos foram otimizados (texturas 512 px WebP + malha meshopt, ~200 KB em média) e carregam
  **só quando o Pokémon é escolhido**. Lugia, Feraligatr e Dragapult perderam animações embutidas pesadas (Lugia tinha 26 MB).
- **Correção:** a trilha dos projéteis usava uma variável inexistente (`g`) e quebrava o quadro sempre que um projétil voava.
- **V11.1 — Pokémon pequenos maiores:** Bulbasaur, Charmander, Squirtle, Pikachu, Raichu, Eevee, Vaporeon, Jolteon, Flareon,
  Espeon, Umbreon, Sylveon, Mew, Mimikyu, Jirachi e Grovyle cresceram (de 20% a 60%) para o movimento ficar visível; a hitbox cresce junto.
  O modelo do Bulbasaur trazia os cipós do Vine Whip esticados para cima, o que o deixava minúsculo: eles agora ficam escondidos (campo `ocultarMalhas`).
- **Celular deitado:** a tela de seleção virou 3 colunas (painéis estreitos dos lados e a grade rolando no meio).

## Histórico: V10 — Desktop + Mobile (otimização de desempenho)

Versão completa da V9 atualizada para **desktop e celular**, preservando os controles, arenas, golpes, modelos, voo e efeitos introduzidos anteriormente. O objetivo é reduzir trabalho por quadro **sem transformar a versão de PC numa versão de celular**.

## Publicar no Netlify

1. Extraia o ZIP; a pasta extraída já possui `index.html` na raiz.
2. No Netlify, abra seu site → **Deploys** → upload manual da pasta extraída (ou do ZIP, quando a interface permitir).
3. Atualize a página sem cache no PC e no celular. **Não precisa mudar o link do site**.
4. Para medir desempenho, abra **Configurações → Mostrar FPS → Mostrar** e teste com Qualidade Gráfica **Automática**.

## O que mudou na V10

- **Desktop e mobile:** FPS visível opcional e qualidade automática adaptativa de acordo com a carga real da batalha; desktop começa mais nítido e mantém sombras/efeitos quando possível.
- **Torcida 3D:** 900 instâncias disponíveis, mas a animação dos espectadores ocorre a 24 Hz no PC / 18 Hz no celular, e a quantidade visível pode diminuir em qualidade baixa ou sob carga.
- **Partículas:** evita transferências desnecessárias de cores/células para a GPU e não envia buffers vazios; preserva efeitos elementais.
- **Sombras:** recalcula a 30 Hz no modo automático de PC, 24 Hz no celular e 60 Hz na qualidade Alta; o resto da renderização continua acompanhando o monitor.
- **Interface:** HUD atualizado a 30 Hz no PC / 24 Hz no celular; combate, controles, movimentação e colisões continuam na taxa de quadros do jogo.
- **Mudança de mapas:** descarrega geometrias, materiais e texturas exclusivas da arena anterior, evitando acúmulo de recursos ao trocar mapas.
- **Foco da página:** evita processar e renderizar quadros quando a aba está oculta.
- **Detecção:** janelas estreitas no PC não são confundidas automaticamente com aparelhos touchscreen.

## Configuração recomendada

- **Desktop com placa de vídeo dedicada:** Automática para equilíbrio ou Alta para mais brilho e sombras. Se quiser comparar, ligue o FPS no menu.
- **Celular:** Automática; se ficar abaixo de 30–40 FPS, use Baixa. Recomenda-se jogar horizontalmente.
- **Desktop integrado/antigo:** Automática e, se necessário, Baixa. A definição da tela e o processador/GPU ainda influenciam os resultados.

## Testes e limitações

- Os arquivos JavaScript passaram na verificação de sintaxe e o ZIP passou na verificação de integridade.
- O navegador automatizado do ambiente não permitiu abrir nem endereço local nem arquivo local, então **não foi possível medir FPS real, nem validar a renderização WebGL em um celular ou PC físico**.
- As otimizações são de processamento e renderização. A fluidez real depende do navegador, dispositivo e quantidade de efeitos na luta. Não há garantia de 60 FPS em todos os aparelhos.
- A versão 2D foi mantida, sem alteração nesta atualização.
- Para versus local com dois humanos, prefira dois controles no PC. No mobile, o toque controla o jogador 1.

## Estrutura resumida

`index.html` (Netlify), `css`, `js` (jogo), `modelos` (80 modelos carregados sob demanda), `jogo-2d`, `jogo-2d-arquivo-unico`, `assets-originais`, `efeitos-originais`, `docs`, `ferramentas`.

Pokémon e personagens pertencem a seus respectivos titulares. Consulte `docs/CREDITOS.md`.
