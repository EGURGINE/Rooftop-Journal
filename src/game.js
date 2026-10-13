import { ROOFS, WEATHER, EVENTS, ENDINGS, TRAITS, CLUES, END_REQUIREMENTS } from './content.js';

export const STORAGE_KEY = 'zombi-rooftop-save-v1';
export const MINUTES_PER_REAL_SECOND = 6;
const RESOURCE_KEYS = ['food', 'water', 'parts', 'medicine'];
const STAT_KEYS = ['health', 'morale', 'defense'];
const FLAG_KEYS = [...new Set(['dog', 'collector', 'garden', 'barricade', 'radio', 'ally', 'trusted', 'rescueClue', 'rescueSignal', 'route', 'rescueDeclined', 'schoolRecon', 'towerSurvey', 'riverSurvey', ...TRAITS.map(x => x.id), ...CLUES.map(x => x.id), ...EVENTS.flatMap(event => event.choices.flatMap(choice => [...Object.keys(choice.effects.flags || {}), ...(choice.effects.delayed || []).flatMap(effect => Object.keys(effect.effects.flags || {}))]))])];
const resourceNames = { food: '식량', water: '물', parts: '부품', medicine: '약품' };
const clamp = (value, lo, hi) => Math.max(lo, Math.min(hi, value));
const copy = value => JSON.parse(JSON.stringify(value));

function seedNumber(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return (value >>> 0) || 1;
  let hash = 2166136261;
  for (const char of String(value)) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return (hash >>> 0) || 1;
}

function random(state) {
  let value = state.rng;
  value ^= value << 13;
  value ^= value >>> 17;
  value ^= value << 5;
  state.rng = value >>> 0;
  return state.rng / 4294967296;
}

export function getDay(state) { return Math.floor((state.time + 480) / 1440) + 1; }
export function getHour(state) { return ((state.time + 480) % 1440) / 60; }
export function getRoof(state) { return state.roof; }
const milestoneLabels = {
  sisterStable: '수아 상태 안정', sisterFound: '수아의 위치', schoolResolved: '학교 구조의 결말',
  familySeats: '함께 탈 자리', ferryManifest: '승선 명단', routeReady: '수문을 통과할 길',
  corridorReady: '북쪽 회랑', transmitter: '광역 송신기', ordersKnown: '구조 지시 의혹',
  guests: '이웃들과의 연결', contaminationKnown: '식수 오염 원인', ally: '이웃 윤과 연결',
  collector: '빗물받이', garden: '옥상 텃밭', barricade: '보강한 출입문', radio: '수리한 무전기', dog: '보리',
};
function flagLabel(flag) { return [...TRAITS, ...CLUES].find(item => item.id === flag)?.label || milestoneLabels[flag] || '이전 이야기의 준비'; }

