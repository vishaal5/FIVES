
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import type { GameState, Player, Card, Rank } from '../../types/game';
import { createDeck, getInitSetup, calculateHandValue, shuffle, getCardValue } from '../../utils/gameLogic';
import Hand from './Hand';
import CardUI from './CardUI';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Trophy, RefreshCw, LogOut, ArrowRight, Info, AlertTriangle, User, ArrowLeft } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useSound } from '../../hooks/useSound';

interface GameBoardProps {
  playerCount: number;
  maxRounds: number;
  playerName?: string;
  onBack: () => void;
}

const GameBoard: React.FC<GameBoardProps> = ({ playerCount, maxRounds, playerName, onBack }) => {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [selectedCardIds, setSelectedCardIds] = useState<string[]>([]);
  const [gameLogs, setGameLogs] = useState<string[]>([]);
  const [showScores, setShowScores] = useState(false);
  const { playClick } = useSound();

  const handleAction = (action: () => void) => {
    playClick();
    action();
  };

  // Initialize Local Game
  useEffect(() => {
    initNewGame();
  }, [playerCount, maxRounds]);

  const initNewGame = () => {
    const deck = createDeck();
    const { pretendJokerRank, openCard } = getInitSetup(deck);
    
    const players: Player[] = [];
    for (let i = 0; i < playerCount; i++) {
        const hand: Card[] = [];
        for (let j = 0; j < 5; j++) {
            hand.push(deck.pop()!);
        }
        players.push({
            id: `player-${i}`,
            name: i === 0 ? "You" : `AI ${i}`,
            hand,
            score: 0,
            isAI: i !== 0,
            isHost: i === 0,
            hasCalled: false
        });
    }

    setGameState({
        id: `local-${Date.now()}`,
        players,
        deck,
        openPile: [openCard],
        turn: 0,
        round: 1,
        maxRounds,
        status: 'playing',
        pretendJokerRank,
        history: ['Game started!']
    });
    setGameLogs(['Game started!']);
    playClick();
  };

  if (!gameState) return null;

  const currentPlayer = gameState.players[gameState.turn];
  const isHumanTurn = !currentPlayer.isAI;

  const addLog = (msg: string) => {
    setGameLogs(prev => [msg, ...prev].slice(0, 5));
  };

  const [jokerWarning, setJokerWarning] = useState(false);

  const handleCardToggle = (cardId: string) => {
    if (!isHumanTurn) return;
    
    handleAction(() => {
    setSelectedCardIds(prev => {
        const isAlreadySelected = prev.includes(cardId);
        const card = currentPlayer.hand.find(c => c.id === cardId);
        
        if (!isAlreadySelected && card) {
           // Check if it's a joker or pretend joker
           if (card.rank === 'Joker' || card.rank === gameState.pretendJokerRank) {
              setJokerWarning(true);
              setTimeout(() => setJokerWarning(false), 3000);
           }
        }

        if (isAlreadySelected) {
            return prev.filter(id => id !== cardId);
        }
        
        if (!card) return prev;

        // Can only select same rank if multiple
        if (prev.length > 0) {
            const firstSelected = currentPlayer.hand.find(c => c.id === prev[0])!;
            if (firstSelected.rank !== card.rank) {
                return [cardId]; // Reset to new rank
            }
        }
        
        return [...prev, cardId];
    });
    });
  };

  const nextTurn = (state: GameState): GameState => {
     let nextPlayerIndex = (state.turn + 1) % state.players.length;
     let nextRound = state.round;
     if (nextPlayerIndex === 0) {
       nextRound += 1;
     }
     
     return {
       ...state,
       turn: nextPlayerIndex,
       round: nextRound
     };
  };

  const handleDraw = (fromDeck: boolean) => {
    if (!isHumanTurn || selectedCardIds.length === 0) return;

    handleAction(() => {
    const cardsToDiscard = currentPlayer.hand.filter(c => selectedCardIds.includes(c.id));
    const newHand = currentPlayer.hand.filter(c => !selectedCardIds.includes(c.id));
    
    const newState = { ...gameState };
    
    // Add discards to open pile
    newState.openPile = [...cardsToDiscard, ...newState.openPile];
    
    let drawnCard: Card;
    if (fromDeck) {
        drawnCard = newState.deck.pop()!;
        addLog(`You discarded ${cardsToDiscard.length} card(s) and drew from the deck.`);
    } else {
        drawnCard = newState.openPile.shift()!;
        addLog(`You discarded ${cardsToDiscard.length} card(s) and picked up ${drawnCard.rank} from the pile.`);
    }

    newHand.push(drawnCard);
    newState.players[gameState.turn].hand = newHand;
    
    setGameState(nextTurn(newState));
    setSelectedCardIds([]);
    });
  };

  const handleDeckCall = () => {
    if (!isHumanTurn || gameState.round <= 5) return;
    
    const callerIndex = gameState.turn;
    const scores = gameState.players.map(p => calculateHandValue(p.hand, gameState.pretendJokerRank));
    const callerScore = scores[callerIndex];
    
    let minScore = Math.min(...scores);
    const isSuccess = callerScore === minScore;
    
    const newState = { ...gameState, status: 'round_over' as const };
    
    newState.players = newState.players.map((p, idx) => {
        let roundScore = 0;
        if (idx === callerIndex) {
            roundScore = isSuccess ? 0 : 50;
        } else {
            roundScore = scores[idx];
        }
        return { ...p, score: p.score + roundScore };
    });

    setGameState(newState);
    setShowScores(true);
    addLog(isSuccess ? "Correct Deck! 0 points for you." : "Wrong Deck! 50 points penalty.");
  };

  // AI Logic (Simple)
  useEffect(() => {
    if (gameState.status === 'playing' && currentPlayer.isAI) {
      const timer = setTimeout(() => {
        playAITurn();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [gameState?.turn, gameState?.status]);

  const playAITurn = () => {
    const aiHand = currentPlayer.hand;
    const currentVal = calculateHandValue(aiHand, gameState.pretendJokerRank);

    // Should AI call?
    if (gameState.round > 5 && currentVal < 10) {
        handleDeckCall(); // AI simple logic to call if hand value is low
        return;
    }

    // Find cards of same rank to discard (prefer highest value rank)
    const rankGroups: Record<string, Card[]> = {};
    aiHand.forEach(c => {
       if (!rankGroups[c.rank]) rankGroups[c.rank] = [];
       rankGroups[c.rank].push(c);
    });

    // Pick a rank that isn't a joker/pretend joker
    const validRanks = Object.keys(rankGroups).filter(r => r !== 'Joker' && r !== gameState.pretendJokerRank);
    const bestRankToDiscard = validRanks.sort((a,b) => {
        const valA = getCardValue(rankGroups[a][0], gameState.pretendJokerRank);
        const valB = getCardValue(rankGroups[b][0], gameState.pretendJokerRank);
        return valB - valA;
    })[0] || validRanks[0];

    const cardsToDiscard = rankGroups[bestRankToDiscard];
    const newHand = aiHand.filter(c => !cardsToDiscard.map(dc => dc.id).includes(c.id));

    // Pick from open pile if it's a joker or lower than what we discard
    const openCard = gameState.openPile[0];
    const openVal = getCardValue(openCard, gameState.pretendJokerRank);
    const discardVal = getCardValue(cardsToDiscard[0], gameState.pretendJokerRank);

    const newState = { ...gameState };
    newState.openPile = [...cardsToDiscard, ...newState.openPile];

    let drawnCard: Card;
    if (openVal < discardVal || openVal === 0) {
        drawnCard = newState.openPile.shift()!;
        addLog(`${currentPlayer.name} picked from pile.`);
    } else {
        drawnCard = newState.deck.pop()!;
        addLog(`${currentPlayer.name} drew from deck.`);
    }

    newHand.push(drawnCard);
    newState.players[gameState.turn].hand = newHand;
    setGameState(nextTurn(newState));
  };

  const handleNextRound = () => {
    if (gameState.round >= gameState.maxRounds) {
        setGameState(prev => prev ? { ...prev, status: 'game_over' } : null);
        return;
    }

    const deck = createDeck();
    const { pretendJokerRank, openCard } = getInitSetup(deck);
    
    const newPlayers = gameState.players.map(p => {
        const hand: Card[] = [];
        for (let j = 0; j < 5; j++) hand.push(deck.pop()!);
        return { ...p, hand, hasCalled: false };
    });

    setGameState({
        ...gameState,
        players: newPlayers,
        deck,
        openPile: [openCard],
        turn: 0,
        round: gameState.round + 1,
        status: 'playing',
        pretendJokerRank
    });
    setShowScores(false);
    addLog(`Round ${gameState.round + 1} started!`);
  };

  return (
    <div className="min-h-screen bg-brand-red overflow-hidden flex flex-col relative text-brand-gold">
      {/* GOLDEN BORDER */}
      <div className="absolute inset-0 border-[12px] border-brand-gold/10 pointer-events-none z-50 pointer-events-none shadow-[inset_0_0_60px_rgba(0,0,0,0.5)]" />

      {/* Top Info Bar */}
      <div className="z-10 px-6 pt-8 flex justify-between items-start gap-4">
        <div className="flex items-start gap-4">
           <button onClick={() => handleAction(onBack)} className="mt-2 text-brand-gold/40 hover:text-brand-gold transition-colors group">
             <ArrowLeft size={24} className="group-hover:-translate-x-1 transition-transform" />
           </button>
           
           <div className="flex gap-3 overflow-x-auto no-scrollbar max-w-[300px] py-2">
              {gameState.players.map((p, i) => (
                 <div key={p.id} className={cn(
                   "flex flex-col items-center gap-1 transition-all duration-300 min-w-[80px]",
                   gameState.turn === i ? "opacity-100 scale-110" : "opacity-40 scale-100"
                 )}>
                    <div className={cn(
                       "w-16 h-20 rounded-[24px] bg-brand-maroon border-2 flex flex-col items-center justify-center shadow-2xl relative overflow-hidden",
                       gameState.turn === i ? "border-brand-gold" : "border-brand-gold/10"
                    )}>
                       <div className="absolute top-0 left-0 w-full h-1 bg-brand-gold/10" />
                       <span className="text-xl font-display font-black text-brand-gold text-embossed">{p.score}</span>
                       <span className="text-[7px] font-black uppercase text-brand-gold/40 tracking-[0.2em] mt-0.5">SCORE</span>
                    </div>
                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-center truncate w-full text-embossed">
                      {p.isAI ? p.name : (playerName || 'YOU')}
                    </span>
                 </div>
              ))}
           </div>
        </div>

        <div className="flex-1 flex flex-col items-center">
           <div className="flex flex-col items-center">
              <span className="text-[10px] font-black uppercase tracking-[0.4em] text-brand-gold/40 mb-3 italic">Wild Card</span>
              <div className="relative">
                 <div className="absolute -inset-8 bg-brand-gold/10 blur-3xl rounded-full animate-pulse" />
                 <CardUI 
                   card={{ id: 'wild', rank: gameState.pretendJokerRank || 'A', isPretendJoker: true }} 
                   faceUp={true} 
                   isSmall
                   className="border-brand-gold shadow-[0_0_20px_rgba(245,228,195,0.3)] scale-125"
                 />
              </div>
           </div>
           
           {/* Joker Warning Overlay */}
           <AnimatePresence>
             {jokerWarning && (
               <motion.div 
                 initial={{ opacity: 0, y: -20, scale: 0.9 }}
                 animate={{ opacity: 1, y: 0, scale: 1 }}
                 exit={{ opacity: 0, scale: 0.95 }}
                 className="mt-10 px-6 py-3 bg-brand-yellow text-brand-red rounded-2xl flex items-center gap-3 shadow-[0_20px_50px_rgba(0,0,0,0.5)] border-4 border-white z-[100]"
               >
                 <AlertTriangle size={20} className="animate-bounce" />
                 <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase tracking-widest leading-none">Warning!</span>
                    <span className="text-sm font-display font-black uppercase italic tracking-tight">
                       Joker card selected. It has 0 value
                    </span>
                 </div>
               </motion.div>
             )}
           </AnimatePresence>
        </div>

        <div className="flex flex-col items-end gap-2">
           <div className="bg-brand-maroon/60 border-2 border-brand-gold/10 px-6 py-4 rounded-[32px] flex flex-col items-end shadow-2xl backdrop-blur-md">
              <span className="text-[10px] font-black text-brand-gold/40 tracking-widest uppercase">Round</span>
              <span className="text-3xl font-display font-black leading-none italic text-embossed">{gameState.round}<span className="text-xs opacity-20 ml-1">/ {gameState.maxRounds}</span></span>
           </div>
        </div>
      </div>

      {/* Play Area */}
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="flex items-center gap-16 mb-12">
           <div className="flex flex-col items-center gap-4">
              <span className="text-[10px] font-black uppercase tracking-widest text-brand-gold/40">Open Pile</span>
              <AnimatePresence mode="popLayout">
                <motion.div 
                  key={gameState.openPile[0]?.id}
                  initial={{ scale: 0.8, opacity: 0, y: 20 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  onClick={() => handleDraw(false)}
                >
                   <CardUI card={gameState.openPile[0]} faceUp={true} />
                </motion.div>
              </AnimatePresence>
           </div>

           <div className="flex flex-col items-center gap-4">
              <span className="text-[10px] font-black uppercase tracking-widest text-brand-gold/40">Deck</span>
              <div 
                onClick={() => handleDraw(true)}
                className="w-24 h-36 bg-brand-maroon rounded-xl border-2 border-brand-gold/20 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-brand-gold/60 transition-all group"
              >
                 <div className="w-10 h-10 border border-brand-gold/20 rounded-full flex items-center justify-center text-brand-gold/40 group-hover:text-brand-gold group-hover:border-brand-gold transition-colors">
                    <RefreshCw size={16} />
                 </div>
                 <span className="text-[8px] font-black text-brand-gold/20 uppercase tracking-widest">{gameState.deck.length} REMAINING</span>
              </div>
           </div>
        </div>

        {/* Action Labels (Floating) */}
        <AnimatePresence>
           {selectedCardIds.length > 1 && (
             <motion.div 
               initial={{ opacity: 0, y: 10 }}
               animate={{ opacity: 1, y: 0 }}
               exit={{ opacity: 0 }}
               className="bg-brand-gold text-brand-red px-6 py-2 rounded-full font-display font-black text-xl tracking-tighter shadow-2xl mb-4"
             >
                {selectedCardIds.length === 2 ? 'PAIR' : selectedCardIds.length === 3 ? 'TRIPLETS' : 'SET'}
             </motion.div>
           )}
        </AnimatePresence>
      </div>

      {/* Footer Controls */}
      <div className="p-8 bg-black/40 backdrop-blur-xl border-t border-brand-gold/5">
        <div className="max-w-5xl mx-auto flex items-end justify-between gap-8">
           <div className="flex flex-col gap-4">
              <div className="flex gap-2">
                 <div className="bg-brand-gold text-brand-red px-4 py-1.5 rounded-lg flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-widest">Game</span>
                    <span className="font-display font-bold text-sm">1/1</span>
                 </div>
                 <div className="bg-brand-gold text-brand-red px-4 py-1.5 rounded-lg flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-widest">Round</span>
                    <span className="font-display font-bold text-sm">{gameState.round}</span>
                 </div>
              </div>
              <div className="flex items-center gap-4">
                 <div className="flex flex-col">
                    <span className={cn(
                      "text-2xl font-display font-bold transition-colors",
                      isHumanTurn ? "text-brand-gold" : "text-brand-gold/20"
                    )}>
                      {isHumanTurn ? 'YOUR TURN!' : 'WAITING...'}
                    </span>
                    <span className="text-[8px] font-black uppercase tracking-[0.2em] text-brand-gold/40">MAKE YOUR MOVE</span>
                 </div>
              </div>
           </div>

           <div className="flex-1 flex justify-center">
              <div className="relative -mb-4">
                 <Hand 
                   cards={gameState.players[0].hand}
                   faceUp={true}
                   onCardClick={handleCardToggle}
                   selectedIds={selectedCardIds}
                   pretendJokerRank={gameState.pretendJokerRank}
                   isCurrentPlayer={true}
                 />
              </div>
           </div>

           <div className="flex flex-col items-end gap-4">
              <div className="bg-brand-gold text-brand-red px-6 py-3 rounded-2xl flex flex-col items-end">
                 <span className="text-[10px] font-black uppercase tracking-widest opacity-60 leading-none">Total Points</span>
                 <span className="text-3xl font-display font-bold leading-none mt-1">
                   {calculateHandValue(gameState.players[0].hand, gameState.pretendJokerRank)}
                 </span>
              </div>
              <div className="flex gap-2">
                 {gameState.round > 5 && isHumanTurn && (
                    <Button 
                      onClick={handleDeckCall}
                      className="h-12 px-6 rounded-xl bg-brand-gold text-brand-red border border-brand-gold hover:bg-brand-gold/90 font-black"
                    >
                       DECK IT!
                    </Button>
                 )}
                 {selectedCardIds.length > 0 && isHumanTurn && (
                    <Button 
                       onClick={() => {}} // This is just UI for the video flow or handled by clicking piles
                       className="h-12 px-6 rounded-xl bg-brand-gold text-brand-red hover:bg-brand-gold/90 font-black animate-pulse"
                    >
                       DISCARD
                    </Button>
                 )}
              </div>
           </div>
        </div>
      </div>

      {/* Round End Overlay */}
      <AnimatePresence>
        {showScores && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 z-50 bg-slate-900/90 backdrop-blur-xl flex flex-col items-center justify-center p-8"
          >
             <motion.div
               initial={{ scale: 0.9, y: 20 }}
               animate={{ scale: 1, y: 0 }}
               className="max-w-lg w-full bg-white rounded-[40px] p-10 overflow-hidden relative"
             >
                <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12">
                   <Trophy size={120} className="text-indigo-900" />
                </div>
                
                <h2 className="text-4xl font-black text-indigo-900 mb-2 leading-none">ROUND OVER</h2>
                <p className="text-slate-500 font-medium mb-8">Summary for Round {gameState.round}</p>

                <div className="space-y-4 mb-10">
                   {gameState.players.map(p => (
                     <div key={p.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <div className="flex items-center gap-3">
                           <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold">
                              {p.name[0]}
                           </div>
                           <div>
                              <div className="font-bold text-slate-800">{p.name}</div>
                              <div className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                                 Current Hand: {calculateHandValue(p.hand, gameState.pretendJokerRank)}
                              </div>
                           </div>
                        </div>
                        <div className="text-right">
                           <div className="text-2xl font-black text-indigo-600">{p.score}</div>
                           <div className="text-[10px] font-bold text-slate-400 uppercase">TOTAL SCORE</div>
                        </div>
                     </div>
                   ))}
                </div>

                <Button 
                   onClick={handleNextRound}
                   className="w-full h-16 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-lg font-black shadow-xl shadow-indigo-100"
                >
                   {gameState.round >= gameState.maxRounds ? "FINISH GAME" : "NEXT ROUND"} <ArrowRight className="ml-2" />
                </Button>
             </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Game Over Screen */}
      <AnimatePresence>
         {gameState.status === 'game_over' && (
             <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               className="absolute inset-0 z-[60] bg-indigo-900 flex flex-col items-center justify-center p-8 text-center"
             >
                <motion.div
                  initial={{ rotate: -20, scale: 0.5 }}
                  animate={{ rotate: 0, scale: 1 }}
                  className="mb-8"
                >
                   <div className="w-40 h-40 bg-yellow-400 rounded-full flex items-center justify-center shadow-2xl shadow-yellow-400/40">
                      <Trophy size={80} className="text-indigo-900" />
                   </div>
                </motion.div>

                <h1 className="text-7xl font-black mb-2 tracking-tighter">GAME OVER</h1>
                <p className="text-indigo-200 text-lg mb-12 max-w-md">The battle has ended. Here are the final standings of the FIVES tournament.</p>

                <div className="w-full max-w-md space-y-3 mb-12">
                   {[...gameState.players].sort((a,b) => a.score - b.score).map((p, i) => (
                      <div key={p.id} className={cn(
                        "flex items-center justify-between p-5 rounded-2xl border-2 transition-all",
                        i === 0 ? "bg-white text-indigo-900 border-white scale-105 shadow-2xl" : "bg-indigo-800 text-indigo-100 border-indigo-700 opacity-60"
                      )}>
                         <div className="flex items-center gap-4">
                            <span className="text-2xl font-black opacity-20">#{i+1}</span>
                            <span className="text-xl font-black">{p.name}</span>
                         </div>
                         <span className="text-3xl font-black">{p.score}</span>
                      </div>
                   ))}
                </div>

                <div className="flex gap-4">
                   <Button onClick={() => window.location.reload()} variant="outline" className="h-14 px-8 border-white/20 text-white bg-transparent hover:bg-white/10 rounded-xl">
                      Play Again
                   </Button>
                   <Button onClick={onBack} className="h-14 px-8 bg-white text-indigo-900 hover:bg-indigo-50 rounded-xl font-bold">
                      Main Menu
                   </Button>
                </div>
             </motion.div>
         )}
      </AnimatePresence>
    </div>
  );
};

export default GameBoard;
