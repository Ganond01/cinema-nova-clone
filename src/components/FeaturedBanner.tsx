import React, { useState, useEffect } from 'react';
import { Play, Star, Heart } from 'lucide-react';
import { Movie } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { translateGenre, getMovieTitle, getMovieDescription } from '../lib/translations';
import { validatePosterUrl, handlePosterError } from '../utils/imageFallback';

/**
 * =========================================================================
 * НАЛАШТУВАННЯ СКЛЯНОЇ КРАПЛІ / БУЛЬБАШКИ ГОЛОВНОГО БАНЕРА (HERO GLASS POD CONFIG)
 * =========================================================================
 */
export const HERO_POD_CONFIG = {
  // 1. РОЗМІРИ БУЛЬБАШКИ (Bubble Dimensions)
  width: '820px',                 // Ширина панелі (збільшено з 760px для повного комфортного охоплення тексту)
  height: '820px',               // Висота панелі
  padding: '36px',              // Внутрішній відступ
  bannerHeight: '541px',        // Загальна висота головного банера за Figma (1421x541px)

  // 2. ПОЗИЦІОНУВАННЯ ТА ЗАОКРУГЛЕННЯ БУЛЬБАШКИ
  position: 'absolute' as const,
  top: '50%',
  transform: 'translateY(-50%)',
  left: '-160px',                // Фіксована координата (замість %), що усуває зсув на різних діагоналях (15.6", 24" тощо)

  borderRadius: '50%',          // Головний border-radius бульбашки
  corners: {
    topLeft: '50%',
    topRight: '0%',
    bottomRight: '40%',
    bottomLeft: '0%',
  },

  // 3. ФІКСОВАНА ПОЗИЦІЯ ТА ВІДСТУПИ КОНТЕНТУ В БУЛЬБАШЦІ (Content Layout & Spacing)
  content: {
    left: '30px',               // Відступ контенту та опису зліва в бульбашці (30 пікселів)
    top: '30px',                // Відступ від верху банера (30 пікселів)
    bottom: '30px',             // Фіксована відстань кнопок від низу банера/бульбашки (30 пікселів)
    maxWidth: '490px',          // Безпечна ширина: гарантує, що текст не наповзає на скляний край бульбашки
    paddingRight: '20px',       // Внутрішній відступ праворуч
    badgeToTitleGap: '15px',    // Відступ від бейджа "Новинка" до заголовка (15 пікселів)
    titleToMetaGap: '15px',     // Відступ від заголовка до рядка жанрів/років/рейтингу (15 пікселів)
    metaToDescriptionGap: '15px', // Відступ від рядка метаданих до опису (15 пікселів)
    buttonGap: '30px',          // Відступ між кнопками за Figma (30px)
    heartIconSize: '28px',      // Розмір іконки сердечка (28 пікселів)
  },

  // 4. НАЛАШТУВАННЯ ЗАГОЛОВКА ФІЛЬМУ (Title Text Typography & Font Sizing)
  title: {
    fontSize: '64px',           // Базовий розмір шрифту заголовка на десктопі для звичайних назв
    fontSizeMobile: '16px',     // Розмір шрифту заголовка на мобільних пристроях (16px за запитом)
    autoScaleLongTitles: true,  // Розумна оптимізація: адаптує шрифт для довгих назв, щоб вони не залазили на край бульбашки
    fontWeight: '800',          // Товщина/жирність шрифту (700, 800, 900 тощо)
    lineHeight: '1.08',         // Міжрядковий інтервал (line-height)
    letterSpacing: '-0.02em',   // Трекінг (міжлітерний інтервал)
    color: '#FFFFFF',           // Колір заголовка
    maxLines: 2,                // Максимальна кількість рядків заголовка перед скороченням
  },

  // 5. НАЛАШТУВАННЯ РЯДКА МЕТАДАНИХ: РІК, ЖАНРИ, РЕЙТИНГ (Meta Row: Year, Genres, Rating)
  meta: {
    fontSize: '24px',           // Розмір шрифту метаданих на десктопі (наприклад: '13px', '14px', '24px')
    fontSizeMobile: '6px',      // Розмір шрифту метаданих на мобільних (6px за запитом)
    fontWeight: '600',          // Жирність шрифту метаданих
    color: 'rgba(255, 255, 255, 0.95)', // Основний колір тексту (жанри, рік)
    gap: '8px',                 // Відступ між елементами рядка (жанри, крапки, рік, рейтинг)
    dotColor: '#E52E3D',        // Колір крапки-роздільника
    starSize: '18px',           // Розмір іконки зірочки рейтингу на десктопі
    starSizeMobile: '8px',      // Розмір іконки зірочки рейтингу на мобільному (8px за запитом)
    starColor: '#E52E3D',       // Колір зірочки рейтингу
    ratingColor: '#FFFFFF',     // Колір цифри рейтингу
  },

  // 6. НАЛАШТУВАННЯ ТЕКСТУ ОПИСУ (Description Typography & Font Sizing)
  description: {
    fontSize: '24px',           // Розмір шрифту опису на десктопі (наприклад: '13px', '14px', '24px')
    fontSizeMobile: '6px',      // Розмір шрифту опису на мобільних пристроях (6px за запитом)
    lineHeight: '1.4',          // Міжрядковий інтервал (line-height)
    color: '#D4D4D8',           // Колір тексту опису (світло-сірий zinc-300)
    maxLines: 5,                // Максимальна кількість рядків опису на десктопі
    maxLinesMobile: 2,          // Максимальна кількість рядків опису на мобільних
    paddingRight: '30px',       // Відступ опису від правої сторони (30 пікселів)
  },

  // 7. НАЛАШТУВАННЯ БЕЙДЖА "НОВИНКА" (Figma: 190x37, pad: L56 R56 T8 B8, radius: 10px)
  badge: {
    width: '190px',             // Ширина бейджа за Figma
    height: '37px',             // Висота бейджа за Figma
    fontSize: '15px',           // Розмір тексту бейджа
    borderRadius: '10px',       // Заокруглення бейджа
    topOffset: '30px',          // Відступ від верху банера (30 пікселів)
  },

  // 8. ОПТИЧНІ ВЛАСТИВОСТІ СКЛА (Glass Optical Properties)
  glass: {
    blur: '60px',               // Сила розмиття фону (в px)
    saturation: '120%',         // Насиченість кольорів під склом
    showInnerHighlight: true,   // Внутрішній світловий відблиск по контуру (для десктопу)
    dropShadow: '20px 0 45px rgba(0, 0, 0, 0.6)', // Зовнішня м'яка тінь
  },
};

