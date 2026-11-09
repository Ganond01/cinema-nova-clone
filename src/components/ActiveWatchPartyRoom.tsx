import React, { useState, useEffect, useRef, Suspense, useMemo, useCallback } from 'react';
import {
  MoreVertical,
  Star,
  ChevronRight,
  ChevronLeft,
  Loader2
} from 'lucide-react';
import { Movie, UserProfile } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { translateGenre } from '../lib/translations';
import { handlePosterError, validatePosterUrl } from '../utils/imageFallback';
import { saveWatchPartyRoom, getWatchPartyRoom } from '../utils/watchPartyStorage';
import VideoPlayer from './VideoPlayer';

export interface ActiveWatchPartyRoomProps {
  movie: Movie;
  user?: UserProfile | null;
  roomConfig?: {
    id?: string;
    roomId?: string;
    roomName?: string;
    movieId?: string;
    movieTitle?: string;
    maxParticipants?: string;
    groupAccess?: string;
    chatEnabled?: boolean;
    everyoneControls?: boolean;
    everyoneCanControl?: boolean;
    autoplayEnabled?: boolean;
    hostName?: string;
    hostId?: string;
    createdAt?: string;
    isHost?: boolean;
    createdByMe?: boolean;
    fromJoin?: boolean;
    messages?: any[];
    participants?: any[];
    playback?: any;
  };
  allMovies: Movie[];
  isAdmin?: boolean;
  onTrackHistory?: (progressPercent: number, label?: string) => void;
  onMoviesChange?: (newMovies: Movie[]) => void;
  onUpdateMovie?: (updated: any) => void;
  onLeaveRoom: () => void;
  onSelectMovie?: (movie: Movie) => void;
  onPlayMovie?: (movie: Movie) => void;
}

interface ChatMessage {
  id: string;
  userName: string;
  userAvatar: string;
  timestamp: string;
  text: string;
  isHost?: boolean;
  isSystem?: boolean;
}

interface Participant {
  id: string;
  name: string;
  avatar: string;
  status: 'online' | 'idle' | 'offline';
  isHost?: boolean;
  role?: string;
}

const EMOJI_LIST = [
  '🍿', '🎬', '🥤', '🍫', '🔥', '❤️', '😂', '😱',
  '👏', '🥳', '🤩', '👍', '👎', '⚡', '🚀', '🎭',
  '📽️', '👾', '💯', '👻', '🤯', '😴', '💩', '🎉', '✨', '💔'
];

