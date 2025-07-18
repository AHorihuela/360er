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
      "space-y-6 p-8 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 rounded-2xl border-2 border-blue-200 shadow-xl backdrop-blur-sm",
      isMobile && "p-6 space-y-4"
    )}>
      {/* Recording Header with Timer */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className={cn(
            "flex items-center gap-3 text-blue-700 font-bold text-lg",
            isMobile && "text-base"
          )}>
            <div className="relative">
              <div className="w-4 h-4 bg-red-500 rounded-full animate-pulse" />
              <div className="absolute inset-0 w-4 h-4 bg-red-400 rounded-full animate-ping" />
            </div>
            {isRecordingStarting ? "Preparing to Record..." : "Recording Active"}
          </div>
          {isRecording && (
            <div className="text-sm text-blue-600 bg-blue-100 px-3 py-1 rounded-full font-semibold border border-blue-200">
              LIVE
            </div>
          )}
        </div>
        {isRecording && (
          <div className="text-blue-700 font-mono text-lg font-semibold">
            <RecordingTimer startTime={recordingStartTime} />
          </div>
        )}
      </div>

      {/* Audio Level Visualizer - Only show when actually recording */}
      {isRecording && (
        <div className="bg-white/80 rounded-xl p-6 backdrop-blur-sm border border-white/60 shadow-sm">
          <AudioLevelVisualizer audioLevel={audioLevel} />
        </div>
      )}

      {/* Recording Status Instructions */}
      <div className={cn(
        "text-center p-6 bg-white/70 rounded-xl border border-white/80 shadow-sm",
        isMobile && "text-sm p-4"
      )}>
        {isRecordingStarting ? (
          <div className="space-y-3">
            <p className="text-lg text-blue-700 font-semibold">
              {isMobile ? 
                "Get ready to speak..." :
                "🎤 Get ready to speak - recording will begin in a moment..."
              }
            </p>
            <div className="text-sm text-blue-600 bg-blue-50 px-4 py-2 rounded-lg border border-blue-100">
              Microphone access granted • Audio system initializing
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-lg text-green-700 font-bold">
              {isMobile ? 
                "Speak now!" :
                "✅ Recording in progress - speak naturally!"
              }
            </p>
            <div className="text-sm text-green-600 bg-green-50 px-4 py-2 rounded-lg border border-green-100">
              Your voice is being captured • Click "Stop Recording" when finished
            </div>
          </div>
        )}
      </div>

      {/* Show base text context if exists */}
      {baseText && baseText.length > 0 && (
        <div className="p-4 bg-white/60 rounded-xl border border-white/70 shadow-sm">
          <div className="text-sm text-muted-foreground mb-2 font-semibold">
            Adding to existing text:
          </div>
          <div className="text-sm text-gray-700 bg-white/80 p-3 rounded-lg border border-gray-200 max-h-20 overflow-y-auto">
            {baseText.length > 100 ? `${baseText.substring(0, 100)}...` : baseText}
          </div>
        </div>
      )}
    </div>
  );
} 