import React from 'react';
import { useLanguage } from '../../context/LanguageContext';

export const CorporateInfoView: React.FC = () => {
  const { language } = useLanguage();

  if (language === 'UA') {
    return (
      <div className="w-full min-h-[70vh] px-4 sm:px-8 md:px-14 lg:px-20 py-8 sm:py-12 max-w-[1700px] mx-auto animate-fade-in">
        <h1 className="text-xl sm:text-2xl md:text-[26px] font-medium text-white tracking-normal mb-8 sm:mb-10">
          Корпоративна інформація
        </h1>

        <div className="space-y-7 max-w-4xl text-zinc-200 text-sm sm:text-[15px] font-normal leading-relaxed">
          {/* Section 1 */}
          <div className="space-y-2">
            <h2 className="text-white text-base sm:text-lg font-normal">
              Про CINEMA NOVA
            </h2>
            <p>
              CINEMA NOVA — це сучасна цифрова платформа для перегляду та відкриття фільмів, серіалів і різноманітного відеоконтенту. Ми створюємо простір, у якому технології допомагають зробити перегляд простішим, комфортнішим і більш персоналізованим.
            </p>
            <p>
              Наша мета — об’єднати якісний контент, сучасний дизайн і зручні інструменти в одному сервісі. CINEMA NOVA допомагає користувачам не просто обирати, що подивитися, а відкривати нові історії відповідно до власних інтересів і настрою.
            </p>
          </div>

          {/* Section 2 */}
          <div className="space-y-2">
            <h2 className="text-white text-base sm:text-lg font-normal">
              Наша місія
            </h2>
            <p>
              Ми віримо, що кіно — це більше, ніж просто спосіб провести вільний час. Це історії, емоції, нові погляди та можливість хоча б на деякий час опинитися в іншому світі.
            </p>
            <p>
              Місія CINEMA NOVA — зробити доступ до світу кіно простим, сучасним і персональним. Ми прагнемо створити платформу, де кожен користувач може легко знайти контент для себе, зберігати улюблені історії та ділитися враженнями з іншими.
            </p>
          </div>

          {/* Section 3 */}
          <div className="space-y-2">
            <h2 className="text-white text-base sm:text-lg font-normal">
              Що ми створюємо
            </h2>
            <p>
              CINEMA NOVA поєднує інструменти для комфортного перегляду та пошуку нового контенту. На платформі користувачі можуть переглядати інформацію про фільми та серіали, отримувати персональні рекомендації, створювати власні списки, залишати оцінки та відгуки, а також стежити за історією переглядів.
            </p>
            <p>
              Ми приділяємо особливу увагу тому, щоб інтерфейс залишався зрозумілим навіть за великої кількості контенту. Технології повинні працювати непомітно, залишаючи головне місце емоціям від перегляду.
            </p>
          </div>

          {/* Section 4 */}
          <div className="space-y-3">
            <h2 className="text-white text-base sm:text-lg font-normal">
              Наші цінності
            </h2>
            <div className="space-y-1">
              <h3 className="text-white text-sm sm:text-[15px] font-medium">Користувач у центрі всього</h3>
              <p>Ми створюємо CINEMA NOVA насамперед для людей. Тому під час розвитку платформи ми орієнтуємося на зручність, зрозумілу навігацію та реальні потреби користувачів.</p>
            </div>
            <div className="space-y-1 pt-1">
              <h3 className="text-white text-sm sm:text-[15px] font-medium">Свобода вибору</h3>
              <p>Кожен має власний смак у кіно. Ми підтримуємо різноманітність жанрів, форматів та історій і прагнемо допомогти користувачам знаходити саме той контент, який відповідає їхнім інтересам.</p>
            </div>
            <div className="space-y-1 pt-1">
              <h3 className="text-white text-sm sm:text-[15px] font-medium">Технології для комфорту</h3>
              <p>Персональні рекомендації, історія переглядів, збережений контент та інші функції створені для того, щоб користувач витрачав менше часу на пошук і більше — на перегляд.</p>
            </div>
            <div className="space-y-1 pt-1">
              <h3 className="text-white text-sm sm:text-[15px] font-medium">Спільні емоції</h3>
              <p>Кіно об’єднує людей. Саме тому ми розвиваємо функції, які дозволяють ділитися враженнями, залишати відгуки та переглядати улюблені історії разом із друзями.</p>
            </div>
          </div>

          {/* Section 5 */}
          <div className="space-y-2">
            <h2 className="text-white text-base sm:text-lg font-normal">
              Розвиток платформи
            </h2>
            <p>
              CINEMA NOVA постійно розвивається. Ми аналізуємо досвід користувачів, вдосконалюємо інтерфейс і працюємо над новими можливостями, які зроблять платформу ще зручнішою.
            </p>
            <p>
              Ми прагнемо створювати цифровий продукт, який не стоїть на місці. Нові технології, зміни у звичках користувачів і розвиток індустрії кіно допомагають нам знаходити нові напрямки для вдосконалення сервісу.
            </p>
          </div>

          {/* Section 6 */}
          <div className="space-y-2">
            <h2 className="text-white text-base sm:text-lg font-normal">
              Відповідальність і безпека
            </h2>
            <p>
              Ми відповідально ставимося до інформації користувачів і прагнемо забезпечити безпечне та комфортне середовище для всіх, хто користується CINEMA NOVA. Захист персональних даних, стабільна робота сервісу та повага до приватності є важливою частиною нашого підходу.
            </p>
            <p>
              Ми також підтримуємо культуру відповідального споживання цифрового контенту та прагнемо створювати платформу, де кожен користувач може почуватися комфортно.
            </p>
          </div>

          {/* Section 7 */}
          <div className="space-y-2">
            <h2 className="text-white text-base sm:text-lg font-normal">
              Дивимося у майбутнє
            </h2>
            <p>
              Світ кіно постійно змінюється — разом із ним змінюються технології та способи, якими ми відкриваємо нові історії. CINEMA NOVA прагне бути частиною цих змін і створювати сучасний досвід перегляду для нового покоління користувачів.
            </p>
            <p>
              Ми продовжуємо працювати над тим, щоб CINEMA NOVA залишалася місцем, де легко знайти щось нове, повернутися до улюбленої історії або розділити перегляд із близькими.
            </p>
          </div>

          {/* Slogan Quote */}
          <div className="pt-8 text-zinc-300 text-base sm:text-lg italic leading-relaxed font-light">
            CINEMA NOVA — платформа, де кожна історія може стати вашою наступною улюбленою.
          </div>
        </div>
      </div>
    );
  }

  // English fallback
  return (
    <div className="w-full min-h-[70vh] px-4 sm:px-8 md:px-14 lg:px-20 py-8 sm:py-12 max-w-[1700px] mx-auto animate-fade-in">
      <h1 className="text-xl sm:text-2xl md:text-[26px] font-medium text-white tracking-normal mb-8 sm:mb-10">
        Corporate Information
      </h1>

      <div className="space-y-7 max-w-4xl text-zinc-200 text-sm sm:text-[15px] font-normal leading-relaxed">
        <div className="space-y-2">
          <h2 className="text-white text-base sm:text-lg font-normal">
            About CINEMA NOVA
          </h2>
          <p>
            CINEMA NOVA is a cutting-edge digital streaming platform designed for cinema enthusiasts. We blend high-performance infrastructure, elegant responsive UX, and rich media discovery into one unified viewing hub.
          </p>
        </div>

        <div className="space-y-2">
          <h2 className="text-white text-base sm:text-lg font-normal">
            Our Mission & Values
          </h2>
          <p>
            Cinema connects people across the world. Our mission is to make accessing cinema effortless, intuitive, and personal for every viewer.
          </p>
        </div>

        <div className="pt-8 text-zinc-300 text-base sm:text-lg italic leading-relaxed font-light">
          CINEMA NOVA — a platform where every story can become your next favorite.
        </div>
      </div>
    </div>
  );
};

export default CorporateInfoView;
