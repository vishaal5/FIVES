
import React from 'react';
import { Card as CardType, Rank } from '../../types/game';
import CardUI from './CardUI';
import { motion, AnimatePresence } from 'motion/react';

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
    <div className="flex justify-center -space-x-12 p-4 min-h-[160px]">
      <AnimatePresence>
        {cards.map((card, index) => (
          <motion.div
            key={card.id}
            initial={{ opacity: 0, x: -20, y: 50 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            transition={{ delay: index * 0.05 }}
            style={{ zIndex: index }}
          >
            <CardUI
              card={card}
              faceUp={faceUp}
              onClick={onCardClick ? () => onCardClick(card.id) : undefined}
              selected={selectedIds.includes(card.id)}
              pretendJokerRank={pretendJokerRank}
              className={isCurrentPlayer ? "hover:z-50" : ""}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default Hand;
