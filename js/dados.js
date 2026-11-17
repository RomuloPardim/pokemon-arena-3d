"use strict";
/* =========================================================
   DADOS DO JOGO 3D
   Tipos, tabela de efetividade, golpes e Pokémon.
   Para adicionar um Pokémon: veja LEIA-ME.md (seção "Adicionar Pokémon no 3D").
   ========================================================= */
const TYPES = {
  normal:['Normal','#A8A77A'], fire:['Fogo','#EE8130'], water:['Água','#6390F0'], electric:['Elétrico','#E3B90C'],
  grass:['Planta','#7AC74C'], ice:['Gelo','#6CC9C5'], fighting:['Lutador','#C22E28'], poison:['Veneno','#A33EA1'],
  ground:['Terrestre','#D2A845'], flying:['Voador','#A98FF3'], psychic:['Psíquico','#F95587'], bug:['Inseto','#A6B91A'],
  rock:['Pedra','#B6A136'], ghost:['Fantasma','#735797'], dragon:['Dragão','#6F35FC'], dark:['Sombrio','#705746'],
  steel:['Aço','#9a9ab8'], fairy:['Fada','#D685AD']
};
// s = super efetivo (2x), w = pouco efetivo (0.5x), n = não afeta (0x)
const CHART_RAW = {
  normal:{w:'rock steel',n:'ghost'},
  fire:{s:'grass ice bug steel',w:'fire water rock dragon'},
  water:{s:'fire ground rock',w:'water grass dragon'},
  electric:{s:'water flying',w:'electric grass dragon',n:'ground'},
  grass:{s:'water ground rock',w:'fire grass poison flying bug dragon steel'},
  ice:{s:'grass ground flying dragon',w:'fire water ice steel'},
  fighting:{s:'normal ice rock dark steel',w:'poison flying psychic bug fairy',n:'ghost'},
  poison:{s:'grass fairy',w:'poison ground rock ghost',n:'steel'},
  ground:{s:'fire electric poison rock steel',w:'grass bug',n:'flying'},
  flying:{s:'grass fighting bug',w:'electric rock steel'},
  psychic:{s:'fighting poison',w:'psychic steel',n:'dark'},
  bug:{s:'grass psychic dark',w:'fire fighting poison flying ghost steel fairy'},
  rock:{s:'fire ice flying bug',w:'fighting ground steel'},
  ghost:{s:'psychic ghost',w:'dark',n:'normal'},
  dragon:{s:'dragon',w:'steel',n:'fairy'},
  dark:{s:'psychic ghost',w:'fighting dark fairy'},
  steel:{s:'ice rock fairy',w:'fire water electric steel'},
  fairy:{s:'fighting dragon dark',w:'fire poison steel'}
};
const CHART = {};
for (const [t,o] of Object.entries(CHART_RAW)) {
  CHART[t] = {};
  for (const [k,mul] of [['s',2],['w',.5],['n',0]]) if (o[k]) o[k].split(' ').forEach(d => CHART[t][d] = mul);
}
function effectiveness(atkType, defTypes){
  let m = 1; for (const d of defTypes) m *= (CHART[atkType][d] ?? 1); return m;
}

/* ----- Tipos de golpe (como cada um se comporta) -----
   projetil  : esfera que voa reto até bater em alguém ou num obstáculo
   raio      : feixe instantâneo que acerta o primeiro alvo na linha
   area      : onda que sai do próprio Pokémon (acerta todos em volta)
   investida : avanço rápido para frente acertando quem estiver no caminho
   chuva     : marca um círculo no chão (na mira) e o golpe cai do céu
   buff      : aumenta ataque e velocidade por alguns segundos               */
const TIPO_GOLPE = {
  projetil:  { nome:'Projétil',   recarga:.55 },
  raio:      { nome:'Raio',       recarga:2.2 },
  area:      { nome:'Área',       recarga:3.5 },
  investida: { nome:'Investida',  recarga:1.8 },
  chuva:     { nome:'Do céu',     recarga:4   },
  buff:      { nome:'Fortalecer', recarga:9   },
};

// golpe(nome, tipo, jeito, poder, recarga, extras)
// extras (opcionais): visual (aparência), qtd (vários projéteis), abertura, tam (tamanho), vel, raio (área), largura (raio)
//   visual de projétil: 'orbe', 'folhas', 'pedra', 'estrelas', 'shuriken', 'punho', 'corte', 'gelo', 'agulhas', 'osso', 'lua'
//   visual de projétil também: 'rocha3d' (pedra 3D)
//   visual de raio: 'jato' (lança-chamas contínuo)
//   visual de investida: 'mordida', 'corte', 'garra', 'punho'
//   visual de área: 'som', 'parede' (onda que cresce), 'redemoinho', 'fissura' (rachaduras), 'descarga' (raios)
//   visual de golpe do céu: 'espinhos' (pedras/gelo saindo do chão)
const golpe = (nome, tipo, jeito, poder, recarga, extras) =>
  Object.assign({ nome, tipo, jeito, poder, recarga: recarga ?? TIPO_GOLPE[jeito].recarga }, extras || {});

/* ----- Pokémon -----
   id      : número da Pokédex (é o nome do arquivo em modelos/)
   hp/atk/def/vel : atributos (os oficiais funcionam bem)
   altura  : altura em "metros do jogo" (visual + tamanho da colisão)
   voa     : true = flutua (não pisa na lava nem escorrega no gelo)
   online  : true = o modelo é grande e vem da internet (tem animações reais)
   asasBracos: true = ave cujas asas são os "braços" do esqueleto (batem como asas no voo)
   escalaModelo: corrige o tamanho visual de um modelo sem mudar a altura do combate
   enrolar : { y, x } = curva fixa por pedaço da cauda (serpentes como o Rayquaza)
   lendario: true = mostra a marca LENDÁRIO na seleção
   ocultarMalhas: /nome/ = esconde peças do modelo que não devem aparecer (e não contam no tamanho)
   ult     : nome e jeito da Ultimate (meteoro, tempestade, nova, rajada); visual opcional      */
