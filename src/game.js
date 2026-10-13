import {ROOFS, WEATHER, EVENTS, ENDINGS, TRAITS, CLUES, RESIDENTS, BUILDINGS} from './content.js';

export const STORAGE_KEY = 'zombi-rooftop-save-v1';
export const MINUTES_PER_REAL_SECOND = 1;
export const ACTION_MINUTES_PER_REAL_SECOND = 12;
const RESOURCE_KEYS = ['food','water','parts','medicine'];
const STAT_KEYS = ['health','morale','defense'];
const FACILITY_KEYS = ['collector','garden','barricade','radio','storage','beds','power','workshop'];
const GEAR_KEYS = ['blade','rope','decoy','bandage'];
const FLAG_KEYS = [...new Set(['dog','collector','garden','barricade','radio','ally','homeClue','clinicClue','schoolClue','workshopClue','marketClue','clinicSafe','schoolSafe','workshopSafe','marketSafe','routeOpened','secondRoof','districtClaimed','automatedWater','selfSufficient',...TRAITS.map(x=>x.id),...CLUES.map(x=>x.id),...EVENTS.flatMap(e=>[...(e.requires||[]),...e.choices.flatMap(c=>Object.keys(c.effects.flags||{}))])])];
const NAMES = {food:'식량',water:'식수',parts:'자재',medicine:'의약품'};
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const copy=x=>JSON.parse(JSON.stringify(x));
const emptyFacilities=()=>Object.fromEntries(FACILITY_KEYS.map(k=>[k,0]));
function seedNumber(value){if(typeof value==='number'&&Number.isFinite(value))return(value>>>0)||1;let n=2166136261;for(const c of String(value))n=Math.imul(n^c.charCodeAt(0),16777619);return(n>>>0)||1;}
function random(s){let n=s.rng;n^=n<<13;n^=n>>>17;n^=n<<5;s.rng=n>>>0;return s.rng/4294967296;}
export function getDay(s){return Math.floor((s.time+480)/1440)+1;}
export function getHour(s){return((s.time+480)%1440)/60;}
export function getRoof(s){return s.roof;}
export function getTimeRate(s){return s.paused||s.event||s.ending?0:s.action?ACTION_MINUTES_PER_REAL_SECOND*s.speed:1;}
export function getWeather(s){const day=getDay(s);if(day===1)return WEATHER[0];const n=(Math.imul(s.seed^(day*2654435761),1597334677)>>>0)%10;return WEATHER[n<4?0:n<6?1:n<9?2:3];}
function timeLabel(s){const n=Math.floor((s.time+480)%1440);return `${String(Math.floor(n/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`;}
function log(s,text,type='info'){s.log.push({id:s.logId++,day:getDay(s),time:timeLabel(s),text,type});if(s.log.length>80)s.log.splice(0,s.log.length-80);}
function newBuilding(s,definition,home=false){const zombies=2+(Math.floor(random(s)*2));return {...definition,capacity:definition.height*3,searched:0,zombiesTotal:zombies,zombiesRemaining:zombies,pendingZombie:false,unlocked:home,claimed:home,clueFound:false,facilities:emptyFacilities()};}
function selected(s){return s.buildings.find(b=>b.id===s.selectedBuildingId)||s.buildings[0];}
function missingCost(s,cost={}){for(const [key,n]of Object.entries(cost))if(s.resources[key]+1e-7<n)return`${NAMES[key]} ${n} 필요`;return '';}
function pay(s,cost={}){for(const [key,n]of Object.entries(cost))s.resources[key]=Math.max(0,s.resources[key]-n);}
function homeFlags(s){for(const k of ['collector','garden','barricade','radio'])s.flags[k]=s.buildings.some(b=>b.claimed&&b.facilities[k]>0);s.flags.ally=s.residents.some(r=>r.id==='yoon');s.facilities=s.buildings[0].facilities;}
function housing(b){return 2+b.facilities.beds*2;}
function occupied(s,b){return s.residents.filter(r=>r.buildingId===b.id).length+(b.id==='home'?1:0);}
function availableHome(s){return s.buildings.find(b=>b.claimed&&occupied(s,b)<housing(b));}

export function createGame(seed=Date.now()){
 const n=seedNumber(seed),s={version:3,seed:n,rng:n,time:0,paused:false,speed:1,resources:{food:5,water:7,parts:3,medicine:1},stats:{health:100,morale:75,defense:32},flags:Object.fromEntries(FLAG_KEYS.map(k=>[k,false])),roof:null,action:null,event:null,ending:null,log:[],logId:1,nextEventAt:30,eventHistory:{},lastDay:1,depletion:{food:false,water:false},completedActions:0,deferred:{},delayed:[],buildings:[],selectedBuildingId:'home',residents:[],gear:{blade:0,rope:0,decoy:0,bandage:0},districtInvites:0};
 const roof=ROOFS[Math.floor(random(s)*ROOFS.length)];s.roof={...roof,height:8+Math.floor(random(s)*13)};
 s.buildings=[newBuilding(s,{id:'home',name:'우리 아파트',height:s.roof.height,clueLabel:'동생이 남겨둔 주소',description:'돌아올 집. 한 층마다 세 곳을 수색할 수 있습니다.'},true),...BUILDINGS.map(b=>newBuilding(s,b))];
 s.facilities=s.buildings[0].facilities;if(roof.type==='split')s.stats.defense+=10;
 log(s,`${s.roof.height}층, ${roof.name}. 돌아올 옥상을 만들고 가족을 찾아 데려오자.`,'story');
 log(s,`현재 비축은 약 이틀분. 우리 건물 탐색은 ${s.roof.height*3}번뿐이다. 장비를 만들고 물자를 아껴 쓰자.`);
 return s;
}

