/* =========================================================================
   Tandem — data model & content
   No backend, no external images. Avatars are generated gradients + monograms.
   Everything time-based is expressed as offsets; app.js turns them into real
   timestamps on first run so the demo always feels "live today".
   ========================================================================= */

const CATEGORIES = {
  fitness:   { label: 'Fitness & health',     short: 'Fitness',  emoji: '💪', color: '#FF6B5C' },
  career:    { label: 'Career & business',    short: 'Career',   emoji: '💼', color: '#F5A623' },
  travel:    { label: 'Travel & adventure',   short: 'Travel',   emoji: '✈️', color: '#FF8A5B' },
  finance:   { label: 'Financial goals',      short: 'Finance',  emoji: '💰', color: '#E0A52E' },
  habits:    { label: 'Habits & lifestyle',   short: 'Habits',   emoji: '🌱', color: '#E07A87' },
  learning:  { label: 'Learning a skill',     short: 'Learning', emoji: '📚', color: '#B5838D' },
};

const AVATAR_GRADIENTS = [
  ['#FF6B5C', '#FFB23E'], ['#FF8A5B', '#F6C453'], ['#F5A623', '#FF6B5C'], ['#E07A87', '#FFB23E'],
  ['#FF7E79', '#FFC36E'], ['#FFA15C', '#FF6B8B'], ['#F49E4C', '#EF767A'], ['#FF9966', '#FF5E62'],
  ['#FF6F91', '#FFC75F'], ['#F9844A', '#FEE440'],
];

// Neighbourhoods offered in onboarding / profile editing (Mumbai demo city).
const NEIGHBORHOODS = ['Bandra West', 'Bandra East', 'Andheri', 'Juhu', 'Khar', 'Powai', 'Lower Parel', 'Worli', 'Dadar', 'Colaba'];

