import React, { useState, useMemo, useRef, useEffect } from 'react';
import { ChevronDown, ChevronUp, Star, Check, Trash2, Plus, Search, X, Loader2 } from 'lucide-react';
import { Movie } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { getMovieTitle, getMovieDescription, translateGenre } from '../lib/translations';
import { CreateRoomModal } from './CreateRoomModal';
import { getWatchPartyMovieIds, addWatchPartyMovieId, removeWatchPartyMovieId, getWatchPartyRoom } from '../utils/watchPartyStorage';
import { notifyWatchPartyJoined } from '../services/notifications';

const capsuleGlassStyle: React.CSSProperties = {
  backdropFilter: 'blur(24px) saturate(190%)',
  WebkitBackdropFilter: 'blur(24px) saturate(190%)',
  backgroundColor: 'rgba(18, 18, 24, 0.65)',
};

interface WatchPartyProps {
  movies: Movie[];
  user: any;
  onOpenAuth?: () => void;
  onSelectMovie?: (movie: Movie) => void;
  onNavigateToCatalog?: () => void;
  initialMovieId?: string | null;
  onClearInitialMovieId?: () => void;
  initialRoomId?: string | null;
  onClearInitialRoomId?: () => void;
  onJoinActiveRoom?: (movie: Movie, roomConfig?: any) => void;
  embedded?: boolean;
}

// IDs of real top Фільми/Серіал available for Watch Party
const DEFAULT_WATCHPARTY_IDS = [
  'dune-part-two-2024',
  'gladiator-2-2024',
  'deadpool-wolverine-2024',
  'arcane-s2-2024',
  'the-penguin-2024',
  'alien-romulus-2024',
  'oppenheimer-2023',
  'stranger-things-s4',
  'the-batman-2022',
  'interstellar-2014',
  'solo-leveling-2024',
  'squid-game-dorama'
];

const GENRES_LIST = [
  'Фільми', 'Серіали', 'Аніме', 'Бойовик', 'Комедія', 'Драма',
  'Фантастика', 'Трилер', 'Жахи', 'Мелодрама', 'Детектив', 'Пригоди', 'Фентезі',
  'Кримінал', 'Документальний', 'Історичний', 'Сімейний', 'Військовий'
];
const YEARS_LIST = ['2026', '2025', '2024', '2023', '2022', '2021', '2020', '2019', '2018', '2010-ті', '2000-ні'];
const RATINGS_LIST = ['8.0', '7.0', '6.0', '5.0'];
const LANGUAGES_LIST = ['Українська', 'English', '日本語'];

