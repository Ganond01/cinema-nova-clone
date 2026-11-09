import React from 'react';
import { Scale, FileCheck } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export const LegalNoticesView: React.FC = () => {
  const { language } = useLanguage();

  const legalItems = language === 'UA' ? [
    {
      title: 'Авторські права та інтелектуальна власність',
      text: 'Усі аудіовізуальні твори, логотипи, дизайн сайту, програмний код та торгові марки CINEMA NOVA є об\'єктами інтелектуальної власності. Несанкціоноване копіювання, розповсюдження або публічний показ карається згідно із законодавством про авторське право.'
    },
    {
      title: 'Ліцензування контенту',
      text: 'Фільми, серіали та аніме транслюються на платформі згідно з офіційними договорами дистрибуції з кіностудіями та правовласниками. Доступність окремих релізів може залежати від географічного регіону.'
    },
    {
      title: 'Політика щодо скарг (DMCA / Звернення правовласників)',
      text: 'Якщо ви вважаєте, що будь-який матеріал на платформі порушує ваші законні права, надішліть офіційний запит на copyright@novacinema.com із зазначенням підтвердження прав. Наша юридична служба обробляє запити впродовж 24 годин.'
    }
  ] : [
    {
      title: 'Copyright & Intellectual Property',
      text: 'All audiovisual media, logos, user interfaces, code, and trademarks associated with CINEMA NOVA are protected intellectual property. Unauthorized copying or redistribution is strictly prohibited.'
    },
    {
      title: 'Content Licensing',
      text: 'Movies, series, and anime on CINEMA NOVA are streamed under distribution licenses from studio partners and rights holders. Regional availability may apply.'
    },
    {
      title: 'DMCA & Rights Holder Inquiries',
      text: 'If you believe your copyrighted work is used improperly, submit a verified notice to copyright@novacinema.com. Inquiries are processed within 24 hours.'
    }
  ];

  return (
    <div className="w-full min-h-[70vh] px-4 sm:px-8 md:px-14 lg:px-20 py-8 sm:py-12 max-w-[1700px] mx-auto animate-fade-in">
      <div className="flex items-center gap-3 mb-3">
        <Scale className="w-6 h-6 text-[#FF3040]" />
        <h1 className="text-xl sm:text-2xl md:text-[26px] font-medium text-white tracking-normal">
          {language === 'UA' ? 'Юридичні повідомлення' : 'Legal Notices'}
        </h1>
      </div>
      <p className="text-zinc-400 text-xs sm:text-sm mb-8">
        {language === 'UA' ? 'Офіційні правові положення сервісу CINEMA NOVA' : 'Official legal notices for CINEMA NOVA platform'}
      </p>

      <div className="space-y-6 max-w-4xl">
        {legalItems.map((item, i) => (
          <div key={i} className="p-6 rounded-2xl bg-[#161616] border border-zinc-800/80 space-y-2.5">
            <h2 className="text-white text-base font-semibold">{item.title}</h2>
            <p className="text-zinc-300 text-sm leading-relaxed">{item.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LegalNoticesView;
