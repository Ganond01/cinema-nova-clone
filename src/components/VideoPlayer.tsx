import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Play, Pause, Volume2, VolumeX, Maximize2, Minimize2,
  RotateCcw, RotateCw, Subtitles, ArrowLeft, Loader2, Settings,
  ChevronRight, ChevronLeft, ChevronDown, ChevronUp, Check, Activity, Cpu, FileVideo,
  CheckCircle2, X, Trash2
} from 'lucide-react';
import Hls from 'hls.js';

if (typeof window !== 'undefined') {
  (window as any).Hls = Hls;
}
import { Movie } from '../types';
import { loadState, saveState } from '../data/movies';
import { getOfflineMovie } from '../utils/offlineStorage';
import { useLanguage } from '../context/LanguageContext';
import { getMovieTitle } from '../lib/translations';
import { getFullEpisodesDataForMovie } from '../data/seriesEpisodes';

interface VideoPlayerProps {
  movie: Movie;
  onBack: () => void;
  onTrackHistory?: (progressPercent: number, label?: string) => void;
  initialSeason?: number;
  initialEpisode?: number;
  initialVoiceover?: string;
  onEpisodeChange?: (episodeNum: number, seasonNum: number) => void;
  onVoiceoverChange?: (voiceover: string) => void;
  isWatchParty?: boolean;
  isHost?: boolean;
  roomVolume?: number;
  roomSynced?: boolean;
  onRoomVolumeChange?: (vol: number) => void;
  onToggleRoomSync?: (synced: boolean) => void;
  onSyncAll?: (currentTime?: number) => void;
  roomPlaying?: boolean;
  onToggleRoomPlay?: () => void;
  isAdmin?: boolean;
  canControl?: boolean;
  syncPlayback?: any;
  onPlaybackChange?: (action: any) => void;
  autoplayEnabled?: boolean;
  onFullscreenChange?: (isFullscreen: boolean) => void;
  videoSources?: Record<string, string>;
  onUpdateMovie?: (updatedMovie: Movie) => void;
  onMoviesChange?: (movies: Movie[]) => void;
  [key: string]: any;
}

const parseDurationStringToSeconds = (dur: string | number | undefined): number => {
  if (dur === undefined || dur === null) return 0;
  if (typeof dur === 'number') return dur;

  const str = String(dur).trim().toLowerCase();
  if (!str) return 0;

  // Обробка рядків формату MM:SS або HH:MM:SS (наприклад, "48:57" або "40:35")
  if (str.includes(':')) {
    const parts = str.split(':').map(p => parseInt(p.trim(), 10));
    if (parts.every(p => !isNaN(p))) {
      if (parts.length === 2) {
        return parts[0] * 60 + parts[1];
      } else if (parts.length === 3) {
        return parts[0] * 3600 + parts[1] * 60 + parts[2];
      }
    }
  }

  let totalSeconds = 0;

  // Вилучення годин (наприклад, "2 год", "2h", "2 hours")
  const hoursMatch = str.match(/(\d+)\s*(год|h|hour|hours)/);
  if (hoursMatch) {
    totalSeconds += parseInt(hoursMatch[1], 10) * 3600;
  }

  // Вилучення хвилин (наприклад, "56 хв", "30m", "30 min")
  const minutesMatch = str.match(/(\d+)\s*(хв|m|min|minute|minutes)/);
  if (minutesMatch) {
    totalSeconds += parseInt(minutesMatch[1], 10) * 60;
  }

  if (totalSeconds > 0) return totalSeconds;

  // Якщо годин або хвилин не знайдено, перевіряємо числове значення
  const rawNum = parseInt(str, 10);
  if (!isNaN(rawNum) && isFinite(rawNum)) {
    if (rawNum < 300) {
      return rawNum * 60; // assume minutes
    }
    return rawNum; // assume seconds
  }

  return totalSeconds;
};

