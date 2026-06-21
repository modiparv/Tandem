/* =========================================================================
   Tandem — mock data
   No backend, no external images. Avatars are generated gradients + monograms.
   ========================================================================= */

const CATEGORIES = {
  fitness:   { label: 'Fitness & health',     emoji: '💪', color: '#FF6B5C' },
  career:    { label: 'Career & business',    emoji: '💼', color: '#F5A623' },
  travel:    { label: 'Travel & adventure',   emoji: '✈️', color: '#FF8A5B' },
  finance:   { label: 'Financial goals',      emoji: '💰', color: '#E0A52E' },
  habits:    { label: 'Habits & lifestyle',   emoji: '🌱', color: '#E07A87' },
  learning:  { label: 'Learning a skill',     emoji: '📚', color: '#B5838D' },
};

// Two-stop gradients used for the generated portrait cards.
const AVATAR_GRADIENTS = [
  ['#FF6B5C', '#FFB23E'],
  ['#FF8A5B', '#F6C453'],
  ['#F5A623', '#FF6B5C'],
  ['#E07A87', '#FFB23E'],
  ['#FF7E79', '#FFC36E'],
  ['#FFA15C', '#FF6B8B'],
  ['#F49E4C', '#EF767A'],
  ['#FF9966', '#FF5E62'],
];

// Mock candidate deck. distance in km. rating out of 5, count = # of past partners.
const PEOPLE = [
  {
    id: 'maya', name: 'Maya', age: 27, distance: 1.2, neighborhood: 'Bandra West',
    grad: 0, rating: 4.9, ratingCount: 23, streak: 41,
    primary: 'fitness',
    headline: 'Training for my first half-marathon 🏃‍♀️',
    bio: "5am runner trying to stay consistent. Need someone to text 'we run today' when it rains. I'll do the same for you.",
    goals: [
      { cat: 'fitness', text: 'Run a half-marathon in October', stage: 'Week 6 of 16' },
      { cat: 'habits', text: 'Sleep before 11pm', stage: 'Building' },
    ],
    tags: ['Early bird', 'Reliable', 'Runner'],
    shared: 'You both want to run a 10K+',
    badges: ['🔥 41-day streak', '🏅 Top rated'],
  },
  {
    id: 'dev', name: 'Dev', age: 31, distance: 2.4, neighborhood: 'Powai',
    grad: 1, rating: 4.7, ratingCount: 15, streak: 12,
    primary: 'career',
    headline: 'Leaving my job to launch a SaaS 🚀',
    bio: 'Shipping in public. Looking for a founder buddy for weekly check-ins, brutal honesty and shared wins.',
    goals: [
      { cat: 'career', text: 'Get first 100 paying users', stage: '12 / 100' },
      { cat: 'learning', text: 'Learn to code the MVP myself', stage: 'In progress' },
    ],
    tags: ['Builder', 'Direct', 'Ambitious'],
    shared: 'You both picked Career & business',
    badges: ['🚀 Builder', '💬 Great communicator'],
  },
  {
    id: 'aisha', name: 'Aisha', age: 24, distance: 0.8, neighborhood: 'Andheri',
    grad: 3, rating: 5.0, ratingCount: 9, streak: 28,
    primary: 'finance',
    headline: 'Saving for 6 months of runway 💰',
    bio: 'No-spend challenges are more fun with company. Let’s keep each other off the impulse-buy button.',
    goals: [
      { cat: 'finance', text: 'Save ₹3,00,000 emergency fund', stage: '64% there' },
      { cat: 'habits', text: 'Cook 5 nights a week', stage: 'On track' },
    ],
    tags: ['Frugal', 'Consistent', 'Wholesome'],
    shared: 'You both want to save aggressively',
    badges: ['⭐ Perfect 5.0', '🌱 Habit master'],
  },
  {
    id: 'leo', name: 'Leo', age: 29, distance: 3.1, neighborhood: 'Lower Parel',
    grad: 5, rating: 4.6, ratingCount: 19, streak: 7,
    primary: 'learning',
    headline: 'Learning guitar before I turn 30 🎸',
    bio: '30 minutes a day, no excuses. Would love a practice partner to swap clips and keep the streak alive.',
    goals: [
      { cat: 'learning', text: 'Play one full song cleanly', stage: '2 / 1 song' },
      { cat: 'fitness', text: 'Do 50 pushups in a row', stage: '31 max' },
    ],
    tags: ['Creative', 'Night owl', 'Patient'],
    shared: 'You both are learning a new skill',
    badges: ['🎸 Skill seeker', '🤝 12 partners helped'],
  },
  {
    id: 'priya', name: 'Priya', age: 33, distance: 1.9, neighborhood: 'Juhu',
    grad: 4, rating: 4.8, ratingCount: 31, streak: 63,
    primary: 'habits',
    headline: 'Quit sugar, building a meditation habit 🌱',
    bio: 'Down 9kg this year. I’m great at the gentle nudge. Looking for someone who actually wants the nudge.',
    goals: [
      { cat: 'habits', text: 'Meditate 10 min daily', stage: '63-day streak' },
      { cat: 'fitness', text: 'Yoga 4x a week', stage: 'On track' },
    ],
    tags: ['Calm', 'Encouraging', 'Disciplined'],
    shared: 'You both want better daily habits',
    badges: ['🔥 63-day streak', '🏅 Top rated'],
  },
  {
    id: 'sam', name: 'Sam', age: 26, distance: 4.6, neighborhood: 'Colaba',
    grad: 7, rating: 4.5, ratingCount: 11, streak: 4,
    primary: 'travel',
    headline: 'Planning a solo trek to Ladakh 🏔️',
    bio: 'Saving + training + planning. Want a partner to keep the prep on schedule (and maybe share an itinerary).',
    goals: [
      { cat: 'travel', text: 'Trek Markha Valley in September', stage: 'Planning' },
      { cat: 'fitness', text: 'Build trekking stamina', stage: 'Week 2' },
    ],
    tags: ['Adventurous', 'Spontaneous', 'Outdoorsy'],
    shared: 'You both want a big adventure',
    badges: ['✈️ Explorer', '🗺️ Planner'],
  },
  {
    id: 'noor', name: 'Noor', age: 28, distance: 2.0, neighborhood: 'Khar',
    grad: 6, rating: 4.9, ratingCount: 17, streak: 22,
    primary: 'career',
    headline: 'Switching into product management 💼',
    bio: 'Doing case studies every week. Want a study buddy to review answers and do mock interviews.',
    goals: [
      { cat: 'career', text: 'Land a PM role by Q4', stage: '4 interviews' },
      { cat: 'learning', text: 'Finish PM course', stage: '70%' },
    ],
    tags: ['Sharp', 'Organised', 'Supportive'],
    shared: 'You both are leveling up careers',
    badges: ['💼 Career switcher', '⭐ 4.9 rated'],
  },
  {
    id: 'arjun', name: 'Arjun', age: 30, distance: 5.3, neighborhood: 'Dadar',
    grad: 2, rating: 4.4, ratingCount: 8, streak: 9,
    primary: 'fitness',
    headline: 'Back to the gym after 2 years 🏋️',
    bio: 'Consistency over intensity. Need a check-in buddy so I actually show up on the hard days.',
    goals: [
      { cat: 'fitness', text: 'Gym 3x a week for 90 days', stage: '9 / 90 days' },
      { cat: 'habits', text: 'Drink 3L water daily', stage: 'Building' },
    ],
    tags: ['Determined', 'Friendly', 'Comeback'],
    shared: 'You both picked Fitness & health',
    badges: ['🏋️ Comeback kid', '🤝 Team player'],
  },
];

