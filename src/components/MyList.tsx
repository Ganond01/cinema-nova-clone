import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Trash2, 
  ChevronDown, 
  ChevronUp,
  Star, 
  Play, 
  Heart, 
  ChevronRight,
  Filter,
  X
} from 'lucide-react';
import { Movie, UserProfile } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { loadState, saveState } from '../data/movies';
import { translateGenre, getMovieTitle, getMovieDescription } from '../lib/translations';
import { validatePosterUrl, handlePosterError } from '../utils/imageFallback';

const capsuleGlassStyle: React.CSSProperties = {
  backdropFilter: 'blur(24px) saturate(190%)',
  WebkitBackdropFilter: 'blur(24px) saturate(190%)',
  backgroundColor: 'rgba(18, 18, 24, 0.65)',
};

interface MyListProps {
  user: UserProfile | null;
  allMovies: Movie[];
  onSelectMovie: (movie: Movie) => void;
  onPlayMovie: (movie: Movie) => void;
  onOpenAuth: () => void;
  onToggleFavorite?: (movieId: string) => void;
  onUpdateUser?: (updated: UserProfile) => void;
}


const GENRES_LIST = [
  'Фільми', 'Серіали', 'Аніме', 'Бойовик', 'Комедія', 'Драма',
  'Фантастика', 'Трилер', 'Жахи', 'Мелодрама', 'Детектив', 'Пригоди', 'Фентезі',
  'Кримінал', 'Документальний', 'Історичний', 'Сімейний', 'Військовий'
];
const YEARS_LIST = ['2026', '2025', '2024', '2023', '2022', '2021', '2020', '2019', '2018', '2010-ті', '2000-ні'];
const RATINGS_LIST = ['8.0', '7.0', '6.0', '5.0'];
const LANGUAGES_LIST = ['Українська', 'English', '日本語'];

