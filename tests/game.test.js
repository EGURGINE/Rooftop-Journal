import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, tick, startAction, getActions, getEvent, chooseEvent, serialize, deserialize, getDay, getHour, getWeather, getStory } from '../src/game.js';
import { EVENTS, END_REQUIREMENTS } from '../src/content.js';

function quietGame(seed = 123456789) {
  const state = createGame(seed);
  state.nextEventAt = 1000000;
  return state;
}

test('same seed gives the same roof, weather, and action outcomes', () => {
  const a = quietGame('under-the-same-sky');
  const b = quietGame('under-the-same-sky');
  assert.deepEqual(a, b);
  startAction(a, 'scavenge');
  startAction(b, 'scavenge');
  tick(a, 100);
  tick(b, 100);
  assert.deepEqual(a, b);
  const before = a.rng;
  assert.deepEqual(getWeather(a), getWeather(b));
  assert.equal(a.rng, before, 'rendering weather must not consume random state');
  const variants = new Set(Array.from({ length: 50 }, (_, i) => createGame(`roof-${i}`).roof.type));
  assert.equal(variants.size, 4);
});

test('time starts at 08:00 and advances one day in 240 real seconds', () => {
  const state = quietGame();
  assert.equal(getDay(state), 1);
  assert.equal(getHour(state), 8);
  tick(state, 240);
  assert.equal(state.time, 1440);
  assert.equal(getDay(state), 2);
  assert.equal(getHour(state), 8);
});

test('explicit pause freezes actions and consumption; save has no offline progress', () => {
  const state = quietGame();
  startAction(state, 'scavenge');
  state.paused = true;
  const before = serialize(state);
  tick(state, 500);
  assert.equal(serialize(state), before);
  const restored = deserialize(before);
  assert.deepEqual(restored, state);
  assert.equal(restored.time, 0);
  state.paused = false;
  tick(state, 1);
  assert.equal(state.time, 6);
});

test('first encounter arrives at 20 seconds and automatically freezes all progress', () => {
  const state = createGame(134534);
  startAction(state, 'scavenge');
  tick(state, 120);
  assert.equal(state.time, 120, 'unused elapsed time must stop at the encounter boundary');
  assert.equal(state.event, 'first_knock');
  const before = serialize(state);
  tick(state, 300);
  assert.equal(serialize(state), before);
  const restored = deserialize(before);
  assert.equal(getEvent(restored).title, getEvent(state).title);
  assert.equal(chooseEvent(restored, 'look').ok, true);
  tick(restored, 1);
  assert.equal(restored.time, 126);
});

test('the dog consumes exactly 1.5 times as much food and improves morale', () => {
  const alone = quietGame();
  const dog = quietGame();
  dog.flags.dog = true;
  alone.resources.food = dog.resources.food = 100;
  tick(alone, 240);
  tick(dog, 240);
  assert.ok(Math.abs((100 - dog.resources.food) / (100 - alone.resources.food) - 1.5) < 1e-8);
  assert.ok(dog.stats.morale > alone.stats.morale);
});

test('actions charge once, cannot overlap or rebuild, and deliver their promised effect', () => {
  const state = quietGame();
  const defense = state.stats.defense;
  assert.deepEqual(startAction(state, 'barricade'), { ok: true });
  assert.equal(state.resources.parts, 2);
  assert.equal(startAction(state, 'barricade').ok, false);
  assert.equal(startAction(state, 'scavenge').ok, false);
  assert.equal(state.resources.parts, 2);
  tick(state, 35);
  assert.equal(state.action, null);
  assert.equal(state.flags.barricade, true);
  assert.ok(state.stats.defense > defense + 24);
  assert.equal(startAction(state, 'barricade').ok, false);
  assert.equal(startAction(state, 'garden').ok, false, 'insufficient parts must reject before charging water');
  assert.equal(startAction(state, 'unknown').ok, false);
});

