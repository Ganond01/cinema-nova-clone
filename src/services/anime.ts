import { Movie } from '../types';
import { translateGenre } from '../lib/translations';

/**
 * Extracts the MyAnimeList ID from a given MAL URL.
 * Example: https://myanimelist.net/anime/52991/Sousou_no_Frieren -> 52991
 */
export function extractMalId(url: string): number | null {
  if (!url) return null;
  const match = url.match(/anime\/(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * Calls the local server translation API to translate text into Ukrainian.
 */
export async function translateText(text: string): Promise<string> {
  try {
    const response = await fetch('/api/anime/translate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text }),
    });
    if (!response.ok) {
      throw new Error('Translation failed');
    }
    const data = await response.json();
    return data.translation || '';
  } catch (err) {
    console.error('Error during translation:', err);
    return '';
  }
}

/**
 * Fetches anime details from the local server proxy or MyAnimeList Jikan API (v4).
 */
export async function fetchAnimeFromMal(malId: number): Promise<any> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    // 1. Try local server proxy
    let res = await fetch(`/api/anime/${malId}`, { signal: controller.signal });
    if (res.ok) {
      const json = await res.json();
      if (json?.data) {
        clearTimeout(timer);
        return json.data;
      }
    }
    // 2. Direct fallback
    res = await fetch(`https://api.jikan.moe/v4/anime/${malId}`, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) return null;
    const data = await res.json();
    return data.data;
  } catch (err) {
    clearTimeout(timer);
    console.info(`MyAnimeList API offline or unreachable for MAL ID ${malId}:`, (err as any)?.message || err);
    return null;
  }
}

/**
 * Automatically updates a single anime metadata with fresh data from MyAnimeList (MAL)
 * and translates the synopsis to Ukrainian using Gemini on our server.
 */
export async function updateAnimeMetadata(movie: Movie): Promise<Movie> {
  if (!movie.myAnimeListUrl) {
    return movie;
  }

  const malId = extractMalId(movie.myAnimeListUrl);
  if (!malId) {
    return movie;
  }

  try {
    // Delay slightly to prevent Jikan API rate limit (3 requests per second)
    await new Promise(resolve => setTimeout(resolve, 500));

    const malData = await fetchAnimeFromMal(malId);
    if (!malData) return movie;

    // Отримання values
    const freshRating = malData.score || movie.rating;
    const votesCount = malData.members ? `${Math.round(malData.members / 1000)}K` : movie.ratingVotesCount;
    const synopsisEn = malData.synopsis || movie.descriptionEn || '';
    
    // We Оновлення posters using MAL Jikan images.
    // To avoid 403 Forbidden errors due to hotlinking, the application renders
    // images with referrerPolicy="no-referrer" which allows cdn.myanimelist.net images to load perfectly.
    const freshPoster = malData.images?.jpg?.large_image_url || malData.images?.jpg?.image_url || movie.posterUrl;
    
    let synopsisUa = movie.description;
    if (synopsisEn && synopsisEn !== movie.descriptionEn) {
      const translated = await translateText(synopsisEn);
      if (translated) {
        synopsisUa = translated;
      }
    }

    // Also Оновлення Заголовок if we only had a draft Заголовок, or use MAL Заголовок details
    const englishTitle = malData.title_english || malData.title || movie.titleEn;
    const originalTitle = malData.title_japanese || malData.title || movie.originalTitle;
    const translatedTitle = translateAnimeTitleToUa(englishTitle, malData.title || originalTitle);

    // Trailer from MAL Jikan API
    let malTrailerUrl = '';
    if (malData.trailer?.embed_url) {
      malTrailerUrl = malData.trailer.embed_url;
    } else if (malData.trailer?.youtube_id) {
      malTrailerUrl = `https://www.youtube.com/embed/${malData.trailer.youtube_id}`;
    }

    return {
      ...movie,
      rating: freshRating,
      ratingVotesCount: votesCount,
      descriptionEn: synopsisEn,
      description: synopsisUa,
      posterUrl: freshPoster,
      trailerEmbedUrl: movie.trailerEmbedUrlUa || movie.trailerEmbedUrl || malTrailerUrl || undefined,
      trailerEmbedUrlEn: malTrailerUrl || movie.trailerEmbedUrlEn || undefined,
      title: (movie.title && /[а-яА-ЯіІїЇєЄґҐ]/.test(movie.title)) ? movie.title : translatedTitle,
      titleEn: englishTitle,
      originalTitle: originalTitle,
      duration: malData.episodes ? `${malData.episodes} серій` : movie.duration,
      year: malData.aired?.prop?.from?.year || movie.year || 2024,
    };
  } catch (err) {
    console.error(`Failed to update metadata from MyAnimeList for "${movie.title}":`, err);
    return movie;
  }
}