// Candidate pool. distance in km. rating /5, ratingCount = past partners who rated them.
// active = recency ('now' | '2h' | 'today' | 'yesterday'). checkedInToday drives the shared-streak indicator.
const PEOPLE = [
  {
    id: 'maya', name: 'Maya', age: 27, distance: 1.2, neighborhood: 'Bandra West',
    grad: 0, rating: 4.9, ratingCount: 23, streak: 41, active: 'now', verified: true, checkedInToday: true,
    primary: 'fitness',
    headline: 'Training for my first half-marathon 🏃‍♀️',
    bio: "5am runner trying to stay consistent. Need someone to text 'we run today' when it rains. I'll do the same for you.",
    goals: [
      { cat: 'fitness', text: 'Run a half-marathon in October', stage: 'Week 6 of 16', pct: 0.38 },
      { cat: 'habits', text: 'Sleep before 11pm', stage: 'Building', pct: 0.6 },
    ],
    tags: ['Early bird', 'Reliable', 'Runner'],
    shared: 'You both want to run a 10K+',
    badges: ['🔥 41-day streak', '🏅 Top rated'],
  },
  {
    id: 'dev', name: 'Dev', age: 31, distance: 2.4, neighborhood: 'Powai',
    grad: 1, rating: 4.7, ratingCount: 15, streak: 12, active: '2h', verified: true, checkedInToday: true,
    primary: 'career',
    headline: 'Leaving my job to launch a SaaS 🚀',
    bio: 'Shipping in public. Looking for a founder buddy for weekly check-ins, brutal honesty and shared wins.',
    goals: [
      { cat: 'career', text: 'Get first 100 paying users', stage: '12 / 100', pct: 0.12 },
      { cat: 'learning', text: 'Learn to code the MVP myself', stage: 'In progress', pct: 0.45 },
    ],
    tags: ['Builder', 'Direct', 'Ambitious'],
    shared: 'You both picked Career & business',
    badges: ['🚀 Builder', '💬 Great communicator'],
  },
  {
    id: 'aisha', name: 'Aisha', age: 24, distance: 0.8, neighborhood: 'Andheri',
    grad: 3, rating: 5.0, ratingCount: 9, streak: 28, active: 'now', verified: false, checkedInToday: true,
    primary: 'finance',
    headline: 'Saving for 6 months of runway 💰',
    bio: 'No-spend challenges are more fun with company. Let’s keep each other off the impulse-buy button.',
    goals: [
      { cat: 'finance', text: 'Save ₹3,00,000 emergency fund', stage: '64% there', pct: 0.64 },
      { cat: 'habits', text: 'Cook 5 nights a week', stage: 'On track', pct: 0.7 },
    ],
    tags: ['Frugal', 'Consistent', 'Wholesome'],
    shared: 'You both want to save aggressively',
    badges: ['⭐ Perfect 5.0', '🌱 Habit master'],
  },
  {
    id: 'leo', name: 'Leo', age: 29, distance: 3.1, neighborhood: 'Lower Parel',
    grad: 5, rating: 4.6, ratingCount: 19, streak: 7, active: 'today', verified: false, checkedInToday: false,
    primary: 'learning',
    headline: 'Learning guitar before I turn 30 🎸',
    bio: '30 minutes a day, no excuses. Would love a practice partner to swap clips and keep the streak alive.',
    goals: [
      { cat: 'learning', text: 'Play one full song cleanly', stage: 'Almost there', pct: 0.8 },
      { cat: 'fitness', text: 'Do 50 pushups in a row', stage: '31 max', pct: 0.62 },
    ],
    tags: ['Creative', 'Night owl', 'Patient'],
    shared: 'You both are learning a new skill',
    badges: ['🎸 Skill seeker', '🤝 12 partners helped'],
  },
  {
    id: 'priya', name: 'Priya', age: 33, distance: 1.9, neighborhood: 'Juhu',
    grad: 4, rating: 4.8, ratingCount: 31, streak: 63, active: 'now', verified: true, checkedInToday: true,
    primary: 'habits',
    headline: 'Quit sugar, building a meditation habit 🌱',
    bio: 'Down 9kg this year. I’m great at the gentle nudge. Looking for someone who actually wants the nudge.',
    goals: [
      { cat: 'habits', text: 'Meditate 10 min daily', stage: '63-day streak', pct: 0.85 },
      { cat: 'fitness', text: 'Yoga 4x a week', stage: 'On track', pct: 0.5 },
    ],
    tags: ['Calm', 'Encouraging', 'Disciplined'],
    shared: 'You both want better daily habits',
    badges: ['🔥 63-day streak', '🏅 Top rated'],
  },
  {
    id: 'sam', name: 'Sam', age: 26, distance: 4.6, neighborhood: 'Colaba',
    grad: 7, rating: 4.5, ratingCount: 11, streak: 4, active: 'yesterday', verified: false, checkedInToday: false,
    primary: 'travel',
    headline: 'Planning a solo trek to Ladakh 🏔️',
    bio: 'Saving + training + planning. Want a partner to keep the prep on schedule (and maybe share an itinerary).',
    goals: [
      { cat: 'travel', text: 'Trek Markha Valley in September', stage: 'Planning', pct: 0.3 },
      { cat: 'fitness', text: 'Build trekking stamina', stage: 'Week 2', pct: 0.2 },
    ],
    tags: ['Adventurous', 'Spontaneous', 'Outdoorsy'],
    shared: 'You both want a big adventure',
    badges: ['✈️ Explorer', '🗺️ Planner'],
  },
  {
    id: 'noor', name: 'Noor', age: 28, distance: 2.0, neighborhood: 'Khar',
    grad: 6, rating: 4.9, ratingCount: 17, streak: 22, active: '2h', verified: true, checkedInToday: true,
    primary: 'career',
    headline: 'Switching into product management 💼',
    bio: 'Doing case studies every week. Want a study buddy to review answers and do mock interviews.',
    goals: [
      { cat: 'career', text: 'Land a PM role by Q4', stage: '4 interviews', pct: 0.55 },
      { cat: 'learning', text: 'Finish PM course', stage: '70%', pct: 0.7 },
    ],
    tags: ['Sharp', 'Organised', 'Supportive'],
    shared: 'You both are leveling up careers',
    badges: ['💼 Career switcher', '⭐ 4.9 rated'],
  },
  {
    id: 'arjun', name: 'Arjun', age: 30, distance: 5.3, neighborhood: 'Dadar',
    grad: 2, rating: 4.4, ratingCount: 8, streak: 9, active: 'today', verified: false, checkedInToday: true,
    primary: 'fitness',
    headline: 'Back to the gym after 2 years 🏋️',
    bio: 'Consistency over intensity. Need a check-in buddy so I actually show up on the hard days.',
    goals: [
      { cat: 'fitness', text: 'Gym 3x a week for 90 days', stage: '9 / 90 days', pct: 0.1 },
      { cat: 'habits', text: 'Drink 3L water daily', stage: 'Building', pct: 0.4 },
    ],
    tags: ['Determined', 'Friendly', 'Comeback'],
    shared: 'You both picked Fitness & health',
    badges: ['🏋️ Comeback kid', '🤝 Team player'],
  },
  {
    id: 'kabir', name: 'Kabir', age: 32, distance: 3.7, neighborhood: 'Worli',
    grad: 8, rating: 4.8, ratingCount: 26, streak: 35, active: 'now', verified: true, checkedInToday: true,
    primary: 'finance',
    headline: 'Building a 12-month investing habit 📈',
    bio: 'Automating SIPs and tracking net worth monthly. Looking for someone to compare notes and stay disciplined.',
    goals: [
      { cat: 'finance', text: 'Invest every month for a year', stage: 'Month 5', pct: 0.42 },
      { cat: 'learning', text: 'Read 6 finance books', stage: '3 / 6', pct: 0.5 },
    ],
    tags: ['Methodical', 'Calm', 'Long-term'],
    shared: 'You both have financial goals',
    badges: ['📈 Investor', '🏅 Top rated'],
  },
  {
    id: 'tara', name: 'Tara', age: 25, distance: 1.5, neighborhood: 'Bandra East',
    grad: 9, rating: 4.7, ratingCount: 13, streak: 19, active: 'now', verified: false, checkedInToday: false,
    primary: 'learning',
    headline: 'Learning Spanish for a trip to Spain 🇪🇸',
    bio: 'Duolingo streak alive but I need conversation practice. Bonus if you also want to travel after.',
    goals: [
      { cat: 'learning', text: 'Hold a 10-min conversation', stage: 'B1 level', pct: 0.55 },
      { cat: 'travel', text: 'Visit Spain next spring', stage: 'Saving', pct: 0.35 },
    ],
    tags: ['Curious', 'Chatty', 'Fun'],
    shared: 'You both love learning new things',
    badges: ['📚 Language nerd', '✈️ Wanderer'],
  },
];

