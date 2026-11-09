import React, { useMemo } from 'react';
import { Download, Heart, Settings, Users, Sparkles, Check, X } from 'lucide-react';
import { AppNotification, UserProfile } from '../types';
import {
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getUserNotifications,
  deduplicateNotifications,
} from '../services/notifications';
import { Movie } from '../types';

interface NotificationsDropdownProps {
  user: UserProfile | null;
  language: 'UA' | 'ENG';
  notificationList: AppNotification[];
  setNotificationList: React.Dispatch<React.SetStateAction<AppNotification[]>>;
  onClose: () => void;
  setActiveTab: (tab: string) => void;
  onJoinWatchParty?: (roomId: string) => void;
  onOpenAuth: () => void;
  onUpdateUser?: (updated: UserProfile) => void;
  allMovies?: Movie[];
  onSelectMovie?: (movie: Movie) => void;
}

export const NotificationsDropdown: React.FC<NotificationsDropdownProps> = ({
  user,
  language,
  notificationList,
  setNotificationList,
  onClose,
  setActiveTab,
  onJoinWatchParty,
  onOpenAuth,
  onUpdateUser,
  allMovies = [],
  onSelectMovie,
}) => {
  const cleanNotifications = useMemo(() => {
    return deduplicateNotifications(notificationList).filter(
      (n) => n.type !== 'party_invite'
    );
  }, [notificationList]);

  const unreadCount = useMemo(
    () => cleanNotifications.filter((n) => n.unread).length,
    [cleanNotifications]
  );

  const refreshNotifications = () => {
    setNotificationList(deduplicateNotifications(getUserNotifications(user)));
  };

  const handleMarkAsRead = (id: string) => {
    markNotificationAsRead(id);
    setNotificationList(getUserNotifications(user));
  };

  const handleMarkAllAsRead = (e: React.MouseEvent) => {
    e.stopPropagation();
    markAllNotificationsAsRead();
    setNotificationList(getUserNotifications(user));
  };

  const handleNotificationClick = (notif: AppNotification) => {
    if (notif.unread) {
      handleMarkAsRead(notif.id);
    }

    // 1. Watch Party room link
    if ((notif.type === 'party_invite' || notif.type === 'party_joined') && notif.data?.roomId) {
      if (onJoinWatchParty) {
        onJoinWatchParty(notif.data.roomId);
      } else {
        setActiveTab('watchparty');
      }
      onClose();
      return;
    }

    // 2. Direct Фільм Навігація if movieId is attached
    if (notif.data?.movieId && onSelectMovie && allMovies.length > 0) {
      const found = allMovies.find(m => m.id === notif.data?.movieId);
      if (found) {
        onSelectMovie(found);
        onClose();
        return;
      }
    }

    // 3. Завантаження Навігація
    if (notif.type === 'download') {
      setActiveTab('downloads');
      onClose();
      return;
    }

    // 4. Обране Навігація
    if (notif.type === 'favorite') {
      setActiveTab('mylist');
      onClose();
      return;
    }

    // 5. Профіль Навігація
    if (notif.type === 'profile_update') {
      setActiveTab('profile');
      onClose();
      return;
    }

    // 6. Premiere or Серія Навігація (Пошук matching Заголовок)
    if (notif.type === 'premiere' || notif.type === 'episode') {
      if (onSelectMovie && allMovies.length > 0) {
        const found = allMovies.find(m => 
          (m.title && notif.desc && notif.desc.includes(m.title)) ||
          (m.title && notif.title && notif.title.includes(m.title)) ||
          (m.titleEn && notif.descEn && notif.descEn.includes(m.titleEn))
        );
        if (found) {
          onSelectMovie(found);
          onClose();
          return;
        }
      }
      setActiveTab('home');
      onClose();
      return;
    }
  };

  const renderNotificationIcon = (n: AppNotification) => {
    if (n.iconType === 'download' || n.type === 'download') {
      return <Download className="w-3.5 h-3.5 sm:w-6 sm:h-6 text-white stroke-[1.8]" />;
    }
    if (n.iconType === 'heart' || n.type === 'favorite') {
      return <Heart className="w-3.5 h-3.5 sm:w-6 sm:h-6 text-white stroke-[1.8]" />;
    }
    if (n.iconType === 'settings' || n.type === 'profile_update') {
      return <Settings className="w-3.5 h-3.5 sm:w-6 sm:h-6 text-white stroke-[1.8]" />;
    }
    if (n.type === 'party_invite' || n.type === 'party_joined') {
      return <Users className="w-3.5 h-3.5 sm:w-6 sm:h-6 text-white stroke-[1.8]" />;
    }
    return <Sparkles className="w-3.5 h-3.5 sm:w-6 sm:h-6 text-white stroke-[1.8]" />;
  };

  return (
    <div
      className="absolute right-0 sm:right-auto sm:left-1/2 sm:-translate-x-1/2 top-full mt-2 sm:mt-4 w-[182px] h-[271px] sm:w-[593px] sm:h-[875px] max-w-[calc(100vw-24px)] max-h-[calc(100vh-140px)] cinema-notification-window z-50 animate-in fade-in zoom-in-95 duration-150 rounded-[14px] sm:rounded-[20px] shadow-2xl overflow-hidden flex flex-col"
      style={{
        background: 'rgba(15, 15, 20, 0.75)',
        backdropFilter: 'blur(24px) saturate(180%)',
        WebkitBackdropFilter: 'blur(24px) saturate(180%)',
        boxShadow: '0 0 35px rgba(255, 48, 64, 0.3), 0 0 12px rgba(255, 255, 255, 0.15), 0 20px 45px rgba(0, 0, 0, 0.7)',
      }}
    >
      {/* Desktop Gradient Border (1:1 Original Desktop) */}
      <svg className="hidden sm:block absolute inset-0 w-full h-full pointer-events-none rounded-[20px] overflow-hidden z-30">
        <defs>
          <linearGradient id="notif-modal-border-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="1" />
            <stop offset="60%" stopColor="#FAFAFA" stopOpacity="1" />
            <stop offset="100%" stopColor="#FF4D5C" stopOpacity="1" />
          </linearGradient>
          <filter id="notif-border-glow-soft">
            <feGaussianBlur stdDeviation="1.5" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {/* Ambient glow stroke for enhanced visibility */}
        <rect
          x="1"
          y="1"
          width="calc(100% - 2px)"
          height="calc(100% - 2px)"
          rx="20"
          ry="20"
          fill="none"
          stroke="url(#notif-modal-border-grad)"
          strokeWidth="3"
          strokeOpacity="0.45"
          filter="url(#notif-border-glow-soft)"
        />
        {/* Crisp primary border stroke (1.5px) */}
        <rect
          x="1"
          y="1"
          width="calc(100% - 2px)"
          height="calc(100% - 2px)"
          rx="20"
          ry="20"
          fill="none"
          stroke="url(#notif-modal-border-grad)"
          strokeWidth="1.5"
          strokeOpacity="1"
        />
      </svg>

      {/* Mobile Gradient Border (w182 h271 rx14) */}
      <svg className="block sm:hidden absolute inset-0 w-full h-full pointer-events-none rounded-[14px] overflow-hidden z-30">
        <defs>
          <linearGradient id="notif-modal-border-grad-m" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="1" />
            <stop offset="60%" stopColor="#FAFAFA" stopOpacity="1" />
            <stop offset="100%" stopColor="#FF4D5C" stopOpacity="1" />
          </linearGradient>
        </defs>
        <rect
          x="1"
          y="1"
          width="calc(100% - 2px)"
          height="calc(100% - 2px)"
          rx="14"
          ry="14"
          fill="none"
          stroke="url(#notif-modal-border-grad-m)"
          strokeWidth="1.2"
          strokeOpacity="0.9"
        />
      </svg>

      <div className="relative z-20 flex flex-col h-full">
        {/* Шапка сайту: Exactly 148px gap on Desktop, 15px on Mobile */}
        <div className="px-2.5 sm:px-6 pt-2.5 sm:pt-6 mb-2 sm:mb-[30px] flex items-center justify-start gap-[15px] sm:gap-[148px] shrink-0">
          <h3
            style={{ fontFamily: "'Montserrat Alternates', sans-serif" }}
            className="text-[10px] sm:text-2xl font-semibold text-white tracking-tight shrink-0"
          >
            {language === 'UA' ? 'Повідомлення' : 'Notifications'}
          </h3>
          {cleanNotifications.length > 0 && (
            <button
              type="button"
              onClick={handleMarkAllAsRead}
              className={`text-[#FF3040] hover:text-[#FF4D5C] text-[6px] sm:text-sm font-medium transition-colors cursor-pointer select-none shrink-0 ${
                unreadCount === 0 ? 'opacity-60 hover:opacity-100' : 'opacity-100'
              }`}
            >
              {language === 'UA' ? 'Позначити всі як прочитанні' : 'Mark all as read'}
            </button>
          )}
        </div>

        {/* Notification Items Список */}
        <div className="flex-1 overflow-y-auto px-2 sm:px-6 pb-2 sm:pb-6 space-y-1 sm:space-y-2.5 custom-scrollbar">
          {cleanNotifications.length === 0 ? (
            <div className="py-8 sm:py-12 px-3 sm:px-6 text-center text-[#A3A3A3] font-sans text-[10px] sm:text-xs space-y-1 sm:space-y-2">
              <p className="font-semibold text-[#FAFAFA] text-xs sm:text-sm">
                {language === 'UA' ? 'Немає повідомлень' : 'No notifications'}
              </p>
              <p className="text-[9px] sm:text-xs text-zinc-400 leading-normal">
                {language === 'UA'
                  ? 'Тут відображатимуться сповіщення про прем’єри, завантаження, додавання в обране та оновлення'
                  : 'Notifications about premieres, downloads, favorites, and updates will appear here'}
              </p>
            </div>
          ) : (
            cleanNotifications.map((n) => {
              const isUnread = Boolean(n.unread);

              const isDownloadOrFavorite = n.type === 'download' || n.type === 'favorite' || n.iconType === 'download' || n.iconType === 'heart';
              const isMovieNotification = !isDownloadOrFavorite && Boolean(n.posterUrl) && (n.type === 'premiere' || (!['profile_update', 'friend_request', 'party_invite'].includes(n.type)));

              return (
                <div
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  style={
                    isMovieNotification && isUnread
                      ? {
                        background: 'linear-gradient(115deg, #666666 0%, #1D1D1D 100%)',
                      }
                      : {
                        background: 'transparent',
                      }
                  }
                  className={`transition-all p-1.5 sm:p-4 flex items-center gap-1.5 sm:gap-3.5 cursor-pointer group relative ${isMovieNotification && isUnread
                      ? 'rounded-[10px] sm:rounded-[20px] border border-white/15 shadow-lg shadow-black/40 hover:brightness-105'
                      : 'rounded-[8px] sm:rounded-[14px] bg-transparent border-b border-white/10 hover:bg-white/[0.03] opacity-85 hover:opacity-100'
                    }`}
                >
                  {/* Left Колонка Graphic: Sized and aligned identically for posters and circular Іконки */}
                  <div className="w-8 sm:w-14 shrink-0 flex items-center justify-center">
                    {isMovieNotification && n.posterUrl ? (
                      <img
                        src={n.posterUrl}
                        alt={n.title}
                        className={`w-8 h-11 sm:w-14 sm:h-20 rounded-[6px] sm:rounded-[14px] object-cover shrink-0 shadow-md border ${isUnread ? 'border-white/20' : 'border-white/5 opacity-85'
                          }`}
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/posters/Rectangle 280.png';
                        }}
                      />
                    ) : (
                      <div
                        className={`w-7 h-7 sm:w-14 sm:h-14 rounded-full flex items-center justify-center shrink-0 transition-colors ${isUnread
                            ? 'bg-[#32323A] border border-white/15 group-hover:bg-[#3A3A44]'
                            : 'bg-[#222226] border border-white/5 group-hover:bg-[#2A2A2E]'
                          }`}
                      >
                        {renderNotificationIcon(n)}
                      </div>
                    )}
                  </div>

                  {/* Middle Колонка Text */}
                  <div className="min-w-0 flex-1">
                    <h4
                      className={`text-[9.5px] sm:text-[16px] leading-tight truncate group-hover:text-white ${isUnread ? 'font-bold text-white' : 'font-medium text-zinc-300'
                        }`}
                    >
                      {language === 'ENG' ? n.titleEn || n.title : n.title}
                    </h4>
                    <p
                      className={`text-[7.5px] sm:text-[13px] leading-snug line-clamp-2 mt-0.5 sm:mt-1 ${isUnread ? 'text-zinc-200 font-normal' : 'text-zinc-400 font-normal'
                        }`}
                    >
                      {language === 'ENG' ? n.descEn || n.desc : n.desc}
                    </p>
                    <div className="flex items-center gap-1 sm:gap-2 mt-0.5 sm:mt-1.5">
                      <span className="text-zinc-400 text-[6.5px] sm:text-xs font-normal">
                        {language === 'ENG' ? n.timeEn || n.time : n.time}
                      </span>
                      {!isUnread && (
                        <span className="text-[6px] sm:text-[10px] text-zinc-400 font-medium uppercase tracking-wider">
                          {language === 'UA' ? '• ПРОЧИТАНО' : '• READ'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Red Glowing Indicator Dot for Unread */}
                  {isUnread && (
                    <span
                      className="w-1.5 h-1.5 sm:w-3.5 sm:h-3.5 rounded-full bg-[#FF3040] shadow-[0_0_8px_rgba(255,48,64,0.95)] shrink-0 ml-auto"
                      title={language === 'UA' ? 'Нове сповіщення' : 'New notification'}
                    />
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationsDropdown;
