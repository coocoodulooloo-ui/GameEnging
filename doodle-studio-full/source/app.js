// =====================================================================
//  DOODLE STUDIO — the editor app
// =====================================================================
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[c]));
const deep = o => JSON.parse(JSON.stringify(o));
const typingInField = () => { const t = document.activeElement && document.activeElement.tagName; return t === 'TEXTAREA' || t === 'INPUT' || t === 'SELECT'; };

function toast(msg, kind = '') {
  const t = document.createElement('div'); t.className = 'toast ' + kind; t.textContent = msg;
  $('#toasts').appendChild(t);
  setTimeout(() => { t.style.transition = 'opacity .3s'; t.style.opacity = 0; setTimeout(() => t.remove(), 300); }, 2400);
}

// ---------------- theme ----------------
function setTheme(t) {
  document.documentElement.dataset.theme = t;
  $('#themeBtn').textContent = t === 'dark' ? '🌙' : '☀️';
  try { localStorage.setItem('doodle-theme', t); } catch (e) {}
}
$('#themeBtn').onclick = () => setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');

// ---------------- project ----------------
const STORE_KEY = 'doodle-studio-v2';
function fixProject(p) {
  p.width = +p.width || 600; p.height = +p.height || 400; p.bg = p.bg || '#ffffff';
  p.costumes = p.costumes || {}; p.backdrop = p.backdrop || null;
  p.objects = (p.objects || []).map(o => ({ visible:1, text:'', angle:0, alpha:1, physics:0, solid:0, flip:0, hud:0, costume:'', ...o }));
  p.code = typeof p.code === 'string' ? p.code : '';
  return p;
}
let project;
try { project = JSON.parse(localStorage.getItem(STORE_KEY)); } catch (e) {}
if (!project) { try { const old = JSON.parse(localStorage.getItem('doodle-studio-project')); if (old && Array.isArray(old.objects)) project = old; } catch (e) {} }
if (!project || !Array.isArray(project.objects)) project = EXAMPLES[0].make();
project = fixProject(project);
let saveTimer, warnedQuota = false;
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(project)); }
    catch (e) { if (!warnedQuota) { warnedQuota = true; toast('⚠️ Your project is too big to auto-save. Use File → Save to file.', 'bad'); } }
  }, 400);
}

// ---------------- design undo history ----------------
const hist = { stack:[], i:-1 };
const snapState = () => JSON.stringify({ width:project.width, height:project.height, bg:project.bg, backdrop:project.backdrop, objects:project.objects });
function resetHistory() { hist.stack = [snapState()]; hist.i = 0; }
function commit() {
  const s = snapState();
  if (hist.stack[hist.i] !== s) {
    hist.stack = hist.stack.slice(0, hist.i + 1); hist.stack.push(s);
    if (hist.stack.length > 80) hist.stack.shift();
    hist.i = hist.stack.length - 1;
  }
  save();
}
function restoreState(s) { Object.assign(project, JSON.parse(s)); if (!selObj()) selected = null; loadStageSettings(); refreshDesign(); save(); }
function undoDesign() { if (hist.i <= 0) return toast('Nothing to undo'); hist.i--; restoreState(hist.stack[hist.i]); }
function redoDesign() { if (hist.i >= hist.stack.length - 1) return toast('Nothing to redo'); hist.i++; restoreState(hist.stack[hist.i]); }
$('#undoBtn').onclick = undoDesign; $('#redoBtn').onclick = redoDesign;

// ---------------- stage & engine ----------------
const stage = $('#stage'), sctx = stage.getContext('2d');
let playing = false, tab = 'design', selected = null, drag = null, errLine = 0;
const engine = new Engine(stage, {
  onPrint: msg => log(msg),
  onError: e => {
    log((e.line ? `Line ${e.line}: ` : '') + e.message, 'err', e.line);
    if (e.line) { errLine = e.line; paintEditor(); }
    updatePlayUI();
  },
});
attachInput(engine, stage, () => playing && (tab === 'design' || tab === 'code'));
setImageHook(() => { if (!playing) renderDesign(); });

function log(msg, cls, line) {
  const box = $('#console'), d = document.createElement('div');
  d.textContent = msg; if (cls) d.className = cls;
  if (line) { d.title = 'Click to jump to this line'; d.onclick = () => { switchTab('code'); jumpToLine(line); }; }
  box.appendChild(d);
  while (box.children.length > 400) box.firstChild.remove();
  box.scrollTop = box.scrollHeight;
}
$('#clearCon').onclick = () => { $('#console').innerHTML = ''; };

function play() {
  if (tab !== 'design' && tab !== 'code') switchTab('design');
  engine.stop();
  $('#console').innerHTML = '';
  errLine = 0; paintEditor();
  log('▶ Starting game…', 'sys');
  playing = true;
  engine.load(project.code, project);
  engine.start();
  if (engine.parseFailed) playing = false;
  updatePlayUI();
  stage.focus();
}
function stopGame() { engine.stop(); playing = false; updatePlayUI(); renderDesign(); }
function updatePlayUI() {
  const b = $('#playBtn'), live = playing && engine.running;
  b.textContent = playing ? '■ Stop' : '▶ Play';
  b.classList.toggle('stop', playing);
  stage.classList.toggle('playing', playing);
  const st = $('#status');
  st.classList.toggle('live', live);
  st.innerHTML = '<span class="dot"></span><span>' + (playing
    ? (live ? '<b>Playing.</b> Use your keyboard and mouse on the stage. Press <kbd>Stop</kbd> to edit again.' : '<b>Stopped.</b> Press <kbd>Stop</kbd> to go back to editing.')
    : tab === 'code'
      ? '<b>Code.</b> Type your game, then press Play or <kbd>Ctrl</kbd>+<kbd>Enter</kbd>.'
      : '<b>Design.</b> Drag to move, drag the corner to resize. <kbd>Del</kbd> deletes, <kbd>Ctrl</kbd>+<kbd>D</kbd> duplicates.') + '</span>';
}
$('#playBtn').onclick = () => playing ? stopGame() : play();
$('#fsBtn').onclick = () => {
  if (document.fullscreenElement) document.exitFullscreen();
  else { const r = $('#stagebox').requestFullscreen && $('#stagebox').requestFullscreen(); if (r) r.then(() => stage.focus()).catch(() => {}); }
};

// ---------------- design editor ----------------
const KIND_ICON = { rect:'⬛', circle:'⚫', star:'⭐', triangle:'🔺', text:'🔤', sprite:'🖼️' };
const DEFAULTS = {
  rect:{ w:80, h:60, color:'#4b7bec' }, circle:{ w:60, h:60, color:'#fd9644' }, star:{ w:60, h:60, color:'#fed330' },
  triangle:{ w:70, h:60, color:'#26de81' }, text:{ w:90, h:28, color:'#1e272e', text:'Hello' }, sprite:{ w:64, h:64, color:'#888888' },
};
const NAME_BASE = { rect:'box', circle:'ball', star:'star', triangle:'spike', text:'label', sprite:'sprite' };
const selObj = () => project.objects.find(o => o.name === selected);
const snapOn = () => $('#snap').checked;
const snap = v => snapOn() ? Math.round(v / 10) * 10 : Math.round(v);
const safeName = s => (String(s).replace(/[^A-Za-z0-9_]/g, '') || 'thing').replace(/^(\d)/, '_$1');

function uniqueName(base, plainOk) {
  if (plainOk && !project.objects.some(o => o.name === base)) return base;
  let n = 1; while (project.objects.some(o => o.name === base + n)) n++;
  return base + n;
}
function costumeNames() { return Object.keys(project.costumes).filter(n => n !== project.backdrop); }
function fitSprite(o) {
  const img = costumeImage(project.costumes, o.costume);
  const w = img ? img.naturalWidth : 64, h = img ? img.naturalHeight : 64, m = Math.max(w, h);
  const s = m < 40 ? Math.max(1, Math.round(56 / m)) : m > 200 ? 160 / m : 1;
  o.w = Math.round(w * s); o.h = Math.round(h * s);
}
function addObject(kind, costume) {
  if (playing) stopGame();
  const d = DEFAULTS[kind];
  const o = { name:'', kind, x:0, y:0, w:d.w, h:d.h, color:d.color, text:d.text || '', visible:1, angle:0, alpha:1, physics:0, solid:0, flip:0, hud:0, costume:'' };
  if (kind === 'sprite') {
    const c = costume || costumeNames()[0];
    if (!c) { toast('🖌️ Paint a costume first, then add it as a sprite!'); switchTab('paint'); return; }
    o.costume = c; fitSprite(o); o.name = uniqueName(safeName(c), true);
  } else o.name = uniqueName(NAME_BASE[kind]);
  o.x = snap(project.width / 2 - o.w / 2); o.y = snap(project.height / 2 - o.h / 2);
  project.objects.push(o); selected = o.name;
  if (tab !== 'design') switchTab('design');
  refreshDesign(); commit();
  toast(`Added "${o.name}"`, 'ok');
}
$$('[data-add]').forEach(b => b.onclick = () => addObject(b.dataset.add));

function renderDesign() {
  if (playing) return;
  const P = project, W = P.width, H = P.height;
  if (stage.width !== W) stage.width = W;
  if (stage.height !== H) stage.height = H;
  const c = sctx;
  c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1;
  c.fillStyle = P.bg; c.fillRect(0, 0, W, H);
  if (P.backdrop) { const img = costumeImage(P.costumes, P.backdrop); if (img) { c.imageSmoothingEnabled = false; c.drawImage(img, 0, 0, W, H); } }
  if (snapOn() && tab === 'design') {
    c.fillStyle = 'rgba(0,0,0,.14)';
    for (let x = 0; x <= W; x += 20) for (let y = 0; y <= H; y += 20) c.fillRect(x, y, 1.5, 1.5);
  }
  for (const o of P.objects) drawObject(c, o, true, P.costumes);
  const o = selObj();
  if (o && tab === 'design') {
    c.save();
    c.setLineDash([6, 4]); c.strokeStyle = '#8b5cf6'; c.lineWidth = 2;
    c.strokeRect(o.x - 3, o.y - 3, o.w + 6, o.h + 6);
    c.setLineDash([]); c.fillStyle = '#fff'; c.strokeStyle = '#8b5cf6';
    c.fillRect(o.x + o.w - 6, o.y + o.h - 6, 12, 12); c.strokeRect(o.x + o.w - 6, o.y + o.h - 6, 12, 12);
    const tags = [o.name, truthy(o.physics) ? '⬇ physics' : '', truthy(o.solid) ? '▦ solid' : '', truthy(o.hud) ? '📌 hud' : ''].filter(Boolean).join('  ');
    c.font = '600 12px system-ui, sans-serif'; c.textBaseline = 'middle';
    const tw = c.measureText(tags).width, ty = o.y - 18 < 0 ? o.y + o.h + 16 : o.y - 16;
    c.fillStyle = '#8b5cf6'; c.beginPath(); c.roundRect ? c.roundRect(o.x - 3, ty - 10, tw + 12, 20, 6) : c.rect(o.x - 3, ty - 10, tw + 12, 20); c.fill();
    c.fillStyle = '#fff'; c.fillText(tags, o.x + 3, ty);
    c.restore();
  }
}
function refreshDesign() { renderDesign(); renderProps(); renderLayers(); renderChips(); }

