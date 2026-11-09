import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  BarChart3, Film, Users, Layers, Plus, Edit2, Trash2,
  TrendingUp, Clock, DollarSign, Activity, CheckCircle2, ShieldAlert,
  Search, Grid, Eye, Check, X, FileEdit, Upload, CloudUpload, FileVideo, Cpu, Wand2,
  Sparkles, Loader2, RefreshCw, PlayCircle, Video, FolderPlus, FolderUp,
  ListVideo, Tv, Zap, Terminal, FileText, Inbox, Settings, Star, ChevronRight, GraduationCap
} from 'lucide-react';
import { Movie, PlatformAnalytics, UserProfile } from '../types';
import { loadState, saveState, GENRES } from '../data/movies';
import { getFullEpisodesDataForMovie } from '../data/seriesEpisodes';
import { fetchMalEpisodesAndMetadata } from '../services/anime';
import { useLanguage } from '../context/LanguageContext';
import { AdminReportsList } from './AdminReportsList';
import AdminCatalogTable from './AdminCatalogTable';

interface AdminPanelProps {
  movies: Movie[];
  onMoviesChange: (newMovies: Movie[]) => void;
  user: UserProfile | null;
  onSelectMovie: (movie: Movie) => void;
  onPlayMovie?: (movie: Movie) => void;
}

const ALL_VOICEOVER_SUFFIXES = [
  '',
  '-default',
  '-Українська',
  '-Англійська',
  '-Японська (Субтитри)',
  '-Amanogawa (Багатоголосий)',
  '-Koyomi (Багатоголосий)',
  '-SBT Localization (Дубляж)',
  '-Далі Буде! (Багатоголосий)',
  '-FanVoxUA (Двоголосий)',
  '-Original (Japanese + Субтитри)',
  '-Cinema UA (Дубляж / Офіційний)',
  '-DniproFilm (Багатоголосий)',
  '-Original Audio (English)'
];

const DEFAULT_ADMIN_CATEGORIES = [
  'Документальне', 'Наукова фантастика', 'Комедія',
  'Трилер', 'Бойовик', 'Жахи',
  'Кримінал', 'Драма', 'Романтика',
  'Пригоди', 'Фентезі', 'Аніме'
];

