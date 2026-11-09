import React, { useState } from 'react';
import { Check, ChevronRight, ArrowLeft } from 'lucide-react';
import Logo from './Logo';
import { useLanguage } from '../context/LanguageContext';
import { UserProfile } from '../types';

export interface GenreItem {
  id: string;
  nameUa: string;
  nameEn: string;
  backdropUrl: string;
}

export const AVAILABLE_GENRES: GenreItem[] = [
  {
    id: 'action',
    nameUa: 'Бойовик',
    nameEn: 'Action',
    backdropUrl: 'public/posters/choosegeneres.png',
  },
  {
    id: 'scifi',
    nameUa: 'Наукова фантастика',
    nameEn: 'Sci-Fi',
    backdropUrl: 'public/posters/choosegeneres.png',
  },
  {
    id: 'thriller',
    nameUa: 'Трилер',
    nameEn: 'Thriller',
    backdropUrl: 'public/posters/choosegeneres.png',
  },
  {
    id: 'fantasy',
    nameUa: 'Фентезі',
    nameEn: 'Fantasy',
    backdropUrl: 'public/posters/choosegeneres.png',
  },
  {
    id: 'drama',
    nameUa: 'Драма',
    nameEn: 'Drama',
    backdropUrl: 'public/posters/choosegeneres.png',
  },
  {
    id: 'horror',
    nameUa: 'Жахи',
    nameEn: 'Horror',
    backdropUrl: 'public/posters/choosegeneres.png',
  },
  {
    id: 'comedy',
    nameUa: 'Комедія',
    nameEn: 'Comedy',
    backdropUrl: 'public/posters/choosegeneres.png',
  },
  {
    id: 'crime',
    nameUa: 'Кримінал',
    nameEn: 'Crime',
    backdropUrl: 'public/posters/choosegeneres.png',
  },
  {
    id: 'romance',
    nameUa: 'Романтика',
    nameEn: 'Romance',
    backdropUrl: 'public/posters/choosegeneres.png',
  },
  {
    id: 'documentary',
    nameUa: 'Документальне',
    nameEn: 'Documentary',
    backdropUrl: 'public/posters/choosegeneres.png',
  },
  {
    id: 'adventure',
    nameUa: 'Пригоди',
    nameEn: 'Adventure',
    backdropUrl: 'public/posters/choosegeneres.png',
  },
  {
    id: 'anime',
    nameUa: 'Аніме',
    nameEn: 'Anime',
    backdropUrl: 'public/posters/choosegeneres.png',
  },
  {
    id: 'dorama',
    nameUa: 'Дорами',
    nameEn: 'Dorama',
    backdropUrl: 'public/posters/choosegeneres.png',
  },
];

interface FavoriteGenresViewProps {
  user?: UserProfile | null;
  initialSelectedGenres?: string[];
  onComplete: (selectedGenres: string[]) => void;
  onCancel?: () => void;
  isInitialOnboarding?: boolean;
}