function renderLayers() {
  const ul = $('#layers');
  $('#objCount').textContent = project.objects.length;
  ul.innerHTML = project.objects.length ? '' : '<li class="empty">No objects yet — add one above.</li>';
  [...project.objects].reverse().forEach(o => {
    const li = document.createElement('li');
    const icon = o.kind === 'sprite' && project.costumes[o.costume] ? `<img src="${project.costumes[o.costume]}" alt="">` : `<span>${KIND_ICON[o.kind] || '⬛'}</span>`;
    li.innerHTML = `${icon}<span class="nm">${esc(o.name)}</span>${truthy(o.physics) ? '<span class="tag">physics</span>' : ''}${truthy(o.solid) ? '<span class="tag">solid</span>' : ''}${o.ctrl ? '<span class="tag">🎮 keys</span>' : ''}<button class="eye" title="Show / hide">${truthy(o.visible) ? '👁' : '🚫'}</button>`;
    if (o.name === selected) li.className = 'sel';
    li.onclick = e => {
      if (e.target.classList.contains('eye')) { o.visible = truthy(o.visible) ? 0 : 1; refreshDesign(); commit(); return; }
      selected = o.name; refreshDesign();
    };
    ul.appendChild(li);
  });
}

function renderProps() {
  const box = $('#props'), o = selObj();
  if (!o) { box.innerHTML = '<div class="empty">Click an object on the stage to edit it,<br>or add a new one above.</div>'; return; }
  const isText = o.kind === 'text', isSprite = o.kind === 'sprite';
  const costumeOpts = costumeNames().map(n => `<option ${n === o.costume ? 'selected' : ''}>${esc(n)}</option>`).join('');
  box.innerHTML = `
    <label>Name — use it in your code <input id="p-name" value="${esc(o.name)}"></label>
    <div class="row4">
      <label>x <input type="number" id="p-x"></label>
      <label>y <input type="number" id="p-y"></label>
      ${isText ? '<label>size <input type="number" id="p-h" min="4"></label><label>angle <input type="number" id="p-angle"></label>'
               : '<label>width <input type="number" id="p-w" min="1"></label><label>height <input type="number" id="p-h" min="1"></label>'}
    </div>
    <div class="row2">
      ${isText ? '' : '<label>angle ° <input type="number" id="p-angle"></label>'}
      <label>opacity <input type="range" id="p-alpha" min="0" max="1" step="0.05"></label>
      ${isText ? '<label>color <input type="color" id="p-color"></label>' : ''}
    </div>
    ${isSprite ? `<label>Costume <select id="p-costume">${costumeOpts}</select></label>` : isText ? '<label>Text <input id="p-text"></label>' : '<label>Color <input type="color" id="p-color"></label>'}
    <div class="checks">
      <label class="check" title="Show this object when the game starts"><input type="checkbox" id="p-visible"> Visible</label>
      <label class="check" title="Falls with gravity and lands on solid things"><input type="checkbox" id="p-physics"> Physics</label>
      <label class="check" title="Physics objects can stand on it"><input type="checkbox" id="p-solid"> Solid</label>
      <label class="check" title="Mirror left/right"><input type="checkbox" id="p-flip"> Flip</label>
      <label class="check" title="Stays put on the screen even when the camera moves (good for scores)"><input type="checkbox" id="p-hud"> Stay on screen</label>
    </div>
    <div class="ctrlbox">
      <label>🎮 Move it with keys
        <select id="p-ctrl">
          <option value="">No keys</option><option value="arrows">Arrow keys  ↑ ← ↓ →</option><option value="wasd">W A S D</option>
          <option value="ijkl">I J K L</option><option value="custom">Pick my own keys…</option>
        </select>
      </label>
      <div id="p-ctrl-more">
        <div class="keypick" id="p-keys">
          <label>up<input data-k="0" readonly placeholder="press"></label><label>left<input data-k="1" readonly placeholder="press"></label>
          <label>down<input data-k="2" readonly placeholder="press"></label><label>right<input data-k="3" readonly placeholder="press"></label>
        </div>
        <div class="row2">
          <label>how it moves <select id="p-style"><option value="move">Walk around</option><option value="platform">Run &amp; jump</option><option value="drive">Turn &amp; drive</option></select></label>
          <label>speed <input type="number" id="p-speed" min="1" max="30"></label>
        </div>
      </div>
      <div class="row2">
        <label>⚡ Action key <input id="p-actkey" readonly placeholder="click, then press a key"></label>
        <label>does <select id="p-act">
          <option value="">nothing</option><option value="jump">Jump</option><option value="shoot">Shoot</option><option value="spin">Spin</option>
          <option value="sparkle">Sparkle</option><option value="grow">Grow</option><option value="shrink">Shrink</option><option value="color">New color</option>
          <option value="hide">Hide / show</option><option value="coin">Sound: coin</option><option value="boing">Sound: boing</option><option value="magic">Sound: magic</option>
        </select></label>
      </div>
      <p class="hint" id="p-ctrl-code"></p>
    </div>
    <div class="btnrow">
      <button id="p-dup">⧉ Duplicate</button><button id="p-front">⤒ Front</button>
      <button id="p-back">⤓ Back</button><button id="p-del" class="danger">🗑 Delete</button>
      ${isSprite ? '<button id="p-paint">🖌️ Paint it</button><button id="p-fit">↺ Real size</button>' : ''}
    </div>
    <p class="hint">In code: <code>@${esc(o.name)}.x</code> <code>@${esc(o.name)}.angle</code> <code>@${esc(o.name)}.vx</code>${isText ? ` <code>@${esc(o.name)}.text</code>` : ''}${isSprite ? ` <code>@${esc(o.name)}.costume</code>` : ''} <code>@${esc(o.name)} touches @…</code></p>`;
  syncProps();
  wireControls(o);
  const num = (id, key) => { const el = $(id); if (!el) return; el.oninput = () => { const v = parseFloat(el.value); if (!isNaN(v)) { o[key] = v; renderDesign(); } }; el.onchange = commit; };
  num('#p-x', 'x'); num('#p-y', 'y'); num('#p-w', 'w'); num('#p-h', 'h'); num('#p-angle', 'angle'); num('#p-alpha', 'alpha');
  const col = $('#p-color'); if (col) { col.oninput = e => { o.color = e.target.value; renderDesign(); }; col.onchange = () => { commit(); renderLayers(); }; }
  const txt = $('#p-text'); if (txt) { txt.oninput = e => { o.text = e.target.value; renderDesign(); }; txt.onchange = commit; }
  const cos = $('#p-costume'); if (cos) cos.onchange = e => { o.costume = e.target.value; refreshDesign(); commit(); };
  ['visible', 'physics', 'solid', 'flip', 'hud'].forEach(k => { $('#p-' + k).onchange = e => { o[k] = e.target.checked ? 1 : 0; refreshDesign(); commit(); }; });
  $('#p-name').onchange = e => {
    const v = e.target.value.trim();
    if (/^(mouse|stage|camera)$/i.test(v)) { toast(`"${v}" is a built-in Doodle name — pick another.`, 'bad'); e.target.value = o.name; return; }
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(v)) { toast('Names start with a letter and use only letters, numbers and _ (no spaces).', 'bad'); e.target.value = o.name; return; }
    if (v !== o.name && project.objects.some(q => q.name === v)) { toast(`There's already an object called "${v}".`, 'bad'); e.target.value = o.name; return; }
    const old = o.name; o.name = v; selected = v;
    const re = new RegExp(`@${old}\\b`, 'g');
    if (re.test(project.code) && confirm(`Also rename "@${old}" to "@${v}" in your code?`)) { project.code = project.code.replace(re, '@' + v); loadEditor(); }
    refreshDesign(); commit();
  };
  $('#p-dup').onclick = duplicateSelected;
  $('#p-front').onclick = () => { project.objects = project.objects.filter(q => q !== o).concat(o); refreshDesign(); commit(); };
  $('#p-back').onclick = () => { project.objects = [o].concat(project.objects.filter(q => q !== o)); refreshDesign(); commit(); };
  $('#p-del').onclick = deleteSelected;
  if (isSprite) {
    $('#p-paint').onclick = () => { switchTab('paint'); if (project.costumes[o.costume]) loadCostume(o.costume); };
    $('#p-fit').onclick = () => { fitSprite(o); refreshDesign(); commit(); };
  }
}
const KEY_LABEL = k => ({ up:'↑', down:'↓', left:'←', right:'→', space:'space' }[k] || k.toUpperCase());
function ctrlCode(o) {
  const name = '@' + o.name, lines = [];
  if (o.ctrl) {
    const set = o.ctrl === 'custom' ? ctrlKeys(o).join('') : o.ctrl;
    lines.push(`controls ${name}, "${o.ctrl === 'custom' && ctrlKeys(o).some(k => k.length > 1) ? ctrlKeys(o).join(',') : set}", ${o.ctrlSpeed || 4}${o.ctrlStyle && o.ctrlStyle !== 'move' ? `, "${o.ctrlStyle}"` : ''}`);
  }
  if (o.actKey && o.act) lines.push(`action ${name}, "${o.actKey}", "${o.act}"`);
  return lines;
}
function wireControls(o) {
  const show = () => {
    $('#p-ctrl').value = o.ctrl || '';
    $('#p-ctrl-more').style.display = o.ctrl ? '' : 'none';
    $('#p-keys').style.display = o.ctrl === 'custom' ? '' : 'none';
    const k = o.ctrl ? ctrlKeys(o) : [];
    $$('#p-keys input').forEach((el, i) => { el.value = k[i] ? KEY_LABEL(k[i]) : ''; });
    $('#p-style').value = o.ctrlStyle || 'move'; $('#p-speed').value = o.ctrlSpeed || 4;
    $('#p-actkey').value = o.actKey ? KEY_LABEL(o.actKey) : ''; $('#p-act').value = o.act || '';
    const code = ctrlCode(o);
    $('#p-ctrl-code').innerHTML = code.length ? 'Same thing in code: ' + code.map(c => `<code>${esc(c)}</code>`).join(' ') : 'Pick keys to move it — no code needed!';
  };
  const changed = () => { show(); renderLayers(); commit(); };
  $('#p-ctrl').onchange = e => {
    o.ctrl = e.target.value;
    if (o.ctrl === 'custom' && !o.ctrlKeys) o.ctrlKeys = 't,f,g,h';
    if (o.ctrl && !o.ctrlSpeed) o.ctrlSpeed = 4;
    changed();
  };
  $('#p-style').onchange = e => {
    o.ctrlStyle = e.target.value;
    if (o.ctrlStyle === 'platform' && !truthy(o.physics)) { o.physics = 1; syncProps(); toast('Physics turned on so it can jump. Tick "Solid" on the ground so it can land!'); }
    changed();
  };
  $('#p-speed').onchange = e => { o.ctrlSpeed = Math.max(1, Math.min(30, +e.target.value || 4)); changed(); };
  $('#p-act').onchange = e => { o.act = e.target.value; if (o.act && !o.actKey) o.actKey = 'space'; changed(); };
  const grabKey = (el, setKey) => {
    el.onfocus = () => { el.dataset.was = el.value; el.value = 'press a key…'; };
    el.onblur = () => { if (el.value === 'press a key…') el.value = el.dataset.was || ''; };
    el.onkeydown = e => {
      if (e.key === 'Tab') return;
      e.preventDefault(); e.stopPropagation();
      if (e.key === 'Escape' || e.key === 'Backspace' || e.key === 'Delete') { el.blur(); return; }
      setKey(normKey(e.key)); el.blur(); changed();
    };
  };
  $$('#p-keys input').forEach(el => grabKey(el, k => {
    const keys = ctrlKeys({ ctrl:'custom', ctrlKeys:o.ctrlKeys || 'w,a,s,d' });
    keys[+el.dataset.k] = k; o.ctrlKeys = keys.join(',');
  }));
  grabKey($('#p-actkey'), k => { o.actKey = k; if (!o.act) o.act = 'jump'; });
  show();
}
function syncProps() {
  const o = selObj(); if (!o) return;
  const set = (id, v) => { const el = $(id); if (el && document.activeElement !== el) el.value = v; };
  set('#p-x', Math.round(o.x)); set('#p-y', Math.round(o.y)); set('#p-w', Math.round(o.w)); set('#p-h', Math.round(o.h));
  set('#p-angle', Math.round(+o.angle || 0)); set('#p-alpha', o.alpha ?? 1);
  set('#p-color', /^#[0-9a-f]{6}$/i.test(o.color) ? o.color : '#888888'); set('#p-text', o.text || '');
  ['visible', 'physics', 'solid', 'flip', 'hud'].forEach(k => { const el = $('#p-' + k); if (el) el.checked = truthy(o[k]); });
}
function duplicateSelected() {
  const o = selObj(); if (!o) return;
  const c = { ...deep(o), name:uniqueName(o.name.replace(/\d+$/, '')), x:o.x + 20, y:o.y + 20 };
  project.objects.push(c); selected = c.name; refreshDesign(); commit();
}
function deleteSelected() {
  if (!selObj()) return;
  project.objects = project.objects.filter(q => q.name !== selected); selected = null;
  refreshDesign(); commit();
}

// stage mouse: select, drag, resize
const nearHandle = (p, o) => { const tol = 10 * stage.width / stage.getBoundingClientRect().width; return o && Math.abs(p.x - (o.x + o.w)) < tol && Math.abs(p.y - (o.y + o.h)) < tol; };
stage.addEventListener('pointerdown', e => {
  if (playing) return;
  if (tab !== 'design') switchTab('design');
  const p = canvasPoint(stage, e), o = selObj();
  if (nearHandle(p, o)) drag = { mode:'resize', o, moved:false };
  else {
    const hit = [...project.objects].reverse().find(q => pointIn(p, q));
    selected = hit ? hit.name : null;
    drag = hit ? { mode:'move', o:hit, dx:p.x - hit.x, dy:p.y - hit.y, moved:false } : null;
    renderProps(); renderLayers();
  }
  if (drag) stage.setPointerCapture(e.pointerId);
  renderDesign();
});
stage.addEventListener('pointermove', e => {
  if (playing) { stage.style.cursor = 'default'; return; }
  const p = canvasPoint(stage, e);
  if (!drag) {
    stage.style.cursor = nearHandle(p, selObj()) ? 'nwse-resize' : project.objects.some(q => pointIn(p, q)) ? 'move' : 'default';
    return;
  }
  const o = drag.o; drag.moved = true;
  if (drag.mode === 'move') { o.x = snap(p.x - drag.dx); o.y = snap(p.y - drag.dy); }
  else if (o.kind === 'text') o.h = Math.max(8, snap(p.y - o.y));
  else if (e.shiftKey && o.w && o.h) { const r = o.w / o.h; o.w = Math.max(5, snap(p.x - o.x)); o.h = Math.max(5, Math.round(o.w / r)); }
  else { o.w = Math.max(5, snap(p.x - o.x)); o.h = Math.max(5, snap(p.y - o.y)); }
  renderDesign(); syncProps();
});
stage.addEventListener('pointerup', () => { if (drag) { if (drag.moved) commit(); drag = null; } });

// global keyboard shortcuts
window.addEventListener('keydown', e => {
  const ctrl = e.ctrlKey || e.metaKey, k = e.key.toLowerCase();
  if (ctrl && k === 'enter') { e.preventDefault(); playing ? stopGame() : play(); return; }
  if (ctrl && k === 's') { e.preventDefault(); saveToFile(); return; }
  if (typingInField() || playing) return;
  if (tab === 'design') {
    if (ctrl && k === 'z') { e.preventDefault(); e.shiftKey ? redoDesign() : undoDesign(); return; }
    if (ctrl && k === 'y') { e.preventDefault(); redoDesign(); return; }
    const o = selObj(); if (!o) return;
    if (ctrl && k === 'd') { e.preventDefault(); duplicateSelected(); return; }
    if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); deleteSelected(); return; }
    const d = e.shiftKey ? 10 : 1;
    const mv = { arrowleft:[-d, 0], arrowright:[d, 0], arrowup:[0, -d], arrowdown:[0, d] }[k];
    if (mv) { e.preventDefault(); o.x += mv[0]; o.y += mv[1]; renderDesign(); syncProps(); commit(); }
  } else if (tab === 'paint') paintKey(e, ctrl, k);
  else if (tab === 'learn' && k === ' ') { e.preventDefault(); toggleVideo(); }
});

