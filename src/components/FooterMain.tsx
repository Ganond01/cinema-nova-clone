import React from 'react';
import { ChevronRight } from 'lucide-react';
import Logo from './Logo';

interface FooterMainProps {
  language?: 'UA' | 'ENG';
  onNavigate?: (tab: string) => void;
}

export const FooterMain: React.FC<FooterMainProps> = ({ language = 'UA', onNavigate }) => {
  return (
    <footer className="relative z-40 w-full max-w-[393px] md:max-w-none min-h-[233px] mx-auto md:mx-0 cinema-footer text-zinc-400 font-sans text-xs pt-4 md:pt-12 pb-6 md:pb-12 px-4 sm:px-6 md:pl-[148px] md:pr-6 lg:pr-8 mt-[35px] md:mt-0 mb-0 md:my-0 shrink-0 select-none">
      <div className="relative z-10 w-full max-w-[1430px] mx-auto space-y-[32px] md:space-y-7">
        
        {/* Top Шапка сайту Рядок: Logo on Left, Опис on Right */}
        <div className="flex flex-row items-center justify-between gap-4">
          {/* Logo */}
          <div className="shrink-0">
            <Logo onClick={() => onNavigate && onNavigate('home')} size="md" className="scale-75 md:scale-100 origin-left" />
          </div>

          {/* Slogan / Опис */}
          <div className="text-right text-[8px] md:text-[13px] text-zinc-400 font-normal max-w-[140px] sm:max-w-xs md:max-w-lg leading-tight md:leading-relaxed">
            {language === 'UA' ? (
              <span>
                CINEMA NOVA - твій простір для перегляду фільмів і серіалів. Легко знаходь, обирай і насолоджуйся улюбленим кіно.
              </span>
            ) : (
              <span>
                CINEMA NOVA - your space for streaming movies and TV series. Easily find, choose, and enjoy your favorite cinema.
              </span>
            )}
          </div>
        </div>

        {/* Call center / questions line */}
        <div className="text-[12px] md:text-sm text-zinc-300">
          {language === 'UA' ? (
            <span>
              Маєте запитання? Зателефонуйте за номером{' '}
              <a href="tel:0800609226" className="text-[#FF3040] underline underline-offset-2 hover:text-[#ff4d5c] font-medium transition-colors">
                0800 609 226
              </a>
            </span>
          ) : (
            <span>
              Questions? Call{' '}
              <a href="tel:0800609226" className="text-[#FF3040] underline underline-offset-2 hover:text-[#ff4d5c] font-medium transition-colors">
                0800 609 226
              </a>
            </span>
          )}
        </div>

        {/* Top Divider */}
        <div className="w-full h-[1px] bg-[#22232A]" />

        {/* 2-Колонка on Mobile, 4-Колонка on Desktop Links Сітка (12px on mobile) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-y-3.5 gap-x-4 md:gap-x-8 text-[12px] md:text-[13px]">
          {/* Колонка 1 */}
          <div className="space-y-2.5 md:space-y-3.5">
            <button 
              type="button"
              onClick={() => {
                if (onNavigate) onNavigate('faq');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }} 
              className="flex items-center gap-1.5 md:gap-2 text-white group cursor-pointer text-left w-fit"
            >
              <ChevronRight className="w-2 h-2 md:w-3.5 md:h-3.5 text-[#FF3040] stroke-[2.5] shrink-0" />
              <span className="group-hover:underline group-active:underline underline-offset-4 decoration-1 decoration-white">
                {language === 'UA' ? 'Поширені запитання' : 'FAQ'}
              </span>
            </button>
            <button 
              type="button"
              onClick={() => {
                if (onNavigate) onNavigate('privacy');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }} 
              className="flex items-center gap-1.5 md:gap-2 text-white group cursor-pointer text-left w-fit"
            >
              <ChevronRight className="w-2 h-2 md:w-3.5 md:h-3.5 text-[#FF3040] stroke-[2.5] shrink-0" />
              <span className="group-hover:underline group-active:underline underline-offset-4 decoration-1 decoration-white">
                {language === 'UA' ? 'Конфіденційність' : 'Privacy Policy'}
              </span>
            </button>
            <button 
              type="button"
              onClick={() => {
                if (onNavigate) onNavigate('speedtest');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }} 
              className="flex items-center gap-1.5 md:gap-2 text-white group cursor-pointer text-left w-fit"
            >
              <ChevronRight className="w-2 h-2 md:w-3.5 md:h-3.5 text-[#FF3040] stroke-[2.5] shrink-0" />
              <span className="group-hover:underline group-active:underline underline-offset-4 decoration-1 decoration-white">
                {language === 'UA' ? 'Перевірка швидкості' : 'Speed Test'}
              </span>
            </button>
          </div>

          {/* Колонка 2 */}
          <div className="space-y-2.5 md:space-y-3.5">
            <button 
              type="button"
              onClick={() => {
                if (onNavigate) onNavigate('ways-to-watch');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }} 
              className="flex items-center gap-1.5 md:gap-2 text-white group cursor-pointer text-left w-fit"
            >
              <ChevronRight className="w-2 h-2 md:w-3.5 md:h-3.5 text-[#FF3040] stroke-[2.5] shrink-0" />
              <span className="group-hover:underline group-active:underline underline-offset-4 decoration-1 decoration-white">
                {language === 'UA' ? 'Способи перегляду' : 'Ways to Watch'}
              </span>
            </button>
            <button 
              type="button"
              onClick={() => {
                if (onNavigate) onNavigate('corporate');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }} 
              className="flex items-center gap-1.5 md:gap-2 text-white group cursor-pointer text-left w-fit"
            >
              <ChevronRight className="w-2 h-2 md:w-3.5 md:h-3.5 text-[#FF3040] stroke-[2.5] shrink-0" />
              <span className="group-hover:underline group-active:underline underline-offset-4 decoration-1 decoration-white">
                {language === 'UA' ? 'Корпоративна інформація' : 'Corporate Information'}
              </span>
            </button>
            <button 
              type="button"
              onClick={() => {
                if (onNavigate) onNavigate('exclusives');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }} 
              className="flex items-center gap-1.5 md:gap-2 text-white group cursor-pointer text-left w-fit"
            >
              <ChevronRight className="w-2 h-2 md:w-3.5 md:h-3.5 text-[#FF3040] stroke-[2.5] shrink-0" />
              <span className="group-hover:underline group-active:underline underline-offset-4 decoration-1 decoration-white">
                {language === 'UA' ? 'Тільки на CINEMA NOVA' : 'Only on CINEMA NOVA'}
              </span>
            </button>
          </div>

          {/* Колонка 3 */}
          <div className="space-y-2.5 md:space-y-3.5">
            <button 
              type="button"
              onClick={() => {
                if (onNavigate) onNavigate('cookies');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }} 
              className="flex items-center gap-1.5 md:gap-2 text-white group cursor-pointer text-left w-fit"
            >
              <ChevronRight className="w-2 h-2 md:w-3.5 md:h-3.5 text-[#FF3040] stroke-[2.5] shrink-0" />
              <span className="group-hover:underline group-active:underline underline-offset-4 decoration-1 decoration-white">
                {language === 'UA' ? 'Налаштування файлів cookie' : 'Cookie Preferences'}
              </span>
            </button>
            <button 
              type="button"
              onClick={() => {
                if (onNavigate) onNavigate('legal');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }} 
              className="flex items-center gap-1.5 md:gap-2 text-white group cursor-pointer text-left w-fit"
            >
              <ChevronRight className="w-2 h-2 md:w-3.5 md:h-3.5 text-[#FF3040] stroke-[2.5] shrink-0" />
              <span className="group-hover:underline group-active:underline underline-offset-4 decoration-1 decoration-white">
                {language === 'UA' ? 'Юридичні повідомлення' : 'Legal Notices'}
              </span>
            </button>
          </div>

          {/* Колонка 4 */}
          <div className="space-y-2.5 md:space-y-3.5">
            <button 
              type="button"
              onClick={() => {
                if (onNavigate) onNavigate('mediacenter');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }} 
              className="flex items-center gap-1.5 md:gap-2 text-white group cursor-pointer text-left w-fit"
            >
              <ChevronRight className="w-2 h-2 md:w-3.5 md:h-3.5 text-[#FF3040] stroke-[2.5] shrink-0" />
              <span className="group-hover:underline group-active:underline underline-offset-4 decoration-1 decoration-white">
                {language === 'UA' ? 'Медіацентр' : 'Media Center'}
              </span>
            </button>
            <button 
              type="button"
              onClick={() => {
                if (onNavigate) onNavigate('terms');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }} 
              className="flex items-center gap-1.5 md:gap-2 text-white group cursor-pointer text-left w-fit"
            >
              <ChevronRight className="w-2 h-2 md:w-3.5 md:h-3.5 text-[#FF3040] stroke-[2.5] shrink-0" />
              <span className="group-hover:underline group-active:underline underline-offset-4 decoration-1 decoration-white">
                {language === 'UA' ? 'Умови використання' : 'Terms of Use'}
              </span>
            </button>
          </div>
        </div>

        {/* Bottom Divider */}
        <div className="w-full h-[1px] bg-[#22232A]" />

        {/* Bottom Copyright Рядок (Figma: text 6px on mobile, text-xs on desktop) */}
        <div className="text-[6px] md:text-xs text-zinc-500 font-normal">
          {language === 'UA' 
            ? '© 2026 CINEMA NOVA. Усі права захищені.' 
            : '© 2026 CINEMA NOVA. All rights reserved.'}
        </div>

      </div>
    </footer>
  );
};

export default FooterMain;
