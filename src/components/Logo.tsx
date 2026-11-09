import React from 'react';

interface LogoProps {
  onClick?: () => void;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({ onClick, size = 'md', className = '' }) => {
  const heightClass = size === 'sm' ? 'h-7' : size === 'lg' ? 'h-10 sm:h-12' : 'h-8 sm:h-9';

  return (
    <div 
      onClick={onClick} 
      className={`flex items-center gap-3 select-none ${onClick ? 'cursor-pointer group' : ''} ${className}`}
    >
      <img 
        src="/logo/logo.png" 
        alt="CINEMA NOVA" 
        className={`${heightClass} w-auto object-contain transition-transform group-hover:scale-105`} 
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).src = '/logo/logo.svg';
        }}
      />
    </div>
  );
};

export default Logo;
