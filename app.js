/* =========================================================================
   Tandem — app logic (vanilla JS, no build step, no dependencies)

   Architecture: a single state object → pure render functions that return
   HTML strings → one delegated click handler. State is persisted to
   localStorage. Everything time-based uses real timestamps so streaks,
   heatmaps and "x minutes ago" are genuine, not decorative.
   ========================================================================= */
(function () {
  'use strict';
  const T = window.TANDEM;
  const { CATEGORIES, AVATAR_GRADIENTS, PEOPLE, REVIEWS, ME, SEED_MATCHES, LIKES_YOU, ACTIVITY, QUICK_CHIPS, REPLIES, REPORT_REASONS, ACHIEVEMENTS, TONE_COPY } = T;

  /* ---------- tiny helpers ---------- */
  const $ = (s, r = document) => r.querySelector(s);
  const root = document.documentElement;
  const app = $('#app');
  const navEl = $('#nav');
  const overlay = $('#overlay');
  const grad = (i) => { const g = AVATAR_GRADIENTS[i % AVATAR_GRADIENTS.length]; return `linear-gradient(135deg, ${g[0]}, ${g[1]})`; };
  const mono = (name) => ((name || '?').trim()[0] || '?').toUpperCase();
  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));
  const tone = () => TONE_COPY[state.tone] || TONE_COPY.playful;
  const personById = (id) => PEOPLE.find((p) => p.id === id);
  const starsStr = (n) => '★'.repeat(Math.round(n)) + '☆'.repeat(5 - Math.round(n));
  const activeText = (a) => ({ now: 'Active now', '2h': 'Active 2h ago', today: 'Active today', yesterday: 'Active yesterday' }[a] || 'Active recently');
  // FNV-1a with a final avalanche: good distribution even for short, similar keys ("0-19", "0-20"…)
  const hash = (s) => { let h = 2166136261; for (const ch of String(s)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } h ^= h >>> 13; h = Math.imul(h, 0x5bd1e995); h ^= h >>> 15; return h >>> 0; };
  const pick = (arr, seed) => arr[hash(seed) % arr.length];
  const isWide = () => window.innerWidth >= 1024;
  const plural = (n, w) => `${n} ${n === 1 ? w : w === 'person' ? 'people' : w + 's'}`;

  /* ---------- dates ---------- */
  const DAY = 86400000;
  const pad = (n) => String(n).padStart(2, '0');
  const dayKey = (d = new Date()) => { const x = new Date(d); return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`; };
  const keyOffset = (n) => { const d = new Date(); d.setHours(12, 0, 0, 0); return dayKey(new Date(d.getTime() - n * DAY)); };
  const todayKey = () => dayKey();
  const relTime = (ts) => {
    const m = Math.round((Date.now() - ts) / 60000);
    if (m < 1) return 'just now'; if (m < 60) return `${m}m ago`;
    const h = Math.round(m / 60); if (h < 24) return `${h}h ago`;
    const d = Math.round(h / 24); if (d < 7) return `${d}d ago`;
    return `${Math.round(d / 7)}w ago`;
  };
  const fmtTime = (ts) => new Date(ts).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const dayLabel = (ts) => {
    const k = dayKey(new Date(ts));
    if (k === todayKey()) return 'Today'; if (k === keyOffset(1)) return 'Yesterday';
    return new Date(ts).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
  };
  const daysSince = (ts) => Math.max(0, Math.floor((Date.now() - ts) / DAY));
  // "7:02 AM" + days-ago → timestamp (clamped to the past)
  function tsFor(day, t) {
    const [hm, ap] = String(t).split(' '); let [h, mi] = hm.split(':').map(Number);
    if (ap === 'PM' && h < 12) h += 12; if (ap === 'AM' && h === 12) h = 0;
    const d = new Date(); d.setDate(d.getDate() - day); d.setHours(h, mi || 0, 0, 0);
    return Math.min(d.getTime(), Date.now() - 60000);
  }

  /* ---------- seed builders (turn offsets in data.js into real timestamps) ---------- */
  function seedGoals() {
    const goals = ME.goals.map((g) => ({ cat: g.cat, text: g.text, stage: g.stage, target: g.target, history: [], notes: [], createdAt: Date.now() - 42 * DAY, _d: g.density }));
    for (let d = 1; d < 42; d++) {
      const k = keyOffset(d);
      if (d <= 18) goals[hash('s' + d) % goals.length].history.push(k);          // guarantees an 18-day streak (today still open)
      goals.forEach((g, i) => { if (!g.history.includes(k) && (hash(`${i}-${d}`) % 100) / 100 < g._d * (d <= 18 ? 0.5 : 0.35)) g.history.push(k); });
    }
    goals.forEach((g) => { g.history.sort(); delete g._d; });
    return goals;
  }
  const seedMatches = () => SEED_MATCHES.map((m) => ({
    id: m.id, sharedGoal: m.sharedGoal, since: Date.now() - m.sinceDays * DAY, lastActivity: m.lastActivity, unread: m.unread, isNew: false,
    messages: m.messages.map((x) => ({ from: x.from, text: x.text, at: tsFor(x.day, x.t) })),
  }));
  const seedActivity = () => ACTIVITY.map((a, i) => ({ id: 'seed' + i, kind: a.kind, icon: a.icon, who: a.who, text: a.text, at: Date.now() - a.ageMin * 60000 }));
  const defaultFilters = () => ({ cats: new Set(), radius: 8, minRating: 0, sort: 'match', verified: false, active: false });
  const defaultSettings = () => ({ notifs: { checkin: true, messages: true, streak: true, requests: true }, privacy: { showDistance: true, showActive: true } });

  /* ---------- state ---------- */
  const state = {
    screen: 'discover', onboarded: false,
    me: { name: 'You', age: ME.age, neighborhood: ME.neighborhood, headline: ME.headline, bio: ME.bio },
    myCats: new Set(ME.goals.map((g) => g.cat)),
    swiped: new Set(), blocked: new Set(),
    matches: seedMatches(), pending: [], activeMatch: null, history: [], ratings: {},
    activity: seedActivity(), activitySeenAt: 0,
    filters: defaultFilters(), goals: seedGoals(), settings: defaultSettings(), superUsed: 0,
    partnerQuery: '',
    tone: root.dataset.tone || 'playful', theme: root.dataset.theme || 'sunset', discover: root.dataset.discover || 'stack',
  };

  /* ---------- persistence ---------- */
  const SKEY = 'tandem_v4';
  function persist() {
    try {
      localStorage.setItem(SKEY, JSON.stringify({
        onboarded: state.onboarded, me: state.me, myCats: [...state.myCats], theme: state.theme, tone: state.tone, discover: state.discover,
        swiped: [...state.swiped], blocked: [...state.blocked], matches: state.matches.map((m) => ({ ...m, _typing: undefined })), pending: state.pending,
        history: state.history, ratings: state.ratings, activity: state.activity.slice(0, 40), activitySeenAt: state.activitySeenAt,
        filters: { ...state.filters, cats: [...state.filters.cats] }, goals: state.goals, settings: state.settings, superUsed: state.superUsed,
      }));
    } catch (e) { /* storage unavailable (private mode etc.) — app still works for the session */ }
  }
  function restore() { try { return JSON.parse(localStorage.getItem(SKEY)); } catch (e) { return null; } }
  (function hydrate() {
    const r = restore(); if (!r || typeof r !== 'object') return;
    try {
      state.onboarded = !!r.onboarded;
      if (r.me) state.me = { ...state.me, ...r.me };
      if (Array.isArray(r.myCats) && r.myCats.length) state.myCats = new Set(r.myCats.filter((c) => CATEGORIES[c]));
      state.theme = r.theme || state.theme; state.tone = r.tone || state.tone; state.discover = r.discover || state.discover;
      state.swiped = new Set(r.swiped || []); state.blocked = new Set(r.blocked || []);
      if (Array.isArray(r.matches)) state.matches = r.matches.filter((m) => m && personById(m.id)).map((m) => ({ ...m, messages: (m.messages || []).filter((x) => x && x.text), _typing: false }));
      if (Array.isArray(r.pending)) state.pending = r.pending.filter((p) => p && personById(p.id));
      if (Array.isArray(r.history)) state.history = r.history;
      if (r.ratings) state.ratings = r.ratings;
      if (Array.isArray(r.activity)) state.activity = r.activity;
      state.activitySeenAt = r.activitySeenAt || 0;
      if (r.filters) state.filters = { ...defaultFilters(), ...r.filters, cats: new Set(r.filters.cats || []) };
      if (Array.isArray(r.goals) && r.goals.length) state.goals = r.goals.map((g) => ({ ...g, history: Array.isArray(g.history) ? g.history : [], notes: Array.isArray(g.notes) ? g.notes : [] }));
      if (r.settings) state.settings = { notifs: { ...defaultSettings().notifs, ...(r.settings.notifs || {}) }, privacy: { ...defaultSettings().privacy, ...(r.settings.privacy || {}) } };
      state.superUsed = r.superUsed || 0;
    } catch (e) { /* corrupt storage → fall back to defaults */ }
    root.dataset.theme = state.theme; root.dataset.tone = state.tone; root.dataset.discover = state.discover;
  })();

  /* ---------- derived ---------- */
  function matchScore(p) {
    const cats = new Set(p.goals.map((g) => g.cat)); cats.add(p.primary);
    let shared = 0; cats.forEach((c) => { if (state.myCats.has(c)) shared++; });
    const s = 58 + (state.myCats.has(p.primary) ? 22 : 0) + shared * 8 + Math.round(p.rating * 2) + Math.max(0, 8 - p.distance);
    return Math.max(61, Math.min(99, Math.round(s + (hash(p.id) % 15) - 7)));
  }
  // Human-readable reasons behind a score (shown on the profile sheet).
  function matchReasons(p) {
    const r = [];
    const cats = new Set(p.goals.map((g) => g.cat)); cats.add(p.primary);
    const shared = [...cats].filter((c) => state.myCats.has(c));
    if (shared.length) r.push({ icon: '🎯', text: `You both care about ${shared.map((c) => CATEGORIES[c].short).join(' & ')}` });
    else r.push({ icon: '🧭', text: 'A different goal area — great for fresh perspective' });
    r.push({ icon: '📍', text: p.distance <= 2 ? `Only ${p.distance} km away — easy to meet up` : `${p.distance} km away in ${p.neighborhood}` });
    if (p.rating >= 4.8) r.push({ icon: '⭐', text: `Rated ${p.rating.toFixed(1)} by ${p.ratingCount} past partners` });
    if (p.streak >= 20) r.push({ icon: '🔥', text: `On a ${p.streak}-day streak — they show up` });
    if (['now', '2h', 'today'].includes(p.active)) r.push({ icon: '⚡', text: 'Active today — replies fast' });
    if (p.verified) r.push({ icon: '✅', text: 'Verified profile' });
    return r.slice(0, 4);
  }
  const RATE_LABELS = { 1: 'Needs work', 2: 'Okay', 3: 'Good', 4: 'Great', 5: 'Amazing 🤩' };
  function displayRating(p) {
    const mine = state.ratings[p.id];
    if (!mine) return { rating: p.rating, count: p.ratingCount, mine: 0 };
    return { rating: (p.rating * p.ratingCount + mine.stars) / (p.ratingCount + 1), count: p.ratingCount + 1, mine: mine.stars };
  }
  const isMatched = (id) => state.matches.some((m) => m.id === id);
  const isPending = (id) => state.pending.some((m) => m.id === id);
  const likesMe = (id) => LIKES_YOU.includes(id) && !isMatched(id) && !state.blocked.has(id);
  function deck() {
    const arr = PEOPLE.filter((p) => {
      if (state.swiped.has(p.id) || isMatched(p.id) || isPending(p.id) || state.blocked.has(p.id)) return false;
      if (state.filters.cats.size) {
        const cats = new Set(p.goals.map((g) => g.cat)); cats.add(p.primary);
        if (![...state.filters.cats].some((c) => cats.has(c))) return false;
      }
      if (p.distance > state.filters.radius) return false;
      if (p.rating < state.filters.minRating) return false;
      if (state.filters.verified && !p.verified) return false;
      if (state.filters.active && !['now', '2h', 'today'].includes(p.active)) return false;
      return true;
    });
    const s = state.filters.sort;
    arr.sort((a, b) => s === 'distance' ? a.distance - b.distance : s === 'rating' ? b.rating - a.rating : matchScore(b) - matchScore(a));
    return arr;
  }
  const likesYou = () => LIKES_YOU.filter((id) => !isMatched(id) && !state.swiped.has(id) && !state.blocked.has(id));
  const unreadTotal = () => state.matches.reduce((n, m) => n + (m.unread || 0), 0) + likesYou().length;
  const hasNewActivity = () => state.activity.some((a) => a.at > state.activitySeenAt);

  // ---- progress maths (all derived from real check-in history) ----
  function checkinDays() { const s = new Set(); state.goals.forEach((g) => g.history.forEach((k) => s.add(k))); return s; }
  function streak() {
    const days = checkinDays(); let n = 0;
    for (let d = days.has(todayKey()) ? 0 : 1; days.has(keyOffset(d)); d++) n++;
    return n;
  }
  const goalProgress = (g) => Math.min(1, g.history.length / Math.max(1, g.target));
  const doneToday = (g) => g.history.includes(todayKey());
  const totalCheckins = () => state.goals.reduce((n, g) => n + g.history.length, 0);
  function goalStreak(g) { let n = 0; for (let d = doneToday(g) ? 0 : 1; g.history.includes(keyOffset(d)); d++) n++; return n; }
  function weekStats() {
    const days = checkinDays(); let active = 0;
    for (let d = 0; d < 7; d++) if (days.has(keyOffset(d))) active++;
    let best = 0, cur = 0; for (let d = 41; d >= 0; d--) { cur = days.has(keyOffset(d)) ? cur + 1 : 0; best = Math.max(best, cur); }
    return { active, best: Math.max(best, streak()) };
  }
  function metrics() { return { partners: state.matches.length, streak: streak(), ratings: Object.keys(state.ratings).length, goals: state.goals.length, checkins: totalCheckins() }; }
  const earned = (a, m) => (m[a.metric] || 0) >= a.min;

  function logActivity(a) { state.activity.unshift({ id: 'a' + Date.now() + Math.random().toString(36).slice(2, 6), at: Date.now(), ...a }); state.activity = state.activity.slice(0, 40); }

  /* ---------- icons ---------- */
  const I = {
    discover: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.5 8.5 22 12 15.5 15.5 12 22 8.5 15.5 2 12 8.5 8.5"/></svg>',
    heart: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 21s-7.5-4.6-10-9.3C.4 8.4 2 4.8 5.5 4.5 8 4.3 9.7 5.9 12 8.6c2.3-2.7 4-4.3 6.5-4.1C22 4.8 23.6 8.4 22 11.7 19.5 16.4 12 21 12 21z"/></svg>',
    chart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><rect x="7" y="11" width="3" height="6" rx="1" fill="currentColor" stroke="none"/><rect x="12" y="7" width="3" height="10" rx="1" fill="currentColor" stroke="none"/><rect x="17" y="13" width="3" height="4" rx="1" fill="currentColor" stroke="none"/></svg>',
    user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7"/></svg>',
    pin: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C7.6 2 4 5.6 4 10c0 5.4 8 12 8 12s8-6.6 8-12c0-4.4-3.6-8-8-8zm0 11a3 3 0 1 1 0-6 3 3 0 0 1 0 6z"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    undo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7v6h6"/><path d="M3.5 13a9 9 0 1 0 2.3-8.5L3 7"/></svg>',
    star: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3 6.3 6.9.9-5 4.8 1.2 6.9L12 17.8 5.9 20.9 7.1 14l-5-4.8L9 8.3z"/></svg>',
    send: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 11L21 3l-8 18-2.5-7.5L3 11z"/></svg>',
    gear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>',
    slider: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 6h11M19 6h1M4 12h5M13 12h7M4 18h9M17 18h3"/><circle cx="17" cy="6" r="2" fill="currentColor"/><circle cx="11" cy="12" r="2" fill="currentColor"/><circle cx="15" cy="18" r="2" fill="currentColor"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l4 4L19 7"/></svg>',
    bell: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
    more: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>',
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>',
    back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>',
    verified: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 1l2.6 1.9 3.2-.2 1 3 2.6 1.9-1 3 1 3-2.6 1.9-1 3-3.2-.2L12 23l-2.6-1.9-3.2.2-1-3L2.6 16.6l1-3-1-3 2.6-1.9 1-3 3.2.2z"/><path d="M10.6 14.6l-2.2-2.2-1.2 1.2 3.4 3.4 6-6-1.2-1.2z" fill="#fff"/></svg>',
  };
  const avatar = (p, cls = 'chat-av') => `<div class="${cls}" style="background:${grad(p.grad)}">${mono(p.name)}</div>`;

  /* ===================================================================
     RENDER ROOT
     =================================================================== */
  function render() {
    // keep whatever the user is typing in the composer across re-renders
    const inp = $('#msgInput'); const draft = inp ? { v: inp.value, f: document.activeElement === inp } : null;
    const screens = { discover: renderDiscover, matches: renderMatches, chat: renderChat, progress: renderProgress, profile: renderProfile };
    const split = isWide() && (state.screen === 'matches' || state.screen === 'chat');
    app.innerHTML = split ? renderSplit() : (screens[state.screen] || renderDiscover)();
    renderNav(); afterMount();
    if (draft) { const n = $('#msgInput'); if (n) { n.value = draft.v; if (draft.f) n.focus(); } }
  }
  function renderNav() {
    const tabs = [['discover', 'Discover', I.discover], ['matches', 'Partners', I.heart], ['progress', 'Progress', I.chart], ['profile', 'Profile', I.user]];
    const u = unreadTotal();
    navEl.innerHTML = tabs.map(([id, label, icon]) => {
      const on = state.screen === id || (id === 'matches' && state.screen === 'chat');
      return `<button class="tab ${on ? 'active' : ''}" data-tab="${id}" ${on ? 'aria-current="page"' : ''} aria-label="${label}${id === 'matches' && u ? `, ${u} new` : ''}">
        ${icon}<span class="tab-label">${label}</span>${id === 'matches' && u ? `<span class="badge">${u}</span>` : ''}</button>`;
    }).join('');
  }
  const bellHTML = () => `<button class="icon-btn bell" data-act="activity" aria-label="Activity">${I.bell}${hasNewActivity() ? '<span class="bell-dot"></span>' : ''}</button>`;

  /* ===================================================================
     DISCOVER
     =================================================================== */
  function renderDiscover() {
    const t = tone();
    const head = `
      <div class="topbar">
        <div><h1>${t.discoverTitle}</h1><div class="sub">${t.discoverSub}</div></div>
        <div class="topbar-actions">${bellHTML()}<button class="icon-btn ${filtersActive() ? 'has-dot' : ''}" data-act="filters" aria-label="Filters">${I.slider}</button></div>
      </div>`;
    const pendingStrip = state.pending.length ? `<button class="pending-strip" data-tab="matches">⏳ ${plural(state.pending.length, 'pair request')} pending · view in Partners</button>` : '';
    const d = deck();
    if (!d.length) {
      return `<div class="screen discover"><div class="col">${head}${pendingStrip}
        <div class="empty">
          <div class="emoji">🌅</div>
          <h3>${esc(t.emptyDeck)}</h3>
          <p>${esc(t.emptySub)}</p>
          <div class="empty-actions"><button class="btn" data-act="filters">Adjust filters</button>${state.history.length ? `<button class="btn btn-ghost" data-act="undo">Undo last</button>` : ''}</div>
        </div></div></div>`;
    }
    if (state.discover === 'list') return `<div class="screen discover"><div class="col col-wide">${head}${pendingStrip}${renderPeopleList(d)}</div></div>`;
    const stack = d.slice(0, 2).map((p, depth) => cardHTML(p, depth)).reverse().join('');
    return `
      <div class="screen discover"><div class="col">
        ${head}${pendingStrip}
        <div class="deck-area"><div class="deck"><div class="deck-stage" id="stage">${stack}</div></div></div>
        <div class="actions">
          <button class="act act-md act-undo" data-act="undo" aria-label="Undo" title="Undo">${I.undo}</button>
          <button class="act act-lg act-pass" data-act="pass" aria-label="${t.pass}" title="${t.pass}">${I.close}</button>
          <button class="act act-md act-super" data-act="super" aria-label="${t.superLike}" title="${t.superLike} — instant pairing">${I.star}</button>
          <button class="act act-lg act-like" data-act="like" aria-label="${t.like}" title="${t.like}">${I.heart}</button>
        </div>
        <div class="deck-hint">Tap a card for details · drag or use ← → ↑ · ${plural(d.length, 'person')} nearby</div>
      </div></div>`;
  }
  const filtersActive = () => state.filters.cats.size || state.filters.minRating || state.filters.verified || state.filters.active || state.filters.radius !== 8;

  function cardHTML(p, depth) {
    const cat = CATEGORIES[p.primary]; const sc = matchScore(p); const dr = displayRating(p);
    const style = depth === 0 ? 'z-index:2' : 'transform:translateY(-30px) scale(.94);filter:brightness(.96);z-index:1;pointer-events:none';
    return `
      <article class="swipe-card" data-id="${p.id}" data-depth="${depth}" style="${style}" aria-label="${esc(p.name)}, ${p.age}. ${esc(p.headline)}">
        <div class="portrait" style="background:${grad(p.grad)}"><span class="mono">${mono(p.name)}</span></div>
        <div class="stamp like">${tone().like}</div><div class="stamp nope">${tone().pass}</div><div class="stamp super">${tone().superLike}</div>
        <div class="card-top">
          <div class="ct-left">
            <span class="dist-chip">${I.pin}${p.distance} km · ${esc(p.neighborhood)}</span>
            <span class="active-chip ${p.active === 'now' ? 'live' : ''}"><i></i>${esc(activeText(p.active))}</span>
            ${likesMe(p.id) ? '<span class="likes-you">💛 Likes you</span>' : ''}
          </div>
          <span class="rate-chip"><span class="star">★</span>${dr.rating.toFixed(1)}<small>(${dr.count})</small></span>
        </div>
        <div class="card-info">
          <div class="match-pill"><b>${sc}%</b> goal match</div>
          <span class="cat-chip" style="background:${cat.color}">${cat.emoji} ${cat.label}</span>
          <div class="name">${esc(p.name)} <span>${p.age}</span>${p.verified ? `<i class="vf" title="Verified">${I.verified}</i>` : ''}</div>
          <div class="headline">${esc(p.headline)}</div>
          <div class="bio">${esc(p.bio)}</div>
          <div class="shared-row">🎯 ${esc(p.shared)}</div>
          <div class="tagrow">${p.tags.map((x) => `<span class="tag">${esc(x)}</span>`).join('')}</div>
        </div>
      </article>`;
  }

  function renderPeopleList(d) {
    return `<div class="scroll"><div class="people-list">${d.map((p) => {
      const cat = CATEGORIES[p.primary]; const sc = matchScore(p);
      return `<div class="person-row" data-card="${p.id}">
        <div class="person-av" style="background:${grad(p.grad)}">${mono(p.name)}<span class="pe">${cat.emoji}</span></div>
        <div class="person-meta">
          <div class="pn">${esc(p.name)}, ${p.age} ${p.verified ? `<i class="vf sm">${I.verified}</i>` : ''}${likesMe(p.id) ? '<span class="likes-you sm">💛 Likes you</span>' : ''}<span class="r"><span class="star">★</span>${displayRating(p).rating.toFixed(1)}</span></div>
          <div class="pg">${esc(p.headline)}</div>
          <div class="pd"><span class="mscore">${sc}% match</span> · 📍 ${p.distance} km · ${esc(activeText(p.active))}</div>
        </div>
        <div class="person-cta"><button class="mini-like" data-act="like-id" data-id="${p.id}" aria-label="${tone().like} ${esc(p.name)}">${I.heart}</button></div>
      </div>`;
    }).join('')}</div></div>`;
  }

  /* ---------- swipe mechanics ---------- */
  function afterMountDiscover() {
    const top = $('.swipe-card[data-depth="0"]'); if (!top) return;
    let sx = 0, sy = 0, dx = 0, dy = 0, dragging = false, t0 = 0, moved = false;
    const onDown = (e) => {
      dragging = true; moved = false; t0 = Date.now(); top.classList.add('dragging');
      sx = e.clientX; sy = e.clientY;
      window.addEventListener('pointermove', onMove); window.addEventListener('pointerup', onUp); window.addEventListener('pointercancel', onUp);
    };
    const onMove = (e) => {
      if (!dragging) return; dx = e.clientX - sx; dy = e.clientY - sy;
      if (Math.abs(dx) + Math.abs(dy) > 6) moved = true;
      top.style.transform = `translate(${dx}px, ${dy}px) rotate(${dx / 18}deg)`;
      top.querySelector('.stamp.like').style.opacity = Math.max(0, Math.min(1, dx / 90));
      top.querySelector('.stamp.nope').style.opacity = Math.max(0, Math.min(1, -dx / 90));
      top.querySelector('.stamp.super').style.opacity = Math.max(0, Math.min(1, -dy / 110)) * (Math.abs(dx) < 60 ? 1 : 0);
    };
    const onUp = () => {
      dragging = false; top.classList.remove('dragging');
      window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp); window.removeEventListener('pointercancel', onUp);
      const id = top.dataset.id;
      if (!moved && Date.now() - t0 < 350) { reset(); return openProfileSheet(id); }
      if (dy < -130 && Math.abs(dx) < 90) return fling(top, 'super', id);
      if (dx > 110) return fling(top, 'like', id);
      if (dx < -110) return fling(top, 'pass', id);
      reset();
    };
    function reset() { top.style.transform = ''; dx = dy = 0; top.querySelectorAll('.stamp').forEach((s) => (s.style.opacity = 0)); }
    top.addEventListener('pointerdown', onDown);
  }
  function fling(cardEl, action, id) {
    const dir = action === 'like' ? 1 : action === 'pass' ? -1 : 0;
    cardEl.style.transition = 'transform .4s var(--ease), opacity .4s';
    cardEl.style.transform = `translate(${dir * 600}px, ${action === 'super' ? -800 : -60}px) rotate(${dir * 30}deg)`;
    cardEl.style.opacity = '0';
    setTimeout(() => commitSwipe(action, id), 230);
  }
  function triggerSwipe(action) { const top = $('.swipe-card[data-depth="0"]'); if (top && !top.dataset.busy) { top.dataset.busy = '1'; fling(top, action, top.dataset.id); } }
  function commitSwipe(action, id) {
    if (action === 'pass') { state.swiped.add(id); state.history.push({ id, action, result: 'pass' }); persist(); if (state.screen === 'discover') render(); return; }
    likePerson(id, action);
  }

  /* ===================================================================
     MATCHING — mutual by design. A like sends a request; the other person
     accepts (simulated). People who already like you, and Perfect matches,
     pair instantly.
     =================================================================== */
  const timers = {};
  function likePerson(id, mode) {
    if (isMatched(id) || isPending(id)) return;
    const p = personById(id); if (!p) return;
    state.swiped.add(id);
    if (mode === 'super') state.superUsed++;
    if (mode === 'super' || LIKES_YOU.includes(id)) {
      state.history.push({ id, action: mode, result: 'match' });
      return addMatch(id, mode === 'super');
    }
    state.pending.push({ id, at: Date.now() });
    state.history.push({ id, action: 'like', result: 'pending' });
    logActivity({ kind: 'sent', icon: '📨', who: id, text: `You sent ${p.name} a pair request` });
    persist(); scheduleAccept(id);
    toast(`Pair request sent to ${p.name} 💛`);
    if (state.screen === 'discover' || state.screen === 'matches') render(); else renderNav();
  }
  function scheduleAccept(id) { clearTimeout(timers[id]); timers[id] = setTimeout(() => acceptPending(id), 3500 + (hash(id) % 4000)); }
  function acceptPending(id, quiet) {
    const i = state.pending.findIndex((p) => p.id === id); if (i < 0) return;
    state.pending.splice(i, 1); clearTimeout(timers[id]);
    const h = state.history.find((x) => x.id === id && x.result === 'pending'); if (h) h.result = 'match';
    const p = personById(id);
    logActivity({ kind: 'match', icon: '🤝', who: id, text: `${p.name} accepted your pair request` });
    // celebrate with the full modal only where it isn't interrupting (Discover / Partners); toast elsewhere
    const busy = quiet || !!overlay.innerHTML || !['discover', 'matches'].includes(state.screen);
    addMatch(id, false, { silent: busy });
    if (busy) toast(`🤝 ${p.name} accepted — you're paired!`);
  }
  function resolvePending() { const now = Date.now(); state.pending.slice().forEach((p) => (now - p.at > 9000 ? acceptPending(p.id, true) : scheduleAccept(p.id))); }
  function addMatch(id, isSuper, opts = {}) {
    if (isMatched(id)) return;
    const p = personById(id);
    state.matches.unshift({ id, sharedGoal: CATEGORIES[p.primary].short, since: Date.now(), lastActivity: 'New partner — say hi!', unread: 0, isNew: true, messages: [] });
    if (!state.activity.some((a) => a.kind === 'match' && a.who === id && Date.now() - a.at < 5000)) logActivity({ kind: 'match', icon: isSuper ? '⭐' : '🤝', who: id, text: `You and ${p.name} are now partners` });
    persist();
    if (opts.silent) { if (['discover', 'matches', 'progress', 'profile'].includes(state.screen)) render(); else renderNav(); return; }
    showMatchModal(p, isSuper);
  }
  function undo() {
    const last = state.history.pop(); if (!last) return toast('Nothing to undo');
    if (last.result === 'match') {
      const m = state.matches.find((x) => x.id === last.id);
      if (m && m.messages.length) { state.history.push(last); return toast("Can't undo — you've already chatted"); }
      state.matches = state.matches.filter((x) => x.id !== last.id); toast('Match undone');
    } else if (last.result === 'pending') { state.pending = state.pending.filter((p) => p.id !== last.id); clearTimeout(timers[last.id]); toast('Request withdrawn'); }
    else toast('Brought them back');
    state.swiped.delete(last.id); persist(); render();
  }
  function withdraw(id) { state.pending = state.pending.filter((p) => p.id !== id); clearTimeout(timers[id]); state.swiped.delete(id); state.history = state.history.filter((h) => !(h.id === id && h.result === 'pending')); persist(); render(); toast('Request withdrawn'); }

  /* ===================================================================
     MATCH MODAL + confetti
     =================================================================== */
  function showMatchModal(p, isSuper) {
    const t = tone(); const sc = matchScore(p);
    overlay.innerHTML = `
      <div class="modal-scrim" role="dialog" aria-modal="true" aria-label="${esc(t.matchTitle)}" style="background:${isSuper ? 'rgba(20,30,60,.62)' : 'rgba(20,8,12,.6)'}">
        <div class="confetti" id="confetti"></div>
        <div class="match-modal">
          <div class="mm-title">${esc(t.matchTitle)}</div>
          <div class="mm-avs">
            <div class="mm-av" style="background:${grad(ME.grad)}">${mono(state.me.name)}</div>
            <div class="mm-link">${isSuper ? '⭐' : '🤝'}</div>
            <div class="mm-av" style="background:${grad(p.grad)}">${mono(p.name)}</div>
          </div>
          <div class="mm-score">${sc}% goal match${isSuper ? ' · Perfect match' : ''}</div>
          <div class="mm-sub">${esc(t.matchSub(p.name))}</div>
          <button class="btn btn-block" data-act="go-chat" data-id="${p.id}">${t.chatHint}</button>
          <button class="btn btn-ghost btn-block" data-act="close-modal">Keep swiping</button>
        </div>
      </div>`;
    confetti(); focusOverlay();
  }
  function confetti() {
    const box = $('#confetti'); if (!box) return;
    const colors = ['#FF6B5C', '#FFB23E', '#FF8A5B', '#2BD9A6', '#F6C453', '#FF5A7A'];
    let html = '';
    for (let i = 0; i < 80; i++) html += `<i style="left:${Math.random() * 100}%;background:${colors[i % colors.length]};animation-duration:${1.6 + Math.random() * 1.8}s;animation-delay:${Math.random() * 0.5}s;transform:rotate(${Math.random() * 360}deg)"></i>`;
    box.innerHTML = html;
  }

  /* ===================================================================
     PARTNERS (list) — used standalone on mobile and as the left pane on desktop
     =================================================================== */
  function partnersInner(opts = {}) {
    const ly = likesYou(); const q = state.partnerQuery.trim().toLowerCase();
    const valid = state.matches.filter((m) => personById(m.id));
    const list = q ? valid.filter((m) => { const p = personById(m.id); return (p.name + ' ' + m.sharedGoal + ' ' + p.headline).toLowerCase().includes(q); }) : valid;
    const newOnes = valid.filter((m) => m.isNew && !m.messages.length);
    const meToday = checkinDays().has(todayKey());
    return `
      <div class="topbar"><div><h1>Partners</h1><div class="sub">${valid.length ? `${plural(valid.length, 'accountability partner')}` : 'Your accountability circle'}</div></div>
        <div class="topbar-actions">${bellHTML()}</div>
      </div>
      ${valid.length > 2 || q ? `<div class="search-row"><span class="s-ic">${I.search}</span><input id="partnerSearch" class="search-in" placeholder="Search partners or goals" value="${esc(state.partnerQuery)}" aria-label="Search partners" /></div>` : ''}
      <div class="scroll">
        ${!q && ly.length ? `<div class="section-label">💛 ${ly.length} ${ly.length === 1 ? 'person wants' : 'people want'} to pair with you</div>
          <div class="likes-row">${ly.map((id) => { const p = personById(id); return `
            <div class="like-card">
              <div class="like-av" style="background:${grad(p.grad)}" data-card="${id}" role="button" aria-label="View ${esc(p.name)}">${mono(p.name)}<span class="lc-emoji">${CATEGORIES[p.primary].emoji}</span></div>
              <div class="lc-name">${esc(p.name)}</div>
              <div class="lc-score">${matchScore(p)}% match</div>
              <button class="btn lc-btn" data-act="connect-like" data-id="${id}">Pair up</button>
            </div>`; }).join('')}</div>` : ''}
        ${!q && state.pending.length ? `<div class="section-label">⏳ Waiting on them</div>
          ${state.pending.map((pr) => { const p = personById(pr.id); return `<div class="pend-row">
            ${avatar(p)}<div class="pend-meta"><b>${esc(p.name)}</b><small>Request sent ${relTime(pr.at)} · usually replies within a day</small></div>
            <button class="rate-btn" data-act="withdraw" data-id="${pr.id}">Withdraw</button></div>`; }).join('')}` : ''}
        ${!q && newOnes.length ? `<div class="section-label">New tandems — say hi</div>
          <div class="new-row">${newOnes.map((m) => { const p = personById(m.id); return `<div class="new-card" data-open="${m.id}" role="button" aria-label="Open chat with ${esc(p.name)}">
            <div class="new-av" style="background:${grad(p.grad)}">${mono(p.name)}<span class="ndot"></span></div><div class="nm">${esc(p.name)}</div></div>`; }).join('')}</div>` : ''}
        <div class="section-label">${q ? `Results for “${esc(state.partnerQuery)}”` : 'Your accountability partners'}</div>
        ${list.length ? list.map((m) => {
          const p = personById(m.id); const cat = CATEGORIES[p.primary]; const dr = displayRating(p); const rated = state.ratings[m.id]; const both = meToday && p.checkedInToday;
          const days = daysSince(m.since);
          return `<div class="match-row ${opts.activeId === m.id ? 'active' : ''}" data-open="${m.id}" role="button" aria-label="Open chat with ${esc(p.name)}">
            <div class="chat-av lg" style="background:${grad(p.grad)}" data-card="${m.id}" role="button" aria-label="View ${esc(p.name)}'s profile" title="View profile">${mono(p.name)}${p.active === 'now' ? '<i class="on-dot"></i>' : ''}</div>
            <div class="match-meta">
              <div class="mn">${esc(p.name)} <span class="goalchip" style="background:${cat.color}">${cat.emoji} ${esc(m.sharedGoal)}</span></div>
              <div class="ml">${esc(m.lastActivity)}</div>
              <div class="ml sub2">${both ? '🔥 Both checked in today' : p.checkedInToday ? `✅ ${esc(p.name)} checked in` : days ? `🔗 Paired ${plural(days, 'day')}` : '✨ Just paired'} · ★ ${dr.rating.toFixed(1)}</div>
            </div>
            <div class="match-right">
              ${m.unread ? `<span class="unread" aria-label="${m.unread} unread">${m.unread}</span>` : ''}
              <button class="rate-btn ${rated ? 'rated' : ''}" data-act="rate" data-id="${m.id}" aria-label="Rate ${esc(p.name)}">${rated ? `★ ${rated.stars}` : `${I.star}<span>Rate</span>`}</button>
            </div>
          </div>`;
        }).join('') : q ? `<div class="empty-mini">No partners match “${esc(state.partnerQuery)}”</div>`
          : `<div class="empty inline"><div class="emoji">🤝</div><h3>No partners yet</h3><p>Pair up with someone chasing the same goal and your chats will live here.</p><button class="btn" data-tab="discover">Find a partner</button></div>`}
      </div>`;
  }
  function renderMatches() { return `<div class="screen"><div class="col col-wide">${partnersInner()}</div></div>`; }

  /* ===================================================================
     CHAT — standalone on mobile, right pane on desktop
     =================================================================== */
  function chatInner(m, opts = {}) {
    const p = personById(m.id); const cat = CATEGORIES[p.primary];
    const meToday = checkinDays().has(todayKey());
    const chips = QUICK_CHIPS[p.primary] || QUICK_CHIPS.habits;
    const days = daysSince(m.since);
    return `
      <div class="chat-head">
        ${opts.split ? '' : `<button class="back icon-btn flat" data-act="back-matches" aria-label="Back to partners">${I.back}</button>`}
        <div class="chat-av" style="background:${grad(p.grad)}" data-card="${p.id}" role="button" aria-label="View ${esc(p.name)}'s profile">${mono(p.name)}</div>
        <div class="ci"><div class="cn">${esc(p.name)} ${p.verified ? `<i class="vf sm">${I.verified}</i>` : ''}</div><div class="cs"><span class="${p.active === 'now' ? 'live' : ''}">● ${esc(activeText(p.active))}</span> · ${days ? `paired ${plural(days, 'day')}` : 'new partner'}</div></div>
        <button class="icon-btn flat" data-act="chat-menu" data-id="${p.id}" aria-label="More options">${I.more}</button>
      </div>
      <div class="goal-banner">
        <span class="gb-emoji">${cat.emoji}</span>
        <div class="gb-text"><b>Shared goal · ${esc(m.sharedGoal)}</b><small>${esc(p.shared)}</small></div>
        <span class="streak-badge" title="Today's check-ins">${meToday && p.checkedInToday ? '🔥 Both today' : `${meToday ? '✅' : '○'} You · ${p.checkedInToday ? '✅' : '○'} ${esc(p.name)}`}</span>
      </div>
      ${!state.ratings[m.id] && m.messages.length >= 4 ? `<button class="rate-nudge" data-act="rate" data-id="${m.id}"><span>⭐ How's ${esc(p.name)} as a partner?</span><b>Rate →</b></button>` : ''}
      <div class="msgs" id="msgs" aria-live="polite">${msgsHTML(m)}</div>
      <div class="quick-chips">${chips.map((c) => `<button class="qchip" data-chip="${esc(c)}">${esc(c)}</button>`).join('')}</div>
      <div class="composer">
        <input id="msgInput" placeholder="Message ${esc(p.name)}…" autocomplete="off" maxlength="300" aria-label="Message ${esc(p.name)}" />
        <button class="send-btn" data-act="send" aria-label="Send">${I.send}</button>
      </div>`;
  }
  function renderChat() {
    const m = state.matches.find((x) => x.id === state.activeMatch);
    if (!m || !personById(m.id)) { state.screen = 'matches'; return renderMatches(); }
    return `<div class="screen chat"><div class="col col-chat">${chatInner(m)}</div></div>`;
  }
  function renderSplit() {
    const m = state.matches.find((x) => x.id === state.activeMatch && personById(x.id));
    if (m) m.unread = 0;
    return `<div class="screen"><div class="split">
      <section class="split-left">${partnersInner({ activeId: m ? m.id : null })}</section>
      <section class="split-right">${m ? chatInner(m, { split: true }) : `<div class="empty"><div class="emoji">💬</div><h3>Pick a partner</h3><p>Your check-ins, nudges and wins live here. Select a partner on the left to start.</p></div>`}</section>
    </div></div>`;
  }
  const bubbleHTML = (b) => `<div class="bubble ${b.from}">${esc(b.text)}<span class="bt">${fmtTime(b.at)}</span></div>`;
  function msgsHTML(m) {
    if (!m.messages.length && !m._typing) return `<div class="chat-empty"><div class="emoji">👋</div>You're paired! Break the ice — try a quick check-in below.</div>`;
    let out = '', lastDay = null;
    m.messages.forEach((b) => { const d = dayLabel(b.at); if (d !== lastDay) { out += `<div class="day-sep"><span>${d}</span></div>`; lastDay = d; } out += bubbleHTML(b); });
    return out + (m._typing ? `<div class="bubble them typing" aria-label="typing"><span></span><span></span><span></span></div>` : '');
  }
  const viewingChat = (id) => state.activeMatch === id && (state.screen === 'chat' || (state.screen === 'matches' && isWide()));
  function intentOf(text) {
    const t = text.toLowerCase();
    const done = /\b(did|done|finished|completed|crushed|nailed|hit|logged|shipped|practi[sc]ed|saved|booked|kept|ticked|moved)\b/.test(t);
    const hard = /\b(hard|tough|struggl\w*|exhaust\w*|tired|rough|difficult|slipp\w*|losing steam|stuck|low)\b/.test(t);
    if (done && hard) return 'done_hard';
    if (/\b(nudge|motivat\w*|push|remind\w*|need a)\b/.test(t)) return 'nudge';
    if (/\b(skip\w*|miss\w*|couldn'?t|didn'?t|no time|lazy|almost)\b/.test(t)) return 'skip';
    if (hard) return 'hard';
    if (done) return 'done';
    if (/\b(tomorrow|same time|schedule|plan\w*|tonight|morning|friday|weekly|session)\b/.test(t)) return 'plan';
    if (/\?\s*$/.test(t)) return 'question';
    if (/\b(thank\w*|appreciate)\b/.test(t)) return 'thanks';
    if (/^(hi|hey|hello|yo|hiya)\b/.test(t)) return 'greet';
    return 'default';
  }
  function sendMessage(text) {
    text = (text || '').trim(); if (!text) return;
    const m = state.matches.find((x) => x.id === state.activeMatch); if (!m) return;
    const p = personById(m.id);
    m.messages.push({ from: 'me', text, at: Date.now() }); m.isNew = false; m.lastActivity = 'You: ' + text; persist();
    m._typing = true; chatUpdate();
    const reply = pick(REPLIES[intentOf(text)] || REPLIES.default, text + m.messages.length);
    setTimeout(() => {
      m._typing = false;
      m.messages.push({ from: 'them', text: reply, at: Date.now() });
      m.lastActivity = p.name + ': ' + reply;
      if (viewingChat(m.id)) { chatUpdate(); if (isWide()) refreshPartnersPane(); }
      else { m.unread = (m.unread || 0) + 1; logActivity({ kind: 'msg', icon: '💬', who: m.id, text: `${p.name}: ${reply}` }); renderNav(); if (state.screen === 'matches') render(); }
      persist();
    }, 900 + (hash(text) % 900));
  }
  function chatUpdate() {
    const box = $('#msgs'); if (!box) return render();
    const m = state.matches.find((x) => x.id === state.activeMatch); if (!m) return render();
    box.innerHTML = msgsHTML(m); box.scrollTop = box.scrollHeight;
  }
  function refreshPartnersPane() { const left = $('.split-left'); if (left) { const m = state.matches.find((x) => x.id === state.activeMatch); left.innerHTML = partnersInner({ activeId: m ? m.id : null }); } }
  function openChat(id) {
    const m = state.matches.find((x) => x.id === id); if (!m) return;
    state.activeMatch = id; m.unread = 0; closeOverlay(); persist();
    go(isWide() ? 'matches' : 'chat');
  }

  /* ===================================================================
     PROGRESS
     =================================================================== */
  function renderProgress() {
    const st = streak(); const days = checkinDays(); const today = days.has(todayKey());
    const doneN = state.goals.filter(doneToday).length;
    const avg = state.goals.length ? Math.round(state.goals.reduce((a, g) => a + goalProgress(g), 0) / state.goals.length * 100) : 0;
    const wk = weekStats();
    const cheerer = state.matches.length ? personById(state.matches[0].id) : null;
    return `
      <div class="screen"><div class="col col-wide">
        <div class="topbar"><div><h1>Your progress</h1><div class="sub">Consistency beats intensity</div></div><div class="topbar-actions">${bellHTML()}</div></div>
        <div class="scroll">
          <div class="streak-hero ${today ? 'lit' : ''}">
            <div><div class="big" data-count="${st}">${st}</div><div class="sl">DAY STREAK</div>
              <div class="sd">${today ? `✓ ${plural(doneN, 'check-in')} today — streak safe` : st ? 'Check in today to keep it alive' : 'Check in today to start a streak'}</div></div>
            <div class="flames" aria-hidden="true">🔥</div>
          </div>
          <div class="mini-stats">
            <div class="ms"><b data-count="${state.goals.length}">${state.goals.length}</b><small>active goals</small></div>
            <div class="ms"><b data-count="${avg}" data-suffix="%">${avg}%</b><small>avg progress</small></div>
            <div class="ms"><b data-count="${totalCheckins()}">${totalCheckins()}</b><small>check-ins</small></div>
          </div>
          <div class="card heat-card">
            <div class="card-h"><b>Last 6 weeks</b><small>${wk.active}/7 days this week · best streak ${wk.best}</small></div>
            <div class="heat-week">${['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d) => `<span>${d}</span>`).join('')}</div>
            <div class="heat">${heatCells(days)}</div>
          </div>
          <div class="insight">${insightText(wk, st, today)}</div>
          ${cheerer ? `<div class="partner-cheer"><div class="pc-av" style="background:${grad(cheerer.grad)}">${mono(cheerer.name)}</div>
            <div><b>${today ? `${esc(cheerer.name)} cheered your check-in 🎉` : `${esc(cheerer.name)} is waiting on your check-in 👀`}</b><div class="pc-sub">${today ? '“Streak safe. Same again tomorrow?”' : 'Partners get notified when you check in.'}</div></div></div>` : ''}
          <div class="section-label row">Goals you're tracking<button class="link-btn" data-act="add-goal">${I.plus} Add goal</button></div>
          ${state.goals.length ? state.goals.map((g, i) => goalCardHTML(g, i)).join('')
            : `<div class="empty inline"><div class="emoji">🎯</div><h3>No goals yet</h3><p>Add a goal to start checking in and building a streak.</p><button class="btn" data-act="add-goal">Add your first goal</button></div>`}
          <div style="height:8px"></div>
        </div>
      </div></div>`;
  }
  function goalCardHTML(g, i) {
    const cat = CATEGORIES[g.cat] || CATEGORIES.habits; const done = doneToday(g); const pct = goalProgress(g); const gs = goalStreak(g);
    return `<div class="goal-card">
      <div class="gc-top" data-act="goal-detail" data-id="${i}" role="button" aria-label="Open ${esc(g.text)}">
        <div class="gc-emoji" style="background:${cat.color}">${cat.emoji}</div>
        <div class="gc-title"><b>${esc(g.text)}</b><small>${esc(g.stage)}${gs ? ` · 🔥 ${gs}d` : ''}</small></div>
        <div class="gc-pct">${Math.round(pct * 100)}%</div>
        <button class="icon-btn flat sm" data-act="goal-menu" data-id="${i}" aria-label="Goal options">${I.more}</button>
      </div>
      <div class="bar"><i data-fill="${pct}"></i></div>
      <div class="gc-foot"><small>${g.history.length}/${g.target} check-ins · ${cat.label}</small>
        <button class="checkin-btn ${done ? 'done' : ''}" data-checkin="${i}" aria-pressed="${done}">${done ? '✓ Checked in' : 'Check in'}</button></div>
    </div>`;
  }
  function heatCells(days) {
    // 6 rows × 7 columns, oldest first, aligned so the last row ends on today
    const todayDow = (new Date().getDay() + 6) % 7; // Monday = 0
    const total = 35 + todayDow + 1; let s = '';
    for (let i = 0; i < 42; i++) {
      const offset = total - 1 - i;
      if (offset < 0) { s += '<i class="future" aria-hidden="true"></i>'; continue; }
      const k = keyOffset(offset); const n = state.goals.filter((g) => g.history.includes(k)).length;
      const lvl = n >= 3 ? 'l3' : n === 2 ? 'l2' : n === 1 ? 'l1' : '';
      s += `<i class="${lvl} ${offset === 0 ? 'today' : ''}" title="${k}: ${plural(n, 'check-in')}"></i>`;
    }
    return s;
  }
  function insightText(wk, st, today) {
    if (!state.goals.length) return '🎯 Add a goal to start tracking.';
    if (wk.active >= 6) return `🏆 ${wk.active} of 7 days this week — that's elite consistency.`;
    if (!today && st >= 7) return `⚠️ ${st}-day streak on the line. One check-in keeps it alive.`;
    if (wk.active >= 4) return `💪 ${wk.active} of 7 days this week. Two more and it's a habit.`;
    if (today) return `✅ Checked in today. Small steps, every day.`;
    return `🌱 ${wk.active} of 7 days this week. Start with the easiest goal.`;
  }
  function doCheckin(i) {
    const g = state.goals[i]; if (!g) return;
    const k = todayKey(); const before = streak();
    if (g.history.includes(k)) { g.history = g.history.filter((x) => x !== k); persist(); render(); return toast('Check-in removed'); }
    g.history.push(k); g.history.sort();
    const after = streak();
    if (after > before) { logActivity({ kind: 'checkin', icon: '✅', who: null, text: `You checked in: ${g.text}` }); toast(after >= 7 && after % 7 === 0 ? `🔥 ${after}-day streak! Partners notified` : `Checked in 🔥 streak ${after}`); }
    else toast('Checked in ✅');
    if (state.settings.notifs.checkin && state.matches.length) { const p = personById(state.matches[0].id); if (p) setTimeout(() => toast(`💬 ${p.name}: "Let's go! Saw your check-in 🙌"`), 1400); }
    persist(); render();
  }

  /* ===================================================================
     PROFILE
     =================================================================== */
  function renderProfile() {
    const reviews = REVIEWS.you || []; const m = metrics();
    const catChips = [...state.myCats].map((c) => CATEGORIES[c]).filter(Boolean);
    const achs = ACHIEVEMENTS.map((a) => ({ ...a, on: earned(a, m) }));
    return `
      <div class="screen"><div class="col col-wide">
        <div class="topbar"><div><h1>Profile</h1><div class="sub">How partners see you</div></div>
          <div class="topbar-actions">${bellHTML()}<button class="icon-btn" data-act="settings" aria-label="Settings">${I.gear}</button></div></div>
        <div class="scroll">
          <div class="profile-hero">
            <div class="big-av" style="background:${grad(ME.grad)}">${mono(state.me.name)}<button class="edit" data-act="edit-profile" aria-label="Edit profile">✏️</button></div>
            <h2>${esc(state.me.name)}, ${state.me.age}</h2>
            <div class="loc">${I.pin} ${esc(state.me.neighborhood)} · within ${state.filters.radius} km</div>
            <div class="headline">${esc(state.me.headline)}</div>
            <div class="my-cats">${catChips.map((c) => `<span class="mc" style="--cc:${c.color}">${c.emoji} ${c.short}</span>`).join('')}</div>
          </div>
          <div class="rating-card">
            <div class="rating-big"><div class="num" data-count="${ME.rating}" data-dec="1">${ME.rating.toFixed(1)}</div><div class="stars">${starsStr(ME.rating)}</div><div class="cnt">${ME.ratingCount} ratings</div></div>
            <div class="rating-div"></div>
            <div><div class="rc-h">What partners say about you</div>
              <div class="rating-tags"><span class="rt">⏰ Reliable</span><span class="rt">🔥 Motivating</span><span class="rt">💬 Responsive</span></div>
              <div class="rc-note">Higher ratings surface you to better matches.</div></div>
          </div>
          <div class="stat-grid">
            <div class="stat"><b data-count="${m.streak}">${m.streak}</b><small>day streak</small></div>
            <div class="stat"><b data-count="${m.partners}">${m.partners}</b><small>partners</small></div>
            <div class="stat"><b data-count="${m.checkins}">${m.checkins}</b><small>check-ins</small></div>
          </div>
          <div class="section-label">Achievements · ${achs.filter((a) => a.on).length}/${achs.length}</div>
          <div class="ach-row">${achs.map((a) => `<div class="ach ${a.on ? 'on' : ''}" title="${esc(a.desc)}"><span class="ae">${a.emoji}</span><b>${esc(a.title)}</b><small>${esc(a.desc)}</small></div>`).join('')}</div>
          <div class="section-label row">Your goals<button class="link-btn" data-act="add-goal">${I.plus} Add goal</button></div>
          ${state.goals.length ? state.goals.map((g, i) => { const c = CATEGORIES[g.cat] || CATEGORIES.habits; return `<div class="profile-goal" data-act="goal-detail" data-id="${i}" role="button">
            <div class="pgc" style="background:${c.color}">${c.emoji}</div>
            <div class="pgt"><b>${esc(g.text)}</b><small>${esc(g.stage)} · ${c.label}</small></div>
            <div class="pg-pct">${Math.round(goalProgress(g) * 100)}%</div></div>`; }).join('') : `<div class="empty-mini">No goals yet — add one to improve your matches.</div>`}
          <div class="section-label">Reviews from partners</div>
          ${reviews.length ? reviews.map((r) => `<div class="review">
            <div class="rv-top"><div class="rv-av" style="background:${grad(r.by.charCodeAt(0) % 10)}">${mono(r.by)}</div>
              <div class="rv-name">${esc(r.by)}</div><div class="rv-stars">${starsStr(r.stars)}</div></div>
            <div class="rv-text">“${esc(r.text)}”</div>
            <div class="rv-tags">${r.tags.map((x) => `<span>${esc(x)}</span>`).join('')}</div></div>`).join('') : `<div class="empty-mini">No reviews yet — they appear after partners rate you.</div>`}
          ${state.matches.length ? `<button class="btn btn-block" data-act="rate-picker" style="margin-top:6px">Rate a partner</button>` : ''}
          <div style="height:14px"></div>
        </div>
      </div></div>`;
  }

  /* ===================================================================
     SHEETS
     =================================================================== */
  function sheet(inner, opts = {}) {
    overlay.innerHTML = `<div class="sheet-scrim"><div class="sheet ${opts.cls || ''}" role="dialog" aria-modal="true" aria-label="${esc(opts.label || 'Dialog')}" tabindex="-1">${inner}</div></div>`;
    focusOverlay();
  }
  function focusOverlay() {
    requestAnimationFrame(() => { const el = overlay.querySelector('input:not([type=range]), textarea') || overlay.querySelector('[role=dialog]'); if (el && !el.matches('.onb *')) el.focus({ preventScroll: true }); });
  }
  const sheetTop = (title, sub) => `<div class="sheet-top"><div><h3>${title}</h3>${sub ? `<div class="sheet-sub left">${sub}</div>` : ''}</div><button class="sheet-x" data-act="close-sheet" aria-label="Close">${I.close}</button></div>`;

  // Generic confirm dialog
  function confirmSheet({ title, body, ok, danger, onOk }) {
    sheet(`${sheetTop(esc(title))}<p class="confirm-body">${body}</p>
      <div class="sheet-actions"><button class="btn btn-ghost flex1" data-act="close-sheet">Cancel</button><button class="btn flex1 ${danger ? 'btn-danger' : ''}" id="confirmOk">${esc(ok || 'Confirm')}</button></div>`, { label: title });
    $('#confirmOk').addEventListener('click', () => { closeOverlay(); onOk(); });
  }
  // Generic action list ("kebab" menu)
  function actionSheet(title, items) {
    sheet(`${sheetTop(esc(title))}<div class="action-list">${items.map((it, i) => `<button class="action-item ${it.danger ? 'danger' : ''}" data-ai="${i}"><span class="ai-ic">${it.icon}</span><span><b>${esc(it.label)}</b>${it.sub ? `<small>${esc(it.sub)}</small>` : ''}</span></button>`).join('')}</div>`, { label: title });
    overlay.querySelectorAll('[data-ai]').forEach((b) => b.addEventListener('click', () => { closeOverlay(); items[+b.dataset.ai].run(); }));
  }

  function openProfileSheet(id) {
    const p = personById(id); if (!p) return;
    const cat = CATEGORIES[p.primary]; const sc = matchScore(p); const dr = displayRating(p);
    const reviews = REVIEWS[id] || []; const matched = isMatched(id); const pending = isPending(id); const rated = state.ratings[id];
    sheet(`
      <button class="ps-x" data-act="close-sheet" aria-label="Close">${I.close}</button>
      <div class="ps-hero" style="background:${grad(p.grad)}">
        <div class="ps-mono">${mono(p.name)}</div><span class="ps-emoji">${cat.emoji}</span>
        <div class="ps-score"><b>${sc}%</b><small>match</small></div>
      </div>
      <div class="ps-body">
        <div class="ps-name">${esc(p.name)}, ${p.age} ${p.verified ? `<i class="vf">${I.verified}</i>` : ''}${likesMe(id) && !matched ? '<span class="likes-you sm">💛 Likes you</span>' : ''}</div>
        <div class="ps-meta">${I.pin}${p.distance} km · ${esc(p.neighborhood)} · <span class="star">★</span> ${dr.rating.toFixed(1)} (${dr.count})${rated ? ` · you ★${rated.stars}` : ''} · ${esc(activeText(p.active))}</div>
        <div class="ps-headline">${esc(p.headline)}</div>
        <p class="ps-bio">${esc(p.bio)}</p>
        <div class="tagrow dark">${p.tags.map((x) => `<span class="tag">${esc(x)}</span>`).join('')}${p.badges.map((x) => `<span class="tag gold">${esc(x)}</span>`).join('')}</div>
        <div class="ps-section">Why you match</div>
        <div class="why-list">${matchReasons(p).map((r) => `<div class="why"><span>${r.icon}</span>${esc(r.text)}</div>`).join('')}</div>
        <div class="ps-section">Their goals</div>
        ${p.goals.map((g) => { const c = CATEGORIES[g.cat]; return `<div class="ps-goal"><div class="pgc" style="background:${c.color}">${c.emoji}</div>
          <div class="pg-info"><b>${esc(g.text)}</b><small>${esc(g.stage)}</small><div class="bar sm"><i style="width:${Math.round((g.pct || 0) * 100)}%"></i></div></div></div>`; }).join('')}
        ${reviews.length ? `<div class="ps-section">Partner reviews</div>${reviews.map((r) => `<div class="review flat">
          <div class="rv-top"><div class="rv-av" style="background:${grad(r.by.charCodeAt(0) % 10)}">${mono(r.by)}</div><div class="rv-name">${esc(r.by)}</div><div class="rv-stars">${starsStr(r.stars)}</div></div>
          <div class="rv-text">“${esc(r.text)}”</div></div>`).join('')}` : ''}
        ${matched ? `<div class="ps-safety"><button class="text-btn" data-act="unmatch" data-id="${id}">Unmatch</button><span>·</span><button class="text-btn" data-act="report" data-id="${id}">Report</button></div>` : `<div class="ps-safety"><button class="text-btn" data-act="report" data-id="${id}">Report profile</button></div>`}
      </div>
      <div class="ps-actions">
        ${matched ? `<button class="btn btn-ghost" data-act="rate" data-id="${id}">${rated ? `★ Rated ${rated.stars}` : 'Rate partner'}</button><button class="btn" data-act="go-chat" data-id="${id}">Message</button>`
        : pending ? `<button class="btn btn-ghost" data-act="withdraw" data-id="${id}">Withdraw request</button><button class="btn" disabled>⏳ Request sent</button>`
        : `<button class="btn btn-ghost" data-act="sheet-pass" data-id="${id}">${tone().pass}</button><button class="btn" data-act="sheet-connect" data-id="${id}">${likesMe(id) ? '🤝 Pair up now' : tone().like}</button>`}
      </div>`, { label: `${p.name}'s profile`, cls: 'profile-sheet' });
  }

  function openRateSheet(id) {
    const p = personById(id); if (!p) return;
    const existing = state.ratings[id];
    const tags = ['Reliable', 'Motivating', 'Honest', 'Responsive', 'Knowledgeable', 'On time'];
    let stars = existing ? existing.stars : 0; const chosen = new Set(existing ? existing.tags : []);
    sheet(`${sheetTop(`Rate ${esc(p.name)}`)}
      <div class="rate-who">${avatar(p, 'rate-av')}<div class="rate-blurb">Ratings are public. They help others find dependable partners — and help ${esc(p.name)} get matched.</div></div>
      <div class="star-pick" id="starPick" role="radiogroup" aria-label="Stars">${[1, 2, 3, 4, 5].map((n) => `<button data-star="${n}" class="${n <= stars ? 'on' : ''}" aria-label="${n} star${n > 1 ? 's' : ''}">★</button>`).join('')}</div>
      <div class="rate-label" id="rateLabel">${stars ? RATE_LABELS[stars] : 'Tap to rate'}</div>
      <div class="fg-label center">What were they great at?</div>
      <div class="tag-pick" id="tagPick">${tags.map((t) => `<button data-tag="${t}" class="${chosen.has(t) ? 'on' : ''}" aria-pressed="${chosen.has(t)}">${t}</button>`).join('')}</div>
      <button class="btn btn-block" id="rateSubmit">${existing ? 'Update rating' : 'Submit rating'}</button>`, { label: `Rate ${p.name}` });
    $('#starPick').addEventListener('click', (e) => { const b = e.target.closest('[data-star]'); if (!b) return; stars = +b.dataset.star; [...$('#starPick').children].forEach((c, i) => c.classList.toggle('on', i < stars)); $('#rateLabel').textContent = RATE_LABELS[stars]; });
    $('#tagPick').addEventListener('click', (e) => { const b = e.target.closest('[data-tag]'); if (!b) return; b.classList.toggle('on'); chosen.has(b.dataset.tag) ? chosen.delete(b.dataset.tag) : chosen.add(b.dataset.tag); b.setAttribute('aria-pressed', chosen.has(b.dataset.tag)); });
    $('#rateSubmit').addEventListener('click', () => {
      if (!stars) return toast('Pick a star rating first ⭐');
      state.ratings[id] = { stars, tags: [...chosen], at: Date.now() };
      logActivity({ kind: 'rating', icon: '⭐', who: id, text: `You rated ${p.name} ${stars}★` });
      persist(); closeOverlay(); render(); toast(`You rated ${p.name} ${stars}★ — thanks!`);
    });
  }
  function openRatePicker() {
    const items = state.matches.filter((m) => personById(m.id)).map((m) => { const p = personById(m.id); const r = state.ratings[m.id]; return { icon: mono(p.name), label: p.name, sub: r ? `You rated ${r.stars}★ · tap to update` : `Paired ${plural(daysSince(m.since), 'day')}`, run: () => openRateSheet(m.id) }; });
    if (!items.length) return toast('Pair up with someone first');
    actionSheet('Rate a partner', items);
  }

  function openFilters() {
    const cats = Object.entries(CATEGORIES);
    const sorts = [['match', 'Best match'], ['distance', 'Closest'], ['rating', 'Top rated']];
    sheet(`${sheetTop('Filters')}
      <div class="fg"><div class="fg-label">Sort by</div><div class="seg" id="sortSeg">${sorts.map(([k, l]) => `<button data-sort="${k}" class="${state.filters.sort === k ? 'on' : ''}">${l}</button>`).join('')}</div></div>
      <div class="fg"><div class="fg-label">Goals</div><div class="chips" id="catPick">${cats.map(([k, c]) => `<button data-cat="${k}" class="chip ${state.filters.cats.has(k) ? 'on' : ''}">${c.emoji} ${c.short}</button>`).join('')}</div></div>
      <div class="fg"><div class="fg-row"><span class="fg-label">Max distance</span><b id="radiusVal">${state.filters.radius} km</b></div><input class="range" type="range" id="radius" min="1" max="25" value="${state.filters.radius}" aria-label="Max distance"></div>
      <div class="fg"><div class="fg-row"><span class="fg-label">Minimum rating</span><b id="minRVal">${state.filters.minRating ? state.filters.minRating + '★' : 'Any'}</b></div><input class="range" type="range" id="minR" min="0" max="5" step="0.5" value="${state.filters.minRating}" aria-label="Minimum rating"></div>
      <div class="toggle-row" data-tg="verified" role="switch" aria-checked="${state.filters.verified}"><div><b>Verified only</b><small>People who confirmed their profile</small></div><span class="switch ${state.filters.verified ? 'on' : ''}"></span></div>
      <div class="toggle-row" data-tg="active" role="switch" aria-checked="${state.filters.active}"><div><b>Active recently</b><small>Online today</small></div><span class="switch ${state.filters.active ? 'on' : ''}"></span></div>
      <div class="sheet-actions"><button class="btn btn-ghost" id="filterReset">Reset</button><button class="btn flex2" id="filterApply">Show <span id="cnt"></span></button></div>`, { label: 'Filters' });
    const f = { cats: new Set(state.filters.cats), radius: state.filters.radius, minRating: state.filters.minRating, sort: state.filters.sort, verified: state.filters.verified, active: state.filters.active };
    const updateCnt = () => { const saved = state.filters; state.filters = f; const n = deck().length; state.filters = saved; const c = $('#cnt'); if (c) c.textContent = plural(n, 'person'); };
    updateCnt();
    $('#sortSeg').addEventListener('click', (e) => { const b = e.target.closest('[data-sort]'); if (!b) return; f.sort = b.dataset.sort; [...$('#sortSeg').children].forEach((c) => c.classList.toggle('on', c.dataset.sort === f.sort)); updateCnt(); });
    $('#catPick').addEventListener('click', (e) => { const b = e.target.closest('[data-cat]'); if (!b) return; const k = b.dataset.cat; b.classList.toggle('on'); f.cats.has(k) ? f.cats.delete(k) : f.cats.add(k); updateCnt(); });
    $('#radius').addEventListener('input', (e) => { f.radius = +e.target.value; $('#radiusVal').textContent = f.radius + ' km'; updateCnt(); });
    $('#minR').addEventListener('input', (e) => { f.minRating = +e.target.value; $('#minRVal').textContent = f.minRating ? f.minRating + '★' : 'Any'; updateCnt(); });
    overlay.querySelectorAll('[data-tg]').forEach((row) => row.addEventListener('click', () => { const k = row.dataset.tg; f[k] = !f[k]; row.querySelector('.switch').classList.toggle('on', f[k]); row.setAttribute('aria-checked', f[k]); updateCnt(); }));
    $('#filterReset').addEventListener('click', () => { state.filters = { ...defaultFilters(), radius: 25 }; persist(); closeOverlay(); render(); toast('Filters cleared'); });
    $('#filterApply').addEventListener('click', () => { state.filters = f; persist(); closeOverlay(); render(); toast(`${plural(deck().length, 'person')} nearby`); });
  }

  /* ---------- goals: add / edit / detail ---------- */
  function openGoalForm(idx) {
    const editing = idx != null; const g = editing ? state.goals[idx] : null;
    const cats = Object.entries(CATEGORIES); let pick = g ? g.cat : null;
    sheet(`${sheetTop(editing ? 'Edit goal' : 'Add a goal', editing ? '' : 'It shows on your profile and improves your matches.')}
      <div class="fg"><div class="fg-label">Category</div><div class="chips" id="goalCat">${cats.map(([k, c]) => `<button data-cat="${k}" class="chip ${pick === k ? 'on' : ''}">${c.emoji} ${c.short}</button>`).join('')}</div></div>
      <div class="fg"><div class="fg-label">What's the goal?</div><input class="text-in" id="goalText" placeholder="e.g. Run a 10K under 60 min" maxlength="60" value="${esc(g ? g.text : '')}" /></div>
      <div class="fg"><div class="fg-label">Where are you now?</div><input class="text-in" id="goalStage" placeholder="e.g. Week 2 of 12" maxlength="30" value="${esc(g ? g.stage : '')}" /></div>
      <div class="fg"><div class="fg-row"><span class="fg-label">Check-ins to finish</span><b id="targetVal">${g ? g.target : 30}</b></div><input class="range" type="range" id="goalTarget" min="7" max="120" step="1" value="${g ? g.target : 30}" aria-label="Target check-ins"></div>
      <button class="btn btn-block" id="goalSubmit">${editing ? 'Save changes' : 'Add goal'}</button>`, { label: editing ? 'Edit goal' : 'Add a goal' });
    $('#goalCat').addEventListener('click', (e) => { const b = e.target.closest('[data-cat]'); if (!b) return; pick = b.dataset.cat; [...$('#goalCat').children].forEach((c) => c.classList.toggle('on', c.dataset.cat === pick)); });
    $('#goalTarget').addEventListener('input', (e) => { $('#targetVal').textContent = e.target.value; });
    $('#goalSubmit').addEventListener('click', () => {
      const text = $('#goalText').value.trim(); const stage = $('#goalStage').value.trim() || 'Just started'; const target = +$('#goalTarget').value;
      if (!pick) return toast('Pick a category'); if (!text) return toast('Describe your goal');
      if (editing) { Object.assign(g, { cat: pick, text, stage, target }); toast('Goal updated'); }
      else { state.goals.push({ cat: pick, text, stage, target, history: [], notes: [], createdAt: Date.now() }); logActivity({ kind: 'goal', icon: '🎯', who: null, text: `New goal: ${text}` }); toast('Goal added 🎯'); }
      state.myCats.add(pick); persist(); closeOverlay(); render();
    });
  }
  function openGoalMenu(idx) {
    const g = state.goals[idx]; if (!g) return;
    actionSheet(g.text, [
      { icon: '📊', label: 'View details', sub: 'History, streak and notes', run: () => openGoalDetail(idx) },
      { icon: '✏️', label: 'Edit goal', sub: 'Change text, category or target', run: () => openGoalForm(idx) },
      { icon: '🗑️', label: 'Delete goal', sub: 'Removes its check-in history', danger: true, run: () => confirmSheet({ title: 'Delete this goal?', body: `<b>${esc(g.text)}</b> and its ${plural(g.history.length, 'check-in')} will be removed. This can't be undone.`, ok: 'Delete', danger: true, onOk: () => { state.goals.splice(idx, 1); persist(); render(); toast('Goal deleted'); } }) },
    ]);
  }
  function openGoalDetail(idx) {
    const g = state.goals[idx]; if (!g) return;
    const c = CATEGORIES[g.cat] || CATEGORIES.habits; const pct = goalProgress(g); const gs = goalStreak(g);
    const last = g.history.length ? g.history[g.history.length - 1] : null;
    const recent = []; for (let d = 13; d >= 0; d--) { const k = keyOffset(d); recent.push(`<i class="${g.history.includes(k) ? 'on' : ''} ${d === 0 ? 'today' : ''}" title="${k}"></i>`); }
    const notes = (g.notes || []).slice().reverse();
    sheet(`${sheetTop(esc(g.text), `${c.emoji} ${c.label} · ${esc(g.stage)}`)}
      <div class="gd-stats">
        <div class="ms"><b>${Math.round(pct * 100)}%</b><small>progress</small></div>
        <div class="ms"><b>${g.history.length}<span class="dim">/${g.target}</span></b><small>check-ins</small></div>
        <div class="ms"><b>${gs}</b><small>day streak</small></div>
      </div>
      <div class="bar"><i style="width:${Math.round(pct * 100)}%"></i></div>
      <div class="fg-row" style="margin-top:16px"><span class="fg-label">Last 14 days</span><small class="dim">${last ? `last check-in ${last === todayKey() ? 'today' : last === keyOffset(1) ? 'yesterday' : last}` : 'no check-ins yet'}</small></div>
      <div class="mini-heat">${recent.join('')}</div>
      <div class="fg-label" style="margin-top:18px">Notes</div>
      <div class="note-add"><input class="text-in" id="noteIn" placeholder="What worked today?" maxlength="120" /><button class="btn sm-btn" id="noteAdd">Add</button></div>
      <div class="notes" id="notes">${notes.length ? notes.map((n) => `<div class="note"><small>${dayLabel(n.at)}</small>${esc(n.text)}</div>`).join('') : '<div class="empty-mini">Jot down what helps — it shows up here.</div>'}</div>
      <div class="sheet-actions"><button class="btn btn-ghost flex1" data-act="goal-edit" data-id="${idx}">Edit</button><button class="btn flex1 ${doneToday(g) ? 'btn-ghost' : ''}" data-checkin="${idx}">${doneToday(g) ? '✓ Checked in today' : 'Check in today'}</button></div>`, { label: g.text });
    const add = () => { const v = $('#noteIn').value.trim(); if (!v) return; g.notes = g.notes || []; g.notes.push({ text: v, at: Date.now() }); persist(); openGoalDetail(idx); toast('Note saved'); };
    $('#noteAdd').addEventListener('click', add);
    $('#noteIn').addEventListener('keydown', (e) => { if (e.key === 'Enter') add(); });
  }

  /* ---------- activity ---------- */
  function openActivity() {
    const items = state.activity.slice(0, 30);
    sheet(`${sheetTop('Activity')}
      <div class="act-list">${items.length ? items.map((a) => {
        const p = a.who ? personById(a.who) : null; const fresh = a.at > state.activitySeenAt;
        return `<div class="act-item ${fresh ? 'fresh' : ''}">
          <div class="act-ic" style="background:${p ? grad(p.grad) : 'var(--surface-2)'}">${a.icon}</div>
          <div class="act-tx"><div>${esc(a.text)}</div><small>${relTime(a.at)}</small></div>
          ${a.kind === 'like' && p && !isMatched(a.who) && !state.blocked.has(a.who) ? `<button class="btn sm-btn" data-act="connect-like" data-id="${a.who}">Pair</button>` : ''}
          ${['msg', 'match'].includes(a.kind) && p && isMatched(a.who) ? `<button class="rate-btn" data-act="go-chat" data-id="${a.who}">Open</button>` : ''}
        </div>`; }).join('') : '<div class="empty-mini">Nothing yet — pair up and check in to see activity here.</div>'}</div>`, { label: 'Activity' });
    state.activitySeenAt = Date.now(); persist(); renderNav();
    document.querySelectorAll('.bell-dot').forEach((d) => d.remove());
  }

  /* ---------- safety: unmatch / report ---------- */
  function unmatch(id) {
    const p = personById(id); if (!p) return;
    confirmSheet({ title: `Unmatch ${p.name}?`, body: `You'll lose this chat and ${esc(p.name)} won't be told why. You can pair again later if you both want to.`, ok: 'Unmatch', danger: true, onOk: () => {
      state.matches = state.matches.filter((m) => m.id !== id); state.swiped.add(id);
      if (state.activeMatch === id) state.activeMatch = null;
      logActivity({ kind: 'unmatch', icon: '👋', who: null, text: `You unmatched ${p.name}` });
      persist(); if (state.screen === 'chat') state.screen = 'matches'; render(); toast(`Unmatched ${p.name}`);
    } });
  }
  function report(id) {
    const p = personById(id); if (!p) return; let reason = null; let block = true;
    sheet(`${sheetTop(`Report ${esc(p.name)}`, 'Reports are confidential. Our team reviews within 24 hours.')}
      <div class="reasons" id="reasons">${REPORT_REASONS.map((r, i) => `<button class="reason" data-r="${i}" aria-pressed="false">${esc(r)}</button>`).join('')}</div>
      <div class="toggle-row" id="blockRow" role="switch" aria-checked="true"><div><b>Also block ${esc(p.name)}</b><small>They won't see you or be shown to you again</small></div><span class="switch on"></span></div>
      <button class="btn btn-block btn-danger" id="reportSubmit">Submit report</button>`, { label: `Report ${p.name}` });
    $('#reasons').addEventListener('click', (e) => { const b = e.target.closest('[data-r]'); if (!b) return; reason = REPORT_REASONS[+b.dataset.r]; overlay.querySelectorAll('.reason').forEach((x) => { x.classList.toggle('on', x === b); x.setAttribute('aria-pressed', x === b); }); });
    $('#blockRow').addEventListener('click', () => { block = !block; $('#blockRow .switch').classList.toggle('on', block); $('#blockRow').setAttribute('aria-checked', block); });
    $('#reportSubmit').addEventListener('click', () => {
      if (!reason) return toast('Choose a reason');
      if (block) { state.blocked.add(id); state.matches = state.matches.filter((m) => m.id !== id); state.pending = state.pending.filter((x) => x.id !== id); state.swiped.add(id); if (state.activeMatch === id) state.activeMatch = null; }
      logActivity({ kind: 'report', icon: '🛡️', who: null, text: `You reported ${p.name}${block ? ' and blocked them' : ''}` });
      persist(); closeOverlay(); if (state.screen === 'chat' && block) state.screen = 'matches'; render();
      toast(`Report submitted${block ? ` · ${p.name} blocked` : ''}. Thank you.`);
    });
  }
  function chatMenu(id) {
    const p = personById(id); if (!p) return;
    actionSheet(p.name, [
      { icon: '👤', label: 'View profile', sub: 'Goals, reviews and why you match', run: () => openProfileSheet(id) },
      { icon: '⭐', label: state.ratings[id] ? 'Update your rating' : 'Rate partner', sub: 'Public — helps others find reliable partners', run: () => openRateSheet(id) },
      { icon: '👋', label: 'Unmatch', sub: 'End this partnership', danger: true, run: () => unmatch(id) },
      { icon: '🛡️', label: 'Report', sub: 'Something felt off', danger: true, run: () => report(id) },
    ]);
  }

  /* ===================================================================
     ONBOARDING — 5 short steps
     =================================================================== */
  function startOnboarding() {
    const draft = { name: state.me.name === 'You' ? '' : state.me.name, cats: new Set(state.myCats), hood: state.me.neighborhood === ME.neighborhood ? '' : state.me.neighborhood, step: 0 };
    const cats = Object.entries(CATEGORIES);
    const steps = [
      () => `<div class="onb-logo">T</div><h1>Tandem</h1><div class="tagline">Goals are better with company. Match with people near you chasing the same thing.</div>
        <div class="onb-steps">
          <div class="onb-step"><span class="os-emoji">🎯</span><div><b>Match on goals, not looks</b><small>Fitness, career, money, habits, learning, travel</small></div></div>
          <div class="onb-step"><span class="os-emoji">🤝</span><div><b>Pair up 1:1</b><small>Daily check-ins, nudges and shared streaks</small></div></div>
          <div class="onb-step"><span class="os-emoji">⭐</span><div><b>Rate each other</b><small>Reliable partners rise to the top</small></div></div>
        </div>
        <button class="btn btn-block" data-onb="next">Get started</button>`,
      () => `<div class="onb-kicker">Step 1 of 4</div><h1 class="sm">What should partners call you?</h1>
        <div class="onb-field"><input class="onb-input" id="onbName" placeholder="Your first name" value="${esc(draft.name)}" maxlength="20" autocomplete="given-name" /></div>
        <div class="onb-nav"><button class="skip" data-onb="back">Back</button><button class="btn" data-onb="next" id="onbNext">Continue</button></div>`,
      () => `<div class="onb-kicker">Step 2 of 4</div><h1 class="sm">Pick your goals</h1><div class="tagline">We match you with people chasing the same things. Choose at least one.</div>
        <div class="onb-field"><div class="onb-cats" id="onbCats">${cats.map(([k, c]) => `<button data-cat="${k}" class="${draft.cats.has(k) ? 'on' : ''}" aria-pressed="${draft.cats.has(k)}">${c.emoji} ${c.short}</button>`).join('')}</div></div>
        <div class="onb-nav"><button class="skip" data-onb="back">Back</button><button class="btn" data-onb="next" id="onbNext">Continue</button></div>`,
      () => `<div class="onb-kicker">Step 3 of 4</div><h1 class="sm">Where are you based?</h1><div class="tagline">We only show people nearby, so you can actually meet up.</div>
        <div class="onb-field"><label for="onbHood">Your area or city</label><input class="onb-input" id="onbHood" placeholder="e.g. Bandra West, Mumbai" value="${esc(draft.hood)}" maxlength="40" autocomplete="address-level2" /></div>
        <div class="onb-nav"><button class="skip" data-onb="back">Back</button><button class="btn" data-onb="next" id="onbNext">Continue</button></div>`,
      () => `<div class="onb-kicker">Step 4 of 4</div><div class="onb-logo">${mono(draft.name || 'You')}</div><h1 class="sm">You're set, ${esc(draft.name || 'friend')}</h1>
        <div class="onb-summary">
          <div><span>🎯</span>${[...draft.cats].map((c) => CATEGORIES[c].short).join(', ')}</div>
          <div><span>📍</span>${esc(draft.hood)} · within 8 km</div>
          <div><span>🔔</span>Daily check-in reminders on (change in Settings)</div>
        </div>
        <button class="btn btn-block" data-onb="finish" id="onbStart">Find my goal partner</button>
        <button class="skip" data-onb="back">Back</button>`,
    ];
    const paint = () => {
      overlay.innerHTML = `<div class="onb-scrim"><div class="onb" role="dialog" aria-modal="true" aria-label="Welcome to Tandem">
        <div class="onb-dots" aria-hidden="true">${steps.map((_, i) => `<i class="${i === draft.step ? 'on' : i < draft.step ? 'done' : ''}"></i>`).join('')}</div>${steps[draft.step]()}</div></div>`;
      const inp = $('#onbName'); if (inp) { inp.focus(); inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') next(); }); }
      const hood = $('#onbHood'); if (hood) { hood.focus(); hood.addEventListener('keydown', (e) => { if (e.key === 'Enter') next(); }); }
      const oc = $('#onbCats'); if (oc) oc.addEventListener('click', (e) => { const b = e.target.closest('[data-cat]'); if (!b) return; const k = b.dataset.cat; draft.cats.has(k) ? draft.cats.delete(k) : draft.cats.add(k); b.classList.toggle('on', draft.cats.has(k)); b.setAttribute('aria-pressed', draft.cats.has(k)); });
      overlay.querySelectorAll('[data-onb]').forEach((b) => b.addEventListener('click', () => ({ next, back, finish })[b.dataset.onb]()));
    };
    const capture = () => { const n = $('#onbName'); if (n) draft.name = n.value.trim(); const h = $('#onbHood'); if (h) draft.hood = h.value.trim(); };
    const next = () => {
      capture();
      if (draft.step === 1 && !draft.name) return toast('Tell us your name 🙂');
      if (draft.step === 2 && !draft.cats.size) return toast('Pick at least one goal');
      if (draft.step === 3 && !draft.hood) return toast('Type your area or city 📍');
      draft.step = Math.min(steps.length - 1, draft.step + 1); paint();
    };
    const back = () => { capture(); draft.step = Math.max(0, draft.step - 1); paint(); };
    const finish = () => {
      state.me.name = draft.name || 'You'; state.me.neighborhood = draft.hood;
      state.myCats = new Set([...draft.cats]); state.goals.forEach((g) => state.myCats.add(g.cat));
      state.onboarded = true; persist(); closeOverlay(); render(); toast(`Welcome, ${state.me.name} 👋`);
    };
    paint();
  }

  function openEditProfile() {
    const cats = Object.entries(CATEGORIES); const sel = new Set(state.myCats);
    sheet(`${sheetTop('Edit profile')}
      <div class="fg"><div class="fg-label">Name</div><input class="text-in" id="epName" value="${esc(state.me.name)}" maxlength="20" /></div>
      <div class="fg two"><div><div class="fg-label">Age</div><input class="text-in" id="epAge" type="number" min="18" max="99" value="${state.me.age}" /></div>
        <div><div class="fg-label">Area / city</div><input class="text-in" id="epHood" value="${esc(state.me.neighborhood)}" maxlength="40" placeholder="e.g. Bandra West, Mumbai" /></div></div>
      <div class="fg"><div class="fg-label">Headline</div><input class="text-in" id="epHead" value="${esc(state.me.headline)}" maxlength="70" placeholder="One line about what you're working on" /></div>
      <div class="fg"><div class="fg-label">About you</div><textarea class="text-in" id="epBio" rows="3" maxlength="220" placeholder="What kind of partner are you?">${esc(state.me.bio)}</textarea></div>
      <div class="fg"><div class="fg-label">Goal areas</div><div class="chips" id="epCats">${cats.map(([k, c]) => `<button data-cat="${k}" class="chip ${sel.has(k) ? 'on' : ''}">${c.emoji} ${c.short}</button>`).join('')}</div></div>
      <button class="btn btn-block" id="epSave">Save profile</button>`, { label: 'Edit profile' });
    $('#epCats').addEventListener('click', (e) => { const b = e.target.closest('[data-cat]'); if (!b) return; const k = b.dataset.cat; sel.has(k) ? sel.delete(k) : sel.add(k); b.classList.toggle('on', sel.has(k)); });
    $('#epSave').addEventListener('click', () => {
      const name = $('#epName').value.trim(); if (!name) return toast('Name can’t be empty');
      const age = Math.max(18, Math.min(99, +$('#epAge').value || state.me.age));
      if (!sel.size) return toast('Keep at least one goal area');
      state.me = { name, age, neighborhood: $('#epHood').value.trim() || state.me.neighborhood, headline: $('#epHead').value.trim() || ME.headline, bio: $('#epBio').value.trim() || ME.bio };
      state.myCats = sel; state.goals.forEach((g) => state.myCats.add(g.cat));
      persist(); closeOverlay(); render(); toast('Profile updated');
    });
  }

  /* ===================================================================
     SETTINGS (appearance, browse style, voice, notifications, privacy, account)
     =================================================================== */
  const OPTS = {
    theme: { title: 'Appearance', opts: [
      { v: 'sunset', b: 'Sunset', s: 'Coral → amber, warm cream', sw: 'linear-gradient(135deg,#FF6B5C,#FFB23E)' },
      { v: 'peach', b: 'Peachy', s: 'Soft, gentle, pastel', sw: 'linear-gradient(135deg,#FBA68E,#F7C6A0)' },
      { v: 'ember', b: 'Ember', s: 'Dark, bold, high-contrast', sw: 'linear-gradient(135deg,#2A1B20,#FF7A5C)' }] },
    discover: { title: 'Browse style', opts: [
      { v: 'stack', b: 'Swipe cards', s: 'Drag to pair, one person at a time', sw: 'linear-gradient(135deg,#FF8A5B,#FFB23E)' },
      { v: 'list', b: 'List', s: 'Scroll a feed, tap to connect', sw: 'linear-gradient(135deg,#E07A87,#FFB23E)' }] },
    tone: { title: 'Voice', opts: [
      { v: 'playful', b: 'Playful', s: '“Find your goal twin 🔥”', sw: 'linear-gradient(135deg,#FF6B5C,#FFB23E)' },
      { v: 'warm', b: 'Warm', s: '“Someone to grow with 💛”', sw: 'linear-gradient(135deg,#FBA68E,#F6C453)' },
      { v: 'bold', b: 'Bold', s: '“Lock in a partner.”', sw: 'linear-gradient(135deg,#2C1A22,#FF6B5C)' }] },
  };
  function openSettings() {
    const optBlock = (key) => `<div class="set-group"><div class="set-h">${OPTS[key].title}</div><div class="opt-row">${OPTS[key].opts.map((o) => `<button class="opt ${state[key] === o.v ? 'on' : ''}" data-set="${key}" data-val="${o.v}" aria-pressed="${state[key] === o.v}">
      <span class="swatch" style="background:${o.sw}"></span><span class="opt-text"><b>${o.b}</b><small>${o.s}</small></span><span class="opt-check">${I.check}</span></button>`).join('')}</div></div>`;
    const tg = (group, key, label, sub) => `<div class="toggle-row" data-toggle="${group}.${key}" role="switch" aria-checked="${state.settings[group][key]}"><div><b>${label}</b><small>${sub}</small></div><span class="switch ${state.settings[group][key] ? 'on' : ''}"></span></div>`;
    sheet(`${sheetTop('Settings')}
      ${optBlock('theme')}${optBlock('discover')}${optBlock('tone')}
      <div class="set-group"><div class="set-h">Notifications</div>
        ${tg('notifs', 'checkin', 'Check-in reminders', 'A nudge if you haven’t checked in by evening')}
        ${tg('notifs', 'messages', 'Partner messages', 'New messages from partners')}
        ${tg('notifs', 'streak', 'Streak alerts', 'Warn me before a streak breaks')}
        ${tg('notifs', 'requests', 'Pair requests', 'When someone wants to pair up')}</div>
      <div class="set-group"><div class="set-h">Privacy</div>
        ${tg('privacy', 'showDistance', 'Show my distance', 'Partners see how far away you are')}
        ${tg('privacy', 'showActive', 'Show when I’m active', 'Display your “active now” status')}</div>
      <div class="set-group"><div class="set-h">Account</div>
        <div class="action-list">
          <button class="action-item" data-act="edit-profile"><span class="ai-ic">✏️</span><span><b>Edit profile</b><small>Name, age, headline, goal areas</small></span></button>
          <button class="action-item" data-act="reset-demo"><span class="ai-ic">↺</span><span><b>Reset demo data</b><small>Restore the sample partners and goals</small></span></button>
          <button class="action-item danger" data-act="sign-out"><span class="ai-ic">🚪</span><span><b>Sign out</b><small>Clears this device and shows onboarding</small></span></button>
        </div></div>
      <div class="set-foot">Tandem · v1.0 · Prototype — sample data, no server</div>`, { label: 'Settings' });
    overlay.querySelectorAll('[data-set]').forEach((b) => b.addEventListener('click', () => { const k = b.dataset.set; state[k] = b.dataset.val; root.dataset[k] = b.dataset.val; persist(); overlay.querySelectorAll(`[data-set="${k}"]`).forEach((x) => { x.classList.toggle('on', x.dataset.val === state[k]); x.setAttribute('aria-pressed', x.dataset.val === state[k]); }); render(); }));
    overlay.querySelectorAll('[data-toggle]').forEach((row) => row.addEventListener('click', () => { const [g, k] = row.dataset.toggle.split('.'); state.settings[g][k] = !state.settings[g][k]; row.querySelector('.switch').classList.toggle('on', state.settings[g][k]); row.setAttribute('aria-checked', state.settings[g][k]); persist(); }));
  }
  function resetDemo(keepOnboarding = true) {
    try { localStorage.removeItem(SKEY); } catch (e) { /* ignore */ }
    Object.values(timers).forEach(clearTimeout);
    Object.assign(state, {
      onboarded: keepOnboarding, me: { name: keepOnboarding ? state.me.name : 'You', age: ME.age, neighborhood: keepOnboarding ? state.me.neighborhood : ME.neighborhood, headline: ME.headline, bio: ME.bio },
      swiped: new Set(), blocked: new Set(), matches: seedMatches(), pending: [], activeMatch: null, history: [], ratings: {},
      activity: seedActivity(), activitySeenAt: 0, filters: defaultFilters(), goals: seedGoals(), settings: defaultSettings(), superUsed: 0, partnerQuery: '',
      myCats: new Set(ME.goals.map((g) => g.cat)), screen: 'discover',
    });
    persist(); closeOverlay(); render();
  }

  /* ===================================================================
     OVERLAY / TOAST / count-up / mount
     =================================================================== */
  function closeOverlay() { overlay.innerHTML = ''; }
  let toastT;
  function toast(msg) {
    const old = $('.toast'); if (old) old.remove();
    const el = document.createElement('div'); el.className = 'toast'; el.setAttribute('role', 'status'); el.textContent = msg;
    document.body.appendChild(el); clearTimeout(toastT); toastT = setTimeout(() => el.remove(), 2400);
  }
  function countUp(node) {
    const target = parseFloat(node.dataset.count); const dec = node.dataset.dec ? 1 : 0; const suffix = node.dataset.suffix || '';
    if (isNaN(target)) return; const dur = 850; let start = null;
    node.textContent = '0' + suffix;
    function step(now) { if (start === null) start = now; const t = Math.min(1, (now - start) / dur); const v = target * (1 - Math.pow(1 - t, 3)); node.textContent = (dec ? v.toFixed(1) : Math.round(v)) + suffix; if (t < 1) requestAnimationFrame(step); }
    requestAnimationFrame(step);
  }
  function afterMount() {
    if (state.screen === 'discover' && state.discover === 'stack') afterMountDiscover();
    requestAnimationFrame(() => {
      document.querySelectorAll('.bar > i[data-fill]').forEach((b) => (b.style.width = (b.dataset.fill * 100) + '%'));
      document.querySelectorAll('[data-count]').forEach(countUp);
    });
    const box = $('#msgs'); if (box) box.scrollTop = box.scrollHeight;
    const ps = $('#partnerSearch'); if (ps) { ps.addEventListener('input', () => { state.partnerQuery = ps.value; const left = $('.split-left'); if (left) { refreshPartnersPane(); $('#partnerSearch').focus(); const n = $('#partnerSearch'); n.setSelectionRange(n.value.length, n.value.length); } else { const sc = $('.scroll'); const y = sc ? sc.scrollTop : 0; render(); const n = $('#partnerSearch'); if (n) { n.focus(); n.setSelectionRange(n.value.length, n.value.length); } const sc2 = $('.scroll'); if (sc2) sc2.scrollTop = y; } }); }
  }

  /* ===================================================================
     EVENTS
     =================================================================== */
  function go(screen) { state.screen = screen; render(); const sc = $('.scroll'); if (sc) sc.scrollTop = 0; }

  document.addEventListener('click', (e) => {
    const tab = e.target.closest('[data-tab]'); if (tab) { closeOverlay(); return go(tab.dataset.tab); }
    const chip = e.target.closest('[data-chip]'); if (chip) return sendMessage(chip.dataset.chip);
    const checkin = e.target.closest('[data-checkin]'); if (checkin) { if (overlay.contains(checkin)) closeOverlay(); return doCheckin(+checkin.dataset.checkin); }
    const a = e.target.closest('[data-act]'); if (a) return handleAct(a.dataset.act, a.dataset.id, a);
    // an avatar (data-card) nested inside a row (data-open) opens the profile; the row itself opens the chat
    const card = e.target.closest('[data-card]'); const open = e.target.closest('[data-open]');
    if (card && (!open || open.contains(card))) return openProfileSheet(card.dataset.card);
    if (open) return openChat(open.dataset.open);
  });

  function handleAct(act, id) {
    switch (act) {
      case 'filters': return openFilters();
      case 'activity': return openActivity();
      case 'settings': return openSettings();
      case 'pass': return triggerSwipe('pass');
      case 'like': return triggerSwipe('like');
      case 'super': return triggerSwipe('super');
      case 'undo': return undo();
      case 'like-id': return likePerson(id, 'like');
      case 'connect-like': closeOverlay(); return likePerson(id, 'like');
      case 'sheet-pass': closeOverlay(); state.swiped.add(id); state.history.push({ id, action: 'pass', result: 'pass' }); persist(); return render();
      case 'sheet-connect': closeOverlay(); return likePerson(id, 'like');
      case 'withdraw': closeOverlay(); return withdraw(id);
      case 'go-chat': return openChat(id);
      case 'close-modal': closeOverlay(); return render();
      case 'back-matches': return go('matches');
      case 'send': { const inp = $('#msgInput'); if (!inp) return; const v = inp.value; inp.value = ''; inp.focus(); return sendMessage(v); }
      case 'rate': return openRateSheet(id);
      case 'rate-picker': return openRatePicker();
      case 'chat-menu': return chatMenu(id);
      case 'unmatch': return unmatch(id);
      case 'report': return report(id);
      case 'close-sheet': return closeOverlay();
      case 'add-goal': return openGoalForm(null);
      case 'goal-menu': return openGoalMenu(+id);
      case 'goal-detail': return openGoalDetail(+id);
      case 'goal-edit': return openGoalForm(+id);
      case 'edit-profile': return openEditProfile();
      case 'reset-demo': return confirmSheet({ title: 'Reset demo data?', body: 'Partners, chats, goals and ratings go back to the sample set. Your name and appearance are kept.', ok: 'Reset', onOk: () => { resetDemo(true); toast('Demo reset ↺'); } });
      case 'sign-out': return confirmSheet({ title: 'Sign out?', body: 'This clears everything on this device and shows onboarding again.', ok: 'Sign out', danger: true, onOk: () => { resetDemo(false); startOnboarding(); } });
    }
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { if (overlay.innerHTML && !$('.onb')) { closeOverlay(); e.preventDefault(); } return; }
    if (e.key === 'Enter' && e.target && e.target.id === 'msgInput') { const v = e.target.value; e.target.value = ''; sendMessage(v); return; }
    if (state.screen === 'discover' && state.discover === 'stack' && !overlay.innerHTML && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) {
      if (e.key === 'ArrowLeft') triggerSwipe('pass');
      if (e.key === 'ArrowRight') triggerSwipe('like');
      if (e.key === 'ArrowUp') triggerSwipe('super');
    }
  });
  overlay.addEventListener('click', (e) => { if (e.target.classList.contains('sheet-scrim')) closeOverlay(); });
  let wasWide = isWide(), rT;
  window.addEventListener('resize', () => { clearTimeout(rT); rT = setTimeout(() => { const w = isWide(); if (w !== wasWide) { wasWide = w; if (['matches', 'chat'].includes(state.screen)) render(); } }, 120); });

  /* ---------- init ---------- */
  resolvePending();
  render();
  if (!state.onboarded) startOnboarding();
})();
