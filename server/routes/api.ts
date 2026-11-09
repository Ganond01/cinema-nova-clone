import fs from 'fs';
import path from 'path';
import { Router, Request, Response } from 'express';
import { isDatabaseAvailable, getPrismaClient } from '../db';
import { INITIAL_MOVIES } from '../../src/data/movies';
import { ANIME_LIST } from '../../src/data/animeData';
import { DORAMAS_LIST } from '../../src/data/doramas';
import { Movie } from '../../src/types';

export const apiRouter = Router();

function formatMediaItem(item: any): any {
  if (!item) return item;
  const episodesData: Record<number, any[]> = {};
  if (item.seasons && Array.isArray(item.seasons)) {
    for (const s of item.seasons) {
      if (s && typeof s.seasonNumber === 'number') {
        episodesData[s.seasonNumber] = (s.episodes || []).map((ep: any) => ({
          id: ep.id,
          number: ep.number,
          title: ep.title,
          duration: ep.duration,
          videoUrl: ep.videoUrl,
          description: ep.description,
          thumbnailUrl: ep.thumbnailUrl,
          qualities: ep.qualities,
          videoSources: ep.videoSources,
          subtitleUrl: ep.subtitleUrl,
          whisperSubtitles: ep.whisperSubtitles
        }));
      }
    }
  }

  const { seasons, ...rest } = item;
  return {
    ...rest,
    episodesData: Object.keys(episodesData).length > 0 ? episodesData : (item.episodesData || undefined)
  };
}


// Об'єднаний резервний список усіх медіа для режиму fallback (якщо БД 127.0.0.1 недоступна)
const fallbackMediaMap = new Map<string, Movie>();
for (const m of INITIAL_MOVIES) {
  if (m && m.id) fallbackMediaMap.set(m.id, m);
}
for (const a of ANIME_LIST) {
  if (a && a.id) fallbackMediaMap.set(a.id, a);
}
for (const d of DORAMAS_LIST) {
  if (d && d.id) fallbackMediaMap.set(d.id, d);
}
const allFallbackMedia = Array.from(fallbackMediaMap.values());

// Резервне in-memory сховище для відгуків, обраного та історії, якщо БД офлайн
const inMemoryFavorites = new Map<string, Set<string>>(); // userId -> Set<mediaItemId>
const inMemoryHistory = new Map<string, any[]>(); // userId -> HistoryItem[]
const inMemoryReviews = new Map<string, any[]>();
// Резервне in-memory сховище для користувачів, якщо БД офлайн
const inMemoryUsers = new Map<string, any>();
inMemoryUsers.set('premium@example.invalid', {
  id: 'usr_andriy',
  name: 'Андрій',
  email: 'premium@example.invalid',
  password: 'PUBLIC_DEMO_ONLY',
  role: 'user',
  plan: 'Premium',
  avatarUrl: 'https://images.unsplash.com/photo-1531427186611-ecfd6d936c79?q=80&w=150&auto=format&fit=crop',
  favoriteGenres: ['Екшн', 'Фантастика']
});
inMemoryUsers.set('viewer@example.invalid', {
  id: 'usr_melnov',
  name: 'Користувач',
  email: 'viewer@example.invalid',
  password: 'PUBLIC_DEMO_ONLY',
  role: 'user',
  plan: 'Premium',
  avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=150&auto=format&fit=crop',
  favoriteGenres: ['Екшн', 'Пригоди']
});
inMemoryUsers.set('admin@example.invalid', {
  id: 'usr_admin',
  name: 'Адмін',
  email: 'admin@example.invalid',
  password: 'PUBLIC_DEMO_ONLY',
  role: 'admin',
  plan: 'VIP',
  avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
  favoriteGenres: ['Фантастика', 'Бойовик']
}); // mediaItemId -> Review[]

// 1. Статус підключення до БД (Health Check)
apiRouter.get('/api/health/db', async (_req: Request, res: Response) => {
  const available = await isDatabaseAvailable();
  const dbUrl = process.env.DATABASE_URL || '';
  const maskedHost = dbUrl.match(/@([^:/]+)/)?.[1] || 'not configured';

  res.json({
    status: available ? 'connected' : 'offline_fallback',
    database: 'postgresql',
    targetHost: maskedHost,
    available
  });
});

// 2. Список фільмів / медіа з пагінацією, фільтрацією та пошуком
apiRouter.get('/api/movies', async (req: Request, res: Response) => {
  try {
    const { type, genre, search, limit = '50', page = '1' } = req.query;
    const take = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 50));
    const skip = ((Math.max(1, parseInt(page as string, 10) || 1)) - 1) * take;

    const dbActive = await isDatabaseAvailable();
    const prisma = getPrismaClient();

    if (dbActive && prisma) {
      const where: any = {};
      if (type && typeof type === 'string') {
        where.type = type;
      }
      if (genre && typeof genre === 'string') {
        where.genres = { has: genre };
      }
      if (search && typeof search === 'string') {
        where.OR = [
          { title: { contains: search, mode: 'insensitive' } },
          { originalTitle: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } }
        ];
      }

      const [total, items] = await Promise.all([
        prisma.mediaItem.count({ where }),
        prisma.mediaItem.findMany({
          where,
          take,
          skip,
          orderBy: { viewsCount: 'desc' }
        })
      ]);

      return res.json({
        success: true,
        source: 'postgresql',
        total,
        page: parseInt(page as string, 10) || 1,
        items
      });
    }

    // Резервний режим (Fallback на статичні дані)
    let filtered = allFallbackMedia;
    if (type && typeof type === 'string') {
      filtered = filtered.filter(m => m.type === type);
    }
    if (genre && typeof genre === 'string') {
      filtered = filtered.filter(m => m.genres && m.genres.includes(genre));
    }
    if (search && typeof search === 'string') {
      const q = search.toLowerCase();
      filtered = filtered.filter(m =>
        (m.title && m.title.toLowerCase().includes(q)) ||
        (m.originalTitle && m.originalTitle.toLowerCase().includes(q)) ||
        (m.description && m.description.toLowerCase().includes(q))
      );
    }

    const total = filtered.length;
    const items = filtered.slice(skip, skip + take);

    return res.json({
      success: true,
      source: 'fallback',
      total,
      page: parseInt(page as string, 10) || 1,
      items
    });
  } catch (err: any) {
    console.error('API /api/movies error:', err);
    return res.status(500).json({ success: false, error: err?.message || 'Server error' });
  }
});

// 3. Отримання окремого медіа за ID (з сезонами та серіями)