export function getStory(state) {
  const day = getDay(state);
  const chapter = day < 5 ? 1 : day < 10 ? 2 : day < 16 ? 3 : day < 22 ? 4 : 5;
  const titles = ['문 너머의 이름', '믿었던 목소리', '살릴 사람, 남길 진실', '약속의 대가', '우리가 고른 내일'];
  const summaries = ['옥상을 지키며 윤의 사진과 반복되는 구조 방송의 정체를 알아보세요.', '학교와 중계소를 직접 조사하세요. 처음 받은 약속이 전부 사실은 아닙니다.', '준비한 물자와 익힌 기술이 누군가의 생사를 바꿉니다. 이전 선택의 결과가 돌아옵니다.', '배와 송신기, 공동체의 방어선을 준비하세요. 떠나기 전에 책임져야 할 이름들이 있습니다.', '완성한 경로에 따라 다른 결말이 열립니다. 아직 준비되지 않았다면 이야기를 이어갈 수 있습니다.'];
  const goal = (steps, label) => {
    const next = steps.find(([flag]) => !state.flags[flag]);
    return { label: next ? next[1] : label, done: !next };
  };
  const objectives = [
    goal([['ally', '윤의 불빛에 답해 이웃과 연결하기'], ['yoonPhoto', '윤에게 수아의 사진과 마지막 주소 듣기'], ['schoolLocated', '학교 진입 지도 얻기'], ['schoolRecon', '외부 조사 → 학교 수색 완료하기 (식량2·물2)'], ['sisterFound', '수색 기록을 바탕으로 수아와 연락하기'], ['yoonSecret', '윤이 숨긴 봉쇄 당시의 사실 듣기'], ['schoolResolved', '학교로 돌아갈 구조 물자 준비하기 (약품2 또는 안정 후 부품2)'], ['riverSurvey', '외부 조사 → 강변 정찰하기 (식량2·물2)'], ['ferryFixed', '강변의 배 수리하기 (부품4, 수리 능력 보유 시2)'], ['ferryManifest', '함께 떠날 사람과 보급 정하기'], ['routeReady', '수문을 열고 실제 항로 확보하기']], `강변 경로 준비 완료 · ${state.flags.sisterSaved && state.flags.familySeats ? '22일 이후 동행 결말 가능' : '20일 이후 탈출 결말 가능'}`),
    goal([['rescueClue', '구조 방송의 주파수 기록하기'], ['radio', '무전기 수리하기 (부품5)'], ['rescueSignal', '구조팀 호출부호 확인하기'], ['towerSurvey', '외부 조사 → 중계소 조사하기 (식량2·물2·부품1)'], ['ordersKnown', '구조 명단에서 사람을 빼라는 명령 확인하기'], ['evidence', '공개 방송과 다른 선별 명령 보존하기'], ['decoded', '숨겨진 항로 해독하기 (부품2 또는 설비 수리)'], [state.flags.openManifest ? 'openManifest' : 'manifestSelective', '누구를 구조 명단에 넣을지 결정하기'], ['transmitter', '광역 송신기 세우기 (부품4, 수리 능력 보유 시2)'], ['corridorReady', '구조대원의 북쪽 회랑 개방 돕기 (물2)']], '방송 경로 준비 완료 · 제한 구조22일 / 전원 구조·증언 송신24일 이후'),
    goal([['ally', '이웃 윤과 연결하기'], ['guests', '비를 피해 온 이웃들과 연결하기'], ['contaminationKnown', '아픈 이웃들의 식수 오염 원인 조사하기'], ['waterSafe', '안전한 식수 체계 만들기 (부품2 또는 수리 능력)'], ['pantry', '배급 갈등을 해결하고 공동창고 만들기 (식량3 또는 중재)'], ['charter', '열쇠와 책임을 나누는 옥상 규칙 정하기'], ['barricade', '출입문 보강하기 (부품3)'], ['defensePlan', '최후 방어와 이웃 옥상 퇴로 준비하기'], ['defenseWon', '마지막 방어 준비하기 (방어65·부품2, 보리가 있으면 방어50·부품3)'], ['collector', '빗물받이 설치하기 (부품3)'], ['garden', '옥상 텃밭 만들기 (부품4·물2)']], '공동체 준비 완료 · 24일 이후 식량4·물4로 정착 선택 가능'),
  ];
  return { chapter, title: titles[chapter - 1], summary: summaries[chapter - 1], objectives, traits: TRAITS.filter(item => state.flags[item.id]), clues: CLUES.filter(item => state.flags[item.id]) };
}
export function getWeather(state) {
  const day = getDay(state);
  if (day === 1) return WEATHER[0];
  // Calendar weather must never advance the random stream just by being rendered.
  const value = (Math.imul(state.seed ^ (day * 2654435761), 1597334677) >>> 0) % 10;
  return WEATHER[value < 4 ? 0 : value < 6 ? 1 : value < 9 ? 2 : 3];
}

function timeLabel(state) {
  const minute = Math.floor((state.time + 480) % 1440);
  return `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`;
}

function log(state, text, type = 'info') {
  state.log.push({ id: state.logId++, day: getDay(state), time: timeLabel(state), text, type });
  if (state.log.length > 80) state.log.splice(0, state.log.length - 80);
}

