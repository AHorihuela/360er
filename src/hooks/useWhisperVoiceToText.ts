import { useState, useRef, useCallback, useEffect } from 'react';
import { useToast } from '@/components/ui/use-toast';

interface UseWhisperVoiceToTextOptions {
  onTranscriptionUpdate?: (text: string) => void;
  onTranscriptionComplete?: (text: string) => void;
  language?: string;
}

interface VoiceToTextState {
  isRecording: boolean;
  isRecordingStarting: boolean;
  isTranscribing: boolean;
  isSupported: boolean;
  transcript: string;
  error: string | null;
  isInitializing: boolean;
  audioLevel: number;
  averageLevel: number;
}

// Audio level monitoring integrated into the hook
function useIntegratedAudioLevel() {
  const [audioLevel, setAudioLevel] = useState(0);
  const [averageLevel, setAverageLevel] = useState(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

  const startMonitoring = useCallback((stream: MediaStream) => {
    try {
      // Use the existing stream instead of creating a new one
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      analyserRef.current = audioContextRef.current.createAnalyser();
      sourceRef.current = audioContextRef.current.createMediaStreamSource(stream);
      
      // Optimized settings for volume detection
      analyserRef.current.fftSize = 512;
      analyserRef.current.smoothingTimeConstant = 0.8;
      sourceRef.current.connect(analyserRef.current);
      
      // Use time domain data for better volume detection
      const dataArray = new Uint8Array(analyserRef.current.fftSize);
      
      // For status message stability - longer term averaging
      const statusHistorySize = 60; // 1 second at 60fps
      const statusHistory: number[] = [];
      
      const updateAudioLevel = () => {
        if (!analyserRef.current) return;
        
        // Get time domain data (raw audio waveform)
        analyserRef.current.getByteTimeDomainData(dataArray);
        
        // Calculate RMS (Root Mean Square) for more accurate volume
        let rms = 0;
        for (let i = 0; i < dataArray.length; i++) {
          const sample = (dataArray[i] - 128) / 128; // Normalize to -1 to 1
          rms += sample * sample;
        }
        rms = Math.sqrt(rms / dataArray.length);
        
        // Improved sensitivity - much more responsive to normal speech
        const sensitivity = 8.0; // Doubled sensitivity for normal speech levels
        const currentLevel = Math.min(rms * sensitivity, 1);
        
        // Smooth the level changes for better visual feedback
        const smoothingFactor = 0.3;
        
        setAudioLevel(prevLevel => {
          return prevLevel * (1 - smoothingFactor) + currentLevel * smoothingFactor;
        });
        
        // Long-term averaging for stable status messages
        statusHistory.push(currentLevel);
        if (statusHistory.length > statusHistorySize) {
          statusHistory.shift();
        }
        
        // Calculate average over the last second for status stability
        if (statusHistory.length >= 30) { // Wait for at least 0.5 seconds of data
          const recentAverage = statusHistory.slice(-30).reduce((sum, val) => sum + val, 0) / 30;
          setAverageLevel(recentAverage);
        }
        
        animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
      };
      
      updateAudioLevel();
    } catch (error) {
      console.error('Error setting up audio level monitoring:', error);
      setAudioLevel(0);
      setAverageLevel(0);
    }
  }, []);

  const stopMonitoring = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
    
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    analyserRef.current = null;
    setAudioLevel(0);
    setAverageLevel(0);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (sourceRef.current) {
        sourceRef.current.disconnect();
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    };
  }, []);

  return {
    audioLevel,
    averageLevel,
    startMonitoring,
    stopMonitoring
  };
}