/**
 * Iterates through the entire catalog, updates anime titles automatically,
 * and saves them back to state / local storage.
 */
export async function updateAllAnimeCatalog(movies: Movie[]): Promise<{ updatedMovies: Movie[]; count: number }> {
  let count = 0;
  const updated = [...movies];

  for (let i = 0; i < updated.length; i++) {
    const movie = updated[i];
    if (movie.genres.includes('Аніме') && movie.myAnimeListUrl) {
      console.log(`Updating ${movie.title} from MyAnimeList...`);
      const updatedMovie = await updateAnimeMetadata(movie);
      updated[i] = updatedMovie;
      count++;
    }
  }

  return { updatedMovies: updated, count };
}

export interface MalEpisodeInfo {
  number: number;
  title: string;
  duration?: string;
  description?: string;
}

export interface MalMetadataResult {
  malId: number;
  title?: string;
  titleEn?: string;
  originalTitle?: string;
  synopsis?: string;
  totalEpisodes?: number;
  episodes: MalEpisodeInfo[];
}

/**
 * Fetches episode details (titles, descriptions, episode count) from MyAnimeList (Jikan API v4)
 */
export async function fetchMalEpisodesAndMetadata(malIdOrUrl: string | number): Promise<MalMetadataResult | null> {
  const malId = typeof malIdOrUrl === 'number' ? malIdOrUrl : extractMalId(malIdOrUrl);
  if (!malId) return null;

  try {
    // 1. Fetch main anime info from local server proxy or direct Jikan API
    let animeData: any = await fetchAnimeFromMal(malId);

    // 2. Fetch Серії Список from proxy or direct
    let rawEpisodes: any[] = [];
    try {
      const epProxyRes = await fetch(`/api/anime/${malId}/episodes`);
      if (epProxyRes.ok) {
        const epJson = await epProxyRes.json();
        if (epJson?.data && Array.isArray(epJson.data)) {
          rawEpisodes = epJson.data;
        }
      }
    } catch {
      // Fallback direct
      try {
        const epRes = await fetch(`https://api.jikan.moe/v4/anime/${malId}/episodes`);
        if (epRes.ok) {
          const json = await epRes.json();
          rawEpisodes = json.data || [];
        }
      } catch (epErr) {
        console.info(`Direct episodes fetch failed for MAL ID ${malId}:`, (epErr as any)?.message || epErr);
      }
    }

    const totalEpisodesCount = animeData?.episodes || rawEpisodes.length || 12;

    const episodes: MalEpisodeInfo[] = [];
    if (rawEpisodes.length > 0) {
      rawEpisodes.forEach((item: any, idx: number) => {
        const epNum = item.mal_id || (idx + 1);
        let epTitle = item.title || item.title_romanji || item.title_japanese || `Серія ${epNum}`;
        if (item.title && item.title_romanji && item.title !== item.title_romanji && !item.title.includes(item.title_romanji)) {
          epTitle = `${item.title} (${item.title_romanji})`;
        }
        episodes.push({
          number: epNum,
          title: epTitle,
          duration: '24 хв',
          description: item.synopsis || (animeData ? `Серія ${epNum} з "${animeData.title}".` : '')
        });
      });
    } else {
      // Fallback: build placeholder Серії array with count from MAL
      for (let i = 1; i <= totalEpisodesCount; i++) {
        episodes.push({
          number: i,
          title: `Серія ${i}`,
          duration: '24 хв',
          description: animeData?.title ? `Серія ${i} з "${animeData.title}".` : ''
        });
      }
    }

    return {
      malId,
      title: animeData?.title,
      titleEn: animeData?.title_english,
      originalTitle: animeData?.title_japanese,
      synopsis: animeData?.synopsis,
      totalEpisodes: totalEpisodesCount,
      episodes
    };
  } catch (err) {
    console.info(`Error fetching MAL episodes for ID ${malId}:`, (err as any)?.message || err);
    return null;
  }
}

