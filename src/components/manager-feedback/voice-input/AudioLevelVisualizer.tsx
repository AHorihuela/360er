import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface AudioLevelVisualizerProps {
  audioLevel: number;
}

export function AudioLevelVisualizer({ audioLevel }: AudioLevelVisualizerProps) {
  const bars = 8;
  const normalizedLevel = Math.min(audioLevel * 100, 100);
  
  return (
    <div className="space-y-2">
      <div className="text-xs font-medium text-center text-muted-foreground">
        Audio Level
      </div>
      <div className="flex items-center justify-center gap-1 h-8">
        {Array.from({ length: bars }).map((_, i) => {
          const barHeight = Math.max(4, (normalizedLevel / 100) * 32);
          const isActive = (i + 1) * (100 / bars) <= normalizedLevel;
          
          return (
            <div
              key={i}
              className={cn(
                "w-2 rounded-full transition-all duration-100",
                isActive ? "bg-red-500" : "bg-gray-300"
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
          {audioLevel > 0.01 ? "🎤 Good signal" : "🔇 Speak louder"}
        </Badge>
      </div>
    </div>
  );
} 