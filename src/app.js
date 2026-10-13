import {createGame, tick, chooseEvent, startAction, getActions, getEvent, getStory, getEconomy, getBuildings, selectBuilding, getResidents, assignResident, ACTION_MINUTES_PER_REAL_SECOND, serialize, deserialize, getDay, getHour, getWeather} from './game.js';
import {createScene} from './scene.js';
import {createAudioEngine} from './audio.js';
import {createPanelLayout} from './panels.js';

const $ = id => document.getElementById(id);
const SAVE_KEY = 'rooftop-journal-save-v1';
const shapes = {
 food:'<path d="M5 8h14v12H5zM7 8V4h10v4M8 12h8M8 16h5"/>',
 water:'<path d="M12 2S5 10 5 15a7 7 0 0 0 14 0C19 10 12 2 12 2Z"/><path d="M9 14c-1 3 1 4 3 4"/>',
 parts:'<path d="m14 5 5-2v5l-4 4-8 9-4-4 9-8V4l4-2M6 16l2 2"/>',
 medicine:'<rect x="4" y="5" width="16" height="16" rx="1"/><path d="M9 5V2h6v3M12 10v7M8.5 13.5h7"/>',
 sun:'<circle cx="12" cy="12" r="4"/><path d="M12 1v3m0 16v3M1 12h3m16 0h3M4 4l2 2m12 12 2 2M4 20l2-2M18 6l2-2"/>',
 moon:'<path d="M20 15A9 9 0 0 1 9 3 9 9 0 1 0 20 15Z"/>',
 rain:'<path d="M5 15a5 5 0 0 1-1-10 6 6 0 0 1 11-1 5 5 0 1 1 4 11M7 18l-1 3m6-3-1 3m6-3-1 3"/>',
 cloud:'<path d="M5 18a5 5 0 0 1-1-10 6 6 0 0 1 11-1 5 5 0 1 1 4 11Z"/>',
 sound:'<path d="m4 9 4 0 5-5v16l-5-5H4ZM17 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
 mute:'<path d="m4 9 4 0 5-5v16l-5-5H4ZM17 9l5 6m0-6-5 6"/>',
 quality:'<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>',
 help:'<circle cx="12" cy="12" r="9"/><path d="M9 8a3 3 0 0 1 6 0c0 2-3 2-3 5M12 17h.01"/>',
 save:'<path d="M3 3h15l3 3v15H3ZM7 3v6h10V3M7 21v-8h10v8"/>',
 pause:'<path d="M8 5v14M16 5v14" stroke-width="3"/>',
 play:'<path d="m7 4 13 8-13 8Z"/>',
 scavenge:'<path d="M7 6V3h10v3M5 6h14v15H5ZM9 6v5h6V6M8 15h8"/>',
 rest:'<path d="M3 6v15M3 16h18M21 11v10M3 10h5v6M8 11h13v5"/>',
 collector:'<path d="M2 5h20l-6 7v8H8v-8ZM5 2v2m7-3v3m7-2v2"/>',
 barricade:'<path d="M5 3v18M19 3v18M3 7h18M3 17h18M5 5l14 14M5 19 19 5"/>',
 garden:'<path d="M12 22V10M12 15C2 15 3 4 3 4s10-1 9 11ZM12 11C12 2 21 2 21 2s1 9-9 9"/>',
 radio:'<rect x="3" y="9" width="18" height="12"/><path d="m6 9 13-7M6 13h7M6 17h7"/><circle cx="17" cy="15" r="2"/>',
 dog:'<path d="m4 5 5-2 4 1 5-1 3 7-4 1-1-5M6 5 3 10l3 2 1-5M7 9v6c0 6 10 6 10 0V9M10 14h4l-2 2ZM8 22v-4m8 4v-4M9 10h.1m5.8 0h.1"/>',
 event:'<path d="M3 20 12 4l9 16ZM12 4v16M2 20h20M18 2v4m-2-2h4"/>',
 heal:'<path d="M12 3v18M3 12h18" stroke-width="3"/>'
};
const icon = (name) => `<svg viewBox="0 0 24 24" aria-hidden="true">${shapes[name] || shapes.event}</svg>`;
const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const chapterText = chapter => typeof chapter==='number'?`CHAPTER ${String(chapter).padStart(2,'0')}`:chapter;
let state = createGame();
let started = false, scene, sceneFailed = false, activeTab='daily', currentEvent=null, currentEnding=null;
let modalResume = null, modalKind=null, quality='high', view='camp', uiHidden=false;
let actionMarkup='', lastLog='', statsMarkup='', toastTimer, lastSave=0;
let resourceMarkup='',facilityMarkup='',weatherMarkup='',pauseMarkup='',economyMarkup='',districtMarkup='',buildingMarkup='';
const audio=createAudioEngine();
const panelLayout=createPanelLayout();
try { const volume=localStorage.getItem('rooftop-journal-volume');if(volume!==null)audio.setVolume(Number(volume)); } catch {}
let previousFocus=null;
let pendingResult=null,resultResume=null;

