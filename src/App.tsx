/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import Home from './components/Home';
import Tutorial from './components/Tutorial';
import GameBoard from './components/game/GameBoard';
import MultiplayerSetup from './components/MultiplayerSetup';
import MultiplayerGame from './components/game/MultiplayerGame';
import { GameState, Player } from './types/game';
import { createRoom, joinRoom } from './services/multiplayerService';

type AppView = 'home' | 'game' | 'multiplayer_setup' | 'multiplayer_game';

export default function App() {
  const [view, setView] = useState<AppView>('home');
  const [showTutorial, setShowTutorial] = useState(false);
  const [gameSetup, setGameSetup] = useState<{ players: number, rounds: number, roomId?: string, isHost?: boolean, playerName?: string } | null>(null);

  const handleStartSinglePlayer = (players: number, rounds: number, playerName?: string) => {
    setGameSetup({ players, rounds, playerName });
    setView('game');
  };

  const handleStartMultiplayer = () => {
    setView('multiplayer_setup');
  };

  const handleCreateRoom = async (rounds: number) => {
    const roomId = await createRoom(rounds);
    if (roomId) {
      setGameSetup({ players: 1, rounds, roomId, isHost: true });
      setView('multiplayer_game');
    }
  };

  const handleJoinRoom = async (roomId: string) => {
    const success = await joinRoom(roomId);
    if (success) {
      setGameSetup({ players: 2, rounds: 5, roomId, isHost: false });
      setView('multiplayer_game');
    }
  };

  const handleBackToHome = () => {
    setView('home');
    setGameSetup(null);
  };

  return (
    <div className="font-sans antialiased text-slate-900 overflow-x-hidden">
      {view === 'home' && (
        <Home 
          onStartSinglePlayer={handleStartSinglePlayer}
          onStartMultiplayer={handleStartMultiplayer}
          onShowTutorial={() => setShowTutorial(true)}
        />
      )}

      {view === 'game' && gameSetup && (
        <GameBoard 
          playerCount={gameSetup.players} 
          maxRounds={gameSetup.rounds} 
          playerName={gameSetup.playerName}
          onBack={handleBackToHome}
        />
      )}

      {view === 'multiplayer_setup' && (
        <MultiplayerSetup 
           onBack={handleBackToHome}
           onCreateRoom={handleCreateRoom}
           onJoinRoom={handleJoinRoom}
        />
      )}

      {view === 'multiplayer_game' && gameSetup?.roomId && (
        <MultiplayerGame 
          roomId={gameSetup.roomId} 
          isHost={!!gameSetup.isHost} 
          onBack={handleBackToHome} 
        />
      )}

      {showTutorial && (
        <Tutorial onClose={() => setShowTutorial(false)} />
      )}
    </div>
  );
}


