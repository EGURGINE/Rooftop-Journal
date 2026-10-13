import test from 'node:test';
import assert from 'node:assert/strict';
import {MUSIC_META, composeBar, createAudioEngine} from '../src/audio.js';

// A graph stub validates scheduling/lifecycle, not the subjective sound of the score.
function makeContext() {
  const nodes = [], sources = [];
  const parameter = () => ({
    value: 0, events: [],
    setValueAtTime(value, at) { assert.ok(Number.isFinite(value) && Number.isFinite(at)); this.events.push({kind:'set',value,at}); },
    linearRampToValueAtTime(value, at) { assert.ok(Number.isFinite(value) && Number.isFinite(at)); this.events.push({kind:'linear',value,at}); },
    exponentialRampToValueAtTime(value, at) { assert.ok(value > 0 && Number.isFinite(at)); this.events.push({kind:'exponential',value,at}); },
    setTargetAtTime(value, at, constant) { assert.ok(Number.isFinite(value) && Number.isFinite(at) && constant > 0); this.events.push({kind:'target',value,at}); },
    cancelScheduledValues(at) { this.events = this.events.filter(event => event.at < at); },
  });
  const node = (source = false) => {
    const item = {connections: [], disconnected:false, connect(target) { this.connections.push(target); }, disconnect() { this.connections=[]; this.disconnected=true; }};
    nodes.push(item);
    if (source) {
      item.start = at => { item.startAt=at; };
      item.stop = at => { item.stopAt=at; };
      sources.push(item);
    }
    return item;
  };
  const context = {
    state:'suspended', sampleRate:8000, currentTime:0, destination:{}, nodes, sources,
    resumes:0, suspends:0, closed:0,
    async resume() { this.resumes++; this.state='running'; },
    async suspend() { this.suspends++; this.state='suspended'; },
    async close() { this.closed++; this.state='closed'; },
    createGain() { return Object.assign(node(), {gain:parameter()}); },
    createBiquadFilter() { return Object.assign(node(), {frequency:parameter(), Q:parameter()}); },
    createDynamicsCompressor() { return Object.assign(node(), Object.fromEntries(['threshold','knee','ratio','attack','release'].map(key=>[key,parameter()]))); },
    createStereoPanner() { return Object.assign(node(), {pan:parameter()}); },
    createOscillator() { return Object.assign(node(true), {frequency:parameter(), detune:parameter()}); },
    createBufferSource() { return node(true); },
    createBuffer(channels, length, sampleRate) { const data=new Float32Array(length); return {length,sampleRate,getChannelData:()=>data}; },
  };
  return context;
}

test('original score has a changing arrangement and playable events over several cycles', () => {
  assert.equal(MUSIC_META.bpm,76);
  const sections = new Set();
  for(let bar=0;bar<192;bar++) {
    const score=composeBar(bar); sections.add(score.section);
    for(const note of score.notes) {
      assert.ok(note.beat>=0 && note.beat<4);
      assert.ok(note.duration>0 && note.duration<5);
      assert.ok(note.velocity>0 && note.velocity<=1);
      if(note.midi!==undefined) assert.ok(note.midi>=30 && note.midi<=90);
    }
    assert.ok(score.notes.length<40, 'one bar must keep synthesis work bounded');
  }
  assert.equal(sections.size,5);
  assert.deepEqual(composeBar(27),composeBar(27));
  assert.notDeepEqual(composeBar(27),composeBar(91), 'subsequent choruses vary');
  assert.equal(composeBar(0).notes.some(note=>note.instrument==='kick'),false);
  assert.ok(composeBar(12).notes.some(note=>note.instrument==='snare'));
});

test('construction, volume changes, and hidden state never autoplay', async () => {
  let constructions=0;
  const engine=createAudioEngine({contextFactory:()=>{ constructions++;return makeContext(); }});
  engine.setVolume(.3); await engine.setHidden(true); await engine.setHidden(false);
  assert.equal(constructions,0);
  assert.equal(engine.getState().musicEnabled,false);
  assert.equal(engine.getState().ambientEnabled,false);
  engine.dispose();
});

test('music and ambience are independent, reuse their context, and dispose every node', async () => {
  const context=makeContext(), engine=createAudioEngine({contextFactory:()=>context});
  try {
    await engine.setMusicEnabled(true);
    const musicSources=[...context.sources];
    assert.ok(musicSources.length>0);
    const count=context.sources.length;
    await engine.setMusicEnabled(true);
    assert.equal(context.sources.length,count, 'repeated enable must not duplicate a scheduler');
    await engine.setAmbientEnabled(true);
    const ambientSources=context.sources.slice(count);
    assert.equal(ambientSources.length,3);
    assert.ok(ambientSources.every(source=>source.loop));
    await engine.setMusicEnabled(false);
    assert.ok(musicSources.every(source=>source.stopAt<=context.currentTime+.061));
    assert.ok(ambientSources.every(source=>source.stopAt===undefined), 'music mute leaves the environment alive');
    assert.equal(engine.getState().ambientEnabled,true);
    engine.setEnvironment({weather:'rain',hour:22});
    engine.setVolume(4); assert.equal(engine.getState().volume,1);
    engine.setVolume(-2); assert.equal(engine.getState().volume,0);
    engine.setVolume(NaN); assert.equal(engine.getState().volume,0);
  } finally { engine.dispose(); }
  assert.equal(context.closed,1);
  assert.ok(context.nodes.every(node=>node.disconnected));
  engine.dispose(); assert.equal(context.closed,1);
  await engine.setMusicEnabled(true); assert.equal(context.resumes,1);
});

test('a long hidden interval resumes one fresh bar instead of scheduling hours of backlog', async () => {
  const context=makeContext(),engine=createAudioEngine({contextFactory:()=>context});
  try {
    await engine.setMusicEnabled(true); await engine.setAmbientEnabled(true);
    const before=[...context.sources];
    await engine.setHidden(true);
    assert.equal(context.state,'suspended');
    assert.ok(before.every(source=>source.disconnected));
    const count=context.sources.length;
    context.currentTime=43200;
    await engine.setHidden(false);
    const resumed=context.sources.slice(count);
    assert.ok(resumed.length>0 && resumed.length<100);
    assert.ok(resumed.every(source=>source.startAt>=43200 && source.startAt<43204));
    assert.equal(engine.getState().musicEnabled,true);
    assert.equal(engine.getState().ambientEnabled,true);
  } finally { engine.dispose(); }
});

test('a mute during pending audio permission does not start music afterwards', async () => {
  const context=makeContext();
  let allow;
  context.resume=()=>new Promise(resolve=>{ allow=()=>{context.state='running';resolve();}; });
  const engine=createAudioEngine({contextFactory:()=>context});
  try {
    const enabling=engine.setMusicEnabled(true);
    await engine.setMusicEnabled(false);
    allow(); await enabling;
    assert.equal(engine.getState().musicEnabled,false);
    assert.equal(context.sources.length,0);
    assert.equal(context.state,'suspended');
  } finally { engine.dispose(); }
});

test('unavailable audio can fail quietly without affecting the game', async () => {
  const engine=createAudioEngine({contextFactory:()=>{ throw new Error('Audio device unavailable'); }});
  await engine.setMusicEnabled(true);
  assert.equal(engine.getState().available,false);
  assert.equal(engine.getState().musicEnabled,false);
  assert.equal(engine.getState().ambientEnabled,false);
  engine.dispose();
});