test('medicine is spent once and healing is a timed action', () => {
  const state = quietGame();
  assert.equal(startAction(state, 'heal').ok, false);
  state.stats.health = 40;
  assert.equal(startAction(state, 'heal').ok, true);
  assert.equal(state.resources.medicine, 1);
  tick(state, 10);
  assert.equal(state.stats.health, 70);
});

test('empty stores damage health and eventually end the run', () => {
  const state = quietGame();
  state.resources.food = 0;
  state.resources.water = 0;
  tick(state, 60);
  assert.ok(state.stats.health < 81);
  assert.equal(state.resources.food, 0);
  assert.equal(state.resources.water, 0);
  assert.equal(state.log.filter(entry => entry.type === 'warning').length, 2);
  tick(state, 500);
  assert.equal(state.ending.id, 'death');
  assert.equal(state.stats.health, 0);
  const before = state.time;
  tick(state, 50);
  assert.equal(state.time, before);
});

test('equipment produces resources and rooftop traits affect output', () => {
  const plain = quietGame();
  plain.roof.type = 'wide';
  plain.flags.collector = plain.flags.garden = true;
  const garden = structuredClone(plain);
  garden.roof.type = 'garden';
  tick(plain, 100);
  tick(garden, 100);
  assert.ok(garden.resources.food > plain.resources.food);
  assert.ok(plain.resources.water > 10 - 3.5 * 600 / 1440);
});

test('unaffordable event choices remain open and never charge partial costs', () => {
  const state = createGame();
  state.event = 'river_final';
  state.flags.route = true;
  state.resources.food = 0;
  const before = serialize(state);
  assert.equal(getEvent(state).choices.find(choice => choice.id === 'leave').disabled, true);
  assert.equal(chooseEvent(state, 'leave').ok, false);
  assert.equal(serialize(state), before);
  assert.equal(chooseEvent(state, 'wait').ok, true);
  assert.equal(state.event, null);
  assert.equal(state.ending, null);
});

test('save validation rejects corrupt state and canonicalizes authored fields', () => {
  const state = createGame(45678);
  const save = serialize(state);
  assert.deepEqual(deserialize(save), state);
  for (const invalid of ['', 'not json', '{}', 'null', '{"version":2}', '[]']) assert.equal(deserialize(invalid), null);
  const mutations = [
    s => { s.resources.food = -1; },
    s => { s.stats.health = 1000; },
    s => { s.event = 'missing'; },
    s => { s.flags.dog = 'yes'; },
    s => { s.action = { id: 'scavenge', remaining: -1, total: 180 }; },
    s => { s.roof.height = 100; },
    s => { s.log = [{ text: 'bad' }]; },
    s => { s.eventHistory = { unknown: 1 }; },
    s => { s.lastDay = 99; },
  ];
  for (const mutate of mutations) {
    const candidate = JSON.parse(save);
    mutate(candidate);
    assert.equal(deserialize(JSON.stringify(candidate)), null);
  }
  state.roof.name = 'replaced text';
  assert.notEqual(deserialize(serialize(state)).roof.name, 'replaced text');
});

test('speed controls scale simulation and invalid deltas cannot mutate a run', () => {
  const state = quietGame();
  state.speed = 2;
  tick(state, 10);
  assert.equal(state.time, 120);
  const before = serialize(state);
  for (const delta of [NaN, Infinity, -2, 0]) tick(state, delta);
  assert.equal(serialize(state), before);
});

