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

export const createRoom = async (roomName: string, maxRounds: number, maxPlayers: number, playerName?: string) => {
  const user = await ensureAuth();
  const roomId = Math.floor(1000 + Math.random() * 8999).toString();
  const roomPath = `rooms/${roomId}`;

  try {
    const roomData = {
      roomName: roomName || 'GAME ROOM',
      hostId: user.uid,
      status: 'lobby',
      round: 1,
      maxGames: maxRounds,
      numPlayers: maxPlayers,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await setDoc(doc(db, roomPath), roomData);
    
    // Add host as player
    await setDoc(doc(db, `${roomPath}/players/${user.uid}`), {
      name: playerName || `Player ${user.uid.substring(0, 4)}`,
      score: 0,
      isConfirmed: true,
      isHost: true,
      lastSeen: serverTimestamp()
    });

    return roomId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, roomPath);
  }
};

export const joinRoom = async (roomId: string, playerName?: string) => {
  const user = await ensureAuth();
  const roomPath = `rooms/${roomId}`;

  try {
    const roomSnap = await getDoc(doc(db, roomPath));
    if (!roomSnap.exists()) {
      throw new Error('Room not found');
    }

    // Add player
    await setDoc(doc(db, `${roomPath}/players/${user.uid}`), {
      name: playerName || `Player ${user.uid.substring(0, 4)}`,
      score: 0,
      isConfirmed: true,
      isHost: false,
      lastSeen: serverTimestamp()
    });

    return roomId;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${roomPath}/players/${user.uid}`);
  }
};

export const subscribeToGame = (roomId: string, callback: (data: any) => void) => {
  return onSnapshot(doc(db, `rooms/${roomId}`), (snapshot) => {
    if (snapshot.exists()) {
      callback(snapshot.data());
    }
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, `rooms/${roomId}`);
  });
};

export const subscribeToPlayers = (roomId: string, callback: (players: any[]) => void) => {
  return onSnapshot(collection(db, `rooms/${roomId}/players`), (snapshot) => {
    const players = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(players);
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, `rooms/${roomId}/players`);
  });
};

export const updateGameState = async (roomId: string, data: any) => {
  const roomPath = `rooms/${roomId}`;
  try {
    await updateDoc(doc(db, roomPath), {
      ...data,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, roomPath);
  }
};

export const updatePlayerState = async (roomId: string, playerId: string, data: any) => {
  const playerPath = `rooms/${roomId}/players/${playerId}`;
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
