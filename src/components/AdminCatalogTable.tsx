import React, { useState, useMemo, useEffect } from 'react';
import { Search, ChevronRight, ChevronLeft, Star, Settings, Trash2 } from 'lucide-react';
import { Movie } from '../types';
import { Language } from '../lib/translations';
import { LazyImage } from './LazyImage';

interface AdminCatalogTableProps {
  movies: Movie[];
  onSelectMovie: (movie: Movie) => void;
  startEditMovie: (movie: Movie) => void;
  handleDeleteMovie: (id: string) => void;
  startNewMovie: (type?: 'movie' | 'series') => void;
  language: Language;
}

const AdminCatalogRow = React.memo(function AdminCatalogRow({
  movie,
  onSelectMovie,
  startEditMovie,
  handleDeleteMovie,
  language
}: {
  movie: Movie;
  onSelectMovie: (movie: Movie) => void;
  startEditMovie: (movie: Movie) => void;
  handleDeleteMovie: (id: string) => void;
  language: Language;
}) {
  return (
    <tr 
      onClick={() => onSelectMovie(movie)}
      className="hover:bg-white/[0.04] transition-colors group cursor-pointer"
    >
      {/* Poster and Заголовок Картка - fixed w: 250px, h: 102px with left 2:3 poster and right glass Накладення (оверлей) */}
      <td className="py-3 px-4">
        <div className="relative w-[250px] h-[102px] rounded-2xl overflow-hidden bg-[#121212] border-0 shrink-0 shadow-lg flex items-center">
          {/* Ліворуч: Вертикальний постер 2:3 */}
          <div className="w-[68px] h-full shrink-0 relative overflow-hidden bg-black">
            <LazyImage 
              src={movie.posterUrl || movie.backdropUrl} 
              alt={movie.title} 
              wrapperClassName="w-full h-full"
              className="w-full h-full object-cover object-top" 
              referrerPolicy="no-referrer"
            />
          </div>

          {/* Right: Glass Контейнер with underlying backdrop image */}
          <div className="flex-1 min-w-0 h-full relative flex items-center justify-center overflow-hidden">
            {/* Фонове зображення підкладки */}
            <LazyImage 
              src={movie.backdropUrl || movie.posterUrl} 
              alt="" 
              wrapperClassName="absolute inset-0 w-full h-full"
              className="w-full h-full object-cover scale-110" 
              referrerPolicy="no-referrer"
            />

            {/* Glass Накладення (оверлей) with backdrop blur & subtle border */}
            <div className="absolute inset-0 backdrop-blur-md bg-black/45 border-l border-white/20 shadow-inner" />

            {/* Заголовок text */}
            <span className="relative z-10 w-full px-2.5 break-words text-white font-medium text-xs sm:text-[13px] leading-snug tracking-wide line-clamp-3 font-sans drop-shadow-md text-center">
              {movie.title}
            </span>
          </div>
        </div>
      </td>

      {/* Тип контенту */}
      <td className="py-3 px-4 text-zinc-300 font-normal">
        {movie.type === 'movie' 
          ? (language === 'UA' ? 'Фільм' : 'Movie') 
          : (language === 'UA' ? 'Серіал' : 'Series')}
      </td>

      {/* Рік випуску */}
      <td className="py-3 px-4 text-zinc-300 font-normal">
        {movie.year}
      </td>

      {/* Рейтинг */}
      <td className="py-3 px-4 text-zinc-300 font-normal">
        <span className="inline-flex items-center gap-1">
          <Star className="w-3.5 h-3.5 text-[#F22E3D] fill-[#F22E3D]" />
          <span>{movie.rating}</span>
        </span>
      </td>

      {/* Режисер */}
      <td className="py-3 px-4 text-zinc-300 font-normal">
        {movie.director || 'Едгар Алан По'}
      </td>

      {/* Дії */}
      <td className="py-3 px-4 text-right">
        <div className="flex items-center justify-end gap-3" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              startEditMovie(movie);
            }}
            className="p-1.5 text-zinc-300 hover:text-white transition-colors cursor-pointer"
            title={language === 'UA' ? 'Налаштування' : 'Settings'}
          >
            <Settings className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteMovie(movie.id);
            }}
            className="p-1.5 text-[#F22E3D] hover:text-red-400 transition-colors cursor-pointer"
            title={language === 'UA' ? 'Видалити' : 'Delete'}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </td>
    </tr>
  );
});

