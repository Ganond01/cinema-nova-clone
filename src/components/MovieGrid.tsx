import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Play, Star, Trash2, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Check, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Movie } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { translateGenre, Language, getMovieTitle, getMovieDescription } from '../lib/translations';
import { LazyImage } from './LazyImage';
import { validatePosterUrl, handlePosterError } from '../utils/imageFallback';
import { isCartoon, sanitizeMovieGenres } from '../utils/movieFilter';

const capsuleGlassStyle: React.CSSProperties = {
  backdropFilter: 'blur(24px) saturate(190%)',
  WebkitBackdropFilter: 'blur(24px) saturate(190%)',
  backgroundColor: 'rgba(18, 18, 24, 0.65)',
};

interface MovieGridProps {
  movies: Movie[];
  onSelectMovie: (movie: Movie) => void;
  onPlayMovie: (movie: Movie) => void;
  title: string;
  subtitle?: string;
  showFilters?: boolean;
  onDeleteOfflineMovie?: (movie: Movie) => void;
}

interface MovieCardProps {
  movie: Movie;
  index: number;
  language: Language;
  onSelectMovie: (movie: Movie) => void;
  onPlayMovie: (movie: Movie) => void;
  onDeleteOfflineMovie?: (movie: Movie) => void;
}

const ITEMS_PER_PAGE = 25; // 5x5 grid matching screenshot