/**
 * Розраховує оптимальний розмір шрифту заголовка для десктопу,
 * щоб довгі назви не вилазили за межі бульбашки та не торкалися її краю.
 */
function getOptimalTitleFontSize(title: string, baseFontSize: string): string {
  if (!HERO_POD_CONFIG.title.autoScaleLongTitles) return baseFontSize;
  const base = parseInt(baseFontSize, 10) || 64;
  const len = title ? title.trim().length : 0;

  if (len > 44) {
    // Дуже довгі назви (>44 симв., напр. "Puella Magi Madoka Magica the Movie...")
    return `${Math.max(28, Math.round(base * 0.55))}px`; // 64px -> ~35px
  }
  if (len > 28) {
    // Довгі назви (29-44 симв., напр. "I Want to Love You Till Your Dying Day")
    return `${Math.max(34, Math.round(base * 0.68))}px`; // 64px -> ~44px
  }
  if (len > 18) {
    // Середні назви (19-28 симв.)
    return `${Math.max(40, Math.round(base * 0.80))}px`; // 64px -> ~51px
  }
  // Короткі назви (<=18 симв.) отримують повний розмір
  return `${base}px`;
}

interface FeaturedBannerProps {
  featuredMovies: Movie[];
  onSelectMovie: (movie: Movie) => void;
  onPlayMovie: (movie: Movie) => void;
  onToggleFavorite?: (movieId: string) => void;
  favorites?: string[];
}

