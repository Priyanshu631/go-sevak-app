import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import NetInfo from "@react-native-community/netinfo";
import { getPredictions, PredictionRecord } from './storageService';

const PREDICTIONS_KEY_PREFIX = 'predictions';
const LAST_SYNC_KEY_PREFIX = 'lastSyncedAt';
const getStorageKey = (userId: string) => `${PREDICTIONS_KEY_PREFIX}_${userId}`;
const getLastSyncKey = (userId: string) => `${LAST_SYNC_KEY_PREFIX}_${userId}`;

const mergePredictions = async (serverRecords: PredictionRecord[], userId: string): Promise<number> => {
  const localRecords = await getPredictions(userId);
  const localIds = new Set(localRecords.map(r => r.id));
  const newRecords = serverRecords.filter(r => !localIds.has(r.id));
  if (newRecords.length > 0) {
    const combinedRecords = [...newRecords, ...localRecords];
    await AsyncStorage.setItem(getStorageKey(userId), JSON.stringify(combinedRecords));
  }
  return newRecords.length;
};

export const manualSync = async (): Promise<{
  success: boolean;
  message: string;
  uploadedCount: number;
  downloadedCount: number;
}> => {
  const networkState = await NetInfo.fetch();
  if (!networkState.isConnected) {
    return { success: false, message: "No internet connection.", uploadedCount: 0, downloadedCount: 0 };
  }

  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) {
    return { success: false, message: "You must be logged in to sync.", uploadedCount: 0, downloadedCount: 0 };
  }
  const userId = session.user.id;

  try {
    let uploadCount = 0;
    let downloadCount = 0;

    // --- UPLOAD PHASE ---
    const localRecords = await getPredictions(userId);
    const pendingRecords = localRecords.filter(r => r.status === 'pending_sync');

    if (pendingRecords.length > 0) {
      const uploadedRecords: any[] = [];

      for (const record of pendingRecords) {
        let finalImageUrl = record.image_uri;

        if (record.image_uri.startsWith("file://")) {
          const fileExt = record.image_uri.split('.').pop() || "jpg";
          const fileName = `${record.id}.${fileExt}`;
          const filePath = `${userId}/${fileName}`;

          const RNFetchBlob = require("react-native-blob-util").default;
          const base64 = await RNFetchBlob.fs.readFile(
            record.image_uri.replace("file://", ""),
            "base64"
          );
          const bytes = new Uint8Array(atob(base64).split("").map(c => c.charCodeAt(0)));

          const { data: uploadData, error: uploadError } = await supabase.storage
            .from("prediction_images")
            .upload(filePath, bytes, { contentType: `image/${fileExt}`, upsert: false });

          if (uploadError) throw uploadError;

          const { data: urlData } = supabase.storage
            .from("prediction_images")
            .getPublicUrl(uploadData.path);

          finalImageUrl = urlData.publicUrl;
        }

        uploadedRecords.push({
          id: record.id,
          user_id: userId,
          image_uri: finalImageUrl,
          prediction_result: record.prediction_result,
          status: "synced",
          timestamp: record.timestamp,
        });
      }

      if (uploadedRecords.length > 0) {
        const { error: uploadError } = await supabase.from("predictions").insert(uploadedRecords);
        if (uploadError) throw uploadError;
        uploadCount = uploadedRecords.length;

        const allRecords = await getPredictions(userId);
        const updatedRecords = allRecords.map(r => {
          const uploaded = uploadedRecords.find(u => u.id === r.id);
          return uploaded ? { ...r, status: "synced", image_uri: uploaded.image_uri } : r;
        });
        await AsyncStorage.setItem(getStorageKey(userId), JSON.stringify(updatedRecords));
      }
    }

    // --- DOWNLOAD PHASE ---
    const lastSyncKey = getLastSyncKey(userId);
    const lastSyncedAt = await AsyncStorage.getItem(lastSyncKey) || new Date(0).toISOString();

    const { data: serverRecords, error: downloadError } = await supabase
      .from('predictions')
      .select('*')
      .eq('user_id', userId)
      .gt('created_at', lastSyncedAt);

    if (downloadError) throw downloadError;

    if (serverRecords && serverRecords.length > 0) {
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

    await AsyncStorage.setItem(lastSyncKey, new Date().toISOString());

    return {
      success: true,
      message: `Sync completed.`,
      uploadedCount: uploadCount,
      downloadedCount: downloadCount,
    };

  } catch (error: any) {
    console.error("Supabase sync error:", error);
    return { success: false, message: `Sync failed: ${error.message}`, uploadedCount: 0, downloadedCount: 0 };
  }
};
