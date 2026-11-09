import translationsJson from './translations.json';

export type Language = 'UA' | 'ENG';

export type Translations = typeof translationsJson.UA;

export const translations = translationsJson as Record<Language, Translations>;

export const genreTranslations: Record<string, { UA: string; ENG: string }> = {
  'Екшн': { UA: 'Екшн', ENG: 'Action' },
  'Action': { UA: 'Екшн', ENG: 'Action' },
  'Детектив': { UA: 'Детектив', ENG: 'Mystery' },
  'Mystery': { UA: 'Детектив', ENG: 'Mystery' },
  'Драма': { UA: 'Драма', ENG: 'Drama' },
  'Drama': { UA: 'Драма', ENG: 'Drama' },
  'Кримінал': { UA: 'Кримінал', ENG: 'Crime' },
  'Crime': { UA: 'Кримінал', ENG: 'Crime' },
  'Фантастика': { UA: 'Фантастика', ENG: 'Sci-Fi' },
  'Sci-Fi': { UA: 'Фантастика', ENG: 'Sci-Fi' },
  'Science Fiction': { UA: 'Фантастика', ENG: 'Sci-Fi' },
  'Пригоди': { UA: 'Пригоди', ENG: 'Adventure' },
  'Adventure': { UA: 'Пригоди', ENG: 'Adventure' },
  'Бойовик': { UA: 'Бойовик', ENG: 'Action' },
  'Біографія': { UA: 'Біографія', ENG: 'Biography' },
  'Biography': { UA: 'Біографія', ENG: 'Biography' },
  'Історія': { UA: 'Історія', ENG: 'History' },
  'History': { UA: 'Історія', ENG: 'History' },
  'Historical': { UA: 'Історія', ENG: 'Historical' },
  'Жахи': { UA: 'Жахи', ENG: 'Horror' },
  'Horror': { UA: 'Жахи', ENG: 'Horror' },
  'Трилер': { UA: 'Трилер', ENG: 'Thriller' },
  'Thriller': { UA: 'Трилер', ENG: 'Thriller' },
  'Suspense': { UA: 'Трилер', ENG: 'Suspense' },
  'Фентезі': { UA: 'Фентезі', ENG: 'Fantasy' },
  'Fantasy': { UA: 'Фентезі', ENG: 'Fantasy' },
  'Комедія': { UA: 'Комедія', ENG: 'Comedy' },
  'Comedy': { UA: 'Комедія', ENG: 'Comedy' },
  'Аніме': { UA: 'Аніме', ENG: 'Anime' },
  'Anime': { UA: 'Аніме', ENG: 'Anime' },
  'Сімейний': { UA: 'Сімейний', ENG: 'Family' },
  'Family': { UA: 'Сімейний', ENG: 'Family' },
  'Романтика': { UA: 'Романтика', ENG: 'Romance' },
  'Romance': { UA: 'Романтика', ENG: 'Romance' },
  'Мелодрама': { UA: 'Мелодрама', ENG: 'Romance' },
  'Надприродне': { UA: 'Надприродне', ENG: 'Supernatural' },
  'Supernatural': { UA: 'Надприродне', ENG: 'Supernatural' },
  'Girls Love': { UA: 'Дівчаче кохання', ENG: 'Girls Love' },
  'Boys Love': { UA: 'Хлопчаче кохання', ENG: 'Boys Love' },
  'Музика': { UA: 'Музика', ENG: 'Music' },
  'Music': { UA: 'Музика', ENG: 'Music' },
  'Спорт': { UA: 'Спорт', ENG: 'Sports' },
  'Sports': { UA: 'Спорт', ENG: 'Sports' },
  'Slice of Life': { UA: 'Повсякденність', ENG: 'Slice of Life' },
  'Повсякденність': { UA: 'Повсякденність', ENG: 'Slice of Life' },
  'Super Power': { UA: 'Суперсила', ENG: 'Superpower' },
  'Superpower': { UA: 'Суперсила', ENG: 'Superpower' },
  'Суперсила': { UA: 'Суперсила', ENG: 'Superpower' },
  'Ecchi': { UA: 'Еччі', ENG: 'Ecchi' },
  'Еччі': { UA: 'Еччі', ENG: 'Ecchi' },
  'Harem': { UA: 'Гарем', ENG: 'Harem' },
  'Гарем': { UA: 'Гарем', ENG: 'Harem' },
  'Isekai': { UA: 'Ісекай', ENG: 'Isekai' },
  'Ісекай': { UA: 'Ісекай', ENG: 'Isekai' },
  'Mecha': { UA: 'Меха', ENG: 'Mecha' },
  'Меха': { UA: 'Меха', ENG: 'Mecha' },
  'Psychological': { UA: 'Психологія', ENG: 'Psychological' },
  'Психологія': { UA: 'Психологія', ENG: 'Psychological' },
  'Reincarnation': { UA: 'Реінкарнація', ENG: 'Reincarnation' },
  'Реінкарнація': { UA: 'Реінкарнація', ENG: 'Reincarnation' },
  'School': { UA: 'Школа', ENG: 'School' },
  'Школа': { UA: 'Школа', ENG: 'School' },
  'Military': { UA: 'Військове', ENG: 'Military' },
  'Військове': { UA: 'Військове', ENG: 'Military' },
  'Мультфільм': { UA: 'Мультфільм', ENG: 'Animation' },
  'Animation': { UA: 'Мультфільм', ENG: 'Animation' },
  'Документальний': { UA: 'Документальний', ENG: 'Documentary' },
  'Documentary': { UA: 'Документальний', ENG: 'Documentary' }
};

