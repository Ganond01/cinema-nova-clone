import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { INITIAL_MOVIES, INITIAL_ROOMS } from '../src/data/movies';
import { ANIME_LIST } from '../src/data/animeData';
import { DORAMAS_LIST } from '../src/data/doramas';
import { Movie } from '../src/types';

const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
  console.error('❌ ПОМИЛКА: Змінна середовища DATABASE_URL не знайдена!');
  console.error('Будь ласка, вкажіть DATABASE_URL у файлі .env або передайте її в середовище.');
  process.exit(1);
}

// Приховуємо пароль у логах для безпеки
const sanitizedUrl = dbUrl.replace(/:([^:@]+)@/, ':****@');
console.log(`📡 Підключення до БД: ${sanitizedUrl}`);

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: dbUrl
    }
  }
});

async function main() {
  console.log('🚀 Початок наповнення бази даних Cinema Nova...');

  // Об'єднуємо всі медіа-елементи та дедуплікуємо за id
  const allMediaMap = new Map<string, Movie>();

  for (const m of INITIAL_MOVIES) {
    if (m && m.id) allMediaMap.set(m.id, m);
  }
  for (const a of ANIME_LIST) {
    if (a && a.id) allMediaMap.set(a.id, a);
  }
  for (const d of DORAMAS_LIST) {
    if (d && d.id) allMediaMap.set(d.id, d);
  }

  const allMedia = Array.from(allMediaMap.values());
  console.log(`📦 Знайдено ${allMedia.length} медіа-елементів для синхронізації...`);

  let mediaCount = 0;
  let seasonsCount = 0;
  let episodesCount = 0;

  for (const item of allMedia) {
    // Upsert медіа-запису
    await prisma.mediaItem.upsert({
      where: { id: item.id },
      update: {
        title: item.title,
        originalTitle: item.originalTitle || null,
        titleEn: item.titleEn || null,
        type: item.type || 'movie',
        year: item.year || 2024,
        duration: item.duration || '2 год',
        rating: item.rating || 0,
        ratingVotesCount: item.ratingVotesCount || '0',
        ageRating: item.ageRating || '16+',
        description: item.description || '',
        descriptionEn: item.descriptionEn || null,
        posterUrl: item.posterUrl || '',
        backdropUrl: item.backdropUrl || '',
        stills: item.stills || [],
        genres: item.genres || [],
        director: item.director || null,
        cast: item.cast ? (item.cast as any) : undefined,
        languages: item.languages || [],
        subtitles: item.subtitles || [],
        budget: item.budget || null,
        revenue: item.revenue || null,
        releaseDate: item.releaseDate || null,
        videoUrl: item.videoUrl || '',
        trailerUrl: item.trailerUrl || null,
        trailerEmbedUrl: item.trailerEmbedUrl || null,
        trailerEmbedUrlUa: item.trailerEmbedUrlUa || null,
        trailerEmbedUrlEn: item.trailerEmbedUrlEn || null,
        isPopular: !!item.isPopular,
        isNew: !!item.isNew,
        isTrending: !!item.isTrending,
        quality: item.quality || '4K',
        viewsCount: item.viewsCount || 0,
        myAnimeListUrl: item.myAnimeListUrl || null,
        whisperSubtitles: item.whisperSubtitles ? (item.whisperSubtitles as any) : undefined,
        subtitleUrl: item.subtitleUrl || null,
        qualities: item.qualities ? (item.qualities as any) : undefined,
        videoSources: item.videoSources ? (item.videoSources as any) : undefined,
      },
      create: {
        id: item.id,
        title: item.title,
        originalTitle: item.originalTitle || null,
        titleEn: item.titleEn || null,
        type: item.type || 'movie',
        year: item.year || 2024,
        duration: item.duration || '2 год',
        rating: item.rating || 0,
        ratingVotesCount: item.ratingVotesCount || '0',
        ageRating: item.ageRating || '16+',
        description: item.description || '',
        descriptionEn: item.descriptionEn || null,
        posterUrl: item.posterUrl || '',
        backdropUrl: item.backdropUrl || '',
        stills: item.stills || [],
        genres: item.genres || [],
        director: item.director || null,
        cast: item.cast ? (item.cast as any) : undefined,
        languages: item.languages || [],
        subtitles: item.subtitles || [],
        budget: item.budget || null,
        revenue: item.revenue || null,
        releaseDate: item.releaseDate || null,
        videoUrl: item.videoUrl || '',
        trailerUrl: item.trailerUrl || null,
        trailerEmbedUrl: item.trailerEmbedUrl || null,
        trailerEmbedUrlUa: item.trailerEmbedUrlUa || null,
        trailerEmbedUrlEn: item.trailerEmbedUrlEn || null,
        isPopular: !!item.isPopular,
        isNew: !!item.isNew,
        isTrending: !!item.isTrending,
        quality: item.quality || '4K',
        viewsCount: item.viewsCount || 0,
        myAnimeListUrl: item.myAnimeListUrl || null,
        whisperSubtitles: item.whisperSubtitles ? (item.whisperSubtitles as any) : undefined,
        subtitleUrl: item.subtitleUrl || null,
        qualities: item.qualities ? (item.qualities as any) : undefined,
        videoSources: item.videoSources ? (item.videoSources as any) : undefined,
      }
    });
    mediaCount++;

    // Якщо є дані сезонів та серій
    if (item.seasonsData && Array.isArray(item.seasonsData)) {
      for (const season of item.seasonsData) {
        const seasonRecord = await prisma.season.upsert({
          where: {
            mediaItemId_seasonNumber: {
              mediaItemId: item.id,
              seasonNumber: season.seasonNumber
            }
          },
          update: {
            title: season.title || null
          },
          create: {
            mediaItemId: item.id,
            seasonNumber: season.seasonNumber,
            title: season.title || null
          }
        });
        seasonsCount++;

        if (season.episodes && Array.isArray(season.episodes)) {
          for (const ep of season.episodes) {
            await prisma.episode.create({
              data: {
                seasonId: seasonRecord.id,
                number: ep.number,
                title: ep.title,
                duration: ep.duration || null,
                videoUrl: ep.videoUrl || null,
                description: ep.description || null,
                thumbnailUrl: ep.thumbnailUrl || null,
                qualities: ep.qualities ? (ep.qualities as any) : undefined,
                videoSources: ep.videoSources ? (ep.videoSources as any) : undefined,
                subtitleUrl: ep.subtitleUrl || null,
                whisperSubtitles: ep.whisperSubtitles ? (ep.whisperSubtitles as any) : undefined
              }
            });
            episodesCount++;
          }
        }
      }
    }
  }

  // Початкові кімнати для Watch Party
  let watchPartyCount = 0;
  for (const wp of INITIAL_ROOMS) {
    await prisma.watchPartyRoom.upsert({
      where: { id: wp.id },
      update: {
        roomName: wp.roomName,
        movieId: wp.movieId,
        movieTitle: wp.movieTitle,
        participantsCount: wp.participantsCount,
        isPlaying: wp.isPlaying,
        currentTime: wp.currentTime,
        duration: wp.duration,
        code: wp.code || null
      },
      create: {
        id: wp.id,
        roomName: wp.roomName,
        movieId: wp.movieId,
        movieTitle: wp.movieTitle,
        participantsCount: wp.participantsCount,
        isPlaying: wp.isPlaying,
        currentTime: wp.currentTime,
        duration: wp.duration,
        code: wp.code || null
      }
    });
    watchPartyCount++;
  }

  console.log('✅ Наповнення бази даних успішно завершено:');
  console.log(`   - Медіа-елементів: ${mediaCount}`);
  console.log(`   - Сезонів: ${seasonsCount}`);
  console.log(`   - Серій: ${episodesCount}`);
  console.log(`   - Кімнат Watch Party: ${watchPartyCount}`);
}

main()
  .catch((e) => {
    console.error('❌ Помилка під час наповнення БД:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
