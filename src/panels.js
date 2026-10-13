const STORAGE_KEY = 'rooftop-journal-layout-v1';
const PANEL_SPECS = Object.freeze({
  survival: {selector: '.survival-panel', label: '생존 현황', minWidth: 220, minHeight: 250},
  journal: {selector: '.journal', label: '생존 일지', minWidth: 240, minHeight: 140},
  actions: {selector: '.action-dock', label: '행동 패널', minWidth: 380, minHeight: 250},
});
const GEOMETRY_STYLES = ['position', 'left', 'top', 'right', 'bottom', 'width', 'height', 'maxHeight', 'zIndex'];

/** Keep every panel and its handles inside the viewport, even on smaller displays. */
export function clampPanelRect(rect, viewport, minimum = {}) {
  const width = Math.max(1, Number(viewport.width) || 1), height = Math.max(1, Number(viewport.height) || 1);
  const margin = Math.min(12, Math.max(0, (Math.min(width, height) - 1) / 2));
  // Leave the game's persistent top controls accessible; tiny windows keep some usable space.
  const top = Math.min(96, Math.max(margin, height * .28));
  const availableWidth = Math.max(1, width - margin * 2), availableHeight = Math.max(1, height - top - margin);
  const bounded = (value, low, high) => Math.min(high, Math.max(low, Number.isFinite(value) ? value : low));
  const panelWidth = bounded(rect.width, Math.min(minimum.minWidth || 200, availableWidth), availableWidth);
  const panelHeight = bounded(rect.height, Math.min(minimum.minHeight || 140, availableHeight), availableHeight);
  return {
    x: Math.round(bounded(rect.x, margin, width - panelWidth - margin)),
    y: Math.round(bounded(rect.y, top, height - panelHeight - margin)),
    width: Math.round(panelWidth), height: Math.round(panelHeight),
  };
}

/** Read only known panels and finite geometry; storage corruption never changes game data. */
export function parsePanelLayout(raw) {
  try {
    const value = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!value || value.version !== 1 || !value.panels || typeof value.panels !== 'object') return {};
    const panels = {};
    for (const id of Object.keys(PANEL_SPECS)) {
      const rect = value.panels[id];
      if (!rect || !['x', 'y', 'width', 'height'].every(key => typeof rect[key] === 'number' && Number.isFinite(rect[key]) && Math.abs(rect[key]) < 1e6)) continue;
      if (rect.width <= 0 || rect.height <= 0) continue;
      panels[id] = {x: rect.x, y: rect.y, width: rect.width, height: rect.height};
    }
    return panels;
  } catch { return {}; }
}

