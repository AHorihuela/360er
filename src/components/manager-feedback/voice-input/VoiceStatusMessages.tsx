import { AlertCircle, Check, Mic, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VoiceStatusMessagesProps {
  isProcessing: boolean;
  isTranscribing: boolean;
  transcript: string;
  error: string | null;
  hasInteracted: boolean;
  isMobile: boolean;
}

export function VoiceStatusMessages({
  isProcessing,
  isTranscribing,
  transcript,
  error,
  hasInteracted,
  isMobile
}: VoiceStatusMessagesProps) {
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

      {/* Success Message - Show after transcription completes */}
      {!isProcessing && transcript && (
        <div className="p-3 border border-green-200 bg-green-50 rounded-lg">
          <div className="flex items-center gap-2 text-sm text-green-700">
            <Check className="h-4 w-4 flex-shrink-0" />
            <span>
              {isMobile ? 
                "Voice input added! You can edit the text field below." :
                "Voice input has been transcribed and added to your feedback! You can continue editing."
              }
            </span>
          </div>
          {transcript && (
            <div className="mt-2 p-2 bg-white border rounded text-xs">
              <strong>Added:</strong> "{transcript}"
            </div>
          )}
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className={cn(
          "p-3 border border-red-200 bg-red-50 rounded-lg",
          isMobile && "p-2"
        )}>
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
            <div className="space-y-1">
              <p className="text-xs font-medium text-red-800">Voice Input Error</p>
              <p className="text-xs text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* User-friendly voice input info */}
      {!isProcessing && !error && !hasInteracted && (
        <div className="p-3 border border-blue-200 bg-blue-50 rounded-lg">
          <div className="flex items-start gap-2">
            <Mic className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="space-y-1">
              <p className="text-xs font-medium text-blue-800">Voice Feedback Ready</p>
              <p className="text-xs text-blue-700">
                Click "Dictate Feedback" to speak your thoughts instead of typing. 
                Your speech will be automatically converted to text with high accuracy.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
} 