import React from 'react';
import { Sparkles } from 'lucide-react';
import Logo from './Logo';

interface HomePreloaderProps {
  fullscreen?: boolean;
}

export const HomePreloader: React.FC<HomePreloaderProps> = ({ fullscreen = false }) => {
  if (fullscreen) {
    return (
      <div 
        id="cinema-nova-page-preloader"
        className="fixed inset-0 z-50 bg-[#080808] flex flex-col items-center justify-center overflow-hidden select-none animate-fade-in"
      >
        {/* Ambient Red Glow Lights */}
        <div className="absolute w-96 h-96 bg-[#FF3040]/15 rounded-full blur-[120px] pointer-events-none -top-20 -left-20 animate-pulse" />
        <div className="absolute w-96 h-96 bg-[#FF3040]/10 rounded-full blur-[140px] pointer-events-none -bottom-20 -right-20 animate-pulse" />

        {/* Central Logo and Завантаження Animation */}
        <div className="relative z-10 flex flex-col items-center space-y-6">
          <div className="relative group">
            <div className="absolute -inset-4 bg-gradient-to-r from-[#FF3040]/30 to-[#E50914]/30 rounded-2xl blur-xl animate-pulse" />
            <Logo size="lg" className="relative drop-shadow-[0_0_25px_rgba(255,48,64,0.4)]" />
          </div>

          {/* Завантаження Track & Bar */}
          <div className="w-48 h-1 bg-zinc-800/80 rounded-full overflow-hidden relative shadow-inner">
            <div className="absolute top-0 bottom-0 left-0 w-1/2 bg-gradient-to-r from-[#FF3040] via-[#FF5566] to-[#E50914] rounded-full animate-[shimmer_1.5s_infinite_linear]" 
                 style={{
                   animation: 'nova-progress 1.5s cubic-bezier(0.4, 0, 0.2, 1) infinite'
                 }}
            />
          </div>

          <div className="flex items-center gap-2 text-zinc-400 text-xs font-mono tracking-widest uppercase">
            <Sparkles className="w-3.5 h-3.5 text-[#FF3040] animate-spin" style={{ animationDuration: '3s' }} />
            <span>Завантаження платформи...</span>
          </div>
        </div>

        <style>{`
          @keyframes nova-progress {
            0% { transform: translateX(-100%); }
            50% { transform: translateX(50%); }
            100% { transform: translateX(200%); }
          }
        `}</style>
      </div>
    );
  }

  // Realistic HomeView Skeleton Mockup during lazy Suspense fallback
  return (
    <div 
      id="home-view-skeleton" 
      className="space-y-8 pb-24 pl-1 md:pl-6 lg:pl-10 animate-pulse relative min-h-[80vh] select-none"
    >
      {/* 1. Hero Banner Skeleton */}
      <div className="w-full h-[440px] rounded-3xl bg-zinc-900/60 border border-white/5 relative overflow-hidden flex flex-col justify-end p-8 md:p-12 shadow-2xl">
        {/* Shimmer gradient effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
        
        <div className="max-w-xl space-y-4 relative z-10">
          <div className="w-24 h-6 rounded-full bg-zinc-800/80" />
          <div className="w-3/4 h-10 rounded-xl bg-zinc-800/90" />
          <div className="w-1/2 h-4 rounded-md bg-zinc-800/60" />
          <div className="w-full h-12 rounded-lg bg-zinc-800/40" />
          <div className="flex items-center gap-3 pt-2">
            <div className="w-32 h-11 rounded-xl bg-[#FF3040]/30" />
            <div className="w-32 h-11 rounded-xl bg-zinc-800/80" />
          </div>
        </div>
      </div>

      {/* 2. Continue Watching Carousel Skeleton */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-zinc-800" />
          <div className="w-40 h-5 rounded-md bg-zinc-800" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div 
              key={i} 
              className="aspect-[16/10] rounded-2xl bg-zinc-900/70 border border-white/5 relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
            </div>
          ))}
        </div>
      </div>

      {/* 3. New Releases Carousel Skeleton */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="w-48 h-6 rounded-md bg-zinc-800" />
          <div className="w-20 h-4 rounded-md bg-zinc-800/60" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div 
              key={i} 
              className="aspect-[3/4.4] rounded-2xl bg-zinc-900/70 border border-white/5 relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default HomePreloader;
