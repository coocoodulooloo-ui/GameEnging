// =====================================================================
//  🖌️ PAINT STUDIO — draw costumes for sprites and backdrops
// =====================================================================
const pc = $('#pc'), pctx = pc.getContext('2d', { willReadFrequently:true });
const po = $('#pover'), poctx = po.getContext('2d');
const PT = {
  target:null, tool:'brush', color:'#ff4d8d', op:1, filled:false, mirror:false, grid:false, zoom:4,
  sizes:{ brush:8, pencil:1, eraser:12, fill:1, line:4, rect:4, ellipse:4, spray:14, picker:1, glow:10, rainbow:10, stamp:14 },
  undo:[], redo:[], down:false, pts:[], last:null, start:null, hue:0, sprayTimer:null, dirty:false, loading:null,
};
const SWATCHES = ['#000000','#ffffff','#8395a7','#576574','#1b1b2f','#e94560','#ff6b6b','#ff4d8d',
                  '#ff9f1a','#ffd32a','#ffcc99','#8b5a2b','#2ecc71','#1e8449','#7ed6df','#3867d6','#a55eea','#6c5ce7','#fd79a8','#00cec9','#fdcb6e','#e17055','#b2bec3','#2d3436'];

function paintOpen() {
  if (!PT.target || !project.costumes[PT.target]) {
    const first = costumeNames()[0] || Object.keys(project.costumes)[0];
    if (first) loadCostume(first); else newCostume(+$('#pNewSize').value || 64);
  } else { renderCostumeList(); fitZoom(); }
}
function blankURL(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c.toDataURL(); }
function uniqueCostume(base) { let n = 1; while (project.costumes[base + n]) n++; return base + n; }
async function loadCostume(name) {
  commitPaint();
  PT.target = name; PT.undo = []; PT.redo = [];
  const token = PT.loading = {};
  const img = new Image(); img.src = project.costumes[name];
  try { await img.decode(); } catch (e) {}
  if (PT.loading !== token) return;
  pc.width = po.width = img.naturalWidth || 64; pc.height = po.height = img.naturalHeight || 64;
  pctx.clearRect(0, 0, pc.width, pc.height); pctx.drawImage(img, 0, 0);
  $('#pName').value = name;
  fitZoom(); updatePaintInfo(); renderCostumeList();
}
function newCostume(size, name, w, h) {
  commitPaint();
  name = name || uniqueCostume('costume');
  project.costumes[name] = blankURL(w || size, h || size);
  save(); loadCostume(name); loadStageSettings();
  return name;
}
function commitPaint() {
  if (!PT.dirty || !PT.target || !project.costumes[PT.target]) return;
  PT.dirty = false;
  project.costumes[PT.target] = pc.toDataURL();
  save(); renderCostumeList();
  if (!playing) renderDesign();
}
function updatePaintInfo() { $('#pInfo').textContent = `${pc.width}×${pc.height}px · ${Math.round(PT.zoom * 100)}%`; }
function fitZoom() {
  const box = $('#pbox'), bw = box.clientWidth - 60, bh = box.clientHeight - 60;
  let z = Math.min(bw / pc.width, bh / pc.height);
  z = z >= 1 ? Math.min(32, Math.floor(z)) : Math.max(0.2, z);
  setZoom(z || 1);
}
function setZoom(z) {
  PT.zoom = z;
  const s = $('#pstack');
  s.style.width = pc.width * z + 'px'; s.style.height = pc.height * z + 'px';
  const g = $('#pgrid');
  g.style.display = PT.grid && z >= 4 ? 'block' : 'none';
  g.style.backgroundImage = 'linear-gradient(to right, rgba(0,0,0,.15) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,.15) 1px, transparent 1px)';
  g.style.backgroundSize = `${z}px ${z}px`;
  updatePaintInfo();
}
$('#pZoomIn').onclick = () => setZoom(PT.zoom < 1 ? Math.min(1, PT.zoom * 1.5) : Math.min(48, PT.zoom + (PT.zoom >= 8 ? 4 : 1)));
$('#pZoomOut').onclick = () => setZoom(PT.zoom <= 1 ? Math.max(0.2, PT.zoom / 1.5) : Math.max(1, PT.zoom - (PT.zoom > 8 ? 4 : 1)));
window.addEventListener('resize', () => { if (tab === 'paint') fitZoom(); });

