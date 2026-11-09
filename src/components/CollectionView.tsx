import React, { useMemo } from 'react';
import { ChevronLeft, Star } from 'lucide-react';
import { motion } from 'motion/react';
import { Movie } from '../types';
import { CollectionItem } from '../data/collectionsData';
import { useLanguage } from '../context/LanguageContext';
import { translateGenre, getMovieTitle, getMovieDescription } from '../lib/translations';
import { validatePosterUrl, handlePosterError } from '../utils/imageFallback';

interface CollectionViewProps {
  collection: CollectionItem;
  movies: Movie[];
  onBack: () => void;
  onSelectMovie: (movie: Movie) => void;
  onPlayMovie?: (movie: Movie) => void;
}

export default function CollectionView({
  collection,
  movies,
  onBack,
  onSelectMovie,
}: CollectionViewProps) {
  const { language } = useLanguage();

  // Find all Фільми belonging to this collection in curated order
  const collectionMovies = useMemo(() => {
    if (collection.movieIds && collection.movieIds.length > 0) {
      const list: Movie[] = [];
      for (const id of collection.movieIds) {
        const found = movies.find((m) => m.id === id);
        if (found) {
          list.push(found);
        }
      }
      if (list.length > 0) return list;
    }

    if (collection.queryFilter) {
      const q = collection.queryFilter.toLowerCase();
      return movies.filter(
        (m) =>
          (m.title && m.title.toLowerCase().includes(q)) ||
          (m.titleEn && m.titleEn.toLowerCase().includes(q)) ||
          (m.genres && m.genres.some((g) => g && g.toLowerCase().includes(q)))
      );
    }

    return movies.slice(0, 6);
  }, [collection, movies]);

  const titleText = language === 'ENG' && collection.titleEn ? collection.titleEn : collection.title;
  const descriptionText =
    language === 'ENG' && collection.descriptionEn ? collection.descriptionEn : collection.description;
  const metaLineText =
    language === 'ENG' && collection.metaLineEn ? collection.metaLineEn : collection.metaLine;
  const metaParts = metaLineText ? metaLineText.split('•') : [];

  // Текст лічильника
  const countLabel =
    language === 'ENG' && collection.countTextEn
      ? collection.countTextEn
      : collection.countText;

  // Resolve Динамічний background image from the Фільм / Серіал / anime items in this collection
  const backdropImage = useMemo(() => {
    // 1. Look for a backdrop in the collection's Фільми from the database
    const movieWithBackdrop = collectionMovies.find(
      (m) => m.backdropUrl && typeof m.backdropUrl === 'string' && m.backdropUrl.startsWith('http')
    );
    if (movieWithBackdrop?.backdropUrl) {
      return movieWithBackdrop.backdropUrl;
    }

    // 2. Look for stills in the collection's Фільми
    const movieWithStill = collectionMovies.find(
      (m) => m.stills && m.stills.length > 0 && m.stills[0].startsWith('http')
    );
    if (movieWithStill?.stills?.[0]) {
      return movieWithStill.stills[0];
    }

    // 3. Collection bgUrl from data
    if (collection.bgUrl && collection.bgUrl.startsWith('http')) {
      return collection.bgUrl;
    }

    // 4. Fallback to first Фільм poster or collection poster
    return collectionMovies[0]?.posterUrl || collection.posterUrl;
  }, [collectionMovies, collection.bgUrl, collection.posterUrl]);

  return (
    <div className="relative min-h-screen font-sans text-white overflow-hidden -mx-4 md:-mx-6 lg:-mx-8 -mt-4 md:-mt-6 lg:-mt-8 p-4 sm:p-6 lg:p-8 pb-20">
      {/* 1. Page Background Photo — exact size w1757 h595 centered */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1757px] max-w-[100vw] h-[595px] pointer-events-none z-0 overflow-hidden gpu-layer select-none">
        <img
          src={backdropImage}
          alt=""
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover object-top filter blur-[2px] opacity-55 scale-105 transform-gpu"
        />
        {/* Side vignette matching anime / Фільми page */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#080808]/70 via-transparent to-[#080808]/70" />
        {/* Top-to-bottom fade: image visible at top, fades to #080808 at bottom */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#080808]/20 via-[#080808]/10 to-[#080808]" />
      </div>

      {/* Main Content Контейнер with responsive max-width centered */}
      <div className="relative z-10 max-w-[1430px] mx-auto space-y-6">
        {/* 2. Top Navigation Bar: "Назад до пошуку" */}
        <div className="pt-3 sm:pt-5 mb-4">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-zinc-400 hover:text-white transition-colors cursor-pointer text-[13px] sm:text-sm font-medium py-1 select-none group"
          >
            <ChevronLeft className="w-4 h-4 text-zinc-400 group-hover:-translate-x-0.5 transition-transform" />
            <span>{language === 'UA' ? 'Назад до пошуку' : 'Back to search'}</span>
          </button>
        </div>

        {/* 3. Collection Hero Шапка сайту (NO Картка Контейнер border, directly on page) */}
        <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-start gap-6 sm:gap-8 lg:gap-10 pt-2">
          {/* Left: Portrait poster matching reference 2nd photo (w262 h292.87) */}
          <div className="w-[262px] h-[292.87px] shrink-0 rounded-[20px] overflow-hidden shadow-[0_20px_45px_rgba(0,0,0,0.85)] border border-white/10 bg-[#151515] relative select-none">
            <img
              src={collection.posterUrl}
              alt={collection.title}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src =
                  'https://static.yakaboo.ua/media/catalog/product/9/7/9786171276895.jpg';
              }}
            />
          </div>

          {/* Right: Заголовок, Metadata with red dots, and Synopsis */}
          <div className="flex-1 flex flex-col justify-center text-center sm:text-left pt-1">
            <h1 className="text-3xl sm:text-4xl lg:text-[44px] font-black text-white tracking-tight leading-tight">
              {titleText}
            </h1>

            {/* Meta line with bright red bullet dots */}
            <div className="flex items-center justify-center sm:justify-start flex-wrap gap-2 text-sm sm:text-[15px] font-semibold text-zinc-200 mt-2.5">
              {metaParts.map((part, idx) => (
                <React.Fragment key={idx}>
                  {idx > 0 && (
                    <span className="text-[#FF3040] font-bold text-base leading-none select-none">•</span>
                  )}
                  <span>{part.trim()}</span>
                </React.Fragment>
              ))}
              {countLabel && (
                <>
                  <span className="text-[#FF3040] font-bold text-base leading-none select-none">•</span>
                  <span className="text-zinc-300">{countLabel}</span>
                </>
              )}
            </div>

            {/* Synopsis */}
            <p className="text-zinc-300 text-sm sm:text-[15px] font-normal leading-relaxed max-w-2xl mt-3.5">
              {descriptionText}
            </p>
          </div>
        </div>

        {/* 4. "В колекції" Section — lowered down with spacious margin matching reference photo */}
        <div className="relative z-10 mt-20 sm:mt-24 md:mt-28">
          <h2 className="text-2xl sm:text-[28px] font-bold text-white tracking-tight">
            {language === 'UA' ? 'В колекції' : 'In Collection'}
          </h2>
          <p className="text-xs sm:text-[13px] text-zinc-400 font-normal mt-1">
            {countLabel}
          </p>

          {/* 5-Колонка Сітка on desktop, 3-Колонка on mobile */}
          <div className="grid grid-cols-3 justify-items-center sm:justify-items-stretch sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5 sm:gap-4 lg:gap-5 xl:gap-[30px] mt-5">
            {collectionMovies.map((movie, index) => {
              const title = getMovieTitle(movie, language);
              const movieDesc = getMovieDescription(movie, language);

              return (
                <motion.div
                  key={movie.id}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: Math.min(index * 0.03, 0.25) }}
                  onClick={() => onSelectMovie(movie)}
                  className="w-[104px] h-[158px] min-w-[104px] max-w-[104px] sm:w-full sm:h-auto sm:min-w-0 sm:max-w-none aspect-[104/158] sm:aspect-[2/3] group relative rounded-[16px] cursor-pointer flex flex-col border-0 sm:border sm:border-white/10 bg-[#121212] transition-all duration-300 ease-out sm:hover:border-transparent sm:hover:shadow-[0_0_28px_rgba(255,48,64,0.35)] poster-hover-notif-border select-none"
                >
                  {/* Poster image Контейнер */}
                  <div className="relative w-full h-full overflow-hidden bg-[#121212] rounded-[15px]">
                    {/* Base Фільм Poster Image */}
                    <img
                      src={validatePosterUrl(movie.posterUrl, movie.title, movie.type, movie.genres)}
                      alt={movie.title}
                      className="w-full h-full object-cover transition-transform duration-500 ease-out sm:group-hover:scale-[1.03]"
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      onError={(e) =>
                        handlePosterError(
                          e,
                          movie.posterUrl,
                          movie.title,
                          movie.type,
                          movie.genres,
                          movie.year,
                          movie.titleEn,
                          movie.originalTitle
                        )
                      }
                    />

                    {/* Side Vignette Накладення (оверлей) on the Картка */}
                    <div className="absolute inset-0 pointer-events-none z-10 bg-gradient-to-r from-black/40 via-transparent to-black/40 shadow-[inset_0_0_24px_rgba(0,0,0,0.6)]" />

                    {/* Floating Бейджі on Mobile: w32.58px h14.13px, gap 26px */}
                    <div className="absolute top-1.5 inset-x-0 px-[6.42px] flex items-center justify-between z-30 pointer-events-none md:hidden">
                      <div className="w-[32.58px] h-[14.13px] text-white rounded-[4px] flex items-center justify-center gap-0.5 bg-black/50 backdrop-blur-md border border-white/15 shadow-sm">
                        <Star className="w-[8px] h-[8px] fill-[#FF3040] text-[#FF3040] shrink-0" />
                        <span className="text-white font-bold text-[7px] tracking-tight leading-none">
                          {typeof movie.rating === 'number' ? movie.rating.toFixed(1) : movie.rating}
                        </span>
                      </div>
                      <div className="w-[32.58px] h-[14.13px] text-white rounded-[4px] flex items-center justify-center bg-black/50 backdrop-blur-md border border-white/15 shadow-sm">
                        <span className="text-white font-bold text-[7px] tracking-tight leading-none">{movie.ageRating || '16+'}</span>
                      </div>
                    </div>

                    {/* Desktop Floating Бейджі */}
                    <div className="hidden md:flex absolute top-3 left-3 text-white px-3 py-1 rounded-[10px] text-xs font-semibold items-center gap-1.5 z-30 transition-all pointer-events-none bg-black/50 backdrop-blur-md border border-white/15 shadow-sm group-hover:bg-white/10 group-hover:border-white/25 duration-300">
                      <Star className="w-3.5 h-3.5 fill-[#FF3040] text-[#FF3040] shrink-0" />
                      <span className="text-white font-bold text-xs tracking-tight">
                        {typeof movie.rating === 'number' ? movie.rating.toFixed(1) : movie.rating}
                      </span>
                    </div>

                    <div className="hidden md:flex absolute top-3 right-3 text-white px-3 py-1 rounded-[10px] text-xs font-semibold z-30 transition-all pointer-events-none items-center justify-center bg-black/50 backdrop-blur-md border border-white/15 shadow-sm group-hover:bg-white/10 group-hover:border-white/25 duration-300">
                      <span className="text-white font-bold text-xs tracking-tight">
                        {movie.ageRating || '16+'}
                      </span>
                    </div>

                    {/* Specular Glass Sheen Накладення (оверлей) */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-white/15 pointer-events-none mix-blend-overlay z-15" />

                    {/* Нижня скляна панель з ефектом розмиття фону */}
                    <div className="absolute inset-x-0 bottom-0 z-20 flex flex-col justify-end sm:justify-start p-1.5 sm:px-4 sm:pt-[22px] sm:pb-4 w-[104px] h-[52px] md:w-full md:h-auto bg-gradient-to-t from-black/95 via-black/80 to-transparent backdrop-blur-[10px] pointer-events-none transition-all duration-300 ease-out">
                      <h4 className="font-sans font-bold text-white text-[8px] sm:text-[17px] leading-tight line-clamp-1 sm:line-clamp-2 break-words w-full sm:w-[239px] sm:max-w-full sm:h-[42px] text-left drop-shadow-md">
                        {title}
                      </h4>

                      <div className="flex items-center text-[6px] sm:text-[11.5px] text-zinc-300 font-normal w-full whitespace-nowrap overflow-hidden font-sans text-left mt-0.5 sm:mt-[22px] drop-shadow-sm gap-1 sm:gap-1.5">
                        {movie.genres?.slice(0, 2).map((genre, idx) => (
                          <React.Fragment key={genre}>
                            {idx > 0 && (
                              <span className="w-0.5 h-0.5 sm:w-1 sm:h-1 rounded-full bg-[#FF3040] inline-block shrink-0" />
                            )}
                            <span className="text-zinc-300 truncate">{translateGenre(genre, language)}</span>
                          </React.Fragment>
                        ))}
                        <span className="w-0.5 h-0.5 sm:w-1 sm:h-1 rounded-full bg-[#FF3040] inline-block shrink-0" />
                        <span className="text-zinc-400 shrink-0">{movie.year}</span>
                      </div>

                      {/* Short Опис expansion on hover */}
                      <div className="grid grid-rows-[0fr] group-hover:grid-rows-[1fr] transition-all duration-300 ease-out">
                        <div className="overflow-hidden">
                          <p className="text-xs sm:text-[12.5px] text-zinc-200/90 font-sans leading-relaxed line-clamp-4 mt-2.5 pt-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-75">
                            {movieDesc ||
                              (language === 'UA'
                                ? 'Захоплююча кіноісторія, сповнена несподіваних поворотів долі та незабутніх емоцій.'
                                : 'A captivating story full of unexpected twists.')}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