// Exercise real scheduling, consumption, paid construction, and encounter chains.
// The policy preserves supplies while pursuing each of the three authored routes.
function playRoute(route) {
  const state = createGame(`ending-${route}`);
  const built = ['collector', 'barricade', 'garden', 'radio'];
  for (let second = 0; second < 240 * 50 && !state.ending; second += 1) {
    if (state.event) {
      const encounter = getEvent(state);
      let desired = {
        first_knock: 'look', old_trade: 'engineer', stray_dog: 'adopt', neighbor_lamp: 'answer', yoon_reconnect: 'answer',
        water_cache: 'boil', wind_tarp: 'move', stairwell: 'tools', neighbor_trade: 'talk',
        neighbor_injury: 'help', radio_voice: 'record', quiet_evening: 'watch',
        ferry_note: 'keep', green_sprout: 'save', roof_fire: 'sand', migration: 'fortify',
        signal_reply: 'voice', rescue_arrives: 'stay', departure: 'wait', community: 'settle',
        yoon_photo: 'promise', school_map: 'key', school_contact: 'medicine', yoon_confession: 'record',
        school_return: route === 'departure' ? 'children' : 'prepared', ferry_hull: 'engineer', ferry_passengers: 'together', river_lock: 'tools',
        river_final: route === 'reunion' ? 'reunion' : route === 'departure' ? 'leave' : 'wait',
        relay_orders: 'question', relay_record: 'save', relay_cipher: 'engineer',
        manifest_vote: route === 'rescue' ? 'limited' : 'all', transmitter: 'engineer', convoy_choice: 'witness',
        radio_final: route === 'rescue' ? 'limited' : route === 'rescue_all' ? 'all' : route === 'broadcast' ? 'broadcast' : 'wait',
        roof_guests: 'welcome', water_sick: 'check', water_fix: 'engineer', ration_dispute: 'mediate',
        pantry_return: 'include', roof_charter: 'council', siege_warning: 'prepare', last_defense: 'hold',
        community_final: route === 'community' ? 'settle' : 'wait', rope_lesson: 'learn', clinic_manual: 'study',
      }[encounter.id];
      const choice = encounter.choices.find(choice => choice.id === desired && !choice.disabled) || encounter.choices.find(choice => choice.id === 'wait' && !choice.disabled) || encounter.choices.find(choice => !choice.disabled);
      assert.ok(choice, `an available choice is required in ${encounter.id}`);
      assert.equal(chooseEvent(state, choice.id).ok, true);
    }
    if (!state.action && !state.ending) {
      const available = getActions(state).filter(action => !action.disabled);
      let action;
      if (state.stats.health < 65) action = 'rest';
      else if (state.resources.food < 12 || state.resources.water < 12 || state.resources.parts < 7) action = 'scavenge';
      else action = built.find(id => !state.flags[id]);
      if (!action) action = available.find(candidate => candidate.id.startsWith('investigate_'))?.id;
      if (!action && state.stats.defense < 78) action = 'repair';
      if (!action) action = state.stats.health < 95 || state.stats.morale < 75 ? 'rest' : 'scavenge';
      if (!available.some(candidate => candidate.id === action)) action = 'scavenge';
      startAction(state, action);
    }
    tick(state, 1);
  }
  return state;
}

for (const route of Object.keys(END_REQUIREMENTS)) {
  test(`${route} ending is reachable with earned resources and the live event scheduler`, t => {
    const state = playRoute(route);
    assert.equal(state.ending?.id, route, `ended on day ${getDay(state)} with ${JSON.stringify(state.flags)}`);
    assert.ok(state.completedActions > 5);
    assert.ok(getDay(state) >= END_REQUIREMENTS[route].day);
    assert.ok(Object.keys(state.eventHistory).length >= 15, 'an ending needs sustained story development');
    assert.ok(state.stats.health > 0);
    assert.ok(state.resources.food >= 0 && state.resources.water >= 0 && state.resources.parts >= 0);
    assert.ok(deserialize(serialize(state)), 'completed ending must also round-trip');
    t.diagnostic(`${route}: day ${getDay(state)}, ${Object.keys(state.eventHistory).length} distinct events, ${state.completedActions} completed actions`);
  });
}

