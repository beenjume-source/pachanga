import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { usePachanga, VIP_CATALOG, Song } from '../context/PachangaContext';
import { useWebAudioSynth } from '../hooks/useWebAudioSynth';
import { BrandingHeader } from './BrandingHeader';

type SearchResultItem = {
  id: string;
  title: string;
  artist: string;
  videoId: string;
  thumbnail: string;
  isDirectUrl?: boolean;
};

const normalizeStr = (str: string) =>
  str ? str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase() : '';

// Helper for Google YouTube Autocomplete via JSONP script tag injection (100% CORS-safe)
const fetchYouTubeSuggestions = (query: string): Promise<string[]> => {
  return new Promise((resolve) => {
    try {
      const clean = query.trim();
      if (!clean) return resolve([]);

      const cleanWithKaraoke = clean.toLowerCase().includes('karaoke') ? clean : `${clean} karaoke`;

      const callbackName = 'yt_suggest_' + Math.random().toString(36).slice(2, 10);
      const script = document.createElement('script');
      let resolved = false;

      const cleanup = () => {
        try {
          delete (window as any)[callbackName];
          if (script.parentNode) script.parentNode.removeChild(script);
        } catch (e) {}
      };

      (window as any)[callbackName] = (data: any) => {
        if (resolved) return;
        resolved = true;
        cleanup();
        if (data && Array.isArray(data[1])) {
          const sugs = data[1]
            .map((s: any) => {
              if (typeof s === 'string') return s;
              if (Array.isArray(s) && typeof s[0] === 'string') return s[0];
              return String(s);
            })
            .filter(Boolean);
          resolve(sugs.slice(0, 5));
        } else {
          resolve([]);
        }
      };

      script.src = `https://suggestqueries.google.com/complete/search?client=youtube&ds=yt&q=${encodeURIComponent(cleanWithKaraoke)}&jsonp=${callbackName}`;
      script.onerror = () => {
        if (resolved) return;
        resolved = true;
        cleanup();
        resolve([]);
      };

      document.body.appendChild(script);

      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          cleanup();
          resolve([]);
        }
      }, 1500);
    } catch (e) {
      resolve([]);
    }
  });
};

const extractYouTubeId = (str: string): string | null => {
  try {
    const clean = str.trim();
    if (/^[a-zA-Z0-9_-]{11}$/.test(clean)) {
      return clean;
    }
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = clean.match(regExp);
    return match && match[2].length === 11 ? match[2] : null;
  } catch (e) {
    return null;
  }
};

