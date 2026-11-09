import React from 'react';
import { motion } from 'motion/react';
import { useLanguage } from '../context/LanguageContext';

export interface LanguageSwitcherProps {
  className?: string;
  width?: string;
  height?: string;
}

export default function LanguageSwitcher({
  className = '',
  width = '78px',
  height = '41px',
}: LanguageSwitcherProps) {
  const { language, setLanguage } = useLanguage();

  return (
    <div
      className={`relative flex flex-row items-center justify-between bg-transparent shrink-0 p-[3px] rounded-[8px] select-none ${className}`}
      style={{
        width,
        height,
        boxSizing: 'border-box',
      }}
    >
      {/* UK Кнопка */}
      <button
        type="button"
        onClick={() => setLanguage('UA')}
        className={`relative z-10 flex-1 h-full flex items-center justify-center text-[11px] font-bold rounded-[6px] transition-colors duration-200 cursor-pointer ${
          language === 'UA' ? 'text-white' : 'text-[#A3A3A3] hover:text-white'
        }`}
      >
        {language === 'UA' && (
          <motion.div
            layoutId="language-active-pill"
            className="absolute inset-0 bg-[#FF3040] rounded-[6px] shadow-sm z-[-1]"
            transition={{ type: 'spring', stiffness: 500, damping: 35 }}
          />
        )}
        UK
      </button>

      {/* EN Кнопка */}
      <button
        type="button"
        onClick={() => setLanguage('ENG')}
        className={`relative z-10 flex-1 h-full flex items-center justify-center text-[11px] font-bold rounded-[6px] transition-colors duration-200 cursor-pointer ${
          language === 'ENG' ? 'text-white' : 'text-[#A3A3A3] hover:text-white'
        }`}
      >
        {language === 'ENG' && (
          <motion.div
            layoutId="language-active-pill"
            className="absolute inset-0 bg-[#FF3040] rounded-[6px] shadow-sm z-[-1]"
            transition={{ type: 'spring', stiffness: 500, damping: 35 }}
          />
        )}
        EN
      </button>
    </div>
  );
}