// POST /api/movies - Persist Movie/Series and its Seasons & Episodes to PostgreSQL
apiRouter.post('/api/movies', async (req: Request, res: Response) => {
  try {
    const movieData = req.body;
    if (!movieData || !movieData.id || !movieData.title) {
      return res.status(400).json({ success: false, error: 'id and title are required' });
    }

    const dbActive = await isDatabaseAvailable();
    const prisma = getPrismaClient();

    if (!dbActive || !prisma) {
      return res.status(503).json({ success: false, error: 'Database unavailable' });
    }

    const {
      id,
      title,
      originalTitle,
      titleEn,
      type = 'movie',
      year = new Date().getFullYear(),
      duration = '120 хв',
      rating = 0,
      ratingVotesCount = '0',
      ageRating = '16+',
      description = '',
      descriptionEn,
      posterUrl = '',
      backdropUrl = '',
      stills = [],
      genres = [],
      director,
      cast,
      languages = [],
      subtitles = [],
      budget,
      revenue,
      releaseDate,
      videoUrl = '',
      trailerUrl,
      trailerEmbedUrl,
      trailerEmbedUrlUa,
      trailerEmbedUrlEn,
      isPopular = false,
      isNew = false,
      isTrending = false,
      quality = '1080p',
      viewsCount = 0,
      myAnimeListUrl,
      whisperSubtitles,
      subtitleUrl,
      qualities,
      videoSources,
      episodesData
    } = movieData;

    // 1. Upsert MediaItem
    await prisma.mediaItem.upsert({
      where: { id },
      create: {
        id,
        title,
        originalTitle,
        titleEn,
        type,
        year: typeof year === 'number' ? year : parseInt(year, 10) || new Date().getFullYear(),
        duration: String(duration || '120 хв'),
        rating: typeof rating === 'number' ? rating : parseFloat(rating) || 0,
        ratingVotesCount: String(ratingVotesCount || '0'),
        ageRating: String(ageRating || '16+'),
        description: String(description || ''),
        descriptionEn,
        posterUrl: String(posterUrl || ''),
        backdropUrl: String(backdropUrl || ''),
        stills: Array.isArray(stills) ? stills : [],
        genres: Array.isArray(genres) ? genres : [],
        director,
        cast: cast || null,
        languages: Array.isArray(languages) ? languages : [],
        subtitles: Array.isArray(subtitles) ? subtitles : [],
        budget,
        revenue,
        releaseDate,
        videoUrl: String(videoUrl || ''),
        trailerUrl,
        trailerEmbedUrl,
        trailerEmbedUrlUa,
        trailerEmbedUrlEn,
        isPopular: Boolean(isPopular),
        isNew: Boolean(isNew),
        isTrending: Boolean(isTrending),
        quality: String(quality || '1080p'),
        viewsCount: typeof viewsCount === 'number' ? viewsCount : parseInt(viewsCount, 10) || 0,
        myAnimeListUrl,
        whisperSubtitles: whisperSubtitles || null,
        subtitleUrl,
        qualities: qualities || null,
        videoSources: videoSources || null
      },
      update: {
        title,
        originalTitle,
        titleEn,
        type,
        year: typeof year === 'number' ? year : parseInt(year, 10) || new Date().getFullYear(),
        duration: String(duration || '120 хв'),
        rating: typeof rating === 'number' ? rating : parseFloat(rating) || 0,
        ratingVotesCount: String(ratingVotesCount || '0'),
        ageRating: String(ageRating || '16+'),
        description: String(description || ''),
        descriptionEn,
        posterUrl: String(posterUrl || ''),
        backdropUrl: String(backdropUrl || ''),
        stills: Array.isArray(stills) ? stills : [],
        genres: Array.isArray(genres) ? genres : [],
        director,
        cast: cast || null,
        languages: Array.isArray(languages) ? languages : [],
        subtitles: Array.isArray(subtitles) ? subtitles : [],
        budget,
        revenue,
        releaseDate,
        videoUrl: String(videoUrl || ''),
        trailerUrl,
        trailerEmbedUrl,
        trailerEmbedUrlUa,
        trailerEmbedUrlEn,
        isPopular: Boolean(isPopular),
        isNew: Boolean(isNew),
        isTrending: Boolean(isTrending),
        quality: String(quality || '1080p'),
        myAnimeListUrl,
        whisperSubtitles: whisperSubtitles || null,
        subtitleUrl,
        qualities: qualities || null,
        videoSources: videoSources || null
      }
    });

    // 2. If episodesData is provided ({ 1: [Episode, ...], 2: [...] })
    if (episodesData && typeof episodesData === 'object') {
      for (const seasonKey of Object.keys(episodesData)) {
        const sNum = parseInt(seasonKey, 10);
        if (isNaN(sNum)) continue;

        const epList = episodesData[seasonKey];
        if (!Array.isArray(epList)) continue;

        // Upsert Season
        const season = await prisma.season.upsert({
          where: {
            mediaItemId_seasonNumber: {
              mediaItemId: id,
              seasonNumber: sNum
            }
          },
          create: {
            mediaItemId: id,
            seasonNumber: sNum,
            title: `Сезон ${sNum}`
          },
          update: {
            title: `Сезон ${sNum}`
          }
        });

        // Upsert each Episode
        for (const ep of epList) {
          if (!ep || typeof ep.number !== 'number') continue;
          
          const existingEp = await prisma.episode.findFirst({
            where: {
              seasonId: season.id,
              number: ep.number
            }
          });

          const epData = {
            title: ep.title || `Серія ${ep.number}`,
            duration: ep.duration || '24 хв',
            videoUrl: ep.videoUrl || '',
            description: ep.description || '',
            thumbnailUrl: ep.thumbnailUrl || '',
            qualities: ep.qualities || null,
            videoSources: ep.videoSources || null,
            subtitleUrl: ep.subtitleUrl || '',
            whisperSubtitles: ep.whisperSubtitles || null
          };

          if (existingEp) {
            await prisma.episode.update({
              where: { id: existingEp.id },
              data: epData
            });
          } else {
            await prisma.episode.create({
              data: {
                seasonId: season.id,
                number: ep.number,
                ...epData
              }
            });
          }
        }
      }
    }

    const saved = await prisma.mediaItem.findUnique({
      where: { id },
      include: {
        seasons: {
          include: {
            episodes: {
              orderBy: { number: 'asc' }
            }
          },
          orderBy: { seasonNumber: 'asc' }
        }
      }
    });

    console.log(`✅ Successfully saved media item ${id} and its episodes to PostgreSQL`);
    return res.json({ success: true, item: formatMediaItem(saved) });
  } catch (err: any) {
    console.error('POST /api/movies error:', err);
    return res.status(500).json({ success: false, error: err?.message || 'Server error' });
  }
});

// Helper to safely delete files from disk
function deleteFileFromDiskSafe(fileUrlOrName: string): boolean {
  if (!fileUrlOrName || typeof fileUrlOrName !== 'string') return false;
  try {
    const clean = fileUrlOrName.replace(/^https?:\/\/[^\/]+/, '');
    const filename = path.basename(clean);
    if (!filename || filename === '.' || filename === '/') return false;

    const baseDirs = [
      path.join(process.cwd(), 'public', 'uploads'),
      path.join(process.cwd(), 'public', 'uploads', 'videos'),
      path.join(process.cwd(), 'uploads'),
      path.join(process.cwd(), 'public', 'videos'),
      path.join(process.cwd(), 'public', 'subtitles')
    ];

    let deleted = false;
    for (const bDir of baseDirs) {
      const fullPath = path.join(bDir, filename);
      if (fs.existsSync(fullPath)) {
        try {
          fs.unlinkSync(fullPath);
          console.log(`🗑️ Deleted file from disk: ${fullPath}`);
          deleted = true;
        } catch (e) {
          console.warn(`Failed to unlink ${fullPath}:`, e);
        }
      }
    }
    return deleted;
  } catch (err) {
    console.warn(`deleteFileFromDiskSafe error for ${fileUrlOrName}:`, err);
    return false;
  }
}