/** Add dedicated handles without changing the game's controls or save file. */
export function createPanelLayout({onChange} = {}) {
  let stored = {}, disposed = false, resizingFrame = null, drag = null;
  try { stored = parsePanelLayout(localStorage.getItem(STORAGE_KEY)); } catch {}
  const entries = [];
  const removeListeners = [];
  const viewport = () => ({width: window.innerWidth, height: window.innerHeight});
  const listen = (node, type, handler, options) => {
    node.addEventListener(type, handler, options);
    removeListeners.push(() => node.removeEventListener(type, handler, options));
  };
  function restore(entry) {
    for (const property of GEOMETRY_STYLES) entry.element.style[property] = entry.original[property];
    entry.size.style.left = ''; entry.size.style.top = '';
    entry.element.classList.remove('custom-layout', 'panel-layout-changing');
  }
  function announce(entry, mode) {
    const rect = stored[entry.id];
    if (!rect) return;
    entry.status.textContent = mode === 'resize'
      ? `${entry.spec.label} 크기 ${rect.width} × ${rect.height}`
      : `${entry.spec.label} 위치 왼쪽 ${rect.x}, 위쪽 ${rect.y}`;
  }
  function persist() {
    const snapshot = {version: 1, panels: {...stored}};
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot)); } catch {}
    onChange?.(snapshot);
  }
  function activate(entry) {
    for (const other of entries) other.element.style.zIndex = other === entry ? '18' : '12';
  }
  function apply(entry, proposed) {
    const rect = clampPanelRect(proposed, viewport(), entry.spec);
    stored[entry.id] = rect;
    const style = entry.element.style;
    entry.element.classList.add('custom-layout');
    style.position = 'fixed'; style.left = `${rect.x}px`; style.top = `${rect.y}px`;
    style.right = 'auto'; style.bottom = 'auto';
    style.width = `${rect.width}px`; style.height = `${rect.height}px`; style.maxHeight = 'none';
    // A fixed resize handle stays available while this panel's contents scroll.
    entry.size.style.left = `${rect.x + rect.width - 25}px`; entry.size.style.top = `${rect.y + rect.height - 25}px`;
    return rect;
  }
  function measure(entry) {
    const rect = entry.element.getBoundingClientRect();
    return {x: rect.left, y: rect.top, width: rect.width, height: rect.height};
  }
  function endDrag(cancelled = false) {
    if (!drag) return;
    const active = drag; drag = null;
    active.entry.element.classList.remove('panel-layout-changing');
    document.body.classList.remove('panel-layout-dragging');
    if (active.handle.hasPointerCapture?.(active.pointerId)) active.handle.releasePointerCapture(active.pointerId);
    // A cancelled pointer still keeps its last visible, valid position.
    announce(active.entry, active.mode); persist();
  }
  function startDrag(event, entry, mode, handle) {
    if (disposed || event.button !== 0 || !entry.element.getClientRects().length) return;
    event.preventDefault(); event.stopPropagation();
    endDrag(true); activate(entry);
    const rect = apply(entry, measure(entry));
    drag = {entry, mode, handle, pointerId: event.pointerId, x: event.clientX, y: event.clientY, rect};
    entry.element.classList.add('panel-layout-changing');
    document.body.classList.add('panel-layout-dragging');
    handle.focus({preventScroll: true});
    handle.setPointerCapture?.(event.pointerId);
  }
  function move(event) {
    if (!drag || event.pointerId !== drag.pointerId) return;
    event.preventDefault(); event.stopPropagation();
    const dx = event.clientX - drag.x, dy = event.clientY - drag.y, rect = drag.rect;
    apply(drag.entry, drag.mode === 'resize'
      ? {...rect, width: rect.width + dx, height: rect.height + dy}
      : {...rect, x: rect.x + dx, y: rect.y + dy});
  }
  function keyboard(event, entry, mode) {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
    event.preventDefault(); event.stopPropagation(); activate(entry);
    const rect = measure(entry), step = event.shiftKey ? 10 : 2;
    const horizontal = event.key === 'ArrowLeft' ? -step : event.key === 'ArrowRight' ? step : 0;
    const vertical = event.key === 'ArrowUp' ? -step : event.key === 'ArrowDown' ? step : 0;
    apply(entry, mode === 'resize'
      ? {...rect, width: rect.width + horizontal, height: rect.height + vertical}
      : {...rect, x: rect.x + horizontal, y: rect.y + vertical});
    announce(entry, mode); persist();
  }
  for (const [id, spec] of Object.entries(PANEL_SPECS)) {
    const element = document.querySelector(spec.selector);
    if (!element) continue;
    const toolbar = document.createElement('div'); toolbar.className = 'panel-layout-toolbar';
    const handle = document.createElement('button'); handle.type = 'button'; handle.className = 'panel-layout-move';
    handle.innerHTML = '<span class="panel-layout-dots" aria-hidden="true">⠿</span><span>이동</span>';
    handle.title = `${spec.label} 이동 · 드래그 또는 방향키 · Shift + 방향키 10px`;
    handle.setAttribute('aria-label', `${spec.label} 이동. 방향키로 이동, Shift와 함께 누르면 10픽셀 이동합니다.`);
    const size = document.createElement('button'); size.type = 'button'; size.className = 'panel-layout-resize';
    size.innerHTML = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 13 13 4M8 13l5-5M12 13l1-1"/></svg>';
    size.title = `${spec.label} 크기 조절 · 드래그 또는 방향키 · Shift + 방향키 10px`;
    size.setAttribute('aria-label', `${spec.label} 크기 조절. 좌우 방향키로 너비, 위아래 방향키로 높이, Shift와 함께 누르면 10픽셀 조절합니다.`);
    const status = document.createElement('span'); status.className = 'panel-layout-status'; status.setAttribute('role', 'status');
    toolbar.append(handle, status); element.prepend(toolbar); element.append(size);
    element.classList.add('layout-panel');
    const original = Object.fromEntries(GEOMETRY_STYLES.map(property => [property, element.style[property]]));
    const entry = {id, spec, element, toolbar, handle, size, status, original}; entries.push(entry);
    for (const [control, mode] of [[handle, 'move'], [size, 'resize']]) {
      listen(control, 'pointerdown', event => startDrag(event, entry, mode, control));
      listen(control, 'pointermove', move);
      listen(control, 'pointerup', event => { if (drag?.pointerId === event.pointerId) { event.stopPropagation(); endDrag(); } });
      listen(control, 'pointercancel', () => endDrag(true));
      listen(control, 'lostpointercapture', () => endDrag(true));
      listen(control, 'keydown', event => keyboard(event, entry, mode));
      listen(control, 'click', event => { event.preventDefault(); event.stopPropagation(); });
    }
    listen(element, 'pointerdown', event => { activate(entry); event.stopPropagation(); });
    listen(element, 'focusin', () => activate(entry));
  }
  function refresh() {
    if (disposed) return;
    let changed = false;
    for (const entry of entries) {
      if (!stored[entry.id] || !entry.element.getClientRects().length) continue;
      const before = JSON.stringify(stored[entry.id]); apply(entry, stored[entry.id]);
      if (before !== JSON.stringify(stored[entry.id])) changed = true;
    }
    if (changed) persist();
  }
  listen(window, 'resize', () => {
    if (resizingFrame !== null) cancelAnimationFrame(resizingFrame);
    resizingFrame = requestAnimationFrame(() => { resizingFrame = null; refresh(); });
  });
  listen(window, 'blur', () => endDrag(true));
  refresh();
  return {
    refresh,
    reset() {
      if (disposed) return;
      endDrag(true); stored = {};
      for (const entry of entries) { restore(entry); entry.status.textContent = ''; }
      try { localStorage.removeItem(STORAGE_KEY); } catch {}
      onChange?.({version: 1, panels: {}});
    },
    dispose() {
      if (disposed) return;
      endDrag(true); disposed = true;
      if (resizingFrame !== null) cancelAnimationFrame(resizingFrame);
      removeListeners.forEach(remove => remove());
      for (const entry of entries) {
        restore(entry); entry.element.classList.remove('layout-panel'); entry.toolbar.remove(); entry.size.remove();
      }
    },
  };
}