export function getBuildings(s){return s.buildings.map(b=>({...b,selected:b.id===s.selectedBuildingId,facilities:{...b.facilities},residents:occupied(s,b),beds:housing(b)}));}
export function selectBuilding(s,id){const b=s.buildings.find(b=>b.id===id);if(!b)return{ok:false,reason:'건물을 찾을 수 없습니다'};if(s.action)return{ok:false,reason:'진행 중인 행동이 끝난 뒤 건물을 바꿀 수 있습니다'};s.selectedBuildingId=id;return{ok:true};}
export function getResidents(s){return s.residents.map(r=>({...r}));}
export function assignResident(s,id,buildingId,assignment){
 const r=s.residents.find(r=>r.id===id),b=s.buildings.find(b=>b.id===buildingId);
 if(!r||!b||!b.claimed)return{ok:false,reason:'확보한 옥상에만 주민을 배치할 수 있습니다'};
 if(s.event||s.action||s.ending)return{ok:false,reason:'진행 중인 사건이나 행동을 먼저 마쳐주세요'};
 if(!['rest','farm','water','guard'].includes(assignment))return{ok:false,reason:'알 수 없는 담당입니다'};
 if(r.buildingId!==b.id&&occupied(s,b)>=housing(b))return{ok:false,reason:'해당 옥상에 빈 잠자리가 없습니다'};
 const facility={farm:'garden',water:'collector',guard:'barricade'}[assignment];
 if(facility&&!b.facilities[facility])return{ok:false,reason:'해당 옥상에 먼저 재배·급수·방어 설비를 설치해주세요'};
 if(assignment!=='rest'&&s.residents.some(other=>other.id!==id&&other.buildingId===b.id&&other.assignment===assignment))return{ok:false,reason:'이 옥상의 해당 담당은 이미 배치되어 있습니다'};
 r.buildingId=b.id;r.assignment=assignment;log(s,`${r.name}: ${b.name} · ${{rest:'휴식',farm:'작물 재배',water:'식수 관리',guard:'경계'}[assignment]} 담당.`,'action');refreshMilestones(s);return{ok:true};
}

export function getEconomy(s){
 const people=1+s.residents.length,claimed=s.buildings.filter(b=>b.claimed);let food=0,water=0,irrigation=0,upkeep=0,beds=0,foodCapacity=12,waterCapacity=18,guards=0,automated=0;
 const rain=getWeather(s).id==='rain',powered=s.resources.parts>0;
 for(const b of claimed){const f=b.facilities;const farmer=s.residents.find(r=>r.buildingId===b.id&&r.assignment==='farm'),keeper=s.residents.find(r=>r.buildingId===b.id&&r.assignment==='water'),guard=s.residents.find(r=>r.buildingId===b.id&&r.assignment==='guard');
  const auto=f.power>=2&&powered,gl=f.garden===3&&!auto?2:f.garden,wl=f.collector===3&&!auto?2:f.collector;
  const growth=s.resources.water>0?[0,.65,1.6,4.8][gl]+(farmer?[0,1.15,2.4,3.8][gl]*(farmer.id==='mother'||farmer.id==='sua'?1.2:1):0):0;
  food+=growth*(b.id==='home'&&s.roof.type==='garden'?1.15:1);
  water+=([0,rain?1.8:.55,rain?4.8:2.3,7.8][wl]+(keeper?[0,1.7,3.2,4.4][wl]*(keeper.id==='jihye'?1.2:1):0))*(b.id==='home'&&s.roof.type==='utility'?1.15:1);
  irrigation+=f.garden?[0,.35,.7,1][gl]:0;
  upkeep+=f.power*.10+(f.collector===3?.18:0)+(f.garden===3?.18:0)+f.barricade*.025;
  beds+=housing(b);foodCapacity+=f.storage*10+(b.id==='home'?0:4);waterCapacity+=f.storage*14+(b.id==='home'?0:6);
  if(guard)guards+=guard.id==='yoon'?3:2;if(auto&&(f.collector===3||f.garden===3))automated++;
 }
 const preservation=claimed.some(b=>b.facilities.storage>=2)?.005:.018,spoilage=s.resources.food*preservation;
 const foodUse=people*2+(s.flags.dog?1:0)+spoilage,waterUse=people*3+(s.flags.dog?.5:0)+irrigation;
 const flow=(production,consumption,stock)=>({production,consumption,net:production-consumption,days:production>=consumption?null:stock/(consumption-production)});
 return{food:flow(food,foodUse,s.resources.food),water:flow(water,waterUse,s.resources.water),partsUpkeep:upkeep,capacity:{food:foodCapacity,water:waterCapacity},people,beds,spoilage,irrigation,guards,automated,maintenance:powered};
}
function enforceCapacity(s){const caps=getEconomy(s).capacity;for(const k of ['food','water'])s.resources[k]=clamp(s.resources[k],0,caps[k]);s.resources.parts=clamp(s.resources.parts,0,500);s.resources.medicine=clamp(s.resources.medicine,0,50);}
function change(s,e={}){for(const[k,n]of Object.entries(e.resources||{}))s.resources[k]=Math.max(0,s.resources[k]+n);for(const[k,n]of Object.entries(e.stats||{}))s.stats[k]=clamp(s.stats[k]+n,0,100);Object.assign(s.flags,e.flags||{});if(e.resident)addResident(s,e.resident);enforceCapacity(s);}
function addResident(s,id){let data=RESIDENTS.find(r=>r.id===id);if(id==='district'){s.districtInvites++;data={id:`neighbor_${s.districtInvites}`,name:`이웃 ${s.districtInvites}`,role:'새 정착민',description:'불빛을 따라 찾아온 새 이웃. 함께 재배·급수·경계를 맡을 수 있다.'};}if(!data||s.residents.some(r=>r.id===data.id))return;const b=availableHome(s);if(!b)return;s.residents.push({...data,buildingId:b.id,assignment:'rest'});homeFlags(s);}
function refreshMilestones(s){homeFlags(s);for(const b of s.buildings){if(b.id!=='home'&&b.searched>=Math.ceil(b.capacity*.7)&&b.zombiesRemaining===0)s.flags[`${b.id}Safe`]=true;}s.flags.secondRoof=s.buildings.filter(b=>b.claimed).length>=2;s.flags.districtClaimed=s.buildings.some(b=>b.claimed&&b.id.startsWith('district_'));s.flags.automatedWater=s.buildings.some(b=>b.claimed&&b.facilities.collector===3&&b.facilities.power>=2);const econ=getEconomy(s);s.flags.selfSufficient=econ.food.net>=0&&econ.water.net>=0&&econ.automated>=2&&econ.people>=4;}