// DELETE /api/movies/:id - Delete media item from PostgreSQL and associated video files from server
apiRouter.delete('/api/movies/:id', async (req: Request, res: Response) => {
  try {
    const rawId = req.params.id;
    if (!rawId) {
      return res.status(400).json({ success: false, error: 'Movie ID required' });
    }

    const dbActive = await isDatabaseAvailable();
    const prisma = dbActive ? getPrismaClient() : null;

    let mediaToDelete: any = null;
    if (dbActive && prisma) {
      try {
        mediaToDelete = await prisma.mediaItem.findUnique({
          where: { id: rawId },
          include: { seasons: { include: { episodes: true } } }
        });
      } catch (e) {}
    }

    // Collect all video URLs and files to delete
    const filesToDelete = new Set<string>();
    if (mediaToDelete) {
      if (mediaToDelete.videoUrl) filesToDelete.add(mediaToDelete.videoUrl);
      if (mediaToDelete.subtitleUrl) filesToDelete.add(mediaToDelete.subtitleUrl);
      if (Array.isArray(mediaToDelete.seasons)) {
        for (const s of mediaToDelete.seasons) {
          if (Array.isArray(s.episodes)) {
            for (const ep of s.episodes) {
              if (ep.videoUrl) filesToDelete.add(ep.videoUrl);
              if (ep.subtitleUrl) filesToDelete.add(ep.subtitleUrl);
              if (ep.videoSources && typeof ep.videoSources === 'object') {
                for (const vUrl of Object.values(ep.videoSources)) {
                  if (typeof vUrl === 'string') filesToDelete.add(vUrl);
                }
              }
            }
          }
        }
      }
    }

    // Also check any extra files passed in query or body
    const additionalFiles = req.body?.fileUrls;
    if (Array.isArray(additionalFiles)) {
      additionalFiles.forEach((f: any) => { if (typeof f === 'string') filesToDelete.add(f); });
    }

    // Also scan uploads directory for any files containing the rawId
    const cleanId = rawId.replace(/[^a-zA-Z0-9_-]/g, '');
    if (cleanId.length > 2) {
      const uploadDirs = [
        path.join(process.cwd(), 'public', 'uploads'),
        path.join(process.cwd(), 'public', 'uploads', 'videos')
      ];
      uploadDirs.forEach(dir => {
        if (fs.existsSync(dir)) {
          try {
            const files = fs.readdirSync(dir);
            for (const f of files) {
              if (f.includes(cleanId)) {
                filesToDelete.add(f);
              }
            }
          } catch {}
        }
      });
    }

    // Delete all collected files from disk
    let deletedFilesCount = 0;
    for (const f of filesToDelete) {
      if (deleteFileFromDiskSafe(f)) {
        deletedFilesCount++;
      }
    }

    // Delete from PostgreSQL
    let dbDeleted = false;
    if (dbActive && prisma) {
      try {
        await prisma.mediaItem.delete({
          where: { id: rawId }
        });
        dbDeleted = true;
        console.log(`✅ Deleted mediaItem ${rawId} from PostgreSQL`);
      } catch (err: any) {
        console.warn(`Notice: Could not delete ${rawId} from DB:`, err?.message);
      }
    }

    // Remove from in-memory / fallback collections
    const idx = allFallbackMedia.findIndex(m => m.id === rawId);
    if (idx >= 0) {
      allFallbackMedia.splice(idx, 1);
    }

    return res.json({
      success: true,
      id: rawId,
      dbDeleted,
      deletedFilesCount,
      message: `Media item ${rawId} and ${deletedFilesCount} associated files deleted from server.`
    });
  } catch (err: any) {
    console.error('DELETE /api/movies/:id error:', err);
    return res.status(500).json({ success: false, error: err?.message || 'Server error' });
  }
});

// POST /api/uploads/delete - Delete uploaded video files / folders from server
apiRouter.post('/api/uploads/delete', (req: Request, res: Response) => {
  try {
    const { fileUrl, fileUrls, movieId } = req.body;
    const urls: string[] = [];
    if (typeof fileUrl === 'string' && fileUrl) urls.push(fileUrl);
    if (Array.isArray(fileUrls)) {
      fileUrls.forEach((u: any) => { if (typeof u === 'string' && u) urls.push(u); });
    }

    // If movieId is provided, also look for matching files on disk
    if (movieId && typeof movieId === 'string') {
      const cleanId = movieId.replace(/[^a-zA-Z0-9_-]/g, '');
      if (cleanId.length > 2) {
        const uploadDirs = [
          path.join(process.cwd(), 'public', 'uploads'),
          path.join(process.cwd(), 'public', 'uploads', 'videos')
        ];
        uploadDirs.forEach(dir => {
          if (fs.existsSync(dir)) {
            try {
              const files = fs.readdirSync(dir);
              for (const f of files) {
                if (f.includes(cleanId)) {
                  urls.push(f);
                }
              }
            } catch {}
          }
        });
      }
    }

    if (urls.length === 0) {
      return res.status(400).json({ success: false, error: 'No files specified to delete' });
    }

    const deleted: string[] = [];
    for (const u of urls) {
      if (deleteFileFromDiskSafe(u)) {
        deleted.push(u);
      }
    }

    return res.json({
      success: true,
      deletedCount: deleted.length,
      deleted
    });
  } catch (err: any) {
    console.error('POST /api/uploads/delete error:', err);
    return res.status(500).json({ success: false, error: err?.message || 'Server error' });
  }
});

// POST /api/cleanup-demo-users - Delete demo users and requested accounts
apiRouter.post('/api/cleanup-demo-users', async (_req: Request, res: Response) => {
  try {
    const dbActive = await isDatabaseAvailable();
    const prisma = getPrismaClient();
    if (dbActive && prisma) {
      const deleted = await prisma.user.deleteMany({
        where: {
          email: {
            in: [
              'viewer@example.invalid',
              'premium@example.invalid',
              'demo@novacinema.com',
              'test@novacinema.com'
            ]
          }
        }
      });
      return res.json({ success: true, count: deleted.count });
    }
    return res.json({ success: false, message: 'Database offline' });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: e.message });
  }
});


// ==================== AUTH & USER MANAGEMENT API ====================

// 1. Register new user
apiRouter.post('/api/auth/register', async (req: Request, res: Response) => {
  try {
    const { name, email, password, avatarUrl, plan, favoriteGenres, role } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Введіть email та пароль' });
    }

    const normEmail = String(email).trim().toLowerCase();
    const dbActive = await isDatabaseAvailable();
    const prisma = getPrismaClient();

    if (dbActive && prisma) {
      const existing = await prisma.user.findUnique({
        where: { email: normEmail }
      });
      if (existing) {
        return res.status(400).json({ error: 'Користувач з такою поштою вже існує' });
      }

      const assignedRole = (normEmail === 'admin@example.invalid' || role === 'admin') ? 'admin' : 'user';
      const createdUser = await prisma.user.create({
        data: {
          name: name ? String(name).trim() : normEmail.split('@')[0],
          email: normEmail,
          password: String(password),
          avatarUrl: avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
          plan: plan || 'VIP',
          favoriteGenres: Array.isArray(favoriteGenres) ? favoriteGenres : ['Фантастика', 'Бойовик'],
          role: assignedRole,
          handle: name ? `@${String(name).trim().toLowerCase().replace(/\s+/g, '_')}` : undefined
        }
      });
      return res.json({ success: true, user: createdUser });
    } else {
      if (inMemoryUsers.has(normEmail)) {
        return res.status(400).json({ error: 'Користувач з такою поштою вже існує' });
      }
      const user = {
        id: `usr_${Date.now()}`,
        name: name ? String(name).trim() : normEmail.split('@')[0],
        email: normEmail,
        password: String(password),
        avatarUrl: avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
        plan: plan || 'VIP',
        favoriteGenres: Array.isArray(favoriteGenres) ? favoriteGenres : ['Фантастика', 'Бойовик'],
        role: (normEmail === 'admin@example.invalid' || role === 'admin') ? 'admin' : 'user',
        createdAt: new Date().toISOString()
      };
      inMemoryUsers.set(normEmail, user);
      return res.json({ success: true, user });
    }
  } catch (err: any) {
    console.error('API /api/auth/register error:', err);
    return res.status(500).json({ error: err?.message || 'Server registration error' });
  }
});