function readSave(){try{const raw=localStorage.getItem(SAVE_KEY),saved=deserialize(raw);if(saved){try{if(raw&&JSON.parse(raw).version<3&&!localStorage.getItem('rooftop-journal-pre-settlement'))localStorage.setItem('rooftop-journal-pre-settlement',raw);}catch{/* Backup capacity must not prevent loading an existing journal. */}}return saved;}catch{return null;}}
function save(silent=true){
  if(!started)return;
  try{const savedPause=modalResume??resultResume??state.paused;const snapshot=!state.ending?{...state,paused:savedPause}:state;localStorage.setItem(SAVE_KEY,serialize(snapshot));$('save-status').textContent='방금 일지를 기록했습니다';lastSave=performance.now();if(!silent)toast('지금까지의 이야기를 기록했습니다.');}
  catch{$('save-status').textContent='저장 공간을 확인해주세요';if(!silent)toast('저장하지 못했습니다. 브라우저 저장 공간을 확인해주세요.');}
}
function toast(message){$('toast').textContent=message;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,3200);}
function makeScene(){
  try{if(scene&&!sceneFailed)scene.update(state,0);else scene=createScene($('world'),state);scene.setQuality(quality);scene.setView(view);sceneFailed=false;$('scene-error').hidden=true;}
  catch(error){console.error(error);sceneFailed=true;$('scene-error').hidden=false;$('scene-error').textContent='입체 풍경을 표시하지 못했습니다. PC 브라우저의 하드웨어 가속을 켜고 새로고침해주세요. 게임의 선택과 생존 기록은 계속 사용할 수 있습니다.';}
}
function preview(){
  $('preview-roof').textContent=`${state.roof.name} · ${state.roof.height}층`;
  $('preview-description').textContent=state.roof.description;
  $('continue').hidden=!readSave();
  makeScene();
}
function start(loaded=null){
  state=loaded || state;
  started=true;currentEvent=null;currentEnding=null;pendingResult=null;resultResume=null;actionMarkup='';lastLog='';
  document.body.classList.add('playing');$('welcome').hidden=true;$('game-ui').hidden=false;$('clock').hidden=false;$('ui-hint').hidden=false;$('hide-ui').hidden=false;
  if(loaded)makeScene();
  render(true);panelLayout.refresh();save();
  toast(loaded?'일지를 다시 펼쳤습니다. 머물렀던 순간부터 이어집니다.':'작은 옥상에서 첫날이 시작됩니다. 아래에서 오늘 할 일을 골라보세요.');
}
function newRun(){
  closeModal();started=false;state=createGame();currentEnding=null;currentEvent=null;pendingResult=null;resultResume=null;
  $('event-layer').hidden=true;$('game-ui').hidden=true;$('clock').hidden=true;$('welcome').hidden=false;$('hide-ui').hidden=true;$('ui-hint').hidden=true;
  document.body.classList.remove('playing');setUIHidden(false);preview();
}

