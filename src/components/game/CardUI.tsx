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
    if (suit === 'hearts' || suit === 'diamonds') return 'text-red-700';
    return 'text-slate-900';
  };

  if (!faceUp) {
    return (
      <motion.div
        whileHover={onClick ? { y: -10 } : {}}
        onClick={onClick}
        className={cn(
          "relative border-2 border-brand-gold/30 rounded-xl shadow-2xl cursor-pointer overflow-hidden",
          isSmall ? "w-14 h-20" : "w-24 h-36",
          "bg-brand-maroon",
          className
        )}
      >
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
          <div className="w-12 h-12 border border-brand-gold/20 rounded-full flex items-center justify-center">
             <span className="text-brand-gold/40 font-display font-bold text-[8px] tracking-widest">FIVES</span>
          </div>
          <div className="grid grid-cols-2 gap-1 opacity-10">
             <span className="text-brand-gold text-[8px]">♥</span>
             <span className="text-brand-gold text-[8px]">♠</span>
             <span className="text-brand-gold text-[8px]">♣</span>
             <span className="text-brand-gold text-[8px]">♦</span>
          </div>
        </div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.4)_100%)]" />
      </motion.div>
    );
  }

  return (
    <motion.div
      whileHover={onClick ? { y: -10 } : {}}
      animate={selected ? { y: -20, scale: 1.05 } : { y: 0, scale: 1 }}
      onClick={onClick}
      className={cn(
        "relative rounded-xl shadow-2xl cursor-pointer bg-white border-2 select-none overflow-hidden",
        isSmall ? "w-14 h-20 p-1" : "w-24 h-36 p-2",
        selected ? "border-brand-gold ring-4 ring-brand-gold/20" : "border-slate-200",
        className
      )}
    >
      <div className={cn("flex flex-col h-full", getColorClass(card.suit))}>
        <div className="flex justify-between items-start">
          <span className={cn("font-bold leading-none selection:bg-transparent", isSmall ? "text-sm" : "text-xl")}>
            {card.rank === 'Joker' ? '★' : card.rank}
          </span>
          <span className={isSmall ? "text-xs" : "text-sm"}>{getSuitSymbol(card.suit)}</span>
        </div>
        
        <div className="flex-1 flex items-center justify-center">
           {card.rank === 'Joker' ? (
             <div className="text-brand-gold text-4xl drop-shadow-sm">★</div>
           ) : (
             <div className={cn("font-bold opacity-10 font-display", isSmall ? "text-2xl" : "text-6xl")}>
                {getSuitSymbol(card.suit)}
             </div>
           )}
        </div>

        <div className="flex justify-between items-end rotate-180">
          <span className={cn("font-bold leading-none selection:bg-transparent", isSmall ? "text-sm" : "text-xl")}>
             {card.rank === 'Joker' ? '★' : card.rank}
          </span>
          <span className={isSmall ? "text-xs" : "text-sm"}>{getSuitSymbol(card.suit)}</span>
        </div>

        {isJoker && (
           <div className={cn(
             "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-brand-gold text-brand-red font-black rounded-lg flex items-center justify-center px-2 py-0.5 shadow-lg",
             isSmall ? "text-[6px]" : "text-[8px] tracking-widest"
           )}>
             WILD
           </div>
        )}
      </div>
    </motion.div>
  );
};

export default CardUI;