export default React.memo(function FeaturedBanner({
  featuredMovies,
  onSelectMovie,
  onPlayMovie,
  onToggleFavorite,
  favorites = [],
}: FeaturedBannerProps) {
  const { language } = useLanguage();
  const [heroIndex, setHeroIndex] = useState(0);
  const [isHeroHovered, setIsHeroHovered] = useState(false);

  // Auto-cycle hero banner every 9 seconds with smooth animation (pauses on Користувач hover)
  useEffect(() => {
    if (!featuredMovies || featuredMovies.length <= 1 || isHeroHovered) return;
    const interval = setInterval(() => {
      setHeroIndex((prev) => (prev + 1) % featuredMovies.length);
    }, 9000);
    return () => clearInterval(interval);
  }, [featuredMovies?.length, isHeroHovered]);

  if (!featuredMovies || featuredMovies.length === 0) return null;

  const currentMovie = featuredMovies[heroIndex % featuredMovies.length] || featuredMovies[0];
  const isFavorite = currentMovie ? favorites.includes(currentMovie.id) : false;

  const currentTitle = getMovieTitle(currentMovie, language);
  const optimalTitleFontSize = getOptimalTitleFontSize(currentTitle, HERO_POD_CONFIG.title.fontSize);

  // Build the CSS border-radius string dynamically from HERO_POD_CONFIG
  const podBorderRadius = HERO_POD_CONFIG.borderRadius ||
    `${HERO_POD_CONFIG.corners.topLeft} ${HERO_POD_CONFIG.corners.topRight} ${HERO_POD_CONFIG.corners.bottomRight} ${HERO_POD_CONFIG.corners.bottomLeft}`;


  return (
    <section
      onMouseEnter={() => setIsHeroHovered(true)}
      onMouseLeave={() => setIsHeroHovered(false)}
      className="relative w-full md:max-w-[1421px] mx-auto rounded-[12px] md:rounded-[16px] overflow-hidden bg-[#141414] border-0 md:border md:border-[#262626] shadow-2xl flex items-stretch group/hero select-none h-[152px] md:h-[541px] min-h-[152px] md:min-h-[541px]"
    >
      {/* 1. Background Poster Image (Optimized: renders current Фільм with smooth fade) */}
      <div className="absolute inset-0 z-0 overflow-hidden bg-[#0e0e11]">
        <img
          key={currentMovie.id}
          src={validatePosterUrl(currentMovie.backdropUrl || currentMovie.posterUrl, currentMovie.title, currentMovie.type, currentMovie.genres)}
          alt={currentMovie.title}
          referrerPolicy="no-referrer"
          onError={(e) => handlePosterError(e, currentMovie.backdropUrl || currentMovie.posterUrl)}
          className="absolute inset-0 w-full h-full object-cover object-center md:object-right transition-opacity duration-700 ease-in-out opacity-100"
        />
      </div>

      {/* 2. Curved Frosted Glass Pod (Visible on BOTH на мобільних та ПК) */}
      <div
        className="z-10 pointer-events-none absolute top-1/2 -translate-y-1/2 -left-[45px] sm:-left-[55px] md:-left-[160px] w-[235px] h-[235px] sm:w-[260px] sm:h-[260px] md:w-[820px] md:h-[820px]"
        style={{
          borderRadius: podBorderRadius,
        }}
      >
        {/* Atmospheric Blur & Glow Layer Directly Behind The Bubble */}
        <div
          className="absolute inset-0 pointer-events-none -z-10"
          style={{
            borderRadius: podBorderRadius,
            filter: 'blur(30px)',
            WebkitFilter: 'blur(30px)',
            background: 'radial-gradient(circle at center, rgba(0, 0, 0, 0.6) 0%, rgba(10, 10, 14, 0.4) 60%, transparent 85%)',
          }}
        />

        {/* Isolated Glass Pod Underlay with backdrop blur */}
        <div
          className="hero-glass-underlay absolute inset-0 pointer-events-none z-0 overflow-hidden"
          style={{
            borderRadius: podBorderRadius,
            backdropFilter: 'blur(35px) saturate(140%)',
            WebkitBackdropFilter: 'blur(35px) saturate(140%)',
          }}
        >
          {/* Blurred Poster Background Layer */}
          <div
            className="absolute pointer-events-none top-1/2 left-0 -translate-y-1/2 scale-108 w-full h-[152px] md:h-[541px]"
            style={{
              filter: `blur(${HERO_POD_CONFIG.glass.blur}) saturate(${HERO_POD_CONFIG.glass.saturation})`,
              WebkitFilter: `blur(${HERO_POD_CONFIG.glass.blur}) saturate(${HERO_POD_CONFIG.glass.saturation})`,
              willChange: 'transform, opacity',
            }}
          >
            <img
              key={`blur-${currentMovie.id}`}
              src={validatePosterUrl(currentMovie.backdropUrl || currentMovie.posterUrl, currentMovie.title, currentMovie.type, currentMovie.genres)}
              alt=""
              referrerPolicy="no-referrer"
              className="absolute inset-0 w-full h-full object-cover object-center md:object-right transition-opacity duration-700 ease-in-out opacity-100"
            />
          </div>

          {/* Dark Frosted Glass Tint Gradient Накладення (оверлей) */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12) 0%, rgba(20, 20, 24, 0.45) 42%, rgba(10, 10, 12, 0.7) 100%)',
            }}
          />
        </div>
      </div>

      {/* 3. Inner Content Layer */}
      <div
        className="relative z-20 flex flex-col justify-start pointer-events-auto p-0 left-3 sm:left-4 md:left-[30px] top-2 sm:top-2.5 md:top-[30px] max-w-[195px] sm:max-w-[220px] md:max-w-[490px] overflow-hidden"
        style={{
          position: 'absolute',
          paddingRight: HERO_POD_CONFIG.content?.paddingRight || '20px',
        }}
      >
        <style>{`
          .hero-title-custom { font-size: ${optimalTitleFontSize}; }
          .hero-meta-custom { font-size: ${HERO_POD_CONFIG.meta.fontSize}; }
          .hero-desc-custom { font-size: ${HERO_POD_CONFIG.description.fontSize}; }
          .hero-glass-underlay {
            box-shadow: inset 1px 1px 1.5px 0 rgba(255, 255, 255, 0.65), inset -4px -8px 24px rgba(0, 0, 0, 0.38), 20px 0 45px rgba(0, 0, 0, 0.6);
          }
          @media (max-width: 767px) {
            .hero-glass-underlay {
              box-shadow: inset -4px -8px 24px rgba(0, 0, 0, 0.38), 20px 0 45px rgba(0, 0, 0, 0.6) !important;
            }
            .hero-title-custom { 
              font-size: ${HERO_POD_CONFIG.title.fontSizeMobile} !important; 
              line-height: 19px !important;
            }
            .hero-meta-custom { font-size: ${HERO_POD_CONFIG.meta.fontSizeMobile} !important; }
            .hero-desc-custom { font-size: ${HERO_POD_CONFIG.description.fontSizeMobile} !important; }
          }
        `}</style>

        {/* Top: Badge "Новинка" */}
        <div 
          className="bg-[#FAFAFA] text-[#FF3040] font-bold text-[7px] sm:text-[9px] md:text-[15px] flex items-center justify-center shadow-md self-start font-sans tracking-wide shrink-0 select-none px-1 md:px-0 w-auto md:w-[190px] h-[14px] sm:h-[18px] md:h-[37px] rounded-[4px] md:rounded-[10px] mb-[10px] md:mb-[15px]"
        >
          {language === 'UA' ? 'Новинка' : 'New'}
        </div>

        {/* Middle: Заголовок, Info Рядок, Опис */}
        <div 
          key={currentMovie.id} 
          className="flex flex-col animate-hero-fade overflow-hidden"
        >
          {/* Заголовок: 16px on mobile, w152 h38 px */}
          <h1 
            style={{
              fontWeight: HERO_POD_CONFIG.title.fontWeight,
              lineHeight: 1.12,
              letterSpacing: HERO_POD_CONFIG.title.letterSpacing,
              color: HERO_POD_CONFIG.title.color,
              wordBreak: 'break-word',
            }}
            className="w-[152px] h-[38px] md:w-auto md:h-auto font-sans drop-shadow-sm tracking-tight text-[16px] md:text-[64px] font-extrabold line-clamp-2 md:line-clamp-none mb-0.5 md:mb-[15px] hero-title-custom"
          >
            {currentTitle}
          </h1>

          {/* Subtitle Info Рядок: 6px on mobile, star 8px */}
          <div 
            className="flex items-center font-sans text-[6px] md:text-[24px] gap-1 md:gap-2 mb-1 md:mb-[15px] text-zinc-300 font-medium whitespace-nowrap hero-meta-custom"
          >
            {currentMovie.genres?.slice(0, 1).map((genre: any) => (
              <React.Fragment key={genre}>
                <span className="truncate max-w-[70px] md:max-w-none">{translateGenre(genre, language)}</span>
                <span className="text-[#E52E3D]">●</span>
              </React.Fragment>
            ))}
            <span className="shrink-0">{currentMovie.year}</span>
            <span className="text-[#E52E3D]">●</span>
            <div 
              className="flex items-center gap-0.5 md:gap-1 font-bold shrink-0 text-white"
            >
              <Star 
                className="w-[8px] h-[8px] md:w-[18px] md:h-[18px] fill-[#E52E3D] text-[#E52E3D]"
              />
              <span>{typeof currentMovie.rating === 'number' ? currentMovie.rating.toFixed(1) : currentMovie.rating}</span>
            </div>
          </div>

          {/* Опис: 6px on mobile, line-clamp-2 */}
          <p 
            style={{
              lineHeight: HERO_POD_CONFIG.description.lineHeight,
              color: HERO_POD_CONFIG.description.color,
              paddingRight: HERO_POD_CONFIG.description.paddingRight || '20px',
              WebkitLineClamp: HERO_POD_CONFIG.description.maxLines,
              display: '-webkit-box',
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
            className="font-sans font-normal text-[6px] md:text-[24px] line-clamp-2 md:line-clamp-5 hero-desc-custom block"
          >
            {getMovieDescription(currentMovie, language)}
          </p>
        </div>
      </div>

      {/* 4. Action Кнопки: Watch w64 h15, Details w64 h15, Favorite w8 h8 */}
      <div 
        className="absolute z-30 flex items-center pointer-events-auto left-3 sm:left-4 md:left-[30px] bottom-1.5 sm:bottom-2.5 md:bottom-[30px] gap-1.5 sm:gap-2 md:gap-[30px]"
      >
        <button
          onClick={() => onPlayMovie(currentMovie)}
          className="journey-cta-btn border border-transparent hover:border-white/80 active:border-transparent text-white w-[64px] h-[15px] md:w-[179px] md:h-[39px] rounded-[4px] md:rounded-[10px] font-bold text-[6.5px] md:text-base flex items-center justify-center gap-1 md:gap-2 transition-all transform hover:scale-102 active:scale-98 hover:shadow-[0_0_24px_rgba(255,255,255,0.3),0_10px_25px_rgba(215,40,53,0.35)] shadow-md shadow-[#FF4D5C]/25 cursor-pointer select-none"
        >
          <span className="w-2 h-2 md:w-5 md:h-5 rounded-full border border-white/80 flex items-center justify-center shrink-0">
            <Play className="w-[3px] h-[3px] md:w-2.5 md:h-2.5 fill-white ml-0.2" />
          </span>
          <span>{language === 'UA' ? 'Дивитися' : 'Watch'}</span>
        </button>

        <button
          onClick={() => onSelectMovie(currentMovie)}
          className="relative flex items-center justify-center w-[64px] h-[15px] md:w-auto md:px-6 md:h-[39px] bg-transparent hover:bg-white/10 active:scale-95 text-white font-semibold text-[6.5px] md:text-sm rounded-[4px] md:rounded-[10px] transition-all cursor-pointer group"
        >
          <span
            className="absolute inset-0 rounded-[4px] md:rounded-[10px] pointer-events-none"
            style={{
              padding: '1px',
              background: 'linear-gradient(135deg, #FFFFFF 0%, #D72835 100%)',
              WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
              mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
              WebkitMaskComposite: 'xor',
              maskComposite: 'exclude',
            }}
          />
          <span className="relative z-10">{language === 'UA' ? 'Детальніше' : 'Details'}</span>
        </button>

        {/* Hero Banner Favorite Кнопка: w8 h8 on mobile */}
        {onToggleFavorite && (
          <button
            onClick={() => onToggleFavorite(currentMovie.id)}
            className="relative w-[8px] h-[8px] md:w-[39px] md:h-[39px] rounded-[4px] md:rounded-[10px] bg-transparent hover:bg-white/10 active:scale-95 text-white/90 hover:text-white transition-all cursor-pointer flex items-center justify-center shrink-0 group border-none p-0"
            aria-label="Add to favorites"
            title={isFavorite ? (language === 'UA' ? 'В обраному' : 'In Favorites') : (language === 'UA' ? 'Додати в обране' : 'Add to Favorites')}
          >
            <Heart className={`w-[8px] h-[8px] md:w-5 md:h-5 transition-colors ${isFavorite ? 'fill-[#FF4D5C] text-[#FF4D5C]' : 'text-zinc-300 group-hover:text-white'}`} />
          </button>
        )}
      </div>
    </section>
  );
});
