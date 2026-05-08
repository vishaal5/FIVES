/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  onSnapshot, 
  collection, 
  query, 
  where,
  serverTimestamp,
  increment,
  getDocFromServer
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { signInAnonymously } from 'firebase/auth';
import { GameState, Player, Card } from '../types/game';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: any;
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const ensureAuth = async () => {
  if (!auth.currentUser) {
    await signInAnonymously(auth);
  }
  return auth.currentUser!;
};

export const createRoom = async (rounds: number) => {
  const user = await ensureAuth();
  const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
  const gamePath = `games/${roomId}`;

  try {
    const gameData = {
      hostId: user.uid,
      status: 'waiting',
      round: 1,
      maxRounds: rounds,
      turn: 0,
      pretendJokerRank: null,
      openPile: [],
      deckCount: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await setDoc(doc(db, gamePath), gameData);
    
    // Add host as player
    await setDoc(doc(db, `${gamePath}/players/${user.uid}`), {
      name: `Player ${user.uid.substring(0, 4)}`,
      score: 0,
      isReady: true,
      hasCalled: false,
      hand: []
    });

    return roomId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, gamePath);
  }
};

export const joinRoom = async (roomId: string) => {
  const user = await ensureAuth();
  const gamePath = `games/${roomId}`;

  try {
    const gameSnap = await getDoc(doc(db, gamePath));
    if (!gameSnap.exists()) {
      throw new Error('Room not found');
    }

    // Add player
    await setDoc(doc(db, `${gamePath}/players/${user.uid}`), {
      name: `Player ${user.uid.substring(0, 4)}`,
      score: 0,
      isReady: true,
      hasCalled: false,
      hand: []
    });

    return roomId;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${gamePath}/players/${user.uid}`);
  }
};

export const subscribeToGame = (roomId: string, callback: (data: any) => void) => {
  return onSnapshot(doc(db, `games/${roomId}`), (snapshot) => {
    if (snapshot.exists()) {
      callback(snapshot.data());
    }
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, `games/${roomId}`);
  });
};

export const subscribeToPlayers = (roomId: string, callback: (players: any[]) => void) => {
  return onSnapshot(collection(db, `games/${roomId}/players`), (snapshot) => {
    const players = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(players);
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, `games/${roomId}/players`);
  });
};

export const updateGameState = async (roomId: string, data: any) => {
  const gamePath = `games/${roomId}`;
  try {
    await updateDoc(doc(db, gamePath), {
      ...data,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, gamePath);
  }
};

export const updatePlayerState = async (roomId: string, playerId: string, data: any) => {
  const playerPath = `games/${roomId}/players/${playerId}`;
  try {
    await updateDoc(doc(db, playerPath), data);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, playerPath);
  }
};

export const testConnection = async () => {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if(error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
  }
};
