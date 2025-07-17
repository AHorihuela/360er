import { useState, useCallback, useRef, useEffect } from 'react';
import { useToast } from '@/components/ui/use-toast';

// Type definitions for Web Speech API (not included in TypeScript by default)
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onstart: ((event: Event) => void) | null;
  onend: ((event: Event) => void) | null;
}

interface SpeechRecognitionConstructor {
  new(): SpeechRecognition;
}

interface UseVoiceToTextOptions {
  onTranscriptionUpdate?: (text: string) => void;
  onTranscriptionComplete?: (text: string) => void;
  language?: string;
  continuous?: boolean;
  interimResults?: boolean;
}

interface VoiceToTextState {
  isRecording: boolean;
  isSupported: boolean;
  transcript: string;
  interimTranscript: string;
  error: string | null;
  isInitializing: boolean;
}

// Improved punctuation and sentence structure processing
function improvePunctuation(text: string): string {
  if (!text) return text;
  
  // Clean up the text first
  let improved = text.trim();
  
  // Add periods at the end of sentences that don't have punctuation
  improved = improved.replace(/([a-zA-Z0-9])\s+([A-Z])/g, '$1. $2');
  
  // Ensure the text ends with proper punctuation
  if (!/[.!?]$/.test(improved) && improved.length > 0) {
    improved += '.';
  }
  
  // Capitalize the first letter
  improved = improved.charAt(0).toUpperCase() + improved.slice(1);
  
  // Handle common speech patterns
  improved = improved.replace(/\bperiod\b/gi, '.');
  improved = improved.replace(/\bcomma\b/gi, ',');
  improved = improved.replace(/\bquestion mark\b/gi, '?');
  improved = improved.replace(/\bexclamation point\b/gi, '!');
  improved = improved.replace(/\bnew line\b/gi, '\n');
  improved = improved.replace(/\bnew paragraph\b/gi, '\n\n');
  
  // Clean up multiple spaces
  improved = improved.replace(/\s+/g, ' ');
  
  // Clean up punctuation spacing
  improved = improved.replace(/\s+([.!?])/g, '$1');
  improved = improved.replace(/([.!?])\s*([A-Z])/g, '$1 $2');
  
  return improved;
}

