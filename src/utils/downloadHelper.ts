import { Movie } from '../types';

export type VideoQualityOption = '4K' | '1080p' | '720p' | '480p';

export interface QualityDownloadDetail {
  quality: VideoQualityOption;
  label: string;
  resolution: string;
  bitrate: string;
  audio: string;
  codec: string;
  sizeGB: number;
  formattedSize: string;
  recommended?: boolean;
}

/**
 * Parses duration string (e.g., "2 год 46 хв", "166 хв", "45 хв", "1h 30m") to total minutes
 */
export function parseDurationMinutes(durationStr?: string, defaultMinutes = 110): number {
  if (!durationStr || typeof durationStr !== 'string') return defaultMinutes;

  const str = durationStr.toLowerCase().trim();

  // Check for hour + minute formats like "2 год 46 хв" or "2h 46m"
  const hoursMatch = str.match(/(\d+)\s*(?:год|h|hour|hours)/);
  const minutesMatch = str.match(/(\d+)\s*(?:хв|m|min|minutes)/);

  let total = 0;
  if (hoursMatch) {
    total += parseInt(hoursMatch[1], 10) * 60;
  }
  if (minutesMatch) {
    total += parseInt(minutesMatch[1], 10);
  }

  if (total > 0) return total;

  // Перевірка simple numbers like "120"
  const singleNumberMatch = str.match(/^(\d+)$/);
  if (singleNumberMatch) {
    return parseInt(singleNumberMatch[1], 10);
  }

  return defaultMinutes;
}

/**
 * Calculates accurate, realistic video file size based on duration and target quality
 * 4K UHD: ~4.0-4.5 GB for standard 45-min series episode, ~12-18 GB for full movies
 * 1080p Full HD: ~1.4-1.8 GB for series episode, ~4.5-6.5 GB for full movies
 * 720p HD: ~700-900 MB for series episode, ~2.0-3.0 GB for full movies
 * 480p SD: ~350-450 MB for series episode, ~0.9-1.3 GB for full movies
 */
export function calculateRealisticFileSize(
  movie: Movie,
  quality: VideoQualityOption = '1080p',
  episodeInfo?: string,
  seasonEpisodeCount?: number
): number {
  const isSeries = movie.type === 'series' || movie.type === 'anime';
  const isAnime = movie.type === 'anime';
  
  // Determine if it's a full Сезон download
  const isFullSeason = Boolean(
    episodeInfo && 
    (episodeInfo.toLowerCase().startsWith('сезон') || episodeInfo.toLowerCase().startsWith('season')) && 
    !episodeInfo.includes('серія') && 
    !episodeInfo.includes('episode')
  );

  let durationMinutes = 110;
  if (isAnime) {
    durationMinutes = 24; // typical anime episode length
  } else if (isSeries) {
    durationMinutes = parseDurationMinutes(movie.duration, 48);
    // If Фільм duration is whole Серіал (e.g. > 100 min), normalize single Серія to ~45-50 min
    if (durationMinutes > 90) {
      durationMinutes = 48;
    }
  } else {
    durationMinutes = parseDurationMinutes(movie.duration, 115);
  }

  let baseEpisodeOrMovieGB = 0;

  switch (quality) {
    case '4K':
      if (isAnime) {
        baseEpisodeOrMovieGB = (durationMinutes / 24) * 2.2;
      } else if (isSeries) {
        // Exactly ~4.0 - 4.2 GB for a 45-50 min 4K UHD Серія
        baseEpisodeOrMovieGB = (durationMinutes / 45) * 4.05;
      } else {
        // ~13.5 GB for 120-min 4K UHD Фільм (e.g. Dune 2 at 166 min is ~18.7 GB)
        baseEpisodeOrMovieGB = (durationMinutes / 120) * 13.5;
      }
      break;

    case '1080p':
      if (isAnime) {
        baseEpisodeOrMovieGB = (durationMinutes / 24) * 0.85;
      } else if (isSeries) {
        baseEpisodeOrMovieGB = (durationMinutes / 45) * 1.55;
      } else {
        baseEpisodeOrMovieGB = (durationMinutes / 120) * 4.85;
      }
      break;

    case '720p':
      if (isAnime) {
        baseEpisodeOrMovieGB = (durationMinutes / 24) * 0.42;
      } else if (isSeries) {
        baseEpisodeOrMovieGB = (durationMinutes / 45) * 0.78;
      } else {
        baseEpisodeOrMovieGB = (durationMinutes / 120) * 2.35;
      }
      break;

    case '480p':
      if (isAnime) {
        baseEpisodeOrMovieGB = (durationMinutes / 24) * 0.19;
      } else if (isSeries) {
        baseEpisodeOrMovieGB = (durationMinutes / 45) * 0.36;
      } else {
        baseEpisodeOrMovieGB = (durationMinutes / 120) * 1.05;
      }
      break;
  }

  if (isFullSeason) {
    const episodes = seasonEpisodeCount || 8;
    return Number((baseEpisodeOrMovieGB * episodes).toFixed(2));
  }

  return Number(baseEpisodeOrMovieGB.toFixed(2));
}

/**
 * Returns available download quality options with real computed sizes
 */
export function getDownloadQualityOptions(
  movie: Movie,
  episodeInfo?: string,
  seasonEpisodeCount?: number
): QualityDownloadDetail[] {
  const is4kSupported = movie.quality?.includes('4K') || movie.year >= 2020 || movie.rating >= 7.5;

  const qualities: VideoQualityOption[] = is4kSupported
    ? ['4K', '1080p', '720p', '480p']
    : ['1080p', '720p', '480p'];

  return qualities.map((q) => {
    const sizeGB = calculateRealisticFileSize(movie, q, episodeInfo, seasonEpisodeCount);
    
    let label = 'Full HD (1080p)';
    let resolution = '1920 × 1080';
    let bitrate = '6.5 Мбіт/с';
    let audio = 'Dolby Digital 5.1';
    let codec = 'H.264 (AVC)';
    let recommended = q === '1080p';

    if (q === '4K') {
      label = 'Ultra HD (4K HDR)';
      resolution = '3840 × 2160';
      bitrate = '18.5 Мбіт/с';
      audio = 'Dolby Atmos / 5.1';
      codec = 'H.265 (HEVC Main 10)';
      recommended = true;
    } else if (q === '720p') {
      label = 'HD Ready (720p)';
      resolution = '1280 × 720';
      bitrate = '3.2 Мбіт/с';
      audio = 'Stereo 2.0';
      codec = 'H.264';
      recommended = false;
    } else if (q === '480p') {
      label = 'Standard (480p)';
      resolution = '854 × 480';
      bitrate = '1.2 Мбіт/с';
      audio = 'Stereo 2.0';
      codec = 'H.264';
      recommended = false;
    }

    return {
      quality: q,
      label,
      resolution,
      bitrate,
      audio,
      codec,
      sizeGB,
      formattedSize: `${sizeGB.toFixed(sizeGB < 1 ? 2 : 1)} ГБ`,
      recommended: q === (is4kSupported ? '4K' : '1080p')
    };
  });
}
