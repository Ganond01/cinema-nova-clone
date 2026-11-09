import dotenv from 'dotenv';
dotenv.config();
import * as Minio from 'minio';
import fs from 'fs';
import path from 'path';

export interface MinioConfig {
  endpoint: string;
  port: number;
  useSSL: boolean;
  accessKey: string;
  secretKey: string;
  bucket: string;
  enabled: boolean;
}

function parseEndpoint(): { endpoint: string; port: number; useSSL: boolean } {
  const raw = process.env.S3_ENDPOINT || process.env.MINIO_ENDPOINT || '127.0.0.1';
  let endpoint = raw;
  let port = parseInt(process.env.MINIO_PORT || process.env.S3_PORT || '9000', 10);
  let useSSL = process.env.MINIO_USE_SSL === 'true' || process.env.S3_USE_SSL === 'true';

  if (raw.startsWith('http://') || raw.startsWith('https://')) {
    try {
      const u = new URL(raw);
      endpoint = u.hostname;
      if (u.port) {
        port = parseInt(u.port, 10);
      } else {
        port = u.protocol === 'https:' ? 443 : 80;
      }
      useSSL = u.protocol === 'https:';
    } catch {}
  }

  return { endpoint, port, useSSL };
}

const ep = parseEndpoint();

const config: MinioConfig = {
  endpoint: ep.endpoint,
  port: ep.port,
  useSSL: ep.useSSL,
  accessKey:
    process.env.S3_ACCESS_KEY ||
    process.env.MINIO_ACCESS_KEY ||
    process.env.MINIO_ROOT_USER ||
    '',
  secretKey:
    process.env.S3_SECRET_KEY ||
    process.env.MINIO_SECRET_KEY ||
    process.env.MINIO_ROOT_PASSWORD ||
    '',
  bucket: process.env.S3_BUCKET || process.env.MINIO_BUCKET || 'cinema-videos',
  enabled: process.env.MINIO_ENABLED !== 'false'
};

let minioClient: Minio.Client | null = null;
let isBucketReady = false;
let isMinioAvailable = false;
let lastHealthCheckTime = 0;

// Кеш списку об'єктів у MinIO на 15 секунд для швидкої відповіді /api/video-qualities
let objectsCache: Map<string, number> = new Map();
let lastCacheRefresh = 0;
const CACHE_TTL_MS = 15000;

export function getMinioConfig(): MinioConfig {
  return { ...config };
}

export function getMinioClient(): Minio.Client | null {
  if (!config.enabled) return null;
  if (!minioClient) {
    try {
      minioClient = new Minio.Client({
        endPoint: config.endpoint,
        port: config.port,
        useSSL: config.useSSL,
        accessKey: config.accessKey,
        secretKey: config.secretKey
      });
    } catch (err: any) {
      console.warn(`[MinIO] Initialization warning: ${err.message}`);
      return null;
    }
  }
  return minioClient;
}

/**
 * Перевірка зв'язку з MinIO та створення бакета cinema-videos за потреби
 */
export async function initMinio(): Promise<boolean> {
  if (!config.enabled) {
    console.log('[MinIO] Storage disabled via MINIO_ENABLED=false');
    return false;
  }

  const client = getMinioClient();
  if (!client) return false;

  const now = Date.now();
  if (isMinioAvailable && isBucketReady && now - lastHealthCheckTime < 60000) {
    return true;
  }

  try {
    const exists = await client.bucketExists(config.bucket);
    if (!exists) {
      console.log(`[MinIO] Bucket "${config.bucket}" does not exist. Creating...`);
      await client.makeBucket(config.bucket, 'us-east-1');
      console.log(`✅ [MinIO] Bucket "${config.bucket}" created successfully.`);
    }
    isBucketReady = true;
    isMinioAvailable = true;
    lastHealthCheckTime = now;
    console.log(`✅ [MinIO] Connected to ${config.endpoint}:${config.port}, bucket "${config.bucket}" is ready.`);
    return true;
  } catch (err: any) {
    isMinioAvailable = false;
    isBucketReady = false;
    lastHealthCheckTime = now;
    console.warn(`⚠️ [MinIO] Connection to ${config.endpoint}:${config.port} unavailable: ${err.message}. Local disk fallback active.`);
    return false;
  }
}