const P = (id, nome, tipos, hp, atk, def, vel, altura, golpes, ult, extra) => Object.assign({ id, nome, tipos: tipos.split(' '), hp, atk, def, vel, altura, golpes, ult }, extra || {});
const POKEMON = [
  // ----- Kanto -----
  P(6, 'Charizard', 'fire flying', 78, 109, 82, 100, 2.3,
    [golpe('Ember','fire','projetil',40), golpe('Flamethrower','fire','raio',85), golpe('Heat Wave','fire','area',90), golpe('Dragon Rush','dragon','investida',95)],
    { nome:'Inferno Ancestral', jeito:'meteoro' }, { voa:true }),
  P(9, 'Blastoise', 'water', 79, 85, 105, 78, 2.0,
    [golpe('Water Gun','water','raio',45,1.4,{visual:'jato'}), golpe('Hydro Pump','water','raio',100,null,{largura:.7}), golpe('Surf','water','area',90), golpe('Rapid Spin','normal','investida',70)],
    { nome:'Maremoto', jeito:'nova' }),
  P(3, 'Venusaur', 'grass poison', 80, 100, 100, 80, 1.9,
    [golpe('Razor Leaf','grass','projetil',42), golpe('Solar Beam','grass','raio',110,3,{largura:.8}), golpe('Sludge Bomb','poison','chuva',90), golpe('Growth','grass','buff',0)],
    { nome:'Floresta Viva', jeito:'nova' }),
  P(7, 'Squirtle', 'water', 60, 65, 65, 75, 1.3,
    [golpe('Bubble','water','projetil',35,.45,{qtd:3, abertura:.2, tam:.3}), golpe('Bubble Beam','water','raio',65), golpe('Rapid Spin','normal','investida',50,1.2), golpe('Withdraw','water','buff',0)],
    { nome:'Esquadrão Squirtle', jeito:'nova' }),
  P(25, 'Pikachu', 'electric', 60, 90, 50, 120, 1.35,
    [golpe('Thunder Shock','electric','projetil',40), golpe('Thunderbolt','electric','raio',90), golpe('Thunder','electric','chuva',110), golpe('Quick Attack','normal','investida',60,1.1)],
    { nome:'Gigavolt', jeito:'tempestade' }),
  P(94, 'Gengar', 'ghost poison', 60, 130, 70, 110, 1.7,
    [golpe('Shadow Ball','ghost','projetil',60,.8,{tam:.55}), golpe('Dark Pulse','dark','raio',80), golpe('Sludge Wave','poison','area',95,null,{visual:'parede'}), golpe('Hypnosis','psychic','chuva',70)],
    { nome:'Pesadelo Eterno', jeito:'tempestade' }),
  P(65, 'Alakazam', 'psychic', 55, 135, 70, 120, 1.8,
    [golpe('Confusion','psychic','projetil',45), golpe('Psybeam','psychic','raio',75), golpe('Psychic','psychic','chuva',100), golpe('Calm Mind','psychic','buff',0)],
    { nome:'Mente Infinita', jeito:'rajada' }),
  P(68, 'Machamp', 'fighting', 90, 130, 82, 55, 2.1,
    [golpe('Karate Chop','fighting','projetil',50,null,{visual:'punho'}), golpe('Focus Blast','fighting','raio',110,3.2), golpe('Earthquake','ground','area',100), golpe('Dynamic Punch','fighting','investida',100)],
    { nome:'Quatro Punhos', jeito:'nova' }),
  P(59, 'Arcanine', 'fire', 90, 110, 80, 95, 2.0,
    [golpe('Ember','fire','projetil',40,null,{qtd:3, abertura:.15, tam:.3}), golpe('Flamethrower','fire','raio',90), golpe('Flare Blitz','fire','investida',120,2), golpe('Fire Blast','fire','chuva',110)],
    { nome:'Velocidade Extrema', jeito:'meteoro' }),
  P(130, 'Gyarados', 'water flying', 95, 125, 89, 81, 3.0,
    [golpe('Twister','dragon','projetil',45,null,{tam:.55}), golpe('Hydro Pump','water','raio',110,null,{largura:.8}), golpe('Hurricane','flying','chuva',110), golpe('Dragon Dance','dragon','buff',0)],
    { nome:'Fúria do Mar', jeito:'tempestade', tipo:'water' }, { voa:true }),
  P(133, 'Eevee', 'normal', 55, 55, 55, 55, 1.3,
    [golpe('Swift','normal','projetil',40,.6,{visual:'estrelas', qtd:3, abertura:.18, tam:.32}), golpe('Bite','dark','investida',60,1.2), golpe('Hyper Voice','normal','area',90,null,{visual:'som'}), golpe('Shadow Ball','ghost','projetil',60,1.2,{tam:.5})],
    { nome:'Explosão Evolutiva', jeito:'nova' }),
  P(134, 'Vaporeon', 'water', 130, 110, 77, 65, 1.45,
    [golpe('Water Pulse','water','projetil',60,.7,{tam:.5}), golpe('Hydro Pump','water','raio',110), golpe('Surf','water','area',90), golpe('Aqua Ring','water','buff',0)],
    { nome:'Dilúvio', jeito:'nova' }),
  P(135, 'Jolteon', 'electric', 65, 110, 77, 130, 1.45,
    [golpe('Pin Missile','bug','projetil',25,.5,{visual:'agulhas', qtd:3, abertura:.12, tam:.3}), golpe('Thunderbolt','electric','raio',90), golpe('Discharge','electric','area',80), golpe('Thunder','electric','chuva',110)],
    { nome:'Choque Supremo', jeito:'tempestade' }),
  P(136, 'Flareon', 'fire', 65, 130, 85, 65, 1.4,
    [golpe('Ember','fire','projetil',40), golpe('Flamethrower','fire','raio',90), golpe('Flare Blitz','fire','investida',120,2), golpe('Fire Spin','fire','area',85)],
    { nome:'Chama Fofa', jeito:'meteoro' }),
  P(144, 'Articuno', 'ice flying', 90, 95, 112, 85, 2.0,
    [golpe('Ice Shard','ice','projetil',40,.5,{qtd:2, abertura:.14}), golpe('Ice Beam','ice','raio',90), golpe('Blizzard','ice','area',110,4.5,{raio:6.5}), golpe('Hurricane','flying','chuva',110)],
    { nome:'Era do Gelo', jeito:'tempestade' }, { voa:true }),
  P(145, 'Zapdos', 'electric flying', 90, 125, 87, 100, 2.0,
    [golpe('Thunder Shock','electric','projetil',40,.5), golpe('Thunderbolt','electric','raio',90), golpe('Drill Peck','flying','investida',80), golpe('Thunder','electric','chuva',110)],
    { nome:'Tempestade Lendária', jeito:'tempestade' }, { voa:true }),
  P(143, 'Snorlax', 'normal', 160, 110, 87, 30, 2.6,
    [golpe('Mega Punch','normal','projetil',50,.8,{visual:'punho', tam:.55}), golpe('Hyper Beam','normal','raio',130,4,{largura:.9}), golpe('Earthquake','ground','area',100), golpe('Body Slam','normal','investida',85)],
    { nome:'Soneca Esmagadora', jeito:'meteoro', tipo:'normal' }),
  P(151, 'Mew', 'psychic', 100, 100, 100, 100, 1.3,
    [golpe('Aura Sphere','fighting','projetil',55,.7), golpe('Psychic','psychic','chuva',100), golpe('Ancient Power','rock','projetil',60,1.4,{visual:'rocha3d', qtd:3, abertura:.2}), golpe('Psyshock','psychic','raio',80)],
    { nome:'Gênese', jeito:'rajada' }, { voa:true }),
  // ----- Johto / Hoenn -----
  P(196, 'Espeon', 'psychic', 65, 130, 85, 110, 1.45,
    [golpe('Confusion','psychic','projetil',45), golpe('Psybeam','psychic','raio',75), golpe('Future Sight','psychic','chuva',110,4.5), golpe('Calm Mind','psychic','buff',0)],
    { nome:'Sol Psíquico', jeito:'rajada' }),
  P(197, 'Umbreon', 'dark', 95, 65, 130, 65, 1.45,
    [golpe('Dark Pulse','dark','raio',80), golpe('Bite','dark','investida',60,1.1), golpe('Snarl','dark','area',70,null,{visual:'som'}), golpe('Moonlight','fairy','buff',0)],
    { nome:'Lua Negra', jeito:'tempestade' }),
  P(212, 'Scizor', 'bug steel', 70, 130, 90, 65, 1.9,
    [golpe('Bullet Punch','steel','projetil',40,.45,{visual:'punho'}), golpe('X-Scissor','bug','investida',80,1.3), golpe('Flash Cannon','steel','raio',80), golpe('Swords Dance','normal','buff',0)],
    { nome:'Tesoura Implacável', jeito:'rajada', visual:'corte' }),
  P(248, 'Tyranitar', 'rock dark', 100, 134, 105, 61, 2.4,
    [golpe('Rock Throw','rock','projetil',50,.8), golpe('Crunch','dark','investida',80), golpe('Earthquake','ground','area',100), golpe('Stone Edge','rock','chuva',100)],
    { nome:'Chuva de Rochas', jeito:'meteoro', tipo:'rock' }),
  P(253, 'Grovyle', 'grass', 50, 85, 50, 95, 1.55,
    [golpe('Bullet Seed','grass','projetil',25,.4,{qtd:3, abertura:.1, tam:.25}), golpe('Leaf Blade','grass','investida',90,1.4), golpe('Energy Ball','grass','projetil',80,1.6,{visual:'orbe', tam:.6}), golpe('Leaf Storm','grass','area',110,4)],
    { nome:'Tufão de Folhas', jeito:'nova' }),
  P(254, 'Sceptile', 'grass', 70, 105, 85, 120, 1.9,
    [golpe('Leaf Blade','grass','investida',90,1.3), golpe('Energy Ball','grass','projetil',80,.9,{visual:'orbe', tam:.55}), golpe('Leaf Storm','grass','area',110,4), golpe('Frenzy Plant','grass','chuva',120)],
    { nome:'Selva Mortal', jeito:'nova' }),
  P(257, 'Blaziken', 'fire fighting', 80, 120, 70, 80, 2.0,
    [golpe('Ember','fire','projetil',40), golpe('Blaze Kick','fire','investida',85,1.3,{visual:'punho'}), golpe('Overheat','fire','raio',130,4), golpe('Bulk Up','fighting','buff',0)],
    { nome:'Chute Flamejante', jeito:'meteoro' }),
  P(260, 'Swampert', 'water ground', 100, 110, 90, 60, 1.8,
    [golpe('Mud Shot','ground','projetil',55,.7), golpe('Hydro Pump','water','raio',110), golpe('Earthquake','ground','area',100), golpe('Muddy Water','water','chuva',90)],
    { nome:'Avalanche de Lama', jeito:'nova', tipo:'ground' }),
  P(282, 'Gardevoir', 'psychic fairy', 68, 125, 100, 80, 1.8,
    [golpe('Moonblast','fairy','projetil',90,1.1,{visual:'lua', tam:.5}), golpe('Psyshock','psychic','raio',80), golpe('Dazzling Gleam','fairy','area',80), golpe('Psychic','psychic','chuva',100)],
    { nome:'Dança Lunar', jeito:'rajada', tipo:'fairy', visual:'lua' }),
  P(359, 'Absol', 'dark', 65, 130, 60, 75, 1.5,
    [golpe('Psycho Cut','psychic','projetil',70,.8,{visual:'corte'}), golpe('Night Slash','dark','investida',80,1.2,{visual:'corte'}), golpe('Dark Pulse','dark','raio',80), golpe('Swords Dance','normal','buff',0)],
    { nome:'Desastre', jeito:'tempestade' }),
  // ----- Sinnoh em diante -----
  P(445, 'Garchomp', 'dragon ground', 108, 130, 90, 102, 2.2,
    [golpe('Dragon Breath','dragon','projetil',55), golpe('Dragon Rush','dragon','investida',95,1.6), golpe('Earthquake','ground','area',100), golpe('Draco Meteor','dragon','chuva',130,5)],
    { nome:'Tubarão Terremoto', jeito:'meteoro' }),
  P(448, 'Lucario', 'fighting steel', 70, 115, 70, 90, 1.8,
    [golpe('Aura Sphere','fighting','projetil',55,.7), golpe('Flash Cannon','steel','raio',80), golpe('Close Combat','fighting','investida',120,2.2,{visual:'punho'}), golpe('Swords Dance','normal','buff',0)],
    { nome:'Aura Suprema', jeito:'rajada' }),
  P(571, 'Zoroark', 'dark', 60, 120, 60, 105, 1.9,
    [golpe('Shadow Claw','ghost','projetil',70,.8,{visual:'corte'}), golpe('Night Slash','dark','investida',80,1.1,{visual:'garra'}), golpe('Night Daze','dark','area',85,null,{visual:'redemoinho'}), golpe('Nasty Plot','dark','buff',0)],
    { nome:'Ilusão Sombria', jeito:'tempestade' }),
  P(635, 'Hydreigon', 'dark dragon', 92, 125, 90, 98, 2.2,
    [golpe('Dragon Breath','dragon','projetil',55,.6), golpe('Dark Pulse','dark','raio',80), golpe('Crunch','dark','investida',80), golpe('Draco Meteor','dragon','chuva',130,5)],
    { nome:'Três Cabeças', jeito:'meteoro', tipo:'dragon' }, { voa:true }),
  P(700, 'Sylveon', 'fairy', 95, 110, 130, 60, 1.45,
    [golpe('Moonblast','fairy','projetil',90,1.1,{visual:'lua', tam:.5}), golpe('Dazzling Gleam','fairy','raio',80), golpe('Hyper Voice','normal','area',90,null,{visual:'som'}), golpe('Calm Mind','psychic','buff',0)],
    { nome:'Laços Encantados', jeito:'nova' }),
  P(715, 'Noivern', 'flying dragon', 85, 97, 85, 123, 2.1,
    [golpe('Air Slash','flying','projetil',60,.6), golpe('Dragon Pulse','dragon','raio',85), golpe('Boomburst','normal','area',110,4,{visual:'som', raio:7}), golpe('Hurricane','flying','chuva',110)],
    { nome:'Onda Ultrassônica', jeito:'tempestade', tipo:'flying' }, { voa:true }),
  P(778, 'Mimikyu', 'ghost fairy', 55, 90, 105, 96, 1.3,
    [golpe('Shadow Sneak','ghost','investida',60,1,{visual:'garra'}), golpe('Shadow Ball','ghost','projetil',70,.9,{tam:.5}), golpe('Play Rough','fairy','area',90,null,{visual:'redemoinho'}), golpe('Swords Dance','normal','buff',0)],
    { nome:'Abraço Assombrado', jeito:'tempestade' }),
  // ----- Novos (V11) -----
  P(1, 'Bulbasaur', 'grass poison', 60, 65, 65, 45, 1.1,
    [golpe('Razor Leaf','grass','projetil',42), golpe('Vine Whip','grass','investida',50,1,{visual:'corte'}), golpe('Seed Bomb','grass','chuva',80), golpe('Solar Beam','grass','raio',110,3,{largura:.7})],
    { nome:'Jardim Explosivo', jeito:'nova' }, { ocultarMalhas: /Vine/ }),
  P(4, 'Charmander', 'fire', 55, 65, 55, 75, 1.3,
    [golpe('Ember','fire','projetil',40), golpe('Fire Fang','fire','investida',65,1.1,{visual:'mordida'}), golpe('Flamethrower','fire','raio',85), golpe('Fire Spin','fire','area',70)],
    { nome:'Pequena Labareda', jeito:'meteoro' }),
  P(18, 'Pidgeot', 'normal flying', 83, 80, 75, 101, 1.9,
    [golpe('Air Slash','flying','projetil',60,.6,{visual:'corte'}), golpe('Gust','flying','area',60,null,{visual:'redemoinho'}), golpe('Brave Bird','flying','investida',110,2.2), golpe('Hurricane','flying','chuva',110)],
    { nome:'Furacão Supremo', jeito:'tempestade', tipo:'flying' }, { voa:true, asasBracos:true }),
  P(26, 'Raichu', 'electric', 60, 95, 65, 110, 1.5,
    [golpe('Thunder Shock','electric','projetil',40), golpe('Thunderbolt','electric','raio',90), golpe('Volt Tackle','electric','investida',110,2), golpe('Discharge','electric','area',80)],
    { nome:'Supervolt', jeito:'tempestade' }),
  P(38, 'Ninetales', 'fire', 73, 90, 95, 100, 1.4,
    [golpe('Ember','fire','projetil',40,null,{qtd:3, abertura:.18, tam:.3}), golpe('Flamethrower','fire','raio',90), golpe('Fire Spin','fire','area',85), golpe('Fire Blast','fire','chuva',110)],
    { nome:'Nove Caudas', jeito:'meteoro' }),
  P(76, 'Golem', 'rock ground', 80, 120, 95, 45, 1.7,
    [golpe('Rock Throw','rock','projetil',50,.8,{visual:'pedra'}), golpe('Rollout','rock','investida',90,1.4), golpe('Earthquake','ground','area',100), golpe('Stone Edge','rock','chuva',100)],
    { nome:'Avalanche', jeito:'meteoro', tipo:'rock' }),
  P(107, 'Hitmonchan', 'fighting', 60, 105, 95, 76, 1.4,
    [golpe('Mach Punch','fighting','projetil',40,.45,{visual:'punho'}), golpe('Thunder Punch','electric','investida',75,1.1,{visual:'punho'}), golpe('Ice Punch','ice','investida',75,1.1,{visual:'punho'}), golpe('Focus Blast','fighting','raio',110,3.2)],
    { nome:'Combo Elemental', jeito:'rajada', visual:'punho' }),
  P(123, 'Scyther', 'bug flying', 70, 110, 80, 105, 1.5,
    [golpe('Air Slash','flying','projetil',60,.6,{visual:'corte'}), golpe('X-Scissor','bug','investida',80,1.2,{visual:'corte'}), golpe('Bug Buzz','bug','area',90,null,{visual:'som'}), golpe('Swords Dance','normal','buff',0)],
    { nome:'Lâminas Velozes', jeito:'rajada', visual:'corte' }),
  P(142, 'Aerodactyl', 'rock flying', 80, 105, 70, 130, 1.8,
    [golpe('Ancient Power','rock','projetil',60,1.2,{visual:'rocha3d', qtd:3, abertura:.2}), golpe('Crunch','dark','investida',80,1.2,{visual:'mordida'}), golpe('Hyper Beam','normal','raio',130,4,{largura:.8}), golpe('Rock Slide','rock','chuva',80)],
    { nome:'Fúria Pré-Histórica', jeito:'meteoro', tipo:'rock' }, { voa:true, asasBracos:true }),
  P(157, 'Typhlosion', 'fire', 78, 110, 80, 100, 1.7,
    [golpe('Ember','fire','projetil',40), golpe('Flame Wheel','fire','investida',75,1.2), golpe('Flamethrower','fire','raio',90), golpe('Eruption','fire','area',120,4,{raio:6.5})],
    { nome:'Vulcão Ardente', jeito:'meteoro' }),
  P(160, 'Feraligatr', 'water', 85, 105, 95, 78, 2.2,
    [golpe('Water Pulse','water','projetil',60,.7,{tam:.5}), golpe('Crunch','dark','investida',80,1.2,{visual:'mordida'}), golpe('Hydro Pump','water','raio',110), golpe('Surf','water','area',90)],
    { nome:'Mandíbula das Marés', jeito:'nova', tipo:'water' }),
  P(181, 'Ampharos', 'electric', 90, 115, 90, 55, 1.6,
    [golpe('Thunder Shock','electric','projetil',40), golpe('Thunderbolt','electric','raio',90), golpe('Discharge','electric','area',80), golpe('Thunder','electric','chuva',110)],
    { nome:'Farol Elétrico', jeito:'tempestade' }),
  P(214, 'Heracross', 'bug fighting', 80, 125, 90, 85, 1.6,
    [golpe('Pin Missile','bug','projetil',25,.5,{visual:'agulhas', qtd:3, abertura:.12, tam:.3}), golpe('Megahorn','bug','investida',120,2.2), golpe('Focus Blast','fighting','raio',110,3.2), golpe('Earthquake','ground','area',100)],
    { nome:'Chifre Titânico', jeito:'rajada', tipo:'bug' }),
  P(229, 'Houndoom', 'dark fire', 75, 110, 70, 95, 1.6,
    [golpe('Ember','fire','projetil',40), golpe('Crunch','dark','investida',80,1.1,{visual:'mordida'}), golpe('Flamethrower','fire','raio',90), golpe('Fire Blast','fire','chuva',110)],
    { nome:'Cão Infernal', jeito:'meteoro', tipo:'fire' }),
  P(306, 'Aggron', 'steel rock', 70, 110, 140, 50, 2.3,
    [golpe('Rock Throw','rock','projetil',50,.8,{visual:'pedra'}), golpe('Iron Tail','steel','investida',100,1.6), golpe('Flash Cannon','steel','raio',80), golpe('Earthquake','ground','area',100)],
    { nome:'Fortaleza de Aço', jeito:'meteoro', tipo:'steel' }),
  P(376, 'Metagross', 'steel psychic', 80, 135, 100, 70, 2.2,
    [golpe('Bullet Punch','steel','projetil',40,.45,{visual:'punho'}), golpe('Meteor Mash','steel','investida',90,1.4,{visual:'punho'}), golpe('Flash Cannon','steel','raio',80), golpe('Psychic','psychic','chuva',100)],
    { nome:'Supercomputador', jeito:'meteoro', tipo:'steel' }),
  P(392, 'Infernape', 'fire fighting', 76, 104, 71, 108, 1.6,
    [golpe('Mach Punch','fighting','projetil',40,.45,{visual:'punho'}), golpe('Flare Blitz','fire','investida',120,2), golpe('Flamethrower','fire','raio',90), golpe('Close Combat','fighting','area',100,3)],
    { nome:'Macaco Flamejante', jeito:'rajada', tipo:'fire' }),
  P(461, 'Weavile', 'dark ice', 70, 120, 75, 125, 1.5,
    [golpe('Ice Shard','ice','projetil',40,.5,{qtd:2, abertura:.14}), golpe('Night Slash','dark','investida',80,1.1,{visual:'corte'}), golpe('Blizzard','ice','area',110,4.5,{raio:6.5}), golpe('Icicle Crash','ice','chuva',85)],
    { nome:'Garras Congelantes', jeito:'rajada', tipo:'ice', visual:'corte' }),
  P(475, 'Gallade', 'psychic fighting', 68, 125, 100, 80, 1.8,
    [golpe('Psycho Cut','psychic','projetil',70,.8,{visual:'corte'}), golpe('Sacred Sword','fighting','investida',90,1.3,{visual:'corte'}), golpe('Leaf Blade','grass','investida',90,1.3,{visual:'corte'}), golpe('Swords Dance','normal','buff',0)],
    { nome:'Espada Psíquica', jeito:'rajada', visual:'corte' }),
  P(724, 'Decidueye', 'grass ghost', 78, 107, 90, 70, 1.8,
    [golpe('Razor Leaf','grass','projetil',42), golpe('Spirit Shackle','ghost','projetil',80,1.1,{visual:'agulhas', tam:.4}), golpe('Shadow Sneak','ghost','investida',60,1,{visual:'garra'}), golpe('Leaf Storm','grass','area',110,4)],
    { nome:'Flechas Sombrias', jeito:'tempestade', tipo:'ghost' }),
  P(727, 'Incineroar', 'fire dark', 95, 115, 90, 60, 2.0,
    [golpe('Ember','fire','projetil',40), golpe('Darkest Lariat','dark','investida',85,1.3,{visual:'punho'}), golpe('Flare Blitz','fire','investida',120,2), golpe('Fire Blast','fire','chuva',110)],
    { nome:'Lariat Infernal', jeito:'rajada', tipo:'fire', visual:'punho' }),
  P(730, 'Primarina', 'water fairy', 80, 126, 116, 60, 1.9,
    [golpe('Moonblast','fairy','projetil',90,1.1,{visual:'lua', tam:.5}), golpe('Hydro Pump','water','raio',110), golpe('Sparkling Aria','water','area',90,null,{visual:'som'}), golpe('Calm Mind','psychic','buff',0)],
    { nome:'Canção do Oceano', jeito:'nova', tipo:'water' }),
  P(887, 'Dragapult', 'dragon ghost', 88, 120, 75, 142, 2.4,
    [golpe('Dragon Darts','dragon','projetil',50,.5,{visual:'agulhas', qtd:2, abertura:.12, tam:.35}), golpe('Phantom Force','ghost','investida',90,1.4,{visual:'garra'}), golpe('Dragon Pulse','dragon','raio',85), golpe('Draco Meteor','dragon','chuva',130,5)],
    { nome:'Esquadrão Fantasma', jeito:'rajada', tipo:'dragon' }, { voa:true }),
  // ----- Lendários (V11) -----
  P(146, 'Moltres', 'fire flying', 90, 125, 88, 90, 1.8,
    [golpe('Ember','fire','projetil',40,.5), golpe('Flamethrower','fire','raio',90), golpe('Heat Wave','fire','area',95), golpe('Sky Attack','flying','investida',110,2.4)],
    { nome:'Fênix Flamejante', jeito:'meteoro' }, { voa:true, asasBracos:true, lendario:true }),
  P(243, 'Raikou', 'electric', 90, 115, 90, 115, 1.9,
    [golpe('Thunder Fang','electric','investida',65,1.1,{visual:'mordida'}), golpe('Thunderbolt','electric','raio',90), golpe('Discharge','electric','area',80), golpe('Thunder','electric','chuva',110)],
    { nome:'Trovão Lendário', jeito:'tempestade' }, { lendario:true }),
  P(249, 'Lugia', 'psychic flying', 106, 100, 140, 110, 3.0,
    [golpe('Extrasensory','psychic','projetil',60,.7), golpe('Aeroblast','flying','raio',100,null,{largura:.8}), golpe('Hurricane','flying','chuva',110), golpe('Calm Mind','psychic','buff',0)],
    { nome:'Mergulho Abissal', jeito:'tempestade', tipo:'flying' }, { voa:true, asasBracos:true, lendario:true }),
  P(250, 'Ho-Oh', 'fire flying', 106, 130, 135, 90, 2.4,
    [golpe('Ember','fire','projetil',40,null,{qtd:3, abertura:.15, tam:.3}), golpe('Sacred Fire','fire','raio',100), golpe('Brave Bird','flying','investida',120,2.4), golpe('Fire Blast','fire','chuva',110)],
    { nome:'Arco-Íris Sagrado', jeito:'meteoro' }, { voa:true, asasBracos:true, lendario:true }),
  P(380, 'Latias', 'dragon psychic', 80, 110, 125, 110, 1.6,
    [golpe('Mist Ball','psychic','projetil',70,.8,{tam:.5}), golpe('Dragon Pulse','dragon','raio',85), golpe('Psychic','psychic','chuva',100), golpe('Recover','psychic','buff',0)],
    { nome:'Luz da Bruma', jeito:'rajada', tipo:'psychic' }, { voa:true, lendario:true }),
  P(381, 'Latios', 'dragon psychic', 80, 130, 100, 110, 1.8,
    [golpe('Luster Purge','psychic','projetil',70,.8,{tam:.5}), golpe('Dragon Pulse','dragon','raio',85), golpe('Draco Meteor','dragon','chuva',130,5), golpe('Calm Mind','psychic','buff',0)],
    { nome:'Brilho Eônico', jeito:'rajada', tipo:'dragon' }, { voa:true, lendario:true }),
  P(382, 'Kyogre', 'water', 100, 150, 140, 90, 1.4,
    [golpe('Water Pulse','water','projetil',60,.7,{tam:.55}), golpe('Origin Pulse','water','raio',110,null,{largura:.9}), golpe('Surf','water','area',90), golpe('Thunder','electric','chuva',110)],
    { nome:'Pulso Primordial', jeito:'nova', tipo:'water' }, { lendario:true }),
  P(383, 'Groudon', 'ground', 100, 150, 140, 90, 2.7,
    [golpe('Mud Shot','ground','projetil',55,.7), golpe('Fire Punch','fire','investida',75,1.2,{visual:'punho'}), golpe('Precipice Blades','ground','area',110,4,{raio:6.5}), golpe('Eruption','fire','chuva',120,4.5)],
    { nome:'Lâminas do Abismo', jeito:'meteoro', tipo:'ground' }, { lendario:true }),
  P(384, 'Rayquaza', 'dragon flying', 105, 150, 90, 95, 3.4,
    [golpe('Dragon Breath','dragon','projetil',55,.6), golpe('Dragon Ascent','flying','investida',120,2.2), golpe('Hyper Beam','normal','raio',130,4,{largura:.9}), golpe('Draco Meteor','dragon','chuva',130,5)],
    { nome:'Ascensão do Dragão', jeito:'meteoro', tipo:'dragon' }, { voa:true, lendario:true, escalaModelo:.85, enrolar:{ y:.4, x:-.13 } }),
  P(385, 'Jirachi', 'steel psychic', 100, 100, 100, 100, 1.3,
    [golpe('Swift','normal','projetil',40,.6,{visual:'estrelas', qtd:3, abertura:.18, tam:.32}), golpe('Flash Cannon','steel','raio',80), golpe('Iron Head','steel','investida',80,1.2), golpe('Doom Desire','steel','chuva',120,4.5)],
    { nome:'Desejo Estelar', jeito:'rajada', tipo:'steel' }, { voa:true, lendario:true }),
  P(483, 'Dialga', 'steel dragon', 100, 150, 110, 90, 3.0,
    [golpe('Dragon Breath','dragon','projetil',55,.6), golpe('Flash Cannon','steel','raio',80), golpe('Iron Tail','steel','investida',100,1.6), golpe('Roar of Time','dragon','area',120,4.5,{raio:7})],
    { nome:'Rugido do Tempo', jeito:'nova', tipo:'dragon' }, { lendario:true }),
  P(484, 'Palkia', 'water dragon', 90, 150, 110, 100, 3.0,
    [golpe('Spacial Rend','dragon','projetil',80,1,{visual:'corte', tam:.6}), golpe('Hydro Pump','water','raio',110), golpe('Aqua Tail','water','investida',90,1.4), golpe('Draco Meteor','dragon','chuva',130,5)],
    { nome:'Corte Espacial', jeito:'rajada', tipo:'dragon', visual:'corte' }, { lendario:true }),
  P(487, 'Giratina', 'ghost dragon', 150, 120, 120, 90, 3.2,
    [golpe('Shadow Ball','ghost','projetil',60,.8,{tam:.55}), golpe('Dragon Pulse','dragon','raio',85), golpe('Shadow Force','ghost','investida',120,2.5,{visual:'garra'}), golpe('Ominous Wind','ghost','area',80,null,{visual:'redemoinho'})],
    { nome:'Mundo Distorcido', jeito:'tempestade', tipo:'ghost' }, { lendario:true, escalaModelo:1.6 }),
  P(491, 'Darkrai', 'dark', 70, 135, 90, 125, 1.9,
    [golpe('Shadow Ball','ghost','projetil',60,.8,{tam:.5}), golpe('Dark Pulse','dark','raio',80), golpe('Dark Void','dark','area',80,null,{visual:'redemoinho'}), golpe('Nasty Plot','dark','buff',0)],
    { nome:'Pesadelo Sombrio', jeito:'tempestade' }, { voa:true, lendario:true }),
  P(493, 'Arceus', 'normal', 120, 120, 120, 120, 2.6,
    [golpe('Swift','normal','projetil',40,.6,{visual:'estrelas', qtd:3, abertura:.18, tam:.32}), golpe('Extreme Speed','normal','investida',80,1.1), golpe('Hyper Beam','normal','raio',130,4,{largura:.9}), golpe('Judgment','normal','chuva',120,4.5)],
    { nome:'Julgamento Divino', jeito:'meteoro', tipo:'normal' }, { lendario:true }),
  P(643, 'Reshiram', 'dragon fire', 100, 150, 110, 90, 2.9,
    [golpe('Dragon Breath','dragon','projetil',55,.6), golpe('Dragon Claw','dragon','investida',85,1.2,{visual:'garra'}), golpe('Blue Flare','fire','raio',120,3,{largura:.8}), golpe('Fusion Flare','fire','chuva',110)],
    { nome:'Chama Azul', jeito:'meteoro', tipo:'fire' }, { lendario:true }),
  P(644, 'Zekrom', 'dragon electric', 100, 150, 110, 90, 2.9,
    [golpe('Fusion Bolt','electric','projetil',70,.8,{tam:.5}), golpe('Bolt Strike','electric','investida',120,2.2), golpe('Thunderbolt','electric','raio',90), golpe('Thunder','electric','chuva',110)],
    { nome:'Trovão Cruzado', jeito:'tempestade', tipo:'electric' }, { lendario:true }),
  P(716, 'Xerneas', 'fairy', 126, 131, 98, 99, 2.8,
    [golpe('Moonblast','fairy','projetil',90,1.1,{visual:'lua', tam:.5}), golpe('Horn Leech','grass','investida',75,1.2), golpe('Dazzling Gleam','fairy','area',80), golpe('Geomancy','fairy','buff',0)],
    { nome:'Árvore da Vida', jeito:'nova', tipo:'fairy' }, { lendario:true }),
  P(717, 'Yveltal', 'dark flying', 126, 131, 98, 99, 2.6,
    [golpe('Air Slash','flying','projetil',60,.6,{visual:'corte'}), golpe('Oblivion Wing','flying','raio',90), golpe('Sucker Punch','dark','investida',70,1), golpe('Hurricane','flying','chuva',110)],
    { nome:'Asa do Esquecimento', jeito:'tempestade', tipo:'dark' }, { voa:true, asasBracos:true, lendario:true }),
  P(791, 'Solgaleo', 'psychic steel', 137, 137, 107, 97, 2.8,
    [golpe('Psyshock','psychic','projetil',70,.8), golpe('Sunsteel Strike','steel','investida',110,2), golpe('Flash Cannon','steel','raio',80), golpe('Psychic','psychic','chuva',100)],
    { nome:'Sol Abrasador', jeito:'meteoro', tipo:'steel' }, { lendario:true }),
  P(792, 'Lunala', 'psychic ghost', 137, 137, 107, 97, 2.8,
    [golpe('Shadow Ball','ghost','projetil',60,.8,{tam:.55}), golpe('Moongeist Beam','ghost','raio',100), golpe('Moonblast','fairy','projetil',90,1.1,{visual:'lua', tam:.5}), golpe('Psychic','psychic','chuva',100)],
    { nome:'Lua Fantasma', jeito:'tempestade', tipo:'ghost', visual:'lua' }, { voa:true, asasBracos:true, lendario:true }),
  P(800, 'Necrozma', 'psychic', 97, 113, 113, 79, 2.3,
    [golpe('Power Gem','rock','projetil',70,.8,{visual:'estrelas', tam:.4}), golpe('Psycho Cut','psychic','investida',70,1.1,{visual:'corte'}), golpe('Photon Geyser','psychic','raio',100,null,{largura:.8}), golpe('Calm Mind','psychic','buff',0)],
    { nome:'Raio Prismático', jeito:'rajada' }, { lendario:true }),
  // ----- Online: modelos grandes (10–16 MB) com animações de verdade -----
  P(658, 'Greninja', 'water dark', 72, 103, 69, 122, 1.9,
    [golpe('Water Shuriken','water','projetil',40,.45,{visual:'shuriken', qtd:2, abertura:.12}), golpe('Hydro Pump','water','raio',100), golpe('Night Slash','dark','investida',80,1.3,{visual:'corte'}), golpe('Surf','water','area',90)],
    { nome:'Shuriken Gigante', jeito:'rajada', visual:'shuriken' }, { online:true }),
  P(149, 'Dragonite', 'dragon flying', 91, 134, 100, 80, 2.4,
    [golpe('Dragon Breath','dragon','projetil',50), golpe('Hyper Beam','normal','raio',130,4,{largura:.9}), golpe('Hurricane','flying','chuva',110), golpe('Outrage','dragon','investida',120,2.5,{visual:'garra'})],
    { nome:'Draco Meteoro', jeito:'meteoro' }, { online:true, voa:true }),
  P(150, 'Mewtwo', 'psychic', 106, 154, 90, 130, 2.2,
    [golpe('Psystrike','psychic','projetil',55,.6), golpe('Psybeam','psychic','raio',90), golpe('Psychic','psychic','chuva',100), golpe('Aura Sphere','fighting','area',90)],
    { nome:'Destruição Psíquica', jeito:'tempestade' }, { online:true, voa:true }),
];
const POR_ID = Object.fromEntries(POKEMON.map(p => [p.id, p]));
const ICONE = id => `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/home/${id}.png`;
const URL_MODELO_ONLINE = id => `https://raw.githubusercontent.com/Sudhanshu-Ambastha/Pokemon-3D/main/models/glb/regular/${id}.glb`;

