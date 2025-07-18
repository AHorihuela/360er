import { useEffect, useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from '@/components/ui/tooltip';
import { Mic, MicOff, Square, Loader2, AlertCircle, Smartphone, Info } from 'lucide-react';
import { useWhisperVoiceToText } from '@/hooks/useWhisperVoiceToText';
import { cn } from '@/lib/utils';
import { 
  RecordingInterface, 
  VoiceStatusMessages
} from './voice-input';
import { VoiceDebugging } from './VoiceDebugging';

interface VoiceToTextInputProps {
  value: string;
  onChange: (value: string) => void;
  onVoiceToggle?: (isVoiceMode: boolean) => void;
  disabled?: boolean;
  className?: string;
  language?: string;
}

export function VoiceToTextInput({
  value,
  onChange,
  onVoiceToggle,
  disabled = false,
  className,
  language = 'en'
}: VoiceToTextInputProps) {
  const [hasInteracted, setHasInteracted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const baseTextRef = useRef<string>(''); // Use ref instead of state to avoid closure issues
  const [recordingStartTime, setRecordingStartTime] = useState<number | null>(null);

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
                           window.innerWidth <= 768;
      setIsMobile(isMobileDevice);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const {
    isRecording,
    isRecordingStarting,
    isTranscribing,
    isSupported,
    transcript,
    error,
    isInitializing,
    isProcessing,
    audioLevel, // Now comes from the integrated hook
    startRecording,
    stopRecording,
    clearTranscript
  } = useWhisperVoiceToText({
    onTranscriptionComplete: (text) => {
      if (text.trim()) {
        // Append transcribed text to the base text that was there when recording started
        const trimmedText = text.trim();
        let newValue = baseTextRef.current;
        
        // Add appropriate spacing/formatting between existing text and new transcription
        if (newValue.length > 0) {
          // If baseText doesn't end with punctuation or whitespace, add a space
          if (!newValue.match(/[.!?]\s*$/) && !newValue.endsWith(' ')) {
            newValue += ' ';
          }
          // If baseText ends with punctuation but no space, add a space
          else if (newValue.match(/[.!?]$/) && !newValue.endsWith(' ')) {
            newValue += ' ';
          }
          // If we have a substantial base text, consider adding a line break for readability
          else if (newValue.length > 100 && !newValue.endsWith('\n')) {
            newValue += '\n\n';
          }
        }
        
        newValue += trimmedText;
        onChange(newValue);
      }
      
      // Clean up and show success message briefly
      baseTextRef.current = '';
      setRecordingStartTime(null);
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setHasInteracted(false);
      }, 3000);
    },
    language
  });

  // Notify parent about voice mode changes
  useEffect(() => {
    onVoiceToggle?.(isProcessing);
  }, [isProcessing, onVoiceToggle]);

  const handleVoiceToggle = async () => {
    setHasInteracted(true);
    
    if (!isRecording && !isTranscribing) {
      // Start recording - capture current text as base
      baseTextRef.current = value;
      clearTranscript();
      setRecordingStartTime(Date.now());
      await startRecording();
    } else {
      // Stop recording
      setRecordingStartTime(null);
      stopRecording();
    }
  };

  // Show loading state while initializing
  if (isInitializing) {
    return (
      <div className={cn("flex items-center justify-center p-4", className)}>
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="ml-2 text-sm text-muted-foreground">Initializing voice input...</span>
      </div>
    );
  }

  // Emergency override for iOS testing
  const hasBasicAPIs = typeof MediaRecorder !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;
  const shouldForceEnable = hasBasicAPIs;
  
  // Show unsupported message if browser doesn't support MediaRecorder
  if (!isSupported && !shouldForceEnable) {
    console.log('❌ Voice input disabled. Support check failed and force enable not applicable.');
    console.log('isSupported:', isSupported);
    console.log('shouldForceEnable:', shouldForceEnable);
    console.log('hasBasicAPIs:', hasBasicAPIs);
    
    return (
      <div className={cn("space-y-2", className)}>
        <Button
          type="button"
          variant="outline"
          size={isMobile ? "default" : "sm"}
          disabled={true}
          className="flex items-center gap-2 w-full sm:w-auto"
        >
          <MicOff className="h-4 w-4" />
          Voice Input (Not Supported)
        </Button>
        <div className="p-3 border border-orange-200 bg-orange-50 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
            <div className="space-y-1">
              <p className="text-xs text-orange-800 font-medium">
                Voice input not available
              </p>
              <p className="text-xs text-orange-700">
                Your browser doesn't support audio recording. Please use manual text input instead.
              </p>
              <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs">
                <p className="text-red-800 font-medium">API Status:</p>
                <p className="text-red-700">
                  MediaRecorder: {typeof MediaRecorder !== 'undefined' ? '✅ Available' : '❌ Missing'}<br/>
                  getUserMedia: {!!navigator.mediaDevices?.getUserMedia ? '✅ Available' : '❌ Missing'}<br/>
                  Protocol: {window.location.protocol}
                </p>
                {window.location.protocol === 'http:' && (
                  <div className="mt-2 p-2 bg-orange-50 border border-orange-200 rounded">
                    <p className="text-orange-800 font-medium">Solution:</p>
                    <p className="text-orange-700">
                      iOS Safari requires HTTPS for microphone access.<br/>
                      Try accessing: <br/>
                      <strong>https://localhost:5173</strong><br/>
                      (Accept the security warning for the self-signed certificate)
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      {/* Voice Toggle Button */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant={isProcessing ? "destructive" : "outline"}
              size={isMobile ? "default" : "sm"}
              onClick={handleVoiceToggle}
              disabled={disabled || (!isSupported && !shouldForceEnable)}
              className={cn(
                "flex items-center gap-2 transition-all",
                isMobile ? "w-full" : "w-auto",
                isProcessing && "animate-pulse"
              )}
            >
              {isProcessing ? (
                <>
                  <Square className="h-4 w-4" />
                  {isRecordingStarting ? 'Starting...' : isRecording ? 'Stop Recording' : 'Processing...'}
                </>
              ) : (
                <>
                  <Mic className="h-4 w-4" />
                  {isMobile ? 'Voice Input' : 'Start Voice Input'}
                </>
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">
              {isProcessing 
                ? "Click to stop recording" 
                : isMobile 
                  ? "Tap to record voice input" 
                  : "Click to start voice recording"
              }
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Recording Interface */}
      <RecordingInterface
        isRecording={isRecording}
        isRecordingStarting={isRecordingStarting}
        audioLevel={audioLevel} // Use integrated audio level
        recordingStartTime={recordingStartTime}
        baseText={baseTextRef.current}
        isMobile={isMobile}
      />

      {/* Status Messages */}
      <VoiceStatusMessages
        isProcessing={isProcessing}
        isTranscribing={isTranscribing}
        transcript={transcript}
        error={error}
        hasInteracted={hasInteracted}
        isMobile={isMobile}
      />

      {/* Development Debug Info */}
      {process.env.NODE_ENV === 'development' && (
        <VoiceDebugging />
      )}
    </div>
  );
} 