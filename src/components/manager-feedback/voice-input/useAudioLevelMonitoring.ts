import { useRef, useState, useCallback, useEffect } from 'react';

// Type declaration for webkit audio context
declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}

export function useAudioLevelMonitoring() {
  const [audioLevel, setAudioLevel] = useState(0);
  const [averageLevel, setAverageLevel] = useState(0); // For status messages
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
      
      // Optimized settings for better speech sensitivity
      analyserRef.current.fftSize = 2048; // Higher resolution for better detection
      analyserRef.current.smoothingTimeConstant = 0.85; // Balanced smoothing
      sourceRef.current.connect(analyserRef.current);
      
      // Use time domain data for better volume detection
      const dataArray = new Uint8Array(analyserRef.current.fftSize);
      let lastSignificantLevel = 0;
      let levelHoldTime = 0;
      
      // For status message stability - longer term averaging
      const statusHistorySize = 60; // 1 second at 60fps
      const statusHistory: number[] = [];
      
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
        
        // Improved sensitivity - much more responsive to normal speech
        const sensitivity = 8.0; // Doubled sensitivity for normal speech levels
        const currentLevel = Math.min(rms * sensitivity, 1);
        
        // Hold significant levels longer to avoid flickering in bars
        if (currentLevel > 0.05) { // Lower threshold for detection
          lastSignificantLevel = currentLevel;
          levelHoldTime = 6; // Reduced hold time for more responsiveness
        } else if (levelHoldTime > 0) {
          levelHoldTime--;
          // Gradually decay the held level
          lastSignificantLevel *= 0.9;
        }
        
        // Use the held level if we're in hold mode, otherwise use current
        const displayLevel = levelHoldTime > 0 ? lastSignificantLevel : currentLevel;
        
        // Apply shorter smoothing for more responsive bars
        const smoothingFactor = 0.3; // More responsive transitions
        
        setAudioLevel(prevLevel => {
          return prevLevel * (1 - smoothingFactor) + displayLevel * smoothingFactor;
        });
        
        // Long-term averaging for stable status messages
        statusHistory.push(currentLevel);
        if (statusHistory.length > statusHistorySize) {
          statusHistory.shift();
        }
        
        // Calculate average over the last second for status stability
        if (statusHistory.length >= 30) { // Wait for at least 0.5 seconds of data
          const recentAverage = statusHistory.slice(-30).reduce((sum, val) => sum + val, 0) / 30;
          setAverageLevel(recentAverage);
        }
        
        animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
      };
      
      updateAudioLevel();
    } catch (error) {
      // Silently handle errors and reset audio level
      setAudioLevel(0);
      setAverageLevel(0);
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
    setAverageLevel(0);
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
    averageLevel, // For stable status messages
    startMonitoring,
    stopMonitoring
  };
} 