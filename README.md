# Tandem 🤝

**Match on goals, not looks.** Tandem pairs you with people nearby who are chasing the *same* goal, turns you into 1:1 accountability partners, and keeps you both consistent — daily check-ins, nudges, shared streaks, and public ratings so the most reliable partners rise to the top.

> Goals are better with company.

This repository is a complete, dependency-free web app: open `index.html` and it runs. No build step, no install, no backend. It works as a responsive web app (sidebar on desktop, bottom tab bar on mobile), is installable to a phone's home screen, and is structured so the same design language can be lifted into a native app.

---

## Table of contents

1. [What Tandem does](#what-tandem-does)
2. [The user journey](#the-user-journey)
3. [Feature reference](#feature-reference)
4. [How matching works](#how-matching-works)
5. [How progress works](#how-progress-works)
6. [Run it / deploy it](#run-it--deploy-it)
7. [Architecture](#architecture)
8. [Design system](#design-system)
9. [Roadmap to production](#roadmap-to-production)

---

## What Tandem does

| | |
| --- | --- |
| 🎯 **Goal-first discovery** | Six goal areas — Fitness, Career, Travel, Finance, Habits, Learning. Every profile leads with what the person is working on, not what they look like. |
| 🔥 **Swipe or browse** | A Tinder-style card stack (drag, tap, or arrow keys) or a scrollable list. Your choice, in Settings. |
| 🤝 **Mutual matching** | A like sends a pair request. You're partners only when they accept. People who already like you, and *Perfect match* picks, pair instantly. |
| 💬 **Accountability chat** | 1:1 threads with a shared-goal banner, today's check-in status for both of you, goal-aware quick replies, and a partner who actually responds to what you said. |
| 📈 **Real progress** | Streaks and a six-week heatmap computed from actual check-in history. Per-goal streaks, notes, weekly insights, achievements. |
| ⭐ **Public ratings** | Rate partners on reliability, motivation and more. Ratings show on cards and profiles, so dependable people get better matches. |
| 🛡️ **Safety built in** | Unmatch, report with a reason, and block — from any partner's profile or chat. |
| 📱 **Installable** | Web-app manifest and icons; add it to a home screen and it opens full-screen. |

---

## The user journey

### 1. Onboarding (four short steps)
**Welcome → Name → Goals → Location → Ready.** Progress dots, back navigation, validation (a name and at least one goal are required), and a one-tap *Use my current location*. The final step summarises what you chose. Everything is editable later from Profile.

### 2. Discover
The top card shows distance and neighbourhood, whether the person is active now, their rating and how many partners rated them, a **goal-match percentage**, their headline, bio, the goal you share ("You both want to run a 10K+"), and personality tags. A **💛 Likes you** badge appears when someone has already sent you a request.

- **Tap** a card for the full profile — their goals with progress, partner reviews, and a **Why you match** breakdown.
- **Drag right / →** to send a pair request. **Drag left / ←** to pass. **Drag up / ↑** for a *Perfect match*, which pairs instantly.
- **Undo** brings back a pass, withdraws a pending request, or reverses a match you haven't chatted in yet.
- **Filters**: sort by best match, closest, or top rated; goal areas; max distance; minimum rating; verified only; active recently. The button shows a live count of who matches.
- When you've seen everyone, an empty state offers to widen your filters.

### 3. Pairing
- Liking someone who **already likes you** → instant *It's a Tandem!* moment with confetti.
- Liking anyone else → **"Pair request sent"**. They appear under *Waiting on them* in Partners (with a Withdraw button), and a strip on Discover reminds you how many are pending. When they accept — a few seconds later in the demo — you get the match moment, or a toast if you're mid-chat.
- Every event lands in the **Activity** feed (bell icon): requests sent, acceptances, check-ins, ratings, new messages.

### 4. Partners
Sections for **people who want to pair with you**, **pending requests**, **new tandems** to say hi to, and your **partner list** with unread counts, a Rate button, and a status line: *Both checked in today*, *Paired 12 days*, and so on. **Search** appears once you have more than two partners. On a desktop-width screen, Partners and Chat sit **side by side**.

### 5. Chat
The header shows how long you've been paired and whether they're active. The **shared-goal banner** shows both of your check-in status for today. **Quick chips** change with the goal — a Finance partner gets *No-spend day done*, a Learning partner gets *Practised today*. Replies are **intent-aware**: say you finished but it was tough and your partner responds to both. Messages are grouped by day. The **⋯ menu** offers View profile, Rate, Unmatch and Report.

### 6. Progress
- **Day streak** hero with today's status — it lights up once you've checked in.
- **Six-week heatmap** aligned to real weekdays, with today outlined and cell intensity by number of goals checked in.
- A **weekly insight** ("5 of 7 days this week", "streak on the line") that changes with your behaviour.
- A **partner cheer** from your most recent partner once you've checked in.
- **Goal cards** with per-goal streak, progress bar, and a daily **Check in** toggle. The ⋯ menu opens **details** (14-day history, notes, streak), **edit**, or **delete** with confirmation.

### 7. Profile
Your avatar, name, age, neighbourhood, headline and goal areas — all editable via the pencil. Rating card with what partners say about you. Stats (streak, partners, check-ins) that agree with every other screen. **Achievements** (7 of them, unlocked from live stats). Your goals, reviews from partners, and *Rate a partner*.

### 8. Settings (gear icon)
**Appearance** (Sunset, Peachy, Ember dark), **Browse style** (cards or list), **Voice** (playful, warm, bold copy), **Notifications** and **Privacy** toggles, **Edit profile**, **Reset demo data**, and **Sign out**, which clears the device and returns to onboarding.

---

## Feature reference

**Discovery & matching** — card stack with drag physics and stamps · list mode · goal-match score and reasons · likes-you badge · pair requests with pending state and withdraw · instant match for mutual likes and Perfect match · undo · filters with live count · empty states.

**Partners & chat** — likes-you row · pending row · new-tandem row · search · unread badges · desktop split view · day separators · typing indicator · intent-aware replies · goal-aware quick chips · shared check-in status · rate nudge · chat menu.

**Progress** — real streak · six-week heatmap · weekly insight · partner cheer · per-goal streak · goal detail with 14-day history and notes · add / edit / delete goals · check-in once per goal per day · streak milestones.

**Profile & ratings** — editable profile · achievements · consistent stats · partner reviews · rate a partner with stars and tags · public rating recalculated on cards.

**Safety & account** — unmatch (confirm) · report (reason + optional block) · blocked people never resurface · settings · reset · sign out.

**Platform** — installable PWA manifest and icons · three themes · reduced-motion support · keyboard (arrows to swipe, Enter to send, Escape to close) · focus management and ARIA roles on dialogs, tabs and switches · state persisted to `localStorage` and validated on load.

---

## How matching works

The score is a weighted sum, clamped to 61–99%:

| Signal | Weight |
| --- | --- |
| Their **primary goal** is one of your goal areas | +22 |
| Each **additional shared goal area** | +8 |
| Their **rating** | rating × 2 |
| **Proximity** | up to +8, decaying with distance |
| Stable per-person jitter so ties don't look identical | ±7 |

Tap any card to see the reasons in plain English — shared goal areas, distance, rating, streak, activity, verification.

**Mutual by design.** A like is a request. The demo simulates the other person accepting after a short delay; in production this is the other user tapping *Pair up*. Perfect match (the star / swipe up) is the premium, guaranteed-pairing action.

---

## How progress works

Every goal has a **check-in history**: a list of dates. Everything else is derived from it, so numbers can't drift apart across screens:

- **Streak** = consecutive days (ending today, or yesterday if you haven't checked in yet) with at least one check-in on any goal.
- **Goal progress** = check-ins ÷ target check-ins.
- **Heatmap** = check-ins per day for the last 42 days, aligned to the calendar week.
- **Weekly insight** = active days in the last 7 and best streak in the window.
- **Achievements** = thresholds on live metrics (partners, streak, ratings given, goals, total check-ins).

On first run the demo seeds a believable history — an 18-day streak that ends yesterday, so the first thing you do is keep it alive.

---

## Run it / deploy it

```bash
# Option A — just open it
open index.html            # macOS (or double-click)

# Option B — serve locally (recommended: fonts, manifest)
python3 -m http.server 8000
# → http://localhost:8000
```

**Deploy** anywhere that serves static files. `vercel.json` is included (no build command, output directory `.`). A GitHub Actions workflow in `.github/workflows/pages.yml` can publish to GitHub Pages — run it from the Actions tab once Pages is enabled for the repository.

**Reset** the demo at any time from Settings → *Reset demo data*.

---

## Architecture

```
index.html      app shell: sidebar / bottom tab bar, overlay root, manifest links
styles.css      design tokens, three themes, every component, responsive rules
data.js         content & seed data: people, reviews, chats, replies, achievements
app.js          state → render → events. One state object, pure render functions
                that return HTML, one delegated click handler, localStorage persistence
manifest.json   installable web-app manifest
icons/          SVG source + rasterised PNGs (192, 512, 512 maskable)
```

**State model** (persisted under `tandem_v4`): the user (`me`), goal areas, swiped / blocked sets, matches with messages, pending requests, ratings, activity feed, goals with check-in history and notes, settings, filters, and appearance.

**Rendering**: each screen is a function of state that returns an HTML string; `render()` swaps it in, re-renders the nav, then runs post-mount hooks (swipe physics, bar animations, count-ups). Sheets and modals render into a separate overlay root. On screens ≥ 1024px wide, Partners and Chat render as a split view.

**Time**: seed data is expressed as offsets ("12 days ago", "5 minutes ago") and converted to real timestamps on first run, so the demo is always "today" and relative times are genuine.

**Resilience**: persisted state is validated on load (unknown people, malformed messages and missing fields are dropped), pending requests older than a few seconds resolve on load, and the composer draft survives re-renders.

---

## Design system

Warm, playful, social. Display type **Fredoka**, body **Nunito**. All colour lives in CSS variables per theme (`[data-theme]`), so components never hard-code colour. Goal areas each have a colour used consistently on chips, cards and goal icons. Avatars are generated gradients + monograms — no photos, by design.

---

## Roadmap to production

- **Backend**: auth, real profiles and geolocation, a matching service, and push notifications for check-ins, streak risk and pair requests (the Settings toggles are wired for this).
- **Mutual match**: the request/accept flow is in place; it needs a server and a notification to the other user.
- **Trust & safety**: verification, rating moderation, report triage — the client affordances exist.
- **Native**: React Native / Expo reusing this component and token system.