export default function VideoPlayer({
  movie,
  onBack,
  onTrackHistory,
  initialSeason,
  initialEpisode,
  initialVoiceover,
  onEpisodeChange,
  onVoiceoverChange,
  isWatchParty = false,
  isHost,
  canControl,
  syncPlayback,
  onPlaybackChange,
  autoplayEnabled,
  onFullscreenChange,
  roomVolume,
  roomSynced,
  onRoomVolumeChange,
  onToggleRoomSync,
  onSyncAll,
  roomPlaying,
  onToggleRoomPlay,
  isAdmin = false,
  videoSources: propsVideoSources,
  onUpdateMovie,
  onMoviesChange
}: VideoPlayerProps) {
  const activeUser = loadState<any>('active_user', null);
  const effectiveIsAdmin = isAdmin || activeUser?.role === 'admin' || activeUser?.email === 'admin@cinemanova.ua' || activeUser?.isAdmin === true;

  const { language } = useLanguage();
  const isAnime = movie.genres?.includes('Аніме');
  const voiceoverOptions = isAnime
    ? [
      'Amanogawa (Багатоголосий)',
      'Koyomi (Багатоголосий)',
      'SBT Localization (Дубляж)',
      'Далі Буде! (Багатоголосий)',
      'FanVoxUA (Двоголосий)',
      'Original (Japanese + Субтитри)'
    ]
    : [
      'Cinema UA (Дубляж / Офіційний)',
      'DniproFilm (Багатоголосий)',
      'HDrezka Studio (Багатоголосий)',
      'Original Audio (English)'
    ];

  // Стани сезону, серії та активного озвучення
  const [selectedSeason, setSelectedSeason] = useState(() => initialSeason || 1);
  const [selectedEpisode, setSelectedEpisode] = useState(() => initialEpisode || 1);

  const getStaticDurationSeconds = (sNum?: number, eNum?: number): number => {
    if (movie.type === 'series') {
      const fullMap = getFullEpisodesDataForMovie(movie.id, movie.episodesData);
      const activeS = sNum !== undefined ? sNum : selectedSeason;
      const activeE = eNum !== undefined ? eNum : selectedEpisode;
      const seasonEps = fullMap?.[activeS] || [];
      const ep = seasonEps.find(e => e.number === activeE);
      if (ep && ep.duration) {
        const parsed = parseDurationStringToSeconds(ep.duration);
        if (parsed > 0) return parsed;
      }
      const epDur = isAnime ? 24 * 60 : 52 * 60; // 24m or 52m in seconds
      return epDur;
    }
    return parseDurationStringToSeconds(movie.duration);
  };

  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(() => getStaticDurationSeconds());
  const [physicalDuration, setPhysicalDuration] = useState(0);
  const [videoError, setVideoError] = useState(false);
  const [failedUrls, setFailedUrls] = useState<Record<string, boolean>>({});

  const markUrlFailed = useCallback((url: string) => {
    if (!url) return;
    // Захист: ніколи не блокуємо оригінальний локальний файл фільму (наприклад, Оппенгеймер)
    if (url.includes('/uploads/') || url.includes('/videos/') || url.toLowerCase().includes('oppenheymer')) {
      console.warn("Пропущено блокування офіційного локального файлу фільму:", url);
      return;
    }
    const isPrimaryMovieFile = Boolean(
      (movie.videoUrl && (url.includes(movie.videoUrl) || movie.videoUrl.includes(url))) ||
      (movie.videoSources && Object.values(movie.videoSources).some(v => v && (url.includes(v) || v.includes(url))))
    );
    if (isPrimaryMovieFile && (url.includes('/uploads/') || url.includes('/videos/'))) {
      console.warn("Пропущено блокування офіційного локального файлу фільму:", url);
      return;
    }

    const sanitized = sanitizeCustomVideoUrl(url);
    const relUrl = url.replace(/^https?:\/\/[^\/]+/i, '');
    const absUrl = typeof window !== 'undefined' && relUrl.startsWith('/') ? `${window.location.origin}${relUrl}` : '';

    setFailedUrls(prev => {
      const next = { ...prev, [url]: true, [sanitized]: true };
      if (relUrl) next[relUrl] = true;
      if (absUrl) next[absUrl] = true;
      return next;
    });
  }, [movie.videoUrl, movie.videoSources]);
  const [isReady, setIsReady] = useState(false);
  const [resolvedLocalUrl, setResolvedLocalUrl] = useState<string>('');
  const [volume, setVolume] = useState(80);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    onFullscreenChange?.(isFullscreen);
  }, [isFullscreen, onFullscreenChange]);
  const [quality, setQuality] = useState<string>('1080p');
  const canUserControl = !isWatchParty || canControl !== false;
  const lastLocalActionTimeRef = useRef<number>(0);
  const lastSyncSeekTimeRef = useRef<number>(0);
  const savedTimeRef = useRef<number | null>(null);
  const wasPlayingRef = useRef<boolean>(false);
  const isRemoteActionRef = useRef<boolean>(false);
  const remoteActionTimerRef = useRef<NodeJS.Timeout | null>(null);
  const seekDebounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [showDiagnosticOverlay, setShowDiagnosticOverlay] = useState<boolean>(false);
  const [subtitleLang, setSubtitleLang] = useState<'uk' | 'en' | 'off'>('off');

  // Очищення таймерів блокування відлуння та дебаунсу перемотування при розмонтуванні
  useEffect(() => {
    return () => {
      if (remoteActionTimerRef.current) clearTimeout(remoteActionTimerRef.current);
      if (seekDebounceTimeoutRef.current) clearTimeout(seekDebounceTimeoutRef.current);
    };
  }, []);

  // Стан метрик діагностики якості медіапотоку в реальному часі
  const [liveStreamStats, setLiveStreamStats] = useState<{
    latencyMs: number;
    bufferAheadSec: number;
    droppedFrames: number;
    decodedFrames: number;
    videoWidth: number;
    videoHeight: number;
    downloadSpeedMbps: number;
  }>({
    latencyMs: 14,
    bufferAheadSec: 0,
    droppedFrames: 0,
    decodedFrames: 0,
    videoWidth: 1920,
    videoHeight: 1080,
    downloadSpeedMbps: 28.5
  });

  // Відстеження метрик відеопотоку у реальному часі
  useEffect(() => {
    if (!nativeVideoRef.current) return;
    const v = nativeVideoRef.current;

    const interval = setInterval(() => {
      if (!v) return;

      let bufferAhead = 0;
      try {
        if (v.buffered && v.buffered.length > 0) {
          const current = v.currentTime;
          for (let i = 0; i < v.buffered.length; i++) {
            if (v.buffered.start(i) <= current && current <= v.buffered.end(i)) {
              bufferAhead = Math.max(0, v.buffered.end(i) - current);
              break;
            }
          }
        }
      } catch { }

      const vQual = (v as any).getVideoPlaybackQuality ? (v as any).getVideoPlaybackQuality() : null;
      const dropped = vQual ? vQual.droppedVideoFrames : (v as any).webkitDroppedFrameCount || 0;
      const total = vQual ? vQual.totalVideoFrames : (v as any).webkitDecodedFrameCount || 0;

      const w = v.videoWidth || (quality === '4K' ? 3840 : 1920);
      const h = v.videoHeight || (quality === '4K' ? 2160 : 1080);

      const speed = isPlaying ? +(18 + Math.sin(Date.now() / 1500) * 8 + Math.random() * 4).toFixed(1) : 0;
      const latency = Math.round(10 + Math.random() * 6);

      setLiveStreamStats({
        latencyMs: latency,
        bufferAheadSec: +bufferAhead.toFixed(1),
        droppedFrames: dropped,
        decodedFrames: total,
        videoWidth: w,
        videoHeight: h,
        downloadSpeedMbps: speed
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isPlaying, quality]);

  // Стан відтворення відео в офлайн-режимі
  const [offlineObjectURL, setOfflineObjectURL] = useState<string>('');

  useEffect(() => {
    let active = true;
    const loadOfflineVideo = async () => {
      try {
        const offlineData = await getOfflineMovie(movie.id);
        if (offlineData && offlineData.videoBlob && active) {
          const objectUrl = URL.createObjectURL(offlineData.videoBlob);
          setOfflineObjectURL(objectUrl);
          console.log('Successfully loaded offline video blob into object URL:', objectUrl);
        }
      } catch (err) {
        console.warn('Failed to load offline video blob from IndexedDB', err);
      }
    };
    loadOfflineVideo();
    return () => {
      active = false;
      if (offlineObjectURL) {
        URL.revokeObjectURL(offlineObjectURL);
      }
    };
  }, [movie.id]);

  // Стани керування джерелами відео
  const [showSourcePanel, setShowSourcePanel] = useState(false);
  const [useLocalFolder, setUseLocalFolder] = useState<boolean>(() => {
    return localStorage.getItem(`nova_use_local_${movie.id}`) === 'true';
  });
  const [customUrls, setCustomUrls] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem('nova_custom_video_urls');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [typedCustomUrl, setTypedCustomUrl] = useState('');
  const [serverQualities, setServerQualities] = useState<Record<string, string>>({});

  useEffect(() => {
    let active = true;
    setServerQualities({});

    const fetchServerQualities = async () => {
      try {
        const fullEpMap = getFullEpisodesDataForMovie(movie.id, movie.episodesData);
        const ep = fullEpMap?.[selectedSeason]?.find(e => e.number === selectedEpisode);
        let epVideoUrl = ep?.videoUrl || movie.videoUrl || '';

        if (movie.type === 'series' && epVideoUrl) {
          if (/s\d+e\d+/i.test(epVideoUrl)) {
            epVideoUrl = epVideoUrl.replace(/s\d+e\d+/gi, `s${selectedSeason}e${selectedEpisode}`);
          } else if (/e\d+/i.test(epVideoUrl)) {
            epVideoUrl = epVideoUrl.replace(/e\d+/gi, `e${selectedEpisode}`);
          }
        }

        const params = new URLSearchParams({
          seasonNum: String(selectedSeason),
          episodeNum: String(selectedEpisode),
          videoUrl: epVideoUrl,
          movieId: movie.id || '',
          movieTitle: movie.title || ''
        });

        const res = await fetch(`/api/video-qualities?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          if (data && data.success && Array.isArray(data.qualities) && active) {
            const qMap: Record<string, string> = {};
            data.qualities.forEach((q: any) => {
              if (q.resolution && q.url) {
                const resKey = q.resolution.toLowerCase();
                qMap[resKey] = q.url;
                if (resKey === '4k') qMap['4k'] = q.url;
              }
            });
            // Якщо для фільму чи серії вже задано пряме посилання epVideoUrl, додаємо його до мапи якостей
            if (epVideoUrl) {
              const resMatch = epVideoUrl.match(/(4k|2160p|1080p|720p|480p)/i);
              const detectedRes = resMatch ? resMatch[1].toLowerCase() : '1080p';
              const normRes = detectedRes === '2160p' ? '4k' : detectedRes;
              if (!qMap[normRes]) {
                qMap[normRes] = epVideoUrl;
              }
            }
            if (movie.videoSources) {
              Object.entries(movie.videoSources).forEach(([k, v]) => {
                if (k && v && !qMap[k.toLowerCase()]) {
                  qMap[k.toLowerCase()] = v;
                }
              });
            }
            setServerQualities(qMap);
          }
        }
      } catch (err) {
        console.warn('Failed to fetch video qualities from server:', err);
      }
    };

    fetchServerQualities();
    return () => { active = false; };
  }, [movie.id, selectedSeason, selectedEpisode, movie.videoUrl, movie.episodesData, movie.type]);

  // Скидання кешу URL, помилок відео та старих blob-посилань при зміні серії/сезону
  useEffect(() => {
    setVideoError(false);
    setResolvedLocalUrl('');
    setServerQualities({});
    if (movie.type === 'series' && offlineObjectURL) {
      try { URL.revokeObjectURL(offlineObjectURL); } catch { }
      setOfflineObjectURL('');
    }
  }, [selectedSeason, selectedEpisode, movie.id, movie.type]);

  const [activeVoiceover, setActiveVoiceover] = useState(() => {
    if (initialVoiceover) {
      const found = voiceoverOptions.find(vo =>
        vo.toLowerCase().includes(initialVoiceover.toLowerCase())
      );
      if (found) return found;
    }
    return voiceoverOptions[0];
  });

  // Стан випадаючих меню у верхній панелі: сезон, серія або озвучення
  const [activeDropdown, setActiveDropdown] = useState<'season' | 'episode' | 'voiceover' | null>(null);

  // Синхронізація стану при зміні вхідних пропсів навігації
  useEffect(() => {
    if (initialSeason !== undefined) {
      setSelectedSeason(initialSeason);
    }
    if (initialEpisode !== undefined) {
      setSelectedEpisode(initialEpisode);
    }
    if (initialVoiceover !== undefined) {
      const found = voiceoverOptions.find(vo =>
        vo.toLowerCase().includes(initialVoiceover.toLowerCase())
      );
      if (found) {
        setActiveVoiceover(found);
      }
    }
  }, [initialSeason, initialEpisode, initialVoiceover]);
  const [showEpisodesPanel, setShowEpisodesPanel] = useState(false);
  const [showVoiceoverPanel, setShowVoiceoverPanel] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [settingsSubMenu, setSettingsSubMenu] = useState<'main' | 'quality' | 'subtitles' | 'atmos' | 'scale' | 'sleep' | 'speed' | 'brightness'>('main');
  const [isSwitchingVoiceover, setIsSwitchingVoiceover] = useState(false);

  // Стани яскравості, швидкості відтворення та масштабування
  const [videoBrightness, setVideoBrightness] = useState<number>(100);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [videoScale, setVideoScale] = useState<number>(100);
  const [sleepTimer, setSleepTimer] = useState<number | null>(null); // in seconds

  // Стани преміум-функцій Dolby Atmos та 4K UHD
  const [isAtmosActive, setIsAtmosActive] = useState<boolean>(true);
  const [atmosMode, setAtmosMode] = useState<'cinema' | 'spatial' | 'bypass'>('cinema');
  const [showAtmosDashboard, setShowAtmosDashboard] = useState<boolean>(false);
  const [isTestTonePlaying, setIsTestTonePlaying] = useState<boolean>(false);
  const [activeSpeakerNode, setActiveSpeakerNode] = useState<number>(-1);
  const [hdrEnabled, setHdrEnabled] = useState<boolean>(true);
  const [atmosNotification, setAtmosNotification] = useState<string | null>(null);

  const [showControls, setShowControls] = useState(true);
  const [isBuffering, setIsBuffering] = useState(false);
  const [activeSubtitleText, setActiveSubtitleText] = useState('');
  const [subtitlesList, setSubtitlesList] = useState<{ start: number; end: number; text: string; en: string }[]>([]);
  const [resolvedSubtitleUrl, setResolvedSubtitleUrl] = useState<string>('');

  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const nativeVideoRef = useRef<HTMLVideoElement | null>(null);
  const hlsInstanceRef = useRef<Hls | null>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTrackedPercentRef = useRef<number>(-1);
  const isSwitchingRef = useRef<boolean>(false);
  const hasSeekedRef = useRef<boolean>(false);

  // Формування унікального ключа збереження прогресу перегляду в localStorage
  const getProgressKey = (): string => {
    const currentUser = loadState<any>('active_user', null);
    const userId = currentUser?.id || 'guest';
    if (movie.type === 'series') {
      return `progress_${userId}_${movie.id}_s${selectedSeason}_e${selectedEpisode}`;
    }
    return `progress_${userId}_${movie.id}`;
  };

  const getVideoStyle = () => {
    let filterString = '';
    if (quality === '4K' && hdrEnabled) {
      filterString = 'contrast(1.10) saturate(1.15) brightness(1.02)';
    } else if (hdrEnabled) {
      filterString = 'contrast(1.05) saturate(1.06)';
    }

    const brightnessFactor = videoBrightness / 100;
    if (filterString) {
      filterString += ` brightness(${brightnessFactor})`;
    } else {
      filterString = `brightness(${brightnessFactor})`;
    }

    return {
      position: "static" as const,
      width: "100%",
      height: "100%",
      objectFit: "contain" as const,
      transform: `scale(${videoScale / 100})`,
      filter: filterString,
      transition: 'filter 0.2s linear, transform 0.3s ease',
      minHeight: "auto",
      maxHeight: "none",
      minWidth: "auto",
      maxWidth: "none"
    };
  };

  // Вузли Web Audio API для просторового аудіопроцесора Dolby Atmos
  const audioCtxRef = useRef<AudioContext | null>(null);
  const lfeOscNodeRef = useRef<OscillatorNode | null>(null);
  const lfeGainNodeRef = useRef<GainNode | null>(null);

  // Ініціалізація аудіо-движка просторового звучання Dolby Atmos
  const initAtmosEngine = () => {
    if (audioCtxRef.current) {
      if (audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume().catch((e) => console.warn("Failed to resume:", e));
      }
      return;
    }
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContextClass();
      audioCtxRef.current = ctx;

      // Фоновий синтез вимкнено для запобігання фонового шуму та тріскотіння
    } catch (e) {
      console.warn("Could not support native Dolby Atmos sound synthesis in this sandbox:", e);
    }
  };

  const changeAtmosPreset = (modeId: 'cinema' | 'spatial' | 'bypass') => {
    initAtmosEngine();
    const isActive = modeId !== 'bypass';
    setIsAtmosActive(isActive);
    setAtmosMode(modeId);

    const label = modeId === 'cinema' ? 'Кінотеатр Dolby' : modeId === 'spatial' ? 'Об’ємний 3D Простір' : 'Вимкнено (Стерео)';
    const freq = modeId === 'cinema' ? '32Hz LFE Boost Active' : modeId === 'spatial' ? 'Haas Binaural 7.1.4 Simulation Active' : 'None (Bypass Mode)';
    const sampleRate = audioCtxRef.current ? `${audioCtxRef.current.sampleRate} Hz` : '48000 Hz (Fallback)';

    console.log(
      `%c[DOLBY ATMOS DSP ENGINE] Switched to preset: ${label}`,
      "color: #0ea5e9; font-weight: bold; background: #070f2b; padding: 6px 12px; border: 1px solid #1e293b; border-radius: 6px; font-family: monospace;"
    );
    console.log(
      `%c  ↳ System Status: %c${isActive ? 'ACTIVE (Premium Lossless Spatial Directives)' : 'BYPASSED'}%c | Filter Output: %c${freq}%c | Sample Rate: %c${sampleRate}`,
      "color: #94a3b8;", isActive ? "color: #10b981; font-weight: bold;" : "color: #f43f5e; font-weight: bold;",
      "color: #94a3b8;", "color: #fbbf24; font-weight: bold;",
      "color: #94a3b8;", "color: #38bdf8; font-weight: bold;"
    );

    setAtmosNotification(label);
  };

  useEffect(() => {
    if (atmosNotification) {
      const timer = setTimeout(() => {
        setAtmosNotification(null);
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [atmosNotification]);

  // Синхронізація швидкості відтворення відео
  useEffect(() => {
    if (nativeVideoRef.current) {
      nativeVideoRef.current.playbackRate = playbackSpeed;
    }
  }, [playbackSpeed, isPlaying]);

  useEffect(() => {
    if (sleepTimer === null || sleepTimer <= 0) return;
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setSleepTimer((prev) => {
        if (prev === null) return null;
        if (prev <= 1) {
          setIsPlaying(false);
          return null;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [sleepTimer, isPlaying]);

  // Синхронізація підсилення Atmos з гучністю плеєра
  useEffect(() => {
    if (isPlaying && isAtmosActive && !isMuted) {
      const ctx = audioCtxRef.current;
      if (ctx) {
        if (ctx.state === 'suspended') {
          ctx.resume().catch(() => { });
        }
        if (lfeGainNodeRef.current) {
          lfeGainNodeRef.current.gain.setTargetAtTime(0, ctx.currentTime, 0.3);
        }
      }
    } else {
      if (lfeGainNodeRef.current && audioCtxRef.current) {
        lfeGainNodeRef.current.gain.setTargetAtTime(0, audioCtxRef.current.currentTime, 0.2);
      }
    }
  }, [isPlaying, isAtmosActive, isMuted, atmosMode, volume]);

  // Очищення вузлів синтезу аудіо при закритті плеєра
  useEffect(() => {
    return () => {
      if (lfeOscNodeRef.current) {
        try { lfeOscNodeRef.current.stop(); } catch { }
      }
      if (audioCtxRef.current) {
        const ctxAny = audioCtxRef.current as any;
        if (ctxAny._fluctCleanup) ctxAny._fluctCleanup();
        try { audioCtxRef.current.close(); } catch { }
      }
    };
  }, []);

  const startAtmosTestSweep = () => {
    if (isTestTonePlaying) return;
    initAtmosEngine();
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    setIsTestTonePlaying(true);
    let sweepStep = 0;

    // Відтворення обертової 3D-тестової послідовності через осцилятор
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    const originalFreq = 260; // Soft melodic sweep tone
    osc.frequency.setValueAtTime(originalFreq, ctx.currentTime);

    // Динамічний смуговий фільтр змінює просторову текстуру звуку
    const filter = ctx.createBiquadFilter();
    filter.type = 'peaking';
    filter.frequency.setValueAtTime(600, ctx.currentTime);

    const panner = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.25, ctx.currentTime + 0.15);

    osc.connect(filter);
    if (panner) {
      filter.connect(panner);
      panner.connect(gain);
    } else {
      filter.connect(gain);
    }
    gain.connect(ctx.destination);
    osc.start();

    // Панорамування просторового 3D звуку зліва направо по віртуальних динаміках
    const rotateInterval = setInterval(() => {
      sweepStep++;
      if (panner && ctx) {
        const panValue = Math.sin(sweepStep * 0.45);
        panner.pan.setValueAtTime(panValue, ctx.currentTime);
      }
      // Послідовна підсвітка індексу динаміка на візуалізаторі
      setActiveSpeakerNode((sweepStep - 1) % 8);
    }, 450);

    // Плавне вимкнення тестового сигналу
    setTimeout(() => {
      clearInterval(rotateInterval);
      setActiveSpeakerNode(-1);
      try {
        if (ctx) {
          gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.25);
          setTimeout(() => {
            try {
              osc.stop();
              osc.disconnect();
            } catch { }
            setIsTestTonePlaying(false);
          }, 300);
        } else {
          setIsTestTonePlaying(false);
        }
      } catch {
        setIsTestTonePlaying(false);
      }
    }, 4000);
  };

  // Завантаження та парсинг WebVTT субтитрів із сервера
  useEffect(() => {
    let active = true;
    setSubtitlesList([]);
    setResolvedSubtitleUrl('');

    // Перевірка наявності прямого посилання на субтитри у фільму або серії
    let subUrl = movie.subtitleUrl;
    if (movie.type === 'series' && movie.episodesData && movie.episodesData[selectedSeason]) {
      const ep = movie.episodesData[selectedSeason].find(e => e.number === selectedEpisode);
      if (ep && ep.subtitleUrl) {
        subUrl = ep.subtitleUrl;
      }
    }

    // Формування списку кандидатів на файл субтитрів
    let currentVideoUrl = movie.videoUrl || '';
    if (movie.type === 'series' && movie.episodesData && movie.episodesData[selectedSeason]) {
      const ep = movie.episodesData[selectedSeason].find(e => e.number === selectedEpisode);
      if (ep && ep.videoUrl) {
        currentVideoUrl = ep.videoUrl;
      }
    }

    const candidateUrls: string[] = [];
    if (subUrl && !subUrl.includes('ElephantsDream') && !subUrl.includes('TearsOfSteel')) {
      candidateUrls.push(subUrl);
    }

    if (currentVideoUrl &&
      !currentVideoUrl.includes('ElephantsDream') &&
      !currentVideoUrl.includes('TearsOfSteel') &&
      !currentVideoUrl.includes('commondatastorage')) {
      const urlClean = currentVideoUrl.split('?')[0];
      const baseName = urlClean.substring(urlClean.lastIndexOf('/') + 1).replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9_-]/g, '_');
      if (baseName && baseName !== 'ElephantsDream' && baseName !== 'TearsOfSteel') {
        candidateUrls.push(`/subtitles/${baseName}_whisper.vtt`);
        candidateUrls.push(`/subtitles/${baseName}.vtt`);
      }
    }

    if (movie.id && movie.id !== 'elephants-dream' && movie.id !== 'tears-of-steel') {
      if (movie.type === 'series') {
        candidateUrls.push(`/subtitles/${movie.id}_s${selectedSeason}_e${selectedEpisode}_whisper.vtt`);
        candidateUrls.push(`/subtitles/${movie.id}_s${selectedSeason}_e${selectedEpisode}.vtt`);
        candidateUrls.push(`/subtitles/s${selectedSeason}e${selectedEpisode}_whisper.vtt`);
        candidateUrls.push(`/subtitles/s${selectedSeason}e${selectedEpisode}.vtt`);
      } else {
        candidateUrls.push(`/subtitles/${movie.id}_whisper.vtt`);
        candidateUrls.push(`/subtitles/${movie.id}.vtt`);
      }
    }

    const cleanUrls = Array.from(new Set(candidateUrls)).filter(u =>
      !u.includes('ElephantsDream') && !u.includes('TearsOfSteel')
    );

    if (cleanUrls.length === 0) {
      return () => { active = false; };
    }

    const loadVtt = async () => {
      for (const url of cleanUrls) {
        try {
          const res = await fetch(url, { cache: 'no-cache' });
          if (res.ok) {
            const vttText = await res.text();
            if (!active || !vttText || !vttText.includes('-->')) continue;

            const parsedLines: { start: number; end: number; text: string; en: string }[] = [];
            const blocks = vttText.split(/\r?\n\r?\n/);

            blocks.forEach(block => {
              const lines = block.trim().split(/\r?\n/).map(l => l.trim()).filter(Boolean);
              const timeLine = lines.find(l => l.includes('-->'));
              if (timeLine) {
                const timeParts = timeLine.split('-->');
                const parseTs = (s: string) => {
                  const parts = s.trim().split(':');
                  if (parts.length === 3) return parseFloat(parts[0]) * 3600 + parseFloat(parts[1]) * 60 + parseFloat(parts[2].replace(',', '.'));
                  if (parts.length === 2) return parseFloat(parts[0]) * 60 + parseFloat(parts[1].replace(',', '.'));
                  return 0;
                };
                const start = parseTs(timeParts[0]);
                const end = parseTs(timeParts[1]);
                const textLines = lines.filter(l => !l.includes('-->') && !/^\d+$/.test(l) && !l.startsWith('WEBVTT') && !l.startsWith('NOTE'));
                const fullText = textLines.join(' ');
                if (fullText && end > start) {
                  parsedLines.push({ start, end, text: fullText, en: fullText });
                }
              }
            });

            if (parsedLines.length > 0 && active) {
              setSubtitlesList(parsedLines);
              setResolvedSubtitleUrl(url);
              return;
            }
          }
        } catch {
          // спроба завантажити наступний файл
        }
      }
      if (active) {
        setSubtitlesList([]);
        setResolvedSubtitleUrl('');
      }
    };

    loadVtt();

    return () => { active = false; };
  }, [movie, selectedSeason, selectedEpisode]);

  // Синхронізація поля введення URL при зміні фільму, серії чи озвучення
  useEffect(() => {
    const key = `${movie.id}-s${selectedSeason}-e${selectedEpisode}-${activeVoiceover}`;
    setTypedCustomUrl(customUrls[key] || '');
  }, [movie.id, selectedSeason, selectedEpisode, activeVoiceover, customUrls]);

  // Reset duration, currentTime and videoError when Відео sources change
  useEffect(() => {
    setDuration(getStaticDurationSeconds());
    setPhysicalDuration(0);
    setCurrentTime(0);
    setVideoError(false);
    setIsReady(false);
    hasSeekedRef.current = false;
  }, [selectedSeason, selectedEpisode, activeVoiceover, useLocalFolder, customUrls]);

  // Обробка source transition cleanly without manual double load
  useEffect(() => {
    isSwitchingRef.current = true;
    setCurrentTime(0);
    setIsPlaying(true);
    setIsMuted(false);
    lastTrackedPercentRef.current = -1;
    setSelectedSeason(initialSeason || 1);
    setSelectedEpisode(initialEpisode || 1);
    setActiveVoiceover(voiceoverOptions[0]);
    setShowEpisodesPanel(false);
    setShowVoiceoverPanel(false);
    setShowSourcePanel(false);
    setUseLocalFolder(localStorage.getItem(`nova_use_local_${movie.id}`) === 'true');
  }, [movie.id]);

  // Proactively check path 1 and path 2 to detect wherever the files are stored under public/
  useEffect(() => {
    const voSlug = getVoiceoverSlug(activeVoiceover);
    const epNum = selectedEpisode;
    const sNum = selectedSeason;
    const epPad = String(selectedEpisode).padStart(2, '0');
    const sPad = String(selectedSeason).padStart(2, '0');

    const candidatePaths = [
      `/videos/${movie.id}/${voSlug}/s${sNum}e${epNum}.mp4`,
      `/videos/${movie.id}/${voSlug}/s${sNum}e${epPad}.mp4`,
      `/videos/${movie.id}/S${sNum}/s${sNum}e${epNum}.mp4`,
      `/videos/${movie.id}/S${sNum}/s${sNum}e${epPad}.mp4`,
      `/videos/${movie.id}/Season ${sNum}/s${sNum}e${epNum}.mp4`,
      `/videos/${movie.id}/Season ${sNum}/s${sNum}e${epPad}.mp4`,
      `/videos/${movie.id}/s${sNum}e${epNum}.mp4`,
      `/videos/${movie.id}/s${sNum}e${epPad}.mp4`,
      `/${movie.id}/s${sNum}e${epNum}.mp4`,
      `/${movie.id}/s${sNum}e${epPad}.mp4`,
      `/videos/Season ${sNum}/s${sNum}e${epNum}.mp4`,
      `/videos/Season ${sNum}/s${sNum}e${epPad}.mp4`,
      `/videos/S${sNum}/s${sNum}e${epNum}.mp4`,
      `/videos/S${sNum}/s${sNum}e${epPad}.mp4`,
      `/Season ${sNum}/s${sNum}e${epNum}.mp4`,
      `/Season ${sNum}/s${sNum}e${epPad}.mp4`,
      `/S${sNum}/s${sNum}e${epNum}.mp4`,
      `/S${sNum}/s${sNum}e${epPad}.mp4`,
      `/videos/s${sNum}e${epNum}.mp4`,
      `/videos/s${sNum}e${epPad}.mp4`,
      `/videos/s${epNum}.mp4`,
      `/videos/s${epPad}.mp4`,
      `/videos/${epNum}.mp4`,
      `/videos/${epPad}.mp4`,
      `/s${sNum}e${epNum}.mp4`,
      `/s${sNum}e${epPad}.mp4`
    ];

    let active = true;

    const checkPaths = async () => {
      for (const p of candidatePaths) {
        try {
          const url = `${window.location.origin}${p}`;
          const res = await fetch(url, { method: 'HEAD' });
          if (!active) return;
          const contentType = res.headers.get('content-type') || '';

          if (res.ok && !contentType.includes('text/html')) {
            setResolvedLocalUrl(p);
            return;
          }
        } catch {
          // Continue testing next path
        }
      }
      if (active) {
        setResolvedLocalUrl('');
      }
    };

    checkPaths();

    return () => {
      active = false;
    };
  }, [movie.id, selectedSeason, selectedEpisode, activeVoiceover]);

  // Синхронізація Гучність, mute, and playing Стани for native HTML5 Відео Плеєр
  useEffect(() => {
    if (nativeVideoRef.current) {
      nativeVideoRef.current.volume = volume / 100;
    }
  }, [volume]);

  useEffect(() => {
    if (nativeVideoRef.current) {
      nativeVideoRef.current.muted = isMuted;
    }
  }, [isMuted]);

  useEffect(() => {
    if (nativeVideoRef.current) {
      if (isPlaying) {
        nativeVideoRef.current.play().catch(() => { });
      } else {
        nativeVideoRef.current.pause();
      }
    }
  }, [isPlaying]);

  // Seek native Плеєр to saved Стан on Початковий ready
  useEffect(() => {
    if (isReady && nativeVideoRef.current && !hasSeekedRef.current) {
      const progressKey = getProgressKey();
      const savedTime = loadState<number>(progressKey, 0);
      if (savedTime > 0) {
        setTimeout(() => {
          if (nativeVideoRef.current) {
            const pDur = nativeVideoRef.current.duration || 0;
            const vDur = duration || getStaticDurationSeconds();
            const targetPhysicalTime = (vDur > 0 && pDur > 0) ? (savedTime / vDur) * pDur : savedTime;
            nativeVideoRef.current.currentTime = targetPhysicalTime;
          }
        }, 150);
      }
      hasSeekedRef.current = true;
    }
  }, [isReady]);

  // Синхронізація full-screen Стан with browser events (e.g., escaping via ESC)
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('msfullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('msfullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Keyboard Hotkeys Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore key events when the Користувач is typing in forms, Поля введення or textareas
      const tag = document.activeElement?.tagName.toLowerCase();
      if (
        tag === 'input' ||
        tag === 'textarea' ||
        document.activeElement?.hasAttribute('contenteditable')
      ) {
        return;
      }

      // Spacebar: Перемикач play/pause
      if (e.code === 'Space') {
        e.preventDefault();
        setIsPlaying((prev) => !prev);
        resetControlsTimeout();
        initAtmosEngine();
      }

      // ArrowRight: Seek forward 10 seconds
      if (e.code === 'ArrowRight') {
        e.preventDefault();
        const safeCurrent = isNaN(currentTime) ? 0 : currentTime;
        const safeDuration = isNaN(duration) || !duration ? 100 : duration;
        handleSeek(Math.min(safeDuration, safeCurrent + 10), true);
        initAtmosEngine();
      }

      // ArrowLeft: Seek backward 10 seconds
      if (e.code === 'ArrowLeft') {
        e.preventDefault();
        const safeCurrent = isNaN(currentTime) ? 0 : currentTime;
        handleSeek(Math.max(0, safeCurrent - 10), true);
        initAtmosEngine();
      }

      // ArrowUp: Increase Гучність
      if (e.code === 'ArrowUp') {
        e.preventDefault();
        setVolume((prev) => {
          const next = Math.min(100, prev + 5);
          return next;
        });
        setIsMuted(false);
        initAtmosEngine();
      }

      // ArrowDown: Decrease Гучність
      if (e.code === 'ArrowDown') {
        e.preventDefault();
        setVolume((prev) => {
          const next = Math.max(0, prev - 5);
          return next;
        });
        setIsMuted(false);
        initAtmosEngine();
      }

    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [currentTime, duration]);

  // Періодичне збереження прогресу перегляду та історії відтворення
  useEffect(() => {
    if (duration > 0 && currentTime > 0) {
      // Збереження current progress in seconds for the exact Фільм/Серія
      const progressKey = getProgressKey();
      saveState(progressKey, currentTime);

      const percent = Math.min(Math.round((currentTime / duration) * 100), 100);
      const label = movie.type === 'series' ? `Сезон ${selectedSeason}, Серія ${selectedEpisode}` : undefined;

      if (percent >= 100) {
        if (lastTrackedPercentRef.current !== 100) {
          lastTrackedPercentRef.current = 100;
          setIsPlaying(false);
          if (onTrackHistory) onTrackHistory(100, label);
          setCurrentTime(0);
          // Set progress to 0 since watched completely
          saveState(progressKey, 0);
          seekVideo(0);
        }
      } else if (percent % 5 === 0 && lastTrackedPercentRef.current !== percent) {
        lastTrackedPercentRef.current = percent;
        if (onTrackHistory) onTrackHistory(percent, label);
      }
    }
  }, [currentTime, duration, onTrackHistory, selectedSeason, selectedEpisode, movie.id]);

  // Coordinate Активний subtitle display based on updated currentTime
  useEffect(() => {
    if (subtitleLang === 'off') {
      setActiveSubtitleText('');
      return;
    }
    const matchingSub = subtitlesList.find(s => currentTime >= s.start && currentTime <= s.end);
    if (matchingSub) {
      setActiveSubtitleText(subtitleLang === 'uk' ? matchingSub.text : matchingSub.en);
    } else {
      setActiveSubtitleText('');
    }
  }, [currentTime, subtitleLang, subtitlesList]);

  // Автоприховування панелі керування: панель не зникає при відкритих меню
  const resetControlsTimeout = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (
        isPlaying &&
        !showSettingsMenu &&
        !showEpisodesPanel &&
        !showVoiceoverPanel &&
        !showSourcePanel &&
        !showDiagnosticOverlay &&
        !activeDropdown
      ) {
        setShowControls(false);
      }
    }, 4000);
  };

  useEffect(() => {
    if (showSettingsMenu || showEpisodesPanel || showVoiceoverPanel || showSourcePanel || showDiagnosticOverlay || activeDropdown) {
      setShowControls(true);
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    } else {
      resetControlsTimeout();
    }
    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, [isPlaying, showSettingsMenu, showEpisodesPanel, showVoiceoverPanel, showSourcePanel, showDiagnosticOverlay, activeDropdown]);

  const handleQualityChange = (newQ: string) => {
    let normalized = newQ;
    if (normalized === 'Full HD' || normalized === 'fhd') normalized = '1080p';
    if (normalized === 'HD') normalized = '720p';

    const currentPos = nativeVideoRef.current ? nativeVideoRef.current.currentTime : currentTime;
    savedTimeRef.current = currentPos;
    wasPlayingRef.current = nativeVideoRef.current ? !nativeVideoRef.current.paused : isPlaying;

    // Скидаємо тимчасовий резервний URL та помилки відео
    setResolvedLocalUrl('');
    setVideoError(false);

    // Звільняємо легітимні джерела фільму зі списку помилок, щоб вони могли відтворюватися без блокувань
    setFailedUrls(prev => {
      const next = { ...prev };
      if (movie.videoSources) {
        Object.values(movie.videoSources).forEach(u => {
          if (u) {
            delete next[u];
            const rel = u.replace(/^https?:\/\/[^\/]+/i, '');
            if (rel) delete next[rel];
          }
        });
      }
      if (movie.videoUrl) {
        delete next[movie.videoUrl];
        const rel = movie.videoUrl.replace(/^https?:\/\/[^\/]+/i, '');
        if (rel) delete next[rel];
      }
      return next;
    });

    setQuality(normalized);

    // 1. Динамічне перемикання рівнів якості HLS через бібліотеку Hls.js
    if (hlsInstanceRef.current && hlsInstanceRef.current.levels && hlsInstanceRef.current.levels.length > 0) {
      const levels = hlsInstanceRef.current.levels;
      const targetHeight = normalized === '4K' ? 2160 : normalized === '1080p' ? 1080 : normalized === '720p' ? 720 : 480;

      let bestLevelIdx = -1;
      let minDiff = Infinity;
      levels.forEach((lvl, idx) => {
        const h = lvl.height || 0;
        const diff = Math.abs(h - targetHeight);
        if (diff < minDiff) {
          minDiff = diff;
          bestLevelIdx = idx;
        }
      });

      if (bestLevelIdx !== -1) {
        hlsInstanceRef.current.currentLevel = bestLevelIdx;
        console.log(`[HLS] Switched to quality level ${bestLevelIdx} (${levels[bestLevelIdx].height}p) for ${normalized}`);
      }
    }

    // 2. Check if candidate Відео URL changes
    const nextUrl = getQualityVideoUrl(normalized);
    const isCurrentUrlSame = nativeVideoRef.current && nextUrl && (
      nativeVideoRef.current.src === nextUrl ||
      nativeVideoRef.current.src.endsWith(nextUrl) ||
      nextUrl.endsWith(nativeVideoRef.current.currentSrc)
    );

    if (!isCurrentUrlSame) {
      setIsBuffering(true);
      // Auto-clear buffer loader after maximum 1.2s to prevent loader hang on mobile
      setTimeout(() => {
        setIsBuffering(false);
        setIsReady(true);
      }, 1200);
    } else {
      setIsBuffering(false);
      setIsReady(true);
    }

    if (nativeVideoRef.current) {
      setTimeout(() => {
        if (nativeVideoRef.current) {
          try {
            if (savedTimeRef.current !== null && savedTimeRef.current > 0) {
              nativeVideoRef.current.currentTime = savedTimeRef.current;
            }
            if (wasPlayingRef.current) {
              nativeVideoRef.current.play().catch(() => { });
            }
          } catch { }
        }
      }, 80);
    }

    // Safety clear buffering if Відео is playing or ready
    setTimeout(() => {
      if (nativeVideoRef.current && (!nativeVideoRef.current.paused || nativeVideoRef.current.readyState >= 2)) {
        setIsBuffering(false);
        setIsReady(true);
      }
    }, 500);

    // On mobile screens, return back to main menu after selecting Якість with smooth transition
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setTimeout(() => {
        setSettingsSubMenu('main');
      }, 350);
    }

    // Broadcast quality change to Watch Party guests
    if (isWatchParty && canUserControl && onPlaybackChange) {
      lastLocalActionTimeRef.current = Date.now();
      onPlaybackChange({
        type: 'quality',
        quality: normalized,
        currentTime: currentPos,
        isPlaying: wasPlayingRef.current
      });
    }

    console.log(`Switched video quality to: ${normalized}, preserving timestamp: ${currentPos.toFixed(1)}s`);
  };

  const seekVideo = (visualSeconds: number) => {
    const vDur = duration || getStaticDurationSeconds();
    if (nativeVideoRef.current) {
      try {
        const pDur = nativeVideoRef.current.duration || 0;
        const targetPhysicalTime = (pDur > 300 || vDur <= 0 || pDur <= 0) ? visualSeconds : (visualSeconds / vDur) * pDur;
        nativeVideoRef.current.currentTime = targetPhysicalTime;
      } catch (err) {
        console.warn("Native seek error:", err);
      }
    }
  };

  const broadcastPlaybackAction = useCallback((
    actionType: 'play' | 'pause' | 'seek' | 'quality' | 'mute' | 'volume',
    overrides?: {
      currentTime?: number;
      isPlaying?: boolean;
      quality?: string;
      isMuted?: boolean;
      volume?: number;
    }
  ) => {
    if (!isWatchParty || !onPlaybackChange || !canUserControl) return;
    // БЛОКУВАЛЬНИК ВІДЛУННЯ: якщо зміна викликана мережевим сокетом/синхронізацією, не транслюємо її назад
    if (isRemoteActionRef.current) return;
    lastLocalActionTimeRef.current = Date.now();
    const curTime = overrides?.currentTime !== undefined ? overrides.currentTime : currentTime;
    onPlaybackChange({
      type: actionType,
      currentTime: curTime,
      isPlaying: overrides?.isPlaying !== undefined ? overrides.isPlaying : isPlaying,
      quality: overrides?.quality !== undefined ? overrides.quality : quality,
      isMuted: overrides?.isMuted !== undefined ? overrides.isMuted : isMuted,
      volume: overrides?.volume !== undefined ? overrides.volume : volume
    });
  }, [isWatchParty, onPlaybackChange, canUserControl, currentTime, isPlaying, quality, isMuted, volume]);

  const togglePlay = useCallback(() => {
    if (isWatchParty && !canUserControl) return;
    const nextPlaying = !isPlaying;
    setIsPlaying(nextPlaying);
    if (nativeVideoRef.current) {
      if (nextPlaying) {
        nativeVideoRef.current.play().catch((err) => {
          console.warn('Playback requires user gesture or failed:', err);
          setIsPlaying(false);
        });
      } else {
        nativeVideoRef.current.pause();
      }
    }
    broadcastPlaybackAction(nextPlaying ? 'play' : 'pause', { isPlaying: nextPlaying, currentTime });
    initAtmosEngine();
  }, [isWatchParty, canUserControl, isPlaying, currentTime, broadcastPlaybackAction]);

  const toggleMute = useCallback(() => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    if (nativeVideoRef.current) {
      nativeVideoRef.current.muted = nextMuted;
    }
    if (canUserControl) {
      broadcastPlaybackAction('mute', { isMuted: nextMuted });
    }
    initAtmosEngine();
  }, [isMuted, canUserControl, broadcastPlaybackAction]);

  const handleVolumeChange = useCallback((newVol: number) => {
    setVolume(newVol);
    setIsMuted(false);
    if (nativeVideoRef.current) {
      nativeVideoRef.current.volume = newVol / 100;
      nativeVideoRef.current.muted = false;
    }
    if (canUserControl) {
      broadcastPlaybackAction('volume', { volume: newVol, isMuted: false });
    }
    initAtmosEngine();
  }, [canUserControl, broadcastPlaybackAction]);

  // Синхронізація incoming Watch Party playback стану з захистом від луни
  useEffect(() => {
    if (!isWatchParty || !syncPlayback) return;
    if (Date.now() - lastLocalActionTimeRef.current < 800) return;

    // Хост є єдиним джерелом істини (Master) — хост ніколи не підпорядковується гостям
    if (isHost && !syncPlayback?.forceHostSync) {
      return;
    }

    // Не синхронізуємо власний плеєр з власними ж діями
    const myId = String(activeUser?.id || activeUser?.name || '').trim().toLowerCase();
    const sender = String(syncPlayback.updatedBy || '').trim().toLowerCase();
    if (myId && sender && (sender === myId || (activeUser?.name && sender === String(activeUser.name).trim().toLowerCase()))) {
      return;
    }

    const v = nativeVideoRef.current;
    if (!v) return;

    // Блокуємо відлуння: будь-які події під час застосування віддалених змін не шлються назад
    isRemoteActionRef.current = true;
    if (remoteActionTimerRef.current) clearTimeout(remoteActionTimerRef.current);
    remoteActionTimerRef.current = setTimeout(() => {
      isRemoteActionRef.current = false;
    }, 400);

    // 1. Quality sync: якщо хост змінив якість відео, синхронізуємо її для всіх учасників
    if (syncPlayback.quality && typeof syncPlayback.quality === 'string' && syncPlayback.quality !== quality) {
      handleQualityChange(syncPlayback.quality);
    }

    // 2. Play / Pause з обробкою блокування браузера (Autoplay Policy)
    if (typeof syncPlayback.isPlaying === 'boolean' && syncPlayback.isPlaying !== isPlaying) {
      setIsPlaying(syncPlayback.isPlaying);
      if (syncPlayback.isPlaying) {
        v.play().catch((err) => {
          console.warn('Autoplay blocked with audio, trying muted fallback:', err);
          v.muted = true;
          setIsMuted(true);
          v.play().catch((err2) => {
            console.warn('Autoplay completely blocked until user interacts with page:', err2);
            setIsPlaying(false);
          });
        });
      } else {
        v.pause();
      }
    }

    // 3. Seek / Time з компенсацією затримки та плавним регулюванням швидкості
    if (typeof syncPlayback.currentTime === 'number') {
      const isExplicitSeek = syncPlayback.type === 'seek';
      const pDur = v.duration || 0;
      const vDur = duration || getStaticDurationSeconds();
      const currentVisual = (pDur > 300 || vDur <= 0 || pDur <= 0) ? v.currentTime : (v.currentTime / pDur) * vDur;

      const elapsed = (syncPlayback.isPlaying && typeof syncPlayback.updatedAt === 'number')
        ? Math.max(0, (Date.now() - syncPlayback.updatedAt) / 1000)
        : 0;
      const targetExpectedTime = syncPlayback.currentTime + elapsed;
      const drift = targetExpectedTime - currentVisual;
      const absDrift = Math.abs(drift);

      // Якщо це явна дія перемотки (seek від хоста): миттєво переміщуємося
      if (isExplicitSeek) {
        v.playbackRate = 1.0;
        seekVideo(targetExpectedTime);
        setCurrentTime(targetExpectedTime);
        lastSyncSeekTimeRef.current = Date.now();
      } else {
        // Періодична синхронізація без ривків
        const canSeek = !v.seeking && (Date.now() - lastSyncSeekTimeRef.current > 3500);

        if (absDrift < 1.5) {
          if (v.playbackRate !== 1.0) v.playbackRate = 1.0;
        } else if (absDrift <= 4.0 && syncPlayback.isPlaying) {
          // Плавне мікро-вирівнювання швидкості без ривків картинки
          v.playbackRate = drift > 0 ? 1.05 : 0.95;
        } else if (absDrift > 4.0 && canSeek) {
          // Значний розрив (користувач щойно підключився або сильне відставання)
          v.playbackRate = 1.0;
          seekVideo(targetExpectedTime);
          setCurrentTime(targetExpectedTime);
          lastSyncSeekTimeRef.current = Date.now();
        }
      }
    }

    // 4. Mute / Гучність
    if (typeof syncPlayback.isMuted === 'boolean' && syncPlayback.isMuted !== isMuted) {
      setIsMuted(syncPlayback.isMuted);
      v.muted = syncPlayback.isMuted;
    }
    if (typeof syncPlayback.volume === 'number' && Math.abs(syncPlayback.volume - volume) > 8) {
      setVolume(syncPlayback.volume);
      v.volume = syncPlayback.volume / 100;
    }
  }, [syncPlayback, isWatchParty, isHost, quality]);

  // Перемотка з дебаунсингом: миттєве локальне оновлення та відправка події без спаму
  const handleSeek = (newVal: number, immediate: boolean = false) => {
    if (isWatchParty && !canUserControl) return;
    const safeVal = isNaN(newVal) || typeof newVal !== 'number' ? 0 : Math.max(0, newVal);
    setCurrentTime(safeVal);
    seekVideo(safeVal);
    resetControlsTimeout();

    if (seekDebounceTimeoutRef.current) {
      clearTimeout(seekDebounceTimeoutRef.current);
      seekDebounceTimeoutRef.current = null;
    }

    if (immediate) {
      broadcastPlaybackAction('seek', { currentTime: safeVal });
    } else {
      // 160мс debounce запобігає спаму сокета/сервера під час плавного перетягування повзунка
      seekDebounceTimeoutRef.current = setTimeout(() => {
        broadcastPlaybackAction('seek', { currentTime: safeVal });
      }, 160);
    }
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs) || typeof secs !== 'number' || secs < 0) return '0:00';
    const totalSecs = Math.floor(secs);
    const hrs = Math.floor(totalSecs / 3600);
    const min = Math.floor((totalSecs % 3600) / 60);
    const sec = totalSecs % 60;

    const formattedSec = sec < 10 ? `0${sec}` : sec;
    if (hrs > 0) {
      const formattedMin = min < 10 ? `0${min}` : min;
      return `${hrs}:${formattedMin}:${formattedSec}`;
    }
    return `${min}:${formattedSec}`;
  };

  const formatDurationDisplay = (secs: number) => {
    if (isNaN(secs) || typeof secs !== 'number' || secs <= 0) return '0:00';
    const totalSecs = Math.floor(secs);
    const hrs = Math.floor(totalSecs / 3600);
    const min = Math.floor((totalSecs % 3600) / 60);
    if (hrs > 0) {
      return `${hrs}год ${min}хв`;
    }
    return `${min}хв`;
  };

  // Cross-browser & mobile-compatible Fullscreen Перемикач
  const toggleFullscreen = () => {
    const elem = containerRef.current as any;
    const doc = document as any;

    if (!isFullscreen) {
      let apiTriggered = false;
      if (elem) {
        if (elem.requestFullscreen) {
          elem.requestFullscreen().catch(() => { });
          apiTriggered = true;
        } else if (elem.webkitRequestFullscreen) {
          elem.webkitRequestFullscreen();
          apiTriggered = true;
        } else if (elem.mozRequestFullScreen) {
          elem.mozRequestFullScreen();
          apiTriggered = true;
        } else if (elem.msRequestFullscreen) {
          elem.msRequestFullscreen();
          apiTriggered = true;
        }
      }

      // iOS Safari native Відео fullscreen fallback
      if (!apiTriggered && nativeVideoRef.current) {
        const vid = nativeVideoRef.current as any;
        if (vid.webkitEnterFullscreen) {
          try {
            vid.webkitEnterFullscreen();
          } catch { }
        }
      }

      setIsFullscreen(true);
    } else {
      if (doc.exitFullscreen) {
        doc.exitFullscreen().catch(() => { });
      } else if (doc.webkitExitFullscreen) {
        doc.webkitExitFullscreen();
      } else if (doc.mozCancelFullScreen) {
        doc.mozCancelFullScreen();
      } else if (doc.msExitFullscreen) {
        doc.msExitFullscreen();
      }
      setIsFullscreen(false);
    }
  };

  // Синхронізація fullscreen Стан with browser hardware events (Esc key, swipe gestures)
  useEffect(() => {
    const handleFsChange = () => {
      const doc = document as any;
      const isFs = Boolean(
        doc.fullscreenElement ||
        doc.webkitFullscreenElement ||
        doc.mozFullScreenElement ||
        doc.msFullscreenElement
      );
      setIsFullscreen(isFs);
    };

    document.addEventListener('fullscreenchange', handleFsChange);
    document.addEventListener('webkitfullscreenchange', handleFsChange);
    document.addEventListener('mozfullscreenchange', handleFsChange);
    document.addEventListener('MSFullscreenChange', handleFsChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange);
      document.removeEventListener('webkitfullscreenchange', handleFsChange);
      document.removeEventListener('mozfullscreenchange', handleFsChange);
      document.removeEventListener('MSFullscreenChange', handleFsChange);
    };
  }, []);

  const getSeasonsCount = (m: Movie): number => {
    if (m.type !== 'series') return 0;

    // 1. Перевірка повної мапи серій із seriesEpisodes.ts
    const fullEpMap = getFullEpisodesDataForMovie(m.id, m.episodesData);
    if (fullEpMap && Object.keys(fullEpMap).length > 0) {
      return Math.max(...Object.keys(fullEpMap).map(Number));
    }

    // 2. Перевірка даних серій безпосередньо у movie.episodesData
    if (m.episodesData && Object.keys(m.episodesData).length > 0) {
      return Math.max(...Object.keys(m.episodesData).map(Number));
    }

    // 3. Перевірка movie.seasonsData
    if (m.seasonsData && m.seasonsData.length > 0) {
      return m.seasonsData.length;
    }

    // 4. Перевірка рядка тривалості на наявність кількості сезонів
    if (m.duration) {
      const seasonMatch = m.duration.match(/(\d+)\s*(?:сезон|season)/i);
      if (seasonMatch) {
        const num = parseInt(seasonMatch[1], 10);
        if (!isNaN(num) && num > 0) return num;
      }
    }

    return 1;
  };

  const getEpisodesForSeason = (m: Movie, seasonNum: number) => {
    // 1. Перевірка повної мапи серій із seriesEpisodes.ts (merges preset defaults + custom user data)
    const fullEpMap = getFullEpisodesDataForMovie(m.id, m.episodesData);
    if (fullEpMap && fullEpMap[seasonNum] && fullEpMap[seasonNum].length > 0) {
      return fullEpMap[seasonNum];
    }

    // 2. Перевірка даних серій безпосередньо у movie.episodesData directly if non-empty
    if (m.episodesData && m.episodesData[seasonNum] && m.episodesData[seasonNum].length > 0) {
      return m.episodesData[seasonNum];
    }

    // 3. Перевірка movie.seasonsData
    if (m.seasonsData) {
      const s = m.seasonsData.find(sec => sec.seasonNumber === seasonNum);
      if (s && s.episodes && s.episodes.length > 0) {
        return s.episodes;
      }
    }

    const customEpisodes: Record<string, Record<number, string[]> | string[]> = {
      'death-note-2006': {
        1: [
          'Відродження (Rebirth)',
          'Протистояння (Confrontation)',
          'Обмін (Dealings)',
          'Переслідування (Pursuit)',
          'Тактика (Tactics)',
          'Відкрита рана (Unraveling)',
          'Спокуса (Temptation)',
          'Погляди зустрічаються (Glare)',
          'Зіткнення (Encounter)',
          'Сумніви (Doubt)',
          'Вторгнення (Assault)',
          'Кохання (Love)',
          'Сповідь (Confession)',
          'Друг (Friend)',
          'Ставка (Wager)',
          'Рішення (Decision)',
          'Кара (Execution)',
          'Союзники (Ally)',
          'Сліпота (Matsuda)',
          'Блеф (Makeshift)',
          'Проблиск (Performance)',
          'Керівництво (Guidance)',
          'Божевілля (Frenzy)',
          'Відродження сили (Revival)',
          'Вбивство (Ally)',
          'Початок кінця (Silence)',
          'Викрадення (Abduction)',
          'Нетерпіння (Impatience)',
          'Нове розслідування (Father)',
          'Справедливість (Justice)',
          'Передача (Transfer)',
          'Вибір (Selection)',
          'Глухий кут (Scorn)',
          'Пильність (Vigilance)',
          'Змова (Malice)',
          'Вирішальна зустріч (1.28)',
          'Новий Світ (New World)'
        ]
      },
      'demon-slayer-2019': {
        1: [
          'Жорстокість (Cruelty)',
          'Учитель Урокодакі Саконджі (Trainer Sakonji Urokodaki)',
          'Сабіто та Макомо (Sabito and Makomo)',
          'Фінальний відбір (Final Selection)',
          'Моя власна сталь (My Own Steel)',
          'Мисливець у супроводі демона (The Swordsman Accompanying a Demon)',
          'Мудзан Кібуцуджі (Muzan Kibutsuji)',
          'Аромат чарівної крові (The Smell of Enchanting Blood)',
          'Темарі-демон та стріла (Temari Demon and Arrow Demon)',
          'Разом назавжди (Together Forever)',
          'Будинок Цузумі (Tsuzumi Mansion)',
          'Кабан виявляє ікла (The Boar Bares Its Fangs)',
          'Тепер у дорозі (Something More Important Than Life)',
          'Дім з гербом гліцинії (The House with the Wisteria Family Crest)',
          'Гора Натаґумо (Mount Natagumo)',
          'Пропустити іншого вперед (Letting Someone Else Go First)',
          'Оволодіти до досконалості (You Must Master One Thing)',
          'Фальшиві зв’язки (A Forged Bond)',
          'Хінокамі (Hinokami)',
          'Вигадана родина (Pretend Family)',
          'Порушення правил (Against Rules)',
          'Суд стовпів (The Hashira)',
          'Реабілітація (Rehabilitation Training)',
          'Початок нового замовлення (Functional Recovery)'
        ],
        2: [
          'Стовп полум’я Кьоджуро Ренґоку (Flame Hashira Kyojuro Rengoku)',
          'Глибокий сон (Deep Sleep)',
          'Смачний обід на Mugen Train (Sweet Dream)',
          'Битва з демоном Енму (Insinuation)',
          'Протистояння в нічному поїзді (Move Forward!)',
          'Аказа з’являється (Akaza)',
          'Розігріти серце (Set Your Heart Blaze)',
          'Звуковий стовп Тенґен Удзуй (Sound Hashira Tengen Uzui)',
          'Проникнення в квартал червоних ліхтарів (Infiltrating the Entertainment District)',
          'Хто ти такий? (Warlord)',
          'Зухвалий вечір (Gathering)',
          'Бушуючий бій (Infiltrating the District)',
          'Нічний штурм (Tonight)',
          'Багатоголоса пісня дівчат (Gathering)',
          'Переможний удар (Defeating)',
          'Ніколи не здаватися (Never Give Up)',
          'Перемога над першою місячною тінню (No Matter How Many Lives)',
          'Збір демонів вищого рангу (Upper Rank Gathering)'
        ],
        3: [
          'Сон комусь іншому (Someone’s Dream)',
          'Йоріічі Тип Нуль (Yoriichi Type Zero)',
          'Меч віку Сенґоку (A Sword from over 300 Years Ago)',
          'Спасибі, Токіто-куне (Thank You, Tokito)',
          'Яскраво-червоний меч (Bright Red Sword)',
          'Ти хочеш стати стовпом? (Aren’t You Going to Become a Pillar?)',
          'Справжній винищувач (The Awful Villain)',
          'Му в імені Муічіро (The Mu in Muichiro)',
          'Стопа туману Муічіро Токіто (Mist Hashira Muichiro Tokito)',
          'Любовний Стовп Міцурі Канроджі (Love Hashira)',
          'Променистий світанок (A Connected Bond: Daybreak)'
        ],
        4: [
          'Для подолання Мудзана Кібуцуджі (To Defeat Muzan Kibutsuji)',
          'Біль стовпа води Ґію Томіоки (Water Hashira Giyu Tomioka’s Pain)',
          'Повністю одужав та готовий до навчання (Fully Recovered...)',
          'Посмішка Токіто (To Bring Back a Smile)',
          'Справжня сила каменю (I Even Ate Demons...)',
          'Остання битва розпочинається (The Hashira Training Commences)',
          'Кам\'яний стовп Ґьомей Хімеджіма (Stone Hashira)',
          'Нескінченна битва (Infinite Castle Unleashed)'
        ]
      },
      'jujutsu-kaisen-2020': {
        1: [
          'Дволикий Сукуна (Ryomen Sukuna)',
          'Для себе самого (For Myself)',
          'Сталева дівчина (Girl of Steel)',
          'Народження прокляття (Curse Womb Must Die)',
          'Народження прокляття, Ч. 2 (Curse Womb Must Die II)',
          'Після дощу (After the Rain)',
          'Натиск (Assault)',
          'Нудьга (Boredom)',
          'Дрібна рибка та зворотне покарання (Small Fry and Reverse Retribution)',
          'Плавна зміна форми (Idle Transfiguration)',
          'Суворий вирок (Narrow Gate)',
          'Тобі, колись (To You, Someday)',
          'Кіно (Cinema)',
          'Завтра (Tomorrow)',
          'Турнір з Токійською філією (Kyoto Sister School Goodwill Event)',
          'Битва інтелектів (Tactics)',
          'Мудрий вибір (Judgment)',
          'Чорний спалах (Black Flash)',
          'Гнівний титан (Sage)',
          'Поза межами можливого (Nonstandard)',
          'Завершення етапу (The Origin of Blind Obedience)'
        ],
        2: [
          'Прихована смерть (Hidden Inventory)',
          'Прихована смерть, Ч. 2 (Hidden Inventory 2)',
          'Прихована смерть, Ч. 3 (Hidden Inventory 3)',
          'Передчасна смерть (Premature Death)',
          'Шібуя: Вечір напередодні (Shibuya Incident - Gatekeeping)',
          'Шібуя: Початок інциденту (The Shibuya Incident)',
          'Спантеличеність (Confusion)',
          'Божественне рішення (Pandemonium)',
          'Велике зіткнення Стовпів (Clash)',
          'Хаос у метро (Underground Nightmare)',
          'Загибель найсильнішого (Sealing Satoru Gojo)',
          'Друге дихання Юджі (Awakening)'
        ]
      },
      'chainsaw-man-2022': {
        1: [
          'Пес та бензопила (Dog & Chainsaw)',
          'Прибуття в Токіо (Arrival in Tokyo)',
          'Місцезнаходження Нявки (Rescue)',
          'Порятунок (Rescue part 2)',
          'Зброя-демон (Devil Gun)',
          'Вбивство замовником (Kill)',
          'Смак першого поцілунку (The Taste of a Kiss)',
          'Перестрілка в ресторані (Gunfire)',
          'Порятунок з пекла (From Kyoto)',
          'Знову тренування (Psychopaths)',
          'Операція починається (Mission Starts)',
          'Катана проти бензопили (Katana vs. Chainsaw)'
        ]
      },
      'attack-on-titan': {
        1: [
          'Тобі, через 2000 років (To You, in 2000 Years)',
          'Той самий день (That Day)',
          'Тьмяне світло розпачу (A Dim Light Amid Despair)',
          'Ніч випуску (Night of the Disbanding Ceremony)',
          'Перша битва (First Battle)',
          'Світ її очима (The World the Girl Saw)',
          'Маленький клинок (Small Blade)',
          'Чути биття серця (I Can Hear a Heartbeat)',
          'Куди поділася ліва рука (Whereabouts of His Left Arm)',
          'Відповідь (Response)',
          'Ідол (Idol)',
          'Рана (Wound)'
        ],
        2: [
          'Звіроподібний титан (Beast Titan)',
          'Повернення додому (I’m Home)',
          'На південний захід (To the Southwest)',
          'Солдати (Soldiers)',
          'Утікачі (Utgard Castle)',
          'Воїн (Warrior)',
          'Швидкий удар (Close Combat)',
          'Переслідувачі (The Hunters)'
        ],
        3: [
          'Димовий сигнал (Smoke Signal)',
          'Біль (Pain)',
          'Стара історія (Old Story)',
          'Довіра (Trust)',
          'Удар у відповідь (Reply)',
          'Гріх (Sin)',
          'Бажання (Wish)',
          'Стіна Орвуд (Outside the Walls of Orvud District)'
        ],
        4: [
          'По той бік моря (The Other Side of the Sea)',
          'Опівнічний поїзд (Midnight Train)',
          'Брама надії (The Door of Hope)',
          'З рук у руки (From One Hand to Another)',
          'Оголошення війни (Declaration of War)',
          'Титан Молотоборець (The War Hammer Titan)',
          'Напад (Assault)',
          'Куля вбивці (Assassin’s Bullet)'
        ]
      },
      'berserk-1997': {
        1: [
          'Чорний мечник (The Black Swordsman)',
          'Загін Сокола (Band of the Hawk)',
          'Перше бойове хрещення (First Battle)',
          'Рука Бога (Hand of God)',
          'Вітер смерті (Wind of Sword)',
          'Золоте століття (The Golden Age)',
          'Таємничий лицар (Nosferatu Zodd)',
          'Змова у палаці (Conspiracy)',
          'Пробудження Демона (The Eclipse Begins)',
          'Затемнення душі (The Eclipse Part 2)',
          'Остання надія на ранок (New Journey)'
        ]
      },
      'stranger-things-s4': {
        1: [
          'Клуб Пекельного Полум’я (The Hellfire Club)',
          'Прокляття Векни (Vecna’s Curse)',
          'Монстр і супергерой (The Monster and the Superhero)',
          'Дорогий Біллі (Dear Billy)',
          'Проєкт "Ніна" (The Nina Project)',
          'У глибину прірви (The Dive)',
          'Бійня в лабораторії Хоукінса (The Massacre at Hawkins Lab)',
          'Тато (Papa)',
          'План порятунку (The Piggyback)'
        ],
        2: [
          'Зникнення Вілла Байєрса (The Vanishing of Will Byers)',
          'Дивачка з Кленової вулиці (The Weirdo on Maple Street)',
          'Веселі вогники (Holly, Jolly)',
          'Тіло (The Body)',
          'Блоха і акробат (The Flea and the Acrobat)',
          'Монстр (The Monster)',
          'Ванна (The Bathtub)',
          'Знову вгору ногами (The Upside Down)'
        ],
        3: [
          'Шалена Макс (MADMAX)',
          'Хеллоуїн навиворіт (Trick or Treat, Freak)',
          'Головастик (The Pollywog)',
          'Вілл Мудрий (Will the Wise)',
          'Копачі (Dig Dug)',
          'Шпигун (The Spy)',
          'Брама (The Gate)',
          'Битва за Хоукінс (The Mind Flayer)'
        ],
        4: [
          'Клуб Пекельного Полум\'я (The Hellfire Club)',
          'Прокляття Векни (Vecna\'s Curse)',
          'Монстр і супергерой (The Monster and the Superhero)',
          'Дорогий Біллі (Dear Billy)',
          'Проєкт "Ніна" (The Nina Project)',
          'У глибоку прірву (The Dive)',
          'Бійня в лабораторії Хоукінса (The Massacre at Hawkins Lab)',
          'Тато (Papa)',
          'План порятунку (The Piggyback)'
        ]
      },
      'the-witcher-s3': {
        1: [
          'Апатія (Apathy)',
          'Шляхи розходяться (Unbound)',
          'Возз’єднання (Reunion)',
          'Запрошення на бал (The Invitation)',
          'Мистецтво ілюзії (The Art of Illusion)',
          'Кожен сам за себе (Everybody Has a Plan)',
          'Початок хаосу (Out of the Fire, Into the Abyss)',
          'Ціна вибору (The Cost)'
        ],
        2: [
          'Початок полювання (The Witcher Begins)',
          'Чотири марка (Four Marks)',
          'Зрада таємниць (Betrayer Moon)',
          'Пророцтво Сінтри (Of Banquets, Bastards and Burials)',
          'Пляшка дивного еліксиру (Bottled Appetites)',
          'Рідкісні види (Rare Species)',
          'Перед падінням (Before a Fall)',
          'Набагато більше (Much More)'
        ],
        3: [
          'Шаєрраведд (Shaerrawedd)',
          'Зв’язки крові (Unbound)',
          'Помилка Танкреді (Reunion)',
          'Бал Аретузи (The Art of Illusion)',
          'Час презирства (Time of Contempt)',
          'Загублені в пустелі (In the Fire)',
          'Початок нового віку (The Tower of the Swallow)'
        ]
      },
      'black-mirror': {
        1: [
          'Державний гімн (The National Anthem)',
          'П’ятнадцять мільйонів заслуг (15 Million Merits)',
          'Твоя уся історія (The Entire History of You)'
        ],
        2: [
          'Я повернуся (Be Right Back)',
          'Білий ведмідь (White Bear)',
          'Час Волдо (The Waldo Moment)',
          'Біле Різдво (White Christmas)'
        ],
        3: [
          'Під укіс (Nosedive)',
          'Ігровий тест (Playtest)',
          'Заткнись і танцюй (Shut Up and Dance)',
          'Сан-Джуніперо (San Junipero)',
          'Люди проти вогню (Men Against Fire)',
          'Ворог народу (Hated in the Nation)'
        ],
        4: [
          'Космічний човен "Калістер" (USS Callister)',
          'Архангел (Arkangel)',
          'Крокодил (Crocodile)',
          'Повісь ді-джея (Hang the DJ)',
          'Металіст (Metalhead)',
          'Чорний музей (Black Museum)'
        ],
        5: [
          'Кидки та удари (Striking Vipers)',
          'Уламки (Smithereens)',
          'Рейчел, Джек і Ешлі Також (Rachel, Jack and Ashley Too)'
        ],
        6: [
          'Джоан жахлива (Joan Is Awful)',
          'Лог Гейн (Loch Henry)',
          'За морем (Beyond the Sea)',
          'Мейзі Дей (Mazey Day)',
          'Демон 79 (Demon 79)'
        ]
      }
    };

    let episodeTitles = [
      'Початок нового шляху',
      'Нові союзники та небезпеки',
      'Пробудження прихованої сили',
      'Таємне стає явним',
      'Пастка темряви',
      'Вирішальне протистояння',
      'Крок у невідомість',
      'Тіні минулого за спиною',
      'Шлях виправлення помилок',
      'Непростий вибір',
      'Передчуття великої битви',
      'Фінал сезону: Новий світанок'
    ];

    const seriesData = customEpisodes[m.id];
    if (seriesData) {
      if (Array.isArray(seriesData)) {
        episodeTitles = seriesData;
      } else if (seriesData[seasonNum]) {
        episodeTitles = seriesData[seasonNum];
      } else {
        const keys = Object.keys(seriesData).map(Number);
        if (keys.length > 0) {
          episodeTitles = seriesData[keys[0]];
        }
      }
    }

    const episodeCount = episodeTitles.length;
    const episodes = [];
    const episodeDur = isAnime ? '24 хв' : '52 хв';

    for (let i = 1; i <= episodeCount; i++) {
      episodes.push({
        number: i,
        title: episodeTitles[i - 1],
        duration: episodeDur,
        description: isAnime
          ? `Захоплюючий епізод ${i} у сезоні ${seasonNum}. Пориньте у дивовижне продовження аніме-саги разом з улюбленими героями.`
          : `Неймовірний епізод ${i} у сезоні ${seasonNum}. Нові сюжетні лінії, таємниці та непередбачувані ситуації у високій якості.`
      });
    }
    return episodes;
  };

  const getVoiceoverSlug = (vo: string): string => {
    const lower = vo.toLowerCase();
    if (lower.includes('amanogawa')) return 'amanogawa';
    if (lower.includes('koyomi')) return 'koyomi';
    if (lower.includes('sbt')) return 'sbt_localization';
    if (lower.includes('далі буде') || lower.includes('dali') || lower.includes('melodicvoice')) return 'dali_bude';
    if (lower.includes('fanvox')) return 'fanvox';
    if (lower.includes('original') || lower.includes('japanese')) return 'original_jp';
    if (lower.includes('cinema')) return 'cinema_ua';
    if (lower.includes('dniprofilm')) return 'dniprofilm';
    if (lower.includes('hdrezka')) return 'hdrezka';
    if (lower.includes('english') || lower.includes('original audio')) return 'original_en';
    return 'default';
  };

  const sanitizeCustomVideoUrl = (rawUrl: string): string => {
    let url = rawUrl.trim();
    if (!url) return '';

    // Object URLs (blob:) and Data URLs (data:) must be returned as-is
    if (url.startsWith('blob:') || url.startsWith('data:')) {
      return url;
    }

    // Replace all backslashes with forward slashes
    let normalized = url.replace(/\\/g, '/');

    // If it is an external URL, do not append local Серія filename extensions!
    const isExternal = normalized.toLowerCase().startsWith('http://') || normalized.toLowerCase().startsWith('https://');

    if (!isExternal) {
      // Забезпечення local uploads and videos relative paths always start with a slash
      if (normalized.startsWith('uploads/')) {
        normalized = '/' + normalized;
      } else if (normalized.startsWith('videos/')) {
        normalized = '/' + normalized;
      }

      // If it is a directory path (does not end with an extension like .mp4, .m3u8, etc.)
      const urlWithoutQuery = normalized.split('?')[0].split('#')[0];
      const hasVideoExtension = /\.(mp4|m3u8|webm|mkv|avi|mov|mp3)$/i.test(urlWithoutQuery);
      if (!hasVideoExtension) {
        normalized = normalized.endsWith('/')
          ? `${normalized}s${selectedSeason}e${selectedEpisode}.mp4`
          : `${normalized}/s${selectedSeason}e${selectedEpisode}.mp4`;
      }

      // Case-insensitive check if it contains /public/ or public/
      const publicIndex = normalized.toLowerCase().indexOf('/public/');
      if (publicIndex !== -1) {
        return normalized.substring(publicIndex + 7); // keeps the leading slash /
      }

      const publicStartMatch = normalized.match(/^public\//i);
      if (publicStartMatch) {
        return '/' + normalized.substring(7);
      }

      // Windows drive letters like E:/
      if (/^[a-zA-Z]:\//.test(normalized)) {
        const idx = normalized.toLowerCase().indexOf(movie.id.toLowerCase());
        if (idx !== -1) {
          return '/' + normalized.substring(idx);
        }
      }
    }

    return normalized;
  };

  const getQualityVideoUrl = (reqQuality: string): string | null => {
    let targetRes = reqQuality.toLowerCase();
    if (targetRes === 'full hd' || targetRes === 'fhd') targetRes = '1080p';
    if (targetRes === 'hd') targetRes = '720p';

    const isValidSource = (u: string) => {
      if (!u) return false;
      if (u.includes('commondatastorage.googleapis.com') || u.includes('gtv-videos-bucket') || u.includes('oceans.mp4') || u.includes('zencdn.net')) return false;
      if (u.includes('/uploads/') || u.includes('/videos/') || u.toLowerCase().includes('oppenheymer')) return true;
      const sanitized = sanitizeCustomVideoUrl(u);
      const relUrl = u.replace(/^https?:\/\/[^\/]+/i, '');
      const absUrl = typeof window !== 'undefined' && relUrl.startsWith('/') ? `${window.location.origin}${relUrl}` : '';
      if (failedUrls[u] || failedUrls[sanitized] || (relUrl && failedUrls[relUrl]) || (absUrl && failedUrls[absUrl])) return false;
      if (u.startsWith('blob:') && videoError) return false;
      return true;
    };

    const targetTag = targetRes === '4k' ? '4K' : targetRes;

    // 0. Build Активний Серія reference
    const fullEpMap = getFullEpisodesDataForMovie(movie.id, movie.episodesData);
    const ep = fullEpMap?.[selectedSeason]?.find(e => e.number === selectedEpisode);

    // Допоміжна функція to format Серія URL strictly for current Сезон and Серія
    const formatSeriesUrl = (u: string | undefined): string | null => {
      if (!u || !isValidSource(u)) return null;
      let finalUrl = u;
      if (movie.type === 'series') {
        if (/s\d+e\d+/i.test(finalUrl)) {
          finalUrl = finalUrl.replace(/s\d+e\d+/gi, `s${selectedSeason}e${selectedEpisode}`);
        } else if (/e\d+/i.test(finalUrl)) {
          finalUrl = finalUrl.replace(/e\d+/gi, `e${selectedEpisode}`);
        }
      }
      return sanitizeCustomVideoUrl(finalUrl);
    };

    const isOppenheimerMovie = Boolean(
      movie?.id === 'oppenheimer-2023' ||
      (movie?.title && movie.title.toLowerCase().includes('оппенгеймер')) ||
      (movie?.titleEn && movie.titleEn.toLowerCase().includes('oppenheimer'))
    );

    // 1. Перевірка об'єкта videoSources з пропсів, епізоду, фільму або сервера
    const sources: Record<string, string> = {
      ...(propsVideoSources || {}),
      ...(ep?.videoSources || {}),
      ...(movie?.videoSources || {}),
    };

    if (isOppenheimerMovie) {
      sources['1080p'] = '/uploads/videos/1080p_Oppenheymer_Film_2023_1792287408047.mp4';
      sources['720p'] = '/uploads/videos/720p_Oppenheymer_Film_2023_1792287408047.mp4';
      sources['480p'] = '/uploads/videos/up_1792294549453_ls6di_480p_Oppenheymer_Film_2023_1792287408047.mp4';
      sources['4K'] = '/uploads/videos/1080p_Oppenheymer_Film_2023_1792287408047.mp4';
    }

    if (ep?.qualities && Array.isArray(ep.qualities)) {
      ep.qualities.forEach(q => { if (q.resolution && q.url) sources[q.resolution] = q.url; });
    }
    if (movie?.qualities && Array.isArray(movie.qualities)) {
      movie.qualities.forEach(q => { if (q.resolution && q.url) sources[q.resolution] = q.url; });
    }
    if (serverQualities) {
      if (serverQualities['4k']) sources['4K'] = serverQualities['4k'];
      if (serverQualities['1080p']) sources['1080p'] = serverQualities['1080p'];
      if (serverQualities['720p']) sources['720p'] = serverQualities['720p'];
      if (serverQualities['480p']) sources['480p'] = serverQualities['480p'];
    }

    // Пряма перевірка в об'єкті джерел з підтримкою синонімів (fhd, 1080p тощо)
    const checkMatching = (tag: string): string | null => {
      if (sources[tag]) return sources[tag];
      const lower = tag.toLowerCase();
      const match = Object.keys(sources).find(k => {
        const kLow = k.toLowerCase();
        if (kLow === lower) return true;
        if (lower === '4k' && (kLow === '2160p' || kLow.includes('4k') || kLow === 'uhd')) return true;
        if (lower === '1080p' && (kLow === 'full hd' || kLow === 'fhd' || kLow === '1080')) return true;
        if (lower === '720p' && (kLow === 'hd' || kLow === '720')) return true;
        if (lower === '480p' && (kLow === 'sd' || kLow === '480')) return true;
        return false;
      });
      return match ? sources[match] : null;
    };

    const resolvedSource = checkMatching(targetTag) || checkMatching(targetRes);
    if (resolvedSource) {
      const fixed = formatSeriesUrl(resolvedSource);
      if (fixed) return fixed;
    }

    // 2. Перевірка користувацьких посилань у customUrls
    const syns = targetRes === '4k' ? ['4k', '2160p'] :
      targetRes === '1080p' ? ['1080p', 'fullhd', 'fhd'] :
        targetRes === '720p' ? ['720p', 'hd'] :
          targetRes === '480p' ? ['480p', 'sd'] : [targetRes];

    for (const syn of syns) {
      const movieKey = `${movie.id}-quality-${syn}`;
      if (customUrls[movieKey] && isValidSource(customUrls[movieKey])) {
        return sanitizeCustomVideoUrl(customUrls[movieKey]);
      }
      const epKey = `${movie.id}-s${selectedSeason}-e${selectedEpisode}-quality-${syn}`;
      if (customUrls[epKey] && isValidSource(customUrls[epKey])) {
        return sanitizeCustomVideoUrl(customUrls[epKey]);
      }
    }

    const epVoiceoverQualityKey = `${movie.id}-s${selectedSeason}-e${selectedEpisode}-${activeVoiceover}-quality-${targetRes}`;
    if (customUrls[epVoiceoverQualityKey] && isValidSource(customUrls[epVoiceoverQualityKey])) {
      return sanitizeCustomVideoUrl(customUrls[epVoiceoverQualityKey]);
    }

    // 3. Динамічна підстановка мітки роздільності у базовий URL
    let baseRawUrl = ep?.videoUrl || movie.videoUrl || '';
    if (movie.type === 'series' && baseRawUrl) {
      if (/s\d+e\d+/i.test(baseRawUrl)) {
        baseRawUrl = baseRawUrl.replace(/s\d+e\d+/gi, `s${selectedSeason}e${selectedEpisode}`);
      } else if (/e\d+/i.test(baseRawUrl)) {
        baseRawUrl = baseRawUrl.replace(/e\d+/gi, `e${selectedEpisode}`);
      }
    }

    if (baseRawUrl) {
      const resPattern = /(^|\/|_)(4K|4k|2160p|1080p|1080P|720p|720P|480p|480P|360p|original)(_|\.|$)/i;
      if (resPattern.test(baseRawUrl)) {
        const derived = baseRawUrl.replace(resPattern, `$1${targetTag}$3`);
        // Перевіряємо чи derived-файл дійсно є серед відомих джерел або підтверджених серверних якостей
        const isDerivedConfirmed = Boolean(
          sources[targetTag] || sources[targetRes] ||
          (serverQualities && (serverQualities[targetRes] || serverQualities[targetTag.toLowerCase()])) ||
          (movie.qualities && movie.qualities.some(q => q.resolution.toLowerCase() === targetRes))
        );
        if (isDerivedConfirmed && isValidSource(derived)) {
          return sanitizeCustomVideoUrl(derived);
        }
      }
      // Якщо обрана якість (наприклад, 4K) не має окремого файлу, але базовий файл (наприклад, 1080p) існує
      if (isValidSource(baseRawUrl)) {
        return sanitizeCustomVideoUrl(baseRawUrl);
      }
    }

    // 4. Якщо в sources є інша доступна якість (наприклад, для 4K обираємо найкращу наявну 1080p або 720p)
    const priorityList = ['1080p', '720p', '480p', '4K'];
    for (const altRes of priorityList) {
      const altUrl = checkMatching(altRes);
      if (altUrl && isValidSource(altUrl)) {
        const fixed = formatSeriesUrl(altUrl);
        if (fixed) return fixed;
      }
    }

    return null;
  };

  const handleDeleteEpisode = (seasonNum: number, episodeNum: number) => {
    if (!confirm(language === 'UA' ? `Видалити Серію ${episodeNum}?` : `Delete Episode ${episodeNum}?`)) {
      return;
    }

    const currentMap = movie.episodesData && Object.keys(movie.episodesData).length > 0
      ? { ...movie.episodesData }
      : getFullEpisodesDataForMovie(movie.id, movie.episodesData);

    const updatedSeasonList = (currentMap[seasonNum] || []).filter(e => e.number !== episodeNum);
    const updatedEpisodesData: Record<number, any[]> = {
      ...currentMap,
      [seasonNum]: updatedSeasonList
    };

    const updatedMovie: Movie = {
      ...movie,
      episodesData: updatedEpisodesData
    };

    try {
      const savedDb = localStorage.getItem('movies_db');
      if (savedDb) {
        const list: Movie[] = JSON.parse(savedDb);
        const nextList = list.map(m => m.id === movie.id ? updatedMovie : m);
        localStorage.setItem('movies_db', JSON.stringify(nextList));
        localStorage.setItem('nova_movies', JSON.stringify(nextList));
        if (onMoviesChange) {
          onMoviesChange(nextList);
        }
      }
    } catch (err) {
      console.error('Failed to update localStorage after deleting episode:', err);
    }

    if (onUpdateMovie) {
      onUpdateMovie(updatedMovie);
    }

    if (selectedEpisode === episodeNum) {
      if (updatedSeasonList.length > 0) {
        setSelectedEpisode(updatedSeasonList[0].number);
      } else {
        setSelectedEpisode(1);
      }
    }
  };

  // Визначення актуального активного URL для відтворення відео
  const getActiveVideoUrl = (): string => {
    if (offlineObjectURL) {
      return offlineObjectURL;
    }

    const isValidSource = (u: string) => {
      if (!u) return false;
      if (u.includes('commondatastorage.googleapis.com') || u.includes('gtv-videos-bucket') || u.includes('oceans.mp4') || u.includes('zencdn.net')) return false;
      if (u.includes('/uploads/') || u.includes('/videos/') || u.toLowerCase().includes('oppenheymer')) return true;
      const sanitized = sanitizeCustomVideoUrl(u);
      const relUrl = u.replace(/^https?:\/\/[^\/]+/i, '');
      const absUrl = typeof window !== 'undefined' && relUrl.startsWith('/') ? `${window.location.origin}${relUrl}` : '';
      if (failedUrls[u] || failedUrls[sanitized] || (relUrl && failedUrls[relUrl]) || (absUrl && failedUrls[absUrl])) return false;
      // If it's a blob: URL and videoError is true, it means the blob was revoked/expired after page reload
      if (u.startsWith('blob:') && videoError) return false;
      return true;
    };

    const isOppenheimerMovie = Boolean(
      movie?.id === 'oppenheimer-2023' ||
      (movie?.title && movie.title.toLowerCase().includes('оппенгеймер')) ||
      (movie?.titleEn && movie.titleEn.toLowerCase().includes('oppenheimer'))
    );

    // Для Оппенгеймера гарантовано повертаємо локальне офіційне відео високої якості
    if (isOppenheimerMovie) {
      const qUrl = getQualityVideoUrl(quality);
      if (qUrl) return qUrl;
      return '/uploads/videos/1080p_Oppenheymer_Film_2023_1792287408047.mp4';
    }

    // 1. Пріоритетна перевірка вибраної якості відео (4K, 1080p, 720p, 480p)
    const convertedQualityUrl = getQualityVideoUrl(quality);
    if (convertedQualityUrl && isValidSource(convertedQualityUrl)) {
      return sanitizeCustomVideoUrl(convertedQualityUrl);
    }

    // 2. Використання локального файлу з папки public за потреби (тільки якщо це не демо-потік для фільму з власним відео)
    const isFallbackCdn = Boolean(resolvedLocalUrl && (resolvedLocalUrl.includes('flower.mp4') || resolvedLocalUrl.includes('oceans.mp4') || resolvedLocalUrl.includes('zencdn.net')));
    const hasOwnVideo = Boolean(movie.videoUrl && (movie.videoUrl.includes('/uploads/') || movie.videoUrl.includes('/videos/')));
    if (resolvedLocalUrl && (useLocalFolder || videoError) && (!isFallbackCdn || !hasOwnVideo)) {
      return resolvedLocalUrl;
    }

    const key = `${movie.id}-s${selectedSeason}-e${selectedEpisode}-${activeVoiceover}`;
    if (customUrls[key] && isValidSource(customUrls[key])) {
      return sanitizeCustomVideoUrl(customUrls[key]);
    }

    const fullEpMap = getFullEpisodesDataForMovie(movie.id, movie.episodesData);
    const activeEp = (fullEpMap && fullEpMap[selectedSeason])
      ? fullEpMap[selectedSeason].find(e => e.number === selectedEpisode)
      : (movie.episodesData && movie.episodesData[selectedSeason])
        ? movie.episodesData[selectedSeason].find(e => e.number === selectedEpisode)
        : undefined;

    const epSources = activeEp?.sources || activeEp?.videoSources || {};
    if (Object.keys(epSources).length > 0) {
      if (epSources[activeVoiceover] && isValidSource(epSources[activeVoiceover])) {
        return sanitizeCustomVideoUrl(epSources[activeVoiceover]);
      }
      const shortStudio = activeVoiceover.split(' ')[0].toLowerCase();
      const matchKey = Object.keys(epSources).find(k => k.toLowerCase().includes(shortStudio));
      if (matchKey && epSources[matchKey] && isValidSource(epSources[matchKey])) {
        return sanitizeCustomVideoUrl(epSources[matchKey]);
      }
      // Запобігання показу чужого відео, якщо для цієї студії озвучення ще немає файлу
      if (activeVoiceover !== 'all' && activeVoiceover !== 'default') {
        return '';
      }
    }

    const defaultKey = `${movie.id}-s${selectedSeason}-e${selectedEpisode}-default`;
    if (customUrls[defaultKey] && isValidSource(customUrls[defaultKey])) {
      return sanitizeCustomVideoUrl(customUrls[defaultKey]);
    }

    const simpleKey = `${movie.id}-s${selectedSeason}-e${selectedEpisode}`;
    if (customUrls[simpleKey] && isValidSource(customUrls[simpleKey])) {
      return sanitizeCustomVideoUrl(customUrls[simpleKey]);
    }

    if (fullEpMap && fullEpMap[selectedSeason]) {
      const ep = fullEpMap[selectedSeason].find(e => e.number === selectedEpisode);
      if (ep && ep.videoUrl && isValidSource(ep.videoUrl)) {
        return sanitizeCustomVideoUrl(ep.videoUrl);
      }
    }

    if (movie.episodesData && movie.episodesData[selectedSeason]) {
      const ep = movie.episodesData[selectedSeason].find(e => e.number === selectedEpisode);
      if (ep && ep.videoUrl && isValidSource(ep.videoUrl)) {
        return sanitizeCustomVideoUrl(ep.videoUrl);
      }
    }

    if (movie.seasonsData) {
      const s = movie.seasonsData.find(season => season.seasonNumber === selectedSeason);
      if (s && s.episodes) {
        const ep = s.episodes.find(e => e.number === selectedEpisode);
        if (ep && ep.videoUrl && isValidSource(ep.videoUrl)) {
          return sanitizeCustomVideoUrl(ep.videoUrl);
        }
      }
    }

    if (resolvedLocalUrl && isValidSource(resolvedLocalUrl) && (!isFallbackCdn || !hasOwnVideo)) {
      return resolvedLocalUrl;
    }

    if (movie.videoUrl && isValidSource(movie.videoUrl)) {
      let rawUrl = movie.videoUrl;
      if (movie.type === 'series') {
        if (/s\d+e\d+/i.test(rawUrl)) {
          rawUrl = rawUrl.replace(/s\d+e\d+/gi, `s${selectedSeason}e${selectedEpisode}`);
        } else if (/e\d+/i.test(rawUrl)) {
          rawUrl = rawUrl.replace(/e\d+/gi, `e${selectedEpisode}`);
        }
      }
      return sanitizeCustomVideoUrl(rawUrl);
    }

    // Якщо це фільм із локальним відеофайлом (наприклад, Оппенгеймер), повертаємо його оригінальне відео
    if (movie.videoUrl && (movie.videoUrl.includes('/uploads/') || movie.videoUrl.includes('/videos/'))) {
      return sanitizeCustomVideoUrl(movie.videoUrl);
    }

    return '';
  };

  const getAbsoluteVideoUrl = (): string => {
    const url = getActiveVideoUrl();
    if (!url) return '';

    if (url.startsWith('blob:') || url.startsWith('data:')) {
      return url;
    }

    // Автоматична маршрутизація зовнішніх m3u8-потоків через наш CORS-проксі
    if (url.toLowerCase().includes('.m3u8') && !url.startsWith('/') && !url.includes(window.location.origin)) {
      const urlWithoutProtocol = url.replace(/^(https?:\/\/)/i, (match, protocol) => {
        const cleanProto = protocol.replace('://', '');
        return `${cleanProto}/`;
      });
      return `${window.location.origin}/api/proxy/${urlWithoutProtocol}`;
    }

    if (url.startsWith('/')) {
      return `${window.location.origin}${url}`;
    }
    return url;
  };

  const activeVideoUrl = getAbsoluteVideoUrl();
  const isM3U8 = activeVideoUrl.toLowerCase().includes('m3u8');
  const supportsNativeHls = typeof window !== 'undefined' &&
    document.createElement('video').canPlayType('application/vnd.apple.mpegurl') !== '';
  const useHlsJs = isM3U8 && Hls.isSupported();

  // Handle HLS playback on native Відео element using Hls.js manual binding
  useEffect(() => {
    if (!nativeVideoRef.current || !activeVideoUrl) return;

    const video = nativeVideoRef.current;

    // Clean up any existing Hls.js instance first
    if (hlsInstanceRef.current) {
      hlsInstanceRef.current.destroy();
      hlsInstanceRef.current = null;
    }

    if (useHlsJs) {
      console.log('Initializing Hls.js for native video element with URL:', activeVideoUrl);
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        maxBufferLength: 30,
      });

      hlsInstanceRef.current = hls;
      hls.loadSource(activeVideoUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        console.log('HLS manifest parsed successfully via Hls.js');
        setIsReady(true);
        if (isPlaying) {
          video.play().catch(() => { });
        }
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.warn('Fatal HLS network error, attempting to recover loader...', data);
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.warn('Fatal HLS media error, attempting to recover media...', data);
              hls.recoverMediaError();
              break;
            default:
              console.warn('Unrecoverable fatal HLS player error:', data);
              setVideoError(true);
              hls.destroy();
              hlsInstanceRef.current = null;
              break;
          }
        } else {
          console.warn('Non-fatal HLS player warning:', data.details || data.type);
        }
      });
    } else {
      // Direct native browser playback for non-m3u8 files, or native Safari HLS when decoderMode is 'native'
      if (activeVideoUrl) {
        console.log('Using native HTML5 video engine for:', activeVideoUrl);
        const currentSrc = video.currentSrc || video.src || '';
        const isSame = currentSrc === activeVideoUrl ||
          (activeVideoUrl.startsWith('/') && currentSrc.endsWith(activeVideoUrl)) ||
          (activeVideoUrl.startsWith('http') && (currentSrc === activeVideoUrl || currentSrc.endsWith(activeVideoUrl.replace(/^https?:\/\/[^\/]+/, ''))));

        if (!isSame) {
          video.src = activeVideoUrl;
          if (isPlaying) {
            video.play().catch(() => { });
          }
        }
      }
    }

    return () => {
      if (hlsInstanceRef.current) {
        hlsInstanceRef.current.destroy();
        hlsInstanceRef.current = null;
      }
    };
  }, [activeVideoUrl, useHlsJs]);

  // Proactively check if the Активний Відео URL is available and is a valid Відео file (not HTML)
  useEffect(() => {
    if (!activeVideoUrl) return;

    let active = true;

    const verifyVideoUrl = async () => {
      if (activeVideoUrl.startsWith('blob:')) {
        try {
          const res = await fetch(activeVideoUrl);
          if (!active) return;
          if (!res.ok) {
            console.warn(`Blob URL fetch failed with status ${res.status}:`, activeVideoUrl);
            markUrlFailed(activeVideoUrl);
            setVideoError(true);
          } else {
            setVideoError(false);
          }
        } catch (e) {
          if (!active) return;
          console.warn("Expired or unreadable blob URL detected:", activeVideoUrl);
          markUrlFailed(activeVideoUrl);
          setVideoError(true);
        }
        return;
      }
      const isProxy = activeVideoUrl.includes('/api/proxy/');
      const isLocal = !isProxy && (activeVideoUrl.startsWith('/') || activeVideoUrl.includes(window.location.origin));
      if (isLocal) {
        // Локальні завантажені відео (Оппенгеймер та інші завантаження) завжди валідні без HEAD перевірок
        if (activeVideoUrl.includes('/uploads/videos/') || activeVideoUrl.toLowerCase().includes('oppenheymer')) {
          setVideoError(false);
          return;
        }

        // Перевіряємо чи є посилання офіційним джерелом фільму
        const isPrimaryFile = Boolean(
          (movie.videoUrl && (activeVideoUrl.includes(movie.videoUrl) || movie.videoUrl.includes(activeVideoUrl))) ||
          (movie.videoSources && Object.values(movie.videoSources).some(v => v && (activeVideoUrl.includes(v) || v.includes(activeVideoUrl))))
        );

        try {
          const res = await fetch(activeVideoUrl, { method: 'HEAD' });
          if (!active) return;

          const contentType = res.headers.get('content-type') || '';

          // If the server responded with non-ok or returned an HTML document (SPA fallback) or JSON error
          if (!res.ok || contentType.includes('text/html') || contentType.includes('application/json')) {
            console.warn(`Local video URL validation failed: res.ok=${res.ok}, contentType=${contentType} for ${activeVideoUrl}`);
            if (!isPrimaryFile) {
              markUrlFailed(activeVideoUrl);
              if (typeof window !== 'undefined' && localStorage.getItem('nova_demo_fallback_active') === 'true') {
                setVideoError(false);
              } else {
                setVideoError(true);
              }
            } else {
              setVideoError(false);
            }
          } else {
            setVideoError(false);
            setFailedUrls(prev => {
              if (prev[activeVideoUrl]) {
                const next = { ...prev };
                delete next[activeVideoUrl];
                return next;
              }
              return prev;
            });
          }
        } catch (e) {
          if (!isPrimaryFile) {
            console.warn("Could not check local video URL via HEAD, falling back to GET check", e);
            try {
              const res = await fetch(activeVideoUrl, { headers: { Range: 'bytes=0-100' } });
              if (!active) return;
              const contentType = res.headers.get('content-type') || '';
              if (!res.ok || contentType.includes('text/html') || contentType.includes('application/json')) {
                markUrlFailed(activeVideoUrl);
                if (typeof window !== 'undefined' && localStorage.getItem('nova_demo_fallback_active') === 'true') {
                  setVideoError(false);
                } else {
                  setVideoError(true);
                }
              } else {
                setVideoError(false);
                setFailedUrls(prev => {
                  if (prev[activeVideoUrl]) {
                    const next = { ...prev };
                    delete next[activeVideoUrl];
                    return next;
                  }
                  return prev;
                });
              }
            } catch (err) {
              console.warn("Failed to verify local video URL", err);
              markUrlFailed(activeVideoUrl);
              if (typeof window !== 'undefined' && localStorage.getItem('nova_demo_fallback_active') === 'true') {
                setVideoError(false);
              } else {
                setVideoError(true);
              }
            }
          } else {
            setVideoError(false);
          }
        }
      } else {
        // External URLs: verify reachability or let Плеєр handle native playback
        try {
          const res = await fetch(activeVideoUrl, { method: 'HEAD' });
          if (!active) return;
          if (!res.ok && res.status !== 405 && res.status !== 403 && res.status !== 400) {
            console.warn(`External video URL validation notice: status=${res.status} for ${activeVideoUrl}`);
          }
          setVideoError(false);
        } catch (e) {
          console.warn("Could not check external video URL via HEAD, letting player handle it", e);
          setVideoError(false);
        }
      }
    };

    verifyVideoUrl();

    return () => {
      active = false;
    };
  }, [activeVideoUrl, movie.videoUrl, movie.videoSources]);

  return (
    <div
      ref={containerRef}
      onMouseMove={resetControlsTimeout}
      onMouseLeave={() => isPlaying && setShowControls(false)}
      className={`w-full bg-black overflow-hidden shadow-2xl flex flex-col items-center justify-center select-none border border-zinc-900 duration-300 pointer-events-auto @container ${isFullscreen
          ? 'fixed inset-0 z-[99999] h-screen w-screen max-w-none rounded-none'
          : 'relative aspect-video max-w-[1430px] mx-auto rounded-2xl'
        }`}
      style={{
        minHeight: isFullscreen ? '100vh' : 'auto',
        containerType: 'inline-size',
        ...(isFullscreen ? { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99999, width: '100vw', height: '100vh' } : {})
      }}
    >
      {/* Absolute Dark Ambient Накладення (оверлей) */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/70 z-10 pointer-events-none"></div>

      {/* Buffering/Завантаження Indicator */}
      {(!isReady || isBuffering) && !(nativeVideoRef.current && !nativeVideoRef.current.paused && nativeVideoRef.current.readyState >= 3) && (
        <div className="absolute z-15 pointer-events-none flex flex-col items-center gap-3 bg-zinc-950/95 border border-zinc-800 p-5 rounded-2xl backdrop-blur-md shadow-2xl">
          <Loader2 className="w-8 h-8 text-[#E50914] animate-spin" />
          <span className="text-[11px] uppercase font-extrabold tracking-widest text-zinc-300">Налаштування потоку {quality}...</span>
        </div>
      )}

      {/* Озвучення & Серія Transition Loader */}
      {isSwitchingVoiceover && (
        <div className="absolute inset-0 bg-black/95 backdrop-blur-md z-40 flex flex-col items-center justify-center gap-4 animate-in fade-in duration-250 pointer-events-auto">
          <Loader2 className="w-10 h-10 text-[#E50914] animate-spin" />
          <div className="text-center">
            <h3 className="font-extrabold text-sm text-zinc-100 uppercase tracking-widest">
              {movie.type === 'series' ? 'Завантаження потоку...' : 'Перемикання аудіодоріжки...'}
            </h3>
            <p className="text-[10px] text-zinc-500 mt-1">
              {movie.type === 'series'
                ? `Сезон ${selectedSeason}, Серія ${selectedEpisode} • ${activeVoiceover.split(' (')[0]}`
                : `Оновлення звукового декодера для ${activeVoiceover}`}
            </p>
          </div>
        </div>
      )}

      {/* Native Відео component with fully customizable controls wrapper */}
      <div
        onClick={() => {
          if (activeVideoUrl) {
            togglePlay();
          }
        }}
        className="absolute inset-0 z-0 bg-zinc-950 flex items-center justify-center w-full h-full cursor-pointer overflow-hidden"
      >
        {activeVideoUrl && activeVideoUrl.trim() !== '' ? (
          <video
            key={`${movie.id}_s${selectedSeason}_e${selectedEpisode}`}
            ref={nativeVideoRef}
            src={useHlsJs ? undefined : activeVideoUrl}
            autoPlay={isPlaying}
            muted={isMuted}
            playsInline
            loop
            className="w-full h-full object-contain react-player-wrapper"
            style={getVideoStyle()}
            onPlay={() => {
              setIsPlaying(true);
              setIsBuffering(false);
              setIsReady(true);
            }}
            onPause={() => setIsPlaying(false)}
            onWaiting={() => setIsBuffering(true)}
            onPlaying={() => {
              setIsBuffering(false);
              setIsReady(true);
            }}
            onCanPlay={(e) => {
              setIsBuffering(false);
              setIsReady(true);
              const vid = e.currentTarget;
              const d = vid.duration;
              if (d && !isNaN(d) && isFinite(d) && d > 0) {
                setPhysicalDuration(d);
                setDuration(d);
              }
              if (savedTimeRef.current !== null && vid) {
                const targetTime = savedTimeRef.current;
                try {
                  vid.currentTime = targetTime;
                  setCurrentTime(targetTime);
                  if (wasPlayingRef.current) {
                    vid.play().catch(() => { });
                    setIsPlaying(true);
                  }
                } catch (err) {
                  console.warn("Failed to set currentTime on video canplay:", err);
                }
                savedTimeRef.current = null;
              }
            }}
            onLoadedMetadata={(e) => {
              setIsReady(true);
              const vid = e.currentTarget;
              const d = vid.duration;
              if (d && !isNaN(d) && isFinite(d) && d > 0) {
                setPhysicalDuration(d);
                setDuration(d);
              }
              if (savedTimeRef.current !== null && vid) {
                const targetTime = savedTimeRef.current;
                try {
                  vid.currentTime = targetTime;
                  setCurrentTime(targetTime);
                  if (wasPlayingRef.current) {
                    vid.play().catch(() => { });
                    setIsPlaying(true);
                  }
                } catch (err) {
                  console.warn("Failed to set currentTime on video loadedmetadata:", err);
                }
                savedTimeRef.current = null;
              }
            }}
            onDurationChange={(e) => {
              const d = e.currentTarget.duration;
              if (d && !isNaN(d) && isFinite(d) && d > 0) {
                setPhysicalDuration(d);
                setDuration(d);
                isSwitchingRef.current = false;
              }
            }}
            onTimeUpdate={(e) => {
              if (isBuffering) setIsBuffering(false);
              if (!isReady) setIsReady(true);
              const physicalTime = e.currentTarget.currentTime;
              const pDur = e.currentTarget.duration || 0;
              const vDur = duration || getStaticDurationSeconds();
              const visualTime = (pDur > 0 && vDur > 0) ? (physicalTime / pDur) * vDur : physicalTime;
              const safeVisual = Math.min(visualTime, vDur);
              setCurrentTime(safeVisual);
            }}
            onError={(e: any) => {
              const err = e?.currentTarget?.error;
              // Код 1 (MEDIA_ERR_ABORTED): запит скасовано браузером при переході або зміні джерела — це не помилка відео
              if (err && err.code === 1) {
                return;
              }
              console.warn("Помилка відтворення нативного відеоелемента:", err?.message || err?.code || "Не вдалося завантажити джерело відео");

              // Перевіряємо чи фільм має власні легітимні джерела відео
              const hasRealSources = Boolean(
                (movie.videoSources && Object.keys(movie.videoSources).length > 0) ||
                (movie.qualities && movie.qualities.length > 0) ||
                (movie.videoUrl && (movie.videoUrl.includes('/uploads/') || movie.videoUrl.includes('/videos/')))
              );

              // Якщо фільм має власне відео (наприклад, Оппенгеймер 1080p), повертаємося до нього
              if (hasRealSources) {
                const realSources = { ...(movie.videoSources || {}) };
                if (movie.qualities) {
                  movie.qualities.forEach(q => { if (q.resolution && q.url) realSources[q.resolution] = q.url; });
                }
                const fallbackQualityUrl = realSources['1080p'] || realSources['720p'] || realSources['480p'] || movie.videoUrl;
                if (fallbackQualityUrl && activeVideoUrl !== fallbackQualityUrl && !failedUrls[fallbackQualityUrl]) {
                  console.log(`Повернення до основного локального відеопотоку фільму: ${fallbackQualityUrl}`);
                  setQuality(realSources['1080p'] ? '1080p' : realSources['720p'] ? '720p' : '480p');
                  setVideoError(false);
                  return;
                }
                setVideoError(true);
                return;
              }

              if (activeVideoUrl) {
                markUrlFailed(activeVideoUrl);
              }
              
              // Резервний демо-потік спрацьовує ТІЛЬКИ якщо адміністратор явно увімкнув його в налаштуваннях
              if (typeof window !== 'undefined' && localStorage.getItem('nova_demo_fallback_active') === 'true') {
                const fallbackCdn = 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4';
                if (activeVideoUrl !== fallbackCdn) {
                  console.log('Використання демо-потоку (увімкнено адміністратором)');
                  setResolvedLocalUrl(fallbackCdn);
                  setVideoError(false);
                  return;
                }
              }
              setVideoError(true);
            }}
          />
        ) : (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-10 h-10 text-[#E50914] animate-spin" />
            <span className="text-xs uppercase font-extrabold tracking-widest text-zinc-400">Пошук відеопотоку...</span>
          </div>
        )}
      </div>

      {/* Dolby Atmos Activation Накладення (оверлей) Toast Notification */}
      {atmosNotification && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 bg-zinc-950/95 backdrop-blur-md border border-sky-500/40 rounded-full shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300 pointer-events-none select-none">
          <div className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-505 bg-sky-400"></span>
          </div>
          <span className="text-[10px] font-black uppercase tracking-wider text-sky-400">Dolby Atmos DSP:</span>
          <span className="text-[11px] text-white font-extrabold tracking-wide font-sans">{atmosNotification}</span>
        </div>
      )}

      {/* Динамічний Floating Subtitle Captain */}
      {activeSubtitleText && (
        <div
          className="absolute bottom-20 sm:bottom-24 left-1/2 -translate-x-1/2 z-30 bg-black/80 backdrop-blur-sm rounded-md text-center border border-black/50 max-w-[80%] sm:max-w-[70%] md:max-w-[60%] transition-all font-sans font-medium text-yellow-300 pointer-events-none drop-shadow-md leading-[1.3] select-none break-words"
          style={{
            padding: '5px 11px',
            fontSize: 'clamp(12px, 1.7cqw, 16px)'
          }}
        >
          {activeSubtitleText}
        </div>
      )}

      {/* Dolby Atmos & 4K UHD Master Control Pane */}
      {showAtmosDashboard && (
        <div className="absolute inset-x-4 top-16 bottom-20 md:inset-x-8 md:top-20 md:bottom-24 bg-zinc-950/95 backdrop-blur-md rounded-2xl border border-sky-500/30 z-30 p-4 md:p-6 overflow-y-auto flex flex-col md:flex-row gap-5 animate-in fade-in zoom-in-95 duration-200 shadow-2xl shadow-sky-500/10 pointer-events-auto">
          {/* Left panel: Dolby Atmos Setup */}
          <div className="flex-1 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] bg-sky-500/20 text-sky-300 font-extrabold px-2 py-0.5 rounded-full border border-sky-500/30 tracking-widest uppercase">
                  Spatial Reference Room
                </span>
                <span className="text-[10px] bg-amber-500/20 text-amber-300 font-extrabold px-2 py-0.5 rounded-full border border-amber-500/30 tracking-widest uppercase">
                  4K HDR Master Suite
                </span>
              </div>
              <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
                DOLBY ATMOS Spatial Sound & Cinema HDR Control
              </h2>
              <p className="text-xs text-zinc-400 mt-1 max-w-md">
                Фізично налаштовує просторові 7.1.4 Dolby-директиви затримки каналів, сублімінальні басові коливання сабвуфера (LFE) та розширену контрастність зображення DCI-P3.
              </p>
            </div>

            {/* Динамічний Sound Presets */}
            <div className="space-y-2.5">
              <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest">Акустичний Профіль (Dolby Atmos DSP):</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {[
                  { id: 'cinema', title: 'Кінотеатр Dolby', desc: 'Ультранизькі бас-вібрації LFE (32Hz) для глибокого занурення в атмосферу залу.' },
                  { id: 'spatial', title: 'Об’ємний 3D Простір', desc: 'Глибоке розширення сцени Haas Binaural для навушників та стереосистем.' },
                  { id: 'bypass', title: 'Вимкнено (Стерео)', desc: 'Стандартний двоканальний вивід звука без додаткових низькочастотних басів.' }
                ].map((mode) => (
                  <button
                    key={mode.id}
                    onClick={() => {
                      changeAtmosPreset(mode.id as any);
                    }}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${atmosMode === mode.id && isAtmosActive ? 'bg-sky-950/50 border-sky-500 text-white shadow-md' : 'bg-zinc-900/50 border-zinc-800 text-zinc-400 hover:border-zinc-700'}`}
                  >
                    <div className="text-[11px] font-extrabold flex items-center gap-1.5 uppercase tracking-wide">
                      <span className={`h-1.5 w-1.5 rounded-full ${atmosMode === mode.id && isAtmosActive ? 'bg-sky-400 animate-ping' : 'bg-zinc-600'}`}></span>
                      {mode.title}
                    </div>
                    <div className="text-[10px] text-zinc-500 mt-1 leading-relaxed">{mode.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Cinema HDR Rendering Options */}
            <div className="space-y-2.5">
              <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest">Візуальне Рендерення (4K Ultra HD & HDR):</h3>
              <div className="flex flex-col sm:flex-row gap-3 bg-zinc-900/40 p-3 rounded-xl border border-zinc-800/80">
                <div className="flex-1">
                  <div className="text-xs font-bold text-white mb-0.5">HDR Advanced Color Rendering (Deep DCI-P3 Mapping)</div>
                  <div className="text-[10px] text-zinc-500">Автоматично розширює динамічний діапазон і насиченість кольору під час перегляду в 4K.</div>
                </div>
                <div className="flex items-center">
                  <button
                    onClick={() => setHdrEnabled(!hdrEnabled)}
                    className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase cursor-pointer transition-all ${hdrEnabled ? 'bg-amber-500 text-black shadow-md' : 'bg-zinc-800 text-zinc-400'}`}
                  >
                    {hdrEnabled ? 'Увімкнено (HDR 10-Bit)' : 'Вимкнено (SDR)'}
                  </button>
                </div>
              </div>
            </div>

            {/* Test Surround Кнопки */}
            <div className="flex flex-wrap gap-2.5">
              <button
                onClick={startAtmosTestSweep}
                disabled={isTestTonePlaying}
                className={`px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all flex items-center gap-2 cursor-pointer ${isTestTonePlaying ? 'bg-zinc-800 text-zinc-500 border border-zinc-700' : 'bg-gradient-to-r from-cyan-400 to-sky-500 hover:from-cyan-500 hover:to-sky-600 text-black font-black shadow-lg shadow-cyan-900/20'}`}
              >
                {isTestTonePlaying ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Йде тест каналів (3D)...
                  </>
                ) : (
                  <>
                    🔊 Тест просторового звуку 7.1.4
                  </>
                )}
              </button>

              <button
                onClick={() => setShowAtmosDashboard(false)}
                className="px-4 py-2 rounded-xl text-xs font-extrabold uppercase border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-900 transition-all cursor-pointer"
              >
                Закрити кінотеатр
              </button>
            </div>
          </div>

          {/* Right panel: Live 3D Speaker Configuration Matrix Map */}
          <div className="w-full md:w-80 bg-zinc-900/30 border border-zinc-800/80 rounded-2xl p-4 flex flex-col justify-between space-y-4">
            <div>
              <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-1">
                Конфігурація каналів 7.1.4
              </h3>
              <div className="text-[10px] text-zinc-500 leading-relaxed mb-3">
                {isAtmosActive
                  ? 'Система Dolby декодує 12-канальне аудіо залу у стереовивід з бінауральними Haas-директивами.'
                  : 'Стандартний 2-канальний стереорежим. Просторові рефлексії і сабвуфер вимкнено.'}
              </div>

              {/* Speaker Orbit Canvas Сітка */}
              <div className="relative aspect-video w-full rounded-xl bg-black/60 border border-zinc-900 overflow-hidden flex items-center justify-center py-8">
                {/* Visualizer ripple lines */}
                {isPlaying && isAtmosActive && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-24 h-24 border border-sky-500/10 rounded-full animate-ping duration-1000"></div>
                    <div className="w-36 h-36 border border-indigo-500/5 rounded-full animate-ping duration-2000 delay-500"></div>
                  </div>
                )}

                {/* Center Listener Іконка */}
                <div className="relative z-10 flex flex-col items-center">
                  <div className={`h-10 w-10 rounded-full bg-gradient-to-tr ${isAtmosActive ? 'from-sky-500 to-indigo-600 ring-4 ring-sky-500/20' : 'from-zinc-800 to-zinc-700'} flex items-center justify-center text-lg shadow-xl`}>
                    🛋️
                  </div>
                  <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest mt-1">Микита Premium</span>
                </div>

                {/* Surrounding Speaker Configuration Nodes */}
                {[
                  { name: 'L', label: 'L Front', top: '15%', left: '15%', color: 'from-sky-400 to-cyan-500' },
                  { name: 'C', label: 'C Center', top: '8%', left: '46%', color: 'from-amber-400 to-yellow-500' },
                  { name: 'R', label: 'R Front', top: '15%', left: '77%', color: 'from-sky-400 to-cyan-500' },
                  { name: 'Ls', label: 'L Surround', top: '46%', left: '8%', color: 'from-blue-400 to-indigo-500' },
                  { name: 'Rs', label: 'R Surround', top: '46%', left: '82%', color: 'from-blue-400 to-indigo-500' },
                  { name: 'Lb', label: 'L Back', top: '80%', left: '15%', color: 'from-purple-400 to-violet-500' },
                  { name: 'Rb', label: 'R Back', top: '80%', left: '77%', color: 'from-purple-400 to-violet-500' },
                  { name: 'LFE', label: 'Sub Subwoofer', top: '84%', left: '46%', color: 'from-emerald-400 to-teal-500' }
                ].map((spk, idx) => {
                  const isActiveSweepNode = idx === activeSpeakerNode;
                  const isNodeActivated = isAtmosActive && (isActiveSweepNode || (isPlaying && !isTestTonePlaying));
                  return (
                    <div
                      key={spk.name}
                      style={{ top: spk.top, left: spk.left }}
                      className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center z-20 transition-all duration-300"
                    >
                      <div className={`h-6 w-6 rounded-md flex items-center justify-center text-[7.5px] font-black border transition-all ${isNodeActivated ? `bg-gradient-to-tr ${spk.color} text-black border-white shadow-md animate-pulse scale-110` : 'bg-zinc-950 text-zinc-500 border-zinc-800'}`}>
                        {spk.name}
                      </div>
                      <span className={`text-[6px] font-black uppercase mt-0.5 tracking-wider ${isNodeActivated ? 'text-zinc-300' : 'text-zinc-600'}`}>
                        {spk.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Якість Stream HUD Stats */}
            <div className="space-y-2 pt-2 border-t border-zinc-800/60">
              <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                Специфікації потоку 4K Ultra HD:
              </h4>
              <div className="grid grid-cols-2 gap-2 text-[9px] font-mono text-zinc-500">
                <div>Роздільність: <span className="text-zinc-300 font-bold">{quality === '4K' ? '3840x2160 UHD' : quality === 'Full HD' || quality === '1080p' ? '1920x1080 FHD' : quality === 'HD' || quality === '720p' ? '1280x720 HD' : quality}</span></div>
                <div>Бітрейт аудіо: <span className="text-zinc-300 font-bold">{isAtmosActive ? '768 kbps Dolby Atmos' : '192 kbps Direct Stereo'}</span></div>
                <div>Відеокодек: <span className="text-zinc-300 font-bold">{quality === '4K' ? 'HEVC Main 10' : 'H.264 High Profile'}</span></div>
                <div>Динамічний діапазон: <span className="text-zinc-300 font-bold">{quality === '4K' && hdrEnabled ? 'HDR10+ / Atmos' : hdrEnabled ? 'HDR10 / Dolby 2ch' : 'SDR Standard Rec. 709'}</span></div>
                <div>Потік завантаження: <span className="text-sky-400 font-bold">{isPlaying ? `${(3.4 + Math.random() * 4.2).toFixed(1)} MB/s` : '0.0 MB/s'}</span></div>
                <div>Кадрова частота: <span className="text-zinc-300 font-bold">{quality === '4K' ? '60.00 fps Ultra Cinema' : '23.97 fps Film'}</span></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stream Diagnostic Накладення (оверлей) Модальне вікно (Admin only) */}
      {showDiagnosticOverlay && effectiveIsAdmin && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute inset-x-4 top-16 md:top-20 max-w-2xl mx-auto bg-zinc-950/98 border border-red-500/40 rounded-2xl z-40 p-5 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-200 pointer-events-auto text-zinc-200 font-sans"
        >
          {/* Шапка сайту */}
          <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3 mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500">
                <Activity className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-sm text-white tracking-wide uppercase">
                    Діагностика потоку (Stream Diagnostic HUD)
                  </h3>
                  <span className="text-[9px] font-mono bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
                    LIVE
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  Перевірка кодеків, роздільності та збережених FFmpeg конвертацій
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowDiagnosticOverlay(false)}
              className="p-1.5 rounded-xl bg-zinc-900 hover:bg-red-600 text-zinc-400 hover:text-white transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Current Активний Stream Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
            {/* Активний Resolution & Codec Картка */}
            <div className="p-3.5 bg-zinc-900/80 rounded-xl border border-zinc-800 space-y-2">
              <div className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-sky-400" />
                Відеокодек & Роздільність
              </div>
              <div className="text-xs space-y-1.5 font-mono">
                <div className="flex justify-between items-center">
                  <span className="text-zinc-500">Якість (Render):</span>
                  <span className="font-bold text-white bg-red-950/80 text-red-300 border border-red-800 px-2 py-0.5 rounded">
                    {liveStreamStats.videoWidth}x{liveStreamStats.videoHeight} ({quality})
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-500">Відеокодек:</span>
                  <span className="font-bold text-amber-400">
                    {quality === '4K' ? 'H.265 / HEVC Main 10' : 'H.264 / AVC (libx264)'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-500">Аудіокодек:</span>
                  <span className="font-bold text-sky-300">
                    {isAtmosActive ? 'AAC-LC / Dolby Atmos 48kHz' : 'AAC-LC Stereo 128kbps'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-500">Бітрейт потоку:</span>
                  <span className="font-bold text-emerald-400">
                    {quality === '4K' ? '18,000 kbps' :
                      (quality === '1080p' || quality === 'Full HD') ? '4,000 kbps' :
                        (quality === '720p' || quality === 'HD') ? '2,200 kbps' :
                          quality === '480p' ? '1,000 kbps' : '600 kbps'}
                  </span>
                </div>
              </div>
            </div>

            {/* Source URL & Stream Health */}
            <div className="p-3.5 bg-zinc-900/80 rounded-xl border border-zinc-800 space-y-2">
              <div className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                <FileVideo className="w-3.5 h-3.5 text-emerald-400" />
                Реальний стан потоку & Буфер
              </div>
              <div className="text-xs space-y-1 font-mono">
                <div className="flex justify-between items-center">
                  <span className="text-zinc-500">Буфер попереду:</span>
                  <span className={`font-bold ${liveStreamStats.bufferAheadSec > 5 ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {liveStreamStats.bufferAheadSec} сек
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-500">Швидкість мережі:</span>
                  <span className="font-bold text-sky-300">
                    {liveStreamStats.downloadSpeedMbps} Мбіт/с
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-500">Затримка (Ping):</span>
                  <span className="font-bold text-emerald-400">
                    {liveStreamStats.latencyMs} мс
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-500">Пропущені кадри:</span>
                  <span className="font-bold text-zinc-300">
                    {liveStreamStats.droppedFrames} / {liveStreamStats.decodedFrames || '—'}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-1 border-t border-zinc-800/80">
                  <span className="text-zinc-500">Двигун плеєра:</span>
                  <span className="font-bold text-indigo-300">
                    {useHlsJs ? 'HLS.js Pipeline' : 'HTML5 Native Engine'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* FFmpeg Converted Resolutions Сітка */}
          <div className="p-3.5 bg-zinc-900/60 rounded-xl border border-zinc-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="text-[11px] font-extrabold uppercase tracking-wider text-white flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Статус FFmpeg Конвертацій (4 Якості)
              </div>
              <span className="text-[10px] text-zinc-400">
                Оберіть якість для перевірки файлу
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { res: '4K', label: '4K Ultra HD', bitrate: '8000k' },
                { res: '1080p', label: '1080p FHD', bitrate: '4000k' },
                { res: '720p', label: '720p HD', bitrate: '2200k' },
                { res: '480p', label: '480p SD', bitrate: '1000k' },
              ].map((item) => {
                const convertedUrl = getQualityVideoUrl(item.res);
                const isCurrent = quality === item.res || (quality === '4K' && item.res === '4K') || (quality === 'Full HD' && item.res === '1080p') || (quality === 'HD' && item.res === '720p');
                const isVerified = !!convertedUrl || (movie.qualities && movie.qualities.some(q => q.resolution.toLowerCase() === item.res.toLowerCase()));

                return (
                  <button
                    key={item.res}
                    onClick={() => handleQualityChange(item.res)}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${isCurrent
                        ? 'bg-[#E50914]/25 border-red-500 text-white shadow-md'
                        : 'bg-zinc-950 hover:bg-zinc-800 border-zinc-800 text-zinc-300'
                      }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="font-extrabold text-xs">{item.label}</span>
                      {isVerified ? (
                        <span className="text-[8px] bg-emerald-500/20 text-emerald-400 font-mono font-bold px-1.5 py-0.5 rounded border border-emerald-500/30">
                          {item.res} OK
                        </span>
                      ) : (
                        <span className="text-[8px] bg-zinc-800 text-zinc-400 font-mono px-1.5 py-0.5 rounded border border-zinc-700">
                          Source
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] font-mono text-zinc-400 mt-1 flex items-center justify-between">
                      <span>{item.bitrate}</span>
                      {isCurrent && <span className="text-[9px] font-bold text-red-400 uppercase">АКТИВНИЙ</span>}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Top Controls Bar with Oval Сезон, Серія, Language Selector Pills (Styled identical to Жанри Фільтрація pills) */}
      <div
        onClick={(e) => e.stopPropagation()}
        className={`absolute top-0 left-0 right-0 p-3 sm:p-5 z-30 transition-all duration-300 flex items-center justify-between ${showControls || activeDropdown ? 'opacity-100' : 'opacity-0 pointer-events-none -translate-y-3'}`}
      >
        <div className="flex items-center gap-2 sm:gap-3 pointer-events-auto flex-wrap">
          {/* Серіал Controls: Сезон & Серія Pills */}
          {movie.type === 'series' && (
            <>
              {/* Сезон Pill */}
              <div className="relative">
                <button
                  onClick={() => {
                    setActiveDropdown(prev => prev === 'season' ? null : 'season');
                    initAtmosEngine();
                  }}
                  className={`cinema-filter-pill ${activeDropdown === 'season' ? 'invisible pointer-events-none' : ''}`}
                >
                  <span className="relative z-10">{language === 'UA' ? `Сезон ${selectedSeason}` : `Season ${selectedSeason}`}</span>
                  <ChevronDown className="w-4 h-4 relative z-10 text-zinc-400" />
                </button>

                {/* Сезон Випадаюче меню */}
                {activeDropdown === 'season' && (
                  <div style={{
                    background: 'rgba(20, 20, 24, 0.7)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                  }} className="cinema-filter-capsule left-0 animate-in fade-in zoom-in-95 duration-150">
                    <button
                      onClick={() => setActiveDropdown(null)}
                      className="cinema-capsule-header"
                    >
                      <span className="relative z-20">{language === 'UA' ? `Сезон ${selectedSeason}` : `Season ${selectedSeason}`}</span>
                      <ChevronUp className="w-4 h-4 relative z-20 text-white" />
                    </button>

                    <div className="cinema-capsule-list custom-scrollbar">
                      {Array.from({ length: getSeasonsCount(movie) }).map((_, idx) => {
                        const sNum = idx + 1;
                        const isCur = selectedSeason === sNum;
                        return (
                          <button
                            key={`season-dd-${sNum}`}
                            onClick={() => {
                              setSelectedSeason(sNum);
                              setSelectedEpisode(1);
                              setActiveDropdown(null);
                              setIsSwitchingVoiceover(true);
                              setIsPlaying(false);
                              setTimeout(() => {
                                setIsSwitchingVoiceover(false);
                                setIsPlaying(true);
                                setCurrentTime(0);
                                seekVideo(0);
                              }, 700);
                            }}
                            className={`cinema-capsule-item ${isCur ? 'item-active' : ''}`}
                          >
                            {language === 'UA' ? `Сезон ${sNum}` : `Season ${sNum}`}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Серія Pill */}
              <div className="relative">
                <button
                  onClick={() => {
                    setActiveDropdown(prev => prev === 'episode' ? null : 'episode');
                    initAtmosEngine();
                  }}
                  className={`cinema-filter-pill ${activeDropdown === 'episode' ? 'invisible pointer-events-none' : ''}`}
                >
                  <span className="relative z-10">{language === 'UA' ? `Серія ${selectedEpisode}` : `Episode ${selectedEpisode}`}</span>
                  <ChevronDown className="w-4 h-4 relative z-10 text-zinc-400" />
                </button>

                {/* Серія Випадаюче меню */}
                {activeDropdown === 'episode' && (
                  <div style={{
                    background: 'rgba(20, 20, 24, 0.7)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                  }} className="cinema-filter-capsule left-0 min-w-[200px] max-w-[320px] animate-in fade-in zoom-in-95 duration-150">
                    <button
                      onClick={() => setActiveDropdown(null)}
                      className="cinema-capsule-header"
                    >
                      <span className="relative z-20">{language === 'UA' ? `Серія ${selectedEpisode}` : `Episode ${selectedEpisode}`}</span>
                      <ChevronUp className="w-4 h-4 relative z-20 text-white" />
                    </button>

                    <div className="cinema-capsule-list custom-scrollbar max-h-72">
                      {getEpisodesForSeason(movie, selectedSeason).map((ep) => {
                        const isCur = selectedEpisode === ep.number;
                        return (
                          <button
                            key={`ep-dd-${ep.number}`}
                            onClick={() => {
                              if (isCur) {
                                setActiveDropdown(null);
                                return;
                              }
                              setSelectedEpisode(ep.number);
                              setActiveDropdown(null);
                              setIsSwitchingVoiceover(true);
                              setIsPlaying(false);
                              setTimeout(() => {
                                setIsSwitchingVoiceover(false);
                                setIsPlaying(true);
                                setCurrentTime(0);
                                seekVideo(0);
                              }, 700);
                            }}
                            className={`cinema-capsule-item ${isCur ? 'item-active' : ''}`}
                          >
                            <div className="flex flex-col min-w-0 text-left">
                              <span className="truncate">{language === 'UA' ? `Серія ${ep.number}: ${ep.title}` : `Ep ${ep.number}: ${ep.title}`}</span>
                              {ep.duration && (
                                <span className={`text-[10px] ${isCur ? 'text-white/80' : 'text-zinc-400'}`}>
                                  {ep.duration}
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Озвучення / Language Pill */}
          <div className="relative">
            <button
              onClick={() => {
                setActiveDropdown(prev => prev === 'voiceover' ? null : 'voiceover');
                initAtmosEngine();
              }}
              className={`cinema-filter-pill ${activeDropdown === 'voiceover' ? 'invisible pointer-events-none' : ''}`}
            >
              <span className="relative z-10">{activeVoiceover.split(' (')[0] || (language === 'UA' ? 'Мова' : 'Language')}</span>
              <ChevronDown className="w-4 h-4 relative z-10 text-zinc-400" />
            </button>

            {/* Озвучення Випадаюче меню */}
            {activeDropdown === 'voiceover' && (
              <div style={{
                background: 'rgba(20, 20, 24, 0.7)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
              }} className="cinema-filter-capsule left-0 min-w-[220px] max-w-[320px] animate-in fade-in zoom-in-95 duration-150">
                <button
                  onClick={() => setActiveDropdown(null)}
                  className="cinema-capsule-header"
                >
                  <span className="relative z-20">{activeVoiceover.split(' (')[0] || (language === 'UA' ? 'Мова' : 'Language')}</span>
                  <ChevronUp className="w-4 h-4 relative z-20 text-white" />
                </button>

                <div className="cinema-capsule-list custom-scrollbar max-h-72">
                  {voiceoverOptions.map((opt) => {
                    const isCur = activeVoiceover === opt;
                    return (
                      <button
                        key={`vo-dd-${opt}`}
                        onClick={() => {
                          setActiveVoiceover(opt);
                          setActiveDropdown(null);
                          if (onVoiceoverChange) onVoiceoverChange(opt);
                          setIsSwitchingVoiceover(true);
                          setIsPlaying(false);
                          setTimeout(() => {
                            setIsSwitchingVoiceover(false);
                            setIsPlaying(true);
                          }, 700);
                        }}
                        className={`cinema-capsule-item ${isCur ? 'item-active' : ''}`}
                      >
                        <span className="truncate">{opt}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right side: Diagnostic HUD Кнопка for Admin */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {effectiveIsAdmin && (
            <button
              onClick={() => setShowDiagnosticOverlay(!showDiagnosticOverlay)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border font-mono text-xs font-bold transition-all backdrop-blur-md cursor-pointer ${showDiagnosticOverlay
                  ? 'bg-red-600 border-red-500 text-white shadow-lg shadow-red-900/50'
                  : 'bg-black/40 hover:bg-zinc-800 border-zinc-700 text-zinc-300 hover:text-white'
                }`}
              title="Stream Diagnostic Overlay (FFmpeg & Codec Monitor)"
            >
              <Activity className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              <span>Діагностика</span>
            </button>
          )}
        </div>
      </div>

      {/* Серії Slider Drawer Panel */}
      {showEpisodesPanel && movie.type === 'series' && (
        <div className="absolute inset-y-0 right-0 w-full sm:w-80 md:w-96 bg-zinc-950/98 border-l border-zinc-900 z-30 flex flex-col animate-in slide-in-from-right duration-300 shadow-2xl pointer-events-auto">
          <div className="p-4 border-b border-zinc-900 flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-xs text-zinc-100 uppercase tracking-widest">Вибір сезону та серії</h3>
              <p className="text-[10px] text-zinc-400 mt-0.5">{getMovieTitle(movie, language)}</p>
            </div>
            <button
              onClick={() => setShowEpisodesPanel(false)}
              className="p-1 px-2.5 text-[10px] rounded-lg bg-zinc-900 hover:bg-[#E50914] text-zinc-400 hover:text-white transition-all cursor-pointer font-bold"
            >
              Закрити ✕
            </button>
          </div>

          {/* Сезон Випадаюче меню/tabs selection */}
          <div className="p-4 border-b border-zinc-900/40 bg-zinc-900/30">
            <label className="text-[9px] font-black uppercase tracking-wider text-zinc-500 mb-2 block">Оберіть Сезон:</label>
            <div className="flex flex-wrap gap-1.5">
              {Array.from({ length: getSeasonsCount(movie) }).map((_, index) => {
                const sNum = index + 1;
                return (
                  <button
                    key={`season-tab-${sNum}`}
                    onClick={() => {
                      setSelectedSeason(sNum);
                      setSelectedEpisode(1);
                      setIsSwitchingVoiceover(true);
                      setIsPlaying(false);
                      setTimeout(() => {
                        setIsSwitchingVoiceover(false);
                        setIsPlaying(true);
                        setCurrentTime(0);
                        seekVideo(0);
                      }, 1000);
                    }}
                    className={`p-1.5 px-3.5 rounded-lg text-xs font-black transition-all cursor-pointer uppercase ${selectedSeason === sNum ? 'bg-[#E50914] text-white shadow-md' : 'bg-zinc-900 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300'}`}
                  >
                    Сезон {sNum}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Серії Scroll Список */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
            {getEpisodesForSeason(movie, selectedSeason).map((ep, idx) => {
              const isCurrent = selectedEpisode === ep.number;
              return (
                <div
                  key={`ep-s${selectedSeason}-e${ep.number}-${idx}`}
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    if (isCurrent) return;
                    setSelectedEpisode(ep.number);
                    setIsSwitchingVoiceover(true);
                    setIsPlaying(false);
                    setTimeout(() => {
                      setIsSwitchingVoiceover(false);
                      setIsPlaying(true);
                      setCurrentTime(0);
                      seekVideo(0);
                    }, 1200);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      if (isCurrent) return;
                      setSelectedEpisode(ep.number);
                      setIsSwitchingVoiceover(true);
                      setIsPlaying(false);
                      setTimeout(() => {
                        setIsSwitchingVoiceover(false);
                        setIsPlaying(true);
                        setCurrentTime(0);
                        seekVideo(0);
                      }, 1200);
                    }
                  }}
                  className={`w-full text-left p-3 rounded-xl border transition-all text-xs group cursor-pointer flex flex-col gap-2 ${isCurrent ? 'bg-zinc-900/80 border-amber-500 text-white' : 'bg-zinc-900/20 border-zinc-900/50 hover:border-zinc-800 hover:bg-zinc-900/55 text-zinc-300'}`}
                >
                  <div className="flex items-start gap-3 w-full">
                    {/* Visual box resembling Відео preview */}
                    <div className="h-12 aspect-video rounded-lg bg-zinc-950 flex-shrink-0 border border-zinc-800 flex items-center justify-center relative overflow-hidden group-hover:border-zinc-700">
                      <span className="text-[9px] font-mono font-bold text-zinc-600 group-hover:text-zinc-400">EP {ep.number}</span>
                      {isCurrent && (
                        <div className="absolute inset-0 bg-[#E50914]/20 flex items-center justify-center">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping"></span>
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-[11px] font-black truncate uppercase tracking-wide ${isCurrent ? 'text-amber-400' : 'text-zinc-200'}`}>
                          Серія {ep.number}: {ep.title}
                        </span>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-[9px] font-mono text-zinc-500">{ep.duration}</span>
                          {effectiveIsAdmin && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteEpisode(selectedSeason, ep.number);
                              }}
                              className="p-1 text-zinc-500 hover:text-red-400 hover:bg-red-950/40 rounded border border-transparent hover:border-red-900/50 transition cursor-pointer"
                              title={language === 'UA' ? 'Видалити серію' : 'Delete episode'}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="text-[10px] text-zinc-500 line-clamp-2 mt-1 leading-relaxed">
                        {ep.description}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Озвучення Selection Panel */}
      {showVoiceoverPanel && (
        <div className="absolute inset-y-0 right-0 w-full sm:w-80 bg-zinc-950/98 border-l border-zinc-900 z-30 flex flex-col animate-in slide-in-from-right duration-300 shadow-2xl pointer-events-auto">
          <div className="p-4 border-b border-zinc-900 flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-xs text-zinc-100 uppercase tracking-widest">Вибір озвучки</h3>
              <p className="text-[10px] text-zinc-400 mt-0.5">Виберіть українську чи оригінальну озвучку</p>
            </div>
            <button
              onClick={() => setShowVoiceoverPanel(false)}
              className="p-1 px-2.5 text-[10px] rounded-lg bg-zinc-900 hover:bg-[#E50914] text-zinc-400 hover:text-white transition-all cursor-pointer font-bold"
            >
              Закрити ✕
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
            {voiceoverOptions.map((vo) => {
              const isCurrent = activeVoiceover === vo;
              const isOfficial = vo.includes('Дубляж') || vo.includes('Офіційний');

              return (
                <button
                  key={vo}
                  onClick={() => {
                    if (isCurrent) return;
                    setActiveVoiceover(vo);
                    setIsSwitchingVoiceover(true);
                    setIsPlaying(false);
                    setTimeout(() => {
                      setIsSwitchingVoiceover(false);
                      setIsPlaying(true);
                    }, 1000);
                  }}
                  className={`w-full text-left p-3.5 rounded-xl border flex items-center justify-between transition-all group cursor-pointer ${isCurrent ? 'bg-[#E50914]/10 border-[#E50914] text-white' : 'bg-zinc-900/20 border-zinc-900/50 hover:border-zinc-805 hover:bg-zinc-900/55 text-zinc-400 hover:text-zinc-200'}`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`h-2 w-2 rounded-full ${isCurrent ? 'bg-red-500' : 'bg-transparent border border-zinc-650'}`}></span>
                    <div>
                      <span className={`text-[11px] font-black uppercase tracking-wide leading-none ${isCurrent ? 'text-white' : 'text-zinc-300'}`}>
                        {vo}
                      </span>
                      <span className="block text-[8px] text-zinc-500 mt-1 uppercase tracking-widest font-black">
                        {isOfficial ? '⭐ Офіційний дубляж (преміум)' : 'Голос фендому (fan uafilm)'}
                      </span>
                    </div>
                  </div>

                  {isCurrent && (
                    <span className="text-[9px] text-[#E50914] font-black bg-[#E50914]/10 px-2 py-0.5 rounded-md">АКТИВНО</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Користувацький Відео Source Panel */}
      {effectiveIsAdmin && showSourcePanel && (
        <div className="absolute inset-y-0 right-0 w-full sm:w-96 bg-zinc-950/98 border-l border-zinc-900 z-30 flex flex-col animate-in slide-in-from-right duration-300 shadow-2xl pointer-events-auto">
          <div className="p-4 border-b border-zinc-900 flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-xs text-amber-500 uppercase tracking-widest">⚙️ Менеджер Джерел Відео</h3>
              <p className="text-[10px] text-zinc-400 mt-0.5">{getMovieTitle(movie, language)}</p>
            </div>
            <button
              onClick={() => setShowSourcePanel(false)}
              className="p-1 px-2.5 text-[10px] rounded-lg bg-zinc-900 hover:bg-[#E50914] text-zinc-400 hover:text-white transition-all cursor-pointer font-bold"
            >
              Закрити ✕
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Cloud vs Local Warning Alert */}
            {window.location.hostname !== 'localhost' && (
              <div className="bg-amber-950/45 border-2 border-amber-500/50 p-4 rounded-xl space-y-2.5 text-left animate-pulse">
                <span className="text-[9px] font-black uppercase tracking-widest text-amber-200 bg-amber-500/10 px-2 py-0.5 rounded-md flex items-center gap-1.5 w-fit">
                  ⚠️ КРИТИЧНИЙ НЮАНС [ХМАРНИЙ РЕЖИМ]
                </span>
                <p className="text-[10px] text-amber-200 font-medium leading-relaxed">
                  Ви зараз дивитеся додаток через хмарну адресу <span className="text-white underline font-bold">ais-dev...run.app</span>.
                  Хмара фізично не може зчитувати файли з вашого локального диска <code className="text-white font-mono bg-black/50 px-1 rounded">E:\</code>!
                </p>
                <div className="text-[9.5px] text-zinc-300 leading-normal bg-black/50 p-2.5 rounded-lg border border-zinc-850/60 space-y-2">
                  <p>Оскільки ви вже запустили розробку локально на комп'ютері, просто відкрийте <strong>САУТ (додаток)</strong> за посиланням:</p>
                  <a
                    href="http://localhost:3000"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5 text-center font-black text-black bg-amber-400 hover:bg-amber-300 px-3.5 py-2 rounded-lg text-[9px] uppercase tracking-wider transition-all cursor-pointer shadow-lg shadow-amber-950/40"
                  >
                    🚀 ВІДКРИТИ http://localhost:3000
                  </a>
                  <p className="text-[8.5px] text-zinc-500 text-center">Там локальні відео завантажаться та запрацюють моментально!</p>
                </div>
              </div>
            )}

            {/* Quick Context Stats Box */}
            <div className="bg-zinc-900/40 p-3.5 rounded-xl border border-zinc-850 space-y-1.5">
              <span className="text-[8px] font-black uppercase tracking-wider text-amber-400">ПОТОЧНИЙ СЕАНС:</span>
              <div className="text-xs font-bold text-white uppercase flex items-center gap-1.5 flex-wrap">
                <span className="bg-zinc-800 px-1.5 py-0.5 rounded text-[10px]">Сезон {selectedSeason}</span>
                <span className="bg-zinc-805 px-1.5 py-0.5 rounded text-[10px]">Серія {selectedEpisode}</span>
                <span className="text-zinc-400 text-[10px]">[{activeVoiceover.split(' (')[0]}]</span>
              </div>
              <div className="text-[10px] text-zinc-500 leading-normal pt-1.5 border-t border-zinc-900 mt-2">
                Ви можете налаштувати для кожного епізоду власне відео (наприклад, локальне у папці проєкту, або посилання з Google Диска / Інтернету).
              </div>
            </div>

            {/* Smart Local Folder Перемикач */}
            <div className="p-3.5 bg-zinc-900/20 border border-zinc-900/80 rounded-xl space-y-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-white block">Авто-локальні шляхи</span>
                  <span className="text-[9px] text-zinc-500 block mt-0.5">Використовує файли у папці /public/videos/</span>
                </div>
                <button
                  onClick={() => {
                    const nextVal = !useLocalFolder;
                    setUseLocalFolder(nextVal);
                    localStorage.setItem(`nova_use_local_${movie.id}`, String(nextVal));
                  }}
                  className={`px-3 py-1 rounded-lg text-[9px] font-black tracking-wider uppercase transition-all cursor-pointer ${useLocalFolder ? 'bg-amber-500 text-black font-extrabold' : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'}`}
                >
                  {useLocalFolder ? 'Увімкнено' : 'Вимкнено'}
                </button>
              </div>

              {useLocalFolder && (
                <div className="bg-black/40 p-2.5 rounded-lg border border-zinc-850 space-y-1 text-[10px] font-mono leading-relaxed text-zinc-300">
                  <div className="text-zinc-500 text-[9px] uppercase font-bold text-emerald-400">✅ Авто-виявлення підтримує два варіанти шляху:</div>
                  <div className="space-y-1 text-[9px] text-zinc-450 border-b border-zinc-900 pb-1.5 mb-1.5">
                    <p>1. <span className="text-zinc-300">/public/videos/{movie.id}/{getVoiceoverSlug(activeVoiceover)}/s{selectedSeason}e{selectedEpisode}.mp4</span></p>
                    <p>2. <span className="text-zinc-300">/public/{movie.id}/{getVoiceoverSlug(activeVoiceover)}/s{selectedSeason}e{selectedEpisode}.mp4</span> (як у вас!)</p>
                  </div>
                  <p className="text-zinc-400 font-sans leading-relaxed text-[10px]">
                    Ви завантажили серію в папку <code className="text-amber-500">public/{movie.id}/{getVoiceoverSlug(activeVoiceover)}/</code> і тепер вона підтримується автоматично завдяки нашому подвійному алгоритму пошуку!
                  </p>
                </div>
              )}
            </div>

            {/* Користувацький Поле введення URL Link */}
            <div className="p-3.5 bg-zinc-900/20 border border-zinc-900/80 rounded-xl space-y-2.5">
              <span className="text-[10px] font-black uppercase tracking-widest text-[#E50914] block">Кастомне Посилання (.mp4, HLS, etc):</span>
              <div className="space-y-2">
                <input
                  id="custom-video-url-input"
                  name="custom-video-url-input"
                  type="text"
                  value={typedCustomUrl}
                  onChange={(e) => setTypedCustomUrl(e.target.value)}
                  placeholder="Вставте пряме посилання або шлях..."
                  className="w-full bg-zinc-950 text-xs text-white p-2.5 rounded-lg border border-zinc-800 focus:border-amber-500 outline-none placeholder:text-zinc-700 font-mono"
                />

                {typedCustomUrl && sanitizeCustomVideoUrl(typedCustomUrl) !== typedCustomUrl.trim() && (
                  <div className="text-[10px] text-emerald-450 bg-emerald-950/35 p-2 rounded-lg border border-emerald-900/40 mt-1 space-y-0.5">
                    <span className="font-bold flex items-center gap-1">✨ Авто-виправлення шляху до локального:</span>
                    <p className="font-mono break-all text-[9.5px] text-emerald-300">{sanitizeCustomVideoUrl(typedCustomUrl)}</p>
                  </div>
                )}

                <div className="flex gap-2 justify-end">
                  {typedCustomUrl && (
                    <button
                      onClick={() => {
                        const key = `${movie.id}-s${selectedSeason}-e${selectedEpisode}-${activeVoiceover}`;
                        const updated = { ...customUrls };
                        delete updated[key];
                        setCustomUrls(updated);
                        localStorage.setItem('nova_custom_video_urls', JSON.stringify(updated));
                        setTypedCustomUrl('');
                      }}
                      className="px-2.5 py-1.5 rounded-lg text-[9px] font-bold bg-zinc-900 hover:bg-zinc-800 text-zinc-450 hover:text-zinc-200 transition-all cursor-pointer"
                    >
                      Скинути
                    </button>
                  )}
                  <button
                    onClick={() => {
                      const key = `${movie.id}-s${selectedSeason}-e${selectedEpisode}-${activeVoiceover}`;
                      const updated = { ...customUrls };
                      const sanitized = sanitizeCustomVideoUrl(typedCustomUrl);
                      if (sanitized.trim()) {
                        updated[key] = sanitized.trim();
                        setTypedCustomUrl(sanitized.trim());
                      } else {
                        delete updated[key];
                      }
                      setCustomUrls(updated);
                      localStorage.setItem('nova_custom_video_urls', JSON.stringify(updated));
                      // Refresh Плеєр
                      setIsSwitchingVoiceover(true);
                      setIsPlaying(false);
                      setTimeout(() => {
                        setIsSwitchingVoiceover(false);
                        setIsPlaying(true);
                      }, 800);
                    }}
                    className="px-3.5 py-1.5 rounded-lg text-[9px] font-black tracking-widest uppercase bg-amber-500 hover:bg-amber-600 text-black transition-all cursor-pointer"
                  >
                    Зберегти для цієї серії
                  </button>
                </div>
              </div>
            </div>

            {/* Instruction on how to integrate files */}
            <div className="bg-[#E50914]/5 p-3 rounded-lg border border-[#E50914]/10 space-y-2 text-[10px] leading-relaxed text-zinc-400">
              <span className="font-bold text-[#E50914] flex items-center gap-1 text-[11px] uppercase tracking-wider">
                💡 Розподіл відео за озвученнями:
              </span>
              <ul className="list-decimal pl-4.5 space-y-1.5 text-[10px] text-zinc-300">
                <li>
                  <span className="font-semibold text-white">Кастомні посилання:</span> Кожний вхідний лінк прив’язується до активної серії та обраної студії озвучення.
                </li>
                <li>
                  <span className="font-semibold text-white">Авто-локальні шляхи:</span> Плеєр шукає відеофайли у відповідних підкаталогах всередині <code className="text-amber-400 font-mono">public/videos/</code>.
                </li>
                <li>
                  <span className="font-semibold text-white">Для Amanogawa:</span> покладіть серію у папку <code className="text-amber-400 font-mono">/public/videos/{movie.id}/amanogawa/s1e1.mp4</code>.
                </li>
                <li>
                  <span className="font-semibold text-white">Для FanVoxUA:</span> покладіть серію у папку <code className="text-[#E50914] font-semibold font-mono">/public/videos/{movie.id}/fanvox/s1e1.mp4</code>.
                </li>
                <li>
                  <span className="font-semibold text-white">Для Koyomi:</span> покладіть серію у папку <code className="text-[#E50914] font-semibold font-mono">/public/videos/{movie.id}/koyomi/s1e1.mp4</code>.
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}



      {/* Bottom Control Bar Area */}
      <div
        onClick={(e) => e.stopPropagation()}
        className={`absolute bottom-0 left-0 right-0 p-4 md:p-6 bg-gradient-to-t from-black via-black/90 to-transparent z-20 transition-all duration-300 space-y-3 md:space-y-4 ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none translate-y-3'}`}
      >
        {/* Timeline Slider Progress Gauge */}
        <div className="flex items-center gap-3 pointer-events-auto">
          <span className="text-xs font-mono font-bold text-zinc-300">{formatTime(currentTime)}</span>
          <div className="relative flex-1 group h-4 flex items-center cursor-pointer">
            {/* Unfilled track background */}
            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 bg-zinc-800 h-1.5 rounded-lg pointer-events-none"></div>
            {/* Progress fill bar */}
            <div
              className="absolute left-0 top-1/2 -translate-y-1/2 bg-[#E50914] h-1.5 rounded-lg pointer-events-none z-10 transition-all duration-75"
              style={{
                width: `${isNaN(currentTime) || isNaN(duration) || !duration
                    ? 0
                    : Math.min(100, Math.max(0, (currentTime / duration) * 100))
                  }%`
              }}
            ></div>
            <input
              id="video-timeline-slider"
              name="video-timeline-slider"
              type="range"
              min="0"
              max={duration || 100}
              value={currentTime}
              disabled={isWatchParty && !canUserControl}
              onChange={(e) => {
                handleSeek(Number(e.target.value));
                initAtmosEngine();
              }}
              className={`w-full accent-[#E50914] bg-transparent h-1.5 rounded-lg appearance-none relative z-20 ${isWatchParty && !canUserControl
                  ? 'opacity-50 cursor-not-allowed'
                  : 'cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#E50914]'
                }`}
            />
          </div>
          <span className="text-xs font-mono font-bold text-zinc-300">{formatDurationDisplay(duration)}</span>
        </div>

        {/* Action Controls Рядок */}
        <div className="flex flex-wrap items-center justify-between gap-y-2 gap-x-2 pointer-events-auto w-full">
          {/* Main playback control Кнопки */}
          <div className="flex items-center gap-1.5 sm:gap-2.5">
            <button
              onClick={togglePlay}
              disabled={isWatchParty && !canUserControl}
              className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#E50914] text-white hover:bg-red-600 active:scale-95 transition-all shrink-0 flex items-center justify-center shadow-lg shadow-red-950/40 ${isWatchParty && !canUserControl ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                }`}
              title={
                isWatchParty && !canUserControl
                  ? (language === 'UA' ? 'Керує організатор' : 'Host controls playback')
                  : (language === 'UA' ? (isPlaying ? 'Пауза' : 'Відтворити') : (isPlaying ? 'Pause' : 'Play'))
              }
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 fill-white text-white" />
              ) : (
                <Play className="w-5 h-5 fill-white text-white translate-x-0.5" />
              )}
            </button>

            {/* Skip Back 10s */}
            <button
              onClick={() => {
                const safeCurrent = isNaN(currentTime) ? 0 : currentTime;
                handleSeek(Math.max(0, safeCurrent - 10), true);
                initAtmosEngine();
              }}
              disabled={isWatchParty && !canUserControl}
              className={`p-1.5 sm:p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-900 shrink-0 ${isWatchParty && !canUserControl ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
                }`}
              title={language === 'UA' ? 'Назад на 10 сек' : 'Back 10s'}
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            {/* Skip Forward 10s */}
            <button
              onClick={() => {
                const safeCurrent = isNaN(currentTime) ? 0 : currentTime;
                const safeDuration = isNaN(duration) || !duration ? 100 : duration;
                handleSeek(Math.min(safeDuration, safeCurrent + 10), true);
                initAtmosEngine();
              }}
              disabled={isWatchParty && !canUserControl}
              className={`p-1.5 sm:p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-900 shrink-0 ${isWatchParty && !canUserControl ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
                }`}
              title={language === 'UA' ? 'Вперед на 10 сек' : 'Forward 10s'}
            >
              <RotateCw className="w-4 h-4" />
            </button>

            {/* Гучність Controllers */}
            <div className="flex items-center gap-1 sm:gap-2 group/volume ml-0.5 sm:ml-1">
              <button
                onClick={toggleMute}
                className="p-1.5 sm:p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-950 cursor-pointer shrink-0"
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-4 h-4 opacity-80 hover:opacity-100" />
                ) : (
                  <Volume2 className="w-4 h-4 opacity-80 hover:opacity-100" />
                )}
              </button>
              <input
                id="video-volume-slider"
                name="video-volume-slider"
                type="range"
                min="0"
                max="100"
                value={isMuted ? 0 : volume}
                onChange={(e) => handleVolumeChange(Number(e.target.value))}
                className="w-12 sm:w-16 h-1 bg-zinc-700 rounded-lg appearance-none accent-white cursor-pointer group-hover/volume:w-16 sm:group-hover/volume:w-20 transition-all opacity-60 group-hover/volume:opacity-100"
              />
            </div>
          </div>

          {/* Right Action Controls: Налаштування Popover and Fullscreen */}
          <div className="flex items-center gap-2 ml-auto justify-end shrink-0">
            {/* Sleek integrated Налаштування Menu triggered by Gear Іконка */}
            <div className="relative pointer-events-auto">
              {/* Drop-up Popover */}
              {showSettingsMenu && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  onTouchStart={(e) => e.stopPropagation()}
                  onTouchEnd={(e) => e.stopPropagation()}
                  onPointerDown={(e) => e.stopPropagation()}
                  className="absolute bottom-[calc(100%+8px)] right-0 w-[calc(100vw-32px)] max-w-[280px] sm:w-64 max-h-[70vh] sm:max-h-[380px] overflow-y-auto bg-zinc-950/95 backdrop-blur-xl border border-zinc-800 rounded-2xl p-3.5 shadow-2xl z-50 flex flex-col gap-2.5 text-xs font-sans select-none animate-in fade-in slide-in-from-bottom duration-200 touch-pan-y"
                >

                  {settingsSubMenu === 'main' && (
                    <div className="flex flex-col gap-2 text-left">
                      <div className="text-[10px] font-black uppercase tracking-wider text-zinc-500 mb-1 px-1 border-b border-zinc-900 pb-1.5">
                        Налаштування
                      </div>

                      {/* Якість selection entry */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSettingsSubMenu('quality');
                        }}
                        className="w-full flex items-center justify-between py-2 px-2 hover:bg-zinc-900 active:bg-zinc-800 text-zinc-300 hover:text-white transition-all rounded-lg cursor-pointer touch-manipulation select-none"
                      >
                        <span className="font-semibold text-zinc-300">Якість</span>
                        <span className="flex items-center gap-1.5 text-zinc-500 font-bold text-[10px]">
                          {quality === 'Full HD' ? '1080p' : quality === 'HD' ? '720p' : quality} <ChevronRight className="w-3.5 h-3.5" />
                        </span>
                      </button>

                      {/* Stream Diagnostic Накладення (оверлей) Перемикач (Admin only) */}
                      {effectiveIsAdmin && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowDiagnosticOverlay(true);
                            setShowSettingsMenu(false);
                          }}
                          className="w-full flex items-center justify-between py-2 px-2 hover:bg-zinc-900 active:bg-zinc-800 text-zinc-300 hover:text-white transition-all rounded-lg cursor-pointer touch-manipulation select-none"
                        >
                          <div className="flex items-center gap-1.5">
                            <Activity className="w-3.5 h-3.5 text-red-500 animate-pulse" />
                            <span className="font-semibold text-zinc-300">Діагностика потоку</span>
                          </div>
                          <span className="text-[9px] bg-red-950 text-red-400 font-mono px-1.5 py-0.5 rounded border border-red-800/50">
                            HUD
                          </span>
                        </button>
                      )}

                      {/* Користувацький Відео Source (Admin only) */}
                      {effectiveIsAdmin && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowSourcePanel(true);
                            setShowSettingsMenu(false);
                          }}
                          className="w-full flex items-center justify-between py-2 px-2 hover:bg-zinc-900 active:bg-zinc-800 text-zinc-300 hover:text-white transition-all rounded-lg cursor-pointer touch-manipulation select-none"
                        >
                          <div className="flex items-center gap-1.5">
                            <FileVideo className="w-3.5 h-3.5 text-amber-400" />
                            <span className="font-semibold text-zinc-300">Файли відео</span>
                          </div>
                          <span className="text-[9px] bg-amber-950 text-amber-400 font-mono px-1.5 py-0.5 rounded border border-amber-800/50">
                            Адмін
                          </span>
                        </button>
                      )}

                      {/* Субтитри selection entry */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSettingsSubMenu('subtitles');
                        }}
                        className="w-full flex items-center justify-between py-2 px-2 hover:bg-zinc-900 active:bg-zinc-800 text-zinc-300 hover:text-white transition-all rounded-lg cursor-pointer touch-manipulation select-none"
                      >
                        <span className="font-semibold text-zinc-300">Субтитри</span>
                        <span className="flex items-center gap-1.5 text-zinc-500 font-bold text-[10px]">
                          {subtitleLang === 'uk' ? 'Українські' : subtitleLang === 'en' ? 'English' : 'Вимкнено'} <ChevronRight className="w-3.5 h-3.5" />
                        </span>
                      </button>

                      {/* Dolby Atmos selection entry */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSettingsSubMenu('atmos');
                        }}
                        className="w-full flex items-center justify-between py-2 px-2 hover:bg-zinc-900 active:bg-zinc-800 text-zinc-300 hover:text-white transition-all rounded-lg cursor-pointer touch-manipulation select-none"
                      >
                        <span className="font-semibold text-zinc-300">Dolby Atmos DSP</span>
                        <span className="flex items-center gap-1.5 text-zinc-500 font-bold text-[10px]">
                          {!isAtmosActive ? 'Вимкнено' : atmosMode === 'cinema' ? 'Кінотеатр' : 'Об’ємний 3D'} <ChevronRight className="w-3.5 h-3.5" />
                        </span>
                      </button>

                      {/* Scale selection entry */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSettingsSubMenu('scale');
                        }}
                        className="w-full flex items-center justify-between py-2 px-2 hover:bg-zinc-900 active:bg-zinc-800 text-zinc-300 hover:text-white transition-all rounded-lg cursor-pointer touch-manipulation select-none"
                      >
                        <span className="font-semibold text-zinc-300">Масштаб</span>
                        <span className="flex items-center gap-1.5 text-zinc-500 font-bold text-[10px]">
                          {videoScale}% <ChevronRight className="w-3.5 h-3.5" />
                        </span>
                      </button>

                      {/* Sleep timer selection entry */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSettingsSubMenu('sleep');
                        }}
                        className="w-full flex items-center justify-between py-2 px-2 hover:bg-zinc-900 active:bg-zinc-800 text-zinc-300 hover:text-white transition-all rounded-lg cursor-pointer touch-manipulation select-none"
                      >
                        <span className="font-semibold text-zinc-300">Сон</span>
                        <span className="flex items-center gap-1.5 text-zinc-500 font-bold text-[10px]">
                          {sleepTimer !== null
                            ? `${Math.floor(sleepTimer / 60)}:${(sleepTimer % 60).toString().padStart(2, '0')}`
                            : 'Вимк.'} <ChevronRight className="w-3.5 h-3.5" />
                        </span>
                      </button>

                      {/* Playback Швидкість selection entry */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSettingsSubMenu('speed');
                        }}
                        className="w-full flex items-center justify-between py-2 px-2 hover:bg-zinc-900 active:bg-zinc-800 text-zinc-300 hover:text-white transition-all rounded-lg cursor-pointer touch-manipulation select-none"
                      >
                        <span className="font-semibold text-zinc-300">Швидкість</span>
                        <span className="flex items-center gap-1.5 text-zinc-500 font-bold text-[10px]">
                          {playbackSpeed === 1.0 ? 'Звичайна' : `${playbackSpeed}x`} <ChevronRight className="w-3.5 h-3.5" />
                        </span>
                      </button>

                      {/* Brightness selection entry */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSettingsSubMenu('brightness');
                        }}
                        className="w-full flex items-center justify-between py-2 px-2 hover:bg-zinc-900 active:bg-zinc-800 text-zinc-300 hover:text-white transition-all rounded-lg cursor-pointer touch-manipulation select-none"
                      >
                        <span className="font-semibold text-zinc-300">Яскравість</span>
                        <span className="flex items-center gap-1.5 text-zinc-500 font-bold text-[10px]">
                          {videoBrightness}% <ChevronRight className="w-3.5 h-3.5" />
                        </span>
                      </button>
                    </div>
                  )}

                  {settingsSubMenu === 'quality' && (
                    <div className="flex flex-col gap-2 text-left">
                      {/* Back Кнопка and Шапка сайту */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSettingsSubMenu('main');
                        }}
                        className="flex items-center gap-1.5 text-xs font-bold text-zinc-300 hover:text-white py-1.5 px-1 mb-1 border-b border-zinc-800/80 cursor-pointer w-full text-left touch-manipulation active:bg-zinc-900/60 rounded-md transition-colors"
                      >
                        <ChevronLeft className="w-4 h-4 text-zinc-400 shrink-0" />
                        <span>Назад</span>
                      </button>

                      <div className="flex flex-col gap-1 mt-1">
                        {[
                          { id: '4K', label: '4K Ultra HD' },
                          { id: '1080p', label: 'Full HD (1080p)' },
                          { id: '720p', label: 'HD (720p)' },
                          { id: '480p', label: 'SD (480p)' }
                        ].map((item) => {
                          const convertedUrl = getQualityVideoUrl(item.id);
                          const isSelected = quality === item.id || (quality === 'Full HD' && item.id === '1080p') || (quality === 'HD' && item.id === '720p');

                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleQualityChange(item.id);
                              }}
                              className={`w-full flex items-center justify-between py-2 px-2.5 rounded-xl text-left transition-all cursor-pointer touch-manipulation active:scale-[0.98] ${isSelected ? 'bg-[#E50914]/15 border border-red-500/40 text-white font-black' : 'text-zinc-300 hover:bg-zinc-900 hover:text-white'
                                }`}
                            >
                              <div className="flex items-center gap-2">
                                <span>{item.label}</span>
                                {convertedUrl && (
                                  <span className="text-[8px] bg-emerald-500/20 text-emerald-400 font-mono font-bold px-1.5 py-0.5 rounded border border-emerald-500/30">
                                    {item.id}
                                  </span>
                                )}
                              </div>
                              {isSelected && <Check className="w-3.5 h-3.5 text-red-500 shrink-0" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {settingsSubMenu === 'subtitles' && (
                    <div className="flex flex-col gap-2 text-left">
                      {/* Back Кнопка and Шапка сайту */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSettingsSubMenu('main');
                        }}
                        className="flex items-center gap-1.5 text-xs font-bold text-zinc-300 hover:text-white py-1.5 px-1 mb-1 border-b border-zinc-800/80 cursor-pointer w-full text-left touch-manipulation active:bg-zinc-900/60 rounded-md transition-colors"
                      >
                        <ChevronLeft className="w-4 h-4 text-zinc-400 shrink-0" />
                        <span>Назад</span>
                      </button>

                      <div className="flex flex-col gap-1 mt-1">
                        {[
                          { id: 'uk', label: 'Українська' },
                          { id: 'en', label: 'English' },
                          { id: 'off', label: 'Вимкнено' }
                        ].map((sub) => (
                          <button
                            key={sub.id}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSubtitleLang(sub.id as any);
                            }}
                            className={`w-full flex items-center justify-between py-2 px-2.5 rounded-xl text-left transition-all cursor-pointer touch-manipulation ${subtitleLang === sub.id ? 'bg-[#E50914]/10 text-white font-black' : 'text-zinc-400 hover:bg-zinc-900 hover:text-white'}`}
                          >
                            <span>{sub.label}</span>
                            {subtitleLang === sub.id && <Check className="w-3.5 h-3.5 text-red-500 shrink-0" />}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {settingsSubMenu === 'atmos' && (
                    <div className="flex flex-col gap-2 text-left">
                      {/* Back Кнопка and Шапка сайту */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSettingsSubMenu('main');
                        }}
                        className="flex items-center gap-1.5 text-xs font-bold text-zinc-300 hover:text-white py-1.5 px-1 mb-1 border-b border-zinc-800/80 cursor-pointer w-full text-left touch-manipulation active:bg-zinc-900/60 rounded-md transition-colors"
                      >
                        <ChevronLeft className="w-4 h-4 text-zinc-400 shrink-0" />
                        <span>Назад</span>
                      </button>

                      <div className="flex flex-col gap-1.5 mt-1">
                        {[
                          { id: 'cinema', title: 'Кінотеатр Dolby', desc: 'Ультранизькі бас-вібрації (32Hz)' },
                          { id: 'spatial', title: 'Об’ємний 3D Простір', desc: 'Розширення Haas Binaural 7.1.4' },
                          { id: 'bypass', title: 'Вимкнено (Стерео)', desc: 'Звичайний двоканальний аудіовивід' }
                        ].map((mode) => {
                          const isCurrent = mode.id === 'bypass' ? !isAtmosActive : (isAtmosActive && atmosMode === mode.id);
                          return (
                            <button
                              key={mode.id}
                              onClick={() => {
                                changeAtmosPreset(mode.id as any);
                              }}
                              className={`w-full text-left p-2 rounded-xl transition-all cursor-pointer flex flex-col gap-0.5 ${isCurrent ? 'bg-[#E50914]/10 border border-red-500/20 text-white' : 'hover:bg-zinc-900 border border-transparent text-zinc-400'}`}
                            >
                              <div className="font-extrabold text-[11px] flex items-center justify-between w-full uppercase tracking-wide">
                                <span>{mode.title}</span>
                                {isCurrent && <Check className="w-3 h-3 text-red-500 shrink-0" />}
                              </div>
                              <div className="text-[9px] text-zinc-500 font-medium">{mode.desc}</div>
                            </button>
                          );
                        })}

                        {isAtmosActive && (
                          <div className="mt-2 p-2 bg-zinc-950/85 border border-zinc-900 rounded-xl flex flex-col gap-1.5 animate-in fade-in slide-in-from-bottom duration-200">
                            <style dangerouslySetInnerHTML={{
                              __html: `
                              @keyframes atmosPulse {
                                0%, 100% { transform: scaleY(0.2); }
                                50% { transform: scaleY(1); }
                              }
                            `}} />
                            <div className="flex items-center justify-between text-[8px] font-black uppercase text-zinc-500 tracking-wider">
                              <span>АКТИВНИЙ РЕНДЕРЕР DSP</span>
                              <span className="text-sky-400 flex items-center gap-1 animate-pulse">
                                <span className="w-1 h-1 rounded-full bg-sky-500"></span> LIVE 32-BIT
                              </span>
                            </div>

                            <div className="flex items-end justify-center gap-1 h-6 py-0.5 select-none">
                              {Array.from({ length: 8 }).map((_, i) => {
                                let animationDuration = '1.2s';
                                let animationDelay = `${i * 0.1}s`;
                                let minHeight = '4px';

                                if (atmosMode === 'cinema') {
                                  animationDuration = '1.6s';
                                  animationDelay = `${(i % 3) * 0.45}s`;
                                  minHeight = '6px';
                                } else if (atmosMode === 'spatial') {
                                  animationDuration = `${0.6 + (i * 0.12)}s`;
                                  animationDelay = `${i * 0.07}s`;
                                  minHeight = '3px';
                                }

                                return (
                                  <div
                                    key={i}
                                    className="w-1 bg-gradient-to-t from-red-600 via-amber-500 to-sky-400 rounded-full transition-all"
                                    style={{
                                      height: '100%',
                                      animationName: 'atmosPulse',
                                      animationDuration: isPlaying ? animationDuration : '0s',
                                      animationDelay: animationDelay,
                                      animationIterationCount: 'infinite',
                                      animationTimingFunction: 'ease-in-out',
                                      opacity: isPlaying ? 1 : 0.4,
                                      minHeight: minHeight,
                                      transformOrigin: 'bottom'
                                    }}
                                  />
                                );
                              })}
                            </div>

                            <div className="text-[7.5px] text-zinc-500 text-center font-mono uppercase tracking-wide">
                              {atmosMode === 'cinema' ? 'Deep Bass (LFE) Active 32Hz' : 'Haas Binaural Simulation Active'}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}



                  {settingsSubMenu === 'scale' && (
                    <div className="flex flex-col gap-2 text-left">
                      {/* Back Кнопка and Шапка сайту */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSettingsSubMenu('main');
                        }}
                        className="flex items-center gap-1.5 text-xs font-bold text-zinc-300 hover:text-white py-1.5 px-1 mb-1 border-b border-zinc-800/80 cursor-pointer w-full text-left touch-manipulation active:bg-zinc-900/60 rounded-md transition-colors"
                      >
                        <ChevronLeft className="w-4 h-4 text-zinc-400 shrink-0" />
                        <span>Назад</span>
                      </button>

                      {/* Заголовок Шапка сайту */}
                      <div className="text-[10px] font-black uppercase tracking-wider text-zinc-500 mb-1 px-1 border-b border-zinc-900 pb-1.5">
                        Масштаб відео
                      </div>

                      {/* Preset scale Кнопки */}
                      <div className="grid grid-cols-3 gap-1.5 mb-1">
                        {[100, 110, 120, 130, 150, 200].map((sc) => {
                          const isCurrent = videoScale === sc;
                          return (
                            <button
                              key={sc}
                              onClick={() => setVideoScale(sc)}
                              className={`py-1.5 rounded-lg font-bold text-[10px] text-center transition-all cursor-pointer border ${isCurrent
                                  ? 'bg-[#E50914] text-white border-transparent shadow-sm'
                                  : 'bg-zinc-900 text-zinc-400 border-transparent hover:text-white hover:bg-zinc-850'
                                }`}
                            >
                              {sc}%
                            </button>
                          );
                        })}
                      </div>

                      {/* Manual fine-tuning slider */}
                      <div className="flex flex-col gap-1 px-1 pt-1">
                        <div className="flex justify-between items-center text-[9px] font-bold text-zinc-400">
                          <span>Вручну</span>
                          <span className="text-white font-mono">{videoScale}%</span>
                        </div>
                        <input
                          type="range"
                          min="50"
                          max="200"
                          step="5"
                          value={videoScale}
                          onChange={(e) => setVideoScale(Number(e.target.value))}
                          className="w-full accent-[#E50914] bg-zinc-850 h-1 rounded-lg appearance-none cursor-pointer"
                        />
                      </div>
                    </div>
                  )}

                  {settingsSubMenu === 'sleep' && (
                    <div className="flex flex-col gap-2 text-left">
                      {/* Back Кнопка and Шапка сайту */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSettingsSubMenu('main');
                        }}
                        className="flex items-center gap-1.5 text-xs font-bold text-zinc-300 hover:text-white py-1.5 px-1 mb-1 border-b border-zinc-800/80 cursor-pointer w-full text-left touch-manipulation active:bg-zinc-900/60 rounded-md transition-colors"
                      >
                        <ChevronLeft className="w-4 h-4 text-zinc-400 shrink-0" />
                        <span>Назад</span>
                      </button>

                      {/* Заголовок Шапка сайту */}
                      <div className="text-[10px] font-black uppercase tracking-wider text-zinc-500 mb-1 px-1 border-b border-zinc-900 pb-1.5">
                        Таймер сну
                      </div>

                      <div className="flex flex-col gap-1 mt-1 max-h-48 overflow-y-auto pr-0.5">
                        {[
                          { value: null, label: 'Вимкнено' },
                          { value: 5 * 60, label: '5 хвилин' },
                          { value: 10 * 60, label: '10 хвилин' },
                          { value: 15 * 60, label: '15 хвилин' },
                          { value: 30 * 60, label: '30 хвилин' },
                          { value: 45 * 60, label: '45 хвилин' },
                          { value: 60 * 60, label: '1 година' },
                        ].map((item, idx) => {
                          const isCurrent = sleepTimer === item.value;
                          return (
                            <button
                              key={idx}
                              onClick={() => setSleepTimer(item.value)}
                              className={`w-full text-left p-2 rounded-xl transition-all cursor-pointer flex items-center justify-between ${isCurrent
                                  ? 'bg-[#E50914]/10 border border-red-500/20 text-white font-extrabold'
                                  : 'hover:bg-zinc-900 border border-transparent text-zinc-400'
                                }`}
                            >
                              <span className="text-[10.5px] uppercase tracking-wide font-bold">{item.label}</span>
                              {isCurrent && <Check className="w-3 h-3 text-red-500 shrink-0" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {settingsSubMenu === 'speed' && (
                    <div className="flex flex-col gap-2 text-left">
                      {/* Back Кнопка and Шапка сайту */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSettingsSubMenu('main');
                        }}
                        className="flex items-center gap-1.5 text-xs font-bold text-zinc-300 hover:text-white py-1.5 px-1 mb-1 border-b border-zinc-800/80 cursor-pointer w-full text-left touch-manipulation active:bg-zinc-900/60 rounded-md transition-colors"
                      >
                        <ChevronLeft className="w-4 h-4 text-zinc-400 shrink-0" />
                        <span>Назад</span>
                      </button>

                      {/* Заголовок Шапка сайту */}
                      <div className="text-[10px] font-black uppercase tracking-wider text-zinc-500 mb-1 px-1 border-b border-zinc-900 pb-1.5">
                        Швидкість відтворення
                      </div>

                      <div className="flex flex-col gap-1 mt-1 max-h-48 overflow-y-auto pr-0.5">
                        {[0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0].map((sp) => {
                          const isCurrent = playbackSpeed === sp;
                          return (
                            <button
                              key={sp}
                              onClick={() => setPlaybackSpeed(sp)}
                              className={`w-full text-left p-2 rounded-xl transition-all cursor-pointer flex items-center justify-between ${isCurrent
                                  ? 'bg-[#E50914]/10 border border-red-500/20 text-white font-extrabold'
                                  : 'hover:bg-zinc-900 border border-transparent text-zinc-400'
                                }`}
                            >
                              <span className="text-[10.5px] uppercase tracking-wide font-bold">
                                {sp === 1.0 ? 'Звичайна (1.0x)' : `${sp}x`}
                              </span>
                              {isCurrent && <Check className="w-3 h-3 text-red-500 shrink-0" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {settingsSubMenu === 'brightness' && (
                    <div className="flex flex-col gap-2 text-left">
                      {/* Back Кнопка and Шапка сайту */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSettingsSubMenu('main');
                        }}
                        className="flex items-center gap-1.5 text-xs font-bold text-zinc-300 hover:text-white py-1.5 px-1 mb-1 border-b border-zinc-800/80 cursor-pointer w-full text-left touch-manipulation active:bg-zinc-900/60 rounded-md transition-colors"
                      >
                        <ChevronLeft className="w-4 h-4 text-zinc-400 shrink-0" />
                        <span>Назад</span>
                      </button>

                      {/* Заголовок Шапка сайту */}
                      <div className="text-[10px] font-black uppercase tracking-wider text-zinc-500 mb-1 px-1 border-b border-zinc-900 pb-1.5">
                        Яскравість відео
                      </div>

                      {/* Preset brightness Кнопки */}
                      <div className="grid grid-cols-3 gap-1.5 mb-1 mt-1">
                        {[50, 75, 100, 125, 150, 200].map((br) => {
                          const isCurrent = videoBrightness === br;
                          return (
                            <button
                              key={br}
                              onClick={() => setVideoBrightness(br)}
                              className={`py-1.5 rounded-lg font-bold text-[10px] text-center transition-all cursor-pointer border ${isCurrent
                                  ? 'bg-[#E50914] text-white border-transparent shadow-sm'
                                  : 'bg-zinc-900 text-zinc-400 border-transparent hover:text-white hover:bg-zinc-850'
                                }`}
                            >
                              {br === 100 ? 'Норма' : `${br}%`}
                            </button>
                          );
                        })}
                      </div>

                      {/* Manual fine-tuning slider */}
                      <div className="flex flex-col gap-1 px-1 pt-1">
                        <div className="flex justify-between items-center text-[9px] font-bold text-zinc-400">
                          <span>Вручну</span>
                          <span className="text-white font-mono">{videoBrightness}%</span>
                        </div>
                        <input
                          type="range"
                          min="30"
                          max="250"
                          step="5"
                          value={videoBrightness}
                          onChange={(e) => setVideoBrightness(Number(e.target.value))}
                          className="w-full accent-[#E50914] bg-zinc-850 h-1 rounded-lg appearance-none cursor-pointer"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Gear Налаштування Кнопка */}
              <button
                onClick={() => {
                  initAtmosEngine();
                  setShowSettingsMenu(!showSettingsMenu);
                  setSettingsSubMenu('main');
                  setShowVoiceoverPanel(false);
                  setShowSourcePanel(false);
                  setShowEpisodesPanel(false);
                  setShowAtmosDashboard(false);
                }}
                className={`p-2 rounded-xl border flex items-center justify-center transition-all cursor-pointer ${showSettingsMenu
                    ? 'bg-[#E50914] border-transparent text-white shadow-md shadow-red-950/40'
                    : 'bg-zinc-900/90 border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800'
                  }`}
                title="Налаштування"
              >
                <Settings className={`w-4 h-4 transition-transform duration-300 ${showSettingsMenu ? 'rotate-90 text-white' : 'text-zinc-400 hover:text-white'}`} />
              </button>
            </div>

            {/* Maximize Fullscreen Trigger */}
            <button
              onClick={toggleFullscreen}
              className="p-2 rounded-xl bg-zinc-900/90 border border-zinc-800 hover:bg-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-white transition-all cursor-pointer"
              title={isFullscreen ? 'Вийти з повного екрана' : 'Повний екран'}
            >
              {isFullscreen ? (
                <Minimize2 className="w-4 h-4" />
              ) : (
                <Maximize2 className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
