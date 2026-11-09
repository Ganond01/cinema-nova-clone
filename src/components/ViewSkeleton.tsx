import React from 'react';
import { Loader2 } from 'lucide-react';

interface ViewSkeletonProps {
  type?: 'grid' | 'details' | 'list' | 'generic';
  title?: string;
}

export const ViewSkeleton: React.FC<ViewSkeletonProps> = ({ type = 'grid', title }) => {
  if (type === 'generic') {
    return (
      <div className="flex flex-col items-center justify-center py-32 space-y-4 animate-fade-in">
        <div className="relative">
          <div className="w-12 h-12 rounded-full border-2 border-zinc-800 border-t-[#FF3040] animate-spin" />
          <div className="absolute inset-0 bg-[#FF3040]/10 rounded-full blur-md animate-pulse" />
        </div>
        <span className="text-xs uppercase font-bold tracking-widest text-zinc-400 font-mono">
          {title || 'Завантаження...'}
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 animate-pulse">
      {title && (
        <div className="space-y-2">
          <div className="w-48 h-8 rounded-lg bg-zinc-800/80" />
          <div className="w-96 h-4 rounded-md bg-zinc-800/50 max-w-full" />
        </div>
      )}
      
      {/* Сітка of Skeleton Картки */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => (
          <div 
            key={n} 
            className="aspect-[3/4.4] rounded-2xl bg-zinc-900/80 border border-white/5 relative overflow-hidden flex flex-col justify-end p-3"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
            <div className="space-y-2 relative z-10">
              <div className="w-3/4 h-3.5 rounded bg-zinc-800" />
              <div className="w-1/2 h-2.5 rounded bg-zinc-800/60" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ViewSkeleton;
