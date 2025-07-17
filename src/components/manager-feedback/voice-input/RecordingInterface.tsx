import { cn } from '@/lib/utils';
import { AudioLevelVisualizer } from './AudioLevelVisualizer';
import { RecordingTimer } from './RecordingTimer';

interface RecordingInterfaceProps {
  isRecording: boolean;
  audioLevel: number;
  recordingStartTime: number | null;
  baseText: string;
  isMobile: boolean;
}

export function RecordingInterface({
  isRecording,
  audioLevel,
  recordingStartTime,
  baseText,
  isMobile
}: RecordingInterfaceProps) {
  if (!isRecording) return null;

  return (
    <div className={cn(
      "space-y-4 p-4 border-2 border-red-200 rounded-lg bg-red-50/50",
      isMobile && "p-3"
    )}>
      {/* Recording Header with Timer */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-red-700 font-medium">
          <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
          Recording in Progress
        </div>
        <RecordingTimer startTime={recordingStartTime} />
      </div>

      {/* Audio Level Visualizer */}
      <AudioLevelVisualizer audioLevel={audioLevel} />

      {/* Recording Instructions */}
      <div className={cn(
        "text-center",
        isMobile && "text-xs"
      )}>
        <p className="text-sm text-muted-foreground">
          {isMobile ? 
            "Speak clearly. Tap 'Finish Recording' to save." :
            "🎤 Speak clearly into your microphone. Click 'Finish Recording' when done to save your feedback."
          }
        </p>
      </div>

      {/* Show base text if exists */}
      {baseText && (
        <div className="space-y-2">
          <div className="text-xs font-medium text-muted-foreground">
            Adding to existing text:
          </div>
          <div className="p-2 bg-white border rounded text-xs text-gray-600 max-h-20 overflow-y-auto">
            {baseText.length > 150 ? `${baseText.slice(0, 150)}...` : baseText}
          </div>
        </div>
      )}
    </div>
  );
} 