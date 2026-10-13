// Original encounters for the rooftop. Effects are interpreted by game.js.
export const ROOFS = [
  { type: 'garden', name: '푸른 흔적', description: '주인이 사라진 화단이 남아 있습니다. 텃밭을 만들면 식량 생산량이 25% 늘어납니다.' },
  { type: 'utility', name: '물탱크 옆자리', description: '낡은 설비와 물탱크가 바람을 막아줍니다. 빗물받이의 물 생산량이 25% 늘어납니다.' },
  { type: 'split', name: '두 겹의 하늘', description: '작은 상부 옥상에서 계단 입구가 잘 보입니다. 기본 방어도가 10 높습니다.' },
  { type: 'wide', name: '바람이 머무는 곳', description: '넓은 옥상에 볕이 오래 듭니다. 휴식할 때 사기가 4 더 회복됩니다.' },
];

export const WEATHER = [
  { id: 'clear', label: '맑음', description: '도시 너머까지 보이는 맑은 날입니다.' },
  { id: 'cloudy', label: '흐림', description: '구름 아래 도시가 조용히 숨을 죽입니다.' },
  { id: 'rain', label: '비', description: '빗물받이가 있다면 물을 모을 수 있습니다.' },
  { id: 'wind', label: '강풍', description: '높은 옥상일수록 바람이 거셉니다.' },
];

