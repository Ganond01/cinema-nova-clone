import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Star, ArrowLeft, Layers, Clock, Sparkles, X, Trash2, Search } from 'lucide-react';
import { Movie, UserProfile } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { translateGenre } from '../lib/translations';
import { validatePosterUrl, handlePosterError } from '../utils/imageFallback';
import { COLLECTIONS_DATA, CollectionItem } from '../data/collectionsData';
import { DORAMAS_LIST } from '../data/doramas';
import { isCartoon, sanitizeMovieGenres } from '../utils/movieFilter';
import CollectionView from './CollectionView';

interface SearchViewProps {
  movies: Movie[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onSelectMovie: (movie: Movie) => void;
  onPlayMovie: (movie: Movie) => void;
  user?: UserProfile | null;
  onUpdateUser?: (updatedUser: UserProfile) => void;
  onOpenAuth?: () => void;
}

export default function SearchView({
  movies,
  searchQuery,
  setSearchQuery,
  onSelectMovie,
  onPlayMovie,
  user,
  onUpdateUser,
  onOpenAuth
}: SearchViewProps) {
  const { language } = useLanguage();
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'movies' | 'series' | 'anime' | 'collections' | 'doramas'>('all');
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);
  const mobileCategoryDropdownRef = useRef<HTMLDivElement>(null);
  const [activeCollection, setActiveCollection] = useState<CollectionItem | null>(null);
  const carouselRef = useRef<HTMLDivElement>(null);

