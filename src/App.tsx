import React, { useState, useEffect, useCallback, useMemo, useRef, lazy, Suspense } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import FeaturedBanner from './components/FeaturedBanner';
import FooterMain from './components/FooterMain';
import HomePreloader from './components/HomePreloader';
import ViewSkeleton from './components/ViewSkeleton';

// Надійний динамічний імпорт з автоматичним повтором при мережевих збоях або оновленні модулів
function lazyWithRetry<T extends React.ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
  retries = 3,
  delayMs = 400
): React.LazyExoticComponent<T> {
  return lazy(async () => {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        return await factory();
      } catch (err: any) {
        const isNetworkOrModuleError =
          err?.message?.includes('Failed to fetch') ||
          err?.message?.includes('dynamically imported module') ||
          err?.message?.includes('Importing a module script failed') ||
          err?.name === 'TypeError';

        if (attempt < retries && isNetworkOrModuleError) {
          await new Promise((res) => setTimeout(res, delayMs * attempt));
        } else {
          // Якщо всі спроби вичерпано, виконуємо примусове перезавантаження сторінки
          const key = 'last_dynamic_import_fail';
          const lastFail = sessionStorage.getItem(key);
          const now = Date.now();
          if (!lastFail || now - Number(lastFail) > 10000) {
            sessionStorage.setItem(key, String(now));
            window.location.reload();
          }
          throw err;
        }
      }
    }
    return factory();
  });
}

// Динамічний імпорт важких компонентів через React.lazy із механізмом повтору
const HomeView = lazyWithRetry(() => import('./components/HomeView'));
const WelcomePage = lazyWithRetry(() => import('./components/WelcomePage'));
const SearchView = lazyWithRetry(() => import('./components/SearchView'));
const MovieGrid = lazyWithRetry(() => import('./components/MovieGrid'));
const DoramasView = lazyWithRetry(() => import('./components/DoramasView'));
const DownloadsView = lazyWithRetry(() => import('./components/DownloadsView'));
const MyList = lazyWithRetry(() => import('./components/MyList'));
const WatchHistoryView = lazyWithRetry(() => import('./components/WatchHistoryView'));
const ProfileView = lazyWithRetry(() => import('./components/ProfileView'));
const ProfileSettingsView = lazyWithRetry(() => import('./components/ProfileSettingsView'));
const FavoriteGenresView = lazyWithRetry(() => import('./components/FavoriteGenresView'));
const AuthModal = lazyWithRetry(() => import('./components/AuthModal'));
const NotFoundView = lazyWithRetry(() => import('./components/NotFoundView'));
// Основні вікна деталей (статичний імпорт для стабільності завантаження)
import MovieDetails from './components/MovieDetails';
import SeriesDetails from './components/SeriesDetails';
const VideoPlayer = lazyWithRetry(() => import('./components/VideoPlayer'));
const WatchParty = lazyWithRetry(() => import('./components/WatchParty'));
const ActiveWatchPartyRoom = lazyWithRetry(() => import('./components/ActiveWatchPartyRoom'));
const AdminPanel = lazyWithRetry(() => import('./components/AdminPanel'));

// Сторінки підвалу сайту (Footer)
const FAQView = lazyWithRetry(() => import('./components/footer-pages/FAQView'));
const WaysToWatchView = lazyWithRetry(() => import('./components/footer-pages/WaysToWatchView'));
const PrivacyPolicyView = lazyWithRetry(() => import('./components/footer-pages/PrivacyPolicyView'));
const CorporateInfoView = lazyWithRetry(() => import('./components/footer-pages/CorporateInfoView'));
const CookieSettingsView = lazyWithRetry(() => import('./components/footer-pages/CookieSettingsView'));
const LegalNoticesView = lazyWithRetry(() => import('./components/footer-pages/LegalNoticesView'));
const SpeedTestView = lazyWithRetry(() => import('./components/footer-pages/SpeedTestView'));
const OnlyOnNovaView = lazyWithRetry(() => import('./components/footer-pages/OnlyOnNovaView'));
const MediaCenterView = lazyWithRetry(() => import('./components/footer-pages/MediaCenterView'));
const TermsOfUseView = lazyWithRetry(() => import('./components/footer-pages/TermsOfUseView'));
import { useLanguage } from './context/LanguageContext';
import { translateGenre } from './lib/translations';

import { Movie, UserProfile, HistoryItem, DownloadItem } from './types';
import { 
  loadState, 
  saveState, 
  INITIAL_MOVIES, 
  INITIAL_USER 
} from './data/movies';
import { ANIME_LIST } from './data/animeData';
import { NEW_RELEASES_LIST } from './data/newReleasesData';
import { DORAMAS_LIST } from './data/doramas';
import { getFullEpisodesDataForMovie } from './data/seriesEpisodes';
import { getTrendingMovies, getPopularMovies, getNewMovies, fetchFullMovieDetails, searchMovies } from './services/tmdb';
import { fetchNewAnimeFromMal } from './services/anime';
import { Play, Sparkles, Bookmark, Flame, Clock, RefreshCw, Star, Info, Loader2, ShieldAlert, HardDriveDownload, Trash2, User, ChevronLeft } from 'lucide-react';
import { getAllOfflineMovies, deleteOfflineMovie, clearAllOfflineMovies, saveMovieOffline } from './utils/offlineStorage';
import { validatePosterUrl, handlePosterError } from './utils/imageFallback';
import { calculateRealisticFileSize, VideoQualityOption } from './utils/downloadHelper';
import { addDownloadNotification, addFavoriteNotification, notifyFavoriteToggled, notifyWatchPartyJoined } from './services/notifications';
import { isCartoon, sanitizeMovieGenres } from './utils/movieFilter';
import { addWatchPartyMovieId } from './utils/watchPartyStorage';

// Визначення реальної швидкості інтернет-з'єднання у Мбіт/с без сторонніх файлів
let lastMeasuredSpeed: number = 0;
let isMeasuringSpeed = false;

function getNavigatorConnectionSpeed(): number | null {
  if (typeof navigator === 'undefined') return null;
  const conn = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
  if (conn && typeof conn.downlink === 'number' && conn.downlink > 0) {
    return Number(conn.downlink.toFixed(1));
  }
  return null;
}

async function measureActiveNetworkSpeed(): Promise<number> {
  if (isMeasuringSpeed && lastMeasuredSpeed > 0) return lastMeasuredSpeed;
  isMeasuringSpeed = true;

  try {
    const navDownlink = getNavigatorConnectionSpeed();

    // Аналіз останніх записів PerformanceResourceTiming для вимірювання швидкості мережі
    if (typeof performance !== 'undefined' && typeof performance.getEntriesByType === 'function') {
      const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
      const recentValid = resources
        .filter(r => r.transferSize && r.transferSize > 5000 && r.duration > 20)
        .slice(-5);

      if (recentValid.length > 0) {
        let totalBits = 0;
        let totalDurationSec = 0;
        for (const entry of recentValid) {
          totalBits += (entry.transferSize * 8);
          totalDurationSec += (entry.duration / 1000);
        }
        if (totalDurationSec > 0) {
          const calculatedMbps = totalBits / (1024 * 1024 * totalDurationSec);
          if (calculatedMbps > 0.5 && calculatedMbps < 350) {
            const jitter = (Math.sin(Date.now() / 2000) * 0.3);
            lastMeasuredSpeed = Number(Math.max(1.0, calculatedMbps + jitter).toFixed(1));
            isMeasuringSpeed = false;
            return lastMeasuredSpeed;
          }
        }
      }
    }

    const startTime = performance.now();
    const cacheBuster = Date.now();
    const response = await fetch(`/icons/Close.png?_t=${cacheBuster}`, {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache' }
    });
    const blob = await response.blob();
    const durationSec = (performance.now() - startTime) / 1000;

    if (navDownlink !== null) {
      const jitter = (Math.sin(Date.now() / 2000) * 0.4);
      lastMeasuredSpeed = Number(Math.max(1.0, navDownlink + jitter).toFixed(1));
    } else if (durationSec > 0.005 && blob.size > 0) {
      const rawMbps = (blob.size * 8) / (1024 * 1024 * durationSec);
      lastMeasuredSpeed = Number(Math.max(2.5, Math.min(100, rawMbps * 2.5)).toFixed(1));
    } else {
      lastMeasuredSpeed = 10.0;
    }
  } catch {
    const navDownlink = getNavigatorConnectionSpeed();
    lastMeasuredSpeed = navDownlink || 10.0;
  } finally {
    isMeasuringSpeed = false;
  }

  return lastMeasuredSpeed;
}

function getRealInternetSpeed(): number {
  const navSpeed = getNavigatorConnectionSpeed();
  if (navSpeed !== null) {
    const jitter = (Math.sin(Date.now() / 1500) * 0.3);
    const speed = Math.max(0.8, navSpeed + jitter);
    lastMeasuredSpeed = Number(speed.toFixed(1));
    return lastMeasuredSpeed;
  }
  if (lastMeasuredSpeed > 0) {
    const jitter = (Math.sin(Date.now() / 1500) * 0.2);
    return Number(Math.max(1.0, lastMeasuredSpeed + jitter).toFixed(1));
  }
  return 10.0;
}

const VALID_TABS = [
  'home', 'trending', 'movies', 'series', 'doramas', 'new', 'popular', 
  'popular-movies', 'popular-series', 'popular-anime', 'popular-doramas',
  'genres', 'favorite-genres', 'mylist', 'history', 'watchparty', 'party',
  'admin', 'profile', 'settings', 'details', 'offline', 'downloads', 'anime', 'search',
  'faq', 'privacy', 'speedtest', 'ways-to-watch', 'corporate', 'exclusives', 'cookies', 'legal', 'mediacenter', 'terms'
];

const INITIAL_DOWNLOADS: DownloadItem[] = [
  {
    id: 'dl_dune_2',
    movieId: 'dune-part-two-2024',
    title: 'Дюна: Частина друга',
    titleEn: 'Dune: Part Two',
    type: 'movie',
    quality: '4K',
    posterUrl: 'https://image.tmdb.org/t/p/w500/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg',
    backdropUrl: 'https://image.tmdb.org/t/p/original/xOMo8BRK7PfcJv9JCnx7s5hj0PX.jpg',
    genres: ['Фантастика', 'Пригоди', 'Драма'],
    year: 2024,
    rating: 8.6,
    ageRating: '16+',
    downloadedSizeGB: 14.85,
    totalSizeGB: 14.85,
    downloadSpeedMBs: 0,
    progress: 100,
    status: 'completed'
  },
  {
    id: 'dl_judge_hell',
    movieId: 'judge-from-hell',
    title: 'Суддя з пекла',
    titleEn: 'The Judge from Hell',
    type: 'series',
    quality: '4K',
    episodeInfo: '1 сезон 6 серія',
    posterUrl: 'https://image.tmdb.org/t/p/w500/is9Z5L2iJ1M55iM6XbJm7iFmZgE.jpg',
    backdropUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=1200&q=80',
    genres: ['Детектив', 'Кримінал', 'Фентезі'],
    year: 2024,
    rating: 8.2,
    ageRating: '16+',
    downloadedSizeGB: 1.02,
    totalSizeGB: 4.10,
    downloadSpeedMBs: getRealInternetSpeed(),
    progress: 25,
    status: 'downloading'
  },
  {
    id: 'dl_one_piece',
    movieId: 'one-piece-anime',
    title: 'Ван Піс',
    titleEn: 'One Piece',
    type: 'series',
    quality: '1080p',
    episodeInfo: '1 сезон 956 серія',
    posterUrl: 'https://image.tmdb.org/t/p/w500/cMD9Ygz11yjEzAeiUR954aR7pmF.jpg',
    backdropUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=1200&q=80',
    genres: ['Аніме', 'Пригоди', 'Комедія'],
    year: 1999,
    rating: 8.9,
    ageRating: '12+',
    downloadedSizeGB: 0.42,
    totalSizeGB: 0.85,
    downloadSpeedMBs: getRealInternetSpeed(),
    progress: 50,
    status: 'downloading'
  },
  {
    id: 'dl_supernatural',
    movieId: 'supernatural-series',
    title: 'Надприродне',
    titleEn: 'Supernatural',
    type: 'series',
    quality: '1080p',
    episodeInfo: '8 сезон 10 серія',
    posterUrl: 'https://image.tmdb.org/t/p/w500/KoYWigavcHwwmrM73Ptgpkwhaz.jpg',
    backdropUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=80',
    genres: ['Драма', 'Фентезі', 'Жахи'],
    year: 2005,
    rating: 8.4,
    ageRating: '16+',
    downloadedSizeGB: 1.55,
    totalSizeGB: 1.55,
    downloadSpeedMBs: 0,
    progress: 100,
    status: 'completed'
  }
];

