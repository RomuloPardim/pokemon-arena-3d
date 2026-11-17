"use strict";
/* =========================================================
   DADOS
   ========================================================= */
const SPRITE = id => `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`;

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

/* ----- Golpes ----- */
const KIND_DEF = {
  proj:{speed:650,r:10,range:620}, multi:{count:3,spread:.32,speed:620,r:8,range:480},
  beam:{range:680,w:18,windup:0}, nova:{radius:150}, melee:{range:95,arc:1.7},
  dash:{dist:260,speed:1150}, zone:{radius:90,delay:.6,range:560}, pool:{radius:85,dur:4,range:460},
  heal:{amount:.35}, buff:{dur:6}, leap:{range:400,radius:110}
};
const KIND_PT = {proj:'Projétil',multi:'Rajada',beam:'Raio',nova:'Área ao redor',melee:'Corpo a corpo',dash:'Investida',zone:'Área à distância',pool:'Zona',heal:'Cura',buff:'Fortalecer',leap:'Salto'};
const MV = {};
function mv(n,t,k,p,cd,o={}){ MV[n] = Object.assign({n,t,k,p,cd}, KIND_DEF[k], o); }
// Fogo
mv('Ember','fire','proj',40,.7,{burn:.1});
mv('Flamethrower','fire','proj',75,1.8,{r:14,burn:.25});
mv('Fire Blast','fire','zone',110,6,{radius:115,delay:.7,burn:.4});
mv('Flare Blitz','fire','dash',100,5,{recoil:.15,burn:.2});
mv('Heat Wave','fire','nova',70,5,{radius:170,burn:.2});
// Água
mv('Water Gun','water','proj',40,.7);
mv('Hydro Pump','water','beam',110,5,{windup:.35,w:24});
mv('Surf','water','nova',85,5,{radius:190});
mv('Aqua Jet','water','dash',50,3.5);
mv('Water Shuriken','water','multi',35,1.1,{speed:800});
// Planta
mv('Razor Leaf','grass','multi',30,1);
mv('Solar Beam','grass','beam',130,7,{windup:.8,w:28});
mv('Giga Drain','grass','proj',70,3,{drain:.5,r:13});
mv('Energy Ball','grass','proj',85,2.2,{r:15});
mv('Leaf Blade','grass','melee',90,1.6);
// Elétrico
mv('Thunder Shock','electric','proj',40,.7,{stun:.08,speed:850});
mv('Thunderbolt','electric','proj',85,2.2,{speed:950,stun:.2});
mv('Thunder','electric','zone',115,6,{delay:.8,stun:.4});
mv('Wild Charge','electric','dash',85,4.5,{recoil:.1});
mv('Discharge','electric','nova',80,5,{stun:.3});
// Gelo
mv('Ice Beam','ice','beam',90,3.5,{slow:.6});
mv('Blizzard','ice','multi',55,5,{count:5,spread:.6,slow:.4});
mv('Ice Shard','ice','proj',40,.7,{speed:900});
// Lutador
mv('Close Combat','fighting','melee',120,4.5,{range:105});
mv('Aura Sphere','fighting','proj',80,2.5,{homing:true,r:14,speed:520});
mv('Cross Chop','fighting','melee',100,3);
mv('Mach Punch','fighting','dash',40,2.2,{dist:200});
// Veneno
mv('Poison Jab','poison','melee',80,2,{poison:.3});
mv('Sludge Bomb','poison','proj',90,3,{poison:.3,r:14,leavePool:true});
mv('Toxic','poison','pool',25,7,{dur:5,poison:1});
mv('Poison Fang','poison','melee',50,1,{poison:.4});
// Terrestre
mv('Earthquake','ground','nova',100,6,{radius:220});
mv('Mud Shot','ground','proj',55,1.2,{slow:.5});
mv('Bulldoze','ground','zone',60,3.5,{slow:.8,delay:.45});
// Voador
mv('Air Slash','flying','multi',45,2);
mv('Brave Bird','flying','dash',120,5,{recoil:.2});
mv('Hurricane','flying','zone',110,6,{radius:110});
mv('Gust','flying','proj',40,.7);
// Psíquico
mv('Confusion','psychic','proj',45,.7);
mv('Psybeam','psychic','beam',65,2);
mv('Psychic','psychic','zone',90,3,{delay:.35,radius:80});
mv('Psystrike','psychic','beam',110,4.5,{w:26,windup:.3});
// Fantasma / Sombrio
mv('Shadow Ball','ghost','proj',80,2,{r:16});
mv('Hex','ghost','nova',65,4);
mv('Lick','ghost','melee',30,.7,{stun:.2});
mv('Dark Pulse','dark','nova',80,4.5);
mv('Crunch','dark','melee',80,1.6);
mv('Bite','dark','melee',55,.8);
mv('Night Slash','dark','dash',70,3.5);
// Pedra
mv('Rock Slide','rock','multi',75,3,{count:4,spread:.5,r:12});
mv('Stone Edge','rock','zone',100,4.5,{radius:70,delay:.5});
mv('Rock Throw','rock','proj',45,.8,{r:14});
// Dragão
mv('Dragon Pulse','dragon','proj',85,2.2,{r:16});
mv('Draco Meteor','dragon','zone',130,7,{radius:130,delay:1});
mv('Outrage','dragon','nova',110,6,{radius:160});
mv('Dragon Rush','dragon','dash',100,4.5);
mv('Dragon Breath','dragon','proj',55,.9,{stun:.15});
// Aço
mv('Flash Cannon','steel','beam',80,3);
mv('Bullet Punch','steel','dash',45,2,{dist:180,speed:1400});
mv('Iron Head','steel','melee',80,2,{stun:.2});
// Fada
mv('Moonblast','fairy','proj',95,2.6,{r:15});
mv('Dazzling Gleam','fairy','nova',80,4);
mv('Fairy Wind','fairy','proj',40,.7);
// Normal / Inseto
mv('Hyper Beam','normal','beam',150,9,{windup:.9,w:34});
mv('Body Slam','normal','dash',85,3,{stun:.3});
mv('Extreme Speed','normal','dash',80,2.5,{speed:1700});
mv('Quick Attack','normal','dash',40,1.5,{dist:180});
mv('Hyper Voice','normal','nova',90,4);
mv('Recover','normal','heal',0,12);
mv('Rest','normal','heal',0,14,{amount:.5});
mv('X-Scissor','bug','melee',80,1.8);
// Golpes da versão 3
mv('Meteor Mash','steel','proj',90,2.5,{r:15});
mv('Zen Headbutt','psychic','melee',80,1.8,{stun:.2});
mv('Dragon Claw','dragon','melee',80,1.4);
mv('Drill Peck','flying','dash',80,3);
mv('Wood Hammer','grass','dash',120,5,{recoil:.2});
mv('Ice Punch','ice','melee',75,1.6,{slow:.4});
mv('Icicle Crash','ice','zone',85,3.5,{radius:80,delay:.5,slow:.3});
mv('Fire Fang','fire','melee',65,1.2,{burn:.2});
mv('Darkest Lariat','dark','nova',85,4,{radius:140});
mv('Shadow Sneak','ghost','dash',40,2,{dist:220,speed:1500});
mv('Shadow Claw','ghost','melee',75,1.4);
mv('Play Rough','fairy','melee',90,2.2);
// Fortalecer: atk = aumenta o dano, spd = aumenta a velocidade, healPct = cura junto
mv('Swords Dance','normal','buff',0,12,{atk:true,dur:6});
mv('Dragon Dance','dragon','buff',0,12,{atk:true,spd:true,dur:6});
mv('Calm Mind','psychic','buff',0,12,{atk:true,healPct:.1,dur:6});
// Salto: pula até o alvo (invencível no ar) e causa dano em área ao cair
mv('Fly','flying','leap',90,6,{range:420,radius:110});
mv('Bounce','flying','leap',85,5,{range:380,radius:100,stun:.3});
mv('Heavy Slam','steel','leap',100,6,{range:320,radius:130});
mv('Bug Buzz','bug','nova',90,4.5);

