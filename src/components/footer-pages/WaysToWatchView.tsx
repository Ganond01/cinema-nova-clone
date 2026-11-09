import React from 'react';
import { useLanguage } from '../../context/LanguageContext';

export const WaysToWatchView: React.FC = () => {
  const { language } = useLanguage();

  if (language === 'UA') {
    return (
      <div className="w-full min-h-[70vh] px-4 sm:px-8 md:px-14 lg:px-20 py-8 sm:py-12 max-w-[1700px] mx-auto animate-fade-in">
        <h1 className="text-xl sm:text-2xl md:text-[26px] font-medium text-white tracking-normal mb-8 sm:mb-10">
          Способи перегляду
        </h1>

        <div className="space-y-7 max-w-4xl text-zinc-200 text-sm sm:text-[15px] font-normal leading-relaxed">
          {/* Section 1 */}
          <div className="space-y-2">
            <h2 className="text-white text-base sm:text-lg font-normal">
              Дивіться так, як зручно саме вам
            </h2>
            <p>
              CINEMA NOVA створена для того, щоб улюблені фільми, серіали та інший контент були доступні там, де вам зручно. Ви можете переглядати контент вдома на великому екрані, у дорозі зі смартфона або під час перерви на комп’ютері.
            </p>
            <p>
              Платформа адаптується до різних пристроїв і форматів екрана, зберігаючи зручну навігацію та якісний перегляд.
            </p>
            <p>
              Для використання CINEMA NOVA достатньо сучасного пристрою та стабільного інтернет-з’єднання. Увійдіть до свого облікового запису, оберіть фільм або серіал — і продовжуйте перегляд з того моменту, на якому зупинилися.
            </p>
          </div>

          {/* Section 2 */}
          <div className="space-y-2">
            <h2 className="text-white text-base sm:text-lg font-normal">
              Перегляд у браузері
            </h2>
            <p>
              CINEMA NOVA доступна через сучасні веббраузери на комп’ютерах і ноутбуках. Це зручний спосіб дивитися контент на великому екрані, використовувати повноекранний режим і керувати всіма функціями платформи.
            </p>
            <p>
              Для найкращого досвіду рекомендуємо використовувати актуальну версію браузера та стабільне інтернет-з’єднання. Регулярне оновлення браузера допомагає забезпечити коректне відтворення відео та доступ до нових можливостей сервісу.
            </p>
          </div>

          {/* Section 3 */}
          <div className="space-y-2">
            <h2 className="text-white text-base sm:text-lg font-normal">
              Смартфони та планшети
            </h2>
            <p>
              Ви можете користуватися CINEMA NOVA на смартфонах і планшетах через адаптовану мобільну версію платформи. Інтерфейс автоматично підлаштовується під розмір екрана, щоб вам було зручно знаходити контент, переглядати інформацію про фільми, залишати оцінки та відгуки.
            </p>
            <p>
              Особистий профіль, історія переглядів і збережений контент синхронізуються з вашим обліковим записом. Це означає, що ви можете почати перегляд на одному пристрої та продовжити його на іншому.
            </p>
          </div>

          {/* Section 4 */}
          <div className="space-y-2">
            <h2 className="text-white text-base sm:text-lg font-normal">
              Великий екран
            </h2>
            <p>
              Для тих, хто любить максимально занурюватися в атмосферу кіно, CINEMA NOVA підтримує зручний перегляд у повноекранному режимі. Використовуйте великий екран комп’ютера або підключіть сумісний пристрій до телевізора відповідно до можливостей вашого обладнання.
            </p>
            <p>
              Якість перегляду залежить від характеристик пристрою, швидкості інтернет-з’єднання та доступної якості конкретного відео.
            </p>
          </div>

          {/* Section 5 */}
          <div className="space-y-2">
            <h2 className="text-white text-base sm:text-lg font-normal">
              Продовжуйте перегляд з будь-якого пристрою
            </h2>
            <p>
              Не потрібно шукати епізод або запам’ятовувати момент, на якому ви зупинилися. CINEMA NOVA зберігає прогрес перегляду, щоб ви могли легко повернутися до фільму чи серіалу пізніше.
            </p>
            <p>
              Наприклад, ви можете почати дивитися серіал на ноутбуці, а потім продовжити перегляд на смартфоні. Для цього достатньо використовувати один і той самий обліковий запис.
            </p>
          </div>

          {/* Section 6 */}
          <div className="space-y-2">
            <h2 className="text-white text-base sm:text-lg font-normal">
              Перегляд разом із Watch Party
            </h2>
            <p>
              Перегляд кіно може бути ще цікавішим, коли ним можна ділитися з іншими. Функція Watch Party дозволяє створювати кімнати для спільного перегляду та запрошувати інших користувачів приєднатися до перегляду.
            </p>
            <p>
              Обирайте фільм або серіал, створюйте кімнату та дивіться контент разом. Це зручний спосіб організувати спільний вечір кіно, навіть якщо учасники знаходяться в різних місцях.
            </p>
          </div>

          {/* Section 7 */}
          <div className="space-y-2">
            <h2 className="text-white text-base sm:text-lg font-normal">
              Перегляд без зайвих складнощів
            </h2>
            <p>
              Ми прагнемо зробити CINEMA NOVA простою та зрозумілою незалежно від того, яким пристроєм ви користуєтеся. Зручна навігація, персональні рекомендації, збережений контент, історія переглядів та інші функції допомагають швидко знаходити те, що хочеться подивитися саме зараз.
            </p>
            <p>
              Обирайте свій пристрій, знаходьте історію, яка вас зацікавила, і насолоджуйтеся переглядом у власному ритмі.
            </p>
          </div>

          {/* Slogan Quote */}
          <div className="pt-8 text-zinc-300 text-base sm:text-lg italic leading-relaxed font-light">
            CINEMA NOVA — більше історій, більше емоцій і більше способів дивитися те, що ви любите.
          </div>
        </div>
      </div>
    );
  }

  // English fallback
  return (
    <div className="w-full min-h-[70vh] px-4 sm:px-8 md:px-14 lg:px-20 py-8 sm:py-12 max-w-[1700px] mx-auto animate-fade-in">
      <h1 className="text-xl sm:text-2xl md:text-[26px] font-medium text-white tracking-normal mb-8 sm:mb-10">
        Ways to Watch
      </h1>

      <div className="space-y-7 max-w-4xl text-zinc-200 text-sm sm:text-[15px] font-normal leading-relaxed">
        <div className="space-y-2">
          <h2 className="text-white text-base sm:text-lg font-normal">
            Watch any way you like
          </h2>
          <p>
            CINEMA NOVA is built so your favorite movies and series are accessible wherever you are — on PC browsers, smartphones, tablets, or big TV screens.
          </p>
        </div>

        <div className="space-y-2">
          <h2 className="text-white text-base sm:text-lg font-normal">
            Synchronized Progress & Watch Party
          </h2>
          <p>
            Start on your desktop, pick up seamlessly on mobile, or host synchronized Watch Parties with friends across different locations in real-time.
          </p>
        </div>

        <div className="pt-8 text-zinc-300 text-base sm:text-lg italic leading-relaxed font-light">
          CINEMA NOVA — more stories, more emotions, and more ways to watch what you love.
        </div>
      </div>
    </div>
  );
};

export default WaysToWatchView;