export default function MyList({
  user,
  allMovies,
  onSelectMovie,
  onPlayMovie,
  onOpenAuth,
  onToggleFavorite,
  onUpdateUser
}: MyListProps) {
  const { language } = useLanguage();
  const userId = user ? user.id : 'guest';

  // Фільтри Стан
  const [selectedGenre, setSelectedGenre] = useState<string>('all');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedRating, setSelectedRating] = useState<string>('all');
  const [selectedLang, setSelectedLang] = useState<string>('all');

  // Активний Випадаюче меню Стан
  const [openFilter, setOpenFilter] = useState<'genre' | 'year' | 'rating' | 'lang' | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Закриття Випадаюче меню on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpenFilter(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Користувач Обране
  const [favorites, setFavorites] = useState<string[]>([]);

  // Load Обране
  const loadData = () => {
    const favKey = `user_favs_${userId}`;
    const loadedFavs = loadState<string[] | null>(favKey, null);
    if (loadedFavs !== null && Array.isArray(loadedFavs)) {
      setFavorites(loadedFavs);
    } else {
      const fallback = user?.favorites && user.favorites.length > 0 ? user.favorites : [];
      setFavorites(fallback);
      saveState(favKey, fallback);
    }
  };

  useEffect(() => {
    loadData();
    const handleUpdate = () => loadData();
    window.addEventListener('my_list_updated', handleUpdate);
    return () => {
      window.removeEventListener('my_list_updated', handleUpdate);
    };
  }, [userId, user]);

  // Handle Перемикач or remove favorite
  const handleRemoveFavorite = (movieId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const favKey = `user_favs_${userId}`;
    const updated = favorites.filter(id => id !== movieId);
    setFavorites(updated);
    saveState(favKey, updated);
    if (user && onUpdateUser) {
      onUpdateUser({
        ...user,
        favorites: updated
      });
    }
    if (onToggleFavorite) {
      onToggleFavorite(movieId);
    }
    window.dispatchEvent(new Event('my_list_updated'));
  };

  // Clear all Обране
  const handleClearAll = () => {
    if (favorites.length === 0) return;
    const favKey = `user_favs_${userId}`;
    setFavorites([]);
    saveState(favKey, []);
    if (user && onUpdateUser) {
      onUpdateUser({
        ...user,
        favorites: []
      });
    }
    window.dispatchEvent(new Event('my_list_updated'));
  };

  // Resolve favorite Фільм items
  const userFavoriteMovies = allMovies.filter(m => favorites.includes(m.id));

  // Apply Фільтри
  const filteredMovies = userFavoriteMovies.filter(movie => {
    if (selectedGenre !== 'all' && !movie.genres.includes(selectedGenre)) return false;
    if (selectedYear !== 'all' && String(movie.year) !== selectedYear) return false;
    if (selectedRating !== 'all') {
      const minR = parseFloat(selectedRating);
      if (movie.rating < minR) return false;
    }
    if (selectedLang !== 'all') {
      if (selectedLang === 'Українська' || selectedLang === 'uk') {
        if (!movie.languages.some(l => l.toLowerCase().includes('укр') || l.toLowerCase().includes('ukr'))) return false;
      } else if (selectedLang === 'English' || selectedLang === 'en') {
        if (!movie.languages.some(l => l.toLowerCase().includes('анг') || l.toLowerCase().includes('eng'))) return false;
      } else if (selectedLang === '日本語') {
        if (!movie.languages.some(l => l.toLowerCase().includes('япон') || l.toLowerCase().includes('jap'))) return false;
      }
    }
    return true;
  });

  const [mobileVisibleCount, setMobileVisibleCount] = useState<number>(15);
  const [isMobile, setIsMobile] = useState<boolean>(() => typeof window !== 'undefined' && window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    setMobileVisibleCount(15);
  }, [selectedGenre, selectedYear, selectedRating, selectedLang]);

  const displayedMovies = useMemo(() => {
    if (isMobile) {
      return filteredMovies.slice(0, mobileVisibleCount);
    }
    return filteredMovies;
  }, [filteredMovies, isMobile, mobileVisibleCount]);

  const genrePillLabel = selectedGenre === 'all' 
    ? (language === 'UA' ? 'Жанр' : 'Genre') 
    : selectedGenre;

  const yearPillLabel = selectedYear === 'all' 
    ? (language === 'UA' ? 'Рік' : 'Year') 
    : selectedYear;

  const ratingPillLabel = selectedRating === 'all' 
    ? (language === 'UA' ? 'Рейтинг' : 'Rating') 
    : selectedRating;

  const languagePillLabel = selectedLang === 'all' 
    ? (language === 'UA' ? 'Мова' : 'Language') 
    : selectedLang;

  return (
    <div className={`space-y-6 animate-fade-in w-full max-w-[1430px] mx-auto min-h-[50vh] flex flex-col justify-start pb-12`}>
      {/* 1. Шапка сайту & Фільтрація CONTROLS */}
      <div className="space-y-4 pb-2" ref={dropdownRef}>
        {/* Top Заголовок Section */}
        <div className="space-y-1">
          <h1 
            style={{ fontFamily: "'Montserrat Alternates', sans-serif" }}
            className="text-2xl sm:text-3xl lg:text-4xl font-semibold tracking-tight text-white"
          >
            {language === 'UA' ? 'Список обраного' : 'Watchlist & Favorites'}
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 font-sans">
            {language === 'UA' 
              ? 'Ваші улюблені фільми, серіали та аніме' 
              : 'Your favorite movies, series and anime'}
          </p>
        </div>

        {/* Фільтрація Pills Рядок & Clear Кнопка on the same line, perfectly centered */}
        <div className="flex flex-wrap items-center justify-between gap-4 relative z-50 min-h-[40px]">
          <div className="flex flex-wrap items-center gap-3 sm:gap-4">
            {/* 1. Жанр Випадаюче меню */}
            <div className="relative">
            <button
              onClick={() => setOpenFilter(openFilter === 'genre' ? null : 'genre')}
              className={`cinema-filter-pill ${openFilter === 'genre' ? 'invisible pointer-events-none' : ''}`}
            >
              <span className="relative z-10">{genrePillLabel}</span>
              <ChevronDown className="w-4 h-4 relative z-10 text-zinc-400" />
            </button>

            {openFilter === 'genre' && (
              <div style={capsuleGlassStyle} className="cinema-filter-capsule left-0 animate-in fade-in zoom-in-95 duration-150">
                <button
                  onClick={() => setOpenFilter(null)}
                  className="cinema-capsule-header"
                >
                  <span className="relative z-20">{genrePillLabel}</span>
                  <ChevronUp className="w-4 h-4 relative z-20 text-white" />
                </button>

                <div className="cinema-capsule-list custom-scrollbar">
                  <button
                    onClick={() => {
                      setSelectedGenre('all');
                      setOpenFilter(null);
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
                        setOpenFilter(null);
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

          {/* 2. Year Випадаюче меню */}
          <div className="relative">
            <button
              onClick={() => setOpenFilter(openFilter === 'year' ? null : 'year')}
              className={`cinema-filter-pill ${openFilter === 'year' ? 'invisible pointer-events-none' : ''}`}
            >
              <span className="relative z-10">{yearPillLabel}</span>
              <ChevronDown className="w-4 h-4 relative z-10 text-zinc-400" />
            </button>

            {openFilter === 'year' && (
              <div style={capsuleGlassStyle} className="cinema-filter-capsule left-0 animate-in fade-in zoom-in-95 duration-150">
                <button
                  onClick={() => setOpenFilter(null)}
                  className="cinema-capsule-header"
                >
                  <span className="relative z-20">{yearPillLabel}</span>
                  <ChevronUp className="w-4 h-4 relative z-20 text-white" />
                </button>

                <div className="cinema-capsule-list custom-scrollbar">
                  <button
                    onClick={() => {
                      setSelectedYear('all');
                      setOpenFilter(null);
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
                        setOpenFilter(null);
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

          {/* 3. Рейтинг Випадаюче меню */}
          <div className="relative">
            <button
              onClick={() => setOpenFilter(openFilter === 'rating' ? null : 'rating')}
              className={`cinema-filter-pill ${openFilter === 'rating' ? 'invisible pointer-events-none' : ''}`}
            >
              <span className="relative z-10">{ratingPillLabel}</span>
              <ChevronDown className="w-4 h-4 relative z-10 text-zinc-400" />
            </button>

            {openFilter === 'rating' && (
              <div style={capsuleGlassStyle} className="cinema-filter-capsule right-0 animate-in fade-in zoom-in-95 duration-150">
                <button
                  onClick={() => setOpenFilter(null)}
                  className="cinema-capsule-header"
                >
                  <span className="relative z-20">{ratingPillLabel}</span>
                  <ChevronUp className="w-4 h-4 relative z-20 text-white" />
                </button>

                <div className="cinema-capsule-list custom-scrollbar">
                  <button
                    onClick={() => {
                      setSelectedRating('all');
                      setOpenFilter(null);
                    }}
                    className={`cinema-capsule-item ${selectedRating === 'all' ? 'item-active' : ''}`}
                  >
                    {language === 'UA' ? 'Будь-який' : 'Any rating'}
                  </button>
                  {RATINGS_LIST.map((r) => (
                    <button
                      key={r}
                      onClick={() => {
                        setSelectedRating(r);
                        setOpenFilter(null);
                      }}
                      className={`cinema-capsule-item ${selectedRating === r ? 'item-active' : ''}`}
                    >
                      ★ {r} {language === 'UA' ? 'і вище' : '& up'}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 4. Language Випадаюче меню */}
          <div className="relative">
            <button
              onClick={() => setOpenFilter(openFilter === 'lang' ? null : 'lang')}
              className={`cinema-filter-pill ${openFilter === 'lang' ? 'invisible pointer-events-none' : ''}`}
            >
              <span className="relative z-10">{languagePillLabel}</span>
              <ChevronDown className="w-4 h-4 relative z-10 text-zinc-400" />
            </button>

            {openFilter === 'lang' && (
              <div style={capsuleGlassStyle} className="cinema-filter-capsule right-0 animate-in fade-in zoom-in-95 duration-150">
                <button
                  onClick={() => setOpenFilter(null)}
                  className="cinema-capsule-header"
                >
                  <span className="relative z-20">{languagePillLabel}</span>
                  <ChevronUp className="w-4 h-4 relative z-20 text-white" />
                </button>

                <div className="cinema-capsule-list custom-scrollbar">
                  <button
                    onClick={() => {
                      setSelectedLang('all');
                      setOpenFilter(null);
                    }}
                    className={`cinema-capsule-item ${selectedLang === 'all' ? 'item-active' : ''}`}
                  >
                    {language === 'UA' ? 'Усі мови' : 'All languages'}
                  </button>
                  {LANGUAGES_LIST.map((l) => (
                    <button
                      key={l}
                      onClick={() => {
                        setSelectedLang(l);
                        setOpenFilter(null);
                      }}
                      className={`cinema-capsule-item ${selectedLang === l ? 'item-active' : ''}`}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Clear Історія Кнопка centered with the Фільтрація pills */}
        <button
          type="button"
          onClick={handleClearAll}
          className="h-10 px-2 flex items-center justify-center gap-2 shrink-0 self-center my-auto text-zinc-400 hover:text-white text-xs sm:text-sm font-medium transition-colors cursor-pointer select-none"
        >
          <Trash2 className="w-4 h-4 text-zinc-400 group-hover:text-white shrink-0" />
          <span className="leading-none whitespace-nowrap">{language === 'UA' ? 'Очистити історію' : 'Clear history'}</span>
        </button>
      </div>
    </div>

      {/* 2. Фільми Сітка (1-to-1 match with screenshot) */}
      {filteredMovies.length > 0 ? (
        <>
        <div className="grid grid-cols-3 justify-items-center sm:justify-items-stretch sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-[10px] sm:gap-4 lg:gap-5 xl:gap-[30px]">
          {displayedMovies.map((movie) => {
            const titleText = getMovieTitle(movie, language);
            return (
              <div
                key={movie.id}
                onClick={() => onSelectMovie(movie)}
                className="w-[104px] h-[146px] min-w-[104px] max-w-[104px] sm:w-full sm:h-auto sm:min-w-0 sm:max-w-none aspect-[104/146] sm:aspect-[2/3] group relative rounded-[4.78px] sm:rounded-[16px] border-0 sm:border sm:border-white/10 sm:hover:border-transparent poster-hover-notif-border transition-all duration-300 ease-out cursor-pointer bg-[#121212] shadow-lg sm:hover:shadow-[0_0_28px_rgba(255,48,64,0.35)] select-none"
              >
                <div className="relative w-full h-full overflow-hidden bg-[#121212] rounded-[4.78px] sm:rounded-[15px] flex flex-col justify-between">
                  {/* 1. Base Фільм Poster Image */}
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

                {/* Floating Glass Бейджі at the top */}
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

                {/* Floating Glass Бейджі at the top on Desktop */}
                {/* Рейтинг Бейдж */}
                <div 
                  className="hidden sm:flex absolute top-3 left-3 text-white px-3 py-1 rounded-[10px] text-xs font-semibold items-center gap-1.5 z-30 transition-all pointer-events-none bg-black/50 backdrop-blur-md border border-white/15 shadow-sm group-hover:bg-white/10 group-hover:border-white/25 duration-300"
                >
                  <Star className="w-3.5 h-3.5 fill-[#FF3040] text-[#FF3040] shrink-0" />
                  <span className="text-white font-bold text-xs tracking-tight">{movie.rating.toFixed(1)}</span>
                </div>

                {/* Age Рейтинг Бейдж */}
                <div 
                  className="hidden sm:flex absolute top-3 right-3 text-white px-3 py-1 rounded-[10px] text-xs font-semibold transition-all items-center justify-center bg-black/50 backdrop-blur-md border border-white/15 shadow-sm z-30 pointer-events-none group-hover:bg-white/10 group-hover:border-white/25 duration-300"
                >
                  <span className="text-white font-bold text-xs tracking-tight">{movie.ageRating || '16+'}</span>
                </div>

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
              </div>
            );
          })}
        </div>

        {/* Mobile 'Завантажити ще' (Load More) Button */}
        {isMobile && mobileVisibleCount < filteredMovies.length && (
          <div className="pt-6 pb-2 flex justify-center md:hidden">
            <button
              type="button"
              onClick={() => setMobileVisibleCount(prev => prev + 15)}
              className="journey-cta-btn border border-transparent hover:border-white/80 active:border-transparent text-white w-[175px] h-[28px] rounded-[6px] font-bold text-xs flex items-center justify-center gap-1.5 transition-all transform hover:scale-102 active:scale-98 hover:shadow-[0_0_24px_rgba(255,255,255,0.3),0_10px_25px_rgba(215,40,53,0.35)] shadow-md shadow-[#FF4D5C]/25 cursor-pointer select-none"
            >
              <span>{language === 'UA' ? 'Завантажити ще' : 'Load more'}</span>
            </button>
          </div>
        )}
        </>
      ) : (
        /* Empty State directly close to the filters */
        <div className="pt-1 pb-16 flex-1">
          <p className="text-xs sm:text-sm text-zinc-400 font-normal font-sans">
            {language === 'UA'
              ? 'Зберігайте улюблені фільми та серіали, щоб повернутися до них пізніше.'
              : 'Save your favorite movies and series to return to them later.'}
          </p>
        </div>
      )}
    </div>
  );
}
