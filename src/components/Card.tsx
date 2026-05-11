import React from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'motion/react';
import { Card as CardType } from '../types';
import { cn } from '../lib/utils';
import { Heart, Diamond, Club, Spade, Star } from 'lucide-react';

import logoImg from '../assets/images/regenerated_image_1778248576867.jpg';

interface CardProps {
  card: CardType;
  isFaceUp?: boolean;
  onClick?: () => void;
  isSelected?: boolean;
  className?: string;
  isJoker?: boolean;
}

const suitIcons = {
  joker: <Star className="w-6 h-6 text-brand-gold fill-current" />,
};

export const Card: React.FC<CardProps> = ({ 
  card, 
  isFaceUp = true, 
  onClick, 
  isSelected, 
  className,
  isJoker
}) => {
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const mouseXSpring = useSpring(x);
  const mouseYSpring = useSpring(y);

  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["15deg", "-15deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-15deg", "15deg"]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const xPct = mouseX / width - 0.5;
    const yPct = mouseY / height - 0.5;
    x.set(xPct);
    y.set(yPct);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      style={{
        rotateX: isFaceUp ? rotateX : 0,
        rotateY: isFaceUp ? rotateY : 0,
        transformStyle: "preserve-3d",
      }}
      initial={{ scale: 0.5, opacity: 0, rotateY: 180 }}
      animate={{ 
        scale: 1, 
        opacity: 1, 
        rotateY: isFaceUp ? 0 : 180,
        y: isSelected ? -20 : 0
      }}
      whileHover={onClick ? { scale: 1.1, z: 50 } : {}}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      className={cn(
        "relative w-24 h-32 rounded-xl cursor-pointer shadow-xl transition-shadow duration-300 border-2",
        isFaceUp ? "bg-white border-black" : "bg-gradient-to-br from-[#800020] via-[#4D0013] to-black border-brand-gold/40",
        isSelected && "ring-4 ring-brand-gold shadow-[0_0_20px_rgba(212,175,55,0.5)]",
        className
      )}
    >
      {isFaceUp ? (
        <div className="flex flex-col h-full px-2 pt-1 pb-2 justify-between relative overflow-hidden select-none">
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(circle,black_1px,transparent_1px)] [background-size:10px_10px]" />
          
          <div className="flex flex-col items-start relative z-10">
            <span className={cn(
              "text-3xl font-black leading-[0.8] tracking-tighter drop-shadow-sm sm:text-4xl",
              (card.rank === 'JK' || isJoker) && "embossed",
              (card.suit === 'hearts' || card.suit === 'diamonds') ? "text-red-600" : (card.suit === 'joker' ? "text-brand-gold" : "text-slate-900")
            )}>
              {card.rank === 'JK' ? (isJoker ? '★' : '🃏') : card.rank}
            </span>
          </div>
          
          <div className="flex justify-center items-center relative z-10 flex-1">
            {isJoker || card.suit === 'joker' ? (
              <motion.div 
                animate={{ scale: [1, 1.05, 1] }} 
                transition={{ repeat: Infinity, duration: 3 }}
                className={cn(
                  "text-[7px] font-black px-2 py-0.5 rounded-full border border-brand-gold/50 uppercase tracking-[0.1em] shadow-[0_0_10px_rgba(212,175,55,0.2)]",
                  card.suit === 'joker' ? "text-brand-gold bg-brand-maroon/20 border-brand-gold" : "text-brand-gold bg-brand-maroon/20 border-brand-gold"
                )}
              >
                Joker
              </motion.div>
            ) : (
              <div className="opacity-[0.15] scale-[1.5]">
                {suitIcons[card.suit]}
              </div>
            )}
          </div>

          <div className="flex flex-col items-end rotate-180 relative z-10">
            <span className={cn(
              "text-3xl font-black leading-[0.8] tracking-tighter drop-shadow-sm sm:text-4xl",
              (card.rank === 'JK' || isJoker) && "embossed",
              (card.suit === 'hearts' || card.suit === 'diamonds') ? "text-red-600" : (card.suit === 'joker' ? "text-brand-gold" : "text-slate-900")
            )}>
              {card.rank === 'JK' ? (isJoker ? '★' : '🃏') : card.rank}
            </span>
          </div>
        </div>
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center [transform:rotateY(180deg)] px-2 gap-1 bg-brand-maroon overflow-hidden rounded-xl border border-brand-gold/20">
           <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle,white_1px,transparent_1px)] [background-size:8px_8px]" />
           <div className="w-16 h-16 sm:w-20 sm:h-20 bg-brand-maroon border-[3px] border-brand-gold/10 rounded-2xl flex items-center justify-center shadow-2xl relative overflow-hidden group mb-1">
              <div className="absolute inset-0 bg-linear-to-b from-white/10 to-transparent pointer-events-none" />
              <img 
                src={logoImg} 
                alt="Card Back" 
                className="w-full h-full object-contain scale-110 opacity-60"
                referrerPolicy="no-referrer"
              />
           </div>
        </div>
      )}
    </motion.div>
  );
};
