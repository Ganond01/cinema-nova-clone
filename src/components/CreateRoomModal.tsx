import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronDown, ChevronRight, Check } from 'lucide-react';
import { Movie, WatchPartyRoom, UserProfile } from '../types';
import { useLanguage } from '../context/LanguageContext';
import {
  generateUniqueRoomCode,
  formatCurrentCreationTime,
  detectMovieContentType,
  saveWatchPartyRoom,
  resolveUserNickname,
  addWatchPartyMovieId
} from '../utils/watchPartyStorage';

export interface CreateRoomOptions {
  roomId?: string;
  movieId: string;
  movieTitle: string;
  maxParticipants: string;
  groupAccess: string;
  chatEnabled: boolean;
  everyoneControls: boolean;
  autoplayEnabled: boolean;
  isPrivate: boolean;
  hostName?: string;
  hostId?: string;
  createdAt?: string;
  createdByMe?: boolean;
  isHost?: boolean;
}

export interface CreateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  movie: Movie;
  user?: UserProfile | null;
  onWatchTogether?: (movieId: string, options?: CreateRoomOptions) => void;
  onCreateRoom?: (room: Partial<WatchPartyRoom>) => void;
}

const PARTICIPANTS_OPTIONS_UA = [
  '2 учасників',
  '4 учасників',
  '5 учасників',
  '8 учасників',
  '10 учасників',
  '15 учасників',
  '20 учасників',
  'Без обмежень'
];

const PARTICIPANTS_OPTIONS_EN = [
  '2 participants',
  '4 participants',
  '5 participants',
  '8 participants',
  '10 participants',
  '15 participants',
  '20 participants',
  'Unlimited'
];

