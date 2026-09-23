
const $ = (s) => document.querySelector(s);
const feed = $('#feed'), dot = $('#dot'), input = $('#input'), stopBtn = $('#stop');
const token = new URLSearchParams(location.search).get('token') || '';
const q = token ? ('&token=' + encodeURIComponent(token)) : ''; // SSE-only: EventSource cannot set headers
let es = null, live = false, sid = null;
let busyNow = false; // setStatus keeps it current; the optimistic queue entry keys off it
let knownQueue = []; // last queue SSE truth
let pendingQueue = []; // optimistic strip entries awaiting the queue SSE event
const pendingEchoes = []; // FIFO {text,node}: optimistic user items awaiting the real item event
let selToken = 0; // selection token: a stale async render must never paint over a newer selection
let listToken = 0; // sidebar refresh token: a stale list fetch never clobbers a newer one
const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} }; // persisted chrome + last selection
const lsGet = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
const fmtDate = (t) => {
  if (!t) return '';
  const d = (Date.now() - t) / 1000;
  if (d < 60) return 'now';
  if (d < 3600) return Math.floor(d/60) + 'm';
  if (d < 86400) return Math.floor(d/3600) + 'h';
  return Math.floor(d/86400) + 'd';
};
const fmtTok = (e) => { if (e == null) return '';
  if (e < 1000) return String(Math.round(e));
  if (e < 10000) return (e / 1000).toFixed(1) + 'k';
  if (e < 1000000) return Math.round(e / 1000) + 'k';
  return (e / 1000000).toFixed(1) + 'M'; };
const fmtDur = (s) => s >= 60 ? Math.floor(s / 60) + 'm ' + (s % 60) + 's' : s + 's';
const contextBits = (s) => s.contextTokens == null ? '' :
  fmtTok(s.contextTokens) + (s.contextPercent != null ? ' (' + Math.round(s.contextPercent) + '%)' : '');
