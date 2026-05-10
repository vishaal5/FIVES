
import React from 'react';
import { Card as CardType, Rank } from '../../types/game';
import CardUI from './CardUI';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';

interface HandProps {
  cards: CardType[];
  faceUp?: boolean;
  onCardClick?: (cardId: string) => void;
  selectedIds?: string[];
  pretendJokerRank?: Rank | null;
  isCurrentPlayer?: boolean;
}

const Hand: React.FC<HandProps> = ({ 
  cards, 
  faceUp = false, 
  onCardClick, 
  selectedIds = [], 
  pretendJokerRank,
  isCurrentPlayer = false
}) => {
  return (
    <div className="flex justify-center -space-x-8 p-4 min-h-[160px] relative">
      <div className="absolute inset-0 bg-brand-gold/5 blur-[80px] rounded-full pointer-events-none" />
      <AnimatePresence>
        {cards.map((card, index) => (
          <motion.div
            key={card.id}
            initial={{ opacity: 0, scale: 0.8, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, y: -50, scale: 0.5 }}
            transition={{ type: 'spring', damping: 15, stiffness: 100, delay: index * 0.05 }}
            style={{ zIndex: index }}
            className="relative"
          >
            <CardUI
              card={card}
              faceUp={faceUp}
              onClick={onCardClick ? () => onCardClick(card.id) : undefined}
              selected={selectedIds.includes(card.id)}
              pretendJokerRank={pretendJokerRank}
              className={cn(
                "transition-all duration-300",
                isCurrentPlayer ? "hover:z-50 hover:-translate-y-4" : ""
              )}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default Hand;
