import { useState, useCallback, useRef } from 'react';
import { useToast } from '@/components/ui/use-toast';

interface UseWhisperVoiceToTextOptions {
  onTranscriptionUpdate?: (text: string) => void;
  onTranscriptionComplete?: (text: string) => void;
  language?: string;
}

interface WhisperVoiceToTextState {
  isRecording: boolean;
  isRecordingStarting: boolean; // New state for the delay period
  isTranscribing: boolean;
  isSupported: boolean;
  transcript: string;
  error: string | null;
  isInitializing: boolean;
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
  
  const [state, setState] = useState<WhisperVoiceToTextState>({
    isRecording: false,
    isRecordingStarting: false,
    isTranscribing: false,
    isSupported: true, // MediaRecorder is widely supported
    transcript: '',
    error: null,
    isInitializing: false
  });

  // Start recording audio
  const startRecording = useCallback(async () => {
    try {
      setState(prev => ({ 
        ...prev, 
        error: null, // Clear any previous errors
        transcript: '', 
        isInitializing: true 
      }));

      // Request microphone access with optimal settings
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000, // Optimal for Whisper
          channelCount: 1     // Mono is sufficient for speech
        }
      });

      streamRef.current = stream;

      // Create MediaRecorder with optimal settings for speech
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus' // Efficient format supported by Whisper
      });

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
      };

      mediaRecorder.onstop = async () => {
        setState(prev => ({ ...prev, isRecording: false, isTranscribing: true }));
        
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        
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
      console.error('Error starting recording:', error);
      
      let errorMessage = 'Could not start voice recording';
      
      if (error.name === 'NotAllowedError') {
        errorMessage = 'Microphone access denied. Please enable microphone permissions and try again.';
      } else if (error.name === 'NotFoundError') {
        errorMessage = 'No microphone found. Please connect a microphone and try again.';
      } else if (error.name === 'NotSupportedError') {
        errorMessage = 'Audio recording not supported in this browser.';
      }

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
    }
  }, [state.isRecording, state.isRecordingStarting]);

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
    
    // Actions
    startRecording,
    stopRecording,
    clearTranscript
  };
} 