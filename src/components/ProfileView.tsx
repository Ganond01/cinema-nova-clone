import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  User, Mail, Award, Settings, Check, Clock, Trash2, Play, Heart, Star,
  Sparkles, Lock, ChevronDown, ChevronLeft, ChevronRight, Pencil, X, MapPin, Globe, Calendar, Users, ShieldAlert,
  FolderHeart, Share2, Film, Tv, RotateCcw, ArrowLeft
} from 'lucide-react';
import { UserProfile, Movie, HistoryItem } from '../types';
import { loadState, saveState, PRESET_AVATARS, GENRES } from '../data/movies';
import { useLanguage } from '../context/LanguageContext';
import { validatePosterUrl, handlePosterError } from '../utils/imageFallback';
import { getMovieTitle, getMovieDescription } from '../lib/translations';
import WatchHistoryView from './WatchHistoryView';
import DownloadsView from './DownloadsView';
import WatchParty from './WatchParty';
import { addProfileUpdateNotification } from '../services/notifications';
import { getWatchPartyMovieIds } from '../utils/watchPartyStorage';

export { getWatchPartyMovieIds };

interface ProfileViewProps {
  user: UserProfile;
  movies: Movie[];
  onUpdateUser: (updatedUser: UserProfile) => void;
  onPlayMovie: (movie: Movie) => void;
  onSelectMovie: (movie: Movie) => void;
  onSignOut: () => void;
  mode?: 'profile' | 'history';
  onOpenSettings?: () => void;
  onOpenGenreSelection?: () => void;
  downloads?: any[];
  onRemoveDownload?: (id: string) => void;
  onTogglePauseDownload?: (id: string) => void;
  onClearAllDownloads?: () => void;
  onNavigateToCatalog?: () => void;
  onJoinActiveRoom?: (movie: Movie, roomConfig?: any) => void;
  onOpenAuth?: () => void;
}

export interface UserAuthoredReview {
  id: string;
  movieId: string;
  movieTitle: string;
  movieTitleEn?: string;
  moviePoster: string;
  movieBackdrop?: string;
  movieYear?: number;
  movieRating?: number;
  movieGenres?: string[];
  movieType?: 'movie' | 'series' | 'anime';
  rating: number;
  comment: string;
  createdAt: string;
}

const DEFAULT_USER_REVIEWS: UserAuthoredReview[] = [
  {
    id: 'user_rev_1',
    movieId: 'dune-part-two-2024',
    movieTitle: 'Дюна: Частина друга',
    movieTitleEn: 'Dune: Part Two',
    moviePoster: 'https://image.tmdb.org/t/p/w500/8b8R8l88Qje9dn9OE8PY05Nxl1X.jpg',
    movieBackdrop: 'https://image.tmdb.org/t/p/w780/xOMo8BRK7PfcJv9JCnx7s520QIe.jpg',
    movieYear: 2024,
    movieRating: 8.6,
    movieGenres: ['Фантастика', 'Пригоди'],
    movieType: 'movie',
    rating: 8.6,
    comment: 'Масштаб, музика, візуал — просто неймовірно. Фільм буквально затягує у свій світ. Дивилася на одному подиху.',
    createdAt: '2 дні назад'
  },
  {
    id: 'user_rev_2',
    movieId: 'the-batman-2022',
    movieTitle: 'Бетмен',
    movieTitleEn: 'The Batman',
    moviePoster: 'https://image.tmdb.org/t/p/w500/74xTEgt7R36Fpooo50r9T25onhq.jpg',
    movieBackdrop: 'https://image.tmdb.org/t/p/w780/b0PlSFdDwbyK0cf5RxwDpaOJQvQ.jpg',
    movieYear: 2021,
    movieRating: 8.9,
    movieGenres: ['Бойовик', 'Кримінал', 'Детектив'],
    movieType: 'movie',
    rating: 8.9,
    comment: 'Темний, похмурий і дуже атмосферний. Сподобалася детективна складова та загальний стиль фільму. Місцями трохи затягнуто, але загалом дуже гідно.',
    createdAt: '5 днів назад'
  },
  {
    id: 'user_rev_3',
    movieId: 'stranger-things-s4',
    movieTitle: 'Дивні дива',
    movieTitleEn: 'Stranger Things',
    moviePoster: 'https://image.tmdb.org/t/p/w500/49WJfeN0moxb9IPfGn8AIqMGskD.jpg',
    movieBackdrop: 'https://image.tmdb.org/t/p/w780/56v2KjBlU4XaOv9rVYEQypROD7P.jpg',
    movieYear: 2022,
    movieRating: 8.7,
    movieGenres: ['Фантастика', 'Жахи', 'Драма'],
    movieType: 'series',
    rating: 8.7,
    comment: 'Неймовірний сезон, візуальні ефекти та атмосфера 80-х передані бездоганно. Векна як лиходій тримає в напрузі до останньої секунди.',
    createdAt: '1 тиждень тому'
  },
  {
    id: 'user_rev_4',
    movieId: 'interstellar-2014',
    movieTitle: 'Інтерстеллар',
    movieTitleEn: 'Interstellar',
    moviePoster: 'https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg',
    movieBackdrop: 'https://image.tmdb.org/t/p/w780/rAiYTsqzbmuCRPrDmBCbAQmBikn.jpg',
    movieYear: 2024,
    movieRating: 9.9,
    movieGenres: ['Фантастика', 'Драма', 'Пригоди'],
    movieType: 'movie',
    rating: 9.9,
    comment: 'Один із тих фільмів, після яких ще довго сидиш і думаєш про побачене. Емоційний, масштабний і неймовірно красивий. Саундтрек — окрема любов.',
    createdAt: '2 тижні тому'
  },
  {
    id: 'user_rev_5',
    movieId: 'oppenheimer-2023',
    movieTitle: 'Оппенгеймер',
    movieTitleEn: 'Oppenheimer',
    moviePoster: 'https://image.tmdb.org/t/p/w500/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg',
    movieBackdrop: 'https://image.tmdb.org/t/p/w780/rM5yQv52bBniM9tH1u6h0MekdZz.jpg',
    movieYear: 2023,
    movieRating: 8.9,
    movieGenres: ['Драма', 'Історія', 'Біографія'],
    movieType: 'movie',
    rating: 8.9,
    comment: 'Шедевр Крістофера Нолана. Гра Кілліана Мерфі та напружений монтаж роблять цю біографічну драму справжнім кінематографічним тріумфом.',
    createdAt: '3 тижні тому'
  }
];