// Reviews shown on a profile (what past partners said).
const REVIEWS = {
  maya: [
    { by: 'Rohan', stars: 5, tags: ['Reliable', 'Motivating'], text: 'Texted me every single morning. I never skipped a run.' },
    { by: 'Ira', stars: 5, tags: ['Encouraging'], text: 'The most consistent partner I’ve had on here.' },
  ],
  you: [
    { by: 'Tara', stars: 5, tags: ['Reliable', 'Honest'], text: 'Always checked in on time. Kept me accountable for 6 weeks!' },
    { by: 'Kabir', stars: 4, tags: ['Motivating'], text: 'Great energy. Pushed me on my low days.' },
  ],
};

// Your own profile.
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

// Pre-seeded matches + chat threads for the demo.
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
    checkin: { label: 'Today’s goal', text: 'Run 5k', done: true },
  },
  {
    id: 'noor', sharedGoal: 'Career switch', daysPaired: 5,
    lastActivity: 'You: sending you my case study', unread: 0,
    messages: [
      { from: 'them', text: 'How did the mock interview go?', t: 'Yesterday' },
      { from: 'me', text: 'Nervous but okay! Want to review my answers?', t: 'Yesterday' },
      { from: 'them', text: 'Yes! Send them over, I’ll mark them up tonight 💪', t: 'Yesterday' },
    ],
    checkin: { label: 'This week', text: '2 case studies', done: false },
  },
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
    sendRequest: 'Send a pairing request',
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
    sendRequest: 'Ask to connect',
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
    sendRequest: 'Request partner',
    chatHint: 'No streak left behind.',
  },
};

window.TANDEM = { CATEGORIES, AVATAR_GRADIENTS, PEOPLE, REVIEWS, ME, SEED_MATCHES, TONE_COPY };