/**
 * Завантажити файл з локального диска в MinIO
 */
export async function uploadFileToMinio(
  localFilePath: string,
  objectKey: string,
  contentType?: string
): Promise<boolean> {
  const client = getMinioClient();
  if (!client || !fs.existsSync(localFilePath)) return false;

  try {
    const ready = await initMinio();
    if (!ready) return false;

    // Нормалізація ключа (прибираємо початковий слеш)
    const normalizedKey = objectKey.replace(/^\/+/, '');

    const metaData: Record<string, string> = {};
    if (contentType) {
      metaData['Content-Type'] = contentType;
    }

    await client.fPutObject(config.bucket, normalizedKey, localFilePath, metaData);
    
    // Оновлюємо внутрішній кеш
    const stat = fs.statSync(localFilePath);
    objectsCache.set(normalizedKey, stat.size);
    
    console.log(`✅ [MinIO] Uploaded ${normalizedKey} (${Math.round(stat.size / 1024 / 1024)}MB) to bucket "${config.bucket}"`);
    return true;
  } catch (err: any) {
    console.error(`❌ [MinIO] Failed to upload ${objectKey}:`, err.message);
    return false;
  }
}

/**
 * Перевірити наявність файлу в MinIO та отримати його розмір і MIME-тип
 */
export async function statMinioObject(
  objectKey: string
): Promise<{ exists: boolean; size: number; contentType?: string; key: string } | null> {
  const client = getMinioClient();
  if (!client) return null;

  const normalizedKey = objectKey.replace(/^\/+/, '');

  try {
    const stat = await client.statObject(config.bucket, normalizedKey);
    return {
      exists: true,
      size: stat.size,
      contentType: (stat.metaData && stat.metaData['content-type']) || undefined,
      key: normalizedKey
    };
  } catch {
    return null;
  }
}

/**
 * Отримати стрім об'єкта (з підтримкою Range / часткового зчитування)
 */
export async function getMinioStream(
  objectKey: string,
  offset?: number,
  length?: number
): Promise<{ stream: NodeJS.ReadableStream; size: number } | null> {
  const client = getMinioClient();
  if (!client) return null;

  const normalizedKey = objectKey.replace(/^\/+/, '');

  try {
    const stat = await client.statObject(config.bucket, normalizedKey);
    const size = stat.size;

    let stream: NodeJS.ReadableStream;
    if (typeof offset === 'number') {
      const len = typeof length === 'number' ? length : size - offset;
      stream = await client.getPartialObject(config.bucket, normalizedKey, offset, len);
    } else {
      stream = await client.getObject(config.bucket, normalizedKey);
    }

    return { stream, size };
  } catch (err: any) {
    console.error(`[MinIO] Stream error for ${normalizedKey}:`, err.message);
    return null;
  }
}

/**
 * Отримати список усіх об'єктів у бакеті за префіксом (з кешуванням)
 */
export async function listMinioObjects(prefix: string = ''): Promise<Map<string, number>> {
  const client = getMinioClient();
  if (!client) return new Map();

  const now = Date.now();
  if (objectsCache.size > 0 && now - lastCacheRefresh < CACHE_TTL_MS) {
    return objectsCache;
  }

  try {
    const ready = await initMinio();
    if (!ready) return objectsCache;

    const stream = client.listObjectsV2(config.bucket, prefix, true);
    const freshMap = new Map<string, number>();

    await new Promise<void>((resolve, reject) => {
      stream.on('data', (obj) => {
        if (obj && obj.name) {
          freshMap.set(obj.name, obj.size);
        }
      });
      stream.on('error', (err) => reject(err));
      stream.on('end', () => resolve());
    });

    objectsCache = freshMap;
    lastCacheRefresh = now;
    return objectsCache;
  } catch (err: any) {
    console.warn(`[MinIO] List objects error: ${err.message}`);
    return objectsCache;
  }
}
