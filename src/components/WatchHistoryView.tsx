import React, { useState, useMemo, useEffect } from 'react';
import { 
  Trash2, Play, RotateCcw, ChevronDown, ChevronUp, Clock
} from 'lucide-react';
import { Movie, UserProfile } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { loadState, saveState } from '../data/movies';
import { getMovieTitle } from '../lib/translations';

const capsuleGlassStyle: React.CSSProperties = {
  backdropFilter: 'blur(24px) saturate(190%)',
  WebkitBackdropFilter: 'blur(24px) saturate(190%)',
  backgroundColor: 'rgba(18, 18, 24, 0.65)',
};

interface HistoryMovieCardItem {
  id: string;
  movieId: string;
  title: string;
  year: number;
  durationText: string;
  ageRating: string;
  genresText: string;
  episodeText?: string;
  progressPercent: number;
  watchedMinutes: number;
  totalMinutes: number;
  backdropUrl: string;
  dateGroup: 'today' | 'yesterday' | 'older';
  movieObj?: Movie;
}

export interface WatchHistoryViewProps {
  user: UserProfile | null;
  movies: Movie[];
  onPlayMovie: (movie: Movie) => void;
  onSelectMovie: (movie: Movie) => void;
  onOpenAuth?: () => void;
  embedded?: boolean;
  onUpdateUser?: (updated: UserProfile) => void;
}

