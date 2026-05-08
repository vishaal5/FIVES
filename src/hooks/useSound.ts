import { useCallback } from 'react';

export const useSound = () => {
  const playClick = useCallback(() => {
    const audio = new Audio('/click_sound.mp3');
    audio.play().catch(err => console.log('Audio play failed:', err));
  }, []);

  return { playClick };
};
