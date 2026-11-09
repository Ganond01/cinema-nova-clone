import { AppNotification, UserProfile, WatchPartyRoom } from '../types';

const STORAGE_KEY = 'cinema_nova_notifications_v3';

const DEFAULT_GLOBAL_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'notif_default_premiere_1',
    type: 'premiere',
    title: 'Гучна прем’єра новинки! 🔥',
    titleEn: 'Big Premiere Release! 🔥',
    desc: '«Дюна: Частина друга» вже доступна до перегляду в 4K Ultra HD!',
    descEn: '"Dune: Part Two" is now available to stream in 4K Ultra HD!',
    unread: true,
    time: 'Щойно',
    timeEn: 'Just now',
    createdAt: Date.now() - 30000,
    posterUrl: 'https://image.tmdb.org/t/p/w500/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg'
  },
  {
    id: 'notif_default_episode_1',
    type: 'episode',
    title: 'Вийшла нова серія! 🐉',
    titleEn: 'New episode released! 🐉',
    desc: '«Дім Дракона» — Сезон 2, Серія 4 вже доступна у високій якості!',
    descEn: '"House of the Dragon" — Season 2, Episode 4 is now available in high quality!',
    unread: true,
    time: '15 хв тому',
    timeEn: '15m ago',
    createdAt: Date.now() - 900000,
    posterUrl: 'https://image.tmdb.org/t/p/w500/1XDDXPXGiI8id7MrUxK36ke7gkX.jpg'
  },
  {
    id: 'notif_default_party_1',
    type: 'party_joined',
    title: 'Успішне приєднання до кімнати! 🍿',
    titleEn: 'Successfully joined room! 🍿',
    desc: 'Ви успішно приєдналися до кімнати спільного перегляду фільму «Дюна: Частина друга»!',
    descEn: 'You successfully joined the Watch Party room for the movie "Dune: Part Two"!',
    unread: true,
    time: '30 хв тому',
    timeEn: '30m ago',
    createdAt: Date.now() - 1800000,
    posterUrl: 'https://image.tmdb.org/t/p/w500/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg',
    data: {
      roomId: 'CN-Party-8421',
      roomCode: 'CN-Party-8421',
      movieTitle: 'Дюна: Частина друга'
    }
  },
  {
    id: 'notif_default_download_1',
    type: 'download',
    iconType: 'download',
    title: 'Завантаження завершено ✅',
    titleEn: 'Download completed ✅',
    desc: '«Суддя з пекла» (1 сезон 6 серія) завантажено у памʼять для перегляду офлайн.',
    descEn: '"The Judge from Hell" (Season 1 Episode 6) is downloaded for offline viewing.',
    unread: false,
    time: '1 год тому',
    timeEn: '1h ago',
    createdAt: Date.now() - 3600000
  },
  {
    id: 'notif_default_fav_1',
    type: 'favorite',
    iconType: 'heart',
    title: 'Додано в обране ❤️',
    titleEn: 'Added to favorites ❤️',
    desc: 'Фільм «Атака титанів» успішно збережено у вашому списку обраного.',
    descEn: '"Attack on Titan" has been saved to your favorites list.',
    unread: false,
    time: 'Вчора',
    timeEn: 'Yesterday',
    createdAt: Date.now() - 86400000
  }
];

export function getAllStoredNotifications(): AppNotification[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_GLOBAL_NOTIFICATIONS));
      return DEFAULT_GLOBAL_NOTIFICATIONS;
    }
    const parsed = JSON.parse(raw);
    const list = Array.isArray(parsed) ? parsed : DEFAULT_GLOBAL_NOTIFICATIONS;
    return list.filter((n: AppNotification) => n.type !== 'party_invite');
  } catch (e) {
    console.error('Error loading notifications:', e);
    return DEFAULT_GLOBAL_NOTIFICATIONS;
  }
}