/**
 * Translates English / Romanized anime titles into Ukrainian,
 * while leaving the English title intact for titleEn.
 */
export function translateAnimeTitleToUa(englishTitle?: string, romajiTitle?: string): string {
  const rawTitle = (englishTitle || romajiTitle || '').trim();
  if (!rawTitle) return 'Нове Аніме';

  const lower = rawTitle.toLowerCase();

  // Dictionary of known anime titles & franchises
  const knownDict: Record<string, string> = {
    'chainsmoker cat': 'Кіт-затятий курець',
    'grand blue dreaming': 'Неосяжний океан',
    'grand blue': 'Неосяжний океан',
    'puella magi madoka magica': 'Дівчинка-чарівниця Мадока Магіка',
    'madoka magica': 'Дівчинка-чарівниця Мадока Магіка',
    'you and i are polar opposites': 'Ми протилежності',
    'skeleton knight in another world': 'Лицар-скелет в іншому світі',
    'gaikotsu kishi-sama': 'Лицар-скелет в іншому світі',
    'black torch': 'Чорний смолоскип',
    'the ghost in the shell': 'Привид у обладунку',
    'ghost in the shell': 'Привид у обладунку',
    'koukaku kidoutai': 'Привид у обладунку',
    'i want to love you till your dying day': 'Кохатиму тебе до скону',
    'clevatess': 'Клеватесс',
    'solo leveling': 'Підняття рівня в поодинці',
    'ore dake level up na ken': 'Підняття рівня в поодинці',
    'frieren: beyond journey\'s end': 'Проводжання Фрірен',
    'sousou no frieren': 'Проводжання Фрірен',
    'demon slayer: kimetsu no yaiba': 'Клинок, який знищує демонів',
    'demon slayer': 'Клинок, який знищує демонів',
    'kimetsu no yaiba': 'Клинок, який знищує демонів',
    'dandadan': 'Дандадан',
    'kaiju no. 8': 'Кайдзю № 8',
    'kaijuu 8-gou': 'Кайдзю № 8',
    'oshi no ko': 'Зоряне дитя',
    'jujutsu kaisen': 'Магічна битва',
    'chainsaw man': 'Людина-бензопила',
    'attack on titan': 'Атака титанів',
    'shingeki no kyojin': 'Атака титанів',
    'mushoku tensei: jobless reincarnation': 'Реінкарнація безробітного',
    'mushoku tensei': 'Реінкарнація безробітного',
    'my hero academia': 'Моя академія героїв',
    'boku no hero academia': 'Моя академія героїв',
    'bleach: thousand-year blood war': 'Бліч: Тисячолітня кривава війна',
    'bleach': 'Бліч',
    'blue lock': 'Синьоока в\'язниця',
    'spy x family': 'Сім\'я шпигуна',
    'tower of god': 'Вежа Бога',
    'kami no tou': 'Вежа Бога',
    'that time i got reincarnated as a slime': 'Про мій перероджений слиз',
    'tensei shitara slime datta ken': 'Про мій перероджений слиз',
    'black butler': 'Темний дворецький',
    'kuroshitsuji': 'Темний дворецький',
    'wind breaker': 'Вітролом',
    'a sign of affection': 'Знак прихильності',
    'yubisaki to renren': 'Знак прихильності',
    'konosuba: god\'s blessing on this wonderful world!': 'Боже благословення на цей чудовий світ!',
    'konosuba': 'КоноСуба',
    're:zero - starting life in another world': 'Re:Zero — Життя з нуля в іншому світі',
    're:zero': 'Re:Zero',
    'sword art online': 'Майстри Меча Онлайн',
    'tokyo ghoul': 'Токійський ґуль',
    'dr. stone': 'Доктор Стоун',
    'vinland saga': 'Сага про Вінланд',
    'haikyu!!': 'Волейбол!!',
    'overlord': 'Володар',
    'classroom of the elite': 'Клас кращих',
    'youkoso jitsuryoku shijou shugi no kyoushitsu e': 'Клас кращих',
    'the eminence in shadow': 'Сходження у тіні',
    'kage no jitsuryokusha ni naritakute!': 'Сходження у тіні',
    'mashle: magic and muscles': 'Машл: Магія та мускули',
    'mashle': 'Машл',
    'hell\'s paradise': 'Пекельний рай',
    'jigokuraku': 'Пекельний рай',
    'shangri-la frontier': 'Рубіж Шангрі-Ла',
    'the boy and the heron': 'Хлопчик і чапля',
    'kimitachi wa dou ikiru ka': 'Хлопчик і чапля',
    'alya sometimes hides her feelings in russian': 'Аля іноді приховує свої почуття російською',
    'makeine: too many losing heroines!': 'Забагато програвших героїнь!',
    'wistoria: wand and sword': 'Вісторія: Паличка та меч',
    'the elusive samurai': 'Невловимий самурай',
    'pseudo harem': 'Псевдогарем',
    '2.5 dimensional seduction': 'Спокуса 2.5 виміру',
    'days with my stepsister': 'Дні зі зведеною сестрою',
    'nier: automata ver1.1a': 'Нір: Автомата Вер1.1а',
    'ranma 1/2': 'Ранма 1/2',
    'orb: on the movements of the earth': 'Про рух Землі',
    'chi: chikyuu no undou ni tsuite': 'Про рух Землі',
    'dragon ball daima': 'Драконячий перлині Дайма',
    'dragon ball': 'Драконячий перлині',
    'blue box': 'Блакитна скринька',
    'ao no hako': 'Блакитна скринька',
    'trillion game': 'Гра на трильйон',
    'rurouni kenshin': 'Бродяга Кеншін',
    'good bye, dragon life': 'Прощавай, життя дракона',
    'you are ms. servant': 'Ви — пані покоївка',
    'the most notorious "talker" runs the world\'s greatest clan': 'Найвідоміший «Балакун» очолює найсильніший клан',
    'loner life in another world': 'Життя самотника в іншому світі',
    'one piece': 'Ван Піс',
    'naruto': 'Наруто',
    'boruto': 'Боруто',
    'hunter x hunter': 'Хантер х Хантер',
    'fullmetal alchemist': 'Сталевий алхімік',
    'death note': 'Зошит смерті',
    'fate/zero': 'Доля/Зеро',
    'mob psycho 100': 'Моб Психо 100',
    'code geass': 'Код Ґіасс'
  };

  // Перевірка exact key match
  if (knownDict[lower]) {
    return knownDict[lower];
  }

  // Перевірка substring / prefix match in knownDict
  for (const [key, value] of Object.entries(knownDict)) {
    if (lower.startsWith(key) || lower.includes(key)) {
      let suffix = '';
      const seasonMatch = rawTitle.match(/season\s*(\d+)/i) || rawTitle.match(/2nd\s*season|3rd\s*season|4th\s*season/i);
      const partMatch = rawTitle.match(/part\s*(\d+)/i) || rawTitle.match(/cour\s*(\d+)/i);
      
      if (seasonMatch) {
        const num = seasonMatch[1] || (rawTitle.toLowerCase().includes('2nd') ? '2' : rawTitle.toLowerCase().includes('3rd') ? '3' : rawTitle.toLowerCase().includes('4th') ? '4' : '');
        if (num) suffix += `: ${num} Сезон`;
      }
      if (partMatch) {
        const num = partMatch[1] || '';
        suffix += ` (Частина ${num || ''})`.replace('()', '');
      }

      return value + suffix;
    }
  }

  // If no dict match, perform general Заголовок translation and cleanup
  let translated = rawTitle;

  translated = translated
    .replace(/season\s*(\d+)/gi, '$1 Сезон')
    .replace(/2nd season/gi, '2 Сезон')
    .replace(/3rd season/gi, '3 Сезон')
    .replace(/4th season/gi, '4 Сезон')
    .replace(/part\s*(\d+)/gi, 'Частина $1')
    .replace(/cour\s*(\d+)/gi, 'Кура $1')
    .replace(/the movie/gi, 'Фільм')
    .replace(/the final season/gi, 'Фінальний сезон')
    .replace(/tv animation/gi, 'Аніме-серіал')
    .replace(/special/gi, 'Спешел');

  return translated;
}