/* ----- Mapas -----
   chao: desenho do chão | luz: cor do sol | ceu: cor do céu/neblina
   perigo: zona que machuca (lava) ou escorrega (gelo)                   */
/* Arenas. Campos: nome, cor (botão), ceu/ceuCima (cores do céu embaixo/em cima), neblina, sol + solForca (luz principal),
   amb (luz ambiente), hemi [cor do céu, cor do chão] da luz ambiente, fora (cor do chão de fora ou null = sem chão),
   chao (textura do campo — texturaChao em arena.js/mapas.js), poeira (cor da poeira dos passos), perigo (o que o mapa tem de especial) */
const MAPAS = {
  estadio: { nome:'Estádio', cor:'#2f6fd6', ceu:0x9fd3ff, ceuCima:0x4a9be8, neblina:0xbfe3ff, sol:0xfff1d6, solForca:1.7, amb:.75, hemi:[0xdff0ff, 0x5a6b48], fora:0x8c8f96, chao:'grama', poeira:0xb8a98a },
  vulcao:  { nome:'Vulcão', cor:'#c0391b', ceu:0x2a1410, ceuCima:0x120806, neblina:0x3a1a10, sol:0xff9a5a, solForca:1.6, amb:.55, hemi:[0xffb38a, 0x2a1208], fora:0x1a1210, chao:'basalto', poeira:0x5a4a44, perigo:'lava' },
  gelo:    { nome:'Geleira', cor:'#5fb4e6', ceu:0x8fb4e0, ceuCima:0x0e1a48, neblina:0xa8c4e6, sol:0xd8e6ff, solForca:1.25, amb:.6, hemi:[0xb8d0ff, 0x5a7090], fora:0xdbe8f4, chao:'neve', poeira:0xffffff, perigo:'gelo' },
  floresta:{ nome:'Floresta Ancestral', cor:'#2f8a3e', ceu:0x9cc9a0, ceuCima:0x3f7a5a, neblina:0x86b090, sol:0xffe7b0, solForca:1.35, amb:.7, hemi:[0xcfeacb, 0x2f4a22], fora:0x2d4a24, chao:'musgo', poeira:0x6b5a3a, perigo:'lama' },
  cidade:  { nome:'Cidade Neon', cor:'#b03ad6', ceu:0x2a1240, ceuCima:0x07051a, neblina:0x1c0f33, sol:0x9fb4ff, solForca:.7, amb:.45, hemi:[0x7a6aff, 0x1a0f2a], fora:0x15121f, chao:'asfalto', rugosidade:.35, metal:.35, poeira:0x5a5a6a, perigo:'eletrico' },
  templo:  { nome:'Templo dos Dragões', cor:'#d68a2a', ceu:0xffc68a, ceuCima:0x7a4a8a, neblina:0xe8b088, sol:0xffc27a, solForca:1.5, amb:.65, hemi:[0xffd6a8, 0x4a2f22], fora:0x6a5446, chao:'pedra', poeira:0xa08a70, perigo:'runa' },
  ilhas:   { nome:'Ilhas Celestiais', cor:'#5ac8e8', ceu:0xbfe2ff, ceuCima:0x2f7ad8, neblina:0xb8dcf8, sol:0xfff4e0, solForca:1.35, amb:.6, hemi:[0xdff0ff, 0x4a7a3a], fora:null, chao:'nuvem', poeira:0xffffff, perigo:'vento' },
};

