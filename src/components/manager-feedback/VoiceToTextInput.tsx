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
  const [showSuccessState, setShowSuccessState] = useState(false);
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
    audioLevel,
    averageLevel,
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
      
      // Clean up and show success state
      baseTextRef.current = '';
      setRecordingStartTime(null);
      setShowSuccessState(true);
      setHasInteracted(true);
      
      // Clear success state after 4 seconds
      setTimeout(() => {
        setShowSuccessState(false);
        setHasInteracted(false);
      }, 4000);
    },
    language
  });

  // Notify parent about voice mode changes
  useEffect(() => {
    onVoiceToggle?.(isProcessing);
  }, [isProcessing, onVoiceToggle]);

  const handleVoiceToggle = async () => {
    setHasInteracted(true);
    setShowSuccessState(false); // Clear any previous success state
    
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

  // Implement Cmd+K keyboard shortcut - must be before any early returns
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check for Cmd+K (Mac) or Ctrl+K (Windows/Linux)
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault();
        
        // Calculate support inline to avoid dependency issues
        const hasBasicAPIs = typeof MediaRecorder !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;
        const shouldForceEnable = hasBasicAPIs;
        
        // Only trigger if not disabled and component is supported
        if (!disabled && (isSupported || shouldForceEnable) && !isInitializing) {
          handleVoiceToggle();
        }
      }
    };

    // Add event listener
    document.addEventListener('keydown', handleKeyDown);
    
    // Cleanup
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [disabled, isSupported, isInitializing, handleVoiceToggle]);

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
    
    return (
      <div className={cn("space-y-3", className)}>
        <Button
          type="button"
          variant="outline"
          size={isMobile ? "lg" : "default"}
          disabled={true}
          className="flex items-center justify-center gap-3 w-full text-muted-foreground"
        >
          <MicOff className="h-4 w-4" />
          <span>Voice Input Not Available</span>
        </Button>
        
        <div className="p-4 border border-orange-200 bg-orange-50 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
            <div className="space-y-2">
              <p className="text-sm font-medium text-orange-800">
                Voice recording not supported
              </p>
              <p className="text-sm text-orange-700">
                Your browser or device doesn't support voice recording. Please use the text input field instead.
              </p>
              
              {window.location.protocol === 'http:' && (
                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm font-medium text-blue-800">
                    💡 Tip for iOS users:
                  </p>
                  <p className="text-sm text-blue-700 mt-1">
                    Voice input requires a secure connection. Try accessing:{' '}
                    <strong className="font-mono bg-white px-1 rounded">
                      https://localhost:5176
                    </strong>
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    (You may need to accept a security warning)
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      {/* Voice Toggle Button with inline pro tip */}
      <div className="flex items-center gap-3 flex-wrap">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant={isProcessing ? "destructive" : "outline"}
                size={isMobile ? "lg" : "default"}
                onClick={handleVoiceToggle}
                disabled={disabled || (!isSupported && !shouldForceEnable)}
                className={cn(
                  "flex items-center justify-center gap-3 transition-all duration-200 font-medium",
                  isMobile ? "w-full h-12" : "w-auto min-w-[180px] h-10",
                  isProcessing && "shadow-lg border-red-300",
                  !isProcessing && "hover:shadow-md hover:border-blue-300",
                  "group"
                )}
              >
                <div className={cn(
                  "flex items-center justify-center transition-all duration-200",
                  isProcessing && "scale-110"
                )}>
                  {isProcessing ? (
                    isRecordingStarting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : isRecording ? (
                      <div className="relative">
                        <Square className="h-4 w-4" />
                        <div className="absolute -inset-1 bg-red-500 rounded opacity-30 animate-ping" />
                      </div>
                    ) : (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    )
                  ) : (
                    <Mic className={cn(
                      "h-4 w-4 transition-all duration-200",
                      "group-hover:scale-110"
                    )} />
                  )}
                </div>
                
                <span className="text-sm">
                  {isProcessing ? (
                    isRecordingStarting ? 'Preparing...' : 
                    isRecording ? 'Stop Recording' : 
                    'Processing...'
                  ) : (
                    isMobile ? 'Voice Input' : 'Start Voice Input'
                  )}
                </span>
                
                {!isProcessing && !isMobile && (
                  <kbd className="ml-2 inline-flex h-5 max-h-full items-center rounded border border-border bg-muted px-1 font-[inherit] text-[0.625rem] font-medium text-muted-foreground opacity-100">
                    ⌘K
                  </kbd>
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              <div className="text-center">
                <p className="font-medium">
                  {isProcessing 
                    ? "Click to stop recording" 
                    : "Start voice input"
                  }
                </p>
                {!isProcessing && (
                  <p className="text-muted-foreground mt-1">
                    {isMobile 
                      ? "Tap and speak naturally" 
                      : "Click or press ⌘K to begin"
                    }
                  </p>
                )}
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Subtle inline pro tip - only show when idle and not on mobile */}
        {!isProcessing && !showSuccessState && !error && !hasInteracted && !isMobile && (
          <span className="text-xs text-muted-foreground">
            Speak naturally - AI will help organize your thoughts
          </span>
        )}
      </div>

      {/* Recording Interface - Full prominence when active */}
      {(isRecording || isRecordingStarting) && (
        <RecordingInterface
          isRecording={isRecording}
          isRecordingStarting={isRecordingStarting}
          audioLevel={audioLevel}
          averageLevel={averageLevel}
          recordingStartTime={recordingStartTime}
          baseText={baseTextRef.current}
          isMobile={isMobile}
        />
      )}

      {/* Processing Status - Shown during transcription */}
      {isTranscribing && (
        <VoiceStatusMessages
          isProcessing={isProcessing}
          isTranscribing={isTranscribing}
          transcript={transcript}
          error={error}
          hasInteracted={hasInteracted}
          isMobile={isMobile}
        />
      )}

      {/* Success State - Minimized after completion */}
      {showSuccessState && transcript && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-2 text-sm text-green-700">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="font-medium">Voice input added successfully!</span>
          </div>
        </div>
      )}

      {/* Error Messages */}
      {error && !isProcessing && (
        <VoiceStatusMessages
          isProcessing={isProcessing}
          isTranscribing={isTranscribing}
          transcript={transcript}
          error={error}
          hasInteracted={hasInteracted}
          isMobile={isMobile}
        />
      )}
    </div>
  );
} 