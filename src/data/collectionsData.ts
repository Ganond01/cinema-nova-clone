export interface CollectionItem {
  id: string;
  title: string;
  titleEn?: string;
  description: string;
  descriptionEn?: string;
  countText: string;
  countTextEn?: string;
  moviesCount?: number;
  seriesCount?: number;
  metaLine: string;
  metaLineEn?: string;
  posterUrl: string;
  bgUrl: string;
  queryFilter?: string;
  movieIds?: string[];
}

export const COLLECTIONS_DATA: CollectionItem[] = [
  {
    id: 'dune-universe',
    title: 'Всесвіт Дюна',
    titleEn: 'Dune Universe',
    description: 'Епічна сага про боротьбу за найцінніше у Всесвіті - прянощі маланж. Політика, зрада, влада і пророцтво в пісках Арракіса.',
    descriptionEn: 'An epic saga of the struggle for the most valuable substance in the universe — the spice melange. Politics, betrayal, power, and prophecy in the sands of Arrakis.',
    countText: '4 Фільмів  2 Серіала',
    countTextEn: '4 Movies  2 TV Series',
    moviesCount: 4,
    seriesCount: 2,
    metaLine: 'Фантастика • Пригоди • 1984-2026 • +16',
    metaLineEn: 'Sci-Fi • Adventure • 1984-2026 • +16',
    posterUrl: 'https://static.yakaboo.ua/media/catalog/product/9/7/9786171276895.jpg',
    bgUrl: 'https://image.tmdb.org/t/p/original/lzWHmYZrFi0VhxIdgRJDxzxdaap.jpg',
    queryFilter: 'Дюна',
    movieIds: [
      'dune-1984',
      'dune-2000',
      'children-of-dune-2003',
      'dune-part-one-2021',
      'dune-part-two-2024',
      'dune-prophecy-2024'
    ]
  },
  {
    id: 'marvel-universe',
    title: 'Всесвіт Marvel',
    titleEn: 'Marvel Cinematic Universe',
    description: 'Усі супергеройські фільми та серіали культового кіновсесвіту Marvel — від Залізної Людини та Месників до нових епох мультивсесвіту.',
    descriptionEn: 'All superhero movies and series of the iconic Marvel Cinematic Universe — from Iron Man and the Avengers to the multiverse.',
    countText: '26 Фільмів  6 Серіалів',
    countTextEn: '26 Movies  6 TV Series',
    moviesCount: 26,
    seriesCount: 6,
    metaLine: 'Екшн • Супергерої • 2008-2026 • +16',
    metaLineEn: 'Action • Superheroes • 2008-2026 • +16',
    posterUrl: 'https://image.tmdb.org/t/p/w500/1g0dhYtq4irTY1GPXvft6k4YLjm.jpg',
    bgUrl: 'https://image.tmdb.org/t/p/original/mDfJG3LC3Djh67UkBGx55qrl8SZ.jpg',
    queryFilter: 'Марвел',
    movieIds: [
      'deadpool-wolverine-2024',
      'iron-man',
      'avengers-endgame',
      'loki-series'
    ]
  },
  {
    id: 'denis-villeneuve',
    title: 'Фільми Дені Вільньова',
    titleEn: 'Denis Villeneuve Films',
    description: 'Візуально приголомшливі шедеври візіонерського канадського режисера Дені Вільньова — глибина думки, напруга та естетика.',
    descriptionEn: 'Visually stunning masterpieces by visionary director Denis Villeneuve — depth of thought, tension, and aesthetics.',
    countText: '6 Фільмів',
    countTextEn: '6 Movies',
    moviesCount: 6,
    seriesCount: 0,
    metaLine: 'Фантастика • Драма • Трилер • +16',
    metaLineEn: 'Sci-Fi • Drama • Thriller • +16',
    posterUrl: 'https://image.tmdb.org/t/p/w500/2ssWTSVklAEc98frZUQhgtGHx7s.jpg',
    bgUrl: 'https://image.tmdb.org/t/p/original/lzWHmYZrFi0VhxIdgRJDxzxdaap.jpg',
    queryFilter: 'Вільньов',
    movieIds: [
      'dune-part-one-2021',
      'dune-part-two-2024',
      'blade-runner-2049',
      'arrival-2016'
    ]
  },
  {
    id: 'sci-fi-masterpieces',
    title: 'Наукова фантастика',
    titleEn: 'Sci-Fi Masterpieces',
    description: 'Кращі стрічки про майбутнє людства, далекий космос, високі технології, штучний інтелект та незвідані виміри.',
    descriptionEn: 'The best films about the future of humanity, deep space, high technologies, AI, and unexplored dimensions.',
    countText: '42 Фільми',
    countTextEn: '42 Movies',
    moviesCount: 42,
    seriesCount: 0,
    metaLine: 'Фантастика • Космос • Драма • +16',
    metaLineEn: 'Sci-Fi • Space • Drama • +16',
    posterUrl: 'https://image.tmdb.org/t/p/w500/v1tRXZ4JtD2Iv6fjkPvT4GiwslV.jpg',
    bgUrl: 'https://image.tmdb.org/t/p/original/rAiYTsqJJR0KP8UN8vtz8ppG5Ox.jpg',
    queryFilter: 'Фантастика'
  },
  {
    id: 'epic-cosmic-sagas',
    title: 'Епічні космічні саги',
    titleEn: 'Epic Cosmic Sagas',
    description: 'Захоплюючі видовищні подорожі крізь галактики, далекі світи, космічні війни та часові викривлення.',
    descriptionEn: 'Thrilling and breathtaking journeys across galaxies, distant worlds, cosmic wars, and temporal distortions.',
    countText: '21 Фільм',
    countTextEn: '21 Movies',
    moviesCount: 21,
    seriesCount: 0,
    metaLine: 'Фантастика • Пригоди • Космос • +16',
    metaLineEn: 'Sci-Fi • Adventure • Space • +16',
    posterUrl: 'https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg',
    bgUrl: 'https://image.tmdb.org/t/p/original/xJHokMbljvjADYdit5fK5VQsXEG.jpg',
    queryFilter: 'Космос'
  },
  {
    id: 'power-struggles',
    title: 'Боротьба за владу',
    titleEn: 'Struggle for Power',
    description: 'Драматичні історії про політичні інтриги, приховані змови, зраду, війну та прагнення верховного престолу.',
    descriptionEn: 'Dramatic stories of political intrigue, covert conspiracies, betrayal, war, and the quest for the supreme throne.',
    countText: '15 Фільмів та серіалів',
    countTextEn: '15 Movies & Series',
    moviesCount: 10,
    seriesCount: 5,
    metaLine: 'Драма • Історія • Війна • +18',
    metaLineEn: 'Drama • History • War • +18',
    posterUrl: 'https://image.tmdb.org/t/p/w500/1XS1oqL89opfnbLl8WnZY1O1uJx.jpg',
    bgUrl: 'https://image.tmdb.org/t/p/original/suaEOtk1916guXlZTjnPP4mgRPx.jpg',
    queryFilter: 'Драма'
  },
  {
    id: 'anime-legends',
    title: 'Світ Аніме',
    titleEn: 'Anime World',
    description: 'Захоплюючі культові аніме-серіали та шедеври японської анімації для справжніх поціновувачів витонченого візуалу.',
    descriptionEn: 'Exciting cult anime series and masterpieces of Japanese animation for true fans of sublime visuals.',
    countText: '18 Серіалів',
    countTextEn: '18 Series',
    moviesCount: 4,
    seriesCount: 14,
    metaLine: 'Аніме • Екшн • Фентезі • +16',
    metaLineEn: 'Anime • Action • Fantasy • +16',
    posterUrl: 'https://cdn.myanimelist.net/images/anime/1708/138033l.jpg',
    bgUrl: 'https://image.tmdb.org/t/p/original/84XPpjGvxNyExjSuIfTGH5Mi4L8.jpg',
    queryFilter: 'Аніме'
  },
  {
    id: 'top-imdb',
    title: 'Топ Рейтинг CINEMA NOVA',
    titleEn: 'Top Rated CINEMA NOVA',
    description: 'Найвище оцінені шедеври світового кінематографа з безапеляційними відгуками глядачів та професійних критиків.',
    descriptionEn: 'The highest-rated cinematic masterpieces with acclaimed praise from audiences and film critics worldwide.',
    countText: '25 Фільмів',
    countTextEn: '25 Movies',
    moviesCount: 25,
    seriesCount: 0,
    metaLine: 'Драма • Кримінал • Топ Рейтинг • +18',
    metaLineEn: 'Drama • Crime • Top Rated • +18',
    posterUrl: 'https://image.tmdb.org/t/p/w500/3bhkrj58Vtu7enYsL2A13P3m3I.jpg',
    bgUrl: 'https://image.tmdb.org/t/p/original/tmU7GeKVybMWFButWEGl2M4GeiP.jpg',
    queryFilter: 'Топ'
  }
];
