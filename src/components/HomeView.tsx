import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { Play, ChevronLeft, ChevronRight, Clock, Star } from 'lucide-react';
import { Movie } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { translateGenre, Language, getMovieTitle, getMovieDescription } from '../lib/translations';
import { validatePosterUrl, handlePosterError } from '../utils/imageFallback';
import { DORAMAS_LIST } from '../data/doramas';
import { ANIME_LIST } from '../data/animeData';
import { isCartoon } from '../utils/movieFilter';
import FeaturedBanner, { HERO_POD_CONFIG } from './FeaturedBanner';

export { HERO_POD_CONFIG };

interface ContinueWatchingItem extends Movie {
  progressPercent?: number;
  currentEpisode?: string;
}

interface HomeViewProps {
  movies: Movie[];
  continueWatchingMovies?: ContinueWatchingItem[];
  personalizedRecommendations?: Movie[];
  onSelectMovie: (movie: Movie) => void;
  onPlayMovie: (movie: Movie) => void;
  setActiveTab: (tab: string) => void;
  onToggleFavorite?: (movieId: string) => void;
  favorites?: string[];
}

interface CarouselRowProps {
  title: string;
  movies: Movie[];
  onSelectMovie: (movie: Movie) => void;
  onSeeAll?: () => void;
  language: Language;
}