/* =========================================================
   ESTILOS DE LUTA (combos corpo a corpo)
   Cada golpe do combo: dur (s), ativo (momento do acerto, 0..1), alcance (m), avanco (m que o Pokémon avança),
   poder, hitstun (s que o alvo fica atordoado), membro (o que mexe na animação), efeito (visual do acerto),
   final: 'lancar' (joga para o alto), 'arremessar' (joga longe), 'derrubar', teleporte: true (aparece atrás antes)
   ========================================================= */
const H = (dur, poder, membro, efeito, extra) => Object.assign({ dur, ativo: .45, alcance: 1.6, avanco: .9, poder, hitstun: .5, membro, efeito }, extra || {});
const ESTILOS_LUTA = {
  equilibrado: { nome: 'Equilibrado', golpes: [
    H(.30, 16, 'bracoD', 'soco'), H(.30, 16, 'bracoE', 'soco'), H(.34, 18, 'perna', 'chute'),
    H(.46, 26, 'corpo', 'impacto', { final: 'arremessar', avanco: 1.4 })] },
  tecnico: { nome: 'Técnico', golpes: [
    H(.22, 12, 'bracoD', 'soco', { avanco: .7 }), H(.22, 12, 'bracoE', 'soco', { avanco: .7 }), H(.26, 14, 'perna', 'chute'),
    H(.28, 15, 'perna', 'chute', { giro: true }), H(.40, 22, 'bracoD', 'impacto', { final: 'lancar', avanco: 1.2 })] },
  pesado: { nome: 'Pesado', golpes: [
    H(.46, 24, 'bracoD', 'soco', { avanco: .6, alcance: 1.9 }), H(.50, 26, 'bracoE', 'soco', { avanco: .6, alcance: 1.9 }),
    H(.68, 36, 'corpo', 'terremoto', { final: 'arremessar', quebraGuarda: true, alcance: 2.3, avanco: .8 })] },
  sobrenatural: { nome: 'Sobrenatural', golpes: [
    H(.30, 15, 'bracoD', 'garra'), H(.34, 16, 'bracoE', 'garra', { teleporte: true }), H(.30, 16, 'bracoD', 'garra'),
    H(.46, 24, 'corpo', 'sombra', { final: 'arremessar', alcance: 2.2 })] },
  aereo: { nome: 'Aéreo', golpes: [
    H(.32, 16, 'cauda', 'corte', { giro: true }), H(.30, 16, 'bracoD', 'garra'),
    H(.42, 22, 'corpo', 'impacto', { final: 'lancar', avanco: 1.3 })] },
  rapido: { nome: 'Rápido', golpes: [
    H(.18, 9, 'bracoD', 'soco', { avanco: .6, hitstun: .42 }), H(.18, 9, 'bracoE', 'soco', { avanco: .6, hitstun: .42 }),
    H(.18, 9, 'perna', 'chute', { avanco: .6, hitstun: .42 }), H(.2, 10, 'cauda', 'corte', { giro: true, hitstun: .42 }),
    H(.34, 18, 'corpo', 'impacto', { final: 'arremessar', avanco: 1.6 })] },
  agressivo: { nome: 'Agressivo', golpes: [
    H(.28, 16, 'bracoD', 'garra', { avanco: 1.5 }), H(.28, 16, 'bracoE', 'garra', { avanco: 1.5 }),
    H(.34, 20, 'corpo', 'mordida', { avanco: 1.2 }), H(.42, 24, 'corpo', 'impacto', { final: 'lancar', avanco: 1.8 })] },
};
// Golpe aéreo (no ar) e golpe carregado (segurar o ataque) são iguais para todos, mudando só o visual pelo tipo.
const GOLPE_AEREO = H(.26, 13, 'bracoD', 'soco', { alcance: 2, avanco: .4, hitstun: .55 });
const GOLPE_CARREGADO = H(.5, 40, 'corpo', 'impacto', { final: 'arremessar', quebraGuarda: true, alcance: 2.4, avanco: 1.5 });

