/** Marks onboarding done so Home + GameBoard solo/multi unlock consistently. */
export function unlockTutorialProgress(): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('fives_tutorial_complete', 'true');
  localStorage.setItem('fives_has_visited', 'true');
}
