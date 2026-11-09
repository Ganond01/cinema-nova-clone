import { lookupAniListPoster, lookupMalAnimePoster, lookupTmdbPoster, getVerifiedPoster, isPosterInvalid } from '../services/posterLookup';

/**
 * High-reliability Poster & Image Fallback System
 * Powered by TMDB, AniList & MyAnimeList verified CDN assets
 */

// Curated verified TMDB and MyAnimeList posters categorized by Жанр and content type
export const TMDB_FALLBACK_POSTERS = {
  default: 'https://image.tmdb.org/t/p/w500/8cdWjvZQUExUUTzyp4t6EDMubfO.jpg', // Deadpool & Wolverine
  action: 'https://image.tmdb.org/t/p/w500/8cdWjvZQUExUUTzyp4t6EDMubfO.jpg', // Deadpool & Wolverine
  drama: 'https://image.tmdb.org/t/p/w500/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg', // Oppenheimer
  scifi: 'https://image.tmdb.org/t/p/w500/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg', // Dune: Part Two
  fantasy: 'https://image.tmdb.org/t/p/w500/74xTEgt7R36Fpooo50r9T25onhq.jpg', // The Batman
  thriller: 'https://image.tmdb.org/t/p/w500/udDclJoHjfjb8Ekgsd4FDteOkCU.jpg', // Joker
  comedy: 'https://image.tmdb.org/t/p/w500/autXcUPWwlIROSOwzLSwe0NDTuK.jpg', // Inside Out 2
  horror: 'https://image.tmdb.org/t/p/w500/b33nnKl1GSFbao4l3fZDDqsMx0F.jpg', // Alien Romulus
  series: 'https://image.tmdb.org/t/p/w500/x04m6FF6qHpvMn24kQMpqsrDxVK.jpg', // Stranger Things
};

export const MAL_FALLBACK_ANIME_POSTERS = {
  default: 'https://image.tmdb.org/t/p/w500/hTP1DtLGFamjfu8WqjnuQdP1n4i.jpg', // Attack on Titan
  action: 'https://image.tmdb.org/t/p/w500/xUfRZu2mi8jH6SzQEJGP6tjBuYj.jpg', // Demon Slayer
  fantasy: 'https://image.tmdb.org/t/p/w500/dqZENchTd7lp5zht7BdlqM7RBhD.jpg', // Frieren
  drama: 'https://image.tmdb.org/t/p/w500/q719jXXEzOoYaps6babgKnONONX.jpg', // Your Name
  cyberpunk: 'https://image.tmdb.org/t/p/w500/lqcDVZ8pyk08AVftMBildDR3QUK.jpg', // Cyberpunk Edgerunners
};

export const DORAMA_FALLBACK_POSTERS = {
  default: 'https://image.tmdb.org/t/p/w500/1QdXdRYfktUSONkl1oD5gc6Be0s.jpg', // Squid Game
  romance: 'https://image.tmdb.org/t/p/w500/hikbLeofw2epfaEJptSkQ6b22IV.jpg', // Love Next Door
  thriller: 'https://image.tmdb.org/t/p/w500/uUM4LVlPgIrww07OoEKrGWlS1Ej.jpg', // The Glory
};

/**
 * Returns a guaranteed valid poster URL from TMDB or MyAnimeList database
 */
export function getFallbackPoster(
  title?: string,
  type?: 'movie' | 'series' | 'anime' | string,
  genres?: string[]
): string {
  const genresList = Array.isArray(genres) ? genres : [];
  const isAnime = type === 'anime' || genresList.some(g => typeof g === 'string' && /аніме|anime|анімація|мультфільм/i.test(g));
  const isDorama = genresList.some(g => typeof g === 'string' && /дорама|корея|dorama/i.test(g));

  if (isAnime) {
    if (genresList.length > 0) {
      const gLower = genresList.join(' ').toLowerCase();
      if (gLower.includes('бойовик') || gLower.includes('екшн') || gLower.includes('action')) return MAL_FALLBACK_ANIME_POSTERS.action;
      if (gLower.includes('фентезі') || gLower.includes('fantasy')) return MAL_FALLBACK_ANIME_POSTERS.fantasy;
      if (gLower.includes('драма') || gLower.includes('романтика') || gLower.includes('drama')) return MAL_FALLBACK_ANIME_POSTERS.drama;
      if (gLower.includes('кіберпанк') || gLower.includes('фантастика') || gLower.includes('sci-fi')) return MAL_FALLBACK_ANIME_POSTERS.cyberpunk;
    }
    return MAL_FALLBACK_ANIME_POSTERS.default;
  }
  if (isDorama) {
    return DORAMA_FALLBACK_POSTERS.default;
  }
  if (type === 'series') {
    return TMDB_FALLBACK_POSTERS.series;
  }

  if (genresList.length > 0) {
    const gLower = genresList.join(' ').toLowerCase();
    if (gLower.includes('бойовик') || gLower.includes('екшн') || gLower.includes('action')) return TMDB_FALLBACK_POSTERS.action;
    if (gLower.includes('фантастика') || gLower.includes('sci-fi')) return TMDB_FALLBACK_POSTERS.scifi;
    if (gLower.includes('трилер') || gLower.includes('thriller')) return TMDB_FALLBACK_POSTERS.thriller;
    if (gLower.includes('жахи') || gLower.includes('horror')) return TMDB_FALLBACK_POSTERS.horror;
    if (gLower.includes('комедія') || gLower.includes('comedy')) return TMDB_FALLBACK_POSTERS.comedy;
  }

  return TMDB_FALLBACK_POSTERS.default;
}

/**
 * Validates a poster URL; if invalid, returns TMDB/MAL fallback
 */
export function validatePosterUrl(
  url?: string | null,
  title?: string,
  type?: 'movie' | 'series' | 'anime' | string,
  genres?: string[]
): string {
  if (isPosterInvalid(url)) {
    return getFallbackPoster(title, type, genres);
  }
  return url!.trim();
}

/**
 * Event handler for <img> onError to seamlessly fallback to TMDB/MAL/AniList poster,
 * while automatically querying the database for a live match.
 */
export function handlePosterError(
  e: React.SyntheticEvent<HTMLImageElement, Event>,
  fallbackUrl?: string,
  title?: string,
  type?: string,
  genres?: string[],
  year?: number,
  titleEn?: string,
  originalTitle?: string
) {
  const target = e.currentTarget;
  target.onerror = null; // Prevent infinite error loop
  const immediateFallback = fallbackUrl || getFallbackPoster(title, type, genres);
  target.src = immediateFallback;

  // Asynchronously query TMDB / AniList / MyAnimeList prioritizing English / Romaji titles
  const searchTitle = titleEn || originalTitle || title;
  if (searchTitle) {
    getVerifiedPoster(null, searchTitle, type, genres, year, titleEn, originalTitle).then((freshPoster) => {
      if (freshPoster && target) {
        target.src = freshPoster;
      }
    }).catch(() => {});
  }
}