// Reviews shown on profiles (what past partners said).
const REVIEWS = {
  maya: [
    { by: 'Rohan', stars: 5, tags: ['Reliable', 'Motivating'], text: 'Texted me every single morning. I never skipped a run.' },
    { by: 'Ira', stars: 5, tags: ['Encouraging'], text: 'The most consistent partner I’ve had on here.' },
  ],
  dev: [{ by: 'Sana', stars: 5, tags: ['Direct', 'Driven'], text: 'Brutally honest in the best way. We both shipped.' }],
  aisha: [{ by: 'Meera', stars: 5, tags: ['Disciplined'], text: 'We did a 30-day no-spend together. Saved more than ever.' }],
  priya: [{ by: 'Anil', stars: 5, tags: ['Encouraging', 'Calm'], text: 'Gentle but firm. Helped me build a real habit.' }],
  noor: [{ by: 'Jay', stars: 5, tags: ['Sharp', 'Supportive'], text: 'Her mock interviews got me the offer. Legend.' }],
  kabir: [{ by: 'Dia', stars: 5, tags: ['Methodical'], text: 'Made investing feel simple and kept me accountable.' }],
  leo: [{ by: 'Zara', stars: 4, tags: ['Patient', 'Creative'], text: 'Swapped practice clips every night. Kept me going.' }],
  you: [
    { by: 'Tara', stars: 5, tags: ['Reliable', 'Honest'], text: 'Always checked in on time. Kept me accountable for 6 weeks!' },
    { by: 'Kabir', stars: 4, tags: ['Motivating'], text: 'Great energy. Pushed me on my low days.' },
  ],
};

// Your own profile (defaults; personalised during onboarding & persisted).
// Goal check-in history is generated on first run (see app.js seedHistory) so the streak & heatmap are real.
const ME = {
  name: 'You', age: 28, neighborhood: 'Bandra West', grad: 0,
  headline: 'Building consistent habits, one check-in at a time',
  bio: 'I show up on the hard days and I’ll text you when you’re about to skip. Looking for partners who want honest, daily accountability.',
  rating: 4.8, ratingCount: 14,
  goals: [
    { cat: 'fitness',  text: 'Run a 10K under 60 min',  stage: 'Week 4 of 12',  target: 36, density: 0.75 },
    { cat: 'learning', text: 'Read 12 books this year',  stage: '5 / 12 books',  target: 30, density: 0.35 },
    { cat: 'finance',  text: 'Save ₹2,00,000',           stage: '₹86k saved',    target: 30, density: 0.45 },
  ],
};

