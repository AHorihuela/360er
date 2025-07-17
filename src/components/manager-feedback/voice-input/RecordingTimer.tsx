import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';

interface RecordingTimerProps {
  startTime: number | null;
}

export function RecordingTimer({ startTime }: RecordingTimerProps) {
  const [duration, setDuration] = useState(0);
  
  useEffect(() => {
    if (!startTime) {
      setDuration(0);
      return;
    }
    
    const interval = setInterval(() => {
      setDuration(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    
    return () => clearInterval(interval);
  }, [startTime]);
  
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  return (
    <div className="flex items-center gap-2 text-red-700 font-mono text-sm">
      <Clock className="h-4 w-4" />
      <span>{formatTime(duration)}</span>
    </div>
  );
} 