export function createGame(seed = Date.now()) {
  const normalizedSeed = seedNumber(seed);
  const state = {
    version: 2, seed: normalizedSeed, rng: normalizedSeed, time: 0, paused: false, speed: 1,
    resources: { food: 8, water: 10, parts: 5, medicine: 2 },
    stats: { health: 100, morale: 80, defense: 40 },
    flags: Object.fromEntries(FLAG_KEYS.map(key => [key, false])),
    roof: null, action: null, event: null, ending: null, log: [], logId: 1,
    nextEventAt: 120, eventHistory: {}, lastDay: 1, depletion: { food: false, water: false },
    completedActions: 0, deferred: {}, delayed: [],
  };
  const roof = ROOFS[Math.floor(random(state) * ROOFS.length)];
  state.roof = { ...roof, height: 8 + Math.floor(random(state) * 13) };
  if (roof.type === 'split') state.stats.defense += 10;
  log(state, `${state.roof.height}층, ${roof.name}. 오늘부터 이 옥상이 집이다.`, 'story');
  log(state, '식량은 하루 2, 물은 하루 3씩 소비된다. 아래층 탐색과 시설 제작으로 내일을 준비하자.');
  return state;
}

function missingCost(state, cost = {}) {
  for (const [key, amount] of Object.entries(cost)) {
    if (state.resources[key] + 1e-7 < amount) return `${resourceNames[key]} ${amount} 필요`;
  }
  return '';
}

const ACTIONS = [
  { id: 'scavenge', label: '아래층 탐색', description: '식량 2~4 · 물 1~3 · 부품 1~2 획득. 체력 2~7 소모.', duration: 180, cost: {} },
  { id: 'water', label: '물 확보', description: '배관과 이웃 건물에서 물 3~5 확보. 체력 2 소모.', duration: 150, cost: {} },
  { id: 'rest', label: '모닥불 곁 휴식', description: '체력 +12 · 사기 +8. 물자는 계속 소비됩니다.', duration: 180, cost: {} },
  { id: 'heal', label: '상처 치료', description: '약품으로 체력 30 회복.', duration: 60, cost: { medicine: 1 } },
  { id: 'collector', label: '빗물받이 설치', description: '맑은 날도 하루 물 1, 비 오는 날 물 5 생산.', duration: 240, cost: { parts: 3 }, flag: 'collector' },
  { id: 'barricade', label: '출입문 보강', description: '방어 +25. 새벽 침입 위험을 줄입니다.', duration: 210, cost: { parts: 3 }, flag: 'barricade' },
  { id: 'garden', label: '옥상 텃밭', description: '매일 식량 1.6 생산. 물을 하루 0.5 더 소비.', duration: 300, cost: { parts: 4, water: 2 }, flag: 'garden' },
  { id: 'radio', label: '무전기 수리', description: '5일 이후 구조 방송을 추적할 수 있습니다. 방송의 진위를 조사해야 합니다.', duration: 300, cost: { parts: 5 }, flag: 'radio' },
  { id: 'repair', label: '방어시설 정비', description: '마모된 난간과 문을 보수. 방어 +18.', duration: 120, cost: { parts: 1 } },
  { id: 'investigate_school', label: '학교 수색', description: '윤의 동생이 남긴 흔적 조사. 체력 −8 · 학교 수색 기록 획득.', duration: 480, cost: { food: 2, water: 2 }, requires: ['schoolLocated'], flag: 'schoolRecon' },
  { id: 'investigate_tower', label: '중계소 조사', description: '방송의 발신지를 확인. 체력 −8 · 중계소 녹음 확보.', duration: 540, cost: { food: 2, water: 2, parts: 1 }, requires: ['rescueSignal'], flag: 'towerSurvey' },
  { id: 'investigate_river', label: '강변 정찰', description: '실제 탈출 경로와 수위를 확인. 체력 −6 · 강변 지도 완성.', duration: 420, cost: { food: 2, water: 2 }, requires: ['route'], flag: 'riverSurvey' },
];

