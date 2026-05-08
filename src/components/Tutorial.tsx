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
    { title: "STARTING HAND", content: "You are dealt 5 cards. Your goal is to have the lowest total sum.", icon: "🎴" },
    { title: "DISCARDING", content: "Select matching ranks (like two 9s) to discard them together.", icon: "📤" },
    { title: "DRAWING", content: "Draw from the Deck for a mystery card, or Open Pile for a known value.", icon: "📥" },
    { title: "THE WILD CARD", content: "The Wild Card is randomly chosen each round and is worth 0 points!", icon: "✨" }
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

  const renderPath = () => (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="space-y-6"
    >
      <div className="text-center mb-10">
        <h1 className="text-4xl font-display font-black text-brand-gold mb-2 tracking-tighter italic">LEARN FIVES</h1>
        <p className="text-brand-gold/40 text-[10px] font-black uppercase tracking-widest">CHOOSE YOUR LEARNING PATH</p>
      </div>

      <div className="space-y-4">
        {[
          { icon: <BookOpen className="w-5 h-5" />, title: "BASIC RULES", desc: "WALKTHROUGH & SCORING", view: 'steps' },
          { icon: <Play className="w-5 h-5" />, title: "GUIDED GAMEPLAY", desc: "INTERACTIVE SIMULATION", view: 'simulation' },
          { icon: <Zap className="w-5 h-5" />, title: "PRO TIPS", desc: "STRATEGY FOR EXPERTS", view: 'tips' }
        ].map((item, idx) => (
          <Button
            key={idx}
            onClick={() => handleAction(() => { setView(item.view as TutorialView); setStep(0); })}
            className={cn(
              "w-full h-28 rounded-[32px] flex flex-col items-center justify-center border-2 border-brand-gold/10 hover:border-brand-gold/30 transition-all",
              idx === 1 ? "bg-brand-gold text-brand-red" : "bg-brand-maroon/40 text-brand-gold"
            )}
          >
            <div className={cn("mb-2 p-2 rounded-full", idx === 1 ? "bg-brand-red text-brand-gold" : "bg-brand-gold/10")}>
               {item.icon}
            </div>
            <span className="font-display font-bold text-xl leading-none uppercase tracking-tight">{item.title}</span>
            <span className={cn("text-[8px] font-black uppercase tracking-widest mt-1", idx === 1 ? "text-brand-red/60" : "text-brand-gold/40")}>
               {item.desc}
            </span>
          </Button>
        ))}
      </div>

      <Button variant="ghost" onClick={() => handleAction(onClose)} className="w-full text-brand-gold/40 mt-8 font-bold hover:text-brand-gold">
         <ArrowLeft className="mr-2 h-4 w-4" /> BACK TO MENU
      </Button>
    </motion.div>
  );

  const renderSimulation = () => (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-8">
        <div className="flex flex-col">
          <span className="text-[10px] font-black text-brand-gold/40 tracking-widest uppercase">Guided Play</span>
          <span className="text-xl font-display font-bold text-brand-gold italic">SIMULATION</span>
        </div>
        <Button variant="ghost" size="icon" onClick={() => handleAction(() => setView('path'))} className="rounded-full text-brand-gold/40">
           <X />
        </Button>
      </div>

      <div className="flex-1 bg-brand-maroon/60 border-2 border-brand-gold/10 rounded-[40px] p-10 flex flex-col items-center justify-center text-center relative overflow-hidden shadow-2xl">
         <motion.span 
           key={step} 
           initial={{ scale: 0.5, opacity: 0 }} 
           animate={{ scale: 1, opacity: 1 }}
           className="text-8xl mb-8"
         >
            {simSteps[step].icon}
         </motion.span>
         <h3 className="text-2xl font-display font-bold text-brand-gold mb-4 italic uppercase">{simSteps[step].title}</h3>
         <p className="text-brand-gold/60 leading-relaxed font-medium text-sm">
            {simSteps[step].content}
         </p>
         
         <div className="flex gap-2 mt-8">
            {simSteps.map((_, i) => (
              <div key={i} className={cn("w-2 h-2 rounded-full", i === step ? "bg-brand-gold" : "bg-brand-gold/10")} />
            ))}
         </div>
      </div>

      <div className="flex items-center gap-4 mt-8">
         <Button 
            variant="ghost" 
            onClick={() => handleAction(() => step > 0 ? setStep(s => s - 1) : setView('path'))}
            className="flex-1 h-16 rounded-2xl text-brand-gold/40 font-bold"
         >
            {step === 0 ? "BACK" : "PREVIOUS"}
         </Button>
         <Button 
            onClick={() => handleAction(() => step < simSteps.length - 1 ? setStep(s => s + 1) : setView('path'))}
            className="flex-[2] h-16 rounded-[24px] bg-brand-gold text-brand-red font-black text-xl"
         >
            {step < simSteps.length - 1 ? "NEXT STEP" : "UNDERSTOOD"}
         </Button>
      </div>
    </motion.div>
  );

  const renderSteps = () => (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-8">
        <div className="flex flex-col">
          <span className="text-[10px] font-black text-brand-gold/40 tracking-[0.3em] uppercase">Tutorial</span>
          <span className="text-xl font-display font-bold text-brand-gold italic">RULES</span>
        </div>
        <Button variant="ghost" size="icon" onClick={() => handleAction(() => setView('path'))} className="rounded-full text-brand-gold/40">
           <X />
        </Button>
      </div>

      <div className="flex-1 bg-brand-maroon/60 border-2 border-brand-gold/10 rounded-[40px] p-10 flex flex-col items-center justify-center text-center shadow-2xl">
         <span className="text-8xl mb-8">{steps[step].image}</span>
         <h3 className="text-2xl font-display font-bold text-brand-gold mb-4 italic uppercase">{steps[step].title}</h3>
         <p className="text-brand-gold/60 leading-relaxed font-medium whitespace-pre-line text-sm">
            {steps[step].content}
         </p>
      </div>

      <div className="flex items-center gap-4 mt-8">
         <Button 
            variant="ghost" 
            onClick={() => handleAction(() => step > 0 ? setStep(s => s - 1) : setView('path'))}
            className="flex-1 h-16 rounded-2xl text-brand-gold/40 font-bold"
         >
            BACK
         </Button>
         <Button 
            onClick={() => handleAction(() => step < steps.length - 1 ? setStep(s => s + 1) : setView('path'))}
            className="flex-[2] h-16 rounded-[24px] bg-brand-gold text-brand-red font-black text-xl"
         >
            {step < steps.length - 1 ? "CONTINUE" : "GOT IT!"}
         </Button>
      </div>
    </motion.div>
  );

  const renderTips = () => (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-4xl font-display font-black text-brand-gold italic">PRO TIPS</h2>
        <Button variant="ghost" size="icon" onClick={() => handleAction(() => setView('path'))} className="text-brand-gold/40">
           <X />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 pr-2">
         {tips.map((tip) => (
           <div key={tip.id} className="bg-brand-maroon/60 p-8 rounded-[32px] border border-brand-gold/5 flex gap-6">
              <span className="text-brand-gold font-display font-bold text-2xl opacity-20">{tip.id}</span>
              <div>
                <h4 className="text-brand-gold font-display font-bold mb-2 tracking-wide text-sm italic uppercase">{tip.title}</h4>
                <p className="text-brand-gold/60 text-xs leading-relaxed">{tip.content}</p>
              </div>
           </div>
         ))}
      </div>

      <Button onClick={() => handleAction(() => setView('path'))} className="w-full h-16 rounded-[24px] bg-brand-gold text-brand-red font-black mt-8">
         BACK TO MENU
      </Button>
    </motion.div>
  );

  return (
    <div className="fixed inset-0 z-50 bg-brand-red flex items-center justify-center p-6">
      <div className="absolute inset-0 opacity-5 pointer-events-none">
         <div className="absolute top-0 left-0 w-full h-full border-[10px] border-brand-gold" />
      </div>

      <div className="max-w-md w-full relative h-[700px] flex flex-col">
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