// 2. Login user
apiRouter.post('/api/auth/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Введіть email та пароль' });
    }

    const rawInput = String(email).trim();
    let normEmail = rawInput.toLowerCase();
    if (normEmail === 'admin') normEmail = 'admin@example.invalid';

    const dbActive = await isDatabaseAvailable();
    const prisma = getPrismaClient();

    let user: any = null;

    if (dbActive && prisma) {
      const cleanHandle = rawInput.replace(/^@/, '');
      user = await prisma.user.findFirst({
        where: {
          OR: [
            { email: { equals: normEmail, mode: 'insensitive' } },
            { email: { equals: rawInput, mode: 'insensitive' } },
            { name: { equals: rawInput, mode: 'insensitive' } },
            { handle: { equals: rawInput, mode: 'insensitive' } },
            { handle: { equals: `@${cleanHandle}`, mode: 'insensitive' } }
          ]
        }
      });

    } else {
      user = inMemoryUsers.get(normEmail);
      if (!user) {
        for (const u of inMemoryUsers.values()) {
          if (
            (u.name && u.name.toLowerCase() === rawInput.toLowerCase()) ||
            (u.handle && u.handle.toLowerCase() === rawInput.toLowerCase())
          ) {
            user = u;
            break;
          }
        }
      }
    }

    // Fast parallel peer query (max 800ms) only across distinct peer hosts to avoid 10s blocking delay
    if (!user && !req.headers['x-peer-sync']) {
      const myHost = (req.headers.host || '').toLowerCase();
      const peerCandidates: string[] = [].filter(p => !myHost || !p.toLowerCase().includes(myHost));

      if (peerCandidates.length > 0) {
        try {
          const fetchPeer = async (pHost: string) => {
            const peerRes = await fetch(pHost + '/api/auth/login', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'x-peer-sync': '1' },
              body: JSON.stringify({ email: rawInput, password }),
              signal: AbortSignal.timeout(800)
            });
            if (!peerRes.ok) throw new Error('Not ok');
            const peerData = await peerRes.json();
            if (peerData?.success && peerData?.user) return peerData.user;
            throw new Error('No user');
          };

          const matchedPeerUser = await Promise.any(peerCandidates.map(fetchPeer));
          if (matchedPeerUser) {
            user = matchedPeerUser;
            if (dbActive && prisma) {
              try {
                const targetEmail = (user.email || normEmail).toLowerCase();
                user = await prisma.user.upsert({
                  where: { email: targetEmail },
                  create: {
                    name: user.name || normEmail.split('@')[0],
                    email: targetEmail,
                    password: user.password || password,
                    avatarUrl: user.avatarUrl,
                    plan: user.plan || 'VIP',
                    role: user.role || 'user',
                    handle: user.handle,
                    favoriteGenres: Array.isArray(user.favoriteGenres) ? user.favoriteGenres : ['Фантастика', 'Бойовик']
                  },
                  update: {
                    name: user.name || undefined,
                    password: user.password || password,
                    avatarUrl: user.avatarUrl || undefined,
                    plan: user.plan || undefined,
                    role: user.role || undefined,
                    handle: user.handle || undefined
                  }
                });
              } catch {}
            }
          }
        } catch {}
      }
    }

    // Fallback default accounts (admin, andriy, melnovmalny) if DB is empty or unreachable
    if (!user) {
      if (normEmail === 'admin@example.invalid' || rawInput.toLowerCase() === 'admin') {
        if (password === 'PUBLIC_DEMO_ONLY' || password === 'PUBLIC_DEMO_ONLY' || password === 'PUBLIC_DEMO_ONLY') {
          user = inMemoryUsers.get('admin@example.invalid');
        }
      } else if (normEmail === 'premium@example.invalid' && (password === 'PUBLIC_DEMO_ONLY' || password === 'PUBLIC_DEMO_ONLY')) {
        user = inMemoryUsers.get('premium@example.invalid');
      } else if (normEmail === 'viewer@example.invalid' && (password === 'PUBLIC_DEMO_ONLY' || password === 'PUBLIC_DEMO_ONLY')) {
        user = inMemoryUsers.get('viewer@example.invalid');
      }
    }

    // Fallback default admin ONLY if neither local DB nor peer nodes had this user
    if (!user && (normEmail === 'admin@example.invalid' || rawInput.toLowerCase() === 'admin')) {
      if (password === 'PUBLIC_DEMO_ONLY' || password === 'PUBLIC_DEMO_ONLY' || password === 'PUBLIC_DEMO_ONLY') {
        if (dbActive && prisma) {
          try {
            user = await prisma.user.create({
              data: {
                name: 'Адмін',
                email: 'admin@example.invalid',
                password: password,
                avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
                role: 'admin',
                plan: 'VIP',
                favoriteGenres: ['Фантастика', 'Бойовик']
              }
            });
          } catch {
            user = await prisma.user.findFirst({ where: { email: 'admin@example.invalid' } });
          }
        } else {
          user = inMemoryUsers.get('admin@example.invalid');
        }
      }
    }

    if (!user) {
      return res.status(404).json({ error: 'Користувача з такою поштою не знайдено' });
    }

    const isPasswordMatch = !user.password || user.password === password || 
      (normEmail === 'admin@example.invalid' && (password === 'PUBLIC_DEMO_ONLY' || password === 'PUBLIC_DEMO_ONLY' || password === 'PUBLIC_DEMO_ONLY'));

    if (!isPasswordMatch) {
      return res.status(401).json({ error: 'Невірний пароль' });
    }

    return res.json({ success: true, user });
  } catch (err: any) {
    console.error('API /api/auth/login error:', err);
    return res.status(500).json({ error: err?.message || 'Server login error' });
  }
});

// 3. Google OAuth Login/Register
apiRouter.post('/api/auth/google', async (req: Request, res: Response) => {
  try {
    const { email, name, avatarUrl } = req.body;
    if (!email) return res.status(400).json({ error: 'Email required' });
    const normEmail = String(email).trim().toLowerCase();

    const dbActive = await isDatabaseAvailable();
    const prisma = getPrismaClient();

    let user: any = null;
    if (dbActive && prisma) {
      user = await prisma.user.findUnique({ where: { email: normEmail } });
      if (!user) {
        user = await prisma.user.create({
          data: {
            name: name || normEmail.split('@')[0],
            email: normEmail,
            avatarUrl: avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
            googleConnected: true,
            plan: 'VIP',
            role: normEmail === 'admin@example.invalid' ? 'admin' : 'user'
          }
        });
      } else if (!user.googleConnected) {
        user = await prisma.user.update({
          where: { email: normEmail },
          data: { googleConnected: true }
        });
      }
    } else {
      user = inMemoryUsers.get(normEmail);
      if (!user) {
        user = {
          id: `usr_g_${Date.now()}`,
          name: name || normEmail.split('@')[0],
          email: normEmail,
          avatarUrl: avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
          googleConnected: true,
          plan: 'VIP',
          role: normEmail === 'admin@example.invalid' ? 'admin' : 'user'
        };
        inMemoryUsers.set(normEmail, user);
      }
    }

    return res.json({ success: true, user });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message });
  }
});