export function getActions(state) {
  return ACTIONS.map(action => {
    let reason = '';
    if (state.ending) reason = '이번 생존이 끝났습니다';
    else if (state.event) reason = '먼저 사건을 선택해주세요';
    else if (state.action) reason = '다른 행동을 진행 중입니다';
    else if (action.flag && state.flags[action.flag]) reason = action.id.startsWith('investigate_') ? '조사 완료' : '설치 완료';
    else if (action.requires?.some(flag => !state.flags[flag])) reason = '관련 사건에서 단서를 먼저 발견해야 합니다';
    else if (action.id === 'heal' && state.stats.health >= 100) reason = '체력이 가득합니다';
    else if (action.id === 'repair' && state.stats.defense >= 100) reason = '방어도가 가득합니다';
    else reason = missingCost(state, action.cost);
    let duration = action.id === 'scavenge' || action.id === 'water' ? action.duration + (state.roof.height - 8) * 4 : action.duration;
    if (state.flags.engineer && ['collector', 'garden', 'radio', 'barricade', 'repair'].includes(action.id)) duration = Math.round(duration * 0.8);
    let description = action.description;
    if (action.id === 'scavenge' && state.flags.scout) description = '식량 2~4 · 물 1~3 · 부품 1~2 획득. 정찰 기술로 체력 1~5 소모.';
    if (action.id === 'heal' && state.flags.medic) description = '응급처치 지식으로 약품 1을 써서 체력 40 회복.';
    return { id: action.id, label: action.label, description, duration, cost: { ...action.cost }, disabled: Boolean(reason), reason };
  });
}

export function startAction(state, id) {
  const action = getActions(state).find(candidate => candidate.id === id);
  if (!action) return { ok: false, reason: '알 수 없는 행동입니다' };
  if (action.disabled) return { ok: false, reason: action.reason };
  for (const [key, amount] of Object.entries(action.cost)) state.resources[key] -= amount;
  state.action = { id, label: action.label, remaining: action.duration, total: action.duration };
  log(state, `${action.label} 시작.`, 'action');
  return { ok: true };
}

function change(state, effects) {
  for (const [key, amount] of Object.entries(effects.resources || {})) state.resources[key] = clamp(state.resources[key] + amount, 0, 9999);
  for (const [key, amount] of Object.entries(effects.stats || {})) state.stats[key] = clamp(state.stats[key] + amount, 0, 100);
  Object.assign(state.flags, effects.flags || {});
  for (const pending of effects.delayed || []) state.delayed.push({ id: pending.id, dueDay: getDay(state) + pending.days, effects: copy(pending.effects), text: pending.text });
  if (effects.ending) {
    const requirement = END_REQUIREMENTS[effects.ending];
    if (!requirement || getDay(state) < requirement.day || requirement.flags.some(flag => !state.flags[flag])) return;
    state.ending = { ...ENDINGS[effects.ending], day: getDay(state) };
    state.action = null;
    state.paused = true;
  }
}

function finishAction(state) {
  const id = state.action.id;
  state.action = null;
  state.completedActions += 1;
  if (id === 'scavenge') {
    const food = 2 + Math.floor(random(state) * 3);
    const water = 1 + Math.floor(random(state) * 3);
    const parts = 1 + Math.floor(random(state) * 2);
    const damage = Math.max(1, 2 + Math.floor(random(state) * 6) - (state.flags.scout ? 2 : 0));
    change(state, { resources: { food, water, parts }, stats: { health: -damage } });
    log(state, `탐색에서 돌아왔다. 식량 +${food}, 물 +${water}, 부품 +${parts}. 체력 −${damage}.`, 'success');
  } else if (id === 'water') {
    const amount = 3 + Math.floor(random(state) * 3);
    change(state, { resources: { water: amount }, stats: { health: -2 } });
    log(state, `깨끗한 물을 확보했다. 물 +${amount}, 체력 −2.`, 'success');
  } else if (id === 'rest') {
    const morale = state.roof.type === 'wide' ? 12 : 8;
    change(state, { stats: { health: 12, morale } });
    log(state, `잠깐 눈을 붙였다. 체력 +12, 사기 +${morale}.`, 'success');
  } else if (id === 'heal') {
    const amount = state.flags.medic ? 40 : 30;
    change(state, { stats: { health: amount } });
    log(state, `상처를 씻고 붕대를 갈았다. 체력 +${amount}.`, 'success');
  } else if (id === 'repair') {
    change(state, { stats: { defense: 18 } });
    log(state, '느슨한 곳을 고정했다. 방어 +18.', 'success');
  } else if (id.startsWith('investigate_')) {
    const target = { investigate_school: ['schoolRecon', 8, '학교 방송실에서 날짜가 적힌 수첩을 찾았다. 윤의 동생 수아는 며칠 전까지 살아 있었다.'], investigate_tower: ['towerSurvey', 8, '중계소 녹음에는 구조 방송과 다른 명령이 남아 있었다. 옥상으로 돌아가 차분히 들어봐야 한다.'], investigate_river: ['riverSurvey', 6, '지도의 나루는 물에 잠겼다. 대신 상류 공사용 선착장에서 배를 손볼 수 있겠다.'] }[id];
    change(state, { flags: { [target[0]]: true }, stats: { health: -target[1] } });
    log(state, `${target[2]} 체력 −${target[1]}.`, 'story');
  } else {
    state.flags[id] = true;
    if (id === 'barricade') change(state, { stats: { defense: 25 } });
    const action = ACTIONS.find(action => action.id === id);
    log(state, `${action.label} 완료. ${action.description}`, 'success');
  }
}

