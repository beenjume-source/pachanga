import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePachanga, DifficultyLevel } from '../context/PachangaContext';
import { useWebAudioSynth } from '../hooks/useWebAudioSynth';
import { BrandingHeader } from './BrandingHeader';
import { AcousticDrumKit } from './instruments/AcousticDrumKit';
import { TimbalSimulator } from './instruments/TimbalSimulator';

type InstrumentType = 'drums' | 'guitar' | 'piano' | 'trumpet' | 'accordion' | 'timbal';

export const MobileDrumPad: React.FC = () => {
  const navigate = useNavigate();
  const {
    difficulty,
    setDifficulty,
    score,
    updateScore,
    isPlaying,
    roomCode,
    addPlayer,
    connectedPeersCount,
    peerConnectionStatus,
    isSoloMode,
    myPlayer,
  } = usePachanga();

  const synth = useWebAudioSynth();

  // Local states for musician name & selected instrument
  const [musicianName, setMusicianName] = useState<string>(myPlayer?.name || 'Músico VIP');
  const [activeInstrument, setActiveInstrument] = useState<InstrumentType>('drums');

  // Feedbacks visuales de puntaje
  const [feedbacks, setFeedbacks] = useState<
    { id: number; text: string; color: string; x: number; y: number }[]
  >([]);

  // Demo Practice Mode states
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);
  const [demoTimeLeft, setDemoTimeLeft] = useState<number>(30);
  const [demoScore, setDemoScore] = useState<number>(0);

  // Demo 30-second countdown timer
  useEffect(() => {
    if (!isDemoMode) return;
    const timer = setInterval(() => {
      setDemoTimeLeft((prev) => {
        if (prev <= 1) {
          setIsDemoMode(false);
          return 30;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isDemoMode]);

  const addFeedback = (text: string, color: string) => {
    const fbId = Date.now() + Math.random();
    const newFb = {
      id: fbId,
      text,
      color,
      x: (Math.random() - 0.5) * 120,
      y: (Math.random() - 0.5) * 60,
    };
    setFeedbacks((prev) => [...prev.slice(-3), newFb]);

    setTimeout(() => {
      setFeedbacks((prev) => prev.filter((f) => f.id !== fbId));
    }, 600);
  };

  // Dispatch sound triggers for instruments
  const handleInstrumentSound = (zoneOrNote: string, accuracy: number) => {
    let soundTrigger = (v: number) => {
      synth.playKick(v);
    };

    if (activeInstrument === 'drums') {
      if (zoneOrNote === 'kick') soundTrigger = (v = 1.0) => synth.playKick(v);
      else if (zoneOrNote === 'snare') soundTrigger = (v = 1.0) => synth.playSnare(v);
      else if (zoneOrNote === 'hihat') soundTrigger = (v = 1.0) => synth.playHiHat(v);
      else if (zoneOrNote === 'hightom') soundTrigger = (v = 1.0) => synth.playTom('high', v);
      else if (zoneOrNote === 'floortom') soundTrigger = (v = 1.0) => synth.playTom('floor', v);
      else if (zoneOrNote === 'crash') soundTrigger = (v = 1.0) => synth.playCrash(v);
    } else if (activeInstrument === 'timbal') {
      if (zoneOrNote === 'macho') soundTrigger = (v = 1.0) => synth.playTimbalMacho(v);
      else if (zoneOrNote === 'hembra') soundTrigger = (v = 1.0) => synth.playTimbalHembra(v);
      else if (zoneOrNote === 'cowbell') soundTrigger = (v = 1.0) => synth.playCowbell(v);
      else if (zoneOrNote === 'splash') soundTrigger = (v = 1.0) => synth.playSplash(v);
    } else if (activeInstrument === 'guitar') {
      soundTrigger = (v = 1.0) => synth.playGuitarStrum(220, false, v);
    } else if (activeInstrument === 'piano') {
      soundTrigger = (v = 1.0) => synth.playPianoNote(440, v);
    } else if (activeInstrument === 'trumpet') {
      soundTrigger = (v = 1.0) => synth.playTrumpet(440, v);
    } else if (activeInstrument === 'accordion') {
      soundTrigger = (v = 1.0) => synth.playAccordion(329.63, v);
    }

    let volumeScale = 1.0;
    let points = 100;
    let text = '¡PERFECTO!';
    let color = 'text-emerald-400';

    if (difficulty === 'auto') {
      volumeScale = 1.0;
      points = 0;
      text = '🤖 AUTO PERFECTO';
      color = 'text-indigo-400';
    } else if (difficulty === 'basic') {
      // V1.4.6: BÁSICO is 100% Error-Free at 100% Volume real!
      volumeScale = 1.0;
      points = 100;
      text = '✨ 100% SINCRO';
      color = 'text-[#00FF88]';
    } else if (accuracy >= 0.8) {
      volumeScale = 1.0;
      points = difficulty === 'expert' ? 300 : difficulty === 'advanced' ? 200 : 150;
      text = difficulty === 'expert' ? '¡BANDA MASTER x3!' : '¡PERFECTO!';
      color = 'text-[#00FF88]';
    } else if (accuracy >= 0.4) {
      volumeScale = 0.85;
      points = 75;
      text = '¡RÍTMICO!';
      color = 'text-amber-300';
    } else {
      if (difficulty === 'intermediate') {
        volumeScale = 0.6;
        points = 25;
        text = '¡GOLPE CLAVE!';
        color = 'text-cyan-300';
      } else {
        volumeScale = 0.3;
        points = 0;
        text = '¡LEVE DESVIACIÓN!';
        color = 'text-pink-400';
      }
    }

    if (volumeScale > 0) {
      soundTrigger(volumeScale);
    }

    if (points > 0) {
      if (isDemoMode) {
        setDemoScore((prev) => prev + points);
      } else {
        updateScore(points);
      }
    }

    addFeedback(text, color);
  };

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col bg-[#0f0f12] text-white select-none antialiased">
      {/* TOP HEADER */}
      <header className="bg-black/80 backdrop-blur-xl px-3 py-1.5 flex items-center justify-between border-b border-emerald-500/30 z-30 shrink-0 shadow-[0_0_15px_rgba(0,255,136,0.2)]">
        <div className="flex items-center gap-2 md:gap-3 overflow-x-auto no-scrollbar">
          <button
            onClick={() => navigate('/')}
            className="px-2 py-0.5 rounded-lg bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-400 text-emerald-300 font-label-caps font-bold text-[10px] uppercase tracking-wider transition-all active:scale-95 flex items-center gap-1 shrink-0"
          >
            <span>⬅️</span> INICIO
          </button>

          <BrandingHeader size="sm" />

          {/* MUSICIAN NAME INPUT */}
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-950/90 border border-emerald-400/80 text-emerald-300 font-label-caps font-bold text-[10px] uppercase shrink-0">
            <span>🎷 Músico:</span>
            <input
              type="text"
              value={musicianName}
              onChange={(e) => {
                setMusicianName(e.target.value);
                if (e.target.value.trim()) {
                  addPlayer(e.target.value, activeInstrument);
                }
              }}
              placeholder="Tu Nombre"
              className="bg-transparent text-emerald-300 font-black outline-none w-24 text-[10px] border-b border-emerald-400/60 focus:border-emerald-300"
            />
          </div>

          <span
            className={`font-label-caps text-[9px] px-2 py-0.5 rounded-full font-bold shrink-0 border ${
              peerConnectionStatus === 'connected' || connectedPeersCount > 0
                ? 'text-emerald-300 bg-emerald-950/80 border-emerald-400 shadow-[0_0_10px_#00ff88]'
                : 'text-amber-300 bg-amber-950/80 border-amber-400 animate-pulse'
            }`}
          >
            {peerConnectionStatus === 'connected' || connectedPeersCount > 0
              ? `🟢 Conectado a TV ${roomCode}`
              : `🟡 Conectando TV ${roomCode}...`}
          </span>
        </div>

        {/* SCORE DISPLAY */}
        <div className="flex items-center gap-2 shrink-0">
          {isSoloMode && (
            <div className="px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-red-500 text-black font-black text-[9px] uppercase tracking-wider animate-pulse">
              SOLO BANDA x2
            </div>
          )}

          <div className="flex flex-col items-end">
            <span className="text-[9px] font-label-caps text-gray-400 uppercase tracking-widest">Puntos TV</span>
            <span className="font-display-mobile font-black text-lg text-emerald-300 drop-shadow-[0_0_10px_#00ff88]">
              {score.toLocaleString()}
            </span>
          </div>
        </div>
      </header>

      {/* WAITING FOR TV BANNER */}
      {!isPlaying && !isDemoMode && (
        <div className="bg-amber-500/10 border border-amber-500/40 text-amber-300 px-3 py-1 font-label-caps font-bold text-[10px] uppercase flex items-center justify-center gap-2 backdrop-blur-md animate-pulse z-20 shrink-0">
          <span>⏸️ Esperando que la TV inicie la pista...</span>
        </div>
      )}

      {/* DEMO MODE BANNER */}
      {isDemoMode && (
        <div className="bg-amber-500/90 text-black px-3 py-1 font-label-caps font-black text-[10px] uppercase flex items-center justify-between z-20 shadow-[0_0_15px_#ffc700] shrink-0">
          <span className="flex items-center gap-1.5 truncate">
            <span className="w-2 h-2 rounded-full bg-red-600 animate-ping" />
            🧪 DEMO AFINADO (30s) — "Qué fuimos - Grupo Firme" (78 BPM)
          </span>
          <span className="font-mono font-bold text-xs bg-black text-amber-300 px-2 py-0.5 rounded shrink-0">
            ⏱️ {demoTimeLeft}s | Local: {demoScore}
          </span>
        </div>
      )}

      {/* INSTRUMENT SELECTOR */}
      <nav className="bg-[#14141a] px-2 py-1 flex justify-around items-center border-b border-white/10 z-20 shrink-0">
        {[
          { id: 'drums', label: 'Batería', icon: '🥁' },
          { id: 'timbal', label: 'Timbal VIP', icon: '🥁' },
          { id: 'guitar', label: 'Guitarra', icon: '🎸' },
          { id: 'piano', label: 'Piano 3D', icon: '🎹' },
          { id: 'trumpet', label: 'Trompeta', icon: '🎺' },
          { id: 'accordion', label: 'Acordeón', icon: '🪗' },
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveInstrument(item.id as InstrumentType)}
            className={`flex flex-col items-center px-2 py-0.5 rounded-lg transition-all active:scale-95 ${
              activeInstrument === item.id
                ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-400 font-bold'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <span className="text-base">{item.icon}</span>
            <span className="text-[8px] font-label-caps uppercase">{item.label}</span>
          </button>
        ))}
      </nav>

      {/* DIFFICULTY SELECTOR & DEMO BUTTON */}
      <div className="bg-black/60 px-2 py-1 flex items-center justify-between text-xs border-b border-white/5 z-20 gap-2 overflow-x-auto no-scrollbar shrink-0">
        <button
          onClick={() => {
            if (!isDemoMode) {
              setIsDemoMode(true);
              setDemoTimeLeft(30);
              setDemoScore(0);
            } else {
              setIsDemoMode(false);
            }
          }}
          className={`px-2.5 py-0.5 rounded-lg font-label-caps font-black text-[10px] uppercase tracking-wider transition-all flex items-center gap-1 shrink-0 ${
            isDemoMode
              ? 'bg-amber-400 text-black border-2 border-amber-200 animate-pulse shadow-[0_0_15px_#ffc700]'
              : 'bg-emerald-500 hover:bg-emerald-400 text-black border border-emerald-300 shadow-[0_0_10px_#00ff88]'
          }`}
        >
          <span>{isDemoMode ? '⏹️ DETENER DEMO' : '🧪 PROBAR DEMO'}</span>
        </button>

        <div className="flex items-center gap-1 shrink-0">
          <span className="font-label-caps text-[9px] text-gray-400 uppercase font-bold hidden sm:inline">Nivel:</span>
          {[
            { id: 'basic', label: '✨ Básico (100% Vol)' },
            { id: 'intermediate', label: '🥁 Intermedio (Golpes Clave)' },
            { id: 'advanced', label: '⭐ Avanzado (Estrella)' },
            { id: 'expert', label: '🔥 PRO (Banda Master)' },
            { id: 'auto', label: '🤖 Auto' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setDifficulty(item.id as DifficultyLevel)}
              className={`px-2 py-0.5 rounded-full text-[8px] font-label-caps font-bold uppercase tracking-wider transition-all ${
                difficulty === item.id
                  ? 'bg-emerald-400 text-black shadow-[0_0_8px_#00ff88]'
                  : 'bg-gray-800/80 text-gray-300 hover:bg-gray-700'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* ACTIVE INSTRUMENT VIEWPORT */}
      <main className="flex-1 relative w-full h-full overflow-hidden">
        {activeInstrument === 'drums' && (
          <AcousticDrumKit
            onPlayDrum={(zone, accuracy) => handleInstrumentSound(zone, accuracy)}
            score={isDemoMode ? demoScore : score}
            feedbacks={feedbacks}
            isDemoMode={isDemoMode}
          />
        )}

        {activeInstrument === 'timbal' && (
          <TimbalSimulator
            onPlayTimbal={(zone, accuracy) => handleInstrumentSound(zone, accuracy)}
            feedbacks={feedbacks}
            isDemoMode={isDemoMode}
          />
        )}

        {/* GENERIC PADS FOR OTHER INSTRUMENTS */}
        {activeInstrument !== 'drums' && activeInstrument !== 'timbal' && (
          <div className="w-full h-full flex flex-col items-center justify-center p-4">
            <span className="text-4xl mb-2">
              {activeInstrument === 'guitar' ? '🎸' : activeInstrument === 'piano' ? '🎹' : activeInstrument === 'trumpet' ? '🎺' : '🪗'}
            </span>
            <span className="font-label-caps text-xs text-emerald-300 font-bold uppercase mb-4">
              Instrumento: {activeInstrument}
            </span>
            <button
              onClick={() => handleInstrumentSound('note', 1.0)}
              className="w-32 h-32 rounded-full bg-gradient-to-tr from-emerald-600 to-emerald-400 border-4 border-white shadow-[0_0_30px_#00ff88] active:scale-90 transition-transform font-black text-black text-lg uppercase"
            >
              GOLPEAR
            </button>
          </div>
        )}
      </main>
    </div>
  );
};
