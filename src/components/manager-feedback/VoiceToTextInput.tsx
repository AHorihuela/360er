import { useEffect, useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Mic, MicOff, Square, Loader2, AlertCircle, Check, Smartphone, Clock } from 'lucide-react';
import { useWhisperVoiceToText } from '@/hooks/useWhisperVoiceToText';
import { cn } from '@/lib/utils';

interface VoiceToTextInputProps {
  value: string;
  onChange: (value: string) => void;
  onVoiceToggle?: (isVoiceMode: boolean) => void;
  disabled?: boolean;
  className?: string;
  language?: string;
}

// Audio level visualization component
function AudioLevelVisualizer({ audioLevel }: { audioLevel: number }) {
  const bars = 8;
  const normalizedLevel = Math.min(audioLevel * 100, 100);
  
  return (
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
  );
}

// Recording duration timer component  
function RecordingTimer({ startTime }: { startTime: number | null }) {
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

export function VoiceToTextInput({
  value,
  onChange,
  onVoiceToggle,
  disabled = false,
  className,
  language = 'en'
}: VoiceToTextInputProps) {
  const [hasInteracted, setHasInteracted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [baseText, setBaseText] = useState(''); // Text when voice recording started
  const [audioLevel, setAudioLevel] = useState(0);
  const [recordingStartTime, setRecordingStartTime] = useState<number | null>(null);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
                           window.innerWidth <= 768;
      setIsMobile(isMobileDevice);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const {
    isRecording,
    isTranscribing,
    isSupported,
    transcript,
    error,
    isInitializing,
    isProcessing,
    startRecording,
    stopRecording,
    clearTranscript
  } = useWhisperVoiceToText({
    onTranscriptionComplete: (text) => {
      if (text.trim()) {
        // Append transcribed text to the base text that was there when recording started
        const newValue = baseText + (baseText && !baseText.endsWith(' ') && baseText.length > 0 ? ' ' : '') + text;
        onChange(newValue);
      }
      
      // Clean up
      setBaseText('');
      setHasInteracted(false);
      setRecordingStartTime(null);
      
      // Stop audio level monitoring
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
    },
    language
  });

  // Audio level monitoring
  const startAudioLevelMonitoring = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      
      analyserRef.current.fftSize = 256;
      source.connect(analyserRef.current);
      
      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
      
      const updateAudioLevel = () => {
        if (!analyserRef.current) return;
        
        analyserRef.current.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
        const normalizedLevel = average / 255;
        
        setAudioLevel(normalizedLevel);
        animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
      };
      
      updateAudioLevel();
    } catch (error) {
      console.error('Error setting up audio level monitoring:', error);
    }
  };

  // Notify parent about voice mode changes
  useEffect(() => {
    onVoiceToggle?.(isProcessing);
  }, [isProcessing, onVoiceToggle]);

  const handleVoiceToggle = async () => {
    setHasInteracted(true);
    
    if (!isRecording && !isTranscribing) {
      // Start recording - capture current text as base
      setBaseText(value);
      clearTranscript();
      setRecordingStartTime(Date.now());
      await startRecording();
      await startAudioLevelMonitoring();
    } else {
      // Stop recording
      setRecordingStartTime(null);
      stopRecording();
      
      // Stop audio level monitoring
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  // Show loading state while initializing
  if (isInitializing) {
    return (
      <div className={cn("flex items-center justify-center p-4", className)}>
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="ml-2 text-sm text-muted-foreground">Initializing voice input...</span>
      </div>
    );
  }

  // Show unsupported message if browser doesn't support MediaRecorder
  if (!isSupported) {
    return (
      <div className={cn("space-y-2", className)}>
        <Button
          type="button"
          variant="outline"
          size={isMobile ? "default" : "sm"}
          disabled={true}
          className="flex items-center gap-2 w-full sm:w-auto"
        >
          <MicOff className="h-4 w-4" />
          Voice Input (Not Supported)
        </Button>
        <div className="p-3 border border-orange-200 bg-orange-50 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
            <div className="space-y-1">
              <p className="text-xs text-orange-800 font-medium">
                Voice input not available
              </p>
              <p className="text-xs text-orange-700">
                Your browser doesn't support audio recording. Please use manual text input instead.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      {/* Voice Recording Button */}
      <div className="flex items-center justify-between gap-2">
        <Button
          type="button"
          variant={isProcessing ? "destructive" : "outline"}
          size={isMobile ? "default" : "sm"}
          onClick={handleVoiceToggle}
          disabled={disabled}
          className={cn(
            "flex items-center gap-2 transition-all duration-200",
            isMobile ? "min-h-[44px] px-4" : "",
            isProcessing && "shadow-lg"
          )}
        >
          {isRecording ? (
            <Square className="h-4 w-4" />
          ) : isTranscribing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Mic className="h-4 w-4" />
          )}
          
          {isMobile ? (
            isRecording ? "Finish Recording" : isTranscribing ? "Processing..." : "Dictate"
          ) : (
            isRecording ? "Finish Recording" : isTranscribing ? "Transcribing..." : "Dictate Feedback"
          )}
          
          {isMobile && !isProcessing && <Smartphone className="h-3 w-3 opacity-60" />}
        </Button>

        {/* Status Badge */}
        {isProcessing && (
          <Badge 
            variant={isRecording ? "destructive" : "secondary"} 
            className={cn(
              isMobile && "px-2 py-1",
              isRecording && "animate-pulse"
            )}
          >
            {isRecording && <div className="w-2 h-2 bg-white rounded-full mr-1" />}
            {isRecording ? (isMobile ? "Recording" : "Recording...") : 
             isTranscribing ? (isMobile ? "Processing" : "Processing...") : 
             "Ready"}
          </Badge>
        )}
      </div>

      {/* Recording Interface - Enhanced with audio level and timer */}
      {isRecording && (
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
          <div className="space-y-2">
            <div className="text-xs font-medium text-center text-muted-foreground">
              Audio Level
            </div>
            <AudioLevelVisualizer audioLevel={audioLevel} />
            <div className="text-center">
              <Badge variant="outline" className="text-xs">
                {audioLevel > 0.03 ? "🎤 Good signal" : "🔇 Speak louder"}
              </Badge>
            </div>
          </div>

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
      )}

      {/* Transcribing Interface */}
      {isTranscribing && (
        <div className={cn(
          "space-y-3 p-4 border-2 border-blue-200 rounded-lg bg-blue-50/50",
          isMobile && "p-3"
        )}>
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 text-blue-700 font-medium mb-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              {isMobile ? "Processing..." : "Processing your speech..."}
            </div>
            <p className="text-sm text-muted-foreground">
              Using AI to transcribe your speech with high accuracy.
            </p>
          </div>
        </div>
      )}

      {/* Success Message - Show after transcription completes */}
      {!isProcessing && transcript && (
        <div className="p-3 border border-green-200 bg-green-50 rounded-lg">
          <div className="flex items-center gap-2 text-sm text-green-700">
            <Check className="h-4 w-4 flex-shrink-0" />
            <span>
              {isMobile ? 
                "Voice input added! You can edit the text field below." :
                "Voice input has been transcribed and added to your feedback! You can continue editing."
              }
            </span>
          </div>
          {transcript && (
            <div className="mt-2 p-2 bg-white border rounded text-xs">
              <strong>Added:</strong> "{transcript}"
            </div>
          )}
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className={cn(
          "p-3 border border-red-200 bg-red-50 rounded-lg",
          isMobile && "p-2"
        )}>
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
            <div className="space-y-1">
              <p className="text-xs font-medium text-red-800">Voice Input Error</p>
              <p className="text-xs text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* User-friendly voice input info */}
      {!isProcessing && !error && !hasInteracted && (
        <div className="p-3 border border-blue-200 bg-blue-50 rounded-lg">
          <div className="flex items-start gap-2">
            <Mic className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="space-y-1">
              <p className="text-xs font-medium text-blue-800">Voice Feedback Ready</p>
              <p className="text-xs text-blue-700">
                Click "Dictate Feedback" to speak your thoughts instead of typing. 
                Your speech will be automatically converted to text with high accuracy.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 