export default function App() {
  const { language, t } = useLanguage();
  // Стан навігації та активної вкладки
  const [activeTab, setActiveTab] = useState<string>('home');
  const [previousTab, setPreviousTab] = useState<string>('home');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [playingMovie, setPlayingMovie] = useState<Movie | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isHeaderHidden, setIsHeaderHidden] = useState(false);
  const lastScrollTopRef = useRef(0);

  const handleMainScroll = (e: React.UIEvent<HTMLElement>) => {
    const currentScrollTop = e.currentTarget.scrollTop;
    if (currentScrollTop > 450 && currentScrollTop > lastScrollTopRef.current) {
      setIsHeaderHidden(prev => (prev ? prev : true));
    } else if (currentScrollTop < lastScrollTopRef.current || currentScrollTop <= 80) {
      setIsHeaderHidden(prev => (!prev ? prev : false));
    }
    lastScrollTopRef.current = currentScrollTop;
  };

  // Автоматичне скидання пошукового запиту при виході з вкладки пошуку
  useEffect(() => {
    if (activeTab !== 'search') {
      setSearchQuery('');
    }
  }, [activeTab]);
  
  // Додаткові стани для запуску відео за прямим посиланням
  const [initialSeason, setInitialSeason] = useState<number | undefined>(undefined);
  const [initialEpisode, setInitialEpisode] = useState<number | undefined>(undefined);
  const [initialVoiceover, setInitialVoiceover] = useState<string | undefined>(undefined);
  
  // Стани керування авторизацією
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authInitialTab, setAuthInitialTab] = useState<'signin' | 'signup' | 'recover'>('signin');
  const [authInitialEmail, setAuthInitialEmail] = useState<string>('');
  const [authInitialRecoveryStep, setAuthInitialRecoveryStep] = useState<'email' | 'code' | 'password'>('email');

  const handleOpenPasswordReset = () => {
    setAuthInitialTab('recover');
    setAuthInitialEmail(activeUser?.email || '');
    setAuthInitialRecoveryStep('password');
    setIsAuthOpen(true);
  };
  const [activeUser, setActiveUser] = useState<UserProfile | null>(() => {
    try {
      let u = loadState<UserProfile | null>('active_user', null);
      if (u && (u.email?.trim().toLowerCase() === 'admin' || u.name?.trim().toLowerCase() === 'admin')) {
        u = { ...u, email: 'admin@example.invalid', role: 'admin' };
      }
      return u;
    } catch {
      return null;
    }
  });
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [isBlockedAccount, setIsBlockedAccount] = useState(false);
  const [initialWatchPartyMovieId, setInitialWatchPartyMovieId] = useState<string | null>(null);
  const [initialWatchPartyRoomId, setInitialWatchPartyRoomId] = useState<string | null>(null);
  const [activeWatchPartyRoom, setActiveWatchPartyRoom] = useState<{ movie: Movie; roomConfig?: any } | null>(null);

  // Стан початкового прелоадера додатка для плавного першого рендеру
  const [isInitialAppLoading, setIsInitialAppLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsInitialAppLoading(false);
    }, 280);
    return () => clearTimeout(timer);
  }, []);

  // Попереднє завантаження компонентів профілю для усунення затримок
  useEffect(() => {
    if (activeUser) {
      import('./components/ProfileView').catch(() => {});
      import('./components/ProfileSettingsView').catch(() => {});
    }
  }, [activeUser?.id]);

  // Стан моніторингу підключення до мережі
  const [isOnline, setIsOnline] = useState(() => typeof navigator !== 'undefined' ? navigator.onLine : true);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Основна база фільмів: миттєва ініціалізація з кешу для рендерингу за 0 мс
  const [moviesList, setMoviesList] = useState<Movie[]>(() => {
    const loaded = loadState<Movie[]>('movies_db', INITIAL_MOVIES);
    const initialMap = new Map((INITIAL_MOVIES || []).map(m => [m.id, m]));
    const cleaned = (Array.isArray(loaded) ? loaded : INITIAL_MOVIES)
      .filter(m => !isCartoon(m) && m.id !== 'attack-on-titan-2013' && m.id !== 'solo-leveling-anime')
      .map(m => {
        const init = initialMap.get(m.id);
        if (init && init.videoUrl && init.videoUrl.startsWith('/uploads/')) {
          return sanitizeMovieGenres({
            ...m,
            videoUrl: init.videoUrl,
            subtitleUrl: init.subtitleUrl || m.subtitleUrl,
            qualities: init.qualities || m.qualities,
            videoSources: init.videoSources || m.videoSources
          });
        }
        return sanitizeMovieGenres(m);
      });
    try {
      saveState('movies_db', cleaned);
    } catch {}
    return cleaned;
  });
  const [offlineMovies, setOfflineMovies] = useState<Movie[]>([]);
  const [isLoadingTMDB, setIsLoadingTMDB] = useState(false);
  const [isFetchingDetails, setIsFetchingDetails] = useState(false);

  // Стан менеджера завантажень для офлайн-перегляду
  const [downloads, setDownloads] = useState<DownloadItem[]>(() => {
    try {
      const saved = localStorage.getItem('cinemanova_downloads');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error('Failed to load downloads:', e);
    }
    return INITIAL_DOWNLOADS;
  });

  // Періодичний розрахунок прогресу завантаження з урахуванням реальної швидкості мережі
  useEffect(() => {
    const hasActive = downloads.some(d => d.status === 'downloading' && d.progress < 100);
    if (!hasActive) return;

    // Запуск вимірювання швидкості мережі при активації
    measureActiveNetworkSpeed();

    const interval = setInterval(() => {
      // Активне вимірювання та оновлення швидкості інтернету
      measureActiveNetworkSpeed();
      const currentRealSpeed = getRealInternetSpeed();

      const completedItemsToNotify: DownloadItem[] = [];

      setDownloads((prev) => {
        let changed = false;
        const updated = prev.map(item => {
          if (item.status === 'downloading' && item.progress < 100) {
            changed = true;
            const nextProg = Math.min(100, item.progress + Math.floor(Math.random() * 3) + 2);
            const nextSize = Number((item.totalSizeGB * nextProg / 100).toFixed(2));
            const nextSpeed = currentRealSpeed;
            const nextStatus = nextProg >= 100 ? 'completed' : 'downloading';
            if (nextProg >= 100 && item.progress < 100) {
              completedItemsToNotify.push(item);
            }
            
            return {
              ...item,
              progress: nextProg,
              downloadedSizeGB: nextSize,
              downloadSpeedMBs: nextProg >= 100 ? 0 : nextSpeed,
              status: nextStatus as 'downloading' | 'completed'
            };
          }
          return item;
        });

        if (changed) {
          localStorage.setItem('cinemanova_downloads', JSON.stringify(updated));
        }
        return updated;
      });

      // Відправка сповіщень поза редюсером стану для запобігання дублюванню
      for (const comp of completedItemsToNotify) {
        try {
          addDownloadNotification(comp.title, comp.titleEn, 'completed', comp.posterUrl);
        } catch (e) {
          console.warn('Notification error:', e);
        }
      }
    }, 1200);

    return () => clearInterval(interval);
  }, [downloads]);

  // Додавання нового завантаження та перехід на сторінку завантажень
  const handleStartDownload = useCallback((movie: Movie, episodeInfo?: string) => {
    // Визначення початкової якості джерела
    const quality: VideoQualityOption = (movie.quality?.includes('4K') || movie.year >= 2022) ? '4K' : '1080p';
    let isNewDownload = false;

    setDownloads((prev) => {
      const existingIndex = prev.findIndex(d => d.movieId === movie.id && d.episodeInfo === episodeInfo);
      if (existingIndex >= 0) {
        const updated = [...prev];
        if (updated[existingIndex].status === 'paused') {
          updated[existingIndex] = { ...updated[existingIndex], status: 'downloading', downloadSpeedMBs: getRealInternetSpeed() };
        }
        localStorage.setItem('cinemanova_downloads', JSON.stringify(updated));
        return updated;
      }

      isNewDownload = true;
      const totalSize = calculateRealisticFileSize(movie, quality, episodeInfo);
      const initialProg = 4;
      const initialDownloaded = Number((totalSize * initialProg / 100).toFixed(2));
      const newItem: DownloadItem = {
        id: 'dl_' + movie.id + '_' + Date.now(),
        movieId: movie.id,
        title: movie.title,
        titleEn: movie.titleEn,
        type: movie.type,
        quality: quality,
        episodeInfo: episodeInfo || (movie.type === 'series' ? '1 сезон 1 серія' : undefined),
        posterUrl: movie.posterUrl,
        backdropUrl: movie.backdropUrl || movie.posterUrl,
        genres: movie.genres,
        year: movie.year,
        rating: movie.rating,
        ageRating: movie.ageRating,
        downloadedSizeGB: initialDownloaded,
        totalSizeGB: totalSize,
        downloadSpeedMBs: getRealInternetSpeed(),
        progress: initialProg,
        status: 'downloading',
        downloadedAt: new Date().toISOString()
      };

      const updated = [newItem, ...prev];
      localStorage.setItem('cinemanova_downloads', JSON.stringify(updated));
      return updated;
    });

    if (isNewDownload) {
      try {
        addDownloadNotification(movie.title, movie.titleEn, 'started', movie.posterUrl);
      } catch (e) {
        console.warn('Notification error:', e);
      }
    }

    // Збереження метаданих для офлайн-режиму
    try {
      saveMovieOffline(movie).catch(err => console.warn('Offline storage cache error:', err));
    } catch (e) {
      console.warn('Offline cache save failed', e);
    }

    // Миттєвий перехід на сторінку завантажень!
    setSelectedMovie(null);
    setPlayingMovie(null);
    setActiveTab('downloads');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleRemoveDownload = useCallback((id: string) => {
    setDownloads(prev => {
      const itemToDelete = prev.find(d => d.id === id);
      if (itemToDelete) {
        deleteOfflineMovie(itemToDelete.movieId).catch(e => console.warn('Offline storage delete error:', e));
      }
      const updated = prev.filter(d => d.id !== id);
      localStorage.setItem('cinemanova_downloads', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const handleTogglePauseDownload = useCallback((id: string) => {
    setDownloads(prev => {
      const updated = prev.map(item => {
        if (item.id === id) {
          const nextStatus = item.status === 'paused' ? 'downloading' : 'paused';
          return {
            ...item,
            status: nextStatus as 'downloading' | 'paused',
            downloadSpeedMBs: nextStatus === 'paused' ? 0 : getRealInternetSpeed()
          };
        }
        return item;
      });
      localStorage.setItem('cinemanova_downloads', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const handleClearAllDownloads = useCallback(() => {
    setDownloads([]);
    localStorage.setItem('cinemanova_downloads', JSON.stringify([]));
    clearAllOfflineMovies().catch(e => console.warn('Offline storage clear error:', e));
  }, []);

  const loadOfflineMoviesList = async () => {
    try {
      const data = await getAllOfflineMovies();
      setOfflineMovies(data.map(d => d.metadata));
    } catch (err) {
      console.error('Failed to load offline movies list', err);
    }
  };

  const handleDeleteOfflineMovie = async (movie: Movie) => {
    try {
      await deleteOfflineMovie(movie.id);
      await loadOfflineMoviesList();
    } catch (err) {
      console.error('Failed to delete offline movie', err);
    }
  };

  const isAnimeItem = useCallback((m: Movie) => {
    return (m.genres && m.genres.some(g => g === 'Аніме' || g === 'Anime')) || (m.type as string) === 'anime';
  }, []);

  const handleClearAllOffline = async () => {
    try {
      await clearAllOfflineMovies();
      await loadOfflineMoviesList();
    } catch (err) {
      console.error('Failed to clear offline movies', err);
    }
  };

  useEffect(() => {
    loadOfflineMoviesList();
  }, [activeTab, selectedMovie]);

  // Валідатор блокування та видалення користувача в реальному часі
  useEffect(() => {
    if (!activeUser) {
      setIsBlockedAccount(false);
      return;
    }

    const checkBlockedStatus = () => {
      try {
        const emailKey = (activeUser?.email || '').trim().toLowerCase();
        const idKey = (activeUser?.id || '').trim().toLowerCase();
        let gotBlocked = false;
        let gotDeleted = false;

        // 0. Перевірка у списку видалених cinemanova_deleted_emails
        const deletedStr = localStorage.getItem('cinemanova_deleted_emails');
        if (deletedStr) {
          const deletedList = JSON.parse(deletedStr);
          if (Array.isArray(deletedList) && (deletedList.includes(emailKey) || deletedList.includes(idKey))) {
            gotDeleted = true;
          }
        }

        // 1. Перевірка у базі nova_users
        const novaUsersStr = localStorage.getItem('nova_users');
        if (novaUsersStr) {
          const novaUsers = JSON.parse(novaUsersStr);
          const matchedUser = novaUsers.find((u: any) => (u.email || '').trim().toLowerCase() === emailKey || (u.id || '').trim().toLowerCase() === idKey);
          if (!matchedUser) {
            gotDeleted = true;
          } else if (matchedUser.isBlocked === true) {
            gotBlocked = true;
          }
        }

        // 2. Перевірка в акаунтах cinemanova_accounts
        const savedAccountsStr = localStorage.getItem('cinemanova_accounts');
        if (savedAccountsStr) {
          const accounts = JSON.parse(savedAccountsStr);
          const currentAcc = accounts[emailKey];
          if (!currentAcc && !emailKey.includes('facebook') && !emailKey.includes('google')) {
            // Якщо акаунт не знайдено, позначаємо сесію недійсною
            gotDeleted = true;
          } else if (currentAcc && (currentAcc.status === 'Заблокований' || currentAcc.isBlocked === true)) {
            gotBlocked = true;
          }
        }
        
        if (gotDeleted) {
          setActiveUser(null);
          saveState('active_user', null);
          setIsAdminMode(false);
          setPlayingMovie(null);
          return;
        }

        if (gotBlocked) {
          setIsBlockedAccount(true);
          // Негайний вихід із системи
          setActiveUser(null);
          saveState('active_user', null);
          setIsAdminMode(false);
          setPlayingMovie(null);
          alert(language === 'UA' ? "Ваш сеанс перервано: обліковий запис було заблоковано." : "Your session was interrupted: your account has been blocked.");
        }
      } catch (e) {
        console.error("Error executing dynamic block checking:", e);
      }
    };

    checkBlockedStatus();
    const interval = setInterval(checkBlockedStatus, 10000);
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'cinemanova_deleted_emails' || e.key === 'nova_users' || e.key === 'cinemanova_accounts') {
        checkBlockedStatus();
      }
    };
    window.addEventListener('storage', handleStorageChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [activeUser, language]);

  // Слухач події видалення користувача з адмін-панелі
  useEffect(() => {
    const handleUserDeleted = (e: any) => {
      const detail = e.detail;
      if (activeUser && detail) {
        const activeEmail = (activeUser.email || '').trim().toLowerCase();
        const activeId = (activeUser.id || '').trim().toLowerCase();
        if (
          (detail.email && activeEmail === detail.email.trim().toLowerCase()) ||
          (detail.id && activeId === detail.id.trim().toLowerCase())
        ) {
          setActiveUser(null);
          saveState('active_user', null);
          setIsAdminMode(false);
          setPlayingMovie(null);
        }
      }
    };

    window.addEventListener('cinemanova_user_deleted', handleUserDeleted);
    return () => window.removeEventListener('cinemanova_user_deleted', handleUserDeleted);
  }, [activeUser]);

  // Початкове завантаження та ініціалізація збережених даних
  useEffect(() => {
    // Зчитування чорного списку видалених email-адрес
    let deletedEmails: string[] = [];
    try {
      const dStr = localStorage.getItem('cinemanova_deleted_emails');
      if (dStr) deletedEmails = JSON.parse(dStr);
    } catch (e) {}

    // A. Ініціалізація облікових записів cinemanova_accounts
    try {
      const savedAccountsStr = localStorage.getItem('cinemanova_accounts');
      const allDefaults: Record<string, any> = {
        'premium@example.invalid': {
          name: 'Андрій',
          email: 'premium@example.invalid',
          password: 'PUBLIC_DEMO_ONLY',
          avatarUrl: 'https://images.unsplash.com/photo-1531427186611-ecfd6d936c79?q=80&w=150&auto=format&fit=crop',
          plan: 'Premium',
          role: 'user'
        },
        'admin@example.invalid': {
          name: 'Адмін',
          email: 'admin@example.invalid',
          password: 'PUBLIC_DEMO_ONLY',
          avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=150&auto=format&fit=crop',
          plan: 'VIP',
          role: 'admin'
        },
        'viewer@example.invalid': {
          name: 'Користувач',
          email: 'viewer@example.invalid',
          password: 'PUBLIC_DEMO_ONLY',
          avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=150&auto=format&fit=crop',
          plan: 'Premium',
          role: 'user'
        }
      };

      const defaults: Record<string, any> = {};
      Object.keys(allDefaults).forEach(k => {
        if (!deletedEmails.includes(k.toLowerCase())) {
          defaults[k] = allDefaults[k];
        }
      });

      if (!savedAccountsStr) {
        localStorage.setItem('cinemanova_accounts', JSON.stringify(defaults));
      } else {
        const accounts = JSON.parse(savedAccountsStr);
        let updated = false;

        // Видалення заблокованих або видалених акаунтів зі сховища
        if (Array.isArray(deletedEmails) && deletedEmails.length > 0) {
          Object.keys(accounts).forEach(k => {
            if (deletedEmails.includes(k.toLowerCase())) {
              delete accounts[k];
              updated = true;
            }
          });
        }

        // Міграція та виправлення некоректних email-адрес адміністратора
        if (accounts['admin']) {
          const adminData = accounts['admin'];
          accounts['admin@example.invalid'] = {
            ...defaults['admin@example.invalid'],
            ...accounts['admin@example.invalid'],
            name: adminData.name || 'Адмін',
            avatarUrl: adminData.avatarUrl || accounts['admin@example.invalid']?.avatarUrl || defaults['admin@example.invalid']?.avatarUrl,
            password: adminData.password || accounts['admin@example.invalid']?.password || defaults['admin@example.invalid']?.password,
            email: 'admin@example.invalid',
            role: 'admin',
            plan: 'VIP'
          };
          delete accounts['admin'];
          updated = true;
        }

        // Стандартизація головного акаунта адміністратора з фіксованою роллю admin
        if (accounts['admin@example.invalid']) {
          if (accounts['admin@example.invalid'].email !== 'admin@example.invalid' || accounts['admin@example.invalid'].role !== 'admin') {
            accounts['admin@example.invalid'].email = 'admin@example.invalid';
            accounts['admin@example.invalid'].role = 'admin';
            updated = true;
          }
        }

        if (updated) {
          localStorage.setItem('cinemanova_accounts', JSON.stringify(accounts));
        }
      }
    } catch (e) {
      console.error('Failed to initialize or migrate accounts:', e);
    }

    // B. Перевірка та синхронізація бази користувачів nova_users
    try {
      const savedNovaStr = localStorage.getItem('nova_users');
      const allDefaultUsers = [
        { id: 'viewer@example.invalid', name: 'Мелні', email: 'viewer@example.invalid', plan: 'VIP', status: 'Активний', joined: '19.06.2026', role: 'user', isBlocked: false, avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=150&auto=format&fit=crop' },
        { id: 'projectcinemanova@gmail.com', name: 'project_cinemanova', email: 'projectcinemanova@gmail.com', plan: 'VIP', status: 'Активний', joined: '15.05.2026', role: 'user', isBlocked: false },
        { id: 'max.golovaschenko@gmail.com', name: 'Максим', email: 'max.golovaschenko@gmail.com', plan: 'VIP', status: 'Активний', joined: '10.06.2026', role: 'user', isBlocked: false, avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=150&auto=format&fit=crop' },
        { id: 'admin@313131.com', name: 'Melnyv2', email: 'admin@313131.com', plan: 'VIP', status: 'Активний', joined: '01.06.2026', role: 'user', isBlocked: false, avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=150&auto=format&fit=crop' },
        { id: 'nkdengm@gmail.com', name: 'Денис Нікітенко', email: 'nkdengm@gmail.com', plan: 'VIP', status: 'Активний', joined: '22.05.2026', role: 'user', isBlocked: false, avatarUrl: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?q=80&w=150&auto=format&fit=crop' },
        { id: 'wanzel987@gmail.com', name: 'Вячеслав', email: 'wanzel987@gmail.com', plan: 'VIP', status: 'Активний', joined: '18.06.2026', role: 'user', isBlocked: false, avatarUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?q=80&w=150&auto=format&fit=crop' },
        { id: 'admin@example.invalid', name: 'Адмін', email: 'admin@example.invalid', plan: 'VIP', status: 'Активний', joined: '01.03.2025', role: 'admin', isBlocked: false, avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=150&auto=format&fit=crop' }
      ];
      const defaultUsers = allDefaultUsers.filter(u => !deletedEmails.includes(u.email.toLowerCase()) && !deletedEmails.includes(u.id.toLowerCase()));

      if (!savedNovaStr) {
        localStorage.setItem('nova_users', JSON.stringify(defaultUsers));
      } else {
        // Міграція бази користувачів для запобігання помилок email
        const users = JSON.parse(savedNovaStr);
        if (Array.isArray(users)) {
          let updated = false;
          let cleaned = users.filter((u: any) => {
            const emailLower = (u.email || '').trim().toLowerCase();
            const idLower = (u.id || '').trim().toLowerCase();
            if (deletedEmails.includes(emailLower) || deletedEmails.includes(idLower)) {
              updated = true;
              return false;
            }
            return true;
          }).map((u: any) => {
            const emailLower = (u.email || '').trim().toLowerCase();
            const nameLower = (u.name || '').trim().toLowerCase();
            if (emailLower === 'admin' || nameLower === 'admin' || nameLower === 'адмін' || emailLower === 'admin@example.invalid') {
              if (u.email !== 'admin@example.invalid' || u.role !== 'admin') {
                updated = true;
                return { ...u, email: 'admin@example.invalid', role: 'admin' };
              }
            }
            return u;
          });

          // Автоматично доповнюємо відсутніх реальних користувачів зі списку замовчування
          defaultUsers.forEach(du => {
            const duEmail = du.email.toLowerCase();
            if (!cleaned.some((u: any) => (u.email || '').toLowerCase() === duEmail)) {
              cleaned.push(du);
              updated = true;
            }
          });

          if (updated) {
            localStorage.setItem('nova_users', JSON.stringify(cleaned));
          }
        }
      }
    } catch (e) {
      console.error('Failed to initialize or migrate nova_users:', e);
    }

    // 1. Завантаження активного користувача
    let dbUser = loadState<UserProfile | null>('active_user', null);
    
    // Автоматична міграція активної сесії адміністратора
    if (dbUser && (dbUser.email?.trim().toLowerCase() === 'admin' || dbUser.name?.trim().toLowerCase() === 'admin')) {
      dbUser = {
        ...dbUser,
        email: 'admin@example.invalid',
        role: 'admin'
      };
      saveState('active_user', dbUser);
    }

    if (dbUser && dbUser.email) {
      const normEmail = dbUser.email.trim().toLowerCase();
      const storedAvatar = localStorage.getItem(`user_avatar_${normEmail}`) || localStorage.getItem(`user_avatar_${dbUser.id}`);
      const storedHandle = localStorage.getItem(`user_handle_${normEmail}`) || localStorage.getItem(`user_handle_${dbUser.id}`);
      const storedBirthDate = localStorage.getItem(`user_birthDate_${normEmail}`) || localStorage.getItem(`user_birthDate_${dbUser.id}`);
      const storedGender = localStorage.getItem(`user_gender_${normEmail}`) || localStorage.getItem(`user_gender_${dbUser.id}`);
      const storedLocation = localStorage.getItem(`user_location_${normEmail}`) || localStorage.getItem(`user_location_${dbUser.id}`);
      const storedAboutMe = localStorage.getItem(`user_aboutMe_${normEmail}`) || localStorage.getItem(`user_aboutMe_${dbUser.id}`);
      const storedName = localStorage.getItem(`user_name_${normEmail}`) || localStorage.getItem(`user_name_${dbUser.id}`);

      let accData: any = null;
      try {
        const savedAccs = localStorage.getItem('cinemanova_accounts');
        if (savedAccs) {
          const accs = JSON.parse(savedAccs);
          if (accs[normEmail]) accData = accs[normEmail];
        }
      } catch (e) {
        console.error('Error reading from cinemanova_accounts:', e);
      }

      dbUser = {
        ...dbUser,
        name: storedName || accData?.name || dbUser.name,
        avatarUrl: storedAvatar || accData?.avatarUrl || dbUser.avatarUrl,
        handle: storedHandle || accData?.handle || dbUser.handle,
        birthDate: storedBirthDate || accData?.birthDate || dbUser.birthDate,
        gender: (storedGender || accData?.gender || dbUser.gender) as any,
        location: storedLocation || accData?.location || dbUser.location,
        aboutMe: storedAboutMe || accData?.aboutMe || dbUser.aboutMe,
      };
      saveState('active_user', dbUser);
    }
    setActiveUser(dbUser);

    // 2. Фонова неблокуюча ініціалізація та об'єднання з TMDB
    const initMoviesAndTMDB = async () => {
      // Запуск у фоновій черзі для забезпечення миттєвого завантаження інтерфейсу
      await new Promise(resolve => setTimeout(resolve, 50));
      const dbMovies = loadState<Movie[]>('movies_db', INITIAL_MOVIES);
      
      // Фільтрація російськомовного контенту з кешованої бази фільмів
      const isAllowedLocalMovie = (m: Movie) => {
        if (!m || !m.title) return false;
        if (
          m.id === 'devil-wears-prada-2' ||
          m.id === 'explosive-kiss-dorama' ||
          m.id === 'idol-lawyer-dorama' ||
          m.id === 'marry-me-now-dorama' ||
          m.id === 'attack-on-titan-2013' ||
          m.id === 'solo-leveling-anime'
        ) return false;
        const titleLower = m.title.toLowerCase();
        const descLower = (m.description || '').toLowerCase();
        
        // 1. Check for Russian-specific letters: ы, э, ъ, ё
        const ruSpecific = /[ыэъё]/;
        if (ruSpecific.test(titleLower) || ruSpecific.test(descLower)) return false;
        
        // 2. Перевірка наявності небажаних слів у назві
        const ruWords = /\b(будет|твое|мое|это|этот|очень|город|красивый|первый|время|жизнь|любовь|сердце|разбито|всегда|когда|тогда|после|один|друг|был|была|было|были|нет|да)\b/;
        if (ruWords.test(titleLower)) return false;
        
        // 3. Дозволені лише українська кирилиця або латиниця у назві
        const allowedPattern = /^[a-zA-Zа-яА-ЯіІїЇєЄґҐ0-9\s\-,.!?:;'"()&@#/*%+=<>_’'“”«»–]*$/;
        if (!allowedPattern.test(m.title)) return false;
        
        // 4. Перевірка англомовних або японських назв контенту
        const hasCyrillic = /[а-яА-ЯіІїЇєЄґҐ]/.test(m.title);
        if (!hasCyrillic) {
          if (m.languages && m.languages.length > 0) {
            const hasEnglishOrUkrainian = m.languages.some(lang => 
              lang.toLowerCase().includes('english') || 
              lang.toLowerCase().includes('ukrainian') || 
              lang.toLowerCase().includes('англійська') || 
              lang.toLowerCase().includes('українська')
            );
            if (!hasEnglishOrUkrainian) return false;
          }
        }
        return true;
      };

      const dbMoviesFiltered = dbMovies.filter(isAllowedLocalMovie);
      
      // Перевірка наявності всіх базових фільмів, аніме, новинок та дорам у базі
      const allBaseMovies = [...INITIAL_MOVIES, ...ANIME_LIST, ...NEW_RELEASES_LIST, ...DORAMAS_LIST];
      const dbMovieIds = new Set(dbMoviesFiltered.map(m => m.id));

      // Динамічна синхронізація з актуальними метаданими каталогу
      let isSynced = dbMoviesFiltered.length !== dbMovies.length;
      const syncedMovies = dbMoviesFiltered.map(dbMovie => {
        const fresh = allBaseMovies.find(m => m.id === dbMovie.id);
        if (fresh) {
          const hasDifferentTrailer = dbMovie.trailerEmbedUrl !== fresh.trailerEmbedUrl;
          const hasDifferentPoster = dbMovie.posterUrl !== fresh.posterUrl;
          const hasDifferentBackdrop = dbMovie.backdropUrl !== fresh.backdropUrl;
          const hasDifferentTitle = dbMovie.title !== fresh.title;
          const hasDifferentTitleEn = fresh.titleEn && dbMovie.titleEn !== fresh.titleEn;
          const hasDifferentDescription = dbMovie.description !== fresh.description;
          const hasDifferentDescriptionEn = fresh.descriptionEn && dbMovie.descriptionEn !== fresh.descriptionEn;

          if (hasDifferentTrailer || hasDifferentPoster || hasDifferentBackdrop || hasDifferentTitle || hasDifferentTitleEn || hasDifferentDescription || hasDifferentDescriptionEn) {
            isSynced = true;
            return {
              ...dbMovie,
              title: fresh.title,
              titleEn: fresh.titleEn || dbMovie.titleEn,
              description: fresh.description,
              descriptionEn: fresh.descriptionEn || dbMovie.descriptionEn,
              genres: fresh.genres,
              posterUrl: fresh.posterUrl,
              backdropUrl: fresh.backdropUrl,
              stills: fresh.stills || dbMovie.stills,
              trailerEmbedUrl: fresh.trailerEmbedUrl || dbMovie.trailerEmbedUrl,
              videoUrl: dbMovie.videoUrl || fresh.videoUrl,
              episodesData: fresh.episodesData || dbMovie.episodesData,
            };
          }
        }
        return dbMovie;
      });

      const missingInitial = allBaseMovies.filter(m => !dbMovieIds.has(m.id));
      if (missingInitial.length > 0) {
        isSynced = true;
        syncedMovies.push(...missingInitial);
      }

      // Нормалізація назв для запобігання дублюванню записів
      const normalizeTitleForDeduplication = (t?: string) => {
        if (!t) return '';
        return t
          .toLowerCase()
          .trim()
          .replace(/[^a-zа-яіїєґ0-9]/gi, '');
      };

      // Видалення дублікатів за ідентифікатором та нормалізованою назвою
      const uniqueMovies: Movie[] = [];
      const seenIds = new Set<string>();
      const seenNormalizeKeys = new Set<string>();

      for (const m of syncedMovies) {
        if (!m) continue;
        const id = m.id;
        const normKeyUa = normalizeTitleForDeduplication(m.title);
        const normKeyEn = normalizeTitleForDeduplication(m.titleEn);
        
        if (
          seenIds.has(id) || 
          (normKeyUa && seenNormalizeKeys.has('ua:' + normKeyUa)) ||
          (normKeyEn && seenNormalizeKeys.has('en:' + normKeyEn))
        ) {
          isSynced = true;
          continue;
        }
        
        seenIds.add(id);
        if (normKeyUa) seenNormalizeKeys.add('ua:' + normKeyUa);
        if (normKeyEn) seenNormalizeKeys.add('en:' + normKeyEn);
        uniqueMovies.push(m);
      }
      
      if (isSynced) {
        saveState('movies_db', uniqueMovies);
        setMoviesList(uniqueMovies);
      }

      try {
        setIsLoadingTMDB(true);
        const [trending, popular, brandNew, newAnime] = await Promise.all([
          getTrendingMovies(),
          getPopularMovies(),
          getNewMovies(),
          fetchNewAnimeFromMal()
        ]);

        const combined = [...uniqueMovies];
        const seenTitlesNormalized = new Set(uniqueMovies.map(m => normalizeTitleForDeduplication(m.title)));
        const seenIdsMap = new Set(uniqueMovies.map(m => m.id));

        const allIncoming = [
          ...brandNew.map(m => ({ ...m, isNew: true })),
          ...newAnime.map(m => ({ ...m, isNew: true })),
          ...trending,
          ...popular
        ]
          .filter(m => !isCartoon(m))
          .map(m => sanitizeMovieGenres(m));

        let hasNewIncoming = false;
        for (const m of allIncoming) {
          const normKey = normalizeTitleForDeduplication(m.title);
          if (!seenTitlesNormalized.has(normKey) && !seenIdsMap.has(m.id)) {
            seenTitlesNormalized.add(normKey);
            seenIdsMap.add(m.id);
            combined.push(m);
            hasNewIncoming = true;
          }
        }

        const strictlyFilteredCombined = combined
          .filter(m => !isCartoon(m))
          .map(m => sanitizeMovieGenres(m));

        if (hasNewIncoming || strictlyFilteredCombined.length !== combined.length) {
          setMoviesList(strictlyFilteredCombined);
          saveState('movies_db', strictlyFilteredCombined);
        }
      } catch (err) {
        console.info("Помилка під час завантаження фільмів з TMDB та MyAnimeList (використовується локальна база):", err);
      } finally {
        setIsLoadingTMDB(false);
      }
    };

    // Запуск фонової синхронізації каталогу після первинного рендеру
    const timer = setTimeout(() => {
      initMoviesAndTMDB().catch(() => {});
    }, 1200);

    return () => clearTimeout(timer);
  }, []);

  // Обробка прямих посилань на відео в адресному рядку браузера
  useEffect(() => {
    if (moviesList.length === 0) return;

    const params = new URLSearchParams(window.location.search);
    const videoParam = params.get('video');
    if (videoParam) {
      const decodedUrl = decodeURIComponent(videoParam);
      console.log('Detected video deep-link:', decodedUrl);

      // Розбір шляху для отримання ID фільму, озвучення, сезону та серії
      // Приклад: /videos/demon-slayer-2019/amanogawa/s1e1.mp4
      const match = decodedUrl.match(/(?:\/videos)?\/([^\/]+)\/([^\/]+)\/s(\d+)e(\d+)/i);
      
      let movieId = '';
      let voiceoverSlug = '';
      let sNum = 1;
      let eNum = 1;
      
      if (match) {
        movieId = match[1];
        voiceoverSlug = match[2];
        sNum = parseInt(match[3], 10);
        eNum = parseInt(match[4], 10);
      } else {
        // Резервний парсинг для простих назв файлів
        const parts = decodedUrl.split('/');
        movieId = parts[parts.length - 3] || '';
        voiceoverSlug = parts[parts.length - 2] || '';
      }

      // Пошук фільму в актуальній базі даних
      let targetMovie = moviesList.find(m => m.id === movieId);
      if (!targetMovie) {
        // Резервний пошук за назвою або частиною шляху
        targetMovie = moviesList.find(m => m.videoUrl === decodedUrl || decodedUrl.includes(m.id));
      }

      if (!targetMovie) {
        // Створення віртуальної моделі фільму у разі його відсутності
        const namePart = movieId.replace(/[-_]/g, ' ').toUpperCase();
        targetMovie = {
          id: movieId || 'custom_url_' + Date.now(),
          title: namePart || 'Локальне відео',
          description: `Відеофайл з локального шляху: ${decodedUrl}`,
          videoUrl: decodedUrl,
          backdropUrl: 'https://images.unsplash.com/photo-1574267431629-2e570b28a11e?q=80&w=1200',
          posterUrl: 'https://images.unsplash.com/photo-1574267431629-2e570b28a11e?q=80&w=400',
          rating: 10,
          ratingVotesCount: '1',
          ageRating: '12+',
          year: 2026,
          duration: '0',
          genres: ['Локальне', 'Відео'],
          type: match ? 'series' : 'movie',
          director: 'Адміністратор',
          cast: [],
          languages: ['Ukrainian'],
          subtitles: [],
          viewsCount: 1
        };
      }

      // Встановлення станів прямого відтворення
      if (match) {
        setInitialSeason(sNum);
        setInitialEpisode(eNum);
        setInitialVoiceover(voiceoverSlug);
      } else {
        setInitialSeason(undefined);
        setInitialEpisode(undefined);
        setInitialVoiceover(undefined);
      }

      setPlayingMovie(targetMovie);

      // Очищення URL-параметрів без перезавантаження сторінки
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);
    }
  }, [moviesList]);

  // Обробка прямих посилань на кімнату спільного перегляду Watch Party
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam) {
      setInitialWatchPartyRoomId(roomParam);
      setActiveTab('watchparty');
      
      // Очищення URL-параметрів без перезавантаження сторінки
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);
    }
  }, []);

  // Допоміжні функції для збереження стану
  const handleUpdateUser = (updated: UserProfile) => {
    // Збереження в локальну базу cinemanova_accounts
    try {
      const savedAccountsStr = localStorage.getItem('cinemanova_accounts');
      let accounts: { [email: string]: any } = {};
      
      const defaults = {
        'premium@example.invalid': {
          name: 'Андрій',
          email: 'premium@example.invalid',
          password: 'PUBLIC_DEMO_ONLY',
          avatarUrl: 'https://images.unsplash.com/photo-1531427186611-ecfd6d936c79?q=80&w=150&auto=format&fit=crop',
          plan: 'Premium',
          role: 'user'
        },
        'admin@example.invalid': {
          name: 'Адмін',
          email: 'admin@example.invalid',
          password: 'PUBLIC_DEMO_ONLY',
          avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=150&auto=format&fit=crop',
          plan: 'VIP',
          role: 'admin'
        },
        'viewer@example.invalid': {
          name: 'Користувач',
          email: 'viewer@example.invalid',
          password: 'PUBLIC_DEMO_ONLY',
          avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=150&auto=format&fit=crop',
          plan: 'Premium',
          role: 'user'
        }
      };

      if (savedAccountsStr) {
        accounts = JSON.parse(savedAccountsStr);
      } else {
        accounts = { ...defaults };
      }

      const currentEmail = activeUser?.email?.trim().toLowerCase();
      const updatedEmail = updated.email.trim().toLowerCase();

      let targetKey = currentEmail;
      // Міграція ключа адміністратора на стандартний email
      if (currentEmail === 'admin' && !accounts['admin'] && accounts['admin@example.invalid']) {
        targetKey = 'admin@example.invalid';
      }

      if (targetKey && accounts[targetKey]) {
        const oldAcc = accounts[targetKey];
        const updatedAcc = {
          ...oldAcc,
          name: updated.name,
          email: updated.email,
          avatarUrl: updated.avatarUrl,
          plan: updated.plan,
          handle: updated.handle !== undefined ? updated.handle : oldAcc.handle,
          birthDate: updated.birthDate !== undefined ? updated.birthDate : oldAcc.birthDate,
          gender: updated.gender !== undefined ? updated.gender : oldAcc.gender,
          location: updated.location !== undefined ? updated.location : oldAcc.location,
          aboutMe: updated.aboutMe !== undefined ? updated.aboutMe : oldAcc.aboutMe,
          favoriteGenres: updated.favoriteGenres !== undefined ? updated.favoriteGenres : oldAcc.favoriteGenres,
          password: updated.password || oldAcc.password || 'PUBLIC_DEMO_ONLY',
          role: updated.role || oldAcc.role || (updatedEmail.includes('admin') ? 'admin' : 'user')
        };

        if (targetKey !== updatedEmail) {
          delete accounts[targetKey];
        }
        accounts[updatedEmail] = updatedAcc;
      } else {
        // Динамічне створення акаунта, якщо він ще не існує
        accounts[updatedEmail] = {
          name: updated.name,
          email: updated.email,
          password: updated.password || 'PUBLIC_DEMO_ONLY',
          avatarUrl: updated.avatarUrl,
          plan: updated.plan,
          handle: updated.handle || '@' + updated.email.split('@')[0],
          birthDate: updated.birthDate || '23.07.1999',
          gender: updated.gender || 'Жіноча',
          location: updated.location || 'Україна',
          aboutMe: updated.aboutMe || '',
          favoriteGenres: updated.favoriteGenres || [],
          role: updated.role || (updatedEmail.includes('admin') ? 'admin' : 'user')
        };
      }
      localStorage.setItem('cinemanova_accounts', JSON.stringify(accounts));
    } catch (e) {
      console.error('Failed to update account in cinemanova_accounts database:', e);
    }

    // Паралельна синхронізація бази nova_users
    try {
      const savedNovaStr = localStorage.getItem('nova_users');
      if (savedNovaStr) {
        const novaUsers = JSON.parse(savedNovaStr);
        if (Array.isArray(novaUsers)) {
          const currentEmail = activeUser?.email?.trim().toLowerCase();
          const updatedEmail = updated.email.trim().toLowerCase();
          
          let userIndex = -1;
          
          if (currentEmail) {
            userIndex = novaUsers.findIndex((u: any) => {
              const uEmail = (u.email || '').trim().toLowerCase();
              return uEmail === currentEmail || (currentEmail === 'admin' && uEmail === 'admin@example.invalid');
            });
          }
          
          if (userIndex !== -1) {
            novaUsers[userIndex] = {
              ...novaUsers[userIndex],
              name: updated.name,
              email: updated.email,
              plan: updated.plan,
              avatarUrl: updated.avatarUrl,
              handle: updated.handle !== undefined ? updated.handle : novaUsers[userIndex].handle,
              birthDate: updated.birthDate !== undefined ? updated.birthDate : novaUsers[userIndex].birthDate,
              gender: updated.gender !== undefined ? updated.gender : novaUsers[userIndex].gender,
              location: updated.location !== undefined ? updated.location : novaUsers[userIndex].location,
              aboutMe: updated.aboutMe !== undefined ? updated.aboutMe : novaUsers[userIndex].aboutMe,
              role: updated.role || novaUsers[userIndex].role || (updatedEmail.includes('admin') ? 'admin' : 'user')
            };
          } else {
            novaUsers.push({
              id: updated.id || 'usr_' + updatedEmail.replace(/[@.]/g, '_'),
              name: updated.name,
              email: updated.email,
              plan: updated.plan || 'Standard',
              status: 'Активний',
              joined: updated.joined || new Date().toLocaleDateString('uk-UA'),
              role: updated.role || (updatedEmail.includes('admin') ? 'admin' : 'user'),
              avatarUrl: updated.avatarUrl,
              handle: updated.handle || '@' + updated.email.split('@')[0],
              birthDate: updated.birthDate || '23.07.1999',
              gender: updated.gender || 'Жіноча',
              location: updated.location || 'Україна',
              aboutMe: updated.aboutMe || '',
              isBlocked: false
            });
          }
          localStorage.setItem('nova_users', JSON.stringify(novaUsers));
        }
      }
    } catch (e) {
      console.error('Failed to sync updated user to nova_users:', e);
    }

    if (updated.email) {
      const normEmail = updated.email.trim().toLowerCase();
      try {
        if (updated.avatarUrl) {
          localStorage.setItem(`user_avatar_${normEmail}`, updated.avatarUrl);
          if (updated.id) localStorage.setItem(`user_avatar_${updated.id}`, updated.avatarUrl);
        }
        if (updated.name) {
          localStorage.setItem(`user_name_${normEmail}`, updated.name);
          if (updated.id) localStorage.setItem(`user_name_${updated.id}`, updated.name);
        }
        if (updated.handle) {
          localStorage.setItem(`user_handle_${normEmail}`, updated.handle);
          if (updated.id) localStorage.setItem(`user_handle_${updated.id}`, updated.handle);
        }
        if (updated.birthDate) {
          localStorage.setItem(`user_birthDate_${normEmail}`, updated.birthDate);
          if (updated.id) localStorage.setItem(`user_birthDate_${updated.id}`, updated.birthDate);
        }
        if (updated.gender) {
          localStorage.setItem(`user_gender_${normEmail}`, updated.gender);
          if (updated.id) localStorage.setItem(`user_gender_${updated.id}`, updated.gender);
        }
        if (updated.location) {
          localStorage.setItem(`user_location_${normEmail}`, updated.location);
          if (updated.id) localStorage.setItem(`user_location_${updated.id}`, updated.location);
        }
        if (updated.aboutMe !== undefined) {
          localStorage.setItem(`user_aboutMe_${normEmail}`, updated.aboutMe);
          if (updated.id) localStorage.setItem(`user_aboutMe_${updated.id}`, updated.aboutMe);
        }
      } catch (err) {
        console.error('Error storing user profile keys:', err);
      }
    }

    setActiveUser(updated);
    saveState('active_user', updated);
  };

  const handleUpdateMoviesList = (newMovies: Movie[]) => {
    setMoviesList(newMovies);
    saveState('movies_db', newMovies);
    
    // Синхронізація активного фільму при його зміні в адмін-панелі
    if (playingMovie) {
      const updated = newMovies.find(m => m.id === playingMovie.id);
      if (updated) setPlayingMovie(updated);
    }
    if (selectedMovie) {
      const updated = newMovies.find(m => m.id === selectedMovie.id);
      if (updated) setSelectedMovie(updated);
    }
  };

  const handleSignOut = () => {
    setActiveUser(null);
    saveState('active_user', null);
    setIsAdminMode(false);
    setActiveTab('home');
    setSelectedMovie(null);
    setPlayingMovie(null);
  };

  const handleDeleteProfile = () => {
    if (!activeUser) return;
    const userId = activeUser.id;
    const userEmail = (activeUser.email || '').trim().toLowerCase();

    try {
      const savedAccs = localStorage.getItem('cinemanova_accounts');
      if (savedAccs) {
        const accs = JSON.parse(savedAccs);
        Object.keys(accs).forEach(k => {
          const acc = accs[k];
          if (
            k.toLowerCase() === userEmail ||
            acc?.id === userId ||
            acc?.email?.toLowerCase() === userEmail
          ) {
            delete accs[k];
          }
        });
        localStorage.setItem('cinemanova_accounts', JSON.stringify(accs));
      }
    } catch (e) {
      console.error('Error removing account from cinemanova_accounts:', e);
    }

    try {
      localStorage.removeItem(`watch_history_page_${userId}`);
      localStorage.removeItem(`user_history_${userId}`);
      localStorage.removeItem(`user_favs_${userId}`);
      localStorage.removeItem(`user_avatar_${userId}`);
      localStorage.removeItem(`user_ratings_${userId}`);
      localStorage.removeItem('active_user');
    } catch (e) {
      console.error(e);
    }

    setActiveUser(null);
    saveState('active_user', null);
    setIsAdminMode(false);
    setActiveTab('home');
    setSelectedMovie(null);
    setPlayingMovie(null);
  };

  const handleNavigateToTab = (tab: string) => {
    setActiveTab(tab);
    setPlayingMovie(null);
    setIsHeaderHidden(false);
    lastScrollTopRef.current = 0;
    if (tab !== 'details') {
      setSelectedMovie(null);
    }
    if (tab !== 'search') {
      setSearchQuery('');
    }
    const mainEl = document.querySelector('main');
    if (mainEl) {
      mainEl.scrollTo({ top: 0, behavior: 'smooth' });
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleStartWatchParty = useCallback((movie: Movie, roomConfig?: any) => {
    let typePrefix = 'NOVA-FILM';
    if (movie.type === 'series') {
      typePrefix = 'NOVA-SERIES';
    } else if (movie.type === 'anime' || movie.genres?.includes('Аніме')) {
      typePrefix = 'NOVA-ANIME';
    } else if (movie.type === 'dorama' || movie.id?.toLowerCase().includes('dorama') || movie.genres?.includes('Дорама')) {
      typePrefix = 'NOVA-DORAMA';
    }

    const cleanCode = (movie.id || 'ROOM').replace(/[^a-zA-Z0-9]/g, '').slice(0, 5).toUpperCase();
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const finalRoomId = roomConfig?.roomId || roomConfig?.id || `${typePrefix}-${cleanCode || 'NOVA'}-${randomNum}`;
    const finalRoomName = roomConfig?.roomName || roomConfig?.movieTitle || movie.title;
    
    const now = new Date();
    const currentFormattedTime = (language === 'UA' ? 'Сьогодні, ' : 'Today, ') + now.toLocaleTimeString(language === 'UA' ? 'uk-UA' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });

    const isHost = Boolean(!roomConfig?.fromJoin && (roomConfig?.createdByMe !== false && roomConfig?.isHost !== false));
    const hostName = roomConfig?.hostName || activeUser?.name || (activeUser as any)?.username || (language === 'UA' ? 'Користувач' : 'User');
    const hostId = roomConfig?.hostId || activeUser?.id;

    const config = {
      id: finalRoomId,
      roomId: finalRoomId,
      movieId: movie.id,
      movieTitle: movie.title,
      roomName: finalRoomName,
      maxParticipants: roomConfig?.maxParticipants || (language === 'UA' ? '10 учасників' : '10 participants'),
      groupAccess: roomConfig?.groupAccess || (language === 'UA' ? 'Тільки друзі' : 'Friends only'),
      chatEnabled: roomConfig?.chatEnabled ?? true,
      everyoneControls: roomConfig?.everyoneControls ?? roomConfig?.everyoneCanControl ?? false,
      everyoneCanControl: roomConfig?.everyoneControls ?? roomConfig?.everyoneCanControl ?? false,
      autoplayEnabled: roomConfig?.autoplayEnabled ?? true,
      hostName,
      hostId,
      createdAt: roomConfig?.createdAt || currentFormattedTime,
      isHost,
      createdByMe: isHost,
      ...roomConfig
    };

    setActiveWatchPartyRoom({
      movie,
      roomConfig: config
    });
    notifyWatchPartyJoined(movie, finalRoomId);
    setSelectedMovie(null);
    setPlayingMovie(null);
    setInitialWatchPartyMovieId(null);
    setInitialWatchPartyRoomId(null);
    setActiveTab('watchparty');
  }, [activeUser, language]);

  // Обробники кліку по картках фільмів
  const handleSelectMovie = async (movie: Movie) => {
    setPlayingMovie(null);
    setSearchQuery('');
    if (activeTab !== 'details') {
      setPreviousTab(activeTab);
    }
    if (movie.id.startsWith('tmdb_')) {
      setIsFetchingDetails(true);
      // Миттєве відкриття вікна для максимальної чуйності інтерфейсу
      setSelectedMovie(movie);
      setActiveTab('details');
      try {
        const fullDetails = await fetchFullMovieDetails(movie.id);
        if (fullDetails) {
          setSelectedMovie(fullDetails);
          // Оновлення детальної інформації у кеші стану
          setMoviesList(prev => prev.map(m => m.id === movie.id ? fullDetails : m));
        }
      } catch (err) {
        console.error("Не вдалося завантажити повну інформацію з TMDB:", err);
      } finally {
        setIsFetchingDetails(false);
      }
    } else {
      setSelectedMovie(movie);
      setActiveTab('details');
    }
  };

  const handleToggleFavorite = (movieId: string) => {
    if (!activeUser) {
      setIsAuthOpen(true);
      return;
    }
    const favsKey = `user_favs_${activeUser.id}`;
    const currentFavs = loadState<string[]>(favsKey, activeUser.favorites || []);
    const isAdding = !currentFavs.includes(movieId);
    const updatedFavs = isAdding
      ? [...currentFavs, movieId]
      : currentFavs.filter((id) => id !== movieId);

    saveState(favsKey, updatedFavs);
    handleUpdateUser({
      ...activeUser,
      favorites: updatedFavs,
    });

    if (isAdding) {
      try {
        const targetMovie = moviesList.find((m) => m.id === movieId);
        if (targetMovie) {
          notifyFavoriteToggled(targetMovie, true);
        }
      } catch (e) {
        console.warn('Favorite notification error:', e);
      }
    }
  };

  const handlePlayMovie = (movie: Movie, season?: number, episode?: number, voiceover?: string) => {
    setInitialSeason(season);
    setInitialEpisode(episode);
    setInitialVoiceover(voiceover);
    setPlayingMovie(movie);

    // Збереження запису в історію переглядів watch_history_page
    const userId = activeUser ? activeUser.id : 'guest';
    const storageKey = `watch_history_page_${userId}`;
    const existing = loadState<any[]>(storageKey, []);

    const durationMins = parseInt(movie.duration) || 120;
    const existingIdx = existing.findIndex((item: any) => item.movieId === movie.id);

    let progress = 10;
    let watchedMins = Math.round((progress / 100) * durationMins);

    if (existingIdx >= 0) {
      progress = existing[existingIdx].progressPercent || 10;
      watchedMins = existing[existingIdx].watchedMinutes || Math.round((progress / 100) * durationMins);
    }

    const episodeStr = movie.type === 'series'
      ? `${season || 1} сезон ${episode || 1} серія`
      : undefined;

    const cardItem = {
      id: `hist-${movie.id}`,
      movieId: movie.id,
      title: movie.title,
      year: movie.year || 2024,
      durationText: movie.type === 'series' ? (movie.duration || '1 сезон') : `${durationMins} хв`,
      ageRating: movie.ageRating || '16+',
      genresText: Array.isArray(movie.genres) ? movie.genres.join(', ') : (movie.genres || 'Кіно'),
      episodeText: episodeStr,
      progressPercent: progress,
      watchedMinutes: watchedMins,
      totalMinutes: durationMins,
      backdropUrl: movie.backdropUrl || movie.posterUrl || 'https://image.tmdb.org/t/p/original/xOMo8BRK7PfcJv9JCnx7s5hj0PX.jpg',
      dateGroup: 'today' as const,
      timestamp: Date.now(),
      watchedAt: new Date().toISOString(),
      movieObj: movie
    };

    const updated = [cardItem, ...existing.filter((i: any) => i.movieId !== movie.id)];
    saveState(storageKey, updated);
  };

  // Відстеження прогресу та тривалості перегляду відео
  const handleTrackProgress = (progressPercent: number, label?: string) => {
    if (!playingMovie) return;

    const userId = activeUser ? activeUser.id : 'guest';
    const storageKey = `watch_history_page_${userId}`;
    const existing = loadState<any[]>(storageKey, []);
    const durationMins = parseInt(playingMovie.duration) || 120;
    const watchedMins = Math.round((progressPercent / 100) * durationMins);

    const updatedCard = {
      id: `hist-${playingMovie.id}`,
      movieId: playingMovie.id,
      title: playingMovie.title,
      year: playingMovie.year || 2024,
      durationText: playingMovie.type === 'series' ? (playingMovie.duration || '1 сезон') : `${durationMins} хв`,
      ageRating: playingMovie.ageRating || '16+',
      genresText: Array.isArray(playingMovie.genres) ? playingMovie.genres.join(', ') : (playingMovie.genres || 'Кіно'),
      episodeText: playingMovie.type === 'series' ? (label || '1 сезон 1 серія') : undefined,
      progressPercent: Math.round(progressPercent),
      watchedMinutes: watchedMins,
      totalMinutes: durationMins,
      backdropUrl: playingMovie.backdropUrl || playingMovie.posterUrl || 'https://image.tmdb.org/t/p/original/xOMo8BRK7PfcJv9JCnx7s5hj0PX.jpg',
      dateGroup: 'today' as const,
      timestamp: Date.now(),
      watchedAt: new Date().toISOString(),
      movieObj: playingMovie
    };

    const newHistoryList = [updatedCard, ...existing.filter((i: any) => i.movieId !== playingMovie.id)];
    saveState(storageKey, newHistoryList);

    if (activeUser) {
      const savedHistory = loadState<HistoryItem[]>(`user_history_${activeUser.id}`, activeUser.watchHistory || []);
      const index = savedHistory.findIndex(h => h.movieId === playingMovie.id);
      const updatedItem: HistoryItem = {
        movieId: playingMovie.id,
        movieTitle: playingMovie.title,
        watchedAt: new Date().toISOString(),
        progressPercent,
        watchedMinutes: watchedMins,
        totalMinutes: durationMins,
        currentEpisode: playingMovie.type === 'series' ? (label || '1 сезон 1 серія') : undefined
      };

      let updatedHistory: HistoryItem[];
      if (index >= 0) {
        updatedHistory = [...savedHistory];
        updatedHistory[index] = { ...updatedHistory[index], ...updatedItem };
      } else {
        updatedHistory = [updatedItem, ...savedHistory];
      }

      setHistoryItemsState(updatedHistory);
    }
  };

  const setHistoryItemsState = (updatedHistory: HistoryItem[]) => {
    if (!activeUser) return;
    saveState(`user_history_${activeUser.id}`, updatedHistory);
    handleUpdateUser({
      ...activeUser,
      watchHistory: updatedHistory
    });
  };

  // Алгоритм персоналізованих рекомендацій на основі вподобань користувача
  const personalizedRecommendations = useMemo((): Movie[] => {
    if (!activeUser) return moviesList.slice(0, 6);
    
    const favGenres = activeUser.favoriteGenres || [];
    if (favGenres.length === 0) return moviesList.slice(0, 6);

    // Фільтрація за улюбленими жанрами користувача та сортування за рейтингом
    return moviesList
      .filter(m => Array.isArray(m.genres) && m.genres.some(g => favGenres.includes(g)))
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 6);
  }, [activeUser, moviesList]);

  // Індекси фільтрації списків
  const animeMovies = useMemo(() => {
    const list = [...ANIME_LIST];
    const existingIds = new Set(list.map(m => m.id));
    const existingTitlesUa = new Set(list.map(m => (m.title || '').toLowerCase().replace(/[^a-zа-яіїєґ0-9]/gi, '')).filter(Boolean));
    const existingTitlesEn = new Set(list.map(m => (m.titleEn || '').toLowerCase().replace(/[^a-zа-яіїєґ0-9]/gi, '')).filter(Boolean));

    const extraAnime = moviesList.filter(m => {
      if (!isAnimeItem(m)) return false;
      if (existingIds.has(m.id)) return false;
      const uaNorm = (m.title || '').toLowerCase().replace(/[^a-zа-яіїєґ0-9]/gi, '');
      const enNorm = (m.titleEn || '').toLowerCase().replace(/[^a-zа-яіїєґ0-9]/gi, '');
      if (uaNorm && existingTitlesUa.has(uaNorm)) return false;
      if (enNorm && existingTitlesEn.has(enNorm)) return false;
      return true;
    });

    return [...list, ...extraAnime];
  }, [moviesList, isAnimeItem]);

  const newMovies = useMemo(() => {
    const list = [...NEW_RELEASES_LIST];
    const existingIds = new Set(list.map(m => m.id));
    const extraNew = moviesList.filter(m => 
      (m.isNew || (m.year && m.year >= 2024) || (m.releaseDate && new Date(m.releaseDate).getFullYear() >= 2024)) &&
      !existingIds.has(m.id)
    );
    return [...list, ...extraNew];
  }, [moviesList]);

  const popularMovies = useMemo(() => {
    return [...moviesList].sort((a, b) => (b.viewsCount || 0) - (a.viewsCount || 0));
  }, [moviesList]);

  const popularMoviesOnly = useMemo(() => {
    return moviesList
      .filter(m => (m.type === 'movie' || !m.type) && !isAnimeItem(m) && m.type !== 'dorama' && !m.id.includes('dorama') && !isCartoon(m))
      .filter(m => m.isPopular || (m.rating >= 7.2) || (m.viewsCount && m.viewsCount > 1000) || ['gladiator-2-2024', 'dune-part-two-2024', 'deadpool-wolverine-2024', 'alien-romulus-2024', 'furiosa-2024', 'nosferatu-2024', 'oppenheimer-2023', 'the-batman-2022', 'interstellar-2014'].includes(m.id))
      .sort((a, b) => (b.viewsCount || 0) - (a.viewsCount || 0) || (b.rating || 0) - (a.rating || 0));
  }, [moviesList, isAnimeItem]);

  const popularSeriesOnly = useMemo(() => {
    return moviesList
      .filter(m => m.type === 'series' && !isAnimeItem(m) && !m.id.includes('dorama') && !isCartoon(m))
      .filter(m => m.isPopular || (m.rating >= 7.2) || (m.viewsCount && m.viewsCount > 1000) || ['arcane-s2-2024', 'the-penguin-2024', 'stranger-things-s4', 'squid-game-s2', 'the-witcher-s3', 'black-mirror'].includes(m.id))
      .sort((a, b) => (b.viewsCount || 0) - (a.viewsCount || 0) || (b.rating || 0) - (a.rating || 0));
  }, [moviesList, isAnimeItem]);

  const popularAnimeOnly = useMemo(() => {
    return animeMovies
      .filter(m => !isCartoon(m))
      .filter(m => m.isPopular || (m.rating >= 7.5) || ['solo-leveling-2024', 'kaiju-no-8', 'frieren-2023', 'jujutsu-kaisen-2020', 'demon-slayer-2019', 'attack-on-titan', 'chainsaw-man-2022'].includes(m.id))
      .sort((a, b) => (b.viewsCount || 0) - (a.viewsCount || 0) || (b.rating || 0) - (a.rating || 0));
  }, [animeMovies]);

  const popularDoramasOnly = useMemo(() => {
    const list = [...DORAMAS_LIST];
    const existingIds = new Set(list.map(m => m.id));
    const extra = moviesList.filter(m => (m.type === 'dorama' || m.id.includes('dorama')) && !existingIds.has(m.id));
    return [...list, ...extra]
      .filter(m => !isCartoon(m))
      .filter(m => m.isPopular || (m.rating >= 7.4) || (m.viewsCount && m.viewsCount > 1000) || ['squid-game', 'the-judge-from-hell', 'bon-appetit', 'all-of-us-are-dead'].some(id => m.id.includes(id)))
      .sort((a, b) => (b.viewsCount || 0) - (a.viewsCount || 0) || (b.rating || 0) - (a.rating || 0));
  }, [moviesList]);

  // Популярні фільми та серіали в тренді
  const trendingMoviesAndSeries = useMemo(() => {
    return moviesList
      .filter(m => !isCartoon(m))
      .filter(m => (m.type === 'movie' || m.type === 'series') && !isAnimeItem(m))
      .filter(m =>
        m.isPopular ||
        (m.year && m.year >= 2023) ||
        (m.rating && m.rating >= 7.5) ||
        ['gladiator-2-2024', 'alien-romulus-2024', 'dune-part-two-2024', 'deadpool-wolverine-2024', 'arcane-s2-2024', 'the-penguin-2024', 'squid-game-s2', 'oppenheimer-2023', 'furiosa-2024', 'nosferatu-2024', 'captain-america-brave-new-world-2025', 'stranger-things-s4', 'fallout-s1', 'the-last-of-us-s1', 'house-of-the-dragon', 'shogun-2024', 'the-boys-s4'].includes(m.id)
      )
      .sort((a, b) => (b.viewsCount || 0) - (a.viewsCount || 0) || (b.rating || 0) - (a.rating || 0) || ((b.year || 0) - (a.year || 0)));
  }, [moviesList, isAnimeItem]);
  const userFavoritesList = activeUser 
    ? moviesList.filter(m => {
        const list = loadState<string[]>(`user_favs_${activeUser.id}`, activeUser.favorites || []);
        return list.includes(m.id);
      })
    : [];

  const continueWatchingMovies = useMemo(() => {
    if (!activeUser) return [];
    const userId = activeUser.id;
    const pageHistory = loadState<any[]>(`watch_history_page_${userId}`, []);
    const userHistory = loadState<HistoryItem[]>(`user_history_${userId}`, activeUser.watchHistory || []);

    const map = new Map<string, { progressPercent: number; currentEpisode?: string; movieObj?: Movie }>();

    pageHistory.forEach(item => {
      if (item.movieId) {
        map.set(item.movieId, {
          progressPercent: item.progressPercent !== undefined ? item.progressPercent : 15,
          currentEpisode: item.episodeText,
          movieObj: item.movieObj
        });
      }
    });

    userHistory.forEach(item => {
      if (item.movieId && !map.has(item.movieId)) {
        map.set(item.movieId, {
          progressPercent: item.progressPercent !== undefined ? item.progressPercent : 25,
          currentEpisode: item.currentEpisode,
        });
      }
    });

    const result: (Movie & { progressPercent: number; currentEpisode?: string })[] = [];
    map.forEach((val, movieId) => {
      const found = moviesList.find(m => m.id === movieId) || val.movieObj;
      if (found) {
        result.push({
          ...found,
          progressPercent: val.progressPercent,
          currentEpisode: val.currentEpisode
        });
      }
    });

    return result;
  }, [activeUser, moviesList]);

  const homeFavorites = useMemo(() => activeUser?.favorites || [], [activeUser?.favorites]);

  const regularMoviesList = useMemo(() => {
    return moviesList.filter(m => m.type === 'movie' && !isAnimeItem(m));
  }, [moviesList, isAnimeItem]);

  const regularSeriesList = useMemo(() => {
    return moviesList.filter(m => m.type === 'series' && !isAnimeItem(m));
  }, [moviesList, isAnimeItem]);

  const genreFilteredMoviesList = useMemo(() => {
    if (activeUser?.favoriteGenres && activeUser.favoriteGenres.length > 0) {
      return moviesList.filter(m => Array.isArray(m.genres) && m.genres.some(g => activeUser.favoriteGenres!.includes(g)));
    }
    return moviesList;
  }, [moviesList, activeUser?.favoriteGenres]);

  const featuredBillboardList = moviesList.filter(m => m.isPopular);

  if (isBlockedAccount) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#080808] text-[#FAFAFA] font-sans p-6 text-center">
        <div className="max-w-md w-full bg-[#121212] border border-[#FF3040]/40 rounded-[20px] p-8 space-y-6 shadow-2xl relative overflow-hidden">
          {/* Акцентна червона лінія бренду */}
          <div className="absolute top-0 inset-x-0 h-1.5 bg-[#FF3040] shadow-[0_0_12px_rgba(255,48,64,0.5)]"></div>
          
          <ShieldAlert className="w-16 h-16 text-[#FF3040] mx-auto animate-pulse" />
          
          <div className="space-y-2">
            <h2 className="font-display font-black text-xl md:text-2xl text-[#FAFAFA] uppercase tracking-wider">
              {language === 'UA' ? 'Обліковий Запис Заблоковано' : 'Account Blocked'}
            </h2>
            <p className="text-[#A3A3A3] text-xs md:text-sm font-sans leading-relaxed">
              {language === 'UA' 
                ? 'Ваш профіль було заблоковано адміністрацією Cinema Nova за порушення правил користування сервісом.'
                : 'Your profile has been blocked by the Cinema Nova administration for violating the service terms of use.'}
            </p>
          </div>

          <p className="text-[10px] text-[#A3A3A3] italic bg-[#080808]/60 py-2.5 px-4 rounded-[12px] border border-[#2A2A2A] leading-normal">
            {language === 'UA'
              ? 'Якщо Ви вважаєте, що це сталося помилково, будь ласка, зверніться в службу технічної підтримки.'
              : 'If you believe this is a mistake, please contact our support team.'}
          </p>

          <button
            onClick={() => {
              setIsBlockedAccount(false);
              handleSignOut();
            }}
            className="w-full py-3 bg-[#FF3040] hover:bg-[#FF4D5C] text-white font-sans font-bold text-xs uppercase tracking-widest rounded-[12px] transition duration-300 cursor-pointer"
          >
            {language === 'UA' ? 'Зрозуміло (Вийти з профілю)' : 'Understood (Sign Out)'}
          </button>
        </div>
      </div>
    );
  }

  if (isInitialAppLoading) {
    return <HomePreloader fullscreen={true} />;
  }

  if (!activeUser && (activeTab === 'home' || activeTab === 'welcome')) {
    return (
      <Suspense fallback={<HomePreloader fullscreen={true} />}>
        <WelcomePage
          movies={moviesList.length > 0 ? moviesList : INITIAL_MOVIES}
          onOpenAuth={(mode, initialEmail) => {
            setAuthInitialTab(mode === 'register' ? 'signup' : 'signin');
            setAuthInitialEmail(initialEmail || '');
            setAuthInitialRecoveryStep('email');
            setIsAuthOpen(true);
          }}
          onBrowseMovies={() => handleNavigateToTab('new')}
        />
        <AuthModal
          isOpen={isAuthOpen}
          onClose={() => setIsAuthOpen(false)}
          initialTab={authInitialTab}
          initialEmail={authInitialEmail}
          initialRecoveryStep={authInitialRecoveryStep}
          onAuthSuccess={(user, isNewRegistration) => {
            setActiveUser(user);
            saveState('active_user', user);
            
            try {
              const savedNovaStr = localStorage.getItem('nova_users');
              if (savedNovaStr) {
                const novaUsers = JSON.parse(savedNovaStr);
                if (Array.isArray(novaUsers)) {
                  const uEmail = (user?.email || '').trim().toLowerCase();
                  const exists = novaUsers.some((u: any) => (u.email || '').trim().toLowerCase() === uEmail);
                  if (!exists) {
                    novaUsers.push({
                      id: user.id || 'usr_' + uEmail.replace(/[@.]/g, '_'),
                      name: user.name,
                      email: user.email,
                      plan: user.plan || 'Standard',
                      status: 'Активний',
                      joined: user.joined || new Date().toLocaleDateString('uk-UA'),
                      role: user.role || (uEmail.includes('admin') ? 'admin' : 'user'),
                      avatarUrl: user.avatarUrl,
                      isBlocked: false
                    });
                    localStorage.setItem('nova_users', JSON.stringify(novaUsers));
                  }
                }
              }
            } catch (e) {
              console.error("Failed to append new user to nova_users on login:", e);
            }

            if (isNewRegistration) {
              setActiveTab('favorite-genres');
            } else {
              setActiveTab('home');
            }
          }}
        />
      </Suspense>
    );
  }

  if (activeTab === 'favorite-genres') {
    return (
      <Suspense fallback={<HomePreloader fullscreen={true} />}>
        <FavoriteGenresView
          user={activeUser}
          initialSelectedGenres={activeUser?.favoriteGenres}
          isInitialOnboarding={!activeUser?.favoriteGenres || activeUser.favoriteGenres.length === 0}
          onComplete={(selectedGenres) => {
            if (activeUser) {
              const updatedUser: UserProfile = {
                ...activeUser,
                favoriteGenres: selectedGenres,
              };
              handleUpdateUser(updatedUser);
            }
            handleNavigateToTab('home');
          }}
          onCancel={() => {
            handleNavigateToTab(activeUser ? 'settings' : 'home');
          }}
        />
      </Suspense>
    );
  }

  return (
    <div id="cinema-nova-root" className="h-screen bg-[#080808] text-[#FAFAFA] font-sans flex flex-col relative overflow-hidden">
      
      {/* Фонове атмосферне освітлення на весь екран */}
      {activeTab === 'home' && !playingMovie && (
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none">
          <img
            src="/effects/HomeBack.webp"
            alt=""
            decoding="async"
            className="absolute inset-0 w-full h-full object-cover object-top pointer-events-none select-none opacity-90"
            onError={(e) => {
              const target = e.currentTarget as HTMLImageElement;
              if (!target.src.endsWith('.webp')) {
                target.src = '/effects/HomeBack.webp';
              }
            }}
          />
          {/* Темний градієнтний оверлей для бездоганної читабельності тексту */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#080808]/15 via-transparent to-[#080808]/85 pointer-events-none" />
          {/* М'яке віньєтування по краях екрана */}
          <div className="absolute top-0 bottom-0 left-0 w-24 bg-gradient-to-r from-[#080808]/70 to-transparent pointer-events-none" />
          {/* Червоне неонове світіння фону */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-screen h-[900px] bg-radial from-[#800A15]/35 via-transparent to-transparent pointer-events-none blur-3xl" />
        </div>
      )}

      {/* Верхня шапка сайту (Header) */}
      <Header
        movies={moviesList}
        user={activeUser}
        onOpenAuth={() => setIsAuthOpen(true)}
        onSelectMovie={handleSelectMovie}
        onSignOut={handleSignOut}
        activeTab={activeTab}
        setActiveTab={handleNavigateToTab}
        onMobileMenuOpen={() => setIsMobileMenuOpen(true)}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        isHidden={isHeaderHidden || isMobileMenuOpen}
        onUpdateUser={(updated) => {
          setActiveUser(updated);
          saveState('active_user', updated);
        }}
        onJoinWatchParty={(roomId) => {
          const targetMovie = moviesList.find(m => m.id === 'dune-part-two-2024') || moviesList[0];
          if (targetMovie) {
            handleStartWatchParty(targetMovie, { roomId });
          }
        }}
      />

      {/* Основний робочий макет під шапкою сайту */}
      <div className="flex flex-1 min-h-0 relative overflow-hidden z-30">
        {/* Ліва бічна панель навігації (Sidebar) */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={handleNavigateToTab}
          user={activeUser}
          onOpenAuth={() => setIsAuthOpen(true)}
          isAdmin={isAdminMode}
          setIsAdmin={setIsAdminMode}
          className="hidden md:flex"
          isHeaderHidden={isHeaderHidden}
        />

        {/* Мобільне висувне меню навігації */}
        {isMobileMenuOpen && (
          <div 
            onClick={() => setIsMobileMenuOpen(false)}
            className="fixed inset-0 z-[60] bg-black/80 md:hidden"
          >
            <div 
              onClick={(e) => e.stopPropagation()}
              className="w-64 h-full animate-slide-in-right"
            >
              <Sidebar
                activeTab={activeTab}
                setActiveTab={handleNavigateToTab}
                user={activeUser}
                onOpenAuth={() => setIsAuthOpen(true)}
                isAdmin={isAdminMode}
                setIsAdmin={setIsAdminMode}
                onMobileClose={() => setIsMobileMenuOpen(false)}
              />
            </div>
          </div>
        )}

        {/* Головний робочий контейнер сторінки */}
        <main 
          onScroll={handleMainScroll}
          className="flex-1 flex flex-col min-w-0 h-full overflow-y-auto no-scrollbar scrollbar-none"
        >
          {!isOnline && (
            <div className="bg-red-950/40 border-y border-red-900/50 text-red-200 px-4 py-2.5 text-xs font-semibold flex items-center justify-between gap-3 animate-pulse shrink-0">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500"></span>
                <span>{t.offlineBanner}</span>
              </div>
              <button 
                onClick={() => handleNavigateToTab('offline')}
                className="px-3 py-1 bg-red-900/40 hover:bg-red-800/40 rounded-lg text-[10px] uppercase font-bold text-white tracking-wider border border-red-800/30 transition-all cursor-pointer"
              >
                {t.goToDownloads}
              </button>
            </div>
          )}

          {/* Відступи контенту від фіксованої шапки */}
          <div className={`${activeTab === 'details' ? 'px-0' : 'px-4'} md:pl-[148px] md:pr-6 lg:pr-8 pt-20 md:pt-[141px] pb-10 md:pb-12 flex-1 space-y-6 md:space-y-8`}>
          
          {/* Відображення повноекранного кінематографічного відеоплеєра */}
          {playingMovie ? (<>
            <div className="w-full max-w-[1430px] mx-auto space-y-5 animate-fade-in">
              {/* Кнопка повернення з відеоплеєра до картки фільму/серіалу */}
              <div className="flex items-center">
                <button
                  onClick={() => {
                    setPlayingMovie(null);
                  }}
                  className="group inline-flex items-center gap-2 text-sm font-semibold text-zinc-400 hover:text-white transition-colors cursor-pointer py-1 select-none"
                >
                  <ChevronLeft className="w-4 h-4 transition-transform duration-200 group-hover:-translate-x-1" />
                  <span>
                    {playingMovie.type === 'series'
                      ? (language === 'UA' ? 'Назад до серіалу' : 'Back to Series')
                      : (language === 'UA' ? 'Назад до фільму' : 'Back to Movie')}
                  </span>
                </button>
              </div>

              <Suspense fallback={
                <div className="flex flex-col items-center justify-center py-20">
                  <Loader2 className="w-10 h-10 text-[#FF3040] animate-spin" />
                  <span className="text-xs uppercase font-extrabold tracking-widest text-zinc-400 mt-3 animate-pulse">
                    {language === 'UA' ? 'Завантаження відеоплеєра...' : 'Loading video player...'}
                  </span>
                </div>
              }>
                <VideoPlayer
                  movie={playingMovie}
                  onBack={() => setPlayingMovie(null)}
                  onTrackHistory={handleTrackProgress}
                  initialSeason={initialSeason}
                  initialEpisode={initialEpisode}
                  initialVoiceover={initialVoiceover}
                  isAdmin={isAdminMode || activeUser?.role === 'admin'}
                  onMoviesChange={handleUpdateMoviesList}
                  onUpdateMovie={(updated) => {
                    setPlayingMovie(updated);
                    const updatedList = moviesList.map(m => m.id === updated.id ? updated : m);
                    setMoviesList(updatedList);
                    saveState('movies_db', updatedList);
                  }}
                />
              </Suspense>

              {/* Рядок рекомендацій схожого контенту */}
              {(() => {
                const playingGenres = Array.isArray(playingMovie.genres) ? playingMovie.genres : [];
                const isPlayingAnime = playingGenres.includes('Аніме');
                const similarList = moviesList
                  .filter(m => {
                    if (m.id === playingMovie.id) return false;
                    const isMAnime = Array.isArray(m.genres) && m.genres.includes('Аніме');
                    if (isPlayingAnime) {
                      return isMAnime;
                    } else {
                      return !isMAnime;
                    }
                  })
                  .filter(m => Array.isArray(m.genres) && m.genres.some(g => playingGenres.includes(g)))
                  .slice(0, 5);

                if (similarList.length === 0) return null;

                return (
                  <div className="space-y-4 pt-4 border-t border-zinc-900/60 animate-fade-in">
                    <div className="flex items-center justify-between">
                      <h3 className="font-display font-black text-xs md:text-sm text-white uppercase tracking-wider flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-[#E50914] rounded-full animate-pulse"></span>
                        {language === 'UA' ? 'Схожий контент за жанрами' : 'Similar Content by Genres'}
                      </h3>
                      <span className="text-[10px] text-zinc-550 font-bold uppercase tracking-widest font-mono">
                        {language === 'UA' ? 'Рекомендації' : 'Recommended'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 lg:gap-5 xl:gap-[30px] w-full">
                      {similarList.map((similar) => {
                        const titleText = language === 'ENG' && similar.titleEn ? similar.titleEn : similar.title;
                        const ratingVal = typeof similar.rating === 'number' ? similar.rating.toFixed(1) : (similar.rating || '8.0');
                        const descText = language === 'ENG' && similar.descriptionEn ? similar.descriptionEn : (similar.description || (language === 'UA' ? 'Захоплююча кіноісторія, сповнена несподіваних поворотів долі та незабутніх емоцій.' : 'A captivating story.'));

                        return (
                          <div
                            key={similar.id}
                            onClick={() => {
                              setPlayingMovie(null);
                              handleSelectMovie(similar);
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            className="w-full shrink-0 bg-[#121212] border border-white/10 rounded-[16px] overflow-hidden shadow-xl hover:shadow-[0_0_28px_rgba(255,48,64,0.35)] hover:border-white/30 transition-all duration-300 ease-out cursor-pointer group/card group relative aspect-poster aspect-[262/398.27] select-none text-left"
                          >
                            <div className="relative w-full h-full overflow-hidden bg-[#121212]">
                              {/* Чітке зображення постера */}
                              <img
                                src={validatePosterUrl(similar.posterUrl, similar.title, similar.type, similar.genres)}
                                alt={similar.title}
                                className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
                                loading="lazy"
                                referrerPolicy="no-referrer"
                                onError={(e) => handlePosterError(e, similar.posterUrl, similar.title, similar.type, similar.genres, similar.year, similar.titleEn, similar.originalTitle)}
                              />

                              {/* Віньєтний оверлей на картці */}
                              <div className="absolute inset-0 pointer-events-none z-10 bg-gradient-to-r from-black/40 via-transparent to-black/40 shadow-[inset_0_0_24px_rgba(0,0,0,0.6)]" />

                              {/* Скляний бейдж рейтингу у верхньому лівому кутку */}
                              <div
                                className="absolute top-3 left-3 text-white px-3.5 py-1.5 rounded-[10px] text-xs font-semibold flex items-center gap-1.5 z-30 transition-all pointer-events-none bg-black/35 backdrop-blur-md border border-white/15 shadow-sm group-hover:bg-white/10 group-hover:border-white/25 duration-300"
                              >
                                <Star className="w-3.5 h-3.5 fill-[#FF3040] text-[#FF3040] shrink-0" />
                                <span className="text-white font-bold text-xs tracking-tight">{ratingVal}</span>
                              </div>

                              {/* Скляний бейдж вікового обмеження у верхньому правому кутку */}
                              <div
                                className="absolute top-3 right-3 text-white px-3.5 py-1.5 rounded-[10px] text-xs font-semibold z-30 transition-all pointer-events-none flex items-center justify-center bg-black/35 backdrop-blur-md border border-white/15 shadow-sm group-hover:bg-white/10 group-hover:border-white/25 duration-300"
                              >
                                <span className="text-white font-bold text-xs tracking-tight">{similar.ageRating || '16+'}</span>
                              </div>

                              {/* Скляний блік поверхні картки */}
                              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-white/15 pointer-events-none mix-blend-overlay z-15" />

                              {/* Матова нижня панель із коротfield описом при наведенні */}
                              <div className="absolute inset-x-0 bottom-0 z-20 flex flex-col justify-start p-3.5 sm:px-4 sm:pt-[22px] sm:pb-4 bg-gradient-to-t from-black/95 via-black/80 to-transparent backdrop-blur-[10px] pointer-events-none transition-all duration-300 ease-out">
                                <h4 className="font-sans font-bold text-white text-[15px] sm:text-[17px] leading-tight line-clamp-2 w-full sm:w-[239px] sm:max-w-full sm:h-[42px] text-left drop-shadow-md">
                                  {titleText}
                                </h4>

                                <div className="flex items-center text-[10.5px] sm:text-[11.5px] text-zinc-300 font-normal w-full whitespace-nowrap overflow-hidden font-sans text-left mt-1.5 sm:mt-[22px] drop-shadow-sm gap-1.5">
                                  {similar.genres?.slice(0, 2).map((genre, idx) => (
                                    <React.Fragment key={genre}>
                                      {idx > 0 && <span className="w-1 h-1 rounded-full bg-[#FF3040] inline-block shrink-0" />}
                                      <span className="text-zinc-300 truncate">{translateGenre(genre, language)}</span>
                                    </React.Fragment>
                                  ))}
                                  <span className="w-1 h-1 rounded-full bg-[#FF3040] inline-block shrink-0" />
                                  <span className="text-zinc-400 shrink-0">{similar.year}</span>
                                </div>

                                {/* Розкриття короткого опису при наведенні курсора */}
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
                      })}
                    </div>
                  </div>
                );
              })()}
            </div>
          </>) : (
            <div key={activeTab} className="animate-tab-fade">
              {/* Модальне вікно детальної інформації про фільм */}
              {activeTab === 'details' && selectedMovie && (
                <div className="relative">
                  {isFetchingDetails && (
                    <div className="absolute inset-0 bg-black/55 backdrop-blur-xs z-50 flex flex-col items-center justify-center rounded-3xl min-h-[400px]">
                      <Loader2 className="w-10 h-10 text-[#E50914] animate-spin" />
                      <span className="text-xs uppercase font-extrabold tracking-widest text-zinc-400 mt-3 animate-pulse">
                        {language === 'UA' ? 'Завантаження деталей з TMDB...' : 'Loading details from TMDB...'}
                      </span>
                    </div>
                  )}
                  <Suspense fallback={<ViewSkeleton type="generic" title={language === 'UA' ? 'Завантаження...' : 'Loading...'} />}>
                    {(() => {
                      const isSeriesOrAnime =
                        selectedMovie.type === 'series' ||
                        selectedMovie.type === 'anime' ||
                        (selectedMovie.genres && (selectedMovie.genres.includes('Аніме') || selectedMovie.genres.includes('Серіал') || selectedMovie.genres.includes('Дорама'))) ||
                        (selectedMovie.seasonsData && selectedMovie.seasonsData.length > 0) ||
                        Boolean(selectedMovie.episodesData && Object.keys(selectedMovie.episodesData).length > 0) ||
                        selectedMovie.id.includes('marianne');

                      if (isSeriesOrAnime) {
                        return (
                          <SeriesDetails
                            movie={selectedMovie}
                            allMovies={moviesList}
                            user={activeUser}
                            onBack={() => {
                              setActiveTab(previousTab || 'home');
                              setSelectedMovie(null);
                            }}
                            onPlay={(movie, season, episode) => handlePlayMovie(movie, season, episode)}
                            onSelectMovie={handleSelectMovie}
                            onOpenAuth={() => setIsAuthOpen(true)}
                            onWatchTogether={(movieId, options) => {
                              const targetMovie = moviesList.find(x => x.id === movieId) || selectedMovie;
                              if (movieId) {
                                addWatchPartyMovieId(movieId, activeUser?.id);
                              }
                              if (options && targetMovie) {
                                handleStartWatchParty(targetMovie, options);
                              } else {
                                setSelectedMovie(null);
                                setActiveTab('watchparty');
                              }
                            }}
                            onDownload={(movie, episodeInfo) => handleStartDownload(movie, episodeInfo)}
                            downloads={downloads}
                          />
                        );
                      }

                      return (
                        <MovieDetails
                          movie={selectedMovie}
                          allMovies={moviesList}
                          user={activeUser}
                          onBack={() => {
                            setActiveTab(previousTab || 'home');
                            setSelectedMovie(null);
                          }}
                          onPlay={() => handlePlayMovie(selectedMovie)}
                          onSelectMovie={handleSelectMovie}
                          onOpenAuth={() => setIsAuthOpen(true)}
                          onWatchTogether={(movieId, options) => {
                            const targetMovie = moviesList.find(x => x.id === movieId) || selectedMovie;
                            if (movieId) {
                              addWatchPartyMovieId(movieId, activeUser?.id);
                            }
                            if (options && targetMovie) {
                              handleStartWatchParty(targetMovie, options);
                            } else {
                              setSelectedMovie(null);
                              setActiveTab('watchparty');
                            }
                          }}
                          onDownload={(movie, episodeInfo) => handleStartDownload(movie, episodeInfo)}
                          downloads={downloads}
                        />
                      );
                    })()}
                  </Suspense>
                </div>
              )}

              {/* Вміст головної сторінки сайту */}
              {activeTab === 'home' && (
                <Suspense fallback={<HomePreloader />}>
                  <HomeView
                    movies={moviesList}
                    continueWatchingMovies={continueWatchingMovies}
                    personalizedRecommendations={personalizedRecommendations}
                    onSelectMovie={handleSelectMovie}
                    onPlayMovie={handlePlayMovie}
                    setActiveTab={setActiveTab}
                    onToggleFavorite={handleToggleFavorite}
                    favorites={homeFavorites}
                  />
                </Suspense>
              )}

              {/* Вкладка інтерактивного пошуку */}
              {activeTab === 'search' && (
                <Suspense fallback={<ViewSkeleton type="generic" title={language === 'UA' ? 'Пошук...' : 'Searching...'} />}>
                  <SearchView
                    movies={moviesList}
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                    onSelectMovie={handleSelectMovie}
                    onPlayMovie={handlePlayMovie}
                    user={activeUser}
                    onUpdateUser={(u) => {
                      setActiveUser(u);
                      saveState('active_user', u);
                    }}
                    onOpenAuth={() => setIsAuthOpen(true)}
                  />
                </Suspense>
              )}

              {/* Вкладка трендів та гучних прем'єр */}
              {activeTab === 'trending' && (
                <Suspense fallback={<ViewSkeleton type="grid" title={language === 'UA' ? 'Трендове зараз' : 'Trending Now'} />}>
                  <MovieGrid
                    movies={trendingMoviesAndSeries}
                    onSelectMovie={handleSelectMovie}
                    onPlayMovie={handlePlayMovie}
                    title={language === 'UA' ? 'Трендове зараз' : 'Trending Now'}
                    subtitle={language === 'UA' ? 'Те, що зараз найбільше дивляться та обговорюють в інтернеті серед фільмів і серіалів.' : 'What is currently trending the most among movies and series on the internet.'}
                    showFilters={true}
                  />
                </Suspense>
              )}

              {/* Сітка повного каталогу фільмів та серіалів */}
              {activeTab === 'movies' && (
                <Suspense fallback={<ViewSkeleton type="grid" title={language === 'UA' ? 'Фільми' : 'Movies'} />}>
                  <MovieGrid
                    movies={regularMoviesList}
                    onSelectMovie={handleSelectMovie}
                    onPlayMovie={handlePlayMovie}
                    title={language === 'UA' ? 'Фільми' : 'Movies'}
                    subtitle={language === 'UA' ? 'Знаходь улюблені фільми, відкривай нові історії та насолоджуйся переглядом.' : 'Find your favorite movies, discover new stories and enjoy watching.'}
                    showFilters={true}
                  />
                </Suspense>
              )}

              {activeTab === 'popular-movies' && (
                <Suspense fallback={<ViewSkeleton type="grid" title={language === 'UA' ? 'Популярні фільми' : 'Popular Movies'} />}>
                  <MovieGrid
                    movies={popularMoviesOnly}
                    onSelectMovie={handleSelectMovie}
                    onPlayMovie={handlePlayMovie}
                    title={language === 'UA' ? 'Популярні фільми' : 'Popular Movies'}
                    subtitle={language === 'UA' ? 'Найпопулярніші кінофільми, які захоплюють мільйони глядачів.' : 'The most popular films captivating millions of viewers.'}
                    showFilters={true}
                  />
                </Suspense>
              )}

              {activeTab === 'series' && (
                <Suspense fallback={<ViewSkeleton type="grid" title={language === 'UA' ? 'Серіали' : 'TV Series'} />}>
                  <MovieGrid
                    movies={regularSeriesList}
                    onSelectMovie={handleSelectMovie}
                    onPlayMovie={handlePlayMovie}
                    title={language === 'UA' ? 'Серіали' : 'TV Series'}
                    subtitle={language === 'UA' ? 'Знаходь улюблені фільми, відкривай нові історії та насолоджуйся переглядом.' : 'Find your favorite movies, discover new stories and enjoy watching.'}
                    showFilters={true}
                  />
                </Suspense>
              )}

              {activeTab === 'popular-series' && (
                <Suspense fallback={<ViewSkeleton type="grid" title={language === 'UA' ? 'Популярні серіали' : 'Popular Series'} />}>
                  <MovieGrid
                    movies={popularSeriesOnly}
                    onSelectMovie={handleSelectMovie}
                    onPlayMovie={handlePlayMovie}
                    title={language === 'UA' ? 'Популярні серіали' : 'Popular Series'}
                    subtitle={language === 'UA' ? 'Найпопулярніші багатосерійні історії та телевізійні шоу.' : 'The most popular TV series and multi-episode shows.'}
                    showFilters={true}
                  />
                </Suspense>
              )}

              {activeTab === 'doramas' && (
                <Suspense fallback={<ViewSkeleton type="grid" title={language === 'UA' ? 'Дорами' : 'Doramas'} />}>
                  <DoramasView
                    onSelectMovie={handleSelectMovie}
                    onPlayMovie={handlePlayMovie}
                  />
                </Suspense>
              )}

              {activeTab === 'popular-doramas' && (
                <Suspense fallback={<ViewSkeleton type="grid" title={language === 'UA' ? 'Популярні дорами' : 'Popular Doramas'} />}>
                  <MovieGrid
                    movies={popularDoramasOnly}
                    onSelectMovie={handleSelectMovie}
                    onPlayMovie={handlePlayMovie}
                    title={language === 'UA' ? 'Популярні дорами' : 'Popular Doramas'}
                    subtitle={language === 'UA' ? 'Найпопулярніші корейські та азійські дорами з високим рейтингом.' : 'The most popular Korean and Asian doramas with top ratings.'}
                    showFilters={true}
                  />
                </Suspense>
              )}

              {activeTab === 'anime' && (
                <Suspense fallback={<ViewSkeleton type="grid" title={language === 'UA' ? 'Аніме' : 'Anime'} />}>
                  <MovieGrid
                    movies={animeMovies}
                    onSelectMovie={handleSelectMovie}
                    onPlayMovie={handlePlayMovie}
                    title={language === 'UA' ? 'Аніме' : 'Anime'}
                    subtitle={language === 'UA' ? 'Знаходь улюблені фільми, відкривай нові історії та насолоджуйся переглядом.' : 'Find your favorite movies, discover new stories and enjoy watching.'}
                    showFilters={true}
                  />
                </Suspense>
              )}

              {activeTab === 'popular-anime' && (
                <Suspense fallback={<ViewSkeleton type="grid" title={language === 'UA' ? 'Популярні аніме' : 'Popular Anime'} />}>
                  <MovieGrid
                    movies={popularAnimeOnly}
                    onSelectMovie={handleSelectMovie}
                    onPlayMovie={handlePlayMovie}
                    title={language === 'UA' ? 'Популярні аніме' : 'Popular Anime'}
                    subtitle={language === 'UA' ? 'Найпопулярніші шедеври японської анімації та хітові серіали.' : 'The most popular Japanese animation masterpieces and hit series.'}
                    showFilters={true}
                  />
                </Suspense>
              )}

              {activeTab === 'new' && (
                <Suspense fallback={<ViewSkeleton type="grid" title={language === 'UA' ? 'Новинки' : 'New Releases'} />}>
                  <MovieGrid
                    movies={newMovies}
                    onSelectMovie={handleSelectMovie}
                    onPlayMovie={handlePlayMovie}
                    title={language === 'UA' ? 'Новинки' : 'New Releases'}
                    subtitle={language === 'UA' ? 'Знаходь улюблені фільми, відкривай нові історії та насолоджуйся переглядом.' : 'Find your favorite movies, discover new stories and enjoy watching.'}
                    showFilters={true}
                  />
                </Suspense>
              )}

              {activeTab === 'popular' && (
                <Suspense fallback={<ViewSkeleton type="grid" title={language === 'UA' ? 'Популярні' : 'Popular'} />}>
                  <MovieGrid
                    movies={popularMovies}
                    onSelectMovie={handleSelectMovie}
                    onPlayMovie={handlePlayMovie}
                    title={language === 'UA' ? 'Популярні' : 'Popular'}
                    subtitle={language === 'UA' ? 'Знаходь улюблені фільми, відкривай нові історії та насолоджуйся переглядом.' : 'Find your favorite movies, discover new stories and enjoy watching.'}
                    showFilters={true}
                  />
                </Suspense>
              )}

              {activeTab === 'genres' && (
                <Suspense fallback={<ViewSkeleton type="grid" title={language === 'UA' ? 'Жанрові добірки' : 'Genre Collections'} />}>
                  {activeUser && (!activeUser.favoriteGenres || activeUser.favoriteGenres.length === 0) ? (
                    <div className="space-y-6 pt-1 font-sans animate-in fade-in duration-200">
                      <div>
                        <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-white tracking-tight">
                          {language === 'UA' ? 'Жанрові добірки' : 'Genre Collections'}
                        </h1>
                        <p className="text-xs sm:text-sm text-[#A3A3A3] font-sans mt-0.5 sm:mt-1">
                          {language === 'UA' ? 'Персоналізовані добірки фільмів на основі ваших улюблених жанрів.' : 'Personalized movie collections based on your favorite genres.'}
                        </p>
                      </div>

                      <div className="pt-2 pb-64 sm:pb-80 md:pb-96 flex-1 text-left">
                        <p className="text-xs sm:text-sm text-zinc-300 font-medium font-sans mt-2">
                          {language === 'UA'
                            ? "У вас ще немає обраних улюблених жанрів. Оберіть жанри, щоб отримувати персоналізовані добірки фільмів."
                            : "You don't have any favorite genres selected yet. Select genres to receive personalized movie recommendations."}
                        </p>
                        <button
                          onClick={() => {
                            setActiveTab('favorite-genres');
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          className="mt-6 px-6 py-2.5 rounded-full border border-[#FAFAFA] bg-transparent hover:bg-white/10 text-white text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer"
                        >
                          {language === 'UA' ? 'Обрати жанри' : 'Select Genres'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <MovieGrid
                      movies={genreFilteredMoviesList}
                      onSelectMovie={handleSelectMovie}
                      onPlayMovie={handlePlayMovie}
                      title={language === 'UA' ? 'Жанрові добірки та каталогізація' : 'Genre Collections'}
                      subtitle={language === 'UA' ? 'Знаходьте кіно за конкретними настроями та категоріями' : 'Find films matching specific moods and categories'}
                      showFilters={true}
                    />
                  )}
                </Suspense>
              )}

              {/* Вкладка збереженого контенту (Мій список) */}
              {activeTab === 'mylist' && (
                <Suspense fallback={<ViewSkeleton type="grid" title={language === 'UA' ? 'Мій список' : 'My List'} />}>
                  <MyList
                    user={activeUser}
                    allMovies={moviesList}
                    onSelectMovie={handleSelectMovie}
                    onPlayMovie={handlePlayMovie}
                    onOpenAuth={() => setIsAuthOpen(true)}
                    onToggleFavorite={handleToggleFavorite}
                    onUpdateUser={handleUpdateUser}
                  />
                </Suspense>
              )}

              {/* Вкладка офлайн-завантажень */}
              {(activeTab === 'downloads' || activeTab === 'offline') && (
                <Suspense fallback={<ViewSkeleton type="generic" title={language === 'UA' ? 'Завантаження' : 'Downloads'} />}>
                  <DownloadsView
                    downloads={downloads}
                    onPlayMovie={handlePlayMovie}
                    onSelectMovie={handleSelectMovie}
                    onRemoveDownload={handleRemoveDownload}
                    onTogglePauseDownload={handleTogglePauseDownload}
                    onClearAllDownloads={handleClearAllDownloads}
                    allMovies={moviesList}
                    onNavigateToCatalog={() => setActiveTab('movies')}
                  />
                </Suspense>
              )}

              {/* Вкладка історії переглядів */}
              {activeTab === 'history' && (
                <Suspense fallback={<ViewSkeleton type="generic" title={language === 'UA' ? 'Історія переглядів' : 'Watch History'} />}>
                  <WatchHistoryView
                    user={activeUser}
                    movies={moviesList}
                    onPlayMovie={handlePlayMovie}
                    onSelectMovie={handleSelectMovie}
                    onOpenAuth={() => setIsAuthOpen(true)}
                    onUpdateUser={handleUpdateUser}
                  />
                </Suspense>
              )}

              {/* Лобі або активна кімната спільного перегляду Watch Party */}
              {(activeTab === 'watchparty' || activeTab === 'party') && (
                <Suspense fallback={<ViewSkeleton type="generic" title={language === 'UA' ? 'Сумісний перегляд' : 'Watch Party'} />}>
                  {activeWatchPartyRoom ? (
                    <ActiveWatchPartyRoom
                      movie={activeWatchPartyRoom.movie}
                      user={activeUser}
                      roomConfig={activeWatchPartyRoom.roomConfig}
                      allMovies={moviesList}
                      isAdmin={isAdminMode || activeUser?.role === 'admin'}
                      onTrackHistory={handleTrackProgress}
                      onMoviesChange={handleUpdateMoviesList}
                      onUpdateMovie={(updated) => {
                        setActiveWatchPartyRoom({ movie: updated, roomConfig: activeWatchPartyRoom.roomConfig });
                        const updatedList = moviesList.map(m => m.id === updated.id ? updated : m);
                        setMoviesList(updatedList);
                        saveState('movies_db', updatedList);
                      }}
                      onLeaveRoom={() => {
                        setActiveWatchPartyRoom(null);
                        setInitialWatchPartyMovieId(null);
                      }}
                      onSelectMovie={(m) => {
                        setActiveWatchPartyRoom({ movie: m, roomConfig: activeWatchPartyRoom.roomConfig });
                      }}
                      onPlayMovie={handlePlayMovie}
                    />
                  ) : (
                    <WatchParty
                      movies={moviesList}
                      user={activeUser}
                      onOpenAuth={() => setIsAuthOpen(true)}
                      onSelectMovie={handleSelectMovie}
                      onNavigateToCatalog={() => setActiveTab('movies')}
                      initialMovieId={initialWatchPartyMovieId}
                      onClearInitialMovieId={() => setInitialWatchPartyMovieId(null)}
                      initialRoomId={initialWatchPartyRoomId}
                      onClearInitialRoomId={() => setInitialWatchPartyRoomId(null)}
                      onJoinActiveRoom={(movie, roomConfig) => {
                        handleStartWatchParty(movie, roomConfig);
                      }}
                    />
                  )}
                </Suspense>
              )}

              {/* Панель системної аналітики та адміністрування */}
              {activeTab === 'admin' && (
                <Suspense fallback={<ViewSkeleton type="generic" title={language === 'UA' ? 'Панель керування' : 'Admin Panel'} />}>
                  {activeUser?.role === 'admin' ? (
                    <AdminPanel
                      movies={moviesList}
                      onMoviesChange={handleUpdateMoviesList}
                      user={activeUser}
                      onSelectMovie={handleSelectMovie}
                      onPlayMovie={handlePlayMovie}
                    />
                  ) : (
                    <div className="py-20 text-center bg-[#151515] border border-red-950 rounded-3xl space-y-5 max-w-xl mx-auto px-6 shadow-2xl animate-fade-in my-8">
                      <ShieldAlert className="w-16 h-16 text-[#E50914] mx-auto animate-bounce" />
                      <h2 className="font-display font-black text-xl text-white uppercase tracking-wider">
                        {language === 'UA' ? 'Доступ Заборонено' : 'Access Denied'}
                      </h2>
                      <p className="text-zinc-400 text-sm max-w-sm mx-auto font-sans leading-relaxed">
                        {language === 'UA' 
                          ? 'Цей розділ призначений виключно для офіційних адміністраторів Cinema Nova. Звичайні користувачі не мають доступу до панелі керування сайтом.'
                          : 'This section is designed exclusively for Cinema Nova administrators. Regular users do not have access to the control panel.'}
                      </p>
                      <div className="pt-2">
                        <button 
                          onClick={() => handleNavigateToTab('home')} 
                          className="px-6 py-2.5 bg-[#E50914] hover:bg-red-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition duration-300 active:scale-95"
                        >
                          {language === 'UA' ? 'Повернутися на головну' : 'Return to Home'}
                        </button>
                      </div>
                    </div>
                  )}
                </Suspense>
              )}

              {/* Особистий профіль та налаштування */}
              {activeTab === 'profile' && activeUser && (
                <Suspense fallback={<ViewSkeleton type="generic" title={language === 'UA' ? 'Профіль' : 'Profile'} />}>
                  <ProfileView
                    user={activeUser}
                    movies={moviesList}
                    downloads={downloads}
                    onRemoveDownload={handleRemoveDownload}
                    onTogglePauseDownload={handleTogglePauseDownload}
                    onClearAllDownloads={handleClearAllDownloads}
                    onNavigateToCatalog={() => {
                      setActiveTab('movies');
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    onUpdateUser={handleUpdateUser}
                    onPlayMovie={handlePlayMovie}
                    onSelectMovie={handleSelectMovie}
                    onSignOut={handleSignOut}
                    mode="profile"
                    onOpenSettings={() => setActiveTab('settings')}
                    onOpenGenreSelection={() => setActiveTab('favorite-genres')}
                    onJoinActiveRoom={(movie, roomConfig) => {
                      handleStartWatchParty(movie, roomConfig);
                    }}
                    onOpenAuth={() => setIsAuthOpen(true)}
                  />
                </Suspense>
              )}

              {activeTab === 'settings' && activeUser && (
                <Suspense fallback={<ViewSkeleton type="generic" title={language === 'UA' ? 'Налаштування' : 'Settings'} />}>
                  <ProfileSettingsView
                    user={activeUser}
                    onUpdateUser={handleUpdateUser}
                    onBackToProfile={() => setActiveTab('profile')}
                    onOpenGenreSelection={() => setActiveTab('favorite-genres')}
                    onRequestChangePassword={handleOpenPasswordReset}
                    onDeleteProfile={handleDeleteProfile}
                  />
                </Suspense>
              )}

              {/* Повідомлення про необхідність авторизації для доступу до профілю */}
              {(activeTab === 'profile' || activeTab === 'settings') && !activeUser && (
                <div className="py-20 text-center bg-[#151515] border border-white/10 rounded-3xl space-y-5 max-w-xl mx-auto px-6 shadow-2xl animate-fade-in my-8">
                  <div className="w-16 h-16 rounded-full bg-[#1F1F24] border border-white/10 flex items-center justify-center mx-auto text-[#FF3040]">
                    <User className="w-8 h-8" />
                  </div>
                  <h2 className="font-display font-bold text-xl text-white">
                    {language === 'UA' ? 'Потрібна авторизація' : 'Authentication Required'}
                  </h2>
                  <p className="text-zinc-400 text-sm max-w-sm mx-auto font-sans leading-relaxed">
                    {language === 'UA' 
                      ? 'Увійдіть або зареєструйтесь, щоб отримати доступ до налаштувань профілю, збереженого та історії.'
                      : 'Sign in or register to access profile settings, favorites, and watch history.'}
                  </p>
                  <div className="pt-2">
                    <button 
                      onClick={() => setIsAuthOpen(true)} 
                      className="px-6 py-2.5 bg-[#FF3040] hover:bg-red-600 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition duration-300 active:scale-95 cursor-pointer shadow-lg shadow-red-950/40"
                    >
                      {language === 'UA' ? 'Увійти в акаунт' : 'Sign In'}
                    </button>
                  </div>
                </div>
              )}

              {/* Інформаційні сторінки підвалу сайту */}
              {activeTab === 'faq' && (
                <Suspense fallback={<ViewSkeleton type="generic" title={language === 'UA' ? 'Популярні питання' : 'FAQ'} />}>
                  <FAQView onSelectMovie={handleSelectMovie} onNavigate={handleNavigateToTab} />
                </Suspense>
              )}

              {activeTab === 'ways-to-watch' && (
                <Suspense fallback={<ViewSkeleton type="generic" title={language === 'UA' ? 'Способи перегляду' : 'Ways to Watch'} />}>
                  <WaysToWatchView />
                </Suspense>
              )}

              {activeTab === 'privacy' && (
                <Suspense fallback={<ViewSkeleton type="generic" title={language === 'UA' ? 'Конфіденційність' : 'Privacy Policy'} />}>
                  <PrivacyPolicyView />
                </Suspense>
              )}

              {activeTab === 'corporate' && (
                <Suspense fallback={<ViewSkeleton type="generic" title={language === 'UA' ? 'Корпоративна інформація' : 'Corporate Info'} />}>
                  <CorporateInfoView />
                </Suspense>
              )}

              {activeTab === 'cookies' && (
                <Suspense fallback={<ViewSkeleton type="generic" title={language === 'UA' ? 'Налаштування файлів cookie' : 'Cookie Preferences'} />}>
                  <CookieSettingsView />
                </Suspense>
              )}

              {activeTab === 'legal' && (
                <Suspense fallback={<ViewSkeleton type="generic" title={language === 'UA' ? 'Юридичні повідомлення' : 'Legal Notices'} />}>
                  <LegalNoticesView />
                </Suspense>
              )}

              {activeTab === 'speedtest' && (
                <Suspense fallback={<ViewSkeleton type="generic" title={language === 'UA' ? 'Перевірка швидкості' : 'Speed Test'} />}>
                  <SpeedTestView onNavigateHome={() => setActiveTab('home')} />
                </Suspense>
              )}

              {activeTab === 'exclusives' && (
                <Suspense fallback={<ViewSkeleton type="generic" title={language === 'UA' ? 'Тільки на CINEMA NOVA' : 'Only on CINEMA NOVA'} />}>
                  <OnlyOnNovaView movies={moviesList} onSelectMovie={handleSelectMovie} onPlayMovie={handlePlayMovie} />
                </Suspense>
              )}

              {activeTab === 'mediacenter' && (
                <Suspense fallback={<ViewSkeleton type="generic" title={language === 'UA' ? 'Медіацентр' : 'Media Center'} />}>
                  <MediaCenterView />
                </Suspense>
              )}

              {activeTab === 'terms' && (
                <Suspense fallback={<ViewSkeleton type="generic" title={language === 'UA' ? 'Умови використання' : 'Terms of Use'} />}>
                  <TermsOfUseView />
                </Suspense>
              )}

              {/* Сторінка помилки 404 або відсутності сторінки */}
              {(!VALID_TABS.includes(activeTab) || activeTab === '404') && (
                <Suspense fallback={<ViewSkeleton type="generic" />}>
                  <NotFoundView
                    errorCode="404"
                    errorMessage={language === 'UA' ? 'Запитувану сторінку не знайдено або стрічка була пошкоджена під час трансляції.' : 'The requested page was not found or the broadcast was corrupted.'}
                    onGoHome={() => handleNavigateToTab('home')}
                    onGoOffline={() => handleNavigateToTab('offline')}
                    isOfflineMode={!isOnline}
                    movies={moviesList}
                    onSelectMovie={(movie) => {
                      handleSelectMovie(movie);
                    }}
                  />
                </Suspense>
              )}
            </div>
          )}

        </div>

        {/* Фірмовий підвал CINEMA NOVA (відображається на всіх сторінках) */}
        <FooterMain language={language} onNavigate={handleNavigateToTab} />
      </main>
      </div>

      {/* Глобальне спливаюче вікно входу та реєстрації */}
      <Suspense fallback={null}>
        <AuthModal
          isOpen={isAuthOpen}
          onClose={() => setIsAuthOpen(false)}
          initialTab={authInitialTab}
          initialEmail={authInitialEmail}
          initialRecoveryStep={authInitialRecoveryStep}
          onAuthSuccess={(user, isNewRegistration) => {
            setActiveUser(user);
            saveState('active_user', user);
            
            try {
              const savedNovaStr = localStorage.getItem('nova_users');
              if (savedNovaStr) {
                const novaUsers = JSON.parse(savedNovaStr);
                if (Array.isArray(novaUsers)) {
                  const uEmail = (user?.email || '').trim().toLowerCase();
                  const exists = novaUsers.some((u: any) => (u.email || '').trim().toLowerCase() === uEmail);
                  if (!exists) {
                    novaUsers.push({
                      id: user.id || 'usr_' + uEmail.replace(/[@.]/g, '_'),
                      name: user.name,
                      email: user.email,
                      plan: user.plan || 'Standard',
                      status: 'Активний',
                      joined: user.joined || new Date().toLocaleDateString('uk-UA'),
                      role: user.role || (uEmail.includes('admin') ? 'admin' : 'user'),
                      avatarUrl: user.avatarUrl,
                      isBlocked: false
                    });
                    localStorage.setItem('nova_users', JSON.stringify(novaUsers));
                  }
                }
              }
            } catch (e) {
              console.error("Failed to append new user to nova_users on login:", e);
            }

            if (isNewRegistration) {
              setActiveTab('favorite-genres');
            } else {
              setActiveTab('home');
            }
          }}
        />
      </Suspense>
    </div>
  );
}
