import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from './ui/button';
import { X, BookOpen, Zap, Play, ArrowLeft, RefreshCw, Gamepad2, GraduationCap } from 'lucide-react';
import { cn } from '../lib/utils';
import { useSound } from '../hooks/useSound';

interface TutorialProps {
  onClose: () => void;
  onStartInteractive: () => void;
}

type TutorialView = 'path' | 'steps' | 'tips';

const Tutorial: React.FC<TutorialProps> = ({ onClose, onStartInteractive }) => {
  const [view, setView] = useState<TutorialView>('path');
  const [step, setStep] = useState(0);
  const { playClick } = useSound();

  const handleAction = (action: () => void) => {
    playClick();
    action();
  };

  const finalizeTutorial = () => {
    localStorage.setItem('fives_tutorial_complete', 'true');
    onClose();
  };

  const steps = [
    {
      title: "BASIC RULES",
      content: "1. Select one or more cards of the same rank to discard before selecting from the deck pile or open card pile.\n\n2. A Wild Card (shown at start) and Jokers are 0 POINTS.\n\n3. Lowest score wins round.\n\n4. Winner of round gets 0 points.",
      image: "🎯"
    },
    {
      title: "CARD VALUES",
      content: "Aces = 1 POINT\nNumbers (2-10) = Face value\nJ, Q, K = 10 POINTS\nJoker (★) and the Wild Card (drawn at start) = 0 POINTS!",
      image: "🃏"
    },
    {
      title: "TURN FLOW",
      content: "Each turn:\n1. Discard one or more cards of the same rank.\n2. Draw ONE card from the deck or the discard pile.",
      image: "🔄"
    }
  ];

  const tips = [
    {
      id: "01",
      title: "THE MATCHING STRATEGY",
      content: "Pick from the open card pile if it matches any card that you already have, this allows you to discard them as a pair / triplet / set in the next round."
    },
    {
      id: "02",
      title: "THE FIFTH ROUND RULE",
      content: "Keep your hand value as low as possible after the fifth round. Any player can call 'DECK' at this point!"
    }
  ];

  const pureGoldStyle = {
    color: '#FFD700',
    textShadow: '2px 2px 0px rgba(0,0,0,0.4), -1px -1px 0px rgba(255,255,255,0.1)'
  };

  const goldenBorder = "border-[12px] border-double border-brand-gold/60 shadow-[inset_0_0_20px_rgba(245,228,195,0.2)]";

  const renderPath = () => (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.05 }}
      className="space-y-8 pt-8"
    >
      <div className="flex justify-between items-center mb-8 px-4">
        <div className="text-left">
           <h2 className="text-4xl font-black italic text-brand-gold uppercase tracking-tighter leading-none embossed">LEARNFIVES</h2>
           <p className="text-brand-gold/40 text-[10px] font-black uppercase tracking-[0.4em] mt-2 italic">WINNER SCORES THE LEAST</p>
        </div>
        <button 
          onClick={finalizeTutorial}
          className="bg-brand-gold/10 hover:bg-brand-gold/20 text-brand-gold font-black text-[10px] uppercase tracking-widest px-6 py-2.5 rounded-full border border-brand-gold/30 transition-all shadow-xl"
        >
          SKIP
        </button>
      </div>

      <div className="text-center space-y-4 mb-8">
         <div className="w-16 h-16 bg-brand-gold rounded-[24px] mx-auto flex items-center justify-center shadow-[0_20px_40px_rgba(255,215,0,0.2)] border-2 border-white/10 group">
            <GraduationCap className="w-8 h-8 text-brand-red group-hover:scale-110 transition-transform" />
         </div>
         <p className="text-brand-gold/40 text-[11px] font-black uppercase tracking-[0.3em] italic">Choose your learning path</p>
      </div>

      <div className="space-y-4 px-4 pb-8">
        {[
          { icon: <BookOpen className="w-6 h-6" />, title: "BASIC RULES", desc: "Walkthrough & scoring", view: 'steps' },
          { icon: <Gamepad2 className="w-6 h-6" />, title: "INTERACTIVE \nGAMEPLAY", desc: "Guided match simulation", action: onStartInteractive, primary: true },
          { icon: <Zap className="w-6 h-6" />, title: "PRO TIPS", desc: "Strategy for experts", view: 'tips' }
        ].map((item, idx) => (
          <button
            key={idx}
            onClick={() => handleAction(() => { 
                if (item.action) {
                    item.action();
                } else {
                    setView(item.view as TutorialView); 
                    setStep(0); 
                }
            })}
            className={cn(
              "w-full p-8 rounded-[40px] flex flex-col items-center justify-center gap-2 border transition-all relative overflow-hidden group shadow-2xl active:scale-95",
              item.primary 
                ? "bg-brand-gold text-brand-red border-black shadow-[0_20px_60px_rgba(255,215,0,0.3)] hover:scale-[1.02]" 
                : "bg-brand-maroon/20 text-brand-gold border-brand-gold/10 hover:bg-brand-maroon/40"
            )}
          >
            <div className="relative z-10 flex flex-col items-center gap-2">
               {item.icon}
               <span className={cn("font-display font-black text-xl leading-none uppercase tracking-tighter italic text-center whitespace-pre-wrap", item.primary ? "text-brand-red" : "text-brand-gold")}>
                 {item.title}
               </span>
               <span className={cn("text-[10px] font-black uppercase tracking-widest mt-1", item.primary ? "text-brand-red/60" : "text-brand-gold/40")}>
                  {item.desc}
               </span>
            </div>
            {item.primary && (
               <div className="absolute inset-0 bg-linear-to-b from-white/20 to-transparent opacity-50 pointer-events-none" />
            )}
          </button>
        ))}
      </div>

      <button 
        onClick={() => handleAction(onClose)} 
        className="w-full text-brand-gold/40 mt-8 font-black uppercase tracking-[0.4em] text-[12px] hover:text-brand-gold embossed transition-all hover:scale-105 active:scale-95"
      >
        BACK TO MENU
      </button>
    </motion.div>
  );

  const renderSteps = () => (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }}
      className="flex flex-col h-full pt-10"
    >
      <div className="flex items-center justify-between mb-8">
        <div className="flex flex-col">
          <span style={pureGoldStyle} className="text-[9px] font-black tracking-[0.3em] uppercase opacity-60 break-words">Knowledge</span>
          <span style={pureGoldStyle} className="text-2xl font-display font-black italic break-words">BASIC RULES</span>
        </div>
        <Button variant="ghost" size="icon" onClick={() => handleAction(() => setView('path'))} className="rounded-full text-brand-gold/40 hover:text-brand-gold">
           <X size={28} />
        </Button>
      </div>

      <div className="flex-1 bg-[#1a0505] border-[10px] border-brand-gold/20 rounded-[60px] flex flex-col items-center justify-center text-center shadow-[0_50px_100px_rgba(0,0,0,0.7)] relative overflow-hidden">
         <div className="absolute bottom-0 right-0 p-8 opacity-5 rotate-12">
            <BookOpen size={140} className="text-brand-gold" />
         </div>
         <span className="text-7xl mb-6 drop-shadow-2xl">{steps[step].image}</span>
         <h3 style={pureGoldStyle} className="text-3xl font-display font-black mb-4 italic uppercase tracking-tighter break-words px-4">{steps[step].title}</h3>
         <p className="text-brand-gold/60 leading-relaxed font-medium whitespace-pre-line text-base max-w-sm px-6 break-words">
            {steps[step].content}
         </p>
         
         <div className="flex gap-4 mt-12">
            {steps.map((_, i) => (
              <div 
                key={i} 
                className={cn(
                  "h-2 rounded-full transition-all duration-300", 
                  i === step ? "bg-brand-gold w-10" : "bg-brand-gold/10 w-2"
                )} 
              />
            ))}
         </div>
      </div>

      <div className="flex items-center gap-4 mt-10">
         <Button 
            variant="ghost" 
            onClick={() => handleAction(() => step > 0 ? setStep(s => s - 1) : setView('path'))}
            className="flex-1 h-20 rounded-[40px] text-brand-gold/40 font-black uppercase tracking-widest text-[10px]"
         >
            BACK
         </Button>
         <Button 
            onClick={() => handleAction(() => step < steps.length - 1 ? setStep(s => s + 1) : finalizeTutorial())}
            className="flex-[2] h-20 rounded-[40px] bg-brand-gold text-brand-red font-display font-black text-3xl italic tracking-tighter shadow-2xl hover:scale-[1.02] active:scale-95 transition-all"
         >
            {step < steps.length - 1 ? "CONTINUE" : "ASCEND"}
         </Button>
      </div>
    </motion.div>
  );

  const renderTips = () => (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }}
      className="flex flex-col h-full pt-10"
    >
      <div className="flex items-center justify-between mb-8">
        <h2 style={pureGoldStyle} className="text-3xl sm:text-4xl font-display font-black italic break-words">PRO TIPS</h2>
        <Button variant="ghost" size="icon" onClick={() => handleAction(() => setView('path'))} className="text-brand-gold/40 hover:text-brand-gold">
           <X size={28} />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-6 pr-4 no-scrollbar">
         {tips.map((tip) => (
           <div key={tip.id} className="bg-[#1a0505] border-[6px] border-brand-gold/10 p-10 rounded-[40px] flex gap-8 relative overflow-hidden group shadow-2xl">
              <div className="absolute inset-0 bg-brand-gold/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              <span className="text-brand-gold font-display font-black text-4xl opacity-10 leading-none">{tip.id}</span>
              <div className="relative z-10">
                <h4 style={pureGoldStyle} className="font-display font-black mb-3 tracking-tighter text-xl italic uppercase underline decoration-brand-gold/20 underline-offset-8">{tip.title}</h4>
                <p style={pureGoldStyle} className="text-sm leading-relaxed font-medium opacity-60">{tip.content}</p>
              </div>
           </div>
         ))}
      </div>

      <Button 
        onClick={() => handleAction(() => setView('path'))} 
        className="w-full h-16 sm:h-20 rounded-[40px] bg-brand-gold text-brand-red font-display font-black text-xl sm:text-3xl italic tracking-tighter mt-10 shadow-[0_15px_30px_rgba(0,0,0,0.6)] hover:scale-[1.02] active:scale-95 border-b-[8px] border-black/20 break-words"
      >
         RETURN TO ACADEMY
      </Button>
    </motion.div>
  );

  return (
    <div className="fixed inset-0 z-50 bg-[#2a0303] flex items-center justify-center p-4 overflow-y-auto">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(0,0,0,0)_0%,rgba(0,0,0,0.8)_100%)] pointer-events-none" />
      <div className={cn("absolute inset-0 pointer-events-none z-[60] mix-blend-overlay opacity-40", goldenBorder)} />

      <div className="max-w-md w-full relative min-h-[600px] h-full max-h-[850px] flex flex-col z-10 py-10">
        <AnimatePresence mode="wait">
          {view === 'path' && renderPath()}
          {view === 'steps' && renderSteps()}
          {view === 'tips' && renderTips()}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Tutorial;