// Memoized Фільм Картка Component
const MovieCard = React.memo(function MovieCard({
  movie,
  index,
  language,
  onSelectMovie,
  onPlayMovie,
  onDeleteOfflineMovie
}: MovieCardProps) {
  const handleSelect = useCallback(() => {
    onSelectMovie(movie);
  }, [onSelectMovie, movie]);

  const handlePlay = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onPlayMovie(movie);
  }, [onPlayMovie, movie]);

  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDeleteOfflineMovie) {
      onDeleteOfflineMovie(movie);
    }
  }, [onDeleteOfflineMovie, movie]);

  const titleText = getMovieTitle(movie, language);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: Math.min(index * 0.02, 0.25) }}
      onClick={handleSelect}
      className="w-[104px] h-[146px] min-w-[104px] max-w-[104px] sm:w-full sm:h-auto sm:min-w-0 sm:max-w-none aspect-[104/146] sm:aspect-[2/3] group relative rounded-[4.78px] sm:rounded-[16px] cursor-pointer flex flex-col border-0 sm:border sm:border-white/10 bg-[#121212] transition-all duration-300 ease-out sm:hover:border-transparent sm:hover:shadow-[0_0_28px_rgba(255,48,64,0.35)] poster-hover-notif-border select-none"
    >
      {/* Poster image Контейнер */}
      <div className="relative w-full h-full overflow-hidden bg-[#121212] rounded-[4.78px] sm:rounded-[15px]">
        {/* Base Фільм Poster Image */}
        <img
          src={validatePosterUrl(movie.posterUrl, movie.title, movie.type, movie.genres)}
          alt={movie.title}
          className="w-full h-full object-cover transition-transform duration-500 ease-out sm:group-hover:scale-[1.03]"
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={(e) => handlePosterError(e, movie.posterUrl, movie.title, movie.type, movie.genres, movie.year, movie.titleEn, movie.originalTitle)}
        />

        {/* Side Vignette Накладення (оверлей) on the Картка */}
        <div className="absolute inset-0 pointer-events-none z-10 bg-gradient-to-r from-black/40 via-transparent to-black/40 shadow-[inset_0_0_24px_rgba(0,0,0,0.6)]" />

        {/* Floating Бейджі on Mobile: w32.58px h14.13px, gap 26px */}
        <div className="absolute top-1.5 inset-x-0 px-[6.42px] flex items-center justify-between z-30 pointer-events-none sm:hidden">
          <div className="w-[32.58px] h-[14.13px] text-white rounded-[4px] flex items-center justify-center gap-0.5 bg-black/50 backdrop-blur-md border border-white/15 shadow-sm">
            <Star className="w-[8px] h-[8px] fill-[#FF3040] text-[#FF3040] shrink-0" />
            <span className="text-white font-bold text-[7px] tracking-tight leading-none">{movie.rating.toFixed(1)}</span>
          </div>
          <div className="w-[32.58px] h-[14.13px] text-white rounded-[4px] flex items-center justify-center bg-black/50 backdrop-blur-md border border-white/15 shadow-sm">
            <span className="text-white font-bold text-[7px] tracking-tight leading-none">{movie.ageRating || '16+'}</span>
          </div>
        </div>

        {/* Floating Glass Бейджі on Desktop */}
        {/* Рейтинг Бейдж Top-Left with Glass Effect */}
        <div 
          className="hidden sm:flex absolute top-3 left-3 text-white px-3 py-1 rounded-[10px] text-xs font-semibold items-center gap-1.5 z-30 transition-all pointer-events-none bg-black/50 backdrop-blur-md border border-white/15 shadow-sm group-hover:bg-white/10 group-hover:border-white/25 duration-300"
        >
          <Star className="w-3.5 h-3.5 fill-[#FF3040] text-[#FF3040] shrink-0" />
          <span className="text-white font-bold text-xs tracking-tight">{movie.rating.toFixed(1)}</span>
        </div>

        {/* Age Рейтинг Бейдж Top-Right with Glass Effect */}
        <div 
          className={`hidden sm:flex absolute top-3 ${onDeleteOfflineMovie ? 'right-11' : 'right-3'} text-white px-3 py-1 rounded-[10px] text-xs font-semibold z-30 transition-all pointer-events-none items-center justify-center bg-black/50 backdrop-blur-md border border-white/15 shadow-sm group-hover:bg-white/10 group-hover:border-white/25 duration-300`}
        >
          <span className="text-white font-bold text-xs tracking-tight">{movie.ageRating || '16+'}</span>
        </div>

        {/* Видалення Кнопка if offline Фільм */}
        {onDeleteOfflineMovie && (
          <button
            onClick={handleDelete}
            className="absolute top-3 right-2.5 bg-[#FF3040] hover:bg-[#FF4D5C] text-white p-1.5 rounded-[10px] text-xs font-bold border border-[#FF3040]/40 z-40 shadow-lg transition-all transform hover:scale-110 cursor-pointer"
            title={language === 'UA' ? 'Видалити з завантажень' : 'Delete from downloads'}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Specular Glass Sheen Накладення (оверлей) */}
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-white/15 pointer-events-none mix-blend-overlay z-15" />

        {/* Frosted Glass Bottom Panel with Backdrop Blur: 9px padding and margins on mobile, 22px on desktop */}
        <div 
          className="absolute inset-x-0 bottom-0 z-20 flex flex-col justify-start pt-[9px] pb-[8px] px-[5px] sm:px-4 sm:pt-[22px] sm:pb-4 w-[104px] h-auto sm:w-full sm:h-auto bg-gradient-to-t from-black/95 via-black/80 to-transparent backdrop-blur-[10px] pointer-events-none transition-all duration-300 ease-out"
        >
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
    </motion.div>
  );
});