const FACILITIES={
 collector:{names:['빗물받이','여과 급수기','자동 정수 펌프'],cost:[{parts:8,water:1},{parts:16,water:3},{parts:28,water:5}],duration:[480,900,1440],description:['날씨에 따라 식수 0.55~1.8/일. 관리 주민이 있으면 +1.7.','식수 2.3~4.8/일. 관리 주민 +3.2.','전력 2단계와 유지 자재가 있으면 식수 7.8/일. 관리 주민 +4.4.']},
 garden:{names:['작은 재배상','확장 재배상','자동 수경 재배'],cost:[{parts:10,water:3},{parts:18,water:5},{parts:30,water:8}],duration:[600,1080,1800],description:['식량 0.65/일, 관수 0.35/일. 재배 주민 +1.15.','식량 1.6/일, 관수 0.7/일. 재배 주민 +2.4.','전력 2단계와 유지 자재가 있으면 식량 4.8/일. 재배 주민 +3.8.']},
 barricade:{names:['출입문 보강','계단 방어선','옥상 경보망'],cost:[{parts:7},{parts:14},{parts:22}],duration:[360,720,1200],description:['방어 +16. 경계 주민 배치 가능.','방어 +22. 일상 방어 마모 감소.','방어 +28. 경계와 함께 침입 위험을 낮춤.']},
 storage:{names:['그늘 보관대','밀폐 저장고','공동 보급창고'],cost:[{parts:8},{parts:16},{parts:26}],duration:[420,780,1260],description:['식량 한도 +10 · 식수 한도 +14.','저장량 추가 확장. 음식 부패율이 크게 줄어듦.','더 많은 이웃을 위한 비축 공간 확보.']},
 beds:{names:['여분의 침상','단열 침실','이웃 숙소'],cost:[{parts:6,food:1},{parts:12,food:2},{parts:20,food:3}],duration:[360,720,1080],description:['이 옥상 잠자리 +2. 구조한 주민의 합류에 필요.','이 옥상 잠자리 +2.','이 옥상 잠자리 +2.']},
 power:{names:['소형 태양전지','축전·배전 설비','보조 전원'],cost:[{parts:16},{parts:24},{parts:32}],duration:[900,1440,1800],description:['전기를 모으기 시작함. 자재 유지비 발생.','자동 펌프와 수경 재배에 필요한 안정 전력.','예비 전력 확보. 장기 거주 시설의 기반.']},
 radio:{names:['수신기 수리','이웃 교신기','지구 중계기'],cost:[{parts:9},{parts:16},{parts:24}],duration:[540,960,1440],description:['이웃과 연락하는 수신기를 수리.','새 지구로 향하는 루트 개척의 준비.','여러 옥상의 연락망을 연결.']},
 workshop:{names:['공구 작업대','정비 작업장','공동 수리실'],cost:[{parts:9},{parts:16},{parts:24}],duration:[480,900,1440],description:['교체 부품을 회수할 준비.','설비 정비를 위한 공구 정리.','공동체의 정비 거점.']},
};
const CRAFTS={blade:{label:'보강 손도끼',cost:{parts:2},duration:120,charges:4,description:'조우에서 사용. 4회 사용, 건강 피해를 줄여 감염자를 제압.'},rope:{label:'등반 로프',cost:{parts:2},duration:150,charges:3,description:'조우·루트·옥상 연결에 사용. 매번 1회분 소모.'},decoy:{label:'소리 유인기',cost:{parts:1,food:.25},duration:90,charges:1,description:'조우에서 감염자를 유인한 뒤 봉쇄. 건강 피해가 적음.'},bandage:{label:'삶은 붕대',cost:{water:1,parts:.5},duration:120,charges:1,description:'붕대 치료로 건강 16 회복. 물과 자재를 소비.'}};
function facilityReason(s,b,id,level){if(!b.claimed)return'수색과 감염자 처리를 마치고 옥상을 연결해야 합니다';if(level>=3)return'최종 단계 완료';if(level>=1&&id==='collector'&&!s.flags.waterPlan)return'의원에서 정수 설계를 찾아야 합니다';if(level>=1&&id==='garden'&&!s.flags.cropPlan)return'배움터에서 재배 관찰일지가 필요합니다';if(id==='power'&&!s.flags.automationPlan)return'공방의 펌프 제어 회로가 필요합니다';if(level===2&&['collector','garden'].includes(id)){if(!s.flags.friendHome)return'민우를 구출해 데려와야 합니다';if(b.facilities.power<2)return'이 옥상 전력 설비 2단계 필요';if(id==='garden'&&!s.flags.seedBank)return'어머니의 씨앗 봉투를 찾아야 합니다';}if(level>=1&&['storage','beds','barricade','radio','workshop'].includes(id)&&!s.flags.secondRoof)return'다른 건물의 수색을 마치고 두 번째 옥상을 연결해야 합니다';return'';}
export function getActions(s){
 const b=selected(s),actions=[];const add=(a,reason='')=>{let blocked=s.ending?'이번 생존이 끝났습니다':s.event?'먼저 사건을 선택해주세요':s.action?'다른 행동을 진행 중입니다':reason||missingCost(s,a.cost);actions.push({...a,cost:{...a.cost},disabled:!!blocked,reason:blocked});};
 const searchReason=!b.unlocked?'먼저 이 건물까지 루트를 개척하세요':b.pendingZombie?'복도 감염자 대응을 먼저 완료하세요':b.searched>=b.capacity?'이 건물의 모든 탐색 지점을 확인했습니다':'';
 add({id:'scavenge',category:'daily',label:b.id==='home'?'아래층 탐색':`${b.name} 탐색`,description:`남은 ${b.capacity-b.searched}/${b.capacity}곳. 식량·식수·자재, 단서. 건강 소모와 감염자 조우.`,duration:180+b.height*3,cost:{}},searchReason);
 add({id:'water',category:'daily',label:'배관·물통 수색',description:`동일한 탐색 횟수 1 소모. 식수 위주로 회수. 무한히 얻을 수 없습니다.`,duration:180+b.height*3,cost:{}},searchReason);
 add({id:'rest',category:'daily',label:'따뜻한 식사와 휴식',description:'건강 +14 · 마음 +6. 쉬는 동안에도 모두 먹고 마십니다.',duration:360,cost:{food:.5,water:.5}},s.stats.health>=100&&s.stats.morale>=100?'건강과 마음이 충분합니다':'');
 add({id:'heal',category:'daily',label:'의약품 치료',description:`약품 1 · 건강 +${s.flags.medic?40:28}`,duration:90,cost:{medicine:1}},s.stats.health>=100?'건강이 가득합니다':'');
 add({id:'bandage',category:'daily',label:'붕대로 상처 치료',description:`제작한 붕대 1 · 건강 +${s.flags.medic?24:16}`,duration:120,cost:{}},!s.gear.bandage?'먼저 붕대를 제작하세요':s.stats.health>=100?'건강이 가득합니다':'');
 add({id:'repair',category:'daily',label:'방어시설 정비',description:'자재 2 · 방어 +20. 시간이 지나면 다시 마모됩니다.',duration:180,cost:{parts:2}},s.stats.defense>=100?'방어가 가득합니다':'');
 add({id:'clear_zombies',category:'outside',label:'복도 감염자 대응',description:`남은 감염자 ${b.zombiesRemaining}마리. 장비와 기술에 따라 대응을 선택합니다.`,duration:90,cost:{water:.3}},!b.unlocked?'이 건물 루트 필요':!b.pendingZombie?'현재 길을 막은 감염자가 없습니다':'');
 for(const target of s.buildings.filter(x=>x.id!=='home'))add({id:`route_${target.id}`,category:'outside',label:`${target.name} 루트 개척`,description:`등반 로프 1회분 · 자재 3 · 식량 1 · 식수 1. 탐색 ${target.capacity}곳 · 감염자 ${target.zombiesTotal}마리.`,duration:420+target.height*12,cost:{parts:3,food:1,water:1}},target.unlocked?'루트 개척 완료':!s.flags[target.prerequisite]?'관련 건물에서 단서를 먼저 찾으세요':!s.gear.rope?'등반 로프 1회분 필요':'');
 add({id:'claim_roof',category:'outside',label:`${b.name} 옥상 연결`,description:'수색 완료·감염자 전원 처리 후, 로프 1회분과 자재 5로 생활 공간을 연결합니다.',duration:720,cost:{parts:5}},b.claimed?'이미 생활 중인 옥상입니다':!b.unlocked?'루트 개척 필요':b.searched<b.capacity?'모든 탐색 지점을 확인해야 합니다':b.zombiesRemaining?'감염자를 모두 처리해야 합니다':!s.gear.rope?'등반 로프 1회분 필요':'');
 add({id:'route_next',category:'outside',label:'새 이웃 지구 발견',description:'기존 건물을 모두 수색한 뒤 새로운 건물을 찾습니다. 지구는 계속 확장됩니다.',duration:720,cost:{parts:5,food:2,water:2}},s.buildings.some(x=>!x.claimed)?'기존 건물의 탐색과 옥상 연결을 먼저 마치세요':!s.buildings.some(x=>x.facilities.radio>=2)?'교신기 2단계 필요':'');
 for(const [id,d]of Object.entries(FACILITIES)){const level=b.facilities[id],i=Math.min(level,2);add({id,category:'build',label:`${d.names[i]} · ${Math.min(level+1,3)}단계`,description:`${b.name} / ${d.description[i]}`,duration:Math.round(d.duration[i]*(s.flags.engineer?.85:1)),cost:d.cost[i],level,maxLevel:3},facilityReason(s,b,id,level));}
 for(const[id,d]of Object.entries(CRAFTS))add({id:`craft_${id}`,category:'craft',label:d.label,description:`${d.description} 보유 ${s.gear[id]}회분.`,duration:d.duration,cost:d.cost},s.gear[id]>=24?'장비는 종류별 최대 24회분까지 보관합니다':'');
 return actions;
}
export function startAction(s,id){const a=getActions(s).find(a=>a.id===id);if(!a)return{ok:false,reason:'알 수 없는 행동입니다'};if(a.disabled)return{ok:false,reason:a.reason};pay(s,a.cost);const b=selected(s);if(id==='claim_roof'||(id.startsWith('route_')&&id!=='route_next'))s.gear.rope--;if(id==='bandage')s.gear.bandage--;s.action={id,label:a.label,remaining:a.duration,total:a.duration,buildingId:b.id};log(s,`${a.label} 시작.`,'action');return{ok:true};}

