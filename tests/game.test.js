import test from 'node:test';
import assert from 'node:assert/strict';
import {writeFileSync,mkdirSync} from 'node:fs';
import {createGame,tick,startAction,getActions,getEvent,chooseEvent,serialize,deserialize,getDay,getTimeRate,getEconomy,getBuildings,selectBuilding,getResidents,assignResident,getStory} from '../src/game.js';
import {EVENTS} from '../src/content.js';

function resolve(s,policy={}){
 const e=getEvent(s);if(!e)return;
 let choice;
 if(e.id.startsWith('zombie:'))choice=['decoy','blade','rope','scout','fight'].map(id=>e.choices.find(c=>c.id===id&&!c.disabled)).find(Boolean);
 else if(policy.defer?.includes(e.id))choice=e.choices.find(c=>c.id==='later'||c.id==='decline');
 else if(e.id==='stray_dog')choice=e.choices.find(c=>c.id==='decline');
 else choice=e.choices.find(c=>!c.disabled&&c.id!=='later'&&c.id!=='decline');
 choice=choice||e.choices.find(c=>!c.disabled);assert.ok(choice,`No choice for ${e.id}`);assert.equal(chooseEvent(s,choice.id).ok,true);
}
function finish(s,policy={}){let guard=0;while(s.action||s.event){if(s.ending)break;if(s.event)resolve(s,policy);else tick(s,1);assert.ok(++guard<20000,'action stalled');}}
function doAction(s,id,policy={}){if(s.event)resolve(s,policy);const result=startAction(s,id);assert.equal(result.ok,true,`${id}: ${result.reason}`);finish(s,policy);assert.equal(s.ending,null,`died on ${id} day ${getDay(s)}`);}