export default function MovieGrid({
  movies,
  onSelectMovie,
  onPlayMovie,
  title,
  subtitle,
  showFilters = true,
  onDeleteOfflineMovie
}: MovieGridProps) {
  const { language } = useLanguage();
  
  // Фільтри Стан
  const [selectedGenre, setSelectedGenre] = useState<string>('all');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedRating, setSelectedRating] = useState<string>('all');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('all');

  // Відкриття popup Випадаюче меню tracking
  const [openDropdown, setOpenDropdown] = useState<'genre' | 'year' | 'rating' | 'language' | null>(null);
  const filterBarRef = useRef<HTMLDivElement>(null);

  // Pagination Стан
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Закриття меню фільтрів при кліку за їх межами
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (filterBarRef.current && !filterBarRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Curated Списки matching screenshot image.png
  const GENRES_LIST = [
    'Бойовик',
    'Жахи',
    'Комедія',
    'Пригоди',
    'Аніме',
    'Дорами',
    'Романтика',
    'Кримінал',
    'Наукова фантастика',
    'Трилер',
    'Фентезі',
    'Драма'
  ];

  const YEARS_LIST = ['1990', '1995', '2000', '2005', '2010', '2015', '2020', '2025', '2026'];
  const RATING_LIST = ['0', '1', '2', '3', '4', '5'];
  const LANGUAGE_LIST = ['Українська', 'Англійська'];

  // Filtered & sorted Фільми
  const processedMovies = useMemo(() => {
    return movies
      .filter((movie) => !isCartoon(movie))
      .map((movie) => sanitizeMovieGenres(movie))
      .filter((movie) => {
        // Жанр Фільтрація
        if (selectedGenre !== 'all') {
          const matchGenre = movie.genres?.some(g => {
            const translated = translateGenre(g, 'UA').toLowerCase();
            const selected = selectedGenre.toLowerCase();
            return translated.includes(selected) || selected.includes(translated) ||
              (selected === 'наукова фантастика' && (translated.includes('фантастика') || translated.includes('sci-fi'))) ||
              (selected === 'дорами' && ((movie as any).type === 'dorama' || translated.includes('дорам')));
          });
          if (!matchGenre) return false;
        }

        // Year Фільтрація
        if (selectedYear !== 'all') {
          const yr = Number(selectedYear);
          const movieYr = Number(movie.year);
          if (selectedYear === '2026') {
            if (movieYr < 2026 && movieYr !== 2025) return false;
          } else if (selectedYear === '2025') {
            if (movieYr !== 2025) return false;
          } else {
            // Перевірка exact year or 5-year interval bucket
            const isMatch = movieYr === yr || (movieYr >= yr && movieYr < yr + 5);
            if (!isMatch) return false;
          }
        }

        // Рейтинг Фільтрація (0 - 5 scale mapped to TMDB 10-point scale)
        if (selectedRating !== 'all') {
          const minRating = Number(selectedRating);
          const threshold = minRating === 5 ? 8.5 : minRating === 4 ? 7.0 : minRating === 3 ? 5.5 : minRating === 2 ? 4.0 : minRating === 1 ? 2.0 : 0;
          if ((movie.rating || 0) < threshold) return false;
        }

        // Language Фільтрація
        if (selectedLanguage === 'Українська' || selectedLanguage === 'uk') {
          const hasUk = (movie.languages && movie.languages.some(l => l.toLowerCase().includes('укр') || l.toLowerCase().includes('ukr'))) || true;
          if (!hasUk) return false;
        } else if (selectedLanguage === 'Англійська' || selectedLanguage === 'en') {
          const hasEn = movie.languages && movie.languages.some(l => l.toLowerCase().includes('eng') || l.toLowerCase().includes('анг') || l.toLowerCase().includes('english'));
          if (!hasEn) return false;
        }

        return true;
      })
      .sort((a, b) => {
        return 0; // maintain curated screenshot ordering by default
      });
  }, [movies, selectedGenre, selectedYear, selectedRating, selectedLanguage]);

  const [mobileVisibleCount, setMobileVisibleCount] = useState<number>(ITEMS_PER_PAGE);
  const [isMobile, setIsMobile] = useState<boolean>(() => typeof window !== 'undefined' && window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Pagination calculation
  const totalPages = Math.ceil(processedMovies.length / ITEMS_PER_PAGE) || 1;

  // Reset to page 1 & mobileVisibleCount on Фільтрація changes or category switch
  useEffect(() => {
    setCurrentPage(1);
    setMobileVisibleCount(ITEMS_PER_PAGE);
  }, [selectedGenre, selectedYear, selectedRating, selectedLanguage, title]);

  // Ensure currentPage doesn't exceed totalPages if Список shrinks
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);
  const displayedMovies = useMemo(() => {
    if (isMobile) {
      return processedMovies.slice(0, mobileVisibleCount);
    }
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return processedMovies.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [processedMovies, isMobile, mobileVisibleCount, currentPage]);

  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    const mainEl = document.querySelector('main');
    if (mainEl) mainEl.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Допоміжна функція label getters for pills
  const genrePillLabel = selectedGenre === 'all' 
    ? (language === 'UA' ? 'Жанр' : 'Genre') 
    : selectedGenre;

  const yearPillLabel = selectedYear === 'all' 
    ? (language === 'UA' ? 'Рік' : 'Year') 
    : selectedYear;

  const ratingPillLabel = selectedRating === 'all' 
    ? (language === 'UA' ? 'Рейтинг' : 'Rating') 
    : selectedRating;

  const languagePillLabel = selectedLanguage === 'all' 
    ? (language === 'UA' ? 'Мова' : 'Language') 
    : selectedLanguage;

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Шапка сайту Рядок: Заголовок & Subtitle on Left, 4 Фільтрація Pills on Right */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-1">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight font-display">
            {title}
          </h1>
          {subtitle && (
            <p className="text-xs sm:text-sm text-zinc-400 font-normal mt-1 leading-relaxed max-w-2xl">
              {subtitle}
            </p>
          )}
        </div>

        {/* 4 Фільтрація Кнопки with Dual Gradient Border & Випадаючі списки (Matching screenshot image.png) */}
        {showFilters && (
          <div ref={filterBarRef} className="flex flex-wrap items-center gap-3 sm:gap-4 relative z-50 shrink-0">
            {/* 1. Жанр Dropdown */}
            <div className="relative">
              <button
                onClick={() => setOpenDropdown(openDropdown === 'genre' ? null : 'genre')}
                className={`cinema-filter-pill ${openDropdown === 'genre' ? 'invisible pointer-events-none' : ''}`}
              >
                <span className="relative z-10">{genrePillLabel}</span>
                <ChevronDown className="w-4 h-4 relative z-10 text-zinc-400" />
              </button>

              {openDropdown === 'genre' && (
                <div style={capsuleGlassStyle} className="cinema-filter-capsule left-0 animate-in fade-in zoom-in-95 duration-150">
                  <button
                    onClick={() => setOpenDropdown(null)}
                    className="cinema-capsule-header"
                  >
                    <span className="relative z-20">{genrePillLabel}</span>
                    <ChevronUp className="w-4 h-4 relative z-20 text-white" />
                  </button>

                  <div className="cinema-capsule-list custom-scrollbar">
                    <button
                      onClick={() => {
                        setSelectedGenre('all');
                        setOpenDropdown(null);
                        setCurrentPage(1);
                      }}
                      className={`cinema-capsule-item ${selectedGenre === 'all' ? 'item-active' : ''}`}
                    >
                      {language === 'UA' ? 'Усі жанри' : 'All genres'}
                    </button>
                    {GENRES_LIST.map((g) => (
                      <button
                        key={g}
                        onClick={() => {
                          setSelectedGenre(g);
                          setOpenDropdown(null);
                          setCurrentPage(1);
                        }}
                        className={`cinema-capsule-item ${selectedGenre === g ? 'item-active' : ''}`}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 2. Рік Dropdown */}
            <div className="relative">
              <button
                onClick={() => setOpenDropdown(openDropdown === 'year' ? null : 'year')}
                className={`cinema-filter-pill ${openDropdown === 'year' ? 'invisible pointer-events-none' : ''}`}
              >
                <span className="relative z-10">{yearPillLabel}</span>
                <ChevronDown className="w-4 h-4 relative z-10 text-zinc-400" />
              </button>

              {openDropdown === 'year' && (
                <div style={capsuleGlassStyle} className="cinema-filter-capsule left-0 animate-in fade-in zoom-in-95 duration-150">
                  <button
                    onClick={() => setOpenDropdown(null)}
                    className="cinema-capsule-header"
                  >
                    <span className="relative z-20">{yearPillLabel}</span>
                    <ChevronUp className="w-4 h-4 relative z-20 text-white" />
                  </button>

                  <div className="cinema-capsule-list custom-scrollbar">
                    <button
                      onClick={() => {
                        setSelectedYear('all');
                        setOpenDropdown(null);
                        setCurrentPage(1);
                      }}
                      className={`cinema-capsule-item ${selectedYear === 'all' ? 'item-active' : ''}`}
                    >
                      {language === 'UA' ? 'Усі роки' : 'All years'}
                    </button>
                    {YEARS_LIST.map((y) => (
                      <button
                        key={y}
                        onClick={() => {
                          setSelectedYear(y);
                          setOpenDropdown(null);
                          setCurrentPage(1);
                        }}
                        className={`cinema-capsule-item ${selectedYear === y ? 'item-active' : ''}`}
                      >
                        {y}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 3. Рейтинг Dropdown */}
            <div className="relative">
              <button
                onClick={() => setOpenDropdown(openDropdown === 'rating' ? null : 'rating')}
                className={`cinema-filter-pill ${openDropdown === 'rating' ? 'invisible pointer-events-none' : ''}`}
              >
                <span className="relative z-10">{ratingPillLabel}</span>
                <ChevronDown className="w-4 h-4 relative z-10 text-zinc-400" />
              </button>

              {openDropdown === 'rating' && (
                <div style={capsuleGlassStyle} className="cinema-filter-capsule right-0 animate-in fade-in zoom-in-95 duration-150">
                  <button
                    onClick={() => setOpenDropdown(null)}
                    className="cinema-capsule-header"
                  >
                    <span className="relative z-20">{ratingPillLabel}</span>
                    <ChevronUp className="w-4 h-4 relative z-20 text-white" />
                  </button>

                  <div className="cinema-capsule-list custom-scrollbar">
                    <button
                      onClick={() => {
                        setSelectedRating('all');
                        setOpenDropdown(null);
                        setCurrentPage(1);
                      }}
                      className={`cinema-capsule-item ${selectedRating === 'all' ? 'item-active' : ''}`}
                    >
                      {language === 'UA' ? 'Усі рейтинги' : 'All ratings'}
                    </button>
                    {RATING_LIST.map((r) => (
                      <button
                        key={r}
                        onClick={() => {
                          setSelectedRating(r);
                          setOpenDropdown(null);
                          setCurrentPage(1);
                        }}
                        className={`cinema-capsule-item ${selectedRating === r ? 'item-active' : ''}`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 4. Мова Dropdown */}
            <div className="relative">
              <button
                onClick={() => setOpenDropdown(openDropdown === 'language' ? null : 'language')}
                className={`cinema-filter-pill ${openDropdown === 'language' ? 'invisible pointer-events-none' : ''}`}
              >
                <span className="relative z-10">{languagePillLabel}</span>
                <ChevronDown className="w-4 h-4 relative z-10 text-zinc-400" />
              </button>

              {openDropdown === 'language' && (
                <div style={capsuleGlassStyle} className="cinema-filter-capsule right-0 animate-in fade-in zoom-in-95 duration-150">
                  <button
                    onClick={() => setOpenDropdown(null)}
                    className="cinema-capsule-header"
                  >
                    <span className="relative z-20">{languagePillLabel}</span>
                    <ChevronUp className="w-4 h-4 relative z-20 text-white" />
                  </button>

                  <div className="cinema-capsule-list custom-scrollbar">
                    <button
                      onClick={() => {
                        setSelectedLanguage('all');
                        setOpenDropdown(null);
                        setCurrentPage(1);
                      }}
                      className={`cinema-capsule-item ${selectedLanguage === 'all' ? 'item-active' : ''}`}
                    >
                      {language === 'UA' ? 'Усі мови' : 'All languages'}
                    </button>
                    {LANGUAGE_LIST.map((l) => (
                      <button
                        key={l}
                        onClick={() => {
                          setSelectedLanguage(l);
                          setOpenDropdown(null);
                          setCurrentPage(1);
                        }}
                        className={`cinema-capsule-item ${selectedLanguage === l ? 'item-active' : ''}`}
                      >
                        {l}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Clear Фільтри Кнопка if any Фільтрація is Активний */}
            {(selectedGenre !== 'all' || selectedYear !== 'all' || selectedRating !== 'all' || selectedLanguage !== 'all') && (
              <button
                onClick={() => {
                  setSelectedGenre('all');
                  setSelectedYear('all');
                  setSelectedRating('all');
                  setSelectedLanguage('all');
                }}
                className="p-2 rounded-full bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                title={language === 'UA' ? 'Скинути фільтри' : 'Reset filters'}
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Сітка: 3 Колонки on Mobile with w104 h158 Картки matching HomeView, 5 Колонки on Desktop */}
      <motion.div
        key={`${title}_${selectedGenre}_${selectedYear}_${selectedRating}_${selectedLanguage}_${currentPage}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="grid grid-cols-3 justify-items-center sm:justify-items-stretch sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-[10px] sm:gap-4 lg:gap-5 xl:gap-[30px]"
      >
        {displayedMovies.map((movie, index) => (
          <MovieCard
            key={`${movie.id}_${index}`}
            movie={movie}
            index={index}
            language={language}
            onSelectMovie={onSelectMovie}
            onPlayMovie={onPlayMovie}
            onDeleteOfflineMovie={onDeleteOfflineMovie}
          />
        ))}

        {displayedMovies.length === 0 && (
          <div className="col-span-full py-20 text-center text-zinc-400 bg-[#141416]/60 border border-dashed border-zinc-800 rounded-3xl space-y-3">
            <p className="text-base font-semibold text-white">
              {language === 'UA' ? 'Фільмів не знайдено' : 'No movies found'}
            </p>
            <p className="text-xs text-zinc-500 max-w-sm mx-auto">
              {language === 'UA' ? 'Спробуйте змінити або скинути обрані фільтри для пошуку.' : 'Try changing or resetting your active filters.'}
            </p>
            <button
              onClick={() => {
                setSelectedGenre('all');
                setSelectedYear('all');
                setSelectedRating('all');
                setSelectedLanguage('all');
              }}
              className="px-4 py-2 bg-[#FF3040] hover:bg-[#FF4D5C] text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md"
            >
              {language === 'UA' ? 'Скинути всі фільтри' : 'Reset All Filters'}
            </button>
          </div>
        )}
      </motion.div>

      {/* Mobile 'Завантажити ще' (Load More) Button: appends more movies downwards */}
      {isMobile && mobileVisibleCount < processedMovies.length && (
        <div className="pt-6 pb-2 flex justify-center md:hidden">
          <button
            type="button"
            onClick={() => setMobileVisibleCount(prev => prev + ITEMS_PER_PAGE)}
            className="journey-cta-btn border border-transparent hover:border-white/80 active:border-transparent text-white w-[175px] h-[28px] rounded-[6px] font-bold text-xs flex items-center justify-center gap-1.5 transition-all transform hover:scale-102 active:scale-98 hover:shadow-[0_0_24px_rgba(255,255,255,0.3),0_10px_25px_rgba(215,40,53,0.35)] shadow-md shadow-[#FF4D5C]/25 cursor-pointer select-none"
          >
            <span>{language === 'UA' ? 'Завантажити ще' : 'Load more'}</span>
          </button>
        </div>
      )}

      {/* Bottom Pagination Controls - Навігація with arrows only on Desktop */}
      {totalPages > 1 && (
        <div className="hidden md:flex pt-8 pb-4 items-center justify-center gap-4 select-none">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="w-11 h-11 rounded-full border border-white/20 bg-[#161616]/80 hover:bg-white/10 hover:border-white/40 text-zinc-300 hover:text-white flex items-center justify-center transition-colors duration-150 disabled:opacity-30 disabled:hover:bg-[#161616]/80 disabled:hover:border-white/20 disabled:hover:text-zinc-500 disabled:cursor-not-allowed cursor-pointer shadow-lg"
            title={language === 'UA' ? 'Попередня сторінка' : 'Previous page'}
            aria-label="Previous page"
          >
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>

          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="w-11 h-11 rounded-full border border-white/20 bg-[#161616]/80 hover:bg-white/10 hover:border-white/40 text-zinc-300 hover:text-white flex items-center justify-center transition-colors duration-150 disabled:opacity-30 disabled:hover:bg-[#161616]/80 disabled:hover:border-white/20 disabled:hover:text-zinc-500 disabled:cursor-not-allowed cursor-pointer shadow-lg"
            title={language === 'UA' ? 'Наступна сторінка' : 'Next page'}
            aria-label="Next page"
          >
            <ChevronRight className="w-5 h-5 text-white" />
          </button>
        </div>
      )}
    </div>
  );
}
