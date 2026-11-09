import React from 'react';
import { FileText, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export const TermsOfUseView: React.FC = () => {
  const { language } = useLanguage();

  const terms = language === 'UA' ? [
    {
      title: '1. Прийняття умов',
      content: 'Створюючи обліковий запис або використовуючи будь-які сервіси платформи CINEMA NOVA, ви погоджуєтеся дотримуватися цих Умов використання та діючого законодавства.'
    },
    {
      title: '2. Особисте некомерційне використання',
      content: 'Сервіс CINEMA NOVA та весь його контент призначені виключно для вашого особистого, некомерційного перегляду. Забороняється публічний показ у комерційних закладах без спеціальної партнерської ліцензії.'
    },
    {
      title: '3. Безпека облікового запису',
      content: 'Ви несете відповідальність за збереження конфіденційності своїх даних для входу. У разі підозри на несанкціонований доступ негайно змініть пароль або повідомте службу підтримки.'
    },
    {
      title: '4. Правила спільноти та Watch Party',
      content: 'Під час використання спільних кімнат Watch Party, коментарів та відгуків забороняється розповсюдження спаму, образливих висловлювань, мови ворожнечі або шкідливого програмного забезпечення.'
    },
    {
      title: '5. Якість сервісу та оновлення',
      content: 'Ми постійно вдосконалюємо сервіс, оптимізуємо роботу плеєра та оновлюємо каталог фільмів. CINEMA NOVA залишає за собою право вносити зміни до функціоналу для покращення стабільності.'
    }
  ] : [
    {
      title: '1. Acceptance of Terms',
      content: 'By accessing or using CINEMA NOVA streaming services, you agree to be bound by these Terms of Use and all applicable regulations.'
    },
    {
      title: '2. Personal Non-Commercial Use',
      content: 'CINEMA NOVA and its media catalog are strictly for personal, non-commercial entertainment. Commercial public broadcast is prohibited without licensing.'
    },
    {
      title: '3. Account Security',
      content: 'You are responsible for safeguarding your login credentials. If you suspect unauthorized activity, change your password immediately or reach out to support.'
    },
    {
      title: '4. Community Guidelines & Watch Party',
      content: 'During Watch Party chat and review posting, spam, harassment, hate speech, and destructive behavior are strictly prohibited.'
    },
    {
      title: '5. Service Evolution',
      content: 'We continuously improve the platform, audio-video pipelines, and catalog depth to ensure superior streaming reliability.'
    }
  ];

  return (
    <div className="w-full min-h-[70vh] px-4 sm:px-8 md:px-14 lg:px-20 py-8 sm:py-12 max-w-[1700px] mx-auto animate-fade-in">
      <div className="flex items-center gap-3 mb-3">
        <FileText className="w-6 h-6 text-[#FF3040]" />
        <h1 className="text-xl sm:text-2xl md:text-[26px] font-medium text-white tracking-normal">
          {language === 'UA' ? 'Умови використання' : 'Terms of Use'}
        </h1>
      </div>
      <p className="text-zinc-400 text-xs sm:text-sm mb-8">
        {language === 'UA' ? 'Офіційні правила користування платформою CINEMA NOVA' : 'Official Terms of Service for CINEMA NOVA'}
      </p>

      <div className="space-y-6 max-w-4xl">
        {terms.map((t, i) => (
          <div key={i} className="p-6 rounded-2xl bg-[#161616] border border-zinc-800/80 space-y-2.5">
            <h2 className="text-white text-base font-semibold">{t.title}</h2>
            <p className="text-zinc-300 text-sm leading-relaxed">{t.content}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TermsOfUseView;
