/* =========================================================================
   Tandem — mock data
   No backend, no external images. Avatars are generated gradients + monograms.
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

// Mock candidate deck. distance in km. rating /5, count = past partners. active = recency.
const PEOPLE = [
  {
    id: 'maya', name: 'Maya', age: 27, distance: 1.2, neighborhood: 'Bandra West',
    grad: 0, rating: 4.9, ratingCount: 23, streak: 41, active: 'now', verified: true,
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
    grad: 1, rating: 4.7, ratingCount: 15, streak: 12, active: '2h', verified: true,
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
    grad: 3, rating: 5.0, ratingCount: 9, streak: 28, active: 'now', verified: false,
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
    grad: 5, rating: 4.6, ratingCount: 19, streak: 7, active: 'today', verified: false,
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
    grad: 4, rating: 4.8, ratingCount: 31, streak: 63, active: 'now', verified: true,
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
    grad: 7, rating: 4.5, ratingCount: 11, streak: 4, active: 'yesterday', verified: false,
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
    grad: 6, rating: 4.9, ratingCount: 17, streak: 22, active: '2h', verified: true,
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
    grad: 2, rating: 4.4, ratingCount: 8, streak: 9, active: 'today', verified: false,
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
    grad: 8, rating: 4.8, ratingCount: 26, streak: 35, active: 'now', verified: true,
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
    grad: 9, rating: 4.7, ratingCount: 13, streak: 19, active: 'now', verified: false,
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
  you: [
    { by: 'Tara', stars: 5, tags: ['Reliable', 'Honest'], text: 'Always checked in on time. Kept me accountable for 6 weeks!' },
    { by: 'Kabir', stars: 4, tags: ['Motivating'], text: 'Great energy. Pushed me on my low days.' },
  ],
};

// Your own profile (defaults; personalized during onboarding & persisted).
const ME = {
  name: 'You', age: 28, neighborhood: 'Bandra West', grad: 0,
  rating: 4.8, ratingCount: 14, streak: 18,
  goals: [
    { cat: 'fitness', text: 'Run a 10K under 60 min', stage: 'Week 4 of 12', progress: 0.42, checkins: 16, target: 36 },
    { cat: 'learning', text: 'Read 12 books this year', stage: '5 / 12 books', progress: 0.41, checkins: 5, target: 12 },
    { cat: 'finance', text: 'Save ₹2,00,000', stage: '₹86k saved', progress: 0.43, checkins: 9, target: 20 },
  ],
  badges: ['🔥 18-day streak', '⭐ 4.8 rated', '🤝 14 partners'],
};

// Pre-seeded matches + chat threads.
const SEED_MATCHES = [
  {
    id: 'maya', sharedGoal: 'Running consistency', daysPaired: 12,
    lastActivity: 'Maya cheered your run 🎉', unread: 2,
    messages: [
      { from: 'them', text: 'Morning! Did you get your run in? ☀️', t: '7:02 AM' },
      { from: 'me', text: 'Just finished 5k 🙌 raining though', t: '7:40 AM' },
      { from: 'them', text: 'Beast. I almost skipped, your text got me out 😅', t: '7:42 AM' },
      { from: 'them', text: 'Same time tomorrow? Streak day 13 👀', t: '7:42 AM' },
    ],
  },
  {
    id: 'noor', sharedGoal: 'Career switch', daysPaired: 5,
    lastActivity: 'You: sending you my case study', unread: 0,
    messages: [
      { from: 'them', text: 'How did the mock interview go?', t: 'Yesterday' },
      { from: 'me', text: 'Nervous but okay! Want to review my answers?', t: 'Yesterday' },
      { from: 'them', text: 'Yes! Send them over, I’ll mark them up tonight 💪', t: 'Yesterday' },
    ],
  },
];

// People who already liked you (instant match on connect).
const LIKES_YOU = ['aisha', 'kabir', 'priya'];

// Activity / notifications feed.
const ACTIVITY = [
  { kind: 'like',    icon: '💛', who: 'aisha', text: 'Aisha wants to pair up with you', time: '5m' },
  { kind: 'rating',  icon: '⭐', who: 'maya',  text: 'Maya rated you 5★ — “so reliable”', time: '1h' },
  { kind: 'checkin', icon: '✅', who: 'noor',  text: 'Noor checked in: 2 case studies done', time: '3h' },
  { kind: 'streak',  icon: '🔥', who: null,    text: 'You’re on an 18-day streak. Check in to keep it!', time: '6h' },
  { kind: 'like',    icon: '💛', who: 'kabir', text: 'Kabir wants to pair up with you', time: '1d' },
  { kind: 'match',   icon: '🤝', who: 'priya', text: 'You and Priya could be a 90% match', time: '1d' },
];

// Copy that changes with the selected tone (Design Lab variation).
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

window.TANDEM = { CATEGORIES, AVATAR_GRADIENTS, PEOPLE, REVIEWS, ME, SEED_MATCHES, LIKES_YOU, ACTIVITY, TONE_COPY };
