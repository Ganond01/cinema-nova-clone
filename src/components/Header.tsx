import React, { useState, useEffect, useRef } from 'react';
import { Menu, User } from 'lucide-react';
import { Movie, UserProfile, AppNotification } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { getUserNotifications } from '../services/notifications';
import { NotificationsDropdown } from './NotificationsDropdown';

/**
 * НАЛАШТУВАННЯ ВІДСТУПІВ ТА ГЕОМЕТРІЇ ХЕДЕРА (Header Spacing & Geometry Config)
 * Усі відступи та розміри в хедері можна централізовано змінювати тут:
 */
export const HEADER_CONFIG = {
  // 0. РОЗМІР / ВИСОТА ХЕДЕРА (Header Height & Sizing)
  height: '141px',                        // Загальна висота хедера (наприклад: '75px', '80px', '94px' або 'auto')
  minHeight: 'auto',                     // Мінімальна висота хедера
  maxHeight: 'none',                     // Максимальна висота хедера ('none' або конкретне значення в px)
  paddingY: '14px',                      // Вертикальний відступ хедера (py)

  // 1. ВІДСТУП ВІД ЛОГОТИПУ ДО ПОШУКУ (150 пікселів між ними на десктопі)
  logoToSearchGap: '150px',              // Точний відступ між блоком логотипу та пошуком (150px)
  logoToSearchGapMobile: '16px',         // Адаптивний відступ для мобільних екранів (<768px)

  // 2. ВНУТРІШНІ ВІДСТУПИ ХЕДЕРА (Header Padding)
  paddingLeft: '50px',                   // Відступ лого від лівої частини хедера (50px)
  paddingLeftMobile: '16px',             // Лівий відступ для мобільних екранів (<768px)
  paddingRight: '91px',                  // Відступ від іконки виходу до правої сторони хедера (91px)
  paddingRightMobile: '16px',            // Відступ для мобільних екранів (<768px)

  // 3. РОЗМІРИ ПОЛЯ ПОШУКУ (Search Input Dimensions - Figma: 806px x 51px)
  searchMaxWidth: '806px',               // Максимальна ширина поля пошуку за Figma
  searchHeight: '51px',                  // Висота поля пошуку за Figma

  // 4. ВІДСТУПИ В ПРАВІЙ СЕКЦІЇ (Notifications, Profile, Language - Figma: gap 50px)
  notificationsToProfileGap: '50px',     // Відступ між сповіщеннями та профілем (50px)
  profileToLanguageGap: '50px',          // Відступ між профілем та світчером мови (50px)
  rightSectionGapDesktop: '50px',        // Відступ між світчером мови, профілем та сповіщеннями (50px)
  rightSectionGapMobile: '16px',         // Адаптивний відступ для мобільних екранів (<768px)

  // 5. ВІДСТУП МІЖ ЛІВОЮ ТА ПРАВОЮ СЕКЦІЯМИ
  betweenMainSectionsGap: '24px',        // Відступ між блоком лого+пошуку та блоком дій
};

interface HeaderProps {
  movies: Movie[];
  user: UserProfile | null;
  onOpenAuth: () => void;
  onSelectMovie: (movie: Movie) => void;
  onSignOut: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onMobileMenuOpen: () => void;
  searchQuery?: string;
  setSearchQuery?: (query: string) => void;
  onUpdateUser?: (updated: UserProfile) => void;
  onJoinWatchParty?: (roomId: string) => void;
  isHidden?: boolean;
}

