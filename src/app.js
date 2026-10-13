import {createGame, tick, chooseEvent, startAction, getActions, getEvent, getStory, serialize, deserialize, getDay, getHour, getWeather} from './game.js';
import {createScene} from './scene.js';

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
let resourceMarkup='',facilityMarkup='',weatherMarkup='',pauseMarkup='';
let audioContext, audioGain, soundEnabled=false;
let previousFocus=null;
let pendingResult=null,resultResume=null;

function readSave(){try{return deserialize(localStorage.getItem(SAVE_KEY));}catch{return null;}}
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
  render(true);save();
  toast(loaded?'일지를 다시 펼쳤습니다. 머물렀던 순간부터 이어집니다.':'작은 옥상에서 첫날이 시작됩니다. 아래에서 오늘 할 일을 골라보세요.');
}
function newRun(){
  closeModal();started=false;state=createGame();currentEnding=null;currentEvent=null;pendingResult=null;resultResume=null;
  $('event-layer').hidden=true;$('game-ui').hidden=true;$('clock').hidden=true;$('welcome').hidden=false;$('hide-ui').hidden=true;$('ui-hint').hidden=true;
  document.body.classList.remove('playing');setUIHidden(false);preview();
}

const resourceNames={food:'식량',water:'식수',parts:'자재',medicine:'의약품'};
const facilityNames={collector:'빗물받이',garden:'작은 텃밭',barricade:'보강된 출입문',radio:'수신기',dog:'개와 함께',ally:'이웃 윤과 연결'};
function render(force=false){
  if(!started)return;
  const hour=getHour(state), weather=getWeather(state);
  const clock=`${String(Math.floor(hour)).padStart(2,'0')}:${String(Math.floor((hour%1)*60)).padStart(2,'0')}`;
  $('day').textContent=String(getDay(state)).padStart(2,'0');$('time').textContent=clock;$('weather').textContent=weather.label;
  const weatherSvg=icon(/rain|storm/.test(weather.id)?'rain':/cloud/.test(weather.id)?'cloud':hour<6||hour>19?'moon':'sun');
  if(weatherSvg!==weatherMarkup){$('weather-icon').innerHTML=weatherSvg;weatherMarkup=weatherSvg;}
  $('day-progress').style.width=`${hour/24*100}%`;
  $('roof-name').textContent=state.roof.name;$('roof-floor').textContent=`아파트 ${state.roof.height}층`;
  $('companion').textContent=`생존자 1명${state.flags.dog?' + 개 1마리':''}`;
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
  $('pause-tag').hidden=!state.paused||!!state.event||!!state.ending||!$('modal-layer').hidden;
  document.querySelectorAll('[data-speed]').forEach(b=>b.classList.toggle('active',Number(b.dataset.speed)===state.speed));
  const thoughts=state.action?`${state.action.label} · 잠시 후 돌아옵니다.`:state.flags.dog?'혼자가 아니라는 건, 생각보다 큰 힘이다.':hour<6||hour>=19?'저 아래는 어둡지만, 여기는 불이 켜져 있다.':weather.id==='rain'?'비가 온다. 오늘은 하늘이 물을 나눠준다.':'아직, 살아갈 이유가 있다.';
  $('world-thought').textContent=thoughts;
  if(state.action){$('current-action').hidden=false;$('action-label').textContent=state.action.label;$('action-time').textContent=`${Math.ceil(state.action.remaining/6/state.speed)}초 남음`;$('action-progress').style.width=`${100*(1-state.action.remaining/state.action.total)}%`;}
  else $('current-action').hidden=true;
  renderActions();
  const logs=state.log.slice(-35).reverse();
  const logKey=logs.map(l=>l.id).join(',');
  if(logKey!==lastLog||force){$('journal-entries').innerHTML=logs.map(l=>`<div class="journal-entry ${escapeHTML(l.type)}"><time>${l.day===getDay(state)?escapeHTML(l.time):`D${l.day}`}</time><p>${escapeHTML(l.text)}</p></div>`).join('');lastLog=logKey;}
  if(performance.now()-lastSave>3500)$('save-status').textContent='자동으로 기록됩니다';
  renderEvent();
  if(state.ending&&currentEnding!==state.ending.id)showEnding();
}
function renderActions(){
  const all=getActions(state);
  let markup='';
  if(activeTab==='supplies'){
    const heal=all.find(a=>a.id==='heal');
    markup=`<div class="inventory-item"><strong>응급 의약품 · ${Math.floor(state.resources.medicine)}개</strong><br>상처를 돌보고 건강을 회복합니다.<button data-action="heal" ${heal?.disabled?'disabled':''} title="${escapeHTML(heal?.reason||heal?.description||'건강 회복')}">의약품 사용</button></div><div class="inventory-item"><strong>함께하는 생명</strong><br>${state.flags.dog?'개 1마리 · 식량 소모 1.5배<br>외로움과 야간 위험을 덜어줍니다.':'아직은 혼자입니다.<br>옥상 문밖의 소리에 귀 기울여보세요.'}</div>`;
  }else{
    const build=['collector','barricade','garden','radio','repair'];
    const outside=['investigate_school','investigate_tower','investigate_river'];
    const actions=all.filter(a=>activeTab==='build'?build.includes(a.id):activeTab==='outside'?outside.includes(a.id):!build.includes(a.id)&&!outside.includes(a.id)&&a.id!=='heal');
    markup=actions.map(a=>{
      const cost=typeof a.cost==='object'?Object.entries(a.cost).filter(([,v])=>v>0).map(([k,v])=>`${resourceNames[k]||k} ${v}`).join(' · '):a.cost||'';
      const duration=a.duration?`${Math.ceil(a.duration/6/state.speed)}초`:'즉시';
      return `<button class="action-button" data-action="${a.id}" ${a.disabled?'disabled':''} title="${escapeHTML(a.reason||a.description)}"><span class="action-icon">${icon(a.id)}</span><strong>${escapeHTML(a.label)}</strong><small>${escapeHTML(a.disabled&&a.reason?a.reason:duration)}</small>${cost?`<div class="action-cost">${escapeHTML(cost)}</div>`:''}</button>`;
    }).join('');
  }
  $('actions').classList.toggle('build-grid',activeTab==='build');
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
  showModal('A LITTLE FIELD GUIDE','옥상에서 살아간다는 것',`<p>물자를 모으고, 캠프를 가꾸고, 문밖의 이야기에 응답하세요. 얼마나 오래, 누구와 살아갈지는 작은 선택들이 결정합니다.</p><div class="help-row"><b>시간</b><span>현실 4분이 게임의 하루입니다. 선택지와 안내를 읽는 동안에는 멈추고, 창을 숨기거나 게임을 닫아도 물자가 줄지 않습니다.</span></div><div class="help-row"><b>생활</b><span>탐색으로 식량과 자재를, 식수 확보로 물을 얻으세요. 부족한 물자는 건강을 위협합니다.</span></div><div class="help-row"><b>캠프</b><span>빗물받이와 텃밭은 유지에 도움을 줍니다. 출입문을 보강하고 수신기를 고쳐 새로운 이야기를 만나세요.</span></div><div class="help-row"><b>이야기</b><span>동료와 이웃의 인연, 구조 신호, 탈출 준비가 서로 다른 결말로 이어집니다.</span></div><div class="help-row"><b>조작</b><span>Space 일시정지 · 1 / 2 / 3 배속 · H 풍경 보기<br>마우스로 풍경을 드래그하고 휠로 거리를 조절할 수 있습니다.</span></div><div class="help-row"><b>기록</b><span>이 브라우저에 자동 저장됩니다. 브라우저 데이터를 지우면 일지도 사라집니다.</span></div>`,started?[['이어서 살아가기',closeModal],['새 이야기',()=>showModal('START AGAIN','새로운 옥상으로 떠날까요?','<p>새 생존을 시작하면 기존 저장 기록을 덮어씁니다. 지금의 이야기는 다시 이어갈 수 없습니다.</p>',[['돌아가기',closeModal],['새 옥상 둘러보기',newRun]],'confirm')]]:[['이해했어요',closeModal]]);
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

// Sound is synthesized locally and starts only after an explicit click.
function toggleSound(){
  if(!audioContext){
    try{
      audioContext=new (window.AudioContext||window.webkitAudioContext)();audioGain=audioContext.createGain();audioGain.gain.value=0;audioGain.connect(audioContext.destination);
      const len=audioContext.sampleRate*3, buffer=audioContext.createBuffer(1,len,audioContext.sampleRate), data=buffer.getChannelData(0);let last=0;
      for(let i=0;i<len;i++){last=(last+.02*(Math.random()*2-1))/1.02;data[i]=last*3;}
      const noise=audioContext.createBufferSource();noise.buffer=buffer;noise.loop=true;const filter=audioContext.createBiquadFilter();filter.type='lowpass';filter.frequency.value=650;noise.connect(filter);filter.connect(audioGain);noise.start();
    }catch{toast('이 브라우저에서는 환경음을 재생할 수 없습니다.');return;}
  }
  soundEnabled=!soundEnabled;if(soundEnabled)audioContext.resume();audioGain.gain.setTargetAtTime(soundEnabled?.14:0,audioContext.currentTime,.5);
  $('sound').innerHTML=icon(soundEnabled?'sound':'mute');$('sound').setAttribute('aria-label',soundEnabled?'환경음 끄기':'환경음 켜기');$('sound').title=soundEnabled?'환경음 끄기':'환경음 켜기';
}
function pause(){if(!started||state.event||state.ending||!$('modal-layer').hidden)return;state.paused=!state.paused;render();save();}

$('sound').innerHTML=icon('mute');$('quality').innerHTML=icon('quality');$('help').innerHTML=icon('help');$('save').innerHTML=icon('save');
$('start').addEventListener('click',()=>{if(readSave())showModal('A NEW CHAPTER','새 일지를 시작할까요?','<p>새 생존을 시작하면 이전 일지를 덮어씁니다. 지난 이야기를 이어가려면 돌아가서 이어 쓰기를 선택해주세요.</p>',[['돌아가기',closeModal],['새 생존 시작',()=>{closeModal();start();}]],'confirm');else start();});$('continue').addEventListener('click',()=>{const saved=readSave();if(saved)start(saved);else toast('이어서 쓸 수 있는 일지가 없습니다.');});
$('reroll').addEventListener('click',()=>{state=createGame();preview();});
$('save').addEventListener('click',()=>save(false));$('pause').addEventListener('click',pause);
$('story-open').addEventListener('click',showStory);
$('sound').addEventListener('click',toggleSound);$('help').addEventListener('click',showHelp);$('brand').addEventListener('click',e=>{e.preventDefault();showHelp();});
$('quality').addEventListener('click',()=>{quality=quality==='high'?'low':'high';scene?.setQuality(quality);$('quality').title=`그래픽 품질: ${quality==='high'?'높음':'가벼움'}`;toast(quality==='high'?'그래픽 품질을 높였습니다.':'가벼운 그래픽으로 전환했습니다.');});
$('view').addEventListener('click',()=>{view=view==='camp'?'wide':'camp';scene?.setView(view);$('view').textContent=view==='camp'?'풍경 넓게 보기 ↗':'캠프 가까이 보기 ↙';});
$('hide-ui').addEventListener('click',()=>setUIHidden(true));$('show-ui').addEventListener('click',()=>setUIHidden(false));
$('journal-toggle').addEventListener('click',()=>{$('journal-toggle').parentElement.classList.toggle('expanded');$('journal-expand').textContent=$('journal-toggle').parentElement.classList.contains('expanded')?'↙':'↗';});
$('modal-close').addEventListener('click',closeModal);
document.querySelectorAll('[data-speed]').forEach(b=>b.addEventListener('click',()=>{state.speed=Number(b.dataset.speed);render();save();}));
document.querySelectorAll('[data-tab]').forEach(b=>b.addEventListener('click',()=>{activeTab=b.dataset.tab;document.querySelectorAll('[data-tab]').forEach(t=>t.setAttribute('aria-selected',String(t===b)));actionMarkup='';renderActions();}));
$('actions').addEventListener('click',event=>{const b=event.target.closest('[data-action]');if(!b||b.disabled)return;const result=startAction(state,b.dataset.action);if(result?.ok===false)toast(result.reason||'지금은 할 수 없는 행동입니다.');else toast(`${b.dataset.action==='heal'?'상처를 돌봅니다.':'오늘 할 일을 시작했습니다.'}`);render(true);save();});
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
  if(['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName))return;
  const dialog=!$('modal-layer').hidden?$('modal-layer'):!$('event-layer').hidden?$('event-layer'):null;
  if(dialog&&e.key==='Tab'){
    const els=[...dialog.querySelectorAll('button:not(:disabled):not([hidden])')];const first=els[0],last=els.at(-1);
    if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}return;
  }
  if(e.key==='Escape'&&modalKind&&modalKind!=='ending'){closeModal();return;}
  if(dialog)return;
  if(e.code==='Space'&&!e.target.closest('button,a,[role="button"]')){e.preventDefault();pause();}
  if(e.key.toLowerCase()==='h'&&started)setUIHidden(!uiHidden);
  if(started&&['1','2','3'].includes(e.key)){state.speed={'1':1,'2':2,'3':4}[e.key];render();save();}
});
window.addEventListener('pagehide',()=>save());
document.addEventListener('visibilitychange',()=>{previousFrame=performance.now();if(document.hidden){save();if(audioContext)audioContext.suspend();}else if(soundEnabled)audioContext?.resume();});
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
