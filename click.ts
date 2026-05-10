let audio: HTMLAudioElement | null = null;
let primed = false;

export function primeClickSound() {
  if (typeof window === 'undefined') return;
  if (primed) return;
  primed = true;

  audio = new Audio('/click_sound.mp3');
  audio.preload = 'auto';
  audio.volume = 1.0;
}

export async function playClick() {
  try {
    if (!audio) primeClickSound();
    if (!audio) return;
    audio.currentTime = 0;
    await audio.play();
  } catch {
    // Ignore (autoplay policies, etc.)
  }
}

