import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext'; // Make sure this path is correct
import { getPredictions, PredictionRecord } from '../services/storageService';

// A small component to show the sync status visually
const StatusIndicator = ({ status }: { status: PredictionRecord['status'] }) => {
  const statusInfo = {
    pending_sync: { color: '#FFA500', text: 'Pending' },
    synced: { color: '#32CD32', text: 'Synced' },
    error: { color: '#FF4500', text: 'Error' },
  };
  return (
    <View style={styles.statusContainer}>
      <View style={[styles.statusDot, { backgroundColor: statusInfo[status].color }]} />
      <Text style={[styles.statusText, { color: statusInfo[status].color }]}>
        {statusInfo[status].text}
      </Text>
    </View>
  );
};

export default function HistoryScreen() {
  // NEW: Get the current user from the AuthContext
  const { user } = useAuth();
  const [predictions, setPredictions] = useState<PredictionRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // UPDATED: The function to load predictions now depends on the user
  const loadHistory = useCallback(async () => {
    setIsLoading(true);
    if (user) {
      // Pass the user.id to get their specific records
      const records = await getPredictions(user.id);
      setPredictions(records);
    } else {
      // If no user is logged in, show an empty list
      setPredictions([]);
    }
    setIsLoading(false);
  }, [user]); // The function now re-runs if the user changes

  // useFocusEffect runs every time the screen comes into view
  useFocusEffect(
    useCallback(() => {
      loadHistory();
    }, [loadHistory])
  );

  const renderItem = ({ item }: { item: PredictionRecord }) => {
    // Safely access data to prevent crashes
    const breed = item.prediction_result?.top_prediction?.breed ?? 'Unknown Breed';
    const confidence = item.prediction_result?.top_prediction?.confidence ?? 0;

    return (
      <View style={styles.itemContainer}>
        {/* The image_uri now comes from Supabase Storage and will work on any device */}
        <Image source={{ uri: item.image_uri }} style={styles.thumbnail} />
        <View style={styles.infoContainer}>
          <Text style={styles.breedText}>{breed}</Text>
          <Text style={styles.confidenceText}>
            Confidence: {(confidence * 100).toFixed(1)}%
          </Text>
          <Text style={styles.dateText}>
            {new Date(item.timestamp).toLocaleString()}
          </Text>
        </View>
        <StatusIndicator status={item.status} />
      </View>
    );
  };

  if (isLoading) {
    return <ActivityIndicator size="large" style={styles.centered} />;
  }

  return (
    <SafeAreaView style={styles.container}>
      {predictions.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>No history found.</Text>
          <Text style={styles.emptySubText}>Take a photo on the Home screen to see predictions here.</Text>
        </View>
      ) : (
        <FlatList
          data={predictions}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          onRefresh={loadHistory} // Pull-to-refresh
          refreshing={isLoading}
        />
      )}
    </SafeAreaView>
  );
}

// Styles are unchanged and look great.
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f0f0',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  list: {
    padding: 10,
  },
  itemContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 5,
  },
  thumbnail: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  infoContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  breedText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  confidenceText: {
    fontSize: 14,
    color: '#333',
  },
  dateText: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
  },
  emptyText: {
    fontSize: 18,
    color: '#888',
  },
  emptySubText: {
    fontSize: 14,
    color: '#aaa',
    textAlign: 'center',
    marginTop: 8,
  },
  statusContainer: {
    alignItems: 'center',
    marginLeft: 10,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
});