/** Original generative score and synthesis; see MUSIC-LICENSE.md. No external audio. */
export const MUSIC_META = Object.freeze({
  title: '옥상에 남은 오후', bpm: 76, bars: 64, license: 'CC0-1.0',
  description: '옥상일지를 위해 만든 느긋한 일렉트릭 피아노 · 베이스 · 스윙 비트',
});
const BEAT = 60 / MUSIC_META.bpm;
const BAR = BEAT * 4;
const CHORDS = {
  dm: {root: 38, notes: [53, 57, 60, 64]},
  g: {root: 43, notes: [53, 59, 64, 69]},
  c: {root: 36, notes: [52, 55, 59, 62]},
  am: {root: 45, notes: [55, 59, 60, 64]},
  f: {root: 41, notes: [57, 60, 64, 67]},
  em: {root: 40, notes: [55, 59, 62, 66]},
};
const VERSE = ['dm', 'g', 'c', 'am', 'f', 'em', 'dm', 'g'];
const MIDDLE = ['f', 'g', 'em', 'am', 'dm', 'g', 'c', 'c'];
const BRIDGE = ['am', 'am', 'f', 'f', 'dm', 'em', 'g', 'g'];
const frequency = midi => 440 * 2 ** ((midi - 69) / 12);
function randomFor(seed) {
  let value = seed >>> 0;
  return () => {
    value += 0x6D2B79F5;
    let n = Math.imul(value ^ value >>> 15, 1 | value);
    n ^= n + Math.imul(n ^ n >>> 7, 61 | n);
    return ((n ^ n >>> 14) >>> 0) / 4294967296;
  };
}

/** A deterministic, 64-bar arrangement. Times and durations are in musical beats. */
export function composeBar(index) {
  const bar = ((Math.floor(index) % 64) + 64) % 64;
  const cycle = Math.floor(Math.max(0, index) / 64);
  const random = randomFor(20413 + index * 977);
  const section = bar < 8 ? 'intro' : bar < 24 ? 'verse' : bar < 40 ? 'window' : bar < 48 ? 'bridge' : 'home';
  const sequence = section === 'window' ? MIDDLE : section === 'bridge' ? BRIDGE : VERSE;
  const chord = CHORDS[sequence[bar % 8]];
  const notes = [];
  const add = (instrument, beat, duration, velocity, midi) => notes.push({instrument, beat, duration, velocity, ...(midi === undefined ? {} : {midi})});
  chord.notes.forEach((midi, i) => add('keys', i * .024, 3.75, .43 + random() * .055, midi));
  if (section !== 'intro' && section !== 'bridge' && bar % 2 === 1) {
    chord.notes.slice(1).forEach((midi, i) => add('keys', 2.72 + i * .018, 1.05, .23, midi));
  }
  add('bass', .01, 1.65, .63, chord.root);
  if (section !== 'bridge') add('bass', 2.03, 1.15, .49, bar % 3 === 0 ? chord.root + 7 : chord.root + 12);
  if (bar % 4 === 3 && section !== 'intro') add('bass', 3.56, .34, .32, chord.root + 7);
  // The first eight bars open gradually; the bridge gives the rooftop room to breathe.
  if (section !== 'intro' || bar >= 4 || cycle > 0) {
    add('kick', 0, .65, section === 'bridge' ? .45 : .72);
    if (section !== 'bridge') {
      add('kick', 2 + (bar % 4 === 2 ? .54 : 0), .65, .56);
      add('snare', 1.018, .22, .40);
      add('snare', 3.025, .22, .37);
      if (bar % 8 === 6) add('snare', 3.76, .13, .12);
    } else add('snare', 3.025, .22, .19);
    for (let step = 0; step < 8; step++) {
      if (section === 'bridge' && step % 2) continue;
      const beat = step * .5 + (step % 2 ? .07 : 0);
      add('hat', beat, step === 7 && bar % 4 === 3 ? .3 : .11, .14 + random() * .10);
    }
    if (bar % 4 === 1 && section !== 'bridge') add('hat', 3.81, .07, .10);
  }
  // Deliberate rests and related three-note phrases, varied every chorus.
  if (section !== 'intro' && (bar + cycle) % 4 !== 0 && section !== 'bridge') {
    const contour = (Math.floor(bar / 4) + cycle) % 3;
    const line = contour === 0 ? [2, 3, 1] : contour === 1 ? [3, 1, 2] : [1, 2, 0];
    [1.58, 2.32, 3.08].forEach((beat, i) => {
      if (i === 2 && random() < .42) return;
      add('melody', beat, i === 2 ? 1.25 : .62, .23 + random() * .065, chord.notes[line[i]] + 12);
    });
  }
  return {section, chord: sequence[bar % 8], notes: notes.sort((a, b) => a.beat - b.beat)};
}