const resourceNames={food:'식량',water:'식수',parts:'자재',medicine:'의약품'};
const facilityNames={collector:'빗물받이',garden:'작은 텃밭',barricade:'보강된 출입문',radio:'수신기',dog:'개와 함께',ally:'이웃 윤과 연결'};
const gearNames={blade:'정비한 무기',rope:'등반 로프',decoy:'소리 유인기',bandage:'붕대'};
const assignmentNames={rest:'휴식',farm:'작물 관리',water:'식수 관리',guard:'경계 근무'};
const signed=value=>`${value>=0?'+':'−'}${Math.abs(value).toFixed(1)}`;
function renderEconomy(){
  const economy=getEconomy(state);
  const markup=`<div class="economy-title"><span>하루의 수지</span><small>생산 / 소비 / 순수지</small></div>${['food','water'].map(key=>{const flow=economy[key];return `<div class="economy-row ${flow.net<0?'deficit':'surplus'}"><span>${resourceNames[key]}</span><span>${flow.production.toFixed(1)} / ${flow.consumption.toFixed(1)}</span><strong>${signed(flow.net)}</strong></div>`;}).join('')}<div class="reserve-hint">${['food','water'].map(key=>`${resourceNames[key]} ${Number.isFinite(economy[key].days)&&economy[key].days!==null?`${Math.max(0,economy[key].days).toFixed(1)}일분`:'자급 중'}`).join(' · ')}</div>`;
  if(markup!==economyMarkup){$('economy').innerHTML=markup;economyMarkup=markup;}
}
function render(force=false){
  if(!started)return;
  const hour=getHour(state), weather=getWeather(state);
  const clock=`${String(Math.floor(hour)).padStart(2,'0')}:${String(Math.floor((hour%1)*60)).padStart(2,'0')}`;
  $('day').textContent=String(getDay(state)).padStart(2,'0');$('time').textContent=clock;$('weather').textContent=weather.label;
  const weatherSvg=icon(/rain|storm/.test(weather.id)?'rain':/cloud/.test(weather.id)?'cloud':hour<6||hour>19?'moon':'sun');
  if(weatherSvg!==weatherMarkup){$('weather-icon').innerHTML=weatherSvg;weatherMarkup=weatherSvg;}
  $('day-progress').style.width=`${hour/24*100}%`;
  $('roof-name').textContent=state.roof.name;$('roof-floor').textContent=`아파트 ${state.roof.height}층`;
  $('companion').textContent=`주민 ${getResidents(state).length+1}명${state.flags.dog?' · 보리':''}`;
  renderEconomy();
  $('seed-label').textContent=String(state.seed).slice(-4).padStart(4,'0');
  const story=getStory(state);$('story-chapter').textContent=chapterText(story.chapter);$('story-title').textContent=story.title;$('story-objective').textContent=story.objectives.find(o=>!o.done)?.label||story.summary;
  $('scene-label').textContent=`${state.roof.name} · ${state.roof.description}`;
  const markup=Object.entries(resourceNames).map(([key,label])=>{
    const amount=state.resources[key];
    const low=(key==='food'||key==='water')&&amount<2;
    return `<div class="resource ${low?'low':''}"><span class="resource-icon">${icon(key)}</span><div><div class="resource-label">${label}</div><div class="resource-value">${amount<10?amount.toFixed(1):Math.floor(amount)}<small>${key==='water'?'L':key==='food'?'인분':key==='medicine'?'개':'개'}</small></div>${low?'<div class="resource-low">얼마 남지 않았어요</div>':''}</div></div>`;
  }).join('');
  if(resourceMarkup!==markup){$('resources').innerHTML=markup;resourceMarkup=markup;}
  const stats=[['health','건강'],['morale','마음'],['defense','안전']].map(([key,label])=>`<div class="stat ${state.stats[key]<25?'low':''}"><div class="stat-top"><span>${label}</span><span>${Math.round(state.stats[key])} <small>/ 100</small></span></div><div class="stat-track"><i style="width:${state.stats[key]}%"></i></div></div>`).join('');
  if(statsMarkup!==stats){$('stats').innerHTML=stats;statsMarkup=stats;}
  const facilityHtml=Object.entries(facilityNames).filter(([key])=>state.flags[key]).map(([,label])=>`<span class="facility-tag">${label}</span>`).join('');
  if(facilityMarkup!==facilityHtml){$('facilities').innerHTML=facilityHtml;facilityMarkup=facilityHtml;}
  const pauseSvg=icon(state.paused?'play':'pause');if(pauseMarkup!==pauseSvg){$('pause').innerHTML=pauseSvg;pauseMarkup=pauseSvg;}$('pause').setAttribute('aria-label',state.paused?'시간 계속 흐르기':'일시정지');
  $('time-mode').textContent=state.event||state.paused?'이야기를 읽는 시간':state.action?`행동 중 · 1초 = ${ACTION_MINUTES_PER_REAL_SECOND*state.speed}분`:'옥상의 시간 · 1초 = 1분';
  $('pause-tag').hidden=!state.paused||!!state.event||!!state.ending||!$('modal-layer').hidden;
  document.querySelectorAll('[data-speed]').forEach(b=>b.classList.toggle('active',Number(b.dataset.speed)===state.speed));
  const thoughts=state.action?`${state.action.label} · 잠시 후 돌아옵니다.`:state.flags.dog?'혼자가 아니라는 건, 생각보다 큰 힘이다.':hour<6||hour>=19?'저 아래는 어둡지만, 여기는 불이 켜져 있다.':weather.id==='rain'?'비가 온다. 오늘은 하늘이 물을 나눠준다.':'아직, 살아갈 이유가 있다.';
  $('world-thought').textContent=thoughts;
  if(state.action){$('current-action').hidden=false;$('action-label').textContent=state.action.label;$('action-time').textContent=`${Math.ceil(state.action.remaining/ACTION_MINUTES_PER_REAL_SECOND/state.speed)}초 남음`;$('action-progress').style.width=`${100*(1-state.action.remaining/state.action.total)}%`;}
  else $('current-action').hidden=true;
  renderActions();
  const logs=state.log.slice(-35).reverse();
  const logKey=logs.map(l=>l.id).join(',');
  if(logKey!==lastLog||force){$('journal-entries').innerHTML=logs.map(l=>`<div class="journal-entry ${escapeHTML(l.type)}"><time>${l.day===getDay(state)?escapeHTML(l.time):`D${l.day}`}</time><p>${escapeHTML(l.text)}</p></div>`).join('');lastLog=logKey;}
  if(performance.now()-lastSave>3500)$('save-status').textContent='자동으로 기록됩니다';
  renderEvent();
  audio.setEnvironment({weather:weather.id,hour});
  if(state.ending&&currentEnding!==state.ending.id)showEnding();
}
function renderActions(){
  const all=getActions(state);
  const buildings=getBuildings(state), selected=buildings.find(b=>b.selected)||buildings[0];
  const titles={daily:'오늘은 무엇을 할까요?',outside:'누군가의 흔적을 따라서',build:'돌아올 곳을 가꾸기',residents:'함께 사는 사람들',craft:'빈손으로 내려가지 않기'};
  $('dock-title').textContent=titles[activeTab];
  const showDistrict=['outside','build'].includes(activeTab);
  $('district-strip').hidden=!showDistrict;$('building-status').hidden=!showDistrict;
  if(showDistrict){
    const district=buildings.map(b=>`<button data-building="${escapeHTML(b.id)}" class="district-card ${b.selected?'selected':''}" ${!b.unlocked||state.action||state.event?'disabled':''} aria-pressed="${b.selected}"><strong>${escapeHTML(b.name)}</strong><small>${b.claimed?'우리 동네':b.unlocked?`${b.searched} / ${b.capacity} 수색`:'경로 미확보'}</small></button>`).join('');
    if(district!==districtMarkup){$('district-strip').innerHTML=district;districtMarkup=district;}
    const status=`<div><strong>${escapeHTML(selected.name)} · ${selected.height}층</strong><span>좀비 ${selected.zombiesRemaining}마리${selected.claimed?' · 옥상 확보':''}</span></div><div class="building-track"><i style="width:${selected.searched/selected.capacity*100}%"></i></div><p>${selected.searched} / ${selected.capacity}곳 수색 · ${selected.capacity-selected.searched}회 남음${selected.clueLabel?`<br>${escapeHTML(selected.clueLabel)}`:''}</p>`;
    if(status!==buildingMarkup){$('building-status').innerHTML=status;buildingMarkup=status;}
  }
  let markup='';
  if(activeTab==='residents'){
    const residents=getResidents(state);
    markup=residents.length?residents.map(person=>`<button class="resident-card" data-resident="${escapeHTML(person.id)}"><span class="resident-initial">${escapeHTML(person.name.slice(-1))}</span><div><strong>${escapeHTML(person.name)} <small>${escapeHTML(person.role)}</small></strong><p>${escapeHTML(buildings.find(b=>b.id===person.buildingId)?.name||'나의 옥상')} · ${assignmentNames[person.assignment]||'휴식'}</p><span>살 곳과 역할 정하기 ↗</span></div></button>`).join(''):'<div class="empty-state"><strong>돌아올 자리를 비워두었습니다.</strong><p>건물에서 찾은 단서를 이야기 일지에서 따라가세요.<br>구출한 사람은 주민이 되어 농사·식수·경계를 나눌 수 있습니다.</p></div>';
  }else{
    const actions=all.filter(a=>activeTab==='outside'?(a.category==='outside'||['scavenge','water'].includes(a.id)):a.category===activeTab);
    if(activeTab==='craft')markup=`<div class="gear-summary">${Object.entries(gearNames).map(([key,name])=>`<span>${name} <b>${state.gear?.[key]||0}</b></span>`).join('')}</div>`;
    markup+=actions.map(a=>{
      const cost=typeof a.cost==='object'?Object.entries(a.cost).filter(([,v])=>v>0).map(([k,v])=>`${resourceNames[k]||k} ${v}`).join(' · '):a.cost||'';
      const duration=a.duration?`${Math.ceil(a.duration/ACTION_MINUTES_PER_REAL_SECOND/state.speed)}초 · 게임 ${(a.duration/60).toFixed(1)}시간`:'즉시';
      return `<button class="action-button" data-action="${escapeHTML(a.id)}" ${a.disabled?'disabled':''} title="${escapeHTML(a.reason||a.description)}"><span class="action-icon">${icon(a.id)}</span><strong>${escapeHTML(a.label)}</strong><small>${escapeHTML(a.disabled&&a.reason?a.reason:duration)}</small><p class="action-description">${escapeHTML(a.description)}</p>${cost?`<div class="action-cost">${escapeHTML(cost)}</div>`:''}</button>`;
    }).join('');
  }
  $('actions').classList.toggle('build-grid',activeTab!=='residents');
  $('actions').classList.toggle('resident-grid',activeTab==='residents');
  if(actionMarkup!==markup){$('actions').innerHTML=markup;actionMarkup=markup;}
}
function renderEvent(){
  if(pendingResult){
    if(currentEvent===pendingResult.id)return;
    currentEvent=pendingResult.id;$('event-layer').hidden=false;$('event-kicker').textContent='선택의 다음 페이지';$('event-day').textContent=`DAY ${getDay(state)} / CONSEQUENCE`;
    $('event-title').textContent=pendingResult.title;$('event-body').textContent=pendingResult.body;$('event-art').innerHTML=icon('event');
    $('event-choices').innerHTML=`<p class="result-effect">${escapeHTML(pendingResult.summary)}</p><button class="event-choice" data-result="continue"><strong>계속 살아가기</strong><small>이 선택의 흔적은 다음 이야기에도 남습니다.</small></button>`;
    $('event-choices').querySelector('button')?.focus();return;
  }
  const event=getEvent(state);
  if(!event){if(currentEvent){$('event-layer').hidden=true;currentEvent=null;previousFocus?.focus?.();}return;}
  if(event.id===currentEvent)return;
  if(uiHidden)setUIHidden(false);
  previousFocus=document.activeElement;currentEvent=event.id;
  $('event-kicker').textContent=event.kicker||'옥상에 찾아온 이야기';$('event-day').textContent=`DAY ${String(getDay(state)).padStart(2,'0')} / A SMALL ENCOUNTER`;
  $('event-title').textContent=event.title;$('event-body').textContent=event.body;
  $('event-art').innerHTML=icon(/dog|puppy/.test(event.id)?'dog':/rain|water/.test(event.id)?'rain':/radio|signal|rescue/.test(event.id)?'radio':/garden/.test(event.id)?'garden':'event');
  $('event-choices').innerHTML=event.choices.map(c=>`<button class="event-choice" data-choice="${escapeHTML(c.id)}" ${c.disabled?'disabled':''}><strong>${escapeHTML(c.label)}</strong><small>${escapeHTML(c.disabled?c.reason:c.description)}</small></button>`).join('');
  $('event-layer').hidden=false;
  $('event-choices').querySelector('button:not(:disabled)')?.focus();
  save();
}
function showModal(kicker,title,body,buttons,kind='general'){
  if(modalResume===null)modalResume=state.paused;
  state.paused=true;modalKind=kind;previousFocus=document.activeElement;
  $('modal-kicker').textContent=kicker;$('modal-title').textContent=title;$('modal-body').innerHTML=body;
  $('modal-buttons').replaceChildren();
  buttons.forEach(([label,callback])=>{const b=document.createElement('button');b.textContent=label;b.addEventListener('click',callback);$('modal-buttons').append(b);});
  $('modal-close').hidden=kind==='ending';$('modal-layer').hidden=false;$('modal-buttons').querySelector('button')?.focus();
}
function closeModal(){
  $('modal-layer').hidden=true;if(modalResume!==null){state.paused=modalResume;modalResume=null;}modalKind=null;previousFocus?.focus?.();render();
}
function showHelp(){
  showModal('A LITTLE FIELD GUIDE','돌아올 곳을 만드는 일',`<p>흩어진 가족과 친구를 찾아 이 옥상으로 데려오세요. 연결한 지붕과 함께하는 사람들이 늘어나면, 버티는 캠프는 살아가는 동네가 됩니다. 메인 이야기를 마친 뒤에도 생활은 계속됩니다.</p><div class="help-row"><b>시간</b><span>아무 행동이 없을 때는 현실 1초에 게임 1분, 행동 중에는 12분이 흐릅니다. 배속은 행동에만 적용됩니다. 선택과 안내를 읽을 때, 탭을 숨기거나 게임을 닫았을 때는 정지합니다.</span></div><div class="help-row"><b>탐색</b><span>건물 한 채에서 층수 × 3번 수색할 수 있습니다. 식수 수색도 이 횟수를 씁니다. 2~3마리의 좀비는 무기·유인기·로프와 기술로 돌파하세요. 물자는 무한히 나오지 않습니다.</span></div><div class="help-row"><b>새 옥상</b><span>단서로 새 경로를 열고 건물을 끝까지 수색하세요. 좀비를 모두 처리하고 옥상을 확보하면 그곳에 설비와 주민을 배치할 수 있습니다.</span></div><div class="help-row"><b>자동화</b><span>기본 설비만으로 자급하기는 어렵습니다. 설비를 개선하고 전력과 기술을 확보한 뒤 주민의 역할을 정하세요. 왼쪽의 하루 수지로 식량과 식수의 부족량을 확인할 수 있습니다. 주민이 늘면 소비도 늘어납니다.</span></div><div class="help-row"><b>음악</b><span>상단 ♫로 오리지널 로파이 ‘옥상에 남은 오후’를 켭니다. 환경음은 옆 스피커로 별도 조절하며 외부 음원·샘플은 사용하지 않습니다.</span></div><div class="help-row"><b>조작</b><span>Space 일시정지 · 1 / 2 / 3 행동 배속 · H 풍경 보기<br>드래그로 회전, 휠로 거리를 조절합니다.</span></div><div class="help-row"><b>기록</b><span>이 브라우저에 자동 저장됩니다. 이전 버전 기록은 새 정착 시스템으로 이전하며, 원본 기록도 별도로 보관합니다.</span></div>`,started?[['이어서 살아가기',closeModal],['새 이야기',()=>showModal('START AGAIN','새로운 옥상으로 떠날까요?','<p>새 생존을 시작하면 현재 저장 기록을 덮어씁니다. 지금의 동네로 돌아오려면 취소해주세요.</p>',[['돌아가기',closeModal],['새 옥상 둘러보기',newRun]],'confirm')]]:[['이해했어요',closeModal]]);
}
function showResident(id){
  const person=getResidents(state).find(p=>p.id===id);if(!person)return;
  const roofs=getBuildings(state).filter(b=>b.claimed);
  const body=`<p>${escapeHTML(person.description)}</p><label class="assignment-label" for="resident-roof">살 곳</label><select id="resident-roof">${roofs.map(b=>`<option value="${escapeHTML(b.id)}" ${b.id===person.buildingId?'selected':''}>${escapeHTML(b.name)} · ${b.height}층</option>`).join('')}</select><label class="assignment-label" for="resident-job">함께 맡을 일</label><select id="resident-job">${Object.entries(assignmentNames).map(([key,name])=>`<option value="${key}" ${key===person.assignment?'selected':''}>${name}</option>`).join('')}</select><p class="assignment-note">작물·식수 담당은 해당 설비가 있는 옥상에서 일합니다. 경계 근무는 동네의 방어를 돕습니다. 일을 맡겨도 주민의 식량과 물 소비는 계속됩니다.</p><div id="assignment-feedback" role="status"></div>`;
  showModal(`${escapeHTML(person.role)} · OUR NEIGHBORS`,`${person.name}의 하루`,body,[['이대로 배치하기',()=>{const result=assignResident(state,id,$('resident-roof').value,$('resident-job').value);if(!result.ok){$('assignment-feedback').textContent=result.reason;return;}save();closeModal();toast(`${person.name}의 살 곳과 역할을 정했습니다.`);}],['돌아가기',closeModal]],'resident');
}
function showStory(){
  const story=getStory(state);
  const items=(list,empty)=>list.length?list.map(item=>`<div class="story-item"><strong>${escapeHTML(item.label)}</strong><p>${escapeHTML(item.description||'')}</p></div>`).join(''):`<p class="story-empty">${empty}</p>`;
  showModal(chapterText(story.chapter),story.title,`<p>${escapeHTML(story.summary)}</p><div class="story-section-label">다음 페이지로 가는 길</div>${story.objectives.map(o=>`<div class="story-objective ${o.done?'done':''}"><span>${o.done?'✓':'○'}</span>${escapeHTML(o.label)}</div>`).join('')}<div class="story-section-label">살아가며 배운 것</div>${items(story.traits,'사건을 겪고 새로운 능력을 배울 수 있습니다.')}<div class="story-section-label">모아둔 단서</div>${items(story.clues,'누군가의 말과 남겨진 물건이 새로운 길을 엽니다.')}`,[['일지를 덮고 돌아가기',closeModal]],'story');
}
function showEnding(){
  currentEnding=state.ending.id;save();setUIHidden(false);
  showModal('THE END / 일지의 마지막 장',state.ending.title,`<p>${escapeHTML(state.ending.body)}</p><div class="ending-stat"><span>함께한 날들<br><strong>${getDay(state)}일</strong></span><span>이야기가 머문 곳<br><strong style="font-size:17px">${escapeHTML(state.roof.name)}</strong></span></div><p>모든 끝은 다른 이야기의 시작이 됩니다.</p>`,[['다른 옥상에서 다시 시작',newRun]],'ending');
}
function setUIHidden(hidden){uiHidden=hidden;document.body.classList.toggle('ui-hidden',hidden);$('show-ui').hidden=!hidden;}

