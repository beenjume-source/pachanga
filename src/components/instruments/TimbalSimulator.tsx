import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { usePachanga } from '../../context/PachangaContext';

type TimbalZone = 'splash' | 'macho' | 'cowbell' | 'hembra';

type Props = {
  onPlayTimbal: (zone: TimbalZone, accuracy: number) => void;
  feedbacks: { id: number; text: string; color: string; x: number; y: number }[];
  isDemoMode?: boolean;
};

type FallingNote = {
  id: number;
  laneIdx: number; // 0: Splash, 1: Macho, 2: Cowbell, 3: Hembra
  progress: number;
  label: string;
  color: string;
};

type Shockwave = {
  id: number;
  xPercent: number;
  yPercent: number;
  color: string;
};

export const TimbalSimulator: React.FC<Props> = ({ onPlayTimbal, feedbacks, isDemoMode = false }) => {
  const { videoCurrentTime, difficulty, isPlaying } = usePachanga();
  const [activeZone, setActiveZone] = useState<string | null>(null);
  const [fallingNotes, setFallingNotes] = useState<FallingNote[]>([]);
  const lastSpawnTimeRef = useRef<number>(0);

  // Physical upper bounce states
  const [bouncing, setBouncing] = useState<Record<TimbalZone, boolean>>({
    splash: false,
    macho: false,
    cowbell: false,
    hembra: false,
  });

  // Shockwave ring effects on physical upper stage
  const [shockwaves, setShockwaves] = useState<Shockwave[]>([]);

  // Lower circular button flash state
  const [buttonActive, setButtonActive] = useState<Record<TimbalZone, boolean>>({
    splash: false,
    macho: false,
    cowbell: false,
    hembra: false,
  });

  // Vector Timbales Sticks
  const [leftStick, setLeftStick] = useState<{ xPercent: number; yPercent: number; hitting: boolean }>({
    xPercent: 30,
    yPercent: 50,
    hitting: false,
  });
  const [rightStick, setRightStick] = useState<{ xPercent: number; yPercent: number; hitting: boolean }>({
    xPercent: 70,
    yPercent: 50,
    hitting: false,
  });

  const zones: {
    id: TimbalZone;
    label: string;
    sublabel: string;
    icon: string;
    color: string;
    handGroup: 'left' | 'right';
    centerXPercent: number;
    stageCoords: { x: number; y: number };
  }[] = [
    {
      id: 'splash',
      label: 'Splash',
      sublabel: 'Platillo Acento',
      icon: '✨',
      color: '#ff00ff',
      handGroup: 'left',
      centerXPercent: 12.5,
      stageCoords: { x: 18, y: 35 },
    },
    {
      id: 'macho',
      label: 'Timbal Macho',
      sublabel: 'Afinación Aguda',
      icon: '🥁',
      color: '#00ff88',
      handGroup: 'left',
      centerXPercent: 37.5,
      stageCoords: { x: 38, y: 58 },
    },
    {
      id: 'cowbell',
      label: 'Cencerro',
      sublabel: 'Mambo / Sabor',
      icon: '🔔',
      color: '#ffaa00',
      handGroup: 'right',
      centerXPercent: 62.5,
      stageCoords: { x: 62, y: 42 },
    },
    {
      id: 'hembra',
      label: 'Timbal Hembra',
      sublabel: 'Afinación Grave',
      icon: '🥁',
      color: '#00eefc',
      handGroup: 'right',
      centerXPercent: 87.5,
      stageCoords: { x: 82, y: 58 },
    },
  ];

  // Auto mode trigger
  useEffect(() => {
    if (difficulty !== 'auto' || videoCurrentTime <= 0) return;
    const beat = Math.floor(videoCurrentTime * 2);
    const targetIdx = beat % 4;
    const zone = zones[targetIdx].id;

    setActiveZone(zone);
    triggerPhysicalReaction(zone);
    const timer = setTimeout(() => setActiveZone(null), 180);
    onPlayTimbal(zone, 1.0);

    return () => clearTimeout(timer);
  }, [Math.floor(videoCurrentTime * 2), difficulty]);

  // Falling notes animation loop
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();

      if ((isPlaying || isDemoMode) && now - lastSpawnTimeRef.current > 680) {
        lastSpawnTimeRef.current = now;
        const laneIdx = Math.floor(Math.random() * 4);
        const labels = ['CASCARA', 'REPIQUE', 'SABOR', 'MAMBO', 'CHA-CHA', 'GOLPE'];
        const randomLabel = labels[Math.floor(Math.random() * labels.length)];
        const zone = zones[laneIdx];

        setFallingNotes((prev) => [
          ...prev.slice(-6),
          {
            id: now + Math.random(),
            laneIdx,
            progress: 0,
            label: randomLabel,
            color: zone.color,
          },
        ]);
      }

      if (isPlaying || isDemoMode) {
        setFallingNotes((prev) => {
          if (difficulty === 'basic') {
            prev.forEach((n: any) => {
              if (!n.autoAudible && n.progress >= 78 && n.progress <= 88) {
                n.autoAudible = true;
                const zone = zones[n.laneIdx].id;
                setTimeout(() => {
                  onPlayTimbal(zone, 1.0); // 100% volume real in basic mode
                  triggerPhysicalReaction(zone);
                }, 0);
              }
            });
          }
          return prev
            .map((n) => ({ ...n, progress: n.progress + 2.8 }))
            .filter((n) => n.progress <= 100);
        });
      }
    }, 40);

    return () => clearInterval(interval);
  }, [isPlaying, isDemoMode, videoCurrentTime, difficulty]);

  const triggerPhysicalReaction = (zone: TimbalZone) => {
    const piece = zones.find((z) => z.id === zone);
    if (!piece) return;

    setBouncing((prev) => ({ ...prev, [zone]: true }));
    setTimeout(() => setBouncing((prev) => ({ ...prev, [zone]: false })), 180);

    const swId = Date.now() + Math.random();
    setShockwaves((prev) => [
      ...prev.slice(-4),
      { id: swId, xPercent: piece.stageCoords.x, yPercent: piece.stageCoords.y, color: piece.color },
    ]);
    setTimeout(() => {
      setShockwaves((prev) => prev.filter((sw) => sw.id !== swId));
    }, 400);

    if (piece.handGroup === 'left') {
      setLeftStick({ xPercent: piece.stageCoords.x, yPercent: piece.stageCoords.y + 10, hitting: true });
      setTimeout(() => setLeftStick((s) => ({ ...s, hitting: false })), 160);
    } else {
      setRightStick({ xPercent: piece.stageCoords.x, yPercent: piece.stageCoords.y + 10, hitting: true });
      setTimeout(() => setRightStick((s) => ({ ...s, hitting: false })), 160);
    }
  };

  const tapZone = (zoneId: TimbalZone, laneIdx: number) => {
    if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
      try {
        window.navigator.vibrate(25);
      } catch (e) {}
    }

    setButtonActive((prev) => ({ ...prev, [zoneId]: true }));
    setTimeout(() => setButtonActive((prev) => ({ ...prev, [zoneId]: false })), 160);

    triggerPhysicalReaction(zoneId);

    if (difficulty === 'basic') {
      onPlayTimbal(zoneId, 1.0);
      return;
    }

    let accuracy = 0.5;
    let hitNoteId: number | null = null;

    fallingNotes.forEach((n) => {
      if (n.laneIdx === laneIdx && n.progress >= 65 && n.progress <= 95) {
        hitNoteId = n.id;
        accuracy = n.progress >= 75 && n.progress <= 88 ? 1.0 : 0.8;
      }
    });

    if (hitNoteId) {
      setFallingNotes((prev) => prev.filter((n) => n.id !== hitNoteId));
    }

    onPlayTimbal(zoneId, accuracy);
  };

  return (
    <div className="relative w-full h-full flex flex-col justify-between items-center overflow-hidden bg-gradient-to-b from-[#081810] via-[#04120a] to-[#020904] select-none p-1 md:p-2">
      {/* HEADER */}
      <div className="z-20 text-center my-0.5 shrink-0">
        <span className="font-headline-md font-bold text-[#00FF88] text-sm md:text-lg tracking-wide flex items-center justify-center gap-2 drop-shadow-[0_0_10px_#00ff88]">
          <span>🥁</span> TIMBAL LATINO CROMADO — V1.4.8
        </span>
        <p className="text-[9px] md:text-[10px] text-emerald-200/80 font-label-caps uppercase tracking-widest mt-0.5">
          {difficulty === 'basic'
            ? '✨ BÁSICO 100% SIN ERRORES (Volumen 100% Impecable)'
            : '🥁 MODO PERCUSIÓN CUMBIA / SALSA'}
        </p>
      </div>

      {/* BACKGROUND VECTOR ILLUSTRATION OF INSTRUMENT */}
      <div className="absolute inset-x-2 top-10 h-[40%] rounded-2xl bg-black/40 backdrop-blur-xs overflow-hidden z-0 pointer-events-none border border-white/5">
        <div className="relative w-full h-full">
          {/* SPLASH CYMBAL */}
          <div
            className={`absolute -translate-x-1/2 -translate-y-1/2 transition-transform duration-100 ${
              bouncing.splash ? 'scale-125 rotate-6' : 'scale-100'
            }`}
            style={{ left: `${zones[0].stageCoords.x}%`, top: `${zones[0].stageCoords.y}%` }}
          >
            <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-gradient-to-tr from-fuchsia-600 via-pink-400 to-amber-200 border border-pink-200 shadow-[0_0_15px_#ff00ff] flex items-center justify-center">
              <div className="w-3 h-3 rounded-full bg-black/80" />
            </div>
          </div>

          {/* TIMBAL MACHO */}
          <div
            className={`absolute -translate-x-1/2 -translate-y-1/2 transition-transform duration-100 ${
              bouncing.macho ? 'scale-125 -rotate-6' : 'scale-100'
            }`}
            style={{ left: `${zones[1].stageCoords.x}%`, top: `${zones[1].stageCoords.y}%` }}
          >
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-gradient-to-tr from-slate-200 via-gray-400 to-slate-100 border-3 border-emerald-400 shadow-[0_0_20px_#00ff88] flex items-center justify-center">
              <span className="text-xl md:text-2xl drop-shadow">🥁</span>
            </div>
          </div>

          {/* COWBELL */}
          <div
            className={`absolute -translate-x-1/2 -translate-y-1/2 transition-transform duration-100 ${
              bouncing.cowbell ? 'scale-125 -translate-y-1' : 'scale-100'
            }`}
            style={{ left: `${zones[2].stageCoords.x}%`, top: `${zones[2].stageCoords.y}%` }}
          >
            <div className="w-10 h-12 md:w-14 md:h-16 rounded-xl bg-gradient-to-b from-amber-700 via-amber-900 to-zinc-950 border-2 border-amber-400 shadow-[0_0_15px_#ffaa00] flex flex-col items-center justify-center rotate-12">
              <span className="text-lg md:text-xl drop-shadow">🔔</span>
            </div>
          </div>

          {/* TIMBAL HEMBRA */}
          <div
            className={`absolute -translate-x-1/2 -translate-y-1/2 transition-transform duration-100 ${
              bouncing.hembra ? 'scale-125 rotate-6' : 'scale-100'
            }`}
            style={{ left: `${zones[3].stageCoords.x}%`, top: `${zones[3].stageCoords.y}%` }}
          >
            <div className="w-18 h-18 md:w-22 md:h-22 rounded-full bg-gradient-to-tr from-gray-300 via-slate-400 to-gray-100 border-3 border-cyan-400 shadow-[0_0_20px_#00eefc] flex items-center justify-center">
              <span className="text-xl md:text-2xl drop-shadow">🥁</span>
            </div>
          </div>

          {/* SHOCKWAVE NEON RINGS */}
          {shockwaves.map((sw) => (
            <div
              key={sw.id}
              className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none rounded-full border-4 animate-ping z-20"
              style={{
                left: `${sw.xPercent}%`,
                top: `${sw.yPercent}%`,
                width: '60px',
                height: '60px',
                borderColor: sw.color,
                boxShadow: `0 0 20px ${sw.color}`,
              }}
            />
          ))}

          {/* VECTOR TIMBAL STICKS */}
          <div
            className={`absolute pointer-events-none z-30 transition-all duration-100 -translate-x-1/2 -translate-y-1/2 ${
              leftStick.hitting ? 'scale-130 -rotate-45' : 'scale-100 -rotate-12'
            }`}
            style={{ left: `${leftStick.xPercent}%`, top: `${leftStick.yPercent}%` }}
          >
            <div className="w-12 h-1.5 bg-gradient-to-r from-slate-200 via-amber-300 to-amber-100 rounded-full border border-slate-600 shadow-xl" />
          </div>

          <div
            className={`absolute pointer-events-none z-30 transition-all duration-100 -translate-x-1/2 -translate-y-1/2 ${
              rightStick.hitting ? 'scale-130 rotate-45' : 'scale-100 rotate-12'
            }`}
            style={{ left: `${rightStick.xPercent}%`, top: `${rightStick.yPercent}%` }}
          >
            <div className="w-12 h-1.5 bg-gradient-to-r from-amber-100 via-amber-300 to-slate-200 rounded-full border border-slate-600 shadow-xl" />
          </div>
        </div>
      </div>

      {/* 90° VERTICAL RHYTHM LANES */}
      <div className="absolute inset-x-0 top-[12%] bottom-[16%] pointer-events-none z-10">
        {zones.map((z, idx) => (
          <React.Fragment key={z.id}>
            <div
              className="absolute top-0 bottom-0 w-0.5 -translate-x-1/2 bg-gradient-to-b from-transparent via-emerald-500/10 to-emerald-400/50"
              style={{ left: `${z.centerXPercent}%` }}
            />

            {fallingNotes
              .filter((n) => n.laneIdx === idx)
              .map((n) => {
                const approachScale = Math.max(1.0, 2.5 - (n.progress / 85) * 1.5);

                return (
                  <div
                    key={n.id}
                    className="absolute -translate-x-1/2 z-20 flex items-center justify-center"
                    style={{
                      left: `${z.centerXPercent}%`,
                      top: `${n.progress}%`,
                    }}
                  >
                    <div
                      className="absolute rounded-full border-2 transition-transform duration-75"
                      style={{
                        width: '54px',
                        height: '54px',
                        borderColor: n.color,
                        transform: `scale(${approachScale})`,
                        boxShadow: `0 0 15px ${n.color}`,
                        opacity: n.progress >= 95 ? 0.2 : 0.85,
                      }}
                    />

                    <div
                      className="w-10 h-10 rounded-full border-2 border-white flex items-center justify-center shadow-lg text-black font-black text-[9px] text-center"
                      style={{
                        backgroundColor: n.color,
                        boxShadow: `0 0 18px ${n.color}`,
                      }}
                    >
                      <span className="drop-shadow">{n.label}</span>
                    </div>
                  </div>
                );
              })}
          </React.Fragment>
        ))}
      </div>

      {/* LOWER HALF: ROW OF LARGE CIRCULAR BUTTONS */}
      <div className="relative w-full h-[52%] flex flex-col justify-end px-2 pb-3 z-20">
        <div className="flex justify-between items-center px-8 mb-2 text-[10px] font-label-caps font-bold text-emerald-300/90 uppercase tracking-widest">
          <span>👍 PULGAR IZQUIERDO</span>
          <span>PULGAR DERECHO 👍</span>
        </div>

        <div className="w-full grid grid-cols-4 gap-2 md:gap-4 items-center justify-items-center">
          {zones.map((z, idx) => {
            const isActive = buttonActive[z.id];
            const matchingNote = fallingNotes.find((n) => n.laneIdx === idx && n.progress >= 20 && n.progress <= 92);
            const fillPercent = matchingNote ? Math.min(100, Math.max(0, matchingNote.progress)) : 0;

            return (
              <div key={z.id} className="relative flex flex-col items-center justify-center">
                <div
                  className="absolute rounded-full border-2 pointer-events-none transition-transform duration-75"
                  style={{
                    width: '72px',
                    height: '72px',
                    borderColor: z.color,
                    transform: fillPercent > 0 ? `scale(${Math.max(1.0, 2.2 - (fillPercent / 85) * 1.2)})` : 'scale(1.0)',
                    opacity: fillPercent > 0 ? 0.9 : 0.2,
                    boxShadow: `0 0 12px ${z.color}`,
                  }}
                />

                <button
                  onClick={() => tapZone(z.id, idx)}
                  className={`relative w-16 h-16 sm:w-18 sm:h-18 md:w-22 md:h-22 rounded-full border-3 flex flex-col items-center justify-center touch-none transition-all active:scale-90 ${
                    isActive
                      ? 'scale-115 border-white bg-white/50 shadow-[0_0_35px_#00ff88]'
                      : 'bg-gradient-to-b from-slate-800 via-zinc-900 to-black hover:border-white'
                  }`}
                  style={{
                    borderColor: isActive ? '#ffffff' : z.color,
                    boxShadow: isActive ? `0 0 30px ${z.color}` : `0 6px 20px rgba(0,0,0,0.8), inset 0 0 12px ${z.color}33`,
                  }}
                >
                  <div
                    className="absolute inset-1 rounded-full border-2 pointer-events-none transition-all"
                    style={{
                      borderColor: z.color,
                      opacity: isActive ? 1 : 0.4,
                      background: fillPercent > 0 ? `radial-gradient(circle, ${z.color}44 0%, transparent 70%)` : 'transparent',
                    }}
                  />

                  <span className="relative z-10 text-2xl drop-shadow">{z.icon}</span>
                  <span
                    className="relative z-10 font-black text-[9px] md:text-[11px] uppercase tracking-wider text-center truncate max-w-[90%] mt-0.5"
                    style={{ color: z.color }}
                  >
                    {z.label}
                  </span>
                </button>

                <span className="text-[8px] text-gray-400 font-mono font-bold mt-1">
                  {z.handGroup === 'left' ? '👍 Izq' : '👍 Der'}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* FEEDBACK POPUPS */}
      <div className="absolute inset-0 pointer-events-none z-40 flex items-center justify-center">
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
    </div>
  );
};
