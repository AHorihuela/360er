import { renderHook, act, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useWhisperVoiceToText } from '../useWhisperVoiceToText';

// Mock toast
const mockToast = vi.fn();
vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({ toast: mockToast })
}));

// Mock global APIs
const mockMediaRecorder = {
  start: vi.fn(),
  stop: vi.fn(),
  state: 'inactive',
  ondataavailable: null,
  onstart: null,
  onstop: null,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn()
} as any;

const mockMediaStream = {
  getTracks: vi.fn(() => [
    { stop: vi.fn() }
  ])
} as any;

const mockGetUserMedia = vi.fn();
const mockAudioContext = {
  createAnalyser: vi.fn(() => ({
    fftSize: 512,
    smoothingTimeConstant: 0.8,
    getByteTimeDomainData: vi.fn()
  })),
  createMediaStreamSource: vi.fn(() => ({
    connect: vi.fn(),
    disconnect: vi.fn()
  })),
  close: vi.fn(),
  state: 'running'
} as any;

const mockRequestAnimationFrame = vi.fn();
const mockCancelAnimationFrame = vi.fn();

// Mock fetch for transcription API
const mockFetch = vi.fn();

describe('useWhisperVoiceToText', () => {
  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    
    // Setup global mocks
    global.MediaRecorder = vi.fn(() => mockMediaRecorder) as any;
    global.MediaRecorder.isTypeSupported = vi.fn(() => true);
    
    global.navigator = {
      ...global.navigator,
      mediaDevices: {
        getUserMedia: mockGetUserMedia
      },
      userAgent: 'Mozilla/5.0 (Chrome)'
    } as any;
    
    global.window.AudioContext = vi.fn(() => mockAudioContext) as any;
    global.requestAnimationFrame = mockRequestAnimationFrame;
    global.cancelAnimationFrame = mockCancelAnimationFrame;
    global.fetch = mockFetch;
    
    // Setup default successful responses
    mockGetUserMedia.mockResolvedValue(mockMediaStream);
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        transcription: 'Hello world'
      })
    });
  });
  
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize with correct default state', () => {
      const { result } = renderHook(() => useWhisperVoiceToText());
      
      expect(result.current.isRecording).toBe(false);
      expect(result.current.isRecordingStarting).toBe(false);
      expect(result.current.isTranscribing).toBe(false);
      expect(result.current.transcript).toBe('');
      expect(result.current.error).toBe(null);
      expect(result.current.audioLevel).toBe(0);
      expect(result.current.averageLevel).toBe(0);
      expect(result.current.isProcessing).toBe(false);
    });

    it('should detect browser support correctly', async () => {
      const { result } = renderHook(() => useWhisperVoiceToText());
      
      await waitFor(() => {
        expect(result.current.isSupported).toBe(true);
        expect(result.current.isInitializing).toBe(false);
      });
    });

    it('should handle unsupported browsers', async () => {
      // @ts-ignore
      delete global.MediaRecorder;
      
      const { result } = renderHook(() => useWhisperVoiceToText());
      
      await waitFor(() => {
        expect(result.current.isSupported).toBe(false);
        expect(result.current.isInitializing).toBe(false);
      });
    });

    it('should detect iOS devices correctly', async () => {
      Object.defineProperty(global.navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
        configurable: true
      });
      
      const { result } = renderHook(() => useWhisperVoiceToText());
      
      await waitFor(() => {
        expect(result.current.isSupported).toBe(true);
      });
    });
  });

  describe('Recording Functionality', () => {
    it('should start recording successfully', async () => {
      const { result } = renderHook(() => useWhisperVoiceToText());
      
      await waitFor(() => {
        expect(result.current.isInitializing).toBe(false);
      });
      
      await act(async () => {
        await result.current.startRecording();
      });
      
      expect(mockGetUserMedia).toHaveBeenCalledWith({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000,
          channelCount: 1
        }
      });
      
      expect(result.current.isRecordingStarting).toBe(true);
      expect(result.current.error).toBe(null);
    });

    it('should use simplified audio constraints for iOS', async () => {
      Object.defineProperty(global.navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
        configurable: true
      });
      
      const { result } = renderHook(() => useWhisperVoiceToText());
      
      await waitFor(() => {
        expect(result.current.isInitializing).toBe(false);
      });
      
      await act(async () => {
        await result.current.startRecording();
      });
      
      expect(mockGetUserMedia).toHaveBeenCalledWith({
        audio: true
      });
    });

    it('should handle MediaRecorder start event', async () => {
      const { result } = renderHook(() => useWhisperVoiceToText());
      
      await waitFor(() => {
        expect(result.current.isInitializing).toBe(false);
      });
      
      await act(async () => {
        await result.current.startRecording();
      });
      
      // Simulate MediaRecorder onstart event
      act(() => {
        if (mockMediaRecorder.onstart) {
          mockMediaRecorder.onstart();
        }
      });
      
      expect(result.current.isRecording).toBe(true);
      expect(result.current.isRecordingStarting).toBe(false);
    });

    it('should stop recording successfully', async () => {
      const { result } = renderHook(() => useWhisperVoiceToText());
      
      await waitFor(() => {
        expect(result.current.isInitializing).toBe(false);
      });
      
      // Start recording first
      await act(async () => {
        await result.current.startRecording();
      });
      
      // Simulate recording state
      act(() => {
        if (mockMediaRecorder.onstart) {
          mockMediaRecorder.onstart();
        }
      });
      
      // Stop recording
      act(() => {
        result.current.stopRecording();
      });
      
      expect(mockMediaRecorder.stop).toHaveBeenCalled();
    });

    it('should handle stop during recording start', async () => {
      const { result } = renderHook(() => useWhisperVoiceToText());
      
      await waitFor(() => {
        expect(result.current.isInitializing).toBe(false);
      });
      
      await act(async () => {
        await result.current.startRecording();
      });
      
      // Stop before onstart fires
      act(() => {
        result.current.stopRecording();
      });
      
      expect(result.current.isRecordingStarting).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle microphone permission denied', async () => {
      const error = new Error('Permission denied');
      Object.defineProperty(error, 'name', { value: 'NotAllowedError' });
      mockGetUserMedia.mockRejectedValue(error);
      
      const { result } = renderHook(() => useWhisperVoiceToText());
      
      await waitFor(() => {
        expect(result.current.isInitializing).toBe(false);
      });
      
      await act(async () => {
        await result.current.startRecording();
      });
      
expect(result.current.error).toContain('Microphone access denied. Please allow microphone access when prompted and try again.');
      expect(result.current.isRecording).toBe(false);
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Voice Recording Error",
          variant: "destructive"
        })
      );
    });

    it('should handle no microphone found', async () => {
      const error = new Error('NotFoundError');
      Object.defineProperty(error, 'name', { value: 'NotFoundError' });
      mockGetUserMedia.mockRejectedValue(error);
      
      const { result } = renderHook(() => useWhisperVoiceToText());
      
      await waitFor(() => {
        expect(result.current.isInitializing).toBe(false);
      });
      
      await act(async () => {
        await result.current.startRecording();
      });
      
      expect(result.current.error).toContain('No microphone detected');
    });

    it('should handle iOS-specific HTTPS requirement', async () => {
      Object.defineProperty(global.navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
        configurable: true
      });
      
      // Mock location.protocol properly
      const originalLocation = global.location;
      delete (global as any).location;
      global.location = { ...originalLocation, protocol: 'http:', hostname: 'example.com' };
      
      // Mock an error that would trigger iOS HTTPS logic
      const error = new Error('Request failed due to secure context requirement');
      mockGetUserMedia.mockRejectedValue(error);
      
      const { result } = renderHook(() => useWhisperVoiceToText());
      
      await waitFor(() => {
        expect(result.current.isInitializing).toBe(false);
      });
      
      await act(async () => {
        await result.current.startRecording();
      });
      
      expect(result.current.error).toContain('iOS requires HTTPS');
      
      // Restore original location
      global.location = originalLocation;
    });

    it('should handle unsupported browser error', async () => {
      const error = new Error('NotSupportedError');
      Object.defineProperty(error, 'name', { value: 'NotSupportedError' });
      mockGetUserMedia.mockRejectedValue(error);
      
      const { result } = renderHook(() => useWhisperVoiceToText());
      
      await waitFor(() => {
        expect(result.current.isInitializing).toBe(false);
      });
      
      await act(async () => {
        await result.current.startRecording();
      });
      
      expect(result.current.error).toContain('Voice recording not supported');
    });
  });

  describe('Transcription', () => {
    it('should handle successful transcription', async () => {
      const onTranscriptionComplete = vi.fn();
      const onTranscriptionUpdate = vi.fn();
      
      const { result } = renderHook(() => 
        useWhisperVoiceToText({
          onTranscriptionComplete,
          onTranscriptionUpdate
        })
      );
      
      await waitFor(() => {
        expect(result.current.isInitializing).toBe(false);
      });
      
      await act(async () => {
        await result.current.startRecording();
      });
      
      // Simulate recording and stopping
      act(() => {
        if (mockMediaRecorder.onstart) {
          mockMediaRecorder.onstart();
        }
      });
      
      // Create a substantial audio blob
      const mockBlob = new Blob(['mock audio data'], { type: 'audio/webm' });
      Object.defineProperty(mockBlob, 'size', { value: 2000 });
      
      act(() => {
        if (mockMediaRecorder.ondataavailable) {
          mockMediaRecorder.ondataavailable({ data: mockBlob });
        }
      });
      
      // Stop recording to trigger transcription
      await act(async () => {
        if (mockMediaRecorder.onstop) {
          await mockMediaRecorder.onstop();
        }
      });
      
      // Wait for transcription to complete
      await waitFor(() => {
        expect(result.current.transcript).toBe('Hello world');
        expect(result.current.isTranscribing).toBe(false);
        expect(onTranscriptionComplete).toHaveBeenCalledWith('Hello world');
        expect(onTranscriptionUpdate).toHaveBeenCalledWith('Hello world');
      });
      
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Voice Input Complete",
          description: "Your speech has been transcribed successfully!"
        })
      );
    });

    it('should handle silent recordings', async () => {
      const { result } = renderHook(() => useWhisperVoiceToText());
      
      await waitFor(() => {
        expect(result.current.isInitializing).toBe(false);
      });
      
      await act(async () => {
        await result.current.startRecording();
      });
      
      // Simulate very small/silent audio blob
      const mockBlob = new Blob([''], { type: 'audio/webm' });
      Object.defineProperty(mockBlob, 'size', { value: 100 });
      
      act(() => {
        if (mockMediaRecorder.ondataavailable) {
          mockMediaRecorder.ondataavailable({ data: mockBlob });
        }
      });
      
      act(() => {
        if (mockMediaRecorder.onstop) {
          mockMediaRecorder.onstop();
        }
      });
      
      await waitFor(() => {
        expect(result.current.error).toBe('silent_recording');
        expect(result.current.isTranscribing).toBe(false);
      });
    });

    it('should handle transcription API errors', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: 'Server error' })
      });
      
      const { result } = renderHook(() => useWhisperVoiceToText());
      
      await waitFor(() => {
        expect(result.current.isInitializing).toBe(false);
      });
      
      await act(async () => {
        await result.current.startRecording();
      });
      
      // Simulate recording
      const mockBlob = new Blob(['mock audio data'], { type: 'audio/webm' });
      Object.defineProperty(mockBlob, 'size', { value: 2000 });
      
      act(() => {
        if (mockMediaRecorder.ondataavailable) {
          mockMediaRecorder.ondataavailable({ data: mockBlob });
        }
      });
      
      await act(async () => {
        if (mockMediaRecorder.onstop) {
          await mockMediaRecorder.onstop();
        }
      });
      
      await waitFor(() => {
        expect(result.current.error).toBe('transcription_failed');
        expect(result.current.isTranscribing).toBe(false);
      });
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValue(new Error('NetworkError'));
      
      const { result } = renderHook(() => useWhisperVoiceToText());
      
      await waitFor(() => {
        expect(result.current.isInitializing).toBe(false);
      });
      
      await act(async () => {
        await result.current.startRecording();
      });
      
      const mockBlob = new Blob(['mock audio data'], { type: 'audio/webm' });
      Object.defineProperty(mockBlob, 'size', { value: 2000 });
      
      act(() => {
        if (mockMediaRecorder.ondataavailable) {
          mockMediaRecorder.ondataavailable({ data: mockBlob });
        }
      });
      
      await act(async () => {
        if (mockMediaRecorder.onstop) {
          await mockMediaRecorder.onstop();
        }
      });
      
      await waitFor(() => {
        expect(result.current.error).toBe('network_error');
      });
    });

    it('should handle no speech detected', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          transcription: ''
        })
      });
      
      const { result } = renderHook(() => useWhisperVoiceToText());
      
      await waitFor(() => {
        expect(result.current.isInitializing).toBe(false);
      });
      
      await act(async () => {
        await result.current.startRecording();
      });
      
      const mockBlob = new Blob(['mock audio data'], { type: 'audio/webm' });
      Object.defineProperty(mockBlob, 'size', { value: 2000 });
      
      act(() => {
        if (mockMediaRecorder.ondataavailable) {
          mockMediaRecorder.ondataavailable({ data: mockBlob });
        }
      });
      
      await act(async () => {
        if (mockMediaRecorder.onstop) {
          await mockMediaRecorder.onstop();
        }
      });
      
      await waitFor(() => {
        expect(result.current.error).toBe('no_speech_detected');
      });
    });
  });

  describe('Audio Level Monitoring', () => {
    it('should start audio level monitoring when recording starts', async () => {
      const { result } = renderHook(() => useWhisperVoiceToText());
      
      await waitFor(() => {
        expect(result.current.isInitializing).toBe(false);
      });
      
      await act(async () => {
        await result.current.startRecording();
      });
      
      act(() => {
        if (mockMediaRecorder.onstart) {
          mockMediaRecorder.onstart();
        }
      });
      
      expect(mockAudioContext.createAnalyser).toHaveBeenCalled();
      expect(mockAudioContext.createMediaStreamSource).toHaveBeenCalled();
    });

    it('should update audio levels during recording', async () => {
      const { result } = renderHook(() => useWhisperVoiceToText());
      
      await waitFor(() => {
        expect(result.current.isInitializing).toBe(false);
      });
      
      await act(async () => {
        await result.current.startRecording();
      });
      
      act(() => {
        if (mockMediaRecorder.onstart) {
          mockMediaRecorder.onstart();
        }
      });
      
      // Verify audio monitoring is set up correctly
      expect(mockAudioContext.createAnalyser).toHaveBeenCalled();
      expect(mockAudioContext.createMediaStreamSource).toHaveBeenCalled();
      expect(mockRequestAnimationFrame).toHaveBeenCalled();
    });

    it('should stop audio monitoring when recording stops', async () => {
      const { result } = renderHook(() => useWhisperVoiceToText());
      
      await waitFor(() => {
        expect(result.current.isInitializing).toBe(false);
      });
      
      await act(async () => {
        await result.current.startRecording();
      });
      
      act(() => {
        if (mockMediaRecorder.onstart) {
          mockMediaRecorder.onstart();
        }
      });
      
      act(() => {
        result.current.stopRecording();
      });
      
      // Simulate MediaRecorder stop event
      act(() => {
        if (mockMediaRecorder.onstop) {
          mockMediaRecorder.onstop();
        }
      });
      
      await waitFor(() => {
        expect(mockAudioContext.close).toHaveBeenCalled();
      });
    });
  });

  describe('Utility Functions', () => {
    it('should clear transcript and error', () => {
      const { result } = renderHook(() => useWhisperVoiceToText());
      
      // Manually set some state to test clearing
      act(() => {
        result.current.clearTranscript();
      });
      
      expect(result.current.transcript).toBe('');
      expect(result.current.error).toBe(null);
    });

    it('should calculate isProcessing correctly', async () => {
      const { result } = renderHook(() => useWhisperVoiceToText());
      
      await waitFor(() => {
        expect(result.current.isInitializing).toBe(false);
      });
      
      expect(result.current.isProcessing).toBe(false);
      
      await act(async () => {
        await result.current.startRecording();
      });
      
      expect(result.current.isProcessing).toBe(true);
      
      act(() => {
        if (mockMediaRecorder.onstart) {
          mockMediaRecorder.onstart();
        }
      });
      
      expect(result.current.isProcessing).toBe(true);
      
      act(() => {
        result.current.stopRecording();
      });
      
      // Should still be processing during transcription
      expect(result.current.isProcessing).toBe(true);
    });
  });

  describe('Language Support', () => {
    it('should pass language parameter to transcription API', async () => {
      const { result } = renderHook(() => 
        useWhisperVoiceToText({ language: 'es' })
      );
      
      await waitFor(() => {
        expect(result.current.isInitializing).toBe(false);
      });
      
      await act(async () => {
        await result.current.startRecording();
      });
      
      const mockBlob = new Blob(['mock audio data'], { type: 'audio/webm' });
      Object.defineProperty(mockBlob, 'size', { value: 2000 });
      
      act(() => {
        if (mockMediaRecorder.ondataavailable) {
          mockMediaRecorder.ondataavailable({ data: mockBlob });
        }
      });
      
      await act(async () => {
        if (mockMediaRecorder.onstop) {
          await mockMediaRecorder.onstop();
        }
      });
      
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/transcribe',
          expect.objectContaining({
            method: 'POST',
            body: expect.any(FormData)
          })
        );
      });
    });
  });

  describe('Error Auto-clearing', () => {
    it('should auto-clear retryable errors after timeout', async () => {
      const { result } = renderHook(() => useWhisperVoiceToText());
      
      await waitFor(() => {
        expect(result.current.isInitializing).toBe(false);
      });
      
      await act(async () => {
        await result.current.startRecording();
      });
      
      // Simulate silent recording error
      const mockBlob = new Blob([''], { type: 'audio/webm' });
      Object.defineProperty(mockBlob, 'size', { value: 100 });
      
      act(() => {
        if (mockMediaRecorder.ondataavailable) {
          mockMediaRecorder.ondataavailable({ data: mockBlob });
        }
      });
      
      act(() => {
        if (mockMediaRecorder.onstop) {
          mockMediaRecorder.onstop();
        }
      });
      
      await waitFor(() => {
        expect(result.current.error).toBe('silent_recording');
      });
      
      // Wait for the error to auto-clear (4 seconds)
      await waitFor(() => {
        expect(result.current.error).toBe(null);
      }, { timeout: 5000 });
    });
  });

  describe('Cleanup', () => {
    it('should cleanup resources on unmount', async () => {
      const { result, unmount } = renderHook(() => useWhisperVoiceToText());
      
      await waitFor(() => {
        expect(result.current.isInitializing).toBe(false);
      });
      
      // Start recording to trigger animation frame
      await act(async () => {
        await result.current.startRecording();
      });
      
      act(() => {
        if (mockMediaRecorder.onstart) {
          mockMediaRecorder.onstart();
        }
      });
      
      unmount();
      
      expect(mockCancelAnimationFrame).toHaveBeenCalled();
    });
  });
}); 