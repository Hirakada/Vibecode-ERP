import React from 'react';

interface CaozyLogoProps {
  variant?: 'wordmark' | 'icon' | 'badge';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  theme?: 'dark' | 'light';
  className?: string;
  showText?: boolean;
}

export const CaozyLogo: React.FC<CaozyLogoProps> = ({
  variant = 'wordmark',
  size = 'md',
  theme = 'dark',
  className = '',
  showText = true,
}) => {
  // Height presets
  const heightClasses = {
    sm: 'h-6',
    md: 'h-8',
    lg: 'h-10',
    xl: 'h-14',
  };

  const iconSizes = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-10 h-10',
    xl: 'w-14 h-14',
  };

  if (variant === 'icon') {
    return (
      <div className={`relative inline-flex items-center justify-center shrink-0 ${iconSizes[size]} ${className}`}>
        <img
          src="/assets/aistudio/Icon_106903f9.svg"
          alt="Caozy Logo Icon"
          className="w-full h-full object-contain filter drop-shadow-xs"
        />
      </div>
    );
  }

  if (variant === 'badge') {
    return (
      <div className={`inline-flex items-center gap-2 ${className}`}>
        <div className={`relative ${iconSizes[size]} shrink-0 rounded-xl bg-[#232529] p-1 border border-[#b6d333]/30 shadow-xs`}>
          <img
            src="/assets/aistudio/Icon_106903f9.svg"
            alt="Caozy Icon"
            className="w-full h-full object-contain"
          />
        </div>
        {showText && (
          <div className="flex flex-col">
            <span className="font-black text-sm tracking-wider text-white flex items-center gap-1.5">
              <span>caozy</span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#b6d333]" />
            </span>
            <span className="text-[10px] text-stone-400 font-semibold tracking-wide uppercase">
              Beverage & Coffee
            </span>
          </div>
        )}
      </div>
    );
  }

  // Default: Wordmark
  const wordmarkSrc = theme === 'light'
    ? '/assets/aistudio/Wordmark_ed2f6a03.svg'
    : '/assets/aistudio/Wordmark_light.svg';

  return (
    <div className={`inline-flex items-center shrink-0 ${className}`}>
      <img
        src={wordmarkSrc}
        alt="Caozy"
        className={`${heightClasses[size]} w-auto object-contain`}
      />
    </div>
  );
};
