export type Spotlight = {
  id: string
  title: string
  subtitle: string
  description: string
  eyebrow: string
  meta: string[]
  chips: string[]
  progress?: number
  accent: string
  backdrop: string
}

export type SidebarItem = {
  id: string
  label: string
  shortLabel: string
  hint: string
}

export type QuickApp = {
  id: string
  name: string
  category: string
  shortcut: string
  accent: string
  spotlight: Spotlight
}

export type MediaItem = Spotlight & {
  badge?: string
  match: string
}

export type MediaRow = {
  id: string
  title: string
  description: string
  items: MediaItem[]
}

export const sidebarItems: SidebarItem[] = [
  { id: 'home', label: 'Home', shortLabel: 'HM', hint: 'Main shelf' },
  { id: 'search', label: 'Search', shortLabel: 'SR', hint: 'Look up titles' },
  { id: 'live', label: 'Live', shortLabel: 'LV', hint: 'Channels and events' },
  { id: 'apps', label: 'Apps', shortLabel: 'AP', hint: 'Pinned services' },
  { id: 'settings', label: 'Settings', shortLabel: 'ST', hint: 'Profiles and sound' },
]

export const quickApps: QuickApp[] = [
  {
    id: 'youtube',
    name: 'YouTube',
    category: 'Video',
    shortcut: 'YT',
    accent: '#ff4d4d',
    spotlight: {
      id: 'app-youtube',
      title: 'YouTube',
      subtitle: 'Creator hub with live streams, shorts, and long-form video.',
      description:
        'Launch the trending feed, jump into subscriptions, or continue the last playlist from the living room view.',
      eyebrow: 'Pinned app',
      meta: ['Live now', '4K', 'Personalized'],
      chips: ['Subscriptions', 'Gaming', 'Music'],
      accent: '#ff4d4d',
      backdrop:
        'radial-gradient(circle at 78% 18%, rgba(255, 77, 77, 0.45), transparent 0 34%), linear-gradient(135deg, #221216 0%, #12141c 45%, #090b10 100%)',
    },
  },
  {
    id: 'netflix',
    name: 'Netflix',
    category: 'Series',
    shortcut: 'NF',
    accent: '#d61f2c',
    spotlight: {
      id: 'app-netflix',
      title: 'Netflix',
      subtitle: 'Continue watching, top 10, and profile-driven picks.',
      description:
        'A dramatic row-first experience with fast resume, polished transitions, and personalized rails.',
      eyebrow: 'Pinned app',
      meta: ['Top 10', 'Dolby Vision', 'Profiles'],
      chips: ['Continue watching', 'New releases', 'My list'],
      accent: '#d61f2c',
      backdrop:
        'radial-gradient(circle at 72% 22%, rgba(214, 31, 44, 0.48), transparent 0 34%), linear-gradient(135deg, #1f1217 0%, #141720 52%, #090b10 100%)',
    },
  },
  {
    id: 'disney',
    name: 'Disney+',
    category: 'Family',
    shortcut: 'DS',
    accent: '#4f8cff',
    spotlight: {
      id: 'app-disney',
      title: 'Disney+',
      subtitle: 'Family entertainment, franchises, and bright hero artwork.',
      description:
        'The home shelf can jump directly into branded hubs, featured franchises, and kids-safe navigation zones.',
      eyebrow: 'Pinned app',
      meta: ['Family', 'IMAX Enhanced', 'Kids'],
      chips: ['Pixar', 'Marvel', 'Star Wars'],
      accent: '#4f8cff',
      backdrop:
        'radial-gradient(circle at 76% 16%, rgba(79, 140, 255, 0.42), transparent 0 32%), linear-gradient(135deg, #111a2e 0%, #101827 50%, #090b10 100%)',
    },
  },
  {
    id: 'prime',
    name: 'Prime Video',
    category: 'Movies',
    shortcut: 'PV',
    accent: '#32c5ff',
    spotlight: {
      id: 'app-prime',
      title: 'Prime Video',
      subtitle: 'Large hero takeovers, channels, and add-on subscriptions.',
      description:
        'Ideal for a dense storefront style: oversized feature billboards with quick access to rentals and channels.',
      eyebrow: 'Pinned app',
      meta: ['Rentals', 'Channels', 'Sports'],
      chips: ['Channels', 'Store', 'Watch next'],
      accent: '#32c5ff',
      backdrop:
        'radial-gradient(circle at 70% 20%, rgba(50, 197, 255, 0.45), transparent 0 32%), linear-gradient(135deg, #10202c 0%, #101820 48%, #090b10 100%)',
    },
  },
  {
    id: 'gallery',
    name: 'Gallery',
    category: 'Local',
    shortcut: 'GL',
    accent: '#ffa94d',
    spotlight: {
      id: 'app-gallery',
      title: 'Gallery',
      subtitle: 'Screensavers, shared albums, and local media collections.',
      description:
        'Use this space for family photos, ambient backgrounds, and screensaver loops while the launcher remains active.',
      eyebrow: 'Pinned app',
      meta: ['Ambient', 'Shared', 'Local'],
      chips: ['Albums', 'Highlights', 'Screensaver'],
      accent: '#ffa94d',
      backdrop:
        'radial-gradient(circle at 72% 18%, rgba(255, 169, 77, 0.46), transparent 0 32%), linear-gradient(135deg, #27160e 0%, #18181e 48%, #090b10 100%)',
    },
  },
]

