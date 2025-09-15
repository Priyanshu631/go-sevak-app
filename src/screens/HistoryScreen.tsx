import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  ActivityIndicator,
  ImageBackground,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { getPredictions, PredictionRecord } from '../services/storageService';
import ScreenWrapper from '../components/ScreenWrapper';
import { Card } from '../components/Card';
import { Heading, BodyText } from '../components/Typography';
import { theme } from '../theme/theme';

const backgroundImg = require('../assets/bg.png');

const StatusIndicator = ({ status }: { status: PredictionRecord['status'] }) => {
  const statusInfo = {
    pending_sync: { color: '#bd7d34ff', text: 'Pending' },
    synced: { color: '#1e7e1eff', text: 'Synced' },
    error: { color: '#862c0bff', text: 'Error' },
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
  const { user } = useAuth();
  const [predictions, setPredictions] = useState<PredictionRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const insets = useSafeAreaInsets();

  const loadHistory = useCallback(async () => {
    setIsLoading(true);
    if (user) {
      const records = await getPredictions(user.id);
      setPredictions(records);
    } else {
      setPredictions([]);
    }
    setIsLoading(false);
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadHistory();
    }, [loadHistory])
  );

  const renderItem = ({ item }: { item: PredictionRecord }) => {
    const breed = item.prediction_result?.top_prediction?.breed ?? 'Unknown Breed';
    const confidence = item.prediction_result?.top_prediction?.confidence ?? 0;

    return (
      <View style={styles.itemContainer}>
        <View style={styles.itemContent}>
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
      </View>
    );
  };

  const isListEmpty = predictions.length === 0;

  return (
    <ImageBackground source={backgroundImg} style={styles.background} resizeMode="repeat">
      <SafeAreaView style={styles.safeArea}>
        <ScreenWrapper
          style={[
            styles.screenWrapper,
            isListEmpty && styles.screenWrapperEmpty,
          ]}
        >
          <Card
            style={[
              styles.mainCard,
              isListEmpty && styles.emptyCard,
              { maxHeight: `85%` }, // limit card height
            ]}
          >
            {/* Header */}
            <View style={styles.cardHeader}>
              <Heading>Prediction History</Heading>
            </View>

            {/* Body */}
            {isLoading ? (
              <ActivityIndicator
                size="large"
                color={theme.colors.accent}
                style={styles.centered}
              />
            ) : isListEmpty ? (
              <View style={styles.emptyBody}>
                <BodyText style={styles.emptyText}>No history found.</BodyText>
                <BodyText style={styles.emptySubText}>
                  Take a photo on the Home screen to see predictions here.
                </BodyText>
              </View>
            ) : (
              <FlatList
                data={predictions}
                renderItem={renderItem}
                keyExtractor={(item) => String(item.id)}
                contentContainerStyle={[
                  styles.list,
                  { paddingBottom: insets.bottom + 20 },
                ]}
                onRefresh={loadHistory}
                refreshing={isLoading}
                style={{ width: '100%' }}
              />
            )}
          </Card>
        </ScreenWrapper>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1 },
  safeArea: { flex: 1, backgroundColor: 'transparent' },
  screenWrapper: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  screenWrapperEmpty: {
    justifyContent: 'center',
  },
  mainCard: {
    padding: 20,
    borderWidth: 2,
    borderColor: theme.colors.border,
    alignSelf: 'stretch',
  },
  emptyCard: {
    width: '90%',
    alignSelf: 'center',
  },
  cardHeader: {
    paddingHorizontal: 10,
    paddingVertical: 10,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  emptyBody: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    paddingTop: 20,
  },
  itemContainer: {
    backgroundColor: 'transparent',
    padding: 12,
    marginBottom: 10,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: theme.colors.border,
  },
  itemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  thumbnail: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
    borderWidth: 2,
    borderColor: theme.colors.border,
  },
  infoContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  breedText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text,
    fontFamily: 'serif',
  },
  confidenceText: {
    fontSize: 14,
    color: theme.colors.text,
    fontFamily: 'serif',
  },
  dateText: {
    fontSize: 12,
    color: '#4b2505ff',
    marginTop: 4,
    fontFamily: 'serif',
  },
  emptyText: {
    fontSize: 18,
    color: theme.colors.text,
    textAlign: 'center',
  },
  emptySubText: {
    fontSize: 14,
    color: theme.colors.text,
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
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'serif',
  },
});
