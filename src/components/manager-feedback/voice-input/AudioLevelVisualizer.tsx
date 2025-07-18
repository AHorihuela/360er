import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface AudioLevelVisualizerProps {
  audioLevel: number;
}

export function AudioLevelVisualizer({ audioLevel }: AudioLevelVisualizerProps) {
  const bars = 8;
  const normalizedLevel = Math.min(audioLevel * 100, 100);
  
  // Better threshold calibration
  const speakLouderThreshold = 0.05;
  const goodSignalThreshold = 0.15;
  
  // Determine status
  let statusMessage: string;
  let statusVariant: "default" | "secondary" | "destructive" | "outline";
  
  if (audioLevel < speakLouderThreshold) {
    statusMessage = '🔇 Speak louder';
    statusVariant = 'destructive';
  } else if (audioLevel < goodSignalThreshold) {
    statusMessage = '📢 Speak up a bit';
    statusVariant = 'secondary';
  } else if (audioLevel < 0.4) {
    statusMessage = '🎤 Good signal';
    statusVariant = 'default';
  } else {
    statusMessage = '🎤 Excellent signal';
    statusVariant = 'default';
  }
  
  return (
    <div className="space-y-3">
      {/* Audio Level Bars */}
      <div className="flex items-center justify-center gap-1 h-12 px-4 py-2 bg-gradient-to-r from-slate-50 to-slate-100 rounded-lg border">
        {Array.from({ length: bars }).map((_, i) => {
          const barThreshold = (i + 1) * (100 / bars);
          const isActive = normalizedLevel >= barThreshold;
          
          // Dynamic bar height based on current level
          const maxHeight = 32;
          const minHeight = 6;
          let barHeight = minHeight;
          
          if (isActive) {
            // Scale bar height proportionally to level
            const levelRatio = Math.min(normalizedLevel / barThreshold, 1);
            barHeight = minHeight + (maxHeight - minHeight) * levelRatio;
          }
          
          // Enhanced color coding with gradients
          let barColor = 'bg-gray-200';
          if (isActive) {
            if (normalizedLevel < speakLouderThreshold * 100) {
              barColor = 'bg-gradient-to-t from-red-400 to-red-500 shadow-sm';
            } else if (normalizedLevel < goodSignalThreshold * 100) {
              barColor = 'bg-gradient-to-t from-orange-400 to-orange-500 shadow-sm';
            } else if (normalizedLevel < 40) {
              barColor = 'bg-gradient-to-t from-green-400 to-green-500 shadow-sm';
            } else {
              barColor = 'bg-gradient-to-t from-emerald-500 to-emerald-600 shadow-sm';
            }
          }
          
          return (
            <div
              key={i}
              className={cn(
                "w-3 rounded-full transition-all duration-200 ease-out transform",
                barColor,
                isActive && "scale-105"
              )}
              style={{ 
                height: `${barHeight}px`,
                opacity: isActive ? 1 : 0.3
              }}
            />
          );
        })}
      </div>
      
      {/* Status Badge */}
      <div className="text-center">
        <Badge variant={statusVariant} className="text-xs font-medium px-3 py-1 shadow-sm">
          {statusMessage}
        </Badge>
      </div>
    </div>
  );
} 