export default function ProfileView({
  user,
  movies,
  onUpdateUser,
  onPlayMovie,
  onSelectMovie,
  onSignOut,
  mode = 'profile',
  onOpenSettings,
  onOpenGenreSelection,
  downloads: propDownloads,
  onRemoveDownload: propOnRemoveDownload,
  onTogglePauseDownload: propOnTogglePauseDownload,
  onClearAllDownloads: propOnClearAllDownloads,
  onNavigateToCatalog,
  onJoinActiveRoom,
  onOpenAuth
}: ProfileViewProps) {
  const { language, t } = useLanguage();

  // Режим: перегляд або редагування профілю
  const [isEditing, setIsEditing] = useState(false);

  // Активна підвкладка всередині профілю
  const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'downloads' | 'favorites' | 'watchparty' | 'reviews' | 'rating'>(
    mode === 'history' ? 'history' : 'overview'
  );

  // Стани даних профілю користувача
  const [name, setName] = useState(user.name || 'Інесса Ліс');
  const [handle, setHandle] = useState(user.handle || '@InnLi');
  const [email, setEmail] = useState(user.email || 'individyallis@gmail.com');
  const [location, setLocation] = useState(user.location || 'Львів, Україна');
  const [langPref, setLangPref] = useState('Українська');
  const [birthDate, setBirthDate] = useState(user.birthDate || '23.07.1999');

  // Gender Випадаюче меню Стан
  const [gender, setGender] = useState<'Жіночий' | 'Чоловічий' | 'Не вказувати' | 'Жіноча' | 'Чоловіча'>(
    (user.gender as any) || 'Жіночий'
  );

  const [aboutMe, setAboutMe] = useState(
    user.aboutMe || 'Якщо не відповідаю — швидше за все, дивлюся ще один сезон або знайшла новий фільм, який вартий уваги.'
  );
  const [favoriteGenres, setFavoriteGenres] = useState<string[]>(
    user.favoriteGenres && user.favoriteGenres.length > 0 ? user.favoriteGenres : ['Трилер', 'Фентезі', 'Жахи']
  );
  const [selectedAvatar, setSelectedAvatar] = useState(
    user.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=400&auto=format&fit=crop'
  );

  const [password, setPassword] = useState(user.password || '');
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [isSaved, setIsSaved] = useState(false);

  // Month Фільтрація Стан
  const [timeFilter, setTimeFilter] = useState('Цей місяць');
  const [isTimeDropdownOpen, setIsTimeDropdownOpen] = useState(false);

  // Ratings map stored in Стан & localStorage: { [movieId]: ratingValue }
  const [userRatings, setUserRatings] = useState<Record<string, number>>({});

  // Authored Рецензії Стан
  const [userReviews, setUserReviews] = useState<UserAuthoredReview[]>([]);
  const [reviewPage, setReviewPage] = useState(1);
  const REVIEWS_PER_PAGE = 5;

  // Internal Завантаження Стан (synchronized with localStorage & props)
  const [localDownloads, setLocalDownloads] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('cinemanova_downloads');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.error('Failed to parse downloads', e);
    }
    return propDownloads || [];
  });


  // Синхронізація Стан if Користувач prop updates
  useEffect(() => {
    if (user) {
      if (user.name) setName(user.name);
      if (user.handle) setHandle(user.handle);
      if (user.email) setEmail(user.email);
      if (user.location) setLocation(user.location);
      if (user.birthDate) setBirthDate(user.birthDate);
      if (user.gender) setGender(user.gender as any);
      if (user.aboutMe) setAboutMe(user.aboutMe);
      if (user.avatarUrl) setSelectedAvatar(user.avatarUrl);
      setFavoriteGenres(user.favoriteGenres && user.favoriteGenres.length > 0 ? user.favoriteGenres : ['Трилер', 'Фентезі', 'Жахи']);
    }
  }, [user]);

  // Load Історія, Користувач ratings, and Рецензії
  useEffect(() => {
    const savedHistory = loadState<HistoryItem[]>(`user_history_${user.id}`, user.watchHistory || []);
    setHistoryItems(savedHistory);

    const isDemoUser = user.id === 'user-001' || user.email === 'premium@example.invalid';
    const savedRatings = loadState<Record<string, number>>(`user_ratings_${user.id}`, isDemoUser ? {
      'the-batman-2022': 5,
      'demon-slayer-2019': 5,
      'dune-part-two-2024': 5,
      'attack-on-titan': 5,
      'interstellar-2014': 5,
      'spiderman-nowayhome': 4,
      'chainsaw-man-2022': 4,
      'joker-2019': 4,
      'stranger-things-s4': 4
    } : {});

    const normalizedRatings: Record<string, number> = {};
    for (const [key, val] of Object.entries(savedRatings)) {
      normalizedRatings[key] = val > 5 ? Math.max(1, Math.min(5, Math.round(val / 2))) : Math.max(1, Math.min(5, val));
    }
    setUserRatings(normalizedRatings);

    // Load authored Рецензії
    const revKey = `user_authored_reviews_${user.id}`;
    const savedRevs = loadState<UserAuthoredReview[]>(revKey, isDemoUser ? DEFAULT_USER_REVIEWS : []);
    setUserReviews(savedRevs);
  }, [user.id, user.email]);

  // Синхронізація Завантаження on events
  useEffect(() => {
    const syncDownloads = () => {
      try {
        const saved = localStorage.getItem('cinemanova_downloads');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            setLocalDownloads(parsed);
          }
        }
      } catch (e) { }
    };

    window.addEventListener('storage', syncDownloads);
    window.addEventListener('user_reviews_updated', () => {
      const revKey = `user_authored_reviews_${user.id}`;
      setUserReviews(loadState<UserAuthoredReview[]>(revKey, DEFAULT_USER_REVIEWS));
      const ratingsKey = `user_ratings_${user.id}`;
      const savedRatings = loadState<Record<string, number>>(ratingsKey, {});
      setUserRatings(savedRatings);
    });

    return () => {
      window.removeEventListener('storage', syncDownloads);
    };
  }, [user.id]);

  const currentDownloads = propDownloads || localDownloads;

  // Handle remove download from Профіль
  const handleRemoveDownload = (id: string) => {
    if (propOnRemoveDownload) {
      propOnRemoveDownload(id);
    } else {
      const updated = currentDownloads.filter(d => d.id !== id);
      setLocalDownloads(updated);
      localStorage.setItem('cinemanova_downloads', JSON.stringify(updated));
    }
  };

  // Handle Перемикач pause download
  const handleTogglePause = (id: string) => {
    if (propOnTogglePauseDownload) {
      propOnTogglePauseDownload(id);
    } else {
      const updated = currentDownloads.map(item => {
        if (item.id === id) {
          const nextStatus = item.status === 'paused' ? 'downloading' : 'paused';
          return {
            ...item,
            status: nextStatus,
            downloadSpeedMBs: nextStatus === 'paused' ? 0 : 8.4
          };
        }
        return item;
      });
      setLocalDownloads(updated);
      localStorage.setItem('cinemanova_downloads', JSON.stringify(updated));
    }
  };

  // Handle clear all Завантаження
  const handleClearAll = () => {
    if (propOnClearAllDownloads) {
      propOnClearAllDownloads();
    } else {
      setLocalDownloads([]);
      localStorage.setItem('cinemanova_downloads', JSON.stringify([]));
    }
  };

  // Handle Видалення authored review
  const handleDeleteUserReview = (revId: string, movieId: string) => {
    const updated = userReviews.filter(r => r.id !== revId);
    setUserReviews(updated);
    saveState(`user_authored_reviews_${user.id}`, updated);

    // Синхронізація Користувач ratings
    const nextRatings = { ...userRatings };
    delete nextRatings[movieId];
    setUserRatings(nextRatings);
    saveState(`user_ratings_${user.id}`, nextRatings);

    // Also remove from Фільм Рецензії if present
    const movieRevs = loadState<any[]>(`reviews_movie_${movieId}`, []);
    const filteredMovieRevs = movieRevs.filter(r => r.id !== revId);
    saveState(`reviews_movie_${movieId}`, filteredMovieRevs);
  };

  // Real Stats calculation
  const savedFavs = loadState<string[]>(`user_favs_${user.id}`, user.favorites || []);
  const savedCount = savedFavs.length > 0 ? savedFavs.length : ((user as any).savedCount !== undefined ? (user as any).savedCount : 23);

  // Real watch party count
  const savedWatchParties = getWatchPartyMovieIds(user.id);
  const watchPartyCount = loadState<number>(`user_watchparty_count_${user.id}`, user.watchPartyCount !== undefined ? user.watchPartyCount : (savedWatchParties.length > 0 ? savedWatchParties.length : 12));

  // Real watched items count
  const pageHistory = loadState<any[]>(`watch_history_page_${user.id}`, []);
  const rawWatchedCount = Math.max(historyItems.length, pageHistory.length);
  const watchedCount = rawWatchedCount > 0 ? rawWatchedCount : 58;

  // Real average Рейтинг calculation
  const calculatedAvgRating = useMemo(() => {
    const reviewRatings = userReviews.map(r => r.rating);
    const mapRatings = Object.values(userRatings);
    const combined = [...reviewRatings, ...mapRatings];
    if (combined.length === 0) return '6.4';
    const sum = combined.reduce((a, b) => a + b, 0);
    const avg = sum / combined.length;
    return (avg <= 5 ? avg * 2 : avg).toFixed(1);
  }, [userReviews, userRatings]);

  // Real activity statistics calculated from actual Користувач watch Історія
  const activityStats = useMemo(() => {
    // 1. Gather all Історія records
    const pageHist = loadState<any[]>(`watch_history_page_${user.id}`, []);
    const userHist = loadState<HistoryItem[]>(`user_history_${user.id}`, user.watchHistory || []);

    // Merge by movieId to get the latest/most accurate record
    const mergedMap = new Map<string, {
      movieId: string;
      watchedMinutes: number;
      timestamp: number;
      movieObj?: Movie;
    }>();

    // Process page Історія
    pageHist.forEach((ph: any) => {
      if (!ph || !ph.movieId) return;
      const m = movies.find(mov => mov.id === ph.movieId) || ph.movieObj;
      const durationMins = parseInt(m?.duration || '120') || 120;
      let watchedMins = 0;
      if (typeof ph.watchedMinutes === 'number' && ph.watchedMinutes > 0) {
        watchedMins = ph.watchedMinutes;
      } else if (typeof ph.progressPercent === 'number' && ph.progressPercent > 0) {
        watchedMins = Math.round((ph.progressPercent / 100) * (ph.totalMinutes || durationMins));
      } else {
        watchedMins = Math.min(durationMins, 45);
      }

      let ts = Date.now();
      if (ph.timestamp) ts = typeof ph.timestamp === 'number' ? ph.timestamp : new Date(ph.timestamp).getTime();
      else if (ph.watchedAt) ts = new Date(ph.watchedAt).getTime();

      mergedMap.set(ph.movieId, {
        movieId: ph.movieId,
        watchedMinutes: watchedMins,
        timestamp: isNaN(ts) ? Date.now() : ts,
        movieObj: m,
      });
    });

    // Process userHist
    userHist.forEach((uh: any) => {
      if (!uh || !uh.movieId) return;
      const m = movies.find(mov => mov.id === uh.movieId);
      const durationMins = parseInt(m?.duration || '120') || 120;
      let watchedMins = 0;
      if (typeof uh.watchedMinutes === 'number' && uh.watchedMinutes > 0) {
        watchedMins = uh.watchedMinutes;
      } else if (typeof uh.progressPercent === 'number' && uh.progressPercent > 0) {
        watchedMins = Math.round((uh.progressPercent / 100) * (uh.totalMinutes || durationMins));
      } else if (typeof uh.progress === 'number' && uh.progress > 0) {
        watchedMins = Math.round((uh.progress / 100) * durationMins);
      } else {
        watchedMins = Math.min(durationMins, 45);
      }

      let ts = Date.now();
      if (uh.timestamp) ts = typeof uh.timestamp === 'number' ? uh.timestamp : new Date(uh.timestamp).getTime();
      else if (uh.watchedAt) ts = new Date(uh.watchedAt).getTime();

      const existing = mergedMap.get(uh.movieId);
      if (existing) {
        existing.watchedMinutes = Math.max(existing.watchedMinutes, watchedMins);
        if (ts > existing.timestamp) existing.timestamp = ts;
      } else {
        mergedMap.set(uh.movieId, {
          movieId: uh.movieId,
          watchedMinutes: watchedMins,
          timestamp: isNaN(ts) ? Date.now() : ts,
          movieObj: m,
        });
      }
    });

    const allItems = Array.from(mergedMap.values());
    const now = Date.now();

    // Фільтрація by timeFilter
    const filteredItems = allItems.filter(item => {
      if (timeFilter === 'За весь час') return true;
      const diffDays = (now - item.timestamp) / (1000 * 60 * 60 * 24);
      if (timeFilter === 'Цей місяць') return diffDays <= 31;
      if (timeFilter === 'За 3 місяці') return diffDays <= 92;
      if (timeFilter === 'За рік') return diffDays <= 366;
      return true;
    });

    let totalMinutes = 0;
    let moviesCount = 0;
    let seriesCount = 0;
    let animeCount = 0;

    filteredItems.forEach(item => {
      totalMinutes += item.watchedMinutes;
      const m = item.movieObj || movies.find(mov => mov.id === item.movieId);
      const isAnime = m?.genres?.some(g => g.toLowerCase().includes('аніме') || g.toLowerCase().includes('anime')) || (m as any)?.category === 'anime';
      const isSeries = !isAnime && (m?.type === 'series' || (m as any)?.category === 'series');

      if (isAnime) {
        animeCount++;
      } else if (isSeries) {
        seriesCount++;
      } else {
        moviesCount++;
      }
    });

    const hoursDec = totalMinutes / 60;
    let formattedHours = '0';
    if (hoursDec > 0 && hoursDec < 1) {
      formattedHours = hoursDec.toFixed(1);
    } else {
      formattedHours = Math.round(hoursDec).toString();
    }

    if ((formattedHours === '0' || formattedHours === '0.0') && moviesCount === 0 && seriesCount === 0 && animeCount === 0) {
      return {
        hours: '326',
        movies: 13,
        series: 4,
        anime: 2
      };
    }

    return {
      hours: formattedHours,
      movies: moviesCount,
      series: seriesCount,
      anime: animeCount
    };
  }, [timeFilter, user.id, user.watchHistory, movies]);

  const favMovies = useMemo(() => {
    return movies.filter(m => savedFavs.includes(m.id));
  }, [movies, savedFavs]);

  // Допоміжна функція to format GB
  const formatGB = (val: number) => {
    return language === 'UA' ? Number(val || 0).toFixed(2).replace('.', ',') : Number(val || 0).toFixed(2);
  };

  // Перемикач Жанр in edit mode
  const toggleGenre = (genre: string) => {
    if (favoriteGenres.includes(genre)) {
      setFavoriteGenres(favoriteGenres.filter(g => g !== genre));
    } else {
      setFavoriteGenres([...favoriteGenres, genre]);
    }
  };

  // Збереження Профіль changes
  const handleSaveProfile = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const updated: UserProfile = {
      ...user,
      name,
      handle,
      email,
      birthDate,
      gender,
      location,
      aboutMe,
      avatarUrl: selectedAvatar,
      favoriteGenres,
      password: password || user.password
    };

    const normEmail = (email || '').trim().toLowerCase();
    try {
      if (normEmail) {
        localStorage.setItem(`user_avatar_${normEmail}`, selectedAvatar);
        localStorage.setItem(`user_handle_${normEmail}`, handle);
      }
      if (user.id) {
        localStorage.setItem(`user_avatar_${user.id}`, selectedAvatar);
        localStorage.setItem(`user_gender_${user.id}`, gender);
        localStorage.setItem(`user_birthDate_${user.id}`, birthDate);
        localStorage.setItem(`user_handle_${user.id}`, handle);
        localStorage.setItem(`user_location_${user.id}`, location);
        localStorage.setItem(`user_aboutMe_${user.id}`, aboutMe);
      }
      localStorage.setItem('user_lang_pref', langPref);
    } catch (err) {
      console.error('Error persisting profile data:', err);
    }

    onUpdateUser(updated);
    try {
      addProfileUpdateNotification(user.id);
    } catch (e) {
      console.warn('Profile notification error:', e);
    }
    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
      setIsEditing(false);
    }, 800);
  };

  // Real Continue Watching Items from Користувач watch Історія
  // Real Continue Watching Items from Користувач watch Історія with exact stopped locations
  const continueWatchingItems = useMemo(() => {
    const pageHist = loadState<any[]>(`watch_history_page_${user.id}`, []);
    const userHist = loadState<HistoryItem[]>(`user_history_${user.id}`, user.watchHistory || []);

    const getStoppedText = (
      hist: any,
      m: Movie | undefined,
      prog: number,
      lang: string
    ) => {
      const isSeriesOrAnime =
        m?.type === 'series' ||
        m?.type === 'anime' ||
        m?.type === 'dorama' ||
        (m?.genres &&
          m.genres.some(g => {
            const gl = g.toLowerCase();
            return (
              gl.includes('аніме') ||
              gl.includes('серіал') ||
              gl.includes('дорам') ||
              gl.includes('anime') ||
              gl.includes('series')
            );
          })) ||
        Boolean(hist?.episodeText) ||
        Boolean(hist?.currentEpisode) ||
        Boolean(m?.seasonsData?.length);

      if (isSeriesOrAnime) {
        let seasonNum = hist?.season || 1;
        let episodeNum = hist?.episode || 1;
        const epSource = hist?.episodeText || hist?.currentEpisode || '';
        if (epSource) {
          const sMatch = epSource.match(/(?:сезон|season|s)\s*(\d+)|\b(\d+)\s*(?:сезон|season)/i);
          if (sMatch) seasonNum = parseInt(sMatch[1] || sMatch[2]) || 1;
          const eMatch = epSource.match(/(?:серія|серії|серію|episode|ep|e)\s*(\d+)|\b(\d+)\s*(?:серія|серії|серію|episode|ep)/i);
          if (eMatch) episodeNum = parseInt(eMatch[1] || eMatch[2]) || 1;
        }

        let stoppedMinutes = hist?.watchedMinutes;
        if (!stoppedMinutes || stoppedMinutes <= 0) {
          const totalM = hist?.totalMinutes || 45;
          stoppedMinutes = Math.max(1, Math.round((prog / 100) * totalM));
        }

        return lang === 'UA'
          ? `${seasonNum} сезон, ${episodeNum} серія • ${stoppedMinutes} хв`
          : `Season ${seasonNum}, Ep ${episodeNum} • ${stoppedMinutes} min`;
      } else {
        let stoppedMinutes = hist?.watchedMinutes;
        if (!stoppedMinutes || stoppedMinutes <= 0) {
          const durVal = parseInt(m?.duration || '120') || 120;
          stoppedMinutes = Math.max(1, Math.round((prog / 100) * durVal));
        }

        return lang === 'UA'
          ? `Зупинились на: ${stoppedMinutes} хв`
          : `Stopped at: ${stoppedMinutes} min`;
      }
    };

    const map = new Map<string, {
      id: string;
      movieId: string;
      displayTitle: string;
      duration: string;
      rating: number;
      ageRating: string;
      progress: number;
      poster: string;
      movieObj?: Movie;
      stoppedText: string;
      year: number;
      description?: string;
    }>();

    pageHist.forEach(ph => {
      if (ph.movieId) {
        const m = movies.find(movie => movie.id === ph.movieId) || ph.movieObj;
        const dur = ph.episodeText || ph.durationText || (m ? `${m.duration || '120'} хв` : '45 хв');
        const prog = ph.progressPercent !== undefined ? ph.progressPercent : 35;
        const stoppedText = getStoppedText(ph, m, prog, language);
        map.set(ph.movieId, {
          id: ph.id || `cw_${ph.movieId}`,
          movieId: ph.movieId,
          displayTitle: m ? getMovieTitle(m, language) : (ph.title || 'Movie'),
          duration: dur,
          rating: m?.rating || 8.0,
          ageRating: m?.ageRating || ph.ageRating || '16+',
          progress: prog,
          poster: m?.posterUrl || ph.backdropUrl || 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=600&q=80',
          movieObj: m,
          stoppedText,
          year: m?.year || ph.year || 2024,
          description: m ? getMovieDescription(m, language) : (language === 'UA' ? 'Захоплююча кіноісторія.' : 'A captivating story.')
        });
      }
    });

    userHist.forEach(uh => {
      if (uh.movieId && !map.has(uh.movieId)) {
        const m = movies.find(movie => movie.id === uh.movieId);
        const dur = uh.currentEpisode || (m ? `${m.duration || '120'} хв` : '45 хв');
        const prog = uh.progressPercent !== undefined ? uh.progressPercent : 40;
        const stoppedText = getStoppedText(uh, m, prog, language);
        map.set(uh.movieId, {
          id: `cw_${uh.movieId}`,
          movieId: uh.movieId,
          displayTitle: m ? getMovieTitle(m, language) : (uh.movieTitle || 'Movie'),
          duration: dur,
          rating: m?.rating || 8.0,
          ageRating: m?.ageRating || '16+',
          progress: prog,
          poster: m?.posterUrl || 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=600&q=80',
          movieObj: m,
          stoppedText,
          year: m?.year || 2024,
          description: m ? getMovieDescription(m, language) : (language === 'UA' ? 'Захоплююча кіноісторія.' : 'A captivating story.')
        });
      }
    });

    // Check guest watch Історія if Користувач Історія is empty
    if (map.size === 0) {
      const guestHist = loadState<any[]>('watch_history_page_guest', []);
      guestHist.forEach(ph => {
        if (ph.movieId && !map.has(ph.movieId)) {
          const m = movies.find(movie => movie.id === ph.movieId) || ph.movieObj;
          const dur = ph.episodeText || ph.durationText || (m ? `${m.duration || '120'} хв` : '45 хв');
          const prog = ph.progressPercent !== undefined ? ph.progressPercent : 35;
          const stoppedText = getStoppedText(ph, m, prog, language);
          map.set(ph.movieId, {
            id: ph.id || `cw_${ph.movieId}`,
            movieId: ph.movieId,
            displayTitle: m ? getMovieTitle(m, language) : (ph.title || 'Movie'),
            duration: dur,
            rating: m?.rating || 8.0,
            ageRating: m?.ageRating || ph.ageRating || '16+',
            progress: prog,
            poster: m?.posterUrl || ph.backdropUrl || 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=600&q=80',
            movieObj: m,
            stoppedText,
            year: m?.year || ph.year || 2024,
            description: m ? getMovieDescription(m, language) : (language === 'UA' ? 'Захоплююча кіноісторія.' : 'A captivating story.')
          });
        }
      });
    }

    // Seed 3 realistic continue watching titles if completely empty
    if (map.size === 0) {
      const monsterMovie = movies.find(m => m.id === 'monster-anime' || m.title === 'Монстр');
      const seedItems = [
        {
          id: 'seed_backrooms',
          movieId: 'backrooms-series',
          displayTitle: 'Backrooms: Залаштунки',
          duration: '45 хв',
          rating: 7.8,
          ageRating: '16+',
          progress: 45,
          poster: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80',
          stoppedText: language === 'UA' ? '2 сезон • фантастика' : 'Season 2 • Sci-Fi',
          year: 2025,
          description: 'Таємничі нескінченні жовті коридори Залаштунків приховують смертельні небезпеки.'
        },
        {
          id: 'seed_odyssey',
          movieId: 'odyssey-2006',
          displayTitle: 'Одіссея',
          duration: '142 хв',
          rating: 6.7,
          ageRating: '18+',
          progress: 62,
          poster: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=600&q=80',
          stoppedText: language === 'UA' ? 'Фільм • фантастика' : 'Movie • Sci-Fi',
          year: 2006,
          description: 'Космічна одіссея у глибини невідомого Всесвіту.'
        },
        {
          id: 'seed_monster',
          movieId: monsterMovie?.id || 'monster-anime',
          displayTitle: 'Монстр',
          duration: '24 хв',
          rating: 7.2,
          ageRating: '16+',
          progress: 35,
          poster: monsterMovie?.posterUrl || 'https://image.tmdb.org/t/p/w500/n5XNKXnoXpoXyfiCtXHOf8q8PFM.jpg',
          movieObj: monsterMovie,
          stoppedText: language === 'UA' ? '1 сезон • фантастика' : 'Season 1 • Sci-Fi',
          year: 2004,
          description: 'Блискучий нейрохірург рятує життя хлопчика, який виявляється чудовиськом.'
        }
      ];

      seedItems.forEach(item => map.set(item.movieId, item));
    }

    return Array.from(map.values());
  }, [user.id, user.watchHistory, movies, language]);

  // Continue Watching Carousel logic & Кнопки (1:1 with HomeView.tsx carousel)
  const cwRowRef = useRef<HTMLDivElement>(null);
  const [cwCanScrollLeft, setCwCanScrollLeft] = useState(false);
  const [cwCanScrollRight, setCwCanScrollRight] = useState(true);

  const checkCwScroll = useCallback(() => {
    if (cwRowRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = cwRowRef.current;
      setCwCanScrollLeft(scrollLeft > 15);
      setCwCanScrollRight(scrollLeft < scrollWidth - clientWidth - 15);
    }
  }, []);

  useEffect(() => {
    const el = cwRowRef.current;
    if (!el) return;
    checkCwScroll();
    const t1 = setTimeout(checkCwScroll, 100);
    const t2 = setTimeout(checkCwScroll, 500);
    el.addEventListener('scroll', checkCwScroll, { passive: true });
    window.addEventListener('resize', checkCwScroll);
    return () => {
      el.removeEventListener('scroll', checkCwScroll);
      window.removeEventListener('resize', checkCwScroll);
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [checkCwScroll, continueWatchingItems]);

  const scrollCw = (direction: 'left' | 'right') => {
    if (cwRowRef.current) {
      const { scrollLeft, clientWidth } = cwRowRef.current;
      const scrollAmount = Math.max(300, clientWidth * 0.85);
      cwRowRef.current.scrollTo({
        left: direction === 'left' ? scrollLeft - scrollAmount : scrollLeft + scrollAmount,
        behavior: 'smooth',
      });
      setTimeout(checkCwScroll, 80);
      setTimeout(checkCwScroll, 250);
      setTimeout(checkCwScroll, 500);
    }
  };

  return (
    <div className="space-y-8 font-sans pb-16 max-w-7xl mx-auto">
      {/* ========================================================================= */}
      {/* 1. TOP Профіль Шапка сайту BANNER (Taller, spacious & atmospheric) */}
      {/* ========================================================================= */}
      <div className="relative w-full max-w-[393px] md:max-w-none h-[131px] md:min-h-[290px] md:h-auto rounded-[16px] md:rounded-[24px] overflow-hidden bg-[#0A0A0D] border border-[#1C1C22] p-2.5 sm:p-5 md:p-9 lg:p-11 shadow-2xl flex flex-col justify-between mx-auto md:mx-0">
        {/* Dark crimson gothic atmospheric silhouette background artwork */}
        <div
          className="absolute inset-y-0 right-0 w-full sm:w-[65%] md:w-[55%] lg:w-[48%] bg-cover bg-right opacity-95 pointer-events-none mix-blend-screen"
          style={{
            backgroundImage: `url('/backgrounds/profilebackground.png'), url('/backgrounds/profile_banner.svg')`,
            maskImage: 'linear-gradient(to right, transparent 0%, rgba(0,0,0,0.5) 20%, black 100%)',
            WebkitMaskImage: 'linear-gradient(to right, transparent 0%, rgba(0,0,0,0.5) 20%, black 100%)'
          }}
        />

        {/* Ambient red atmospheric blood moon glow */}
        <div className="absolute right-8 top-6 w-56 h-56 rounded-full bg-[#FF2030]/20 blur-3xl pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0A0A0D] via-[#0A0A0D]/85 to-transparent pointer-events-none" />

        <div className="relative z-10 flex flex-row items-center md:items-end justify-between gap-2 sm:gap-6 w-full h-full my-auto">
          {/* Left: Avatar + Користувач Details + Stats */}
          <div className="flex flex-row items-center gap-2.5 sm:gap-6 text-left">
            {/* Avatar Circle: w56 h56 on mobile, w-36 on desktop */}
            <div className="relative group shrink-0">
              <div className="absolute inset-0 rounded-full bg-[#FF3040]/40 blur-xl scale-110 pointer-events-none" />
              <div className="relative w-[56px] h-[56px] sm:w-28 sm:h-28 md:w-36 md:h-36 rounded-full overflow-hidden border-2 border-white/20 shadow-2xl bg-zinc-900">
                <img
                  src={selectedAvatar}
                  alt={name}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            {/* Користувач Info & Stats Рядок */}
            <div className="space-y-0.5 sm:space-y-1.5">
              <h1 className="text-[13px] sm:text-2xl md:text-3xl lg:text-4xl font-bold text-white tracking-tight font-sans leading-tight">
                {name}
              </h1>
              <p className="text-[9px] sm:text-sm text-zinc-400 font-normal leading-none">{handle}</p>
              <p className="text-[8px] sm:text-xs text-zinc-400 font-normal leading-none">{birthDate}</p>

              {/* 4 Stats in one horizontal Рядок: each block w37px h17px on mobile */}
              <div className="flex items-center gap-1 sm:gap-7 md:gap-10 pt-1 sm:pt-4 text-center">
                <div className="w-[37px] h-[17px] sm:w-auto sm:h-auto flex flex-col justify-center items-center">
                  <span className="block text-[9px] sm:text-xl md:text-2xl font-bold text-[#FF3040] leading-none mb-0.5">{savedCount}</span>
                  <span className="text-[6px] sm:text-xs text-zinc-300 font-medium leading-none">{language === 'UA' ? 'Збережених' : 'Saved'}</span>
                </div>
                <div className="w-[37px] h-[17px] sm:w-auto sm:h-auto flex flex-col justify-center items-center">
                  <span className="block text-[9px] sm:text-xl md:text-2xl font-bold text-[#FF3040] leading-none mb-0.5">{watchPartyCount}</span>
                  <span className="text-[6px] sm:text-xs text-zinc-300 font-medium leading-none">Watch Party</span>
                </div>
                <div className="w-[37px] h-[17px] sm:w-auto sm:h-auto flex flex-col justify-center items-center">
                  <span className="block text-[9px] sm:text-xl md:text-2xl font-bold text-[#FF3040] leading-none mb-0.5">{watchedCount}</span>
                  <span className="text-[6px] sm:text-xs text-zinc-300 font-medium leading-none">{language === 'UA' ? 'Переглянуто' : 'Watched'}</span>
                </div>
                <div className="w-[37px] h-[17px] sm:w-auto sm:h-auto flex flex-col justify-center items-center">
                  <span className="block text-[9px] sm:text-xl md:text-2xl font-bold text-[#FF3040] leading-none mb-0.5">{calculatedAvgRating}</span>
                  <span className="text-[6px] sm:text-xs text-zinc-300 font-medium leading-none">{language === 'UA' ? 'Рейтинг' : 'Rating'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Edit Профіль Кнопка (previous size increased by 10-15px on mobile, unchanged desktop) */}
          <div className="self-end md:self-end shrink-0 pr-0.5 pb-0.5">
            <button
              onClick={() => {
                if (onOpenSettings) {
                  onOpenSettings();
                } else {
                  setIsEditing(!isEditing);
                }
              }}
              className="cinema-glow-btn profile-edit-btn w-[76px] h-[18px] sm:w-[86px] sm:h-[20px] md:w-auto md:h-auto md:px-6 md:py-2.5 text-white font-medium text-[7.5px] sm:text-[8.5px] md:text-sm tracking-wide flex items-center justify-center p-0 cursor-pointer"
            >
              <span className="relative z-10 font-sans whitespace-nowrap leading-none text-[7.5px] sm:text-[8.5px] md:text-sm">
                {isEditing ? (language === 'UA' ? 'Переглянути' : 'View') : (language === 'UA' ? 'Редагувати профіль' : 'Edit Profile')}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. Навігація TABS */}
      {/* ========================================================================= */}
      {/* Mobile view (< sm): exact mobile dimensions w36/40/78/70/44 x h15, w66 h23px Активний highlight, 23px gap */}
      <div className="flex sm:hidden items-center gap-[23px] overflow-x-auto pb-2 scrollbar-none">
        {[
          { id: 'overview', label: language === 'UA' ? 'Огляд' : 'Overview', mobileWidth: 'w-[36px]' },
          { id: 'history', label: language === 'UA' ? 'Історія' : 'History', mobileWidth: 'w-[40px]' },
          { id: 'downloads', label: language === 'UA' ? 'Завантажене' : 'Downloads', mobileWidth: 'w-[78px]' },
          { id: 'watchparty', label: 'Watch Party', mobileWidth: 'w-[70px]' },
          { id: 'reviews', label: language === 'UA' ? 'Відгуки' : 'Reviews', mobileWidth: 'w-[44px]' },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as any);
                setIsEditing(false);
              }}
              className={`relative p-0 h-[23px] flex items-center justify-center leading-none group cursor-pointer shrink-0 ${tab.mobileWidth}`}
            >
              {/* Активний / hover highlight block: keeps w66 h23px on mobile */}
              <span
                className={`absolute top-1/2 left-1/2 -translate-y-1/2 -translate-x-1/2 pointer-events-none rounded-[6px] transition-all duration-200 z-0 ${
                  isActive
                    ? 'w-[66px] h-[23px] opacity-100'
                    : 'w-[66px] h-[23px] opacity-0 group-hover:opacity-100'
                }`}
                style={{
                  background: isActive
                    ? 'linear-gradient(90deg, #F71F3A 0%, rgba(247, 31, 58, 0.5) 45%, rgba(247, 31, 58, 0) 100%)'
                    : 'linear-gradient(90deg, rgba(247, 31, 58, 0.45) 0%, rgba(247, 31, 58, 0.15) 50%, rgba(247, 31, 58, 0) 100%)',
                }}
              />

              {/* Text block: exact mobile dimensions */}
              <span
                className={`relative z-10 flex items-center justify-center font-sans text-[12px] leading-none shrink-0 ${tab.mobileWidth} h-[15px] ${
                  isActive ? 'text-white font-semibold' : 'text-[#D4D4D8] group-hover:text-white font-medium'
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Desktop view (>= sm): 1:1 original desktop styling with normal text size and padding */}
      <div className="hidden sm:flex items-center gap-2 sm:gap-3 overflow-x-auto pb-2 scrollbar-none">
        {[
          { id: 'overview', label: language === 'UA' ? 'Огляд' : 'Overview' },
          { id: 'history', label: language === 'UA' ? 'Історія' : 'History' },
          { id: 'downloads', label: language === 'UA' ? 'Завантажене' : 'Downloads' },
          { id: 'watchparty', label: 'Watch Party' },
          { id: 'reviews', label: language === 'UA' ? 'Відгуки' : 'Reviews' },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as any);
                setIsEditing(false);
              }}
              className={`profile-nav-tab ${isActive ? 'tab-active' : ''}`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* 3. TAB CONTENT */}
      <div key={activeTab + (isEditing ? '_edit' : '_view')}>
        {activeTab === 'overview' && !isEditing && (
          <div className="space-y-9 pt-2">
            {/* A. Продовжити перегляд */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <h2 className="text-sm sm:text-xl md:text-2xl font-bold text-white tracking-tight">
                  {language === 'UA' ? 'Продовжити перегляд' : 'Continue Watching'}
                </h2>
                {continueWatchingItems.length > 0 && (
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#16161A] text-zinc-400 border border-white/10 hidden sm:inline">
                    {continueWatchingItems.length}
                  </span>
                )}
              </div>

              {continueWatchingItems.length === 0 ? (
                <div className="p-8 rounded-[16px] border border-[#222226] bg-[#0E0E12] text-center space-y-3 max-w-xl">
                  <Play className="w-8 h-8 text-zinc-500 mx-auto" />
                  <h3 className="text-white font-bold text-base">
                    {language === 'UA' ? 'Немає активних переглядів' : 'No active watch history'}
                  </h3>
                  <p className="text-zinc-400 text-xs sm:text-sm">
                    {language === 'UA'
                      ? 'Розпочніть перегляд будь-якого фільму чи серіалу з каталогу, і тут зберігатиметься ваш реальний прогрес.'
                      : 'Start watching any movie or TV series from the catalogue, and your progress will be saved here.'}
                  </p>
                </div>
              ) : (
                <div className="relative">
                  {/* Scroll Left Кнопка matching HomeView carousel */}
                  {cwCanScrollLeft && (
                    <button
                      type="button"
                      onClick={() => scrollCw('left')}
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

                  {/* Scroll Right Кнопка matching HomeView carousel */}
                  {cwCanScrollRight && (
                    <button
                      type="button"
                      onClick={() => scrollCw('right')}
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

                  {/* Horizontal Scroll Carousel (gap and Картка widths match HomeView) */}
                  <div
                    ref={cwRowRef}
                    className="flex gap-[10px] sm:gap-4 md:gap-[30px] overflow-x-auto pb-4 pt-1 scrollbar-none scroll-smooth snap-x snap-mandatory"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                  >
                    {continueWatchingItems.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => {
                          const m = movies.find(movie => movie.id === item.movieId) || item.movieObj || movies[0];
                          onPlayMovie(m);
                        }}
                        className="w-[104px] h-[158px] min-w-[104px] sm:w-[calc((100%-32px)/3)] sm:h-auto sm:min-w-0 md:w-[calc((100%-60px)/3)] lg:w-[calc((100%-90px)/4)] xl:w-[calc((100%-120px)/5)] shrink-0 snap-start bg-[#121212] border-0 sm:border sm:border-white/10 rounded-[16px] shadow-xl sm:hover:shadow-[0_0_28px_rgba(255,48,64,0.35)] sm:hover:border-transparent poster-hover-notif-border transition-all duration-300 ease-out cursor-pointer group/card group relative aspect-[104/158] sm:aspect-[2/3] select-none"
                      >
                        <div className="relative w-full h-full overflow-hidden bg-[#121212] rounded-[15px]">
                          {/* 1. Base poster image */}
                          <img
                            src={validatePosterUrl(item.poster, item.displayTitle)}
                            alt={item.displayTitle}
                            className="w-full h-full object-cover transition-transform duration-500 ease-out sm:group-hover:scale-[1.03]"
                            loading="lazy"
                            referrerPolicy="no-referrer"
                            onError={(e) => handlePosterError(e, item.poster)}
                          />

                          {/* Side Vignette Накладення (оверлей) on the Картка */}
                          <div className="absolute inset-0 pointer-events-none z-10 bg-gradient-to-r from-black/40 via-transparent to-black/40 shadow-[inset_0_0_24px_rgba(0,0,0,0.6)]" />

                          {/* Floating Бейджі on Mobile: w32.58px h14.13px, gap 26px */}
                          <div className="absolute top-1.5 inset-x-0 px-[6.42px] flex items-center justify-between z-30 pointer-events-none sm:hidden">
                            <div className="w-[32.58px] h-[14.13px] text-white rounded-[4px] flex items-center justify-center gap-0.5 bg-black/35 backdrop-blur-md border border-white/15 shadow-sm">
                              <Star className="w-[8px] h-[8px] fill-[#FF3040] text-[#FF3040] shrink-0" />
                              <span className="text-white font-bold text-[7px] tracking-tight leading-none">{item.rating?.toFixed(1) || item.rating}</span>
                            </div>
                            <div className="w-[32.58px] h-[14.13px] text-white rounded-[4px] flex items-center justify-center bg-black/35 backdrop-blur-md border border-white/15 shadow-sm">
                              <span className="text-white font-bold text-[7px] tracking-tight leading-none">{item.ageRating || '16+'}</span>
                            </div>
                          </div>

                          {/* Desktop Рейтинг & Age Бейджі */}
                          <div className="hidden sm:flex absolute top-3 left-3 text-white px-3.5 py-1.5 rounded-[10px] text-xs font-semibold items-center gap-1.5 z-30 pointer-events-none bg-black/35 backdrop-blur-md border border-white/15 shadow-sm group-hover:bg-white/10 group-hover:border-white/25 duration-300">
                            <Star className="w-3.5 h-3.5 fill-[#FF3040] text-[#FF3040] shrink-0" />
                            <span className="text-white font-bold text-xs tracking-tight">{item.rating?.toFixed(1) || item.rating}</span>
                          </div>

                          <div className="hidden sm:flex absolute top-3 right-3 text-white px-3.5 py-1.5 rounded-[10px] text-xs font-semibold z-30 pointer-events-none items-center justify-center bg-black/35 backdrop-blur-md border border-white/15 shadow-sm group-hover:bg-white/10 group-hover:border-white/25 duration-300">
                            <span className="text-white font-bold text-xs tracking-tight">{item.ageRating || '16+'}</span>
                          </div>

                          {/* Center Translucent Round Play Кнопка on Hover */}
                          <div className="absolute inset-0 bg-black/25 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20 pointer-events-none">
                            <div className="w-12 h-12 rounded-full border-2 border-white/90 flex items-center justify-center text-white transform scale-90 group-hover:scale-110 transition-transform duration-300 shadow-2xl bg-black/50 backdrop-blur-xs">
                              <Play className="w-5 h-5 fill-white text-white ml-0.5" />
                            </div>
                          </div>

                          {/* Specular Glass Sheen Накладення (оверлей) */}
                          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-white/15 pointer-events-none mix-blend-overlay z-15" />

                          {/* Frosted Glass Bottom Panel with Backdrop Blur: w104 h52 on mobile */}
                          <div className="absolute inset-x-0 bottom-0 z-20 flex flex-col justify-start p-1.5 sm:px-4 sm:pt-[22px] sm:pb-4 w-[104px] h-[52px] sm:w-full sm:h-auto bg-gradient-to-t from-black/95 via-black/80 to-transparent backdrop-blur-[10px] pointer-events-none transition-all duration-300 ease-out">
                            <h4 className="font-sans font-bold text-white text-[8px] sm:text-[17px] leading-tight line-clamp-1 sm:line-clamp-2 w-full sm:w-[239px] sm:max-w-full sm:h-[42px] text-left drop-shadow-md">
                              {item.displayTitle}
                            </h4>

                            {/* Where Користувач stopped instead of Жанри (Фільм: minute; Серіал/Anime: Сезон, ep, minute) */}
                            <div className="flex items-center text-[6px] sm:text-[11.5px] text-zinc-300 font-normal w-full whitespace-nowrap overflow-hidden font-sans text-left mt-0.5 sm:mt-[22px] drop-shadow-sm gap-1 sm:gap-1.5">
                              <span className="text-zinc-200 font-medium truncate">{item.stoppedText}</span>
                              {item.year && (
                                <>
                                  <span className="w-0.5 h-0.5 sm:w-1 sm:h-1 rounded-full bg-[#FF3040] inline-block shrink-0" />
                                  <span className="text-zinc-400 shrink-0">{item.year}</span>
                                </>
                              )}
                            </div>

                            {/* Red Progress Bar styled like watch Історія */}
                            <div className="w-full bg-[#1b1922] h-1.5 rounded-full overflow-hidden mt-2 relative">
                              <div 
                                className="h-full rounded-full transition-all duration-500 shadow-[0_0_10px_rgba(242,46,61,0.8)]" 
                                style={{ width: `${item.progress}%`, backgroundColor: '#F22E3D' }}
                              />
                            </div>

                            {/* Short Опис expansion on hover matching Home Картка */}
                            <div className="grid grid-rows-[0fr] group-hover:grid-rows-[1fr] transition-all duration-300 ease-out">
                              <div className="overflow-hidden">
                                <p className="text-xs sm:text-[12.5px] text-zinc-200/90 font-sans leading-relaxed line-clamp-3 mt-2.5 pt-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-75">
                                  {item.description || (language === 'UA' ? 'Натисніть, щоб продовжити перегляд.' : 'Click to resume watching.')}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* B. Улюблені жанри */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <h2 className="text-sm sm:text-xl md:text-2xl font-bold text-white tracking-tight">
                  {language === 'UA' ? 'Улюблені жанри' : 'Favorite Genres'}
                </h2>
                {(onOpenGenreSelection || onOpenSettings) && (
                  <button
                    type="button"
                    onClick={() => {
                      if (onOpenGenreSelection) onOpenGenreSelection();
                      else if (onOpenSettings) onOpenSettings();
                    }}
                    className="flex text-xs text-white hover:text-zinc-300 transition items-center gap-1 cursor-pointer font-medium"
                  >
                    <span>{language === 'UA' ? 'Змінити' : 'Change'}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-white" />
                  </button>
                )}
              </div>

              {favoriteGenres.length === 0 ? (
                <div className="flex items-center gap-3">
                  <p className="text-zinc-400 text-xs sm:text-sm">
                    {language === 'UA' ? 'Улюблені жанри ще не обрані.' : 'No favorite genres selected yet.'}
                  </p>
                  {(onOpenGenreSelection || onOpenSettings) && (
                    <button
                      type="button"
                      onClick={() => {
                        if (onOpenGenreSelection) onOpenGenreSelection();
                        else if (onOpenSettings) onOpenSettings();
                      }}
                      className="text-xs sm:text-sm text-[#FF3040] hover:underline font-medium cursor-pointer"
                    >
                      {language === 'UA' ? 'Обрати жанри' : 'Select Genres'}
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex flex-wrap gap-2.5">
                  {favoriteGenres.map((genre) => (
                    <div
                      key={genre}
                      className="px-5 py-1.5 rounded-full border border-white/40 bg-transparent text-white text-xs sm:text-sm font-medium select-none"
                    >
                      {genre}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* C. Про мене */}
            <div className="space-y-2">
              <h2 className="text-sm sm:text-xl md:text-2xl font-bold text-white tracking-tight">
                {language === 'UA' ? 'Про мене' : 'About Me'}
              </h2>

              <p className="text-zinc-300 text-sm sm:text-base leading-relaxed max-w-2xl">
                {aboutMe}
              </p>
            </div>

            {/* D. Readonly Info Display Fields matching screenshot 1:1 */}
            <div className="space-y-4 max-w-xl pt-2">
              {/* Email */}
              <div className="space-y-1.5">
                <label className="text-[#FAFAFA] font-medium text-sm block">Email</label>
                <div className="w-full bg-transparent border border-[#FAFAFA] rounded-[10px] px-4 py-3 text-[#FAFAFA] text-sm font-normal">
                  {email}
                </div>
              </div>

              {/* Username */}
              <div className="space-y-1.5">
                <label className="text-[#FAFAFA] font-medium text-sm block">Username</label>
                <div className="w-full bg-transparent border border-[#FAFAFA] rounded-[10px] px-4 py-3 text-[#FAFAFA] text-sm font-normal">
                  {handle}
                </div>
              </div>

              {/* Локація */}
              <div className="space-y-1.5">
                <label className="text-[#FAFAFA] font-medium text-sm block">Локація</label>
                <div className="w-full bg-transparent border border-[#FAFAFA] rounded-[10px] px-4 py-3 text-[#FAFAFA] text-sm font-normal">
                  {location}
                </div>
              </div>

              {/* Мова */}
              <div className="space-y-1.5">
                <label className="text-[#FAFAFA] font-medium text-sm block">Мова</label>
                <div className="w-full bg-transparent border border-[#FAFAFA] rounded-[10px] px-4 py-3 text-[#FAFAFA] text-sm font-normal">
                  {langPref}
                </div>
              </div>

              {/* День народження */}
              <div className="space-y-1.5">
                <label className="text-[#FAFAFA] font-medium text-sm block">День народження</label>
                <div className="w-full bg-transparent border border-[#FAFAFA] rounded-[10px] px-4 py-3 text-[#FAFAFA] text-sm font-normal">
                  {birthDate}
                </div>
              </div>

              {/* Гендер */}
              <div className="space-y-1.5">
                <label className="text-[#FAFAFA] font-medium text-sm block">
                  {language === 'UA' ? 'Гендер' : 'Gender'}
                </label>
                <div className="w-full bg-transparent border border-[#FAFAFA] rounded-[10px] px-4 py-3 text-[#FAFAFA] text-sm font-normal">
                  {gender === 'Жіночий' || gender === 'Жіноча' || !gender ? (language === 'UA' ? 'Жіночий' : 'Female') :
                    gender === 'Чоловічий' || gender === 'Чоловіча' ? (language === 'UA' ? 'Чоловічий' : 'Male') :
                      (language === 'UA' ? 'Не вказувати' : 'Prefer not to say')}
                </div>
              </div>


              {/* Мобільна кнопка виходу з облікового запису (текстова за запитом) */}
              <div className="pt-2 pb-1 md:hidden">
                <button
                  type="button"
                  onClick={onSignOut}
                  className="text-[#FF3040] hover:text-[#FF4D5C] text-base font-semibold transition-colors cursor-pointer text-left select-none"
                >
                  {language === 'UA' ? 'Вихід з облікового запису' : 'Sign out of account'}
                </button>
              </div>
            </div>

            {/* E. Активність */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-3">
                <h2 className="text-sm sm:text-xl md:text-2xl font-bold text-white tracking-tight">
                  {language === 'UA' ? 'Активність' : 'Activity'}
                </h2>

                <div className="relative">
                  <button
                    onClick={() => setIsTimeDropdownOpen(!isTimeDropdownOpen)}
                    className="text-white text-xs sm:text-sm font-medium flex items-center gap-1 group cursor-pointer transition-colors select-none"
                  >
                    <span className="text-xs sm:text-sm group-hover:underline group-active:underline underline-offset-4 decoration-1 decoration-white">
                      {timeFilter}
                    </span>
                    <ChevronDown className="w-3.5 h-3.5 text-white group-hover:translate-y-0.5 transition-transform" />
                  </button>

                  {isTimeDropdownOpen && (
                    <div className="absolute top-full left-0 mt-1 w-36 bg-[#000000] border border-[#222228] rounded-xl shadow-2xl py-1 z-30 overflow-hidden backdrop-blur-xl">
                      {/* Layer Blur on the left side */}
                      <div className="absolute left-0 top-0 bottom-0 w-2.5 bg-gradient-to-r from-white/10 to-transparent layer-blur blur-md pointer-events-none z-10" />
                      {['Цей місяць', 'За 3 місяці', 'За рік', 'За весь час'].map((opt) => (
                        <button
                          key={opt}
                          onClick={() => {
                            setTimeFilter(opt);
                            setIsTimeDropdownOpen(false);
                          }}
                          className={`w-full text-left pl-3.5 pr-3 py-1.5 text-[12px] transition-colors cursor-pointer relative z-20 ${timeFilter === opt
                              ? 'text-[#FAFAFA] font-bold bg-white/10 underline underline-offset-4 decoration-1 decoration-[#FAFAFA]'
                              : 'text-zinc-400 hover:text-[#FAFAFA] hover:underline underline-offset-4 decoration-1 hover:bg-white/5'
                            }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Activity numbers: Hours on left, other counts on right */}
              <div className="flex items-start justify-between gap-4 pt-1 max-w-xl">
                {/* Left side: Години перегляду */}
                <div className="flex items-center gap-2">
                  <span className="text-[#FF3040] font-bold text-base sm:text-lg font-mono">{activityStats.hours}</span>
                  <span className="text-zinc-300 text-[12px]">{language === 'UA' ? 'Годин перегляду' : 'Watch hours'}</span>
                </div>

                {/* Right side: Фільми, Аніме, Серіали (стовпчиком по правій стороні, точно як на скріншоті) */}
                <div className="flex flex-col items-start gap-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[#FF3040] font-bold text-base sm:text-lg font-mono min-w-[14px]">{activityStats.movies}</span>
                    <span className="text-zinc-300 text-[12px]">{language === 'UA' ? 'Фільмів' : 'Movies'}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[#FF3040] font-bold text-base sm:text-lg font-mono min-w-[14px]">{activityStats.anime}</span>
                    <span className="text-zinc-300 text-[12px]">{language === 'UA' ? 'Аніме' : 'Anime'}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[#FF3040] font-bold text-base sm:text-lg font-mono min-w-[14px]">{activityStats.series}</span>
                    <span className="text-zinc-300 text-[12px]">{language === 'UA' ? 'Серіали' : 'Series'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* EDIT Профіль VIEW (1:1 with Screenshot image.png) */}
        {/* ========================================================================= */}
        {activeTab === 'overview' && isEditing && (
          <form onSubmit={handleSaveProfile} className="space-y-6 pt-2 animate-in fade-in duration-200">
            {/* Favorite Жанри selection chips */}
            <div className="flex flex-wrap gap-3">
              {['Екшн', 'Фантастика', 'Детектив', 'Трилер', 'Фентезі', 'Жахи', 'Комедія', 'Драма'].map((g) => {
                const isSelected = favoriteGenres.includes(g);
                return (
                  <button
                    key={g}
                    type="button"
                    onClick={() => toggleGenre(g)}
                    className={`px-6 py-2 rounded-full border text-sm font-medium transition-all cursor-pointer ${isSelected
                        ? 'border-white bg-[#1A1A20] text-white shadow-md'
                        : 'border-zinc-800 bg-transparent text-zinc-400 hover:border-zinc-600 hover:text-white'
                      }`}
                  >
                    {g}
                  </button>
                );
              })}
            </div>

            {/* Про мене (12px) */}
            <div className="space-y-1.5">
              <h2 className="text-[12px] font-bold text-[#FAFAFA] tracking-tight">
                {language === 'UA' ? 'Про мене' : 'About Me'}
              </h2>
              <div>
                <textarea
                  rows={2}
                  maxLength={100}
                  value={aboutMe}
                  onChange={(e) => setAboutMe(e.target.value)}
                  className="w-full max-w-2xl bg-transparent border border-[#FAFAFA] focus:border-[#FAFAFA] focus:ring-1 focus:ring-[#FAFAFA] rounded-[10px] px-4 py-3 text-[#FAFAFA] placeholder:text-[#FAFAFA]/40 text-[12px] outline-none transition-all resize-none block"
                />
                <div className="max-w-2xl text-right text-[11px] text-white font-mono mt-1.5 select-none pr-1">
                  {aboutMe.length}/100
                </div>
              </div>
            </div>

            {/* Form Поля введення */}
            <div className="space-y-4 max-w-xl">
              {/* Email */}
              <div className="space-y-1.5">
                <label className="text-[#FAFAFA] font-medium text-sm block">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-transparent border border-[#FAFAFA] focus:border-[#FAFAFA] focus:ring-1 focus:ring-[#FAFAFA] rounded-[10px] px-4 py-3 text-[#FAFAFA] placeholder:text-[#FAFAFA]/40 text-sm outline-none transition-all"
                />
              </div>

              {/* Username */}
              <div className="space-y-1.5">
                <label className="text-[#FAFAFA] font-medium text-sm block">Username</label>
                <input
                  type="text"
                  value={handle}
                  onChange={(e) => setHandle(e.target.value)}
                  className="w-full bg-transparent border border-[#FAFAFA] focus:border-[#FAFAFA] focus:ring-1 focus:ring-[#FAFAFA] rounded-[10px] px-4 py-3 text-[#FAFAFA] placeholder:text-[#FAFAFA]/40 text-sm outline-none transition-all"
                />
              </div>

              {/* Локація */}
              <div className="space-y-1.5">
                <label className="text-[#FAFAFA] font-medium text-sm block">Локація</label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full bg-transparent border border-[#FAFAFA] focus:border-[#FAFAFA] focus:ring-1 focus:ring-[#FAFAFA] rounded-[10px] px-4 py-3 text-[#FAFAFA] placeholder:text-[#FAFAFA]/40 text-sm outline-none transition-all"
                />
              </div>

              {/* Мова */}
              <div className="space-y-1.5">
                <label className="text-[#FAFAFA] font-medium text-sm block">Мова</label>
                <input
                  type="text"
                  value={langPref}
                  onChange={(e) => setLangPref(e.target.value)}
                  className="w-full bg-transparent border border-[#FAFAFA] focus:border-[#FAFAFA] focus:ring-1 focus:ring-[#FAFAFA] rounded-[10px] px-4 py-3 text-[#FAFAFA] placeholder:text-[#FAFAFA]/40 text-sm outline-none transition-all"
                />
              </div>

              {/* День народження */}
              <div className="space-y-1.5">
                <label className="text-[#FAFAFA] font-medium text-sm block">День народження</label>
                <input
                  type="text"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  className="w-full bg-transparent border border-[#FAFAFA] focus:border-[#FAFAFA] focus:ring-1 focus:ring-[#FAFAFA] rounded-[10px] px-4 py-3 text-[#FAFAFA] placeholder:text-[#FAFAFA]/40 text-sm outline-none transition-all"
                />
              </div>

              {/* Гендер */}
              <div className="space-y-1.5">
                <label className="text-[#FAFAFA] font-medium text-sm block">
                  {language === 'UA' ? 'Гендер' : 'Gender'}
                </label>
                <div className="relative">
                  <select
                    value={gender === 'Жіноча' ? 'Жіночий' : gender === 'Чоловіча' ? 'Чоловічий' : gender}
                    onChange={(e) => setGender(e.target.value as any)}
                    className="w-full bg-transparent border border-[#FAFAFA] focus:border-[#FAFAFA] focus:ring-1 focus:ring-[#FAFAFA] rounded-[10px] px-4 py-3 text-[#FAFAFA] text-sm outline-none transition-all appearance-none cursor-pointer pr-10"
                  >
                    <option value="Жіночий" className="bg-[#121214] text-[#FAFAFA]">{language === 'UA' ? 'Жіночий' : 'Female'}</option>
                    <option value="Чоловічий" className="bg-[#121214] text-[#FAFAFA]">{language === 'UA' ? 'Чоловічий' : 'Male'}</option>
                    <option value="Не вказувати" className="bg-[#121214] text-[#FAFAFA]">{language === 'UA' ? 'Не вказувати' : 'Prefer not to say'}</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-zinc-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {/* Збереження Changes Кнопка matching design */}
              <div className="pt-3 flex items-center gap-3">
                <button
                  type="submit"
                  className="cinema-glow-btn px-7 py-3 text-white text-sm font-medium tracking-wide flex items-center gap-2"
                >
                  {isSaved ? <Check className="w-4 h-4 text-emerald-400 relative z-10" /> : null}
                  <span className="relative z-10">{isSaved ? 'Збережено!' : 'Зберегти зміни'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-5 py-3 rounded-xl bg-transparent hover:bg-white/10 text-zinc-300 text-sm font-medium transition cursor-pointer"
                >
                  Скасувати
                </button>
              </div>
            </div>
          </form>
        )}

        {/* ========================================================================= */}
        {/* Історія TAB (Unified with WatchHistoryView) */}
        {/* ========================================================================= */}
        {activeTab === 'history' && (
          <WatchHistoryView
            user={user}
            movies={movies}
            onPlayMovie={onPlayMovie}
            onSelectMovie={onSelectMovie}
            embedded={true}
            onUpdateUser={onUpdateUser}
          />
        )}

        {/* ========================================================================= */}
        {/* ЗАВАНТАЖЕНЕ (DOWNLOADS) TAB (Unified with DownloadsView) */}
        {/* ========================================================================= */}
        {activeTab === 'downloads' && (
          <DownloadsView
            downloads={currentDownloads}
            allMovies={movies}
            onPlayMovie={onPlayMovie}
            onSelectMovie={onSelectMovie}
            onRemoveDownload={handleRemoveDownload}
            onTogglePauseDownload={handleTogglePause}
            onClearAllDownloads={handleClearAll}
            onNavigateToCatalog={onNavigateToCatalog || (() => { })}
            embedded={true}
          />
        )}

        {/* Watch Party Tab (Unified with WatchParty page) */}
        {activeTab === 'watchparty' && (
          <WatchParty
            movies={movies}
            user={user}
            onOpenAuth={onOpenAuth}
            onSelectMovie={onSelectMovie}
            onJoinActiveRoom={onJoinActiveRoom}
            embedded={true}
          />
        )}

        {/* ========================================================================= */}
        {/* ВІДГУКИ (REVIEWS) TAB - 1:1 MATCHING SCREENSHOT 2 */}
        {/* ========================================================================= */}
        {activeTab === 'reviews' && (
          <div className="space-y-4 pt-1 animate-in fade-in duration-200">
            {/* Header: Мої відгуки */}
            <h2 className="text-xl sm:text-2xl md:text-[26px] font-bold text-white tracking-tight mb-5">
              {language === 'UA' ? 'Мої відгуки' : 'My Reviews'}
            </h2>

            {/* Список of Користувач Рецензії */}
            {userReviews.length > 0 ? (
              <div className="space-y-4">
                {userReviews
                  .slice((reviewPage - 1) * REVIEWS_PER_PAGE, reviewPage * REVIEWS_PER_PAGE)
                  .map((rev) => {
                    const matchedMovie = movies.find(m => m.id === rev.movieId) || {
                      id: rev.movieId,
                      title: rev.movieTitle,
                      titleEn: rev.movieTitleEn,
                      posterUrl: rev.moviePoster,
                      backdropUrl: rev.movieBackdrop,
                      rating: typeof rev.rating === 'number' ? rev.rating : 8.5,
                      year: rev.movieYear || 2024,
                      genres: rev.movieGenres || ['Фільм'],
                      type: rev.movieType || 'movie',
                      description: ''
                    } as Movie;

                    const displayScore = typeof rev.rating === 'number'
                      ? (rev.rating > 5 ? rev.rating.toFixed(1) : (rev.rating * 2 === 10 ? '9.9' : (rev.rating * 2).toFixed(1)))
                      : '8.5';

                    const typeLabel = rev.movieType === 'series' || matchedMovie.type === 'series'
                      ? (language === 'UA' ? 'Серіал' : 'Series')
                      : (rev.movieType === 'anime' || matchedMovie.type === 'anime'
                        ? (language === 'UA' ? 'Аніме' : 'Anime')
                        : (language === 'UA' ? 'Фільм' : 'Movie'));

                    const backdropSrc = rev.movieBackdrop || matchedMovie.backdropUrl || validatePosterUrl(rev.moviePoster, rev.movieId);

                    return (
                      <div
                        key={rev.id}
                        className="group relative rounded-[20px] bg-[#000000] border border-white/10 hover:border-white/20 transition-all duration-300 overflow-hidden flex flex-col sm:flex-row items-stretch shadow-2xl"
                      >
                        {/* Left: Landscape Backdrop with Gradient Накладення (оверлей) covering right half */}
                        <div
                          onClick={() => onSelectMovie(matchedMovie)}
                          className="relative w-full sm:w-[280px] md:w-[320px] aspect-[16/9] shrink-0 overflow-hidden bg-zinc-950 cursor-pointer group/img"
                        >
                          <img
                            src={backdropSrc}
                            alt={rev.movieTitle}
                            onError={(e) => handlePosterError(e, rev.movieTitle, rev.movieId)}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover/img:scale-105"
                          />
                          {/* Linear Gradient Накладення (оверлей): right side #000000, covering right half */}
                          <div
                            className="absolute inset-0 pointer-events-none"
                            style={{
                              background: 'linear-gradient(to right, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0.5) 50%, #000000 100%)'
                            }}
                          />
                        </div>

                        {/* Center / Details Колонка */}
                        <div className="flex-1 min-w-0 flex flex-col justify-center py-3.5 px-4 sm:px-5">
                          <h3
                            onClick={() => onSelectMovie(matchedMovie)}
                            className="text-base sm:text-lg md:text-xl font-bold text-white hover:text-[#FF3040] transition-colors cursor-pointer tracking-tight"
                          >
                            {language === 'UA' ? rev.movieTitle : (rev.movieTitleEn || rev.movieTitle)}
                          </h3>

                          <div className="flex items-center gap-2 text-xs sm:text-sm text-zinc-400 font-normal mt-0.5">
                            <span className="text-white font-medium">{rev.movieYear || matchedMovie.year || 2024}</span>
                            <span className="text-[#F22E3D] font-bold">•</span>
                            <span>{typeLabel}</span>
                          </div>

                          <p className="text-xs sm:text-sm text-zinc-300 font-normal leading-relaxed mt-2.5 line-clamp-3">
                            {rev.comment}
                          </p>
                        </div>

                        {/* Right: Star & Рейтинг + Trash Видалення Іконка */}
                        <div className="flex items-center gap-5 sm:gap-6 self-end sm:self-center shrink-0 p-4 sm:pr-6 border-t sm:border-t-0 border-white/5">
                          <div className="flex items-center gap-1.5 sm:gap-2">
                            <Star className="w-4 h-4 fill-[#FF3040] text-[#FF3040]" />
                            <span className="text-white font-medium text-base sm:text-lg font-sans">
                              {displayScore}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleDeleteUserReview(rev.id, rev.movieId)}
                            title={language === 'UA' ? 'Видалити відгук' : 'Delete review'}
                            className="text-[#FF3040]/80 hover:text-[#FF3040] p-1.5 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-5 h-5 stroke-[1.75]" />
                          </button>
                        </div>
                      </div>
                    );
                  })}

                {/* Pagination Controls matching screenshot 2 */}
                {userReviews.length > REVIEWS_PER_PAGE && (
                  <div className="flex items-center justify-center gap-6 pt-6 pb-2">
                    <button
                      type="button"
                      onClick={() => setReviewPage(p => Math.max(1, p - 1))}
                      disabled={reviewPage === 1}
                      aria-label="Previous page"
                      className="p-2 text-zinc-400 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed transition cursor-pointer"
                    >
                      <ChevronLeft className="w-6 h-6" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setReviewPage(p => Math.min(Math.ceil(userReviews.length / REVIEWS_PER_PAGE), p + 1))}
                      disabled={reviewPage >= Math.ceil(userReviews.length / REVIEWS_PER_PAGE)}
                      aria-label="Next page"
                      className="p-2 text-zinc-400 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed transition cursor-pointer"
                    >
                      <ChevronRight className="w-6 h-6" />
                    </button>
                  </div>
                )}
                {userReviews.length <= REVIEWS_PER_PAGE && (
                  <div className="flex items-center justify-center gap-6 pt-6 pb-2">
                    <button
                      type="button"
                      disabled
                      aria-label="Previous page"
                      className="p-2 text-zinc-400 opacity-20 cursor-not-allowed transition"
                    >
                      <ChevronLeft className="w-6 h-6" />
                    </button>
                    <button
                      type="button"
                      disabled
                      aria-label="Next page"
                      className="p-2 text-zinc-400 opacity-20 cursor-not-allowed transition"
                    >
                      <ChevronRight className="w-6 h-6" />
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-16 px-6 text-center bg-[#121215] rounded-2xl border border-[#222228] space-y-4 max-w-2xl mx-auto">
                <div className="w-16 h-16 rounded-full bg-[#1A1A20] border border-white/10 flex items-center justify-center mx-auto text-[#FF3040]">
                  <Star className="w-8 h-8 fill-[#FF3040]" />
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-lg font-bold text-white">
                    {language === 'UA' ? 'Ви ще не залишали відгуків' : 'No reviews written yet'}
                  </h3>
                  <p className="text-sm text-zinc-400 max-w-md mx-auto">
                    {language === 'UA'
                      ? 'Діліться своїми враженнями про переглянуті фільми та серіали на сторінці будь-якого фільму.'
                      : 'Share your thoughts and rate movies directly on any movie page.'}
                  </p>
                </div>
                {onNavigateToCatalog && (
                  <div className="pt-2">
                    <button
                      onClick={onNavigateToCatalog}
                      className="cinema-glow-btn px-6 py-2.5 text-white text-sm font-medium inline-flex items-center gap-2"
                    >
                      <span className="relative z-10">{language === 'UA' ? 'Перейти до фільмів' : 'Explore Movies'}</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
