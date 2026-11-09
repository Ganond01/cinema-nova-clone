import React, { useState, useCallback, useMemo } from 'react';
import { 
  Home, Film, Tv, Sparkles, Flame, FolderHeart, 
  History, Users, ShieldAlert, Award, Grid, Settings
} from 'lucide-react';
import { UserProfile } from '../types';
import { useLanguage } from '../context/LanguageContext';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  user: UserProfile | null;
  onOpenAuth: () => void;
  isAdmin: boolean;
  setIsAdmin: (admin: boolean) => void;
  className?: string;
  onMobileClose?: () => void;
  isHeaderHidden?: boolean;
}

interface SidebarNavItemProps {
  id: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  iconSrc?: string;
  isActive: boolean;
  expanded: boolean;
  onClick: (id: string) => void;
}

const SidebarNavItem = React.memo(function SidebarNavItem({
  id,
  label,
  icon: Icon,
  iconSrc,
  isActive,
  expanded,
  onClick
}: SidebarNavItemProps) {
  return (
    <button
      onClick={() => onClick(id)}
      className={`sidebar-nav-tab h-[38px] md:h-[40px] xl:h-[44px] 2xl:h-[48px] ${isActive ? 'tab-active' : ''} ${expanded ? 'justify-start gap-3 md:gap-3.5' : 'justify-start'} pl-3 md:pl-[50px] relative group cursor-pointer`}
      title={!expanded ? label : undefined}
    >
      {/* Фонове підсвічування активного пункту навігації */}
      <span 
        className={`absolute inset-y-0 right-1.5 md:right-3 left-1.5 md:left-[44px] rounded-[6px] transition-all duration-200 pointer-events-none ${
          isActive
            ? 'opacity-100 sidebar-tab-active-bg'
            : 'opacity-0 group-hover:opacity-100 sidebar-tab-hover-bg'
        }`} 
      />

      {/* Контейнер іконки навігації */}
      <div className="relative z-10 w-[22px] h-[22px] md:w-[28px] md:h-[28px] flex items-center justify-center shrink-0">
        {iconSrc ? (
          <img 
            src={iconSrc} 
            alt={label} 
            className={`w-[20px] h-[20px] md:w-[28px] md:h-[28px] object-contain transition-all duration-150 group-hover:scale-110 group-active:scale-95 ${
              isActive ? 'brightness-125' : 'opacity-70 group-hover:opacity-100'
            }`} 
          />
        ) : Icon ? (
          <Icon className={`w-[20px] h-[20px] md:w-[24px] md:h-[24px] transition-all duration-150 group-hover:scale-110 group-active:scale-95 ${
            isActive ? 'text-white' : 'text-[#A3A3A3] group-hover:text-white'
          }`} />
        ) : null}
      </div>

      <span 
        className={`relative z-10 text-[13px] md:text-sm font-sans whitespace-nowrap overflow-hidden text-left transition-all duration-250 ease-out leading-tight ${
          isActive ? 'text-white font-semibold' : 'text-[#A3A3A3] group-hover:text-white font-medium'
        } ${
          expanded ? 'max-w-[200px] opacity-100' : 'max-w-0 opacity-0 pointer-events-none'
        }`}
      >
        {label}
      </span>

      {!expanded && (
        <div className="absolute left-full ml-4 px-2.5 py-1.5 bg-[#121212] text-[#FAFAFA] text-xs font-sans font-semibold rounded-lg shadow-2xl border border-[#2A2A2A] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none z-50">
          {label}
        </div>
      )}
    </button>
  );
});

interface AdminNavItemProps {
  isAdmin: boolean;
  activeTab: string;
  expanded: boolean;
  language: string;
  onClick: () => void;
}