export function useWhisperVoiceToText({
  onTranscriptionUpdate,
  onTranscriptionComplete,
  language = 'en'
}: UseWhisperVoiceToTextOptions = {}) {
  const { toast } = useToast();
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const { audioLevel, averageLevel, startMonitoring, stopMonitoring } = useIntegratedAudioLevel();
  
  // Simple support detection - especially permissive for iOS
  const checkMediaRecorderSupport = useCallback(() => {
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const hasMediaRecorder = typeof MediaRecorder !== 'undefined';
    const hasMediaDevices = !!navigator.mediaDevices;
    const hasGetUserMedia = !!navigator.mediaDevices?.getUserMedia;
    
    // Basic API availability check
    if (!hasMediaRecorder || !hasMediaDevices || !hasGetUserMedia) {
      return false;
    }
    
    // For iOS, always return true if basic APIs exist
    if (isIOSDevice) {
      return true;
    }
    
    return true;
  }, []);

  const [state, setState] = useState<VoiceToTextState>({
    isRecording: false,
    isRecordingStarting: false,
    isTranscribing: false,
    isSupported: false,
    transcript: '',
    error: null,
    isInitializing: true,
    audioLevel: 0,
    averageLevel: 0
  });

  // Initialize support check
  useEffect(() => {
    const isSupported = checkMediaRecorderSupport();
    setState(prev => ({ 
      ...prev, 
      isSupported,
      isInitializing: false 
    }));
  }, [checkMediaRecorderSupport]);

  // Add audioLevel to state updates
  useEffect(() => {
    setState(prev => ({ ...prev, audioLevel }));
  }, [audioLevel]);
  
  // Add averageLevel to state updates
  useEffect(() => {
    setState(prev => ({ ...prev, averageLevel }));
  }, [averageLevel]);

  // Start recording audio
  const startRecording = useCallback(async () => {
    try {
      setState(prev => ({ 
        ...prev, 
        error: null, // Clear any previous errors
        transcript: '', 
        isInitializing: true 
      }));

      // Detect iOS/Safari for platform-specific handling
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
      
      // Check for HTTPS on iOS (required for microphone access)
      if (isIOS && location.protocol !== 'https:' && location.hostname !== 'localhost') {
        throw new Error('iOS requires HTTPS for microphone access');
      }
      
      // Use simpler constraints for iOS to avoid compatibility issues
      const audioConstraints = isIOS ? {
        audio: true // Use basic audio constraints on iOS
      } : {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000, // Optimal for Whisper
          channelCount: 1     // Mono is sufficient for speech
        }
      };

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia(audioConstraints);
      streamRef.current = stream;

      // Determine the best MIME type for this browser/device
      let mimeType = 'audio/webm;codecs=opus'; // Default for Chrome/Firefox
      
      if (isIOS || isSafari) {
        // iOS/Safari priorities with better fallback handling
        const safariTypes = [
          'audio/mp4',
          'audio/mp4;codecs=mp4a.40.2', // AAC in MP4
          'audio/aac',
          'audio/wav',
          'audio/webm',
          '' // Empty string as final fallback - let MediaRecorder choose
        ];
        
        const supportedType = safariTypes.find(type => 
          type === '' || MediaRecorder.isTypeSupported(type)
        );
        
        if (supportedType !== undefined) {
          mimeType = supportedType;
        }
      }

      // Create MediaRecorder with platform-appropriate settings
      let mediaRecorderOptions: MediaRecorderOptions = {};
      
      // Only specify mimeType if it's not empty (iOS fallback case)
      if (mimeType && mimeType.length > 0) {
        mediaRecorderOptions.mimeType = mimeType;
      }
      
      // Add additional iOS-specific options
      if (isIOS) {
        // Use smaller time slices for better iOS compatibility
        mediaRecorderOptions.videoBitsPerSecond = undefined;
        mediaRecorderOptions.audioBitsPerSecond = undefined;
      }
      
      const mediaRecorder = new MediaRecorder(stream, mediaRecorderOptions);

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      // Handle recording start - this fires when recording actually begins
      mediaRecorder.onstart = () => {
        setState(prev => ({ 
          ...prev, 
          isRecording: true, 
          isRecordingStarting: false,
          error: null 
        }));
        
        // Start audio level monitoring using the same stream
        startMonitoring(stream);
      };

      mediaRecorder.onstop = async () => {
        setState(prev => ({ ...prev, isRecording: false, isTranscribing: true }));
        
        // Use the actual MIME type that was used for recording
        const actualMimeType = mimeType || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: actualMimeType });
        
        // Only transcribe if we have meaningful audio data
        if (audioBlob.size > 1000) { // At least 1KB of audio data
          await transcribeAudio(audioBlob);
        } else {
          // Handle silent/empty recordings more gracefully
          setState(prev => ({ 
            ...prev, 
            isTranscribing: false,
            error: 'silent_recording' // Use error type instead of message
          }));

          // Auto-clear silent recording error after 4 seconds
          setTimeout(() => {
            setState(prev => {
              if (prev.error === 'silent_recording') {
                return { ...prev, error: null };
              }
              return prev;
            });
          }, 4000);
        }

        // Stop audio monitoring
        stopMonitoring();
        
        // Clean up stream
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
      };

      // Set initial "starting" state before calling start()
      setState(prev => ({ 
        ...prev, 
        isRecordingStarting: true, 
        isInitializing: false,
        error: null 
      }));

      mediaRecorder.start();

    } catch (error: any) {
      
      // Reuse iOS detection (already declared above)
      const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent);
      let errorMessage = 'Voice recording unavailable';
      
      if (error.name === 'NotAllowedError') {
        errorMessage = isIOSDevice 
          ? 'Microphone access denied. Please enable microphone permissions in Safari settings and refresh the page.'
          : 'Microphone access denied. Please allow microphone access when prompted and try again.';
      } else if (error.name === 'NotFoundError') {
        errorMessage = 'No microphone detected. Please connect a microphone and try again.';
      } else if (error.name === 'NotSupportedError') {
        errorMessage = isIOSDevice 
          ? 'Voice recording not supported on this device. Please try using a different browser or device.'
          : 'Voice recording not supported in this browser.';
      } else if (error.name === 'OverconstrainedError') {
        errorMessage = isIOSDevice 
          ? 'Voice recording settings not compatible with this device. Please use manual text input.'
          : 'Audio device settings conflict. Please check your microphone settings.';
      } else if (isIOSDevice && (error.message?.includes('request') || error.message?.includes('secure'))) {
        errorMessage = 'Secure connection required. Please access the site using HTTPS.';
      } else if (error.message?.includes('capture failure') || error.message?.includes('MediaStreamTrack ended')) {
        errorMessage = isIOSDevice 
          ? 'Microphone access interrupted. Please close other apps using the microphone and try again.'
          : 'Audio capture interrupted. Please try again.';
      } else if (error.message?.includes('NotReadableError') || error.message?.includes('Could not start')) {
        errorMessage = 'Microphone is being used by another application. Please close other apps and try again.';
      }

      // Stop monitoring if it was started
      stopMonitoring();
      
      setState(prev => ({ 
        ...prev, 
        error: errorMessage, 
        isRecording: false,
        isRecordingStarting: false,
        isInitializing: false 
      }));

      toast({
        title: "Voice Recording Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  }, [toast]);

  // Stop recording
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && (state.isRecording || state.isRecordingStarting)) {
      if (state.isRecording) {
        mediaRecorderRef.current.stop();
      } else if (state.isRecordingStarting) {
        // If still starting, set a flag to stop as soon as recording begins
        setState(prev => ({ ...prev, isRecordingStarting: false }));
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          mediaRecorderRef.current.stop();
        }
      }
      
      // Always stop monitoring when stopping recording
      stopMonitoring();
    }
  }, [state.isRecording, state.isRecordingStarting, stopMonitoring]);

  // Transcribe audio using Whisper API
  const transcribeAudio = useCallback(async (audioBlob: Blob) => {
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');

      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const result = await response.json();

      if (result.success && result.transcription) {
        const transcribedText = result.transcription.trim();
        
        setState(prev => ({ 
          ...prev, 
          transcript: transcribedText,
          isTranscribing: false,
          error: null
        }));

        // Call callbacks
        onTranscriptionUpdate?.(transcribedText);
        onTranscriptionComplete?.(transcribedText);

        toast({
          title: "Voice Input Complete",
          description: "Your speech has been transcribed successfully!",
        });

      } else {
        // Handle case where API succeeds but returns no transcription (likely silence)
        setState(prev => ({ 
          ...prev, 
          error: 'no_speech_detected',
          isTranscribing: false 
        }));

        // Auto-clear no speech error after 4 seconds
        setTimeout(() => {
          setState(prev => {
            if (prev.error === 'no_speech_detected') {
              return { ...prev, error: null };
            }
            return prev;
          });
        }, 4000);
        return;
      }

    } catch (error: any) {
      console.error('Transcription error:', error);
      
      let errorType = 'transcription_failed';
      
      if (error.message.includes('Network') || error.name === 'NetworkError') {
        errorType = 'network_error';
      } else if (error.message.includes('rate_limit') || error.status === 429) {
        errorType = 'rate_limit';
      } else if (error.message.includes('file too large') || error.status === 413) {
        errorType = 'file_too_large';
      } else if (error.status === 400) {
        errorType = 'invalid_audio';
      }

      setState(prev => ({ 
        ...prev, 
        error: errorType,
        isTranscribing: false 
      }));

      // Auto-clear retryable errors after 5 seconds
      const retryableErrors = ['silent_recording', 'no_speech_detected', 'network_error', 'invalid_audio'];
      if (retryableErrors.includes(errorType)) {
        setTimeout(() => {
          setState(prev => {
            // Only clear if the error hasn't changed
            if (prev.error === errorType) {
              return { ...prev, error: null };
            }
            return prev;
          });
        }, 5000);
      }
    }
  }, [onTranscriptionUpdate, onTranscriptionComplete, toast]);

  // Clear transcript and reset state
  const clearTranscript = useCallback(() => {
    setState(prev => ({
      ...prev,
      transcript: '',
      error: null
    }));
  }, []);

  // Check if currently processing (recording or transcribing)
  const isProcessing = state.isRecording || state.isRecordingStarting || state.isTranscribing;

  return {
    // State
    isRecording: state.isRecording,
    isRecordingStarting: state.isRecordingStarting,
    isTranscribing: state.isTranscribing,
    isSupported: state.isSupported,
    transcript: state.transcript,
    error: state.error,
    isInitializing: state.isInitializing,
    isProcessing,
    audioLevel: state.audioLevel, // Expose audioLevel to the component
    averageLevel: state.averageLevel, // Expose averageLevel to the component
    
    // Actions
    startRecording,
    stopRecording,
    clearTranscript
  };
} 