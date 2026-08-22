import React, { useState } from 'react';
import { HashRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { PachangaProvider, usePachanga } from './context/PachangaContext';
import { MobileDrumPad } from './components/MobileDrumPad';
import { TVStage } from './components/TVStage';
import { DJController } from './components/DJController';
import { BrandingHeader } from './components/BrandingHeader';
import { DiagnosticConsole } from './components/DiagnosticConsole';

function Home() {
  const { setRoomCode, addPlayer, setRoomRole, myPlayer } = usePachanga();
  const navigate = useNavigate();

  const [inputCode, setInputCode] = useState('192916');
  const [nickname, setNickname] = useState('');
  const [selectedInstrument, setSelectedInstrument] = useState('Trompeta');
  const [mode, setMode] = useState<'main' | 'join'>('main');
  const [showScoreChoiceModal, setShowScoreChoiceModal] = useState<boolean>(false);
  const [pendingJoin, setPendingJoin] = useState<{ name: string; instrument: string } | null>(null);

  React.useEffect(() => {
    const saved = localStorage.getItem('pachanga_my_player');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.name) setNickname(parsed.name);
        if (parsed.instrument) setSelectedInstrument(parsed.instrument);
      } catch (e) {}
    } else if (myPlayer?.name) {
      setNickname(myPlayer.name);
      if (myPlayer.instrument) setSelectedInstrument(myPlayer.instrument);
    }
  }, [myPlayer]);

  const handleCreateParty = () => {
    setRoomCode('192916');
    setRoomRole('host');
    navigate('/tv');
  };

  const handleJoinParty = (e: React.FormEvent) => {
    e.preventDefault();
    const finalNickname = nickname.trim() || 'Benjume Chamorros';
    
    // Check if saved profile exists with score > 0 and name is modified
    const savedRaw = localStorage.getItem('pachanga_my_player');
    if (savedRaw) {
      try {
        const parsed = JSON.parse(savedRaw);
        if (parsed.score > 0 && parsed.name.toLowerCase() !== finalNickname.toLowerCase()) {
          setPendingJoin({ name: finalNickname, instrument: selectedInstrument });
          setShowScoreChoiceModal(true);
          return;
        }
      } catch (e) {}
    }

    setRoomCode(inputCode || '192916');
    setRoomRole('musician');
    addPlayer(finalNickname, selectedInstrument, false);
    navigate('/mobile');
  };

  const confirmJoin = (resetScore: boolean) => {
    if (!pendingJoin) return;
    setRoomCode(inputCode || '192916');
    setRoomRole('musician');
    addPlayer(pendingJoin.name, pendingJoin.instrument, resetScore);
    setShowScoreChoiceModal(false);
    navigate('/mobile');
  };

  return (
    <div className="min-h-screen w-screen bg-[#070709] text-white flex flex-col items-center justify-center p-6 select-none relative overflow-hidden antialiased">
      {/* FEVER DISCO FLOOR BACKGROUND */}
      <div className="absolute inset-0 fever-disco-floor opacity-30 pointer-events-none" />

      <div className="max-w-xl w-full flex flex-col items-center gap-8 relative z-10 bg-black/70 backdrop-blur-2xl p-8 rounded-3xl border border-emerald-500/40 shadow-[0_0_50px_rgba(0,255,136,0.25)]">
        {/* BRANDING LOGO */}
        <BrandingHeader size="lg" showDiscoFloor />

        {mode === 'main' ? (
          <div className="w-full flex flex-col gap-5 mt-2">
            <button
              onClick={handleCreateParty}
              className="w-full py-5 rounded-2xl bg-gradient-to-r from-emerald-500 via-emerald-400 to-[#00A86B] text-black font-display-mobile font-black text-2xl uppercase tracking-wider shadow-[0_0_25px_#00ff88] hover:scale-102 active:scale-95 transition-all flex items-center justify-center gap-3"
            >
              <span>🎉</span> CREAR MI FIESTA (MODO TV)
            </button>

            <button
              onClick={() => setMode('join')}
              className="w-full py-5 rounded-2xl bg-white/10 hover:bg-white/15 border-2 border-emerald-400 text-emerald-300 font-display-mobile font-black text-2xl uppercase tracking-wider shadow-[0_0_20px_rgba(0,255,136,0.2)] hover:scale-102 active:scale-95 transition-all flex items-center justify-center gap-3"
            >
              <span>🎸</span> UNIRSE A UNA FIESTA (MÓVIL)
            </button>

            <button
              onClick={() => navigate('/dj')}
              className="w-full py-3.5 rounded-2xl bg-black/60 hover:bg-black/80 border border-white/20 text-gray-300 font-label-caps font-bold text-sm uppercase tracking-widest hover:text-white transition-all flex items-center justify-center gap-2"
            >
              <span>🎧</span> CONTROLADOR DJ & MESA DE MEZCLAS
            </button>
          </div>
        ) : (
          <form onSubmit={handleJoinParty} className="w-full flex flex-col gap-4 mt-2">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-label-caps uppercase font-bold text-emerald-400">Código de Sala:</label>
              <input
                type="text"
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                placeholder="Ej: 192916"
                className="p-3.5 rounded-xl bg-white/10 border border-emerald-500/50 text-white font-display-mobile font-bold text-center text-xl tracking-wider outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/50"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-label-caps uppercase font-bold text-emerald-400">Tu Nombre de Músico:</label>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="Ej: Benjume Chamorros"
                className="p-3.5 rounded-xl bg-white/10 border border-emerald-500/50 text-white font-body-lg text-lg outline-none focus:border-emerald-400 placeholder:text-gray-500"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-label-caps uppercase font-bold text-emerald-400">Tu Instrumento:</label>
              <select
                value={selectedInstrument}
                onChange={(e) => setSelectedInstrument(e.target.value)}
                className="p-3.5 rounded-xl bg-[#181820] border border-emerald-500/50 text-white font-body-lg text-base outline-none focus:border-emerald-400"
              >
                <option value="Trompeta">🎺 Trompeta de Bronce</option>
                <option value="Batería">🥁 Batería Acústica</option>
                <option value="Timbal">🥁 Timbal Latino (Percusión VIP)</option>
                <option value="Guitarra">🎸 Guitarra / Bajo</option>
                <option value="Piano">🎹 Teclado / Piano 3D</option>
                <option value="Acordeón">🪗 Acordeón de Fiesta</option>
              </select>
            </div>

            <div className="flex gap-3 mt-3">
              <button
                type="button"
                onClick={() => setMode('main')}
                className="flex-1 py-3.5 rounded-xl bg-white/10 text-gray-300 font-label-caps font-bold text-xs uppercase"
              >
                Volver
              </button>

              <button
                type="submit"
                className="flex-[2] py-3.5 rounded-xl bg-emerald-500 text-black font-display-mobile font-black text-lg uppercase tracking-wider shadow-[0_0_20px_#00ff88] hover:scale-102 active:scale-95 transition-all"
              >
                ¡ENTRAR Y TOCAR!
              </button>
            </div>
          </form>
        )}
      </div>

      {/* SCORE PRESERVATION MODAL */}
      {showScoreChoiceModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-neutral-900 border-2 border-emerald-500 rounded-3xl p-6 flex flex-col items-center text-center shadow-[0_0_40px_rgba(0,255,136,0.3)]">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-400 flex items-center justify-center text-3xl mb-4">
              🎺
            </div>
            <h3 className="font-display-mobile font-black text-2xl text-emerald-300 uppercase tracking-wide mb-2">
              Modificación de Nombre
            </h3>
            <p className="text-sm text-gray-300 font-body-lg mb-6 leading-relaxed">
              Detectamos que estás cambiando tu nombre a <strong className="text-white font-bold">{pendingJoin?.name}</strong>. ¿Deseas conservar tu puntaje acumulado o iniciar en 0?
            </p>

            <div className="w-full flex flex-col gap-3">
              <button
                onClick={() => confirmJoin(false)}
                className="w-full py-3.5 rounded-xl bg-emerald-500 text-black font-display-mobile font-black text-sm uppercase tracking-wider shadow-[0_0_15px_#00ff88] hover:scale-102 active:scale-95 transition-all"
              >
                ✨ CONSERVAR MI PUNTAJE
              </button>

              <button
                onClick={() => confirmJoin(true)}
                className="w-full py-3.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-display-mobile font-bold text-sm uppercase tracking-wider border border-white/20 active:scale-95 transition-all"
              >
                🔄 INICIAR EN 0 PTS
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <PachangaProvider>
      <HashRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/mobile" element={<MobileDrumPad />} />
          <Route path="/tv" element={<TVStage />} />
          <Route path="/dj" element={<DJController />} />
        </Routes>
        <DiagnosticConsole />
      </HashRouter>
    </PachangaProvider>
  );
}
