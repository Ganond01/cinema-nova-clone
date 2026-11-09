import React from 'react';
import { Newspaper, Download, Mail, ExternalLink, Radio } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import Logo from '../Logo';

export const MediaCenterView: React.FC = () => {
  const { language } = useLanguage();

  const news = language === 'UA' ? [
    {
      date: '15 серпня 2026',
      title: 'CINEMA NOVA представляє оновлений каталог з підтримкою 4K Ultra HD та Watch Party',
      summary: 'Нова версія платформи отримала інтелектуальний підбір рекомендацій, покращені субтитри та швидке завантаження офлайн.'
    },
    {
      date: '28 липня 2026',
      title: 'Розширення співпраці з провідними українськими студіями дубляжу',
      summary: 'CINEMA NOVA додає понад 150 годин нового професійного багатоголосого дубляжу для популярних серіалів та аніме.'
    },
    {
      date: '10 червня 2026',
      title: 'Запуск інтерактивних Watch Party кімнат для спільного перегляду',
      summary: 'Тепер користувачі можуть створювати власні кімнати та переглядати фільми синхронно з друзями в реальному часі.'
    }
  ] : [
    {
      date: 'August 15, 2026',
      title: 'CINEMA NOVA Unveils Upgraded Catalog with 4K Ultra HD and Watch Party Sync',
      summary: 'The new platform release brings intelligent recommendation tuning, enhanced subtitles, and rapid offline downloads.'
    },
    {
      date: 'July 28, 2026',
      title: 'Strategic Expansion with Premier Dubbing Studios',
      summary: 'Over 150 hours of brand-new multi-voice studio dubbing is arriving on CINEMA NOVA for top anime and drama series.'
    },
    {
      date: 'June 10, 2026',
      title: 'Launch of Real-Time Interactive Watch Party Rooms',
      summary: 'Users can now create private co-watching virtual rooms to stream cinema simultaneously with friends.'
    }
  ];

  return (
    <div className="w-full min-h-[70vh] px-4 sm:px-8 md:px-14 lg:px-20 py-8 sm:py-12 max-w-[1700px] mx-auto animate-fade-in">
      <div className="flex items-center gap-3 mb-3">
        <Newspaper className="w-6 h-6 text-[#FF3040]" />
        <h1 className="text-xl sm:text-2xl md:text-[26px] font-medium text-white tracking-normal">
          {language === 'UA' ? 'Медіацентр та прес-служба' : 'Media Center & Press'}
        </h1>
      </div>
      <p className="text-zinc-400 text-sm sm:text-base max-w-3xl mb-10 leading-relaxed">
        {language === 'UA'
          ? 'Офіційні прес-релізи, новини компанії, матеріали для преси та медіа-кіт бренду CINEMA NOVA.'
          : 'Official press releases, platform announcements, brand assets, and media contacts for journalists.'}
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 cols: Press Releases */}
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-white text-lg font-semibold flex items-center gap-2">
            <Radio className="w-4 h-4 text-[#FF3040]" />
            {language === 'UA' ? 'Останні прес-релізи' : 'Latest Press Releases'}
          </h2>

          <div className="space-y-4">
            {news.map((item, i) => (
              <div key={i} className="p-6 rounded-2xl bg-[#161616] border border-zinc-800/80 space-y-2 hover:border-zinc-700 transition-colors">
                <span className="text-xs text-[#FF3040] font-mono font-medium">{item.date}</span>
                <h3 className="text-white text-base font-semibold">{item.title}</h3>
                <p className="text-zinc-400 text-sm leading-relaxed">{item.summary}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Right col: Brand assets and contact */}
        <div className="space-y-6">
          <h2 className="text-white text-lg font-semibold">
            {language === 'UA' ? 'Матеріали для преси' : 'Brand Assets'}
          </h2>

          <div className="p-6 rounded-2xl bg-[#161616] border border-zinc-800/80 space-y-4">
            <div className="p-4 bg-black/40 rounded-xl flex items-center justify-center border border-zinc-800">
              <Logo size="lg" />
            </div>
            <p className="text-zinc-400 text-xs leading-relaxed">
              {language === 'UA'
                ? 'Завантажте офіційний логотип CINEMA NOVA у векторних форматах SVG та PNG високої роздільної здатності.'
                : 'Download high-resolution vector SVG and PNG assets of the official CINEMA NOVA brand mark.'}
            </p>
            <a
              href="/logo.svg"
              download="cinema-nova-logo.svg"
              className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-xs font-semibold transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{language === 'UA' ? 'Завантажити логотип (SVG)' : 'Download Logo (SVG)'}</span>
            </a>
          </div>

          <div className="p-6 rounded-2xl bg-[#161616] border border-zinc-800/80 space-y-2.5">
            <h3 className="text-white text-sm font-semibold flex items-center gap-2">
              <Mail className="w-4 h-4 text-[#FF3040]" />
              {language === 'UA' ? 'Контакти для ЗМІ' : 'Press Inquiries'}
            </h3>
            <p className="text-zinc-400 text-xs leading-relaxed">
              {language === 'UA'
                ? 'Для інтерв\'ю, коментарів та запитів журналістів:'
                : 'For press comments, interviews, and media kits:'}
            </p>
            <p className="text-[#FF3040] text-sm font-mono font-medium">press@novacinema.com</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MediaCenterView;