function eligible(state, event) {
  const day = getDay(state);
  if (day < (event.minDay || 1)) return false;
  if (event.requires?.some(flag => !state.flags[flag])) return false;
  if (event.excludes?.some(flag => state.flags[flag])) return false;
  if (event.after && Object.entries(event.after).some(([id, days]) => state.eventHistory[id] === undefined || day - state.eventHistory[id] < days)) return false;
  if (event.minDefense && state.stats.defense < event.minDefense) return false;
  const previous = state.eventHistory[event.id];
  if (previous !== undefined && ((event.once && !state.deferred[event.id]) || day - previous < (event.cooldown || 2))) return false;
  return true;
}

function triggerEvent(state) {
  const pool = EVENTS.filter(event => eligible(state, event));
  if (!pool.length) {
    state.nextEventAt = state.time + 360;
    return;
  }
  // Story branches take precedence; everyday encounters fill the quieter days.
  const priority = Math.max(...pool.map(event => event.priority || 0));
  const top = pool.filter(event => (event.priority || 0) === priority);
  const event = top[Math.floor(random(state) * top.length)];
  state.event = event.id;
  log(state, event.title, 'event');
}

export function getEvent(state) {
  const event = EVENTS.find(candidate => candidate.id === state.event);
  if (!event) return null;
  return {
    id: event.id, kicker: event.kicker, title: event.title, body: event.body,
    choices: event.choices.map(choice => {
      const missing = choice.requires?.find(flag => !state.flags[flag]);
      const blocked = choice.excludes?.find(flag => state.flags[flag]);
      const ending = choice.effects.ending && END_REQUIREMENTS[choice.effects.ending];
      const missingEnd = ending?.flags.find(flag => !state.flags[flag]);
      const reason = missingCost(state, choice.cost) || (missing ? `${flagLabel(missing)} 필요` : '') || (blocked ? `${flagLabel(blocked)} 선택과 양립할 수 없습니다` : '') || (choice.minHealth && state.stats.health < choice.minHealth ? `체력 ${choice.minHealth} 이상 필요` : '') || (choice.minDefense && state.stats.defense < choice.minDefense ? `방어 ${choice.minDefense} 이상 필요` : '') || (ending && getDay(state) < ending.day ? `${ending.day}일 이후 가능` : '') || (missingEnd ? `${flagLabel(missingEnd)} 필요` : '');
      return { id: choice.id, label: choice.label, description: choice.description, disabled: Boolean(reason), reason };
    }),
  };
}

