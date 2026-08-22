import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { usePachanga } from '../../context/PachangaContext';

type Props = {
  onPlayTrumpet: (freq: number, accuracy: number) => void;
  feedbacks: { id: number; text: string; color: string; x: number; y: number }[];
  isDemoMode?: boolean;
};

type FallingNote = {
  id: number;
  pistonIdx: number;
  progress: number; // 0 to 100%
  label: string;
};

export const TrumpetSimulator: React.FC<Props> = ({ onPlayTrumpet, feedbacks, isDemoMode = false }) => {
  const { videoCurrentTime, difficulty, isPlaying } = usePachanga();
  const [valvesPressed, setValvesPressed] = useState<boolean[]>([false, false, false]);
  const [airFlash, setAirFlash] = useState<boolean>(false);
  const [fallingNotes, setFallingNotes] = useState<FallingNote[]>([]);
  const lastSpawnTimeRef = useRef<number>(0);

  // Trumpet note frequencies for valve combinations (1st, 2nd, 3rd valve)
  const getTrumpetFreq = (v: boolean[]) => {
    if (v[0] && v[1] && v[2]) return 369.99; // F#4
    if (v[0] && v[2]) return 392.0;       // G4
    if (v[1] && v[2]) return 415.3;       // Ab4
    if (v[0] && v[1]) return 440.0;       // A4
    if (v[0]) return 466.16;              // Bb4
    if (v[1]) return 493.88;              // B4
    if (v[2]) return 554.37;              // C#5
    return 523.25;                        // C5 (Open)
  };

  // Automatic trumpet player on beats in AUTO mode
  useEffect(() => {
    if (difficulty !== 'auto' || videoCurrentTime <= 0) return;

    const beatIndex = Math.floor(videoCurrentTime * 2);
    const v1 = beatIndex % 2 === 0;
    const v2 = (beatIndex + 1) % 3 === 0;
    const v3 = (beatIndex + 2) % 4 === 0;
    const updatedValves = [v1, v2, v3];

    setValvesPressed(updatedValves);
    const freq = getTrumpetFreq(updatedValves);
    setAirFlash(true);
    const flashTimer = setTimeout(() => setAirFlash(false), 200);

    onPlayTrumpet(freq, 1.0);

    return () => clearTimeout(flashTimer);
  }, [Math.floor(videoCurrentTime * 2), difficulty]);

  // Falling notes continuous animation loop
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();

      // Spawn falling notes periodically if playing or in Demo mode
      if ((isPlaying || isDemoMode) && now - lastSpawnTimeRef.current > 700) {
        lastSpawnTimeRef.current = now;
        const targetPiston = Math.floor(Math.random() * 3);
        const labels = ['SOL', 'LA', 'DO', 'RE', 'MI', 'FA#'];
        const randomLabel = labels[Math.floor(Math.random() * labels.length)];

        setFallingNotes((prev) => [
          ...prev.slice(-12),
          {
            id: now + Math.random(),
            pistonIdx: targetPiston,
            progress: 0,
            label: randomLabel,
          },
        ]);
      }

      // Advance falling notes progress only when active
      if (isPlaying || isDemoMode) {
        setFallingNotes((prev) => {
          if (difficulty === 'basic') {
            prev.forEach((n: any) => {
              if (!n.autoAudible && n.progress >= 78 && n.progress <= 88) {
                n.autoAudible = true;
                const v1 = n.pistonIdx === 0;
                const v2 = n.pistonIdx === 1;
                const v3 = n.pistonIdx === 2;
                const freq = getTrumpetFreq([v1, v2, v3]);
                setTimeout(() => {
                  onPlayTrumpet(freq, 1.0);
                }, 0);
              }
            });
          }
          return prev
            .map((n) => ({ ...n, progress: n.progress + 2.5 }))
            .filter((n) => n.progress <= 100);
        });
      }
    }, 40);

    return () => clearInterval(interval);
  }, [isPlaying, isDemoMode, videoCurrentTime]);

  const pressValve = (valveIndex: number) => {
    const updated = [...valvesPressed];
    updated[valveIndex] = !updated[valveIndex];
    setValvesPressed(updated);

    // Check hit on falling notes for this piston
    let accuracy = 0.5;
    let hitNoteId: number | null = null;

    fallingNotes.forEach((n) => {
      if (n.pistonIdx === valveIndex && n.progress >= 65 && n.progress <= 95) {
        hitNoteId = n.id;
        accuracy = n.progress >= 75 && n.progress <= 88 ? 1.0 : 0.8;
      }
    });

    if (hitNoteId) {
      setFallingNotes((prev) => prev.filter((n) => n.id !== hitNoteId));
    }

    const freq = getTrumpetFreq(updated);
    setAirFlash(true);
    setTimeout(() => setAirFlash(false), 200);

    onPlayTrumpet(freq, accuracy);
  };

  return (
    <div className="relative w-full h-full flex flex-col justify-between items-center overflow-hidden bg-gradient-to-b from-[#140b02] via-[#211202] to-[#0c0601] select-none p-3">
      {/* HEADER */}
      <div className="z-20 text-center my-1">
        <span className="font-headline-md font-bold text-amber-300 text-lg md:text-xl tracking-wide flex items-center justify-center gap-2">
          <span className="material-symbols-outlined text-amber-400">campaign</span>
          TROMPETA DE BRONCE
        </span>
        <p className="text-[11px] text-amber-200/70 font-label-caps uppercase tracking-widest mt-0.5">
          Combina los 3 pistones dorados para atinar a las notas cayendo
        </p>
      </div>

      {/* RHYTHMIC FALLING NOTES OVERLAY LANES FOR TRUMPET (PISTON 1, 2, 3) */}
      <div className="absolute inset-0 z-10 pointer-events-none flex justify-center items-center">
        <div className="w-full max-w-md h-full relative flex justify-around px-8">
          {[0, 1, 2].map((idx) => (
            <div
              key={idx}
              className="w-20 h-full border-x border-amber-500/10 bg-gradient-to-b from-transparent via-amber-500/5 to-amber-500/20 relative"
            >
              {/* TARGET ZONE INDICATOR */}
              <div className="absolute bottom-24 left-0 right-0 h-10 border-y-2 border-amber-400 bg-amber-400/20 flex items-center justify-center shadow-[0_0_15px_#ffc700]">
                <span className="text-[9px] font-label-caps text-amber-300 font-bold uppercase tracking-widest">
                  Pistón {idx + 1}
                </span>
              </div>

              {/* FALLING NOTES IN THIS LANE */}
              {fallingNotes
                .filter((n) => n.pistonIdx === idx)
                .map((n) => (
                  <div
                    key={n.id}
                    className="absolute left-1/2 -translate-x-1/2 w-12 h-12 rounded-full bg-gradient-to-tr from-amber-500 to-amber-300 border-2 border-yellow-100 flex items-center justify-center shadow-[0_0_15px_#ffc700] text-black font-black text-xs"
                    style={{ top: `${n.progress}%` }}
                  >
                    <span>🎺 {n.label}</span>
                  </div>
                ))}
            </div>
          ))}
        </div>
      </div>

      {/* SVG ANATOMICALLY REALISTIC BRASS TRUMPET */}
      <div className="relative w-full max-w-xl flex-1 flex items-center justify-center py-2 z-20">
        <svg viewBox="0 0 800 400" className="w-full h-full drop-shadow-[0_0_30px_rgba(255,180,0,0.4)]">
          <defs>
            <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFF2A3" />
              <stop offset="30%" stopColor="#FFC700" />
              <stop offset="70%" stopColor="#D48800" />
              <stop offset="100%" stopColor="#804D00" />
            </linearGradient>

            <linearGradient id="brassPipe" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#FFE175" />
              <stop offset="50%" stopColor="#FFB300" />
              <stop offset="100%" stopColor="#995C00" />
            </linearGradient>

            <filter id="airGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="15" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* MOUTHPIECE (Left) */}
          <rect x="20" y="185" width="40" height="30" rx="4" fill="url(#goldGradient)" stroke="#FFE175" strokeWidth="2" />
          <path d="M 60 190 L 140 195 L 140 205 L 60 210 Z" fill="url(#brassPipe)" />

          {/* LEADPIPE & TUNING SLIDES */}
          <path d="M 140 195 L 450 195 L 450 205 L 140 205 Z" fill="url(#brassPipe)" />
          <path d="M 140 160 L 320 160 C 350 160 350 240 320 240 L 140 240" fill="none" stroke="url(#goldGradient)" strokeWidth="12" strokeLinecap="round" />

          {/* BELL (Right Flare) */}
          <path d="M 450 185 Q 600 170 700 110 L 700 290 Q 600 230 450 215 Z" fill="url(#goldGradient)" stroke="#FFE175" strokeWidth="3" />
          <ellipse cx="700" cy="200" rx="20" ry="90" fill="#FFE175" stroke="#FFB300" strokeWidth="4" />
          <ellipse cx="700" cy="200" rx="12" ry="78" fill="#523200" />

          {/* AIR FLASH NEON BLAST EMISSION FROM BELL */}
          {airFlash && (
            <g filter="url(#airGlow)">
              <ellipse cx="720" cy="200" rx="40" ry="110" fill="rgba(255, 238, 0, 0.6)" className="animate-ping" />
              <path d="M 700 110 L 790 60 L 790 340 L 700 290 Z" fill="rgba(0, 255, 136, 0.4)" />
              <circle cx="730" cy="200" r="35" fill="#00FF88" opacity="0.8" />
            </g>
          )}

          {/* 3 GOLDEN VALVES (PISTONES INTERACTIVOS) */}
          {[0, 1, 2].map((idx) => {
            const cx = 260 + idx * 60;
            const isDown = valvesPressed[idx];

            return (
              <g
                key={idx}
                onClick={() => pressValve(idx)}
                className="cursor-pointer transition-transform duration-100"
                transform={`translate(0, ${isDown ? 18 : 0})`}
              >
                {/* Valve Casing */}
                <rect x={cx - 18} y="130" width="36" height="140" rx="6" fill="url(#goldGradient)" stroke="#FFF2A3" strokeWidth="3" />
                {/* Valve Cap Buttons */}
                <ellipse cx={cx} cy="120" rx="22" ry="10" fill="#FFF2A3" stroke="#FFC700" strokeWidth="3" />
                <ellipse cx={cx} cy="120" rx="14" ry="6" fill="#00FF88" className={isDown ? 'animate-pulse' : ''} />
                
                {/* Number Tag */}
                <text x={cx} y="210" textAnchor="middle" fill="#523200" fontSize="18" fontWeight="900" fontFamily="Space Grotesk">
                  {idx + 1}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* FEEDBACK POPUPS */}
      <div className="absolute inset-0 pointer-events-none z-30 flex items-center justify-center">
        <AnimatePresence>
          {feedbacks.map((f) => (
            <motion.div
              key={f.id}
              initial={{ scale: 0.5, y: 20, opacity: 0 }}
              animate={{ scale: 1.3, y: -40, opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              className={`absolute font-display-mobile text-[36px] font-black ${f.color} drop-shadow-[0_0_15px_currentColor]`}
              style={{ left: `calc(50% + ${f.x}px)`, top: `calc(40% + ${f.y}px)` }}
            >
              {f.text}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* FOOTER ACTION BUTTONS */}
      <div className="flex gap-3 my-2 z-20">
        {[0, 1, 2].map((idx) => (
          <button
            key={idx}
            onClick={() => pressValve(idx)}
            className={`w-20 h-16 rounded-xl font-display-mobile font-black text-lg uppercase flex flex-col items-center justify-center border-2 shadow-lg active:scale-95 transition-all ${
              valvesPressed[idx]
                ? 'bg-amber-400 text-black border-amber-200 shadow-[0_0_15px_#ffc700]'
                : 'bg-black/60 text-amber-300 border-amber-500/40 hover:border-amber-400'
            }`}
          >
            <span>Pistón {idx + 1}</span>
            <span className="text-[10px] font-label-caps opacity-80">{valvesPressed[idx] ? 'ON' : 'OFF'}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