  const capsuleGlassStyle: React.CSSProperties = {
    backdropFilter: 'blur(24px) saturate(190%)',
    WebkitBackdropFilter: 'blur(24px) saturate(190%)',
    backgroundColor: 'rgba(18, 18, 24, 0.65)',
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const desktopContains = categoryDropdownRef.current && categoryDropdownRef.current.contains(e.target as Node);
      const mobileContains = mobileCategoryDropdownRef.current && mobileCategoryDropdownRef.current.contains(e.target as Node);
      if (!desktopContains && !mobileContains) {
        setIsCategoryOpen(false);
      }
    };
    if (isCategoryOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isCategoryOpen]);

  // Об'єднана база контенту для наскрізного пошуку по фільмах, аніме, серіалах та дорамах
  const allSearchableMovies = useMemo(() => {
    const existing = new Set(movies.map(m => m.id));
    const extraDoramas = DORAMAS_LIST.filter(d => !existing.has(d.id));
    return [...movies, ...extraDoramas]
      .filter(m => !isCartoon(m))
      .map(m => sanitizeMovieGenres(m));
  }, [movies]);

  // Історія останніх пошукових запитів у localStorage
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('nova_recent_searches');
      return saved ? JSON.parse(saved) : ['Людина-павук', 'Дюна', 'Монолог травниці', 'Інтерстеллар'];
    } catch {
      return ['Людина-павук', 'Дюна', 'Монолог травниці', 'Інтерстеллар'];
    }
  });

  // Додавання нового пошукового запиту в історію
  useEffect(() => {
    if (searchQuery.trim().length >= 3) {
      const trimmed = searchQuery.trim();
      setRecentSearches(prev => {
        if (prev[0]?.toLowerCase() === trimmed.toLowerCase()) return prev;
        const updated = [trimmed, ...prev.filter(q => q.toLowerCase() !== trimmed.toLowerCase())].slice(0, 8);
        try {
          localStorage.setItem('nova_recent_searches', JSON.stringify(updated));
        } catch (e) {
          console.error(e);
        }
        return updated;
      });
    }
  }, [searchQuery]);

  const removeRecentSearch = (e: React.MouseEvent, queryToRemove: string) => {
    e.stopPropagation();
    setRecentSearches(prev => {
      const updated = prev.filter(q => q !== queryToRemove);
      try {
        localStorage.setItem('nova_recent_searches', JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
      return updated;
    });
  };

  const clearAllRecent = () => {
    setRecentSearches([]);
    try {
      localStorage.removeItem('nova_recent_searches');
    } catch (e) {
      console.error(e);
    }
  };

  // Category options including Collections ("Колекції") and Doramas ("Дорами")
  const categories = [
    { id: 'all', label: language === 'UA' ? 'Усе' : 'All' },
    { id: 'movies', label: language === 'UA' ? 'Фільми' : 'Movies' },
    { id: 'series', label: language === 'UA' ? 'Серіали' : 'TV Series' },
    { id: 'anime', label: language === 'UA' ? 'Аніме' : 'Anime' },
    { id: 'collections', label: language === 'UA' ? 'Колекції' : 'Collections' },
    { id: 'doramas', label: language === 'UA' ? 'Дорами' : 'Doramas' },
  ];

  // Popular searches matching Screenshot
  const popularSearches = [
    {
      id: 'apothecary-diaries',
      title: 'Монолог травниці',
      bgUrl: 'https://cdn.myanimelist.net/images/anime/1708/138033l.jpg',
      query: 'Монолог травниці'
    },
    {
      id: 'spiderman-brand-new-day',
      title: 'Людина-павук: Абсолютно новий день',
      bgUrl: 'https://image.tmdb.org/t/p/original/AeK2MPOpYrOOgZNfFnfwp0L8tNn.jpg',
      query: 'Людина-павук'
    },
    {
      id: 'explosive-kiss',
      title: 'Вибуховий поцілунок',
      bgUrl: '/posters/Rectangle 282.png',
      query: 'Вибуховий поцілунок'
    },
    {
      id: 'dune-part-two-2024',
      title: 'Дюна: Частина друга',
      bgUrl: 'https://image.tmdb.org/t/p/original/xOMo8BRK7PfcJv9JCnx7s5hj0PX.jpg',
      query: 'Дюна'
    },
    {
      id: 'stranger-things-s4',
      title: 'Дивні дива',
      bgUrl: 'https://image.tmdb.org/t/p/original/56v2KjBlU4XaOv9rVYEQypROD7P.jpg',
      query: 'Дивні дива'
    }
  ];

  // Curated collections Каталог from collectionsData
  const allCollections: CollectionItem[] = COLLECTIONS_DATA;

  // Динамічний carousel scroll Стан & checks
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = useCallback(() => {
    if (carouselRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = carouselRef.current;
      setCanScrollLeft(scrollLeft > 10);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  }, []);

  useEffect(() => {
    checkScroll();
    const el = carouselRef.current;
    if (el) {
      el.addEventListener('scroll', checkScroll, { passive: true });
      window.addEventListener('resize', checkScroll);
    }
    const t = setTimeout(checkScroll, 300);
    return () => {
      if (el) el.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
      clearTimeout(t);
    };
  }, [checkScroll, movies]);

  // Scroll "Рекомендовано для вас" carousel
  const scrollCarousel = (direction: 'left' | 'right') => {
    if (carouselRef.current) {
      const scrollAmount = Math.max(300, carouselRef.current.clientWidth * 0.85);
      carouselRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
      setTimeout(checkScroll, 80);
      setTimeout(checkScroll, 250);
      setTimeout(checkScroll, 500);
    }
  };

  // Click on popular Пошук item
  const handlePopularClick = (pop: typeof popularSearches[0]) => {
    setActiveCollection(null);
    const matchedReal = movies.find(m => 
      m.id === pop.id ||
      (m.title && m.title.toLowerCase().includes(pop.query.toLowerCase())) ||
      (m.titleEn && m.titleEn.toLowerCase().includes(pop.query.toLowerCase()))
    );

    if (matchedReal) {
      onSelectMovie(matchedReal);
    } else {
      setSearchQuery(pop.query);
    }
  };

  const selectedCatLabel = categories.find(c => c.id === selectedCategory)?.label || 'Усе';

  // Фільтрація Фільми into Категорії
  const queryLower = searchQuery.trim().toLowerCase();

  const isDoramaItem = (m: Movie) => {
    return (
      (m.id && m.id.includes('dorama')) ||
      (m.type as string) === 'dorama' ||
      Boolean(m.genres?.some(g => g && (g.toLowerCase().includes('дорам') || g.toLowerCase().includes('корейськ')))) ||
      Boolean((m as any).country?.toLowerCase().includes('корея')) ||
      DORAMAS_LIST.some(d => d.id === m.id)
    );
  };

  const matchingAllMovies = queryLower ? allSearchableMovies.filter(m => {
    return (
      (m.title && m.title.toLowerCase().includes(queryLower)) ||
      (m.titleEn && m.titleEn.toLowerCase().includes(queryLower)) ||
      (m.originalTitle && m.originalTitle.toLowerCase().includes(queryLower)) ||
      (m.genres && m.genres.some(g => g && g.toLowerCase().includes(queryLower))) ||
      (m.director && m.director.toLowerCase().includes(queryLower))
    );
  }) : [];

  const doramasResults = matchingAllMovies.filter(m => isDoramaItem(m));
  const animeResults = matchingAllMovies.filter(m => !isDoramaItem(m) && (m.genres?.includes('Аніме') || (m.type as string) === 'anime'));
  const moviesResults = matchingAllMovies.filter(m => !isDoramaItem(m) && m.type === 'movie' && !m.genres?.includes('Аніме'));
  const seriesResults = matchingAllMovies.filter(m => !isDoramaItem(m) && m.type === 'series' && !m.genres?.includes('Аніме'));

  // Collections matching query or За замовчуванням all if query is empty
  const collectionsResults = queryLower
    ? allCollections.filter(c => {
        const titleUa = (c.title || '').toLowerCase();
        const titleEn = (c.titleEn || '').toLowerCase();
        const queryFilter = (c.queryFilter || '').toLowerCase();
        const descUa = (c.description || '').toLowerCase();
        const descEn = (c.descriptionEn || '').toLowerCase();
        const idLower = (c.id || '').toLowerCase();

        // Specific universe matching
        if (titleUa.includes(queryLower) || (queryLower.length >= 3 && queryLower.includes(titleUa.replace(/всесвіт\s+/i, '')))) {
          return true;
        }
        if (titleEn && (titleEn.includes(queryLower) || (queryLower.length >= 3 && queryLower.includes(titleEn.replace(/universe/i, '').trim())))) {
          return true;
        }
        if (queryFilter && (queryFilter.includes(queryLower) || queryLower.includes(queryFilter))) {
          return true;
        }
        if (idLower.includes(queryLower) || (queryLower.length >= 3 && queryLower.includes(idLower.replace(/-universe/i, '')))) {
          return true;
        }
        if (descUa.includes(queryLower) || (descEn && descEn.includes(queryLower))) {
          return true;
        }
        return false;
      })
    : allCollections;

  // Render a Фільм Картка matching requested design with frosted glass and hover Опис expansion (Desktop)
  const renderMovieCard = (movie: Movie, customClass?: string) => {
    const titleText = language === 'ENG' ? (movie.titleEn || movie.originalTitle || movie.title) : movie.title;
    const ratingVal = typeof movie.rating === 'number' ? movie.rating.toFixed(1) : (movie.rating || '8.0');
    const descText = language === 'ENG' && movie.descriptionEn ? movie.descriptionEn : (movie.description || (language === 'UA' ? 'Захоплююча кіноісторія, сповнена несподіваних поворотів долі та незабутніх емоцій.' : 'A captivating cinematic story.'));

    return (
      <div
        key={movie.id}
        onClick={() => onSelectMovie(movie)}
        className={customClass || "group relative rounded-[16px] border border-white/10 sm:hover:border-transparent poster-hover-notif-border transition-all duration-300 ease-out cursor-pointer aspect-[2/3] bg-[#121212] shadow-xl sm:hover:shadow-[0_0_28px_rgba(255,48,64,0.35)] select-none"}
      >
        <div className="relative w-full h-full overflow-hidden bg-[#121212] rounded-[15px] flex flex-col justify-between">
          {/* 1. Основне чітке зображення постера */}
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

          {/* Floating Бейджі with Glass Effect */}
          {/* Рейтинг Бейдж Top-Left with Red Star */}
          <div 
            className="absolute top-3 left-3 text-white px-3 py-1 rounded-[10px] text-xs font-semibold flex items-center gap-1.5 z-30 transition-all pointer-events-none bg-black/50 backdrop-blur-md border border-white/15 shadow-sm group-hover:bg-white/10 group-hover:border-white/25 duration-300"
          >
            <Star className="w-3.5 h-3.5 fill-[#FF3040] text-[#FF3040] shrink-0" />
            <span className="text-white font-bold text-xs tracking-tight">{ratingVal}</span>
          </div>

          {/* Age Рейтинг Бейдж Top-Right with Glass Effect */}
          <div 
            className="absolute top-3 right-3 text-white px-3 py-1 rounded-[10px] text-xs font-semibold z-30 transition-all pointer-events-none flex items-center justify-center bg-black/50 backdrop-blur-md border border-white/15 shadow-sm group-hover:bg-white/10 group-hover:border-white/25 duration-300"
          >
            <span className="text-white font-bold text-xs tracking-tight">{movie.ageRating || '16+'}</span>
          </div>

          {/* Specular Glass Sheen Накладення (оверлей) */}
          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-white/15 pointer-events-none mix-blend-overlay z-15" />

          {/* Frosted Glass Bottom Panel with Backdrop Blur & Short Опис on Hover */}
          <div 
            className="absolute inset-x-0 bottom-0 z-20 flex flex-col justify-start p-3.5 sm:px-4 sm:pt-[22px] sm:pb-4 bg-gradient-to-t from-black/95 via-black/80 to-transparent backdrop-blur-[10px] pointer-events-none transition-all duration-300 ease-out"
          >
            <h4 className="font-sans font-bold text-white text-[15px] sm:text-[17px] leading-tight line-clamp-2 w-full sm:w-[239px] sm:max-w-full sm:h-[42px] text-left drop-shadow-md">
              {titleText}
            </h4>
            
            <div className="flex items-center text-[10.5px] sm:text-[11.5px] text-zinc-300 font-normal w-full whitespace-nowrap overflow-hidden font-sans text-left mt-1.5 sm:mt-[22px] drop-shadow-sm gap-1.5">
              {movie.genres?.slice(0, 2).map((genre, idx) => (
                <React.Fragment key={genre}>
                  {idx > 0 && <span className="w-1 h-1 rounded-full bg-[#FF3040] inline-block shrink-0" />}
                  <span className="text-zinc-300 truncate">{translateGenre(genre, language)}</span>
                </React.Fragment>
              ))}
              <span className="w-1 h-1 rounded-full bg-[#FF3040] inline-block shrink-0" />
              <span className="text-zinc-400 shrink-0">{movie.year}</span>
            </div>

            {/* Short Опис expansion on hover */}
            <div className="grid grid-rows-[0fr] group-hover:grid-rows-[1fr] transition-all duration-300 ease-out">
              <div className="overflow-hidden">
                <p className="text-xs sm:text-[12.5px] text-zinc-200/90 font-sans leading-relaxed line-clamp-4 mt-2.5 pt-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-75">
                  {descText}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Render a Фільм Картка matching screenshot (Mobile)
  const renderMobileMovieCard = (movie: Movie) => {
    const titleText = language === 'ENG' ? (movie.titleEn || movie.originalTitle || movie.title) : movie.title;
    const ratingVal = typeof movie.rating === 'number' ? movie.rating.toFixed(1) : (movie.rating || '8.0');

    return (
      <div
        key={movie.id}
        onClick={() => onSelectMovie(movie)}
        className="shrink-0 w-[104px] aspect-[104/146] group relative rounded-[4.78px] border-0 overflow-hidden bg-[#121212] shadow-xl select-none cursor-pointer active:scale-[0.98] transition-transform"
      >
        {/* Poster Image */}
        <img
          src={validatePosterUrl(movie.posterUrl, movie.title, movie.type, movie.genres)}
          alt={movie.title}
          className="w-full h-full object-cover"
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={(e) => handlePosterError(e, movie.posterUrl, movie.title, movie.type, movie.genres)}
        />

        {/* Side Vignette Накладення (оверлей) */}
        <div className="absolute inset-0 pointer-events-none z-10 bg-gradient-to-r from-black/40 via-transparent to-black/40" />

        {/* Top-Left Рейтинг Бейдж with Red Star */}
        <div className="absolute top-1.5 left-1.5 text-white px-1.5 py-0.5 rounded-[5px] text-[8px] font-bold flex items-center gap-1 z-30 pointer-events-none bg-black/60 backdrop-blur-md border border-white/15 shadow-sm">
          <Star className="w-2.5 h-2.5 fill-[#FF3040] text-[#FF3040] shrink-0" />
          <span className="text-white font-bold text-[8px] tracking-tight">{ratingVal}</span>
        </div>

        {/* Top-Right Age Рейтинг Бейдж */}
        <div className="absolute top-1.5 right-1.5 text-white px-1.5 py-0.5 rounded-[5px] text-[8px] font-bold z-30 pointer-events-none flex items-center justify-center bg-black/60 backdrop-blur-md border border-white/15 shadow-sm">
          <span className="text-white font-bold text-[8px] tracking-tight">{movie.ageRating || '16+'}</span>
        </div>

        {/* Frosted Glass Bottom Panel: 9px top padding, 9px margin, 5px side padding */}
        <div className="absolute inset-x-0 bottom-0 z-20 flex flex-col justify-start pt-[9px] pb-[8px] px-[5px] bg-gradient-to-t from-black/95 via-black/80 to-transparent backdrop-blur-[8px] pointer-events-none">
          <h4 className="font-sans font-bold text-white text-[8px] leading-tight line-clamp-2 break-words w-full text-left drop-shadow-md">
            {titleText}
          </h4>

          <div className="flex items-center text-[6px] text-zinc-300 font-normal w-full whitespace-nowrap overflow-hidden font-sans text-left mt-[9px] gap-1">
            {movie.genres?.slice(0, 2).map((genre, idx) => (
              <React.Fragment key={genre}>
                {idx > 0 && <span className="w-0.5 h-0.5 rounded-full bg-[#FF3040] inline-block shrink-0" />}
                <span className="text-zinc-300 truncate">{translateGenre(genre, language)}</span>
              </React.Fragment>
            ))}
            <span className="w-0.5 h-0.5 rounded-full bg-[#FF3040] inline-block shrink-0" />
            <span className="text-zinc-400 shrink-0">{movie.year}</span>
          </div>
        </div>
      </div>
    );
  };

  const renderCollectionCard = (col: CollectionItem) => (
    <div
      key={col.id}
      onClick={() => setActiveCollection(col)}
      style={{ width: '100%', maxWidth: '262.32px', height: '292.87px', aspectRatio: '262.32 / 292.87' }}
      className="group relative rounded-2xl overflow-hidden border border-white/10 hover:border-white/30 transition-all duration-300 cursor-pointer bg-[#151515] shadow-xl hover:shadow-[0_0_24px_rgba(255,48,64,0.3)] flex flex-col justify-end p-4 select-none"
    >
      <img
        src={col.posterUrl || col.bgUrl}
        alt={col.title}
        className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        referrerPolicy="no-referrer"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/20" />
      <div className="relative z-10 space-y-1">
        <h4 className="font-bold text-white text-sm sm:text-base leading-tight group-hover:text-[#FF3040] transition-colors">
          {language === 'ENG' && col.titleEn ? col.titleEn : col.title}
        </h4>
        <p className="text-[11px] text-zinc-400 font-medium">
          {language === 'ENG' && col.countTextEn ? col.countTextEn : col.countText}
        </p>
      </div>
    </div>
  );

  if (activeCollection) {
    return (
      <CollectionView
        collection={activeCollection}
        movies={movies}
        onBack={() => setActiveCollection(null)}
        onSelectMovie={onSelectMovie}
        onPlayMovie={onPlayMovie}
      />
    );
  }

  return (
    <div className="w-full max-w-[1430px] mx-auto py-4 md:py-6 space-y-5 md:space-y-8 animate-fade-in select-none">
      {/* Mobile Пошук Bar directly on page matching screenshot */}
      <div className="relative md:hidden w-full">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={language === 'UA' ? 'Пошук фільмів, серіалів, аніме..' : 'Search movies, TV shows, anime..'}
          className="w-full h-11 pl-10 pr-9 text-xs text-[#FAFAFA] bg-[#000000] border border-white/20 rounded-[12px] placeholder-zinc-400 focus:outline-none focus:border-white/60 transition-all font-sans"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-zinc-400 hover:text-white cursor-pointer"
          >
            ✕
          </button>
        )}
      </div>

      {/* 1. Category Filter Dropdown Pill (Усе / All) */}
      <div ref={categoryDropdownRef} className="relative inline-block z-30">
        <button
          onClick={() => setIsCategoryOpen(!isCategoryOpen)}
          className={`cinema-filter-pill ${isCategoryOpen ? 'invisible pointer-events-none' : ''}`}
        >
          <span className="relative z-10">{selectedCatLabel}</span>
          <ChevronDown className="w-4 h-4 relative z-10 text-zinc-400" />
        </button>

        {isCategoryOpen && (
          <div style={capsuleGlassStyle} className="cinema-filter-capsule left-0 animate-in fade-in zoom-in-95 duration-150">
            <button
              onClick={() => setIsCategoryOpen(false)}
              className="cinema-capsule-header"
            >
              <span className="relative z-20">{selectedCatLabel}</span>
              <ChevronUp className="w-4 h-4 relative z-20 text-white" />
            </button>

            <div className="cinema-capsule-list custom-scrollbar">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => {
                    setSelectedCategory(cat.id as any);
                    setIsCategoryOpen(false);
                  }}
                  className={`cinema-capsule-item ${selectedCategory === cat.id ? 'item-active' : ''}`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* If 'collections' category selected without query, display all collections directly */}
      {selectedCategory === 'collections' && queryLower.length === 0 && (
        <section className="space-y-4 pt-2 animate-fade-in">
          <h2 className="text-white font-bold font-display text-xl tracking-wide">
            {language === 'UA' ? 'Усі тематичні колекції' : 'All Collections'}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {allCollections.map((col) => (
              <div
                key={col.id}
                onClick={() => setActiveCollection(col)}
                style={{ width: '100%', maxWidth: '262.32px', height: '292.87px', aspectRatio: '262.32 / 292.87' }}
                className="group relative rounded-2xl overflow-hidden border border-white/10 hover:border-white/30 transition-all duration-300 cursor-pointer bg-[#151515] shadow-xl hover:shadow-[0_0_24px_rgba(255,48,64,0.3)] flex flex-col justify-end p-4 select-none"
              >
                <img
                  src={col.posterUrl || col.bgUrl}
                  alt={col.title}
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/60 to-black/20" />
                <div className="relative z-10 space-y-1">
                  <h4 className="font-bold text-white text-base sm:text-lg leading-tight group-hover:text-[#FF3040] transition-colors drop-shadow-md">
                    {language === 'ENG' && col.titleEn ? col.titleEn : col.title}
                  </h4>
                  <p className="text-xs text-zinc-300 font-medium">
                    {language === 'ENG' && col.countTextEn ? col.countTextEn : col.countText}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 2. "Популярні пошуки" Row */}
      <section className="space-y-3">
        <h2 className="text-white font-bold font-display text-sm md:text-base lg:text-lg tracking-wide">
          {language === 'UA' ? 'Популярні пошуки' : 'Popular Searches'}
        </h2>

        {/* Desktop Сітка: 100% original code */}
        <div className="hidden md:grid md:grid-cols-5 gap-4">
          {popularSearches.map((pop) => {
            const realMovie = movies.find(m => 
              m.id === pop.id || 
              (m.title && m.title.toLowerCase().includes(pop.query.toLowerCase()))
            );

            const displayImage = pop.id === 'apothecary-diaries'
              ? 'https://cdn.myanimelist.net/images/anime/1708/138033l.jpg'
              : (realMovie?.backdropUrl || realMovie?.posterUrl || pop.bgUrl);
              
            const displayTitle = realMovie?.title || pop.title;

            return (
              <div
                key={pop.id}
                onClick={() => handlePopularClick(pop)}
                className="relative h-[88px] sm:h-[94px] rounded-2xl overflow-hidden border border-[#2A2A2A] hover:border-white/20 cursor-pointer shadow-xl bg-[#0F0F0F] flex items-center select-none"
              >
                <img
                  src={displayImage}
                  alt={displayTitle}
                  className="absolute inset-0 w-full h-full object-cover object-left"
                  referrerPolicy="no-referrer"
                />

                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-black/10 to-black/40" />

                <div className="absolute right-0 top-0 bottom-0 w-[58%] backdrop-blur-[3px] bg-black/40 border-l border-white/10 flex items-center justify-center p-3 text-center">
                  <span className="text-white font-bold text-xs sm:text-sm leading-snug line-clamp-3 drop-shadow-[0_2px_6px_rgba(0,0,0,0.95)]">
                    {displayTitle}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Mobile Horizontal Scrollable Рядок: matches screenshot */}
        <div className="md:hidden flex gap-2.5 overflow-x-auto scrollbar-none pb-1">
          {popularSearches.map((pop) => {
            const realMovie = movies.find(m => 
              m.id === pop.id || 
              (m.title && m.title.toLowerCase().includes(pop.query.toLowerCase()))
            );

            const displayImage = pop.id === 'apothecary-diaries'
              ? 'https://cdn.myanimelist.net/images/anime/1708/138033l.jpg'
              : (realMovie?.backdropUrl || realMovie?.posterUrl || pop.bgUrl);
              
            const displayTitle = realMovie?.title || pop.title;

            return (
              <div
                key={pop.id}
                onClick={() => handlePopularClick(pop)}
                className="shrink-0 w-[115px] h-[44px] rounded-[8px] overflow-hidden border border-[#2A2A2A] hover:border-white/20 cursor-pointer shadow-md bg-[#0F0F0F] flex items-center select-none relative"
              >
                <img
                  src={displayImage}
                  alt={displayTitle}
                  className="w-[42%] h-full object-cover object-left"
                  referrerPolicy="no-referrer"
                />

                <div className="w-[58%] h-full backdrop-blur-[3px] bg-black/50 border-l border-white/10 flex items-center justify-center p-1 text-center">
                  <span className="text-white font-bold text-[8px] leading-tight line-clamp-3">
                    {displayTitle}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 2.5 Recent Searches & Trending Tags (when query is empty, лише для ПК matching screenshot where mobile does not show it) */}
      {queryLower.length === 0 && (
        <div className="hidden md:block space-y-6 pt-2">
          {/* Recent Searches */}
          {recentSearches.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-white font-bold text-sm sm:text-base">
                  <Clock className="w-4 h-4 text-[#FF3040]" />
                  <span>{language === 'UA' ? 'Останні пошуки' : 'Recent Searches'}</span>
                </div>
                <button
                  onClick={clearAllRecent}
                  className="text-xs text-zinc-500 hover:text-[#FF3040] transition-colors cursor-pointer flex items-center gap-1 font-medium"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{language === 'UA' ? 'Очистити все' : 'Clear all'}</span>
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                {recentSearches.map((item) => (
                  <button
                    key={item}
                    onClick={() => setSearchQuery(item)}
                    className="group flex items-center gap-2 px-3.5 py-1.5 bg-[#181818] border border-[#2A2A2A] hover:border-[#FF3040] hover:bg-[#222222] rounded-[8px] text-xs text-zinc-300 hover:text-white transition-all cursor-pointer shadow-sm"
                  >
                    <Clock className="w-3 h-3 text-zinc-500 group-hover:text-[#FF3040] transition-colors" />
                    <span>{item}</span>
                    <span
                      onClick={(e) => removeRecentSearch(e, item)}
                      className="text-zinc-500 hover:text-white p-0.5 rounded-full hover:bg-zinc-800 transition-colors"
                      title={language === 'UA' ? 'Видалити' : 'Remove'}
                    >
                      <X className="w-3 h-3" />
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. Пошук Активний RESULTS VIEW */}
      {queryLower.length > 0 && (
        <section className="space-y-4 pt-1">
          {/* Main Пошук Results Заголовок */}
          <h2 className="text-white font-bold font-display text-lg sm:text-2xl tracking-wide">
            {language === 'UA' ? 'Результати для :' : 'Results for:'} <span className="text-white">"{searchQuery}"</span>
          </h2>

          {/* When selectedCategory is 'all' */}
          {selectedCategory === 'all' && (
            <div className="space-y-6 pt-1">
              {doramasResults.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-white font-bold text-base md:text-lg">{language === 'UA' ? 'Дорами' : 'Doramas'}</h3>
                  {/* Desktop Сітка */}
                  <div className="hidden md:grid md:grid-cols-4 lg:grid-cols-5 gap-4 lg:gap-5 xl:gap-[30px]">
                    {doramasResults.map((m) => renderMovieCard(m))}
                  </div>
                  {/* Mobile Сітка */}
                  <div className="grid grid-cols-3 gap-2.5 md:hidden">
                    {doramasResults.map((m) => renderMobileMovieCard(m))}
                  </div>
                </div>
              )}

              {moviesResults.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-white font-bold text-base md:text-lg">{language === 'UA' ? 'Фільми' : 'Movies'}</h3>
                  {/* Desktop Сітка */}
                  <div className="hidden md:grid md:grid-cols-4 lg:grid-cols-5 gap-4 lg:gap-5 xl:gap-[30px]">
                    {moviesResults.map((m) => renderMovieCard(m))}
                  </div>
                  {/* Mobile Сітка */}
                  <div className="grid grid-cols-3 gap-2.5 md:hidden">
                    {moviesResults.map((m) => renderMobileMovieCard(m))}
                  </div>
                </div>
              )}

              {seriesResults.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-white font-bold text-base md:text-lg">{language === 'UA' ? 'Серіали' : 'TV Series'}</h3>
                  {/* Desktop Сітка */}
                  <div className="hidden md:grid md:grid-cols-4 lg:grid-cols-5 gap-4 lg:gap-5 xl:gap-[30px]">
                    {seriesResults.map((m) => renderMovieCard(m))}
                  </div>
                  {/* Mobile Сітка */}
                  <div className="grid grid-cols-3 gap-2.5 md:hidden">
                    {seriesResults.map((m) => renderMobileMovieCard(m))}
                  </div>
                </div>
              )}

              {animeResults.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-white font-bold text-base md:text-lg">{language === 'UA' ? 'Аніме' : 'Anime'}</h3>
                  {/* Desktop Сітка */}
                  <div className="hidden md:grid md:grid-cols-4 lg:grid-cols-5 gap-4 lg:gap-5 xl:gap-[30px]">
                    {animeResults.map((m) => renderMovieCard(m))}
                  </div>
                  {/* Mobile Сітка */}
                  <div className="grid grid-cols-3 gap-2.5 md:hidden">
                    {animeResults.map((m) => renderMobileMovieCard(m))}
                  </div>
                </div>
              )}

              {collectionsResults.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-white font-bold text-base md:text-lg">{language === 'UA' ? 'Колекції' : 'Collections'}</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 lg:gap-5 xl:gap-[30px]">
                    {collectionsResults.map((col) => renderCollectionCard(col))}
                  </div>
                </div>
              )}

              {doramasResults.length === 0 && moviesResults.length === 0 && seriesResults.length === 0 && animeResults.length === 0 && collectionsResults.length === 0 && (
                <p className="text-xs sm:text-sm text-zinc-400 font-normal pt-1">
                  {language === 'UA' ? 'По вашому запиту нічого не знайдено' : 'Nothing found for your request'}
                </p>
              )}
            </div>
          )}

          {/* When selectedCategory is 'anime' */}
          {selectedCategory === 'anime' && (
            <div className="space-y-2 pt-1">
              <h3 className="text-white font-bold text-base sm:text-lg">{language === 'UA' ? 'Аніме' : 'Anime'}</h3>
              {animeResults.length > 0 ? (
                <>
                  <div className="hidden md:grid md:grid-cols-4 lg:grid-cols-5 gap-4 lg:gap-5 xl:gap-[30px] pt-1">
                    {animeResults.map((m) => renderMovieCard(m))}
                  </div>
                  <div className="grid grid-cols-3 gap-2.5 md:hidden pt-1">
                    {animeResults.map((m) => renderMobileMovieCard(m))}
                  </div>
                </>
              ) : (
                <p className="text-xs sm:text-sm text-zinc-400 font-normal pt-1">
                  {language === 'UA' ? 'По вашому запиту нічого не знайдено' : 'Nothing found for your request'}
                </p>
              )}
            </div>
          )}

          {/* When selectedCategory is 'Фільми' */}
          {selectedCategory === 'movies' && (
            <div className="space-y-2 pt-1">
              <h3 className="text-white font-bold text-base sm:text-lg">{language === 'UA' ? 'Фільми' : 'Movies'}</h3>
              {moviesResults.length > 0 ? (
                <>
                  <div className="hidden md:grid md:grid-cols-4 lg:grid-cols-5 gap-4 lg:gap-5 xl:gap-[30px] pt-1">
                    {moviesResults.map((m) => renderMovieCard(m))}
                  </div>
                  <div className="grid grid-cols-3 gap-2.5 md:hidden pt-1">
                    {moviesResults.map((m) => renderMobileMovieCard(m))}
                  </div>
                </>
              ) : (
                <p className="text-xs sm:text-sm text-zinc-400 font-normal pt-1">
                  {language === 'UA' ? 'По вашому запиту нічого не знайдено' : 'Nothing found for your request'}
                </p>
              )}
            </div>
          )}

          {/* When selectedCategory is 'Серіал' */}
          {selectedCategory === 'series' && (
            <div className="space-y-2 pt-1">
              <h3 className="text-white font-bold text-base sm:text-lg">{language === 'UA' ? 'Серіали' : 'TV Series'}</h3>
              {seriesResults.length > 0 ? (
                <>
                  <div className="hidden md:grid md:grid-cols-4 lg:grid-cols-5 gap-4 lg:gap-5 xl:gap-[30px] pt-1">
                    {seriesResults.map((m) => renderMovieCard(m))}
                  </div>
                  <div className="grid grid-cols-3 gap-2.5 md:hidden pt-1">
                    {seriesResults.map((m) => renderMobileMovieCard(m))}
                  </div>
                </>
              ) : (
                <p className="text-xs sm:text-sm text-zinc-400 font-normal pt-1">
                  {language === 'UA' ? 'По вашому запиту нічого не знайдено' : 'Nothing found for your request'}
                </p>
              )}
            </div>
          )}

          {/* When selectedCategory is 'doramas' */}
          {selectedCategory === 'doramas' && (
            <div className="space-y-2 pt-1">
              <h3 className="text-white font-bold text-base sm:text-lg">{language === 'UA' ? 'Дорами' : 'Doramas'}</h3>
              {doramasResults.length > 0 ? (
                <>
                  <div className="hidden md:grid md:grid-cols-4 lg:grid-cols-5 gap-4 lg:gap-5 xl:gap-[30px] pt-1">
                    {doramasResults.map((m) => renderMovieCard(m))}
                  </div>
                  <div className="grid grid-cols-3 gap-2.5 md:hidden pt-1">
                    {doramasResults.map((m) => renderMobileMovieCard(m))}
                  </div>
                </>
              ) : (
                <p className="text-xs sm:text-sm text-zinc-400 font-normal pt-1">
                  {language === 'UA' ? 'По вашому запиту нічого не знайдено' : 'Nothing found for your request'}
                </p>
              )}
            </div>
          )}

          {/* When selectedCategory is 'collections' */}
          {selectedCategory === 'collections' && (
            <div className="space-y-2 pt-1">
              <h3 className="text-white font-bold text-base sm:text-lg">{language === 'UA' ? 'Колекції' : 'Collections'}</h3>
              {collectionsResults.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 lg:gap-5 xl:gap-[30px] pt-1">
                  {collectionsResults.map((col) => renderCollectionCard(col))}
                </div>
              ) : (
                <p className="text-xs sm:text-sm text-zinc-400 font-normal pt-1">
                  {language === 'UA' ? 'По вашому запиту нічого не знайдено' : 'Nothing found for your request'}
                </p>
              )}
            </div>
          )}
        </section>
      )}

      {/* 4. "Рекомендовано для вас" Section (Visible when query is empty) */}
      {queryLower.length === 0 && (
        <section className="space-y-3 md:space-y-4 relative">
          <h2 className="text-white font-bold font-display text-base md:text-xl tracking-wide">
            {language === 'UA' ? 'Рекомендовано для вас' : 'Recommended for You'}
          </h2>

          {/* Desktop Version: Original carousel with large Кнопки and 5 Картки per page */}
          <div className="hidden md:block relative group/carousel">
            {/* Left Scroll Arrow: larger and extends beyond posters */}
            {canScrollLeft && (
              <button
                type="button"
                onClick={() => scrollCarousel('left')}
                className="absolute -left-3 sm:-left-6 lg:-left-7 top-1/2 -translate-y-1/2 z-40 w-12 h-12 sm:w-16 sm:h-16 md:w-[78px] md:h-[78px] rounded-full text-white flex items-center justify-center transition-transform duration-150 hover:scale-105 active:scale-95 shadow-[0_8px_30px_rgba(0,0,0,0.7)] cursor-pointer border-0 border-none outline-none ring-0 select-none"
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

            {/* Right Scroll Arrow: larger and extends beyond posters */}
            {canScrollRight && (
              <button
                type="button"
                onClick={() => scrollCarousel('right')}
                className="absolute -right-3 sm:-right-6 lg:-right-7 top-1/2 -translate-y-1/2 z-40 w-12 h-12 sm:w-16 sm:h-16 md:w-[78px] md:h-[78px] rounded-full text-white flex items-center justify-center transition-transform duration-150 hover:scale-105 active:scale-95 shadow-[0_8px_30px_rgba(0,0,0,0.7)] cursor-pointer border-0 border-none outline-none ring-0 select-none"
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

            {/* Single horizontal carousel Рядок showing exactly 5 Картки */}
            <div
              ref={carouselRef}
              className="flex gap-4 overflow-x-auto scrollbar-none py-1 scroll-smooth snap-x snap-mandatory"
            >
              {movies.map((movie) => 
                renderMovieCard(
                  movie,
                  "shrink-0 w-[calc((100%-64px)/5)] min-w-[170px] snap-start group relative rounded-[16px] border border-white/10 sm:hover:border-transparent poster-hover-notif-border transition-all duration-300 ease-out cursor-pointer aspect-[2/3] bg-[#121212] shadow-xl sm:hover:shadow-[0_0_28px_rgba(255,48,64,0.35)] select-none"
                )
              )}
            </div>
          </div>

          {/* Mobile Version: Horizontal scroll Рядок matching screenshot (~3.2 Картки visible) */}
          <div className="md:hidden flex gap-2.5 overflow-x-auto scrollbar-none pb-2">
            {movies.map((movie) => renderMobileMovieCard(movie))}
          </div>
        </section>
      )}
    </div>
  );
}
