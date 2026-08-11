import React from 'react';

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({ size = 'md', showText = true }) => {
  const dimensions = {
    sm: { box: 'w-9 h-9', text: 'text-base' },
    md: { box: 'w-11 h-11', text: 'text-lg' },
    lg: { box: 'w-16 h-16', text: 'text-2xl' }
  }[size];

  return (
    <div className="flex items-center gap-3 select-none">
      <div className={`relative ${dimensions.box} rounded-2xl bg-gradient-to-br from-[#4C1D95] via-[#9F1239] to-[#F59E0B] p-1 shadow-md border border-amber-300/60 flex items-center justify-center shrink-0`}>
        {/* Decorative Gold Inner Frame */}
        <div className="absolute inset-0.5 rounded-[12px] border border-amber-200/50 border-dashed pointer-events-none" />
        
        {/* Sweet Icon / Calligraphy Badge */}
        <div className="relative z-10 flex flex-col items-center justify-center text-center">
          <span className="text-white font-black tracking-tight leading-none text-xs drop-shadow-[0_1px_3px_rgba(0,0,0,0.6)]" style={{ fontFamily: 'Cairo, sans-serif' }}>
            زروقي
          </span>
          <span className="text-amber-200 font-bold text-[9px] leading-tight" style={{ fontFamily: 'Cairo, sans-serif' }}>
            للحلويات
          </span>
        </div>
      </div>

      {showText && (
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className={`font-black text-[#1E1B4B] tracking-tight ${dimensions.text}`} style={{ fontFamily: 'Cairo, sans-serif' }}>
              زروقي للحلويات
            </span>
            <span className="bg-gradient-to-r from-amber-500 to-rose-500 text-white text-[10px] font-extrabold px-2.5 py-0.5 rounded-full shadow-xs">
              إدارة المحل
            </span>
          </div>
          <span className="text-xs text-rose-800/80 font-bold">Zerrouki Sweets ERP</span>
        </div>
      )}
    </div>
  );
};