// Pre-seeded partners + chat threads. `sinceDays` = how long you've been paired.
// message.day = days ago (0 = today). Times are shown as given.
const SEED_MATCHES = [
  {
    id: 'maya', sharedGoal: 'Running consistency', sinceDays: 12,
    lastActivity: 'Maya cheered your run 🎉', unread: 2,
    messages: [
      { from: 'them', text: 'Morning! Did you get your run in? ☀️', t: '7:02 AM', day: 0 },
      { from: 'me',   text: 'Just finished 5k 🙌 raining though', t: '7:40 AM', day: 0 },
      { from: 'them', text: 'Beast. I almost skipped, your text got me out 😅', t: '7:42 AM', day: 0 },
      { from: 'them', text: 'Same time tomorrow? Streak day 13 👀', t: '7:42 AM', day: 0 },
    ],
  },
  {
    id: 'noor', sharedGoal: 'Career switch', sinceDays: 5,
    lastActivity: 'You: sending you my case study', unread: 0,
    messages: [
      { from: 'them', text: 'How did the mock interview go?', t: '6:10 PM', day: 1 },
      { from: 'me',   text: 'Nervous but okay! Want to review my answers?', t: '6:32 PM', day: 1 },
      { from: 'them', text: 'Yes! Send them over, I’ll mark them up tonight 💪', t: '6:33 PM', day: 1 },
    ],
  },
];

// People who already sent you a pair request (instant match when you connect).
const LIKES_YOU = ['aisha', 'kabir', 'priya'];

// Seed activity feed. ageMin = minutes ago.
const ACTIVITY = [
  { kind: 'like',    icon: '💛', who: 'aisha', text: 'Aisha wants to pair up with you', ageMin: 5 },
  { kind: 'rating',  icon: '⭐', who: 'maya',  text: 'Maya rated you 5★ — “so reliable”', ageMin: 60 },
  { kind: 'checkin', icon: '✅', who: 'noor',  text: 'Noor checked in: 2 case studies done', ageMin: 180 },
  { kind: 'streak',  icon: '🔥', who: null,    text: 'You’re on a streak. Check in today to keep it!', ageMin: 360 },
  { kind: 'like',    icon: '💛', who: 'kabir', text: 'Kabir wants to pair up with you', ageMin: 1440 },
  { kind: 'match',   icon: '🤝', who: 'priya', text: 'You and Priya could be a 90% match', ageMin: 1500 },
];

// Quick check-in chips, tailored to the shared goal category.
const QUICK_CHIPS = {
  fitness:  ['✅ Did my workout', '🙌 Crushed it today', '😅 Need a nudge', '📅 Same time tomorrow?'],
  career:   ['✅ Shipped something today', '📝 Did my deep-work block', '😅 Stuck — need a push', '📅 Weekly check-in?'],
  travel:   ['✅ Ticked off a prep task', '💰 Saved for the trip', '🗺️ Planned the next leg', '📅 Plan session tomorrow?'],
  finance:  ['✅ No-spend day done', '💰 Moved money to savings', '😅 Almost impulse-bought', '📅 Compare notes Friday?'],
  habits:   ['✅ Done for today', '🧘 Kept the habit', '😅 Nearly slipped', '📅 Same time tomorrow?'],
  learning: ['✅ Practised today', '📚 Finished a lesson', '😅 Losing steam', '📅 Study session tomorrow?'],
};