export const ActiveWatchPartyRoom: React.FC<ActiveWatchPartyRoomProps> = ({
  movie,
  user,
  roomConfig,
  allMovies,
  isAdmin,
  onTrackHistory,
  onMoviesChange,
  onUpdateMovie,
  onLeaveRoom,
  onSelectMovie,
  onPlayMovie
}) => {
  const { language } = useLanguage();

  // Динамічний унікальний ідентифікатор кімнати для спільного перегляду
  const generateUniquePartyId = (item: Movie) => {
    let typePrefix = 'NOVA-FILM';
    if (item.type === 'series') {
      typePrefix = 'NOVA-SERIES';
    } else if (item.type === 'anime' || item.genres?.includes('Аніме')) {
      typePrefix = 'NOVA-ANIME';
    } else if (item.type === 'dorama' || item.id?.toLowerCase().includes('dorama') || item.genres?.includes('Дорама')) {
      typePrefix = 'NOVA-DORAMA';
    }

    const cleanCode = (item.id || 'ROOM').replace(/[^a-zA-Z0-9]/g, '').slice(0, 5).toUpperCase();
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    return `${typePrefix}-${cleanCode || 'NOVA'}-${randomSuffix}`;
  };

  const isUserAdmin = isAdmin || user?.role === 'admin';
  const currentUserName = user?.name || (user as any)?.username || (language === 'UA' ? 'Користувач' : 'User');
  const currentUserAvatar = user?.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80';

  // Визначення ролі хоста (лише творець кімнати є хостом)
  const isHost = Boolean(
    !roomConfig?.fromJoin && (
      roomConfig?.createdByMe === true ||
      roomConfig?.isHost === true ||
      (roomConfig?.hostId && user?.id && String(roomConfig.hostId) === String(user.id)) ||
      (roomConfig?.hostName && user?.name && roomConfig.hostName.toLowerCase() === user.name.toLowerCase()) ||
      (!roomConfig?.fromJoin && !roomConfig?.hostName)
    )
  );

  const hostDisplayName = isHost
    ? currentUserName
    : (roomConfig?.hostName || (language === 'UA' ? 'Організатор' : 'Host'));

  const roomId = roomConfig?.roomId || roomConfig?.id || generateUniquePartyId(movie);
  const groupAccess = roomConfig?.groupAccess || (language === 'UA' ? 'Тільки друзі' : 'Friends only');
  const createdAt = roomConfig?.createdAt || ((language === 'UA' ? 'Сьогодні, ' : 'Today, ') + new Date().toLocaleTimeString(language === 'UA' ? 'uk-UA' : 'en-US', { hour: '2-digit', minute: '2-digit' }));

  // Стан налаштувань кімнати
  const [chatEnabled, setChatEnabled] = useState(roomConfig?.chatEnabled ?? true);
  const [everyoneControls, setEveryoneControls] = useState(roomConfig?.everyoneControls ?? false);
  const [autoplayEnabled, setAutoplayEnabled] = useState(roomConfig?.autoplayEnabled ?? true);

  // Активний Фільм selection & Плеєр fullscreen Стан
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const effectiveMovie = selectedMovie || movie;
  const [isPlayerFullscreen, setIsPlayerFullscreen] = useState(false);

  // Playback Синхронізація Стан
  const [syncPlayback, setSyncPlayback] = useState<{
    currentTime: number;
    isPlaying: boolean;
    quality?: string;
    isMuted?: boolean;
    volume?: number;
    updatedBy: string;
    updatedAt: number;
    type?: string;
    isHeartbeat?: boolean;
    clientId?: string;
  } | null>(null);

  // Унікальний ідентифікатор цієї вкладки клієнта для уникнення відлуння та конфліктів синхронізації
  const clientIdRef = useRef<string>(
    typeof window !== 'undefined'
      ? (() => {
        try {
          let id = sessionStorage.getItem('wp_tab_client_id');
          if (!id) {
            id = `tab_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
            sessionStorage.setItem('wp_tab_client_id', id);
          }
          return id;
        } catch {
          return `tab_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
        }
      })()
      : 'tab_default'
  );

  const lastSentPlaybackTimeRef = useRef<number>(0);

  // Стан чату та контекстного меню
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showParticipantMenu, setShowParticipantMenu] = useState<string | null>(null);
  const [showRoleSubmenu, setShowRoleSubmenu] = useState<string | null>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);

  // Активна вкладка правої бічної панелі (чат або список учасників)
  const [activeRightTab, setActiveRightTab] = useState<'chat' | 'participants'>('chat');

  // Очищення та валідація списку учасників кімнати
  const cleanParticipants = useCallback((list: any[]): Participant[] => {
    if (!Array.isArray(list)) return [];
    const hostTargetName = (hostDisplayName || '').trim().toLowerCase();
    const hostTargetId = String(roomConfig?.hostId || '');

    return list
      .filter((p: any) => {
        if (!p) return false;
        if (p.id === 'host-1' || String(p.id).startsWith('host-fake')) return false;
        // Purge dummy named 'Дмитро' if real host is present
        if ((p.name === 'Дмитро' || p.name === 'Host') && hostTargetName && hostTargetName !== 'дмитро' && hostTargetName !== 'host') {
          return false;
        }
        return true;
      })
      .map((p: any) => {
        const isThisHost = Boolean(
          (hostTargetId && String(p.id) === hostTargetId) ||
          (hostTargetName && p.name && p.name.trim().toLowerCase() === hostTargetName) ||
          (isHost && (p.id === user?.id || (user?.name && p.name === user.name)))
        );
        return {
          ...p,
          isHost: isThisHost,
          role: isThisHost
            ? (isUserAdmin ? 'Адмін (Організатор)' : (language === 'UA' ? 'Організатор' : 'Host'))
            : (p.role === 'Організатор' || p.role === 'Host' ? (language === 'UA' ? 'Учасник' : 'Participant') : (p.role || (language === 'UA' ? 'Учасник' : 'Participant')))
        };
      });
  }, [hostDisplayName, roomConfig?.hostId, isHost, user?.id, user?.name, isUserAdmin, language]);

  // Participants Початковий Стан
  const [participants, setParticipants] = useState<Participant[]>(() => {
    if (Array.isArray(roomConfig?.participants) && roomConfig.participants.length > 0) {
      const initialCleaned = cleanParticipants(roomConfig.participants);
      if (initialCleaned.length > 0) return initialCleaned;
    }
    const list: Participant[] = [];
    if (isHost) {
      list.push({
        id: user?.id || 'p-host',
        name: currentUserName,
        avatar: currentUserAvatar,
        status: 'online',
        isHost: true,
        role: isUserAdmin ? 'Адмін (Організатор)' : (language === 'UA' ? 'Організатор' : 'Host')
      });
    } else {
      list.push({
        id: roomConfig?.hostId || 'p-host',
        name: hostDisplayName,
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
        status: 'online',
        isHost: true,
        role: language === 'UA' ? 'Організатор' : 'Host'
      });
      list.push({
        id: user?.id || 'p-guest',
        name: currentUserName,
        avatar: currentUserAvatar,
        status: 'online',
        isHost: false,
        role: language === 'UA' ? 'Учасник' : 'Participant'
      });
    }
    return list;
  });

  // Find current Користувач in participants Список to check role
  const currentUserParticipant = participants.find(p =>
    (user?.id && String(p.id) === String(user.id)) ||
    (p.name && currentUserName && p.name.toLowerCase() === currentUserName.toLowerCase())
  );
  const isManager = Boolean(currentUserParticipant?.role === 'Модератор' || currentUserParticipant?.role === 'Адмін');

  // Права доступу
  const canControl = isHost || everyoneControls || isManager;
  const canClearChat = isHost || everyoneControls || isManager;
  const canChangeSettings = isHost || everyoneControls;

  // Messages Список
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    if (roomConfig?.messages && roomConfig.messages.length > 0) {
      return roomConfig.messages;
    }
    const nowTime = new Date().toLocaleTimeString(language === 'UA' ? 'uk-UA' : 'en-US', { hour: '2-digit', minute: '2-digit' });
    return [
      {
        id: `sys-${Date.now()}`,
        userName: 'Cinema Nova',
        userAvatar: '/icons/Shared Viewing.png',
        timestamp: nowTime,
        text: isHost
          ? (language === 'UA'
            ? `Кімнату для «${movie.title}» створено! Поділіться кодом ${roomId} з друзями для спільного перегляду.`
            : `Watch party for "${movie.title}" created! Share room code ${roomId} with your friends.`)
          : (language === 'UA'
            ? `Ви приєдналися до спільного перегляду «${movie.title}»!`
            : `You joined the watch party for "${movie.title}"!`),
        isSystem: true
      }
    ];
  });

  const [inputMessage, setInputMessage] = useState('');

  // Live real-time Синхронізація with Backend API for chat, Налаштування, participants & playback
  useEffect(() => {
    if (!roomId) return;

    const myParticipant: Participant = {
      id: user?.id || `user-${Date.now()}`,
      name: currentUserName,
      avatar: currentUserAvatar,
      status: 'online',
      isHost: isHost,
      role: isHost
        ? (isUserAdmin ? 'Адмін (Організатор)' : (language === 'UA' ? 'Організатор' : 'Host'))
        : (language === 'UA' ? 'Учасник' : 'Participant')
    };

    fetch(`/api/watchparty/rooms/${encodeURIComponent(roomId)}/participants`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ participant: myParticipant })
    }).catch(() => { });

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/watchparty/rooms/${encodeURIComponent(roomId)}`);
        if (res.ok) {
          const data = await res.json();
          if (data && data.room) {
            // 1. Стабільна синхронізація messages по унікальному ID (без зникнення щойно відправлених повідомлень)
            if (Array.isArray(data.room.messages) && data.room.messages.length > 0) {
              setMessages(prev => {
                const map = new Map<string, ChatMessage>();
                prev.forEach(m => map.set(m.id, m));
                data.room.messages.forEach((m: ChatMessage) => map.set(m.id, m));
                const merged = Array.from(map.values());
                if (merged.length === prev.length && merged.every((m, i) => m.id === prev[i].id)) {
                  return prev;
                }
                return merged;
              });
            }

            // 2. Синхронізація participants лише при реальних змінах (запобігає зайвим ре-рендерам чату та відео)
            if (Array.isArray(data.room.participants)) {
              const cleaned = cleanParticipants(data.room.participants);
              if (cleaned.length > 0) {
                setParticipants(prev => {
                  if (
                    prev.length === cleaned.length &&
                    prev.every((p, i) => p.id === cleaned[i].id && p.role === cleaned[i].role && p.status === cleaned[i].status && p.name === cleaned[i].name)
                  ) {
                    return prev;
                  }
                  return cleaned;
                });
              }

              // Якщо це гість, перевіряємо чи організатор не видалив його
              if (!isHost && data.room.participants.length > 0) {
                const myId = String(user?.id || '');
                const myName = (currentUserName || '').trim().toLowerCase();
                const stillInRoom = data.room.participants.some((p: any) =>
                  (myId && String(p.id) === myId) ||
                  (p.name && p.name.trim().toLowerCase() === myName)
                );
                if (!stillInRoom) {
                  alert(language === 'UA' ? 'Організатор видалив вас із цієї кімнати перегляду.' : 'The host has removed you from this watch party.');
                  if (onLeaveRoom) onLeaveRoom();
                  return;
                }
              }
            }

            // 3. Синхронізація room Налаштування
            if (typeof data.room.chatEnabled === 'boolean') {
              setChatEnabled(data.room.chatEnabled);
            }
            if (typeof data.room.everyoneControls === 'boolean') {
              setEveryoneControls(data.room.everyoneControls);
            }
            if (typeof data.room.autoplayEnabled === 'boolean') {
              setAutoplayEnabled(data.room.autoplayEnabled);
            }

            // 4. Синхронізація playback Стан: хост ніколи не відкочується назад, якщо керування не відкрите всім
            if (data.room.playback && typeof data.room.playback.updatedAt === 'number') {
              if (data.room.playback.clientId && data.room.playback.clientId === clientIdRef.current) {
                // Ігноруємо власні події цієї ж вкладки
              } else if (isHost && !data.room.everyoneControls && !everyoneControls) {
                // Хост є єдиним джерелом істини (Master) — локальний плеєр хоста не підпорядковується гостям
              } else {
                const myId = String(user?.id || '').trim().toLowerCase();
                const myName = String(currentUserName || '').trim().toLowerCase();
                const sender = String(data.room.playback.updatedBy || '').trim().toLowerCase();
                const isOwn = (myId && sender === myId) || (myName && sender === myName) || (isHost && (sender === 'host' || sender === 'admin' || sender === 'адмін'));
                if (!isOwn) {
                  setSyncPlayback(data.room.playback);
                }
              }
            }
          }
        }
      } catch (err) { }
    }, 1000);

    // Cross-tab local Синхронізація via Користувацький event & storage event
    const handleStorageUpdate = () => {
      const room = getWatchPartyRoom(roomId);
      if (room) {
        if (room.playback) {
          if (room.playback.clientId && room.playback.clientId === clientIdRef.current) {
            // Ігноруємо власні події цієї ж вкладки
          } else if (isHost && !room.everyoneControls && !everyoneControls) {
            // Хост є джерелом істини
          } else {
            const myId = String(user?.id || '').trim().toLowerCase();
            const myName = String(currentUserName || '').trim().toLowerCase();
            const sender = String(room.playback.updatedBy || '').trim().toLowerCase();
            const isOwn = (myId && sender === myId) || (myName && sender === myName) || (isHost && (sender === 'host' || sender === 'admin' || sender === 'адмін'));
            if (!isOwn) {
              setSyncPlayback(room.playback);
            }
          }
        }
        if (Array.isArray(room.messages) && room.messages.length > 0) {
          setMessages(prev => {
            const map = new Map<string, ChatMessage>();
            prev.forEach(m => map.set(m.id, m));
            room.messages.forEach((m: ChatMessage) => map.set(m.id, m));
            const merged = Array.from(map.values());
            if (merged.length === prev.length && merged.every((m, i) => m.id === prev[i].id)) {
              return prev;
            }
            return merged;
          });
        }
        if (Array.isArray(room.participants) && room.participants.length > 0) {
          const cleaned = cleanParticipants(room.participants);
          if (cleaned.length > 0) {
            setParticipants(prev => {
              if (
                prev.length === cleaned.length &&
                prev.every((p, i) => p.id === cleaned[i].id && p.role === cleaned[i].role && p.status === cleaned[i].status && p.name === cleaned[i].name)
              ) {
                return prev;
              }
              return cleaned;
            });
          }

          if (!isHost) {
            const myId = String(user?.id || '');
            const myName = (currentUserName || '').trim().toLowerCase();
            const stillInRoom = room.participants.some((p: any) =>
              (myId && String(p.id) === myId) ||
              (p.name && p.name.trim().toLowerCase() === myName)
            );
            if (!stillInRoom) {
              alert(language === 'UA' ? 'Організатор видалив вас із цієї кімнати перегляду.' : 'The host has removed you from this watch party.');
              if (onLeaveRoom) onLeaveRoom();
              return;
            }
          }
        }
        if (typeof room.chatEnabled === 'boolean') setChatEnabled(room.chatEnabled);
        if (typeof room.everyoneControls === 'boolean') setEveryoneControls(room.everyoneControls);
        if (typeof room.autoplayEnabled === 'boolean') setAutoplayEnabled(room.autoplayEnabled);
      }
    };
    window.addEventListener('watchparty_rooms_updated', handleStorageUpdate);
    window.addEventListener('storage', handleStorageUpdate);

    return () => {
      clearInterval(interval);
      window.removeEventListener('watchparty_rooms_updated', handleStorageUpdate);
      window.removeEventListener('storage', handleStorageUpdate);
    };
  }, [roomId, currentUserName, currentUserAvatar, isHost, user?.id, isUserAdmin, cleanParticipants, language, everyoneControls]);

  // Періодичний heartbeat відтворення від Хоста (кожні 3 секунди під час відтворення)
  // Забезпечує безшовну синхронізацію нових та існуючих гостей без постійних стрибків і зависань
  useEffect(() => {
    if (!isHost || !canControl || !roomId) return;

    const heartbeatInterval = setInterval(() => {
      if (Date.now() - lastSentPlaybackTimeRef.current < 2500) return;

      const v = document.querySelector('video') as HTMLVideoElement | null;
      if (!v) return;

      const curTime = v.currentTime || 0;
      const isPlayingNow = !v.paused && !v.ended && v.readyState >= 2;

      const payload = {
        currentTime: curTime,
        isPlaying: isPlayingNow,
        updatedBy: user?.id || currentUserName,
        updatedAt: Date.now(),
        isHeartbeat: true,
        type: 'heartbeat',
        clientId: clientIdRef.current
      };

      const curRoom = getWatchPartyRoom(roomId) || {};
      saveWatchPartyRoom({ ...curRoom, roomId, id: roomId, playback: payload });

      fetch(`/api/watchparty/rooms/${encodeURIComponent(roomId)}/playback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).catch(() => { });
    }, 3000);

    return () => clearInterval(heartbeatInterval);
  }, [isHost, canControl, roomId, user?.id, currentUserName]);

  // Broadcast Відео playback events
  const handlePlaybackChange = (action: {
    type: 'play' | 'pause' | 'seek' | 'quality' | 'mute' | 'volume';
    currentTime: number;
    isPlaying: boolean;
    quality?: string;
    isMuted?: boolean;
    volume?: number;
  }) => {
    if (!canControl || !roomId) return;
    lastSentPlaybackTimeRef.current = Date.now();

    const playbackPayload = {
      currentTime: action.currentTime,
      isPlaying: action.isPlaying,
      isMuted: action.isMuted,
      volume: action.volume,
      quality: action.quality,
      type: action.type,
      clientId: clientIdRef.current,
      updatedBy: user?.id || currentUserName,
      updatedAt: Date.now()
    };

    const curRoom = getWatchPartyRoom(roomId) || {};
    saveWatchPartyRoom({ ...curRoom, roomId, id: roomId, playback: playbackPayload });

    fetch(`/api/watchparty/rooms/${encodeURIComponent(roomId)}/playback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(playbackPayload)
    }).catch(() => { });
  };

  // Згадування учасника в чаті
  const handleMentionUser = (targetName: string) => {
    setInputMessage(prev => {
      const tag = `@${targetName} `;
      if (!prev) return tag;
      if (prev.endsWith(' ')) return `${prev}${tag}`;
      return `${prev} ${tag}`;
    });
    setActiveRightTab('chat');
    setShowParticipantMenu(null);
    setShowRoleSubmenu(null);
    setTimeout(() => {
      chatInputRef.current?.focus();
    }, 50);
  };

  // Зміна ролі учасника
  const handleSetParticipantRole = async (participantId: string, role: string) => {
    const target = participants.find(item => item.id === participantId);
    const targetName = target?.name || (language === 'UA' ? 'Учасник' : 'Participant');

    setParticipants(prev => prev.map(item => item.id === participantId ? { ...item, role } : item));
    setShowParticipantMenu(null);
    setShowRoleSubmenu(null);

    const roleMsg: ChatMessage = {
      id: `sys-role-${Date.now()}`,
      userName: 'Cinema Nova',
      userAvatar: '/icons/Shared Viewing.png',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: language === 'UA'
        ? `🛡️ ${isHost ? 'Організатор' : currentUserName} призначив роль "${role}" учаснику ${targetName}.`
        : `🛡️ ${isHost ? 'Host' : currentUserName} granted role "${role}" to ${targetName}.`,
      isSystem: true
    };
    setMessages(prev => [...prev, roleMsg]);

    if (!roomId) return;
    const curRoom = getWatchPartyRoom(roomId) || {};
    const updatedParticipants = (curRoom.participants || []).map((item: any) =>
      (item.id === participantId || item.name === participantId) ? { ...item, role } : item
    );
    const updatedMessages = [...(curRoom.messages || []), roleMsg];
    saveWatchPartyRoom({ ...curRoom, roomId, id: roomId, participants: updatedParticipants, messages: updatedMessages });

    try {
      await fetch(`/api/watchparty/rooms/${encodeURIComponent(roomId)}/participants/role`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participantId, role })
      });
      await fetch(`/api/watchparty/rooms/${encodeURIComponent(roomId)}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: roleMsg })
      });
    } catch (e) { }
  };

  // Видалення учасника з кімнати (тільки для хоста)
  const handleRemoveParticipant = async (participantId: string) => {
    if (!isHost) return;
    const target = participants.find(item => item.id === participantId);
    const targetName = target?.name || (language === 'UA' ? 'Учасник' : 'Participant');

    setParticipants(prev => prev.filter(item => item.id !== participantId));
    setShowParticipantMenu(null);
    setShowRoleSubmenu(null);

    const kickMsg: ChatMessage = {
      id: `sys-kick-${Date.now()}`,
      userName: 'Cinema Nova',
      userAvatar: '/icons/Shared Viewing.png',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: language === 'UA'
        ? `🚫 ${targetName} був видалений з паті організатором.`
        : `🚫 ${targetName} was removed from the party by the host.`,
      isSystem: true
    };
    setMessages(prev => [...prev, kickMsg]);

    if (!roomId) return;
    const curRoom = getWatchPartyRoom(roomId) || {};
    const updatedParticipants = (curRoom.participants || []).filter((item: any) => item.id !== participantId && item.name !== participantId);
    const updatedMessages = [...(curRoom.messages || []), kickMsg];
    saveWatchPartyRoom({ ...curRoom, roomId, id: roomId, participants: updatedParticipants, messages: updatedMessages });

    try {
      await fetch(`/api/watchparty/rooms/${encodeURIComponent(roomId)}/participants/${encodeURIComponent(participantId)}`, {
        method: 'DELETE'
      });
      await fetch(`/api/watchparty/rooms/${encodeURIComponent(roomId)}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: kickMsg })
      });
    } catch (e) { }
  };

  const syncSettingsToBackend = (patch: { chatEnabled?: boolean; everyoneControls?: boolean; autoplayEnabled?: boolean }) => {
    if (!roomId) return;
    const curRoom = getWatchPartyRoom(roomId) || {};
    saveWatchPartyRoom({ ...curRoom, roomId, id: roomId, ...patch });
    fetch(`/api/watchparty/rooms/${encodeURIComponent(roomId)}/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch)
    }).catch(() => { });
  };

  const handleToggleChat = () => {
    if (!canChangeSettings) return;
    const next = !chatEnabled;
    setChatEnabled(next);
    syncSettingsToBackend({ chatEnabled: next });
  };

  const handleToggleEveryoneControls = () => {
    if (!isHost) return;
    const next = !everyoneControls;
    setEveryoneControls(next);
    syncSettingsToBackend({ everyoneControls: next });
  };

  const handleToggleAutoplay = () => {
    if (!canChangeSettings) return;
    const next = !autoplayEnabled;
    setAutoplayEnabled(next);
    syncSettingsToBackend({ autoplayEnabled: next });
  };

  // Закриття menus on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node)) {
        setShowEmojiPicker(false);
      }
      if (showParticipantMenu && !(e.target as HTMLElement).closest('.participant-menu-btn') && !(e.target as HTMLElement).closest('.participant-menu-dropdown')) {
        setShowParticipantMenu(null);
        setShowRoleSubmenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showParticipantMenu]);

  // Scroll to bottom when messages Оновлення (strictly contained within chat Контейнер, without scrolling window or main)
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages.length, activeRightTab]);

  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputMessage.trim() || !chatEnabled) return;

    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      userName: currentUserName,
      userAvatar: currentUserAvatar,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: inputMessage.trim(),
      isHost: isHost
    };

    setMessages((prev) => [...prev, newMsg]);
    setInputMessage('');
    setShowEmojiPicker(false);

    if (roomId) {
      const curRoom = getWatchPartyRoom(roomId) || {};
      const updatedMessages = [...(curRoom.messages || []), newMsg];
      saveWatchPartyRoom({ ...curRoom, roomId, id: roomId, messages: updatedMessages });

      fetch(`/api/watchparty/rooms/${encodeURIComponent(roomId)}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: newMsg })
      }).catch(() => { });
    }
  };

  const handleClearChat = () => {
    if (!canClearChat) return;
    const clearMsg: ChatMessage = {
      id: `sys-${Date.now()}`,
      userName: 'Cinema Nova',
      userAvatar: '/icons/Shared Viewing.png',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: language === 'UA'
        ? `🧹 ${isHost ? 'Організатор' : currentUserName} очистив чат.`
        : `🧹 ${isHost ? 'Host' : currentUserName} cleared the chat.`,
      isSystem: true
    };
    setMessages([clearMsg]);

    if (roomId) {
      const curRoom = getWatchPartyRoom(roomId) || {};
      saveWatchPartyRoom({ ...curRoom, roomId, id: roomId, messages: [clearMsg] });

      fetch(`/api/watchparty/rooms/${encodeURIComponent(roomId)}/clear-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clearedBy: isHost ? (language === 'UA' ? 'Організатор' : 'Host') : currentUserName })
      }).catch(() => { });
    }
  };

  const handleAddEmoji = (emoji: string) => {
    setInputMessage((prev) => prev + emoji);
  };

  // Watch Next Фільми from the Каталог (pool for carousel)
  const nextMovies = useMemo(() => {
    const pool = allMovies.filter(m => m.id !== movie.id);
    const preferredIds = [
      'dune-part-two-2024',
      'gladiator-2-2024',
      'alien-romulus-2024',
      'arcane-s2-2024',
      'the-penguin-2024',
      'oppenheimer-2023',
      'deadpool-wolverine-2024',
      'the-batman-2022',
      'stranger-things-s5-2025',
      'blade-runner-2049'
    ];
    const preferred = preferredIds.map(id => pool.find(m => m.id === id)).filter(Boolean) as Movie[];
    const combined = [...preferred, ...pool];
    const unique = Array.from(new Map(combined.map(m => [m.id, m])).values());
    return unique.slice(0, 15);
  }, [allMovies, movie.id]);

  // Carousel Навігація Стан and logic (1:1 with HomeView)
  const carouselRowRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = useCallback(() => {
    if (carouselRowRef.current) {
      const { scrollLeft, clientWidth, scrollWidth } = carouselRowRef.current;
      setCanScrollLeft(scrollLeft > 6);
      setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 10);
    }
  }, []);

  useEffect(() => {
    const el = carouselRowRef.current;
    if (!el) return;

    checkScroll();

    el.addEventListener('scroll', checkScroll, { passive: true });
    window.addEventListener('resize', checkScroll);

    const t1 = setTimeout(checkScroll, 100);
    const t2 = setTimeout(checkScroll, 350);

    return () => {
      el.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [checkScroll, nextMovies]);

  const scrollCarousel = (direction: 'left' | 'right') => {
    if (carouselRowRef.current) {
      const { scrollLeft, clientWidth } = carouselRowRef.current;
      const scrollAmount = Math.max(260, clientWidth * 0.8);
      carouselRowRef.current.scrollTo({
        left: direction === 'left' ? scrollLeft - scrollAmount : scrollLeft + scrollAmount,
        behavior: 'smooth',
      });
      setTimeout(checkScroll, 80);
      setTimeout(checkScroll, 250);
      setTimeout(checkScroll, 500);
    }
  };

  const displayTitle = language === 'ENG' && movie.titleEn ? movie.titleEn : (movie.title || (language === 'UA' ? 'Дюна: Частина друга' : 'Dune: Part Two'));
  const genresList = movie.genres && movie.genres.length > 0 ? movie.genres : ['Трилер', 'Екшн'];



  return (
    <div className="text-white pt-1 pb-16 px-1 sm:px-3 lg:px-4 max-w-[1580px] mx-auto font-sans antialiased animate-fade-in">

      {/* Top Banner Шапка сайту: Watch Party Заголовок (Left) and End Party Кнопка (Right above Плеєр) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-end mb-4">
        <div className="lg:col-span-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-display font-extrabold text-white tracking-tight">
              Watch Party
            </h1>
            <p className="text-xs sm:text-sm text-[#8E8E93] font-sans mt-0.5">
              {language === 'UA' ? 'Дивіться разом культові історії!' : 'Watch cult stories together!'}
            </p>
          </div>

          {/* End Party Кнопка (Figma: 160px x 39px, rounded-10px) */}
          <button
            onClick={onLeaveRoom}
            className="journey-cta-btn border-2 border-transparent hover:border-white/80 active:border-transparent text-white w-[150px] sm:w-[160px] h-[39px] rounded-[10px] font-bold text-xs sm:text-sm flex items-center justify-center transition-all transform hover:scale-102 active:scale-98 hover:shadow-[0_0_24px_rgba(255,255,255,0.3),0_10px_25px_rgba(215,40,53,0.35)] shadow-lg shadow-[#FF4D5C]/25 cursor-pointer select-none"
          >
            {language === 'UA' ? 'Завершити паті' : 'End Party'}
          </button>
        </div>

        {/* Right Колонка Шапка сайту for chat */}
        <div className="lg:col-span-4 hidden lg:flex items-center gap-4 pl-2">
          <button
            onClick={() => setActiveRightTab('chat')}
            className={`font-display font-extrabold text-base transition-colors cursor-pointer ${activeRightTab === 'chat' ? 'text-[#FF4D5C]' : 'text-zinc-500 hover:text-zinc-300'
              }`}
          >
            {language === 'UA' ? 'Чат' : 'Chat'}
          </button>
          <button
            onClick={() => setActiveRightTab('participants')}
            className={`font-display text-xs transition-colors cursor-pointer ${activeRightTab === 'participants' ? 'text-white font-bold' : 'text-zinc-400 hover:text-white'
              }`}
          >
            {language === 'UA' ? `Учасників (${participants.length})` : `Participants (${participants.length})`}
          </button>
        </div>
      </div>

      {/* Main 2-Колонка Сітка */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        {/* ================= LEFT Колонка (8 cols) ================= */}
        <div className="lg:col-span-8 space-y-6">

          {/* 1. ORIGINAL Real Відео Плеєр embedded */}
          <div className="relative w-full aspect-video bg-black rounded-[20px] overflow-hidden shadow-2xl">
            <Suspense fallback={
              <div className="w-full h-full flex items-center justify-center bg-black">
                <Loader2 className="w-8 h-8 text-[#FF4D5C] animate-spin" />
              </div>
            }>
              <VideoPlayer
                movie={effectiveMovie}
                onBack={onLeaveRoom}
                isWatchParty={true}
                isHost={isHost}
                canControl={canControl}
                syncPlayback={syncPlayback}
                onPlaybackChange={handlePlaybackChange}
                autoplayEnabled={autoplayEnabled}
                isAdmin={isUserAdmin}
                onFullscreenChange={setIsPlayerFullscreen}
              />
            </Suspense>
          </div>

          {/* 2. Фільм Details Section (Poster + Заголовок + Metadata + Опис) */}
          <div className="flex flex-col sm:flex-row gap-6 items-start">
            {/* Постер */}
            <div className="w-36 sm:w-44 aspect-[2/3] rounded-[16px] overflow-hidden shrink-0 shadow-xl bg-zinc-900">
              <img
                src={effectiveMovie.posterUrl}
                alt={displayTitle}
                className="w-full h-full object-cover"
                onError={(e) => handlePosterError(e, effectiveMovie.posterUrl, effectiveMovie.title, effectiveMovie.type, effectiveMovie.genres, effectiveMovie.year, effectiveMovie.titleEn, effectiveMovie.originalTitle)}
              />
            </div>

            {/* Metadata & Опис */}
            <div className="space-y-2.5 flex-1">
              <h2 className="text-2xl sm:text-3xl font-display font-extrabold text-white tracking-tight">
                {displayTitle}
              </h2>

              <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm font-medium text-zinc-200">
                {genresList.map((g) => (
                  <React.Fragment key={g}>
                    <span>{g}</span>
                    <span className="text-[#FF4D5C] font-bold">•</span>
                  </React.Fragment>
                ))}
                <span>{movie.year || '2026'}</span>
                <span className="text-[#FF4D5C] font-bold">•</span>
                <span className="flex items-center gap-1 text-[#FF4D5C] font-bold">
                  <Star className="w-3.5 h-3.5 fill-[#FF4D5C]" />
                  <span>{movie.rating ? movie.rating.toFixed(1) : '8.6'}</span>
                </span>
              </div>

              <p className="text-xs sm:text-sm text-[#A3A3A3] leading-relaxed font-sans font-normal pt-1 text-justify sm:text-left">
                {language === 'ENG' && movie.descriptionEn ? movie.descriptionEn : (movie.description || 'Загадавши своє найзаповітніше бажання, молодий чоловік, сам того не усвідомлюючи, відкрив справжню скриньку Пандори. Мріючи нарешті завоювати прихильність та серце своєї коханої, він був готовий піти на великий ризик, навіть не задумуючись про майбутні наслідки своїх ризикованих дій. Невдовзі безнадійний романтик стикається віч-на-віч з жахливими результатами власних потаємних бажань.')}
              </p>
            </div>
          </div>

          {/* 3. "Дивитись наступним" (HomeView Carousel logic & card styles) */}
          <div className="space-y-4 pt-2 relative">
            <h3
              style={{ fontFamily: "'Montserrat Alternates', sans-serif" }}
              className="text-lg md:text-xl font-semibold text-white tracking-tight"
            >
              {language === 'UA' ? 'Дивитись наступним' : 'Watch Next'}
            </h3>

            {/* Картки Carousel Контейнер */}
            <div className="relative">
              {/* Scroll Left Кнопка (1:1 with HomeView) */}
              {canScrollLeft && (
                <button
                  type="button"
                  onClick={() => scrollCarousel('left')}
                  className="hidden md:flex absolute -left-3 sm:-left-5 lg:-left-6 top-1/2 -translate-y-1/2 z-40 w-11 h-11 sm:w-14 sm:h-14 md:w-[68px] md:h-[68px] rounded-full text-white items-center justify-center transition-transform duration-150 hover:scale-105 active:scale-95 shadow-[0_8px_30px_rgba(0,0,0,0.7)] cursor-pointer border-0 border-none outline-none ring-0 select-none"
                  style={{
                    backgroundColor: 'rgba(0, 0, 0, 0.65)',
                    backdropFilter: 'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)',
                  }}
                  aria-label="Scroll left"
                >
                  <ChevronLeft className="w-7 h-7 sm:w-9 sm:h-9 md:w-[42px] md:h-[42px] stroke-[2] -translate-x-0.5" />
                </button>
              )}

              {/* Scroll Right Кнопка (1:1 with HomeView) */}
              {canScrollRight && (
                <button
                  type="button"
                  onClick={() => scrollCarousel('right')}
                  className="hidden md:flex absolute -right-3 sm:-right-5 lg:-right-6 top-1/2 -translate-y-1/2 z-40 w-11 h-11 sm:w-14 sm:h-14 md:w-[68px] md:h-[68px] rounded-full text-white items-center justify-center transition-transform duration-150 hover:scale-105 active:scale-95 shadow-[0_8px_30px_rgba(0,0,0,0.7)] cursor-pointer border-0 border-none outline-none ring-0 select-none"
                  style={{
                    backgroundColor: 'rgba(0, 0, 0, 0.65)',
                    backdropFilter: 'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)',
                  }}
                  aria-label="Scroll right"
                >
                  <ChevronRight className="w-7 h-7 sm:w-9 sm:h-9 md:w-[42px] md:h-[42px] stroke-[2] translate-x-0.5" />
                </button>
              )}

              {/* Рядок Scroll View (1:1 with HomeView styles and gaps) */}
              <div
                ref={carouselRowRef}
                className="flex gap-4 md:gap-[24px] xl:gap-[30px] overflow-x-auto pb-4 pt-1 scrollbar-none scroll-smooth snap-x snap-mandatory"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              >
                {nextMovies.map((item) => {
                  const itemTitle = language === 'ENG' && item.titleEn ? item.titleEn : item.title;
                  return (
                    <div
                      key={item.id}
                      onClick={() => {
                        const fullMovie = allMovies.find(m => m.id === item.id) || item;
                        setSelectedMovie(fullMovie);
                        if (onSelectMovie) onSelectMovie(fullMovie);
                      }}
                      className="w-[104px] h-[158px] min-w-[104px] sm:w-[calc((100%-32px)/3)] sm:h-auto sm:min-w-0 md:w-[calc((100%-48px)/3)] lg:w-[calc((100%-48px)/3)] xl:w-[calc((100%-72px)/4)] shrink-0 snap-start bg-[#121212] border-0 sm:border sm:border-white/10 rounded-[16px] shadow-xl sm:hover:shadow-[0_0_28px_rgba(255,48,64,0.35)] sm:hover:border-transparent poster-hover-notif-border transition-all duration-300 ease-out cursor-pointer group/card group relative aspect-[104/158] sm:aspect-[2/3] select-none"
                    >
                      <div className="relative w-full h-full overflow-hidden bg-[#121212] rounded-[15px]">
                        {/* 1. Основне чітке зображення постера */}
                        <img
                          src={validatePosterUrl(item.posterUrl, item.title, item.type, item.genres)}
                          alt={itemTitle}
                          className="w-full h-full object-cover transition-transform duration-500 ease-out sm:group-hover:scale-[1.03]"
                          loading="lazy"
                          referrerPolicy="no-referrer"
                          onError={(e) => handlePosterError(e, item.posterUrl, item.title, item.type, item.genres)}
                        />

                        {/* Side Vignette Накладення (оверлей) on the Картка */}
                        <div className="absolute inset-0 pointer-events-none z-10 bg-gradient-to-r from-black/40 via-transparent to-black/40 shadow-[inset_0_0_24px_rgba(0,0,0,0.6)]" />

                        {/* Floating Бейджі on Mobile: w32.58px h14.13px, gap 26px */}
                        <div className="absolute top-1.5 inset-x-0 px-[6.42px] flex items-center justify-between z-30 pointer-events-none sm:hidden">
                          <div className="w-[32.58px] h-[14.13px] text-white rounded-[4px] flex items-center justify-center gap-0.5 bg-black/35 backdrop-blur-md border border-white/15 shadow-sm">
                            <Star className="w-[8px] h-[8px] fill-[#FF3040] text-[#FF3040] shrink-0" />
                            <span className="text-white font-bold text-[7px] tracking-tight leading-none">
                              {item.rating ? item.rating.toFixed(1) : '8.5'}
                            </span>
                          </div>
                          <div className="w-[32.58px] h-[14.13px] text-white rounded-[4px] flex items-center justify-center bg-black/35 backdrop-blur-md border border-white/15 shadow-sm">
                            <span className="text-white font-bold text-[7px] tracking-tight leading-none">
                              {item.ageRating || '16+'}
                            </span>
                          </div>
                        </div>

                        {/* Desktop Floating Рейтинг & Age Бейджі */}
                        <div className="hidden sm:flex absolute top-3 left-3 text-white px-3.5 py-1.5 rounded-[10px] text-xs font-semibold items-center gap-1.5 z-30 transition-all pointer-events-none bg-black/35 backdrop-blur-md border border-white/15 shadow-sm group-hover:bg-white/10 group-hover:border-white/25 duration-300">
                          <Star className="w-3.5 h-3.5 fill-[#FF3040] text-[#FF3040] shrink-0" />
                          <span className="text-white font-bold text-xs tracking-tight">
                            {item.rating ? item.rating.toFixed(1) : '8.5'}
                          </span>
                        </div>

                        <div className="hidden sm:flex absolute top-3 right-3 text-white px-3.5 py-1.5 rounded-[10px] text-xs font-semibold z-30 transition-all pointer-events-none items-center justify-center bg-black/35 backdrop-blur-md border border-white/15 shadow-sm group-hover:bg-white/10 group-hover:border-white/25 duration-300">
                          <span className="text-white font-bold text-xs tracking-tight">
                            {item.ageRating || '16+'}
                          </span>
                        </div>

                        {/* Specular Glass Sheen Накладення (оверлей) */}
                        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-white/15 pointer-events-none mix-blend-overlay z-15" />

                        {/* Нижня скляна панель з ефектом розмиття фону */}
                        <div className="absolute inset-x-0 bottom-0 z-20 flex flex-col justify-end sm:justify-start p-1.5 sm:px-4 sm:pt-[22px] sm:pb-4 w-[104px] h-[52px] sm:w-auto sm:h-auto bg-gradient-to-t from-black/95 via-black/80 to-transparent backdrop-blur-[10px] pointer-events-none transition-all duration-300 ease-out">
                          <h4 className="font-sans font-bold text-white text-[8px] sm:text-[17px] leading-tight line-clamp-1 sm:line-clamp-2 break-words w-full sm:w-[239px] sm:max-w-full sm:h-[42px] text-left drop-shadow-md">
                            {itemTitle}
                          </h4>

                          <div className="flex items-center text-[6px] sm:text-[11.5px] text-zinc-300 font-normal w-full whitespace-nowrap overflow-hidden font-sans text-left mt-0.5 sm:mt-[22px] drop-shadow-sm gap-1 sm:gap-1.5">
                            {item.genres?.slice(0, 2).map((genre, idx) => (
                              <React.Fragment key={genre}>
                                {idx > 0 && <span className="w-0.5 h-0.5 sm:w-1 sm:h-1 rounded-full bg-[#FF3040] inline-block shrink-0" />}
                                <span className="text-zinc-300 truncate">{translateGenre(genre, language)}</span>
                              </React.Fragment>
                            ))}
                            <span className="w-0.5 h-0.5 sm:w-1 sm:h-1 rounded-full bg-[#FF3040] inline-block shrink-0" />
                            <span className="text-zinc-400 shrink-0">{item.year}</span>
                          </div>

                          {/* Short Опис expansion on hover */}
                          <div className="grid grid-rows-[0fr] group-hover:grid-rows-[1fr] transition-all duration-300 ease-out">
                            <div className="overflow-hidden">
                              <p className="text-xs sm:text-[12.5px] text-zinc-200/90 font-sans leading-relaxed line-clamp-4 mt-2.5 pt-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-75">
                                {language === 'ENG' && item.descriptionEn
                                  ? item.descriptionEn
                                  : (item.description || (language === 'UA' ? 'Захоплююча кіноісторія, сповнена несподіваних поворотів долі та незабутніх емоцій.' : 'A captivating story.'))}
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
          </div>

          {/* 4. Bottom 3 Columns: Інформація / Учасники / Налаштування (No Borders) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-4">

            {/* Column 1: Інформація */}
            <div className="space-y-4">
              <h3 className="text-lg font-display font-bold text-white tracking-tight">
                {language === 'UA' ? 'Інформація' : 'Information'}
              </h3>
              <div className="space-y-3 text-xs sm:text-sm">
                <div className="flex justify-between items-center text-zinc-400">
                  <span>{language === 'UA' ? 'Паті ID' : 'Party ID'}</span>
                  <span className="text-white font-mono font-medium">{roomId}</span>
                </div>
                <div className="flex justify-between items-center text-zinc-400">
                  <span>{language === 'UA' ? 'Головний' : 'Host'}</span>
                  <span className="text-white font-medium flex items-center gap-1.5">
                    <span>{hostDisplayName}</span>
                    {isUserAdmin && (
                      <span className="text-[10px] text-[#FF4D5C] font-bold bg-[#FF4D5C]/15 px-1.5 py-0.5 rounded">
                        Admin
                      </span>
                    )}
                  </span>
                </div>
                <div className="flex justify-between items-center text-zinc-400">
                  <span>{language === 'UA' ? 'Приватність' : 'Privacy'}</span>
                  <span className="text-white font-medium">{groupAccess}</span>
                </div>
                <div className="flex justify-between items-center text-zinc-400">
                  <span>{language === 'UA' ? 'Створено' : 'Created'}</span>
                  <span className="text-white font-medium">{createdAt}</span>
                </div>
              </div>
            </div>

            {/* Column 2: Учасники */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-display font-bold text-white tracking-tight">
                  {language === 'UA' ? 'Учасники' : 'Participants'}
                </h3>
              </div>

              {/* 2-Колонка Сітка layout matching room styling */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                {participants.map((p) => (
                  <div key={p.id} className="flex items-center justify-between group">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="relative w-7 h-7 rounded-full overflow-hidden shrink-0 border border-white/20">
                        <img src={p.avatar} alt={p.name} className="w-full h-full object-cover" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[11px] sm:text-xs font-medium text-white truncate group-hover:text-[#FF4D5C] transition-colors flex items-center gap-1">
                          <span>{p.name}</span>
                          {p.isHost && (
                            <span className="text-[9px] text-[#FF4D5C] font-bold shrink-0">
                              (Хост)
                            </span>
                          )}
                        </div>
                        <div className="text-[9px] text-emerald-400 flex items-center gap-1 font-mono">
                          <span>Online</span>
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        </div>
                      </div>
                    </div>

                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowParticipantMenu(showParticipantMenu === p.id ? null : p.id)}
                        className="participant-menu-btn text-zinc-500 hover:text-white hover:bg-white/10 transition-all cursor-pointer p-1 rounded-lg"
                        title={language === 'UA' ? 'Дії з учасником' : 'Participant actions'}
                      >
                        <MoreVertical className="w-3.5 h-3.5" />
                      </button>

                      {/* Контекстне меню дій над учасником із чорним фоном #000000 */}
                      {showParticipantMenu === p.id && (
                        <div
                          className="participant-menu-dropdown absolute right-0 top-7 w-48 border border-white/15 rounded-2xl shadow-2xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-150"
                          style={{ backgroundColor: '#000000' }}
                        >
                          {/* Згадати в чаті - доступно всім без емодзі */}
                          <button
                            type="button"
                            onClick={() => handleMentionUser(p.name)}
                            className="w-full text-left px-3 py-2 text-xs font-medium text-zinc-200 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer flex items-center"
                          >
                            <span>{language === 'UA' ? 'Згадати в чаті' : 'Mention in chat'}</span>
                          </button>

                          {/* Дії управління учасником (дати роль, видалити) доступні ТІЛЬКИ організатору (хосту) кімнати */}
                          {isHost && !p.isHost && (
                            <>
                              <div className="my-1 border-t border-white/10" />

                              {/* Вибір ролі для учасника */}
                              {showRoleSubmenu === p.id ? (
                                <div className="space-y-1 py-1">
                                  <div className="px-3 py-1 text-[10px] text-zinc-400 font-semibold uppercase tracking-wider flex items-center justify-between">
                                    <span>{language === 'UA' ? 'Оберіть роль:' : 'Select role:'}</span>
                                    <button
                                      type="button"
                                      onClick={() => setShowRoleSubmenu(null)}
                                      className="text-zinc-500 hover:text-white text-xs cursor-pointer p-0.5"
                                    >
                                      ✕
                                    </button>
                                  </div>
                                  {[
                                    { label: language === 'UA' ? 'Модератор' : 'Moderator' },
                                    { label: language === 'UA' ? 'VIP Глядач' : 'VIP Viewer' },
                                    { label: language === 'UA' ? 'Учасник' : 'Participant' }
                                  ].map((r) => (
                                    <button
                                      key={r.label}
                                      type="button"
                                      onClick={() => handleSetParticipantRole(p.id, r.label)}
                                      className="w-full text-left px-3 py-1.5 text-xs font-medium text-zinc-200 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer flex items-center"
                                    >
                                      <span>{r.label}</span>
                                    </button>
                                  ))}
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setShowRoleSubmenu(p.id)}
                                  className="w-full text-left px-3 py-2 text-xs font-medium text-zinc-200 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer flex items-center"
                                >
                                  <span>{language === 'UA' ? 'Дати роль' : 'Grant role'}</span>
                                </button>
                              )}

                              <div className="my-1 border-t border-white/10" />
                              <button
                                type="button"
                                onClick={() => handleRemoveParticipant(p.id)}
                                className="w-full text-left px-3 py-2 text-xs font-medium text-[#FF4D5C] hover:bg-[#FF4D5C]/10 rounded-xl transition-colors cursor-pointer flex items-center"
                              >
                                <span>{language === 'UA' ? 'Видалити з паті' : 'Remove from party'}</span>
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Column 3: Налаштування */}
            <div className="space-y-4">
              <h3 className="text-lg font-display font-bold text-white tracking-tight">
                {language === 'UA' ? 'Налаштування' : 'Settings'}
              </h3>

              <div className="space-y-3.5 text-xs sm:text-sm">

                {/* Switch 1: Чат (CreateRoomModal styling) */}
                <div className="flex items-center justify-between">
                  <span className={`font-medium ${!canChangeSettings ? 'text-zinc-500' : 'text-zinc-200'}`}>
                    {language === 'UA' ? 'Чат' : 'Chat'}
                  </span>
                  <button
                    type="button"
                    disabled={!canChangeSettings}
                    onClick={handleToggleChat}
                    className={`w-11 h-6 rounded-full transition-all duration-300 p-0.5 relative flex items-center shrink-0 ${!canChangeSettings ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
                      } ${chatEnabled
                        ? 'bg-gradient-to-r from-[#FF3040]/20 via-[#FF3040]/70 to-[#FF3040] shadow-[0_0_12px_rgba(255,48,64,0.5)]'
                        : 'bg-gradient-to-r from-[#7B7B7B] via-[#7B7B7B]/70 to-[#7B7B7B]/20 shadow-[0_0_12px_rgba(123,123,123,0.5)]'
                      }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-white shadow-[0_2px_4px_rgba(0,0,0,0.4)] transition-transform duration-300 transform ${chatEnabled ? 'translate-x-[20px]' : 'translate-x-0'
                        }`}
                    />
                  </button>
                </div>

                {/* Switch 2: Керують всі (Тільки хост може передати або забрати керування) */}
                <div className="flex items-center justify-between">
                  <span className={`font-medium ${!isHost ? 'text-zinc-500' : 'text-zinc-200'}`}>
                    {language === 'UA' ? 'Керують всі' : 'Everyone controls'}
                  </span>
                  <button
                    type="button"
                    disabled={!isHost}
                    onClick={handleToggleEveryoneControls}
                    className={`w-11 h-6 rounded-full transition-all duration-300 p-0.5 relative flex items-center shrink-0 ${!isHost ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
                      } ${everyoneControls
                        ? 'bg-gradient-to-r from-[#FF3040]/20 via-[#FF3040]/70 to-[#FF3040] shadow-[0_0_12px_rgba(255,48,64,0.5)]'
                        : 'bg-gradient-to-r from-[#7B7B7B] via-[#7B7B7B]/70 to-[#7B7B7B]/20 shadow-[0_0_12px_rgba(123,123,123,0.5)]'
                      }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-white shadow-[0_2px_4px_rgba(0,0,0,0.4)] transition-transform duration-300 transform ${everyoneControls ? 'translate-x-[20px]' : 'translate-x-0'
                        }`}
                    />
                  </button>
                </div>

                {/* Switch 3: Автоплей (CreateRoomModal styling) */}
                <div className="flex items-center justify-between">
                  <span className={`font-medium ${!canChangeSettings ? 'text-zinc-500' : 'text-zinc-200'}`}>
                    {language === 'UA' ? 'Автоплей' : 'Autoplay'}
                  </span>
                  <button
                    type="button"
                    disabled={!canChangeSettings}
                    onClick={handleToggleAutoplay}
                    className={`w-11 h-6 rounded-full transition-all duration-300 p-0.5 relative flex items-center shrink-0 ${!canChangeSettings ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
                      } ${autoplayEnabled
                        ? 'bg-gradient-to-r from-[#FF3040]/20 via-[#FF3040]/70 to-[#FF3040] shadow-[0_0_12px_rgba(255,48,64,0.5)]'
                        : 'bg-gradient-to-r from-[#7B7B7B] via-[#7B7B7B]/70 to-[#7B7B7B]/20 shadow-[0_0_12px_rgba(123,123,123,0.5)]'
                      }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-white shadow-[0_2px_4px_rgba(0,0,0,0.4)] transition-transform duration-300 transform ${autoplayEnabled ? 'translate-x-[20px]' : 'translate-x-0'
                        }`}
                    />
                  </button>
                </div>

              </div>
            </div>

          </div>

        </div>

        {/* ================= RIGHT Колонка: CHAT & PARTICIPANTS ================= */}
        <div className="lg:col-span-4 flex flex-col mt-6 lg:mt-0">
          <div className="relative lg:sticky lg:top-4 flex flex-col h-[480px] sm:h-[540px] lg:h-[calc(100vh-100px)] lg:min-h-[580px] max-h-[820px] bg-[#121212] rounded-[20px] overflow-hidden shadow-2xl border border-white/10">

            {/* Mobile Tab Switcher Шапка сайту (Visible on < lg) */}
            <div className="flex lg:hidden items-center justify-between px-4 py-3 bg-[#18181c] border-b border-white/10 shrink-0">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setActiveRightTab('chat')}
                  className={`font-display font-extrabold text-sm transition-colors cursor-pointer ${activeRightTab === 'chat' ? 'text-[#FF4D5C]' : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                >
                  {language === 'UA' ? 'Чат' : 'Chat'}
                </button>
                <button
                  onClick={() => setActiveRightTab('participants')}
                  className={`font-display text-xs transition-colors cursor-pointer ${activeRightTab === 'participants' ? 'text-white font-bold' : 'text-zinc-400 hover:text-white'
                    }`}
                >
                  {language === 'UA' ? `Учасників (${participants.length})` : `Participants (${participants.length})`}
                </button>
              </div>
            </div>

            {/* Основна частина повідомлень */}
            {activeRightTab === 'chat' ? (
              <div
                ref={chatContainerRef}
                className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent"
              >
                {messages.map((msg) => (
                  <div key={msg.id} className="flex gap-3 items-start animate-fade-in">
                    {/* Користувач Avatar */}
                    <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 border border-white/10 mt-0.5">
                      <img src={msg.userAvatar} alt={msg.userName} className="w-full h-full object-cover" />
                    </div>

                    {/* Вміст повідомлення */}
                    <div className="space-y-1 flex-1">
                      <div className="flex items-baseline gap-2">
                        <span className={`text-xs font-semibold ${msg.isSystem ? 'text-[#FF4D5C]' : 'text-zinc-200'}`}>
                          {msg.userName}
                        </span>
                        <span className="text-[10px] text-zinc-500 font-mono">
                          {msg.timestamp}
                        </span>
                      </div>
                      <p className={`text-xs leading-relaxed font-sans break-words ${msg.isSystem ? 'text-amber-300 font-medium italic' : 'text-zinc-300'}`}>
                        {msg.text}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* Participants Tab View */
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {participants.map((p) => (
                  <div key={p.id} className="flex items-center justify-between p-2.5 rounded-xl hover:bg-white/5 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="relative w-8 h-8 rounded-full overflow-hidden border border-white/10">
                        <img src={p.avatar} alt={p.name} className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white flex items-center gap-1.5">
                          <span>{p.name}</span>
                          {p.isHost && (
                            <span className="px-1.5 py-0.2 text-[9px] font-bold rounded bg-[#FF4D5C]/20 text-[#FF4D5C] border border-[#FF4D5C]/30">
                              {p.role || 'Організатор'}
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-emerald-400 flex items-center gap-1">
                          <span>Online</span>
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Chat Поле введення Підвал сайту with Жанри Mask Іконка and Red Chevron Кнопка */}
            <div className="p-4 relative shrink-0" ref={emojiPickerRef}>

              {/* Спливаюче вікно вибору емодзі */}
              {showEmojiPicker && (
                <div
                  className="absolute bottom-20 right-4 left-4 border border-[#2A2A2A] rounded-2xl p-3 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150"
                  style={{ backgroundColor: '#121212' }}
                >
                  <div className="text-[11px] font-bold text-zinc-400 mb-2 px-1 flex items-center justify-between">
                    <span>{language === 'UA' ? 'Емоджі та реакції' : 'Emojis & Reactions'}</span>
                    <button
                      type="button"
                      onClick={handleClearChat}
                      className="text-[10px] text-rose-400 hover:underline cursor-pointer"
                    >
                      {language === 'UA' ? 'Очистити чат' : 'Clear chat'}
                    </button>
                  </div>
                  <div className="grid grid-cols-6 sm:grid-cols-7 gap-1.5 max-h-40 overflow-y-auto custom-scrollbar">
                    {EMOJI_LIST.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => handleAddEmoji(emoji)}
                        className="text-lg hover:scale-125 transition-transform p-1 rounded-lg hover:bg-white/10 flex items-center justify-center cursor-pointer"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    ref={chatInputRef}
                    type="text"
                    disabled={!chatEnabled}
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder={
                      chatEnabled
                        ? (language === 'UA' ? 'Напишіть повідомлення...' : 'Type a message...')
                        : (language === 'UA' ? 'Чат вимкнено' : 'Chat is disabled')
                    }
                    className="w-full h-12 bg-transparent border border-white/20 rounded-[14px] pl-4 pr-11 text-sm sm:text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#FF4D5C] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  />

                  {/* Жанри Іконка used as Emoji trigger inside Поле введення on the right */}
                  <button
                    type="button"
                    disabled={!chatEnabled}
                    onClick={() => setShowEmojiPicker((prev) => !prev)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition-all cursor-pointer p-0.5 hover:scale-110 disabled:opacity-30 disabled:pointer-events-none"
                    title={language === 'UA' ? 'Вибрати емоджі' : 'Pick Emoji'}
                  >
                    <img
                      src="/icons/Genres.png"
                      alt="Genres Emoji"
                      className="w-5 h-5 object-contain opacity-75 hover:opacity-100 drop-shadow"
                    />
                  </button>
                </div>

                {/* Red Chevron Send Кнопка */}
                <button
                  type="submit"
                  disabled={!chatEnabled || !inputMessage.trim()}
                  className="w-12 h-12 rounded-[14px] bg-[#FF3040] hover:bg-[#FF1A2D] text-white flex items-center justify-center transition-all shadow-[0_0_15px_rgba(255,48,64,0.35)] active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed shrink-0 cursor-pointer"
                >
                  <ChevronRight className="w-6 h-6 stroke-[2.5]" />
                </button>
              </form>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};

export default ActiveWatchPartyRoom;