export function saveAllNotifications(list: AppNotification[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    window.dispatchEvent(new CustomEvent('cinema_nova_notifications_updated'));
  } catch (e) {
    console.error('Error saving notifications:', e);
  }
}

export function deduplicateNotifications(list: AppNotification[]): AppNotification[] {
  const seen = new Set<string>();
  return list.filter(n => {
    if (!n || !n.id) return false;
    if (seen.has(n.id)) return false;
    seen.add(n.id);
    return true;
  });
}

export function markNotificationAsRead(id: string) {
  const all = getAllStoredNotifications();
  const updated = all.map(n => n.id === id ? { ...n, unread: false } : n);
  saveAllNotifications(updated);
}

export function markAllNotificationsAsRead() {
  const all = getAllStoredNotifications();
  const updated = all.map(n => ({ ...n, unread: false }));
  saveAllNotifications(updated);
}

export function addAppNotification(notif: Omit<AppNotification, 'id' | 'createdAt'> & { id?: string }): AppNotification {
  const all = getAllStoredNotifications();
  const id = notif.id || ('notif_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7));
  const newNotif: AppNotification = {
    ...notif,
    id,
    createdAt: Date.now(),
  };

  const updated = [newNotif, ...all.filter(n => n.id !== id)];
  saveAllNotifications(updated);
  return newNotif;
}

export function notifyDownloadStarted(movie: { id: string; title: string; titleEn?: string; posterUrl?: string }, quality = '1080p', episodeInfo?: string) {
  const all = getAllStoredNotifications();
  // Prevent duplicate within 4 seconds
  const isRecent = all.some(n => 
    n.type === 'download' && 
    n.data?.movieId === movie.id && 
    n.title.includes('розпочато') && 
    Date.now() - n.createdAt < 4000
  );
  if (isRecent) return;

  const subtitle = episodeInfo ? ` (${episodeInfo})` : '';
  addAppNotification({
    type: 'download',
    iconType: 'download',
    title: 'Завантаження розпочато 📥',
    titleEn: 'Download started 📥',
    desc: `Почалося завантаження «${movie.title}»${subtitle} у якості ${quality}.`,
    descEn: `Downloading "${movie.titleEn || movie.title}"${subtitle} in ${quality} quality.`,
    unread: true,
    time: 'Щойно',
    timeEn: 'Just now',
    posterUrl: movie.posterUrl,
    data: {
      movieId: movie.id,
      quality,
      episodeInfo
    }
  });
}

export function notifyDownloadCompleted(movie: { id: string; title: string; titleEn?: string; posterUrl?: string }, quality = '1080p', episodeInfo?: string) {
  const all = getAllStoredNotifications();
  // Prevent duplicate within 8 seconds
  const isRecent = all.some(n => 
    n.type === 'download' && 
    n.data?.movieId === movie.id && 
    n.title.includes('завершено') && 
    Date.now() - n.createdAt < 8000
  );
  if (isRecent) return;

  const subtitle = episodeInfo ? ` (${episodeInfo})` : '';
  addAppNotification({
    type: 'download',
    iconType: 'download',
    title: 'Завантаження завершено ✅',
    titleEn: 'Download completed ✅',
    desc: `«${movie.title}»${subtitle} успішно завантажено для офлайн-перегляду.`,
    descEn: `"${movie.titleEn || movie.title}"${subtitle} is ready for offline viewing.`,
    unread: true,
    time: 'Щойно',
    timeEn: 'Just now',
    posterUrl: movie.posterUrl,
    data: {
      movieId: movie.id,
      quality,
      episodeInfo
    }
  });
}

export function notifyFavoriteToggled(movie: { id: string; title: string; titleEn?: string; posterUrl?: string; type?: string; genres?: string[] }, isAdded: boolean) {
  if (!isAdded) return;
  const all = getAllStoredNotifications();
  // Prevent rapid duplicate within 4 seconds
  const isRecent = all.some(n => 
    n.type === 'favorite' && 
    n.data?.movieId === movie.id && 
    Date.now() - n.createdAt < 4000
  );
  if (isRecent) return;

  addAppNotification({
    type: 'favorite',
    iconType: 'heart',
    title: 'Додано в обране ❤️',
    titleEn: 'Added to favorites ❤️',
    desc: `«${movie.title}» додано до вашого списку обраного.`,
    descEn: `"${movie.titleEn || movie.title}" was added to your favorites.`,
    unread: true,
    time: 'Щойно',
    timeEn: 'Just now',
    posterUrl: movie.posterUrl,
    data: {
      movieId: movie.id
    }
  });

  // User requirement: "повідомлення про нові серії має з'являтись в сповіщеннях якщо людина додала серіал чи аніме чи дораму в обране"
  const isMultiEpisode = 
    movie.type === 'series' || 
    movie.type === 'anime' || 
    movie.type === 'dorama' ||
    (Array.isArray(movie.genres) && movie.genres.some(g => ['Серіал', 'Серіали', 'Аніме', 'Дорама', 'Дорами'].includes(g)));

  if (isMultiEpisode) {
    setTimeout(() => {
      notifyNewEpisode(
        movie.title,
        'Новий епізод вже доступний до перегляду',
        movie.posterUrl,
        movie.id
      );
    }, 1200);
  }
}

export function notifyWatchPartyJoined(movie: { id: string; title: string; titleEn?: string; posterUrl?: string; type?: string; genres?: string[] }, roomId: string) {
  const all = getAllStoredNotifications();
  const isRecent = all.some(n => 
    (n.type === 'party_joined' || n.type === 'party_invite') && 
    n.data?.roomId === roomId && 
    Date.now() - n.createdAt < 5000
  );
  if (isRecent) return;

  let typeLabel = 'фільму';
  let typeLabelEn = 'movie';
  if (movie.type === 'series' || movie.genres?.includes('Серіали')) {
    typeLabel = 'серіалу';
    typeLabelEn = 'TV series';
  } else if (movie.type === 'anime' || movie.genres?.includes('Аніме')) {
    typeLabel = 'аніме';
    typeLabelEn = 'anime';
  } else if (movie.type === 'dorama' || movie.genres?.includes('Дорами')) {
    typeLabel = 'дорами';
    typeLabelEn = 'dorama';
  }

  addAppNotification({
    type: 'party_joined',
    title: 'Успішне приєднання до кімнати! 🍿',
    titleEn: 'Successfully joined room! 🍿',
    desc: `Ви успішно приєдналися до кімнати спільного перегляду ${typeLabel} «${movie.title}»!`,
    descEn: `You have successfully joined the Watch Party room for the ${typeLabelEn} "${movie.titleEn || movie.title}"!`,
    unread: true,
    time: 'Щойно',
    timeEn: 'Just now',
    posterUrl: movie.posterUrl,
    data: {
      roomId,
      roomCode: roomId,
      movieTitle: movie.title,
      movieId: movie.id
    }
  });
}

export function notifyWatchPartyCreated(movie: { id: string; title: string; titleEn?: string; posterUrl?: string; type?: string; genres?: string[] }, roomId: string) {
  notifyWatchPartyJoined(movie, roomId);
}

export function notifyNewEpisode(seriesTitle: string, episodeInfo: string, posterUrl?: string, movieId?: string) {
  const all = getAllStoredNotifications();
  const exists = all.some(n => 
    n.type === 'episode' && 
    (n.data?.movieId === movieId || n.desc.includes(seriesTitle)) &&
    Date.now() - n.createdAt < 86400000
  );
  if (exists) return;

  addAppNotification({
    type: 'episode',
    title: 'Нова серія вже доступна! 🎬',
    titleEn: 'New episode available! 🎬',
    desc: `«${seriesTitle}» — ${episodeInfo} вже на сайті у високій якості!`,
    descEn: `"${seriesTitle}" — ${episodeInfo} is now available in high quality!`,
    unread: true,
    time: 'Щойно',
    timeEn: 'Just now',
    posterUrl,
    data: movieId ? { movieId } : undefined
  });
}

export function notifyNewRelease(movieTitle: string, desc: string, posterUrl?: string, movieId?: string) {
  const all = getAllStoredNotifications();
  const exists = all.some(n => 
    n.type === 'premiere' && 
    (n.data?.movieId === movieId || n.desc.includes(movieTitle)) &&
    Date.now() - n.createdAt < 86400000
  );
  if (exists) return;

  addAppNotification({
    type: 'premiere',
    title: 'Гучна прем’єра новинки! 🔥',
    titleEn: 'New Release Premiere! 🔥',
    desc,
    descEn: desc,
    unread: true,
    time: 'Щойно',
    timeEn: 'Just now',
    posterUrl,
    data: movieId ? { movieId } : undefined
  });
}

export function addProfileUpdateNotification(message: string): AppNotification;
export function addProfileUpdateNotification(title: string, desc: string): AppNotification;
export function addProfileUpdateNotification(user: { name?: string; email?: string; avatarUrl?: string }, desc?: string): AppNotification;
export function addProfileUpdateNotification(
  first?: string | { name?: string; email?: string; avatarUrl?: string } | any,
  second?: string | { name?: string; email?: string; avatarUrl?: string } | any,
  third?: string
): AppNotification {
  let title = 'Профіль оновлено ⚙️';
  let titleEn = 'Profile updated ⚙️';
  let desc = 'Ваші персональні дані та налаштування успішно збережено.';
  let descEn = 'Your personal details and profile settings were saved successfully.';
  let posterUrl: string | undefined;

  if (typeof first === 'string') {
    if (typeof second === 'string') {
      title = first;
      titleEn = first;
      desc = second;
      descEn = second;
    } else {
      desc = first;
      descEn = first;
      if (second && typeof second === 'object') {
        posterUrl = second.avatarUrl;
      }
    }
  } else if (first && typeof first === 'object') {
    posterUrl = first.avatarUrl;
    if (typeof second === 'string') {
      desc = second;
      descEn = second;
    }
  }

  if (typeof third === 'string') {
    desc = third;
    descEn = third;
  }

  return addAppNotification({
    type: 'profile_update',
    iconType: 'settings',
    title,
    titleEn,
    desc,
    descEn,
    unread: true,
    time: 'Щойно',
    timeEn: 'Just now',
    posterUrl
  });
}

export function getUserNotifications(user: UserProfile | null): AppNotification[] {
  const all = getAllStoredNotifications();
  if (!user) {
    // Return only global notifications that do not have a specific recipient
    return all.filter(n => !n.recipientId);
  }

  const userId = user.id;
  const userEmail = (user.email || '').toLowerCase();

  return all.filter(n => {
    if (!n.recipientId) return true; // Global broadcast notification
    const rec = n.recipientId.toLowerCase();
    return rec === userId.toLowerCase() || (userEmail && rec === userEmail);
  });
}

export function getPendingSentRequests(senderUser: UserProfile | null): string[] {
  if (!senderUser) return [];
  const all = getAllStoredNotifications();
  const sId = senderUser.id;
  const sEmail = (senderUser.email || '').toLowerCase();

  return all
    .filter(n => 
      n.type === 'friend_request' && 
      n.status === 'pending' && 
      (n.senderId === sId || (n.senderEmail && n.senderEmail.toLowerCase() === sEmail)) &&
      Boolean(n.recipientId)
    )
    .map(n => n.recipientId!);
}

export function sendFriendRequest(
  sender: UserProfile, 
  targetUser: { id: string; name: string; email?: string; avatarUrl?: string }
): { success: boolean; message: string } {
  const targetId = targetUser.id || targetUser.email || '';
  if (!targetId) return { success: false, message: 'Invalid target user' };

  // Перевірка if already friends
  if (sender.friends && sender.friends.includes(targetId)) {
    return { success: false, message: 'Вже у друзях' };
  }

  const all = getAllStoredNotifications();

  // Перевірка if pending request already exists for this recipient from this sender
  const existingPending = all.find(n => 
    n.type === 'friend_request' && 
    n.status === 'pending' &&
    n.recipientId?.toLowerCase() === targetId.toLowerCase() &&
    (n.senderId === sender.id || (sender.email && n.senderEmail?.toLowerCase() === sender.email.toLowerCase()))
  );

  if (existingPending) {
    return { success: true, message: 'Запит вже надіслано раніше' };
  }

  const newNotification: AppNotification = {
    id: 'req_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    recipientId: targetId,
    senderId: sender.id,
    senderName: sender.name,
    senderAvatar: sender.avatarUrl,
    senderEmail: sender.email,
    type: 'friend_request',
    title: 'Запит у друзі 👥',
    titleEn: 'Friend request 👥',
    desc: `Користувач ${sender.name} надіслав(ла) вам запит у друзі!`,
    descEn: `User ${sender.name} sent you a friend request!`,
    unread: true,
    time: 'Щойно',
    timeEn: 'Just now',
    createdAt: Date.now(),
    status: 'pending',
    data: {
      targetUser: {
        id: targetUser.id,
        name: targetUser.name,
        email: targetUser.email,
        avatarUrl: targetUser.avatarUrl
      }
    }
  };

  const updated = [newNotification, ...all];
  saveAllNotifications(updated);

  return { success: true, message: 'Запит у друзі успішно надіслано!' };
}

export function acceptFriendRequest(
  notificationId: string, 
  currentUser: UserProfile, 
  onUpdateUser?: (updated: UserProfile) => void
) {
  const all = getAllStoredNotifications();
  const notif = all.find(n => n.id === notificationId);
  if (!notif || notif.type !== 'friend_request') return;

  const senderId = notif.senderId || notif.senderEmail || '';
  const currentId = currentUser.id || currentUser.email || '';

  // 1. Оновлення current Користувач's friends Список
  const curFriends = Array.isArray(currentUser.friends) ? [...currentUser.friends] : [];
  if (senderId && !curFriends.includes(senderId)) {
    curFriends.push(senderId);
  }

  const updatedCurrentUser: UserProfile = {
    ...currentUser,
    friends: curFriends
  };

  if (onUpdateUser) {
    onUpdateUser(updatedCurrentUser);
  }

  try {
    localStorage.setItem('active_user', JSON.stringify(updatedCurrentUser));
    localStorage.setItem(`user_friends_${currentUser.id}`, JSON.stringify(curFriends));
  } catch (e) {
    console.error(e);
  }

  // 2. Оновлення sender's friends Список in nova_users
  try {
    const rawUsers = localStorage.getItem('nova_users');
    if (rawUsers) {
      const parsedUsers: any[] = JSON.parse(rawUsers);
      if (Array.isArray(parsedUsers)) {
        // Оновлення sender
        const senderIdx = parsedUsers.findIndex(u => u.id === notif.senderId || (u.email && notif.senderEmail && u.email.toLowerCase() === notif.senderEmail.toLowerCase()));
        if (senderIdx >= 0) {
          const sFriends = Array.isArray(parsedUsers[senderIdx].friends) ? parsedUsers[senderIdx].friends : [];
          if (!sFriends.includes(currentId)) {
            parsedUsers[senderIdx].friends = [...sFriends, currentId];
          }
        }
        // Оновлення receiver
        const curIdx = parsedUsers.findIndex(u => u.id === currentUser.id || (u.email && currentUser.email && u.email.toLowerCase() === currentUser.email.toLowerCase()));
        if (curIdx >= 0) {
          parsedUsers[curIdx].friends = curFriends;
        }

        localStorage.setItem('nova_users', JSON.stringify(parsedUsers));
      }
    }
  } catch (e) {
    console.error('Error updating nova_users friends:', e);
  }

  // 3. Оновлення notification status to accepted
  const updatedNotifs = all.map(n => {
    if (n.id === notificationId) {
      return {
        ...n,
        unread: false,
        status: 'accepted' as const,
        desc: `Ви прийняли запит у друзі від ${notif.senderName}. Тепер ви друзі! 🤝`,
        descEn: `You accepted friend request from ${notif.senderName}. You are now friends! 🤝`
      };
    }
    return n;
  });

  // 4. Send a success notification back to original sender
  if (senderId) {
    const responseNotif: AppNotification = {
      id: 'resp_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      recipientId: senderId,
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderAvatar: currentUser.avatarUrl,
      type: 'system',
      title: 'Запит у друзі прийнято! 🎉',
      titleEn: 'Friend request accepted! 🎉',
      desc: `${currentUser.name} прийняв(ла) ваш запит у друзі. Тепер ви можете дивитися кіно разом!`,
      descEn: `${currentUser.name} accepted your friend request. You can now watch movies together!`,
      unread: true,
      time: 'Щойно',
      timeEn: 'Just now',
      createdAt: Date.now()
    };
    updatedNotifs.unshift(responseNotif);
  }

  saveAllNotifications(updatedNotifs);
  window.dispatchEvent(new Event('user_friends_updated'));
}

export function declineFriendRequest(notificationId: string) {
  const all = getAllStoredNotifications();
  const updated = all.map(n => {
    if (n.id === notificationId) {
      return {
        ...n,
        unread: false,
        status: 'declined' as const,
        desc: 'Запит у друзі було відхилено.',
        descEn: 'Friend request was declined.'
      };
    }
    return n;
  });

  saveAllNotifications(updated);
}

export function sendWatchPartyInvite(
  host: UserProfile, 
  targetUser: { id: string; name: string; email?: string; avatarUrl?: string }, 
  room: WatchPartyRoom
): { success: boolean; message: string } {
  const targetId = targetUser.id || targetUser.email || '';
  if (!targetId) return { success: false, message: 'Invalid target user' };

  const all = getAllStoredNotifications();

  const inviteNotif: AppNotification = {
    id: 'invite_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    recipientId: targetId,
    senderId: host.id,
    senderName: host.name,
    senderAvatar: host.avatarUrl,
    type: 'party_invite',
    title: 'Запрошення на Watch Party 🍿',
    titleEn: 'Watch Party Invitation 🍿',
    desc: `${host.name} запрошує вас приєднатися до спільного перегляду «${room.movieTitle}»! (Код: ${room.code || 'CN-PARTY'})`,
    descEn: `${host.name} invites you to join Watch Party for "${room.movieTitle}"! (Code: ${room.code || 'CN-PARTY'})`,
    unread: true,
    time: 'Щойно',
    timeEn: 'Just now',
    createdAt: Date.now(),
    status: 'pending',
    data: {
      roomId: room.id,
      roomCode: room.code,
      movieTitle: room.movieTitle
    }
  };

  const updated = [inviteNotif, ...all];
  saveAllNotifications(updated);

  return { success: true, message: `Запрошення надіслано ${targetUser.name}` };
}

export function addDownloadNotification(title: string, titleEn?: string, status: 'started' | 'completed' = 'completed', posterUrl?: string) {
  if (status === 'started') {
    notifyDownloadStarted({ title, titleEn, posterUrl } as any);
  } else {
    notifyDownloadCompleted({ title, titleEn, posterUrl } as any);
  }
}

export function addFavoriteNotification(title: string, titleEn?: string, type?: string) {
  notifyFavoriteToggled({ title, titleEn, type } as any, true);
}

