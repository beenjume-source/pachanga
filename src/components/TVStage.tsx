import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePachanga } from '../context/PachangaContext';
import { BrandingHeader } from './BrandingHeader';
import { CanvasConfetti } from './CanvasConfetti';
import { YouTubePlayer } from './YouTubePlayer';
import { motion, AnimatePresence } from 'motion/react';

export function TVStage() {
  const navigate = useNavigate();
  const {
    nowPlaying,
    queue,
    nextSong,
    score,
    roomCode,
    players,
    isSoloMode,
    isGranFinale,
    triggerGranFinale,
    resetScores,
    forceRoomReset,
    liveReactions,
    emitVideoTime,
    removeSong,
    moveSongUp,
    removePlayer,
    tvToasts,
    setRoomRole,
    setRoomCode,
    setPlaying,
    activeHostId,
    lastHostHeartbeat,
    requestTvRelay,
    forceTakeoverHost,
    pendingRelayRequest,
    setPendingRelayRequest,
    instanceId,
  } = usePachanga();

  const [showHostWarning, setShowHostWarning] = useState<boolean>(false);
  const [showRelayModal, setShowRelayModal] = useState<boolean>(false);
  const [relayCountdown, setRelayCountdown] = useState<number>(10);

  useEffect(() => {
    setRoomRole('host');
    setRoomCode('192916');
  }, [setRoomRole, setRoomCode]);

  useEffect(() => {
    if (activeHostId && activeHostId !== instanceId && (Date.now() - lastHostHeartbeat < 6000)) {
      setShowHostWarning(true);
    } else {
      setShowHostWarning(false);
    }
  }, [activeHostId, lastHostHeartbeat, instanceId]);

  // Handler for song ending on YouTube Player
  const handleSongEnded = () => {
    if (pendingRelayRequest) {
      setShowRelayModal(true);
      setRelayCountdown(10);
    } else {
      nextSong();
    }
  };

  // 10 second timer for relay transfer dialog
  useEffect(() => {
    if (!showRelayModal) return;
    if (relayCountdown <= 0) {
      setShowRelayModal(false);
      setPendingRelayRequest(false);
      forceTakeoverHost();
      return;
    }
    const timer = setInterval(() => {
      setRelayCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [showRelayModal, relayCountdown]);

  const handleForceRoomReset = () => {
    if (window.confirm('⚠️ ¿Estás seguro de REINICIAR TOTALMENTE LA SALA?\n\nEsto vaciará la lista de músicos, reiniciará marcadores a 0 y enviará a todos los conectados al Lobby.')) {
      forceRoomReset();
    }
  };

  const [vuLevels, setVuLevels] = useState<number[]>([60, 80, 45, 90, 75, 85, 50, 95]);

  // VU meter equalizer animation loop
  useEffect(() => {
    const interval = setInterval(() => {
      setVuLevels((prev) =>
        prev.map(() => Math.floor(Math.random() * (isSoloMode ? 40 : 60)) + (isSoloMode ? 60 : 35))
      );
    }, 120);

    return () => clearInterval(interval);
  }, [isSoloMode]);

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col bg-[#08080a] text-white relative select-none antialiased">
      {/* CANVAS CONFETTI OVERLAY FOR GRAN FINALE */}
      <CanvasConfetti active={isGranFinale} />

      {/* DISCO STROBE / FEVER DISCO FLOOR BACKGROUND */}
      <div
        className={`absolute inset-0 pointer-events-none transition-all duration-500 ${
          isSoloMode
            ? 'fever-disco-floor opacity-40 shadow-[inset_0_0_120px_rgba(255,0,128,0.5)]'
            : 'bg-[radial-gradient(circle_at_50%_20%,rgba(0,168,107,0.15),transparent_70%)]'
        }`}
      />

      {/* TOP TV HEADER WITH VINTAGE DISCO BRANDING & ROOM CODE */}
      <header className="relative z-30 px-6 py-3 bg-black/80 backdrop-blur-xl border-b border-emerald-500/30 flex justify-between items-center shrink-0 shadow-[0_0_30px_rgba(0,255,136,0.2)]">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="px-3.5 py-1.5 rounded-xl bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-400 text-emerald-300 font-label-caps font-bold text-xs uppercase tracking-wider transition-all active:scale-95 shadow-[0_0_12px_rgba(0,255,136,0.3)] flex items-center gap-1.5 shrink-0"
          >
            <span className="text-sm">⬅️</span> INICIO / CAMBIAR MODO
          </button>

          <BrandingHeader size="sm" />

          <div className="flex flex-col bg-emerald-950/40 border border-emerald-500/30 rounded-xl px-4 py-1.5 shadow-[inset_0_0_10px_rgba(0,255,136,0.1)]">
            <span className="text-[10px] font-label-caps uppercase text-emerald-400 font-black tracking-widest leading-none">
              📺 MODO TV — SALA:
            </span>
            <span className="font-display-mobile font-black text-2xl text-white tracking-wider drop-shadow-[0_0_10px_#00ff88]">
              {roomCode}
            </span>
          </div>

          <div className="flex flex-col bg-amber-950/30 border border-amber-500/30 rounded-xl px-4 py-1.5 shadow-[inset_0_0_10px_rgba(251,191,36,0.1)]">
            <span className="text-[10px] font-label-caps uppercase text-amber-400 font-black tracking-widest leading-none">
              Músicos Conectados:
            </span>
            <span className="font-display-mobile font-black text-2xl text-white tracking-wider drop-shadow-[0_0_10px_#fbbf24] text-center">
              {players.length}
            </span>
          </div>
        </div>

        {/* SOLO MODE VU METERS & SCORE BOARD */}
        <div className="flex items-center gap-8">
          {/* VU METERS */}
          <div className="flex items-end gap-1.5 h-12 px-4 bg-black/60 rounded-xl border border-white/10">
            {vuLevels.map((lvl, idx) => (
              <div key={idx} className="w-2.5 bg-gray-800 rounded-t h-full flex flex-col justify-end overflow-hidden">
                <div
                  className={`w-full transition-all duration-100 ${
                    isSoloMode
                      ? 'bg-gradient-to-t from-emerald-400 via-amber-300 to-red-500 shadow-[0_0_10px_#ff0055]'
                      : 'bg-gradient-to-t from-emerald-500 to-emerald-300'
                  }`}
                  style={{ height: `${lvl}%` }}
                />
              </div>
            ))}
          </div>

          {/* TOTAL BAND SCORE */}
          <div className="flex flex-col items-end">
            <span className="text-xs font-label-caps uppercase text-gray-400 font-bold tracking-widest">
              Puntaje Banda
            </span>
            <span className="font-display-mobile font-black text-4xl text-emerald-300 drop-shadow-[0_0_15px_#00ff88]">
              {score.toLocaleString()}
            </span>
          </div>

          {/* ACTION BUTTONS */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleForceRoomReset}
              className="px-3.5 py-2 rounded-xl bg-red-600/80 hover:bg-red-600 border border-red-400 text-white font-label-caps font-bold text-xs uppercase tracking-wider active:scale-95 transition-all shadow-[0_0_15px_rgba(239,68,68,0.4)] flex items-center gap-1.5"
            >
              🧹 REINICIO TOTAL DE SALA
            </button>

            <button
              onClick={triggerGranFinale}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-red-500 text-black font-black text-xs uppercase tracking-wider hover:scale-105 active:scale-95 transition-all shadow-[0_0_20px_rgba(255,0,85,0.5)]"
            >
              🎉 GRAN FINALE
            </button>

            <button
              onClick={resetScores}
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-label-caps font-bold text-xs uppercase tracking-wider active:scale-95 transition-all"
            >
              🔄 REINICIAR SCORES
            </button>
          </div>
        </div>
      </header>

      {/* FLOATING LIVE EMOJI REACTIONS (REACCIONES EN VIVO DE INVITADOS MÓVILES) */}
      <div className="absolute inset-0 pointer-events-none z-40 overflow-hidden">
        <AnimatePresence>
          {liveReactions.map((react) => (
            <motion.div
              key={react.id}
              initial={{ y: '100vh', opacity: 0, scale: 0.8 }}
              animate={{ y: '-20vh', opacity: 1, scale: 1.8 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 3.5, ease: 'easeOut' }}
              className="absolute flex flex-col items-center drop-shadow-[0_0_20px_rgba(255,255,255,0.8)]"
              style={{ left: `${react.x}%` }}
            >
              <span className="text-6xl">{react.emoji}</span>
              <span className="text-xs font-label-caps font-bold bg-black/80 px-2.5 py-0.5 rounded-full border border-emerald-400/50 text-emerald-300 mt-1">
                {react.senderName}
              </span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* MAIN STAGE CONTENT */}
      <main className="flex-1 min-h-0 relative flex z-20 p-4 md:p-6 gap-4 md:gap-6 overflow-hidden">
        {/* LEFT YOUTUBE KARAOKE DISPLAY */}
        <section className="flex-1 min-w-0 flex flex-col bg-black/60 rounded-3xl border border-emerald-500/30 overflow-hidden shadow-[0_0_40px_rgba(0,0,0,0.8)] relative">
          {nowPlaying ? (
            <div className="relative w-full h-full flex flex-col">
              <div className="flex-1 w-full h-full min-h-0">
                <YouTubePlayer
                  videoId={nowPlaying.videoId}
                  title={nowPlaying.title}
                  onEnded={handleSongEnded}
                  onTimeUpdate={emitVideoTime}
                  onStateChange={(state) => {
                    setPlaying(state === 'PLAYING');
                  }}
                  onError={() => {
                    console.warn('Video playback error, skipping to next song...');
                    nextSong();
                  }}
                />
              </div>

              {/* OVERLAY SONG INFO BANNER */}
              <div className="p-3 bg-gradient-to-t from-black via-black/80 to-transparent flex justify-between items-center px-6 z-20 shrink-0">
                <div>
                  <h2 className="font-display-mobile font-black text-xl md:text-2xl text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.8)] truncate max-w-xl">
                    {nowPlaying.title}
                  </h2>
                  <p className="text-xs md:text-sm font-body-lg text-emerald-400 font-bold">{nowPlaying.artist}</p>
                </div>

                <button
                  onClick={nextSong}
                  className="px-4 py-2 rounded-full bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400 text-emerald-300 font-label-caps font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-all active:scale-95 shrink-0"
                >
                  <span className="material-symbols-outlined text-sm">skip_next</span>
                  Siguiente
                </button>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <span className="material-symbols-outlined text-7xl text-emerald-400 mb-4 animate-bounce">
                music_video
              </span>
              <h3 className="font-display-mobile font-bold text-3xl text-white mb-2">Escenario Listo</h3>
              <p className="text-gray-400 text-sm font-body-lg max-w-md">
                Agrega canciones desde el Controlador DJ para iniciar el karaoke en vivo.
              </p>
            </div>
          )}
        </section>

        {/* RIGHT LEADERBOARD & QUEUE PANEL */}
        <section className="w-80 lg:w-96 flex flex-col gap-4 min-h-0 overflow-hidden shrink-0">
          {/* BAND LEADERBOARD PANEL */}
          <div className="flex-1 min-h-0 bg-black/60 backdrop-blur-xl rounded-3xl border border-emerald-500/30 p-4 flex flex-col shadow-[0_0_30px_rgba(0,0,0,0.6)] overflow-hidden">
            <h3 className="font-headline-md font-bold text-lg text-emerald-300 flex items-center gap-2 mb-3 shrink-0">
              <span className="material-symbols-outlined text-amber-400">emoji_events</span>
              Tabla de Músicos
            </h3>

            <div className="flex-1 overflow-y-auto flex flex-col gap-2.5 pr-1">
              {players
                .sort((a, b) => b.score - a.score)
                .map((p, idx) => (
                  <div
                    key={p.id}
                    className={`p-2.5 rounded-2xl flex items-center justify-between border transition-all gap-2 ${
                      idx === 0
                        ? 'bg-gradient-to-r from-amber-500/20 via-emerald-500/10 to-transparent border-amber-400 shadow-[0_0_15px_rgba(255,215,0,0.3)]'
                        : 'bg-white/5 border-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className="w-8 h-8 rounded-full bg-black/60 border border-white/20 flex items-center justify-center text-lg font-black shrink-0">
                        {idx === 0 ? '👑' : p.avatar}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center gap-1">
                          <span className="font-display-mobile font-bold text-xs text-white truncate">{p.name}</span>
                          <span className="font-display-mobile font-black text-emerald-300 text-xs shrink-0">
                            {p.score.toLocaleString()}
                          </span>
                        </div>
                        <span className="text-[10px] text-amber-300 font-label-caps font-bold truncate block">{p.title}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => removePlayer(p.id)}
                      className="p-1 px-1.5 rounded bg-red-950/40 hover:bg-red-900 border border-red-500/30 text-red-400 font-label-caps text-[9px] font-bold uppercase transition-all active:scale-95 shrink-0"
                      title="Expulsar Músico"
                    >
                      ❌ Expulsar
                    </button>
                  </div>
                ))}
            </div>
          </div>

          {/* UP NEXT QUEUE */}
          <div className="h-36 shrink-0 bg-black/60 backdrop-blur-xl rounded-3xl border border-white/10 p-3.5 flex flex-col overflow-hidden">
            <span className="font-label-caps text-[11px] text-gray-400 font-bold uppercase tracking-widest mb-1.5 shrink-0">
              Siguientes Canciones ({queue.length})
            </span>
            <div className="flex-1 overflow-y-auto flex flex-col gap-1.5 pr-1">
              {queue.map((s, idx) => (
                <div key={s.id + idx} className="p-2 rounded-xl bg-white/5 flex items-center justify-between text-xs gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="font-bold truncate text-white">{s.title}</div>
                    <div className="text-[10px] text-emerald-400 font-label-caps truncate">{s.artist}</div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    {idx > 0 && (
                      <button
                        onClick={() => moveSongUp(idx)}
                        className="p-1 rounded bg-white/10 hover:bg-emerald-500/20 text-white hover:text-emerald-300 transition-all text-[10px]"
                        title="Subir"
                      >
                        ⬆️
                      </button>
                    )}
                    <button
                      onClick={() => removeSong(idx)}
                      className="p-1 rounded bg-white/10 hover:bg-red-500/20 text-white hover:text-red-400 transition-all text-[10px]"
                      title="Eliminar"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
              {queue.length === 0 && (
                <div className="text-center text-xs text-gray-500 py-3">Sin canciones en cola</div>
              )}
            </div>
          </div>
        </section>
      </main>

      {/* GRAN FINALE CELEBRATION MODAL (BOLA DE DISCO GIGANTE Y TABLA FINAL) */}
      <AnimatePresence>
        {isGranFinale && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed inset-0 z-50 bg-black/95 backdrop-blur-2xl flex flex-col items-center justify-center p-8 select-none"
          >
            {/* GIANT DESCENDING DISCO BALL */}
            <motion.div
              initial={{ y: -300 }}
              animate={{ y: 0 }}
              transition={{ type: 'spring', damping: 12 }}
              className="mb-4"
            >
              <BrandingHeader size="lg" showDiscoFloor />
            </motion.div>

            <h2 className="font-display-mobile font-black text-4xl md:text-6xl text-center text-emerald-300 drop-shadow-[0_0_30px_#00ff88] uppercase my-2">
              🏆 ¡GRAN FINALE CUMBRE 80s/90s! 🏆
            </h2>

            {/* FULL WINNERS TABLE */}
            <div className="w-full max-w-2xl bg-white/5 rounded-3xl border-2 border-emerald-400/60 p-6 my-4 shadow-[0_0_50px_rgba(0,255,136,0.3)]">
              <h3 className="text-center font-label-caps uppercase text-amber-300 tracking-widest text-lg font-bold mb-4">
                Puntajes Finales de la Banda Pachanguera
              </h3>

              <div className="flex flex-col gap-3 max-h-[40vh] overflow-y-auto px-2">
                {players
                  .sort((a, b) => b.score - a.score)
                  .map((p, idx) => (
                    <div
                      key={p.id}
                      className={`p-4 rounded-2xl flex items-center justify-between border ${
                        idx === 0
                          ? 'bg-gradient-to-r from-amber-500/30 to-emerald-500/20 border-amber-300 shadow-[0_0_20px_#ffd700]'
                          : 'bg-white/10 border-white/20'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <span className="font-black text-2xl text-amber-300 w-8">{idx + 1}º</span>
                        <span className="text-2xl">{p.avatar}</span>
                        <div>
                          <div className="font-bold text-lg text-white">{p.name}</div>
                          <div className="text-xs text-emerald-300 font-label-caps">{p.title}</div>
                        </div>
                      </div>

                      <span className="font-display-mobile font-black text-2xl text-emerald-300">
                        {p.score.toLocaleString()} pts
                      </span>
                    </div>
                  ))}
              </div>
            </div>

            <button
              onClick={resetScores}
              className="mt-2 px-8 py-4 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-300 text-black font-display-mobile font-black text-xl uppercase tracking-wider shadow-[0_0_30px_#00ff88] hover:scale-105 active:scale-95 transition-all"
            >
              🔄 NUEVA RONDA / REINICIAR SCORES
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FLOATING TV TOAST NOTIFICATIONS */}
      <div className="fixed top-24 right-6 z-50 flex flex-col gap-2.5 pointer-events-none">
        <AnimatePresence>
          {tvToasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 100, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 100, scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className="bg-black/90 backdrop-blur-xl border-2 border-emerald-500/50 rounded-2xl p-4 flex items-center gap-3.5 shadow-[0_10px_30px_rgba(0,0,0,0.8),0_0_20px_rgba(0,255,136,0.3)] max-w-sm pointer-events-auto"
            >
              <div className="w-10 h-10 rounded-full bg-emerald-950 border border-emerald-500/50 flex items-center justify-center text-xl shrink-0">
                {toast.icon}
              </div>
              <p className="font-headline-md font-bold text-sm text-white leading-snug">
                {toast.text}
              </p>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* SONG ENDED RELAY CONFIRMATION MODAL */}
      {showRelayModal && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-neutral-900 border-2 border-emerald-500 rounded-3xl p-6 flex flex-col items-center text-center shadow-[0_0_50px_rgba(16,185,129,0.4)]">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-400 flex items-center justify-center text-3xl mb-4 animate-pulse">
              📺
            </div>
            <h3 className="font-display-mobile font-black text-2xl text-emerald-400 uppercase tracking-wide mb-2">
              Solicitud de Relevo
            </h3>
            <p className="text-sm text-gray-200 font-body-lg mb-4 leading-relaxed">
              ¿Deseas continuar como TV? <br />
              <span className="text-emerald-300 font-bold">
                (Se cederá el control en {relayCountdown}s si no respondes)
              </span>
            </p>

            <div className="w-full flex flex-col gap-3">
              <button
                onClick={() => {
                  setShowRelayModal(false);
                  setPendingRelayRequest(false);
                  nextSong();
                }}
                className="w-full py-3.5 rounded-xl bg-emerald-500 text-black font-display-mobile font-black text-sm uppercase tracking-wider shadow-[0_0_15px_#10b981] hover:scale-102 active:scale-95 transition-all"
              >
                🙋‍♂️ MANTENER CONTROL (SEGUIR COMO TV)
              </button>

              <button
                onClick={() => {
                  setShowRelayModal(false);
                  setPendingRelayRequest(false);
                  forceTakeoverHost();
                  navigate('/');
                }}
                className="w-full py-3.5 rounded-xl bg-amber-500 text-black font-display-mobile font-black text-sm uppercase tracking-wider hover:bg-amber-400 active:scale-95 transition-all"
              >
                ⚡ CEDER CONTROL AHORA
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HOST TV DUPLICATE WARNING MODAL */}
      {showHostWarning && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-neutral-900 border-2 border-amber-500 rounded-3xl p-6 flex flex-col items-center text-center shadow-[0_0_50px_rgba(245,158,11,0.4)]">
            <div className="w-16 h-16 rounded-full bg-amber-500/20 border border-amber-400 flex items-center justify-center text-3xl mb-4 animate-bounce">
              📺
            </div>
            <h3 className="font-display-mobile font-black text-2xl text-amber-400 uppercase tracking-wide mb-2">
              ¡Host TV Ya Activo!
            </h3>
            <p className="text-sm text-gray-300 font-body-lg mb-6 leading-relaxed">
              Ya existe una pantalla de TV transmitiendo el escenario en la sala <strong className="text-amber-300 font-bold">192916</strong>. ¿Qué deseas hacer?
            </p>

            <div className="w-full flex flex-col gap-3">
              <button
                onClick={() => {
                  requestTvRelay();
                  alert('⚠️ Solicitud de relevo enviada a la TV principal.');
                }}
                className="w-full py-3.5 rounded-xl bg-amber-500 text-black font-display-mobile font-black text-sm uppercase tracking-wider shadow-[0_0_15px_#f59e0b] hover:scale-102 active:scale-95 transition-all"
              >
                🙋‍♂️ SOLICITAR RELEVO A LA TV ACTIVA
              </button>

              <button
                onClick={() => {
                  forceTakeoverHost();
                  setShowHostWarning(false);
                }}
                className="w-full py-3.5 rounded-xl bg-red-600 text-white font-display-mobile font-black text-sm uppercase tracking-wider hover:bg-red-500 active:scale-95 transition-all shadow-[0_0_15px_rgba(239,68,68,0.5)]"
              >
                ⚡ FORZAR RELEVO DE ESCENARIO
              </button>

              <button
                onClick={() => navigate('/')}
                className="w-full py-3 rounded-xl bg-white/10 hover:bg-white/15 text-gray-300 font-label-caps font-bold text-xs uppercase"
              >
                ⬅️ VOLVER AL INICIO
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
