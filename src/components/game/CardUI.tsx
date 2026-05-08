import React from 'react';
import { motion } from 'motion/react';
import { Card as CardType } from '../../types/game';
import { getCardValue } from '../../utils/gameLogic';
import { cn } from '../../lib/utils';

interface CardUIProps {
  card: CardType;
  faceUp?: boolean;
  onClick?: () => void;
  selected?: boolean;
  pretendJokerRank?: string | null;
  className?: string;
  isSmall?: boolean;
}

const CardUI: React.FC<CardUIProps> = ({ 
  card, 
  faceUp = true, 
  onClick, 
  selected = false, 
  pretendJokerRank,
  className,
  isSmall = false
}) => {
  const isJoker = card.rank === 'Joker' || card.rank === pretendJokerRank;
  
  const getSuitSymbol = (suit?: string) => {
    switch (suit) {
      case 'hearts': return '♥';
      case 'diamonds': return '♦';
      case 'clubs': return '♣';
      case 'spades': return '♠';
      default: return '';
    }
  };

  const getColorClass = (suit?: string) => {
    if (suit === 'hearts' || suit === 'diamonds') return 'text-[#ff3b30]';
    return 'text-black';
  };

  if (!faceUp) {
    return (
      <motion.div
        whileHover={onClick ? { y: -5 } : {}}
        onClick={onClick}
        className={cn(
          "relative rounded-xl cursor-pointer overflow-hidden transition-all",
          isSmall ? "w-14 h-20 border-2" : "w-24 h-36 border-4",
          "bg-linear-to-br from-[#1a0505] to-[#000000] border-[#d4af37]/20 shadow-[0_10px_20px_rgba(0,0,0,0.6)]",
          className
        )}
      >
        <div className="absolute inset-0 flex flex-col items-center justify-center p-2">
           <div className="bg-white/5 w-full h-full rounded-lg flex flex-col items-center justify-center border border-white/5">
              <div className="opacity-20 flex flex-col items-center">
                <span className="text-brand-gold text-[8px] font-black tracking-widest uppercase">Card Back</span>
              </div>
           </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      whileHover={onClick ? { y: -5 } : {}}
      animate={selected ? { y: -20, scale: 1.05 } : { y: 0, scale: 1 }}
      onClick={onClick}
      className={cn(
        "relative rounded-xl cursor-pointer bg-white select-none overflow-hidden transition-all shadow-[0_10px_20px_rgba(0,0,0,0.4)]",
        isSmall ? "w-14 h-20 p-1.5" : "w-24 h-36 p-2",
        "border-[3px]",
        selected ? "border-[#d4af37] ring-4 ring-[#d4af37]/30" : "border-slate-100",
        className
      )}
    >
      <div className={cn("flex flex-col h-full", getColorClass(card.suit))}>
        {/* Top Left */}
        <div className="flex flex-col items-start leading-none">
          <span className={cn("font-bold", isSmall ? "text-lg" : "text-xl")} style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.1)' }}>
             {card.rank === 'Joker' ? 'J' : card.rank}
          </span>
          <span className={cn("font-bold -mt-1", isSmall ? "text-xs" : "text-sm")}>{getSuitSymbol(card.suit)}</span>
        </div>
        
        {/* Center */}
        <div className="flex-1 flex flex-col items-center justify-center relative">
           {card.rank === 'Joker' ? (
             <div className="flex flex-col items-center">
               <div className={cn("text-[#ff3b30] drop-shadow-sm font-black italic", isSmall ? "text-xl" : "text-3xl")}>JK</div>
               <div className="bg-[#f5e4c3] px-2 py-0.5 rounded-full border border-[#d4af37]/40 shadow-sm mt-1">
                  <span className="text-[#d4af37] text-[6px] font-black uppercase tracking-tight">JOKER</span>
               </div>
             </div>
           ) : (
             <div className={cn("font-bold drop-shadow-sm transition-all", isSmall ? "text-2xl" : "text-4xl")}>
                {getSuitSymbol(card.suit)}
             </div>
           )}
           
           {card.isPretendJoker && card.rank !== 'Joker' && (
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#f5e4c3] px-2 py-0.5 rounded-full border border-[#d4af37] shadow-sm">
                 <span className="text-[#d4af37] text-[6px] font-black uppercase tracking-tight">JOKER</span>
              </div>
           )}
        </div>

        {/* Bottom Right */}
        <div className="flex flex-col items-end leading-none rotate-180">
          <span className={cn("font-bold", isSmall ? "text-lg" : "text-xl")}>
             {card.rank === 'Joker' ? 'J' : card.rank}
          </span>
          <span className={cn("font-bold -mt-1", isSmall ? "text-xs" : "text-sm")}>{getSuitSymbol(card.suit)}</span>
        </div>
      </div>
    </motion.div>
  );
};

export default CardUI;