export function chooseEvent(state, choiceId) {
  if (state.ending) return { ok: false, reason: '이번 생존이 끝났습니다' };
  const definition = EVENTS.find(event => event.id === state.event);
  const choice = definition?.choices.find(choice => choice.id === choiceId);
  if (!choice) return { ok: false, reason: '선택지를 찾을 수 없습니다' };
  const available = getEvent(state).choices.find(choice => choice.id === choiceId);
  if (available.disabled) return { ok: false, reason: available.reason };
  for (const [key, amount] of Object.entries(choice.cost || {})) state.resources[key] -= amount;
  change(state, choice.effects);
  state.eventHistory[definition.id] = getDay(state);
  if (choice.defer) state.deferred[definition.id] = true;
  else delete state.deferred[definition.id];
  state.event = null;
  state.nextEventAt = state.time + 480 + Math.floor(random(state) * 360);
  log(state, choice.result, choice.effects.ending ? 'ending' : 'story');
  checkDeath(state);
  return { ok: true };
}

function checkDeath(state) {
  if (state.stats.health <= 0 && !state.ending) {
    state.ending = { ...ENDINGS.death, day: getDay(state) };
    state.event = null;
    state.action = null;
    state.paused = true;
    log(state, '더는 몸을 일으킬 힘이 남아 있지 않다. 마지막 불씨가 꺼졌다.', 'ending');
  }
}

function newDay(state) {
  state.lastDay = getDay(state);
  log(state, `${getDay(state)}일째. ${getWeather(state).label}. 또 하나의 아침을 향해.`, 'day');
  const due = state.delayed.filter(effect => effect.dueDay <= getDay(state));
  state.delayed = state.delayed.filter(effect => effect.dueDay > getDay(state));
  for (const effect of due) { change(state, effect.effects); log(state, effect.text, 'story'); }
  const vulnerability = Math.max(0, (55 - state.stats.defense) / 100);
  if (getDay(state) >= 3 && random(state) < vulnerability) {
    const loss = state.flags.dog ? 1 : 2;
    change(state, { resources: { food: -loss }, stats: { health: state.flags.dog ? -2 : -6, morale: -4 } });
    log(state, `밤사이 계단실에 침입 흔적이 남았다. 식량 −${loss}. 출입문을 보강하자.`, 'warning');
  }
  if (getWeather(state).id === 'wind' && state.roof.height >= 15) {
    change(state, { stats: { defense: -3 } });
    log(state, '높은 옥상에 강풍이 불어 보강재가 느슨해졌다. 방어 −3.', 'warning');
  }
}

function step(state, minutes) {
  const dayFraction = minutes / 1440;
  const waterBefore = state.resources.water;
  const foodCost = (state.flags.dog ? 3 : 2) * dayFraction;
  const waterCost = (3 + (state.flags.garden ? 0.5 : 0)) * dayFraction;
  const waterGain = state.flags.collector ? (getWeather(state).id === 'rain' ? 5 : 1) * (state.roof.type === 'utility' ? 1.25 : 1) * dayFraction : 0;
  const foodGain = state.flags.garden && waterBefore > 0 ? 1.6 * (state.roof.type === 'garden' ? 1.25 : 1) * dayFraction : 0;
  const foodShortage = Math.max(0, foodCost - state.resources.food - foodGain);
  const waterShortage = Math.max(0, waterCost - state.resources.water - waterGain);
  change(state, { resources: { food: foodGain - foodCost, water: waterGain - waterCost }, stats: {
    health: -(foodCost ? foodShortage / foodCost : 0) * 24 * dayFraction - (waterCost ? waterShortage / waterCost : 0) * 55 * dayFraction,
    morale: (-2 + (state.flags.dog ? 2.5 : 0) + (state.flags.ally ? 1 : 0)) * dayFraction - (foodShortage + waterShortage) * 2,
    defense: -1.5 * dayFraction,
  } });
  if (state.stats.morale <= 10) change(state, { stats: { health: -10 * dayFraction } });
  for (const key of ['food', 'water']) {
    const empty = state.resources[key] <= 1e-8;
    if (empty && !state.depletion[key]) log(state, `${resourceNames[key]}이 바닥났다. 보급하지 않으면 체력이 줄어든다.`, 'warning');
    state.depletion[key] = empty;
  }
  state.time += minutes;
  if (getDay(state) > state.lastDay) newDay(state);
  checkDeath(state);
  if (state.ending) return;
  if (state.action) {
    state.action.remaining -= minutes;
    if (state.action.remaining <= 1e-7) finishAction(state);
  }
  checkDeath(state);
  if (!state.ending && state.time >= state.nextEventAt - 1e-7) triggerEvent(state);
}