export default function AdminCatalogTable({
  movies,
  onSelectMovie,
  startEditMovie,
  handleDeleteMovie,
  startNewMovie,
  language
}: AdminCatalogTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const PAGE_SIZE = 25;
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Фільтрація Фільми by Пошук query
  const filteredMovies = useMemo(() => {
    if (!searchQuery.trim()) return movies;
    const q = searchQuery.toLowerCase();
    return movies.filter(m => 
      m.title.toLowerCase().includes(q) || 
      (m.originalTitle && m.originalTitle.toLowerCase().includes(q)) ||
      (m.genres && m.genres.some(g => g.toLowerCase().includes(q)))
    );
  }, [movies, searchQuery]);

  // Reset to page 1 whenever Пошук query changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  // Розрахунок меж пагінації
  const totalItems = filteredMovies.length;
  const totalPages = Math.ceil(totalItems / PAGE_SIZE) || 1;

  // Ensure currentPage doesn't exceed totalPages when Фільми Список changes
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(Math.max(1, totalPages));
    }
  }, [totalPages, currentPage]);

  // Slice Фільми for current page
  const paginatedMovies = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    return filteredMovies.slice(startIndex, startIndex + PAGE_SIZE);
  }, [filteredMovies, currentPage]);

  const startDisplayItem = totalItems === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const endDisplayItem = Math.min(currentPage * PAGE_SIZE, totalItems);

  return (
    <div className="space-y-6 bg-[#000000] p-1 sm:p-2 rounded-2xl">
      {/* Пошук bar & Add Фільм Кнопка Рядок */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 font-sans text-xs">
        <div className="relative w-full max-w-xl">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={language === 'UA' ? 'Пошук за назвою або жанром' : 'Search by title or genre'}
            className="w-full py-2.5 pl-11 pr-5 bg-[#000000] border border-white/30 rounded-full text-white placeholder-zinc-400 text-xs sm:text-sm focus:outline-none focus:border-white/60 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => startNewMovie('movie')}
            style={{ background: 'linear-gradient(180deg, #FF4D5C 0%, #D72835 100%)' }}
            className="px-5 py-2.5 hover:brightness-110 active:scale-95 text-white font-medium text-xs sm:text-sm rounded-full flex items-center gap-1.5 transition-all shadow-md shadow-[#FF4D5C]/20 cursor-pointer shrink-0"
          >
            <span>{language === 'UA' ? '+ Додати фільм' : '+ Add Movie'}</span>
          </button>
          <button
            type="button"
            onClick={() => startNewMovie('series')}
            className="px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-750 active:scale-95 text-zinc-300 hover:text-white font-medium text-xs sm:text-sm rounded-full flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
          >
            <span>{language === 'UA' ? '+ Серіал / Аніме' : '+ Series / Anime'}</span>
          </button>
        </div>
      </div>

      {/* Каталог Table */}
      <div className="overflow-x-auto bg-[#000000]">
        <table className="w-full text-left border-collapse text-xs sm:text-sm font-sans">
          <thead>
            <tr className="text-zinc-300 font-normal border-b border-white/10">
              <th className="py-4 px-4 font-normal">{language === 'UA' ? 'Постер та назва' : 'Poster and title'}</th>
              <th className="py-4 px-4 font-normal">{language === 'UA' ? 'Тип' : 'Type'}</th>
              <th className="py-4 px-4 font-normal">{language === 'UA' ? 'Рік' : 'Year'}</th>
              <th className="py-4 px-4 font-normal">{language === 'UA' ? 'Рейтинг' : 'Rating'}</th>
              <th className="py-4 px-4 font-normal">{language === 'UA' ? 'Режисер' : 'Director'}</th>
              <th className="py-4 px-4 text-right font-normal">{language === 'UA' ? 'Дії' : 'Actions'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {paginatedMovies.length > 0 ? (
              paginatedMovies.map((movie) => (
                <AdminCatalogRow
                  key={movie.id}
                  movie={movie}
                  onSelectMovie={onSelectMovie}
                  startEditMovie={startEditMovie}
                  handleDeleteMovie={handleDeleteMovie}
                  language={language}
                />
              ))
            ) : (
              <tr>
                <td colSpan={6} className="py-12 text-center text-zinc-500 font-medium">
                  {language === 'UA' ? 'Фільмів не знайдено' : 'No movies found'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Підвал сайту Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-white/10 font-sans text-xs text-zinc-300">
        {/* Загальна статистика */}
        <div className="flex items-center gap-3">
          <span className="font-medium text-zinc-400">
            {language === 'UA' 
              ? `Показано ${startDisplayItem}–${endDisplayItem} з ${totalItems}` 
              : `Showing ${startDisplayItem}–${endDisplayItem} of ${totalItems}`}
          </span>
        </div>

        {/* Page Навігація Кнопки */}
        {totalPages > 1 && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-xl border border-zinc-800 bg-[#121212] hover:bg-white/10 text-zinc-300 hover:text-white transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
              title={language === 'UA' ? 'Попередня сторінка' : 'Previous page'}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Page number pill Кнопки */}
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => {
                // Інтелектуальне відображення номерів сторінок
                if (
                  totalPages > 7 &&
                  pageNum !== 1 &&
                  pageNum !== totalPages &&
                  Math.abs(pageNum - currentPage) > 1
                ) {
                  if (pageNum === 2 && currentPage > 3) return <span key={pageNum} className="px-1 text-zinc-600">...</span>;
                  if (pageNum === totalPages - 1 && currentPage < totalPages - 2) return <span key={pageNum} className="px-1 text-zinc-600">...</span>;
                  return null;
                }

                return (
                  <button
                    key={`page-num-${pageNum}`}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`min-w-[32px] h-[32px] px-2 rounded-xl text-xs font-bold transition flex items-center justify-center cursor-pointer ${
                      currentPage === pageNum 
                        ? 'bg-gradient-to-b from-[#FF4D5C] to-[#D72835] text-white shadow-md shadow-[#FF4D5C]/30' 
                        : 'bg-[#121212] hover:bg-white/10 text-zinc-400 hover:text-white border border-zinc-800'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-2 rounded-xl border border-zinc-800 bg-[#121212] hover:bg-white/10 text-zinc-300 hover:text-white transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
              title={language === 'UA' ? 'Наступна сторінка' : 'Next page'}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