test('idle is exactly one minute per second regardless of action speed',()=>{for(const speed of [1,2,4]){const s=createGame(42);s.speed=speed;s.nextEventAt=10000;tick(s,15);assert.equal(s.time,15);assert.equal(getTimeRate(s),1);}});
test('action time accelerates and stops at its exact completion boundary',()=>{const s=createGame(42);s.nextEventAt=10000;s.stats.health=80;startAction(s,'heal');s.speed=2;const duration=s.action.total;tick(s,duration/24+10);assert.equal(s.action,null);assert.ok(Math.abs(s.time-(duration+10))<1e-6);assert.equal(getTimeRate(s),1);});
test('event and manual pause consume no time or supplies',()=>{const s=createGame(42);tick(s,30);assert.equal(s.event,'first_knock');const before=serialize(s);tick(s,300);assert.equal(serialize(s),before);resolve(s);s.paused=true;const paused=serialize(s);tick(s,300);assert.equal(serialize(s),paused);});
test('buildings have exactly floors times three finite search locations and 2–3 persistent zombies',()=>{for(const seed of [1,42,99]){const s=createGame(seed);for(const b of s.buildings){assert.equal(b.capacity,b.height*3);assert.ok([2,3].includes(b.zombiesTotal));}}const s=createGame(42);s.nextEventAt=10000;s.buildings[0].searched=s.buildings[0].capacity;s.buildings[0].zombiesRemaining=0;for(const id of ['scavenge','water'])assert.equal(startAction(s,id).ok,false);});
test('water searches consume the same finite building pool',()=>{const s=createGame(42);s.nextEventAt=10000;doAction(s,'water');assert.equal(s.buildings[0].searched,1);doAction(s,'scavenge');assert.equal(s.buildings[0].searched,2);assert.equal(s.buildings[0].zombiesRemaining,s.buildings[0].zombiesTotal-1);});
test('retreat never clears a zombie or grants loot; equipment has a real cost',()=>{const s=createGame(42);s.nextEventAt=10000;doAction(s,'craft_blade');assert.equal(s.gear.blade,4);assert.equal(s.resources.parts,1);doAction(s,'scavenge');startAction(s,'scavenge');while(s.action)tick(s,1);assert.ok(s.event.startsWith('zombie:'));const b=s.buildings[0],z=b.zombiesRemaining,locations=b.searched,resources={...s.resources};chooseEvent(s,'retreat');assert.equal(b.zombiesRemaining,z);assert.equal(b.searched,locations);assert.deepEqual(s.resources,resources);assert.equal(startAction(s,'scavenge').ok,false);startAction(s,'clear_zombies');while(s.action)tick(s,1);const health=s.stats.health;chooseEvent(s,'blade');assert.equal(b.zombiesRemaining,z-1);assert.equal(s.gear.blade,3);assert.equal(s.stats.health,health-5);});
test('unprepared idle survival ends from finite food and water',()=>{const s=createGame(42);s.nextEventAt=1e8;for(let i=0;i<5&&!s.ending;i++)tick(s,3600);assert.equal(s.ending?.id,'death');assert.ok(getDay(s)<=7);});
test('basic facilities cannot sustain even one person without further investment',()=>{const s=createGame(42);s.facilities.garden=1;s.facilities.collector=1;const e=getEconomy(s);assert.ok(e.food.net<0);assert.ok(e.water.net<0);assert.ok(e.food.days>0);});
test('production scales with residents, facilities, water and maintained power',()=>{const s=createGame(42);s.facilities.garden=3;s.facilities.collector=3;s.facilities.power=2;const a=getEconomy(s);assert.ok(a.food.production>4);assert.ok(a.water.production>7);s.resources.parts=0;const b=getEconomy(s);assert.ok(b.food.production<a.food.production);assert.ok(b.water.production<a.water.production);s.resources.water=0;assert.equal(getEconomy(s).food.production,0);});
test('roof claims require all locations AND all persistent zombies',()=>{const s=createGame(42);const b=s.buildings[1];b.unlocked=true;selectBuilding(s,b.id);s.resources.parts=20;s.gear.rope=1;b.searched=b.capacity-1;b.zombiesRemaining=0;assert.equal(startAction(s,'claim_roof').ok,false);b.searched++;b.zombiesRemaining=1;assert.equal(startAction(s,'claim_roof').ok,false);b.zombiesRemaining=0;assert.equal(startAction(s,'claim_roof').ok,true);});
test('residents require beds and actual work facilities, paused management is allowed',()=>{const s=createGame(42);s.residents.push({id:'yoon',name:'윤',role:'정찰자',description:'',buildingId:'home',assignment:'rest'});s.paused=true;assert.equal(assignResident(s,'yoon','clinic','rest').ok,false);assert.equal(assignResident(s,'yoon','home','farm').ok,false);s.facilities.garden=1;assert.equal(assignResident(s,'yoon','home','farm').ok,true);assert.equal(getEconomy(s).people,2);});
test('save roundtrip preserves finite locations, timing, assignments and gear',()=>{const s=createGame(42);s.nextEventAt=10000;doAction(s,'craft_blade');doAction(s,'scavenge');startAction(s,'water');tick(s,2);const restored=deserialize(serialize(s));assert.ok(restored);assert.equal(restored.action.remaining,s.action.remaining);assert.equal(restored.buildings[0].searched,1);assert.deepEqual(restored.gear,s.gear);assert.equal(restored.time,s.time);assert.equal(restored.facilities,restored.buildings[0].facilities);});
test('old completed escape saves migrate to a paused chapter without ending',()=>{const old=createGame(99);old.version=2;old.time=1440*19;old.resources.food=128;old.resources.water=78;old.flags.collector=true;old.flags.garden=true;old.ending={id:'departure'};const s=deserialize(JSON.stringify(old));assert.ok(s);assert.equal(s.version,3);assert.equal(s.ending,null);assert.equal(s.time,old.time);assert.equal(s.roof.height,old.roof.height);assert.equal(s.facilities.collector,1);assert.equal(s.facilities.garden,1);assert.equal(s.paused,true);assert.equal(s.resources.food,getEconomy(s).capacity.food);assert.ok(s.log.some(x=>x.text.includes('저장 용량')));});
test('malformed save data and impossible claimed roofs are rejected',()=>{assert.equal(deserialize('{'),null);const s=createGame(42);s.buildings[1].claimed=true;assert.equal(deserialize(serialize(s)),null);const t=createGame(42);t.resources.food=Infinity;assert.equal(deserialize(serialize(t)),null);});
test('story is earned by clues and settlement rather than calendar or ending',()=>{const s=createGame(42);s.time=1440*100;assert.equal(getStory(s).chapter,1);assert.equal(EVENTS.some(e=>e.choices.some(c=>c.effects.ending)),false);assert.ok(EVENTS.length>=30);assert.ok(EVENTS.every(e=>e.body.includes('\n\n')));});