function search(s,b,waterOnly){
 b.searched++;const food=waterOnly?.2+random(s)*.3:.85+random(s)*.8,water=waterOnly?2.2+random(s)*1.2:.7+random(s)*.7,parts=waterOnly?.5+random(s)*.4:1+random(s)*.65;
 const damage=.6+random(s)*1.2-(s.flags.scout?.3:0);change(s,{resources:{food,water,parts},stats:{health:-damage}});
 // Medicine is a finite find, never a free recurring event reward.
 if(b.searched%8===0)change(s,{resources:{medicine:1}});
 log(s,`${b.name} ${b.searched}/${b.capacity}: 식량 +${food.toFixed(1)}, 식수 +${water.toFixed(1)}, 자재 +${parts.toFixed(1)}. 건강 −${damage.toFixed(1)}.`,'success');
 if(!b.clueFound&&b.searched>=Math.ceil(b.capacity*.25)){b.clueFound=true;s.flags[`${b.id}Clue`]=true;log(s,`${b.clueLabel}을 발견했다. 옥상에서 기록을 읽어보자.`,'story');s.nextEventAt=Math.min(s.nextEventAt,s.time+10);}
 const cleared=b.zombiesTotal-b.zombiesRemaining;const thresholds=b.zombiesTotal===2?[2,Math.ceil(b.capacity*.7)]:[2,Math.ceil(b.capacity*.45),Math.ceil(b.capacity*.75)];
 if(b.zombiesRemaining>0&&b.searched>=thresholds[cleared]){b.pendingZombie=true;s.event=`zombie:${b.id}`;log(s,`${b.name}: 복도에서 감염자가 길을 막았다.`,'event');}
 if(b.searched===b.capacity)log(s,`${b.name} 탐색을 모두 마쳤다. 감염자를 처리하고 옥상을 연결할 수 있다.`,'story');
}
function finishAction(s){const a=s.action,b=s.buildings.find(b=>b.id===a.buildingId);s.action=null;s.completedActions++;
 if(a.id==='scavenge'||a.id==='water')search(s,b,a.id==='water');
 else if(a.id==='rest')change(s,{stats:{health:14,morale:s.roof.type==='wide'?10:6}});
 else if(a.id==='heal')change(s,{stats:{health:s.flags.medic?40:28}});
 else if(a.id==='bandage')change(s,{stats:{health:s.flags.medic?24:16}});
 else if(a.id==='repair')change(s,{stats:{defense:20}});
 else if(a.id==='clear_zombies')s.event=`zombie:${b.id}`;
 else if(a.id==='claim_roof'){b.claimed=true;log(s,`${b.name} 옥상이 생활 공간이 되었다. 재배·급수 설비와 주민을 배치할 수 있다.`,'story');}
 else if(a.id==='route_next'){const index=s.buildings.filter(b=>b.id.startsWith('district_')).length+1;const height=5+Math.floor(random(s)*8);const next=newBuilding(s,{id:`district_${index}`,name:`이웃 지구 ${index}동`,height,prerequisite:'secondRoof',clueLabel:`${index}지구의 생활 기록`,description:'기다리는 사람과 남아 있는 자원을 찾을 새 건물.'});next.unlocked=true;s.buildings.push(next);s.selectedBuildingId=next.id;log(s,`${next.name} 발견. ${height*3}곳을 탐색해 다음 옥상을 연결하자.`,'story');}
 else if(a.id.startsWith('route_')){const target=s.buildings.find(b=>b.id===a.id.slice(6));target.unlocked=true;s.flags.routeOpened=true;s.selectedBuildingId=target.id;log(s,`${target.name}까지 왕복하는 길을 열었다. 돌아올 때 쓸 표식도 남겼다.`,'story');}
 else if(a.id.startsWith('craft_')){const id=a.id.slice(6);s.gear[id]=Math.min(24,s.gear[id]+CRAFTS[id].charges);}
 else if(FACILITIES[a.id]){b.facilities[a.id]++;if(a.id==='barricade')change(s,{stats:{defense:[0,16,22,28][b.facilities.barricade]}});log(s,`${b.name}: ${a.label} 완성.`,'success');}
 if(!['scavenge','water'].includes(a.id))log(s,`${a.label} 작업을 마쳤다. 이제 시간은 초당 1분으로 흐른다.`,'success');refreshMilestones(s);enforceCapacity(s);
}

