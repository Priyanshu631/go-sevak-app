import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  Alert,
  PermissionsAndroid,
  Platform,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  ImageBackground,
  Image,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import { NativeModules } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { savePrediction } from '../services/storageService';
import ScreenWrapper from '../components/ScreenWrapper';
import { Card } from '../components/Card';
import { Heading, BodyText } from '../components/Typography';
import { PrimaryButton } from '../components/Button';
import { theme } from '../theme/theme';

const { PytorchModule } = NativeModules;
const backgroundImg = require('../assets/bg.png');

interface Prediction {
  breed: string;
  confidence: number;
}

interface PredictionResult {
  top_prediction: Prediction;
  top_k: Prediction[];
}

export default function HomeScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const [modelLoaded, setModelLoaded] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const [predictionResult, setPredictionResult] = useState<PredictionResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingUpload, setPendingUpload] = useState(false);

  useEffect(() => {
    StatusBar.setHidden(false, 'fade');
    const loadModel = async () => {
      try {
        setError(null);
        setModelLoaded(false);
        const maxRetries = 3;
        let lastError;
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            const result = await PytorchModule.loadModel('model.ptl');
            if (result === true) {
              setModelLoaded(true);
              return;
            }
          } catch (err) {
            lastError = err;
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
        throw lastError || new Error('Model loading failed after multiple attempts');
      } catch (e: any) {
        setError('Critical Error: Could not load the AI model. ' + e.message);
        setModelLoaded(false);
        Alert.alert(
          'Model Loading Error',
          'Failed to initialize the AI model. Please ensure you have enough storage space and try restarting the app.',
          [{ text: 'OK' }]
        );
      } finally {
        setIsLoading(false);
      }
    };
    loadModel();
    return () => {
      setModelLoaded(false);
      setPredictionResult(null);
      setError(null);
      setPhoto(null);
    };
  }, []);

  const processImage = useCallback(
    async (uri: string) => {
      if (!uri || !user) {
        Alert.alert('Authentication Error', 'You must be logged in to make a prediction.');
        return;
      }
      if (!modelLoaded) {
        Alert.alert('Error', 'Please wait for the model to load completely.');
        return;
      }

      setPhoto(uri);
      setPredictionResult(null);
      setError(null);
      setIsLoading(true);
      setPendingUpload(false);

      try {
        const rawResult: PredictionResult = await PytorchModule.predict(uri);
        if (!rawResult || !rawResult.top_prediction) throw new Error('Invalid prediction result');

        if (rawResult.top_prediction.confidence < 0.25) {
          setError('Confidence Too Low! Please upload a valid bovine breed image.');
          setPredictionResult(null);
          return;
        }
        await savePrediction(
          { image_uri: uri, prediction_result: rawResult },
          user.id
        );
        setPredictionResult(rawResult);
        setPendingUpload(true);
      } catch (err: any) {
        setError('Failed to process image. ' + err.message);
        Alert.alert('Processing Error', 'Failed to process image. ' + err.message);
      } finally {
        setIsLoading(false);
      }
    },
    [modelLoaded, user]
  );

  const requestCameraPermission = useCallback(async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA, {
          title: 'Camera Permission',
          message: 'This app needs camera permission to identify cattle breeds.',
          buttonPositive: 'OK',
          buttonNegative: 'Cancel',
        });
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch {
        return false;
      }
    }
    return true;
  }, []);

  const handleTakePhoto = useCallback(async () => {
    if (!(await requestCameraPermission())) {
      Alert.alert('Permission Denied', 'Camera permission is required to take photos.');
      return;
    }
    const response = await launchCamera({ mediaType: 'photo', quality: 0.8, saveToPhotos: false });
    if (response.assets?.[0].uri) processImage(response.assets[0].uri);
  }, [requestCameraPermission, processImage]);

  const handleChooseFromGallery = useCallback(async () => {
    const response = await launchImageLibrary({ mediaType: 'photo', quality: 0.8 });
    if (response.assets?.[0].uri) processImage(response.assets[0].uri);
  }, [processImage]);

  const renderContent = () => {
    const topConfidence = predictionResult?.top_prediction.confidence ?? 0;

    return (
      <View style={styles.contentContainer}>
        {photo && <Image source={{ uri: photo }} style={styles.imagePreview} />}

        {isLoading && <ActivityIndicator size="large" color={theme.colors.accent} style={{ marginVertical: 20 }} />}

        {error && (
          <>
            <Heading style={styles.errorText}>Error</Heading>
            <BodyText style={styles.errorText}>{error}</BodyText>
          </>
        )}

        {predictionResult && !isLoading && !error && (
          <>
            {topConfidence < 0.25 ? (
              <>
                <Heading style={styles.errorText}>Confidence Too Low!</Heading>
                <BodyText style={styles.errorText}>Please Upload A Valid Bovine Breed Image.</BodyText>
              </>
            ) : (
              <>
                <Heading>Prediction Results</Heading>
                <Text style={styles.topPredictionText}>{predictionResult.top_prediction.breed}</Text>
                <Text style={styles.confidenceText}>
                  Confidence: {(topConfidence * 100).toFixed(1)}%
                </Text>

                {pendingUpload && (
                  <Text style={{ color: '#bd7d34ff', marginBottom: 10, fontFamily: 'serif', textAlign: 'center' }}>
                    Pending Image Upload (Manual Sync Required)
                  </Text>
                )}

                <View style={[styles.topKContainer, { backgroundColor: 'transparent' }]}>
                  <Text style={styles.topKTitle}>Other possibilities:</Text>
                  {predictionResult.top_k?.map((p: Prediction, i: number) => (
                    <Text key={i} style={styles.topKItem}>
                      {p.breed}: {(p.confidence * 100).toFixed(1)}%
                    </Text>
                  ))}
                </View>
              </>
            )}
          </>
        )}

        {!photo && !isLoading && !error && (
          <>
            <Heading>Breed Identification Tool</Heading>
            <BodyText style={styles.subtitle}>Upload an image to identify the bovine breed.</BodyText>
            <TouchableOpacity onPress={handleChooseFromGallery} style={styles.uploadBox}>
              <Text style={styles.uploadIcon}>☁️</Text>
              <BodyText style={styles.uploadText}>Drag & drop an image here</BodyText>
              <BodyText style={styles.uploadSubtext}>or click to select a file</BodyText>
            </TouchableOpacity>
          </>
        )}
      </View>
    );
  };

  return (
    <ImageBackground source={backgroundImg} style={styles.background} resizeMode="repeat">
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
      <SafeAreaView style={styles.safeArea}>
        <ScreenWrapper style={styles.screenWrapper}>
          <ScrollView
            contentContainerStyle={[styles.scrollContainer, !photo && { flexGrow: 1, justifyContent: 'center' }]}
            style={{ width: '100%' }}
          >
            <Card style={styles.mainCard}>
              {renderContent()}
              <View style={styles.buttonContainer}>
                <PrimaryButton title="Use Camera" onPress={handleTakePhoto} disabled={!modelLoaded || isLoading} />
                <PrimaryButton title="From Gallery" onPress={handleChooseFromGallery} disabled={!modelLoaded || isLoading} />
              </View>
            </Card>
          </ScrollView>
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
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  scrollContainer: {
    alignItems: 'center',
    padding: 20,
  },
  mainCard: {
    width: '100%',
    padding: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.colors.border,
    borderRadius: 15,
    marginTop: 20,
    marginBottom: 20,
  },
  contentContainer: { alignItems: 'center', width: '100%' },
  imagePreview: {
    // FIX: Removed width: 300 to make it responsive
    width: '100%',
    aspectRatio: 1, // Add this to maintain aspect ratio
    borderRadius: 15,
    // FIX: Increased marginBottom to create more space
    marginBottom: 40,
    borderWidth: 2,
    borderColor: theme.colors.border,
  },
  subtitle: { marginBottom: 20, color: theme.colors.text },
  uploadBox: {
    width: '100%',
    padding: 20,
    borderWidth: 2,
    borderColor: theme.colors.accent,
    borderStyle: 'dashed',
    borderRadius: 15,
    alignItems: 'center',
  },
  uploadIcon: { fontSize: 50, color: theme.colors.accent },
  uploadText: { fontSize: 16, fontWeight: '600', color: theme.colors.text },
  uploadSubtext: { fontSize: 12, color: theme.colors.textMuted },
  buttonContainer: { flexDirection: 'row', justifyContent: 'space-around', width: '100%', marginTop: 20 },
  errorText: { color: theme.colors.error, fontSize: 16, fontWeight: 'bold', textAlign: 'center' },
  topPredictionText: { fontSize: 22, fontWeight: '700', color: theme.colors.accent, marginBottom: 8, fontFamily: 'serif' },
  confidenceText: { fontSize: 16, color: theme.colors.text, marginBottom: 15, fontFamily: 'serif' },
  topKContainer: {
    width: '100%',
    backgroundColor: 'transparent',
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: 10,
  },
  topKTitle: { fontSize: 14, fontWeight: '600', color: theme.colors.text, marginBottom: 5, fontFamily: 'serif' },
  topKItem: { fontSize: 14, color: theme.colors.text, marginVertical: 2, fontFamily: 'serif' },
});