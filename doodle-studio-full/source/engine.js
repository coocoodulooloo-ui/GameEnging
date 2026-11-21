// =====================================================================
//  DOODLE ENGINE v2 — tokenizer, parser, interpreter, physics, sound,
//  particles and rendering. This whole script is copied into exported games.
// =====================================================================
const KEYMAP = { arrowleft:'left', arrowright:'right', arrowup:'up', arrowdown:'down', ' ':'space', spacebar:'space',
  enter:'enter', escape:'escape', shift:'shift', control:'ctrl', alt:'alt', tab:'tab', backspace:'backspace' };
function normKey(k) { k = String(k).toLowerCase(); return KEYMAP[k] || k; }
function DErr(line, msg) { const e = new Error(msg); e.line = line; return e; }
function fmt(v) {
  if (v && v.fn) return '(function)';
  if (typeof v === 'number') return Number.isInteger(v) ? String(v) : String(Math.round(v * 100) / 100);
  if (Array.isArray(v)) return '[' + v.map(fmt).join(', ') + ']';
  if (v && typeof v === 'object') return '{' + Object.entries(v).map(([k, x]) => k + ': ' + fmt(x)).join(', ') + '}';
  if (v === undefined || v === null) return '';
  return String(v);
}
function truthy(v) { return !(v === 0 || v === '' || v === false || v == null || (typeof v === 'number' && isNaN(v))); }
const clampN = (v, a, b) => Math.min(Math.max(v, a), b);
const cmpVals = (a, b) => typeof a === 'number' && typeof b === 'number' ? a - b : fmt(a).localeCompare(fmt(b));

// The Doodle vocabulary. Art-studio words for drawing, friendly words for logic.
const COMMANDS = new Set([
  'paper','wash','paint','ink','blend','brush','letters','align','fade','glow','pin',
  'circle','oval','box','roundbox','line','triangle','poly','star','arc','write','sticker',
  'say','beep','play','note','tune',
  'add','drop','put','sort','shuffle',
  'show','hide','nudge','place','face','step','wrap','fence','bounce','erase','pop',
  'gravity','camera','follow','world','shake','flash','sparkle','backdrop',
  'save','stop',
  // v3
  'go','talk','weather','dark','light','trails','music','volume','zoom',
  'heart','dot','shape','emoji','bar','spin','grow','front','back','launch','chase','flee','orbit','wander','cycle','calm',
  'insert','empty','restart',
  // v4
  'controls','action','tile','build','sortby',
  // v5
  'send','typewrite','patrol','bob','pulse','trail','shoot',
  // v6
  'fail','speak','turtle','walk','turn','penup','pendown','jump','boost','bounceoff',
]);
// v5 command names: if a project already taught its own command with one of these names, the taught one wins
const V5_COMMANDS = new Set(['send','typewrite','patrol','bob','pulse','trail','shoot','fail','speak','turtle','walk','turn','penup','pendown','jump','boost','bounceoff']);
// older spellings still work, so projects made with earlier versions keep running
const ALIASES = {
  canvas:'paper', background:'wash', clear:'wash', color:'ink', fill:'paint', gradient:'blend', thick:'brush', font:'letters',
  alpha:'fade', shadow:'glow', hud:'pin', rect:'box', rrect:'roundbox', polygon:'poly', text:'write', stamp:'sticker',
  print:'say', sound:'play', push:'add', remove:'drop', move:'nudge', pointat:'face', forward:'step', keepin:'fence',
  destroy:'erase', explode:'pop', particles:'sparkle', store:'save',
};
const DOODLE_WORDS = {
  control:['if','but','otherwise','done','loop','each','in','as','times','while','until','from','by','escape','teach','give','wait','try','copy','ask','is','isnt','touches','and','or','not','yes','no','match','case','make','glide','animate','to','watch','choose','skip','me'],
  events:['when','start','key','click','forever','every','later','any','during','go','get','release'],
};
const SPECIAL_WORDS = [...DOODLE_WORDS.control, ...DOODLE_WORDS.events];
const BREAK = { brk:1 }, HALT = { halt:1 }, SKIP = { skip:1 };
const OPENERS = /^(if|loop|repeat|for|while|when|on|forever|every|later|after|teach|function|match|during|try)\b/i;

// ---------------- tokenizer ----------------
function tokenize(src, ln) {
  const T = []; let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (/\s/.test(c)) { i++; continue; }
    if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(src[i + 1] || ''))) {
      let j = i; while (j < src.length && /[0-9.]/.test(src[j])) j++;
      T.push({ t:'num', v:parseFloat(src.slice(i, j)) }); i = j; continue;
    }
    if (c === '@') {
      let j = i + 1; while (j < src.length && /[A-Za-z0-9_.]/.test(src[j])) j++;
      if (j === i + 1 || !/[A-Za-z_]/.test(src[i + 1])) throw DErr(ln, 'after @ write the name of a thing on the stage, like  @player');
      T.push({ t:'obj', v:src.slice(i + 1, j) }); i = j; continue;
    }
    if (/[A-Za-z_]/.test(c)) {
      let j = i; while (j < src.length && /[A-Za-z0-9_.]/.test(src[j])) j++;
      const w = src.slice(i, j), lw = w.toLowerCase();
      if (lw === 'and' || lw === 'or' || lw === 'not' || lw === 'touches') T.push({ t:lw });
      else if (lw === 'is') T.push({ t:'==' });
      else if (lw === 'isnt') T.push({ t:'!=' });
      else T.push({ t:'id', v:w });
      i = j; continue;
    }
    if (c === '#') {
      let j = i + 1; while (j < src.length && /[0-9a-fA-F]/.test(src[j])) j++;
      T.push({ t:'str', v:src.slice(i, j) }); i = j; continue;
    }
    if (c === '"' || c === "'") {
      let j = i + 1; while (j < src.length && src[j] !== c) j++;
      if (j >= src.length) throw DErr(ln, 'missing the closing quote ' + c);
      const raw = src.slice(i + 1, j);
      if (/\{[^}]+\}/.test(raw)) {
        const parts = []; let k = 0;
        for (const m of raw.matchAll(/\{([^}]+)\}/g)) { if (m.index > k) parts.push(raw.slice(k, m.index)); parts.push({ src:m[1] }); k = m.index + m[0].length; }
        if (k < raw.length) parts.push(raw.slice(k));
        T.push({ t:'tpl', parts });
      } else T.push({ t:'str', v:raw });
      i = j + 1; continue;
    }
    const two = src.substr(i, 2);
    if (['==','!=','<=','>=','->'].includes(two)) { T.push({ t:two }); i += 2; continue; }
    if ('+-*/%(),<>=[]{}:'.includes(c)) { T.push({ t:c }); i++; continue; }
    throw DErr(ln, `I don't understand the character "${c}"`);
  }
  return T;
}

// ---------------- expressions (tokens -> tree) ----------------
function compileList(toks, ln) {
  let p = 0;
  const peek = () => toks[p], next = () => toks[p++], is = t => peek() && peek().t === t;
  const expect = t => { if (!is(t)) throw DErr(ln, `expected "${t}"`); next(); };
  const or = () => { let a = and(); while (is('or')) { next(); a = { k:'or', a, b:and() }; } return a; };
  const and = () => { let a = not(); while (is('and')) { next(); a = { k:'and', a, b:not() }; } return a; };
  const not = () => { if (is('not')) { next(); return { k:'not', a:not() }; } return cmp(); };
  const cmp = () => {
    let a = add();
    while (peek() && ['==','!=','<','>','<=','>=','=','touches'].includes(peek().t)) {
      let op = next().t; if (op === '=') op = '==';
      a = { k:'bin', op, a, b:add() };
    }
    return a;
  };
  const add = () => { let a = mul(); while (is('+') || is('-')) { const op = next().t; a = { k:'bin', op, a, b:mul() }; } return a; };
  const mul = () => { let a = unary(); while (is('*') || is('/') || is('%')) { const op = next().t; a = { k:'bin', op, a, b:unary() }; } return a; };
  const unary = () => { if (is('-')) { next(); return { k:'neg', a:unary() }; } if (is('+')) { next(); return unary(); } return postfix(); };
  const postfix = () => {
    let v = primary();
    while (is('[')) { next(); const i = or(); expect(']'); v = { k:'idx', a:v, i }; }
    return v;
  };
  const primary = () => {
    const tk = next();
    if (!tk) throw DErr(ln, 'something is missing at the end of the line');
    if (tk.t === 'num' || tk.t === 'str') return { k:'lit', v:tk.v };
    if (tk.t === 'tpl') return { k:'tpl', parts:tk.parts.map(p => typeof p === 'string' ? p : compile1(p.src, ln)) };
    if (tk.t === '(') {
      // a function value:  (n -> n * 2)   (a, b -> a + b)   ( -> 5)
      const save = p, params = [];
      while (is('id')) { params.push(next().v); if (is(',')) next(); else break; }
      if (is('->')) {
        next(); const body = or(); expect(')');
        return { k:'fn', params, body };
      }
      p = save;
      const v = or(); expect(')'); return v;
    }
    if (tk.t === '[') {
      const items = [];
      if (!is(']')) { items.push(or()); while (is(',')) { next(); items.push(or()); } }
      expect(']');
      return { k:'list', items };
    }
    if (tk.t === 'obj') return tk.v.includes('.') ? { k:'var', name:tk.v } : { k:'obj', name:tk.v };
    if (tk.t === '{') {
      const entries = [];
      while (!is('}')) {
        const key = next();
        if (!key || (key.t !== 'id' && key.t !== 'str' && key.t !== 'num')) throw DErr(ln, 'a record looks like:  { name: "Sam", hp: 10 }');
        expect(':'); entries.push([String(key.v), or()]);
        if (is(',')) next(); else break;
      }
      expect('}');
      return { k:'rec', entries };
    }
    if (tk.t === 'id') {
      if (is('(')) {
        next(); const args = [];
        if (!is(')')) { args.push(or()); while (is(',')) { next(); args.push(or()); } }
        expect(')');
        const name = tk.v.toLowerCase();
        if (!FUNCS[name]) { const node = { k:'ucall', name, args, ln, shown:tk.v }; UCALLS.push(node); return node; }
        return { k:'call', name, args };
      }
      return { k:'var', name:tk.v };
    }
    throw DErr(ln, `didn't expect "${tk.t}" here`);
  };
  const out = [];
  if (!toks.length) return out;
  out.push(or());
  while (is(',')) { next(); out.push(or()); }
  if (p < toks.length) throw DErr(ln, 'extra stuff at the end of the line (missing a comma?)');
  return out;
}
let UCALLS = [];
function compile1(src, ln) {
  const l = compileList(tokenize(src, ln), ln);
  if (l.length !== 1) throw DErr(ln, 'expected one value here');
  return l[0];
}