// 4. Get all users with cross-node synchronization (Stage <-> Prod)
apiRouter.get('/api/users', async (req: Request, res: Response) => {
  try {
    const dbActive = await isDatabaseAvailable();
    const prisma = getPrismaClient();

    let users: any[] = [];
    if (dbActive && prisma) {
      users = await prisma.user.findMany({
        orderBy: { createdAt: 'desc' }
      });
    } else {
      users = Array.from(inMemoryUsers.values());
    }

    // Cross-Node Peer User Sync: If not an internal peer sync call, query peer nodes
    if (!req.headers['x-peer-sync']) {
      const peerCandidates: string[] = [];
      const myHost = (req.headers.host || '').toLowerCase();

      for (const pHost of peerCandidates) {
        if (myHost && pHost.toLowerCase().includes(myHost)) continue;
        try {
          const peerRes = await fetch(`${pHost}/api/users`, {
            headers: { 'x-peer-sync': '1' },
            signal: AbortSignal.timeout(3500)
          });
          if (peerRes.ok) {
            const peerData = await peerRes.json();
            if (peerData?.success && Array.isArray(peerData.users) && peerData.users.length > 0) {
              const existingEmails = new Set(users.map(u => (u.email || '').toLowerCase()));
              for (const pu of peerData.users) {
                const pEmail = (pu.email || '').toLowerCase();
                if (!pEmail) continue;
                if (!existingEmails.has(pEmail)) {
                  users.push(pu);
                  existingEmails.add(pEmail);
                  if (dbActive && prisma) {
                    try {
                      await prisma.user.upsert({
                        where: { email: pEmail },
                        create: {
                          name: pu.name || pEmail.split('@')[0],
                          email: pEmail,
                          password: pu.password || 'PUBLIC_DEMO_ONLY',
                          avatarUrl: pu.avatarUrl,
                          plan: pu.plan || 'VIP',
                          role: pu.role || 'user',
                          handle: pu.handle,
                          favoriteGenres: Array.isArray(pu.favoriteGenres) ? pu.favoriteGenres : []
                        },
                        update: {
                          role: pu.role || undefined,
                          plan: pu.plan || undefined,
                          name: pu.name || undefined,
                          avatarUrl: pu.avatarUrl || undefined
                        }
                      });
                    } catch {}
                  }
                }
              }
              break;
            }
          }
        } catch {}
      }
    }

    return res.json({ success: true, users });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message });
  }
});

// 5. Update user profile
apiRouter.put('/api/users/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.params.id;
    const updateData = req.body;
    const dbActive = await isDatabaseAvailable();
    const prisma = getPrismaClient();

    if (dbActive && prisma) {
      const isEmail = userId.includes('@');
      const whereClause = isEmail ? { email: userId.toLowerCase() } : { id: userId };
      const updated = await prisma.user.update({
        where: whereClause,
        data: {
          name: updateData.name,
          avatarUrl: updateData.avatarUrl,
          plan: updateData.plan,
          favoriteGenres: Array.isArray(updateData.favoriteGenres) ? updateData.favoriteGenres : undefined,
          role: updateData.role,
          handle: updateData.handle,
          birthDate: updateData.birthDate,
          gender: updateData.gender,
          location: updateData.location,
          aboutMe: updateData.aboutMe,
          googleConnected: updateData.googleConnected !== undefined ? Boolean(updateData.googleConnected) : undefined,
          facebookConnected: updateData.facebookConnected !== undefined ? Boolean(updateData.facebookConnected) : undefined
        }
      });
      return res.json({ success: true, user: updated });
    } else {
      for (const [em, u] of inMemoryUsers.entries()) {
        if (u.id === userId) {
          const merged = { ...u, ...updateData };
          inMemoryUsers.set(em, merged);
          return res.json({ success: true, user: merged });
        }
      }
      return res.status(404).json({ error: 'User not found' });
    }
  } catch (err: any) {
    return res.status(500).json({ error: err?.message });
  }
});

// 6. Delete user
apiRouter.delete('/api/users/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.params.id;
    const dbActive = await isDatabaseAvailable();
    const prisma = getPrismaClient();

    if (dbActive && prisma) {
      const isEmail = userId.includes('@');
      const whereClause = isEmail ? { email: userId.toLowerCase() } : { id: userId };
      try {
        await prisma.user.delete({ where: whereClause });
      } catch (delErr) {
        console.warn('Prisma delete user by where failed, trying deleteMany:', delErr);
        await prisma.user.deleteMany({
          where: {
            OR: [
              { id: userId },
              { email: { equals: userId, mode: 'insensitive' } }
            ]
          }
        });
      }

      // Forward deletion to peer nodes
      if (!req.headers['x-peer-sync']) {
        const peerCandidates: string[] = [];
        const myHost = (req.headers.host || '').toLowerCase();
        for (const pHost of peerCandidates) {
          if (myHost && pHost.includes(myHost)) continue;
          try {
            fetch(`${pHost}/api/users/${encodeURIComponent(userId)}`, {
              method: 'DELETE',
              headers: { 'x-peer-sync': '1' }
            }).catch(() => {});
          } catch {}
        }
      }

      return res.json({ success: true });
    } else {
      for (const [em, u] of inMemoryUsers.entries()) {
        if (u.id === userId) {
          inMemoryUsers.delete(em);
          return res.json({ success: true });
        }
      }
      return res.json({ success: true });
    }
  } catch (err: any) {
    return res.status(500).json({ error: err?.message });
  }
});

apiRouter.get('/api/movies/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const dbActive = await isDatabaseAvailable();
    const prisma = getPrismaClient();

    if (dbActive && prisma) {
      const media = await prisma.mediaItem.findUnique({
        where: { id },
        include: {
          seasons: {
            include: {
              episodes: {
                orderBy: { number: 'asc' }
              }
            },
            orderBy: { seasonNumber: 'asc' }
          },
          reviews: {
            take: 20,
            orderBy: { createdAt: 'desc' }
          }
        }
      });

      if (media) {
        return res.json({ success: true, source: 'postgresql', item: formatMediaItem(media) });
      }
    }

    // Fallback
    const fallbackItem = fallbackMediaMap.get(id);
    if (fallbackItem) {
      return res.json({ success: true, source: 'fallback', item: fallbackItem });
    }

    // Peer Stage <-> Prod fallback sync: if movie was added on the other node, fetch and replicate it
    const peerCandidateHosts: string[] = [];

    for (const pHost of peerCandidateHosts) {
      const myHost = (req.headers.host || '').toLowerCase();
      if (myHost && pHost.toLowerCase().includes(myHost)) continue;

      try {
        const peerRes = await fetch(`${pHost}/api/movies/${encodeURIComponent(id)}`, {
          signal: AbortSignal.timeout(3500)
        });
        if (peerRes.ok) {
          const peerJson = await peerRes.json();
          if (peerJson && peerJson.item) {
            return res.json({ success: true, source: 'peer_sync', item: peerJson.item });
          }
        }
      } catch {}
    }

    return res.status(404).json({ success: false, error: 'Media not found' });
  } catch (err: any) {
    console.error('API /api/movies/:id error:', err);
    return res.status(500).json({ success: false, error: err?.message || 'Server error' });
  }
});

// 4. "Мій список" (Favorites / Обране)
apiRouter.get('/api/favorites', async (req: Request, res: Response) => {
  try {
    const userId = (req.query.userId as string) || (req.headers['x-user-id'] as string) || 'guest';
    const dbActive = await isDatabaseAvailable();
    const prisma = getPrismaClient();

    if (dbActive && prisma && userId !== 'guest') {
      const favorites = await prisma.favorite.findMany({
        where: { userId },
        include: { mediaItem: true },
        orderBy: { createdAt: 'desc' }
      });
      return res.json({
        success: true,
        source: 'postgresql',
        favorites: favorites.map(f => f.mediaItem)
      });
    }

    // Fallback
    const userFavIds = inMemoryFavorites.get(userId) || new Set();
    const items = Array.from(userFavIds).map(id => fallbackMediaMap.get(id)).filter(Boolean);
    return res.json({ success: true, source: 'fallback', favorites: items });
  } catch (err: any) {
    console.error('API /api/favorites GET error:', err);
    return res.status(500).json({ success: false, error: err?.message });
  }
});

