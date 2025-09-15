import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import NetInfo from "@react-native-community/netinfo";
import { getPredictions, PredictionRecord } from './storageService';

// --- HELPERS FOR USER-SPECIFIC KEYS ---
const PREDICTIONS_KEY_PREFIX = 'predictions';
const LAST_SYNC_KEY_PREFIX = 'lastSyncedAt';
const getStorageKey = (userId: string) => `${PREDICTIONS_KEY_PREFIX}_${userId}`;
const getLastSyncKey = (userId: string) => `${LAST_SYNC_KEY_PREFIX}_${userId}`;

// --- HELPER to merge downloaded data into local storage ---
const mergePredictions = async (serverRecords: PredictionRecord[], userId: string): Promise<number> => {
  const localRecords = await getPredictions(userId);
  const localIds = new Set(localRecords.map(r => r.id));
  
  // Filter out any records that the client already has
  const newRecords = serverRecords.filter(r => !localIds.has(r.id));
  
  if (newRecords.length > 0) {
    const combinedRecords = [...newRecords, ...localRecords]; // Add new records to the top of the list
    await AsyncStorage.setItem(getStorageKey(userId), JSON.stringify(combinedRecords));
  }
  return newRecords.length; // Return the count of newly added records
};

// --- HELPER to update local statuses after a successful upload ---
const updateLocalStatuses = async (ids: string[], newStatus: PredictionRecord['status'], userId: string) => {
  const allRecords = await getPredictions(userId);
  const updatedRecords = allRecords.map(record => 
    ids.includes(record.id) ? { ...record, status: newStatus } : record
  );
  await AsyncStorage.setItem(getStorageKey(userId), JSON.stringify(updatedRecords));
};

// --- MAIN SYNC FUNCTION ---
export const manualSync = async (): Promise<{ success: boolean; message: string }> => {
  // 1. Check for network
  const networkState = await NetInfo.fetch();
  if (!networkState.isConnected) {
    return { success: false, message: "No internet connection." };
  }

  // 2. Check for logged-in user
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) {
    return { success: false, message: "You must be logged in to sync." };
  }
  const userId = session.user.id;

  try {
    let uploadCount = 0;
    let downloadCount = 0;

    // --- UPLOAD PHASE ---
    const localRecords = await getPredictions(userId);
    const pendingRecords = localRecords.filter(r => r.status === 'pending_sync');
    
    if (pendingRecords.length > 0) {
      console.log(`Sync Service: Found ${pendingRecords.length} records to upload.`);
      const recordsToUpload = pendingRecords.map(r => ({
        id: r.id,
        user_id: userId,
        image_uri: r.image_uri,
        prediction_result: r.prediction_result,
        status: 'synced', // Set status to 'synced' for the server
        timestamp: r.timestamp,
      }));

      const { error: uploadError } = await supabase.from('predictions').insert(recordsToUpload);
      if (uploadError) throw uploadError;

      uploadCount = pendingRecords.length;
      const syncedIds = pendingRecords.map(r => r.id);
      await updateLocalStatuses(syncedIds, 'synced', userId);
    }

    // --- DOWNLOAD PHASE ---
    const lastSyncKey = getLastSyncKey(userId);
    const lastSyncedAt = await AsyncStorage.getItem(lastSyncKey) || new Date(0).toISOString();
    console.log(`Sync Service: Fetching records created after ${lastSyncedAt}`);
    
    const { data: serverRecords, error: downloadError } = await supabase
      .from('predictions')
      .select('*')
      .eq('user_id', userId)
      .gt('created_at', lastSyncedAt);

    if (downloadError) throw downloadError;

    if (serverRecords && serverRecords.length > 0) {
      console.log(`Sync Service: Found ${serverRecords.length} records to download.`);
      const formattedServerRecords: PredictionRecord[] = serverRecords.map(r => ({
        id: r.id,
        user_id: r.user_id,
        image_uri: r.image_uri,
        prediction_result: r.prediction_result,
        status: 'synced',
        timestamp: r.timestamp,
      }));
      downloadCount = await mergePredictions(formattedServerRecords, userId);
    }
    
    // --- FINALIZATION ---
    await AsyncStorage.setItem(lastSyncKey, new Date().toISOString());

    if (uploadCount === 0 && downloadCount === 0) {
      return { success: true, message: 'Your data is already up to date.' };
    }

    return { success: true, message: `Sync successful! Uploaded: ${uploadCount}, Downloaded: ${downloadCount}.` };

  } catch (error: any) {
    console.error("Supabase sync error:", error);
    return { success: false, message: `Sync failed: ${error.message}` };
  }
};