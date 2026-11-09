import React, { useState } from 'react';
import { Cookie, Check, Sparkles } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export const CookieSettingsView: React.FC = () => {
  const { language } = useLanguage();
  const [saved, setSaved] = useState(false);

  const [preferences, setPreferences] = useState({
    essential: true, // always required
    performance: true,
    functional: true,
    analytics: false,
  });

  const handleSave = () => {
    localStorage.setItem('nova_cookie_prefs', JSON.stringify(preferences));
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="w-full min-h-[70vh] px-4 sm:px-8 md:px-14 lg:px-20 py-8 sm:py-12 max-w-[1700px] mx-auto animate-fade-in">
      <div className="flex items-center gap-3 mb-3">
        <Cookie className="w-6 h-6 text-[#FF3040]" />
        <h1 className="text-xl sm:text-2xl md:text-[26px] font-medium text-white tracking-normal">
          {language === 'UA' ? 'Налаштування файлів cookie' : 'Cookie Preferences'}
        </h1>
      </div>
      <p className="text-zinc-400 text-sm sm:text-base max-w-3xl mb-8 leading-relaxed">
        {language === 'UA'
          ? 'Ми використовуємо файли cookie для покращення вашого досвіду користування CINEMA NOVA, збереження позиції перегляду, авторизації та підбору рекомендацій.'
          : 'We use cookies to enhance your CINEMA NOVA experience, preserve playback positions, manage authentication, and personalize recommendations.'}
      </p>

      <div className="space-y-4 max-w-3xl">
        {/* Essential */}
        <div className="p-5 rounded-2xl bg-[#161616] border border-zinc-800/80 flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-white font-semibold text-sm sm:text-base">
                {language === 'UA' ? 'Обов\'язкові файли cookie' : 'Strictly Necessary Cookies'}
              </span>
              <span className="text-[10px] bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded font-mono uppercase">
                {language === 'UA' ? 'Завжди увімкнено' : 'Always active'}
              </span>
            </div>
            <p className="text-zinc-400 text-xs sm:text-sm">
              {language === 'UA'
                ? 'Необхідні для базового функціонування сайту, сесії користувача та безпеки.'
                : 'Required for core platform features, user sessions, and security verification.'}
            </p>
          </div>
          <input
            type="checkbox"
            checked={preferences.essential}
            disabled
            className="w-5 h-5 rounded accent-[#FF3040] cursor-not-allowed opacity-70 mt-1"
          />
        </div>

        {/* Performance & Відео Playback */}
        <div className="p-5 rounded-2xl bg-[#161616] border border-zinc-800/80 flex items-start justify-between gap-4">
          <div className="space-y-1">
            <span className="text-white font-semibold text-sm sm:text-base">
              {language === 'UA' ? 'Продуктивність та відео-кешування' : 'Performance & Video Streaming'}
            </span>
            <p className="text-zinc-400 text-xs sm:text-sm">
              {language === 'UA'
                ? 'Зберігають прогрес перегляду серій, обрану якість відео, аудіодоріжки та субтитри.'
                : 'Saves movie playback timeline, chosen quality bitrate, audio tracks and subtitle preferences.'}
            </p>
          </div>
          <input
            type="checkbox"
            checked={preferences.performance}
            onChange={(e) => setPreferences({ ...preferences, performance: e.target.checked })}
            className="w-5 h-5 rounded accent-[#FF3040] cursor-pointer mt-1"
          />
        </div>

        {/* Functional / Personalization */}
        <div className="p-5 rounded-2xl bg-[#161616] border border-zinc-800/80 flex items-start justify-between gap-4">
          <div className="space-y-1">
            <span className="text-white font-semibold text-sm sm:text-base">
              {language === 'UA' ? 'Персоналізація рекомендацій' : 'Personalization & AI Engine'}
            </span>
            <p className="text-zinc-400 text-xs sm:text-sm">
              {language === 'UA'
                ? 'Допомагає алгоритму формувати точні списки фільмів на основі ваших уподобань.'
                : 'Enables our AI recommendation engine to curate personalized title rows based on your taste.'}
            </p>
          </div>
          <input
            type="checkbox"
            checked={preferences.functional}
            onChange={(e) => setPreferences({ ...preferences, functional: e.target.checked })}
            className="w-5 h-5 rounded accent-[#FF3040] cursor-pointer mt-1"
          />
        </div>

        {/* Аналітика */}
        <div className="p-5 rounded-2xl bg-[#161616] border border-zinc-800/80 flex items-start justify-between gap-4">
          <div className="space-y-1">
            <span className="text-white font-semibold text-sm sm:text-base">
              {language === 'UA' ? 'Анонімна аналітика стабільності' : 'Anonymous Stability Analytics'}
            </span>
            <p className="text-zinc-400 text-xs sm:text-sm">
              {language === 'UA'
                ? 'Допомагає фіксувати збої плеєра та покращувати швидкість завантаження.'
                : 'Helps track player buffer health and error rates to improve CDN speeds.'}
            </p>
          </div>
          <input
            type="checkbox"
            checked={preferences.analytics}
            onChange={(e) => setPreferences({ ...preferences, analytics: e.target.checked })}
            className="w-5 h-5 rounded accent-[#FF3040] cursor-pointer mt-1"
          />
        </div>

        <div className="pt-4 flex items-center gap-4">
          <button
            onClick={handleSave}
            className="px-6 py-2.5 bg-[#FF3040] hover:bg-[#e02635] text-white text-xs sm:text-sm font-semibold rounded-xl transition duration-200 shadow-md active:scale-95 flex items-center gap-2 cursor-pointer"
          >
            {saved ? <Check className="w-4 h-4" /> : null}
            <span>{saved ? (language === 'UA' ? 'Збережено!' : 'Saved!') : (language === 'UA' ? 'Зберегти налаштування' : 'Save Preferences')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default CookieSettingsView;
