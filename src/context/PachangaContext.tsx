import { createContext, useContext, useState, ReactNode, useEffect, useRef } from 'react';
import Peer, { DataConnection } from 'peerjs';

export type Song = {
  id: string;
  videoId: string;
  title: string;
  artist: string;
  thumbnail: string;
};

export type Player = {
  id: string;
  deviceId?: string;
  name: string;
  instrument: string;
  score: number;
  streak: number;
  avatar: string;
  title: string;
};

export type DifficultyLevel = 'basic' | 'intermediate' | 'advanced' | 'expert' | 'auto';

export const getDeviceId = (): string => {
  let devId = localStorage.getItem('pachanga_device_id');
  if (!devId) {
    devId = `dev_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    localStorage.setItem('pachanga_device_id', devId);
  }
  return devId;
};

export const VIP_CATALOG: (Song & { genre: string })[] = [
  {
    id: 'vip_1',
    videoId: 'bUUgV6rhAbI',
    title: 'Qué fuimos - Grupo Firme (Karaoke)',
    artist: 'Grupo Firme',
    thumbnail: 'https://img.youtube.com/vi/bUUgV6rhAbI/hqdefault.jpg',
    genre: 'Banda',
  },
  {
    id: 'vip_2',
    videoId: 'L_jWHffIx5E',
    title: 'El Color de Tus Ojos - Banda MS (Karaoke)',
    artist: 'Banda MS',
    thumbnail: 'https://img.youtube.com/vi/L_jWHffIx5E/hqdefault.jpg',
    genre: 'Banda',
  },
  {
    id: 'vip_3',
    videoId: '3JWTuu0u_U4',
    title: 'La Chona - Los Tucanes de Tijuana (Karaoke)',
    artist: 'Los Tucanes de Tijuana',
    thumbnail: 'https://img.youtube.com/vi/3JWTuu0u_U4/hqdefault.jpg',
    genre: 'Norteño',
  },
  {
    id: 'vip_4',
    videoId: 'kJQP7kiw5Fk',
    title: 'Despacito - Luis Fonsi ft. Daddy Yankee (Karaoke)',
    artist: 'Luis Fonsi',
    thumbnail: 'https://img.youtube.com/vi/kJQP7kiw5Fk/hqdefault.jpg',
    genre: 'Pop / Latino',
  },
  {
    id: 'vip_5',
    videoId: 'fJ9rUzIMcZQ',
    title: 'Bohemian Rhapsody - Queen (Karaoke HD)',
    artist: 'Queen',
    thumbnail: 'https://img.youtube.com/vi/fJ9rUzIMcZQ/hqdefault.jpg',
    genre: 'Rock',
  },
  {
    id: 'vip_6',
    videoId: 'pbQbqo5w-R8',
    title: "Don't Stop Believin' - Journey (Karaoke)",
    artist: 'Journey',
    thumbnail: 'https://img.youtube.com/vi/pbQbqo5w-R8/hqdefault.jpg',
    genre: 'Rock',
  },
  {
    id: 'vip_7',
    videoId: '_W2x0cI_5k4',
    title: 'Mix Cumbia y Norteño VIP Pachanga',
    artist: 'Tropa VIP Benjume',
    thumbnail: 'https://img.youtube.com/vi/_W2x0cI_5k4/hqdefault.jpg',
    genre: 'Norteño',
  },
  {
    id: 'vip_8',
    videoId: '450p7goxZqg',
    title: 'Grandes Éxitos de Fiesta Karaoke',
    artist: 'Banda Pachanga VIP',
    thumbnail: 'https://img.youtube.com/vi/450p7goxZqg/hqdefault.jpg',
    genre: 'Banda',
  },
];

export const MOCK_DATABASE: Song[] = VIP_CATALOG.map((item) => ({
  id: item.id,
  videoId: item.videoId,
  title: item.title,
  artist: item.artist,
  thumbnail: item.thumbnail,
}));

export type FloatingReaction = {
  id: string;
  emoji: string;
  senderName: string;
  x: number;
};

export type TvToast = {
  id: string;
  text: string;
  icon: string;
};

type PachangaContextType = {
  roomCode: string;
  setRoomCode: (code: string) => void;
  roomRole: 'host' | 'musician';
  setRoomRole: (role: 'host' | 'musician') => void;
  players: Player[];
  addPlayer: (name: string, instrument: string, resetScore?: boolean) => void;
  removePlayer: (id: string) => void;
  difficulty: DifficultyLevel;
  setDifficulty: (level: DifficultyLevel) => void;
  isSoloMode: boolean;
  toggleSoloMode: () => void;
  isGranFinale: boolean;
  triggerGranFinale: () => void;
  resetScores: () => void;
  forceRoomReset: () => void;
  queue: Song[];
  nowPlaying: Song | null;
  score: number;
  isPlaying: boolean;
  addSong: (song: Song) => void;
  removeSong: (index: number) => void;
  moveSongUp: (index: number) => void;
  videoCurrentTime: number;
  emitVideoTime: (time: number) => void;
  nextSong: () => void;
  updateScore: (points: number) => void;
  setPlaying: (playing: boolean) => void;
  liveReactions: FloatingReaction[];
  triggerReaction: (emoji: string, senderName: string) => void;
  connectedPeersCount: number;
  peerConnectionStatus: 'connecting' | 'connected';
  myPlayer: Player | null;
  tvToasts: TvToast[];
  addTvToast: (text: string, icon?: string) => void;
  pendingRelayRequest: boolean;
  setPendingRelayRequest: (pending: boolean) => void;
  instanceId: string;
  activeHostId: string | null;
  lastHostHeartbeat: number;
  requestTvRelay: () => void;
  forceTakeoverHost: () => void;
  getDeviceId: () => string;
  isDebugConsoleOpen: boolean;
  setIsDebugConsoleOpen: React.Dispatch<React.SetStateAction<boolean>>;
  toggleDebugConsole: () => void;
  myPeerId: string;
  connectionStatusLabel: 'DESCONECTADO' | 'CONECTANDO' | 'ENLAZADO OK';
  lastSentPacket: { timestamp: string; type: string; summary: string } | null;
  lastReceivedPacket: { timestamp: string; type: string; summary: string } | null;
  logs: string[];
};

const PachangaContext = createContext<PachangaContextType | undefined>(undefined);

export function PachangaProvider({ children }: { children: ReactNode }) {
  const instanceId = useRef<string>(Math.random().toString());
  const channelRef = useRef<BroadcastChannel | null>(null);

  const [roomCode, setRoomCode] = useState<string>('192916');
  const [roomRole, setRoomRole] = useState<'host' | 'musician'>('host');
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('intermediate');
  const [isSoloMode, setIsSoloMode] = useState<boolean>(false);
  const [isGranFinale, setIsGranFinale] = useState<boolean>(false);
  const [liveReactions, setLiveReactions] = useState<FloatingReaction[]>([]);
  const [pendingRelayRequest, setPendingRelayRequest] = useState<boolean>(false);

  const [players, setPlayers] = useState<Player[]>([
    { id: '1', name: 'Benjume (Trompeta)', instrument: 'Trompeta', score: 14200, streak: 12, avatar: '🎺', title: '👑 Rey del Solo' },
    { id: '2', name: 'Maya (Batería)', instrument: 'Batería', score: 12850, streak: 8, avatar: '🥁', title: '⚡ Chispa Rítmica' },
    { id: '3', name: 'Darek (Guitarra)', instrument: 'Guitarra', score: 11400, streak: 5, avatar: '🎸', title: '🔥 Guitarrero Legendario' },
    { id: '4', name: 'Carlos (Acordeón)', instrument: 'Acordeón', score: 9800, streak: 3, avatar: '🪗', title: '🍻 Animador Oficial' },
  ]);

  const [queue, setQueue] = useState<Song[]>([MOCK_DATABASE[1], MOCK_DATABASE[2]]);
  const [nowPlaying, setNowPlaying] = useState<Song | null>(MOCK_DATABASE[0]);
  const [score, setScore] = useState<number>(14200);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [videoCurrentTime, setVideoCurrentTime] = useState<number>(0);

  const [connectedPeersCount, setConnectedPeersCount] = useState<number>(0);
  const [peerConnectionStatus, setPeerConnectionStatus] = useState<'connecting' | 'connected'>('connecting');
  const [myPlayer, setMyPlayer] = useState<Player | null>(null);
  const [tvToasts, setTvToasts] = useState<TvToast[]>([]);

  // Diagnostic Console State
  const [isDebugConsoleOpen, setIsDebugConsoleOpen] = useState<boolean>(false);
  const [myPeerId, setMyPeerId] = useState<string>('');
  const [lastSentPacket, setLastSentPacket] = useState<{ timestamp: string; type: string; summary: string } | null>(null);
  const [lastReceivedPacket, setLastReceivedPacket] = useState<{ timestamp: string; type: string; summary: string } | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

  const toggleDebugConsole = () => {
    setIsDebugConsoleOpen((prev) => !prev);
  };

  const formatTimeWithMs = () => {
    const d = new Date();
    const time = d.toLocaleTimeString('es-ES', { hour12: false });
    const ms = String(d.getMilliseconds()).padStart(3, '0');
    return `${time}.${ms}`;
  };

  const logPacketSent = (type: string, data?: any) => {
    const ts = formatTimeWithMs();
    const summary = data ? (typeof data === 'string' ? data : JSON.stringify(data)).substring(0, 80) : '';
    setLastSentPacket({ timestamp: ts, type, summary });
    const line = `[OUT ${ts}] ${type} ${summary}`;
    setLogs((prev) => [...prev.slice(-49), line]);
  };

  const logPacketReceived = (type: string, data?: any) => {
    const ts = formatTimeWithMs();
    const summary = data ? (typeof data === 'string' ? data : JSON.stringify(data)).substring(0, 80) : '';
    setLastReceivedPacket({ timestamp: ts, type, summary });
    const line = `[IN  ${ts}] ${type} ${summary}`;
    setLogs((prev) => [...prev.slice(-49), line]);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key.toLowerCase() === 'd' &&
        !['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)
      ) {
        toggleDebugConsole();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const peerRef = useRef<any>(null);
  const peerConnsRef = useRef<DataConnection[]>([]);
  const clientConnRef = useRef<DataConnection | null>(null);

  const connectionStatusLabel: 'DESCONECTADO' | 'CONECTANDO' | 'ENLAZADO OK' =
    peerConnectionStatus === 'connected' || (clientConnRef.current && clientConnRef.current.open) || connectedPeersCount > 0
      ? 'ENLAZADO OK'
      : peerConnectionStatus === 'connecting'
      ? 'CONECTANDO'
      : 'DESCONECTADO';

  const myPlayerRef = useRef<Player | null>(null);
  useEffect(() => { myPlayerRef.current = myPlayer; }, [myPlayer]);

  const lastVideoTimeReceivedRef = useRef<number>(0);

  const [activeHostId, setActiveHostId] = useState<string | null>(null);
  const [lastHostHeartbeat, setLastHostHeartbeat] = useState<number>(0);

  const requestTvRelay = () => {
    broadcastMsg('REQUEST_TV_RELAY', { requesterId: instanceId.current });
  };

  const forceTakeoverHost = () => {
    try {
      localStorage.removeItem('pachanga_tv_host_active');
      localStorage.removeItem('tv_host_active');
      localStorage.removeItem('pachanga_host_id');
      localStorage.removeItem('pachanga_sync_192916');
    } catch (e) {}

    setRoomRole('host');
    setActiveHostId(instanceId.current);
    setLastHostHeartbeat(Date.now());
    setPendingRelayRequest(false);
    broadcastMsg('FORCE_TAKEOVER_TV', { newHostId: instanceId.current });
    broadcastMsg('ACCEPT_TV_RELAY', { newHostId: instanceId.current });
  };

  // Heartbeat loop for Host TV
  useEffect(() => {
    if (roomRole === 'host') {
      setActiveHostId(instanceId.current);
      setLastHostHeartbeat(Date.now());
      const heartbeatInterval = setInterval(() => {
        broadcastMsg('TV_HEARTBEAT', {
          hostId: instanceId.current,
          timestamp: Date.now(),
          roomCode,
        });
      }, 2000);
      return () => clearInterval(heartbeatInterval);
    }
  }, [roomRole, roomCode]);

  // High-frequency Clock Sync (20 times per second = 50ms interval) when playing
  useEffect(() => {
    if (roomRole === 'host' && isPlaying) {
      const syncInterval = setInterval(() => {
        broadcastMsg('SYNC_CLOCK', {
          isPlaying: true,
          currentTime: videoCurrentTimeRef.current,
          videoId: nowPlayingRef.current?.videoId,
        });
      }, 50);
      return () => clearInterval(syncInterval);
    }
  }, [roomRole, isPlaying]);

  // Sync players list from host to all connected clients ONLY when players content actually changes
  const prevPlayersJsonRef = useRef<string>('');
  useEffect(() => {
    if (roomRole === 'host' && players.length > 0) {
      const currentJson = JSON.stringify(players);
      if (currentJson !== prevPlayersJsonRef.current) {
        prevPlayersJsonRef.current = currentJson;
        broadcastMsg('SYNC_PLAYERS', players);
      }
    }
  }, [players, roomRole]);

  const isPlayingRef = useRef(isPlaying);
  const videoCurrentTimeRef = useRef(videoCurrentTime);
  const nowPlayingRef = useRef(nowPlaying);
  const queueRef = useRef(queue);
  const scoreRef = useRef(score);
  const playersRef = useRef(players);
  const connectToHostRef = useRef<(() => void) | null>(null);

  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);
  useEffect(() => { videoCurrentTimeRef.current = videoCurrentTime; }, [videoCurrentTime]);
  useEffect(() => { nowPlayingRef.current = nowPlaying; }, [nowPlaying]);
  useEffect(() => { queueRef.current = queue; }, [queue]);
  useEffect(() => { scoreRef.current = score; }, [score]);
  useEffect(() => { playersRef.current = players; }, [players]);

  const addTvToast = (text: string, icon = '🎷') => {
    const id = Math.random().toString();
    setTvToasts((prev) => [...prev, { id, text, icon }]);
    setTimeout(() => {
      setTvToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const emitVideoTime = (time: number) => {
    setVideoCurrentTime(time);
    broadcastMsg('VIDEO_TIME_SYNC', { currentTime: time });
  };

  // Broadcast helper across Local Channel + LocalStorage + Real WebRTC PeerJS
  const broadcastMsg = (type: string, payload?: any) => {
    // Host Authority Enforcement:
    // Musician clients MUST NOT broadcast SYNC_PLAYERS or FULL_SYNC!
    if (roomRole === 'musician' && (type === 'SYNC_PLAYERS' || type === 'FULL_SYNC')) {
      return;
    }

    const msg = { type, payload, senderId: instanceId.current, role: roomRole };
    logPacketSent(type, payload);

    if (channelRef.current) {
      try {
        channelRef.current.postMessage(msg);
      } catch (e) {
        console.warn('BroadcastChannel error:', e);
      }
    }
    try {
      localStorage.setItem(`pachanga_sync_${roomCode}`, JSON.stringify({ ...msg, ts: Date.now() }));
    } catch (e) {}

    // PeerJS WebRTC Multi-Device Sync
    if (roomRole === 'host') {
      peerConnsRef.current.forEach((conn) => {
        if (conn && conn.open) {
          try {
            conn.send(msg);
          } catch (e) {}
        }
      });
    } else if (clientConnRef.current && clientConnRef.current.open) {
      try {
        clientConnRef.current.send(msg);
      } catch (e) {}
    }
  };

  const handleMessage = (msg: any) => {
    if (!msg || msg.senderId === instanceId.current) return;
    logPacketReceived(msg.type, msg.payload);

    switch (msg.type) {
      case 'JOIN_ACK':
      case 'HOST_ACK':
        setPeerConnectionStatus('connected');
        setConnectedPeersCount((prev) => Math.max(1, prev));
        break;
      case 'FULL_SYNC':
        if (msg.payload && roomRole === 'musician') {
          lastVideoTimeReceivedRef.current = Date.now();
          if (msg.payload.queue) setQueue(msg.payload.queue);
          if (msg.payload.nowPlaying !== undefined) setNowPlaying(msg.payload.nowPlaying);
          if (typeof msg.payload.score === 'number') setScore(msg.payload.score);
          if (msg.payload.players && Array.isArray(msg.payload.players)) {
            setPlayers(msg.payload.players);
          }
          if (typeof msg.payload.videoCurrentTime === 'number') setVideoCurrentTime(msg.payload.videoCurrentTime);
          if (typeof msg.payload.isPlaying === 'boolean') setIsPlaying(msg.payload.isPlaying);
        }
        break;
      case 'TV_HEARTBEAT':
        if (msg.payload && msg.payload.hostId) {
          setActiveHostId(msg.payload.hostId);
          setLastHostHeartbeat(Date.now());
          if (roomRole === 'musician' && (!clientConnRef.current || !clientConnRef.current.open)) {
            connectToHostRef.current?.();
          }
        }
        break;
      case 'SYNC_CLOCK':
        if (msg.payload) {
          if (typeof msg.payload.isPlaying === 'boolean') {
            setIsPlaying(msg.payload.isPlaying);
          }
          if (typeof msg.payload.currentTime === 'number') {
            setVideoCurrentTime(msg.payload.currentTime);
            lastVideoTimeReceivedRef.current = Date.now();
          }
        }
        break;
      case 'REQUEST_TV_RELAY':
        if (roomRole === 'host') {
          setPendingRelayRequest(true);
          addTvToast('⚠️ Otra TV solicita el relevo al terminar la canción...', '📺');
        }
        break;
      case 'ACCEPT_TV_RELAY':
      case 'FORCE_TAKEOVER_TV':
        if (msg.payload?.newHostId) {
          if (msg.payload.newHostId === instanceId.current) {
            setRoomRole('host');
            setActiveHostId(instanceId.current);
            setLastHostHeartbeat(Date.now());
            setPendingRelayRequest(false);
          } else if (roomRole === 'host') {
            setRoomRole('musician');
          }
        } else {
          setRoomRole('host');
          setActiveHostId(instanceId.current);
          setLastHostHeartbeat(Date.now());
          setPendingRelayRequest(false);
        }
        break;
      case 'SYNC_PLAYERS':
        // Host Authority: ONLY musician clients process incoming SYNC_PLAYERS
        if (roomRole === 'musician') {
          if (Array.isArray(msg.payload) && msg.payload.length > 0) {
            const currentJson = JSON.stringify(playersRef.current);
            const newJson = JSON.stringify(msg.payload);
            if (currentJson !== newJson) {
              setPlayers(msg.payload);
            }
          }
        }
        break;
      case 'SCORE_UPDATE': {
        const pId = msg.payload?.id || msg.id;
        const newScore = msg.payload?.score ?? msg.score;
        const addedPoints = msg.payload?.addedPoints || 0;

        if (pId && roomRole === 'host') {
          setPlayers((prev) => {
            let changed = false;
            const updated = prev.map((p) => {
              if (p.id === pId || p.deviceId === pId) {
                const targetScore = typeof newScore === 'number' ? Math.max(p.score, newScore) : p.score + addedPoints;
                if (p.score !== targetScore) {
                  changed = true;
                  return { ...p, score: targetScore, streak: p.streak + 1 };
                }
              }
              return p;
            });
            return changed ? updated : prev;
          });
        }
        break;
      }
      case 'PLAYBACK_STATE':
        if (msg.payload && typeof msg.payload === 'object') {
          if (typeof msg.payload.isPlaying === 'boolean') {
            setIsPlaying(msg.payload.isPlaying);
          }
          if (typeof msg.payload.currentTime === 'number') {
            setVideoCurrentTime(msg.payload.currentTime);
            lastVideoTimeReceivedRef.current = Date.now();
          }
        } else if (msg.payload === 'PLAYING' || msg.payload === true) {
          setIsPlaying(true);
        } else if (msg.payload === 'PAUSED' || msg.payload === 'STOPPED' || msg.payload === false) {
          setIsPlaying(false);
        }
        break;
      case 'ADD_SONG':
        if (msg.payload) {
          setQueue((prev) => [...prev, msg.payload]);
        }
        break;
      case 'NEXT_SONG':
        setQueue((prevQueue) => {
          if (prevQueue.length > 0) {
            setNowPlaying(prevQueue[0]);
            return prevQueue.slice(1);
          } else {
            setNowPlaying(null);
            return [];
          }
        });
        break;
      case 'UPDATE_SCORE':
        if (typeof msg.payload === 'number') {
          setScore((prev) => prev + msg.payload);
          setPlayers((prev) =>
            prev.map((p, idx) => (idx === 0 ? { ...p, score: p.score + msg.payload, streak: p.streak + 1 } : p))
          );
        }
        break;
      case 'RESET_SCORES':
        setScore(0);
        setIsGranFinale(false);
        setIsSoloMode(false);
        setPlayers((prev) => prev.map((p) => ({ ...p, score: 0, streak: 0 })));
        break;
      case 'FORCE_ROOM_RESET':
        setPlayers([]);
        setScore(0);
        setIsGranFinale(false);
        setIsSoloMode(false);
        setMyPlayer(null);
        setConnectedPeersCount(0);
        try {
          localStorage.removeItem('pachanga_my_player');
        } catch (e) {}
        if (typeof window !== 'undefined' && window.location.hash !== '#/') {
          window.location.hash = '#/';
        }
        break;
      case 'KICK_PLAYER': {
        const targetId = msg.payload?.targetId || msg.payload;
        const currentDevId = getDeviceId();
        const isMe = (myPlayerRef.current && myPlayerRef.current.id === targetId) || currentDevId === targetId;

        if (targetId) {
          setPlayers((prev) => prev.filter((p) => p.id !== targetId));
        }

        if (isMe) {
          setMyPlayer(null);
          try {
            localStorage.removeItem('pachanga_my_player');
          } catch (e) {}
          if (typeof window !== 'undefined' && window.location.hash !== '#/') {
            window.location.hash = '#/';
          }
        }
        break;
      }
      case 'TOGGLE_SOLO_MODE':
        setIsSoloMode((prev) => !prev);
        break;
      case 'TRIGGER_GRAN_FINALE':
        setIsGranFinale(true);
        break;
      case 'JOIN_ROOM':
      case 'ADD_PLAYER': {
        const pData = msg.player || msg.payload?.player || msg.payload || msg;
        const pName = pData.name || pData.playerName;
        const pInst = pData.instrument || pData.selectedInstrument || 'Trompeta';
        const pId = pData.id || pData.deviceId || `dev_${(pName || '').toLowerCase().replace(/\s+/g, '')}`;

        if (pName && roomRole === 'host') {
          const avatarMap: Record<string, string> = {
            Trompeta: '🎺',
            Batería: '🥁',
            Timbal: '🥁',
            Guitarra: '🎸',
            Piano: '🎹',
            Acordeón: '🪗',
          };
          const avatar = pData.avatar || avatarMap[pInst] || '🎵';

          // Confirm connection to client
          broadcastMsg('JOIN_ACK', { hostId: `pachanga_room_${roomCode}`, playerId: pId });

          setPlayers((prev) => {
            const existingIdx = prev.findIndex(
              (p) => p.id === pId || (p.deviceId && p.deviceId === pId) || p.name.toLowerCase() === pName.toLowerCase()
            );

            if (existingIdx >= 0) {
              const prevPlayer = prev[existingIdx];
              const newScore = pData.resetScore === true ? 0 : Math.max(prevPlayer.score, pData.score || 0);

              if (
                prevPlayer.id === pId &&
                prevPlayer.name === pName &&
                prevPlayer.instrument === pInst &&
                prevPlayer.score === newScore &&
                prevPlayer.avatar === avatar
              ) {
                return prev;
              }

              const updated = [...prev];
              updated[existingIdx] = {
                ...prevPlayer,
                id: pId,
                deviceId: pId,
                name: pName,
                instrument: pInst,
                avatar,
                score: newScore,
              };
              return updated;
            }

            const newPlayer: Player = {
              id: pId,
              deviceId: pId,
              name: pName,
              instrument: pInst,
              score: pData.score || 0,
              streak: 0,
              avatar,
              title: '🎶 Nuevo Pachanguero',
            };
            return [...prev, newPlayer];
          });

          addTvToast(`🎷 ¡${pName} se ha unido con ${pInst}!`, avatar);
        }
        break;
      }
      case 'REMOVE_PLAYER':
        if (msg.payload) {
          setPlayers((prev) => prev.filter((p) => p.id !== msg.payload));
        }
        break;
      case 'SET_QUEUE':
        if (msg.payload) {
          setQueue(msg.payload);
        }
        break;
      case 'REACTION':
        if (msg.payload) {
          const newReaction: FloatingReaction = {
            id: Math.random().toString(),
            emoji: msg.payload.emoji,
            senderName: msg.payload.senderName,
            x: Math.random() * 80 + 10,
          };
          setLiveReactions((prev) => [...prev.slice(-12), newReaction]);
        }
        break;
      case 'VIDEO_TIME_SYNC':
        if (msg.payload && typeof msg.payload.currentTime === 'number') {
          lastVideoTimeReceivedRef.current = Date.now();
          setVideoCurrentTime(msg.payload.currentTime);
        }
        break;
    }

    // Host relays client message to other peers (excluding authority messages)
    if (roomRole === 'host' && msg.type !== 'SYNC_PLAYERS' && msg.type !== 'FULL_SYNC') {
      peerConnsRef.current.forEach((conn) => {
        if (conn && conn.open) {
          try {
            conn.send(msg);
          } catch (e) {}
        }
      });
    }
  };

  const handleMessageRef = useRef(handleMessage);
  useEffect(() => {
    handleMessageRef.current = handleMessage;
  });

  // Sync effect across windows/tabs via BroadcastChannel
  useEffect(() => {
    const channelName = `pachanga_room_${roomCode}`;
    const bc = new BroadcastChannel(channelName);
    channelRef.current = bc;

    bc.onmessage = (e) => handleMessageRef.current(e.data);

    const handleStorage = (e: StorageEvent) => {
      if (e.key === `pachanga_sync_${roomCode}` && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          handleMessageRef.current(parsed);
        } catch (err) {}
      }
    };

    window.addEventListener('storage', handleStorage);

    return () => {
      bc.close();
      window.removeEventListener('storage', handleStorage);
    };
  }, [roomCode]);

  // Fallback local clock when roomRole === 'musician' and PeerJS sync is silent
  useEffect(() => {
    if (roomRole !== 'musician') return;

    const interval = setInterval(() => {
      const timeSinceLastSync = Date.now() - lastVideoTimeReceivedRef.current;
      if (timeSinceLastSync > 1500) {
        // PeerJS interrupted or not connected yet! Use fallback clock
        if (isPlaying) {
          setVideoCurrentTime((prev) => prev + 0.05);
        }
      }
    }, 50);

    return () => clearInterval(interval);
  }, [roomRole, isPlaying]);

  // Helper to initialize or retrieve Firebase Realtime Database
  const getFirebaseDB = () => {
    try {
      if (typeof window !== 'undefined' && (window as any).firebase) {
        const fb = (window as any).firebase;
        if (!fb.apps || fb.apps.length === 0) {
          fb.initializeApp({
            databaseURL: 'https://pachanga-192916-default-rtdb.firebaseio.com',
            projectId: 'pachanga-192916',
          });
        }
        return fb.database();
      }
    } catch (err) {
      console.warn('Firebase RTDB init warning:', err);
    }
    return null;
  };

  // Host TV Mode: Continuously write playback state to rooms/192916/playback
  useEffect(() => {
    if (roomRole !== 'host') return;

    const db = getFirebaseDB();
    if (!db) return;

    const currentVideoId = nowPlaying?.videoId || 'bUUgV6rhAbI';
    const playbackRef = db.ref(`rooms/${roomCode}/playback`);

    const updatePlayback = () => {
      try {
        playbackRef.set({
          isPlaying: isPlayingRef.current,
          currentTime: videoCurrentTimeRef.current,
          songId: nowPlayingRef.current?.videoId || currentVideoId,
        });
      } catch (e) {}
    };

    updatePlayback();

    const interval = setInterval(() => {
      updatePlayback();
    }, isPlaying ? 100 : 500);

    return () => clearInterval(interval);
  }, [roomRole, roomCode, isPlaying]);

  // Real-time listener for connected players: rooms/192916/players
  useEffect(() => {
    const db = getFirebaseDB();
    if (!db) return;

    const playersRefDb = db.ref(`rooms/${roomCode}/players`);
    const handleValueChange = (snapshot: any) => {
      const val = snapshot.val();
      if (val) {
        const list: Player[] = Object.entries(val).map(([key, p]: [string, any]) => ({
          id: p.id || key,
          deviceId: p.deviceId || p.id || key,
          name: p.name || 'Músico',
          instrument: p.instrument || 'Trompeta',
          score: typeof p.score === 'number' ? p.score : 0,
          streak: typeof p.streak === 'number' ? p.streak : 0,
          avatar: p.avatar || '🎵',
          title: p.title || '🎶 Nuevo Pachanguero',
        }));

        list.forEach((newP) => {
          setPlayers((currentPlayers) => {
            const exists = currentPlayers.some(
              (p) => p.id === newP.id || (p.name === newP.name && p.instrument === newP.instrument)
            );
            if (!exists) {
              addTvToast(`🎷 ¡${newP.name} se ha unido con ${newP.instrument}!`, newP.avatar || '🎷');
            }
            return currentPlayers;
          });
        });

        setPlayers(list);
        setConnectedPeersCount(list.length);
        setPeerConnectionStatus('connected');
      }
    };

    playersRefDb.on('value', handleValueChange);
    return () => {
      playersRefDb.off('value', handleValueChange);
    };
  }, [roomCode]);

  // Musician Mobile Mode: Listen to rooms/192916/playback
  useEffect(() => {
    const db = getFirebaseDB();
    if (!db) return;

    const playbackRefDb = db.ref(`rooms/${roomCode}/playback`);
    const handlePlaybackSync = (snapshot: any) => {
      const val = snapshot.val();
      if (val) {
        if (typeof val.isPlaying === 'boolean') {
          setIsPlaying(val.isPlaying);
        }
        if (typeof val.currentTime === 'number') {
          setVideoCurrentTime(val.currentTime);
          lastVideoTimeReceivedRef.current = Date.now();
        }
        if (val.songId && (!nowPlayingRef.current || val.songId !== nowPlayingRef.current.videoId)) {
          const found = MOCK_DATABASE.find((s) => s.videoId === val.songId) || VIP_CATALOG.find((s) => s.videoId === val.songId);
          if (found) {
            setNowPlaying(found);
          }
        }
      }
    };

    playbackRefDb.on('value', handlePlaybackSync);
    return () => {
      playbackRefDb.off('value', handlePlaybackSync);
    };
  }, [roomCode]);

  // Listen to rooms/192916/command for global commands (RESET, KICK, etc.)
  useEffect(() => {
    const db = getFirebaseDB();
    if (!db) return;

    const commandRefDb = db.ref(`rooms/${roomCode}/command`);
    const handleCommand = (snapshot: any) => {
      const val = snapshot.val();
      if (val && val.type) {
        handleMessageRef.current(val);
      }
    };

    commandRefDb.on('value', handleCommand);
    return () => {
      commandRefDb.off('value', handleCommand);
    };
  }, [roomCode]);

  // PeerJS WebRTC Multi-Device Sync Effect
  useEffect(() => {
    const PeerCtor = Peer || (window as any).Peer;
    if (!PeerCtor) return;

    if (peerRef.current) {
      try {
        peerRef.current.destroy();
      } catch (e) {}
      peerRef.current = null;
    }
    peerConnsRef.current = [];
    clientConnRef.current = null;
    setConnectedPeersCount(0);

    const hostPeerId = `pachanga_room_${roomCode}`;

    const peerConfig = {
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
        ],
      },
      debug: 0,
    };

    if (roomRole === 'host') {
      try {
        const peer = new PeerCtor(hostPeerId, peerConfig);
        peerRef.current = peer;

        peer.on('open', (id: string) => {
          setMyPeerId(id || hostPeerId);
          setPeerConnectionStatus('connected');
          logPacketSent('HOST_PEER_OPEN', { id: hostPeerId });
        });

        peer.on('connection', (conn: DataConnection) => {
          peerConnsRef.current.push(conn);
          setConnectedPeersCount(peerConnsRef.current.length);
          setPeerConnectionStatus('connected');
          logPacketReceived('CLIENT_CONNECTED', { peerId: conn.peer });

          // Send immediate HOST_ACK to client
          try {
            conn.send({
              type: 'HOST_ACK',
              payload: { hostId: instanceId.current, roomCode },
              senderId: instanceId.current,
            });
            logPacketSent('HOST_ACK', { peerId: conn.peer });
          } catch (e) {}

          conn.on('data', (data: any) => {
            logPacketReceived(data?.type || 'PEER_DATA', data);
            handleMessageRef.current(data);

            // Respond with HOST_ACK on receiving packets
            try {
              conn.send({
                type: 'HOST_ACK',
                payload: { hostId: instanceId.current, roomCode },
                senderId: instanceId.current,
              });
            } catch (e) {}
          });

          const removeConn = () => {
            peerConnsRef.current = peerConnsRef.current.filter((c) => c !== conn);
            setConnectedPeersCount(peerConnsRef.current.length);
            logPacketReceived('CLIENT_DISCONNECTED', { peerId: conn.peer });
          };
          conn.on('close', removeConn);
          conn.on('error', removeConn);

          // Initial state sync push
          const sendInitialState = () => {
            try {
              if (conn.open) {
                conn.send({
                  type: 'FULL_SYNC',
                  payload: {
                    queue: queueRef.current,
                    nowPlaying: nowPlayingRef.current,
                    score: scoreRef.current,
                    players: playersRef.current,
                    videoCurrentTime: videoCurrentTimeRef.current,
                    isPlaying: isPlayingRef.current,
                  },
                  senderId: instanceId.current,
                });
                logPacketSent('FULL_SYNC', { playersCount: playersRef.current.length });
              }
            } catch (e) {}
          };

          if (conn.open) {
            sendInitialState();
          } else {
            conn.on('open', sendInitialState);
          }
        });

        peer.on('error', (err: any) => {
          if (err && (err.type === 'unavailable-id' || err.type === 'peer-unavailable')) {
            console.log('Host TV ID currently taken or pending release...');
            setMyPeerId(hostPeerId);
            setPeerConnectionStatus('connected');
          } else {
            console.warn('PeerJS Host Error:', err);
          }
        });
      } catch (err) {
        console.error('PeerJS Host Init Error:', err);
      }
    } else {
      // MODO INSTRUMENTO (Celular)
      try {
        const peer = new PeerCtor(peerConfig);
        peerRef.current = peer;

        peer.on('open', (id: string) => {
          setMyPeerId(id);
          logPacketSent('CLIENT_PEER_OPEN', { id });
          connectToHost();
        });

        const connectToHost = () => {
          if (!peerRef.current || peerRef.current.destroyed) return;
          if (clientConnRef.current && clientConnRef.current.open) return;

          setPeerConnectionStatus('connecting');
          try {
            const conn = peerRef.current.connect(hostPeerId, { reliable: true });
            clientConnRef.current = conn;

            conn.on('open', () => {
              setPeerConnectionStatus('connected');
              setConnectedPeersCount(1);
              logPacketSent('WEBRTC_CONNECTED_HOST', { hostPeerId });

              const joinPayload = {
                id: myPlayerRef.current?.id || getDeviceId(),
                name: myPlayerRef.current?.name || 'Músico',
                instrument: myPlayerRef.current?.instrument || 'Trompeta',
                score: myPlayerRef.current?.score || 0,
                avatar: myPlayerRef.current?.avatar || '🎵',
              };

              try {
                conn.send({
                  type: 'JOIN_ROOM',
                  player: joinPayload,
                  payload: { player: joinPayload },
                  senderId: instanceId.current,
                });
                logPacketSent('JOIN_ROOM', joinPayload);
              } catch (e) {}
            });

            conn.on('data', (data: any) => {
              logPacketReceived(data?.type || 'HOST_DATA', data);
              if (data?.type === 'HOST_ACK') {
                setPeerConnectionStatus('connected');
              }
              handleMessageRef.current(data);
            });

            conn.on('close', () => {
              clientConnRef.current = null;
              setConnectedPeersCount(0);
              setPeerConnectionStatus('connecting');
            });

            conn.on('error', () => {
              clientConnRef.current = null;
              setConnectedPeersCount(0);
              setPeerConnectionStatus('connecting');
            });
          } catch (e) {}
        };

        connectToHostRef.current = connectToHost;

        // Fallback polling loop every 2 seconds
        const pollInterval = setInterval(() => {
          if (roomRole === 'musician' && (!clientConnRef.current || !clientConnRef.current.open)) {
            connectToHost();
          }
        }, 2000);

        peer.on('error', (err: any) => {
          clientConnRef.current = null;
          setConnectedPeersCount(0);
          setPeerConnectionStatus('connecting');
        });

        return () => {
          clearInterval(pollInterval);
        };
      } catch (err) {
        console.error('PeerJS Client Init Error:', err);
      }
    }

    return () => {
      if (peerRef.current) {
        try {
          peerRef.current.destroy();
        } catch (e) {}
        peerRef.current = null;
      }
    };
  }, [roomCode, roomRole]);

  const addSong = (song: Song) => {
    setQueue((prev) => [...prev, song]);
    broadcastMsg('ADD_SONG', song);
  };

  const removeSong = (index: number) => {
    setQueue((prev) => {
      const updated = prev.filter((_, idx) => idx !== index);
      broadcastMsg('SET_QUEUE', updated);
      return updated;
    });
  };

  const moveSongUp = (index: number) => {
    if (index <= 0) return;
    setQueue((prev) => {
      const updated = [...prev];
      const temp = updated[index];
      updated[index] = updated[index - 1];
      updated[index - 1] = temp;
      broadcastMsg('SET_QUEUE', updated);
      return updated;
    });
  };

  const nextSong = () => {
    if (queue.length > 0) {
      setNowPlaying(queue[0]);
      setQueue((prev) => prev.slice(1));
    } else {
      setNowPlaying(null);
    }
    broadcastMsg('NEXT_SONG');
  };

  const scoreThrottleTimerRef = useRef<any>(null);
  const pendingScoreRef = useRef<number>(0);

  const updateScore = (points: number) => {
    const multiplier = isSoloMode ? (difficulty === 'expert' ? 3 : 2) : 1;
    const addedPoints = points * multiplier;
    if (addedPoints <= 0) return;

    setScore((prev) => prev + addedPoints);

    const devId = getDeviceId();
    setPlayers((prev) => {
      let found = false;
      const updated = prev.map((p) => {
        if (p.id === devId || p.deviceId === devId) {
          found = true;
          return { ...p, score: p.score + addedPoints, streak: p.streak + 1 };
        }
        return p;
      });

      if (!found && myPlayerRef.current) {
        return [...prev, { ...myPlayerRef.current, score: myPlayerRef.current.score + addedPoints, streak: myPlayerRef.current.streak + 1 }];
      }
      return updated;
    });

    if (myPlayerRef.current) {
      myPlayerRef.current.score += addedPoints;
      myPlayerRef.current.streak += 1;
    }

    if (roomRole === 'musician') {
      pendingScoreRef.current += addedPoints;
      if (!scoreThrottleTimerRef.current) {
        scoreThrottleTimerRef.current = setTimeout(() => {
          scoreThrottleTimerRef.current = null;
          const currentTotal = myPlayerRef.current?.score || 0;
          broadcastMsg('SCORE_UPDATE', {
            id: devId,
            score: currentTotal,
            addedPoints: pendingScoreRef.current,
          });
          pendingScoreRef.current = 0;
        }, 200);
      }
    } else {
      broadcastMsg('UPDATE_SCORE', addedPoints);
    }
  };

  const resetScores = () => {
    setScore(0);
    setIsGranFinale(false);
    setIsSoloMode(false);
    setPlayers((prev) => prev.map((p) => ({ ...p, score: 0, streak: 0 })));
    broadcastMsg('RESET_SCORES');
  };

  const forceRoomReset = () => {
    setPlayers([]);
    setScore(0);
    setIsGranFinale(false);
    setIsSoloMode(false);
    setConnectedPeersCount(0);

    const db = getFirebaseDB();
    if (db) {
      try {
        db.ref(`rooms/${roomCode}/players`).remove();
        db.ref(`rooms/${roomCode}/command`).set({
          type: 'FORCE_ROOM_RESET',
          timestamp: Date.now(),
        });
      } catch (e) {}
    }

    broadcastMsg('FORCE_ROOM_RESET', {});
  };

  const triggerGranFinale = () => {
    setIsGranFinale(true);
    broadcastMsg('TRIGGER_GRAN_FINALE');
  };

  const toggleSoloMode = () => {
    setIsSoloMode((prev) => !prev);
    broadcastMsg('TOGGLE_SOLO_MODE');
  };

  const addPlayer = (name: string, instrument: string, resetScore: boolean = false) => {
    const devId = getDeviceId();
    const avatars: Record<string, string> = {
      Batería: '🥁',
      Timbal: '🥁',
      Guitarra: '🎸',
      Piano: '🎹',
      Trompeta: '🎺',
      Acordeón: '🪗',
    };
    const titleMap: Record<string, string> = {
      Batería: '⚡ Chispa Rítmica',
      Timbal: '🥁 Maestro del Timbal',
      Guitarra: '🔥 Guitarrero Legendario',
      Piano: '🎹 Virtuoso del Teclado',
      Trompeta: '🎺 Rey del Solo',
      Acordeón: '🍻 Animador Oficial',
    };
    const avatar = avatars[instrument] || '🎵';

    setPlayers((prev) => {
      const existingIdx = prev.findIndex(
        (p) => (p.deviceId && p.deviceId === devId) || p.id === devId || p.name.toLowerCase() === name.toLowerCase()
      );

      let updatedPlayer: Player;
      if (existingIdx >= 0) {
        const existing = prev[existingIdx];
        updatedPlayer = {
          ...existing,
          id: devId,
          deviceId: devId,
          name,
          instrument,
          avatar,
          score: resetScore ? 0 : existing.score,
        };
        const list = [...prev];
        list[existingIdx] = updatedPlayer;
        setMyPlayer(updatedPlayer);
        try {
          localStorage.setItem('pachanga_my_player', JSON.stringify(updatedPlayer));
        } catch (e) {}
        return list;
      } else {
        updatedPlayer = {
          id: devId,
          deviceId: devId,
          name,
          instrument,
          score: 0,
          streak: 0,
          avatar,
          title: '🎶 Nuevo Pachanguero',
        };
        setMyPlayer(updatedPlayer);
        try {
          localStorage.setItem('pachanga_my_player', JSON.stringify(updatedPlayer));
        } catch (e) {}
        return [...prev, updatedPlayer];
      }
    });

    // Publish to Firebase database: rooms/192916/players/{playerId}
    const db = getFirebaseDB();
    if (db) {
      try {
        db.ref(`rooms/${roomCode}/players/${devId}`).set({
          id: devId,
          deviceId: devId,
          name,
          instrument,
          score: resetScore ? 0 : myPlayerRef.current?.score || 0,
          streak: 0,
          avatar,
          title: titleMap[instrument] || '🎷 Músico Tropa',
        });
      } catch (err) {
        console.warn('Firebase addPlayer error:', err);
      }
    }

    addTvToast(`🎷 ¡${name} se ha unido con ${instrument}!`, avatar);
    broadcastMsg('JOIN_ROOM', {
      player: {
        id: devId,
        deviceId: devId,
        name,
        instrument,
        score: resetScore ? 0 : myPlayerRef.current?.score || 0,
        avatar,
        resetScore,
      },
      id: devId,
      deviceId: devId,
      name,
      instrument,
      score: resetScore ? 0 : myPlayerRef.current?.score || 0,
      avatar,
      resetScore,
    });
  };

  const removePlayer = (id: string) => {
    // Delete from Firebase database and send active kick command
    const db = getFirebaseDB();
    if (db) {
      try {
        db.ref(`rooms/${roomCode}/players/${id}`).remove();
        db.ref(`rooms/${roomCode}/command`).set({
          type: 'KICK_PLAYER',
          targetId: id,
          timestamp: Date.now(),
        });
      } catch (e) {}
    }
    setPlayers((prev) => prev.filter((p) => p.id !== id));
    broadcastMsg('KICK_PLAYER', { targetId: id });
    broadcastMsg('REMOVE_PLAYER', id);
  };

  const triggerReaction = (emoji: string, senderName: string) => {
    const newReaction: FloatingReaction = {
      id: Math.random().toString(),
      emoji,
      senderName,
      x: Math.random() * 80 + 10,
    };
    setLiveReactions((prev) => [...prev.slice(-12), newReaction]);
    broadcastMsg('REACTION', { emoji, senderName });
  };

  const setPlaying = (playing: boolean) => {
    setIsPlaying(playing);
    broadcastMsg('PLAYBACK_STATE', playing ? 'PLAYING' : 'PAUSED');
  };

  return (
    <PachangaContext.Provider
      value={{
        roomCode,
        setRoomCode,
        roomRole,
        setRoomRole,
        players,
        addPlayer,
        removePlayer,
        difficulty,
        setDifficulty,
        isSoloMode,
        toggleSoloMode,
        isGranFinale,
        triggerGranFinale,
        resetScores,
        forceRoomReset,
        queue,
        nowPlaying,
        score,
        isPlaying,
        videoCurrentTime,
        emitVideoTime,
        addSong,
        removeSong,
        moveSongUp,
        nextSong,
        updateScore,
        setPlaying,
        liveReactions,
        triggerReaction,
        connectedPeersCount,
        peerConnectionStatus,
        myPlayer,
        tvToasts,
        addTvToast,
        pendingRelayRequest,
        setPendingRelayRequest,
        instanceId: instanceId.current,
        activeHostId,
        lastHostHeartbeat,
        requestTvRelay,
        forceTakeoverHost,
        getDeviceId,
        isDebugConsoleOpen,
        setIsDebugConsoleOpen,
        toggleDebugConsole,
        myPeerId,
        connectionStatusLabel,
        lastSentPacket,
        lastReceivedPacket,
        logs,
      }}
    >
      {children}
    </PachangaContext.Provider>
  );
}

export function usePachanga() {
  const context = useContext(PachangaContext);
  if (context === undefined) {
    throw new Error('usePachanga must be used within a PachangaProvider');
  }
  return context;
}
