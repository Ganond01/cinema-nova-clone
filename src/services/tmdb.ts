import { Movie, CastMember, Review } from '../types';
import { INITIAL_MOVIES } from '../data/movies';
import { DORAMAS_LIST } from '../data/doramas';
import { ANIME_LIST } from '../data/animeData';
import { translateGenre } from '../lib/translations';

const BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/original';
const POSTER_BASE_URL = 'https://image.tmdb.org/t/p/w500';

// TMDB API Key loaded strictly from environment variable or fallback key
function getApiKey(): string {
  const envKey = import.meta.env.VITE_TMDB_API_KEY;
  return envKey ? envKey.trim() : '';
}

// In-memory response cache to make reloads and route switches instant
const tmdbResponseCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes cache

// Map TMDB Жанр IDs to Ukrainian Жанр labels
const TMDB_GENRES_MAP: Record<number, string> = {
  28: 'Екшн',
  12: 'Пригоди',
  16: 'Аніме', // Non-anime animation is blocked, Japanese anime is preserved
  35: 'Комедія',
  80: 'Кримінал',
  99: 'Документальний',
  18: 'Драма',
  10751: 'Сімейний',
  14: 'Фентезі',
  36: 'Історія',
  27: 'Жахи',
  10402: 'Музика',
  9648: 'Детектив',
  10749: 'Мелодрама',
  878: 'Фantasтика', // 'Фентезі' or 'Фантастика'
  10770: 'Телевізійний фільм',
  53: 'Трилер',
  10752: 'Військовий',
  37: 'Вестерн'
};

// Fix typo spelling 'Фantasтика' to 'Фантастика'
TMDB_GENRES_MAP[878] = 'Фантастика';

/**
 * Format runtime (minutes) to "X год Y хв"
 */
function formatRuntime(minutes: number | undefined): string {
  if (!minutes || minutes <= 0) return '2 год 10 хв';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return hours > 0 ? `${hours} год ${mins} хв` : `${mins} хв`;
}

/**
 * Map TMDB Movie Response to our custom Movie type
 */
