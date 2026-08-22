import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { usePachanga } from '../../context/PachangaContext';

type PianoKey = {
  note: string;
  freq: number;
  isBlack: boolean;
};

type Props = {
  onPlayNote: (freq: number, accuracy: number) => void;
  score: number;
  feedbacks: { id: number; text: string; color: string; x: number; y: number }[];
  isDemoMode?: boolean;
};

export const Piano3DSimulator: React.FC<Props> = ({ onPlayNote, feedbacks, isDemoMode = false }) => {
  const { videoCurrentTime, isPlaying, difficulty } = usePachanga();
  const [pressedIndex, setPressedIndex] = useState<number | null>(null);
  const [fallingNote, setFallingNote] = useState<{ keyIdx: number; progress: number } | null>(null);

  const pianoKeys: PianoKey[] = [
    { note: 'C4', freq: 261.63, isBlack: false },
    { note: 'C#4', freq: 277.18, isBlack: true },
    { note: 'D4', freq: 293.66, isBlack: false },
    { note: 'D#4', freq: 311.13, isBlack: true },
    { note: 'E4', freq: 329.63, isBlack: false },
    { note: 'F4', freq: 349.23, isBlack: false },
    { note: 'F#4', freq: 369.99, isBlack: true },
    { note: 'G4', freq: 392.0, isBlack: false },
    { note: 'G#4', freq: 415.3, isBlack: true },
    { note: 'A4', freq: 440.0, isBlack: false },
    { note: 'A#4', freq: 466.16, isBlack: true },
    { note: 'B4', freq: 493.88, isBlack: false },
    { note: 'C5', freq: 523.25, isBlack: false },
  ];

  const whiteKeys = [
    { note: 'DO', freq: 261.63, keyIdx: 0 },
    { note: 'RE', freq: 293.66, keyIdx: 2 },
    { note: 'MI', freq: 329.63, keyIdx: 4 },
    { note: 'FA', freq: 349.23, keyIdx: 5 },
    { note: 'SOL', freq: 392.0, keyIdx: 7 },
    { note: 'LA', freq: 440.0, keyIdx: 9 },
    { note: 'SI', freq: 493.88, keyIdx: 11 },
    { note: 'DO2', freq: 523.25, keyIdx: 12 },
  ];

  const blackKeys = [
    { note: 'DO#', freq: 277.18, leftOffset: '12.5%', keyIdx: 1 },
    { note: 'RE#', freq: 311.13, leftOffset: '25.0%', keyIdx: 3 },
    { note: 'FA#', freq: 369.99, leftOffset: '50.0%', keyIdx: 6 },
    { note: 'SOL#', freq: 415.3, leftOffset: '62.5%', keyIdx: 8 },
    { note: 'LA#', freq: 466.16, leftOffset: '75.0%', keyIdx: 10 },
  ];

  const keyCenterMap: Record<number, number> = {
    0: 6.25,
    1: 12.5,
    2: 18.75,
    3: 25.0,
    4: 31.25,
    5: 43.75,
    6: 50.0,
    7: 56.25,
    8: 62.5,
    9: 68.75,
    10: 75.0,
    11: 81.25,
    12: 93.75,
  };

  useEffect(() => {
    if (!isPlaying && !isDemoMode) return;
    const intervalTime = isDemoMode ? 500 : 2000;
    const interval = setInterval(() => {
      const randomIdx = Math.floor(Math.random() * pianoKeys.length);
      setFallingNote({ keyIdx: randomIdx, progress: 0 });
    }, intervalTime);

    return () => clearInterval(interval);
  }, [isPlaying, isDemoMode]);

  const reqRef = useRef<number | null>(null);
  useEffect(() => {
    let lastTime = performance.now();
    const update = (now: number) => {
      const delta = (now - lastTime) / 1000;
      lastTime = now;

      if (isPlaying || isDemoMode) {
        setFallingNote((prev) => {
          if (!prev) return null;
          if (prev.progress >= 105) return null;

          if (difficulty === 'basic' && prev.progress >= 82 && !(prev as any).autoAudible) {
            (prev as any).autoAudible = true;
            const fullKey = pianoKeys[prev.keyIdx];
            if (fullKey) {
              const freq = fullKey.freq;
              setTimeout(() => {
                onPlayNote(freq, 1.0);
              }, 0);
            }
          }

          if (difficulty === 'auto' && prev.progress >= 85) {
            // Trigger automatic press!
            setTimeout(() => {
              const fullKey = pianoKeys[prev.keyIdx];
              handleKeyPress(prev.keyIdx, fullKey, true);
            }, 0);
            return null; // Consume falling note
          }

          return { ...prev, progress: prev.progress + delta * 40 };
        });
      }

      reqRef.current = requestAnimationFrame(update);
    };

    reqRef.current = requestAnimationFrame(update);
    return () => {
      if (reqRef.current) cancelAnimationFrame(reqRef.current);
    };
  }, [isPlaying, isDemoMode, difficulty]);

  const handleKeyPress = (idx: number, key: PianoKey, isAutoHit = false) => {
    setPressedIndex(idx);
    setTimeout(() => setPressedIndex(null), 180);

    let accuracy = 0.0;
    if (isAutoHit) {
      accuracy = 1.0;
    } else if (fallingNote && fallingNote.keyIdx === idx) {
      const diffProgress = Math.abs(fallingNote.progress - 85);
      const diffMs = (diffProgress / 40) * 1000;

      if (diffMs <= 50) {
        accuracy = 1.0; // PERFECT
      } else if (diffMs <= 120) {
        accuracy = 0.6; // BIEN
      } else {
        accuracy = 0.0; // MISS
      }
      setFallingNote(null);
    } else {
      accuracy = 0.0; // MISS
    }

    onPlayNote(key.freq, accuracy);
  };

  return (
    <div className="relative w-full h-full flex flex-col justify-between overflow-hidden bg-gradient-to-b from-[#0b0c10] via-[#12141d] to-[#0a0a0e] select-none p-4">
      {/* HEADER */}
      <div className="z-20 text-center my-1">
        <span className="font-headline-md font-bold text-secondary text-xl tracking-wide flex items-center justify-center gap-2">
          <span className="material-symbols-outlined text-secondary">piano</span>
          TECLADO PIANO 3D
        </span>
        <p className="text-xs text-on-surface-variant font-label-caps uppercase tracking-widest mt-0.5">
          Teclas táctiles con hundimiento visible
        </p>
      </div>

      {/* FALLING NOTES LANE OVERLAY */}
      <div className="relative w-full max-w-3xl flex-1 flex items-end justify-center py-2 px-2">
        {fallingNote && (
          <div
            className="absolute w-8 h-12 rounded-lg bg-gradient-to-b from-secondary to-primary shadow-[0_0_20px_#00eefc] border border-white z-10 transition-all pointer-events-none"
            style={{
              top: `${fallingNote.progress * 0.7}%`,
              left: `calc(${keyCenterMap[fallingNote.keyIdx]}% - 16px)`,
            }}
          />
        )}

        {/* 3D TACTILE KEYBOARD CONTAINER */}
        <div className="w-full h-[240px] relative bg-[#181820] p-3 rounded-2xl border-4 border-[#282835] shadow-[0_20px_40px_rgba(0,0,0,0.9)] overflow-hidden">
          {/* White keys flex-row container */}
          <div className="w-full h-full flex items-stretch justify-stretch relative z-10">
            {whiteKeys.map((k) => {
              const isPressed = pressedIndex === k.keyIdx;
              return (
                <button
                  key={k.note}
                  onClick={() => handleKeyPress(k.keyIdx, k as any)}
                  className={`flex-1 h-full bg-gradient-to-b from-[#fff] via-[#eee] to-[#ddd] border-x border-b-8 border-gray-400 rounded-b-xl shadow-[0_12px_20px_rgba(0,0,0,0.5)] transition-all flex items-end justify-center pb-3 active:scale-95 ${
                    isPressed
                      ? 'translate-y-2 border-b-2 bg-secondary text-black shadow-inner border-secondary'
                      : 'hover:bg-gray-100'
                  }`}
                >
                  <span className="text-xs font-bold font-label-caps text-gray-800">{k.note}</span>
                </button>
              );
            })}
          </div>

          {/* Black keys absolute overlay on top */}
          {blackKeys.map((k) => {
            const isPressed = pressedIndex === k.keyIdx;
            return (
              <button
                key={k.note}
                onClick={() => handleKeyPress(k.keyIdx, k as any)}
                className={`absolute h-32 w-[7%] bg-gradient-to-b from-[#111] via-[#222] to-[#000] border-t-2 border-x border-gray-700 rounded-b-lg shadow-[0_10px_15px_rgba(0,0,0,0.8)] z-20 transition-all active:scale-95 ${
                  isPressed ? 'translate-y-2 shadow-none border-secondary bg-secondary' : ''
                }`}
                style={{
                  left: k.leftOffset,
                  transform: 'translateX(-50%)',
                }}
              >
                <span className="text-[9px] font-bold text-gray-400 absolute bottom-2 left-1/2 -translate-x-1/2">
                  {k.note}
                </span>
              </button>
            );
          })}
        </div>
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
    </div>
  );
};
