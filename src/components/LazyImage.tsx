import React, { useState, useEffect, useRef } from 'react';
import { Film } from 'lucide-react';
import { getVerifiedPoster, isPosterInvalid } from '../services/posterLookup';

interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  fallbackSrc?: string;
  className?: string;
  wrapperClassName?: string;
  movieTitle?: string;
  titleEn?: string;
  originalTitle?: string;
  movieType?: string;
  genres?: string[];
  year?: number;
}

const DEFAULT_POSTER_FALLBACK = 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=600&q=80';

// Global cache of successfully loaded poster URLs to prevent re-pulsing/re-Завантаження during scrolling
const LOADED_POSTERS_CACHE = new Set<string>();

export const LazyImage: React.FC<LazyImageProps> = ({
  src,
  alt,
  fallbackSrc = DEFAULT_POSTER_FALLBACK,
  className = '',
  wrapperClassName = '',
  movieTitle,
  titleEn,
  originalTitle,
  movieType,
  genres,
  year,
  ...props
}) => {
  const isInitiallyCached = src && (LOADED_POSTERS_CACHE.has(src) || src.startsWith('/') || src.startsWith('data:'));
  const [isLoaded, setIsLoaded] = useState<boolean>(!!isInitiallyCached);
  const [hasError, setHasError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(src);
  const isRecoveringRef = useRef(false);

  useEffect(() => {
    setCurrentSrc(src);
    if (src && (LOADED_POSTERS_CACHE.has(src) || src.startsWith('/'))) {
      setIsLoaded(true);
      setHasError(false);
    } else {
      setHasError(false);
    }
    isRecoveringRef.current = false;
  }, [src]);

  const handleLoad = () => {
    if (currentSrc) {
      LOADED_POSTERS_CACHE.add(currentSrc);
    }
    setIsLoaded(true);
  };

  const handleError = async () => {
    // If not already recovered through TMDB / AniList lookup, attempt automated database discovery
    if (!isRecoveringRef.current && (movieTitle || titleEn || originalTitle || alt)) {
      isRecoveringRef.current = true;
      try {
        const foundPoster = await getVerifiedPoster(
          null,
          movieTitle || alt,
          movieType,
          genres,
          year,
          titleEn,
          originalTitle
        );
        if (foundPoster && foundPoster !== currentSrc) {
          setCurrentSrc(foundPoster);
          return;
        }
      } catch (e) {}
    }

    if (!hasError && fallbackSrc && currentSrc !== fallbackSrc) {
      setCurrentSrc(fallbackSrc);
      setHasError(true);
    } else {
      setHasError(true);
      setIsLoaded(true);
    }
  };

  return (
    <div className={`relative overflow-hidden bg-zinc-900 ${wrapperClassName}`}>
      {/* Background skeleton placeholder only if not yet loaded and no error */}
      {!isLoaded && !hasError && (
        <div className="absolute inset-0 bg-zinc-800/40 animate-pulse flex items-center justify-center z-0 pointer-events-none" />
      )}

      {/* Stylized fallback if error occurs and fallback couldn't load */}
      {hasError && currentSrc === fallbackSrc && !isLoaded && (
        <div className="absolute inset-0 bg-gradient-to-br from-[#1c1c1e] to-[#0d0d0f] flex flex-col items-center justify-center text-zinc-500 p-3 text-center pointer-events-none z-0">
          <Film className="w-8 h-8 mb-1 text-zinc-600" />
          <span className="text-[11px] font-sans font-medium line-clamp-2 text-zinc-400">{movieTitle || alt}</span>
        </div>
      )}
      
      <img
        src={currentSrc}
        alt={movieTitle || alt}
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        onLoad={handleLoad}
        onError={handleError}
        className={`${className} transition-opacity duration-200 ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        }`}
        {...props}
      />
    </div>
  );
};
