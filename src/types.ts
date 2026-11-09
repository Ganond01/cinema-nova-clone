/**
 * Types definition for CINEMA NOVA platform
 */

export interface CastMember {
  name: string;
  role: string;
  avatarUrl: string;
}

export interface Review {
  id: string;
  username: string;
  userAvatar: string;
  rating: number;
  comment: string;
  createdAt: string;
  likes?: number;
}

export interface EpisodeItem {
  number: number;
  title: string;
  duration?: string;
  videoUrl?: string;
  description?: string;
  thumbnailUrl?: string;
  qualities?: MovieQuality[];
  sources?: Record<string, string>;
  videoSources?: Record<string, string>;
  subtitleUrl?: string;
  whisperSubtitles?: Array<{ start_seconds: number; end_seconds: number; text: string; en?: string }>;
}

export interface SeasonItem {
  seasonNumber: number;
  title?: string;
  episodes: EpisodeItem[];
}

export interface MovieQuality {
  resolution: '4K' | '1080p' | '720p' | '480p';
  url: string;
  bitrate?: string;
}

export interface Movie {
  id: string;
  title: string;
  originalTitle?: string;
  type: 'movie' | 'series' | 'anime' | 'dorama';
  year: number;
  duration: string;
  rating: number;
  ratingVotesCount: string;
  ageRating: string;
  description: string;
  titleEn?: string;
  descriptionEn?: string;
  posterUrl: string;
  backdropUrl: string;
  stills?: string[];
  genres: string[];
  director?: string;
  cast?: CastMember[];
  languages?: string[];
  subtitles?: string[];
  budget?: string;
  revenue?: string;
  releaseDate?: string;
  videoUrl: string; // Video player source (we will provide high-quality mock video stream or visual effects)
  trailerUrl?: string; // YouTube or direct trailer link
  trailerEmbedUrl?: string; // Embedded video
  trailerEmbedUrlUa?: string; // Embedded Ukrainian trailer
  trailerEmbedUrlEn?: string; // Embedded English trailer
  isPopular?: boolean;
  isNew?: boolean;
  isTrending?: boolean;
  quality?: string;
  matchPercentage?: number;
  viewsCount: number;
  myAnimeListUrl?: string;
  reviews?: Review[];
  seasonsData?: SeasonItem[];
  episodesData?: Record<number, EpisodeItem[]>;
  whisperSubtitles?: Array<{ start_seconds: number; end_seconds: number; text: string; en?: string }>;
  subtitleUrl?: string;
  qualities?: MovieQuality[];
  videoSources?: Record<string, string>;
  conversionStatus?: 'idle' | 'converting' | 'completed' | 'failed';
  conversionProgress?: number;
  transcriptionStatus?: 'idle' | 'processing' | 'completed' | 'failed';
}

export interface HistoryItem {
  movieId: string;
  movieTitle?: string;
  watchedAt: string;
  progressPercent: number; // 0 to 100
  watchedMinutes?: number;
  totalMinutes?: number;
  currentEpisode?: string; // for series
}

export interface Friend {
  id: string;
  name: string;
  email: string;
  avatarUrl: string;
  handle?: string;
  status?: 'online' | 'watching' | 'offline';
  currentlyWatching?: string;
  addedAt?: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatarUrl: string;
  plan: 'Standard' | 'Premium' | 'VIP';
  favoriteGenres: string[];
  favorites: string[]; // List of movie IDs
  friends?: string[]; // List of friend user IDs or emails
  watchHistory: HistoryItem[];
  password?: string;
  role?: 'admin' | 'user';
  joined?: string;
  handle?: string;
  birthDate?: string;
  gender?: string;
  location?: string;
  aboutMe?: string;
  watchPartyCount?: number;
  googleConnected?: boolean;
  facebookConnected?: boolean;
}

export interface ChatMessage {
  id: string;
  senderName: string;
  senderAvatar: string;
  text: string;
  timestamp: string;
  isSystem?: boolean;
}

export interface WatchPartyRoom {
  id: string;
  roomId?: string;
  roomName: string;
  movieId: string;
  movieTitle: string;
  participantsCount: number;
  messages: ChatMessage[];
  isPlaying: boolean;
  currentTime: number; // in seconds
  duration: number; // total duration in seconds
  code?: string;
  hostId?: string;
  hostName?: string;
  chatEnabled?: boolean;
  everyoneCanControl?: boolean;
  everyoneControls?: boolean;
  autoplayEnabled?: boolean;
  groupAccess?: string; // 'Публічний' | 'Приватний'
  isPrivate?: boolean;
  invitedUserIds?: string[];
  maxParticipants?: string;
  createdAt?: string;
}

export interface AppNotification {
  id: string;
  recipientId?: string; // Target user's id or email
  senderId?: string; // Sender user's id
  senderName?: string;
  senderAvatar?: string;
  senderEmail?: string;
  type: 'friend_request' | 'party_invite' | 'party_joined' | 'system' | 'episode' | 'premiere' | 'download' | 'favorite' | 'profile_update';
  title: string;
  titleEn?: string;
  desc: string;
  descEn?: string;
  unread: boolean;
  time: string;
  timeEn?: string;
  createdAt: number;
  status?: 'pending' | 'accepted' | 'declined';
  posterUrl?: string;
  iconType?: 'download' | 'heart' | 'settings' | 'premiere';
  data?: {
    roomId?: string;
    roomCode?: string;
    movieTitle?: string;
    movieId?: string;
    quality?: string;
    episodeInfo?: string;
    targetUser?: any;
    [key: string]: any;
  };
}

export interface PlatformAnalytics {
  totalViews: number;
  totalWatchHours: number;
  activeWatchParties: number;
  activeUsers: number;
  revenueThisMonth: string;
  genreBreakdown: { genre: string; percentage: number }[];
  dailyViews: { date: string; views: number }[];
}

export type WatchStatus = 'watching' | 'completed' | 'planned' | 'on_hold' | 'dropped';

export interface CustomList {
  id: string;
  name: string;
  description: string;
  isPublic: boolean;
  movieIds: string[];
  userId?: string;
}

export interface DownloadItem {
  id: string;
  movieId: string;
  title: string;
  titleEn?: string;
  originalTitle?: string;
  type?: 'movie' | 'series' | 'anime' | 'dorama';
  episodeInfo?: string; // e.g. "1 сезон 6 серія", "8 сезон 10 серія"
  quality?: '4K' | '1080p' | '720p' | '480p';
  posterUrl: string;
  backdropUrl?: string;
  genres?: string[];
  year?: number;
  rating?: number;
  ageRating?: string;
  downloadedSizeGB: number;
  totalSizeGB: number;
  downloadSpeedMBs: number;
  progress: number; // 0 - 100
  status: 'downloading' | 'paused' | 'completed' | 'error';
  downloadedAt?: string;
}