export function mapTMDBMovie(item: any, details?: any): Movie {
  const year = item.release_date ? new Date(item.release_date).getFullYear() : 2024;
  
  // Extract Жанри
  let genreNames: string[] = [];
  if (details && details.genres) {
    genreNames = details.genres.map((g: any) => translateGenre(g.name, 'UA'));
  } else if (item.genre_ids) {
    genreNames = item.genre_ids.map((id: number) => TMDB_GENRES_MAP[id]).filter(Boolean);
  }
  genreNames = genreNames.map(g => translateGenre(g, 'UA'));

  // Detect Anime vs Western Cartoon
  const isJapaneseProduct = item.original_language === 'ja' || 
                            (item.origin_country && (item.origin_country.includes('JP') || item.origin_country.includes('ja'))) ||
                            (details && (details.original_language === 'ja' || (details.production_countries && details.production_countries.some((c: any) => c.iso_3166_1 === 'JP'))));
  
  // Strip any cartoon/animation labels completely from all products
  genreNames = genreNames.filter(g => !/мульт|cartoon|анімація|animation/i.test(g));

  if (isJapaneseProduct) {
    if (!genreNames.includes('Аніме')) {
      genreNames.unshift('Аніме');
    }
  }

  if (genreNames.length === 0) {
    genreNames = ['Фантастика', 'Пригоди'];
  }

  // Extract director
  let director = 'Невідомий режисер';
  if (details && details.credits && details.credits.crew) {
    const dirObj = details.credits.crew.find((c: any) => c.job === 'Director');
    if (dirObj) director = dirObj.name;
  }

  // Extract cast
  let cast: CastMember[] = [];
  if (details && details.credits && details.credits.cast) {
    cast = details.credits.cast.slice(0, 6).map((c: any) => ({
      name: c.name,
      role: c.character || 'Актор',
      avatarUrl: c.profile_path 
        ? `${POSTER_BASE_URL}${c.profile_path}` 
        : 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=150&auto=format&fit=crop'
    }));
  } else {
    cast = [
      { name: 'Популярний Актор', role: 'Головна Роль', avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=150&auto=format&fit=crop' }
    ];
  }

  // Find trailer videos prioritizing Ukrainian first, then English fallback
  let trailerEmbedUrl = '';
  let trailerEmbedUrlUa = '';
  let trailerEmbedUrlEn = '';

  if (details && details.videos && details.videos.results) {
    const vids = details.videos.results.filter((v: any) => v.site === 'YouTube');
    
    // 1. Пошук Ukrainian trailer
    const ukTrailer = vids.find((v: any) => 
      v.iso_639_1 === 'uk' || 
      /українськ|трейлер|дубляж/i.test(v.name || '')
    );
    if (ukTrailer) {
      trailerEmbedUrlUa = `https://www.youtube.com/embed/${ukTrailer.key}`;
    }

    // 2. Пошук English/Official trailer
    const enTrailer = vids.find((v: any) => 
      v.iso_639_1 === 'en' || 
      v.type === 'Trailer' || 
      /official|trailer|teaser/i.test(v.name || '')
    );
    if (enTrailer) {
      trailerEmbedUrlEn = `https://www.youtube.com/embed/${enTrailer.key}`;
    }

    // За замовчуванням trailer prioritizes Ukrainian, otherwise falls back to English, then any available Відео
    if (trailerEmbedUrlUa) {
      trailerEmbedUrl = trailerEmbedUrlUa;
    } else if (trailerEmbedUrlEn) {
      trailerEmbedUrl = trailerEmbedUrlEn;
    } else if (vids.length > 0) {
      trailerEmbedUrl = `https://www.youtube.com/embed/${vids[0].key}`;
    }
  }

  // Synthesize viewsCount, Рейтинг, ratingVotesCount
  const votes = item.vote_count || 50;
  const votesText = votes > 1000 ? `${(votes / 1000).toFixed(0)}K` : `${votes}`;
  const views = Math.round((item.popularity || 100) * 1200);

  // Generate plausible age Рейтинг based on Жанри or За замовчуванням
  let ageRating = '12+';
  if (genreNames.includes('Жахи') || genreNames.includes('Трилер') || genreNames.includes('Кримінал')) {
    ageRating = '16+';
  } else if (genreNames.includes('Сімейний') || genreNames.includes('Анімація') || genreNames.includes('Мультфільм') || genreNames.includes('Аніме')) {
    // If it is anime, it might be 12+ or 16+, but we can За замовчуванням animated to 12+ or 0+
    ageRating = genreNames.includes('Аніме') ? '12+' : '0+';
  }

  const englishTitle = item.original_title || item.original_name || item.title || item.name || '';
  const ukrainianTitle = item.title || item.name || englishTitle;
  const englishOverview = details?.overview_en || item.overview_en || (details && details.original_language === 'en' ? details.overview : undefined);

  let cleanUaDesc = 'Опис фільму наразі готується нашими кінокритиками.';
  let cleanEnDesc = 'Movie synopsis is being prepared by our critics.';

  if (item.overview && item.overview.trim()) {
    const raw = item.overview.trim();
    if (/[а-яА-ЯіІїЇєЄґҐ]/.test(raw)) {
      cleanUaDesc = raw;
    } else {
      cleanEnDesc = raw;
    }
  }

  if (englishOverview && englishOverview.trim() && !/[а-яА-ЯіІїЇєЄґҐ]/.test(englishOverview)) {
    cleanEnDesc = englishOverview.trim();
  }

  return {
    id: `tmdb_${item.id}`,
    title: ukrainianTitle,
    titleEn: englishTitle,
    originalTitle: item.original_title || item.original_name || '',
    type: 'movie',
    year,
    duration: formatRuntime(details?.runtime),
    rating: item.vote_average ? Math.round(item.vote_average * 10) / 10 : 7.2,
    ratingVotesCount: votesText,
    ageRating,
    description: cleanUaDesc,
    descriptionEn: cleanEnDesc,
    posterUrl: item.poster_path 
      ? `${POSTER_BASE_URL}${item.poster_path}` 
      : 'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?q=80&w=600&auto=format&fit=crop',
    backdropUrl: item.backdrop_path 
      ? `${IMAGE_BASE_URL}${item.backdrop_path}` 
      : 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=1200&auto=format&fit=crop',
    genres: genreNames,
    director,
    cast,
    languages: ['Українська', 'Англійська'],
    subtitles: ['Українські', 'Англійські'],
    budget: details?.budget ? `$${(details.budget / 1000000).toFixed(0)} млн` : undefined,
    revenue: details?.revenue ? `$${(details.revenue / 1000000).toFixed(0)} млн` : undefined,
    releaseDate: item.release_date || undefined,
    videoUrl: '',
    trailerEmbedUrl: trailerEmbedUrl || undefined,
    trailerEmbedUrlUa: trailerEmbedUrlUa || undefined,
    trailerEmbedUrlEn: trailerEmbedUrlEn || undefined,
    isPopular: item.popularity > 1500,
    isNew: item.release_date ? new Date(item.release_date).getFullYear() >= 2024 : false,
    viewsCount: views,
    reviews: details?.reviews?.results?.slice(0, 3).map((r: any, index: number) => ({
      id: `rev-tmdb-${index}`,
      username: r.author || 'Глядач',
      userAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=100&auto=format&fit=crop',
      rating: Math.round((r.author_details?.rating || 8)),
      comment: r.content || '',
      createdAt: r.created_at ? r.created_at.substring(0, 10) : '2026-06-19'
    })) || []
  };
}

/**
 * Check if a TMDB movie is allowed (has Ukrainian or English title, is not Russian, etc.)
 */
function isAllowedMovie(item: any): boolean {
  if (!item) return false;
  
  const title = (item.title || item.name || '').trim();
  const origLang = item.original_language || '';
  const overview = (item.overview || '').trim();
  
  if (!title) return false;
  
  // 1. No Russian original language Фільми
  if (origLang === 'ru') return false;
  
  // 2. No Russian titles or descriptions (checking Russian-only Cyrillic letters: ы, э, ъ, ё)
  const ruSpecific = /[ыэъёЫЭЪЁ]/;
  if (ruSpecific.test(title)) return false;
  if (ruSpecific.test(overview)) return false;
  
  // Check common Russian words in Заголовок to catch Russian titles that don't use Russian-only letters
  const ruWords = /\b(будет|твое|мое|это|этот|очень|город|красивый|первый|время|жизнь|любовь|сердце|разбито|всегда|когда|тогда|после|один|друг|был|была|было|были|нет|да)\b/i;
  if (ruWords.test(title)) return false;
  
  // 3. Must be Latin or Cyrillic characters only (with common punctuation/numbers) in the Заголовок
  // This Фільтри out scripts like Hindi, Arabic, Tamil, Chinese, Japanese, etc. in the Заголовок
  const allowedPattern = /^[a-zA-Zа-яА-ЯіІїЇєЄґҐ0-9\s\-,.!?:;'"()&@#/*%+=<>_’'“”«»–]*$/;
  if (!allowedPattern.test(title)) return false;
  
  // 4. If the Заголовок is in Latin (English-like), it must be an English-language Фільм or Japanese/Korean Фільм with an English Заголовок
  const hasCyrillic = /[а-яА-ЯіІїЇєЄґҐ]/.test(title);
  if (!hasCyrillic) {
    const allowedLatinLangs = ['en', 'ja', 'ko'];
    if (!allowedLatinLangs.includes(origLang)) {
      return false; // E.g., Italian "Vacanze per un massacro" is discarded
    }
  }
  
  // 5. Фільтрація out languages with poor translation Якість or unwanted regions
  const allowedOrigLangs = ['uk', 'en', 'ja', 'ko', 'fr', 'es', 'de', 'it', 'pl'];
  if (!allowedOrigLangs.includes(origLang)) {
    return false;
  }

  // 6. Filter out all cartoons and western animation ("такого в нас немає, видалити мультфільми")
  const isAnime =
    origLang === 'ja' ||
    (item.origin_country && (item.origin_country.includes('JP') || item.origin_country.includes('ja')));

  const hasAnimation =
    (item.genre_ids && item.genre_ids.includes(16)) ||
    (item.genres && item.genres.some((g: any) => g.id === 16 || /animation|мульт|анімац/i.test(g.name || '')));

  if (hasAnimation && !isAnime) {
    return false;
  }

  const combinedText = `${title} ${overview} ${item.original_title || ''} ${item.original_name || ''}`.toLowerCase();
  const cartoonKeywords = /(мультфільм|мультсеріал|мультик|анімаційний|cartoon|animated|inside out|думками навиворіт|despicable me|нікчемний я|minions|посіпаки|kung fu panda|панда кунг-фу|shrek|шрек|toy story|історія іграшок|frozen|крижане серце|moana|ваана|моана|zootopia|зоотрополіс|madagascar|мадагаскар|ice age|льодовиковий період|finding nemo|у пошуках немо|cars 3|тачки|how to train your dragon|як приборкати дракона|disney animation|pixar|illumination|dreamworks)/i;

  // Block unwanted Фільми like Welcome To The Jungle
  if (/welcome to the jungle|jumanji.*welcome to the jungle|поклик джунглів|ласкаво просимо до джунглів/i.test(combinedText)) {
    return false;
  }

  if (cartoonKeywords.test(combinedText) && !isAnime) {
    return false;
  }

  return true;
}

/**
 * Fetch and parse list of TMDB movies
 */
async function fetchMoviesList(endpoint: string, params: string = ''): Promise<Movie[]> {
  const cacheKey = `${endpoint}_${params}`;
  const cached = tmdbResponseCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 2500);

  try {
    const key = getApiKey();
    // За замовчуванням to uk-UA, fallback query parameters
    const url = `${BASE_URL}${endpoint}?api_key=${key}&language=uk-UA&append_to_response=credits,videos&region=UA${params}`;
    
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`TMDB error: status ${response.status}`);
    }
    const data = await response.json();
    const results = data.results || [];
    
    // Фільтрація out Russian Фільми and other non-Ukrainian/non-English Фільми
    const allowedResults = results.filter(isAllowedMovie);
    
    // Map Початковий result records. To make them truly "rich" with cast & trailers,
    // we can either map with basic info or do supplementary requests for the top items.
    const movies = allowedResults.map((item: any) => mapTMDBMovie(item));
    
    // Збереження to cache
    if (movies.length > 0) {
      tmdbResponseCache.set(cacheKey, { data: movies, timestamp: Date.now() });
    }
    return movies;
  } catch (error) {
    clearTimeout(timeoutId);
    console.info(`[Cinema Nova Engine] TMDB endpoint '${endpoint}' loaded from local fallback.`);
    
    // Self-heal with local dataset backup dynamically
    let fallback: Movie[] = [];
    if (endpoint.includes('trending')) {
      fallback = INITIAL_MOVIES.filter(m => m.isPopular).slice(0, 10);
    } else if (endpoint.includes('popular')) {
      fallback = [...INITIAL_MOVIES].sort((a, b) => (b.viewsCount || 0) - (a.viewsCount || 0)).slice(0, 10);
    } else if (endpoint.includes('now_playing') || endpoint.includes('upcoming')) {
      fallback = INITIAL_MOVIES.filter(m => m.isNew).slice(0, 10);
    } else if (endpoint.includes('search')) {
      const queryMatch = params.match(/&query=([^&]+)/);
      if (queryMatch && queryMatch[1]) {
        const decodedQuery = decodeURIComponent(queryMatch[1]).toLowerCase();
        fallback = INITIAL_MOVIES.filter(m => 
          m.title.toLowerCase().includes(decodedQuery) || 
          (m.originalTitle && m.originalTitle.toLowerCase().includes(decodedQuery)) ||
          m.genres.some(g => g.toLowerCase().includes(decodedQuery))
        );
      }
    }
    if (fallback.length === 0) {
      fallback = INITIAL_MOVIES.slice(0, 10);
    }
    return fallback;
  }
}

