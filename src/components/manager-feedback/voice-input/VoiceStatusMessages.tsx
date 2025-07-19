import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/ui/badge-variants';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { CheckCircle, AlertCircle } from 'lucide-react';

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
  // Show transcription success
  if (transcript && hasInteracted) {
    return (
      <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
        <div className="flex items-start gap-3">
          <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-2">
              <StatusBadge status="Completed">
                ✅ Transcription Complete
              </StatusBadge>
            </div>
            <p className="text-sm text-green-700">
              Your voice has been successfully converted to text and added to your feedback.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Show transcribing status
  if (isTranscribing) {
    return (
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-center gap-3">
          <LoadingSpinner size="md" color="primary" className="flex-shrink-0" />
          <div className="space-y-1">
            <StatusBadge status="In Progress">
              🎯 Processing Audio
            </StatusBadge>
            <p className="text-sm text-blue-700">
              Converting your speech to text using AI transcription...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Show errors
  if (error && error !== 'silent_recording') {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
          <div className="space-y-2">
            <StatusBadge status="Overdue">
              ⚠️ Recording Issue
            </StatusBadge>
            <p className="text-sm text-red-700 leading-relaxed">
              {error}
            </p>
            <p className="text-xs text-red-600">
              Don't worry - you can always use the text input field to add your feedback manually.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Handle silent recording separately
  if (error === 'silent_recording') {
    return (
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
          <div className="space-y-2">
            <StatusBadge status="Warning">
              🔇 No Audio Detected
            </StatusBadge>
            <p className="text-sm text-amber-700">
              We didn't detect any speech in that recording. Please try again and speak a bit louder.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Show helpful tip when not processing
  if (!isProcessing && !hasInteracted) {
    return (
      <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
        <div className="text-center space-y-2">
          <Badge variant="outline" className="text-slate-700">
            💡 Pro Tip
          </Badge>
          <p className="text-sm text-slate-600">
            {isMobile 
              ? "Tap the voice button and speak naturally - no need for perfect sentences. The AI will help structure your thoughts."
              : "Click the voice button or press ⌘K to start. Speak naturally and conversationally - the AI will help organize your feedback."
            }
          </p>
        </div>
      </div>
    );
  }

  return null;
} 