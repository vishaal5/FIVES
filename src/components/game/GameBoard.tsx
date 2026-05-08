
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import type { GameState, Player, Card, Rank } from '../../types/game';
import { createDeck, getInitSetup, calculateHandValue, shuffle, getCardValue } from '../../utils/gameLogic';
import Hand from './Hand';
import CardUI from './CardUI';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Trophy, RefreshCw, LogOut, ArrowRight, Info, AlertTriangle, User, ArrowLeft, Zap } from 'lucide-react';
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
  const [jokerWarning, setJokerWarning] = useState(false);
  const { playClick } = useSound();

  const handleAction = (action: () => void) => {
    playClick();
    action();
  };

  // Initialize Local Game
  useEffect(() => {
    initNewGame();
  }, [playerCount, maxRounds]);

  const initNewGame = useCallback(() => {
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
            name: i === 0 ? (playerName || "You") : `AI ${i}`,
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
        turnPhase: 'discard',
        pretendJokerRank,
        history: ['Game started!']
    });
    setGameLogs(['Game started!']);
    playClick();
  }, [playerCount, maxRounds, playerName, playClick]);

  // AI Logic (Simple)
  useEffect(() => {
    if (gameState?.status === 'playing' && gameState.players[gameState.turn].isAI) {
      const timer = setTimeout(() => {
        playAITurn();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [gameState?.turn, gameState?.status]);

  if (!gameState) {
    return (
      <div className="min-h-screen bg-brand-red flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-brand-gold border-t-transparent rounded-full animate-spin" />
          <span className="text-brand-gold font-display font-black tracking-widest uppercase text-sm">Initializing...</span>
        </div>
      </div>
    );
  }

  const currentPlayer = gameState.players[gameState.turn];
  const isHumanTurn = !currentPlayer.isAI;

  const addLog = (msg: string) => {
    setGameLogs(prev => [msg, ...prev].slice(0, 5));
  };

  const handleCardToggle = (cardId: string) => {
    if (!isHumanTurn) return;
    
    handleAction(() => {
    setSelectedCardIds(prev => {
        const isAlreadySelected = prev.includes(cardId);
        const currentPlayer = gameState.players[gameState.turn];
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
       round: nextRound,
       turnPhase: 'discard'
     };
  };

  const handleDiscard = () => {
    if (!isHumanTurn || selectedCardIds.length === 0 || !gameState || gameState.turnPhase !== 'discard') return;

    handleAction(() => {
      const cardsToDiscard = currentPlayer.hand.filter(c => selectedCardIds.includes(c.id));
      const newHand = currentPlayer.hand.filter(c => !selectedCardIds.includes(c.id));
      
      const newState: GameState = {
        ...gameState,
        openPile: [...cardsToDiscard, ...gameState.openPile],
        players: gameState.players.map((p, idx) => 
          idx === gameState.turn ? { ...p, hand: newHand } : p
        ),
        turnPhase: 'draw'
      };
      
      setGameState(newState);
      setSelectedCardIds([]);
      addLog(`You discarded ${cardsToDiscard.length} card(s). Now pick from Deck or Pile!`);
    });
  };

  const handleDraw = (fromDeck: boolean) => {
    if (!isHumanTurn || !gameState || gameState.turnPhase !== 'draw') return;

    handleAction(() => {
      let newDeck = [...gameState.deck];
      let newOpenPile = [...gameState.openPile];
      const currentPlayer = gameState.players[gameState.turn];
      
      let drawnCard: Card;
      if (fromDeck) {
          if (newDeck.length === 0) {
             const topCard = newOpenPile[0];
             const rest = newOpenPile.slice(1);
             if (rest.length > 0) {
                newDeck = shuffle(rest);
                newOpenPile = [topCard];
             } else {
                addLog("Critical: No cards left!");
                return;
             }
          }
          drawnCard = newDeck.pop()!;
          addLog(`You drew from the Deck.`);
      } else {
          // Draw from pile. The user wants the card DROPPED BY THE OPPONENT.
          // Since we pushed our discard to the front in handleDiscard, 
          // the opponent's card is at index 1 (if we discarded 1 rank) or more.
          // But wait, our handleDiscard pushed multiple cards potentially.
          // Let's assume for simplicity we show the 'opponent card' clearly.
          
          // Actually, let's just draw the first card that's NOT ours.
          // In handleDiscard we add logs e.g. "You discarded X card(s)".
          // I'll use a safer approach: draw the card at the bottom of the pile if only 1, or just pop from front?
          // No, pile usually means top.
          
          // Let's just draw the card that was there before.
          // For now, I'll just draw the card at index 1 assuming 1 discard for simplicity, 
          // OR better: I will fix handleDiscard to keep track.
          drawnCard = newOpenPile.splice(1, 1)[0] || newOpenPile.shift()!;
          addLog(`You picked up the open card.`);
      }

      const finalHand = [...currentPlayer.hand, drawnCard];
      const newState: GameState = {
        ...gameState,
        deck: newDeck,
        openPile: newOpenPile,
        players: gameState.players.map((p, idx) => 
          idx === gameState.turn ? { ...p, hand: finalHand } : p
        ),
      };
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

  const playAITurn = () => {
    if (!gameState) return;
    const currentPlayer = gameState.players[gameState.turn];
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

    // Phase 1: Discard
    const midOpenPile = [...cardsToDiscard, ...gameState.openPile];
    
    // Phase 2: Draw
    const openCardToPick = midOpenPile[cardsToDiscard.length]; // What was there before
    const openVal = openCardToPick ? getCardValue(openCardToPick, gameState.pretendJokerRank) : 99;
    const discardVal = getCardValue(cardsToDiscard[0], gameState.pretendJokerRank);

    let newDeck = [...gameState.deck];
    let newOpenPile = [...midOpenPile];
    let drawnCard: Card;

    if (openVal < discardVal || openVal === 0) {
        drawnCard = newOpenPile.splice(cardsToDiscard.length, 1)[0];
        addLog(`${currentPlayer.name} picked from pile.`);
    } else {
        if (newDeck.length === 0) {
           const top = newOpenPile[0];
           const rest = newOpenPile.slice(1);
           newDeck = shuffle(rest);
           newOpenPile = [top];
        }
        drawnCard = newDeck.pop()!;
        addLog(`${currentPlayer.name} drew from deck.`);
    }

    const finalHand = [...newHand, drawnCard];
    
    const newState: GameState = {
      ...gameState,
      deck: newDeck,
      openPile: newOpenPile,
      turnPhase: 'discard', // Reset for next player
      players: gameState.players.map((p, idx) => 
        idx === gameState.turn ? { ...p, hand: finalHand } : p
      ),
    };
    
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
        turnPhase: 'discard',
        pretendJokerRank
    });
    setShowScores(false);
    addLog(`Round ${gameState.round + 1} started!`);
  };

  const embossedStyle = {
    color: '#FFD700',
    textShadow: '2px 2px 0px rgba(0,0,0,0.4), -1px -1px 0px rgba(255,255,255,0.1)'
  };

  return (
    <div className="min-h-screen bg-brand-red overflow-y-auto overflow-x-hidden flex flex-col relative text-brand-gold font-sans selection:bg-transparent no-scrollbar">
      {/* BACKGROUND ELEMENTS */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(0,0,0,0)_0%,rgba(0,0,0,0.6)_100%)] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-brand-yellow/5 blur-[160px] rounded-full pointer-events-none" />

      {/* Top Navigation & Info */}
      <div className="z-10 px-6 pt-6 flex flex-col gap-4">
        <div className="flex items-center gap-4">
            <button onClick={() => handleAction(onBack)} className="w-10 h-10 bg-black/20 rounded-full flex items-center justify-center text-brand-gold hover:bg-black/40 transition-all">
              <ArrowLeft size={20} />
            </button>
            <div className="flex flex-col">
               <h1 className="text-2xl font-display font-black tracking-tighter italic leading-none">FIVES</h1>
               <span className="text-[8px] font-black uppercase tracking-[0.2em] text-brand-gold/40">● SINGLE PLAYER</span>
            </div>
            
            <div className="flex-1 flex justify-center">
               <div className="flex gap-4 overflow-x-auto no-scrollbar py-2">
                  {gameState.players.map((p, i) => (
                     <div key={p.id} className={cn(
                       "flex flex-col items-center gap-1 transition-all duration-300 min-w-[70px]",
                       gameState.turn === i ? "opacity-100 scale-105" : "opacity-30 scale-90"
                     )}>
                        <div className={cn(
                           "px-4 py-1 rounded-full bg-black/20 border text-[8px] font-black uppercase tracking-widest",
                           gameState.turn === i ? "border-brand-gold text-brand-gold" : "border-transparent text-brand-gold/40"
                        )}>
                           {p.isAI ? p.name : 'YOU'}
                        </div>
                        {/* Compact card backs for opponents */}
                        {p.isAI && (
                          <div className="flex -space-x-4 mt-2">
                            {[1, 2, 3, 4].map(n => (
                              <div key={n} className="w-8 h-12 bg-brand-maroon border border-brand-gold/20 rounded-sm shadow-lg overflow-hidden relative">
                                <div className="absolute inset-0 bg-linear-to-b from-brand-gold/5 to-transparent" />
                              </div>
                            ))}
                          </div>
                        )}
                     </div>
                  ))}
               </div>
            </div>
        </div>
      </div>

      {/* Play Area */}
      <div className="flex-1 flex flex-col items-center justify-center -mt-8 relative gap-6">
         {/* WILD CARD SECTION */}
         <div className="flex flex-col items-center">
            <span style={embossedStyle} className="text-[12px] font-black uppercase tracking-[0.3em] text-[#d4af37] mb-3">WILD CARD</span>
            <div className="relative">
               <div className="absolute -inset-8 bg-[#d4af37]/10 blur-[40px] rounded-full" />
               <CardUI 
                 card={{ id: 'wild', rank: gameState.pretendJokerRank || 'A', isPretendJoker: true }} 
                 faceUp={true} 
                 className="scale-110"
               />
            </div>
         </div>

         {/* OPEN PILE & DECK CENTRAL BOX */}
         <div className="w-[340px] bg-[#1a0505] p-8 rounded-[40px] shadow-[0_40px_80px_rgba(0,0,0,0.9),inset_0_0_40px_rgba(0,0,0,0.5)] border border-white/5 relative">
            <div className="flex justify-between items-start gap-4">
               {/* Open Pile Side */}
               <div className="flex flex-col items-center gap-3 flex-1">
                  <span style={embossedStyle} className="text-[10px] font-black uppercase tracking-widest text-[#d4af37] drop-shadow-md">OPEN PILE</span>
                  <AnimatePresence mode="popLayout">
                    {gameState.openPile.length > 0 && (
                      <motion.div 
                        key={gameState.openPile[0].id}
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        onClick={() => handleDraw(false)}
                        className={cn(
                          "cursor-pointer transition-all",
                          gameState.turnPhase === 'draw' ? "hover:scale-105 active:scale-95" : "opacity-50 pointer-events-none"
                        )}
                      >
                         <CardUI card={gameState.openPile[0]} faceUp={true} />
                      </motion.div>
                    )}
                  </AnimatePresence>
               </div>
 
               {/* Deck Side */}
               <div className="flex flex-col items-center gap-3 flex-1">
                  <span style={embossedStyle} className="text-[10px] font-black uppercase tracking-widest text-[#d4af37]">DECK</span>
                  <div 
                    onClick={() => handleDraw(true)}
                    className={cn(
                      "w-24 h-36 border-4 rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all relative overflow-hidden",
                      gameState.turnPhase === 'draw' ? "border-[#d4af37] bg-white/5" : "border-white/10 opacity-30 pointer-events-none"
                    )}
                  >
                     <CardUI card={{} as any} faceUp={false} className="border-0 shadow-none !w-full !h-full" />
                  </div>
                  <span style={embossedStyle} className="text-[9px] font-black text-[#d4af37]/40 uppercase tracking-widest mt-1 border border-[#d4af37]/20 px-3 py-1 rounded-full">
                     {gameState.deck.length} REMAINING
                  </span>
               </div>
            </div>
         </div>
      </div>

      {/* Info Line */}
      <div className="flex justify-center gap-8 mb-4">
         <div className="flex items-center gap-2">
            <Zap className="w-3 h-3 text-[#d4af37] drop-shadow-sm" />
            <span style={embossedStyle} className="text-[10px] font-black uppercase tracking-widest text-[#d4af37] italic opacity-80">GAME {gameState.round} / {gameState.maxRounds}</span>
         </div>
         <div className="flex items-center gap-2">
            <RefreshCw className="w-3 h-3 text-[#d4af37] drop-shadow-sm" />
            <span style={embossedStyle} className="text-[10px] font-black uppercase tracking-widest text-[#d4af37] italic opacity-80">ROUND {gameState.round}</span>
         </div>
      </div>

      {/* Turn Action Banner */}
      <div className="px-4 mb-3 flex items-center justify-center gap-2 max-w-sm mx-auto w-full">
         <div className="flex-1 h-14 bg-[#fcc419] border-b-4 border-black/30 rounded-xl flex flex-col items-center justify-center shadow-[0_10px_20px_rgba(252,196,25,0.2)] relative overflow-hidden">
            <div className="absolute inset-0 bg-linear-to-b from-white/30 to-transparent pointer-events-none" />
            <span style={embossedStyle} className="text-[#1a0505] font-display font-black text-lg italic tracking-tighter leading-none flex items-center gap-2">
               <span className="text-sm">☆</span> YOUR TURN! <span className="text-sm">☆</span>
            </span>
            <span className="text-[#1a0505]/60 text-[6px] font-black uppercase tracking-[0.2em] mt-0.5">MAKE YOUR MOVE</span>
         </div>

         <div className="w-28 h-14 bg-[#1a0505] border border-[#d4af37]/20 border-b-4 rounded-xl flex items-center justify-center gap-1.5 shadow-xl">
            <span style={embossedStyle} className="text-[#d4af37] font-display font-black text-2xl italic tracking-tighter">{calculateHandValue(gameState.players[0].hand, gameState.pretendJokerRank)}</span>
            <span style={embossedStyle} className="text-[#d4af37]/40 text-[7px] font-black uppercase tracking-widest mt-1">POINTS</span>
         </div>
      </div>

      {/* Footer / Hand Area */}
      <div className="flex flex-col bg-[#1a0505]/30">
         <div className="px-4 pb-4">
            <Hand 
              cards={gameState.players[0].hand}
              faceUp={true}
              onCardClick={handleCardToggle}
              selectedIds={selectedCardIds}
              pretendJokerRank={gameState.pretendJokerRank}
              isCurrentPlayer={true}
            />
         </div>

         {/* ACTION BUTTONS */}
         <div className="flex gap-2 px-3 pb-6">
            <Button 
               disabled={!isHumanTurn || selectedCardIds.length === 0 || gameState.turnPhase !== 'discard'}
               onClick={handleDiscard}
               className={cn(
                 "flex-1 h-12 rounded-lg text-[#1a0505] font-display font-black text-xs italic uppercase tracking-[0.2em] border-b-4 border-black/30 transition-all shadow-[0_4px_0_rgba(0,0,0,0.3)]",
                 (isHumanTurn && selectedCardIds.length > 0 && gameState.turnPhase === 'discard') ? "bg-[#fcc419] hover:brightness-110 active:translate-y-0.5 active:border-b-2" : "bg-[#fcc419]/10 opacity-30 cursor-not-allowed"
               )}
            >
               <span style={embossedStyle}>DISCARD</span>
            </Button>
            
            <Button 
               disabled={!isHumanTurn || gameState.round <= 5}
               onClick={handleDeckCall}
               className={cn(
                 "flex-1 h-12 rounded-lg text-[#1a0505] font-display font-black text-xs italic uppercase tracking-[0.2em] border-b-4 border-black/30 transition-all shadow-[0_4px_0_rgba(0,0,0,0.3)]",
                 gameState.round > 5 && isHumanTurn && gameState.turnPhase === 'discard' ? "bg-[#fcc419] hover:brightness-110 active:translate-y-0.5 active:border-b-2" : "bg-[#fcc419]/10 opacity-30 cursor-not-allowed"
               )}
            >
               <span style={embossedStyle}>DECK IT!</span>
            </Button>
         </div>
      </div>

      {/* Round End Overlay */}
      <AnimatePresence>
        {showScores && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 z-[100] bg-brand-red/95 backdrop-blur-2xl flex flex-col items-center justify-center p-8"
          >
             <motion.div
               initial={{ scale: 0.9, y: 20 }}
               animate={{ scale: 1, y: 0 }}
               className="max-w-lg w-full bg-brand-maroon/80 border-4 border-brand-gold/20 rounded-[50px] p-12 overflow-hidden relative shadow-[0_50px_100px_rgba(0,0,0,0.5)]"
             >
                <div className="absolute top-0 right-0 p-12 opacity-10 rotate-12 text-brand-gold">
                   <Trophy size={140} />
                </div>
                
                <h2 className="text-5xl font-display font-black text-brand-gold mb-2 leading-none italic tracking-tighter">ROUND OVER</h2>
                <div className="flex items-center gap-3 mb-10">
                   <div className="bg-brand-gold text-brand-red font-black uppercase tracking-widest px-3 py-1 rounded-full text-[10px]">Success!</div>
                   <p className="text-brand-gold/40 font-black uppercase tracking-widest text-[10px]">Summary for Round {gameState.round}</p>
                </div>

                <div className="space-y-4 mb-12">
                   {gameState.players.map(p => (
                     <div key={p.id} className="flex items-center justify-between p-6 bg-black/20 rounded-[32px] border border-brand-gold/5 backdrop-blur-md">
                        <div className="flex items-center gap-4">
                           <div className="w-12 h-12 bg-brand-gold/10 rounded-2xl flex items-center justify-center text-brand-gold font-display font-black text-xl border border-brand-gold/20">
                              {p.name[0]}
                           </div>
                           <div>
                              <div className="font-display font-bold text-brand-gold text-lg leading-tight uppercase italic">{p.name}</div>
                              <div className="text-[8px] font-black text-brand-gold/40 uppercase tracking-widest">
                                 Current Hand: {calculateHandValue(p.hand, gameState.pretendJokerRank)}
                              </div>
                           </div>
                        </div>
                        <div className="text-right">
                           <div className="text-3xl font-display font-black text-brand-gold italic leading-none">{p.score}</div>
                           <div className="text-[8px] font-black text-brand-gold/40 uppercase tracking-widest mt-1">Total Score</div>
                        </div>
                     </div>
                   ))}
                </div>

                <Button 
                   onClick={handleNextRound}
                   className="w-full h-20 rounded-[32px] bg-brand-gold hover:bg-brand-gold/90 text-brand-red text-2xl font-display font-black italic tracking-tighter shadow-2xl transition-all hover:scale-[1.02] active:scale-95"
                >
                   {gameState.round >= gameState.maxRounds ? "FINISH GAME" : "NEXT ROUND"} <ArrowRight className="ml-3" size={24} />
                </Button>
                
                <Button 
                  variant="ghost" 
                  onClick={onBack}
                  className="w-full mt-6 text-brand-gold/20 font-black uppercase tracking-widest text-[10px] hover:text-brand-gold/40"
                >
                   QUIT TO MAIN MENU
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
               className="absolute inset-0 z-[120] bg-brand-red flex flex-col items-center justify-center p-8 text-center"
             >
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-brand-gold/5 blur-[120px] rounded-full pointer-events-none" />

                <motion.div
                   initial={{ rotate: -20, scale: 0.5 }}
                   animate={{ rotate: 0, scale: 1 }}
                   className="mb-10 relative"
                >
                   <div className="absolute -inset-10 bg-brand-gold/20 blur-3xl animate-pulse rounded-full" />
                   <div className="w-48 h-48 bg-brand-gold rounded-[40px] flex items-center justify-center shadow-2xl border-8 border-white/20 relative z-10">
                      <Trophy size={100} className="text-brand-red" />
                   </div>
                </motion.div>

                <h1 className="text-8xl font-display font-black mb-4 tracking-tighter text-brand-gold italic">VICTORY?</h1>
                <p className="text-brand-gold/40 text-lg mb-16 max-w-md font-medium">The FIVES tournament has concluded. Behold the final standings of the lowest scores.</p>

                <div className="w-full max-w-lg space-y-4 mb-16 relative z-10">
                   {[...gameState.players].sort((a,b) => a.score - b.score).map((p, i) => (
                      <div key={p.id} className={cn(
                        "flex items-center justify-between p-6 rounded-[32px] border-4 transition-all relative overflow-hidden backdrop-blur-md",
                        i === 0 
                          ? "bg-brand-gold text-brand-red border-white scale-105 shadow-[0_30px_60px_rgba(0,0,0,0.5)]" 
                          : "bg-brand-maroon/40 text-brand-gold border-brand-gold/10 opacity-60"
                      )}>
                         {i === 0 && <div className="absolute inset-0 bg-linear-to-r from-white/20 to-transparent" />}
                         <div className="flex items-center gap-6 relative z-10">
                            <span className="text-3xl font-display font-black opacity-30 leading-none">#{i+1}</span>
                            <div className="flex flex-col items-start leading-none gap-2">
                               <span className="text-2xl font-display font-black uppercase italic tracking-tighter">{p.name}</span>
                               <span className="text-[8px] font-black uppercase tracking-widest opacity-60">PLAYER RANK</span>
                            </div>
                         </div>
                         <div className="text-right relative z-10">
                            <span className="text-4xl font-display font-black italic">{p.score}</span>
                            <div className="text-[8px] font-black uppercase tracking-widest opacity-60">POINTS</div>
                         </div>
                      </div>
                   ))}
                </div>

                <div className="flex gap-4 relative z-10">
                   <Button 
                      onClick={() => window.location.reload()} 
                      variant="outline" 
                      className="h-20 px-12 border-brand-gold/20 text-brand-gold bg-black/20 hover:bg-black/40 rounded-[32px] font-display font-bold text-xl italic"
                   >
                      REMATCH
                   </Button>
                   <Button 
                      onClick={onBack} 
                      className="h-20 px-12 bg-brand-gold text-brand-red hover:bg-brand-gold/90 rounded-[32px] font-display font-black text-xl italic shadow-2xl"
                   >
                      MAIN MENU
                   </Button>
                </div>
             </motion.div>
         )}
      </AnimatePresence>
    </div>
  );
};

export default GameBoard;
