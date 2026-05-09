import { Card, Rank, Suit } from '../types/game';

const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
const RANKS: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

export const createDeck = (): Card[] => {
  const deck: Card[] = [];
  SUITS.forEach(suit => {
    RANKS.forEach(rank => {
      deck.push({
        id: `${suit}-${rank}-${Math.random().toString(36).substr(2, 9)}`,
        suit,
        rank,
        isPretendJoker: false
      });
    });
  });
  // Add 2 official Jokers
  for (let i = 0; i < 2; i++) {
    deck.push({
      id: `joker-${i}-${Math.random().toString(36).substr(2, 9)}`,
      rank: 'JK',
      isPretendJoker: false,
      suit: 'joker'
    });
  }
  return shuffle(deck);
};

export const shuffle = <T>(array: T[]): T[] => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

export const getCardValue = (card: Card, pretendJokerRank: Rank | null): number => {
  if (card.rank === 'JK' || card.isPretendJoker || card.rank === pretendJokerRank) return 0;
  
  switch (card.rank) {
    case 'A': return 1;
    case 'J':
    case 'Q':
    case 'K': return 10;
    default: return parseInt(card.rank);
  }
};

export const calculateHandValue = (hand: Card[], pretendJokerRank: Rank | null): number => {
  return hand.reduce((total, card) => total + getCardValue(card, pretendJokerRank), 0);
};

export const getInitSetup = (deck: Card[]) => {
  const card1 = deck.pop()!;
  const card2 = deck.pop()!;
  
  const val1 = getRankNumericalValue(card1.rank);
  const val2 = getRankNumericalValue(card2.rank);
  
  let pretendJokerRank: Rank;
  let openCard: Card;
  
  if (val1 < val2) {
    pretendJokerRank = card1.rank;
    openCard = card2;
  } else {
    pretendJokerRank = card2.rank;
    openCard = card1;
  }
  
  return { pretendJokerRank, openCard };
};

const getRankNumericalValue = (rank: Rank): number => {
  if (rank === 'JK') return 0;
  if (rank === 'A') return 1;
  if (rank === 'J') return 11;
  if (rank === 'Q') return 12;
  if (rank === 'K') return 13;
  return parseInt(rank);
};
