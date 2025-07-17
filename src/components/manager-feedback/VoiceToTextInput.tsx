import { useEffect, useState } from 'react';
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
    isRecordingStarting,
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
        const trimmedText = text.trim();
        let newValue = baseText;
        
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
      setBaseText('');
      setRecordingStartTime(null);
      stopMonitoring();
      
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
    <TooltipProvider>
      <div className={cn("space-y-3", className)}>
        {/* Voice Recording Button */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
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
              ) : isRecordingStarting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isTranscribing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Mic className="h-4 w-4" />
              )}
              
              {isMobile ? (
                isRecording ? "Finish Recording" : 
                isRecordingStarting ? "Starting..." :
                isTranscribing ? "Processing..." : 
                "Dictate"
              ) : (
                isRecording ? "Finish Recording" : 
                isRecordingStarting ? "Starting Recording..." :
                isTranscribing ? "Transcribing..." : 
                "Dictate Feedback"
              )}
              
              {isMobile && !isProcessing && <Smartphone className="h-3 w-3 opacity-60" />}
            </Button>

            {/* Informational Tooltip */}
            {!isProcessing && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                  >
                    <Info className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs">
                  <div className="space-y-1">
                    <p className="font-medium">Speak Naturally</p>
                    <p className="text-xs">
                      Just speak your thoughts naturally - no need for perfect sentences. 
                      AI will help structure your feedback into professional reports.
                    </p>
                  </div>
                </TooltipContent>
              </Tooltip>
            )}
          </div>

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
               isRecordingStarting ? (isMobile ? "Starting" : "Starting...") :
               isTranscribing ? (isMobile ? "Processing" : "Processing...") : 
               "Ready"}
            </Badge>
          )}
        </div>

        {/* Recording Interface */}
        <RecordingInterface
          isRecording={isRecording}
          isRecordingStarting={isRecordingStarting}
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
    </TooltipProvider>
  );
} 