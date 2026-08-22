import React, { useRef } from 'react';
import { usePachanga } from '../context/PachangaContext';

type Props = {
  subtitle?: string;
  size?: 'sm' | 'md' | 'lg';
  showDiscoFloor?: boolean;
};

export const BrandingHeader: React.FC<Props> = ({
  subtitle = 'by Benjume VIP Tropa',
  size = 'md',
  showDiscoFloor = false,
}) => {
  const isLg = size === 'lg';
  const isSm = size === 'sm';
  const { toggleDebugConsole } = usePachanga();
  const clickTimesRef = useRef<number[]>([]);

  const handleLogoClick = () => {
    const now = Date.now();
    clickTimesRef.current = [...clickTimesRef.current.filter((t) => now - t < 600), now];
    if (clickTimesRef.current.length >= 3) {
      clickTimesRef.current = [];
      if (toggleDebugConsole) {
        toggleDebugConsole();
      }
    }
  };

  return (
    <div
      onClick={handleLogoClick}
      title="3 clics rápidos para abrir Consola de Diagnóstico (o presiona 'D')"
      className={`relative flex flex-col items-center justify-center select-none cursor-pointer group ${
        showDiscoFloor ? 'p-6 py-8 fever-disco-floor rounded-2xl border border-emerald-500/30 shadow-[0_0_30px_rgba(0,255,136,0.2)]' : ''
      }`}
    >
      {/* DISCO BALL WITH ANIMATED SPARKLES & RAYS */}
      <div className="relative mb-2 flex items-center justify-center">
        {/* Glowing Disco Rays Background */}
        <div className="absolute w-32 h-32 rounded-full bg-gradient-to-tr from-[#00A86B]/30 via-[#00FF88]/20 to-[#00EEFC]/30 blur-xl disco-ball-shine pointer-events-none" />

        {/* Disco Ball SVG Graphic */}
        <div className={`relative z-10 ${isLg ? 'w-20 h-20' : isSm ? 'w-10 h-10' : 'w-14 h-14'}`}>
          <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_0_15px_#00ff88]">
            {/* Mirror Ball Globe */}
            <circle cx="50" cy="50" r="42" fill="url(#ballShine)" stroke="#00FF88" strokeWidth="2.5" />
            
            {/* Mirror Tiles Grid Pattern */}
            <path
              d="M 50 8 A 42 42 0 0 1 50 92 M 8 50 A 42 42 0 0 1 92 50 M 20 20 L 80 80 M 80 20 L 20 80 M 30 10 L 70 90 M 70 10 L 30 90"
              stroke="#ffffff"
              strokeWidth="1"
              strokeDasharray="3,3"
              opacity="0.85"
            />

            {/* Top Hanging Chain */}
            <line x1="50" y1="0" x2="50" y2="8" stroke="#00FF88" strokeWidth="3" />

            {/* Sparkle Glint Highlights */}
            <circle cx="35" cy="32" r="5" fill="#ffffff" className="animate-ping" />
            <circle cx="68" cy="42" r="4" fill="#00EEFC" className="animate-pulse" />
            <circle cx="48" cy="65" r="3.5" fill="#FFFF00" className="animate-ping" />

            <defs>
              <radialGradient id="ballShine" cx="35%" cy="35%" r="65%">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="30%" stopColor="#00FF88" />
                <stop offset="70%" stopColor="#00A86B" />
                <stop offset="100%" stopColor="#042e1d" />
              </radialGradient>
            </defs>
          </svg>
        </div>
      </div>

      {/* PACHANGA NEON EMERALD GREEN LOGO TEXT */}
      <h1
        className={`font-black font-display-mobile tracking-wider uppercase text-center pachanga-disco-title transition-transform group-hover:scale-105 ${
          isLg
            ? 'text-5xl md:text-7xl drop-shadow-[0_0_25px_rgba(0,255,136,0.9)]'
            : isSm
            ? 'text-2xl drop-shadow-[0_0_12px_rgba(0,255,136,0.7)]'
            : 'text-3xl md:text-4xl drop-shadow-[0_0_18px_rgba(0,255,136,0.8)]'
        }`}
      >
        Pachanga
      </h1>

      {/* VINTAGE DISCO SUBTITLE */}
      {subtitle && (
        <span className="font-label-caps text-xs md:text-sm font-bold uppercase tracking-[0.3em] text-[#00FF88] mt-1 bg-black/60 px-3 py-0.5 rounded-full border border-[#00A86B]/40 shadow-[0_0_10px_rgba(0,168,107,0.4)]">
          {subtitle}
        </span>
      )}

      {/* VERSION INDICATOR BADGE */}
      <div className="mt-2.5 flex items-center gap-1.5 bg-emerald-950/40 border border-emerald-500/30 rounded-md px-2.5 py-0.5 shadow-[inset_0_0_8px_rgba(0,255,136,0.1)]">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        <span className="font-mono text-[9px] font-bold text-emerald-300 tracking-wider">
          V1.4.8
        </span>
      </div>
    </div>
  );
};
