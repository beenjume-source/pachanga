import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { usePachanga } from '../../context/PachangaContext';

type Props = {
  onPlayGuitar: (noteFreq: number, isBass: boolean, accuracy: number) => void;
  score: number;
  feedbacks: { id: number; text: string; color: string; x: number; y: number }[];
  isDemoMode?: boolean;
};

export const GuitarBassSimulator: React.FC<Props> = ({ onPlayGuitar, feedbacks, isDemoMode = false }) => {
  const { videoCurrentTime, isPlaying, difficulty } = usePachanga();
  const [isBass, setIsBass] = useState<boolean>(false);
  const [activeFret, setActiveFret] = useState<{ stringIdx: number; fretIdx: number } | null>({ stringIdx: 2, fretIdx: 3 });
  const [strumVibrating, setStrumVibrating] = useState<boolean[]>(Array(6).fill(false));

  // Progressive visual guide state (1 sec warning before impact)
  const [target, setTarget] = useState<{ stringIdx: number; fretIdx: number; color: string }>({
    stringIdx: 2,
    fretIdx: 3,
    color: '#00eefc',
  });
  const [warningPhase, setWarningPhase] = useState<boolean>(true); // true = 30% dim warning, false = 100% thick impact

  const strumAreaRef = useRef<HTMLDivElement>(null);
  const isSwipingRef = useRef<boolean>(false);
  const lastYRef = useRef<number | null>(null);

  const stringFreqs = isBass
    ? [41.2, 55.0, 73.4, 98.0]
    : [82.4, 110.0, 146.8, 196.0, 246.9, 329.6];

  const [noteProgress, setNoteProgress] = useState<number>(0);

  // Rotate target fret notes periodically with 1-second warning ring phase
  const targetStartTimeRef = useRef<number>(0);
  const basicAudibleRef = useRef<boolean>(false);

  useEffect(() => {
    if (!isPlaying && !isDemoMode) return;

    if (isDemoMode) {
      const interval = setInterval(() => {
        const randomString = Math.floor(Math.random() * (isBass ? 4 : 6));
        const randomFret = Math.floor(Math.random() * 4) + 1;
        const colors = ['#00eefc', '#ecb2ff', '#ffff00', '#00ff66'];
        const chosenColor = colors[Math.floor(Math.random() * colors.length)];

        setTarget({ stringIdx: randomString, fretIdx: randomFret, color: chosenColor });
        setWarningPhase(true);
        targetStartTimeRef.current = Date.now();
        basicAudibleRef.current = false;
        setNoteProgress(0);

        setTimeout(() => {
          setWarningPhase(false);
        }, 800);
      }, 1000);

      return () => clearInterval(interval);
    } else {
      const beatIndex = Math.floor(videoCurrentTime * 0.5);
      const randomString = beatIndex % (isBass ? 4 : 6);
      const randomFret = (beatIndex % 4) + 1;
      const colors = ['#00eefc', '#ecb2ff', '#ffff00', '#00ff66'];
      const chosenColor = colors[beatIndex % colors.length];

      setTarget({ stringIdx: randomString, fretIdx: randomFret, color: chosenColor });
      setWarningPhase(true);
      targetStartTimeRef.current = Date.now();
      basicAudibleRef.current = false;
      setNoteProgress(0);

      const timer = setTimeout(() => {
        setWarningPhase(false);
        if (difficulty === 'auto') {
          setActiveFret({ stringIdx: randomString, fretIdx: randomFret });
          setTimeout(() => {
            executeStrum(true);
          }, 0);
          setTimeout(() => {
            setActiveFret(null);
          }, 250);
        }
      }, 800);

      return () => clearTimeout(timer);
    }
  }, [isDemoMode, Math.floor(videoCurrentTime * 0.5), isBass, isPlaying, difficulty]);

  // RequestAnimationFrame loop for high-precision sliding note progress
  useEffect(() => {
    if (!isPlaying && !isDemoMode) return;
    let animId: number;

    const update = () => {
      const elapsed = Date.now() - targetStartTimeRef.current;
      const progress = Math.min((elapsed / 800) * 100, 100);
      setNoteProgress(progress);

      if (difficulty === 'basic' && progress >= 95 && !basicAudibleRef.current) {
        basicAudibleRef.current = true;
        const freq = stringFreqs[target.stringIdx] || 220;
        const b = isBass;
        setTimeout(() => {
          onPlayGuitar(freq, b, 1.0);
        }, 0);
      }

      if (progress < 100) {
        animId = requestAnimationFrame(update);
      }
    };

    animId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(animId);
  }, [target, isPlaying, isDemoMode]);

  const executeStrum = (isAutoHit: boolean = false) => {
    let accuracy = 0.0;

    if (isAutoHit) {
      accuracy = 1.0;
    } else {
      const elapsedMs = Date.now() - targetStartTimeRef.current;
      // Perfect impact time is 800ms
      const diffMs = Math.abs(elapsedMs - 800);

      if (activeFret && activeFret.stringIdx === target.stringIdx && activeFret.fretIdx === target.fretIdx) {
        if (diffMs <= 50) {
          accuracy = 1.0; // PERFECT
        } else if (diffMs <= 120) {
          accuracy = 0.6; // BIEN
        } else {
          accuracy = 0.0; // MISS
        }
      } else {
        accuracy = 0.0; // MISS
      }
    }

    const baseFreq = stringFreqs[activeFret ? activeFret.stringIdx : target.stringIdx] || 196.0;
    const fretMult = Math.pow(2, (activeFret ? activeFret.fretIdx : 0) / 12);
    const finalFreq = baseFreq * fretMult;

    setStrumVibrating(Array(6).fill(true));
    setTimeout(() => {
      setStrumVibrating(Array(6).fill(false));
    }, 250);

    onPlayGuitar(finalFreq, isBass, accuracy);
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    isSwipingRef.current = true;
    lastYRef.current = e.clientY;
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isSwipingRef.current || lastYRef.current === null) return;
    const deltaY = Math.abs(e.clientY - lastYRef.current);
    if (deltaY > 18) {
      lastYRef.current = e.clientY;
      executeStrum();
    }
  };

  const handlePointerUp = () => {
    isSwipingRef.current = false;
    lastYRef.current = null;
  };

  return (
    <div className="relative w-full h-full flex flex-col justify-between overflow-hidden bg-gradient-to-r from-[#120a1c] via-[#1a1129] to-[#0f0b18] select-none">
      {/* HEADER */}
      <div className="flex justify-between items-center p-3 px-6 z-20 bg-black/40 backdrop-blur-md border-b border-white/10">
        <div className="flex gap-2 items-center">
          <span className="material-symbols-outlined text-secondary text-2xl">graphic_eq</span>
          <span className="font-headline-md font-bold text-white text-base">
            {isBass ? 'BAJO ELÉCTRICO' : 'GUITARRA RÍTMICA'}
          </span>
        </div>

        <button
          onClick={() => setIsBass(!isBass)}
          className="px-4 py-1.5 rounded-full text-xs font-label-caps uppercase font-bold tracking-wider bg-secondary/20 text-secondary border border-secondary/40 hover:bg-secondary/30 transition-all active:scale-95"
        >
          {isBass ? 'Cambiar a Guitarra' : 'Cambiar a Bajo'}
        </button>
      </div>

      {/* MAIN INSTRUMENT AREA */}
      <div className="flex-1 flex w-full relative overflow-hidden">
        {/* FRETBOARD */}
        <div className="w-[62%] h-full relative border-r-4 border-yellow-700/60 bg-[#1e130c] shadow-[inset_0_0_50px_rgba(0,0,0,0.9)] flex flex-col justify-center py-4">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(60,35,15,0.4),rgba(15,8,4,0.9))] pointer-events-none" />

          {/* Frets */}
          {[1, 2, 3, 4, 5].map((fret) => (
            <div
              key={fret}
              className="absolute top-0 bottom-0 w-1.5 bg-gradient-to-b from-gray-300 via-gray-100 to-gray-400 shadow-[2px_0_5px_rgba(0,0,0,0.8)] z-10"
              style={{ left: `${fret * 20}%` }}
            >
              <span className="absolute bottom-2 text-[10px] text-gray-500 font-bold -translate-x-1/2 left-1/2">
                {fret}
              </span>
            </div>
          ))}

          {/* Strings with Progressive Visual Guide */}
          <div className="w-full h-full flex flex-col justify-around relative z-20 px-2">
            {(isBass ? [0, 1, 2, 3] : [0, 1, 2, 3, 4, 5]).map((stringIdx) => {
              const isTargetString = target.stringIdx === stringIdx;

              return (
                <div key={stringIdx} className="w-full relative flex items-center h-10">
                  {/* String Graphic (Changes thickness & neon intensity based on progressive guide phase) */}
                  <div
                    className={`w-full transition-all ${
                      strumVibrating[stringIdx] ? 'animate-bounce' : ''
                    }`}
                    style={{
                      height: isTargetString
                        ? warningPhase
                          ? '3px' // 30% tenue 1 sec warning
                          : '10px' // 100% thick neon impact moment
                        : `${isBass ? 6 - stringIdx : 5 - stringIdx * 0.6}px`,
                      backgroundColor: isTargetString ? target.color : '#e4e1e6',
                      opacity: isTargetString ? (warningPhase ? 0.35 : 1) : 0.8,
                      boxShadow: isTargetString && !warningPhase ? `0 0 20px ${target.color}` : 'none',
                    }}
                  />

                  {/* Traveling Note Bead (Horizontal Rhythmic Flow) */}
                  {isTargetString && (
                    <div
                      className="absolute w-7 h-7 rounded-full shadow-[0_0_15px_currentColor] z-20 flex items-center justify-center border border-white"
                      style={{
                        left: `${100 - (noteProgress / 100) * (100 - ((target.fretIdx - 1) * 20 + 10))}%`,
                        backgroundColor: target.color,
                        color: target.color,
                        transform: 'translateX(-50%)',
                      }}
                    >
                      <div className="w-2.5 h-2.5 rounded-full bg-white animate-ping" />
                    </div>
                  )}

                  {/* Fret Touch Zones */}
                  {[1, 2, 3, 4, 5].map((fretIdx) => {
                    const isTargetFret = target.stringIdx === stringIdx && target.fretIdx === fretIdx;
                    const isBeingPressed = activeFret?.stringIdx === stringIdx && activeFret?.fretIdx === fretIdx;

                    return (
                      <div
                        key={fretIdx}
                        onClick={() => setActiveFret({ stringIdx, fretIdx })}
                        className="absolute top-0 bottom-0 flex items-center justify-center cursor-pointer z-30"
                        style={{ left: `${(fretIdx - 1) * 20}%`, width: '20%' }}
                      >
                        {/* GUÍA VISUAL PROGRESIVA ANILLO DE AVISO (1 sec warning dim ring vs 100% neon impact) */}
                        {isTargetFret && (
                          <div className="relative flex items-center justify-center">
                            {warningPhase ? (
                              <div
                                className="w-9 h-9 rounded-full border-2 border-dashed animate-spin opacity-50"
                                style={{ borderColor: target.color }}
                              />
                            ) : (
                              <div
                                className="w-12 h-12 rounded-full border-4 flex items-center justify-center animate-ping"
                                style={{ borderColor: target.color, boxShadow: `0 0 25px ${target.color}` }}
                              >
                                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: target.color }} />
                              </div>
                            )}
                          </div>
                        )}

                        {isBeingPressed && !isTargetFret && (
                          <div className="w-7 h-7 rounded-full bg-primary border-2 border-white shadow-[0_0_12px_#ecb2ff] flex items-center justify-center">
                            <div className="w-2 h-2 rounded-full bg-white" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT STRUMMING PAD */}
        <div
          ref={strumAreaRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className="w-[38%] h-full relative bg-gradient-to-br from-[#1a081f] via-[#2a0e35] to-[#110516] flex flex-col items-center justify-center cursor-ns-resize touch-none select-none border-l border-primary/20"
        >
          <div className="mt-6 flex flex-col items-center gap-2 pointer-events-none text-center">
            <span className="material-symbols-outlined text-secondary text-4xl animate-bounce">
              swap_vert
            </span>
            <span className="font-label-caps text-xs uppercase text-secondary font-bold tracking-widest px-3 py-1 rounded-full bg-secondary/10 border border-secondary/30">
              RASGUEA AQUÍ (SWIPE VERTICAL)
            </span>
          </div>

          <button
            onClick={() => executeStrum(false)}
            className="mt-4 px-6 py-2 rounded-full bg-primary/20 border border-primary text-primary font-bold text-xs uppercase tracking-wider active:scale-95 transition-transform"
          >
            Rasguear Tap
          </button>
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
