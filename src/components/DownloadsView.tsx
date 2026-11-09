import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Play, Trash2, ChevronDown, ChevronUp, RotateCcw
} from 'lucide-react';
import { DownloadItem, Movie } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { translateGenre } from '../lib/translations';

const capsuleGlassStyle: React.CSSProperties = {
  backdropFilter: 'blur(24px) saturate(190%)',
  WebkitBackdropFilter: 'blur(24px) saturate(190%)',
  backgroundColor: 'rgba(18, 18, 24, 0.65)',
};

const GENRES_OPTIONS = ['all', 'Фантастика', 'Фентезі', 'Бойовик', 'Екшн', 'Пригоди', 'Кримінальний', 'Трилер', 'Драма'];
const YEARS_OPTIONS = ['all', '2026', '2024', '2023', '2011'];
const RATINGS_OPTIONS = ['all', '9+', '8+', '7+'];
const LANG_OPTIONS = ['all', 'Українська', 'English'];

interface DownloadsViewProps {
  downloads: DownloadItem[];
  onPlayMovie: (movie: Movie) => void;
  onSelectMovie: (movie: Movie) => void;
  onRemoveDownload: (id: string) => void;
  onTogglePauseDownload: (id: string) => void;
  onClearAllDownloads: () => void;
  allMovies: Movie[];
  onNavigateToCatalog: () => void;
  embedded?: boolean;
}

