import React from 'react';
import { useLanguage } from '../../context/LanguageContext';

export const PrivacyPolicyView: React.FC = () => {
  const { language } = useLanguage();

  if (language === 'UA') {
    return (
      <div className="w-full min-h-[70vh] px-4 sm:px-8 md:px-14 lg:px-20 py-8 sm:py-12 max-w-[1700px] mx-auto animate-fade-in">
        <h1 className="text-xl sm:text-2xl md:text-[26px] font-medium text-white tracking-normal mb-8 sm:mb-10">
          Політика конфіденційності
        </h1>

        <div className="space-y-7 max-w-4xl text-zinc-200 text-sm sm:text-[15px] font-normal leading-relaxed">
          {/* Section 1 */}
          <div className="space-y-2">
            <h2 className="text-white text-base sm:text-lg font-normal">
              1. Загальні положення
            </h2>
            <p>
              CINEMA NOVA поважає право кожного користувача на приватність і відповідально ставиться до захисту персональних даних. Ця Політика конфіденційності пояснює, яку інформацію ми можемо збирати під час використання платформи, для чого вона використовується та які заходи застосовуються для її захисту.
            </p>
            <p>
              Користуючись CINEMA NOVA, ви погоджуєтеся з умовами цієї Політики конфіденційності. Ми рекомендуємо ознайомитися з нею перед використанням сервісу та періодично перевіряти актуальну версію документа.
            </p>
          </div>

          {/* Section 2 */}
          <div className="space-y-2">
            <h2 className="text-white text-base sm:text-lg font-normal">
              2. Яку інформацію ми можемо збирати
            </h2>
            <p>
              Під час реєстрації та використання платформи CINEMA NOVA ми можемо отримувати інформацію, яку користувач надає добровільно. До неї можуть належати ім’я або ім’я користувача, адреса електронної пошти, дані профілю та інша інформація, необхідна для роботи облікового запису.
            </p>
            <p>
              Також платформа може зберігати інформацію про взаємодію з сервісом: історію переглядів, збережені фільми та серіали, обрані жанри, оцінки, відгуки, створені або відвідані кімнати Watch Party та інші дії, пов’язані з використанням функцій CINEMA NOVA.
            </p>
            <p>
              Ці дані допомагають нам зробити сервіс більш персоналізованим і зручним для кожного користувача.
            </p>
          </div>

          {/* Section 3 */}
          <div className="space-y-2">
            <h2 className="text-white text-base sm:text-lg font-normal">
              3. Як ми використовуємо інформацію
            </h2>
            <p>
              Інформація, яку ми отримуємо, може використовуватися для забезпечення роботи платформи та її основних функцій. Зокрема, вона допомагає нам:
            </p>
            <ul className="space-y-1 pl-1">
              <li>— створювати та підтримувати ваш обліковий запис;</li>
              <li>— зберігати історію переглядів і персональні налаштування;</li>
              <li>— формувати рекомендації відповідно до ваших інтересів;</li>
              <li>— забезпечувати роботу списків збереженого та завантаженого контенту;</li>
              <li>— надавати можливість оцінювати фільми та залишати відгуки;</li>
              <li>— забезпечувати роботу функції спільного перегляду Watch Party;</li>
              <li>— покращувати інтерфейс, функціональність і стабільність CINEMA NOVA;</li>
              <li>— аналізувати технічні помилки та вдосконалювати якість роботи сервісу.</li>
            </ul>
            <p className="pt-1">
              Ми прагнемо використовувати дані лише в межах, необхідних для надання якісного та персоналізованого досвіду користування платформою.
            </p>
          </div>

          {/* Section 4 */}
          <div className="space-y-2">
            <h2 className="text-white text-base sm:text-lg font-normal">
              4. Персональні рекомендації
            </h2>
            <p>
              Однією з функцій CINEMA NOVA є персональні рекомендації. Для їх формування система може враховувати історію переглядів, обрані жанри, оцінки, збережений контент та інші взаємодії користувача з платформою.
            </p>
            <p>
              Наприклад, якщо ви часто переглядаєте трилери, детективи або фантастику, CINEMA NOVA може пропонувати схожі фільми та серіали. Це допомагає швидше знаходити контент, який може відповідати вашим інтересам.
            </p>
            <p>
              Персональні рекомендації створені для покращення користувацького досвіду та не є способом передачі ваших особистих даних іншим користувачам.
            </p>
          </div>

          {/* Section 5 */}
          <div className="space-y-2">
            <h2 className="text-white text-base sm:text-lg font-normal">
              5. Захист інформації
            </h2>
            <p>
              Ми приділяємо особливу увагу захисту інформації користувачів і застосовуємо відповідні технічні та організаційні заходи для запобігання несанкціонованому доступу, втраті, зміні або незаконному поширенню даних.
            </p>
            <p>
              Водночас користувачам також рекомендується відповідально ставитися до безпеки власного облікового запису, не передавати пароль третім особам та використовувати надійні унікальні паролі.
            </p>
          </div>

          {/* Section 6 */}
          <div className="space-y-2">
            <h2 className="text-white text-base sm:text-lg font-normal">
              6. Передача даних третім особам
            </h2>
            <p>
              CINEMA NOVA не продає персональні дані користувачів третім особам. Інформація може передаватися лише у випадках, необхідних для забезпечення роботи сервісу, виконання вимог законодавства або захисту прав і безпеки платформи та її користувачів.
            </p>
            <p>
              Ми прагнемо обмежувати обсяг інформації, яка може бути передана стороннім сервісам, лише необхідними даними.
            </p>
          </div>

          {/* Section 7 */}
          <div className="space-y-2">
            <h2 className="text-white text-base sm:text-lg font-normal">
              7. Cookies та технічна інформація
            </h2>
            <p>
              Для коректної роботи платформи CINEMA NOVA можуть використовуватися файли cookie та інші технології, які допомагають запам’ятовувати налаштування користувача, підтримувати авторизацію, аналізувати роботу сайту та покращувати його функціональність.
            </p>
            <p>
              Користувач може керувати використанням cookie через налаштування браузера. Однак вимкнення деяких файлів cookie може вплинути на роботу окремих функцій платформи.
            </p>
            <p>
              Детальнішу інформацію про використання cookie можна знайти у відповідному розділі налаштувань CINEMA NOVA.
            </p>
          </div>

          {/* Section 8 */}
          <div className="space-y-2">
            <h2 className="text-white text-base sm:text-lg font-normal">
              8. Ваші права та керування даними
            </h2>
            <p>
              Користувач має можливість керувати інформацією, пов’язаною зі своїм обліковим записом. Залежно від доступних функцій платформи ви можете змінювати дані профілю, редагувати персональні налаштування, видаляти окремі відгуки, змінювати оцінки та керувати збереженим контентом.
            </p>
            <p>
              Якщо ви маєте запитання щодо обробки персональних даних або бажаєте отримати додаткову інформацію про свої дані, ви можете звернутися до служби підтримки CINEMA NOVA.
            </p>
          </div>

          {/* Section 9 */}
          <div className="space-y-2">
            <h2 className="text-white text-base sm:text-lg font-normal">
              9. Зміни до Політики конфіденційності
            </h2>
            <p>
              Ми можемо періодично оновлювати цю Політику конфіденційності у зв’язку зі змінами в роботі платформи, появою нових функцій або змінами вимог законодавства.
            </p>
            <p>
              Актуальна версія Політики завжди доступна на сайті CINEMA NOVA. Продовжуючи користуватися платформою після внесення змін, ви підтверджуєте ознайомлення з оновленими умовами.
            </p>
          </div>

          {/* Section 10 */}
          <div className="space-y-2">
            <h2 className="text-white text-base sm:text-lg font-normal">
              10. Контактна інформація
            </h2>
            <p>
              Якщо у вас виникли запитання щодо конфіденційності, захисту персональних даних або роботи CINEMA NOVA, зверніться до нашої служби підтримки через доступні на платформі канали зв’язку.
            </p>
          </div>

          {/* Slogan Quote */}
          <div className="pt-8 text-zinc-300 text-base sm:text-lg italic leading-relaxed font-light">
            Ми прагнемо створити простір, у якому можна не лише відкривати нові історії та ділитися емоціями від перегляду, а й почуватися впевнено щодо безпеки власної інформації.
          </div>
        </div>
      </div>
    );
  }

  // English fallback
  return (
    <div className="w-full min-h-[70vh] px-4 sm:px-8 md:px-14 lg:px-20 py-8 sm:py-12 max-w-[1700px] mx-auto animate-fade-in">
      <h1 className="text-xl sm:text-2xl md:text-[26px] font-medium text-white tracking-normal mb-8 sm:mb-10">
        Privacy Policy
      </h1>

      <div className="space-y-7 max-w-4xl text-zinc-200 text-sm sm:text-[15px] font-normal leading-relaxed">
        <div className="space-y-2">
          <h2 className="text-white text-base sm:text-lg font-normal">
            1. General Provisions
          </h2>
          <p>
            CINEMA NOVA respects every user’s privacy and takes personal data protection responsibly. This Privacy Policy explains what information we collect, how it is used, and what protective measures are applied.
          </p>
        </div>

        <div className="space-y-2">
          <h2 className="text-white text-base sm:text-lg font-normal">
            2. Information We Collect
          </h2>
          <p>
            During registration and platform use, we collect voluntary information such as username, email address, profile preferences, viewing history, saved items, and Watch Party room activity.
          </p>
        </div>

        <div className="space-y-2">
          <h2 className="text-white text-base sm:text-lg font-normal">
            3. How We Use Information
          </h2>
          <p>
            Data is used to provide core platform functionality, maintain user accounts, deliver tailored recommendations, support offline storage, and enhance streaming stability.
          </p>
        </div>

        <div className="space-y-2">
          <h2 className="text-white text-base sm:text-lg font-normal">
            4. Personal Recommendations & Security
          </h2>
          <p>
            We deploy encryption and technical security practices to prevent unauthorized access. Personal recommendations are generated algorithmically to improve your media discovery.
          </p>
        </div>

        <div className="pt-8 text-zinc-300 text-base sm:text-lg italic leading-relaxed font-light">
          We strive to create a space where you can not only discover new stories and share viewing emotions, but also feel completely confident in the security of your personal information.
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicyView;
