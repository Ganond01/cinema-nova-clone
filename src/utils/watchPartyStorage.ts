export function getWatchPartyMovieIds(userId?: string | null): string[] {
  try {
    const userKey = userId ? `user_watchparty_ids_${userId}` : null;
    const userList: string[] = userKey ? JSON.parse(localStorage.getItem(userKey) || '[]') : [];
    const globalList: string[] = JSON.parse(localStorage.getItem('user_watchparty_ids') || '[]');

    const seen = new Set<string>();
    const result: string[] = [];

    [...userList, ...globalList].forEach(id => {
      if (id && typeof id === 'string' && !seen.has(id)) {
        seen.add(id);
        result.push(id);
      }
    });

    return result;
  } catch (err) {
    console.warn('Failed to load watch party IDs:', err);
    return [];
  }
}

export function addWatchPartyMovieId(movieId: string, userId?: string | null): void {
  if (!movieId) return;
  try {
    const keys = userId ? [`user_watchparty_ids_${userId}`, 'user_watchparty_ids'] : ['user_watchparty_ids'];

    keys.forEach(k => {
      const cur: string[] = JSON.parse(localStorage.getItem(k) || '[]');
      const filtered = cur.filter(id => id !== movieId);
      localStorage.setItem(k, JSON.stringify([movieId, ...filtered]));
    });

    window.dispatchEvent(new Event('watchparty_updated'));
  } catch (err) {
    console.warn('Failed to save watch party ID:', err);
  }
}

export function removeWatchPartyMovieId(movieId: string, userId?: string | null): void {
  if (!movieId) return;
  try {
    const keys = userId ? [`user_watchparty_ids_${userId}`, 'user_watchparty_ids'] : ['user_watchparty_ids'];

    keys.forEach(k => {
      const cur: string[] = JSON.parse(localStorage.getItem(k) || '[]');
      const filtered = cur.filter(id => id !== movieId);
      localStorage.setItem(k, JSON.stringify(filtered));
    });

    window.dispatchEvent(new Event('watchparty_updated'));
  } catch (err) {
    console.warn('Failed to remove watch party ID:', err);
  }
}

export function isMovieInWatchParty(movieId: string, userId?: string | null): boolean {
  if (!movieId) return false;
  const ids = getWatchPartyMovieIds(userId);
  return ids.includes(movieId);
}

export function saveWatchPartyRoom(room: any): void {
  if (!room || (!room.id && !room.roomId)) return;
  try {
    const roomId = room.roomId || room.id;
    const existingStr = localStorage.getItem('cinema_watchparty_rooms') || '{}';
    const parsed = JSON.parse(existingStr);
    parsed[roomId] = { ...parsed[roomId], ...room, id: roomId, roomId };
    localStorage.setItem('cinema_watchparty_rooms', JSON.stringify(parsed));
    window.dispatchEvent(new CustomEvent('watchparty_rooms_updated', { detail: { roomId, room } }));
  } catch (err) {
    console.warn('Failed to save watch party room to storage:', err);
  }
}

export function getWatchPartyRoom(roomId?: string | null): any | null {
  if (!roomId) return null;
  try {
    const existingStr = localStorage.getItem('cinema_watchparty_rooms') || '{}';
    const parsed = JSON.parse(existingStr);
    const cleanId = roomId.trim().toUpperCase();
    for (const key of Object.keys(parsed)) {
      if (key.toUpperCase() === cleanId || parsed[key]?.roomId?.toUpperCase() === cleanId || parsed[key]?.id?.toUpperCase() === cleanId) {
        return parsed[key];
      }
    }
  } catch (err) {
    console.warn('Failed to get watch party room:', err);
  }
  return null;
}

export function getAllWatchPartyRooms(): any[] {
  try {
    const existingStr = localStorage.getItem('cinema_watchparty_rooms') || '{}';
    const parsed = JSON.parse(existingStr);
    return Object.values(parsed);
  } catch {
    return [];
  }
}

export function generateUniqueRoomCode(movie?: any): string {
  let typePrefix = 'NOVA-FILM';
  if (movie?.type === 'series') {
    typePrefix = 'NOVA-SERIES';
  } else if (movie?.type === 'anime' || movie?.genres?.includes('Аніме')) {
    typePrefix = 'NOVA-ANIME';
  } else if (movie?.type === 'dorama' || movie?.id?.toLowerCase().includes('dorama') || movie?.genres?.includes('Дорама')) {
    typePrefix = 'NOVA-DORAMA';
  }

  const cleanCode = ((movie?.id || 'ROOM') as string).replace(/[^a-zA-Z0-9]/g, '').slice(0, 5).toUpperCase();
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  return `${typePrefix}-${cleanCode || 'NOVA'}-${randomNum}`;
}

export function formatCurrentCreationTime(language?: string): string {
  const now = new Date();
  return (language === 'UA' ? 'Сьогодні, ' : 'Today, ') + now.toLocaleTimeString(language === 'UA' ? 'uk-UA' : 'en-US', {
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function detectMovieContentType(movie?: any): string {
  if (movie?.type === 'series') return 'series';
  if (movie?.type === 'anime' || movie?.genres?.includes('Аніме')) return 'anime';
  if (movie?.type === 'dorama' || movie?.id?.toLowerCase().includes('dorama') || movie?.genres?.includes('Дорама')) return 'dorama';
  return 'movie';
}

export function resolveUserNickname(user?: any): string {
  return user?.name || user?.username || (user?.email ? user.email.split('@')[0] : 'Гість');
}

const watchPartyStorage = {
  getWatchPartyMovieIds,
  addWatchPartyMovieId,
  removeWatchPartyMovieId,
  isMovieInWatchParty,
  saveWatchPartyRoom,
  getWatchPartyRoom,
  getAllWatchPartyRooms,
  generateUniqueRoomCode,
  formatCurrentCreationTime,
  detectMovieContentType,
  resolveUserNickname
};

export default watchPartyStorage;


