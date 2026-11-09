-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "plan" TEXT NOT NULL DEFAULT 'Standard',
    "favoriteGenres" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "role" TEXT NOT NULL DEFAULT 'user',
    "password" TEXT,
    "handle" TEXT,
    "birthDate" TEXT,
    "gender" TEXT,
    "location" TEXT,
    "aboutMe" TEXT,
    "googleConnected" BOOLEAN NOT NULL DEFAULT false,
    "facebookConnected" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media_items" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "originalTitle" TEXT,
    "titleEn" TEXT,
    "type" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "duration" TEXT NOT NULL,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ratingVotesCount" TEXT NOT NULL DEFAULT '0',
    "ageRating" TEXT NOT NULL DEFAULT '16+',
    "description" TEXT NOT NULL,
    "descriptionEn" TEXT,
    "posterUrl" TEXT NOT NULL,
    "backdropUrl" TEXT NOT NULL,
    "stills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "genres" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "director" TEXT,
    "cast" JSONB,
    "languages" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "subtitles" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "budget" TEXT,
    "revenue" TEXT,
    "releaseDate" TEXT,
    "videoUrl" TEXT NOT NULL,
    "trailerUrl" TEXT,
    "trailerEmbedUrl" TEXT,
    "trailerEmbedUrlUa" TEXT,
    "trailerEmbedUrlEn" TEXT,
    "isPopular" BOOLEAN NOT NULL DEFAULT false,
    "isNew" BOOLEAN NOT NULL DEFAULT false,
    "isTrending" BOOLEAN NOT NULL DEFAULT false,
    "quality" TEXT DEFAULT '4K',
    "viewsCount" INTEGER NOT NULL DEFAULT 0,
    "myAnimeListUrl" TEXT,
    "whisperSubtitles" JSONB,
    "subtitleUrl" TEXT,
    "qualities" JSONB,
    "videoSources" JSONB,
    "conversionStatus" TEXT DEFAULT 'idle',
    "conversionProgress" INTEGER DEFAULT 0,
    "transcriptionStatus" TEXT DEFAULT 'idle',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "media_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seasons" (
    "id" TEXT NOT NULL,
    "mediaItemId" TEXT NOT NULL,
    "seasonNumber" INTEGER NOT NULL,
    "title" TEXT,

    CONSTRAINT "seasons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "episodes" (
    "id" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "duration" TEXT,
    "videoUrl" TEXT,
    "description" TEXT,
    "thumbnailUrl" TEXT,
    "qualities" JSONB,
    "videoSources" JSONB,
    "subtitleUrl" TEXT,
    "whisperSubtitles" JSONB,

    CONSTRAINT "episodes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "favorites" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mediaItemId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "favorites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "watch_history" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mediaItemId" TEXT NOT NULL,
    "movieTitle" TEXT,
    "progressPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "watchedMinutes" INTEGER DEFAULT 0,
    "totalMinutes" INTEGER DEFAULT 0,
    "currentEpisode" TEXT,
    "watchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "watch_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" TEXT NOT NULL,
    "mediaItemId" TEXT NOT NULL,
    "userId" TEXT,
    "username" TEXT NOT NULL,
    "userAvatar" TEXT NOT NULL,
    "rating" DOUBLE PRECISION NOT NULL,
    "comment" TEXT NOT NULL,
    "likes" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "watch_party_rooms" (
    "id" TEXT NOT NULL,
    "roomName" TEXT NOT NULL,
    "movieId" TEXT NOT NULL,
    "movieTitle" TEXT NOT NULL,
    "participantsCount" INTEGER NOT NULL DEFAULT 1,
    "isPlaying" BOOLEAN NOT NULL DEFAULT false,
    "currentTime" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "duration" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "code" TEXT,
    "hostId" TEXT,
    "hostName" TEXT,
    "chatEnabled" BOOLEAN NOT NULL DEFAULT true,
    "everyoneControls" BOOLEAN NOT NULL DEFAULT true,
    "autoplayEnabled" BOOLEAN NOT NULL DEFAULT false,
    "isPrivate" BOOLEAN NOT NULL DEFAULT false,
    "maxParticipants" TEXT DEFAULT '10',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "watch_party_rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_messages" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "senderName" TEXT NOT NULL,
    "senderAvatar" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "timestamp" TEXT NOT NULL,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "recipientId" TEXT,
    "senderId" TEXT,
    "senderName" TEXT,
    "senderAvatar" TEXT,
    "senderEmail" TEXT,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "titleEn" TEXT,
    "desc" TEXT NOT NULL,
    "descEn" TEXT,
    "unread" BOOLEAN NOT NULL DEFAULT true,
    "time" TEXT NOT NULL,
    "timeEn" TEXT,
    "status" TEXT DEFAULT 'pending',
    "posterUrl" TEXT,
    "iconType" TEXT,
    "data" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "custom_lists" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "movieIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "custom_lists_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_handle_key" ON "users"("handle");

-- CreateIndex
CREATE UNIQUE INDEX "seasons_mediaItemId_seasonNumber_key" ON "seasons"("mediaItemId", "seasonNumber");

-- CreateIndex
CREATE UNIQUE INDEX "favorites_userId_mediaItemId_key" ON "favorites"("userId", "mediaItemId");

-- CreateIndex
CREATE UNIQUE INDEX "watch_history_userId_mediaItemId_key" ON "watch_history"("userId", "mediaItemId");

-- CreateIndex
CREATE UNIQUE INDEX "watch_party_rooms_code_key" ON "watch_party_rooms"("code");

-- AddForeignKey
ALTER TABLE "seasons" ADD CONSTRAINT "seasons_mediaItemId_fkey" FOREIGN KEY ("mediaItemId") REFERENCES "media_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "episodes" ADD CONSTRAINT "episodes_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "seasons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_mediaItemId_fkey" FOREIGN KEY ("mediaItemId") REFERENCES "media_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "watch_history" ADD CONSTRAINT "watch_history_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "watch_history" ADD CONSTRAINT "watch_history_mediaItemId_fkey" FOREIGN KEY ("mediaItemId") REFERENCES "media_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_mediaItemId_fkey" FOREIGN KEY ("mediaItemId") REFERENCES "media_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "watch_party_rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_lists" ADD CONSTRAINT "custom_lists_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

