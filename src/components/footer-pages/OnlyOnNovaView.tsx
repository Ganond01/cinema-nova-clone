import React from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { Movie } from '../../types';

interface OnlyOnNovaViewProps {
  movies?: Movie[];
  onSelectMovie?: (movie: Movie) => void;
  onPlayMovie?: (movie: Movie) => void;
}

export const OnlyOnNovaView: React.FC<OnlyOnNovaViewProps> = () => {
  const { language } = useLanguage();

  if (language === 'UA') {
    return (
      <div className="w-full min-h-[70vh] px-4 sm:px-8 md:px-14 lg:px-20 py-8 sm:py-12 max-w-[1700px] mx-auto animate-fade-in">
        <h1 className="text-xl sm:text-2xl md:text-[26px] font-medium text-white tracking-normal mb-8 sm:mb-10">
          Тільки на CINEMA NOVA
        </h1>

        <div className="space-y-7 max-w-4xl text-zinc-200 text-sm sm:text-[15px] font-normal leading-relaxed">
          {/* Section 1 */}
          <div className="space-y-2">
            <h2 className="text-white text-base sm:text-lg font-normal">
              Ексклюзивний кінематографічний простір
            </h2>
            <p>
              Розділ «Тільки на CINEMA NOVA» об’єднує унікальний контент, спеціальні прем’єри та особливі проекти, створені та підібрані ексклюзивно для користувачів нашої платформи. Ми прагнемо дарувати глядачам враження, які виходять за межі звичайного перегляду кіно.
            </p>
            <p>
              Тут ви знайдете авторські релізи, спеціальні версії улюблених стрічок, розширені режисерські версії та колекції, які доступні лише в екосистемі CINEMA NOVA.
            </p>
          </div>

          {/* Section 2 */}
          <div className="space-y-2">
            <h2 className="text-white text-base sm:text-lg font-normal">
              Оригінальні добірки та спеціальні проекти
            </h2>
            <p>
              Наша команда кіноекспертів формує унікальні тематичні добірки, що відкривають нові грані світового та вітчизняного кінематографа. Ми відбираємо фестивальні хіти, культову класику в найвищій реставрованій якості, а також перспективні роботи незалежних режисерів.
            </p>
            <p>
              Кожен ексклюзивний проект супроводжується детальними матеріалами про зйомки, інтерв’ю з авторами та інтерактивними елементами.
            </p>
          </div>

          {/* Section 3 */}
          <div className="space-y-2">
            <h2 className="text-white text-base sm:text-lg font-normal">
              Інноваційний досвід перегляду
            </h2>
            <p>
              Ексклюзиви CINEMA NOVA адаптовані для максимального занурення в атмосферу: підтримка надвисокої чіткості 4K Ultra HD, розширеного динамічного діапазону HDR та об’ємного багатоканального звуку Dolby Atmos.
            </p>
            <p>
              Завдяки інтегрованій функції спільних кімнат Watch Party ви можете дивитися ексклюзивні прем’єри разом із друзями в реальному часі, обмінюючись живими реакціями та враженнями.
            </p>
          </div>

          {/* Section 4 */}
          <div className="space-y-2">
            <h2 className="text-white text-base sm:text-lg font-normal">
              Безперервне поповнення бібліотеки
            </h2>
            <p>
              Ми постійно розширюємо каталог ексклюзивного контенту, співпрацюючи з провідними кіностудіями, незалежними авторами та творчими об’єднаннями. Слідкуйте за оновленнями платформи, щоб не пропустити головні кіноподії сезону.
            </p>
          </div>

          {/* Slogan Quote */}
          <div className="pt-8 text-zinc-300 text-base sm:text-lg italic leading-relaxed font-light">
            CINEMA NOVA — унікальні історії, створені надихати та єднати справжніх шанувальників кіно.
          </div>
        </div>
      </div>
    );
  }

  // English fallback
  return (
    <div className="w-full min-h-[70vh] px-4 sm:px-8 md:px-14 lg:px-20 py-8 sm:py-12 max-w-[1700px] mx-auto animate-fade-in">
      <h1 className="text-xl sm:text-2xl md:text-[26px] font-medium text-white tracking-normal mb-8 sm:mb-10">
        Only on CINEMA NOVA
      </h1>

      <div className="space-y-7 max-w-4xl text-zinc-200 text-sm sm:text-[15px] font-normal leading-relaxed">
        <div className="space-y-2">
          <h2 className="text-white text-base sm:text-lg font-normal">
            Exclusive Cinematic Destination
          </h2>
          <p>
            "Only on CINEMA NOVA" brings together exclusive original titles, director cuts, curated festival masterpieces, and special editions available uniquely for our viewers.
          </p>
        </div>

        <div className="space-y-2">
          <h2 className="text-white text-base sm:text-lg font-normal">
            Next-Generation Streaming Experience
          </h2>
          <p>
            Enjoy 4K Ultra HD visuals, multi-channel surround sound, and synchronized Watch Party events with friends across devices.
          </p>
        </div>

        <div className="pt-8 text-zinc-300 text-base sm:text-lg italic leading-relaxed font-light">
          CINEMA NOVA — unique stories crafted to inspire and unite true film enthusiasts.
        </div>
      </div>
    </div>
  );
};

export default OnlyOnNovaView;