export default function WatchParty({ 
  movies, 
  user, 
  onOpenAuth, 
  onSelectMovie,
  onNavigateToCatalog,
  initialMovieId,
  onClearInitialMovieId,
  initialRoomId,
  onClearInitialRoomId,
  onJoinActiveRoom,
  embedded = false
}: WatchPartyProps) {
  const { language } = useLanguage();

  // Модальне вікно Стан for creating a room
  const [selectedMovieForRoom, setSelectedMovieForRoom] = useState<Movie | null>(null);

  useEffect(() => {
    if (initialMovieId) {
      const found = movies.find(m => m.id === initialMovieId);
      if (found) {
        setSelectedMovieForRoom(found);
      }
    }
  }, [initialMovieId, movies]);

  // Code Поле введення & join Стан
  const [codeInput, setCodeInput] = useState('');
  const [joinError, setJoinError] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);

  const joinRoomByCode = async (rawCode: string) => {
    const code = rawCode.trim();
    if (!code) return;
    setIsJoining(true);
    setJoinError(null);

    try {
      // 1. Check Backend API
      try {
        const res = await fetch(`/api/watchparty/rooms/${encodeURIComponent(code)}`);
        if (res.ok) {
          const data = await res.json();
          if (data && data.room) {
            const targetMovie = data.room.movie || movies.find(m => m.id === data.room.movieId);
            if (targetMovie) {
              addWatchPartyMovieId(targetMovie.id, user?.id);
              notifyWatchPartyJoined(targetMovie, code);
              if (onJoinActiveRoom) {
                onJoinActiveRoom(targetMovie, {
                  ...data.room,
                  isHost: false,
                  createdByMe: false,
                  fromJoin: true
                });
              }
              setIsJoining(false);
              return;
            }
          }
        }
      } catch (e) {}

      // 2. Check local storage
      const localRoom = getWatchPartyRoom(code);
      if (localRoom) {
        const targetMovie = localRoom.movie || movies.find(m => m.id === localRoom.movieId);
        if (targetMovie) {
          addWatchPartyMovieId(targetMovie.id, user?.id);
          notifyWatchPartyJoined(targetMovie, code);
          if (onJoinActiveRoom) {
            onJoinActiveRoom(targetMovie, {
              ...localRoom,
              isHost: false,
              createdByMe: false,
              fromJoin: true
            });
          }
          setIsJoining(false);
          return;
        }
      }

      // 3. Динамічний resolution from Code format: e.g. NOVA-Серіал-ARCANE-1234 or NOVA-ANIME-NARU-4321
      const codeUpper = code.toUpperCase();
      const parts = codeUpper.split('-');
      const keyword = parts.length >= 3 ? parts[parts.length - 2] : codeUpper;

      let targetMovie = movies.find(m => {
        if (m.id.toUpperCase() === codeUpper) return true;
        const clean = m.id.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
        return clean.includes(keyword) || codeUpper.includes(clean);
      });

      if (!targetMovie) {
        targetMovie = movies.find(m => {
          const titleClean = (m.title || '').replace(/[^a-zA-Z0-9а-яА-Яіїєґ]/g, '').toUpperCase();
          const titleEnClean = (m.titleEn || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
          return (keyword.length >= 3 && (titleClean.includes(keyword) || titleEnClean.includes(keyword)));
        });
      }

      if (targetMovie) {
        addWatchPartyMovieId(targetMovie.id, user?.id);
        notifyWatchPartyJoined(targetMovie, code);
        if (onJoinActiveRoom) {
          onJoinActiveRoom(targetMovie, {
            roomId: code,
            movieId: targetMovie.id,
            movieTitle: targetMovie.title,
            isHost: false,
            createdByMe: false,
            fromJoin: true
          });
        }
      } else {
        setJoinError(
          language === 'UA' 
            ? `Кімнату за кодом «${code}» не знайдено.`
            : `Room for code "${code}" not found.`
        );
      }
    } finally {
      setIsJoining(false);
    }
  };

  useEffect(() => {
    if (initialRoomId && onJoinActiveRoom) {
      joinRoomByCode(initialRoomId);
      if (onClearInitialRoomId) onClearInitialRoomId();
    }
  }, [initialRoomId, movies, onJoinActiveRoom, onClearInitialRoomId]);

  // Add Фільм Модальне вікно Стан
  const [isAddMovieModal, setIsAddMovieModal] = useState(false);
  const [addSearchQuery, setAddSearchQuery] = useState('');

  // Фільтрація Випадаюче меню Стани
  const [selectedGenre, setSelectedGenre] = useState<string>('all');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedRating, setSelectedRating] = useState<string>('all');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('all');

  const [activeFilterDropdown, setActiveFilterDropdown] = useState<'genre' | 'year' | 'rating' | 'lang' | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Закриття Випадаюче меню on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setActiveFilterDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Користувач's Watch Party Стан & live Синхронізація
  const [watchPartyVersion, setWatchPartyVersion] = useState(0);

  useEffect(() => {
    const handleSync = () => setWatchPartyVersion(v => v + 1);
    window.addEventListener('watchparty_updated', handleSync);
    return () => window.removeEventListener('watchparty_updated', handleSync);
  }, []);

  // Default movies matching mobile screenshot (Backrooms, Одіссея, Монстр, Буремний перевал, Ель, Клинок, Гра в кальмара)
  // Допоміжна функція to ensure full compliance with Фільм type
  const createDefaultMovie = (data: Partial<Movie> & { id: string; title: string; posterUrl: string; rating: number; year: number }): Movie => ({
    titleEn: data.title,
    backdropUrl: data.posterUrl,
    ratingVotesCount: '15.4K',
    viewsCount: 28400,
    duration: data.type === 'movie' ? '124 хв' : '1 сезон',
    videoUrl: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
    ageRating: '16+',
    genres: ['Драма'],
    type: 'movie',
    description: '',
    ...data,
  });

  // Default movies matching mobile screenshot (Backrooms, Одіссея, Монстр, Буремний перевал, Ель, Клинок, Гра в кальмара)
  const defaultScreenshotMovies: Movie[] = useMemo(() => {
    return [
      createDefaultMovie({
        id: 'backrooms-party',
        title: 'Backrooms: Залаштунки',
        titleEn: 'The Backrooms',
        posterUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80',
        rating: 7.0,
        ageRating: '16+',
        genres: ['Жахи', 'Фантастика'],
        year: 2026,
        type: 'series',
        description: 'Таємничі нескінченні жовті коридори Залаштунків приховують смертельні небезпеки.',
      }),
      createDefaultMovie({
        id: 'odyssey-party',
        title: 'Одіссея',
        titleEn: 'The Odyssey',
        posterUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=600&q=80',
        rating: 6.7,
        ageRating: '16+',
        genres: ['Екшн', 'Фантастика'],
        year: 2026,
        type: 'movie',
        description: 'Космічна одіссея у глибини невідомого Всесвіту.',
      }),
      createDefaultMovie({
        id: 'monster-anime',
        title: 'Монстр',
        titleEn: 'Monster',
        posterUrl: 'https://image.tmdb.org/t/p/w500/n5XNKXnoXpoXyfiCtXHOf8q8PFM.jpg',
        rating: 7.2,
        ageRating: '16+',
        genres: ['Жахи', 'Фантастика'],
        year: 2019,
        type: 'series',
        description: 'Психологічний детектив про доктора Темну.',
      }),
      createDefaultMovie({
        id: 'wuthering-heights-2026',
        title: 'Буремний перевал',
        titleEn: 'Wuthering Heights',
        posterUrl: 'https://image.tmdb.org/t/p/w500/xOMo8BRK7PfcJv9JCnx7s5hj0PX.jpg',
        rating: 6.8,
        ageRating: '16+',
        genres: ['Романтика', 'Драма'],
        year: 2026,
        type: 'movie',
        description: 'Екранізація класичної драми про всепоглинаюче кохання.',
      }),
      createDefaultMovie({
        id: 'elle-woods-2026',
        title: 'Ель',
        titleEn: 'Elle',
        posterUrl: 'https://image.tmdb.org/t/p/w500/ca9B2yQeF10a.jpg',
        rating: 6.9,
        ageRating: '16+',
        genres: ['Комедія', 'Драма'],
        year: 2026,
        type: 'series',
        description: 'Нова історія про Ель Вудс у шкільні роки.',
      }),
      createDefaultMovie({
        id: 'demon-slayer-2019',
        title: 'Клинок, що знищує демонів',
        titleEn: 'Demon Slayer: Kimetsu no Yaiba',
        posterUrl: 'https://image.tmdb.org/t/p/w500/xUfRZu2mi8jH6SzQEJGP6tjBuYj.jpg',
        rating: 8.6,
        ageRating: '16+',
        genres: ['Фентезі', 'Пригоди'],
        year: 2019,
        type: 'series',
        description: 'Танджіро стає винищувачем демонів, щоб врятувати свою сестру.',
      }),
      createDefaultMovie({
        id: 'squid-game-dorama',
        title: 'Гра в кальмара',
        titleEn: 'Squid Game',
        posterUrl: 'https://image.tmdb.org/t/p/w500/dDlG1T3k7y7a.jpg',
        rating: 8.0,
        ageRating: '16+',
        genres: ['Трилер', 'Бойовик'],
        year: 2021,
        type: 'series',
        description: 'Сотні гравців змагаються у смертельних дитячих іграх за шалений куш.',
      })
    ];
  }, []);

  const handleClearHistory = () => {
    try {
      if (user?.id) {
        localStorage.removeItem(`user_watchparty_ids_${user.id}`);
        localStorage.setItem(`user_watchparty_cleared_${user.id}`, 'true');
      }
      localStorage.removeItem('user_watchparty_ids');
      localStorage.setItem('user_watchparty_cleared', 'true');
      window.dispatchEvent(new Event('watchparty_updated'));
      setWatchPartyVersion(v => v + 1);
    } catch (e) {
      console.warn(e);
    }
  };

  // Фільтрація Watch Party Фільми: for a Користувач, show their added/created rooms, or За замовчуванням screenshot Фільми if none
  const watchPartyMovies = useMemo(() => {
    const userCleared = localStorage.getItem(user?.id ? `user_watchparty_cleared_${user.id}` : 'user_watchparty_cleared') === 'true';
    const savedIds = getWatchPartyMovieIds(user?.id);

    let baseMovies: Movie[] = [];
    if (savedIds.length > 0) {
      baseMovies = savedIds
        .map(id => movies.find(m => m.id === id) || defaultScreenshotMovies.find(m => m.id === id))
        .filter((m): m is Movie => Boolean(m));
    } else if (!userCleared) {
      baseMovies = defaultScreenshotMovies;
    }

    return baseMovies.filter(movie => {
      if (selectedGenre !== 'all' && !movie.genres?.includes(selectedGenre)) return false;
      if (selectedYear !== 'all' && movie.year.toString() !== selectedYear) return false;
      if (selectedRating !== 'all' && movie.rating < parseFloat(selectedRating)) return false;
      if (selectedLanguage !== 'all' && !movie.languages?.includes(selectedLanguage)) return false;
      return true;
    });
  }, [movies, user?.id, watchPartyVersion, selectedGenre, selectedYear, selectedRating, selectedLanguage, defaultScreenshotMovies]);

  const currentSavedIds = useMemo(() => {
    return getWatchPartyMovieIds(user?.id);
  }, [user?.id, watchPartyVersion]);

  const availableMoviesToAdd = useMemo(() => {
    if (!addSearchQuery.trim()) return movies;
    const q = addSearchQuery.toLowerCase().trim();
    return movies.filter(m => 
      m.title.toLowerCase().includes(q) || 
      (m.genres || []).some(g => g.toLowerCase().includes(q))
    );
  }, [movies, addSearchQuery]);

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
    <div className={embedded ? "space-y-6 pt-1 font-sans animate-in fade-in duration-200" : "space-y-4 sm:space-y-7 font-sans pb-16 w-full max-w-[1430px] mx-auto"}>
      {/* 1. Шапка сайту Рядок matching Screenshot 1, 2, 3 */}
      <div className="space-y-3 sm:space-y-0 sm:flex sm:items-center sm:justify-between sm:gap-4 pb-1 sm:pb-0" ref={dropdownRef}>
        <div>
          <h1 className={embedded ? "font-display font-bold text-xl sm:text-2xl text-white tracking-tight" : "font-display font-bold text-2xl sm:text-3xl text-white tracking-tight"}>
            Watch Party
          </h1>
          <div className="flex items-center justify-between sm:block mt-1 sm:mt-0.5">
            <p className="text-xs sm:text-sm text-[#A3A3A3] font-sans">
              {language === 'UA' ? 'Дивіться разом культові історії!' : 'Watch cult stories together!'}
            </p>

            {/* Clear Історія Кнопка on Mobile placed beside subtitle matching screenshots */}
            <button
              type="button"
              onClick={handleClearHistory}
              className="sm:hidden flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition cursor-pointer select-none shrink-0"
              title={language === 'UA' ? 'Очистити історію' : 'Clear history'}
            >
              <Trash2 className="w-3.5 h-3.5 text-zinc-400" />
              <span>{language === 'UA' ? 'Очистити історію' : 'Clear history'}</span>
            </button>
          </div>
        </div>

        {/* Clear Історія Кнопка on Desktop */}
        <button
          type="button"
          onClick={handleClearHistory}
          className="hidden sm:flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition cursor-pointer select-none shrink-0"
          title={language === 'UA' ? 'Очистити історію' : 'Clear history'}
        >
          <Trash2 className="w-3.5 h-3.5 text-zinc-400" />
          <span>{language === 'UA' ? 'Очистити історію' : 'Clear history'}</span>
        </button>

        {/* Фільтрація Кнопки: 4 Колонки across mobile width matching screenshot, flex on desktop */}
        <div className="grid grid-cols-4 gap-2 sm:flex sm:flex-wrap sm:items-center sm:gap-3 lg:gap-4 relative z-50 shrink-0 w-full sm:w-auto">
          {/* 1. Жанр Випадаюче меню */}
          <div className="relative w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setActiveFilterDropdown(activeFilterDropdown === 'genre' ? null : 'genre')}
              className={`watchparty-filter-pill cinema-filter-pill ${activeFilterDropdown === 'genre' ? 'invisible pointer-events-none' : ''}`}
            >
              <span className="relative z-10 truncate">{genrePillLabel}</span>
              <ChevronDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 relative z-10 text-zinc-300 shrink-0" />
            </button>

            {activeFilterDropdown === 'genre' && (
              <div style={capsuleGlassStyle} className="cinema-filter-capsule watchparty-capsule left-0 animate-in fade-in zoom-in-95 duration-150">
                <button
                  type="button"
                  onClick={() => setActiveFilterDropdown(null)}
                  className="cinema-capsule-header"
                >
                  <span className="relative z-20 truncate">{genrePillLabel}</span>
                  <ChevronUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 relative z-20 text-white shrink-0" />
                </button>

                <div className="cinema-capsule-list custom-scrollbar">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedGenre('all');
                      setActiveFilterDropdown(null);
                    }}
                    className={`cinema-capsule-item ${selectedGenre === 'all' ? 'item-active' : ''}`}
                  >
                    {language === 'UA' ? 'Усі жанри' : 'All genres'}
                  </button>
                  {GENRES_LIST.map((g) => (
                    <button
                      type="button"
                      key={g}
                      onClick={() => {
                        setSelectedGenre(g);
                        setActiveFilterDropdown(null);
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
          <div className="relative w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setActiveFilterDropdown(activeFilterDropdown === 'year' ? null : 'year')}
              className={`watchparty-filter-pill cinema-filter-pill ${activeFilterDropdown === 'year' ? 'invisible pointer-events-none' : ''}`}
            >
              <span className="relative z-10 truncate">{yearPillLabel}</span>
              <ChevronDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 relative z-10 text-zinc-300 shrink-0" />
            </button>

            {activeFilterDropdown === 'year' && (
              <div style={capsuleGlassStyle} className="cinema-filter-capsule watchparty-capsule left-0 animate-in fade-in zoom-in-95 duration-150">
                <button
                  type="button"
                  onClick={() => setActiveFilterDropdown(null)}
                  className="cinema-capsule-header"
                >
                  <span className="relative z-20 truncate">{yearPillLabel}</span>
                  <ChevronUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 relative z-20 text-white shrink-0" />
                </button>

                <div className="cinema-capsule-list custom-scrollbar">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedYear('all');
                      setActiveFilterDropdown(null);
                    }}
                    className={`cinema-capsule-item ${selectedYear === 'all' ? 'item-active' : ''}`}
                  >
                    {language === 'UA' ? 'Усі роки' : 'All years'}
                  </button>
                  {YEARS_LIST.map((y) => (
                    <button
                      type="button"
                      key={y}
                      onClick={() => {
                        setSelectedYear(y);
                        setActiveFilterDropdown(null);
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
          <div className="relative w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setActiveFilterDropdown(activeFilterDropdown === 'rating' ? null : 'rating')}
              className={`watchparty-filter-pill cinema-filter-pill ${activeFilterDropdown === 'rating' ? 'invisible pointer-events-none' : ''}`}
            >
              <span className="relative z-10 truncate">{ratingPillLabel}</span>
              <ChevronDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 relative z-10 text-zinc-300 shrink-0" />
            </button>
 
            {activeFilterDropdown === 'rating' && (
              <div style={capsuleGlassStyle} className="cinema-filter-capsule watchparty-capsule right-0 animate-in fade-in zoom-in-95 duration-150">
                <button
                  type="button"
                  onClick={() => setActiveFilterDropdown(null)}
                  className="cinema-capsule-header"
                >
                  <span className="relative z-20 truncate">{ratingPillLabel}</span>
                  <ChevronUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 relative z-20 text-white shrink-0" />
                </button>

                <div className="cinema-capsule-list custom-scrollbar">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedRating('all');
                      setActiveFilterDropdown(null);
                    }}
                    className={`cinema-capsule-item ${selectedRating === 'all' ? 'item-active' : ''}`}
                  >
                    {language === 'UA' ? 'Будь-який' : 'Any rating'}
                  </button>
                  {RATINGS_LIST.map((r) => (
                    <button
                      type="button"
                      key={r}
                      onClick={() => {
                        setSelectedRating(r);
                        setActiveFilterDropdown(null);
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
          <div className="relative w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setActiveFilterDropdown(activeFilterDropdown === 'lang' ? null : 'lang')}
              className={`watchparty-filter-pill cinema-filter-pill ${activeFilterDropdown === 'lang' ? 'invisible pointer-events-none' : ''}`}
            >
              <span className="relative z-10 truncate">{languagePillLabel}</span>
              <ChevronDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 relative z-10 text-zinc-300 shrink-0" />
            </button>

            {activeFilterDropdown === 'lang' && (
              <div style={capsuleGlassStyle} className="cinema-filter-capsule watchparty-capsule right-0 animate-in fade-in zoom-in-95 duration-150">
                <button
                  type="button"
                  onClick={() => setActiveFilterDropdown(null)}
                  className="cinema-capsule-header"
                >
                  <span className="relative z-20 truncate">{languagePillLabel}</span>
                  <ChevronUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 relative z-20 text-white shrink-0" />
                </button>

                <div className="cinema-capsule-list custom-scrollbar">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedLanguage('all');
                      setActiveFilterDropdown(null);
                    }}
                    className={`cinema-capsule-item ${selectedLanguage === 'all' ? 'item-active' : ''}`}
                  >
                    {language === 'UA' ? 'Усі мови' : 'All languages'}
                  </button>
                  {LANGUAGES_LIST.map((l) => (
                    <button
                      type="button"
                      key={l}
                      onClick={() => {
                        setSelectedLanguage(l);
                        setActiveFilterDropdown(null);
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
        </div>
      </div>

      {/* 2. Code Поле введення Field: w174 h34 on mobile matching Screenshot 1/2 */}
      <div className="space-y-1">
        <label className="text-xs sm:text-sm text-zinc-300 font-light block mb-1.5 sm:mb-2">
          {language === 'UA' ? 'Ввести код' : 'Enter code'}
        </label>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (codeInput.trim()) {
              joinRoomByCode(codeInput.trim());
            }
          }}
        >
          <div className="relative w-[174px] h-[34px] md:w-full md:max-w-[280px] md:h-[51px]">
            <input
              type="text"
              value={codeInput}
              onChange={(e) => {
                setCodeInput(e.target.value);
                if (joinError) setJoinError(null);
              }}
              placeholder={language === 'UA' ? 'Код кімнати...' : 'Room code...'}
              className="w-full h-full rounded-[8px] md:rounded-[16px] border border-[#FAFAFA] bg-transparent px-3 md:px-4 pr-6 md:pr-10 text-white text-[12px] md:text-sm focus:outline-none focus:border-[#FAFAFA] focus:ring-1 focus:ring-[#FAFAFA] hover:border-[#FAFAFA] active:border-[#FAFAFA] transition-all uppercase placeholder:normal-case placeholder:text-zinc-500 font-mono tracking-wider"
            />
            {isJoining && (
              <Loader2 className="w-3.5 h-3.5 md:w-4 md:h-4 animate-spin text-zinc-400 absolute right-2 md:right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
            )}
          </div>
          {joinError && (
            <p className="text-xs text-[#FF4D5C] mt-2 font-medium">
              {joinError}
            </p>
          )}
        </form>
      </div>

      {/* 3. Фільм Сітка or Empty Стан */}
      {watchPartyMovies.length === 0 ? (
        <div className="pt-2 pb-64 sm:pb-80 md:pb-96 flex-1 text-left">
          <p className="text-xs sm:text-sm text-zinc-300 font-medium font-sans mt-2">
            {language === 'UA'
              ? "У вас ще немає доданих фільмів або активних кімнат для спільного перегляду. Тут з'являться фільми та події, які ви створите або до яких приєднаєтесь."
              : "You don't have any added movies or active rooms for watch party yet. Movies and events you create or join will appear here."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-3 justify-items-center sm:justify-items-stretch sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5 sm:gap-4 lg:gap-5 xl:gap-[30px] pt-2">
          {/* 3. Фільм Сітка (3 cols on mobile, 5 Колонки on desktop matching Figma 30px gap) */}
          {watchPartyMovies.map((movie) => (
            <div
              key={movie.id}
              onClick={() => setSelectedMovieForRoom(movie)}
              className="w-full sm:w-full sm:h-auto sm:min-w-0 sm:max-w-none aspect-[104/146] sm:aspect-[2/3] group relative rounded-[4.78px] sm:rounded-[16px] cursor-pointer select-none bg-[#121212] border-0 sm:border sm:border-white/10 sm:hover:border-transparent poster-hover-notif-border transition-all duration-300 ease-out sm:hover:shadow-[0_0_28px_rgba(255,48,64,0.35)]"
            >
              <div className="relative w-full h-full overflow-hidden bg-[#121212] rounded-[4.78px] sm:rounded-[15px]">
                {/* Floating Бейджі on Mobile: matches screenshot with red star and age Бейдж */}
                <div className="absolute top-1.5 inset-x-0 px-1.5 flex items-center justify-between z-30 pointer-events-none md:hidden">
                  <div className="px-1.5 py-0.5 rounded-[4px] bg-black/60 backdrop-blur-md border border-white/15 text-[7.5px] font-bold text-white flex items-center gap-0.5 shadow-sm">
                    <Star className="w-2 h-2 fill-[#FF3040] text-[#FF3040] shrink-0" />
                    <span className="text-white font-bold tracking-tight leading-none">{typeof movie.rating === 'number' ? movie.rating.toFixed(1) : movie.rating}</span>
                  </div>
                  <div className="px-1.5 py-0.5 rounded-[4px] bg-black/60 backdrop-blur-md border border-white/15 text-[7.5px] font-bold text-white shadow-sm flex items-center justify-center">
                    <span className="text-white font-bold tracking-tight leading-none">{movie.ageRating || '16+'}</span>
                  </div>
                </div>

                {/* Desktop Бейджі: Рейтинг (Left) & Trash/Age (Right) */}
                <div className="hidden md:flex absolute top-3 left-3 right-3 items-center justify-between pointer-events-none z-30">
                  <div className="bg-black/35 backdrop-blur-md px-3.5 py-1.5 rounded-[10px] text-xs font-semibold text-white flex items-center gap-1.5 border border-white/15 shadow-sm group-hover:bg-white/10 group-hover:border-white/25 transition-all duration-300">
                    <Star className="w-3.5 h-3.5 fill-[#FF3040] text-[#FF3040] shrink-0" />
                    <span className="text-white font-bold">{typeof movie.rating === 'number' ? movie.rating.toFixed(1) : movie.rating}</span>
                  </div>

                  <div className="flex items-center gap-1.5 pointer-events-auto">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeWatchPartyMovieId(movie.id, user?.id);
                        setWatchPartyVersion(v => v + 1);
                      }}
                      title={language === 'UA' ? 'Видалити зі спільного перегляду' : 'Remove from Watch Party'}
                      className="w-7 h-7 rounded-[8px] bg-black/50 hover:bg-[#D72835] text-zinc-300 hover:text-white flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 cursor-pointer border border-white/15 shadow-sm active:scale-95"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>

                    <div className="bg-black/35 backdrop-blur-md px-3.5 py-1.5 rounded-[10px] text-xs font-semibold text-white border border-white/15 shadow-sm group-hover:bg-white/10 group-hover:border-white/25 transition-all duration-300">
                      {movie.ageRating || '16+'}
                    </div>
                  </div>
                </div>

                {/* Poster Image */}
                <img
                  src={movie.posterUrl}
                  alt={movie.title}
                  className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
                  referrerPolicy="no-referrer"
                />

                {/* Frosted Glass Накладення (оверлей) */}
                <div className="absolute inset-x-0 bottom-0 z-20 flex flex-col justify-start pt-[9px] pb-[8px] px-[5px] sm:px-4 sm:pt-[22px] sm:pb-4 w-full bg-gradient-to-t from-black/95 via-black/80 to-transparent backdrop-blur-[8px] pointer-events-none transition-all duration-300 ease-out">
                  <h3 className="font-display font-bold text-white text-[8px] sm:text-[17px] leading-tight line-clamp-2 break-words w-full sm:w-[239px] sm:max-w-full sm:h-[42px] drop-shadow-md">
                    {getMovieTitle(movie, language)}
                  </h3>

                  <div className="flex items-center text-[6px] sm:text-[11.5px] text-zinc-300 font-sans mt-[9px] sm:mt-[22px] drop-shadow-sm whitespace-nowrap overflow-hidden gap-1 sm:gap-1.5">
                    {(movie.genres || []).slice(0, 2).map((g, i) => (
                      <React.Fragment key={g}>
                        {i > 0 && <span className="w-0.5 h-0.5 sm:w-1 sm:h-1 rounded-full bg-[#FF3040] inline-block shrink-0" />}
                        <span className="truncate">{translateGenre(g, language)}</span>
                      </React.Fragment>
                    ))}
                    <span className="w-0.5 h-0.5 sm:w-1 sm:h-1 rounded-full bg-[#FF3040] inline-block shrink-0" />
                    <span className="shrink-0">{movie.year}</span>
                  </div>

                  {/* Short Опис - smoothly expands on hover (desktop only) */}
                  <div className="hidden md:grid grid-rows-[0fr] group-hover:grid-rows-[1fr] transition-all duration-300 ease-out">
                    <div className="overflow-hidden">
                      <p className="text-xs sm:text-[12.5px] text-zinc-200/90 font-sans leading-relaxed line-clamp-4 sm:line-clamp-5 mt-2.5 pt-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-75">
                        {getMovieDescription(movie, language)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedMovieForRoom && (
        <CreateRoomModal
          isOpen={!!selectedMovieForRoom}
          onClose={() => {
            setSelectedMovieForRoom(null);
            if (onClearInitialMovieId) onClearInitialMovieId();
          }}
          movie={selectedMovieForRoom}
          user={user}
          onCreateRoom={(room) => {
            const m = movies.find(x => x.id === room.movieId) || selectedMovieForRoom;
            setSelectedMovieForRoom(null);
            if (onClearInitialMovieId) onClearInitialMovieId();
            if (m) {
              addWatchPartyMovieId(m.id, user?.id);
            }
            if (m && onJoinActiveRoom) {
              onJoinActiveRoom(m, room);
            }
          }}
          onWatchTogether={(movieId, options) => {
            const m = movies.find(x => x.id === movieId) || selectedMovieForRoom;
            setSelectedMovieForRoom(null);
            if (onClearInitialMovieId) onClearInitialMovieId();
            if (m) {
              addWatchPartyMovieId(m.id, user?.id);
            }
            if (m && onJoinActiveRoom) {
              onJoinActiveRoom(m, options);
            }
          }}
        />
      )}

      {/* Add Фільм Модальне вікно */}
      {isAddMovieModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="relative w-full max-w-2xl bg-[#121216] border border-white/15 rounded-2xl p-6 max-h-[85vh] flex flex-col shadow-2xl">
            {/* Шапка сайту */}
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-[#FF3040]" />
                <span>{language === 'UA' ? 'Додати фільм до спільного перегляду' : 'Add Movie to Watch Party'}</span>
              </h3>
              <button
                onClick={() => setIsAddMovieModal(false)}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Пошук Поле введення */}
            <div className="relative mt-4 mb-4">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                value={addSearchQuery}
                onChange={(e) => setAddSearchQuery(e.target.value)}
                placeholder={language === 'UA' ? 'Пошук фільму чи серіалу...' : 'Search movie or series...'}
                className="w-full bg-black/40 border border-white/15 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-white/30"
              />
            </div>

            {/* Фільм Список */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {availableMoviesToAdd.length === 0 ? (
                <p className="text-zinc-400 text-sm text-center py-8">
                  {language === 'UA' ? 'Фільмів не знайдено' : 'No movies found'}
                </p>
              ) : (
                availableMoviesToAdd.slice(0, 30).map((m) => {
                  const isAdded = currentSavedIds.includes(m.id);
                  return (
                    <div
                      key={m.id}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/5 transition-colors gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={m.posterUrl}
                          alt={m.title}
                          className="w-10 h-14 object-cover rounded-lg shrink-0"
                          referrerPolicy="no-referrer"
                        />
                        <div className="min-w-0">
                          <h4 className="text-white font-medium text-sm truncate">{m.title}</h4>
                          <p className="text-zinc-400 text-xs truncate">
                            {m.year} • {(m.genres || []).slice(0, 2).join(', ')} • ★ {m.rating.toFixed(1)}
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          if (isAdded) {
                            removeWatchPartyMovieId(m.id, user?.id);
                          } else {
                            addWatchPartyMovieId(m.id, user?.id);
                          }
                          setWatchPartyVersion(v => v + 1);
                        }}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold shrink-0 flex items-center gap-1.5 transition-all cursor-pointer ${
                          isAdded
                            ? 'bg-white/10 text-zinc-300 hover:bg-[#FF3040]/20 hover:text-[#FF3040]'
                            : 'bg-[#FF3040] text-white hover:bg-[#FF3040]/80'
                        }`}
                      >
                        {isAdded ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>{language === 'UA' ? 'Додано' : 'Added'}</span>
                          </>
                        ) : (
                          <>
                            <Plus className="w-3.5 h-3.5" />
                            <span>{language === 'UA' ? 'Додати' : 'Add'}</span>
                          </>
                        )}
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
