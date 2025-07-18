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
      "space-y-4 p-6 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 rounded-xl border-2 border-blue-200 shadow-lg backdrop-blur-sm",
      isMobile && "p-4 space-y-3"
    )}>
      {/* Recording Header with Timer */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={cn(
            "flex items-center gap-2 text-blue-700 font-semibold",
            isMobile && "text-sm"
          )}>
            <div className="relative">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
              <div className="absolute inset-0 w-3 h-3 bg-red-400 rounded-full animate-ping" />
            </div>
            {isRecordingStarting ? "Preparing to Record..." : "Recording Active"}
          </div>
          {isRecording && (
            <div className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded-full font-medium">
              LIVE
            </div>
          )}
        </div>
                 {isRecording && (
           <div className="text-blue-700 font-mono text-sm">
             <RecordingTimer startTime={recordingStartTime} />
           </div>
         )}
      </div>

      {/* Audio Level Visualizer - Only show when actually recording */}
      {isRecording && (
        <div className="bg-white/70 rounded-lg p-4 backdrop-blur-sm border border-white/50">
          <AudioLevelVisualizer audioLevel={audioLevel} />
        </div>
      )}

      {/* Recording Status Instructions */}
      <div className={cn(
        "text-center p-4 bg-white/60 rounded-lg border border-white/70",
        isMobile && "text-xs p-3"
      )}>
        {isRecordingStarting ? (
          <div className="space-y-2">
            <p className="text-sm text-blue-700 font-medium">
              {isMobile ? 
                "Get ready to speak..." :
                "🎤 Get ready to speak - recording will begin in a moment..."
              }
            </p>
            <div className="text-xs text-blue-600">
              Microphone access granted • Audio system initializing
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-green-700 font-semibold">
              {isMobile ? 
                "Speak now!" :
                "✅ Recording in progress - speak naturally!"
              }
            </p>
            <div className="text-xs text-green-600">
              Your voice is being captured • Click "Stop Recording" when finished
            </div>
          </div>
        )}
      </div>

      {/* Show base text context if exists */}
      {baseText && baseText.length > 0 && (
        <div className="mt-4 p-3 bg-white/50 rounded-lg border border-white/60">
          <div className="text-xs text-muted-foreground mb-1 font-medium">
            Adding to existing text:
          </div>
          <div className="text-sm text-gray-700 bg-white/70 p-2 rounded border border-gray-200 max-h-16 overflow-y-auto">
            {baseText.length > 100 ? `${baseText.substring(0, 100)}...` : baseText}
          </div>
        </div>
      )}
    </div>
  );
} 