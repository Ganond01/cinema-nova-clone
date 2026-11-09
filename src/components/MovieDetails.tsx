import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowLeft, Star, Clock, Calendar, DollarSign, Award, Play, Plus,
  MessageSquare, Users, Eye, HelpCircle, HardDriveDownload, Sparkles, Check,
  Info, TrendingUp, Trash2, ChevronDown, ChevronRight, ChevronLeft, Bell, Share2, Heart, Video, Pencil, Grid,
  X, AlertTriangle, Search, UserPlus, ChevronUp
} from 'lucide-react';
import { Movie, Review, UserProfile, CustomList, DownloadItem } from '../types';
import { loadState, saveState, PRESET_AVATARS } from '../data/movies';
import { saveMovieOffline, getOfflineMovie, deleteOfflineMovie } from '../utils/offlineStorage';
import { useLanguage } from '../context/LanguageContext';
import { translateGenre, getMovieTitle, getMovieDescription } from '../lib/translations';
import { validatePosterUrl, handlePosterError } from '../utils/imageFallback';
import { resolveTrailerUrl } from '../utils/trailerHelper';
import { ReportProblemModal } from './ReportProblemModal';
import { CreateRoomModal } from './CreateRoomModal';
import { notifyFavoriteToggled } from '../services/notifications';

// Допоміжний компонент для динамічного завантаження фото актора з Вікіпедії
function ActorAvatar({ name, fallbackUrl }: { name: string; fallbackUrl: string }) {
  const [imgUrl, setImgUrl] = useState<string>(fallbackUrl);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let active = true;
    const fetchWikiPhoto = async () => {
      if (!name) return;

      // Очищення імені від ролей та круглих дужок
      const cleanName = name.replace(/\s*\(.*?\)\s*/g, '').replace(/\s*\[.*?\]\s*/g, '').trim();
      const cacheKey = `wiki_img_${cleanName}`;

      try {
        const cached = sessionStorage.getItem(cacheKey);
        if (cached) {
          setImgUrl(cached);
          setLoading(false);
          return;
        }
      } catch (e) {
        // Ігнорування помилок мережевих обмежень пісочниці
      }

      try {
        setLoading(true);
        // Крок 1: Пошук фото в українській Вікіпедії
        const ukSearchUrl = `https://uk.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(cleanName)}&gsrlimit=1&prop=pageimages&pithumbsize=400&format=json&origin=*`;
        const ukRes = await fetch(ukSearchUrl);
        if (ukRes.ok) {
          const data = await ukRes.json();
          const pages = data.query?.pages;
          if (pages) {
            const firstPageKey = Object.keys(pages)[0];
            const page = pages[firstPageKey];
            if (page.thumbnail?.source) {
              const url = page.thumbnail.source;
              if (active) {
                setImgUrl(url);
                try {
                  sessionStorage.setItem(cacheKey, url);
                } catch (e) { }
                setLoading(false);
                return;
              }
            }
          }
        }

        // Крок 2: Резервний пошук в англійській Вікіпедії, якщо в українській немає фото
        const enSearchUrl = `https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(cleanName)}&gsrlimit=1&prop=pageimages&pithumbsize=400&format=json&origin=*`;
        const enRes = await fetch(enSearchUrl);
        if (enRes.ok) {
          const data = await enRes.json();
          const pages = data.query?.pages;
          if (pages) {
            const firstPageKey = Object.keys(pages)[0];
            const page = pages[firstPageKey];
            if (page.thumbnail?.source) {
              const url = page.thumbnail.source;
              if (active) {
                setImgUrl(url);
                try {
                  sessionStorage.setItem(cacheKey, url);
                } catch (e) { }
                setLoading(false);
                return;
              }
            }
          }
        }
      } catch (err) {
        console.info('Wikipedia image fetch error for:', cleanName, err);
      }

      if (active) {
        setLoading(false);
      }
    };

    fetchWikiPhoto();
    return () => {
      active = false;
    };
  }, [name, fallbackUrl]);

  return (
    <div className="relative w-16 h-16 rounded-full overflow-hidden border border-zinc-800 shadow-md bg-zinc-900 shrink-0 flex items-center justify-center">
      <img
        src={imgUrl}
        alt={name}
        referrerPolicy="no-referrer"
        className={`w-full h-full object-cover transition-all duration-500 ${loading ? 'scale-90 blur-[1px]' : 'scale-100 blur-0'}`}
      />
      {loading && (
        <span className="absolute inset-0 bg-black/45 flex items-center justify-center text-[8px] text-zinc-500 font-mono animate-pulse">
          Wiki...
        </span>
      )}
    </div>
  );
}

const PROPOSAL_FIELDS = [
  { value: 'ua_title', labelUA: 'Українська назва', labelEN: 'Ukrainian Title' },
  { value: 'en_title', labelUA: 'Англійська назва', labelEN: 'English Title' },
  { value: 'jp_title', labelUA: 'Японська назва', labelEN: 'Japanese Title' },
  { value: 'desc', labelUA: 'Опис', labelEN: 'Description' },
  { value: 'trailer_url', labelUA: 'URL YouTube трейлера', labelEN: 'YouTube Trailer URL' },
  { value: 'year', labelUA: 'Рік', labelEN: 'Year' },
  { value: 'alt_title', labelUA: 'Альтернативна назва', labelEN: 'Alternative Title' },
];

interface MovieDetailsProps {
  movie: Movie;
  allMovies: Movie[];
  user: UserProfile | null;
  onBack: () => void;
  onPlay: () => void;
  onSelectMovie: (movie: Movie) => void;
  onOpenAuth: () => void;
  onWatchTogether?: (movieId: string, options?: any) => void;
  onDownload?: (movie: Movie, episodeInfo?: string) => void;
  downloads?: DownloadItem[];
}

