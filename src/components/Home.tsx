
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from './ui/button';
import { Users, User, Info, ArrowLeft, PlayCircle } from 'lucide-react';
import { cn } from '../lib/utils';
import { useSound } from '../hooks/useSound';

interface HomeProps {
  onStartSinglePlayer: (players: number, rounds: number) => void;
  onStartMultiplayer: () => void;
  onShowTutorial: () => void;
}

const Home: React.FC<HomeProps> = ({ 
  onStartSinglePlayer, 
  onStartMultiplayer, 
  onShowTutorial 
}) => {
  const [showSetup, setShowSetup] = useState(false);
  const [playerCount, setPlayerCount] = useState(2);
  const [roundCount, setRoundCount] = useState(3);
  const [name, setName] = useState('PLAYER_' + Math.floor(1000 + Math.random() * 9000));
  const { playClick } = useSound();

  const handleModeClick = (action: () => void) => {
    playClick();
    action();
  };

  const embossedStyle = {
    textShadow: '2px 2px 0px rgba(0,0,0,0.4), -1px -1px 0px rgba(255,255,255,0.1)'
  };

  return (
    <div className="min-h-screen bg-brand-red flex flex-col items-center justify-start py-12 px-6 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-brand-yellow/10 blur-[120px] rounded-full pointer-events-none" />
      
      {/* Main Container */}
      <div className="max-w-md w-full z-10 flex flex-col items-center">
        {/* Logo Area */}
        <div className="w-24 h-24 bg-brand-gold/5 border-2 border-brand-gold/20 rounded-[32px] flex items-center justify-center mb-6 shadow-2xl relative overflow-hidden">
          <img 
            src="/fives_logo.png" 
            alt="Fives Logo" 
            className="w-full h-full object-cover opacity-90"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
              (e.target as any).parentElement.innerHTML = '<span class="text-brand-gold font-display font-bold text-[10px] tracking-widest opacity-40">LOGO</span>';
            }}
          />
        </div>

        {/* Title Section */}
        <div className="text-center mb-10">
          <motion.h1 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            style={embossedStyle}
            className="text-7xl font-display font-black text-brand-gold tracking-tighter italic mb-2 leading-none"
          >
            FIVES
          </motion.h1>
          <motion.p 
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-brand-gold font-display font-bold text-lg tracking-[0.2em] mb-4"
          >
            WINNER SCORES THE LEAST
          </motion.p>
          <p className="text-brand-gold/40 text-[10px] font-black uppercase tracking-[0.3em]">CHOOSE MODE</p>
        </div>

        <AnimatePresence mode="wait">
          {!showSetup ? (
            <motion.div 
              key="menu"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="w-full space-y-10"
            >
              {/* Name Input Section */}
              <div className="bg-brand-maroon/40 border-2 border-brand-gold/10 p-8 rounded-[40px] shadow-inner relative overflow-hidden group">
                 <div className="flex items-center gap-3 mb-4">
                    <User className="w-4 h-4 text-brand-gold/40" />
                    <span className="text-[10px] font-black text-brand-gold/40 uppercase tracking-widest">Name</span>
                 </div>
                 <div className="text-center py-4 border-b-2 border-brand-gold/20">
                    <input 
                      type="text" 
                      value={name}
                      onChange={(e) => setName(e.target.value.toUpperCase())}
                      className="bg-transparent text-center w-full focus:outline-none text-4xl font-display font-black text-brand-gold tracking-[0.1em]"
                    />
                 </div>
              </div>

              {/* Mode Selectors */}
              <div className="bg-brand-maroon/40 border-2 border-brand-gold/10 p-8 rounded-[40px] shadow-2xl flex justify-between gap-4">
                 {[
                   { id: 'single', label: 'SINGLE PLAYER', icon: <User className="w-5 h-5" />, action: () => setShowSetup(true) },
                   { id: 'multi', label: 'MULTIPLAYER', icon: <Users className="w-5 h-5" />, action: onStartMultiplayer },
                   { id: 'tutorial', label: 'TUTORIAL', icon: <Info className="w-5 h-5" />, action: onShowTutorial }
                 ].map((mode) => (
                   <button
                     key={mode.id}
                     onClick={() => handleModeClick(mode.action)}
                     className="flex flex-col items-center gap-4 group flex-1"
                   >
                     <div className="w-16 h-28 bg-brand-maroon border border-brand-gold/10 rounded-[28px] flex items-center justify-center text-brand-gold/40 group-hover:text-brand-gold group-hover:border-brand-gold/40 transition-all group-active:scale-95 shadow-xl relative overflow-hidden">
                        <div className="absolute inset-0 bg-linear-to-b from-brand-gold/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        {mode.icon}
                     </div>
                     <span className="text-[8px] font-black text-brand-gold/60 tracking-widest leading-tight w-16 text-center uppercase">{mode.label}</span>
                   </button>
                 ))}
              </div>

              {/* Bottom Slogan */}
              <div className="text-center space-y-4 pt-4">
                <p 
                  style={embossedStyle}
                  className="text-brand-gold/80 font-display font-bold text-lg italic tracking-[0.1em]"
                >
                  SURVIVAL OF THE LOWEST
                </p>
                <div className="h-px w-24 bg-brand-gold/10 mx-auto" />
              </div>

              {/* Copyright */}
              <div className="pt-8 text-center">
                 <p className="text-[8px] font-black text-brand-gold/10 uppercase tracking-[0.2em]">
                   © 2026 FIVES ENTERTAINMENT - ALL RIGHTS RESERVED
                 </p>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="setup"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="w-full bg-brand-maroon/60 backdrop-blur-xl border-4 border-brand-gold/10 p-10 rounded-[50px] shadow-2xl relative overflow-hidden"
            >
              <div className="flex items-center justify-between mb-8">
                 <Button 
                   variant="ghost" 
                   onClick={() => handleModeClick(() => setShowSetup(false))} 
                   className="text-brand-gold/40 hover:text-brand-gold flex items-center gap-2 p-0"
                 >
                    <ArrowLeft size={16} /> <span className="text-[10px] font-black tracking-widest">BACK</span>
                 </Button>
                 <div className="flex flex-col items-end">
                    <span className="text-[10px] font-black text-brand-gold/20 uppercase tracking-widest">Configure</span>
                    <span className="text-xl font-display font-bold text-brand-gold italic">SOLO MODE</span>
                 </div>
              </div>
              
              <div className="space-y-12">
                <div className="space-y-6">
                  <div className="flex items-center gap-3 ml-2">
                    <Users size={14} className="text-brand-gold/40" />
                    <label className="text-[10px] font-black text-brand-gold/40 uppercase tracking-widest">Total Players</label>
                    <span className="ml-auto text-xl font-display font-bold text-brand-gold">{playerCount}</span>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {[2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                      <Button
                        key={n}
                        variant="outline"
                        className={cn(
                          "h-12 rounded-xl transition-all font-black text-lg p-0",
                          playerCount === n 
                            ? "bg-brand-gold text-brand-red border-brand-gold shadow-lg shadow-brand-gold/20" 
                            : "bg-transparent text-brand-gold border-brand-gold/20 hover:bg-brand-gold/10"
                        )}
                        onClick={() => handleModeClick(() => setPlayerCount(n))}
                      >
                        {n}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="flex items-center gap-3 ml-2">
                    <PlayCircle size={14} className="text-brand-gold/40" />
                    <label className="text-[10px] font-black text-brand-gold/40 uppercase tracking-widest">Match Rounds</label>
                    <span className="ml-auto text-xl font-display font-bold text-brand-gold">{roundCount}</span>
                  </div>
                  <div className="flex gap-2">
                    {[3, 5, 10, 15].map(r => (
                      <Button
                        key={r}
                        variant="outline"
                        className={cn(
                          "flex-1 h-14 rounded-2xl transition-all font-black text-lg",
                          roundCount === r 
                            ? "bg-brand-gold text-brand-red border-brand-gold shadow-lg shadow-brand-gold/20" 
                            : "bg-transparent text-brand-gold border-brand-gold/20 hover:bg-brand-gold/10"
                        )}
                        onClick={() => handleModeClick(() => setRoundCount(r))}
                      >
                        {r}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="pt-4 space-y-4">
                  <Button 
                    onClick={() => handleModeClick(() => onStartSinglePlayer(playerCount, roundCount))} 
                    className="w-full h-20 rounded-[32px] bg-brand-gold text-brand-red font-black text-2xl shadow-2xl shadow-brand-gold/10 hover:scale-[1.02] active:scale-95 transition-all"
                  >
                    START GAME
                  </Button>
                  <Button 
                    variant="ghost" 
                    onClick={() => handleModeClick(() => setShowSetup(false))} 
                    className="w-full text-brand-gold/20 font-black tracking-widest text-[10px]"
                  >
                    BACK TO MENU
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Home;
