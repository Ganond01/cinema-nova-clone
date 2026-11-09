import { Movie, UserProfile, WatchPartyRoom, PlatformAnalytics } from '../types';
import { DEMON_SLAYER_EPISODES, JUJUTSU_KAISEN_EPISODES, CHAINSAW_MAN_EPISODES, DEATH_NOTE_EPISODES } from './seriesEpisodes';

export const GENRES = [
  'Екшн',
  'Детектив',
  'Драма',
  'Кримінал',
  'Фантастика',
  'Пригоди',
  'Бойовик',
  'Біографія',
  'Історія',
  'Жахи',
  'Трилер',
  'Фентезі',
  'Комедія',
  'Аніме',
  'Сімейний'
];

export const PRESET_AVATARS = [
  { name: 'Бетмен', url: 'https://images.unsplash.com/photo-1531427186611-ecfd6d936c79?q=80&w=150&auto=format&fit=crop' },
  { name: 'Селіна', url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=150&auto=format&fit=crop' },
  { name: 'Джокер', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=150&auto=format&fit=crop' },
  { name: 'Чані', url: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=150&auto=format&fit=crop' },
  { name: 'Пол Атрід', url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=150&auto=format&fit=crop' },
  { name: 'Геральт', url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=150&auto=format&fit=crop' }
];

export const INITIAL_MOVIES: Movie[] = [
  {
    id: 'deadpool-wolverine-2024',
    title: 'Дедпул та Росомаха',
    titleEn: 'Deadpool & Wolverine',
    originalTitle: 'Deadpool & Wolverine',
    type: 'movie',
    year: 2024,
    duration: '2 год 08 хв',
    rating: 7.8,
    ratingVotesCount: '310K',
    ageRating: '18+',
    description: 'Вейд Вілсон мирно живе звичайним життям, допоки Управління часовими змінами не залучає його до місії, що загрожує його всесвіту. Для порятунку він мусить об’єднатися з небажаючим Росомахою.',
    descriptionEn: 'Deadpool’s peaceful existence comes crashing down when the TVA recruits him to help safeguard the multiverse alongside a grumpy Wolverine.',
    posterUrl: 'https://image.tmdb.org/t/p/w500/8cdWjvZQUExUUTzyp4t6EDMubfO.jpg',
    backdropUrl: 'https://image.tmdb.org/t/p/original/yDHYTfA3R0jFYba16jBB1jv8uaC.jpg',
    stills: [
      'https://image.tmdb.org/t/p/original/dvBCWFGw2lEZvdQ92vGg6bt82si.jpg',
      'https://image.tmdb.org/t/p/original/9l1eZiJHmhr5jA67VP5q7W54neN.jpg',
      'https://image.tmdb.org/t/p/original/yDHYTfA3R0jFYba16jBB1jv8uaC.jpg',
      'https://image.tmdb.org/t/p/original/8cdWjvZQUExUUTzyp4t6EDMubfO.jpg'
    ],
    genres: ['Бойовик', 'Фантастика', 'Комедія'],
    director: 'Шон Леві',
    languages: ['Українська', 'English'],
    subtitles: ['Українські', 'English'],
    releaseDate: '26 липня 2024',
    videoUrl: '/uploads/videos/1792290497066_1080p_Deadpool_Wolverine_2024_1785444065459.mp4',
    subtitleUrl: '/subtitles/1080p_Deadpool_Wolverine_2024_1785444065459_whisper.vtt',
    qualities: [
      { resolution: '1080p', url: '/uploads/videos/1792290497066_1080p_Deadpool_Wolverine_2024_1785444065459.mp4' }
    ],
    videoSources: {
      '1080p': '/uploads/videos/1792290497066_1080p_Deadpool_Wolverine_2024_1785444065459.mp4'
    },
    trailerEmbedUrl: 'https://www.youtube.com/embed/73_1biulkYk',
    isPopular: true,
    isNew: true,
    viewsCount: 610000,
    cast: [
      { name: 'Раян Рейнольдс', role: 'Вейд Вілсон / Дедпул', avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=150&auto=format&fit=crop' },
      { name: 'Гʼю Джекман', role: 'Лоґан / Росомаха', avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=150&auto=format&fit=crop' },
      { name: 'Емма Коррін', role: 'Кассандра Нова', avatarUrl: 'https://image.tmdb.org/t/p/w185/miSbXJBlq6S3dVvOr7OoNL4axW6.jpg' }
    ]
  },
  {
    id: 'dune-1984',
    title: 'Дюна',
    titleEn: 'Dune',
    originalTitle: 'Dune',
    type: 'movie',
    year: 1984,
    duration: '2 год 17 хв',
    rating: 6.5,
    ratingVotesCount: '190K',
    ageRating: '16+',
    description: 'У далекому майбутньому герцог Лето Атрід отримує в управління пустельну планету Арракіс — єдине джерело найціннішої речовини у всесвіті.',
    descriptionEn: 'A Duke\'s son leads desert warriors against the galactic emperor and his father\'s evil nemesis to avenge his father.',
    posterUrl: 'https://image.tmdb.org/t/p/w500/4kJmUCE7mkVJjXa7A0g2rY4IGTm.jpg',
    backdropUrl: 'https://image.tmdb.org/t/p/original/5wJ2tckpvwcxGCAgZiccodwEJpf.jpg',
    stills: [
      'https://image.tmdb.org/t/p/original/5wJ2tckpvwcxGCAgZiccodwEJpf.jpg',
      'https://image.tmdb.org/t/p/original/xOMo8BRK7PfcJv9JCnx7s5hj0PX.jpg'
    ],
    genres: ['Екшн', 'Пригоди'],
    director: 'Девід Лінч',
    languages: ['Українська', 'English'],
    subtitles: ['Українські', 'English'],
    releaseDate: '14 грудня 1984',
    viewsCount: 240000,
    videoUrl: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4'
  },
  {
    id: 'dune-2000',
    title: 'Дюна',
    titleEn: 'Frank Herbert\'s Dune',
    originalTitle: 'Frank Herbert\'s Dune',
    type: 'series',
    year: 2000,
    duration: '3 серії',
    rating: 6.9,
    ratingVotesCount: '45K',
    ageRating: '16+',
    description: 'Міні-серіал за романом Френка Герберта. Пол Атрід виявляється втягнутим у смертельну боротьбу за контроль над Арракісом.',
    descriptionEn: 'A three-part miniseries based on the novel by Frank Herbert.',
    posterUrl: 'https://image.tmdb.org/t/p/w500/iIf5XeuuBKPtG6H7MfWLirbJGrQ.jpg',
    backdropUrl: 'https://image.tmdb.org/t/p/original/e09SpH0iCVJRThzly1WqIsMt5j5.jpg',
    stills: [
      'https://image.tmdb.org/t/p/original/e09SpH0iCVJRThzly1WqIsMt5j5.jpg'
    ],
    genres: ['Фантастика', 'Пригоди'],
    director: 'Джон Гаррісон',
    languages: ['Українська', 'English'],
    subtitles: ['Українські', 'English'],
    releaseDate: '3 грудня 2000',
    viewsCount: 180000,
    videoUrl: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4'
  },
  {
    id: 'children-of-dune-2003',
    title: 'Діти Дюни',
    titleEn: 'Children of Dune',
    originalTitle: 'Frank Herbert\'s Children of Dune',
    type: 'series',
    year: 2003,
    duration: '3 серії',
    rating: 7.2,
    ratingVotesCount: '38K',
    ageRating: '16+',
    description: 'Продовження саги про Арракіс. Діти Пола Атріда повинні врятувати імперію від хаосу, інтриг та внутрішнього розколу.',
    descriptionEn: 'The twins of Paul Atreides deal with the political alliance of House Corrino and the Fremen.',
    posterUrl: 'https://image.tmdb.org/t/p/w500/yCP8lKXBMtcG1CU9K3NsWlu1RgF.jpg',
    backdropUrl: 'https://image.tmdb.org/t/p/original/8tko4lM3VE6Rpye7IbilDpdHsWh.jpg',
    stills: [
      'https://image.tmdb.org/t/p/original/8tko4lM3VE6Rpye7IbilDpdHsWh.jpg'
    ],
    genres: ['Драма', 'Пригоди'],
    director: 'Грег Яйтанс',
    languages: ['Українська', 'English'],
    subtitles: ['Українські', 'English'],
    releaseDate: '16 березня 2003',
    viewsCount: 210000,
    videoUrl: ''
  },
  {
    id: 'dune-part-one-2021',
    title: 'Дюна: Частина перша',
    titleEn: 'Dune: Part One',
    originalTitle: 'Dune',
    type: 'movie',
    year: 2021,
    duration: '2 год 35 хв',
    rating: 8.0,
    ratingVotesCount: '780K',
    ageRating: '16+',
    description: 'Пол Атрід, талановитий юнак із благородної родини, вирушає на найнебезпечнішу планету всесвіту, щоб забезпечити майбутнє свого народу.',
    descriptionEn: 'Paul Atreides leads nomadic tribes in a battle to control the desert planet Arrakis.',
    posterUrl: 'https://image.tmdb.org/t/p/w500/v1tRXZ4JtD2Iv6fjkPvT4GiwslV.jpg',
    backdropUrl: 'https://image.tmdb.org/t/p/original/lzWHmYZrFi0VhxIdgRJDxzxdaap.jpg',
    stills: [
      'https://image.tmdb.org/t/p/original/lzWHmYZrFi0VhxIdgRJDxzxdaap.jpg',
      'https://image.tmdb.org/t/p/original/xOMo8BRK7PfcJv9JCnx7s5hj0PX.jpg'
    ],
    genres: ['Фантастика', 'Фентезі'],
    director: 'Дені Вільньов',
    languages: ['Українська', 'English'],
    subtitles: ['Українські', 'English'],
    releaseDate: '16 вересня 2021',
    viewsCount: 680000,
    videoUrl: '',
    trailerEmbedUrl: 'https://www.youtube.com/embed/n9xhJrPXop4'
  },
  {
    id: 'dune-part-two-2024',
    title: 'Дюна: Частина друга',
    titleEn: 'Dune: Part Two',
    originalTitle: 'Dune: Part Two',
    type: 'movie',
    year: 2024,
    duration: '2 год 46 хв',
    rating: 8.4,
    ratingVotesCount: '280K',
    ageRating: '16+',
    description: 'Пол Атрід об’єднується з Чані та фрименами, прагнучи помститися змовникам, які знищили його родину. Повстаючи проти імператора, Пол прагне запобігти жахливому майбутньому.',
    descriptionEn: 'Paul Atreides unites with Chani and the Fremen while seeking revenge against the conspirators who destroyed his family.',
    posterUrl: 'https://image.tmdb.org/t/p/w500/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg',
    backdropUrl: 'https://image.tmdb.org/t/p/original/xOMo8BRK7PfcJv9JCnx7s5hj0PX.jpg',
    stills: [
      'https://image.tmdb.org/t/p/original/xOMo8BRK7PfcJv9JCnx7s5hj0PX.jpg',
      'https://image.tmdb.org/t/p/original/8b8R8l88Qje9dn9OE8PY05Nxl1X.jpg',
      'https://image.tmdb.org/t/p/original/lzWHmYZrFi0VhxIdgRJDxzxdaap.jpg'
    ],
    genres: ['Фантастика', 'Фентезі'],
    director: 'Дені Вільньов',
    languages: ['Українська', 'English'],
    subtitles: ['Українські', 'English'],
    releaseDate: '28 лютого 2024',
    videoUrl: '',
    trailerEmbedUrl: 'https://www.youtube.com/embed/Way9Dexny3w',
    isPopular: true,
    isNew: true,
    viewsCount: 520000,
    cast: [
      { name: 'Тімоті Шаламе', role: 'Пол Атрід', avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=150&auto=format&fit=crop' },
      { name: 'Зендея', role: 'Чані', avatarUrl: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?q=80&w=150&auto=format&fit=crop' }
    ]
  },
  {
    id: 'dune-prophecy-2024',
    title: 'Дюна. Пророцтво',
    titleEn: 'Dune: Prophecy',
    originalTitle: 'Dune: Prophecy',
    type: 'series',
    year: 2024,
    duration: '1 сезон • 6 серій',
    rating: 7.9,
    ratingVotesCount: '52K',
    ageRating: '16+',
    description: 'Події розгортаються за 10 000 років до сходження Пола Атріда. Історія створення таємного ордену Бене Ґессеріт двома сестрами з дому Харконненів.',
    descriptionEn: 'Set 10,000 years before the ascension of Paul Atreides, following two Harkonnen sisters.',
    posterUrl: 'https://image.tmdb.org/t/p/w500/oWVohNsxkxA3u92EzRo8fTuXIS0.jpg',
    backdropUrl: 'https://image.tmdb.org/t/p/original/lBoHzOgft2QfpjkVVvZCqeM4ttT.jpg',
    stills: [
      'https://image.tmdb.org/t/p/original/lBoHzOgft2QfpjkVVvZCqeM4ttT.jpg'
    ],
    genres: ['Фантастика', 'Пригоди'],
    director: 'Анна Ферстер',
    languages: ['Українська', 'English'],
    subtitles: ['Українські', 'English'],
    releaseDate: '17 листопада 2024',
    viewsCount: 390000,
    videoUrl: ''
  },
  {
    id: 'gladiator-2-2024',
    title: 'Гладіатор II',
    titleEn: 'Gladiator II',
    originalTitle: 'Gladiator II',
    type: 'movie',
    year: 2024,
    duration: '2 год 28 хв',
    rating: 7.8,
    ratingVotesCount: '190K',
    ageRating: '16+',
    description: 'Через роки після загибелі Максимуса, Луцій змушений вийти на арену Колізею, після того як його дім захопили тиранічні імператори, які керують Римом.',
    descriptionEn: 'Years after witnessing the death of Maximus, Lucius must enter the Colosseum after his home is conquered by the tyrannical Emperors.',
    posterUrl: 'https://image.tmdb.org/t/p/w500/2cxhvwyEwRlysAmRH4iodkvo0z5.jpg',
    backdropUrl: 'https://image.tmdb.org/t/p/original/euYIwmqkmz95mnXvufEmbL69ovr.jpg',
    stills: [
      'https://image.tmdb.org/t/p/original/euYIwmqkmz95mnXvufEmbL69ovr.jpg',
      'https://image.tmdb.org/t/p/original/is9Z5L2iJ1M55iM6XbJm7iFmZgE.jpg',
      'https://image.tmdb.org/t/p/original/tElnmt96asBHhoho1YvAIOFAd8.jpg'
    ],
    genres: ['Екшн', 'Пригоди', 'Драма', 'Історія'],
    director: 'Рідлі Скотт',
    languages: ['Українська', 'English'],
    subtitles: ['Українські', 'English'],
    releaseDate: '15 листопада 2024',
    videoUrl: '',
    trailerEmbedUrl: 'https://www.youtube.com/embed/4rgYUipGJNo',
    isPopular: true,
    isNew: true,
    viewsCount: 480000,
    cast: [
      { name: 'Пол Мескаль', role: 'Луцій', avatarUrl: 'https://image.tmdb.org/t/p/w185/mB1XjS1038318V0a3uKzE5u3.jpg' },
      { name: 'Педро Паскаль', role: 'Марк Акацій', avatarUrl: 'https://image.tmdb.org/t/p/w185/9VYK7oxcqhjd5LH583q8a0p5.jpg' }
    ]
  },
  {
    id: 'sinners-2025',
    title: 'Грішники',
    titleEn: 'Sinners',
    originalTitle: 'Sinners',
    type: 'movie',
    year: 2025,
    duration: '2 год 14 хв',
    rating: 7.5,
    ratingVotesCount: '95K',
    ageRating: '18+',
    description: 'Брати-близнюки намагаються залишити позаду своє важке кримінальне минуле та повертаються до рідного міста, але виявляють, що там чекає ще страшніше зло.',
    descriptionEn: 'Trying to leave their troubled lives behind, twin brothers return to their hometown, only to discover an even greater evil awaiting them.',
    posterUrl: 'https://image.tmdb.org/t/p/w500/fWPgbnt2LSqkQ6cdQc0SZN9CpLm.jpg',
    backdropUrl: 'https://image.tmdb.org/t/p/original/nAxGnGHOsfzufThz20zgmRwKur3.jpg',
    stills: [
      'https://image.tmdb.org/t/p/original/is9Z5L2iJ1M55iM6XbJm7iFmZgE.jpg',
      'https://image.tmdb.org/t/p/original/euYIwmqkmz95mnXvufEmbL69ovr.jpg'
    ],
    genres: ['Жахи', 'Трилер', 'Драма'],
    director: 'Раян Куґлер',
    languages: ['Українська', 'English'],
    subtitles: ['Українські', 'English'],
    releaseDate: '7 березня 2025',
    videoUrl: '',
    trailerEmbedUrl: 'https://www.youtube.com/embed/bKGxHflevuk',
    isPopular: true,
    isNew: true,
    viewsCount: 420000,
    cast: [
      { name: 'Майкл Б. Джордан', role: 'Смок / Елайджа', avatarUrl: 'https://image.tmdb.org/t/p/w185/mB1XjS1038318V0a3uKzE5u3.jpg' },
      { name: 'Гейлі Стайнфельд', role: 'Мері', avatarUrl: 'https://image.tmdb.org/t/p/w185/hs99.jpg' }
    ]
  },
  {
    id: 'f1-2025',
    title: 'F1: Формула 1',
    titleEn: 'F1',
    originalTitle: 'F1',
    type: 'movie',
    year: 2025,
    duration: '2 год 20 хв',
    rating: 7.9,
    ratingVotesCount: '89K',
    ageRating: '16+',
    description: 'Колишній гонщик Формули-1 Сонні Гейс повертається з відставки, щоб стати наставником юного та талановитого пілота Джошуа Пірса у вигаданій команді APXGP.',
    descriptionEn: 'A former Formula 1 driver comes out of retirement to mentor and team with a promising young hotshot in the fictitious APXGP racing team.',
    posterUrl: 'https://image.tmdb.org/t/p/w500/9PXZIUsSDh4alB80jheWX4fhZmy.jpg',
    backdropUrl: 'https://image.tmdb.org/t/p/original/lkDYN0whyE82mcM20rwtwjbniKF.jpg',
    stills: [
      'https://image.tmdb.org/t/p/original/euYIwmqkmz95mnXvufEmbL69ovr.jpg',
      'https://image.tmdb.org/t/p/original/is9Z5L2iJ1M55iM6XbJm7iFmZgE.jpg'
    ],
    genres: ['Драма', 'Спорт', 'Бойовик'],
    director: 'Джозеф Косінскі',
    languages: ['Українська', 'English'],
    subtitles: ['Українські', 'English'],
    releaseDate: '25 червня 2025',
    videoUrl: '/uploads/videos/1080p_up_1792316508772_trplv_F1-_Film_2025_1792316608920.mp4',
    subtitleUrl: '/subtitles/up_1792316508772_trplv_F1-_Film_2025_whisper.vtt',
    qualities: [
      { resolution: '1080p', url: '/uploads/videos/1080p_up_1792316508772_trplv_F1-_Film_2025_1792316608920.mp4' },
      { resolution: '720p', url: '/uploads/videos/720p_up_1792316508772_trplv_F1-_Film_2025_1792316608920.mp4' },
      { resolution: '480p', url: '/uploads/videos/480p_up_1792316508772_trplv_F1-_Film_2025_1792316608920.mp4' }
    ],
    videoSources: {
      '1080p': '/uploads/videos/1080p_up_1792316508772_trplv_F1-_Film_2025_1792316608920.mp4',
      '720p': '/uploads/videos/720p_up_1792316508772_trplv_F1-_Film_2025_1792316608920.mp4',
      '480p': '/uploads/videos/480p_up_1792316508772_trplv_F1-_Film_2025_1792316608920.mp4'
    },
    trailerEmbedUrl: 'https://www.youtube.com/embed/4rgYUipGJNo',
    isPopular: true,
    isNew: true,
    viewsCount: 440000,
    cast: [
      { name: 'Бред Пітт', role: 'Сонні Гейс', avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=150&auto=format&fit=crop' },
      { name: 'Демсон Ідріс', role: 'Джошуа Пірс', avatarUrl: 'https://image.tmdb.org/t/p/w185/mB1XjS1038318V0a3uKzE5u3.jpg' }
    ]
  },
  {
    id: 'alien-romulus-2024',
    title: 'Чужий: Ромул',
    titleEn: 'Alien: Romulus',
    originalTitle: 'Alien: Romulus',
    type: 'movie',
    year: 2024,
    duration: '1 год 59 хв',
    rating: 7.3,
    ratingVotesCount: '160K',
    ageRating: '18+',
    description: 'Досліджуючи занедбані глибини космічної станції «Ромул», група молодих колонізаторів стикається віч-на-віч із найжахливішою формою життя у всесвіті.',
    descriptionEn: 'While scavenging the deep ends of a derelict space station, young space colonizers come face to face with the most terrifying life form in the universe.',
    posterUrl: 'https://image.tmdb.org/t/p/w500/b33nnKl1GSFbao4l3fZDDqsMx0F.jpg',
    backdropUrl: 'https://image.tmdb.org/t/p/original/9l1eZiJHmhr5jA67VP5q7W54neN.jpg',
    stills: [
      'https://image.tmdb.org/t/p/original/9l1eZiJHmhr5jA67VP5q7W54neN.jpg',
      'https://image.tmdb.org/t/p/original/wNAhuOZ3ZfNx4KfT204w52zg7bB.jpg'
    ],
    genres: ['Жахи', 'Фантастика', 'Трилер'],
    director: 'Феде Альварес',
    languages: ['Українська', 'English'],
    subtitles: ['Українські', 'English'],
    releaseDate: '16 серпня 2024',
    videoUrl: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
    trailerEmbedUrl: 'https://www.youtube.com/embed/x0XDEhP4MQs',
    isPopular: true,
    isNew: true,
    viewsCount: 390000,
    cast: [
      { name: 'Кейлі Спені', role: 'Рейн', avatarUrl: 'https://image.tmdb.org/t/p/w185/ca9B2yQeF10a.jpg' },
      { name: 'Девід Джонссон', role: 'Енді', avatarUrl: 'https://image.tmdb.org/t/p/w185/mB1XjS1038318V0a3uKzE5u3.jpg' }
    ]
  },
  {
    id: 'furiosa-2024',
    title: 'Фуріоза: Шалений Макс. Сага',
    titleEn: 'Furiosa: A Mad Max Saga',
    originalTitle: 'Furiosa: A Mad Max Saga',
    type: 'movie',
    year: 2024,
    duration: '2 год 28 хв',
    rating: 7.6,
    ratingVotesCount: '145K',
    ageRating: '16+',
    description: 'Коли світ упав, молоду Фуріозу викрадають із Зелених Земель, і вона потрапляє до рук Байкерської Орди на чолі з Дементусом.',
    descriptionEn: 'As the world fell, young Furiosa is snatched from the Green Place and falls into the hands of a great Biker Horde led by Warlord Dementus.',
    posterUrl: 'https://image.tmdb.org/t/p/w500/iADOJ8Zymht2JPMoy3R7xceZprc.jpg',
    backdropUrl: 'https://image.tmdb.org/t/p/original/wNAhuOZ3ZfNx4KfT204w52zg7bB.jpg',
    stills: [
      'https://image.tmdb.org/t/p/original/wNAhuOZ3ZfNx4KfT204w52zg7bB.jpg',
      'https://image.tmdb.org/t/p/original/u7AZ5Cdq2rrwU0K6Gu09sfR4z7P.jpg'
    ],
    genres: ['Екшн', 'Пригоди', 'Фантастика'],
    director: 'Джордж Міллер',
    languages: ['Українська', 'English'],
    subtitles: ['Українські', 'English'],
    releaseDate: '24 травня 2024',
    videoUrl: '',
    trailerEmbedUrl: 'https://www.youtube.com/embed/XJMuhwVlca4',
    isPopular: true,
    isNew: true,
    viewsCount: 350000,
    cast: [
      { name: 'Аня Тейлор-Джой', role: 'Фуріоза', avatarUrl: 'https://image.tmdb.org/t/p/w185/hs99.jpg' },
      { name: 'Кріс Гемсворт', role: 'Дементус', avatarUrl: 'https://image.tmdb.org/t/p/w185/mB1XjS1038318V0a3uKzE5u3.jpg' }
    ]
  },
  {
    id: 'nosferatu-2024',
    title: 'Носферату',
    titleEn: 'Nosferatu',
    originalTitle: 'Nosferatu',
    type: 'movie',
    year: 2024,
    duration: '2 год 12 хв',
    rating: 7.7,
    ratingVotesCount: '85K',
    ageRating: '18+',
    description: 'Готична історія про одержимість молодої жінки у Німеччині 19 століття та стародавнього трансильванського вампіра, який переслідує її.',
    descriptionEn: 'A gothic tale of obsession between a haunted young woman in 19th-century Germany and the ancient Transylvanian vampire who stalks her.',
    posterUrl: 'https://image.tmdb.org/t/p/w500/5qGIxdEO841C0tdY8vOdLoRVrr0.jpg',
    backdropUrl: 'https://image.tmdb.org/t/p/original/gprjiZWY43vxSKngMha1wfb5TGG.jpg',
    stills: [
      'https://image.tmdb.org/t/p/original/tElnmt96asBHhoho1YvAIOFAd8.jpg',
      'https://image.tmdb.org/t/p/original/is9Z5L2iJ1M55iM6XbJm7iFmZgE.jpg'
    ],
    genres: ['Жахи', 'Драма', 'Фентезі'],
    director: 'Роберт Еґґерс',
    languages: ['Українська', 'English'],
    subtitles: ['Українські', 'English'],
    releaseDate: '25 грудня 2024',
    videoUrl: '',
    trailerEmbedUrl: 'https://www.youtube.com/embed/nulvWqYUM8k',
    isPopular: true,
    isNew: true,
    viewsCount: 310000,
    cast: [
      { name: 'Білл Скашґорд', role: 'Граф Орлок', avatarUrl: 'https://image.tmdb.org/t/p/w185/mB1XjS1038318V0a3uKzE5u3.jpg' },
      { name: 'Лілі-Роуз Депп', role: 'Еллен Гаттер', avatarUrl: 'https://image.tmdb.org/t/p/w185/ca9B2yQeF10a.jpg' }
    ]
  },
  {
    id: 'captain-america-brave-new-world-2025',
    title: 'Капітан Америка: Чудесний новий світ',
    titleEn: 'Captain America: Brave New World',
    originalTitle: 'Captain America: Brave New World',
    type: 'movie',
    year: 2025,
    duration: '1 год 58 хв',
    rating: 7.2,
    ratingVotesCount: '50K',
    ageRating: '12+',
    description: 'Сем Вілсон, який офіційно прийняв щит та мантію Капітана Америки, опиняється в епіцентрі міжнародного інциденту після зустрічі з президентом США.',
    descriptionEn: 'Sam Wilson finds himself in the middle of an international incident after meeting with newly elected President Thaddeus Ross.',
    posterUrl: 'https://image.tmdb.org/t/p/w500/pzIddUEMWhWzfvLI3TwxUG2wGoi.jpg',
    backdropUrl: 'https://image.tmdb.org/t/p/original/u7AZ5Cdq2rrwU0K6Gu09sfR4z7P.jpg',
    stills: [
      'https://image.tmdb.org/t/p/original/u7AZ5Cdq2rrwU0K6Gu09sfR4z7P.jpg',
      'https://image.tmdb.org/t/p/original/euYIwmqkmz95mnXvufEmbL69ovr.jpg'
    ],
    genres: ['Екшн', 'Пригоди', 'Фантастика', 'Трилер'],
    director: 'Джуліус Она',
    languages: ['Українська', 'English'],
    subtitles: ['Українські', 'English'],
    releaseDate: '14 лютого 2025',
    videoUrl: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
    trailerEmbedUrl: 'https://www.youtube.com/embed/1pHDWnXmK7Y',
    isPopular: true,
    isNew: true,
    viewsCount: 380000,
    cast: [
      { name: 'Ентоні Макі', role: 'Сем Вілсон / Капітан Америка', avatarUrl: 'https://image.tmdb.org/t/p/w185/mB1XjS1038318V0a3uKzE5u3.jpg' },
      { name: 'Гаррісон Форд', role: 'Таддеус Росс / Червоний Халк', avatarUrl: 'https://image.tmdb.org/t/p/w185/cEU284u94mNskV4j3Jk2v6.jpg' }
    ]
  },
  {
    id: 'arcane-s2-2024',
    title: 'Аркейн: Сезон 2',
    titleEn: 'Arcane: Season 2',
    originalTitle: 'Arcane: Season 2',
    type: 'series',
    year: 2024,
    duration: '9 серій',
    rating: 8.9,
    ratingVotesCount: '230K',
    ageRating: '16+',
    description: 'Кульмінація протистояння між заможним містом Пілтовером і підземним Зауном. Сестри Вай та Джінкс опиняються по різні боки кривавої війни.',
    descriptionEn: 'The confrontation between wealthy Piltover and oppressed Zaun reaches a boiling point. Sisters Vi and Jinx find themselves on opposite sides of war.',
    posterUrl: 'https://image.tmdb.org/t/p/w500/fqldf2t8ztc9aiwn3k6mlX3tvRT.jpg',
    backdropUrl: 'https://image.tmdb.org/t/p/original/is9Z5L2iJ1M55iM6XbJm7iFmZgE.jpg',
    stills: [
      'https://image.tmdb.org/t/p/original/is9Z5L2iJ1M55iM6XbJm7iFmZgE.jpg',
      'https://image.tmdb.org/t/p/original/56v2KjBlU4XaOv9rVYEQypROD7P.jpg'
    ],
    genres: ['Анімація', 'Фантастика', 'Екшн', 'Драма'],
    director: 'Паскаль Шаррю, Арно Делор',
    languages: ['Українська', 'English'],
    subtitles: ['Українські', 'English'],
    releaseDate: '9 листопада 2024',
    videoUrl: '',
    trailerEmbedUrl: 'https://www.youtube.com/embed/hs3s4U1Lp1k',
    isPopular: true,
    isNew: true,
    viewsCount: 490000,
    cast: [
      { name: 'Гейлі Стайнфельд', role: 'Вай', avatarUrl: 'https://image.tmdb.org/t/p/w185/hs99.jpg' },
      { name: 'Елла Пернелл', role: 'Джінкс', avatarUrl: 'https://image.tmdb.org/t/p/w185/ca9B2yQeF10a.jpg' }
    ]
  },
  {
    id: 'the-penguin-2024',
    title: 'Пінгвін',
    titleEn: 'The Penguin',
    originalTitle: 'The Penguin',
    type: 'series',
    year: 2024,
    duration: '8 серій',
    rating: 8.8,
    ratingVotesCount: '195K',
    ageRating: '18+',
    description: 'Після затоплення Готема та смерті Кармайна Фальконе, Освальд "Пінгвін" Кобблпот робить свій зухвалий крок, щоб захопити владу у кримінальному світі.',
    descriptionEn: 'Following the events of The Batman, Oswald Cobb makes a play to seize the reins of the criminal underworld in Gotham.',
    posterUrl: 'https://image.tmdb.org/t/p/w500/vOWcqC4oDQws1doDWLO7d3dh5qc.jpg',
    backdropUrl: 'https://image.tmdb.org/t/p/original/1bgPq9JdKqD9pY7v4QZ2K8R1rP7.jpg',
    stills: [
      'https://image.tmdb.org/t/p/original/1bgPq9JdKqD9pY7v4QZ2K8R1rP7.jpg',
      'https://image.tmdb.org/t/p/original/IYUD7rAIXzBM91TT3Z5fILUS7n.jpg'
    ],
    genres: ['Кримінал', 'Драма'],
    director: 'Лорен Лефранк, Крейґ Зобел',
    languages: ['Українська', 'English'],
    subtitles: ['Українські', 'English'],
    releaseDate: '19 вересня 2024',
    videoUrl: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
    trailerEmbedUrl: 'https://www.youtube.com/embed/sfJG6hvuMfE',
    isPopular: true,
    isNew: true,
    viewsCount: 430000,
    cast: [
      { name: 'Колін Фаррелл', role: 'Освальд Кобблпот', avatarUrl: 'https://image.tmdb.org/t/p/w185/mB1XjS1038318V0a3uKzE5u3.jpg' },
      { name: 'Крістін Міліоті', role: 'Софія Фальконе', avatarUrl: 'https://image.tmdb.org/t/p/w185/ca9B2yQeF10a.jpg' }
    ]
  },
  {
    id: 'the-batman-2022',
    title: 'Бетмен',
    titleEn: 'The Batman',
    originalTitle: 'The Batman',
    type: 'movie',
    year: 2022,
    duration: '2 год 56 хв',
    rating: 8.1,
    ratingVotesCount: '125K',
    ageRating: '16+',
    description: 'Бетмен досліджує корупцію в Готемі та стикається з загадковим Загадником, який залишає після себе серію жорстоких злочинів.',
    descriptionEn: 'Batman ventures into Gotham City\'s underworld when a sadistic killer leaves behind a trail of cryptic clues.',
    posterUrl: 'https://image.tmdb.org/t/p/w500/74xTEgt7R36Fpooo50r9T25onhq.jpg',
    backdropUrl: 'https://image.tmdb.org/t/p/original/IYUD7rAIXzBM91TT3Z5fILUS7n.jpg',
    stills: [
      'https://image.tmdb.org/t/p/original/IYUD7rAIXzBM91TT3Z5fILUS7n.jpg',
      'https://image.tmdb.org/t/p/original/cfT29Im5VDvjE0RpyKOSdCKZal7.jpg'
    ],
    genres: ['Екшн', 'Детектив', 'Драма', 'Кримінал'],
    director: 'Метт Рівз',
    languages: ['Українська', 'English'],
    subtitles: ['Українські', 'English'],
    releaseDate: '3 березня 2022',
    videoUrl: '',
    trailerEmbedUrl: 'https://www.youtube.com/embed/mqq_H30_ps8',
    isPopular: true,
    isNew: false,
    viewsCount: 154200,
    cast: [
      { name: 'Роберт Паттінсон', role: 'Брюс Вейн / Бетмен', avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=150&auto=format&fit=crop' },
      { name: 'Зої Кравіц', role: 'Селіна Кайл / Жінка-кішка', avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=150&auto=format&fit=crop' }
    ]
  },
  {
    id: 'interstellar-2014',
    title: 'Інтерстеллар',
    titleEn: 'Interstellar',
    originalTitle: 'Interstellar',
    type: 'movie',
    year: 2014,
    duration: '2 год 49 хв',
    rating: 8.7,
    ratingVotesCount: '340K',
    ageRating: '12+',
    description: 'Група дослідників відправляється в найнебезпечнішу подорож в історії людства крізь щойно виявлену червоточину, щоб знайти планету для життя людей.',
    descriptionEn: 'A team of explorers travel through a wormhole in space in an attempt to ensure humanity\'s survival.',
    posterUrl: 'https://image.tmdb.org/t/p/w500/yQvGrMoipbRoddT0ZR8tPoR7NfX.jpg',
    backdropUrl: 'https://image.tmdb.org/t/p/original/2ssWTSVklAEc98frZUQhgtGHx7s.jpg',
    stills: [
      'https://image.tmdb.org/t/p/original/2ssWTSVklAEc98frZUQhgtGHx7s.jpg',
      'https://image.tmdb.org/t/p/original/xOMo8BRK7PfcJv9JCnx7s5hj0PX.jpg'
    ],
    genres: ['Фантастика', 'Драма', 'Пригоди'],
    director: 'Крістофер Нолан',
    languages: ['Українська', 'English'],
    subtitles: ['Українські', 'English'],
    releaseDate: '6 листопада 2014',
    videoUrl: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
    trailerEmbedUrl: 'https://www.youtube.com/embed/zSWdZVtXT7E',
    isPopular: true,
    isNew: false,
    viewsCount: 312000,
    cast: [
      { name: 'Меттью Макконахі', role: 'Купер', avatarUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?q=80&w=150&auto=format&fit=crop' },
      { name: 'Енн Гетевей', role: 'Бренд', avatarUrl: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?q=80&w=150&auto=format&fit=crop' }
    ]
  },
  {
    id: 'oppenheimer-2023',
    title: 'Оппенгеймер',
    titleEn: 'Oppenheimer',
    originalTitle: 'Oppenheimer',
    type: 'movie',
    year: 2023,
    duration: '3 год 00 хв',
    rating: 8.4,
    ratingVotesCount: '190K',
    ageRating: '16+',
    description: 'Біографічна драма про життя американського фізика-теоретика Роберта Оппенгеймера, який керував створенням першої у світі атомної бомби.',
    descriptionEn: 'The story of American scientist J. Robert Oppenheimer and his role in the development of the atomic bomb.',
    posterUrl: 'https://image.tmdb.org/t/p/w500/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg',
    backdropUrl: 'https://image.tmdb.org/t/p/original/neeNHeXjMF5fXoCJRsOmkNGC7q.jpg',
    stills: [
      'https://image.tmdb.org/t/p/original/neeNHeXjMF5fXoCJRsOmkNGC7q.jpg',
      'https://image.tmdb.org/t/p/original/fm6KqXpk3M2HVveHwCrBSSBaO0V.jpg'
    ],
    genres: ['Біографія', 'Драма', 'Історія'],
    director: 'Крістофер Нолан',
    languages: ['Українська', 'English'],
    subtitles: ['Українські', 'English'],
    releaseDate: '20 липня 2023',
    videoUrl: '/uploads/videos/1080p_Oppenheymer_Film_2023_1792287408047.mp4',
    subtitleUrl: '/subtitles/1080p_Oppenheymer_Film_2023_1792287408047.vtt',
    qualities: [
      { resolution: '1080p', url: '/uploads/videos/1080p_Oppenheymer_Film_2023_1792287408047.mp4' },
      { resolution: '720p', url: '/uploads/videos/720p_Oppenheymer_Film_2023_1792287408047.mp4' },
      { resolution: '480p', url: '/uploads/videos/up_1792294549453_ls6di_480p_Oppenheymer_Film_2023_1792287408047.mp4' }
    ],
    videoSources: {
      '1080p': '/uploads/videos/1080p_Oppenheymer_Film_2023_1792287408047.mp4',
      '720p': '/uploads/videos/720p_Oppenheymer_Film_2023_1792287408047.mp4',
      '480p': '/uploads/videos/up_1792294549453_ls6di_480p_Oppenheymer_Film_2023_1792287408047.mp4'
    },
    trailerEmbedUrl: 'https://www.youtube.com/embed/uYPbbksJxIg',
    isPopular: true,
    isNew: true,
    viewsCount: 198500,
    cast: [
      { name: 'Кілліан Мерфі', role: 'Роберт Оппенгеймер', avatarUrl: 'https://images.unsplash.com/photo-1530268729831-4b0b9e170218?q=80&w=150&auto=format&fit=crop' },
      { name: 'Емілі Блант', role: 'Кітті Оппенгеймер', avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=150&auto=format&fit=crop' }
    ]
  },
  {
    id: 'stranger-things-s4',
    title: 'Дивні дива',
    titleEn: 'Stranger Things',
    originalTitle: 'Stranger Things',
    type: 'series',
    year: 2016,
    duration: '4 сезони',
    rating: 8.6,
    ratingVotesCount: '310K',
    ageRating: '16+',
    description: 'У провінційному містечку Хоукінс за незрозумілих обставин зникає підліток. Мешканці стикаються з таємницями військової лабораторії та Світом Навиворіт.',
    descriptionEn: 'When a young boy vanishes, a small town uncovers a mystery involving secret experiments, terrifying supernatural forces and one strange little girl.',
    posterUrl: 'https://image.tmdb.org/t/p/w500/49WJfeN0moxb9IPfGn8AIqMGskD.jpg',
    backdropUrl: 'https://image.tmdb.org/t/p/original/56v2KjBlU4XaOv9rVYEQypROD7P.jpg',
    stills: [
      'https://image.tmdb.org/t/p/original/56v2KjBlU4XaOv9rVYEQypROD7P.jpg',
      'https://image.tmdb.org/t/p/original/4M8PQ1C1jJWECgpztQlyHjSA2R2.jpg'
    ],
    genres: ['Драма', 'Детектив'],
    director: 'Брати Даффер',
    languages: ['Українська', 'English'],
    subtitles: ['Українські', 'English'],
    releaseDate: '15 липня 2016',
    videoUrl: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
    trailerEmbedUrl: 'https://www.youtube.com/embed/b9EkMc79ZSU',
    isPopular: true,
    isNew: false,
    viewsCount: 450000
  },
  {
    id: 'monster-anime',
    title: 'Монстр',
    titleEn: 'Monster',
    originalTitle: 'Monster',
    type: 'series',
    year: 2004,
    duration: '1 сезон • 74 серії',
    rating: 7.2,
    ratingVotesCount: '210K',
    ageRating: '16+',
    description: 'Блискучий нейрохірург Кендзо Тенма рятує життя хлопчика замість мера міста, не підозрюючи, що врятував майбутнього психопатичного серійного вбивцю.',
    descriptionEn: 'A brilliant neurosurgeon gets his life turned upside down after saving a boy who grows up to be a charismatic psychopathic killer.',
    posterUrl: 'https://image.tmdb.org/t/p/w500/n5XNKXnoXpoXyfiCtXHOf8q8PFM.jpg',
    backdropUrl: 'https://image.tmdb.org/t/p/original/6T19aRp9zLMghZo1dTEwoNyreNZ.jpg',
    genres: ['Жахи', 'Фантастика'],
    director: 'Масаюкі Кодзіма',
    languages: ['Japanese', 'Українська'],
    subtitles: ['Українські'],
    releaseDate: '6 квітня 2004',
    videoUrl: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
    trailerEmbedUrl: 'https://www.youtube.com/embed/LHtdKW8-Z4',
    isPopular: true,
    isNew: false,
    viewsCount: 340000
  },
  {
    id: 'spiderman-brand-new-day',
    title: 'Людина-павук: Абсолютно новий день',
    titleEn: 'Spider-Man: Brand New Day',
    originalTitle: 'Spider-Man: Brand New Day',
    type: 'movie',
    year: 2026,
    duration: '2 год 25 хв',
    rating: 8.5,
    ratingVotesCount: '190K',
    ageRating: '16+',
    description: 'Пітер Паркер веде боротьбу зі злочинністю у світі, який забув його справжнє імʼя. Зустріч з новими ворогами та соратниками відкриває нову епоху пригод.',
    descriptionEn: 'Fighting crime full-time as Spider-Man in a world that doesn\'t remember him, Peter Parker faces fresh adversaries and a powerful new threat to New York City.',
    posterUrl: 'https://image.tmdb.org/t/p/w500/bjiS5ipwxb9JFy3XRRN4OAilSeX.jpg',
    backdropUrl: 'https://image.tmdb.org/t/p/original/subj7knTn4DeS6KS7qI66EQKe9i.jpg',
    genres: ['Фантастика', 'Екшн', 'Пригоди'],
    director: 'Дестін Деніел Креттон',
    languages: ['Українська', 'English'],
    subtitles: ['Українські', 'English'],
    releaseDate: '29 липня 2026',
    videoUrl: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
    trailerEmbedUrl: 'https://www.youtube.com/embed/oqxAJKy0ii4',
    isPopular: true,
    isNew: true,
    viewsCount: 420000,
    cast: [
      { name: 'Том Голланд', role: 'Пітер Паркер / Людина-павук', avatarUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=150&auto=format&fit=crop' },
      { name: 'Зендея', role: 'Ем-Джей', avatarUrl: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?q=80&w=150&auto=format&fit=crop' }
    ]
  },
  {
    id: 'joker-2019',
    title: 'Джокер',
    titleEn: 'Joker',
    originalTitle: 'Joker',
    type: 'movie',
    year: 2019,
    duration: '2 год 02 хв',
    rating: 8.4,
    ratingVotesCount: '280K',
    ageRating: '18+',
    description: 'Невдаха-комік Артур Флек стикається з жорстокістю суспільства, що штовхає його на шлях безумства і перетворює на Джокера.',
    descriptionEn: 'During the 1980s, a failed stand-up comedian is driven insane and turns to a life of crime and chaos in Gotham City.',
    posterUrl: 'https://image.tmdb.org/t/p/w500/udDclJoHjfjb8Ekgsd4FDteOkCU.jpg',
    backdropUrl: 'https://image.tmdb.org/t/p/original/rlay2M5QYvi6igbGcFjq8jxeusY.jpg',
    stills: [
      'https://image.tmdb.org/t/p/original/rlay2M5QYvi6igbGcFjq8jxeusY.jpg',
      'https://image.tmdb.org/t/p/original/cfT29Im5VDvjE0RpyKOSdCKZal7.jpg'
    ],
    genres: ['Трилер', 'Драма', 'Кримінал'],
    director: 'Тодд Філліпс',
    languages: ['Українська', 'English'],
    subtitles: ['Українські', 'English'],
    releaseDate: '3 жовтня 2019',
    videoUrl: '',
    trailerEmbedUrl: 'https://www.youtube.com/embed/zAGVQLH_14U',
    isPopular: true,
    isNew: false,
    viewsCount: 265000,
    cast: [
      { name: 'Хоакін Фенікс', role: 'Артур Флек / Джокер', avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=150&auto=format&fit=crop' },
      { name: 'Роберт Де Ніро', role: 'Мюррей Франклін', avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=150&auto=format&fit=crop' }
    ]
  },
  {
    id: 'the-witcher-s3',
    title: 'Відьмак',
    titleEn: 'The Witcher',
    originalTitle: 'The Witcher',
    type: 'series',
    year: 2023,
    duration: '3 сезони',
    rating: 8.0,
    ratingVotesCount: '150K',
    ageRating: '18+',
    description: 'Геральт із Рівії — відьмак, самотній мисливець на чудовиськ, який намагається знайти своє місце у світі на охопленому війною континенті.',
    descriptionEn: 'Geralt of Rivia, a mutated monster-hunter for hire, journeys toward his destiny in a turbulent world.',
    posterUrl: 'https://image.tmdb.org/t/p/w500/f7Cghnb6SQ4JpLhuFPmxoOeN78s.jpg',
    backdropUrl: 'https://image.tmdb.org/t/p/original/foGkPxpw9h8zln81j63mix5B7m8.jpg',
    stills: [
      'https://image.tmdb.org/t/p/original/foGkPxpw9h8zln81j63mix5B7m8.jpg',
      'https://image.tmdb.org/t/p/original/56v2KjBlU4XaOv9rVYEQypROD7P.jpg'
    ],
    genres: ['Фентезі', 'Екшн', 'Пригоди', 'Драма'],
    director: 'Лорен Шмідт Гіссріх',
    languages: ['Українська', 'English'],
    subtitles: ['Українські', 'English'],
    releaseDate: '20 грудня 2019',
    videoUrl: '',
    trailerEmbedUrl: 'https://www.youtube.com/embed/ndl1W4ltcmg',
    isPopular: false,
    isNew: false,
    viewsCount: 173000,
    cast: [
      { name: 'Генрі Кавілл', role: 'Геральт із Рівії', avatarUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?q=80&w=150&auto=format&fit=crop' },
      { name: 'Аня Чалотра', role: 'Йеннефер', avatarUrl: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?q=80&w=150&auto=format&fit=crop' }
    ]
  },
  {
    id: 'spiderman-nowayhome',
    title: 'Людина-павук: Додому шляху немає',
    titleEn: 'Spider-Man: No Way Home',
    originalTitle: 'Spider-Man: No Way Home',
    type: 'movie',
    year: 2021,
    duration: '2 год 28 хв',
    rating: 8.2,
    ratingVotesCount: '220K',
    ageRating: '12+',
    description: 'Життя Пітера Паркера перевертається після розкриття його таємниці. Звернення до Доктора Стренджа призводить до розриву мультивсесвіту.',
    descriptionEn: 'With Spider-Man\'s identity now revealed, Peter asks Doctor Strange for help. When a spell goes wrong, dangerous foes from other worlds start to appear.',
    posterUrl: 'https://image.tmdb.org/t/p/w500/1g0dhYtq4irTY1GPXvft6k4YLjm.jpg',
    backdropUrl: 'https://image.tmdb.org/t/p/original/AeK2MPOpYrOOgZNfFnfwp0L8tNn.jpg',
    stills: [
      'https://image.tmdb.org/t/p/original/AeK2MPOpYrOOgZNfFnfwp0L8tNn.jpg',
      'https://image.tmdb.org/t/p/original/muth4BgEZl36tqmgz22G6u2vT45.jpg'
    ],
    genres: ['Екшн', 'Пригоди', 'Фантастика'],
    director: 'Джон Воттс',
    languages: ['Українська', 'English'],
    subtitles: ['Українські', 'English'],
    releaseDate: '16 грудня 2021',
    videoUrl: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
    trailerEmbedUrl: 'https://www.youtube.com/embed/JfVOs4VSpmA',
    isPopular: false,
    isNew: true,
    viewsCount: 195000,
    cast: [
      { name: 'Том Голланд', role: 'Пітер Паркер', avatarUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=150&auto=format&fit=crop' },
      { name: 'Зендея', role: 'Ем-Джей', avatarUrl: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?q=80&w=150&auto=format&fit=crop' }
    ]
  },
  {
    id: 'dark-knight-2008',
    title: 'Темний лицар',
    titleEn: 'The Dark Knight',
    originalTitle: 'The Dark Knight',
    type: 'movie',
    year: 2008,
    duration: '2 год 32 хв',
    rating: 9.0,
    ratingVotesCount: '450K',
    ageRating: '16+',
    description: 'Бетмен піднімає ставки у війні з криміналом у Готемі, але стикається з геніальним агентом хаосу на ім’я Джокер.',
    descriptionEn: 'When the menace known as the Joker wreaks havoc and chaos on the people of Gotham, Batman must accept one of the greatest psychological and physical tests of his ability to fight injustice.',
    posterUrl: 'https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg',
    backdropUrl: 'https://image.tmdb.org/t/p/original/cfT29Im5VDvjE0RpyKOSdCKZal7.jpg',
    stills: [
      'https://image.tmdb.org/t/p/original/cfT29Im5VDvjE0RpyKOSdCKZal7.jpg',
      'https://image.tmdb.org/t/p/original/IYUD7rAIXzBM91TT3Z5fILUS7n.jpg'
    ],
    genres: ['Екшн', 'Кримінал', 'Драма', 'Трилер'],
    director: 'Крістофер Нолан',
    languages: ['Українська', 'English'],
    subtitles: ['Українські', 'English'],
    releaseDate: '18 липня 2008',
    videoUrl: '',
    trailerEmbedUrl: 'https://www.youtube.com/embed/EXeTwQWrcwY',
    isPopular: false,
    isNew: false,
    viewsCount: 389000,
    cast: [
      { name: 'Крістіан Бейл', role: 'Брюс Вейн / Бетмен', avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=150&auto=format&fit=crop' },
      { name: 'Хіт Леджер', role: 'Джокер', avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=150&auto=format&fit=crop' }
    ]
  },
  {
    id: 'attack-on-titan',
    title: 'Атака титанів',
    titleEn: 'Attack on Titan',
    originalTitle: 'Attack on Titan',
    type: 'series',
    year: 2013,
    duration: '4 сезони',
    rating: 9.1,
    ratingVotesCount: '320K',
    ageRating: '16+',
    description: 'У світі за величезними стінами людство ховається від титанів-людожерів. Ерен Єгер клянеться винищити всіх титанів після трагедії.',
    descriptionEn: 'After his hometown is destroyed and his mother is killed, young Eren Jaeger vows to cleanse the earth of the giant humanoid Titans.',
    posterUrl: 'https://image.tmdb.org/t/p/w500/hTP1DtLGFamjfu8WqjnuQdP1n4i.jpg',
    backdropUrl: 'https://image.tmdb.org/t/p/original/rqbCbjB19amtOtFQbb3K2lgm2zv.jpg',
    stills: [
      'https://image.tmdb.org/t/p/original/rqbCbjB19amtOtFQbb3K2lgm2zv.jpg',
      'https://image.tmdb.org/t/p/original/99Y64VK0KwyRWfaW6VdpDfPKNMo.jpg'
    ],
    genres: ['Аніме', 'Екшн', 'Пригоди', 'Драма', 'Фентезі'],
    director: 'Тецуро Аракі',
    languages: ['Japanese', 'Українська', 'English'],
    subtitles: ['Українські', 'English'],
    releaseDate: '7 квітня 2013',
    videoUrl: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
    trailerEmbedUrl: 'https://www.youtube.com/embed/LHtdKW8-Z4',
    isPopular: true,
    isNew: false,
    viewsCount: 310000,
    cast: [
      { name: 'Юкі Каджі', role: 'Ерен Єгер', avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=150&auto=format&fit=crop' },
      { name: 'Юі Ісікава', role: 'Мікаса Аккерман', avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=150&auto=format&fit=crop' }
    ]
  },
  {
    id: 'berserk-1997',
    title: 'Берсерк',
    titleEn: 'Berserk',
    originalTitle: 'Berserk',
    type: 'series',
    year: 1997,
    duration: '25 серій',
    rating: 8.8,
    ratingVotesCount: '78K',
    ageRating: '18+',
    description: 'Гатс — вмілий найманець із гігантським мечем, який вступає до «Банди Яструба» під проводом харизматичного Гриффіта.',
    descriptionEn: 'Guts is a young mercenary who is noticed by Griffith, the charismatic leader of the "Band of the Hawk."',
    posterUrl: 'https://image.tmdb.org/t/p/w500/xctRBSZzvoHDHz38ZZUGxRYetvG.jpg',
    backdropUrl: 'https://image.tmdb.org/t/p/original/99Y64VK0KwyRWfaW6VdpDfPKNMo.jpg',
    stills: [
      'https://image.tmdb.org/t/p/original/99Y64VK0KwyRWfaW6VdpDfPKNMo.jpg',
      'https://image.tmdb.org/t/p/original/rqbCbjB19amtOtFQbb3K2lgm2zv.jpg'
    ],
    genres: ['Аніме', 'Екшн', 'Пригоди', 'Драма', 'Фентезі'],
    director: 'Наохіто Такахасі',
    languages: ['Japanese', 'Українська', 'English'],
    subtitles: ['Українські', 'English'],
    releaseDate: '7 жовтня 1997',
    videoUrl: '',
    trailerEmbedUrl: 'https://www.youtube.com/embed/S43mCHf3w98',
    isPopular: true,
    isNew: false,
    viewsCount: 168000,
    cast: [
      { name: 'Нобутосі Канна', role: 'Гатс', avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=150&auto=format&fit=crop' },
      { name: 'Тосіюкі Морікава', role: 'Гриффіт', avatarUrl: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?q=80&w=150&auto=format&fit=crop' }
    ]
  },
  {
    id: 'spirited-away-2001',
    title: 'Віднесені привидами',
    titleEn: 'Spirited Away',
    originalTitle: 'Spirited Away',
    type: 'movie',
    year: 2001,
    duration: '2 год 05 хв',
    rating: 8.6,
    ratingVotesCount: '190K',
    ageRating: '12+',
    description: 'Маленька дівчинка Тіхіро потрапляє у чарівний світ духів і богів, де мусить працювати у лазні відьми Юбаби, щоб урятувати своїх батьків.',
    descriptionEn: 'Chihiro wanders into a world ruled by gods, witches, and spirits, where humans are changed into beasts.',
    posterUrl: 'https://image.tmdb.org/t/p/w500/39wmItIWsg5sZMyRUHLkWBcuVCM.jpg',
    backdropUrl: 'https://image.tmdb.org/t/p/original/dyJvKsNs2KP8qQnAXbRwDjblViy.jpg',
    stills: [
      'https://image.tmdb.org/t/p/original/dyJvKsNs2KP8qQnAXbRwDjblViy.jpg',
      'https://image.tmdb.org/t/p/original/zkThiZAaAie8Lw7RAc5yPTOewBV.jpg'
    ],
    genres: ['Аніме', 'Пригоди', 'Сімейний', 'Фентезі'],
    director: 'Хаяо Міядзакі',
    languages: ['Japanese', 'Українська', 'English'],
    subtitles: ['Українські', 'English'],
    releaseDate: '20 липня 2001',
    videoUrl: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
    trailerEmbedUrl: 'https://www.youtube.com/embed/ByXuk9QqQkk',
    isPopular: true,
    isNew: false,
    viewsCount: 245000,
    cast: [
      { name: 'Румі Хіраґі', role: 'Тіхіро', avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=150&auto=format&fit=crop' },
      { name: 'Мійю Іріно', role: 'Хаку', avatarUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=150&auto=format&fit=crop' }
    ]
  },
  {
    id: 'my-neighbor-totoro-1988',
    title: 'Мій сусід Тоторо',
    titleEn: 'My Neighbor Totoro',
    originalTitle: 'My Neighbor Totoro',
    type: 'movie',
    year: 1988,
    duration: '1 год 26 хв',
    rating: 8.2,
    ratingVotesCount: '78K',
    ageRating: '0+',
    description: 'Дві маленькі сестри Сацукі та Мей переїжджають у село і виявляють, що сусідній ліс населений добрими духами на чолі з велетенським Тоторо.',
    descriptionEn: 'Two young sisters discover that the nearby forest is inhabited by friendly forest spirits, most notably a giant creature named Totoro.',
    posterUrl: 'https://image.tmdb.org/t/p/w500/rtGDOeG9LzoerkDGZF9dnVeLppL.jpg',
    backdropUrl: 'https://image.tmdb.org/t/p/original/zkThiZAaAie8Lw7RAc5yPTOewBV.jpg',
    stills: [
      'https://image.tmdb.org/t/p/original/zkThiZAaAie8Lw7RAc5yPTOewBV.jpg',
      'https://image.tmdb.org/t/p/original/dyJvKsNs2KP8qQnAXbRwDjblViy.jpg'
    ],
    genres: ['Аніме', 'Сімейний', 'Фентезі'],
    director: 'Хаяо Міядзакі',
    languages: ['Japanese', 'Українська'],
    subtitles: ['Українські', 'English'],
    releaseDate: '16 квітня 1988',
    videoUrl: '',
    trailerEmbedUrl: 'https://www.youtube.com/embed/92a7Hj0ijLs',
    isPopular: false,
    isNew: false,
    viewsCount: 135000,
    cast: [
      { name: 'Норіко Хідака', role: 'Сацукі', avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=150&auto=format&fit=crop' },
      { name: 'Тіка Сакамото', role: 'Мей', avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=150&auto=format&fit=crop' }
    ]
  },
  {
    id: 'jujutsu-kaisen-2020',
    title: 'Магічна битва',
    titleEn: 'Jujutsu Kaisen',
    originalTitle: 'Jujutsu Kaisen',
    type: 'series',
    year: 2020,
    duration: '2 сезони',
    rating: 8.6,
    ratingVotesCount: '120K',
    ageRating: '16+',
    description: 'Юджі Ітадорі ковтає проклятий палець Дволикого Сукуни, щоб урятувати друзів, і вступає до Токійської школи магів під наставництвом Ґоджьо Сатору.',
    descriptionEn: 'Yuji Itadori swallows a cursed talisman of Ryomen Sukuna and enters Tokyo Jujutsu High School to fight against dangerous curses.',
    posterUrl: 'https://image.tmdb.org/t/p/w500/iCdyovPbsp1mrCDDMER0Y6EhLHX.jpg',
    backdropUrl: 'https://image.tmdb.org/t/p/original/qpin8cASXEVtwhzNsprHYFiOAGk.jpg',
    stills: [
      'https://image.tmdb.org/t/p/original/qpin8cASXEVtwhzNsprHYFiOAGk.jpg',
      'https://image.tmdb.org/t/p/original/5DUMPBSnHOZsbBv81GFXZXvDpo6.jpg'
    ],
    genres: ['Аніме', 'Екшн', 'Пригоди', 'Фентезі'],
    director: 'Сунху Пак',
    languages: ['Japanese', 'Українська'],
    subtitles: ['Українські', 'English'],
    releaseDate: '3 жовтня 2020',
    videoUrl: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
    trailerEmbedUrl: 'https://www.youtube.com/embed/PkXp9W_0zLw',
    isPopular: true,
    isNew: false,
    viewsCount: 239399,
    cast: [
      { name: 'Джунья Енокі', role: 'Юджі Ітадорі', avatarUrl: 'https://image.tmdb.org/t/p/w185/mB1XjS1038318V0a3uKzE5u3.jpg' },
      { name: 'Юічі Накамура', role: 'Сатору Ґоджьо', avatarUrl: 'https://image.tmdb.org/t/p/w185/cEU284u94mNskV4j3Jk2v6.jpg' }
    ],
    episodesData: JUJUTSU_KAISEN_EPISODES
  },
  {
    id: 'chainsaw-man-2022',
    title: 'Людина-бензопила',
    titleEn: 'Chainsaw Man',
    originalTitle: 'Chainsaw Man',
    type: 'series',
    year: 2022,
    duration: '1 сезон',
    rating: 8.5,
    ratingVotesCount: '95K',
    ageRating: '16+',
    description: 'Денджі зливається з демонічним псом Почітою та стає Людиною-бензопилою, вступаючи до бюро громадської безпеки для полювання на демонів.',
    descriptionEn: 'Denji merges with his pet chainsaw devil Pochita and is reborn as the Chainsaw Man, joining the Public Safety Devil Hunters.',
    posterUrl: 'https://image.tmdb.org/t/p/w500/Eq0LUaPedUHe9LzVC9bYOaMSxZ.jpg',
    backdropUrl: 'https://image.tmdb.org/t/p/original/5DUMPBSnHOZsbBv81GFXZXvDpo6.jpg',
    stills: [
      'https://image.tmdb.org/t/p/original/5DUMPBSnHOZsbBv81GFXZXvDpo6.jpg',
      'https://image.tmdb.org/t/p/original/qpin8cASXEVtwhzNsprHYFiOAGk.jpg'
    ],
    genres: ['Аніме', 'Екшн', 'Пригоди', 'Фантастика', 'Комедія'],
    director: 'Рю Накаяма',
    languages: ['Japanese', 'Українська'],
    subtitles: ['Українські', 'English'],
    releaseDate: '12 жовтня 2022',
    videoUrl: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
    trailerEmbedUrl: 'https://www.youtube.com/embed/v4y_1Z7U9wY',
    isPopular: true,
    isNew: false,
    viewsCount: 129401,
    cast: [
      { name: 'Кікуносуке Тоя', role: 'Денджі', avatarUrl: 'https://image.tmdb.org/t/p/w185/mB1XjS1038318V0a3uKzE5u3.jpg' },
      { name: 'Томорі Кусунокі', role: 'Макіма', avatarUrl: 'https://image.tmdb.org/t/p/w185/ca9B2yQeF10a.jpg' }
    ],
    episodesData: CHAINSAW_MAN_EPISODES
  },
  {
    id: 'demon-slayer-2019',
    title: 'Клинок, що знищує демонів',
    titleEn: 'Demon Slayer: Kimetsu no Yaiba',
    originalTitle: 'Demon Slayer: Kimetsu no Yaiba',
    type: 'series',
    year: 2019,
    duration: '4 сезони',
    rating: 8.7,
    ratingVotesCount: '240K',
    ageRating: '16+',
    description: 'Танджіро Камадо стає винищувачем демонів, щоб знайти спосіб повернути своїй сестрі Недзуко людську подобу після нападу темних сил.',
    descriptionEn: 'Tanjiro Kamado becomes a demon slayer to cure his sister Nezuko and avenge his family slaughtered by demons.',
    posterUrl: 'https://image.tmdb.org/t/p/w500/xUfRZu2mi8jH6SzQEJGP6tjBuYj.jpg',
    backdropUrl: 'https://image.tmdb.org/t/p/original/3GQKYh6Trm8pxd2AypovoYQf4Ay.jpg',
    stills: [
      'https://image.tmdb.org/t/p/original/3GQKYh6Trm8pxd2AypovoYQf4Ay.jpg',
      'https://image.tmdb.org/t/p/original/koBa94NxTaGe2FoDzlXMuJptsv0.jpg'
    ],
    genres: ['Аніме', 'Екшн', 'Пригоди', 'Фентезі'],
    director: 'Харуо Сотодзакі',
    languages: ['Japanese', 'Українська'],
    subtitles: ['Українські', 'English'],
    releaseDate: '6 квітня 2019',
    videoUrl: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
    trailerEmbedUrl: 'https://www.youtube.com/embed/VQGCKyvzIM4',
    isPopular: true,
    isNew: false,
    viewsCount: 295400,
    cast: [
      { name: 'Нацукі Ханае', role: 'Танджіро Камадо', avatarUrl: 'https://image.tmdb.org/t/p/w185/mB1XjS1038318V0a3uKzE5u3.jpg' },
      { name: 'Акарі Кіто', role: 'Недзуко Камадо', avatarUrl: 'https://image.tmdb.org/t/p/w185/hs99.jpg' }
    ],
    episodesData: DEMON_SLAYER_EPISODES
  },
  {
    id: 'death-note-2006',
    title: 'Зошит смерті',
    titleEn: 'Death Note',
    originalTitle: 'Death Note',
    type: 'series',
    year: 2006,
    duration: '1 сезон',
    rating: 8.9,
    ratingVotesCount: '310K',
    ageRating: '16+',
    description: 'Лайт Яґамі знаходить надприродний зошит смерті та починає вершити власне правосуддя, викликаючи на інтелектуальну дуель детектива L.',
    descriptionEn: 'An intelligent student goes on a crusade to eliminate criminals using a notebook capable of killing anyone whose name is written in it.',
    posterUrl: 'https://image.tmdb.org/t/p/w500/tCZFfYTIwrR7n94J6G14Y4hAFU6.jpg',
    backdropUrl: 'https://image.tmdb.org/t/p/original/koBa94NxTaGe2FoDzlXMuJptsv0.jpg',
    stills: [
      'https://image.tmdb.org/t/p/original/koBa94NxTaGe2FoDzlXMuJptsv0.jpg',
      'https://image.tmdb.org/t/p/original/3GQKYh6Trm8pxd2AypovoYQf4Ay.jpg'
    ],
    genres: ['Аніме', 'Детектив', 'Драма', 'Трилер', 'Фентезі'],
    director: 'Тецуро Аракі',
    languages: ['Japanese', 'Українська'],
    subtitles: ['Українські', 'English'],
    releaseDate: '3 жовтня 2006',
    videoUrl: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
    trailerEmbedUrl: 'https://www.youtube.com/embed/NlJZ-YgAt-c',
    isPopular: true,
    isNew: false,
    viewsCount: 314000,
    cast: [
      { name: 'Мамору Міяно', role: 'Лайт Яґамі', avatarUrl: 'https://image.tmdb.org/t/p/w185/mB1XjS1038318V0a3uKzE5u3.jpg' },
      { name: 'Каппей Ямаґуті', role: 'L', avatarUrl: 'https://image.tmdb.org/t/p/w185/cEU284u94mNskV4j3Jk2v6.jpg' }
    ],
    episodesData: DEATH_NOTE_EPISODES
  },
  {
    id: 'kingdom-of-the-planet-of-the-apes-2024',
    title: 'Королівство планети мавп',
    titleEn: 'Kingdom of the Planet of the Apes',
    originalTitle: 'Kingdom of the Planet of the Apes',
    type: 'movie',
    year: 2024,
    duration: '2 год 25 хв',
    rating: 7.1,
    ratingVotesCount: '170K',
    ageRating: '12+',
    description: 'Мавпи є домінуючим видом, а люди живуть у тіні. Молодий шимпанзе Ноа вирушає у небезпечну подорож, щоб протистояти жорстокому тирану.',
    descriptionEn: 'Many years after Caesar\'s reign, a young ape goes on a journey that will lead him to question everything he\'s been taught about the past.',
    posterUrl: 'https://image.tmdb.org/t/p/w500/wkWKOIrO8XlkNtN1qaZNDqvrHWM.jpg',
    backdropUrl: 'https://image.tmdb.org/t/p/original/fypydCipcWDKDTTCoPucBsdGYXW.jpg',
    stills: [
      'https://image.tmdb.org/t/p/original/fypydCipcWDKDTTCoPucBsdGYXW.jpg',
      'https://image.tmdb.org/t/p/original/75nSb1fbWooipwcSU5bUttiOriI.jpg'
    ],
    genres: ['Фантастика', 'Пригоди', 'Бойовик'],
    director: 'Вес Болл',
    languages: ['Українська', 'English'],
    subtitles: ['Українські', 'English'],
    releaseDate: '8 травня 2024',
    videoUrl: '',
    trailerEmbedUrl: 'https://www.youtube.com/embed/Ed-rbhWhzTU',
    isPopular: true,
    isNew: true,
    viewsCount: 131795,
    cast: [
      { name: 'Оуен Тіг', role: 'Ноа', avatarUrl: 'https://image.tmdb.org/t/p/w185/mB1XjS1038318V0a3uKzE5u3.jpg' },
      { name: 'Фрея Аллан', role: 'Нова / Мей', avatarUrl: 'https://image.tmdb.org/t/p/w185/ca9B2yQeF10a.jpg' }
    ]
  },
  {
    id: 'the-boy-and-the-heron-2023',
    title: 'Хлопчик і чапля',
    titleEn: 'The Boy and the Heron',
    originalTitle: 'The Boy and the Heron',
    type: 'movie',
    year: 2023,
    duration: '2 год 04 хв',
    rating: 7.5,
    ratingVotesCount: '130K',
    ageRating: '12+',
    description: 'Під час війни підліток Махіто переїжджає до сільського будинку і разом із загадковою сірою чаплею вирушає у паралельний чарівний світ.',
    descriptionEn: 'A young boy named Mahito yearning for his mother ventures into a world shared by the living and the dead.',
    posterUrl: 'https://image.tmdb.org/t/p/w500/7B1LIi9Y729uSC2Ltr3Yx4WkPQO.jpg',
    backdropUrl: 'https://image.tmdb.org/t/p/original/75nSb1fbWooipwcSU5bUttiOriI.jpg',
    stills: [
      'https://image.tmdb.org/t/p/original/75nSb1fbWooipwcSU5bUttiOriI.jpg',
      'https://image.tmdb.org/t/p/original/zkThiZAaAie8Lw7RAc5yPTOewBV.jpg'
    ],
    genres: ['Аніме', 'Фентезі', 'Драма'],
    director: 'Хаяо Міядзакі',
    languages: ['Japanese', 'Українська'],
    subtitles: ['Українські', 'English'],
    releaseDate: '14 липня 2023',
    videoUrl: '',
    trailerEmbedUrl: 'https://www.youtube.com/embed/f7EDFGAF_mY',
    isPopular: true,
    isNew: true,
    viewsCount: 188634,
    cast: [
      { name: 'Сома Сантокі', role: 'Махіто Макі', avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=150&auto=format&fit=crop' },
      { name: 'Масакі Суда', role: 'Сіра Чапля', avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=150&auto=format&fit=crop' }
    ]
  },
  {
    id: 'mushoku-tensei',
    title: 'Реінкарнація безробітного',
    titleEn: 'Mushoku Tensei: Jobless Reincarnation',
    originalTitle: 'Mushoku Tensei: Jobless Reincarnation',
    type: 'series',
    year: 2024,
    duration: '3 сезони',
    rating: 8.8,
    ratingVotesCount: '110K',
    ageRating: '16+',
    description: 'Чоловік перероджується у світі магії як Рудеус Ґрейрат зі спогадами про минуле життя і вирішує прожити нове життя гідно.',
    descriptionEn: 'A 34-year-old shut-in is reincarnated in a magical world as Rudeus Greyrat and resolves to live his new life to the fullest.',
    posterUrl: 'https://image.tmdb.org/t/p/w500/gLKOYIMyKlUHW0SVdskhgf9C0yy.jpg',
    backdropUrl: 'https://image.tmdb.org/t/p/original/j9fRIimor0AMFJR9kjZubXcABzZ.jpg',
    stills: [
      'https://image.tmdb.org/t/p/original/j9fRIimor0AMFJR9kjZubXcABzZ.jpg',
      'https://image.tmdb.org/t/p/original/rBOnrVlck7BIlGeWVlzYiZeg4l2.jpg'
    ],
    genres: ['Аніме', 'Пригоди', 'Фентезі', 'Драма'],
    director: 'Манабу Окамото',
    languages: ['Japanese', 'Українська'],
    subtitles: ['Українські', 'English'],
    releaseDate: '11 січня 2021',
    videoUrl: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
    trailerEmbedUrl: 'https://www.youtube.com/embed/S2pS611-6_c',
    isPopular: true,
    isNew: true,
    viewsCount: 250320,
    cast: [
      { name: 'Юмі Утіяма', role: 'Рудеус Ґрейрат', avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=150&auto=format&fit=crop' },
      { name: 'Ай Каяно', role: 'Сільфієтта', avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=150&auto=format&fit=crop' }
    ]
  },
  {
    id: 'frieren-2023',
    title: 'Проводжання Фрірен',
    titleEn: "Frieren: Beyond Journey's End",
    originalTitle: "Sousou no Frieren",
    type: 'series',
    year: 2023,
    duration: '28 серій',
    rating: 9.2,
    ratingVotesCount: '160K',
    ageRating: '13+',
    description: 'Ельфійська чарівниця Фрірен вирушає в нову мандрівку через роки після перемоги над Владикою Демонів, прагнучи глибше зрозуміти людські почуття.',
    descriptionEn: 'Elf mage Frieren sets out on a new journey years after defeating the Demon King to better understand human nature and relationships.',
    posterUrl: 'https://image.tmdb.org/t/p/w500/dqZENchTd7lp5zht7BdlqM7RBhD.jpg',
    backdropUrl: 'https://image.tmdb.org/t/p/original/rBOnrVlck7BIlGeWVlzYiZeg4l2.jpg',
    stills: [
      'https://image.tmdb.org/t/p/original/rBOnrVlck7BIlGeWVlzYiZeg4l2.jpg',
      'https://image.tmdb.org/t/p/original/j9fRIimor0AMFJR9kjZubXcABzZ.jpg'
    ],
    genres: ['Аніме', 'Пригоди', 'Фентезі', 'Драма'],
    director: 'Кейтіро Сайто',
    languages: ['Japanese', 'Українська'],
    subtitles: ['Українські', 'English'],
    releaseDate: '29 вересня 2023',
    videoUrl: '',
    trailerEmbedUrl: 'https://www.youtube.com/embed/qgQkT5dwWco',
    isPopular: true,
    isNew: true,
    viewsCount: 312000,
    cast: [
      { name: 'Ацумі Танедзакі', role: 'Фрірен', avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=150&auto=format&fit=crop' },
      { name: 'Кана Ітіносе', role: 'Ферн', avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=150&auto=format&fit=crop' }
    ]
  },
  {
    id: 'fma-brotherhood',
    title: 'Сталевий алхімік: Братство',
    titleEn: 'Fullmetal Alchemist: Brotherhood',
    originalTitle: 'Hagane no Renkinjutsushi: Fullmetal Alchemist',
    type: 'series',
    year: 2009,
    duration: '64 серії',
    rating: 9.1,
    ratingVotesCount: '280K',
    ageRating: '16+',
    description: 'Брати Едвард та Альфонс Елріки шукають легендарний Філософський Камінь, щоб відновити свої тіла після забороненої трансмутації.',
    descriptionEn: 'Two brothers search for the Philosopher\'s Stone to restore their bodies after a disastrous attempt to revive their mother.',
    posterUrl: 'https://image.tmdb.org/t/p/w500/5ZFUEOULaVml7pQuXxhpR2SmVUw.jpg',
    backdropUrl: 'https://image.tmdb.org/t/p/original/2UG177tWHy7xRmMKWJHB7nAUmKd.jpg',
    stills: [
      'https://image.tmdb.org/t/p/original/2UG177tWHy7xRmMKWJHB7nAUmKd.jpg',
      'https://image.tmdb.org/t/p/original/bRE6zX4iOAejLOQCHryoV5WNu8G.jpg'
    ],
    genres: ['Аніме', 'Екшн', 'Пригоди', 'Драма', 'Фентезі'],
    director: 'Ясухіро Іріє',
    languages: ['Japanese', 'Українська'],
    subtitles: ['Українські', 'English'],
    releaseDate: '5 квітня 2009',
    videoUrl: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
    trailerEmbedUrl: 'https://www.youtube.com/embed/i9U69wW29gI',
    isPopular: true,
    isNew: false,
    viewsCount: 423500,
    cast: [
      { name: 'Ромі Паку', role: 'Едвард Елрік', avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=150&auto=format&fit=crop' },
      { name: 'Ріе Куґімія', role: 'Альфонс Елрік', avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=150&auto=format&fit=crop' }
    ]
  },
  {
    id: 'cyberpunk-edgerunners',
    title: 'Кіберпанк: Бігуни по краю',
    titleEn: 'Cyberpunk: Edgerunners',
    originalTitle: 'Cyberpunk: Edgerunners',
    type: 'series',
    year: 2022,
    duration: '10 серій',
    rating: 8.6,
    ratingVotesCount: '150K',
    ageRating: '18+',
    description: 'У Найт-Сіті безпритульний хлопець Девід Мартінес вирішує стати кібер-найманцем після особистої трагедії, ризикуючи втратити розум.',
    descriptionEn: 'A street kid trying to survive in a technology and body modification-obsessed city of the future becomes a mercenary outlaw.',
    posterUrl: 'https://image.tmdb.org/t/p/w500/lqcDVZ8pyk08AVftMBildDR3QUK.jpg',
    backdropUrl: 'https://image.tmdb.org/t/p/original/bRE6zX4iOAejLOQCHryoV5WNu8G.jpg',
    stills: [
      'https://image.tmdb.org/t/p/original/bRE6zX4iOAejLOQCHryoV5WNu8G.jpg',
      'https://image.tmdb.org/t/p/original/htGeuCcNhlBe8GTx3izKOsd8frw.jpg'
    ],
    genres: ['Аніме', 'Екшн', 'Фантастика', 'Драма'],
    director: 'Хіроюкі Імаіші',
    languages: ['Japanese', 'Українська', 'English'],
    subtitles: ['Українські', 'English'],
    releaseDate: '13 вересня 2022',
    videoUrl: '',
    trailerEmbedUrl: 'https://www.youtube.com/embed/JtqIas3bYhg',
    isPopular: true,
    isNew: false,
    viewsCount: 198000,
    cast: [
      { name: 'Кенн', role: 'Девід', avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=150&auto=format&fit=crop' },
      { name: 'Аой Юкі', role: 'Люсі', avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=150&auto=format&fit=crop' }
    ]
  },
  {
    id: 'kaiju-no-8',
    title: 'Кайдзю №8',
    titleEn: 'Kaiju No. 8',
    originalTitle: 'Kaijuu 8-gou',
    type: 'series',
    year: 2024,
    duration: '12 серій',
    rating: 8.4,
    ratingVotesCount: '80K',
    ageRating: '16+',
    description: 'Кафка Хібіно отримує здатність трансформуватися в кайдзю після несподіваного інциденту і нарешті може вступити до Сил оборони.',
    descriptionEn: 'In a world plagued by creatures known as Kaiju, Kafka gains the ability to transform into a Kaiju himself.',
    posterUrl: 'https://image.tmdb.org/t/p/w500/bJxGs0w5RAhaX4fIUQu511rvm0S.jpg',
    backdropUrl: 'https://image.tmdb.org/t/p/original/htGeuCcNhlBe8GTx3izKOsd8frw.jpg',
    stills: [
      'https://image.tmdb.org/t/p/original/htGeuCcNhlBe8GTx3izKOsd8frw.jpg',
      'https://image.tmdb.org/t/p/original/mMtUybQ6hL24FXo0F3Z4j2KG7kZ.jpg'
    ],
    genres: ['Аніме', 'Екшн', 'Фантастика', 'Пригоди'],
    director: 'Шіґеюкі Мія',
    languages: ['Japanese', 'Українська'],
    subtitles: ['Українські', 'English'],
    releaseDate: '13 квітня 2024',
    videoUrl: '',
    trailerEmbedUrl: 'https://www.youtube.com/embed/5F_f9K41Lcs',
    isPopular: true,
    isNew: true,
    viewsCount: 154000,
    cast: [
      { name: 'Масая Фукуніші', role: 'Кафка Хібіно', avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=150&auto=format&fit=crop' },
      { name: 'Асамі Сето', role: 'Міна Ашіро', avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=150&auto=format&fit=crop' }
    ]
  },
  {
    id: 'your-name-2016',
    title: "Твоє ім'я",
    titleEn: 'Your Name.',
    originalTitle: 'Kimi no Na wa.',
    type: 'movie',
    year: 2016,
    duration: '1 год 46 хв',
    rating: 8.9,
    ratingVotesCount: '210K',
    ageRating: '12+',
    description: 'Дівчина з гірського містечка та хлопець із Токіо несподівано виявляють, що під час сну вони міняються тілами.',
    descriptionEn: 'High schoolers Mitsuha and Taki are complete strangers who suddenly start swapping bodies across time and distance.',
    posterUrl: 'https://image.tmdb.org/t/p/w500/q719jXXEzOoYaps6babgKnONONX.jpg',
    backdropUrl: 'https://image.tmdb.org/t/p/original/mMtUybQ6hL24FXo0F3Z4j2KG7kZ.jpg',
    stills: [
      'https://image.tmdb.org/t/p/original/mMtUybQ6hL24FXo0F3Z4j2KG7kZ.jpg',
      'https://image.tmdb.org/t/p/original/xMNH87maNLt9n2bMDYeI6db5VFm.jpg'
    ],
    genres: ['Аніме', 'Драма', 'Мелодрама', 'Фентезі'],
    director: 'Макото Шінкай',
    languages: ['Japanese', 'Українська', 'English'],
    subtitles: ['Українські', 'English'],
    releaseDate: '26 серпня 2016',
    videoUrl: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
    trailerEmbedUrl: 'https://www.youtube.com/embed/hRfHcp2GjVI',
    isPopular: true,
    isNew: false,
    viewsCount: 310000,
    cast: [
      { name: 'Рюносуке Камікі', role: 'Такі Тачібана', avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=150&auto=format&fit=crop' },
      { name: 'Моне Камішіраіші', role: 'Міцуха Міямізу', avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=150&auto=format&fit=crop' }
    ]
  },
  {
    id: 'solo-leveling-2024',
    title: 'Підняття рівня одинак',
    titleEn: 'Solo Leveling',
    originalTitle: 'Ore dake Level Up na Ken',
    type: 'series',
    year: 2024,
    duration: '12 серій',
    rating: 8.7,
    ratingVotesCount: '140K',
    ageRating: '16+',
    description: 'Найслабший мисливець людства Сон Джин-Ву отримує таємничий інтерфейс Системи, що дозволяє йому безмежно розвивати силу.',
    descriptionEn: 'In a world of hunters and monsters, weak hunter Sung Jinwoo gains extraordinary powers to level up without limits.',
    posterUrl: 'https://image.tmdb.org/t/p/w500/geCRueV3ElhRTr0xtJuEWJt6dJ1.jpg',
    backdropUrl: 'https://image.tmdb.org/t/p/original/xMNH87maNLt9n2bMDYeI6db5VFm.jpg',
    stills: [
      'https://image.tmdb.org/t/p/original/xMNH87maNLt9n2bMDYeI6db5VFm.jpg',
      'https://image.tmdb.org/t/p/original/575sxZXNNulSlIz7DvtWH5r4lkC.jpg'
    ],
    genres: ['Аніме', 'Екшн', 'Пригоди', 'Фентезі'],
    director: 'Шунсуке Накашіґе',
    languages: ['Japanese', 'Українська'],
    subtitles: ['Українські', 'English'],
    releaseDate: '7 січня 2024',
    videoUrl: '',
    trailerEmbedUrl: 'https://www.youtube.com/embed/pS_6m8f3uV4',
    isPopular: true,
    isNew: true,
    viewsCount: 220000,
    cast: [
      { name: 'Тайто Бан', role: 'Сон Джин-Ву', avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=150&auto=format&fit=crop' },
      { name: 'Рейна Уеда', role: 'Ча Ха-Ен', avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=150&auto=format&fit=crop' }
    ]
  },
  {
    id: 'hunter-x-hunter-2011',
    title: 'Хантер х Хантер',
    titleEn: 'Hunter x Hunter',
    originalTitle: 'Hunter x Hunter (2011)',
    type: 'series',
    year: 2011,
    duration: '148 серій',
    rating: 9.0,
    ratingVotesCount: '280K',
    ageRating: '16+',
    description: 'Ґон Фрікс здає надзвичайно складний іспит на Мисливця, щоб знайти свого батька — легендарного шукача пригод.',
    descriptionEn: 'Gon Freecss aspires to become a Hunter and search for his father, embarking on a perilous journey with loyal friends.',
    posterUrl: 'https://image.tmdb.org/t/p/w500/eobAuhCJA8oRp814V67WhezVXtQ.jpg',
    backdropUrl: 'https://image.tmdb.org/t/p/original/575sxZXNNulSlIz7DvtWH5r4lkC.jpg',
    stills: [
      'https://image.tmdb.org/t/p/original/575sxZXNNulSlIz7DvtWH5r4lkC.jpg',
      'https://image.tmdb.org/t/p/original/gArCVC4ML529WMCEqOXbALdQbUq.jpg'
    ],
    genres: ['Аніме', 'Пригоди', 'Екшн', 'Фентезі'],
    director: 'Хіроші Коджіна',
    languages: ['Japanese', 'Українська'],
    subtitles: ['Українські', 'English'],
    releaseDate: '2 жовтня 2011',
    videoUrl: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
    trailerEmbedUrl: 'https://www.youtube.com/embed/d6kBeJjO0Sg',
    isPopular: true,
    isNew: false,
    viewsCount: 289000,
    cast: [
      { name: 'Меґумі Хан', role: 'Ґон Фрікс', avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=150&auto=format&fit=crop' },
      { name: 'Марія Ісе', role: 'Кіллуа Золдік', avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=150&auto=format&fit=crop' }
    ]
  },
  {
    id: 'oshi-no-ko-2023',
    title: 'Зоряне дитя',
    titleEn: 'Oshi no Ko',
    originalTitle: 'Oshi no Ko',
    type: 'series',
    year: 2023,
    duration: '11 серій',
    rating: 8.7,
    ratingVotesCount: '95K',
    ageRating: '16+',
    description: 'Двоє людей перероджуються як близнюки своєї улюбленої поп-ідолки та відкривають для себе темні таємниці японського шоу-бізнесу.',
    descriptionEn: 'Reincarnated as children of a pop idol starlet, twins navigate the dark underbelly of the entertainment world.',
    posterUrl: 'https://image.tmdb.org/t/p/w500/qoW507a8RoGbpILCxt2N87USn8H.jpg',
    backdropUrl: 'https://image.tmdb.org/t/p/original/gArCVC4ML529WMCEqOXbALdQbUq.jpg',
    stills: [
      'https://image.tmdb.org/t/p/original/gArCVC4ML529WMCEqOXbALdQbUq.jpg',
      'https://image.tmdb.org/t/p/original/575sxZXNNulSlIz7DvtWH5r4lkC.jpg'
    ],
    genres: ['Аніме', 'Драма', 'Детектив'],
    director: 'Дайсуке Хірамакі',
    languages: ['Japanese', 'Українська'],
    subtitles: ['Українські', 'English'],
    releaseDate: '12 квітня 2023',
    videoUrl: '',
    trailerEmbedUrl: 'https://www.youtube.com/embed/gJLdQInEclw',
    isPopular: true,
    isNew: true,
    viewsCount: 167000,
    cast: [
      { name: 'Ріе Такахаші', role: 'Ай Хошіно', avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=150&auto=format&fit=crop' },
      { name: 'Такео Оцука', role: 'Аквамарин', avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=150&auto=format&fit=crop' }
    ]
  }
];

export const INITIAL_USER: UserProfile = {
  id: 'admin@example.invalid',
  name: 'Admin',
  email: 'admin@example.invalid',
  avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=150&auto=format&fit=crop',
  plan: 'VIP',
  role: 'admin',
  password: 'PUBLIC_DEMO_ONLY',
  favoriteGenres: [],
  favorites: [],
  watchHistory: []
};

export const INITIAL_ROOMS: WatchPartyRoom[] = [
  {
    id: 'room-deadpool',
    roomName: 'Дедпул & Росомаха Вечірка',
    movieId: 'deadpool-wolverine-2024',
    movieTitle: 'Дедпул та Росомаха',
    participantsCount: 4,
    isPlaying: true,
    currentTime: 2400,
    duration: 7680,
    code: 'DEADPOOL',
    messages: [
      { id: 'm1', senderName: 'Андрій', senderAvatar: 'https://images.unsplash.com/photo-1531427186611-ecfd6d936c79?q=80&w=150&auto=format&fit=crop', text: 'Всі готові до божевільного екшену? 🍿', timestamp: '15:28' },
      { id: 'm2', senderName: 'Микита', senderAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=150&auto=format&fit=crop', text: 'Лоґан повернувся! Це легендарно.', timestamp: '15:29' }
    ]
  },
  {
    id: 'room-gotham',
    roomName: 'Gotham Knights',
    movieId: 'the-batman-2022',
    movieTitle: 'Бетмен',
    participantsCount: 3,
    isPlaying: false,
    currentTime: 5076,
    duration: 10560,
    code: 'GOTHAM',
    messages: [
      { id: 'm10', senderName: 'Юля', senderAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=150&auto=format&fit=crop', text: 'Тут мій улюблений епізод зараз почнеться! 😍', timestamp: '15:30' }
    ]
  }
];

export const INITIAL_ANALYTICS: PlatformAnalytics = {
  totalViews: 4894200,
  totalWatchHours: 1243500,
  activeWatchParties: 18,
  activeUsers: 8421,
  revenueThisMonth: '$54,320',
  genreBreakdown: [
    { genre: 'Детектив', percentage: 22 },
    { genre: 'Фантастика', percentage: 31 },
    { genre: 'Екшн', percentage: 25 },
    { genre: 'Драма', percentage: 15 },
    { genre: 'Інші', percentage: 7 }
  ],
  dailyViews: [
    { date: '13 Чер', views: 12400 },
    { date: '14 Чер', views: 14500 },
    { date: '15 Чер', views: 16800 },
    { date: '16 Чер', views: 15100 },
    { date: '17 Чер', views: 19800 },
    { date: '18 Чер', views: 24200 },
    { date: '19 Чер', views: 27500 }
  ]
};

export function loadState<T>(key: string, defaultValue: T): T {
  try {
    const rawVal = localStorage.getItem(`cinemanova_${key}`);
    if (rawVal) return JSON.parse(rawVal);
  } catch (err) {
    console.error(`Error reading key ${key} from localStorage`, err);
  }
  return defaultValue;
}

export function saveState<T>(key: string, value: T): void {
  try {
    localStorage.setItem(`cinemanova_${key}`, JSON.stringify(value));
  } catch (err) {
    console.error(`Error saving key ${key} to localStorage`, err);
  }
}

export function isCustomDataModified(): boolean {
  try {
    return !!localStorage.getItem('cinemanova_movies_data');
  } catch {
    return false;
  }
}

export function resetToInitialMovies(): void {
  try {
    localStorage.removeItem('cinemanova_movies_data');
    localStorage.removeItem('cinemanova_movies_db');
  } catch (err) {
    console.error('Error resetting movies data:', err);
  }
}
