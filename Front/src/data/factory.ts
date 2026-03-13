import type { MediaItem, Spotlight } from './home'

export function createSpotlight(
  id: string,
  title: string,
  subtitle: string,
  description: string,
  eyebrow: string,
  meta: string[],
  chips: string[],
  accent: string,
  backdrop: string,
  progress?: number,
): Spotlight {
  return {
    id,
    title,
    subtitle,
    description,
    eyebrow,
    meta,
    chips,
    accent,
    backdrop,
    progress,
  }
}

export function createMediaItem(
  id: string,
  title: string,
  subtitle: string,
  description: string,
  eyebrow: string,
  meta: string[],
  chips: string[],
  accent: string,
  backdrop: string,
  match: string,
  badge?: string,
  progress?: number,
): MediaItem {
  return {
    id,
    title,
    subtitle,
    description,
    eyebrow,
    meta,
    chips,
    accent,
    backdrop,
    match,
    badge,
    progress,
  }
}
