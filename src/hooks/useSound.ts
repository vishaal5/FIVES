import { useCallback, useRef } from 'react';

export const useSound = () => {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const playClick = useCallback(() => {
    try {
      if (!audioRef.current) {
        // Use a reliable CDN fallback since local files might be missing
        audioRef.current = new Audio('https://cdn.pixabay.com/audio/2022/11/25/audio_91709674dc.mp3');
        audioRef.current.volume = 0.4;
      }
      
      const audio = audioRef.current;
      audio.pause();
      audio.currentTime = 0;
      audio.play().catch(err => {
        console.log('Audio play failed (interaction required?):', err);
        // If it failed, try re-initializing on next click
        audioRef.current = null;
      });
    } catch (err) {
      console.error('Sound error:', err);
    }
  }, []);

  return { playClick };
};