export function tick(state, realSeconds) {
  if (state.paused || state.event || state.ending || !Number.isFinite(realSeconds) || realSeconds <= 0) return;
  // There is no wall-clock timestamp: a restored game never catches up offline.
  let remaining = Math.min(realSeconds, 3600) * MINUTES_PER_REAL_SECOND * clamp(Number(state.speed) || 1, 0.25, 4);
  while (remaining > 1e-7 && !state.paused && !state.event && !state.ending) {
    const chunk = Math.min(remaining, 1, Math.max(1e-6, state.nextEventAt - state.time), state.action ? state.action.remaining : Infinity);
    step(state, chunk);
    remaining -= chunk;
  }
}

export function serialize(state) { return JSON.stringify(state); }

const finite = (value, min, max) => typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
const plain = value => value && typeof value === 'object' && !Array.isArray(value);

export function deserialize(value) {
  try {
    if (typeof value !== 'string' || value.length > 200000) return null;
    const saved = JSON.parse(value);
    if (!plain(saved) || ![1, 2].includes(saved.version)) return null;
    if (saved.version === 1) {
      if (!plain(saved.flags) || !plain(saved.eventHistory) || !Array.isArray(saved.log)) return null;
      saved.version = 2;
      saved.flags = { ...Object.fromEntries(FLAG_KEYS.map(key => [key, false])), ...saved.flags };
      saved.deferred = {};
      saved.delayed = [];
      if (saved.eventHistory.departure !== undefined) saved.flags.ferryPlan = true;
      if (saved.eventHistory.community !== undefined) saved.flags.charterWanted = true;
      if (saved.eventHistory.rescue_arrives !== undefined) saved.flags.evacuationOffer = true;
      if (saved.ending && saved.ending.id !== 'death') {
        if (!['rescue', 'departure', 'community'].includes(saved.ending.id)) return null;
        const oldEnding = saved.ending.id;
        saved.flags.route = saved.flags.route || oldEnding === 'departure';
        saved.flags.evacuationOffer = saved.flags.evacuationOffer || oldEnding === 'rescue';
        saved.flags.charterWanted = saved.flags.charterWanted || oldEnding === 'community';
        saved.ending = null;
        saved.event = null;
        saved.paused = true;
        saved.nextEventAt = Math.max(saved.time + 120, saved.nextEventAt || 0);
        saved.log.push({ id: saved.logId++, day: getDay(saved), time: timeLabel(saved), type: 'story', text: '이전의 탈출·정착 선택은 이제 긴 이야기의 시작입니다. 생존 기록과 물자는 유지되었습니다. 준비한 경로의 다음 사건부터 계속할 수 있습니다.' });
        saved.log = saved.log.slice(-80);
      }
    }
    if (!finite(saved.seed, 1, 4294967295) || !Number.isInteger(saved.seed) || !finite(saved.rng, 1, 4294967295) || !Number.isInteger(saved.rng)) return null;
    if (!finite(saved.time, 0, 1440 * 100000) || typeof saved.paused !== 'boolean' || !finite(saved.speed, 0.25, 4)) return null;
    if (!plain(saved.resources) || RESOURCE_KEYS.some(key => !finite(saved.resources[key], 0, 9999))) return null;
    if (!plain(saved.stats) || STAT_KEYS.some(key => !finite(saved.stats[key], 0, 100))) return null;
    if (!plain(saved.flags) || FLAG_KEYS.some(key => typeof saved.flags[key] !== 'boolean')) return null;
    const roof = ROOFS.find(roof => roof.type === saved.roof?.type);
    if (!roof || !Number.isInteger(saved.roof.height) || !finite(saved.roof.height, 8, 20)) return null;
    if (saved.event !== null && !EVENTS.some(event => event.id === saved.event)) return null;
    if (saved.ending !== null && (!plain(saved.ending) || !ENDINGS[saved.ending.id])) return null;
    if (!finite(saved.nextEventAt, saved.time, saved.time + 1440 * 100000)) return null;
    if (!plain(saved.eventHistory) || Object.entries(saved.eventHistory).some(([id, day]) => !EVENTS.some(event => event.id === id) || !Number.isInteger(day) || !finite(day, 1, getDay(saved)))) return null;
    if (!plain(saved.deferred) || Object.entries(saved.deferred).some(([id, value]) => value !== true || !EVENTS.some(event => event.id === id))) return null;
    if (!Array.isArray(saved.delayed) || saved.delayed.length > 50 || saved.delayed.some(effect => !plain(effect) || typeof effect.id !== 'string' || effect.id.length > 100 || !finite(effect.dueDay, 1, 100001) || !Number.isInteger(effect.dueDay) || typeof effect.text !== 'string' || effect.text.length > 1200 || !plain(effect.effects) || Object.keys(effect.effects).some(key => !['resources', 'stats', 'flags'].includes(key)) || Object.entries(effect.effects.flags || {}).some(([key, value]) => !FLAG_KEYS.includes(key) || typeof value !== 'boolean') || Object.entries(effect.effects.resources || {}).some(([key, value]) => !RESOURCE_KEYS.includes(key) || !finite(value, -100, 100)) || Object.entries(effect.effects.stats || {}).some(([key, value]) => !STAT_KEYS.includes(key) || !finite(value, -100, 100)))) return null;
    if (!Number.isInteger(saved.lastDay) || saved.lastDay !== getDay(saved)) return null;
    if (!Number.isInteger(saved.logId) || !finite(saved.logId, 1, Number.MAX_SAFE_INTEGER)) return null;
    if (!finite(saved.completedActions, 0, Number.MAX_SAFE_INTEGER) || !Number.isInteger(saved.completedActions)) return null;
    if (!plain(saved.depletion) || ['food', 'water'].some(key => typeof saved.depletion[key] !== 'boolean')) return null;
    if (!Array.isArray(saved.log) || saved.log.length > 80 || saved.log.some(entry => !plain(entry) || !Number.isInteger(entry.id) || !finite(entry.id, 1, saved.logId - 1) || !finite(entry.day, 1, getDay(saved)) || typeof entry.time !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(entry.time) || typeof entry.text !== 'string' || entry.text.length > 1200 || typeof entry.type !== 'string' || entry.type.length > 30)) return null;
    let action = null;
    if (saved.action !== null) {
      const definition = ACTIONS.find(action => action.id === saved.action?.id);
      if (!definition || !finite(saved.action.total, 1, 10000) || !finite(saved.action.remaining, Number.EPSILON, saved.action.total)) return null;
      action = { id: definition.id, label: definition.label, total: saved.action.total, remaining: saved.action.remaining };
    }
    // Rebuild known keys and authored text instead of trusting arbitrary save fields.
    return {
      version: 2, seed: saved.seed, rng: saved.rng, time: saved.time, paused: saved.paused, speed: saved.speed,
      resources: Object.fromEntries(RESOURCE_KEYS.map(key => [key, saved.resources[key]])),
      stats: Object.fromEntries(STAT_KEYS.map(key => [key, saved.stats[key]])),
      flags: Object.fromEntries(FLAG_KEYS.map(key => [key, saved.flags[key]])),
      roof: { ...roof, height: saved.roof.height }, action,
      event: saved.event, ending: saved.ending ? { ...ENDINGS[saved.ending.id], day: getDay(saved) } : null,
      log: saved.log.map(entry => ({ id: entry.id, day: entry.day, time: entry.time, text: entry.text, type: entry.type })),
      logId: saved.logId, nextEventAt: saved.nextEventAt,
      eventHistory: Object.fromEntries(Object.entries(saved.eventHistory)), lastDay: saved.lastDay,
      depletion: { food: saved.depletion.food, water: saved.depletion.water }, completedActions: saved.completedActions,
      deferred: { ...saved.deferred }, delayed: copy(saved.delayed),
    };
  } catch { return null; }
}