export function translateGenre(genre: string, lang: Language): string {
  if (!genre) return '';
  const trimmed = genre.trim();
  const found = genreTranslations[trimmed];
  if (found) {
    return lang === 'ENG' ? found.ENG : found.UA;
  }
  // Try to find by case-insensitive matching
  const lower = trimmed.toLowerCase();
  const entry = Object.entries(genreTranslations).find(
    ([key, item]) => key.toLowerCase() === lower || item.UA.toLowerCase() === lower || item.ENG.toLowerCase() === lower
  );
  if (entry) {
    return lang === 'ENG' ? entry[1].ENG : entry[1].UA;
  }
  return trimmed;
}

/**
 * Helper to get strictly localized movie title.
 * When lang === 'ENG', returns English title.
 * When lang === 'UA', returns Ukrainian title.
 */
export function getMovieTitle(
  movie?: { title?: string; titleEn?: string; originalTitle?: string } | null,
  lang: Language = 'UA'
): string {
  if (!movie) return '';
  if (lang === 'ENG') {
    return movie.titleEn || movie.originalTitle || movie.title || '';
  }
  // UA mode: prioritize Ukrainian Заголовок
  if (movie.title && /[а-яА-ЯіІїЇєЄґҐ]/.test(movie.title)) {
    return movie.title;
  }
  return movie.title || movie.titleEn || movie.originalTitle || '';
}

/**
 * Helper to get strictly localized movie description.
 * When lang === 'ENG', returns English description.
 * When lang === 'UA', returns Ukrainian description.
 */
export function getMovieDescription(
  movie?: { description?: string; descriptionEn?: string } | null,
  lang: Language = 'UA'
): string {
  if (!movie) return '';
  if (lang === 'ENG') {
    if (movie.descriptionEn && !/[а-яА-ЯіІїЇєЄґҐ]{8,}/.test(movie.descriptionEn)) {
      return movie.descriptionEn;
    }
    return 'A captivating cinematic story full of unexpected twists and unforgettable moments.';
  }
  // UA mode:
  if (movie.description && /[а-яА-ЯіІїЇєЄґҐ]/.test(movie.description)) {
    return movie.description;
  }
  return 'Захоплююча кіноісторія, сповнена несподіваних поворотів долі та незабутніх емоцій.';
}