function zombieDefinition(s){const b=s.buildings.find(b=>`zombie:${b.id}`===s.event);if(!b)return null;const ordinal=b.zombiesTotal-b.zombiesRemaining+1;return{id:s.event,kicker:`${b.name} · 감염자 ${ordinal}/${b.zombiesTotal}`,title:ordinal===1?'복도 끝에서 돌아본 얼굴':'막아야 돌아갈 수 있는 길',body:`복도 반대편에서 ${ordinal===1?'그림자 하나가 일어난다':'잠가두었던 문이 흔들린다'}. ${b.name}에는 아직 ${b.zombiesRemaining}마리가 남아 있다. 좁은 통로에서 소리를 내면 도망칠 곳이 줄어든다.\n\n이 건물을 생활 공간으로 쓰려면 모두 제압하거나 안전하게 봉쇄해야 한다. 가지고 온 장비와 배운 기술을 확인한다. 물러서면 살아 돌아갈 수 있지만, 다음 탐색 전에 이 길을 다시 해결해야 한다.`,choices:[
 {id:'blade',label:'보강 손도끼로 제압한다',description:'도끼 1회분 · 건강 −5',gear:'blade',damage:5,clear:true},
 {id:'rope',label:'로프를 걸어 방 안에 가둔다',description:`로프 1회분 · 식수 0.3 · 건강 −${s.flags.climber?1:4}`,gear:'rope',cost:{water:.3},damage:s.flags.climber?1:4,clear:true},
 {id:'decoy',label:'유인기를 던지고 방화문을 잠근다',description:'유인기 1회분 · 건강 −2',gear:'decoy',damage:2,clear:true},
 {id:'scout',label:'발소리를 읽고 다른 통로로 유인한다',description:'발소리 읽기 · 식량 0.5 · 식수 0.5 · 건강 −3',requires:['scout'],cost:{food:.5,water:.5},damage:3,clear:true},
 {id:'fight',label:'맨몸으로 문을 밀어 막는다',description:'식수 0.8 · 건강 −24 · 감염자 1마리 봉쇄',cost:{water:.8},damage:24,clear:true},
 {id:'retreat',label:'짐을 붙잡고 옥상으로 물러난다',description:'건강 −3 · 감염자는 남음 / 장비를 준비해 재도전',damage:3,clear:false},
 ]};}
