
export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'Joker';

export interface Card {
  id: string;
  suit?: Suit;
  rank: Rank;
  isPretendJoker: boolean;
}

export type GameStatus = 'waiting' | 'playing' | 'round_over' | 'game_over';

export interface Player {
  id: string;
  name: string;
  hand: Card[];
  score: number;
  isAI: boolean;
  isHost: boolean;
  hasCalled: boolean;
}

export interface GameState {
  id: string;
  players: Player[];
  deck: Card[];
  openPile: Card[];
  turn: number; // Index of the player whose turn it is
  round: number;
  maxRounds: number;
  status: GameStatus;
  turnPhase: 'discard' | 'draw';
  pretendJokerRank: Rank | null;
  history: string[];
}
