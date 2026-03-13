import avatarImage from '../assets/avartar.jpg'
import f1Image from '../assets/f1.jpg'
import ufcImage from '../assets/ufc.jpg'
import blueImage from '../assets/movie-tv/placeholder-blue.svg'
import coralImage from '../assets/movie-tv/placeholder-coral.svg'
import emeraldImage from '../assets/movie-tv/placeholder-emerald.svg'
import goldImage from '../assets/movie-tv/placeholder-gold.svg'
import roseImage from '../assets/movie-tv/placeholder-rose.svg'
import violetImage from '../assets/movie-tv/placeholder-violet.svg'

export type MovieTvCategory = {
  id: string
  label: string
  accent: string
}

export type MovieTvTile = {
  id: string
  categoryId: string
  title: string
  subtitle: string
  description: string
  badge: string
  image: string
  accent: string
  videoUrl: string
}

function tile(
  id: string,
  categoryId: string,
  title: string,
  subtitle: string,
  description: string,
  badge: string,
  image: string,
  accent: string,
  videoUrl: string,
): MovieTvTile {
  return {
    id,
    categoryId,
    title,
    subtitle,
    description,
    badge,
    image,
    accent,
    videoUrl,
  }
}

const demoUrls = {
  animation: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ',
  family: 'https://www.youtube.com/watch?v=ScMzIvxBSi4',
  education: 'https://www.youtube.com/watch?v=ysz5S6PUM-U',
  science: 'https://www.youtube.com/watch?v=jNQXAC9IVRw',
  music: 'https://www.youtube.com/watch?v=5qap5aO4i9A',
  sports: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ',
  gaming: 'https://www.youtube.com/watch?v=ysz5S6PUM-U',
  travel: 'https://www.youtube.com/watch?v=ScMzIvxBSi4',
  food: 'https://www.youtube.com/watch?v=jNQXAC9IVRw',
  animals: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ',
  drama: 'https://www.youtube.com/watch?v=ScMzIvxBSi4',
  movies: 'https://www.youtube.com/watch?v=ysz5S6PUM-U',
  crafts: 'https://www.youtube.com/watch?v=jNQXAC9IVRw',
  nature: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ',
  variety: 'https://www.youtube.com/watch?v=ScMzIvxBSi4',
} as const

export const movieTvTabs: MovieTvCategory[] = [
  { id: 'animation', label: 'Animation', accent: '#ff8b6b' },
  { id: 'family', label: 'Family', accent: '#ffb252' },
  { id: 'education', label: 'Education', accent: '#7dc36d' },
  { id: 'science', label: 'Science', accent: '#66a6ff' },
  { id: 'music', label: 'Music', accent: '#d56cff' },
  { id: 'sports', label: 'Sports', accent: '#49c37b' },
  { id: 'gaming', label: 'Gaming', accent: '#6d7dff' },
  { id: 'travel', label: 'Travel', accent: '#45c7d6' },
  { id: 'food', label: 'Food', accent: '#ff944f' },
  { id: 'animals', label: 'Animals', accent: '#ef7a65' },
  { id: 'drama', label: 'Drama', accent: '#cb5984' },
  { id: 'movies', label: 'Movies', accent: '#8f7bff' },
  { id: 'crafts', label: 'Crafts', accent: '#f0aa45' },
  { id: 'nature', label: 'Nature', accent: '#5daf73' },
  { id: 'variety', label: 'Variety', accent: '#ff6f91' },
]