const AdminNavItem = React.memo(function AdminNavItem({
  isAdmin,
  activeTab,
  expanded,
  language,
  onClick
}: AdminNavItemProps) {
  const isActive = isAdmin || activeTab === 'admin';
  const label = isAdmin 
    ? (language === 'UA' ? 'Вийти з Адмінки' : 'Exit Admin') 
    : (language === 'UA' ? 'Адмін-панель' : 'Admin Panel');

  return (
    <button
      onClick={onClick}
      className={`sidebar-nav-tab h-[38px] md:h-[40px] xl:h-[44px] 2xl:h-[48px] ${isActive ? 'tab-active' : ''} ${expanded ? 'justify-start gap-3 md:gap-3.5' : 'justify-start'} pl-3 md:pl-[50px] relative group cursor-pointer`}
      title={!expanded ? label : undefined}
    >
      {/* Фонове підсвічування активного пункту навігації */}
      <span 
        className={`absolute inset-y-0 right-1.5 md:right-3 left-1.5 md:left-[44px] rounded-[6px] transition-all duration-200 pointer-events-none ${
          isActive
            ? 'opacity-100 sidebar-tab-active-bg'
            : 'opacity-0 group-hover:opacity-100 sidebar-tab-hover-bg'
        }`} 
      />

      <div className="relative z-10 w-[22px] h-[22px] md:w-[28px] md:h-[28px] flex items-center justify-center shrink-0">
        <ShieldAlert className={`w-[20px] h-[20px] md:w-[24px] md:h-[24px] transition-all duration-150 group-hover:scale-110 group-active:scale-95 ${
          isActive ? 'text-white' : 'text-[#A3A3A3] group-hover:text-white'
        }`} />
      </div>

      <span 
        className={`relative z-10 text-[13px] md:text-sm font-sans whitespace-nowrap overflow-hidden text-left transition-all duration-250 ease-out leading-tight ${
          isActive ? 'text-white font-semibold' : 'text-[#A3A3A3] group-hover:text-white font-medium'
        } ${
          expanded ? 'max-w-[200px] opacity-100' : 'max-w-0 opacity-0 pointer-events-none'
        }`}
      >
        {label}
      </span>

      {!expanded && (
        <div className="absolute left-full ml-4 px-2.5 py-1.5 bg-[#121212] text-[#FAFAFA] text-xs font-sans font-semibold rounded-lg shadow-2xl border border-[#2A2A2A] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none z-50">
          {label}
        </div>
      )}
    </button>
  );
});