function eligible(s,e){if(e.requires?.some(k=>!s.flags[k]))return false;if(e.residents&&s.residents.length<e.residents)return false;if(e.repeatDistrict){const count=s.buildings.filter(b=>b.claimed&&b.id.startsWith('district_')).length;if(s.districtInvites>=count)return false;}const previous=s.eventHistory[e.id];if(previous!==undefined){if(e.once&&!s.deferred[e.id]&&!e.repeatDistrict)return false;if(s.time-previous<(s.deferred[e.id]?480:(e.cooldown||1)*1440))return false;}return true;}
function triggerEvent(s){const pool=EVENTS.filter(e=>eligible(s,e));if(!pool.length){s.nextEventAt=s.time+360;return;}const priority=Math.max(...pool.map(e=>e.priority));const top=pool.filter(e=>e.priority===priority);const e=top[Math.floor(random(s)*top.length)];s.event=e.id;log(s,e.title,'event');}
export function getEvent(s){const e=s.event?.startsWith('zombie:')?zombieDefinition(s):EVENTS.find(e=>e.id===s.event);if(!e)return null;return{id:e.id,kicker:e.kicker,title:e.title,body:e.body,choices:e.choices.map(c=>{const missing=c.requires?.find(k=>!s.flags[k]);const reason=missingCost(s,c.cost)||(c.gear&&!s.gear[c.gear]?'해당 장비를 제작해야 합니다':'')||(missing?`${TRAITS.find(t=>t.id===missing)?.label||'관련 준비'} 필요`:'')||(c.beds&&!availableHome(s)?'빈 잠자리 필요: 침상 증설 또는 새 옥상 연결':'');return{id:c.id,label:c.label,description:c.description,disabled:!!reason,reason};})};}
export function chooseEvent(s,id){if(s.ending)return{ok:false,reason:'이번 생존이 끝났습니다'};const zombie=s.event?.startsWith('zombie:');const e=zombie?zombieDefinition(s):EVENTS.find(e=>e.id===s.event),c=e?.choices.find(c=>c.id===id),ui=getEvent(s)?.choices.find(c=>c.id===id);if(!c||!ui)return{ok:false,reason:'선택지를 찾을 수 없습니다'};if(ui.disabled)return{ok:false,reason:ui.reason};pay(s,c.cost);let result;
 if(zombie){const b=s.buildings.find(b=>`zombie:${b.id}`===s.event);if(c.gear)s.gear[c.gear]--;change(s,{stats:{health:-c.damage}});if(c.clear){b.zombiesRemaining--;b.pendingZombie=false;result=`${b.name}의 감염자 하나를 처리했다. 남은 ${b.zombiesRemaining}마리. 장비와 몸을 살핀 뒤 다음 방으로 향하자.`;}else result='옥상으로 돌아왔다. 길을 막은 감염자는 그대로다. 장비를 만들어 다시 대응해야 한다.';}
 else{change(s,c.effects);s.eventHistory[e.id]=s.time;if(c.defer)s.deferred[e.id]=true;else delete s.deferred[e.id];result=c.result;}
 s.event=null;s.nextEventAt=s.time+600+Math.floor(random(s)*360);log(s,result,'story');refreshMilestones(s);checkDeath(s);return{ok:true,result};
}
function checkDeath(s){if(s.stats.health<=0&&!s.ending){s.ending={...ENDINGS.death,day:getDay(s)};s.action=null;s.event=null;s.paused=true;log(s,'마지막 불씨가 꺼졌다. 이 옥상의 기록은 다음 사람에게 남는다.','ending');}}
function newDay(s){s.lastDay=getDay(s);log(s,`${getDay(s)}일째 · ${getWeather(s).label}. 이웃과 설비, 오늘의 수지를 확인하자.`,'day');if(s.stats.defense<25){change(s,{resources:{food:-1},stats:{health:-5,morale:-3}});log(s,'약해진 계단문 너머로 침입 흔적이 남았다. 방어 정비와 경계 담당이 필요하다.','warning');}}
function advance(s,minutes){const dt=minutes/1440,e=getEconomy(s);const foodLack=Math.max(0,e.food.consumption*dt-s.resources.food-e.food.production*dt),waterLack=Math.max(0,e.water.consumption*dt-s.resources.water-e.water.production*dt);const foodRatio=e.food.consumption?foodLack/(e.food.consumption*dt):0,waterRatio=e.water.consumption?waterLack/(e.water.consumption*dt):0;
 const walls=s.buildings.reduce((sum,b)=>sum+(b.claimed?b.facilities.barricade:0),0);change(s,{resources:{food:e.food.net*dt,water:e.water.net*dt,parts:-e.partsUpkeep*dt},stats:{health:-(foodRatio*32+waterRatio*65)*dt,morale:(-2+(s.flags.dog?1:0)+(s.residents.length?.5:0)-foodRatio*8-waterRatio*10)*dt,defense:(-3-Math.max(0,s.buildings.filter(b=>b.claimed).length-1)*.5+Math.min(2,walls*.25)+e.guards)*dt}});
 s.time+=minutes;if(getDay(s)>s.lastDay)newDay(s);for(const k of ['food','water']){const empty=s.resources[k]<1e-8;if(empty&&!s.depletion[k])log(s,`${NAMES[k]}이 바닥났다. 생산을 정상화하거나 유한한 건물 물자를 확보해야 한다.`,'warning');s.depletion[k]=empty;}checkDeath(s);if(s.ending)return;
 if(s.action){s.action.remaining-=minutes;if(s.action.remaining<=1e-7)finishAction(s);}checkDeath(s);if(!s.ending&&!s.event&&s.time>=s.nextEventAt-1e-7)triggerEvent(s);refreshMilestones(s);
}
export function tick(s,realSeconds){if(s.paused||s.event||s.ending||!Number.isFinite(realSeconds)||realSeconds<=0)return;let seconds=Math.min(realSeconds,3600);while(seconds>1e-7&&!s.paused&&!s.event&&!s.ending){const rate=s.action?ACTION_MINUTES_PER_REAL_SECOND*s.speed:1;const minutes=Math.min(seconds*rate,5,s.action?s.action.remaining:Infinity,Math.max(1e-6,s.nextEventAt-s.time),1440-((s.time+480)%1440));advance(s,minutes);seconds-=minutes/rate;}}

