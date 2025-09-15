import { supabase } from '../lib/supabase'; // Use your shared client
import uuid from 'react-native-uuid'
import React, {useEffect, useState, useCallback} from 'react';
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
  TouchableOpacity,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
// UPDATED: Import launchImageLibrary as well
import {launchCamera, launchImageLibrary} from 'react-native-image-picker';
import {NativeModules} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { savePrediction } from '../services/storageService';
import ScreenWrapper from "../components/ScreenWrapper";
import { Card } from "../components/Card";
import { Heading, BodyText } from "../components/Typography";
import { PrimaryButton } from "../components/Button";
import { theme } from "../theme/theme";
// =========================================================================
// == FINAL FIX: Import react-native-blob-util
// =========================================================================
import RNFetchBlob from 'react-native-blob-util';

const {PytorchModule} = NativeModules;

const backgroundImg = require("../assets/bg.png");

interface Prediction {
  breed: string;
  confidence: number;
}

interface PredictionResult {
  top_prediction: Prediction; // Changed from topPrediction
  top_k: Prediction[]; // Changed from topK
}

export default function HomeScreen() {
  const { user } = useAuth(); // Get the current user
  const [modelLoaded, setModelLoaded] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const [predictionResult, setPredictionResult] = useState<PredictionResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadModel = async () => {
      try {
        console.log('Starting to load model...');
        setError(null);
        setModelLoaded(false);
        
        // Load model with retries
        const maxRetries = 3;
        let lastError;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            console.log(`Loading model attempt ${attempt}/${maxRetries}`);
            const result = await PytorchModule.loadModel('model.ptl');
            
            if (result === true) {
              console.log('Model loaded successfully');
              setModelLoaded(true);
              return;
            }
          } catch (err) {
            lastError = err;
            console.warn(`Model load attempt ${attempt} failed:`, err);
            // Wait for 1 second before retrying
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
        
        // If we get here, all attempts failed
        throw lastError || new Error('Model loading failed after multiple attempts');
        
      } catch (e: any) {
        console.error('Failed to load model:', e);
        console.error('Error details:', {
          message: e.message,
          code: e.code,
          nativeError: e.nativeError
        });
        setError('Critical Error: Could not load the AI model. ' + e.message);
        setModelLoaded(false);
        
        Alert.alert(
          'Model Loading Error',
          'Failed to initialize the AI model. Please ensure you have enough storage space and try restarting the app.',
          [{ text: 'OK' }]
        );
      }
    };

    loadModel();

    // Cleanup function
    return () => {
      // Reset states
      setModelLoaded(false);
      setPredictionResult(null);
      setError(null);
      setPhoto(null);
    };
  }, []);
  

  const processImage = useCallback(async (uri: string) => {
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

    try {
      console.log('Step 1: Getting prediction from local model...');
      const rawResult: PredictionResult = await PytorchModule.predict(uri);

      if (!rawResult || !rawResult.top_prediction) {
        throw new Error('Invalid prediction result received from the model');
      }
      
      console.log('Prediction successful:', JSON.stringify(rawResult, null, 2));
      setPredictionResult(rawResult);
      
      // =========================================================================
      // == UPLOAD IMAGE TO SUPABASE STORAGE
      // =========================================================================
      console.log('Step 2: Uploading image to cloud storage...');
      
      const fileExtension = uri.split('.').pop() || 'jpg';
      const fileName = `${uuid.v4()}.${fileExtension}`;
      const filePath = `${user.id}/${fileName}`;
      
      // =========================================================================
      // == FINAL FIX: Use RNFetchBlob to read and upload the file
      // =========================================================================
      const response = await RNFetchBlob.fs.readFile(uri.replace('file://', ''), 'base64');
      const uint8Array = new Uint8Array(RNFetchBlob.base64.decode(response).split('').map(c => c.charCodeAt(0)));
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('prediction_images')
        .upload(filePath, uint8Array, {
          contentType: `image/${fileExtension}`,
          upsert: false,
        });

      if (uploadError) {
        // Don't fail the whole process, but log the error. 
        // We can still save the prediction locally with the local URI.
        console.error('Image upload failed:', uploadError);
        // Fallback to saving with the local URI
        await savePrediction({
          image_uri: uri,
          prediction_result: rawResult,
          timestamp: new Date().toISOString(),
        }, user.id);
        console.warn('⚠️ Prediction saved with LOCAL image URI due to upload failure.');
        return; // Exit after saving the fallback
      }

      // Step 3: Get the public URL of the uploaded image
      const { data: urlData } = supabase.storage
        .from('prediction_images')
        .getPublicUrl(uploadData.path);
      
      const publicUrl = urlData.publicUrl;
      console.log('Image uploaded successfully. Public URL:', publicUrl);
      
      // Step 4: Save the prediction with the PUBLIC URL to local storage
      console.log('Step 3: Saving prediction with public URL locally...');
      await savePrediction({
        image_uri: publicUrl, // <-- Use the public URL
        prediction_result: rawResult,
        timestamp: new Date().toISOString(),
      }, user.id);
      
      console.log('✅ Prediction with public URL saved successfully!');
      // =========================================================================

    } catch (err: any) {
      // Your existing, robust error handling
      console.error('Error in processImage:', err);
      let errorMessage = 'Failed to process image. ' + err.message;
      setError(errorMessage);
      Alert.alert('Processing Error', errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [modelLoaded, user]); // Ensure user is in the dependency array

  const requestCameraPermission = useCallback(async () => {
    // ... (This function remains unchanged)
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
          {
            title: 'Camera Permission',
            message: 'This app needs camera permission to identify cattle breeds.',
            buttonPositive: 'OK',
            buttonNegative: 'Cancel',
          },
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.warn(err);
        return false;
      }
    }
    return true;
  }, []);

  // --- UPDATED: handleTakePhoto now uses the shared processImage function ---
  const handleTakePhoto = useCallback(async () => {
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) {
      Alert.alert('Permission Denied', 'Camera permission is required to take photos.');
      return;
    }
    
    const response = await launchCamera({
      mediaType: 'photo',
      quality: 0.8,
      saveToPhotos: false,
    });

    if (response.didCancel || response.errorMessage) {
      console.log('Camera cancelled or failed:', response.errorMessage);
      return;
    }
    
    if (response.assets && response.assets[0].uri) {
      processImage(response.assets[0].uri);
    }
  }, [requestCameraPermission, processImage]);

  // --- NEW: Function to handle choosing an image from the gallery ---
  const handleChooseFromGallery = useCallback(async () => {
    const response = await launchImageLibrary({
      mediaType: 'photo',
      quality: 0.8,
    });

    if (response.didCancel || response.errorMessage) {
      console.log('Gallery cancelled or failed:', response.errorMessage);
      return;
    }

    if (response.assets && response.assets[0].uri) {
      processImage(response.assets[0].uri);
    }
  }, [processImage]);


  const renderContent = () => {
    if (isLoading) {
      return (
        <ActivityIndicator
          size="large"
          color={theme.colors.accent} // 🟨 golden spinner
          style={styles.feedbackView}
        />
      );
    }
    if (error) {
      return (
        <Text style={[styles.feedbackView, styles.errorText]}>{error}</Text>
      );
    }
    if (predictionResult) {
      return (
        <Card>
          <Heading>Prediction Results</Heading>
          <Text style={styles.topPredictionText}>
            {predictionResult.top_prediction.breed}
          </Text>
          <Text style={styles.confidenceText}>
            Confidence:{" "}
            {(predictionResult.top_prediction.confidence * 100).toFixed(1)}%
          </Text>
          <View style={styles.topKContainer}>
            <Text style={styles.topKTitle}>Other possibilities:</Text>
            {predictionResult.top_k?.map((p: Prediction, index: number) => (
              <Text key={index} style={styles.topKItem}>
                {p.breed}: {(p.confidence * 100).toFixed(1)}%
              </Text>
            ))}
          </View>
        </Card>
      );
    }
    return (
      <View style={styles.feedbackView}>
        <BodyText>Use the buttons below to identify a breed.</BodyText>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ImageBackground
        source={backgroundImg}
        style={styles.background}
        resizeMode="repeat"
      >
        <ScreenWrapper>
          <ScrollView contentContainerStyle={styles.container}>
            <Heading>Bovine Breed Identifier</Heading>
            <BodyText>
              Model Status: {modelLoaded ? "Ready" : "Loading..."}
            </BodyText>

            {photo && (
              <Image source={{ uri: photo }} style={styles.imagePreview} />
            )}

            {renderContent()}

            <View style={styles.buttonContainer}>
              <PrimaryButton
                title="Use Camera"
                onPress={handleTakePhoto}
                disabled={!modelLoaded || isLoading}
              />
              <PrimaryButton
                title="From Gallery"
                onPress={handleChooseFromGallery}
                disabled={!modelLoaded || isLoading}
              />
            </View>
          </ScrollView>
        </ScreenWrapper>
      </ImageBackground>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: theme.colors.background },
  background: { flex: 1 },
  container: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "flex-start",
    padding: 20,
  },
  imagePreview: {
    width: 300,
    height: 300,
    borderRadius: 15,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: theme.colors.border,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
    marginTop: 20,
  },
  feedbackView: {
    marginTop: 20,
    minHeight: 100,
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    color: "red",
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
  },
  topPredictionText: {
    fontSize: 22,
    fontWeight: "700",
    color: theme.colors.accent, // 🟨 golden top prediction
    marginBottom: 8,
    fontFamily: "serif",
  },
  confidenceText: {
    fontSize: 16,
    color: theme.colors.text,
    marginBottom: 15,
    fontFamily: "serif",
  },
  topKContainer: {
    width: "100%",
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: 10,
  },
  topKTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: 5,
    fontFamily: "serif",
  },
  topKItem: {
    fontSize: 14,
    color: "#555",
    marginVertical: 2,
    fontFamily: "serif",
  },
});