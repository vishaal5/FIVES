/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import Home from './components/Home';
import Tutorial from './components/Tutorial';
import { GameBoard, MultiplayerGame } from './components/Game';
import MultiplayerSetup from './components/MultiplayerSetup';
import { GameState, Player } from './types/game';
import { createRoom, joinRoom } from './services/multiplayerService';

type AppView = 'home' | 'game' | 'multiplayer_setup' | 'multiplayer_game';

export default function App() {
  const [view, setView] = useState<AppView>('home');
  const [showTutorial, setShowTutorial] = useState(false);
  const [isTutorialComplete, setIsTutorialComplete] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('fives_tutorial_complete') === 'true';
  });
  const [gameSetup, setGameSetup] = useState<{ players: number, rounds: number, roomId?: string, isHost?: boolean, playerName?: string } | null>(null);

  const handleStartSinglePlayer = (players: number, rounds: number, playerName?: string) => {
    setGameSetup({ players, rounds, playerName });
    setView('game');
  };

  const handleStartMultiplayer = (playerName?: string) => {
    setGameSetup(prev => ({ ...prev, players: 2, rounds: 5, playerName }));
    setView('multiplayer_setup');
  };

  const handleCreateRoom = async (roomName: string, rounds: number, maxPlayers: number, playerName?: string) => {
    const roomId = await createRoom(roomName, rounds, maxPlayers, playerName);
    if (roomId) {
      setGameSetup({ players: maxPlayers, rounds, roomId, isHost: true, playerName });
      setView('multiplayer_game');
    }
  };

  const handleJoinRoom = async (roomId: string, playerName?: string) => {
    const success = await joinRoom(roomId, playerName);
    if (success) {
      setGameSetup({ players: 2, rounds: 5, roomId, isHost: false, playerName });
      setView('multiplayer_game');
    }
  };

  const handleBackToHome = () => {
    setView('home');
    setGameSetup(null);
  };

  const handleStartInteractive = () => {
    setShowTutorial(false);
    setGameSetup({ players: 2, rounds: 1, playerName: 'Beginner' });
    setView('game');
    // We'll need to pass an isTutorial flag to GameBoard or use a side effect
  };

  return (
    <div className="font-sans antialiased text-brand-gold min-h-screen bg-[#2a0404]">
      {view === 'home' && (
        <Home 
          isTutorialComplete={isTutorialComplete}
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
          isTutorialMode={gameSetup.playerName === 'Beginner'} // Simple heuristic
        />
      )}

      {view === 'multiplayer_setup' && (
        <MultiplayerSetup 
           onBack={handleBackToHome}
           onCreateRoom={handleCreateRoom}
           onJoinRoom={handleJoinRoom}
           initialPlayerName={gameSetup?.playerName}
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
        <Tutorial 
          onClose={() => {
            setShowTutorial(false);
            setIsTutorialComplete(localStorage.getItem('fives_tutorial_complete') === 'true');
          }} 
          onStartInteractive={handleStartInteractive}
        />
      )}
    </div>
  );
}