/* ----- Pokémon: [id, nome, tipos, hp, ataque, defesa, velocidade, golpes] ----- */
const POKES = [
 [3,'Venusaur','grass poison',80,100,100,80,['Razor Leaf','Sludge Bomb','Giga Drain','Solar Beam']],
 [6,'Charizard','fire flying',78,109,84,100,['Ember','Flamethrower','Air Slash','Fire Blast']],
 [9,'Blastoise','water',79,85,105,78,['Water Gun','Surf','Hydro Pump','Ice Beam']],
 [18,'Pidgeot','normal flying',83,80,73,101,['Gust','Fly','Air Slash','Hurricane']],
 [24,'Arbok','poison',60,95,79,80,['Poison Fang','Crunch','Sludge Bomb','Toxic']],
 [25,'Pikachu','electric',45,65,48,110,['Thunder Shock','Quick Attack','Thunderbolt','Thunder']],
 [26,'Raichu','electric',60,90,68,110,['Thunder Shock','Wild Charge','Thunderbolt','Discharge']],
 [28,'Sandslash','ground',75,100,72,65,['Mud Shot','X-Scissor','Earthquake','Stone Edge']],
 [36,'Clefable','fairy',95,95,85,60,['Fairy Wind','Moonblast','Dazzling Gleam','Recover']],
 [57,'Primeape','fighting',65,105,65,95,['Mach Punch','Cross Chop','Close Combat','Rock Slide']],
 [59,'Arcanine','fire',90,110,80,95,['Ember','Extreme Speed','Flamethrower','Flare Blitz']],
 [62,'Poliwrath','water fighting',90,95,92,70,['Water Gun','Close Combat','Surf','Hydro Pump']],
 [65,'Alakazam','psychic',55,135,70,120,['Confusion','Psybeam','Psychic','Recover']],
 [68,'Machamp','fighting',90,130,82,55,['Mach Punch','Cross Chop','Close Combat','Stone Edge']],
 [76,'Golem','rock ground',80,110,100,45,['Rock Throw','Rock Slide','Earthquake','Stone Edge']],
 [94,'Gengar','ghost poison',60,130,68,110,['Lick','Shadow Ball','Sludge Bomb','Hex']],
 [95,'Onix','rock ground',55,60,102,70,['Rock Throw','Bulldoze','Rock Slide','Earthquake']],
 [130,'Gyarados','water flying',95,125,100,81,['Bite','Aqua Jet','Hydro Pump','Outrage']],
 [131,'Lapras','water ice',130,85,95,60,['Water Gun','Ice Beam','Surf','Blizzard']],
 [135,'Jolteon','electric',65,110,80,130,['Thunder Shock','Thunderbolt','Shadow Ball','Thunder']],
 [143,'Snorlax','normal',160,110,110,30,['Body Slam','Heavy Slam','Earthquake','Rest']],
 [149,'Dragonite','dragon flying',91,134,100,80,['Dragon Breath','Extreme Speed','Hurricane','Draco Meteor']],
 [150,'Mewtwo','psychic',106,154,90,130,['Confusion','Aura Sphere','Psystrike','Recover']],
 [151,'Mew','psychic',100,100,100,100,['Confusion','Aura Sphere','Thunderbolt','Psychic']],
 [197,'Umbreon','dark',95,65,130,65,['Bite','Dark Pulse','Toxic','Rest']],
 [212,'Scizor','bug steel',70,130,90,65,['Bullet Punch','X-Scissor','Iron Head','Night Slash']],
 [248,'Tyranitar','rock dark',100,134,105,61,['Bite','Rock Slide','Stone Edge','Earthquake']],
 [254,'Sceptile','grass',70,105,75,120,['Razor Leaf','Leaf Blade','Dragon Pulse','Energy Ball']],
 [257,'Blaziken','fire fighting',80,120,72,80,['Ember','Flare Blitz','Close Combat','Brave Bird']],
 [260,'Swampert','water ground',100,110,90,60,['Water Gun','Mud Shot','Surf','Earthquake']],
 [282,'Gardevoir','psychic fairy',68,125,100,80,['Fairy Wind','Psychic','Moonblast','Dazzling Gleam']],
 [445,'Garchomp','dragon ground',108,130,90,102,['Mud Shot','Dragon Rush','Earthquake','Outrage']],
 [448,'Lucario','fighting steel',70,115,70,90,['Bullet Punch','Aura Sphere','Close Combat','Flash Cannon']],
 [658,'Greninja','water dark',72,103,71,122,['Water Shuriken','Night Slash','Dark Pulse','Hydro Pump']],
 // ----- Novos na versão 3 -----
 [373,'Salamence','dragon flying',95,135,85,100,['Dragon Breath','Dragon Claw','Fly','Draco Meteor']],
 [376,'Metagross','steel psychic',80,135,105,70,['Bullet Punch','Meteor Mash','Zen Headbutt','Heavy Slam']],
 [389,'Torterra','grass ground',95,109,95,56,['Razor Leaf','Wood Hammer','Earthquake','Stone Edge']],
 [392,'Infernape','fire fighting',76,104,71,108,['Ember','Mach Punch','Close Combat','Flare Blitz']],
 [395,'Empoleon','water steel',84,111,96,60,['Water Gun','Drill Peck','Flash Cannon','Hydro Pump']],
 [461,'Weavile','dark ice',70,120,70,125,['Ice Shard','Night Slash','Icicle Crash','Swords Dance']],
 [612,'Haxorus','dragon',76,147,80,97,['Dragon Claw','Dragon Dance','Outrage','Earthquake']],
 [700,'Sylveon','fairy',95,110,115,60,['Fairy Wind','Moonblast','Hyper Voice','Calm Mind']],
 [727,'Incineroar','fire dark',95,115,90,60,['Fire Fang','Darkest Lariat','Flare Blitz','Bounce']],
 [778,'Mimikyu','ghost fairy',55,90,105,96,['Shadow Sneak','Shadow Claw','Play Rough','Swords Dance']],
].map(([id,name,types,hp,atk,def,spe,moves]) => ({id,name,types:types.split(' '),hp,atk,def,spe,moves}));
const BYID = Object.fromEntries(POKES.map(p => [p.id,p]));