// Public actions only. Clues come before a building is made safe, so story plans
// are not stuck behind a deferred reunion. Extra mouths wait for a free bed.
export function runSettlement(seed=42){
 const s=createGame(seed);let steps=0;const finish=new Set();
 const reunion={neighbor_lamp:'yoon',jihye_found:'jihye',sua_found:'sua',minwoo_found:'minwoo',mother_found:'mother'};
 const delay={defer:['stray_dog','district_letter']};
 function settleEvents(){while(s.event){const e=getEvent(s);if(reunion[e.id]&&getEconomy(s).beds<=getEconomy(s).people)resolve(s,{defer:[e.id,'stray_dog','district_letter']});else resolve(s,delay);}}
 function run(id){settleEvents();assert.ok(++steps<4000,'strategy too long');if(s.ending){const econ=getEconomy(s);throw Error(`already dead before ${id} day ${getDay(s)} ${JSON.stringify(s.resources)} ${s.buildings.filter(b=>b.claimed).map(b=>`${b.id} p${b.facilities.power} w${b.facilities.collector} g${b.facilities.garden} r${b.facilities.radio}`).join(' ')} residents ${s.residents.map(r=>`${r.id}:${r.assignment}@${r.buildingId}`).join(',')} food ${econ.food.production.toFixed(2)}/${econ.food.consumption.toFixed(2)} water ${econ.water.production.toFixed(2)}/${econ.water.consumption.toFixed(2)} auto ${econ.automated} beds ${econ.beds}`);}const result=startAction(s,id);if(!result.ok)return false;while(s.action||s.event){if(s.ending)throw Error(`died during ${id}`);if(s.event)settleEvents();else tick(s,1);}return true;}
 function available(id){return getActions(s).some(a=>a.id===id&&!a.disabled);}
 function assign(){for(const r of getResidents(s)){if(r.assignment!=='rest')continue;const jobs=r.id==='jihye'?['water','farm']:r.id==='yoon'?['guard','farm','water']:['farm','water'];for(const b of s.buildings.filter(b=>b.claimed)){if(jobs.some(job=>assignResident(s,r.id,b.id,job).ok))break;}}}
 function searchable(b){return b.unlocked&&(b.pendingZombie||b.searched<b.capacity);}
 function gather(){const pending=s.buildings.find(b=>b.unlocked&&b.pendingZombie);const clue=s.buildings.find(b=>b.unlocked&&!b.clueFound&&b.searched<b.capacity&&!b.pendingZombie);const rest=s.buildings.find(b=>finish.has(b.id)&&b.unlocked&&b.searched<b.capacity&&!b.pendingZombie);const b=pending||clue||rest;if(!b)return false;selectBuilding(s,b.id);if(b.pendingZombie){if(!s.gear.blade&&available('craft_blade'))run('craft_blade');return run('clear_zombies');}return run(s.resources.water<4&&s.resources.food>3?'water':'scavenge');}
 function build(id,b=s.buildings[0]){selectBuilding(s,b.id);return available(id)&&run(id);}
 function upgrade(id,level,roofs){for(const b of roofs){if(b.facilities[id]<level&&build(id,b))return true;}return false;}
 while(!s.flags.settlementChapter&&steps<4000){settleEvents();assign();const econ=getEconomy(s);const roofs=s.buildings.filter(b=>b.claimed).slice(0,2);
  if(s.stats.health<45&&s.resources.medicine>=1){run('heal');continue;}
  if(s.stats.health<35&&s.resources.food>1&&s.resources.water>1){run('rest');continue;}
  if(s.stats.defense<18&&s.resources.parts>=4){run('repair');continue;}
  if(s.resources.food<Math.max(4,econ.food.consumption)||s.resources.water<Math.max(4,econ.water.consumption*.5)){if(gather())continue;}
  if(!s.gear.blade&&s.resources.parts>=2){run('craft_blade');continue;}
  if(!s.gear.rope&&s.resources.parts>=2){run('craft_rope');continue;}
  if(s.facilities.collector<1&&build('collector'))continue;
  if(s.facilities.garden<1&&build('garden'))continue;
  if(s.facilities.beds<1&&build('beds'))continue;
  if(s.facilities.storage<1&&build('storage'))continue;
  let worked=false;
  for(const b of s.buildings){if(!b.unlocked&&s.flags[b.prerequisite]&&s.gear.rope&&s.resources.parts>=3&&s.resources.food>2&&s.resources.water>2){selectBuilding(s,b.id);if(run(`route_${b.id}`)){worked=true;break;}}}if(worked)continue;
  if(econ.food.net<1&&s.flags.cropPlan&&upgrade('garden',2,roofs))continue;
  if(econ.water.net<1&&s.flags.waterPlan&&upgrade('collector',2,roofs))continue;
  if(econ.beds<=econ.people&&s.flags.secondRoof&&upgrade('beds',2,[s.buildings[0]]))continue;
  const cluesReady=s.flags.waterPlan&&s.flags.cropPlan&&s.flags.automationPlan&&s.flags.seedBank;
  if(cluesReady)for(const b of s.buildings)if(b.id!=='home')finish.add(b.id);
  for(const b of s.buildings.filter(b=>b.unlocked&&!b.claimed&&b.searched===b.capacity&&b.zombiesRemaining===0)){selectBuilding(s,b.id);if(run('claim_roof')){worked=true;break;}}if(worked)continue;
  if(gather())continue;
  if(s.flags.friendHome&&s.flags.automationPlan&&roofs.length>=2){if(upgrade('power',2,roofs))continue;if(upgrade('collector',3,roofs))continue;if(s.flags.seedBank&&upgrade('garden',3,roofs))continue;}
  const needParts=roofs.length<2||roofs.some(b=>b.facilities.power<2||b.facilities.collector<3||b.facilities.garden<3);
  if(s.buildings.every(b=>b.claimed)&&needParts){if(!s.buildings.some(b=>b.facilities.radio>=2)&&build('radio'))continue;if(run('route_next')){finish.add(s.buildings[s.buildings.length-1].id);continue;}}
  if(!s.buildings.some(searchable)&&!s.flags.selfSufficient)throw Error(`No gathering left at ${getDay(s)}: ${JSON.stringify(s.resources)} ${s.buildings.map(b=>`${b.id}:${b.searched}/${b.capacity} c${b.claimed} p${b.facilities.power} w${b.facilities.collector} g${b.facilities.garden}`).join(' | ')} flags ${Object.entries(s.flags).filter(([,v])=>v).map(([k])=>k).join(',')} food ${econ.food.net.toFixed(2)} water ${econ.water.net.toFixed(2)} auto ${econ.automated} people ${econ.people} residents ${s.residents.map(r=>r.id).join(',')}`);
  tick(s,60);settleEvents();steps++;
 }
 if(!s.flags.settlementChapter)throw Error(`Not settled ${getDay(s)} ${JSON.stringify(s.resources)} flags${JSON.stringify(Object.keys(s.flags).filter(k=>s.flags[k]))}`);
 return {s,steps};
}
test('earned supplies and choices can reunite the family and reach ongoing automation',()=>{const{s,steps}=runSettlement();assert.equal(s.ending,null);assert.ok(s.flags.familyChapter);assert.ok(s.flags.settlementChapter);assert.ok(s.residents.length>=5);assert.ok(s.buildings.filter(b=>b.claimed).length>=2);assert.ok(s.completedActions>100);assert.ok(s.buildings.every(b=>b.searched<=b.capacity));assert.ok(deserialize(serialize(s)));mkdirSync('artifacts',{recursive:true});writeFileSync('artifacts/settlement-qa.json',serialize(s));console.log(`Earned settlement: day ${getDay(s)}, ${steps} decisions, ${s.completedActions} actions, ${s.residents.length} residents, ${s.buildings.length} buildings.`);});