// ---------- costume list ----------
function renderCostumeList() {
  const box = $('#costumeList');
  const bd = project.backdrop && project.costumes[project.backdrop] ? project.backdrop : null;
  let html = `<div class="cos bd ${PT.target && PT.target === bd ? 'on' : ''}" data-bd="1"><div class="th">${bd ? `<img src="${project.costumes[bd]}" alt="">` : '<span style="font-size:26px">🖼️</span>'}</div><div class="n">${bd ? 'Stage backdrop · ' + esc(bd) : 'Paint a stage backdrop'}</div></div>`;
  costumeNames().forEach(n => {
    html += `<div class="cos ${n === PT.target ? 'on' : ''}" data-cos="${esc(n)}"><div class="th"><img src="${project.costumes[n]}" alt=""></div><div class="n">${esc(n)}</div></div>`;
  });
  box.innerHTML = html;
  $$('#costumeList [data-cos]').forEach(el => el.onclick = () => loadCostume(el.dataset.cos));
  $('#costumeList [data-bd]').onclick = () => {
    if (bd) return loadCostume(bd);
    const name = project.costumes.backdrop ? uniqueCostume('backdrop') : 'backdrop';
    project.backdrop = name;
    newCostume(0, name, project.width, project.height);
    toast('🖼️ Painting the stage backdrop', 'ok');
  };
}
$('#pNew').onclick = () => { const s = +$('#pNewSize').value; newCostume(s); toast(`New ${s}×${s} costume`, 'ok'); };
$('#pDup').onclick = () => {
  if (!PT.target) return;
  commitPaint();
  const n = uniqueCostume(PT.target.replace(/\d+$/, ''));
  project.costumes[n] = project.costumes[PT.target];
  save(); loadCostume(n); loadStageSettings();
};
$('#pDel').onclick = () => {
  const n = PT.target; if (!n) return;
  if (!confirm(`Delete the costume "${n}"? Sprites using it will be empty.`)) return;
  PT.dirty = false;
  delete project.costumes[n];
  if (project.backdrop === n) project.backdrop = null;
  PT.target = null; save(); loadStageSettings(); renderDesign(); paintOpen();
};
$('#pName').onchange = e => {
  const v = e.target.value.trim(), old = PT.target;
  if (!old || v === old) return;
  if (!/^[A-Za-z_][\w-]*$/.test(v)) { toast('Costume names start with a letter and have no spaces.', 'bad'); e.target.value = old; return; }
  if (project.costumes[v]) { toast(`There's already a costume called "${v}".`, 'bad'); e.target.value = old; return; }
  commitPaint();
  const entries = Object.entries(project.costumes).map(([k, val]) => [k === old ? v : k, val]);
  project.costumes = Object.fromEntries(entries);
  project.objects.forEach(o => { if (o.costume === old) o.costume = v; });
  if (project.backdrop === old) project.backdrop = v;
  PT.target = v; save(); renderCostumeList(); loadStageSettings(); refreshDesign();
  toast(`Renamed to "${v}". Remember to update any "${old}" in your code.`);
};
$('#pUse').onclick = () => {
  if (!PT.target) return;
  commitPaint();
  if (PT.target === project.backdrop) { switchTab('design'); toast('This is your stage backdrop — it shows behind everything.'); return; }
  addObject('sprite', PT.target);
};