export default function WatchHistoryView({
  user,
  movies,
  onPlayMovie,
  onSelectMovie,
  onOpenAuth,
  embedded = false,
  onUpdateUser
}: WatchHistoryViewProps) {
  const { language } = useLanguage();

  // Активний Фільтрація Стани
  const [selectedGenre, setSelectedGenre] = useState<string>('all');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedRating, setSelectedRating] = useState<string>('all');
  const [selectedLang, setSelectedLang] = useState<string>('all');

  // Відкриття Випадаюче меню toggles
  const [openDropdown, setOpenDropdown] = useState<'genre' | 'year' | 'rating' | 'lang' | null>(null);

  // Stored Історія Стан
  const [historyList, setHistoryList] = useState<HistoryMovieCardItem[]>([]);

  // Load Історія function
  const loadHistory = () => {
    const storageKey = user ? `watch_history_page_${user.id}` : 'watch_history_page_guest';
    const saved = loadState<HistoryMovieCardItem[] | null>(storageKey, null);

    let itemsToDisplay: HistoryMovieCardItem[] = [];

    // If explicitly saved (even if empty array []), respect it!
    if (saved !== null && Array.isArray(saved)) {
      itemsToDisplay = saved;
    } else if (user && user.watchHistory && user.watchHistory.length > 0) {
      itemsToDisplay = user.watchHistory.map((item: any, idx: number) => {
        const matchedMovie = movies.find(m => m.id === item.movieId);
        const durationMins = matchedMovie ? (parseInt(matchedMovie.duration) || 120) : (item.totalMinutes || 120);
        const watchedMins = item.watchedMinutes || Math.round(((item.progressPercent || item.progress || 10) / 100) * durationMins);
        
        return {
          id: `user-hist-${item.movieId}-${idx}`,
          movieId: item.movieId,
          title: matchedMovie?.title || item.movieTitle || 'Фільм',
          year: matchedMovie?.year || 2024,
          durationText: matchedMovie ? (matchedMovie.type === 'series' ? matchedMovie.duration : `${durationMins} хв`) : `${durationMins} хв`,
          ageRating: matchedMovie?.ageRating || '16+',
          genresText: matchedMovie?.genres?.join(', ') || 'Кіно',
          episodeText: item.currentEpisode || (matchedMovie?.type === 'series' ? '1 сезон 1 серія' : undefined),
          progressPercent: Math.min(100, Math.max(5, item.progressPercent || item.progress || 10)),
          watchedMinutes: watchedMins,
          totalMinutes: durationMins,
          backdropUrl: matchedMovie?.backdropUrl || matchedMovie?.posterUrl || 'https://image.tmdb.org/t/p/original/xOMo8BRK7PfcJv9JCnx7s5hj0PX.jpg',
          dateGroup: (() => {
            const timestamp = item.watchedTimestamp || item.watchedAt || (idx === 0 ? Date.now() : idx < 3 ? Date.now() - 86400000 : Date.now() - 86400000 * 3);
            const now = new Date();
            const date = new Date(timestamp);
            const isToday = now.getFullYear() === date.getFullYear() && now.getMonth() === date.getMonth() && now.getDate() === date.getDate();
            const yesterday = new Date(now);
            yesterday.setDate(now.getDate() - 1);
            const isYesterday = yesterday.getFullYear() === date.getFullYear() && yesterday.getMonth() === date.getMonth() && yesterday.getDate() === date.getDate();
            return isToday ? 'today' : isYesterday ? 'yesterday' : 'older';
          })(),
          movieObj: matchedMovie
        };
      });
    }

    setHistoryList(itemsToDisplay);
  };

  // Load Історія on mount and listen to updates
  useEffect(() => {
    loadHistory();
    const handleUpdate = () => loadHistory();
    window.addEventListener('cinemanova_history_updated', handleUpdate);
    return () => window.removeEventListener('cinemanova_history_updated', handleUpdate);
  }, [user, movies]);

  // Збереження Історія Обробник
  const saveHistoryList = (newList: HistoryMovieCardItem[]) => {
    setHistoryList(newList);
    const storageKey = user ? `watch_history_page_${user.id}` : 'watch_history_page_guest';
    saveState(storageKey, newList);
    if (user) {
      saveState(`watch_history_${user.id}`, []);
      if (onUpdateUser) {
        onUpdateUser({
          ...user,
          watchHistory: []
        });
      }
    }
    window.dispatchEvent(new Event('cinemanova_history_updated'));
  };

  // Clear all Історія Обробник
  const handleClearHistory = () => {
    if (historyList.length === 0) return;
    saveHistoryList([]);
  };

  // Фільтрація options
  const genresOptions = ['all', 'Фантастика', 'Фентезі', 'Бойовик', 'Екшн', 'Пригоди', 'Кримінальний', 'Трилер', 'Драма'];
  const yearsOptions = ['all', '2026', '2024', '2023', '2011'];
  const ratingsOptions = ['all', '9+', '8+', '7+'];
  const langOptions = ['all', 'Українська', 'English'];

  // Apply Фільтри
  const filteredHistory = useMemo(() => {
    return historyList.filter(item => {
      if (selectedGenre !== 'all' && !item.genresText.toLowerCase().includes(selectedGenre.toLowerCase())) return false;
      if (selectedYear !== 'all' && item.year.toString() !== selectedYear) return false;
      return true;
    });
  }, [historyList, selectedGenre, selectedYear]);

  const [mobileVisibleCount, setMobileVisibleCount] = useState<number>(6);
  const [isMobile, setIsMobile] = useState<boolean>(() => typeof window !== 'undefined' && window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    setMobileVisibleCount(6);
  }, [selectedGenre, selectedYear, selectedRating, selectedLang]);

  // Group items by today & yesterday & older
  const visibleHistory = isMobile ? filteredHistory.slice(0, mobileVisibleCount) : filteredHistory;
  const todayItems = visibleHistory.filter(i => i.dateGroup === 'today');
  const yesterdayItems = visibleHistory.filter(i => i.dateGroup === 'yesterday');
  const olderItems = visibleHistory.filter(i => i.dateGroup === 'older');

  // Handle Play/Watch Кнопка
  const handleWatchMovie = (item: HistoryMovieCardItem) => {
    let target = item.movieObj || movies.find(m => m.id === item.movieId || m.title.toLowerCase() === item.title.toLowerCase());
    
    if (!target) {
      target = {
        id: item.movieId,
        title: item.title,
        description: `${item.title} — перегляд з історії.`,
        videoUrl: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
        posterUrl: item.backdropUrl,
        backdropUrl: item.backdropUrl,
        rating: 8.8,
        ratingVotesCount: '18 400',
        ageRating: item.ageRating,
        year: item.year,
        duration: item.durationText,
        genres: item.genresText.split(', '),
        type: item.episodeText ? 'series' : 'movie',
        director: 'CINEMA NOVA',
        cast: [],
        languages: ['Українська', 'Англійська'],
        subtitles: ['Українські'],
        viewsCount: 24500
      };
    }

    onPlayMovie(target);
  };

  // Render Картка matching Screenshot 2 design precisely
  const renderCard = (item: HistoryMovieCardItem) => {
    const isCompleted = item.progressPercent >= 100;

    return (
      <div key={item.id} className="w-full">
        {/* Mobile Layout: exact w361 h60, Кнопка w89 h24 */}
        <div 
          style={{ backgroundColor: '#000000' }}
          className="md:hidden w-[361px] max-w-full h-[60px] mx-auto rounded-[12px] border border-white/10 px-2.5 py-1.5 flex items-center justify-between gap-2.5 shadow-md"
        >
          {/* Left Thumbnail & Info */}
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div 
              onClick={() => handleWatchMovie(item)}
              className="w-[75px] h-[46px] rounded-[6px] overflow-hidden shrink-0 relative bg-zinc-900 cursor-pointer"
            >
              <img 
                src={item.backdropUrl} 
                alt={item.title} 
                className="w-full h-full object-cover" 
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = 'https://image.tmdb.org/t/p/original/xOMo8BRK7PfcJv9JCnx7s5hj0PX.jpg';
                }}
              />
            </div>

            <div className="flex-1 min-w-0 flex flex-col justify-center">
              <h4 
                onClick={() => handleWatchMovie(item)}
                className="font-bold text-white text-[11px] truncate leading-tight cursor-pointer"
              >
                {item.movieObj ? getMovieTitle(item.movieObj, language) : item.title}
              </h4>
              <p className="text-[8px] text-zinc-400 truncate mt-0.5">
                {item.year} • {item.durationText} • {item.ageRating}
              </p>
              {/* Progress Bar */}
              <div className="w-full bg-[#1b1922] h-1 rounded-full overflow-hidden mt-1">
                <div 
                  className="h-full rounded-full bg-[#FF3040]"
                  style={{ width: `${item.progressPercent}%` }}
                />
              </div>
            </div>
          </div>

          {/* Right Action Кнопка: exact w89 h24 */}
          <button
            onClick={() => handleWatchMovie(item)}
            className="journey-cta-btn border-2 border-transparent hover:border-white/80 active:border-transparent text-white w-[89px] h-[24px] rounded-xl font-bold text-[10px] flex items-center justify-center gap-1 shrink-0 cursor-pointer active:scale-95 transition-all overflow-hidden"
          >
            {isCompleted ? (
              <>
                <RotateCcw className="w-3 h-3 text-white" />
                <span>{language === 'UA' ? 'Повторно' : 'Rewatch'}</span>
              </>
            ) : (
              <>
                <Play className="w-3 h-3 fill-white ml-0.5" />
                <span>{language === 'UA' ? 'Дивитися' : 'Watch'}</span>
              </>
            )}
          </button>
        </div>

        {/* Desktop Layout (Preserved 100%) */}
        <div 
          style={{ backgroundColor: '#000000' }}
          className="hidden md:flex rounded-[20px] transition-all duration-300 flex-row items-center justify-between gap-6 group shadow-2xl relative overflow-hidden border border-white/10 hover:border-white/20"
        >
          {/* Left: Flush Thumbnail & Details */}
          <div className="flex flex-row items-center gap-6 min-w-0 flex-1">
            {/* Backdrop Image - Flush with left edge */}
            <div 
              onClick={() => handleWatchMovie(item)}
              className="relative w-[280px] md:w-[330px] lg:w-[380px] aspect-[16/9] overflow-hidden shrink-0 bg-black/80 cursor-pointer shadow-xl rounded-l-[20px]"
            >
              <img 
                src={item.backdropUrl} 
                alt={item.title} 
                className="w-full h-full object-cover" 
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = 'https://image.tmdb.org/t/p/original/xOMo8BRK7PfcJv9JCnx7s5hj0PX.jpg';
                }}
              />
              {/* Linear Gradient Накладення (оверлей): right side #000000, ~50% opacity near middle */}
              <div 
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: 'linear-gradient(to right, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0.5) 50%, #000000 100%)'
                }}
              />
            </div>

            {/* Details Колонка */}
            <div className="flex-1 min-w-0 space-y-2 py-4">
              {/* Заголовок */}
              <h3 
                onClick={() => handleWatchMovie(item)}
                className="font-bold text-white text-lg sm:text-xl lg:text-2xl tracking-tight truncate cursor-pointer"
              >
                {item.movieObj ? getMovieTitle(item.movieObj, language) : item.title}
              </h3>

              {/* Metadata line: 2024 • 55 хв • 16+ • Фантастика, Фентезі */}
              <div className="flex items-center flex-wrap gap-2 text-xs sm:text-sm text-zinc-300 font-sans">
                <span className="text-white font-medium">{item.year}</span>
                <span className="text-[#F22E3D] font-bold">•</span>
                <span>{item.durationText}</span>
                <span className="text-[#F22E3D] font-bold">•</span>
                <span>{item.ageRating}</span>
                <span className="text-[#F22E3D] font-bold">•</span>
                <span className="text-zinc-300">{item.genresText}</span>
              </div>

              {/* Серія info line if Серіал */}
              {item.episodeText && (
                <p className="text-xs sm:text-sm text-zinc-400 font-sans">
                  {item.episodeText}
                </p>
              )}

              {/* Progress Bar Контейнер */}
              <div className="pt-2 max-w-2xl space-y-1.5">
                <div className="w-full bg-[#1b1922] h-1.5 rounded-full overflow-hidden relative">
                  <div 
                    className="h-full rounded-full transition-all duration-500 shadow-[0_0_10px_rgba(242,46,61,0.8)]" 
                    style={{ width: `${item.progressPercent}%`, backgroundColor: '#F22E3D' }}
                  />
                </div>

                {/* Progress Labels: e.g. "83 хв із 166 хв" and "55%" */}
                <div className="flex items-center justify-between text-xs text-zinc-400 font-sans">
                  <span>{item.watchedMinutes} хв із {item.totalMinutes} хв</span>
                  <span className="font-bold text-white">{item.progressPercent}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Watch Action Кнопка with journey-cta-btn styling & animation */}
          <div className="flex flex-col items-center justify-end shrink-0 pr-6 py-4">
            <button
              onClick={() => handleWatchMovie(item)}
              className="journey-cta-btn border-2 border-transparent hover:border-white/80 active:border-transparent text-white px-7 py-3 rounded-[10px] font-bold text-sm flex items-center justify-center gap-2 transition-all transform hover:scale-102 active:scale-98 hover:shadow-[0_0_24px_rgba(255,255,255,0.3),0_10px_25px_rgba(215,40,53,0.35)] shadow-lg shadow-[#FF4D5C]/25 cursor-pointer select-none"
            >
              {isCompleted ? (
                <>
                  <RotateCcw className="w-4 h-4 text-white" />
                  <span>{language === 'UA' ? 'Повторно' : 'Rewatch'}</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-white translate-x-0.5" />
                  <span>{language === 'UA' ? 'Дивитися' : 'Watch'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={`w-full font-sans text-white ${embedded ? 'pt-2 pb-8' : 'min-h-[75vh] flex flex-col justify-start'}`}>
      <div className={`${embedded ? 'w-full' : 'w-full max-w-[1430px] mx-auto'} space-y-8 animate-fade-in flex-1 flex flex-col justify-start ${filteredHistory.length === 0 ? 'pb-52 sm:pb-72 md:pb-96' : 'pb-12'}`}>
        {/* Top Шапка сайту Section */}
        <div className="space-y-4 pb-2">
          {/* Top Заголовок Section */}
          <div className="space-y-1">
            <h1 
              style={{ fontFamily: "'Montserrat Alternates', sans-serif" }}
              className="text-2xl sm:text-3xl lg:text-4xl font-semibold tracking-tight text-white"
            >
              {language === 'UA' ? 'Історія переглядів' : 'Watch History'}
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 font-sans">
              {language === 'UA' 
                ? 'Фільми та серіали, які ви нещодавно дивились' 
                : 'Movies and series you recently watched'}
            </p>
          </div>

          {/* Under Заголовок: Фільтрація Кнопки Рядок & Clear Історія on the exact same line, perfectly centered */}
          <div className="flex flex-wrap items-center justify-between gap-4 relative z-50 min-h-[40px]">
            <div className="flex flex-wrap items-center gap-3 sm:gap-4">
              {/* Жанр Випадаюче меню */}
              <div className="relative">
                <button
                  onClick={() => setOpenDropdown(openDropdown === 'genre' ? null : 'genre')}
                  className={`cinema-filter-pill ${openDropdown === 'genre' ? 'invisible pointer-events-none' : ''}`}
                >
                  <span className="relative z-10">{selectedGenre === 'all' ? (language === 'UA' ? 'Жанр' : 'Genre') : selectedGenre}</span>
                  <ChevronDown className="w-4 h-4 relative z-10 text-zinc-400" />
                </button>

                {openDropdown === 'genre' && (
                  <div style={capsuleGlassStyle} className="cinema-filter-capsule left-0 animate-in fade-in zoom-in-95 duration-150">
                    <button
                      onClick={() => setOpenDropdown(null)}
                      className="cinema-capsule-header"
                    >
                      <span className="relative z-20">{selectedGenre === 'all' ? (language === 'UA' ? 'Жанр' : 'Genre') : selectedGenre}</span>
                      <ChevronUp className="w-4 h-4 relative z-20 text-white" />
                    </button>

                    <div className="cinema-capsule-list custom-scrollbar">
                      {genresOptions.map(g => (
                        <button
                          key={g}
                          onClick={() => {
                            setSelectedGenre(g);
                            setOpenDropdown(null);
                          }}
                          className={`cinema-capsule-item ${selectedGenre === g ? 'item-active' : ''}`}
                        >
                          {g === 'all' ? (language === 'UA' ? 'Усі жанри' : 'All genres') : g}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Year Випадаюче меню */}
              <div className="relative">
                <button
                  onClick={() => setOpenDropdown(openDropdown === 'year' ? null : 'year')}
                  className={`cinema-filter-pill ${openDropdown === 'year' ? 'invisible pointer-events-none' : ''}`}
                >
                  <span className="relative z-10">{selectedYear === 'all' ? (language === 'UA' ? 'Рік' : 'Year') : selectedYear}</span>
                  <ChevronDown className="w-4 h-4 relative z-10 text-zinc-400" />
                </button>

                {openDropdown === 'year' && (
                  <div style={capsuleGlassStyle} className="cinema-filter-capsule left-0 animate-in fade-in zoom-in-95 duration-150">
                    <button
                      onClick={() => setOpenDropdown(null)}
                      className="cinema-capsule-header"
                    >
                      <span className="relative z-20">{selectedYear === 'all' ? (language === 'UA' ? 'Рік' : 'Year') : selectedYear}</span>
                      <ChevronUp className="w-4 h-4 relative z-20 text-white" />
                    </button>

                    <div className="cinema-capsule-list custom-scrollbar">
                      {yearsOptions.map(y => (
                        <button
                          key={y}
                          onClick={() => {
                            setSelectedYear(y);
                            setOpenDropdown(null);
                          }}
                          className={`cinema-capsule-item ${selectedYear === y ? 'item-active' : ''}`}
                        >
                          {y === 'all' ? (language === 'UA' ? 'Усі роки' : 'All years') : y}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Рейтинг Випадаюче меню */}
              <div className="relative">
                <button
                  onClick={() => setOpenDropdown(openDropdown === 'rating' ? null : 'rating')}
                  className={`cinema-filter-pill ${openDropdown === 'rating' ? 'invisible pointer-events-none' : ''}`}
                >
                  <span className="relative z-10">{selectedRating === 'all' ? (language === 'UA' ? 'Рейтинг' : 'Rating') : selectedRating}</span>
                  <ChevronDown className="w-4 h-4 relative z-10 text-zinc-400" />
                </button>

                {openDropdown === 'rating' && (
                  <div style={capsuleGlassStyle} className="cinema-filter-capsule right-0 animate-in fade-in zoom-in-95 duration-150">
                    <button
                      onClick={() => setOpenDropdown(null)}
                      className="cinema-capsule-header"
                    >
                      <span className="relative z-20">{selectedRating === 'all' ? (language === 'UA' ? 'Рейтинг' : 'Rating') : selectedRating}</span>
                      <ChevronUp className="w-4 h-4 relative z-20 text-white" />
                    </button>

                    <div className="cinema-capsule-list custom-scrollbar">
                      {ratingsOptions.map(r => (
                        <button
                          key={r}
                          onClick={() => {
                            setSelectedRating(r);
                            setOpenDropdown(null);
                          }}
                          className={`cinema-capsule-item ${selectedRating === r ? 'item-active' : ''}`}
                        >
                          {r === 'all' ? (language === 'UA' ? 'Будь-який' : 'Any') : r}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Language Випадаюче меню */}
              <div className="relative">
                <button
                  onClick={() => setOpenDropdown(openDropdown === 'lang' ? null : 'lang')}
                  className={`cinema-filter-pill ${openDropdown === 'lang' ? 'invisible pointer-events-none' : ''}`}
                >
                  <span className="relative z-10">{selectedLang === 'all' ? (language === 'UA' ? 'Мова' : 'Language') : selectedLang}</span>
                  <ChevronDown className="w-4 h-4 relative z-10 text-zinc-400" />
                </button>

                {openDropdown === 'lang' && (
                  <div style={capsuleGlassStyle} className="cinema-filter-capsule right-0 animate-in fade-in zoom-in-95 duration-150">
                    <button
                      onClick={() => setOpenDropdown(null)}
                      className="cinema-capsule-header"
                    >
                      <span className="relative z-20">{selectedLang === 'all' ? (language === 'UA' ? 'Мова' : 'Language') : selectedLang}</span>
                      <ChevronUp className="w-4 h-4 relative z-20 text-white" />
                    </button>

                    <div className="cinema-capsule-list custom-scrollbar">
                      {langOptions.map(l => (
                        <button
                          key={l}
                          onClick={() => {
                            setSelectedLang(l);
                            setOpenDropdown(null);
                          }}
                          className={`cinema-capsule-item ${selectedLang === l ? 'item-active' : ''}`}
                        >
                          {l === 'all' ? (language === 'UA' ? 'Усі мови' : 'All languages') : l}
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
              onClick={handleClearHistory}
              className="h-10 px-2 flex items-center justify-center gap-2 shrink-0 self-center my-auto text-zinc-400 hover:text-white text-xs sm:text-sm font-medium transition-colors cursor-pointer select-none"
            >
              <Trash2 className="w-4 h-4 text-zinc-400 group-hover:text-white shrink-0" />
              <span className="leading-none whitespace-nowrap">{language === 'UA' ? 'Очистити історію' : 'Clear history'}</span>
            </button>
          </div>
        </div>

        {/* Main Content Area: Grouped by Today / Yesterday / Older */}
        {filteredHistory.length > 0 ? (
          <div className="space-y-8">
            {/* Today Group */}
            {todayItems.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-wide">
                  {language === 'UA' ? 'Сьогодні' : 'Today'}
                </h2>
                <div className="space-y-4">
                  {todayItems.map(renderCard)}
                </div>
              </div>
            )}

            {/* Yesterday Group */}
            {yesterdayItems.length > 0 && (
              <div className="space-y-4 pt-2">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-wide">
                  {language === 'UA' ? 'Вчора' : 'Yesterday'}
                </h2>
                <div className="space-y-4">
                  {yesterdayItems.map(renderCard)}
                </div>
              </div>
            )}

            {/* Older Group */}
            {olderItems.length > 0 && (
              <div className="space-y-4 pt-2">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-wide">
                  {language === 'UA' ? 'Раніше' : 'Earlier'}
                </h2>
                <div className="space-y-4">
                  {olderItems.map(renderCard)}
                </div>
              </div>
            )}

            {/* Mobile 'Завантажити ще' (Load More) Button */}
            {isMobile && mobileVisibleCount < filteredHistory.length && (
              <div className="pt-6 pb-2 flex justify-center md:hidden">
                <button
                  type="button"
                  onClick={() => setMobileVisibleCount(prev => prev + 6)}
                  className="journey-cta-btn border border-transparent hover:border-white/80 active:border-transparent text-white w-[175px] h-[28px] rounded-[6px] font-bold text-xs flex items-center justify-center gap-1.5 transition-all transform hover:scale-102 active:scale-98 hover:shadow-[0_0_24px_rgba(255,255,255,0.3),0_10px_25px_rgba(215,40,53,0.35)] shadow-md shadow-[#FF4D5C]/25 cursor-pointer select-none"
                >
                  <span>{language === 'UA' ? 'Завантажити ще' : 'Load more'}</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          /* Empty State directly close to the filters */
          <div className="pt-1 pb-16 flex-1">
            <p className="text-xs sm:text-sm text-zinc-400 font-normal font-sans">
              {language === 'UA'
                ? "Ви ще нічого не переглядали. Тут з'являться фільми та серіали, які ви переглянете."
                : "You haven't watched anything yet. Movies and series you watch will appear here."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