export default function Header({
  movies,
  user,
  onOpenAuth,
  onSelectMovie,
  onSignOut,
  activeTab,
  setActiveTab,
  onMobileMenuOpen,
  searchQuery: externalSearchQuery,
  setSearchQuery: externalSetSearchQuery,
  onUpdateUser,
  onJoinWatchParty,
  isHidden = false
}: HeaderProps) {
  const { language, setLanguage, t } = useLanguage();
  const [internalSearchQuery, setInternalSearchQuery] = useState('');

  const searchQuery = externalSearchQuery !== undefined ? externalSearchQuery : internalSearchQuery;
  const setSearchQuery = externalSetSearchQuery || setInternalSearchQuery;

  const [showNotification, setShowNotification] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);

  const [notificationList, setNotificationList] = useState<AppNotification[]>(() => {
    return getUserNotifications(user);
  });

  useEffect(() => {
    const refresh = () => setNotificationList(getUserNotifications(user));
    refresh();
    const handleStorage = (e: StorageEvent) => {
      if (!e.key || e.key.includes('notification') || e.key.includes('active_user')) {
        refresh();
      }
    };
    window.addEventListener('cinema_nova_notifications_updated', refresh);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('cinema_nova_notifications_updated', refresh);
      window.removeEventListener('storage', handleStorage);
    };
  }, [user?.id, user?.email]);

  // Закриття сповіщень при кліку за межами
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotification(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 w-full max-w-[393px] mx-auto md:max-w-none md:w-full cinema-header bg-black md:bg-transparent px-3 sm:px-4 md:pl-[var(--header-pl)] md:pr-[var(--header-pr)] flex items-center justify-between transition-all duration-300 ease-in-out select-none ${
        isHidden ? '-translate-y-full opacity-0 pointer-events-none' : 'translate-y-0 opacity-100'
      } h-[80px] md:h-[var(--header-height)] py-2 md:py-[var(--header-py)]`}
      style={{
        '--header-height': HEADER_CONFIG.height,
        '--header-py': HEADER_CONFIG.paddingY,
        gap: HEADER_CONFIG.betweenMainSectionsGap,
        '--header-pl': HEADER_CONFIG.paddingLeft,
        '--header-pr': HEADER_CONFIG.paddingRight,
      } as React.CSSProperties}
    >

      {/* Ліва секція: Логотип та поле пошуку */}
      <div
        className="flex items-center flex-1 max-w-4xl relative z-10 gap-2 sm:gap-3 md:gap-[var(--logo-search-gap)]"
        style={{
          '--logo-search-gap': HEADER_CONFIG.logoToSearchGap,
        } as React.CSSProperties}
      >
        {/* Кнопка мобільного меню та логотип бренду */}
        <div className="flex items-center gap-[15px] md:gap-3 shrink-0">
          <button
            onClick={onMobileMenuOpen}
            className="p-0 text-[#A3A3A3] hover:text-white md:hidden cursor-pointer flex items-center justify-center"
            aria-label="Меню"
          >
            <Menu className="w-[16px] h-[15px] md:w-5 md:h-5" />
          </button>

          {/* Фірмовий логотип CINEMA NOVA */}
          <div
            onClick={() => {
              setSearchQuery('');
              setActiveTab('home');
            }}
            className="flex items-center cursor-pointer select-none group relative shrink-0"
            title="CINEMA NOVA"
          >
            <img
              src="/logo/logo.png"
              alt="CINEMA NOVA Logo"
              className="w-[55px] h-[15px] sm:w-auto sm:h-[34px] md:h-[43px] max-w-[55px] sm:max-w-[130px] md:max-w-[148px] object-contain transition-transform duration-300 group-hover:scale-105"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = '/logo/logo.svg';
              }}
            />
          </div>
        </div>

        {/* Поле пошуку (для комп'ютерів згідно з Figma) */}
        <div
          ref={searchContainerRef}
          className="relative hidden md:flex flex-1 max-w-sm sm:max-w-md md:max-w-lg lg:max-w-2xl xl:max-w-3xl"
          style={{ maxWidth: HEADER_CONFIG.searchMaxWidth }}
        >
          <div
            className="relative flex items-center w-full"
            style={{ height: HEADER_CONFIG.searchHeight }}
          >
            <img
              src="/icons/Search.png"
              alt="Search"
              className="absolute left-[21px] top-1/2 -translate-y-1/2 w-[22px] h-[22px] md:w-[25px] md:h-[25px] object-contain opacity-70 pointer-events-none"
            />
            <input
              id="header-search-input"
              name="header-search-input"
              type="text"
              value={searchQuery}
              onFocus={() => {
                if (activeTab !== 'search') setActiveTab('search');
              }}
              onClick={() => {
                if (activeTab !== 'search') setActiveTab('search');
              }}
              onChange={(e) => {
                handleSearchChange(e.target.value);
                if (activeTab !== 'search') setActiveTab('search');
              }}
              placeholder={language === 'UA' ? 'Пошук фільмів, серіалів, аніме...' : 'Search movies, TV shows, anime...'}
              style={{ height: HEADER_CONFIG.searchHeight }}
              className="w-full py-[11px] pl-[54px] pr-[39px] text-xs md:text-sm text-[#FAFAFA] bg-[#121212] border border-[#FAFAFA] rounded-[16px] placeholder-[#9C9C9C] focus:outline-none focus:border-[#FAFAFA] focus:ring-1 focus:ring-[#FAFAFA]/50 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-[#A3A3A3] hover:text-white cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Права секція: Сповіщення, профіль та вибір мови */}
      <div
        className="flex items-center shrink-0 gap-[25px] md:gap-[var(--right-section-gap)]"
        style={{
          '--right-section-gap': HEADER_CONFIG.rightSectionGapDesktop,
        } as React.CSSProperties}
      >
        {/* Кнопка іконки мобільного пошуку */}
        <button
          onClick={() => {
            if (activeTab !== 'search') setActiveTab('search');
          }}
          className="p-0 text-zinc-400 hover:text-white md:hidden cursor-pointer flex items-center justify-center"
          title={language === 'UA' ? 'Пошук' : 'Search'}
        >
          <img src="/icons/Search.png" alt="Search" className="w-[15px] h-[15px] md:w-5 md:h-5 object-contain" />
        </button>

        {/* Кнопка та випадаюче меню сповіщень */}
        <div className="relative" ref={notificationRef}>
          <button
            onClick={() => setShowNotification(prev => !prev)}
            className={`relative p-0 md:p-2 rounded-full transition-colors cursor-pointer flex items-center justify-center ${
              showNotification ? 'text-white bg-[#1A1A1A]' : 'text-[#A3A3A3] hover:text-[#FAFAFA]'
            }`}
            title={t.notifications}
          >
            <img src="/icons/Notification_top.png" alt="Notifications" className="w-[15px] h-[16px] md:w-[31px] md:h-[34px] object-contain" />
            {notificationList.some(n => n.unread) && (
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-[#FF3040] rounded-full ring-2 ring-[#080808]" />
            )}
          </button>

          {showNotification && (
            <NotificationsDropdown
              user={user}
              language={language}
              notificationList={notificationList}
              setNotificationList={setNotificationList}
              onClose={() => setShowNotification(false)}
              setActiveTab={setActiveTab}
              onJoinWatchParty={onJoinWatchParty}
              onOpenAuth={onOpenAuth}
              onUpdateUser={onUpdateUser}
              allMovies={movies}
              onSelectMovie={onSelectMovie}
            />
          )}
        </div>

        {/* Кнопка профілю користувача (миттєве відкриття профілю) */}
        <div className="relative z-50">
          <button
            onMouseEnter={() => {
              if (user) {
                import('./ProfileView').catch(() => {});
              }
            }}
            onClick={() => {
              if (user) {
                setActiveTab('profile');
              } else {
                onOpenAuth();
              }
            }}
            className="flex items-center gap-2 md:gap-[15px] text-[#FAFAFA] hover:text-white focus:outline-none cursor-pointer group p-0 md:px-2 md:py-1 rounded-full hover:bg-white/10 transition-colors border border-transparent hover:border-white/10"
            title={user ? t.myCabinet : t.signIn}
          >
            {user ? (
              <img src={user.avatarUrl} alt={user.name} className="w-[17px] h-[17px] md:w-[45px] md:h-[45px] rounded-full object-cover border border-white/20 shadow-sm" />
            ) : (
              <div className="w-[17px] h-[17px] md:w-[45px] md:h-[45px] rounded-full bg-[#1A1A1A] border border-[#2A2A2A] flex items-center justify-center text-[#A3A3A3] group-hover:text-white group-hover:border-[#FF3040]/50 transition-colors">
                <User className="w-[10px] h-[10px] md:w-5 md:h-5" />
              </div>
            )}
            <span className="text-sm font-bold font-sans hidden sm:inline-block max-w-[120px] truncate">
              {user ? user.name : (language === 'UA' ? 'Користувач' : 'Account')}
            </span>
          </button>
        </div>

        {/* Глобальний перемикач мови UA / EN */}
        <div className="hidden md:flex items-center justify-between w-[78px] h-[41px] bg-transparent p-0 rounded-[10px] select-none relative">
          <button
            onClick={() => setLanguage('UA')}
            className={`w-[41px] h-[41px] flex items-center justify-center text-[12px] font-bold transition-all cursor-pointer ${
              language === 'UA'
                ? 'bg-[#FF3040] text-white rounded-[10px] shadow-sm z-10'
                : 'bg-transparent text-[#FAFAFA] hover:text-white'
            }`}
          >
            UK
          </button>
          <button
            onClick={() => setLanguage('ENG')}
            className={`w-[41px] h-[41px] flex items-center justify-center text-[12px] font-bold transition-all cursor-pointer ${
              language === 'ENG'
                ? 'bg-[#FF3040] text-white rounded-[10px] shadow-sm z-10'
                : 'bg-transparent text-[#FAFAFA] hover:text-white'
            }`}
          >
            EN
          </button>
        </div>

        {/* Кнопка виходу з акаунта */}
        <button
          type="button"
          onClick={onSignOut}
          className="hidden md:flex items-center justify-center p-0 bg-transparent border-none cursor-pointer transition-transform hover:scale-105 active:scale-95 shrink-0"
          title={language === 'UA' ? 'Вийти' : 'Sign out'}
          aria-label={language === 'UA' ? 'Вийти з облікового запису' : 'Sign out'}
        >
          <img
            src="/icons/Exit-Button.png"
            alt={language === 'UA' ? 'Вихід' : 'Exit'}
            className="w-[28px] h-[28px] object-contain select-none"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = '/icon/Exit-Button.png';
            }}
          />
        </button>
      </div>
    </header>
  );
}