export const EVENTS = [
  {
    id: 'first_knock', kicker: 'DAY 01 · 계단실', title: '아래층에서 들리는 세 번의 소리',
    body: '텐트의 마지막 줄을 묶을 때, 계단실에서 쿵, 쿵, 쿵 소리가 났다. 문 아래로 작은 통조림 하나가 굴러온다. 누가 놓고 간 걸까. 문 너머에서는 이제 아무 소리도 들리지 않는다.',
    once: true, priority: 100,
    choices: [
      { id: 'look', label: '문틈으로 주변을 살핀다', description: '식량 +2 · 물 +1 · 사기 +3', effects: { resources: { food: 2, water: 1 }, stats: { morale: 3 } }, result: '계단참에 남겨진 비상 배낭을 찾았다. 그 안에는 “위에서는 오래 버티길”이라고 적힌 메모가 있었다.' },
      { id: 'brace', label: '문 앞에 의자를 받쳐둔다', description: '부품 −1 · 방어 +8', cost: { parts: 1 }, effects: { stats: { defense: 8 } }, result: '의자 다리가 손잡이 아래에 단단히 걸렸다. 오늘 밤은 조금 안심할 수 있겠다.' },
      { id: 'wait', label: '텐트 안에서 잠시 기다린다', description: '사기 +2', effects: { stats: { morale: 2 } }, result: '바람 소리에 귀를 기울였다. 움직이지 않는 것도 때로는 살아남는 방법이다.' },
    ],
  },
  {
    id: 'stray_dog', kicker: '방문자 · 작은 발자국', title: '계단을 다 올라온 개',
    body: '흙투성이 개 한 마리가 열린 계단 문 앞에 앉아 있다. 목줄에는 흐릿한 이름만 남았다. “보리”. 녀석은 짖지도 않고, 네 손에 든 통조림을 바라본다.',
    once: true, minDay: 1, priority: 70,
    choices: [
      { id: 'adopt', label: '“들어와. 여긴 좀 좁아.”', description: '식량 −1 · 보리 합류 · 이후 식량 소비 1.5배 · 사기 +12 · 방어 +8', cost: { food: 1 }, effects: { flags: { dog: true }, stats: { morale: 12, defense: 8 } }, result: '보리가 텐트 옆을 세 번 돌고 눕는다. 이제 이 옥상에는 두 개의 숨소리가 있다.' },
      { id: 'feed', label: '한 끼를 나누고 보내준다', description: '식량 −1 · 사기 +5', cost: { food: 1 }, effects: { stats: { morale: 5 } }, result: '녀석은 한참을 돌아보다 계단 아래로 사라졌다. 어디선가 다시 만날 수 있기를.' },
      { id: 'decline', label: '먹을 것을 아껴야 한다', description: '사기 −4', effects: { stats: { morale: -4 } }, result: '문을 닫았다. 발소리가 멀어진 뒤에도 한동안 통조림을 열지 못했다.' },
    ],
  },
  {
    id: 'neighbor_lamp', kicker: '맞은편 옥상 · 불빛', title: '깜박, 깜박, 잠시 멈춤',
    body: '맞은편 옥상에서 손전등이 깜박인다. 사람이다. 너도 불빛을 흔들자, 작은 종이비행기가 두 건물 사이를 건너왔다. “혼자예요? 저는 윤입니다.”',
    once: true, minDay: 2, priority: 45,
    choices: [
      { id: 'answer', label: '종이에 이름을 적어 돌려보낸다', description: '이웃 윤과 연결 · 사기 +8', effects: { flags: { ally: true }, stats: { morale: 8 } }, result: '윤이 양팔을 크게 흔든다. 내일 같은 시간에 만나기로 했다. 이제 내일 할 일이 생겼다.' },
      { id: 'share', label: '통조림도 함께 건네준다', description: '식량 −2 · 이웃 윤과 연결 · 신뢰 획득 · 사기 +12', cost: { food: 2 }, effects: { flags: { ally: true, trusted: true }, stats: { morale: 12 } }, result: '로프에 매단 봉지가 건너갔다. 윤이 고개를 꾸벅 숙였다. 작은 다리가 놓인 기분이다.' },
      { id: 'hide', label: '지금은 모습을 숨긴다', description: '변화 없음', effects: {}, result: '불빛이 꺼질 때까지 기다렸다. 도시는 다시 검어졌다.' },
    ],
  },
  {
    id: 'water_cache', kicker: '탐색 · 오래된 설비', title: '물탱크 아래 작은 밸브',
    body: '낡은 탱크의 밸브를 두드리니 안쪽에서 물이 출렁인다. 배관은 녹슬었지만 고여 있는 물을 끓여 쓸 수 있겠다. 수도꼭지를 제대로 고치려면 부품이 필요하다.',
    minDay: 1, cooldown: 3,
    choices: [
      { id: 'repair', label: '밸브를 교체하고 받아둔다', description: '부품 −1 · 물 +5', cost: { parts: 1 }, effects: { resources: { water: 5 } }, result: '맑은 물줄기가 양동이를 채웠다. 무심코 수도를 잠그고, 혼자 조금 웃었다.' },
      { id: 'boil', label: '남은 물만 받아 끓인다', description: '물 +2', effects: { resources: { water: 2 } }, result: '주전자에서 김이 솟는다. 오늘 마실 물은 확보했다.' },
    ],
  },
  {
    id: 'wind_tarp', kicker: '날씨 · 바람', title: '날아가려는 작은 집',
    body: '갑자기 거세진 바람에 텐트가 부풀어 오른다. 빨랫줄이 팽팽해지고, 난간의 빈 깡통이 요란하게 구른다. 무언가를 붙잡아야 한다.',
    minDay: 2, cooldown: 4,
    choices: [
      { id: 'tie', label: '남은 철사로 텐트를 고정한다', description: '부품 −1 · 방어 +6', cost: { parts: 1 }, effects: { stats: { defense: 6 } }, result: '바람은 계속 불지만 텐트는 버텼다. 줄을 한 번 더 확인하고 따뜻한 차를 끓였다.' },
      { id: 'hold', label: '몸으로 누르고 버틴다', description: '체력 −6 · 사기 +2', effects: { stats: { health: -6, morale: 2 } }, result: '팔이 저리도록 버텼다. 바람이 잦아들자 도시의 불 꺼진 창문들이 다시 보였다.' },
      { id: 'move', label: '설비 뒤로 짐을 옮긴다', description: '식량 −1 · 방어 +2', effects: { resources: { food: -1 }, stats: { defense: 2 } }, result: '옮기는 동안 열린 식량 봉지 하나가 날아갔다. 그래도 잠잘 곳은 지켰다.' },
    ],
  },
  {
    id: 'stairwell', kicker: '아래층 · 남겨진 방', title: '문틈 사이의 구급상자',
    body: '아래층 관리실에 구급상자가 보인다. 깨진 유리 너머로 들어가야 하고, 복도 끝에서는 발을 끄는 소리가 들린다. 문밖에 놓인 공구함이라면 쉽게 가져올 수 있다.',
    minDay: 2, cooldown: 4,
    choices: [
      { id: 'medicine', label: '유리를 피해 안쪽까지 들어간다', description: '체력 −10 · 약품 +2 · 부품 +1', effects: { resources: { medicine: 2, parts: 1 }, stats: { health: -10 } }, result: '소매가 찢어졌지만 구급상자는 온전하다. 계단을 두 칸씩 뛰어올랐다.' },
      { id: 'tools', label: '공구함만 챙겨 돌아온다', description: '부품 +2', effects: { resources: { parts: 2 } }, result: '낡은 드라이버와 철사 한 뭉치. 지금은 이런 물건이 돈보다 귀하다.' },
      { id: 'close', label: '방화문을 닫고 올라온다', description: '방어 +5', effects: { stats: { defense: 5 } }, result: '쇠문이 묵직하게 닫혔다. 소리는 그 너머에 남았다.' },
    ],
  },
  {
    id: 'dog_warning', kicker: '보리 · 밤의 경보', title: '오늘은 짖지 않는 이유',
    body: '보리가 아주 낮게 으르렁거린다. 계단실 문 아래 그림자가 움직인다. 녀석은 네 바짓단을 물고 불빛에서 멀리 끌어당긴다.',
    minDay: 2, requires: ['dog'], cooldown: 3,
    choices: [
      { id: 'quiet', label: '불을 끄고 보리 옆에서 기다린다', description: '방어 +5 · 사기 +5', effects: { stats: { defense: 5, morale: 5 } }, result: '얼마 후 그림자가 사라졌다. 보리에게 조용히 고맙다고 말했다.' },
      { id: 'check', label: '안전해진 뒤 계단을 확인한다', description: '부품 +2 · 체력 −3', effects: { resources: { parts: 2 }, stats: { health: -3 } }, result: '부서진 문고리와 철제 봉을 챙겼다. 보리는 네가 돌아올 때까지 문 앞을 지켰다.' },
    ],
  },
  {
    id: 'neighbor_trade', kicker: '이웃 윤 · 로프 교역', title: '오늘의 작은 장터',
    body: '윤이 로프에 빈 바구니를 매달았다. 쪽지에는 교환할 수 있는 물건이 꼼꼼하게 적혀 있다. 마지막 줄은 “바가지 안 씌움. 진짜로.”',
    minDay: 3, requires: ['ally'], cooldown: 2,
    choices: [
      { id: 'food', label: '공구를 보내고 식량을 받는다', description: '부품 −2 · 식량 +4', cost: { parts: 2 }, effects: { resources: { food: 4 } }, result: '바구니에 통조림과 사탕 하나가 돌아왔다. 사탕은 서비스라고 했다.' },
      { id: 'medicine', label: '물을 나누고 약품을 받는다', description: '물 −2 · 약품 +1', cost: { water: 2 }, effects: { resources: { medicine: 1 } }, result: '윤이 약 봉투 뒷면에 복용법까지 적어 보냈다.' },
      { id: 'talk', label: '오늘은 안부만 전한다', description: '사기 +5', effects: { stats: { morale: 5 } }, result: '멀리 떨어져서 별것 아닌 이야기를 했다. 멸망하기 전에도 이런 날은 귀했다.' },
    ],
  },
  {
    id: 'neighbor_injury', kicker: '이웃 윤 · 꺼진 불빛', title: '약속 시간에 오지 않은 사람',
    body: '맞은편 옥상에 불빛이 없다. 한참 뒤 올라온 윤은 한쪽 팔을 감싸고 있다. 물자를 찾다가 다쳤다고, 크게 흔들리는 글씨로 적어 보냈다.',
    once: true, minDay: 4, requires: ['ally'], priority: 40,
    choices: [
      { id: 'help', label: '구급상자를 로프에 묶는다', description: '약품 −1 · 신뢰 획득 · 사기 +12', cost: { medicine: 1 }, effects: { flags: { trusted: true }, stats: { morale: 12 } }, result: '다음 날을 기약하는 손짓이 돌아왔다. 그 손이 조금 덜 떨렸다.' },
      { id: 'water', label: '깨끗한 물과 천을 보낸다', description: '물 −2 · 신뢰 획득 · 사기 +5', cost: { water: 2 }, effects: { flags: { trusted: true }, stats: { morale: 5 } }, result: '할 수 있는 만큼 도왔다. 윤은 몇 번이고 고맙다고 신호를 보냈다.' },
      { id: 'sorry', label: '지금은 나눌 여유가 없다', description: '사기 −5', effects: { stats: { morale: -5 } }, result: '윤은 괜찮다는 듯 손을 흔들었다. 그 모습이 오래 마음에 남았다.' },
    ],
  },
  {
    id: 'radio_voice', kicker: '전파 · 91.3 MHz', title: '잡음 속에 남은 목소리',
    body: '주워온 작은 라디오에서 목소리가 새어 나온다. “…고지대 생존자… 신호 확인… 북쪽 항로…” 수신부가 망가져 나머지는 들을 수 없다. 옥상에 안테나를 세우면 다시 연결할 수 있을지도 모른다.',
    once: true, minDay: 3, priority: 55,
    choices: [
      { id: 'record', label: '주파수와 방송 시간을 적는다', description: '구조 방송 단서 획득 · 부품 +1 · 사기 +5', effects: { flags: { rescueClue: true }, resources: { parts: 1 }, stats: { morale: 5 } }, result: '“해 질 무렵, 북쪽.” 수첩에 크게 적었다. 라디오를 수리할 이유가 생겼다.' },
      { id: 'salvage', label: '예비 부품까지 챙겨둔다', description: '구조 방송 단서 획득 · 부품 +2', effects: { flags: { rescueClue: true }, resources: { parts: 2 } }, result: '작동하는 조각들을 분리했다. 언젠가 목소리를 다시 이어 붙일 수 있기를.' },
    ],
  },
  {
    id: 'quiet_evening', kicker: '일상의 조각 · 노을', title: '오늘은 아무 일도 없었다',
    body: '주황빛이 깨진 유리창에 번진다. 주전자에서는 물 끓는 소리가 난다. 세상이 무너지기 전에도 이런 노을이 있었을 텐데, 그때는 잘 보지 못했다.',
    minDay: 2, cooldown: 3,
    choices: [
      { id: 'watch', label: '해가 질 때까지 가만히 앉아 있는다', description: '사기 +10', effects: { stats: { morale: 10 } }, result: '아무것도 하지 않은 시간이, 오늘을 버티게 해주었다.' },
      { id: 'meal', label: '조금 특별한 저녁을 차린다', description: '식량 −1 · 체력 +8 · 사기 +15', cost: { food: 1 }, effects: { stats: { health: 8, morale: 15 } }, result: '아껴둔 통조림을 데웠다. 빈 깡통을 씻어 작은 화분으로 만들었다.' },
    ],
  },
  {
    id: 'ferry_note', kicker: '도시의 소문 · 강변', title: '바람에 실려온 지도',
    body: '난간에 걸린 종이에 강변까지 이어지는 길이 그려져 있다. 누군가 옥상들을 거치며 남긴 안내다. “남쪽 나루. 해 뜨기 전. 배가 아직 있어요.” 여기서 계속 버틸지, 밖으로 나갈지 선택할 날이 올 것 같다.',
    once: true, minDay: 4, priority: 50,
    choices: [
      { id: 'keep', label: '안전한 이동 경로를 표시한다', description: '강변 탈출 경로 발견 · 사기 +5', effects: { flags: { route: true }, stats: { morale: 5 } }, result: '지도 한쪽에 “돌아갈 곳”이라 적고 지금의 옥상을 표시했다.' },
      { id: 'stay', label: '지도는 보관하되 옥상을 정비한다', description: '강변 탈출 경로 발견 · 방어 +4', effects: { flags: { route: true }, stats: { defense: 4 } }, result: '떠날 수 있다는 것만으로 이곳이 감옥처럼 느껴지지 않았다.' },
    ],
  },
  {
    id: 'green_sprout', kicker: '옥상 · 생명의 흔적', title: '갈라진 콘크리트 사이',
    body: '바닥의 틈 사이로 작은 풀이 올라왔다. 근처 창고에는 흙과 오래된 씨앗 봉투가 남아 있다. 통조림만 세던 손으로 무언가를 길러보면 어떨까.',
    once: true, minDay: 2,
    choices: [
      { id: 'save', label: '씨앗과 쓸 만한 화분을 챙긴다', description: '부품 +2 · 사기 +4', effects: { resources: { parts: 2 }, stats: { morale: 4 } }, result: '빈 화분을 나란히 놓았다. 텃밭을 만들면 매일 조금씩 식량을 얻을 수 있다.' },
      { id: 'look', label: '밟히지 않도록 작은 돌을 놓는다', description: '사기 +8', effects: { stats: { morale: 8 } }, result: '오늘은 저 풀도 살아남았다. 이상하게 그게 기뻤다.' },
    ],
  },
  {
    id: 'roof_fire', kicker: '돌발 상황 · 작은 불씨', title: '연기가 이상하게 맵다',
    body: '바람에 날린 불씨가 천 조각에 옮겨붙었다. 불길은 아직 작지만 보급 상자 바로 옆이다. 지금 손을 쓰면 번지는 것을 막을 수 있다.',
    minDay: 4, cooldown: 6,
    choices: [
      { id: 'water', label: '물을 부어 끈다', description: '물 −2 · 방어 +4', cost: { water: 2 }, effects: { stats: { defense: 4 } }, result: '불이 꺼졌다. 다음에는 모닥불 주변을 더 넓게 비워두기로 했다.' },
      { id: 'sand', label: '화분의 흙으로 덮는다', description: '체력 −5 · 사기 −2', effects: { stats: { health: -5, morale: -2 } }, result: '뜨거운 통에 손을 데었지만 물자는 지켰다.' },
    ],
  },
  {
    id: 'migration', kicker: '거리 · 이동하는 무리', title: '아래의 도시가 움직인다',
    body: '수십 개의 그림자가 같은 방향으로 골목을 채운다. 어딘가에서 난 큰 소리가 무리를 깨운 모양이다. 오늘은 계단 문을 더 주의해야 한다.',
    minDay: 5, cooldown: 4,
    choices: [
      { id: 'fortify', label: '문에 보강재를 덧댄다', description: '부품 −2 · 방어 +10', cost: { parts: 2 }, effects: { stats: { defense: 10 } }, result: '문이 한 번 크게 흔들린 뒤 조용해졌다. 보강재는 제 역할을 했다.' },
      { id: 'silent', label: '불빛을 가리고 숨을 죽인다', description: '사기 −6 · 방어 −4', effects: { stats: { morale: -6, defense: -4 } }, result: '긴 시간이 지나 무리가 흩어졌다. 아침 햇빛이 이렇게 반가웠던 적은 없다.' },
    ],
  },
  {
    id: 'signal_reply', kicker: '무전기 · 응답', title: '“거기, 들립니까?”',
    body: '잡음이 뚝 끊기고 분명한 목소리가 들렸다. 북쪽 구조팀이다. 네 위치를 되묻더니, 항로가 열리면 옥상으로 접근하겠다고 한다. 밝은 표식을 준비해달라는 부탁도 남겼다.',
    once: true, minDay: 5, requires: ['radio'], priority: 80,
    choices: [
      { id: 'mark', label: '반사판과 흰 천으로 표식을 만든다', description: '부품 −1 · 구조 위치 등록 · 사기 +10', cost: { parts: 1 }, effects: { flags: { rescueSignal: true }, stats: { morale: 10 } }, result: '하늘에서 보일 만큼 큰 원을 그렸다. 이제 기다림에 방향이 생겼다.' },
      { id: 'voice', label: '건물 이름과 좌표를 반복해서 알린다', description: '구조 위치 등록 · 사기 +5', effects: { flags: { rescueSignal: true }, stats: { morale: 5 } }, result: '“확인했습니다. 거기서 살아계세요.” 짧은 말이 오래 울렸다.' },
    ],
  },
  {
    id: 'rescue_arrives', kicker: '분기 · 북쪽의 회전날개', title: '우리 옥상을 찾은 불빛',
    body: '바람 소리가 엔진 소리로 바뀐다. 구조 헬기가 옥상 위를 선회하고, 무전기에서 네 이름을 부른다. 남은 물자를 내려놓고 올라갈 시간이다. 이곳에 남기로 할 수도 있다.',
    once: true, minDay: 8, requires: ['radio', 'rescueSignal'], priority: 100,
    choices: [
      { id: 'leave', label: '짐을 챙기고 구조 줄을 잡는다', description: '엔딩 · 하늘로 이어진 길', effects: { ending: 'rescue' }, result: '발이 콘크리트를 떠난다. 작아지는 텐트를 끝까지 바라보았다.' },
      { id: 'stay', label: '아직 여기서 할 일이 있다', description: '계속 생존 · 식량 +5 · 물 +5 · 약품 +2', effects: { resources: { food: 5, water: 5, medicine: 2 }, flags: { rescueDeclined: true } }, result: '구조팀이 보급 상자를 내려주었다. 연락은 열어두겠다고 했다. 옥상에 다시 고요가 내려앉았다.' },
    ],
  },
  {
    id: 'departure', kicker: '분기 · 남쪽 나루', title: '내일 새벽, 배가 떠난다',
    body: '지도의 주인에게서 마지막 신호가 왔다. 나루의 작은 배가 내일 새벽 출발한다. 거기까지 가려면 단단한 장비와 이틀치 보급품이 필요하다. 미루면 다시 기회를 기다려야 한다.',
    minDay: 7, requires: ['route'], cooldown: 4, priority: 75,
    choices: [
      { id: 'leave', label: '남쪽으로 떠날 준비를 마친다', description: '식량 −4 · 물 −4 · 부품 −3 · 체력 35 이상 필요 · 엔딩', cost: { food: 4, water: 4, parts: 3 }, minHealth: 35, effects: { ending: 'departure' }, result: '동이 트기 전 텐트를 접었다. 계단 아래에는 이제 두려움 말고도 길이 있었다.' },
      { id: 'wait', label: '이번에는 옥상에 남는다', description: '계속 생존 · 사기 +2', effects: { stats: { morale: 2 } }, result: '배의 작은 불빛이 강 쪽으로 사라졌다. 다음 기회까지 살아남기로 했다.' },
    ],
  },
  {
    id: 'community', kicker: '분기 · 옥상과 옥상 사이', title: '이곳에 이름을 붙이자',
    body: '빗물통은 차 있고 텃밭에는 새 잎이 났다. 보강한 문 너머로 윤의 로프 다리가 이어진다. 더 이상 하루만 버티는 곳이 아니다. 윤이 종이를 펼친다. “우리 동네 이름, 뭘로 할까요?”',
    minDay: 10, requires: ['ally', 'collector', 'garden', 'barricade'], minDefense: 60, cooldown: 4, priority: 95,
    choices: [
      { id: 'settle', label: '“내일도 여기.” 작은 마을을 시작한다', description: '식량 −3 · 물 −3 · 엔딩 · 내일도 여기', cost: { food: 3, water: 3 }, effects: { ending: 'community' }, result: '첫 번째 규칙은 간단했다. 불을 켜두기. 누군가 돌아올 수 있도록.' },
      { id: 'later', label: '조금 더 준비한 뒤에 이야기하자', description: '계속 생존 · 사기 +8', effects: { stats: { morale: 8 } }, result: '이름을 적을 종이는 텐트 안에 붙여두었다. 아직 빈칸이지만, 약속처럼 보였다.' },
    ],
  },
];