apiRouter.post('/api/favorites', async (req: Request, res: Response) => {
  try {
    const { userId = 'guest', mediaItemId, action = 'toggle' } = req.body || {};
    if (!mediaItemId) {
      return res.status(400).json({ success: false, error: 'mediaItemId is required' });
    }

    const dbActive = await isDatabaseAvailable();
    const prisma = getPrismaClient();

    if (dbActive && prisma && userId !== 'guest') {
      const existing = await prisma.favorite.findUnique({
        where: { userId_mediaItemId: { userId, mediaItemId } }
      });

      if (action === 'remove' || (action === 'toggle' && existing)) {
        if (existing) {
          await prisma.favorite.delete({
            where: { userId_mediaItemId: { userId, mediaItemId } }
          });
        }
        return res.json({ success: true, isFavorite: false, source: 'postgresql' });
      } else {
        await prisma.favorite.upsert({
          where: { userId_mediaItemId: { userId, mediaItemId } },
          update: {},
          create: { userId, mediaItemId }
        });
        return res.json({ success: true, isFavorite: true, source: 'postgresql' });
      }
    }

    // Fallback in-memory
    let favSet = inMemoryFavorites.get(userId);
    if (!favSet) {
      favSet = new Set();
      inMemoryFavorites.set(userId, favSet);
    }

    let isFav = false;
    if (action === 'remove' || (action === 'toggle' && favSet.has(mediaItemId))) {
      favSet.delete(mediaItemId);
      isFav = false;
    } else {
      favSet.add(mediaItemId);
      isFav = true;
    }

    return res.json({ success: true, isFavorite: isFav, source: 'fallback' });
  } catch (err: any) {
    console.error('API /api/favorites POST error:', err);
    return res.status(500).json({ success: false, error: err?.message });
  }
});

// 5. Історія переглядів (Watch History)
apiRouter.get('/api/history', async (req: Request, res: Response) => {
  try {
    const userId = (req.query.userId as string) || (req.headers['x-user-id'] as string) || 'guest';
    const dbActive = await isDatabaseAvailable();
    const prisma = getPrismaClient();

    if (dbActive && prisma && userId !== 'guest') {
      const history = await prisma.watchHistory.findMany({
        where: { userId },
        include: { mediaItem: true },
        orderBy: { watchedAt: 'desc' },
        take: 50
      });
      return res.json({ success: true, source: 'postgresql', history });
    }

    // Fallback
    const history = inMemoryHistory.get(userId) || [];
    return res.json({ success: true, source: 'fallback', history });
  } catch (err: any) {
    console.error('API /api/history GET error:', err);
    return res.status(500).json({ success: false, error: err?.message });
  }
});

apiRouter.post('/api/history', async (req: Request, res: Response) => {
  try {
    const { userId = 'guest', mediaItemId, movieTitle, progressPercent, watchedMinutes, totalMinutes, currentEpisode } = req.body || {};
    if (!mediaItemId) {
      return res.status(400).json({ success: false, error: 'mediaItemId is required' });
    }

    const dbActive = await isDatabaseAvailable();
    const prisma = getPrismaClient();

    if (dbActive && prisma && userId !== 'guest') {
      const record = await prisma.watchHistory.upsert({
        where: { userId_mediaItemId: { userId, mediaItemId } },
        update: {
          progressPercent: progressPercent ?? 0,
          watchedMinutes: watchedMinutes ?? 0,
          totalMinutes: totalMinutes ?? 0,
          currentEpisode: currentEpisode ?? null,
          watchedAt: new Date()
        },
        create: {
          userId,
          mediaItemId,
          movieTitle: movieTitle ?? null,
          progressPercent: progressPercent ?? 0,
          watchedMinutes: watchedMinutes ?? 0,
          totalMinutes: totalMinutes ?? 0,
          currentEpisode: currentEpisode ?? null,
          watchedAt: new Date()
        }
      });
      return res.json({ success: true, source: 'postgresql', record });
    }

    // Fallback in-memory
    let list = inMemoryHistory.get(userId);
    if (!list) {
      list = [];
      inMemoryHistory.set(userId, list);
    }
    const idx = list.findIndex(h => h.mediaItemId === mediaItemId);
    const item = {
      mediaItemId,
      movieTitle,
      progressPercent: progressPercent ?? 0,
      watchedMinutes,
      totalMinutes,
      currentEpisode,
      watchedAt: new Date().toISOString()
    };
    if (idx >= 0) {
      list[idx] = item;
    } else {
      list.unshift(item);
    }

    return res.json({ success: true, source: 'fallback', record: item });
  } catch (err: any) {
    console.error('API /api/history POST error:', err);
    return res.status(500).json({ success: false, error: err?.message });
  }
});

// 6. Відгуки та коментарі (Reviews)
apiRouter.get('/api/reviews', async (req: Request, res: Response) => {
  try {
    const mediaItemId = req.query.mediaItemId as string;
    if (!mediaItemId) {
      return res.status(400).json({ success: false, error: 'mediaItemId is required' });
    }

    const dbActive = await isDatabaseAvailable();
    const prisma = getPrismaClient();

    if (dbActive && prisma) {
      const reviews = await prisma.review.findMany({
        where: { mediaItemId },
        orderBy: { createdAt: 'desc' },
        take: 50
      });
      return res.json({ success: true, source: 'postgresql', reviews });
    }

    // Fallback
    const reviews = inMemoryReviews.get(mediaItemId) || [];
    return res.json({ success: true, source: 'fallback', reviews });
  } catch (err: any) {
    console.error('API /api/reviews GET error:', err);
    return res.status(500).json({ success: false, error: err?.message });
  }
});

apiRouter.post('/api/reviews', async (req: Request, res: Response) => {
  try {
    const { mediaItemId, userId, username = 'Гість', userAvatar = '', rating = 10, comment = '' } = req.body || {};
    if (!mediaItemId || !comment.trim()) {
      return res.status(400).json({ success: false, error: 'mediaItemId and comment are required' });
    }

    const dbActive = await isDatabaseAvailable();
    const prisma = getPrismaClient();

    if (dbActive && prisma) {
      const review = await prisma.review.create({
        data: {
          mediaItemId,
          userId: userId || null,
          username,
          userAvatar,
          rating: Number(rating) || 10,
          comment: comment.trim(),
          likes: 0
        }
      });
      return res.json({ success: true, source: 'postgresql', review });
    }

    // Fallback in-memory
    let list = inMemoryReviews.get(mediaItemId);
    if (!list) {
      list = [];
      inMemoryReviews.set(mediaItemId, list);
    }
    const newRev = {
      id: `rev-${Date.now()}`,
      mediaItemId,
      userId,
      username,
      userAvatar,
      rating: Number(rating) || 10,
      comment: comment.trim(),
      likes: 0,
      createdAt: new Date().toISOString()
    };
    list.unshift(newRev);

    return res.json({ success: true, source: 'fallback', review: newRev });
  } catch (err: any) {
    console.error('API /api/reviews POST error:', err);
    return res.status(500).json({ success: false, error: err?.message });
  }
});


// ==========================================
// WATCH PARTY REAL ROOMS API
// ==========================================
interface WatchPartyRoomStore {
  id: string;
  roomId: string;
  movieId: string;
  movieTitle: string;
  roomName: string;
  hostName: string;
  hostAvatar?: string;
  hostId?: string;
  createdAt: string;
  participantsCount: number;
  participants: Array<{ id: string; name: string; avatar: string; status: string; isHost?: boolean; role?: string }>;
  messages: Array<{ id: string; userName: string; userAvatar: string; timestamp: string; text: string; isHost?: boolean; isSystem?: boolean }>;
  movie?: any;
  chatEnabled?: boolean;
  everyoneControls?: boolean;
  autoplayEnabled?: boolean;
  groupAccess?: string;
  isPrivate?: boolean;
  playback?: {
    currentTime: number;
    isPlaying: boolean;
    quality?: string;
    isMuted?: boolean;
    volume?: number;
    updatedBy: string;
    updatedAt: number;
  };
  updatedAt?: number;
}

const activeWatchPartyRooms = new Map<string, WatchPartyRoomStore>();

