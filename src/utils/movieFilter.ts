import { Movie } from '../types';

/**
 * Filter out any cartoons / animations from the site.
 * Preserves genuine Japanese anime ('Аніме', 'anime', Japanese productions).
 */
export function isCartoon(m: Movie | null | undefined): boolean {
  if (!m) return false;

  // Check Жанри for cartoon/animation markers
  const hasCartoonGenre = Boolean(
    m.genres &&
      m.genres.some((g: string) =>
        /мульт|cartoon|анімація|animation/i.test(String(g))
      )
  );

  const isAnime =
    m.type === 'anime' ||
    Boolean(
      m.genres &&
        m.genres.some((g: string) => /аніме|anime/i.test(String(g)))
    ) ||
    (m as any).originalLanguage === 'ja' ||
    (m as any).original_language === 'ja' ||
    ((m as any).originCountry && (m as any).originCountry.includes('JP'));

  // If marked as cartoon and not anime, it is definitely a cartoon
  if (hasCartoonGenre && !isAnime) {
    return true;
  }

  // Check Заголовок, descriptions and keywords for cartoons
  const text = `${m.title || ''} ${m.titleEn || ''} ${m.description || ''} ${m.originalTitle || ''} ${m.id || ''}`.toLowerCase();

  // Exclude unwanted Фільми like Welcome To The Jungle
  const excludedMoviesPattern = /(welcome to the jungle|jumanji.*welcome to the jungle|поклик джунглів|ласкаво просимо до джунглів)/i;
  if (excludedMoviesPattern.test(text)) {
    return true;
  }

  // Western cartoon keywords
  const cartoonPattern = /(мультфільм|мультсеріал|мультик|анімаційний|cartoon|animated feature|disney animation|pixar|dreamworks animation|illumination entertainment|inside out|думками навиворіт|despicable me|нікчемний я|minions|посіпаки|kung fu panda|панда кунг-фу|shrek|шрек|toy story|історія іграшок|frozen|крижане серце|moana|ваана|моана|zootopia|зоотрополіс|madagascar|мадагаскар|ice age|льодовиковий період|finding nemo|у пошуках немо|cars 3|тачки|how to train your dragon|як приборкати дракона)/i;

  if (cartoonPattern.test(text) && !isAnime) {
    return true;
  }

  return false;
}

/**
 * Sanitize movie genres so that 'Мультфільм' or 'Анімація' NEVER appear on the website.
 * If it's anime, it will only have 'Аніме' and other non-cartoon genres.
 */
export function sanitizeMovieGenres(movie: Movie): Movie {
  if (!movie || !Array.isArray(movie.genres)) return movie;

  const cleanedGenres = movie.genres.filter(
    (g: string) => !/мульт|cartoon|анімація|animation/i.test(String(g))
  );

  // If it is anime, ensure 'Аніме' is present if empty
  const isAnime =
    movie.type === 'anime' ||
    Boolean(movie.genres.some((g: string) => /аніме|anime/i.test(String(g)))) ||
    (movie as any).originalLanguage === 'ja';

  if (isAnime && !cleanedGenres.includes('Аніме')) {
    cleanedGenres.unshift('Аніме');
  }

  return {
    ...movie,
    genres: cleanedGenres.length > 0 ? cleanedGenres : ['Кіно']
  };
}