const Sidebar = React.memo(function Sidebar({ 
  activeTab, 
  setActiveTab, 
  user, 
  onOpenAuth, 
  isAdmin, 
  setIsAdmin,
  className = '',
  onMobileClose,
  isHeaderHidden = false
}: SidebarProps) {
  const { language } = useLanguage();
  const [isHovered, setIsHovered] = useState(false);
  
  const menuItems = useMemo(() => [
    { id: 'home', label: language === 'UA' ? 'Головна' : 'Home', icon: Home, iconSrc: '/icons/Home.png' },
    { id: 'movies', label: language === 'UA' ? 'Фільми' : 'Movies', icon: Film, iconSrc: '/icons/Film.png' },
    { id: 'series', label: language === 'UA' ? 'Серіали' : 'TV Series', icon: Tv, iconSrc: '/icons/Serial.png' },
    { id: 'doramas', label: language === 'UA' ? 'Дорами' : 'Doramas', icon: Sparkles, iconSrc: '/icons/Dorama.png' },
    { id: 'anime', label: language === 'UA' ? 'Аніме' : 'Anime', icon: Sparkles, iconSrc: '/icons/Anime.png' },
    { id: 'new', label: language === 'UA' ? 'Новинки' : 'New Releases', icon: Award, iconSrc: '/icons/Novinky.png' },
    { id: 'popular', label: language === 'UA' ? 'Популярні' : 'Popular', icon: Flame, iconSrc: '/icons/Popular.png' },
    { id: 'genres', label: language === 'UA' ? 'Жанри' : 'Genres', icon: Grid, iconSrc: '/icons/Genres.png' },
    { id: 'mylist', label: language === 'UA' ? 'Обране' : 'Favorites', icon: FolderHeart, iconSrc: '/icons/Like.png' },
    { id: 'history', label: language === 'UA' ? 'Історія' : 'Watch History', icon: History, iconSrc: '/icons/Watch History.png' },
    { id: 'watchparty', label: language === 'UA' ? 'Спільний перегляд' : 'Watch Party', icon: Users, iconSrc: '/icons/Shared Viewing.png' },
    { id: 'settings', label: language === 'UA' ? 'Налаштування' : 'Settings', icon: Settings, iconSrc: '/icons/Settings_top.png' },
  ], [language]);

  const handleNav = useCallback((tabId: string) => {
    if (tabId === 'settings') {
      if (!user) {
        onOpenAuth();
        return;
      }
    }
    setActiveTab(tabId);
    if (onMobileClose) {
      onMobileClose();
    }
  }, [user, onOpenAuth, setActiveTab, onMobileClose]);

  const handleAdminToggle = useCallback(() => {
    setIsAdmin(!isAdmin);
    handleNav(isAdmin ? 'home' : 'admin');
  }, [isAdmin, setIsAdmin, handleNav]);

  const handleMouseEnter = useCallback(() => setIsHovered(true), []);
  const handleMouseLeave = useCallback(() => setIsHovered(false), []);

  const isMobile = Boolean(onMobileClose);
  const expanded = isMobile || isHovered;

  const sidebarNode = (
    <aside 
      id="sidebar-container" 
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`group/sidebar py-1 md:py-0 flex flex-col justify-start h-full overflow-y-auto overflow-x-hidden no-scrollbar scrollbar-none transition-[width] duration-300 cubic-bezier(0.16, 1, 0.3, 1) will-change-[width] transform-gpu select-none backdrop-blur-md border-none pointer-events-auto ${
        isMobile
          ? 'w-full pl-2 pr-1 bg-[#121212]/95 h-full'
          : `fixed left-0 top-0 bottom-0 z-30 ${
              expanded 
                ? 'w-[290px] pl-0 pr-0' 
                : 'w-[124px] pl-0 pr-0'
            }`
      }`}
      style={!isMobile ? {
        background: 'linear-gradient(to right, rgba(18, 18, 18, 0.98) 0%, rgba(18, 18, 18, 0.95) 80%, rgba(18, 18, 18, 0.6) 91%, transparent 100%)',
        border: 'none',
        borderRight: 'none',
      } : undefined}
    >
      {/* Відступ бічної панелі під шапкою сайту */}
      <div 
        className={`flex flex-col w-full space-y-1 md:space-y-1.5 transition-all duration-300 ease-in-out pb-8 md:pb-[141px] ${
          isMobile 
            ? 'pt-1 pb-4' 
            : isHeaderHidden 
              ? 'pt-1 md:pt-[24px]' 
              : 'pt-1 md:pt-[141px]'
        }`}
      >
        {/* Верхня панель мобільного меню */}
        {onMobileClose && (
          <div className="flex items-center px-3 h-14 shrink-0 mb-2">
            <div 
              onClick={() => {
                setActiveTab('home');
                onMobileClose();
              }}
              className="flex items-center cursor-pointer select-none group"
            >
              <img
                src="/logo/logo.png"
                alt="CINEMA NOVA Logo"
                className="h-[28px] sm:h-[32px] w-auto max-w-[125px] object-contain"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = '/logo/logo.svg';
                }}
              />
            </div>
          </div>
        )}

        {/* Основні кнопки навігації сайту */}
        <nav className="flex flex-col gap-[20px] w-full">
          {menuItems.map((item) => (
            <SidebarNavItem
              key={item.id}
              id={item.id}
              label={item.label}
              icon={item.icon}
              iconSrc={item.iconSrc}
              isActive={
                activeTab === item.id ||
                (item.id === 'movies' && activeTab === 'popular-movies') ||
                (item.id === 'series' && activeTab === 'popular-series') ||
                (item.id === 'anime' && activeTab === 'popular-anime') ||
                (item.id === 'doramas' && activeTab === 'popular-doramas')
              }
              expanded={expanded}
              onClick={handleNav}
            />
          ))}

          {/* Кнопка переходу в адмін-панель (для адміністратора) */}
          {user?.role === 'admin' && (
            <AdminNavItem
              isAdmin={isAdmin}
              activeTab={activeTab}
              expanded={expanded}
              language={language}
              onClick={handleAdminToggle}
            />
          )}
        </nav>
      </div>


    </aside>
  );

  if (!isMobile) {
    return (
      <div className={`fixed left-0 top-0 bottom-0 z-30 pointer-events-none ${className}`}>
        {sidebarNode}
      </div>
    );
  }

  return sidebarNode;
});

export default Sidebar;
