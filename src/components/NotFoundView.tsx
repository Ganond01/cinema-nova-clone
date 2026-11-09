import React, { useState, useEffect } from 'react';
import { 
  Play, ArrowLeft, Instagram, Youtube, Send
} from 'lucide-react';
import { Movie } from '../types';
import { useLanguage } from '../context/LanguageContext';

interface NotFoundViewProps {
  errorCode?: string;
  errorMessage?: string;
  onGoHome: () => void;
  onGoOffline?: () => void;
  isOfflineMode?: boolean;
  movies?: Movie[];
  onSelectMovie?: (movie: Movie) => void;
}

export default function NotFoundView({ 
  onGoHome,
  movies = [],
  onSelectMovie
}: NotFoundViewProps) {
  const { language } = useLanguage();
  const [variation, setVariation] = useState<0 | 1>(0);
  const [randomBackdrop, setRandomBackdrop] = useState<string>('');

  useEffect(() => {
    // Випадковий вибір теми при завантаженні
    setVariation(Math.random() > 0.5 ? 1 : 0);
    
    // Fetch a random high-Якість backdrop from the Фільми Список to serve as the background screen
    if (movies && movies.length > 0) {
      const moviesWithBackdrop = movies.filter(m => m.backdropUrl);
      const list = moviesWithBackdrop.length > 0 ? moviesWithBackdrop : movies;
      const randomMovie = list[Math.floor(Math.random() * list.length)];
      if (randomMovie && randomMovie.backdropUrl) {
        setRandomBackdrop(randomMovie.backdropUrl);
      }
    }
  }, [movies]);

  const handlePickRandomMovie = () => {
    if (movies && movies.length > 0) {
      const randomMovie = movies[Math.floor(Math.random() * movies.length)];
      if (onSelectMovie) {
        onSelectMovie(randomMovie);
      } else {
        onGoHome();
      }
    } else {
      onGoHome();
    }
  };

  const handleGoBack = () => {
    window.history.back();
  };

  // Дані теми фільму "Крик"
  const screamTheme = {
    titleLine1: language === 'UA' ? 'Сторінку не знайдено.' : 'Page not found.',
    titleLine2: language === 'UA' ? 'Може, вона дивиться щось краще?' : 'Maybe it\'s watching something better?',
    subtitle: language === 'UA'
      ? 'Сторінка, яку ви шукаєте, могла бути видалена, перейменована або пішла на інший сеанс. Але ми підготували для вас щось цікаве!'
      : 'The page you are looking for might have been deleted, renamed, or left for another session. But we have prepared something interesting for you!',
    posterHeadline: language === 'UA' ? 'ЩОСЬ' : 'SOMETHING',
    posterHeadline2: language === 'UA' ? 'СТРАШНО' : 'SCARY',
    posterHeadline3: language === 'UA' ? 'ЦІКАВЕ' : 'GOOD',
    posterSub: language === 'UA' ? 'СКОРО' : 'SOON',
    popcornText: language === 'UA'
      ? 'Поки сторінка загубилась — подивіться щось варте уваги.'
      : 'While the page is lost, check out something worth watching.',
    characterImage: 'https://images.unsplash.com/photo-1601513525393-039382f738e2?q=80&w=800&auto=format&fit=crop',
    hallText: language === 'UA' ? 'ЗАЛ 4' : 'HALL 4',
  };

  // Дані теми фільму "Бійцівський клуб"
  const fightClubTheme = {
    titleLine1: language === 'UA' ? 'Сторінка пішла' : 'The page went',
    titleLine2: language === 'UA' ? 'на перекур.' : 'for a smoke break.',
    subtitle: language === 'UA'
      ? 'Ми не знаємо, куди вона поділася. Але знайдемо щось цікаве для вас.'
      : 'We don\'t know where it went. But we\'ll find something cool for you.',
    posterHeadline: language === 'UA' ? 'ЦЕ БУЛО' : 'IT WAS',
    posterHeadline2: language === 'UA' ? 'ЛЕГЕНДАРНО.' : 'LEGENDARY.',
    posterHeadline3: language === 'UA' ? 'АЛЕ СТОРІНКА' : 'BUT THE PAGE',
    posterSub: language === 'UA' ? 'НІ.' : 'WAS NOT.',
    popcornText: language === 'UA'
      ? 'Поки сторінка відпочиває — подивіться щось круте.'
      : 'While the page is resting, check out something cool.',
    characterImage: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=800&auto=format&fit=crop', // rugged handsome Tyler Durden lookalike
    hallText: language === 'UA' ? 'ЗАЛ 4' : 'HALL 4',
  };

  const currentTheme = variation === 0 ? screamTheme : fightClubTheme;

  return (
    <div className="w-full min-h-screen bg-black text-white flex flex-col lg:flex-row relative overflow-hidden font-sans select-none">
      
      {/* Динамічний Keyframes injected locally */}
      <style>{`
        @keyframes neonFlicker {
          0%, 19%, 21%, 23%, 25%, 54%, 56%, 100% {
            text-shadow: 0 0 8px rgba(229, 9, 20, 0.9), 0 0 15px rgba(229, 9, 20, 0.6), 0 0 25px rgba(229, 9, 20, 0.4);
            border-color: rgba(229, 9, 20, 0.85);
            box-shadow: 0 0 30px rgba(229, 9, 20, 0.45), inset 0 0 15px rgba(229, 9, 20, 0.25);
          }
          20%, 24%, 55% {
            text-shadow: none;
            border-color: rgba(229, 9, 20, 0.15);
            box-shadow: none;
          }
        }
        @keyframes subtleFloat {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-5px) rotate(0.5deg); }
        }
        .neon-glowing-sign {
          animation: neonFlicker 6s infinite alternate;
        }
        .popcorn-box-float {
          animation: subtleFloat 4s infinite ease-in-out;
        }
      `}</style>

      {/* Unified Full-Screen Background Cinema Screen Backdrop */}
      <div className="absolute inset-0 z-0 select-none pointer-events-none">
        <img 
          src={randomBackdrop || "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=1600&auto=format&fit=crop"} 
          alt="" 
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover opacity-25 scale-105 filter contrast-125 brightness-75 transition-all duration-1000"
        />
        {/* Cinematic Overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-black/90 z-10"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_30%,rgba(0,0,0,0.85)_100%)] z-10"></div>
        {/* Subtle red ambient lights */}
        <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-red-600/10 rounded-full blur-[140px] pointer-events-none z-10"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-amber-600/5 rounded-full blur-[140px] pointer-events-none z-10"></div>
      </div>

      {/* LEFT Колонка: Clean Brand, Content & Controls with Fading Backdrop */}
      <div className="w-full lg:w-[42%] p-6 sm:p-10 lg:p-14 xl:p-16 flex flex-col justify-between min-h-screen z-10 relative bg-black/80 lg:bg-gradient-to-r lg:from-black lg:via-black/95 lg:to-transparent">
        
        {/* Top Шапка сайту: Cinema Nova Logo */}
        <div className="flex items-center gap-2.5">
          <div className="w-8.5 h-8.5 rounded-full bg-[#E50914] flex items-center justify-center font-display font-black text-white text-lg shadow-lg shadow-red-950/60 select-none">
            C
          </div>
          <div className="flex flex-col leading-none -space-y-0.5 select-none">
            <span className="font-display font-black text-xs sm:text-[13px] uppercase tracking-widest text-white">cinema</span>
            <span className="font-display font-black text-xs sm:text-[13px] uppercase tracking-widest text-[#E50914]">nova</span>
          </div>
        </div>

        {/* Center Section: Error Опис */}
        <div className="my-auto py-12 lg:py-16 space-y-9 max-w-md">
          
          {/* Big Outline Red 404 Glow */}
          <div className="relative inline-block select-none pointer-events-none">
            <h1 className="font-display font-black text-8xl sm:text-[110px] tracking-tight text-transparent leading-none bg-clip-text bg-gradient-to-b from-[#E50914] to-red-600 [-webkit-text-stroke:1px_rgba(255,255,255,0.02)] drop-shadow-[0_0_40px_rgba(229,9,20,0.65)] select-none">
              404
            </h1>
          </div>

          {/* Heading and subheadings */}
          <div className="space-y-4">
            <h2 className="font-display font-black text-2xl sm:text-[28px] leading-snug tracking-tight text-white uppercase border-l-[5px] border-[#E50914] pl-4 select-none">
              <span className="block">{currentTheme.titleLine1}</span>
              <span className="block text-zinc-300 font-medium text-xl sm:text-2xl mt-0.5 normal-case font-sans">
                {currentTheme.titleLine2}
              </span>
            </h2>
            <p className="text-zinc-400 text-xs sm:text-[13.5px] font-sans leading-relaxed select-none">
              {currentTheme.subtitle}
            </p>
          </div>

          {/* Кнопки Controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 pt-2">
            <button
              onClick={onGoHome}
              className="px-6 py-3.5 bg-[#E50914] hover:bg-red-700 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 active:scale-95 flex items-center justify-center gap-2.5 cursor-pointer shadow-lg shadow-red-950/40"
            >
              <Play className="w-3.5 h-3.5 fill-white text-white" />
              <span>{language === 'UA' ? 'Повернутися на головну' : 'Return to Home'}</span>
            </button>

            <button
              onClick={handleGoBack}
              className="px-6 py-3.5 bg-[#0A0A0C]/85 hover:bg-zinc-900 border border-zinc-900 hover:border-zinc-800 text-zinc-400 hover:text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 active:scale-95 flex items-center justify-center gap-2.5 cursor-pointer"
            >
              <span>{language === 'UA' ? 'Назад' : 'Back'}</span>
              <ArrowLeft className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Interactive Popcorn Content Recommendation Картка */}
          <div className="bg-[#0D0D10]/85 border border-zinc-900/60 p-4 sm:p-4.5 rounded-2xl flex items-center gap-4.5 shadow-xl backdrop-blur-sm relative overflow-hidden group">
            {/* Ambient bottom line glow */}
            <div className="absolute inset-x-0 bottom-0 h-[2px] bg-gradient-to-r from-transparent via-[#E50914]/20 to-transparent"></div>

            {/* Користувацький Popcorn Cup Illustration */}
            <div className="relative w-11 h-14 shrink-0 bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden flex flex-col justify-end p-1 shadow-md popcorn-box-float select-none">
              {/* Vertical red & white Stripes background */}
              <div className="absolute inset-x-0 top-3 bottom-0 bg-gradient-to-r from-red-600 via-white to-red-600 flex">
                <div className="w-[14%] bg-red-600 h-full"></div>
                <div className="w-[14%] bg-white h-full"></div>
                <div className="w-[14%] bg-red-600 h-full"></div>
                <div className="w-[14%] bg-white h-full"></div>
                <div className="w-[14%] bg-red-600 h-full"></div>
                <div className="w-[14%] bg-white h-full"></div>
                <div className="w-[16%] bg-red-600 h-full"></div>
              </div>
              {/* Center Emblem circle */}
              <div className="absolute inset-0 m-auto w-5.5 h-5.5 bg-zinc-950 border border-red-600 rounded-full flex items-center justify-center z-10 shadow">
                <span className="text-[9px] font-black text-red-600">C</span>
              </div>
              {/* Golden Butter Popcorn Kernels pile on top */}
              <div className="absolute -top-1.5 inset-x-0 h-4.5 flex justify-center gap-0.5 overflow-visible">
                <div className="w-2.5 h-2.5 rounded-full bg-amber-100 shadow-sm border border-amber-200/50 group-hover:scale-105 transition-transform duration-300"></div>
                <div className="w-2.2 h-2.2 rounded-full bg-amber-200 shadow-sm -mt-0.5 border border-amber-300/50 group-hover:scale-105 transition-transform duration-300 delay-75"></div>
                <div className="w-3.2 h-3.2 rounded-full bg-amber-100 shadow-sm border border-amber-200/50 group-hover:scale-110 transition-transform duration-300"></div>
                <div className="w-2 h-2 rounded-full bg-amber-200 shadow-sm -mt-1 border border-amber-300/50 group-hover:scale-105 transition-transform duration-300 delay-100"></div>
              </div>
            </div>

            {/* Suggestions Text and Outlined Кнопка */}
            <div className="flex-1 space-y-2">
              <p className="text-[11px] sm:text-[12px] text-zinc-300 font-sans leading-relaxed select-none">
                {currentTheme.popcornText}
              </p>
              
              <button
                onClick={handlePickRandomMovie}
                className="inline-flex items-center gap-2 border border-red-600/30 hover:border-red-600/70 bg-red-950/10 px-3 py-1.5 rounded-lg text-[10px] text-red-500 hover:text-red-400 font-extrabold uppercase tracking-widest cursor-pointer transition-all duration-300"
              >
                <span>{language === 'UA' ? 'Підібрати фільм' : 'Pick a Movie'}</span>
                <span>→</span>
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Підвал сайту Section */}
        <div className="pt-6 border-t border-zinc-900/40 flex flex-col sm:flex-row items-center justify-between gap-4 text-[9px] text-zinc-500 uppercase font-sans font-extrabold tracking-widest select-none">
          <span>
            © 2024 Cinema Nova. {language === 'UA' ? 'Усі права захищені.' : 'All rights reserved.'}
          </span>
          <div className="flex items-center gap-4.5 text-zinc-500">
            <a href="https://instagram.com" target="_blank" rel="noreferrer" className="hover:text-[#E50914] transition-colors">
              <Instagram className="w-3.5 h-3.5" />
            </a>
            <a href="https://youtube.com" target="_blank" rel="noreferrer" className="hover:text-[#E50914] transition-colors">
              <Youtube className="w-3.5 h-3.5" />
            </a>
            <a href="https://t.me" target="_blank" rel="noreferrer" className="hover:text-[#E50914] transition-colors">
              <Send className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>

      {/* RIGHT Колонка: Interactive Cinema Auditorium Overlays */}
      <div className="w-full lg:w-[58%] relative min-h-[480px] lg:min-h-screen overflow-hidden flex items-center justify-center z-10">
        
        {/* Cinematic Room Interactivity & Visual Objects */}
        <div className="relative w-full h-full flex items-center justify-center p-6 sm:p-12">
          
          {/* 1. Framed Left Wall Poster with Glowing Text */}
          <div className="absolute left-[5%] md:left-[8%] bottom-[22%] bg-[#08080A]/95 border border-zinc-900/80 rounded-xl px-4 py-6 w-34 sm:w-40 md:w-44 text-center shadow-[0_15px_40px_rgba(0,0,0,0.85)] z-20 transform -rotate-2 select-none border-t-red-600/25 border-l-red-600/10 flex flex-col justify-between aspect-[3/4.2]">
            <div className="text-[7.5px] text-zinc-600 uppercase font-black tracking-widest font-mono">CINEMA NOVA</div>
            
            <div className="space-y-1 my-auto py-2">
              <h4 className="font-display font-black text-[10px] sm:text-[11px] md:text-xs text-zinc-350 tracking-widest leading-relaxed uppercase">
                {currentTheme.posterHeadline}
              </h4>
              <h4 className="font-display font-black text-[10px] sm:text-[11px] md:text-xs text-zinc-200 tracking-widest leading-relaxed uppercase">
                {currentTheme.posterHeadline2}
              </h4>
              <h4 className="font-display font-black text-[9px] sm:text-[10px] md:text-[11px] text-zinc-450 tracking-widest leading-relaxed uppercase">
                {currentTheme.posterHeadline3}
              </h4>
            </div>

            <p className="text-[9.5px] sm:text-[10.5px] text-[#E50914] font-black tracking-widest uppercase drop-shadow-[0_0_6px_rgba(229,9,20,0.4)] pt-1 border-t border-zinc-900/60 w-full">
              {currentTheme.posterSub}
            </p>
          </div>

          {/* 2. Background Entrance Door with red glowing "ЗАЛ 4" sign */}
          <div className="absolute left-[24%] top-[30%] select-none pointer-events-none z-15">
            <div className="flex flex-col items-center">
              <div className="bg-zinc-950/95 border border-red-600/30 text-red-500 font-extrabold text-[9px] sm:text-[10.5px] px-3.5 py-1.5 rounded-md shadow-[0_0_20px_rgba(239,68,68,0.55),inset_0_0_5px_rgba(239,68,68,0.2)] tracking-widest uppercase animate-pulse">
                {currentTheme.hallText}
              </div>
              {/* Downward neon glow support beam */}
              <div className="w-[1.5px] h-14 bg-gradient-to-b from-red-600/40 to-transparent"></div>
            </div>
          </div>

          {/* 3. The Central Character sitting in a 3D crimson leather cinema seat */}
          <div className="absolute bottom-0 left-[18%] sm:left-[22%] lg:left-[8%] w-[68%] sm:w-[58%] lg:w-[52%] aspect-[3.5/4.5] select-none z-20 pointer-events-none flex items-end justify-center">
            
            {/* Retro Crimson Cinema Seat (Behind the Character) */}
            <div className="absolute bottom-0 w-[90%] h-[75%] bg-gradient-to-t from-[#4a0206] to-[#900e16] border-2 border-[#b51220]/55 rounded-t-[40px] shadow-[0_-12px_35px_rgba(160,16,27,0.45),inset_0_15px_30px_rgba(255,255,255,0.12)] z-0">
              {/* Headrest divide line */}
              <div className="absolute top-[28%] inset-x-0 h-[2px] bg-[#3a0407]/60 border-b border-white/5"></div>
              {/* Cushion crease line */}
              <div className="absolute inset-y-0 left-1/2 w-[1.5px] bg-[#3a0407]/40"></div>
            </div>

            {/* Red Leather Armrests */}
            <div className="absolute bottom-0 -left-[5%] w-[18%] h-[40%] bg-gradient-to-t from-[#360305] to-[#720a10] border border-[#840c13]/40 rounded-full shadow-[0_12px_22px_rgba(0,0,0,0.7)] z-25"></div>
            <div className="absolute bottom-0 -right-[5%] w-[18%] h-[40%] bg-gradient-to-t from-[#360305] to-[#720a10] border border-[#840c13]/40 rounded-full shadow-[0_12px_22px_rgba(0,0,0,0.7)] z-25"></div>

            {/* Right Armrest Cup Holder with Soda Cup */}
            <div className="absolute bottom-[25%] -right-[6%] w-10 h-10 bg-zinc-950 border border-zinc-900 rounded-full flex items-center justify-center z-30 shadow-inner">
              <div className="w-8 h-8 bg-black rounded-full shadow-inner flex items-center justify-center">
                <div className="w-5.5 h-9 bg-zinc-100 border border-zinc-350 rounded-b shadow flex flex-col justify-end p-0.5 relative transform -translate-y-2">
                  <div className="absolute inset-x-0 bottom-0 top-3 bg-[#E50914] flex items-center justify-center">
                    <span className="text-[6.5px] font-black text-white">C</span>
                  </div>
                  {/* Cup Lid */}
                  <div className="absolute top-0 inset-x-0 h-1 bg-zinc-300 rounded-t-sm"></div>
                  {/* Straw */}
                  <div className="absolute -top-2.5 right-1/3 w-0.5 h-3.5 bg-red-400 rounded transform rotate-12"></div>
                </div>
              </div>
            </div>

            {/* The Character Image */}
            <img 
              src={currentTheme.characterImage} 
              alt="" 
              referrerPolicy="no-referrer"
              className="w-full h-full object-contain filter brightness-70 contrast-125 grayscale rounded-2xl drop-shadow-[0_15px_35px_rgba(0,0,0,0.95)] z-10"
            />
          </div>

          {/* 4. Hanging Neon Signboard on Right wall area */}
          <div className="absolute right-4 sm:right-10 lg:right-14 top-1/2 -translate-y-1/2 scale-[0.82] sm:scale-[0.95] md:scale-100 flex flex-col items-center justify-center border-2 border-red-600/70 bg-black/45 backdrop-blur-md px-7 py-8 rounded-3xl shadow-[0_0_35px_rgba(229,9,20,0.55),inset_0_0_20px_rgba(229,9,20,0.3)] neon-glowing-sign text-center space-y-2 select-none w-64 md:w-72 z-35 border-t-red-600/90 border-l-red-600/80">
            {/* Neon glowing outline large 404 */}
            <div className="font-display font-black text-7xl text-transparent relative uppercase leading-none [-webkit-text-stroke:2.5px_#E50914] drop-shadow-[0_0_15px_rgba(229,9,20,0.95)] tracking-tight">
              404
            </div>

            {/* Separator neon line */}
            <div className="w-full h-[1.5px] bg-red-600/35 shadow-[0_0_5px_rgba(229,9,20,0.5)]"></div>

            {/* Neon labels */}
            <div className="space-y-1.5 pt-1.5 w-full">
              <span className="block font-display font-black text-xs md:text-sm text-red-500 uppercase tracking-widest drop-shadow-[0_0_8px_rgba(239,68,68,0.85)]">
                {language === 'UA' ? 'СЦЕНАРІЙ' : 'SCRIPT'}
              </span>
              <span className="block font-display font-black text-xs md:text-sm text-red-500 uppercase tracking-widest drop-shadow-[0_0_8px_rgba(239,68,68,0.85)]">
                {language === 'UA' ? 'НЕ ЗНАЙДЕНО' : 'NOT FOUND'}
              </span>
            </div>

            <p className="text-[8px] sm:text-[9px] text-[#E50914]/90 font-bold uppercase tracking-widest pt-2.5 font-sans">
              {language === 'UA' ? 'Спробуйте інший фільм.' : 'Try another movie.'}
            </p>

            {/* Brand logo details */}
            <div className="flex items-center gap-1.5 pt-4.5 opacity-80 border-t border-zinc-900/40 w-full justify-center">
              <div className="w-3.5 h-3.5 rounded-full bg-[#E50914] flex items-center justify-center text-[7.5px] font-black text-white shadow-sm shadow-red-950">
                C
              </div>
              <span className="text-[7.5px] uppercase font-black text-white tracking-wider font-mono">cinema nova</span>
            </div>
          </div>

          {/* 5. Scattered Popcorn on foreground table */}
          <div className="absolute bottom-[8%] right-[15%] md:right-[22%] z-30 select-none pointer-events-none w-56 flex flex-wrap gap-1.5 justify-center">
            {/* Popcorn Pieces */}
            <div className="w-2.2 h-2.2 rounded-full bg-amber-50 border border-amber-200/50 shadow-sm"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-amber-100 border border-amber-300/40 shadow-sm mt-1"></div>
            <div className="w-1.8 h-1.8 rounded-full bg-amber-50 border border-amber-250 shadow-sm mt-0.5"></div>
            <div className="w-2.4 h-2.4 rounded-full bg-amber-200 border border-amber-300/30 shadow-sm"></div>
            <div className="w-2 h-2 rounded-full bg-amber-50 border border-amber-150 shadow-sm mt-1.5"></div>
            <div className="w-2.2 h-2.2 rounded-full bg-amber-100 border border-amber-250 shadow-sm"></div>
          </div>

          {/* 6. Live Projector Indicator */}
          <div className="absolute bottom-6 right-6 bg-zinc-950/95 border border-zinc-900/80 rounded-xl p-2.5 px-3.5 flex items-center gap-2.5 text-[9px] font-extrabold text-zinc-400 shadow-xl backdrop-blur-md select-none z-30">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="uppercase tracking-widest">{language === 'UA' ? 'ПРОЄКТОР: ОНЛАЙН' : 'PROJECTOR: ONLINE'}</span>
          </div>

        </div>
      </div>
    </div>
  );
}

