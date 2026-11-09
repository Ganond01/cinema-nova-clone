import { Movie } from '../types';

const DB_NAME = 'CinemaNovaOffline';
const DB_VERSION = 1;
const STORE_NAME = 'movies';

let dbInstance: IDBDatabase | null = null;

function getDB(): Promise<IDBDatabase> {
  if (dbInstance) {
    try {
      dbInstance.transaction(STORE_NAME, 'readonly');
      return Promise.resolve(dbInstance);
    } catch {
      dbInstance = null;
    }
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = (event) => {
      dbInstance = (event.target as IDBOpenDBRequest).result;
      dbInstance.onversionchange = () => {
        dbInstance?.close();
        dbInstance = null;
      };
      resolve(dbInstance);
    };

    request.onerror = (event) => {
      reject((event.target as IDBOpenDBRequest).error);
    };
  });
}

export interface OfflineMovieData {
  id: string;
  metadata: Movie;
  videoBlob?: Blob;
  posterBlob?: Blob;
  backdropBlob?: Blob;
  downloadedAt: string;
}

export async function saveMovieOffline(
  movie: Movie,
  videoBlob?: Blob,
  posterBlob?: Blob,
  backdropBlob?: Blob
): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    const record: OfflineMovieData = {
      id: movie.id,
      metadata: movie,
      videoBlob,
      posterBlob,
      backdropBlob,
      downloadedAt: new Date().toISOString()
    };

    const request = store.put(record);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getOfflineMovie(id: string): Promise<OfflineMovieData | null> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error('Failed to read from IndexedDB', err);
    return null;
  }
}

export async function deleteOfflineMovie(id: string): Promise<void> {
  try {
    const db = await getDB();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    // Completely clear any localStorage references for this Фільм id
    try {
      localStorage.removeItem(`offline_movie_${id}`);
      localStorage.removeItem(`nova_offline_${id}`);
      localStorage.removeItem(`downloaded_${id}`);
    } catch {}
  } catch (err) {
    console.error('Failed to delete offline movie', err);
  }
}

export async function clearAllOfflineMovies(): Promise<void> {
  try {
    const db = await getDB();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    // Completely clear any offline localStorage keys
    try {
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('offline_movie_') || key.startsWith('nova_offline_') || key.startsWith('downloaded_')) {
          localStorage.removeItem(key);
        }
      });
    } catch {}
  } catch (err) {
    console.error('Failed to clear offline movies store', err);
  }
}

export async function getAllOfflineMovies(): Promise<OfflineMovieData[]> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error('Failed to list offline movies', err);
    return [];
  }
}
