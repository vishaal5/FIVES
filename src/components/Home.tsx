
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from './ui/button';
import { Users, User, Info, ArrowLeft, PlayCircle } from 'lucide-react';
import { cn } from '../lib/utils';
import { useSound } from '../hooks/useSound';
import logoImg from '../assets/images/regenerated_image_1778248576867.jpg';

interface HomeProps {
  onStartSinglePlayer: (players: number, rounds: number, playerName: string) => void;
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

  const pureGoldStyle = {
    color: '#FFD700',
    textShadow: '2px 2px 0px rgba(0,0,0,0.4), -1px -1px 0px rgba(255,255,255,0.1)'
  };

  const pureGoldIconStyle = {
    color: '#FFD700',
    filter: 'drop-shadow(2px 2px 0px rgba(0,0,0,0.4))'
  };

  return (
    <div className="min-h-screen bg-[#2a0404] flex flex-col items-center justify-start pt-12 pb-12 px-8 relative overflow-x-hidden overflow-y-auto no-scrollbar">
      {/* Background Gradient / Glow */}
      <div className="absolute top-[15%] left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-brand-red/30 blur-[140px] rounded-full pointer-events-none opacity-40" />
      
      {/* Main Container */}
      <div className="max-w-md w-full z-10 flex flex-col items-center">
        {/* Logo Area */}
        <div className="w-40 h-40 bg-brand-maroon border-[4px] border-brand-gold/10 rounded-[48px] flex flex-col items-center justify-center mb-8 shadow-[0_30px_60px_rgba(0,0,0,0.8),inset_0_0_40px_rgba(0,0,0,0.5)] relative overflow-hidden group">
           <div className="absolute inset-0 bg-linear-to-b from-white/10 to-transparent pointer-events-none" />
           <img 
             src={logoImg} 
             alt="Fives Logo" 
             className="w-full h-full object-contain"
             referrerPolicy="no-referrer"
             onError={(e) => {
               (e.target as HTMLImageElement).src = 'https://placehold.co/400x400/4a0404/f5e4c3?text=FIVES';
             }}
           />
        </div>

        {/* Title Section */}
        <div className="text-center mb-10">
          <motion.h1 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            style={pureGoldStyle}
            className="text-[96px] font-display font-black tracking-[-0.05em] uppercase mb-4 leading-none drop-shadow-[0_15px_30px_rgba(0,0,0,0.8)]"
          >
            FIVES
          </motion.h1>
          
          <div className="space-y-4">
             <motion.p 
               initial={{ y: 20, opacity: 0 }}
               animate={{ y: 0, opacity: 1 }}
               style={pureGoldStyle}
               className="font-display font-black text-2xl tracking-[0.3em] italic uppercase"
             >
               SURVIVAL OF THE LOWEST
             </motion.p>
             <p style={pureGoldStyle} className="text-[12px] font-black uppercase tracking-[0.6em] pt-4 italic opacity-100">CHOOSE MODE</p>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {!showSetup ? (
            <motion.div 
              key="menu"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="w-full space-y-12"
            >
              {/* Name Input Section */}
              <div className="bg-brand-maroon/40 border-[3px] border-brand-gold/5 p-6 rounded-[40px] shadow-[0_40px_80px_rgba(0,0,0,0.8)] relative overflow-hidden max-w-[320px] mx-auto w-full">
                 <div className="flex items-center gap-3 mb-4 ml-4">
                    <User style={pureGoldIconStyle} className="w-3.5 h-3.5" />
                    <span style={pureGoldStyle} className="text-[11px] font-black uppercase tracking-[0.4em]">NAME</span>
                 </div>
                 <div className="relative text-center py-4 rounded-[24px] border-2 border-brand-gold/10 bg-black/40 shadow-[inset_0_2px_10px_rgba(0,0,0,1)]">
                    <input 
                      type="text" 
                      value={name}
                      onChange={(e) => setName(e.target.value.toUpperCase())}
                      style={pureGoldStyle}
                      className="bg-transparent text-center w-full focus:outline-none text-[36px] font-display font-black tracking-[0.1em] uppercase"
                    />
                 </div>
              </div>

               {/* Mode Selectors */}
              <div className="flex justify-between gap-5 px-2">
                 {[
                   { id: 'single', label: 'SINGLE PLAYER', icon: <User style={pureGoldIconStyle} className="w-10 h-10" />, action: () => setShowSetup(true) },
                   { id: 'multi', label: 'MULTIPLAYER', icon: <Users style={pureGoldIconStyle} className="w-10 h-10" />, action: onStartMultiplayer },
                   { id: 'tutorial', label: 'TUTORIAL', icon: <Info style={pureGoldIconStyle} className="w-10 h-10" />, action: onShowTutorial }
                 ].map((mode) => (
                   <button
                     key={mode.id}
                     onClick={() => handleModeClick(mode.action)}
                     className="flex flex-col flex-1 items-center gap-4 group"
                   >
                     <div className="aspect-[1/1.6] w-full bg-brand-maroon/30 border-[4px] border-brand-gold/10 rounded-[48px] flex items-center justify-center shadow-[0_30px_60px_rgba(0,0,0,0.8)] transition-all group-active:scale-95 group-hover:bg-[#2a0e0e] group-hover:border-brand-gold/30">
                        <div className="group-hover:scale-110 transition-transform">
                           {mode.icon}
                        </div>
                     </div>
                     <span style={pureGoldStyle} className="text-[10px] font-black tracking-tight leading-tight w-full text-center uppercase transition-colors italic whitespace-pre-wrap">
                        {mode.label.split(' ').join('\n')}
                     </span>
                   </button>
                 ))}
              </div>

              {/* Bottom Slogan */}
              <div className="text-center space-y-10 pt-10 px-4">
                <motion.p 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.9 }}
                  transition={{ delay: 0.5 }}
                  style={pureGoldStyle}
                  className="font-display font-black text-2xl italic tracking-[0.15em] uppercase leading-tight"
                >
                  LOWEST SCORE <br/> <span className="text-white/40">WINS THE MATCH</span>
                </motion.p>
                
                {/* Copyright */}
                <div className="pt-4 text-center opacity-100">
                   <p style={pureGoldStyle} className="text-[8px] font-black uppercase tracking-[0.4em] font-sans">
                     © 2026 FIVES ENTERTAINMENT - ALL RIGHTS RESERVED
                   </p>
                </div>
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
                    <span style={pureGoldStyle} className="text-[10px] font-black uppercase tracking-widest opacity-60">Configure</span>
                    <span style={pureGoldStyle} className="text-xl font-display font-bold italic">SOLO MODE</span>
                 </div>
              </div>
              
              <div className="space-y-12">
                <div className="space-y-6">
                  <div className="flex items-center gap-3 ml-2">
                    <Users style={pureGoldIconStyle} size={14} />
                    <label style={pureGoldStyle} className="text-[10px] font-black uppercase tracking-widest opacity-60">Total Players</label>
                    <span style={pureGoldStyle} className="ml-auto text-xl font-display font-bold">{playerCount}</span>
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
                    <PlayCircle style={pureGoldIconStyle} size={14} />
                    <label style={pureGoldStyle} className="text-[10px] font-black uppercase tracking-widest opacity-60">Match Rounds</label>
                    <span style={pureGoldStyle} className="ml-auto text-xl font-display font-bold">{roundCount}</span>
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
                    onClick={() => handleModeClick(() => onStartSinglePlayer(playerCount, roundCount, name))} 
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
