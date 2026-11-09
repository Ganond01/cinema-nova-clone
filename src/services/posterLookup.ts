/**
 * Universal Automated Poster Lookup & Analysis Service
 * Automatically discovers, analyzes, and fetches HD official posters & backdrops
 * from TMDB, AniList GraphQL, and MyAnimeList (MAL) for all Movies, TV Series, Doramas, and Anime.
 */

import { Movie } from '../types';
import { DORAMA_FALLBACK_POSTERS, MAL_FALLBACK_ANIME_POSTERS, TMDB_FALLBACK_POSTERS } from '../utils/imageFallback';

const TMDB_API_KEY = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_TMDB_API_KEY) 
  ? import.meta.env.VITE_TMDB_API_KEY.trim() 
  : '';
const POSTER_CACHE_KEY = 'cinemanova_poster_cache_v4';

// In-memory cache
const memoryCache = new Map<string, string>();

// Ініціалізація з localStorage
try {
  const saved = localStorage.getItem(POSTER_CACHE_KEY);
  if (saved) {
    const parsed = JSON.parse(saved);
    Object.entries(parsed).forEach(([k, v]) => {
      if (typeof v === 'string') memoryCache.set(k, v);
    });
  }
} catch (e) {}

function saveCache() {
  try {
    const obj: Record<string, string> = {};
    memoryCache.forEach((val, key) => {
      obj[key] = val;
    });
    localStorage.setItem(POSTER_CACHE_KEY, JSON.stringify(obj));
  } catch (e) {}
}

/**
 * Normalizes title for searching
 */
export function cleanSearchQuery(title: string): string {
  if (!title) return '';
  return title
    .replace(/\(.*?\)/g, '') // remove year or comments in parentheses
    .replace(/\[.*?\]/g, '')
    .replace(/[:!?]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Determines whether a poster URL is missing, invalid, broken, or a generic placeholder
 */
export function isPosterInvalid(url?: string | null): boolean {
  if (!url || typeof url !== 'string') return true;
  const trimmed = url.trim();
  if (trimmed === '') return true;
  if (trimmed.includes('placeholder')) return true;
  if (trimmed.includes('undefined') || trimmed.includes('null')) return true;
  if (trimmed.includes('via.placeholder.com')) return true;
  // Generic stock unsplash photos that aren't real Фільм posters
  if (trimmed.includes('unsplash.com/photo-1536440136628') ||
      trimmed.includes('unsplash.com/photo-1517841905240') ||
      trimmed.includes('unsplash.com/photo-1509198397868') ||
      trimmed.includes('unsplash.com/photo-1485846234645') ||
      trimmed.includes('unsplash.com/photo-1534447677768')) {
    return true;
  }
  return false;
}

/**
 * Searches AniList GraphQL API for anime posters (highest resolution, 99.9% uptime, no API key required)
 */
export async function lookupAniListPoster(title: string): Promise<string | null> {
  const clean = cleanSearchQuery(title);
  if (!clean) return null;

  const cacheKey = `anilist_${clean.toLowerCase()}`;
  if (memoryCache.has(cacheKey)) {
    return memoryCache.get(cacheKey) || null;
  }

  try {
    const res = await fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `query ($search: String) {
          Media (search: $search, type: ANIME) {
            id
            coverImage { extraLarge large }
            bannerImage
          }
        }`,
        variables: { search: clean }
      })
    });

    if (res.ok) {
      const json: any = await res.json();
      const media = json?.data?.Media;
      const poster = media?.coverImage?.extraLarge || media?.coverImage?.large;
      if (poster) {
        memoryCache.set(cacheKey, poster);
        saveCache();
        return poster;
      }
    }
  } catch (err) {
    console.debug('AniList lookup note:', err);
  }

  return null;
}

/**
 * Searches MyAnimeList (Jikan v4 API) for anime poster
 */
