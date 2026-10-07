import React from 'react';

interface HabyEduProLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'full' | 'compact' | 'icon';
  theme?: 'light' | 'dark';
  showDomain?: boolean;
  className?: string;
}

export const HabyEduProLogo: React.FC<HabyEduProLogoProps> = ({
  size = 'md',
  variant = 'full',
  theme = 'light',
  showDomain = true,
  className = ''
}) => {
  // Dimension mappings
  const dimensions = {
    sm: { iconWidth: 32, iconHeight: 38, textClass: 'text-base', domainClass: 'text-[9px]' },
    md: { iconWidth: 42, iconHeight: 50, textClass: 'text-xl', domainClass: 'text-[11px]' },
    lg: { iconWidth: 56, iconHeight: 66, textClass: 'text-2xl sm:text-3xl', domainClass: 'text-xs' },
    xl: { iconWidth: 74, iconHeight: 88, textClass: 'text-4xl', domainClass: 'text-sm' }
  }[size];

  const textColor = theme === 'dark' ? 'text-white' : 'text-[#0f2948]';
  const eduColor = theme === 'dark' ? 'text-blue-300' : 'text-[#163765]';
  const proColor = theme === 'dark' ? 'text-amber-400' : 'text-[#102b4e]';
  const domainColor = theme === 'dark' ? 'text-amber-300' : 'text-amber-500';

  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      {/* 3D Mortarboard Cap + Tech H Vector Icon */}
      <svg
        width={dimensions.iconWidth}
        height={dimensions.iconHeight}
        viewBox="0 0 160 190"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0 drop-shadow-md"
      >
        <defs>
          <linearGradient id="logoBlueGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#2563eb" />
            <stop offset="45%" stopColor="#1d4ed8" />
            <stop offset="100%" stopColor="#0f2948" />
          </linearGradient>
          <linearGradient id="logoGoldCap" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fde047" />
            <stop offset="50%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#d97706" />
          </linearGradient>
          <filter id="logoShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="1" dy="3" stdDeviation="2" floodColor="#0a192f" floodOpacity="0.4" />
          </filter>
        </defs>

        <g filter="url(#logoShadow)">
          {/* Left Stem of H */}
          <path
            d="M 32 60 L 56 60 L 56 168 L 32 168 Z"
            fill="url(#logoBlueGrad)"
            stroke="#1e40af"
            strokeWidth="1.5"
          />
          {/* Left Stem 3D Bevel */}
          <path d="M 56 60 L 61 64 L 61 172 L 56 168 Z" fill="#0c1e38" />

          {/* Crossbar of H */}
          <path
            d="M 56 102 L 96 102 L 96 128 L 56 128 Z"
            fill="#1e3a8a"
            stroke="#1d4ed8"
            strokeWidth="1"
          />

          {/* Right Stem of H */}
          <path
            d="M 96 60 L 120 60 L 120 168 L 96 168 Z"
            fill="url(#logoBlueGrad)"
            stroke="#1e40af"
            strokeWidth="1.5"
          />
          {/* Right Stem 3D Bevel */}
          <path d="M 120 60 L 125 64 L 125 172 L 120 168 Z" fill="#0c1e38" />

          {/* Gold Circuit Traces */}
          <g stroke="#facc15" strokeWidth="2.2" strokeLinecap="round" fill="none">
            <path d="M 44 148 L 44 106 L 50 100 L 50 82" />
            <circle cx="44" cy="148" r="2.8" fill="#fef08a" stroke="#ca8a04" strokeWidth="0.8" />
            <circle cx="50" cy="82" r="2.5" fill="#fef08a" stroke="#ca8a04" strokeWidth="0.8" />

            <path d="M 108 78 L 108 118 L 114 124 L 114 142" />
            <circle cx="108" cy="78" r="2.8" fill="#fef08a" stroke="#ca8a04" strokeWidth="0.8" />
            <circle cx="114" cy="142" r="2.5" fill="#fef08a" stroke="#ca8a04" strokeWidth="0.8" />
          </g>

          {/* Mortarboard Skullcap Collar */}
          <path d="M 50 62 C 50 53, 102 53, 102 62 L 98 70 C 98 74, 54 74, 54 70 Z" fill="#0a1b33" />

          {/* 3D Mortarboard Top (Gold Diamond) */}
          <polygon points="76,14 135,35 76,56 17,35" fill="#b45309" transform="translate(0, 5)" />
          <polygon points="76,12 135,33 76,54 17,33" fill="url(#logoGoldCap)" stroke="#fef08a" strokeWidth="1.2" />

          {/* Center Button & Tassel */}
          <ellipse cx="76" cy="33" rx="4.5" ry="2.5" fill="#fef08a" stroke="#ca8a04" strokeWidth="0.8" />
          <path d="M 76 34 Q 105 38 116 54 Q 119 65 117 78" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" />
          <ellipse cx="117" cy="80" rx="3" ry="5" fill="#f59e0b" stroke="#78350f" strokeWidth="0.7" />
        </g>
      </svg>

      {/* Typography: HabyEduPro + habyedupro.co.tz */}
      {variant !== 'icon' && (
        <div className="flex flex-col justify-center leading-none">
          <div className={`font-black tracking-tight ${dimensions.textClass} ${textColor} flex items-center`}>
            <span>Haby</span>
            <span className={eduColor}>Edu</span>
            <span className={proColor}>Pro</span>
          </div>

          {variant === 'full' && showDomain && (
            <div className={`font-bold tracking-wider ${dimensions.domainClass} ${domainColor} mt-0.5 font-mono`}>
              habyedupro.co.tz
            </div>
          )}
        </div>
      )}
    </div>
  );
};