// stage settings
function loadStageSettings() {
  $('#st-w').value = project.width; $('#st-h').value = project.height;
  $('#st-bg').value = /^#[0-9a-f]{6}$/i.test(project.bg) ? project.bg : '#ffffff';
  const sel = $('#st-backdrop');
  sel.innerHTML = '<option value="">— none —</option>' + Object.keys(project.costumes).map(n => `<option ${n === project.backdrop ? 'selected' : ''}>${esc(n)}</option>`).join('');
}
$('#st-w').onchange = e => { project.width = Math.max(100, Math.min(2000, +e.target.value || 600)); renderDesign(); commit(); };
$('#st-h').onchange = e => { project.height = Math.max(100, Math.min(2000, +e.target.value || 400)); renderDesign(); commit(); };
$('#st-bg').oninput = e => { project.bg = e.target.value; renderDesign(); };
$('#st-bg').onchange = commit;
$('#st-backdrop').onchange = e => { project.backdrop = e.target.value || null; renderDesign(); commit(); };
$('#snap').onchange = renderDesign;

// ---------------- code editor ----------------
const EVENT_WORDS = new Set(DOODLE_WORDS.events);
const CONTROL_WORDS = new Set([...DOODLE_WORDS.control, ...Object.keys(ALIASES), 'let', 'set', 'else', 'end', 'repeat', 'for', 'on', 'frame', 'after', 'function', 'call', 'clone', 'break']);
const KEYWORDS = new Set([...COMMANDS, ...DOODLE_WORDS.control, ...DOODLE_WORDS.events]);
function hl(src) {
  const re = /(~.*$|\/\/.*$)|("[^"]*"?|'[^']*'?)|(#[0-9a-fA-F]{3,8}\b)|(\b\d+(?:\.\d+)?s?\b)|(@[A-Za-z_][\w.]*)|(->)|([A-Za-z_][\w.]*)/g;
  let out = '', last = 0, m;
  while ((m = re.exec(src))) {
    out += esc(src.slice(last, m.index));
    if (m[1]) out += `<span class="t-com">${esc(m[1])}</span>`;
    else if (m[2] || m[3]) out += `<span class="t-str">${esc(m[0])}</span>`;
    else if (m[4]) out += `<span class="t-num">${m[4]}</span>`;
    else if (m[5]) out += `<span class="t-obj">${esc(m[5])}</span>`;
    else if (m[6]) out += `<span class="t-ev">-&gt;</span>`;
    else {
      const w = m[7], lw = w.toLowerCase();
      if (EVENT_WORDS.has(lw)) out += `<span class="t-ev">${esc(w)}</span>`;
      else if (KEYWORDS.has(lw) || CONTROL_WORDS.has(lw)) out += `<span class="t-kw">${esc(w)}</span>`;
      else if (FUNCS[lw] && src[re.lastIndex] === '(') out += `<span class="t-fn">${esc(w)}</span>`;
      else if (BUILTINS[lw]) out += `<span class="t-num">${esc(w)}</span>`;
      else out += esc(w);
    }
    last = re.lastIndex;
  }
  return out + esc(src.slice(last));
}
const ta = $('#code'), hlPre = $('#hl'), gutter = $('#gutter');
function paintEditor() {
  const lines = ta.value.split('\n');
  hlPre.innerHTML = lines.map((l, i) => i + 1 === errLine ? `<span class="errl">${hl(l) || ' '}</span>` : hl(l)).join('\n') + '\n\n';
  gutter.innerHTML = lines.map((_, i) => `<div${i + 1 === errLine ? ' class="err"' : ''}>${i + 1}</div>`).join('') + '<div></div><div></div>';
  syncScroll();
}
function syncScroll() { hlPre.scrollTop = ta.scrollTop; hlPre.scrollLeft = ta.scrollLeft; gutter.scrollTop = ta.scrollTop; }
function loadEditor() { ta.value = project.code; paintEditor(); }
ta.addEventListener('input', () => { project.code = ta.value; if (errLine) errLine = 0; paintEditor(); save(); updateAC(); });
ta.addEventListener('scroll', () => { syncScroll(); hideAC(); });
ta.addEventListener('blur', () => setTimeout(hideAC, 150));
ta.addEventListener('click', hideAC);
ta.addEventListener('keydown', e => {
  if (acOpen()) {
    if (e.key === 'ArrowDown') { e.preventDefault(); acMove(1); return; }
    if (e.key === 'ArrowUp') { e.preventDefault(); acMove(-1); return; }
    if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); acAccept(); return; }
    if (e.key === 'Escape') { e.preventDefault(); hideAC(); return; }
  }
  if (e.key === 'Tab') { e.preventDefault(); document.execCommand('insertText', false, '  '); return; }
  if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey) {
    const line = ta.value.slice(0, ta.selectionStart).split('\n').pop();
    let ind = line.match(/^\s*/)[0];
    if ((/^\s*(if|but|otherwise|else|loop|repeat|for|while|when|on|forever|every|later|after|teach|function|match|case|during|try)\b/i.test(line)) && !line.includes('->')) ind += '  ';
    e.preventDefault(); document.execCommand('insertText', false, '\n' + ind);
  }
});
function jumpToLine(n) {
  const lines = ta.value.split('\n');
  const start = lines.slice(0, n - 1).reduce((s, l) => s + l.length + 1, 0);
  ta.focus(); ta.setSelectionRange(start, start + (lines[n - 1] || '').length);
  ta.scrollTop = Math.max(0, (n - 6) * 22.4);
}
function insertCode(code) {
  if (tab !== 'code') switchTab('code');
  ta.focus();
  const pos = ta.selectionStart, before = ta.value.slice(0, pos);
  const curLine = before.slice(before.lastIndexOf('\n') + 1), ind = curLine.match(/^\s*/)[0];
  let text = code.split('\n').map((l, i) => i ? ind + l : l).join('\n');
  if (curLine.trim() !== '') text = '\n' + ind + text;
  document.execCommand('insertText', false, text);
}
function renderChips() {
  const box = $('#chips');
  box.innerHTML = project.objects.length ? '<span class="lbl">On the stage:</span>' : '<span class="lbl">Add things in the Design tab, then use them here with @name.</span>';
  project.objects.forEach(o => {
    const s = document.createElement('span'); s.className = 'c'; s.textContent = '@' + o.name; s.title = 'Click to insert';
    s.onmousedown = e => { e.preventDefault(); ta.focus(); document.execCommand('insertText', false, '@' + o.name); };
    box.appendChild(s);
  });
}

