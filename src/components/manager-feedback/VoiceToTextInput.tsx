import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Mic, MicOff, Square, Loader2, AlertCircle, Smartphone } from 'lucide-react';
import { useWhisperVoiceToText } from '@/hooks/useWhisperVoiceToText';
import { cn } from '@/lib/utils';
import { 
  RecordingInterface, 
  VoiceStatusMessages, 
  useAudioLevelMonitoring 
} from './voice-input';

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
  const [baseText, setBaseText] = useState(''); // Text when voice recording started
  const [recordingStartTime, setRecordingStartTime] = useState<number | null>(null);
  
  const { audioLevel, startMonitoring, stopMonitoring } = useAudioLevelMonitoring();

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
    isTranscribing,
    isSupported,
    transcript,
    error,
    isInitializing,
    isProcessing,
    startRecording,
    stopRecording,
    clearTranscript
  } = useWhisperVoiceToText({
    onTranscriptionComplete: (text) => {
      if (text.trim()) {
        // Append transcribed text to the base text that was there when recording started
        const newValue = baseText + (baseText && !baseText.endsWith(' ') && baseText.length > 0 ? ' ' : '') + text;
        onChange(newValue);
      }
      
      // Clean up
      setBaseText('');
      setHasInteracted(false);
      setRecordingStartTime(null);
      stopMonitoring();
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
      setBaseText(value);
      clearTranscript();
      setRecordingStartTime(Date.now());
      await startRecording();
      await startMonitoring();
    } else {
      // Stop recording
      setRecordingStartTime(null);
      stopRecording();
      stopMonitoring();
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

  // Show unsupported message if browser doesn't support MediaRecorder
  if (!isSupported) {
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
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      {/* Voice Recording Button */}
      <div className="flex items-center justify-between gap-2">
        <Button
          type="button"
          variant={isProcessing ? "destructive" : "outline"}
          size={isMobile ? "default" : "sm"}
          onClick={handleVoiceToggle}
          disabled={disabled}
          className={cn(
            "flex items-center gap-2 transition-all duration-200",
            isMobile ? "min-h-[44px] px-4" : "",
            isProcessing && "shadow-lg"
          )}
        >
          {isRecording ? (
            <Square className="h-4 w-4" />
          ) : isTranscribing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Mic className="h-4 w-4" />
          )}
          
          {isMobile ? (
            isRecording ? "Finish Recording" : isTranscribing ? "Processing..." : "Dictate"
          ) : (
            isRecording ? "Finish Recording" : isTranscribing ? "Transcribing..." : "Dictate Feedback"
          )}
          
          {isMobile && !isProcessing && <Smartphone className="h-3 w-3 opacity-60" />}
        </Button>

        {/* Status Badge */}
        {isProcessing && (
          <Badge 
            variant={isRecording ? "destructive" : "secondary"} 
            className={cn(
              isMobile && "px-2 py-1",
              isRecording && "animate-pulse"
            )}
          >
            {isRecording && <div className="w-2 h-2 bg-white rounded-full mr-1" />}
            {isRecording ? (isMobile ? "Recording" : "Recording...") : 
             isTranscribing ? (isMobile ? "Processing" : "Processing...") : 
             "Ready"}
          </Badge>
        )}
      </div>

      {/* Recording Interface */}
      <RecordingInterface
        isRecording={isRecording}
        audioLevel={audioLevel}
        recordingStartTime={recordingStartTime}
        baseText={baseText}
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
    </div>
  );
} 