// ---------- tools UI ----------
function setTool(t) {
  PT.tool = t;
  $$('#tools [data-tool]').forEach(b => b.classList.toggle('on', b.dataset.tool === t));
  $('#pSize').value = PT.sizes[t] || 1; $('#pSizeV').textContent = PT.sizes[t] || 1;
  po.style.cursor = t === 'picker' ? 'copy' : t === 'fill' ? 'cell' : 'crosshair';
  updateBrushPrev();
}
function setColor(c) {
  PT.color = c; $('#pColor').value = c;
  $$('#swatches button').forEach(b => b.classList.toggle('on', b.dataset.c === c));
  updateBrushPrev();
}
function updateBrushPrev() {
  const s = Math.min(36, Math.max(2, PT.sizes[PT.tool] || 1)), i = $('#brushPrev i');
  i.style.width = i.style.height = s + 'px'; i.style.opacity = PT.op;
  i.style.background = PT.tool === 'rainbow' ? 'conic-gradient(red, yellow, lime, cyan, blue, magenta, red)' : PT.color;
  i.style.borderRadius = PT.tool === 'pencil' ? '2px' : '50%';
  i.style.boxShadow = PT.tool === 'glow' ? `0 0 10px ${PT.color}` : 'none';
}
$$('#tools [data-tool]').forEach(b => b.onclick = () => setTool(b.dataset.tool));
$('#swatches').innerHTML = SWATCHES.map(c => `<button data-c="${c}" style="background:${c}" title="${c}"></button>`).join('');
$$('#swatches button').forEach(b => b.onclick = () => setColor(b.dataset.c));
$('#pColor').oninput = e => setColor(e.target.value);
$('#pSize').oninput = e => { PT.sizes[PT.tool] = +e.target.value; $('#pSizeV').textContent = e.target.value; updateBrushPrev(); };
$('#pOp').oninput = e => { PT.op = e.target.value / 100; $('#pOpV').textContent = e.target.value + '%'; updateBrushPrev(); };
$('#pFilled').onchange = e => { PT.filled = e.target.checked; };
$('#pMirror').onchange = e => { PT.mirror = e.target.checked; };
$('#pGrid').onchange = e => { PT.grid = e.target.checked; setZoom(PT.zoom); };

// ---------- undo ----------
function pushUndo() {
  PT.undo.push(pctx.getImageData(0, 0, pc.width, pc.height));
  if (PT.undo.length > 40) PT.undo.shift();
  PT.redo = [];
}
function paintUndo() {
  if (!PT.undo.length) return toast('Nothing to undo');
  PT.redo.push(pctx.getImageData(0, 0, pc.width, pc.height));
  pctx.putImageData(PT.undo.pop(), 0, 0); PT.dirty = true; commitPaint();
}
function paintRedo() {
  if (!PT.redo.length) return toast('Nothing to redo');
  PT.undo.push(pctx.getImageData(0, 0, pc.width, pc.height));
  pctx.putImageData(PT.redo.pop(), 0, 0); PT.dirty = true; commitPaint();
}
$('#pUndo').onclick = paintUndo; $('#pRedo').onclick = paintRedo;
$('#pClear').onclick = () => { pushUndo(); pctx.clearRect(0, 0, pc.width, pc.height); PT.dirty = true; commitPaint(); };
$('#pFlipH').onclick = () => {
  pushUndo();
  const t = document.createElement('canvas'); t.width = pc.width; t.height = pc.height; t.getContext('2d').drawImage(pc, 0, 0);
  pctx.clearRect(0, 0, pc.width, pc.height); pctx.save(); pctx.translate(pc.width, 0); pctx.scale(-1, 1); pctx.drawImage(t, 0, 0); pctx.restore();
  PT.dirty = true; commitPaint();
};
$('#pImport').onclick = () => $('#imgIn').click();
$('#imgIn').onchange = async e => {
  const f = e.target.files[0]; e.target.value = ''; if (!f) return;
  const img = new Image(); img.src = URL.createObjectURL(f);
  try { await img.decode(); } catch (err) { return toast("Couldn't open that picture.", 'bad'); }
  pushUndo();
  const s = Math.min(pc.width / img.naturalWidth, pc.height / img.naturalHeight);
  const w = img.naturalWidth * s, h = img.naturalHeight * s;
  pctx.imageSmoothingEnabled = true; pctx.drawImage(img, (pc.width - w) / 2, (pc.height - h) / 2, w, h);
  PT.dirty = true; commitPaint(); toast('📥 Picture imported', 'ok');
};
function paintKey(e, ctrl, k) {
  if (ctrl && k === 'z') { e.preventDefault(); e.shiftKey ? paintRedo() : paintUndo(); return; }
  if (ctrl && k === 'y') { e.preventDefault(); paintRedo(); return; }
  if (ctrl) return;
  const map = { b:'brush', p:'pencil', e:'eraser', f:'fill', l:'line', r:'rect', o:'ellipse', s:'spray', i:'picker' };
  if (map[k]) setTool(map[k]);
  if (k === '[') { PT.sizes[PT.tool] = Math.max(1, (PT.sizes[PT.tool] || 1) - 1); setTool(PT.tool); }
  if (k === ']') { PT.sizes[PT.tool] = Math.min(80, (PT.sizes[PT.tool] || 1) + 1); setTool(PT.tool); }
}

