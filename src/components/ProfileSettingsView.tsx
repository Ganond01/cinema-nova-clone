import React, { useState, useEffect } from 'react';
import { 
  Download, Lock, Trash2, Check, ArrowLeft, ChevronRight, Upload, 
  ChevronDown, X, Globe, User, Mail, Calendar, Shield, Sparkles, Pencil
} from 'lucide-react';
import { UserProfile } from '../types';
import { GENRES, loadState, saveState, PRESET_AVATARS } from '../data/movies';
import { useLanguage } from '../context/LanguageContext';
import { addProfileUpdateNotification } from '../services/notifications';

interface ProfileSettingsViewProps {
  user: UserProfile;
  onUpdateUser: (updatedUser: UserProfile) => void;
  onBackToProfile: () => void;
  onOpenGenreSelection?: () => void;
  onRequestChangePassword?: () => void;
  onDeleteProfile?: () => void;
}

export default function ProfileSettingsView({
  user,
  onUpdateUser,
  onBackToProfile,
  onOpenGenreSelection,
  onRequestChangePassword,
  onDeleteProfile
}: ProfileSettingsViewProps) {
  const { language, setLanguage } = useLanguage();

  // Стани форми
  const [name, setName] = useState(user.name || 'Інесса Ліс');
  const [email, setEmail] = useState(user.email || 'individyallis@gmail.com');
  const [birthDate, setBirthDate] = useState(user.birthDate || '23.07.1999');
  
  // Стан статі
  const [gender, setGender] = useState<'Жіноча' | 'Чоловіча' | 'Не вказувати' | 'Жіночий' | 'Чоловічий'>(
    (user.gender as any) || 'Жіноча'
  );

  const [location, setLocation] = useState(user.location || 'Львів, Україна');
  const [aboutMe, setAboutMe] = useState(
    user.aboutMe !== undefined && user.aboutMe !== null
      ? user.aboutMe
      : 'Якщо не відповідаю — швидше за все, дивлюся ще один сезон або знайшла новий фільм, який вартий уваги.'
  );

  const [handle, setHandle] = useState(user.handle || '@InnLi');

  const [favoriteGenres, setFavoriteGenres] = useState<string[]>(
    user.favoriteGenres && user.favoriteGenres.length > 0
      ? user.favoriteGenres
      : ['Трилер', 'Фентезі', 'Жахи']
  );

  const [avatarUrl, setAvatarUrl] = useState(
    user.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=400&auto=format&fit=crop'
  );

  // Модальне вікно вибору жанрів та збереження
  const [isGenreModalOpen, setIsGenreModalOpen] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  // Безпека та прив'язані облікові записи
  const [googleConnected, setGoogleConnected] = useState(
    (user as any).googleConnected !== undefined ? (user as any).googleConnected : true
  );
  const [facebookConnected, setFacebookConnected] = useState(
    (user as any).facebookConnected !== undefined ? (user as any).facebookConnected : false
  );
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Динамічна статистика зі збереженого списку та історії
  const savedFavs = loadState<string[]>(`user_favs_${user.id}`, user.favorites || []);
  const savedCount = savedFavs.length > 0 ? savedFavs.length : 23;
  const historyItems = loadState<any[]>(`user_history_${user.id}`, user.watchHistory || []);
  const watchedCount = historyItems.length > 0 ? historyItems.length : 58;
  const userRatings = loadState<Record<string, number>>(`user_ratings_${user.id}`, {});
  const ratingValues = Object.values(userRatings);
  const calculatedAvgRating = ratingValues.length > 0 
    ? (ratingValues.reduce((a, b) => a + b, 0) / ratingValues.length).toFixed(1)
    : '6.4';

  // Синхронізація стану з пропом user
  useEffect(() => {
    if (user.name !== undefined) setName(user.name);
    if (user.email !== undefined) setEmail(user.email);
    if (user.handle !== undefined) setHandle(user.handle);
    if (user.birthDate !== undefined) setBirthDate(user.birthDate);
    if (user.gender !== undefined) setGender(user.gender as any);
    if (user.location !== undefined) setLocation(user.location);
    if (user.aboutMe !== undefined) setAboutMe(user.aboutMe);
    if (user.avatarUrl !== undefined) setAvatarUrl(user.avatarUrl);
    if (user.favoriteGenres !== undefined && user.favoriteGenres.length > 0) {
      setFavoriteGenres(user.favoriteGenres);
    }
    if ((user as any).googleConnected !== undefined) setGoogleConnected((user as any).googleConnected);
    if ((user as any).facebookConnected !== undefined) setFacebookConnected((user as any).facebookConnected);
  }, [user]);

  // Завантаження аватара
  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert(language === 'UA' ? "Файл занадто великий (макс 5MB)." : "File is too large (max 5MB).");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setAvatarUrl(base64);
        const updated: UserProfile = {
          ...user,
          name,
          email,
          avatarUrl: base64,
          favoriteGenres,
          handle,
          birthDate,
          gender,
          location,
          aboutMe,
          googleConnected,
          facebookConnected,
        };
        if (email) {
          try {
            localStorage.setItem(`user_avatar_${email.trim().toLowerCase()}`, base64);
            if (user.id) localStorage.setItem(`user_avatar_${user.id}`, base64);
          } catch (err) {
            console.error('Error saving avatar:', err);
          }
        }
        onUpdateUser(updated);
        try {
          addProfileUpdateNotification(user.id);
        } catch (err) {
          console.warn('Profile notification error:', err);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = (customPassword?: string) => {
    const updated: UserProfile = {
      ...user,
      name,
      email,
      avatarUrl,
      favoriteGenres,
      handle,
      birthDate,
      gender,
      location,
      aboutMe,
      googleConnected,
      facebookConnected,
      password: customPassword || user.password,
    };

    const normEmail = (email || '').trim().toLowerCase();
    try {
      if (normEmail) {
        localStorage.setItem(`user_avatar_${normEmail}`, avatarUrl);
        localStorage.setItem(`user_name_${normEmail}`, name);
        localStorage.setItem(`user_gender_${normEmail}`, gender);
        localStorage.setItem(`user_birthDate_${normEmail}`, birthDate);
        localStorage.setItem(`user_handle_${normEmail}`, handle);
        localStorage.setItem(`user_location_${normEmail}`, location);
        localStorage.setItem(`user_aboutMe_${normEmail}`, aboutMe);
        localStorage.setItem(`user_genres_${normEmail}`, JSON.stringify(favoriteGenres));
        localStorage.setItem(`user_google_${normEmail}`, String(googleConnected));
        localStorage.setItem(`user_facebook_${normEmail}`, String(facebookConnected));
      }
      if (user.id) {
        localStorage.setItem(`user_avatar_${user.id}`, avatarUrl);
        localStorage.setItem(`user_name_${user.id}`, name);
        localStorage.setItem(`user_gender_${user.id}`, gender);
        localStorage.setItem(`user_birthDate_${user.id}`, birthDate);
        localStorage.setItem(`user_handle_${user.id}`, handle);
        localStorage.setItem(`user_location_${user.id}`, location);
        localStorage.setItem(`user_aboutMe_${user.id}`, aboutMe);
        localStorage.setItem(`user_genres_${user.id}`, JSON.stringify(favoriteGenres));
        localStorage.setItem(`user_google_${user.id}`, String(googleConnected));
        localStorage.setItem(`user_facebook_${user.id}`, String(facebookConnected));
      }
    } catch (err) {
      console.error('Error saving profile data to localStorage:', err);
    }

    onUpdateUser(updated);
    try {
      addProfileUpdateNotification(user.id);
    } catch (err) {
      console.warn('Profile notification error:', err);
    }
    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
      onBackToProfile();
    }, 400);
  };

  const toggleGenre = (genre: string) => {
    let updated: string[];
    if (favoriteGenres.includes(genre)) {
      updated = favoriteGenres.filter(g => g !== genre);
    } else {
      updated = [...favoriteGenres, genre];
    }
    setFavoriteGenres(updated);
    const updatedUser: UserProfile = {
      ...user,
      name,
      email,
      avatarUrl,
      favoriteGenres: updated,
      handle,
      birthDate,
      gender,
      location,
      aboutMe,
      googleConnected,
      facebookConnected,
    };
    onUpdateUser(updatedUser);
  };

  const handleDownloadData = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(user, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `cinema_nova_user_${user.id || 'profile'}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <>
      {/* ========================================================================= */}
      {/* ДЕКСТОПНА ВЕРСІЯ (hidden md:block) - БЕЗ ЗМІНИ МОВИ                      */}
      {/* ========================================================================= */}
      <div className="hidden md:block space-y-8 font-sans pb-16 max-w-6xl mx-auto">
        {/* Top Header Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#1F1F24] pb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Налаштування профілю
            </h1>
            <p className="text-sm text-zinc-400 mt-1">
              Керуйте своєю особистою інформацією та налаштуваннями.
            </p>
          </div>

          {/* Top Save Button with cinema-glow-btn style & glow animation from Edit Profile, but no background */}
          <button
            onClick={() => handleSave()}
            className="cinema-glow-btn no-bg px-6 py-2.5 sm:px-7 sm:py-2.5 text-white font-medium text-xs sm:text-sm tracking-wide flex items-center gap-2 self-end sm:self-center cursor-pointer"
          >
            {isSaved ? <Check className="w-4 h-4 text-emerald-400 relative z-10" /> : null}
            <span className="relative z-10 font-sans">{isSaved ? 'Збережено' : 'Зберегти'}</span>
          </button>
        </div>

        {/* 1. Фото профілю */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-white tracking-tight">
            Фото профілю
          </h2>

          <div className="flex items-center gap-6">
            {/* Avatar Preview */}
            <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-full overflow-hidden border border-white/20 shadow-2xl shrink-0 bg-zinc-900">
              <img 
                src={avatarUrl} 
                alt={name}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>

            <div className="space-y-2">
              <label className="cinema-glow-btn no-bg px-6 py-2.5 sm:px-7 sm:py-2.5 text-white font-medium text-xs sm:text-sm tracking-wide flex items-center gap-2 cursor-pointer active:scale-95">
                <span className="relative z-10 font-sans">Завантажити</span>
                <img src="/icons/Downloads.png" alt="" className="w-4 h-4 object-contain relative z-10" />
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleAvatarUpload} 
                  className="hidden" 
                />
              </label>
              <p className="text-xs text-zinc-500 font-mono">
                JPG, PNG. Max size 5MB
              </p>
            </div>
          </div>
        </div>

        {/* 2. Form Grid (Matching screenshot 1:1) */}
        <div className="space-y-5 max-w-4xl">
          {/* Row 1: ПІБ | Email */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-2">
              <label className="text-[#FAFAFA] text-sm font-medium block">ПІБ</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-transparent border border-[#FAFAFA] focus:border-[#FAFAFA] focus:ring-1 focus:ring-[#FAFAFA] rounded-[14px] px-4 py-3 text-[#FAFAFA] placeholder:text-[#FAFAFA]/40 text-sm outline-none transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[#FAFAFA] text-sm font-medium block">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-transparent border border-[#FAFAFA] focus:border-[#FAFAFA] focus:ring-1 focus:ring-[#FAFAFA] rounded-[14px] px-4 py-3 text-[#FAFAFA] placeholder:text-[#FAFAFA]/40 text-sm outline-none transition-all"
              />
            </div>
          </div>

          {/* Row 2: День народження | Стать */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-2">
              <label className="text-[#FAFAFA] text-sm font-medium block">День народження</label>
              <input
                type="text"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                className="w-full bg-transparent border border-[#FAFAFA] focus:border-[#FAFAFA] focus:ring-1 focus:ring-[#FAFAFA] rounded-[14px] px-4 py-3 text-[#FAFAFA] placeholder:text-[#FAFAFA]/40 text-sm outline-none transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[#FAFAFA] text-sm font-medium block">Стать</label>
              <div className="relative">
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value as any)}
                  className="w-full bg-transparent border border-[#FAFAFA] focus:border-[#FAFAFA] focus:ring-1 focus:ring-[#FAFAFA] rounded-[14px] px-4 py-3 text-[#FAFAFA] text-sm outline-none transition-all appearance-none cursor-pointer pr-10"
                >
                  <option value="Жіноча" className="bg-[#0B0B0D] text-[#FAFAFA]">Жіноча</option>
                  <option value="Чоловіча" className="bg-[#0B0B0D] text-[#FAFAFA]">Чоловіча</option>
                  <option value="Не вказувати" className="bg-[#0B0B0D] text-[#FAFAFA]">Не вказувати</option>
                </select>
                <ChevronDown className="w-4 h-4 text-zinc-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Row 3: Локація | Нікнейм (@юзернейм) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-2">
              <label className="text-[#FAFAFA] text-sm font-medium block">Локація</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full bg-transparent border border-[#FAFAFA] focus:border-[#FAFAFA] focus:ring-1 focus:ring-[#FAFAFA] rounded-[14px] px-4 py-3 text-[#FAFAFA] placeholder:text-[#FAFAFA]/40 text-sm outline-none transition-all"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[#FAFAFA] text-sm font-medium block">Юзернейм (@нік)</label>
                <span className="text-[11px] text-white font-mono">Приклад: @InnLi</span>
              </div>
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={handle}
                  onChange={(e) => {
                    let val = e.target.value;
                    if (!val.startsWith('@')) val = '@' + val.replace(/^@+/, '');
                    setHandle(val);
                  }}
                  placeholder="@InnLi"
                  className="w-full bg-transparent border border-[#FAFAFA] focus:border-[#FAFAFA] focus:ring-1 focus:ring-[#FAFAFA] rounded-[14px] pl-4 pr-28 py-3 text-[#FAFAFA] placeholder:text-[#FAFAFA]/40 text-sm font-mono outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => {
                    handleSave();
                  }}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 bg-transparent hover:bg-transparent text-[#FAFAFA] hover:text-white transition cursor-pointer text-xs font-semibold flex items-center gap-1.5 border-0 p-0 select-none group"
                  title="Змінити нік"
                >
                  <Pencil className="w-3.5 h-3.5 text-[#FAFAFA] group-hover:scale-110 transition-transform" />
                  <span className="group-hover:underline group-active:underline underline-offset-4 decoration-1 decoration-[#FAFAFA]">Змінити</span>
                </button>
              </div>
            </div>
          </div>

          {/* Row 4: Про мене */}
          <div className="space-y-1.5">
            <label className="text-[#FAFAFA] text-sm font-medium block">Про мене</label>
            <div>
              <textarea
                rows={3}
                maxLength={100}
                value={aboutMe}
                onChange={(e) => setAboutMe(e.target.value)}
                className="w-full bg-transparent border border-[#FAFAFA] focus:border-[#FAFAFA] focus:ring-1 focus:ring-[#FAFAFA] rounded-[14px] px-4 py-3 text-[#FAFAFA] placeholder:text-[#FAFAFA]/40 text-sm outline-none transition-all resize-none block"
              />
              <div className="text-right text-[11px] text-white font-mono mt-1.5 select-none pr-1">
                {aboutMe.length}/100
              </div>
            </div>
          </div>
        </div>

        {/* 3. Улюблені жанри */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-white tracking-tight">
              Улюблені жанри
            </h2>
            <button 
              type="button"
              onClick={() => {
                if (onOpenGenreSelection) {
                  onOpenGenreSelection();
                } else {
                  setIsGenreModalOpen(!isGenreModalOpen);
                }
              }}
              className="text-xs text-zinc-400 hover:text-white transition flex items-center gap-1 cursor-pointer font-medium"
            >
              <span>Змінити</span>
              <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />
            </button>
          </div>

          {favoriteGenres.length === 0 ? (
            <p className="text-zinc-400 text-sm">
              {language === 'UA' ? 'Оберіть ваш улюблений жанр' : 'Choose your favorite genre'}
            </p>
          ) : (
            <div className="flex flex-wrap gap-3">
              {favoriteGenres.map((genre) => (
                <div 
                  key={genre}
                  className="px-6 py-2 rounded-full border border-[#FAFAFA] bg-transparent text-[#FAFAFA] text-sm font-medium hover:bg-white/5 transition-colors cursor-pointer"
                >
                  {genre}
                </div>
              ))}
            </div>
          )}

          {/* Genre Selection Toggle Box if Change clicked */}
          {isGenreModalOpen && (
            <div className="p-4 bg-[#121216] border border-[#26262E] rounded-2xl max-w-2xl space-y-3 animate-in fade-in duration-200">
              <p className="text-xs text-zinc-400">Оберіть ваші улюблені жанри:</p>
              <div className="flex flex-wrap gap-2">
                {GENRES.filter(g => g !== 'Всі').map((genre) => {
                  const isSelected = favoriteGenres.includes(genre);
                  return (
                    <button
                      key={genre}
                      onClick={() => toggleGenre(genre)}
                      className={`px-3 py-1.5 rounded-full text-xs transition cursor-pointer border ${
                        isSelected 
                          ? 'bg-[#FF3040] text-white border-[#FF3040]' 
                          : 'bg-[#18181E] text-zinc-300 border-[#2A2A34] hover:text-white'
                      }`}
                    >
                      {genre}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* 4. Bottom Section: 2 Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-4">
          {/* Left Column: Перегляд профілю Card (Narrowed in width) */}
          <div className="lg:col-span-5 space-y-4 max-w-[340px]">
            <h2 className="text-lg font-bold text-white tracking-tight">
              Перегляд профілю
            </h2>

            <div className="relative rounded-[20px] overflow-hidden bg-[#0A0A0C] border border-[#1E1E24] p-6 sm:p-7 text-center space-y-4 shadow-2xl">
              {/* Red gothic scenery top overlay backdrop matching screenshot 2 */}
              <div 
                className="absolute top-0 inset-x-0 h-40 bg-cover bg-center opacity-80 pointer-events-none mix-blend-screen"
                style={{
                  backgroundImage: `url('/backgrounds/profilebackground.png'), url('/backgrounds/profile_banner.svg')`,
                  maskImage: 'linear-gradient(to bottom, black 0%, transparent 100%)',
                  WebkitMaskImage: 'linear-gradient(to bottom, black 0%, transparent 100%)'
                }}
              />

              <div className="relative z-10 flex flex-col items-center">
                {/* Avatar Circle with Red Blurred Backdrop */}
                <div className="relative mb-3 group">
                  <div className="absolute inset-0 rounded-full bg-[#FF3040] blur-xl opacity-80 scale-135 animate-pulse pointer-events-none" />
                  <div className="relative w-24 h-24 sm:w-26 sm:h-26 rounded-full overflow-hidden border-2 border-white/30 shadow-2xl shrink-0 bg-zinc-900">
                    <img 
                      src={avatarUrl} 
                      alt={name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>

                {/* Name & Handles */}
                <h3 className="text-xl font-bold text-white tracking-tight">{name}</h3>
                <p className="text-xs text-zinc-300 font-mono font-medium mt-1">{handle}</p>
                <p className="text-xs text-zinc-500 font-mono mt-0.5">{birthDate}</p>

                {/* Stats Row */}
                <div className="flex items-center justify-center gap-4 sm:gap-5 pt-4 w-full">
                  <div>
                    <span className="block text-base font-bold text-white font-mono">{savedCount}</span>
                    <span className="text-[10px] text-zinc-400">Збережених</span>
                  </div>
                  <div>
                    <span className="block text-base font-bold text-white font-mono">12</span>
                    <span className="text-[10px] text-zinc-400">Watch Party</span>
                  </div>
                  <div>
                    <span className="block text-base font-bold text-white font-mono">{watchedCount}</span>
                    <span className="text-[10px] text-zinc-400">Переглянуто</span>
                  </div>
                  <div>
                    <span className="block text-base font-bold text-[#FF3040] font-mono">{calculatedAvgRating}</span>
                    <span className="text-[10px] text-zinc-400">Рейтинг</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Безпека & Приєднані акаунти */}
          <div className="lg:col-span-7 space-y-8">
            {/* Безпека */}
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-white tracking-tight">
                Безпека
              </h2>

              <div className="space-y-3.5 text-sm">
                {/* Змінити пароль */}
                <button
                  type="button"
                  onClick={() => {
                    if (onRequestChangePassword) {
                      onRequestChangePassword();
                    }
                  }}
                  className="flex items-center gap-2 text-zinc-200 hover:text-white transition cursor-pointer"
                >
                  <Lock className="w-4 h-4 text-zinc-400" />
                  <span>
                    {language === 'UA' ? 'Змінити пароль' : 'Change password'}
                  </span>
                  <ChevronRight className="w-4 h-4 text-zinc-400" />
                </button>

                {/* Завантажити свої дані */}
                <button
                  type="button"
                  onClick={handleDownloadData}
                  className="flex items-center gap-2 text-zinc-200 hover:text-white transition cursor-pointer"
                >
                  <Download className="w-4 h-4 text-zinc-400" />
                  <span>Завантажити свої дані</span>
                  <ChevronRight className="w-4 h-4 text-zinc-400" />
                </button>

                {/* Видалити профіль */}
                <button
                  type="button"
                  onClick={() => setIsDeleteModalOpen(true)}
                  className="flex items-center gap-2 text-[#FF3040] hover:text-red-400 transition cursor-pointer font-medium"
                >
                  <Trash2 className="w-4 h-4 text-[#FF3040]" />
                  <span>{language === 'UA' ? 'Видалити профіль' : 'Delete profile'}</span>
                  <ChevronRight className="w-4 h-4 text-[#FF3040]" />
                </button>
              </div>
            </div>

            {/* Приєднані акаунти (No border, official icons) */}
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-white tracking-tight">
                Приєднані акаунти
              </h2>

              <div className="space-y-3 max-w-md">
                {/* Google - Without background */}
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#0B0B0D] hover:bg-[#121216] transition">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 flex items-center justify-center shrink-0">
                      <img src="/icon/google.png" alt="Google" className="w-full h-full object-contain" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[#FAFAFA] text-sm font-medium">Google</span>
                      <span className="text-[11px] text-zinc-400 font-mono">
                        {googleConnected ? (email || 'dilleronhcek2000@gmail.com') : 'Не приєднано'}
                      </span>
                    </div>
                  </div>

                  <button 
                    type="button"
                    onClick={() => {
                      const newState = !googleConnected;
                      setGoogleConnected(newState);
                      const updatedUser: UserProfile = {
                        ...user,
                        name,
                        email,
                        avatarUrl,
                        favoriteGenres,
                        handle,
                        birthDate,
                        gender,
                        location,
                        aboutMe,
                        googleConnected: newState,
                        facebookConnected,
                      };
                      onUpdateUser(updatedUser);
                      if (user.id) localStorage.setItem(`user_google_${user.id}`, String(newState));
                      if (email) localStorage.setItem(`user_google_${email.trim().toLowerCase()}`, String(newState));
                    }}
                    className="group flex items-center gap-1.5 bg-transparent hover:bg-transparent p-0 border-0 text-xs font-semibold transition cursor-pointer select-none"
                  >
                    <span className={`transition-colors group-hover:underline group-active:underline underline-offset-4 decoration-1 ${
                      googleConnected 
                        ? 'text-white decoration-white' 
                        : 'text-[#F22E3D] decoration-[#F22E3D]'
                    }`}>
                      {googleConnected ? 'Приєднано' : 'Не приєднано'}
                    </span>
                    <ChevronRight className={`w-3.5 h-3.5 shrink-0 group-hover:translate-x-0.5 transition-transform ${
                      googleConnected ? 'text-white' : 'text-[#F22E3D]'
                    }`} />
                  </button>
                </div>

                {/* Facebook - Strictly from /icon/Facebook.png, without background */}
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#0B0B0D] hover:bg-[#121216] transition">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 flex items-center justify-center shrink-0">
                      <img src="/icon/Facebook.png" alt="Facebook" className="w-full h-full object-contain" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[#FAFAFA] text-sm font-medium">Facebook</span>
                      <span className="text-[11px] text-zinc-400 font-mono">
                        {facebookConnected ? (name || 'Inessa Lis') : 'Не приєднано'}
                      </span>
                    </div>
                  </div>

                  <button 
                    type="button"
                    onClick={() => {
                      const newState = !facebookConnected;
                      setFacebookConnected(newState);
                      const updatedUser: UserProfile = {
                        ...user,
                        name,
                        email,
                        avatarUrl,
                        favoriteGenres,
                        handle,
                        birthDate,
                        gender,
                        location,
                        aboutMe,
                        googleConnected,
                        facebookConnected: newState,
                      };
                      onUpdateUser(updatedUser);
                      if (user.id) localStorage.setItem(`user_facebook_${user.id}`, String(newState));
                      if (email) localStorage.setItem(`user_facebook_${email.trim().toLowerCase()}`, String(newState));
                    }}
                    className="group flex items-center gap-1.5 bg-transparent hover:bg-transparent p-0 border-0 text-xs font-semibold transition cursor-pointer select-none"
                  >
                    <span className={`transition-colors group-hover:underline group-active:underline underline-offset-4 decoration-1 ${
                      facebookConnected 
                        ? 'text-white decoration-white' 
                        : 'text-[#F22E3D] decoration-[#F22E3D]'
                    }`}>
                      {facebookConnected ? 'Приєднано' : 'Не приєднано'}
                    </span>
                    <ChevronRight className={`w-3.5 h-3.5 shrink-0 group-hover:translate-x-0.5 transition-transform ${
                      facebookConnected ? 'text-white' : 'text-[#F22E3D]'
                    }`} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* МОБІЛЬНА ВЕРСІЯ (block md:hidden) - ЗІ ЗМІНОЮ МОВИ                        */}
      {/* ========================================================================= */}
      <div className="block md:hidden font-sans pb-16 max-w-xl mx-auto space-y-6 text-white px-2 sm:px-0">
        {/* 1. Шапка сайту with Заголовок & Capsule Збереження Кнопка */}
        <div className="flex items-start justify-between gap-4 pt-2">
          <div className="space-y-1">
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              {language === 'UA' ? 'Налаштування профілю' : 'Profile Settings'}
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400">
              {language === 'UA' 
                ? 'Керуйте своєю особистою інформацією та налаштуваннями.'
                : 'Manage your personal info and settings.'}
            </p>
          </div>

          {/* Top Збереження Кнопка with cinema-glow-btn style & glow animation */}
          <button
            onClick={() => handleSave()}
            className="cinema-glow-btn no-bg px-6 py-2.5 sm:px-7 sm:py-2.5 text-white font-medium text-xs sm:text-sm tracking-wide flex items-center gap-2 self-end sm:self-center cursor-pointer"
          >
            {isSaved ? <Check className="w-4 h-4 text-emerald-400 relative z-10" /> : null}
            <span className="relative z-10 font-sans">{isSaved ? (language === 'UA' ? 'Збережено' : 'Saved') : (language === 'UA' ? 'Зберегти' : 'Save')}</span>
          </button>
        </div>

        {/* 2. Фото профілю */}
        <div className="space-y-3 pt-2">
          <h2 className="text-sm sm:text-base font-medium text-white tracking-tight">
            {language === 'UA' ? 'Фото профілю' : 'Profile Picture'}
          </h2>

          <div className="flex items-center gap-4">
            {/* Avatar Preview */}
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden border border-white/20 shrink-0 bg-zinc-900">
              <img 
                src={avatarUrl} 
                alt={name}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>

            <div className="space-y-2">
              <label className="cinema-glow-btn no-bg px-6 py-2.5 sm:px-7 sm:py-2.5 text-white font-medium text-xs sm:text-sm tracking-wide flex items-center gap-2 cursor-pointer active:scale-95">
                <span className="relative z-10 font-sans">{language === 'UA' ? 'Завантажити' : 'Upload'}</span>
                <img src="/icons/Downloads.png" alt="" className="w-4 h-4 object-contain relative z-10" onError={(e)=>{(e.currentTarget as HTMLImageElement).src='/icon/Downloads.png'}} />
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleAvatarUpload} 
                  className="hidden" 
                />
              </label>
              <p className="text-xs text-zinc-500 font-mono">
                JPG, PNG. Max size 5MB
              </p>
            </div>
          </div>
        </div>

        {/* 3. Form Поля введення Stack (1:1 with Screenshot) */}
        <div className="space-y-4 pt-1">
          {/* ПІБ */}
          <div className="space-y-1.5">
            <label className="text-white text-xs sm:text-sm font-medium block">
              {language === 'UA' ? 'ПІБ' : 'Full Name'}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-transparent border border-white focus:border-white rounded-[12px] px-3.5 py-2.5 text-white text-sm outline-none transition"
            />
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <label className="text-white text-xs sm:text-sm font-medium block">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-transparent border border-white focus:border-white rounded-[12px] px-3.5 py-2.5 text-white text-sm outline-none transition"
            />
          </div>

          {/* День народження */}
          <div className="space-y-1.5">
            <label className="text-white text-xs sm:text-sm font-medium block">
              {language === 'UA' ? 'День народження' : 'Date of Birth'}
            </label>
            <input
              type="text"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              className="w-full bg-transparent border border-white focus:border-white rounded-[12px] px-3.5 py-2.5 text-white text-sm outline-none transition"
            />
          </div>

          {/* Гендер */}
          <div className="space-y-1.5">
            <label className="text-white text-xs sm:text-sm font-medium block">
              {language === 'UA' ? 'Гендер' : 'Gender'}
            </label>
            <div className="relative">
              <select
                value={gender === 'Жіноча' ? 'Жіночий' : gender === 'Чоловіча' ? 'Чоловічий' : gender}
                onChange={(e) => setGender(e.target.value as any)}
                className="w-full bg-transparent border border-white focus:border-white rounded-[12px] px-3.5 py-2.5 text-white text-sm outline-none transition appearance-none cursor-pointer pr-10"
              >
                <option value="Жіночий" className="bg-[#0B0B0D] text-white">{language === 'UA' ? 'Жіночий' : 'Female'}</option>
                <option value="Чоловічий" className="bg-[#0B0B0D] text-white">{language === 'UA' ? 'Чоловічий' : 'Male'}</option>
                <option value="Не вказувати" className="bg-[#0B0B0D] text-white">{language === 'UA' ? 'Не вказувати' : 'Prefer not to say'}</option>
              </select>
              <ChevronDown className="w-4 h-4 text-zinc-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Локація */}
          <div className="space-y-1.5">
            <label className="text-white text-xs sm:text-sm font-medium block">
              {language === 'UA' ? 'Локація' : 'Location'}
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full bg-transparent border border-white focus:border-white rounded-[12px] px-3.5 py-2.5 text-white text-sm outline-none transition"
            />
          </div>

          {/* Username */}
          <div className="space-y-1.5">
            <label className="text-white text-xs sm:text-sm font-medium block">
              Username
            </label>
            <input
              type="text"
              value={handle}
              onChange={(e) => {
                let val = e.target.value;
                if (!val.startsWith('@')) val = '@' + val.replace(/^@+/, '');
                setHandle(val);
              }}
              placeholder="@InLi"
              className="w-full bg-transparent border border-white focus:border-white rounded-[12px] px-3.5 py-2.5 text-white text-sm font-mono outline-none transition"
            />
          </div>

          {/* Про мене */}
          <div className="space-y-1.5">
            <label className="text-white text-xs sm:text-sm font-medium block">
              {language === 'UA' ? 'Про мене' : 'About Me'}
            </label>
            <div>
              <textarea
                rows={3}
                maxLength={100}
                value={aboutMe}
                onChange={(e) => setAboutMe(e.target.value)}
                className="w-full bg-transparent border border-white focus:border-white rounded-[12px] px-3.5 py-2.5 text-white text-sm outline-none transition resize-none block leading-relaxed"
              />
              <div className="text-right text-[11px] text-zinc-400 font-mono mt-1 select-none pr-1">
                {aboutMe.length}/100
              </div>
            </div>
          </div>
        </div>

        {/* 4. Улюблені жанри */}
        <div className="space-y-2.5 pt-1">
          <div className="flex items-center justify-between">
            <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">
              {language === 'UA' ? 'Улюблені жанри' : 'Favorite Genres'}
            </h2>
            <button 
              type="button"
              onClick={() => {
                if (onOpenGenreSelection) {
                  onOpenGenreSelection();
                } else {
                  setIsGenreModalOpen(!isGenreModalOpen);
                }
              }}
              className="text-xs sm:text-sm text-white hover:text-zinc-300 transition flex items-center gap-0.5 cursor-pointer font-medium"
            >
              <span>{language === 'UA' ? 'Змінити' : 'Change'}</span>
              <ChevronRight className="w-3.5 h-3.5 text-white" />
            </button>
          </div>

          {favoriteGenres.length === 0 ? (
            <p className="text-white/70 text-xs">
              {language === 'UA' ? 'Оберіть ваш улюблений жанр' : 'Choose your favorite genre'}
            </p>
          ) : (
            <div className="flex flex-wrap gap-2.5 pt-0.5">
              {favoriteGenres.map((genre) => (
                <div 
                  key={genre}
                  className="px-5 py-1.5 rounded-full border border-white/40 bg-transparent text-white text-xs sm:text-sm font-medium hover:bg-white/5 transition-colors cursor-default select-none"
                >
                  {genre}
                </div>
              ))}
            </div>
          )}

          {/* Inline Жанр Selection Перемикач Box */}
          {isGenreModalOpen && (
            <div className="p-4 bg-[#121216] border border-[#26262E] rounded-2xl space-y-3 animate-in fade-in duration-200 mt-2">
              <p className="text-xs text-zinc-400">
                {language === 'UA' ? 'Оберіть ваші улюблені жанри:' : 'Select your favorite genres:'}
              </p>
              <div className="flex flex-wrap gap-2">
                {GENRES.filter(g => g !== 'Всі').map((genre) => {
                  const isSelected = favoriteGenres.includes(genre);
                  return (
                    <button
                      key={genre}
                      onClick={() => toggleGenre(genre)}
                      className={`px-3 py-1.5 rounded-full text-xs transition cursor-pointer border ${
                        isSelected 
                          ? 'bg-[#FF3040] text-white border-[#FF3040]' 
                          : 'bg-[#18181E] text-zinc-300 border-[#2A2A34] hover:text-white'
                      }`}
                    >
                      {genre}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* 5. Перегляд профілю (Horizontal Banner matching screenshot 1:1) */}
        <div className="space-y-2.5 pt-2">
          <h2 className="text-sm sm:text-base font-medium text-white tracking-tight">
            {language === 'UA' ? 'Перегляд профілю' : 'Profile Preview'}
          </h2>

          <div className="relative rounded-[16px] overflow-hidden border border-white/10 bg-[#0C0C0E] p-4 sm:p-5 shadow-2xl">
            {/* Gothic scenery banner Накладення (оверлей) */}
            <div 
              className="absolute inset-0 bg-cover bg-center pointer-events-none opacity-85"
              style={{
                backgroundImage: `url('/backgrounds/profilebackground.png')`,
              }}
            />
            {/* Subtle gradient vignette to guarantee text legibility */}
            <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent pointer-events-none" />

            <div className="relative z-10 flex items-center gap-4">
              {/* Avatar Circle */}
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full overflow-hidden border border-white/30 shrink-0 bg-zinc-900 shadow-md">
                <img 
                  src={avatarUrl} 
                  alt={name}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Name, Handles, and 4 Red Stats */}
              <div className="flex-1 min-w-0 space-y-1.5">
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-white tracking-tight leading-tight">
                    {name}
                  </h3>
                  <p className="text-[11px] text-zinc-300 font-mono leading-tight mt-0.5">
                    {handle}
                  </p>
                  <p className="text-[10px] text-zinc-400 font-mono leading-tight">
                    {birthDate}
                  </p>
                </div>

                {/* 4 Stats Рядок (All numbers red #FF3040 matching screenshot) */}
                <div className="flex items-center gap-4 sm:gap-6 pt-1">
                  <div>
                    <span className="block text-xs sm:text-sm font-bold text-[#FF3040] font-mono leading-none">
                      {savedCount}
                    </span>
                    <span className="text-[10px] text-zinc-400 block mt-0.5 leading-tight">
                      {language === 'UA' ? 'Збережених' : 'Saved'}
                    </span>
                  </div>
                  <div>
                    <span className="block text-xs sm:text-sm font-bold text-[#FF3040] font-mono leading-none">
                      12
                    </span>
                    <span className="text-[10px] text-zinc-400 block mt-0.5 leading-tight">
                      Watch Party
                    </span>
                  </div>
                  <div>
                    <span className="block text-xs sm:text-sm font-bold text-[#FF3040] font-mono leading-none">
                      {watchedCount}
                    </span>
                    <span className="text-[10px] text-zinc-400 block mt-0.5 leading-tight">
                      {language === 'UA' ? 'Переглянуто' : 'Watched'}
                    </span>
                  </div>
                  <div>
                    <span className="block text-xs sm:text-sm font-bold text-[#FF3040] font-mono leading-none">
                      {calculatedAvgRating}
                    </span>
                    <span className="text-[10px] text-zinc-400 block mt-0.5 leading-tight">
                      {language === 'UA' ? 'Рейтинг' : 'Rating'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 6. Безпека */}
        <div className="space-y-3 pt-2">
          <h2 className="text-sm sm:text-base font-medium text-white tracking-tight">
            {language === 'UA' ? 'Безпека' : 'Security'}
          </h2>

          <div className="space-y-2.5 text-sm">
            {/* Змінити пароль */}
            <button
              type="button"
              onClick={() => {
                if (onRequestChangePassword) {
                  onRequestChangePassword();
                }
              }}
              className="flex items-center justify-between w-full text-zinc-200 hover:text-white transition cursor-pointer py-1"
            >
              <div className="flex items-center gap-3">
                <Lock className="w-4 h-4 text-zinc-300 shrink-0" />
                <span>{language === 'UA' ? 'Змінити пароль' : 'Change password'}</span>
              </div>
              <ChevronRight className="w-4 h-4 text-zinc-400" />
            </button>

            {/* Завантажити свої данні */}
            <button
              type="button"
              onClick={handleDownloadData}
              className="flex items-center justify-between w-full text-zinc-200 hover:text-white transition cursor-pointer py-1"
            >
              <div className="flex items-center gap-3">
                <Download className="w-4 h-4 text-zinc-300 shrink-0" />
                <span>{language === 'UA' ? 'Завантажити свої данні' : 'Download personal data'}</span>
              </div>
              <ChevronRight className="w-4 h-4 text-zinc-400" />
            </button>

            {/* Видалити профіль */}
            <button
              type="button"
              onClick={() => setIsDeleteModalOpen(true)}
              className="flex items-center justify-between w-full text-[#FF3040] hover:text-red-400 transition cursor-pointer py-1 font-medium"
            >
              <div className="flex items-center gap-3">
                <Trash2 className="w-4 h-4 text-[#FF3040] shrink-0" />
                <span>{language === 'UA' ? 'Видалити профіль' : 'Delete profile'}</span>
              </div>
              <ChevronRight className="w-4 h-4 text-[#FF3040]" />
            </button>
          </div>
        </div>

        {/* 7. Приєднані акаунти (Cards matching screenshot) */}
        <div className="space-y-3 pt-2">
          <h2 className="text-sm sm:text-base font-medium text-white tracking-tight">
            {language === 'UA' ? 'Приєднані акаунти' : 'Connected Accounts'}
          </h2>

          <div className="space-y-2.5">
            {/* Google */}
            <div className="flex items-center justify-between px-3.5 py-2.5 rounded-[12px] border border-white/20 bg-transparent transition">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 flex items-center justify-center shrink-0">
                  <img 
                    src="/icons/google.png" 
                    alt="Google" 
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = '/icon/google.png';
                    }}
                  />
                </div>
                <span className="text-white text-sm font-medium">Google</span>
              </div>

              <button 
                type="button"
                onClick={() => {
                  const newState = !googleConnected;
                  setGoogleConnected(newState);
                  const updatedUser: UserProfile = {
                    ...user,
                    name,
                    email,
                    avatarUrl,
                    favoriteGenres,
                    handle,
                    birthDate,
                    gender,
                    location,
                    aboutMe,
                    googleConnected: newState,
                    facebookConnected,
                  };
                  onUpdateUser(updatedUser);
                  if (user.id) localStorage.setItem(`user_google_${user.id}`, String(newState));
                  if (email) localStorage.setItem(`user_google_${email.trim().toLowerCase()}`, String(newState));
                }}
                className="flex items-center gap-1 bg-transparent p-0 border-0 text-xs font-semibold cursor-pointer select-none"
              >
                <span className={googleConnected ? 'text-zinc-200' : 'text-[#FF3040]'}>
                  {googleConnected 
                    ? (language === 'UA' ? 'Приєднано' : 'Connected')
                    : (language === 'UA' ? 'Не приєднано' : 'Not connected')}
                </span>
                <ChevronRight className={`w-3.5 h-3.5 ${googleConnected ? 'text-zinc-400' : 'text-[#FF3040]'}`} />
              </button>
            </div>

            {/* Facebook */}
            <div className="flex items-center justify-between px-3.5 py-2.5 rounded-[12px] border border-white/20 bg-transparent transition">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 flex items-center justify-center shrink-0">
                  <img 
                    src="/icons/Facebook.png" 
                    alt="Facebook" 
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = '/icon/Facebook.png';
                    }}
                  />
                </div>
                <span className="text-white text-sm font-medium">Facebook</span>
              </div>

              <button 
                type="button"
                onClick={() => {
                  const newState = !facebookConnected;
                  setFacebookConnected(newState);
                  const updatedUser: UserProfile = {
                    ...user,
                    name,
                    email,
                    avatarUrl,
                    favoriteGenres,
                    handle,
                    birthDate,
                    gender,
                    location,
                    aboutMe,
                    googleConnected,
                    facebookConnected: newState,
                  };
                  onUpdateUser(updatedUser);
                  if (user.id) localStorage.setItem(`user_facebook_${user.id}`, String(newState));
                  if (email) localStorage.setItem(`user_facebook_${email.trim().toLowerCase()}`, String(newState));
                }}
                className="flex items-center gap-1 bg-transparent p-0 border-0 text-xs font-semibold cursor-pointer select-none"
              >
                <span className={facebookConnected ? 'text-zinc-200' : 'text-[#FF3040]'}>
                  {facebookConnected 
                    ? (language === 'UA' ? 'Приєднано' : 'Connected')
                    : (language === 'UA' ? 'Не приєднано' : 'Not connected')}
                </span>
                <ChevronRight className={`w-3.5 h-3.5 ${facebookConnected ? 'text-zinc-400' : 'text-[#FF3040]'}`} />
              </button>
            </div>
          </div>
        </div>

        {/* 8. Мова профілю (Mobile language switch matching screenshot) */}
        <div className="space-y-2 pt-2">
          <h2 className="text-sm sm:text-base font-medium text-white tracking-tight">
            {language === 'UA' ? 'Мова профілю' : 'Profile Language'}
          </h2>

          <div className="flex flex-col space-y-1.5 pt-0.5">
            <button
              type="button"
              onClick={() => setLanguage('UA')}
              className={`text-left text-sm font-medium transition cursor-pointer select-none py-1 ${
                language === 'UA' 
                  ? 'text-[#FF3040] font-bold' 
                  : 'text-zinc-300 hover:text-white'
              }`}
            >
              Українська
            </button>
            <button
              type="button"
              onClick={() => setLanguage('ENG')}
              className={`text-left text-sm font-medium transition cursor-pointer select-none py-1 ${
                language === 'ENG' 
                  ? 'text-[#FF3040] font-bold' 
                  : 'text-zinc-300 hover:text-white'
              }`}
            >
              Англійська
            </button>
          </div>
        </div>
      </div>

      {/* Modal: Підтвердження видалення профілю */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#121216] border border-[#26262E] rounded-[20px] max-w-md w-full p-6 space-y-5 shadow-2xl relative">
            <div className="w-12 h-12 rounded-full bg-[#FF3040]/15 border border-[#FF3040]/30 flex items-center justify-center text-[#FF3040] mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-xl font-bold text-white">
                {language === 'UA' ? 'Видалити профіль?' : 'Delete Profile?'}
              </h3>
              <p className="text-sm text-zinc-400 leading-relaxed">
                {language === 'UA'
                  ? 'Ви дійсно бажаєте видалити свій профіль? Усі збережені дані, історію переглядів, список обраного та персональні налаштування буде безповоротно видалено.'
                  : 'Are you sure you want to delete your profile? All saved data, watch history, favorites, and personal settings will be permanently erased.'}
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="flex-1 py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white font-medium text-sm transition cursor-pointer border border-white/10"
              >
                {language === 'UA' ? 'Скасувати' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  if (onDeleteProfile) {
                    onDeleteProfile();
                  }
                }}
                className="flex-1 py-2.5 px-4 rounded-xl bg-[#FF3040] hover:bg-[#ff1f32] text-white font-bold text-sm transition cursor-pointer shadow-lg shadow-[#FF3040]/30 flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                <span>{language === 'UA' ? 'Видалити' : 'Delete'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