function renderAudio(){
  const settings=audio.getState();
  $('sound').innerHTML=icon(settings.ambientEnabled?'sound':'mute');
  $('sound').setAttribute('aria-label',settings.ambientEnabled?'환경음 끄기':'환경음 켜기');
  $('sound').title=settings.ambientEnabled?'환경음 끄기':'환경음 켜기';
  $('music').classList.toggle('on',settings.musicEnabled);$('music').setAttribute('aria-pressed',String(settings.musicEnabled));
  $('music').setAttribute('aria-label',settings.musicEnabled?'로파이 음악 끄기':'로파이 음악 켜기');
  $('music').title=`${settings.trackTitle} · ${settings.musicEnabled?'재생 중':'클릭해서 재생'}`;
  $('music-volume').value=Math.round(settings.volume*100);
}
async function toggleAudio(kind){try{const settings=audio.getState();if(kind==='music')await audio.setMusicEnabled(!settings.musicEnabled);else await audio.setAmbientEnabled(!settings.ambientEnabled);renderAudio();if(!audio.getState().available)toast('이 브라우저에서는 소리를 재생할 수 없습니다.');else if(kind==='music'&&audio.getState().musicEnabled)toast('♫ 옥상에 남은 오후 · 오리지널 로파이');}catch{toast('소리를 재생하지 못했습니다. 다시 눌러주세요.');}}
function pause(){if(!started||state.event||state.ending||!$('modal-layer').hidden)return;state.paused=!state.paused;render();save();}