// Estilo, habilidades e roteiro da Ultimate de cada Pokémon
//   armadura: não recua com golpes fracos enquanto ataca | teleporte: a esquiva teletransporta
//   voo: pulo duplo e plana | guardaForte: guarda aguenta mais | subsRapida: substituição recarrega mais rápido
//   contraForte: janela maior para o contra-ataque (bloqueio perfeito)
const IDENTIDADE = {
  6:   { estilo: 'aereo', voo: true, roteiro: 'meteoro' },
  9:   { estilo: 'pesado', guardaForte: true, roteiro: 'onda' },
  3:   { estilo: 'pesado', armadura: true, roteiro: 'nova' },
  7:   { estilo: 'rapido', roteiro: 'onda' },
  25:  { estilo: 'rapido', roteiro: 'tempestade' },
  94:  { estilo: 'sobrenatural', teleporte: true, roteiro: 'ilusao' },
  65:  { estilo: 'sobrenatural', teleporte: true, roteiro: 'esfera' },
  68:  { estilo: 'pesado', armadura: true, roteiro: 'rajada' },
  59:  { estilo: 'agressivo', roteiro: 'meteoro' },
  130: { estilo: 'pesado', voo: true, armadura: true, roteiro: 'onda' },
  133: { estilo: 'rapido', roteiro: 'nova' },
  134: { estilo: 'rapido', guardaForte: true, roteiro: 'onda' },
  135: { estilo: 'rapido', roteiro: 'tempestade' },
  136: { estilo: 'rapido', roteiro: 'meteoro' },
  144: { estilo: 'aereo', voo: true, roteiro: 'tempestade' },
  145: { estilo: 'aereo', voo: true, roteiro: 'tempestade' },
  143: { estilo: 'pesado', armadura: true, guardaForte: true, roteiro: 'meteoro' },
  151: { estilo: 'sobrenatural', teleporte: true, voo: true, roteiro: 'esfera' },
  196: { estilo: 'sobrenatural', teleporte: true, roteiro: 'esfera' },
  197: { estilo: 'sobrenatural', guardaForte: true, roteiro: 'ilusao' },
  212: { estilo: 'tecnico', roteiro: 'rajada' },
  248: { estilo: 'pesado', armadura: true, roteiro: 'meteoro' },
  253: { estilo: 'tecnico', subsRapida: true, roteiro: 'rajada' },
  254: { estilo: 'tecnico', roteiro: 'rajada' },
  257: { estilo: 'tecnico', roteiro: 'meteoro' },
  260: { estilo: 'pesado', guardaForte: true, roteiro: 'onda' },
  282: { estilo: 'sobrenatural', teleporte: true, roteiro: 'esfera' },
  359: { estilo: 'tecnico', roteiro: 'rajada' },
  445: { estilo: 'agressivo', roteiro: 'meteoro' },
  448: { estilo: 'tecnico', subsRapida: true, contraForte: true, roteiro: 'esfera' },
  571: { estilo: 'tecnico', teleporte: true, roteiro: 'ilusao' },
  635: { estilo: 'aereo', voo: true, roteiro: 'meteoro' },
  700: { estilo: 'rapido', roteiro: 'esfera' },
  715: { estilo: 'aereo', voo: true, roteiro: 'tempestade' },
  778: { estilo: 'sobrenatural', teleporte: true, roteiro: 'ilusao' },
  658: { estilo: 'tecnico', subsRapida: true, roteiro: 'rajada' },
  149: { estilo: 'aereo', voo: true, armadura: true, roteiro: 'meteoro' },
  150: { estilo: 'sobrenatural', teleporte: true, voo: true, roteiro: 'esfera' },
  // ----- Novos (V11) -----
  1:   { estilo: 'equilibrado', roteiro: 'nova' },
  4:   { estilo: 'rapido', roteiro: 'meteoro' },
  18:  { estilo: 'aereo', voo: true, roteiro: 'tempestade' },
  26:  { estilo: 'rapido', roteiro: 'tempestade' },
  38:  { estilo: 'sobrenatural', teleporte: true, roteiro: 'ilusao' },
  76:  { estilo: 'pesado', armadura: true, guardaForte: true, roteiro: 'meteoro' },
  107: { estilo: 'tecnico', contraForte: true, roteiro: 'rajada' },
  123: { estilo: 'tecnico', subsRapida: true, roteiro: 'rajada' },
  142: { estilo: 'aereo', voo: true, roteiro: 'meteoro' },
  157: { estilo: 'agressivo', roteiro: 'meteoro' },
  160: { estilo: 'pesado', guardaForte: true, roteiro: 'onda' },
  181: { estilo: 'equilibrado', roteiro: 'tempestade' },
  214: { estilo: 'pesado', armadura: true, roteiro: 'rajada' },
  229: { estilo: 'agressivo', roteiro: 'meteoro' },
  306: { estilo: 'pesado', armadura: true, guardaForte: true, roteiro: 'meteoro' },
  376: { estilo: 'pesado', armadura: true, roteiro: 'esfera' },
  392: { estilo: 'agressivo', subsRapida: true, roteiro: 'rajada' },
  461: { estilo: 'rapido', subsRapida: true, roteiro: 'rajada' },
  475: { estilo: 'tecnico', contraForte: true, roteiro: 'rajada' },
  724: { estilo: 'tecnico', teleporte: true, roteiro: 'ilusao' },
  727: { estilo: 'pesado', armadura: true, roteiro: 'rajada' },
  730: { estilo: 'sobrenatural', guardaForte: true, roteiro: 'onda' },
  887: { estilo: 'rapido', voo: true, teleporte: true, roteiro: 'ilusao' },
  // ----- Lendários (V11) -----
  146: { estilo: 'aereo', voo: true, roteiro: 'meteoro' },
  243: { estilo: 'rapido', roteiro: 'tempestade' },
  249: { estilo: 'aereo', voo: true, guardaForte: true, roteiro: 'onda' },
  250: { estilo: 'aereo', voo: true, armadura: true, roteiro: 'meteoro' },
  380: { estilo: 'sobrenatural', voo: true, teleporte: true, roteiro: 'esfera' },
  381: { estilo: 'sobrenatural', voo: true, teleporte: true, roteiro: 'esfera' },
  382: { estilo: 'pesado', armadura: true, guardaForte: true, roteiro: 'onda' },
  383: { estilo: 'pesado', armadura: true, roteiro: 'meteoro' },
  384: { estilo: 'aereo', voo: true, armadura: true, roteiro: 'meteoro' },
  385: { estilo: 'sobrenatural', voo: true, teleporte: true, roteiro: 'esfera' },
  483: { estilo: 'pesado', armadura: true, guardaForte: true, roteiro: 'nova' },
  484: { estilo: 'tecnico', armadura: true, roteiro: 'rajada' },
  487: { estilo: 'sobrenatural', armadura: true, teleporte: true, roteiro: 'ilusao' },
  491: { estilo: 'sobrenatural', voo: true, teleporte: true, roteiro: 'ilusao' },
  493: { estilo: 'equilibrado', armadura: true, guardaForte: true, roteiro: 'esfera' },
  643: { estilo: 'agressivo', armadura: true, roteiro: 'meteoro' },
  644: { estilo: 'agressivo', armadura: true, roteiro: 'tempestade' },
  716: { estilo: 'sobrenatural', guardaForte: true, roteiro: 'esfera' },
  717: { estilo: 'aereo', voo: true, armadura: true, roteiro: 'tempestade' },
  791: { estilo: 'pesado', armadura: true, roteiro: 'meteoro' },
  792: { estilo: 'aereo', voo: true, teleporte: true, roteiro: 'ilusao' },
  800: { estilo: 'tecnico', contraForte: true, roteiro: 'esfera' },
};
for (const p of POKEMON) Object.assign(p, { estilo: 'equilibrado', roteiro: 'nova' }, IDENTIDADE[p.id] || {});