export const ENDINGS = {
  rescue: { id: 'rescue', title: '하늘로 이어진 길', body: '구조 헬기의 창밖으로 옥상들이 멀어진다. 그 작은 공간에서 너는 매일 내일을 만들었다. 이제 다음 날은 다른 곳에서 시작된다.' },
  departure: { id: 'departure', title: '강 건너의 아침', body: '낡은 배가 강물을 가른다. 낯선 사람들과 나눈 첫 식사는 따뜻했다. 뒤돌아보니 도시의 높은 곳에 아침빛이 닿고 있었다.' },
  community: { id: 'community', title: '내일도 여기', body: '옥상과 옥상 사이에 빨랫줄과 다리가 걸렸다. 누군가는 씨앗을 심고, 누군가는 문을 지킨다. 살아남는 곳은 어느새 살아가는 곳이 되었다.' },
  death: { id: 'death', title: '마지막 불씨', body: '모닥불에 더는 장작이 놓이지 않는다. 하지만 이곳에서 버틴 날들은 사라지지 않는다. 다른 옥상, 다른 아침에서 다시 시작할 수 있다.' },
};

// Story vocabulary is shared with the journal and the choice requirement labels.
export const TRAITS = [
  { id: 'scout', label: '골목 정찰', description: '탐색 피해 2 감소(최소 1). 위험한 이동에서 우회 선택지를 찾습니다.' },
  { id: 'engineer', label: '설비 수리', description: '시설 제작·정비 시간이 20% 줄고 수리 사건에서 적은 부품으로 해결합니다.' },
  { id: 'medic', label: '응급처치', description: '약품 치료량 +10. 부상자와 오염된 물을 다루는 선택지가 열립니다.' },
  { id: 'negotiator', label: '중재', description: '배급과 구조 명단을 둘러싼 갈등에서 대안을 제시할 수 있습니다.' },
  { id: 'climber', label: '로프 이동', description: '닫힌 문과 끊어진 길을 건너는 대체 경로를 사용할 수 있습니다.' },
];
export const CLUES = [
  { id: 'masterKey', label: '학교 관리 열쇠', description: '윤이 건넨 열쇠. 잠긴 학교의 다른 출입구를 엽니다.' },
  { id: 'recorder', label: '휴대 녹음기', description: '명령과 증언을 보존하는 작은 녹음기.' },
  { id: 'yoonPhoto', label: '수아의 사진', description: '윤의 동생 수아. 마지막 목격지는 강변 초등학교.' },
  { id: 'schoolLocated', label: '학교 진입 지도', description: '행동 메뉴의 학교 수색으로 실제 흔적을 확인할 수 있습니다.' },
  { id: 'schoolRecon', label: '학교 수색 기록', description: '수아가 방송실에서 날짜를 적으며 버텼다는 기록.' },
  { id: 'sisterSaved', label: '돌아온 수아', description: '목숨을 구한 동생. 윤의 이야기가 함께 떠날 길로 이어집니다.' },
  { id: 'sisterLost', label: '돌려주지 못한 이름표', description: '수아를 데려오지 못했다. 남은 사람들의 몫을 선택해야 합니다.' },
  { id: 'yoonSecret', label: '윤의 고백', description: '윤은 봉쇄 당시 학교 문을 잠갔던 운전기사였다.' },
  { id: 'rescueClue', label: '91.3 MHz', description: '구조 방송의 주파수. 무전기 수리부터 시작할 수 있습니다.' },
  { id: 'rescueSignal', label: '구조팀 호출부호', description: '중계소 조사 행동으로 방송의 발신지를 확인할 수 있습니다.' },
  { id: 'towerSurvey', label: '중계소 녹음', description: '공개 방송과 실제 구조 지침이 서로 다르다.' },
  { id: 'evidence', label: '선별 명령 원본', description: '방치된 구역과 구조 인원을 임의로 지운 기록.' },
  { id: 'decoded', label: '해독한 항로', description: '안전 항로와 구조선 교대 시간이 적혀 있다.' },
  { id: 'openManifest', label: '모두의 명단', description: '이름 없는 사람도 구조 대상에 넣기로 했다.' },
  { id: 'manifestSelective', label: '제한된 명단', description: '구조팀의 인원 제한을 받아들였다.' },
  { id: 'archiveSaved', label: '도시에 보낼 증언', description: '증거를 공개하기 위해 증언과 좌표를 묶어두었다.' },
  { id: 'route', label: '강변 약도', description: '행동 메뉴의 강변 정찰로 실제 통행 가능 여부를 확인해야 합니다.' },
  { id: 'riverSurvey', label: '강변 정찰 기록', description: '기존 나루는 침수됐다. 상류에서 배를 수리할 수 있다.' },
  { id: 'ferryFixed', label: '수리한 작은 배', description: '아직 떠날 수는 없다. 승선 명단과 수문 통과가 남았다.' },
  { id: 'waterSafe', label: '안전한 식수 체계', description: '여과·끓이기·격리 규칙을 정해 오염을 막았다.' },
  { id: 'pantry', label: '공동 식량창고', description: '같이 쓰고 같이 기록하는 배급 원칙을 정했다.' },
  { id: 'charter', label: '옥상의 약속', description: '누가 결정하고 누가 책임지는지 함께 정한 규칙.' },
  { id: 'defensePlan', label: '최후 방어 계획', description: '아래층 봉쇄와 옥상 사이의 퇴로가 준비됐다.' },
  { id: 'defenseWon', label: '함께 지킨 밤', description: '마지막 침입을 버텼다. 이곳을 마을로 부를 자격을 얻었다.' },
];

export const END_REQUIREMENTS = {
  departure: { day: 20, flags: ['routeReady', 'ferryManifest', 'schoolResolved'] },
  reunion: { day: 22, flags: ['routeReady', 'ferryManifest', 'schoolResolved', 'sisterSaved', 'familySeats'] },
  rescue: { day: 22, flags: ['corridorReady', 'transmitter', 'decoded', 'manifestSelective'] },
  rescue_all: { day: 24, flags: ['corridorReady', 'transmitter', 'decoded', 'openManifest', 'waterSafe', 'pantry'] },
  broadcast: { day: 24, flags: ['corridorReady', 'transmitter', 'decoded', 'archiveSaved', 'evidence'] },
  community: { day: 24, flags: ['charter', 'defenseWon', 'waterSafe', 'pantry', 'ally', 'collector', 'garden', 'barricade'] },
};

Object.assign(ENDINGS, {
  departure: { id: 'departure', title: '남겨둔 자리', body: '배의 빈자리에 배낭을 놓았다가 다시 치운다. 모두를 데려오지는 못했다. 윤은 강 가운데에서 오래 뒤를 보았다. 살아남았다는 말만으로 오늘을 설명할 수는 없지만, 건너편에는 아직 해야 할 일이 있다.' },
  reunion: { id: 'reunion', title: '셋이 맞는 아침', body: '수아가 배의 이름을 묻는다. 윤은 대답 대신 웃다가 운다. 강 건너에서 첫 아침을 먹으며 셋이 이름을 정했다. 그동안 기다려온 말이었다. “돌아오는 길.” 수아가 배 옆면에 그 이름을 쓰는 동안 윤은 붓에 물감을 다시 묻혀주었다.' },
  rescue: { id: 'rescue', title: '명단에 남은 이름', body: '줄이 끌어올려지고, 아래에서 흔드는 손들이 작아진다. 제한된 명단 안에서 너는 살아남았다. 구조소의 깨끗한 침대에서도 윤이 묻던 말을 기억한다. 누가 명단을 쓰는가. 이제 그 질문에서 눈을 돌리지 않기로 한다.' },
  rescue_all: { id: 'rescue_all', title: '마지막 사람까지', body: '수차례의 운항 끝에 마지막 옥상 불빛이 꺼졌다. 그곳의 사람도 이제 이쪽에 있다는 뜻이다. 식량을 나누고 명단을 다시 쓰고 버틴 밤들이 오늘을 만들었다. 무전기 너머 누군가 출석을 부른다. 모두가 대답한다.' },
  broadcast: { id: 'broadcast', title: '아무도 지울 수 없는 목소리', body: '너는 마지막 보급품을 송신기에 연결했다. 봉쇄 지시와 사라진 사람들의 이름이 도시 전역으로 퍼졌다. 누군가 답신하고 또 다른 옥상이 중계를 시작했다. 구조는 아직 오지 않았다. 그러나 이제 그들은 너희를 없었던 사람으로 만들 수 없다.' },
  community: { id: 'community', title: '내일도 여기', body: '마지막 방어가 끝난 아침, 먼저 일어난 사람이 물을 끓였다. 배급을 둘러싸고 다투던 사람도 옆에 앉았다. 이곳은 완벽하지 않고 앞으로도 쉽지 않을 것이다. 그래도 문 위에는 모두가 함께 정한 이름이 걸렸다. 내일도 여기.' },
});