export function getStory(s){
 const goals=[];const goal=(done,label)=>goals.push({done,label});let chapter=1,title='돌아올 옥상',summary='물자는 유한합니다. 장비를 만들고 아래층에서 가족의 흔적을 찾으세요.';
 if(s.flags.homeClue){chapter=2;title='흩어진 이름들';summary='건물마다 남은 단서를 따라 가족과 친구를 찾고, 돌아와 지낼 자리를 준비하세요.';}
 if(s.flags.secondRoof){chapter=3;title='문이 이어지는 동네';summary='탐색을 마친 옥상에 설비와 사람을 배치하세요. 모두의 소비와 생산을 맞춰야 합니다.';}
 if(s.flags.friendHome&&s.flags.automationPlan){chapter=4;title='쉬어도 흐르는 물';summary='전력 2단계, 자동 급수, 수경 재배를 준비하세요. 설비에는 유지 자재가 필요합니다.';}
 if(s.flags.familyChapter){chapter=5;title='내일도 이곳에서';summary='가족의 귀환은 끝이 아닙니다. 식수와 식량을 자립시키고 다음 이웃을 맞으세요.';}
 if(s.flags.settlementChapter){chapter=6;title='우리 동네의 긴 하루';summary='자립 공동체가 시작되었습니다. 설비를 돌보고 새 지구를 연결하며 계속 살아갑니다.';}
 goal(s.flags.homeClue,`우리 아파트 탐색 ${s.buildings[0].searched}/${s.buildings[0].capacity} · 우편함 단서 찾기`);
 goal(s.flags.sisterHome,'은하 의원을 탐색해 동생 지혜를 옥상으로 데려오기');goal(s.flags.suaHome,'윤과 다온 배움터에서 수아 찾기');goal(s.flags.friendHome,'삼거리 공방에서 친구 민우와 회로 수첩 찾기');goal(s.flags.motherHome,'햇살 상가에서 어머니와 씨앗 찾기');goal(s.flags.secondRoof,'한 건물의 모든 방·감염자를 정리하고 새 옥상 연결');goal(s.flags.automatedWater,'민우·전력 2단계·자재로 자동 정수 펌프 가동');goal(s.flags.selfSufficient,'여러 옥상에 주민을 배치하고 식량·식수 일일 수지 정상화');
 return{chapter,title,summary,objectives:goals,traits:TRAITS.filter(t=>s.flags[t.id]),clues:CLUES.filter(c=>s.flags[c.id])};
}

