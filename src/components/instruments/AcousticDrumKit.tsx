import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { usePachanga, Song } from '../../context/PachangaContext';

type DrumZone = 'hihat' | 'snare' | 'hightom' | 'kick' | 'floortom' | 'crash';

type FallingNote = {
  id: string;
  laneIdx: number; // 0 to 5
  zone: DrumZone;
  progress: number; // 0 to 100%
  color: string;
  autoAudible?: boolean;
};

type Shockwave = {
  id: number;
  xPercent: number;
  yPercent: number;
  color: string;
};

type Props = {
  onPlayDrum: (zone: DrumZone, accuracy: number) => void;
  score: number;
  feedbacks: { id: number; text: string; color: string; x: number; y: number }[];
  isDemoMode?: boolean;
};

export const AcousticDrumKit: React.FC<Props> = ({ onPlayDrum, feedbacks, isDemoMode = false }) => {
  const { videoCurrentTime, isPlaying, difficulty, nowPlaying } = usePachanga();
  const autoHitNotesRef = useRef<Set<string>>(new Set());

  // Bouncing state for visual strike feedback on each physical upper piece
  const [bouncing, setBouncing] = useState<Record<DrumZone, boolean>>({
    hihat: false,
    snare: false,
    hightom: false,
    kick: false,
    floortom: false,
    crash: false,
  });

  // Shockwave ring effects on physical upper stage
  const [shockwaves, setShockwaves] = useState<Shockwave[]>([]);

  // Active lower button flash state
  const [buttonActive, setButtonActive] = useState<Record<DrumZone, boolean>>({
    hihat: false,
    snare: false,
    hightom: false,
    kick: false,
    floortom: false,
    crash: false,
  });

  // Vector Drumsticks Position (flies to target physical upper piece)
  const [leftStick, setLeftStick] = useState<{ xPercent: number; yPercent: number; hitting: boolean }>({
    xPercent: 20,
    yPercent: 50,
    hitting: false,
  });
  const [rightStick, setRightStick] = useState<{ xPercent: number; yPercent: number; hitting: boolean }>({
    xPercent: 80,
    yPercent: 50,
    hitting: false,
  });

  const [notes, setNotes] = useState<FallingNote[]>([]);
  const requestRef = useRef<number | null>(null);

  // 6 Kit Pieces configuration with geometric center percentages for 90° vertical alignment
  const kitPieces: {
    id: DrumZone;
    label: string;
    sublabel: string;
    icon: string;
    color: string;
    handGroup: 'left' | 'right';
    centerXPercent: number; // Geometric X center percentage for 90° vertical alignment
    stageCoords: { x: number; y: number }; // Upper background illustration coords
  }[] = [
    {
      id: 'hihat',
      label: 'Hi-Hat',
      sublabel: 'Platillo Izq',
      icon: '🔔',
      color: '#00eefc',
      handGroup: 'left',
      centerXPercent: 8.33,
      stageCoords: { x: 14, y: 32 },
    },
    {
      id: 'snare',
      label: 'Tarola',
      sublabel: 'Redoblante',
      icon: '🥁',
      color: '#ff00ff',
      handGroup: 'left',
      centerXPercent: 25.0,
      stageCoords: { x: 28, y: 60 },
    },
    {
      id: 'hightom',
      label: 'Tom Alto',
      sublabel: 'Tom Agudo',
      icon: '🪘',
      color: '#ffff00',
      handGroup: 'left',
      centerXPercent: 41.67,
      stageCoords: { x: 42, y: 38 },
    },
    {
      id: 'kick',
      label: 'Bombo',
      sublabel: 'Gran Bombo',
      icon: '💥',
      color: '#00ff66',
      handGroup: 'right',
      centerXPercent: 58.33,
      stageCoords: { x: 58, y: 68 },
    },
    {
      id: 'floortom',
      label: 'Tom Piso',
      sublabel: 'Tom Grave',
      icon: '🪵',
      color: '#ff9900',
      handGroup: 'right',
      centerXPercent: 75.0,
      stageCoords: { x: 74, y: 58 },
    },
    {
      id: 'crash',
      label: 'Crash',
      sublabel: 'Platillo Der',
      icon: '✨',
      color: '#e066ff',
      handGroup: 'right',
      centerXPercent: 91.67,
      stageCoords: { x: 88, y: 32 },
    },
  ];

  // Song BPM Determination (Tuned to 78 BPM for "Qué fuimos")
  const getSongBpm = (song: Song | null): number => {
    if (!song) return 78;
    const titleLower = song.title.toLowerCase();
    if (titleLower.includes('fuimos') || titleLower.includes('firme')) return 78; // 78 BPM exact
    if (titleLower.includes('chona')) return 152;
    if (titleLower.includes('color de tus ojos')) return 118;
    if (titleLower.includes('despacito')) return 90;
    if (titleLower.includes('cumbia')) return 108;
    return 78;
  };

  const bpm = isDemoMode ? 78 : getSongBpm(nowPlaying);

  // Spawning notes with density graduated by difficulty level
  useEffect(() => {
    if (isDemoMode) {
      // DEMO MODE: "Qué fuimos - Grupo Firme" at 78 BPM (Clean, spaced-out rhythm)
      const interval = setInterval(() => {
        let chosenLaneIdx = 0;
        if (difficulty === 'basic') {
          // Basic: Spaced pattern on Kick and Snare
          chosenLaneIdx = Math.random() > 0.5 ? 3 : 1; // Kick or Snare
        } else if (difficulty === 'intermediate') {
          // Intermediate: Kick, Snare, Hi-Hat
          const opts = [0, 1, 3];
          chosenLaneIdx = opts[Math.floor(Math.random() * opts.length)];
        } else {
          chosenLaneIdx = Math.floor(Math.random() * 6);
        }

        const lane = kitPieces[chosenLaneIdx];
        const newNote: FallingNote = {
          id: `demo_${Date.now()}_${Math.random()}`,
          laneIdx: chosenLaneIdx,
          zone: lane.id,
          progress: 0,
          color: lane.color,
        };
        setNotes((prev) => [...prev.slice(-6), newNote]); // Maximum 6 active notes for visual clarity
      }, 60000 / bpm); // 1 beat interval at 78 BPM for clean readability

      return () => clearInterval(interval);
    } else if (videoCurrentTime > 0 && isPlaying) {
      // Live YouTube track sync
      const beatIndex = Math.floor(videoCurrentTime * (bpm / 60) * 2);

      let chosenLaneIdx = 0;
      const subBeat = beatIndex % 8;

      if (difficulty === 'basic' || difficulty === 'intermediate') {
        // Low density: Only key downbeats and chorus hits (1 or 2 hits per bar)
        if (subBeat === 0) chosenLaneIdx = 3; // Kick on beat 1
        else if (subBeat === 4) chosenLaneIdx = 1; // Snare on beat 3
        else return; // Skip minor sub-beats for clean spacing
      } else if (difficulty === 'advanced') {
        // Fluid rhythm
        if (subBeat === 0 || subBeat === 4) chosenLaneIdx = 3;
        else if (subBeat === 2 || subBeat === 6) chosenLaneIdx = 1;
        else if (beatIndex % 16 === 14) chosenLaneIdx = 2; // Tom fill
        else return;
      } else {
        // PRO / EXPERT / AUTO: Full arrangement
        if (subBeat === 0) chosenLaneIdx = 3;
        else if (subBeat === 2 || subBeat === 6) chosenLaneIdx = 1;
        else if (subBeat === 4) chosenLaneIdx = 3;
        else if (beatIndex % 16 === 14) chosenLaneIdx = Math.random() > 0.5 ? 2 : 4;
        else if (beatIndex % 32 === 0) chosenLaneIdx = 5;
        else chosenLaneIdx = 0;
      }

      const lane = kitPieces[chosenLaneIdx];
      const noteId = `vbeat_${beatIndex}_${lane.id}`;

      setNotes((prev) => {
        if (prev.some((n) => n.id === noteId)) return prev;
        return [
          ...prev.slice(-6),
          {
            id: noteId,
            laneIdx: chosenLaneIdx,
            zone: lane.id,
            progress: 0,
            color: lane.color,
          },
        ];
      });
    }
  }, [isDemoMode, Math.floor(videoCurrentTime * (bpm / 60) * 2), isPlaying, bpm, difficulty]);

  // Request Animation Loop for 100% Vertical Fall
  useEffect(() => {
    let lastTime = performance.now();
    const updateNotes = (now: number) => {
      const delta = (now - lastTime) / 1000;
      lastTime = now;

      if (isPlaying || isDemoMode) {
        setNotes((prevNotes) => {
          const updated = prevNotes
            .map((n) => ({
              ...n,
              progress: n.progress + delta * 42, // Smooth, legible vertical speed
            }))
            .filter((n) => n.progress <= 110);

          // BÁSICO MODE: 100% Volume Real Auto-Play on reach so the band never fails!
          if (difficulty === 'basic') {
            updated.forEach((n) => {
              if (n.progress >= 88 && n.progress <= 96 && !n.autoAudible) {
                n.autoAudible = true;
                const zone = n.zone;
                setTimeout(() => {
                  onPlayDrum(zone, 1.0); // 100% volume
                  triggerPhysicalReaction(zone);
                }, 0);
              }
            });
          }

          // AUTO MODE: Auto Perfect
          if (difficulty === 'auto') {
            updated.forEach((n) => {
              if (n.progress >= 90 && !autoHitNotesRef.current.has(n.id)) {
                autoHitNotesRef.current.add(n.id);
                setTimeout(() => {
                  handleCircleTouch(n.zone, true);
                }, 0);
              }
            });

            const activeIds = new Set(updated.map((n) => n.id));
            for (const id of autoHitNotesRef.current) {
              if (!activeIds.has(id)) {
                autoHitNotesRef.current.delete(id);
              }
            }
          }

          return updated;
        });
      }

      requestRef.current = requestAnimationFrame(updateNotes);
    };

    requestRef.current = requestAnimationFrame(updateNotes);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isPlaying, isDemoMode, difficulty]);

  // Physical reaction trigger on upper vector background
  const triggerPhysicalReaction = (zone: DrumZone) => {
    const piece = kitPieces.find((p) => p.id === zone);
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

  const handleCircleTouch = (zone: DrumZone, isAutoHit = false) => {
    if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
      try {
        window.navigator.vibrate(25);
      } catch (e) {}
    }

    setButtonActive((prev) => ({ ...prev, [zone]: true }));
    setTimeout(() => setButtonActive((prev) => ({ ...prev, [zone]: false })), 160);

    triggerPhysicalReaction(zone);

    if (isAutoHit) {
      onPlayDrum(zone, 1.0);
      return;
    }

    if (difficulty === 'basic') {
      // In BÁSICO mode, user taps ALWAYS sound 100% PERFECT at full volume!
      onPlayDrum(zone, 1.0);
      return;
    }

    const matchingNote = notes.find((n) => n.zone === zone && n.progress >= 65 && n.progress <= 105);

    let accuracy = 0.5;
    if (matchingNote) {
      const diffProgress = Math.abs(matchingNote.progress - 90);
      if (diffProgress <= 8) accuracy = 1.0;
      else if (diffProgress <= 16) accuracy = 0.8;
      else accuracy = 0.5;

      setNotes((prev) => prev.filter((n) => n.id !== matchingNote.id));
    } else {
      accuracy = 0.8;
    }

    onPlayDrum(zone, accuracy);
  };

  return (
    <div className="relative w-full h-full flex flex-col justify-between items-center overflow-hidden bg-gradient-to-b from-[#080612] via-[#0f0a20] to-[#030208] select-none p-1 md:p-2">
      {/* HEADER */}
      <div className="z-20 text-center my-0.5 shrink-0">
        <span className="font-headline-md font-bold text-[#00FF88] text-sm md:text-lg tracking-wide flex items-center justify-center gap-2 drop-shadow-[0_0_10px_#00ff88]">
          <span>🥁</span> BATERÍA ACÚSTICA VIP — V1.4.8
        </span>
        <p className="text-[9px] md:text-[10px] text-emerald-200/80 font-label-caps uppercase tracking-widest mt-0.5">
          {difficulty === 'basic'
            ? '✨ BÁSICO 100% SIN ERRORES (Volumen 100% Impecable)'
            : difficulty === 'intermediate'
            ? '🥁 INTERMEDIO (Golpes Clave Espaciados)'
            : difficulty === 'advanced'
            ? '⭐ AVANZADO (Momento Estrella)'
            : '🔥 PRO BANDA MASTER (Multiplicador x3)'}
        </p>
      </div>

      {/* BACKGROUND VECTOR ILLUSTRATION OF INSTRUMENT */}
      <div className="absolute inset-x-2 top-10 h-[40%] rounded-2xl bg-black/40 backdrop-blur-xs overflow-hidden z-0 pointer-events-none border border-white/5">
        <div className="relative w-full h-full">
          {/* HI-HAT */}
          <div
            className={`absolute -translate-x-1/2 -translate-y-1/2 transition-transform duration-100 ${
              bouncing.hihat ? 'scale-125 rotate-6' : 'scale-100'
            }`}
            style={{ left: `${kitPieces[0].stageCoords.x}%`, top: `${kitPieces[0].stageCoords.y}%` }}
          >
            <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-gradient-to-tr from-amber-600 via-yellow-400 to-amber-200 border border-yellow-100 shadow-[0_0_15px_#00eefc] flex items-center justify-center">
              <div className="w-3 h-3 rounded-full bg-black/80" />
            </div>
          </div>

          {/* TAROLA / SNARE */}
          <div
            className={`absolute -translate-x-1/2 -translate-y-1/2 transition-transform duration-100 ${
              bouncing.snare ? 'scale-125 -rotate-6' : 'scale-100'
            }`}
            style={{ left: `${kitPieces[1].stageCoords.x}%`, top: `${kitPieces[1].stageCoords.y}%` }}
          >
            <div className="w-14 h-14 md:w-18 md:h-18 rounded-full bg-gradient-to-b from-slate-100 via-gray-200 to-slate-300 border-2 border-fuchsia-500 shadow-[0_0_20px_#ff00ff] flex items-center justify-center">
              <span className="text-lg md:text-xl drop-shadow">🥁</span>
            </div>
          </div>

          {/* TOM ALTO */}
          <div
            className={`absolute -translate-x-1/2 -translate-y-1/2 transition-transform duration-100 ${
              bouncing.hightom ? 'scale-125 -translate-y-1' : 'scale-100'
            }`}
            style={{ left: `${kitPieces[2].stageCoords.x}%`, top: `${kitPieces[2].stageCoords.y}%` }}
          >
            <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-gradient-to-tr from-cyan-900 via-sky-600 to-slate-200 border-2 border-yellow-400 shadow-[0_0_15px_#ffff00] flex items-center justify-center">
              <span className="text-base md:text-lg drop-shadow">🪘</span>
            </div>
          </div>

          {/* KICK / BOMBO */}
          <div
            className={`absolute -translate-x-1/2 -translate-y-1/2 transition-transform duration-100 ${
              bouncing.kick ? 'scale-120' : 'scale-100'
            }`}
            style={{ left: `${kitPieces[3].stageCoords.x}%`, top: `${kitPieces[3].stageCoords.y}%` }}
          >
            <div className="w-20 h-20 md:w-26 md:h-26 rounded-full bg-gradient-to-b from-zinc-900 via-black to-emerald-950 border-3 border-amber-500 shadow-[0_0_25px_#00ff66] flex flex-col items-center justify-center">
              <span className="text-xl md:text-2xl drop-shadow">💥</span>
              <span className="text-[7px] md:text-[9px] font-black text-amber-400 uppercase tracking-widest text-center mt-0.5">
                BENJUME
              </span>
            </div>
          </div>

          {/* TOM PISO */}
          <div
            className={`absolute -translate-x-1/2 -translate-y-1/2 transition-transform duration-100 ${
              bouncing.floortom ? 'scale-125 translate-y-1' : 'scale-100'
            }`}
            style={{ left: `${kitPieces[4].stageCoords.x}%`, top: `${kitPieces[4].stageCoords.y}%` }}
          >
            <div className="w-14 h-14 md:w-18 md:h-18 rounded-full bg-gradient-to-tr from-amber-900 via-orange-800 to-slate-200 border-2 border-amber-400 shadow-[0_0_15px_#ff9900] flex items-center justify-center">
              <span className="text-lg md:text-xl drop-shadow">🪵</span>
            </div>
          </div>

          {/* CRASH */}
          <div
            className={`absolute -translate-x-1/2 -translate-y-1/2 transition-transform duration-100 ${
              bouncing.crash ? 'scale-125 -rotate-6' : 'scale-100'
            }`}
            style={{ left: `${kitPieces[5].stageCoords.x}%`, top: `${kitPieces[5].stageCoords.y}%` }}
          >
            <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-gradient-to-tr from-purple-700 via-yellow-300 to-amber-100 border border-purple-300 shadow-[0_0_15px_#e066ff] flex items-center justify-center">
              <div className="w-3 h-3 rounded-full bg-purple-950" />
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

          {/* VECTOR DRUMSTICKS */}
          <div
            className={`absolute pointer-events-none z-30 transition-all duration-100 -translate-x-1/2 -translate-y-1/2 ${
              leftStick.hitting ? 'scale-130 -rotate-45' : 'scale-100 -rotate-12'
            }`}
            style={{ left: `${leftStick.xPercent}%`, top: `${leftStick.yPercent}%` }}
          >
            <div className="w-12 h-1.5 bg-gradient-to-r from-amber-200 via-amber-400 to-amber-100 rounded-full border border-amber-800 shadow-xl" />
          </div>

          <div
            className={`absolute pointer-events-none z-30 transition-all duration-100 -translate-x-1/2 -translate-y-1/2 ${
              rightStick.hitting ? 'scale-130 rotate-45' : 'scale-100 rotate-12'
            }`}
            style={{ left: `${rightStick.xPercent}%`, top: `${rightStick.yPercent}%` }}
          >
            <div className="w-12 h-1.5 bg-gradient-to-r from-amber-100 via-amber-400 to-amber-200 rounded-full border border-amber-800 shadow-xl" />
          </div>
        </div>
      </div>

      {/* 90° VERTICAL RHYTHM LANES DIRECTLY ALIGNED TO CIRCULAR BUTTON CENTERS */}
      <div className="absolute inset-x-0 top-[12%] bottom-[16%] pointer-events-none z-10">
        {kitPieces.map((lane) => {
          const laneNotes = notes.filter((n) => n.laneIdx === kitPieces.findIndex((p) => p.id === lane.id));

          return (
            <React.Fragment key={lane.id}>
              {/* 90° VERTICAL STRAIGHT GUIDELINE */}
              <div
                className="absolute top-0 bottom-0 w-0.5 -translate-x-1/2 bg-gradient-to-b from-transparent via-white/10 to-emerald-400/50"
                style={{ left: `${lane.centerXPercent}%` }}
              />

              {/* FALLING RHYTHM NOTES */}
              {laneNotes.map((note) => {
                const approachScale = Math.max(1.0, 2.5 - (note.progress / 90) * 1.5);

                return (
                  <div
                    key={note.id}
                    className="absolute -translate-x-1/2 z-20 flex items-center justify-center"
                    style={{
                      left: `${lane.centerXPercent}%`,
                      top: `${note.progress}%`,
                    }}
                  >
                    {/* CONTRACTING APPROACH CIRCLE */}
                    <div
                      className="absolute rounded-full border-2 transition-transform duration-75"
                      style={{
                        width: '56px',
                        height: '56px',
                        borderColor: note.color,
                        transform: `scale(${approachScale})`,
                        boxShadow: `0 0 15px ${note.color}`,
                        opacity: note.progress >= 95 ? 0.2 : 0.85,
                      }}
                    />

                    {/* NOTE ORB */}
                    <div
                      className="w-10 h-10 rounded-full border-2 border-white flex items-center justify-center shadow-lg text-black font-black text-xs"
                      style={{
                        backgroundColor: note.color,
                        boxShadow: `0 0 18px ${note.color}`,
                      }}
                    >
                      <span className="drop-shadow">{lane.icon}</span>
                    </div>
                  </div>
                );
              })}
            </React.Fragment>
          );
        })}
      </div>

      {/* LOWER HALF: ROW OF LARGE CIRCULAR BUTTONS */}
      <div className="relative w-full h-[52%] flex flex-col justify-end px-1 pb-3 z-20">
        {/* HAND INDICATORS */}
        <div className="flex justify-between items-center px-6 mb-2 text-[10px] font-label-caps font-bold text-emerald-300/90 uppercase tracking-widest">
          <span>👍 PULGAR IZQUIERDO</span>
          <span>PULGAR DERECHO 👍</span>
        </div>

        {/* 6 CIRCULAR BUTTONS ROW */}
        <div className="w-full grid grid-cols-6 gap-1 md:gap-3 items-center justify-items-center">
          {kitPieces.map((piece) => {
            const isActive = buttonActive[piece.id];
            const matchingNote = notes.find((n) => n.zone === piece.id && n.progress >= 20 && n.progress <= 92);
            const fillPercent = matchingNote ? Math.min(100, Math.max(0, matchingNote.progress)) : 0;

            return (
              <div key={piece.id} className="relative flex flex-col items-center justify-center">
                {/* CONTRACTING APPROACH RING ON BUTTON */}
                <div
                  className="absolute rounded-full border-2 pointer-events-none transition-transform duration-75"
                  style={{
                    width: '68px',
                    height: '68px',
                    borderColor: piece.color,
                    transform: fillPercent > 0 ? `scale(${Math.max(1.0, 2.2 - (fillPercent / 90) * 1.2)})` : 'scale(1.0)',
                    opacity: fillPercent > 0 ? 0.9 : 0.2,
                    boxShadow: `0 0 12px ${piece.color}`,
                  }}
                />

                {/* LARGE CIRCULAR BUTTON */}
                <button
                  onClick={() => handleCircleTouch(piece.id)}
                  className={`relative w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-full border-3 flex flex-col items-center justify-center touch-none transition-all active:scale-90 ${
                    isActive
                      ? 'scale-115 border-white bg-white/50 shadow-[0_0_35px_#00ff88]'
                      : 'bg-gradient-to-b from-gray-800 via-gray-900 to-black hover:border-white'
                  }`}
                  style={{
                    borderColor: isActive ? '#ffffff' : piece.color,
                    boxShadow: isActive ? `0 0 30px ${piece.color}` : `0 6px 20px rgba(0,0,0,0.8), inset 0 0 12px ${piece.color}33`,
                  }}
                >
                  {/* INNER NEON FILL RING */}
                  <div
                    className="absolute inset-1 rounded-full border-2 pointer-events-none transition-all"
                    style={{
                      borderColor: piece.color,
                      opacity: isActive ? 1 : 0.4,
                      background: fillPercent > 0 ? `radial-gradient(circle, ${piece.color}44 0%, transparent 70%)` : 'transparent',
                    }}
                  />

                  <span className="relative z-10 text-xl md:text-2xl drop-shadow">{piece.icon}</span>
                  <span
                    className="relative z-10 font-black text-[9px] md:text-[11px] uppercase tracking-wider text-center truncate max-w-[90%] mt-0.5"
                    style={{ color: piece.color }}
                  >
                    {piece.label}
                  </span>
                </button>

                <span className="text-[8px] text-gray-400 font-mono font-bold mt-1">
                  {piece.handGroup === 'left' ? '👍 Izq' : '👍 Der'}
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