export const mediaRows: MediaRow[] = [
  {
    id: 'continue',
    title: 'Continue Watching',
    description: 'Resume the last session with deep-link shortcuts and progress memory.',
    items: [
      {
        id: 'night-agent',
        title: 'Night Agent',
        subtitle: 'Episode 6 queued',
        description: 'Political suspense with a fast cut trailer treatment and a wide-screen hero panel.',
        eyebrow: 'Continue',
        meta: ['Season 2', '42 min', '4K HDR'],
        chips: ['Thriller', 'Resume ready'],
        progress: 64,
        accent: '#e34b56',
        backdrop:
          'radial-gradient(circle at 75% 22%, rgba(227, 75, 86, 0.34), transparent 0 30%), linear-gradient(135deg, #25161b 0%, #171b22 58%, #101216 100%)',
        badge: 'Resume',
        match: '96% match',
      },
      {
        id: 'blue-planet',
        title: 'Blue Planet',
        subtitle: 'Calm documentary shelf',
        description: 'Ocean sequences and deep blue gradients create a premium relaxed streaming look.',
        eyebrow: 'Continue',
        meta: ['Docuseries', '49 min', 'Dolby Atmos'],
        chips: ['Nature', 'Slow TV'],
        progress: 28,
        accent: '#3a9cff',
        backdrop:
          'radial-gradient(circle at 80% 16%, rgba(58, 156, 255, 0.38), transparent 0 30%), linear-gradient(135deg, #0d1c2d 0%, #101926 56%, #0b1016 100%)',
        badge: 'New episode',
        match: '94% match',
      },
      {
        id: 'arcade-rush',
        title: 'Arcade Rush',
        subtitle: 'Bright, energetic competition series',
        description: 'Neon accents and motion-heavy cards fit a fast service launcher with action rails.',
        eyebrow: 'Continue',
        meta: ['Reality', '38 min', '5.1'],
        chips: ['Competition', 'Party'],
        progress: 82,
        accent: '#ff9f43',
        backdrop:
          'radial-gradient(circle at 76% 20%, rgba(255, 159, 67, 0.42), transparent 0 30%), linear-gradient(135deg, #2c1a10 0%, #18171d 56%, #0b1016 100%)',
        badge: 'Ending soon',
        match: '91% match',
      },
      {
        id: 'last-frontier',
        title: 'Last Frontier',
        subtitle: 'Cinematic sci-fi adventure',
        description: 'Large-scale science fiction with a colder palette for the marquee section.',
        eyebrow: 'Continue',
        meta: ['Sci-fi', '55 min', 'IMAX'],
        chips: ['Epic', 'Space'],
        progress: 12,
        accent: '#7d7cff',
        backdrop:
          'radial-gradient(circle at 74% 18%, rgba(125, 124, 255, 0.38), transparent 0 30%), linear-gradient(135deg, #15152c 0%, #131a24 56%, #0b1016 100%)',
        badge: 'Watch next',
        match: '89% match',
      },
      {
        id: 'chef-table',
        title: 'Chef Table',
        subtitle: 'Food stories and warm dramatic tones',
        description: 'An intimate food shelf with warm color blocking and polished metadata chips.',
        eyebrow: 'Continue',
        meta: ['Food', '31 min', '4K'],
        chips: ['Documentary', 'Food'],
        progress: 46,
        accent: '#d88c38',
        backdrop:
          'radial-gradient(circle at 78% 20%, rgba(216, 140, 56, 0.42), transparent 0 30%), linear-gradient(135deg, #25180f 0%, #18181d 56%, #0b1016 100%)',
        badge: 'Recommended',
        match: '88% match',
      },
    ],
  },
  {
    id: 'trending',
    title: 'Trending Now',
    description: 'Bold hero art and fast hover previews for the most popular titles.',
    items: [
      {
        id: 'deep-city',
        title: 'Deep City',
        subtitle: 'Dark crime anthology',
        description: 'A moody flagship card with deep reds and layered gradients for premium drama titles.',
        eyebrow: 'Trending',
        meta: ['Crime', '8 episodes', '4K HDR'],
        chips: ['Anthology', 'Noir'],
        accent: '#db5064',
        backdrop:
          'radial-gradient(circle at 74% 18%, rgba(219, 80, 100, 0.4), transparent 0 32%), linear-gradient(135deg, #231217 0%, #17171f 56%, #0b1016 100%)',
        badge: 'Top 10',
        match: '98% match',
      },
      {
        id: 'race-day',
        title: 'Race Day',
        subtitle: 'Live motor highlights',
        description: 'Sports-focused presentation with sharp typography and vibrant cyan streaks.',
        eyebrow: 'Trending',
        meta: ['Sports', 'Live', '5.1'],
        chips: ['Highlights', 'Motorsport'],
        accent: '#24d3ee',
        backdrop:
          'radial-gradient(circle at 72% 18%, rgba(36, 211, 238, 0.38), transparent 0 32%), linear-gradient(135deg, #0e2227 0%, #101923 56%, #0b1016 100%)',
        badge: 'Live',
        match: '93% match',
      },
      {
        id: 'golden-hour',
        title: 'Golden Hour',
        subtitle: 'Warm coming-of-age drama',
        description: 'Soft amber lighting and a gentle hero gradient tuned for prestige drama.',
        eyebrow: 'Trending',
        meta: ['Drama', 'Movie', 'Dolby Vision'],
        chips: ['Award buzz', 'Emotional'],
        accent: '#ffb057',
        backdrop:
          'radial-gradient(circle at 76% 18%, rgba(255, 176, 87, 0.42), transparent 0 32%), linear-gradient(135deg, #27180f 0%, #19191f 56%, #0b1016 100%)',
        badge: 'Critics pick',
        match: '90% match',
      },
      {
        id: 'zero-signal',
        title: 'Zero Signal',
        subtitle: 'Tense tech thriller',
        description: 'Crisp cyber styling, high-contrast overlays, and a sleek tension-heavy palette.',
        eyebrow: 'Trending',
        meta: ['Thriller', 'Movie', 'Atmos'],
        chips: ['Cyber', 'Mystery'],
        accent: '#8e7bff',
        backdrop:
          'radial-gradient(circle at 72% 18%, rgba(142, 123, 255, 0.4), transparent 0 32%), linear-gradient(135deg, #17142d 0%, #151922 56%, #0b1016 100%)',
        badge: 'Popular',
        match: '92% match',
      },
      {
        id: 'the-rally',
        title: 'The Rally',
        subtitle: 'Underdog sports documentary',
        description: 'A grounded sports title built around strong metadata and resilient team branding.',
        eyebrow: 'Trending',
        meta: ['Sports doc', '6 episodes', '4K'],
        chips: ['Inspiring', 'Team'],
        accent: '#57d46c',
        backdrop:
          'radial-gradient(circle at 76% 18%, rgba(87, 212, 108, 0.4), transparent 0 32%), linear-gradient(135deg, #102417 0%, #151b20 56%, #0b1016 100%)',
        badge: 'New',
        match: '87% match',
      },
    ],
  },
  {
    id: 'family',
    title: 'Family Picks',
    description: 'Brighter palettes and simpler cards for shared living room browsing.',
    items: [
      {
        id: 'starlight-labs',
        title: 'Starlight Labs',
        subtitle: 'Family sci-fi adventure',
        description: 'Upbeat exploration series with clean blue gradients and friendly pacing.',
        eyebrow: 'Family',
        meta: ['Family', '24 min', '4K'],
        chips: ['Adventure', 'Kids'],
        accent: '#63b3ff',
        backdrop:
          'radial-gradient(circle at 76% 18%, rgba(99, 179, 255, 0.38), transparent 0 32%), linear-gradient(135deg, #102131 0%, #141a24 56%, #0b1016 100%)',
        badge: 'All ages',
        match: '95% match',
      },
      {
        id: 'camp-cosmos',
        title: 'Camp Cosmos',
        subtitle: 'Animated summer space camp',
        description: 'Playful colors and compact metadata for younger-audience rows.',
        eyebrow: 'Family',
        meta: ['Animation', '22 min', '5.1'],
        chips: ['Comedy', 'Kids'],
        accent: '#ff82b2',
        backdrop:
          'radial-gradient(circle at 76% 18%, rgba(255, 130, 178, 0.42), transparent 0 32%), linear-gradient(135deg, #2a1420 0%, #171922 56%, #0b1016 100%)',
        badge: 'Fun',
        match: '90% match',
      },
      {
        id: 'maker-junior',
        title: 'Maker Junior',
        subtitle: 'DIY challenges and invention clips',
        description: 'An educational slot with tactile visual cues and bright utility colors.',
        eyebrow: 'Family',
        meta: ['Educational', '18 min', 'HD'],
        chips: ['DIY', 'Learning'],
        accent: '#f3c84c',
        backdrop:
          'radial-gradient(circle at 78% 18%, rgba(243, 200, 76, 0.4), transparent 0 32%), linear-gradient(135deg, #2b210f 0%, #191a20 56%, #0b1016 100%)',
        badge: 'Smart pick',
        match: '88% match',
      },
      {
        id: 'pixel-pets',
        title: 'Pixel Pets',
        subtitle: 'Charming short-form animated stories',
        description: 'Short-form episodes that suit quick interactions and fast home screen previews.',
        eyebrow: 'Family',
        meta: ['Animation', '11 min', '4K'],
        chips: ['Shorts', 'Playful'],
        accent: '#78e3b2',
        backdrop:
          'radial-gradient(circle at 74% 18%, rgba(120, 227, 178, 0.38), transparent 0 32%), linear-gradient(135deg, #10221d 0%, #141a22 56%, #0b1016 100%)',
        badge: 'Shorts',
        match: '91% match',
      },
      {
        id: 'junior-chefs',
        title: 'Junior Chefs',
        subtitle: 'Kitchen adventures',
        description: 'Warm homey visuals for cozy shared viewing in the launcher.',
        eyebrow: 'Family',
        meta: ['Food', '20 min', 'HD'],
        chips: ['Cooking', 'Competition'],
        accent: '#ffa760',
        backdrop:
          'radial-gradient(circle at 78% 18%, rgba(255, 167, 96, 0.4), transparent 0 32%), linear-gradient(135deg, #2b1b10 0%, #191a20 56%, #0b1016 100%)',
        badge: 'Weekend',
        match: '86% match',
      },
    ],
  },
]

export const initialSpotlight = mediaRows[0].items[0]