export const CreateRoomModal: React.FC<CreateRoomModalProps> = ({
  isOpen,
  onClose,
  movie,
  user,
  onWatchTogether,
  onCreateRoom
}) => {
  const { language } = useLanguage();

  const [maxParticipants, setMaxParticipants] = useState(language === 'UA' ? '10 учасників' : '10 participants');
  const [groupAccess, setGroupAccess] = useState(language === 'UA' ? 'Приватний' : 'Private');
  const [chatEnabled, setChatEnabled] = useState(true);
  const [everyoneControls, setEveryoneControls] = useState(false);
  const [autoplayEnabled, setAutoplayEnabled] = useState(true);

  // Користувацький Glass Випадаюче меню Стани
  const [isParticipantsDropdownOpen, setIsParticipantsDropdownOpen] = useState(false);
  const [isGroupAccessDropdownOpen, setIsGroupAccessDropdownOpen] = useState(false);
  
  // Посилання на DOM-елементи для десктопу
  const dropdownRef = useRef<HTMLDivElement>(null);
  const groupAccessRef = useRef<HTMLDivElement>(null);

  // Mobile refs
  const dropdownRefMob = useRef<HTMLDivElement>(null);
  const groupAccessRefMob = useRef<HTMLDivElement>(null);

  // Закриття меню фільтрів при кліку за їх межами
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      const isInsideParticipants =
        (dropdownRef.current && dropdownRef.current.contains(target)) ||
        (dropdownRefMob.current && dropdownRefMob.current.contains(target));
      if (!isInsideParticipants) {
        setIsParticipantsDropdownOpen(false);
      }

      const isInsideGroup =
        (groupAccessRef.current && groupAccessRef.current.contains(target)) ||
        (groupAccessRefMob.current && groupAccessRefMob.current.contains(target));
      if (!isInsideGroup) {
        setIsGroupAccessDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  if (!isOpen) return null;

  const movieDisplayTitle = language === 'ENG' && movie.titleEn ? movie.titleEn : movie.title;
  const participantOptions = language === 'UA' ? PARTICIPANTS_OPTIONS_UA : PARTICIPANTS_OPTIONS_EN;
  const groupAccessOptions = language === 'UA' ? ['Приватний', 'Публічний'] : ['Private', 'Public'];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const isPrivate = groupAccess === 'Приватний' || groupAccess === 'Private';
    const generatedRoomId = generateUniqueRoomCode(movie);
    const realCreatedAt = formatCurrentCreationTime(language);
    const realHostName = resolveUserNickname(user);
    const realHostId = user?.id || `user-${Date.now()}`;
    const contentType = detectMovieContentType(movie);

    const roomOptions: CreateRoomOptions = {
      roomId: generatedRoomId,
      movieId: movie.id,
      movieTitle: movieDisplayTitle,
      maxParticipants,
      groupAccess,
      chatEnabled,
      everyoneControls,
      autoplayEnabled,
      isPrivate,
      hostName: realHostName,
      hostId: realHostId,
      createdAt: realCreatedAt,
      createdByMe: true,
      isHost: true
    };

    const newRoomRecord: any = {
      id: generatedRoomId,
      roomId: generatedRoomId,
      movieId: movie.id,
      movieTitle: movieDisplayTitle,
      moviePosterUrl: movie.posterUrl,
      movieYear: movie.year,
      movieRating: movie.rating,
      contentType,
      roomName: `${movieDisplayTitle} Party`,
      participantsCount: 1,
      chatEnabled,
      everyoneCanControl: everyoneControls,
      everyoneControls,
      autoplayEnabled,
      groupAccess,
      isPrivate,
      maxParticipants,
      hostId: realHostId,
      hostName: realHostName,
      createdAt: realCreatedAt,
      createdTimestamp: Date.now(),
      isPlaying: false,
      currentTime: 0,
      duration: 0,
      messages: [],
      movie,
      isHost: true,
      createdByMe: true,
      participants: [{
        id: realHostId,
        name: realHostName,
        avatar: user?.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
        status: 'online',
        isHost: true,
        role: user?.role === 'admin' ? (language === 'UA' ? 'Адмін (Організатор)' : 'Admin (Host)') : (language === 'UA' ? 'Організатор' : 'Host')
      }]
    };

    saveWatchPartyRoom(newRoomRecord);
    addWatchPartyMovieId(movie.id, user?.id);

    fetch('/api/watchparty/rooms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newRoomRecord)
    }).catch(() => {});

    if (onCreateRoom) {
      onCreateRoom(newRoomRecord);
    } else if (onWatchTogether) {
      onWatchTogether(movie.id, roomOptions);
    }

    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      
      {/* =========================================================================
          DESKTOP MODAL VERSION (sm:block, exact layout & design provided by user)
         ========================================================================= */}
      <div
        className="hidden sm:block max-w-[480px] w-full relative rounded-[20px] p-6 sm:p-7 text-left font-sans animate-in fade-in zoom-in-95 duration-200 my-auto"
        style={{
          background: 'rgba(15, 15, 20, 0.55)',
          backdropFilter: 'blur(24px) saturate(180%)',
          WebkitBackdropFilter: 'blur(24px) saturate(180%)',
          boxShadow: '0 0 35px rgba(255, 48, 64, 0.25), 0 20px 40px rgba(0, 0, 0, 0.6)'
        }}
      >
        {/* Separate 1px Gradient Border (Left #FAFAFA to Right #FF4D5C) */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none rounded-[20px] overflow-hidden">
          <defs>
            <linearGradient id="wp-border-grad-modal" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#FAFAFA" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#FF4D5C" stopOpacity="0.85" />
            </linearGradient>
          </defs>
          <rect
            x="0.5"
            y="0.5"
            width="calc(100% - 1px)"
            height="calc(100% - 1px)"
            rx="20"
            ry="20"
            fill="none"
            stroke="url(#wp-border-grad-modal)"
            strokeWidth="1"
          />
        </svg>

        {/* Закриття X Кнопка */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-6 right-6 text-[#A3A3A3] hover:text-white transition-colors cursor-pointer p-1 z-10"
        >
          <X className="w-5 h-5 stroke-[2.5]" />
        </button>

        {/* Шапка сайту */}
        <div className="mb-5 pr-8">
          <h2 className="font-display font-bold text-xl sm:text-2xl text-[#FAFAFA] tracking-tight mb-1.5">
            {language === 'UA' ? 'Створення Watch Party' : 'Create Watch Party'}
          </h2>
          <p className="text-[#A3A3A3] text-xs leading-relaxed font-sans font-normal opacity-90">
            {language === 'UA'
              ? 'Створіть свою кімнату для спільного перегляду та запросіть друзів приєднатися!'
              : 'Create your watch room for synchronized viewing and invite friends to join!'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 font-sans text-left">
          {/* 1. Фільм або серіал */}
          <div className="space-y-1.5">
            <label className="font-display font-bold text-xs sm:text-sm text-[#FAFAFA] block">
              {language === 'UA' ? 'Фільм або серіал' : 'Movie or series'}
            </label>
            <div className="relative">
              <input
                type="text"
                readOnly
                value={movieDisplayTitle}
                className="w-full h-[48px] bg-black/35 backdrop-blur-md border border-white/10 rounded-[12px] px-4 text-[#FAFAFA] focus:outline-none text-xs sm:text-sm font-sans font-normal transition-all"
              />
            </div>
          </div>

          {/* 2. Максимальна кількість учасників (Custom Glass Dropdown) */}
          <div className="space-y-1.5 relative" ref={dropdownRef}>
            <label className="font-display font-bold text-xs sm:text-sm text-[#FAFAFA] block">
              {language === 'UA' ? 'Максимальна кількість учасників' : 'Max participants'}
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsParticipantsDropdownOpen(!isParticipantsDropdownOpen)}
                className="w-full h-[48px] bg-black/35 backdrop-blur-md border border-white/10 rounded-[12px] px-4 text-[#FAFAFA] flex items-center justify-between text-xs sm:text-sm font-sans font-normal transition-all cursor-pointer outline-none focus:outline-none"
              >
                <span>{maxParticipants}</span>
                <ChevronDown
                  className={`w-4 h-4 text-[#A3A3A3] transition-transform duration-200 ${
                    isParticipantsDropdownOpen ? 'rotate-180 text-white' : ''
                  }`}
                />
              </button>

              {/* Frosted Glass Випадаюче меню Menu */}
              {isParticipantsDropdownOpen && (
                <div
                  className="absolute top-[calc(100%+6px)] left-0 right-0 z-50 rounded-[14px] p-1.5 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
                  style={{
                    background: 'rgba(0, 0, 0, 0.45)',
                    backdropFilter: 'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    boxShadow: '0 12px 32px rgba(0, 0, 0, 0.5)'
                  }}
                >
                  <div className="max-h-52 overflow-y-auto space-y-0.5 custom-scrollbar">
                    {participantOptions.map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => {
                          setMaxParticipants(opt);
                          setIsParticipantsDropdownOpen(false);
                        }}
                        className={`w-full py-2.5 px-3 rounded-[10px] text-left text-xs sm:text-sm flex items-center justify-between cursor-pointer outline-none focus:outline-none bg-transparent border-0 ${
                          maxParticipants === opt
                            ? 'text-white font-semibold'
                            : 'text-zinc-300'
                        }`}
                      >
                        <span>{opt}</span>
                        {maxParticipants === opt && (
                          <Check className="w-3.5 h-3.5 text-[#FF4D5C]" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 3. Доступ до групи */}
          <div className="space-y-1.5 relative" ref={groupAccessRef}>
            <label className="font-display font-bold text-xs sm:text-sm text-[#FAFAFA] block">
              {language === 'UA' ? 'Доступ до групи' : 'Group access'}
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsGroupAccessDropdownOpen(!isGroupAccessDropdownOpen)}
                className="w-full h-[48px] bg-black/35 backdrop-blur-md border border-white/10 rounded-[12px] px-4 text-[#FAFAFA] flex items-center justify-between text-xs sm:text-sm font-sans font-normal transition-all cursor-pointer outline-none focus:outline-none"
              >
                <span>{groupAccess}</span>
                <ChevronDown
                  className={`w-4 h-4 text-[#A3A3A3] transition-transform duration-200 ${
                    isGroupAccessDropdownOpen ? 'rotate-180 text-white' : ''
                  }`}
                />
              </button>

              {/* Frosted Glass Випадаюче меню Menu */}
              {isGroupAccessDropdownOpen && (
                <div
                  className="absolute top-[calc(100%+6px)] left-0 right-0 z-50 rounded-[14px] p-1.5 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
                  style={{
                    background: 'rgba(0, 0, 0, 0.45)',
                    backdropFilter: 'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    boxShadow: '0 12px 32px rgba(0, 0, 0, 0.5)'
                  }}
                >
                  <div className="space-y-0.5">
                    {groupAccessOptions.map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => {
                          setGroupAccess(opt);
                          setIsGroupAccessDropdownOpen(false);
                        }}
                        className={`w-full py-2.5 px-3 rounded-[10px] text-left text-xs sm:text-sm flex items-center justify-between cursor-pointer outline-none focus:outline-none bg-transparent border-0 ${
                          groupAccess === opt
                            ? 'text-white font-semibold'
                            : 'text-zinc-300'
                        }`}
                      >
                        <span>{opt}</span>
                        {groupAccess === opt && (
                          <Check className="w-3.5 h-3.5 text-[#FF4D5C]" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <p className="text-[#FF4D5C] text-[11px] font-sans font-normal pt-1 leading-snug">
              {language === 'UA'
                ? 'Тільки користувачі з запрошенням зможуть приєднатися до вашої кімнати перегляду.'
                : 'Only invited users will be able to join your watch room.'}
            </p>
          </div>

          {/* 4. Налаштування */}
          <div className="pt-1">
            <label className="font-display font-bold text-sm text-[#FAFAFA] block mb-2.5">
              {language === 'UA' ? 'Налаштування' : 'Settings'}
            </label>
            <div className="space-y-3">
              {/* Чат */}
              <div className="flex items-center justify-between">
                <span className="text-[#FAFAFA] text-xs sm:text-sm font-sans font-normal">
                  {language === 'UA' ? 'Чат' : 'Chat'}
                </span>
                <button
                  type="button"
                  onClick={() => setChatEnabled(!chatEnabled)}
                  className={`w-11 h-6 rounded-full transition-all duration-300 p-0.5 cursor-pointer relative flex items-center shrink-0 ${
                    chatEnabled
                      ? 'bg-gradient-to-r from-[#FF3040]/20 via-[#FF3040]/70 to-[#FF3040] shadow-[0_0_12px_rgba(255,48,64,0.5)]'
                      : 'bg-gradient-to-r from-[#7B7B7B] via-[#7B7B7B]/70 to-[#7B7B7B]/20 shadow-[0_0_12px_rgba(123,123,123,0.5)]'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white shadow-[0_2px_4px_rgba(0,0,0,0.4)] transition-transform duration-300 transform ${
                      chatEnabled ? 'translate-x-[20px]' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Керують всі */}
              <div className="flex items-center justify-between">
                <span className="text-[#FAFAFA] text-xs sm:text-sm font-sans font-normal">
                  {language === 'UA' ? 'Керують всі' : 'Everyone controls'}
                </span>
                <button
                  type="button"
                  onClick={() => setEveryoneControls(!everyoneControls)}
                  className={`w-11 h-6 rounded-full transition-all duration-300 p-0.5 cursor-pointer relative flex items-center shrink-0 ${
                    everyoneControls
                      ? 'bg-gradient-to-r from-[#FF3040]/20 via-[#FF3040]/70 to-[#FF3040] shadow-[0_0_12px_rgba(255,48,64,0.5)]'
                      : 'bg-gradient-to-r from-[#7B7B7B] via-[#7B7B7B]/70 to-[#7B7B7B]/20 shadow-[0_0_12px_rgba(123,123,123,0.5)]'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white shadow-[0_2px_4px_rgba(0,0,0,0.4)] transition-transform duration-300 transform ${
                      everyoneControls ? 'translate-x-[20px]' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Автоплей */}
              <div className="flex items-center justify-between">
                <span className="text-[#FAFAFA] text-xs sm:text-sm font-sans font-normal">
                  {language === 'UA' ? 'Автоплей' : 'Autoplay'}
                </span>
                <button
                  type="button"
                  onClick={() => setAutoplayEnabled(!autoplayEnabled)}
                  className={`w-11 h-6 rounded-full transition-all duration-300 p-0.5 cursor-pointer relative flex items-center shrink-0 ${
                    autoplayEnabled
                      ? 'bg-gradient-to-r from-[#FF3040]/20 via-[#FF3040]/70 to-[#FF3040] shadow-[0_0_12px_rgba(255,48,64,0.5)]'
                      : 'bg-gradient-to-r from-[#7B7B7B] via-[#7B7B7B]/70 to-[#7B7B7B]/20 shadow-[0_0_12px_rgba(123,123,123,0.5)]'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white shadow-[0_2px_4px_rgba(0,0,0,0.4)] transition-transform duration-300 transform ${
                      autoplayEnabled ? 'translate-x-[20px]' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Action Кнопка */}
          <div className="pt-3 flex justify-center">
            <button
              type="submit"
              className="journey-cta-btn border-2 border-transparent hover:border-white/80 active:border-transparent text-white w-full max-w-[280px] mx-auto py-3.5 mt-2 font-display font-bold text-sm sm:text-base rounded-[14px] flex items-center justify-center gap-2 transition-all transform hover:scale-102 active:scale-98 hover:shadow-[0_0_24px_rgba(255,255,255,0.3),0_10px_25px_rgba(215,40,53,0.35)] shadow-lg shadow-[#FF4D5C]/25 cursor-pointer text-center select-none"
            >
              <span>{language === 'UA' ? 'Створити Watch Party' : 'Create Watch Party'}</span>
              <ChevronRight className="w-4 h-4 stroke-[3]" />
            </button>
          </div>
        </form>
      </div>

      {/* =========================================================================
          MOBILE MODAL VERSION (sm:hidden, preserved compact mobile design)
         ========================================================================= */}
      <div
        className="sm:hidden w-full max-w-[345px] relative rounded-[16px] p-5 text-left font-sans animate-in fade-in zoom-in-95 duration-200 my-auto"
        style={{
          background: 'rgba(12, 12, 18, 0.78)',
          backdropFilter: 'blur(24px) saturate(180%)',
          WebkitBackdropFilter: 'blur(24px) saturate(180%)',
          boxShadow: '0 0 30px rgba(255, 48, 64, 0.18), 0 20px 40px rgba(0, 0, 0, 0.7)'
        }}
      >
        {/* Mobile Gradient Border (White/Silver top-left to Red #FF3040 bottom-right) */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none rounded-[16px] overflow-hidden">
          <defs>
            <linearGradient id="wp-border-grad-modal-mob" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.85" />
              <stop offset="45%" stopColor="#FFFFFF" stopOpacity="0.25" />
              <stop offset="75%" stopColor="#FF3040" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#FF3040" stopOpacity="0.9" />
            </linearGradient>
          </defs>
          <rect
            x="0.5"
            y="0.5"
            width="calc(100% - 1px)"
            height="calc(100% - 1px)"
            rx="16"
            ry="16"
            fill="none"
            stroke="url(#wp-border-grad-modal-mob)"
            strokeWidth="1"
          />
        </svg>

        {/* Закриття X Кнопка */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 text-[#A3A3A3] hover:text-white transition-colors cursor-pointer p-1 z-10"
        >
          <X className="w-5 h-5 stroke-[1.5]" />
        </button>

        {/* Шапка сайту */}
        <div className="mb-4 pr-7">
          <h2 className="font-sans font-bold text-base text-[#FAFAFA] tracking-tight mb-1">
            {language === 'UA' ? 'Створення Watch Party' : 'Create Watch Party'}
          </h2>
          <p className="text-[#A3A3A3] text-[11px] leading-relaxed font-sans font-normal opacity-90">
            {language === 'UA'
              ? 'Створіть свою кімнату для спільного перегляду та запросіть друзів приєднатися!'
              : 'Create your watch room for synchronized viewing and invite friends to join!'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 font-sans text-left">
          {/* 1. Фільм або серіал */}
          <div className="space-y-1">
            <label className="font-sans font-medium text-xs text-[#FAFAFA] block">
              {language === 'UA' ? 'Фільм або серіал' : 'Movie or series'}
            </label>
            <div className="relative">
              <input
                type="text"
                readOnly
                value={movieDisplayTitle}
                className="w-full h-[38px] bg-[#18181D]/80 border border-white/20 rounded-[10px] px-3.5 text-[#A3A3A3] focus:outline-none text-xs font-sans font-normal transition-all"
              />
            </div>
          </div>

          {/* 2. Максимальна кількість учасників (Custom Glass Dropdown) */}
          <div className="space-y-1 relative" ref={dropdownRefMob}>
            <label className="font-sans font-medium text-xs text-[#FAFAFA] block">
              {language === 'UA' ? 'Максимальна кількість учасників' : 'Max participants'}
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsParticipantsDropdownOpen(!isParticipantsDropdownOpen)}
                className="w-full h-[38px] bg-black/35 backdrop-blur-md border border-white/20 hover:border-white/40 hover:bg-black/50 rounded-[10px] px-3.5 text-[#FAFAFA] flex items-center justify-between text-xs font-sans font-normal transition-all cursor-pointer outline-none focus:outline-none"
              >
                <span>{maxParticipants}</span>
                <ChevronDown
                  className={`w-4 h-4 text-[#A3A3A3] transition-transform duration-200 ${
                    isParticipantsDropdownOpen ? 'rotate-180 text-white' : ''
                  }`}
                />
              </button>

              {/* Frosted Glass Випадаюче меню Menu */}
              {isParticipantsDropdownOpen && (
                <div
                  className="absolute top-[calc(100%+6px)] left-0 right-0 z-50 rounded-[14px] p-1.5 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
                  style={{
                    background: 'rgba(15, 15, 20, 0.95)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    boxShadow: '0 16px 36px rgba(0, 0, 0, 0.7)'
                  }}
                >
                  <div className="max-h-52 overflow-y-auto space-y-0.5 custom-scrollbar">
                    {participantOptions.map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => {
                          setMaxParticipants(opt);
                          setIsParticipantsDropdownOpen(false);
                        }}
                        className={`w-full py-2.5 px-3 rounded-[10px] text-left text-xs flex items-center justify-between cursor-pointer outline-none focus:outline-none transition-all duration-150 hover:bg-white/10 active:scale-[0.99] border-0 ${
                          maxParticipants === opt
                            ? 'text-white font-semibold bg-white/[0.08]'
                            : 'text-zinc-300 hover:text-white'
                        }`}
                      >
                        <span>{opt}</span>
                        {maxParticipants === opt && (
                          <Check className="w-3.5 h-3.5 text-[#FF3040] animate-in fade-in zoom-in-90 duration-150" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 3. Доступ до групи */}
          <div className="space-y-1 relative" ref={groupAccessRefMob}>
            <label className="font-sans font-medium text-xs text-[#FAFAFA] block">
              {language === 'UA' ? 'Доступ до групи' : 'Group access'}
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsGroupAccessDropdownOpen(!isGroupAccessDropdownOpen)}
                className="w-full h-[38px] bg-black/35 backdrop-blur-md border border-white/20 hover:border-white/40 hover:bg-black/50 rounded-[10px] px-3.5 text-[#FAFAFA] flex items-center justify-between text-xs font-sans font-normal transition-all cursor-pointer outline-none focus:outline-none"
              >
                <span>{groupAccess}</span>
                <ChevronDown
                  className={`w-4 h-4 text-[#A3A3A3] transition-transform duration-200 ${
                    isGroupAccessDropdownOpen ? 'rotate-180 text-white' : ''
                  }`}
                />
              </button>

              {/* Frosted Glass Випадаюче меню Menu */}
              {isGroupAccessDropdownOpen && (
                <div
                  className="absolute top-[calc(100%+6px)] left-0 right-0 z-50 rounded-[14px] p-1.5 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
                  style={{
                    background: 'rgba(15, 15, 20, 0.95)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    boxShadow: '0 16px 36px rgba(0, 0, 0, 0.7)'
                  }}
                >
                  <div className="space-y-0.5">
                    {groupAccessOptions.map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => {
                          setGroupAccess(opt);
                          setIsGroupAccessDropdownOpen(false);
                        }}
                        className={`w-full py-2.5 px-3 rounded-[10px] text-left text-xs flex items-center justify-between cursor-pointer outline-none focus:outline-none transition-all duration-150 hover:bg-white/10 active:scale-[0.99] border-0 ${
                          groupAccess === opt
                            ? 'text-white font-semibold bg-white/[0.08]'
                            : 'text-zinc-300 hover:text-white'
                        }`}
                      >
                        <span>{opt}</span>
                        {groupAccess === opt && (
                          <Check className="w-3.5 h-3.5 text-[#FF3040] animate-in fade-in zoom-in-90 duration-150" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <p className="text-[#FF3040] text-[10px] font-sans font-normal pt-1 leading-snug">
              {language === 'UA'
                ? 'Тільки користувачі з запрошенням зможуть приєднатися до вашої кімнати перегляду.'
                : 'Only invited users will be able to join your watch room.'}
            </p>
          </div>

          {/* 4. Налаштування (3-Column Layout with Desktop Switcher Animation & Glow) */}
          <div className="pt-1">
            <label className="font-sans font-medium text-xs text-[#FAFAFA] block mb-2">
              {language === 'UA' ? 'Налаштування' : 'Settings'}
            </label>
            <div className="grid grid-cols-3 gap-2 text-left">
              {/* Чат */}
              <div className="flex flex-col items-start gap-1.5">
                <span className="text-[#FAFAFA] text-xs font-sans font-normal">
                  {language === 'UA' ? 'Чат' : 'Chat'}
                </span>
                <button
                  type="button"
                  onClick={() => setChatEnabled(!chatEnabled)}
                  className={`w-11 h-6 rounded-full transition-all duration-300 p-0.5 cursor-pointer relative flex items-center shrink-0 ${
                    chatEnabled
                      ? 'bg-gradient-to-r from-[#FF3040]/20 via-[#FF3040]/70 to-[#FF3040] shadow-[0_0_12px_rgba(255,48,64,0.5)]'
                      : 'bg-gradient-to-r from-[#7B7B7B] via-[#7B7B7B]/70 to-[#7B7B7B]/20 shadow-[0_0_12px_rgba(123,123,123,0.5)]'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white shadow-[0_2px_4px_rgba(0,0,0,0.4)] transition-transform duration-300 transform ${
                      chatEnabled ? 'translate-x-[20px]' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Керують всі */}
              <div className="flex flex-col items-start gap-1.5">
                <span className="text-[#FAFAFA] text-xs font-sans font-normal">
                  {language === 'UA' ? 'Керують всі' : 'Everyone controls'}
                </span>
                <button
                  type="button"
                  onClick={() => setEveryoneControls(!everyoneControls)}
                  className={`w-11 h-6 rounded-full transition-all duration-300 p-0.5 cursor-pointer relative flex items-center shrink-0 ${
                    everyoneControls
                      ? 'bg-gradient-to-r from-[#FF3040]/20 via-[#FF3040]/70 to-[#FF3040] shadow-[0_0_12px_rgba(255,48,64,0.5)]'
                      : 'bg-gradient-to-r from-[#7B7B7B] via-[#7B7B7B]/70 to-[#7B7B7B]/20 shadow-[0_0_12px_rgba(123,123,123,0.5)]'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white shadow-[0_2px_4px_rgba(0,0,0,0.4)] transition-transform duration-300 transform ${
                      everyoneControls ? 'translate-x-[20px]' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Автоплей */}
              <div className="flex flex-col items-start gap-1.5">
                <span className="text-[#FAFAFA] text-xs font-sans font-normal">
                  {language === 'UA' ? 'Автоплей' : 'Autoplay'}
                </span>
                <button
                  type="button"
                  onClick={() => setAutoplayEnabled(!autoplayEnabled)}
                  className={`w-11 h-6 rounded-full transition-all duration-300 p-0.5 cursor-pointer relative flex items-center shrink-0 ${
                    autoplayEnabled
                      ? 'bg-gradient-to-r from-[#FF3040]/20 via-[#FF3040]/70 to-[#FF3040] shadow-[0_0_12px_rgba(255,48,64,0.5)]'
                      : 'bg-gradient-to-r from-[#7B7B7B] via-[#7B7B7B]/70 to-[#7B7B7B]/20 shadow-[0_0_12px_rgba(123,123,123,0.5)]'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white shadow-[0_2px_4px_rgba(0,0,0,0.4)] transition-transform duration-300 transform ${
                      autoplayEnabled ? 'translate-x-[20px]' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Mobile Action Кнопка */}
          <div className="pt-3 flex justify-center">
            <button
              type="submit"
              className="journey-cta-btn border-2 border-transparent hover:border-white/80 active:border-transparent text-white w-full max-w-[240px] py-2.5 font-display font-bold text-xs rounded-[10px] flex items-center justify-center transition-all transform hover:scale-102 active:scale-98 hover:shadow-[0_0_24px_rgba(255,255,255,0.3),0_10px_25px_rgba(215,40,53,0.35)] shadow-lg shadow-[#FF4D5C]/25 cursor-pointer text-center select-none"
            >
              <span>{language === 'UA' ? 'Створити Watch Party' : 'Create Watch Party'}</span>
            </button>
          </div>
        </form>
      </div>

    </div>,
    document.body
  );
};

export default CreateRoomModal;
