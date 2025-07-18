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
      
      // Optimized settings for volume detection
      analyserRef.current.fftSize = 512;
      analyserRef.current.smoothingTimeConstant = 0.8;
      sourceRef.current.connect(analyserRef.current);
      
      // Use time domain data for better volume detection
      const dataArray = new Uint8Array(analyserRef.current.fftSize);
      
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
        
        // Apply sensitivity boost and smoothing
        const sensitivity = 3.5; // Increased sensitivity
        const boostedLevel = Math.min(rms * sensitivity, 1);
        
        // Smooth the level changes for better visual feedback
        const smoothingFactor = 0.3;
        const currentLevel = boostedLevel;
        const smoothedLevel = audioLevel * (1 - smoothingFactor) + currentLevel * smoothingFactor;
        
        setAudioLevel(smoothedLevel);
        animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
      };
      
      updateAudioLevel();
    } catch (error) {
      console.error('Error setting up audio level monitoring:', error);
      setAudioLevel(0);
    }
  }, [audioLevel]);

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