export default function AdminPanel({
  movies, onMoviesChange, user, onSelectMovie }: AdminPanelProps) {
  const { language } = useLanguage();
  const [activeSubTab, setActiveSubTab] = useState<'analytics' | 'content' | 'users' | 'categories' | 'reports'>('analytics');

  // Стан користувацької аналітики платформи
  const analytics: PlatformAnalytics = {
    totalViews: 4894200 + movies.reduce((acc, current) => acc + (current.viewsCount || 0), 0),
    totalWatchHours: 1243500,
    activeWatchParties: 12,
    activeUsers: 8421,
    revenueThisMonth: '$54,320',
    genreBreakdown: [
      { genre: language === 'UA' ? 'Фантастика' : 'Sci-Fi', percentage: 31 },
      { genre: language === 'UA' ? 'Бойовик' : 'Action', percentage: 25 },
      { genre: language === 'UA' ? 'Детектив' : 'Mystery', percentage: 22 },
      { genre: language === 'UA' ? 'Драма' : 'Drama', percentage: 15 },
      { genre: language === 'UA' ? 'Інші' : 'Others', percentage: 7 }
    ],
    dailyViews: [
      { date: language === 'UA' ? '13 Чер' : '13 Jun', views: 12400 },
      { date: language === 'UA' ? '14 Чер' : '14 Jun', views: 14500 },
      { date: language === 'UA' ? '15 Чер' : '15 Jun', views: 16800 },
      { date: language === 'UA' ? '16 Чер' : '16 Jun', views: 15100 },
      { date: language === 'UA' ? '17 Чер' : '17 Jun', views: 19800 },
      { date: language === 'UA' ? '18 Чер' : '18 Jun', views: 24200 },
      { date: language === 'UA' ? '19 Чер' : '19 Jun', views: 27500 }
    ]
  };

  // Стан додавання, редагування та видалення фільмів/серіалів
  const [isEditing, setIsEditing] = useState<string | null>(null); // Movie ID or 'new'
  const [movieForm, setMovieForm] = useState<Partial<Movie>>({
    title: '',
    originalTitle: '',
    type: 'movie',
    year: 2024,
    duration: '2 год',
    rating: 8.0,
    ratingVotesCount: '10K',
    ageRating: '16+',
    description: '',
    posterUrl: 'https://images.unsplash.com/photo-1542205804-2ec3513247d1?q=80&w=600&auto=format&fit=crop',
    backdropUrl: 'https://images.unsplash.com/photo-1542205804-2ec3513247d1?q=80&w=1200&auto=format&fit=crop',
    genres: ['Екшн'],
    director: '',
    languages: ['Українська'],
    subtitles: ['Українські'],
    viewsCount: 1500,
    videoUrl: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
    cast: []
  });

  // Стани завантаження відео, конвертації у 4 якості та автогенерації субтитрів Whisper
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isConvertingQualities, setIsConvertingQualities] = useState(false);
  const [conversionMessage, setConversionMessage] = useState('');
  const [isWhisperProcessing, setIsWhisperProcessing] = useState(false);
  const [whisperStatusMsg, setWhisperStatusMsg] = useState('');
  const [transcribeLogLines, setTranscribeLogLines] = useState<string[]>([]);
  const [showTranscribeLogs, setShowTranscribeLogs] = useState<boolean>(true);
  const logContainerRef = React.useRef<HTMLDivElement>(null);
  const [conversionLogLines, setConversionLogLines] = useState<string[]>([]);
  const [showConversionLogs, setShowConversionLogs] = useState<boolean>(true);
  const conversionLogContainerRef = React.useRef<HTMLDivElement>(null);
  const [renderMode, setRenderMode] = useState<'cpu' | 'gpu' | 'auto'>('auto');
  const [gpuHardwareInfo, setGpuHardwareInfo] = useState<{ available: boolean; encoder: string; details: string } | null>(null);
  const [conversionProgressPercent, setConversionProgressPercent] = useState<number>(0);
  const [conversionStatusMsg, setConversionStatusMsg] = useState<string>('');

  // Стан сезонів серіалу та пакетного завантаження цілої папки серій
  const [activeSeason, setActiveSeason] = useState<number>(1);
  const [batchMessage, setBatchMessage] = useState<string>('');
  const [isBatchParsing, setIsBatchParsing] = useState<boolean>(false);
  const [uploadVoiceoverMode, setUploadVoiceoverMode] = useState<string>('auto');
  const [isFetchingMalEpisodes, setIsFetchingMalEpisodes] = useState<boolean>(false);
  const [malFetchMsg, setMalFetchMsg] = useState<string>('');
  const [uploadingQuality, setUploadingQuality] = useState<string | null>(null);
  const [qualityUploadProgress, setQualityUploadProgress] = useState<number>(0);
  const [uploadingSubtitle, setUploadingSubtitle] = useState<boolean>(false);
  const [uploadingEpisodeSubtitle, setUploadingEpisodeSubtitle] = useState<{ season: number; episodeNumber: number } | null>(null);
  const folderInputRef = React.useRef<HTMLInputElement>(null);
  const batchFilesInputRef = React.useRef<HTMLInputElement>(null);
  const [isDemoFallbackActive, setIsDemoFallbackActive] = useState<boolean>(() => {
    return localStorage.getItem('nova_demo_fallback_active') !== 'false';
  });

  // Синхронізація статусу демо-захисту із сервером
  useEffect(() => {
    fetch('/api/system/demo-mode')
      .then(r => r.json())
      .then(d => {
        if (typeof d?.active === 'boolean') {
          setIsDemoFallbackActive(d.active);
          localStorage.setItem('nova_demo_fallback_active', String(d.active));
        }
      })
      .catch(() => { });
  }, []);
  const movieSubtitleInputRef = React.useRef<HTMLInputElement>(null);
  const [syncingMinioKey, setSyncingMinioKey] = useState<string | null>(null);
  const [minioSyncedKeys, setMinioSyncedKeys] = useState<Record<string, boolean>>({});

  const handleSyncToMinio = async (key: string, filePath: string) => {
    if (!filePath) return;
    setSyncingMinioKey(key);
    try {
      const res = await fetch('/api/minio/sync-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath, movieId: (isEditing && isEditing !== 'new' ? isEditing : undefined) || movieForm.title })
      });
      const data = await res.json();
      if (data.success) {
        setMinioSyncedKeys(prev => ({ ...prev, [key]: true }));
        if (data.url) {
          if (key === 'main') {
            setMovieForm(prev => ({ ...prev, videoUrl: data.url }));
          } else {
            handleQualityUrlChange(key, data.url);
          }
        }
        alert(language === 'UA' ? '✅ Файл успішно завантажено у сховище MinIO!' : '✅ File successfully uploaded to MinIO storage!');
      } else {
        alert(language === 'UA' ? `❌ Помилка: ${data.error}` : `❌ Error: ${data.error}`);
      }
    } catch (err: any) {
      alert(language === 'UA' ? `❌ Помилка зв'язку з MinIO: ${err.message}` : `❌ MinIO connection error: ${err.message}`);
    } finally {
      setSyncingMinioKey(null);
    }
  };


  const handleFetchMalEpisodes = async () => {
    const malUrlOrId = movieForm.myAnimeListUrl;
    if (!malUrlOrId) {
      alert(language === 'UA'
        ? 'Вкажіть посилання на MyAnimeList (MAL URL) у формі аніме/серіалу!'
        : 'Please specify MyAnimeList (MAL URL) link in the form first!');
      return;
    }

    setIsFetchingMalEpisodes(true);
    setMalFetchMsg(language === 'UA' ? 'Завантаження метаданих та серій з MAL (Jikan API)...' : 'Loading metadata and episodes from MAL (Jikan API)...');

    try {
      const malRes = await fetchMalEpisodesAndMetadata(malUrlOrId);
      if (!malRes) {
        setMalFetchMsg(language === 'UA' ? '❌ Не вдалося отримати дані з MAL API.' : '❌ Failed to fetch data from MAL API.');
        return;
      }

      setMovieForm(prev => {
        const updatedData = { ...(prev.episodesData || {}) };
        const currentSeasonEps = updatedData[activeSeason] || [];

        if (malRes.episodes && malRes.episodes.length > 0) {
          const newSeasonEps = [...currentSeasonEps];

          malRes.episodes.forEach((malEp) => {
            const epIndex = newSeasonEps.findIndex(e => e.number === malEp.number);
            if (epIndex !== -1) {
              newSeasonEps[epIndex] = {
                ...newSeasonEps[epIndex],
                title: malEp.title || newSeasonEps[epIndex].title,
                description: malEp.description || newSeasonEps[epIndex].description
              };
            } else {
              newSeasonEps.push({
                number: malEp.number,
                title: malEp.title,
                duration: malEp.duration || '24 хв',
                description: malEp.description,
                videoUrl: prev.videoUrl || '',
                sources: {},
                videoSources: {}
              });
            }
          });

          newSeasonEps.sort((a, b) => a.number - b.number);
          updatedData[activeSeason] = newSeasonEps;
        }

        return {
          ...prev,
          titleEn: prev.titleEn || malRes.titleEn,
          originalTitle: prev.originalTitle || malRes.originalTitle,
          episodesData: updatedData,
          duration: malRes.totalEpisodes ? `${malRes.totalEpisodes} серій` : prev.duration
        };
      });

      setMalFetchMsg(language === 'UA'
        ? `✅ Успішно завантажено ${malRes.episodes.length} серій з MAL (Загалом: ${malRes.totalEpisodes || malRes.episodes.length})!`
        : `✅ Successfully loaded ${malRes.episodes.length} episodes from MAL!`);
    } catch (err: any) {
      console.error('Error fetching MAL episodes:', err);
      setMalFetchMsg(language === 'UA' ? `⚠️ Помилка: ${err.message}` : `⚠️ Error: ${err.message}`);
    } finally {
      setIsFetchingMalEpisodes(false);
    }
  };

  useEffect(() => {
    fetch('/api/check-gpu')
      .then(r => r.json())
      .then(d => setGpuHardwareInfo(d))
      .catch(() => setGpuHardwareInfo({ available: false, encoder: 'libx264', details: 'No GPU hardware drivers detected on container host' }));
  }, []);

  // Постійне зчитування логів транскрипції Whisper із сервера
  useEffect(() => {
    let interval: any = null;
    const fetchTranscribeLogs = async () => {
      try {
        const res = await fetch('/api/transcribe-log');
        if (res.ok) {
          const data = await res.json();
          if (data && data.success && Array.isArray(data.lines)) {
            setTranscribeLogLines(data.lines);
            if (data.lastLine && isWhisperProcessing) {
              setWhisperStatusMsg(data.lastLine);
            }
          }
        }
      } catch (err) {
        console.warn('Failed to fetch transcription log:', err);
      }
    };

    fetchTranscribeLogs();
    interval = setInterval(fetchTranscribeLogs, isWhisperProcessing ? 1000 : 2500);

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isWhisperProcessing]);

  // Постійне зчитування логів FFmpeg конвертації із сервера
  useEffect(() => {
    let interval: any = null;
    const fetchConversionLogs = async () => {
      try {
        const res = await fetch('/api/conversion-log');
        if (res.ok) {
          const data = await res.json();
          if (data && data.success && Array.isArray(data.lines)) {
            setConversionLogLines(data.lines);
            if (data.statusMessage && isConvertingQualities) {
              setConversionStatusMsg(data.statusMessage);
            }
          }
        }
      } catch (err) {
        console.warn('Failed to fetch conversion log:', err);
      }
    };

    fetchConversionLogs();
    interval = setInterval(fetchConversionLogs, isConvertingQualities ? 1000 : 2500);

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isConvertingQualities]);

  // Автоматична прокрутка терміналів логів до останнього запису
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [transcribeLogLines]);

  useEffect(() => {
    if (conversionLogContainerRef.current) {
      conversionLogContainerRef.current.scrollTop = conversionLogContainerRef.current.scrollHeight;
    }
  }, [conversionLogLines]);

  useEffect(() => {
    let interval: any = null;
    if (isConvertingQualities || isBatchParsing) {
      interval = setInterval(async () => {
        try {
          const res = await fetch('/api/conversion-progress');
          const data = await res.json();
          if (data && data.active) {
            if (data.percent !== undefined) setConversionProgressPercent(data.percent);
            if (data.statusMessage) setConversionStatusMsg(data.statusMessage);
          }
        } catch (e) { }
      }, 500);
    } else {
      setConversionProgressPercent(0);
      setConversionStatusMsg('');
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isConvertingQualities, isBatchParsing]);

  const uploadFileToServer = (
    file: File,
    onProgress?: (percent: number) => void,
    options?: { folder?: string; quality?: string }
  ): Promise<string> => {
    return new Promise(async (resolve, reject) => {
      try {
        const queryParams = new URLSearchParams();
        if (options?.folder) queryParams.set('folder', options.folder);
        if (options?.quality) queryParams.set('quality', options.quality);
        const qs = queryParams.toString() ? `?${queryParams.toString()}` : '';

        // Спроба 1: Пряме завантаження через Multer лише для невеликих файлів <= 15МБ
        if (file.size <= 15 * 1024 * 1024) {
          const formData = new FormData();
          formData.append('video', file);
          if (options?.folder) formData.append('folder', options.folder);
          if (options?.quality) formData.append('quality', options.quality);

          const xhr = new XMLHttpRequest();
          xhr.open('POST', `/api/upload-video${qs}`);
          if (options?.folder) xhr.setRequestHeader('x-folder', options.folder);
          if (options?.quality) xhr.setRequestHeader('x-quality', options.quality);

          if (xhr.upload) {
            xhr.upload.onprogress = (evt) => {
              if (evt.lengthComputable && evt.total > 0 && onProgress) {
                const overallPercent = Math.min(99, Math.round((evt.loaded / evt.total) * 100));
                onProgress(overallPercent);
              }
            };
          }

          const directResult = await new Promise<{ success: boolean; videoUrl?: string; error?: string }>((resResolve, resReject) => {
            xhr.onload = () => {
              if (xhr.status >= 200 && xhr.status < 300) {
                try {
                  const parsed = JSON.parse(xhr.responseText);
                  resResolve(parsed);
                } catch (e) {
                  resReject(new Error(`Server response error (${xhr.status}): ${xhr.responseText.substring(0, 80)}`));
                }
              } else {
                resReject(new Error(`Upload failed with status ${xhr.status}`));
              }
            };
            xhr.onerror = () => resReject(new Error('Network error during file upload'));
            xhr.ontimeout = () => resReject(new Error('Upload request timed out'));
            xhr.send(formData);
          }).catch(err => {
            console.warn('Direct upload notice, switching to chunked upload:', err.message);
            return null;
          });

          if (directResult && directResult.success && directResult.videoUrl) {
            if (onProgress) onProgress(100);
            return resolve(directResult.videoUrl);
          }
        }

        // Спроба 2: Надійне поблокове завантаження блоками по 5МБ
        const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunks (за запитом користувача)
        const totalChunks = Math.max(1, Math.ceil(file.size / CHUNK_SIZE));
        const uploadId = `up_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        let assembledVideoUrl = '';

        for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
          const start = chunkIndex * CHUNK_SIZE;
          const end = Math.min(file.size, start + CHUNK_SIZE);
          const chunk = file.slice(start, end);

          let attempts = 0;
          let chunkSuccess = false;
          let res: { success: boolean; completed?: boolean; videoUrl?: string; error?: string } = { success: false };

          while (attempts < 3 && !chunkSuccess) {
            attempts++;
            try {
              res = await new Promise<{ success: boolean; completed?: boolean; videoUrl?: string; error?: string }>((resResolve, resReject) => {
                const chunkXhr = new XMLHttpRequest();
                chunkXhr.open('POST', `/api/upload-video-chunk${qs}`);
                chunkXhr.setRequestHeader('x-upload-id', uploadId);
                chunkXhr.setRequestHeader('x-filename', encodeURIComponent(file.name));
                chunkXhr.setRequestHeader('x-chunk-index', chunkIndex.toString());
                chunkXhr.setRequestHeader('x-total-chunks', totalChunks.toString());
                chunkXhr.setRequestHeader('x-chunk-size', CHUNK_SIZE.toString());
                if (options?.folder) chunkXhr.setRequestHeader('x-folder', options.folder);
                if (options?.quality) chunkXhr.setRequestHeader('x-quality', options.quality);
                chunkXhr.setRequestHeader('Content-Type', 'application/octet-stream');

                if (chunkXhr.upload) {
                  chunkXhr.upload.onprogress = (evt) => {
                    if (evt.lengthComputable && evt.total > 0 && onProgress) {
                      const totalLoadedSoFar = start + evt.loaded;
                      const overallPercent = Math.min(99, Math.round((totalLoadedSoFar / file.size) * 100));
                      onProgress(overallPercent);
                    }
                  };
                }

                chunkXhr.onload = () => {
                  if (chunkXhr.status >= 200 && chunkXhr.status < 300) {
                    try {
                      const text = chunkXhr.responseText;
                      if (!text) {
                        resReject(new Error(`Empty server response on chunk ${chunkIndex + 1}`));
                        return;
                      }
                      const parsed = JSON.parse(text);
                      resResolve(parsed);
                    } catch (e) {
                      resReject(new Error(`Chunk upload response parse error (${chunkXhr.status})`));
                    }
                  } else {
                    resReject(new Error(`Chunk upload failed with status ${chunkXhr.status}`));
                  }
                };

                chunkXhr.onerror = () => resReject(new Error('Network error during file chunk upload'));
                chunkXhr.send(chunk);
              });

              chunkSuccess = true;
              if (res && res.success && res.videoUrl) {
                assembledVideoUrl = res.videoUrl;
              }
            } catch (chunkErr: any) {
              console.warn(`Chunk ${chunkIndex + 1}/${totalChunks} attempt ${attempts} failed:`, chunkErr.message);
              if (attempts < 3) {
                await new Promise(r => setTimeout(r, 1000));
              } else {
                throw chunkErr;
              }
            }
          }
        }

        if (assembledVideoUrl) {
          if (onProgress) onProgress(100);
          return resolve(assembledVideoUrl);
        } else {
          return reject(new Error('Chunk upload completed without server returning assembled videoUrl'));
        }
      } catch (err: any) {
        reject(err);
      }
    });
  };

  const uploadSubtitleToServer = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('subtitle', file);

    const res = await fetch('/api/upload-subtitle', {
      method: 'POST',
      body: formData
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `HTTP ${res.status}`);
    }

    const data = await res.json();
    if (!data.success || !data.subtitleUrl) {
      throw new Error(data.error || 'Server did not return subtitle URL');
    }

    return data.subtitleUrl;
  };

  const handleMovieSubtitleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingSubtitle(true);
    try {
      const subtitleUrl = await uploadSubtitleToServer(file);
      setMovieForm(prev => ({
        ...prev,
        subtitleUrl,
        subtitles: Array.from(new Set([...(prev.subtitles || []), 'Українські']))
      }));
    } catch (err: any) {
      console.error('Error uploading subtitle file:', err);
      alert(language === 'UA' ? `Помилка завантаження субтитрів: ${err.message}` : `Subtitle upload failed: ${err.message}`);
    } finally {
      setUploadingSubtitle(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleEpisodeSubtitleUpload = async (seasonNum: number, epNum: number, file: File) => {
    if (!file) return;

    setUploadingEpisodeSubtitle({ season: seasonNum, episodeNumber: epNum });
    try {
      const subtitleUrl = await uploadSubtitleToServer(file);
      setMovieForm(prev => {
        const updated = { ...(prev.episodesData || {}) };
        if (updated[seasonNum]) {
          updated[seasonNum] = updated[seasonNum].map(ep => {
            if (ep.number === epNum) {
              return { ...ep, subtitleUrl };
            }
            return ep;
          });
        }
        return { ...prev, episodesData: updated };
      });
    } catch (err: any) {
      console.error('Error uploading episode subtitle file:', err);
      alert(language === 'UA' ? `Помилка завантаження субтитрів для серії ${epNum}: ${err.message}` : `Episode ${epNum} subtitle upload failed: ${err.message}`);
    } finally {
      setUploadingEpisodeSubtitle(null);
    }
  };

  const handleBatchEpisodeFilesUpload = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;
    setIsBatchParsing(true);

    try {
      const fileArray = Array.from(files).filter(f => {
        const ext = f.name.split('.').pop()?.toLowerCase() || '';
        return ['mp4', 'mkv', 'avi', 'webm', 'mov', 'm3u8', 'ts', 'mp3', 'flv'].includes(ext) || f.type.startsWith('video/');
      });

      if (fileArray.length === 0) {
        alert(language === 'UA' ? 'У вибраній папці/файлах не знайдено відеофайлів (.mp4, .mkv, .avi, .webm)' : 'No video files found in selected folder/files');
        return;
      }

      const targetId = isEditing && isEditing !== 'new' ? isEditing : (movieForm.id || 'new_movie');
      const currentEpisodesData = getFullEpisodesDataForMovie(targetId, movieForm.episodesData);
      const customUrlsMap: Record<string, string> = {};

      try {
        const existingCustomUrlsStr = localStorage.getItem('nova_custom_video_urls');
        if (existingCustomUrlsStr) {
          Object.assign(customUrlsMap, JSON.parse(existingCustomUrlsStr));
        }
      } catch (e) { }

      let totalAddedCount = 0;
      const detectedSeasons = new Set<number>();

      for (let idx = 0; idx < fileArray.length; idx++) {
        const file = fileArray[idx];
        setBatchMessage(language === 'UA'
          ? `Завантаження на сервер ${idx + 1}/${fileArray.length}: ${file.name}...`
          : `Uploading ${idx + 1}/${fileArray.length}: ${file.name}...`);

        const relativePath = (file.webkitRelativePath || file.name).replace(/\\/g, '/');
        const pathParts = relativePath.split('/');
        const filename = file.name;

        let seasonNum = activeSeason || 1;
        let epNum: number | null = null;

        // Визначення сезону з частин шляху (наприклад, Season 1, S1, Сезон 1)
        for (const part of pathParts) {
          const sMatch = part.match(/\b(?:season|сезон|s)\s*0*(\d{1,2})\b/i) || part.match(/\b0*(\d{1,2})\s*(?:season|сезон)\b/i);
          if (sMatch) {
            const parsedS = parseInt(sMatch[1], 10);
            if (parsedS > 0 && parsedS <= 100) {
              seasonNum = parsedS;
              break;
            }
          }
        }

        // Одночасне визначення сезону та серії з назви файлу або повного шляху
        const sAndEMatch = filename.match(/s0*(\d{1,2})\s*e0*(\d{1,3})/i) ||
          filename.match(/0*(\d{1,2})\s*x\s*0*(\d{1,3})/i) ||
          filename.match(/s0*(\d{1,2})_e0*(\d{1,3})/i);

        if (sAndEMatch) {
          seasonNum = parseInt(sAndEMatch[1], 10);
          epNum = parseInt(sAndEMatch[2], 10);
        } else {
          // Визначення номера серії з назви файлу
          const eMatch = filename.match(/\b(?:ep|episode|серія|серiя|епізод|e)\s*\.?\s*0*(\d{1,3})\b/i) ||
            filename.match(/[_\-\s]0*(\d{1,3})\b\./i) ||
            filename.match(/^0*(\d{1,3})\b\./i);

          if (eMatch) {
            epNum = parseInt(eMatch[1], 10);
          } else {
            const allNums = filename.match(/\d+/g);
            if (allNums && allNums.length > 0) {
              const lastNum = parseInt(allNums[allNums.length - 1], 10);
              if (lastNum >= 1 && lastNum <= 1000) {
                epNum = lastNum;
              }
            }
          }
        }

        if (epNum === null || isNaN(epNum)) {
          const seasonEpList = currentEpisodesData[seasonNum] || [];
          epNum = seasonEpList.length + 1;
        }

        detectedSeasons.add(seasonNum);

        // Завантаження файлу безпосередньо на сервер із резервним механізмом
        let videoUrl = '';
        try {
          videoUrl = await uploadFileToServer(file, (pct) => {
            setBatchMessage(language === 'UA'
              ? `Завантаження на сервер ${idx + 1}/${fileArray.length}: ${file.name} (${pct}%)...`
              : `Uploading ${idx + 1}/${fileArray.length}: ${file.name} (${pct}%)...`);
          });
        } catch (uploadErr: any) {
          console.warn(`Chunk upload notice for ${filename}, attempting direct stream upload...`, uploadErr);
          try {
            const formData = new FormData();
            formData.append('video', file);
            const directRes = await fetch('/api/upload-video', { method: 'POST', body: formData });
            const directData = await directRes.json();
            if (directData && directData.success && directData.videoUrl) {
              videoUrl = directData.videoUrl;
            } else {
              videoUrl = URL.createObjectURL(file);
            }
          } catch (dErr) {
            videoUrl = URL.createObjectURL(file);
          }
        }

        const detectVoiceoversForFile = (fn: string, mode: string): string[] => {
          if (mode !== 'auto' && mode !== 'all') {
            return [mode];
          }
          if (mode === 'all') {
            return ALL_VOICEOVER_SUFFIXES.filter(s => s !== '' && s !== '-default').map(s => s.replace(/^-/, ''));
          }
          const matched: string[] = [];

          // Регулярний вираз для пошуку тексту у квадратних дужках [...] з підтримкою кирилиці
          const brackets = Array.from(fn.matchAll(/\[([^\]]+)\]/gu)).map(m => m[1].trim());

          const checkText = (text: string) => {
            const t = text.toLowerCase();
            const tNorm = t.replace(/_/g, ' ');
            const tClean = t.replace(/[^a-z0-9а-яіїєґ]/g, '');

            if (
              tNorm.includes('dali bude') || tClean.includes('dalibude') ||
              tNorm.includes('далі буде') || tClean.includes('далібуде') ||
              t.includes('dali') || t.includes('буде') || t.includes('далі') ||
              t.includes('melodicvoice') || t.includes('melodic')
            ) {
              if (!matched.includes('Далі Буде! (Багатоголосий)')) matched.push('Далі Буде! (Багатоголосий)');
            }
            if (
              tNorm.includes('amanogawa') || tClean.includes('amanogawa') ||
              tNorm.includes('аманогава') || tClean.includes('аманогава')
            ) {
              if (!matched.includes('Amanogawa (Багатоголосий)')) matched.push('Amanogawa (Багатоголосий)');
            }
            if (
              tNorm.includes('koyomi') || tClean.includes('koyomi') ||
              tNorm.includes('койомі') || tClean.includes('койомі')
            ) {
              if (!matched.includes('Koyomi (Багатоголосий)')) matched.push('Koyomi (Багатоголосий)');
            }
            if (
              tNorm.includes('sbt') || tClean.includes('sbt') ||
              tNorm.includes('сбт') || tClean.includes('сбт')
            ) {
              if (!matched.includes('SBT Localization (Дубляж)')) matched.push('SBT Localization (Дубляж)');
            }
            if (
              tNorm.includes('fanvox') || tClean.includes('fanvox') ||
              tNorm.includes('фанвокс') || tClean.includes('фанвокс')
            ) {
              if (!matched.includes('FanVoxUA (Двоголосий)')) matched.push('FanVoxUA (Двоголосий)');
            }
            if (
              tNorm.includes('original') || t.includes('japanese') || t.includes('jp') || t.includes('японська')
            ) {
              if (!matched.includes('Original (Japanese + Субтитри)')) matched.push('Original (Japanese + Субтитри)');
            }
            if (
              tNorm.includes('cinema') || tClean.includes('cinemaua') || t.includes('сінема')
            ) {
              if (!matched.includes('Cinema UA (Дубляж / Офіційний)')) matched.push('Cinema UA (Дубляж / Офіційний)');
            }
            if (
              tNorm.includes('dniprofilm') || tNorm.includes('dnipro') || t.includes('дніпро')
            ) {
              if (!matched.includes('DniproFilm (Багатоголосий)')) matched.push('DniproFilm (Багатоголосий)');
            }
            if (
              tNorm.includes('hdrezka') || tNorm.includes('rezka') || t.includes('резка')
            ) {
              if (!matched.includes('HDrezka Studio (Багатоголосий)')) matched.push('HDrezka Studio (Багатоголосий)');
            }
            if (
              tNorm.includes('english') || tNorm.includes('original audio') || t.includes('en') || t.includes('англійська')
            ) {
              if (!matched.includes('Original Audio (English)')) matched.push('Original Audio (English)');
            }
          };

          // 1. Спочатку перевіряємо вміст у квадратних дужках
          brackets.forEach(b => checkText(b));

          // 2. Якщо у дужках немає збігу, перевіряємо повну назву файлу
          if (matched.length === 0) {
            checkText(fn);
          }

          // 3. Якщо збігу все ще немає, перевіряємо URL завантаженого відео
          if (matched.length === 0 && videoUrl) {
            checkText(videoUrl);
          }

          if (matched.length > 0) return matched;
          return ['Далі Буде! (Багатоголосий)'];
        };

        const targetVoiceovers = detectVoiceoversForFile(filename, uploadVoiceoverMode);

        targetVoiceovers.forEach(voName => {
          const suffix = voName ? `-${voName}` : '';
          customUrlsMap[`${targetId}-s${seasonNum}-e${epNum}${suffix}`] = videoUrl;
          if (movieForm.id) {
            customUrlsMap[`${movieForm.id}-s${seasonNum}-e${epNum}${suffix}`] = videoUrl;
          }
          customUrlsMap[`new_movie-s${seasonNum}-e${epNum}${suffix}`] = videoUrl;
        });

        const defaultKey = `${targetId}-s${seasonNum}-e${epNum}-default`;
        if (!customUrlsMap[defaultKey] || uploadVoiceoverMode === 'all') {
          customUrlsMap[defaultKey] = videoUrl;
          if (movieForm.id) customUrlsMap[`${movieForm.id}-s${seasonNum}-e${epNum}-default`] = videoUrl;
          customUrlsMap[`new_movie-s${seasonNum}-e${epNum}-default`] = videoUrl;
        }

        if (!currentEpisodesData[seasonNum]) {
          currentEpisodesData[seasonNum] = [];
        }

        const existingEpIdx = currentEpisodesData[seasonNum].findIndex(e => e.number === epNum);
        const epTitle = filename.replace(/\.[^/.]+$/, '').replace(/^[sS]\d+[eE]\d+[_\-\s]*/, '');
        const cleanTitle = epTitle ? epTitle.charAt(0).toUpperCase() + epTitle.slice(1) : (language === 'UA' ? `Серія ${epNum}` : `Episode ${epNum}`);

        // Визначення роздільності з назви файлу (наприклад, [1080p], [720p], [4K], [480p])
        const qualityMatch = filename.match(/\b(4k|2160p|1080p|720p|480p|360p)\b/i);
        let detectedQuality: string | null = null;
        if (qualityMatch) {
          const rawQ = qualityMatch[1].toLowerCase();
          if (rawQ === '4k' || rawQ === '2160p') detectedQuality = '4K';
          else if (rawQ === '1080p') detectedQuality = '1080p';
          else if (rawQ === '720p') detectedQuality = '720p';
          else if (rawQ === '480p') detectedQuality = '480p';
          else if (rawQ === '360p') detectedQuality = '360p';
        }

        if (detectedQuality) {
          const resKey = detectedQuality.toLowerCase();
          customUrlsMap[`${targetId}-s${seasonNum}-e${epNum}-quality-${resKey}`] = videoUrl;
          if (movieForm.id) {
            customUrlsMap[`${movieForm.id}-s${seasonNum}-e${epNum}-quality-${resKey}`] = videoUrl;
          }
          customUrlsMap[`new_movie-s${seasonNum}-e${epNum}-quality-${resKey}`] = videoUrl;
        }

        if (existingEpIdx !== -1) {
          const existingEp = currentEpisodesData[seasonNum][existingEpIdx];
          const updatedSources = { ...(existingEp.sources || existingEp.videoSources || {}) };

          targetVoiceovers.forEach(voName => {
            updatedSources[voName] = videoUrl;
            const shortName = voName.split(' ')[0];
            updatedSources[shortName] = videoUrl;
            if (voName.includes('Далі Буде')) {
              updatedSources['Далі Буде'] = videoUrl;
              updatedSources['Далі Буде!'] = videoUrl;
            }
          });

          if (detectedQuality) {
            updatedSources[detectedQuality] = videoUrl;
          }

          const existingQualities = Array.isArray(existingEp.qualities) ? [...existingEp.qualities] : [];
          if (detectedQuality) {
            const qIdx = existingQualities.findIndex(q => q.resolution === detectedQuality);
            if (qIdx !== -1) {
              existingQualities[qIdx] = { resolution: detectedQuality as any, url: videoUrl };
            } else {
              existingQualities.push({ resolution: detectedQuality as any, url: videoUrl });
            }
          }

          currentEpisodesData[seasonNum][existingEpIdx] = {
            ...existingEp,
            videoUrl: (uploadVoiceoverMode === 'auto' || uploadVoiceoverMode === 'all' || !existingEp.videoUrl) ? videoUrl : existingEp.videoUrl,
            sources: updatedSources,
            videoSources: updatedSources,
            qualities: existingQualities.length > 0 ? existingQualities : existingEp.qualities
          };
        } else {
          const initialSources: Record<string, string> = {};
          targetVoiceovers.forEach(voName => {
            initialSources[voName] = videoUrl;
            const shortName = voName.split(' ')[0];
            initialSources[shortName] = videoUrl;
            if (voName.includes('Далі Буде')) {
              initialSources['Далі Буде'] = videoUrl;
              initialSources['Далі Буде!'] = videoUrl;
            }
          });

          if (detectedQuality) {
            initialSources[detectedQuality] = videoUrl;
          }

          const initialQualities = detectedQuality ? [{ resolution: detectedQuality as any, url: videoUrl }] : undefined;

          currentEpisodesData[seasonNum].push({
            number: epNum,
            title: cleanTitle,
            duration: movieForm.genres?.includes('Аніме') ? '24 хв' : '52 хв',
            videoUrl: videoUrl,
            sources: initialSources,
            videoSources: initialSources,
            qualities: initialQualities,
            description: language === 'UA'
              ? `Епізод ${epNum} у сезоні ${seasonNum} (${filename}).`
              : `Episode ${epNum} in Season ${seasonNum} (${filename}).`
          });
        }

        totalAddedCount++;
      }

      Object.keys(currentEpisodesData).forEach(sKey => {
        const sNum = Number(sKey);
        currentEpisodesData[sNum].sort((a, b) => a.number - b.number);
      });

      try {
        localStorage.setItem('nova_custom_video_urls', JSON.stringify(customUrlsMap));
      } catch (e) {
        console.error('Error saving custom URLs map:', e);
      }

      const maxSeason = Math.max(...Object.keys(currentEpisodesData).map(Number), 1);
      const firstSeason = Math.min(...Object.keys(currentEpisodesData).map(Number));
      const firstEpVideoUrl = currentEpisodesData[firstSeason]?.[0]?.videoUrl;

      setMovieForm(prev => ({
        ...prev,
        videoUrl: (prev.videoUrl && !prev.videoUrl.includes('sample/ElephantsDream.mp4'))
          ? prev.videoUrl
          : (firstEpVideoUrl || prev.videoUrl),
        episodesData: currentEpisodesData,
        duration: language === 'UA' ? `${maxSeason} ${maxSeason === 1 ? 'сезон' : maxSeason < 5 ? 'сезони' : 'сезонів'}` : `${maxSeason} ${maxSeason === 1 ? 'season' : 'seasons'}`
      }));

      const seasonListStr = Array.from(detectedSeasons).sort((a, b) => a - b).map(s => `${s} Сезон`).join(', ');
      setBatchMessage(language === 'UA'
        ? `✅ Успішно завантажено та збережено у папці /uploads/ ${totalAddedCount} серій (${seasonListStr})! Натисніть "Конвертувати у 4 роздільності" для перекодування у 4K/1080p/720p/480p.`
        : `✅ Successfully uploaded ${totalAddedCount} episodes (${seasonListStr}) to /uploads/! Click "Convert into 4 video files" to run quality transcoding.`);
    } catch (err: any) {
      console.error('Error during batch episode upload:', err);
      setBatchMessage(language === 'UA' ? `⚠️ Помилка завантаження: ${err.message}` : `⚠️ Upload error: ${err.message}`);
    } finally {
      setIsBatchParsing(false);
    }
  };

  const handleQualityFileUpload = async (qualityKey: string, file: File) => {
    if (!file) return;
    setUploadingQuality(qualityKey);
    setQualityUploadProgress(1);
    try {
      const uploadedUrl = await uploadFileToServer(
        file,
        (percent) => setQualityUploadProgress(percent),
        { folder: 'videos', quality: qualityKey }
      );
      setMovieForm(prev => {
        const nextSources = { ...(prev.videoSources || {}) };
        nextSources[qualityKey] = uploadedUrl;
        const nextQualities = [
          ...(prev.qualities || []).filter(q => q.resolution !== qualityKey),
          { resolution: qualityKey as any, url: uploadedUrl }
        ];
        return {
          ...prev,
          videoSources: nextSources,
          qualities: nextQualities,
          videoUrl: (qualityKey === '1080p' || qualityKey === '4K' || !prev.videoUrl || prev.videoUrl.includes('BigBuckBunny')) ? uploadedUrl : prev.videoUrl
        };
      });

      // Миттєва синхронізація з мапою customUrlsMap
      try {
        const targetId = isEditing && isEditing !== 'new' ? isEditing : (movieForm.id || 'new_movie');
        const customUrls = JSON.parse(localStorage.getItem('nova_custom_video_urls') || '{}');
        const resKey = qualityKey.toLowerCase();
        customUrls[`${targetId}-quality-${resKey}`] = uploadedUrl;
        if (movieForm.id) customUrls[`${movieForm.id}-quality-${resKey}`] = uploadedUrl;
        customUrls[`new_movie-quality-${resKey}`] = uploadedUrl;
        localStorage.setItem('nova_custom_video_urls', JSON.stringify(customUrls));
      } catch (e) { }

    } catch (err: any) {
      console.error('Failed to upload quality video:', err);
      alert(language === 'UA' ? `Помилка завантаження файлу ${qualityKey}: ${err.message}` : `Error uploading ${qualityKey}: ${err.message}`);
    } finally {
      setUploadingQuality(null);
      setQualityUploadProgress(0);
    }
  };

  const handleQualityUrlChange = (qualityKey: string, url: string) => {
    setMovieForm(prev => {
      const nextSources = { ...(prev.videoSources || {}) };
      if (url.trim()) {
        nextSources[qualityKey] = url.trim();
      } else {
        delete nextSources[qualityKey];
      }
      const nextQualities = Object.entries(nextSources).map(([res, u]) => ({
        resolution: res as any,
        url: u
      }));
      return {
        ...prev,
        videoSources: nextSources,
        qualities: nextQualities,
        videoUrl: (qualityKey === '1080p' && url.trim()) ? url.trim() : prev.videoUrl
      };
    });

    try {
      const targetId = isEditing && isEditing !== 'new' ? isEditing : (movieForm.id || 'new_movie');
      const customUrls = JSON.parse(localStorage.getItem('nova_custom_video_urls') || '{}');
      const resKey = qualityKey.toLowerCase();
      if (url.trim()) {
        customUrls[`${targetId}-quality-${resKey}`] = url.trim();
        if (movieForm.id) customUrls[`${movieForm.id}-quality-${resKey}`] = url.trim();
        customUrls[`new_movie-quality-${resKey}`] = url.trim();
      } else {
        delete customUrls[`${targetId}-quality-${resKey}`];
        if (movieForm.id) delete customUrls[`${movieForm.id}-quality-${resKey}`];
        delete customUrls[`new_movie-quality-${resKey}`];
      }
      localStorage.setItem('nova_custom_video_urls', JSON.stringify(customUrls));
    } catch (e) { }
  };

  const handleVideoFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingVideo(true);
    setUploadProgress(1);
    setWhisperStatusMsg(language === 'UA' ? 'Завантаження відеофайлу на сервер (Крок 1)...' : 'Uploading video file to server (Step 1)...');

    let videoUrl = '';
    let usedBlobFallback = false;

    try {
      videoUrl = await uploadFileToServer(file, (percent) => setUploadProgress(percent));
    } catch (err: any) {
      console.warn('Server upload notice, using local Blob URL fallback for test mode:', err);
      videoUrl = URL.createObjectURL(file);
      usedBlobFallback = true;
    }

    setUploadProgress(100);
    setMovieForm(prev => ({
      ...prev,
      videoUrl: videoUrl
    }));

    if (usedBlobFallback) {
      setWhisperStatusMsg(language === 'UA'
        ? '⚠️ Використано локальне Blob URL відео для тестування.'
        : '⚠️ Used local Blob URL video for test mode.');
      setIsUploadingVideo(false);
      return;
    }

    // КРОК 2: Запуск транскрипції Whisper за реальним серверним посиланням (/uploads/...)
    if (videoUrl.startsWith('/uploads/') || videoUrl.startsWith('/videos/')) {
      setIsWhisperProcessing(true);
      setWhisperStatusMsg(language === 'UA'
        ? '⚡ [Whisper Крок 2] Вилучення аудіотреку та розпізнавання субтитрів...'
        : '⚡ [Whisper Step 2] Extracting audio track & generating subtitles...');

      try {
        const whisperRes = await fetch('/api/transcribe-whisper', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ videoUrl, movieTitle: movieForm.title || file.name })
        });
        const whisperText = await whisperRes.text();
        let whisperData: any = null;
        try { whisperData = JSON.parse(whisperText); } catch { }
        if (whisperData && whisperData.success) {
          setMovieForm(prev => ({
            ...prev,
            whisperSubtitles: whisperData.whisperSubtitles,
            subtitles: Array.from(new Set([...(prev.subtitles || []), 'Українські (Whisper)', 'English (Whisper)']))
          }));
          setWhisperStatusMsg(language === 'UA'
            ? '✅ [Whisper] Автоматичну транскрипцію успішно завершено!'
            : '✅ [Whisper] Automated transcription completed successfully!');
        }
      } catch (err) {
        console.warn('Whisper step 2 automation error:', err);
      } finally {
        setIsWhisperProcessing(false);
        setIsUploadingVideo(false);
      }
    } else {
      setIsUploadingVideo(false);
    }
  };

  const handleConvert4QualityVideos = async () => {
    const hasMainVideo = movieForm.videoUrl && !movieForm.videoUrl.includes('sample/ElephantsDream.mp4');
    const hasEpisodes = movieForm.episodesData && Object.keys(movieForm.episodesData).length > 0;

    if (!hasMainVideo && !hasEpisodes) {
      alert(language === 'UA' ? 'Спочатку завантажте або вкажіть відеофайл або файл серії' : 'Please upload or specify a video or episode file first');
      return;
    }

    setIsConvertingQualities(true);
    setConversionMessage(language === 'UA' ? 'Запуск перекодування у 4 роздільності (4K, 1080p, 720p, 480p)...' : 'Starting conversion to 4 resolutions...');

    try {
      const targetId = isEditing && isEditing !== 'new' ? isEditing : (movieForm.id || 'new_movie');
      const updatedEpisodesData = { ...movieForm.episodesData };
      const customUrlsMap = JSON.parse(localStorage.getItem('nova_custom_video_urls') || '{}');
      let convertedCount = 0;

      // 1. Конвертація головного відеофайлу фільму, якщо він доступний
      if (hasMainVideo) {
        let mainVideoUrl = movieForm.videoUrl;
        if (mainVideoUrl && mainVideoUrl.startsWith('blob:')) {
          setConversionMessage(language === 'UA' ? 'Завантаження головного відеофайлу на сервер...' : 'Uploading main video file to server...');
          try {
            const resp = await fetch(mainVideoUrl);
            if (resp.ok) {
              const blobData = await resp.blob();
              const file = new File([blobData], `main_video_${Date.now()}.mp4`, { type: 'video/mp4' });
              const uploadedUrl = await uploadFileToServer(file);
              if (uploadedUrl && !uploadedUrl.startsWith('blob:')) {
                mainVideoUrl = uploadedUrl;
                setMovieForm(prev => ({ ...prev, videoUrl: uploadedUrl }));
              }
            }
          } catch (e) {
            console.warn('Main video blob URL is expired or unreachable:', e);
          }
        }

        // Якщо mainVideoUrl все ще blob-посилання (застаріле або недоступне), перевіряємо першу серію
        if (mainVideoUrl && mainVideoUrl.startsWith('blob:')) {
          const seasonKeys = Object.keys(updatedEpisodesData).map(Number);
          if (seasonKeys.length > 0) {
            const minS = Math.min(...seasonKeys);
            const firstEp = updatedEpisodesData[minS]?.[0];
            if (firstEp && firstEp.videoUrl && !firstEp.videoUrl.startsWith('blob:')) {
              mainVideoUrl = firstEp.videoUrl;
              setMovieForm(prev => ({ ...prev, videoUrl: firstEp.videoUrl }));
            }
          }
        }

        // Запуск конвертації лише якщо посилання є валідним серверним URL
        if (mainVideoUrl && !mainVideoUrl.startsWith('blob:')) {
          setConversionMessage(language === 'UA' ? 'Конвертація головного відеофайлу у 4K, 1080p, 720p, 480p...' : 'Converting main video file to 4K, 1080p, 720p, 480p...');
          const res = await fetch('/api/convert-video', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ videoUrl: mainVideoUrl, movieId: targetId, renderMode: renderMode })
          });
          const data = await res.json().catch(() => null);
          if (data && data.success && data.qualities && data.qualities.some((q: any) => q.url.startsWith('/uploads/videos/'))) {
            setMovieForm(prev => ({
              ...prev,
              qualities: data.qualities,
              conversionStatus: 'completed'
            }));
            data.qualities.forEach((q: any) => {
              const resKey = q.resolution.toLowerCase();
              customUrlsMap[`${targetId}-quality-${resKey}`] = q.url;
              if (movieForm.id) customUrlsMap[`${movieForm.id}-quality-${resKey}`] = q.url;
              customUrlsMap[`new_movie-quality-${resKey}`] = q.url;
            });
            convertedCount++;
          }
        }
      }

      // 2. Конвертація кожного окремого епізоду в episodesData
      if (hasEpisodes) {
        const seasonKeys = Object.keys(updatedEpisodesData).map(Number);
        for (const sNum of seasonKeys) {
          const epList = updatedEpisodesData[sNum] || [];
          for (let i = 0; i < epList.length; i++) {
            const ep = epList[i];
            if (ep) {
              let epVideoUrl = ep.videoUrl || '';
              if (epVideoUrl.startsWith('blob:')) {
                setConversionMessage(language === 'UA'
                  ? `Завантаження відео С${sNum}Е${ep.number} (${i + 1}/${epList.length}) на сервер...`
                  : `Uploading video S${sNum}E${ep.number} to server...`);
                try {
                  const resp = await fetch(epVideoUrl);
                  if (resp.ok) {
                    const blobData = await resp.blob();
                    const file = new File([blobData], `s${sNum}e${ep.number}.mp4`, { type: 'video/mp4' });
                    const uploadedUrl = await uploadFileToServer(file);
                    if (uploadedUrl && !uploadedUrl.startsWith('blob:')) {
                      epVideoUrl = uploadedUrl;
                      ep.videoUrl = uploadedUrl;
                      customUrlsMap[`${targetId}-s${sNum}-e${ep.number}-default`] = uploadedUrl;
                      customUrlsMap[`new_movie-s${sNum}-e${ep.number}-default`] = uploadedUrl;
                    }
                  }
                } catch (e) {
                  console.warn(`Episode S${sNum}E${ep.number} blob fetch notice:`, e);
                }
              }

              setConversionMessage(language === 'UA'
                ? `FFmpeg перекодування Сезону ${sNum} Серії ${ep.number} (${i + 1}/${epList.length})...`
                : `FFmpeg converting Season ${sNum} Episode ${ep.number}...`);

              const res = await fetch('/api/convert-video', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  videoUrl: epVideoUrl,
                  movieId: targetId,
                  seasonNum: sNum,
                  episodeNum: ep.number,
                  renderMode: renderMode
                })
              });
              const data = await res.json().catch(() => null);
              if (data && data.success && data.qualities && data.qualities.some((q: any) => q.url.startsWith('/uploads/videos/'))) {
                ep.qualities = data.qualities;
                const convertedVideoUrl = data.qualities.find((q: any) => q.url.startsWith('/uploads/videos/'))?.url;
                if (convertedVideoUrl) {
                  ep.videoUrl = convertedVideoUrl;
                }
                data.qualities.forEach((q: any) => {
                  const resKey = q.resolution.toLowerCase();
                  customUrlsMap[`${targetId}-s${sNum}-e${ep.number}-quality-${resKey}`] = q.url;
                  customUrlsMap[`new_movie-s${sNum}-e${ep.number}-quality-${resKey}`] = q.url;
                });
                convertedCount++;
              }
            }
          }
        }

        try {
          localStorage.setItem('nova_custom_video_urls', JSON.stringify(customUrlsMap));
        } catch (e) { }

        setMovieForm(prev => ({
          ...prev,
          episodesData: updatedEpisodesData,
          conversionStatus: 'completed'
        }));
      }

      setConversionMessage(language === 'UA'
        ? `✅ Успішно створено відеофайли якостей (4K, 1080p, 720p, 480p) для ${convertedCount} відео у папці /uploads/videos/!`
        : `✅ Successfully created 4 quality video files for ${convertedCount} videos in /uploads/videos/!`);
    } catch (err) {
      console.error('Conversion error:', err);
      alert(language === 'UA' ? 'Помилка конвертації відеофайлів' : 'Video conversion error');
    } finally {
      setIsConvertingQualities(false);
    }
  };

  const handleManualWhisperTranscribe = async (e?: React.SyntheticEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    const hasVideo = Boolean(movieForm.videoUrl);
    const episodeList: Array<{ season: number; number: number; videoUrl: string }> = [];

    if (movieForm.episodesData) {
      Object.entries(movieForm.episodesData).forEach(([sNumStr, epItems]) => {
        const sNum = parseInt(sNumStr, 10) || 1;
        if (Array.isArray(epItems)) {
          epItems.forEach(ep => {
            if (ep.videoUrl) {
              episodeList.push({
                season: sNum,
                number: ep.number,
                videoUrl: ep.videoUrl
              });
            }
          });
        }
      });
    }

    if (!hasVideo && episodeList.length === 0) {
      alert(language === 'UA' ? 'Спочатку вкажіть або завантажте відеофайл чи папку з серіями!' : 'Please specify or upload a video file or season folder first!');
      return;
    }

    setIsWhisperProcessing(true);
    setShowTranscribeLogs(true);
    setWhisperStatusMsg(language === 'UA' ? '⚡ [faster-whisper] Аналіз аудіопотоку та автогенерація WebVTT субтитрів...' : '⚡ [faster-whisper] Analyzing audio & generating VTT subtitles...');

    try {
      let targetVideoUrl = movieForm.videoUrl || '';
      if (movieForm.type === 'series' || targetVideoUrl.includes('sample/ElephantsDream.mp4')) {
        targetVideoUrl = '';
      }

      // Завантаження локального blob для головного відео за потреби
      if (targetVideoUrl && targetVideoUrl.startsWith('blob:')) {
        setWhisperStatusMsg(language === 'UA' ? '📤 Завантаження локального відео на сервер...' : 'Uploading local video to server...');
        try {
          const resp = await fetch(targetVideoUrl);
          if (resp.ok) {
            const blobData = await resp.blob();
            const file = new File([blobData], `whisper_input_${Date.now()}.mp4`, { type: 'video/mp4' });
            const uploadedUrl = await uploadFileToServer(file);
            if (uploadedUrl && !uploadedUrl.startsWith('blob:')) {
              targetVideoUrl = uploadedUrl;
              setMovieForm(prev => ({ ...prev, videoUrl: uploadedUrl }));
            }
          }
        } catch (blobErr) {
          console.warn('Failed to convert blob URL:', blobErr);
        }
      }

      // Завантаження локальних blob для серій за потреби
      const processedEpisodesList: Array<{ season: number; number: number; videoUrl: string }> = [];
      for (const ep of episodeList) {
        let epUrl = ep.videoUrl;
        if (epUrl && epUrl.startsWith('blob:')) {
          setWhisperStatusMsg(language === 'UA' ? `📤 Завантаження відео C${ep.season} С${ep.number} на сервер...` : `Uploading episode S${ep.season} E${ep.number} to server...`);
          try {
            const resp = await fetch(epUrl);
            if (resp.ok) {
              const blobData = await resp.blob();
              const file = new File([blobData], `ep_s${ep.season}e${ep.number}_${Date.now()}.mp4`, { type: 'video/mp4' });
              const uploadedUrl = await uploadFileToServer(file);
              if (uploadedUrl && !uploadedUrl.startsWith('blob:')) {
                epUrl = uploadedUrl;
                setMovieForm(prev => {
                  const updated = { ...(prev.episodesData || {}) };
                  if (updated[ep.season]) {
                    updated[ep.season] = updated[ep.season].map(e => e.number === ep.number ? { ...e, videoUrl: uploadedUrl } : e);
                  }
                  return { ...prev, episodesData: updated };
                });
              }
            }
          } catch (e) { }
        }
        processedEpisodesList.push({ ...ep, videoUrl: epUrl });
      }

      setWhisperStatusMsg(language === 'UA' ? '⚡ [faster-whisper] Аналіз аудіопотоку та автогенерація WebVTT субтитрів...' : '⚡ [faster-whisper] Analyzing audio & generating VTT subtitles...');

      const res = await fetch('/api/transcribe-whisper', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoUrl: targetVideoUrl || undefined,
          movieTitle: movieForm.title,
          episodes: processedEpisodesList
        })
      });

      const text = await res.text();
      let data: any = null;
      try { data = JSON.parse(text); } catch { }

      if (data && data.success) {
        setMovieForm(prev => {
          const updatedEpisodesData = { ...(prev.episodesData || {}) };
          if (Array.isArray(data.episodesSubtitles) && data.episodesSubtitles.length > 0) {
            data.episodesSubtitles.forEach((epSub: any) => {
              const sNum = epSub.season || 1;
              const epNum = epSub.episodeNumber || 1;
              if (updatedEpisodesData[sNum]) {
                updatedEpisodesData[sNum] = updatedEpisodesData[sNum].map(item => {
                  if (item.number === epNum) {
                    return { ...item, subtitleUrl: epSub.subtitleUrl };
                  }
                  return item;
                });
              }
            });
          }

          return {
            ...prev,
            subtitleUrl: data.subtitleUrl || prev.subtitleUrl,
            episodesData: updatedEpisodesData,
            subtitles: Array.from(new Set([...(prev.subtitles || []), 'Українські (Whisper)', 'English (Whisper)']))
          };
        });
        setWhisperStatusMsg(language === 'UA' ? '✅ [faster-whisper] Готово! VTT Субтитри збережено у public/subtitles/' : '✅ [faster-whisper] Done! VTT Subtitles generated into public/subtitles/');
      } else {
        setWhisperStatusMsg(language === 'UA' ? '⚠️ Помилка розпізнавання мови Whisper.' : '⚠️ Speech recognition notice.');
      }
    } catch (err) {
      console.error(err);
      setWhisperStatusMsg(language === 'UA' ? '❌ Помилка зв’язку з сервером Whisper' : '❌ Server communication error');
    } finally {
      setIsWhisperProcessing(false);
    }
  };

  const handleSingleEpisodeTranscribe = async (seasonNum: number, episodeNum: number, videoUrl: string) => {
    if (!videoUrl) {
      alert(language === 'UA' ? 'Спочатку вкажіть URL або завантажте відео для цієї серії!' : 'Please upload or specify a video URL for this episode first!');
      return;
    }

    setIsWhisperProcessing(true);
    setShowTranscribeLogs(true);
    setWhisperStatusMsg(language === 'UA' ? `⚡ [faster-whisper] Транскрипція C${seasonNum} С${episodeNum}...` : `⚡ [faster-whisper] Transcribing S${seasonNum} E${episodeNum}...`);

    try {
      let targetUrl = videoUrl;
      if (targetUrl.startsWith('blob:')) {
        setWhisperStatusMsg(language === 'UA' ? '📤 Завантаження відео серії на сервер...' : 'Uploading episode video to server...');
        try {
          const resp = await fetch(targetUrl);
          if (resp.ok) {
            const blobData = await resp.blob();
            const file = new File([blobData], `ep_s${seasonNum}e${episodeNum}_${Date.now()}.mp4`, { type: 'video/mp4' });
            const uploadedUrl = await uploadFileToServer(file);
            if (uploadedUrl && !uploadedUrl.startsWith('blob:')) {
              targetUrl = uploadedUrl;
            }
          }
        } catch (e) { }
      }

      const res = await fetch('/api/transcribe-whisper', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoUrl: targetUrl,
          movieTitle: `${movieForm.title || 'Серіал'} S${seasonNum}E${episodeNum}`,
          episodes: [{ season: seasonNum, number: episodeNum, videoUrl: targetUrl }]
        })
      });

      const data = await res.json();
      if (data && data.success) {
        const subUrl = data.subtitleUrl || (data.episodesSubtitles && data.episodesSubtitles[0]?.subtitleUrl);
        setMovieForm(prev => {
          const updated = { ...(prev.episodesData || {}) };
          if (updated[seasonNum]) {
            updated[seasonNum] = updated[seasonNum].map(ep => {
              if (ep.number === episodeNum) {
                return { ...ep, videoUrl: targetUrl, subtitleUrl: subUrl };
              }
              return ep;
            });
          }
          return {
            ...prev,
            episodesData: updated,
            subtitles: Array.from(new Set([...(prev.subtitles || []), 'Українські (Whisper)', 'English (Whisper)']))
          };
        });
        setWhisperStatusMsg(language === 'UA' ? `✅ [faster-whisper] VTT субтитри для C${seasonNum} С${episodeNum} створено!` : `✅ [faster-whisper] Subtitles created for S${seasonNum} E${episodeNum}!`);
      } else {
        setWhisperStatusMsg(language === 'UA' ? '⚠️ Помилка створення субтитрів для серії.' : '⚠️ Episode subtitle error.');
      }
    } catch (err) {
      console.error(err);
      setWhisperStatusMsg(language === 'UA' ? '❌ Помилка з’єднання з Whisper.' : '❌ Whisper connection error.');
    } finally {
      setIsWhisperProcessing(false);
    }
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [genresList, setGenresList] = useState<string[]>(() => {
    const saved = loadState<string[]>('custom_genres', []);
    if (saved && Array.isArray(saved) && saved.length > 0 && JSON.stringify(saved) !== JSON.stringify(GENRES)) {
      return saved;
    }
    return DEFAULT_ADMIN_CATEGORIES;
  });
  const [newGenreName, setNewGenreName] = useState('');
  const [editingGenre, setEditingGenre] = useState<string | null>(null);
  const [editingGenreValue, setEditingGenreValue] = useState<string>('');

  // Системні користувачі платформи (як на скріншоті)
  const DEFAULT_SYSTEM_USERS = [
    { id: 'viewer@example.invalid', name: 'Мелні', email: 'viewer@example.invalid', plan: 'VIP', status: 'Активний', joined: '19.06.2026', role: 'user', isBlocked: false, avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=150&auto=format&fit=crop' },
    { id: 'projectcinemanova@gmail.com', name: 'project_cinemanova', email: 'projectcinemanova@gmail.com', plan: 'VIP', status: 'Активний', joined: '15.05.2026', role: 'user', isBlocked: false },
    { id: 'max.golovaschenko@gmail.com', name: 'Максим', email: 'max.golovaschenko@gmail.com', plan: 'VIP', status: 'Активний', joined: '10.06.2026', role: 'user', isBlocked: false, avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=150&auto=format&fit=crop' },
    { id: 'admin@313131.com', name: 'Melnyv2', email: 'admin@313131.com', plan: 'VIP', status: 'Активний', joined: '01.06.2026', role: 'user', isBlocked: false, avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=150&auto=format&fit=crop' },
    { id: 'nkdengm@gmail.com', name: 'Денис Нікітенко', email: 'nkdengm@gmail.com', plan: 'VIP', status: 'Активний', joined: '22.05.2026', role: 'user', isBlocked: false, avatarUrl: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?q=80&w=150&auto=format&fit=crop' },
    { id: 'wanzel987@gmail.com', name: 'Вячеслав', email: 'wanzel987@gmail.com', plan: 'VIP', status: 'Активний', joined: '18.06.2026', role: 'user', isBlocked: false, avatarUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?q=80&w=150&auto=format&fit=crop' },
    { id: 'admin@example.invalid', name: 'Адмін', email: 'admin@example.invalid', plan: 'VIP', status: 'Активний', joined: '01.03.2025', role: 'admin', isBlocked: false, avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=150&auto=format&fit=crop' }
  ];

  const getMergedPlatformUsers = () => {
    try {
      const userMap = new Map<string, any>();

      // 1. Базові системні акаунти
      DEFAULT_SYSTEM_USERS.forEach(u => {
        userMap.set(u.email.toLowerCase(), { ...u });
      });

      // 2. Акаунти з cinemanova_accounts (хто реєструвався чи входив)
      const savedAccountsStr = localStorage.getItem('cinemanova_accounts');
      if (savedAccountsStr) {
        try {
          const accounts = JSON.parse(savedAccountsStr);
          Object.values(accounts).forEach((acc: any) => {
            const emailKey = (acc.email || '').trim().toLowerCase();
            if (emailKey) {
              const existing = userMap.get(emailKey) || {};
              userMap.set(emailKey, {
                ...existing,
                ...acc,
                id: acc.id || acc.email || existing.id,
                name: acc.name || existing.name || emailKey.split('@')[0],
                email: acc.email || existing.email,
                plan: acc.plan || existing.plan || 'VIP',
                status: acc.status || existing.status || 'Активний',
                joined: acc.joined || existing.joined || '20.06.2026',
                role: acc.role || existing.role || (emailKey.includes('admin') ? 'admin' : 'user'),
                avatarUrl: acc.avatarUrl || existing.avatarUrl,
                isBlocked: acc.status === 'Заблокований' || acc.isBlocked || existing.isBlocked || false
              });
            }
          });
        } catch (e) {}
      }

      // 3. Акаунти з nova_users
      const savedNovaStr = localStorage.getItem('nova_users');
      if (savedNovaStr) {
        try {
          const parsed = JSON.parse(savedNovaStr);
          if (Array.isArray(parsed)) {
            parsed.forEach((u: any) => {
              const emailKey = (u.email || u.id || '').trim().toLowerCase();
              if (emailKey) {
                const existing = userMap.get(emailKey) || {};
                userMap.set(emailKey, {
                  ...existing,
                  ...u,
                  id: u.id || existing.id || u.email,
                  name: u.name || existing.name || emailKey.split('@')[0],
                  email: u.email || existing.email,
                  plan: u.plan || existing.plan || 'VIP',
                  role: u.role || existing.role || (emailKey.includes('admin') ? 'admin' : 'user'),
                  avatarUrl: u.avatarUrl || existing.avatarUrl,
                  isBlocked: u.isBlocked ?? existing.isBlocked ?? false
                });
              }
            });
          }
        } catch (e) {}
      }

      const merged = Array.from(userMap.values());
      try {
        localStorage.setItem('nova_users', JSON.stringify(merged));
      } catch (e) {}
      return merged;
    } catch (e) {
      return DEFAULT_SYSTEM_USERS;
    }
  };

  // Реальні користувачі платформи, завантажені з localStorage та синхронізовані
  const [usersList, setUsersList] = useState<any[]>(() => getMergedPlatformUsers());

  React.useEffect(() => {
    if (activeSubTab === 'users') {
      const merged = getMergedPlatformUsers();
      setUsersList(merged);
    }
  }, [activeSubTab]);

  const handleCreateGenre = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGenreName.trim() || genresList.includes(newGenreName.trim())) return;
    const updated = [...genresList, newGenreName.trim()];
    setGenresList(updated);
    saveState('custom_genres', updated);
    setNewGenreName('');
  };

  const handleDeleteGenre = (genre: string) => {
    const updated = genresList.filter(g => g !== genre);
    setGenresList(updated);
    saveState('custom_genres', updated);
  };

  const handleUpdateGenre = (oldGenre: string, newGenre: string) => {
    const trimmed = newGenre.trim();
    if (!trimmed || trimmed === oldGenre) {
      setEditingGenre(null);
      return;
    }
    if (genresList.some(g => g.toLowerCase() === trimmed.toLowerCase() && g !== oldGenre)) {
      setEditingGenre(null);
      return;
    }
    const updated = genresList.map(g => g === oldGenre ? trimmed : g);
    setGenresList(updated);
    saveState('custom_genres', updated);

    // Також оновлюємо всі фільми, які містять цей жанр
    const updatedMovies = movies.map(m => {
      if (m.genres && m.genres.includes(oldGenre)) {
        return {
          ...m,
          genres: m.genres.map(g => g === oldGenre ? trimmed : g)
        };
      }
      return m;
    });
    if (JSON.stringify(updatedMovies) !== JSON.stringify(movies)) {
      onMoviesChange(updatedMovies);
      saveState('movies_db', updatedMovies);
    }

    setEditingGenre(null);
  };

  const handleSaveMovie = (e: React.FormEvent) => {
    e.preventDefault();
    if (!movieForm.title) return;

    const sources = movieForm.videoSources || {};
    const finalQualities = Object.entries(sources)
      .filter(([_, url]) => Boolean(url && typeof url === 'string' && url.trim()))
      .map(([res, url]) => ({
        resolution: res as any,
        url: url.trim()
      }));

    const finalForm: Movie = {
      ...movieForm as Movie,
      type: movieForm.type || 'movie',
      director: movieForm.director?.trim() || 'Адміністратор',
      videoUrl: movieForm.videoUrl?.trim() || (sources['1080p'] || sources['4K'] || 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4'),
      videoSources: Object.keys(sources).length > 0 ? sources : undefined,
      qualities: finalQualities.length > 0 ? finalQualities : (movieForm.qualities || undefined),
      episodesData: movieForm.type === 'series' && movieForm.episodesData && Object.keys(movieForm.episodesData).length > 0
        ? movieForm.episodesData
        : undefined
    };

    let targetMovieId = isEditing;
    let updatedMovies: Movie[];

    if (isEditing === 'new') {
      targetMovieId = 'new_movie_' + Date.now();
      const newMovie: Movie = {
        ...finalForm,
        id: targetMovieId,
        ratingVotesCount: movieForm.ratingVotesCount || '10K',
        cast: movieForm.cast || [],
        reviews: []
      };
      updatedMovies = [newMovie, ...movies];
    } else {
      updatedMovies = movies.map(m => m.id === isEditing ? { ...m, ...finalForm } : m);
    }

    try {
      localStorage.setItem('nova_movies', JSON.stringify(updatedMovies));
      localStorage.setItem('movies_db', JSON.stringify(updatedMovies));
    } catch (e) {
      console.error('Error saving movies to localStorage:', e);
    }

    // Збереження користувацьких URL для якостей та серій у localStorage
    if (targetMovieId) {
      try {
        localStorage.removeItem(`nova_use_local_${targetMovieId}`);
        const customUrlsStr = localStorage.getItem('nova_custom_video_urls');
        const customUrls = customUrlsStr ? JSON.parse(customUrlsStr) : {};

        if (finalForm.videoSources) {
          Object.entries(finalForm.videoSources).forEach(([res, url]) => {
            if (url && typeof url === 'string') {
              const resKey = res.toLowerCase();
              customUrls[`${targetMovieId}-quality-${resKey}`] = url;
              if (movieForm.id) customUrls[`${movieForm.id}-quality-${resKey}`] = url;
              customUrls[`new_movie-quality-${resKey}`] = url;
            }
          });
        }

        if (finalForm.qualities && Array.isArray(finalForm.qualities)) {
          finalForm.qualities.forEach((q: any) => {
            const resKey = q.resolution.toLowerCase();
            customUrls[`${targetMovieId}-quality-${resKey}`] = q.url;
            if (movieForm.id) customUrls[`${movieForm.id}-quality-${resKey}`] = q.url;
            customUrls[`new_movie-quality-${resKey}`] = q.url;
          });
        }

        if (finalForm.episodesData) {
          Object.entries(finalForm.episodesData).forEach(([sKey, eps]) => {
            const sNum = Number(sKey);
            eps.forEach(ep => {
              if (ep.videoUrl) {
                ALL_VOICEOVER_SUFFIXES.forEach(suffix => {
                  customUrls[`${targetMovieId}-s${sNum}-e${ep.number}${suffix}`] = ep.videoUrl;
                  if (movieForm.id) {
                    customUrls[`${movieForm.id}-s${sNum}-e${ep.number}${suffix}`] = ep.videoUrl;
                  }
                  customUrls[`new_movie-s${sNum}-e${ep.number}${suffix}`] = ep.videoUrl;
                });
              }
              const epSources = ep.videoSources || ep.sources || {};
              Object.entries(epSources).forEach(([res, url]) => {
                if (url && typeof url === 'string') {
                  const resKey = res.toLowerCase();
                  customUrls[`${targetMovieId}-s${sNum}-e${ep.number}-quality-${resKey}`] = url;
                  if (movieForm.id) {
                    customUrls[`${movieForm.id}-s${sNum}-e${ep.number}-quality-${resKey}`] = url;
                  }
                  customUrls[`new_movie-s${sNum}-e${ep.number}-quality-${resKey}`] = url;
                }
              });
              if (ep.qualities && Array.isArray(ep.qualities)) {
                ep.qualities.forEach((q: any) => {
                  const resKey = q.resolution.toLowerCase();
                  customUrls[`${targetMovieId}-s${sNum}-e${ep.number}-quality-${resKey}`] = q.url;
                  if (movieForm.id) {
                    customUrls[`${movieForm.id}-s${sNum}-e${ep.number}-quality-${resKey}`] = q.url;
                  }
                  customUrls[`new_movie-s${sNum}-e${ep.number}-quality-${resKey}`] = q.url;
                });
              }
            });
          });
        }
        localStorage.setItem('nova_custom_video_urls', JSON.stringify(customUrls));
      } catch (e) {
        console.error('Error saving episode custom URLs in handleSaveMovie:', e);
      }
    }

    onMoviesChange(updatedMovies);
    setIsEditing(null);
  };

  const handleDeleteMovie = (id: string) => {
    if (confirm('Ви впевнені, що хочете видалити цей фільм з каталогу?')) {
      const updated = movies.filter(m => m.id !== id);
      try {
        localStorage.setItem('nova_movies', JSON.stringify(updated));
        localStorage.setItem('movies_db', JSON.stringify(updated));
      } catch (e) {
        console.error('Error saving updated movies to localStorage:', e);
      }
      onMoviesChange(updated);
    }
  };

  const startEditMovie = (movie: Movie) => {
    const isSeries = movie.type === 'series';
    const fullEpisodes = isSeries
      ? getFullEpisodesDataForMovie(movie.id, movie.episodesData, {
        title: movie.title,
        duration: movie.duration,
        type: movie.type,
        backdropUrl: movie.backdropUrl,
        posterUrl: movie.posterUrl,
        videoUrl: movie.videoUrl
      })
      : undefined;

    const existingSources: Record<string, string> = { ...(movie.videoSources || {}) };
    if (movie.qualities && Array.isArray(movie.qualities)) {
      movie.qualities.forEach(q => {
        if (q.resolution && q.url && !existingSources[q.resolution]) {
          existingSources[q.resolution] = q.url;
        }
      });
    }
    try {
      const customUrlsStr = localStorage.getItem('nova_custom_video_urls');
      if (customUrlsStr) {
        const customUrls = JSON.parse(customUrlsStr);
        ['4k', '1080p', '720p', '480p'].forEach(res => {
          const key = `${movie.id}-quality-${res}`;
          const qTag = res === '4k' ? '4K' : res;
          if (customUrls[key] && !existingSources[qTag]) {
            existingSources[qTag] = customUrls[key];
          }
        });
      }
    } catch { }

    setMovieForm({
      ...movie,
      type: movie.type || 'movie',
      videoSources: existingSources,
      episodesData: isSeries ? fullEpisodes : undefined
    });
    setIsEditing(movie.id);
    setActiveSeason(1);
    setBatchMessage('');
  };

  const startNewMovie = (initialType: 'movie' | 'series' = 'movie') => {
    const isSeries = initialType === 'series';
    setMovieForm({
      title: '',
      originalTitle: '',
      type: initialType,
      year: new Date().getFullYear(),
      duration: isSeries ? '1 сезон' : '2 год',
      rating: 8.0,
      ratingVotesCount: '10K',
      ageRating: '16+',
      description: '',
      posterUrl: 'https://images.unsplash.com/photo-1542205804-2ec3513247d1?q=80&w=600&auto=format&fit=crop',
      backdropUrl: 'https://images.unsplash.com/photo-1542205804-2ec3513247d1?q=80&w=1200&auto=format&fit=crop',
      genres: isSeries ? ['Серіал', 'Драма'] : ['Екшн', 'Пригоди'],
      director: '',
      languages: ['Українська', 'Англійська'],
      subtitles: ['Українські'],
      subtitleUrl: '',
      viewsCount: 1500,
      videoUrl: '',
      videoSources: {},
      cast: [],
      episodesData: isSeries ? { 1: [] } : undefined
    });
    setIsEditing('new');
    setActiveSeason(1);
    setBatchMessage('');
  };

  const toggleUserStatus = (id: string) => {
    const updated = usersList.map(u => {
      if (u.id === id || u.email === id) {
        const nextBlocked = !u.isBlocked;
        const nextStatus = nextBlocked ? 'Заблокований' : 'Активний';
        return { ...u, isBlocked: nextBlocked, status: nextStatus };
      }
      return u;
    });
    setUsersList(updated);
    try {
      localStorage.setItem('nova_users', JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to save nova_users:', e);
    }
  };

  const deleteUser = (targetKey: string) => {
    if (!targetKey) return;
    const lowerKey = targetKey.trim().toLowerCase();

    // 1. Пошук користувача для видалення у usersList або localStorage
    const userToDelete = usersList.find(u =>
      (u.id || '').trim().toLowerCase() === lowerKey ||
      (u.email || '').trim().toLowerCase() === lowerKey ||
      (u.name || '').trim().toLowerCase() === lowerKey
    );

    const emailToDelete = (userToDelete?.email || (targetKey.includes('@') ? targetKey : '')).trim().toLowerCase();
    const idToDelete = (userToDelete?.id || targetKey).trim().toLowerCase();
    const nameToDelete = (userToDelete?.name || '').trim().toLowerCase();

    // 2. Видалення зі списку користувачів usersList
    const updated = usersList.filter(u => {
      const uId = (u.id || '').trim().toLowerCase();
      const uEmail = (u.email || '').trim().toLowerCase();
      const uName = (u.name || '').trim().toLowerCase();
      if (uId && (uId === lowerKey || uId === idToDelete)) return false;
      if (uEmail && (uEmail === lowerKey || uEmail === emailToDelete)) return false;
      if (nameToDelete && uName === nameToDelete) return false;
      return true;
    });
    setUsersList(updated);

    try {
      // 3. Збереження оновленого списку nova_users
      localStorage.setItem('nova_users', JSON.stringify(updated));

      // 4. Повне очищення облікового запису з cinemanova_accounts
      const savedAccountsStr = localStorage.getItem('cinemanova_accounts');
      if (savedAccountsStr) {
        const accounts = JSON.parse(savedAccountsStr);
        Object.keys(accounts).forEach(k => {
          const kLower = k.trim().toLowerCase();
          const acc = accounts[k];
          const accEmail = (acc?.email || '').trim().toLowerCase();
          const accId = (acc?.id || '').trim().toLowerCase();
          const accName = (acc?.name || '').trim().toLowerCase();

          if (
            kLower === lowerKey ||
            kLower === emailToDelete ||
            kLower === idToDelete ||
            accEmail === lowerKey ||
            accEmail === emailToDelete ||
            accId === lowerKey ||
            accId === idToDelete ||
            (nameToDelete && accName === nameToDelete)
          ) {
            delete accounts[k];
          }
        });
        localStorage.setItem('cinemanova_accounts', JSON.stringify(accounts));
      }

      // 5. Очищення кешу користувача: аватара, обраного, історії та оцінок
      if (emailToDelete) {
        localStorage.removeItem(`user_avatar_${emailToDelete}`);
        localStorage.removeItem(`user_favs_${emailToDelete}`);
        localStorage.removeItem(`user_history_${emailToDelete}`);
        localStorage.removeItem(`user_ratings_${emailToDelete}`);
      }
      if (idToDelete) {
        localStorage.removeItem(`user_avatar_${idToDelete}`);
        localStorage.removeItem(`user_favs_${idToDelete}`);
        localStorage.removeItem(`user_history_${idToDelete}`);
        localStorage.removeItem(`user_ratings_${idToDelete}`);
      }

      // 6. Фіксація у cinemanova_deleted_emails для запобігання відновленню шаблонними даними
      const deletedListStr = localStorage.getItem('cinemanova_deleted_emails');
      let deletedList: string[] = deletedListStr ? JSON.parse(deletedListStr) : [];
      if (!Array.isArray(deletedList)) deletedList = [];
      if (emailToDelete && !deletedList.includes(emailToDelete)) deletedList.push(emailToDelete);
      if (idToDelete && !deletedList.includes(idToDelete)) deletedList.push(idToDelete);
      if (lowerKey && !deletedList.includes(lowerKey)) deletedList.push(lowerKey);
      localStorage.setItem('cinemanova_deleted_emails', JSON.stringify(deletedList));

      // 7. Перевірка чи видалений користувач активний, та анулювання поточної сесії
      const activeUserStr = localStorage.getItem('active_user') || localStorage.getItem('cinemanova_user');
      if (activeUserStr) {
        try {
          const active = JSON.parse(activeUserStr);
          const activeEmail = (active.email || '').trim().toLowerCase();
          const activeId = (active.id || '').trim().toLowerCase();
          if (activeEmail === emailToDelete || activeId === idToDelete || activeEmail === lowerKey) {
            localStorage.removeItem('active_user');
            localStorage.removeItem('cinemanova_user');
          }
        } catch (e) { }
      }

      // 8. Розсилка події про видалення користувача
      window.dispatchEvent(new CustomEvent('cinemanova_user_deleted', {
        detail: { email: emailToDelete, id: idToDelete }
      }));
      window.dispatchEvent(new Event('storage'));
    } catch (e) {
      console.error('Failed to save nova_users after delete:', e);
    }
  };

  const filteredMovies = movies.filter(m =>
    m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.director.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8 font-sans w-full">
      {/* Верхня плашка адмін-панелі: #121212, розмиття бічних країв */}
      <div className="relative overflow-hidden bg-[#121212] rounded-2xl px-6 sm:px-8 w-full min-h-[145px] flex items-center shadow-none border-0">
        {/* Ефекти розмиття шарів ліворуч та праворуч */}
        <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-black/80 via-black/40 to-transparent layer-blur blur-[8px] z-0" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-black/80 via-black/40 to-transparent layer-blur blur-[8px] z-0" />

        <div className="relative z-10 w-full flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              {language === 'UA' ? 'Адміністративна панель' : 'Admin Panel'}
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-xl leading-relaxed">
              {language === 'UA'
                ? 'Керування мультимедійним контентом, аналітика відвідувань та інструменти адміністрування Cinema Nova'
                : 'Manage media content, view analytics, and access Cinema Nova administration tools'}
            </p>
          </div>

          {/* Кнопки навігації розділів та перемикач Демо-захисту */}
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
            {/* Тумблер Демо-режиму для захисту диплома (видимий лише адміну) */}
            <div className="flex items-center gap-2 bg-zinc-950/90 border border-zinc-800 px-3 py-1.5 rounded-full shadow-inner">
              <GraduationCap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="text-[11px] font-bold text-zinc-300 hidden sm:inline">
                {language === 'UA' ? 'Демо-захист:' : 'Demo Defense:'}
              </span>
              <button
                type="button"
                onClick={() => {
                  const next = !isDemoFallbackActive;
                  setIsDemoFallbackActive(next);
                  localStorage.setItem('nova_demo_fallback_active', String(next));
                  fetch('/api/system/demo-mode', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ active: next })
                  }).catch(() => { });
                }}
                className={`px-3 py-1 text-[11px] font-bold rounded-full transition-all cursor-pointer flex items-center gap-1.5 ${isDemoFallbackActive
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/60'
                    : 'bg-zinc-800 text-zinc-400 hover:text-white'
                  }`}
                title={language === 'UA' ? 'Fallback-відео (1080p, 720p, 480p) для всіх карток без файлу' : 'Fallback video for empty cards'}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${isDemoFallbackActive ? 'bg-white animate-pulse' : 'bg-zinc-500'}`} />
                <span>{isDemoFallbackActive ? (language === 'UA' ? 'Увімкнено' : 'Active') : (language === 'UA' ? 'Вимкнено' : 'Off')}</span>
              </button>
            </div>

            {[
              { id: 'analytics', label: language === 'UA' ? 'Аналітика' : 'Analytics' },
              { id: 'content', label: language === 'UA' ? 'Каталог' : 'Catalog' },
              { id: 'categories', label: language === 'UA' ? 'Категорії' : 'Categories' },
              { id: 'users', label: language === 'UA' ? 'Користувачі' : 'Users' },
              { id: 'reports', label: language === 'UA' ? 'Звернення' : 'Reports' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveSubTab(tab.id as any);
                  setIsEditing(null);
                }}
                className={`px-5 sm:px-6 py-2 rounded-full text-xs sm:text-sm font-medium transition-all duration-200 cursor-pointer border border-white ${activeSubTab === tab.id
                  ? 'bg-white/10 text-white shadow-[0_0_12px_rgba(255,255,255,0.15)] font-semibold'
                  : 'text-zinc-200 hover:text-white hover:bg-white/5 bg-transparent'
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Вміст вкладки "Аналітика" */}
      {activeSubTab === 'analytics' && (
        <div className="space-y-10 pt-2 px-1">
          {/* Рядок ключових метрик платформи (4 стовпці) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
            <div className="space-y-1.5">
              <span className="text-xs text-zinc-300 block font-normal">
                {language === 'UA' ? 'Загальні перегляди' : 'Total Views'}
              </span>
              <h3 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                22 163 713
              </h3>
              <span className="text-xs font-normal block" style={{ color: '#F22E3D' }}>
                {language === 'UA' ? '+12,4% проти минулого місяця' : '+12.4% vs last month'}
              </span>
            </div>

            <div className="space-y-1.5">
              <span className="text-xs text-zinc-300 block font-normal">
                {language === 'UA' ? 'Годин перегляду' : 'Watch Hours'}
              </span>
              <h3 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                1 243 500
              </h3>
              <span className="text-xs font-normal block" style={{ color: '#F22E3D' }}>
                {language === 'UA' ? '+8.1% проти минулого місяця' : '+8.1% vs last month'}
              </span>
            </div>

            <div className="space-y-1.5">
              <span className="text-xs text-zinc-300 block font-normal">
                {language === 'UA' ? 'Вечірок Watch Party' : 'Active Watch Parties'}
              </span>
              <h3 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                12
              </h3>
              <span className="text-xs font-normal block" style={{ color: '#F22E3D' }}>
                {language === 'UA' ? '+4 сесії проти минулого місяця' : '+4 sessions vs last month'}
              </span>
            </div>

            <div className="space-y-1.5">
              <span className="text-xs text-zinc-300 block font-normal">
                {language === 'UA' ? 'Виручка за червень' : 'Revenue (June)'}
              </span>
              <h3 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                $54,320
              </h3>
              <span className="text-xs font-normal block" style={{ color: '#F22E3D' }}>
                {language === 'UA' ? '+15.2% проти минулого місяця' : '+15.2% vs last month'}
              </span>
            </div>
          </div>

          {/* Графік динаміки переглядів */}
          <div className="space-y-4 pt-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <div>
                <div className="flex flex-wrap items-baseline gap-3">
                  <h4 className="text-lg sm:text-xl font-bold text-white">
                    {language === 'UA' ? 'Динаміка переглядів (вересень/червень)' : 'Viewing Dynamics (September/June)'}
                  </h4>
                  <span className="text-xs text-zinc-400 font-normal">
                    {language === 'UA' ? 'Пік: 27.5K переглядів/день' : 'Peak: 27.5K views/day'}
                  </span>
                </div>
                <p className="text-xs text-zinc-400 mt-1">
                  {language === 'UA' ? 'Кількість унікальних сесій за останні 7 днів.' : 'Number of unique sessions in the last 7 days.'}
                </p>
              </div>
            </div>

            {/* Стовпчикова діаграма переглядів */}
            <div className="pt-6 pb-2">
              <div className="flex items-end gap-5 sm:gap-7 h-56 sm:h-64 max-w-2xl">
                {[
                  { date: '13Чер', height: 18, val: '12 400' },
                  { date: '14Чер', height: 42, val: '14 500' },
                  { date: '15Чер', height: 32, val: '16 800' },
                  { date: '16Чер', height: 95, val: '27 500' },
                  { date: '17Чер', height: 75, val: '19 800' },
                  { date: '18Чер', height: 60, val: '24 200' },
                  { date: '19Чер', height: 50, val: '15 100' }
                ].map((item, idx) => (
                  <div key={idx} className="flex flex-col items-center gap-2.5 group">
                    <div className="relative w-3.5 sm:w-4 flex items-end justify-center h-48 sm:h-52">
                      <span className="absolute -top-7 bg-zinc-900 text-white text-[10px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap border border-zinc-800">
                        {item.val}
                      </span>
                      <div
                        className="w-full rounded-t-sm transition-all duration-300 hover:brightness-125"
                        style={{ height: `${item.height}%`, backgroundColor: '#F22E3D' }}
                      />
                    </div>
                    <span className="text-xs text-zinc-300 font-normal whitespace-nowrap">
                      {item.date}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Секція популярності за жанрами */}
          <div className="space-y-4 pt-4 max-w-md">
            <div>
              <h4 className="text-lg sm:text-xl font-bold text-white">
                {language === 'UA' ? 'Популярність між жанрами' : 'Genre Popularity'}
              </h4>
              <p className="text-xs text-zinc-400 mt-1">
                {language === 'UA' ? 'Розподіл інтересів аудиторії Cinema Nova' : 'Audience interest distribution on Cinema Nova'}
              </p>
            </div>

            <div className="space-y-3.5 pt-2">
              {[
                { genre: language === 'UA' ? 'Фантастика' : 'Sci-Fi', percentage: 31 },
                { genre: language === 'UA' ? 'Бойовик' : 'Action', percentage: 25 },
                { genre: language === 'UA' ? 'Детектив' : 'Mystery', percentage: 22 },
                { genre: language === 'UA' ? 'Драма' : 'Drama', percentage: 15 },
                { genre: language === 'UA' ? 'Інші' : 'Others', percentage: 7 }
              ].map((item, i) => (
                <div key={i} className="space-y-1.5 text-xs">
                  <div className="flex items-center justify-between text-zinc-300 font-normal">
                    <span>{item.genre}</span>
                    <span className="text-zinc-300">{item.percentage}%</span>
                  </div>
                  <div className="w-full bg-[#1A1A1A] h-1.5 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${item.percentage}%`, backgroundColor: '#F22E3D' }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Керування каталогом контенту */}
      {activeSubTab === 'content' && (
        <div className="space-y-6">
          {isEditing ? (
            <div className="bg-[#151515] border border-zinc-900 rounded-2xl p-5 md:p-8">
              <div className="flex items-center justify-between pb-4 border-b border-zinc-950 mb-6">
                <h3 className="font-display font-black text-md text-white uppercase tracking-wider flex items-center gap-2">
                  <FileEdit className="w-5 h-5 text-[#E50914]" />
                  {isEditing === 'new'
                    ? (language === 'UA' ? 'Додати Нову Позицію Контенту' : 'Add New Content Entry')
                    : `${language === 'UA' ? 'Редагування' : 'Editing'}: ${movieForm.title}`}
                </h3>
                <button
                  onClick={() => setIsEditing(null)}
                  className="p-1 text-zinc-500 hover:text-white rounded-full bg-zinc-900 border border-zinc-900 hover:border-zinc-700 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveMovie} className="space-y-5 font-sans text-xs">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div className="space-y-1">
                    <label className="text-zinc-400 font-bold block text-[10px] uppercase">
                      {language === 'UA' ? 'НАЗВА КОНТЕНТУ (УКРАЇНСЬКОЮ)' : 'CONTENT TITLE (UKRAINIAN)'}
                    </label>
                    <input
                      type="text"
                      value={movieForm.title}
                      onChange={(e) => setMovieForm({ ...movieForm, title: e.target.value })}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-white"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-zinc-400 font-bold block text-[10px] uppercase">
                      {language === 'UA' ? 'ОРИГІНАЛЬНА НАЗВА' : 'ORIGINAL TITLE'}
                    </label>
                    <input
                      type="text"
                      value={movieForm.originalTitle || ''}
                      onChange={(e) => setMovieForm({ ...movieForm, originalTitle: e.target.value })}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-zinc-400 font-bold block text-[10px] uppercase">
                      {language === 'UA' ? 'ТИП КОНТЕНТУ' : 'CONTENT TYPE'}
                    </label>
                    <select
                      value={movieForm.type || 'movie'}
                      onChange={(e) => {
                        const newType = e.target.value as 'movie' | 'series';
                        setMovieForm(prev => ({
                          ...prev,
                          type: newType,
                          duration: newType === 'series'
                            ? (prev.duration && prev.duration.includes('сезон') ? prev.duration : '1 сезон')
                            : (prev.duration && prev.duration.includes('сезон') ? '2 год' : (prev.duration || '2 год')),
                          episodesData: newType === 'movie' ? undefined : (prev.episodesData && Object.keys(prev.episodesData).length > 0 ? prev.episodesData : { 1: [] })
                        }));
                      }}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-white cursor-pointer"
                    >
                      <option value="movie">{language === 'UA' ? 'Фільм (Повнометражний)' : 'Movie (Feature Film)'}</option>
                      <option value="series">{language === 'UA' ? 'Серіал / Аніме / Дорама' : 'Series / Anime / Dorama'}</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <label className="text-zinc-400 font-bold block text-[10px] uppercase">
                      {language === 'UA' ? 'Рік випуску' : 'Release Year'}
                    </label>
                    <input
                      type="number"
                      value={movieForm.year}
                      onChange={(e) => setMovieForm({ ...movieForm, year: Number(e.target.value) })}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-zinc-400 font-bold block text-[10px] uppercase">
                      {language === 'UA' ? 'Рейтинг' : 'Rating'}
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="1"
                      max="10"
                      value={movieForm.rating}
                      onChange={(e) => setMovieForm({ ...movieForm, rating: Number(e.target.value) })}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-zinc-400 font-bold block text-[10px] uppercase">
                      {language === 'UA' ? 'Вік' : 'Age'}
                    </label>
                    <select
                      value={movieForm.ageRating}
                      onChange={(e) => setMovieForm({ ...movieForm, ageRating: e.target.value })}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-white"
                    >
                      <option value="0+">0+</option>
                      <option value="12+">12+</option>
                      <option value="16+">16+</option>
                      <option value="18+">18+</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-zinc-400 font-bold block text-[10px] uppercase">
                      {language === 'UA' ? 'Тривалість' : 'Duration'}
                    </label>
                    <input
                      type="text"
                      value={movieForm.duration}
                      onChange={(e) => setMovieForm({ ...movieForm, duration: e.target.value })}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-1">
                    <label className="text-zinc-400 font-bold block text-[10px] uppercase">
                      {language === 'UA' ? 'Режисер' : 'Director'}
                    </label>
                    <input
                      type="text"
                      value={movieForm.director}
                      onChange={(e) => setMovieForm({ ...movieForm, director: e.target.value })}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-white"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-zinc-400 font-bold block text-[10px] uppercase">
                        {language === 'UA' ? 'Відео посилання / Файл' : 'Video URL / File'}
                      </label>
                      {movieForm.videoUrl && (movieForm.videoUrl.includes('/uploads/') || movieForm.videoUrl.includes('/videos/')) && (
                        <button
                          type="button"
                          onClick={() => handleSyncToMinio('main', movieForm.videoUrl)}
                          disabled={syncingMinioKey === 'main'}
                          className="px-2 py-0.5 bg-sky-950/70 hover:bg-sky-900 border border-sky-600/50 text-sky-300 hover:text-white rounded text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all"
                        >
                          {syncingMinioKey === 'main' ? (
                            <>
                              <Loader2 className="w-2.5 h-2.5 animate-spin text-sky-400" />
                              <span>{language === 'UA' ? 'Вивантаження...' : 'Uploading...'}</span>
                            </>
                          ) : minioSyncedKeys['main'] || movieForm.videoUrl.startsWith('/videos/') ? (
                            <>
                              <Check className="w-2.5 h-2.5 text-emerald-400" />
                              <span className="text-emerald-300">{language === 'UA' ? '✓ У MinIO' : '✓ In MinIO'}</span>
                            </>
                          ) : (
                            <>
                              <CloudUpload className="w-2.5 h-2.5 text-sky-400" />
                              <span>{language === 'UA' ? '☁️ Відправити у MinIO' : '☁️ Send to MinIO'}</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                    <input
                      type="text"
                      value={movieForm.videoUrl}
                      onChange={(e) => setMovieForm({ ...movieForm, videoUrl: e.target.value })}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-white font-mono text-[11px]"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-zinc-400 font-bold block text-[10px] uppercase">
                      {language === 'UA' ? 'Субтитри (файл .vtt, .srt або URL)' : 'Subtitles (.vtt, .srt or URL)'}
                    </label>
                    {movieForm.subtitleUrl && (
                      <span className="text-[10px] text-emerald-400 font-mono font-bold flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        {language === 'UA' ? 'Субтитри підключено' : 'Subtitles connected'}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={movieForm.subtitleUrl || ''}
                      onChange={(e) => setMovieForm({ ...movieForm, subtitleUrl: e.target.value })}
                      placeholder="/subtitles/movie_sub.vtt або URL..."
                      className="flex-1 bg-zinc-900 border border-zinc-800 focus:border-amber-400/80 rounded-xl p-2.5 text-white font-mono text-[11px] focus:outline-none transition-colors"
                    />

                    <input
                      type="file"
                      ref={movieSubtitleInputRef}
                      accept=".vtt,.srt,.txt,.sub,.ass"
                      className="hidden"
                      onChange={handleMovieSubtitleUpload}
                    />

                    <button
                      type="button"
                      onClick={() => movieSubtitleInputRef.current?.click()}
                      disabled={uploadingSubtitle}
                      className="px-3.5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl border border-zinc-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition shrink-0 disabled:opacity-50"
                      title={language === 'UA' ? 'Завантажити файл субтитрів (.vtt, .srt)' : 'Upload subtitle file (.vtt, .srt)'}
                    >
                      {uploadingSubtitle ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                      ) : (
                        <FileText className="w-3.5 h-3.5 text-amber-400" />
                      )}
                      <span>{uploadingSubtitle ? (language === 'UA' ? 'Завантаження...' : 'Uploading...') : (language === 'UA' ? 'Файл субтитрів' : 'Subtitle File')}</span>
                    </button>

                    {movieForm.subtitleUrl && (
                      <button
                        type="button"
                        onClick={() => setMovieForm({ ...movieForm, subtitleUrl: '' })}
                        className="p-2.5 text-zinc-500 hover:text-red-400 bg-zinc-900 hover:bg-red-950/40 rounded-xl border border-zinc-800 transition cursor-pointer shrink-0"
                        title={language === 'UA' ? 'Очистити субтитри' : 'Clear subtitles'}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* СЕКЦІЯ ГОТОВИХ СКОНВЕРТОВАНИХ ЯКОСТЕЙ ТА ПРЯМИХ СТРІМІВ */}
                <div className="p-5 bg-gradient-to-b from-zinc-950 via-[#121212] to-zinc-950 border border-zinc-800 rounded-2xl space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 pb-3">
                    <div className="flex items-center gap-2.5 text-white font-extrabold text-sm">
                      <div className="p-2 bg-amber-950/80 border border-amber-800/60 rounded-xl text-amber-400">
                        <Sparkles className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span>{language === 'UA' ? 'Готові сконвертовані якості відео (4K, 1080p, 720p, 480p)' : 'Pre-converted Video Qualities (4K, 1080p, 720p, 480p)'}</span>
                        </div>
                        <p className="text-[11px] text-zinc-400 font-normal">
                          {language === 'UA'
                            ? 'Вкажіть готові файли на сервері або завантажте окремо. Програвач миттєво відкриє вибір якостей без запуску FFmpeg!'
                            : 'Specify files on server or upload directly. Player will immediately support quality switching without FFmpeg!'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] bg-emerald-950/80 border border-emerald-800/60 text-emerald-400 font-mono font-bold px-2.5 py-1 rounded-lg flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        {language === 'UA' ? 'Миттєве відтворення' : 'Instant playback'}
                      </span>
                    </div>
                  </div>

                  {uploadingQuality && (
                    <div className="p-3 bg-amber-950/50 border border-amber-600/50 rounded-xl flex items-center justify-between text-xs font-mono text-amber-300">
                      <span className="flex items-center gap-2 font-bold">
                        <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                        {language === 'UA' ? `Завантаження файлу для якості ${uploadingQuality}...` : `Uploading ${uploadingQuality} file...`}
                      </span>
                      <span className="font-extrabold text-white">{qualityUploadProgress}%</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {[
                      { key: '4K', label: '4K Ultra HD (2160p)', badgeColor: 'bg-amber-500 text-black', placeholder: '/uploads/videos/movie_4k.mp4 або URL...' },
                      { key: '1080p', label: '1080p Full HD (Основна)', badgeColor: 'bg-emerald-500 text-black', placeholder: '/uploads/videos/movie_1080p.mp4...' },
                      { key: '720p', label: '720p HD', badgeColor: 'bg-blue-500 text-white', placeholder: '/uploads/videos/movie_720p.mp4...' },
                      { key: '480p', label: '480p SD (Швидка)', badgeColor: 'bg-zinc-700 text-zinc-200', placeholder: '/uploads/videos/movie_480p.mp4...' },
                      { key: 'hls', label: 'HLS Live Stream (.m3u8)', badgeColor: 'bg-purple-600 text-white', placeholder: 'https://cdn.example.com/master.m3u8...' },
                    ].map(q => {
                      const currentVal = movieForm.videoSources?.[q.key] || (q.key === 'hls' ? (movieForm.videoUrl?.endsWith('.m3u8') ? movieForm.videoUrl : '') : '');
                      const fileInputId = `quality-file-input-${q.key}`;

                      return (
                        <div key={`quality-row-${q.key}`} className="p-3 bg-zinc-900/90 border border-zinc-800/90 rounded-xl space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className={`text-[10px] font-black px-2 py-0.5 rounded-md font-mono ${q.badgeColor}`}>
                                {q.key}
                              </span>
                              <span className="text-[11px] font-bold text-zinc-300">
                                {q.label}
                              </span>
                            </div>
                            {currentVal ? (
                              <span className="text-[10px] text-emerald-400 font-mono font-bold flex items-center gap-1">
                                <Check className="w-3 h-3" />
                                {language === 'UA' ? 'Підключено' : 'Active'}
                              </span>
                            ) : (
                              <span className="text-[10px] text-zinc-400 font-mono">
                                {language === 'UA' ? 'Не вказано' : 'Not set'}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={currentVal}
                              onChange={(e) => handleQualityUrlChange(q.key, e.target.value)}
                              placeholder={q.placeholder}
                              className="flex-1 bg-zinc-950 border border-zinc-800 focus:border-amber-400/80 rounded-lg px-2.5 py-1.5 text-zinc-200 font-mono text-[11px] focus:outline-none transition-colors"
                            />

                            <input
                              id={fileInputId}
                              type="file"
                              accept="video/*,.mp4,.mkv,.avi,.webm,.mov,.m3u8"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleQualityFileUpload(q.key, file);
                              }}
                            />

                            <button
                              type="button"
                              onClick={() => document.getElementById(fileInputId)?.click()}
                              disabled={Boolean(uploadingQuality)}
                              className="px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white rounded-lg border border-zinc-700 text-[10px] font-bold flex items-center gap-1.5 cursor-pointer transition-all shrink-0 disabled:opacity-50"
                              title={language === 'UA' ? `Завантажити файл для якості ${q.key}` : `Upload file for ${q.key}`}
                            >
                              <Upload className="w-3 h-3 text-amber-400" />
                              <span>{language === 'UA' ? 'Файл' : 'File'}</span>
                            </button>

                            {currentVal && (
                              <button
                                type="button"
                                onClick={() => handleQualityUrlChange(q.key, '')}
                                className="p-1.5 text-zinc-500 hover:text-red-400 bg-zinc-950 hover:bg-red-950/40 rounded-lg border border-zinc-800 transition cursor-pointer shrink-0"
                                title={language === 'UA' ? 'Очистити' : 'Clear'}
                              >
                                <X className="w-3 h-3" />
                              </button>
                            )}
                          </div>

                          {currentVal && (currentVal.includes('/uploads/') || currentVal.includes('/videos/')) && (
                            <div className="pt-1">
                              <button
                                type="button"
                                onClick={() => handleSyncToMinio(q.key, currentVal)}
                                disabled={syncingMinioKey === q.key}
                                className="px-2.5 py-1 bg-sky-950/70 hover:bg-sky-900/80 border border-sky-600/50 text-sky-300 hover:text-white rounded-lg text-[10px] font-bold flex items-center gap-1.5 cursor-pointer transition-all"
                              >
                                {syncingMinioKey === q.key ? (
                                  <>
                                    <Loader2 className="w-3 h-3 animate-spin text-sky-400" />
                                    <span>{language === 'UA' ? 'Вивантаження...' : 'Uploading...'}</span>
                                  </>
                                ) : (minioSyncedKeys[q.key] || currentVal.startsWith('/videos/')) ? (
                                  <>
                                    <Check className="w-3 h-3 text-emerald-400" />
                                    <span className="text-emerald-300">{language === 'UA' ? '✓ У MinIO' : '✓ In MinIO'}</span>
                                  </>
                                ) : (
                                  <>
                                    <CloudUpload className="w-3 h-3 text-sky-400" />
                                    <span>{language === 'UA' ? '☁️ Відправити цей файл у MinIO' : '☁️ Send to MinIO'}</span>
                                  </>
                                )}
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* ЄДИНА ЗОНА ЗАВАНТАЖЕННЯ ВІДЕО, СЕЗОНІВ ТА АВТОМАТИЗАЦІЇ СЕРВЕРА */}
                <div className="p-5 bg-gradient-to-b from-zinc-950 via-[#121212] to-zinc-950 border border-zinc-800 rounded-2xl space-y-5">
                  {/* Панель заголовка завантажувача */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 pb-3">
                    <div className="flex items-center gap-2.5 text-white font-extrabold text-sm">
                      <div className="p-2 bg-red-950/80 border border-red-800/60 rounded-xl text-[#E50914]">
                        <Video className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span>{language === 'UA' ? 'Завантаження Відео, Сезонів та Серверна Автоматизація' : 'Video Upload, Seasons & Server Automation'}</span>
                        </div>
                        <p className="text-[11px] text-zinc-400 font-normal">
                          {language === 'UA' ? 'Об’єднаний імпорт відео/папок S1-S2, FFmpeg transcoder та Whisper.cpp' : 'Unified video/folder S1-S2 import, FFmpeg transcoder & Whisper.cpp'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] bg-red-950/80 border border-red-800/60 text-red-400 font-mono font-bold px-2.5 py-1 rounded-lg flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-amber-400" />
                        {language === 'UA' ? 'Авто-розпізнавання s1e1...s1e24' : 'Auto-detect S1E1...S1E24'}
                      </span>
                    </div>
                  </div>

                  {/* ВІЗУАЛЬНИЙ ІНДИКАТОР ПРОГРЕСУ ТА СТАТУС КОНВЕЄРА ОБРОБКИ */}
                  {(isUploadingVideo || isWhisperProcessing || isConvertingQualities || movieForm.conversionStatus === 'completed' || movieForm.whisperSubtitles?.length) && (
                    <div className="p-3 bg-zinc-900/90 border border-zinc-800 rounded-xl space-y-2.5 animate-in fade-in duration-200">
                      <div className="flex items-center justify-between text-xs font-bold">
                        <div className="flex items-center gap-2">
                          <Activity className="w-4 h-4 text-[#E50914] animate-pulse shrink-0" />
                          <span className="text-white uppercase tracking-wider font-mono text-[11px] truncate">
                            {isUploadingVideo
                              ? `1/3. Завантаження відеофайлу (${uploadProgress}%)`
                              : isWhisperProcessing
                                ? '2/3. Whisper.cpp Транскрипція & VTT Субтитри'
                                : isConvertingQualities
                                  ? `3/3. FFmpeg Конвертація: ${conversionStatusMsg || 'Обробка 4K, 1080p, 720p, 480p'}`
                                  : '✅ Обробку відео та субтитрів завершено'}
                          </span>
                        </div>
                        <span className="text-amber-400 font-mono font-black text-xs shrink-0">
                          {isUploadingVideo
                            ? `${Math.round(uploadProgress * 0.33)}%`
                            : isWhisperProcessing
                              ? '55%'
                              : isConvertingQualities
                                ? `${conversionProgressPercent > 0 ? conversionProgressPercent : 88}%`
                                : '100%'}
                        </span>
                      </div>

                      {/* Анімована смуга прогресу */}
                      <div className="w-full bg-zinc-950 rounded-full h-2.5 overflow-hidden border border-zinc-800 relative">
                        <div
                          className="h-full bg-gradient-to-r from-red-600 via-amber-500 to-emerald-500 transition-all duration-300 rounded-full shadow-lg relative"
                          style={{
                            width: isUploadingVideo
                              ? `${Math.max(4, uploadProgress * 0.33)}%`
                              : isWhisperProcessing
                                ? '55%'
                                : isConvertingQualities
                                  ? `${Math.max(5, conversionProgressPercent)}%`
                                  : '100%'
                          }}
                        >
                          <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.2)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.2)_50%,rgba(255,255,255,0.2)_75%,transparent_75%,transparent)] bg-[length:16px_16px] animate-[move-bg_1s_linear_infinite]"></div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Бейджі статусу автоматизації сервера */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[10px] font-mono">
                    <div className={`p-2 rounded-xl border flex items-center justify-between ${movieForm.videoUrl ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-400' : 'bg-zinc-900 border-zinc-800 text-zinc-500'}`}>
                      <span className="flex items-center gap-1.5 font-bold">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        {language === 'UA' ? 'Відео джерело:' : 'Video source:'}
                      </span>
                      <span className="truncate max-w-[110px] font-bold">{movieForm.videoUrl ? 'Готово' : 'Не обрано'}</span>
                    </div>

                    <div className={`p-2 rounded-xl border flex items-center justify-between ${movieForm.whisperSubtitles ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-400' : isWhisperProcessing ? 'bg-amber-950/40 border-amber-800/60 text-amber-400 animate-pulse' : 'bg-zinc-900 border-zinc-800 text-zinc-500'}`}>
                      <span className="flex items-center gap-1.5 font-bold">
                        <Cpu className="w-3.5 h-3.5 text-blue-400" />
                        Whisper.cpp:
                      </span>
                      <span className="font-bold">{movieForm.whisperSubtitles ? 'Готово (100%)' : isWhisperProcessing ? 'Обробка...' : 'Очікує'}</span>
                    </div>

                    <div className={`p-2 rounded-xl border flex items-center justify-between ${movieForm.qualities?.length ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-400' : isConvertingQualities ? 'bg-red-950/40 border-red-800/60 text-red-400 animate-pulse' : 'bg-zinc-900 border-zinc-800 text-zinc-500'}`}>
                      <span className="flex items-center gap-1.5 font-bold">
                        <FileVideo className="w-3.5 h-3.5 text-red-400" />
                        FFmpeg AAC:
                      </span>
                      <span className="font-bold">{movieForm.qualities?.length ? '4K/1080p/720p' : isConvertingQualities ? 'Перекодування...' : 'Стандарт'}</span>
                    </div>
                  </div>

                  {/* Панель вибору озвучення для завантаження */}
                  <div className="p-3.5 bg-zinc-900/90 border border-amber-500/30 rounded-2xl space-y-2">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <ListVideo className="w-4 h-4 text-amber-400 shrink-0" />
                        <span className="text-xs font-black text-white">
                          {language === 'UA' ? 'Прив\'язати завантажувані серії до озвучки:' : 'Link uploaded episodes to Voiceover:'}
                        </span>
                      </div>
                      <select
                        value={uploadVoiceoverMode}
                        onChange={(e) => setUploadVoiceoverMode(e.target.value)}
                        className="w-full sm:w-auto px-3.5 py-1.5 bg-zinc-950 border border-amber-500/50 hover:border-amber-400 rounded-xl text-xs font-bold text-amber-300 focus:outline-none transition-colors cursor-pointer"
                      >
                        <option value="auto">✨ {language === 'UA' ? 'Авто-визначення з назви файлу (напр. [Amanogawa], [HDrezka])' : 'Auto-detect from filename (e.g. [Amanogawa])'}</option>
                        <option value="all">🌐 {language === 'UA' ? 'Всі озвучки (За замовчуванням)' : 'All Voiceovers (Default)'}</option>
                        <optgroup label={language === 'UA' ? 'Аніме Озвучки (Українські)' : 'Anime Voiceovers (UA)'}>
                          <option value="Amanogawa (Багатоголосий)">Amanogawa (Багатоголосий)</option>
                          <option value="Koyomi (Багатоголосий)">Koyomi (Багатоголосий)</option>
                          <option value="SBT Localization (Дубляж)">SBT Localization (Дубляж)</option>
                          <option value="Далі Буде! (Багатоголосий)">Далі Буде! (Багатоголосий)</option>
                          <option value="FanVoxUA (Двоголосий)">FanVoxUA (Двоголосий)</option>
                          <option value="Original (Japanese + Субтитри)">Original (Japanese + Субтитри)</option>
                        </optgroup>
                        <optgroup label={language === 'UA' ? 'Серіали & Фільми' : 'TV Shows & Movies'}>
                          <option value="Cinema UA (Дубляж / Офіційний)">Cinema UA (Дубляж / Офіційний)</option>
                          <option value="DniproFilm (Багатоголосий)">DniproFilm (Багатоголосий)</option>
                          <option value="HDrezka Studio (Багатоголосий)">HDrezka Studio (Багатоголосий)</option>
                          <option value="Original Audio (English)">Original Audio (English)</option>
                        </optgroup>
                      </select>
                    </div>

                    <p className="text-[11px] text-zinc-400 leading-normal">
                      {language === 'UA'
                        ? '💡 Підказка: При назвах файлів виду "Grand Blue S01E03 [1080p] [Amanogawa]", режим "Авто-визначення" автоматично виявить студію [Amanogawa] та прив\'яже її до серій без перезапису інших озвучок!'
                        : '💡 Tip: For filenames like "Grand Blue S01E03 [1080p] [Amanogawa]", "Auto-detect" automatically detects [Amanogawa] studio and links it specifically to those episodes!'}
                    </p>
                  </div>

                  {/* Інтерактивна зона завантаження файлів (Dropzone) */}
                  <div
                    onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                        if (e.dataTransfer.files.length === 1 && !e.dataTransfer.files[0].webkitRelativePath) {
                          const fakeEvent = { target: { files: e.dataTransfer.files } } as any;
                          handleVideoFileUpload(fakeEvent);
                        } else {
                          handleBatchEpisodeFilesUpload(e.dataTransfer.files);
                        }
                      }
                    }}
                    className="relative border-2 border-dashed border-red-900/40 hover:border-[#E50914] bg-zinc-900/50 hover:bg-zinc-900/80 rounded-2xl p-6 text-center transition-all group"
                  >
                    <input
                      type="file"
                      ref={folderInputRef}
                      {...({ webkitdirectory: '', directory: '' } as any)}
                      multiple
                      accept="video/*,.mp4,.mkv,.avi,.webm,.mov"
                      onChange={(e) => e.target.files && handleBatchEpisodeFilesUpload(e.target.files)}
                      className="hidden"
                    />
                    <input
                      type="file"
                      ref={batchFilesInputRef}
                      multiple
                      accept="video/*,.mp4,.mkv,.avi,.webm,.mov"
                      onChange={(e) => e.target.files && (e.target.files.length > 1 ? handleBatchEpisodeFilesUpload(e.target.files) : handleVideoFileUpload(e as any))}
                      className="hidden"
                    />

                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="p-3.5 bg-[#E50914]/10 border border-[#E50914]/30 rounded-2xl text-[#E50914] group-hover:scale-110 transition-transform">
                        {isUploadingVideo || isBatchParsing ? (
                          <Loader2 className="w-8 h-8 animate-spin text-[#E50914]" />
                        ) : (
                          <FolderUp className="w-8 h-8" />
                        )}
                      </div>

                      <div className="space-y-1">
                        <h4 className="text-sm font-black text-white">
                          {language === 'UA' ? 'Завантажити Папку з Серіями (S1, S2 / s1e1, s1e2...) або Власний Відеофайл' : 'Upload Season Folder (S1, S2 / s1e1, s1e2...) or Single Video File'}
                        </h4>
                        <p className="text-xs text-zinc-400 max-w-xl mx-auto">
                          {language === 'UA'
                            ? 'Закиньте папку або файли. Система автоматично приєднає серії, сформує програвач, відправляє на FFmpeg 4K/1080p та генерує субтитри у Whisper.cpp!'
                            : 'Drop folder or files. Automatically connects episodes, configures player, sends to FFmpeg 4K/1080p transcoder and Whisper.cpp!'}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                        <button
                          type="button"
                          onClick={() => folderInputRef.current?.click()}
                          disabled={isBatchParsing || isUploadingVideo}
                          className="px-4 py-2.5 bg-[#E50914] hover:bg-red-700 text-white font-bold text-xs rounded-xl transition-all shadow-lg shadow-red-950/50 flex items-center gap-2 cursor-pointer"
                        >
                          <FolderPlus className="w-4 h-4" />
                          <span>{language === 'UA' ? 'Завантажити Папку (S1 / Season 1)' : 'Upload Season Folder'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => batchFilesInputRef.current?.click()}
                          disabled={isBatchParsing || isUploadingVideo}
                          className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs rounded-xl border border-zinc-700 transition-all flex items-center gap-2 cursor-pointer"
                        >
                          <Upload className="w-4 h-4 text-amber-400" />
                          <span>{language === 'UA' ? 'Завантажити Відеофайли' : 'Upload Video Files'}</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {batchMessage && (
                    <div className="p-3 bg-emerald-950/60 border border-emerald-800/80 rounded-xl text-xs text-emerald-300 font-mono flex items-center justify-between">
                      <span>{batchMessage}</span>
                      <button type="button" onClick={() => setBatchMessage('')} className="p-1 hover:text-white">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {/* Перемикач апаратного рушія візуалізації та кодування */}
                  <div className="flex flex-col gap-2 p-3 bg-zinc-900/90 border border-zinc-800 rounded-xl">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-xs font-bold text-zinc-300">
                        <Cpu className="w-4 h-4 text-amber-400 shrink-0" />
                        <span>{language === 'UA' ? 'Двигун Рендеру (FFmpeg Transcoder):' : 'Render Engine (FFmpeg Transcoder):'}</span>
                        <span className="text-[10px] text-zinc-400 font-mono">
                          ({renderMode === 'cpu' ? 'x264 CPU' : renderMode === 'gpu' ? 'NVIDIA NVENC / GPU' : 'Auto Hardware'})
                        </span>
                      </div>

                      <div className="flex items-center bg-zinc-950 p-1 rounded-xl border border-zinc-800/80 text-xs font-bold w-full sm:w-auto justify-stretch sm:justify-end">
                        <button
                          type="button"
                          onClick={() => setRenderMode('cpu')}
                          className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${renderMode === 'cpu'
                            ? 'bg-red-600 text-white shadow-md font-extrabold'
                            : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
                            }`}
                        >
                          <Cpu className="w-3.5 h-3.5" />
                          <span>{language === 'UA' ? '💻 ЦП (CPU)' : '💻 CPU'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setRenderMode('gpu')}
                          className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${renderMode === 'gpu'
                            ? 'bg-amber-500 text-black shadow-md font-black'
                            : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
                            }`}
                        >
                          <Zap className="w-3.5 h-3.5" />
                          <span>{language === 'UA' ? '🚀 ГПУ (GPU)' : '🚀 GPU'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setRenderMode('auto')}
                          className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${renderMode === 'auto'
                            ? 'bg-emerald-600 text-white shadow-md font-extrabold'
                            : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
                            }`}
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>{language === 'UA' ? '⚡ Авто (Auto)' : '⚡ Auto'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Бейдж активного статусу обладнання (GPU/CPU) */}
                    {gpuHardwareInfo && (
                      <div className="flex flex-col gap-1 px-2.5 py-1.5 bg-zinc-950/80 border border-zinc-800/60 rounded-lg text-[11px] font-mono">
                        <div className="flex items-center justify-between gap-2 text-zinc-400">
                          <div className="flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full ${gpuHardwareInfo.available ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                            <span>{language === 'UA' ? 'Статус Апаратного Прискорювача:' : 'Hardware Acceleration Status:'}</span>
                            <strong className={gpuHardwareInfo.available ? 'text-emerald-400 font-bold' : 'text-amber-400 font-medium'}>
                              {gpuHardwareInfo.details}
                            </strong>
                          </div>
                        </div>
                        {!gpuHardwareInfo.available && (
                          <p className="text-[10px] text-zinc-400 leading-normal pt-1 border-t border-zinc-800/50 mt-1">
                            {language === 'UA'
                              ? 'ℹ️ Пояснення: Ваш ПК дійсно має потужну RTX 4060, але сервер веб-застосунку виконується у хмарному ізольованому Linux-контейнері (Cloud Sandbox). Хмарне середовище не має доступу до фізичного GPU вашого комп\'ютера (libcuda.so.1), тому FFmpeg здійснює рендеринг через високопродуктивний багатопотоковий CPU (libx264).'
                              : 'ℹ️ Note: Your local PC has an RTX 4060, but the app server runs inside a Cloud Linux sandbox container. Since the cloud container cannot access your local PC graphics hardware directly (libcuda.so.1), FFmpeg uses optimized multi-threaded CPU rendering (libx264).'}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Індикатор активного кодування відео в реальному часі */}
                  {isConvertingQualities && (
                    <div className="p-3 bg-zinc-950/90 border border-amber-500/40 rounded-xl space-y-1.5 animate-in fade-in">
                      <div className="flex items-center justify-between text-xs font-mono font-bold">
                        <span className="text-amber-400 flex items-center gap-1.5">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          {conversionStatusMsg || (language === 'UA' ? 'FFmpeg Перекодування у 4K, 1080p, 720p, 480p...' : 'FFmpeg Transcoding...')}
                        </span>
                        <span className="text-white font-extrabold">{conversionProgressPercent}%</span>
                      </div>
                      <div className="w-full bg-zinc-900 rounded-full h-2 overflow-hidden border border-zinc-800">
                        <div
                          className="h-full bg-gradient-to-r from-amber-500 via-red-500 to-emerald-500 transition-all duration-300 rounded-full relative"
                          style={{ width: `${Math.max(3, conversionProgressPercent)}%` }}
                        >
                          <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.2)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.2)_50%,rgba(255,255,255,0.2)_75%,transparent_75%,transparent)] bg-[length:16px_16px] animate-[move-bg_1s_linear_infinite]" />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Кнопки запуску конвертації та транскрипції Whisper */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <button
                        type="button"
                        onClick={handleConvert4QualityVideos}
                        disabled={isConvertingQualities || !movieForm.videoUrl}
                        className="w-full py-2.5 px-4 bg-gradient-to-r from-red-950 via-zinc-900 to-zinc-900 hover:from-[#E50914] hover:to-red-800 text-white font-extrabold text-xs rounded-xl border border-red-900/50 hover:border-[#E50914] transition-all flex items-center justify-center gap-2 shadow cursor-pointer disabled:opacity-50"
                      >
                        {isConvertingQualities ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin text-white" />
                            <span>{language === 'UA' ? 'Перекодування відеофайлів (FFmpeg)...' : 'Converting video files...'}</span>
                          </>
                        ) : (
                          <>
                            <Wand2 className="w-4 h-4 text-amber-400" />
                            <span>{language === 'UA' ? 'Конвертувати у 3 роздільності (1080p, 720p, 480p)' : 'Convert into 3 video files (1080p, 720p, 480p)'}</span>
                          </>
                        )}
                      </button>

                      {/* Жива консоль моніторингу логів FFmpeg конвертації */}
                      <div className="mt-2.5 p-3 bg-zinc-950 border border-zinc-800 rounded-xl space-y-2">
                        <div className="flex items-center justify-between text-xs font-mono">
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${isConvertingQualities ? 'bg-amber-400 animate-pulse' : conversionLogLines.length > 0 ? 'bg-emerald-400' : 'bg-zinc-600'}`} />
                            <FileVideo className="w-3.5 h-3.5 text-red-400 shrink-0" />
                            <span className="font-bold text-zinc-200">
                              {isConvertingQualities
                                ? (language === 'UA' ? 'FFmpeg перекодування триває...' : 'FFmpeg transcoding in progress...')
                                : (language === 'UA' ? 'Журнал конвертації (FFmpeg):' : 'Conversion log (FFmpeg):')}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setShowConversionLogs(prev => !prev)}
                            className="px-2 py-1 text-[10px] font-bold bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-amber-300 rounded-lg flex items-center gap-1 cursor-pointer transition-all shrink-0"
                          >
                            <Terminal className="w-3 h-3 text-red-400" />
                            <span>
                              {showConversionLogs
                                ? (language === 'UA' ? 'Приховати лог' : 'Hide log')
                                : (language === 'UA' ? `Лог (${conversionLogLines.length})` : `Log (${conversionLogLines.length})`)}
                            </span>
                          </button>
                        </div>

                        {(conversionStatusMsg || conversionMessage) && (
                          <p className="text-[11px] text-amber-300 font-mono leading-relaxed bg-zinc-900/60 p-2 rounded-lg border border-zinc-800 flex items-center gap-2">
                            {isConvertingQualities && <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400 shrink-0" />}
                            <span className="truncate">{conversionStatusMsg || conversionMessage}</span>
                          </p>
                        )}

                        {showConversionLogs && (
                          <div className="space-y-1 pt-1">
                            <div className="flex items-center justify-between text-[10px] text-zinc-400 font-mono px-1">
                              <span>📄 Файл логів: <strong className="text-zinc-200">public/uploads/conversion.log</strong></span>
                              <span>Записів: {conversionLogLines.length}</span>
                            </div>
                            <div
                              ref={conversionLogContainerRef}
                              className="bg-black p-3 rounded-xl border border-zinc-800 font-mono text-[11px] text-emerald-400 max-h-52 overflow-y-auto space-y-1 leading-relaxed select-text shadow-inner"
                            >
                              {conversionLogLines.length === 0 ? (
                                <p className="text-zinc-500 italic text-[10px]">
                                  {language === 'UA' ? 'Лог-файл порожній. Запустіть конвертацію.' : 'Log file is empty. Start conversion.'}
                                </p>
                              ) : (
                                conversionLogLines.map((line, lIdx) => (
                                  <div
                                    key={`clog-${lIdx}`}
                                    className={`flex items-start gap-1.5 ${line.includes('Error') || line.includes('Помилка') || line.includes('❌')
                                      ? 'text-red-400 font-bold'
                                      : line.includes('✅') || line.includes('Success') || line.includes('Успішно') || line.includes('🎉')
                                        ? 'text-emerald-300 font-semibold'
                                        : line.includes('⏳') || line.includes('Рендеринг')
                                          ? 'text-amber-300'
                                          : line.includes('🎬') || line.includes('Старт')
                                            ? 'text-cyan-300 font-medium'
                                            : 'text-zinc-300'
                                      }`}
                                  >
                                    <span className="text-zinc-600 select-none shrink-0">{lIdx + 1}.</span>
                                    <span className="break-all">{line}</span>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleManualWhisperTranscribe(e);
                        }}
                        disabled={isWhisperProcessing || (!movieForm.videoUrl && (!movieForm.episodesData || Object.keys(movieForm.episodesData).length === 0))}
                        className="w-full py-2.5 px-4 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 font-bold text-xs rounded-xl border border-zinc-800 hover:border-zinc-700 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        {isWhisperProcessing ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                            <span>{language === 'UA' ? 'Whisper.cpp розпізнає мову...' : 'Whisper.cpp transcribing...'}</span>
                          </>
                        ) : (
                          <>
                            <Cpu className="w-3.5 h-3.5 text-blue-400" />
                            <span>{language === 'UA' ? 'Запустити транскрипцію Whisper.cpp' : 'Run Whisper.cpp transcription'}</span>
                          </>
                        )}
                      </button>

                      {/* Жива консоль моніторингу логів розпізнавання Whisper */}
                      <div className="mt-2.5 p-3 bg-zinc-950 border border-zinc-800 rounded-xl space-y-2">
                        <div className="flex items-center justify-between text-xs font-mono">
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${isWhisperProcessing ? 'bg-amber-400 animate-pulse' : transcribeLogLines.length > 0 ? 'bg-emerald-400' : 'bg-zinc-600'}`} />
                            <Cpu className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                            <span className="font-bold text-zinc-200">
                              {isWhisperProcessing
                                ? (language === 'UA' ? 'Обробка відео та розпізнавання мови...' : 'Video processing in progress...')
                                : (language === 'UA' ? 'Журнал обробки субтитрів:' : 'Subtitle processing log:')}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setShowTranscribeLogs(prev => !prev)}
                            className="px-2 py-1 text-[10px] font-bold bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-amber-300 rounded-lg flex items-center gap-1 cursor-pointer transition-all shrink-0"
                          >
                            <Terminal className="w-3 h-3 text-emerald-400" />
                            <span>
                              {showTranscribeLogs
                                ? (language === 'UA' ? 'Приховати лог' : 'Hide log')
                                : (language === 'UA' ? `Лог (${transcribeLogLines.length})` : `Log (${transcribeLogLines.length})`)}
                            </span>
                          </button>
                        </div>

                        {whisperStatusMsg && (
                          <p className="text-[11px] text-amber-300 font-mono leading-relaxed bg-zinc-900/60 p-2 rounded-lg border border-zinc-850 flex items-center gap-2">
                            {isWhisperProcessing && <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400 shrink-0" />}
                            <span className="truncate">{whisperStatusMsg}</span>
                          </p>
                        )}

                        {showTranscribeLogs && (
                          <div className="space-y-1 pt-1">
                            <div className="flex items-center justify-between text-[10px] text-zinc-400 font-mono px-1">
                              <span>📄 Файл логів: <strong className="text-zinc-200">public/subtitles/transcribe.log</strong></span>
                              <span>Записів: {transcribeLogLines.length}</span>
                            </div>
                            <div
                              ref={logContainerRef}
                              className="bg-black p-3 rounded-xl border border-zinc-800 font-mono text-[11px] text-emerald-400 max-h-52 overflow-y-auto space-y-1 leading-relaxed select-text shadow-inner"
                            >
                              {transcribeLogLines.length === 0 ? (
                                <p className="text-zinc-500 italic text-[10px]">
                                  {language === 'UA' ? 'Лог-файл порожній. Запустіть транскрипцію.' : 'Log file is empty. Start transcription.'}
                                </p>
                              ) : (
                                transcribeLogLines.map((line, lIdx) => (
                                  <div
                                    key={`tlog-${lIdx}`}
                                    className={`flex items-start gap-1.5 ${line.includes('Error') || line.includes('Помилка') || line.includes('❌')
                                      ? 'text-red-400 font-bold'
                                      : line.includes('✅') || line.includes('Success') || line.includes('Успішно') || line.includes('Complete')
                                        ? 'text-emerald-300 font-semibold'
                                        : line.includes('FFmpeg')
                                          ? 'text-cyan-300'
                                          : line.includes('Gemini')
                                            ? 'text-purple-300'
                                            : 'text-zinc-300'
                                      }`}
                                  >
                                    <span className="text-zinc-600 select-none shrink-0">{lIdx + 1}.</span>
                                    <span className="break-all">{line}</span>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Менеджер сезонів та серій (для серіалів, аніме та дорам) */}
                  {movieForm.type === 'series' && (
                    <div className="space-y-4 pt-3 border-t border-zinc-850">
                      {/* Вкладки перемикання сезонів */}
                      <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1">
                        <div className="flex items-center gap-2">
                          {Array.from({ length: Math.max(1, Math.max(...Object.keys(movieForm.episodesData || {}).map(Number), activeSeason)) }, (_, i) => i + 1).map(sNum => {
                            const epCount = movieForm.episodesData?.[sNum]?.length || 0;
                            return (
                              <button
                                key={`season-admin-tab-${sNum}`}
                                type="button"
                                onClick={() => setActiveSeason(sNum)}
                                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${activeSeason === sNum
                                  ? 'bg-[#E50914] text-white shadow-lg shadow-red-950/50'
                                  : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
                                  }`}
                              >
                                <span>{language === 'UA' ? `${sNum} Сезон` : `Season ${sNum}`}</span>
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono ${activeSeason === sNum ? 'bg-black/30 text-white' : 'bg-zinc-800 text-zinc-400'}`}>
                                  {epCount} {language === 'UA' ? 'серій' : 'ep'}
                                </span>
                              </button>
                            );
                          })}

                          <button
                            type="button"
                            onClick={() => {
                              const nextS = Math.max(1, Math.max(...Object.keys(movieForm.episodesData || {}).map(Number), 0)) + 1;
                              setActiveSeason(nextS);
                            }}
                            className="px-3 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5 text-emerald-400" />
                            <span>{language === 'UA' ? 'Додати Сезон' : 'Add Season'}</span>
                          </button>
                        </div>

                        {/* Кнопка очищення серій сезону */}
                        {movieForm.episodesData?.[activeSeason]?.length ? (
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(language === 'UA' ? `Видалити всі серії з ${activeSeason} Сезону?` : `Delete all episodes from Season ${activeSeason}?`)) {
                                const updated = { ...movieForm.episodesData };
                                delete updated[activeSeason];
                                setMovieForm(prev => ({ ...prev, episodesData: updated }));
                              }
                            }}
                            className="text-xs text-red-400 hover:text-red-300 font-semibold flex items-center gap-1 transition-colors px-2.5 py-1.5 rounded-lg border border-red-900/40 hover:bg-red-950/40 cursor-pointer shrink-0"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>{language === 'UA' ? `Очистити ${activeSeason} Сезон` : `Clear Season ${activeSeason}`}</span>
                          </button>
                        ) : null}
                      </div>

                      {/* Список серій активного сезону */}
                      <div className="space-y-3 pt-1">
                        <div className="flex items-center justify-between text-xs font-bold text-zinc-300 border-b border-zinc-900 pb-2 flex-wrap gap-2">
                          <span>
                            {language === 'UA' ? `Серії у ${activeSeason} Сезоні:` : `Episodes in Season ${activeSeason}:`} {movieForm.episodesData?.[activeSeason]?.length || 0}
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={handleFetchMalEpisodes}
                              disabled={isFetchingMalEpisodes || !movieForm.myAnimeListUrl}
                              className="px-2.5 py-1 text-[11px] font-bold text-sky-400 hover:text-sky-300 bg-sky-950/40 hover:bg-sky-900/60 border border-sky-800/60 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                              title={movieForm.myAnimeListUrl ? 'Завантажити назви та описи серій з MyAnimeList Jikan API' : 'Спочатку вкажіть MyAnimeList URL у формі'}
                            >
                              {isFetchingMalEpisodes ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-400" />
                              ) : (
                                <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                              )}
                              <span>{language === 'UA' ? 'Імпорт серій з MAL' : 'Import MAL Episodes'}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const currentList = movieForm.episodesData?.[activeSeason] || [];
                                const nextEpNum = currentList.length + 1;
                                const newEp = {
                                  number: nextEpNum,
                                  title: language === 'UA' ? `Серія ${nextEpNum}` : `Episode ${nextEpNum}`,
                                  duration: '24 хв',
                                  videoUrl: movieForm.videoUrl || 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
                                  sources: {},
                                  videoSources: {}
                                };
                                setMovieForm(prev => ({
                                  ...prev,
                                  episodesData: {
                                    ...(prev.episodesData || {}),
                                    [activeSeason]: [...currentList, newEp]
                                  }
                                }));
                              }}
                              className="text-[11px] text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>{language === 'UA' ? 'Додати серію вручну' : 'Add episode manually'}</span>
                            </button>
                          </div>
                        </div>

                        {malFetchMsg && (
                          <div className="text-[11px] font-medium text-sky-300 bg-sky-950/50 p-2 rounded-lg border border-sky-900/50 flex items-center gap-2">
                            <span>{malFetchMsg}</span>
                          </div>
                        )}

                        {(!movieForm.episodesData?.[activeSeason] || movieForm.episodesData[activeSeason].length === 0) ? (
                          <div className="p-6 text-center text-zinc-500 text-xs font-medium bg-zinc-900/30 rounded-xl border border-zinc-900">
                            {language === 'UA' ? 'Для цього сезону ще немає завантажених серій. Перетягніть папку S1 або додайте файли вище.' : 'No episodes loaded for this season yet. Drop S1 folder or add files above.'}
                          </div>
                        ) : (
                          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                            {movieForm.episodesData[activeSeason].map((ep, idx) => {
                              const getStudioVideoUrl = () => {
                                if (uploadVoiceoverMode === 'auto' || uploadVoiceoverMode === 'all') {
                                  return ep.videoUrl || (ep.sources ? (Object.values(ep.sources)[0] || '') : '');
                                }
                                const sources = ep.sources || ep.videoSources || {};
                                if (sources[uploadVoiceoverMode]) {
                                  return sources[uploadVoiceoverMode];
                                }
                                const shortStudio = uploadVoiceoverMode.split(' ')[0].toLowerCase();
                                const match = Object.keys(sources).find(k => k.toLowerCase().includes(shortStudio));
                                if (match && sources[match]) {
                                  return sources[match];
                                }
                                return '';
                              };

                              const currentStudioVideoUrl = getStudioVideoUrl();

                              return (
                                <div key={`admin-ep-${activeSeason}-${ep.number}-${idx}`} className="p-3 bg-zinc-900/80 border border-zinc-800 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                                  <div className="flex items-center gap-3 font-mono">
                                    <span className="w-7 h-7 rounded-lg bg-red-950 border border-red-800/60 text-[#E50914] font-bold flex items-center justify-center text-xs shrink-0">
                                      {ep.number}
                                    </span>
                                    <div className="space-y-0.5">
                                      <input
                                        type="text"
                                        value={ep.title}
                                        onChange={(e) => {
                                          const newTitle = e.target.value;
                                          setMovieForm(prev => {
                                            const updated = { ...(prev.episodesData || {}) };
                                            if (updated[activeSeason]) {
                                              updated[activeSeason][idx] = { ...updated[activeSeason][idx], title: newTitle };
                                            }
                                            return { ...prev, episodesData: updated };
                                          });
                                        }}
                                        className="bg-zinc-950 border border-zinc-800 rounded-md px-2 py-1 text-white font-sans text-xs w-48 sm:w-64"
                                      />
                                      <div className="text-[10px] text-emerald-400 font-mono truncate max-w-xs flex items-center gap-1">
                                        <PlayCircle className="w-3 h-3 text-emerald-400 shrink-0" />
                                        <span className="truncate">{currentStudioVideoUrl ? (currentStudioVideoUrl.startsWith('blob:') ? '▶ Готово до відтворення (Blob)' : currentStudioVideoUrl) : 'Не вказано відео'}</span>
                                      </div>
                                      {/* Бейджі доступних озвучень */}
                                      {ep.sources && Object.keys(ep.sources).length > 0 && (
                                        <div className="flex flex-wrap gap-1 mt-1">
                                          {Array.from(new Set(Object.keys(ep.sources).map(k => k.split(' ')[0]))).map(st => {
                                            const isSelected = uploadVoiceoverMode !== 'auto' && uploadVoiceoverMode !== 'all' && uploadVoiceoverMode.startsWith(st);
                                            return (
                                              <span
                                                key={`ep-badge-${idx}-${st}`}
                                                className={`text-[9px] px-1.5 py-0.5 rounded font-bold border transition-colors ${isSelected
                                                  ? 'bg-amber-950/80 text-amber-300 border-amber-500/80'
                                                  : 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60'
                                                  }`}
                                              >
                                                ✓ {st}
                                              </span>
                                            );
                                          })}
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2 self-end sm:self-center">
                                    <input
                                      type="text"
                                      placeholder="URL відео..."
                                      value={currentStudioVideoUrl || ''}
                                      onChange={(e) => {
                                        const newUrl = e.target.value;
                                        setMovieForm(prev => {
                                          const updated = { ...(prev.episodesData || {}) };
                                          if (updated[activeSeason]) {
                                            const curEp = updated[activeSeason][idx];
                                            const updatedSources = { ...(curEp.sources || curEp.videoSources || {}) };

                                            if (uploadVoiceoverMode !== 'auto' && uploadVoiceoverMode !== 'all') {
                                              updatedSources[uploadVoiceoverMode] = newUrl;
                                              const shortName = uploadVoiceoverMode.split(' ')[0];
                                              updatedSources[shortName] = newUrl;
                                              if (uploadVoiceoverMode.includes('Далі Буде')) {
                                                updatedSources['Далі Буде'] = newUrl;
                                                updatedSources['Далі Буде!'] = newUrl;
                                              }
                                            }

                                            updated[activeSeason][idx] = {
                                              ...curEp,
                                              videoUrl: (uploadVoiceoverMode === 'auto' || uploadVoiceoverMode === 'all' || !curEp.videoUrl) ? newUrl : curEp.videoUrl,
                                              sources: updatedSources,
                                              videoSources: updatedSources
                                            };
                                          }
                                          return { ...prev, episodesData: updated };
                                        });

                                        // Синхронізація з nova_custom_video_urls
                                        try {
                                          const targetId = isEditing && isEditing !== 'new' ? isEditing : (movieForm.id || 'new_movie');
                                          const customUrlsMap = JSON.parse(localStorage.getItem('nova_custom_video_urls') || '{}');
                                          const suffix = uploadVoiceoverMode !== 'auto' && uploadVoiceoverMode !== 'all' ? `-${uploadVoiceoverMode}` : '';
                                          customUrlsMap[`${targetId}-s${activeSeason}-e${ep.number}${suffix}`] = newUrl;
                                          if (movieForm.id) {
                                            customUrlsMap[`${movieForm.id}-s${activeSeason}-e${ep.number}${suffix}`] = newUrl;
                                          }
                                          customUrlsMap[`new_movie-s${activeSeason}-e${ep.number}${suffix}`] = newUrl;
                                          localStorage.setItem('nova_custom_video_urls', JSON.stringify(customUrlsMap));
                                        } catch (err) { }
                                      }}
                                      className="bg-zinc-950 border border-zinc-800 rounded-md px-2 py-1 text-zinc-300 font-mono text-[10px] w-36 sm:w-48"
                                    />

                                    <button
                                      type="button"
                                      onClick={() => handleSingleEpisodeTranscribe(activeSeason, ep.number, currentStudioVideoUrl || '')}
                                      disabled={isWhisperProcessing || !currentStudioVideoUrl}
                                      className={`px-2 py-1 text-[10px] font-bold rounded-md border transition-all flex items-center gap-1 cursor-pointer shrink-0 disabled:opacity-40 ${ep.subtitleUrl
                                        ? 'bg-emerald-950/80 text-emerald-400 border-emerald-800 hover:bg-emerald-900'
                                        : 'bg-zinc-950 hover:bg-zinc-900 text-amber-400 border-amber-900/60 hover:border-amber-700'
                                        }`}
                                      title={ep.subtitleUrl ? 'Субтитри VTT створено (натисніть для повторної транскрипції)' : 'Запустити автогенерацію субтитрів Whisper для цієї серії'}
                                    >
                                      <Cpu className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                      <span>{ep.subtitleUrl ? '✓ Subtitles' : 'Транскрибувати'}</span>
                                    </button>

                                    <label
                                      className={`px-2 py-1 text-[10px] font-bold rounded-md border transition-all flex items-center gap-1 cursor-pointer shrink-0 ${ep.subtitleUrl
                                        ? 'bg-blue-950/80 text-blue-300 border-blue-800 hover:bg-blue-900'
                                        : 'bg-zinc-950 hover:bg-zinc-900 text-zinc-300 border-zinc-800 hover:border-zinc-700'
                                        }`}
                                      title={language === 'UA' ? 'Завантажити файл субтитрів (.vtt, .srt)' : 'Upload subtitle file (.vtt, .srt)'}
                                    >
                                      <input
                                        type="file"
                                        accept=".vtt,.srt,.txt,.sub,.ass"
                                        className="hidden"
                                        disabled={uploadingEpisodeSubtitle?.season === activeSeason && uploadingEpisodeSubtitle?.episodeNumber === ep.number}
                                        onChange={(e) => {
                                          const file = e.target.files?.[0];
                                          if (file) handleEpisodeSubtitleUpload(activeSeason, ep.number, file);
                                          e.target.value = '';
                                        }}
                                      />
                                      {uploadingEpisodeSubtitle?.season === activeSeason && uploadingEpisodeSubtitle?.episodeNumber === ep.number ? (
                                        <Loader2 className="w-3 h-3 animate-spin text-amber-400" />
                                      ) : (
                                        <FileText className="w-3 h-3 text-amber-400" />
                                      )}
                                      <span>{ep.subtitleUrl ? '✓ .vtt' : '+ .vtt/.srt'}</span>
                                    </label>

                                    <button
                                      type="button"
                                      onClick={() => {
                                        setMovieForm(prev => {
                                          const updated = { ...(prev.episodesData || {}) };
                                          if (updated[activeSeason]) {
                                            updated[activeSeason] = updated[activeSeason].filter((_, i) => i !== idx);
                                          }
                                          return { ...prev, episodesData: updated };
                                        });
                                      }}
                                      className="p-1.5 text-zinc-500 hover:text-red-400 bg-zinc-950 hover:bg-red-950/40 rounded-lg border border-zinc-800 transition cursor-pointer"
                                      title="Видалити серію"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-zinc-950">
                  <button
                    type="button"
                    onClick={() => setIsEditing(null)}
                    className="py-2.5 px-5 bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800 rounded-xl transition-colors"
                  >
                    {language === 'UA' ? 'Скасувати' : 'Cancel'}
                  </button>
                  <button
                    type="submit"
                    className="py-2.5 px-6 bg-[#E50914] text-white hover:bg-red-700 font-bold rounded-xl transition-all flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    {language === 'UA' ? 'Зберегти зміни' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <AdminCatalogTable
              movies={movies}
              onSelectMovie={onSelectMovie}
              startEditMovie={startEditMovie}
              handleDeleteMovie={handleDeleteMovie}
              startNewMovie={startNewMovie}
              language={language}
            />
          )}
        </div>
      )}

      {/* Вміст вкладки "Категорії" згідно з макетом Figma */}
      {activeSubTab === 'categories' && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="pt-8 sm:pt-10 w-full"
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 xl:gap-20 items-start">
            {/* Ліва колонка: Додати категорію */}
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.38, delay: 0.04, ease: "easeOut" }}
              className="lg:col-span-5 space-y-1.5"
            >
              <h3 className="text-2xl sm:text-[28px] font-bold font-display text-white tracking-tight">
                {language === 'UA' ? 'Додати категорію' : 'Add Category'}
              </h3>
              <p className="text-xs sm:text-[13px] text-zinc-400 font-sans leading-relaxed">
                {language === 'UA'
                  ? 'Створюйте нові призначені для користувача або жанрові фільтрування контенту'
                  : 'Create new user or genre content filters'}
              </p>

              <form onSubmit={handleCreateGenre} className="pt-7 sm:pt-8 space-y-3">
                <label className="text-sm sm:text-base font-bold text-white font-display block">
                  {language === 'UA' ? 'Назва категорії' : 'Category name'}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={newGenreName}
                    onChange={(e) => setNewGenreName(e.target.value)}
                    placeholder={language === 'UA' ? 'Ретро, Аніме...' : 'Retro, Anime...'}
                    className="w-full h-[52px] px-5 bg-black border border-white focus:ring-1 focus:ring-white rounded-[14px] text-sm text-white placeholder:text-zinc-500 focus:outline-none transition-all font-sans"
                    required
                  />
                </div>

                <div className="flex justify-center pt-4">
                  <button
                    type="submit"
                    className="journey-cta-btn border-2 border-transparent hover:border-white/80 active:border-transparent text-white w-[160px] h-[39px] rounded-[10px] font-bold text-sm flex items-center justify-center gap-2 transition-all transform hover:scale-102 active:scale-98 hover:shadow-[0_0_24px_rgba(255,255,255,0.3),0_10px_25px_rgba(215,40,53,0.35)] shadow-lg shadow-[#FF4D5C]/25 cursor-pointer select-none"
                  >
                    <span>{language === 'UA' ? 'Додати' : 'Add'}</span>
                  </button>
                </div>
              </form>
            </motion.div>

            {/* Права колонка: Наявні категорії */}
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.38, delay: 0.06, ease: "easeOut" }}
              className="lg:col-span-7 space-y-4"
            >
              <h3 className="text-2xl sm:text-[28px] font-bold font-display text-white tracking-tight">
                {language === 'UA' ? `Наявні категорії (${genresList.length})` : `Existing Categories (${genresList.length})`}
              </h3>

              <motion.div
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-3.5 pt-5 sm:pt-6"
                initial="hidden"
                animate="visible"
                variants={{
                  hidden: { opacity: 0 },
                  visible: {
                    opacity: 1,
                    transition: {
                      staggerChildren: 0.03
                    }
                  }
                }}
              >
                {genresList.map((genre) => {
                  const isEditingThis = editingGenre === genre;
                  return (
                    <motion.div
                      key={genre}
                      variants={{
                        hidden: { opacity: 0, y: 8, scale: 0.96 },
                        visible: { opacity: 1, y: 0, scale: 1 }
                      }}
                      whileHover={{
                        scale: 1.025,
                        borderColor: 'rgba(255, 255, 255, 0.7)',
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        boxShadow: '0 0 16px rgba(255, 255, 255, 0.08)'
                      }}
                      whileTap={{ scale: 0.97 }}
                      transition={{ duration: 0.18, ease: "easeOut" }}
                      onClick={() => {
                        if (!isEditingThis) {
                          setEditingGenre(genre);
                          setEditingGenreValue(genre);
                        }
                      }}
                      className={`group relative h-[42px] px-3.5 rounded-full border border-white bg-transparent flex items-center justify-center text-center transition-all cursor-pointer select-none ${isEditingThis
                        ? 'bg-white/10 ring-1 ring-white/50'
                        : 'hover:bg-white/10'
                        }`}
                    >
                      {isEditingThis ? (
                        <div className="flex items-center gap-1.5 w-full px-2" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="text"
                            autoFocus
                            value={editingGenreValue}
                            onChange={(e) => setEditingGenreValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleUpdateGenre(genre, editingGenreValue);
                              } else if (e.key === 'Escape') {
                                e.preventDefault();
                                setEditingGenre(null);
                              }
                            }}
                            onBlur={() => handleUpdateGenre(genre, editingGenreValue)}
                            className="w-full bg-transparent border-b border-white/80 text-xs sm:text-[13px] text-white text-center font-medium focus:outline-none px-1 py-0.5"
                          />
                          <button
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              handleUpdateGenre(genre, editingGenreValue);
                            }}
                            className="text-emerald-400 hover:text-emerald-300 p-0.5 cursor-pointer shrink-0"
                            title={language === 'UA' ? 'Зберегти' : 'Save'}
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <span
                            className="text-xs sm:text-[13.5px] text-white font-medium truncate px-1 tracking-wide"
                            title={language === 'UA' ? 'Клікніть для редагування назви' : 'Click to edit category'}
                          >
                            {genre}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteGenre(genre);
                            }}
                            className="absolute right-2 text-zinc-400 hover:text-[#FF3040] opacity-0 group-hover:opacity-100 transition-opacity p-1 cursor-pointer rounded-full hover:bg-white/10"
                            title={language === 'UA' ? 'Видалити категорію' : 'Delete category'}
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </motion.div>
                  );
                })}
              </motion.div>
            </motion.div>
          </div>
        </motion.div>
      )}

      {/* Вкладка керування користувачами */}
      {activeSubTab === 'users' && (
        <div className="bg-[#000000] overflow-x-auto font-sans pt-2">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="text-zinc-400 font-normal border-b border-white/10 text-xs sm:text-sm">
                <th className="py-4 px-4 font-normal">Користувач / Email</th>
                <th className="py-4 px-4 font-normal">План</th>
                <th className="py-4 px-4 font-normal">Статус</th>
                <th className="py-4 px-4 text-right font-normal pr-6">Дії</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {usersList.map((u, index) => {
                const isOnline = u.email === user?.email;
                const isBlocked = u.isBlocked === true || u.status === 'Заблокований';

                const avatarSrc = (() => {
                  if (u.avatarUrl) return u.avatarUrl;
                  if (u.avatar) return u.avatar;
                  if (u.picture) return u.picture;
                  if (u.email) {
                    try {
                      const emailKey = u.email.trim().toLowerCase();
                      const stored = localStorage.getItem(`user_avatar_${emailKey}`);
                      if (stored) return stored;

                      const savedAccountsStr = localStorage.getItem('cinemanova_accounts');
                      if (savedAccountsStr) {
                        const accounts = JSON.parse(savedAccountsStr);
                        if (accounts[emailKey]?.avatarUrl) return accounts[emailKey].avatarUrl;
                      }
                    } catch (e) { }
                  }
                  return null;
                })();

                return (
                  <tr key={`${u.id || ''}-${index}`} className="hover:bg-white/[0.03] transition-colors">
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        {avatarSrc ? (
                          <img
                            src={avatarSrc}
                            alt={u.name || 'User'}
                            className="w-9 h-9 rounded-full object-cover border border-white/20 shrink-0 bg-zinc-900"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              if (e.currentTarget.nextElementSibling) {
                                (e.currentTarget.nextElementSibling as HTMLElement).style.display = 'flex';
                              }
                            }}
                          />
                        ) : null}
                        <div
                          style={{ display: avatarSrc ? 'none' : 'flex' }}
                          className="w-9 h-9 rounded-full bg-gradient-to-br from-[#FF3040]/30 to-zinc-900 border border-white/20 flex items-center justify-center font-bold text-white shrink-0 text-xs"
                        >
                          {u.name?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <div>
                          <h5 className="font-medium text-white text-xs sm:text-sm">{u.name}</h5>
                          <p className="text-xs text-zinc-400 mt-0.5">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-white font-medium text-xs sm:text-sm">
                      {u.plan || 'Premiym'}
                    </td>
                    <td className="py-4 px-4 font-medium text-xs sm:text-sm">
                      <span className={isBlocked ? 'text-[#F22E3D]' : isOnline ? 'text-emerald-400' : 'text-[#F22E3D]'}>
                        {isBlocked ? 'Offlain' : isOnline ? 'В мережі' : 'Offlain'}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right pr-6">
                      {u.role !== 'admin' && (
                        <div className="flex items-center justify-end gap-3">
                          <button
                            onClick={() => toggleUserStatus(u.id || u.email)}
                            className="text-xs font-normal px-4 py-1.5 rounded-full border border-white/20 text-white hover:bg-white/10 transition-colors cursor-pointer"
                          >
                            {!isBlocked ? 'Заблокувати' : 'Розблокувати'}
                          </button>
                          <button
                            onClick={() => deleteUser(u.id || u.email)}
                            className="p-1.5 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                            title={language === 'UA' ? 'Видалити' : 'Delete'}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Вкладка звернень та пропозицій користувачів */}
      {activeSubTab === 'reports' && (
        <AdminReportsList language={language} />
      )}
    </div>
  );
}