// ---------------- program (lines -> blocks) ----------------
function stripComment(s) {
  let q = null;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (q) { if (c === q) q = null; }
    else if (c === '"' || c === "'") q = c;
    else if (c === '~' || (c === '/' && s[i + 1] === '/')) return s.slice(0, i);
  }
  return s;
}
function splitArrow(s) {
  let q = null, d = 0;
  for (let i = 0; i < s.length - 1; i++) {
    const c = s[i];
    if (q) { if (c === q) q = null; }
    else if (c === '"' || c === "'") q = c;
    else if ('([{'.includes(c)) d++;
    else if (')]}'.includes(c)) d--;
    else if (c === '-' && s[i + 1] === '>' && d <= 0) return [s.slice(0, i).trim(), s.slice(i + 2).trim()];
  }
  return null;
}
function parseProgram(src) {
  const prog = { main:[], start:[], frame:[], keys:{}, click:[], clickObj:{}, every:[], funcs:{}, during:{}, enter:{}, msgs:{}, keyup:{}, touch:[] };
  UCALLS = [];
  const stack = [{ body:prog.main, node:null }];
  const pending = [], assigned = new Set(), v5nodes = [];
  const lines = src.split('\n');
  const secs = s => s.replace(/\s*(s|sec|secs|seconds?)$/i, '').trim();

  const handle = (line, ln) => {
    const arrow = splitArrow(line);
    if (arrow) {
      if (!OPENERS.test(arrow[0])) throw DErr(ln, '"->" only works after a block word, like:  if score > 9 -> play "win"');
      if (!arrow[1]) throw DErr(ln, 'write one command after "->"');
      const depth = stack.length;
      handle(arrow[0], ln);
      if (stack.length !== depth + 1) throw DErr(ln, '"->" can\'t be used here');
      handle(arrow[1], ln);
      if (stack.length !== depth + 1) throw DErr(ln, 'after "->" you can only write one simple command');
      stack.pop(); return;
    }
    const top = stack[stack.length - 1];
    const first = (line.match(/^@?[A-Za-z_][\w.]*/) || [''])[0];
    if (!first) throw DErr(ln, 'a line should start with a command word');
    const word = first.toLowerCase(), rest = line.slice(first.length).trim();
    const open = (node, kind) => { top.body.push(node); stack.push({ body:node.body, node, kind, ln }); };
    const topOpen = (body, kind) => {
      if (stack.length !== 1) throw DErr(ln, `"${kind}" blocks go at the top, not inside other blocks`);
      stack.push({ body, node:{ cmd:'on' }, kind, ln });
    };
    const every = arg => {
      const s = parseFloat(secs(arg));
      if (!(s > 0)) throw DErr(ln, 'how often? like:  every 2s');
      const body = []; prog.every.push({ secs:s, body });
      topOpen(body, 'every');
    };

    // ---- closing and branching ----
    if (word === 'done' || word === 'end') {
      if (rest) throw DErr(ln, `"${word}" goes on a line by itself`);
      if (stack.length === 1) throw DErr(ln, 'this "done" has nothing to close');
      stack.pop(); return;
    }
    if (word === 'case') {
      if (!top.node || top.node.cmd !== 'match' || top.node.els) throw DErr(ln, '"case" must be inside a "match" block');
      if (!rest) throw DErr(ln, 'which values? like:  case 1, 2');
      const c = { vals:compileList(tokenize(rest, ln), ln), body:[] };
      top.node.cases.push(c); top.body = c.body; return;
    }
    if ((word === 'otherwise' || word === 'else') && !rest && top.node && (top.node.cmd === 'match' || top.node.cmd === 'try')) {
      if (top.node.els) throw DErr(ln, `this "${top.node.cmd}" already has an "otherwise"`);
      top.node.els = []; top.body = top.node.els; return;
    }
    if (word === 'otherwise' || word === 'else' || (word === 'but' && /^if\b/i.test(rest))) {
      const label = word === 'but' ? 'but if' : word;
      if (!top.node || top.node.cmd !== 'if' || top.node.els) throw DErr(ln, `"${label}" must be inside an "if" block, before its "done"`);
      let cond = null;
      if (word === 'but') cond = rest.replace(/^if\s*/i, '');
      else if (rest) { const m = rest.match(/^if\s+(.+)$/i); if (!m) throw DErr(ln, 'write "otherwise" by itself, or use "but if …"'); cond = m[1]; }
      if (cond !== null) {
        if (!cond) throw DErr(ln, '"but if" needs something to check, like:  but if score > 5');
        const node = { cmd:'if', ln, cond:compile1(cond, ln), body:[], els:null };
        top.node.els = [node]; top.node = node; top.body = node.body; return;
      }
      top.node.els = []; top.body = top.node.els; return;
    }

    // ---- changing values:  score = 0   @player.x += 5 ----
    const am = line.match(/^(?:(?:let|set)\s+)?@?([A-Za-z_][\w.]*)\s*([+\-*/]?)=(?!=)\s*(.+)$/i);
    if (am && !/^(if|but|loop|while|when|every|later|teach|forever|match|during|make|glide|animate|watch|wait|give|try)$/.test(word)) {
      assigned.add(am[1].toLowerCase());
      top.body.push({ cmd:'=', ln, name:am[1], op:am[2], expr:compile1(am[3], ln) }); return;
    }
    if (word === 'let' || word === 'set') throw DErr(ln, 'just write it like:  score = 0');

    // ---- events ----
    if (word === 'when' || word === 'on') {
      const tm = rest.match(/^@([A-Za-z_]\w*)\s+(?:touches|hits|meets)\s+@?([A-Za-z_]\w*)$/i);
      if (tm) { const body = []; prog.touch.push({ a:tm[1], b:tm[2], body }); return topOpen(body, 'when @' + tm[1] + ' touches @' + tm[2]); }
      const m = rest.match(/^(\w+)\s*(.*)$/);
      if (!m) throw DErr(ln, 'write: when start, when key space, or when click');
      let ev = m[1].toLowerCase(); const arg = m[2].replace(/["'@]/g, '').trim();
      if (ev === 'ready') ev = 'start';
      if (ev === 'go') {
        if (!arg) throw DErr(ln, 'which scene? like:  when go menu');
        const body = prog.enter[arg] = prog.enter[arg] || [];
        return topOpen(body, 'when go ' + arg);
      }
      if (ev === 'start') return topOpen(prog.start, 'when start');
      if (ev === 'get' || ev === 'hear') {
        if (!arg) throw DErr(ln, 'which message? like:  when get "boom"');
        const body = prog.msgs[arg.toLowerCase()] = prog.msgs[arg.toLowerCase()] || [];
        return topOpen(body, 'when get ' + arg);
      }
      if (ev === 'release' || ev === 'letgo') {
        const k = normKey(arg.replace(/^key\s+/i, ''));
        if (!k) throw DErr(ln, 'which key? like:  when release space');
        const body = prog.keyup[k] = prog.keyup[k] || [];
        return topOpen(body, 'when release ' + k);
      }
      if (ev === 'frame') return topOpen(prog.frame, 'forever');
      if (ev === 'every') return every(arg);
      if (ev === 'click' || ev === 'clicked') {
        if (!arg) return topOpen(prog.click, 'when click');
        const body = prog.clickObj[arg] = prog.clickObj[arg] || [];
        return topOpen(body, 'when click @' + arg);
      }
      if (ev === 'key' || ev === 'any') {
        const k = ev === 'any' ? 'any' : normKey(arg);
        if (!k) throw DErr(ln, 'which key? like:  when key space');
        const body = prog.keys[k] = prog.keys[k] || [];
        return topOpen(body, 'when key ' + k);
      }
      throw DErr(ln, `"${word} ${m[1]}" isn't an event. Try: when start, when key space, when release space, when click, when get "boom", when @hero touches @coin, forever, every 2s`);
    }
    if (word === 'forever') { if (rest) throw DErr(ln, '"forever" goes on a line by itself'); return topOpen(prog.frame, 'forever'); }
    if (word === 'during') {
      const nm = rest.replace(/["']/g, '').trim();
      if (!nm) throw DErr(ln, 'which scene? like:  during menu');
      const body = prog.during[nm] = prog.during[nm] || [];
      return topOpen(body, 'during ' + nm);
    }
    if (word === 'match') {
      if (!rest) throw DErr(ln, 'match what? like:  match level');
      const node = { cmd:'match', ln, subj:compile1(rest, ln), cases:[], els:null, body:[] };
      top.body.push(node); stack.push({ body:node.body, node, kind:'match', ln }); return;
    }
    if (word === 'make') {
      const m = rest.match(/^(\w+)\s+@?([A-Za-z_]\w*)\s*,\s*(.+)$/);
      if (!m) throw DErr(ln, 'write it like:  make box @wall, 100, 200, 80, 20, gray');
      const kinds = { box:'rect', rect:'rect', circle:'circle', star:'star', triangle:'triangle', words:'text', text:'text', sprite:'sprite' };
      const kind = kinds[m[1].toLowerCase()];
      if (!kind) throw DErr(ln, `I can't make a "${m[1]}". Try: box, circle, star, triangle, words, sprite`);
      top.body.push({ cmd:'make', ln, kind, name:m[2], args:compileList(tokenize(m[3], ln), ln) }); return;
    }
    if (word === 'glide' || word === 'animate') {
      const m = rest.match(/^(.+?)\s+to\s+(.+?)(?:\s+in\s+(.+))?$/i);
      if (!m) throw DErr(ln, word === 'glide' ? 'write it like:  glide @coin to 300, 200 in 1s' : 'write it like:  animate @coin.angle to 360 in 2s');
      const dur = m[3] ? compile1(secs(m[3]), ln) : { k:'lit', v:1 };
      if (word === 'glide') {
        const to = compileList(tokenize(m[2], ln), ln);
        if (to.length !== 2) throw DErr(ln, 'glide needs an x and a y, like:  glide @coin to 300, 200 in 1s');
        top.body.push({ cmd:'tween', ln, target:compile1(m[1], ln), props:['x', 'y'], to, dur }); return;
      }
      const t = m[1].match(/^(@?[A-Za-z_]\w*)\.(\w+)$/);
      if (!t) throw DErr(ln, 'say which property, like:  animate @coin.angle to 360 in 2s');
      top.body.push({ cmd:'tween', ln, target:compile1(t[1].startsWith('@') ? t[1] : '@' + t[1], ln), props:[t[2]], to:[compile1(m[2], ln)], dur }); return;
    }
    if (word === 'watch') {
      const names = rest.split(',').map(x => x.trim().replace(/^@/, '')).filter(Boolean);
      top.body.push({ cmd:'watch', ln, names }); return;
    }
    if (word === 'every') return every(rest);
    if (word === 'later' || word === 'after') {
      if (!rest) throw DErr(ln, 'how much later? like:  later 2s');
      return open({ cmd:'after', ln, delay:compile1(secs(rest), ln), body:[] }, 'later');
    }

    // ---- your own commands ----
    if (word === 'teach' || word === 'function') {
      const m = rest.match(/^([A-Za-z_]\w*)\s*(.*)$/);
      if (!m) throw DErr(ln, 'give your new command a name, like:  teach jump');
      if ((COMMANDS.has(m[1].toLowerCase()) && !V5_COMMANDS.has(m[1].toLowerCase())) || ALIASES[m[1].toLowerCase()]) throw DErr(ln, `"${m[1]}" is already a Doodle command — pick another name`);
      const params = m[2] ? m[2].split(',').map(s => s.trim()) : [];
      for (const p of params) { if (!/^[A-Za-z_]\w*$/.test(p)) throw DErr(ln, `"${p}" can't be an input name`); assigned.add(p.toLowerCase()); }
      const f = { params, body:[] };
      prog.funcs[m[1].toLowerCase()] = f;
      return topOpen(f.body, 'teach');
    }

    // ---- loops & decisions ----
    if (word === 'loop' || word === 'repeat' || word === 'for' || word === 'while') {
      const r = word === 'for' ? 'each ' + rest : word === 'while' ? 'while ' + rest : rest;
      let m;
      if ((m = r.match(/^each\s+@?([A-Za-z_]\w*)(?:\s*,\s*([A-Za-z_]\w*))?\s+in\s+(.+)$/i))) assigned.add(m[1].toLowerCase());
      if (m) return open({ cmd:'for', ln, v:m[1], iv:m[2] || null, list:compile1(m[3], ln), body:[] }, 'loop');
      if ((m = r.match(/^([A-Za-z_]\w*)\s+from\s+(.+?)\s+to\s+(.+?)(?:\s+by\s+(.+))?$/i))) return open({ cmd:'span', ln, v:m[1], from:compile1(m[2], ln), to:compile1(m[3], ln), by:m[4] ? compile1(m[4], ln) : null, body:[] }, 'loop');
      if ((m = r.match(/^while\s+(.+)$/i))) return open({ cmd:'while', ln, cond:compile1(m[1], ln), body:[], els:null }, 'loop');
      if ((m = r.match(/^until\s+(.+)$/i))) return open({ cmd:'while', ln, cond:{ k:'not', a:compile1(m[1], ln) }, body:[], els:null }, 'loop');
      m = r.match(/^(.+?)(?:\s+times)?(?:\s+as\s+@?([A-Za-z_]\w*))?$/i);
      if (!m || !m[1]) throw DErr(ln, 'how many times? like:  loop 5 as i');
      return open({ cmd:'repeat', ln, count:compile1(m[1], ln), v:m[2] || 'i', body:[] }, 'loop');
    }
    if (word === 'if') {
      if (!rest) throw DErr(ln, '"if" needs something to check, like:  if score > 10');
      return open({ cmd:'if', ln, cond:compile1(rest, ln), body:[], els:null }, 'if');
    }
    if (word === 'try') {
      if (rest) throw DErr(ln, '"try" goes on a line by itself');
      return open({ cmd:'try', ln, body:[], els:null }, 'try');
    }
    if (word === 'escape' || word === 'break') { top.body.push({ cmd:'break', ln }); return; }
    if ((word === 'skip' || word === 'continue') && !rest) { top.body.push({ cmd:'skip', ln }); return; }
    if (word === 'give' || word === 'return') { top.body.push({ cmd:'give', ln, expr:rest ? compile1(rest, ln) : null }); return; }
    if (word === 'wait') {
      if (!rest) throw DErr(ln, 'how long? like:  wait 1s   or   wait until @door.visible');
      const m = rest.match(/^until\s+(.+)$/i);
      if (m) { top.body.push({ cmd:'waituntil', ln, cond:compile1(m[1], ln) }); return; }
      top.body.push({ cmd:'wait', ln, delay:compile1(secs(rest), ln) }); return;
    }
    if (word === 'copy' || word === 'clone') {
      const m = rest.match(/^(.+?)(?:\s+as\s+@?([A-Za-z_]\w*))?$/i);
      if (!m || !m[1]) throw DErr(ln, 'write it like:  copy @coin as c');
      top.body.push({ cmd:'clone', ln, src:compile1(m[1], ln), v:m[2] || null }); return;
    }
    if (word === 'ask') {
      const m = rest.match(/^(.*),\s*@?([A-Za-z_]\w*)$/);
      if (!m) throw DErr(ln, 'write it like:  ask "What is your name?", name');
      top.body.push({ cmd:'ask', ln, q:compile1(m[1], ln), v:m[2] }); return;
    }
    if (word === 'choose') {
      const m = rest.match(/^(.*),\s*@?([A-Za-z_]\w*)$/);
      if (!m) throw DErr(ln, 'write it like:  choose "Open the door?", ["Yes", "No"], answer');
      const args = compileList(tokenize(m[1], ln), ln);
      if (args.length < 2) throw DErr(ln, 'give a question and a list of choices, like:  choose "Which way?", ["Left", "Right"], way');
      assigned.add(m[2].toLowerCase());
      top.body.push({ cmd:'choose', ln, args, v:m[2] }); return;
    }
    if (word === 'call') {
      const m = rest.match(/^([A-Za-z_]\w*)\s*,?\s*(.*)$/);
      if (!m) throw DErr(ln, 'which command? like:  call jump');
      const node = { cmd:'call', ln, fname:m[1].toLowerCase(), args:compileList(tokenize(m[2], ln), ln) };
      pending.push(node); top.body.push(node); return;
    }

    // ---- built-in commands ----
    const canon = ALIASES[word] || word;
    if (COMMANDS.has(canon)) {
      const node = { cmd:canon, ln, args:compileList(tokenize(rest, ln), ln) };
      if (V5_COMMANDS.has(canon)) v5nodes.push(node);
      top.body.push(node); return;
    }
    if (/^\(/.test(rest) && first[0] !== '@') { top.body.push({ cmd:'expr', ln, expr:compile1(line, ln) }); return; }
    if (first.includes('.') || first[0] === '@') throw DErr(ln, `to change it, write:  ${first} = something`);
    // a command you taught Doodle with "teach"
    const node = { cmd:'call', ln, fname:word, args:compileList(tokenize(rest, ln), ln), bare:first };
    pending.push(node); top.body.push(node);
  };

  const depthOf = t => { let d = 0, q = null; for (const c of t) { if (q) { if (c === q) q = null; } else if (c === '"' || c === "'") q = c; else if ('([{'.includes(c)) d++; else if (')]}'.includes(c)) d--; } return d; };
  let buf = '', bufLn = 0;
  lines.forEach((raw, idx) => {
    const line = stripComment(raw).trim();
    if (!buf && !line) return;
    if (!buf) bufLn = idx + 1;
    buf = buf ? buf + ' ' + line : line;
    if (depthOf(buf) <= 0) { handle(buf, bufLn); buf = ''; }
  });
  if (buf) handle(buf, bufLn);
  if (stack.length > 1) {
    const s = stack[stack.length - 1];
    throw DErr(s.ln, `the "${s.kind}" block that starts here needs a "done"`);
  }
  const checkMatch = body => { for (const n of body) {
    if (n.cmd === 'match' && n.body.length) throw DErr(n.ln, 'inside "match", start with a "case" line');
    for (const k of ['body', 'els']) if (Array.isArray(n[k])) checkMatch(n[k]);
    if (n.cases) n.cases.forEach(c => checkMatch(c.body));
  } };
  [prog.main, prog.start, prog.frame, prog.click, ...Object.values(prog.keys), ...Object.values(prog.clickObj), ...prog.every.map(e => e.body),
   ...Object.values(prog.funcs).map(f => f.body), ...Object.values(prog.during), ...Object.values(prog.enter),
   ...Object.values(prog.msgs), ...Object.values(prog.keyup), ...prog.touch.map(t => t.body)].forEach(checkMatch);
  for (const n of v5nodes) if (prog.funcs[n.cmd]) { n.fname = n.cmd; n.cmd = 'call'; }
  for (const u of UCALLS) if (!prog.funcs[u.name] && !assigned.has(u.name) && !(u.name.includes('.') && assigned.has(u.name.split('.')[0]))) throw DErr(u.ln, `there's no function called "${u.shown}". Teach one that gives back an answer:  teach ${u.shown} … give … done`);
  for (const n of pending) if (!prog.funcs[n.fname]) {
    throw DErr(n.ln, n.bare ? `I don't know the command "${n.bare}"` : `there's no command called "${n.fname}". Teach it with:  teach ${n.fname} … done`);
  }
  return prog;
}

// ---------------- shared helpers ----------------
function boxHit(A, B) { return A.x < B.x + B.w && A.x + A.w > B.x && A.y < B.y + B.h && A.y + A.h > B.y; }
function pointIn(p, o) { return p.x >= o.x && p.x <= o.x + o.w && p.y >= o.y && p.y <= o.y + o.h; }

const IMG_CACHE = new Map();
let imageHook = null;
function setImageHook(f) { imageHook = f; }
function costumeImage(costumes, name) {
  const url = costumes && costumes[name];
  if (!url) return null;
  let img = IMG_CACHE.get(url);
  if (!img) {
    img = new Image();
    img.onload = () => { if (imageHook) imageHook(); };
    img.src = url;
    IMG_CACHE.set(url, img);
    if (IMG_CACHE.size > 400) IMG_CACHE.delete(IMG_CACHE.keys().next().value);
  }
  return img.complete && img.naturalWidth ? img : null;
}

function drawObject(ctx, o, ghost, costumes) {
  const hidden = !truthy(o.visible);
  if (hidden && !ghost) return;
  ctx.save();
  ctx.globalAlpha = (hidden ? 0.3 : 1) * clampN(o.alpha === undefined ? 1 : +o.alpha, 0, 1);
  const { x, y, w, h } = o, cx = x + w / 2, cy = y + h / 2;
  if (+o.angle || truthy(o.flip)) {
    ctx.translate(cx, cy);
    if (+o.angle) ctx.rotate(o.angle * Math.PI / 180);
    if (truthy(o.flip)) ctx.scale(-1, 1);
    ctx.translate(-cx, -cy);
  }
  ctx.fillStyle = o.color || '#888';
  switch (o.kind) {
    case 'circle': ctx.beginPath(); ctx.ellipse(cx, cy, Math.abs(w / 2), Math.abs(h / 2), 0, 0, Math.PI * 2); ctx.fill(); break;
    case 'triangle': ctx.beginPath(); ctx.moveTo(cx, y); ctx.lineTo(x + w, y + h); ctx.lineTo(x, y + h); ctx.closePath(); ctx.fill(); break;
    case 'star':
      ctx.beginPath();
      for (let k = 0; k < 10; k++) {
        const a = -Math.PI / 2 + k * Math.PI / 5, r = k % 2 ? 0.45 : 1;
        ctx.lineTo(cx + Math.cos(a) * w / 2 * r, cy + Math.sin(a) * h / 2 * r);
      }
      ctx.closePath(); ctx.fill(); break;
    case 'text':
      ctx.font = `700 ${Math.max(4, h)}px system-ui, -apple-system, "Segoe UI", sans-serif`; ctx.textBaseline = 'top';
      ctx.fillText(fmt(o.text), x, y);
      o.w = Math.max(10, ctx.measureText(fmt(o.text)).width); break;
    case 'sprite': {
      const img = costumeImage(costumes, o.costume);
      if (img) { ctx.imageSmoothingEnabled = false; ctx.drawImage(img, x, y, w, h); }
      else if (ghost) { ctx.setLineDash([4, 4]); ctx.strokeStyle = '#999'; ctx.strokeRect(x, y, w, h); }
      break;
    }
    default: ctx.fillRect(x, y, w, h);
  }
  ctx.restore();
}

// ---------------- sound ----------------
let AC = null;
function audio() {
  AC = AC || new (window.AudioContext || window.webkitAudioContext)();
  if (AC.state === 'suspended') AC.resume();
  return AC;
}
let MASTER = null, VOLUME = 1;
function master() {
  const ac = audio();
  if (!MASTER) { MASTER = ac.createGain(); MASTER.gain.value = VOLUME; MASTER.connect(ac.destination); }
  return MASTER;
}
function setVolume(v) { VOLUME = clampN(v, 0, 1); if (MASTER) MASTER.gain.value = VOLUME; }
function tone(freq, dur, type = 'square', vol = 0.05, slideTo = 0, when = 0) {
  try {
    const ac = audio(), t = ac.currentTime + when;
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(Math.max(1, freq), t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(master()); o.start(t); o.stop(t + dur + 0.05);
  } catch (e) {}
}
function noise(dur, vol = 0.1, when = 0) {
  try {
    const ac = audio(), t = ac.currentTime + when;
    const buf = ac.createBuffer(1, Math.floor(ac.sampleRate * dur), ac.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    s.buffer = buf; f.type = 'lowpass'; f.frequency.setValueAtTime(3000, t); f.frequency.exponentialRampToValueAtTime(80, t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g).connect(master()); s.start(t);
  } catch (e) {}
}
const SOUNDS = {
  coin() { tone(988, 0.08, 'square', 0.05); tone(1319, 0.25, 'square', 0.05, 0, 0.08); },
  jump() { tone(280, 0.18, 'square', 0.05, 720); },
  hit() { tone(220, 0.18, 'sawtooth', 0.06, 60); noise(0.12, 0.05); },
  explode() { noise(0.7, 0.18); tone(120, 0.5, 'sine', 0.08, 30); },
  powerup() { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.12, 'square', 0.04, 0, i * 0.08)); },
  laser() { tone(1400, 0.16, 'sawtooth', 0.035, 180); },
  click() { tone(900, 0.03, 'square', 0.04); },
  bloop() { tone(420, 0.14, 'sine', 0.1, 140); },
  win() { [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone(f, 0.16, 'triangle', 0.08, 0, i * 0.12)); },
  lose() { [392, 330, 262, 196].forEach((f, i) => tone(f, 0.28, 'triangle', 0.08, 0, i * 0.2)); },
  coinbig() { [988, 1319, 1568, 1976].forEach((f, i) => tone(f, 0.1, 'square', 0.045, 0, i * 0.06)); },
  zap() { tone(1800, 0.25, 'square', 0.03, 90); },
  boing() { tone(160, 0.35, 'sine', 0.12, 520); },
  pop() { tone(700, 0.06, 'sine', 0.12, 1400); },
  step() { noise(0.04, 0.05); },
  magic() { [784, 988, 1175, 1568, 1976, 2349].forEach((f, i) => tone(f, 0.18, 'sine', 0.05, 0, i * 0.05)); },
  alarm() { [880, 660, 880, 660].forEach((f, i) => tone(f, 0.15, 'square', 0.04, 0, i * 0.16)); },
  beep() { tone(660, 0.1, 'square', 0.05); },
};
// background music: each song is a melody and a bass line, in eighth notes ("-" is a rest)
const SONGS = {
  happy:   { bpm:140, wave:'square',   vol:0.025, mel:'C5 E5 G5 E5 F5 A5 G5 - E5 G5 C6 G5 F5 E5 D5 - C5 E5 G5 E5 F5 A5 G5 - A5 G5 F5 E5 D5 E5 C5 -', bass:'C3 - G2 - F2 - G2 - C3 - G2 - F2 - G2 -' },
  chill:   { bpm:88,  wave:'sine',     vol:0.05,  mel:'E5 - G5 - A5 - G5 E5 D5 - E5 - C5 - - - E5 - G5 - B5 - A5 G5 E5 - D5 - C5 - - -', bass:'C3 - - - A2 - - - F2 - - - G2 - - -' },
  spooky:  { bpm:96,  wave:'triangle', vol:0.06,  mel:'A4 C5 E5 D#5 E5 C5 A4 - G#4 B4 E5 D5 C5 B4 A4 - A4 C5 E5 F5 E5 C5 D5 - B4 G#4 E4 G#4 B4 D5 C5 -', bass:'A2 - - - E2 - - - A2 - - - E2 - - -' },
  chase:   { bpm:168, wave:'sawtooth', vol:0.022, mel:'E5 E5 G5 E5 D5 E5 B4 - E5 E5 G5 A5 G5 E5 D5 - E5 E5 G5 E5 D5 E5 B4 - C5 D5 E5 G5 A5 B5 A5 -', bass:'E2 E3 E2 E3 D2 D3 D2 D3 C2 C3 C2 C3 B1 B2 B1 B2' },
  space:   { bpm:110, wave:'triangle', vol:0.055, mel:'C5 - G5 - F5 - D#5 - C5 - G4 - C5 D5 D#5 - C5 - G5 - A#5 - G5 - F5 - D#5 - D5 - - -', bass:'C2 - C3 - G#1 - G#2 - A#1 - A#2 - G1 - G2 -' },
  victory: { bpm:150, wave:'square',   vol:0.03,  mel:'C5 C5 C5 C5 G#4 - A#4 - C5 - A#4 C5 - - - - G5 G5 G5 G5 D#5 - F5 - G5 - F5 G5 - - - -', bass:'C3 - G2 - G#2 - A#2 - C3 - G2 - C3 - - -' },
};
function startMusic(e, name) {
  stopMusic(e);
  const song = SONGS[name]; if (!song || e.muted) return;
  let ac; try { ac = audio(); } catch (er) { return; }
  const mel = song.mel.split(/\s+/), bass = song.bass.split(/\s+/), stepLen = 60 / song.bpm / 2;
  const st = { i:0, next:ac.currentTime + 0.05 };
  e.musicTimer = setInterval(() => {
    while (st.next < ac.currentTime + 0.25) {
      const m = mel[st.i % mel.length], b = bass[st.i % bass.length], when = Math.max(0, st.next - ac.currentTime);
      if (m && m !== '-') tone(noteFreq(m), stepLen * 0.9, song.wave, song.vol, 0, when);
      if (b && b !== '-') tone(noteFreq(b), stepLen * 1.8, 'triangle', 0.07, 0, when);
      st.i++; st.next += stepLen;
    }
  }, 60);
}
function stopMusic(e) { if (e.musicTimer) { clearInterval(e.musicTimer); e.musicTimer = null; } }
function noteFreq(n) {
  if (typeof n === 'number') return n;
  const m = String(n).trim().match(/^([A-Ga-g])([#b]?)(\d)?$/);
  if (!m) return 0;
  const semi = { c:0, d:2, e:4, f:5, g:7, a:9, b:11 }[m[1].toLowerCase()] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
  const oct = m[3] ? +m[3] : 4;
  return 440 * Math.pow(2, (semi - 9 + (oct - 4) * 12) / 12);
}

// ---------------- built-in values & functions ----------------
const BUILTINS = {
  'mouse.x':e => e.mouse.x + e.cam.x, 'mouse.y':e => e.mouse.y + e.cam.y, 'mouse.down':e => e.mouse.down,
  'stage.w':e => e.cv.width, 'stage.h':e => e.cv.height, 'camera.x':e => e.cam.x, 'camera.y':e => e.cam.y,
  frame:e => e.frameNo, time:e => e.time(), lastkey:e => e.lastKey || '', yes:() => 1, no:() => 0, pi:() => Math.PI,
  scene:e => e.scene, 'scene.time':e => (e.frameNo - e.sceneStart) / 60, 'mouse.clicked':e => e.clicked ? 1 : 0,
  'camera.zoom':e => e.zoom, 'turtle.x':e => e.tur.x, 'turtle.y':e => e.tur.y, 'turtle.angle':e => e.tur.a, 'stage.cx':e => e.cv.width / 2, 'stage.cy':e => e.cv.height / 2,
  // older spellings
  mousex:e => e.mouse.x + e.cam.x, mousey:e => e.mouse.y + e.cam.y, mousedown:e => e.mouse.down,
  width:e => e.cv.width, height:e => e.cv.height, true:() => 1, false:() => 0, camx:e => e.cam.x, camy:e => e.cam.y,
};
const HIDDEN_NAMES = new Set(['mousex','mousey','mousedown','width','height','true','false','camx','camy',
  'random','randint','lerp','distance','keydown','touching','touchingany','mouseover','stored','list','get','overlap']);
function touchesFamily(e, a, b, ln) {
  const A = e.getObj(a, ln);
  if (!truthy(A.visible)) return 0;
  const t = fmt(b);
  for (const o of e.objList) if (o !== A && truthy(o.visible) && (o.name === t || o.template === t) && boxHit(A, o)) return o.name;
  if (!e.objs[t] && !e.destroyed.has(t) && !e.objList.some(o => o.template === t)) e.getObj(b, ln);
  return 0;
}
const FUNCS = {
  // v5: functions as values
  keep(a, ln) { return this.listArg(a[0], ln, 'keep').filter((v, i) => truthy(this.callFn(a[1], [v, i], ln))); },
  change(a, ln) { return this.listArg(a[0], ln, 'change').map((v, i) => this.callFn(a[1], [v, i], ln)); },
  findfirst(a, ln) { for (const [i, v] of this.listArg(a[0], ln, 'findfirst').entries()) if (truthy(this.callFn(a[1], [v, i], ln))) return v; return 0; },
  allof(a, ln) { return this.listArg(a[0], ln, 'allof').every((v, i) => truthy(this.callFn(a[1], [v, i], ln))) ? 1 : 0; },
  anyof(a, ln) { return this.listArg(a[0], ln, 'anyof').some((v, i) => truthy(this.callFn(a[1], [v, i], ln))) ? 1 : 0; },
  squash(a, ln) { let t = a[2] ?? 0; for (const v of this.listArg(a[0], ln, 'squash')) t = this.callFn(a[1], [t, v], ln); return t; },
  sortwith(a, ln) { return [...this.listArg(a[0], ln, 'sortwith')].sort((p, q) => cmpVals(this.callFn(a[1], [p], ln), this.callFn(a[1], [q], ln))); },
  use(a, ln) { return this.callFn(a[0], a.slice(1), ln); },
  isfunction(a) { return a[0] && a[0].fn ? 1 : 0; },
  either(a) { return truthy(a[0]) ? a[1] : a[2]; },
  copyof(a) { return a[0] && typeof a[0] === 'object' && !a[0].fn ? JSON.parse(JSON.stringify(a[0])) : a[0]; },
  merge(a) { return Object.assign({}, ...a.filter(x => this.isRecord(x))); },
  flatten(a) { return Array.isArray(a[0]) ? a[0].flat(Infinity) : [a[0]]; },
  words(a) { return fmt(a[0]).trim().split(/\s+/).filter(Boolean); },
  capitalize(a) { return fmt(a[0]).replace(/(^|\s)(\S)/g, (m, s, c) => s + c.toUpperCase()); },
  tally(a) { const r = {}; for (const v of (Array.isArray(a[0]) ? a[0] : [...fmt(a[0])])) { const k = fmt(v); r[k] = (r[k] || 0) + 1; } return r; },
  pairs(a) { return this.isRecord(a[0]) ? Object.entries(a[0]).map(([k, v]) => [k, v]) : []; },
  snap(a) { const g = +a[1] || 1; return Math.round(a[0] / g) * g; },
  noise(a) {
    const x = +a[0] || 0, i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f), seed = +a[1] || 0;
    const h = n => { const s = Math.sin(n * 127.1 + seed * 311.7) * 43758.5453; return s - Math.floor(s); };
    return h(i) + (h(i + 1) - h(i)) * u;
  },
  typing(a, ln) { const o = this.getObj(a[0], ln); return this.behaviors.some(b => b.kind === 'type' && b.name === o.name && !b.finished) ? 1 : 0; },
  percent(a) { return a[1] ? a[0] / a[1] * 100 : 0; },
  rand(a) { const [x = 0, y = 1] = a; return x + Math.random() * (y - x); },
  dice(a) { const x = Math.ceil(a[0] ?? 1), y = Math.floor(a[1] ?? 6); return x + Math.floor(Math.random() * (y - x + 1)); },
  mix(a) { return a[0] + (a[1] - a[0]) * a[2]; },
  dist(a) { return Math.hypot(a[2] - a[0], a[3] - a[1]); },
  held(a) { return this.keys.has(normKey(a[0])) || (normKey(a[0]) === 'any' && this.keys.size > 0) ? 1 : 0; },
  touches(a, ln) { return touchesFamily(this, a[0], a[1], ln); },
  hovered(a, ln) { const o = this.getObj(a[0], ln); return truthy(o.visible) && pointIn(truthy(o.hud) ? this.mouse : { x:this.mouse.x + this.cam.x, y:this.mouse.y + this.cam.y }, o) ? 1 : 0; },
  gap(a, ln) { const A = this.getObj(a[0], ln), B = this.getObj(a[1], ln); return Math.hypot(B.x + B.w / 2 - A.x - A.w / 2, B.y + B.h / 2 - A.y - A.h / 2); },
  load(a) {
    try { const v = localStorage.getItem('doodle-save:' + fmt(a[0])); return v === null ? (a[1] ?? 0) : JSON.parse(v); }
    catch (e) { return a[1] ?? 0; }
  },
  keys(a) { return this.isRecord(a[0]) ? Object.keys(a[0]) : []; },
  values(a) { return this.isRecord(a[0]) ? Object.values(a[0]) : Array.isArray(a[0]) ? [...a[0]] : []; },
  has(a) { const c = a[0]; if (Array.isArray(c)) return c.includes(a[1]) ? 1 : 0; if (this.isRecord(c)) return fmt(a[1]) in c ? 1 : 0; return fmt(c).toLowerCase().includes(fmt(a[1]).toLowerCase()) ? 1 : 0; },
  type(a) { const v = a[0]; return typeof v === 'number' ? 'number' : typeof v === 'string' ? 'words' : Array.isArray(v) ? 'list' : v && typeof v === 'object' ? 'record' : 'nothing'; },
  log(a) { return a.length > 1 ? Math.log(a[0]) / Math.log(a[1]) : Math.log(a[0]); }, exp(a) { return Math.exp(a[0]); },
  int(a) { return Math.trunc(a[0]); }, mod(a) { return ((a[0] % a[1]) + a[1]) % a[1]; },
  chars(a) { return [...fmt(a[0])]; }, copies(a) { return fmt(a[0]).repeat(Math.max(0, Math.floor(a[1] ?? 2))); },
  slice(a) { const L = a[0]; return Array.isArray(L) ? L.slice(a[1] ?? 0, a[2]) : fmt(L).slice(a[1] ?? 0, a[2]); },
  combine(a) { return [].concat(...a.map(x => Array.isArray(x) ? x : [x])); },
  sortedby(a) { const f = fmt(a[1]); const L = [...a[0]].sort((p, q) => cmpVals(this.isRecord(p) ? p[f] : p, this.isRecord(q) ? q[f] : q)); return a[2] === 'down' ? L.reverse() : L; },
  side(a, ln) {
    const A = this.getObj(a[0], ln), B = this.getObj(a[1], ln);
    if (!boxHit(A, B)) return 0;
    const dx = A.x + A.w / 2 - (B.x + B.w / 2), dy = A.y + A.h / 2 - (B.y + B.h / 2);
    return (A.w + B.w) / 2 - Math.abs(dx) < (A.h + B.h) / 2 - Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : (dy < 0 ? 'top' : 'bottom');
  },
  today() { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); },
  hour() { return new Date().getHours(); }, minute() { return new Date().getMinutes(); }, second() { return new Date().getSeconds(); },
  weekday() { return ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][new Date().getDay()]; },
  pressed(a) { return this.justPressed.has(normKey(a[0])) ? 1 : 0; },
  button(a, ln) {
    const label = fmt(a[0]), x = +a[1] || 0, y = +a[2] || 0, c = this.ctx;
    c.save(); c.font = '700 18px system-ui, sans-serif'; const w = Math.max(+a[3] || 0, c.measureText(label).width + 36); c.restore();
    const h = +a[4] || 44, over = pointIn(this.mouse, { x, y, w, h }), fill = typeof this.st.fill === 'string' && this.st.fill !== 'none' ? this.st.fill : '#8b5cf6';
    this.draw(cx => {
      cx.save(); cx.shadowBlur = over ? 18 : 8; cx.shadowColor = 'rgba(0,0,0,.35)'; cx.fillStyle = fill; cx.globalAlpha = over ? 1 : 0.92;
      cx.beginPath(); if (cx.roundRect) cx.roundRect(x, y, w, h, 12); else cx.rect(x, y, w, h); cx.fill();
      cx.shadowBlur = 0; cx.globalAlpha = 1; cx.fillStyle = '#ffffff'; cx.font = '700 18px system-ui, sans-serif'; cx.textAlign = 'center'; cx.textBaseline = 'middle';
      cx.fillText(label, x + w / 2, y + h / 2 + 1); cx.restore();
    }, true);
    return this.clicked && over ? 1 : 0;
  },
  nearest(a, ln) {
    const A = this.getObj(a[0], ln), t = fmt(a[1]); let best = 0, bd = Infinity;
    for (const o of this.objList) if (o !== A && truthy(o.visible) && (o.name === t || o.template === t)) {
      const d = Math.hypot(o.x + o.w / 2 - A.x - A.w / 2, o.y + o.h / 2 - A.y - A.h / 2); if (d < bd) { bd = d; best = o.name; }
    }
    return best;
  },
  count(a) { if (Array.isArray(a[0])) return a[0].filter(v => v == a[1]).length; const t = fmt(a[0]); return this.objList.filter(o => o.template === t && truthy(o.visible)).length; },
  edge(a, ln) {
    const o = this.getObj(a[0], ln), B = this.bounds();
    return o.x <= 0 ? 'left' : o.x + o.w >= B.w ? 'right' : o.y <= 0 ? 'top' : o.y + o.h >= B.h ? 'bottom' : 0;
  },
  wave(a) { return Math.sin(this.frameNo * (a[0] ?? 3) * Math.PI / 180) * (a[1] ?? 1); },
  between(a) { return a[0] >= Math.min(a[1], a[2]) && a[0] <= Math.max(a[1], a[2]) ? 1 : 0; },
  even(a) { return Math.round(a[0]) % 2 === 0 ? 1 : 0; }, odd(a) { return Math.abs(Math.round(a[0]) % 2) === 1 ? 1 : 0; },
  range(a) { const s = a[2] || 1, out = []; for (let v = a[0]; s > 0 ? v <= a[1] : v >= a[1]; v += s) { out.push(v); if (out.length > 100000) break; } return out; },
  sum(a) { return (Array.isArray(a[0]) ? a[0] : a).reduce((t, v) => t + (+v || 0), 0); },
  average(a) { const L = Array.isArray(a[0]) ? a[0] : a; return L.length ? L.reduce((t, v) => t + (+v || 0), 0) / L.length : 0; },
  reverse(a) { return Array.isArray(a[0]) ? [...a[0]].reverse() : [...fmt(a[0])].reverse().join(''); },
  first(a) { const L = a[0]; return Array.isArray(L) ? (L.length ? L[0] : 0) : fmt(L)[0] || ''; },
  last(a) { const L = a[0]; return Array.isArray(L) ? (L.length ? L[L.length - 1] : 0) : fmt(L).slice(-1); },
  unique(a) { return [...new Set(a[0])]; },
  length(a) { const v = a[0]; return Array.isArray(v) || typeof v === 'string' ? v.length : fmt(v).length; },
  trim(a) { return fmt(a[0]).trim(); },
  replace(a) { return fmt(a[0]).split(fmt(a[1])).join(fmt(a[2])); },
  starts(a) { return fmt(a[0]).toLowerCase().startsWith(fmt(a[1]).toLowerCase()) ? 1 : 0; },
  ends(a) { return fmt(a[0]).toLowerCase().endsWith(fmt(a[1]).toLowerCase()) ? 1 : 0; },
  pad(a) { return fmt(Math.floor(a[0])).padStart(a[1] ?? 2, '0'); },
  commas(a) { return Math.round(a[0]).toLocaleString('en-US'); },
  clock(a) { const t = Math.max(0, Math.floor(a[0])); return Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0'); },
  randomcolor() { return `hsl(${Math.floor(Math.random() * 360)},85%,60%)`; },
  lighter(a) { return `color-mix(in srgb, ${fmt(a[0])}, white ${Math.round((a[1] ?? 0.3) * 100)}%)`; },
  darker(a) { return `color-mix(in srgb, ${fmt(a[0])}, black ${Math.round((a[1] ?? 0.3) * 100)}%)`; },
  random(a) { const [x = 0, y = 1] = a; return x + Math.random() * (y - x); },
  randint(a) { const x = Math.ceil(a[0] ?? 0), y = Math.floor(a[1] ?? 1); return x + Math.floor(Math.random() * (y - x + 1)); },
  chance(a) { return Math.random() * 100 < (a[0] ?? 50) ? 1 : 0; },
  pick(a) { const L = Array.isArray(a[0]) ? a[0] : a; return L.length ? L[Math.floor(Math.random() * L.length)] : 0; },
  sin(a) { return Math.sin(a[0] * Math.PI / 180); }, cos(a) { return Math.cos(a[0] * Math.PI / 180); },
  tan(a) { return Math.tan(a[0] * Math.PI / 180); }, sqrt(a) { return Math.sqrt(a[0]); },
  round(a) { const m = 10 ** (a[1] || 0); return Math.round(a[0] * m) / m; },
  floor(a) { return Math.floor(a[0]); }, ceil(a) { return Math.ceil(a[0]); }, abs(a) { return Math.abs(a[0]); },
  sign(a) { return Math.sign(a[0]); }, pow(a) { return a[0] ** a[1]; },
  min(a) { return Math.min(...(Array.isArray(a[0]) ? a[0] : a)); }, max(a) { return Math.max(...(Array.isArray(a[0]) ? a[0] : a)); },
  clamp(a) { return clampN(a[0], a[1], a[2]); }, lerp(a) { return a[0] + (a[1] - a[0]) * a[2]; },
  angleto(a) { return Math.atan2(a[3] - a[1], a[2] - a[0]) * 180 / Math.PI; },
  distance(a) { return Math.hypot(a[2] - a[0], a[3] - a[1]); },
  distanceto(a, ln) { const A = this.getObj(a[0], ln), B = this.getObj(a[1], ln); return Math.hypot(B.x + B.w / 2 - A.x - A.w / 2, B.y + B.h / 2 - A.y - A.h / 2); },
  rgb(a) { return a.length > 3 ? `rgba(${a[0]},${a[1]},${a[2]},${a[3]})` : `rgb(${a[0]},${a[1]},${a[2]})`; },
  hsl(a) { const h = ((a[0] % 360) + 360) % 360; return a.length > 3 ? `hsla(${h},${a[1]}%,${a[2]}%,${a[3]})` : `hsl(${h},${a[1] ?? 80}%,${a[2] ?? 60}%)`; },
  rgba(a) { return `rgba(${a[0]},${a[1]},${a[2]},${a[3] ?? 1})`; },
  hsla(a) { return `hsla(${((a[0] % 360) + 360) % 360},${a[1] ?? 80}%,${a[2] ?? 60}%,${a[3] ?? 1})`; },
  list(a) { return [...a]; },
  get(a, ln) {
    const L = a[0];
    if (typeof L === 'string') return L[Math.floor(a[1])] ?? '';
    if (!Array.isArray(L)) throw DErr(ln, 'get needs a list, like:  get(things, 0)');
    const i = Math.floor(a[1]);
    if (!(i >= 0 && i < L.length)) throw DErr(ln, `position ${fmt(a[1])} is outside the list (it has ${L.length} items, and positions start at 0)`);
    return L[i];
  },
  size(a) { const v = a[0]; return Array.isArray(v) || typeof v === 'string' ? v.length : 0; },
  contains(a) { const L = a[0]; return (Array.isArray(L) ? L.includes(a[1]) : fmt(L).toLowerCase().includes(fmt(a[1]).toLowerCase())) ? 1 : 0; },
  indexof(a) { const L = a[0]; return Array.isArray(L) ? L.indexOf(a[1]) : fmt(L).indexOf(fmt(a[1])); },
  join(a) { return Array.isArray(a[0]) ? a[0].map(fmt).join(a[1] ?? ', ') : a.map(fmt).join(''); },
  split(a) { return fmt(a[0]).split(a[1] ?? ' ').map(s => s.trim() !== '' && !isNaN(s) ? +s : s); },
  sorted(a) { return [...a[0]].sort(cmpVals); },
  upper(a) { return fmt(a[0]).toUpperCase(); }, lower(a) { return fmt(a[0]).toLowerCase(); },
  str(a) { return fmt(a[0]); }, num(a) { const v = parseFloat(a[0]); return isNaN(v) ? 0 : v; },
  part(a) { return fmt(a[0]).substr(a[1] || 0, a[2] ?? undefined); },
  keydown(a) { return this.keys.has(normKey(a[0])) || (normKey(a[0]) === 'any' && this.keys.size > 0) ? 1 : 0; },
  touching(a, ln) {
    const A = this.getObj(a[0], ln), B = this.getObj(a[1], ln);
    return A !== B && truthy(A.visible) && truthy(B.visible) && boxHit(A, B) ? 1 : 0;
  },
  touchingany(a, ln) {
    const A = this.getObj(a[0], ln), t = fmt(a[1]);
    if (!truthy(A.visible)) return 0;
    for (const o of this.objList) if (o !== A && truthy(o.visible) && (o.template === t || o.name === t) && boxHit(A, o)) return o.name;
    return 0;
  },
  mouseover(a, ln) { const o = this.getObj(a[0], ln); return truthy(o.visible) && pointIn(truthy(o.hud) ? this.mouse : { x:this.mouse.x + this.cam.x, y:this.mouse.y + this.cam.y }, o) ? 1 : 0; },
  overlap(a) { return boxHit({ x:a[0], y:a[1], w:a[2], h:a[3] }, { x:a[4], y:a[5], w:a[6], h:a[7] }) ? 1 : 0; },
  clones(a) { const t = fmt(a[0]); return this.objList.filter(o => o.template === t).map(o => o.name); },
  exists(a) { return this.objs[fmt(a[0])] ? 1 : 0; },
  offscreen(a, ln) {
    const o = this.getObj(a[0], ln), c = this.cam, W = this.cv.width, H = this.cv.height;
    return o.x + o.w < c.x || o.x > c.x + W || o.y + o.h < c.y || o.y > c.y + H ? 1 : 0;
  },
  stored(a) {
    try { const v = localStorage.getItem('doodle-save:' + fmt(a[0])); return v === null ? (a[1] ?? 0) : JSON.parse(v); }
    catch (e) { return a[1] ?? 0; }
  },
};
const OBJ_PROPS = ['x','y','w','h','color','text','visible','angle','alpha','vx','vy','physics','solid','flip','hud','grab','costume','onground','cx','cy','right','bottom','name','template'];
function ctrlKeys(o) {
  const sets = { arrows:['up', 'left', 'down', 'right'], wasd:['w', 'a', 's', 'd'], ijkl:['i', 'j', 'k', 'l'], numpad:['8', '4', '5', '6'] };
  if (sets[o.ctrl]) return sets[o.ctrl];
  const s = String(o.ctrlKeys || 'w,a,s,d').toLowerCase();
  const k = s.includes(',') ? s.split(',').map(x => x.trim()) : [...s.padEnd(4, ' ').slice(0, 4)];
  return k.slice(0, 4).map(c => c === ' ' || !c ? 'space' : normKey(c));
}
const GHOST = { name:'', kind:'rect', x:-1e9, y:-1e9, w:0, h:0, visible:0, angle:0, alpha:1, vx:0, vy:0, physics:0, solid:0, flip:0, hud:0, onground:0, color:'', text:'', costume:'' };
function normObj(o) {
  const n = { visible:1, text:'', angle:0, alpha:1, vx:0, vy:0, physics:0, solid:0, flip:0, hud:0, grab:0, onground:0, costume:'', ctrl:'', ctrlKeys:'', ctrlSpeed:4, ctrlStyle:'move', actKey:'', act:'', ...o };
  n._px = n.x; n._py = n.y;
  return n;
}
function fontStr(s) {
  const fam = /^(serif|sans-serif|monospace|cursive|fantasy|system-ui)$/i.test(s.family) ? s.family : `"${s.family}", sans-serif`;
  return `${s.weight ? s.weight + ' ' : ''}${s.size}px ${fam}`;
}
function fillFor(c, f, b) {
  if (f && f.grad) { const g = c.createLinearGradient(b[0], b[1], b[0], b[1] + b[3]); g.addColorStop(0, f.grad[0]); g.addColorStop(1, f.grad[1]); return g; }
  return f;
}
function shapePaint(c, s, build, bbox, strokeOnly) {
  c.save(); c.globalAlpha = s.alpha;
  if (s.shadow) { c.shadowBlur = s.shadow[0]; c.shadowColor = s.shadow[1]; }
  c.beginPath(); build(c);
  if (!strokeOnly && s.fill !== 'none') { c.fillStyle = fillFor(c, s.fill, bbox); c.fill(); c.shadowBlur = 0; }
  const stroke = s.color !== 'none' ? s.color : strokeOnly ? (typeof s.fill === 'string' && s.fill !== 'none' ? s.fill : 'black') : null;
  if (stroke && s.thick > 0) { c.strokeStyle = stroke; c.lineWidth = s.thick; c.lineJoin = 'round'; c.lineCap = 'round'; c.stroke(); }
  c.restore();
}

// ---------------- the engine ----------------
class Engine {
  constructor(canvas, opts = {}) {
    this.cv = canvas; this.ctx = canvas.getContext('2d');
    this.onPrint = opts.onPrint || (() => {}); this.onError = opts.onError || (() => {});
    this.keys = new Set(); this.events = []; this.mouse = { x:0, y:0, down:0 }; this.cam = { x:0, y:0 }; this.zoom = 1;
    this.running = false; this.muted = false; this.prog = null; this.music = null;
    this.tick = this.tick.bind(this);
  }
  load(code, project) { this.code = code; this.project = project; }
  time() { return this.frameNo / 60; }
  start() {
    let prog;
    this.parseFailed = false;
    try { prog = parseProgram(this.code || ''); } catch (e) { this.parseFailed = true; this.onError(e); return false; }
    this.stop();
    const P = this.project || {};
    this.prog = prog; this.vars = {}; this.halted = false; this.tasks = []; this.scopeStack = null; this.tileMap = {};
    this.frameNo = 0; this.depth = 0; this.events = []; this.lastKey = '';
    this.costumes = P.costumes || {};
    this.objList = (P.objects || []).map(o => normObj(JSON.parse(JSON.stringify(o))));
    this.objs = {}; for (const o of this.objList) this.objs[o.name] = o;
    this.destroyed = new Set(); this.cloneN = {};
    this.cv.width = P.width || 600; this.cv.height = P.height || 400;
    this.bg = P.bg || '#ffffff'; this.backdrop = P.backdrop || null;
    this.cam = { x:0, y:0 }; this.zoom = 1; this.followName = null; this.world = null; this.gravity = 0.6;
    this.shakeAmt = 0; this.flashA = 0; this.flashColor = 'white';
    this.parts = []; this.drawList = []; this.afters = [];
    this.scene = ''; this.sceneStart = 0; this.tweens = []; this.bubbles = []; this.behaviors = [];
    this.weather = 'none'; this.wparts = []; this.dark = 0; this.lights = {}; this.trails = 0;
    this.watches = []; this.grabbing = null; this.justPressed = new Set(); this.clicked = false;
    this.music = null; this.menu = null; this.tur = { x:(P.width || 600) / 2, y:(P.height || 400) / 2, a:0, down:true };
    this.touchOn = prog.touch.map(() => new Set());
    this.every = prog.every.map(e => ({ ...e, next:e.secs }));
    this.hasFrame = prog.frame.length > 0 || Object.keys(prog.during).length > 0;
    const ok = this.guard(() => {
      this.steps = 0; this.resetStyle();
      this.startTask(prog.main); if (!this.halted) this.startTask(prog.start);
      this.updateCamera(); this.render();
    });
    if (ok) this.resume();
    return ok;
  }
  resume() {
    if (this.running || !this.prog || this.halted) return;
    this.running = true; this.last = performance.now(); this.acc = 0;
    if (this.music) startMusic(this, this.music);
    this.raf = requestAnimationFrame(this.tick);
  }
  pause() { this.running = false; cancelAnimationFrame(this.raf); stopMusic(this); }
  stop() { this.pause(); this.keys.clear(); }
  tick(now) {
    if (!this.running) return;
    this.acc += Math.min(100, now - this.last); this.last = now;
    const STEP = 1000 / 60; let n = 0;
    while (this.acc >= STEP && n < 4 && (this.running || this.restartSoon)) {
      if (this.restartSoon) break;
      this.acc -= STEP; n++;
      if (!this.guard(() => this.step())) { this.guard(() => this.render()); return; }
    }
    if (this.restartSoon) { this.restartSoon = false; this.start(); return; }
    if (n) this.guard(() => this.render());
    if (this.running) this.raf = requestAnimationFrame(this.tick);
  }
  step() {
    this.frameNo++; this.steps = 0;
    const now = this.time();
    if (this.hasFrame) { this.drawList = []; this.resetStyle(); }
    if (this.grabbing) {
      const o = this.objs[this.grabbing.name];
      if (o && this.mouse.down) { const w = this.worldMouse(); o.x = w.x - this.grabbing.dx; o.y = w.y - this.grabbing.dy; o.vx = 0; o.vy = 0; o._px = o.x; o._py = o.y; }
      else this.grabbing = null;
    }
    this.applyControls();
    this.checkTouches();
    this.runTasks(); if (this.halted) return this.endStep();
    const evs = this.events; this.events = [];
    for (const e of evs) {
      if (Array.isArray(e)) this.startTask(e);
      else { Object.assign(this.vars, e.vars); this.startTask(e.body); }
      if (this.halted) return this.endStep();
    }
    for (const t of this.every) {
      if (now >= t.next) { t.next = Math.max(t.next + t.secs, now); this.startTask(t.body); if (this.halted) return this.endStep(); }
    }
    if (this.afters.length) {
      const due = this.afters.filter(a => a.at <= now);
      if (due.length) {
        this.afters = this.afters.filter(a => a.at > now);
        for (const a of due) { this.startTask(a.body); if (this.halted) return this.endStep(); }
      }
    }
    this.startTask(this.prog.frame, 'frame'); if (this.halted) return this.endStep();
    const during = this.prog.during[this.scene];
    if (during) { this.startTask(during, 'during:' + this.scene); if (this.halted) return this.endStep(); }
    this.runBehaviors(); this.updateTweens();
    this.physics(); this.cleanShots(); this.updateParticles(); this.updateWeather(); this.updateCamera();
    this.endStep();
  }
  endStep() { this.justPressed.clear(); this.clicked = false; }
  checkTouches() {
    const T = this.prog.touch;
    for (let i = 0; i < T.length; i++) {
      const A = this.objs[T[i].a], now = new Set();
      if (A && truthy(A.visible))
        for (const o of this.objList) if (o !== A && truthy(o.visible) && (o.name === T[i].b || o.template === T[i].b) && boxHit(A, o)) now.add(o.name);
      for (const nm of now) if (!this.touchOn[i].has(nm)) this.events.push({ body:T[i].body, vars:{ it:nm } });
      this.touchOn[i] = now;
    }
  }
  callFn(f, args, ln, me) {
    if (!this.scopeStack) this.scopeStack = [];
    const S = this.scopeStack;
    if (S.length > 200) throw DErr(ln, 'your functions are calling each other forever');
    if (f && f.fn) {
      const fr = Object.assign({}, f.env || {});
      if (me) fr.me = me;
      f.params.forEach((p, i) => { fr[p] = args[i] ?? 0; });
      S.push(fr);
      try { return this.ev(f.body, ln); } finally { S.pop(); }
    }
    const nm = fmt(f).toLowerCase();
    if (this.prog.funcs[nm]) {
      const g = this.callUser(nm, args, ln, me), r = g.next();
      if (!r.done) throw DErr(ln, `"${nm}" uses wait, so it can't be used here`);
      return r.value === HALT ? 0 : r.value;
    }
    throw DErr(ln, 'that needs a function, like  (n -> n * 2)  or the name of a command you taught');
  }
  guard(fn) {
    try { fn(); return true; }
    catch (e) { this.running = false; this.scopeStack = null; cancelAnimationFrame(this.raf); stopMusic(this); this.onError(e); return false; }
  }
  goScene(name) {
    this.scene = name; this.sceneStart = this.frameNo;
    for (const t of this.tasks) if (t.key && t.key.startsWith('during:') && t.key !== 'during:' + name) t.done = true;
    const enter = this.prog.enter[name];
    if (enter) this.events.push(enter);
  }

  // ---- input ----
  keyDown(k, repeat) {
    this.keys.add(k);
    if (repeat || !this.running || !this.prog) return;
    this.lastKey = k; this.justPressed.add(k); this.justPressed.add('any');
    if (this.prog.keys[k]) this.events.push(this.prog.keys[k]);
    if (this.prog.keys.any) this.events.push(this.prog.keys.any);
    if (this.menu) {
      const M = this.menu, n = M.opts.length;
      if (/^[1-9]$/.test(k) && +k <= n) M.pick = +k - 1;
      else if (k === 'up' || k === 'w') M.sel = (M.sel + n - 1) % n;
      else if (k === 'down' || k === 's') M.sel = (M.sel + 1) % n;
      else if (k === 'enter' || k === 'space') M.pick = M.sel;
    }
    for (const o of this.objList) if (o.actKey && normKey(o.actKey) === k && o.act && truthy(o.visible)) this.doAction(o);
  }
  keyUp(k) { this.keys.delete(k); if (this.running && this.prog && this.prog.keyup[k]) this.events.push(this.prog.keyup[k]); }
  setMouse(x, y) { this.mouse.x = Math.round(x); this.mouse.y = Math.round(y); }
  worldMouse() { return { x:this.mouse.x / this.zoom + this.cam.x, y:this.mouse.y / this.zoom + this.cam.y }; }
  mouseFor(o) { return truthy(o.hud) ? this.mouse : this.worldMouse(); }
  mouseDown() {
    this.mouse.down = 1;
    if (!this.running || !this.prog) return;
    if (this.menu) { const r = (this.menu.rects || []).findIndex(b => pointIn(this.mouse, b)); if (r >= 0) this.menu.pick = r; return; }
    this.clicked = true;
    if (this.prog.click.length) this.events.push(this.prog.click);
    for (const name in this.prog.clickObj) {
      const o = this.objs[name];
      if (o && truthy(o.visible) && pointIn(this.mouseFor(o), o)) this.events.push(this.prog.clickObj[name]);
    }
    for (let i = this.objList.length - 1; i >= 0; i--) {
      const o = this.objList[i], m = this.mouseFor(o);
      if (truthy(o.grab) && truthy(o.visible) && pointIn(m, o)) { this.grabbing = { name:o.name, dx:m.x - o.x, dy:m.y - o.y }; break; }
    }
  }
  mouseUp() { this.mouse.down = 0; this.grabbing = null; }

  // ---- world simulation ----
  physics() {
    const solids = this.objList.filter(o => truthy(o.solid) && truthy(o.visible));
    for (const o of this.objList) {
      if (truthy(o.physics) && truthy(o.visible) && !(this.grabbing && this.grabbing.name === o.name)) {
        o.vy = Math.min((+o.vy || 0) + this.gravity, 24);
        const px = o._px, py = o._py, tx = o.x + (+o.vx || 0), ty = o.y + o.vy;
        o.x = tx; o.y = py;
        const dx = tx - px;
        for (const s of solids) if (s !== o && boxHit(o, s)) {
          if (dx > 0) o.x = s.x - o.w; else if (dx < 0) o.x = s.x + s.w;
        }
        o.y = ty; o.onground = 0;
        const dy = ty - py;
        for (const s of solids) if (s !== o && boxHit(o, s)) {
          if (dy >= 0) { o.y = s.y - o.h; o.onground = 1; } else o.y = s.y + s.h;
          o.vy = 0;
        }
      } else if (+o.vx || +o.vy) { o.x += +o.vx || 0; o.y += +o.vy || 0; }
      o._px = o.x; o._py = o.y;
    }
  }
  applyControls() {
    const B = this.bounds();
    for (const o of this.objList) {
      if (!o.ctrl || o.ctrl === 'none' || !truthy(o.visible)) continue;
      const k = ctrlKeys(o), sp = +o.ctrlSpeed || 4, held = key => this.keys.has(key);
      const h = (held(k[3]) ? 1 : 0) - (held(k[1]) ? 1 : 0), v = (held(k[2]) ? 1 : 0) - (held(k[0]) ? 1 : 0);
      if (o.ctrlStyle === 'platform') {
        if (truthy(o.physics)) o.vx = h * sp; else o.x += h * sp;
        if (h) o.flip = h < 0 ? 1 : 0;
        if (held(k[0]) && truthy(o.physics) && truthy(o.onground)) { o.vy = -(+o.ctrlJump || 13); if (!this.muted) SOUNDS.jump(); }
      } else if (o.ctrlStyle === 'drive') {
        o.angle = (+o.angle || 0) + h * 4;
        const r = o.angle * Math.PI / 180; o.x -= Math.cos(r) * v * sp; o.y -= Math.sin(r) * v * sp;
      } else {
        const d = h && v ? Math.SQRT1_2 : 1, solids = this.objList.filter(q => q !== o && truthy(q.solid) && truthy(q.visible));
        const blocked = () => solids.some(q => boxHit(o, q));
        o.x += h * sp * d; if (blocked()) o.x -= h * sp * d;
        o.y += v * sp * d; if (blocked()) o.y -= v * sp * d;
        if (h) o.flip = h < 0 ? 1 : 0;
      }
      if (o.ctrlStyle !== 'drive' || true) { o.x = clampN(o.x, 0, Math.max(0, B.w - o.w)); if (o.ctrlStyle !== 'platform') o.y = clampN(o.y, 0, Math.max(0, B.h - o.h)); }
    }
  }
  doAction(o) {
    const cx = o.x + o.w / 2, cy = o.y + o.h / 2;
    switch (o.act) {
      case 'jump': if (truthy(o.physics) && truthy(o.onground)) { o.vy = -(+o.ctrlJump || 13); if (!this.muted) SOUNDS.jump(); } else if (!truthy(o.physics)) this.tweens.push({ name:o.name, ln:0, start:this.frameNo, frames:20, props:[{ p:'y', from:o.y, to:o.y - 40 }] }); break;
      case 'spin': this.tweens.push({ name:o.name, ln:0, start:this.frameNo, frames:30, props:[{ p:'angle', from:+o.angle || 0, to:(+o.angle || 0) + 360 }] }); break;
      case 'sparkle': this.spawnParticles(cx, cy, 40, 'rainbow', 5); break;
      case 'grow': { const w = o.w * 1.25, h = o.h * 1.25; o.x = cx - w / 2; o.y = cy - h / 2; o.w = w; o.h = h; break; }
      case 'shrink': { const w = Math.max(4, o.w * 0.8), h = Math.max(4, o.h * 0.8); o.x = cx - w / 2; o.y = cy - h / 2; o.w = w; o.h = h; break; }
      case 'color': o.color = `hsl(${Math.floor(Math.random() * 360)},85%,60%)`; break;
      case 'hide': o.alpha = (+o.alpha || 0) > 0.5 ? 0.15 : 1; break;
      case 'shoot': {
        const b = normObj({ name:'', kind:'circle', x:cx - 4, y:cy - 4, w:8, h:8, color:o.color && o.kind !== 'sprite' ? o.color : '#ff4d8d' });
        let k = 0, nm; do { k++; nm = o.name + '_shot_' + k; } while (this.objs[nm]);
        b.name = nm; b.template = o.name + '_shot';
        const r = (+o.angle || 0) * Math.PI / 180, dir = o.ctrlStyle === 'drive' ? [Math.cos(r), Math.sin(r)] : [truthy(o.flip) ? -1 : 1, 0];
        if (o.ctrlStyle !== 'drive' && o.ctrlStyle !== 'platform') { dir[0] = 0; dir[1] = -1; }
        b.vx = dir[0] * 9; b.vy = dir[1] * 9; this.objList.push(b); this.objs[nm] = b;
        if (!this.muted) SOUNDS.laser();
        break;
      }
      default: if (SOUNDS[o.act] && !this.muted) SOUNDS[o.act]();
    }
  }
  runBehaviors() {
    if (!this.behaviors.length) return;
    const B = this.bounds();
    this.behaviors = this.behaviors.filter(b => this.objs[b.name] && !b.finished);
    for (const b of this.behaviors) {
      const o = this.objs[b.name];
      if (b.kind === 'chase' || b.kind === 'flee') {
        const t = this.objs[b.target]; if (!t) continue;
        const dx = t.x + t.w / 2 - (o.x + o.w / 2), dy = t.y + t.h / 2 - (o.y + o.h / 2), d = Math.hypot(dx, dy);
        if (d > 1) { const s = b.kind === 'chase' ? Math.min(b.speed, d) : -b.speed; o.x += dx / d * s; o.y += dy / d * s; }
      } else if (b.kind === 'orbit') {
        const t = this.objs[b.target]; if (!t) continue;
        b.angle += b.speed;
        const a = b.angle * Math.PI / 180;
        o.x = t.x + t.w / 2 + Math.cos(a) * b.radius - o.w / 2; o.y = t.y + t.h / 2 + Math.sin(a) * b.radius - o.h / 2;
      } else if (b.kind === 'wander') {
        if (!b.dir || Math.random() < 0.015) b.dir = Math.random() * 360;
        const a = b.dir * Math.PI / 180;
        o.x += Math.cos(a) * b.speed; o.y += Math.sin(a) * b.speed;
        if (o.x < 0 || o.x + o.w > B.w) { b.dir = 180 - b.dir; o.x = clampN(o.x, 0, B.w - o.w); }
        if (o.y < 0 || o.y + o.h > B.h) { b.dir = -b.dir; o.y = clampN(o.y, 0, B.h - o.h); }
      } else if (b.kind === 'patrol') {
        const t = b.pts[b.i], dx = t[0] - o.x, dy = t[1] - o.y, d = Math.hypot(dx, dy);
        if (d <= b.speed) { o.x = t[0]; o.y = t[1]; b.i = (b.i + 1) % b.pts.length; }
        else { o.x += dx / d * b.speed; o.y += dy / d * b.speed; if (Math.abs(dx) > 0.5) o.flip = dx < 0 ? 1 : 0; }
      } else if (b.kind === 'bob') {
        const off = Math.sin(this.frameNo * b.speed * 3 * Math.PI / 180) * b.size; o.y += off - b.off; b.off = off;
      } else if (b.kind === 'pulse') {
        const s = 1 + Math.sin(this.frameNo * b.speed * 3 * Math.PI / 180) * b.amt, cx = o.x + o.w / 2, cy = o.y + o.h / 2;
        o.w = o.w / b.s * s; o.h = o.h / b.s * s; o.x = cx - o.w / 2; o.y = cy - o.h / 2; b.s = s;
      } else if (b.kind === 'trail') {
        if (truthy(o.visible)) for (let k = 0; k < b.n; k++) this.parts.push({ x:o.x + o.w / 2 + (Math.random() - 0.5) * o.w * 0.4, y:o.y + o.h / 2 + (Math.random() - 0.5) * o.h * 0.4,
          vx:(Math.random() - 0.5) * 0.6, vy:(Math.random() - 0.5) * 0.6 - 0.1, life:1, decay:0.03, size:3 + Math.random() * 4,
          color:b.color === 'rainbow' ? `hsl(${(this.frameNo * 6) % 360},90%,60%)` : b.color });
      } else if (b.kind === 'type') {
        const n = Math.min(b.full.length, Math.floor((this.frameNo - b.start) / 60 * b.cps));
        if (n !== b.n) { o.text = b.full.slice(0, n); if (n > b.n && b.full[n - 1] !== ' ' && !this.muted && b.sound && SOUNDS.step) SOUNDS.step(); b.n = n; }
        if (n >= b.full.length) b.finished = true;
      } else if (b.kind === 'cycle') {
        if (this.frameNo % Math.max(1, b.every) === 0) { b.i = (b.i + 1) % b.list.length; o.costume = b.list[b.i]; }
      }
    }
  }
  updateTweens() {
    if (!this.tweens.length) return;
    for (const t of this.tweens) {
      const o = this.objs[t.name]; if (!o) { t.done = true; continue; }
      const k = clampN((this.frameNo - t.start) / t.frames, 0, 1), e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      for (const p of t.props) this.objSet(o, p.p, p.from + (p.to - p.from) * e, t.ln);
      if (k >= 1) t.done = true;
    }
    this.tweens = this.tweens.filter(t => !t.done);
  }
  spawnParticles(x, y, n, color, speed) {
    n = Math.min(400, Math.max(0, Math.floor(n)));
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, s = Math.random() * speed;
      this.parts.push({ x, y, vx:Math.cos(a) * s, vy:Math.sin(a) * s - speed * 0.25, life:1, decay:0.012 + Math.random() * 0.02,
        size:2 + Math.random() * 4, color:color === 'rainbow' ? `hsl(${Math.random() * 360},90%,60%)` : color });
    }
    if (this.parts.length > 4000) this.parts.splice(0, this.parts.length - 4000);
  }
  cleanShots() {
    const B = this.bounds();
    for (let i = this.objList.length - 1; i >= 0; i--) {
      const o = this.objList[i];
      if (o.template && (o.shot || o.template.endsWith('_shot')) && (o.x < -50 || o.y < -50 || o.x > B.w + 50 || o.y > B.h + 50)) { this.objList.splice(i, 1); delete this.objs[o.name]; this.destroyed.add(o.name); }
    }
  }
  updateParticles() {
    for (const p of this.parts) { p.x += p.vx; p.y += p.vy; p.vy += 0.1; p.vx *= 0.985; p.life -= p.decay; }
    if (this.parts.length) this.parts = this.parts.filter(p => p.life > 0);
  }
  updateWeather() {
    const W = this.cv.width, H = this.cv.height, w = this.weather, P = this.wparts;
    const add = (n, f) => { for (let i = 0; i < n; i++) if (Math.random() < n - i) P.push(f()); };
    if (w === 'rain') add(4, () => ({ x:Math.random() * (W + 100), y:-20, vx:-1.5, vy:10 + Math.random() * 5, s:10 + Math.random() * 8, c:'rgba(160,200,255,.7)' }));
    else if (w === 'snow') add(1.2, () => ({ x:Math.random() * W, y:-10, vx:0, vy:0.6 + Math.random() * 1.2, s:1.5 + Math.random() * 2.5, c:'rgba(255,255,255,.9)', wob:Math.random() * 6 }));
    else if (w === 'leaves') add(0.25, () => ({ x:Math.random() * W, y:-10, vx:0.5, vy:1 + Math.random(), s:4 + Math.random() * 3, c:`hsl(${15 + Math.random() * 35},85%,50%)`, wob:Math.random() * 6 }));
    else if (w === 'confetti') add(2, () => ({ x:Math.random() * W, y:-10, vx:0, vy:1.5 + Math.random() * 2, s:3 + Math.random() * 4, c:`hsl(${Math.random() * 360},90%,60%)`, wob:Math.random() * 6 }));
    else if (w === 'bubbles') add(0.3, () => ({ x:Math.random() * W, y:H + 10, vx:0, vy:-(0.8 + Math.random() * 1.2), s:3 + Math.random() * 7, c:'rgba(200,240,255,.6)', wob:Math.random() * 6 }));
    for (const p of P) { p.x += p.vx + (p.wob !== undefined ? Math.sin(this.frameNo / 30 + p.wob) * 0.6 : 0); p.y += p.vy; }
    this.wparts = P.filter(p => p.y < H + 30 && p.y > -40 && p.x > -60 && p.x < W + 120);
    if (this.wparts.length > 900) this.wparts.splice(0, this.wparts.length - 900);
  }
  updateCamera() {
    const W = this.cv.width / this.zoom, H = this.cv.height / this.zoom;
    if (this.followName) {
      const o = this.objs[this.followName];
      if (o) { this.cam.x = o.x + o.w / 2 - W / 2; this.cam.y = o.y + o.h / 2 - H / 2; }
    }
    if (this.world) {
      this.cam.x = clampN(this.cam.x, 0, Math.max(0, this.world.w - W));
      this.cam.y = clampN(this.cam.y, 0, Math.max(0, this.world.h - H));
    }
  }
  bounds() { return this.world ? { w:this.world.w, h:this.world.h } : { w:this.cv.width, h:this.cv.height }; }

  // ---- drawing ----
  resetStyle() { this.st = { color:'black', fill:'none', thick:2, size:20, family:'sans-serif', weight:'', align:'left', alpha:1, shadow:null, hud:false }; }
  draw(fn, forceHud) {
    const s = { ...this.st };
    this.drawList.push({ hud:forceHud || s.hud, fn:c => fn(c, s) });
    if (this.drawList.length > 40000) this.drawList.splice(0, 10000);
  }
  render() {
    const c = this.ctx, W = this.cv.width, H = this.cv.height, z = this.zoom;
    c.setTransform(1, 0, 0, 1, 0, 0); c.shadowBlur = 0;
    c.globalAlpha = this.trails > 0 ? Math.max(0.04, 1 - this.trails) : 1;
    c.fillStyle = this.bg; c.fillRect(0, 0, W, H);
    let sx = 0, sy = 0;
    if (this.shakeAmt > 0.3) { sx = (Math.random() - 0.5) * this.shakeAmt * 2; sy = (Math.random() - 0.5) * this.shakeAmt * 2; this.shakeAmt *= 0.88; }
    else this.shakeAmt = 0;
    if (this.backdrop) { const img = costumeImage(this.costumes, this.backdrop); if (img) { c.imageSmoothingEnabled = false; c.drawImage(img, sx, sy, W, H); } }
    c.globalAlpha = 1;
    // the world (moves with the camera)
    c.setTransform(z, 0, 0, z, Math.round(sx - this.cam.x * z), Math.round(sy - this.cam.y * z));
    for (const o of this.objList) if (!truthy(o.hud)) drawObject(c, o, false, this.costumes);
    for (const p of this.parts) { c.globalAlpha = Math.max(0, p.life); c.fillStyle = p.color; c.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size); }
    c.globalAlpha = 1;
    for (const d of this.drawList) if (!d.hud) d.fn(c);
    this.drawBubbles(c);
    // the screen (does not move)
    c.setTransform(1, 0, 0, 1, sx, sy);
    this.drawWeather(c);
    if (this.dark > 0) this.drawDarkness(c, sx, sy);
    for (const o of this.objList) if (truthy(o.hud)) drawObject(c, o, false, this.costumes);
    for (const d of this.drawList) if (d.hud) d.fn(c);
    c.setTransform(1, 0, 0, 1, 0, 0);
    if (this.watches.length) this.drawWatches(c);
    if (this.menu) this.drawMenu(c);
    if (this.flashA > 0) { c.globalAlpha = Math.min(1, this.flashA); c.fillStyle = this.flashColor; c.fillRect(0, 0, W, H); c.globalAlpha = 1; this.flashA -= 0.05; }
  }
  drawMenu(c) {
    const M = this.menu, W = this.cv.width, H = this.cv.height, bw = Math.min(W - 40, 420), bh = 44, gap = 10;
    c.save();
    c.fillStyle = 'rgba(8,10,20,.55)'; c.fillRect(0, 0, W, H);
    c.font = '700 20px system-ui, sans-serif';
    const words = M.q.split(' '), lines = []; let cur = '';
    for (const w of words) { const t = cur ? cur + ' ' + w : w; if (c.measureText(t).width > bw - 32 && cur) { lines.push(cur); cur = w; } else cur = t; }
    if (cur) lines.push(cur);
    const ph = 26 + lines.length * 26 + 12 + M.opts.length * (bh + gap), px = (W - bw) / 2, py = Math.max(10, (H - ph) / 2);
    c.fillStyle = '#ffffff'; c.shadowBlur = 24; c.shadowColor = 'rgba(0,0,0,.4)';
    c.beginPath(); if (c.roundRect) c.roundRect(px, py, bw, ph, 16); else c.rect(px, py, bw, ph); c.fill(); c.shadowBlur = 0;
    c.fillStyle = '#1c1b2e'; c.textAlign = 'center'; c.textBaseline = 'top';
    lines.forEach((l, i) => c.fillText(l, W / 2, py + 18 + i * 26));
    M.rects = [];
    let y = py + 26 + lines.length * 26 + 4;
    if (M.rects) M.opts.forEach((o, i) => {
      const r = { x:px + 16, y, w:bw - 32, h:bh }; M.rects.push(r);
      const over = pointIn(this.mouse, r) || (M.sel === i && !pointIn(this.mouse, { x:px, y:py, w:bw, h:ph }));
      if (pointIn(this.mouse, r)) M.sel = i;
      c.fillStyle = over ? '#8b5cf6' : '#efeaff';
      c.beginPath(); if (c.roundRect) c.roundRect(r.x, r.y, r.w, r.h, 12); else c.rect(r.x, r.y, r.w, r.h); c.fill();
      c.fillStyle = over ? '#ffffff' : '#3b2a7a'; c.font = '700 17px system-ui, sans-serif'; c.textBaseline = 'middle';
      c.fillText((i + 1) + '.  ' + o, W / 2, r.y + bh / 2 + 1);
      y += bh + gap;
    });
    c.restore();
  }
  drawWeather(c) {
    if (!this.wparts.length) return;
    c.save();
    for (const p of this.wparts) {
      c.fillStyle = c.strokeStyle = p.c;
      if (this.weather === 'rain') { c.lineWidth = 1.5; c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(p.x + p.vx * 1.5, p.y + p.s); c.stroke(); }
      else if (this.weather === 'confetti' || this.weather === 'leaves') { c.save(); c.translate(p.x, p.y); c.rotate(this.frameNo / 20 + p.wob); c.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / (this.weather === 'leaves' ? 1.6 : 2)); c.restore(); }
      else if (this.weather === 'bubbles') { c.lineWidth = 1.5; c.beginPath(); c.arc(p.x, p.y, p.s, 0, 7); c.stroke(); }
      else { c.beginPath(); c.arc(p.x, p.y, p.s, 0, 7); c.fill(); }
    }
    c.restore();
  }
  drawDarkness(c, sx, sy) {
    const W = this.cv.width, H = this.cv.height;
    const d = this.darkCv = this.darkCv || document.createElement('canvas');
    if (d.width !== W || d.height !== H) { d.width = W; d.height = H; }
    const x = d.getContext('2d');
    x.globalCompositeOperation = 'source-over'; x.clearRect(0, 0, W, H);
    x.fillStyle = `rgba(5,5,20,${clampN(this.dark, 0, 1)})`; x.fillRect(0, 0, W, H);
    x.globalCompositeOperation = 'destination-out';
    for (const name in this.lights) {
      const o = this.objs[name]; if (!o || !truthy(o.visible)) continue;
      const r = this.lights[name] * this.zoom;
      const px = truthy(o.hud) ? o.x + o.w / 2 : (o.x + o.w / 2 - this.cam.x) * this.zoom, py = truthy(o.hud) ? o.y + o.h / 2 : (o.y + o.h / 2 - this.cam.y) * this.zoom;
      const g = x.createRadialGradient(px, py, r * 0.25, px, py, r);
      g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      x.fillStyle = g; x.beginPath(); x.arc(px, py, r, 0, 7); x.fill();
    }
    c.drawImage(d, -sx, -sy);
  }
  drawBubbles(c) {
    this.bubbles = this.bubbles.filter(b => b.until > this.frameNo && this.objs[b.name]);
    for (const b of this.bubbles) {
      const o = this.objs[b.name]; if (!truthy(o.visible)) continue;
      c.save(); c.globalAlpha = 1;
      c.font = '600 15px system-ui, sans-serif'; c.textBaseline = 'middle';
      const lines = fmt(b.text).split('\n'), tw = Math.max(...lines.map(l => c.measureText(l).width)), w = tw + 20, h = lines.length * 19 + 12;
      const x = o.x + o.w / 2 - w / 2, y = o.y - h - 14;
      c.fillStyle = '#ffffff'; c.strokeStyle = '#1b1b2f'; c.lineWidth = 2;
      c.beginPath();
      if (c.roundRect) c.roundRect(x, y, w, h, 10); else c.rect(x, y, w, h);
      c.moveTo(o.x + o.w / 2 - 7, y + h); c.lineTo(o.x + o.w / 2, y + h + 10); c.lineTo(o.x + o.w / 2 + 7, y + h);
      c.fill(); c.stroke();
      c.fillStyle = '#ffffff'; c.fillRect(o.x + o.w / 2 - 6, y + h - 2, 12, 3);
      c.fillStyle = '#1b1b2f'; c.textAlign = 'center';
      lines.forEach((l, i) => c.fillText(l, o.x + o.w / 2, y + 6 + 9.5 + i * 19));
      c.restore();
    }
  }
  drawWatches(c) {
    c.save();
    c.font = '600 13px ui-monospace, Consolas, monospace'; c.textBaseline = 'top';
    const rows = this.watches.map(n => `${n}: ${fmt(n in this.vars ? this.vars[n] : '—')}`);
    const w = Math.max(...rows.map(r => c.measureText(r).width)) + 16, h = rows.length * 18 + 8, x = this.cv.width - w - 8;
    c.fillStyle = 'rgba(0,0,0,.6)'; c.fillRect(x, 8, w, h);
    c.fillStyle = '#7ee787'; rows.forEach((r, i) => c.fillText(r, x + 8, 12 + i * 18));
    c.restore();
  }

  // ---- variables & objects ----
  getObj(name, ln) {
    if (typeof name === 'string') {
      const o = this.objs[name]; if (o) return o;
      if (this.destroyed.has(name)) return { ...GHOST };
    }
    throw DErr(ln, `there's no thing called "@${fmt(name)}" on the stage — add it in the Design tab`);
  }
  objBase(base, ln) {
    if (this.objs[base]) return this.objs[base];
    const H = this.lookup(base), v = H ? H[base] : undefined;
    if (typeof v === 'string' && v) return this.getObj(v, ln);
    if (this.destroyed.has(base)) return { ...GHOST };
    throw DErr(ln, `there's no thing called "@${base}" on the stage — add it in the Design tab`);
  }
  objGet(o, p, ln) {
    switch (p) {
      case 'cx': return o.x + o.w / 2; case 'cy': return o.y + o.h / 2;
      case 'right': return o.x + o.w; case 'bottom': return o.y + o.h;
      case 'template': return o.template || o.name;
    }
    if (p in o && p[0] !== '_') return o[p];
    throw DErr(ln, `objects don't have "${p}". Try: x, y, w, h, color, angle, alpha, vx, vy, visible, text, costume`);
  }
  objSet(o, p, v, ln) {
    switch (p) {
      case 'cx': o.x = v - o.w / 2; return; case 'cy': o.y = v - o.h / 2; return;
      case 'right': o.x = v - o.w; return; case 'bottom': o.y = v - o.h; return;
      case 'name': case 'template': throw DErr(ln, `you can't change an object's ${p}`);
    }
    if (p[0] === '_') throw DErr(ln, `"${p}" isn't a property`);
    o[p] = v;
  }
  // ---- variables, records & local variables ----
  scope() { const S = this.scopeStack; return S && S.length ? S[S.length - 1] : null; }
  isRecord(v) { return !!v && typeof v === 'object' && !Array.isArray(v); }
  listArg(L, ln, name) {
    if (typeof L === 'string') return [...L];
    if (!Array.isArray(L)) throw DErr(ln, `${name} needs a list first, like:  ${name}(numbers, (n -> n > 3))`);
    return L;
  }
  lookup(name) { const L = this.scope(); if (L && name in L) return L; if (name in this.vars) return this.vars; return null; }
  recGet(r, path, ln) {
    let v = r;
    for (const p of path.split('.')) { if (!this.isRecord(v)) throw DErr(ln, `there's nothing called "${p}" inside that`); v = p in v ? v[p] : 0; }
    return v;
  }
  recSet(r, path, val) {
    const parts = path.split('.'); let v = r;
    for (let i = 0; i < parts.length - 1; i++) { if (!this.isRecord(v[parts[i]])) v[parts[i]] = {}; v = v[parts[i]]; }
    v[parts[parts.length - 1]] = val;
  }
  getVar(name, ln) {
    const H = this.lookup(name); if (H) return H[name];
    const b = BUILTINS[name.toLowerCase()]; if (b) return b(this);
    const dot = name.indexOf('.');
    if (dot > 0) {
      const base = name.slice(0, dot), rest = name.slice(dot + 1), B = this.lookup(base);
      if (B && this.isRecord(B[base])) return this.recGet(B[base], rest, ln);
      return this.objGet(this.objBase(base, ln), rest, ln);
    }
    return name; // a bare word is text, so "paint red" works
  }
  setVar(name, v, ln) {
    if (BUILTINS[name.toLowerCase()]) throw DErr(ln, `"${name}" is built in, so you can't change it`);
    const dot = name.indexOf('.');
    if (dot > 0) {
      const base = name.slice(0, dot), rest = name.slice(dot + 1), B = this.lookup(base);
      if (B && this.isRecord(B[base])) { this.recSet(B[base], rest, v); return; }
      this.objSet(this.objBase(base, ln), rest, v, ln); return;
    }
    this.setPlain(name, v);
  }
  // inside a taught command, new names are local; names that already exist outside are shared
  setPlain(name, v) { const L = this.scope(); if (L && (name in L || !(name in this.vars))) L[name] = v; else this.vars[name] = v; }
  ev(n, ln) {
    switch (n.k) {
      case 'lit': return n.v;
      case 'var': return this.getVar(n.name, ln);
      case 'obj': {
        const nm = n.name;
        if (this.objs[nm]) return nm;
        const H = this.lookup(nm), v = H ? H[nm] : undefined;
        if (typeof v === 'string' && (this.objs[v] || this.destroyed.has(v))) return v;
        if (this.destroyed.has(nm) || this.objList.some(o => o.template === nm)) return nm;
        throw DErr(ln, `there's no thing called "@${nm}" on the stage — add it in the Design tab`);
      }
      case 'list': return n.items.map(x => this.ev(x, ln));
      case 'rec': { const r = {}; for (const [k, x] of n.entries) r[k] = this.ev(x, ln); return r; }
      case 'tpl': return n.parts.map(p => typeof p === 'string' ? p : fmt(this.ev(p, ln))).join('');
      case 'idx': {
        const c = this.ev(n.a, ln), i = this.ev(n.i, ln);
        if (this.isRecord(c)) return fmt(i) in c ? c[fmt(i)] : 0;
        return FUNCS.get.call(this, [c, i], ln);
      }
      case 'neg': return -this.ev(n.a, ln);
      case 'not': return truthy(this.ev(n.a, ln)) ? 0 : 1;
      case 'and': return truthy(this.ev(n.a, ln)) && truthy(this.ev(n.b, ln)) ? 1 : 0;
      case 'or': return truthy(this.ev(n.a, ln)) || truthy(this.ev(n.b, ln)) ? 1 : 0;
      case 'call': return FUNCS[n.name].call(this, n.args.map(x => this.ev(x, ln)), ln);
      case 'fn': return { fn:true, params:n.params, body:n.body, env:this.scope() ? { ...this.scope() } : null };
      case 'ucall': {
        const args = n.args.map(x => this.ev(x, ln));
        if (!this.prog.funcs[n.name]) {
          let f, me = null;
          const dot = n.shown.lastIndexOf('.');
          if (dot > 0) {
            const base = this.getVar(n.shown.slice(0, dot), ln);
            if (this.isRecord(base)) { me = base; f = base[n.shown.slice(dot + 1)]; }
          } else { const H = this.lookup(n.shown); f = H ? H[n.shown] : undefined; }
          if (!f || !(f.fn || (typeof f === 'string' && this.prog.funcs[f.toLowerCase()]))) throw DErr(ln, `"${n.shown}" isn't a function — make one like:  ${n.shown} = (n -> n * 2)`);
          return this.callFn(f, args, ln, me);
        }
        if (!this.scopeStack) this.scopeStack = [];
        const g = this.callUser(n.name, args, ln), r = g.next();
        if (!r.done) throw DErr(ln, `"${n.name}" uses wait, so it can't give back an answer here — put it on its own line instead`);
        return r.value === HALT ? 0 : r.value;
      }
      case 'bin': {
        const a = this.ev(n.a, ln), b = this.ev(n.b, ln);
        switch (n.op) {
          case '+': return typeof a === 'string' || typeof b === 'string' || Array.isArray(a) ? fmt(a) + fmt(b) : a + b;
          case '-': return a - b; case '*': return a * b; case '/': return a / b; case '%': return ((a % b) + b) % b;
          case '==': return a == b ? 1 : 0; case '!=': return a != b ? 1 : 0;
          case '<': return a < b ? 1 : 0; case '>': return a > b ? 1 : 0;
          case '<=': return a <= b ? 1 : 0; case '>=': return a >= b ? 1 : 0;
          case 'touches': return touchesFamily(this, a, b, ln);
        }
      }
    }
  }

  // ---- running code: every piece of running code is a "task" that can wait ----
  startTask(body, key) {
    if (!body || !body.length) return;
    if (key && this.tasks.some(t => t.key === key && !t.done)) return;
    const t = { key, until:0, scopes:[], done:false };
    t.gen = this.gx(body);
    this.tasks.push(t); this.advance(t);
  }
  advance(t) {
    this.scopeStack = t.scopes;
    try { const r = t.gen.next(); if (r.done) t.done = true; else t.until = this.frameNo + r.value; }
    finally { this.scopeStack = null; }
  }
  runTasks() {
    for (const t of this.tasks.slice()) { if (this.halted) break; if (!t.done && t.until <= this.frameNo) this.advance(t); }
    this.tasks = this.tasks.filter(t => !t.done);
  }
  *callUser(name, args, ln, me) {
    const f = this.prog.funcs[name], S = this.scopeStack;
    if (S.length > 200) throw DErr(ln, 'your commands are calling each other forever');
    const frame = {}; if (me) frame.me = me; f.params.forEach((p, i) => { frame[p] = args[i] ?? 0; });
    S.push(frame);
    let s;
    try { s = yield* this.gx(f.body); } finally { S.pop(); }
    if (s === HALT) return HALT;
    return s && s.give !== undefined ? s.give : 0;
  }
  *gx(nodes) {
    for (const n of nodes) {
      if (this.halted) return HALT;
      if (++this.steps > 400000) throw DErr(n.ln, 'too many steps — is there a loop that never ends? (put a "wait" inside long loops)');
      switch (n.cmd) {
        case 'repeat': {
          const c = this.ev(n.count, n.ln);
          if (typeof c !== 'number') throw DErr(n.ln, 'loop needs a number, like:  loop 5 as i');
          for (let k = 0; k < c; k++) { this.setPlain(n.v, k); const s = yield* this.gx(n.body); if (s === BREAK) break; if (s && s !== SKIP) return s; }
          break;
        }
        case 'span': {
          const a = this.ev(n.from, n.ln), b = this.ev(n.to, n.ln), st = n.by ? this.ev(n.by, n.ln) : (b >= a ? 1 : -1);
          if ([a, b, st].some(v => typeof v !== 'number') || !st) throw DErr(n.ln, 'write it like:  loop i from 1 to 10');
          for (let v = a; st > 0 ? v <= b : v >= b; v += st) { this.setPlain(n.v, v); const s = yield* this.gx(n.body); if (s === BREAK) break; if (s && s !== SKIP) return s; }
          break;
        }
        case 'for': {
          let L = this.ev(n.list, n.ln);
          if (typeof L === 'number') L = Array.from({ length:Math.max(0, Math.floor(L)) }, (_, i) => i);
          else if (typeof L === 'string') L = [...L];
          else if (this.isRecord(L)) L = Object.keys(L);
          if (!Array.isArray(L)) throw DErr(n.ln, '"loop each" needs a list, like:  loop each c in clones(@coin)');
          const items = [...L];
          for (let i = 0; i < items.length; i++) {
            this.setPlain(n.v, items[i]); if (n.iv) this.setPlain(n.iv, i);
            const s = yield* this.gx(n.body); if (s === BREAK) break; if (s && s !== SKIP) return s;
          }
          break;
        }
        case 'while':
          while (truthy(this.ev(n.cond, n.ln))) { const s = yield* this.gx(n.body); if (s === BREAK) break; if (s && s !== SKIP) return s; }
          break;
        case 'if': {
          const s = truthy(this.ev(n.cond, n.ln)) ? yield* this.gx(n.body) : n.els ? yield* this.gx(n.els) : null;
          if (s) return s; break;
        }
        case 'match': {
          const v = this.ev(n.subj, n.ln);
          const hit = n.cases.find(c => c.vals.some(x => this.ev(x, n.ln) == v));
          const s = hit ? yield* this.gx(hit.body) : n.els ? yield* this.gx(n.els) : null;
          if (s) return s; break;
        }
        case 'try': {
          let s;
          try { s = yield* this.gx(n.body); }
          catch (e) {
            if (e.line === undefined) throw e;
            this.setPlain('problem', e.message);
            s = n.els ? yield* this.gx(n.els) : null;
          }
          if (s) return s; break;
        }
        case 'break': return BREAK;
        case 'skip': return SKIP;
        case 'give': return { give:n.expr ? this.ev(n.expr, n.ln) : 0 };
        case 'wait': {
          const d = this.ev(n.delay, n.ln);
          if (typeof d !== 'number') throw DErr(n.ln, 'wait needs a number of seconds, like:  wait 1s');
          yield Math.max(1, Math.round(d * 60)); break;
        }
        case 'waituntil':
          while (!truthy(this.ev(n.cond, n.ln))) { yield 1; if (this.halted) return HALT; }
          break;
        case 'call': { const r = yield* this.callUser(n.fname, n.args.map(x => this.ev(x, n.ln)), n.ln); if (r === HALT) return HALT; break; }
        case 'choose': {
          const a = n.args.map(x => this.ev(x, n.ln)), opts = (Array.isArray(a[1]) ? a[1] : a.slice(1)).map(fmt).slice(0, 9);
          if (!opts.length) throw DErr(n.ln, 'choose needs some choices, like:  choose "Which way?", ["Left", "Right"], way');
          const M = { q:fmt(a[0]), opts, pick:-1, sel:0 };
          this.menu = M;
          while (M.pick < 0) { yield 1; if (this.halted) return HALT; if (this.menu !== M) break; }
          if (this.menu === M) this.menu = null;
          if (!this.muted) SOUNDS.pop && SOUNDS.pop();
          this.setPlain(n.v, M.pick >= 0 ? opts[M.pick] : opts[0]); break;
        }
        default: this.simple(n);
      }
    }
    return null;
  }
  cloneOf(src, ln) {
    const base = src.template || src.name;
    let k = this.cloneN[base] || 0, name;
    do { k++; name = base + '_' + k; } while (this.objs[name]);
    this.cloneN[base] = k;
    const o = normObj({ ...JSON.parse(JSON.stringify(src)), name, template:base, visible:1 });
    this.objList.push(o); this.objs[name] = o;
    if (this.objList.length > 4000) throw DErr(ln, 'too many things on the stage! Remember to erase copies you don\'t need');
    return o;
  }
  simple(n) {
    switch (n.cmd) {
      case '=': {
        let v = this.ev(n.expr, n.ln);
        if (n.op) {
          if (n.name.indexOf('.') < 0 && !this.lookup(n.name)) throw DErr(n.ln, `"${n.name}" doesn't exist yet — give it a starting value first, like:  ${n.name} = 0`);
          const old = this.getVar(n.name, n.ln);
          v = n.op === '+' ? (typeof old === 'string' || typeof v === 'string' ? fmt(old) + fmt(v) : Array.isArray(old) ? old.concat([v]) : old + v)
            : n.op === '-' ? old - v : n.op === '*' ? old * v : old / v;
        }
        this.setVar(n.name, v, n.ln); break;
      }
      case 'after': {
        const d = this.ev(n.delay, n.ln);
        if (typeof d !== 'number') throw DErr(n.ln, 'later needs a number of seconds, like:  later 2s');
        this.afters.push({ at:this.time() + d, body:n.body }); break;
      }
      case 'clone': {
        const o = this.cloneOf(this.getObj(this.ev(n.src, n.ln), n.ln), n.ln);
        if (n.v) this.setPlain(n.v, o.name);
        break;
      }
      case 'make': {
        const a = n.args.map(x => this.ev(x, n.ln));
        if (a.length < 2 || typeof a[0] !== 'number' || typeof a[1] !== 'number') throw DErr(n.ln, 'make needs at least x and y, like:  make box @wall, 100, 200, 80, 20, gray');
        const isText = n.kind === 'text', isSprite = n.kind === 'sprite';
        const o = normObj({ name:n.name, kind:n.kind, x:a[0], y:a[1], w:a[2] ?? (isText ? 100 : 50), h:a[3] ?? (isText ? 28 : 50),
          color:isSprite ? '#888' : fmt(a[isText ? 5 : 4] ?? (isText ? 'black' : 'gray')), text:isText ? fmt(a[4] ?? '') : '', costume:isSprite ? fmt(a[4] ?? '') : '' });
        if (isSprite && !this.costumes[o.costume]) throw DErr(n.ln, `there's no costume called "${o.costume}" — draw one in the Paint tab`);
        const old = this.objs[n.name];
        if (old) Object.assign(old, o); else { this.objList.push(o); this.objs[n.name] = o; this.destroyed.delete(n.name); }
        break;
      }
      case 'tween': {
        const o = this.getObj(this.ev(n.target, n.ln), n.ln), to = n.to.map(x => this.ev(x, n.ln)), d = this.ev(n.dur, n.ln);
        if (to.some(v => typeof v !== 'number')) throw DErr(n.ln, 'you can only animate to a number');
        this.tweens = this.tweens.filter(t => !(t.name === o.name && t.props.some(p => n.props.includes(p.p))));
        this.tweens.push({ name:o.name, ln:n.ln, start:this.frameNo, frames:Math.max(1, (+d || 0) * 60),
          props:n.props.map((p, i) => ({ p, from:+this.objGet(o, p, n.ln) || 0, to:to[i] })) });
        break;
      }
      case 'expr': this.ev(n.expr, n.ln); break;
      case 'watch':
        if (n.names[0] === 'none') this.watches = [];
        else for (const nm of n.names) if (!this.watches.includes(nm)) this.watches.push(nm);
        break;
      case 'ask': {
        const ans = (window.prompt(fmt(this.ev(n.q, n.ln))) ?? '').trim();
        this.setPlain(n.v, ans !== '' && !isNaN(ans) ? +ans : ans);
        this.keys.clear(); break;
      }
      default: this.command(n);
    }
  }
  command(n) {
    const a = n.args.map(x => this.ev(x, n.ln)), st = this.st, ln = n.ln;
    const need = (k, usage, from = 0) => {
      if (a.length < k) throw DErr(ln, `"${n.cmd}" needs more values, like:  ${n.cmd} ${usage}`);
      for (let i = from; i < k; i++) if (typeof a[i] !== 'number' || isNaN(a[i]))
        throw DErr(ln, `"${fmt(a[i])}" should be a number here (did you forget to make it with let?)`);
    };
    const obj = i => this.getObj(a[i], ln);
    const on = v => v === 'on' || v === 1 || v === true || v === 'yes';
    switch (n.cmd) {
      // drawing style
      case 'paper':
        need(2, '600, 400, skyblue');
        if (this.cv.width !== a[0]) this.cv.width = a[0];
        if (this.cv.height !== a[1]) this.cv.height = a[1];
        if (a[2] !== undefined) this.bg = fmt(a[2]);
        this.drawList = []; break;
      case 'wash':
        if (a[0] !== undefined) this.bg = fmt(a[0]);
        this.drawList = []; break;
      case 'ink': st.color = fmt(a[0] ?? 'black'); break;
      case 'paint': st.fill = fmt(a[0] ?? 'none'); break;
      case 'blend': st.fill = { grad:[fmt(a[0] ?? 'white'), fmt(a[1] ?? a[0] ?? 'black')] }; break;
      case 'brush': need(1, '4'); st.thick = a[0]; break;
      case 'letters':
        need(1, '32, "Georgia", bold'); st.size = a[0];
        if (a[1] !== undefined) st.family = fmt(a[1]);
        if (a[2] !== undefined) st.weight = fmt(a[2]);
        break;
      case 'align': st.align = ['left','center','right'].includes(a[0]) ? a[0] : 'left'; break;
      case 'fade': need(1, '0.5'); st.alpha = clampN(a[0], 0, 1); break;
      case 'glow': st.shadow = a[0] === 'none' || !a[0] ? null : [a[0], fmt(a[1] ?? 'rgba(0,0,0,0.5)')]; break;
      case 'pin': st.hud = on(a[0]); break;
      // shapes
      case 'circle': { need(3, 'x, y, radius'); const [x, y, r] = a; this.draw((c, s) => shapePaint(c, s, c => c.arc(x, y, Math.abs(r), 0, Math.PI * 2), [x - r, y - r, 2 * r, 2 * r])); break; }
      case 'oval': { need(4, 'x, y, rx, ry'); const [x, y, rx, ry] = a; this.draw((c, s) => shapePaint(c, s, c => c.ellipse(x, y, Math.abs(rx), Math.abs(ry), 0, 0, Math.PI * 2), [x - rx, y - ry, 2 * rx, 2 * ry])); break; }
      case 'box': { need(4, 'x, y, width, height'); const [x, y, w, h] = a; this.draw((c, s) => shapePaint(c, s, c => c.rect(x, y, w, h), [x, y, w, h])); break; }
      case 'roundbox': {
        need(4, 'x, y, width, height, roundness'); const [x, y, w, h] = a, r = Math.min(a[4] ?? 12, Math.abs(w) / 2, Math.abs(h) / 2);
        this.draw((c, s) => shapePaint(c, s, c => { c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }, [x, y, w, h]));
        break;
      }
      case 'line': { need(4, 'x1, y1, x2, y2'); const [x1, y1, x2, y2] = a; this.draw((c, s) => shapePaint(c, s, c => { c.moveTo(x1, y1); c.lineTo(x2, y2); }, [0, 0, 0, 0], true)); break; }
      case 'arc': {
        need(5, 'x, y, radius, start angle, end angle'); const [x, y, r, s0, s1] = a;
        this.draw((c, s) => shapePaint(c, s, c => c.arc(x, y, Math.abs(r), s0 * Math.PI / 180, s1 * Math.PI / 180), [0, 0, 0, 0], true)); break;
      }
      case 'triangle': {
        need(6, 'x1, y1, x2, y2, x3, y3'); const p = a.slice(0, 6);
        const minY = Math.min(p[1], p[3], p[5]), maxY = Math.max(p[1], p[3], p[5]), minX = Math.min(p[0], p[2], p[4]);
        this.draw((c, s) => shapePaint(c, s, c => { c.moveTo(p[0], p[1]); c.lineTo(p[2], p[3]); c.lineTo(p[4], p[5]); c.closePath(); }, [minX, minY, 0, maxY - minY]));
        break;
      }
      case 'poly': case 'star': {
        need(3, n.cmd === 'star' ? 'x, y, radius, points' : 'x, y, radius, sides');
        const [x, y, r] = a, sides = Math.max(3, Math.round(a[3] ?? 5)), inner = n.cmd === 'star' ? 0.45 : 0;
        const pts = inner ? sides * 2 : sides;
        this.draw((c, s) => shapePaint(c, s, c => {
          for (let k = 0; k < pts; k++) {
            const an = -Math.PI / 2 + k * Math.PI * 2 / pts, rr = inner && k % 2 ? r * inner : r;
            c.lineTo(x + rr * Math.cos(an), y + rr * Math.sin(an));
          }
          c.closePath();
        }, [x - r, y - r, 2 * r, 2 * r]));
        break;
      }
      case 'write': {
        need(2, 'x, y, "words"'); const [x, y] = a, str = fmt(a[2]);
        this.draw((c, s) => {
          c.save(); c.globalAlpha = s.alpha;
          if (s.shadow) { c.shadowBlur = s.shadow[0]; c.shadowColor = s.shadow[1]; }
          c.font = fontStr(s); c.textBaseline = 'top'; c.textAlign = s.align;
          c.fillStyle = s.color === 'none' ? (typeof s.fill === 'string' && s.fill !== 'none' ? s.fill : 'black') : s.color;
          c.fillText(str, x, y); c.restore();
        });
        break;
      }
      case 'sticker': {
        need(3, '"hero", 50, 80', 1); const name = fmt(a[0]), [, x, y, w, h] = a;
        if (!this.costumes[name]) throw DErr(ln, `there's no costume called "${name}" — draw one in the Paint tab`);
        this.draw((c, s) => {
          const img = costumeImage(this.costumes, name); if (!img) return;
          c.save(); c.globalAlpha = s.alpha; c.imageSmoothingEnabled = false;
          c.drawImage(img, x, y, w ?? img.naturalWidth, h ?? img.naturalHeight); c.restore();
        });
        break;
      }
      // sound & output
      case 'say': this.onPrint(a.map(fmt).join(' ')); break;
      case 'beep': if (!this.muted) tone(a[0] || 440, (a[1] || 120) / 1000); break;
      case 'play': {
        const f = SOUNDS[fmt(a[0]).toLowerCase()];
        if (!f) throw DErr(ln, `there's no sound called "${fmt(a[0])}". Try: ${Object.keys(SOUNDS).join(', ')}`);
        if (!this.muted) f(); break;
      }
      case 'note': if (!this.muted) tone(noteFreq(a[0]), (a[1] || 250) / 1000, 'triangle', 0.08); break;
      case 'tune': {
        const ms = (a[1] || 200) / 1000;
        if (!this.muted) fmt(a[0]).split(/\s+/).forEach((t, i) => { if (t && t !== '-' && t !== '_') tone(noteFreq(t), ms * 0.95, 'triangle', 0.08, 0, i * ms); });
        break;
      }
      // lists
      case 'add': if (!Array.isArray(a[0])) throw DErr(ln, 'add needs a list first. Make one like:  things = [1, 2, 3]'); a[0].push(a[1]); break;
      case 'put': if (!Array.isArray(a[0])) throw DErr(ln, 'put needs a list:  put things, 0, "new value"'); a[0][Math.floor(a[1])] = a[2]; break;
      case 'drop': if (!Array.isArray(a[0])) throw DErr(ln, 'drop needs a list:  drop things, 0'); a[0].splice(Math.floor(a[1]), 1); break;
      case 'sort': if (!Array.isArray(a[0])) throw DErr(ln, 'sort needs a list'); a[0].sort(cmpVals); break;
      case 'shuffle': if (!Array.isArray(a[0])) throw DErr(ln, 'shuffle needs a list');
        for (let i = a[0].length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[0][i], a[0][j]] = [a[0][j], a[0][i]]; } break;
      // objects
      case 'show': obj(0).visible = 1; break;
      case 'hide': obj(0).visible = 0; break;
      case 'nudge': { const o = obj(0); need(3, '@player, 5, 0', 1); o.x += a[1]; o.y += a[2]; break; }
      case 'place': { const o = obj(0); need(3, '@player, 100, 200', 1); o.x = a[1]; o.y = a[2]; o._px = o.x; o._py = o.y; break; }
      case 'face': {
        const o = obj(0); let tx, ty;
        if (typeof a[1] === 'string') { const t = obj(1); tx = t.x + t.w / 2; ty = t.y + t.h / 2; } else { need(3, '@ship, mouse.x, mouse.y', 1); tx = a[1]; ty = a[2]; }
        o.angle = Math.atan2(ty - (o.y + o.h / 2), tx - (o.x + o.w / 2)) * 180 / Math.PI; break;
      }
      case 'step': { const o = obj(0); need(2, '@ship, 5', 1); const r = (+o.angle || 0) * Math.PI / 180; o.x += Math.cos(r) * a[1]; o.y += Math.sin(r) * a[1]; break; }
      case 'wrap': {
        const o = obj(0), B = this.bounds();
        if (o.x > B.w) o.x = -o.w; else if (o.x + o.w < 0) o.x = B.w;
        if (o.y > B.h) o.y = -o.h; else if (o.y + o.h < 0) o.y = B.h;
        o._px = o.x; o._py = o.y; break;
      }
      case 'fence': { const o = obj(0), B = this.bounds(); o.x = clampN(o.x, 0, B.w - o.w); o.y = clampN(o.y, 0, B.h - o.h); break; }
      case 'bounce': {
        const o = obj(0), B = this.bounds();
        if (o.x < 0) { o.x = 0; o.vx = Math.abs(+o.vx || 0); } else if (o.x + o.w > B.w) { o.x = B.w - o.w; o.vx = -Math.abs(+o.vx || 0); }
        if (o.y < 0) { o.y = 0; o.vy = Math.abs(+o.vy || 0); } else if (o.y + o.h > B.h) { o.y = B.h - o.h; o.vy = -Math.abs(+o.vy || 0); }
        break;
      }
      case 'erase': case 'pop': {
        const name = fmt(a[0]), o = this.objs[name];
        if (!o) { if (this.destroyed.has(name)) break; obj(0); }
        if (n.cmd === 'pop') {
          this.spawnParticles(o.x + o.w / 2, o.y + o.h / 2, a[1] ?? 40, o.kind === 'sprite' ? 'rainbow' : (o.color || 'orange'), 5);
          if (!o.template) { o.visible = 0; break; }
        }
        this.objList.splice(this.objList.indexOf(o), 1); delete this.objs[name]; this.destroyed.add(name);
        break;
      }
      // world & effects
      case 'gravity': need(1, '0.6'); this.gravity = a[0]; break;
      case 'camera': need(2, 'x, y'); this.followName = null; this.cam.x = a[0]; this.cam.y = a[1]; break;
      case 'follow': this.followName = a[0] === 'none' || !a[0] ? null : obj(0).name; break;
      case 'world': need(2, 'width, height'); this.world = { w:a[0], h:a[1] }; break;
      case 'shake': this.shakeAmt = Math.max(this.shakeAmt, a[0] ?? 8); break;
      case 'flash': this.flashColor = fmt(a[0] ?? 'white'); this.flashA = 0.8; break;
      case 'sparkle': need(2, 'x, y, 30, gold, 5'); this.spawnParticles(a[0], a[1], a[2] ?? 30, fmt(a[3] ?? 'rainbow'), a[4] ?? 5); break;
      case 'backdrop': {
        const name = fmt(a[0] ?? 'none');
        if (name === 'none') { this.backdrop = null; break; }
        if (!this.costumes[name]) throw DErr(ln, `there's no costume called "${name}" — draw one in the Paint tab`);
        this.backdrop = name; break;
      }
      // data & control
      case 'save': try { localStorage.setItem('doodle-save:' + fmt(a[0]), JSON.stringify(a[1] ?? 0)); } catch (e) {} break;
      case 'stop': this.halted = true; this.running = false; stopMusic(this); this.onPrint('■ The game stopped.'); break;
      // ---- v3: scenes, story & atmosphere ----
      case 'restart': this.halted = true; this.restartSoon = true; break;
      case 'go': { const nm = fmt(a[0]); if (!nm) throw DErr(ln, 'go where? like:  go "menu"'); this.goScene(nm); break; }
      case 'talk': {
        const o = obj(0), secsT = a[2] ?? 2;
        this.bubbles = this.bubbles.filter(b => b.name !== o.name);
        if (fmt(a[1])) this.bubbles.push({ name:o.name, text:fmt(a[1]), until:this.frameNo + Math.max(1, secsT * 60) });
        break;
      }
      case 'weather': {
        const w = fmt(a[0] ?? 'none').toLowerCase();
        if (!['rain', 'snow', 'leaves', 'confetti', 'bubbles', 'none'].includes(w)) throw DErr(ln, 'weather can be: rain, snow, leaves, confetti, bubbles, or none');
        this.weather = w; if (w === 'none') this.wparts = []; break;
      }
      case 'dark': need(1, '0.8'); this.dark = clampN(a[0], 0, 1); break;
      case 'light': { const o = obj(0); if (a[1] === 0 || a[1] === 'none') delete this.lights[o.name]; else this.lights[o.name] = a[1] ?? 120; break; }
      case 'trails': need(1, '0.3'); this.trails = clampN(a[0], 0, 0.97); break;
      case 'music': {
        const nm = fmt(a[0] ?? 'none').toLowerCase();
        if (nm === 'none') { this.music = null; stopMusic(this); break; }
        if (!SONGS[nm]) throw DErr(ln, `there's no song called "${nm}". Try: ${Object.keys(SONGS).join(', ')}`);
        if (this.music !== nm) { this.music = nm; if (this.running || this.frameNo === 0) startMusic(this, nm); }
        break;
      }
      case 'volume': need(1, '0.5'); setVolume(a[0]); break;
      case 'zoom': need(1, '2'); this.zoom = clampN(a[0], 0.1, 10); break;
      // ---- v3: more drawing ----
      case 'heart': {
        need(3, 'x, y, size'); const [x, y, r] = a;
        this.draw((c, s) => shapePaint(c, s, c => {
          c.moveTo(x, y + r * 0.9);
          c.bezierCurveTo(x - r * 1.6, y - r * 0.1, x - r * 0.6, y - r * 1.3, x, y - r * 0.45);
          c.bezierCurveTo(x + r * 0.6, y - r * 1.3, x + r * 1.6, y - r * 0.1, x, y + r * 0.9);
        }, [x - r, y - r, 2 * r, 2 * r]));
        break;
      }
      case 'dot': { need(2, 'x, y'); const [x, y] = a, r = a[2] ?? Math.max(1.5, st.thick); this.draw((c, s) => { c.save(); c.globalAlpha = s.alpha; c.fillStyle = s.fill !== 'none' && typeof s.fill === 'string' ? s.fill : (s.color !== 'none' ? s.color : 'black'); c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); c.restore(); }); break; }
      case 'shape': {
        const pts = Array.isArray(a[0]) ? a[0] : a;
        if (pts.length < 6 || pts.some(v => typeof v !== 'number')) throw DErr(ln, 'shape needs a list of points, like:  shape [10, 10, 100, 20, 60, 90]');
        const xs = pts.filter((_, i) => i % 2 === 0), ys = pts.filter((_, i) => i % 2 === 1);
        this.draw((c, s) => shapePaint(c, s, c => { for (let i = 0; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]); c.closePath(); },
          [Math.min(...xs), Math.min(...ys), 0, Math.max(...ys) - Math.min(...ys)]));
        break;
      }
      case 'emoji': {
        need(3, '"🍕", x, y, size', 1); const str = fmt(a[0]), [, x, y] = a, size = a[3] ?? 40;
        this.draw((c, s) => { c.save(); c.globalAlpha = s.alpha; c.font = `${size}px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(str, x, y); c.restore(); });
        break;
      }
      case 'bar': {
        need(6, 'x, y, width, height, value, most'); const [x, y, w, h, v, mx] = a, col = a[6] !== undefined ? fmt(a[6]) : (typeof st.fill === 'string' && st.fill !== 'none' ? st.fill : '#22c55e');
        const k = clampN(mx ? v / mx : 0, 0, 1);
        this.draw((c, s) => {
          c.save(); c.globalAlpha = s.alpha;
          const rr = (X, Y, W, H) => { c.beginPath(); if (c.roundRect) c.roundRect(X, Y, W, H, Math.min(H / 2, 8)); else c.rect(X, Y, W, H); };
          c.fillStyle = 'rgba(0,0,0,.45)'; rr(x, y, w, h); c.fill();
          if (k > 0) { c.fillStyle = col; rr(x, y, Math.max(h, w * k), h); c.fill(); }
          c.strokeStyle = s.color !== 'none' ? s.color : 'rgba(255,255,255,.6)'; c.lineWidth = 2; rr(x, y, w, h); c.stroke();
          c.restore();
        });
        break;
      }
      // ---- v3: things on the stage ----
      case 'spin': { const o = obj(0); need(2, '@coin, 5', 1); o.angle = (+o.angle || 0) + a[1]; break; }
      case 'grow': {
        const o = obj(0); need(2, '@hero, 1.5', 1); const cx = o.x + o.w / 2, cy = o.y + o.h / 2;
        o.w = Math.max(1, o.w * a[1]); o.h = Math.max(1, o.h * a[1]); o.x = cx - o.w / 2; o.y = cy - o.h / 2; o._px = o.x; o._py = o.y; break;
      }
      case 'front': { const o = obj(0); this.objList.splice(this.objList.indexOf(o), 1); this.objList.push(o); break; }
      case 'back': { const o = obj(0); this.objList.splice(this.objList.indexOf(o), 1); this.objList.unshift(o); break; }
      case 'launch': { const o = obj(0); need(3, '@ball, angle, speed', 1); const r = a[1] * Math.PI / 180; o.vx = Math.cos(r) * a[2]; o.vy = Math.sin(r) * a[2]; break; }
      case 'chase': case 'flee': {
        const o = obj(0), t = obj(1); const sp = a[2] ?? 2;
        this.behaviors = this.behaviors.filter(b => !(b.name === o.name && (b.kind === 'chase' || b.kind === 'flee' || b.kind === 'wander' || b.kind === 'orbit')));
        this.behaviors.push({ kind:n.cmd, name:o.name, target:t.name, speed:sp }); break;
      }
      case 'orbit': {
        const o = obj(0), t = obj(1);
        this.behaviors = this.behaviors.filter(b => !(b.name === o.name && ['chase', 'flee', 'wander', 'orbit'].includes(b.kind)));
        this.behaviors.push({ kind:'orbit', name:o.name, target:t.name, radius:a[2] ?? 80, speed:a[3] ?? 2, angle:0 }); break;
      }
      case 'wander': {
        const o = obj(0);
        this.behaviors = this.behaviors.filter(b => !(b.name === o.name && ['chase', 'flee', 'wander', 'orbit'].includes(b.kind)));
        this.behaviors.push({ kind:'wander', name:o.name, speed:a[1] ?? 1.5, dir:0 }); break;
      }
      case 'cycle': {
        const o = obj(0);
        this.behaviors = this.behaviors.filter(b => !(b.name === o.name && b.kind === 'cycle'));
        if (a[1] === 'none') break;
        const list = Array.isArray(a[1]) ? a[1].map(fmt) : [];
        if (list.length < 2) throw DErr(ln, 'cycle needs a list of costumes, like:  cycle @hero, ["hero", "hero2"], 8');
        for (const nm of list) if (!this.costumes[nm]) throw DErr(ln, `there's no costume called "${nm}" — draw one in the Paint tab`);
        this.behaviors.push({ kind:'cycle', name:o.name, list, every:a[2] ?? 8, i:0 }); break;
      }
      case 'patrol': {
        const o = obj(0), pts = a[1];
        if (!Array.isArray(pts) || pts.length < 1 || !pts.every(q => Array.isArray(q) && q.length >= 2 && typeof q[0] === 'number' && typeof q[1] === 'number'))
          throw DErr(ln, 'patrol needs a list of spots, like:  patrol @guard, [[100, 200], [400, 200]], 2');
        this.behaviors = this.behaviors.filter(b => !(b.name === o.name && ['chase', 'flee', 'wander', 'orbit', 'patrol'].includes(b.kind)));
        this.behaviors.push({ kind:'patrol', name:o.name, pts:pts.map(q => [q[0], q[1]]), speed:a[2] ?? 2, i:0 }); break;
      }
      case 'bob': {
        const o = obj(0); this.behaviors = this.behaviors.filter(b => !(b.name === o.name && b.kind === 'bob'));
        if (a[1] !== 0) this.behaviors.push({ kind:'bob', name:o.name, size:a[1] ?? 8, speed:a[2] ?? 2, off:0 }); break;
      }
      case 'pulse': {
        const o = obj(0); this.behaviors = this.behaviors.filter(b => !(b.name === o.name && b.kind === 'pulse'));
        if (a[1] !== 0) this.behaviors.push({ kind:'pulse', name:o.name, amt:a[1] ?? 0.15, speed:a[2] ?? 3, s:1 }); break;
      }
      case 'trail': {
        const o = obj(0); this.behaviors = this.behaviors.filter(b => !(b.name === o.name && b.kind === 'trail'));
        if (a[1] !== 'none' && a[1] !== 0) this.behaviors.push({ kind:'trail', name:o.name, color:fmt(a[1] ?? 'gold'), n:Math.max(1, Math.min(6, a[2] ?? 2)) }); break;
      }
      case 'typewrite': {
        const o = obj(0); this.behaviors = this.behaviors.filter(b => !(b.name === o.name && b.kind === 'type'));
        o.text = ''; this.behaviors.push({ kind:'type', name:o.name, full:fmt(a[1] ?? ''), cps:a[2] ?? 20, start:this.frameNo, n:0, sound:a[3] !== 'quiet' }); break;
      }
      case 'shoot': {
        const from = obj(0), tpl = this.getObj(a[1], ln), ang = a[2] ?? (+from.angle || 0), sp = a[3] ?? 8;
        const s = this.cloneOf(tpl, ln), r = ang * Math.PI / 180;
        s.x = from.x + from.w / 2 - s.w / 2; s.y = from.y + from.h / 2 - s.h / 2; s.vx = Math.cos(r) * sp; s.vy = Math.sin(r) * sp; s.shot = 1; s.physics = 0;
        if (truthy(tpl.spinWithShot)) s.angle = ang;
        break;
      }
      case 'fail': throw DErr(ln, fmt(a[0] ?? 'something went wrong'));
      case 'speak': {
        if (this.muted || typeof speechSynthesis === 'undefined') break;
        const u = new SpeechSynthesisUtterance(fmt(a[0] ?? ''));
        u.pitch = clampN(a[1] ?? 1, 0, 2); u.rate = clampN(a[2] ?? 1, 0.3, 3);
        speechSynthesis.speak(u); break;
      }
      case 'turtle': this.tur = { x:a[0] ?? this.cv.width / 2, y:a[1] ?? this.cv.height / 2, a:a[2] ?? 0, down:true }; break;
      case 'turn': need(1, '90'); this.tur.a = (this.tur.a + a[0]) % 360; break;
      case 'penup': this.tur.down = false; break;
      case 'pendown': this.tur.down = true; break;
      case 'walk': {
        need(1, '100');
        const T = this.tur, r = T.a * Math.PI / 180, x1 = T.x, y1 = T.y, x2 = x1 + Math.cos(r) * a[0], y2 = y1 + Math.sin(r) * a[0];
        if (T.down) this.draw((c, st) => shapePaint(c, st, c => { c.moveTo(x1, y1); c.lineTo(x2, y2); }, [0, 0, 0, 0], true));
        T.x = x2; T.y = y2; break;
      }
      case 'jump': {
        const o = obj(0);
        if (truthy(o.physics)) { if (truthy(o.onground)) { o.vy = -(a[1] ?? 12); o.onground = 0; } }
        else this.tweens.push({ name:o.name, ln, start:this.frameNo, frames:20, props:[{ p:'y', from:o.y, to:o.y - (a[1] ?? 12) * 4 }] });
        break;
      }
      case 'boost': { const o = obj(0); o.vx = (+o.vx || 0) + (a[1] ?? 0); o.vy = (+o.vy || 0) + (a[2] ?? 0); break; }
      case 'bounceoff': {
        const A = obj(0), B = this.getObj(a[1], ln);
        if (!boxHit(A, B)) break;
        const dx = A.x + A.w / 2 - (B.x + B.w / 2), dy = A.y + A.h / 2 - (B.y + B.h / 2);
        if ((A.w + B.w) / 2 - Math.abs(dx) < (A.h + B.h) / 2 - Math.abs(dy)) { A.vx = Math.abs(+A.vx || 0) * (dx < 0 ? -1 : 1); A.x = dx < 0 ? B.x - A.w : B.x + B.w; }
        else { A.vy = Math.abs(+A.vy || 0) * (dy < 0 ? -1 : 1); A.y = dy < 0 ? B.y - A.h : B.y + B.h; }
        A._px = A.x; A._py = A.y; break;
      }
      case 'send': {
        if (a[0] === undefined || fmt(a[0]) === '') throw DErr(ln, 'which message? like:  send "boom"');
        const body = this.prog.msgs[fmt(a[0]).toLowerCase()];
        if (body) this.events.push({ body, vars:{ message:a[1] ?? fmt(a[0]) } });
        break;
      }
      case 'calm': { const o = obj(0); this.behaviors = this.behaviors.filter(b => b.name !== o.name); break; }
      // ---- v3: lists ----
      // ---- v4: move things with keys you pick ----
      case 'controls': {
        const o = obj(0), set = fmt(a[1] ?? 'arrows').toLowerCase();
        if (set === 'none') { o.ctrl = ''; break; }
        if (['arrows', 'wasd', 'ijkl', 'numpad'].includes(set)) o.ctrl = set;
        else if (set.length === 4 || set.split(',').length === 4) { o.ctrl = 'custom'; o.ctrlKeys = set; }
        else throw DErr(ln, 'pick "arrows", "wasd", "ijkl", or 4 letters in the order up, left, down, right — like  controls @hero, "tfgh"');
        o.ctrlSpeed = typeof a[2] === 'number' ? a[2] : 4;
        const style = fmt(a[3] ?? 'move').toLowerCase();
        if (!['move', 'platform', 'drive'].includes(style)) throw DErr(ln, 'the style can be "move", "platform" (jumping) or "drive" (turn and go)');
        o.ctrlStyle = style; if (style === 'platform') o.physics = 1;
        break;
      }
      case 'action': {
        const o = obj(0);
        if (a[1] === 'none') { o.actKey = ''; o.act = ''; break; }
        const act = fmt(a[2] ?? 'sparkle').toLowerCase();
        if (!['jump', 'spin', 'sparkle', 'grow', 'shrink', 'color', 'hide', 'shoot'].includes(act) && !SOUNDS[act]) throw DErr(ln, 'actions: jump, spin, sparkle, grow, shrink, color, hide, shoot — or a sound name');
        o.actKey = normKey(fmt(a[1])); o.act = act; break;
      }
      // ---- v4: build levels from text ----
      case 'tile': {
        const ch = fmt(a[0]);
        if (ch.length !== 1) throw DErr(ln, 'tile needs one letter and a thing, like:  tile "#", @wall');
        const o = obj(1); this.tileMap[ch] = { name:o.name, once:a[2] === 'once' }; break;
      }
      case 'build': {
        const rows = a[0];
        if (!Array.isArray(rows)) throw DErr(ln, 'build needs a list of rows, like:  build level, 32');
        const size = typeof a[1] === 'number' ? a[1] : 32, x0 = a[2] ?? 0, y0 = a[3] ?? 0, used = new Set();
        rows.forEach((row, r) => [...fmt(row)].forEach((ch, c) => {
          const m = this.tileMap[ch]; if (!m || !this.objs[m.name]) return;
          const src = this.objs[m.name], o = m.once ? src : this.cloneOf(src, ln);
          if (!m.once) used.add(m.name);
          if (o.kind === 'rect' && !m.once) { o.w = size; o.h = size; o.x = x0 + c * size; o.y = y0 + r * size; }
          else { o.x = x0 + c * size + (size - o.w) / 2; o.y = y0 + r * size + (size - o.h) / 2; }
          o._px = o.x; o._py = o.y; o.visible = 1;
        }));
        for (const nm of used) if (this.objs[nm]) this.objs[nm].visible = 0;
        break;
      }
      case 'sortby': {
        if (!Array.isArray(a[0])) throw DErr(ln, 'sortby needs a list:  sortby players, "score"');
        const f = fmt(a[1]); a[0].sort((p, q) => cmpVals(this.isRecord(p) ? p[f] : p, this.isRecord(q) ? q[f] : q));
        if (a[2] === 'down' || a[2] === 'biggest') a[0].reverse();
        break;
      }
      case 'insert': if (!Array.isArray(a[0])) throw DErr(ln, 'insert needs a list:  insert things, 0, "new"'); a[0].splice(Math.floor(a[1]), 0, a[2]); break;
      case 'empty': if (!Array.isArray(a[0])) throw DErr(ln, 'empty needs a list:  empty things'); a[0].length = 0; break;
    }
  }
}

function canvasPoint(cv, e) {
  const r = cv.getBoundingClientRect();
  return { x:(e.clientX - r.left) * cv.width / r.width, y:(e.clientY - r.top) * cv.height / r.height };
}
function attachInput(engine, canvas, isActive) {
  const typing = () => { const t = document.activeElement && document.activeElement.tagName; return t === 'TEXTAREA' || t === 'INPUT' || t === 'SELECT'; };
  window.addEventListener('keydown', e => {
    if (!isActive() || typing() || e.ctrlKey || e.metaKey) return;
    const k = normKey(e.key);
    if (['left','right','up','down','space','tab'].includes(k)) e.preventDefault();
    engine.keyDown(k, e.repeat);
  });
  window.addEventListener('keyup', e => engine.keyUp(normKey(e.key)));
  window.addEventListener('blur', () => engine.keys.clear());
  canvas.addEventListener('pointermove', e => { const p = canvasPoint(canvas, e); engine.setMouse(p.x, p.y); });
  canvas.addEventListener('pointerdown', e => { if (!isActive()) return; const p = canvasPoint(canvas, e); engine.setMouse(p.x, p.y); engine.mouseDown(); });
  window.addEventListener('pointerup', () => engine.mouseUp());
}
