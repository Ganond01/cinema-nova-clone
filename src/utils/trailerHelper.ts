import { Movie } from '../types';

/**
 * Converts any YouTube URL (watch?v=, youtu.be/, embed/, etc.) or movie trailer field into a clean embed URL
 */
export function formatYouTubeEmbedUrl(url?: string): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  if (trimmed.includes('/embed/')) {
    return trimmed;
  }

  // Обробка youtu.be/ID
  const shortMatch = trimmed.match(/youtu\.be\/([a-zA-Z0-9_-]+)/);
  if (shortMatch && shortMatch[1]) {
    return `https://www.youtube.com/embed/${shortMatch[1]}`;
  }

  // Обробка watch?v=ID
  const watchMatch = trimmed.match(/[?&]v=([a-zA-Z0-9_-]+)/);
  if (watchMatch && watchMatch[1]) {
    return `https://www.youtube.com/embed/${watchMatch[1]}`;
  }

  // Обробка /v/ID or /vi/ID
  const vMatch = trimmed.match(/\/vi?\/([a-zA-Z0-9_-]+)/);
  if (vMatch && vMatch[1]) {
    return `https://www.youtube.com/embed/${vMatch[1]}`;
  }

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }

  return null;
}

/**
 * Resolves standard trailer embed URL across all content types (Anime, Doramas, Series, Movies)
 */
export function resolveTrailerUrl(movie: Movie, language: 'UA' | 'ENG' = 'UA'): string {
  if (language === 'UA') {
    if (movie.trailerEmbedUrlUa) {
      const formatted = formatYouTubeEmbedUrl(movie.trailerEmbedUrlUa);
      if (formatted) return formatted;
    }
    if (movie.trailerEmbedUrl) {
      const formatted = formatYouTubeEmbedUrl(movie.trailerEmbedUrl);
      if (formatted) return formatted;
    }
    if (movie.trailerUrl) {
      const formatted = formatYouTubeEmbedUrl(movie.trailerUrl);
      if (formatted) return formatted;
    }
    if (movie.trailerEmbedUrlEn) {
      const formatted = formatYouTubeEmbedUrl(movie.trailerEmbedUrlEn);
      if (formatted) return formatted;
    }
    const searchQuery = encodeURIComponent(`${movie.title} офіційний трейлер українською`);
    return `https://www.youtube.com/embed?listType=search&list=${searchQuery}`;
  } else {
    if (movie.trailerEmbedUrlEn) {
      const formatted = formatYouTubeEmbedUrl(movie.trailerEmbedUrlEn);
      if (formatted) return formatted;
    }
    if (movie.trailerEmbedUrl) {
      const formatted = formatYouTubeEmbedUrl(movie.trailerEmbedUrl);
      if (formatted) return formatted;
    }
    if (movie.trailerUrl) {
      const formatted = formatYouTubeEmbedUrl(movie.trailerUrl);
      if (formatted) return formatted;
    }
    const title = movie.titleEn || movie.title;
    const searchQuery = encodeURIComponent(`${title} official trailer`);
    return `https://www.youtube.com/embed?listType=search&list=${searchQuery}`;
  }
}
