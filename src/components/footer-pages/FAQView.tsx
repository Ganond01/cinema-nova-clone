import React from 'react';
import { useLanguage } from '../../context/LanguageContext';

interface FAQViewProps {
  onSelectMovie?: (movie: any) => void;
  onNavigate?: (tab: string) => void;
}

export const FAQView: React.FC<FAQViewProps> = () => {
  const { language } = useLanguage();

  const faqItems = language === 'UA' ? [
    {
      question: 'Що таке CINEMA NOVA?',
      answer: 'CINEMA NOVA — це сучасна платформа для перегляду фільмів, серіалів та аніме з персональними рекомендаціями, зручним пошуком і можливістю спільного перегляду через Watch Party.'
    },
    {
      question: 'Чи потрібно створювати обліковий запис?',
      answer: 'Так, для повноцінного користування CINEMA NOVA потрібен обліковий запис. Він дає доступ до персональних рекомендацій, історії переглядів, збереження контенту та Watch Party.'
    },
    {
      question: 'На яких пристроях можна дивитися контент?',
      answer: 'CINEMA NOVA доступний на комп\'ютерах, смартфонах, планшетах і Smart TV — ви можете дивитися контент на будь-якому зручному пристрої.'
    },
    {
      question: 'Яку якість відео підтримує сервіс?',
      answer: 'CINEMA NOVA підтримує якість відео до 4K Ultra HD, залежно від доступної якості контенту та швидкості інтернет-з\'єднання.'
    },
    {
      question: 'Що таке Watch Party?',
      answer: 'Watch Party — це функція для спільного перегляду фільмів і серіалів з друзями в одній онлайн-кімнаті, де учасники можуть спілкуватися під час перегляду.'
    },
    {
      question: 'Як працюють персональні рекомендації?',
      answer: 'Персональні рекомендації формуються на основі ваших уподобань, історії переглядів, оцінок і обраних жанрів. Система аналізує ці дані та пропонує контент, який може вам сподобатися.'
    },
    {
      question: 'Чи безпечні мої дані?',
      answer: 'Так. CINEMA NOVA захищає персональні дані користувачів і не передає їх третім сторонам без відповідної підстави. Для захисту облікових записів використовуються сучасні методи шифрування та безпеки.'
    }
  ] : [
    {
      question: 'What is CINEMA NOVA?',
      answer: 'CINEMA NOVA is a modern streaming platform for movies, series, and anime with personalized recommendations, convenient smart search, and synchronized co-watching via Watch Party.'
    },
    {
      question: 'Do I need to create an account?',
      answer: 'Yes, an account is required to get full access to CINEMA NOVA. It unlocks personalized recommendations, watch history, saved watchlist items, and synchronized Watch Party rooms.'
    },
    {
      question: 'What devices can I use to watch content?',
      answer: 'CINEMA NOVA is available on PCs, laptops, smartphones, tablets, and Smart TVs — you can stream high-definition media on any convenient device.'
    },
    {
      question: 'What video resolution does the service support?',
      answer: 'CINEMA NOVA supports up to 4K Ultra HD resolution, depending on available master quality and your internet connection bandwidth.'
    },
    {
      question: 'What is Watch Party?',
      answer: 'Watch Party is a synchronized co-viewing feature allowing you to watch movies and series with friends in a shared virtual room with real-time live chat.'
    },
    {
      question: 'How do personalized recommendations work?',
      answer: 'Personal recommendations are tailored based on your viewing habits, watch history, user ratings, and preferred genres. The engine analyzes these signals to curate titles you\'ll love.'
    },
    {
      question: 'Is my personal data secure?',
      answer: 'Yes. CINEMA NOVA strictly protects user personal data and never shares it with unauthorized third parties. High-grade encryption and modern security practices protect every account.'
    }
  ];

  return (
    <div className="w-full min-h-[70vh] px-4 sm:px-8 md:px-14 lg:px-20 py-8 sm:py-12 max-w-[1700px] mx-auto animate-fade-in">
      {/* Заголовок */}
      <h1 className="text-xl sm:text-2xl md:text-[26px] font-medium text-white tracking-normal mb-8 sm:mb-10">
        {language === 'UA' ? 'Популярні питання' : 'Frequently Asked Questions'}
      </h1>

      {/* Список of Q&As */}
      <div className="space-y-7 sm:space-y-8 max-w-4xl">
        {faqItems.map((item, idx) => (
          <div key={idx} className="space-y-2.5">
            <h2 className="text-[#FF3040] text-base sm:text-lg font-semibold tracking-wide">
              {item.question}
            </h2>
            <p className="text-zinc-200 text-sm sm:text-[15px] font-normal leading-relaxed">
              {item.answer}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FAQView;