const C = (id, label, description, effects = {}, options = {}) => ({ id, label, description, effects, result: options.result || `${label}. 그 선택은 옥상의 기록에 남았다.`, ...options });
const E = (id, arc, minDay, title, body, choices, options = {}) => ({ id, kicker: `${arc} · 이어지는 이야기`, minDay, title, body, choices, once: true, priority: 50, ...options });
const wait = (label = '준비를 더 하고 다시 이야기한다') => C('wait', label, '이 사건은 2일 뒤 다시 논의할 수 있습니다.', {}, { defer: true, result: '지금은 답을 미뤘다. 이틀쯤 뒤 다시 이야기하기로 했다. 그동안 준비할 수 있다.' });
const patch = (id, data) => Object.assign(EVENTS.find(event => event.id === id), data);

// The former quick endings now only begin a route. No rescue offer ends a run.
patch('rescue_arrives', {
  minDay: 8, requires: ['rescueSignal', 'ally'], priority: 48, after: { signal_reply: 2 },
  title: '구조는 아직 약속이 아니다',
  body: '멀리서 들린 회전날개 소리에 모두가 일어선다. 그러나 헬기는 옥상을 지나 북쪽으로 사라진다. 무전기는 “명단 확인 전에는 접근할 수 없다”는 말만 반복한다.\n\n윤이 묻는다. “그 명단에 없는 사람은요?” 상대는 잠시 침묵한다. 지금 필요한 것은 짐을 싸는 일이 아니라, 누가 어떤 기준으로 구조되는지 알아내는 일이다.',
  choices: [C('leave', '구조 절차를 끝까지 확인한다', '구조 경로 시작 · 사기 +3 · 즉시 탈출하지 않습니다', { flags: { evacuationOffer: true }, stats: { morale: 3 } }, { result: '호출부호를 적었다. 다음 방송의 지시를 듣고, 중계소에서 진실을 확인해야 한다.' }), C('stay', '이웃의 이름도 함께 전달한다', '구조 경로 시작 · 중재 능력 획득', { flags: { evacuationOffer: true, negotiator: true } }, { result: '이웃들의 이름을 천천히 읽었다. 무전기 너머의 사람이 마침내 펜을 드는 소리가 났다.' })],
});
patch('departure', {
  minDay: 7, requires: ['route', 'ally'], after: { ferry_note: 2 }, once: true, priority: 42,
  title: '나루까지 가면 끝일 줄 알았다',
  body: '강변에서 돌아온 사람이 말했다. 지도에 적힌 나루는 잠겼고 배의 밑바닥에는 구멍이 났다고. 그래도 상류 작업장에 부품이 남아 있을지 모른다. 배를 살릴 수 있다면 길은 생긴다.\n\n윤은 수아의 사진을 접어 주머니에 넣는다. “먼저 찾아야 할 사람이 있어요.” 떠난다는 결정만으로 누구를 데려갈지까지 정해지지는 않는다.',
  choices: [C('leave', '배와 사람을 함께 찾아보기로 한다', '강변 탈출 준비 시작 · 식량 −1 · 사기 +5', { flags: { ferryPlan: true }, stats: { morale: 5 } }, { cost: { food: 1 }, result: '강변 정찰과 학교 수색을 수첩에 나란히 적었다. 떠나기 전에 돌아와야 할 이유가 생겼다.' }), C('wait', '지도를 펴고 필요한 준비부터 적는다', '강변 탈출 준비 시작 · 바로 떠나지 않습니다', { flags: { ferryPlan: true } }, { result: '실제 길을 살피고 배를 수리하고 사람을 찾아야 한다. 오늘은 그 첫 줄을 적었다.' })],
});
patch('community', {
  minDay: 10, requires: ['ally'], minDefense: 0, priority: 40, once: true,
  title: '“우리”라는 말의 무게',
  body: '윤이 옥상들을 이은 지도를 가져왔다. 가까운 세 건물에 아직 사람이 산다. 물통과 식량을 합치면 오래 버틸 수 있지만, 누군가 더 많이 먹으면 누가 말해야 할까.\n\n이름을 붙이고 공동체라고 부르는 일은 쉽다. 아픈 사람을 돌보고, 배급표에 화를 내는 사람을 설득하고, 마지막 밤에 문을 지키는 일이 먼저 남아 있다.',
  choices: [C('settle', '먼저 함께 살아갈 규칙을 생각한다', '공동체 준비 시작 · 중재 능력 획득', { flags: { charterWanted: true, negotiator: true } }, { result: '종이 위 첫 문장은 “의견이 다를 때도 문은 닫지 않는다”였다. 아직 약속을 지킬 방법을 찾아야 한다.' }), C('later', '서로 필요한 물건부터 확인한다', '공동체 준비 시작 · 부품 +2', { flags: { charterWanted: true }, resources: { parts: 2 } }, { result: '겹치는 공구와 모자라는 식량이 보였다. 나누는 일부터 배워보기로 했다.' })],
});
patch('neighbor_lamp', { body: '맞은편 옥상에서 손전등이 세 번 깜박인다. 건너온 종이비행기에는 “혼자예요? 저는 윤입니다”라고 적혀 있다. 뒷면에는 얼굴 부분만 닳아버린 사진 한 장이 붙어 있다.\n\n윤은 네 대답보다 사진을 오래 바라본다. 누군가를 기다리는 사람의 표정이다. 신호를 돌려주면 단순한 물자 교환보다 긴 이야기에 발을 들이게 될 것 같다.' });
patch('radio_voice', { body: '“…고지대 생존자… 신호 확인… 북쪽 항로…” 라디오에서 끊어진 목소리가 나온다. 그런데 같은 녹음이 정확히 같은 간격으로 반복된다. 지금 송출하는 방송인지, 남겨진 장치가 혼자 도는 것인지 알 수 없다.\n\n봉쇄 첫날에도 이 문장을 들었던 것 같다. 당시 학교 앞에 멈춰 있던 구조차량들이 떠오른다. 그 사람들은 어디로 갔을까. 무전기를 수리하면 방송의 주인에게 직접 물을 수 있다.' });