export default function MovieDetails({
  movie,
  allMovies,
  user,
  onBack,
  onPlay,
  onSelectMovie,
  onOpenAuth,
  onWatchTogether,
  onDownload,
  downloads
}: MovieDetailsProps) {
  const { language, t } = useLanguage();
  const [activeSubTab, setActiveSubTab] = useState<'about' | 'trailer' | 'actors' | 'reviews'>('about');

  // Відстеження списку обраних фільмів користувача
  const [isFavorite, setIsFavorite] = useState(false);

  // Стани модального вікна спільного перегляду (Watch Party)
  const [isWatchTogetherModalOpen, setIsWatchTogetherModalOpen] = useState(false);
  const [isTrailerModalOpen, setIsTrailerModalOpen] = useState(false);
  const [selectedStillIndex, setSelectedStillIndex] = useState<number | null>(null);

  // Відстеження статусу та статистики списків аніме
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [showSubscribeToast, setShowSubscribeToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const handleSubscribe = () => {
    const nextSubscribed = !isSubscribed;
    setIsSubscribed(nextSubscribed);

    if (nextSubscribed) {
      const title = language === 'ENG' && movie.titleEn ? movie.titleEn : movie.title;
      const msg = language === 'UA'
        ? `Ви успішно підписалися на «${title}»! Тепер ви отримуватимете сповіщення, коли з'явиться нова серія.`
        : `Successfully subscribed to "${title}"! You will receive notifications when a new episode is released.`;

      setToastMessage(msg);
      setShowSubscribeToast(true);

      // Автоматичне закриття сповіщення через 5 секунд
      setTimeout(() => {
        setShowSubscribeToast(false);
      }, 5000);
    }
  };

  // Стани користувацьких списків
  const [customLists, setCustomLists] = useState<CustomList[]>([]);
  const [isCustomListsSubMenuOpen, setIsCustomListsSubMenuOpen] = useState(false);
  const [isCreateListOpen, setIsCreateListOpen] = useState(false);

  // Поля створення нового списку
  const [newListName, setNewListName] = useState('');
  const [newListDesc, setNewListDesc] = useState('');
  const [newListIsPublic, setNewListIsPublic] = useState(true);

  // Синхронізація списків з localStorage
  useEffect(() => {
    const listKey = `custom_anime_lists_${user ? user.id : 'guest'}`;
    const savedLists = loadState<CustomList[]>(listKey, []);
    setCustomLists(savedLists);
  }, [user]);

  // Handle toggling Фільм inclusion in Користувацький Список
  const handleToggleMovieInList = (listId: string) => {
    const userId = user ? user.id : 'guest';
    const listKey = `custom_anime_lists_${userId}`;
    const updated = customLists.map(list => {
      if (list.id === listId) {
        const alreadyIn = list.movieIds.includes(movie.id);
        const movieIds = alreadyIn
          ? list.movieIds.filter(id => id !== movie.id)
          : [...list.movieIds, movie.id];
        return { ...list, movieIds };
      }
      return list;
    });
    setCustomLists(updated);
    saveState(listKey, updated);

    // Automatically ensure Фільм is in user_favs_ so it appears in My Список
    const favKey = `user_favs_${userId}`;
    const currentFavs = loadState<string[]>(favKey, user?.favorites || []);
    if (!currentFavs.includes(movie.id)) {
      saveState(favKey, [...currentFavs, movie.id]);
      setIsFavorite(true);
    }
    window.dispatchEvent(new Event('my_list_updated'));
  };

  // Handle creating Користувацький Список
  const handleCreateCustomList = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newListName.trim()) return;

    const userId = user ? user.id : 'guest';
    const listKey = `custom_anime_lists_${userId}`;
    const newList: CustomList = {
      id: 'list_' + Date.now(),
      name: newListName,
      description: newListDesc,
      isPublic: newListIsPublic,
      movieIds: [movie.id], // automatically add current movie to the list
      userId: user?.id
    };

    const updated = [...customLists, newList];
    setCustomLists(updated);
    saveState(listKey, updated);

    // Automatically ensure Фільм is in user_favs_ so it appears in My Список
    const favKey = `user_favs_${userId}`;
    const currentFavs = loadState<string[]>(favKey, user?.favorites || []);
    if (!currentFavs.includes(movie.id)) {
      saveState(favKey, [...currentFavs, movie.id]);
      setIsFavorite(true);
    }

    // Скидання fields
    setNewListName('');
    setNewListDesc('');
    setNewListIsPublic(true);
    setIsCreateListOpen(false);

    // Відкриття status Випадаюче меню to show the newly added Список with checked Стан
    setIsStatusDropdownOpen(true);
    setIsCustomListsSubMenuOpen(true);
    window.dispatchEvent(new Event('my_list_updated'));
  };

  // Fix modal states (Pencil - "Виправити" button)
  const [isFixModalOpen, setIsFixModalOpen] = useState(false);
  const [fixModalTab, setFixModalTab] = useState<'propose' | 'report'>('propose');
  const [proposeFields, setProposeFields] = useState<Array<{ id: string; type: string; value: string }>>([
    { id: 'field_' + Date.now(), type: '', value: '' }
  ]);
  const [proposeReason, setProposeReason] = useState('');

  const [reportType, setReportType] = useState('anime_mismatch');
  const [reportPlayer, setReportPlayer] = useState('all');
  const [reportDesc, setReportDesc] = useState('');

  // Обробка submitting proposal
  const handleSubmitProposal = (e: React.FormEvent) => {
    e.preventDefault();
    const activeProposals = proposeFields.filter(f => f.type && f.value.trim());
    if (activeProposals.length === 0) {
      alert(language === 'UA' ? 'Будь ласка, оберіть хоча б одне поле та заповніть його значення.' : 'Please select at least one field and fill its value.');
      return;
    }

    const savedProposals = loadState<any[]>('metadata_proposals', []);
    const newProposal = {
      id: 'prop_' + Date.now(),
      movieId: movie.id,
      movieTitle: movie.title,
      fields: activeProposals,
      reason: proposeReason,
      userId: user?.id || 'guest',
      username: user?.name || 'Guest',
      createdAt: new Date().toISOString()
    };
    saveState('metadata_proposals', [newProposal, ...savedProposals]);

    alert(language === 'UA'
      ? 'Дякуємо! Ваші пропозиції щодо змін надіслано модераторам для перевірки.'
      : 'Thank you! Your proposed changes have been sent to the moderators for review.'
    );

    setIsFixModalOpen(false);
    setProposeFields([{ id: 'field_' + Date.now(), type: '', value: '' }]);
    setProposeReason('');
  };

  // Обробка submitting problem report
  const handleSubmitReport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportDesc.trim()) {
      alert(language === 'UA' ? 'Будь ласка, опишіть проблему.' : 'Please describe the problem.');
      return;
    }

    const savedReports = loadState<any[]>('content_reports', []);
    const newReport = {
      id: 'rep_' + Date.now(),
      movieId: movie.id,
      movieTitle: movie.title,
      type: reportType,
      player: reportPlayer,
      description: reportDesc,
      userId: user?.id || 'guest',
      username: user?.name || 'Guest',
      createdAt: new Date().toISOString()
    };
    saveState('content_reports', [newReport, ...savedReports]);

    alert(language === 'UA'
      ? 'Повідомлення про проблему надіслано. Наші технічні спеціалісти перевірять плеєр найближчим часом!'
      : 'The issue report has been sent. Our technical team will check the player soon!'
    );

    setIsFixModalOpen(false);
    setReportType('anime_mismatch');
    setReportPlayer('all');
    setReportDesc('');
  };

  const handleAddProposalField = () => {
    setProposeFields([...proposeFields, { id: 'field_' + Date.now(), type: '', value: '' }]);
  };

  const handleRemoveProposalField = (id: string) => {
    if (proposeFields.length > 1) {
      setProposeFields(proposeFields.filter(f => f.id !== id));
    }
  };

  const handleUpdateProposalField = (id: string, type: string, value: string) => {
    setProposeFields(proposeFields.map(f => f.id === id ? { ...f, type, value } : f));
  };

  useEffect(() => {
    const storeKey = `anime_list_status_${user ? user.id : 'guest'}`;
    const saved = loadState<Record<string, string>>(storeKey, {});
    setSelectedStatus(saved[movie.id] || null);
  }, [movie.id, user]);

  const handleSelectStatus = (status: string | null) => {
    const userId = user ? user.id : 'guest';
    const storeKey = `anime_list_status_${userId}`;
    const saved = loadState<Record<string, string>>(storeKey, {});
    if (status) {
      saved[movie.id] = status;
    } else {
      delete saved[movie.id];
    }
    saveState(storeKey, saved);
    setSelectedStatus(status);

    // Automatically ensure Фільм is saved to user_favs_ so it is present in My Список
    if (status) {
      const favKey = `user_favs_${userId}`;
      const currentFavs = loadState<string[]>(favKey, user?.favorites || []);
      if (!currentFavs.includes(movie.id)) {
        saveState(favKey, [...currentFavs, movie.id]);
        setIsFavorite(true);
      }
    }
    window.dispatchEvent(new Event('my_list_updated'));
  };

  const getStudioForAnime = (id: string, director: string): string => {
    const lowerId = id.toLowerCase();
    if (lowerId.includes('mushoku') || lowerId.includes('bind')) return 'Studio Bind';
    if (lowerId.includes('cyberpunk') || lowerId.includes('edgerunners')) return 'Trigger';
    if (lowerId.includes('kaiju')) return 'Production I.G';
    if (lowerId.includes('your-name') || lowerId.includes('shinkai') || lowerId.includes('kimi-no')) return 'CoMix Wave Films';
    if (lowerId.includes('totoro') || lowerId.includes('spirited-away') || lowerId.includes('ghibli')) return 'Studio Ghibli';
    if (lowerId.includes('jujutsu') || lowerId.includes('chainsaw') || lowerId.includes('shingeki') || lowerId.includes('attack-on-titan') || lowerId.includes('vinland')) return 'MAPPA';
    if (lowerId.includes('demon-slayer') || lowerId.includes('kimetsu') || lowerId.includes('ufotable')) return 'ufotable';
    if (lowerId.includes('berserk')) return 'OLM';
    if (lowerId.includes('death-note') || lowerId.includes('hunter')) return 'Madhouse';
    if (lowerId.includes('frieren') || lowerId.includes('sousou')) return 'Madhouse';
    if (lowerId.includes('solo-leveling') || lowerId.includes('solo')) return 'A-1 Pictures';
    if (lowerId.includes('oshi-no-ko') || lowerId.includes('oshi')) return 'Doga Kobo';
    return 'CloverWorks';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'watching': return 'bg-emerald-500';
      case 'completed': return 'bg-blue-500';
      case 'planned': return 'bg-indigo-500';
      case 'on_hold': return 'bg-amber-500';
      case 'dropped': return 'bg-rose-500';
      default: return 'bg-zinc-500';
    }
  };

  const getStatusLabel = (status: string, lang: 'UA' | 'ENG') => {
    switch (status) {
      case 'watching': return lang === 'UA' ? 'Дивлюсь' : 'Watching';
      case 'completed': return lang === 'UA' ? 'Завершено' : 'Completed';
      case 'planned': return lang === 'UA' ? 'В планах' : 'Plan to Watch';
      case 'on_hold': return lang === 'UA' ? 'Відкладено' : 'On-Hold';
      case 'dropped': return lang === 'UA' ? 'Кинуто' : 'Dropped';
      default: return '';
    }
  };

  // Unique deterministic statistics based on Фільм.id and current selection
  const getAnimeStats = (movieId: string, userStatus: string | null) => {
    let hash = 0;
    for (let i = 0; i < movieId.length; i++) {
      hash = movieId.charCodeAt(i) + ((hash << 5) - hash);
    }
    const seed = Math.abs(hash);

    const baseTotal = 2400 + (seed % 9600);

    const watchingPct = 15 + (seed % 25);
    const completedPct = 25 + ((seed >> 2) % 30);
    const plannedPct = 10 + ((seed >> 4) % 15);
    const onHoldPct = 3 + ((seed >> 6) % 6);
    const droppedPct = 2 + ((seed >> 8) % 5);

    const sumPct = watchingPct + completedPct + plannedPct + onHoldPct + droppedPct;

    let watching = Math.round((watchingPct / sumPct) * baseTotal);
    let completed = Math.round((completedPct / sumPct) * baseTotal);
    let planned = Math.round((plannedPct / sumPct) * baseTotal);
    let onHold = Math.round((onHoldPct / sumPct) * baseTotal);
    let dropped = Math.round((droppedPct / sumPct) * baseTotal);

    if (userStatus === 'watching') watching += 1;
    else if (userStatus === 'completed') completed += 1;
    else if (userStatus === 'planned') planned += 1;
    else if (userStatus === 'on_hold') onHold += 1;
    else if (userStatus === 'dropped') dropped += 1;

    const total = watching + completed + planned + onHold + dropped;

    return { watching, completed, planned, onHold, dropped, total };
  };

  const stats = getAnimeStats(movie.id, selectedStatus);

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: movie.title,
        text: movie.description,
        url: window.location.href,
      }).catch(err => console.log(err));
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert(language === 'UA' ? 'Посилання скопійовано в буфер обміну!' : 'Link copied to clipboard!');
    }
  };

  // Offline download Стани
  const [downloadState, setDownloadState] = useState<'idle' | 'downloading' | 'completed'>('idle');
  const [downloadProgress, setDownloadProgress] = useState(0);

  const currentDownloadItem = useMemo(() => {
    if (!downloads) return null;
    return downloads.find(d => d.movieId === movie.id);
  }, [downloads, movie.id]);

  useEffect(() => {
    if (downloads !== undefined) {
      if (!currentDownloadItem) {
        setDownloadState('idle');
        setDownloadProgress(0);
      } else if (currentDownloadItem.status === 'completed' || currentDownloadItem.progress >= 100) {
        setDownloadState('completed');
        setDownloadProgress(100);
      } else if (currentDownloadItem.status === 'downloading' || currentDownloadItem.status === 'paused') {
        setDownloadState('downloading');
        setDownloadProgress(currentDownloadItem.progress);
      } else {
        setDownloadState('idle');
        setDownloadProgress(0);
      }
    } else {
      const checkOffline = async () => {
        try {
          const offlineData = await getOfflineMovie(movie.id);
          if (offlineData) {
            setDownloadState('completed');
          } else {
            setDownloadState('idle');
          }
        } catch (err) {
          console.warn('Error checking offline storage', err);
        }
      };
      checkOffline();
    }
  }, [movie.id, downloads, currentDownloadItem]);

  const handleDownload = async () => {
    if (downloadState === 'completed') {
      await deleteOfflineMovie(movie.id);
      setDownloadState('idle');
      return;
    }

    if (onDownload) {
      onDownload(movie);
      return;
    }

    try {
      setDownloadState('downloading');
      setDownloadProgress(5);

      const fetchBlobWithProgress = async (url: string, onProgress: (progress: number) => void): Promise<Blob> => {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        const contentLength = response.headers.get('content-length');
        const total = contentLength ? parseInt(contentLength, 10) : 0;

        const reader = response.body?.getReader();
        if (!reader) {
          return response.blob();
        }

        let loaded = 0;
        const chunks: BlobPart[] = [];

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) {
            chunks.push(value);
            loaded += value.length;
            if (total > 0) {
              const p = Math.round((loaded / total) * 100);
              onProgress(p);
            }
          }
        }

        return new Blob(chunks);
      };

      setDownloadProgress(10);
      let posterBlob: Blob | undefined;
      try {
        const posterRes = await fetch(movie.posterUrl);
        if (posterRes.ok) posterBlob = await posterRes.blob();
      } catch (e) {
        console.warn('Failed to cache poster', e);
      }

      setDownloadProgress(20);
      let backdropBlob: Blob | undefined;
      if (movie.backdropUrl) {
        try {
          const backdropRes = await fetch(movie.backdropUrl);
          if (backdropRes.ok) backdropBlob = await backdropRes.blob();
        } catch (e) {
          console.warn('Failed to cache backdrop', e);
        }
      }

      setDownloadProgress(30);
      let videoBlob: Blob | undefined;
      try {
        videoBlob = await fetchBlobWithProgress(movie.videoUrl, (p) => {
          const overall = Math.round(30 + (p * 0.65));
          setDownloadProgress(overall);
        });
      } catch (e) {
        console.warn('Failed to fetch video file directly, switching to mock offline mode', e);
      }

      setDownloadProgress(95);
      await saveMovieOffline(movie, videoBlob, posterBlob, backdropBlob);
      setDownloadProgress(100);
      setDownloadState('completed');
    } catch (err) {
      console.error('Download failed', err);
      try {
        await saveMovieOffline(movie);
        setDownloadState('completed');
      } catch (innerErr) {
        setDownloadState('idle');
        alert(language === 'UA' ? 'Помилка при збереженні метаданих офлайн.' : 'Error saving metadata offline.');
      }
    }
  };

  // Review posting Стан & Рейтинг picker (0 = unselected)
  const [reviewRating, setReviewRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [reviewComment, setReviewComment] = useState('');
  const [activeReviews, setActiveReviews] = useState<Review[]>([]);
  const [reviewPage, setReviewPage] = useState(0);
  const [reviewLikes, setReviewLikes] = useState<Record<string, { count: number; liked: boolean }>>({});

  const DEFAULT_SCREENSHOT_REVIEWS: Review[] = [
    {
      id: 'rev_1',
      username: 'Анліс Треволт',
      userAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
      rating: 3.5,
      comment: 'Якщо не відповідаю — швидше за все, дивлюся ще один сезон або знайшла новий фільм, який вартий уваги.',
      createdAt: '2 дні назад'
    },
    {
      id: 'rev_2',
      username: 'Алан По',
      userAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
      rating: 4,
      comment: 'Давно не дивився фільм, який настільки тримає в напрузі. Здавалося, що сюжет уже можна передбачити, але кожні 20 хвилин усе переверталося з ніг на голову. Атмосфера, музика та операторська робота просто неймовірні. Однозначно рекомендую!',
      createdAt: '2 дні назад'
    },
    {
      id: 'rev_3',
      username: 'Матвій Грід',
      userAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80',
      rating: 5,
      comment: 'Візуально дуже красиво. Кожен кадр можна ставити на шпалери. Є кілька моментів, які трохи затягнуті, але фінал повністю виправдовує це. Після перегляду ще довго думала про історію.',
      createdAt: '2 дні назад'
    },
    {
      id: 'rev_4',
      username: 'Діма Дмітров',
      userAvatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=150&q=80',
      rating: 5,
      comment: 'Не очікував, що сподобається настільки сильно. Дивився ввечері "на пів години", а в результаті проковтнув весь фільм за один раз. Атмосфера — 10 із 10',
      createdAt: '2 дні назад'
    },
    {
      id: 'rev_5',
      username: 'Булочка Тера',
      userAvatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=150&q=80',
      rating: 2,
      comment: 'Ідея цікава, але особисто мені не вистачило глибшого розкриття другорядних персонажів. Початок дуже сильний, середина трохи просідає, зате фінал залишає приємне враження. Загалом вартий перегляду.',
      createdAt: '2 дні назад'
    },
    {
      id: 'rev_6',
      username: 'Вікторія Дяка',
      userAvatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&q=80',
      rating: 3,
      comment: 'Один із тих фільмів, після яких одразу хочеться зайти в коментарі й подивитися, що помітили інші. Багато дрібних деталей відкриваються лише наприкінці. Любителям психологічних трилерів точно зайде',
      createdAt: '2 дні назад'
    },
    {
      id: 'rev_7',
      username: 'Максим Коваль',
      userAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
      rating: 5,
      comment: 'Чудовий аніме-фільм з неймовірним звуковим супроводом! Переглянув на одному диханні.',
      createdAt: '3 дні назад'
    },
    {
      id: 'rev_8',
      username: 'Олена Савченко',
      userAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80',
      rating: 4,
      comment: 'Дуже глибокий сюжет і неймовірна анімація персонажів. Обов\'язково передивлюся ще раз.',
      createdAt: '3 дні назад'
    },
    {
      id: 'rev_9',
      username: 'Денис Мельник',
      userAvatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=150&q=80',
      rating: 5,
      comment: 'Справжній шедевр сучасного аніме. Графічний стиль просто вражає!',
      createdAt: '4 дні назад'
    },
    {
      id: 'rev_10',
      username: 'Софія Шевченко',
      userAvatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=150&q=80',
      rating: 4,
      comment: 'Емоційна та захоплююча історія. Музичне оформлення заслуговує на окрему похвалу.',
      createdAt: '5 днів назад'
    },
    {
      id: 'rev_11',
      username: 'Ігор Бондар',
      userAvatar: 'https://images.unsplash.com/photo-1527980965255-d3b416303d12?auto=format&fit=crop&w=150&q=80',
      rating: 5,
      comment: 'Неймовірний розпит персонажів і динамічні бойові сцени. 10/10!',
      createdAt: '6 днів назад'
    },
    {
      id: 'rev_12',
      username: 'Анастасія Ткач',
      userAvatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=150&q=80',
      rating: 4,
      comment: 'Дуже вразила атмосфера та кінцівка. Рекомендую усім прихильникам жанру!',
      createdAt: 'Тиждень тому'
    }
  ];

  // Синхронізація Стан initially
  useEffect(() => {
    const userId = user ? user.id : 'guest_favs';
    const favList = loadState<string[]>(`user_favs_${userId}`, user?.favorites || []);
    setIsFavorite(favList.includes(movie.id));
    const persistedReviews = loadState<Review[]>(`reviews_movie_${movie.id}`, []);
    if (persistedReviews.length > 0) {
      setActiveReviews([...persistedReviews, ...DEFAULT_SCREENSHOT_REVIEWS]);
    } else {
      setActiveReviews(DEFAULT_SCREENSHOT_REVIEWS);
    }
  }, [movie.id, user]);

  const handleToggleFavorite = () => {
    const userId = user ? user.id : 'guest_favs';
    const currentFavs = loadState<string[]>(`user_favs_${userId}`, user?.favorites || []);
    let updated: string[];
    if (isFavorite) {
      updated = currentFavs.filter(id => id !== movie.id);
      setIsFavorite(false);
      try { notifyFavoriteToggled(movie, false); } catch {}
    } else {
      updated = [...currentFavs, movie.id];
      setIsFavorite(true);
      try { notifyFavoriteToggled(movie, true); } catch {}
    }
    saveState(`user_favs_${userId}`, updated);
  };

  const handlePostReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewComment.trim()) return;

    const reviewerName = user ? user.name : (language === 'UA' ? 'Користувач' : 'User');
    const reviewerAvatar = user ? user.avatarUrl : PRESET_AVATARS[0].url;

    const finalRating = reviewRating > 0 ? reviewRating : 5;

    const newReview: Review = {
      id: 'rev_' + Date.now(),
      username: reviewerName,
      userAvatar: reviewerAvatar,
      rating: finalRating,
      comment: reviewComment,
      createdAt: 'Щойно'
    };

    const updatedReviews = [newReview, ...activeReviews];
    setActiveReviews(updatedReviews);
    setReviewComment('');
    setReviewRating(0);
    setReviewPage(0);

    // Збереження to Фільм Рецензії
    saveState(`reviews_movie_${movie.id}`, [newReview, ...loadState<Review[]>(`reviews_movie_${movie.id}`, [])]);

    // Track locally created Рецензії
    const authoredReviewIds = loadState<string[]>('authored_review_ids', []);
    saveState('authored_review_ids', [...authoredReviewIds, newReview.id]);

    // Persist to Користувач authored Рецензії for Профіль view
    const userId = user ? user.id : 'guest';
    const userRevKey = `user_authored_reviews_${userId}`;
    const userReviews = loadState<any[]>(userRevKey, []);
    const authoredEntry = {
      id: newReview.id,
      movieId: movie.id,
      movieTitle: movie.title,
      movieTitleEn: movie.titleEn,
      moviePoster: movie.posterUrl,
      movieBackdrop: movie.backdropUrl || movie.posterUrl,
      movieYear: movie.year,
      movieRating: movie.rating,
      movieGenres: movie.genres,
      movieType: movie.type,
      rating: finalRating > 5 ? Number(finalRating.toFixed(1)) : Number((finalRating * 2).toFixed(1)),
      comment: newReview.comment,
      createdAt: language === 'UA' ? 'Щойно' : 'Just now'
    };
    saveState(userRevKey, [authoredEntry, ...userReviews.filter((r: any) => r.movieId !== movie.id)]);

    // Also Синхронізація star ratings
    const ratingsKey = `user_ratings_${userId}`;
    const currentRatings = loadState<Record<string, number>>(ratingsKey, {});
    saveState(ratingsKey, { ...currentRatings, [movie.id]: finalRating });
    window.dispatchEvent(new Event('user_reviews_updated'));
  };

  const handleDeleteReview = (reviewId: string) => {
    const updatedReviews = activeReviews.filter(rev => rev.id !== reviewId);
    setActiveReviews(updatedReviews);
    saveState(`reviews_movie_${movie.id}`, updatedReviews);
  };

  const toggleReviewLike = (revId: string) => {
    setReviewLikes(prev => {
      const current = prev[revId] || { count: 35, liked: false };
      const nextLiked = !current.liked;
      return {
        ...prev,
        [revId]: {
          count: nextLiked ? current.count + 1 : current.count - 1,
          liked: nextLiked
        }
      };
    });
  };

  const canDeleteReview = (rev: Review) => {
    if (user && (user.role === 'admin' || user.name === 'Admin')) {
      return true;
    }
    if (user && user.name === rev.username) {
      return true;
    }
    const authoredReviewIds = loadState<string[]>('authored_review_ids', []);
    if (authoredReviewIds.includes(rev.id)) {
      return true;
    }
    return false;
  };

  // Smart recommendation logic based on current Фільм's Жанри, type, and director
  const similarMovies = useMemo(() => {
    const isCurrentAnime = movie.genres?.some(g => g === 'Аніме' || g === 'Anime') || movie.type === 'anime';
    const currentGenres = new Set(movie.genres || []);

    const scored = allMovies
      .filter(m => m.id !== movie.id)
      .map(m => {
        let score = 0;
        const isTargetAnime = m.genres?.some(g => g === 'Аніме' || g === 'Anime') || m.type === 'anime';

        // Same archetype match
        if (isCurrentAnime === isTargetAnime) {
          score += 40;
        }
        if (movie.type && m.type && movie.type === m.type) {
          score += 20;
        }

        // Shared Жанри matching
        if (m.genres && m.genres.length > 0) {
          m.genres.forEach(g => {
            if (currentGenres.has(g)) {
              score += 35;
            }
          });
        }

        // Director match bonus
        if (movie.director && m.director && movie.director === m.director) {
          score += 30;
        }

        // Рейтинг weight
        const r = typeof m.rating === 'number' ? m.rating : parseFloat(String(m.rating)) || 7.5;
        score += r * 3;

        // Year proximity
        if (movie.year && m.year) {
          const diff = Math.abs(movie.year - m.year);
          if (diff <= 2) score += 10;
        }

        return { movie: m, score };
      });

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, 5).map(s => s.movie);
  }, [allMovies, movie]);

  // Cast Список
  const castList = (movie.cast && movie.cast.length > 0) ? movie.cast : [
    { name: 'Michael Johnston', role: 'Актор', avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80' },
    { name: 'Inde Navarrette', role: 'Акторка', avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80' },
    { name: 'Cooper Tomlinson', role: 'Актор', avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&q=80' },
    { name: 'Megan Lawless', role: 'Акторка', avatarUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=200&q=80' },
    { name: 'Andy Richter', role: 'Актор', avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80' }
  ];

  const backdropImage = validatePosterUrl(movie.backdropUrl || movie.posterUrl, movie.title, movie.type, movie.genres);

  const resolvedTrailerUrl = useMemo(() => {
    return resolveTrailerUrl(movie, language);
  }, [language, movie]);

  const stillsList = useMemo(() => {
    if (movie.stills && movie.stills.length > 0) {
      return movie.stills;
    }
    const fallback: string[] = [];
    if (movie.backdropUrl) fallback.push(movie.backdropUrl);
    if (movie.posterUrl) fallback.push(movie.posterUrl);
    return fallback;
  }, [movie.stills, movie.backdropUrl, movie.posterUrl]);

  // Динамічний calculation of percentage breakdown for 5, 4, 3, 2, 1 stars based on activeReviews
  const ratingDistribution = useMemo(() => {
    const counts: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    
    if (!activeReviews || activeReviews.length === 0) {
      return [
        { stars: 5, pct: '68%' },
        { stars: 4, pct: '18%' },
        { stars: 3, pct: '7%' },
        { stars: 2, pct: '4%' },
        { stars: 1, pct: '3%' },
      ];
    }

    activeReviews.forEach(rev => {
      const starVal = rev.rating > 5 ? Math.round(rev.rating / 2) : Math.max(1, Math.min(5, Math.round(rev.rating)));
      counts[starVal] = (counts[starVal] || 0) + 1;
    });

    const total = activeReviews.length;

    return [5, 4, 3, 2, 1].map(stars => {
      const cnt = counts[stars] || 0;
      const percentage = total > 0 ? Math.round((cnt / total) * 100) : 0;
      return {
        stars,
        pct: `${percentage}%`,
        count: cnt
      };
    });
  }, [activeReviews]);

  return (
    <div className="relative min-h-screen font-sans text-white bg-[#080808] overflow-hidden mx-0 sm:-mx-6 lg:-mx-8 mt-0 pt-0 px-4 sm:px-6 lg:px-8 pb-16">
      {/* 1. Page Background Photo — covers hero down to midpoint of trailer, then fades smoothly to #080808 */}
      <div 
        className="absolute -top-[110px] md:-top-[171px] left-0 right-0 h-[calc(115vh+171px)] pointer-events-none z-0 overflow-hidden gpu-layer"
        style={{
          WebkitMaskImage: 'linear-gradient(to bottom, black 0%, black 70%, transparent 100%)',
          maskImage: 'linear-gradient(to bottom, black 0%, black 70%, transparent 100%)',
        }}
      >
        <img
          src={backdropImage}
          alt=""
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover object-top filter blur-[2px] opacity-55 scale-105 transform-gpu"
        />
        {/* side vignette */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#080808]/60 via-transparent to-[#080808]/60" />
        {/* top-to-bottom fade: image visible at top, fades to #080808 at bottom half */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#080808]/20 via-[#080808]/40 to-[#080808]" />
        <div className="absolute inset-x-0 bottom-0 h-48 md:h-64 bg-gradient-to-b from-transparent to-[#080808]" />
      </div>

      {/* Main Content Контейнер */}
      <div className="relative z-10 max-w-6xl mx-auto space-y-12">
        {/* Toast Notification for Subscribe */}
        {showSubscribeToast && (
          <div className="fixed top-6 right-6 z-50 max-w-sm bg-[#0a0a0c]/95 border border-[#FF4D5C]/40 shadow-2xl rounded-2xl p-4.5 animate-slide-in-right flex items-start gap-4 backdrop-blur-md">
            <div className="p-2.5 bg-[#FF4D5C]/10 text-[#FF4D5C] rounded-xl border border-[#FF4D5C]/20 shrink-0">
              <Bell className="w-5 h-5 fill-[#FF4D5C] animate-bounce text-[#FF4D5C]" />
            </div>
            <div className="space-y-1.5 flex-1 min-w-0">
              <h4 className="font-sans font-black text-white text-xs tracking-wide uppercase">
                {language === 'UA' ? 'Підписка оформлена' : 'Subscription Active'}
              </h4>
              <p className="text-zinc-300 text-xs leading-relaxed font-medium">
                {toastMessage}
              </p>
            </div>
            <button
              onClick={() => setShowSubscribeToast(false)}
              className="text-zinc-500 hover:text-white transition-colors cursor-pointer shrink-0 mt-0.5"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Top Back Action (30px from Шапка сайту only for text on mobile) */}
        <div className="flex items-center justify-between pt-[30px] md:pt-0 mb-[30px]">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-white group cursor-pointer text-[16px] font-medium py-1 select-none"
          >
            <ChevronLeft className="w-5 h-5 text-white group-hover:-translate-x-0.5 transition-transform shrink-0" />
            <span className="text-[16px] leading-none">
              {language === 'UA' ? 'Назад до фільмів' : 'Back to movies'}
            </span>
          </button>
        </div>

        {/* MOBILE HERO LAYOUT (1:1 with Reference Screenshot) */}
        <div className="md:hidden space-y-3">
          <div className="flex gap-3.5 items-start">
            {/* Left Колонка: Poster + Action Кнопки */}
            <div className="w-[104px] shrink-0 flex flex-col gap-2">
              <div className="w-[104px] h-[158px] min-w-[104px] max-w-[104px] aspect-[104/158] rounded-[16px] overflow-hidden ring-0 md:ring-1 md:ring-inset md:ring-[#2A2A2A] shadow-xl bg-[#121212]">
                <img
                  src={validatePosterUrl(movie.posterUrl, movie.title, movie.type, movie.genres)}
                  alt={language === 'ENG' && movie.titleEn ? movie.titleEn : movie.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                  onError={(e) => handlePosterError(e, movie.posterUrl, movie.title, movie.type, movie.genres, movie.year, movie.titleEn, movie.originalTitle)}
                />
              </div>

              {/* Watch CTA Кнопка with Branded Animation */}
              <button
                onClick={onPlay}
                className="journey-cta-btn border-2 border-transparent hover:border-white/80 active:border-transparent text-white w-[103px] h-[24px] rounded-[6px] font-bold text-[10px] flex items-center justify-center gap-1.5 transition-all transform hover:scale-102 active:scale-98 hover:shadow-[0_0_24px_rgba(255,255,255,0.3),0_10px_25px_rgba(215,40,53,0.35)] shadow-lg shadow-[#FF4D5C]/25 cursor-pointer select-none overflow-hidden"
              >
                <img src="/icons/play_top.png" alt="Play" className="w-3 h-3 object-contain ml-0.5" />
                <span>{language === 'UA' ? 'Дивитися' : 'Watch'}</span>
              </button>

              {/* Watch Party Кнопка with Gradient Border */}
              <button
                onClick={() => {
                  try {
                    const currentIds = JSON.parse(localStorage.getItem('user_watchparty_ids') || '[]');
                    if (!currentIds.includes(movie.id)) {
                      localStorage.setItem('user_watchparty_ids', JSON.stringify([movie.id, ...currentIds]));
                    }
                  } catch (e) {}
                  if (onWatchTogether) onWatchTogether(movie.id);
                }}
                className="relative w-[103px] h-[24px] bg-transparent hover:bg-white/10 text-white font-bold text-[10px] rounded-[6px] transition-all cursor-pointer group active:scale-95 flex items-center justify-center"
              >
                <span
                  className="absolute inset-0 rounded-[6px] pointer-events-none"
                  style={{
                    padding: '1.5px',
                    background: 'linear-gradient(135deg, #FFFFFF 0%, #D72835 100%)',
                    WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                    mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                    WebkitMaskComposite: 'xor',
                    maskComposite: 'exclude',
                  }}
                />
                <span className="relative z-10">Watch Party</span>
              </button>

              {/* Heart & Download Рядок with Gradient Borders (w34 h24) */}
              <div className="flex items-center justify-between w-[103px]">
                <button
                  onClick={handleToggleFavorite}
                  className="relative w-[34px] h-[24px] rounded-[6px] bg-transparent hover:bg-white/10 text-white transition-all cursor-pointer flex items-center justify-center group active:scale-95 shrink-0"
                  title={language === 'UA' ? (isFavorite ? 'Видалити з обраного' : 'Додати в обране') : (isFavorite ? 'Remove from favorites' : 'Add to favorites')}
                >
                  <span
                    className="absolute inset-0 rounded-[6px] pointer-events-none"
                    style={{
                      padding: '1.5px',
                      background: isFavorite 
                        ? 'linear-gradient(135deg, #FF3040 0%, #D72835 100%)' 
                        : 'linear-gradient(135deg, #FFFFFF 0%, #D72835 100%)',
                      WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                      mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                      WebkitMaskComposite: 'xor',
                      maskComposite: 'exclude',
                    }}
                  />
                  <Heart 
                    className={`w-3.5 h-3.5 relative z-10 transition-all duration-200 ${
                      isFavorite 
                        ? 'fill-[#FF3040] text-[#FF3040] scale-110 drop-shadow-[0_0_10px_rgba(255,48,64,0.85)]' 
                        : 'text-white/85 group-hover:text-white stroke-[2] fill-transparent'
                    }`} 
                  />
                </button>
                <button
                  onClick={handleDownload}
                  className="relative w-[34px] h-[24px] rounded-[6px] bg-transparent hover:bg-white/10 text-white transition-all cursor-pointer flex items-center justify-center group active:scale-95 shrink-0"
                  title={language === 'UA' ? 'Завантажити' : 'Download'}
                >
                  <span
                    className="absolute inset-0 rounded-[6px] pointer-events-none"
                    style={{
                      padding: '1.5px',
                      background: 'linear-gradient(135deg, #FFFFFF 0%, #D72835 100%)',
                      WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                      mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                      WebkitMaskComposite: 'xor',
                      maskComposite: 'exclude',
                    }}
                  />
                  <div className="relative z-10 flex items-center justify-center">
                    {downloadState === 'downloading' ? (
                      <div className="w-3 h-3 border-2 border-[#FF4D5C] border-t-transparent rounded-full animate-spin" />
                    ) : downloadState === 'completed' ? (
                      <Check className="w-3.5 h-3.5 text-[#FF4D5C]" />
                    ) : (
                      <img src="/icons/Downloads.png" alt="Download" className="w-3.5 h-3.5 object-contain" />
                    )}
                  </div>
                </button>
              </div>
            </div>

            {/* Right Колонка: Заголовок, Metadata, Synopsis, Report Problem */}
            <div className="flex-1 min-w-0 flex flex-col justify-between self-stretch">
              <div className="space-y-1.5">
                <h1 className="text-[16px] font-bold text-white tracking-tight leading-tight">
                  {getMovieTitle(movie, language)}
                </h1>

                {/* Subtitle Line: Трилер • Жахи • 2026 • ⭐ 8.6 (14px) */}
                <div className="flex items-center gap-1.5 text-[14px] text-zinc-300 font-sans flex-wrap">
                  {movie.genres?.slice(0, 2).map((g, idx) => (
                    <React.Fragment key={g}>
                      {idx > 0 && <span className="text-[#FF3040] font-bold">•</span>}
                      <span>{translateGenre(g, language)}</span>
                    </React.Fragment>
                  ))}
                  <span className="text-[#FF3040] font-bold">•</span>
                  <span>{movie.year}</span>
                  <span className="text-[#FF3040] font-bold">•</span>
                  <span className="text-white font-bold flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 fill-[#FF3040] text-[#FF3040] inline shrink-0" />
                    <span>{typeof movie.rating === 'number' ? movie.rating.toFixed(1) : movie.rating}</span>
                  </span>
                </div>

                {/* Опис Synopsis (12px) */}
                <p className="text-zinc-300 text-[12px] leading-relaxed font-sans line-clamp-8 pt-0.5">
                  {getMovieDescription(movie, language)}
                </p>
              </div>

              {/* Report Problem Link under synopsis on mobile (12px) */}
              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => {
                    setFixModalTab('report');
                    setIsFixModalOpen(true);
                  }}
                  className="text-[12px] text-[#FF3040] hover:text-[#FF4D5C] active:text-[#D41424] font-normal cursor-pointer transition-colors text-right"
                >
                  {language === 'UA' ? (
                    <span className="flex flex-col items-start text-left leading-tight">
                      <span>Повідомити</span>
                      <span>про проблему</span>
                    </span>
                  ) : (
                    <span className="flex flex-col items-start text-left leading-tight">
                      <span>Report a</span>
                      <span>problem</span>
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* DESKTOP HERO SECTION 1:1 Matching Reference Screenshot */}
        <div className="hidden md:grid md:grid-cols-12 gap-8 items-start">
          {/* Left Poster Колонка */}
          <div className="md:col-span-4 flex flex-col items-center md:items-start gap-3">
            <div className="relative w-[280px] sm:w-[300px] aspect-[2/3] rounded-[16px] overflow-hidden shadow-2xl border border-[#2A2A2A] group">
              <img
                src={validatePosterUrl(movie.posterUrl, movie.title, movie.type, movie.genres)}
                alt={language === 'ENG' && movie.titleEn ? movie.titleEn : movie.title}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover transition duration-500 group-hover:scale-102"
                onError={(e) => handlePosterError(e, movie.posterUrl, movie.title, movie.type, movie.genres, movie.year, movie.titleEn, movie.originalTitle)}
              />
            </div>

            {/* Report Problem Link under Poster */}
            <button
              onClick={() => {
                setFixModalTab('report');
                setIsFixModalOpen(true);
              }}
              className="text-xs sm:text-[13px] text-[#FF3040] hover:text-[#FF4D5C] active:text-[#D41424] group font-normal cursor-pointer transition-colors pt-0.5"
            >
              <span className="underline underline-offset-4 decoration-1 decoration-[#FF3040] group-hover:decoration-[#FF4D5C] group-active:decoration-[#D41424]">
                {language === 'UA' ? 'Повідомити про проблему' : 'Report a problem'}
              </span>
            </button>
          </div>

          {/* Right Details */}
          <div className="md:col-span-8 space-y-4 pt-2">
            <h1 className="text-3xl md:text-5xl font-black text-white font-display tracking-tight leading-tight">
              {getMovieTitle(movie, language)}
            </h1>

            {/* Subtitle Line: Трилер • Екшн • 2026 • ⭐ 8.6 */}
            <div className="flex items-center gap-2 text-sm text-zinc-300 font-medium flex-wrap">
              <span>{movie.genres?.map(g => translateGenre(g, language)).join(' • ')}</span>
              <span className="text-[#FF3040]">•</span>
              <span>{movie.year}</span>
              <span className="text-[#FF3040]">•</span>
              <span className="text-white font-bold flex items-center gap-1.5">
                <img src="/icons/StarFull.png" alt="★" className="w-4 h-4 object-contain inline shrink-0" />
                <span>{movie.rating}</span>
              </span>
            </div>

            {/* Опис Synopsis */}
            <p className="text-zinc-300 text-sm md:text-base leading-relaxed font-sans max-w-2xl font-normal pt-1">
              {getMovieDescription(movie, language)}
            </p>

            {/* Кнопки Рядок (Figma sizes: 179x39, 160x39, 41x39, 41x39) */}
            <div className="pt-4 flex flex-wrap items-center gap-3">
              {/* Primary Watch Кнопка (Figma: 179px x 39px, rounded-10px) */}
              <button
                onClick={onPlay}
                className="journey-cta-btn border-2 border-transparent hover:border-white/80 active:border-transparent text-white w-[179px] h-[39px] rounded-[10px] font-bold text-sm flex items-center justify-center gap-2.5 transition-all transform hover:scale-102 active:scale-98 hover:shadow-[0_0_24px_rgba(255,255,255,0.3),0_10px_25px_rgba(215,40,53,0.35)] shadow-lg shadow-[#FF4D5C]/25 cursor-pointer select-none"
              >
                <img src="/icons/play_top.png" alt="Play" className="w-4 h-4 object-contain ml-0.5" />
                <span>{language === 'UA' ? 'Дивитися' : 'Watch'}</span>
              </button>

              {/* Watch Party Кнопка (Figma: 160px x 39px, rounded-10px) */}
              <button
                onClick={() => {
                  try {
                    const currentIds = JSON.parse(localStorage.getItem('user_watchparty_ids') || '[]');
                    if (!currentIds.includes(movie.id)) {
                      localStorage.setItem('user_watchparty_ids', JSON.stringify([movie.id, ...currentIds]));
                    }
                  } catch (e) {}
                  if (onWatchTogether) {
                    onWatchTogether(movie.id);
                  }
                }}
                className="relative w-[160px] h-[39px] bg-transparent hover:bg-white/10 text-white font-bold text-sm rounded-[10px] transition-all cursor-pointer group active:scale-95 flex items-center justify-center"
              >
                <span
                  className="absolute inset-0 rounded-[10px] pointer-events-none"
                  style={{
                    padding: '1.5px',
                    background: 'linear-gradient(135deg, #FFFFFF 0%, #D72835 100%)',
                    WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                    mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                    WebkitMaskComposite: 'xor',
                    maskComposite: 'exclude',
                  }}
                />
                <span className="relative z-10">Watch Party</span>
              </button>

              {/* Favorite Heart Кнопка (Figma: 41px x 39px, rounded-10px) */}
              <button
                onClick={handleToggleFavorite}
                className="relative w-[41px] h-[39px] rounded-[10px] bg-transparent hover:bg-white/10 text-white transition-all cursor-pointer flex items-center justify-center group active:scale-95 shrink-0"
                title={language === 'UA' ? (isFavorite ? 'Видалити з обраного' : 'Додати в обране') : (isFavorite ? 'Remove from favorites' : 'Add to favorites')}
              >
                <span
                  className="absolute inset-0 rounded-[10px] pointer-events-none"
                  style={{
                    padding: '1.5px',
                    background: isFavorite 
                      ? 'linear-gradient(135deg, #FF3040 0%, #D72835 100%)' 
                      : 'linear-gradient(135deg, #FFFFFF 0%, #D72835 100%)',
                    WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                    mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                    WebkitMaskComposite: 'xor',
                    maskComposite: 'exclude',
                  }}
                />
                <Heart 
                  className={`w-5 h-5 relative z-10 transition-all duration-200 ${
                    isFavorite 
                      ? 'fill-[#FF3040] text-[#FF3040] scale-110 drop-shadow-[0_0_10px_rgba(255,48,64,0.85)]' 
                      : 'text-white/85 group-hover:text-white stroke-[2] fill-transparent'
                  }`} 
                />
              </button>

              {/* Download Кнопка (Figma: 41px x 39px, rounded-10px) */}
              <button
                onClick={handleDownload}
                className="relative w-[41px] h-[39px] rounded-[10px] bg-transparent hover:bg-white/10 text-white transition-all cursor-pointer flex items-center justify-center group active:scale-95 shrink-0"
                title={
                  language === 'UA'
                    ? (downloadState === 'completed' ? 'Завантажено (Офлайн)' : downloadState === 'downloading' ? `Завантаження ${downloadProgress}%` : 'Завантажити')
                    : (downloadState === 'completed' ? 'Downloaded (Offline)' : downloadState === 'downloading' ? `Downloading ${downloadProgress}%` : 'Download')
                }
              >
                <span
                  className="absolute inset-0 rounded-[10px] pointer-events-none"
                  style={{
                    padding: '1.5px',
                    background: 'linear-gradient(135deg, #FFFFFF 0%, #D72835 100%)',
                    WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                    mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                    WebkitMaskComposite: 'xor',
                    maskComposite: 'exclude',
                  }}
                />
                <div className="relative z-10 flex items-center justify-center">
                  {downloadState === 'downloading' ? (
                    <div className="w-4 h-4 border-2 border-[#FF4D5C] border-t-transparent rounded-full animate-spin" />
                  ) : downloadState === 'completed' ? (
                    <Check className="w-5 h-5 text-[#FF4D5C]" />
                  ) : (
                    <img src="/icons/Downloads.png" alt="Download" className="w-5 h-5 object-contain" />
                  )}
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* SECTION 1: Трейлер та моменти */}
        <div className="space-y-3 sm:space-y-4 pt-4">
          <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
            {language === 'UA' ? 'Трейлер та моменти' : 'Trailer & Moments'}
          </h2>

          <div className="space-y-3 md:space-y-0 md:grid md:grid-cols-12 md:gap-4 md:items-stretch">
            {/* Картка 1: Official Trailer (w361 h185 on mobile, col-span-6 on desktop) */}
            <div
              onClick={() => setIsTrailerModalOpen(true)}
              className="w-[361px] max-w-full h-[185px] mx-auto md:w-full md:h-[260px] md:col-span-6 relative rounded-[14px] sm:rounded-[16px] overflow-hidden border border-[#2A2A2A] bg-[#121212] group cursor-pointer shadow-lg"
            >
              <img
                src={validatePosterUrl(movie.backdropUrl || movie.posterUrl, movie.title, movie.type, movie.genres)}
                alt="Trailer"
                referrerPolicy="no-referrer"
                onError={(e) => handlePosterError(e, movie.posterUrl)}
                className="w-full h-full object-cover transition duration-300 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center group-hover:bg-black/20 transition-colors">
                <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-black/60 border border-white/80 shadow-lg flex items-center justify-center group-hover:scale-110 transition-transform backdrop-blur-xs">
                  <Play className="w-5 h-5 fill-white text-white ml-0.5" />
                </div>
              </div>
              <div className="absolute bottom-3 left-3 text-left">
                <h4 className="text-xs font-bold text-white">
                  {language === 'UA' ? 'Офіційний трейлер' : 'Official Trailer'}
                </h4>
                <p className="text-[10px] text-zinc-300 font-mono">2хв 18сек</p>
              </div>
            </div>

            {/* Рядок with Stills (w170 h259 each on mobile, 2 col-span-3 items on desktop) */}
            <div className="flex items-center justify-between gap-[21px] w-[361px] max-w-full mx-auto md:w-auto md:contents">
              {/* Картка 2: Still 1 */}
              <div
                onClick={() => setSelectedStillIndex(0)}
                className="w-[170px] h-[259px] md:w-auto md:h-[260px] md:col-span-3 relative rounded-[12px] sm:rounded-[16px] overflow-hidden border border-[#2A2A2A] bg-[#121212] group shadow-lg cursor-pointer shrink-0"
              >
                <img
                  src={validatePosterUrl(stillsList[0] || movie.backdropUrl || movie.posterUrl, movie.title, movie.type, movie.genres)}
                  alt="Moment 1"
                  referrerPolicy="no-referrer"
                  onError={(e) => handlePosterError(e, movie.backdropUrl || movie.posterUrl)}
                  className="w-full h-full object-cover transition duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors" />
              </div>

              {/* Картка 3: Still 2 */}
              <div
                onClick={() => setSelectedStillIndex(stillsList.length > 1 ? 1 : 0)}
                className="w-[170px] h-[259px] md:w-auto md:h-[260px] md:col-span-3 relative rounded-[12px] sm:rounded-[16px] overflow-hidden border border-[#2A2A2A] bg-[#121212] group shadow-lg cursor-pointer shrink-0"
              >
                <img
                  src={validatePosterUrl(stillsList[1] || stillsList[0] || movie.posterUrl, movie.title, movie.type, movie.genres)}
                  alt="Moment 2"
                  referrerPolicy="no-referrer"
                  onError={(e) => handlePosterError(e, movie.posterUrl)}
                  className="w-full h-full object-cover transition duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors" />
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 2: Вам може сподобатись */}
        <div className="space-y-3 sm:space-y-4 pt-4">
          <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-white tracking-tight">
            {language === 'UA' ? 'Вам може сподобатись' : 'You May Also Like'}
          </h2>

          <div className="flex gap-2.5 sm:gap-4 overflow-x-auto pb-2 scrollbar-none md:grid md:grid-cols-5">
            {similarMovies.map((similar) => {
              const similarTitle = language === 'ENG' && similar.titleEn ? similar.titleEn : similar.title;
              return (
                <div
                  key={similar.id}
                  onClick={() => {
                    onSelectMovie(similar);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="w-[104px] h-[146px] min-w-[104px] md:w-auto md:h-auto md:min-w-0 shrink-0 md:shrink bg-[#121212] border-0 md:border md:border-white/10 rounded-[4.78px] md:rounded-[16px] shadow-xl md:hover:shadow-[0_0_28px_rgba(255,48,64,0.35)] md:hover:border-transparent poster-hover-notif-border transition-all duration-300 ease-out cursor-pointer group/card group relative aspect-[104/146] md:aspect-[2/3] select-none flex flex-col justify-between"
                >
                  <div className="relative w-full h-full overflow-hidden bg-[#121212] rounded-[4.78px] md:rounded-[15px]">
                    {/* Poster Image */}
                    <img
                      src={validatePosterUrl(similar.posterUrl, similar.title, similar.type, similar.genres)}
                      alt={similarTitle}
                      className="w-full h-full object-cover transition-transform duration-500 ease-out md:group-hover:scale-[1.03]"
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      onError={(e) => handlePosterError(e, similar.posterUrl, similar.title, similar.type, similar.genres, similar.year, similar.titleEn, similar.originalTitle)}
                    />

                    {/* Side Vignette Накладення (оверлей) on the Картка */}
                    <div className="absolute inset-0 pointer-events-none z-10 bg-gradient-to-r from-black/40 via-transparent to-black/40 shadow-[inset_0_0_24px_rgba(0,0,0,0.6)]" />

                    {/* Floating Бейджі on Mobile: w32.58px h14.13px, gap 26px */}
                    <div className="absolute top-1.5 inset-x-0 px-[6.42px] flex items-center justify-between z-30 pointer-events-none md:hidden">
                      <div className="w-[32.58px] h-[14.13px] text-white rounded-[4px] flex items-center justify-center gap-0.5 bg-black/50 backdrop-blur-md border border-white/15 shadow-sm">
                        <Star className="w-[8px] h-[8px] fill-[#FF3040] text-[#FF3040] shrink-0" />
                        <span className="text-white font-bold text-[7px] tracking-tight leading-none">{typeof similar.rating === 'number' ? similar.rating.toFixed(1) : (similar.rating || '8.0')}</span>
                      </div>
                      <div className="w-[32.58px] h-[14.13px] text-white rounded-[4px] flex items-center justify-center bg-black/50 backdrop-blur-md border border-white/15 shadow-sm">
                        <span className="text-white font-bold text-[7px] tracking-tight leading-none">{similar.ageRating || '16+'}</span>
                      </div>
                    </div>

                    {/* Desktop Floating Рейтинг & Age Бейджі */}
                    <div
                      className="hidden md:flex absolute top-3 left-3 text-white px-3.5 py-1.5 rounded-[10px] text-xs font-semibold items-center gap-1.5 z-30 transition-all pointer-events-none bg-black/50 backdrop-blur-md border border-white/15 shadow-sm group-hover:bg-white/10 group-hover:border-white/25 duration-300"
                    >
                      <Star className="w-3.5 h-3.5 fill-[#FF3040] text-[#FF3040] shrink-0" />
                      <span className="text-white font-bold text-xs tracking-tight">{typeof similar.rating === 'number' ? similar.rating.toFixed(1) : (similar.rating || '8.0')}</span>
                    </div>

                    <div
                      className="hidden md:flex absolute top-3 right-3 text-white px-3.5 py-1.5 rounded-[10px] text-xs font-semibold z-30 transition-all pointer-events-none items-center justify-center bg-black/50 backdrop-blur-md border border-white/15 shadow-sm group-hover:bg-white/10 group-hover:border-white/25 duration-300"
                    >
                      <span className="text-white font-bold text-xs tracking-tight">{similar.ageRating || '16+'}</span>
                    </div>

                    {/* Specular Glass Sheen Накладення (оверлей) */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-white/15 pointer-events-none mix-blend-overlay z-15" />

                    {/* Frosted Glass Bottom Panel with Backdrop Blur: 9px padding and margins on mobile, 22px on desktop */}
                    <div className="absolute inset-x-0 bottom-0 z-20 flex flex-col justify-start pt-[9px] pb-[8px] px-[5px] md:px-4 md:pt-[22px] md:pb-4 w-[104px] h-auto md:w-full md:h-auto bg-gradient-to-t from-black/95 via-black/80 to-transparent backdrop-blur-[10px] pointer-events-none transition-all duration-300 ease-out">
                      <h4 className="font-sans font-bold text-white text-[8px] md:text-[17px] leading-tight line-clamp-2 break-words w-full md:w-[239px] md:max-w-full md:h-[42px] text-left drop-shadow-md">
                        {similarTitle}
                      </h4>

                      <div className="flex items-center text-[6px] md:text-[11.5px] text-zinc-300 font-normal w-full whitespace-nowrap overflow-hidden font-sans text-left mt-[9px] md:mt-[22px] drop-shadow-sm gap-1 md:gap-1.5">
                        {similar.genres?.slice(0, 2).map((genre, idx) => (
                          <React.Fragment key={genre}>
                            {idx > 0 && <span className="w-0.5 h-0.5 md:w-1 md:h-1 rounded-full bg-[#FF3040] inline-block shrink-0" />}
                            <span className="text-zinc-300 truncate">{translateGenre(genre, language)}</span>
                          </React.Fragment>
                        ))}
                        <span className="w-0.5 h-0.5 md:w-1 md:h-1 rounded-full bg-[#FF3040] inline-block shrink-0" />
                        <span className="text-zinc-400 shrink-0">{similar.year}</span>
                      </div>

                      {/* Short Опис expansion on hover */}
                      <div className="grid grid-rows-[0fr] group-hover:grid-rows-[1fr] transition-all duration-300 ease-out">
                        <div className="overflow-hidden">
                          <p className="text-xs sm:text-[12.5px] text-zinc-200/90 font-sans leading-relaxed line-clamp-4 mt-2.5 pt-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-75">
                            {language === 'ENG' && similar.descriptionEn ? similar.descriptionEn : (similar.description || (language === 'UA' ? 'Захоплююча кіноісторія, сповнена несподіваних поворотів долі та незабутніх емоцій.' : 'A captivating story.'))}
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

        {/* SECTION 3: Користувацький рейтинг & Залиште свій відгук (2 Columns) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-start pt-4">
          {/* Left Column: Користувацький рейтинг (Pixel-perfect matching Figma screenshot) */}
          <div className="space-y-6 max-w-lg">
            <h2 className="font-display font-bold text-2xl sm:text-[32px] text-white tracking-tight">
              {language === 'UA' ? 'Користувацький рейтинг' : 'User Rating'}
            </h2>

            {/* Рейтинг summary: Big 8.6 + Stars + Results text */}
            <div className="flex items-start gap-5">
              <span className="font-bold text-[72px] sm:text-[88px] leading-none text-white tracking-tighter select-none font-sans">
                {movie.rating}
              </span>
              <div className="space-y-2 pt-1 max-w-[325px]">
                {/* 5 Stars Рядок */}
                <div className="flex items-center gap-1.5">
                  {[1, 2, 3, 4, 5].map((starIdx) => {
                    const numericRating = typeof movie.rating === 'number' ? movie.rating : parseFloat(String(movie.rating)) || 8.6;
                    const scoreOutOf5 = numericRating > 5 ? (numericRating / 2) : numericRating;
                    const isFull = scoreOutOf5 >= starIdx;
                    const isHalf = !isFull && scoreOutOf5 >= (starIdx - 0.75);

                    if (isFull) {
                      return (
                        <svg key={starIdx} className="w-7 h-7 shrink-0" viewBox="0 0 24 24">
                          <path
                            d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                            fill="#FF2638"
                            stroke="#FF2638"
                            strokeWidth="1.5"
                            strokeLinejoin="round"
                          />
                        </svg>
                      );
                    }
                    if (isHalf) {
                      return (
                        <svg key={starIdx} className="w-7 h-7 shrink-0" viewBox="0 0 24 24">
                          <defs>
                            <linearGradient id={`halfStarGrad-movie-${starIdx}`} x1="0" x2="100%" y1="0" y2="0">
                              <stop offset="50%" stopColor="#FF2638" />
                              <stop offset="50%" stopColor="transparent" />
                            </linearGradient>
                          </defs>
                          <path
                            d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                            fill={`url(#halfStarGrad-movie-${starIdx})`}
                            stroke="white"
                            strokeWidth="1.5"
                            strokeLinejoin="round"
                          />
                        </svg>
                      );
                    }
                    return (
                      <svg key={starIdx} className="w-7 h-7 shrink-0" viewBox="0 0 24 24">
                        <path
                          d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                          fill="none"
                          stroke="white"
                          strokeWidth="1.5"
                          strokeLinejoin="round"
                        />
                      </svg>
                    );
                  })}
                </div>

                {/* Exact 16px font size text wrapping into 2 lines as in Figma (325 x 38 px) */}
                <p className="text-[16px] leading-[19px] text-[#FAFAFA] font-normal">
                  {language === 'UA' ? (
                    <>
                      Результат за переглядом {movie.ratingVotesCount || '32.0K'}<br />користувачів
                    </>
                  ) : (
                    <>
                      Based on {movie.ratingVotesCount || '32.0K'}<br />user ratings
                    </>
                  )}
                </p>
              </div>
            </div>

            {/* Рейтинг distribution progress bars matching screenshot */}
            <div className="space-y-3.5 max-w-[380px] pt-1">
              {ratingDistribution.map((item) => (
                <div key={item.stars} className="flex items-center gap-3 sm:gap-4">
                  <div className="flex items-center gap-1.5 w-9 shrink-0">
                    <span className="font-bold text-[20px] text-white leading-none">
                      {item.stars}
                    </span>
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                      <path
                        d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                        fill="#FF2638"
                        stroke="#FF2638"
                      />
                    </svg>
                  </div>
                  <div className="flex-1 h-[7px] bg-[#262626] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#FF2638] rounded-full transition-all duration-500"
                      style={{ width: item.pct }}
                    />
                  </div>
                  <span className="w-12 text-left text-[16px] text-white font-normal leading-none shrink-0">
                    {item.pct}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Залиште свій відгук */}
          <div className="space-y-4">
            <h2 className="font-display font-bold text-2xl sm:text-[32px] text-white tracking-tight">
              {language === 'UA' ? 'Залиште свій відгук' : 'Leave your review'}
            </h2>

            {/* Interactive 5 Star Selector with half-star precision */}
            <div
              className="flex items-center gap-1.5"
              onMouseLeave={() => setHoverRating(null)}
            >
              {[1, 2, 3, 4, 5].map((starVal) => {
                const effectiveRating = hoverRating !== null ? hoverRating : reviewRating;
                const isFull = effectiveRating >= starVal;
                const isHalf = !isFull && effectiveRating >= starVal - 0.5;

                return (
                  <div
                    key={starVal}
                    className="relative w-7 h-7 flex items-center justify-center select-none group"
                  >
                    {/* Visual Star Іконка */}
                    {isFull ? (
                      <img
                        src="/icons/StarFull.png"
                        alt="★"
                        className="w-6 h-6 object-contain drop-shadow-sm pointer-events-none"
                      />
                    ) : isHalf ? (
                      <img
                        src="/icons/StarHalf.png"
                        alt="★"
                        className="w-6 h-6 object-contain drop-shadow-sm pointer-events-none"
                      />
                    ) : (
                      <Star
                        className="w-6 h-6 fill-none text-white/80 stroke-[1.5] pointer-events-none transition-colors group-hover:text-white"
                      />
                    )}

                    {/* Left half clickable & hoverable zone (e.g. 0.5, 1.5, 2.5, 3.5, 4.5) */}
                    <button
                      type="button"
                      aria-label={`${starVal - 0.5} stars`}
                      onMouseEnter={() => setHoverRating(starVal - 0.5)}
                      onClick={() => setReviewRating(starVal - 0.5)}
                      className="absolute inset-y-0 left-0 w-1/2 cursor-pointer z-10 opacity-0"
                    />

                    {/* Right half clickable & hoverable zone (e.g. 1.0, 2.0, 3.0, 4.0, 5.0) */}
                    <button
                      type="button"
                      aria-label={`${starVal} stars`}
                      onMouseEnter={() => setHoverRating(starVal)}
                      onClick={() => setReviewRating(starVal)}
                      className="absolute inset-y-0 right-0 w-1/2 cursor-pointer z-10 opacity-0"
                    />
                  </div>
                );
              })}
            </div>

            {/* Textarea Поле введення Form with left-aligned action Кнопка */}
            <form onSubmit={handlePostReview} className="space-y-4">
              <textarea
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder={language === 'UA' ? 'Залиште відгук...' : 'Leave a review...'}
                className="w-full h-32 bg-transparent border border-[#FAFAFA] rounded-[16px] p-4 text-sm sm:text-base text-white placeholder-zinc-500 focus:outline-none focus:border-[#FAFAFA] leading-relaxed resize-none"
                required
              />

              <div className="flex justify-start">
                <button
                  type="submit"
                  className="journey-cta-btn border-2 border-transparent hover:border-white/80 active:border-transparent text-white w-[103px] h-[24px] sm:w-[179px] sm:h-[39px] rounded-[6px] sm:rounded-[10px] font-bold text-[8px] sm:text-sm flex items-center justify-center gap-1.5 sm:gap-2 transition-all transform hover:scale-102 active:scale-98 hover:shadow-[0_0_24px_rgba(255,255,255,0.3),0_10px_25px_rgba(215,40,53,0.35)] shadow-lg shadow-[#FF4D5C]/25 cursor-pointer select-none"
                >
                  <span>{language === 'UA' ? 'Продовжити' : 'Continue'}</span>
                  <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4 stroke-[2.5] sm:stroke-[3]" />
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* SECTION 4: Відгуки (Reviews List) */}
        <div className="space-y-6 pt-4">
          <h2 className="text-xl font-bold text-white tracking-tight">
            {language === 'UA' ? 'Відгуки' : 'Reviews'}
          </h2>

          <div className="space-y-5">
            {activeReviews.slice(reviewPage * 6, (reviewPage + 1) * 6).map((rev) => {
              const likeData = reviewLikes[rev.id] || { count: 35, liked: false };
              return (
                <div
                  key={rev.id}
                  className="bg-[#000000] rounded-[16px] p-5 space-y-3 shadow-md border-0"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <img
                        src={rev.userAvatar}
                        alt={rev.username}
                        className="w-10 h-10 rounded-full object-cover border-0"
                      />
                      <div>
                        <h4 className="font-bold text-sm text-white">{rev.username}</h4>
                        <span className="text-xs text-zinc-500 font-mono">{rev.createdAt}</span>
                      </div>
                    </div>

                    {/* Star score display */}
                    <div className="flex items-center gap-1 text-xs text-[#FF3040] font-bold">
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((s) => {
                          const starScore = rev.rating > 5 ? (rev.rating / 2) : rev.rating;
                          const isFull = starScore >= s;
                          const isHalf = !isFull && starScore >= s - 0.5;

                          if (isFull) {
                            return (
                              <img
                                key={s}
                                src="/icons/StarFull.png"
                                alt="★"
                                className="w-3.5 h-3.5 object-contain inline"
                              />
                            );
                          }
                          if (isHalf) {
                            return (
                              <img
                                key={s}
                                src="/icons/StarHalf.png"
                                alt="★"
                                className="w-3.5 h-3.5 object-contain inline"
                              />
                            );
                          }
                          return (
                            <Star
                              key={s}
                              className="w-3.5 h-3.5 fill-none text-zinc-600 stroke-[1.5]"
                            />
                          );
                        })}
                      </div>
                      <span className="text-zinc-400 ml-1 font-mono">
                        {rev.rating > 5 ? (rev.rating / 2) : rev.rating}/5
                      </span>
                    </div>
                  </div>

                  {/* Comment text */}
                  <p className="text-zinc-300 text-sm leading-relaxed font-normal">
                    {rev.comment}
                  </p>

                  {/* Action Рядок (Likes count + reply Кнопка) */}
                  <div className="flex items-center gap-4 pt-1">
                    <button
                      onClick={() => toggleReviewLike(rev.id)}
                      className={`flex items-center gap-1.5 text-xs font-semibold transition-colors cursor-pointer ${likeData.liked ? 'text-[#FF4D5C]' : 'text-zinc-400 hover:text-white'
                        }`}
                    >
                      <Heart className={`w-4 h-4 ${likeData.liked ? 'fill-[#FF4D5C]' : ''}`} />
                      <span>{likeData.count}</span>
                    </button>

                    <button className="text-zinc-400 hover:text-white transition-colors cursor-pointer p-1">
                      <MessageSquare className="w-4 h-4" />
                    </button>

                    {canDeleteReview(rev) && (
                      <button
                        onClick={() => handleDeleteReview(rev.id)}
                        className="text-zinc-500 hover:text-red-400 transition-colors cursor-pointer p-1 ml-auto"
                        title="Видалити"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination Arrows */}
          {activeReviews.length > 6 && (
            <div className="flex items-center justify-center gap-12 pt-6 pb-2">
              <button
                disabled={reviewPage === 0}
                onClick={() => setReviewPage(p => Math.max(0, p - 1))}
                className="text-zinc-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors p-2"
                aria-label="Previous page"
              >
                <ChevronLeft className="w-6 h-6 stroke-[2]" />
              </button>
              <button
                disabled={(reviewPage + 1) * 6 >= activeReviews.length}
                onClick={() => setReviewPage(p => p + 1)}
                className="text-zinc-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors p-2"
                aria-label="Next page"
              >
                <ChevronRight className="w-6 h-6 stroke-[2]" />
              </button>
            </div>
          )}
        </div>

        {/* SECTION 5: Актори */}
        <div className="space-y-4 pt-4">
          <h2 className="text-xl font-bold text-white tracking-tight">
            {language === 'UA' ? 'Актори' : 'Actors'}
          </h2>

          <div className="grid grid-cols-2 gap-y-7 gap-x-4 md:flex md:items-center md:gap-6 md:overflow-x-auto pb-4 pt-2 no-scrollbar">
            {castList.map((actor, idx) => {
              const isOddLast = castList.length % 2 !== 0 && idx === castList.length - 1;
              return (
                <div
                  key={idx}
                  className={`flex flex-col items-center space-y-2 shrink-0 group cursor-pointer ${
                    isOddLast ? 'col-span-2 md:col-span-1' : ''
                  }`}
                >
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden border border-[#2A2A2A] group-hover:border-[#FF4D5C] transition-colors shadow-md">
                    <ActorAvatar name={actor.name} fallbackUrl={actor.avatarUrl} />
                  </div>
                  <span className="text-xs sm:text-xs text-zinc-300 font-medium text-center max-w-[130px] truncate group-hover:text-white transition-colors">
                    {actor.name}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Fix / Report Error Модальне вікно */}
      <ReportProblemModal
        isOpen={isFixModalOpen}
        onClose={() => setIsFixModalOpen(false)}
        movieTitle={language === 'ENG' && movie.titleEn ? movie.titleEn : movie.title}
        movieId={movie.id}
        initialTab={fixModalTab}
        language={language}
      />

      {/* Create Користувацький Список Модальне вікно */}
      {isCreateListOpen && createPortal(
        <div className="fixed inset-0 z-[9999] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#0e0f14] border border-zinc-800 rounded-[28px] w-full max-w-md shadow-2xl relative flex flex-col p-6 animate-fade-in text-left">
            <button
              onClick={() => setIsCreateListOpen(false)}
              className="absolute top-5 right-5 text-zinc-500 hover:text-white p-2 hover:bg-zinc-800/40 rounded-full transition-all cursor-pointer z-10"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <Grid className="w-5 h-5 text-violet-400" />
              <span>{language === 'UA' ? 'Створити список' : 'Create List'}</span>
            </h2>
            <p className="text-[11px] text-zinc-500 mt-1 font-sans">
              {language === 'UA' ? 'Організовуйте улюблені аніме у кастомні колекції' : 'Organize your favorite anime into custom collections'}
            </p>

            <form onSubmit={handleCreateCustomList} className="space-y-4 mt-5">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                  {language === 'UA' ? 'Назва' : 'Name'}
                </label>
                <input
                  type="text"
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  placeholder={language === 'UA' ? 'Назва списку' : 'List name'}
                  className="w-full bg-[#121318] text-xs text-white border border-zinc-800 rounded-xl px-3 py-2.5 focus:outline-none focus:border-zinc-700 font-medium"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#A5A5A5] uppercase tracking-wider">
                  {language === 'UA' ? 'Опис' : 'Description'}
                </label>
                <textarea
                  value={newListDesc}
                  onChange={(e) => setNewListDesc(e.target.value)}
                  placeholder={language === 'UA' ? 'Опишіть, що об\'єднує цей список' : 'Describe what brings this list together'}
                  className="w-full h-20 bg-[#121318] text-xs text-white border border-zinc-800 rounded-xl px-3 py-2.5 focus:outline-none focus:border-zinc-700 font-medium"
                />
              </div>

              {/* Перемикач with public checkbox */}
              <div className="flex items-center justify-between p-3.5 bg-zinc-950/60 rounded-xl border border-zinc-900">
                <div className="flex flex-col pr-4">
                  <span className="text-xs font-semibold text-zinc-300">
                    {language === 'UA' ? 'Публічний список' : 'Public List'}
                  </span>
                  <span className="text-[10px] text-zinc-500 mt-0.5 font-sans leading-normal">
                    {language === 'UA' ? 'Приватні списки бачите лише ви.' : 'Private lists are only visible to you.'}
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={newListIsPublic}
                  onChange={(e) => setNewListIsPublic(e.target.checked)}
                  className="w-4 h-4 text-violet-600 bg-zinc-900 border-zinc-800 rounded focus:ring-violet-500 focus:ring-offset-0 focus:ring-2 cursor-pointer accent-violet-500"
                />
              </div>

              <div className="flex justify-end gap-2 border-t border-zinc-900/60 pt-4 mt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateListOpen(false)}
                  className="px-4 py-2 bg-transparent text-zinc-400 hover:text-white hover:bg-zinc-900 text-xs font-bold rounded-none border border-zinc-850 cursor-pointer transition-all"
                >
                  {language === 'UA' ? 'Скасувати' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-violet-600 text-white text-xs font-bold rounded-none cursor-pointer transition-all shadow-md hover:bg-violet-550"
                >
                  {language === 'UA' ? 'Створити' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Watch Together (Створення Watch Party) Modal */}
      <CreateRoomModal
        isOpen={isWatchTogetherModalOpen}
        onClose={() => setIsWatchTogetherModalOpen(false)}
        movie={movie}
        user={user}
        onWatchTogether={onWatchTogether}
      />

      {/* Official Trailer Відео Модальне вікно Накладення (оверлей) */}
      {isTrailerModalOpen && createPortal(
        <div className="fixed inset-0 z-[9999] bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative w-full max-w-4xl bg-[#121212] border border-[#2A2A2A] rounded-2xl overflow-hidden shadow-2xl animate-in fade-in duration-200">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#2A2A2A] bg-[#0A0A0A]">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Play className="w-4 h-4 fill-[#FF3040] text-[#FF3040]" />
                <span>{getMovieTitle(movie, language)} — {language === 'UA' ? 'Офіційний трейлер' : 'Official Trailer'}</span>
              </h3>
              <button
                onClick={() => setIsTrailerModalOpen(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-[#1A1A1A] transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="relative aspect-video w-full bg-black">
              <iframe
                src={`${resolvedTrailerUrl}?autoplay=1`}
                title={`${getMovieTitle(movie, language)} Trailer`}
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Still Moments Lightbox Модальне вікно */}
      {selectedStillIndex !== null && createPortal(
        <div className="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative w-full max-w-5xl bg-[#121212] border border-[#2A2A2A] rounded-2xl overflow-hidden shadow-2xl animate-in fade-in duration-200 flex flex-col">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#2A2A2A] bg-[#0A0A0A]">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white">
                  {getMovieTitle(movie, language)} — {language === 'UA' ? 'Кадр з фільму' : 'Movie Still'} ({selectedStillIndex + 1} / {stillsList.length})
                </span>
              </div>
              <button
                onClick={() => setSelectedStillIndex(null)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-[#1A1A1A] transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="relative w-full aspect-video bg-black flex items-center justify-center overflow-hidden">
              <img
                src={stillsList[selectedStillIndex]}
                alt={`Still ${selectedStillIndex + 1}`}
                referrerPolicy="no-referrer"
                className="max-w-full max-h-full object-contain select-none"
              />

              {stillsList.length > 1 && (
                <>
                  <button
                    onClick={() => setSelectedStillIndex((prev) => (prev! > 0 ? prev! - 1 : stillsList.length - 1))}
                    className="absolute left-4 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/60 hover:bg-black/90 border border-white/20 text-white transition cursor-pointer"
                    aria-label="Previous still"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                  <button
                    onClick={() => setSelectedStillIndex((prev) => (prev! < stillsList.length - 1 ? prev! + 1 : 0))}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/60 hover:bg-black/90 border border-white/20 text-white transition cursor-pointer"
                    aria-label="Next still"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                </>
              )}
            </div>

            {stillsList.length > 1 && (
              <div className="px-4 py-3 border-t border-[#2A2A2A] bg-[#0A0A0A] flex gap-2 overflow-x-auto">
                {stillsList.map((still, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedStillIndex(idx)}
                    className={`relative shrink-0 w-20 h-12 rounded-lg overflow-hidden border-2 transition cursor-pointer ${
                      idx === selectedStillIndex ? 'border-[#FF3040]' : 'border-transparent opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img src={still} alt={`Thumbnail ${idx + 1}`} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