export async function lookupMalAnimePoster(title: string): Promise<string | null> {
  const clean = cleanSearchQuery(title);
  if (!clean) return null;

  const cacheKey = `mal_${clean.toLowerCase()}`;
  if (memoryCache.has(cacheKey)) {
    return memoryCache.get(cacheKey) || null;
  }

  try {
    const res = await fetch(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(clean)}&limit=1`);
    if (res.ok) {
      const data = await res.json();
      const first = data?.data?.[0];
      const poster = first?.images?.jpg?.large_image_url || first?.images?.jpg?.image_url;
      if (poster) {
        memoryCache.set(cacheKey, poster);
        saveCache();
        return poster;
      }
    }
  } catch (err) {
    console.debug('Jikan anime lookup note:', err);
  }

  return null;
}

/**
 * Searches TMDB for movies, series or doramas (Ukrainian first, then English)
 */
export async function lookupTmdbPoster(
  title: string,
  type?: string,
  year?: number,
  titleEn?: string,
  originalTitle?: string
): Promise<string | null> {
  const queries = Array.from(new Set([
    cleanSearchQuery(title),
    cleanSearchQuery(titleEn || ''),
    cleanSearchQuery(originalTitle || '')
  ].filter(Boolean)));

  if (queries.length === 0) return null;

  const cacheKey = `tmdb_${queries[0].toLowerCase()}_${year || ''}`;
  if (memoryCache.has(cacheKey)) {
    return memoryCache.get(cacheKey) || null;
  }

  try {
    // 1. Try server proxy first
    try {
      const serverRes = await fetch(
        `/api/lookup-poster?title=${encodeURIComponent(queries[0])}&type=${type || ''}&year=${year || ''}&titleEn=${encodeURIComponent(titleEn || '')}&originalTitle=${encodeURIComponent(originalTitle || '')}`
      );
      if (serverRes.ok) {
        const json = await serverRes.json();
        if (json?.posterUrl) {
          memoryCache.set(cacheKey, json.posterUrl);
          saveCache();
          return json.posterUrl;
        }
      }
    } catch (e) {}

    // 2. Direct TMDB Пошук
    for (const q of queries) {
      for (const lang of ['uk-UA', 'en-US']) {
        const endpoint = type === 'series'
          ? `https://api.themoviedb.org/3/search/tv?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(q)}&language=${lang}${year ? `&first_air_date_year=${year}` : ''}`
          : `https://api.themoviedb.org/3/search/multi?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(q)}&language=${lang}${year ? `&year=${year}` : ''}`;

        const res = await fetch(endpoint);
        if (res.ok) {
          const data = await res.json();
          const first = data?.results?.find((r: any) => r.poster_path) || data?.results?.[0];
          if (first?.poster_path) {
            const poster = `https://image.tmdb.org/t/p/w500${first.poster_path}`;
            memoryCache.set(cacheKey, poster);
            saveCache();
            return poster;
          }
        }
      }
    }
  } catch (err) {
    console.debug('TMDB poster lookup note:', err);
  }

  return null;
}

/**
 * Universal auto-checking and fetching function for any content item
 */
export async function getVerifiedPoster(
  currentUrl?: string | null,
  title?: string,
  type?: string,
  genres?: string[],
  year?: number,
  titleEn?: string,
  originalTitle?: string
): Promise<string> {
  // If valid poster exists, return it directly
  if (!isPosterInvalid(currentUrl)) {
    return currentUrl!.trim();
  }

  const isAnime = type === 'anime' || (genres && genres.some(g => /аніме|anime|анімація/i.test(g)));
  const isDorama = (genres && genres.some(g => /дорама|корея|dorama/i.test(g)));

  const searchTitle = titleEn || originalTitle || title;

  if (searchTitle) {
    // 1. For Anime: AniList -> MAL -> TMDB
    if (isAnime) {
      for (const q of [titleEn, originalTitle, title].filter(Boolean)) {
        const anilistPoster = await lookupAniListPoster(q!);
        if (anilistPoster) return anilistPoster;

        const malPoster = await lookupMalAnimePoster(q!);
        if (malPoster) return malPoster;
      }
    }

    // 2. For Фільми / TV Серіал / Doramas: TMDB (UK & EN)
    const tmdbPoster = await lookupTmdbPoster(searchTitle, type, year, titleEn, originalTitle);
    if (tmdbPoster) return tmdbPoster;

    // 3. Fallback for Anime
    if (!isAnime) {
      const aniGeneral = await lookupAniListPoster(searchTitle);
      if (aniGeneral) return aniGeneral;
    }
  }

  // Fallback if network lookup failed
  if (isAnime) return MAL_FALLBACK_ANIME_POSTERS.default;
  if (isDorama) return DORAMA_FALLBACK_POSTERS.default;
  if (type === 'series') return TMDB_FALLBACK_POSTERS.series;
  return TMDB_FALLBACK_POSTERS.default;
}

/**
 * Automated scanner that processes movies and auto-repairs missing/corrupted posters
 */
export async function autoEnrichMoviePosters(movies: Movie[]): Promise<{ updated: Movie[]; changedCount: number }> {
  let changedCount = 0;
  const updated = await Promise.all(
    movies.map(async (movie) => {
      if (isPosterInvalid(movie.posterUrl)) {
        try {
          const verified = await getVerifiedPoster(
            movie.posterUrl,
            movie.title,
            movie.type,
            movie.genres,
            movie.year,
            movie.titleEn,
            movie.originalTitle
          );
          if (verified && verified !== movie.posterUrl) {
            changedCount++;
            return {
              ...movie,
              posterUrl: verified
            };
          }
        } catch (e) {}
      }
      return movie;
    })
  );

  return { updated, changedCount };
}
