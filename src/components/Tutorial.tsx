import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from './ui/button';
import { X, BookOpen, Zap, Play, ArrowLeft, RefreshCw } from 'lucide-react';
import { cn } from '../lib/utils';
import { useSound } from '../hooks/useSound';

interface TutorialProps {
  onClose: () => void;
}

type TutorialView = 'path' | 'steps' | 'tips' | 'simulation';

const Tutorial: React.FC<TutorialProps> = ({ onClose }) => {
  const [view, setView] = useState<TutorialView>('path');
  const [step, setStep] = useState(0);
  const { playClick } = useSound();

  const handleAction = (action: () => void) => {
    playClick();
    action();
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

  const simSteps = [
    { title: "THE DEAL", content: "You start with 5 cards. The goal? Clear your hand or have the lowest points.", icon: "🎴", action: "DEALING..." },
    { title: "PICKING DISCARD", content: "Select matching cards. Two 5s? Throw them both in one go!", icon: "📤", action: "SELECTING..." },
    { title: "THE OPEN PILE", content: "If the open card is low, grab it! Otherwise, risk the deck.", icon: "📥", action: "PICKING..." },
    { title: "THE WILD CARD", content: "That card in the center? It's the Wild Card. It's worth 0 points!", icon: "✨", action: "REVEALING..." }
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

  const pureGoldIconStyle = {
    color: '#FFD700',
    filter: 'drop-shadow(2px 2px 0px rgba(0,0,0,0.4))'
  };

  const goldenBorder = "border-[12px] border-double border-brand-gold/60 shadow-[inset_0_0_20px_rgba(245,228,195,0.2)]";

  // Auto-play simulation
  useEffect(() => {
    if (view === 'simulation') {
      const timer = setInterval(() => {
        setStep(s => (s + 1) % simSteps.length);
      }, 4000);
      return () => clearInterval(timer);
    }
  }, [view]);

  const renderPath = () => (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.05 }}
      className="space-y-6 pt-10"
    >
      <div className="text-center mb-10">
        <h1 
          style={pureGoldStyle}
          className="text-7xl font-display font-black mb-4 tracking-tighter italic uppercase drop-shadow-[0_10px_20px_rgba(0,0,0,0.8)]"
        >
          LEARN FIVES
        </h1>
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={pureGoldStyle}
          className="font-display font-black text-xl tracking-[0.2em] italic uppercase"
        >
          WINNER SCORES THE LEAST
        </motion.p>
      </div>

      <div className="space-y-6">
        {[
          { icon: <BookOpen className="w-8 h-8" />, title: "BASIC RULES", desc: "WALKTHROUGH & SCORING", view: 'steps' },
          { icon: <Play className="w-8 h-8" />, title: "INTERACTIVE GAMEPLAY", desc: "LIVE GUIDED SIMULATION", view: 'simulation', primary: true },
          { icon: <Zap className="w-8 h-8" />, title: "PRO TIPS", desc: "STRATEGY FOR EXPERTS", view: 'tips' }
        ].map((item, idx) => (
          <Button
            key={idx}
            onClick={() => handleAction(() => { setView(item.view as TutorialView); setStep(0); })}
            className={cn(
              "w-full h-36 rounded-[48px] flex flex-col items-center justify-center border-[6px] transition-all relative overflow-hidden group shadow-[0_20px_40px_rgba(0,0,0,0.8)]",
              item.primary 
                ? "bg-brand-gold text-brand-red border-white border-b-[12px] shadow-[0_15px_30px_rgba(31,0,0,0.6)]" 
                : "bg-brand-maroon text-brand-gold border-brand-gold/10 border-b-[10px] active:border-b-[4px] active:translate-y-[6px]"
            )}
          >
            <div className="absolute inset-0 bg-linear-to-b from-white/10 to-transparent pointer-events-none" />
            <div className={cn("mb-2 flex items-center gap-4")}>
               <div className={cn("p-2 rounded-xl", item.primary ? "bg-brand-red/10" : "bg-brand-gold/5")}>
                 {item.icon}
               </div>
               <div className="flex flex-col items-start">
                  <span style={item.primary ? {} : pureGoldStyle} className="font-display font-black text-3xl leading-none uppercase tracking-tighter italic">
                    {item.title}
                  </span>
                  <span className={cn("text-[9px] font-black uppercase tracking-[0.3em] mt-1", item.primary ? "text-brand-red/60" : "text-brand-gold/40")}>
                     {item.desc}
                  </span>
               </div>
            </div>
            {/* Action Indicator Bar */}
            <div className={cn("absolute bottom-0 inset-x-0 h-1.5 opacity-40", item.primary ? "bg-brand-red" : "bg-brand-gold")} />
          </Button>
        ))}
      </div>

      <Button variant="ghost" onClick={() => handleAction(onClose)} className="w-full text-brand-gold/40 mt-12 font-black uppercase tracking-widest text-[10px] hover:text-brand-gold">
         <ArrowLeft className="mr-2 h-4 w-4" /> QUIT TO MENU
      </Button>
    </motion.div>
  );

  const renderSimulation = () => (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }}
      className="flex flex-col h-full pt-10"
    >
      <div className="flex items-center justify-between mb-8">
        <div className="flex flex-col">
          <span style={pureGoldStyle} className="text-[10px] font-black tracking-[0.3em] uppercase opacity-60">Cinema</span>
          <span style={pureGoldStyle} className="text-3xl font-display font-black italic">LIVE GUIDED PLAY</span>
        </div>
        <Button variant="ghost" size="icon" onClick={() => handleAction(() => setView('path'))} className="rounded-full text-brand-gold/40 hover:text-brand-gold">
           <X size={28} />
        </Button>
      </div>

      <div className="flex-1 bg-[#1a0505] border-[10px] border-brand-gold/20 rounded-[60px] flex flex-col items-center justify-center text-center relative overflow-hidden shadow-[0_60px_120px_rgba(0,0,0,0.9),inset_0_0_60px_rgba(0,0,0,0.6)]">
         <div className="absolute top-0 left-0 p-12 opacity-5 animate-pulse">
            <Play size={160} className="text-brand-gold" />
         </div>
         
         <div className="relative z-10 w-full px-10">
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ x: 50, opacity: 0, scale: 0.8 }}
                animate={{ x: 0, opacity: 1, scale: 1 }}
                exit={{ x: -50, opacity: 0, scale: 0.8 }}
                className="flex flex-col items-center"
              >
                 <div className="w-40 h-40 bg-brand-gold/10 rounded-full flex items-center justify-center mb-10 shadow-[0_0_60px_rgba(245,228,195,0.1)] border-2 border-brand-gold/20">
                    <span className="text-9xl drop-shadow-[0_20px_20px_rgba(0,0,0,0.5)] animate-bounce">{simSteps[step].icon}</span>
                 </div>
                 
                 <div className="bg-brand-red/40 px-4 py-1 rounded-full border border-brand-gold/20 mb-6 font-black text-[8px] tracking-[0.3em] text-brand-gold uppercase">
                    {simSteps[step].action}
                 </div>

                 <h3 style={pureGoldStyle} className="text-4xl font-display font-black mb-4 italic uppercase tracking-tighter">{simSteps[step].title}</h3>
                 <p className="text-brand-gold/70 leading-relaxed font-medium text-lg max-w-sm drop-shadow-md">
                    {simSteps[step].content}
                 </p>
              </motion.div>
            </AnimatePresence>
         </div>
         
         <div className="flex gap-4 mt-16 bg-black/30 px-6 py-3 rounded-full border border-white/5">
            {simSteps.map((_, i) => (
              <div 
                key={i} 
                className={cn(
                  "h-1.5 rounded-full transition-all duration-500", 
                  i === step ? "bg-brand-gold w-10 shadow-[0_0_10px_rgba(245,228,195,0.8)]" : "bg-brand-gold/10 w-3"
                )} 
              />
            ))}
         </div>

         <div className="absolute bottom-0 left-0 h-1.5 bg-brand-gold/30 w-full overflow-hidden">
            <motion.div 
              key={step}
              initial={{ width: "0%" }}
              animate={{ width: "100%" }}
              transition={{ duration: 4, ease: "linear" }}
              className="h-full bg-brand-gold shadow-[0_0_15px_rgba(245,228,195,1)]"
            />
         </div>
      </div>

      <div className="flex items-center gap-4 mt-10">
         <Button 
            variant="ghost" 
            onClick={() => handleAction(() => setView('path'))}
            className="flex-1 h-20 rounded-[40px] text-brand-gold/40 font-black uppercase tracking-widest text-[10px] border-2 border-brand-gold/5"
         >
            BACK TO DASHBOARD
         </Button>
         <Button 
            onClick={() => handleAction(() => onClose())}
            className="flex-[2] h-20 rounded-[40px] bg-brand-gold text-brand-red font-display font-black text-3xl italic tracking-tighter shadow-[0_20px_40px_rgba(0,0,0,0.4)] border-b-[8px] border-black/20 hover:scale-[1.02] active:scale-95 transition-all"
         >
            ENTER THE ARENA
         </Button>
      </div>
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
          <span style={pureGoldStyle} className="text-[10px] font-black tracking-[0.3em] uppercase opacity-60">Knowledge</span>
          <span style={pureGoldStyle} className="text-3xl font-display font-black italic">BASIC RULES</span>
        </div>
        <Button variant="ghost" size="icon" onClick={() => handleAction(() => setView('path'))} className="rounded-full text-brand-gold/40 hover:text-brand-gold">
           <X size={28} />
        </Button>
      </div>

      <div className="flex-1 bg-[#1a0505] border-[10px] border-brand-gold/20 rounded-[60px] flex flex-col items-center justify-center text-center shadow-[0_50px_100px_rgba(0,0,0,0.7)] relative overflow-hidden">
         <div className="absolute bottom-0 right-0 p-8 opacity-5 rotate-12">
            <BookOpen size={140} className="text-brand-gold" />
         </div>
         <span className="text-9xl mb-10 drop-shadow-2xl">{steps[step].image}</span>
         <h3 style={pureGoldStyle} className="text-4xl font-display font-black mb-6 italic uppercase tracking-tighter">{steps[step].title}</h3>
         <p className="text-brand-gold/60 leading-relaxed font-medium whitespace-pre-line text-lg max-w-sm">
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
            onClick={() => handleAction(() => step < steps.length - 1 ? setStep(s => s + 1) : setView('path'))}
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
        <h2 style={pureGoldStyle} className="text-5xl font-display font-black italic">PRO TIPS</h2>
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
        className="w-full h-20 rounded-[40px] bg-brand-gold text-brand-red font-display font-black text-3xl italic tracking-tighter mt-10 shadow-[0_15px_30px_rgba(0,0,0,0.6)] hover:scale-[1.02] active:scale-95 border-b-[8px] border-black/20"
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
          {view === 'simulation' && renderSimulation()}
          {view === 'tips' && renderTips()}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Tutorial;