function findWatchPartyRoom(roomId?: string): WatchPartyRoomStore | undefined {
  if (!roomId) return undefined;
  const clean = roomId.trim();
  const upper = clean.toUpperCase();
  for (const [key, r] of activeWatchPartyRooms.entries()) {
    if (key === clean || key.toUpperCase() === upper || r.roomId?.toUpperCase() === upper || r.id?.toUpperCase() === upper) {
      return r;
    }
  }
  return undefined;
}

// 1. Get all active rooms
apiRouter.get('/api/watchparty/rooms', (_req: Request, res: Response) => {
  const rooms = Array.from(activeWatchPartyRooms.values());
  return res.json({ success: true, count: rooms.length, rooms });
});

// 2. Get specific room by ID / Code
apiRouter.get('/api/watchparty/rooms/:id', async (req: Request, res: Response) => {
  try {
    const rawId = req.params.id;
    if (!rawId) {
      return res.status(400).json({ error: 'Room ID required' });
    }
    const cleanId = rawId.trim();
    const cleanIdUpper = cleanId.toUpperCase();

    // Look for existing registered room
    for (const [key, room] of activeWatchPartyRooms.entries()) {
      if (key === cleanId || key.toUpperCase() === cleanIdUpper || room.roomId?.toUpperCase() === cleanIdUpper) {
        return res.json({ success: true, room });
      }
    }

    // Dynamic resolution: parse code keywords (e.g. "CN-SERIES-MALS-7280" -> "MALS")
    const parts = cleanIdUpper.split('-');
    const codeKeyword = parts.length >= 3 ? parts[parts.length - 2] : cleanIdUpper;

    let matchedMedia: any = null;

    // A. Check PostgreSQL database
    const dbActive = await isDatabaseAvailable();
    const prisma = dbActive ? getPrismaClient() : null;
    if (dbActive && prisma) {
      try {
        const items = await prisma.mediaItem.findMany({
          take: 100,
          include: { seasons: { include: { episodes: true } } }
        });
        matchedMedia = items.find(item => {
          const idClean = (item.id || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
          if (idClean.includes(codeKeyword) || cleanIdUpper.includes(idClean)) return true;
          if (codeKeyword === 'MALS' && (
            item.id?.includes('mal_') ||
            item.title?.toLowerCase().includes('неосяжн') ||
            item.titleEn?.toLowerCase().includes('grand blue')
          )) return true;
          return false;
        });
        if (matchedMedia) {
          matchedMedia = formatMediaItem(matchedMedia);
        }
      } catch (e) {
        console.warn('DB lookup for watchparty media failed:', e);
      }
    }

    // B. Check fallbackMediaMap
    if (!matchedMedia) {
      for (const m of allFallbackMedia) {
        const idClean = (m.id || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
        if (idClean.includes(codeKeyword) || cleanIdUpper.includes(idClean)) {
          matchedMedia = m;
          break;
        }
        if ((codeKeyword.startsWith('MAL') || cleanIdUpper.includes('MAL') || cleanIdUpper.includes('NEOSYAZH')) && (
          m.id?.includes('mal_') ||
          m.title?.toLowerCase().includes('неосяжн') ||
          (m.titleEn && m.titleEn.toLowerCase().includes('grand blue'))
        )) {
          matchedMedia = m;
          break;
        }
      }
    }

    // Explicit fallback for Grand Blue Season 3 (MALS / MALSE)
    if (!matchedMedia && (codeKeyword.startsWith('MAL') || cleanIdUpper.includes('MAL') || cleanIdUpper.includes('NEOSYAZH') || cleanIdUpper.includes('GRANDBLUE'))) {
      matchedMedia = {
        id: 'mal_season_grand_blue_3',
        title: 'Неосяжний океан: 3 Сезон',
        titleEn: 'Grand Blue Season 3',
        originalTitle: 'ぐらんぶる 3',
        type: 'series',
        year: 2026,
        duration: '12 серій',
        rating: 8.4,
        ratingVotesCount: '15K',
        ageRating: '16+',
        description: 'Third season of Grand Blue.',
        descriptionEn: 'Third season of Grand Blue.',
        posterUrl: 'https://cdn.myanimelist.net/images/anime/1105/145459l.jpg',
        backdropUrl: 'https://cdn.myanimelist.net/images/anime/1105/145459l.jpg',
        genres: ['Комедія', 'Аніме'],
        videoUrl: ''
      };
    }

    if (matchedMedia) {
      const newRoom: WatchPartyRoomStore = {
        id: cleanId,
        roomId: cleanId,
        movieId: matchedMedia.id,
        movieTitle: matchedMedia.title,
        roomName: `${matchedMedia.title} Party`,
        hostName: '',
        createdAt: new Date().toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' }) + ', ' + new Date().toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit' }),
        participantsCount: 0,
        participants: [],
        messages: [
          {
            id: `sys-${Date.now()}`,
            userName: 'Cinema Nova',
            userAvatar: '/favicon.ico',
            timestamp: new Date().toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' }),
            text: `Кімнату для «${matchedMedia.title}» підключено. Код кімнати: ${cleanId}`,
            isSystem: true
          }
        ],
        movie: matchedMedia,
        chatEnabled: true,
        everyoneControls: false,
        autoplayEnabled: true,
        groupAccess: 'Тільки друзі',
        isPrivate: false,
        updatedAt: Date.now()
      };
      activeWatchPartyRooms.set(cleanId, newRoom);
      return res.json({ success: true, room: newRoom });
    }

    // NEVER return Dune for an unknown code! Return 404!
    return res.status(404).json({ error: 'Room not found for provided code', code: cleanId });
  } catch (err: any) {
    console.error('API /api/watchparty/rooms/:id error:', err);
    return res.status(500).json({ error: err?.message });
  }
});

// 3. Create or register room
apiRouter.post('/api/watchparty/rooms', (req: Request, res: Response) => {
  try {
    const roomData = req.body;
    if (!roomData || (!roomData.id && !roomData.roomId)) {
      return res.status(400).json({ error: 'Room id required' });
    }
    const roomId = roomData.id || roomData.roomId;
    const existing = activeWatchPartyRooms.get(roomId) || {} as WatchPartyRoomStore;
    const merged: WatchPartyRoomStore = {
      ...existing,
      ...roomData,
      id: roomId,
      roomId: roomId,
      updatedAt: Date.now()
    };
    activeWatchPartyRooms.set(roomId, merged);
    return res.json({ success: true, room: merged });
  } catch (err: any) {
    console.error('API /api/watchparty/rooms POST error:', err);
    return res.status(500).json({ error: err?.message });
  }
});

// 4. Send message to room
apiRouter.post('/api/watchparty/rooms/:id/messages', (req: Request, res: Response) => {
  try {
    const rawId = req.params.id;
    if (!rawId) {
      return res.status(400).json({ error: 'RoomId required' });
    }
    const rawMsg = req.body.message || req.body;
    if (!rawMsg || (!rawMsg.text && !rawMsg.content)) {
      return res.status(400).json({ error: 'Message text required' });
    }
    let room = findWatchPartyRoom(rawId);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }
    if (!room.messages) room.messages = [];
    const formattedMsg = {
      id: rawMsg.id || `msg-${Date.now()}`,
      userName: rawMsg.userName || rawMsg.senderName || rawMsg.sender || 'Користувач',
      userAvatar: rawMsg.userAvatar || rawMsg.senderAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      timestamp: rawMsg.timestamp || rawMsg.time || new Date().toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' }),
      text: rawMsg.text || rawMsg.content,
      isHost: Boolean(rawMsg.isHost),
      isSystem: Boolean(rawMsg.isSystem)
    };
    room.messages.push(formattedMsg);
    room.updatedAt = Date.now();
    return res.json({ success: true, messages: room.messages, message: formattedMsg });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message });
  }
});