/**
 * Construct without making sound or an AudioContext. Call enable methods from a click.
 * Optional contextFactory is for hosts/tests; the browser default needs no arguments.
 */
export function createAudioEngine({contextFactory} = {}) {
  const AudioContextClass = globalThis.AudioContext || globalThis.webkitAudioContext;
  let available = !!(contextFactory || AudioContextClass);
  let context = null, master, musicBus, ambientBus, noise, fireNoise;
  let musicEnabled = false, ambientEnabled = false, hidden = false, disposed = false;
  let volume = .55, weather = 'clear', hour = 12, scheduler = null, sleepTimer = null;
  let nextBar = 0, nextBarTime = 0, ambient = null;
  const voices = new Set();
  const graph = [];
  const getState = () => ({musicEnabled, ambientEnabled, volume, available: available && !disposed, trackTitle: MUSIC_META.title});
  function target(parameter, value, time, constant = .04) {
    parameter.cancelScheduledValues(time);
    parameter.setTargetAtTime(value, time, constant);
  }
  function buildNoise() {
    const length = Math.ceil(context.sampleRate * 4);
    noise = context.createBuffer(1, length, context.sampleRate);
    fireNoise = context.createBuffer(1, length, context.sampleRate);
    const data = noise.getChannelData(0), crackle = fireNoise.getChannelData(0), random = randomFor(1332033);
    let pop = 0, smooth = 0;
    for (let i = 0; i < length; i++) {
      data[i] = random() * 2 - 1;
      smooth = smooth * .986 + data[i] * .014;
      if (random() < .00055) pop = .12 + random() * .23;
      pop *= .988;
      crackle[i] = smooth * .65 + data[i] * pop;
    }
  }
  function init() {
    if (context) return true;
    if (!available || disposed) return false;
    try {
      context = contextFactory ? contextFactory() : new AudioContextClass({latencyHint: 'playback'});
      master = context.createGain(); master.gain.value = volume * .65;
      musicBus = context.createGain(); musicBus.gain.value = .7;
      ambientBus = context.createGain(); ambientBus.gain.value = .8;
      const warmth = context.createBiquadFilter(); warmth.type = 'lowpass'; warmth.frequency.value = 5800; warmth.Q.value = .3;
      const compressor = context.createDynamicsCompressor();
      compressor.threshold.value = -20; compressor.knee.value = 16; compressor.ratio.value = 2.5;
      compressor.attack.value = .025; compressor.release.value = .3;
      musicBus.connect(warmth); warmth.connect(compressor); ambientBus.connect(compressor);
      compressor.connect(master); master.connect(context.destination);
      graph.push(master, musicBus, ambientBus, warmth, compressor);
      buildNoise();
      return true;
    } catch {
      available = false;
      for (const node of graph) { try { node.disconnect(); } catch {} }
      context?.close?.().catch?.(() => {});
      context = null;
      return false;
    }
  }
  function voice(group, at, duration, amplitude, pan = 0, loop = false) {
    const gain = context.createGain(), nodes = [gain], sources = [];
    gain.gain.setValueAtTime(0, at);
    if (loop) gain.gain.setTargetAtTime(amplitude, at, .5);
    else {
      gain.gain.linearRampToValueAtTime(amplitude, at + .015);
      gain.gain.exponentialRampToValueAtTime(Math.max(.0001, amplitude * .48), at + Math.min(duration * .32, .32));
      gain.gain.exponentialRampToValueAtTime(.0001, at + duration);
      gain.gain.linearRampToValueAtTime(0, at + duration + .02);
    }
    const bus = group === 'music' ? musicBus : ambientBus;
    if (context.createStereoPanner) {
      const panner = context.createStereoPanner(); panner.pan.value = pan;
      nodes.push(panner); gain.connect(panner); panner.connect(bus);
    } else gain.connect(bus);
    let remaining = 0, cleaned = false;
    const cleanup = () => {
      if (cleaned) return;
      cleaned = true; voices.delete(item);
      for (const node of nodes) { try { node.disconnect(); } catch {} }
    };
    const item = {
      group, gain,
      connect(node) { nodes.push(node); node.connect(gain); return node; },
      source(source, destination = gain) {
        nodes.push(source); sources.push(source); remaining++; source.connect(destination);
        source.onended = () => { remaining--; if (remaining <= 0) cleanup(); };
        source.start(at);
        if (!loop) source.stop(at + duration + .05);
        return source;
      },
      stop(immediate = false) {
        const now = context.currentTime;
        gain.gain.cancelScheduledValues(now);
        gain.gain.setTargetAtTime(0, now, .012);
        for (const source of sources) { try { source.stop(now + (immediate ? 0 : .06)); } catch {} }
        if (immediate) cleanup();
      },
    };
    voices.add(item);
    return item;
  }
  function filterFor(item, type, cutoff, q = .5) {
    const filter = context.createBiquadFilter(); filter.type = type; filter.frequency.value = cutoff; filter.Q.value = q;
    item.connect(filter); return filter;
  }
  function oscillator(item, at, midi, type, gainValue = 1, destination = item.gain, detune = 0) {
    const oscillator = context.createOscillator(); oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency(midi), at); oscillator.detune.value = detune;
    if (gainValue !== 1) {
      const level = context.createGain(); level.gain.value = gainValue;
      // Track the intermediate node without introducing a second audible connection.
      item.connect(level); level.disconnect(); level.connect(destination);
      item.source(oscillator, level);
    } else item.source(oscillator, destination);
    return oscillator;
  }
  function play(note, start) {
    const at = start + note.beat * BEAT, duration = note.duration * BEAT, v = note.velocity;
    if (note.instrument === 'keys' || note.instrument === 'melody') {
      const lead = note.instrument === 'melody';
      const item = voice('music', at, duration + .65, v * (lead ? .12 : .092), lead ? .22 : -.14);
      const lowpass = filterFor(item, 'lowpass', lead ? 2700 : 1900);
      oscillator(item, at, note.midi, 'sine', 1, lowpass, -.7);
      oscillator(item, at, note.midi + 12, 'sine', .16, lowpass, .9);
      // A quiet tine gives the keys a soft electric-piano attack, without hard transients.
      const tine = voice('music', at, .17, v * .018, lead ? .25 : -.1);
      oscillator(tine, at, note.midi + 19, 'sine');
    } else if (note.instrument === 'bass') {
      const item = voice('music', at, duration, v * .16);
      const filter = filterFor(item, 'lowpass', 260);
      oscillator(item, at, note.midi, 'triangle', 1, filter);
      oscillator(item, at, note.midi, 'sine', .45, filter);
    } else if (note.instrument === 'kick') {
      const item = voice('music', at, .39, v * .21);
      const kick = context.createOscillator(); kick.type = 'sine';
      kick.frequency.setValueAtTime(105, at); kick.frequency.exponentialRampToValueAtTime(44, at + .11);
      item.source(kick);
    } else {
      const hat = note.instrument === 'hat';
      const item = voice('music', at, hat ? duration : .18, v * (hat ? .16 : .16), hat ? .32 : -.22);
      const filter = filterFor(item, hat ? 'highpass' : 'bandpass', hat ? 4800 : 1600, hat ? .4 : .65);
      const source = context.createBufferSource(); source.buffer = noise;
      item.source(source, filter);
      if (!hat) {
        const body = voice('music', at, .075, v * .035, -.22);
        oscillator(body, at, 51, 'triangle');
      }
    }
  }
  function schedule() {
    if (!context || context.state !== 'running' || !musicEnabled || hidden || disposed) return;
    const now = context.currentTime;
    // Throttled tabs or a sleeping device skip silence, never enqueue missed bars.
    if (nextBarTime < now - .3) nextBarTime = now + .06;
    if (nextBarTime <= now + .18) {
      for (const note of composeBar(nextBar).notes) play(note, nextBarTime);
      nextBar++; nextBarTime += BAR;
    }
  }
  function startMusic() {
    if (scheduler !== null || !musicEnabled || hidden || disposed || context?.state !== 'running') return;
    nextBarTime = context.currentTime + .08;
    schedule(); scheduler = setInterval(schedule, 80);
  }
  function stopGroup(group, immediate = false) {
    if (group === 'music' && scheduler !== null) { clearInterval(scheduler); scheduler = null; }
    for (const item of [...voices]) if (item.group === group) item.stop(immediate);
    if (group === 'ambient') ambient = null;
  }
  function updateEnvironment() {
    if (!ambient) return;
    const time = context.currentTime, rainy = weather === 'rain' || weather === 'storm';
    target(ambient.wind.gain.gain, weather === 'wind' || weather === 'storm' ? .10 : .065, time, 1.5);
    target(ambient.fire.gain.gain, hour < 6 || hour >= 19 ? .55 : .28, time, 1.5);
    target(ambient.rain.gain.gain, rainy ? .10 : 0, time, 1.5);
  }
  function startAmbient() {
    if (ambient || !ambientEnabled || hidden || disposed || context?.state !== 'running') return;
    const at = context.currentTime;
    const wind = voice('ambient', at, 0, .065, -.24, true);
    const windFilter = filterFor(wind, 'lowpass', 480, .3);
    const windSource = context.createBufferSource(); windSource.buffer = noise; windSource.loop = true; wind.source(windSource, windFilter);
    const fire = voice('ambient', at, 0, .3, .3, true);
    const fireFilter = filterFor(fire, 'lowpass', 3100, .3);
    const fireSource = context.createBufferSource(); fireSource.buffer = fireNoise; fireSource.loop = true; fire.source(fireSource, fireFilter);
    const rain = voice('ambient', at, 0, .0001, .05, true);
    const rainFilter = filterFor(rain, 'lowpass', 1850, .3);
    const rainSource = context.createBufferSource(); rainSource.buffer = noise; rainSource.loop = true; rain.source(rainSource, rainFilter);
    ambient = {wind, fire, rain}; updateEnvironment();
  }
  async function wake() {
    clearTimeout(sleepTimer); sleepTimer = null;
    if (hidden || disposed || (!musicEnabled && !ambientEnabled)) return;
    if (!init()) { musicEnabled = ambientEnabled = false; return; }
    try {
      if (context.state !== 'running') await context.resume();
      // A mute or hide may arrive while the browser resolves resume().
      if (hidden || disposed || (!musicEnabled && !ambientEnabled)) { await context.suspend(); return; }
      startMusic(); startAmbient();
    } catch {
      musicEnabled = ambientEnabled = false;
      stopGroup('music', true); stopGroup('ambient', true);
    }
  }
  function sleepIfSilent() {
    if (!context || musicEnabled || ambientEnabled || disposed) return;
    clearTimeout(sleepTimer);
    sleepTimer = setTimeout(() => {
      sleepTimer = null;
      if (!musicEnabled && !ambientEnabled && context?.state === 'running') context.suspend().catch(() => {});
    }, 100);
  }
  return {
    getState,
    async setMusicEnabled(enabled) {
      if (disposed) return getState();
      musicEnabled = !!enabled;
      if (musicEnabled) await wake(); else { stopGroup('music'); sleepIfSilent(); }
      return getState();
    },
    async setAmbientEnabled(enabled) {
      if (disposed) return getState();
      ambientEnabled = !!enabled;
      if (ambientEnabled) await wake(); else { stopGroup('ambient'); sleepIfSilent(); }
      return getState();
    },
    setVolume(value) {
      if (Number.isFinite(Number(value))) volume = Math.min(1, Math.max(0, Number(value)));
      if (context && !disposed) target(master.gain, volume * .65, context.currentTime);
      return getState();
    },
    async setHidden(value) {
      hidden = !!value;
      if (hidden) {
        stopGroup('music', true); stopGroup('ambient', true);
        if (context && !disposed) { try { await context.suspend(); } catch {} }
      } else await wake();
      return getState();
    },
    setEnvironment(environment = {}) {
      if (typeof environment.weather === 'string') weather = environment.weather;
      if (Number.isFinite(environment.hour)) hour = environment.hour;
      updateEnvironment();
    },
    dispose() {
      if (disposed) return;
      disposed = true; musicEnabled = ambientEnabled = false;
      clearTimeout(sleepTimer); stopGroup('music', true); stopGroup('ambient', true);
      for (const node of graph) { try { node.disconnect(); } catch {} }
      graph.length = 0; noise = fireNoise = null;
      if (context) context.close().catch(() => {});
    },
  };
}