const el = (cls, parent) => { const d = document.createElement('div'); d.className = cls; (parent||feed).appendChild(d); return d; };
const txt = (n, s) => { n.textContent = s; };
const URL_RE = /(https?:\/\/|www\.)\S+/g;
function linkify(text) {
  const frag = document.createDocumentFragment();
  let last = 0;
  text.replace(URL_RE, (m, _p, i) => {
    const url = m.replace(/[.,;:!?'")\]]+$/, ''); // trailing punctuation stays text
    if (i > last) frag.appendChild(document.createTextNode(text.slice(last, i)));
    const a = document.createElement('a');
    a.href = url.startsWith('www.') ? 'https://' + url : url;
    a.target = '_blank'; a.rel = 'noopener'; a.className = 'lnk'; a.textContent = url;
    frag.appendChild(a);
    last = i + url.length;
    return m;
  });
  if (last < text.length) frag.appendChild(document.createTextNode(text.slice(last)));
  return frag;
}

// --- 7ac: path links — file paths in feed text become clickable .plink
// anchors; the CLICK opens the viewer overlay (fetch on click ONLY — render
// never fetches). Detection: /Users/... absolutes, ~/ home paths, the
// .scratch/.worktrees repo-relative patterns (the corpus shapes: paths ride
// 42% of spawn briefs / 47% of agent replies / 78% of child replies / 84
// operator messages, all dead text today). Boundaries: whitespace/punctuation
// end a path; trailing sentence dots/slashes trim off the target; text inside
// existing anchors is skipped (never a nested <a>).
const PPATH_RE = /(?<![\w.~/-])(?:\/Users\/[A-Za-z0-9._-]+(?:\/[A-Za-z0-9._+=@-]+)*|~\/\.?[A-Za-z0-9._+=@-]+(?:\/[A-Za-z0-9._+=@-]+)*|\.(?:scratch|worktrees)\/[A-Za-z0-9._+=@-]+(?:\/[A-Za-z0-9._+=@-]+)*)/g;
function pathLinks(root) { // 7ac: DOM-walk text nodes post-sanitize; wrap matches in .plink anchors
  if (!root) return;
  const kidsOf = (n) => n.childNodes ?? n.kids ?? [];
  const isText = (n) => n && (n.nodeType === 3 || n.tag === '#text');
  const walk = (n, inA) => {
    for (const k of kidsOf(n)) {
      if (isText(k)) { if (!inA) pathify(k); }
      else walk(k, inA || k.tagName === 'A' || k.tag === 'a');
    }
  };
  walk(root, false);
}
function pathify(n) { // 7ac: one text node -> before/anchor/after (multiple matches per node)
  const val = (n.nodeType === 3 ? n.data : n.text) || '';
  if (val.indexOf('/Users/') < 0 && val.indexOf('~/') < 0
    && val.indexOf('.scratch/') < 0 && val.indexOf('.worktrees/') < 0) return; // cheap pre-filter
  const parent = n.parentNode ?? n.parent;
  if (!parent || typeof n.remove !== 'function') return; // node-harness mocks: mutate only real DOM shapes
  PPATH_RE.lastIndex = 0;
  const frag = document.createDocumentFragment();
  let last = 0, m, any = false;
  while ((m = PPATH_RE.exec(val))) {
    any = true;
    let cut = m[0].length;
    while (cut > 1 && /[.\/]$/.test(m[0][cut - 1])) cut--; // trailing sentence dots/slashes stay text
    if (m.index > last) frag.appendChild(document.createTextNode(val.slice(last, m.index)));
    const a = document.createElement('a');
    a.className = 'plink';
    a.textContent = m[0].slice(0, cut);
    if (a.dataset) a.dataset.p = m[0].slice(0, cut); else a.p = m[0].slice(0, cut); // real DOM: data-p; node harness: plain prop
    frag.appendChild(a);
    last = m.index + cut;
  }
  if (!any) return;
  if (last < val.length) frag.appendChild(document.createTextNode(val.slice(last)));
  parent.insertBefore(frag, n);
  n.remove();
}

// ---- feed markdown (7e): minimal hand-rolled renderer — copy the TUI, no deps.
// ALL text lands via createTextNode/textContent (never innerHTML), so markup
// is escaped BY CONSTRUCTION; link hrefs are scheme-validated below.
const MD_SAFE_URL_RE = /^(https?:\/\/|www\.)/; // http(s) only — javascript: etc render literal
function mdAnchor(url, label) { // same anchor treatment as the bare-URL linkify
  const a = document.createElement('a');
  a.href = url.startsWith('www.') ? 'https://' + url : url;
  a.target = '_blank'; a.rel = 'noopener'; a.className = 'lnk'; a.textContent = label;
  return a;
}
const MD_INLINE_RE = /`([^`\n]+)`|\*\*([^*\n]+)\*\*|__([^_\n]+)__|\*([^*\n]+)\*|_([^_\n]+)_|~~([^~\n]+)~~|\[([^\]\n]*)\]\(([^()\s]+)\)/g;
function mdInline(src, out) {
  let i = 0;
  while (i < src.length) {
    MD_INLINE_RE.lastIndex = i;
    const m = MD_INLINE_RE.exec(src);
    if (!m) { out.appendChild(linkify(src.slice(i))); break; }
    const end = MD_INLINE_RE.lastIndex; // the em/bold recursion re-execs this shared /g regex; a failed inner exec resets its lastIndex and i would loop forever
    if (m.index > i) out.appendChild(linkify(src.slice(i, m.index)));
    if (m[1] !== undefined) { const c = document.createElement('code'); c.textContent = m[1]; out.appendChild(c); }
    else if (m[2] !== undefined || m[3] !== undefined || m[4] !== undefined || m[5] !== undefined) {
      // CommonMark keeps _.._ intraword-safe (snake_case vars stay literal)
      if ((m[3] !== undefined || m[5] !== undefined) && m.index > 0 && /\w/.test(src[m.index-1])) {
        out.appendChild(document.createTextNode('_')); i = m.index + 1; continue;
      }
      const b = document.createElement(m[2] !== undefined || m[3] !== undefined ? 'b' : 'em');
      mdInline(m[2] ?? m[3] ?? m[4] ?? m[5], b); out.appendChild(b);
    }
    else if (m[6] !== undefined) { const s = document.createElement('s'); s.textContent = m[6]; out.appendChild(s); }
    else if (m[7] !== undefined) {
      if (MD_SAFE_URL_RE.test(m[8])) out.appendChild(mdAnchor(m[8], m[7]));
      else out.appendChild(document.createTextNode(m[0])); // unsafe scheme: literal, never an anchor
    }
    i = end;
  }
}
const MD_FENCE_OPEN_RE = /^```[ \t]*(\S*)[ \t]*$/;
const MD_FENCE_CLOSE_RE = /^\s*```\s*$/;
const MD_H_RE = /^(#{1,6})\s+(.*)$/;
const MD_HR_RE = /^\s*([-*_])\1{2,}\s*$/;
const MD_QUOTE_RE = /^\s*>/;
const MD_UL_RE = /^\s*[-*+]\s+(.*)$/;
const MD_OL_RE = /^\s*\d+[.)]\s+(.*)$/;
function mdRender(text, depth) { // -> DocumentFragment of block elements
  // 7ad: vendored marked + DOMPurify when both loaded (tables — the live
  // defect); typeof-guards so a lib-less boot or node harness falls through
  // to the hand-rolled renderer below (escaped by construction, as before).
  if (typeof marked !== 'undefined' && typeof DOMPurify !== 'undefined' && DOMPurify.isSupported) {
    const t = document.createElement('template'); // inert parse; sanitize already ran
    t.innerHTML = DOMPurify.sanitize(marked.parse(String(text ?? '')));
    for (const a of t.content.querySelectorAll('a'))
      { a.target = '_blank'; a.rel = 'noopener'; a.classList.add('lnk'); } // same link treatment as the fallback (css .lnk)
    pathLinks(t.content); // 7ac: post-sanitize DOM walk — paths become .plink anchors (fetch stays click-only)
    return t.content;
  }
  return mdRenderHouse(text, depth);
}
function mdRenderHouse(text, depth) { // in-house fallback — copy the TUI, no deps
  const frag = document.createDocumentFragment();
  const lines = String(text ?? '').split('\n');
  let para = null, list = null, quote = null, i = 0;
  const flushPara = () => { if (!para) return;
    const d = document.createElement('div'); d.className = 'md-p';
    para.forEach((ln, k) => { if (k) d.appendChild(document.createElement('br')); mdInline(ln, d); });
    frag.appendChild(d); para = null; };
  const flushList = () => { if (list) { frag.appendChild(list); list = null; } };
  const flushQuote = () => { if (!quote) return;
    const q = document.createElement('div'); q.className = 'md-quote';
    if ((depth || 0) >= 4) mdInline(quote.join(' '), q); // nesting cap: deeper reads as text
    else q.appendChild(mdRender(quote.join('\n'), (depth || 0) + 1));
    frag.appendChild(q); quote = null; };
  const flushAll = () => { flushPara(); flushList(); flushQuote(); };
  while (i < lines.length) {
    const ln = lines[i];
    if (MD_FENCE_OPEN_RE.test(ln)) { flushAll();
      const lang = MD_FENCE_OPEN_RE.exec(ln)[1];
      i++; const body = [];
      while (i < lines.length && !MD_FENCE_CLOSE_RE.test(lines[i])) body.push(lines[i++]);
      if (i < lines.length) i++; // closing fence; a broken fence renders the tail as code
      const wrap = document.createElement('div'); wrap.className = 'md-code';
      if (lang) { const l = document.createElement('span'); l.className = 'md-lang'; l.textContent = lang; wrap.appendChild(l); }
      const pre = document.createElement('pre'); const code = document.createElement('code');
      code.textContent = body.join('\n'); pre.appendChild(code); wrap.appendChild(pre);
      frag.appendChild(wrap); continue;
    }
    const h = MD_H_RE.exec(ln);
    if (h) { flushAll(); const d = document.createElement('div'); d.className = 'md-h'; mdInline(h[2].trim(), d); frag.appendChild(d); i++; continue; }
    if (MD_HR_RE.test(ln)) { flushAll(); frag.appendChild(document.createElement('hr')); i++; continue; }
    if (MD_QUOTE_RE.test(ln)) { flushPara(); flushList();
      if (!quote) quote = [];
      quote.push(ln.replace(/^\s*> ?/, '')); i++; continue; }
    const ul = MD_UL_RE.exec(ln);
    if (ul) { flushPara(); flushQuote();
      if (!list || list.tagName !== 'UL') { flushList(); list = document.createElement('ul'); list.className = 'md-ul'; }
      const li = document.createElement('li'); mdInline(ul[1], li); list.appendChild(li); i++; continue; }
    const ol = MD_OL_RE.exec(ln);
    if (ol) { flushPara(); flushQuote();
      if (!list || list.tagName !== 'OL') { flushList(); list = document.createElement('ol'); list.className = 'md-ol'; }
      const li = document.createElement('li'); mdInline(ol[1], li); list.appendChild(li); i++; continue; }
    if (!ln.trim()) { flushAll(); i++; continue; }
    flushList(); flushQuote(); // lists/quotes end at any other content
    (para || (para = [])).push(ln); i++;
  }
  flushAll();
  pathLinks(frag); // 7ac: same walk for the house renderer (idempotent — nested quote renders pass twice)
  return frag;
}
feed.addEventListener('scroll', () => { if (feedGap() < PIN) pillHide(); }); // 7ao: reaching the bottom re-hides the pill (manual scroll or content-follow)
// 7ao scroll-fight fix: pinned-bottom-only autoscroll. The old nearBottom
// flag (80px, recomputed ONLY on scroll events) was stale by construction —
// appends below the fold fire no scroll event, so the flag kept saying
// "pinned" while every delta's scrollTo yanked the operator's wheel back
// down (the fight). Now every feed-appending site measures the gap BEFORE
// its DOM update: <40px = pinned (follow the new bottom after the append),
// else NO scrollTo at all — the browser preserves scrollTop across appends —
// and new content lights the grey "↓ latest" pill instead.
let pill = null;
function pillHide() { if (pill) pill.style.display = 'none'; }
function pillShow() {
  if (!pill) {
    pill = document.createElement('button');
    pill.className = 'feedpill';
    txt(pill, '↓ latest');
    pill.addEventListener('click', () => { feed.scrollTop = feed.scrollHeight; pillHide(); }); // jump + re-pin
    feed.parentNode.appendChild(pill); // inside #session (position:relative) — NOT the feed: snapshot wipes must not destroy it
  }
  const comp = $('#composer'), qb = $('#queue'); // the pill floats above the composer (+ any queue strip), whatever their height
  pill.style.bottom = (((comp && comp.offsetHeight) || 0) + ((qb && qb.offsetHeight) || 0) + 12) + 'px';
  pill.style.display = 'block';
}
// 7ad: vendored md libs — script tags injected here (the html template lives
// in server.mjs); a missing /static route or offline boot just 404s and the
// in-house fallback above keeps rendering. onload chain: purify after marked.
(function loadMdLibs() {
  const add = (src, onload) => {
    const s = document.createElement('script');
    s.src = src; s.onload = onload || null;
    document.head.appendChild(s);
  };
  add('/static/marked.min.js', () => add('/static/purify.min.js'));
})();
const toolStatus = {}; let liveNode = null, liveTextSeen = 0; // liveTextSeen: 7ap typewriter gate — the live stream carried text for THIS message (lives HERE so the applyItem batteries inherit the declaration)
// 7ao pin state: PIN px from the bottom still counts as pinned; feedGap is
// the pre-measure (call it BEFORE the DOM update — after an append the gap
// already grew). || 0 guards: a dimension-less feed (headless boards) is
// always "pinned", never scrolls, never pills.
const PIN = 40;
const feedGap = () => (feed.scrollHeight || 0) - (feed.scrollTop || 0) - (feed.clientHeight || 0);
const cmText = new WeakMap(); // 7ah: feed item node -> its RAW source text (the Copy-text action reads it at right-click)
function endLive() { if (liveNode) { (liveNode.node ?? liveNode).querySelector?.('.cursor')?.remove(); } liveNode = null; liveTextSeen = 0; if (tw) twFinish(); } // 7ap: a running typewriter reveal completes when its message ends — it never writes behind a newer item
function renderAssistant(item, streaming) {
  const n = el('item assistant');
  if (item.thinking) {
    const t = document.createElement('details'); t.className = 'thinking'; t.open = detailMode === 2; n.appendChild(t); // 47-bench P0#2: born mode-correct (open only in Expanded)
    const s = document.createElement('summary'); txt(s, 'thinking'); t.appendChild(s);
    if (item.ts) itemTime(s, item.ts, 'span'); // ts nit: thinking items carry their time on the SUMMARY line — right, top, in line with the label (not center-floating next to the text below)
    const d = document.createElement('div'); txt(d, item.thinking); t.appendChild(d);
  }
  const body = document.createElement('div'); body.appendChild(mdRender(item.text)); n.appendChild(body);
  if (item.tokens) {
    const u = document.createElement('div'); u.className = 'usage';
    txt(u, item.tokens.toLocaleString() + ' tok' + (item.cost != null ? ' · $' + item.cost.toFixed(4) : ''));
    n.appendChild(u);
  }
  body.className = 'md-body'; // 7(r) tweak: flow-root — contains the floated .item-time
  const tm = (item.ts && !item.thinking) ? itemTime(body, item.ts) : null; // 7(r) tweak + ts nit: no-thinking items float the ts inside the body; thinking items moved it up to the summary — never two clocks on one message
  let c = null;
  if (streaming) { c = document.createElement('span'); c.className = 'cursor'; body.appendChild(c); } // 7(z): the cursor rides INLINE after the text — one element, moved per delta, never re-created
  return { node: n, body, time: tm, cursor: c };
}
// 7ab: ipython cells split CODE vs OUTPUT — the args JSON carries the input
// code; the card renders it as a mono code block (tcode, grey-1 bg) instead
// of the raw args blob, and the result rides its own preformatted block
// (tout, distinct bg via the .ipy card class). Non-code tools keep the
// plain targs treatment. A keyword-extended highlighter for code is a stretch
// goal — the SPLIT is the fix; the code stays plain mono here.
function ipyCell(args) { // {code, rest} when the args parse and carry a code string; null otherwise
  if (typeof args !== 'string' || !args) return null;
  let a; try { a = JSON.parse(args); } catch (e) { return null; }
  if (!a || typeof a.code !== 'string') return null;
  const rest = Object.keys(a).filter((k) => k !== 'code').map((k) => k + '=' + JSON.stringify(a[k])).join(' ');
  return { code: a.code, rest };
}
function toolCard(id, name, status, args) {
  let t = toolStatus[id];
  if (!t) {
    const root = document.createElement('details'); root.className = 'toolcard ' + status; root.open = detailMode === 2 || detailMode === 1; feed.appendChild(root); // 47-bench P0#2: born mode-correct (toolcards open in Details + Expanded — the applyDetailMode rule, at creation)
    const nm = document.createElement('summary'); nm.className = 'tname'; root.appendChild(nm);
    const ar = document.createElement('div'); ar.className = 'targs'; root.appendChild(ar);
    const out = document.createElement('div'); out.className = 'tout'; root.appendChild(out);
    t = toolStatus[id] = { root, nm, ar, out };
    if (args) t.ipy = ipyCell(args); // decided once at creation — update calls (args absent at end) keep it
    if (args) tcArgs(t, args);
  }
  t.root.className = 'toolcard ' + status + (t.ipy ? ' ipy' : '');
  txt(t.nm, name + (status==='running' ? ' — running' : status==='error' ? ' — error' : ''));
  if (args !== undefined) tcArgs(t, args);
  return t;
}
function tcArgs(t, args) { // 7ab: the args slot renders the code mono for code cells; raw for the rest
  if (t.ipy) { t.ar.className = 'tcode'; txt(t.ar, t.ipy.code + (t.ipy.rest ? '\n· ' + t.ipy.rest : '')); }
  else { t.ar.className = 'targs'; txt(t.ar, args); }
  pathLinks(t.ar); // 7ac: spawn-brief/edit paths inside args open the viewer too
}
// 7ab: in-house JSON highlight — NO vendored dep, a ~30-line regex tokenizer.
// The agentmsg body often carries an A2A envelope as a one-line blob; when the
// text parses as JSON we pretty-print (2-space) and color the tokens: keys
// grey-3, strings a green-grey, numbers/bools/null distinct. Non-JSON text
// keeps the plain render (the caller falls back to txt()). All text lands via
// createTextNode/textContent — escaped by construction, like the md renderer.
function jsonHighlight(t) { // a fragment of .j-* spans + text nodes, or null when not JSON
  let v;
  try { v = JSON.parse(t); } catch (e) { return null; }
  if (t.trim().slice(0, 1) !== '{' && t.trim().slice(0, 1) !== '[') return null; // scalars ("123", "true") parse fine but highlight as nothing — keep them plain
  const src = JSON.stringify(v, null, 2);
  const frag = document.createDocumentFragment();
  const RE = /"(?:\\.|[^"\\])*"\s*:|"(?:\\.|[^"\\])*"|-?\b\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\b|true|false|null/g;
  let last = 0, m;
  while ((m = RE.exec(src))) {
    if (m.index > last) frag.appendChild(document.createTextNode(src.slice(last, m.index)));
    const tk = m[0];
    const sp = document.createElement('span');
    sp.className = tk.endsWith(':') ? 'j-key' : tk[0] === '"' ? 'j-str' : (tk === 'true' || tk === 'false') ? 'j-bool' : tk === 'null' ? 'j-null' : 'j-num';
    sp.textContent = tk;
    frag.appendChild(sp);
    last = m.index + tk.length;
  }
  if (last < src.length) frag.appendChild(document.createTextNode(src.slice(last)));
  return frag;
}
// --- 7(r): per-item timestamps — grey, non-accent; HH:MM today, MMM DD HH:MM
// across a day boundary. Items without ts (data absent) render no time. ---
const MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const two0 = (n) => String(n).padStart(2, '0');
const fmtTime = (ts) => {
  if (!ts) return '';
  const d = new Date(ts), now = new Date();
  const hm = two0(d.getHours()) + ':' + two0(d.getMinutes());
  return (d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate())
    ? hm : MON[d.getMonth()] + ' ' + two0(d.getDate()) + ' ' + hm;
};
function itemTime(n, ts, tag) { if (!n || !ts) return; const t = document.createElement(tag || 'div'); t.className = 'item-time'; txt(t, fmtTime(ts)); n.insertBefore(t, n.firstChild); return t; } // 7(r) tweak: FIRST child — a float must precede the text to ride its first line
function youLabel(n) { const y = document.createElement('div'); y.className = 'you'; txt(y, 'USER'); n.insertBefore(y, n.firstChild); return y; } // 7al: user-item identity — grey-4 caps tag (7aa-c-adjacent legibility nit), FIRST child (the time float rides the same line)
function applyItem(item, streaming, live) { // live: the SSE item path ONLY — disk/snapshot renders pass nothing (the typewriter never replays history)
  const wasPinned = feedGap() < PIN, h0 = feed.scrollHeight; // 7ao: pre-measured BEFORE the appends — see the pill block
  const prev = feed.lastElementChild; // 7ah: the tail hook stamps ONLY a newly-appended node — a no-op call re-stamps nothing
  switch (item.kind) {
    case 'user': endLive();
      // optimistic-echo reconcile: the first FIFO-matching pending node is
      // consumed by the real server item (exact text, one per send)
      const pe = pendingEchoes.findIndex((x) => x.text === item.text);
      if (pe >= 0) { pendingEchoes[pe].node.remove(); pendingEchoes.splice(pe, 1); }
      const un = el('item user md-body'); itemTime(un, item.ts); youLabel(un); un.appendChild(mdRender(item.text)); break; // 7ak/7al: the .md-body treatment styles the marked blocks (pre-wrap lives in .md-body p now); YOU leads the meta row
    case 'assistant':
      const ph = liveNode, hadLiveText = liveTextSeen > 0; endLive(); // F3: the final item replaces the streaming placeholder — one node per message, like the disk path
      const r = renderAssistant(item, streaming);
      if (streaming) { liveNode = r; } else {
        if (ph) (ph.node ?? ph)?.remove?.();
        for (const tc of item.toolCalls || []) if (!toolStatus[tc.id]) toolCard(tc.id, tc.name, 'done', tc.args);
        // 7ap typewriter (cosmetic — masks gateway-buffered arrivals: ~10% of
        // text messages land as a silent wait + one <=27ms burst, no partial
        // text ever existed upstream): a live-path FINAL item that never saw
        // one text-bearing live delta reveals instead of dumping. The
        // streaming path is untouched — deltas in, no reveal.
        if (live && !hadLiveText && item.text) typewriterReveal(r.body, item.text);
      }
      break;
    case 'tool':
      const c = toolCard(item.id, item.toolName, item.status, item.args);
      if (item.ts) itemTime(c.nm, item.ts, 'span');
      if (item.text) { c.out.textContent = ''; c.out.appendChild(linkify(item.text)); }
      if (item.text) pathLinks(c.out); // 7ac: toolcard output text linkifies (raw text, no md — the pinned line above stays verbatim)
      break;
    case 'notice': endLive(); const nn = el('item notice' + (item.boundary ? ' boundary' : '')); txt(nn, item.text); itemTime(nn, item.ts); break; // G2: the compaction strip carries the boundary class
    case 'custom': endLive();
      // 7ag: refinement boxes — TUI special-box parity. Refinements
      // (refinement_notice/refinement_outcome custom messages) get their OWN
      // accented treatment: hairline frame + lime label/edge, body stays grey
      // (the accent law: no lime flood). Distinct from plain notices and the
      // agentmsg collapse.
      if (item.label === 'refinement_notice' || item.label === 'refinement_outcome') {
        const rn = el('item refine');
        const rb = document.createElement('b'); txt(rb, item.label); rn.appendChild(rb);
        const rs = document.createElement('div'); txt(rs, item.text || ''); rn.appendChild(rs);
        if (item.ts) itemTime(rn, item.ts);
      }
      // 7(s): subagent replies collapse like thinking/toolcards — summary =
      // label + first-line preview, body = full text; applyDetailMode opens
      // them only in Expanded (no toolcard class).
      else if (item.label === 'agent_message' || (item.text || '').startsWith('[agent-message')) {
        const dd = document.createElement('details'); dd.className = 'item custom agentmsg'; dd.open = detailMode === 2; feed.appendChild(dd); // 47-bench P0#2: born mode-correct (agentmsg opens only in Expanded)
        const su = document.createElement('summary'); dd.appendChild(su);
        txt(su, (item.label + ' ' + ((item.text || '').split('\n')[0] || '')).slice(0, 60));
        if (item.ts) itemTime(su, item.ts, 'span');
        const bd = document.createElement('div');
        const hi = jsonHighlight(item.text || ''); // 7ab: JSON bodies pretty-print + highlight; non-JSON keeps the plain render
        if (hi) bd.appendChild(hi); else txt(bd, item.text || '');
        pathLinks(bd); // 7ac: child-reply report paths linkify (JSON string values included)
        dd.appendChild(bd);
      } else {
        const n = el('item custom'); const b = document.createElement('b'); txt(b, item.label); n.appendChild(b);
        const s = document.createElement('span'); txt(s, ' ' + item.text); n.appendChild(s);
        if (item.ts) itemTime(n, item.ts);
      }
      break;
  }
  const last = feed.lastElementChild; // 7ah: the Copy-text hook — the node this call just appended (the pinned user line stays untouched)
  if (last && last !== prev && item.text != null) cmText.set(last, item.text);
  if (feed.scrollHeight > h0) { if (wasPinned) feed.scrollTop = feed.scrollHeight; else pillShow(); } // 7ao: pinned follows the new bottom; unpinned stays put + the pill lights (no growth = no scroll, no pill)
  // 47-bench P0#2: no per-item detail-mode sweep — details are born mode-correct
  // (construction sites below) and the replay loops apply it once after the
  // batch (showSession). The old querySelectorAll-per-item was the O(n^2)
  // behind the ~112ms open freeze; it also stomped manually-opened blocks on
  // every arriving item. Single SSE items (one per event) need no sweep.
}
// 7ap typewriter reveal — ponytail: PURE COSMETIC client-side smoothing for
// gateway-buffered arrivals (the upstream never streamed partial text, so
// nothing real is being faked — the dump just gets paced). The streaming path
// (live deltas) is untouched: hadLiveText gates it. ~24 steps over ~720ms,
// the cursor leading the text; window.__TW_FAST (tests) completes on the
// first tick. Upgrade path if this ever reads as fake: drop it — the fix for
// the bimodal gateway is upstream (LiteLLM router config), not here.
let tw = null; // the running reveal: { iv, body, text, time }
const TW_STEP_MS = 30, TW_STEPS = 24;
function twFinish() { // render the full text instantly (endLive mid-reveal, or the last tick)
  if (!tw) return;
  clearInterval(tw.iv);
  const w = tw; tw = null;
  const wasPinned = feedGap() < PIN, h0 = feed.scrollHeight;
  w.body.textContent = '';
  if (w.time) w.body.appendChild(w.time); // the body's own ts float rides every frame — same shape as the live handler
  w.body.appendChild(mdRender(w.text));
  if (feed.scrollHeight > h0) { if (wasPinned) feed.scrollTop = feed.scrollHeight; else pillShow(); }
}
function typewriterReveal(body, text) {
  if (tw) twFinish(); // one reveal at a time — a rapid dump sequence never double-reveals
  let n = 0;
  const step = Math.max(1, Math.ceil(text.length / TW_STEPS)); // short messages finish in their own length, not the full 24 ticks
  const cur = document.createElement('span'); cur.className = 'cursor'; // the same blinking treatment the live stream wears
  const time = body.querySelector ? body.querySelector('.item-time') : null;
  const paint = (k) => { // the reveal frame: time float + prefix + the cursor leading the head
    const wasPinned = feedGap() < PIN, h0 = feed.scrollHeight;
    body.textContent = '';
    if (time) body.appendChild(time);
    body.appendChild(mdRender(text.slice(0, k)));
    body.appendChild(cur);
    if (feed.scrollHeight > h0) { if (wasPinned) feed.scrollTop = feed.scrollHeight; else pillShow(); }
  };
  tw = { iv: 0, body, text, time };
  paint(step); // first frame NOW — never a flash of the dumped full text before the reveal starts
  tw.iv = setInterval(() => {
    n++;
    const k = Math.min(text.length, (n + 1) * step);
    if ((typeof window !== 'undefined' && window.__TW_FAST) || n >= TW_STEPS || k >= text.length) { twFinish(); return; }
    paint(k);
  }, TW_STEP_MS);
}
let busyStart = null, busyTick = null, turn = null; // TUI turn strip (TUI-META-SPEC.md §8)
const BURST_GAP = 2000; // >2s of live-delta silence = the inference burst is over
function busyReset(promptChars, startedAt) { turn = { start: (startedAt && startedAt > 0) ? startedAt : null, promptChars: promptChars || 0, textChars: 0, thinkingChars: 0, label: 'Waiting', lastDeltaAt: 0, toolAt: 0, burst: null }; } // honest timer: no anchor -> --:--
function busyUpdate(d) {
  if (!turn) busyReset();
  const downBefore = Math.ceil((turn.textChars + turn.thinkingChars) / 4);
  if (d.turnTextChars != null) turn.textChars = d.turnTextChars;
  if (d.turnThinkingChars != null) turn.thinkingChars = d.turnThinkingChars;
  const now = Date.now();
  if (d.turnTextChars != null || d.turnThinkingChars != null) { // a live token delta
    const down = Math.ceil((turn.textChars + turn.thinkingChars) / 4);
    if (turn.burst && down < turn.burst.baseDown) turn.burst = null; // 7(t): counters reset below the window baseline (busy re-anchor / steer delivered) — the burst is dead, this delta opens a fresh one
    if (!turn.burst || turn.toolAt > turn.burst.lastAt || now - turn.lastDeltaAt > BURST_GAP)
      turn.burst = { startAt: now, baseDown: Math.min(downBefore, down), lastAt: now }; // new burst: fresh sample window, honest baseline; cumulative token totals carry
    else turn.burst.lastAt = now; // same burst: the window extends with each delta
    turn.lastDeltaAt = now;
  }
  if (d.tool) turn.toolAt = now; // inference paused — the burst freezes at its last delta
  turn.label = d.tool ? 'Tool' : (turn.thinkingChars > 0 && turn.textChars === 0) ? 'Thinking'
    : turn.textChars > 0 ? 'Writing' : turn.label;
  busyRender();
  renderSubTok(); // 7ar: per-delta header tick — the counter climbs while the model streams
}
function busyRender() {
  if (!turn || !busyStart) return;
  if (turn.start == null) { txt($('#busyTimer'), turn.label + ' \u00b7 --:--'); return; } // honest timer: no busySince anchor known
  const secs = Math.max(1, Math.round((Date.now() - turn.start) / 1000));
  const up = Math.ceil(turn.promptChars / 4), down = Math.ceil((turn.textChars + turn.thinkingChars) / 4);
  let s = turn.label + ' \u00b7 ' + fmtDur(secs);
  if (up) s += ' \u00b7 \u2191 ' + fmtTok(up) + ' tok';
  if (down) { s += ' \u00b7 \u2193 ' + fmtTok(down) + ' tok';
    if (turn.burst) s += ' \u00b7 ' + fmtTok(Math.max(0, down - turn.burst.baseDown) / Math.max(1, Math.round((turn.burst.lastAt - turn.burst.startAt) / 1000))) + '/s'; } // 7(c) burst rate: THIS window's tokens / its seconds — a pause/tool freezes it, a new burst resets the window; 7(t): the rendered rate never goes negative
  txt($('#busyTimer'), s);
}
let usageKnown = null; // 7ar: accumulated usage the header counts (view-load base + completed live messages)
function liveTok() { // 7ar: the live-turn estimate — last-known usage + floor(turnChars/4); ponytail: between a message's completion and the NEXT message's first delta the beacon's counters still hold the completed message's chars, so the estimate briefly double-counts it (seconds, self-corrects on the next delta or at settle) — same estimate class as the burst strip
  if (!busyNow || !turn) return null;
  return (usageKnown ?? 0) + Math.floor((turn.textChars + turn.thinkingChars) / 4);
}
function renderSubTok() { // 7ar: re-render the header sub line — the tok bit re-reads liveTok()
  if (!paneMeta) return;
  txt($('#sSub'), subBits(paneMeta));
}
function setWorking(on) {
  const el_ = $('#busyTimer');
  if (on) {
    if (!busyStart) busyStart = Date.now(); // busy gate only — NOT a fake elapsed anchor (a real anchor arrives via busy/snapshot startedAt)
    if (!turn) busyReset();
    el_.style.display = 'inline';
    busyRender();
    if (!busyTick) busyTick = setInterval(busyRender, 1000);
  } else {
    busyStart = null; turn = null;
    if (busyTick) { clearInterval(busyTick); busyTick = null; }
    el_.style.display = 'none';
  }
}
function setStatus(b) { busyNow = b; dot.classList.toggle('on', b); document.body.classList.toggle('busy', b);
  stopBtn.style.display = (b && live) ? 'inline-block' : 'none'; setWorking(b);
  renderSubTok(); // 7ar: turn end settles the header tok to the real accumulated usage
  if (pop && pop.kind === 'cmds') renderPop(); } // busy flip re-greys the palette
function closeEvents() { if (es) { es.close(); es = null; } }
async function api(p) { // nav-debug RC2: fetch+json wrapped; failures return null and callers show a notice
  try { const r = await fetch(p, { headers: { 'x-prime-token': token } }); return await r.json(); }
  catch (e) { return null; }
}
async function showList() { // sidebar refresh: rows render ONLY in the sidebar; the open pane is untouched
  const tok = ++listToken;
  const data = await api('/api/sessions');
  if (tok !== listToken) return; // a newer refresh won the race
  listData = data; // 7an: the payload caches — the search filter re-renders it live, no refetch per keystroke
  renderList();
}
// 7an sidebar search: a hairline input at the top of the list filters the
// cached rows LIVE (client-side; the sessions array is in memory post-refresh).
// Match fields per the corpus finding: name + cwd + id + the activity recap —
// names exist on ~24% of sessions, so the recap carries the content-ish recall.
let searchQ = '', listData = null;
const searchEl = $('#search'), searchCountEl = $('#searchCount');
const rowMatch = (s, qy) => [s.name, s.cwd, s.id, s.activity].some((f) => typeof f === 'string' && f.toLowerCase().includes(qy));
const treeMatch = (s, qy) => rowMatch(s, qy) || (s.children || []).some((c) => treeMatch(c, qy)); // a matching child keeps its ancestor chain visible
searchEl.addEventListener('input', () => { searchQ = searchEl.value; renderList(); });
searchEl.addEventListener('keydown', (e) => { if (e.key === 'Escape') { searchEl.value = ''; searchQ = ''; renderList(); } }); // clear-on-Escape
function renderList() { // 7an: pure render from the cached payload — empty input = all rows
  const data = listData;
  const box = $('#rows'); box.innerHTML = '';
  if (!data || !Array.isArray(data.sessions)) { txt(el('list-err', box), 'list unavailable \u2014 retrying'); return; } // nav-debug RC2: notice in place of rows; the 15s tick retries
  const qy = searchQ.trim().toLowerCase();
  const keep = (s) => !qy || treeMatch(s, qy);
  const secs = [[], [], []]; // TUI list sections: running / idle / inactive
  let shown = 0;
  for (const s of data.sessions) {
    if (qy && !keep(s)) continue; // the filter composes with the section state — matches only
    shown++;
    (s.live && s.status === 'working' ? secs[0] : s.live ? secs[1] : secs[2]).push(s);
  }
  txt(searchCountEl, qy ? shown + '/' + data.sessions.length : ''); // the subtle n/total; empty input = no count
  const labels = ['Running', 'Idle', 'Inactive'];
  for (let i = 0; i < 3; i++) { // sections ALWAYS render — a zero-row section keeps its header + dimmed 'none'
    if (qy && !secs[i].length) continue; // 7an: while filtering, a zero-match section hides entirely
    const sec = el('list-section', box);
    txt(el('section-head caps', sec), labels[i]);
    if (!secs[i].length) txt(el('list-none', sec), 'none'); // visible negative space: 'no active agents' is a fact on screen
    else for (const s of secs[i]) renderRow(s, sec, 0, keep);
  }
}
const expanded = new Set(); // children collapsed by default; survives list refreshes, resets on page load
function renderRow(s, box, depth, keep) { // keep: 7an search predicate (undefined = unfiltered, all children render)
  const row = el('row', box);
  if (depth) { row.classList.add('child'); row.style.paddingLeft = (20 + depth * 24) + 'px'; }
  const main = document.createElement('div'); main.className = 'row-main'; row.appendChild(main);
  const kids = s.children || [];
  if (kids.length) { // TUI tree parity: caret before the title; click toggles, never opens the session
    const caret = document.createElement('span');
    caret.className = 'caret' + (expanded.has(s.id) ? ' open' : '');
    txt(caret, expanded.has(s.id) ? '▾' : '▸'); // expanded ▾ / collapsed ▸
    caret.onclick = (e) => { e.stopPropagation();
      if (!s.id) return;
      if (expanded.has(s.id)) expanded.delete(s.id); else expanded.add(s.id);
      showList(); };
    main.appendChild(caret);
  }
  // line 1 — the narrow-column read: live badge + title + age, nothing else inline
  if (s.live) { const b = document.createElement('span'); b.className = s.status === 'working' ? 'badge' : 'badge idle'; txt(b, 'live'); main.appendChild(b); } // 7w: two-tier — lime stays working-only; live-but-idle wears the grey-3 outline (the subs bar keeps its own ●/◐/○ tiers)
  const title = document.createElement('span'); title.className = 'title';
  txt(title, s.name || s.firstMessage || s.cwd || s.id || s.childId); main.appendChild(title);
  const age = document.createElement('span'); age.className = 'age';
  txt(age, s.modified ? fmtDate(s.modified) : ''); main.appendChild(age);
  if (s.activity) { // line 2 — the activity recap, the operator's primary read: flex-fill, ellipsized
    const line2 = document.createElement('div'); line2.className = 'row-line2'; row.appendChild(line2);
    const act = document.createElement('span'); act.className = 'activity'; // TUI Activity column
    txt(act, s.activity); line2.appendChild(act);
    if (s.live && s.status === 'working') act.classList.add('working'); // working accent lives on the activity line
  }
  const bits = []; // meta de-cluttered: model:thinking, ctx, subs, count, cost live in the detail tooltip
  if (s.childId) bits.push(s.childId);
  if (s.status) bits.push(s.status);
  if (s.model) bits.push(s.model + (s.thinkingLevel ? ':' + s.thinkingLevel : ''));
  const ctx = contextBits(s); if (ctx) bits.push(ctx);
  if (s.subs && s.subs.total) bits.push('\u25cf' + s.subs.running + ' \u25d0' + s.subs.idle + ' \u25cb' + s.subs.inactive);
  if (s.count) bits.push(s.count + ' msg');
  if (s.totalCost > 0) bits.push('$' + s.totalCost.toFixed(2));
  row.title = [s.cwd || '', bits.join(' · ')].filter(Boolean).join('\n'); // tooltip: cwd line 1, bits line 2
  row.dataset.id = s.id || '';
  row.dataset.live = s.live ? '1' : '0'; // 7aq: liveness at right-click time — the context menu's Resume shows on inactive rows only
  if (s.id === sid) row.classList.add('selected'); // accent left edge marks the open conversation
  row.onclick = () => { if (s.id) showSession(s.id); }; // a click loads the row into the pane — no hash writes
  if (kids.length && expanded.has(s.id)) for (const c of kids) { if (keep && !keep(c)) continue; renderRow(c, box, depth + 1, keep); } // 7an: the filter composes with collapse — matching children render, the rest drop
}
function markSelected() { // immediate sidebar marking between 15s re-renders (renderRow marks on draw)
  document.querySelectorAll('#rows .row').forEach((r) => r.classList.toggle('selected', sid != null && r.dataset.id === sid));
}
function restoreFailed() { // persisted selection is gone (404): fall back to the empty pane state, clear the stored id
  sid = null; paneMeta = null; markSelected(); // 7am: no pane -> no prefill source; a stale cwd must never leak into /new
  lsSet('webuiSelected', '');
  $('#emptyNote').style.display = 'block'; $('#sError').style.display = 'none'; $('#pastNote').style.display = 'none';
  $('footer').classList.add('hidden');
  $('#sTitle').textContent = ''; $('#sSub').textContent = ''; $('#sSubs').style.display = 'none';
}
async function showSession(id, restore) { // selection model: one click loads a session into the pane — no views, no router
  const tok = ++selToken;
  closeEvents(); // selection swap closes the previous session's stream FIRST — never two SSE
  sid = id; markSelected();
  lsSet('webuiSelected', id || ''); // selection persists — a refresh re-opens what the operator was reading
  feed.innerHTML = ''; for (const k in toolStatus) delete toolStatus[k]; endLive();
  pendingEchoes.length = 0; busyNow = false; knownQueue = []; pendingQueue = [];
  showQueue([]); hideSendErr(); closePop(); closeMenu(); // strip + notices + pickers + the settings menu reset with the pane
  menuBtn.style.display = 'none'; // a pane swap hides the hamburger until the row proves live
  resumeBtn.style.display = 'none'; // 7aq: the same swap-time hide — the pane load decides whether the dead-pane Resume shows
  $('#emptyNote').style.display = 'none';
  $('#sError').style.display = 'none';
  const s = await api(SESSION_API + encodeURIComponent(id));
  if (tok !== selToken) return; // a newer selection won the race — never paint a stale session
  if (!s || !Array.isArray(s.items)) {
    setStatus(false); // F2: a failed load clears any busy header leaked from the previous pane
    if (restore) { restoreFailed(); return; } // stored id no longer resolves: empty pane, not an error banner
    live = false; paneMeta = null; $('footer').classList.add('hidden'); $('#pastNote').style.display = 'none'; $('#sError').style.display = 'block'; return; } // nav-debug RC2: session unavailable notice (+ 7am: paneMeta dies with the pane)
  paneMeta = s; // the menu reads the row's own metadata (id/cwd/model/thinking + the header bits)
  usageKnown = s.totalTokens ?? 0; // 7ar: the header counter's base — view-load truth, grown by live-completed messages as they land
  $('#sTitle').textContent = s.name || s.firstMessage || s.cwd || s.id;
  $('#sSub').textContent = subBits(s);
  const sb = $('#sSubs');
  if (s.subs && s.subs.total) {
    sb.style.display = 'block'; sb.innerHTML = '';
    const seg = (glyph, n, label, cls) => { const sp = document.createElement('span'); sp.className = cls;
      txt(sp, glyph + ' ' + n + ' ' + label + '  '); sb.appendChild(sp); };
    seg('●', s.subs.running, 'running', 'sbar-run');
    seg('◐', s.subs.idle, 'idle', 'sbar-idle');
    seg('○', s.subs.inactive, 'inactive', 'sbar-inact');
  } else { sb.style.display = 'none'; }
  $('footer').classList.toggle('hidden', !s.live);
  live = !!s.live;
  menuBtn.style.display = s.live ? '' : 'none'; // settings need the session running (the proxy 404s a dead row)
  txt(resumeBtn, 'Resume'); resumeBtn.disabled = false; // 7aq: reset any optimistic resuming state from a previous view of this pane
  resumeBtn.style.display = (!s.live && !s.parent) ? '' : 'none'; // 7aq: the dead-pane Resume — root sessions only (a child session belongs to its parent's lifecycle)
  $('#pastNote').style.display = s.live ? 'none' : 'block';
  for (const it of s.items) applyItem(it, false);
  if (s.truncated) txt(el('item notice'), 'older messages truncated');
  applyDetailMode();
  feed.scrollTop = feed.scrollHeight; pillHide(); // fresh render lands at the bottom; a stale pill from the previous pane dies
  if (s.live && s.busy) busyReset(0, s.busySince); // busy pane: anchor the timer before setStatus paints it
  setStatus(!!(s.live && s.busy)); // F2: a not-live or idle pane clears the busy header — the timer never ticks over a dead pane
  if (s.live) attachEvents(id);
  if (s.live) input.focus(); // the composer is ready the moment the pane is
}
function attachEvents(id) {
  es = new EventSource('/events?session=' + encodeURIComponent(id) + q);
  es.addEventListener('snapshot', (e) => {
    const d = JSON.parse(e.data);
    if (!Array.isArray(d.items)) return; // 21-analysis: a malformed snapshot never wipes the feed — the last good render stays
    if (!live) { if (sid === id) showSession(id); return; } // 7aq: this stream was the not_live-retrying one a resume armed — the snapshot means the beacon registered: reload the pane live (a stale stream never steals the selection)
    feed.innerHTML = ''; for (const k in toolStatus) delete toolStatus[k]; endLive();
    pendingEchoes.length = 0; // the feed re-renders from server truth
    for (const it of d.items) applyItem(it, false);
    if (d.busy) busyReset(0, d.busySince);
    setStatus(!!d.busy);
    knownQueue = d.queue || []; pendingQueue = []; showQueue(knownQueue); // refresh mid-queue: strip seeded from snapshot truth
    feed.scrollTop = feed.scrollHeight; pillHide(); // full re-render: land at the bottom, kill any pill the wipe just made stale
  });
  es.addEventListener('item', (e) => { const it = JSON.parse(e.data);
    if (it && it.kind === 'assistant' && it.tokens) { usageKnown = (usageKnown ?? 0) + it.tokens; renderSubTok(); } // 7ar: a completed message folds its real provider usage into the header base the moment it lands
    applyItem(it, !!(it && it.placeholder), true); }); // F3: only the beacon's streaming placeholder renders live; final items render complete; the SSE path flag feeds the typewriter gate
  es.addEventListener('live', (e) => { const d = JSON.parse(e.data);
    const h0 = feed.scrollHeight, wasPinned = feedGap() < PIN; // 7ao: pre-measured — a growing body must not yank an unpinned reader
    if (liveNode) {
      if (d.thinking) { // 7aj: the thinking stream renders LIVE — the grey details treatment, detail-mode aware (open only in Expanded), created once then updated in place
        if (!liveNode.think) {
          const t = document.createElement('details'); t.className = 'thinking'; t.open = detailMode === 2;
          const s = document.createElement('summary'); txt(s, 'thinking'); t.appendChild(s);
          const td = document.createElement('div'); t.appendChild(td);
          liveNode.node.insertBefore(t, liveNode.body); // the final item renders the same shape — the post-turn replace reflows nothing
          liveNode.think = td;
        }
        txt(liveNode.think, d.thinking);
      }
      liveNode.body.textContent = ''; // 7(z): the cursor rides INLINE at the end of the streaming text
      if (liveNode.time) liveNode.body.appendChild(liveNode.time); // 7(r) tweak: the ts float stays on top through deltas
      liveNode.body.appendChild(mdRender(d.text));
      if (liveNode.cursor) liveNode.body.appendChild(liveNode.cursor); // same element, moved — never re-created
    }
    if (d.text) liveTextSeen = 1; // 7ap typewriter gate: this message's live stream DID carry text
    busyUpdate(d);
    if (feed.scrollHeight > h0) { if (wasPinned) feed.scrollTop = feed.scrollHeight; else pillShow(); } // 7ao: pinned-only follow
  });
  es.addEventListener('tool', (e) => { const t = JSON.parse(e.data);
    const h0 = feed.scrollHeight, wasPinned = feedGap() < PIN; // 7ao: pre-measured
    const c = toolCard(t.id, t.toolName, t.status, t.args);
    if (t.partial) { // 7ap: live partial tool output — chunks land in the card's own element while it runs
      if (!c.part) { c.part = document.createElement('div'); c.part.className = 'tpart'; c.root.appendChild(c.part); }
      txt(c.part, t.text || ''); // the beacon forwards CUMULATIVE partial text — replace, never append
    } else if (t.text) {
      if (c.part) { c.part.remove(); c.part = null; } // the final replaces the partial
      txt(c.out, t.text);
    }
    busyUpdate({ tool: true });
    if (feed.scrollHeight > h0) { if (wasPinned) feed.scrollTop = feed.scrollHeight; else pillShow(); } // 7ao: pinned-only follow
  });
  es.addEventListener('busy', (e) => { const d = JSON.parse(e.data); if (d.busy) busyReset(d.promptChars, d.startedAt); setStatus(d.busy); });
  es.addEventListener('queue', (e) => { // the queue SSE event is the full truth — reconcile the optimism
    const d = JSON.parse(e.data);
    if (Array.isArray(d.dropped) && d.dropped.length) { queueDropped(d.dropped); return; }
    knownQueue = d.items || []; pendingQueue = []; showQueue(knownQueue);
  });
  es.onopen = () => dot.classList.add('on');
  es.onerror = () => dot.classList.remove('on');
}
async function post(p, body) { // inline errors only — blocking dialogs are extinct here
  try {
    const r = await fetch(p, { method: 'POST', headers: { 'content-type': 'application/json', 'x-prime-token': token },
      body: JSON.stringify(body ?? {}) });
    if (!r.ok) return { ok: false, err: (await r.text()).slice(0, 160) };
    return { ok: true, err: '' };
  } catch (e) { return { ok: false, err: 'network unreachable' }; }
}
let sendErrEl = null; // inline send-error notice above the composer, created lazily
function sendError(msg) {
  if (!sendErrEl) { sendErrEl = document.createElement('div'); sendErrEl.id = 'sendErr';
    $('footer').parentNode.insertBefore(sendErrEl, $('footer')); }
  txt(sendErrEl, msg); sendErrEl.style.display = 'block';
}
function hideSendErr() { if (sendErrEl) sendErrEl.style.display = 'none'; }
function showQueue(items) {
  const box = $('#queue');
  if (!box) return;
  box.innerHTML = '';
  box.style.display = items.length ? 'block' : 'none';
  for (const q of items) {
    const d = el('queued', box);
    const label = document.createElement('span'); label.className = 'caps'; txt(label, 'queued');
    d.appendChild(label);
    const s = document.createElement('span'); txt(s, ' ' + q); d.appendChild(s);
  }
}
function renderQueueStrip() { showQueue([...knownQueue, ...pendingQueue]); } // optimistic entry stacks on the truth
function queueDropped(dropped) { // abort dropped steers: clear the strip, say it, keep the texts copyable
  knownQueue = []; pendingQueue = [];
  for (let i = pendingEchoes.length - 1; i >= 0; i--) if (dropped.includes(pendingEchoes[i].text)) {
    pendingEchoes[i].node.classList.remove('pending'); // they were sent
    pendingEchoes.splice(i, 1); // F7: purge — a re-send of the same text reconciles the NEW echo, never this dropped one
  }
  const box = $('#queue'); if (!box) return;
  box.innerHTML = '';
  box.style.display = 'block';
  txt(el('qdrop caps', box), 'message dropped \u2014 turn ended');
  for (const t of dropped) txt(el('queued dropped', box), t);
}
function send() {
  const t = input.value.trim(); if (!t) return;
  closePop(); // pickers close on send — the text goes out as-is
  hideSendErr();
  input.value = ''; input.style.height = ''; // auto-grow resets to 1 line on send
  busyReset(t.length); setWorking(true);
  const h0 = feed.scrollHeight, wasPinned = feedGap() < PIN; // 7ao: pre-measured before the echo
  if (busyNow) { pendingQueue.push(t); renderQueueStrip(); } // 7(y): a queued steer shows in the strip ONLY — the feed block waits for delivery (no double render)
  else { // optimistic echo: the message is in the feed NOW; the real item event
    // reconciles it (FIFO dedupe by exact text) — idle sends only
    const node = el('item user pending md-body'); youLabel(node); node.appendChild(mdRender(t)); // 7ak/7al: the echo mirrors the real user item's render shape
    pendingEchoes.push({ text: t, node });
  }
  if (feed.scrollHeight > h0) { if (wasPinned) feed.scrollTop = feed.scrollHeight; else pillShow(); } // 7(g)+7ao: the echo lands in view when pinned; unpinned, the pill says so — never a yank
  post('/send', { text: t, session: sid }).then((r) => {
    if (r.ok) return;
    // failure: keep the text, roll back the optimism, say it inline
    input.value = t; growInput(); input.focus();
    const i = pendingEchoes.findIndex((e) => e.text === t); // 7(y): busy sends carry no echo — the text lookup covers both paths
    if (i >= 0) { pendingEchoes[i].node.remove(); pendingEchoes.splice(i, 1); }
    if (busyNow) { pendingQueue = pendingQueue.filter((x) => x !== t); renderQueueStrip(); }
    if (!busyNow) setStatus(false); // the optimistic busy was ours \u2014 no turn is running
    sendError('not sent \u2014 ' + (r.err || 'request failed'));
  });
}
$('#send').onclick = send;
input.addEventListener('keydown', (e) => { if (popKey(e)) return; if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } });
// auto-grow: ~4 lines before the textarea scrolls internally
const INPUT_MAX = 100; // 4 lines at 13px/1.55 + padding \u2014 matches #input max-height in the css
function growInput() { input.style.height = 'auto'; input.style.height = Math.min(input.scrollHeight, INPUT_MAX) + 'px'; }
input.addEventListener('input', growInput);

// --- input pickers: "/" slash-command palette + "@" file references ---
// Both insert RAW TEXT: session/extension commands execute only when sent
// while IDLE (a busy send queues as a steer and never executes — the palette
// disables them); @refs stay literal — the model reads the file with tools.
const SLASH_SESSION = { // runtime-parsed built-ins, sendable as raw text when idle
  compact: 'compact context [instructions]',
  refine: 'refine memories/notes',
  goal: 'set or inspect the goal [objective]',
  autonomous: 'autonomous loop [status|off|on]',
};
const SLASH_LOCAL = { // TUI client-local commands: UI hints ONLY — never sent as text
  settings: 'TUI settings panel', model: 'model picker', effort: 'thinking level',
  fast: 'fast mode', 'scoped-models': 'scoped models', export: 'export conversation',
  import: 'import conversation', share: 'share conversation', copy: 'copy conversation',
  btw: 'side conversation', name: 'rename session \u2014 unavailable in webui',
  session: 'session info', 'system-prompt': 'edit system prompt', logs: 'open logs',
  traces: 'open traces', context: 'context usage', changelog: 'changelog',
  update: 'update agent', nightly: 'nightly channel', hotkeys: 'shortcut help',
  fork: 'fork session', clone: 'clone session', tree: 'session tree',
  login: 'provider login', logout: 'provider logout', mcp: 'MCP servers',
  new: 'new conversation', resume: 'resume session', reload: 'reload config',
  fullscreen: 'fullscreen', quit: 'quit',
};
const SLASH_ALIASES = { clear: 'new', usage: 'context', thinking: 'effort', rename: 'name', side: 'btw' };
let pop = null; // live popover: {kind:'cmds'|'files', el, sel, vis, rows, filter, tok, start, note, fetching}
let filesSeq = 0; // stale-reply guard: a newer @-token wins the race
const cmdSendable = (r) => r && r.kind !== 'local' && !(r.kind === 'send' && busyNow); // 'new' stays active while busy
async function apiQ(p) { // api() variant: p may already carry a query string
  let r; // survives the fetch so the catch can still name the status
  try { r = await fetch(p, { headers: { 'x-prime-token': token } });
    if (!r.ok) return { __nonJson: true, status: r.status }; // non-200 — surface the status, never swallow it
    return await r.json(); }
  catch (e) { return r ? { __nonJson: true, status: r.status } : null; } // bad body, or the fetch itself died
}
function paletteRows(live) { // beacon /commands merged with the static TUI tables
  const rows = [], seen = new Set();
  for (const [name, d] of Object.entries(SLASH_SESSION)) { seen.add(name); rows.push({ name, d, kind: 'send', src: 'session' }); }
  for (const c of live || []) {
    const name = String(c?.name ?? '').replace(/^\//, '');
    if (!name || seen.has(name)) continue;
    seen.add(name);
    const m = name.match(/^(?:skill|template):(.+)$/); // 7(v): live skill:/template: entries match + display their SHORT name; the insert keeps the runtime form
    rows.push({ name, short: m ? m[1] : '', d: String(c?.description ?? ''), kind: 'send', src: String(c?.source || 'ext') });
  }
  for (const [name, d] of Object.entries(SLASH_LOCAL)) {
    if (seen.has(name)) continue;
    seen.add(name);
    rows.push({ name, d, kind: name === 'new' ? 'new' : 'local', src: 'tui' });
  }
  for (const [alias, target] of Object.entries(SLASH_ALIASES)) {
    if (seen.has(alias)) continue;
    seen.add(alias);
    const t = rows.find((r) => r.name === target);
    rows.push({ name: alias, d: 'alias of /' + target, kind: t?.kind === 'new' ? 'new' : 'local', src: 'tui' });
  }
  return rows;
}
function scoreFile(p, q) { // exact 100 / prefix 80 / contains 50 / path-contains 30, +10 dir
  const qp = q.toLowerCase();
  const base = (p.replace(/\/+$/, '').split('/').pop() || p).toLowerCase();
  let s = 0;
  if (base === qp) s = 100;
  else if (base.startsWith(qp)) s = 80;
  else if (base.includes(qp)) s = 50;
  else if (p.toLowerCase().includes(qp)) s = 30;
  if (p.endsWith('/')) s += 10;
  return s;
}
function closePop() { if (pop) { pop.el.remove(); pop = null; } }
function mkPop(kind) {
  closePop();
  const d = document.createElement('div');
  d.className = 'pop ' + kind;
  $('footer').appendChild(d);
  return { kind, el: d, sel: 0, vis: [], rows: [], filter: '', tok: '', start: 0, note: '', fetching: false, fail: false };
}
function fileToken() { // the @-token before the cursor: @word or @"quoted" (spaces allowed inside)
  const v = input.value, i = input.selectionStart;
  if (i == null || i === 0) return null;
  const b = v.slice(0, i);
  const qm = b.lastIndexOf('@"');
  if (qm >= 0 && (qm === 0 || /\s/.test(b[qm - 1]))) {
    const inner = b.slice(qm + 2);
    if (!inner.includes('"') && !inner.includes('\n')) return { start: qm, token: b.slice(qm) };
    return null; // closed quote — the reference is complete, not a live token
  }
  const m = b.match(/(?:^|\s)(@[^\s@]*)$/);
  return m ? { start: b.length - m[1].length, token: m[1] } : null;
}
async function openPalette() {
  pop = mkPop('cmds'); pop.fetching = true; renderPop();
  const d = await apiQ('/api/session/' + encodeURIComponent(sid) + '/commands');
  if (!pop || pop.kind !== 'cmds') return; // closed mid-flight
  pop.fetching = false;
  const live = d && Array.isArray(d.commands) ? d.commands : null;
  const dead = !live && d && d.__nonJson; // 404/non-200 — pre-picker beacon (old-era session)
  pop.fail = !!dead;
  pop.note = dead ? 'live commands unavailable \u2014 restart or /reload the agent'
    : (live ? '' : 'live commands unavailable');
  pop.rows = paletteRows(live);
  renderPop();
}
function openFiles(t) {
  pop = mkPop('files');
  refreshFiles(t.token, t.start);
}
async function refreshFiles(tok, start) {
  if (!pop || pop.kind !== 'files') return;
  pop.tok = tok; pop.start = start;
  const q = tok.startsWith('@"') ? tok.slice(2) : tok.slice(1);
  if (q.startsWith('/') || q.startsWith('~')) {
    // fd feeds from the session cwd — absolute/~/ tokens complete only as the
    // typed literal (spec: ~/ and absolute paths supported)
    pop.note = ''; pop.fail = false; // a stale failure hint must not ride along
    pop.rows = [{ path: q, isDir: false }];
    renderPop(); return;
  }
  const my = ++filesSeq;
  const d = await apiQ('/api/session/' + encodeURIComponent(sid) + '/files?q=' + encodeURIComponent(q));
  if (!pop || pop.kind !== 'files' || my !== filesSeq) return; // stale reply — a newer token won
  if (!d) { pop.note = 'file search unavailable'; pop.fail = false; }
  else if (d.__nonJson) { // 404/non-200 — old-era beacon: these routes exist only on new beacons
    pop.note = 'file search unavailable in this session \u2014 restart or /reload the agent to enable it';
    pop.fail = true;
  }
  else if (d.fdMissing) { pop.note = 'fd not installed on the agent host'; pop.fail = false; }
  else { pop.note = ''; pop.fail = false; }
  const files = d && Array.isArray(d.files) ? d.files.filter((x) => typeof x === 'string' && x) : [];
  pop.rows = files.map((p) => ({ path: p, s: scoreFile(p, q) }))
    .sort((a, b) => b.s - a.s).slice(0, 20) // top 20; stable sort keeps fd order on ties
    .map((x) => ({ path: x.path, isDir: x.path.endsWith('/') }));
  renderPop();
}
function renderPop() {
  if (!pop) return;
  const box = pop.el; box.innerHTML = '';
  let rows = [];
  if (pop.kind === 'cmds') {
    const f = (pop.filter || '').toLowerCase();
    rows = pop.rows.filter((r) => r.name.toLowerCase().startsWith(f)
      || (r.short || '').toLowerCase().startsWith(f)); // 7(v): the short name matches too — /autoresearch finds skill:autoresearch
  } else rows = pop.rows;
  pop.vis = rows;
  if (pop.sel >= rows.length) pop.sel = Math.max(0, rows.length - 1);
  if (rows.length && pop.kind === 'cmds' && !cmdSendable(rows[pop.sel])) {
    const n = rows.findIndex(cmdSendable);
    pop.sel = n >= 0 ? n : 0; // never rest the selection on a row that cannot be accepted
  }
  if (pop.note) txt(el('pop-hint' + (pop.fail ? ' err' : ''), box), pop.note);
  if (pop.kind === 'cmds' && busyNow) txt(el('pop-hint', box), 'busy \u2014 commands run only when idle');
  if (pop.kind === 'files' && pop.fail) return; // failed fetch paints the cause hint ONLY — "no matches" would read as empty-results
  if (!rows.length) { txt(el('pop-none', box), pop.kind === 'cmds'
      ? (pop.fetching ? 'loading commands\u2026' : 'no matching commands')
      : (pop.fetching ? 'searching\u2026' : 'no matches')); return; }
  rows.forEach((r, i) => {
    const dis = pop.kind === 'cmds' && !cmdSendable(r);
    const row = el('pop-row' + (dis ? ' dis' : '') + (i === pop.sel ? ' sel' : ''), box);
    if (pop.kind === 'cmds') {
      txt(el('pn', row), '/' + (r.short || r.name)); // 7(v): the usable short name; the src hint names the origin
      txt(el('pd', row), r.d || '');
      if (r.src) txt(el('ps', row), r.src);
    } else txt(el('pn', row), r.path);
    row.addEventListener('mousedown', (e) => e.preventDefault()); // keep composer focus — greyed rows stay inert
    if (!dis) row.addEventListener('click', () => { pop.sel = i; popAccept(); });
  });
  const s = box.querySelector('.pop-row.sel');
  if (s) s.scrollIntoView({ block: 'nearest' });
}
function popAccept() {
  if (!pop) return;
  const r = pop.vis[pop.sel];
  if (!r) return;
  if (pop.kind === 'cmds') {
    if (r.kind === 'new') { input.value = ''; closePop(); showNewForm(); return; } // the + flow
    if (!cmdSendable(r)) return; // greyed TUI-local hints — never inserted as text
    const ins = '/' + r.name + ' '; // raw text; the operator reviews, Enter sends
    const cur = input.selectionStart ?? input.value.length;
    const start = cmdTokenStart(cur); // 7(u): the token's own range, re-derived at accept
    if (start > 0 || cur < input.value.length)
      input.value = input.value.slice(0, start) + ins + input.value.slice(cur); // 7(u): splice ONLY the token — the draft before/after survives
    else input.value = '/' + r.name + ' '; // the token IS the whole draft — a plain write
    const at = start + ins.length;
    closePop(); growInput(); input.focus();
    input.selectionStart = input.selectionEnd = at;
    return;
  }
  // files: replace the typed @-token with the RAW path — nobody expands it
  let p = r.path;
  if (r.isDir && !p.endsWith('/')) p += '/'; // directories insert with trailing "/" + space
  const body = p.includes(' ') ? '@"' + p + '"' : p; // quoted form for spaces
  const ins = body.startsWith('@') ? body : '@' + body; // 18-probe: a quoted token already carries its @ — never double it
  const cur = input.selectionStart ?? input.value.length;
  input.value = input.value.slice(0, pop.start) + ins + ' ' + input.value.slice(cur);
  const at = pop.start + ins.length + 1;
  closePop(); growInput(); input.focus();
  input.selectionStart = input.selectionEnd = at;
}
function popKey(e) { // picker keys only while a popover is open — ordinary typing is never intercepted
  if (!pop) return false;
  if (e.key === 'Escape') { e.preventDefault(); closePop(); return true; }
  if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
    e.preventDefault();
    const rows = pop.vis;
    if (!rows.length) return true;
    const step = e.key === 'ArrowUp' ? -1 : 1;
    let i = pop.sel;
    for (let n = 0; n < rows.length; n++) {
      i = (i + step + rows.length) % rows.length;
      if (pop.kind === 'files' || cmdSendable(rows[i])) break;
    }
    pop.sel = i; renderPop(); return true;
  }
  if (e.key === 'Tab' || e.key === 'Enter') {
    if (!pop.vis.length) return false; // nothing to accept — Enter falls through to send
    e.preventDefault(); popAccept(); return true;
  }
  return false;
}
function cmdTokenStart(cur) { // 7(u): the live slash token's START offset — popAccept splices exactly this range
  const b = input.value.slice(0, cur);
  const m = b.match(/(?:^|\s)\/(\S*)$/); // the same token slashToken() matched — the cursor never moves while the palette is open
  return m && !m[1].includes('/') ? b.length - m[1].length - 1 : cur; // no live token: insert at the cursor, destroy nothing
}
function slashToken() { // TUI 0.9.5 rL name-mode parity: a standalone /word before the cursor, ANY line (12-atpicker-debug.md)
  const b = input.value.slice(0, input.selectionStart ?? input.value.length);
  const m = b.match(/(?:^|\s)\/(\S*)$/); // word-boundary start, token runs to the cursor
  return m && !m[1].includes('/') ? m[1] : null; // a second "/" = path, not a command (rL: slice(1).includes("/"))
}
function pickerInput() {
  if (pop && pop.kind === 'cmds') {
    const sf = slashToken(); // filter follows the typed token — cursor-scoped like rL, not whole-value
    if (sf !== null) { pop.filter = sf; renderPop(); return; }
    closePop();
  } else if (pop && pop.kind === 'files') {
    const t = fileToken();
    if (t) { if (t.token !== pop.tok) refreshFiles(t.token, t.start); return; }
    closePop();
  }
  if (pop) return;
  const sf = slashToken(); // any standalone /word before the cursor opens the palette — zero debounce
  if (sf !== null) { openPalette(); pop.filter = sf; renderPop(); return; }
  const t = fileToken(); if (t) openFiles(t); // @-token before the cursor — zero debounce
}
input.addEventListener('input', pickerInput);
input.addEventListener('blur', () => closePop());
stopBtn.onclick = async () => { const r = await post('/abort', { session: sid }); if (!r.ok) sendError('abort failed \u2014 ' + (r.err || 'request failed')); };
// new conversation: collector spawns an rpc agent; its beacon registers it
// live (~1-3s), then we select it in the pane. ponytail: we take the
// first NEW live row — an unrelated agent registering in the same window
// would be mistaken for ours; upgrade path is a spawn->sessionId handshake
// in the beacon protocol. The "+" click opens a small cwd form first; the
// POST body carries {cwd} only when the input is non-empty (empty = home).
const newBtn = $('#new'), newForm = $('#newForm'), newCwd = $('#newCwd');
function showNewForm() { newCwd.value = paneMeta?.cwd || ''; newForm.classList.remove('hidden'); newCwd.focus(); } // 7am: prefill the ACTIVE session's cwd — the operator edits, not retypes; no session selected -> empty, never a stale carryover
function hideNewForm() { newForm.classList.add('hidden'); newCwd.value = ''; }
newBtn.onclick = () => { if (newBtn.disabled) return; showNewForm(); };
$('#newCancel').onclick = hideNewForm;
$('#newCreate').onclick = createConversation;
newCwd.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); createConversation(); }
  else if (e.key === 'Escape') { e.preventDefault(); hideNewForm(); }
});
const newNote = $('#newNote');
function newNotice(msg) { txt(newNote, msg || ''); newNote.classList.toggle('hidden', !msg); } // RC3: non-blocking inline notice
async function createConversation() {
  if (newBtn.disabled) return;
  newBtn.disabled = true;
  newForm.classList.add('hidden'); // keep the typed value for a retry
  const selAtClick = selToken; // RC3: select the new row ONLY if no newer selection happened since the click — never yank
  newNotice('');
  try {
    const cwd = newCwd.value.trim();
    const before = new Set(((await api('/api/sessions')) || { sessions: [] }).sessions.map((s) => s.id));
    const r = await fetch('/api/new', { method: 'POST',
      headers: { 'content-type': 'application/json', 'x-prime-token': token },
      body: JSON.stringify(cwd ? { cwd } : {}) });
    if (!r.ok) { newNotice(await r.text()); newForm.classList.remove('hidden'); newCwd.focus(); return; }
    const deadline = Date.now() + 40000;
    for (;;) {
      const data = await api('/api/sessions');
      const rows = (data ? data.sessions : []).filter((s) => s.live && !before.has(s.id));
      if (rows.length) { hideNewForm(); if (selToken === selAtClick) showSession(rows[0].id); return; }
      if (Date.now() > deadline) { newNotice('new conversation did not register'); return; }
      await new Promise((r2) => setTimeout(r2, 1000));
    }
  } finally { newBtn.disabled = false; }
}
const DETAIL_MODES = ['Collapsed', 'Details', 'Expanded'];
let detailMode = 0;
function applyDetailMode() {
  const b = $('#detailMode'); if (b) txt(b, DETAIL_MODES[detailMode] + ' mode');
  document.querySelectorAll('#feed details').forEach((d) => {
    d.open = detailMode === 2 || (detailMode === 1 && d.classList.contains('toolcard'));
  });
}
$('#detailMode').onclick = () => { detailMode = (detailMode + 1) % DETAIL_MODES.length; applyDetailMode(); };
// --- sidebar chrome: drag-resizable border + collapse toggle, persisted in localStorage ---
const SASH_MIN = 260, SIDEBAR_DEF = 380; // clamp band: min 260px, max 50% viewport
const sidebar = $('#sidebar'), sash = $('#sash'), sToggle = $('#sToggle'), sExpand = $('#sExpand');
const clampW = (w) => Math.max(SASH_MIN, Math.min(Math.floor(w), Math.floor(window.innerWidth / 2)));
function applySidebarWidth(w) { sidebar.style.width = clampW(w) + 'px'; }
function setCollapsed(on) { document.body.classList.toggle('s-collapsed', on); lsSet('webuiSidebarCollapsed', on ? '1' : '0'); }
sToggle.onclick = () => setCollapsed(true); // collapse to a zero-width rail
sExpand.onclick = () => setCollapsed(false);
let sashDrag = null; // {x, w} while the border drag is live
sash.addEventListener('pointerdown', (e) => {
  if (document.body.classList.contains('s-collapsed')) return;
  sashDrag = { x: e.clientX, w: sidebar.getBoundingClientRect().width };
  sash.setPointerCapture(e.pointerId); e.preventDefault();
});
sash.addEventListener('pointermove', (e) => { if (sashDrag) applySidebarWidth(sashDrag.w + (e.clientX - sashDrag.x)); });
const endSash = () => { if (!sashDrag) return; sashDrag = null; lsSet('webuiSidebarWidth', sidebar.getBoundingClientRect().width); }; // drag end: persist
sash.addEventListener('pointerup', endSash);
sash.addEventListener('pointercancel', () => { sashDrag = null; });
sash.addEventListener('dblclick', () => { sashDrag = null; applySidebarWidth(SIDEBAR_DEF); lsSet('webuiSidebarWidth', SIDEBAR_DEF); }); // double-click resets to default
window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && sashDrag) { // Escape mid-drag resets too
  sashDrag = null; applySidebarWidth(SIDEBAR_DEF); lsSet('webuiSidebarWidth', SIDEBAR_DEF); } });
window.addEventListener('resize', () => { if (!sashDrag && !document.body.classList.contains('s-collapsed')) applySidebarWidth(sidebar.getBoundingClientRect().width); }); // 50% cap holds when the viewport shrinks
const savedW = parseInt(lsGet('webuiSidebarWidth') || '', 10);
if (savedW) applySidebarWidth(savedW); // persisted width survives refresh
if (lsGet('webuiSidebarCollapsed') === '1') setCollapsed(true); // so does the collapse state

// --- session menu (27-settings parity, sparse by directive): the beacon's 7
// session endpoints ONLY — model, thinking, rename, context usage, compact,
// shutdown + the info line. NO harness-config surfaces (MCP servers, skills,
// memories, subagents): the harness configures itself (operator directive).
// The collector proxies /api/s/<id>/<endpoint> (settings need the session
// LIVE — the button hides on past panes). Mouse-first, no keybinds; Escape +
// outside-click close; one menu at a time. Busy behavior follows the beacon
// contracts: model/thinking/rename are accepted anytime (the echo confirms
// inline, the header updates without a reload); compact surfaces its 409 as
// "busy — try when idle"; compact + shutdown carry inline confirm rows.
let menu = null; // live menu: {el, mode, models, usage, note, err, confirm}
let paneMeta = null; // the loaded session's API row — the header bits and the menu read it
const menuBtn = $('#menuBtn'), resumeBtn = $('#resumeBtn'), shead = document.querySelector('.session-head');
function closeMenu() { if (menu) { menu.el.remove(); menu = null; } }
async function sreq(ep, body) { // proxy tier: status + json — the 400/404/409 contracts drive the UI
  try {
    const r = await fetch('/api/s/' + encodeURIComponent(sid) + '/' + ep, {
      method: body === undefined ? 'GET' : 'POST',
      headers: { ...(body === undefined ? {} : { 'content-type': 'application/json' }), 'x-prime-token': token },
      body: body === undefined ? undefined : JSON.stringify(body) });
    let j = null; const text = await r.text();
    try { j = JSON.parse(text); } catch (e) {}
    return { status: r.status, json: j };
  } catch (e) { return { status: 0, json: null }; }
}
function subBits(s) { // the header's sub line, built from the row metadata (showSession + the menu share ONE dialect)
  const bits = [s.cwd || '', s.date ? s.date.slice(0, 10) : ''].filter(Boolean);
  if (s.model) bits.push(s.model + (s.thinkingLevel ? ':' + s.thinkingLevel : ''));
  const ctx = contextBits(s); if (ctx) bits.push(ctx);
  const est = liveTok(); // 7ar: during a live turn the tok bit ticks with the same chars/4 estimate the burst-rate uses; it settles to the real provider number at turn end
  const tok = est ?? usageKnown ?? s.totalTokens;
  if (tok) bits.push(tok.toLocaleString() + ' tok');
  if (s.totalCost != null && s.totalCost > 0) bits.push('$' + s.totalCost.toFixed(4));
  return bits.join(' · ');
}
function renderPaneMeta() { // post-action refresh: rename/model/thinking echoes land in the header without a reload
  if (!paneMeta) return;
  if (paneMeta.name) txt($('#sTitle'), paneMeta.name);
  txt($('#sSub'), subBits(paneMeta));
}
function menuNote(box) { if (menu.note) txt(el('pop-hint' + (menu.err ? ' err' : ''), box), menu.note); }
function menuRow(box, label, note, fn) {
  const r = el('pop-row', box);
  txt(el('pn', r), label);
  if (note) txt(el('pd', r), note);
  r.addEventListener('click', fn);
  return r;
}
async function menuModels() { // fetched once per menu session; the model + thinking pickers share the response
  if (menu.models) return;
  const r = await sreq('models');
  if (!menu) return; // closed mid-flight
  if (r.status === 200 && Array.isArray(r.json?.models)) menu.models = r.json;
  else { menu.note = r.json?.error === 'not live' ? 'session not live' : 'models unavailable'; menu.err = true; }
  renderMenu();
}
async function menuPickModel(mo) {
  const r = await sreq('set-model', { id: mo.id });
  if (!menu) return;
  if (r.status === 200 && r.json?.ok) {
    paneMeta.model = mo.id; // the register beat re-syncs the sidebar row; the header updates now
    if (r.json.thinkingLevel) paneMeta.thinkingLevel = r.json.thinkingLevel; // the new model re-clamps thinking
    closeMenu(); renderPaneMeta(); return;
  }
  menu.note = r.json?.error === 'not live' ? 'session not live'
    : r.status === 403 ? 'no configured auth — ' + mo.id
    : r.status === 404 ? 'model not found — ' + mo.id
    : 'set-model failed';
  menu.err = true; renderMenu();
}
async function menuPickLevel(lv) {
  const r = await sreq('set-thinking-level', { level: lv });
  if (!menu) return;
  if (r.status === 200 && r.json?.ok) {
    paneMeta.thinkingLevel = lv;
    closeMenu(); renderPaneMeta(); return;
  }
  menu.note = r.status === 400 && Array.isArray(r.json?.available) // the endpoint's 400 contract: unsupported + available
    ? 'unsupported — available: ' + r.json.available.join(', ')
    : r.json?.error === 'not live' ? 'session not live'
    : 'set-thinking failed';
  menu.err = true; renderMenu();
}
async function menuCompact() {
  const r = await sreq('compact', {});
  if (!menu) return;
  if (r.status === 200 && r.json?.ok) { closeMenu(); return; } // the compaction entry lands in the feed via SSE
  menu.confirm = null;
  menu.note = r.status === 409 ? 'busy — try when idle' // the endpoint's own idle-guard, surfaced
    : r.json?.error === 'not live' ? 'session not live'
    : 'compact failed';
  menu.err = r.status !== 409; // 409-busy is a state hint, not a failure
  renderMenu();
}
async function menuShutdown() {
  const r = await sreq('shutdown', {});
  if (!menu) return;
  if (r.status === 200 && r.json?.ok) { closeMenu(); return; } // the beacon unregisters; the row goes dark on the next beat
  menu.confirm = null;
  menu.note = r.json?.error === 'not live' ? 'session not live' : 'shutdown failed';
  menu.err = true; renderMenu();
}
function renderMenu() {
  if (!menu) return;
  const box = menu.el; box.innerHTML = '';
  const m = paneMeta || {};
  const back = () => { menu.mode = 'root'; menu.note = ''; menu.err = false; renderMenu(); };
  if (menu.mode !== 'root') {
    const b = el('pop-row mback', box);
    txt(el('pn', b), '← back');
    b.addEventListener('click', back);
  }
  menuNote(box);
  if (menu.mode === 'root') {
    txt(el('minfo', box), [sid, m.cwd, m.model ? m.model + (m.thinkingLevel ? ':' + m.thinkingLevel : '') : '']
      .filter(Boolean).join(' · '));
    menuRow(box, 'Model', m.model ? String(m.model) : 'pick', () => { menu.mode = 'model'; renderMenu(); menuModels(); });
    menuRow(box, 'Thinking', m.thinkingLevel ? String(m.thinkingLevel) : 'pick', () => { menu.mode = 'thinking'; renderMenu(); menuModels(); });
    menuRow(box, 'Rename', m.name ? 'current: ' + String(m.name).slice(0, 24) : '', () => { menu.mode = 'rename'; renderMenu(); });
    menuRow(box, 'Context usage', 'live', () => {
      menu.mode = 'usage';
      sreq('context-usage').then((r) => { if (!menu) return;
        if (r.status === 200) menu.usage = r.json;
        else { menu.note = r.json?.error === 'not live' ? 'session not live' : 'usage unavailable'; menu.err = true; }
        renderMenu(); });
      renderMenu();
    });
    menuRow(box, 'Compact', 'confirm', () => { menu.confirm = 'compact'; renderMenu(); });
    menuRow(box, 'Shutdown', 'confirm', () => { menu.confirm = 'shutdown'; renderMenu(); });
    if (menu.confirm) {
      const cf = el('mconfirm', box);
      txt(el('mwarn', cf), menu.confirm === 'compact'
        ? 'Compact — interrupts the session\u2019s context.'
        : 'Shutdown — kills the agent worker.');
      const go = document.createElement('button'), no = document.createElement('button');
      txt(go, menu.confirm === 'compact' ? 'Compact' : 'Shutdown');
      txt(no, 'Cancel');
      no.addEventListener('click', () => { menu.confirm = null; renderMenu(); });
      go.addEventListener('click', menu.confirm === 'compact' ? menuCompact : menuShutdown);
      cf.appendChild(go); cf.appendChild(no);
    }
  } else if (menu.mode === 'model') {
    if (!menu.models) { txt(el('pop-none', box), 'loading models…'); return; }
    const cur = menu.models.current?.id;
    for (const mo of menu.models.models) {
      const row = el('pop-row' + (mo.id === cur ? ' sel' : ''), box);
      txt(el('pn', row), mo.id);
      if (mo.provider) txt(el('pd', row), mo.provider);
      row.addEventListener('click', () => menuPickModel(mo));
    }
  } else if (menu.mode === 'thinking') {
    if (!menu.models) { txt(el('pop-none', box), 'loading models…'); return; }
    const cur = menu.models.models?.find((x) => x.id === (menu.models.current?.id ?? paneMeta?.model));
    const levels = cur?.thinkingLevels ?? [];
    if (!levels.length) { txt(el('pop-none', box), 'no thinking levels for ' + (cur?.id ?? 'this model')); return; }
    for (const lv of levels) {
      const row = el('pop-row' + (lv === menu.models.thinkingLevel ? ' sel' : ''), box);
      txt(el('pn', row), lv);
      row.addEventListener('click', () => menuPickLevel(lv));
    }
  } else if (menu.mode === 'rename') {
    const f = el('mform', box);
    const inp = document.createElement('input');
    inp.value = m.name || ''; inp.placeholder = 'session name';
    const go = document.createElement('button'); txt(go, 'Rename');
    go.addEventListener('click', async () => {
      const name = inp.value.trim(); if (!name) return;
      const r = await sreq('rename', { name });
      if (!menu) return;
      if (r.status === 200 && r.json?.ok) { paneMeta.name = name; closeMenu(); renderPaneMeta(); return; }
      menu.note = r.json?.error === 'not live' ? 'session not live'
        : r.status === 400 ? 'name required' : 'rename failed';
      menu.err = true; renderMenu();
    });
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); go.click(); } });
    f.appendChild(inp); f.appendChild(go);
  } else if (menu.mode === 'usage') {
    if (!menu.usage) { txt(el('pop-none', box), 'reading…'); return; }
    const u = menu.usage;
    if (u.percent == null) { txt(el('pop-none', box), 'no metered turn yet'); return; }
    const p = Math.max(0, Math.min(100, u.percent));
    const bar = el('ubar', box); el('ufill', bar).style.width = Math.round(p) + '%'; // grey track, lime fill — the live usage bar
    txt(el('utext', box), Math.round(p) + '% · ' + fmtTok(u.tokens ?? 0) + ' of ' + fmtTok(u.contextWindow ?? 0) + ' tok');
  }
}
function openMenuAt(mode) { // the hamburger's opener, parameterized — the context menu's Rename reuses the SAME flow
  if (!sid || !live) return; // settings need the session running (the proxy 404s a dead row)
  menu = { el: document.createElement('div'), mode: mode || 'root', models: null, usage: null, note: '', err: false, confirm: null };
  menu.el.className = 'menu';
  shead.appendChild(menu.el);
  renderMenu();
}
menuBtn.onclick = () => { // mouse-first: no keybind opens it; Escape + outside-click close
  if (menu) { closeMenu(); return; } // toggle
  openMenuAt('root');
};
resumeBtn.onclick = () => { if (sid && !live) resumeSession(sid, true); }; // 7aq: the dead-pane Resume — the pane's own session, root rows only (showSession gates the visibility)
document.addEventListener('mousedown', (e) => {
  if (menu && !menu.el.contains(e.target) && !menuBtn.contains(e.target)) closeMenu(); // outside-click
});
window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && menu) closeMenu(); }); // Escape closes (the sash-drag Escape listener is untouched)

// --- context menu (7ah v1): right-click actions — sidebar session rows,
// child rows, feed items. ONE singleton panel wearing the menu's own chrome
// (grey-2, hairline, square); lime on hover only. Native menu suppressed
// inside the app chrome (main/sidebar panes) EXCEPT input/textarea (native
// paste/spell survives); Escape + outside-click close. Session rows: Open /
// Rename (the hamburger's own flow — the row's pane loads first; the form
// posts to the pane's sid) / Copy ID / Shutdown (confirm row) / Archive
// (LOCKED — the archive state rides G4; visible-but-locked telegraphs the
// roadmap). Child rows: Copy ID / Delete (LOCKED — no collector delete route
// exists; the gap is reported upstream). Feed items: Copy text (the RAW
// source). Clipboard writes toast; headless boards degrade to a notice.
let cm = null;
let toastEl = null, toastT = null;
function toast(msg) { // 7ah: non-blocking confirm — instant, auto-hide, no animation
  if (!toastEl) { toastEl = document.createElement('div'); toastEl.className = 'toast'; document.body.appendChild(toastEl); }
  txt(toastEl, msg);
  if (toastT) clearTimeout(toastT);
  toastT = setTimeout(() => { toastEl.remove(); toastEl = null; toastT = null; }, 1600);
}
function closeCm() { if (cm) { cm.el.remove(); cm = null; } }
async function cmPost(id, ep, body) { // the proxy tier, ROW-scoped — sreq stays sid-scoped (its base is pinned)
  try {
    const r = await fetch('/api/s/' + encodeURIComponent(id) + '/' + ep, {
      method: 'POST', headers: { 'content-type': 'application/json', 'x-prime-token': token },
      body: JSON.stringify(body ?? {}) });
    let j = null; const text = await r.text();
    try { j = JSON.parse(text); } catch (e) {}
    return { status: r.status, json: j };
  } catch (e) { return { status: 0, json: null }; }
}
function cmCopy(text) {
  const p = navigator.clipboard?.writeText?.(text); // optional-chained: a headless board degrades to the notice, never throws
  if (p && p.then) p.then(() => toast('copied'), () => toast('copy failed'));
  else toast('copy unavailable');
  closeCm();
}
async function cmShutdown(id) {
  const r = await cmPost(id, 'shutdown', {});
  if (!cm) return; // closed mid-flight
  closeCm();
  if (r.status === 200 && r.json?.ok) toast('shutdown sent'); // the row goes dark on the next 15s beat
  else toast(r.json?.error === 'not live' ? 'session not live' : 'shutdown failed');
}
async function resumeSession(id, pane) { // 7aq: POST /api/resume — the collector re-spawns the session's rpc agent on its recorded cwd; the beacon re-registers the SAME id, the row badge flips on the next 15s sidebar refresh
  try {
    const r = await fetch('/api/resume', {
      method: 'POST', headers: { 'content-type': 'application/json', 'x-prime-token': token },
      body: JSON.stringify({ id }) });
    let jb = null; const text = await r.text();
    try { jb = JSON.parse(text); } catch (e) {}
    if (r.status === 200) {
      if (sid === id) { // the dead-pane button: optimistic hint + the not_live SSE re-attach — the pane flips live the moment the beacon registers
        txt(resumeBtn, 'resuming\u2026'); resumeBtn.disabled = true;
        attachEvents(id);
      } else toast('resuming — live within ~15s');
    } else if (r.status === 409 && jb?.error === 'already live') {
      if (sid === id) showSession(id); // stale pane truth: it IS live — reload the pane
      else toast('session already live');
    } else if (jb?.error) toast(jb.error === 'resume in progress' ? 'resume already under way' : jb.error);
    else toast('resume failed');
  } catch (e) { toast('resume failed'); }
}
async function cmRename(id) {
  if (id === sid && live) { closeCm(); openMenuAt('rename'); return; }
  await showSession(id); // the rename form posts to the pane's sid — the row's own pane loads first
  if (!cm) return; // closed mid-flight
  closeCm();
  if (sid === id && live) openMenuAt('rename');
  else toast('rename needs a live session');
}
function cmRow(box, label, note, fn, dis, tip) { // dis rows: greyed, no listener — visible-but-locked, never lights up
  const r = el('pop-row' + (dis ? ' dis' : ''), box);
  txt(el('pn', r), label);
  if (note) txt(el('pd', r), note);
  if (tip) r.title = tip;
  if (!dis) r.addEventListener('click', fn);
  return r;
}
function renderCm() {
  if (!cm) return;
  const box = cm.el; box.innerHTML = '';
  if (cm.kind === 'session') {
    const id = cm.id;
    cmRow(box, 'Open', '', () => { closeCm(); showSession(id); });
    cmRow(box, 'Rename', '', () => cmRename(id));
    cmRow(box, 'Copy ID', '', () => cmCopy(id));
    if (!cm.live) cmRow(box, 'Resume', '', () => { closeCm(); resumeSession(id); }); // 7aq: inactive rows only — a live row IS the running agent
    cmRow(box, 'Shutdown', 'confirm', () => { cm.confirm = true; renderCm(); });
    cmRow(box, 'Archive', 'rides G4', null, true, 'rides G4');
    if (cm.confirm) { // the hamburger's confirm-row pattern, same treatment
      const cf = el('mconfirm', box);
      txt(el('mwarn', cf), 'Shutdown — kills the agent worker.');
      const go = document.createElement('button'), no = document.createElement('button');
      txt(go, 'Shutdown'); txt(no, 'Cancel');
      no.addEventListener('click', () => { cm.confirm = null; renderCm(); });
      go.addEventListener('click', () => cmShutdown(id));
      cf.appendChild(go); cf.appendChild(no);
    }
  } else if (cm.kind === 'child') {
    cmRow(box, 'Copy ID', '', () => cmCopy(cm.id));
    cmRow(box, 'Delete', 'server route owed', null, true, 'server route owed'); // no collector route — v1 gap, reported
  } else if (cm.kind === 'item') {
    cmRow(box, 'Copy text', '', () => cmCopy(cm.text));
  }
}
function openCm(e, kind, data) {
  closeMenu(); closePop(); // one menu at a time across the singletons
  cm = Object.assign({ el: document.createElement('div'), kind, confirm: null }, data);
  cm.el.className = 'cmenu';
  document.body.appendChild(cm.el);
  renderCm();
  const x = (e.clientX ?? 0) + 2, y = (e.clientY ?? 0) + 2; // ponytail: fixed 200px clamp estimate, not offsetWidth — upgrade on real overflow reports
  cm.el.style.left = Math.min(x, (window.innerWidth || 1200) - 200) + 'px';
  cm.el.style.top = Math.min(y, (window.innerHeight || 800) - 140) + 'px';
}
document.addEventListener('contextmenu', (e) => {
  const t = e.target;
  if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return; // native paste/spell survives on inputs
  if (!(t.closest && (t.closest('#sidebar') || t.closest('#session')))) return; // outside the app chrome: native menu
  e.preventDefault(); // suppressed inside the main/sidebar panes
  closeCm(); // one menu: the previous closes wherever the right-click lands
  const row = t.closest('.row');
  if (row && row.dataset && row.dataset.id) {
    openCm(e, row.classList.contains('child') ? 'child' : 'session', { id: row.dataset.id, live: row.dataset.live === '1' }); // 7aq: liveness rides the row
    return;
  }
  const item = t.closest('.item');
  if (item) {
    const text = cmText.get(item);
    if (text != null) openCm(e, 'item', { text }); // no stored text (an optimistic echo): suppressed, no menu
  }
  // anywhere else in the chrome: native suppressed, no custom menu
});
document.addEventListener('mousedown', (e) => { if (cm && !cm.el.contains(e.target)) closeCm(); }); // outside-click (the menu's own listener is untouched)
window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && cm) closeCm(); }); // Escape closes (the sash-drag listener is untouched)

// --- 7ac: file viewer — the .plink click target. ONE singleton overlay
// (the menu's chrome: grey-2 panel, hairline, square; no lime), mono text,
// pre-wrap; header = path + Copy + Close; the FETCH happens here (the
// standard authed header fetch), never at render. Escape + scrim click +
// the button close; a mid-flight fetch into a closed panel paints nothing.
let viewer = null; // {el, path, body, pathEl}
function closeViewer() { if (viewer) { viewer.el.remove(); viewer = null; } }
async function openViewer(p) {
  closeViewer(); // one at a time
  const el = document.createElement('div'); el.className = 'viewer';
  const box = document.createElement('div'); box.className = 'viewer-box';
  const head = document.createElement('div'); head.className = 'viewer-head';
  const pathEl = document.createElement('span'); pathEl.className = 'viewer-path'; txt(pathEl, p);
  const copy = document.createElement('button'); txt(copy, 'Copy');
  const close = document.createElement('button'); txt(close, 'Close');
  const body = document.createElement('div'); body.className = 'viewer-body'; txt(body, 'loading…');
  head.appendChild(pathEl); head.appendChild(copy); head.appendChild(close);
  box.appendChild(head); box.appendChild(body);
  el.appendChild(box);
  document.body.appendChild(el);
  viewer = { el, path: p, body, pathEl };
  copy.onclick = () => { // the header path, clipboard like the context menu's Copy
    const w = navigator.clipboard?.writeText?.(viewer ? viewer.path : p);
    if (w && w.then) w.then(() => toast('copied'), () => toast('copy failed'));
    else toast('copy unavailable');
  };
  close.onclick = closeViewer;
  el.addEventListener('click', (e) => { if (e.target === el) closeViewer(); }); // scrim click closes
  try {
    const r = await fetch('/api/file?path=' + encodeURIComponent(p), { headers: { 'x-prime-token': token } });
    if (!viewer || viewer.el !== el) return; // closed mid-flight
    let d = null; const raw = await r.text();
    try { d = JSON.parse(raw); } catch (e) {}
    if (r.status === 200 && d && typeof d.text === 'string') {
      txt(viewer.pathEl, d.path || p); // the realpath header
      txt(viewer.body, d.text);
    } else {
      txt(viewer.body, (d && d.error ? d.error : 'unavailable') + ' (' + r.status + ')');
    }
  } catch (e) {
    if (viewer && viewer.el === el) txt(viewer.body, 'fetch failed');
  }
}
document.addEventListener('click', (e) => { // 7ac: delegated — anchors carry only data, one listener opens them all
  const t = e.target;
  const a = t && t.closest ? t.closest('.plink') : null;
  if (!a) return;
  e.preventDefault();
  const p = (a.dataset && a.dataset.p) || a.p;
  if (p) openViewer(String(p));
});
window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && viewer) closeViewer(); }); // Esc closes the viewer (menu + sash listeners untouched)

showList();
const deep = (location.hash || '').match(/^#\/s\/(.+)$/); // deep-link preselect, parsed ONCE; selection never rewrites the hash
if (deep) showSession(decodeURIComponent(deep[1]));
else { const kept = lsGet('webuiSelected'); if (kept) showSession(kept, true); } // no deep link: restore the persisted selection
setInterval(() => { if (!document.hidden) showList(); }, 15000); // sidebar refreshes every 15s while the page is visible

// 7aa system meter: two stacked hairline tracks in the top bar (CPU over
// MEM), grey fills ONLY (lime stays working-only), tiny mono % labels; hover
// tooltips carry cores/load + GB. Polls /api/system every 5s; hidden until
// it answers, hidden again on any error (graceful — an old collector 404s
// and the meter just never shows).
const sysmeter = $('#sysmeter'), cpuRow = $('#cpuRow'), memRow = $('#memRow'),
      cpuFill = $('#cpuFill'), memFill = $('#memFill'), cpuPctEl = $('#cpuPct'), memPctEl = $('#memPct');
const fmtGB = (b) => (b / 1073741824).toFixed(1) + ' GB';
async function sysTick() {
  const d = await api('/api/system'); // null on 404/failure — the meter hides, no console noise
  if (!d || typeof d.cpuPct !== 'number' || !d.mem || typeof d.mem.pct !== 'number') { sysmeter.classList.add('hidden'); return; }
  sysmeter.classList.remove('hidden');
  cpuFill.style.width = Math.max(0, Math.min(100, d.cpuPct)) + '%';
  memFill.style.width = Math.max(0, Math.min(100, d.mem.pct)) + '%';
  txt(cpuPctEl, d.cpuPct + '%'); txt(memPctEl, d.mem.pct + '%');
  cpuRow.title = 'CPU ' + d.cpuPct + '% \u00b7 cores ' + (d.cores ?? '?') + ' \u00b7 load ' + (Array.isArray(d.load) ? d.load.map((x) => Number(x).toFixed(2)).join('/') : '?');
  memRow.title = 'MEM ' + d.mem.pct + '% \u00b7 used ' + fmtGB(d.mem.used) + ' / total ' + fmtGB(d.mem.total);
}
sysTick(); // first paint without waiting the interval
setInterval(() => { if (!document.hidden) sysTick(); }, 5000); // meter polls every 5s while the page is visible
