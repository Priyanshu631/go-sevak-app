import AsyncStorage from '@react-native-async-storage/async-storage';
import uuid from 'react-native-uuid';

export interface PredictionRecord {
  id: string; 
  user_id?: string;
  image_uri: string;
  timestamp: string;
  status: 'pending_sync' | 'synced' | 'error';
  prediction_result: {
    top_prediction: { breed: string; confidence: number };
    top_k: { breed: string; confidence: number }[];
  };
}

const getStorageKey = (userId: string) => `predictions_${userId}`;
export const getLastSyncKey = (userId: string) => `lastSyncedAt_${userId}`;

export const savePrediction = async (
  record: Pick<PredictionRecord, 'image_uri' | 'prediction_result' | 'timestamp'>,
  userId: string
): Promise<void> => {
  const userStorageKey = getStorageKey(userId);
  try {
    const existingRecords = await getPredictions(userId);
    const newRecord: PredictionRecord = {
      id: uuid.v4() as string,
      user_id: userId,
      status: 'pending_sync',
      ...record,
    };
    const updatedRecords = [newRecord, ...existingRecords];
    await AsyncStorage.setItem(userStorageKey, JSON.stringify(updatedRecords));
  } catch (e) {
    console.error('Failed to save prediction to storage', e);
    throw new Error('Failed to save prediction locally.');
  }
};

export const getPredictions = async (userId: string): Promise<PredictionRecord[]> => {
  if (!userId) return [];
  const userStorageKey = getStorageKey(userId);
  try {
    const jsonValue = await AsyncStorage.getItem(userStorageKey);
    return jsonValue != null ? JSON.parse(jsonValue) : [];
  } catch (e) {
    console.error('Failed to fetch predictions from storage', e);
    return [];
  }
};

export const clearAllPredictions = async (userId: string): Promise<void> => {
  if (!userId) return;
  const userStorageKey = getStorageKey(userId);
  const userLastSyncKey = getLastSyncKey(userId);
  try {
    await AsyncStorage.removeItem(userStorageKey);
    await AsyncStorage.removeItem(userLastSyncKey);
    console.log(`Cleared local data for user ${userId}`);
  } catch (e) {
    console.error('Failed to clear predictions from storage', e);
  }
};