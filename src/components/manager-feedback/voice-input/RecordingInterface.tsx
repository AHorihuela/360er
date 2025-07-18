import { cn } from '@/lib/utils';
import { AudioLevelVisualizer } from './AudioLevelVisualizer';
import { RecordingTimer } from './RecordingTimer';

interface RecordingInterfaceProps {
  isRecording: boolean;
  isRecordingStarting?: boolean;
  audioLevel: number;
  averageLevel: number;
  recordingStartTime: number | null;
  baseText: string;
  isMobile: boolean;
}

export function RecordingInterface({
  isRecording,
  isRecordingStarting = false,
  audioLevel,
  averageLevel,
  recordingStartTime,
  baseText,
  isMobile
}: RecordingInterfaceProps) {
  if (!isRecording && !isRecordingStarting) return null;

  return (
    <div className={cn(
      "space-y-4 p-6 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-2xl border border-blue-200 shadow-lg",
      isMobile && "p-4 space-y-3"
    )}>
      {/* Simplified Header with Timer */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
            <div className="absolute inset-0 w-3 h-3 bg-red-400 rounded-full animate-ping" />
          </div>
          <span className="text-blue-700 font-semibold">
            {isRecordingStarting ? "Starting..." : "Recording Active"}
          </span>
        </div>
        {isRecording && (
          <div className="text-blue-600 font-mono font-medium">
            <RecordingTimer startTime={recordingStartTime} />
          </div>
        )}
      </div>

      {/* Audio Level Visualizer - Only show when actually recording */}
      {isRecording && (
        <div className="bg-white/80 rounded-lg p-4 backdrop-blur-sm">
          <AudioLevelVisualizer 
            audioLevel={audioLevel} 
            averageLevel={averageLevel}
          />
        </div>
      )}

      {/* Show base text context if exists - simplified */}
      {baseText && baseText.length > 0 && (
        <div className="p-3 bg-white/60 rounded-lg border border-blue-100">
          <div className="text-xs text-blue-600 mb-1 font-medium">
            Adding to existing text:
          </div>
          <div className="text-sm text-gray-700 bg-white/60 p-2 rounded text-ellipsis overflow-hidden">
            {baseText.length > 80 ? `${baseText.substring(0, 80)}...` : baseText}
          </div>
        </div>
      )}
    </div>
  );
} 