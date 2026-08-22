import React, { useState } from 'react';
import { usePachanga } from '../context/PachangaContext';

export const DiagnosticConsole: React.FC = () => {
  const {
    isDebugConsoleOpen,
    setIsDebugConsoleOpen,
    roomRole,
    myPeerId,
    connectionStatusLabel,
    lastSentPacket,
    lastReceivedPacket,
    logs,
  } = usePachanga();

  const [copied, setCopied] = useState(false);

  if (!isDebugConsoleOpen) return null;

  const handleCopyLogs = () => {
    const textToCopy = `=== CONSOLA DE DIAGNÓSTICO PACHANGA V1.4.8 ===
Fecha: ${new Date().toLocaleString('es-ES')}
Rol: ${roomRole === 'host' ? 'TV Host' : 'Músico Cliente'}
Peer ID: ${myPeerId || 'N/A'}
Estado Conexión: [${connectionStatusLabel}]
Último Enviado: ${lastSentPacket ? `${lastSentPacket.timestamp} - ${lastSentPacket.type} (${lastSentPacket.summary})` : 'Ninguno'}
Último Recibido: ${lastReceivedPacket ? `${lastReceivedPacket.timestamp} - ${lastReceivedPacket.type} (${lastReceivedPacket.summary})` : 'Ninguno'}

--- HISTORIAL DE PAQUETES ---
${logs.join('\n')}
`;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed bottom-3 left-3 z-50 bg-black/90 backdrop-blur-md border border-emerald-500/60 rounded-xl p-3.5 shadow-[0_0_35px_rgba(0,255,136,0.3)] max-w-sm sm:max-w-md w-80 sm:w-96 text-[11px] font-mono text-emerald-300 select-text animate-fade-in">
      {/* HEADER BAR */}
      <div className="flex items-center justify-between border-b border-emerald-500/40 pb-2 mb-2">
        <div className="flex items-center gap-1.5 font-bold text-white text-xs">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#00ff88]" />
          <span>📟 CONSOLA DIAGNÓSTICO V1.4.8</span>
        </div>
        <button
          onClick={() => setIsDebugConsoleOpen(false)}
          className="text-gray-400 hover:text-white px-1.5 py-0.5 rounded bg-white/10 hover:bg-white/20 text-xs font-bold transition-all"
          title="Cerrar consola (o presiona 'D')"
        >
          ✕
        </button>
      </div>

      {/* METRICS & STATUS */}
      <div className="space-y-1 mb-2 bg-emerald-950/40 p-2 rounded-lg border border-emerald-500/30">
        <div className="truncate">
          <strong className="text-gray-400">Peer ID / Rol:</strong>{' '}
          <span className="text-white font-bold">{myPeerId || 'Iniciando...'}</span> ({roomRole === 'host' ? 'TV Host' : 'Músico Cliente'})
        </div>

        <div className="flex items-center gap-1.5">
          <strong className="text-gray-400">Estado:</strong>
          <span
            className={`px-2 py-0.5 rounded font-bold text-[10px] tracking-wide uppercase ${
              connectionStatusLabel === 'ENLAZADO OK'
                ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-400 shadow-[0_0_8px_rgba(0,255,136,0.3)]'
                : connectionStatusLabel === 'CONECTANDO'
                ? 'bg-amber-500/30 text-amber-300 border border-amber-400 animate-pulse'
                : 'bg-red-500/30 text-red-300 border border-red-400'
            }`}
          >
            [{connectionStatusLabel}]
          </span>
        </div>

        <div className="truncate">
          <strong className="text-gray-400">Último Enviado:</strong>{' '}
          {lastSentPacket ? (
            <span className="text-cyan-300">
              {lastSentPacket.timestamp} - {lastSentPacket.type}
            </span>
          ) : (
            <span className="text-gray-500">Ninguno</span>
          )}
        </div>

        <div className="truncate">
          <strong className="text-gray-400">Último Recibido:</strong>{' '}
          {lastReceivedPacket ? (
            <span className="text-amber-300">
              {lastReceivedPacket.timestamp} - {lastReceivedPacket.type}
            </span>
          ) : (
            <span className="text-gray-500">Ninguno</span>
          )}
        </div>
      </div>

      {/* LOGS SCROLLVIEW */}
      <div className="h-32 overflow-y-auto bg-black/80 p-2 rounded-lg border border-white/10 space-y-1 text-[10px] leading-tight font-mono mb-2 scrollbar-thin">
        {logs.length === 0 ? (
          <div className="text-gray-500 italic py-2 text-center">Esperando tráfico de red WebRTC...</div>
        ) : (
          logs.map((log, idx) => (
            <div
              key={idx}
              className={log.startsWith('[OUT') ? 'text-cyan-300' : log.startsWith('[IN') ? 'text-emerald-300' : 'text-gray-300'}
            >
              {log}
            </div>
          ))
        )}
      </div>

      {/* FOOTER ACTIONS */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-[9px] text-gray-500">3 clics logo / Tecla 'D'</span>
        <button
          onClick={handleCopyLogs}
          className="px-3 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-[10px] uppercase transition-all shadow-[0_0_10px_#00ff88] active:scale-95"
        >
          {copied ? '✅ COPIADO!' : '📋 COPIAR REGISTRO'}
        </button>
      </div>
    </div>
  );
};