/**
 * Fetches current season / new airing anime from local server proxy or MyAnimeList Jikan API.
 */
export async function fetchNewAnimeFromMal(): Promise<Movie[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);
  try {
    let items: any[] = [];

    // 1. Try local server proxy
    try {
      const proxyRes = await fetch('/api/anime/seasons/now', { signal: controller.signal });
      if (proxyRes.ok) {
        const json = await proxyRes.json();
        if (json?.data && Array.isArray(json.data) && json.data.length > 0) {
          items = json.data;
        }
      }
    } catch {
      // Ignore proxy failure and try direct fallback
    }

    // 2. Direct fallback if proxy returned empty
    if (items.length === 0) {
      try {
        const res = await fetch('https://api.jikan.moe/v4/seasons/now', { signal: controller.signal });
        if (res.ok) {
          const json = await res.json();
          items = json.data || [];
        }
      } catch {
        // Direct fetch failed
      }
    }

    clearTimeout(timer);
    if (!items || items.length === 0) {
      return [];
    }

    const result: Movie[] = [];
    for (const item of items.slice(0, 15)) {
      if (!item || !item.mal_id) continue;
      
      const malId = item.mal_id;
      const englishTitle = item.title_english || item.title || 'New Anime';
      const titleEn = englishTitle;
      const titleUa = translateAnimeTitleToUa(englishTitle, item.title || item.title_japanese);

      const posterUrl = item.images?.jpg?.large_image_url || item.images?.jpg?.image_url || '';
      if (!posterUrl) continue;

      const rawGenres = (item.genres || []).map((g: any) => g.name || g);
      const genres = rawGenres.map((gName: string) => translateGenre(gName, 'UA'));
      if (!genres.includes('Аніме')) genres.push('Аніме');

      result.push({
        id: `mal_season_${malId}`,
        title: titleUa,
        titleEn: titleEn,
        originalTitle: item.title_japanese || item.title,
        type: 'series',
        year: item.year || item.aired?.prop?.from?.year || new Date().getFullYear(),
        duration: item.episodes ? `${item.episodes} серій` : '24 хв',
        rating: item.score ? Math.round(item.score * 10) / 10 : 8.2,
        ratingVotesCount: item.members ? `${Math.round(item.members / 1000)}K` : '15K',
        ageRating: '16+',
        description: item.synopsis || 'Свіжий аніме-реліз поточного сезону з бази MyAnimeList.',
        posterUrl,
        backdropUrl: posterUrl,
        genres,
        director: 'Японська анімаційна студія',
        cast: [],
        languages: ['Японська', 'Українська'],
        subtitles: ['Українські'],
        isNew: true,
        isPopular: item.score ? item.score >= 8.0 : true,
        viewsCount: item.members || 60000,
        myAnimeListUrl: item.url || `https://myanimelist.net/anime/${malId}`,
        videoUrl: ''
      });
    }

    return result;
  } catch (err) {
    clearTimeout(timer);
    console.info('Seasonal anime from MyAnimeList unavailable, continuing with local database.');
    return [];
  }
}