/**
 * Get Weekly Trending Movies
 */
export async function getTrendingMovies(): Promise<Movie[]> {
  return fetchMoviesList('/trending/movie/week');
}

/**
 * Get Popular Movies
 */
export async function getPopularMovies(): Promise<Movie[]> {
  return fetchMoviesList('/movie/popular');
}

/**
 * Get Now Playing ("Новинки") Movies
 */
export async function getNewMovies(): Promise<Movie[]> {
  const list = await fetchMoviesList('/movie/now_playing');
  return list.filter((m) => {
    if (!m.description) return false;
    const desc = m.description.trim();
    if (desc.length < 15) return false;
    const lower = desc.toLowerCase();
    if (
      lower.includes('опис фільму наразі готується') ||
      lower.includes('немає опису') ||
      lower.includes('no description') ||
      lower.includes('synopsis is being prepared')
    ) {
      return false;
    }
    return true;
  });
}

/**
 * Search Movies on TMDB
 */
export async function searchMovies(query: string): Promise<Movie[]> {
  if (!query.trim()) return [];
  const encodedQuery = encodeURIComponent(query);
  return fetchMoviesList('/search/movie', `&query=${encodedQuery}`);
}

/**
 * Search TMDB media (movies and TV series)
 */
export async function searchTMDBMedia(query: string): Promise<any[]> {
  if (!query.trim()) return [];
  try {
    const key = getApiKey();
    const encodedQuery = encodeURIComponent(query);
    const url = `${BASE_URL}/search/multi?api_key=${key}&language=uk-UA&query=${encodedQuery}`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.results || []).filter(isAllowedMovie);
  } catch (err) {
    console.error('searchTMDBMedia error:', err);
    return [];
  }
}

