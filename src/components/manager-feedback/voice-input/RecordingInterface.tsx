import { cn } from '@/lib/utils';
import { AudioLevelVisualizer } from './AudioLevelVisualizer';
import { RecordingTimer } from './RecordingTimer';

interface RecordingInterfaceProps {
  isRecording: boolean;
  isRecordingStarting?: boolean;
  audioLevel: number;
  recordingStartTime: number | null;
  baseText: string;
  isMobile: boolean;
}

export function RecordingInterface({
  isRecording,
  isRecordingStarting = false,
  audioLevel,
  recordingStartTime,
  baseText,
  isMobile
}: RecordingInterfaceProps) {
  if (!isRecording && !isRecordingStarting) return null;

  return (
    <div className={cn(
      "space-y-4 p-4 border-2 border-red-200 rounded-lg bg-red-50/50",
      isMobile && "p-3"
    )}>
      {/* Recording Header with Timer */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-red-700 font-medium">
          <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
          {isRecordingStarting ? "Preparing to Record..." : "Recording in Progress"}
        </div>
        {isRecording && <RecordingTimer startTime={recordingStartTime} />}
      </div>

      {/* Audio Level Visualizer - Only show when actually recording */}
      {isRecording && <AudioLevelVisualizer audioLevel={audioLevel} />}

      {/* Recording Status Instructions */}
      <div className={cn(
        "text-center",
        isMobile && "text-xs"
      )}>
        {isRecordingStarting ? (
          <p className="text-sm text-muted-foreground">
            {isMobile ? 
              "Get ready to speak..." :
              "🎤 Get ready to speak - recording will begin in a moment..."
            }
          </p>
        ) : (
          <p className="text-sm text-green-700 font-medium">
            {isMobile ? 
              "Speak now!" :
              "✅ Recording active - speak naturally!"
            }
          </p>
        )}
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