export function useVoiceToText({
  onTranscriptionUpdate,
  onTranscriptionComplete,
  language = 'en-US',
  continuous = true,
  interimResults = true
}: UseVoiceToTextOptions = {}) {
  const { toast } = useToast();
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const [state, setState] = useState<VoiceToTextState>({
    isRecording: false,
    isSupported: false,
    transcript: '',
    interimTranscript: '',
    error: null,
    isInitializing: true
  });

  // Check for Web Speech API support
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      setState(prev => ({ ...prev, isSupported: true, isInitializing: false }));
    } else {
      setState(prev => ({ 
        ...prev, 
        isSupported: false, 
        isInitializing: false,
        error: 'Speech recognition not supported in this browser. Please use Chrome or Edge for voice input.'
      }));
    }
  }, []);

  // Initialize speech recognition
  const initializeRecognition = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      return null;
    }

    const recognition = new SpeechRecognition() as SpeechRecognition;
    recognition.continuous = continuous;
    recognition.interimResults = interimResults;
    recognition.lang = language;
    recognition.maxAlternatives = 1;

    // Handle speech recognition results
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      setState(prev => {
        const newFullTranscript = prev.transcript + finalTranscript;
        const improvedTranscript = improvePunctuation(newFullTranscript);
        
        // Call update callback with improved transcript
        if (finalTranscript && onTranscriptionUpdate) {
          onTranscriptionUpdate(improvedTranscript);
        }

        return {
          ...prev,
          transcript: newFullTranscript,
          interimTranscript,
          error: null
        };
      });
    };

    // Handle speech recognition errors
    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      let errorMessage = 'Speech recognition error occurred';
      
      switch (event.error) {
        case 'no-speech':
          errorMessage = 'No speech detected. Please try speaking closer to your microphone.';
          break;
        case 'audio-capture':
          errorMessage = 'Microphone not accessible. Please check your microphone permissions.';
          break;
        case 'not-allowed':
          errorMessage = 'Microphone access denied. Please enable microphone permissions and try again.';
          break;
        case 'network':
          errorMessage = 'Network error occurred. Please check your internet connection.';
          break;
        case 'service-not-allowed':
          errorMessage = 'Speech service not allowed. Please try again.';
          break;
        default:
          errorMessage = `Speech recognition error: ${event.error}`;
      }

      setState(prev => ({
        ...prev,
        isRecording: false,
        error: errorMessage
      }));

      toast({
        title: "Voice Input Error",
        description: errorMessage,
        variant: "destructive",
      });
    };

    // Handle speech recognition end
    recognition.onend = () => {
      setState(prev => {
        // Call completion callback with final improved transcript
        if (prev.transcript && onTranscriptionComplete) {
          const improvedTranscript = improvePunctuation(prev.transcript);
          onTranscriptionComplete(improvedTranscript);
        }
        
        return {
          ...prev,
          isRecording: false,
          interimTranscript: ''
        };
      });
    };

    // Handle speech recognition start
    recognition.onstart = () => {
      setState(prev => ({
        ...prev,
        isRecording: true,
        error: null
      }));
    };

    return recognition;
  }, [continuous, interimResults, language, onTranscriptionUpdate, onTranscriptionComplete, toast]);

  // Start recording with improved device selection
  const startRecording = useCallback(async () => {
    if (!state.isSupported) {
      toast({
        title: "Voice Input Not Supported",
        description: "Please use Chrome or Edge browser for voice input functionality.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Request microphone permission with explicit constraints for better device selection
      const constraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          // Prefer system default audio input (not mobile devices)
          deviceId: 'default'
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      stream.getTracks().forEach(track => track.stop()); // Stop the stream, we just needed permission

      const recognition = initializeRecognition();
      if (!recognition) {
        throw new Error('Could not initialize speech recognition');
      }

      recognitionRef.current = recognition;
      
      // Clear previous transcript
      setState(prev => ({
        ...prev,
        transcript: '',
        interimTranscript: '',
        error: null
      }));

      recognition.start();
      
    } catch (error: any) {
      let errorMessage = 'Could not start voice recording';
      
      if (error.name === 'NotAllowedError') {
        errorMessage = 'Microphone access denied. Please enable microphone permissions in your browser settings.';
      } else if (error.name === 'NotFoundError') {
        errorMessage = 'No microphone found. Please connect a microphone and try again.';
      } else if (error.name === 'OverconstrainedError') {
        // Fallback to basic audio if device constraints fail
        try {
          const fallbackStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          fallbackStream.getTracks().forEach(track => track.stop());
          
          const recognition = initializeRecognition();
          if (recognition) {
            recognitionRef.current = recognition;
            setState(prev => ({
              ...prev,
              transcript: '',
              interimTranscript: '',
              error: null
            }));
            recognition.start();
            return;
          }
        } catch (fallbackError) {
          errorMessage = 'Could not access microphone. Please check your audio settings.';
        }
      }

      setState(prev => ({
        ...prev,
        error: errorMessage
      }));

      toast({
        title: "Voice Input Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  }, [state.isSupported, initializeRecognition, toast]);

  // Stop recording
  const stopRecording = useCallback(() => {
    if (recognitionRef.current && state.isRecording) {
      recognitionRef.current.stop();
    }
  }, [state.isRecording]);

  // Clear transcript
  const clearTranscript = useCallback(() => {
    setState(prev => ({
      ...prev,
      transcript: '',
      interimTranscript: '',
      error: null
    }));
  }, []);

  // Get full transcript (final + interim) with improved punctuation
  const getFullTranscript = useCallback(() => {
    const fullText = state.transcript + state.interimTranscript;
    return fullText ? improvePunctuation(fullText) : '';
  }, [state.transcript, state.interimTranscript]);

  return {
    // State
    isRecording: state.isRecording,
    isSupported: state.isSupported,
    transcript: state.transcript,
    interimTranscript: state.interimTranscript,
    fullTranscript: getFullTranscript(),
    error: state.error,
    isInitializing: state.isInitializing,
    
    // Actions
    startRecording,
    stopRecording,
    clearTranscript
  };
}

// Type augmentation for Web Speech API globals
declare global {
  interface Window {
    SpeechRecognition: SpeechRecognitionConstructor;
    webkitSpeechRecognition: SpeechRecognitionConstructor;
  }
} 