const CarouselRow: React.FC<CarouselRowProps> = React.memo(({
  title,
  movies,
  onSelectMovie,
  onSeeAll,
  language,
}) => {
  const rowRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = useCallback(() => {
    if (rowRef.current) {
      const { scrollLeft, clientWidth, scrollWidth } = rowRef.current;
      setCanScrollLeft(scrollLeft > 6);
      setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 10);
    }
  }, []);

  useEffect(() => {
    const el = rowRef.current;
    if (!el) return;

    checkScroll();

    el.addEventListener('scroll', checkScroll, { passive: true });
    window.addEventListener('resize', checkScroll);

    const t1 = setTimeout(checkScroll, 100);
    const t2 = setTimeout(checkScroll, 350);

    return () => {
      el.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [checkScroll, movies]);

  const scroll = (direction: 'left' | 'right') => {
    if (rowRef.current) {
      const { scrollLeft, clientWidth } = rowRef.current;
      const scrollAmount = Math.max(300, clientWidth * 0.85);
      rowRef.current.scrollTo({
        left: direction === 'left' ? scrollLeft - scrollAmount : scrollLeft + scrollAmount,
        behavior: 'smooth',
      });
      setTimeout(checkScroll, 80);
      setTimeout(checkScroll, 250);
      setTimeout(checkScroll, 500);
    }
  };

  if (!movies || movies.length === 0) return null;

  return (
    <section className="space-y-[10px] md:space-y-4 relative w-full max-w-[1430px] mx-auto">
      {/* Header with Title and "Дивитись всі" button directly beside it */}
      <div className="flex items-center gap-3.5 px-0 md:px-1">
        <h3
          style={{ fontFamily: "'Montserrat Alternates', sans-serif" }}
          className="text-[16px] md:text-xl font-semibold text-white tracking-tight"
        >
          {title}
        </h3>
        {onSeeAll && (
          <button
            onClick={onSeeAll}
            className="w-[51px] h-[10px] md:w-auto md:h-auto text-[8px] md:text-sm font-medium text-white hover:text-white flex items-center justify-between md:justify-start gap-1 transition-all cursor-pointer bg-transparent border-none p-0 group select-none shrink-0"
          >
            <span className="group-hover:underline group-active:underline underline-offset-4 decoration-1 decoration-white whitespace-nowrap leading-none">
              {language === 'UA' ? 'Дивитись всі' : 'See all'}
            </span>
            <ChevronRight className="w-2 h-2 md:w-4 md:h-4 text-white group-hover:translate-x-0.5 transition-transform shrink-0" />
          </button>
        )}
      </div>

      {/* Картки Контейнер */}
      <div className="relative">
        {/* Scroll Left Button:
            - larger size (більша)
            - extends beyond posters (виходить за постери)
            - frosted glass blur (має мати блюр)
            - hidden when at scroll position 0, appears once scrolled forward
            - permanently visible (not hidden waiting for hover)
            - no border / outline / hover color change
        */}
        {canScrollLeft && (
          <button
            type="button"
            onClick={() => scroll('left')}
            className="hidden md:flex absolute -left-3 sm:-left-6 lg:-left-7 top-1/2 -translate-y-1/2 z-40 w-12 h-12 sm:w-16 sm:h-16 md:w-[78px] md:h-[78px] rounded-full text-white items-center justify-center transition-transform duration-150 hover:scale-105 active:scale-95 shadow-[0_8px_30px_rgba(0,0,0,0.7)] cursor-pointer border-0 border-none outline-none ring-0 select-none"
            style={{
              backgroundColor: 'rgba(0, 0, 0, 0.65)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
            }}
            aria-label="Scroll left"
          >
            <ChevronLeft className="w-8 h-8 sm:w-10 sm:h-10 md:w-[48px] md:h-[48px] stroke-[2] -translate-x-0.5" />
          </button>
        )}

        {/* Scroll Right Button:
            - larger size (більша)
            - extends beyond posters (виходить за постери)
            - frosted glass blur (має мати блюр)
            - visible when items can be scrolled forward, disappears at end
            - permanently visible (not hidden waiting for hover)
            - no border / outline / hover color change
        */}
        {canScrollRight && (
          <button
            type="button"
            onClick={() => scroll('right')}
            className="hidden md:flex absolute -right-3 sm:-right-6 lg:-right-7 top-1/2 -translate-y-1/2 z-40 w-12 h-12 sm:w-16 sm:h-16 md:w-[78px] md:h-[78px] rounded-full text-white items-center justify-center transition-transform duration-150 hover:scale-105 active:scale-95 shadow-[0_8px_30px_rgba(0,0,0,0.7)] cursor-pointer border-0 border-none outline-none ring-0 select-none"
            style={{
              backgroundColor: 'rgba(0, 0, 0, 0.65)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
            }}
            aria-label="Scroll right"
          >
            <ChevronRight className="w-8 h-8 sm:w-10 sm:h-10 md:w-[48px] md:h-[48px] stroke-[2] translate-x-0.5" />
          </button>
        )}

        {/* Рядок Scroll View (Figma: gap 30px between Картки) */}
        <div
          ref={rowRef}
          className="flex gap-[10px] md:gap-[30px] overflow-x-auto pb-4 pt-0 md:pt-1 scrollbar-none scroll-smooth snap-x snap-mandatory"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {movies.map((movie) => {
            const titleText = getMovieTitle(movie, language);
            return (
              <div
                key={movie.id}
                onClick={() => onSelectMovie(movie)}
                className="w-[104px] h-[146px] min-w-[104px] sm:w-[calc((100%-32px)/3)] sm:h-auto sm:min-w-0 md:w-[calc((100%-60px)/3)] lg:w-[calc((100%-90px)/4)] xl:w-[calc((100%-120px)/5)] shrink-0 snap-start bg-[#121212] border-0 sm:border sm:border-white/10 rounded-[4.78px] sm:rounded-[16px] shadow-xl sm:hover:shadow-[0_0_28px_rgba(255,48,64,0.35)] sm:hover:border-transparent poster-hover-notif-border transition-all duration-300 ease-out cursor-pointer group/card group relative aspect-[104/146] sm:aspect-[2/3] select-none"
              >
                <div className="relative w-full h-full overflow-hidden bg-[#121212] rounded-[4.78px] sm:rounded-[15px]">
                  {/* 1. Базове чітке зображення постера */}
                  <img
                    src={validatePosterUrl(movie.posterUrl, movie.title, movie.type, movie.genres)}
                    alt={movie.title}
                    className="w-full h-full object-cover transition-transform duration-500 ease-out sm:group-hover:scale-[1.03]"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    onError={(e) => handlePosterError(e, movie.posterUrl, movie.title, movie.type, movie.genres)}
                  />

                  {/* Side Vignette Накладення (оверлей) on the Картка */}
                  <div className="absolute inset-0 pointer-events-none z-10 bg-gradient-to-r from-black/40 via-transparent to-black/40 shadow-[inset_0_0_24px_rgba(0,0,0,0.6)]" />

                  {/* Floating Бейджі on Mobile: w32.58px h14.13px, gap 26px */}
                  <div className="absolute top-1.5 inset-x-0 px-[6.42px] flex items-center justify-between z-30 pointer-events-none sm:hidden">
                    <div className="w-[32.58px] h-[14.13px] text-white rounded-[4px] flex items-center justify-center gap-0.5 bg-black/35 backdrop-blur-md border border-white/15 shadow-sm">
                      <Star className="w-[8px] h-[8px] fill-[#FF3040] text-[#FF3040] shrink-0" />
                      <span className="text-white font-bold text-[7px] tracking-tight leading-none">{movie.rating?.toFixed(1) || movie.rating}</span>
                    </div>
                    <div className="w-[32.58px] h-[14.13px] text-white rounded-[4px] flex items-center justify-center bg-black/35 backdrop-blur-md border border-white/15 shadow-sm">
                      <span className="text-white font-bold text-[7px] tracking-tight leading-none">{movie.ageRating || '16+'}</span>
                    </div>
                  </div>

                  {/* Desktop Floating Рейтинг & Age Бейджі */}
                  <div
                    className="hidden sm:flex absolute top-3 left-3 text-white px-3.5 py-1.5 rounded-[10px] text-xs font-semibold items-center gap-1.5 z-30 transition-all pointer-events-none bg-black/35 backdrop-blur-md border border-white/15 shadow-sm group-hover:bg-white/10 group-hover:border-white/25 duration-300"
                  >
                    <Star className="w-3.5 h-3.5 fill-[#FF3040] text-[#FF3040] shrink-0" />
                    <span className="text-white font-bold text-xs tracking-tight">{movie.rating?.toFixed(1) || movie.rating}</span>
                  </div>

                  <div
                    className="hidden sm:flex absolute top-3 right-3 text-white px-3.5 py-1.5 rounded-[10px] text-xs font-semibold z-30 transition-all pointer-events-none items-center justify-center bg-black/35 backdrop-blur-md border border-white/15 shadow-sm group-hover:bg-white/10 group-hover:border-white/25 duration-300"
                  >
                    <span className="text-white font-bold text-xs tracking-tight">{movie.ageRating || '16+'}</span>
                  </div>

                  {/* Specular Glass Sheen Накладення (оверлей) */}
                  <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-white/15 pointer-events-none mix-blend-overlay z-15" />

                  {/* Frosted Glass Bottom Panel with Backdrop Blur: 9px padding and margins on mobile, 22px on desktop */}
                  <div className="absolute inset-x-0 bottom-0 z-20 flex flex-col justify-start pt-[9px] pb-[8px] px-[5px] sm:px-4 sm:pt-[22px] sm:pb-4 w-[104px] h-auto sm:w-full sm:h-auto bg-gradient-to-t from-black/95 via-black/80 to-transparent backdrop-blur-[10px] pointer-events-none transition-all duration-300 ease-out">
                    <h4 className="font-sans font-bold text-white text-[8px] sm:text-[17px] leading-tight line-clamp-2 break-words w-full sm:w-[239px] sm:max-w-full sm:h-[42px] text-left drop-shadow-md">
                      {titleText}
                    </h4>

                    <div className="flex items-center text-[6px] sm:text-[11.5px] text-zinc-300 font-normal w-full whitespace-nowrap overflow-hidden font-sans text-left mt-[9px] sm:mt-[22px] drop-shadow-sm gap-1 sm:gap-1.5">
                      {movie.genres?.slice(0, 2).map((genre, idx) => (
                        <React.Fragment key={genre}>
                          {idx > 0 && <span className="w-0.5 h-0.5 sm:w-1 sm:h-1 rounded-full bg-[#FF3040] inline-block shrink-0" />}
                          <span className="text-zinc-300 truncate">{translateGenre(genre, language)}</span>
                        </React.Fragment>
                      ))}
                      <span className="w-0.5 h-0.5 sm:w-1 sm:h-1 rounded-full bg-[#FF3040] inline-block shrink-0" />
                      <span className="text-zinc-400 shrink-0">{movie.year}</span>
                    </div>

                    {/* Short Опис expansion on hover */}
                    <div className="grid grid-rows-[0fr] group-hover:grid-rows-[1fr] transition-all duration-300 ease-out">
                      <div className="overflow-hidden">
                        <p className="text-xs sm:text-[12.5px] text-zinc-200/90 font-sans leading-relaxed line-clamp-4 mt-2.5 pt-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-75">
                          {getMovieDescription(movie, language)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
});

export const HomeView: React.FC<HomeViewProps> = React.memo(({
  movies,
  continueWatchingMovies = [],
  personalizedRecommendations = [],
  onSelectMovie,
  onPlayMovie,
  setActiveTab,
  onToggleFavorite,
  favorites = [],
}) => {
  const { language } = useLanguage();

  // Допоміжна функція to ensure Фільм has a real valid Опис
  const hasValidDescription = (m: Movie) => {
    if (!m.description) return false;
    const desc = m.description.trim();
    if (desc.length < 10) return false;
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
  };

  // Filter out any cartoons ("видали всі мультфільми які є, такого в нас немає")
  const nonCartoonMovies = useMemo(() => {
    return movies.filter((m) => !isCartoon(m));
  }, [movies]);

  // Exclusively real modern blockbuster releases for hero banner and "Останні Новинки"
  const newReleases = useMemo(() => {
    return nonCartoonMovies.filter(
      (m) =>
        (m.isNew === true ||
          (m.year && m.year >= 2024) ||
          ['gladiator-2-2024', 'alien-romulus-2024', 'dune-part-two-2024', 'deadpool-wolverine-2024', 'furiosa-2024', 'nosferatu-2024', 'captain-america-brave-new-world-2025', 'arcane-s2-2024', 'the-penguin-2024', 'solo-leveling-2024', 'kaiju-no-8'].includes(
            m.id
          )) &&
        hasValidDescription(m)
    ).sort((a, b) => (b.year || 0) - (a.year || 0) || (b.rating || 0) - (a.rating || 0));
  }, [nonCartoonMovies]);

  const heroList = useMemo(() => {
    return newReleases.length > 0 ? newReleases : nonCartoonMovies.filter((m) => m.isNew);
  }, [newReleases, nonCartoonMovies]);

  // Grouped Фільми for Категорії
  const trendingMovies = useMemo(() => {
    return nonCartoonMovies.filter(
      (m) =>
        ['gladiator-2-2024', 'alien-romulus-2024', 'dune-part-two-2024', 'deadpool-wolverine-2024', 'arcane-s2-2024', 'the-penguin-2024', 'squid-game-s2', 'solo-leveling-2024'].includes(
          m.id
        ) || m.isPopular
    );
  }, [nonCartoonMovies]);

  const isAnime = useCallback((m: Movie) => {
    return (m.genres && m.genres.some((g: string) => /аніме|anime/i.test(String(g)))) || (m.type as string) === 'anime';
  }, []);

  const popularMoviesList = useMemo(() => {
    return nonCartoonMovies
      .filter((m) => (m.type === 'movie' || !m.type) && !isAnime(m) && m.type !== 'dorama' && !m.id.includes('dorama'))
      .filter((m) => m.isPopular || (m.rating >= 7.2) || (m.viewsCount && m.viewsCount > 1000) || ['gladiator-2-2024', 'dune-part-two-2024', 'deadpool-wolverine-2024', 'alien-romulus-2024', 'furiosa-2024', 'nosferatu-2024', 'oppenheimer-2023', 'the-batman-2022', 'interstellar-2014'].includes(m.id))
      .sort((a, b) => (b.viewsCount || 0) - (a.viewsCount || 0) || (b.rating || 0) - (a.rating || 0));
  }, [nonCartoonMovies, isAnime]);

  const popularSeriesList = useMemo(() => {
    return nonCartoonMovies
      .filter((m) => m.type === 'series' && !isAnime(m) && !m.id.includes('dorama'))
      .filter((m) => m.isPopular || (m.rating >= 7.2) || (m.viewsCount && m.viewsCount > 1000) || ['arcane-s2-2024', 'the-penguin-2024', 'stranger-things-s4', 'squid-game-s2', 'the-witcher-s3', 'black-mirror'].includes(m.id))
      .sort((a, b) => (b.viewsCount || 0) - (a.viewsCount || 0) || (b.rating || 0) - (a.rating || 0));
  }, [nonCartoonMovies, isAnime]);

  const popularAnimeList = useMemo(() => {
    const list = [...ANIME_LIST];
    const existingIds = new Set(list.map((m) => m.id));
    const existingTitlesUa = new Set(list.map(m => (m.title || '').toLowerCase().replace(/[^a-zа-яіїєґ0-9]/gi, '')).filter(Boolean));
    const existingTitlesEn = new Set(list.map(m => (m.titleEn || '').toLowerCase().replace(/[^a-zа-яіїєґ0-9]/gi, '')).filter(Boolean));

    const extraAnime = nonCartoonMovies.filter((m) => {
      if (m.type !== 'anime' && !isAnime(m)) return false;
      if (existingIds.has(m.id)) return false;
      const uaNorm = (m.title || '').toLowerCase().replace(/[^a-zа-яіїєґ0-9]/gi, '');
      const enNorm = (m.titleEn || '').toLowerCase().replace(/[^a-zа-яіїєґ0-9]/gi, '');
      if (uaNorm && existingTitlesUa.has(uaNorm)) return false;
      if (enNorm && existingTitlesEn.has(enNorm)) return false;
      return true;
    });

    return [...list, ...extraAnime]
      .filter((m) => !isCartoon(m))
      .filter((m) => m.isPopular || (m.rating >= 7.5) || ['solo-leveling-2024', 'kaiju-no-8', 'frieren-2023', 'jujutsu-kaisen-2020', 'demon-slayer-2019', 'attack-on-titan', 'chainsaw-man-2022', 'bleach-thousand-year-blood-war', 'vinland-saga'].includes(m.id))
      .sort((a, b) => (b.viewsCount || 0) - (a.viewsCount || 0) || (b.rating || 0) - (a.rating || 0));
  }, [nonCartoonMovies, isAnime]);

  const popularDoramasList = useMemo(() => {
    const fromProps = nonCartoonMovies.filter(
      (m) => (m.type === 'dorama' || m.id.includes('dorama')) && !isCartoon(m)
    );
    const baseList = fromProps.length > 0 ? fromProps : DORAMAS_LIST;
    return baseList
      .filter((m) => !isCartoon(m))
      .filter((m) => m.isPopular || (m.rating >= 7.4) || (m.viewsCount && m.viewsCount > 1000) || ['squid-game', 'the-judge-from-hell', 'bon-appetit', 'all-of-us-are-dead'].some(id => m.id.includes(id)))
      .sort((a, b) => (b.viewsCount || 0) - (a.viewsCount || 0) || (b.rating || 0) - (a.rating || 0));
  }, [nonCartoonMovies]);

  // Capped at 24 top items per carousel Рядок for smooth 60fps scrolling & memory optimization
  const displayTrending = useMemo(() => trendingMovies.slice(0, 24), [trendingMovies]);
  const displayPopularMovies = useMemo(() => popularMoviesList.slice(0, 24), [popularMoviesList]);
  const displayPopularSeries = useMemo(() => popularSeriesList.slice(0, 24), [popularSeriesList]);
  const displayPopularAnime = useMemo(() => popularAnimeList.slice(0, 24), [popularAnimeList]);
  const displayPopularDoramas = useMemo(() => popularDoramasList.slice(0, 24), [popularDoramasList]);

  const handleNavigateTab = (tab: string) => {
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="animate-fade-in relative min-h-full pb-16">
      {/* Main Content Колонка: Exactly 30px spacing between every poster block / banner */}
      <div className="w-full max-w-[1430px] mx-auto space-y-[30px] relative z-10">
        {/* 1. HERO BILLBOARD BANNER (Rendered via FeaturedBanner component) */}
        {heroList && heroList.length > 0 && (
          <FeaturedBanner
            featuredMovies={heroList}
            onSelectMovie={onSelectMovie}
            onPlayMovie={onPlayMovie}
            onToggleFavorite={onToggleFavorite}
            favorites={favorites}
          />
        )}

        {/* ROW 1: Трендове зараз (перша вкладка на головній) */}
        <CarouselRow
          title={language === 'UA' ? 'Трендове зараз' : 'Trending Now'}
          movies={displayTrending}
          onSelectMovie={onSelectMovie}
          onSeeAll={() => handleNavigateTab('trending')}
          language={language}
        />

        {/* ROW 2: Популярні фільми */}
        <CarouselRow
          title={language === 'UA' ? 'Популярні фільми' : 'Popular Movies'}
          movies={displayPopularMovies}
          onSelectMovie={onSelectMovie}
          onSeeAll={() => handleNavigateTab('popular-movies')}
          language={language}
        />

        {/* ROW 3: Популярні Серіали */}
        <CarouselRow
          title={language === 'UA' ? 'Популярні Серіали' : 'Popular Series'}
          movies={displayPopularSeries}
          onSelectMovie={onSelectMovie}
          onSeeAll={() => handleNavigateTab('popular-series')}
          language={language}
        />

        {/* ROW 4: Популярні Аніме */}
        <CarouselRow
          title={language === 'UA' ? 'Популярні Аніме' : 'Popular Anime'}
          movies={displayPopularAnime}
          onSelectMovie={onSelectMovie}
          onSeeAll={() => handleNavigateTab('popular-anime')}
          language={language}
        />

        {/* ROW 5: Популярні дорами (в самому кінці під аніме) */}
        <CarouselRow
          title={language === 'UA' ? 'Популярні дорами' : 'Popular Doramas'}
          movies={displayPopularDoramas}
          onSelectMovie={onSelectMovie}
          onSeeAll={() => handleNavigateTab('popular-doramas')}
          language={language}
        />
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.movies === nextProps.movies &&
    prevProps.favorites === nextProps.favorites &&
    prevProps.continueWatchingMovies === nextProps.continueWatchingMovies &&
    prevProps.personalizedRecommendations === nextProps.personalizedRecommendations
  );
});

export default HomeView;
