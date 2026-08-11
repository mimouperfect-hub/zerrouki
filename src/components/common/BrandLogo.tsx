import React from 'react';

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  textColor?: 'dark' | 'light';
}

export const BrandLogo: React.FC<BrandLogoProps> = ({ size = 'md', showText = true, textColor = 'dark' }) => {
  const dimensions = {
    sm: { box: 'w-10 h-10', text: 'text-sm' },
    md: { box: 'w-12 h-12', text: 'text-base' },
    lg: { box: 'w-20 h-20', text: 'text-2xl' },
    xl: { box: 'w-28 h-28', text: 'text-3xl' }
  }[size];

  const titleColor = textColor === 'light' ? 'text-white' : 'text-[#1E1B4B]';
  const subtitleColor = textColor === 'light' ? 'text-amber-200/90' : 'text-rose-800/80';

  return (
    <div className="flex items-center gap-3 select-none">
      <div className={`relative ${dimensions.box} rounded-full p-0.5 bg-gradient-to-br from-amber-400 via-rose-500 to-purple-950 shadow-md border border-amber-300/80 flex items-center justify-center shrink-0 overflow-hidden bg-white`}>
        <img
          src="/logo.png"
          alt="زروقي للحلويات ZERROUKI"
          className="w-full h-full object-cover rounded-full transition-transform hover:scale-105"
          onError={(e) => {
            (e.target as HTMLElement).style.display = 'none';
          }}
        />
      </div>

      {showText && (
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className={`font-black tracking-tight ${titleColor} ${dimensions.text}`} style={{ fontFamily: 'Cairo, sans-serif' }}>
              زروقي للحلويات
            </span>
            <span className="bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 text-white text-[10px] font-extrabold px-2.5 py-0.5 rounded-full shadow-xs">
              إدارة المحل
            </span>
          </div>
          <span className={`text-[11px] font-bold ${subtitleColor}`}>Zerrouki Sweets & Chocolates</span>
        </div>
      )}
    </div>
  );
};

