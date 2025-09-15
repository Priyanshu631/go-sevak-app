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
  TouchableOpacity,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
// UPDATED: Import launchImageLibrary as well
import {launchCamera, launchImageLibrary} from 'react-native-image-picker';
import {NativeModules} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { savePrediction } from '../services/storageService';

const {PytorchModule} = NativeModules;

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
      // == NEW: UPLOAD IMAGE TO SUPABASE STORAGE
      // =========================================================================
      console.log('Step 2: Uploading image to cloud storage...');
      
      const fileExtension = uri.split('.').pop() || 'jpg';
      const fileName = `${uuid.v4()}.${fileExtension}`;
      const filePath = `${user.id}/${fileName}`;
      
      const response = await fetch(uri);
      const fileBlob = await response.blob();
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('prediction_images') // The bucket name we created
        .upload(filePath, fileBlob, {
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
    // ... (This function remains unchanged)
    if (isLoading) {
      return <ActivityIndicator size="large" color="#007AFF" style={styles.feedbackView} />;
    }
    if (error) {
      return <Text style={[styles.feedbackView, styles.errorText]}>{error}</Text>;
    }
    if (predictionResult) {
      return (
        <View style={styles.resultContainer}>
          <Text style={styles.resultTitle}>Prediction Results</Text>
          <Text style={styles.topPredictionText}>
            {predictionResult.top_prediction.breed}
          </Text>
          <Text style={styles.confidenceText}>
            Confidence: {(predictionResult.top_prediction.confidence * 100).toFixed(1)}%
          </Text>
          <View style={styles.topKContainer}>
            <Text style={styles.topKTitle}>Other possibilities:</Text>
            {predictionResult.top_k?.map((p: Prediction, index: number) => (
              <Text key={index} style={styles.topKItem}>
                {p.breed}: {(p.confidence * 100).toFixed(1)}%
              </Text>
            ))}
          </View>
        </View>
      );
    }
    return (
      <View style={styles.feedbackView}>
        <Text style={styles.placeholderText}>
          Use the buttons below to identify a breed.
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.container}>
          <Text style={styles.title}>Bovine Breed Identifier</Text>
          <Text style={styles.subtitle}>
              Model Status: {modelLoaded ? 'Ready' : 'Loading...'}
          </Text>
          
          {photo && (
              <Image source={{uri: photo}} style={styles.imagePreview} />
          )}
          
          {renderContent()}

          {/* UPDATED: Container for the two buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
                style={[styles.button, !modelLoaded || isLoading ? styles.buttonDisabled : {}]}
                onPress={handleTakePhoto}
                disabled={!modelLoaded || isLoading}>
                <Text style={styles.buttonText}>
                  Use Camera
                </Text>
            </TouchableOpacity>

            <TouchableOpacity
                style={[styles.button, !modelLoaded || isLoading ? styles.buttonDisabled : {}]}
                onPress={handleChooseFromGallery}
                disabled={!modelLoaded || isLoading}>
                <Text style={styles.buttonText}>
                  From Gallery
                </Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // ... (Most styles remain the same)
  safeArea: { flex: 1, backgroundColor: '#f5f5f5' },
  container: { flexGrow: 1, alignItems: 'center', justifyContent: 'flex-start', padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#333', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#666', marginBottom: 20 },
  imagePreview: { width: 300, height: 300, borderRadius: 15, marginBottom: 20, borderWidth: 2, borderColor: '#ddd' },
  
  // UPDATED: Styles for the button container and individual buttons
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 'auto',
    paddingBottom: 20,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 15,
    paddingHorizontal: 20, // Adjusted padding
    borderRadius: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    alignItems: 'center',
    flex: 1, // Make buttons take up equal space
    marginHorizontal: 10, // Add space between buttons
  },
  buttonDisabled: { backgroundColor: '#a9a9a9' },
  buttonText: { color: 'white', fontSize: 16, fontWeight: '600' }, // Slightly smaller font
  feedbackView: { marginTop: 20, minHeight: 100, justifyContent: 'center', alignItems: 'center' },
  placeholderText: { fontSize: 16, color: '#888', textAlign: 'center' },
  errorText: { color: 'red', fontSize: 16, fontWeight: 'bold', textAlign: 'center' },
  resultContainer: { width: '100%', padding: 15, backgroundColor: 'white', borderRadius: 10, marginTop: 20, alignItems: 'center' },
  resultTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
  topPredictionText: { fontSize: 22, fontWeight: '700', color: '#007AFF' },
  confidenceText: { fontSize: 16, color: '#444', marginBottom: 15 },
  topKContainer: { width: '100%', borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 10 },
  topKTitle: { fontSize: 14, fontWeight: '600', color: '#555', marginBottom: 5 },
  topKItem: { fontSize: 14, color: '#666', marginVertical: 2 },
});