// Partner reply engine: intent → possible replies. app.js picks the intent from your message.
const REPLIES = {
  done_hard: ['You finished even though it was tough — that’s the whole game 💪', 'Hard day AND you showed up? That’s the streak that matters 🔥', 'Respect. Tough sessions build the habit. Rest well tonight 💛'],
  done:      ['Yesss 🙌 that’s the consistency I love', 'Logged and celebrated 🎉 Streak alive!', 'Proud of you. Same time tomorrow?', 'That’s a win. Stack another one tomorrow 💪'],
  hard:      ['Tough days count double. You still showed up 💛', 'Totally normal — the hard ones build the habit. Go easy tonight?', 'Hey, you got through it. That’s the whole point 🤝', 'Want to make tomorrow a lighter session? Easy win to keep the streak.'],
  skip:      ['No guilt — but let’s not make it two. Tomorrow 7am? ⏰', 'Happens! Want me to text you a reminder tomorrow morning?', 'One miss doesn’t break a habit. Two starts to. I’ve got you 👊'],
  nudge:     ['You’ve got this. 10 minutes — just start. Text me when done ✅', 'Okay: shoes on, door open, go. I’ll check back in 30 🙂', 'Nudge delivered 🔔 Future you says thanks.'],
  question:  ['Good question — I’d say yes, as long as it keeps you consistent 🙂', 'Honestly? Try it for a week and we compare notes.', 'Let’s decide together on our next check-in 👍'],
  plan:      ['Deal — same time tomorrow 📅', 'Locked in. I’ll text first if you don’t 😄', 'Yes! Let’s do it. Streak day +1 👀'],
  thanks:    ['Anytime — that’s what partners are for 🤝', 'We’re in this together 💛'],
  greet:     ['Hey hey 👋 how did today go?', 'Hi! Did you get your session in?'],
  default:   ['Love that 🙌', 'Noted — keep me posted 👀', 'On it too — accountability works 💪', 'Let’s keep each other honest 🔥'],
};

// Reasons offered when reporting a partner (safety).
const REPORT_REASONS = ['Inappropriate messages', 'Fake profile or spam', 'Harassment or bullying', 'Not here for goals', 'Something else'];

// Achievements. `metric` + `min` are evaluated against live stats in app.js.
const ACHIEVEMENTS = [
  { id: 'first',    emoji: '🤝', title: 'First Tandem',    desc: 'Pair with your first partner',   metric: 'partners', min: 1 },
  { id: 'circle',   emoji: '💛', title: 'Circle of three', desc: 'Have 3 active partners',          metric: 'partners', min: 3 },
  { id: 'streak7',  emoji: '🔥', title: 'One week strong', desc: 'Keep a 7-day check-in streak',    metric: 'streak',   min: 7 },
  { id: 'streak30', emoji: '🏆', title: 'Thirty days',     desc: 'Keep a 30-day check-in streak',   metric: 'streak',   min: 30 },
  { id: 'rater',    emoji: '⭐', title: 'Fair judge',      desc: 'Rate a partner',                  metric: 'ratings',  min: 1 },
  { id: 'goals3',   emoji: '🎯', title: 'Multi-goal',      desc: 'Track 3 goals at once',           metric: 'goals',    min: 3 },
  { id: 'checkins', emoji: '✅', title: 'Fifty check-ins', desc: 'Log 50 check-ins in total',       metric: 'checkins', min: 50 },
];

// Copy that changes with the selected voice (Settings → Voice).
const TONE_COPY = {
  playful: {
    discoverTitle: 'Find your goal twin',
    discoverSub: 'Swipe people near you chasing the same thing 🔥',
    pass: 'Nope', like: 'Pair up', superLike: 'Perfect match',
    matchTitle: "It's a Tandem! 🎉",
    matchSub: (n) => `You and ${n} are now accountability partners. Go crush it together.`,
    emptyDeck: "That's everyone nearby for now 🌅",
    emptySub: 'Widen your radius or check back soon — new goal-getters join daily.',
    chatHint: 'Keep each other honest 💬',
  },
  warm: {
    discoverTitle: 'Someone to grow with',
    discoverSub: 'People near you, working toward what you want too',
    pass: 'Not now', like: 'Connect', superLike: 'Great fit',
    matchTitle: "You're paired up 💛",
    matchSub: (n) => `${n} is now your accountability partner. You’ve got each other.`,
    emptyDeck: "You’ve seen everyone close by",
    emptySub: 'Try a wider radius, or come back later for new faces.',
    chatHint: 'Be the support you’d want 💛',
  },
  bold: {
    discoverTitle: 'Lock in a partner',
    discoverSub: 'Same goal. Same city. Zero excuses.',
    pass: 'Skip', like: 'Match', superLike: 'Top pick',
    matchTitle: 'Matched. Go.',
    matchSub: (n) => `${n} is on the hook with you now. Show up.`,
    emptyDeck: 'Deck cleared.',
    emptySub: 'Expand your radius and keep moving.',
    chatHint: 'No streak left behind.',
  },
};

window.TANDEM = { CATEGORIES, AVATAR_GRADIENTS, NEIGHBORHOODS, PEOPLE, REVIEWS, ME, SEED_MATCHES, LIKES_YOU, ACTIVITY, QUICK_CHIPS, REPLIES, REPORT_REASONS, ACHIEVEMENTS, TONE_COPY };
