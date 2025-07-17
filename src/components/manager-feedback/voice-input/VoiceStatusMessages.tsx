import { AlertCircle, Check, Mic, Loader2, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VoiceStatusMessagesProps {
  isProcessing: boolean;
  isTranscribing: boolean;
  transcript: string;
  error: string | null;
  hasInteracted: boolean;
  isMobile: boolean;
}

// Helper function to get user-friendly error messages
function getErrorMessage(errorType: string, isMobile: boolean) {
  switch (errorType) {
    case 'silent_recording':
      return {
        title: 'No Speech Detected',
        message: isMobile 
          ? 'Try speaking closer to your microphone and tap record again.'
          : 'No speech was detected in your recording. Please speak closer to your microphone and try again.',
        isRetryable: true
      };
    
    case 'no_speech_detected':
      return {
        title: 'Audio Too Quiet',
        message: isMobile
          ? 'Your voice may have been too quiet. Try speaking louder.'
          : 'Your speech may have been too quiet to transcribe. Please speak louder and try again.',
        isRetryable: true
      };
    
    case 'network_error':
      return {
        title: 'Connection Issue',
        message: isMobile
          ? 'Check your internet connection and try again.'
          : 'Network error. Please check your internet connection and try again.',
        isRetryable: true
      };
    
    case 'rate_limit':
      return {
        title: 'Too Many Requests',
        message: isMobile
          ? 'Please wait a moment before trying again.'
          : 'Too many requests. Please wait a moment and try again.',
        isRetryable: true
      };
    
    case 'file_too_large':
      return {
        title: 'Recording Too Long',
        message: isMobile
          ? 'Keep recordings under 30 seconds.'
          : 'Recording too long. Please keep recordings under 30 seconds.',
        isRetryable: false
      };
    
    case 'invalid_audio':
      return {
        title: 'Audio Format Error',
        message: isMobile
          ? 'There was an issue with the audio format. Try again.'
          : 'There was an issue with the audio format. Please try recording again.',
        isRetryable: true
      };
    
    default:
      return {
        title: 'Transcription Issue',
        message: isMobile
          ? 'Something went wrong. Please try again.'
          : 'There was an issue processing your speech. Please try again.',
        isRetryable: true
      };
  }
}

export function VoiceStatusMessages({
  isProcessing,
  isTranscribing,
  transcript,
  error,
  hasInteracted,
  isMobile
}: VoiceStatusMessagesProps) {
  const errorInfo = error ? getErrorMessage(error, isMobile) : null;

  return (
    <>
      {/* Transcribing Interface */}
      {isTranscribing && (
        <div className={cn(
          "space-y-3 p-4 border-2 border-blue-200 rounded-lg bg-blue-50/50",
          isMobile && "p-3"
        )}>
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 text-blue-700 font-medium mb-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              {isMobile ? "Processing..." : "Processing your speech..."}
            </div>
            <p className="text-sm text-muted-foreground">
              Using AI to transcribe your speech with high accuracy.
            </p>
          </div>
        </div>
      )}

      {/* Simple Success Message - Only show briefly after transcription */}
      {!isProcessing && transcript && hasInteracted && (
        <div className="p-3 border border-green-200 bg-green-50 rounded-lg">
          <div className="flex items-center gap-2 text-sm text-green-700">
            <Check className="h-4 w-4 flex-shrink-0" />
            <span>Voice input added successfully!</span>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && errorInfo && (
        <div className={cn(
          "p-3 border rounded-lg",
          errorInfo.isRetryable 
            ? "border-orange-200 bg-orange-50" 
            : "border-red-200 bg-red-50",
          isMobile && "p-2"
        )}>
          <div className="flex items-start gap-2">
            {errorInfo.isRetryable ? (
              <RotateCcw className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
            )}
            <div className="space-y-1">
              <p className={cn(
                "text-xs font-medium",
                errorInfo.isRetryable ? "text-orange-800" : "text-red-800"
              )}>
                {errorInfo.title}
              </p>
              <p className={cn(
                "text-xs",
                errorInfo.isRetryable ? "text-orange-700" : "text-red-700"
              )}>
                {errorInfo.message}
              </p>
            </div>
          </div>
        </div>
      )}

    </>
  );
} 