const additions = [
  E('old_trade', '첫날의 배낭', 1, '당신이 하던 일', '배낭 바닥에서 예전 일터의 출입증이 나왔다. 멸망 이전의 이름과 직책이 유난히 낯설다. 그때 배운 일이 이곳에서도 쓸모가 있을까.\n\n계단 지도를 그리는 손, 녹슨 볼트를 만지는 손, 다친 사람의 맥을 짚는 손. 누구였는지 전부 기억할 필요는 없다. 오늘 어떤 일을 먼저 해낼 수 있는지만 골라보자.', [
    C('scout', '골목을 외우며 배달하던 때를 떠올린다', '골목 정찰 획득 · 탐색 피해 감소', { flags: { scout: true } }, { result: '건물 사이의 빈틈을 보는 버릇은 남아 있다. 위험을 피할 길을 먼저 찾을 수 있다.' }),
    C('engineer', '설비를 고치던 손놀림을 떠올린다', '설비 수리 획득 · 제작 시간 20% 감소', { flags: { engineer: true } }, { result: '망가진 것부터 살핀다. 모든 것을 새로 만들 필요는 없다.' }),
    C('medic', '응급처치 교육 때 적은 수첩을 편다', '응급처치 획득 · 약품 치료량 +10', { flags: { medic: true } }, { result: '흔들리는 손부터 진정시킨다. 한 사람을 살리는 순서는 아직 기억난다.' }),
  ], { priority: 90, after: { first_knock: 0 } }),
  E('yoon_reconnect', '이웃 윤', 3, '다시 건너온 종이비행기', '지난번 외면했던 불빛이 다시 켜졌다. 이번 종이에는 물건 이야기가 없다. “학교 쪽에서 사람을 본 적 있나요?” 한 줄 아래에 몇 번이고 고친 이름이 있다. 수아.\n\n윤은 답이 없어도 네 옥상을 계속 살펴왔던 모양이다. 당장 누군가의 부탁을 책임질 필요는 없다. 그래도 말을 듣는 것까지 막을 이유는 없다.', [C('answer', '이번에는 이름을 불러준다', '윤과 연결 · 사기 +5', { flags: { ally: true }, stats: { morale: 5 } }, { result: '윤이 손전등을 내려놓고 한참 얼굴을 가렸다. 말을 꺼내기까지 시간이 필요해 보였다.' }), wait('아직은 거리를 둔다')], { excludes: ['ally'], after: { neighbor_lamp: 1 }, priority: 75 }),
  E('yoon_photo', '윤의 이야기 1', 3, '사진 뒷면의 날짜', '윤은 사진을 로프에 매달아 보냈다. 동생 수아가 교복을 입고 웃고 있다. 사진 뒤에는 봉쇄가 시작된 날짜와 강변 초등학교 주소가 적혀 있다.\n\n“마지막 통화에서 거기로 가라고 했어요. 안전할 거라고.” 윤은 왜 안전하다고 믿었는지 말하지 않는다. 부탁은 짧다. 탐색할 때 이름 하나만 기억해달라는 것이다.', [C('promise', '수아의 이름을 수첩 첫 장에 적는다', '수아의 사진 획득 · 신뢰 획득', { flags: { yoonPhoto: true, trusted: true } }, { result: '사진을 돌려보내자 윤은 한 장 더 있다고 했다. 종이 뒷면은 눈물에 젖어 있었다.' }), C('careful', '찾아보되 섣불리 약속하지 않는다', '수아의 사진 획득 · 사기 +3', { flags: { yoonPhoto: true }, stats: { morale: 3 } }, { result: '확신할 수 없는 말은 하지 않았다. 윤은 오히려 고맙다고 했다.' })], { requires: ['ally'], after: { neighbor_lamp: 1 } }),
  E('school_map', '윤의 이야기 2', 5, '정문 말고 다른 문', '학교 정문 앞에는 버려진 버스가 벽처럼 서 있다. 윤이 그려온 지도에는 급식실 뒤쪽 계단과 관리실 창문이 표시돼 있다. 학교 구조를 놀랄 만큼 잘 안다.\n\n주머니에서 꺼낸 작은 열쇠를 손바닥 안에서 굴리다가 윤이 말을 멈춘다. 예전에 그곳에 납품하러 갔다는 설명이 너무 빨랐다. 지금은 들어갈 길부터 확인해야 한다.', [C('key', '열쇠를 받고 뒤쪽 길을 확인한다', '학교 수색 행동 해금 · 학교 관리 열쇠 획득', { flags: { schoolLocated: true, masterKey: true } }, { result: '학교 수색을 준비할 수 있다. 옥상을 떠나 실제 흔적을 조사해야 다음 이야기가 열린다.' }), C('roof', '지붕을 잇는 길을 그린다', '학교 수색 행동 해금 · 로프 이동 획득 · 부품 −1', { flags: { schoolLocated: true, climber: true } }, { cost: { parts: 1 }, result: '난간에 로프 매듭을 연습했다. 잠긴 문 앞에서 돌아설 필요는 없겠다.' })], { requires: ['yoonPhoto'], after: { yoon_photo: 1 } }),
  E('school_contact', '윤의 이야기 3', 7, '아직 적히고 있는 날짜', '학교에서 가져온 수첩의 마지막 날짜는 어제다. “방송실, 네 명. 물 떨어짐.” 교실의 수신기를 맞추자 작은 목소리가 답했다. 수아다. 다친 다리 때문에 계단을 내려갈 수 없다고 한다.\n\n윤은 마이크를 받아 들고도 이름을 부르지 못한다. 수아는 오빠가 듣고 있느냐고 두 번 묻는다. 당장 뛰어가는 것보다 먼저 돌봄 물자를 보내야 한다.', [C('medicine', '약품과 응급처치 방법을 전달한다', '약품 −1 · 2일 뒤 수아 상태 안정', { flags: { sisterFound: true }, delayed: [{ id: 'sua_stable', days: 2, effects: { flags: { sisterStable: true }, stats: { morale: 5 } }, text: '학교에서 답신이 왔다. 보내준 약 덕분에 수아의 열이 내렸다고 한다. 구조를 준비할 시간이 생겼다.' }] }, { cost: { medicine: 1 }, result: '보낸 약품은 오늘 돌아오지 않는다. 수아가 이틀을 버틸 수 있기를 기다려야 한다.' }), C('medic', '응급처치 지식으로 처치 순서를 불러준다', '응급처치 필요 · 2일 뒤 수아 상태 안정', { flags: { sisterFound: true }, delayed: [{ id: 'sua_stable', days: 2, effects: { flags: { sisterStable: true } }, text: '수아가 혼자 다시 무전기를 켰다. 알려준 처치가 효과가 있었다. 이제 돌아올 길을 만들어야 한다.' }] }, { requires: ['medic'], result: '수아가 한 단계씩 따라 한다. 아직은 목소리가 떨리지만 멈추지 않는다.' }), C('water', '물부터 보내고 구조 방법을 찾는다', '물 −2 · 수아 위치 확인', { flags: { sisterFound: true } }, { cost: { water: 2 }, result: '윤이 물통을 꼭 쥐었다. 약이 없더라도 돌아올 길을 찾는 일은 계속할 수 있다.' }), wait()], { requires: ['schoolRecon'], after: { school_map: 1 }, priority: 68 }),
  E('yoon_confession', '윤의 이야기 4', 9, '그 문을 잠근 사람', '윤이 학교 관리 열쇠와 같은 열쇠를 모닥불 앞에 내려놓는다. 봉쇄 첫날, 대피소를 잠그라는 지시를 받은 운전기사가 자신이었다고 한다. 가족들을 보호한다는 말을 믿었다고.\n\n수아를 그 학교로 보낸 뒤에야 밖에서 문을 열 수 없다는 사실을 알았다. 윤은 이제 자신을 믿지 않아도 좋다고 말한다. 다만 동생에게는 돌아가고 싶다고 한다.', [C('forgive', '믿음은 돌아온 뒤 다시 이야기하자', '윤의 고백 확보 · 신뢰 획득 · 사기 +3', { flags: { yoonSecret: true, trusted: true }, stats: { morale: 3 } }, { result: '용서한다는 말 대신 지도를 펼쳤다. 지금 할 일은 문을 여는 것이다.' }), C('record', '당시 받은 지시를 녹음해달라고 한다', '윤의 고백 · 휴대 녹음기 · 증언 확보', { flags: { yoonSecret: true, recorder: true, archiveSaved: true } }, { result: '윤은 마이크 앞에서 숨을 고른 뒤 자신의 이름부터 말했다. 구조 방송의 다른 면을 입증할 증언이 됐다.' }), C('angry', '왜 이제야 말했는지 따진다', '윤의 고백 확보 · 사기 −5', { flags: { yoonSecret: true }, stats: { morale: -5 } }, { result: '화를 냈지만 지도를 찢지는 않았다. 사실을 알았다고 수아가 덜 기다리는 것은 아니다.' })], { requires: ['sisterFound'], after: { school_contact: 1 }, priority: 65 }),
  E('school_return', '윤의 이야기 5', 11, '한 번 더 여는 문', '학교 아래층에 무리가 몰려들기 시작했다. 수아와 세 아이는 방송실 책상으로 문을 막고 있다. 돌아오는 길은 한 번뿐이다. 부상자를 옮길 준비가 있어야 넷 모두를 데려올 수 있다.\n\n윤은 자신의 다리를 묶어 들것을 시험한다. 창문 너머 수아가 처음으로 오빠의 얼굴을 본다. 두 사람은 아직 인사하지 않았다. 먼저 살아서 여기서 나가야 한다.', [C('rescue', '약품과 들것으로 수아까지 데려온다', '약품 −2 · 체력 −5 · 수아와 아이들 구출', { flags: { sisterSaved: true, schoolResolved: true, childrenSafe: true }, stats: { health: -5, morale: 10 } }, { cost: { medicine: 2 }, result: '윤이 수아를 업고 마지막 계단을 오른다. 수아는 그의 등에서 “너무 늦었어”라고 말하고 어깨를 꽉 잡았다.' }), C('prepared', '미리 안정시킨 수아를 로프로 올린다', '수아 상태 안정 필요 · 부품 −2 · 수아와 아이들 구출', { flags: { sisterSaved: true, schoolResolved: true, childrenSafe: true }, stats: { morale: 10 } }, { requires: ['sisterStable'], cost: { parts: 2 }, result: '이틀 전 보낸 도움 덕분에 수아는 스스로 로프를 잡을 수 있었다. 작은 선택이 돌아왔다.' }), C('children', '움직일 수 있는 아이들부터 탈출시킨다', '아이들 구출 · 수아는 돌아오지 못함 · 사기 −15', { flags: { sisterLost: true, schoolResolved: true, childrenSafe: true }, stats: { morale: -15 } }, { result: '구해낸 세 아이는 이름을 말했지만 윤은 고개를 들지 못했다. 수아의 이름표를 돌아오는 길 내내 쥐고 있었다.' }), wait('구조 물자를 더 준비한다')], { requires: ['sisterFound', 'yoonSecret'], after: { yoon_confession: 2 }, priority: 70 }),
  E('ferry_hull', '강변의 길 1', 13, '배 밑바닥의 하늘', '정찰한 상류 작업장에서 배를 뒤집었다. 바닥의 구멍 너머로 하늘이 보인다. 수리만 끝나면 건널 수 있을까. 선착장 벽에는 수위가 매일 조금씩 올라온 흔적이 있다.\n\n학교에서 돌아온 아이가 배에 자기 이름을 써도 되느냐고 묻는다. 윤은 네 쪽을 본다. 이 배가 누구를 위한 것인지 말하기 전에, 물에 뜨게 만드는 일이 먼저다.', [C('repair', '철판과 방수포로 구멍을 막는다', '부품 −4 · 배 수리 완료', { flags: { ferryFixed: true } }, { cost: { parts: 4 }, result: '물이 새는지 확인하는 동안 모두 말없이 지켜봤다. 배는 가라앉지 않았다.' }), C('engineer', '설비 지식으로 밑판을 다시 맞춘다', '설비 수리 필요 · 부품 −2 · 배 수리 완료', { flags: { ferryFixed: true } }, { requires: ['engineer'], cost: { parts: 2 }, result: '버릴 판재에도 쓸 수 있는 부분이 있었다. 남긴 부품은 앞으로의 길에 쓸 수 있다.' }), wait()], { requires: ['riverSurvey', 'schoolResolved'], after: { school_return: 2 } }),
  E('ferry_passengers', '강변의 길 2', 16, '배에는 의자가 여섯 개', '배에 의자를 놓자 생각보다 자리가 적었다. 물과 연료를 더 싣느냐, 아이들까지 함께 타느냐. 둘을 모두 욕심내면 강 가운데서 멈출 수 있다. 선착장의 지도에는 중간 보급처 하나가 표시돼 있다.\n\n윤은 자신의 자리를 아이에게 주겠다고 한다. 그 말 뒤에 숨은 죄책감으로 명단을 정하고 싶지는 않다. 부족한 보급을 미리 나누어 준비하면 모두 탈 길도 있다.', [C('together', '중간 보급을 준비하고 함께 탄다', '식량 −3 · 함께 탈 자리 확보', { flags: { ferryManifest: true, familySeats: true } }, { cost: { food: 3 }, result: '이름을 지우는 대신 작은 글씨로 다시 적었다. 윤이 자기 이름 옆의 빈칸을 오래 보았다.' }), C('light', '작은 인원만 이동하기로 한다', '제한된 승선 명단 작성 · 사기 −6', { flags: { ferryManifest: true, familySeats: false }, stats: { morale: -6 } }, { result: '떠날 사람과 남을 사람을 나누었다. 명단의 무게는 종이보다 훨씬 무거웠다.' }), wait()], { requires: ['ferryFixed'], after: { ferry_hull: 2 } }),
  E('river_lock', '강변의 길 3', 18, '강에도 잠긴 문이 있다', '배를 띄우기 전 마지막 정찰에서 수문이 닫힌 것을 확인했다. 물살은 철문에 부딪혀 거꾸로 돈다. 관리실 발전기는 죽었고 수동 손잡이는 건너편 난간 위에 있다.\n\n돌아가면 며칠을 더 기다려야 한다. 하지만 서두르다 배를 잃으면 그동안의 선택도 함께 가라앉는다. 준비한 장비로 열든, 익힌 이동법으로 건너든 확실한 방법이 필요하다.', [C('tools', '장비를 연결해 수동으로 연다', '부품 −2 · 강변 항로 확보', { flags: { routeReady: true } }, { cost: { parts: 2 }, result: '철문이 천천히 움직였다. 강물이 다른 소리를 내기 시작했다.' }), C('climb', '로프를 걸고 건너편 손잡이에 닿는다', '로프 이동 필요 · 강변 항로 확보', { flags: { routeReady: true } }, { requires: ['climber'], result: '그날 연습한 매듭이 오늘 사람들의 길을 열었다.' }), wait()], { requires: ['ferryManifest'], after: { ferry_passengers: 2 } }),
  E('river_final', '강변의 길 · 마지막 선택', 20, '떠날 수 있는 아침', '강은 잠잠하고 수문은 열려 있다. 배를 고치고, 사람을 찾고, 이름을 적는 데 걸린 날들이 닻줄 하나에 묶여 있다. 이제 이곳을 떠날 수 있다.\n\n윤은 옥상을 마지막으로 올려다본다. 함께 떠나는 사람이 누구인지에 따라 같은 강도 다른 길이 될 것이다. 아직 마음이 정해지지 않았다면 오늘의 닻줄을 풀지 않아도 된다.', [C('reunion', '준비한 자리에서 모두 함께 출발한다', '22일 이후 · 수아 구출·함께 탈 자리 필요 · 식량/물 각4 · 동행 엔딩', { ending: 'reunion' }, { cost: { food: 4, water: 4 }, result: '수아가 오빠의 소매를 붙잡았다. 배가 도시의 그림자를 벗어나기 시작했다.' }), C('leave', '정해진 인원으로 조용히 배를 띄운다', '20일 이후 · 식량/물 각4 · 씁쓸한 탈출 엔딩', { ending: 'departure' }, { cost: { food: 4, water: 4 }, result: '도시는 멀어졌지만 비워둔 자리 하나는 끝내 작아지지 않았다.' }), wait('오늘은 닻줄을 풀지 않는다')], { requires: ['routeReady', 'schoolResolved'], after: { river_lock: 2 }, priority: 72 }),
  E('relay_orders', '방송의 이면 1', 8, '명단에서 지우라는 이름', '구조팀은 옥상 인원을 다시 물었다. 대답하자 새 지시가 왔다. 부상자와 신원 확인이 안 되는 사람은 별도 대기하라고. 어디서 대기하는지는 말해주지 않는다.\n\n윤이 학교 봉쇄 때도 같은 표현을 들었다고 속삭인다. 방송을 믿고 따를지, 명령을 확인할지 결정해야 한다. 무전기 버튼은 생각보다 가볍게 눌린다.', [C('question', '분리 대기의 의미를 되묻는다', '지시 의혹 확보 · 모두의 명단 방향', { flags: { ordersKnown: true, questionedOrders: true } }, { result: '상대가 대답 대신 호출부호를 바꿨다. 중계소에 가면 원래 지시가 남아 있을지 모른다.' }), C('accept', '살아남기 위해 명령을 받아 적는다', '지시 의혹 확보 · 제한된 명단 방향 · 사기 −3', { flags: { ordersKnown: true, manifestSelective: true }, stats: { morale: -3 } }, { result: '정해진 규칙대로 하면 구조될 수 있을까. 종이 아래 작은 빈칸이 끝내 눈에 걸린다.' })], { requires: ['rescueSignal'], after: { signal_reply: 2 }, priority: 63 }),
  E('relay_record', '방송의 이면 2', 10, '반복 재생되지 않은 부분', '중계소에서 가져온 녹음에는 공개 방송 뒤의 대화가 남아 있다. “저 구역은 정원 초과로 처리.” 곧이어 학교 주소와 윤이 기억하는 차량 번호가 불린다.\n\n구조를 담당한 사람들 모두가 같은 생각인 것은 아니다. 마지막에는 누군가 항로를 따로 남겨두었다. 증거를 보존하면 구할 방법을 찾을 수 있지만, 명령을 내린 쪽도 네 존재를 알게 된다.', [C('save', '증거와 숨겨진 항로를 모두 보존한다', '선별 명령 원본 획득 · 증언 공개 준비', { flags: { evidence: true, archiveSaved: true } }, { result: '윤이 녹음 속 자신의 대답을 듣고 눈을 감았다. 이제 개인의 거짓말과 도시의 명령이 같은 줄에 놓였다.' }), C('private', '항로를 확보하고 증거는 감춘다', '선별 명령 원본 획득 · 부품 +1', { flags: { evidence: true }, resources: { parts: 1 } }, { result: '녹음을 천으로 감쌌다. 쓸지 말지는 나중에 정하더라도 없애지는 않았다.' })], { requires: ['towerSurvey', 'ordersKnown'], after: { relay_orders: 2 }, priority: 66 }),
  E('relay_cipher', '방송의 이면 3', 12, '항로 위에 겹친 숫자', '남겨진 항로는 좌표가 아니라 설비 점검 번호로 쓰여 있다. 중계소 직원이 감시를 피하려고 남긴 암호 같다. 서두르면 엉뚱한 건물로 신호를 보낼 수도 있다.\n\n옥상 식탁에 번호표를 늘어놓았다. 윤은 차량 운행표와 대조하고 아이들은 같은 숫자를 찾아 동그라미를 친다. 익숙한 기술이 있거나 충분한 재료와 시간을 들이면 풀 수 있다.', [C('engineer', '설비 번호의 규칙을 읽는다', '설비 수리 필요 · 항로 해독', { flags: { decoded: true } }, { requires: ['engineer'], result: '배관 번호처럼 보이던 숫자가 좌표로 바뀌었다. 북쪽 회랑과 교대 시간이 드러났다.' }), C('test', '부품을 써서 주파수를 하나씩 시험한다', '부품 −2 · 항로 해독', { flags: { decoded: true } }, { cost: { parts: 2 }, result: '수십 번의 잡음 끝에 짧은 확인음이 들렸다. 길은 실제로 존재했다.' }), wait()], { requires: ['evidence'], after: { relay_record: 2 } }),
  E('manifest_vote', '방송의 이면 4', 14, '누가 명단을 쓰는가', '해독한 항로를 아는 구조대원이 개인 채널로 연결했다. 한 번에 실을 수 있는 인원은 적지만, 물자를 나눠 대기하면 여러 번 왕복할 수 있다고 한다. 공식 지시는 한 번만 오라는 것이다.\n\n누구를 먼저 태울지 묻는 말에 윤과 이웃들이 침묵한다. 순서를 정하는 것과 누군가를 버리는 것은 다르다. 모두를 기다리게 할 약속에는 실제 식량이 필요하다.', [C('all', '함께 버틸 보급을 내고 모두를 적는다', '식량 −3 · 모두의 명단 · 사기 +8', { flags: { openManifest: true, manifestSelective: false }, stats: { morale: 8 } }, { cost: { food: 3 }, result: '구조대원이 명단 마지막에 “추가 인원 있음”이라고 적었다. 숫자를 지우지 않겠다는 약속이었다.' }), C('limited', '공식 정원 안에서 명단을 확정한다', '제한된 명단 · 사기 −6', { flags: { manifestSelective: true, openManifest: false }, stats: { morale: -6 } }, { result: '보낼 이름을 다 적고도 몇 사람의 이름이 종이 아래에 남았다.' }), wait()], { requires: ['decoded'], after: { relay_cipher: 2 } }),
  E('transmitter', '방송의 이면 5', 17, '도시에 닿는 안테나', '작은 무전기로는 한 옥상 밖에 닿지 않는다. 모두를 데려갈 왕복 계획도, 증거를 도시 전체에 알리는 일도 더 강한 송신기가 필요하다. 버려진 방송 설비를 올려 세우면 가능하다.\n\n안테나가 높아지면 구조팀뿐 아니라 아래의 무리도 빛을 볼 것이다. 기술과 물자를 들여 안전하게 설치해야 한다. 긴 이야기가 이제 도시의 크기를 갖기 시작한다.', [C('build', '방송 설비를 조립한다', '부품 −4 · 광역 송신기 완성', { flags: { transmitter: true } }, { cost: { parts: 4 }, result: '수평선 너머에서 시험 신호에 답했다. 목소리가 도시를 건넜다.' }), C('engineer', '기존 증폭기를 살려 연결한다', '설비 수리 필요 · 부품 −2 · 광역 송신기 완성', { flags: { transmitter: true } }, { requires: ['engineer'], cost: { parts: 2 }, result: '버려진 회로에 다시 전기가 흘렀다. 작동등이 모닥불 옆에서 깜박인다.' }), wait()], { requires: ['decoded'], after: { manifest_vote: 2 } }),
  E('convoy_choice', '방송의 이면 6', 19, '한밤중의 비공식 통화', '항로를 남긴 구조대원이 마지막으로 연락했다. 내일 이후 북쪽 회랑을 열 수 있다고 한다. 하지만 중계소 기록을 찾는 공식 수색팀도 움직인다. 가져갈 것은 좌표만인가, 사람들의 증언까지인가.\n\n윤은 녹음기에 손을 올린다. 자신이 한 일을 도시가 알게 되는 것이 무섭다고 솔직히 말한다. 그래도 또 문을 잠그는 쪽에 서고 싶지는 않다고 한다.', [C('witness', '증언을 묶고 회랑 개방을 돕는다', '물 −2 · 항로 확보 · 증언 공개 준비', { flags: { corridorReady: true, archiveSaved: true } }, { cost: { water: 2 }, result: '윤의 증언과 살아남은 아이들의 이름을 하나의 기록으로 묶었다. 이제 무엇을 위해 송신할지 선택할 수 있다.' }), C('safe', '좌표만 전달하고 조용히 준비한다', '물 −2 · 항로 확보', { flags: { corridorReady: true } }, { cost: { water: 2 }, result: '통화를 끝냈다. 기다림은 끝나가지만 명단을 둘러싼 선택은 아직 남아 있다.' }), wait()], { requires: ['transmitter'], after: { transmitter: 2 } }),
  E('radio_final', '방송의 이면 · 마지막 선택', 22, '열린 회랑, 켜진 마이크', '첫 구조 신호가 예정된 방향에서 들어온다. 북쪽 회랑은 열렸다. 정해진 명단으로 떠날 수도 있고, 보급과 식수 체계를 바탕으로 모두를 기다릴 수도 있다.\n\n송신기에는 아직 도시 전체로 보낼 증언이 남아 있다. 그것을 보내면 오늘 떠나는 순서를 놓칠지 모른다. 여기까지의 선택들이 세 개의 길을 만들었다. 그중 실제로 준비한 길만 열려 있다.', [C('limited', '확정한 명단대로 구조 줄을 잡는다', '22일 이후 · 제한된 명단 · 식량 −2 · 구조 엔딩', { ending: 'rescue' }, { cost: { food: 2 }, result: '네 이름이 호출됐다. 다음 이름까지는 긴 침묵이 있었다.' }), C('all', '마지막 옥상까지 왕복 구조를 요청한다', '24일 이후 · 모두의 명단·안전한 식수·공동창고 · 식량/물 각5 · 전원 구조 엔딩', { ending: 'rescue_all' }, { cost: { food: 5, water: 5 }, result: '첫 번째 헬기를 보내고 남았다. 마지막 사람의 이름이 불릴 때까지 함께 기다렸다.' }), C('broadcast', '선별 명령과 생존자 증언을 송출한다', '24일 이후 · 증언 준비·원본 증거 · 부품 −3 · 진실 송신 엔딩', { ending: 'broadcast' }, { cost: { parts: 3 }, result: '마이크를 눌렀다. 첫 문장은 살아 있는 사람들의 이름이었다.' }), wait('아직 준비되지 않은 사람들과 기다린다')], { requires: ['corridorReady'], after: { convoy_choice: 2 }, priority: 73 }),
  E('roof_guests', '옥상의 사람들 1', 6, '두 명이라고 했는데', '계단 문 앞에 온 사람은 넷이었다. 윤이 말한 부부와, 그들이 길에서 만난 노인과 아이. 한 사람은 식량을 가져왔고 다른 사람은 빈손이다. 비가 굵어지는데 문은 아직 반쯤만 열려 있다.\n\n캠프가 좁아지는 것보다 서로를 어떻게 부를지가 더 어렵다. 손님인가, 식구인가. 오늘 나눈 식량이 며칠 뒤 배급을 둘러싼 질문으로 돌아올 것이다.', [C('welcome', '식량을 나누고 모두 비를 피하게 한다', '식량 −2 · 이웃 합류 · 사기 +6', { flags: { guests: true }, stats: { morale: 6 } }, { cost: { food: 2 }, result: '젖은 신발 네 켤레가 모닥불 주위에 놓였다. 옥상은 처음으로 좁게 느껴졌다.' }), C('space', '가까운 옥상과 잠자리를 나눠 마련한다', '이웃 연결 · 부품 −1', { flags: { guests: true } }, { cost: { parts: 1 }, result: '한곳에 다 모이지 않아도 서로 돌볼 수 있다. 로프를 건너 이불이 오갔다.' }), wait()], { requires: ['ally'], after: { neighbor_lamp: 2 }, priority: 52 }),
  E('water_sick', '옥상의 사람들 2', 9, '같은 물을 마신 세 사람', '어젯밤 같은 물통을 쓴 사람들이 아프다. 누군가는 새로 온 이웃을 의심하고 누군가는 오래된 탱크를 가리킨다. 이유를 알기 전까지 두려움은 가장 약한 사람에게 향한다.\n\n물통 바닥에는 얇은 침전물이 있다. 비가 왔던 날의 기록과 아픈 사람의 식사를 비교하면 원인을 좁힐 수 있다. 누구를 내보내는 대신 무엇을 바꿔야 할지 찾아야 한다.', [C('check', '물통과 날짜를 차분히 대조한다', '식수 오염 원인 확인 · 물 −1', { flags: { contaminationKnown: true } }, { cost: { water: 1 }, result: '새 이웃이 오기 전 채운 물에서도 같은 냄새가 났다. 문제는 사람이 아니라 배관이었다.' }), C('medic', '증상을 살피고 오염 경로를 설명한다', '응급처치 필요 · 오염 원인 확인 · 사기 +5', { flags: { contaminationKnown: true }, stats: { morale: 5 } }, { requires: ['medic'], result: '원인을 말할 수 있게 되자 손가락질이 멈췄다. 이제 물을 안전하게 만드는 일이 남았다.' }), wait()], { requires: ['guests'], after: { roof_guests: 2 } }),
  E('water_fix', '옥상의 사람들 3', 11, '맑아 보이는 물도 끓인다', '깨진 배관 안으로 빗물과 오수가 함께 스며들었다. 배관을 분리하고, 받아둔 물을 구분하고, 끓인 날짜를 적어야 한다. 누군가는 너무 번거롭다고 투덜댄다.\n\n보이지 않는 위험을 막는 규칙은 눈에 띄는 방벽보다 설명하기 어렵다. 하지만 앞으로 옥상에 남든 구조를 기다리든, 같은 물을 믿고 마실 수 있어야 함께 버틸 수 있다.', [C('filter', '배관을 분리하고 공동 여과대를 만든다', '부품 −2 · 안전한 식수 체계 확립', { flags: { waterSafe: true } }, { cost: { parts: 2 }, result: '물통마다 날짜가 붙었다. 아이가 가장 먼저 새 규칙을 외워 어른들에게 알려줬다.' }), C('engineer', '설비 기술로 오염 지점만 교체한다', '설비 수리 필요 · 부품 −1 · 안전한 식수 체계', { flags: { waterSafe: true } }, { requires: ['engineer'], cost: { parts: 1 }, result: '오래된 배관 한 조각을 바꾸자 사람들이 다시 같은 주전자를 돌렸다.' }), wait()], { requires: ['contaminationKnown'], after: { water_sick: 2 } }),
  E('ration_dispute', '옥상의 사람들 4', 13, '사라진 통조림 두 개', '공동 상자에서 통조림이 줄었다. 일을 더 많이 한 사람이 더 먹어도 되는지, 아이와 부상자는 같은 양을 받아야 하는지 목소리가 높아진다. 훔쳤다는 말이 나오기 직전 윤이 상자를 닫는다.\n\n누가 가져갔는지 찾는 일과 앞으로 어떻게 나눌지 정하는 일은 다르다. 네 물자를 더 내면 오늘의 다툼은 멈추겠지만, 기록과 합의가 없으면 내일 다시 시작될 것이다.', [C('share', '식량을 보태고 공개 배급표를 만든다', '식량 −3 · 공동 식량창고 확립 · 중재 능력', { flags: { pantry: true, negotiator: true } }, { cost: { food: 3 }, result: '필요한 몫과 할 수 있는 일을 따로 적었다. 노인은 하루 세 번 물을 끓이겠다고 자원했다.' }), C('mediate', '중재 경험으로 모두의 배급 기준을 합의한다', '중재 필요 · 식량 −1 · 공동 식량창고 확립', { flags: { pantry: true } }, { requires: ['negotiator'], cost: { food: 1 }, result: '가장 큰 목소리보다 마지막까지 말하지 않은 사람의 의견을 먼저 물었다.' }), wait()], { requires: ['guests'], after: { roof_guests: 3 } }),
  E('pantry_return', '옥상의 사람들 · 후일담', 15, '통조림의 주인', '배급표를 붙인 뒤 한 아이가 빈 통조림을 들고 왔다. 아래층에 숨어 있던 할머니에게 가져다준 것이라고 한다. 모두를 의심하게 만든 일은 사실 누군가를 먹이려던 일이었다.\n\n규칙을 어겼다는 이유로 혼낼 수도 있다. 하지만 말해도 도와줄 거라고 믿지 못했던 이유도 들어야 한다. 옥상에서 정한 규칙이 계단 아래 사람에게도 닿을지 정할 차례다.', [C('include', '할머니의 이름도 배급표에 적는다', '식량 −1 · 2일 뒤 이웃의 보답과 부품 +3', { delayed: [{ id: 'grandmother_tools', days: 2, effects: { resources: { parts: 3 }, flags: { neighborsTrust: true } }, text: '아이가 할머니의 공구 가방을 들고 왔다. “받기만 할 수 없지.” 식량을 나눈 선택이 이틀 뒤 부품 3과 신뢰로 돌아왔다.' }] }, { cost: { food: 1 }, result: '이름을 적는 동안 아이는 빈 통조림을 놓지 않았다. 벌을 기다리는 손이 조금 풀렸다.' }), C('rules', '사정을 듣되 미리 알리자는 약속을 받는다', '중재 능력 · 사기 +4', { flags: { negotiator: true }, stats: { morale: 4 } }, { result: '아이에게 다음에는 함께 내려가자고 말했다. 규칙은 사람을 밖에 두기 위해 있는 것이 아니다.' })], { requires: ['pantry'], after: { ration_dispute: 2 }, priority: 45 }),
  E('roof_charter', '옥상의 사람들 5', 17, '대표는 누구인가', '식수와 배급이 안정되자 더 어려운 문제가 남았다. 바깥사람을 받아들일 때, 누군가 떠나겠다고 할 때, 문을 열지 말지 누가 결정하는가. 힘이 센 사람이 열쇠를 쥐자는 말도 나온다.\n\n윤은 자신이 명령대로 문을 잠갔던 날을 떠올린다. 실수한 사람을 무조건 쫓아내지 않되 같은 실수를 막는 규칙. 그것을 모두가 읽을 수 있는 곳에 써야 한다.', [C('council', '열쇠와 결정을 나눠 가지는 규칙을 적는다', '옥상의 약속 확립 · 방어 +5 · 사기 +5', { flags: { charter: true }, stats: { defense: 5, morale: 5 } }, { result: '문 열쇠를 두 개로 나눠 보관했다. 누구도 혼자 모두를 가둘 수 없도록.' }), C('watch', '돌아가며 책임지는 경계조를 만든다', '옥상의 약속 확립 · 방어 +8', { flags: { charter: true }, stats: { defense: 8 } }, { result: '첫 경계표에 윤이 자기 이름을 썼다. 이번에는 문을 지키는 쪽이었다.' })], { requires: ['waterSafe', 'pantry'], after: { water_fix: 2, ration_dispute: 2 } }),
  E('siege_warning', '옥상의 사람들 6', 19, '도시가 이쪽을 보고 있다', '멀리서 변전 설비가 터지고 골목의 무리가 일제히 움직인다. 평소 흘러가던 방향과 다르다. 이 건물 아래로 길이 모이고 있다. 로프로 이어진 이웃 옥상도 같은 그림자를 보고 있다.\n\n문 하나만 버티면 되는 밤이 아니다. 퇴로, 불을 끄는 순서, 다친 사람의 자리까지 정해야 한다. 함께 남겠다는 약속을 이제 실제 준비로 바꿀 시간이 왔다.', [C('prepare', '계단 봉쇄와 옥상 사이 퇴로를 준비한다', '부품 −3 · 최후 방어 계획 · 방어 +12', { flags: { defensePlan: true }, stats: { defense: 12 } }, { cost: { parts: 3 }, result: '부품을 쓰는 손마다 다른 떨림이 있었다. 계획을 끝내고 모두 한 번씩 퇴로를 걸어봤다.' }), C('climber', '로프 이동 기술로 퇴로부터 잇는다', '로프 이동 필요 · 부품 −1 · 방어 계획 · 방어 +8', { flags: { defensePlan: true }, stats: { defense: 8 } }, { requires: ['climber'], cost: { parts: 1 }, result: '건물 사이 검은 틈 위로 줄이 팽팽하게 걸렸다. 돌아갈 길이 있으면 버틸 힘도 생긴다.' }), wait()], { requires: ['charter', 'barricade'], after: { roof_charter: 2 } }),
  E('last_defense', '옥상의 사람들 7', 22, '문 반대편의 새벽', '첫 충격에 의자가 밀리고 두 번째 충격에 경첩이 울었다. 사람들은 계획한 자리로 움직인다. 그래도 누군가는 겁에 질려 멈춘다. 윤이 그 사람의 이름을 부르며 손을 잡아 일으킨다.\n\n아래층의 소음을 다른 길로 돌리고 문을 보강하면 해 뜰 때까지 버틸 수 있다. 준비가 부족하면 지금은 이웃 옥상으로 물러나야 한다. 용기만으로 문이 닫히지는 않는다.', [C('hold', '준비한 방어선에서 끝까지 버틴다', '방어 65 필요 · 부품 −2 · 체력 −8 · 마지막 방어 성공', { flags: { defenseWon: true }, stats: { health: -8, morale: 12 } }, { minDefense: 65, cost: { parts: 2 }, result: '새벽이 되자 충격이 멎었다. 문은 서 있었다. 사람들도 모두 이름을 부르면 대답했다.' }), C('dog', '보리의 경보에 맞춰 빈 계단을 봉쇄한다', '보리 필요 · 방어 50 · 부품 −3 · 마지막 방어 성공', { flags: { defenseWon: true }, stats: { morale: 12 } }, { requires: ['dog'], minDefense: 50, cost: { parts: 3 }, result: '보리가 먼저 들은 발소리 덕분에 무리가 닿기 전에 통로를 막았다. 작은 동료가 모두의 밤을 지켰다.' }), wait('이웃 옥상으로 물러나 보강한 뒤 다시 지킨다')], { requires: ['defensePlan'], after: { siege_warning: 2 }, priority: 70 }),
  E('community_final', '옥상의 사람들 · 마지막 선택', 24, '문 위에 걸 이름', '큰 무리가 지나간 뒤 첫 저녁이다. 식수통은 정해진 자리에 있고 배급표 옆에는 다툰 사람들의 글씨가 나란히 남아 있다. 누구도 이곳을 완벽한 낙원이라고 부르지 않는다.\n\n그래도 이제 공동체라는 말을 꺼낼 수 있다. 이름을 정하는 일보다 오래 걸린 준비들이 끝났다. 윤은 빈 나무판을 문 위에 대고 묻는다. “내일도 여기, 어때요?”', [C('settle', '이곳을 함께 살아갈 마을로 정한다', '24일 이후 · 생존시설3종·식수·배급·규칙·최종방어 · 식량/물 각4 · 정착 엔딩', { ending: 'community' }, { cost: { food: 4, water: 4 }, result: '문 위에 이름을 걸었다. 오늘은 누군가를 막는 표지보다 돌아올 곳을 알리는 표지가 필요했다.' }), wait('아직 이 옥상에서 더 살아본다')], { requires: ['defenseWon', 'charter'], after: { last_defense: 2 }, priority: 75 }),
  E('rope_lesson', '살아가는 기술', 4, '매듭을 세 번 확인하는 사람', '이웃 옥상의 세탁소 주인은 남은 빨랫줄로 건물 사이를 건넌다. 요령을 묻자 매듭보다 확인이 중요하다고 한다. 빨리 건너는 사람보다 돌아오는 사람이 잘하는 사람이라고.\n\n로프를 아껴둘 수도 있지만 지금 배우면 잠긴 문을 우회하거나 먼 손잡이에 닿을 수 있다. 윤은 네가 연습하는 동안 아래에서 줄 끝을 잡아주겠다고 한다.', [C('learn', '부품을 써서 로프 이동을 배운다', '부품 −1 · 로프 이동 획득', { flags: { climber: true } }, { cost: { parts: 1 }, result: '한 번 더 확인하는 습관이 몸에 남았다. 다음에 길이 끊겨도 선택지는 하나 더 있다.' }), C('watch', '확인 순서를 수첩에 적어둔다', '골목 정찰 획득', { flags: { scout: true } }, { result: '직접 건너지는 않았지만 어느 난간이 버틸 수 있는지 보는 눈이 생겼다.' })], { requires: ['ally'], priority: 35 }),
  E('clinic_manual', '살아가는 기술', 6, '빈 진료실의 마지막 수업', '탐색한 진료실에 약품은 거의 없지만 책상 위에는 빨간 표시가 가득한 응급처치 책이 있다. 누군가 중요한 페이지에 “반드시 손부터 씻기”라고 크게 적어두었다.\n\n진료실 바깥에서는 오래된 안내 방송만 흘러나온다. 약 몇 알을 챙기는 것과 배운 것을 앞으로 계속 쓰는 것 사이에서 선택할 수 있다. 옥상에는 아직 배울 시간도 남아 있다.', [C('study', '책을 챙겨 함께 응급처치를 익힌다', '응급처치 획득 · 물 −1', { flags: { medic: true } }, { cost: { water: 1 }, result: '모닥불 옆에서 붕대를 감는 연습을 했다. 언젠가 수아나 다른 누군가에게 필요한 시간이 될 것이다.' }), C('medicine', '남은 약품을 챙긴다', '약품 +2', { resources: { medicine: 2 } }, { result: '구급상자를 채웠다. 확실한 물건이 손에 있다는 것도 힘이 된다.' })], { priority: 35 }),
];
EVENTS.push(...additions);

