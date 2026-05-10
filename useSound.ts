import { useCallback, useEffect } from 'react';
import { playClick, primeClickSound } from '../sound/click';

export const useSound = () => {
  useEffect(() => {
    // Preload early so clicks feel instant.
    primeClickSound();
  }, []);

  const click = useCallback(() => {
    void playClick();
  }, []);

  return { playClick: click };
};
