import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'motion/react';
import { 
  collection, 
  doc, 
  onSnapshot, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  getDoc,
  query,
  where,
  getDocs,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
  writeBatch
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { 
  Card as CardType, 
  Player, 
  GameState, 
  Rank, 
  Suit, 
  GameStatus 
} from '../types';
import { Card } from './Card';
import { cn } from '../lib/utils';
import { 
  Trophy, 
  Play, 
  Info, 
  Settings as SettingsIcon, 
  User, 
  Cpu, 
  AlertCircle, 
  Clock, 
  Volume2, 
  VolumeX, 
  WifiOff,
  Moon, 
  Sun,
  ChevronLeft,
  Shield,
  Zap,
  Star,
  Spade,
  Users,
  Gamepad2,
  GraduationCap,
  BookOpen,
  X,
  ArrowLeft,
  Trash2,
  Globe,
  Lock,
  ArrowDown,
  Share,
  SquarePlus
} from 'lucide-react';

import { App } from '@capacitor/app';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

// --- Constants & Configuration ---
const RANKS: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];

const ASSETS = {
  SOUNDS: {
    // Using a reliable CDN for click as primary to ensure it works
    CLICK: 'https://cdn.pixabay.com/audio/2022/11/25/audio_91709674dc.mp3', 
    SWEEP: 'https://cdn.pixabay.com/audio/2021/08/09/audio_8e7a0a6a0e.mp3',
    DRAW: 'https://cdn.pixabay.com/audio/2022/03/10/audio_c352787fc3.mp3',
    WIN: 'https://cdn.pixabay.com/audio/2021/08/04/audio_12e9b0b468.mp3',
    PENALTY: 'https://cdn.pixabay.com/audio/2021/08/04/audio_3d3077732a.mp3',
    DISCARD: 'https://cdn.pixabay.com/audio/2022/01/21/audio_24e9309f98.mp3',
    POWERUP: 'https://cdn.pixabay.com/audio/2021/08/09/audio_1e00e47017.mp3'
  }
};

const getRankValue = (rank: Rank, jokerRank?: Rank | null): number => {
  // Jokers and Wild Cards are 0 points
  if (rank === 'JK' || rank === jokerRank) return 0;
  
  // Ace is 1 point
  if (rank === 'A') return 1;
  
  // J, Q, K are 10 points
  if (['J', 'Q', 'K'].includes(rank)) return 10;
  
  // Numerical face values
  const val = parseInt(rank);
  return isNaN(val) ? 10 : val;
};

interface GameEffect {
  id: string;
  type: 'pair' | 'triplet' | 'set' | 'penalty' | 'win' | 'deck' | 'success' | 'wrong' | 'info';
  text: string;
}

const useSoundEngine = (isMuted: boolean) => {
  const audioRefs = useRef<Record<string, HTMLAudioElement>>({});

  useEffect(() => {
    Object.entries(ASSETS.SOUNDS).forEach(([key, url]) => {
      const audio = new Audio(url);
      audio.preload = "auto";
      audio.crossOrigin = "anonymous";
      audio.load();
      audioRefs.current[key] = audio;
      
      audio.onerror = (e) => {
        console.error(`Error loading sound ${key} from ${url}:`, e);
      };
    });
    
    return () => {
      Object.values(audioRefs.current).forEach((audio: any) => {
        if (audio && typeof audio.pause === 'function') {
          audio.pause();
          audio.src = "";
        }
      });
    };
  }, []);

  const play = useCallback((key: string, volScale: number = 0.5, duration?: number) => {
    if (isMuted) {
      Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
      return;
    }
    try {
      let audio = audioRefs.current[key];
      
      // Fallback if local file is missing
      if (!audio && key === 'CLICK') {
        audio = new Audio('https://cdn.pixabay.com/audio/2022/11/25/audio_91709674dc.mp3');
      }

      if (audio) {
        audio.pause();
        audio.currentTime = 0;
        // Apply global volume scale and specific call scale
        audio.volume = Math.min(1, volScale);
        const playPromise = audio.play();
        
        if (playPromise !== undefined) {
          playPromise.catch((error) => {
            console.warn(`Playback failed for ${key}:`, error);
          });
        }
        
        Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});

        // User requested 0.8s for button clicks
        const finalDuration = key === 'CLICK' ? 800 : duration;
        if (finalDuration) {
          setTimeout(() => {
            if (audio && !audio.paused && audio.currentTime > 0) {
              audio.pause();
            }
          }, finalDuration);
        }
      }
    } catch (err) {
      console.error("Audio engine error:", err);
    }
  }, [isMuted]);

  const unlockAudio = useCallback(() => {
    Object.values(audioRefs.current).forEach((audio: HTMLAudioElement) => {
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.then(() => {
          audio.pause();
          audio.currentTime = 0;
        }).catch(() => {});
      }
    });
  }, []);

  return {
    unlockAudio,
    playClick: () => play('CLICK', 0.5),
    playSweep: () => play('SWEEP', 0.5),
    playDraw: () => play('DRAW', 0.5),
    playWin: () => play('WIN', 0.6),
    playPenalty: () => play('PENALTY', 0.6),
    playDiscard: () => play('DISCARD', 0.5, 500),
    playStart: () => play('SWEEP', 0.4),
    playTurnAlert: () => play('DRAW', 0.3),
    playPowerUp: () => play('POWERUP', 0.7),
  };
};

const calculateHandValue = (hand: CardType[], jokerRank: Rank | null): number => {
  return hand.reduce((sum, card) => sum + getRankValue(card.rank, jokerRank), 0);
};

const Header = ({ players, onSettings, isMultiplayer, socketConnected, onBack, currentRound, currentGame, maxGames }: { players: Player[], onSettings: () => void, isMultiplayer: boolean, socketConnected: boolean, onBack: () => void, currentRound: number, currentGame: number, maxGames: number }) => (
  <header className="w-full flex justify-between items-center mb-2 sm:mb-4 relative z-50 px-2 sm:px-4">
    <div className="flex items-center gap-3 sm:gap-5">
      <button 
        onClick={onBack}
        className="w-10 h-10 rounded-full bg-brand-maroon premium-border flex items-center justify-center text-brand-gold shadow-xl hover:scale-105 active:scale-95 transition-all no-theme"
      >
        <ArrowLeft className="w-5 h-5" />
      </button>
      <div className="flex items-center gap-3 sm:gap-5">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black text-brand-gold uppercase tracking-widest leading-none embossed">Game {currentGame}/{maxGames}</span>
            <span className="text-[10px] font-black text-white/40 uppercase tracking-widest leading-none">•</span>
            <span className="text-[10px] font-black text-white/60 uppercase tracking-widest leading-none embossed">Round {currentRound}</span>
          </div>
          <div className="flex items-center gap-1.5 mt-1 sm:mt-1.5">
            <div className="flex items-center gap-2 opacity-80">
              <div className={cn(
                "w-1.5 h-1.5 rounded-full",
                socketConnected ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" : "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]"
              )} />
              <span className="text-[8px] font-bold text-white/40 uppercase tracking-widest leading-none embossed">
                {isMultiplayer ? (socketConnected ? 'Network Live' : 'Reconnecting') : 'Offline Local'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div className="flex items-center gap-4 sm:gap-6">
      <div className="flex gap-1.5 sm:gap-2 bg-brand-maroon/80 premium-border p-1 sm:p-1.5 rounded-full shadow-2xl overflow-x-auto max-w-[150px] sm:max-w-none no-scrollbar">
        {players.map((p, idx) => (
          <div key={`head-player-${p.id || 'cpu'}-${idx}`} className="flex flex-col items-center px-3 sm:px-6 py-0.5 sm:py-1 border-r border-white/5 last:border-0 min-w-[60px] sm:min-w-[80px]">
            <span className="text-[7px] sm:text-[9px] font-black text-white/30 uppercase tracking-[0.1em] sm:tracking-[0.15em] truncate max-w-[50px] sm:max-w-[70px] embossed">{p.name}</span>
            <span className={cn("text-sm sm:text-xl font-black embossed", idx === 0 ? "text-gold" : "text-cream")}>{p.score}</span>
          </div>
        ))}
      </div>
    </div>
  </header>
);