// ---------- drawing ----------
const mirrorPt = q => ({ x:pc.width - q.x, y:q.y });
const ptOf = e => canvasPoint(po, e);
const size = () => PT.sizes[PT.tool] || 1;
function strokePts(ctx, pts) {
  ctx.beginPath();
  pts.forEach((q, i) => i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y));
  if (pts.length === 1) ctx.lineTo(pts[0].x + 0.01, pts[0].y);
  ctx.stroke();
}
function drawBrushOverlay() {
  const c = poctx;
  c.clearRect(0, 0, po.width, po.height);
  c.lineCap = 'round'; c.lineJoin = 'round'; c.lineWidth = size();
  const paths = [PT.pts]; if (PT.mirror) paths.push(PT.pts.map(mirrorPt));
  for (const pts of paths) {
    if (PT.tool === 'rainbow') {
      for (let i = 0; i < pts.length; i++) {
        c.strokeStyle = `hsl(${(PT.hue + i * 6) % 360},95%,58%)`;
        strokePts(c, i ? [pts[i - 1], pts[i]] : [pts[0]]);
      }
    } else {
      c.strokeStyle = PT.color;
      if (PT.tool === 'glow') { c.shadowBlur = size() * 1.6; c.shadowColor = PT.color; }
      strokePts(c, pts);
      if (PT.tool === 'glow') { c.shadowBlur = 0; c.strokeStyle = 'rgba(255,255,255,.75)'; c.lineWidth = Math.max(1, size() / 3); strokePts(c, pts); c.lineWidth = size(); }
    }
  }
}
function pencilLine(a, b) {
  const s = size(), o = Math.floor(s / 2);
  pctx.save(); pctx.globalAlpha = PT.op; pctx.fillStyle = PT.color;
  const plot = (x, y) => { pctx.fillRect(x - o, y - o, s, s); if (PT.mirror) pctx.fillRect(pc.width - 1 - x - o + (s % 2 ? 0 : 1), y - o, s, s); };
  let x0 = Math.floor(a.x), y0 = Math.floor(a.y); const x1 = Math.floor(b.x), y1 = Math.floor(b.y);
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1; let err = dx + dy;
  for (let n = 0; n < 5000; n++) {
    plot(x0, y0);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x0 += sx; }
    if (e2 <= dx) { err += dx; y0 += sy; }
  }
  pctx.restore();
}
function eraseLine(a, b) {
  pctx.save(); pctx.globalCompositeOperation = 'destination-out';
  pctx.lineCap = 'round'; pctx.lineWidth = size(); pctx.strokeStyle = '#000';
  strokePts(pctx, [a, b]); if (PT.mirror) strokePts(pctx, [mirrorPt(a), mirrorPt(b)]);
  pctx.restore();
}
function spray(p) {
  const r = size(), n = Math.ceil(r * 1.2);
  pctx.save(); pctx.globalAlpha = PT.op; pctx.fillStyle = PT.color;
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, d = Math.random() * r;
    const x = p.x + Math.cos(a) * d, y = p.y + Math.sin(a) * d;
    pctx.fillRect(x, y, 1, 1); if (PT.mirror) pctx.fillRect(pc.width - x, y, 1, 1);
  }
  pctx.restore();
}
function shapePath(c, a, b) {
  c.beginPath();
  if (PT.tool === 'line') { c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); }
  else if (PT.tool === 'rect') c.rect(Math.min(a.x, b.x), Math.min(a.y, b.y), Math.abs(b.x - a.x), Math.abs(b.y - a.y));
  else c.ellipse((a.x + b.x) / 2, (a.y + b.y) / 2, Math.abs(b.x - a.x) / 2, Math.abs(b.y - a.y) / 2, 0, 0, Math.PI * 2);
}
function drawShape(c, a, b) {
  c.lineWidth = size(); c.lineCap = 'round'; c.lineJoin = 'round'; c.strokeStyle = c.fillStyle = PT.color;
  const one = (p, q) => { shapePath(c, p, q); if (PT.filled && PT.tool !== 'line') c.fill(); else c.stroke(); };
  one(a, b); if (PT.mirror) one(mirrorPt(a), mirrorPt(b));
}
function stampStar(p) {
  const r = size(), one = q => {
    pctx.beginPath();
    for (let k = 0; k < 10; k++) { const an = -Math.PI / 2 + k * Math.PI / 5, rr = k % 2 ? r * 0.45 : r; pctx.lineTo(q.x + Math.cos(an) * rr, q.y + Math.sin(an) * rr); }
    pctx.closePath(); pctx.fill();
  };
  pctx.save(); pctx.globalAlpha = PT.op; pctx.fillStyle = PT.color; one(p); if (PT.mirror) one(mirrorPt(p)); pctx.restore();
}
function hexToRgb(h) { const n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
function floodFill(x, y) {
  const W = pc.width, H = pc.height;
  x = Math.floor(x); y = Math.floor(y);
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const img = pctx.getImageData(0, 0, W, H), d = img.data;
  const [r, g, b] = hexToRgb(PT.color), a = Math.round(PT.op * 255);
  const i0 = (y * W + x) * 4, tr = d[i0], tg = d[i0 + 1], tb = d[i0 + 2], tA = d[i0 + 3];
  if (tr === r && tg === g && tb === b && tA === a) return;
  const match = i => Math.abs(d[i] - tr) + Math.abs(d[i + 1] - tg) + Math.abs(d[i + 2] - tb) + Math.abs(d[i + 3] - tA) <= 48;
  const seen = new Uint8Array(W * H), stack = [y * W + x];
  while (stack.length) {
    const p = stack.pop(); if (seen[p]) continue; seen[p] = 1;
    const i = p * 4; if (!match(i)) continue;
    d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = a;
    const px = p % W;
    if (px > 0) stack.push(p - 1); if (px < W - 1) stack.push(p + 1);
    if (p >= W) stack.push(p - W); if (p < W * (H - 1)) stack.push(p + W);
  }
  pctx.putImageData(img, 0, 0);
}

po.addEventListener('pointerdown', e => {
  if (!PT.target) return;
  e.preventDefault(); po.setPointerCapture(e.pointerId);
  const p = ptOf(e), t = PT.tool;
  if (t === 'picker') {
    const d = pctx.getImageData(Math.floor(p.x), Math.floor(p.y), 1, 1).data;
    if (d[3] === 0) return toast('That spot is see-through');
    setColor('#' + [d[0], d[1], d[2]].map(v => v.toString(16).padStart(2, '0')).join('')); setTool('brush'); return;
  }
  pushUndo();
  if (t === 'fill') { floodFill(p.x, p.y); if (PT.mirror) floodFill(pc.width - 1 - p.x, p.y); PT.dirty = true; commitPaint(); return; }
  if (t === 'stamp') { stampStar(p); PT.dirty = true; commitPaint(); return; }
  PT.down = true; PT.pts = [p]; PT.start = p; PT.last = p; PT.hue = (PT.hue + 40) % 360;
  po.style.opacity = ['brush', 'glow', 'rainbow', 'line', 'rect', 'ellipse'].includes(t) ? PT.op : 1;
  if (t === 'pencil') pencilLine(p, p);
  else if (t === 'eraser') eraseLine(p, p);
  else if (t === 'spray') { spray(p); PT.sprayTimer = setInterval(() => spray(PT.last), 30); }
  else if (t === 'brush' || t === 'glow' || t === 'rainbow') drawBrushOverlay();
});
po.addEventListener('pointermove', e => {
  if (!PT.down) return;
  const p = ptOf(e), t = PT.tool;
  if (t === 'pencil') pencilLine(PT.last, p);
  else if (t === 'eraser') eraseLine(PT.last, p);
  else if (t === 'spray') spray(p);
  else if (t === 'brush' || t === 'glow' || t === 'rainbow') { PT.pts.push(p); drawBrushOverlay(); }
  else { poctx.clearRect(0, 0, po.width, po.height); drawShape(poctx, PT.start, p); }
  PT.last = p;
});
function endStroke(e) {
  if (!PT.down) return;
  PT.down = false; clearInterval(PT.sprayTimer);
  const t = PT.tool;
  if (['brush', 'glow', 'rainbow'].includes(t)) { pctx.save(); pctx.globalAlpha = PT.op; pctx.drawImage(po, 0, 0); pctx.restore(); }
  else if (['line', 'rect', 'ellipse'].includes(t)) { pctx.save(); pctx.globalAlpha = PT.op; drawShape(pctx, PT.start, e ? ptOf(e) : PT.last); pctx.restore(); }
  poctx.clearRect(0, 0, po.width, po.height); po.style.opacity = 1;
  PT.dirty = true; commitPaint();
}
po.addEventListener('pointerup', endStroke);
po.addEventListener('pointercancel', () => endStroke());
