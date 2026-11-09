import React, { useState, useMemo, useRef, useEffect } from 'react';
import { ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Star } from 'lucide-react';
import { Movie } from '../types';
import { DORAMAS_LIST } from '../data/doramas';
import { useLanguage } from '../context/LanguageContext';
import { translateGenre } from '../lib/translations';
import { validatePosterUrl, handlePosterError } from '../utils/imageFallback';

const capsuleGlassStyle: React.CSSProperties = {
  backdropFilter: 'blur(24px) saturate(190%)',
  WebkitBackdropFilter: 'blur(24px) saturate(190%)',
  backgroundColor: 'rgba(18, 18, 24, 0.65)',
};

interface DoramasViewProps {
  onSelectMovie: (movie: Movie) => void;
  onPlayMovie: (movie: Movie) => void;
}

export default function DoramasView({
  onSelectMovie,
  onPlayMovie
}: DoramasViewProps) {
  const { language } = useLanguage();

  // Фільтри Стан
  const [selectedGenre, setSelectedGenre] = useState<string>('all');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedRating, setSelectedRating] = useState<string>('all');
  const [selectedLang, setSelectedLang] = useState<string>('all');

  const [openDropdown, setOpenDropdown] = useState<'genre' | 'year' | 'rating' | 'lang' | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 25;

  const dropdownRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenDropdown(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Жанри and Years extracted from DORAMAS_LIST
  const genresList = useMemo(() => {
    const set = new Set<string>();
    DORAMAS_LIST.forEach(d => {
      d.genres?.forEach(g => set.add(g));
    });
    return ['all', ...Array.from(set)];
  }, []);

  const yearsList = useMemo(() => {
    const set = new Set<number>();
    DORAMAS_LIST.forEach(d => {
      if (d.year) set.add(d.year);
    });
    return ['all', ...Array.from(set).sort((a, b) => b - a).map(String)];
  }, []);

  // Фільтрація logic
  const filteredDoramas = useMemo(() => {
    return DORAMAS_LIST.filter(item => {
      if (selectedGenre !== 'all' && (!item.genres || !item.genres.includes(selectedGenre))) {
        return false;
      }
      if (selectedYear !== 'all' && String(item.year) !== selectedYear) {
        return false;
      }
      if (selectedRating !== 'all') {
        const minRating = parseFloat(selectedRating);
        if (!item.rating || item.rating < minRating) return false;
      }
      return true;
    });
  }, [selectedGenre, selectedYear, selectedRating, selectedLang]);

  const [mobileVisibleCount, setMobileVisibleCount] = useState<number>(itemsPerPage);
  const [isMobile, setIsMobile] = useState<boolean>(() => typeof window !== 'undefined' && window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Reset pagination & mobileVisibleCount on Фільтрація changes
  useEffect(() => {
    setCurrentPage(1);
    setMobileVisibleCount(itemsPerPage);
  }, [selectedGenre, selectedYear, selectedRating, selectedLang]);

  const totalPages = Math.ceil(filteredDoramas.length / itemsPerPage) || 1;
  const displayedDoramas = useMemo(() => {
    if (isMobile) {
      return filteredDoramas.slice(0, mobileVisibleCount);
    }
    const start = (currentPage - 1) * itemsPerPage;
    return filteredDoramas.slice(start, start + itemsPerPage);
  }, [filteredDoramas, isMobile, mobileVisibleCount, currentPage, itemsPerPage]);

  return (
    <div className="min-h-screen text-white font-sans space-y-6 pb-20 pt-1 w-full max-w-[1430px] mx-auto">
      {/* Шапка сайту section with Заголовок, Subtitle and Фільтри on the right */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div className="space-y-2">
          <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
            {language === 'UA' ? 'Дорами' : 'Doramas'}
          </h1>
          <p className="text-sm md:text-base text-zinc-400 font-normal max-w-2xl">
            {language === 'UA'
              ? 'Знаходь улюблені фільми, відкривай нові історії та насолоджуйся переглядом.'
              : 'Find your favorite movies, discover new stories and enjoy watching.'}
          </p>
        </div>

        {/* Фільтрація Випадаючі списки on the right */}
        <div ref={dropdownRef} className="flex flex-wrap items-center gap-3 sm:gap-4 relative z-50 shrink-0">
          {/* Жанр Випадаюче меню */}
          <div className="relative">
            <button
              onClick={() => setOpenDropdown(openDropdown === 'genre' ? null : 'genre')}
              className={`cinema-filter-pill ${openDropdown === 'genre' ? 'invisible pointer-events-none' : ''}`}
            >
              <span className="relative z-10">
                {selectedGenre === 'all' 
                  ? (language === 'UA' ? 'Жанр' : 'Genre')
                  : translateGenre(selectedGenre, language)}
              </span>
              <ChevronDown className="w-4 h-4 relative z-10 text-zinc-400" />
            </button>

            {openDropdown === 'genre' && (
              <div style={capsuleGlassStyle} className="cinema-filter-capsule left-0 animate-in fade-in zoom-in-95 duration-150">
                <button
                  onClick={() => setOpenDropdown(null)}
                  className="cinema-capsule-header"
                >
                  <span className="relative z-20">
                    {selectedGenre === 'all' 
                      ? (language === 'UA' ? 'Жанр' : 'Genre')
                      : translateGenre(selectedGenre, language)}
                  </span>
                  <ChevronUp className="w-4 h-4 relative z-20 text-white" />
                </button>

                <div className="cinema-capsule-list custom-scrollbar">
                  <button
                    onClick={() => { setSelectedGenre('all'); setOpenDropdown(null); setCurrentPage(1); }}
                    className={`cinema-capsule-item ${selectedGenre === 'all' ? 'item-active' : ''}`}
                  >
                    {language === 'UA' ? 'Усі жанри' : 'All genres'}
                  </button>
                  {genresList.filter(g => g !== 'all').map(genre => (
                    <button
                      key={genre}
                      onClick={() => { setSelectedGenre(genre); setOpenDropdown(null); setCurrentPage(1); }}
                      className={`cinema-capsule-item ${selectedGenre === genre ? 'item-active' : ''}`}
                    >
                      {translateGenre(genre, language)}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Year Випадаюче меню */}
          <div className="relative">
            <button
              onClick={() => setOpenDropdown(openDropdown === 'year' ? null : 'year')}
              className={`cinema-filter-pill ${openDropdown === 'year' ? 'invisible pointer-events-none' : ''}`}
            >
              <span className="relative z-10">
                {selectedYear === 'all' 
                  ? (language === 'UA' ? 'Рік' : 'Year')
                  : selectedYear}
              </span>
              <ChevronDown className="w-4 h-4 relative z-10 text-zinc-400" />
            </button>

            {openDropdown === 'year' && (
              <div style={capsuleGlassStyle} className="cinema-filter-capsule left-0 animate-in fade-in zoom-in-95 duration-150">
                <button
                  onClick={() => setOpenDropdown(null)}
                  className="cinema-capsule-header"
                >
                  <span className="relative z-20">
                    {selectedYear === 'all' 
                      ? (language === 'UA' ? 'Рік' : 'Year')
                      : selectedYear}
                  </span>
                  <ChevronUp className="w-4 h-4 relative z-20 text-white" />
                </button>

                <div className="cinema-capsule-list custom-scrollbar">
                  <button
                    onClick={() => { setSelectedYear('all'); setOpenDropdown(null); setCurrentPage(1); }}
                    className={`cinema-capsule-item ${selectedYear === 'all' ? 'item-active' : ''}`}
                  >
                    {language === 'UA' ? 'Усі роки' : 'All years'}
                  </button>
                  {yearsList.filter(y => y !== 'all').map(yr => (
                    <button
                      key={yr}
                      onClick={() => { setSelectedYear(yr); setOpenDropdown(null); setCurrentPage(1); }}
                      className={`cinema-capsule-item ${selectedYear === yr ? 'item-active' : ''}`}
                    >
                      {yr}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Рейтинг Випадаюче меню */}
          <div className="relative">
            <button
              onClick={() => setOpenDropdown(openDropdown === 'rating' ? null : 'rating')}
              className={`cinema-filter-pill ${openDropdown === 'rating' ? 'invisible pointer-events-none' : ''}`}
            >
              <span className="relative z-10">
                {selectedRating === 'all'
                  ? (language === 'UA' ? 'Рейтинг' : 'Rating')
                  : `★ ${selectedRating}+`}
              </span>
              <ChevronDown className="w-4 h-4 relative z-10 text-zinc-400" />
            </button>

            {openDropdown === 'rating' && (
              <div style={capsuleGlassStyle} className="cinema-filter-capsule right-0 animate-in fade-in zoom-in-95 duration-150">
                <button
                  onClick={() => setOpenDropdown(null)}
                  className="cinema-capsule-header"
                >
                  <span className="relative z-20">
                    {selectedRating === 'all'
                      ? (language === 'UA' ? 'Рейтинг' : 'Rating')
                      : `★ ${selectedRating}+`}
                  </span>
                  <ChevronUp className="w-4 h-4 relative z-20 text-white" />
                </button>

                <div className="cinema-capsule-list custom-scrollbar">
                  <button
                    onClick={() => { setSelectedRating('all'); setOpenDropdown(null); setCurrentPage(1); }}
                    className={`cinema-capsule-item ${selectedRating === 'all' ? 'item-active' : ''}`}
                  >
                    {language === 'UA' ? 'Усі рейтинги' : 'All ratings'}
                  </button>
                  {['8.5', '8.0', '7.5', '7.0'].map(r => (
                    <button
                      key={r}
                      onClick={() => { setSelectedRating(r); setOpenDropdown(null); setCurrentPage(1); }}
                      className={`cinema-capsule-item ${selectedRating === r ? 'item-active' : ''}`}
                    >
                      ★ {r}+
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Language Випадаюче меню */}
          <div className="relative">
            <button
              onClick={() => setOpenDropdown(openDropdown === 'lang' ? null : 'lang')}
              className={`cinema-filter-pill ${openDropdown === 'lang' ? 'invisible pointer-events-none' : ''}`}
            >
              <span className="relative z-10">
                {selectedLang === 'all' 
                  ? (language === 'UA' ? 'Мова' : 'Language')
                  : selectedLang}
              </span>
              <ChevronDown className="w-4 h-4 relative z-10 text-zinc-400" />
            </button>

            {openDropdown === 'lang' && (
              <div style={capsuleGlassStyle} className="cinema-filter-capsule right-0 animate-in fade-in zoom-in-95 duration-150">
                <button
                  onClick={() => setOpenDropdown(null)}
                  className="w-full h-10 px-4 flex items-center justify-center gap-2 text-sm font-medium text-white cursor-pointer select-none relative z-20"
                >
                  <span className="relative z-20">
                    {selectedLang === 'all' 
                      ? (language === 'UA' ? 'Мова' : 'Language')
                      : selectedLang}
                  </span>
                  <ChevronUp className="w-4 h-4 relative z-20 text-white" />
                </button>

                <div className="w-[85%] mx-auto h-[1px] bg-white/15 my-0.5 relative z-20" />

                <div className="flex flex-col py-1.5 max-h-[500px] overflow-y-auto custom-scrollbar relative z-20">
                  <button
                    onClick={() => { setSelectedLang('all'); setOpenDropdown(null); setCurrentPage(1); }}
                    className={`w-full py-1.5 px-2 text-center text-xs sm:text-[13px] font-medium leading-snug transition-all duration-150 cursor-pointer select-none ${
                      selectedLang === 'all'
                        ? 'text-[#FF3040] font-bold drop-shadow-[0_0_8px_rgba(255,48,64,0.7)]'
                        : 'text-zinc-200 hover:text-white hover:drop-shadow-[0_0_6px_rgba(255,255,255,0.6)]'
                    }`}
                  >
                    {language === 'UA' ? 'Усі мови' : 'All Languages'}
                  </button>
                  {['Українська', 'Корейська', 'Англійська'].map(l => (
                    <button
                      key={l}
                      onClick={() => { setSelectedLang(l); setOpenDropdown(null); setCurrentPage(1); }}
                      className={`w-full py-1.5 px-2 text-center text-xs sm:text-[13px] font-medium leading-snug transition-all duration-150 cursor-pointer select-none ${
                        selectedLang === l
                          ? 'text-[#FF3040] font-bold drop-shadow-[0_0_8px_rgba(255,48,64,0.7)]'
                          : 'text-zinc-200 hover:text-white hover:drop-shadow-[0_0_6px_rgba(255,255,255,0.6)]'
                      }`}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3 Колонки on Mobile matching HomeView, 5 Колонки on Desktop */}
      <div className="grid grid-cols-3 justify-items-center sm:justify-items-stretch sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-[10px] sm:gap-4 lg:gap-5 xl:gap-[30px] pt-2">
        {displayedDoramas.map((dorama) => {
          const titleText = language === 'ENG' && dorama.titleEn ? dorama.titleEn : dorama.title;

          return (
            <div
              key={dorama.id}
              onClick={() => onSelectMovie(dorama)}
              className="group cursor-pointer flex flex-col space-y-2 select-none"
            >
              {/* Poster Картка */}
              <div className="w-[104px] h-[158px] min-w-[104px] max-w-[104px] sm:w-full sm:h-auto sm:min-w-0 sm:max-w-none aspect-[104/158] sm:aspect-[2/3] relative rounded-[16px] bg-[#121212] border-0 sm:border sm:border-white/10 sm:hover:border-transparent poster-hover-notif-border transition-all duration-300 ease-out shadow-lg sm:hover:shadow-[0_0_28px_rgba(255,48,64,0.35)]">
                <div className="relative w-full h-full overflow-hidden bg-[#121212] rounded-[15px]">
                  {/* 1. Base Фільм Poster Image */}
                <img
                  src={validatePosterUrl(dorama.posterUrl, dorama.title, dorama.type, dorama.genres)}
                  alt={dorama.title}
                  className="w-full h-full object-cover transition-transform duration-500 ease-out sm:group-hover:scale-[1.03]"
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  onError={(e) => handlePosterError(e, dorama.posterUrl, dorama.title, dorama.type, dorama.genres, dorama.year, dorama.titleEn, dorama.originalTitle)}
                />

                {/* Side Vignette Накладення (оверлей) on the Картка */}
                <div className="absolute inset-0 pointer-events-none z-10 bg-gradient-to-r from-black/40 via-transparent to-black/40 shadow-[inset_0_0_24px_rgba(0,0,0,0.6)]" />

                {/* Floating Бейджі on Mobile: w32.58px h14.13px, gap 26px */}
                <div className="absolute top-1.5 inset-x-0 px-[6.42px] flex items-center justify-between z-30 pointer-events-none sm:hidden">
                  <div className="w-[32.58px] h-[14.13px] text-white rounded-[4px] flex items-center justify-center gap-0.5 bg-black/50 backdrop-blur-md border border-white/15 shadow-sm">
                    <Star className="w-[8px] h-[8px] fill-[#FF3040] text-[#FF3040] shrink-0" />
                    <span className="text-white font-bold text-[7px] tracking-tight leading-none">{dorama.rating?.toFixed(1) || '8.0'}</span>
                  </div>
                  <div className="w-[32.58px] h-[14.13px] text-white rounded-[4px] flex items-center justify-center bg-black/50 backdrop-blur-md border border-white/15 shadow-sm">
                    <span className="text-white font-bold text-[7px] tracking-tight leading-none">{dorama.ageRating || '16+'}</span>
                  </div>
                </div>

                {/* Floating Glass Бейджі at the top on Desktop */}
                {/* Рейтинг Бейдж */}
                <div 
                  className="hidden sm:flex absolute top-3 left-3 text-white px-3 py-1 rounded-[10px] text-xs font-semibold items-center gap-1.5 z-30 transition-all pointer-events-none bg-black/50 backdrop-blur-md border border-white/15 shadow-sm group-hover:bg-white/10 group-hover:border-white/25 duration-300"
                >
                  <Star className="w-3.5 h-3.5 fill-[#FF3040] text-[#FF3040] shrink-0" />
                  <span className="text-white font-bold text-xs tracking-tight">{dorama.rating?.toFixed(1) || '8.0'}</span>
                </div>

                {/* Age Рейтинг Бейдж */}
                <div 
                  className="hidden sm:flex absolute top-3 right-3 text-white px-3 py-1 rounded-[10px] text-xs font-semibold z-30 transition-all pointer-events-none items-center justify-center bg-black/50 backdrop-blur-md border border-white/15 shadow-sm group-hover:bg-white/10 group-hover:border-white/25 duration-300"
                >
                  <span className="text-white font-bold text-xs tracking-tight">{dorama.ageRating || '16+'}</span>
                </div>

                {/* Specular Glass Sheen Накладення (оверлей) */}
                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-white/15 pointer-events-none mix-blend-overlay z-15" />

                {/* Frosted Glass Bottom Panel with Backdrop Blur */}
                <div 
                  className="absolute inset-x-0 bottom-0 z-20 flex flex-col justify-start p-1.5 sm:px-4 sm:pt-[22px] sm:pb-4 w-[104px] h-[52px] sm:w-full sm:h-auto bg-gradient-to-t from-black/95 via-black/80 to-transparent backdrop-blur-[10px] pointer-events-none transition-all duration-300 ease-out"
                >
                  <h4 className="font-sans font-bold text-white text-[8px] sm:text-[17px] leading-tight line-clamp-1 sm:line-clamp-2 w-full sm:w-[239px] sm:max-w-full sm:h-[42px] text-left drop-shadow-md">
                    {titleText}
                  </h4>
                  
                  <div className="flex items-center text-[6px] sm:text-[11.5px] text-zinc-300 font-normal w-full whitespace-nowrap overflow-hidden font-sans text-left mt-0.5 sm:mt-[22px] drop-shadow-sm gap-1 sm:gap-1.5">
                    {dorama.genres?.slice(0, 2).map((genre, idx) => (
                      <React.Fragment key={genre}>
                        {idx > 0 && <span className="w-0.5 h-0.5 sm:w-1 sm:h-1 rounded-full bg-[#FF3040] inline-block shrink-0" />}
                        <span className="text-zinc-300 truncate">{translateGenre(genre, language)}</span>
                      </React.Fragment>
                    ))}
                    <span className="w-0.5 h-0.5 sm:w-1 sm:h-1 rounded-full bg-[#FF3040] inline-block shrink-0" />
                    <span className="text-zinc-400 shrink-0">{dorama.year}</span>
                  </div>

                  {/* Short Опис expansion on hover */}
                  <div className="grid grid-rows-[0fr] group-hover:grid-rows-[1fr] transition-all duration-300 ease-out">
                    <div className="overflow-hidden">
                      <p className="text-xs sm:text-[12.5px] text-zinc-200/90 font-sans leading-relaxed line-clamp-4 mt-2.5 pt-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-75">
                        {language === 'ENG' && dorama.descriptionEn ? dorama.descriptionEn : (dorama.description || (language === 'UA' ? 'Захоплююча дорама про любов, інтриги та щирі людські почуття.' : 'A captivating story.'))}
                      </p>
                    </div>
                  </div>
                </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Mobile 'Завантажити ще' (Load More) Button */}
      {isMobile && mobileVisibleCount < filteredDoramas.length && (
        <div className="pt-6 pb-2 flex justify-center md:hidden">
          <button
            type="button"
            onClick={() => {
              setMobileVisibleCount(prev => prev + itemsPerPage);
            }}
            className="journey-cta-btn border border-transparent hover:border-white/80 active:border-transparent text-white w-[175px] h-[28px] rounded-[6px] font-bold text-xs flex items-center justify-center gap-1.5 transition-all transform hover:scale-102 active:scale-98 hover:shadow-[0_0_24px_rgba(255,255,255,0.3),0_10px_25px_rgba(215,40,53,0.35)] shadow-md shadow-[#FF4D5C]/25 cursor-pointer select-none"
          >
            <span>{language === 'UA' ? 'Завантажити ще' : 'Load more'}</span>
          </button>
        </div>
      )}

      {/* Pagination Controls on Desktop */}
      <div className="hidden md:flex items-center justify-center gap-4 pt-8 pb-4">
        <button
          onClick={() => {
            if (currentPage > 1) {
              setCurrentPage(p => p - 1);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }
          }}
          disabled={currentPage === 1}
          className="w-11 h-11 rounded-full border border-white/20 bg-[#161616]/80 hover:bg-white/10 hover:border-white/40 text-zinc-300 hover:text-white flex items-center justify-center transition-colors duration-150 disabled:opacity-30 disabled:hover:bg-[#161616]/80 disabled:hover:border-white/20 disabled:hover:text-zinc-500 disabled:cursor-not-allowed cursor-pointer shadow-lg"
          aria-label="Previous Page"
        >
          <ChevronLeft className="w-5 h-5 text-white" />
        </button>

        <button
          onClick={() => {
            if (currentPage < totalPages) {
              setCurrentPage(p => p + 1);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }
          }}
          disabled={currentPage === totalPages}
          className="w-11 h-11 rounded-full border border-white/20 bg-[#161616]/80 hover:bg-white/10 hover:border-white/40 text-zinc-300 hover:text-white flex items-center justify-center transition-colors duration-150 disabled:opacity-30 disabled:hover:bg-[#161616]/80 disabled:hover:border-white/20 disabled:hover:text-zinc-500 disabled:cursor-not-allowed cursor-pointer shadow-lg"
          aria-label="Next Page"
        >
          <ChevronRight className="w-5 h-5 text-white" />
        </button>
      </div>
    </div>
  );
}