export const GameBoard: React.FC<{ 
  playerCount?: number, 
  maxRounds?: number, 
  playerName?: string, 
  onBack: () => void, 
  isTutorialMode?: boolean,
  roomId?: string,
  initialIsMultiplayer?: boolean
}> = ({ 
  playerCount = 2, 
  maxRounds = 5, 
  playerName: initialPlayerName, 
  onBack, 
  isTutorialMode = false,
  roomId: initialRoomId = '',
  initialIsMultiplayer = false
}) => {
  const cpuActionTimer = useRef<NodeJS.Timeout | null>(null);
  const isActionInProgress = useRef(false);

  const [isInitializing, setIsInitializing] = useState(true);
  const [authReady, setAuthReady] = useState(false);
  const [roomId, setRoomId] = useState(initialRoomId);
  const [playerName, setPlayerName] = useState(() => {
    if (initialPlayerName) return initialPlayerName;
    if (typeof window === 'undefined') return 'Ace';
    const saved = localStorage.getItem('fives_player_name');
    if (saved) return saved;
    return 'Player_' + Math.floor(1000 + Math.random() * 8999);
  });
  
  // Use Firebase Auth UID or persisted UID as playerId
  const [playerId, setPlayerId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('fives_player_uid');
      if (stored) return stored;
    }
    return '';
  });

  const [hasVisited, setHasVisited] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('fives_has_visited') === 'true';
  });

  const [isMuted, setIsMuted] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('fives_is_muted') === 'true';
  });

  useEffect(() => {
    localStorage.setItem('fives_player_name', playerName);
  }, [playerName]);

  useEffect(() => {
    localStorage.setItem('fives_is_muted', isMuted ? 'true' : 'false');
  }, [isMuted]);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((user) => {
      if (user) {
        setPlayerId(user.uid);
        localStorage.setItem('fives_player_uid', user.uid);
        setAuthReady(true);
      } else {
        // We rely on initFirebase in firebase.ts to sign in anonymously
        setAuthReady(false);
      }
      setIsInitializing(false);
    });
    return () => unsub();
  }, []);

  const [isMultiplayer, setIsMultiplayer] = useState(initialIsMultiplayer);
  const [effects, setEffects] = useState<GameEffect[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [availableRooms, setAvailableRooms] = useState<{roomId: string, roomName: string, playerCount: number, maxPlayers: number}[]>([]);
  const [currentStep, setCurrentStep] = useState(0);

  const [showTutorial, setShowTutorial] = useState(false);
  const [setupMode, setSetupMode] = useState<'main' | 'solo' | 'multiplayer' | 'multiplayer_settings'>('main');
  const [roomName, setRoomName] = useState('GAME ROOM');
  const [playersInRoom, setPlayersInRoom] = useState<{id: string, name: string, isHost?: boolean, isConfirmed?: boolean, score: number}[]>([]);
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [hasEnteredName, setHasEnteredName] = useState(false);
  const [socketConnected, setSocketConnected] = useState(true); 
  const [isSearching, setIsSearching] = useState(false);
  const [isOnline, setIsOnline] = useState(true); 
  const [isTutorial, setIsTutorial] = useState(isTutorialMode);
  const [tutorialStep, setTutorialStep] = useState(isTutorialMode ? 1 : 0);
  const [tutorialCompletedRounds, setTutorialCompletedRounds] = useState(0);
  const [showProTips, setShowProTips] = useState(false);
  const [showTutorialSelect, setShowTutorialSelect] = useState(false);
  const [isTutorialFromSelect, setIsTutorialFromSelect] = useState(false);
  const [showWildCardWarning, setShowWildCardWarning] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [isRoomFull, setIsRoomFull] = useState(false);
  const sessionIdx = useRef(0);

  const PRO_TIPS = [
    {
      title: "THE MATCHING STRATEGY",
      text: "Pick from the open card pile if it matches any card that you already have, this allows you to discard them as a pair / triplet / set in the next round."
    },
    {
      title: "THE FIFTH ROUND RULE",
      text: "Keep your hand value as low as possible after the fifth round. Any player can call 'DECK' at this point!"
    },
    {
      title: "LONG SERIES SAFETY",
      text: "In a long series, its better to play safe with lower number than to risk a 'wrong deck' penalty. Cumulative low scores wins, consistency is your friend."
    }
  ];
  // Monitoring browser online status
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const updateOnlineStatus = () => {
      console.log("Network status changed:", navigator.onLine);
      setIsOnline(navigator.onLine);
    };

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    updateOnlineStatus(); // Initial sync

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, []);

  // Share URL Logic
  const getShareUrl = (rid: string) => {
    // Prefer window.location.origin for sharing in this environment
    const base = window.location.origin;
    const url = new URL(base);
    url.searchParams.set('room', rid);
    return url.toString();
  };

  useEffect(() => {
    localStorage.setItem('fives_player_name', playerName);
  }, [playerName]);

  useEffect(() => {
    const handleUrl = (urlStr: string) => {
      try {
        const url = new URL(urlStr);
        const roomFromUrl = url.searchParams.get('room');
        if (roomFromUrl && roomFromUrl.length === 4) {
          setRoomId(roomFromUrl.toUpperCase());
          setSetupMode('multiplayer');
          setIsMultiplayer(true);
          setHasEnteredName(false); // Guest must enter name before joining
          addEffect('info', `INVITE DETECTED: ROOM ${roomFromUrl.toUpperCase()}`);
        }
      } catch (e) {
        console.error("URL Parse error", e);
      }
    };

    // Web check
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      if (searchParams.has('room')) {
        handleUrl(window.location.href);
      }
    }

    // Capacitor check
    const listener = App.addListener('appUrlOpen', (data: any) => {
      handleUrl(data.url);
    });

    return () => {
      listener.then(l => l.remove());
    };
  }, []);

  useEffect(() => {
    // Initial connection grace period (3 seconds)
    const timer = setTimeout(() => setIsInitializing(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    // For single player, initialize the game immediately
    if (!isMultiplayer && playerCount && maxRounds) {
      initGame(playerCount, maxRounds, undefined, 0, 0, isTutorial);
    }
  }, [isMultiplayer, playerCount, maxRounds, isTutorial]);

  const [gameState, setGameState] = useState<GameState>({
    players: [
      { id: 'player', name: playerName, hand: [], score: 0, isCPU: false },
      { id: 'cpu1', name: 'CPU 1', hand: [], score: 0, isCPU: true },
    ],
    currentPlayerIndex: 0,
    deck: [],
    discardPile: [],
    openCard: null,
    jokerCard: null,
    jokerRank: null,
    roundCount: 1,
    gameCount: 1,
    maxRounds: 5,
    maxGames: 1,
    numPlayers: 2,
    status: isMultiplayer ? 'lobby' : 'playing',
    winner: null,
    deckingPlayerId: null,
    message: 'Welcome Survivor',
    turnStartTime: Date.now(),
    startingPlayerIndex: 0
  });

  const me = useMemo(() => {
    // If we're not multiplayer, we're always the first player
    if (!isMultiplayer) return gameState.players[0];
    // In multiplayer, must have a valid playerId
    if (!playerId) return undefined;
    return gameState.players.find(p => p.id === playerId);
  }, [gameState.players, isMultiplayer, playerId]);

  const [selectedCards, setSelectedCards] = useState<string[]>([]);
  const [hasDrawnThisTurn, setHasDrawnThisTurn] = useState(false);

  const [hasDiscardedThisTurn, setHasDiscardedThisTurn] = useState(false);
  const [justDiscardedCard, setJustDiscardedCard] = useState<CardType | null>(null);
  const [showComboEffect, setShowComboEffect] = useState<{type: string, count: number} | null>(null);

  const sounds = useSoundEngine(isMuted);

  // Global Interaction Sound & Audio Unlocking
  useEffect(() => {
    const handleGlobalInteraction = (e: MouseEvent | TouchEvent) => {
      const target = e.target as HTMLElement;
      const isButton = target.closest('button') || target.closest('[role="button"]');
      
      // Unlock audio on every interaction to satisfy browser policies
      sounds.unlockAudio(); 

      if (isButton) {
        sounds.playClick();
      }
    };

    window.addEventListener('mousedown', handleGlobalInteraction);
    window.addEventListener('touchstart', handleGlobalInteraction);
    
    return () => {
      window.removeEventListener('mousedown', handleGlobalInteraction);
      window.removeEventListener('touchstart', handleGlobalInteraction);
    };
  }, [sounds]);

  // Turn Notification Sound
  useEffect(() => {
    if (gameState.status === 'playing') {
      const currentPlayer = gameState.players[gameState.currentPlayerIndex];
      const isMyTurn = isMultiplayer 
        ? (playerId !== '' && playerId === currentPlayer?.id) 
        : (gameState.currentPlayerIndex === 0);
      
      if (isMyTurn) {
        sounds.playTurnAlert();
        if (navigator.vibrate) navigator.vibrate(100);
      }
    }
  }, [gameState.currentPlayerIndex, gameState.status, isMultiplayer, playerId]);

  const effectiveIsHost = useMemo(() => {
    if (!isMultiplayer) return true;
    if (isCreatingRoom) return true;
    if (playersInRoom.length === 1 && roomId) return true;
    const meInRoom = playersInRoom.find(p => p.id === playerId);
    return meInRoom?.isHost || false;
  }, [playersInRoom, playerId, isCreatingRoom, roomId, isMultiplayer]);

  const playerNameRef = useRef(playerName);
  const playerIdRef = useRef(playerId);
  const roomIdRef = useRef(roomId);
  const isMultiplayerRef = useRef(isMultiplayer);

  useEffect(() => { playerNameRef.current = playerName; }, [playerName]);
  useEffect(() => { playerIdRef.current = playerId; }, [playerId]);
  useEffect(() => { roomIdRef.current = roomId; }, [roomId]);
  useEffect(() => { isMultiplayerRef.current = isMultiplayer; }, [isMultiplayer]);

  useEffect(() => {
    if (!isMultiplayer || !roomId || !authReady) {
      if (!isMultiplayer) setPlayersInRoom([]);
      return;
    }

    console.log("Initializing Firebase Multiplayer for Room:", roomId);
    
    // 1. Subscribe to Room Metadata
    const roomRef = doc(db, 'rooms', roomId);
    const unsubRoom = onSnapshot(roomRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setRoomName(data.roomName || 'GAME ROOM');
        setGameState(prev => {
          // Room metadata should only update config, not game status
          // EXCEPT for when move to 'lobby' from 'setup' for joiners
          let nextStatus = prev.status;
          if (data.status === 'lobby' && prev.status === 'setup') {
            nextStatus = 'lobby';
          }
          
          return {
            ...prev,
            numPlayers: data.numPlayers ?? prev.numPlayers,
            maxGames: data.maxGames ?? prev.maxGames,
            status: nextStatus as any
          };
        });
      }
      setIsCreatingRoom(false);
    }, (err) => {
      if (err.code === 'permission-denied') return;
      handleFirestoreError(err, OperationType.GET, `rooms/${roomId}`);
    });

    // 2. Subscribe to Players (Lobby Sync only)
    const playersRef = collection(db, 'rooms', roomId, 'players');
    const unsubPlayers = onSnapshot(playersRef, (snapshot) => {
      const players = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      setPlayersInRoom(players);
      
      // Auto-sync game state players ONLY if strictly in lobby/setup
      setGameState(prev => {
        if (prev.status === 'lobby' || prev.status === 'setup') {
          return { ...prev, players: players.map(p => ({
            id: p.id,
            name: p.name,
            score: p.score || 0,
            hand: [],
            isCPU: false,
            isConfirmed: p.isConfirmed,
            isHost: p.isHost
          })) };
        }
        return prev;
      });
    }, (err) => handleFirestoreError(err, OperationType.LIST, `rooms/${roomId}/players`));

    // 3. Subscribe to Game State updates
    const stateRef = doc(db, 'rooms', roomId, 'state', 'current');
    const unsubState = onSnapshot(stateRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setGameState(prev => {
          // Robustly merge players to ensure local metadata is preserved if needed
          // but hands come from the server (source of truth)
          const firestorePlayers = (data.players || []) as Player[];
          if (firestorePlayers.length === 0) return { ...prev, ...data };

          // Handle transition effects
          if (data.status === 'playing' && prev.status === 'lobby') {
            sounds.playStart();
            addEffect('success', 'GAME STARTED!');
          }

          // Ensure we don't accidentally revert to an older status if local was updated
          const nextStatus = (prev.status === 'setup' && data.status === 'lobby') ? 'lobby' : data.status;

          return { 
            ...prev, 
            ...data,
            players: firestorePlayers,
            status: nextStatus || prev.status,
            openCard: data.openCard || prev.openCard,
            jokerCard: data.jokerCard || prev.jokerCard,
            jokerRank: data.jokerRank || prev.jokerRank
          };
        });
      }
    }, (err) => {
      // More resilient error handling for game state (may fail transiently during join)
      if (err.code === 'permission-denied') {
        console.warn("Joining room... waiting for state access.");
        return;
      }
      handleFirestoreError(err, OperationType.GET, `rooms/${roomId}/state/current`);
    });

    // 4. Heartbeat: Update lastSeen
    const heartbeat = setInterval(async () => {
      if (playerIdRef.current && roomIdRef.current) {
        try {
          await updateDoc(doc(db, 'rooms', roomIdRef.current, 'players', playerIdRef.current), {
            lastSeen: serverTimestamp()
          });
        } catch (e) {}
      }
    }, 15000);

    return () => {
      unsubRoom();
      unsubPlayers();
      unsubState();
      clearInterval(heartbeat);
    };
  }, [isMultiplayer, roomId, authReady]);

  // --- Firestore Helpers ---

  const createRoom = async () => {
    const uid = playerIdRef.current;
    if (!uid) {
      addEffect('wrong', 'PLAYER ID ERROR');
      return;
    }
    if (!playerName.trim()) {
      addEffect('wrong', 'PLEASE ENTER NAME');
      return;
    }
    sounds.playClick();
    const rid = Math.floor(1000 + Math.random() * 8999).toString();
    try {
      if (!authReady) {
        addEffect('wrong', 'AUTH INITIALIZING...');
        return;
      }
      setIsCreatingRoom(true);
      
      const batch = writeBatch(db);
      const roomRef = doc(db, 'rooms', rid);
      batch.set(roomRef, {
        roomName: roomName,
        numPlayers: gameState.numPlayers,
        maxGames: gameState.maxGames,
        status: 'lobby',
        createdAt: serverTimestamp(),
        hostId: uid
      });

      const playerRef = doc(db, 'rooms', rid, 'players', uid);
      batch.set(playerRef, {
        name: playerName,
        score: 0,
        isConfirmed: true,
        isHost: true,
        lastSeen: serverTimestamp()
      });

      await batch.commit();

      setRoomId(rid);
      setIsMultiplayer(true);
      setHasEnteredName(true);
      setIsCreatingRoom(false);
      setGameState(p => ({ 
        ...p, 
        status: 'lobby',
        numPlayers: gameState.numPlayers,
        maxGames: gameState.maxGames,
        players: [{
          id: uid,
          name: playerName,
          score: 0,
          hand: [],
          isCPU: false,
          isHost: true,
          isConfirmed: true
        }]
      }));
      addEffect('success', 'ROOM CREATED!');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `rooms/${rid}`);
      setIsCreatingRoom(false);
    }
  };

  const joinRoomAction = async (rid: string) => {
    const uid = playerIdRef.current;
    if (!uid) {
      addEffect('wrong', 'PLAYER ID ERROR');
      return;
    }
    if (!rid || !playerName.trim()) {
      if (!playerName.trim()) addEffect('wrong', 'PLEASE ENTER NAME');
      return;
    }
    if (!authReady) {
      addEffect('wrong', 'AUTH INITIALIZING...');
      return;
    }
    sounds.playClick();
    try {
      const roomRef = doc(db, 'rooms', rid);
      const roomSnap = await getDoc(roomRef);
      if (!roomSnap.exists()) {
        addEffect('wrong', 'ROOM NOT FOUND');
        return;
      }
      
      const playerRef = doc(db, 'rooms', rid, 'players', uid);
      await setDoc(playerRef, {
        name: playerName,
        score: 0,
        isConfirmed: false,
        isHost: false,
        lastSeen: serverTimestamp()
      });

      setRoomId(rid);
      setIsMultiplayer(true);
      setHasEnteredName(true);
      setGameState(p => ({ 
        ...p, 
        status: 'lobby',
        players: [{
          id: uid,
          name: playerName,
          score: 0,
          hand: [],
          isCPU: false,
          isHost: false,
          isConfirmed: false
        }]
      }));
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `rooms/${rid}/players/${uid}`);
    }
  };

  const confirmPlayer = async (targetPlayerId: string) => {
    if (!roomId) return;
    try {
      await updateDoc(doc(db, 'rooms', roomId, 'players', targetPlayerId), {
        isConfirmed: true
      });
    } catch (e) {}
  };

  const kickPlayer = async (targetPlayerId: string) => {
     if (!roomId) return;
     try {
       await deleteDoc(doc(db, 'rooms', roomId, 'players', targetPlayerId));
     } catch (e) {}
  };

  const updateRoomSettings = async (settings: any) => {
    if (!roomId) return;
    try {
      await updateDoc(doc(db, 'rooms', roomId), settings);
    } catch (e) {}
  };

  const getAvailableRooms = async () => {
    try {
       setSetupMode('available_rooms');
       setIsSearching(true);
       const q = query(collection(db, 'rooms'), where('status', '==', 'lobby'));
       const snap = await getDocs(q);
       const rooms = snap.docs.map(d => ({
         roomId: d.id,
         roomName: d.data().roomName,
         playerCount: 0,
         maxPlayers: d.data().numPlayers
       }));
       setAvailableRooms(rooms as any);
    } catch (err) {
       handleFirestoreError(err, OperationType.LIST, 'rooms');
    } finally {
       setIsSearching(false);
    }
  };

  const startMultiplayer = async () => {
    if (!roomId) return;
    try {
        const deck = createDeck();
        const firstJoker = deck.pop()!;
        const firstOpen = deck.pop()!;
        
        // Ensure host is at index 0 for consistent starting player logic
        const sortedPlayersInRoom = [...playersInRoom].sort((a, b) => {
          if (a.isHost) return -1;
          if (b.isHost) return 1;
          return 0;
        });

        // Re-calculate how many players we actually have vs expected
        const actualNumPlayers = sortedPlayersInRoom.length;

        const gamePlayers: Player[] = sortedPlayersInRoom.map(p => ({
          id: p.id,
          name: p.name,
          hand: [],
          score: 0,
          isCPU: false,
          isConfirmed: true
        }));

        for (let i = 0; i < 5; i++) {
          gamePlayers.forEach(p => p.hand.push(deck.pop()!));
        }

        const initialGameState: GameState = {
          ...gameState,
          deck,
          discardPile: [firstOpen],
          openCard: firstOpen,
          players: gamePlayers,
          currentPlayerIndex: (gameState.gameCount % actualNumPlayers), 
          startingPlayerIndex: (gameState.gameCount % actualNumPlayers),
          status: 'playing',
          roundCount: 1,
          gameCount: gameState.gameCount + 1,
          numPlayers: actualNumPlayers,
          jokerRank: firstJoker.rank,
          jokerCard: firstJoker,
          availableCardAtTurnStart: firstOpen,
          message: `${gamePlayers[gameState.gameCount % actualNumPlayers].name}'s Turn`,
          deckingPlayerId: null,
          deckingValue: null,
          deckChallengeEndTime: null
        };

        const batch = writeBatch(db);
        batch.update(doc(db, 'rooms', roomId), { 
          status: 'playing',
          numPlayers: actualNumPlayers
        });
        batch.set(doc(db, 'rooms', roomId, 'state', 'current'), {
          ...initialGameState,
          updatedAt: serverTimestamp()
        });
        await batch.commit();

        addEffect('success', 'GAME STARTED');

    } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `rooms/${roomId}`);
    }
  };

  const syncState = async (newState: GameState) => {
    if (isMultiplayer && roomId) {
      try {
        await setDoc(doc(db, 'rooms', roomId, 'state', 'current'), {
          ...newState,
          updatedAt: serverTimestamp()
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `rooms/${roomId}/state/current`);
      }
    }
  };

  const createDeck = useCallback((): CardType[] => {
    const deck: CardType[] = [];
    [1, 2].forEach(setNum => {
      SUITS.forEach(suit => {
        RANKS.forEach(rank => {
          deck.push({ id: `${rank}-${suit}-${setNum}-${Math.random().toString(36).substr(2, 5)}`, suit, rank, isPretendJoker: false });
        });
      });
      deck.push({ id: `joker-${setNum}-${Math.random().toString(36).substr(2, 5)}`, suit: 'joker', rank: 'JK', isPretendJoker: false });
    });
    const shuffledDeck = [...deck];
    for (let i = shuffledDeck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledDeck[i], shuffledDeck[j]] = [shuffledDeck[j], shuffledDeck[i]];
    }
    return shuffledDeck;
  }, []);

  const initGame = (numPlayers: number, maxRounds: number, currentPlayers?: Player[], currentGameCount?: number, nextStartingIndex?: number, startTutorial: boolean = false) => {
    console.log('[DEBUG] initGame called', { numPlayers, maxRounds, currentGameCount, startTutorial });
    const deck = createDeck();
    let players: Player[];
    const startIdx = nextStartingIndex ?? gameState.startingPlayerIndex ?? 0;
    
    setIsTutorial(startTutorial);
    setTutorialStep(startTutorial ? 1 : 0);
    setTutorialCompletedRounds(0);
    setShowProTips(false);
    setShowTutorialSelect(false);
    setShowTutorial(false);
    setShowWildCardWarning(false);
    
    if (currentPlayers) {
      players = currentPlayers.map(p => ({ ...p, hand: [] }));
    } else {
      players = [{ id: 'player', name: playerName, hand: [], score: 0, totalScore: 0, isAI: false, isCPU: false, isHost: true, isConfirmed: true, hasCalled: false }];
      for (let i = 1; i < numPlayers; i++) {
          players.push({ id: `cpu${i}`, name: `CPU ${i}`, hand: [], score: 0, totalScore: 0, isAI: true, isCPU: true, isHost: false, isConfirmed: true, hasCalled: false });
      }
    }
    
    // Each player gets 5 cards
    for (let i = 0; i < 5; i++) {
      players.forEach(p => {
        const card = deck.pop();
        if (card) p.hand.push(card);
      });
    }

    // Draw 2 cards for Open/Wild selection
    // Higher comparison value becomes Open Card, Lower becomes Wild Card
    const getComparisonValue = (rank: Rank) => {
       if (rank === 'JK') return 14;
       if (rank === 'A') return 1;
       if (rank === 'J') return 11;
       if (rank === 'Q') return 12;
       if (rank === 'K') return 13;
       return parseInt(rank);
    };

    const card1 = deck.pop()!;
    const card2 = deck.pop()!;
    
    let openCard: CardType;
    let wildCard: CardType;
    
    if (getComparisonValue(card1.rank) >= getComparisonValue(card2.rank)) {
       openCard = card1;
       wildCard = card2;
    } else {
       openCard = card2;
       wildCard = card1;
    }

    const newState: GameState = {
      id: roomId || 'local',
      players, 
      deck, 
      discardPile: [openCard], 
      openCard, 
      jokerCard: wildCard, 
      jokerRank: wildCard.rank,
      currentPlayerIndex: startIdx,
      startingPlayerIndex: startIdx,
      roundCount: 0, 
      gameCount: currentGameCount ?? 0, 
      maxGames: maxRounds, 
      numPlayers, 
      status: 'playing', 
      winner: null,
      deckingPlayerId: null, 
      deckingValue: null, 
      deckChallengeEndTime: null,
      message: `${players[startIdx].name} Starts`, 
      turnStartTime: Date.now(),
      availableCardAtTurnStart: openCard
    };
    setGameState(newState);
    if (isMultiplayer) syncState(newState);

    setHasDrawnThisTurn(false);
    setHasDiscardedThisTurn(false);
    setJustDiscardedCard(null);
    setSelectedCards([]);
    sounds.playDraw();
  };

  const drawFromDeck = () => {
    if (isActionInProgress.current) return;
    isActionInProgress.current = true;
    
    setTimeout(() => { isActionInProgress.current = false; }, 500);

    console.log('[DEBUG] drawFromDeck attempt');
    if (gameState.status !== 'playing') return;
    
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    const isActuallyMyTurn = isMultiplayer ? (playerId === currentPlayer.id) : (gameState.currentPlayerIndex === 0);
    
    if (!isActuallyMyTurn) return;
    
    if (hasDrawnThisTurn) {
        addEffect('penalty', 'ALREADY DRAWN');
        return;
    }
    
    if (!hasDiscardedThisTurn && !isTutorial) {
        addEffect('penalty', 'DISCARD FIRST');
        return;
    }

    let newDeck = [...gameState.deck];
    let newDiscardPile = [...gameState.discardPile];
    if (newDeck.length === 0) {
      if (newDiscardPile.length <= 1) return;
      const top = newDiscardPile.pop()!;
      for (let i = newDiscardPile.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newDiscardPile[i], newDiscardPile[j]] = [newDiscardPile[j], newDiscardPile[i]];
      }
      newDeck = newDiscardPile;
      newDiscardPile = [top];
      addEffect('success', 'RESHUFFLED');
    }

    sounds.playDraw();
    const drawn = newDeck.pop()!;
    const newPlayers = [...gameState.players];
    const personDrawn = newPlayers[gameState.currentPlayerIndex].name;
    newPlayers[gameState.currentPlayerIndex].hand.push(drawn);
    
    const nextIdx = (gameState.currentPlayerIndex + 1) % gameState.numPlayers;
    const isRoundDone = nextIdx === gameState.startingPlayerIndex;
    const actionMsg = `${personDrawn} drew from Deck`;

    const newState: GameState = {
      ...gameState, deck: newDeck, discardPile: newDiscardPile, players: newPlayers,
      message: actionMsg,
      lastAction: actionMsg,
      currentPlayerIndex: nextIdx,
      roundCount: isRoundDone ? gameState.roundCount + 1 : gameState.roundCount,
      turnStartTime: Date.now(),
      availableCardAtTurnStart: newDiscardPile[newDiscardPile.length - 1] || null
    };
    setGameState(newState);
    setHasDrawnThisTurn(true);
    setHasDiscardedThisTurn(false);

    if (isTutorial && tutorialStep === 2) {
      setTutorialStep(3);
    }

    syncState(newState);
  };

  const drawFromDiscard = () => {
    if (isActionInProgress.current) return;
    isActionInProgress.current = true;
    
    setTimeout(() => { isActionInProgress.current = false; }, 500);

    console.log('[DEBUG] drawFromDiscard attempt');
    if (gameState.status !== 'playing' || !gameState.openCard) return;
    
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    const isActuallyMyTurn = isMultiplayer ? (playerId === currentPlayer.id) : (gameState.currentPlayerIndex === 0);
    
    if (!isActuallyMyTurn) return;

    if (hasDrawnThisTurn) {
        addEffect('penalty', 'ALREADY DRAWN');
        return;
    }

    if (!hasDiscardedThisTurn && !isTutorial) {
        addEffect('penalty', 'DISCARD FIRST');
        return;
    }

    let picked = gameState.openCard;
    let newDiscard = gameState.discardPile.slice(0, -1);

    if (hasDiscardedThisTurn && gameState.availableCardAtTurnStart) {
        // When picking from discard after discarding, we must pick the card that was there at turn start
        // which might be several cards deep now if we discarded multiple.
        picked = gameState.availableCardAtTurnStart;
        const availableIdx = gameState.discardPile.findLastIndex(c => c.id === picked?.id);
        if (availableIdx !== -1) {
            newDiscard = [...gameState.discardPile];
            newDiscard.splice(availableIdx, 1);
        }
    }

    if (!picked) return;
    
    sounds.playDraw();

    const newPlayers = [...gameState.players];
    const personDrawn = newPlayers[gameState.currentPlayerIndex].name;
    newPlayers[gameState.currentPlayerIndex].hand.push(picked);
    
    const nextIdx = (gameState.currentPlayerIndex + 1) % gameState.numPlayers;
    const isRoundDone = nextIdx === gameState.startingPlayerIndex;
    const actionMsg = `${personDrawn} picked from Open Pile`;
    const newState: GameState = {
      ...gameState, 
      discardPile: newDiscard, 
      openCard: newDiscard[newDiscard.length - 1] || null,
      players: newPlayers, 
      message: actionMsg,
      lastAction: actionMsg,
      currentPlayerIndex: nextIdx,
      roundCount: isRoundDone ? gameState.roundCount + 1 : gameState.roundCount,
      turnStartTime: Date.now(),
      availableCardAtTurnStart: newDiscard[newDiscard.length - 1] || null
    };
    setGameState(newState);
    setHasDrawnThisTurn(true);
    setHasDiscardedThisTurn(false);

    if (isTutorial && tutorialStep === 2) {
       setTutorialStep(3);
    }

    syncState(newState);
  };

  const discardCards = () => {
    console.log('[DEBUG] discardCards attempt', { selectedCards });
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    const isActuallyMyTurn = isMultiplayer ? (playerId === currentPlayer.id) : (gameState.currentPlayerIndex === 0);
    
    if (gameState.status !== 'playing') return;
    if (!isActuallyMyTurn) {
      addEffect('penalty', 'NOT YOUR TURN');
      return;
    }
    if (hasDiscardedThisTurn && !isTutorial) {
        addEffect('penalty', 'PICK A CARD FIRST');
        return;
    }
    if (selectedCards.length === 0) {
      addEffect('penalty', 'SELECT CARDS');
      return;
    }

    // Identify the cards from the current hand
    const cardsToDiscard = currentPlayer.hand.filter(c => selectedCards.includes(c.id));
    if (cardsToDiscard.length === 0) return;

    // Check for Joker/Wild card warning
    const hasSpecial = cardsToDiscard.some(c => c.rank === 'JK' || c.rank === gameState.jokerRank);
    if (hasSpecial && !showWildCardWarning) {
       setShowWildCardWarning(true);
       return; 
    }

    // Multi-card discard rules: All non-special cards must match rank
    if (cardsToDiscard.length > 1) {
       const nonJokers = cardsToDiscard.filter(c => c.rank !== 'JK' && c.rank !== gameState.jokerRank);
       if (nonJokers.length > 0) {
         const firstRank = nonJokers[0].rank;
         if (!nonJokers.every(c => c.rank === firstRank)) {
           addEffect('penalty', 'MATCH RANKS!');
           return;
         }
       }
    }

    sounds.playDiscard();
    const newPlayers = [...gameState.players];
    const playerIndex = gameState.currentPlayerIndex;
    newPlayers[playerIndex].hand = currentPlayer.hand.filter(c => !selectedCards.includes(c.id));
    
    if (cardsToDiscard.length === 2) addEffect('pair', 'PAIR');
    else if (cardsToDiscard.length === 3) addEffect('triplet', 'TRIPLETS');
    else if (cardsToDiscard.length >= 4) addEffect('set', 'SET');

    // Trigger dramatic effect for sets
    if (cardsToDiscard.length > 1) {
      const comboType = cardsToDiscard.length === 2 ? 'PAIR' : cardsToDiscard.length === 3 ? 'TRIPLET' : 'SET';
      setShowComboEffect({ type: comboType, count: cardsToDiscard.length });
      sounds.playPowerUp();
      setTimeout(() => setShowComboEffect(null), 1500);
    }

    // Each turn: 1. Discard 1+ cards same rank. 2. Draw 1 card (Ends turn).
    const nextIdx = (gameState.currentPlayerIndex + 1) % gameState.numPlayers;
    const isRoundDone = nextIdx === gameState.startingPlayerIndex;

    const newState: GameState = {
      ...gameState, 
      players: newPlayers, 
      discardPile: [...gameState.discardPile, ...cardsToDiscard],
      openCard: cardsToDiscard[cardsToDiscard.length - 1], 
      message: isTutorial ? 'Great! Now Draw.' : 'Discarded. Pick a card.',
      availableCardAtTurnStart: gameState.availableCardAtTurnStart || gameState.openCard,
      lastAction: `${currentPlayer.name} discarded`
    };

    setGameState(newState);
    setHasDrawnThisTurn(false);
    setHasDiscardedThisTurn(true);

    if (isTutorial && tutorialStep === 1) {
      setTutorialStep(2);
    }

    setJustDiscardedCard(cardsToDiscard[cardsToDiscard.length - 1]);
    setSelectedCards([]);
    syncState(newState);
  };

  const calculateRoundOverState = (state: GameState, winnerId: string | null, isWrongDeck = false): GameState => {
    // Correct deck logic: Decker gets 0 only if strictly lower than EVERYONE ELSE.
    // If ANYONE has equal or lower points, it's a Wrong Deck.
    
    const values = state.players.map(p => calculateHandValue(p.hand, state.jokerRank));
    const deckerIdx = state.players.findIndex(p => p.id === state.deckingPlayerId);
    const deckerVal = deckerIdx !== -1 ? values[deckerIdx] : 999;
    
    // Check if anyone else has equal or lower points
    const othersWithEqualOrLower = values.filter((v, i) => i !== deckerIdx && v <= deckerVal);
    const effectivelyWrong = isWrongDeck || othersWithEqualOrLower.length > 0;
    
    let roundWinnerId = state.deckingPlayerId;
    if (effectivelyWrong) {
      if (winnerId) {
        roundWinnerId = winnerId;
      } else {
        // Find who had the absolute lowest score (excluding decker)
        const minVal = Math.min(...values);
        const winners = state.players.filter((p, i) => values[i] === minVal && p.id !== state.deckingPlayerId);
        roundWinnerId = winners.length > 0 ? winners[0].id : state.players[0].id;
      }
    }

    const newPlayers = state.players.map((p, i) => {
      const handPoints = values[i];
      let gainedPoints = handPoints; 

      if (p.id === roundWinnerId) {
        gainedPoints = 0;
      } else if (effectivelyWrong && p.id === state.deckingPlayerId) {
        gainedPoints = 50; // Penalty for wrong deck
      }

      return {
        ...p,
        score: (p.score || 0) + gainedPoints,
        lastRoundScore: gainedPoints
      };
    });

    const isGameOver = state.gameCount >= state.maxGames;
    const sortedPlayersForWin = [...newPlayers].sort((a, b) => a.score - b.score);
    const nextStartingIndex = (state.startingPlayerIndex! + 1) % state.numPlayers;
    
    // Explicitly set the round winner ID for the result screen
    const finalRoundWinnerId = effectivelyWrong ? roundWinnerId : state.deckingPlayerId;
    
    return {
      ...state, 
      players: newPlayers, 
      status: isGameOver ? 'final_results' : 'round_over',
      gameCount: state.gameCount + 1, 
      startingPlayerIndex: nextStartingIndex,
      message: effectivelyWrong ? 'WRONG DECK!' : 'DECK SUCCESS!',
      winner: isGameOver ? sortedPlayersForWin[0].id : null,
      roundWinnerId: finalRoundWinnerId,
      deckingPlayerId: null,
      deckingValue: null,
      deckChallengeEndTime: null
    };
  };

  const finishRound = (winnerId: string | null, isWrongDeck = false) => {
    setGameState(prev => {
      const newState = calculateRoundOverState(prev, winnerId, isWrongDeck);
      if (isWrongDeck) sounds.playPenalty(); else sounds.playWin();
      syncState(newState);
      return newState;
    });
  };

  const handleWrongDeck = () => {
    if (gameState.status !== 'deck_challenge') return;
    const me = gameState.players.find(p => isMultiplayer ? (p.id === playerId) : (p.id === 'player'));
    if (!me) return;
    
    const myVal = calculateHandValue(me.hand, gameState.jokerRank);
    if (myVal <= (gameState.deckingValue || 0)) {
      addEffect('wrong', 'WRONG DECK!');
      finishRound(me.id, true);
    }
  };

  const handleDeckIt = () => {
    const values = gameState.players.map(p => calculateHandValue(p.hand, gameState.jokerRank));
    const deckerVal = values[gameState.currentPlayerIndex];
    if (gameState.status !== 'playing' || hasDiscardedThisTurn) return;
    
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    if (isMultiplayer && currentPlayer.id !== playerId) return;

    // Logic: Always allow attempt, but it's risky if round < 5 or points > 0
    // Actually the user wants it UNLOCKED, implying they can try anytime.

    // Start challenge phase
    const challengeEndTime = Date.now() + 5000; 
    const newState: GameState = {
      ...gameState,
      status: 'deck_challenge',
      deckingPlayerId: currentPlayer.id,
      deckingValue: deckerVal,
      deckChallengeEndTime: challengeEndTime,
      message: `${currentPlayer.name.toUpperCase()} CALLED DECK!`
    };
    
    sounds.playStart();
    setGameState(newState);
    syncState(newState);

    if (!isMultiplayer) {
      setTimeout(() => {
        setGameState(current => {
          if (current.status === 'deck_challenge') {
             const cpuValues = current.players.slice(1).map(p => calculateHandValue(p.hand, current.jokerRank));
             const minCpuVal = Math.min(...cpuValues);
             if (minCpuVal <= deckerVal) {
                const cpuIdx = 1 + cpuValues.indexOf(minCpuVal);
                const newState = calculateRoundOverState(current, current.players[cpuIdx].id, true);
                sounds.playPenalty();
                syncState(newState);
                return newState;
             } else {
                const newState = calculateRoundOverState(current, null, false);
                sounds.playWin();
                syncState(newState);
                return newState;
             }
          }
          return current;
        });
      }, 3000);
    }
  };

  useEffect(() => {
    if (gameState.status === 'deck_challenge' && gameState.deckChallengeEndTime) {
      const timer = setInterval(() => {
        if (Date.now() >= gameState.deckChallengeEndTime) {
          if (!isMultiplayer || (isMultiplayer && gameState.players[0].id === playerId)) {
            finishRound(null, false);
          }
          clearInterval(timer);
        }
      }, 500);
      return () => clearInterval(timer);
    }
  }, [gameState.status, gameState.deckChallengeEndTime]);

  useEffect(() => {
     if (!isMultiplayer && gameState.status === 'playing' && gameState.currentPlayerIndex > 0 && !isTutorial) {
        cpuActionTimer.current = setTimeout(() => {
           const cpu = gameState.players[gameState.currentPlayerIndex];
           const val = calculateHandValue(cpu.hand, gameState.jokerRank);
           
           // 1. DISCARD Phase (Must discard first)
           if (!hasDiscardedThisTurn) {
              if (Math.floor(gameState.roundCount) >= 5 && val < 5) { handleDeckIt(); return; }
              const hand = [...cpu.hand];
              const counts: any = {};
              hand.forEach(c => counts[c.rank] = (counts[c.rank] || 0) + 1);
              let toDisc: CardType[] = [];
              const multis = Object.keys(counts).filter(r => counts[r] > 1);
              if (multis.length > 0) toDisc = hand.filter(c => c.rank === multis[0]);
              else toDisc = [hand.reduce((a, b) => getRankValue(a.rank, gameState.jokerRank) > getRankValue(b.rank, gameState.jokerRank) ? a : b)];
              const lastDisc = toDisc[toDisc.length - 1];
              setGameState(p => ({
                ...p, 
                players: p.players.map((pl, i) => i === p.currentPlayerIndex ? { ...pl, hand: pl.hand.filter(c => !toDisc.find(d => d.id === c.id)) } : pl),
                discardPile: [...p.discardPile, ...toDisc],
                openCard: lastDisc,
                message: `${cpu.name} discarded`,
                availableCardAtTurnStart: p.availableCardAtTurnStart || p.openCard
              }));
              setHasDiscardedThisTurn(true);
              setHasDrawnThisTurn(false);
              sounds.playDiscard();
              return;
           }

           // 1. DRAW Phase
           if (hasDiscardedThisTurn && !hasDrawnThisTurn) {
             setGameState(p => {
               const oldAvailable = p.availableCardAtTurnStart;
               let picked: CardType;
               const nextIdx = (p.currentPlayerIndex + 1) % p.numPlayers;
               const isRoundDone = nextIdx === p.startingPlayerIndex;
               let finalState = { ...p };

               if (oldAvailable && (getRankValue(oldAvailable.rank, p.jokerRank) < 5 || oldAvailable.rank === p.jokerRank || oldAvailable.rank === 'JK')) {
                  // Pick from available open card
                  picked = oldAvailable;
                  const newDiscard = p.discardPile.filter(c => c.id !== picked.id);
                  finalState = {
                    ...p, 
                    discardPile: newDiscard, 
                    openCard: newDiscard[newDiscard.length - 1] || null,
                    players: p.players.map((pl, i) => i === p.currentPlayerIndex ? { ...pl, hand: [...pl.hand, picked] } : pl),
                    currentPlayerIndex: nextIdx,
                    roundCount: isRoundDone ? p.roundCount + 1 : p.roundCount,
                    message: `${p.players[p.currentPlayerIndex].name} picked ${picked.rank} from Open Pile`,
                    availableCardAtTurnStart: newDiscard[newDiscard.length - 1] || null
                  };
               } else {
                  // Pick from deck
                  const deck = [...p.deck];
                  picked = deck.pop()!;
                  finalState = {
                    ...p, 
                    deck,
                    players: p.players.map((pl, i) => i === p.currentPlayerIndex ? { ...pl, hand: [...pl.hand, picked] } : pl),
                    currentPlayerIndex: nextIdx,
                    roundCount: isRoundDone ? p.roundCount + 1 : p.roundCount,
                    message: `${p.players[p.currentPlayerIndex].name} drew ${picked.rank} from Deck`,
                    availableCardAtTurnStart: p.openCard
                  };
               }
               return finalState;
             });
             setHasDrawnThisTurn(true);
             setHasDiscardedThisTurn(false);
             sounds.playDraw();
             return;
           }

        }, 1000);
     }
     return () => clearTimeout(cpuActionTimer.current!);
  }, [gameState.currentPlayerIndex, gameState.status, isMultiplayer, hasDrawnThisTurn, hasDiscardedThisTurn]);

  useEffect(() => {
    setHasDrawnThisTurn(false);
    setHasDiscardedThisTurn(false);
    setSelectedCards([]);
  }, [gameState.currentPlayerIndex, gameState.status]);

  const addEffect = (type: GameEffect['type'], text: string) => {
    const id = `${Date.now()}-${sessionIdx.current++}-${Math.random().toString(36).substr(2, 9)}`;
    setEffects(prev => [...prev, { id, type, text }]);
    setTimeout(() => {
      setEffects(prev => prev.filter(e => e.id !== id));
    }, 1500);
  };

  useEffect(() => {
    if (isTutorial && tutorialStep === 4 && gameState.currentPlayerIndex === 0 && !hasDiscardedThisTurn) {
        setTutorialCompletedRounds(prev => prev + 1);
    }
  }, [gameState.currentPlayerIndex, isTutorial]);

  const handleBackToMenu = () => {
    sounds.playClick();
    onBack();
  };

  const renderTutorialGuidance = () => {
    if (!isTutorial || tutorialStep === 0) return null;
    
    const TUTORIAL_DATA = [
      {
        step: 1,
        text: "FIRST, DISCARD ONE OR MORE CARDS OF THE SAME RANK AND PRESS 'DISCARD'.",
      },
      {
        step: 2,
        text: "PERFECT! NOW YOU MUST PICK ONE CARD FROM EITHER THE OPEN PILE OR DECK TO END YOUR TURN.",
      },
      {
        step: 3,
        text: "ACE IS 1 POINT. NUMBERS ARE FACE VALUE. J, Q, K ARE 10. JOKERS & WILD CARDS ARE 0!",
      },
      {
        step: 4,
        text: "GOAL: HAVE THE LEAST POINTS. 'DECK IT' UNLOCKS WHENEVER YOU ARE READY!",
      }
    ];

    if (tutorialStep > TUTORIAL_DATA.length) return null;
    const data = TUTORIAL_DATA[tutorialStep - 1];

    return (
      <div className="fixed bottom-32 left-6 z-[1000] flex flex-col items-start pointer-events-none max-w-[300px]">
        <motion.div 
          initial={{ x: -100, opacity: 0, scale: 0.8 }}
          animate={{ x: 0, opacity: 1, scale: 1 }}
          className="relative pointer-events-auto"
        >
          {/* Snowy Owl Mascot */}
          <div className="relative mb-2 ml-4">
            <div className="w-24 h-24 flex items-center justify-center relative z-10">
              <img 
                src="https://pngimg.com/uploads/owl/owl_PNG43.png" 
                alt="Snowy Owl Mascot" 
                className="w-full h-full object-contain filter drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)]"
                referrerPolicy="no-referrer"
              />
            </div>
            {/* Owl Eyes Glow */}
            <div className="absolute top-8 left-8 w-1 h-1 bg-gold/60 blur-[1px] rounded-full z-20 animate-pulse" />
            <div className="absolute top-8 right-8 w-1 h-1 bg-gold/60 blur-[1px] rounded-full z-20 animate-pulse" />
          </div>

          {/* Speech Bubble */}
          <div className="bg-white text-brand-maroon p-5 rounded-[30px] rounded-bl-sm shadow-[0_30px_90px_rgba(0,0,0,0.8)] border-4 border-gold/40 relative">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-gold rounded-full animate-ping" />
                <h4 className="font-black text-[10px] italic text-gold uppercase tracking-widest bg-brand-maroon/10 px-2 py-0.5 rounded-full w-fit">COACH TIP</h4>
              </div>
              <p className="font-bold text-sm leading-tight uppercase tracking-tight text-left text-brand-maroon">
                {data.text}
              </p>
              <button 
                onClick={() => {
                  sounds.playClick();
                  if (tutorialStep >= TUTORIAL_DATA.length) {
                    setIsTutorial(false);
                    setTutorialStep(0);
                  } else {
                     setTutorialStep(prev => prev + 1);
                  }
                }}
                className="w-full mt-1 bg-gold text-brand-maroon py-3 rounded-xl font-black text-[10px] uppercase tracking-widest border-2 border-black active:scale-95 transition-all shadow-lg hover:bg-gold-light"
              >
                {tutorialStep >= TUTORIAL_DATA.length ? "GOT IT!" : "NEXT STEP"}
              </button>
            </div>
            {/* Bubble Tail */}
            <div className="absolute -bottom-3 left-4 w-6 h-6 bg-white rotate-45 border-r-4 border-b-4 border-gold/40 -z-10" />
          </div>
        </motion.div>
      </div>
    );
  };

        
        
  const renderWildCardWarning = () => {
    return (
      <AnimatePresence mode="wait">
        {showWildCardWarning && (
          <motion.div 
            key="wild-card-toast"
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            className="absolute bottom-40 left-1/2 -translate-x-1/2 bg-brand-red border-2 border-white/20 p-4 rounded-2xl shadow-2xl max-w-xs text-center relative pointer-events-auto"
          >
            <div className="flex items-center gap-3 mb-2 justify-center">
              <AlertCircle className="w-5 h-5 text-white" />
              <span className="text-white font-black uppercase text-[10px] tracking-widest">WILD CARD WARNING</span>
            </div>
            <p className="text-white/90 text-xs font-bold leading-relaxed mb-3">
              Beware, you might drop a wild card by mistake as it is valued at 0 points
            </p>
            <button 
              onClick={() => setShowWildCardWarning(false)}
              className="w-full py-2 bg-white/10 hover:bg-white/20 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all"
            >
              Dismiss
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    );
  };

  // --- Screens & Overlays ---

  const renderLobbyScreen = () => (
    <motion.div key="lobby" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="fixed inset-0 z-[110] flex items-center justify-center backdrop-blur-3xl bg-brand-maroon/95 p-2 sm:p-4">
       <div className="max-w-md w-full bg-brand-maroon/60 border-black border-4 rounded-[48px] p-6 sm:p-8 md:p-14 text-center shadow-[0_40px_100px_black] relative overflow-hidden flex flex-col max-h-[95vh] backdrop-blur-3xl">
          <button onClick={() => { sounds.playClick(); onBack(); }} className="absolute top-6 left-6 p-2 text-gold/40 hover:text-gold hover:bg-gold/5 rounded-full transition-all">
             <ArrowLeft className="w-5 h-5" />
          </button>
          
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-gold via-brand-gold to-gold animate-gradient" />
          
          <div className="w-16 h-16 bg-gold/5 rounded-[24px] flex items-center justify-center mx-auto mb-6 shadow-inner border border-black group">
             <Gamepad2 className="w-8 h-8 text-gold group-hover:scale-110 transition-transform" />
          </div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 relative"
          >
            <div className="absolute inset-0 flex items-center justify-center overflow-hidden pointer-events-none opacity-20">
              {[1, 2, 3].map((v) => (
                <motion.div
                  key={`wave-${v}`}
                  animate={{
                    y: [0, -10, 0],
                    x: [-5, 5, -5],
                  }}
                  transition={{
                    duration: 2 + v,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                  className="w-full h-4 absolute bg-gold/10"
                  style={{ top: `${v * 25}%` }}
                />
              ))}
            </div>
            <h3 className="text-gold font-black text-xs tracking-[0.5em] mb-2 embossed">DON'T PLAY THE ODDS</h3>
            <h3 className="text-white font-black text-xl tracking-[0.3em] embossed">PLAY THE MAN</h3>
          </motion.div>

          <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tighter mb-4 italic text-brand-gold embossed">{roomName}</h2>
          
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className={cn("w-3 h-3 rounded-full animate-pulse border border-black", socketConnected ? "bg-brand-gold shadow-[0_0_12px_rgba(212,175,55,0.6)]" : "bg-brand-maroon shadow-[0_0_12px_rgba(128,0,32,0.6)]")} />
            <span className="text-[10px] font-black uppercase tracking-widest text-brand-gold/60 embossed">
              {socketConnected ? "SERVER CONNECTED" : "RECONNECTING TO SERVER..."}
            </span>
          </div>
          
          <div className="bg-gold/5 py-8 rounded-[44px] border border-black shadow-inner mb-8 px-6 flex flex-col items-center justify-center w-full max-w-[92%] mx-auto relative overflow-hidden backdrop-blur-md">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-1 bg-gold/20 rounded-full blur-md" />
            <span className="text-gold/40 text-[9px] font-black uppercase tracking-[0.5em] block mb-4 text-center w-full">MULTI-USER ACCESS</span>
            <div className="flex flex-col items-center gap-3 w-full">
                <div className="flex items-center gap-4 mb-2">
                   <div className="px-5 py-2 bg-black/40 rounded-xl border border-black group">
                      <span className="text-[10px] font-black text-gold/30 uppercase tracking-widest block mb-1">ROOM CODE</span>
                      <p className="text-gold font-black text-3xl tracking-widest uppercase leading-none">{roomId || "...."}</p>
                   </div>
                </div>
            </div>
          </div>
          
          <div className="flex items-center justify-between px-6 mb-4">
            <span className="text-[10px] font-black text-gold/30 uppercase tracking-widest">Players Joined</span>
            <span className="text-[12px] font-black text-gold bg-gold/10 px-4 py-1 rounded-full border border-black">
              {playersInRoom.length} / {gameState.numPlayers}
            </span>
          </div>
          
          <div className="space-y-3 mb-8 overflow-y-auto custom-scrollbar flex-1 pr-1">
             {playersInRoom.length === 0 ? (
            <div className="p-10 bg-gold/5 rounded-[32px] border border-black flex flex-col items-center gap-4 animate-pulse">
              <div className="w-10 h-10 rounded-full border-2 border-gold/40 border-t-gold animate-spin" />
              <span className="text-[10px] font-black text-gold/30 uppercase tracking-widest italic">LOADING LOBBY...</span>
            </div>
          ) : playersInRoom.map((p, pIdx) => (
            <div key={`lobby-player-${p.id || pIdx}-${pIdx}`} className="flex justify-between items-center p-5 bg-gold/5 rounded-[28px] border border-black text-white/5 hover:bg-gold/10 transition-all group">
                  <div className="flex items-center gap-4">
                     <div className="w-12 h-12 rounded-2xl bg-gold flex items-center justify-center font-black text-brand-maroon text-lg shadow-xl group-hover:scale-105 transition-transform">{(p.name?.[0] || '?')}</div>
                     <div className="flex flex-col items-start px-2 text-left">
                        <div className="flex items-center gap-2">
                           <span className="font-black text-base text-cream leading-tight">{p.name}</span>
                           {(p.id === playerId) && (
                              <span className="text-[8px] bg-gold/20 text-gold px-1.5 py-0.5 rounded-md font-black uppercase tracking-widest">YOU</span>
                           )}
                        </div>
                        {!p.isConfirmed ? (
                          <span className="text-[8px] font-black text-red-500/80 uppercase tracking-widest mt-1 flex items-center gap-1.5 animate-pulse">
                            <Clock className="w-2.5 h-2.5" />
                            NOT READY
                          </span>
                        ) : (
                          <span className="text-[8px] font-black text-gold uppercase tracking-widest mt-1 flex items-center gap-1.5">
                            <Shield className="w-2.5 h-2.5" />
                            READY
                          </span>
                        )}
                     </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {p.isHost && <span className="text-[8px] border border-black text-gold px-2.5 py-1 rounded-full font-black tracking-widest shadow-lg">HOST</span>}
                    {effectiveIsHost && p.id !== playerId && (
                      <div className="flex gap-2">
                         {!p.isConfirmed && (
                           <button onClick={() => { sounds.playClick(); confirmPlayer(p.id); }} className="px-5 py-2 bg-gold text-brand-maroon rounded-xl font-black text-[10px] tracking-widest hover:bg-gold-light active:scale-95 transition-all shadow-lg uppercase">CONFIRM</button>
                         )}
                         <button onClick={() => { sounds.playClick(); kickPlayer(p.id); }} className="p-3 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-all border border-black active:scale-95"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    )}
                  </div>
               </div>
             ))}
          </div>

          <div className="pt-2">
            {effectiveIsHost ? (
               <div className="flex flex-col gap-4">
                 {playersInRoom.length >= 2 && playersInRoom.every(p => p.isConfirmed) ? (
                   <div className="flex flex-col gap-4">
                     <span className="text-[10px] font-black text-brand-gold bg-brand-gold/10 px-4 py-2 rounded-full border border-brand-gold/20 animate-pulse">
                       EVERYONE HAS JOINED! READY TO START.
                     </span>
                     <button 
                       onClick={() => { sounds.playClick(); startMultiplayer(); }} 
                       className="w-full py-7 font-black uppercase text-xl rounded-[32px] transition-all relative overflow-hidden shadow-2xl bg-gold text-brand-maroon hover:bg-gold-light hover:scale-[1.02] active:scale-[0.98] embossed"
                     >
                       Start Game
                       <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cream/20 to-transparent animate-shimmer" />
                     </button>
                   </div>
                 ) : (
                   <div className="p-6 bg-gold/5 border border-black rounded-[32px] text-gold/40 text-[10px] font-black uppercase tracking-[0.3em] italic flex flex-col gap-2">
                     <span>WAITING FOR OTHERS TO JOIN...</span>
                     <div className="w-full h-1 bg-black/20 rounded-full overflow-hidden">
                        <motion.div 
                          className="h-full bg-gold/40" 
                          animate={{ width: `${(playersInRoom.filter(p => p.isConfirmed).length / (gameState.numPlayers || 2)) * 100}%` }} 
                        />
                     </div>
                   </div>
                 )}
               </div>
            ) : (
               <div className="p-8 bg-gold/5 border border-black rounded-[32px] text-gold/40 text-[10px] font-black uppercase tracking-[0.3em] italic flex flex-col gap-4 relative overflow-hidden backdrop-blur-md">
                 <div className="absolute top-0 left-0 w-1.5 h-full bg-gold/50" />
                 {playersInRoom.length >= 2 && playersInRoom.every(p => p.isConfirmed) ? (
                   <div className="flex flex-col items-center gap-2">
                     <span className="text-gold font-black">ALL PLAYERS READY</span>
                     <span className="text-[9px] animate-pulse">WAITING FOR HOST TO START...</span>
                   </div>
                 ) : (
                   <span>WAITING FOR OTHER PLAYERS...</span>
                 )}
               </div>
            )}
          </div>
       </div>
    </motion.div>
  );

  const renderSetupScreen = () => {
    return (
      <motion.div key="setup" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[100] flex items-center justify-center backdrop-blur-3xl bg-brand-maroon/95 p-2 sm:p-4 md:p-10 relative overflow-hidden">
         {/* Burgundy Waves Background */}
         <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <motion.div 
               animate={{ 
                 y: [0, -20, 0],
                 rotate: [0, 2, 0],
                 scale: [1, 1.05, 1]
               }}
               transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
               className="absolute -top-[20%] -left-[10%] w-[120%] h-[120%] bg-brand-maroon/40 blur-[80px] rounded-[40%]" 
            />
            <motion.div 
               animate={{ 
                 y: [0, 30, 0],
                 rotate: [0, -3, 0],
                 scale: [1.1, 1, 1.1]
               }}
               transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
               className="absolute -bottom-[20%] -right-[10%] w-[130%] h-[130%] bg-brand-maroon/30 blur-[100px] rounded-[35%]" 
            />
            <motion.div 
               animate={{ 
                 x: [-10, 10, -10],
                 y: [-10, 10, -10]
               }}
               transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
               className="absolute top-1/4 left-1/4 w-[80%] h-[80%] bg-brand-maroon/20 blur-[120px] rounded-[45%]" 
            />
         </div>

         <div className="max-w-xl w-full bg-brand-maroon/90 border-black border-4 rounded-[48px] p-6 sm:p-8 md:p-14 text-center shadow-[0_80px_160px_black] relative overflow-hidden flex flex-col max-h-[95vh] backdrop-blur-3xl z-10">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-gold via-gold-light to-gold animate-gradient" />
            
            {setupMode === 'main' && (
              <button 
                onClick={() => { sounds.playClick(); onBack(); }} 
                className="absolute top-6 left-6 p-2 text-gold/40 hover:text-gold hover:bg-gold/5 rounded-full transition-all z-[200] no-theme"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            
            {/* RELAXED OFFLINE OVERLAY */}
            {isMultiplayer && gameState.status === 'playing' && ((!isOnline && !socketConnected) || (!socketConnected && !isInitializing)) && (
              <div className="absolute inset-0 z-[200] bg-brand-maroon/95 backdrop-blur-3xl flex flex-col items-center justify-center p-8 sm:p-12 text-center">
                 <div className="relative mb-10">
                   <div className="relative">
                      <AlertCircle className="w-20 h-20 text-gold animate-pulse" />
                      <WifiOff className="w-8 h-8 text-gold/40 absolute -bottom-2 -right-2 bg-brand-maroon rounded-full p-1 border-2 border-brand-maroon" />
                   </div>
                   <div className="absolute inset-0 bg-gold/10 blur-3xl animate-ping rounded-full" />
                 </div>
                 
                 <h3 className="text-4xl font-black uppercase italic mb-2 tracking-tighter text-cream embossed">
                   {!isOnline ? "CONNECTION LOST" : "RECONNECTING"}
                 </h3>
                 
                 <p className="text-gold/40 font-bold uppercase tracking-[0.3em] mb-10 text-[9px] leading-relaxed max-w-[280px] embossed">
                   {!isOnline 
                     ? "WE CAN'T REACH THE SERVER. PLEASE CHECK YOUR DATA OR WIFI CONNECTION." 
                     : "THE MULTIPLAYER BRIDGE DROPPED. WE ARE ATTEMPTING TO RESTORE YOUR SESSION..."}
                 </p>

                 <div className="flex flex-col gap-4 w-full max-w-[300px]">
                    <button 
                      onClick={() => {
                        sounds.playClick();
                        window.location.reload();
                      }} 
                      className="w-full py-6 bg-gold text-brand-maroon font-black uppercase rounded-2xl shadow-[0_20px_40px_rgba(0,0,0,0.3)] hover:scale-[1.02] active:scale-95 transition-all text-xs tracking-widest"
                    >
                      {(!isOnline) ? "CHECK WIFI & RETRY" : "FORCE RECONNECT"}
                    </button>
                    {isMultiplayer && (
                      <button 
                        onClick={() => {
                          sounds.playClick();
                          setIsMultiplayer(false);
                          setSetupMode('main');
                        }}
                        className="text-[10px] font-black text-gold/30 uppercase tracking-[0.3em] hover:text-gold transition-colors py-2"
                      >
                        BACK TO SINGLE PLAYER
                      </button>
                    )}
                 </div>
              </div>
            )}

          <div className="flex-1 overflow-y-auto no-scrollbar scroll-smooth px-2">
            <div className="py-2 space-y-4">
              
              <div className="flex justify-center mb-0">
                <div className="relative inline-block group">
                   <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gold flex items-center justify-center rounded-3xl shadow-2xl border-4 border-black group-hover:scale-105 transition-all relative overflow-hidden">
                      <img 
                        src="/fives_logo.png" 
                        alt="FIVES LOGO" 
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          // Fallback to elephant if logo fails to load
                          (e.target as HTMLImageElement).style.display = 'none';
                          const parent = (e.target as HTMLElement).parentElement;
                          if (parent) {
                            const span = document.createElement('span');
                            span.innerText = '🐘';
                            span.style.fontSize = '3rem';
                            parent.appendChild(span);
                          }
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent pointer-events-none" />
                   </div>
                   <div className="absolute -bottom-2 -right-2 w-8 h-8 sm:w-10 sm:h-10 bg-brand-red rounded-full border-2 border-black flex items-center justify-center font-black text-white text-sm sm:text-base shadow-xl">5</div>
                   <div className="absolute inset-0 bg-gold/30 blur-2xl rounded-full -z-10 group-hover:bg-gold/50 transition-colors" />
                </div>
              </div>

              <h2 className="text-5xl sm:text-7xl font-black italic tracking-tightest mb-0 uppercase text-gold embossed">
              </h2>
              
              <p className="text-[12px] sm:text-[14px] font-black tracking-[0.2em] text-gold uppercase embossed opacity-80">
                WINNER SCORES THE LEAST
              </p>

              {setupMode === 'main' && (
                <p className="text-[10px] font-black text-gold/40 uppercase tracking-[0.4em] mb-0 embossed">
                  CHOOSE MODE
                </p>
              )}
              
              {setupMode === 'main' ? (
                <div className="space-y-6 animate-in fade-in zoom-in-95 duration-1000 text-left">
                  <div className="p-6 bg-black/20 rounded-[32px] border-black border-2 text-left transition-all shadow-xl mb-2">
                    <div className="flex items-center gap-3 text-gold/30 mb-3">
                      <User className="w-4 h-4" />
                      <span className="text-[9px] font-black uppercase tracking-[0.4em]">NAME</span>
                    </div>
                      <input 
                        placeholder="ENTER NAME" 
                        maxLength={12} 
                        value={playerName} 
                        onChange={e => setPlayerName(e.target.value.toUpperCase())} 
                        className="w-full bg-transparent border-none px-2 py-2 font-black uppercase text-center text-gold text-3xl tracking-[0.4em] outline-none" 
                      />
                  </div>

                  <div className="p-4 bg-black/30 rounded-[48px] border-black border-2 grid grid-cols-3 gap-2 shadow-2xl px-4 py-8">
                    <button 
                      onClick={() => { 
                        if (!hasVisited) {
                          addEffect('wrong', 'START WITH TUTORIAL FIRST');
                          return;
                        }
                        sounds.playClick();
                        sounds.unlockAudio(); 
                        setSetupMode('solo'); 
                      }} 
                      className={cn(
                        "py-10 rounded-[32px] font-black text-[9px] uppercase transition-all bg-transparent flex flex-col items-center gap-4 group relative overflow-hidden",
                        hasVisited ? "text-gold hover:text-gold/80 cursor-pointer" : "text-gold/20 opacity-40 cursor-not-allowed grayscale"
                      )}
                    >
                      <User className={cn("w-7 h-7 transition-all group-hover:scale-110", hasVisited ? "text-gold/60" : "text-gold/20")} />
                      <span className="embossed text-center leading-tight">Single<br/>Player</span>
                    </button>
                    <button 
                      onClick={() => { 
                        if (!hasVisited) {
                          addEffect('wrong', 'START WITH TUTORIAL FIRST');
                          return;
                        }
                        sounds.playClick();
                        sounds.unlockAudio(); 
                        setSetupMode('multiplayer');
                      }} 
                      className={cn(
                        "py-10 rounded-[32px] font-black text-[9px] uppercase transition-all bg-transparent flex flex-col items-center gap-4 group relative overflow-hidden",
                        hasVisited ? "text-gold hover:text-gold/80 cursor-pointer" : "text-gold/20 opacity-40 cursor-not-allowed grayscale"
                      )}
                    >
                      <Users className={cn("w-7 h-7 transition-all group-hover:scale-110", hasVisited ? "text-gold/60" : "text-gold/20")} />
                      <span className="embossed text-center leading-tight">Multiplayer</span>
                    </button>
                    <button 
                      onClick={() => { 
                        sounds.playClick(); 
                        setShowTutorialSelect(true);
                      }} 
                      className="py-10 rounded-[32px] font-black text-[9px] uppercase transition-all bg-transparent flex flex-col items-center gap-4 group relative overflow-hidden text-gold hover:text-gold/80"
                    >
                      <Info className="w-7 h-7 text-gold/60 transition-all group-hover:scale-110" />
                      <span className="embossed text-center leading-tight">Tutorial</span>
                    </button>
                  </div>
                </div>
              ) : (setupMode === 'solo' || setupMode === 'multiplayer_settings') ? (
                <div className="space-y-8 animate-in slide-in-from-bottom-8 duration-700 text-left">
                  <button 
                    onClick={() => setSetupMode(setupMode === 'solo' ? 'main' : 'multiplayer')}
                    className="p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/15 transition-all text-white group flex items-center gap-2 mb-2"
                  >
                    <ArrowLeft className="w-5 h-5" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Back</span>
                  </button>

                  <div className="p-10 bg-black/30 rounded-[48px] border-black border-2 focus-within:border-gold/50 transition-all shadow-3xl mb-8 group ring-1 ring-white/5">
                      <div className="flex items-center gap-4 text-gold/30 mb-5 group-focus-within:text-gold transition-colors">
                        <User className="w-5 h-5 text-gold" />
                        <span className="text-[11px] font-black uppercase tracking-[0.5em] text-gold">PLAYER NAME</span>
                      </div>
                      <input 
                        placeholder="ENTER NAME" 
                        maxLength={12} 
                        value={playerName} 
                        onChange={e => {
                          const val = e.target.value.toUpperCase();
                          setPlayerName(val);
                          setGameState(prev => ({
                            ...prev,
                            players: prev.players.map((p, i) => i === 0 ? { ...p, name: val } : p)
                          }));
                        }} 
                        className="w-full bg-brand-maroon/20 border-black border rounded-3xl px-8 py-6 font-black uppercase text-center text-gold text-2xl tracking-[0.4em] outline-none focus:ring-4 focus:ring-gold/20 transition-all placeholder:text-white/5 shadow-inner" 
                      />
                  </div>

                  {setupMode === 'multiplayer_settings' && (
                    <div className="p-10 bg-black/30 rounded-[48px] border-black border-2 focus-within:border-gold/50 transition-all shadow-3xl group ring-1 ring-white/5">
                      <div className="flex items-center gap-4 text-gold/30 mb-5 group-focus-within:text-gold transition-colors">
                        <Shield className="w-5 h-5" />
                        <span className="text-[11px] font-black uppercase tracking-[0.5em]">ROOM NAME</span>
                      </div>
                      <input 
                        placeholder="GAME ROOM" 
                        maxLength={15}
                        value={roomName} 
                        onChange={e => setRoomName(e.target.value.toUpperCase())} 
                        className="w-full bg-brand-maroon/20 border-black border rounded-3xl px-8 py-6 font-black uppercase text-center text-gold text-2xl tracking-[0.4em] outline-none focus:ring-4 focus:ring-gold/10 transition-all placeholder:text-white/5" 
                      />
                    </div>
                  )}
                  
                  <div className="p-10 bg-black/30 rounded-[48px] border-black border-2 hover:border-gold/20 transition-all shadow-3xl ring-1 ring-white/5">
                     <div className="flex justify-between items-center mb-8 px-2">
                        <div className="flex items-center gap-4 text-gold/40">
                          <Users className="w-6 h-6 text-gold" />
                          <span className="text-[12px] font-black uppercase tracking-[0.5em] embossed">Total Players</span>
                        </div>
                        <span className="text-gold font-extrabold text-5xl tabular-nums shadow-[0_0_20px_var(--color-gold)] embossed">{gameState.numPlayers}</span>
                     </div>
                     <div className="grid grid-cols-4 gap-4">
                        {[2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                              <button 
                                key={`num-players-${n}`} 
                             onClick={() => { 
                                  sounds.playClick(); 
                                  setGameState(p => ({ ...p, numPlayers: n }));
                                  if (isMultiplayer && roomId) {
                                    updateRoomSettings({ numPlayers: n });
                                  }
                                }} 
                                className={cn("aspect-square rounded-2xl flex items-center justify-center font-black text-lg transition-all border-black border-2 shadow-lg embossed-box", gameState.numPlayers === n ? "bg-gold text-brand-maroon border-gold-light scale-110 shadow-black" : "bg-white/5 text-gold/20 hover:bg-gold/10 hover:text-gold/40")}
                              >
                                {n}
                              </button>
                        ))}
                     </div>
                  </div>

                  <div className="p-10 bg-black/30 rounded-[48px] border-black border-2 hover:border-gold/20 transition-all shadow-3xl ring-1 ring-white/5">
                     <div className="flex justify-between items-center mb-8 px-2">
                        <div className="flex items-center gap-4 text-gold/40">
                          <Zap className="w-6 h-6 text-gold" />
                          <span className="text-[12px] font-black uppercase tracking-[0.5em] embossed">Number of Rounds</span>
                        </div>
                        <span className="text-gold font-extrabold text-5xl tabular-nums shadow-[0_0_20px_var(--color-gold)] embossed">{gameState.maxRounds}</span>
                     </div>
                     <div className="grid grid-cols-4 gap-4">
                        {[2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                              <button 
                                key={`max-rounds-${n}`} 
                                onClick={() => { 
                                  sounds.playClick(); 
                                  setGameState(p => ({ ...p, maxRounds: n })); 
                                }} 
                                className={cn(
                                  "py-4 rounded-xl font-black text-sm transition-all border-black border-2 shadow-lg uppercase", 
                                  gameState.maxRounds === n ? "bg-gold text-brand-maroon border-gold-light" : "bg-white/5 text-gold/20 hover:bg-gold/10"
                                )}
                              >
                                {n}
                              </button>
                        ))}
                     </div>
                  </div>

                  <div className="p-10 bg-black/30 rounded-[48px] border-black border-2 hover:border-gold/20 transition-all shadow-3xl ring-1 ring-white/5">
                     <div className="flex justify-between items-center mb-8 px-2">
                        <div className="flex items-center gap-4 text-gold/40">
                          <Gamepad2 className="w-6 h-6 text-gold" />
                          <span className="text-[12px] font-black uppercase tracking-[0.5em] embossed">Number of Games</span>
                        </div>
                        <span className="text-gold font-extrabold text-5xl tabular-nums shadow-[0_0_20px_var(--color-gold)] embossed">{gameState.maxGames}</span>
                     </div>
                     <div className="grid grid-cols-5 gap-3">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                              <button 
                                key={`num-games-${n}`} 
                                onClick={() => { 
                                  sounds.playClick(); 
                                  setGameState(p => ({ ...p, maxGames: n }));
                                }} 
                                className={cn(
                                  "py-3 rounded-xl font-black text-xs transition-all border-black border-2 shadow-md uppercase", 
                                  gameState.maxGames === n ? "bg-gold text-brand-maroon border-gold-light" : "bg-white/5 text-gold/20 hover:bg-gold/10"
                                )}
                              >
                                {n}
                              </button>
                        ))}
                     </div>
                  </div>

                  {setupMode === 'solo' && (
                    <button 
                      onClick={() => { sounds.playClick(); initGame(gameState.numPlayers, gameState.maxGames); }} 
                      className="w-full py-12 bg-gold text-brand-maroon font-black uppercase text-2xl rounded-[48px] shadow-[0_35px_80px_black] hover:bg-gold-light hover:-translate-y-1 active:translate-y-0.5 active:scale-[0.98] transition-all mt-10 border-t-2 border-gold-light/40 embossed"
                    >
                      START GAME
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-6 animate-in fade-in duration-700 text-left flex flex-col h-full max-h-[100%] overflow-y-auto no-scrollbar">
                   <div className="p-10 bg-gold/5 rounded-[48px] border border-black text-center shadow-inner group backdrop-blur-md mb-4">
                      <Users className="w-12 h-12 mx-auto mb-5 text-gold" />
                      <h3 className="text-2xl font-black uppercase italic mb-2 text-gold embossed">Multiplayer Lobby</h3>
                      <div className="w-full h-px bg-gold/10 mb-8" />
                      
                      <button 
                        onClick={() => { sounds.playClick(); setSetupMode('multiplayer_settings'); }} 
                        className="w-full py-8 bg-brand-red text-white font-black uppercase rounded-3xl shadow-2xl hover:scale-[1.02] active:scale-95 transition-all text-sm tracking-widest border-2 border-black mb-4 flex items-center justify-center gap-3 group"
                      >
                        <SquarePlus className="w-5 h-5 group-hover:rotate-90 transition-transform" />
                        CREATE NEW LOBBY
                      </button>
                      
                      <div className="flex items-center gap-4 my-6">
                        <div className="flex-1 h-px bg-gold/10" />
                        <span className="text-[9px] font-black text-gold/20 uppercase tracking-[0.4em]">OR JOIN EXISTING</span>
                        <div className="flex-1 h-px bg-gold/10" />
                      </div>
                      
                      <input 
                        placeholder="INVITE CODE" 
                        maxLength={4} 
                        value={roomId} 
                        onChange={e => setRoomId(e.target.value.toUpperCase())} 
                        className="w-full bg-black/20 border-black border rounded-3xl px-8 py-5 font-black uppercase text-center text-gold text-2xl tracking-[0.4em] outline-none focus:ring-4 focus:ring-gold/10 transition-all placeholder:text-white/5" 
                      />
                   </div>
                </div>
              )}
            </div>
          </div>

          <div className="pt-2 mt-auto">
            {setupMode === 'main' ? (
              <p className="text-[12px] font-black uppercase tracking-[0.4em] italic block embossed">
                LOWEST SCORE WINS THE MATCH
              </p>
            ) : setupMode === 'solo' ? (
                      <button onClick={() => { sounds.playClick(); handleBackToMenu(); }} className="px-14 py-6 bg-gold text-black rounded-full font-black uppercase text-[12px] tracking-[0.5em] shadow-2xl active:scale-95 border-2 border-black">
                 BACK TO MENU
               </button>
            ) : setupMode === 'multiplayer_settings' ? (
               <div className="flex gap-4">
                  <button onClick={() => { sounds.playClick(); setSetupMode('multiplayer'); }} className="px-12 py-8 bg-white/5 text-gold/30 rounded-[40px] border border-white/5 hover:bg-white/10 hover:text-gold transition-all shadow-xl active:scale-95">
                    <ChevronLeft className="w-8 h-8" />
                  </button>
                  <button 
                    disabled={!socketConnected}
                    onClick={createRoom} 
                    className={cn(
                      "flex-1 py-10 bg-gold text-brand-maroon font-black uppercase text-2xl rounded-[48px] shadow-[0_35px_100px_rgba(212,175,55,0.4)] hover:bg-gold-light hover:-translate-y-1 active:translate-y-0.5 transition-all relative overflow-hidden border-t-2 border-gold-light/30 embossed",
                      !socketConnected && "opacity-50 grayscale cursor-not-allowed"
                    )}
                  >
                    {socketConnected ? "CREATE PRIVATE ROOM" : "WAITING FOR SERVER..."}
                  </button>
               </div>
            ) : (
                <div className="space-y-8 animate-in fade-in duration-700">
                   {/* Name entry when joining multiplayer via link */}
                   <div className="p-10 bg-black/30 rounded-[48px] border-black border-2 text-left focus-within:border-gold/50 transition-all shadow-3xl group ring-1 ring-white/5 mb-2 relative overflow-hidden">
                     {roomId.length === 4 && (
                     <div className="absolute top-0 right-10 px-4 py-1 bg-gold text-brand-maroon text-[8px] font-black tracking-widest rounded-b-xl shadow-lg animate-bounce">
                         INVITE CODE: {roomId}
                       </div>
                     )}
                     <div className="flex items-center gap-4 text-gold/30 mb-5 group-focus-within:text-gold transition-colors">
                       <User className="w-5 h-5" />
                       <span className="text-[11px] font-black uppercase tracking-[0.6em]">{roomId.length === 4 ? "CONFIRM YOUR NAME" : "NAME"}</span>
                     </div>
                     <input 
                       placeholder="ENTER NAME" 
                       maxLength={12} 
                       value={playerName} 
                       onChange={e => {
                         setPlayerName(e.target.value.toUpperCase());
                         setHasEnteredName(false);
                       }} 
                       className="w-full bg-brand-maroon/20 border-black border rounded-3xl px-8 py-5 font-black uppercase text-center text-gold text-2xl tracking-[0.4em] outline-none focus:ring-8 focus:ring-gold/5 transition-all shadow-inner placeholder:text-white/5" 
                     />
                   </div>

                   {roomId.length === 4 ? (
                     <div className="space-y-4">
                       <button 
                         onClick={() => {
                            if (!playerName.trim()) {
                              addEffect('wrong', 'PLEASE ENTER NAME');
                              return;
                            }
                            sounds.playClick();
                            joinRoomAction(roomId);
                            // Clear URL for next launch
                            const url = new URL(window.location.href);
                            url.searchParams.delete('room');
                            window.history.replaceState({}, '', url.toString());
                         }} 
                         className="w-full py-10 bg-gold text-brand-maroon font-black uppercase text-2xl rounded-[48px] shadow-[0_35px_100px_rgba(212,175,55,0.4)] hover:bg-gold-light hover:scale-[1.05] active:scale-95 transition-all embossed"
                       >
                         JOIN LOBBY
                       </button>
                       <button 
                         onClick={() => {
                            setRoomId('');
                            // Clear URL
                            const url = new URL(window.location.href);
                            url.searchParams.delete('room');
                            window.history.replaceState({}, '', url.toString());
                         }}
                         className="w-full text-gold/30 font-black text-[10px] uppercase tracking-widest hover:text-gold transition-colors"
                       >
                         Enter a different code
                       </button>
                     </div>
                   ) : (
                     <div className="space-y-6">
                      <div className="grid grid-cols-3 gap-4 h-22">
                          <button 
                            disabled={!socketConnected}
                            onClick={() => { 
                              if (!playerName.trim()) {
                                addEffect('wrong', 'PLEASE ENTER NAME');
                                return;
                              }
                              sounds.playClick(); 
                              setSetupMode('multiplayer_settings'); 
                            }} 
                            className={cn(
                              "h-full bg-brand-red/10 text-gold/50 rounded-[32px] border border-black font-black uppercase text-[10px] tracking-widest transition-all flex flex-col items-center justify-center gap-2 shadow-xl group",
                              socketConnected ? "hover:bg-brand-red/20 cursor-pointer" : "opacity-30 cursor-not-allowed"
                            )}
                          >
                            <Shield className="w-5 h-5 text-gold group-hover:scale-110 transition-transform" />
                            Host
                          </button>
                          <button 
                            disabled={!socketConnected}
                            onClick={() => { 
                              sounds.playClick(); 
                              setSetupMode('available_rooms'); 
                              getAvailableRooms();
                            }} 
                            className={cn(
                              "h-full bg-brand-red/10 text-gold/50 rounded-[32px] border border-black font-black uppercase text-[10px] tracking-widest transition-all flex flex-col items-center justify-center gap-2 shadow-xl group",
                              socketConnected ? "hover:bg-brand-red/20 cursor-pointer" : "opacity-30 cursor-not-allowed"
                            )}
                          >
                            <Globe className="w-5 h-5 text-gold group-hover:scale-110 transition-transform" />
                            Find
                          </button>
                          <button 
                            onClick={() => { 
                              sounds.playClick(); 
                              setSetupMode('main'); 
                            }} 
                            className="h-full bg-brand-red/10 text-gold/50 rounded-[32px] border border-black font-black uppercase text-[10px] tracking-widest hover:bg-brand-red/20 transition-all flex flex-col items-center justify-center gap-2 shadow-xl group cursor-pointer"
                          >
                            <ChevronLeft className="w-5 h-5 text-gold group-hover:scale-110 transition-transform" />
                            Back
                          </button>
                      </div>
                      
    <div className="relative group">
      <div className={cn(
        "flex gap-4 p-4 bg-black/40 rounded-[54px] border border-black focus-within:border-gold/50 transition-all shadow-3xl backdrop-blur-3xl group-hover:bg-black/50",
        !socketConnected && "opacity-50 pointer-events-none"
      )}>
          <input 
            placeholder={socketConnected ? "CODE" : "OFFLINE"} 
            maxLength={4}
            value={roomId} 
            onChange={e => setRoomId(e.target.value.toUpperCase())} 
            disabled={!socketConnected}
            onKeyDown={e => {
              if (e.key === 'Enter' && roomId.length === 4) {
                joinRoomAction(roomId);
              }
            }}
            className="flex-1 bg-transparent px-8 py-4 font-black uppercase text-center text-gold text-3xl tracking-[0.4em] placeholder:text-gold/5 outline-none tabular-nums" 
          />
          <button 
            disabled={!roomId || roomId.length < 4 || !socketConnected}
            onClick={() => { 
              sounds.playClick();
              const cleanId = roomId.trim().toUpperCase();
              if (cleanId.length < 4) return;
              joinRoomAction(cleanId);
            }} 
            className={cn("px-10 py-6 font-black rounded-[40px] transition-all text-xs uppercase shadow-2xl embossed", 
                        (!roomId || roomId.length < 4 || !socketConnected) ? "bg-white/5 text-white/5 cursor-not-allowed" : "bg-gold text-brand-maroon hover:bg-gold-light hover:scale-105 active:scale-95"
            )}
          >
            JOIN
          </button>
      </div>
      {!socketConnected && (
                 <p className="text-[10px] text-brand-gold font-black uppercase tracking-widest mt-4">Connecting to server... Please wait.</p>
      )}
    </div>
                    </div>
                   )}
                </div>
            )}
            {/* Duplicate message removed */}
            <div className="mt-12 text-[8px] font-black text-gold/10 uppercase tracking-[0.4em]">
               © {new Date().getFullYear()} SURVIVAL • ALL RIGHTS RESERVED
            </div>
          </div>
       </div>
    </motion.div>
  );
};

  const renderTutorial = () => {
    const steps = [
      { 
        title: "HOW TO PLAY", 
        text: (
          <div className="space-y-4 text-left text-gold">
            <p className="text-xl sm:text-2xl font-bold leading-tight embossed">1. Select one or more cards of the same rank to discard before selecting from the deck pile or open card pile.</p>
            <p className="text-xl sm:text-2xl font-bold leading-tight embossed">2. A Wild Card (shown at start) and Jokers are 0 POINTS.</p>
            <p className="text-xl sm:text-2xl font-bold leading-tight embossed">3. Lowest score wins round.</p>
            <p className="text-xl sm:text-2xl font-bold leading-tight embossed">4. Winner of round gets 0 points.</p>
          </div>
        ),
        preview: (
          <div className="w-full aspect-video bg-brand-maroon premium-border rounded-3xl p-6 flex flex-col justify-center items-center shadow-inner">
             <div className="flex gap-4">
                <div className="w-10 h-14 bg-white rounded-lg border-2 border-black flex items-center justify-center text-black font-black">5</div>
                <div className="w-10 h-14 bg-white rounded-lg border-2 border-black flex items-center justify-center text-black font-black">5</div>
             </div>
             <div className="mt-4 text-[10px] font-black text-gold uppercase underline decoration-gold/50 underline-offset-4 embossed">MATCH & DISCARD</div>
          </div>
        )
      },
      { 
        title: "CARD VALUES", 
        text: "Aces = 1 POINT. Numbers (2-10) = Face value. J, Q, K = 10 POINTS. Joker (JK) and the Wild Card (drawn at start) = 0 POINTS!",
        preview: (
          <div className="w-full aspect-video bg-brand-maroon premium-border rounded-3xl p-4 flex justify-around items-center shadow-inner">
             <div className="flex flex-col items-center gap-1">
                <div className="w-10 h-14 bg-white rounded-lg flex items-center justify-center text-black font-black text-lg shadow-lg border-2 border-black">A</div>
                <span className="text-[8px] font-black text-gold embossed">1 POINT</span>
             </div>
             <div className="flex flex-col items-center gap-1">
                <div className="w-10 h-14 bg-white rounded-lg flex items-center justify-center text-red-600 font-black text-lg shadow-lg border-2 border-black">K</div>
                <span className="text-[8px] font-black text-gold embossed">10 POINTS</span>
             </div>
             <div className="flex flex-col items-center gap-1 scale-110">
                <div className="w-10 h-14 bg-gold rounded-lg flex items-center justify-center text-brand-maroon font-black text-lg shadow-lg border-2 border-black">★</div>
                <span className="text-[8px] font-black text-gold embossed">0 POINTS</span>
             </div>
          </div>
        )
      },
      { 
        title: "TURN FLOW", 
        text: "Each turn: 1. Discard one or more cards of the same rank. 2. Draw ONE card from the deck or the discard pile.",
        preview: (
          <div className="w-full aspect-video bg-brand-maroon premium-border rounded-3xl p-6 flex justify-center items-center gap-6 shadow-inner">
             <div className="flex flex-col items-center gap-2">
                <div className="w-14 h-20 bg-gold/10 border-2 border-dashed border-gold/30 rounded-xl flex items-center justify-center text-gold/30 text-[8px] font-black uppercase embossed">Discard</div>
                <span className="text-[8px] font-black text-gold/40 embossed">STEP 1</span>
             </div>
             <div className="flex flex-col items-center gap-2">
                     <div className="w-14 h-20 bg-brand-red border-2 border-brand-gold/20 rounded-xl shadow-xl flex items-center justify-center">
                   <div className="w-8 h-12 bg-white/5 rounded-md border border-brand-gold/10" />
                </div>
                <span className="text-[8px] font-black text-gold/40 embossed">STEP 2</span>
             </div>
          </div>
        )
      },
      { 
        title: "DECK IT!", 
        text: "From Round 5, you can 'Deck It' if you think you have the fewest points. Calling Deck starts a 5-second challenge phase.",
        preview: (
          <div className="w-full aspect-video bg-brand-maroon premium-border rounded-3xl p-6 flex flex-col justify-center items-center shadow-inner">
             <div className="px-6 py-2 bg-gold text-brand-maroon font-black rounded-full uppercase text-[10px] tracking-widest shadow-2xl mb-2 embossed no-theme">
                DECK IT!
             </div>
             <div className="flex gap-2">
                {[1,2,3,4,5].map(i => (
                  <div key={`tutorial-deck-tick-${i}`} className={cn("w-4 h-1 bg-gold", i > 3 && "opacity-20")} />
                ))}
             </div>
             <div className="mt-4 text-[8px] font-black text-gold/30 uppercase tracking-[0.2em] embossed">5 SECONDS TO CHALLENGE</div>
          </div>
        )
      },
      { 
        title: "WRONG DECK!", 
        text: "If someone calls 'Deck', and you have LOWER points, tap 'WRONG DECK'! The decker gets a 50 POINTS penalty, and YOU get 0 POINTS for the round. Others get their hand points.",
        preview: (
          <div className="w-full aspect-video bg-brand-maroon premium-border rounded-3xl p-6 flex flex-col justify-center items-center shadow-inner">
             <div className="px-6 py-2 bg-brand-red text-white border-2 border-gold font-black rounded-full uppercase text-[10px] tracking-widest shadow-2xl mb-4 animate-pulse embossed no-theme">
                WRONG DECK!
             </div>
             <div className="text-center">
                <p className="text-[10px] text-gold/50 font-black uppercase embossed">Decker: 3 POINTS</p>
                <p className="text-[10px] text-gold font-black uppercase italic embossed">You: 1 POINT (WINNER!)</p>
             </div>
          </div>
        )
      }
    ];

    const next = () => {
      sounds.playClick();
      if (currentStep < steps.length - 1) {
        setCurrentStep(s => s + 1);
      } else {
        finalizeTutorial();
      }
    };
    const prev = () => {
      sounds.playClick();
      if (currentStep > 0) {
        setCurrentStep(s => s - 1);
      }
    };
    const finalizeTutorial = () => {
      sounds.playClick();
      setHasVisited(true);
      localStorage.setItem('fives_has_visited', 'true');
      setShowTutorial(false);
    };

    return (
      <motion.div key="tutorial" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[300] bg-brand-maroon/95 backdrop-blur-3xl flex items-center justify-center p-6">
        <div className="max-w-xl w-full bg-brand-maroon/90 premium-border rounded-[60px] p-8 sm:p-12 text-center relative shadow-[0_0_100px_black] overflow-hidden">
           <div className="absolute top-0 left-0 w-full h-1 bg-white/5">
              <motion.div initial={{ width: 0 }} animate={{ width: `${((currentStep + 1) / steps.length) * 100}%` }} className="h-full bg-gold shadow-[0_0_10px_gold]" />
           </div>
           
           <div className="mb-10 mt-4 flex items-center justify-between">
              <div className="text-left">
                 <h2 className="text-4xl font-black italic text-gold uppercase leading-none embossed">Tutorial</h2>
                 <p className="text-[10px] font-black text-gold/50 uppercase tracking-[0.4em] mt-2 embossed">Step {currentStep + 1} of {steps.length}</p>
              </div>
              <button 
                onClick={() => {
                  sounds.playClick();
                  localStorage.setItem('fives_has_visited', 'true');
                  setHasVisited(true);
                  setShowTutorial(false);
                }} 
                className="p-4 bg-brand-maroon rounded-full text-gold/50 hover:text-gold transition-colors premium-border no-theme"
              >
                <X />
              </button>
           </div>
           
           <AnimatePresence mode="wait">
              <motion.div 
                key={currentStep}
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -20, opacity: 0 }}
                className="space-y-8"
              >
                 <div className="mb-8">
                    {steps[currentStep].preview}
                 </div>
                 <div className="text-left space-y-3">
                    <h4 className="text-gold font-black uppercase text-xs tracking-[0.3em] embossed">{steps[currentStep].title}</h4>
                    <div className="text-gold/80 text-sm leading-relaxed min-h-[60px] embossed">{steps[currentStep].text}</div>
                 </div>
              </motion.div>
           </AnimatePresence>
           
           <div className="flex gap-4 mt-10">
              {currentStep > 0 && (
                <button onClick={prev} className="flex-1 py-8 bg-brand-maroon text-gold font-black uppercase rounded-3xl text-sm border-2 border-brand-gold/30 shadow-xl no-theme">
                  <span className="embossed">BACK</span>
                </button>
              )}
              <button onClick={next} className="flex-[2] py-8 bg-brand-gold text-brand-red font-black uppercase rounded-3xl text-lg hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-gold/20 no-theme">
                 <span className="embossed">{currentStep === steps.length - 1 ? "LET'S PLAY!" : "CONTINUE"}</span>
              </button>
           </div>

           <button 
             onClick={finalizeTutorial}
             className="w-full mt-6 py-4 text-gold/40 hover:text-gold font-black uppercase text-[10px] tracking-widest transition-all no-theme"
           >
             <span className="embossed">Skip to Main Menu</span>
           </button>
        </div>
      </motion.div>
    );
  };



  const renderAvailableRoomsScreen = () => (
    <motion.div key="available_rooms" initial={{ x: '100%' }} animate={{ x: 0 }} className="fixed inset-0 z-[120] bg-brand-maroon flex flex-col p-6 safe-top safe-bottom">
       <div className="flex items-center justify-between mb-10 mt-4">
          <button onClick={() => { sounds.playClick(); setSetupMode('multiplayer'); }} className="p-4 bg-white/5 rounded-full text-gold"><ArrowLeft /></button>
          <h2 className="text-2xl font-black italic uppercase text-gold">Public Tables</h2>
          <div className="w-12 h-12" />
       </div>

       <div className="flex-1 space-y-4 overflow-y-auto custom-scrollbar pr-2">
          {availableRooms.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full opacity-30 gap-6">
               <Globe className="w-16 h-16 animate-pulse" />
               <p className="text-[10px] font-black uppercase tracking-[0.5em]">Scanning all frequencies...</p>
            </div>
          ) : (
            availableRooms.map((room, idx) => (
              <div key={`aroom-v4-${room.roomId || idx}-${idx}`} className="p-8 bg-gold/5 border border-black rounded-[40px] flex justify-between items-center group hover:bg-gold/10 transition-all">
                 <div className="text-left">
                    <h3 className="text-xl font-black text-gold group-hover:scale-105 transition-transform origin-left">{room.roomName}</h3>
                    <p className="text-[10px] font-black text-gold/30 uppercase tracking-widest mt-1">ID: {room.roomId}</p>
                 </div>
                 <div className="flex items-center gap-6">
                    <div className="text-right">
                       <span className="text-lg font-black text-gold">{room.playerCount} / {room.maxPlayers}</span>
                       <span className="block text-[8px] font-black text-gold/20 uppercase tracking-widest">PLAYERS</span>
                    </div>
                    <button 
                      onClick={() => {
                        sounds.playClick();
                        joinRoomAction(room.roomId);
                      }}
                     className="px-8 py-4 bg-gold text-brand-maroon font-black rounded-2xl uppercase text-[10px] tracking-widest shadow-lg hover:scale-110 active:scale-95 transition-all"
                    >
                      TAKE SEAT
                    </button>
                 </div>
              </div>
            ))
          )}
       </div>
    </motion.div>
  );

  const renderPlayerControls = () => {
    // If we don't have a 'me' object yet, show a synchronizing state instead of crashing
    if (!me) return (
      <div className="flex flex-col items-center justify-center gap-4 py-8 opacity-40">
        <div className="w-8 h-8 border-2 border-gold/20 border-t-gold rounded-full animate-spin" />
        <span className="text-[8px] font-black uppercase tracking-[0.3em] text-gold">Syncing Player Data...</span>
      </div>
    );
    
    // Explicit turn checking
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    const isMyTurn = isMultiplayer 
      ? (playerId !== '' && playerId === currentPlayer?.id) 
      : (gameState.currentPlayerIndex === 0);

    const handValue = calculateHandValue(me.hand, gameState.jokerRank);
    const canDeck = Math.floor(gameState.roundCount) >= 5 || handValue === 0;
    const isDecker = gameState.deckingPlayerId === me.id;

    return (
      <div className="w-full flex flex-col items-center gap-4 bg-brand-maroon/90 backdrop-blur-xl pt-4 pb-8 px-4 rounded-t-[48px] premium-border border-x-0 border-b-0 shadow-[0_-20px_60px_rgba(0,0,0,0.5)]">
         {/* Bottom Action Footer */}
         <div className="w-full max-w-lg mb-1">
            <div className="flex items-center justify-between p-3 sm:p-4 bg-brand-red/80 rounded-[24px] sm:rounded-[32px] premium-border shadow-inner">
               <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <div className={cn("w-1.5 h-1.5 rounded-full shadow-[0_0_8px_rgba(212,175,55,0.6)]", isMyTurn ? "bg-gold animate-pulse" : "bg-white/10")} />
                    <span className="text-[10px] sm:text-[12px] font-black text-white/60 uppercase tracking-widest embossed">{isMyTurn ? "YOUR TURN" : "WAITING..."}</span>
                  </div>
                  <span className="text-[9px] sm:text-[10px] font-black text-gold uppercase tracking-[0.2em] leading-tight mt-0.5 embossed">
                    {isMyTurn ? "MAKE YOUR MOVE" : `${currentPlayer?.name || 'PLAYER'}'S TURN`}
                  </span>
               </div>
               
          <div className="flex flex-col items-end">
             <div className="flex items-center gap-1.5 mb-1 px-3 py-1 bg-black/40 rounded-full border border-white/10 shadow-lg backdrop-blur-md">
                <span className="text-[10px] font-black text-gold/60 uppercase tracking-widest">SERIES</span>
                <span className="text-[10px] font-black text-gold uppercase tabular-nums">{gameState.gameCount}/{gameState.maxGames}</span>
                <span className="text-[10px] font-black text-white/20 mx-0.5">|</span>
                <span className="text-[10px] font-black text-gold/60 uppercase tracking-widest">ROUND</span>
                <span className="text-[10px] font-black text-gold uppercase tabular-nums">{gameState.roundCount}</span>
             </div>
             <div className="flex items-center gap-2">
               {handValue === 0 && <Zap className="w-3 h-3 text-gold fill-gold animate-bounce" />}
               <span className="text-2xl sm:text-3xl font-black italic tracking-tighter text-gold leading-none embossed">{handValue} POINTS</span>
             </div>
          </div>
            </div>
         </div>

         {/* Dramatic Combo Effect Overlay */}
         <AnimatePresence>
            {showComboEffect && (
              <motion.div 
                initial={{ scale: 0, opacity: 0, y: 50, rotate: -10 }}
                animate={{ scale: 1.5, opacity: 1, y: -20, rotate: 0 }}
                exit={{ scale: 2, opacity: 0, y: -100 }}
                className="fixed inset-0 flex items-center justify-center z-[200] pointer-events-none"
              >
                <div className="relative">
                  <motion.div 
                    animate={{ scale: [1, 1.2, 1] }} 
                    transition={{ repeat: Infinity, duration: 0.5 }}
                    className="text-7xl sm:text-9xl font-black italic tracking-tighter text-gold embossed-heavy drop-shadow-[0_20px_40px_rgba(0,0,0,0.8)]"
                  >
                    {showComboEffect.type}!
                  </motion.div>
                  <div className="absolute -top-10 -right-10 px-4 py-1 bg-brand-red text-white text-xl font-black rounded-lg transform rotate-12 shadow-2xl border-2 border-black">
                    -{showComboEffect.count} CARDS
                  </div>
                </div>
              </motion.div>
            )}
         </AnimatePresence>

         {/* Hand Display */}
         <div className="relative flex items-end justify-center gap-2 sm:gap-3 h-32 sm:h-40 md:h-48 pb-4 w-full overflow-x-auto no-scrollbar px-6 sm:px-10">
            <LayoutGroup>
              {me.hand.map((card, cIdx) => (
                <motion.div
                  key={`card-wrapper-${card.id}`}
                  layoutId={card.id}
                  initial={{ y: 50, opacity: 0 }}
                  animate={{ 
                    y: selectedCards.includes(card.id) ? -35 : 0,
                    opacity: 1,
                    scale: selectedCards.includes(card.id) ? 1.05 : 1,
                  }}
                  className="relative group shrink-0"
                  style={{ zIndex: selectedCards.includes(card.id) ? 100 : cIdx }}
                >
                  <Card 
                    key={`hand-c-${card.id}-${cIdx}`} 
                    card={card} 
                    isSelected={selectedCards.includes(card.id)} 
                    isJoker={card.rank === gameState.jokerRank} 
                      onClick={() => {
                        sounds.playClick();
                        const c = me.hand[cIdx];
                        const isSpecial = c.rank === 'JK' || c.rank === gameState.jokerRank;
                        if (isSpecial && !selectedCards.includes(c.id)) {
                           addEffect('info', 'Joker card selected');
                           Haptics.notification({ type: NotificationType.Warning }).catch(() => {});
                        }
                        setSelectedCards(prev => prev.includes(c.id) ? prev.filter(i => i !== c.id) : [...prev, c.id]);
                        Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
                      }} 
                    className="scale-[0.5] sm:scale-[0.7] md:scale-[0.8] origin-bottom shadow-none transition-none" 
                  />
                  {isTutorial && selectedCards.length === 0 && cIdx === 0 && (
                    <motion.div animate={{ y: [-10, 0, -10] }} transition={{ repeat: Infinity, duration: 1 }} className="absolute -top-12 left-1/2 -translate-x-1/2">
                       <Star className="text-gold w-8 h-8 fill-gold animate-pulse" />
                    </motion.div>
                  )}
                </motion.div>
              ))}
            </LayoutGroup>
         </div>

         {/* Persistent Action Buttons */}
         <div className="flex gap-4 w-full max-w-lg px-4">
            {gameState.status === 'deck_challenge' ? (
              <button 
                onClick={(e) => { e.preventDefault(); handleWrongDeck(); }} 
                disabled={calculateHandValue(me.hand, gameState.jokerRank) >= (gameState.deckingValue || 0) || me.id === gameState.deckingPlayerId}
                className={cn(
                 "flex-1 h-12 rounded-[24px] bg-brand-maroon text-white font-extrabold uppercase text-[10px] transition-all shadow-xl active:scale-95 border-2 border-brand-red animate-pulse break-words px-2",
                 (calculateHandValue(me.hand, gameState.jokerRank) >= (gameState.deckingValue || 0) || me.id === gameState.deckingPlayerId) ? "opacity-20 grayscale cursor-not-allowed" : "hover:scale-[1.05] cursor-pointer bg-brand-red"
                )}
              >
                WRONG DECK!
              </button>
            ) : (
              <>
                <button 
                  onClick={(e) => { e.preventDefault(); discardCards(); }} 
                  disabled={!isMyTurn || selectedCards.length === 0 || hasDiscardedThisTurn}
                  className={cn(
                    "flex-1 h-16 sm:h-20 rounded-[28px] sm:rounded-[40px] font-black uppercase text-lg tracking-widest transition-all shadow-xl active:scale-95 border-b-[6px] no-theme",
                     (!isMyTurn || selectedCards.length === 0 || hasDiscardedThisTurn) 
                       ? "bg-black/40 text-brand-gold/10 border-black grayscale scale-[0.98]" 
                       : "bg-brand-gold text-brand-red border-amber-500 hover:bg-brand-gold/90"
                  )}
                >
                  <span className="embossed">Discard</span>
                </button>
                <button 
                  onClick={(e) => { e.preventDefault(); handleDeckIt(); }} 
                  disabled={!isMyTurn || hasDiscardedThisTurn} 
                  className={cn(
                    "flex-1 h-16 sm:h-20 rounded-[28px] sm:rounded-[40px] font-black uppercase text-lg tracking-widest transition-all shadow-xl active:scale-95 border-b-[6px] no-theme",
                    (!isMyTurn || hasDiscardedThisTurn) 
                      ? "bg-black/40 text-brand-gold/10 border-black grayscale scale-[0.98]" 
                      : "bg-brand-red text-brand-gold border-brand-gold/40 hover:brightness-125 animate-pulse"
                  )}
                >
                  <span className="embossed">Deck It!</span>
                </button>
              </>
            )}
         </div>
      </div>
    );
  };

  return (
    <div className={cn("fixed inset-0 font-sans overflow-x-hidden overflow-y-auto bg-brand-maroon text-cream select-none")}>
      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .safe-top { padding-top: env(safe-area-inset-top); }
        .safe-bottom { padding-bottom: env(safe-area-inset-bottom); }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(0,0,0,0.1); }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(212,175,55,0.3); border-radius: 10px; }
      `}</style>
      {/* Immersive Background System */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
         <div className="absolute top-[-30%] left-[-20%] w-[100%] h-[100%] bg-gold/5 blur-[200px] rounded-full animate-pulse opacity-40" />
         <div className="absolute bottom-[-30%] right-[-20%] w-[90%] h-[90%] bg-brand-red/5 blur-[200px] rounded-full animate-pulse opacity-40" style={{ animationDelay: '3s' }} />
         <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.05] mix-blend-overlay" />
      </div>

      <div className="relative z-10 flex flex-col min-h-full safe-top safe-bottom p-2 sm:p-4 md:p-6">
        <Header 
          players={gameState.players} 
          onSettings={() => setShowSettings(true)} 
          isMultiplayer={isMultiplayer} 
          socketConnected={socketConnected}
          onBack={handleBackToMenu}
          currentRound={Math.floor(gameState.roundCount)}
          currentGame={gameState.gameCount}
          maxGames={gameState.maxGames}
        />
        
        {renderTutorialGuidance()}
        
        {/* Global Game Effects (Top of Screen) */}
        <div className="fixed top-[15%] inset-x-0 pointer-events-none flex flex-col items-center gap-2 z-[200]">
           <AnimatePresence mode="popLayout">
              {effects.map(eff => (
                 <motion.div 
                   key={`geff-${eff.id}`} 
                   initial={{ y: -50, opacity: 0 }} 
                   animate={{ y: 0, opacity: 1 }} 
                   exit={{ y: -20, opacity: 0, filter: 'blur(10px)' }} 
                   className="px-6 py-3 rounded-[20px] bg-gold text-brand-maroon font-black text-lg sm:text-xl uppercase italic border-2 border-black shadow-[0_10px_40px_rgba(0,0,0,0.5)] whitespace-normal break-words leading-none text-center max-w-sm"
                 >
                    {eff.text}
                 </motion.div>
              ))}
           </AnimatePresence>
        </div>
        <main className="flex-1 flex flex-col w-full relative overflow-y-auto custom-scrollbar min-h-0">
          {gameState.status === 'playing' ? (
            <>
          {/* Opponents Section - Responsive Height */}
          <div className="flex-none sm:flex-[0.6] flex flex-col justify-center items-center w-full min-h-[120px] sm:min-h-[140px] border-b border-white/5 bg-black/5">
            <div className="w-full flex justify-center gap-4 sm:gap-8 overflow-x-auto py-3 px-6 no-scrollbar shrink-0">
                {gameState.players.map((p, idx) => {
                  const isMe = isMultiplayer ? (p.id === playerId) : idx === 0;
                  if (isMe) return null;
                  return (
                    <motion.div 
                      key={`opp-player-${p.id || 'cpu'}-${idx}`} 
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex flex-col items-center gap-1 shrink-0"
                    >
                      <div className={cn(
                        "px-4 py-1 rounded-full border text-[8px] sm:text-[9px] font-black uppercase tracking-widest transition-all duration-500", 
                        gameState.currentPlayerIndex === idx ? "bg-gold text-brand-maroon border-gold ring-4 ring-gold/20" : "bg-black/20 text-gold/20 border-white/5"
                      )}>
                        {p.name}
                      </div>
                      <div className="flex -space-x-14 sm:-space-x-16">
                        {p.hand.map((c, cIdx) => (
                          <Card 
                            key={`opp-card-${p.id || idx}-${c.id || cIdx}-${cIdx}`} 
                            card={c} 
                            isFaceUp={false} 
                            className="scale-[0.45] sm:scale-[0.55] shadow-lg" 
                          />
                        ))}
                      </div>
                    </motion.div>
                  );
                })}
            </div>
          </div>
 
          {/* Table & Player Section - Proportional Layout */}
          <div className="flex-none sm:flex-[3] flex flex-col justify-between items-center w-full min-h-[380px] sm:min-h-[500px] pt-4 pb-4 sm:pb-6 overflow-hidden">
            {/* Gameplay Center (Deck, Pile, Wild Card) */}
            <div className="flex-grow flex flex-col items-center justify-center w-full gap-8 sm:gap-12">
                {/* Table Area - Responsive Scaling */}
              <div className="flex flex-col md:flex-row items-center justify-center gap-8 sm:gap-14 md:gap-20 relative scale-[0.75] sm:scale-[0.95] md:scale-110">
                
                {/* Wild Card indicator */}
                <div className="flex flex-col items-center gap-3">
                    <span className="text-[14px] sm:text-[16px] font-black text-gold/60 uppercase tracking-[0.4em] embossed">WILD CARD</span>
                    <div className="relative">
                      {gameState.jokerCard ? (
                        <Card card={gameState.jokerCard} isJoker className="scale-[0.7] sm:scale-[0.9] border-gold/40 shadow-xl" />
                      ) : (
                        <div className="w-14 h-20 bg-black/30 rounded-xl border border-black shadow-inner" />
                      )}
                      <div className="absolute inset-0 bg-gold/10 blur-xl rounded-full opacity-30" />
                    </div>
                </div>

                {/* Main Action Hub */}
                <div className="flex items-center gap-6 sm:gap-14 px-10 py-10 bg-white/[0.03] rounded-[40px] border border-black backdrop-blur-3xl relative shadow-[0_40px_80px_black]">
                   
                     {/* Discard Pile (Open Pile) */}
                    <div className="flex flex-col items-center relative">
                       <span className="absolute -top-8 left-1/2 -translate-x-1/2 text-[12px] sm:text-[14px] font-black text-brand-gold uppercase tracking-[0.2em] embossed whitespace-nowrap">OPEN PILE</span>
                       <div className="relative group">
                         {/* Stacked visualization: Bottom is new discard, Top is available card */}
                         {hasDiscardedThisTurn && justDiscardedCard && (
                            <div className="absolute top-2 left-2 rotate-6 opacity-40">
                               <Card 
                                 card={justDiscardedCard} 
                                 className="scale-[0.8] sm:scale-[0.9] grayscale" 
                               />
                            </div>
                         )}
                         {(hasDiscardedThisTurn ? gameState.availableCardAtTurnStart : gameState.openCard) ? (
                           <Card 
                             card={(hasDiscardedThisTurn ? (gameState.availableCardAtTurnStart || gameState.openCard) : gameState.openCard)!} 
                             onClick={drawFromDiscard} 
                             className={cn(
                               "shadow-2xl transition-all active:scale-95 z-20 scale-[0.9] sm:scale-[1.1]", 
                               hasDiscardedThisTurn && "ring-4 ring-brand-gold/60 scale-[1.05] sm:scale-[1.25] shadow-gold/40"
                             )} 
                           />
                         ) : (
                           <div className="w-14 h-20 border-2 border-dashed border-brand-gold/30 rounded-xl flex items-center justify-center text-[7px] font-black text-white/5 uppercase tracking-widest italic bg-black/40 scale-[0.9] sm:scale-110">EMPTY</div>
                         )}
                         {gameState.discardPile.length > 1 && (
                           <>
                             <div className="absolute -top-1 -left-1 w-full h-full bg-white/5 -z-10 rounded-2xl rotate-2" />
                             <div className="absolute -bottom-1 -right-1 w-full h-full bg-white/5 -z-20 rounded-2xl -rotate-1" />
                           </>
                         )}
                       </div>
                    </div>
                   
                   {/* Vertical Divider */}
                   <div className="w-[1px] h-24 bg-black/20" />

                   {/* Reserve Deck */}
                   <div className="flex flex-col items-center relative">
                     <span className="absolute -top-8 left-1/2 -translate-x-1/2 text-[12px] sm:text-[14px] font-black text-gold uppercase tracking-[0.2em] embossed whitespace-nowrap">DECK</span>
                     <div className="relative group">
                       <Card 
                         card={gameState.deck[0] || { id: 'd', suit: 'hearts', rank: 'A' }} 
                         isFaceUp={false} 
                         onClick={drawFromDeck} 
                         disabled={hasDrawnThisTurn || !hasDiscardedThisTurn}
                         className={cn(
                           "relative z-10 shadow-[0_15px_40px_rgba(0,0,0,0.8)] transition-all border-white/10 active:scale-95 scale-[0.9] sm:scale-[1.1]", 
                           (!hasDiscardedThisTurn && gameState.currentPlayerIndex === (isMultiplayer ? playersInRoom.findIndex(p => p.id === playerId) : 0)) && "ring-4 ring-gold/60 opacity-100 shadow-gold/20"
                         )} 
                       />
                       <div className="absolute top-0.5 left-0.5 w-full h-full bg-zinc-800 -z-10 rounded-xl" />
                       <div className="absolute top-1 left-1 w-full h-full bg-zinc-900 -z-20 rounded-xl" />
                     </div>
                     <div className="px-3 py-1 bg-white/5 rounded-full border border-black shadow-lg mt-4">
                        <div className="text-[10px] sm:text-[11px] font-black text-gold/60 uppercase tracking-widest leading-none embossed"> {gameState.deck.length} REMAINING</div>
                     </div>
                   </div>
                </div>
              </div>
            </div>
            
            {/* Player Hand & Controls - Bottom Section */}
            <div className="mt-auto w-full shrink-0">
               {renderPlayerControls()}
            </div>
          </div>
          </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
               {renderSetupScreen()}
            </div>
          )}
        </main>
      </div>
        <AnimatePresence>
          {isInitializing && (
            <motion.div key="initializing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[1000] bg-brand-maroon flex flex-col items-center justify-center gap-6 text-center">
              <motion.div 
                animate={{ rotate: 360 }} 
                transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                className="w-20 h-20 border-8 border-brand-gold/20 border-t-brand-gold rounded-full shadow-[0_0_40px_rgba(255,215,0,0.2)]"
              />
              <div className="flex flex-col items-center gap-4">
                <span className="text-2xl font-black uppercase tracking-[0.8em] text-gold animate-pulse">Survival</span>
                <span className="text-xs font-black uppercase tracking-[0.3em] text-gold/30">Loading Arena...</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        {showTutorial && renderTutorial()}
        <AnimatePresence mode="wait">
          {showRules && (
            <motion.div key="basic-rules" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[700] bg-brand-maroon/98 backdrop-blur-3xl flex items-center justify-center p-6 text-center">
              <div className="max-w-2xl w-full bg-brand-maroon border-4 border-gold rounded-[60px] p-8 sm:p-12 overflow-y-auto max-h-[90vh] custom-scrollbar shadow-[0_0_150px_black] relative">
                 <div className="flex justify-between items-center mb-8 relative z-10">
                    <div className="text-left">
                       <h2 className="text-4xl font-black italic text-gold uppercase tracking-tighter leading-none embossed-gold">BASIC RULES</h2>
                       <p className="text-[10px] text-gold/40 font-black uppercase tracking-widest mt-2">Objective & Scoring</p>
                    </div>
                    <button onClick={() => setShowRules(false)} className="p-4 bg-white/5 rounded-full text-gold/40 hover:text-gold transition-colors"><X /></button>
                 </div>
                 <div className="space-y-8 text-left relative z-10">
                    <section className="p-6 bg-black/20 rounded-[32px] border border-white/5 space-y-3">
                       <h3 className="text-gold font-black uppercase text-xs tracking-[0.3em]">The Objective</h3>
                       <p className="text-cream text-xl font-bold leading-snug">The goal is to have the fewest points. Cumulative scores are tracked across rounds; total lowest survivor wins.</p>
                    </section>
                    <section className="p-6 bg-black/20 rounded-[32px] border border-white/5 space-y-3">
                       <h3 className="text-gold font-black uppercase text-xs tracking-[0.3em]">Card Values</h3>
                       <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                             <div className="flex justify-between text-base font-bold"><span className="text-gold">Jokers / Wild:</span> <span className="text-cream">0 PTS</span></div>
                             <div className="flex justify-between text-base font-bold"><span className="text-gold">Aces:</span> <span className="text-cream">1 PT</span></div>
                          </div>
                          <div className="space-y-2">
                             <div className="flex justify-between text-base font-bold"><span className="text-gold">2 - 10:</span> <span className="text-cream">Face Val</span></div>
                             <div className="flex justify-between text-base font-bold"><span className="text-gold">J, Q, K:</span> <span className="text-cream">10 PTS</span></div>
                          </div>
                       </div>
                    </section>
                    <section className="p-6 bg-black/20 rounded-[32px] border border-white/5 space-y-3">
                       <h3 className="text-gold font-black uppercase text-xs tracking-[0.3em]">Turn Actions</h3>
                       <p className="text-cream text-xl font-bold leading-tight">1. Discard one or more matching cards.</p>
                        <p className="text-cream text-xl font-bold leading-tight">2. Draw ONE card from Deck or Open pile.</p>
                    </section>
                    <section className="p-6 bg-black/20 rounded-[32px] border border-white/5 space-y-3">
                       <h3 className="text-gold font-black uppercase text-xs tracking-[0.3em]">Decking It</h3>
                                               <div className="space-y-3">
                          <p className="text-cream text-xl font-bold leading-tight">From Round 5, call "DECK" if you think you have least points.</p>
                          <p className="text-cream text-xl font-bold leading-tight">Others have 5s to challenge you with lower points!</p>
                          <p className="text-cream text-xl font-bold leading-tight">Wrong Deck gets 50 POINTS.</p>
                        </div>
                    </section>
                 </div>
                 <button 
                    onClick={() => setShowRules(false)}
                    className="w-full py-8 mt-12 bg-gold text-brand-maroon font-black uppercase rounded-[40px] shadow-2xl hover:bg-gold-light active:scale-95 transition-all text-sm tracking-widest border-2 border-black embossed"
                 >
                    Understand & Play
                 </button>
              </div>
           </motion.div>
         )}
        </AnimatePresence>
        <AnimatePresence>
          {showWildCardWarning && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[700] bg-black/90 backdrop-blur-3xl flex items-center justify-center p-8">
              <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="max-w-sm w-full bg-brand-maroon border-4 border-gold rounded-[40px] p-10 text-center shadow-[0_0_100px_rgba(212,175,55,0.3)]">
                 <div className="w-20 h-20 bg-gold rounded-full flex items-center justify-center mx-auto mb-6">
                    <AlertCircle className="w-10 h-10 text-brand-maroon" />
                 </div>
                 <h2 className="text-3xl font-black text-gold uppercase mb-4 italic">JOKER SELECTED!</h2>
                 <p className="text-cream/60 text-sm font-bold uppercase tracking-widest leading-relaxed mb-10">
                   You have selected a WILD CARD (Value: 0 POINTS). Discarding it might be a mistake as it helps you win the round!
                 </p>
                 <button 
                   onClick={() => setShowWildCardWarning(false)}
                   className="w-full py-6 bg-gold text-brand-maroon font-black rounded-3xl uppercase tracking-widest shadow-xl hover:bg-gold-light transition-all"
                 >
                   I UNDERSTAND
                 </button>
              </motion.div>
           </motion.div>
         )}
         {setupMode === 'available_rooms' && renderAvailableRoomsScreen()}
         {gameState.status === 'lobby' && renderLobbyScreen()}
         <AnimatePresence>
           {showSettings && (
             <motion.div 
               key="settings-overlay"
               initial={{ opacity: 0 }} 
               animate={{ opacity: 1 }} 
               exit={{ opacity: 0 }}
               className="fixed inset-0 z-[650] bg-black/95 flex items-center justify-center p-6 backdrop-blur-3xl" 
               onClick={() => setShowSettings(false)}
             >
                <motion.div 
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  onClick={e => e.stopPropagation()} 
                  className="max-w-md w-full bg-brand-maroon border-4 border-gold p-10 sm:p-14 rounded-[60px] sm:rounded-[80px] text-center shadow-[0_0_150px_black] backdrop-blur-3xl relative"
                >
                   <button 
                     onClick={() => setShowSettings(false)} 
                     className="absolute top-8 right-8 p-3 text-gold/40 hover:text-gold transition-colors"
                   >
                     <X className="w-8 h-8" />
                   </button>

                   <h3 className="text-4xl font-black mb-14 uppercase italic text-gold embossed-gold">Game Settings</h3>
                   
                   <div className="grid grid-cols-1 gap-6 mb-10 text-left">
                      <div className="p-1 group">
                         <span className="text-[10px] font-black text-gold/30 uppercase tracking-[0.3em] mb-4 block">AUDIO CONTROLS</span>
                         <button 
                           onClick={() => { sounds.playClick(); sounds.unlockAudio(); setIsMuted(!isMuted); }} 
                           className={cn(
                             "w-full p-8 rounded-[40px] border-black border-4 flex items-center justify-between transition-all active:scale-95 shadow-2xl", 
                             isMuted ? "bg-brand-red/10 text-red-500 border-red-500/20" : "bg-gold text-brand-maroon"
                           )}
                         >
                            <div className="flex items-center gap-4">
                              {isMuted ? <VolumeX className="w-8 h-8" /> : <Volume2 className="w-8 h-8" />}
                              <span className="text-xl font-black uppercase italic tracking-widest">{isMuted ? 'MUTED' : 'ACTIVE'}</span>
                            </div>
                            <div className={cn("w-4 h-4 rounded-full", isMuted ? "bg-red-500 animate-pulse" : "bg-brand-maroon shadow-[0_0_10px_rgba(0,0,0,0.5)]")} />
                         </button>
                      </div>

                      <div className="p-1 group">
                         <span className="text-[10px] font-black text-gold/30 uppercase tracking-[0.3em] mb-4 block">GAME ACADEMY</span>
                         <button 
                           onClick={() => { sounds.playClick(); setShowTutorial(true); setShowSettings(false); }} 
                           className="w-full p-8 rounded-[40px] border-black border-4 bg-white/5 text-gold flex items-center justify-between transition-all hover:bg-white/10 active:scale-95 shadow-2xl"
                         >
                            <div className="flex items-center gap-4">
                              <BookOpen className="w-8 h-8" />
                              <span className="text-xl font-black uppercase italic tracking-widest">HELP & RULES</span>
                            </div>
                            <ChevronLeft className="w-6 h-6 rotate-180 opacity-30" />
                         </button>
                      </div>

                      <div className="p-1 group">
                         <span className="text-[10px] font-black text-gold/30 uppercase tracking-[0.3em] mb-4 block">QUIT MATCH</span>
                         <button 
                           onClick={() => { sounds.playClick(); handleBackToMenu(); setShowSettings(false); }} 
                           className="w-full p-8 rounded-[40px] border-black border-4 bg-brand-red/10 text-brand-red flex items-center justify-between transition-all hover:bg-brand-red/20 active:scale-95 shadow-2xl"
                         >
                            <div className="flex items-center gap-4">
                              <Trash2 className="w-8 h-8" />
                              <span className="text-xl font-black uppercase italic tracking-widest">ABANDON GAME</span>
                            </div>
                         </button>
                      </div>
                   </div>

                   <button 
                    onClick={() => setShowSettings(false)} 
                    className="w-full py-8 bg-gold text-brand-maroon font-black uppercase rounded-[40px] shadow-2xl hover:bg-gold-light active:scale-95 transition-all text-xl tracking-widest border-4 border-black border-b-8"
                  >
                    RESUME SURVIVAL
                  </button>
                </motion.div>
             </motion.div>
           )}
         </AnimatePresence>
          {gameState.status === 'round_over' && (
            <motion.div key="round_over" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[250] flex items-center justify-center bg-brand-maroon/98 p-4 sm:p-6 text-center">
               <motion.div 
                 initial={{ scale: 0.9, opacity: 0 }} 
                 animate={{ scale: 1, opacity: 1 }} 
                 className="max-w-2xl w-full bg-brand-maroon/90 border-black border-4 rounded-[60px] p-8 sm:p-12 text-cream relative shadow-[0_40px_100px_black] backdrop-blur-3xl flex flex-col max-h-[92vh] overflow-hidden"
               >
                  <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 no-scrollbar">
                    <Trophy className="w-12 h-12 mx-auto mb-6 text-gold" />
                    <h2 className="text-4xl font-black uppercase mb-2 italic text-gold">ROUND OVER</h2>
                    <p className="text-gold/40 font-black uppercase mb-10 tracking-widest text-[10px] leading-relaxed max-w-xs mx-auto">
                      {gameState.message.includes('WRONG') ? "A BOLD CHALLENGE!" : "SUCCESSFUL DECK!"}
                    </p>
                    
                    <div className="space-y-4 mb-10 text-left">
                      {gameState.players.map((p, pIdx) => {
                        const handVal = calculateHandValue(p.hand, gameState.jokerRank);
                        const isMe = p.id === playerId;
                        const isRoundWinner = p.id === gameState.roundWinnerId;
                        
                         return (
                           <div key={`rr-ply-${p.id || 'cpu'}-${pIdx}`} className={cn("p-5 rounded-[32px] border transition-all flex flex-col gap-4", isMe ? "bg-gold/10 border-gold/40 shadow-inner" : "bg-black/20 border-white/5")}>
                             <div className="flex justify-between items-center">
                               <div className="flex flex-col">
                                 <span className={cn("font-black text-xl sm:text-2xl uppercase italic", isMe ? "text-gold" : "text-cream/60")}>{p.name} {isMe && "(YOU)"} {isRoundWinner && "🥇"}</span>
                                 <div className="flex items-center gap-3">
                                   <span className={cn("text-xs sm:text-base font-black uppercase tracking-widest", isRoundWinner ? "text-emerald-400" : "text-gold/60")}>
                                     {isRoundWinner ? "POINTS GAINED: +0 (ROUND WINNER)" : (
                                        gameState.message.includes('WRONG') && p.id === gameState.deckingPlayerId 
                                          ? "POINTS GAINED: +50 (PENALTY)" 
                                          : `POINTS GAINED: +${handVal}`
                                      )}
                                   </span>
                                 </div>
                               </div>
                               <div className="text-right">
                                 <span className="text-2xl font-black text-gold">{p.score}</span>
                                 <span className="block text-[8px] font-black uppercase tracking-widest text-gold/20">TOTAL</span>
                               </div>
                             </div>
                             
                             <div className="flex flex-wrap justify-start -space-x-12">
                                {p.hand.map((card, cIdx) => (
                                  <Card 
                                    key={`rr-c-${pIdx}-${cIdx}-${card.id}`} 
                                    card={card} 
                                    isFaceUp={true} 
                                    isJoker={card.rank === gameState.jokerRank}
                                    className="scale-[0.6] sm:scale-[0.8] origin-left border-black shadow-md" 
                                  />
                                ))}
                             </div>
                           </div>
                         );
                      })}
                    </div>
                  </div>

                  <div className="pt-6 border-t border-white/10 flex gap-4">
                    <button 
                      onClick={handleBackToMenu}
                      className="px-8 py-10 bg-gold text-black font-black uppercase rounded-[40px] border-2 border-black shadow-xl hover:bg-gold-light transition-all text-xs tracking-widest"
                    >
                      BACK TO MENU
                    </button>
                    {effectiveIsHost ? (
                      <button 
                        onClick={() => {
                          sounds.playClick();
                          Haptics.notification({ type: NotificationType.Success }).catch(() => {});
                          initGame(gameState.numPlayers, gameState.maxGames, gameState.players, gameState.gameCount, gameState.startingPlayerIndex);
                        }} 
                        className="flex-1 py-10 bg-gold text-brand-maroon font-black uppercase text-3xl rounded-[40px] shadow-[0_30px_80px_black] hover:bg-gold-light hover:-translate-y-1 active:translate-y-0.5 transition-all outline-none border-t-2 border-gold-light/40"
                      >
                        NEXT ROUND →
                      </button>
                    ) : (
                      <div className="flex-1 py-6 px-10 bg-white/5 rounded-[32px] border border-black italic font-black text-[10px] text-gold/40 uppercase tracking-[0.3em] flex items-center justify-center">
                        Waiting for Host to continue...
                      </div>
                    )}
                  </div>
               </motion.div>
            </motion.div>
         )}
         {gameState.status === 'final_results' && (
            <motion.div key="final_results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[255] flex items-center justify-center bg-brand-maroon p-6 text-center">
               <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="max-w-xl w-full">
                   <div className="relative mb-10">
                      <div className="bg-gold rounded-full w-24 h-24 flex items-center justify-center mx-auto shadow-[0_0_50px_var(--color-gold)] relative z-10">
                        <Trophy className="w-12 h-12 text-black" />
                      </div>
                   </div>
                  <h2 className="text-4xl sm:text-5xl font-black uppercase mb-2 italic text-gold tracking-tight embossed break-words">GAME COMPLETE</h2>
                  {gameState.winner && (
                    <motion.div 
                      initial={{ scale: 0.5, opacity: 0 }} 
                      animate={{ scale: 1, opacity: 1 }} 
                      className="mb-8"
                    >
                      <span className="text-lg sm:text-xl font-bold text-cream uppercase bg-white/10 px-8 py-3 rounded-full embossed break-words">
                        Winner {gameState.winner.name}
                      </span>
                    </motion.div>
                  )}
                  <p className="text-gold/40 font-black uppercase mb-16 tracking-[0.5em] text-[10px] sm:text-xs px-4 break-words leading-relaxed">CUMULATIVE SCOREBOARD</p>
                  
                  <div className="space-y-4 mb-16 px-4">
                    {[...gameState.players].sort((a, b) => a.score - b.score).map((p, i) => (
                      <motion.div 
                        key={`final-rank-${p.id || 'cpu'}-${i}`} 
                        initial={{ x: -20, opacity: 0 }} 
                        animate={{ x: 0, opacity: 1 }} 
                        transition={{ delay: i * 0.1 }}
                        className={cn(
                          "flex justify-between items-center p-8 rounded-[48px] border-black border-2 font-black text-2xl transition-all", 
                          i === 0 
                            ? "bg-white text-black border-white shadow-[0_20px_40px_rgba(255,255,255,0.1)] scale-105" 
                            : "bg-white/5 text-white"
                        )}
                      >
                        <div className="flex items-center gap-6">
                           <span className="text-[10px] opacity-40">{i + 1}</span>
                           <span className="uppercase italic text-lg sm:text-xl break-words">{p.name}</span>
                           {i === 0 && <span className="text-2xl">🏆</span>}
                        </div>
                        <span className="text-3xl sm:text-4xl">{p.score}</span>
                      </motion.div>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-8">
                    <button 
                      onClick={() => {
                        sounds.playClick();
                        initGame(gameState.numPlayers, gameState.maxGames);
                      }} 
                      className="py-8 sm:py-10 bg-emerald-500 text-white font-black uppercase text-xl sm:text-2xl rounded-[50px] hover:bg-emerald-400 transition-colors shadow-2xl embossed break-words px-2 flex items-center justify-center"
                    >
                      PLAY AGAIN
                    </button>
                    <button 
                      onClick={handleBackToMenu} 
                      className="py-8 sm:py-10 bg-gold text-black font-black uppercase text-xl sm:text-2xl rounded-[50px] hover:bg-gold-light transition-colors shadow-2xl embossed break-words px-2 flex items-center justify-center"
                    >
                      MAIN MENU
                    </button>
                  </div>
               </motion.div>
            </motion.div>
         )}
      </AnimatePresence>
    </div>
  );
};

export const MultiplayerGame: React.FC<{ roomId: string, isHost: boolean, onBack: () => void }> = ({ roomId, isHost, onBack }) => {
  return <GameBoard onBack={onBack} roomId={roomId} initialIsMultiplayer={true} />;
};
