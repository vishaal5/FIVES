/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  createRoom, 
  joinRoom, 
  subscribeToGame, 
  subscribeToPlayers, 
  updateGameState, 
  updatePlayerState,
} from '../../services/multiplayerService';
import { auth } from '../../lib/firebase';
import { createDeck, getInitSetup, calculateHandValue, getCardValue } from '../../utils/gameLogic';
import type { Card, GameState, Player, Rank } from '../../types/game';
import Hand from './Hand';
import CardUI from './CardUI';
import { Button } from '../ui/button';
import { Users, Copy, Check, LogOut, ArrowRight, RefreshCw, AlertTriangle, Trophy } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useSound } from '../../hooks/useSound';

interface MultiplayerGameProps {
  roomId: string;
  isHost: boolean;
  onBack: () => void;
}

const MultiplayerGame: React.FC<MultiplayerGameProps> = ({ roomId, isHost, onBack }) => {
  const [game, setGame] = useState<any>(null);
  const [players, setPlayers] = useState<any[]>([]);
  const [selectedCardIds, setSelectedCardIds] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const [isLobby, setIsLobby] = useState(true);
  const [jokerWarning, setJokerWarning] = useState(false);
  const { playClick } = useSound();

  const handleAction = (action: () => void) => {
    playClick();
    action();
  };

  const me = players.find(p => p.id === auth.currentUser?.uid);
  const isMyTurn = game?.status === 'playing' && players[game?.turn]?.id === auth.currentUser?.uid;

  useEffect(() => {
    const unsubGame = subscribeToGame(roomId, (data) => {
      setGame(data);
      if (data.status !== 'waiting') setIsLobby(false);
    });
    const unsubPlayers = subscribeToPlayers(roomId, (data) => {
      setPlayers(data);
    });

    return () => {
      unsubGame();
      unsubPlayers();
    };
  }, [roomId]);

  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleStartGame = async () => {
    if (!isHost || players.length < 2) return;

    const deck = createDeck();
    const { pretendJokerRank, openCard } = getInitSetup(deck);

    // Deal cards
    for (const player of players) {
      const hand = [];
      for (let i = 0; i < 5; i++) hand.push(deck.pop()!);
      await updatePlayerState(roomId, player.id, { hand });
    }

    await updateGameState(roomId, {
      status: 'playing',
      deckCount: deck.length,
      openPile: [openCard],
      pretendJokerRank,
      round: 1,
      turn: 0,
      // In a real app we might store the deck itself encrypted or in a separate restricted collection
      // For this prototype we'll assume the deck is managed by host or just use count
    });
    // Store remaining deck in local state if host? 
    // This is tricky for pure client-side. 
    // Let's simplify: the deck is regenerated locally by the host if they need to draw.
    // Ideally we should store the deck in a hidden collection.
  };

  const handleDraw = async (fromDeck: boolean) => {
    if (!isMyTurn || selectedCardIds.length === 0) return;

    handleAction(async () => {
    const cardsToDiscard = me.hand.filter((c: Card) => selectedCardIds.includes(c.id));
    const newHand = me.hand.filter((c: Card) => !selectedCardIds.includes(c.id));
    
    // Discard
    const newOpenPile = [...cardsToDiscard, ...game.openPile];
    
    let drawnCard: Card;
    let newDeckCount = game.deckCount;

    if (fromDeck) {
       const deck = createDeck(); 
       drawnCard = deck.pop()!;
       newDeckCount = Math.max(0, game.deckCount - 1);
    } else {
       drawnCard = newOpenPile.shift()!;
    }

    newHand.push(drawnCard);
    
    await updatePlayerState(roomId, me.id, { hand: newHand });
    await updateGameState(roomId, {
      openPile: newOpenPile,
      deckCount: newDeckCount,
      turn: (game.turn + 1) % players.length,
      round: (game.turn + 1) === players.length ? game.round + 1 : game.round
    });

    setSelectedCardIds([]);
    });
  };

  const handleCardToggle = (id: string) => {
    if (!isMyTurn) return;
    
    handleAction(() => {
    setSelectedCardIds(prev => {
        const isAlreadySelected = prev.includes(id);
        const card = me.hand.find((c: Card) => c.id === id);
        
        if (!isAlreadySelected && card) {
           if (card.rank === 'Joker' || card.rank === game?.pretendJokerRank) {
              setJokerWarning(true);
              setTimeout(() => setJokerWarning(false), 3000);
           }
        }
        
        return isAlreadySelected ? prev.filter(x => x !== id) : [...prev, id];
    });
    });
  };

  if (isLobby) {
    return (
      <div className="min-h-screen bg-brand-red flex items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-brand-yellow/10 blur-[120px] rounded-full pointer-events-none" />
        
        <div className="max-w-md w-full z-10 bg-brand-maroon/60 backdrop-blur-xl border-4 border-brand-gold/10 rounded-[50px] shadow-2xl overflow-hidden">
          <div className="bg-brand-maroon p-10 text-brand-gold text-center border-b border-brand-gold/10">
             <div className="w-20 h-20 bg-brand-gold/5 border border-brand-gold/20 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl">
                <Users size={32} className="text-brand-gold/60" />
             </div>
             <h2 className="text-3xl font-display font-black mb-2 italic tracking-tight">GAME LOBBY</h2>
             <p className="text-brand-gold/40 text-[10px] font-black uppercase tracking-widest">Waiting for players to join...</p>
          </div>
          
          <div className="p-10 space-y-8">
             <div>
                <label className="text-[10px] font-black text-brand-gold/40 uppercase tracking-widest mb-3 block text-center">Room ID / Duel Code</label>
                <div className="flex bg-brand-maroon/80 border-2 border-brand-gold/10 rounded-2xl p-2 items-center">
                   <div className="flex-1 text-center font-display text-4xl font-black text-brand-gold tracking-[0.2em]">{roomId}</div>
                   <Button variant="ghost" onClick={copyRoomId} className="rounded-xl h-14 w-14 p-0 text-brand-gold/40 hover:text-brand-gold hover:bg-brand-gold/10">
                      {copied ? <Check size={24} /> : <Copy size={24} />}
                   </Button>
                </div>
             </div>

             <div className="space-y-4">
                <div className="flex justify-between items-center px-2">
                   <label className="text-[10px] font-black text-brand-gold/40 uppercase tracking-widest">Active Challengers</label>
                   <span className="text-brand-gold/60 font-bold text-sm">{players.length} / 4</span>
                </div>
                <div className="space-y-2">
                   {players.map(p => (
                      <div key={p.id} className="flex items-center gap-4 p-4 bg-brand-maroon border border-brand-gold/5 rounded-2xl shadow-inner">
                         <div className="w-10 h-10 rounded-full bg-brand-gold/10 border border-brand-gold/20 flex items-center justify-center text-brand-gold font-black text-sm">
                            {p.name[0]}
                         </div>
                         <div className="flex-1">
                            <span className="font-display font-medium text-brand-gold">{p.name} {p.id === auth.currentUser?.uid && "(You)"}</span>
                         </div>
                         {p.id === game?.hostId && (
                           <div className="px-3 py-1 bg-brand-gold text-brand-red rounded-lg text-[8px] font-black uppercase tracking-widest">
                              HOST
                           </div>
                         )}
                      </div>
                   ))}
                </div>
                {players.length < 2 && (
                   <div className="text-center py-4 text-brand-gold/20 text-[10px] font-black uppercase tracking-widest italic">
                      Need at least 2 players to start...
                   </div>
                )}
             </div>

             <div className="flex gap-4 pt-4">
                <Button variant="ghost" onClick={onBack} className="flex-1 rounded-2xl text-brand-gold/40 h-16 font-bold hover:text-brand-gold">LEAVE</Button>
                {isHost && (
                   <Button 
                      disabled={players.length < 2}
                      onClick={handleStartGame}
                      className="flex-[2] rounded-[24px] bg-brand-gold text-brand-red hover:bg-brand-gold/90 font-black h-16 text-xl shadow-xl shadow-brand-gold/10"
                   >
                      START DUEL
                   </Button>
                )}
             </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-red text-brand-gold flex flex-col relative overflow-hidden">
       {/* GOLDEN BORDER */}
       <div className="absolute inset-0 border-[12px] border-brand-gold/10 pointer-events-none z-50 pointer-events-none shadow-[inset_0_0_60px_rgba(0,0,0,0.5)]" />

       <div className="px-6 pt-10 pb-6 bg-black/40 backdrop-blur-xl flex justify-between items-start z-10 border-b border-brand-gold/5 shadow-2xl">
          <div className="flex items-start gap-4">
             <Button variant="ghost" onClick={() => handleAction(onBack)} className="text-brand-gold/40 hover:text-brand-gold hover:bg-brand-gold/10 mt-1">
                <ArrowLeft size={24}/>
             </Button>
             
             <div className="flex gap-4 overflow-x-auto no-scrollbar max-w-[320px] py-2">
                {players.map((p, idx) => (
                   <div key={p.id} className={cn(
                     "flex flex-col items-center gap-1 transition-all duration-300 min-w-[80px]",
                     game?.turn === idx ? "opacity-100 scale-110" : "opacity-40 scale-100"
                   )}>
                      <div className={cn(
                        "w-16 h-20 rounded-[28px] bg-brand-maroon border-2 flex flex-col items-center justify-center shadow-2xl relative overflow-hidden",
                        game?.turn === idx ? "border-brand-gold" : "border-brand-gold/10"
                      )}>
                         <div className="absolute top-0 left-0 w-full h-1 bg-brand-gold/10" />
                         <span className="text-xl font-display font-black text-brand-gold text-embossed">{p.score}</span>
                         <span className="text-[7px] font-black uppercase text-brand-gold/40 tracking-widest mt-0.5">SCORE</span>
                      </div>
                      <span className="text-[9px] font-black uppercase tracking-[0.2em] text-center truncate w-full text-embossed italic">
                        {p.name}
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
                     card={{ id: 'wild', rank: game?.pretendJokerRank || 'A', isPretendJoker: true }} 
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
                   className="mt-10 px-6 py-3 bg-brand-yellow text-brand-red rounded-2xl flex items-center gap-3 shadow-2xl border-4 border-white z-[100]"
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
                <span className="text-3xl font-display font-black leading-none italic text-embossed">{game?.round}<span className="text-xs opacity-20 ml-1">/ {game?.maxRounds || 5}</span></span>
             </div>
          </div>
       </div>

       <div className="flex-1 flex flex-col items-center justify-center p-8">
          <div className="flex items-center gap-20 mb-12">
             <div className="flex flex-col items-center gap-4">
                <span className="text-[10px] font-black uppercase tracking-widest text-brand-gold/40">Open Pile</span>
                {game?.openPile?.length > 0 ? (
                  <motion.div 
                    key={game.openPile[0].id}
                    initial={{ scale: 0.8, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    onClick={() => handleDraw(false)}
                  >
                     <CardUI card={game.openPile[0]} faceUp={true} />
                  </motion.div>
                ) : (
                  <div className="w-24 h-36 bg-brand-maroon/40 rounded-xl border-2 border-brand-gold/5" />
                )}
             </div>

             <div className="flex flex-col items-center gap-4">
                <span className="text-[10px] font-black uppercase tracking-widest text-brand-gold/40">Deck</span>
                <div 
                   onClick={() => handleDraw(true)}
                   className="w-24 h-36 bg-brand-maroon rounded-xl border-2 border-brand-gold/20 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-brand-gold/60 transition-all group shadow-2xl"
                >
                   <div className="w-10 h-10 border border-brand-gold/20 rounded-full flex items-center justify-center text-brand-gold/40 group-hover:text-brand-gold group-hover:border-brand-gold transition-colors">
                      <RefreshCw size={16} />
                   </div>
                   <span className="text-[8px] font-black text-brand-gold/20 uppercase tracking-widest">{game?.deckCount || 0} CARDS</span>
                </div>
             </div>
          </div>

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
       
       <div className="p-8 bg-black/60 backdrop-blur-3xl border-t border-brand-gold/10 shadow-[0_-20px_50px_-12px_rgba(0,0,0,0.5)]">
         <div className="max-w-5xl mx-auto flex items-end justify-between gap-8">
            <div className="flex flex-col gap-4">
               <div className="flex flex-col">
                  <span className={cn(
                    "text-3xl font-display font-black transition-colors italic",
                    isMyTurn ? "text-brand-gold" : "text-brand-gold/20"
                  )}>
                    {isMyTurn ? 'YOUR TURN!' : 'CHALLENGER TURN...'}
                  </span>
                  <span className="text-[10px] font-black uppercase tracking-[0.4em] text-brand-gold/40">Real-time Duel</span>
               </div>
            </div>

            <div className="flex-1 flex justify-center">
               <div className="relative -mb-6">
                  <Hand 
                    cards={me?.hand || []} 
                    faceUp={true} 
                    onCardClick={(id) => setSelectedCardIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])}
                    selectedIds={selectedCardIds}
                    pretendJokerRank={game?.pretendJokerRank}
                    isCurrentPlayer={true}
                  />
               </div>
            </div>

            <div className="flex flex-col items-end gap-3">
               <div className="bg-brand-gold text-brand-red px-6 py-3 rounded-2xl flex flex-col items-end shadow-2xl">
                  <span className="text-[10px] font-black uppercase tracking-widest opacity-60 leading-none">Hand Value</span>
                  <span className="text-3xl font-display font-bold leading-none mt-1">
                    {calculateHandValue(me?.hand || [], game?.pretendJokerRank)}
                  </span>
               </div>
               
               <div className="flex gap-2">
                 {selectedCardIds.length > 0 && isMyTurn && (
                    <Button 
                       onClick={() => {}} // Discard is triggered by drawing (which replaces selection)
                       className="h-14 px-8 rounded-2xl bg-brand-gold text-brand-red hover:bg-brand-gold/90 font-black relative overflow-hidden group shadow-xl"
                    >
                       <div className="absolute inset-x-0 bottom-0 h-1 bg-black/20 animate-pulse" />
                       DISCARD
                    </Button>
                 )}
               </div>
            </div>
         </div>
       </div>
    </div>
  );
};


export default MultiplayerGame;
