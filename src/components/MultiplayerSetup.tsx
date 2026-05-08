
import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { ArrowLeft, Users, Plus, PlayCircle } from 'lucide-react';
import { cn } from '../lib/utils';
import { useSound } from '../hooks/useSound';

interface MultiplayerSetupProps {
  onBack: () => void;
  onCreateRoom: (rounds: number) => void;
  onJoinRoom: (roomId: string) => void;
}

const MultiplayerSetup: React.FC<MultiplayerSetupProps> = ({ onBack, onCreateRoom, onJoinRoom }) => {
  const [roomId, setRoomId] = useState('');
  const [rounds, setRounds] = useState(3);
  const [mode, setMode] = useState<'selection' | 'create' | 'join'>('selection');
  const { playClick } = useSound();

  const handleAction = (action: () => void) => {
    playClick();
    action();
  };

  return (
    <div className="min-h-screen bg-brand-red flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Decorative corners */}
      <div className="absolute inset-0 border-[10px] border-brand-gold/10 pointer-events-none" />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full z-10"
      >
        <Button variant="ghost" onClick={() => handleAction(onBack)} className="mb-6 text-brand-gold/40 hover:text-brand-gold p-0 group">
          <ArrowLeft className="mr-2 h-4 w-4 group-hover:-translate-x-1 transition-transform" /> <span className="text-[10px] font-black tracking-widest">BACK TO MENU</span>
        </Button>

        {mode === 'selection' && (
          <div className="space-y-6 text-center">
            <div className="mb-12">
               <span className="text-[10px] font-black uppercase tracking-[0.4em] text-brand-gold/40">Duel Mode</span>
               <h2 className="text-5xl font-display font-black text-brand-gold tracking-tighter mt-2 italic uppercase">MULTIPLAYER</h2>
            </div>
            
            <Button 
               onClick={() => handleAction(() => setMode('create'))}
               className="w-full h-32 text-2xl font-display font-black bg-brand-gold text-brand-red hover:bg-brand-gold/90 rounded-[40px] shadow-2xl flex flex-col items-center justify-center gap-0 group transition-all"
            >
              <Plus className="h-6 w-6 mb-2 group-hover:rotate-90 transition-transform" />
              <span className="italic tracking-tighter">CREATE ROOM</span>
            </Button>
            
            <div className="relative py-8">
               <div className="absolute inset-0 flex items-center"><div className="w-full border-t-2 border-brand-gold/5"></div></div>
               <span className="relative px-6 bg-brand-red text-brand-gold/20 text-[10px] font-black uppercase tracking-[0.4em]">OR ENTER CODE</span>
            </div>

            <Button 
               onClick={() => handleAction(() => setMode('join'))}
               variant="outline"
               className="w-full h-32 text-2xl font-display font-black border-2 border-brand-gold/10 text-brand-gold bg-brand-maroon/40 hover:bg-brand-gold/10 rounded-[40px] flex flex-col items-center justify-center gap-0 group transition-all"
            >
              <Users className="h-6 w-6 mb-2 group-hover:scale-110 transition-transform" />
              <span className="italic tracking-tighter">JOIN BATTLE</span>
            </Button>
          </div>
        )}

        {mode === 'create' && (
          <div className="bg-brand-maroon/80 backdrop-blur-3xl border-4 border-brand-gold/10 p-10 rounded-[50px] shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-5">
                 <Plus size={120} className="text-brand-gold" />
              </div>
              
              <h2 className="text-3xl font-display font-black text-brand-gold mb-2 italic">HOST GAME</h2>
              <p className="text-brand-gold/40 text-[10px] font-black uppercase tracking-widest mb-10">SETUP YOUR DUEL LOBBY</p>
              
              <div className="space-y-10">
                <div className="space-y-6">
                  <div className="flex items-center gap-3 ml-2">
                    <PlayCircle size={14} className="text-brand-gold/40" />
                    <Label className="text-[10px] font-black text-brand-gold/40 uppercase tracking-widest p-0 leading-none">Match Rounds</Label>
                    <span className="ml-auto text-xl font-display font-bold text-brand-gold">{rounds}</span>
                  </div>
                  <div className="flex gap-2">
                    {[3, 5, 10, 15].map(r => (
                      <Button
                        key={r}
                        variant="outline"
                        className={cn(
                          "flex-1 h-16 rounded-2xl font-black text-xl transition-all",
                          rounds === r 
                            ? "bg-brand-gold text-brand-red border-brand-gold shadow-lg shadow-brand-gold/20" 
                            : "bg-transparent text-brand-gold border-brand-gold/10 hover:bg-brand-gold/10"
                        )}
                        onClick={() => handleAction(() => setRounds(r))}
                      >
                        {r}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <Button variant="ghost" onClick={() => handleAction(() => setMode('selection'))} className="flex-1 text-brand-gold/40 font-bold h-16">CANCEL</Button>
                  <Button onClick={() => handleAction(() => onCreateRoom(rounds))} className="flex-[2] h-16 rounded-[24px] bg-brand-gold text-brand-red font-black text-xl shadow-xl shadow-brand-gold/10">CREATE & ENTER</Button>
                </div>
              </div>
          </div>
        )}

        {mode === 'join' && (
          <div className="bg-brand-maroon/80 backdrop-blur-3xl border-4 border-brand-gold/10 p-10 rounded-[50px] shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-5">
                 <Users size={120} className="text-brand-gold" />
              </div>
              
              <h2 className="text-3xl font-display font-black text-brand-gold mb-2 italic">JOIN DUEL</h2>
              <p className="text-brand-gold/40 text-[10px] font-black uppercase tracking-widest mb-10">ENTER THE DUELING CODE</p>
              
              <div className="space-y-10">
                <div className="space-y-4">
                  <Label htmlFor="room-id" className="text-[10px] font-black text-brand-gold/40 uppercase tracking-widest ml-2">Secret Code</Label>
                  <Input 
                     id="room-id" 
                     placeholder="E.G. AB12XY" 
                     value={roomId} 
                     onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                     className="h-20 text-4xl font-display font-black uppercase text-center bg-brand-maroon/40 border-2 border-brand-gold/10 text-brand-gold rounded-[32px] placeholder:text-brand-gold/5 focus:border-brand-gold transition-all"
                  />
                </div>

                <div className="flex gap-4 pt-4">
                  <Button variant="ghost" onClick={() => handleAction(() => setMode('selection'))} className="flex-1 text-brand-gold/40 font-bold h-16">CANCEL</Button>
                  <Button 
                     disabled={!roomId} 
                     onClick={() => handleAction(() => onJoinRoom(roomId))} 
                     className="flex-[2] h-16 rounded-[24px] bg-brand-gold text-brand-red font-black text-xl shadow-xl shadow-brand-gold/10 disabled:opacity-20"
                  >
                    JOIN BATTLE
                  </Button>
                </div>
              </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default MultiplayerSetup;