export const movieTvTiles: MovieTvTile[] = [
  tile('animation-1', 'animation', 'Pixel Friends', 'Bright shorts for quick picks', 'Animation items are verified one by one before playback.', 'Recommended', coralImage, '#ff8b6b', demoUrls.animation),
  tile('animation-2', 'animation', 'Orbit Camp', 'Imaginative stories with light pacing', 'If the user clicks this before verification completes, it jumps to the front of the queue.', 'New', violetImage, '#f39b57', demoUrls.animation),
  tile('animation-3', 'animation', 'Color Quest', 'Weekend animation with a softer tone', 'Only this category stays visible while Animation is selected.', 'Kids Pick', goldImage, '#ffb252', demoUrls.animation),

  tile('family-1', 'family', 'Family Trip', 'Shared viewing for the evening', 'Family recommendations are filtered to this category only.', 'Family', goldImage, '#ffb252', demoUrls.family),
  tile('family-2', 'family', 'Camp Story', 'Warm variety-style family viewing', 'If harmful or violent signals are detected, the card is removed from the row.', 'Together', coralImage, '#f3a24e', demoUrls.family),
  tile('family-3', 'family', 'Movie Night', 'Low-friction pick for a shared screen', 'Background verification resumes after priority checks finish.', 'Safe Pick', avatarImage, '#d78667', demoUrls.family),

  tile('education-1', 'education', 'Science Note', 'Short learning clips for focus time', 'Education videos keep the same queue and playback rules.', 'Learn', emeraldImage, '#7dc36d', demoUrls.education),
  tile('education-2', 'education', 'History Brief', 'Simple explainers for quick review', 'Clicked videos are verified first, then the old order continues.', 'Focus', blueImage, '#89c16f', demoUrls.education),
  tile('education-3', 'education', 'Maker Junior', 'Hands-on lessons for follow-along viewing', 'Verification state stays attached to each card.', 'Practice', goldImage, '#a1c465', demoUrls.education),

  tile('science-1', 'science', 'Space Log', 'Visual science storytelling', 'Science picks keep other categories hidden until you switch tabs.', 'Docu', blueImage, '#66a6ff', demoUrls.science),
  tile('science-2', 'science', 'Lab Brief', 'Quick explainers with crisp pacing', 'The queue verifies the selected category in order.', 'Fresh', violetImage, '#6d91f2', demoUrls.science),
  tile('science-3', 'science', 'Sky Timelapse', 'Quiet observation with longer shots', 'A verified card can open immediately on click.', 'Calm', emeraldImage, '#79b1ff', demoUrls.science),

  tile('music-1', 'music', 'Red Stage', 'Live performance highlights', 'Music recommendations are checked in the same sequential queue.', 'Live', roseImage, '#d56cff', demoUrls.music),
  tile('music-2', 'music', 'Night Playlist', 'Background music for relaxed viewing', 'The UI shows whether a card is waiting, checking, or verified.', 'Background', violetImage, '#c06dff', demoUrls.music),
  tile('music-3', 'music', 'Weekend Rhythm', 'Light energy for casual playback', 'Unverified cards switch to priority verification when clicked.', 'Mood', coralImage, '#e46cf4', demoUrls.music),

  tile('sports-1', 'sports', 'Champions Match', 'Fast sports highlight package', 'Sports cards also drop out if harmful or violent detection is triggered.', 'Popular', emeraldImage, '#49c37b', demoUrls.sports),
  tile('sports-2', 'sports', 'Race Day', 'Speed-focused recap cards', 'The queue follows the active category only.', 'Highlights', f1Image, '#58b86e', demoUrls.sports),
  tile('sports-3', 'sports', 'Weekend Replay', 'Short sports viewing for quick checks', 'Already verified items can play right away.', 'Quick Pick', blueImage, '#74d388', demoUrls.sports),

  tile('gaming-1', 'gaming', 'Level Up Guide', 'Game tactics and strategy recaps', 'Gaming cards stay visible only inside the Gaming category.', 'Gaming', violetImage, '#6d7dff', demoUrls.gaming),
  tile('gaming-2', 'gaming', 'Arcade Rush', 'Challenge-style fast edits', 'A clicked gaming card interrupts the queue and goes first.', 'Priority', ufcImage, '#6870e0', demoUrls.gaming),
  tile('gaming-3', 'gaming', 'Team Brief', 'Co-op watch with lighter pacing', 'Once it is checked, the queue resumes its previous work.', 'Co-op', blueImage, '#7f8bff', demoUrls.gaming),

  tile('travel-1', 'travel', 'City Walk', 'Urban scenes for lighter browsing', 'Travel selection hides the rest and keeps only matching recommendations.', 'Travel', blueImage, '#45c7d6', demoUrls.travel),
  tile('travel-2', 'travel', 'Sea Drive', 'Slow moving travel footage', 'Travel cards continue background checking in order.', 'Drive', avatarImage, '#4db6cb', demoUrls.travel),
  tile('travel-3', 'travel', 'Lane Stroll', 'Short location-based viewing', 'Priority verification still works during travel queue checks.', 'Stroll', goldImage, '#67d0da', demoUrls.travel),

  tile('food-1', 'food', 'Daily Kitchen', 'Simple recipe-style viewing', 'Food cards report their verification state in the panel.', 'Cooking', coralImage, '#ff944f', demoUrls.food),
  tile('food-2', 'food', 'Chef Table', 'Calmer food storytelling', 'If harmful content is detected, the recommendation is removed.', 'Recipe', roseImage, '#ef8a42', demoUrls.food),
  tile('food-3', 'food', 'Weekend Dessert', 'Soft and casual watch for shorter sessions', 'Verified items are ready to open immediately.', 'Baking', goldImage, '#ffab69', demoUrls.food),

  tile('animals-1', 'animals', 'Animal Friends', 'Gentle clips for easy viewing', 'Animals keeps the same sequential verification rules.', 'Pets', coralImage, '#ef7a65', demoUrls.animals),
  tile('animals-2', 'animals', 'Field Journal', 'Observation-heavy quiet viewing', 'If you click during background checks, this card moves up.', 'Observe', emeraldImage, '#e38274', demoUrls.animals),
  tile('animals-3', 'animals', 'Wild Track', 'Nature-style animal stories', 'Verified safe cards stay available for playback.', 'Nature', goldImage, '#f08d7e', demoUrls.animals),

  tile('drama-1', 'drama', 'Deep City', 'High-focus dramatic storytelling', 'Drama category now shows only drama recommendations.', 'Drama', roseImage, '#cb5984', demoUrls.drama),
  tile('drama-2', 'drama', 'Retro Reply', 'Conversation-led, softer drama pacing', 'When already verified, clicking opens the video immediately.', 'Binge', coralImage, '#d26d92', demoUrls.drama),
  tile('drama-3', 'drama', 'Forest Signal', 'Suspense-driven story flow', 'Unsafe cards are dropped from the list after verification.', 'Focus', violetImage, '#b0527d', demoUrls.drama),

  tile('movies-1', 'movies', 'Dune Window', 'Large-screen movie mood card', 'Movie rows also process in sequence inside the active tab.', 'Movie', goldImage, '#8f7bff', demoUrls.movies),
  tile('movies-2', 'movies', 'Avatar Sky', 'Visual-first blockbuster pick', 'If not checked yet, this card is verified first after the click.', 'Blockbuster', avatarImage, '#7e8cff', demoUrls.movies),
  tile('movies-3', 'movies', 'Sherlock Frame', 'Mystery-driven feature pick', 'Verification is separate from playback until the result is known.', 'Mystery', violetImage, '#9488ff', demoUrls.movies),

  tile('crafts-1', 'crafts', 'Handmade Day', 'Follow-along project viewing', 'Crafts uses the same priority verification flow.', 'DIY', goldImage, '#f0aa45', demoUrls.crafts),
  tile('crafts-2', 'crafts', 'Mini Project', 'Short creative tasks for the screen', 'Playback opens only after this card reaches verified state.', 'Hobby', emeraldImage, '#e5a24a', demoUrls.crafts),
  tile('crafts-3', 'crafts', 'Weekend Build', 'Low-pressure making content', 'The previous queue order resumes after the clicked card is resolved.', 'Create', coralImage, '#f7b35d', demoUrls.crafts),

  tile('nature-1', 'nature', 'Forest Morning', 'Quiet landscape viewing', 'Nature cards stay in a calmer recommendation lane.', 'Healing', emeraldImage, '#5daf73', demoUrls.nature),
  tile('nature-2', 'nature', 'Wind and Clouds', 'Ambient nature background playback', 'Detection results update the recommendation list immediately.', 'Ambient', blueImage, '#62b67c', demoUrls.nature),
  tile('nature-3', 'nature', 'Lake Walk', 'Slow documentary-style nature footage', 'Once checked, it drops out of the queue and stays ready.', 'Calm', goldImage, '#79c18d', demoUrls.nature),

  tile('variety-1', 'variety', 'Solo Signal', 'Talk-driven variety recommendation', 'Variety selection now keeps only variety recommendations visible.', 'Variety', roseImage, '#ff6f91', demoUrls.variety),
  tile('variety-2', 'variety', 'Transfer Talk', 'Trending reality-style selection', 'Even during queue work, a click can push this card to the front.', 'Trending', coralImage, '#f96f9f', demoUrls.variety),
  tile('variety-3', 'variety', 'Story Relay', 'Narrative-first studio format', 'Rejected cards disappear once harmful or violent signals are confirmed.', 'Story', violetImage, '#ff8dab', demoUrls.variety),
]
