import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface AudioLevelVisualizerProps {
  audioLevel: number;
}

export function AudioLevelVisualizer({ audioLevel }: AudioLevelVisualizerProps) {
  const bars = 8;
  const normalizedLevel = Math.min(audioLevel * 100, 100);
  
  // Better threshold calibration - lowered for more sensitivity
  const speakLouderThreshold = 0.05; // Was 0.01, now 0.05 for better calibration
  const goodSignalThreshold = 0.15;  // Good signal level
  
  // Determine status
  let status: 'silent' | 'low' | 'good' | 'excellent';
  let statusMessage: string;
  let statusColor: string;
  
  if (audioLevel < speakLouderThreshold) {
    status = 'silent';
    statusMessage = '🔇 Speak louder';
    statusColor = 'text-red-600';
  } else if (audioLevel < goodSignalThreshold) {
    status = 'low';
    statusMessage = '📢 Speak up a bit';
    statusColor = 'text-orange-600';
  } else if (audioLevel < 0.4) {
    status = 'good';
    statusMessage = '🎤 Good signal';
    statusColor = 'text-green-600';
  } else {
    status = 'excellent';
    statusMessage = '🎤 Excellent signal';
    statusColor = 'text-green-700';
  }
  
  return (
    <div className="space-y-2">
      <div className="text-xs font-medium text-center text-muted-foreground">
        Audio Level
      </div>
      <div className="flex items-center justify-center gap-1 h-8">
        {Array.from({ length: bars }).map((_, i) => {
          const barThreshold = (i + 1) * (100 / bars);
          const isActive = normalizedLevel >= barThreshold;
          
          // Dynamic bar height based on current level
          const maxHeight = 32;
          const minHeight = 4;
          let barHeight = minHeight;
          
          if (isActive) {
            // Scale bar height proportionally to level
            const levelRatio = Math.min(normalizedLevel / barThreshold, 1);
            barHeight = minHeight + (maxHeight - minHeight) * levelRatio;
          }
          
          // Color coding based on level
          let barColor = 'bg-gray-300';
          if (isActive) {
            if (normalizedLevel < speakLouderThreshold * 100) {
              barColor = 'bg-red-400';
            } else if (normalizedLevel < goodSignalThreshold * 100) {
              barColor = 'bg-orange-400';
            } else if (normalizedLevel < 40) {
              barColor = 'bg-green-500';
            } else {
              barColor = 'bg-green-600';
            }
          }
          
          return (
            <div
              key={i}
              className={cn(
                "w-2 rounded-full transition-all duration-150",
                barColor
              )}
              style={{ 
                height: `${barHeight}px`,
                opacity: isActive ? 1 : 0.3
              }}
            />
          );
        })}
      </div>
      <div className="text-center">
        <Badge variant="outline" className="text-xs">
          <span className={statusColor}>
            {statusMessage}
          </span>
        </Badge>
      </div>
      
      {/* Debug info for development - remove in production */}
      {process.env.NODE_ENV === 'development' && (
        <div className="text-xs text-muted-foreground text-center">
          Level: {(audioLevel * 100).toFixed(1)}%
        </div>
      )}
    </div>
  );
} 