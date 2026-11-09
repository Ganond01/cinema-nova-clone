import dotenv from "dotenv";
dotenv.config();
import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { exec, spawn } from "child_process";
import { promisify } from "util";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import multer from "multer";
import {
  initMinio,
  uploadFileToMinio,
  statMinioObject,
  getMinioStream,
  listMinioObjects,
  getMinioConfig
} from "./server/minioClient";

const execAsync = promisify(exec);

let ffmpegBundledPath: string | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const installer = require('@ffmpeg-installer/ffmpeg');
  ffmpegBundledPath = installer?.path || null;
} catch {
  // @ffmpeg-installer/ffmpeg uninstalled or missing
}

let activeFfmpegPath: string | null = null;

async function getFfmpegExecutable(): Promise<string> {
  if (activeFfmpegPath) return activeFfmpegPath;

  // 1. Спроба використати системний FFmpeg зі змінної PATH (з підтримкою NVENC у Windows)
  try {
    const res = await execAsync('ffmpeg -version');
    const txt = typeof res === 'string' ? res : (res.stdout || '') + ' ' + (res.stderr || '');
    if (txt.includes('ffmpeg version')) {
      activeFfmpegPath = 'ffmpeg';
      console.log('✅ Selected System FFmpeg from PATH for maximum hardware acceleration support.');
      return 'ffmpeg';
    }
  } catch (e) {
    // Системний FFmpeg не знайдено у PATH
  }

  // 2. Резервне використання вбудованого бінарника @ffmpeg-installer або системного ffmpeg
  if (ffmpegBundledPath) {
    activeFfmpegPath = ffmpegBundledPath;
    console.log(`ℹ️ Selected Bundled FFmpeg: ${activeFfmpegPath}`);
    return ffmpegBundledPath;
  }

  activeFfmpegPath = 'ffmpeg';
  return 'ffmpeg';
}

export function transliterateUkrainian(str: string): string {
  const ukrMap: Record<string, string> = {
    'А': 'A', 'а': 'a', 'Б': 'B', 'б': 'b', 'В': 'V', 'в': 'v', 'Г': 'H', 'г': 'h',
    'Ґ': 'G', 'ґ': 'g', 'Д': 'D', 'д': 'd', 'Е': 'E', 'е': 'e', 'Є': 'Ye', 'є': 'ye',
    'Ж': 'Zh', 'ж': 'zh', 'З': 'Z', 'з': 'z', 'И': 'Y', 'и': 'y', 'І': 'I', 'і': 'i',
    'Ї': 'Yi', 'ї': 'yi', 'Й': 'Y', 'й': 'y', 'К': 'K', 'к': 'k', 'Л': 'L', 'л': 'l',
    'М': 'M', 'м': 'm', 'Н': 'N', 'н': 'n', 'О': 'O', 'о': 'o', 'П': 'P', 'п': 'p',
    'Р': 'R', 'р': 'r', 'С': 'S', 'с': 's', 'Т': 'T', 'т': 't', 'У': 'U', 'у': 'u',
    'Ф': 'F', 'ф': 'f', 'Х': 'Kh', 'х': 'kh', 'Ц': 'Ts', 'ц': 'ts', 'Ч': 'Ch', 'ч': 'ch',
    'Ш': 'Sh', 'ш': 'sh', 'Щ': 'Shch', 'щ': 'shch', 'Ь': '', 'ь': '', 'Ю': 'Yu', 'ю': 'yu',
    'Я': 'Ya', 'я': 'ya', 'Ъ': '', 'ъ': '', 'Ы': 'Y', 'ы': 'y', 'Э': 'E', 'э': 'e', 'Ё': 'Yo', 'ё': 'yo'
  };
  return str.split('').map(c => ukrMap[c] !== undefined ? ukrMap[c] : c).join('');
}

export function sanitizeFilename(filename: string): string {
  const ext = path.extname(filename);
  const nameWithoutExt = path.basename(filename, ext);

  // 1. Заміна квадратних дужок [ та ] на символ _
  let s = nameWithoutExt.replace(/[\[\]]/g, '_');

  // 2. Транслітерація української кирилиці в латиницю
  s = transliterateUkrainian(s);

  // 3. Заміна спецсимволів (крім - та _) на символ _
  s = s.replace(/[^a-zA-Z0-9_-]/g, '_');

  // 4. Видалення повторюваних символів підкреслення
  s = s.replace(/_+/g, '_').replace(/^_+|_+$/g, '');

  return `${s || 'video'}${ext ? ext.toLowerCase() : '.mp4'}`;
}

// Захист сервера від аварійного завершення на рівні процесу
process.on('uncaughtException', (err) => {
  console.error('Server Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Server Unhandled Rejection at:', promise, 'reason:', reason);
});