// 4b. Delete / Clear room messages
apiRouter.delete('/api/watchparty/rooms/:id/messages', (req: Request, res: Response) => {
  try {
    const rawId = req.params.id;
    let room = findWatchPartyRoom(rawId);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }
    const nowTime = new Date().toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });
    room.messages = [
      {
        id: 'sys-' + Date.now(),
        userName: 'CinemaNova',
        userAvatar: '/favicon.ico',
        timestamp: nowTime,
        text: '🧹 Організатор кімнати очистив чат.',
        isSystem: true
      }
    ];
    room.updatedAt = Date.now();
    return res.json({ success: true, messages: room.messages });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message });
  }
});

// 5. Join / update participant in room
apiRouter.post('/api/watchparty/rooms/:id/participants', (req: Request, res: Response) => {
  try {
    const roomId = req.params.id;
    const { participant } = req.body;
    if (!roomId || !participant) {
      return res.status(400).json({ error: 'RoomId and participant required' });
    }
    const room = findWatchPartyRoom(roomId);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }
    if (!room.participants) room.participants = [];
    room.participants = room.participants.filter(p => p && p.id !== 'host-1' && p.name !== 'Організатор' && !String(p.id).startsWith('host-'));
    
    if (!room.hostName && participant.isHost) {
      room.hostName = participant.name;
      room.hostId = participant.id;
    }

    // Only actual creator is host
    const isRoomHost = Boolean(
      (room.hostId && participant.id && String(room.hostId) === String(participant.id)) ||
      (room.hostName && participant.name && room.hostName.toLowerCase() === participant.name.toLowerCase()) ||
      (!room.hostName && participant.isHost)
    );

    const existingIdx = room.participants.findIndex(p => p.id === participant.id || (p.name && participant.name && p.name.toLowerCase() === participant.name.toLowerCase()));
    const existing = existingIdx >= 0 ? room.participants[existingIdx] : null;
    const assignedRole = isRoomHost 
      ? 'Організатор' 
      : (participant.role && participant.role !== 'Учасник' ? participant.role : (existing?.role || participant.role || 'Учасник'));

    const safeParticipant = {
      ...participant,
      isHost: isRoomHost,
      role: assignedRole
    };

    if (existingIdx >= 0) {
      room.participants[existingIdx] = { ...room.participants[existingIdx], ...safeParticipant };
    } else {
      room.participants.push(safeParticipant);
    }
    room.participantsCount = room.participants.length;
    room.updatedAt = Date.now();
    return res.json({ success: true, participants: room.participants });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message });
  }
});

// 5b. Update participant role (Host grants 'Керуючий' / 'Модератор' or revokes back to 'Учасник')
apiRouter.post('/api/watchparty/rooms/:id/participants/role', (req: Request, res: Response) => {
  try {
    const roomId = req.params.id;
    const { participantId, role } = req.body;
    if (!roomId || !participantId) {
      return res.status(400).json({ error: 'RoomId and participantId required' });
    }
    const room = findWatchPartyRoom(roomId);
    if (!room) return res.status(404).json({ error: 'Room not found' });
    if (!room.participants) room.participants = [];
    const p = room.participants.find(p => p.id === participantId || p.name === participantId);
    if (p) {
      p.role = role || 'Учасник';
      room.updatedAt = Date.now();
    }
    return res.json({ success: true, participants: room.participants });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message });
  }
});

// 5c. Remove participant from room
apiRouter.delete('/api/watchparty/rooms/:id/participants/:participantId', (req: Request, res: Response) => {
  try {
    const roomId = req.params.id;
    const participantId = req.params.participantId;
    const room = findWatchPartyRoom(roomId);
    if (!room) return res.status(404).json({ error: 'Room not found' });
    if (room.participants) {
      room.participants = room.participants.filter(p => p.id !== participantId && p.name !== participantId);
      room.participantsCount = room.participants.length;
      room.updatedAt = Date.now();
    }
    return res.json({ success: true, participants: room.participants });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message });
  }
});

// 6. Update room playback state (play/pause, seek, quality, mute/volume)
apiRouter.post('/api/watchparty/rooms/:id/playback', (req: Request, res: Response) => {
  try {
    const roomId = req.params.id;
    const { currentTime, isPlaying, quality, isMuted, volume, updatedBy } = req.body;
    if (!roomId) {
      return res.status(400).json({ error: 'Room ID required' });
    }
    let room = activeWatchPartyRooms.get(roomId);
    if (!room) {
      for (const [key, r] of activeWatchPartyRooms.entries()) {
        if (key.toUpperCase() === roomId.toUpperCase() || r.roomId?.toUpperCase() === roomId.toUpperCase()) {
          room = r;
          break;
        }
      }
    }
    if (!room) {
      room = {
        id: roomId,
        roomId: roomId,
        movieTitle: 'Watch Party',
        movieId: '',
        roomName: 'Watch Party',
        hostName: updatedBy || 'Host',
        createdAt: new Date().toISOString(),
        participantsCount: 1,
        participants: [],
        messages: []
      };
      activeWatchPartyRooms.set(roomId, room);
    }

    room.playback = {
      currentTime: typeof currentTime === 'number' ? currentTime : (room.playback?.currentTime || 0),
      isPlaying: typeof isPlaying === 'boolean' ? isPlaying : (room.playback?.isPlaying ?? true),
      quality: quality || room.playback?.quality || '1080p',
      isMuted: typeof isMuted === 'boolean' ? isMuted : (room.playback?.isMuted ?? false),
      volume: typeof volume === 'number' ? volume : (room.playback?.volume ?? 80),
      updatedBy: updatedBy || 'user',
      updatedAt: Date.now()
    };
    room.updatedAt = Date.now();
    return res.json({ success: true, playback: room.playback });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message });
  }
});

// 7. Update room settings (chatEnabled, everyoneControls, autoplayEnabled)
apiRouter.post('/api/watchparty/rooms/:id/settings', (req: Request, res: Response) => {
  try {
    const roomId = req.params.id;
    const { chatEnabled, everyoneControls, autoplayEnabled } = req.body;
    if (!roomId) {
      return res.status(400).json({ error: 'Room ID required' });
    }
    let room = activeWatchPartyRooms.get(roomId);
    if (!room) {
      for (const [key, r] of activeWatchPartyRooms.entries()) {
        if (key.toUpperCase() === roomId.toUpperCase() || r.roomId?.toUpperCase() === roomId.toUpperCase()) {
          room = r;
          break;
        }
      }
    }
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }
    if (typeof chatEnabled === 'boolean') room.chatEnabled = chatEnabled;
    if (typeof everyoneControls === 'boolean') room.everyoneControls = everyoneControls;
    if (typeof autoplayEnabled === 'boolean') room.autoplayEnabled = autoplayEnabled;
    room.updatedAt = Date.now();
    return res.json({ success: true, room });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message });
  }
});

// 8. Clear room chat
apiRouter.post('/api/watchparty/rooms/:id/clear-chat', (req: Request, res: Response) => {
  try {
    const roomId = req.params.id;
    const { clearedBy } = req.body;
    let room = activeWatchPartyRooms.get(roomId);
    if (!room) {
      for (const [key, r] of activeWatchPartyRooms.entries()) {
        if (key.toUpperCase() === roomId.toUpperCase() || r.roomId?.toUpperCase() === roomId.toUpperCase()) {
          room = r;
          break;
        }
      }
    }
    if (room) {
      const nowTime = new Date().toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });
      room.messages = [
        {
          id: 'sys-' + Date.now(),
          userName: 'Cinema Nova',
          userAvatar: '/favicon.ico',
          timestamp: nowTime,
          text: '🧹 ' + (clearedBy || 'Організатор') + ' очистив чат.',
          isSystem: true
        }
      ];
      room.updatedAt = Date.now();
    }
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message });
  }
});