test('all authored events contain accessible fallbacks and long-form original narratives', () => {
  assert.ok(EVENTS.length >= 40);
  for (const event of EVENTS) {
    assert.ok(event.choices.some(choice => !choice.cost && !choice.minHealth && !choice.requires && !choice.minDefense && !choice.effects.ending), event.id);
    assert.ok(event.choices.length >= 2, event.id);
    assert.ok(event.body.includes('\n\n'), `paragraphs in ${event.id}`);
    assert.ok(event.body.length >= 120, `narrative depth in ${event.id}`);
  }
});

test('all positive ending choices are impossible before day 18 even with every milestone', () => {
  for (const event of EVENTS.filter(event => event.choices.some(choice => choice.effects.ending))) {
    const state = createGame(87983);
    state.time = 16 * 1440;
    state.lastDay = getDay(state);
    for (const key of Object.keys(state.flags)) state.flags[key] = true;
    for (const key of Object.keys(state.resources)) state.resources[key] = 100;
    state.event = event.id;
    for (const choice of event.choices.filter(choice => choice.effects.ending)) {
      assert.equal(getEvent(state).choices.find(item => item.id === choice.id).disabled, true);
      assert.equal(chooseEvent(state, choice.id).ok, false);
      assert.equal(state.ending, null);
    }
  }
});

test('early offers open preparation without ending the game', () => {
  for (const [id, choice] of [['departure', 'leave'], ['rescue_arrives', 'leave'], ['community', 'settle']]) {
    const state = createGame(34);
    state.event = id;
    assert.equal(chooseEvent(state, choice).ok, true);
    assert.equal(state.ending, null);
    assert.equal(state.paused, false);
  }
});

test('delayed help persists across save and returns at the scheduled dawn', () => {
  const state = quietGame();
  state.event = 'school_contact';
  assert.equal(chooseEvent(state, 'medicine').ok, true);
  assert.equal(state.flags.sisterStable, false);
  const restored = deserialize(serialize(state));
  assert.ok(restored);
  restored.nextEventAt = 1000000;
  tick(restored, 240);
  assert.equal(restored.flags.sisterStable, false);
  tick(restored, 240);
  assert.equal(restored.flags.sisterStable, true);
  assert.equal(restored.delayed.length, 0);
});

test('external investigations require clues and produce durable follow-up flags', () => {
  const state = quietGame();
  assert.equal(startAction(state, 'investigate_school').ok, false);
  state.flags.schoolLocated = true;
  assert.equal(startAction(state, 'investigate_school').ok, true);
  assert.equal(state.resources.food, 6);
  tick(state, 80);
  assert.equal(state.flags.schoolRecon, true);
  assert.equal(startAction(state, 'investigate_school').ok, false);
  assert.ok(getStory(state).clues.some(clue => clue.id === 'schoolRecon'));
});

test('v1 saves preserve supplies and roof; old successful endings become paused story continuations', () => {
  for (const ending of [null, 'departure', 'rescue', 'community', 'death']) {
    const state = createGame(54321);
    state.version = 1;
    state.time = 8640;
    state.lastDay = getDay(state);
    state.nextEventAt = state.time + 300;
    delete state.delayed;
    delete state.deferred;
    state.flags = { dog: false, collector: true, garden: false, barricade: true, radio: false, ally: true, trusted: false, rescueClue: false, rescueSignal: false, route: true, rescueDeclined: false };
    if (ending) state.ending = { id: ending, title: 'old ending', body: 'old story' };
    const restored = deserialize(serialize(state));
    assert.ok(restored, ending);
    assert.equal(restored.version, 2);
    assert.equal(restored.time, state.time);
    assert.deepEqual(restored.resources, state.resources);
    assert.deepEqual(restored.roof, state.roof);
    if (ending === 'death') assert.equal(restored.ending.id, 'death');
    else assert.equal(restored.ending, null);
    if (ending && ending !== 'death') assert.equal(restored.paused, true);
    assert.ok(deserialize(serialize(restored)));
  }
});
