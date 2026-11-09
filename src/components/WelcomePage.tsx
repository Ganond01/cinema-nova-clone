import React, { useState, useMemo } from 'react';
import { 
  Play, 
  ChevronRight, 
  ChevronDown, 
  Tv, 
  Sparkles, 
  Heart, 
  Star, 
  Zap,
  Ban
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { LazyImage } from './LazyImage';
import Logo from './Logo';
import FooterMain from './FooterMain';
import { useLanguage } from '../context/LanguageContext';
import { Movie } from '../types';
import { INITIAL_MOVIES } from '../data/movies';
import { validatePosterUrl, handlePosterError } from '../utils/imageFallback';

interface WelcomePageProps {
  movies?: Movie[];
  onOpenAuth: (mode?: 'login' | 'register', initialEmail?: string) => void;
  onBrowseMovies?: () => void;
}

export const WelcomePage: React.FC<WelcomePageProps> = ({ movies, onOpenAuth, onBrowseMovies }) => {
  const { language, setLanguage } = useLanguage();
  const [emailInput, setEmailInput] = useState('');
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index);
  };

  const handleStartJourney = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    onOpenAuth('register', emailInput);
  };

  // Фільми Список for display (from props or За замовчуванням library) - stably memoized
  const allMovies = useMemo(() => {
    return (movies && movies.length > 0) ? movies : INITIAL_MOVIES;
  }, [movies]);

  // 5 Hero Posters data stably memoized
  const heroPostersData = useMemo(() => {
    const heroPosters = allMovies.slice(0, 5);
    while (heroPosters.length < 5) {
      heroPosters.push(INITIAL_MOVIES[heroPosters.length % INITIAL_MOVIES.length]);
    }

    return {
      center: {
        url: '/posters/Frame 10.webp',
        fallbackUrl: '/posters/Frame 10.png',
        title: 'ВОНО 2',
        rating: '8.6',
        age: '18+',
        genres: 'Жахи • Фантастика',
        year: 2019
      },
      midLeft: {
        url: '/posters/Rectangle 280.webp',
        fallbackUrl: '/posters/Rectangle 280.png',
        title: heroPosters[1]?.title || 'Дюна 2',
      },
      farLeft: {
        url: '/posters/Rectangle 281.webp',
        fallbackUrl: '/posters/Rectangle 281.png',
        title: heroPosters[0]?.title || 'Бетмен',
      },
      midRight: {
        url: '/posters/Rectangle 282.webp',
        fallbackUrl: '/posters/Rectangle 282.png',
        title: heroPosters[3]?.title || 'Оппенгеймер',
      },
      farRight: {
        url: '/posters/Rectangle 283.webp',
        fallbackUrl: '/posters/Rectangle 283.png',
        title: heroPosters[4]?.title || 'Дивні дива 5',
      }
    };
  }, [allMovies]);

  // Popular movies list from database stably memoized (seeded with Backrooms, Одіссея, Монстр matching design)
  const popularMovies = useMemo(() => {
    const customFirst = [
      {
        id: 'pop_backrooms',
        title: 'Backrooms: Залаштунки',
        titleEn: 'The Backrooms',
        posterUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80',
        rating: 7.8,
        ageRating: '16+',
        genres: ['Жахи', 'Фантастика'],
        year: 2025,
        type: 'series' as const
      },
      {
        id: 'pop_odyssey',
        title: 'Одіссея',
        titleEn: 'The Odyssey',
        posterUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=600&q=80',
        rating: 6.7,
        ageRating: '18+',
        genres: ['Фільм', 'Фантастика'],
        year: 2006,
        type: 'movie' as const
      },
      {
        id: 'monster-anime',
        title: 'Монстр',
        titleEn: 'Monster',
        posterUrl: 'https://image.tmdb.org/t/p/w500/n5XNKXnoXpoXyfiCtXHOf8q8PFM.jpg',
        rating: 7.2,
        ageRating: '16+',
        genres: ['Жахи', 'Фантастика'],
        year: 2004,
        type: 'series' as const
      }
    ];

    const pop = allMovies
      .filter(m => m.isPopular || m.rating >= 7.5)
      .filter(m => m.id !== 'monster-anime')
      .slice(0, 4);

    return [...customFirst, ...pop];
  }, [allMovies]);

  // FAQ Items
  const faqs = useMemo(() => {
    return language === 'UA' ? [
      {
        question: 'Що таке CINEMA NOVA?',
        answer: 'CINEMA NOVA — це сучасна платформа для перегляду фільмів, серіалів та аніме з персональними рекомендаціями, зручним пошуком і можливістю спільного перегляду через Watch Party.'
      },
      {
        question: 'Чи потрібно створювати обліковий запис?',
        answer: 'Так, для повноцінного користування CINEMA NOVA потрібен обліковий запис. Він дає доступ до персональних рекомендацій, історії переглядів, збереження контенту та Watch Party.'
      },
      {
        question: 'На яких пристроях можна дивитися контент?',
        answer: 'CINEMA NOVA доступний на комп’ютерах, смартфонах, планшетах і Smart TV — ви можете дивитися контент на будь-якому зручному пристрої.'
      },
      {
        question: 'Яку якість відео підтримує сервіс?',
        answer: 'CINEMA NOVA підтримує якість відео до 4K Ultra HD, залежно від доступної якості контенту та швидкості інтернет-з’єднання.'
      },
      {
        question: 'Що таке Watch Party?',
        answer: 'Watch Party — це функція для спільного перегляду фільмів і серіалів з друзями в одній онлайн-кімнаті, де учасники можуть спілкуватися під час перегляду.'
      },
      {
        question: 'Як працюють персональні рекомендації?',
        answer: 'Персональні рекомендації формуються на основі ваших уподобань, історії переглядів, оцінок і обраних жанрів. Система аналізує ці дані та пропонує контент, який може вам сподобатися.'
      },
      {
        question: 'Чи безпечні мої дані?',
        answer: 'Так. CINEMA NOVA захищає персональні дані користувачів і не передає їх третім сторонам без відповідної підстави. Для захисту облікових записів використовуються сучасні методи шифрування та безпеки.'
      }
    ] : [
      {
        question: 'What is CINEMA NOVA?',
        answer: 'CINEMA NOVA is a modern streaming platform for movies, series, and anime with personalized recommendations, smart search, and synchronized co-viewing via Watch Party.'
      },
      {
        question: 'Do I need to create an account?',
        answer: 'Yes, an account is required to get full access to CINEMA NOVA. It unlocks personalized recommendations, watch history, saved watchlist items, and Watch Party.'
      },
      {
        question: 'What devices can I use to watch content?',
        answer: 'CINEMA NOVA is available on PCs, smartphones, tablets, and Smart TVs — you can stream media on any convenient device.'
      },
      {
        question: 'What video resolution does the service support?',
        answer: 'CINEMA NOVA supports up to 4K Ultra HD resolution, depending on available master quality and your internet connection bandwidth.'
      },
      {
        question: 'What is Watch Party?',
        answer: 'Watch Party is a synchronized co-viewing feature allowing you to watch movies and series with friends in a shared virtual room with real-time live chat.'
      },
      {
        question: 'How do personalized recommendations work?',
        answer: 'Personal recommendations are tailored based on your viewing habits, watch history, user ratings, and preferred genres. The engine analyzes these signals to curate titles you\'ll love.'
      },
      {
        question: 'Is my personal data secure?',
        answer: 'Yes. CINEMA NOVA strictly protects user personal data and never shares it with unauthorized third parties. High-grade encryption and modern security practices protect every account.'
      }
    ];
  }, [language]);

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-[#FF3040] selection:text-white relative overflow-x-hidden flex flex-col justify-between">
      
      <div>
        {/* Top Bar Шапка сайту - Transparent, no background, logo and language selector stay in place */}
        <header className="w-full max-w-[1700px] mx-auto px-4 sm:px-12 md:px-16 lg:px-20 py-4 sm:py-6 flex items-center justify-between relative z-30 bg-transparent border-none">
          {/* Logo: Mobile LogoWelcome.png vs Desktop <Logo size="lg" /> */}
          <div className="flex items-center cursor-pointer" onClick={onBrowseMovies}>
            <img
              src="/logo/LogoWelcome.png"
              alt="Cinema Nova"
              className="h-7 w-7 sm:hidden object-contain"
            />
            <div className="hidden sm:block">
              <Logo size="lg" />
            </div>
          </div>

          {/* Right Шапка сайту Actions */}
          <div className="flex items-center gap-2.5 sm:gap-4">
            {/* Language Selector: 68x32px on mobile, 78x41px on sm+ */}
            <div className="relative w-[68px] sm:w-[78px] h-[32px] sm:h-[41px] bg-transparent border border-white/10 rounded-[8px] sm:rounded-[10px] flex items-center p-[2px] select-none">
              <div
                className={`absolute top-[2px] bottom-[2px] w-[30px] sm:w-[35px] bg-[#FF3040] rounded-[6px] sm:rounded-[7px] shadow-sm transition-transform duration-200 ease-out ${
                  language === 'UA' ? 'translate-x-0' : 'translate-x-[32px] sm:translate-x-[37px]'
                }`}
              />
              <button
                type="button"
                onClick={() => setLanguage('UA')}
                className={`relative z-10 w-1/2 h-full flex items-center justify-center text-[10px] sm:text-xs font-bold transition-colors cursor-pointer ${
                  language === 'UA' ? 'text-white' : 'text-zinc-400 hover:text-white'
                }`}
              >
                UK
              </button>
              <button
                type="button"
                onClick={() => setLanguage('ENG')}
                className={`relative z-10 w-1/2 h-full flex items-center justify-center text-[10px] sm:text-xs font-bold transition-colors cursor-pointer ${
                  language === 'ENG' ? 'text-white' : 'text-zinc-400 hover:text-white'
                }`}
              >
                EN
              </button>
            </div>

            {/* Sign in Кнопка */}
            <button
              onClick={() => onOpenAuth('login')}
              className="cinema-glow-btn px-4 sm:px-7 py-1.5 sm:py-2 text-[11px] sm:text-sm font-semibold text-white tracking-wide"
            >
              <span className="relative z-10 font-sans">
                {language === 'UA' ? 'Увійти' : 'Sign in'}
              </span>
            </button>
          </div>
        </header>

        {/* Hero Section */}
        <section className="relative w-full max-w-[1700px] mx-auto px-4 sm:px-12 md:px-16 lg:px-20 pt-4 sm:pt-6 pb-0 sm:pb-16 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left Hero Content */}
          <div className="lg:col-span-6 space-y-4 sm:space-y-6 text-center lg:text-left z-10 flex flex-col items-center lg:items-start">
            <span className="text-[#FF3040] font-extrabold text-[10px] sm:text-xs tracking-widest uppercase block text-center lg:text-left">
              PREMIUM STREAMING EXPERIENCE
            </span>

            <h1 className="sr-only">Cinema Nova</h1>
            <div className="relative w-full max-w-[270px] sm:max-w-[420px] lg:max-w-[729px] flex justify-center lg:justify-start my-1 sm:my-0">
              {/* Mobile Background Effect (WelcomeMobile.png) - full width and centered on CinemaNova text */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-screen pointer-events-none -z-10 flex justify-center items-center sm:hidden select-none overflow-visible">
                <img
                  src="/effects/WelcomeMobile.png"
                  alt=""
                  decoding="async"
                  className="w-full min-w-full h-auto object-cover object-center opacity-100 pointer-events-none"
                />
              </div>

              {/* Soft red glow on mobile behind logo text */}
              <div className="absolute inset-0 bg-[#FF3040]/30 rounded-full blur-[40px] pointer-events-none -z-10 sm:hidden" />
              <img
                src="/logo/CinemaNovatext.png"
                alt="Cinema Nova"
                width={729}
                height={256}
                className="w-[270px] sm:w-[420px] lg:w-[729px] h-auto object-contain select-none pointer-events-none drop-shadow-[0_0_20px_rgba(255,48,64,0.35)]"
              />
            </div>

            <p className="text-zinc-200 text-xs sm:text-lg max-w-sm sm:max-w-lg leading-relaxed font-normal text-center lg:text-left">
              Безлімітна кількість фільмів, серіалів та аніме.<br />
              Відкрийте для себе історії, які вас зацікавлять.
            </p>

            <div className="flex justify-center lg:justify-start items-center gap-4 pt-1 sm:pt-2 w-full">
              <button
                onClick={() => onOpenAuth('register')}
                className="journey-cta-btn border-2 border-transparent hover:border-white/80 active:border-transparent text-white px-5 sm:px-7 py-2.5 sm:py-3.5 rounded-[10px] font-bold text-xs sm:text-base flex items-center justify-center gap-1.5 sm:gap-2 transition-all transform hover:scale-102 active:scale-98 hover:shadow-[0_0_24px_rgba(255,255,255,0.3),0_10px_25px_rgba(215,40,53,0.35)] shadow-lg shadow-[#FF4D5C]/25 cursor-pointer select-none"
              >
                <span>{language === 'ENG' ? 'Start your journey' : 'Розпочніть свою подорож'}</span> <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>
          </div>

          {/* Right Hero Graphic: 5 Stacked Posters from /posters (лише для ПК, hidden on mobile) */}
          <div className="hidden lg:flex lg:col-span-6 relative flex-col items-center justify-center py-6 min-h-[420px] w-full overflow-visible">
            {/* Background Soft Red Radial Glow (Extends gracefully past posters) */}
            <div className="absolute w-[650px] h-[450px] bg-[#FF3040]/25 rounded-full blur-[140px] pointer-events-none -z-10" />

            {/* Glowing Red Light Effect Platform under Posters */}
            <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-[850px] max-w-none h-40 bg-[#FF3040]/30 rounded-[100%] blur-3xl pointer-events-none z-0" />
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-[650px] max-w-none h-16 bg-[#FF3040]/55 rounded-[100%] blur-2xl pointer-events-none z-0" />

            {/* Background Effect Image WelcomeRectangle.webp */}
            <img 
              src="/effects/WelcomeRectangle.webp" 
              alt="" 
              decoding="async"
              className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-[880px] max-w-none pointer-events-none z-0 opacity-95"
              style={{ filter: 'brightness(2.2) contrast(1.15)' }}
              onError={(e) => {
                const target = e.currentTarget as HTMLImageElement;
                if (!target.src.endsWith('.png')) {
                  target.src = '/effects/WelcomeRectangle.png';
                } else {
                  target.style.display = 'none';
                }
              }}
            />

            <div className="relative w-full max-w-xl h-[380px] flex items-center justify-center z-10 scale-90 sm:scale-100">
              
              {/* 1. Rectangle 281 - Far Left Poster with Glass Effect */}
              <div 
                className="absolute w-36 sm:w-40 h-52 sm:h-56 rounded-2xl overflow-hidden border border-white/20 ring-1 ring-inset ring-white/10 shadow-[0_16px_36px_rgba(0,0,0,0.8)] opacity-80 z-10 pointer-events-none bg-black/40 backdrop-blur-md"
                style={{ transform: 'translateX(-290px) translateY(0px) scale(0.88)' }}
              >
                <img
                  src={heroPostersData.farLeft.url}
                  alt={heroPostersData.farLeft.title}
                  decoding="async"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.currentTarget as HTMLImageElement;
                    if (heroPostersData.farLeft.fallbackUrl && target.src !== heroPostersData.farLeft.fallbackUrl) {
                      target.src = heroPostersData.farLeft.fallbackUrl;
                    }
                  }}
                />
                {/* Glass Sheen Накладення (оверлей) */}
                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-white/25 pointer-events-none mix-blend-overlay" />
              </div>

              {/* 2. Rectangle 280 - Mid Left Poster with Glass Effect */}
              <div 
                className="absolute w-40 sm:w-44 h-58 sm:h-64 rounded-2xl overflow-hidden border border-white/25 ring-1 ring-inset ring-white/15 shadow-[0_20px_45px_rgba(0,0,0,0.85)] opacity-90 z-20 pointer-events-none bg-black/40 backdrop-blur-md"
                style={{ transform: 'translateX(-160px) translateY(-38px) scale(0.96)' }}
              >
                <img
                  src={heroPostersData.midLeft.url}
                  alt={heroPostersData.midLeft.title}
                  decoding="async"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.currentTarget as HTMLImageElement;
                    if (heroPostersData.midLeft.fallbackUrl && target.src !== heroPostersData.midLeft.fallbackUrl) {
                      target.src = heroPostersData.midLeft.fallbackUrl;
                    }
                  }}
                />
                {/* Glass Sheen Накладення (оверлей) */}
                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-white/25 pointer-events-none mix-blend-overlay" />
              </div>

              {/* 3. Frame 10 - Main Center Poster with Premium Glass Finish */}
              <div 
                className="relative w-48 sm:w-52 h-68 sm:h-76 rounded-2xl overflow-hidden border border-white/35 ring-1 ring-inset ring-white/25 shadow-[0_24px_60px_rgba(0,0,0,0.9)] z-30 pointer-events-none bg-black/40 backdrop-blur-lg"
                style={{ transform: 'translateX(0px) translateY(0px)' }}
              >
                <img
                  src={heroPostersData.center.url}
                  alt={heroPostersData.center.title}
                  decoding="async"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.currentTarget as HTMLImageElement;
                    if (heroPostersData.center.fallbackUrl && target.src !== heroPostersData.center.fallbackUrl) {
                      target.src = heroPostersData.center.fallbackUrl;
                    }
                  }}
                />

                {/* Glass Sheen Накладення (оверлей) */}
                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-white/30 pointer-events-none mix-blend-overlay" />

                {/* Рейтинг Бейдж */}
                <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded text-[10px] font-bold text-white border border-white/25 flex items-center gap-1 z-10 shadow-lg">
                  <Star className="w-3 h-3 fill-[#FF3040] text-[#FF3040]" /> {heroPostersData.center.rating}
                </div>

                {/* Age Бейдж */}
                <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded text-[10px] font-bold text-white border border-white/25 z-10 shadow-lg">
                  {heroPostersData.center.age}
                </div>

                {/* Картка Підвал сайту Накладення (оверлей) */}
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black via-black/85 to-transparent p-4 flex flex-col justify-end z-10 backdrop-blur-[2px]">
                  <h4 className="font-extrabold text-white text-base uppercase tracking-wide truncate drop-shadow-md">{heroPostersData.center.title}</h4>
                  <p className="text-[10px] text-zinc-300 mt-0.5 truncate drop-shadow-sm">
                    {heroPostersData.center.genres} • {heroPostersData.center.year}
                  </p>
                </div>
              </div>

              {/* 4. Rectangle 282 - Mid Right Poster with Glass Effect */}
              <div 
                className="absolute w-40 sm:w-44 h-58 sm:h-64 rounded-2xl overflow-hidden border border-white/25 ring-1 ring-inset ring-white/15 shadow-[0_20px_45px_rgba(0,0,0,0.85)] opacity-90 z-20 pointer-events-none bg-black/40 backdrop-blur-md"
                style={{ transform: 'translateX(160px) translateY(-38px) scale(0.96)' }}
              >
                <img
                  src={heroPostersData.midRight.url}
                  alt={heroPostersData.midRight.title}
                  decoding="async"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.currentTarget as HTMLImageElement;
                    if (heroPostersData.midRight.fallbackUrl && target.src !== heroPostersData.midRight.fallbackUrl) {
                      target.src = heroPostersData.midRight.fallbackUrl;
                    }
                  }}
                />
                {/* Glass Sheen Накладення (оверлей) */}
                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-white/25 pointer-events-none mix-blend-overlay" />
              </div>

              {/* 5. Rectangle 283 - Far Right Poster with Glass Effect */}
              <div 
                className="absolute w-36 sm:w-40 h-52 sm:h-56 rounded-2xl overflow-hidden border border-white/20 ring-1 ring-inset ring-white/10 shadow-[0_16px_36px_rgba(0,0,0,0.8)] opacity-80 z-10 pointer-events-none bg-black/40 backdrop-blur-md"
                style={{ transform: 'translateX(290px) translateY(0px) scale(0.88)' }}
              >
                <img
                  src={heroPostersData.farRight.url}
                  alt={heroPostersData.farRight.title}
                  decoding="async"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.currentTarget as HTMLImageElement;
                    if (heroPostersData.farRight.fallbackUrl && target.src !== heroPostersData.farRight.fallbackUrl) {
                      target.src = heroPostersData.farRight.fallbackUrl;
                    }
                  }}
                />
                {/* Glass Sheen Накладення (оверлей) */}
                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-white/25 pointer-events-none mix-blend-overlay" />
              </div>

            </div>
          </div>
        </section>

        {/* Feature Value Props Banner: Single 4-Колонка Рядок on mobile matching Screenshot 1 */}
        <section className="bg-[#121212] border-0 sm:border-y sm:border-white/10 mt-[30px] mb-6 sm:my-8 py-3.5 sm:py-8 w-full">
          <div className="w-full max-w-[1700px] mx-auto px-4 sm:px-12 md:px-16 lg:px-20 grid grid-cols-4 gap-1 sm:gap-6 divide-x-0 sm:divide-x divide-white/10">
            <div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-1 sm:gap-4 px-1 sm:px-4 first:px-0">
              <div className="w-5 h-5 sm:w-8 sm:h-8 flex items-center justify-center shrink-0 mb-0.5 sm:mb-0">
                <Tv className="w-3.5 h-3.5 sm:w-7 sm:h-7 text-white stroke-[1.6]" />
              </div>
              <div>
                <h4 className="font-bold text-white text-[8.5px] sm:text-base leading-tight">Дивіться будь-де.</h4>
                <p className="text-[7px] sm:text-xs text-zinc-400 mt-0.5 sm:mt-1 leading-tight sm:leading-snug">Трансляція на будь-якому пристрої, будь-коли.</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-1 sm:gap-4 px-1 sm:px-4">
              <div className="w-5 h-5 sm:w-8 sm:h-8 flex items-center justify-center shrink-0 mb-0.5 sm:mb-0">
                <Ban className="w-3.5 h-3.5 sm:w-7 sm:h-7 text-white stroke-[1.6]" />
              </div>
              <div>
                <h4 className="font-bold text-white text-[8.5px] sm:text-base leading-tight">Без обмежень.</h4>
                <p className="text-[7px] sm:text-xs text-zinc-400 mt-0.5 sm:mt-1 leading-tight sm:leading-snug">Необмежений доступ до всього контенту. Без реклами.</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-1 sm:gap-4 px-1 sm:px-4">
              <div className="w-5 h-5 sm:w-8 sm:h-8 flex items-center justify-center shrink-0 mb-0.5 sm:mb-0">
                <Sparkles className="w-3.5 h-3.5 sm:w-7 sm:h-7 text-white stroke-[1.6]" />
              </div>
              <div>
                <h4 className="font-bold text-white text-[8.5px] sm:text-base leading-tight">Преміум-контент.</h4>
                <p className="text-[7px] sm:text-xs text-zinc-400 mt-0.5 sm:mt-1 leading-tight sm:leading-snug">Насолоджуйтесь ексклюзивними фільмами та оригінальними серіалами.</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-1 sm:gap-4 px-1 sm:px-4">
              <div className="w-5 h-5 sm:w-8 sm:h-8 flex items-center justify-center shrink-0 mb-0.5 sm:mb-0">
                <Heart className="w-3.5 h-3.5 sm:w-7 sm:h-7 text-white stroke-[1.6]" />
              </div>
              <div>
                <h4 className="font-bold text-white text-[8.5px] sm:text-base leading-tight">Ваш досвід.</h4>
                <p className="text-[7px] sm:text-xs text-zinc-400 mt-0.5 sm:mt-1 leading-tight sm:leading-snug">Персоналізовані рекомендації саме для вас.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Popular Now Section */}
        <section className="w-full max-w-[1700px] mx-auto px-4 sm:px-12 md:px-16 lg:px-20 py-8 sm:py-12">
          <h2 className="text-base sm:text-2xl font-bold text-white mb-3 sm:mb-6 text-left">Популярне зараз</h2>

          {/* Mobile Horizontal Carousel */}
          <div className="flex sm:hidden overflow-x-auto gap-2.5 pb-2 scrollbar-none snap-x snap-mandatory -mx-4 px-4">
            {popularMovies.map((m) => (
              <div
                key={m.id}
                onClick={() => onOpenAuth('register')}
                className="w-[104px] h-[158px] shrink-0 rounded-[12px] overflow-hidden cursor-pointer relative border-0 bg-[#121212] select-none snap-start shadow-md"
              >
                <div className="w-full h-full relative overflow-hidden bg-[#121212]">
                  <LazyImage
                    src={m.posterUrl}
                    alt={m.title}
                    movieTitle={m.title}
                    titleEn={m.titleEn}
                    originalTitle={'originalTitle' in m ? (m as any).originalTitle : undefined}
                    movieType={m.type}
                    genres={m.genres}
                    year={m.year}
                    wrapperClassName="w-full h-full"
                    className="w-full h-full object-cover"
                  />

                  {/* Side Vignette Накладення (оверлей) */}
                  <div className="absolute inset-0 pointer-events-none z-10 bg-gradient-to-r from-black/40 via-transparent to-black/40" />

                  {/* Floating Рейтинг Бейдж */}
                  <div className="absolute top-1.5 left-1.5 bg-black/60 backdrop-blur-md px-1.5 py-0.5 rounded-[5px] text-[8.5px] font-semibold text-white border border-white/15 flex items-center gap-0.5 z-20 shadow">
                    <Star className="w-2.5 h-2.5 fill-[#FF3040] text-[#FF3040] shrink-0" />
                    <span>{m.rating}</span>
                  </div>

                  {/* Age Бейдж */}
                  {m.ageRating && (
                    <div className="absolute top-1.5 right-1.5 bg-black/60 backdrop-blur-md px-1.5 py-0.5 rounded-[5px] text-[8.5px] font-semibold text-white border border-white/15 z-20 shadow">
                      <span>{m.ageRating}</span>
                    </div>
                  )}

                  {/* Frosted Glass Bottom Panel */}
                  <div className="absolute inset-x-0 bottom-0 pt-6 pb-1.5 px-2 z-20 flex flex-col justify-end text-left pointer-events-none bg-gradient-to-t from-black/95 via-black/70 to-transparent backdrop-blur-[6px]">
                    <h4 className="font-sans font-semibold text-white text-[10px] leading-tight line-clamp-1 w-full truncate">
                      {language === 'ENG' && m.titleEn ? m.titleEn : m.title}
                    </h4>
                    <div className="flex items-center text-[7.5px] text-zinc-300 font-normal w-full truncate font-sans mt-0.5">
                      {m.genres?.slice(0, 2).map((genre, gIdx) => (
                        <React.Fragment key={gIdx}>
                          <span className="text-zinc-300 truncate">{genre}</span>
                          <span className="w-1 h-1 rounded-full bg-[#FF3040] inline-block shrink-0 mx-1" />
                        </React.Fragment>
                      ))}
                      <span className="text-zinc-400">{m.year}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Сітка View */}
          <div className="hidden sm:grid sm:grid-cols-3 lg:grid-cols-6 gap-4 sm:gap-6">
            {popularMovies.map((m) => (
              <div
                key={m.id}
                onClick={() => onOpenAuth('register')}
                className="group relative rounded-[20px] overflow-hidden cursor-pointer aspect-[2/3] flex flex-col border border-white/10 bg-[#121212] transition-all duration-300 hover:scale-[1.03] hover:border-white/25 hover:shadow-[0_16px_36px_rgba(0,0,0,0.85)] hover:shadow-[#FF3040]/10 select-none"
              >
                <div className="w-full h-full relative overflow-hidden bg-[#121212]">
                  <LazyImage
                    src={m.posterUrl}
                    alt={m.title}
                    movieTitle={m.title}
                    titleEn={m.titleEn}
                    originalTitle={'originalTitle' in m ? (m as any).originalTitle : undefined}
                    movieType={m.type}
                    genres={m.genres}
                    year={m.year}
                    wrapperClassName="w-full h-full"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />

                  {/* Side Vignette Накладення (оверлей) on the Картка */}
                  <div className="absolute inset-0 pointer-events-none z-10 bg-gradient-to-r from-black/40 via-transparent to-black/40 shadow-[inset_0_0_24px_rgba(0,0,0,0.6)]" />

                  {/* Floating Glass Бейджі at the top */}
                  <div className="absolute top-3 left-3 bg-black/40 backdrop-blur-md px-2.5 py-1 rounded-[10px] text-xs font-semibold text-white border border-white/15 flex items-center gap-1.5 z-20 shadow-md">
                    <Star className="w-3.5 h-3.5 fill-[#FF3040] text-[#FF3040] shrink-0" />
                    <span className="text-white font-semibold text-xs tracking-tight">{m.rating}</span>
                  </div>

                  {m.ageRating && (
                    <div className="absolute top-3 right-3 bg-black/40 backdrop-blur-md px-2.5 py-1 rounded-[10px] text-xs font-semibold text-white border border-white/15 flex items-center justify-center z-20 shadow-md">
                      <span className="text-white font-semibold text-xs tracking-tight">{m.ageRating}</span>
                    </div>
                  )}

                  {/* Specular Glass Sheen Накладення (оверлей) */}
                  <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-white/15 pointer-events-none mix-blend-overlay z-15" />

                  {/* Frosted Glass Bottom Panel with Backdrop Blur, Vignette & Typography */}
                  <div className="absolute inset-x-0 bottom-0 pt-12 pb-3.5 px-3.5 sm:px-4 z-20 flex flex-col justify-end text-left pointer-events-none bg-gradient-to-t from-black/95 via-black/65 to-transparent backdrop-blur-[8px]">
                    <div className="absolute inset-0 pointer-events-none bg-gradient-to-r from-black/50 via-transparent to-black/50 -z-10" />

                    <h4 className="font-sans font-semibold text-white text-[14px] sm:text-[15px] leading-tight line-clamp-2 w-full text-left group-hover:text-[#FF3040] transition-colors drop-shadow-md">
                      {language === 'ENG' && m.titleEn ? m.titleEn : m.title}
                    </h4>
                    <div className="flex items-center text-[11px] sm:text-[12px] text-zinc-300 font-normal w-full truncate font-sans text-left mt-1.5 drop-shadow-sm">
                      {m.genres?.slice(0, 2).map((genre, gIdx) => (
                        <React.Fragment key={gIdx}>
                          <span className="text-zinc-300">{genre}</span>
                          <span className="w-1.5 h-1.5 rounded-full bg-[#FF3040] inline-block shrink-0 mx-1.5" />
                        </React.Fragment>
                      ))}
                      <span className="text-zinc-400">{m.year}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ Section */}
        <section className="w-full max-w-[1700px] mx-auto px-4 sm:px-12 md:px-16 lg:px-20 py-8 sm:py-16">
          <h2 className="text-base sm:text-3xl font-normal text-white mb-4 sm:mb-10 text-left">
            {language === 'UA' ? 'Популярні питання' : 'Frequently Asked Questions'}
          </h2>

          <div className="space-y-2.5 sm:space-y-6 w-full">
            {faqs.map((faq, idx) => {
              const isOpen = openFaqIndex === idx;
              return (
                <div 
                  key={idx}
                  className="bg-black/80 rounded-[12px] sm:rounded-[20px] overflow-hidden transition-all duration-300 w-full"
                  style={{ filter: 'drop-shadow(0 10px 30px rgba(0, 0, 0, 0.4))', WebkitFilter: 'drop-shadow(0 10px 30px rgba(0, 0, 0, 0.4))' }}
                >
                  <button
                    type="button"
                    onClick={() => toggleFaq(idx)}
                    className="w-full px-4 py-3 sm:px-8 sm:py-6 flex items-center justify-between text-left font-normal text-white text-[12px] sm:text-[18px] md:text-[19px] cursor-pointer select-none transition-colors"
                  >
                    <span className="pr-4 leading-snug">{faq.question}</span>
                    <ChevronDown 
                      className={`w-4 h-4 sm:w-5 sm:h-5 text-white stroke-[2] shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} 
                    />
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-3.5 pt-0 sm:px-8 sm:pb-7 text-[11px] sm:text-[15px] md:text-[15.5px] text-zinc-300 font-normal leading-relaxed max-w-5xl">
                          {faq.answer}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </section>

        {/* Pre-Підвал сайту Call To Action Section */}
        <section className="w-full max-w-[1700px] mx-auto px-4 sm:px-12 md:px-16 lg:px-20 py-10 sm:py-20 text-center">
          <h3 className="text-xs sm:text-2xl md:text-3xl font-medium sm:font-bold text-white mb-4 sm:mb-8 max-w-sm sm:max-w-none mx-auto">
            {language === 'UA' ? 'Готові приєднатися? Реєструйся та поринь у світ CinemaNova' : 'Ready to join? Sign up and dive into CinemaNova'}
          </h3>

          <form onSubmit={handleStartJourney} className="flex flex-col sm:flex-row items-center justify-center gap-2.5 sm:gap-4 max-w-4xl mx-auto w-full">
            <div className="w-full max-w-[340px] sm:max-w-none sm:flex-1 relative">
              <input
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="lisicagood@gmail.com"
                className="w-full bg-[#0a0a0a]/90 backdrop-blur-md border border-white rounded-[10px] sm:rounded-[18px] px-4 sm:px-7 py-2 sm:py-4.5 text-xs sm:text-lg text-white placeholder:text-zinc-500 focus:placeholder-transparent focus:outline-none transition-all duration-200 shadow-lg text-center sm:text-left h-[38px] sm:h-[54px]"
                required
              />
            </div>
            <button
              type="submit"
              className="journey-cta-btn w-full max-w-[340px] sm:max-w-none sm:w-auto h-[38px] sm:h-[54px] border-2 border-transparent hover:border-white/80 active:border-transparent text-white px-5 sm:px-9 rounded-[10px] font-bold text-xs sm:text-[17px] flex items-center justify-center gap-1.5 sm:gap-2 transition-all transform hover:scale-102 active:scale-98 hover:shadow-[0_0_24px_rgba(255,255,255,0.3),0_10px_25px_rgba(215,40,53,0.35)] cursor-pointer shadow-lg shadow-[#FF4D5C]/25 shrink-0 select-none"
            >
              <span>{language === 'ENG' ? 'Start your journey' : 'Розпочніть свою подорож'}</span> <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </form>
        </section>
      </div>

      {/* Standard Підвал сайту */}
      <FooterMain language={language} onNavigate={() => onOpenAuth('login')} />

    </div>
  );
};

export default WelcomePage;