/**
 * Fetch raw TMDB details by ID and type ('movie' | 'tv')
 */
export async function fetchTMDBDetails(id: number | string, mediaType: string = 'movie'): Promise<any> {
  try {
    const key = getApiKey();
    const endpoint = mediaType === 'tv' ? 'tv' : 'movie';
    const url = `${BASE_URL}/${endpoint}/${id}?api_key=${key}&language=uk-UA&append_to_response=credits,videos`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Failed to fetch TMDB details for ${id}`);
    }
    return await res.json();
  } catch (err) {
    console.error('fetchTMDBDetails error:', err);
    throw err;
  }
}

/**
 * Fetch Full Detailed Movie Object (with Cast/Videos/etc.)
 */
export async function fetchFullMovieDetails(tmdbIdStr: string): Promise<Movie | null> {
  try {
    const cleanId = tmdbIdStr.replace('tmdb_', '');
    const key = getApiKey();
    
    // Отримання Ukrainian details
    const ukUrl = `${BASE_URL}/movie/${cleanId}?api_key=${key}&language=uk-UA&append_to_response=credits,videos,reviews`;
    const response = await fetch(ukUrl);
    
    let data: any = null;
    if (response.ok) {
      data = await response.json();
    }

    // Fetch English details for fallback trailer and English Опис / Заголовок
    try {
      const enUrl = `${BASE_URL}/movie/${cleanId}?api_key=${key}&language=en-US&append_to_response=videos`;
      const enRes = await fetch(enUrl);
      if (enRes.ok) {
        const enData = await enRes.json();
        if (data) {
          data.overview_en = enData.overview;
          data.title_en = enData.title;
          // Merge English videos into results if available
          if (enData.videos?.results) {
            const currentVidKeys = new Set((data.videos?.results || []).map((v: any) => v.key));
            const newVideos = enData.videos.results.filter((v: any) => !currentVidKeys.has(v.key));
            data.videos = data.videos || { results: [] };
            data.videos.results = [...data.videos.results, ...newVideos];
          }
        } else {
          data = enData;
        }
      }
    } catch (err) {
      console.info('English fallback fetch info:', err);
    }

    if (!data) {
      return null;
    }
    
    return mapTMDBMovie(data, data);
  } catch (error) {
    console.info('Failed to fetch full movie details from TMDB, checking offline database:', error);
    // Find if we have any fallback Фільм with matching/partial details
    const cleanId = tmdbIdStr.replace('tmdb_', '');
    const allLocalPool = [...INITIAL_MOVIES, ...DORAMAS_LIST, ...ANIME_LIST];
    const offlineMatch = allLocalPool.find(m => 
      m.id === tmdbIdStr || 
      m.id === cleanId ||
      m.id.replace('movie_','') === cleanId ||
      m.id.replace('dorama_','') === cleanId ||
      m.id.replace('anime_','') === cleanId
    );
    if (offlineMatch) {
      return offlineMatch;
    }
    return null;
  }
}