export default function DownloadsView({
  downloads,
  onPlayMovie,
  onSelectMovie,
  onRemoveDownload,
  onTogglePauseDownload,
  onClearAllDownloads,
  allMovies,
  onNavigateToCatalog,
  embedded = false
}: DownloadsViewProps) {
  const { language } = useLanguage();

  // Стани випадаючих меню фільтрації контенту
  const [selectedGenre, setSelectedGenre] = useState<string>('all');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedRating, setSelectedRating] = useState<string>('all');
  const [selectedLang, setSelectedLang] = useState<string>('all');

  const [openDropdown, setOpenDropdown] = useState<'genre' | 'year' | 'rating' | 'lang' | null>(null);

  // Закриття меню фільтрів при кліку за їх межами
  const dropdownRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenDropdown(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Відфільтрований список завантажень за критеріями
  const filteredDownloads = useMemo(() => {
    return downloads.filter(item => {
      // 1. Жанр Фільтрація
      if (selectedGenre !== 'all') {
        const itemGenres = item.genres || [];
        const matchGenre = itemGenres.some(g => {
          const translated = translateGenre(g, 'UA').toLowerCase();
          const sel = selectedGenre.toLowerCase();
          return translated.includes(sel) || sel.includes(translated) ||
            (sel === 'наукова фантастика' && (translated.includes('фантастика') || translated.includes('sci-fi'))) ||
            (sel === 'дорами' && ((item.type as string) === 'dorama' || translated.includes('дорам')));
        });
        if (!matchGenre) return false;
      }

      // 2. Year Фільтрація
      if (selectedYear !== 'all') {
        if (item.year?.toString() !== selectedYear) return false;
      }

      // 3. Рейтинг Фільтрація
      if (selectedRating !== 'all') {
        const minRating = selectedRating === '9+' ? 9.0 : selectedRating === '8+' ? 8.0 : 7.0;
        if ((item.rating || 0) < minRating) return false;
      }

      // 4. Language Фільтрація
      if (selectedLang !== 'all') {
        if (selectedLang === 'Українська') {
          // За замовчуванням available
        } else if (selectedLang === 'English') {
          if (!item.titleEn) return false;
        }
      }

      return true;
    });
  }, [downloads, selectedGenre, selectedYear, selectedRating, selectedLang]);

  // Допоміжна функція to find Фільм object for playback
  const handlePlayDownload = (item: DownloadItem) => {
    const foundMovie = allMovies.find(m => m.id === item.movieId || m.title.toLowerCase() === item.title.toLowerCase());
    if (foundMovie) {
      onPlayMovie(foundMovie);
    } else {
      const syntheticMovie: Movie = {
        id: item.movieId,
        title: item.title,
        titleEn: item.titleEn,
        type: item.type || 'movie',
        year: item.year || 2024,
        rating: item.rating || 8.0,
        ratingVotesCount: '10K',
        ageRating: item.ageRating || '16+',
        description: item.title,
        posterUrl: item.posterUrl,
        backdropUrl: item.backdropUrl || item.posterUrl,
        genres: item.genres || ['Фільми'],
        videoUrl: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
        duration: '2 год',
        viewsCount: 10000
      };
      onPlayMovie(syntheticMovie);
    }
  };

  // Format GB number (e.g., "1,75" in UA or "1.75" in EN)
  const formatGB = (val: number) => {
    return language === 'UA' ? val.toFixed(2).replace('.', ',') : val.toFixed(2);
  };

  // Format Швидкість (e.g., "8,4" in UA or "8.4" in EN)
  const formatSpeed = (val: number) => {
    return language === 'UA' ? val.toFixed(1).replace('.', ',') : val.toFixed(1);
  };

  // Render individual Картка matching WatchHistoryView Картка design exactly
  const renderCard = (item: DownloadItem) => {
    const isCompleted = item.progress >= 100 || item.status === 'completed';
    const isPaused = item.status === 'paused';
    const foundMovie = allMovies.find(m => m.id === item.movieId);

    // Determine if it is a Серіал or Фільм
    const isSeriesOrAnime = item.type === 'series' || item.type === 'anime' || item.type === 'dorama' || foundMovie?.type === 'series' || foundMovie?.type === 'anime' || foundMovie?.type === 'dorama';
    let seasonLabel = '';
    if (isSeriesOrAnime) {
      if (item.episodeInfo) {
        // Extract season from episodeInfo, e.g. "1 сезон 6 серія" -> "1 сезон" or "Сезон 1"
        const sMatch = item.episodeInfo.match(/(\d+)\s*сезон/i) || item.episodeInfo.match(/сезон\s*(\d+)/i) || item.episodeInfo.match(/season\s*(\d+)/i);
        if (sMatch) {
          seasonLabel = language === 'UA' ? `${sMatch[1]} сезон` : `Season ${sMatch[1]}`;
        } else {
          seasonLabel = item.episodeInfo;
        }
      } else {
        seasonLabel = language === 'UA' ? '1 сезон' : 'Season 1';
      }
    }

    const backdropSrc = item.backdropUrl || foundMovie?.backdropUrl || item.posterUrl || foundMovie?.posterUrl || 'https://image.tmdb.org/t/p/original/xOMo8BRK7PfcJv9JCnx7s5hj0PX.jpg';

    return (
      <div key={item.id} className="w-full">
        {/* Mobile Картка Layout (exact w360 h44 px, Кнопки w26 h22) */}
        <div 
          style={{ backgroundColor: '#000000' }}
          className="md:hidden w-[360px] max-w-full h-[44px] mx-auto rounded-[8px] border border-white/10 flex items-center justify-between overflow-hidden shadow-md select-none group"
        >
          {/* Left: Thumbnail & Info */}
          <div className="flex items-center h-full min-w-0 flex-1">
            {/* Thumbnail: w-[94px] h-[44px] flush with left edge */}
            <div 
              onClick={() => {
                if (foundMovie) onSelectMovie(foundMovie);
                else handlePlayDownload(item);
              }}
              className="w-[94px] h-[44px] shrink-0 overflow-hidden relative cursor-pointer bg-zinc-900 rounded-l-[8px]"
            >
              <img 
                src={backdropSrc} 
                alt={item.title} 
                className="w-full h-full object-cover" 
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = 'https://image.tmdb.org/t/p/original/xOMo8BRK7PfcJv9JCnx7s5hj0PX.jpg';
                }}
              />
              {/* Fade gradient on right edge */}
              <div 
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: 'linear-gradient(to right, rgba(0, 0, 0, 0) 60%, #000000 100%)'
                }}
              />
            </div>

            {/* Info & Progress Колонка */}
            <div className="flex-1 min-w-0 px-2 py-0.5 flex flex-col justify-center h-full">
              {/* Top Рядок: Заголовок + Серія Info */}
              <div className="flex items-center gap-1.5 min-w-0 leading-tight">
                <span 
                  onClick={() => {
                    if (foundMovie) onSelectMovie(foundMovie);
                    else handlePlayDownload(item);
                  }}
                  className="font-bold text-white text-[10px] tracking-tight truncate cursor-pointer hover:text-[#FF4D5C] transition-colors"
                >
                  {language === 'ENG' && item.titleEn ? item.titleEn : item.title}
                </span>
                {(item.episodeInfo || seasonLabel) && (
                  <span className="text-[8px] text-zinc-400 font-sans font-medium truncate shrink-0">
                    {item.episodeInfo || seasonLabel}
                  </span>
                )}
              </div>

              {/* Middle Рядок: Size & Швидкість */}
              <div className="flex items-center justify-between text-[7.5px] text-zinc-400 font-sans leading-none mt-0.5">
                <span className="truncate">
                  {formatGB(item.downloadedSizeGB)} {language === 'UA' ? 'ГБ із' : 'GB of'} {formatGB(item.totalSizeGB)} {language === 'UA' ? 'ГБ' : 'GB'}
                </span>
                <span className="shrink-0 font-sans ml-1">
                  {isCompleted ? (
                    <span>{formatSpeed(item.downloadSpeedMBs)} {language === 'UA' ? 'Мб/с' : 'MB/s'}</span>
                  ) : isPaused ? (
                    <span className="text-zinc-400">{language === 'UA' ? 'Призупинено' : 'Paused'}</span>
                  ) : (
                    <span>{formatSpeed(item.downloadSpeedMBs)} {language === 'UA' ? 'Мб/с' : 'MB/s'}</span>
                  )}
                </span>
              </div>

              {/* Bottom Рядок: Progress bar & % */}
              <div className="flex items-center gap-1.5 w-full mt-0.5">
                <div className="flex-1 bg-[#1b1922] h-[2px] rounded-full overflow-hidden relative">
                  <div 
                    className="h-full rounded-full transition-all duration-300"
                    style={{ 
                      width: `${Math.min(100, Math.max(0, item.progress))}%`, 
                      backgroundColor: '#FF3040' 
                    }}
                  />
                </div>
                <span className="text-[7.5px] font-mono text-zinc-300 font-semibold shrink-0">
                  {Math.round(item.progress)}%
                </span>
              </div>
            </div>
          </div>

          {/* Right Action Кнопки */}
          <div className="shrink-0 flex items-center gap-2 pr-2.5">
            {isCompleted ? (
              <>
                {/* Watch Кнопка: w26 h22 red rounded Кнопка */}
                <button
                  type="button"
                  onClick={() => handlePlayDownload(item)}
                  className="w-[26px] h-[22px] rounded-[5px] bg-[#FF3040] hover:bg-[#ff4251] text-white flex items-center justify-center transition-transform active:scale-95 cursor-pointer shadow-sm shrink-0"
                  title={language === 'UA' ? 'Дивитися' : 'Watch'}
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="2" />
                    <polygon points="10,8 16,12 10,16" fill="white" />
                  </svg>
                </button>

                {/* Trash Видалення Кнопка */}
                <button
                  type="button"
                  onClick={() => onRemoveDownload(item.id)}
                  className="p-1 text-zinc-400 hover:text-white transition-colors cursor-pointer shrink-0"
                  title={language === 'UA' ? 'Видалити' : 'Delete'}
                >
                  <Trash2 className="w-3.5 h-3.5 text-zinc-400 hover:text-white" />
                </button>
              </>
            ) : (
              <>
                {/* Pause / Resume Кнопка: w26 h22 red rounded Кнопка */}
                <button
                  type="button"
                  onClick={() => onTogglePauseDownload(item.id)}
                  className="w-[26px] h-[22px] rounded-[5px] bg-[#FF3040] hover:bg-[#ff4251] text-white flex items-center justify-center transition-transform active:scale-95 cursor-pointer shadow-sm shrink-0"
                  title={isPaused ? (language === 'UA' ? 'Продовжити' : 'Resume') : (language === 'UA' ? 'Призупинити' : 'Pause')}
                >
                  {isPaused ? (
                    <Play className="w-2.5 h-2.5 fill-white text-white ml-0.5" />
                  ) : (
                    <div className="flex items-center gap-[2px]">
                      <span className="w-[2px] h-[9px] bg-white rounded-xs" />
                      <span className="w-[2px] h-[9px] bg-white rounded-xs" />
                    </div>
                  )}
                </button>

                {/* Cancel Кнопка: w26 h22 red rounded Кнопка with white X */}
                <button
                  type="button"
                  onClick={() => onRemoveDownload(item.id)}
                  className="w-[26px] h-[22px] rounded-[5px] bg-[#FF3040] hover:bg-[#ff4251] text-white flex items-center justify-center transition-transform active:scale-95 cursor-pointer shadow-sm shrink-0"
                  title={language === 'UA' ? 'Скасувати завантаження' : 'Cancel download'}
                >
                  <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Desktop Layout (Preserved 100%) */}
        <div 
          style={{ backgroundColor: '#000000' }}
          className="hidden md:flex rounded-[20px] transition-all duration-300 flex-row items-center justify-between gap-4 md:gap-6 group shadow-2xl relative overflow-hidden border border-white/10 hover:border-white/20 select-none"
        >
          {/* Left: Flush Thumbnail & Details */}
          <div className="flex flex-row items-center gap-4 sm:gap-6 min-w-0 flex-1">
            {/* Backdrop Image - Flush with left edge */}
            <div 
              onClick={() => {
                if (foundMovie) onSelectMovie(foundMovie);
                else handlePlayDownload(item);
              }}
              className="relative w-[180px] sm:w-[280px] md:w-[330px] lg:w-[380px] aspect-[16/9] overflow-hidden shrink-0 bg-black/80 cursor-pointer shadow-xl rounded-l-[20px]"
            >
              <img 
                src={backdropSrc} 
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
            <div className="flex-1 min-w-0 py-3 sm:py-4 flex flex-col justify-center">
              {/* Заголовок & Якість Бейдж */}
              <div className="flex items-center gap-2.5 flex-wrap">
                <h3 
                  onClick={() => {
                    if (foundMovie) onSelectMovie(foundMovie);
                    else handlePlayDownload(item);
                  }}
                  className="font-bold text-white text-base sm:text-xl lg:text-2xl tracking-tight truncate cursor-pointer hover:text-[#FF4D5C] transition-colors leading-tight"
                >
                  {language === 'ENG' && item.titleEn ? item.titleEn : item.title}
                </h3>
                {item.quality && (
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold font-mono tracking-wider bg-[#FF3040]/15 text-[#FF3040] border border-[#FF3040]/40 shadow-[0_0_8px_rgba(255,48,64,0.25)] shrink-0">
                    {item.quality}
                  </span>
                )}
              </div>

              {/* Сезон Рядок: reserved 20px slot with exact 20px margin from Заголовок, keeping the progress bar at the exact same horizontal & vertical level across all Картки whether Серіал or Фільм */}
              <div className="h-5 flex items-center mt-2 sm:mt-[20px]">
                {seasonLabel ? (
                  <span className="text-xs sm:text-sm text-zinc-300 font-sans font-medium leading-none">
                    {seasonLabel}
                  </span>
                ) : null}
              </div>

              {/* Download info & Progress Bar Контейнер - identical spacing whether download just started or completed */}
              <div className="w-full max-w-2xl mt-3 sm:mt-[27px]">
                {/* Progress Labels: Size & Status / Progress % ABOVE the line */}
                <div className="flex items-center justify-between text-xs text-white font-sans">
                  <div className="flex items-center gap-2">
                    <span className="text-white font-medium">
                      {formatGB(item.downloadedSizeGB)} {language === 'UA' ? 'ГБ із' : 'GB of'} {formatGB(item.totalSizeGB)} {language === 'UA' ? 'ГБ' : 'GB'}
                    </span>
                    <span className="text-[#FF4D5C]">•</span>
                    <span>
                      {isCompleted ? (
                        <span className="text-white font-medium">
                          {language === 'UA' ? 'Завершено' : 'Completed'}
                        </span>
                      ) : isPaused ? (
                        <span className="text-white font-medium">
                          {language === 'UA' ? 'Призупинено' : 'Paused'}
                        </span>
                      ) : (
                        <span className="text-white font-medium">
                          {formatSpeed(item.downloadSpeedMBs)} {language === 'UA' ? 'Мб/с' : 'MB/s'}
                        </span>
                      )}
                    </span>
                  </div>
                  <span className="font-bold text-white font-mono">{Math.round(item.progress)}%</span>
                </div>

                {/* Progress Bar Контейнер: 15px distance from text to line */}
                <div className="w-full bg-[#1b1922] h-1.5 rounded-full overflow-hidden relative mt-2 sm:mt-[15px]">
                  <div 
                    className="h-full rounded-full transition-all duration-500 shadow-[0_0_10px_rgba(242,46,61,0.8)]" 
                    style={{ 
                      width: `${Math.min(100, Math.max(0, item.progress))}%`, 
                      backgroundColor: '#F22E3D' 
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right: Action Кнопки with Watch Кнопка + Видалення Кнопка - fixed width on desktop for consistent layout */}
          <div className="shrink-0 flex items-center justify-end p-3 sm:p-4 md:pr-6 md:py-4 md:w-[220px] gap-2.5 sm:gap-3">
            {isCompleted ? (
              <div className="flex items-center gap-3 justify-end">
                {/* Watch Action Кнопка with journey-cta-btn styling & animation */}
                <button
                  onClick={() => handlePlayDownload(item)}
                  className="journey-cta-btn border-2 border-transparent hover:border-white/80 active:border-transparent text-white px-6 sm:px-7 h-[39px] rounded-[10px] font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all transform hover:scale-102 active:scale-98 hover:shadow-[0_0_24px_rgba(255,255,255,0.3),0_10px_25px_rgba(215,40,53,0.35)] shadow-lg shadow-[#FF4D5C]/25 cursor-pointer select-none"
                >
                  <Play className="w-4 h-4 fill-white translate-x-0.5" />
                  <span>{language === 'UA' ? 'Дивитися' : 'Watch'}</span>
                </button>

                {/* Trash Видалення Кнопка matching height */}
                <button
                  onClick={() => onRemoveDownload(item.id)}
                  className="h-[39px] w-[39px] rounded-[10px] flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
                  title={language === 'UA' ? 'Видалити' : 'Delete'}
                >
                  <Trash2 className="w-5 h-5 text-zinc-400 hover:text-white transition-colors" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3 justify-end">
                {/* Pause / Resume Кнопка with journey-cta-btn styling & animations */}
                <button
                  onClick={() => onTogglePauseDownload(item.id)}
                  className="journey-cta-btn border-2 border-transparent hover:border-white/80 active:border-transparent text-white h-[39px] w-[39px] rounded-[10px] flex items-center justify-center transition-all transform hover:scale-102 active:scale-98 hover:shadow-[0_0_24px_rgba(255,255,255,0.3),0_10px_25px_rgba(215,40,53,0.35)] shadow-lg shadow-[#FF4D5C]/25 cursor-pointer select-none shrink-0"
                  title={isPaused ? (language === 'UA' ? 'Продовжити' : 'Resume') : (language === 'UA' ? 'Призупинити' : 'Pause')}
                >
                  {isPaused ? (
                    <Play className="w-4 h-4 fill-white text-white ml-0.5" />
                  ) : (
                    <div className="flex items-center gap-0.5">
                      <span className="w-1 h-3.5 bg-white rounded-xs" />
                      <span className="w-1 h-3.5 bg-white rounded-xs" />
                    </div>
                  )}
                </button>

                {/* Cancel Download Кнопка: identical journey-cta-btn style with Закриття.png */}
                <button
                  onClick={() => onRemoveDownload(item.id)}
                  className="journey-cta-btn border-2 border-transparent hover:border-white/80 active:border-transparent text-white h-[39px] w-[39px] rounded-[10px] flex items-center justify-center transition-all transform hover:scale-102 active:scale-98 hover:shadow-[0_0_24px_rgba(255,255,255,0.3),0_10px_25px_rgba(215,40,53,0.35)] shadow-lg shadow-[#FF4D5C]/25 cursor-pointer select-none shrink-0"
                  title={language === 'UA' ? 'Скасувати завантаження' : 'Cancel download'}
                >
                  <img 
                    src="/icons/Close.png" 
                    alt={language === 'UA' ? 'Скасувати' : 'Cancel'} 
                    className="w-[24px] h-[24px] object-contain drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]" 
                  />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={`w-full font-sans text-white ${embedded ? 'pt-2 pb-8' : 'min-h-[75vh] flex flex-col justify-start'}`}>
      <div className={`${embedded ? 'w-full' : 'w-full max-w-[360px] md:max-w-[1430px] mx-auto'} space-y-4 md:space-y-8 animate-fade-in flex-1 flex flex-col justify-start ${filteredDownloads.length === 0 ? 'pb-52 sm:pb-72 md:pb-96' : 'pb-12'}`}>
        {/* Top Шапка сайту Section */}
        <div className="space-y-3 md:space-y-4 pb-2">
          {/* Top Заголовок Section */}
          <div className="space-y-1">
            <h1 
              style={{ fontFamily: "'Montserrat Alternates', sans-serif" }}
              className="text-xl sm:text-3xl lg:text-4xl font-semibold tracking-tight text-white"
            >
              {language === 'UA' ? 'Завантажене' : 'Downloads'}
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 font-sans">
              {language === 'UA' 
                ? 'Завантажуйте улюблений контент і дивіться його будь-де — навіть без інтернету.' 
                : 'Download your favorite content and watch it anywhere — even offline.'}
            </p>
          </div>

          {/* Mobile "Очистити фільтр" aligned right above filter pills */}
          {downloads.length > 0 && (
            <div className="flex justify-end mb-1 md:hidden max-w-[360px] mx-auto w-full">
              <button
                type="button"
                onClick={onClearAllDownloads}
                className="flex items-center gap-1.5 text-[11px] text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                <span>{language === 'UA' ? 'Очистити фільтр' : 'Clear filter'}</span>
                <Trash2 className="w-3.5 h-3.5 text-zinc-400" />
              </button>
            </div>
          )}

          {/* Under Заголовок: Фільтрація Кнопки Рядок & Clear Завантаження on desktop */}
          <div ref={dropdownRef} className="flex flex-wrap items-center justify-between gap-2 sm:gap-4 relative z-50 min-h-[36px] max-w-[360px] md:max-w-none mx-auto w-full">
            <div className="flex items-center justify-between sm:justify-start gap-1.5 sm:gap-4 w-full sm:w-auto">
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
                      {GENRES_OPTIONS.map(g => (
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
                      {YEARS_OPTIONS.map(y => (
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
                      {RATINGS_OPTIONS.map(r => (
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
                      {LANG_OPTIONS.map(l => (
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

            {/* Clear Завантаження Кнопка centered with the Фільтрація pills (desktop only) */}
            {downloads.length > 0 && (
              <button
                type="button"
                onClick={onClearAllDownloads}
                className="hidden md:flex h-10 px-2 items-center justify-center gap-2 shrink-0 self-center my-auto text-zinc-400 hover:text-white text-xs sm:text-sm font-medium transition-colors cursor-pointer select-none"
              >
                <Trash2 className="w-4 h-4 text-zinc-400 group-hover:text-white shrink-0" />
                <span className="leading-none whitespace-nowrap">{language === 'UA' ? 'Очистити завантаження' : 'Clear downloads'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Завантаження Список */}
        {filteredDownloads.length > 0 ? (
          <div className="space-y-2 md:space-y-4 w-full">
            {filteredDownloads.map(renderCard)}
          </div>
        ) : (
          /* Empty State styled directly matching WatchHistoryView */
          <div className="pt-1 pb-16 flex-1 space-y-4">
            <p className="text-xs sm:text-sm text-zinc-400 font-normal font-sans">
              {language === 'UA'
                ? "У вас немає завантажень. Тут з'являться фільми та серіали, завантажені для перегляду офлайн."
                : "You have no downloads. Movies and series downloaded for offline viewing will appear here."}
            </p>
            <button
              onClick={onNavigateToCatalog}
              className="px-6 py-2.5 bg-gradient-to-b from-[#FF4D5C] to-[#D72835] hover:opacity-95 text-white text-xs font-bold rounded-full transition-all shadow-lg shadow-[#FF4D5C]/20 cursor-pointer"
            >
              {language === 'UA' ? 'Перейти до каталогу' : 'Browse Catalog'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