renderAudio();$('quality').innerHTML=icon('quality');$('help').innerHTML=icon('help');$('save').innerHTML=icon('save');
$('start').addEventListener('click',()=>{if(readSave())showModal('A NEW CHAPTER','새 일지를 시작할까요?','<p>새 생존을 시작하면 이전 일지를 덮어씁니다. 지난 이야기를 이어가려면 돌아가서 이어 쓰기를 선택해주세요.</p>',[['돌아가기',closeModal],['새 생존 시작',()=>{closeModal();start();}]],'confirm');else start();});$('continue').addEventListener('click',()=>{const saved=readSave();if(saved)start(saved);else toast('이어서 쓸 수 있는 일지가 없습니다.');});
$('reroll').addEventListener('click',()=>{state=createGame();preview();});
$('save').addEventListener('click',()=>save(false));$('pause').addEventListener('click',pause);
$('story-open').addEventListener('click',showStory);
$('sound').addEventListener('click',()=>toggleAudio('ambient'));$('music').addEventListener('click',()=>toggleAudio('music'));
$('reset-layout').addEventListener('click',()=>{panelLayout.reset();toast('상태창·오늘의 기록·행동 창을 기본 배치로 돌렸습니다.');});
$('music-volume').addEventListener('input',()=>{audio.setVolume(Number($('music-volume').value)/100);try{localStorage.setItem('rooftop-journal-volume',audio.getState().volume);}catch{}});
$('help').addEventListener('click',showHelp);$('brand').addEventListener('click',e=>{e.preventDefault();showHelp();});
$('quality').addEventListener('click',()=>{quality=quality==='high'?'low':'high';scene?.setQuality(quality);$('quality').title=`그래픽 품질: ${quality==='high'?'높음':'가벼움'}`;toast(quality==='high'?'그래픽 품질을 높였습니다.':'가벼운 그래픽으로 전환했습니다.');});
$('view').addEventListener('click',()=>{view=view==='camp'?'wide':'camp';scene?.setView(view);$('view').textContent=view==='camp'?'풍경 넓게 보기 ↗':'캠프 가까이 보기 ↙';});
$('hide-ui').addEventListener('click',()=>setUIHidden(true));$('show-ui').addEventListener('click',()=>setUIHidden(false));
$('journal-toggle').addEventListener('click',()=>{$('journal-toggle').parentElement.classList.toggle('expanded');$('journal-expand').textContent=$('journal-toggle').parentElement.classList.contains('expanded')?'↙':'↗';});
$('modal-close').addEventListener('click',closeModal);
document.querySelectorAll('[data-speed]').forEach(b=>b.addEventListener('click',()=>{state.speed=Number(b.dataset.speed);render();save();}));
document.querySelectorAll('[data-tab]').forEach(b=>b.addEventListener('click',()=>{activeTab=b.dataset.tab;document.querySelectorAll('[data-tab]').forEach(t=>t.setAttribute('aria-selected',String(t===b)));actionMarkup='';renderActions();}));
$('district-strip').addEventListener('click',event=>{const b=event.target.closest('[data-building]');if(!b||b.disabled)return;const result=selectBuilding(state,b.dataset.building);if(!result.ok){toast(result.reason);return;}scene?.setFocus?.(b.dataset.building);actionMarkup='';render(true);save();});
$('actions').addEventListener('click',event=>{const resident=event.target.closest('[data-resident]');if(resident){showResident(resident.dataset.resident);return;}const b=event.target.closest('[data-action]');if(!b||b.disabled)return;const result=startAction(state,b.dataset.action);if(result?.ok===false)toast(result.reason||'지금은 할 수 없는 행동입니다.');else{state.paused=false;toast(`${b.dataset.action==='heal'?'상처를 돌봅니다.':'오늘 할 일을 시작했습니다.'}`);}render(true);save();});
$('event-choices').addEventListener('click',event=>{
  if(event.target.closest('[data-result]')){pendingResult=null;state.paused=resultResume??false;resultResume=null;currentEvent=null;$('event-layer').hidden=true;render(true);save();$('story-open').focus();return;}
  const b=event.target.closest('[data-choice]');if(!b||b.disabled)return;
  const selected=getEvent(state)?.choices.find(c=>c.id===b.dataset.choice);const result=chooseEvent(state,b.dataset.choice);
  if(result?.ok===false){toast(result.reason||'이 선택을 할 수 없습니다.');return;}
  currentEvent=null;
  if(!state.ending){const latest=state.log.at(-1);resultResume=state.paused;state.paused=true;pendingResult={id:`result:${latest.id}`,title:selected?.label||'그 뒤의 이야기',body:latest.text,summary:selected?.description||''};}
  else $('event-layer').hidden=true;
  render(true);save();
});
document.addEventListener('keydown',e=>{
  const dialog=!$('modal-layer').hidden?$('modal-layer'):!$('event-layer').hidden?$('event-layer'):null;
  if(dialog&&e.key==='Tab'){
    const els=[...dialog.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href],[tabindex="0"]')].filter(el=>!el.hidden&&el.getClientRects().length);const first=els[0],last=els.at(-1);
    if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}return;
  }
  if(e.key==='Escape'&&modalKind&&modalKind!=='ending'){closeModal();return;}
  if(dialog)return;
  if(['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName))return;
  if(e.code==='Space'&&!e.target.closest('button,a,[role="button"]')){e.preventDefault();pause();}
  if(e.key.toLowerCase()==='h'&&started)setUIHidden(!uiHidden);
  if(started&&['1','2','3'].includes(e.key)){state.speed={'1':1,'2':2,'3':4}[e.key];render();save();}
});
window.addEventListener('pagehide',()=>save());
document.addEventListener('visibilitychange',()=>{previousFrame=performance.now();if(document.hidden)save();audio.setHidden(document.hidden);});
window.addEventListener('resize',()=>scene?.resize());
let previousFrame=performance.now(),lastRender=0;
function frame(now){
  const dt=Math.min((now-previousFrame)/1000,.25);previousFrame=now;
  if(!document.hidden){
    if(started)tick(state,dt);
    if(!sceneFailed)scene?.update(state,dt);
    if(started&&now-lastRender>200){render();lastRender=now;}
    if(started&&now-lastSave>10000)save();
  }
  requestAnimationFrame(frame);
}
preview();requestAnimationFrame(frame);
