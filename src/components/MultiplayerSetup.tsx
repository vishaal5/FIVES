
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
  onCreateRoom: (roomName: string, rounds: number, maxPlayers: number, playerName: string) => void;
  onJoinRoom: (roomId: string, playerName: string) => void;
  initialPlayerName?: string;
}

const MultiplayerSetup: React.FC<MultiplayerSetupProps> = ({ onBack, onCreateRoom, onJoinRoom, initialPlayerName }) => {
  const [roomId, setRoomId] = useState('');
  const [rounds, setRounds] = useState(3);
  const [maxPlayers, setMaxPlayers] = useState(2);
  const [roomName, setRoomName] = useState('GAME ROOM');
  const [tempPlayerName, setTempPlayerName] = useState(initialPlayerName || '');
  const [mode, setMode] = useState<'selection' | 'create' | 'join'>('selection');
  const [isProcessing, setIsProcessing] = useState(false);
  const { playClick } = useSound();

  const handleAction = async (action: () => void | Promise<void>) => {
    if (isProcessing) return;
    setIsProcessing(true);
    playClick();
    try {
      await action();
    } catch (err) {
      console.error("Multiplayer Action Error:", err);
    } finally {
      setIsProcessing(false);
    }
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
    <div className="min-h-screen bg-brand-maroon flex flex-col items-center justify-center p-6 relative overflow-y-auto overflow-x-hidden no-scrollbar">
      {/* Decorative corners */}
      <div className="absolute inset-0 border-[10px] border-brand-gold/5 pointer-events-none fixed" />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full z-10 py-12"
      >
        <Button variant="ghost" onClick={() => handleAction(onBack)} className="mb-6 text-brand-gold/40 hover:text-brand-gold p-0 group no-theme">
          <ArrowLeft className="mr-2 h-4 w-4 group-hover:-translate-x-1 transition-transform" /> <span className="text-[10px] font-black tracking-widest embossed">BACK TO MENU</span>
        </Button>

        {mode === 'selection' && (
          <div className="space-y-6 text-center">
            <div className="mb-12">
               <span className="text-[9px] font-black uppercase tracking-[0.4em] text-brand-gold/40 embossed">MULTIPLAYER MODE</span>
               <h2 className="text-3xl sm:text-4xl font-display font-black tracking-tighter mt-2 italic uppercase break-words px-4 text-brand-gold embossed">MULTIPLAYER</h2>
            </div>
            
            <Button 
               onClick={() => handleAction(() => setMode('create'))}
               className="w-full h-24 sm:h-32 text-xl sm:text-2xl font-display font-black bg-brand-gold text-brand-red hover:bg-brand-gold/90 rounded-[40px] shadow-2xl flex flex-col items-center justify-center gap-0 group transition-all break-words no-theme"
            >
              <Plus className="h-5 w-5 sm:h-6 sm:w-6 mb-2 group-hover:rotate-90 transition-transform text-brand-red" />
              <span className="italic tracking-tighter embossed text-brand-red">CREATE ROOM</span>
            </Button>
            
            <div className="relative py-8">
               <div className="absolute inset-0 flex items-center"><div className="w-full border-t-2 border-brand-gold/5"></div></div>
               <span className="relative px-6 bg-brand-maroon text-brand-gold/10 text-[10px] font-black uppercase tracking-[0.4em] embossed">OR ENTER CODE</span>
            </div>

            <Button 
               onClick={() => handleAction(() => setMode('join'))}
               variant="outline"
               className="w-full h-24 sm:h-32 text-xl sm:text-2xl font-display font-black premium-border text-brand-gold bg-brand-maroon/40 hover:bg-brand-gold/10 rounded-[40px] flex flex-col items-center justify-center gap-0 group transition-all break-words no-theme"
            >
              <Users className="h-5 w-5 sm:h-6 sm:w-6 mb-2 group-hover:scale-110 transition-transform text-brand-gold" />
              <span className="italic tracking-tighter embossed">JOIN LOBBY</span>
            </Button>
          </div>
        )}

        {mode === 'create' && (
          <div className="premium-card p-8 sm:p-10 rounded-[50px] shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-5">
                 <Plus size={120} className="text-brand-gold" />
              </div>
              
              <h2 className="text-3xl font-display font-black mb-2 italic text-brand-gold embossed">HOST GAME</h2>
              <p className="text-[10px] font-black uppercase tracking-widest mb-10 opacity-60 text-brand-gold embossed">SETUP YOUR DUEL LOBBY</p>
              
              <div className="space-y-8">
                <div className="space-y-3">
                  <Label className="text-[10px] font-black text-brand-gold/40 uppercase tracking-widest ml-2 embossed">Room Name</Label>
                  <Input 
                    value={roomName}
                    onChange={(e) => setRoomName(e.target.value.toUpperCase())}
                    className="h-16 text-xl font-display font-black uppercase bg-brand-maroon/40 premium-border text-brand-gold rounded-[24px] focus:border-brand-gold px-6 embossed no-theme"
                    placeholder="ENTER ROOM NAME"
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-3 ml-2">
                    <Users size={14} className="text-brand-gold/40 embossed" />
                    <Label className="text-[10px] font-black text-brand-gold/40 uppercase tracking-widest p-0 leading-none embossed">Max Players</Label>
                    <span className="ml-auto text-xl font-display font-bold text-brand-gold embossed">{maxPlayers}</span>
                  </div>
                  <div className="flex gap-2">
                    {[2, 3, 4, 5].map(p => (
                      <Button
                        key={p}
                        variant="outline"
                        className={cn(
                          "flex-1 h-16 rounded-2xl font-black text-xl transition-all no-theme",
                          maxPlayers === p 
                            ? "bg-brand-gold text-brand-red border-brand-gold shadow-lg shadow-brand-gold/20" 
                            : "bg-transparent text-brand-gold border-brand-gold/10 hover:bg-brand-gold/10"
                        )}
                        onClick={() => handleAction(() => setMaxPlayers(p))}
                      >
                        <span className="embossed">{p}</span>
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-3 ml-2">
                    <PlayCircle size={14} className="text-brand-gold/40 embossed" />
                    <Label className="text-[10px] font-black text-brand-gold/40 uppercase tracking-widest p-0 leading-none embossed">Match Rounds</Label>
                    <span className="ml-auto text-xl font-display font-bold text-brand-gold embossed">{rounds}</span>
                  </div>
                  <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                    {[3, 5, 10, 15].map(r => (
                      <Button
                        key={r}
                        variant="outline"
                        className={cn(
                          "flex-1 min-w-[60px] h-16 rounded-2xl font-black text-xl transition-all no-theme",
                          rounds === r 
                            ? "bg-brand-gold text-brand-red border-brand-gold shadow-lg shadow-brand-gold/20" 
                            : "bg-transparent text-brand-gold border-brand-gold/10 hover:bg-brand-gold/10"
                        )}
                        onClick={() => handleAction(() => setRounds(r))}
                      >
                        <span className="embossed">{r}</span>
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <Button variant="ghost" onClick={() => handleAction(() => setMode('selection'))} className="flex-1 text-brand-gold/40 font-bold h-16 embossed no-theme">CANCEL</Button>
                  <Button 
                    onClick={() => handleAction(() => onCreateRoom(roomName, rounds, maxPlayers, tempPlayerName))} 
                    className="flex-[2] h-16 rounded-[24px] bg-brand-gold text-brand-red font-black text-xl shadow-xl shadow-brand-gold/10 disabled:opacity-25 no-theme"
                    disabled={!roomName.trim() || !tempPlayerName.trim() || isProcessing}
                  >
                    <span className="embossed text-brand-red">{isProcessing ? "CREATING..." : "CREATE & ENTER"}</span>
                  </Button>
                </div>
              </div>
          </div>
        )}

        {mode === 'join' && (
          <div className="premium-card p-10 rounded-[50px] shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-5">
                 <Users size={120} className="text-brand-gold" />
              </div>
              
              <h2 className="text-3xl font-display font-black mb-2 italic text-brand-gold embossed">JOIN ROOM</h2>
              <p className="text-[10px] font-black uppercase tracking-widest mb-10 opacity-60 text-brand-gold embossed">ENTER ROOM CODE</p>
              
              <div className="space-y-10">
                <div className="space-y-4">
                  <Label htmlFor="player-name" className="text-[10px] font-black text-brand-gold/40 uppercase tracking-widest ml-2 embossed">Your Name</Label>
                  <Input 
                     id="player-name" 
                     placeholder="ENTER NAME" 
                     value={tempPlayerName} 
                     onChange={(e) => setTempPlayerName(e.target.value.toUpperCase())}
                     className="h-16 text-xl font-display font-black uppercase text-center bg-brand-maroon/40 premium-border text-brand-gold rounded-[24px] focus:border-brand-gold transition-all embossed no-theme"
                  />
                </div>

                <div className="space-y-4">
                  <Label htmlFor="room-id" className="text-[10px] font-black text-brand-gold/40 uppercase tracking-widest ml-2 embossed">Room Code</Label>
                  <Input 
                     id="room-id" 
                     placeholder="E.G. 1234" 
                     value={roomId} 
                     onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                     className="h-20 text-2xl font-display font-black uppercase text-center bg-brand-maroon/40 premium-border text-brand-gold rounded-[32px] placeholder:text-brand-gold/5 focus:border-brand-gold transition-all embossed no-theme"
                  />
                </div>

                <div className="flex gap-4 pt-4">
                  <Button variant="ghost" onClick={() => handleAction(() => setMode('selection'))} className="flex-1 text-brand-gold/40 font-bold h-16 embossed no-theme">CANCEL</Button>
                  <Button 
                     disabled={!roomId || !tempPlayerName.trim() || isProcessing} 
                     onClick={() => handleAction(() => onJoinRoom(roomId, tempPlayerName))} 
                     className="flex-[2] h-16 rounded-[24px] bg-brand-gold text-brand-red font-black text-xl shadow-xl shadow-brand-gold/10 disabled:opacity-20 no-theme"
                  >
                    <span className="embossed text-brand-red">{isProcessing ? "JOINING..." : "JOIN LOBBY"}</span>
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