async function startServer() {
  // Вимкнення перевірки SSL-сертифікатів для проксі відеопотоків (необхідно для сторонніх стрімів на кшталт ashdi.vip)
  const originalEmitWarning = process.emitWarning;
  process.emitWarning = (warning, ...args) => {
    if (typeof warning === 'string' && warning.includes('NODE_TLS_REJECT_UNAUTHORIZED')) return;
    if (typeof warning === 'object' && warning && String(warning.message || '').includes('NODE_TLS_REJECT_UNAUTHORIZED')) return;
    return originalEmitWarning.call(process, warning, ...args);
  };
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

  const app = express();

  // Безпечна валідація дозволених джерел (CORS Origin Whitelist - CWE-942 Fix)
  function isAllowedOrigin(origin: string | undefined): boolean {
    if (!origin) return false;
    try {
      const parsed = new URL(origin);
      const host = parsed.hostname.toLowerCase();

      // Дозволені основні та піддомени Cinema Nova
      if (host === 'cinema-nova.example' || host.endsWith('.cinema-nova.example')) {
        return true;
      }
      // Дозволені локальні хости для розробки
      if (host === 'localhost' || host === '127.0.0.1') {
        return true;
      }
      // Дозволені адреси захищеної підмережі WireGuard та локальної мережі
      if (
        host.startsWith('172.17.') ||
        host.startsWith('172.16.') ||
        host.startsWith('192.168.') ||
        host.startsWith('10.')
      ) {
        return true;
      }

      // Додаткові дозволені джерела зі змінної середовища
      const envOrigins = (process.env.ALLOWED_ORIGINS || '')
        .split(',')
        .map((o) => o.trim().toLowerCase())
        .filter(Boolean);
      if (envOrigins.includes(origin.toLowerCase()) || envOrigins.includes(host)) {
        return true;
      }

      return false;
    } catch {
      return false;
    }
  }

  // Комплексне проміжне ПЗ безпеки: валідований CORS, HSTS, CSP, захист від MIME-sniffing, XSS та Clickjacking
  app.use((req, res, next) => {
    const origin = req.headers.origin;

    // Валідація Origin: ніколи не відбиваємо довільні чужі домени з Access-Control-Allow-Credentials
    if (origin && isAllowedOrigin(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Vary', 'Origin');
    }

    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, HEAD, PATCH');
    res.setHeader(
      'Access-Control-Allow-Headers',
      'Origin, X-Requested-With, Content-Type, Accept, Authorization, Range, x-upload-id, x-filename, x-chunk-index, x-total-chunks, x-chunk-size, x-folder, x-quality'
    );
    res.setHeader('Access-Control-Expose-Headers', 'Content-Range, Accept-Ranges, Content-Length, Content-Type');

    // HTTP Strict Transport Security (HSTS) - примушує браузери використовувати виключно HTTPS (CWE-16)
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');

    // Захист від MIME-type sniffing (CWE-16)
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // Захист від атаки Clickjacking (CWE-1021)
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');

    // Захист інформації про Referrer
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    // Захист від XSS у застарілих веб-переглядачах
    res.setHeader('X-XSS-Protection', '1; mode=block');

    // Permissions-Policy (CWE-1021): обмеження небезпечних веб-API браузера
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');

    // Content Security Policy (CSP - CWE-1021): надійний захист від ін'єкцій скриптів
    const cspDirectives = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com https://apis.google.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' data: https://fonts.gstatic.com",
      "img-src 'self' data: blob: https: http:",
      "media-src 'self' blob: data: https: http:",
      "connect-src 'self' ws: wss: https: http:",
      "frame-src 'self' https://accounts.google.com",
      "worker-src 'self' blob:",
      "object-src 'none'",
      "base-uri 'self'"
    ].join('; ');
    res.setHeader('Content-Security-Policy', cspDirectives);

    if (req.method === 'OPTIONS') {
      return res.status(204).end();
    }
    next();
  });

  // Явна відповідь 404 для застарілих probe-запитів Flash/Silverlight
  app.get(['/clientaccesspolicy.xml', '/crossdomain.xml'], (_req, res) => {
    res.status(404).type('text/plain').send('Not Found');
  });

  let port = 3000;
  if (process.env.PORT) {
    port = parseInt(process.env.PORT, 10);
  }
  const portArgIdx = process.argv.indexOf('--port');
  if (portArgIdx !== -1 && process.argv[portArgIdx + 1]) {
    port = parseInt(process.argv[portArgIdx + 1], 10);
  }
  const PORT = port || 3000;

  let host = process.env.HOST || "0.0.0.0";
  const hostArgIdx = process.argv.indexOf('--host');
  if (hostArgIdx !== -1 && process.argv[hostArgIdx + 1]) {
    host = process.argv[hostArgIdx + 1];
  } else if (process.env.HOST) {
    host = process.env.HOST;
  }

  // Ендпоінти для перевірки реальної швидкості інтернету (пінг, завантаження, віддача)
  app.get('/api/speedtest/ping', (_req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.status(200).send('pong');
  });

  app.get('/api/speedtest/download', (req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Encoding', 'identity');

    const requestedBytes = parseInt(req.query.bytes as string, 10);
    const sizeBytes = Math.min(50 * 1024 * 1024, Math.max(256 * 1024, requestedBytes || (12 * 1024 * 1024)));
    res.setHeader('Content-Length', sizeBytes);

    const chunkSize = 64 * 1024;
    // Генерація псевдовипадкового нестисненого буфера для точного вимірювання пропускної здатності
    const randomBuffer = crypto.randomBytes(chunkSize);
    let sentBytes = 0;
    let isClosed = false;

    req.on('close', () => {
      isClosed = true;
      res.end();
    });

    function pump() {
      while (!isClosed && sentBytes < sizeBytes) {
        const remaining = sizeBytes - sentBytes;
        const currentChunkSize = Math.min(chunkSize, remaining);
        const chunk = currentChunkSize === chunkSize ? randomBuffer : randomBuffer.subarray(0, currentChunkSize);
        sentBytes += currentChunkSize;
        const ok = res.write(chunk);
        if (!ok) {
          res.once('drain', pump);
          return;
        }
      }
      if (!isClosed) {
        res.end();
      }
    }

    pump();
  });

  app.post('/api/speedtest/upload', (req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    let receivedBytes = 0;
    const start = Date.now();

    req.on('data', (chunk) => {
      receivedBytes += chunk.length;
    });

    req.on('end', () => {
      const elapsedMs = Math.max(1, Date.now() - start);
      res.json({
        success: true,
        receivedBytes,
        elapsedMs
      });
    });

    req.on('error', (err) => {
      if (!res.headersSent) {
        res.status(500).json({ success: false, error: err.message });
      }
    });
  });

  // ==================== СТАН ДЕМО-ЗАХИСТУ ДИПЛОМА (СЕРВЕРНИЙ РЕЖИМ) ====================
  let isServerDemoFallbackActive = true;

  app.get('/api/system/demo-mode', (_req, res) => {
    res.json({ active: isServerDemoFallbackActive });
  });

  app.post('/api/system/demo-mode', express.json(), (req, res) => {
    if (typeof req.body?.active === 'boolean') {
      isServerDemoFallbackActive = req.body.active;
    }
    res.json({ success: true, active: isServerDemoFallbackActive });
  });

  // Перевірка стану сховища MinIO
  app.get('/api/system/minio-status', async (_req, res) => {
    try {
      const isReady = await initMinio();
      const cfg = getMinioConfig();
      res.json({
        ready: isReady,
        endpoint: `${cfg.endpoint}:${cfg.port}`,
        bucket: cfg.bucket,
        enabled: cfg.enabled
      });
    } catch (e: any) {
      res.status(500).json({ ready: false, error: e.message });
    }
  });

  // Ручна синхронізація конкретного існуючого відеофайлу з локального диска у MinIO
  app.post('/api/minio/sync-file', express.json(), async (req, res) => {
    try {
      const { filePath, movieId } = req.body || {};
      if (!filePath || typeof filePath !== 'string') {
        return res.status(400).json({ success: false, error: 'filePath parameter missing' });
      }

      let cleanName = path.basename(filePath.split('?')[0]);
      try { cleanName = decodeURIComponent(cleanName); } catch {}

      // Пошук файлу на локальному диску
      const candidates = [
        path.join(process.cwd(), 'public', filePath.replace(/^\//, '')),
        path.join(process.cwd(), 'public', 'uploads', 'videos', cleanName),
        path.join(process.cwd(), 'public', 'uploads', cleanName),
        path.join(process.cwd(), 'public', 'videos', cleanName),
        path.join(process.cwd(), 'uploads', 'videos', cleanName),
        path.join(process.cwd(), 'uploads', cleanName),
        path.join(process.cwd(), filePath.replace(/^\//, ''))
      ];

      let foundPath = '';
      for (const cand of candidates) {
        if (cand && fs.existsSync(cand) && fs.statSync(cand).isFile() && fs.statSync(cand).size > 100) {
          foundPath = cand;
          break;
        }
      }

      const targetId = (movieId && String(movieId)) || 'general';
      const minioKey = `videos/${targetId}/${cleanName}`;

      if (!foundPath) {
        // Перевіряємо чи файл уже випадково не в MinIO
        const stat = await statMinioObject(minioKey);
        if (stat && stat.exists) {
          return res.json({
            success: true,
            alreadyInMinio: true,
            minioKey: stat.key,
            url: `/videos/${targetId}/${cleanName}`,
            size: stat.size
          });
        }
        return res.status(404).json({ success: false, error: `Файл не знайдено на сервері: ${cleanName}` });
      }

      const stat = fs.statSync(foundPath);
      console.log(`[MinIO Sync] Starting upload for ${cleanName} (${Math.round(stat.size / 1024 / 1024)}MB) -> ${minioKey}`);

      const ok = await uploadFileToMinio(foundPath, minioKey, 'video/mp4');
      if (!ok) {
        return res.status(500).json({ success: false, error: 'Помилка завантаження у MinIO' });
      }

      console.log(`[MinIO Sync] Successfully synced ${cleanName} to MinIO!`);
      return res.json({
        success: true,
        minioKey,
        url: `/videos/${targetId}/${cleanName}`,
        size: stat.size
      });
    } catch (err: any) {
      console.error('[MinIO Sync Error]:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // Перевірка чи конкретний файл уже завантажено у MinIO
  app.get('/api/minio/check-file', async (req, res) => {
    try {
      const filePath = typeof req.query.filePath === 'string' ? req.query.filePath : '';
      if (!filePath) return res.json({ inMinio: false });

      let cleanName = path.basename(filePath.split('?')[0]);
      try { cleanName = decodeURIComponent(cleanName); } catch {}

      const allObjects = await listMinioObjects('videos/');
      for (const key of allObjects.keys()) {
        if (key === cleanName || key.endsWith(`/${cleanName}`)) {
          return res.json({ inMinio: true, key, size: allObjects.get(key) });
        }
      }

      const directStat = await statMinioObject(`videos/${cleanName}`);
      if (directStat && directStat.exists) {
        return res.json({ inMinio: true, key: directStat.key, size: directStat.size });
      }

      return res.json({ inMinio: false });
    } catch (e: any) {
      return res.json({ inMinio: false, error: e.message });
    }
  });


  // Список усіх об'єктів у сховищі MinIO
  app.get('/api/minio/files', async (_req, res) => {
    try {
      const map = await listMinioObjects();
      const files = Array.from(map.entries()).map(([name, size]) => ({ name, size }));
      res.json({ success: true, count: files.length, files });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ==================== АПІ СИНХРОНІЗАЦІЇ КІМНАТ СПІЛЬНОГО ПЕРЕГЛЯДУ (В РЕАЛЬНОМУ ЧАСІ) ====================
  interface WatchPartyRoomServer {
    roomId: string;
    movie?: any;
    movieId?: string;
    movieTitle?: string;
    hostId?: string;
    hostName?: string;
    participants: any[];
    messages: any[];
    chatEnabled: boolean;
    everyoneControls: boolean;
    autoplayEnabled: boolean;
    playback?: any;
    updatedAt: number;
  }
  const serverRooms = new Map<string, WatchPartyRoomServer>();

  // Отримання або створення кімнати Watch Party
  app.get('/api/watchparty/rooms/:id', (req, res) => {
    const roomId = (req.params.id || '').toUpperCase();
    const room = serverRooms.get(roomId);
    if (!room) return res.status(404).json({ error: 'Room not found' });
    res.json({ success: true, room });
  });

  // Реєстрація або оновлення кімнати Watch Party
  const handleUpsertRoom = (req: express.Request, res: express.Response) => {
    const body = req.body || {};
    const rawId = body.roomId || body.id || req.params.id;
    const roomId = String(rawId || '').toUpperCase();
    if (!roomId) return res.status(400).json({ error: 'Room ID required' });

    let room = serverRooms.get(roomId);
    if (!room) {
      room = {
        roomId,
        participants: [],
        messages: [],
        chatEnabled: body.chatEnabled ?? true,
        everyoneControls: body.everyoneControls ?? false,
        autoplayEnabled: body.autoplayEnabled ?? true,
        updatedAt: Date.now()
      };
      serverRooms.set(roomId, room);
    }

    if (body.movie) room.movie = body.movie;
    if (body.movieId) room.movieId = body.movieId;
    if (body.movieTitle) room.movieTitle = body.movieTitle;
    if (body.hostId) room.hostId = body.hostId;
    if (body.hostName) room.hostName = body.hostName;
    if (typeof body.chatEnabled === 'boolean') room.chatEnabled = body.chatEnabled;
    if (typeof body.everyoneControls === 'boolean') room.everyoneControls = body.everyoneControls;
    if (typeof body.autoplayEnabled === 'boolean') room.autoplayEnabled = body.autoplayEnabled;
    if (Array.isArray(body.participants) && body.participants.length > 0) {
      room.participants = body.participants;
    }
    if (body.playback) {
      room.playback = { ...room.playback, ...body.playback, serverTimestamp: Date.now() };
    }
    room.updatedAt = Date.now();

    res.json({ success: true, room });
  };

  app.post('/api/watchparty/rooms', express.json(), handleUpsertRoom);
  app.post('/api/watchparty/rooms/:id', express.json(), handleUpsertRoom);

  app.post('/api/watchparty/rooms/:id/participants', express.json(), (req, res) => {
    const roomId = (req.params.id || '').toUpperCase();
    const p = req.body?.participant;
    let room = serverRooms.get(roomId);
    if (!room) {
      room = {
        roomId,
        participants: [],
        messages: [],
        chatEnabled: true,
        everyoneControls: false,
        autoplayEnabled: true,
        updatedAt: Date.now()
      };
      serverRooms.set(roomId, room);
    }
    if (p) {
      const idx = room.participants.findIndex(item => item.id === p.id || (p.name && item.name === p.name));
      if (idx >= 0) {
        room.participants[idx] = { ...room.participants[idx], ...p };
      } else {
        room.participants.push(p);
      }
      room.updatedAt = Date.now();
    }
    res.json({ success: true, room });
  });

  app.post('/api/watchparty/rooms/:id/participants/role', express.json(), (req, res) => {
    const roomId = (req.params.id || '').toUpperCase();
    const { participantId, role } = req.body || {};
    const room = serverRooms.get(roomId);
    if (room && participantId) {
      room.participants = room.participants.map(p => (p.id === participantId || p.name === participantId) ? { ...p, role } : p);
      room.updatedAt = Date.now();
    }
    res.json({ success: true, room });
  });

  app.delete('/api/watchparty/rooms/:id/participants/:participantId', (req, res) => {
    const roomId = (req.params.id || '').toUpperCase();
    const participantId = req.params.participantId;
    const room = serverRooms.get(roomId);
    if (room && participantId) {
      room.participants = room.participants.filter(p => p.id !== participantId && p.name !== participantId);
      room.updatedAt = Date.now();
    }
    res.json({ success: true, room });
  });

  app.post('/api/watchparty/rooms/:id/messages', express.json(), (req, res) => {
    const roomId = (req.params.id || '').toUpperCase();
    const message = req.body?.message;
    const room = serverRooms.get(roomId);
    if (room && message) {
      room.messages.push(message);
      if (room.messages.length > 200) room.messages.shift();
      room.updatedAt = Date.now();
    }
    res.json({ success: true, room });
  });

  app.post('/api/watchparty/rooms/:id/playback', express.json(), (req, res) => {
    const roomId = (req.params.id || '').toUpperCase();
    const playback = req.body;
    let room = serverRooms.get(roomId);
    if (!room) {
      room = {
        roomId,
        participants: [],
        messages: [],
        chatEnabled: true,
        everyoneControls: false,
        autoplayEnabled: true,
        updatedAt: Date.now()
      };
      serverRooms.set(roomId, room);
    }
    if (playback) {
      // Захист: якщо керування не надано всім учасникам, оновлювати playback дозволено лише хосту/організатору
      const sender = String(playback.updatedBy || '').trim().toLowerCase();
      const hostId = String(room.hostId || '').trim().toLowerCase();
      const hostName = String(room.hostName || '').trim().toLowerCase();
      const isSenderHost = !room.hostId || sender === hostId || sender === hostName || sender === 'admin' || sender === 'адмін' || sender === 'host';

      if (room.everyoneControls || isSenderHost) {
        room.playback = {
          ...playback,
          serverTimestamp: Date.now()
        };
        room.updatedAt = Date.now();
      }
    }
    res.json({ success: true, room });
  });

  app.post('/api/watchparty/rooms/:id/settings', express.json(), (req, res) => {
    const roomId = (req.params.id || '').toUpperCase();
    const patch = req.body || {};
    const room = serverRooms.get(roomId);
    if (room) {
      if (typeof patch.chatEnabled === 'boolean') room.chatEnabled = patch.chatEnabled;
      if (typeof patch.everyoneControls === 'boolean') room.everyoneControls = patch.everyoneControls;
      if (typeof patch.autoplayEnabled === 'boolean') room.autoplayEnabled = patch.autoplayEnabled;
      room.updatedAt = Date.now();
    }
    res.json({ success: true, room });
  });

  app.post('/api/watchparty/rooms/:id/clear-chat', express.json(), (req, res) => {
    const roomId = (req.params.id || '').toUpperCase();
    const room = serverRooms.get(roomId);
    if (room) {
      room.messages = [];
      room.updatedAt = Date.now();
    }
    res.json({ success: true, room });
  });

  interface ActiveChunkSession {
    finalFilePath: string;
    videoUrl: string;
    sanitized: string;
    totalChunks: number;
    chunkSize: number;
    receivedChunks: Set<number>;
    lastActivity: number;
  }
  const activeUploadSessions = new Map<string, ActiveChunkSession>();

  // Періодичне очищення старих незавершених сесій
  setInterval(() => {
    const now = Date.now();
    for (const [id, session] of activeUploadSessions.entries()) {
      if (now - session.lastActivity > 60 * 60 * 1000) {
        activeUploadSessions.delete(id);
      }
    }
  }, 15 * 60 * 1000);

  // 1. Ендпоінт поблокового (чанкового) завантаження відео з безпечним тимчасовим буфером
  app.post('/api/upload-video-chunk', (req, res) => {
    let writeStream: fs.WriteStream | null = null;
    let isTerminated = false;

    const terminateWithError = (status: number, message: string) => {
      if (isTerminated || res.headersSent) return;
      isTerminated = true;
      try {
        if (writeStream) {
          req.unpipe(writeStream);
          writeStream.destroy();
        }
      } catch (_) {}
      res.status(status).json({ success: false, error: message });
    };

    try {
      const uploadId = (req.headers['x-upload-id'] as string) || `upload_${Date.now()}`;

      let rawFilename = `video_${Date.now()}.mp4`;
      if (req.headers['x-filename']) {
        try {
          rawFilename = decodeURIComponent(req.headers['x-filename'] as string);
        } catch {
          rawFilename = (req.headers['x-filename'] as string) || rawFilename;
        }
      }

      const chunkIndex = parseInt((req.headers['x-chunk-index'] as string) || '0', 10);
      const totalChunks = parseInt((req.headers['x-total-chunks'] as string) || '1', 10);
      const chunkSize = parseInt((req.headers['x-chunk-size'] as string) || (5 * 1024 * 1024).toString(), 10);

      const targetFolder = (req.headers['x-folder'] as string) || (req.query.folder as string) || '';
      const qualityTag = (req.headers['x-quality'] as string) || (req.query.quality as string) || '';

      const sanitized = sanitizeFilename(rawFilename || 'video.mp4');
      const uploadDir = path.join(process.cwd(), 'public', 'uploads');
      const videosDir = path.join(uploadDir, 'videos');
      const tempChunksDir = path.join(uploadDir, '.temp_chunks');

      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      if (!fs.existsSync(videosDir)) {
        fs.mkdirSync(videosDir, { recursive: true });
      }
      if (!fs.existsSync(tempChunksDir)) {
        fs.mkdirSync(tempChunksDir, { recursive: true });
      }

      const saveInVideos = targetFolder === 'videos' || Boolean(qualityTag);
      const qualityPrefix = (qualityTag && !sanitized.toLowerCase().includes(qualityTag.toLowerCase())) ? `${qualityTag}_` : '';
      const fileNameOnDisk = `${qualityPrefix}${sanitized}`;
      const destinationDir = saveInVideos ? videosDir : uploadDir;
      const finalFilePath = path.join(destinationDir, fileNameOnDisk);
      const videoUrl = saveInVideos ? `/uploads/videos/${fileNameOnDisk}` : `/uploads/${fileNameOnDisk}`;

      // Безпечний тимчасовий файл для збирання чанків: унеможливлює пошкодження чи обнулення файлів
      const safeUploadId = uploadId.replace(/[^a-zA-Z0-9_-]/g, '_');
      const tempPartPath = path.join(tempChunksDir, `${safeUploadId}.part`);

      const offset = chunkIndex * chunkSize;
      const partExists = fs.existsSync(tempPartPath);
      const writeMode = chunkIndex === 0 ? 'w' : (partExists ? 'r+' : 'w');

      writeStream = fs.createWriteStream(tempPartPath, {
        flags: writeMode,
        start: offset
      });

      req.on('error', (err) => {
        console.error(`[ChunkUpload] Request stream aborted/error (chunk ${chunkIndex}/${totalChunks}):`, err.message);
        terminateWithError(500, `Request stream error: ${err.message}`);
      });

      writeStream.on('error', (err) => {
        console.error(`[ChunkUpload] File write stream error (chunk ${chunkIndex}/${totalChunks}):`, err.message);
        terminateWithError(500, `File write error: ${err.message}`);
      });

      writeStream.on('finish', () => {
        if (isTerminated) return;

        if (chunkIndex === totalChunks - 1) {
          try {
            if (!fs.existsSync(destinationDir)) {
              fs.mkdirSync(destinationDir, { recursive: true });
            }

            // Атомарне копіювання повністю зібраного тимчасового файлу в кінцеву папку
            fs.copyFileSync(tempPartPath, finalFilePath);
            try { fs.unlinkSync(tempPartPath); } catch (_) {}

            console.log(`Video upload completed (${totalChunks} chunks):`, videoUrl);

            // Асинхронно синхронізуємо готовий файл у сховище MinIO
            const minioKey = saveInVideos ? `uploads/videos/${fileNameOnDisk}` : `uploads/${fileNameOnDisk}`;
            uploadFileToMinio(finalFilePath, minioKey, 'video/mp4').catch((e) => {
              console.warn(`[MinIO] Background upload of original failed: ${e.message}`);
            });

            if (!res.headersSent) {
              return res.json({
                success: true,
                completed: true,
                videoUrl,
                fileName: sanitized,
                filePath: finalFilePath
              });
            }
          } catch (finErr: any) {
            console.error('[ChunkUpload] Error moving assembled part to final destination:', finErr);
            terminateWithError(500, `Failed to assemble final video file: ${finErr.message}`);
          }
        } else {
          if (!res.headersSent) {
            return res.json({
              success: true,
              completed: false,
              chunkIndex
            });
          }
        }
      });

      req.pipe(writeStream);
    } catch (topErr: any) {
      console.error('Top-level error in /api/upload-video-chunk:', topErr);
      terminateWithError(500, topErr.message || 'Server chunk handler error');
    }
  });

    // Налаштування сховища Multer для високопродуктивного прямого завантаження відео
  const uploadStorage = multer.diskStorage({
    destination: (req, _file, cb) => {
      const uploadDir = path.join(process.cwd(), 'public', 'uploads');
      const videosDir = path.join(uploadDir, 'videos');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      if (!fs.existsSync(videosDir)) {
        fs.mkdirSync(videosDir, { recursive: true });
      }
      const targetFolder = (req.headers['x-folder'] as string) || (req.query.folder as string) || (req.body && req.body.folder) || '';
      const qualityTag = (req.headers['x-quality'] as string) || (req.query.quality as string) || (req.body && req.body.quality) || '';
      const saveInVideos = targetFolder === 'videos' || Boolean(qualityTag);
      cb(null, saveInVideos ? videosDir : uploadDir);
    },
    filename: (req, file, cb) => {
      const original = file.originalname || 'video.mp4';
      const sanitized = sanitizeFilename(original);
      const qualityTag = (req.headers['x-quality'] as string) || (req.query.quality as string) || (req.body && req.body.quality) || '';
      const qualityPrefix = (qualityTag && !sanitized.toLowerCase().includes(qualityTag.toLowerCase())) ? `${qualityTag}_` : '';
      const uniqueName = `${qualityPrefix}${Date.now()}_${sanitized}`;
      cb(null, uniqueName);
    }
  });

  const upload = multer({
    storage: uploadStorage,
    limits: { fileSize: 5 * 1024 * 1024 * 1024 } // 5 GB
  });

  // 1b. Оптимізований ендпоінт завантаження одного відеофайлу через Multer
  app.post('/api/upload-video', (req, res) => {
    try {
      upload.single('video')(req, res, (err) => {
        if (err) {
          console.error('Multer upload error:', err);
          return res.status(500).json({ success: false, error: err.message || 'File upload error' });
        }

        if (req.file) {
          const isVideosSubdir = req.file.destination.endsWith('videos') || req.file.destination.includes('videos');
          const videoUrl = isVideosSubdir ? `/uploads/videos/${req.file.filename}` : `/uploads/${req.file.filename}`;
          
          // Асинхронно відправляємо у сховище MinIO
          const minioKey = isVideosSubdir ? `uploads/videos/${req.file.filename}` : `uploads/${req.file.filename}`;
          uploadFileToMinio(req.file.path, minioKey, 'video/mp4').catch((e) => {
            console.warn(`[MinIO] Upload failed: ${e.message}`);
          });

          console.log('Video file successfully uploaded via multer:', videoUrl);
          return res.json({
            success: true,
            videoUrl,
            fileName: req.file.originalname,
            filePath: req.file.path
          });
        }

        // Резервний обробник для прямих потокових завантажень без поля video
        let rawFilename = `video_${Date.now()}.mp4`;
        if (req.headers['x-filename']) {
          try {
            rawFilename = decodeURIComponent(req.headers['x-filename'] as string);
          } catch {
            rawFilename = (req.headers['x-filename'] as string) || rawFilename;
          }
        }
        const sanitized = sanitizeFilename(rawFilename || 'video.mp4');
        const targetFolder = (req.headers['x-folder'] as string) || (req.query.folder as string) || '';
        const qualityTag = (req.headers['x-quality'] as string) || (req.query.quality as string) || '';
        const saveInVideos = targetFolder === 'videos' || Boolean(qualityTag);

        const uploadDir = path.join(process.cwd(), 'public', 'uploads');
        const videosDir = path.join(uploadDir, 'videos');
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }
        if (!fs.existsSync(videosDir)) {
          fs.mkdirSync(videosDir, { recursive: true });
        }

        const destinationDir = saveInVideos ? videosDir : uploadDir;
        const qualityPrefix = (qualityTag && !sanitized.toLowerCase().includes(qualityTag.toLowerCase())) ? `${qualityTag}_` : '';
        const fileNameOnDisk = `${qualityPrefix}${Date.now()}_${sanitized}`;
        const filePath = path.join(destinationDir, fileNameOnDisk);
        const writeStream = fs.createWriteStream(filePath);

        writeStream.on('finish', () => {
          const videoUrl = saveInVideos ? `/uploads/videos/${fileNameOnDisk}` : `/uploads/${fileNameOnDisk}`;
          
          // Асинхронно відправляємо у сховище MinIO
          const minioKey = saveInVideos ? `uploads/videos/${fileNameOnDisk}` : `uploads/${fileNameOnDisk}`;
          uploadFileToMinio(filePath, minioKey, 'video/mp4').catch((e) => {
            console.warn(`[MinIO] Upload failed: ${e.message}`);
          });

          console.log('Video file successfully uploaded via raw stream:', videoUrl);
          if (!res.headersSent) {
            res.json({
              success: true,
              videoUrl,
              fileName: sanitized,
              filePath
            });
          }
        });

        writeStream.on('error', (streamErr) => {
          console.error('Error saving raw video stream:', streamErr);
          if (!res.headersSent) {
            res.status(500).json({ success: false, error: streamErr.message });
          }
        });

        req.pipe(writeStream);
      });
    } catch (topErr: any) {
      console.error('Top-level error in /api/upload-video:', topErr);
      if (!res.headersSent) {
        res.status(500).json({ success: false, error: topErr.message || 'Server upload handler error' });
      }
    }
  });

  // 1c. Ендпоінт завантаження файлів субтитрів (.vtt, .srt, .ass тощо)
  const subtitleStorage = multer.diskStorage({
    destination: (_req, _file, cb) => {
      const subDir = path.join(process.cwd(), 'public', 'subtitles');
      if (!fs.existsSync(subDir)) {
        fs.mkdirSync(subDir, { recursive: true });
      }
      cb(null, subDir);
    },
    filename: (_req, file, cb) => {
      const original = file.originalname || 'subtitles.vtt';
      const ext = path.extname(original).toLowerCase();
      const base = path.basename(original, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
      const uniqueName = `${base}_${Date.now()}${ext === '.srt' ? '.vtt' : (ext || '.vtt')}`;
      cb(null, uniqueName);
    }
  });

  const uploadSubtitle = multer({
    storage: subtitleStorage,
    limits: { fileSize: 50 * 1024 * 1024 }
  });

  app.post('/api/upload-subtitle', uploadSubtitle.single('subtitle'), (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, error: 'No subtitle file provided' });
      }

      const filePath = req.file.path;
      const originalName = req.file.originalname || '';
      const isSrt = originalName.toLowerCase().endsWith('.srt');
      const isVtt = originalName.toLowerCase().endsWith('.vtt') || filePath.toLowerCase().endsWith('.vtt');

      let content = fs.readFileSync(filePath, 'utf-8');
      // Видалення байта порядку байтів BOM (якщо присутній)
      if (content.charCodeAt(0) === 0xFEFF) {
        content = content.slice(1);
      }
      content = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

      if (isSrt) {
        // Конвертація SRT таймкодів у WebVTT (00:00:00,000 -> 00:00:00.000)
        let converted = content.replace(/(\d{1,2}:\d{2}:\d{2}),(\d{1,3})/g, (_m, time, ms) => {
          return `${time.padStart(8, '0')}.${ms.padEnd(3, '0')}`;
        });
        if (!converted.trim().startsWith('WEBVTT')) {
          converted = 'WEBVTT\n\n' + converted.trim() + '\n';
        }
        fs.writeFileSync(filePath, converted, 'utf-8');
      } else if (isVtt) {
        if (!content.trim().startsWith('WEBVTT')) {
          content = 'WEBVTT\n\n' + content.trim() + '\n';
          fs.writeFileSync(filePath, content, 'utf-8');
        }
      }

      const subtitleUrl = `/subtitles/${req.file.filename}`;
      console.log('✅ Subtitle successfully uploaded:', subtitleUrl);

      return res.json({
        success: true,
        subtitleUrl,
        fileName: req.file.filename,
        originalName
      });
    } catch (err: any) {
      console.error('Subtitle upload error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // Парсер JSON-тіла для загальних API-запитів
  app.use(express.json({ limit: '50mb' }));

  // Ендпоінт перекладу через штучний інтелект (або резервний механізм)
  app.post('/api/anime/translate', async (req, res) => {
    try {
      const { text } = req.body || {};
      if (!text || typeof text !== 'string') {
        return res.json({ translation: '' });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (apiKey) {
        const ai = new GoogleGenAI({ apiKey });
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: `Translate the following anime title/synopsis/text into natural, fluent Ukrainian. Output ONLY the Ukrainian translation without quotes, notes, or explanation:\n\n${text}`,
        });
        const translation = response.text ? response.text.trim() : '';
        if (translation) {
          return res.json({ translation });
        }
      }

      return res.json({ translation: text });
    } catch (err: any) {
      console.info('Translation route fallback:', err?.message || err);
      return res.json({ translation: req.body?.text || '' });
    }
  });

  // Кеш у пам'яті для запитів до Jikan MyAnimeList (час життя: 15 хвилин)
  const jikanCache = new Map<string, { data: any; timestamp: number }>();
  const JIKAN_CACHE_TTL = 15 * 60 * 1000;

  async function fetchJikanWithCache(url: string) {
    const cached = jikanCache.get(url);
    if (cached && (Date.now() - cached.timestamp < JIKAN_CACHE_TTL)) {
      return cached.data;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);
    try {
      const response = await fetch(url, {
        headers: { 'User-Agent': 'NovaMovieApp/1.0 (Mozilla/5.0)' },
        signal: controller.signal
      });
      clearTimeout(timer);
      if (!response.ok) {
        return cached ? cached.data : null;
      }
      const json = await response.json();
      jikanCache.set(url, { data: json, timestamp: Date.now() });
      return json;
    } catch (e: any) {
      clearTimeout(timer);
      return cached ? cached.data : null;
    }
  }

  // Проксі-ендпоінти до Jikan API для аніме
  app.get('/api/anime/seasons/now', async (req, res) => {
    try {
      const data = await fetchJikanWithCache('https://api.jikan.moe/v4/seasons/now');
      return res.json(data || { data: [] });
    } catch (err) {
      return res.json({ data: [] });
    }
  });

  app.get('/api/anime/:id/episodes', async (req, res) => {
    try {
      const malId = req.params.id;
      const data = await fetchJikanWithCache(`https://api.jikan.moe/v4/anime/${malId}/episodes`);
      return res.json(data || { data: [] });
    } catch (err) {
      return res.json({ data: [] });
    }
  });

  app.get('/api/anime/:id', async (req, res) => {
    try {
      const malId = req.params.id;
      const data = await fetchJikanWithCache(`https://api.jikan.moe/v4/anime/${malId}`);
      return res.json(data || { data: null });
    } catch (err) {
      return res.json({ data: null });
    }
  });

  // Універсальний пошук постерів (TMDB, AniList та MyAnimeList)
  app.get('/api/lookup-poster', async (req, res) => {
    try {
      const title = String(req.query.title || '').trim();
      const titleEn = String(req.query.titleEn || '').trim();
      const originalTitle = String(req.query.originalTitle || '').trim();
      const type = String(req.query.type || '').trim();
      const year = req.query.year ? String(req.query.year) : undefined;
      const isAnime = req.query.isAnime === 'true' || type === 'anime';

      if (!title && !titleEn && !originalTitle) {
        return res.status(400).json({ error: 'Title is required' });
      }

      const cleanQueries = Array.from(new Set([
        title,
        titleEn,
        originalTitle
      ].filter(Boolean).map(t => t.replace(/\(.*?\)/g, '').replace(/\[.*?\]/g, '').replace(/[:!?]/g, ' ').trim())));

      // 1. Для аніме спочатку перевіряємо AniList (найшвидший і найвища якість), потім Jikan
      if (isAnime) {
        for (const query of cleanQueries) {
          try {
            const anilistRes = await fetch('https://graphql.anilist.co', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                query: `query ($search: String) {
                  Media (search: $search, type: ANIME) {
                    id
                    title { romaji english native }
                    coverImage { extraLarge large }
                    bannerImage
                  }
                }`,
                variables: { search: query }
              })
            });

            if (anilistRes.ok) {
              const anilistJson: any = await anilistRes.json();
              const media = anilistJson?.data?.Media;
              if (media?.coverImage?.extraLarge || media?.coverImage?.large) {
                return res.json({
                  posterUrl: media.coverImage.extraLarge || media.coverImage.large,
                  backdropUrl: media.bannerImage || media.coverImage.extraLarge || undefined,
                  source: 'AniList'
                });
              }
            }
          } catch (e) { }

          // Резервний запит до Jikan (MyAnimeList)
          try {
            const jikanData = await fetchJikanWithCache(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(query)}&limit=1`);
            const anime = jikanData?.data?.[0];
            if (anime?.images?.jpg?.large_image_url || anime?.images?.jpg?.image_url) {
              return res.json({
                posterUrl: anime.images.jpg.large_image_url || anime.images.jpg.image_url,
                backdropUrl: anime.images.jpg.large_image_url || anime.images.jpg.image_url,
                source: 'MyAnimeList'
              });
            }
          } catch (e) { }
        }
      }

      // 2. Запит до TMDB (спочатку українською мовою, потім англійською)
      const TMDB_KEY = process.env.TMDB_API_KEY || '';

      for (const query of cleanQueries) {
        const languages = ['uk-UA', 'en-US'];
        for (const lang of languages) {
          const endpoint = type === 'series'
            ? `https://api.themoviedb.org/3/search/tv?api_key=${TMDB_KEY}&query=${encodeURIComponent(query)}&language=${lang}${year ? `&first_air_date_year=${year}` : ''}`
            : `https://api.themoviedb.org/3/search/multi?api_key=${TMDB_KEY}&query=${encodeURIComponent(query)}&language=${lang}${year ? `&year=${year}` : ''}`;

          try {
            const tmdbRes = await fetch(endpoint);
            if (tmdbRes.ok) {
              const tmdbData: any = await tmdbRes.json();
              const item = tmdbData?.results?.find((r: any) => r.poster_path) || tmdbData?.results?.[0];
              if (item?.poster_path) {
                return res.json({
                  posterUrl: `https://image.tmdb.org/t/p/w500${item.poster_path}`,
                  backdropUrl: item.backdrop_path ? `https://image.tmdb.org/t/p/original${item.backdrop_path}` : undefined,
                  source: `TMDB_${lang}`
                });
              }
            }
          } catch (e) { }
        }
      }

      // 3. Резервний пошук для аніме, якщо в TMDB результатів не знайдено
      if (!isAnime) {
        for (const query of cleanQueries) {
          try {
            const anilistRes = await fetch('https://graphql.anilist.co', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                query: `query ($search: String) {
                  Media (search: $search) {
                    id
                    coverImage { extraLarge large }
                    bannerImage
                  }
                }`,
                variables: { search: query }
              })
            });

            if (anilistRes.ok) {
              const anilistJson: any = await anilistRes.json();
              const media = anilistJson?.data?.Media;
              if (media?.coverImage?.extraLarge || media?.coverImage?.large) {
                return res.json({
                  posterUrl: media.coverImage.extraLarge || media.coverImage.large,
                  backdropUrl: media.bannerImage || media.coverImage.extraLarge || undefined,
                  source: 'AniList_General'
                });
              }
            }
          } catch (e) { }
        }
      }

      return res.json({ posterUrl: null, source: 'none' });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Lookup failed' });
    }
  });

  // Ендпоінт пакетного пошуку постерів
  app.post('/api/lookup-posters-batch', async (req, res) => {
    try {
      const items: Array<{ id: string; title: string; titleEn?: string; originalTitle?: string; type?: string; year?: number }> = req.body?.items || [];
      if (!Array.isArray(items) || items.length === 0) {
        return res.json({ results: {} });
      }

      const results: Record<string, { posterUrl?: string; backdropUrl?: string }> = {};

      await Promise.all(
        items.slice(0, 30).map(async (item) => {
          try {
            const TMDB_KEY = process.env.TMDB_API_KEY || '';
            const cleanTitle = (item.title || item.titleEn || item.originalTitle || '').replace(/\(.*?\)/g, '').trim();
            if (!cleanTitle) return;

            // Якщо аніме, перевіряємо AniList
            if (item.type === 'anime') {
              try {
                const anilistRes = await fetch('https://graphql.anilist.co', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    query: `query ($search: String) { Media (search: $search, type: ANIME) { coverImage { extraLarge large } bannerImage } }`,
                    variables: { search: cleanTitle }
                  })
                });
                if (anilistRes.ok) {
                  const j: any = await anilistRes.json();
                  const cov = j?.data?.Media?.coverImage?.extraLarge || j?.data?.Media?.coverImage?.large;
                  if (cov) {
                    results[item.id] = { posterUrl: cov, backdropUrl: j?.data?.Media?.bannerImage };
                    return;
                  }
                }
              } catch (e) { }
            }

            // Пошук через базу даних TMDB
            const endpoint = item.type === 'series'
              ? `https://api.themoviedb.org/3/search/tv?api_key=${TMDB_KEY}&query=${encodeURIComponent(cleanTitle)}&language=uk-UA`
              : `https://api.themoviedb.org/3/search/multi?api_key=${TMDB_KEY}&query=${encodeURIComponent(cleanTitle)}&language=uk-UA`;

            const tmdbRes = await fetch(endpoint);
            if (tmdbRes.ok) {
              const d: any = await tmdbRes.json();
              const hit = d?.results?.find((r: any) => r.poster_path) || d?.results?.[0];
              if (hit?.poster_path) {
                results[item.id] = {
                  posterUrl: `https://image.tmdb.org/t/p/w500${hit.poster_path}`,
                  backdropUrl: hit.backdrop_path ? `https://image.tmdb.org/t/p/original${hit.backdrop_path}` : undefined
                };
              }
            }
          } catch (e) { }
        })
      );

      res.json({ results });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Batch lookup failed' });
    }
  });

  // Перевірка та створення необхідних папок у директорії public
  ['public/uploads', 'public/uploads/videos', 'public/videos', 'public/subtitles'].forEach(dir => {
    const fullDir = path.join(process.cwd(), dir);
    if (!fs.existsSync(fullDir)) {
      fs.mkdirSync(fullDir, { recursive: true });
    }
  });

  const activeTranscribeStatus = {
    isProcessing: false,
    currentFile: '',
    startedAt: ''
  };

  const appendTranscribeLog = (msg: string) => {
    const logFilePath = path.join(process.cwd(), 'public', 'subtitles', 'transcribe.log');
    const timestamp = new Date().toLocaleTimeString('uk-UA', { hour12: false });
    const formatted = `[${timestamp}] ${msg}\n`;
    try {
      fs.appendFileSync(logFilePath, formatted, 'utf-8');
    } catch (e) { }
  };

  // Ендпоінт отримання логів транскрипції Whisper у реальному часі
  app.get('/api/transcribe-log', (req, res) => {
    try {
      const logFilePath = path.join(process.cwd(), 'public', 'subtitles', 'transcribe.log');
      if (fs.existsSync(logFilePath)) {
        const content = fs.readFileSync(logFilePath, 'utf-8');
        const lines = content.split('\n').map(l => l.trim()).filter(Boolean);
        const lastLine = lines.length > 0 ? lines[lines.length - 1] : '';
        return res.json({
          success: true,
          log: content,
          lines,
          lastLine,
          isProcessing: activeTranscribeStatus.isProcessing,
          currentFile: activeTranscribeStatus.currentFile
        });
      }
      return res.json({
        success: true,
        log: '',
        lines: [],
        lastLine: '',
        isProcessing: activeTranscribeStatus.isProcessing,
        currentFile: activeTranscribeStatus.currentFile
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  const appendConversionLog = (msg: string) => {
    const logDir = path.join(process.cwd(), 'public', 'uploads');
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    const logFilePath = path.join(logDir, 'conversion.log');
    const timestamp = new Date().toLocaleTimeString('uk-UA', { hour12: false });
    const formatted = `[${timestamp}] ${msg}\n`;
    try {
      fs.appendFileSync(logFilePath, formatted, 'utf-8');
    } catch (e) { }
  };

  // Ендпоінт отримання логів FFmpeg конвертації у реальному часі
  app.get('/api/conversion-log', (req, res) => {
    try {
      const logFilePath = path.join(process.cwd(), 'public', 'uploads', 'conversion.log');
      if (fs.existsSync(logFilePath)) {
        const content = fs.readFileSync(logFilePath, 'utf-8');
        const lines = content.split('\n').map(l => l.trim()).filter(Boolean);
        const lastLine = lines.length > 0 ? lines[lines.length - 1] : '';
        return res.json({
          success: true,
          log: content,
          lines,
          lastLine,
          isProcessing: activeConversionProgress.active,
          currentResolution: activeConversionProgress.currentResolution,
          percent: activeConversionProgress.percent,
          statusMessage: activeConversionProgress.statusMessage
        });
      }
      return res.json({
        success: true,
        log: '',
        lines: [],
        lastLine: '',
        isProcessing: activeConversionProgress.active,
        currentResolution: activeConversionProgress.currentResolution,
        percent: activeConversionProgress.percent,
        statusMessage: activeConversionProgress.statusMessage
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // 2. Ендпоінт автоматичної генерації субтитрів через Whisper.cpp / faster-whisper
  app.post('/api/transcribe-whisper', async (req, res) => {
    activeTranscribeStatus.isProcessing = true;
    activeTranscribeStatus.startedAt = new Date().toISOString();

    try {
      const { videoUrl, movieTitle, episodes, folderPath } = req.body || {};

      const subtitlesDir = path.join(process.cwd(), 'public', 'subtitles');
      if (!fs.existsSync(subtitlesDir)) {
        fs.mkdirSync(subtitlesDir, { recursive: true });
      }

      const logFilePath = path.join(subtitlesDir, 'transcribe.log');
      fs.writeFileSync(logFilePath, `[${new Date().toLocaleTimeString('uk-UA', { hour12: false })}] 🚀 Ініціалізація модуля розпізнавання мови Whisper.cpp...\n`, 'utf-8');

      const pyScript = path.join(process.cwd(), 'scripts', 'transcribe.py');

      const resolveMediaInput = (url: string) => {
        if (!url) return '';

        let pathname = url;
        try {
          if (url.startsWith('http://') || url.startsWith('https://')) {
            const u = new URL(url);
            pathname = u.pathname;
          }
        } catch (e) { }

        if (pathname.startsWith('/uploads/') || pathname.startsWith('/videos/') || pathname.startsWith('/subtitles/')) {
          const localPath = path.join(process.cwd(), 'public', pathname);
          if (fs.existsSync(localPath)) return localPath;
        }

        const cleanName = path.basename(pathname.split('?')[0]);
        const cand1 = path.join(process.cwd(), 'public', 'uploads', cleanName);
        const cand2 = path.join(process.cwd(), 'public', 'videos', cleanName);
        if (fs.existsSync(cand1)) return cand1;
        if (fs.existsSync(cand2)) return cand2;

        return url;
      };

      const episodesSubtitles: Array<{ season: any; episodeNumber: any; subtitleUrl: string; baseName: string }> = [];
      let mainSubtitleUrl = '';

      const getPythonCmd = () => process.platform === 'win32' ? 'python' : 'python';

      // Допоміжна функція для запуску transcribe.py з живим небуферизованим логуванням
      const runTranscribeScript = (inputMedia: string, targetVttName: string) => {
        return new Promise<string>((resolve) => {
          const outVttPath = path.join(subtitlesDir, targetVttName);
          activeTranscribeStatus.currentFile = targetVttName;

          if (fs.existsSync(pyScript) && inputMedia) {
            const isLocal = !inputMedia.startsWith('http://') && !inputMedia.startsWith('https://');
            if (!isLocal || fs.existsSync(inputMedia)) {
              appendTranscribeLog(`[Whisper API] Старт обробки файлу: ${path.basename(inputMedia)} -> ${targetVttName}`);

              const pyCmd = getPythonCmd();
              const pyProc = spawn(pyCmd, ['-u', pyScript, inputMedia, outVttPath]);

              pyProc.stdout.on('data', (data) => {
                const str = data.toString('utf-8').trim();
                if (str) {
                  str.split('\n').forEach((line: string) => {
                    if (line.trim()) appendTranscribeLog(line.trim());
                  });
                }
              });

              pyProc.stderr.on('data', (data) => {
                const str = data.toString('utf-8').trim();
                if (str) {
                  str.split('\n').forEach((line: string) => {
                    if (line.trim()) appendTranscribeLog(line.trim());
                  });
                }
              });

              pyProc.on('close', (code) => {
                appendTranscribeLog(`[Whisper API] Обробка завершена з кодом: ${code}`);
                finalizeVtt();
              });

              pyProc.on('error', (err) => {
                appendTranscribeLog(`[Whisper API Помилка] ${err.message}`);
                finalizeVtt();
              });
              return;
            }
          }
          finalizeVtt();

          function finalizeVtt() {
            if (!fs.existsSync(outVttPath) || fs.statSync(outVttPath).size < 10) {
              appendTranscribeLog(`[Whisper API ❌] Помилка: Субтитри не було згенеровано для ${targetVttName}. Фейкові субтитри НЕ створюються.`);
              resolve('');
            } else {
              appendTranscribeLog(`[Whisper API ✅] VTT файл збережено: ${targetVttName}`);
              resolve(`/subtitles/${targetVttName}`);
            }
          }
        });
      };

      // 1. Обробка головного відеофайлу, якщо він переданий
      if (videoUrl) {
        const inputMedia = resolveMediaInput(videoUrl);
        const baseName = path.basename(videoUrl.split('?')[0], path.extname(videoUrl.split('?')[0])).replace(/[^a-zA-Z0-9_-]/g, '_');
        const vttName = `${baseName}_whisper.vtt`;
        mainSubtitleUrl = await runTranscribeScript(inputMedia, vttName);
      }

      // 2. Пакетна обробка серій серіалу/аніме
      if (Array.isArray(episodes) && episodes.length > 0) {
        appendTranscribeLog(`[Whisper API] Запуск пакетної транскрипції для ${episodes.length} серій...`);
        for (const ep of episodes) {
          if (!ep.videoUrl) continue;
          const epInputMedia = resolveMediaInput(ep.videoUrl);
          const epBaseName = path.basename(ep.videoUrl.split('?')[0], path.extname(ep.videoUrl.split('?')[0])).replace(/[^a-zA-Z0-9_-]/g, '_');
          const epVttName = `${epBaseName}_whisper.vtt`;
          const epSubUrl = await runTranscribeScript(epInputMedia, epVttName);
          episodesSubtitles.push({
            season: ep.season || 1,
            episodeNumber: ep.number || ep.episodeNumber || 1,
            subtitleUrl: epSubUrl,
            baseName: epBaseName
          });
        }
      }

      // 3. Обробка відеофайлів із вказаного шляху до папки
      if (folderPath && fs.existsSync(folderPath) && fs.statSync(folderPath).isDirectory()) {
        appendTranscribeLog(`[Whisper API] Обробка папки з серіями: ${folderPath}`);
        await new Promise<void>((resolve) => {
          const pyCmd = getPythonCmd();
          const pyProc = spawn(pyCmd, ['-u', pyScript, folderPath, subtitlesDir]);
          pyProc.stdout.on('data', (d) => {
            const str = d.toString('utf-8').trim();
            if (str) str.split('\n').forEach((l: string) => l.trim() && appendTranscribeLog(l.trim()));
          });
          pyProc.stderr.on('data', (d) => {
            const str = d.toString('utf-8').trim();
            if (str) str.split('\n').forEach((l: string) => l.trim() && appendTranscribeLog(l.trim()));
          });
          pyProc.on('close', () => resolve());
          pyProc.on('error', () => resolve());
        });
      }

      const hasAnySubtitle = Boolean(mainSubtitleUrl || episodesSubtitles.some(e => Boolean(e.subtitleUrl)));
      if (!hasAnySubtitle && (!folderPath || !fs.existsSync(folderPath))) {
        appendTranscribeLog(`[Whisper API ❌] Транскрипція завершилась з помилкою. Субтитри НЕ створено.`);
        return res.status(500).json({
          success: false,
          error: 'Transcription failed. No fake subtitles generated.'
        });
      }

      appendTranscribeLog(`[Whisper API ✅] Завершено обробку транскрипції.`);

      return res.json({
        success: true,
        subtitleUrl: mainSubtitleUrl || (episodesSubtitles.find(e => Boolean(e.subtitleUrl))?.subtitleUrl || ''),
        episodesSubtitles,
        message: 'Subtitles processing completed'
      });
    } catch (error: any) {
      appendTranscribeLog(`[Whisper API Error ❌] ${error.message}`);
      console.error('Whisper transcription error:', error);
      res.status(500).json({ error: error.message });
    } finally {
      activeTranscribeStatus.isProcessing = false;
    }
  });

  let cachedGpuResult: { available: boolean; encoder: string; details: string; diag?: any } | null = null;

  interface ConversionProgress {
    active: boolean;
    percent: number;
    currentResolution: string;
    targetIndex: number;
    totalTargets: number;
    statusMessage: string;
  }

  let activeConversionProgress: ConversionProgress = {
    active: false,
    percent: 0,
    currentResolution: '',
    targetIndex: 0,
    totalTargets: 4,
    statusMessage: ''
  };

  app.get('/api/conversion-progress', (req, res) => {
    res.json(activeConversionProgress);
  });

  async function runFfmpegTranscode(
    ffmpegExe: string,
    sourcePath: string,
    outputPath: string,
    vCodec: string,
    vPreset: string,
    target: { res: string; scaleHeight: number; bitrate: string; maxrate: string; bufsize: string; audioBitrate: string; filename?: string },
    targetIndex: number,
    totalTargets: number,
    sourceDurationSec: number
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const vfFilter = `scale=-2:${target.scaleHeight},format=yuv420p`;
      const presetArgs = vPreset ? vPreset.trim().split(/\s+/).filter(Boolean) : [];
      const codecArgs = (vCodec === 'libx264')
        ? ['-profile:v', 'high', '-level:v', target.scaleHeight >= 2160 ? '5.1' : '4.1']
        : [];

      const isHttp = /^https?:\/\//i.test(sourcePath);
      const inputNetworkArgs = isHttp ? ['-reconnect', '1', '-reconnect_streamed', '1', '-reconnect_delay_max', '5'] : [];

      const args = [
        '-loglevel', 'info',
        '-progress', 'pipe:1',
        '-y',
        ...inputNetworkArgs,
        '-i', sourcePath,
        '-map', '0:v:0',
        '-map', '0:a:0?',
        '-vf', vfFilter,
        '-c:v', vCodec,
        ...presetArgs,
        ...codecArgs,
        '-b:v', target.bitrate,
        '-maxrate', target.maxrate,
        '-bufsize', target.bufsize,
        '-c:a', 'aac',
        '-ac', '2',
        '-ar', '48000',
        '-b:a', target.audioBitrate || '192k',
        '-af', 'aresample=async=1',
        '-max_muxing_queue_size', '1024',
        '-movflags', '+faststart',
        outputPath
      ];

      appendConversionLog(`🎬 [FFmpeg ${target.res}] Старт кодування -> ${target.filename} (${target.scaleHeight}p, ${target.bitrate}, ${vCodec})`);
      const child = spawn(ffmpegExe, args);
      let stderrLogs = '';
      let lastProgressTime = 0;

      const updateProgress = (val: number, isSec = false) => {
        const curSec = isSec ? val : val / 1000000;
        if (sourceDurationSec > 0 && curSec >= 0) {
          const resPercent = Math.min(100, Math.max(0, (curSec / sourceDurationSec) * 100));
          const overallPercent = Math.min(99, Math.round((targetIndex * (100 / totalTargets)) + (resPercent * (1 / totalTargets))));
          activeConversionProgress = {
            active: true,
            percent: overallPercent,
            currentResolution: target.res,
            targetIndex: targetIndex + 1,
            totalTargets,
            statusMessage: `Рендеринг ${target.res}: ${Math.round(resPercent)}% (Загальний: ${overallPercent}%)`
          };

          const now = Date.now();
          if (now - lastProgressTime > 2500) {
            lastProgressTime = now;
            appendConversionLog(`⏳ [FFmpeg ${target.res}] Рендеринг: ${Math.round(resPercent)}% (${Math.round(curSec)}с / ${Math.round(sourceDurationSec)}с, загальний: ${overallPercent}%)`);
          }
        }
      };

      child.stdout.on('data', (data) => {
        const lines = data.toString().split('\n');
        for (const line of lines) {
          if (line.startsWith('out_time_ms=')) {
            const ms = parseInt(line.split('=')[1], 10);
            if (!isNaN(ms)) updateProgress(ms, false);
          }
        }
      });

      child.stderr.on('data', (data) => {
        const str = data.toString();
        stderrLogs += str;
        const match = str.match(/time=(\d+):(\d+):(\d+\.\d+)/);
        if (match) {
          const curSec = parseInt(match[1], 10) * 3600 + parseInt(match[2], 10) * 60 + parseFloat(match[3]);
          if (!isNaN(curSec)) updateProgress(curSec, true);
        }
      });

      child.on('close', (code) => {
        if (code === 0) {
          appendConversionLog(`✅ [FFmpeg ${target.res}] Успішно згенеровано: ${target.filename}`);
          resolve();
        } else {
          const errDetail = stderrLogs.slice(-300).trim();
          appendConversionLog(`❌ [FFmpeg ${target.res}] Помилка завершення (код ${code}): ${errDetail}`);
          reject(new Error(`FFmpeg exited with code ${code}: ${errDetail}`));
        }
      });

      child.on('error', (err) => {
        appendConversionLog(`❌ [FFmpeg ${target.res}] Помилка процесу: ${err.message}`);
        reject(err);
      });
    });
  }

  async function runFfmpegDiagnostics(): Promise<{ hwaccels: string; encoders: string[]; nvencSupported: boolean }> {
    console.log('\n================ FFMPEG & GPU DIAGNOSTIC SUITE ================');
    console.log(`OS Platform: ${process.platform} (${process.arch})`);

    const activeExe = await getFfmpegExecutable();
    console.log(`Active FFmpeg executable: ${activeExe}`);

    const candidates: { name: string; path: string }[] = [
      { name: 'System FFmpeg (PATH)', path: 'ffmpeg' }
    ];
    if (ffmpegBundledPath) {
      candidates.push({ name: 'Bundled FFmpeg (@ffmpeg-installer)', path: ffmpegBundledPath });
    }

    let detectedHwaccels = '';
    let detectedEncoders: string[] = [];
    let nvencSupported = false;

    for (const bin of candidates) {
      console.log(`\n--- Inspecting ${bin.name} (${bin.path}) ---`);

      // 1. Перевірка доступних апаратних прискорювачів (-hwaccels)
      try {
        const hwRes = await execAsync(`"${bin.path}" -hwaccels`);
        const hwText = typeof hwRes === 'string' ? hwRes : (hwRes.stdout || '') + ' ' + (hwRes.stderr || '');
        console.log(`  [${bin.name}] Hardware Acceleration Methods (-hwaccels):\n` + hwText.trim().split('\n').map(l => '    ' + l).join('\n'));
        detectedHwaccels += ` [${bin.name}]: ` + hwText.trim().replace(/\n/g, ', ');
      } catch (e: any) {
        console.log(`  [${bin.name}] -hwaccels error or binary missing: ${e.message}`);
      }

      // 2. Перевірка енкодерів FFmpeg на наявність GPU-кодеків
      try {
        const encRes = await execAsync(`"${bin.path}" -encoders`);
        const encText = typeof encRes === 'string' ? encRes : (encRes.stdout || '') + ' ' + (encRes.stderr || '');
        const matched = encText
          .split('\n')
          .filter(l => /nvenc|qsv|amf|cuda|cuvid|vaapi|d3d11|dxva2|videotoolbox/i.test(l));

        if (matched.length > 0) {
          console.log(`  [${bin.name}] Hardware Encoders Listed (-encoders):\n` + matched.map(l => '    ' + l.trim()).join('\n'));
          detectedEncoders.push(...matched.map(m => m.trim()));
        } else {
          console.log(`  [${bin.name}] No hardware encoders (nvenc, qsv, amf) listed in output.`);
        }
      } catch (e: any) {
        console.log(`  [${bin.name}] -encoders check error: ${e.message}`);
      }

      // 3. Тестовий запуск кодування через h264_nvenc (NVIDIA GPU)
      const hasNvencEncoder = detectedEncoders.some(e => /nvenc/i.test(e));
      let binaryNvencOk = false;
      let lastErr = '';

      if (hasNvencEncoder) {
        const nvencTestCommands = [
          `"${bin.path}" -y -f lavfi -i testsrc=duration=1:size=640x480:rate=30 -pix_fmt yuv420p -c:v h264_nvenc -b:v 2M -f null -`,
          `"${bin.path}" -y -f lavfi -i testsrc=duration=1:size=640x480:rate=30 -pix_fmt yuv420p -c:v h264_nvenc -preset p1 -b:v 2M -f null -`,
          `"${bin.path}" -y -f lavfi -i testsrc=duration=1:size=640x480:rate=30 -pix_fmt yuv420p -c:v h264_nvenc -preset default -b:v 2M -f null -`
        ];

        for (const testCmd of nvencTestCommands) {
          try {
            await execAsync(testCmd, { timeout: 5000 });
            console.log(`  ✅ [${bin.name}] h264_nvenc test PASSED! NVIDIA GPU acceleration ACTIVE!`);
            binaryNvencOk = true;
            nvencSupported = true;
            break;
          } catch (e: any) {
            lastErr = 'NVIDIA GPU hardware driver not accessible in container environment';
          }
        }
        if (!binaryNvencOk) {
          console.log(`  ℹ️ [${bin.name}] NVENC GPU test notice: ${lastErr} (CPU libx264 mode active).`);
        }
      } else {
        console.log(`  ℹ️ [${bin.name}] NVENC encoder not compiled in binary (using multi-threaded CPU libx264).`);
      }
    }

    console.log('===============================================================\n');
    return { hwaccels: detectedHwaccels, encoders: detectedEncoders, nvencSupported };
  }

  async function checkGpuHardware(): Promise<{ available: boolean; encoder: string; details: string; diag?: any }> {
    if (cachedGpuResult !== null) return cachedGpuResult;

    const diag = await runFfmpegDiagnostics();
    const ffmpegExe = await getFfmpegExecutable();

    if (diag.nvencSupported) {
      cachedGpuResult = { available: true, encoder: 'h264_nvenc', details: 'NVIDIA NVENC (h264_nvenc) hardware acceleration active', diag };
      console.log('✅ GPU Hardware check: NVIDIA NVENC is available and working!');
      return cachedGpuResult;
    }

    // Тест апаратного кодека Intel QuickSync (QSV)
    try {
      await execAsync(`"${ffmpegExe}" -f lavfi -i testsrc=duration=1:size=128x128:rate=1 -pix_fmt yuv420p -c:v h264_qsv -f null -`, { timeout: 3000 });
      cachedGpuResult = { available: true, encoder: 'h264_qsv', details: 'Intel QuickSync (h264_qsv) active', diag };
      console.log('✅ GPU Hardware check: Intel QSV is available and working');
      return cachedGpuResult;
    } catch (e) {
      // Апаратний енкодер Intel QSV недоступний
    }

    // Тест апаратного енкодера VAAPI (Linux)
    try {
      await execAsync(`"${ffmpegExe}" -f lavfi -i testsrc=duration=1:size=128x128:rate=1 -pix_fmt yuv420p -c:v h264_vaapi -f null -`, { timeout: 3000 });
      cachedGpuResult = { available: true, encoder: 'h264_vaapi', details: 'VAAPI Hardware Acceleration active', diag };
      console.log('✅ GPU Hardware check: VAAPI is available and working');
      return cachedGpuResult;
    } catch (e) {
      // Апаратний енкодер VAAPI недоступний
    }

    const detailsMsg = process.platform === 'win32'
      ? 'Windows host: NVENC test failed. Check if NVIDIA drivers or system FFmpeg with NVENC support are installed.'
      : 'Linux container host: No NVIDIA CUDA GPU driver exposed to container runtime (using CPU x264)';

    cachedGpuResult = { available: false, encoder: 'libx264', details: detailsMsg, diag };
    console.log(`ℹ️ GPU Hardware check: ${detailsMsg}`);
    return cachedGpuResult;
  }

  // Ендпоінт перевірки статусу апаратного прискорення GPU (кешована відповідь)
  app.get('/api/check-gpu', async (req, res) => {
    if (req.query.force === 'true') {
      cachedGpuResult = null;
    }
    const result = await checkGpuHardware();
    res.json(result);
  });
  app.post('/api/convert-video', async (req, res) => {
    try {
      const { videoUrl, movieId, seasonNum, episodeNum, renderMode, encoder } = req.body || {};
      if (!videoUrl) {
        return res.status(400).json({ error: 'Missing videoUrl parameter' });
      }

      console.log(`Starting 4-file resolution conversion for: ${videoUrl} (S${seasonNum || 1}E${episodeNum || 1}), Render Mode: ${renderMode || 'auto'}`);

      const uploadDir = path.join(process.cwd(), 'public', 'uploads');
      const videosDir = path.join(uploadDir, 'videos');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      if (!fs.existsSync(videosDir)) {
        fs.mkdirSync(videosDir, { recursive: true });
      }

      // Надійна логіка визначення вихідної роздільності відео
      let sourcePath = '';
      if (videoUrl && typeof videoUrl === 'string') {
        let cleanUrl = videoUrl.split('?')[0];
        try { cleanUrl = decodeURIComponent(cleanUrl); } catch { }

        let pathname = cleanUrl;
        try {
          if (cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://')) {
            const u = new URL(cleanUrl);
            pathname = u.pathname;
          }
        } catch { }

        const publicDir = path.join(process.cwd(), 'public');
        const filename = path.basename(pathname);

        const candidates: string[] = [
          path.join(publicDir, pathname),
          path.join(publicDir, pathname.replace(/^\//, '')),
          path.join(uploadDir, filename),
          path.join(videosDir, filename),
          path.join(publicDir, 'videos', filename),
        ];

        if (filename) {
          const sanitized = sanitizeFilename(filename);
          candidates.push(path.join(uploadDir, sanitized));
          candidates.push(path.join(videosDir, sanitized));
          candidates.push(path.join(publicDir, 'videos', sanitized));
        }

        for (const cand of candidates) {
          if (cand && !cand.startsWith('http://') && !cand.startsWith('https://')) {
            if (fs.existsSync(cand) && fs.statSync(cand).isFile() && fs.statSync(cand).size > 100) {
              sourcePath = cand;
              break;
            }
          }
        }

        // Пошук за сезоном та серією у папках uploads та videos
        if (!sourcePath && seasonNum !== undefined && episodeNum !== undefined) {
          const epRegex = new RegExp(`s0*${seasonNum}[_.-]?e0*${episodeNum}\\b`, 'i');
          for (const searchDir of [uploadDir, videosDir]) {
            if (fs.existsSync(searchDir)) {
              try {
                const files = fs.readdirSync(searchDir);
                const matchedFile = files.find(f => epRegex.test(f) && fs.statSync(path.join(searchDir, f)).isFile());
                if (matchedFile) {
                  sourcePath = path.join(searchDir, matchedFile);
                  console.log(`Matched episode file for S${seasonNum}E${episodeNum} in ${searchDir}: ${matchedFile}`);
                  break;
                }
              } catch { }
            }
          }
        }

        // Перевірка віддаленого URL-посилання
        if (!sourcePath && (cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://')) && !cleanUrl.includes('localhost') && !cleanUrl.includes('127.0.0.1')) {
          sourcePath = cleanUrl;
        }
      }

      const isRemote = sourcePath.startsWith('http://') || sourcePath.startsWith('https://');
      const isSourceValid = isRemote || (Boolean(sourcePath) && fs.existsSync(sourcePath) && fs.statSync(sourcePath).size > 100);

      if (!isSourceValid) {
        console.error(`❌ Source path not found on server disk for: ${videoUrl} (resolved: ${sourcePath})`);
        activeConversionProgress = {
          active: false,
          percent: 0,
          currentResolution: '',
          targetIndex: 0,
          totalTargets: 4,
          statusMessage: `Оригінальний файл не знайдено за шляхом: ${videoUrl}`
        };
        return res.status(404).json({
          success: false,
          error: `Оригінальний файл не знайдено за шляхом: ${videoUrl}`
        });
      }

      console.log(`✅ Verified source video at: ${sourcePath}`);

      let baseName = 'video';
      if (seasonNum !== undefined && episodeNum !== undefined) {
        baseName = `s${seasonNum}e${episodeNum}`;
      } else {
        let rawName = path.basename(videoUrl, path.extname(videoUrl));
        try { rawName = decodeURIComponent(rawName); } catch { }

        // 1. Видалення часового префікса на кшталт 1785441678108_
        rawName = rawName.replace(/^\d{10,}_/, '');

        // 2. Видалення позначок якості на кшталт _720p, 1080p_
        rawName = rawName.replace(/(^|_|\b)(4k|2160p|1080p|720p|480p|360p)(_|\b|$)/gi, '_');

        // 3. Видалення часового суфікса на кшталт _1785444065459
        rawName = rawName.replace(/_\d{10,}$/, '');

        // 4. Заміна спецсимволів на підкреслення _
        rawName = rawName.replace(/[^a-zA-Z0-9_-]/g, '_');

        // 5. Об'єднання повторюваних підкреслень та очищення
        rawName = rawName.replace(/_+/g, '_').replace(/^_+|_+$/g, '');

        baseName = rawName || 'movie';
      }
      const uniqueSuffix = Date.now();

      const targets = [
        // { res: '4K', scaleHeight: 2160, bitrate: '12000k', maxrate: '15000k', bufsize: '24000k', audioBitrate: '192k', filename: `4K_${baseName}_${uniqueSuffix}.mp4` },
        { res: '1080p', scaleHeight: 1080, bitrate: '4500k', maxrate: '5500k', bufsize: '9000k', audioBitrate: '192k', filename: `1080p_${baseName}_${uniqueSuffix}.mp4` },
        { res: '720p', scaleHeight: 720, bitrate: '2500k', maxrate: '3000k', bufsize: '5000k', audioBitrate: '128k', filename: `720p_${baseName}_${uniqueSuffix}.mp4` },
        { res: '480p', scaleHeight: 480, bitrate: '1200k', maxrate: '1500k', bufsize: '2500k', audioBitrate: '128k', filename: `480p_${baseName}_${uniqueSuffix}.mp4` }
      ];

      const qualities: Array<{ resolution: string; url: string; bitrate: string }> = [];

      const ffmpegExe = await getFfmpegExecutable();
      if (!ffmpegExe) {
        throw new Error('FFmpeg executable not found in system or bundled path');
      }

      // Розрахунок тривалості вхідного відео у секундах для відстеження прогресу
      let sourceDurationSec = 0;
      try {
        const probeOut = await execAsync(`"${ffmpegExe}" -i "${sourcePath}" 2>&1`);
        const probeText = typeof probeOut === 'string' ? probeOut : (probeOut.stdout || '') + ' ' + (probeOut.stderr || '');
        const durMatch = probeText.match(/Duration:\s*(\d+):(\d+):(\d+\.\d+)/);
        if (durMatch) {
          sourceDurationSec = parseInt(durMatch[1], 10) * 3600 + parseInt(durMatch[2], 10) * 60 + parseFloat(durMatch[3]);
          console.log(`Source duration calculated: ${sourceDurationSec}s`);
        }
      } catch (e: any) {
        const errText = e ? (e.stdout || '') + ' ' + (e.stderr || '') + ' ' + (e.message || '') : '';
        const durMatch = errText.match(/Duration:\s*(\d+):(\d+):(\d+\.\d+)/);
        if (durMatch) {
          sourceDurationSec = parseInt(durMatch[1], 10) * 3600 + parseInt(durMatch[2], 10) * 60 + parseFloat(durMatch[3]);
          console.log(`Source duration calculated from catch: ${sourceDurationSec}s`);
        }
      }

      const gpuInfo = await checkGpuHardware();
      let vCodec = 'libx264';
      let vPreset = '-preset ultrafast';

      const reqMode = String(renderMode || encoder || '').toLowerCase();
      if ((reqMode === 'gpu' || reqMode === 'nvenc') && gpuInfo.available) {
        vCodec = gpuInfo.encoder;
        vPreset = gpuInfo.encoder === 'h264_nvenc' ? '-preset p1' : '-preset global_quality';
        console.log(`🚀 GPU Mode Selected: Using GPU encoder (${vCodec})...`);
      } else if (reqMode === 'qsv' && gpuInfo.available) {
        vCodec = 'h264_qsv';
        vPreset = '-preset global_quality';
      } else if (reqMode === 'cpu') {
        vCodec = 'libx264';
        vPreset = '-preset ultrafast';
        console.log(`💻 CPU Mode Selected: Using libx264 with multi-threading.`);
      } else {
        if (gpuInfo.available) {
          vCodec = gpuInfo.encoder;
          vPreset = gpuInfo.encoder === 'h264_nvenc' ? '-preset p1' : '-preset global_quality';
          console.log(`⚡ Auto Mode: Detected GPU ${vCodec}`);
        } else {
          vCodec = 'libx264';
          vPreset = '-preset ultrafast';
          console.log(`⚡ CPU Mode: Using CPU libx264 (Container CPU mode active)`);
        }
      }

      console.log(`🚀 Starting physical ${targets.length}-resolution FFmpeg transcoding (${vCodec}) for: ${sourcePath}...`);
      appendConversionLog(`🚀 [FFmpeg] Старт конвертації: ${path.basename(sourcePath)} (${targets.map(t => t.res).join(', ')})`);
      appendConversionLog(`⚙️ [FFmpeg] Режим: ${renderMode || 'auto'}, Кодек: ${vCodec}, Пресет: ${vPreset}`);

      for (let targetIdx = 0; targetIdx < targets.length; targetIdx++) {
        const target = targets[targetIdx];
        const outputPath = path.join(videosDir, target.filename);

        activeConversionProgress = {
          active: true,
          percent: Math.round(targetIdx * (100 / targets.length)),
          currentResolution: target.res,
          targetIndex: targetIdx + 1,
          totalTargets: targets.length,
          statusMessage: `Розпочато рендеринг ${target.res} (${targetIdx + 1}/${targets.length})...`
        };

        try {
          console.log(`🎬 Transcoding ${target.res} (${targetIdx + 1}/${targets.length}) using ${vCodec} (${target.filename})...`);
          await runFfmpegTranscode(
            ffmpegExe,
            sourcePath,
            outputPath,
            vCodec,
            vPreset,
            target,
            targetIdx,
            targets.length,
            sourceDurationSec
          );
        } catch (cmdErr: any) {
          if (vCodec !== 'libx264') {
            console.warn(`⚠️ GPU (${vCodec}) encoding failed: ${cmdErr.message}. Falling back to CPU (libx264)...`);
            appendConversionLog(`⚠️ [FFmpeg ${target.res}] GPU (${vCodec}) помилка. Перемикання на CPU (libx264)...`);
            vCodec = 'libx264';
            vPreset = '-preset ultrafast';
            activeConversionProgress = {
              ...activeConversionProgress,
              statusMessage: `Рендеринг ${target.res} (CPU x264 fallback)...`
            };
            try {
              await runFfmpegTranscode(
                ffmpegExe,
                sourcePath,
                outputPath,
                'libx264',
                '-preset ultrafast',
                target,
                targetIdx,
                targets.length,
                sourceDurationSec
              );
            } catch (fallbackErr: any) {
              console.error(`❌ Transcoding fallback error for ${target.res}:`, fallbackErr.message);
              appendConversionLog(`❌ [FFmpeg ${target.res}] Fallback помилка: ${fallbackErr.message}`);
            }
          } else {
            console.error(`❌ Transcoding error for ${target.res}:`, cmdErr.message);
            appendConversionLog(`❌ [FFmpeg ${target.res}] Помилка: ${cmdErr.message}`);
          }
        }

        if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 1000) {
          const fileSizeBytes = fs.statSync(outputPath).size;
          console.log(`✅ ${target.res} ready (${Math.round(fileSizeBytes / 1024 / 1024)}MB): /uploads/videos/${target.filename}`);
          appendConversionLog(`💾 [FFmpeg] Файл ${target.res} готовий (${Math.round(fileSizeBytes / 1024 / 1024)}MB): /uploads/videos/${target.filename}`);

          // Відправка сконвертованого файлу в бакет MinIO (шлях videos/{id}/...)
          const videoIdFolder = (movieId && String(movieId)) || (seasonNum !== undefined && episodeNum !== undefined ? `s${seasonNum}e${episodeNum}` : baseName) || 'general';
          const minioKey = `videos/${videoIdFolder}/${target.filename}`;
          const isUploaded = await uploadFileToMinio(outputPath, minioKey, 'video/mp4');
          if (isUploaded) {
            appendConversionLog(`☁️ [MinIO] ${target.res} успішно вивантажено у бакет: ${minioKey}`);
            // Звільняємо диск Prod від тимчасового файлу
            try {
              fs.unlinkSync(outputPath);
              console.log(`🧹 Local converted temp file removed: ${outputPath}`);
            } catch (delErr: any) {
              console.warn(`Could not remove local temp file: ${delErr.message}`);
            }
          }

          qualities.push({
            resolution: target.res,
            url: `/videos/${videoIdFolder}/${target.filename}`,
            bitrate: target.bitrate
          });
        } else {
          console.warn(`⚠️ Transcoded file ${target.res} was empty or invalid`);
          appendConversionLog(`⚠️ [FFmpeg] Файл ${target.res} порожній або некоректний`);
          if (fs.existsSync(outputPath)) {
            try { fs.unlinkSync(outputPath); } catch { }
          }
        }
      }

      if (qualities.length === 0) {
        console.error(`❌ FFmpeg failed to generate any transcoded video files for: ${sourcePath}`);
        appendConversionLog(`❌ [FFmpeg] Не вдалося згенерувати жоден відеофайл для ${sourcePath}`);
        activeConversionProgress = {
          active: false,
          percent: 0,
          currentResolution: '',
          targetIndex: 0,
          totalTargets: targets.length,
          statusMessage: 'Помилка рендерингу FFmpeg'
        };
        return res.status(500).json({
          success: false,
          error: `Помилка конвертації FFmpeg: жоден файл не було згенеровано для ${videoUrl}`
        });
      }

      activeConversionProgress = {
        active: false,
        percent: 100,
        currentResolution: qualities.map(q => q.resolution).join('/'),
        targetIndex: targets.length,
        totalTargets: targets.length,
        statusMessage: `Усі роздільності успішно згенеровано (100%): ${qualities.map(q => q.resolution).join(', ')}`
      };

      appendConversionLog(`🎉 [FFmpeg] Усі роздільності успішно згенеровано: ${qualities.map(q => q.resolution).join(', ')} (100%)`);

      const videoSources: Record<string, string> = {};
      qualities.forEach(q => {
        videoSources[q.resolution] = q.url;
      });

      console.log('Finished video conversion successfully:', qualities);
      const hostGpuCheck = await checkGpuHardware();
      return res.json({
        success: true,
        qualities,
        videoSources,
        gpuAvailable: hostGpuCheck.available,
        gpuDetails: hostGpuCheck.details
      });
    } catch (error: any) {
      console.error('Video conversion error:', error);
      appendConversionLog(`❌ [FFmpeg Error] ${error.message}`);
      res.status(500).json({ error: error.message });
    }
  });

  // Ендпоінт запиту доступних сконвертованих якостей відео/серії з диска сервера або MinIO
  app.get('/api/video-qualities', async (req, res) => {
    try {
      const seasonNum = req.query.seasonNum ? Number(req.query.seasonNum) : undefined;
      const episodeNum = req.query.episodeNum ? Number(req.query.episodeNum) : undefined;
      const videoUrl = typeof req.query.videoUrl === 'string' ? req.query.videoUrl : '';

      const uploadDir = path.join(process.cwd(), 'public', 'uploads');
      const videosDir = path.join(uploadDir, 'videos');

      const qualities: Array<{ resolution: string; url: string }> = [];
      const resolutions = ['4K', '1080p', '720p', '480p'];

      const minioObjects = await listMinioObjects('uploads/');

      const checkAndAdd = (resName: string, relPath: string) => {
        const full = path.join(process.cwd(), 'public', relPath);
        const existsLocally = fs.existsSync(full) && fs.statSync(full).size > 1000;
        
        const normKey = relPath.replace(/^\/+/, '');
        const filename = path.basename(relPath);
        const existsInMinio = minioObjects.has(normKey) || minioObjects.has(`uploads/videos/${filename}`) || minioObjects.has(`uploads/${filename}`);

        if (existsLocally || existsInMinio) {
          if (!qualities.some(q => q.resolution === resName)) {
            qualities.push({ resolution: resName, url: relPath });
          }
        }
      };

      const resPattern = /(^|\/|_)(4K|4k|2160p|1080p|1080P|720p|720P|480p|480P|360p|original)(_|\.|$)/i;

      // 1. Перевірка чи містить посилання мітку роздільності
      if (videoUrl && (videoUrl.includes('/uploads/') || videoUrl.includes('/videos/'))) {
        const filename = path.basename(videoUrl.split('?')[0]);
        if (resPattern.test(filename)) {
          resolutions.forEach(r => {
            const tag = r === '4K' ? '4K' : r;
            const derivedName = filename.replace(resPattern, (_match, p1, _p2, p3) => `${p1}${tag}${p3}`);
            checkAndAdd(r, `/uploads/videos/${derivedName}`);
            checkAndAdd(r, `/uploads/${derivedName}`);

            const stripped = derivedName.replace(/^up_[0-9a-z]+_[0-9a-z]+_/i, '');
            checkAndAdd(r, `/uploads/videos/${stripped}`);
            checkAndAdd(r, `/uploads/${stripped}`);

            if (fs.existsSync(videosDir)) {
              try {
                const files = fs.readdirSync(videosDir);
                const match = files.find(f => f === stripped || f.endsWith(stripped) || (stripped && f.includes(stripped)));
                if (match) checkAndAdd(r, `/uploads/videos/${match}`);
              } catch { }
            }
          });
        }
      }

      // 2. Пошук файлів у папках videosDir та uploadDir за номером сезону й серії
      if (seasonNum !== undefined && episodeNum !== undefined) {
        const epPattern = new RegExp(`s0*${seasonNum}[_.-]?e0*${episodeNum}\\b`, 'i');

        [videosDir, uploadDir].forEach(dir => {
          if (fs.existsSync(dir)) {
            try {
              const files = fs.readdirSync(dir);
              const relPrefix = dir.endsWith('videos') ? '/uploads/videos/' : '/uploads/';

              resolutions.forEach(r => {
                const tagRegex = new RegExp(`(^|_)${r}(_|\.)`, 'i');
                const matchingFile = files.find(f => epPattern.test(f) && tagRegex.test(f) && !fs.statSync(path.join(dir, f)).isDirectory());
                if (matchingFile) {
                  checkAndAdd(r, `${relPrefix}${matchingFile}`);
                }
              });
            } catch (e) { }
          }
        });
      }

      // 3. Пошук файлів споріднених якостей за базовим ім'ям
      if (videoUrl && (videoUrl.includes('/uploads/') || videoUrl.includes('/videos/'))) {
        const rawFilename = path.basename(videoUrl.split('?')[0]);
        let cleanCore = rawFilename.replace(/\.[^/.]+$/, '');
        cleanCore = cleanCore.replace(/^up_[0-9a-z]+_[0-9a-z]+_/i, '');
        cleanCore = cleanCore.replace(/^\d{10,}_/, '');
        cleanCore = cleanCore.replace(/(^|_)(4K|4k|2160p|1080p|720p|480p)(_|$)/gi, '_');
        cleanCore = cleanCore.replace(/_\d{10,}$/, '');
        cleanCore = cleanCore.replace(/[^a-zA-Z0-9_-]/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '');

        if (cleanCore && cleanCore !== 'video') {
          [videosDir, uploadDir].forEach(dir => {
            if (fs.existsSync(dir)) {
              try {
                const files = fs.readdirSync(dir);
                const relPrefix = dir.endsWith('videos') ? '/uploads/videos/' : '/uploads/';
                resolutions.forEach(r => {
                  const tagRegex = new RegExp(`(^|_)${r}(_|\.)`, 'i');
                  const matchingFile = files.find(f => f.includes(cleanCore) && tagRegex.test(f) && !fs.statSync(path.join(dir, f)).isDirectory());
                  if (matchingFile) {
                    checkAndAdd(r, `${relPrefix}${matchingFile}`);
                  }
                });
              } catch (e) { }
            }
          });
        }
      }

      // 4. Пошук файлів за movieId або назвою фільму (якщо нічого не знайдено за URL)
      const movieId = typeof req.query.movieId === 'string' ? req.query.movieId : '';
      const movieTitle = typeof req.query.movieTitle === 'string' ? req.query.movieTitle : '';
      const titleClean = (movieTitle || movieId).toLowerCase().replace(/[^a-z0-9]/g, '');
      const keywords = [
        titleClean,
        movieId.toLowerCase().split('-')[0],
        (movieTitle || '').toLowerCase().split(' ')[0]
      ].filter(k => k && k.length >= 3);

      if (qualities.length === 0 && keywords.length > 0) {
        [videosDir, uploadDir].forEach(dir => {
          if (fs.existsSync(dir)) {
            try {
              const files = fs.readdirSync(dir);
              const relPrefix = dir.endsWith('videos') ? '/uploads/videos/' : '/uploads/';
              resolutions.forEach(r => {
                const tagRegex = new RegExp(`(^|_)${r}(_|\.)`, 'i');
                const matchingFile = files.find(f => {
                  const fLower = f.toLowerCase();
                  return keywords.some(k => fLower.includes(k)) && tagRegex.test(f) && !fs.statSync(path.join(dir, f)).isDirectory();
                });
                if (matchingFile) {
                  checkAndAdd(r, `${relPrefix}${matchingFile}`);
                }
              });
            } catch (e) { }
          }
        });
      }

      // Створення структури videoSources для плеєра
      const videoSources: Record<string, string> = {};
      qualities.forEach(q => {
        videoSources[q.resolution] = q.url;
      });

      // Якщо відео є, але точні якості не знайдено, формуємо резервні посилання
      if (videoUrl && Object.keys(videoSources).length === 0) {
        resolutions.forEach(r => {
          if (resPattern.test(videoUrl)) {
            videoSources[r] = videoUrl.replace(resPattern, `$1${r}$3`);
          } else {
            videoSources[r] = videoUrl;
          }
        });
      }

      return res.json({ success: true, qualities, videoSources });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // CORS-проксі для відтворення HLS-стрімів (наприклад, ashdi.vip)
  app.all('/api/proxy/*', async (req, res) => {
    // Додавання заголовків CORS для доступу HLS.js у браузері
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.setHeader('Access-Control-Expose-Headers', '*');

    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }

    try {
      let targetUrl = (req.params as any)[0];
      if (!targetUrl) {
        return res.status(400).send('Missing target URL');
      }

      // Нормалізація цільового URL (відновлення протоколу із шляху)
      if (targetUrl.startsWith('https/')) {
        targetUrl = 'https://' + targetUrl.substring(6);
      } else if (targetUrl.startsWith('https:/')) {
        targetUrl = 'https://' + targetUrl.substring(7);
      } else if (targetUrl.startsWith('http/')) {
        targetUrl = 'http://' + targetUrl.substring(5);
      } else if (targetUrl.startsWith('http:/')) {
        targetUrl = 'http://' + targetUrl.substring(6);
      } else if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
        targetUrl = 'https://' + targetUrl;
      }

      // Відновлення параметрів запиту (query params)
      const queryParams = new URLSearchParams(req.query as any).toString();
      const finalUrl = queryParams ? `${targetUrl}?${queryParams}` : targetUrl;

      const parsedUrl = new URL(finalUrl);
      const headers: Record<string, string> = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Origin': parsedUrl.origin,
        'Referer': parsedUrl.origin + '/',
      };

      // Передача заголовка Range (необхідно для потокового завантаження шматочків відео)
      if (req.headers['range']) {
        headers['Range'] = req.headers['range'] as string;
      }

      const targetRes = await fetch(finalUrl, { headers });

      // Встановлення HTTP-статусу відповіді
      res.status(targetRes.status);

      // Копіювання відповідних HTTP-заголовків
      const contentType = targetRes.headers.get('content-type');
      if (contentType) {
        res.setHeader('Content-Type', contentType);
      }
      const contentRange = targetRes.headers.get('content-range');
      if (contentRange) {
        res.setHeader('Content-Range', contentRange);
      }
      const acceptRanges = targetRes.headers.get('accept-ranges');
      if (acceptRanges) {
        res.setHeader('Accept-Ranges', acceptRanges);
      }

      const isM3U8 = finalUrl.toLowerCase().includes('m3u8') ||
        (contentType && (contentType.includes('mpegurl') || contentType.includes('x-mpegurl')));

      if (isM3U8) {
        let text = await targetRes.text();
        const proxyBase = `${req.protocol}://${req.get('host')}/api/proxy`;

        // Перезапис абсолютних адрес у m3u8 плейлисті для маршрутизації через проксі
        text = text.replace(/(https?:\/\/)([^\s",()]+)/g, (match, protocol, rest) => {
          if (match.includes(req.get('host') || '')) {
            return match;
          }
          const cleanProtocol = protocol.replace('://', '');
          return `${proxyBase}/${cleanProtocol}/${rest}`;
        });

        return res.send(text);
      } else {
        // Потокова віддача бінарних даних (сегментів відео або субтитрів)
        const arrayBuffer = await targetRes.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        return res.send(buffer);
      }
    } catch (error) {
      console.error('Proxy error:', error);
      res.status(500).send('Proxy error: ' + (error as any).message);
    }
  });

  // Перехоплення прямого переходу на /videos/* для відкриття у нашому відеоплеєрі
  // Коли користувач відкриває посилання в новому вікні, браузер очікує HTML-сторінку
  app.get(/(?:\/videos\/.*|\.(?:mp4|m3u8|mkv|webm|avi))$/i, (req, res, next) => {
    const accept = req.headers['accept'] || '';
    const secFetchMode = req.headers['sec-fetch-mode'] || '';

    // Якщо це прямий перехід користувача в браузері
    if (secFetchMode === 'navigate' || accept.includes('text/html')) {
      console.log('Intercepting direct browser navigation to video:', req.path);
      return res.redirect(`/?video=${encodeURIComponent(req.path)}`);
    }

    // Інакше це виклик медіапотоку з відеоплеєра, передаємо керування на роздачу файлу
    next();
  });

  // Роздача статичних ресурсів із папки public
  app.use(express.static(path.join(process.cwd(), 'public')));

  // Високопродуктивний стрімінговий обробник для медіа у /uploads/ та /videos/
  app.all(['/uploads/:filename(*)', '/videos/:filename(*)'], async (req, res) => {
    let rawFilename = req.params.filename;
    if (!rawFilename) {
      return res.status(404).json({ error: 'Filename missing' });
    }

    let filename = rawFilename;
    try {
      filename = decodeURIComponent(rawFilename);
    } catch {
      // Збереження оригінального імені при помилці декодування
    }

    const cleanFilename = path.basename(filename);
    const uploadsDir = path.join(process.cwd(), 'uploads');
    const publicUploadsDir = path.join(process.cwd(), 'public', 'uploads');
    const videosDir = path.join(publicUploadsDir, 'videos');

    let filePath = path.join(publicUploadsDir, rawFilename);

    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      filePath = path.join(videosDir, cleanFilename);
    }
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      filePath = path.join(publicUploadsDir, cleanFilename);
    }
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      filePath = path.join(uploadsDir, cleanFilename);
    }

    // Пошук альтернативного mp4-файлу, якщо запитувався інший формат
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      const ext = path.extname(cleanFilename);
      if (ext) {
        const baseWithoutExt = cleanFilename.substring(0, cleanFilename.length - ext.length);
        const mp4Alternative = path.join(videosDir, baseWithoutExt + '.mp4');
        if (fs.existsSync(mp4Alternative)) {
          filePath = mp4Alternative;
        }
      }
    }

    // Пошук файлу з префіксом завантаження (наприклад, up_xxx_1080p_Oppenheymer.mp4)
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      const searchDirs = [videosDir, publicUploadsDir, uploadsDir];
      for (const dir of searchDirs) {
        if (fs.existsSync(dir)) {
          try {
            const files = fs.readdirSync(dir);
            const matchedFile = files.find(f => {
              if (fs.statSync(path.join(dir, f)).isDirectory()) return false;
              if (f === cleanFilename) return true;
              if (f.endsWith(cleanFilename)) return true;
              if (cleanFilename.endsWith(f)) return true;
              const cleanF = f.replace(/^up_[0-9a-z]+_[0-9a-z]+_/i, '').replace(/^[0-9]+_/, '');
              const cleanTarget = cleanFilename.replace(/^up_[0-9a-z]+_[0-9a-z]+_/i, '').replace(/^[0-9]+_/, '');
              return Boolean(cleanF && cleanTarget && (cleanF === cleanTarget || f.includes(cleanTarget) || cleanFilename.includes(cleanF)));
            });
            if (matchedFile) {
              filePath = path.join(dir, matchedFile);
              break;
            }
          } catch { }
        }
      }
    }

    const actualExt = path.extname(cleanFilename).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.mp4': 'video/mp4',
      '.m4v': 'video/mp4',
      '.webm': 'video/webm',
      '.mkv': 'video/x-matroska',
      '.avi': 'video/x-msvideo',
      '.mov': 'video/quicktime',
      '.ts': 'video/mp2t',
      '.m3u8': 'application/x-mpegURL',
      '.mp3': 'audio/mpeg',
      '.ogg': 'audio/ogg',
      '.wav': 'audio/wav',
      '.vtt': 'text/vtt'
    };

    let minioObjectInfo: { key: string; size: number; contentType?: string } | null = null;

    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      // Перевірка наявності об'єкта в бакеті MinIO (videos/{id}/..., videos/..., uploads/...)
      const cleanKey = rawFilename.replace(/^\/+/, '');
      const minioCandidates = [
        cleanKey,
        `videos/${cleanKey}`,
        `videos/${cleanFilename}`,
        `uploads/videos/${cleanFilename}`,
        `uploads/${cleanFilename}`,
        cleanFilename
      ];

      for (const cand of minioCandidates) {
        const stat = await statMinioObject(cand);
        if (stat && stat.exists) {
          minioObjectInfo = {
            key: stat.key,
            size: stat.size,
            contentType: stat.contentType
          };
          break;
        }
      }

      // Глибокий пошук за ім'ям файлу, якщо шлях містить папку videos/{id}/
      if (!minioObjectInfo) {
        const allObjects = await listMinioObjects('videos/');
        for (const k of allObjects.keys()) {
          if (k === cleanFilename || k.endsWith(`/${cleanFilename}`)) {
            const stat = await statMinioObject(k);
            if (stat && stat.exists) {
              minioObjectInfo = {
                key: stat.key,
                size: stat.size,
                contentType: stat.contentType
              };
              break;
            }
          }
        }
      }

      if (!minioObjectInfo) {
        // Повернення 404 помилки у разі відсутності медіафайлу і на диску, і в MinIO
        return res.status(404).json({ error: 'Video file not found on server or MinIO', filename: cleanFilename });
      }
    }

    // Стрімінг із MinIO з повною підтримкою перемотки (HTTP 206 Range)
    if (minioObjectInfo) {
      const fileSize = minioObjectInfo.size;
      const contentType = minioObjectInfo.contentType || mimeTypes[actualExt] || 'video/mp4';

      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', '*');
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Content-Type', contentType);

      if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
      }

      if (req.method === 'HEAD') {
        res.setHeader('Content-Length', fileSize);
        return res.sendStatus(200);
      }

      const range = req.headers.range;
      if (range) {
        const parts = range.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

        if (start >= fileSize || end >= fileSize || start > end) {
          res.setHeader('Content-Range', `bytes */${fileSize}`);
          return res.status(416).json({ error: 'Requested range not satisfiable' });
        }

        const chunkSize = (end - start) + 1;
        res.status(206);
        res.setHeader('Content-Range', `bytes ${start}-${end}/${fileSize}`);
        res.setHeader('Content-Length', chunkSize);

        const streamRes = await getMinioStream(minioObjectInfo.key, start, chunkSize);
        if (!streamRes) {
          return res.status(500).json({ error: 'Failed to stream object from MinIO' });
        }
        streamRes.stream.on('error', (streamErr) => {
          console.error(`MinIO partial stream error for ${cleanFilename}:`, streamErr);
          if (!res.headersSent) res.status(500).end();
        });
        return streamRes.stream.pipe(res);
      } else {
        res.setHeader('Content-Length', fileSize);
        const streamRes = await getMinioStream(minioObjectInfo.key);
        if (!streamRes) {
          return res.status(500).json({ error: 'Failed to stream object from MinIO' });
        }
        streamRes.stream.on('error', (streamErr) => {
          console.error(`MinIO full stream error for ${cleanFilename}:`, streamErr);
          if (!res.headersSent) res.status(500).end();
        });
        return streamRes.stream.pipe(res);
      }
    }

    const stat = fs.statSync(filePath);
    const fileSize = stat.size;

    const localExt = path.extname(filePath).toLowerCase();
    const contentType = mimeTypes[localExt] || 'video/mp4';

    // Встановлення заголовків CORS та підтримки Accept-Ranges
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Content-Type', contentType);

    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }

    if (req.method === 'HEAD') {
      res.setHeader('Content-Length', fileSize);
      return res.sendStatus(200);
    }

    const range = req.headers.range;
    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

      if (start >= fileSize || end >= fileSize || start > end) {
        res.setHeader('Content-Range', `bytes */${fileSize}`);
        return res.status(416).json({ error: 'Requested range not satisfiable' });
      }

      const chunkSize = (end - start) + 1;
      res.status(206);
      res.setHeader('Content-Range', `bytes ${start}-${end}/${fileSize}`);
      res.setHeader('Content-Length', chunkSize);

      const fileStream = fs.createReadStream(filePath, { start, end });
      fileStream.on('error', (err) => {
        console.error(`Stream error for ${cleanFilename}:`, err);
        if (!res.headersSent) {
          res.status(500).end();
        }
      });
      fileStream.pipe(res);
    } else {
      res.setHeader('Content-Length', fileSize);
      const fileStream = fs.createReadStream(filePath);
      fileStream.on('error', (err) => {
        console.error(`Stream error for ${cleanFilename}:`, err);
        if (!res.headersSent) {
          res.status(500).end();
        }
      });
      fileStream.pipe(res);
    }
  });

  // Проміжне ПЗ (middleware) Vite для режиму розробки
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);

    // Перенаправлення маршрутів SPA у режимі розробки на index.html
    app.use('*', async (req, res, next) => {
      if (
        req.method !== 'GET' ||
        req.path.startsWith('/api') ||
        req.path.startsWith('/videos') ||
        req.path.startsWith('/@') ||
        req.path.startsWith('/node_modules') ||
        req.path.startsWith('/src') ||
        /\.[a-zA-Z0-9]+$/.test(req.path)
      ) {
        return next();
      }
      try {
        const indexHtmlPath = path.resolve(process.cwd(), 'index.html');
        let template = fs.readFileSync(indexHtmlPath, 'utf-8');
        template = await vite.transformIndexHtml(req.originalUrl, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Запуск діагностики FFmpeg та відеокарти GPU при старті сервера
  try {
    await checkGpuHardware();
  } catch (diagErr) {
    console.warn('FFmpeg diagnostics deferred:', diagErr);
  }

  // Ініціалізація та перевірка доступності сховища MinIO
  try {
    await initMinio();
  } catch (minioErr) {
    console.warn('[MinIO] Storage connection check deferred:', minioErr);
  }

  // Глобальний обробник неперехоплених помилок сервера (CWE-209: захист від витоку SyntaxError/Error stack)
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (err instanceof SyntaxError && (err as any).status === 400 && 'body' in err) {
      return res.status(400).json({ success: false, error: 'Invalid JSON payload' });
    }
    console.error('Unhandled request error:', err?.message || err);
    if (!res.headersSent) {
      res.status(err?.status || 500).json({ success: false, error: 'Internal server error' });
    }
  });

  const server = app.listen(PORT, host, () => {
    console.log(`=================================================`);
    console.log(` Cinema Nova Server Running on port ${PORT}`);
    console.log(`  ➜ Local:   http://localhost:${PORT}`);
    console.log(`  ➜ Network: http://127.0.0.1:${PORT} (0.0.0.0:${PORT})`);
    console.log(`  ➜ Domain:  https://cinema-nova.example`);
    console.log(`=================================================`);
  });

  server.on('error', (err: any) => {
    console.error('Server error event:', err);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
