import { useState, useCallback, useRef } from 'react';
import { useToast } from '@/components/ui/use-toast';

interface UseWhisperVoiceToTextOptions {
  onTranscriptionUpdate?: (text: string) => void;
  onTranscriptionComplete?: (text: string) => void;
  language?: string;
}

interface WhisperVoiceToTextState {
  isRecording: boolean;
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
    isTranscribing: false,
    isSupported: true, // MediaRecorder is widely supported
    transcript: '',
    error: null,
    isInitializing: false
  });

  // Start recording audio
  const startRecording = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, error: null, transcript: '', isInitializing: true }));

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

      mediaRecorder.onstop = async () => {
        setState(prev => ({ ...prev, isRecording: false, isTranscribing: true }));
        
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        
        // Only transcribe if we have meaningful audio data
        if (audioBlob.size > 1000) { // At least 1KB of audio data
          await transcribeAudio(audioBlob);
        } else {
          setState(prev => ({ 
            ...prev, 
            isTranscribing: false,
            error: 'Recording too short. Please speak for at least 1-2 seconds.' 
          }));
        }

        // Clean up stream
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
      };

      mediaRecorder.start();
      setState(prev => ({ 
        ...prev, 
        isRecording: true, 
        isInitializing: false,
        error: null 
      }));

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
    if (mediaRecorderRef.current && state.isRecording) {
      mediaRecorderRef.current.stop();
    }
  }, [state.isRecording]);

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
        throw new Error('No transcription received from server');
      }

    } catch (error: any) {
      console.error('Transcription error:', error);
      
      let errorMessage = 'Failed to transcribe audio';
      
      if (error.message.includes('Network')) {
        errorMessage = 'Network error. Please check your internet connection and try again.';
      } else if (error.message.includes('rate_limit')) {
        errorMessage = 'Too many requests. Please wait a moment and try again.';
      } else if (error.message.includes('file too large')) {
        errorMessage = 'Recording too long. Please keep recordings under 25MB.';
      }

      setState(prev => ({ 
        ...prev, 
        error: errorMessage,
        isTranscribing: false 
      }));

      toast({
        title: "Transcription Error",
        description: errorMessage,
        variant: "destructive",
      });
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
  const isProcessing = state.isRecording || state.isTranscribing;

  return {
    // State
    isRecording: state.isRecording,
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