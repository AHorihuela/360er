import { useRef, useState, useCallback, useEffect } from 'react';

// Type declaration for webkit audio context
declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}

export function useAudioLevelMonitoring() {
  const [audioLevel, setAudioLevel] = useState(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

  const startMonitoring = useCallback((stream: MediaStream) => {
    try {
      // Use the existing stream instead of creating a new one
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      analyserRef.current = audioContextRef.current.createAnalyser();
      sourceRef.current = audioContextRef.current.createMediaStreamSource(stream);
      
      // Optimized settings for speech detection (less twitchy)
      analyserRef.current.fftSize = 1024; // Increased for better resolution
      analyserRef.current.smoothingTimeConstant = 0.9; // Higher smoothing for stability
      sourceRef.current.connect(analyserRef.current);
      
      // Use time domain data for better volume detection
      const dataArray = new Uint8Array(analyserRef.current.fftSize);
      let lastSignificantLevel = 0;
      let levelHoldTime = 0;
      
      const updateAudioLevel = () => {
        if (!analyserRef.current) return;
        
        // Get time domain data (raw audio waveform)
        analyserRef.current.getByteTimeDomainData(dataArray);
        
        // Calculate RMS (Root Mean Square) for more accurate volume
        let rms = 0;
        for (let i = 0; i < dataArray.length; i++) {
          const sample = (dataArray[i] - 128) / 128; // Normalize to -1 to 1
          rms += sample * sample;
        }
        rms = Math.sqrt(rms / dataArray.length);
        
        // Apply sensitivity boost optimized for speech
        const sensitivity = 4.0; // Slightly increased for better response
        const currentLevel = Math.min(rms * sensitivity, 1);
        
        // Hold significant levels longer to avoid flickering
        if (currentLevel > 0.08) { // Threshold for "significant" audio
          lastSignificantLevel = currentLevel;
          levelHoldTime = 8; // Hold for 8 frames (~130ms at 60fps)
        } else if (levelHoldTime > 0) {
          levelHoldTime--;
          // Gradually decay the held level
          lastSignificantLevel *= 0.85;
        }
        
        // Use the held level if we're in hold mode, otherwise use current
        const displayLevel = levelHoldTime > 0 ? lastSignificantLevel : currentLevel;
        
        // Apply longer smoothing for visual stability
        const smoothingFactor = 0.2; // Slower transitions
        
        setAudioLevel(prevLevel => {
          return prevLevel * (1 - smoothingFactor) + displayLevel * smoothingFactor;
        });
        
        animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
      };
      
      updateAudioLevel();
    } catch (error) {
      // Silently handle errors and reset audio level
      setAudioLevel(0);
    }
  }, []);

  const stopMonitoring = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
    
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    analyserRef.current = null;
    setAudioLevel(0);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (sourceRef.current) {
        sourceRef.current.disconnect();
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    };
  }, []);

  return {
    audioLevel,
    startMonitoring,
    stopMonitoring
  };
} 