// Give the daily encounters context inside the larger, original story.
const dailyParagraphs = {
  first_knock: '계단 벽에는 대피소를 뜻하는 푸른 화살표가 중간부터 지워져 있다. 누군가 안내를 바꿨던 모양이다. 지금은 알 수 없지만, 이 건물에 남겨진 물건마다 먼저 지나간 사람의 선택이 묻어 있다.',
  stray_dog: '목줄 안쪽에는 작은 학교 이름표도 달려 있다. 이 도시에서 누군가를 찾는 것은 사람만이 아닌 모양이다. 먹을 입이 늘어나는 결정이지만, 밤마다 혼자 듣던 발소리를 함께 들어줄 존재이기도 하다.',
  water_cache: '이 물을 혼자 쓸 때와 여러 사람에게 나눌 때는 책임의 크기가 다르다. 물통에 날짜를 적어두면 나중에 문제가 생겼을 때 원인을 찾을 수 있을 것이다. 깨끗해 보이는 것과 안전한 것은 항상 같지 않다.',
  wind_tarp: '바람 아래에서는 학교 쪽 신호도 강변의 소문도 잠시 멀어진다. 거창한 계획을 이어가려면 오늘 잠잘 곳부터 지켜야 한다. 텐트 한 귀퉁이가 버티는 동안 사람도 다시 내일을 생각할 수 있다.',
  stairwell: '관리실 벽에는 봉쇄 당일의 차량 배차표가 붙어 있다. 학교로 향한 차들만 두 줄이 지워져 있다. 무엇을 뜻하는지는 아직 알 수 없지만 날짜와 번호를 수첩 구석에 옮겨 적었다.',
  dog_warning: '먹을 것을 나누기로 한 선택이 이런 순간에 돌아온다. 보리는 구조 방송이나 승선 명단을 모르지만 누가 지금 문 옆에 있는지는 안다. 녀석의 시선이 멈춘 곳으로 너도 조용히 귀를 기울인다.',
  neighbor_trade: '사람이 있는 옥상은 물건보다 소식을 더 멀리 보낸다. 윤은 거래 쪽지 뒷면에 학교가 보이는지 물었다. 돈 대신 필요를 적는 장터에서는 평범한 교환에도 서로의 걱정이 함께 매달린다.',
  neighbor_injury: '윤은 통증보다 수색을 멈춰야 하는 것이 더 괴로운 듯하다. 누군가를 기다리는 동안은 자기 몸을 뒤로 미루기 쉽다. 지금 나누는 물자가 나중에 누구를 구할 수 있게 할지 아직은 알 수 없다.',
  quiet_evening: '수첩에는 해결하지 못한 이름과 주소가 여러 줄 남아 있다. 잠시 덮는다고 잊는 것은 아니다. 끝까지 알아보기 위해 쉬는 날도 필요하다. 오늘의 고요가 다음 선택을 견딜 힘이 될 수 있다.',
  ferry_note: '지도에 적힌 선착장은 봉쇄 전 주소다. 물이 불었거나 길이 막혔을 가능성을 빼놓을 수 없다. 누군가를 따라간다는 한마디로 떠날 수 있는 도시는 아니다. 직접 확인하고 돌아오는 정찰부터 필요하다.',
  green_sprout: '싹은 구조가 올 날짜를 모르고 조금씩 자란다. 오늘 씨앗을 남겨두면 누군가 이곳에 머무를 이유가 생긴다. 빈 화분을 하나 더 꺼내며 언젠가 이 옥상을 찾을 사람에게 보여줄 수 있겠다고 생각했다.',
  roof_fire: '장부에 적힌 식량과 실제 상자의 식량이 달라지면 사람들은 서로를 의심하기 쉽다. 사고를 숨기는 대신 무엇이 탔고 무엇을 지켰는지 적어두기로 한다. 함께 살게 될 때 필요한 습관일 것이다.',
  migration: '무리가 움직이는 길은 우연처럼 보이지만 소리와 불빛에 반응한다. 오늘의 방향을 지도에 남기면 나중에 큰 침입을 앞두고 퇴로를 정할 수 있을 것이다. 오래 버틴다는 것은 위험을 조금씩 읽는 일이다.',
  signal_reply: '그러나 구조팀은 이웃들의 인원수를 듣고도 자세한 설명을 하지 않는다. 위치를 알렸다는 사실만으로 구조가 확정되지는 않았다. 이 목소리를 믿을 수 있는지 확인할 과정이 아직 남아 있다.',
};
for (const [id, paragraph] of Object.entries(dailyParagraphs)) {
  const event = EVENTS.find(event => event.id === id);
  event.body += `\n\n${paragraph}`;
}
