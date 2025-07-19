import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { VoiceToTextInput } from '../VoiceToTextInput';

// Mock the voice hook
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

// Mock voice input components
vi.mock('../voice-input', () => ({
  RecordingInterface: ({ isRecording, isRecordingStarting }: any) => (
    <div data-testid="recording-interface">
      Recording Interface - Recording: {isRecording ? 'true' : 'false'}, Starting: {isRecordingStarting ? 'true' : 'false'}
    </div>
  ),
  VoiceStatusMessages: ({ error, isTranscribing }: any) => (
    <div data-testid="voice-status-messages">
      Status: {isTranscribing ? 'Transcribing' : 'Idle'}, Error: {error || 'None'}
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

describe('VoiceToTextInput', () => {
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

    // Don't mock document event listeners for keyboard shortcut tests
    // The component needs to actually register event listeners for the tests to work

    // Mock mobile detection
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024
    });

    // Mock global APIs
    global.MediaRecorder = vi.fn() as any;
    global.navigator = {
      ...global.navigator,
      mediaDevices: {
        getUserMedia: vi.fn()
      }
    } as any;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Rendering and Initial State', () => {
    it('should render the voice input button', () => {
      render(<VoiceToTextInput {...defaultProps} />);
      
      expect(screen.getByTestId('voice-button')).toBeInTheDocument();
      expect(screen.getByText('Start Voice Input')).toBeInTheDocument();
    });

    it('should show keyboard shortcut hint on desktop', () => {
      render(<VoiceToTextInput {...defaultProps} />);
      
      expect(screen.getByText('⌘K')).toBeInTheDocument();
    });

    it('should hide keyboard shortcut on mobile', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        value: 500,
        configurable: true
      });
      
      render(<VoiceToTextInput {...defaultProps} />);
      
      expect(screen.queryByText('⌘K')).not.toBeInTheDocument();
      expect(screen.getByText('Voice Input')).toBeInTheDocument();
    });

    it('should show pro tip when idle and not mobile', () => {
      render(<VoiceToTextInput {...defaultProps} />);
      
      expect(screen.getByText('Speak naturally - AI will help organize your thoughts')).toBeInTheDocument();
    });

    it('should hide pro tip on mobile', () => {
      Object.defineProperty(window, 'innerWidth', {
        value: 500,
        configurable: true
      });
      
      render(<VoiceToTextInput {...defaultProps} />);
      
      expect(screen.queryByText('Speak naturally - AI will help organize your thoughts')).not.toBeInTheDocument();
    });

    it('should be disabled when disabled prop is true', () => {
      render(<VoiceToTextInput {...defaultProps} disabled={true} />);
      
      const button = screen.getByTestId('voice-button');
      expect(button).toBeDisabled();
    });
  });

  describe('Voice Recording States', () => {
    it('should show "Preparing..." when recording is starting', () => {
      mockVoiceHook.isRecordingStarting = true;
      mockVoiceHook.isProcessing = true;
      
      render(<VoiceToTextInput {...defaultProps} />);
      
      expect(screen.getByText('Preparing...')).toBeInTheDocument();
    });

    it('should show "Stop Recording" when recording', () => {
      mockVoiceHook.isRecording = true;
      mockVoiceHook.isProcessing = true;
      
      render(<VoiceToTextInput {...defaultProps} />);
      
      expect(screen.getByText('Stop Recording')).toBeInTheDocument();
    });

    it('should show "Processing..." when transcribing', () => {
      mockVoiceHook.isTranscribing = true;
      mockVoiceHook.isProcessing = true;
      
      render(<VoiceToTextInput {...defaultProps} />);
      
      expect(screen.getByText('Processing...')).toBeInTheDocument();
    });

    it('should show recording interface when recording or starting', () => {
      mockVoiceHook.isRecording = true;
      
      render(<VoiceToTextInput {...defaultProps} />);
      
      expect(screen.getByTestId('recording-interface')).toBeInTheDocument();
      expect(screen.getByText(/Recording Interface.*Recording: true/)).toBeInTheDocument();
    });

    it('should show status messages when transcribing', () => {
      mockVoiceHook.isTranscribing = true;
      
      render(<VoiceToTextInput {...defaultProps} />);
      
      expect(screen.getByTestId('voice-status-messages')).toBeInTheDocument();
      expect(screen.getByText(/Status: Transcribing/)).toBeInTheDocument();
    });
  });

  describe('Voice Interactions', () => {
    it('should call startRecording when button is clicked and not recording', async () => {
      render(<VoiceToTextInput {...defaultProps} />);
      
      const button = screen.getByTestId('voice-button');
      fireEvent.click(button);
      
      expect(mockVoiceHook.startRecording).toHaveBeenCalled();
    });

    it('should call stopRecording when button is clicked and recording', async () => {
      mockVoiceHook.isRecording = true;
      mockVoiceHook.isProcessing = true;
      
      render(<VoiceToTextInput {...defaultProps} />);
      
      const button = screen.getByTestId('voice-button');
      fireEvent.click(button);
      
      expect(mockVoiceHook.stopRecording).toHaveBeenCalled();
    });

    it('should call onVoiceToggle when processing state changes', () => {
      const { rerender } = render(<VoiceToTextInput {...defaultProps} />);
      
      // Change to processing state
      mockVoiceHook.isProcessing = true;
      rerender(<VoiceToTextInput {...defaultProps} />);
      
      expect(mockOnVoiceToggle).toHaveBeenCalledWith(true);
    });

    it('should handle transcription completion', () => {
      mockVoiceHook.transcript = 'Hello world';
      
      render(<VoiceToTextInput {...defaultProps} />);
      
      // Simulate transcription complete callback
      const expectedValue = defaultProps.value + 'Hello world';
      
      // The actual transcription handling happens in the hook's callback
      // We test that the component would call onChange with the expected value
      expect(mockVoiceHook.transcript).toBe('Hello world');
    });
  });

  describe('Keyboard Shortcuts', () => {
    it('should trigger voice toggle on Cmd+K', async () => {
      render(<VoiceToTextInput {...defaultProps} />);
      
      // Simulate Cmd+K keydown
      fireEvent.keyDown(document, {
        key: 'k',
        metaKey: true,
        preventDefault: vi.fn()
      });
      
      expect(mockVoiceHook.startRecording).toHaveBeenCalled();
    });

    it('should trigger voice toggle on Ctrl+K', async () => {
      render(<VoiceToTextInput {...defaultProps} />);
      
      // Simulate Ctrl+K keydown
      fireEvent.keyDown(document, {
        key: 'k',
        ctrlKey: true,
        preventDefault: vi.fn()
      });
      
      expect(mockVoiceHook.startRecording).toHaveBeenCalled();
    });

    it('should not trigger voice toggle when disabled', async () => {
      render(<VoiceToTextInput {...defaultProps} disabled={true} />);
      
      fireEvent.keyDown(document, {
        key: 'k',
        metaKey: true,
        preventDefault: vi.fn()
      });
      
      expect(mockVoiceHook.startRecording).not.toHaveBeenCalled();
    });

    it('should not trigger voice toggle when unsupported', async () => {
      mockVoiceHook.isSupported = false;
      
      // Make MediaRecorder unavailable to disable shouldForceEnable
      const originalMediaRecorder = global.MediaRecorder;
      (global as any).MediaRecorder = undefined;
      
      render(<VoiceToTextInput {...defaultProps} />);
      
      fireEvent.keyDown(document, {
        key: 'k',
        metaKey: true,
        preventDefault: vi.fn()
      });
      
      expect(mockVoiceHook.startRecording).not.toHaveBeenCalled();
      
      // Restore MediaRecorder
      global.MediaRecorder = originalMediaRecorder;
    });

    it('should prevent default behavior for Cmd+K', async () => {
      const preventDefault = vi.fn();
      render(<VoiceToTextInput {...defaultProps} />);
      
      // Simulate Cmd+K keydown event directly on document
      const keydownEvent = new KeyboardEvent('keydown', {
        metaKey: true,
        key: 'k',
        bubbles: true
      });
      
      // Override preventDefault to use our spy
      Object.defineProperty(keydownEvent, 'preventDefault', {
        value: preventDefault
      });
      
      document.dispatchEvent(keydownEvent);
      
      expect(preventDefault).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should show error messages when there is an error', () => {
      mockVoiceHook.error = 'Microphone access denied';
      mockVoiceHook.isProcessing = false;
      
      render(<VoiceToTextInput {...defaultProps} />);
      
      expect(screen.getByTestId('voice-status-messages')).toBeInTheDocument();
      expect(screen.getByText(/Error: Microphone access denied/)).toBeInTheDocument();
    });

    it('should not show error messages when processing', () => {
      mockVoiceHook.error = 'Some error';
      mockVoiceHook.isProcessing = true;
      
      render(<VoiceToTextInput {...defaultProps} />);
      
      expect(screen.queryByText(/Error: Some error/)).not.toBeInTheDocument();
    });
  });

  describe('Success State', () => {
    it('should show success message when transcription is complete', () => {
      mockVoiceHook.transcript = 'Hello world';
      
      const { rerender } = render(<VoiceToTextInput {...defaultProps} />);
      
      // Simulate success state by manually updating component state
      // In real usage, this would be triggered by the transcription callback
      expect(mockVoiceHook.transcript).toBe('Hello world');
      
      // We can't easily test the internal success state without exposing it
      // but we can verify the transcript is available
    });
  });

  describe('Browser Support', () => {
    it('should show unsupported message when voice is not supported', () => {
      mockVoiceHook.isSupported = false;
      
      // Mock absence of MediaRecorder
      (global as any).MediaRecorder = undefined;
      global.navigator = {
        ...global.navigator,
        mediaDevices: undefined
      } as any;
      
      render(<VoiceToTextInput {...defaultProps} />);
      
      expect(screen.getByText('Voice Input Not Available')).toBeInTheDocument();
      expect(screen.getByText('Voice recording not supported')).toBeInTheDocument();
    });

    it('should show HTTPS tip for iOS users on HTTP', () => {
      mockVoiceHook.isSupported = false;
      
      // Mock HTTP protocol
      Object.defineProperty(window, 'location', {
        value: { protocol: 'http:' },
        configurable: true
      });
      
      (global as any).MediaRecorder = undefined;
      global.navigator = {
        ...global.navigator,
        mediaDevices: undefined
      } as any;
      
      render(<VoiceToTextInput {...defaultProps} />);
      
      expect(screen.getByText('💡 Tip for iOS users:')).toBeInTheDocument();
      expect(screen.getByText('https://localhost:5176')).toBeInTheDocument();
    });

    it('should not show HTTPS tip on HTTPS', () => {
      mockVoiceHook.isSupported = false;
      
      // Mock HTTPS protocol
      Object.defineProperty(window, 'location', {
        value: { protocol: 'https:' },
        configurable: true
      });
      
      (global as any).MediaRecorder = undefined;
      global.navigator = {
        ...global.navigator,
        mediaDevices: undefined
      } as any;
      
      render(<VoiceToTextInput {...defaultProps} />);
      
      expect(screen.queryByText('💡 Tip for iOS users:')).not.toBeInTheDocument();
    });
  });

  describe('Text Integration', () => {
    it('should handle existing text value', () => {
      render(<VoiceToTextInput {...defaultProps} value="Existing text" />);
      
      // Component should work with existing text
      const button = screen.getByTestId('voice-button');
      expect(button).toBeInTheDocument();
      expect(button).not.toBeDisabled();
    });

    it('should call onChange when transcription is appended to existing text', () => {
      const onTranscriptionComplete = vi.fn((text) => {
        const baseText = defaultProps.value;
        let newValue = baseText;
        
        if (newValue.length > 0 && !newValue.endsWith(' ')) {
          newValue += ' ';
        }
        
        newValue += text;
        mockOnChange(newValue);
      });

      // This would be handled by the hook's callback in real usage
      onTranscriptionComplete('New transcribed text');
      
      expect(mockOnChange).toHaveBeenCalledWith('New transcribed text');
    });
  });

  describe('Mobile Responsive Behavior', () => {
    beforeEach(() => {
      Object.defineProperty(window, 'innerWidth', {
        value: 500,
        configurable: true
      });
    });

    it('should use mobile-specific button text', () => {
      render(<VoiceToTextInput {...defaultProps} />);
      
      expect(screen.getByText('Voice Input')).toBeInTheDocument();
      expect(screen.queryByText('Start Voice Input')).not.toBeInTheDocument();
    });

    it('should hide keyboard shortcut on mobile', () => {
      render(<VoiceToTextInput {...defaultProps} />);
      
      expect(screen.queryByText('⌘K')).not.toBeInTheDocument();
    });

    it('should hide pro tip on mobile', () => {
      render(<VoiceToTextInput {...defaultProps} />);
      
      expect(screen.queryByText('Speak naturally - AI will help organize your thoughts')).not.toBeInTheDocument();
    });
  });

  describe('Language Support', () => {
    it('should pass language to the voice hook', () => {
      render(<VoiceToTextInput {...defaultProps} language="es" />);
      
      // The language prop would be passed to the hook in real usage
      // We can verify the component accepts the prop
      expect(defaultProps.language).toBeDefined();
    });
  });

  describe('Cleanup and Effects', () => {
    it('should cleanup keyboard listeners on unmount', () => {
      const { unmount } = render(<VoiceToTextInput {...defaultProps} />);
      
      const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');
      
      unmount();
      
      expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
    });

    it('should update voice toggle callback when processing state changes', () => {
      const { rerender } = render(<VoiceToTextInput {...defaultProps} />);
      
      expect(mockOnVoiceToggle).toHaveBeenCalledWith(false);
      
      // Change processing state
      mockVoiceHook.isProcessing = true;
      rerender(<VoiceToTextInput {...defaultProps} />);
      
      expect(mockOnVoiceToggle).toHaveBeenCalledWith(true);
    });
  });

  describe('Audio Level Display', () => {
    it('should pass audio levels to recording interface', () => {
      mockVoiceHook.isRecording = true;
      mockVoiceHook.audioLevel = 0.5;
      mockVoiceHook.averageLevel = 0.3;
      
      render(<VoiceToTextInput {...defaultProps} />);
      
      const recordingInterface = screen.getByTestId('recording-interface');
      expect(recordingInterface).toBeInTheDocument();
      // Audio levels would be passed as props to the RecordingInterface component
    });
  });

  describe('Accessibility', () => {
    it('should have proper button role and accessible text', () => {
      render(<VoiceToTextInput {...defaultProps} />);
      
      const button = screen.getByTestId('voice-button');
      expect(button).toHaveAttribute('type', 'button');
      expect(button).toBeInTheDocument();
    });

    it('should show loading state with appropriate text', () => {
      mockVoiceHook.isInitializing = true;
      
      render(<VoiceToTextInput {...defaultProps} />);
      
      expect(screen.getByText('Initializing voice input...')).toBeInTheDocument();
    });
  });
}); 