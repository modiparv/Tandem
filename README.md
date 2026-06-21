# Tandem 🤝

**Tinder, but you match on goals.** Tandem connects people near you who are
chasing the *same* goal, pairs you up as 1:1 accountability partners, and helps
you stay consistent — chat, track progress together, and rate each other so the
most reliable partners rise to the top.

> Goals are better with company.

This repo is a **fully interactive, dependency-free mobile-app prototype** you can
open in any browser — no build step, no install, no backend. All data is mock.

---

## ✨ What it does

| Feature | Description |
| --- | --- |
| 🔥 **Swipe to match** | Tinder-style card stack of nearby people. Drag (or tap/use arrow keys) to **Pair up**, **Pass**, or mark a **Perfect match**. |
| 📍 **Location-aware** | Every card shows distance + neighborhood. Filter by radius. |
| 🎯 **Goal matching** | Six goal types — Fitness, Career, Travel, Finance, Habits, Learning — colour-coded, with a "you both want…" shared-goal hook. |
| ⭐ **Public ratings** | Rate a partner on reliability/motivation/etc. Ratings show on cards & profiles, so dependable people get better matches. |
| 💬 **Accountability chat** | 1:1 threads with a shared-goal banner, streak counter, and quick check-in chips. |
| 📈 **Progress tracking** | Streaks, a check-in heatmap, progress bars, and partner cheers. |
| 🤝 **"It's a Tandem!"** | A celebratory match moment (with confetti) when you pair up. |

## 🎨 Design Lab (the requested variations)

Tap the **flask button** (bottom-right of the phone) to open the **Design Lab**
and flip between variations live:

- **Visual style** — `Sunset` (coral → amber), `Peachy` (soft pastel), `Ember` (bold dark).
- **Copy & tone** — `Playful & social`, `Warm & supportive`, `Bold & punchy`. Every label and the match copy changes.
- **Discover / match UX** — `Swipe card stack` vs. a `Browse list` feed.

Warm-toned, playful, social — by default.

---

## 🚀 Run it

It's static. Pick any of these:

```bash
# Option A — just open it
open index.html          # macOS  (or double-click the file)

# Option B — serve locally (recommended; nicer for fonts/caching)
python3 -m http.server 8000
# then visit http://localhost:8000
```

### Deploy (Vercel)

It's a static site — no build needed. Import the repo into Vercel (framework
preset: **Other**) and it serves `index.html` from the root. `vercel.json` is
included so no build command runs.

> 📱 Best viewed on a phone, or use your browser's device toolbar (iPhone
> viewport). On desktop it renders inside a phone frame.

---

## 🗂 Structure

```
index.html   — phone shell, status bar, tab bar, Design Lab drawer
styles.css   — design system + 3 themes (CSS variables) + all components
data.js      — mock people, goals, reviews, chat threads, tone copy
app.js       — state, swipe mechanics, screens, matching, ratings, the Lab
```

No frameworks, no npm dependencies — intentionally, so it runs anywhere offline.
Avatars are generated gradients + monograms (no external images), which also
keeps the focus on goals, not looks.

## 🧭 Next steps (if taken to production)

- Real auth + profiles, geolocation, and a matching backend.
- Mutual-match logic (both must pair up), reporting/safety, and rating moderation.
- Push notifications for check-ins and streak reminders.
- Native build (React Native / Expo) reusing this design language.
