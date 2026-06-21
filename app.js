/* =========================================================================
   Tandem — app logic (vanilla JS, no build step, no dependencies)
   ========================================================================= */
(function () {
  'use strict';
  const T = window.TANDEM;
  const { CATEGORIES, AVATAR_GRADIENTS, PEOPLE, REVIEWS, ME, SEED_MATCHES, LIKES_YOU, ACTIVITY, TONE_COPY } = T;

  /* ---------- tiny helpers ---------- */
  const $ = (s, r = document) => r.querySelector(s);
  const root = document.documentElement;
  const app = $('#app');
  const navEl = $('#nav');
  const overlay = $('#overlay');
  const grad = (i) => { const g = AVATAR_GRADIENTS[i % AVATAR_GRADIENTS.length]; return `linear-gradient(135deg, ${g[0]}, ${g[1]})`; };
  const mono = (name) => (name || '?').trim()[0].toUpperCase();
  const esc = (s) => String(s).replace(/[&<>"]/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));
  const tone = () => TONE_COPY[state.tone];
  const personById = (id) => PEOPLE.find((p) => p.id === id);
  const starsStr = (n) => '★'.repeat(Math.round(n)) + '☆'.repeat(5 - Math.round(n));
  const activeText = (a) => ({ now: 'Active now', '2h': 'Active 2h ago', today: 'Active today', yesterday: 'Active yesterday' }[a] || 'Active recently');

  /* ---------- persistence ---------- */
  const SKEY = 'tandem_v3';
  function persist() {
    try {
      localStorage.setItem(SKEY, JSON.stringify({
        onboarded: state.onboarded, name: state.name, myCats: [...state.myCats],
        theme: state.theme, tone: state.tone, discover: state.discover,
        swiped: [...state.swiped], matches: state.matches, goals: state.goals,
        streak: state.streak, filters: { ...state.filters, cats: [...state.filters.cats] },
      }));
    } catch (e) { /* no storage (e.g. SSR/harness) */ }
  }
  function restore() { try { return JSON.parse(localStorage.getItem(SKEY)); } catch (e) { return null; } }

  /* ---------- state ---------- */
  const state = {
    screen: 'discover', onboarded: false, name: 'You',
    myCats: new Set(ME.goals.map((g) => g.cat)),
    swiped: new Set(),
    matches: SEED_MATCHES.map((m) => ({ ...m, messages: m.messages.slice() })),
    activeMatch: null, history: [], activitySeen: false,
    filters: { cats: new Set(), radius: 8, minRating: 0, sort: 'match' },
    goals: ME.goals.map((g) => ({ ...g, doneToday: false })),
    streak: ME.streak,
    tone: root.dataset.tone || 'playful', theme: root.dataset.theme || 'sunset', discover: root.dataset.discover || 'stack',
  };

  (function hydrate() {
    const r = restore(); if (!r) return;
    Object.assign(state, {
      onboarded: !!r.onboarded, name: r.name || 'You',
      myCats: new Set(r.myCats && r.myCats.length ? r.myCats : ME.goals.map((g) => g.cat)),
      swiped: new Set(r.swiped || []), streak: r.streak ?? ME.streak,
      tone: r.tone || state.tone, theme: r.theme || state.theme, discover: r.discover || state.discover,
    });
    if (r.matches) state.matches = r.matches;
    if (r.goals) state.goals = r.goals;
    if (r.filters) state.filters = { cats: new Set(r.filters.cats || []), radius: r.filters.radius ?? 8, minRating: r.filters.minRating ?? 0, sort: r.filters.sort || 'match' };
    root.dataset.theme = state.theme; root.dataset.tone = state.tone; root.dataset.discover = state.discover;
  })();

  /* ---------- derived ---------- */
  function matchScore(p) {
    const cats = new Set(p.goals.map((g) => g.cat)); cats.add(p.primary);
    let shared = 0; cats.forEach((c) => { if (state.myCats.has(c)) shared++; });
    let s = 58 + (state.myCats.has(p.primary) ? 22 : 0) + shared * 8 + Math.round(p.rating * 2) + Math.max(0, 8 - p.distance);
    let h = 0; for (const ch of p.id) h = (h * 31 + ch.charCodeAt(0)) % 15;
    return Math.max(61, Math.min(99, Math.round(s + h - 7)));
  }
  const isMatched = (id) => state.matches.some((m) => m.id === id);
  function deck() {
    let arr = PEOPLE.filter((p) => {
      if (state.swiped.has(p.id) || isMatched(p.id)) return false;
      if (state.filters.cats.size) {
        const cats = new Set(p.goals.map((g) => g.cat)); cats.add(p.primary);
        let ok = false; state.filters.cats.forEach((c) => { if (cats.has(c)) ok = true; }); if (!ok) return false;
      }
      if (p.distance > state.filters.radius) return false;
      if (p.rating < state.filters.minRating) return false;
      return true;
    });
    const s = state.filters.sort;
    arr.sort((a, b) => s === 'distance' ? a.distance - b.distance : s === 'rating' ? b.rating - a.rating : matchScore(b) - matchScore(a));
    return arr;
  }
  const likesYou = () => LIKES_YOU.filter((id) => !isMatched(id) && !state.swiped.has(id));
  const unreadTotal = () => state.matches.reduce((n, m) => n + (m.unread || 0), 0) + likesYou().length;

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
    bolt: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M13 2L4 14h6l-1 8 9-12h-6l1-8z"/></svg>',
    slider: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 6h11M19 6h1M4 12h5M13 12h7M4 18h9M17 18h3"/><circle cx="17" cy="6" r="2" fill="currentColor"/><circle cx="11" cy="12" r="2" fill="currentColor"/><circle cx="15" cy="18" r="2" fill="currentColor"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l4 4L19 7"/></svg>',
    bell: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
    verified: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 1l2.6 1.9 3.2-.2 1 3 2.6 1.9-1 3 1 3-2.6 1.9-1 3-3.2-.2L12 23l-2.6-1.9-3.2.2-1-3L2.6 16.6l1-3-1-3 2.6-1.9 1-3 3.2.2z"/><path d="M10.6 14.6l-2.2-2.2-1.2 1.2 3.4 3.4 6-6-1.2-1.2z" fill="#fff"/></svg>',
  };

  /* ===================================================================
     RENDER ROOT
     =================================================================== */
  function render() {
    const screens = { discover: renderDiscover, matches: renderMatches, chat: renderChat, progress: renderProgress, profile: renderProfile };
    app.innerHTML = (screens[state.screen] || renderDiscover)();
    renderNav();
    afterMount();
  }
  function renderNav() {
    const tabs = [['discover', 'Discover', I.discover], ['matches', 'Partners', I.heart], ['progress', 'Progress', I.chart], ['profile', 'Profile', I.user]];
    const u = unreadTotal();
    navEl.innerHTML = tabs.map(([id, label, icon]) => `
      <button class="tab ${state.screen === id ? 'active' : ''}" data-tab="${id}">
        ${icon}<span class="tab-label">${label}</span>
        ${id === 'matches' && u ? `<span class="badge">${u}</span>` : ''}
      </button>`).join('');
  }

  function bellHTML() {
    return `<button class="icon-btn bell" data-act="activity" aria-label="Activity">${I.bell}${state.activitySeen ? '' : '<span class="bell-dot"></span>'}</button>`;
  }

  /* ===================================================================
     DISCOVER
     =================================================================== */
  function renderDiscover() {
    const t = tone();
    const myChips = [...state.myCats].slice(0, 4).map((c) => CATEGORIES[c] ? CATEGORIES[c].emoji : '').join(' ');
    const head = `
      <div class="topbar">
        <div>
          <h1>${t.discoverTitle}</h1>
          <div class="sub">${t.discoverSub}</div>
        </div>
        <div class="topbar-actions">
          ${bellHTML()}
          <button class="icon-btn" data-act="filters" aria-label="Filters">${I.slider}</button>
        </div>
      </div>`;

    const d = deck();
    if (!d.length) {
      return `<div class="screen discover"><div class="col">${head}
        <div class="empty">
          <div class="emoji">🌅</div>
          <h3>${esc(t.emptyDeck)}</h3>
          <p>${esc(t.emptySub)}</p>
          <button class="btn" data-act="open-filters" style="margin-top:8px">Adjust filters</button>
        </div></div></div>`;
    }
    if (state.discover === 'list') return `<div class="screen discover"><div class="col col-wide">${head}${renderPeopleList(d)}</div></div>`;

    const stack = d.slice(0, 2).map((p, depth) => cardHTML(p, depth)).reverse().join('');
    return `
      <div class="screen discover"><div class="col">
        ${head}
        <div class="deck-area"><div class="deck"><div class="deck-stage" id="stage">${stack}</div></div></div>
        <div class="actions">
          <button class="act act-md act-undo" data-act="undo" aria-label="Undo">${I.undo}</button>
          <button class="act act-lg act-pass" data-act="pass" aria-label="${t.pass}">${I.close}</button>
          <button class="act act-md act-super" data-act="super" aria-label="${t.superLike}">${I.star}</button>
          <button class="act act-lg act-like" data-act="like" aria-label="${t.like}">${I.heart}</button>
        </div>
        <div class="deck-hint">Tap a card for details · drag or use ← → ↑ keys · ${d.length} nearby</div>
      </div></div>`;
  }

  function cardHTML(p, depth) {
    const cat = CATEGORIES[p.primary];
    const sc = matchScore(p);
    const style = depth === 0 ? 'z-index:2' : 'transform:translateY(-30px) scale(.94);filter:brightness(.96);z-index:1;pointer-events:none';
    return `
      <article class="swipe-card" data-id="${p.id}" data-depth="${depth}" style="${style}">
        <div class="portrait" style="background:${grad(p.grad)}"><span class="mono">${mono(p.name)}</span></div>
        <span class="goal-emoji">${cat.emoji}</span>
        <div class="stamp like">${tone().like}</div>
        <div class="stamp nope">${tone().pass}</div>
        <div class="stamp super">${tone().superLike}</div>
        <div class="card-top">
          <div class="ct-left">
            <span class="dist-chip">${I.pin}${p.distance} km · ${esc(p.neighborhood)}</span>
            <span class="active-chip ${p.active === 'now' ? 'live' : ''}"><i></i>${esc(activeText(p.active))}</span>
          </div>
          <span class="rate-chip"><span class="star">★</span>${p.rating.toFixed(1)}</span>
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
          <div class="pn">${esc(p.name)}, ${p.age} ${p.verified ? `<i class="vf sm">${I.verified}</i>` : ''}<span class="r"><span class="star">★</span>${p.rating.toFixed(1)}</span></div>
          <div class="pg">${esc(p.headline)}</div>
          <div class="pd"><span class="mscore">${sc}% match</span> · 📍 ${p.distance} km · ${esc(activeText(p.active))}</div>
        </div>
        <div class="person-cta"><button class="mini-like" data-act="like-id" data-id="${p.id}" aria-label="${tone().like}">${I.heart}</button></div>
      </div>`;
    }).join('')}</div></div>`;
  }

  /* ---------- swipe mechanics ---------- */
  function afterMountDiscover() {
    const top = $('.swipe-card[data-depth="0"]');
    if (!top) return;
    let sx = 0, sy = 0, dx = 0, dy = 0, dragging = false, t0 = 0, moved = false;
    const onDown = (e) => {
      dragging = true; moved = false; t0 = Date.now(); top.classList.add('dragging');
      const pt = e.touches ? e.touches[0] : e; sx = pt.clientX; sy = pt.clientY;
      window.addEventListener('pointermove', onMove); window.addEventListener('pointerup', onUp);
    };
    const onMove = (e) => {
      if (!dragging) return; const pt = e.touches ? e.touches[0] : e;
      dx = pt.clientX - sx; dy = pt.clientY - sy;
      if (Math.abs(dx) + Math.abs(dy) > 6) moved = true;
      top.style.transform = `translate(${dx}px, ${dy}px) rotate(${dx / 18}deg)`;
      top.querySelector('.stamp.like').style.opacity = Math.max(0, Math.min(1, dx / 90));
      top.querySelector('.stamp.nope').style.opacity = Math.max(0, Math.min(1, -dx / 90));
      top.querySelector('.stamp.super').style.opacity = Math.max(0, Math.min(1, -dy / 110)) * (Math.abs(dx) < 60 ? 1 : 0);
    };
    const onUp = () => {
      dragging = false; top.classList.remove('dragging');
      window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp);
      const id = top.dataset.id;
      if (!moved && Date.now() - t0 < 350) { reset(); return openProfileSheet(id); }
      if (dy < -130 && Math.abs(dx) < 90) return fling(top, 'super', id);
      if (dx > 110) return fling(top, 'like', id);
      if (dx < -110) return fling(top, 'pass', id);
      reset();
    };
    function reset() {
      top.style.transform = ''; dx = dy = 0;
      ['.stamp.like', '.stamp.nope', '.stamp.super'].forEach((s) => { const el = top.querySelector(s); if (el) el.style.opacity = 0; });
    }
    top.addEventListener('pointerdown', onDown);
  }
  function fling(cardEl, action, id) {
    const dir = action === 'like' ? 1 : action === 'pass' ? -1 : 0;
    cardEl.style.transition = 'transform .4s var(--ease), opacity .4s';
    cardEl.style.transform = `translate(${dir * 600}px, ${action === 'super' ? -800 : -60}px) rotate(${dir * 30}deg)`;
    cardEl.style.opacity = '0';
    setTimeout(() => commitSwipe(action, id), 230);
  }
  function triggerSwipe(action) { const top = $('.swipe-card[data-depth="0"]'); if (top) fling(top, action, top.dataset.id); }
  function commitSwipe(action, id) {
    state.swiped.add(id);
    state.history.push({ id, action, matched: action !== 'pass' });
    if (action === 'like' || action === 'super') addMatch(id, action === 'super');
    else persist();
    if (state.screen === 'discover') render();
  }
  function addMatch(id, isSuper) {
    if (isMatched(id)) return;
    const p = personById(id);
    state.matches.unshift({ id, sharedGoal: CATEGORIES[p.primary].short, daysPaired: 0, lastActivity: 'New partner — say hi!', unread: 0, isNew: true, messages: [] });
    persist(); showMatchModal(p, isSuper);
  }
  function undo() {
    const last = state.history.pop(); if (!last) return toast('Nothing to undo');
    state.swiped.delete(last.id);
    if (last.matched) { const i = state.matches.findIndex((m) => m.id === last.id); if (i > -1) state.matches.splice(i, 1); }
    persist(); render();
  }

  /* ===================================================================
     MATCH MODAL + confetti
     =================================================================== */
  function showMatchModal(p, isSuper) {
    const t = tone(); const sc = matchScore(p);
    overlay.innerHTML = `
      <div class="modal-scrim" style="background:${isSuper ? 'rgba(20,30,60,.62)' : 'rgba(20,8,12,.6)'}">
        <div class="confetti" id="confetti"></div>
        <div class="match-modal">
          <div class="mm-title">${esc(t.matchTitle)}</div>
          <div class="mm-avs">
            <div class="mm-av" style="background:${grad(ME.grad)}">${mono(state.name)}</div>
            <div class="mm-link">${isSuper ? '⭐' : '🤝'}</div>
            <div class="mm-av" style="background:${grad(p.grad)}">${mono(p.name)}</div>
          </div>
          <div class="mm-score">${sc}% goal match</div>
          <div class="mm-sub">${esc(t.matchSub(p.name))}</div>
          <button class="btn btn-block" data-act="go-chat" data-id="${p.id}">${t.chatHint}</button>
          <button class="btn btn-ghost btn-block" data-act="close-modal">Keep swiping</button>
        </div>
      </div>`;
    confetti();
  }
  function confetti() {
    const box = $('#confetti'); if (!box) return;
    const colors = ['#FF6B5C', '#FFB23E', '#FF8A5B', '#2BD9A6', '#F6C453', '#FF5A7A'];
    let html = '';
    for (let i = 0; i < 80; i++) html += `<i style="left:${Math.random() * 100}%;background:${colors[i % colors.length]};animation-duration:${1.6 + Math.random() * 1.8}s;animation-delay:${Math.random() * 0.5}s;transform:rotate(${Math.random() * 360}deg)"></i>`;
    box.innerHTML = html;
  }

  /* ===================================================================
     MATCHES
     =================================================================== */
  function renderMatches() {
    const ly = likesYou();
    const newOnes = state.matches.filter((m) => m.isNew);
    return `
      <div class="screen"><div class="col col-wide">
        <div class="topbar"><div><h1>Partners</h1><div class="sub">Your accountability circle</div></div>
          <div class="topbar-actions">${bellHTML()}</div>
        </div>
        <div class="scroll">
          ${ly.length ? `<div class="section-label">💛 ${ly.length} ${ly.length === 1 ? 'person likes' : 'people like'} your goals</div>
            <div class="likes-row">${ly.map((id) => { const p = personById(id); return `
              <div class="like-card">
                <div class="like-av" style="background:${grad(p.grad)}" data-card="${id}">${mono(p.name)}<span class="lc-emoji">${CATEGORIES[p.primary].emoji}</span></div>
                <div class="lc-name">${esc(p.name)}</div>
                <div class="lc-score">${matchScore(p)}%</div>
                <button class="btn lc-btn" data-act="connect-like" data-id="${id}">Pair up</button>
              </div>`; }).join('')}</div>` : ''}
          ${newOnes.length ? `<div class="section-label">New tandems</div>
            <div class="new-row">${newOnes.map((m) => { const p = personById(m.id); return `<div class="new-card" data-open="${m.id}">
              <div class="new-av" style="background:${grad(p.grad)}">${mono(p.name)}<span class="ndot"></span></div>
              <div class="nm">${esc(p.name)}</div></div>`; }).join('')}</div>` : ''}
          <div class="section-label">Your accountability partners</div>
          ${state.matches.length ? state.matches.map((m) => {
            const p = personById(m.id); const cat = CATEGORIES[p.primary];
            return `<div class="match-row" data-open="${m.id}">
              <div class="chat-av lg" style="background:${grad(p.grad)}">${mono(p.name)}</div>
              <div class="match-meta">
                <div class="mn">${esc(p.name)} <span class="goalchip" style="background:${cat.color}">${cat.emoji} ${esc(m.sharedGoal)}</span></div>
                <div class="ml">${esc(m.lastActivity)}</div>
                <div class="ml sub2">${m.daysPaired ? `🔗 paired ${m.daysPaired} days` : '✨ just matched'} · ★ ${p.rating.toFixed(1)} · ${matchScore(p)}% match</div>
              </div>
              <div class="match-right">${m.unread ? `<span class="unread">${m.unread}</span>` : `<span class="t">›</span>`}</div>
            </div>`;
          }).join('') : `<div class="empty-mini">No partners yet — head to Discover and pair up! 🤝</div>`}
        </div>
      </div></div>`;
  }

  /* ===================================================================
     CHAT
     =================================================================== */
  function renderChat() {
    const m = state.matches.find((x) => x.id === state.activeMatch);
    if (!m) { state.screen = 'matches'; return renderMatches(); }
    const p = personById(m.id); const cat = CATEGORIES[p.primary];
    const chips = ['✅ Did my workout', '🙌 Crushed it today', '😅 Need a nudge', '📅 Same time tomorrow?'];
    return `
      <div class="screen chat"><div class="col col-chat">
        <div class="chat-head">
          <button class="back" data-act="back-matches" aria-label="Back">‹</button>
          <div class="chat-av" style="background:${grad(p.grad)}" data-card="${p.id}">${mono(p.name)}</div>
          <div class="ci"><div class="cn">${esc(p.name)} ${p.verified ? `<i class="vf sm">${I.verified}</i>` : ''}</div><div class="cs">● ${esc(activeText(p.active))}</div></div>
          <button class="icon-btn" data-act="rate" data-id="${p.id}" aria-label="Rate partner" style="box-shadow:none;background:var(--surface-2)">${I.star}</button>
        </div>
        <div class="goal-banner">
          <span class="gb-emoji">${cat.emoji}</span>
          <div class="gb-text"><b>Shared goal · ${esc(m.sharedGoal)}</b><small>${esc(p.shared)}</small></div>
          <span class="streak-badge">🔥 ${p.streak}d</span>
        </div>
        <div class="msgs" id="msgs">${msgsHTML(m)}</div>
        <div class="quick-chips">${chips.map((c) => `<button class="qchip" data-chip="${esc(c)}">${c}</button>`).join('')}</div>
        <div class="composer">
          <input id="msgInput" placeholder="Message ${esc(p.name)}…" autocomplete="off" />
          <button class="send-btn" data-act="send" aria-label="Send">${I.send}</button>
        </div>
      </div></div>`;
  }
  const bubbleHTML = (b) => `<div class="bubble ${b.from}">${esc(b.text)}<span class="bt">${esc(b.t || '')}</span></div>`;
  function msgsHTML(m) {
    if (!m.messages.length && !m._typing) return `<div class="chat-empty">You matched! Break the ice 👋</div>`;
    return m.messages.map(bubbleHTML).join('') + (m._typing ? `<div class="bubble them typing"><span></span><span></span><span></span></div>` : '');
  }
  function sendMessage(text) {
    text = (text || '').trim(); if (!text) return;
    const m = state.matches.find((x) => x.id === state.activeMatch); if (!m) return;
    const time = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    m.messages.push({ from: 'me', text, t: time }); m.isNew = false; m.lastActivity = 'You: ' + text; persist();
    m._typing = true; chatUpdate();
    const replies = ['Love that 🙌', "Let's gooo 🔥", 'Proud of you! Same tomorrow?', 'On it too — accountability works 💪', 'Logged it. Streak alive ✅'];
    setTimeout(() => {
      m._typing = false;
      const reply = replies[Math.floor(Math.random() * replies.length)];
      m.messages.push({ from: 'them', text: reply, t: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) });
      m.lastActivity = personById(m.id).name + ': ' + reply; persist();
      if (state.screen === 'chat' && state.activeMatch === m.id) chatUpdate();
    }, 1300);
  }
  function chatUpdate() {
    const box = $('#msgs'); if (!box) return render();
    const m = state.matches.find((x) => x.id === state.activeMatch);
    box.innerHTML = msgsHTML(m); box.scrollTop = box.scrollHeight;
  }

  /* ===================================================================
     PROGRESS
     =================================================================== */
  function renderProgress() {
    const done = state.goals.filter((g) => g.doneToday).length;
    const weekPct = Math.round(state.goals.reduce((a, g) => a + g.progress, 0) / Math.max(1, state.goals.length) * 100);
    const cheerer = personById('maya');
    return `
      <div class="screen"><div class="col col-wide">
        <div class="topbar"><div><h1>Your progress</h1><div class="sub">Consistency beats intensity</div></div>
          <div class="topbar-actions">${bellHTML()}</div>
        </div>
        <div class="scroll">
          <div class="streak-hero">
            <div><div class="big" data-count="${state.streak}">${state.streak}</div><div class="sl">DAY STREAK</div><div class="sd">${done ? `✓ ${done} check-in${done > 1 ? 's' : ''} today` : 'Check in today to keep it alive'}</div></div>
            <div class="flames">🔥</div>
          </div>
          <div class="mini-stats">
            <div class="ms"><b data-count="${state.goals.length}">${state.goals.length}</b><small>active goals</small></div>
            <div class="ms"><b data-count="${weekPct}" data-suffix="%">${weekPct}%</b><small>avg progress</small></div>
            <div class="ms"><b data-count="${state.matches.length}">${state.matches.length}</b><small>partners</small></div>
          </div>
          <div class="heat">${heatCells()}</div>
          <div class="partner-cheer"><div class="pc-av" style="background:${grad(cheerer.grad)}">${mono(cheerer.name)}</div>
            <div><b>${cheerer.name} cheered your run 🎉</b><div class="pc-sub">“Day 13, don’t break it!”</div></div></div>
          <div class="section-label" style="display:flex;justify-content:space-between;align-items:center">Goals you're tracking
            <button class="link-btn" data-act="add-goal">${I.plus} Add goal</button></div>
          ${state.goals.map((g, i) => { const cat = CATEGORIES[g.cat]; return `<div class="goal-card">
            <div class="gc-top">
              <div class="gc-emoji" style="background:${cat.color}">${cat.emoji}</div>
              <div class="gc-title"><b>${esc(g.text)}</b><small>${esc(g.stage)}</small></div>
              <div class="gc-pct">${Math.round(g.progress * 100)}%</div>
            </div>
            <div class="bar"><i data-fill="${g.progress}"></i></div>
            <div class="gc-foot"><small>${g.checkins}/${g.target} check-ins · ${cat.label}</small>
              <button class="checkin-btn ${g.doneToday ? 'done' : ''}" data-checkin="${i}">${g.doneToday ? '✓ Checked in' : 'Check in'}</button></div>
          </div>`; }).join('')}
          <div style="height:8px"></div>
        </div>
      </div></div>`;
  }
  function heatCells() {
    let s = '';
    for (let i = 0; i < 42; i++) { const r = ((i * 1103515245 + 12345) % 100) / 100; const lvl = r > 0.78 ? 'l3' : r > 0.55 ? 'l2' : r > 0.32 ? 'l1' : ''; s += `<i class="${i > 38 ? 'l3' : lvl}"></i>`; }
    return s;
  }
  function doCheckin(i) {
    const g = state.goals[i]; if (!g) return;
    g.doneToday = !g.doneToday;
    if (g.doneToday) { g.progress = Math.min(1, g.progress + 0.05); g.checkins++; state.streak++; toast('Checked in 🔥 streak ' + state.streak); }
    else { g.progress = Math.max(0, g.progress - 0.05); g.checkins = Math.max(0, g.checkins - 1); state.streak = Math.max(0, state.streak - 1); }
    persist(); render();
  }

  /* ===================================================================
     PROFILE
     =================================================================== */
  function renderProfile() {
    const reviews = REVIEWS.you || [];
    const catChips = [...state.myCats].map((c) => CATEGORIES[c]).filter(Boolean);
    return `
      <div class="screen"><div class="col col-wide">
        <div class="topbar"><h1>Profile</h1><div class="topbar-actions"><button class="icon-btn" data-act="lab" aria-label="Design Lab">${I.bolt}</button></div></div>
        <div class="scroll">
          <div class="profile-hero">
            <div class="big-av" style="background:${grad(ME.grad)}">${mono(state.name)}<div class="edit" data-act="edit-name">✏️</div></div>
            <h2>${esc(state.name === 'You' ? 'You' : state.name)}, ${ME.age}</h2>
            <div class="loc">${I.pin} ${esc(ME.neighborhood)} · within ${state.filters.radius} km</div>
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
            <div class="stat"><b data-count="${state.streak}">${state.streak}</b><small>day streak</small></div>
            <div class="stat"><b data-count="${ME.ratingCount}">${ME.ratingCount}</b><small>partners</small></div>
            <div class="stat"><b data-count="${state.goals.length}">${state.goals.length}</b><small>active goals</small></div>
          </div>
          <div class="section-label" style="display:flex;justify-content:space-between;align-items:center">Your goals
            <button class="link-btn" data-act="add-goal">${I.plus} Add goal</button></div>
          ${state.goals.map((g) => { const c = CATEGORIES[g.cat]; return `<div class="profile-goal">
            <div class="pgc" style="background:${c.color}">${c.emoji}</div>
            <div class="pgt"><b>${esc(g.text)}</b><small>${esc(g.stage)} · ${c.label}</small></div>
            <div class="pg-pct">${Math.round(g.progress * 100)}%</div></div>`; }).join('')}
          <div class="section-label">Reviews from partners</div>
          ${reviews.map((r) => `<div class="review">
            <div class="rv-top"><div class="rv-av" style="background:${grad((r.by.charCodeAt(0)) % 10)}">${mono(r.by)}</div>
              <div class="rv-name">${esc(r.by)}</div><div class="rv-stars">${starsStr(r.stars)}</div></div>
            <div class="rv-text">“${esc(r.text)}”</div>
            <div class="rv-tags">${r.tags.map((x) => `<span>${esc(x)}</span>`).join('')}</div></div>`).join('')}
          <button class="btn btn-block" data-act="rate" data-id="maya" style="margin-top:6px">Rate a past partner</button>
          <button class="btn btn-ghost btn-block" data-act="lab" style="margin-top:10px">Open Design Lab</button>
          <div style="height:14px"></div>
        </div>
      </div></div>`;
  }

  /* ===================================================================
     SHEETS
     =================================================================== */
  function sheet(inner) { overlay.innerHTML = `<div class="sheet-scrim"><div class="sheet" data-stop>${inner}</div></div>`; }

  function openProfileSheet(id) {
    const p = personById(id); if (!p) return;
    const cat = CATEGORIES[p.primary]; const sc = matchScore(p); const reviews = REVIEWS[id] || [];
    sheet(`
      <div class="sheet-grab"></div>
      <div class="ps-hero" style="background:${grad(p.grad)}">
        <div class="ps-mono">${mono(p.name)}</div>
        <span class="ps-emoji">${cat.emoji}</span>
        <div class="ps-score"><b>${sc}%</b><small>match</small></div>
      </div>
      <div class="ps-body">
        <div class="ps-name">${esc(p.name)}, ${p.age} ${p.verified ? `<i class="vf">${I.verified}</i>` : ''}</div>
        <div class="ps-meta">${I.pin}${p.distance} km · ${esc(p.neighborhood)} · <span class="star">★</span> ${p.rating.toFixed(1)} (${p.ratingCount}) · ${esc(activeText(p.active))}</div>
        <div class="ps-headline">${esc(p.headline)}</div>
        <p class="ps-bio">${esc(p.bio)}</p>
        <div class="tagrow dark">${p.tags.map((x) => `<span class="tag">${esc(x)}</span>`).join('')}</div>
        <div class="ps-section">Goals</div>
        ${p.goals.map((g) => { const c = CATEGORIES[g.cat]; return `<div class="ps-goal">
          <div class="pgc" style="background:${c.color}">${c.emoji}</div>
          <div class="pg-info"><b>${esc(g.text)}</b><small>${esc(g.stage)}</small>
            <div class="bar sm"><i style="width:${Math.round((g.pct || 0) * 100)}%"></i></div></div></div>`; }).join('')}
        ${reviews.length ? `<div class="ps-section">Partner reviews</div>${reviews.map((r) => `<div class="review flat">
          <div class="rv-top"><div class="rv-av" style="background:${grad(r.by.charCodeAt(0) % 10)}">${mono(r.by)}</div><div class="rv-name">${esc(r.by)}</div><div class="rv-stars">${starsStr(r.stars)}</div></div>
          <div class="rv-text">“${esc(r.text)}”</div></div>`).join('')}` : ''}
      </div>
      <div class="ps-actions">
        <button class="btn btn-ghost" data-act="sheet-pass" data-id="${id}">${tone().pass}</button>
        <button class="btn" data-act="sheet-connect" data-id="${id}">${tone().like}</button>
      </div>`);
  }

  function openRateSheet(id) {
    const p = personById(id) || { name: 'your partner' };
    const tags = ['Reliable', 'Motivating', 'Honest', 'Responsive', 'Knowledgeable', 'Encouraging'];
    let stars = 0; const chosen = new Set();
    sheet(`
      <div class="sheet-grab"></div>
      <h3>Rate ${esc(p.name)}</h3>
      <div class="sheet-sub">Public ratings help everyone find dependable partners.</div>
      <div class="star-pick" id="starPick">${[1, 2, 3, 4, 5].map((n) => `<button data-star="${n}">★</button>`).join('')}</div>
      <div class="tag-pick" id="tagPick">${tags.map((t) => `<button data-tag="${t}">${t}</button>`).join('')}</div>
      <button class="btn btn-block" id="rateSubmit">Submit rating</button>`);
    $('#starPick').addEventListener('click', (e) => { const b = e.target.closest('[data-star]'); if (!b) return; stars = +b.dataset.star; [...$('#starPick').children].forEach((c, i) => c.classList.toggle('on', i < stars)); });
    $('#tagPick').addEventListener('click', (e) => { const b = e.target.closest('[data-tag]'); if (!b) return; b.classList.toggle('on'); chosen.has(b.dataset.tag) ? chosen.delete(b.dataset.tag) : chosen.add(b.dataset.tag); });
    $('#rateSubmit').addEventListener('click', () => { if (!stars) return toast('Pick a star rating first ⭐'); closeOverlay(); toast(`Thanks! You rated ${p.name} ${stars}★`); });
  }

  function openFilters() {
    const cats = Object.entries(CATEGORIES);
    const sorts = [['match', '🎯 Best match'], ['distance', '📍 Closest'], ['rating', '⭐ Top rated']];
    sheet(`
      <div class="sheet-grab"></div>
      <h3>Find your match</h3>
      <div class="sheet-sub">Partners near you, working on what you are.</div>
      <div class="filter-group"><div class="fg-label">Sort by</div>
        <div class="seg" id="sortSeg">${sorts.map(([k, l]) => `<button data-sort="${k}" class="${state.filters.sort === k ? 'on' : ''}">${l}</button>`).join('')}</div></div>
      <div class="filter-group"><div class="fg-label">Goal categories</div>
        <div class="cat-pick" id="catPick">${cats.map(([k, c]) => `<button data-cat="${k}" class="${state.filters.cats.has(k) ? 'on' : ''}">${c.emoji} ${c.short}</button>`).join('')}</div></div>
      <div class="filter-group"><div class="fg-label">Max distance</div>
        <div class="range-row"><input type="range" id="radius" min="1" max="25" value="${state.filters.radius}"><b id="radiusVal">${state.filters.radius} km</b></div></div>
      <div class="filter-group"><div class="fg-label">Minimum rating</div>
        <div class="range-row"><input type="range" id="minR" min="0" max="5" step="0.5" value="${state.filters.minRating}"><b id="minRVal">${state.filters.minRating ? state.filters.minRating + '★' : 'Any'}</b></div></div>
      <button class="btn btn-block" id="filterApply">Show matches</button>`);
    let sort = state.filters.sort; const sel = new Set(state.filters.cats); let r = state.filters.radius, mr = state.filters.minRating;
    $('#sortSeg').addEventListener('click', (e) => { const b = e.target.closest('[data-sort]'); if (!b) return; sort = b.dataset.sort; [...$('#sortSeg').children].forEach((c) => c.classList.toggle('on', c.dataset.sort === sort)); });
    $('#catPick').addEventListener('click', (e) => { const b = e.target.closest('[data-cat]'); if (!b) return; const k = b.dataset.cat; b.classList.toggle('on'); sel.has(k) ? sel.delete(k) : sel.add(k); });
    $('#radius').addEventListener('input', (e) => { r = +e.target.value; $('#radiusVal').textContent = r + ' km'; });
    $('#minR').addEventListener('input', (e) => { mr = +e.target.value; $('#minRVal').textContent = mr ? mr + '★' : 'Any'; });
    $('#filterApply').addEventListener('click', () => { state.filters = { cats: sel, radius: r, minRating: mr, sort }; persist(); closeOverlay(); render(); toast(deck().length + ' people match your filters'); });
  }

  function openAddGoal() {
    const cats = Object.entries(CATEGORIES);
    let pick = null;
    sheet(`
      <div class="sheet-grab"></div>
      <h3>Add a goal</h3>
      <div class="sheet-sub">It’ll show on your profile and improve your matches.</div>
      <div class="filter-group"><div class="fg-label">Category</div>
        <div class="cat-pick" id="goalCat">${cats.map(([k, c]) => `<button data-cat="${k}">${c.emoji} ${c.short}</button>`).join('')}</div></div>
      <div class="filter-group"><div class="fg-label">What's the goal?</div>
        <input class="text-in" id="goalText" placeholder="e.g. Run a 10K under 60 min" maxlength="60" /></div>
      <button class="btn btn-block" id="goalSubmit">Add goal</button>`);
    $('#goalCat').addEventListener('click', (e) => { const b = e.target.closest('[data-cat]'); if (!b) return; pick = b.dataset.cat; [...$('#goalCat').children].forEach((c) => c.classList.toggle('on', c.dataset.cat === pick)); });
    $('#goalSubmit').addEventListener('click', () => {
      const text = $('#goalText').value.trim();
      if (!pick) return toast('Pick a category');
      if (!text) return toast('Describe your goal');
      state.goals.push({ cat: pick, text, stage: 'Just started', progress: 0.02, checkins: 0, target: 30, doneToday: false });
      state.myCats.add(pick); persist(); closeOverlay(); render(); toast('Goal added 🎯');
    });
  }

  function openActivity() {
    state.activitySeen = true;
    sheet(`
      <div class="sheet-grab"></div>
      <h3>Activity</h3>
      <div class="sheet-sub">What's happening with your goals & partners.</div>
      <div class="act-list">${ACTIVITY.map((a) => {
        const p = a.who ? personById(a.who) : null;
        return `<div class="act-item">
          <div class="act-ic" ${p ? `style="background:${grad(p.grad)}"` : 'style="background:var(--surface-2)"'}>${a.icon}</div>
          <div class="act-tx"><div>${esc(a.text)}</div><small>${esc(a.time)} ago</small></div>
          ${a.kind === 'like' && p && !isMatched(a.who) ? `<button class="btn sm-btn" data-act="connect-like" data-id="${a.who}">Pair</button>` : ''}
        </div>`;
      }).join('')}</div>`);
    renderNav();
  }

  /* ===================================================================
     ONBOARDING (personalized)
     =================================================================== */
  function startOnboarding() {
    const cats = Object.entries(CATEGORIES);
    const sel = new Set([...state.myCats]);
    overlay.innerHTML = `
      <div class="onb-scrim"><div class="onb">
        <div class="onb-logo">T</div>
        <h1>Tandem</h1>
        <div class="tagline">Goals are better with company. Match with people near you chasing the same thing.</div>
        <div class="onb-field"><label>What should partners call you?</label>
          <input class="onb-input" id="onbName" placeholder="Your name" value="${state.name === 'You' ? '' : esc(state.name)}" maxlength="20" /></div>
        <div class="onb-field"><label>Pick your goals — we’ll match you on these</label>
          <div class="onb-cats" id="onbCats">${cats.map(([k, c]) => `<button data-cat="${k}" class="${sel.has(k) ? 'on' : ''}">${c.emoji} ${c.short}</button>`).join('')}</div></div>
        <button class="btn btn-block" id="onbStart">Find my goal partner</button>
        <button class="skip" id="onbSkip">Allow location · Bandra West 📍</button>
      </div></div>`;
    $('#onbCats').addEventListener('click', (e) => { const b = e.target.closest('[data-cat]'); if (!b) return; const k = b.dataset.cat; b.classList.toggle('on'); sel.has(k) ? sel.delete(k) : sel.add(k); });
    const finish = () => {
      const nm = $('#onbName').value.trim(); if (nm) state.name = nm;
      if (sel.size) sel.forEach((c) => state.myCats.add(c));
      ME.goals.forEach((g) => state.myCats.add(g.cat));
      state.onboarded = true; persist(); closeOverlay(); render();
    };
    $('#onbStart').addEventListener('click', finish);
    $('#onbSkip').addEventListener('click', finish);
  }

  /* ===================================================================
     DESIGN LAB
     =================================================================== */
  const LAB = {
    theme: { title: 'Visual style', desc: 'Different palettes & moods.', opts: [
      { v: 'sunset', b: 'Sunset', s: 'Coral → amber, warm cream', sw: 'linear-gradient(135deg,#FF6B5C,#FFB23E)' },
      { v: 'peach', b: 'Peachy', s: 'Soft, gentle, pastel', sw: 'linear-gradient(135deg,#FBA68E,#F7C6A0)' },
      { v: 'ember', b: 'Ember (dark)', s: 'Bold, high-contrast night', sw: 'linear-gradient(135deg,#2A1B20,#FF7A5C)' }] },
    tone: { title: 'Copy & tone', desc: 'Same app, different voice.', opts: [
      { v: 'playful', b: 'Playful & social', s: '“Find your goal twin 🔥”', sw: 'linear-gradient(135deg,#FF6B5C,#FFB23E)' },
      { v: 'warm', b: 'Warm & supportive', s: '“Someone to grow with 💛”', sw: 'linear-gradient(135deg,#FBA68E,#F6C453)' },
      { v: 'bold', b: 'Bold & punchy', s: '“Lock in a partner. Now.”', sw: 'linear-gradient(135deg,#2C1A22,#FF6B5C)' }] },
    discover: { title: 'Discover & match UX', desc: 'How you browse people.', opts: [
      { v: 'stack', b: 'Swipe card stack', s: 'Tinder-style drag to match', sw: 'linear-gradient(135deg,#FF8A5B,#FFB23E)' },
      { v: 'list', b: 'Browse list', s: 'Scrollable feed, tap to connect', sw: 'linear-gradient(135deg,#E07A87,#FFB23E)' }] },
  };
  function renderLab() {
    $('#labBody').innerHTML = ['theme', 'tone', 'discover'].map((key) => { const block = LAB[key]; return `
      <div class="lab-block"><div class="lb-title">${block.title}</div><div class="lb-desc">${block.desc}</div>
        <div class="opt-row">${block.opts.map((o) => `<button class="opt ${state[key] === o.v ? 'on' : ''}" data-lab="${key}" data-val="${o.v}">
          <span class="swatch" style="background:${o.sw}"></span>
          <span class="opt-text"><b>${o.b}</b><small>${o.s}</small></span>
          <span class="opt-check">${I.check}</span></button>`).join('')}</div></div>`; }).join('')
      + `<div class="lab-block"><button class="btn btn-ghost btn-block" data-act="reset-demo">↺ Reset demo data</button></div>`;
  }
  function setLab(key, val) { state[key] = val; root.dataset[key] = val; persist(); renderLab(); render(); }
  function openLab() { renderLab(); $('#lab').classList.add('open'); $('#lab').setAttribute('aria-hidden', 'false'); $('#labScrim').classList.add('open'); }
  function closeLab() { $('#lab').classList.remove('open'); $('#lab').setAttribute('aria-hidden', 'true'); $('#labScrim').classList.remove('open'); }
  function resetDemo() {
    try { localStorage.removeItem(SKEY); } catch (e) {}
    state.onboarded = true; state.name = 'You'; state.swiped = new Set();
    state.matches = SEED_MATCHES.map((m) => ({ ...m, messages: m.messages.slice() }));
    state.goals = ME.goals.map((g) => ({ ...g, doneToday: false })); state.streak = ME.streak;
    state.myCats = new Set(ME.goals.map((g) => g.cat)); state.history = [];
    state.filters = { cats: new Set(), radius: 8, minRating: 0, sort: 'match' };
    persist(); closeLab(); render(); toast('Demo reset ↺');
  }

  /* ===================================================================
     OVERLAY / TOAST + count-up
     =================================================================== */
  function closeOverlay() { overlay.innerHTML = ''; }
  let toastT;
  function toast(msg) {
    const old = $('.toast'); if (old) old.remove();
    const el = document.createElement('div'); el.className = 'toast'; el.textContent = msg;
    document.body.appendChild(el); clearTimeout(toastT); toastT = setTimeout(() => el.remove(), 2200);
  }
  function countUp(node) {
    const target = parseFloat(node.dataset.count); const dec = node.dataset.dec ? 1 : 0; const suffix = node.dataset.suffix || '';
    if (isNaN(target)) return; const dur = 850; let start = null;
    node.textContent = '0' + suffix;
    function step(now) {
      if (start === null) start = now; const t = Math.min(1, (now - start) / dur); const v = target * (1 - Math.pow(1 - t, 3));
      node.textContent = (dec ? v.toFixed(1) : Math.round(v)) + suffix; if (t < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  function afterMount() {
    if (state.screen === 'discover' && state.discover === 'stack') afterMountDiscover();
    requestAnimationFrame(() => {
      document.querySelectorAll('.bar > i[data-fill]').forEach((b) => (b.style.width = (b.dataset.fill * 100) + '%'));
      document.querySelectorAll('[data-count]').forEach(countUp);
    });
    if (state.screen === 'chat') { const box = $('#msgs'); if (box) box.scrollTop = box.scrollHeight; }
  }

  /* ===================================================================
     EVENTS
     =================================================================== */
  function go(screen) { state.screen = screen; render(); }
  function markRead(id) { const m = state.matches.find((x) => x.id === id); if (m) m.unread = 0; }

  document.addEventListener('click', (e) => {
    const tab = e.target.closest('[data-tab]'); if (tab) return go(tab.dataset.tab);
    const open = e.target.closest('[data-open]'); if (open) { state.activeMatch = open.dataset.open; markRead(open.dataset.open); persist(); return go('chat'); }
    const chip = e.target.closest('[data-chip]'); if (chip) return sendMessage(chip.dataset.chip);
    const checkin = e.target.closest('[data-checkin]'); if (checkin) return doCheckin(+checkin.dataset.checkin);
    const labOpt = e.target.closest('[data-lab]'); if (labOpt) return setLab(labOpt.dataset.lab, labOpt.dataset.val);
    const a = e.target.closest('[data-act]'); if (a) return handleAct(a.dataset.act, a.dataset.id);
    // data-card last so explicit buttons/actions inside a card take precedence
    const card = e.target.closest('[data-card]'); if (card) return openProfileSheet(card.dataset.card);
  });

  function handleAct(act, id) {
    switch (act) {
      case 'filters': case 'open-filters': return openFilters();
      case 'activity': return openActivity();
      case 'pass': return triggerSwipe('pass');
      case 'like': return triggerSwipe('like');
      case 'super': return triggerSwipe('super');
      case 'undo': return undo();
      case 'like-id': state.swiped.add(id); state.history.push({ id, action: 'like', matched: true }); return addMatch(id, false);
      case 'connect-like': closeOverlay(); return addMatch(id, false);
      case 'sheet-pass': closeOverlay(); state.swiped.add(id); state.history.push({ id, action: 'pass', matched: false }); persist(); return render();
      case 'sheet-connect': closeOverlay(); state.swiped.add(id); state.history.push({ id, action: 'like', matched: true }); return addMatch(id, false);
      case 'go-chat': closeOverlay(); state.activeMatch = id; markRead(id); return go('chat');
      case 'close-modal': return closeOverlay();
      case 'back-matches': return go('matches');
      case 'send': { const inp = $('#msgInput'); const v = inp.value; inp.value = ''; return sendMessage(v); }
      case 'rate': return openRateSheet(id);
      case 'add-goal': return openAddGoal();
      case 'edit-name': return startOnboarding();
      case 'lab': return openLab();
      case 'reset-demo': return resetDemo();
    }
  }

  document.addEventListener('keydown', (e) => {
    if (state.screen === 'chat' && e.key === 'Enter') { const inp = $('#msgInput'); if (inp && document.activeElement === inp) { const v = inp.value; inp.value = ''; sendMessage(v); } return; }
    if (state.screen === 'discover' && state.discover === 'stack' && !overlay.innerHTML) {
      if (e.key === 'ArrowLeft') triggerSwipe('pass');
      if (e.key === 'ArrowRight') triggerSwipe('like');
      if (e.key === 'ArrowUp') triggerSwipe('super');
    }
  });

  $('#labBtn').addEventListener('click', openLab);
  $('#labClose').addEventListener('click', closeLab);
  $('#labScrim').addEventListener('click', closeLab);
  overlay.addEventListener('click', (e) => { if (e.target.classList.contains('sheet-scrim')) closeOverlay(); });

  /* ---------- init ---------- */
  if (!state.onboarded) startOnboarding();
  render();
})();
