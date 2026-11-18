# Pokémon Arena V14 — Abertura, Pokébola, Mega com câmera e finalização

## O que mudou na V14

- **Tela de abertura** (`js/abertura.js`): logo animado, câmera passeando pela arena e Pokémon saindo da Pokébola em sequência.
  Enquanto isso os modelos mais usados vão carregando (barra embaixo). Qualquer tecla, clique, toque ou botão do controle abre os modos.
- **Pokémon saem da Pokébola** (`js/cinematicas.js`): a bola é lançada de trás do Pokémon, para no ar, treme, abre com um clarão
  e raios de luz, e o Pokémon aparece como uma **silhueta branca** que cresce e ganha cor (igual no anime).
  Vale no começo da luta, na troca, depois de um desmaio e nas assistências (versão rápida).
  Quando sai (troca ou desmaio), volta com o **raio vermelho**.
- **Mega Evolução com cinemática:** a luta para, entram as barras de cinema, a câmera aproxima, gira em volta do Pokémon enquanto a
  energia o envolve, a forma Mega aparece no meio da volta e termina num close de baixo para cima com um "rugido".
  (Em Configurações → Animação das Ultimates → "Acelerada", a cena fica 1,5× mais rápida.)
- **Finalização no último Pokémon:** congela o golpe, entra câmera lenta, a tela perde cor, aparece um **"K.O.!"** gigante e a câmera
  gira em volta de quem caiu. Depois a câmera vai para o **vencedor**, que comemora (também quando a rodada acaba por tempo).

---

# Pokémon Arena V13 — Animações mais vivas, Pokémon maiores e efeitos novos

## O que mudou na V13

- **Animação revisada um por um (83 Pokémon):** cada modelo foi medido (quanto do corpo fica parado andando e atacando).
  - Partes que antes ficavam duras agora se mexem: **boca abre** nos golpes e ao apanhar, **pés, mãos, dedos e ombros** acompanham o passo,
    e **penas, cabelo, roupa, barbatanas e antenas** balançam com "mola" (atrasam quando o Pokémon acelera, pula ou gira).
  - **Asas que eram estáticas agora batem:** Charizard, Zapdos, Hydreigon (penas presas no tronco), Articuno e Noivern (asas nos braços).
  - **Snorlax** não tinha esqueleto nenhum: o jogo agora cria um esqueleto simples pela forma do modelo, e ele anda, mexe os braços e a cabeça.
  - **Grovyle** voltou a usar as animações próprias do modelo (estava em pose de "T").
  - **Kyogre** fica com as nadadeiras abertas (antes elas viravam "pernas"); **Articuno** com a cauda para trás.
  - Exemplos de ganho (parte do corpo que ficava parada): Mimikyu 82% → 31%, Palkia 45% → 9%, Zapdos 55% → 31%, Gardevoir 57% → 37%.
- **Pokémon pequenos maiores (tabela `CRESCER` em `js/dados.js`):** medidos pela área da silhueta, não só pela altura.
  Articuno (×1,75 — era quase só cauda), Gallade, Mimikyu, Primarina, Hitmonchan, Mewtwo, Xerneas, Noivern, Grovyle, Mew, Gardevoir,
  Ampharos, Umbreon, Absol, Greninja, Lucario, Weavile, Sylveon, Scyther, Pikachu e Charmander. A colisão cresce junto.
- **Efeitos de golpe novos (`js/vfx.js`):**
  - O projétil deixou de ser uma "bola colorida": agora é um **núcleo de energia por shader** de cada tipo
    (fogo fervendo, plasma elétrico, água com espuma, fumaça escura com borda brilhante, anéis psíquicos, cristal de gelo...).
  - **Rastro** (fita) atrás de cada projétil, **arcos elétricos** em volta dos golpes elétricos.
  - **Impacto** com bolha de energia que estoura, onda de choque, faíscas esticadas e anel no chão.
  - **Raios (feixes)** com energia correndo por dentro e duas faixas em hélice; Flamethrower e Water Gun ganharam um jato contínuo.
  - Partículas de fogo, fumaça, faísca e raio trocadas por texturas melhores do **Particle Pack de Kenney (CC0, domínio público)** —
    `js/particulas-kenney.js`, licença em `efeitos-originais/LICENCA-kenney-particle-pack.txt`.
  - Tudo gerado por código: quase nada a mais para baixar. No gráfico "Baixa" os raios usam a versão antiga, mais leve.

---

# Pokémon Arena V12 — Mega Evolução com modelos 3D

## O que mudou na V12

- **Mega Evolução de verdade:** apertar **G** (J1), **Num \*** (J2), **L3** no controle ou o botão **M** no celular troca o modelo
  pelo da forma Mega no meio da animação de transformação (esfera de energia com as cores do arco-íris).
- **33 formas:** 31 com modelo 3D próprio e animado. Mega Charizard X e Mega Ampharos usam o modelo normal recolorido e maior,
  porque os modelos Mega deles não têm esqueleto (ficariam parados).
- **Novas Megas na tabela:** Mega Raichu X, Mega Feraligatr, Mega Darkrai, Mega Greninja, **Kyogre Primitivo** e **Groudon Primitivo**
  (Reversão Primitiva, com banner próprio).
- **Golpes da Mega:** anel de luz na cor da Mega a cada golpe, projéteis 30% maiores e com brilho, raios 40% mais largos.
- **HUD:** o nome muda para "Mega ..." e a marca M fica ao lado dos tipos.
- **Regras (inalteradas):** 1 Mega por time em cada luta, só depois de 20 s, custa 50 de energia, dura até o fim da luta
  (continua Mega se trocar e voltar).
- **Correções:** `atualizarMega` estava dentro do `if (L.surgir < 1)` (a transformação só andava enquanto o Pokémon surgia)
  e a marca M estava dentro de `.subs` (sumia quando o HUD era redesenhado).
- **Novos campos em `MEGAS`** (`js/dados.js`): `modelo`, `tinta`, `primal`, `altura`, `escalaModelo`, `enrolar`, `asasBracos`, `voa`,
  `ampAsa` (0 a 1: asas mais duras, usado nos "jatos" Mega Latias/Latios).
- Modelos Mega: projeto [Pokemon-3D-api/assets](https://github.com/Pokemon-3D-api/assets), convertidos para meshopt + texturas 512 px
  (`modelos/mega-<id>.js`; originais em `assets-originais/glb/`).

---

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
