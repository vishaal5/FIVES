
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from './ui/button';
import { Users, User, Info, ArrowLeft, PlayCircle, Lock } from 'lucide-react';
import { cn } from '../lib/utils';
import { useSound } from '../hooks/useSound';
import logoImg from '../assets/images/regenerated_image_1778248576867.jpg';

interface HomeProps {
  isTutorialComplete: boolean;
  onStartSinglePlayer: (players: number, rounds: number, playerName: string) => void;
  onStartMultiplayer: (playerName: string) => void;
  onShowTutorial: () => void;
}

const Home: React.FC<HomeProps> = ({ 
  isTutorialComplete,
  onStartSinglePlayer, 
  onStartMultiplayer, 
  onShowTutorial 
}) => {
  const [showSetup, setShowSetup] = useState(false);
  const [playerCount, setPlayerCount] = useState(2);
  const [roundCount, setRoundCount] = useState(3);
  const [name, setName] = useState('PLAYER_' + Math.floor(1000 + Math.random() * 9000));
  const { playClick } = useSound();

  const handleModeClick = (action: () => void, isLocked: boolean = false) => {
    if (isLocked) {
      addEffect('wrong', 'COMPLETE TUTORIAL TO UNLOCK');
      return;
    }
    playClick();
    action();
  };

  const [effects, setEffects] = useState<{id: string, type: string, text: string}[]>([]);
  const addEffect = (type: string, text: string) => {
     const id = Math.random().toString(36).substring(7);
     setEffects(prev => [...prev, { id, type, text }]);
     setTimeout(() => setEffects(prev => prev.filter(e => e.id !== id)), 3000);
  };

  const pureGoldStyle = {
    color: '#FFD700',
    textShadow: '2px 2px 0px rgba(0,0,0,0.4), -1px -1px 0px rgba(255,255,255,0.1)'
  };

  const pureGoldIconStyle = {
    color: '#FFD700',
    filter: 'drop-shadow(2px 2px 0px rgba(0,0,0,0.4))'
  };

  const WaveText: React.FC<{ text: string }> = ({ text }) => {
    return (
      <>
        {text.split('').map((char, i) => (
          <span 
            key={i} 
            className={cn("wave-letter", char === ' ' ? "mr-[0.2em]" : "")}
            style={{ animationDelay: `${i * 0.1}s` }}
          >
            {char === ' ' ? '\u00A0' : char}
          </span>
        ))}
      </>
    );
  };

  return (
    <div className="min-h-screen bg-brand-maroon flex flex-col items-center justify-start pt-12 pb-12 px-8 relative overflow-x-hidden overflow-y-auto no-scrollbar">
      {/* Background Gradient / Glow */}
      <div className="absolute top-[15%] left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-brand-red/30 blur-[140px] rounded-full pointer-events-none opacity-40" />
      
      {/* Main Container */}
      <div className="max-w-md w-full z-10 flex flex-col items-center">
        {/* Logo Area */}
        <div className="w-56 h-56 bg-brand-maroon premium-border rounded-[48px] flex flex-col items-center justify-center mb-8 shadow-[0_30px_60px_rgba(0,0,0,0.8),inset_0_0_40px_rgba(0,0,0,0.5)] relative overflow-hidden group">
           <div className="absolute inset-0 bg-linear-to-b from-white/10 to-transparent pointer-events-none" />
           <img 
             src={logoImg} 
             alt="Logo" 
             className="w-full h-full object-contain scale-110"
             referrerPolicy="no-referrer"
             onError={(e) => {
               (e.target as HTMLImageElement).src = 'https://placehold.co/400x400/4a0404/f5e4c3?text=CARD';
             }}
           />
        </div>

        {/* Title Section */}
        <div className="text-center mb-10">
          <div className="space-y-4 px-4">
             <motion.h2 
               initial={{ y: 20, opacity: 0 }}
               animate={{ y: 0, opacity: 1 }}
               className="font-display font-black text-[32px] sm:text-[40px] tracking-[-0.04em] uppercase leading-none text-brand-gold embossed text-center italic"
             >
               SURVIVAL OF <br/> THE LOWEST
             </motion.h2>
             <p className="text-gold-bright font-black text-[12px] uppercase tracking-[0.4em] pt-4 italic break-words text-center embossed">CHOOSE MODE</p>
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
              <div className="premium-card p-6 rounded-[40px] shadow-[0_40px_80px_rgba(0,0,0,0.8)] relative overflow-hidden max-w-[300px] mx-auto w-full mb-8">
                 <div className="flex items-center gap-2 mb-4 ml-4">
                    <User className="w-3 h-3 text-gold embossed" />
                    <span className="text-brand-gold text-[10px] font-black uppercase tracking-[0.5em] opacity-80 embossed">NAME</span>
                 </div>
                  <div className="relative text-center py-4 rounded-[24px] premium-border bg-black/40 shadow-[inset_0_4px_20px_rgba(0,0,0,1)] embossed">
                    <input 
                      value={name}
                      onChange={(e) => setName(e.target.value.toUpperCase())}
                      className="bg-transparent text-center w-full focus:outline-none text-[20px] sm:text-[24px] font-display font-black tracking-[-0.05em] uppercase text-brand-gold placeholder:text-brand-gold/10 px-4 min-h-[48px] py-2 flex items-center justify-center leading-tight whitespace-normal break-words embossed"
                      placeholder="PLAYER_89"
                    />
                  </div>
              </div>

               {/* Mode Selectors */}
              <div className="flex justify-center gap-6 px-4">
                 {[
                   { id: 'single', label: 'SINGLE PLAYER', icon: <User className="w-12 h-12" />, action: () => setShowSetup(true), locked: !isTutorialComplete },
                   { id: 'multi', label: 'MULTIPLAYER', icon: <Users className="w-12 h-12" />, action: () => onStartMultiplayer(name), locked: !isTutorialComplete },
                   { id: 'tutorial', label: 'TUTORIAL', icon: <Info className="w-12 h-12" />, action: onShowTutorial, locked: false }
                 ].map((mode) => (
                   <button
                     key={mode.id}
                     onClick={() => handleModeClick(mode.action, mode.locked)}
                     className={cn(
                       "flex flex-col items-center gap-4 group relative",
                       mode.locked && "opacity-40 grayscale cursor-not-allowed"
                     )}
                   >
                     <div className={cn(
                       "w-24 h-40 sm:w-28 sm:h-44 bg-brand-maroon/80 premium-border rounded-[54px] flex items-center justify-center shadow-[0_30px_60px_rgba(0,0,0,0.8)] transition-all group-active:scale-95 no-theme",
                       mode.id === 'tutorial' ? "border-brand-gold/80 shadow-[0_0_30px_rgba(255,215,0,0.3)]" : "border-brand-gold/10 hover:border-brand-gold/30"
                     )}>
                        <div className={cn("transition-transform group-hover:scale-110", mode.id === 'tutorial' ? "text-brand-gold" : "text-brand-gold/60")}>
                           {mode.locked ? <Lock className="w-10 h-10 opacity-30" /> : mode.icon}
                        </div>
                     </div>
                     <span className="text-[10px] font-black tracking-tight leading-tight w-full text-center uppercase transition-colors italic whitespace-pre-wrap text-brand-gold/60 group-hover:text-brand-gold embossed">
                        {mode.label.split(' ').join('\n')}
                     </span>
                     {mode.locked && (
                        <div className="absolute top-2 right-1/2 translate-x-1/2 flex items-center justify-center">
                           <Lock className="w-3.5 h-3.5 text-brand-gold/40" />
                        </div>
                     )}
                   </button>
                 ))}
              </div>

              {/* Effects Overlay */}
              <div className="fixed inset-0 pointer-events-none z-[100] flex items-center justify-center">
                 <AnimatePresence>
                   {effects.map(eff => (
                     <motion.div
                       key={eff.id}
                       initial={{ scale: 0.5, opacity: 0, y: 20 }}
                       animate={{ scale: 1, opacity: 1, y: 0 }}
                       exit={{ scale: 1.2, opacity: 0 }}
                       className="bg-brand-gold text-brand-red px-6 py-3 rounded-full font-black text-xs uppercase tracking-widest shadow-2xl embossed"
                     >
                       {eff.text}
                     </motion.div>
                   ))}
                 </AnimatePresence>
              </div>

              {/* Bottom Slogan */}
              <div className="text-center space-y-10 pt-10 px-4">
                <motion.p 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.9 }}
                  transition={{ delay: 0.5 }}
                  className="font-display font-black text-xl italic tracking-[0.15em] uppercase leading-tight whitespace-normal break-words embossed animate-wave"
                >
                  <WaveText text="LOWEST SCORE" /> <br/> <span className="text-white/40 embossed"><WaveText text="WINS THE MATCH" /></span>
                </motion.p>
                
                {/* Copyright */}
                <div className="pt-4 text-center opacity-100">
                   <p className="text-[8px] font-black uppercase tracking-[0.2em] font-sans break-words px-2 embossed opacity-40">
                     © 2026 SURVIVAL - ALL RIGHTS RESERVED
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
              className="w-full premium-card p-10 rounded-[50px] shadow-2xl relative overflow-hidden"
            >
              <div className="flex items-center justify-between mb-8">
                 <Button 
                   variant="ghost" 
                   onClick={() => handleModeClick(() => setShowSetup(false))} 
                   className="text-brand-gold/40 hover:text-brand-gold flex items-center gap-2 p-0 no-theme"
                 >
                    <ArrowLeft size={16} /> <span className="text-[10px] font-black tracking-widest embossed">BACK</span>
                 </Button>
                 <div className="flex flex-col items-end">
                    <span className="text-[10px] font-black uppercase tracking-widest opacity-60 embossed">MODE</span>
                    <span className="text-xl font-display font-bold italic embossed">SINGLE PLAYER MODE</span>
                 </div>
              </div>
              
              <div className="space-y-12">
                <div className="space-y-6">
                  <div className="flex items-center gap-3 ml-2">
                    <Users size={14} className="text-gold embossed" />
                    <label className="text-[10px] font-black uppercase tracking-widest opacity-60 embossed">Total Players</label>
                    <span className="ml-auto text-xl font-display font-bold embossed">{playerCount}</span>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {[2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                      <Button
                        key={n}
                        variant="outline"
                        className={cn(
                          "h-12 rounded-xl transition-all font-black text-lg p-0 no-theme",
                          playerCount === n 
                            ? "bg-brand-gold text-brand-red border-brand-gold shadow-lg shadow-brand-gold/20" 
                            : "bg-transparent text-brand-gold border-brand-gold/20 hover:bg-brand-gold/10"
                        )}
                        onClick={() => handleModeClick(() => setPlayerCount(n))}
                      >
                        <span className="embossed">{n}</span>
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="flex items-center gap-3 ml-2">
                    <PlayCircle size={14} className="text-gold embossed" />
                    <label className="text-[10px] font-black uppercase tracking-widest opacity-60 embossed">Match Rounds</label>
                    <span className="ml-auto text-xl font-display font-bold embossed">{roundCount}</span>
                  </div>
                  <div className="grid grid-cols-5 gap-1.5 h-32 overflow-y-auto pr-2 custom-scrollbar no-scrollbar">
                    {Array.from({ length: 15 }, (_, i) => i + 1).map(r => (
                      <Button
                        key={r}
                        variant="outline"
                        className={cn(
                          "h-10 rounded-xl transition-all font-black text-sm p-0 no-theme",
                          roundCount === r 
                            ? "bg-brand-gold text-brand-red border-brand-gold shadow-lg shadow-brand-gold/20" 
                            : "bg-transparent text-brand-gold border-brand-gold/20 hover:bg-brand-gold/10"
                        )}
                        onClick={() => handleModeClick(() => setRoundCount(r))}
                      >
                        <span className="embossed">{r}</span>
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="pt-4 space-y-4">
                  <Button 
                    onClick={() => handleModeClick(() => onStartSinglePlayer(playerCount, roundCount, name))} 
                    className="w-full h-16 sm:h-20 rounded-[32px] bg-brand-gold text-brand-red font-black text-xl sm:text-2xl shadow-2xl shadow-brand-gold/10 hover:scale-[1.02] active:scale-95 transition-all break-words no-theme"
                  >
                    <span className="embossed text-brand-red">START GAME</span>
                  </Button>
                  <Button 
                    variant="ghost" 
                    onClick={() => handleModeClick(() => setShowSetup(false))} 
                    className="w-full text-brand-gold/20 font-black tracking-widest text-[10px] break-words px-4 no-theme"
                  >
                    <span className="embossed">BACK TO MENU</span>
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
