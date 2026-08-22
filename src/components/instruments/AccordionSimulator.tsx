import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { usePachanga } from '../../context/PachangaContext';

type Props = {
  onPlayAccordion: (freq: number, accuracy: number) => void;
  feedbacks: { id: number; text: string; color: string; x: number; y: number }[];
  isDemoMode?: boolean;
};

type FallingNote = {
  id: number;
  laneIdx: number;
  progress: number;
  label: string;
};

export const AccordionSimulator: React.FC<Props> = ({ onPlayAccordion, feedbacks, isDemoMode = false }) => {
  const { videoCurrentTime, difficulty, isPlaying } = usePachanga();
  const [bellowsWidth, setBellowsWidth] = useState<number>(100);
  const [activeKey, setActiveKey] = useState<number | null>(null);
  const [fallingNotes, setFallingNotes] = useState<FallingNote[]>([]);
  const lastSpawnTimeRef = useRef<number>(0);

  const dragStartRef = useRef<number | null>(null);

  // Accordion Treble Keys (Right) C4 to C5
  const trebleNotes = [
    { name: 'DO', freq: 261.63, isBlack: false },
    { name: 'DO#', freq: 277.18, isBlack: true },
    { name: 'RE', freq: 293.66, isBlack: false },
    { name: 'RE#', freq: 311.13, isBlack: true },
    { name: 'MI', freq: 329.63, isBlack: false },
    { name: 'FA', freq: 349.23, isBlack: false },
    { name: 'FA#', freq: 369.99, isBlack: true },
    { name: 'SOL', freq: 392.0, isBlack: false },
    { name: 'SOL#', freq: 415.3, isBlack: true },
    { name: 'LA', freq: 440.0, isBlack: false },
    { name: 'SI', freq: 493.88, isBlack: false },
    { name: 'DO5', freq: 523.25, isBlack: false },
  ];

  // Bass Buttons (Left)
  const bassButtons = [
    { name: 'C Bass', freq: 130.81 },
    { name: 'G Bass', freq: 196.0 },
    { name: 'D Bass', freq: 146.83 },
    { name: 'F Bass', freq: 174.61 },
  ];

  // Automatic accordion player on beats in AUTO mode
  useEffect(() => {
    if (difficulty !== 'auto' || videoCurrentTime <= 0) return;

    const beatIndex = Math.floor(videoCurrentTime * 2);
    const keyIdx = beatIndex % trebleNotes.length;

    setActiveKey(keyIdx);
    setBellowsWidth(beatIndex % 2 === 0 ? 70 : 140);

    const timer = setTimeout(() => {
      setActiveKey(null);
      setBellowsWidth(100);
    }, 250);

    onPlayAccordion(trebleNotes[keyIdx].freq, 1.0);

    return () => clearTimeout(timer);
  }, [Math.floor(videoCurrentTime * 2), difficulty]);

  // Falling notes continuous animation loop for Accordion
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();

      if ((isPlaying || isDemoMode) && now - lastSpawnTimeRef.current > 650) {
        lastSpawnTimeRef.current = now;
        const laneIdx = Math.floor(Math.random() * 4);
        const labels = ['Cumbia', 'Norteño', 'Huapango', 'Zapateado'];
        const randomLabel = labels[laneIdx % labels.length];

        setFallingNotes((prev) => [
          ...prev.slice(-12),
          {
            id: now + Math.random(),
            laneIdx,
            progress: 0,
            label: randomLabel,
          },
        ]);
      }

      if (isPlaying || isDemoMode) {
        setFallingNotes((prev) => {
          if (difficulty === 'basic') {
            prev.forEach((n: any) => {
              if (!n.autoAudible && n.progress >= 78 && n.progress <= 88) {
                n.autoAudible = true;
                const note = trebleNotes[n.laneIdx % trebleNotes.length];
                if (note) {
                  const freq = note.freq;
                  setTimeout(() => {
                    onPlayAccordion(freq, 1.0);
                  }, 0);
                }
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

  const triggerNote = (freq: number, idx: number) => {
    setActiveKey(idx);
    setTimeout(() => setActiveKey(null), 220);
    setBellowsWidth((w) => (w > 110 ? 80 : 130));
    setTimeout(() => setBellowsWidth(100), 180);

    // Check hit on falling notes
    let accuracy = 0.5;
    let hitNoteId: number | null = null;

    fallingNotes.forEach((n) => {
      if (n.progress >= 65 && n.progress <= 95) {
        hitNoteId = n.id;
        accuracy = n.progress >= 75 && n.progress <= 88 ? 1.0 : 0.8;
      }
    });

    if (hitNoteId) {
      setFallingNotes((prev) => prev.filter((n) => n.id !== hitNoteId));
    }

    onPlayAccordion(freq, accuracy);
  };

  return (
    <div className="relative w-full h-full flex flex-col justify-between items-center overflow-hidden bg-gradient-to-b from-[#180a06] via-[#261009] to-[#0f0502] select-none p-3">
      {/* HEADER */}
      <div className="z-20 text-center my-1">
        <span className="font-headline-md font-bold text-orange-400 text-lg md:text-xl tracking-wide flex items-center justify-center gap-2">
          <span className="material-symbols-outlined text-orange-300">waves</span>
          ACORDEÓN DE FIESTA
        </span>
        <p className="text-[11px] text-orange-200/70 font-label-caps uppercase tracking-widest mt-0.5">
          Bajos a la Izquierda | Fuelle Interactivo en el Centro | Teclas Melódicas a la Derecha
        </p>
      </div>

      {/* RHYTHMIC FALLING NOTES OVERLAY LANES FOR ACCORDION */}
      <div className="absolute inset-0 z-10 pointer-events-none flex justify-center items-center">
        <div className="w-full max-w-lg h-full relative flex justify-around px-4">
          {[0, 1, 2, 3].map((idx) => (
            <div
              key={idx}
              className="w-16 h-full border-x border-orange-500/10 bg-gradient-to-b from-transparent via-orange-500/5 to-orange-500/20 relative"
            >
              <div className="absolute bottom-20 left-0 right-0 h-10 border-y-2 border-orange-400 bg-orange-400/20 flex items-center justify-center shadow-[0_0_15px_#ff7700]">
                <span className="text-[9px] font-label-caps text-orange-300 font-bold uppercase tracking-widest">
                  Teclas
                </span>
              </div>

              {fallingNotes
                .filter((n) => n.laneIdx === idx)
                .map((n) => (
                  <div
                    key={n.id}
                    className="absolute left-1/2 -translate-x-1/2 w-11 h-11 rounded-full bg-gradient-to-tr from-orange-500 to-amber-300 border-2 border-yellow-100 flex items-center justify-center shadow-[0_0_15px_#ff7700] text-black font-black text-[10px]"
                    style={{ top: `${n.progress}%` }}
                  >
                    <span>🪗 {n.label}</span>
                  </div>
                ))}
            </div>
          ))}
        </div>
      </div>

      {/* ANATOMICALLY REALISTIC THREE-SECTION ACCORDION */}
      <div className="relative w-full max-w-2xl flex-1 flex items-center justify-center py-2 px-2 z-20">
        <div className="w-full flex items-center justify-center h-[260px] sm:h-[300px]">
          
          {/* 1. LEFT SECTION: BASS BUTTON BOARD (BOTONERA DE BAJOS) */}
          <div className="w-28 sm:w-36 h-full bg-gradient-to-br from-[#3b1208] via-[#591b0b] to-[#240a04] rounded-l-2xl border-2 border-amber-600/60 shadow-[0_0_20px_rgba(0,0,0,0.8)] p-2 flex flex-col items-center justify-center gap-2 z-20">
            <span className="font-label-caps text-[10px] text-amber-300/80 uppercase tracking-wider font-bold">
              Bajos
            </span>

            <div className="grid grid-cols-2 gap-2 w-full">
              {bassButtons.map((b, idx) => (
                <button
                  key={b.name}
                  onClick={() => triggerNote(b.freq, 100 + idx)}
                  className={`h-12 rounded-full border-2 border-amber-300/60 bg-gradient-to-tr from-amber-700 to-amber-400 flex items-center justify-center font-bold text-xs text-black shadow-md active:scale-90 transition-all ${
                    activeKey === 100 + idx ? 'ring-4 ring-orange-300 scale-95' : ''
                  }`}
                >
                  {b.name.slice(0, 1)}
                </button>
              ))}
            </div>
          </div>

          {/* 2. CENTER SECTION: INTERACTIVE BELLOWS (FUELLE PLEO) */}
          <div
            style={{ width: `${bellowsWidth}px` }}
            className="h-full bg-gradient-to-r from-orange-950 via-amber-900 to-orange-950 border-y-4 border-amber-500 flex items-center justify-between px-1 overflow-hidden transition-all duration-150 shadow-[0_0_25px_rgba(255,120,0,0.4)] z-10"
          >
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="h-full w-2 bg-gradient-to-b from-amber-200 via-orange-600 to-amber-800 shadow-inner rounded-sm"
              />
            ))}
          </div>

          {/* 3. RIGHT SECTION: TREBLE KEYBOARD (DIAPASÓN / TECLADO DE MELODÍA) */}
          <div className="flex-1 h-full bg-gradient-to-br from-[#3b1208] via-[#591b0b] to-[#240a04] rounded-r-2xl border-2 border-amber-600/60 shadow-[0_0_20px_rgba(0,0,0,0.8)] p-2 flex items-center justify-center relative z-20 overflow-x-auto">
            <div className="flex h-full w-full justify-center items-stretch gap-1 relative">
              {trebleNotes.map((note, idx) => (
                <button
                  key={note.name + idx}
                  onClick={() => triggerNote(note.freq, idx)}
                  className={`flex-1 rounded-b-xl border flex flex-col justify-end pb-2 items-center font-bold text-[10px] transition-all active:scale-95 ${
                    note.isBlack
                      ? 'bg-black text-amber-300 border-amber-700 h-3/5 z-30 shadow-lg'
                      : 'bg-gradient-to-b from-amber-100 to-amber-300 text-black border-amber-400 h-full z-10 shadow-md'
                  } ${activeKey === idx ? 'bg-orange-400 ring-2 ring-white' : ''}`}
                >
                  <span>{note.name}</span>
                </button>
              ))}
            </div>
          </div>

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
