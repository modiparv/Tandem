/* =========================================================================
   Tandem — app logic (vanilla JS, no build step, no dependencies)
   ========================================================================= */
(function () {
  'use strict';
  const { CATEGORIES, AVATAR_GRADIENTS, PEOPLE, REVIEWS, ME, SEED_MATCHES, TONE_COPY } = window.TANDEM;

  /* ---------- tiny helpers ---------- */
  const $ = (s, r = document) => r.querySelector(s);
  const root = document.documentElement;
  const app = $('#app');
  const navEl = $('#nav');
  const overlay = $('#overlay');

  const grad = (i) => { const g = AVATAR_GRADIENTS[i % AVATAR_GRADIENTS.length]; return `linear-gradient(135deg, ${g[0]}, ${g[1]})`; };
  const catColor = (c) => CATEGORIES[c].color;
  const mono = (name) => name.trim()[0].toUpperCase();
  const esc = (s) => String(s).replace(/[&<>"]/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));
  const tone = () => TONE_COPY[state.tone];

  /* ---------- state ---------- */
  const state = {
    screen: 'discover',
    onboarded: false,
    swiped: new Set(),
    matches: SEED_MATCHES.map((m) => ({ ...m, messages: m.messages.slice() })),
    activeMatch: null,
    history: [],            // for undo
    filters: { cats: new Set(), radius: 8 },
    progress: ME.goals.map((g) => ({ ...g, done: false })),
    tone: root.dataset.tone || 'playful',
    theme: root.dataset.theme || 'sunset',
    discover: root.dataset.discover || 'stack',
  };

  const personById = (id) => PEOPLE.find((p) => p.id === id);
  function deck() {
    return PEOPLE.filter((p) => {
      if (state.swiped.has(p.id)) return false;
      if (state.filters.cats.size && !state.filters.cats.has(p.primary)) return false;
      if (p.distance > state.filters.radius) return false;
      return true;
    });
  }
  const unreadTotal = () => state.matches.reduce((n, m) => n + (m.unread || 0), 0);

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
  };
  const starsStr = (n) => '★'.repeat(Math.round(n)) + '☆'.repeat(5 - Math.round(n));

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
    if (state.screen === 'chat') { navEl.style.display = 'none'; return; }
    navEl.style.display = '';
    const tabs = [
      ['discover', 'Discover', I.discover],
      ['matches', 'Matches', I.heart],
      ['progress', 'Progress', I.chart],
      ['profile', 'Profile', I.user],
    ];
    const u = unreadTotal();
    navEl.innerHTML = tabs.map(([id, label, icon]) => `
      <button class="tab ${state.screen === id ? 'active' : ''}" data-tab="${id}">
        ${id === 'matches' && u ? `<span class="badge">${u}</span>` : ''}
        ${icon}<span>${label}</span>
      </button>`).join('');
  }

  /* ===================================================================
     DISCOVER
     =================================================================== */
  function renderDiscover() {
    const t = tone();
    const head = `
      <div class="topbar">
        <div class="brandmark">
          <div class="brand-logo">T</div>
          <div>
            <h1 style="font-size:22px">${t.discoverTitle}</h1>
            <div class="sub">${t.discoverSub}</div>
          </div>
        </div>
        <button class="icon-btn" data-act="filters" aria-label="Filters">${I.slider}</button>
      </div>`;

    const d = deck();
    if (!d.length) {
      return `<div class="screen discover">${head}
        <div class="empty">
          <div class="emoji">🌅</div>
          <h3>${esc(t.emptyDeck)}</h3>
          <p>${esc(t.emptySub)}</p>
          <button class="btn" data-act="reset-deck" style="margin-top:8px">Reset the deck</button>
        </div></div>`;
    }

    if (state.discover === 'list') return `<div class="screen discover">${head}${renderPeopleList(d)}</div>`;

    const stack = d.slice(0, 3).map((p, depth) => cardHTML(p, depth)).reverse().join('');
    return `
      <div class="screen discover">
        ${head}
        <div class="deck"><div class="deck-stage" id="stage">${stack}</div></div>
        <div class="actions">
          <button class="act act-md act-undo" data-act="undo" aria-label="Undo">${I.undo}</button>
          <button class="act act-lg act-pass" data-act="pass" aria-label="${t.pass}">${I.close}</button>
          <button class="act act-md act-super" data-act="super" aria-label="${t.superLike}">${I.star}</button>
          <button class="act act-lg act-like" data-act="like" aria-label="${t.like}">${I.heart}</button>
        </div>
        <div class="deck-hint">Swipe, tap the buttons, or use ← → ↑ keys</div>
      </div>`;
  }

  function cardHTML(p, depth) {
    const cat = CATEGORIES[p.primary];
    const transform = depth === 0 ? '' : `transform:scale(${1 - depth * 0.05}) translateY(${depth * 16}px)`;
    return `
      <article class="swipe-card" data-id="${p.id}" data-depth="${depth}" style="${transform};z-index:${10 - depth}">
        <div class="portrait" style="background:${grad(p.grad)}"><span class="mono">${mono(p.name)}</span></div>
        <span class="goal-emoji">${cat.emoji}</span>
        <div class="stamp like">${tone().like}</div>
        <div class="stamp nope">${tone().pass}</div>
        <div class="stamp super">${tone().superLike}</div>
        <div class="card-top">
          <span class="dist-chip">${I.pin}${p.distance} km · ${esc(p.neighborhood)}</span>
          <span class="rate-chip"><span class="star">★</span>${p.rating.toFixed(1)}</span>
        </div>
        <div class="card-info">
          <span class="cat-chip" style="background:${cat.color}">${cat.emoji} ${cat.label}</span>
          <div class="name">${esc(p.name)} <span>${p.age}</span></div>
          <div class="headline">${esc(p.headline)}</div>
          <div class="bio">${esc(p.bio)}</div>
          <div class="shared-row">🎯 ${esc(p.shared)}</div>
          <div class="tagrow">${p.tags.map((x) => `<span class="tag">${esc(x)}</span>`).join('')}</div>
        </div>
      </article>`;
  }

  function renderPeopleList(d) {
    return `<div class="scroll"><div class="people-list">${d.map((p) => {
      const cat = CATEGORIES[p.primary];
      return `<div class="person-row" data-open="${p.id}">
        <div class="person-av" style="background:${grad(p.grad)}">${mono(p.name)}<span class="pe">${cat.emoji}</span></div>
        <div class="person-meta">
          <div class="pn">${esc(p.name)}, ${p.age} <span class="r"><span class="star">★</span>${p.rating.toFixed(1)}</span></div>
          <div class="pg">${esc(p.headline)}</div>
          <div class="pd">${I_pinSmall()} ${p.distance} km · ${esc(p.neighborhood)} · 🎯 ${esc(p.shared)}</div>
        </div>
        <div class="person-cta"><button class="mini-like" data-act="like-id" data-id="${p.id}" aria-label="${tone().like}">${I.heart}</button></div>
      </div>`;
    }).join('')}</div></div>`;
  }
  const I_pinSmall = () => '📍';

  /* ---------- swipe mechanics ---------- */
  function afterMountDiscover() {
    const top = $('.swipe-card[data-depth="0"]');
    if (!top) return;
    let startX = 0, startY = 0, dx = 0, dy = 0, dragging = false;

    const onDown = (e) => {
      dragging = true; top.classList.add('dragging');
      const pt = e.touches ? e.touches[0] : e;
      startX = pt.clientX; startY = pt.clientY;
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    };
    const onMove = (e) => {
      if (!dragging) return;
      const pt = e.touches ? e.touches[0] : e;
      dx = pt.clientX - startX; dy = pt.clientY - startY;
      const rot = dx / 18;
      top.style.transform = `translate(${dx}px, ${dy}px) rotate(${rot}deg)`;
      const likeOp = Math.max(0, Math.min(1, dx / 90));
      const nopeOp = Math.max(0, Math.min(1, -dx / 90));
      const superOp = Math.max(0, Math.min(1, -dy / 110)) * (Math.abs(dx) < 60 ? 1 : 0);
      top.querySelector('.stamp.like').style.opacity = likeOp;
      top.querySelector('.stamp.nope').style.opacity = nopeOp;
      top.querySelector('.stamp.super').style.opacity = superOp;
    };
    const onUp = () => {
      dragging = false; top.classList.remove('dragging');
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      const id = top.dataset.id;
      if (dy < -130 && Math.abs(dx) < 90) return fling(top, 'super', id);
      if (dx > 110) return fling(top, 'like', id);
      if (dx < -110) return fling(top, 'pass', id);
      top.style.transform = '';
      ['.stamp.like', '.stamp.nope', '.stamp.super'].forEach((s) => (top.querySelector(s).style.opacity = 0));
      dx = dy = 0;
    };
    top.addEventListener('pointerdown', onDown);
  }

  function fling(cardEl, action, id) {
    const dir = action === 'like' ? 1 : action === 'pass' ? -1 : 0;
    const x = dir * 600; const y = action === 'super' ? -800 : -60;
    const rot = dir * 30;
    cardEl.style.transition = 'transform .4s var(--ease), opacity .4s';
    cardEl.style.transform = `translate(${x}px, ${y}px) rotate(${rot}deg)`;
    cardEl.style.opacity = '0';
    setTimeout(() => commitSwipe(action, id), 230);
  }

  function triggerSwipe(action) {
    const top = $('.swipe-card[data-depth="0"]');
    if (!top) return;
    fling(top, action, top.dataset.id);
  }

  function commitSwipe(action, id) {
    state.swiped.add(id);
    state.history.push({ id, action, matched: action !== 'pass' });
    if (action === 'like' || action === 'super') addMatch(id, action === 'super');
    if (state.screen === 'discover') render();
  }

  function addMatch(id, isSuper) {
    if (state.matches.some((m) => m.id === id)) return;
    const p = personById(id);
    state.matches.unshift({
      id, sharedGoal: CATEGORIES[p.primary].label, daysPaired: 0,
      lastActivity: 'New partner — say hi!', unread: 0, isNew: true,
      messages: [], checkin: { label: 'First step', text: 'Plan your first check-in', done: false },
    });
    showMatchModal(p, isSuper);
  }

  function undo() {
    const last = state.history.pop();
    if (!last) return toast('Nothing to undo');
    state.swiped.delete(last.id);
    if (last.matched) {
      const i = state.matches.findIndex((m) => m.id === last.id);
      if (i > -1) state.matches.splice(i, 1);
    }
    render();
  }

  /* ===================================================================
     MATCH MODAL + confetti
     =================================================================== */
  function showMatchModal(p, isSuper) {
    const t = tone();
    overlay.innerHTML = `
      <div class="modal-scrim" style="background:${isSuper ? 'rgba(20,30,60,.62)' : 'rgba(20,8,12,.6)'}">
        <div class="confetti" id="confetti"></div>
        <div class="match-modal">
          <div class="mm-title">${esc(t.matchTitle)}</div>
          <div class="mm-avs">
            <div class="mm-av" style="background:${grad(ME.grad)}">${mono(ME.name === 'You' ? 'Y' : ME.name)}</div>
            <div class="mm-link">${isSuper ? '⭐' : '🤝'}</div>
            <div class="mm-av" style="background:${grad(p.grad)}">${mono(p.name)}</div>
          </div>
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
    for (let i = 0; i < 70; i++) {
      const left = Math.random() * 100, dur = 1.6 + Math.random() * 1.8, delay = Math.random() * 0.5;
      const c = colors[i % colors.length], rot = Math.random() * 360;
      html += `<i style="left:${left}%;background:${c};animation-duration:${dur}s;animation-delay:${delay}s;transform:rotate(${rot}deg)"></i>`;
    }
    box.innerHTML = html;
  }

  /* ===================================================================
     MATCHES LIST
     =================================================================== */
  function renderMatches() {
    const newOnes = state.matches.filter((m) => m.isNew);
    const threads = state.matches;
    return `
      <div class="screen">
        <div class="topbar"><h1>Partners</h1>
          <span class="pill">${I.heart}&nbsp;${state.matches.length}</span>
        </div>
        <div class="scroll">
          ${newOnes.length ? `<div class="section-label">New tandems</div>
            <div class="new-row">${newOnes.map((m) => {
              const p = personById(m.id);
              return `<div class="new-card" data-open="${m.id}">
                <div class="new-av" style="background:${grad(p.grad)}">${mono(p.name)}<span class="ndot"></span></div>
                <div class="nm">${esc(p.name)}</div></div>`;
            }).join('')}</div>` : ''}
          <div class="section-label">Your accountability partners</div>
          ${threads.map((m) => {
            const p = personById(m.id);
            const cat = CATEGORIES[p.primary];
            return `<div class="match-row" data-open="${m.id}">
              <div class="chat-av" style="width:54px;height:54px;border-radius:50%;background:${grad(p.grad)};font-size:22px">${mono(p.name)}</div>
              <div class="match-meta">
                <div class="mn">${esc(p.name)} <span class="goalchip" style="background:${cat.color}">${cat.emoji} ${esc(m.sharedGoal)}</span></div>
                <div class="ml">${esc(m.lastActivity)}</div>
                <div class="ml" style="color:var(--text-soft);font-size:11.5px;margin-top:2px">${m.daysPaired ? `🔗 paired ${m.daysPaired} days` : '✨ just matched'} · ★ ${p.rating.toFixed(1)}</div>
              </div>
              <div class="match-right">
                ${m.unread ? `<span class="unread">${m.unread}</span>` : `<span class="t">›</span>`}
              </div>
            </div>`;
          }).join('')}
        </div>
      </div>`;
  }

  /* ===================================================================
     CHAT
     =================================================================== */
  function renderChat() {
    const m = state.matches.find((x) => x.id === state.activeMatch);
    if (!m) { state.screen = 'matches'; return renderMatches(); }
    const p = personById(m.id);
    const cat = CATEGORIES[p.primary];
    const chips = ['✅ Did my workout', '🙌 Crushed it today', '😅 Need a nudge', '📅 Same time tomorrow?'];
    return `
      <div class="screen chat">
        <div class="chat-head">
          <button class="back" data-act="back-matches">‹</button>
          <div class="chat-av" style="background:${grad(p.grad)}">${mono(p.name)}</div>
          <div class="ci"><div class="cn">${esc(p.name)}</div><div class="cs">● Accountability partner</div></div>
          <button class="icon-btn" data-act="rate" data-id="${p.id}" aria-label="Rate partner" style="box-shadow:none;background:var(--surface-2)">${I.star}</button>
        </div>
        <div class="goal-banner">
          <span class="gb-emoji">${cat.emoji}</span>
          <div class="gb-text"><b>Shared goal · ${esc(m.sharedGoal)}</b><small>${esc(p.shared)}</small></div>
          <span class="streak-badge">🔥 ${p.streak}d</span>
        </div>
        <div class="msgs" id="msgs">
          ${m.messages.length ? m.messages.map(bubbleHTML).join('') : `<div style="text-align:center;color:var(--text-soft);font-weight:700;font-size:13px;margin:auto">You matched! Break the ice 👋</div>`}
        </div>
        <div class="quick-chips">${chips.map((c) => `<button class="qchip" data-chip="${esc(c)}">${c}</button>`).join('')}</div>
        <div class="composer">
          <input id="msgInput" placeholder="Message ${esc(p.name)}…" autocomplete="off" />
          <button class="send-btn" data-act="send" aria-label="Send">${I.send}</button>
        </div>
      </div>`;
  }
  const bubbleHTML = (b) => `<div class="bubble ${b.from}">${esc(b.text)}<span class="bt">${esc(b.t || '')}</span></div>`;

  function sendMessage(text) {
    text = (text || '').trim(); if (!text) return;
    const m = state.matches.find((x) => x.id === state.activeMatch); if (!m) return;
    const now = new Date(); const time = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    m.messages.push({ from: 'me', text, t: time });
    m.isNew = false; m.lastActivity = 'You: ' + text;
    renderChat_update();
    const replies = ['Love that 🙌', "Let's gooo 🔥", 'Proud of you! Same tomorrow?', 'On it too — accountability works 💪', 'Logged it. Streak alive ✅'];
    setTimeout(() => {
      const reply = replies[Math.floor(Math.random() * replies.length)];
      m.messages.push({ from: 'them', text: reply, t: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) });
      m.lastActivity = personById(m.id).name + ': ' + reply;
      if (state.screen === 'chat' && state.activeMatch === m.id) renderChat_update();
    }, 1100);
  }
  function renderChat_update() {
    const box = $('#msgs'); if (!box) return render();
    const m = state.matches.find((x) => x.id === state.activeMatch);
    box.innerHTML = m.messages.map(bubbleHTML).join('');
    box.scrollTop = box.scrollHeight;
  }

  /* ===================================================================
     PROGRESS
     =================================================================== */
  function renderProgress() {
    const streak = ME.streak + state.progress.filter((g) => g.done).length;
    const cheerer = personById('maya');
    return `
      <div class="screen">
        <div class="topbar"><div><h1>Your progress</h1><div class="sub">Consistency beats intensity</div></div></div>
        <div class="scroll">
          <div class="streak-hero">
            <div><div class="big">${streak}</div><div class="sl">DAY STREAK</div><div class="sd">Keep it alive — check in today</div></div>
            <div class="flames">🔥</div>
          </div>
          <div class="heat">${heatCells()}</div>
          <div class="partner-cheer" style="margin-top:16px">
            <div class="pc-av" style="background:${grad(cheerer.grad)}">${mono(cheerer.name)}</div>
            <div><b>${cheerer.name} cheered your run 🎉</b><div style="color:var(--text-soft);font-weight:700;font-size:12px">“Day 13, don’t break it!”</div></div>
          </div>
          <div class="section-label">Goals you're tracking</div>
          ${state.progress.map((g, i) => {
            const cat = CATEGORIES[g.cat];
            return `<div class="goal-card">
              <div class="gc-top">
                <div class="gc-emoji" style="background:${cat.color}">${cat.emoji}</div>
                <div class="gc-title"><b>${esc(g.text)}</b><small>${esc(g.stage)}</small></div>
                <div class="gc-pct">${Math.round(g.progress * 100)}%</div>
              </div>
              <div class="bar"><i data-fill="${g.progress}"></i></div>
              <div class="gc-foot">
                <small>${g.checkins}/${g.target} check-ins · ${cat.label}</small>
                <button class="checkin-btn ${g.done ? 'done' : ''}" data-checkin="${i}">${g.done ? '✓ Checked in' : 'Check in'}</button>
              </div>
            </div>`;
          }).join('')}
        </div>
      </div>`;
  }
  function heatCells() {
    let s = '';
    for (let i = 0; i < 42; i++) {
      const r = Math.random(); const lvl = r > 0.78 ? 'l3' : r > 0.55 ? 'l2' : r > 0.32 ? 'l1' : '';
      s += `<i class="${i > 38 ? 'l3' : lvl}"></i>`;
    }
    return s;
  }

  /* ===================================================================
     PROFILE
     =================================================================== */
  function renderProfile() {
    const reviews = REVIEWS.you || [];
    return `
      <div class="screen">
        <div class="topbar"><h1>Profile</h1><button class="icon-btn" data-act="lab" aria-label="Design Lab">${I.bolt}</button></div>
        <div class="scroll">
          <div class="profile-hero">
            <div class="big-av" style="background:${grad(ME.grad)}">Y<div class="edit">✏️</div></div>
            <h2>${esc(ME.name === 'You' ? 'You (preview)' : ME.name)}, ${ME.age}</h2>
            <div class="loc">${I.pin} ${esc(ME.neighborhood)} · showing partners within ${state.filters.radius} km</div>
          </div>

          <div class="rating-card">
            <div class="rating-big">
              <div class="num">${ME.rating.toFixed(1)}</div>
              <div class="stars">${starsStr(ME.rating)}</div>
              <div class="cnt">${ME.ratingCount} ratings</div>
            </div>
            <div class="rating-div"></div>
            <div>
              <div style="font-weight:800;font-size:13px;margin-bottom:9px">What partners say about you</div>
              <div class="rating-tags"><span class="rt">⏰ Reliable</span><span class="rt">🔥 Motivating</span><span class="rt">💬 Responsive</span></div>
              <div style="font-size:11.5px;font-weight:700;color:var(--text-soft);margin-top:10px">Higher ratings surface you to better matches.</div>
            </div>
          </div>

          <div class="stat-grid">
            <div class="stat"><b>${ME.streak}</b><small>day streak</small></div>
            <div class="stat"><b>${ME.ratingCount}</b><small>partners</small></div>
            <div class="stat"><b>${ME.goals.length}</b><small>active goals</small></div>
          </div>

          <div class="section-label">Your goals</div>
          ${ME.goals.map((g) => { const c = CATEGORIES[g.cat]; return `<div class="profile-goal">
            <div class="pgc" style="background:${c.color}">${c.emoji}</div>
            <div class="pgt"><b>${esc(g.text)}</b><small>${esc(g.stage)} · ${c.label}</small></div></div>`; }).join('')}
          <button class="btn btn-ghost btn-block" data-act="edit-goals" style="margin:4px 0 10px">+ Add a goal</button>

          <div class="section-label">Reviews from partners</div>
          ${reviews.map((r) => `<div class="review">
            <div class="rv-top"><div class="rv-av" style="background:${grad(Math.floor(Math.random()*8))}">${mono(r.by)}</div>
              <div class="rv-name">${esc(r.by)}</div><div class="rv-stars">${starsStr(r.stars)}</div></div>
            <div class="rv-text">“${esc(r.text)}”</div>
            <div class="rv-tags">${r.tags.map((x) => `<span>${esc(x)}</span>`).join('')}</div>
          </div>`).join('')}

          <button class="btn btn-block" data-act="rate" data-id="maya" style="margin-top:6px">Rate a past partner</button>
          <div style="height:14px"></div>
        </div>
      </div>`;
  }

  /* ===================================================================
     SHEETS: rating + filters
     =================================================================== */
  function openRateSheet(id) {
    const p = personById(id) || { name: 'your partner', grad: 0 };
    const tags = ['Reliable', 'Motivating', 'Honest', 'Responsive', 'Knowledgeable', 'Encouraging'];
    let stars = 0; const chosen = new Set();
    overlay.innerHTML = `
      <div class="sheet-scrim">
        <div class="sheet" data-stop>
          <div class="sheet-grab"></div>
          <h3>Rate ${esc(p.name)}</h3>
          <div class="sheet-sub">Public ratings help everyone find dependable partners.</div>
          <div class="star-pick" id="starPick">${[1,2,3,4,5].map((n) => `<button data-star="${n}">★</button>`).join('')}</div>
          <div class="tag-pick" id="tagPick">${tags.map((t) => `<button data-tag="${t}">${t}</button>`).join('')}</div>
          <button class="btn btn-block" data-act="submit-rate">Submit rating</button>
        </div>
      </div>`;
    $('#starPick').addEventListener('click', (e) => {
      const b = e.target.closest('[data-star]'); if (!b) return;
      stars = +b.dataset.star;
      [...$('#starPick').children].forEach((c, i) => c.classList.toggle('on', i < stars));
    });
    $('#tagPick').addEventListener('click', (e) => {
      const b = e.target.closest('[data-tag]'); if (!b) return;
      b.classList.toggle('on');
      chosen.has(b.dataset.tag) ? chosen.delete(b.dataset.tag) : chosen.add(b.dataset.tag);
    });
    overlay.querySelector('[data-act="submit-rate"]').addEventListener('click', () => {
      if (!stars) return toast('Pick a star rating first ⭐');
      closeOverlay();
      toast(`Thanks! You rated ${p.name} ${stars}★`);
    });
  }

  function openFilters() {
    const cats = Object.entries(CATEGORIES);
    overlay.innerHTML = `
      <div class="sheet-scrim">
        <div class="sheet" data-stop>
          <div class="sheet-grab"></div>
          <h3>Find your match</h3>
          <div class="sheet-sub">Partners near you, working on what you are.</div>
          <div class="filter-group">
            <div class="fg-label">Goal categories</div>
            <div class="cat-pick" id="catPick">${cats.map(([k, c]) => `<button data-cat="${k}" class="${state.filters.cats.has(k) ? 'on' : ''}">${c.emoji} ${c.label}</button>`).join('')}</div>
          </div>
          <div class="filter-group">
            <div class="fg-label">Distance</div>
            <div class="range-row"><input type="range" id="radius" min="1" max="25" value="${state.filters.radius}"><b id="radiusVal">${state.filters.radius} km</b></div>
          </div>
          <button class="btn btn-block" data-act="apply-filters">Show matches</button>
        </div>
      </div>`;
    const sel = new Set(state.filters.cats);
    $('#catPick').addEventListener('click', (e) => {
      const b = e.target.closest('[data-cat]'); if (!b) return;
      const k = b.dataset.cat; b.classList.toggle('on');
      sel.has(k) ? sel.delete(k) : sel.add(k);
    });
    let r = state.filters.radius;
    $('#radius').addEventListener('input', (e) => { r = +e.target.value; $('#radiusVal').textContent = r + ' km'; });
    overlay.querySelector('[data-act="apply-filters"]').addEventListener('click', () => {
      state.filters.cats = sel; state.filters.radius = r;
      closeOverlay(); render();
      toast(deck().length + ' people match your filters');
    });
  }

  /* ===================================================================
     ONBOARDING
     =================================================================== */
  function renderOnboarding() {
    overlay.innerHTML = `
      <div class="onb">
        <div class="onb-logo">T</div>
        <h1>Tandem</h1>
        <div class="tagline">Goals are better with company. Match with people near you chasing the same thing.</div>
        <div class="onb-steps">
          <div class="onb-step"><span class="os-emoji">🎯</span><div><b>Set your goals</b><small>Fitness, career, money, habits, travel & more</small></div></div>
          <div class="onb-step"><span class="os-emoji">🤝</span><div><b>Match a partner</b><small>Swipe people nearby with the same goal</small></div></div>
          <div class="onb-step"><span class="os-emoji">📈</span><div><b>Stay accountable</b><small>Check in together, then rate each other</small></div></div>
        </div>
        <div class="spacer"></div>
        <button class="btn btn-block" data-act="start">Find my goal partner</button>
        <button class="skip" data-act="start">Allow location · Bandra West 📍</button>
      </div>`;
  }

  /* ===================================================================
     DESIGN LAB
     =================================================================== */
  const LAB = {
    theme: {
      title: 'Visual style', desc: 'Different palettes & moods.',
      key: 'theme', attr: 'theme',
      opts: [
        { v: 'sunset', b: 'Sunset', s: 'Coral → amber, warm cream', sw: 'linear-gradient(135deg,#FF6B5C,#FFB23E)' },
        { v: 'peach', b: 'Peachy', s: 'Soft, gentle, pastel', sw: 'linear-gradient(135deg,#FBA68E,#F7C6A0)' },
        { v: 'ember', b: 'Ember (dark)', s: 'Bold, high-contrast night', sw: 'linear-gradient(135deg,#2A1B20,#FF7A5C)' },
      ],
    },
    tone: {
      title: 'Copy & tone', desc: 'Same app, different voice.',
      key: 'tone', attr: 'tone',
      opts: [
        { v: 'playful', b: 'Playful & social', s: '“Find your goal twin 🔥”', sw: 'linear-gradient(135deg,#FF6B5C,#FFB23E)' },
        { v: 'warm', b: 'Warm & supportive', s: '“Someone to grow with 💛”', sw: 'linear-gradient(135deg,#FBA68E,#F6C453)' },
        { v: 'bold', b: 'Bold & punchy', s: '“Lock in a partner. Now.”', sw: 'linear-gradient(135deg,#2C1A22,#FF6B5C)' },
      ],
    },
    discover: {
      title: 'Discover & match UX', desc: 'How you browse people.',
      key: 'discover', attr: 'discover',
      opts: [
        { v: 'stack', b: 'Swipe card stack', s: 'Tinder-style drag to match', sw: 'linear-gradient(135deg,#FF8A5B,#FFB23E)' },
        { v: 'list', b: 'Browse list', s: 'Scrollable feed, tap to connect', sw: 'linear-gradient(135deg,#E07A87,#FFB23E)' },
      ],
    },
  };
  function renderLab() {
    $('#labBody').innerHTML = Object.values(LAB).map((block) => `
      <div class="lab-block">
        <div class="lb-title">${block.title}</div>
        <div class="lb-desc">${block.desc}</div>
        <div class="opt-row">${block.opts.map((o) => `
          <button class="opt ${state[block.key] === o.v ? 'on' : ''}" data-lab="${block.key}" data-val="${o.v}">
            <span class="swatch" style="background:${o.sw}"></span>
            <span class="opt-text"><b>${o.b}</b><small>${o.s}</small></span>
            <span class="opt-check">${I.check}</span>
          </button>`).join('')}</div>
      </div>`).join('');
  }
  function setLab(key, val) {
    state[key] = val;
    root.dataset[key] = val;
    renderLab();
    render();
  }
  function openLab() { renderLab(); $('#lab').classList.add('open'); $('#lab').setAttribute('aria-hidden', 'false'); $('#labScrim').classList.add('open'); }
  function closeLab() { $('#lab').classList.remove('open'); $('#lab').setAttribute('aria-hidden', 'true'); $('#labScrim').classList.remove('open'); }

  /* ===================================================================
     OVERLAY / TOAST utils
     =================================================================== */
  function closeOverlay() { overlay.innerHTML = ''; }
  let toastT;
  function toast(msg) {
    const old = $('.toast'); if (old) old.remove();
    const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg;
    $('#device').appendChild(t);
    clearTimeout(toastT);
    toastT = setTimeout(() => t.remove(), 2200);
  }

  /* ===================================================================
     POST-MOUNT + animations
     =================================================================== */
  function afterMount() {
    if (state.screen === 'discover' && state.discover === 'stack') afterMountDiscover();
    if (state.screen === 'progress') requestAnimationFrame(() => document.querySelectorAll('.bar > i[data-fill]').forEach((b) => (b.style.width = (b.dataset.fill * 100) + '%')));
    if (state.screen === 'chat') { const box = $('#msgs'); if (box) box.scrollTop = box.scrollHeight; }
  }

  /* ===================================================================
     EVENTS (delegated)
     =================================================================== */
  function go(screen) { state.screen = screen; render(); }

  document.addEventListener('click', (e) => {
    const tab = e.target.closest('[data-tab]');
    if (tab) return go(tab.dataset.tab);

    const open = e.target.closest('[data-open]');
    if (open) { state.activeMatch = open.dataset.open; markRead(open.dataset.open); return go('chat'); }

    const chip = e.target.closest('[data-chip]');
    if (chip) return sendMessage(chip.dataset.chip);

    const checkin = e.target.closest('[data-checkin]');
    if (checkin) return doCheckin(+checkin.dataset.checkin);

    const labOpt = e.target.closest('[data-lab]');
    if (labOpt) return setLab(labOpt.dataset.lab, labOpt.dataset.val);

    const a = e.target.closest('[data-act]');
    if (a) return handleAct(a.dataset.act, a.dataset.id, a);
  });

  function handleAct(act, id, eln) {
    switch (act) {
      case 'filters': return openFilters();
      case 'pass': return triggerSwipe('pass');
      case 'like': return triggerSwipe('like');
      case 'super': return triggerSwipe('super');
      case 'undo': return undo();
      case 'like-id': state.swiped.add(id); state.history.push({ id, action: 'like', matched: true }); addMatch(id, false); return render();
      case 'reset-deck': state.swiped.clear(); state.history = []; return render();
      case 'go-chat': closeOverlay(); state.activeMatch = id; return go('chat');
      case 'close-modal': return closeOverlay();
      case 'back-matches': return go('matches');
      case 'send': { const inp = $('#msgInput'); const v = inp.value; inp.value = ''; return sendMessage(v); }
      case 'rate': return openRateSheet(id);
      case 'edit-goals': return toast('Goal editor — coming soon ✨');
      case 'lab': return openLab();
      case 'start': state.onboarded = true; return closeOverlay();
    }
  }

  function markRead(id) { const m = state.matches.find((x) => x.id === id); if (m) m.unread = 0; }
  function doCheckin(i) {
    const g = state.progress[i];
    g.done = !g.done;
    if (g.done) { g.progress = Math.min(1, g.progress + 0.06); g.checkins++; }
    else { g.progress = Math.max(0, g.progress - 0.06); g.checkins--; }
    render();
    if (g.done) toast('Checked in 🔥 streak +1');
  }

  // enter to send in chat
  document.addEventListener('keydown', (e) => {
    if (state.screen === 'chat' && e.key === 'Enter') {
      const inp = $('#msgInput'); if (inp && document.activeElement === inp) { const v = inp.value; inp.value = ''; sendMessage(v); }
      return;
    }
    if (state.screen === 'discover' && state.discover === 'stack' && !overlay.innerHTML) {
      if (e.key === 'ArrowLeft') triggerSwipe('pass');
      if (e.key === 'ArrowRight') triggerSwipe('like');
      if (e.key === 'ArrowUp') triggerSwipe('super');
    }
  });

  // Design Lab open/close
  $('#labBtn').addEventListener('click', openLab);
  $('#labClose').addEventListener('click', closeLab);
  $('#labScrim').addEventListener('click', closeLab);

  // sheet scrim close (click outside sheet)
  overlay.addEventListener('click', (e) => {
    if (e.target.classList.contains('sheet-scrim')) closeOverlay();
  });

  /* ---------- init ---------- */
  renderOnboarding();
  render();
})();