export default function FavoriteGenresView({
  user,
  initialSelectedGenres,
  onComplete,
  onCancel,
  isInitialOnboarding = true,
}: FavoriteGenresViewProps) {
  const { language, setLanguage } = useLanguage();

  // Selected genre names in Ukrainian (e.g. 'Бойовик', 'Комедія')
  const [selectedGenres, setSelectedGenres] = useState<string[]>(() => {
    if (initialSelectedGenres && initialSelectedGenres.length > 0) {
      return initialSelectedGenres;
    }
    if (user?.favoriteGenres && user.favoriteGenres.length > 0) {
      return user.favoriteGenres;
    }
    return ['Бойовик', 'Комедія'];
  });

  const toggleGenre = (genreUa: string) => {
    setSelectedGenres((prev) => {
      if (prev.includes(genreUa)) {
        return prev.filter((g) => g !== genreUa);
      } else {
        return [...prev, genreUa];
      }
    });
  };

  const handleStart = () => {
    onComplete(selectedGenres);
  };

  return (
    <div className="min-h-screen bg-[#070709] text-white font-sans selection:bg-[#FF3040] selection:text-white flex flex-col justify-between overflow-x-hidden">
      {/* Top Bar Шапка сайту */}
      <header className="w-full max-w-[1700px] mx-auto px-6 sm:px-12 md:px-16 lg:px-20 py-6 flex items-center justify-between relative z-30">
        <div className="flex items-center gap-3">
          {onCancel && (
            <button
              onClick={onCancel}
              className="p-2.5 rounded-[10px] bg-[#141418] border border-[#26262E] text-zinc-400 hover:text-white hover:bg-white/10 transition cursor-pointer mr-2"
              title={language === 'UA' ? 'Назад' : 'Back'}
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <Logo size="lg" />
        </div>

        {/* Language Switcher (Figma: 78x41px, rounded-10px with sliding red Бейдж) */}
        <div className="relative w-[78px] h-[41px] bg-transparent border border-white/10 rounded-[10px] flex items-center p-[2px] select-none">
          <div
            className={`absolute top-[2px] bottom-[2px] w-[35px] bg-[#FF3040] rounded-[7px] shadow-sm transition-transform duration-200 ease-out ${language === 'UA' ? 'translate-x-0' : 'translate-x-[37px]'
              }`}
          />
          <button
            type="button"
            onClick={() => setLanguage('UA')}
            className={`relative z-10 w-1/2 h-full flex items-center justify-center text-xs font-bold transition-colors cursor-pointer ${language === 'UA' ? 'text-white' : 'text-zinc-400 hover:text-white'
              }`}
          >
            UK
          </button>
          <button
            type="button"
            onClick={() => setLanguage('ENG')}
            className={`relative z-10 w-1/2 h-full flex items-center justify-center text-xs font-bold transition-colors cursor-pointer ${language === 'ENG' ? 'text-white' : 'text-zinc-400 hover:text-white'
              }`}
          >
            EN
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="w-full max-w-[1240px] mx-auto px-6 sm:px-10 py-8 flex-1 flex flex-col items-center justify-center text-center">
        {/* Заголовок */}
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight mb-3">
          {language === 'UA' ? (
            <>
              Обери свої <span className="text-[#FF3040]">улюблені жанри</span>
            </>
          ) : (
            <>
              Choose your <span className="text-[#FF3040]">favorite genres</span>
            </>
          )}
        </h1>

        {/* Subtitle */}
        <p className="text-zinc-400 text-sm sm:text-base max-w-xl mx-auto leading-relaxed mb-10">
          {language === 'UA'
            ? 'Обери мінімум два жанри, які тобі подобаються. Ми використаємо їх, щоб підлаштувати рекомендації саме під тебе.'
            : 'Choose at least two genres you like. We will use them to customize recommendations just for you.'}
        </p>

        {/* Жанр Картки Сітка (5 cols desktop, 3 cols tablet, 2 cols mobile) */}
        <div className="w-full grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5 sm:gap-4.5 max-w-5xl mb-9">
          {AVAILABLE_GENRES.map((genre) => {
            const isSelected = selectedGenres.includes(genre.nameUa);
            const label = language === 'UA' ? genre.nameUa : genre.nameEn;

            return (
              <button
                key={genre.id}
                type="button"
                onClick={() => toggleGenre(genre.nameUa)}
                className={`relative group aspect-[16/9] sm:aspect-[16/10] rounded-[16px] overflow-hidden cursor-pointer transition-all duration-200 select-none flex items-center justify-center text-center p-3 ${isSelected
                    ? 'border border-[#FF3040] shadow-[0_0_18px_rgba(255,48,64,0.35)] scale-[1.02]'
                    : 'border border-[#26262E] hover:border-zinc-500 bg-[#121216]'
                  }`}
              >
                {/* Background Image with Cinematic Darkness & Blur */}
                <div
                  className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
                  style={{
                    backgroundImage: `url(${genre.backdropUrl})`,
                    filter: isSelected ? 'brightness(0.32) contrast(1.1)' : 'brightness(0.22) contrast(1.1)',
                  }}
                />

                {/* Dark Vignette / Gradient Накладення (оверлей) */}
                <div
                  className={`absolute inset-0 transition-opacity duration-200 ${isSelected
                      ? 'bg-gradient-to-t from-black/80 via-black/40 to-[#FF3040]/10'
                      : 'bg-gradient-to-t from-black/85 via-black/50 to-black/30 group-hover:from-black/70'
                    }`}
                />

                {/* Жанр Name Text */}
                <span className="relative z-10 text-white font-medium text-xs sm:text-sm md:text-[14px] leading-snug px-1 drop-shadow-md">
                  {label}
                </span>

                {/* Small Red Circle with Checkmark in Top-Right Corner */}
                {isSelected && (
                  <div className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-[#FF3040] flex items-center justify-center shadow-lg shadow-[#FF3040]/50 animate-in zoom-in-75 duration-150 z-20">
                    <Check className="w-3 h-3 text-white stroke-[3]" />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Bottom Допоміжна функція Notice */}
        <p className="text-xs sm:text-[13px] text-zinc-400 mb-6">
          {language === 'UA'
            ? 'Не знаєш, що обрати? Можеш зробити вибір пізніше у налаштуваннях профілю.'
            : "Don't know what to choose? You can make a choice later in profile settings."}
        </p>

        {/* CTA Кнопка */}
        <button
          type="button"
          onClick={handleStart}
          className="journey-cta-btn border-2 border-transparent hover:border-white/80 active:border-transparent text-white px-8 py-3.5 rounded-[10px] font-bold text-sm sm:text-base flex items-center gap-2 transition-all transform hover:scale-102 active:scale-98 hover:shadow-[0_0_24px_rgba(255,255,255,0.3),0_10px_25px_rgba(215,40,53,0.35)] shadow-lg shadow-[#FF4D5C]/25 cursor-pointer select-none"
        >
          <span>
            {isInitialOnboarding
              ? (language === 'UA' ? 'Почати перегляд' : 'Start watching')
              : (language === 'UA' ? 'Зберегти жанри' : 'Save genres')}
          </span>
          <ChevronRight className="w-4 h-4 ml-0.5" />
        </button>
      </main>
    </div>
  );
}
