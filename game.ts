
export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades' | 'joker';
export type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'JK';

export interface Card {
  id: string;
  suit: Suit;
  rank: Rank;
  isPretendJoker?: boolean;
}

export type GameStatus = 'waiting' | 'playing' | 'round_over' | 'game_over' | 'final_results';

export interface Player {
  id: string;
  name: string;
  hand: Card[];
  score: number;
  totalScore?: number;
  isAI?: boolean;
  isCPU?: boolean;
  isHost?: boolean;
  isConfirmed?: boolean;
  hasCalled?: boolean;
}

export interface GameState {
  id: string;
  players: Player[];
  deck: Card[];
  discardPile: Card[];
  openPile?: Card[];
  openCard: Card | null;
  jokerCard?: Card;
  jokerRank: Rank;
  currentPlayerIndex: number;
  startingPlayerIndex?: number;
  numPlayers: number;
  roundCount: number;
  gameCount: number;
  maxGames: number;
  status: GameStatus;
  winner?: string | null;
  deckingPlayerId?: string | null;
  deckingValue?: number | null;
  deckChallengeEndTime?: number | null;
  roundWinnerId?: string | null;
  message: string;
  lastAction?: string;
  turnStartTime?: number;
  availableCardAtTurnStart: Card | null;
}