export function serialize(s){return JSON.stringify(s);}
const finite=(n,min,max)=>typeof n==='number'&&Number.isFinite(n)&&n>=min&&n<=max;
const plain=x=>x&&typeof x==='object'&&!Array.isArray(x);
function validCore(s){return plain(s)&&[1,2,3].includes(s.version)&&Number.isInteger(s.seed)&&finite(s.seed,1,4294967295)&&Number.isInteger(s.rng)&&finite(s.rng,1,4294967295)&&finite(s.time,0,1440*100000)&&typeof s.paused==='boolean'&&finite(s.speed,.25,4)&&plain(s.resources)&&RESOURCE_KEYS.every(k=>finite(s.resources[k],0,9999))&&plain(s.stats)&&STAT_KEYS.every(k=>finite(s.stats[k],0,100))&&plain(s.flags)&&ROOFS.some(r=>r.type===s.roof?.type)&&Number.isInteger(s.roof.height)&&finite(s.roof.height,8,20)&&Array.isArray(s.log)&&s.log.length<=80;}
export function deserialize(value){try{if(typeof value!=='string'||value.length>500000)return null;const raw=JSON.parse(value);if(!validCore(raw))return null;const s=createGame(raw.seed);Object.assign(s,{rng:raw.rng,time:raw.time,paused:raw.paused,speed:raw.speed,resources:{...raw.resources},stats:{...raw.stats},roof:{...ROOFS.find(r=>r.type===raw.roof.type),height:raw.roof.height},lastDay:getDay(raw)});s.flags=Object.fromEntries(FLAG_KEYS.map(k=>[k,raw.flags[k]===true]));s.log=raw.log.filter(x=>plain(x)&&typeof x.text==='string'&&x.text.length<=1200&&Number.isInteger(x.id)&&Number.isInteger(x.day)&&typeof x.time==='string'&&typeof x.type==='string').map(x=>({id:x.id,day:x.day,time:x.time,text:x.text,type:x.type}));s.logId=Math.max(1,...s.log.map(x=>x.id+1));s.completedActions=Number.isInteger(raw.completedActions)&&raw.completedActions>=0?raw.completedActions:0;
 if(raw.version<3){s.buildings[0].height=s.roof.height;s.buildings[0].capacity=s.roof.height*3;for(const key of ['collector','garden','barricade','radio'])s.facilities[key]=raw.flags[key]?1:0;s.flags.dog=raw.flags.dog===true;if(raw.flags.ally){addResident(s,'yoon');s.flags.yoonSearch=true;}if(raw.flags.medic)s.flags.medic=true;if(raw.flags.scout)s.flags.scout=true;if(raw.flags.climber)s.flags.climber=true;s.event=null;s.action=null;s.nextEventAt=s.time+30;s.paused=true;s.ending=raw.ending?.id==='death'?{...ENDINGS.death,day:getDay(s)}:null;const before={...s.resources};enforceCapacity(s);log(s,'정착 생활 3판으로 일지를 옮겼다. 날짜·옥상·주요 물자·동료를 이어가며, 이전 탈출 결말은 완료한 장으로 남는다. 기존 설비는 기초 1단계다. 유한 탐색과 새 가족 이야기는 지금부터 시작한다.','story');if(before.food>s.resources.food||before.water>s.resources.water)log(s,`현재 저장 용량에 맞춰 식량 ${s.resources.food.toFixed(1)}, 식수 ${s.resources.water.toFixed(1)}만 안전하게 보관했다. 보관대를 늘리면 더 비축할 수 있다.`,'warning');refreshMilestones(s);return s;}
 if(!Array.isArray(raw.buildings)||raw.buildings.length<5||raw.buildings.length>200||!Array.isArray(raw.residents)||raw.residents.length>400||!plain(raw.gear)||GEAR_KEYS.some(k=>!Number.isInteger(raw.gear[k])||!finite(raw.gear[k],0,24)))return null;
 const ids=new Set();for(const b of raw.buildings){if(!plain(b)||typeof b.id!=='string'||ids.has(b.id)||!Number.isInteger(b.height)||!finite(b.height,3,30)||b.capacity!==b.height*3||!Number.isInteger(b.searched)||!finite(b.searched,0,b.capacity)||![2,3].includes(b.zombiesTotal)||!Number.isInteger(b.zombiesRemaining)||!finite(b.zombiesRemaining,0,b.zombiesTotal)||!['unlocked','claimed','pendingZombie','clueFound'].every(k=>typeof b[k]==='boolean')||!plain(b.facilities)||FACILITY_KEYS.some(k=>!Number.isInteger(b.facilities[k])||!finite(b.facilities[k],0,3)))return null;if(b.claimed&&b.id!=='home'&&(b.searched!==b.capacity||b.zombiesRemaining!==0))return null;ids.add(b.id);}
 if(raw.buildings[0].id!=='home'||raw.buildings[0].height!==s.roof.height||!raw.buildings[0].claimed||!BUILDINGS.every(b=>ids.has(b.id)))return null;
 s.buildings=raw.buildings.map(b=>{const authored=b.id==='home'?{name:'우리 아파트',description:'돌아올 집. 한 층마다 세 곳을 수색할 수 있습니다.',clueLabel:'동생이 남겨둔 주소'}:BUILDINGS.find(x=>x.id===b.id)||(/^district_\d+$/.test(b.id)?{name:`이웃 지구 ${b.id.split('_')[1]}동`,description:'새 이웃과 물자를 찾는 건물.',clueLabel:'이웃 지구의 생활 기록',prerequisite:'secondRoof'}:null);if(!authored)throw Error('building');return{...authored,id:b.id,height:b.height,capacity:b.capacity,searched:b.searched,zombiesTotal:b.zombiesTotal,zombiesRemaining:b.zombiesRemaining,pendingZombie:b.pendingZombie,unlocked:b.unlocked,claimed:b.claimed,clueFound:b.clueFound,facilities:Object.fromEntries(FACILITY_KEYS.map(k=>[k,b.facilities[k]]))};});
 s.facilities=s.buildings[0].facilities;s.gear={...raw.gear};s.selectedBuildingId=ids.has(raw.selectedBuildingId)?raw.selectedBuildingId:'home';const residentIds=new Set();s.residents=raw.residents.map(r=>{const def=RESIDENTS.find(x=>x.id===r?.id)||(/^neighbor_\d+$/.test(r?.id)?{id:r.id,name:`이웃 ${r.id.split('_')[1]}`,role:'새 정착민',description:'함께 살아갈 새 이웃.'}:null);if(!def||residentIds.has(r.id)||!s.buildings.some(b=>b.id===r.buildingId&&b.claimed)||!['rest','farm','water','guard'].includes(r.assignment))throw Error('resident');residentIds.add(r.id);return{...def,buildingId:r.buildingId,assignment:r.assignment};});
 if(s.buildings.some(b=>occupied(s,b)>housing(b)))return null;for(const r of s.residents){const f={farm:'garden',water:'collector',guard:'barricade'}[r.assignment];if(f&&!s.buildings.find(b=>b.id===r.buildingId).facilities[f])return null;}if(new Set(s.residents.filter(r=>r.assignment!=='rest').map(r=>`${r.buildingId}:${r.assignment}`)).size!==s.residents.filter(r=>r.assignment!=='rest').length)return null;
 if(!finite(raw.nextEventAt,raw.time,raw.time+1440*100000)||!plain(raw.eventHistory)||!plain(raw.deferred)||!Number.isInteger(raw.districtInvites)||!finite(raw.districtInvites,0,200))return null;s.nextEventAt=raw.nextEventAt;s.eventHistory={};for(const[id,time]of Object.entries(raw.eventHistory)){if(!EVENTS.some(e=>e.id===id)||!finite(time,0,s.time))return null;s.eventHistory[id]=time;}s.deferred={};for(const[id,v]of Object.entries(raw.deferred)){if(v!==true||!EVENTS.some(e=>e.id===id))return null;s.deferred[id]=true;}s.districtInvites=raw.districtInvites;
 s.event=raw.event;if(s.event!==null&&!(typeof s.event==='string'&&(EVENTS.some(e=>e.id===s.event)||s.buildings.some(b=>s.event===`zombie:${b.id}`&&b.pendingZombie&&b.zombiesRemaining>0))))return null;s.ending=raw.ending===null?null:raw.ending?.id==='death'?{...ENDINGS.death,day:getDay(s)}:null;if(raw.ending!==null&&!s.ending)return null;
 s.action=null;if(raw.action!==null){const a=raw.action;if(!plain(a)||!finite(a.total,1,10000)||!finite(a.remaining,Number.EPSILON,a.total)||!ids.has(a.buildingId))return null;const definition=getActions(s).find(x=>x.id===a.id);if(!definition)return null;s.action={id:a.id,label:definition.label,total:a.total,remaining:a.remaining,buildingId:a.buildingId};}refreshMilestones(s);enforceCapacity(s);return s;
 }catch{return null;}}
