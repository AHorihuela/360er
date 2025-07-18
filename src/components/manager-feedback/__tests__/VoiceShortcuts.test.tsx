import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { VoiceToTextInput } from '../VoiceToTextInput';

// Mock the voice hook with more detailed state
const mockVoiceHook = {
  isRecording: false,
  isRecordingStarting: false,
  isTranscribing: false,
  isSupported: true,
  transcript: '',
  error: null as string | null,
  isInitializing: false,
  isProcessing: false,
  audioLevel: 0,
  averageLevel: 0,
  startRecording: vi.fn(),
  stopRecording: vi.fn(),
  clearTranscript: vi.fn()
};

vi.mock('@/hooks/useWhisperVoiceToText', () => ({
  useWhisperVoiceToText: () => mockVoiceHook
}));

// Mock voice input components with more detailed implementations
vi.mock('../voice-input', () => ({
  RecordingInterface: ({ isRecording, error }: any) => (
    <div data-testid="recording-interface">
      {isRecording ? 'Recording Active' : 'Recording Inactive'}
      {error && <div data-testid="recording-error">{error}</div>}
    </div>
  ),
  VoiceStatusMessages: ({ error, isTranscribing }: any) => (
    <div data-testid="voice-status-messages">
      {isTranscribing && <div data-testid="transcribing">Transcribing...</div>}
      {error && <div data-testid="status-error">{error}</div>}
    </div>
  )
}));

// Mock UI components
vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, className, ...props }: any) => (
    <button 
      onClick={onClick} 
      disabled={disabled} 
      className={className}
      data-testid="voice-button"
      {...props}
    >
      {children}
    </button>
  )
}));

vi.mock('@/components/ui/tooltip', () => ({
  TooltipProvider: ({ children }: any) => <div>{children}</div>,
  Tooltip: ({ children }: any) => <div>{children}</div>,
  TooltipTrigger: ({ children }: any) => <div>{children}</div>,
  TooltipContent: ({ children }: any) => <div data-testid="tooltip-content">{children}</div>
}));

vi.mock('@/lib/utils', () => ({
  cn: (...args: any[]) => args.filter(Boolean).join(' ')
}));

