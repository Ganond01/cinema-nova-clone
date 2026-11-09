import { PrismaClient } from '@prisma/client';

const databaseUrl = process.env.DATABASE_URL;

// У коді суворо заборонено хардкодити localhost:5432. Використовується виключно process.env.DATABASE_URL.
let prismaInstance: PrismaClient | null = null;
let dbAvailable: boolean | null = null;
let lastCheckTime = 0;
const CHECK_INTERVAL_MS = 30000; // Повторна перевірка доступності кожні 30 секунд

export function getPrismaClient(): PrismaClient | null {
  if (!databaseUrl) {
    return null;
  }
  if (!prismaInstance) {
    prismaInstance = new PrismaClient({
      datasources: {
        db: {
          url: databaseUrl
        }
      },
      log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error']
    });
  }
  return prismaInstance;
}

/**
 * Перевірка доступності бази даних PostgreSQL.
 * Працює безпечно: якщо сервер БД (наприклад, 127.0.0.1) недоступний або тайм-аут,
 * повертає false без виклику винятків та падіння процесу сервера.
 */
export async function isDatabaseAvailable(): Promise<boolean> {
  if (!databaseUrl) {
    return false;
  }

  const now = Date.now();
  // Використовуємо закешований результат, щоб не перевантажувати мережу запитами ping
  if (dbAvailable !== null && now - lastCheckTime < CHECK_INTERVAL_MS) {
    return dbAvailable;
  }

  const client = getPrismaClient();
  if (!client) {
    dbAvailable = false;
    lastCheckTime = now;
    return false;
  }

  try {
    // Встановлюємо жорсткий тайм-аут 2.5 секунди на запит, щоб сервер не підвисав
    const pingPromise = client.$queryRaw`SELECT 1 as ping`;
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Database ping timeout')), 2500)
    );

    await Promise.race([pingPromise, timeoutPromise]);
    
    if (dbAvailable !== true) {
      console.log('✅ PostgreSQL успішно підключено та доступний.');
    }
    dbAvailable = true;
    lastCheckTime = now;
    return true;
  } catch (err: any) {
    if (dbAvailable !== false) {
      const sanitized = databaseUrl.replace(/:([^:@]+)@/, ':****@');
      console.warn(`⚠️ PostgreSQL недоступний (${sanitized}). Використовується резервний режим (fallback):`, err?.message || err);
    }
    dbAvailable = false;
    lastCheckTime = now;
    return false;
  }
}

export const prisma = getPrismaClient();
