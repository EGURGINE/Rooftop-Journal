import test from 'node:test';
import assert from 'node:assert/strict';
import {clampPanelRect, parsePanelLayout} from '../src/panels.js';

test('dragging outside any edge keeps a usable panel below the top controls', () => {
  for(const rect of [
    {x:-500,y:-900,width:300,height:400},
    {x:5000,y:2000,width:300,height:400},
    {x:1100,y:650,width:800,height:1000},
  ]) {
    const result=clampPanelRect(rect,{width:1280,height:720},{minWidth:220,minHeight:200});
    assert.ok(result.x>=12 && result.y>=96);
    assert.ok(result.x+result.width<=1268 && result.y+result.height<=708);
    assert.ok(result.width>=220 && result.height>=200);
  }
});

test('window shrink and tiny windows retain the resize corner instead of clipping panels', () => {
  const saved={x:1320,y:650,width:560,height:400};
  for(const [width,height] of [[800,600],[480,320],[200,140],[10,10],[1,1]]) {
    const rect=clampPanelRect(saved,{width,height},{minWidth:380,minHeight:250});
    assert.ok(rect.x>=0 && rect.y>=0);
    assert.ok(rect.width>0 && rect.height>0);
    assert.ok(rect.x+rect.width<=width && rect.y+rect.height<=height, `${width} × ${height}`);
  }
});

test('a valid saved layout survives parsing and only known finite panel geometry is accepted', () => {
  const valid={x:25.5,y:120,width:440,height:280};
  const parsed=parsePanelLayout(JSON.stringify({version:1,panels:{
    actions:valid,
    survival:{x:15,y:100,width:-2,height:300},
    journal:{x:'30',y:200,width:300,height:150},
    unknown:{x:1,y:2,width:3,height:4},
  }}));
  assert.deepEqual(parsed,{actions:valid});
  assert.deepEqual(parsePanelLayout({version:1,panels:{journal:{...valid,x:Infinity}}}),{});
  assert.deepEqual(parsePanelLayout('{broken'),{});
  assert.deepEqual(parsePanelLayout({version:2,panels:{actions:valid}}),{});
  assert.deepEqual(parsePanelLayout(null),{});
});

test('applying a saved layout on the same viewport is stable and rejects nonfinite geometry', () => {
  const viewport={width:1440,height:900};
  const rect=clampPanelRect({x:880,y:510,width:460,height:290},viewport);
  assert.deepEqual(clampPanelRect(rect,viewport),rect);
  const repaired=clampPanelRect({x:NaN,y:Infinity,width:NaN,height:Infinity},viewport);
  assert.ok(Object.values(repaired).every(Number.isFinite));
  assert.ok(repaired.x>=12 && repaired.y>=96);
});