describe('Voice Shortcuts and Error Handling', () => {
  const mockOnChange = vi.fn();
  const mockOnVoiceToggle = vi.fn();

  const defaultProps = {
    value: '',
    onChange: mockOnChange,
    onVoiceToggle: mockOnVoiceToggle,
    disabled: false,
    className: '',
    language: 'en'
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset mock hook to default state
    Object.assign(mockVoiceHook, {
      isRecording: false,
      isRecordingStarting: false,
      isTranscribing: false,
      isSupported: true,
      transcript: '',
      error: null,
      isInitializing: false,
      isProcessing: false,
      audioLevel: 0,
      averageLevel: 0
    });

    // Mock navigator and MediaRecorder
    global.MediaRecorder = vi.fn() as any;
    global.navigator = {
      ...global.navigator,
      mediaDevices: {
        getUserMedia: vi.fn()
      }
    } as any;

    // Mock addEventListener/removeEventListener for document
    const mockAddEventListener = vi.fn();
    const mockRemoveEventListener = vi.fn();
    
    Object.defineProperty(document, 'addEventListener', {
      value: mockAddEventListener,
      configurable: true
    });
    
    Object.defineProperty(document, 'removeEventListener', {
      value: mockRemoveEventListener,
      configurable: true
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Keyboard Shortcuts (Cmd+K)', () => {
    it('should add keyboard event listener on mount', () => {
      render(<VoiceToTextInput {...defaultProps} />);
      
      expect(document.addEventListener).toHaveBeenCalledWith('keydown', expect.any(Function));
    });

    it('should remove keyboard event listener on unmount', () => {
      const { unmount } = render(<VoiceToTextInput {...defaultProps} />);
      
      unmount();
      
      expect(document.removeEventListener).toHaveBeenCalledWith('keydown', expect.any(Function));
    });

    it('should trigger startRecording on Cmd+K', () => {
      render(<VoiceToTextInput {...defaultProps} />);
      
      // Get the event handler that was registered
      const eventHandler = (document.addEventListener as any).mock.calls[0][1];
      
      // Simulate Cmd+K
      const mockEvent = {
        metaKey: true,
        key: 'k',
        preventDefault: vi.fn()
      };
      
      eventHandler(mockEvent);
      
      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(mockVoiceHook.startRecording).toHaveBeenCalled();
    });

    it('should trigger startRecording on Ctrl+K', () => {
      render(<VoiceToTextInput {...defaultProps} />);
      
      const eventHandler = (document.addEventListener as any).mock.calls[0][1];
      
      // Simulate Ctrl+K
      const mockEvent = {
        ctrlKey: true,
        key: 'k',
        preventDefault: vi.fn()
      };
      
      eventHandler(mockEvent);
      
      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(mockVoiceHook.startRecording).toHaveBeenCalled();
    });

    it('should not trigger when component is disabled', () => {
      render(<VoiceToTextInput {...defaultProps} disabled={true} />);
      
      const eventHandler = (document.addEventListener as any).mock.calls[0][1];
      
      const mockEvent = {
        metaKey: true,
        key: 'k',
        preventDefault: vi.fn()
      };
      
      eventHandler(mockEvent);
      
      expect(mockVoiceHook.startRecording).not.toHaveBeenCalled();
    });

    it('should not trigger when voice is not supported', () => {
      mockVoiceHook.isSupported = false;
      
      // Make MediaRecorder unavailable to disable shouldForceEnable
      const originalMediaRecorder = global.MediaRecorder;
      (global as any).MediaRecorder = undefined;
      
      render(<VoiceToTextInput {...defaultProps} />);
      
      const eventHandler = (document.addEventListener as any).mock.calls[0][1];
      
      const mockEvent = {
        metaKey: true,
        key: 'k',
        preventDefault: vi.fn()
      };
      
      eventHandler(mockEvent);
      
      expect(mockVoiceHook.startRecording).not.toHaveBeenCalled();
      
      // Restore MediaRecorder
      global.MediaRecorder = originalMediaRecorder;
    });

    it('should not trigger when component is initializing', () => {
      mockVoiceHook.isInitializing = true;
      
      render(<VoiceToTextInput {...defaultProps} />);
      
      const eventHandler = (document.addEventListener as any).mock.calls[0][1];
      
      const mockEvent = {
        metaKey: true,
        key: 'k',
        preventDefault: vi.fn()
      };
      
      eventHandler(mockEvent);
      
      expect(mockVoiceHook.startRecording).not.toHaveBeenCalled();
    });

    it('should ignore other key combinations', () => {
      render(<VoiceToTextInput {...defaultProps} />);
      
      const eventHandler = (document.addEventListener as any).mock.calls[0][1];
      
      // Test various other key combinations
      const testCases = [
        { metaKey: true, key: 'a' },
        { ctrlKey: true, key: 'c' },
        { key: 'k' }, // Just 'k' without modifier
        { altKey: true, key: 'k' },
        { shiftKey: true, key: 'k' }
      ];
      
      testCases.forEach(mockEvent => {
        const preventDefault = vi.fn();
        eventHandler({ ...mockEvent, preventDefault });
        
        expect(preventDefault).not.toHaveBeenCalled();
        expect(mockVoiceHook.startRecording).not.toHaveBeenCalled();
      });
    });

    it('should handle lowercase k key', () => {
      render(<VoiceToTextInput {...defaultProps} />);
      
      const eventHandler = (document.addEventListener as any).mock.calls[0][1];
      
      const preventDefault = vi.fn();
      const mockEvent = { metaKey: true, key: 'k', preventDefault };
      
      eventHandler(mockEvent);
      
      expect(preventDefault).toHaveBeenCalled();
      expect(mockVoiceHook.startRecording).toHaveBeenCalled();
    });
  });

  describe('Error Handling Scenarios', () => {
    it('should display microphone permission denied error', () => {
      mockVoiceHook.error = 'Microphone access denied. Please allow microphone access when prompted and try again.';
      mockVoiceHook.isProcessing = false;
      
      render(<VoiceToTextInput {...defaultProps} />);
      
      expect(screen.getByTestId('voice-status-messages')).toBeInTheDocument();
      expect(screen.getByTestId('status-error')).toHaveTextContent('Microphone access denied');
    });

    it('should display no microphone found error', () => {
      mockVoiceHook.error = 'No microphone detected. Please connect a microphone and try again.';
      mockVoiceHook.isProcessing = false;
      
      render(<VoiceToTextInput {...defaultProps} />);
      
      expect(screen.getByTestId('status-error')).toHaveTextContent('No microphone detected');
    });

    it('should display browser not supported error', () => {
      mockVoiceHook.error = 'Voice recording not supported in this browser.';
      mockVoiceHook.isProcessing = false;
      
      render(<VoiceToTextInput {...defaultProps} />);
      
      expect(screen.getByTestId('status-error')).toHaveTextContent('Voice recording not supported');
    });

    it('should display iOS HTTPS requirement error', () => {
      mockVoiceHook.error = 'iOS requires HTTPS for microphone access';
      mockVoiceHook.isProcessing = false;
      
      render(<VoiceToTextInput {...defaultProps} />);
      
      expect(screen.getByTestId('status-error')).toHaveTextContent('iOS requires HTTPS');
    });

    it('should display transcription failed error', () => {
      mockVoiceHook.error = 'transcription_failed';
      mockVoiceHook.isProcessing = false;
      
      render(<VoiceToTextInput {...defaultProps} />);
      
      expect(screen.getByTestId('status-error')).toHaveTextContent('transcription_failed');
    });

    it('should display network error', () => {
      mockVoiceHook.error = 'network_error';
      mockVoiceHook.isProcessing = false;
      
      render(<VoiceToTextInput {...defaultProps} />);
      
      expect(screen.getByTestId('status-error')).toHaveTextContent('network_error');
    });

    it('should display silent recording error', () => {
      mockVoiceHook.error = 'silent_recording';
      mockVoiceHook.isProcessing = false;
      
      render(<VoiceToTextInput {...defaultProps} />);
      
      expect(screen.getByTestId('status-error')).toHaveTextContent('silent_recording');
    });

    it('should display no speech detected error', () => {
      mockVoiceHook.error = 'no_speech_detected';
      mockVoiceHook.isProcessing = false;
      
      render(<VoiceToTextInput {...defaultProps} />);
      
      expect(screen.getByTestId('status-error')).toHaveTextContent('no_speech_detected');
    });

    it('should not display errors when processing', () => {
      mockVoiceHook.error = 'Some error message';
      mockVoiceHook.isProcessing = true;
      
      render(<VoiceToTextInput {...defaultProps} />);
      
      // Should not show error messages during processing
      expect(screen.queryByTestId('status-error')).not.toBeInTheDocument();
    });

    it('should handle rate limit error', () => {
      mockVoiceHook.error = 'rate_limit';
      mockVoiceHook.isProcessing = false;
      
      render(<VoiceToTextInput {...defaultProps} />);
      
      expect(screen.getByTestId('status-error')).toHaveTextContent('rate_limit');
    });

    it('should handle file too large error', () => {
      mockVoiceHook.error = 'file_too_large';
      mockVoiceHook.isProcessing = false;
      
      render(<VoiceToTextInput {...defaultProps} />);
      
      expect(screen.getByTestId('status-error')).toHaveTextContent('file_too_large');
    });

    it('should handle invalid audio error', () => {
      mockVoiceHook.error = 'invalid_audio';
      mockVoiceHook.isProcessing = false;
      
      render(<VoiceToTextInput {...defaultProps} />);
      
      expect(screen.getByTestId('status-error')).toHaveTextContent('invalid_audio');
    });
  });

  describe('Browser Support Detection', () => {
    it('should show unsupported browser message when APIs are missing', () => {
      mockVoiceHook.isSupported = false;
      
      // Mock missing APIs
      (global as any).MediaRecorder = undefined;
      global.navigator = {} as any;
      
      render(<VoiceToTextInput {...defaultProps} />);
      
      expect(screen.getByText('Voice Input Not Available')).toBeInTheDocument();
      expect(screen.getByText('Voice recording not supported')).toBeInTheDocument();
    });

    it('should show HTTPS requirement for iOS on HTTP', () => {
      mockVoiceHook.isSupported = false;
      
      // Mock HTTP location
      Object.defineProperty(window, 'location', {
        value: { protocol: 'http:' },
        configurable: true
      });
      
      (global as any).MediaRecorder = undefined;
      global.navigator = {} as any;
      
      render(<VoiceToTextInput {...defaultProps} />);
      
      expect(screen.getByText('💡 Tip for iOS users:')).toBeInTheDocument();
      expect(screen.getByText('https://localhost:5176')).toBeInTheDocument();
    });

    it('should handle emergency override for iOS', () => {
      // Mock iOS device
      Object.defineProperty(global.navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
        configurable: true
      });
      
      // Mock basic APIs present
      global.MediaRecorder = vi.fn() as any;
      global.navigator = {
        ...global.navigator,
        mediaDevices: {
          getUserMedia: vi.fn()
        }
      } as any;
      
      mockVoiceHook.isSupported = true;
      
      render(<VoiceToTextInput {...defaultProps} />);
      
      // Should render normally for iOS with basic APIs
      expect(screen.getByTestId('voice-button')).toBeInTheDocument();
      expect(screen.queryByText('Voice Input Not Available')).not.toBeInTheDocument();
    });
  });

  describe('Loading and Initialization States', () => {
    it('should show loading state when initializing', () => {
      mockVoiceHook.isInitializing = true;
      
      render(<VoiceToTextInput {...defaultProps} />);
      
      expect(screen.getByText('Initializing voice input...')).toBeInTheDocument();
    });

    it('should show proper button states for different recording phases', () => {
      // Test recording starting
      mockVoiceHook.isRecordingStarting = true;
      mockVoiceHook.isProcessing = true;
      
      const { rerender } = render(<VoiceToTextInput {...defaultProps} />);
      
      expect(screen.getByText('Preparing...')).toBeInTheDocument();
      
      // Test active recording
      mockVoiceHook.isRecordingStarting = false;
      mockVoiceHook.isRecording = true;
      mockVoiceHook.isProcessing = true;
      
      rerender(<VoiceToTextInput {...defaultProps} />);
      
      expect(screen.getByText('Stop Recording')).toBeInTheDocument();
      
      // Test transcribing
      mockVoiceHook.isRecording = false;
      mockVoiceHook.isTranscribing = true;
      mockVoiceHook.isProcessing = true;
      
      rerender(<VoiceToTextInput {...defaultProps} />);
      
      expect(screen.getByText('Processing...')).toBeInTheDocument();
    });
  });

  describe('Voice Toggle Functionality', () => {
    it('should toggle between start and stop recording', async () => {
      const { rerender } = render(<VoiceToTextInput {...defaultProps} />);
      
      const button = screen.getByTestId('voice-button');
      
      // Initially should start recording
      fireEvent.click(button);
      expect(mockVoiceHook.startRecording).toHaveBeenCalled();
      
      // Mock recording state
      mockVoiceHook.isRecording = true;
      mockVoiceHook.isProcessing = true;
      
      rerender(<VoiceToTextInput {...defaultProps} />);
      
      // Now should stop recording
      fireEvent.click(button);
      expect(mockVoiceHook.stopRecording).toHaveBeenCalled();
    });

    it('should handle stop during recording start phase', async () => {
      mockVoiceHook.isRecordingStarting = true;
      mockVoiceHook.isRecording = true; // Need this for the stop logic to trigger
      mockVoiceHook.isProcessing = true;
      
      render(<VoiceToTextInput {...defaultProps} />);
      
      const button = screen.getByTestId('voice-button');
      fireEvent.click(button);
      
      expect(mockVoiceHook.stopRecording).toHaveBeenCalled();
    });
  });

  describe('Mobile Detection and Responsive Behavior', () => {
    it('should detect mobile viewport', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        value: 500,
        configurable: true
      });
      
      render(<VoiceToTextInput {...defaultProps} />);
      
      // Mobile detection affects button text and keyboard shortcuts
      expect(screen.queryByText('⌘K')).not.toBeInTheDocument();
    });

    it('should show desktop features on wider viewport', () => {
      // Mock desktop viewport
      Object.defineProperty(window, 'innerWidth', {
        value: 1200,
        configurable: true
      });
      
      render(<VoiceToTextInput {...defaultProps} />);
      
      expect(screen.getByText('⌘K')).toBeInTheDocument();
    });
  });

  describe('Voice Mode Integration', () => {
    it('should call onVoiceToggle callback when processing state changes', () => {
      const { rerender } = render(<VoiceToTextInput {...defaultProps} />);
      
      // Should initially call with false
      expect(mockOnVoiceToggle).toHaveBeenCalledWith(false);
      
      // Change to processing
      mockVoiceHook.isProcessing = true;
      rerender(<VoiceToTextInput {...defaultProps} />);
      
      expect(mockOnVoiceToggle).toHaveBeenCalledWith(true);
      
      // Change back to not processing
      mockVoiceHook.isProcessing = false;
      rerender(<VoiceToTextInput {...defaultProps} />);
      
      expect(mockOnVoiceToggle).toHaveBeenCalledWith(false);
    });
  });

  describe('Error Recovery', () => {
    it('should clear error when starting new recording attempt', () => {
      mockVoiceHook.error = 'Previous error';
      mockVoiceHook.isProcessing = false;
      
      const { rerender } = render(<VoiceToTextInput {...defaultProps} />);
      
      expect(screen.getByTestId('status-error')).toBeInTheDocument();
      
      // Start new recording (this should clear error)
      mockVoiceHook.error = null;
      mockVoiceHook.isRecordingStarting = true;
      mockVoiceHook.isProcessing = true;
      
      rerender(<VoiceToTextInput {...defaultProps} />);
      
      expect(screen.queryByTestId('status-error')).not.toBeInTheDocument();
    });

    it('should allow retry after error', () => {
      mockVoiceHook.error = 'Some error';
      mockVoiceHook.isProcessing = false;
      
      const { rerender } = render(<VoiceToTextInput {...defaultProps} />);
      
      // Error should be displayed
      expect(screen.getByTestId('status-error')).toBeInTheDocument();
      
      // Button should still be clickable for retry
      const button = screen.getByTestId('voice-button');
      expect(button).not.toBeDisabled();
      
      // Clicking should attempt to start recording again
      fireEvent.click(button);
      expect(mockVoiceHook.startRecording).toHaveBeenCalled();
    });
  });
}); 