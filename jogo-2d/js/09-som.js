/* =========================================================
   SOM (sintetizado, sem arquivos)
   ========================================================= */
let AC = null, master = null, musicBus = null, musicStep = 0, musicNext = 0;
function audioInit(){
  if (!AC) { try {
    AC = new (window.AudioContext || window.webkitAudioContext)();
    master = AC.createGain(); master.gain.value = .32; master.connect(AC.destination);
    musicBus = AC.createGain(); musicBus.gain.value = .16; musicBus.connect(master);
  } catch(e) { AC = null; } }
  if (AC && AC.state === 'suspended') AC.resume().catch(()=>{});
}
addEventListener('pointerdown', audioInit); addEventListener('keydown', audioInit);
function tone(f, dur, type='square', vol=.2, slideTo=null, delay=0, dest=null){
  if (!AC) return; const t = AC.currentTime + delay;
  const o = AC.createOscillator(), g = AC.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t); if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20,slideTo), t+dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.001, t+dur);
  o.connect(g); g.connect(dest || master); o.start(t); o.stop(t+dur+.02);
}
let noiseBuf = null;
function noise(dur, vol=.2, freq=1500, delay=0, dest=null){
  if (!AC) return; const t = AC.currentTime + delay;
  if (!noiseBuf) { noiseBuf = AC.createBuffer(1, AC.sampleRate, AC.sampleRate); const d = noiseBuf.getChannelData(0); for (let i=0;i<d.length;i++) d[i] = Math.random()*2-1; }
  const s = AC.createBufferSource(), f = AC.createBiquadFilter(), g = AC.createGain();
  s.buffer = noiseBuf; f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = .8;
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.001, t+dur);
  s.connect(f); f.connect(g); g.connect(dest || master); s.start(t); s.stop(t+dur+.02);
}
const sfxLast = {};
function sfx(n){
  if (!AC || !S.som) return;
  const now = performance.now(); if (now - (sfxLast[n]||0) < 45) return; sfxLast[n] = now;
  switch (n) {
    case 'shoot': tone(rand(520,700), .09, 'square', .07, 260); break;
    case 'swing': noise(.12, .14, 2500); break;
    case 'beam': tone(180, .45, 'sawtooth', .09, 900); noise(.4, .08, 1800); break;
    case 'charge': tone(150, .5, 'sawtooth', .05, 500); break;
    case 'hit': noise(.09, .22, 1200); tone(200, .08, 'square', .08, 90); break;
    case 'super': noise(.12, .26, 900); tone(880, .14, 'square', .08, 1500); break;
    case 'crit': tone(1200, .1, 'square', .08, 2000); noise(.1, .2, 3000); break;
    case 'boom': noise(.45, .3, 500); tone(110, .35, 'sine', .3, 35); break;
    case 'dash': noise(.2, .14, 3500); break;
    case 'jump': tone(300, .16, 'square', .07, 760); break;
    case 'land': noise(.15, .2, 400); tone(90, .15, 'sine', .25, 40); break;
    case 'heal': [523,659,784].forEach((f,i) => tone(f, .14, 'triangle', .12, null, i*.07)); break;
    case 'buff': [392,523,659,784].forEach((f,i) => tone(f, .12, 'square', .06, null, i*.05)); break;
    case 'spawn': tone(880, .07, 'square', .07); tone(1320, .12, 'square', .07, null, .07); break;
    case 'recall': tone(900, .2, 'square', .06, 300); break;
    case 'faint': tone(620, .55, 'square', .08, 70); break;
    case 'pickup': tone(660, .08, 'square', .08); tone(990, .12, 'square', .08, null, .07); break;
    case 'block': tone(1500, .08, 'triangle', .12); tone(1100, .1, 'triangle', .1, null, .05); break;
    case 'click': tone(1100, .035, 'square', .04); break;
    case 'combo': [660,880,1320].forEach((f,i) => tone(f, .1, 'square', .08, null, i*.05)); noise(.15, .15, 2500); break;
    case 'perfeita': tone(1760, .25, 'sine', .14, 2600); tone(2640, .2, 'sine', .08, null, .05); break;
    case 'ult': tone(110, .9, 'sawtooth', .12, 880); noise(.8, .15, 1200); [523,659,784,1047].forEach((f,i) => tone(f, .25, 'square', .07, null, .3 + i*.08)); break;
    case 'shatter': noise(.25, .25, 4000); tone(2000, .15, 'triangle', .07, 900); break;
    case 'rumble': noise(1.2, .3, 120); break;
    case 'thunder': noise(1.0, .35, 300); tone(60, .8, 'sine', .25, 30); break;
    case 'cheer': noise(1.2, .12, 1800); noise(1.0, .1, 900, .1); break;
    case 'tp': tone(400, .25, 'sine', .1, 1600); break;
    case 'trap': tone(220, .12, 'square', .08); tone(220, .12, 'square', .08, null, .2); break;
    case 'alarm': tone(880, .15, 'square', .07); tone(660, .15, 'square', .07, null, .17); break;
    case 'win': [523,659,784,1047,784,1047].forEach((f,i) => tone(f, .16, 'square', .08, null, i*.12)); break;
    case 'lose': [523,466,415,349].forEach((f,i) => tone(f, .25, 'triangle', .12, null, i*.2)); break;
    case 'go': tone(523, .1, 'square', .08); tone(784, .2, 'square', .08, null, .1); break;
  }
}
const midi = n => 440*Math.pow(2,(n-69)/12);
const CHORDS = [[57,60,64],[53,57,60],[48,52,55],[55,59,62]];
function musicTick(){
  if (!AC || !G || !S.musica || G.paused || G.over) return;
  const step = 60/132/4;
  if (musicNext < AC.currentTime) musicNext = AC.currentTime + .05;
  while (musicNext < AC.currentTime + .2) {
    const s = musicStep % 16, ch = CHORDS[Math.floor(musicStep/16) % 4], d = musicNext - AC.currentTime;
    if ([0,3,6,8,11,14].includes(s)) tone(midi(ch[0]-12), step*1.6, 'triangle', .5, null, d, musicBus);
    if (s % 2 === 0) tone(midi(ch[(s/2)%3] + 12), step*.9, 'square', .12, null, d, musicBus);
    if (s % 4 === 2) noise(.04, .25, 7000, d, musicBus);
    if (s % 8 === 0) tone(90, .12, 'sine', .7, 40, d, musicBus);
    musicStep++; musicNext += step;
  }
}
setInterval(musicTick, 50);

