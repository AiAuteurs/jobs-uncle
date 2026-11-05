// Synthetic fixtures modeled on DJ's description of the pasted Krea text.
// NOTE: not the real paste; swap in the real text with `node test.js path/to/krea.txt`.
const KREA_JD = `Krea is building the creative suite for AI-native image and video. We're a small team in San Francisco shipping fast.

About Krea
We make generative tools that artists actually want to use.

What you'll do
• Own the visual voice of Krea across launch films, product demos, and social.
• Direct and edit short-form video from concept to delivery.
• Partner with product and engineering on launches.

What we're looking for
• 7+ years in creative direction or senior editing.
• A reel that shows taste and pace.
• Comfort with C++ shaders is a plus, not a must. Benefits of working here: equity, lunch, a lot of GPUs.

Compensation
$180K - $240K + equity. This role is based in San Francisco, about the company's office in SoMa (hybrid, 3 days).`

const card = i => `Job card ${i} title\nCompany ${i}\nSan Francisco, CA (Hybrid)\nPromoted\n·\nEasy Apply\n`
const SEARCH_VIEW_TEXT = [
  'Skip to main content', 'Jobs', 'Creative lead', 'San Francisco Bay Area',
  'Date posted', 'Experience level', 'Remote', 'Easy Apply', 'All filters',
  '99+ results', 'San Francisco Bay Area', 'Set alert',
  ...Array.from({ length: 30 }, (_, i) => card(i + 1)),
  'Krea', 'Creative Lead', 'San Francisco, CA · 2 days ago · Over 100 applicants',
  'Hybrid', 'Full-time', 'Easy Apply', 'Save',
  'Tailor Resume for This Job',
  'Job match is high', 'Show match details', 'Tailor my resume', 'Help me stand out', 'Create cover letter',
  'About the job',
  KREA_JD,
  '… more',
  'Benefits found in job post', 'Medical insurance', 'Vision insurance', '401(k)',
  'See how you compare to over 100 other applicants.',
  'Exclusive Job Seeker Insights', 'Applicants for this job', '45% Senior level',
  'About the company', 'Krea', '1,204 followers',
].join('\n')

const VIEW_PAGE_TEXT = [
  'Krea', 'Creative Lead', 'San Francisco, CA · Reposted 1 week ago',
  'Apply', 'Save', 'Show match details',
  'About the job', KREA_JD, 'Show less',
  'Meet the hiring team', 'Jane Doe', 'Head of Brand',
  'About the company', 'Krea',
].join('\n')

// Inline "… more" glued to the last visible line
const INLINE_MORE_TEXT = `Header junk\nAbout the job\nFirst paragraph.\nLast line of the JD here… more\nBenefits found in job post\n401(k)`

module.exports = { KREA_JD, SEARCH_VIEW_TEXT, VIEW_PAGE_TEXT, INLINE_MORE_TEXT }