// ---------------- autocomplete ----------------
const acBox = $('#ac'); let acItems = [], acIdx = 0, acRange = null;
const acOpen = () => acBox.style.display === 'block';
function hideAC() { acBox.style.display = 'none'; }
let charW = 0;
function measureChar() { const c = document.createElement('canvas').getContext('2d'); c.font = getComputedStyle(ta).font; charW = c.measureText('0000000000').width / 10; }
function acWords() {
  const words = new Map();
  COMMANDS.forEach(w => words.set(w, 'command'));
  ['if','but if','otherwise','done','loop','loop each','loop until','escape','teach','copy','ask','when start','when key','when click','when go','during','forever','every','later','touches','and','or','not','is','isnt','yes','no','match','case','make','glide','animate','watch','wait','wait until','give','try','loop from','controls','action','tile','build','choose','send','when get','when release','typewrite','patrol','bob','pulse','trail','shoot','skip','me'].forEach(w => words.set(w, 'word'));
  Object.keys(FUNCS).filter(f => !HIDDEN_NAMES.has(f)).forEach(f => words.set(f + '(', 'function'));
  Object.keys(BUILTINS).filter(b => !HIDDEN_NAMES.has(b)).forEach(b => words.set(b, 'value'));
  for (const m of project.code.matchAll(/^\s*([A-Za-z_]\w*)\s*[+\-*/]?=(?!=)/gm)) if (!words.has(m[1])) words.set(m[1], 'variable');
  for (const m of project.code.matchAll(/\b(?:as|each)\s+@?([A-Za-z_]\w*)/g)) if (!words.has(m[1])) words.set(m[1], 'variable');
  return words;
}
function updateAC() {
  const pos = ta.selectionStart, before = ta.value.slice(0, pos), line = before.slice(before.lastIndexOf('\n') + 1);
  const m = line.match(/@?[A-Za-z_][\w.]*$|@$/);
  if (!m || (line.split('"').length % 2 === 0) || /~|\/\//.test(line)) return hideAC();
  const word = m[0];
  let items = [], prefix = word;
  if (word.startsWith('@') && !word.includes('.')) {
    prefix = word.slice(1);
    const vars = [...acWords()].filter(([, k]) => k === 'variable').map(([w]) => w);
    items = [...new Set(project.objects.map(o => o.name).concat(vars))]
      .filter(n => n.toLowerCase().startsWith(prefix.toLowerCase()) && n !== prefix)
      .map(n => [n, project.objects.some(o => o.name === n) ? 'on stage' : 'copy']);
  } else if (word.includes('.')) {
    const base = word.slice(0, word.lastIndexOf('.')).replace(/^@/, ''); prefix = word.slice(word.lastIndexOf('.') + 1);
    if (base === 'mouse') items = ['x', 'y', 'down'].filter(p => p.startsWith(prefix) && p !== prefix).map(p => [p, 'value']);
    else if (base === 'stage') items = ['w', 'h'].filter(p => p.startsWith(prefix) && p !== prefix).map(p => [p, 'value']);
    else if (word.startsWith('@')) items = OBJ_PROPS.filter(p => p.startsWith(prefix.toLowerCase()) && p !== prefix).map(p => [p, 'property']);
  } else {
    if (word.length < 2) return hideAC();
    const lw = word.toLowerCase();
    for (const [w, kind] of acWords()) if (w.toLowerCase().startsWith(lw) && w !== word) items.push([w, kind]);
  }
  items = items.slice(0, 8);
  if (!items.length) return hideAC();
  acItems = items; acIdx = 0; acRange = [pos - prefix.length, pos];
  if (!charW) measureChar();
  const row = before.split('\n').length - 1, col = line.length;
  const lineTop = 12 + row * 22.4 - ta.scrollTop, popH = items.length * 28 + 10;
  acBox.style.top = (lineTop + 24 + popH > ta.clientHeight ? Math.max(0, lineTop - popH - 2) : lineTop + 24) + 'px';
  acBox.style.left = Math.max(4, Math.min(14 + col * charW - ta.scrollLeft - prefix.length * charW, ta.clientWidth - 230)) + 'px';
  acBox.innerHTML = items.map(([w, k], i) => `<div class="${i === 0 ? 'on' : ''}" data-i="${i}"><span>${esc(w)}</span><i>${k}</i></div>`).join('');
  acBox.style.display = 'block';
}
function acMove(d) { acIdx = (acIdx + d + acItems.length) % acItems.length; [...acBox.children].forEach((el, i) => el.classList.toggle('on', i === acIdx)); }
function acAccept() {
  const [w] = acItems[acIdx]; hideAC();
  ta.setSelectionRange(acRange[0], acRange[1]);
  document.execCommand('insertText', false, w);
}
acBox.addEventListener('mousedown', e => { const d = e.target.closest('[data-i]'); if (!d) return; e.preventDefault(); acIdx = +d.dataset.i; acAccept(); });

// ---------------- snippets ----------------
const SNIPPETS = [
  ['Keys', '🎮 Move with keys', 'controls @hero, "arrows", 4'],
  ['Keys', '🦘 Run and jump with keys', 'gravity 0.7\ncontrols @hero, "arrows", 4, "platform"'],
  ['Keys', '🚗 Turn-and-drive controls', 'controls @car, "wasd", 3, "drive"'],
  ['Keys', '⚡ Action key', 'action @hero, "space", "shoot"'],
  ['Story', '🎞️ Cutscene with wait', 'talk @hero, "Hello!", 1.5\nwait 1.5s\nglide @hero to 300, 200 in 1s\nwait 1s\ntalk @hero, "Let\'s go!", 1.5'],
  ['Logic', '🧮 Command that gives an answer', 'teach double n\n  give n * 2\ndone\n\nsay double(21)'],
  ['Logic', '🛟 Catch mistakes with try', 'try\n  say things[10]\notherwise\n  say "Oops: " + problem\ndone'],
  ['Data', '🗂️ A record', 'hero = { name: "Sam", hp: 10, level: 1 }\nhero.hp -= 3\nsay "{hero.name} has {hero.hp} hp"'],
  ['Levels', '🧱 Build a level from text', 'level = [\n  "##########",\n  "#P   o   #",\n  "#  ####  #",\n  "#o      o#",\n  "##########"\n]\ntile "#", @wall\ntile "o", @coin\ntile "P", @hero, once\nbuild level, 40'],
  ['Scenes', '🎬 Title screen + play scene', 'when start -> go "title"\n\nduring title\n  pin on\n  align center\n  ink white\n  letters 40, "Arial", bold\n  write stage.cx, 90, "My Game"\n  if button("▶ Play", stage.cx - 60, 180) -> go "play"\ndone\n\nwhen go play\n  play "powerup"\ndone\n\nduring play\n  \ndone'],
  ['Scenes', '💀 Game over + play again', 'during gameover\n  pin on\n  align center\n  ink white\n  letters 48, "Arial", bold\n  write stage.cx, 120, "Game Over"\n  if button("Play again", stage.cx - 80, 200, 160) -> restart\ndone'],
  ['Scenes', '❤️ Health bar', 'pin on\nbar 12, 12, 150, 16, health, 100, #ff4d8d'],
  ['Story', '💬 Speech bubble', 'talk @hero, "Hello there!", 2'],
  ['Story', '🌧️ Spooky night', 'weather "rain"\ndark 0.85\nlight @hero, 140\nmusic "spooky"'],
  ['Moving', '✨ Glide somewhere smoothly', 'glide @coin to 300, 200 in 1s'],
  ['Moving', '👻 Enemy that chases you', 'chase @ghost, @hero, 1.5'],
  ['Moving', '🌙 Something orbiting', 'orbit @moon, @planet, 80, 2'],
  ['Moving', '🖐️ Drag things with the mouse', '@box.grab = yes'],
  ['Effects', '🔄 Auto walking animation', 'cycle @hero, ["hero", "hero2"], 8'],
  ['Events', '▶ When the game starts', 'when start\n  \ndone'],
  ['Events', '🔁 Forever (60× a second)', 'forever\n  \ndone'],
  ['Events', '⌨️ When a key is pressed', 'when key space\n  \ndone'],
  ['Events', '🖱️ When a thing is clicked', 'when click @button\n  play "click"\ndone'],
  ['Events', '⏱️ Every 2 seconds', 'every 2s\n  \ndone'],
  ['Events', '⏳ Later (once, after 3 seconds)', 'later 3s\n  say "3 seconds later!"\ndone'],
  ['Moving', '⬅️➡️ Move with arrow keys', 'if held(left) -> @player.x -= 5\nif held(right) -> @player.x += 5\nif held(up) -> @player.y -= 5\nif held(down) -> @player.y += 5\nfence @player'],
  ['Moving', '🎮 Move with WASD', 'if held(a) -> @player.x -= 5\nif held(d) -> @player.x += 5\nif held(w) -> @player.y -= 5\nif held(s) -> @player.y += 5'],
  ['Moving', '🐭 Glide toward the mouse', '@player.cx = mix(@player.cx, mouse.x, 0.1)\n@player.cy = mix(@player.cy, mouse.y, 0.1)'],
  ['Moving', '🧭 Fly toward the mouse', 'face @ship, mouse.x, mouse.y\nstep @ship, 3\nwrap @ship'],
  ['Physics', '🍄 Platformer controls', 'gravity 0.7\n\nforever\n  @hero.vx = 0\n  if held(left)\n    @hero.vx = -4\n    @hero.flip = yes\n  done\n  if held(right)\n    @hero.vx = 4\n    @hero.flip = no\n  done\n  if held(up) and @hero.onground\n    @hero.vy = -13\n    play "jump"\n  done\ndone'],
  ['Physics', '⚽ Bouncing ball', '@ball.vx = 4\n@ball.vy = 3\n\nforever\n  bounce @ball\ndone'],
  ['Copies', '🔫 Shoot a copy', 'when key space\n  copy @laser as l\n  place @l, @ship.cx, @ship.y\n  @l.vy = -10\n  play "laser"\ndone'],
  ['Copies', '🌧️ Drop things from the sky', 'every 1s\n  copy @rock as r\n  place @r, dice(0, stage.w - @r.w), -50\n  @r.vy = rand(2, 5)\ndone'],
  ['Copies', '♻️ Go through every copy', 'loop each r in clones(@rock)\n  if @player touches @r\n    pop @r\n  but if @r.y > stage.h\n    erase @r\n  done\ndone'],
  ['Copies', '💥 When two things touch', 'if @player touches @coin\n  score += 1\n  play "coin"\n  hide @coin\ndone'],
  ['Effects', '✨ Sparkle burst', 'sparkle @player.cx, @player.cy, 40, rainbow, 6'],
  ['Effects', '📳 Shake + flash', 'shake 10\nflash red'],
  ['Effects', '🎥 Camera follows the player', 'world 2000, 400\nfollow @player'],
  ['Effects', '🚶 Walking animation', 'if floor(frame / 8) % 2 is 0\n  @hero.costume = "hero"\notherwise\n  @hero.costume = "hero2"\ndone'],
  ['Sound', '🔊 Sound effect', 'play "coin"   ~ coin, jump, hit, explode, powerup, laser, click, bloop, win, lose'],
  ['Sound', '🎵 Play a tune', 'tune "C4 E4 G4 C5 - G4 C5", 160'],
  ['Words', '🏆 Score on screen', 'pin on\nletters 24, "Arial", bold\nink white\nglow 6, black\nwrite 12, 10, "Score: " + score'],
  ['Words', '💬 Big message in the middle', 'pin on\nletters 48, "Arial", bold\nalign center\nink white\nglow 10, black\nwrite stage.w / 2, stage.h / 2 - 24, "You win!"'],
  ['Words', '❓ Ask a question', 'ask "What is your name?", name\nsay "Hello, " + name + "!"'],
  ['Logic', '🔀 if / but if / otherwise', 'if score >= 10\n  say "Amazing!"\nbut if score >= 5\n  say "Good job"\notherwise\n  say "Keep going"\ndone'],
  ['Logic', '➡️ One-line if', 'if score > 9 -> play "win"'],
  ['Logic', '🔢 Loop with a counter', 'loop 10 as i\n  circle 30 + i * 50, 100, 20\ndone'],
  ['Logic', '🧩 Teach a new command', 'teach boom px, py\n  sparkle px, py, 50, orange, 6\n  play "explode"\ndone\n\n~ use it like this:\n~ boom 100, 200'],
  ['Data', '📋 A list of things', 'fruits = ["apple", "banana", "cherry"]\nadd fruits, "mango"\nloop each f in fruits -> say f'],
  ['Power', '🧠 Functions you can keep in a box', 'double = (n -> n * 2)\nsay double(21)\n\nnums = [3, 8, 1, 12, 5]\nsay keep(nums, (n -> n > 4))\nsay change(nums, (n -> n * 10))\nsay squash(nums, (total, n -> total + n), 0)'],
  ['Power', '📣 Send a message', 'when key space -> send "boom", 5\n\nwhen get "boom"\n  say "Got boom with " + message\n  shake message\ndone'],
  ['Power', '💥 When two things touch (event)', 'when @hero touches @coin\n  score += 1\n  play "coin"\n  erase @it\ndone'],
  ['Power', '⌨️ When a key is let go', 'when release space\n  say "you let go of space"\ndone'],
  ['Story', '🗨️ Pick an answer', 'choose "Open the old door?", ["Yes", "No way"], answer\nif answer is "Yes"\n  talk @hero, "Here goes…", 2\notherwise\n  talk @hero, "Maybe later.", 2\ndone'],
  ['Story', '⌨️ Typewriter words', 'typewrite @label, "Long ago, in a land of doodles…", 20\nwait until not typing(@label)\nwait 1s\ntypewrite @label, "…a hero woke up."'],
  ['Moves', '💂 Patrol between spots', 'patrol @guard, [[80, 300], [480, 300], [480, 80]], 2'],
  ['Moves', '🎈 Bob and pulse', 'bob @coin, 8, 2\npulse @star, 0.2, 3'],
  ['Moves', '☄️ Leave a trail', 'trail @comet, orange\ntrail @hero, rainbow, 3'],
  ['Moves', '🔫 Shoot a copy at an angle', 'when key space -> shoot @ship, @laser, -90, 10'],
  ['Turtle', '🐢 Draw a square with the turtle', 'ink purple\nbrush 4\nturtle 200, 150\nloop 4\n  walk 100\n  turn 90\ndone'],
  ['Turtle', '🌸 Spiral flower', 'paper 600, 400, black\nbrush 2\nturtle 300, 200\nloop 120 as i\n  ink hsl(i * 3, 90, 60)\n  walk i * 2\n  turn 61\ndone'],
  ['Power', '🐶 A record with its own functions', 'dog = { name: "Rex", age: 3, hello: ( -> "Woof! I am " + me.name) }\nsay dog.hello()\n\n~ taught commands work too, and can change me:\nteach birthday\n  me.age += 1\ndone\ndog.grow = "birthday"\ndog.grow()\nsay dog.age'],
  ['Power', '⏭️ Skip to the next turn of a loop', 'loop i from 1 to 10\n  if odd(i) -> skip\n  say i\ndone'],
  ['Power', '🚨 Make your own error', 'teach withdraw amount\n  if amount > money -> fail "Not enough money!"\n  money -= amount\ndone\n\nmoney = 5\ntry\n  withdraw 10\notherwise\n  say problem\ndone'],
  ['Power', '🧰 Handy data helpers', 'say either(score > 10, "great", "ok")\nsay tally(["a", "b", "a"])\nsay words("hello big world")\nsay capitalize("hello world")\nsay flatten([1, [2, [3]]])\nsay merge({ a: 1 }, { b: 2 })'],
  ['Physics', '🦘 Jump, boost and bounce off', 'gravity 0.7\n@hero.physics = yes\nwhen key up -> jump @hero, 13\nwhen key right -> boost @hero, 2, 0\n\nforever\n  bounceoff @ball, @paddle\ndone'],
  ['Sound', '🗣️ Make the computer talk', 'speak "Hello! Welcome to my game."\nspeak "I am a robot", 0.4, 0.8'],
  ['Data', '💾 Save a high score', 'best = load("best", 0)\nif score > best\n  best = score\n  save "best", best\ndone'],
];
function buildSnippets() {
  let html = '', cat = '';
  SNIPPETS.forEach(([c, label], i) => { if (c !== cat) { html += `<h4>${c}</h4>`; cat = c; } html += `<button class="mi" data-snip="${i}"><span><b>${esc(label)}</b></span></button>`; });
  $('#snipMenu').innerHTML = html;
  $$('#snipMenu [data-snip]').forEach(b => b.onclick = () => { closeMenus(); insertCode(SNIPPETS[+b.dataset.snip][2]); });
}

// ---------------- reference guide ----------------
const REF = [
  ['The Doodle style', '~ a note to yourself', 'A squiggle starts a note. Doodle skips it.'],
  ['The Doodle style', '@player', 'The @ sign means a thing on the stage (from the Design tab).'],
  ['The Doodle style', 'if score > 9 -> play "win"', 'An arrow puts a one-line block on a single line, with no done needed.'],
  ['The Doodle style', 'done', 'Every block (if, loop, forever, when…) ends with done.'],
  ['Paper & paint', 'paper 600, 400, skyblue', 'Set the stage size and color.'],
  ['Paper & paint', 'wash navy', 'Cover everything with one color.'],
  ['Paper & paint', 'paint orange', 'The color inside shapes. "paint none" = hollow.'],
  ['Paper & paint', 'ink black', 'Outline and word color. "ink none" = no outline.'],
  ['Paper & paint', 'brush 4', 'How thick outlines are.'],
  ['Paper & paint', 'blend #ff9a9e, #a18cd1', 'Paint shapes with a top-to-bottom blend of two colors.'],
  ['Paper & paint', 'fade 0.5', 'See-through: 1 = solid, 0 = invisible.'],
  ['Paper & paint', 'glow 10, black', 'A soft glow behind drawings. "glow none" turns it off.'],
  ['Paper & paint', 'pin on', 'Pin drawings to the screen so the camera never moves them (great for scores).'],
  ['Shapes', 'circle 100, 100, 40', 'x, y (the middle), size.'],
  ['Shapes', 'oval 100, 100, 60, 30', 'x, y (the middle), wide, tall.'],
  ['Shapes', 'box 20, 20, 120, 80', 'x, y (top-left corner), width, height.'],
  ['Shapes', 'roundbox 20, 20, 120, 80, 16', 'A box with round corners: …, roundness.'],
  ['Shapes', 'line 0, 0, 200, 100', 'From x1, y1 to x2, y2.'],
  ['Shapes', 'arc 100, 100, 50, 0, 180', 'Part of a circle: x, y, size, start°, end°.'],
  ['Shapes', 'triangle 50, 150, 100, 50, 150, 150', 'Three corners.'],
  ['Shapes', 'poly 100, 100, 50, 6', 'A shape with any number of sides: x, y, size, sides.'],
  ['Shapes', 'star 100, 100, 50, 5', 'x, y, size, number of points.'],
  ['Shapes', 'sticker "hero", 50, 50', 'Stick a painted costume on the paper: name, x, y (optional width, height).'],
  ['Words', 'write 20, 20, "Hello " + name', 'Write words at x, y.'],
  ['Words', 'letters 32, "Georgia", bold', 'Word size, typeface, and boldness.'],
  ['Words', 'align center', 'left, center or right.'],
  ['Remembering', 'score = 0', 'Make or change a variable.'],
  ['Remembering', 'score += 1', 'Shortcuts: += -= *= /='],
  ['Remembering', 'yes  no', 'On and off (they are 1 and 0).'],
  ['Decisions', 'if score > 10\n  …\nbut if score > 5\n  …\notherwise\n  …\ndone', 'Make choices. Compare with is, isnt, < > <= >=. Combine with and, or, not.'],
  ['Decisions', 'if roll is 6 -> say "six!"', 'A one-line if.'],
  ['Loops', 'loop 10 as i\n  …\ndone', 'Do something 10 times. i counts 0, 1, 2…'],
  ['Loops', 'loop each c in clones(@coin)\n  …\ndone', 'Do something for each thing in a list.'],
  ['Loops', 'loop while x < 100\n  …\ndone', 'Keep going while something is true.'],
  ['Loops', 'escape', 'Jump out of a loop early.'],
  ['Your own commands', 'teach jump power\n  @hero.vy = -power\ndone', 'Teach Doodle a new command (with optional inputs).'],
  ['Your own commands', 'jump 12', 'Use a command you taught.'],
  ['Events', 'when start\n  …\ndone', 'Runs once when the game starts.'],
  ['Events', 'forever\n  …\ndone', 'Runs 60 times every second, on a fresh page each time.'],
  ['Events', 'when key space\n  …\ndone', 'Runs when a key is pressed. Keys: left right up down space enter a–z 0–9. "when any key" for every key.'],
  ['Events', 'when click\n  …\ndone', 'Runs when the stage is clicked.'],
  ['Events', 'when click @button\n  …\ndone', 'Runs when that thing is clicked.'],
  ['Events', 'every 2s\n  …\ndone', 'Runs every 2 seconds.'],
  ['Events', 'later 3s\n  …\ndone', 'Runs once, 3 seconds from now.'],
  ['Input', 'held(left)', 'yes while a key is held down.'],
  ['Input', 'mouse.x  mouse.y  mouse.down', 'Where the mouse is, and if it is pressed.'],
  ['Input', 'ask "Your name?", name', 'Ask a question and remember the answer.'],
  ['Things on the stage', '@player.x  @player.y  @player.w  @player.h', 'Position (top-left) and size.'],
  ['Things on the stage', '@player.cx  @player.cy  @player.right  @player.bottom', 'Middle and edges (you can change these too).'],
  ['Things on the stage', '@player.angle  @player.alpha  @player.flip', 'Turn (degrees), see-through, mirror.'],
  ['Things on the stage', '@player.color  @player.text  @player.costume', 'Its color, its words, or its painted picture.'],
  ['Things on the stage', '@player.vx  @player.vy', 'Speed. Things move by vx, vy every frame by themselves.'],
  ['Things on the stage', '@player.visible', 'yes = showing, no = hidden.'],
  ['Things on the stage', 'show @coin   hide @coin', 'Show or hide a thing.'],
  ['Things on the stage', 'nudge @player, 5, 0', 'Move by a little.'],
  ['Things on the stage', 'place @player, 100, 200', 'Jump to a spot.'],
  ['Things on the stage', 'face @ship, mouse.x, mouse.y', 'Turn to face a spot (or another thing).'],
  ['Things on the stage', 'step @ship, 5', 'Move forward the way it is facing.'],
  ['Things on the stage', 'fence @player', 'Keep it inside the stage.'],
  ['Things on the stage', 'wrap @ship', 'Leave one side, come back on the other.'],
  ['Things on the stage', 'bounce @ball', 'Bounce off the edges (uses vx and vy).'],
  ['Things on the stage', '@player touches @coin', 'Are they touching? Works with copies too — it tells you which copy.'],
  ['Things on the stage', 'hovered(@button)', 'yes if the mouse is over it.'],
  ['Things on the stage', 'gap(@player, @enemy)', 'How far apart two things are.'],
  ['Copies', 'copy @rock as r', 'Make a copy. Use @r to talk to it: @r.x, @r.vy…'],
  ['Copies', 'clones(@rock)', 'A list of all copies of @rock.'],
  ['Copies', 'erase @r', 'Remove a thing forever.'],
  ['Copies', 'pop @r', 'Burst into sparkles and disappear.'],
  ['Copies', 'offscreen(@r)', 'yes if it is off the stage.'],
  ['Physics', 'gravity 0.7', 'How strongly physics things fall.'],
  ['Physics', '@hero.physics = yes', 'Falls, and lands on solid things. (Or tick Physics in Design.)'],
  ['Physics', '@hero.onground', 'yes when it is standing on something.'],
  ['Camera', 'follow @hero', 'The camera follows a thing. "follow none" stops.'],
  ['Camera', 'world 2000, 400', 'How big your level is (the camera stays inside it).'],
  ['Camera', 'camera 100, 0', 'Move the camera yourself.'],
  ['Effects', 'sparkle x, y, 40, gold, 5', 'A burst: x, y, how many, color (or rainbow), speed.'],
  ['Effects', 'shake 10', 'Shake the stage.'],
  ['Effects', 'flash white', 'Flash the stage a color.'],
  ['Effects', 'backdrop "space"', 'Use a painted costume as the background. "backdrop none" removes it.'],
  ['Sound', 'play "coin"', 'coin, jump, hit, explode, powerup, laser, click, bloop, win, lose.'],
  ['Sound', 'note "C5", 300', 'Play a musical note for some milliseconds.'],
  ['Sound', 'tune "C4 E4 G4 - C5", 150', 'Play notes one after another ("-" is a rest).'],
  ['Sound', 'beep 440, 100', 'A beep: pitch, milliseconds.'],
  ['Numbers', 'rand(1, 10)  dice(1, 6)  chance(25)', 'Random numbers. chance(25) is yes a quarter of the time.'],
  ['Numbers', 'round  floor  ceil  abs  sqrt  pow  min  max', 'Number helpers.'],
  ['Numbers', 'clamp(x, 0, 100)  mix(a, b, 0.1)', 'Keep in a range / slide smoothly toward.'],
  ['Numbers', 'sin(deg)  cos(deg)  angleto(x1, y1, x2, y2)', 'Angles, in degrees.'],
  ['Numbers', 'dist(x1, y1, x2, y2)', 'How far apart two points are.'],
  ['Colors', 'rgb(255, 120, 0)  hsl(200, 80, 60)', 'Mix your own colors. Add a 4th number for see-through.'],
  ['Lists', 'things = [1, 2, 3]', 'Make a list.'],
  ['Lists', 'things[0]', 'Get an item (positions start at 0).'],
  ['Lists', 'add things, 4   drop things, 0   put things, 0, 9', 'Add, drop, or change items.'],
  ['Lists', 'size(things)  pick(things)  contains(things, 2)', 'Count, random item, search.'],
  ['Lists', 'sort things   shuffle things   sorted(things)', 'Put in order, or mix up.'],
  ['Words & text', 'upper(s)  lower(s)  part(s, 0, 3)  split(s, " ")  join(list, ", ")', 'Work with words.'],
  ['Words & text', 'str(5)  num("5")', 'Number ↔ words.'],
  ['Saving', 'save "best", score', 'Save a value forever (in this browser).'],
  ['Saving', 'load("best", 0)', 'Load a saved value (or 0 the first time).'],
  ['Keys (no code needed)', 'controls @hero, "wasd", 4', 'Move with keys: "arrows", "wasd", "ijkl", or 4 keys of your own (up, left, down, right), then speed. Or pick them in the Design tab!'],
  ['Keys (no code needed)', 'controls @hero, "arrows", 4, "platform"', 'Styles: "move" (walk around), "platform" (run and jump), "drive" (turn and go).'],
  ['Keys (no code needed)', 'action @hero, "space", "jump"', 'A key that makes it do something: jump, shoot, spin, sparkle, grow, shrink, color, hide — or a sound.'],
  ['Keys (no code needed)', 'controls @hero, none', 'Stop key controls.'],
  ['Waiting', 'wait 1s', 'Pause this code for a moment, then carry on. Great for stories and cutscenes.'],
  ['Waiting', 'wait until @door.visible', 'Pause until something becomes true.'],
  ['Commands that answer', 'teach double n\n  give n * 2\ndone', 'give sends an answer back from a taught command.'],
  ['Commands that answer', 'say double(21)', 'Use a taught command like a function. Names you make inside it stay inside it.'],
  ['Records', 'hero = { name: "Sam", hp: 10 }', 'Keep many values together, each with a name.'],
  ['Records', 'hero.hp -= 3', 'Read or change a value with a dot.'],
  ['Records', 'keys(hero)  values(hero)  has(hero, "hp")', 'Look inside a record.'],
  ['Records', 'sortby players, "score", down', 'Sort a list of records by one of their values.'],
  ['Loops', 'loop i from 1 to 10 by 2\n  …\ndone', 'Count from one number to another.'],
  ['Loops', 'loop each name, i in names\n  …\ndone', 'Each item and its position.'],
  ['Mistakes', 'try\n  …\notherwise\n  say problem\ndone', 'If something goes wrong inside try, run the otherwise part instead. problem tells you what went wrong.'],
  ['Levels from text', 'level = [\n  "#####",\n  "#P o#",\n  "#####"\n]', 'Draw a level with letters. Lists can go over many lines.'],
  ['Levels from text', 'tile "#", @wall', 'What a letter means. Add "once" to use the real thing instead of a copy: tile "P", @hero, once'],
  ['Levels from text', 'build level, 32', 'Build the level: each letter becomes a square this big.'],
  ['Collisions', 'side(@hero, @slime)', 'Which side of the slime the hero hit: "top", "bottom", "left" or "right".'],
  ['Checking things', 'type(x)', '"number", "words", "list" or "record".'],
  ['Numbers', 'int(n)  mod(a, b)  log(n)  exp(n)', 'More math.'],
  ['Words & text', 'chars(s)  copies("ha", 3)  slice(s, 0, 4)', 'Split into letters, repeat, cut out a part.'],
  ['Lists', 'combine(a, b)  slice(list, 1, 3)  count(list, x)', 'Join lists, cut out a part, count how many.'],
  ['Time', 'today()  hour()  minute()  weekday()', 'The real date and time.'],
  ['Scenes', 'go "menu"', 'Switch to another scene (title screen, levels, game over…).'],
  ['Scenes', 'when go menu\n  …\ndone', 'Runs once when you arrive in a scene.'],
  ['Scenes', 'during menu\n  …\ndone', 'Runs every frame, but only while that scene is showing.'],
  ['Scenes', 'scene  scene.time', 'The scene you are in, and seconds since you arrived.'],
  ['Scenes', 'restart', 'Start the whole game again from the beginning.'],
  ['Buttons & bars', 'if button("Play", 200, 150) -> go "play"', 'Draws a clickable button; yes on the moment it is clicked. Optional width, height after x, y.'],
  ['Buttons & bars', 'bar 10, 10, 150, 16, health, 100, red', 'A health/progress bar: x, y, width, height, value, most (and a color).'],
  ['Buttons & bars', 'pressed(space)', 'yes only on the moment a key goes down (held() is yes the whole time).'],
  ['Buttons & bars', 'mouse.clicked', 'yes only on the moment the mouse is clicked.'],
  ['Buttons & bars', 'watch score, lives', 'Show variables in the corner while you test. "watch none" hides them.'],
  ['Words', '"Score: {score}"', 'Curly brackets put a value right inside your words.'],
  ['Smooth moves', 'glide @coin to 300, 200 in 1s', 'Move smoothly to a spot.'],
  ['Smooth moves', 'animate @coin.angle to 360 in 2s', 'Smoothly change any number: angle, alpha, w, h, x, y…'],
  ['Smooth moves', 'spin @coin, 5', 'Turn a little.'],
  ['Smooth moves', 'grow @hero, 1.5', 'Get bigger (or smaller with 0.5), from the middle.'],
  ['Smooth moves', 'launch @ball, 45, 8', 'Send flying: angle, speed (sets vx and vy).'],
  ['Behaviors', 'chase @ghost, @hero, 1.5', 'Keeps following another thing (speed).'],
  ['Behaviors', 'flee @mouse, @cat, 2', 'Keeps running away from another thing.'],
  ['Behaviors', 'orbit @moon, @earth, 80, 2', 'Keeps circling another thing (distance, speed).'],
  ['Behaviors', 'wander @slime, 1.5', 'Roams around randomly.'],
  ['Behaviors', 'cycle @hero, ["walk1", "walk2"], 8', 'Swaps costumes every few frames (animation). "cycle @hero, none" stops.'],
  ['Behaviors', 'calm @ghost', 'Stops all its behaviors.'],
  ['Behaviors', '@box.grab = yes', 'Lets the player drag it with the mouse. (Or set it in code for any thing.)'],
  ['Making things', 'make box @wall, 100, 300, 200, 20, gray', 'Create a new thing from code: box, circle, star, triangle.'],
  ['Making things', 'make words @label, 20, 20, 200, 24, "Hello", white', 'Create words on the stage: x, y, width, size, text, color.'],
  ['Making things', 'make sprite @tree, 50, 80, 64, 64, "tree"', 'Create a sprite from a painted costume.'],
  ['Making things', 'front @hero   back @cloud', 'Bring to the front or send to the back.'],
  ['Finding things', 'nearest(@hero, @coin)', 'The closest coin (or copy of it) to the hero.'],
  ['Finding things', 'count(@coin)', 'How many copies of coin are showing.'],
  ['Finding things', 'edge(@ball)', '"left", "right", "top" or "bottom" when touching a stage edge, otherwise no.'],
  ['Story & mood', 'talk @hero, "Hello!", 2', 'A speech bubble for some seconds.'],
  ['Story & mood', 'weather "snow"', 'rain, snow, leaves, confetti, bubbles, or none.'],
  ['Story & mood', 'dark 0.8', 'Darken the stage (0 = normal, 1 = black).'],
  ['Story & mood', 'light @hero, 120', 'A glow around a thing that shines through the dark. "light @hero, 0" turns it off.'],
  ['Story & mood', 'trails 0.4', 'Moving things leave a blurry trail. "trails 0" turns it off.'],
  ['Story & mood', 'music "happy"', 'Looping music: happy, chill, spooky, chase, space, victory. "music none" stops it.'],
  ['Story & mood', 'volume 0.5', 'How loud all sounds are (0 to 1).'],
  ['Camera', 'zoom 2', 'Zoom the camera in (2 = twice as big) or out (0.5).'],
  ['Shapes', 'heart 100, 100, 30', 'A heart: x, y, size.'],
  ['Shapes', 'dot 100, 100', 'A small dot (optional size).'],
  ['Shapes', 'shape [20, 20, 120, 40, 60, 110]', 'Any shape from a list of corner points.'],
  ['Shapes', 'emoji "🍕", 100, 100, 48', 'Draw an emoji: x, y (middle), size.'],
  ['Numbers', 'wave(3, 50)', 'A number that smoothly swings back and forth (speed, size).'],
  ['Numbers', 'between(x, 0, 10)  even(n)  odd(n)', 'yes/no checks.'],
  ['Numbers', 'commas(1500000)  pad(7, 3)  clock(125)', '"1,500,000"  "007"  "2:05"'],
  ['Colors', 'randomcolor()  lighter(red)  darker(blue, 0.5)', 'Random and shaded colors.'],
  ['Lists', 'range(1, 10)  sum(list)  average(list)', 'Count up, add up, average.'],
  ['Lists', 'first(list)  last(list)  reverse(list)  unique(list)', 'More list helpers.'],
  ['Lists', 'insert things, 0, "new"   empty things', 'Add at a position, or remove everything.'],
  ['Words & text', 'length(s)  trim(s)  replace(s, "a", "b")  starts(s, "Hi")  ends(s, "!")', 'More word helpers.'],
  ['Loops', 'loop until score > 10\n  …\ndone', 'Keep going until something becomes true.'],
  ['Decisions', 'match level\ncase 1\n  …\ncase 2, 3\n  …\notherwise\n  …\ndone', 'Pick one choice by value.'],
  ['Sound', 'play "magic"', 'More sounds: coinbig, zap, boing, pop, step, magic, alarm, beep.'],
  ['Other', 'say "hi " + name', 'Write a message in the console.'],
  ['Other', 'frame  time  stage.w  stage.h  lastkey', 'Built-in values.'],
  ['Other', 'stop', 'End the game.'],
  ['Functions as values', 'double = (n -> n * 2)\nsay double(21)', 'A function you can keep in a variable. Write the inputs, an arrow, then the answer, all in round brackets.'],
  ['Functions as values', '(a, b -> a + b)   ( -> dice(1, 6))', 'Functions can take many inputs, or none.'],
  ['Functions as values', 'keep(nums, (n -> n > 4))', 'Keep only the items the function says yes to.'],
  ['Functions as values', 'change(nums, (n -> n * 10))', 'Change every item with a function and get a new list.'],
  ['Functions as values', 'squash(nums, (total, n -> total + n), 0)', 'Squash a list down to one value, starting from 0.'],
  ['Functions as values', 'findfirst(list, f)  allof(list, f)  anyof(list, f)  sortwith(list, f)', 'Find the first match, check all or any, or sort by what the function gives.'],
  ['Functions as values', 'teach twice f, x\n  give f(f(x))\ndone', 'Pass functions into your own commands. The name of a taught command works too:  keep(nums, "isbig").'],
  ['Functions as values', 'use(f, 1, 2)   isfunction(f)', 'Run a function you have, or check that something is a function.'],
  ['Messages & events', 'send "boom", 5\n\nwhen get "boom"\n  say message\ndone', 'Shout a message to every "when get" block. message holds the value sent with it.'],
  ['Messages & events', 'when @hero touches @coin\n  erase @it\ndone', 'Runs once each time they start touching. Works with copies; it is the one that was touched.'],
  ['Messages & events', 'when release space\n  …\ndone', 'Runs when a key is let go.'],
  ['Story tools', 'choose "Which way?", ["Left", "Right"], way', 'Shows a menu and waits until the player picks. Click it, or press 1, 2, 3 or the arrow keys and Enter.'],
  ['Story tools', 'typewrite @label, "Hello there!", 20', 'Types out words one letter at a time (20 letters a second). Add "quiet" at the end for no clicks.'],
  ['Story tools', 'wait until not typing(@label)', 'typing(@label) is yes while it is still typing.'],
  ['Behaviors', 'patrol @guard, [[100, 200], [400, 200]], 2', 'Walk between spots, over and over.'],
  ['Behaviors', 'bob @coin, 8, 2', 'Float gently up and down (size, speed). bob @coin, 0 stops it.'],
  ['Behaviors', 'pulse @star, 0.2, 3', 'Grow and shrink like a heartbeat (how much, speed).'],
  ['Behaviors', 'trail @comet, orange, 2', 'Leave sparkly dust behind it. Use rainbow for every color, or none to stop.'],
  ['Behaviors', 'shoot @ship, @laser, -90, 10', 'Fire a copy of @laser from @ship at an angle (-90 is up, 0 is right) and speed. It disappears when it leaves the stage.'],
  ['Math', 'snap(x, 32)', 'Round to the nearest step, great for grids.'],
  ['Math', 'noise(frame / 60)', 'Smooth random between 0 and 1 that changes slowly, great for wobbly clouds and hills.'],
  ['Math', 'percent(part, whole)', 'What percent part is of whole.'],
  ['Turtle drawing', 'turtle 300, 200', 'Put the drawing turtle at a spot, facing right. Add an angle to face another way: turtle 300, 200, -90 faces up.'],
  ['Turtle drawing', 'walk 100', 'The turtle walks forward and draws a line in the ink color and brush size.'],
  ['Turtle drawing', 'turn 90', 'Turn the turtle (positive turns clockwise).'],
  ['Turtle drawing', 'penup   pendown', 'Lift the pen to move without drawing, then put it back down.'],
  ['Turtle drawing', 'turtle.x  turtle.y  turtle.angle', 'Where the turtle is, and which way it faces.'],
  ['More power', 'skip', 'Inside a loop: jump straight to the next turn.'],
  ['More power', 'fail "Out of gems!"', 'Make your own mistake on purpose. try / otherwise catches it, and problem holds the words.'],
  ['More power', 'dog = { name: "Rex", hello: ( -> "Hi, I am " + me.name) }\nsay dog.hello()', 'Records can hold functions. Inside them, me is the record. A taught command name works too, and can change me.'],
  ['More power', 'double(5)', 'A function call can be a whole line by itself.'],
  ['More power', 'either(score > 10, "great", "ok")', 'Pick one of two values.'],
  ['More power', 'copyof(r)  merge(a, b)  pairs(r)', 'A separate copy of a list or record · join two records · a record as [name, value] pairs.'],
  ['More power', 'flatten(list)  tally(list)  words(s)  capitalize(s)', 'Flatten lists inside lists · count each item · split into words · Capital Letters.'],
  ['Physics', 'jump @hero, 13', 'Jump, but only when standing on something (with physics on).'],
  ['Physics', 'boost @box, 3, 0', 'Add to how fast it is moving (sideways, up/down).'],
  ['Physics', 'bounceoff @ball, @paddle', 'If they touch, the ball bounces away on the side it hit.'],
  ['Sound', 'speak "Hello!", 1, 1', 'The computer reads the words out loud (pitch 0 to 2, speed). Muted when sound is off.'],
];
function buildRef(filter = '') {
  const f = filter.toLowerCase().trim();
  let html = '', cat = '';
  REF.forEach(([c, s, d], i) => {
    if (f && !(s + ' ' + d + ' ' + c).toLowerCase().includes(f)) return;
    if (c !== cat) { html += `<h5>${c}</h5>`; cat = c; }
    html += `<div class="r" data-ref="${i}" title="Click to insert"><code>${hl(s.split('\n')[0])}${s.includes('\n') ? ' …' : ''}</code><div>${esc(d)}</div></div>`;
  });
  $('#refList').innerHTML = html || '<p class="muted" style="padding:10px">Nothing found.</p>';
  $$('#refList [data-ref]').forEach(el => el.onclick = () => insertCode(REF[+el.dataset.ref][1].replace(/…/g, '')));
}
$('#refSearch').oninput = e => buildRef(e.target.value);
$('#refBtn').onclick = () => {
  const show = $('#refpane').hidden;
  $('#refpane').hidden = !show; $('#codegrid').classList.toggle('ref', show);
  $('#refBtn').classList.toggle('primary', show);
  if (show) $('#refSearch').focus();
};

// ---------------- tabs ----------------
function switchTab(t) {
  if (t === tab && document.querySelector('.view.on')) { /* refresh anyway */ }
  const prev = tab; tab = t;
  if (prev === 'paint' && t !== 'paint') commitPaint();
  if ((t === 'paint' || t === 'learn') && playing) stopGame();
  $$('.tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === t));
  $('#workspace').classList.toggle('on', t === 'design' || t === 'code');
  $('#paint').classList.toggle('on', t === 'paint');
  $('#learn').classList.toggle('on', t === 'learn');
  $('#workspace').classList.toggle('code', t === 'code');
  $('#designPanel').hidden = t !== 'design';
  $('#codePanel').hidden = t !== 'code';
  if (t !== 'learn') pauseVideo();
  if (t === 'design' || t === 'code') { loadStageSettings(); renderDesign(); renderChips(); }
  if (t === 'code') { paintEditor(); measureChar(); }
  if (t === 'paint') paintOpen();
  hideAC(); closeMenus(); updatePlayUI();
}
$$('.tabs button').forEach(b => b.onclick = () => switchTab(b.dataset.tab));

// ---------------- menus & files ----------------
function closeMenus() { $$('.menu.open').forEach(m => m.classList.remove('open')); }
function toggleMenu(id) { const m = $(id), was = m.classList.contains('open'); closeMenus(); if (!was) m.classList.add('open'); }
$('#examplesBtn').onclick = e => { e.stopPropagation(); toggleMenu('#examplesMenu'); };
$('#fileBtn').onclick = e => { e.stopPropagation(); toggleMenu('#fileMenu'); };
$('#snipBtn').onclick = e => { e.stopPropagation(); toggleMenu('#snipMenu'); };
document.addEventListener('click', e => { if (!e.target.closest('.menu')) closeMenus(); });

function download(name, data, type) {
  // the link is added to the page before clicking (some browsers ignore clicks on links that aren't on the page),
  // and the file is kept around for a minute so slow downloads still finish
  const a = document.createElement('a');
  a.href = typeof data === 'string' && data.startsWith('data:') ? data : URL.createObjectURL(data instanceof Blob ? data : new Blob([data], { type }));
  a.download = name; a.rel = 'noopener'; a.style.display = 'none';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => { if (a.href.startsWith('blob:')) URL.revokeObjectURL(a.href); }, 60000);
}
function loadProject(p, msg) {
  if (playing) stopGame();
  commitPaint();
  project = fixProject(p); selected = null; PT.target = null;
  loadAll(); resetHistory(); save();
  if (tab === 'paint') paintOpen();
  if (msg) toast(msg, 'ok');
}
function saveToFile() { commitPaint(); download('my-project.doodle', JSON.stringify(project), 'application/json'); toast('💾 Saved my-project.doodle', 'ok'); }
function buildExamples() {
  $('#examplesMenu').innerHTML = '<h4>Open an example</h4>' + EXAMPLES.map((x, i) =>
    `<button class="mi" data-ex="${i}"><span class="em">${x.emoji}</span><span><b>${esc(x.title)}</b><span class="d">${esc(x.desc)}</span></span></button>`).join('');
  $$('[data-ex]').forEach(b => b.onclick = () => {
    closeMenus();
    const x = EXAMPLES[+b.dataset.ex];
    if (!confirm(`Open "${x.title}"?\nThis replaces your current project. (Use File → Save to file first if you want to keep it.)`)) return;
    loadProject(x.make(), `${x.emoji} Opened ${x.title} — press Play!`);
    if (tab !== 'code') switchTab('design');
  });
}
$$('[data-file]').forEach(b => b.onclick = () => {
  closeMenus();
  const f = b.dataset.file;
  if (f === 'new') { if (confirm('Start a new empty project? (Use File → Save to file first if you want to keep this one.)')) loadProject(EXAMPLES.find(x => x.id === 'blank').make(), '📄 New project'); }
  if (f === 'open') $('#fileIn').click();
  if (f === 'save') saveToFile();
  if (f === 'shot') { if (!playing) renderDesign(); download('doodle-screenshot.png', stage.toDataURL('image/png')); }
});
$('#fileIn').onchange = async e => {
  const f = e.target.files[0]; if (!f) return;
  try {
    const p = JSON.parse(await f.text());
    if (!Array.isArray(p.objects) || typeof p.code !== 'string') throw 0;
    loadProject(p, '📂 Opened ' + f.name);
  } catch (err) { toast("That file doesn't look like a Doodle project.", 'bad'); }
  e.target.value = '';
};
// ---------------- export ----------------
function bytesToB64(bytes) {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(s);
}
function gameFileName(name) { return name.replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-').toLowerCase() || 'game'; }
function buildGameHTML(name, fullscreen) {
  const engineSrc = document.getElementById('engine-src').textContent;
  const data = JSON.stringify(project).replace(/</g, '\\u003c');
  const W = project.width, H = project.height, S = 'script';
  const icon = "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🎮</text></svg>";
  return `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(name)}</title>
<meta name="doodle-size" content="${W}x${H}">
<link rel="icon" href="${icon}">
<style>html,body{margin:0;height:100%;overflow:hidden;background:#0d0f15;display:flex;align-items:center;justify-content:center}
canvas{width:min(100vw, calc(100vh * ${W} / ${H}));height:min(100vh, calc(100vw * ${H} / ${W}));outline:none;display:block}
#title{position:fixed;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;background:radial-gradient(circle at 50% 35%,#2a2160,#0d0f15 70%);color:#fff;font-family:system-ui,sans-serif;text-align:center;z-index:2;padding:16px}
#title h1{margin:0;font-size:clamp(28px,6vw,56px);letter-spacing:.5px;text-shadow:0 4px 24px rgba(139,92,246,.6)}
#play{font:800 22px system-ui,sans-serif;color:#fff;background:linear-gradient(135deg,#8b5cf6,#ec4899);border:0;border-radius:16px;padding:16px 44px;cursor:pointer;box-shadow:0 10px 30px rgba(236,72,153,.35)}
#play:hover{transform:translateY(-2px)} #title small{color:#b9b6d3;font-size:13px}
#fs{position:fixed;right:10px;bottom:10px;z-index:1;background:rgba(255,255,255,.12);color:#fff;border:0;border-radius:10px;padding:8px 10px;font:600 13px system-ui,sans-serif;cursor:pointer;opacity:.35}
#fs:hover{opacity:1}</style>
</head><body><canvas id="game" tabindex="0"></canvas>
<div id="title"><div style="font-size:64px">🎮</div><h1>${esc(name)}</h1><button id="play">▶ Play</button><small>${fullscreen ? 'Opens full screen · press Esc to leave full screen' : 'Press ⛶ in the corner for full screen'}</small><small>Made with Doodle Studio</small></div>
<button id="fs" title="Full screen">⛶ Full screen</button>
<${S}>${engineSrc}
const PROJECT = ${data};
const cv = document.getElementById('game');
const eng = new Engine(cv, { onPrint: m => console.log(m), onError: e => alert((e.line ? 'Line ' + e.line + ': ' : '') + e.message) });
attachInput(eng, cv, () => true);
const FULL = ${fullscreen ? 'true' : 'false'};
const goFull = () => { const d = document.documentElement; if (!document.fullscreenElement && d.requestFullscreen) d.requestFullscreen().catch(() => {}); };
document.getElementById('fs').onclick = () => { if (document.fullscreenElement) document.exitFullscreen(); else goFull(); cv.focus(); };
const begin = () => { document.getElementById('title').remove(); if (FULL) goFull(); eng.load(PROJECT.code, PROJECT); eng.start(); cv.focus(); };
document.getElementById('play').onclick = begin;
addEventListener('keydown', e => { if (document.getElementById('title') && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); begin(); } });
addEventListener('pointerdown', () => cv.focus());
<\/${S}></body></html>`;
}
// Doodle Player: a one-time setup (pasted into PowerShell) so .doodle games open in their own app window when double-clicked.
// Nothing is downloaded and run, so Windows has nothing to warn about. It only touches this user's settings.
const PLAYER_SETUP = "$d = Join-Path $env:LOCALAPPDATA 'DoodlePlayer'; New-Item -ItemType Directory -Force -Path $d | Out-Null\nSet-Content -Path (Join-Path $d 'play.ps1') -Encoding UTF8 -Value @'\nparam([string]$f)\ntry {\n  $h = [IO.File]::ReadAllText($f)\n  $n = ([IO.Path]::GetFileNameWithoutExtension($f) -replace '[^\\w\\- ]', '').Trim(); if (-not $n) { $n = 'game' }\n  $dir = Join-Path $env:LOCALAPPDATA 'DoodlePlayer\\games'\n  New-Item -ItemType Directory -Force -Path $dir | Out-Null\n  $o = Join-Path $dir ($n + '.html')\n  [IO.File]::WriteAllText($o, $h)\n  if ($env:DOODLE_NOLAUNCH) { exit 0 }\n  $w = 640; $ht = 480\n  if ($h -match 'name=\"doodle-size\" content=\"(\\d+)x(\\d+)\"') { $w = [int]$Matches[1] + 16; $ht = [int]$Matches[2] + 48 }\n  $apps = @(\"${env:ProgramFiles(x86)}\\Microsoft\\Edge\\Application\\msedge.exe\", \"$env:ProgramFiles\\Microsoft\\Edge\\Application\\msedge.exe\", \"$env:LOCALAPPDATA\\Microsoft\\Edge\\Application\\msedge.exe\", \"$env:ProgramFiles\\Google\\Chrome\\Application\\chrome.exe\", \"${env:ProgramFiles(x86)}\\Google\\Chrome\\Application\\chrome.exe\", \"$env:LOCALAPPDATA\\Google\\Chrome\\Application\\chrome.exe\")\n  $app = $apps | Where-Object { Test-Path $_ } | Select-Object -First 1\n  $u = ([Uri]$o).AbsoluteUri\n  $b = Join-Path $env:LOCALAPPDATA 'DoodlePlayer\\browser'\n  if ($app) { Start-Process -FilePath $app -ArgumentList @(\"--app=$u\", \"--window-size=$w,$ht\", \"--user-data-dir=\"\"$b\"\"\", '--no-first-run', '--no-default-browser-check') } else { Start-Process $o }\n} catch {\n  Add-Type -AssemblyName PresentationFramework\n  [System.Windows.MessageBox]::Show('Sorry, this game could not start: ' + $_.Exception.Message, 'Doodle Player') | Out-Null\n}\n'@\n$k = 'HKCU:\\Software\\Classes'\nNew-Item -Path \"$k\\.doodle\" -Force -Value 'DoodleGame' | Out-Null\nNew-Item -Path \"$k\\DoodleGame\" -Force -Value 'Doodle game' | Out-Null\nNew-ItemProperty -Path \"$k\\DoodleGame\" -Name EditFlags -Value 0x10000 -PropertyType DWord -Force | Out-Null\nNew-Item -Path \"$k\\DoodleGame\\DefaultIcon\" -Force -Value \"$env:windir\\System32\\joy.cpl,0\" | Out-Null\nNew-Item -Path \"$k\\DoodleGame\\shell\\open\\command\" -Force -Value ('conhost.exe --headless powershell.exe -NoProfile -ExecutionPolicy Bypass -File \"' + $d + '\\play.ps1\" \"%1\"') | Out-Null\nWrite-Host 'Doodle Player is ready! Double-click any .doodle game to play it.' -ForegroundColor Green";
const PLAYER_REMOVE = "Remove-Item 'HKCU:\\Software\\Classes\\.doodle', 'HKCU:\\Software\\Classes\\DoodleGame' -Recurse -Force; Remove-Item (Join-Path $env:LOCALAPPDATA 'DoodlePlayer') -Recurse -Force";
function openExport() {
  commitPaint();
  if (!$('#exName').value) $('#exName').value = 'My Doodle Game';
  $('#exChoose').hidden = false; $('#exDoneApp').hidden = true; $('#exSetupBox').hidden = true;
  $('#exportModal').hidden = false;
  $('#exName').focus(); $('#exName').select();
}
function doExport() {
  const name = ($('#exName').value.trim() || 'My Doodle Game').replace(/[\\/:*?"<>|]/g, '');
  download(name + '.doodle', buildGameHTML(name, $('#exFull').checked), 'application/octet-stream');
  $('#exAppName').textContent = name + '.doodle';
  $('#exChoose').hidden = true; $('#exDoneApp').hidden = false;
}
$('#exportBtn').onclick = openExport;
$('#exGo').onclick = doExport;
$('#exCancel').onclick = () => { $('#exportModal').hidden = true; };
$('#exOk3').onclick = () => { $('#exportModal').hidden = true; };
$('#setupCode').textContent = PLAYER_SETUP;
$('#removeCode').textContent = PLAYER_REMOVE;
const copyText = (t, btn) => {
  const done = () => { const o = btn.textContent; btn.textContent = '✓ Copied!'; setTimeout(() => { btn.textContent = o; }, 1800); };
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(done, () => fallbackCopy(t, done)); else fallbackCopy(t, done);
};
function fallbackCopy(t, done) { const x = document.createElement('textarea'); x.value = t; document.body.appendChild(x); x.select(); try { document.execCommand('copy'); done(); } catch (e) {} x.remove(); }
$('#copySetup').onclick = () => copyText(PLAYER_SETUP, $('#copySetup'));
$('#copyRemove').onclick = () => copyText(PLAYER_REMOVE, $('#copyRemove'));
$('#exSetupLink').onclick = () => { $('#exSetupBox').hidden = !$('#exSetupBox').hidden; };
$('#exSetupLink2').onclick = () => { $('#exSetupBox').hidden = false; $('#exSetupBox').scrollIntoView({ block:'nearest' }); };
$('#exportModal').onclick = e => { if (e.target.id === 'exportModal') $('#exportModal').hidden = true; };
$('#exName').onkeydown = e => { if (e.key === 'Enter') doExport(); if (e.key === 'Escape') $('#exportModal').hidden = true; };

function loadAll() { loadStageSettings(); loadEditor(); refreshDesign(); updatePlayUI(); }