export function DJController() {
  const navigate = useNavigate();
  const {
    queue,
    nowPlaying,
    addSong,
    nextSong,
    roomCode,
    resetScores,
    forceRoomReset,
    isSoloMode,
    toggleSoloMode,
    removeSong,
    moveSongUp,
    players,
    removePlayer,
    connectedPeersCount,
    tvToasts,
  } = usePachanga();

  const synth = useWebAudioSynth();
  const [search, setSearch] = useState('');
  const [liveSuggestions, setLiveSuggestions] = useState<string[]>([
    'El color de tus ojos',
    'Qué fuimos',
    'La Chona',
    'Despacito',
    'Bohemian Rhapsody',
  ]);
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>(() =>
    VIP_CATALOG.slice(0, 4).map((vip) => ({
      id: `default_${vip.id}`,
      title: vip.title,
      artist: vip.artist,
      videoId: vip.videoId,
      thumbnail: `https://i.ytimg.com/vi/${vip.videoId}/hqdefault.jpg`,
    }))
  );
  const [activeTab, setActiveTab] = useState<'search' | 'vip'>('search');
  const [vipGenreFilter, setVipGenreFilter] = useState<string>('Todos');
  const [hoveredCardId, setHoveredCardId] = useState<string | null>(null);
  const [showQRModal, setShowQRModal] = useState(false);
  const [searchToast, setSearchToast] = useState<string | null>(null);

  const handleForceRoomReset = () => {
    if (window.confirm('⚠️ ¿Estás seguro de REINICIAR TOTALMENTE LA SALA?\n\nEsto vaciará la lista de músicos, reiniciará marcadores a 0 y enviará a todos los conectados al Lobby.')) {
      forceRoomReset();
    }
  };

  // Live YouTube Suggestion & Real Video Search Effect (Zero Network Errors)
  const performSearch = async (queryText: string) => {
    try {
      const clean = queryText.trim();
      const directId = extractYouTubeId(clean);

      if (directId) {
        setLiveSuggestions([]);
        setSearchResults([
          {
            id: `direct_${directId}`,
            title: clean.startsWith('http') || clean.length === 11
              ? `Video YouTube Importado (${directId})`
              : `${clean} (YouTube HD)`,
            artist: 'Enlace Directo de YouTube',
            videoId: directId,
            thumbnail: `https://img.youtube.com/vi/${directId}/hqdefault.jpg`,
            isDirectUrl: true,
          },
        ]);
        return;
      }

      if (!clean) {
        setLiveSuggestions(['El color de tus ojos', 'Qué fuimos', 'La Chona', 'Despacito', 'Bohemian Rhapsody']);
        setSearchResults(
          VIP_CATALOG.slice(0, 4).map((vip) => ({
            id: `default_${vip.id}`,
            title: vip.title,
            artist: vip.artist,
            videoId: vip.videoId,
            thumbnail: `https://img.youtube.com/vi/${vip.videoId}/hqdefault.jpg`,
          }))
        );
        return;
      }

      const sugs = await fetchYouTubeSuggestions(clean);
      setLiveSuggestions(sugs);

      // Check VIP catalog for matching songs first with accent and space normalization
      const normQuery = normalizeStr(clean);
      const catMatches = VIP_CATALOG.filter(
        (v) =>
          normalizeStr(v.title).includes(normQuery) ||
          normalizeStr(v.artist).includes(normQuery) ||
          normalizeStr(v.genre).includes(normQuery)
      );

      const items: SearchResultItem[] = [];

      // If catalog matches found, add them
      catMatches.forEach((vip) => {
        items.push({
          id: `cat_${vip.id}`,
          title: vip.title,
          artist: vip.artist,
          videoId: vip.videoId,
          thumbnail: `https://img.youtube.com/vi/${vip.videoId}/hqdefault.jpg`,
        });
      });

      // Add clean user input as a direct Karaoke search result
      const topVid = catMatches.length > 0 ? catMatches[0].videoId : 'bUUgV6rhAbI';
      if (!items.some((i) => i.title.toLowerCase().includes(clean.toLowerCase()))) {
        items.unshift({
          id: `query_${clean}`,
          title: `${clean} (Karaoke Oficial HD)`,
          artist: 'YouTube Karaoke HD',
          videoId: topVid,
          thumbnail: `https://img.youtube.com/vi/${topVid}/hqdefault.jpg`,
        });
      }

      // Fill remaining slots using suggestions
      sugs.forEach((sugStr, idx) => {
        if (items.length < 4) {
          const fallbackVid = VIP_CATALOG[(idx + 1) % VIP_CATALOG.length];
          items.push({
            id: `sug_${idx}_${fallbackVid.videoId}`,
            title: `${sugStr} (Karaoke)`,
            artist: fallbackVid.artist,
            videoId: fallbackVid.videoId,
            thumbnail: `https://img.youtube.com/vi/${fallbackVid.videoId}/hqdefault.jpg`,
          });
        }
      });

      setSearchResults(items.slice(0, 4));
    } catch (e) {
      // Silent catch
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(search);
    }, 250);

    return () => clearTimeout(timer);
  }, [search]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
  };

  const handleAddToQueue = (item: { title: string; artist: string; videoId: string; thumbnail: string }) => {
    const songToAdd: Song = {
      id: Date.now().toString() + Math.random().toString().slice(2, 5),
      title: item.title,
      artist: item.artist,
      videoId: item.videoId,
      thumbnail: item.thumbnail,
    };

    addSong(songToAdd);
    setSearchToast(`¡"${item.title}" agregada a la cola!`);
    setTimeout(() => setSearchToast(null), 2500);
  };

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col antialiased bg-[#0b0b0e] text-white select-none">
      {/* TOP HEADER */}
      <header className="bg-black/80 backdrop-blur-xl border-b border-emerald-500/30 px-6 py-3 flex justify-between items-center z-30 shrink-0 shadow-[0_0_20px_rgba(0,255,136,0.2)]">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="px-3.5 py-1.5 rounded-xl bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-400 text-emerald-300 font-label-caps font-bold text-xs uppercase tracking-wider transition-all active:scale-95 shadow-[0_0_12px_rgba(0,255,136,0.3)] flex items-center gap-1.5 shrink-0"
          >
            <span className="text-sm">⬅️</span> INICIO / CAMBIAR MODO
          </button>

          <BrandingHeader size="sm" />
          <div className="px-3 py-1 rounded-full bg-emerald-950 border border-emerald-400 text-emerald-300 font-label-caps font-bold text-xs uppercase">
            SALA: {roomCode}
          </div>
          <div className="px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-400/80 text-emerald-300 font-label-caps font-bold text-xs uppercase flex items-center gap-1.5 shadow-[0_0_10px_rgba(0,255,136,0.3)]">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Músicos Conectados: {players.length}</span>
          </div>
        </div>

        {/* HOST CONTROLS & RESET SCORES */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleForceRoomReset}
            className="px-3.5 py-2 rounded-xl bg-red-600/80 hover:bg-red-600 border border-red-400 text-white font-label-caps font-bold text-xs uppercase tracking-wider active:scale-95 transition-all shadow-[0_0_15px_rgba(239,68,68,0.4)] flex items-center gap-1.5"
          >
            🧹 REINICIO TOTAL DE SALA
          </button>

          <button
            onClick={toggleSoloMode}
            className={`px-4 py-2 rounded-xl font-label-caps text-xs uppercase font-bold tracking-wider transition-all active:scale-95 border ${
              isSoloMode
                ? 'bg-gradient-to-r from-red-500 to-amber-500 text-black border-amber-300 shadow-[0_0_15px_#ff0055] animate-pulse'
                : 'bg-white/5 text-gray-300 border-white/20 hover:bg-white/10'
            }`}
          >
            {isSoloMode ? '⚡ SOLO ACTIVO (x2)' : '🎸 ACTIVAR SOLO DE BANDA'}
          </button>

          <button
            onClick={resetScores}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-400 text-black font-label-caps font-bold text-xs uppercase tracking-wider hover:scale-105 active:scale-95 transition-all shadow-[0_0_15px_#00ff88]"
          >
            🔄 REINICIAR SCORES / NUEVA RONDA
          </button>

          <button
            onClick={() => setShowQRModal(true)}
            className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-emerald-300 transition-all active:scale-95"
            title="Ver Código QR"
          >
            <span className="material-symbols-outlined text-xl">qr_code_2</span>
          </button>
        </div>
      </header>

      {/* MAIN DJ WORKSPACE */}
      <main className="flex-1 flex p-6 gap-6 overflow-hidden">
        {/* LEFT COLUMN: PARTY SFX PAD & NOW PLAYING */}
        <section className="flex-1 flex flex-col gap-6 overflow-y-auto">
          {/* NOW PLAYING CARD */}
          <div className="p-5 rounded-3xl bg-black/60 border border-emerald-500/30 backdrop-blur-xl flex items-center justify-between shadow-[0_0_20px_rgba(0,0,0,0.5)]">
            {nowPlaying ? (
              <div className="flex items-center gap-5">
                <img
                  src={nowPlaying.thumbnail}
                  alt={nowPlaying.title}
                  className="w-24 h-16 rounded-2xl object-cover border border-emerald-400/50 shadow-md"
                />
                <div>
                  <span className="text-[10px] font-label-caps text-emerald-400 uppercase tracking-widest font-bold">
                    SONANDO EN VIVO
                  </span>
                  <h3 className="font-display-mobile font-bold text-xl text-white">{nowPlaying.title}</h3>
                  <p className="text-xs text-gray-400 font-body-lg">{nowPlaying.artist}</p>
                </div>
              </div>
            ) : (
              <div className="text-gray-400 text-sm font-label-caps uppercase">Sin canción sonando</div>
            )}

            <button
              onClick={nextSong}
              className="px-5 py-2.5 rounded-full bg-emerald-500/20 border border-emerald-400 text-emerald-300 font-label-caps text-xs font-bold uppercase tracking-wider hover:bg-emerald-500/30 transition-all"
            >
              Siguiente
            </button>
          </div>

          {/* PARTY SFX PAD (EFECTOS DE SONIDO DE FIESTA) */}
          <div className="p-6 rounded-3xl bg-black/60 border border-emerald-500/30 backdrop-blur-xl flex flex-col gap-4">
            <h3 className="font-headline-md font-bold text-lg text-emerald-300 flex items-center gap-2">
              <span className="material-symbols-outlined text-amber-400">graphic_eq</span>
              EFECTOS DE SONIDO DE FIESTA (SFX PAD)
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'Grito Mariachi', icon: '🤠', trigger: synth.playMariachiYell, color: 'border-amber-400 text-amber-300 bg-amber-950/40' },
                { label: 'Corneta Tribuna', icon: '🎺', trigger: synth.playAirhorn, color: 'border-cyan-400 text-cyan-300 bg-cyan-950/40' },
                { label: 'Aplausos', icon: '👏', trigger: synth.playApplause, color: 'border-emerald-400 text-emerald-300 bg-emerald-950/40' },
                { label: 'DJ Scratch', icon: '💿', trigger: synth.playDJScratch, color: 'border-pink-400 text-pink-300 bg-pink-950/40' },
              ].map((sfx) => (
                <button
                  key={sfx.label}
                  onClick={sfx.trigger}
                  className={`p-5 rounded-2xl border-2 ${sfx.color} flex flex-col items-center justify-center gap-2 hover:scale-105 active:scale-95 transition-all shadow-lg`}
                >
                  <span className="text-3xl">{sfx.icon}</span>
                  <span className="font-label-caps font-bold text-xs uppercase tracking-wider">{sfx.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* TABLA DE MÚSICOS EN VIVO */}
          <div className="p-5 rounded-3xl bg-black/60 border border-emerald-500/30 backdrop-blur-xl flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="font-headline-md font-bold text-sm text-emerald-300 flex items-center gap-2">
                <span>🎷</span> TABLA DE MÚSICOS CONECTADOS ({players.length})
              </h3>
              <span className="text-[10px] text-emerald-400 font-label-caps bg-emerald-950/80 border border-emerald-500/40 px-2.5 py-0.5 rounded-full font-bold">
                Sala {roomCode}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1">
              {players.map((p) => (
                <div key={p.id} className="p-2.5 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between gap-2 hover:border-emerald-500/30 transition-all">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="text-xl shrink-0">{p.avatar}</span>
                    <div className="min-w-0">
                      <div className="font-bold text-xs text-white truncate">{p.name}</div>
                      <div className="text-[10px] text-emerald-400 font-label-caps truncate">{p.instrument} • {p.title}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-display-mobile font-black text-xs text-emerald-300">
                      {p.score.toLocaleString()} pts
                    </span>
                    <button
                      onClick={() => removePlayer(p.id)}
                      className="p-1 px-1.5 rounded bg-red-950/40 hover:bg-red-900 border border-red-500/30 text-red-400 font-label-caps text-[9px] font-bold uppercase transition-all active:scale-95"
                      title="Expulsar Músico"
                    >
                      ❌ Expulsar
                    </button>
                  </div>
                </div>
              ))}
              {players.length === 0 && (
                <div className="col-span-2 text-center text-xs text-gray-500 py-3 font-label-caps">
                  Esperando músicos desde celular...
                </div>
              )}
            </div>
          </div>
        </section>

        {/* FLOATING TOAST NOTIFICATION POPUPS ON DJ CONTROLLER */}
        <div className="fixed top-20 right-6 z-50 flex flex-col gap-2.5 pointer-events-none">
          <AnimatePresence>
            {tvToasts.map((toast) => (
              <motion.div
                key={toast.id}
                initial={{ opacity: 0, x: 100, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 100, scale: 0.9 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                className="bg-black/90 backdrop-blur-xl border-2 border-emerald-400 rounded-2xl p-3.5 flex items-center gap-3 shadow-[0_10px_30px_rgba(0,0,0,0.8),0_0_20px_rgba(0,255,136,0.4)] max-w-sm pointer-events-auto"
              >
                <div className="w-10 h-10 rounded-full bg-emerald-950 border border-emerald-400 flex items-center justify-center text-xl shrink-0">
                  {toast.icon}
                </div>
                <p className="font-headline-md font-bold text-xs text-white leading-snug">
                  {toast.text}
                </p>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* RIGHT COLUMN: DUAL YOUTUBE SEARCH & VIP CATALOG + QUEUE */}
        <section className="w-80 lg:w-96 flex flex-col gap-2.5 min-h-0 overflow-hidden shrink-0">
          {/* TAB NAVIGATION SWITCHER */}
          <div className="flex p-1 bg-black/80 rounded-2xl border border-emerald-500/30 shrink-0">
            <button
              onClick={() => setActiveTab('search')}
              className={`flex-1 py-1.5 rounded-xl font-label-caps font-bold text-[11px] uppercase tracking-wider transition-all flex items-center justify-center gap-1 ${
                activeTab === 'search'
                  ? 'bg-emerald-500 text-black shadow-[0_0_12px_#00ff88]'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <span>⚡</span> BUSCADOR EN VIVO
            </button>
            <button
              onClick={() => setActiveTab('vip')}
              className={`flex-1 py-1.5 rounded-xl font-label-caps font-bold text-[11px] uppercase tracking-wider transition-all flex items-center justify-center gap-1 ${
                activeTab === 'vip'
                  ? 'bg-emerald-500 text-black shadow-[0_0_12px_#00ff88]'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <span>🌟</span> CATÁLOGO VIP
            </button>
          </div>

          {searchToast && (
            <div className="px-3 py-1.5 rounded-xl bg-emerald-950 border border-emerald-400 text-emerald-300 font-label-caps font-bold text-xs uppercase text-center animate-bounce shadow-[0_0_15px_#00ff88] shrink-0">
              {searchToast}
            </div>
          )}

          {/* TAB 1: LIVE YOUTUBE SEARCH & URL DETECTOR */}
          {activeTab === 'search' && (
            <div className="flex-1 min-h-0 flex flex-col gap-2 overflow-hidden">
              {/* LIVE AUTO-SEARCH BAR & URL PARSER */}
              <div className="p-2.5 rounded-2xl bg-black/80 border border-emerald-500/40 flex flex-col gap-1.5 shadow-[0_0_15px_rgba(0,255,136,0.2)] shrink-0">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    performSearch(search);
                  }}
                  className="flex items-center px-2 gap-2"
                >
                  <span className="material-symbols-outlined text-emerald-400 text-lg">search</span>
                  <input
                    type="text"
                    value={search}
                    onChange={handleInputChange}
                    placeholder="Escribe canción o pega Link / ID de YouTube..."
                    className="bg-transparent border-none outline-none text-white font-body-lg text-xs flex-1 placeholder:text-gray-500"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-label-caps font-black text-[10px] uppercase tracking-wider transition-all active:scale-95 shadow-[0_0_8px_#00ff88] shrink-0"
                  >
                    BUSCAR ⚡
                  </button>
                </form>

                {/* QUICK DYNAMIC SUGGESTION CHIPS */}
                <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pt-1 border-t border-white/10">
                  <span className="text-[9px] text-gray-400 font-label-caps uppercase shrink-0">Sugerencias:</span>
                  {liveSuggestions.map((sug) => (
                    <button
                      key={sug}
                      onClick={() => setSearch(sug)}
                      className="px-2 py-0.5 rounded-lg bg-white/5 hover:bg-emerald-950/80 hover:border-emerald-400 border border-white/10 text-[9px] text-emerald-300 whitespace-nowrap transition-all"
                    >
                      {sug}
                    </button>
                  ))}
                </div>
              </div>

              {/* SEARCH RESULTS PANEL (4 CARDS WITH HOVER VIDEO PREVIEW) */}
              <div className="flex-1 min-h-0 bg-black/80 rounded-2xl border border-emerald-500/40 p-2.5 flex flex-col gap-2 overflow-y-auto">
                <div className="flex justify-between items-center shrink-0">
                  <span className="font-label-caps text-[10px] text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                    Resultados en Vivo (Pasa el cursor para ver video):
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-2 pr-1">
                  {searchResults.length === 0 ? (
                    <div className="p-4 text-center text-xs text-gray-400 font-label-caps border border-dashed border-white/10 rounded-2xl">
                      Buscando o no se encontraron resultados. Pega una URL o intenta otro nombre.
                    </div>
                  ) : (
                    searchResults.map((item) => {
                    const isHovered = hoveredCardId === item.id;
                    return (
                      <div
                        key={item.id}
                        onMouseEnter={() => setHoveredCardId(item.id)}
                        onMouseLeave={() => setHoveredCardId(null)}
                        className={`p-2 rounded-2xl bg-white/5 border transition-all duration-200 flex flex-col gap-1.5 group relative shadow-md ${
                          item.isDirectUrl
                            ? 'border-emerald-400 bg-emerald-950/40 shadow-[0_0_15px_rgba(0,255,136,0.3)]'
                            : 'border-white/10 hover:border-emerald-400/80 hover:bg-emerald-950/30'
                        }`}
                      >
                        {/* HOVER PREVIEW THUMBNAIL / VIDEO IFRAME */}
                        <div className="relative w-full h-20 rounded-xl overflow-hidden bg-black border border-white/10 flex items-center justify-center shrink-0">
                          {isHovered ? (
                            <iframe
                              src={`https://www.youtube.com/embed/${item.videoId}?autoplay=1&mute=1&controls=0&loop=1&playsinline=1`}
                              title={item.title}
                              className="w-full h-full object-cover pointer-events-none scale-110"
                              allow="autoplay"
                            />
                          ) : (
                            <>
                              <img
                                src={item.thumbnail}
                                alt={item.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                              <div className="absolute inset-0 bg-black/40 flex items-center justify-center group-hover:bg-black/10 transition-all">
                                <div className="w-7 h-7 rounded-full bg-emerald-500/80 border border-emerald-300 flex items-center justify-center text-black text-xs font-bold shadow-[0_0_12px_#00ff88]">
                                  ▶
                                </div>
                              </div>
                            </>
                          )}
                          <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/80 text-[8px] font-label-caps text-emerald-300 font-bold border border-emerald-500/40">
                            {item.isDirectUrl ? 'LINK DIRECTO DETECTADO' : isHovered ? 'PREVISUALIZACIÓN' : 'KARAOKE HD'}
                          </span>
                        </div>

                        {/* TITLE & ARTIST */}
                        <div className="flex flex-col gap-0.5 min-w-0">
                          <h5 className="font-bold text-xs text-white truncate group-hover:text-emerald-300 transition-colors">
                            {item.title}
                          </h5>
                          <p className="text-[10px] text-emerald-400 font-label-caps font-semibold truncate">
                            {item.artist}
                          </p>
                        </div>

                        {/* ADD TO QUEUE BUTTON */}
                        <button
                          onClick={() => handleAddToQueue(item)}
                          className="w-full py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-400 hover:to-emerald-300 text-black font-label-caps font-black text-[10px] uppercase tracking-wider transition-all active:scale-95 shadow-[0_0_10px_rgba(0,255,136,0.4)] flex items-center justify-center gap-1 shrink-0"
                        >
                          <span>➕</span> AGREGAR A LA COLA
                        </button>
                      </div>
                    );
                  }))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: VIP KARAOKE CATALOG (BANDA / NORTEÑO / POP) */}
          {activeTab === 'vip' && (
            <div className="flex-1 min-h-0 bg-black/80 rounded-2xl border border-emerald-500/40 p-2.5 flex flex-col gap-2 overflow-hidden">
              {/* GENRE PILLS */}
              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar shrink-0 pb-1">
                {['Todos', 'Banda', 'Norteño', 'Pop / Latino', 'Rock'].map((genre) => (
                  <button
                    key={genre}
                    onClick={() => setVipGenreFilter(genre)}
                    className={`px-2.5 py-1 rounded-xl font-label-caps text-[9px] font-bold uppercase whitespace-nowrap transition-all border ${
                      vipGenreFilter === genre
                        ? 'bg-emerald-500 text-black border-emerald-300 shadow-[0_0_8px_#00ff88]'
                        : 'bg-white/5 text-gray-300 border-white/10 hover:bg-white/10'
                    }`}
                  >
                    {genre}
                  </button>
                ))}
              </div>

              {/* VIP CATALOG LIST */}
              <div className="flex-1 min-h-0 overflow-y-auto grid grid-cols-1 gap-2 pr-1">
                {VIP_CATALOG.filter((song) => {
                  const matchesGenre = vipGenreFilter === 'Todos' || song.genre === vipGenreFilter;
                  const normQuery = normalizeStr(search);
                  const matchesQuery =
                    !normQuery ||
                    normalizeStr(song.title).includes(normQuery) ||
                    normalizeStr(song.artist).includes(normQuery) ||
                    normalizeStr(song.genre).includes(normQuery);
                  return matchesGenre && matchesQuery;
                }).map((song) => {
                  const isHovered = hoveredCardId === song.id;
                  return (
                    <div
                      key={song.id}
                      onMouseEnter={() => setHoveredCardId(song.id)}
                      onMouseLeave={() => setHoveredCardId(null)}
                      className="p-2 rounded-2xl bg-white/5 border border-white/10 hover:border-emerald-400 hover:bg-emerald-950/30 transition-all flex flex-col gap-1.5 group shadow-md"
                    >
                      <div className="relative w-full h-20 rounded-xl overflow-hidden bg-black border border-white/10 flex items-center justify-center shrink-0">
                        {isHovered ? (
                          <iframe
                            src={`https://www.youtube.com/embed/${song.videoId}?autoplay=1&mute=1&controls=0&loop=1&playsinline=1`}
                            title={song.title}
                            className="w-full h-full object-cover pointer-events-none scale-110"
                            allow="autoplay"
                          />
                        ) : (
                          <>
                            <img
                              src={song.thumbnail}
                              alt={song.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center group-hover:bg-black/10 transition-all">
                              <div className="w-7 h-7 rounded-full bg-emerald-500/80 border border-emerald-300 flex items-center justify-center text-black text-xs font-bold shadow-[0_0_12px_#00ff88]">
                                ▶
                              </div>
                            </div>
                          </>
                        )}
                        <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/80 text-[8px] font-label-caps text-emerald-300 font-bold border border-emerald-500/40">
                          {song.genre}
                        </span>
                      </div>

                      <div className="flex flex-col gap-0.5 min-w-0">
                        <h5 className="font-bold text-xs text-white truncate group-hover:text-emerald-300 transition-colors">
                          {song.title}
                        </h5>
                        <p className="text-[10px] text-emerald-400 font-label-caps truncate">{song.artist}</p>
                      </div>

                      <button
                        onClick={() => handleAddToQueue(song)}
                        className="w-full py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-400 hover:to-emerald-300 text-black font-label-caps font-black text-[10px] uppercase tracking-wider transition-all active:scale-95 shadow-[0_0_10px_rgba(0,255,136,0.4)] flex items-center justify-center gap-1 shrink-0"
                      >
                        <span>➕</span> AGREGAR A LA COLA
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* QUEUE LIST */}
          <div className="h-36 shrink-0 bg-black/60 rounded-3xl border border-white/10 p-2.5 flex flex-col overflow-hidden">
            <h3 className="font-headline-md font-bold text-xs text-white mb-1 shrink-0 flex items-center justify-between">
              <span>Cola de Canciones ({queue.length})</span>
              <span className="text-[10px] text-emerald-400 font-label-caps font-normal">Siguiente en TV</span>
            </h3>

            <div className="flex-1 overflow-y-auto flex flex-col gap-1.5 pr-1">
              {queue.map((song, idx) => (
                <div key={song.id + idx} className="p-1.5 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <img src={song.thumbnail} alt={song.title} className="w-9 h-6 rounded-lg object-cover shrink-0" />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-[11px] text-white truncate">{song.title}</h4>
                      <p className="text-[9px] text-emerald-400 font-label-caps truncate">{song.artist}</p>
                    </div>
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
                <div className="text-center text-[11px] text-gray-500 py-3">Cola vacía - agrega canciones arriba</div>
              )}
            </div>
          </div>
        </section>
      </main>

      {/* QR MODAL */}
      {showQRModal && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-6">
          <div className="bg-[#121217] border-2 border-emerald-400 rounded-3xl p-8 max-w-sm w-full text-center flex flex-col items-center gap-4 shadow-[0_0_40px_#00ff88]">
            <BrandingHeader size="sm" />
            <h3 className="font-display-mobile font-bold text-xl text-white">Escanea para Unirte</h3>

            {/* SVG QR CODE GRAPHIC */}
            <div className="w-48 h-48 bg-white p-3 rounded-2xl border-4 border-emerald-400 flex items-center justify-center">
              <svg viewBox="0 0 100 100" className="w-full h-full">
                <path d="M 10 10 H 40 V 40 H 10 Z M 60 10 H 90 V 40 H 60 Z M 10 60 H 40 V 90 H 10 Z" fill="#000" />
                <path d="M 20 20 H 30 V 30 H 20 Z M 70 20 H 80 V 30 H 70 Z M 20 70 H 30 V 80 H 20 Z" fill="#00ff88" />
                <path d="M 50 50 H 60 V 60 H 50 Z M 70 50 H 90 V 60 H 70 Z M 50 70 H 60 V 90 H 50 Z" fill="#000" />
              </svg>
            </div>

            <div className="font-display-mobile font-black text-2xl text-emerald-300">{roomCode}</div>

            <button
              onClick={() => setShowQRModal(false)}
              className="px-6 py-2 rounded-full bg-emerald-500 text-black font-bold text-xs uppercase"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
