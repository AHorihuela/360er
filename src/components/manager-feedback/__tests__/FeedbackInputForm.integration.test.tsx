import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FeedbackInputForm } from '../FeedbackInputForm';
import { VoiceToTextInput } from '../VoiceToTextInput';

// Mock hooks
const mockSubmitManagerFeedback = vi.fn().mockResolvedValue(true);
const mockUseManagerFeedback = {
  submitManagerFeedback: mockSubmitManagerFeedback,
  isSubmitting: false
};

const mockUser = {
  id: 'user-123',
  email: 'manager@test.com'
};

const mockToast = vi.fn();

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: mockUser })
}));

vi.mock('@/hooks/useManagerFeedback', () => ({
  useManagerFeedback: () => mockUseManagerFeedback
}));

vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({ toast: mockToast })
}));

// Mock voice functionality
const mockVoiceHook = {
  isRecording: false,
  isRecordingStarting: false,
  isTranscribing: false,
  isSupported: true,
  transcript: '',
  error: null,
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

let mockVoiceActive = false;

vi.mock('../VoiceToTextInput', () => ({
  VoiceToTextInput: vi.fn(({ value, onChange, onVoiceToggle, disabled }: any) => {
    const handleVoiceClick = () => {
      if (!mockVoiceActive) {
        // Start voice mode
        mockVoiceActive = true;
        onVoiceToggle?.(true);
        
        // Add voice content after a brief delay to simulate recording
        setTimeout(() => {
          const newText = value + ' Voice input added';
          onChange(newText);
          // Keep voice mode active for testing
        }, 10);
      } else {
        // Stop voice mode
        mockVoiceActive = false;
        onVoiceToggle?.(false);
      }
    };

    return (
      <div data-testid="voice-to-text-input">
        <button 
          data-testid="voice-button" 
          onClick={handleVoiceClick}
          disabled={disabled}
        >
          {mockVoiceActive ? 'Stop Voice Input' : 'Start Voice Input'}
        </button>
        <div data-testid="voice-status">
          {disabled ? 'Voice Disabled' : 'Voice Enabled'}
        </div>
        {mockVoiceActive && (
          <div data-testid="voice-active-indicator">Voice input active</div>
        )}
      </div>
    );
  })
}));

vi.mock('../SearchableEmployeeSelector', () => ({
  SearchableEmployeeSelector: ({ employees, selectedEmployeeId, onEmployeeChange, disabled, placeholder }: any) => (
    <div data-testid="employee-selector">
      <select
        value={selectedEmployeeId}
        onChange={(e) => onEmployeeChange(e.target.value)}
        disabled={disabled}
        data-testid="employee-select"
      >
        <option value="">{placeholder}</option>
        {employees.map((emp: any) => (
          <option key={emp.id} value={emp.id}>
            {emp.name}
          </option>
        ))}
      </select>
    </div>
  )
}));

// Mock UI components
vi.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: any) => <div className={className} data-testid="card">{children}</div>,
  CardHeader: ({ children }: any) => <div data-testid="card-header">{children}</div>,
  CardTitle: ({ children }: any) => <h3 data-testid="card-title">{children}</h3>,
  CardContent: ({ children, className }: any) => <div className={className} data-testid="card-content">{children}</div>
}));

vi.mock('@/components/ui/label', () => ({
  Label: ({ children, htmlFor }: any) => <label htmlFor={htmlFor}>{children}</label>
}));

vi.mock('@/components/ui/textarea', () => ({
  Textarea: ({ value, onChange, onKeyDown, disabled, placeholder, ...props }: any) => (
    <textarea
      value={value}
      onChange={onChange}
      onKeyDown={onKeyDown}
      disabled={disabled}
      placeholder={placeholder}
      data-testid="feedback-textarea"
      {...props}
    />
  )
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, type, ...props }: any) => (
    <button 
      onClick={onClick} 
      disabled={disabled} 
      type={type}
      data-testid="submit-button"
      {...props}
    >
      {children}
    </button>
  )
}));

vi.mock('lucide-react', () => ({
  User: () => <div data-testid="user-icon" />,
  Send: () => <div data-testid="send-icon" />
}));

describe('FeedbackInputForm Voice Integration', () => {
  const mockEmployees = [
    { id: 'emp-1', name: 'John Doe', email: 'john@test.com', role: 'developer', user_id: 'user-1' },
    { id: 'emp-2', name: 'Jane Smith', email: 'jane@test.com', role: 'designer', user_id: 'user-2' }
  ];

  const defaultProps = {
    reviewCycleId: 'cycle-123',
    employees: mockEmployees,
    onSubmissionSuccess: vi.fn(),
    cycleTitle: 'Q1 Feedback Cycle'
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseManagerFeedback.isSubmitting = false;
    mockSubmitManagerFeedback.mockResolvedValue(true);
    mockVoiceActive = false; // Reset voice state
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Voice Input Integration', () => {
    it('should render voice input component', () => {
      render(<FeedbackInputForm {...defaultProps} />);
      
      expect(screen.getByTestId('voice-to-text-input')).toBeInTheDocument();
      expect(screen.getByTestId('voice-button')).toBeInTheDocument();
    });

    it('should disable voice input when no employee is selected', () => {
      render(<FeedbackInputForm {...defaultProps} />);
      
      expect(screen.getByTestId('voice-status')).toHaveTextContent('Voice Disabled');
    });

    it('should enable voice input when employee is selected', async () => {
      render(<FeedbackInputForm {...defaultProps} />);
      
      const employeeSelect = screen.getByTestId('employee-select');
      fireEvent.change(employeeSelect, { target: { value: 'emp-1' } });
      
      await waitFor(() => {
        expect(screen.getByTestId('voice-status')).toHaveTextContent('Voice Enabled');
      });
    });

    it('should add voice input to feedback content', async () => {
      render(<FeedbackInputForm {...defaultProps} />);
      
      // Select employee first
      const employeeSelect = screen.getByTestId('employee-select');
      fireEvent.change(employeeSelect, { target: { value: 'emp-1' } });
      
      // Use voice input
      const voiceButton = screen.getByTestId('voice-button');
      fireEvent.click(voiceButton);
      
      // Wait for voice content to be added
      await waitFor(() => {
        expect(screen.getByTestId('voice-active-indicator')).toBeInTheDocument();
      });
      
      // Wait for the async content to be processed
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Stop voice mode to reveal the textarea
      fireEvent.click(voiceButton);
      
      await waitFor(() => {
        const textarea = screen.getByTestId('feedback-textarea');
        expect(textarea).toHaveValue(' Voice input added');
      });
    });

    it('should handle voice toggle state correctly', async () => {
      const onVoiceToggleSpy = vi.fn();
      
      // Mock the VoiceToTextInput to call onVoiceToggle with true then false
      vi.mocked(VoiceToTextInput).mockImplementation(({ value, onChange, onVoiceToggle, disabled }: any) => {
        const handleStartVoice = () => {
          onVoiceToggle?.(true); // Start voice mode
        };
        
        const handleEndVoice = () => {
          const newText = value + ' Voice input added';
          onChange(newText);
          onVoiceToggle?.(false); // End voice mode
        };

        return (
          <div data-testid="voice-to-text-input">
            <button data-testid="start-voice" onClick={handleStartVoice}>Start</button>
            <button data-testid="end-voice" onClick={handleEndVoice}>End</button>
          </div>
        );
      });

      render(<FeedbackInputForm {...defaultProps} />);
      
      // Select employee
      const employeeSelect = screen.getByTestId('employee-select');
      fireEvent.change(employeeSelect, { target: { value: 'emp-1' } });
      
      // Start voice mode
      fireEvent.click(screen.getByTestId('start-voice'));
      
      // End voice mode with content
      fireEvent.click(screen.getByTestId('end-voice'));
      
      await waitFor(() => {
        const textarea = screen.getByTestId('feedback-textarea');
        expect(textarea).toHaveValue(' Voice input added');
      });
    });
  });

  describe('Voice Mode Text Area Visibility', () => {
    it('should show textarea when not in voice mode', () => {
      render(<FeedbackInputForm {...defaultProps} />);
      
      expect(screen.getByTestId('feedback-textarea')).toBeInTheDocument();
    });

    it('should hide textarea during voice mode', async () => {
      // Mock VoiceToTextInput to trigger voice mode
      vi.mocked(VoiceToTextInput).mockImplementation(({ onVoiceToggle }: any) => {
        React.useEffect(() => {
          onVoiceToggle?.(true); // Simulate entering voice mode
        }, []);
        
        return <div data-testid="voice-to-text-input">Voice Recording...</div>;
      });

      render(<FeedbackInputForm {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.queryByTestId('feedback-textarea')).not.toBeInTheDocument();
      });
    });
  });

  describe('Form Submission with Voice Input', () => {
    it('should submit feedback with voice source when voice is used', async () => {
      render(<FeedbackInputForm {...defaultProps} />);
      
      // Select employee
      const employeeSelect = screen.getByTestId('employee-select');
      fireEvent.change(employeeSelect, { target: { value: 'emp-1' } });
      
      // Use voice input
      const voiceButton = screen.getByTestId('voice-button');
      fireEvent.click(voiceButton);
      
      // Wait for voice mode to be active and content to be processed
      await waitFor(() => {
        expect(screen.getByTestId('voice-active-indicator')).toBeInTheDocument();
      });
      
      // Wait a bit for the async voice content to be added
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Submit form (should use voice source since we're in voice mode)
      const form = screen.getByTestId('card-content').querySelector('form');
      fireEvent.submit(form!);
      
      await waitFor(() => {
        expect(mockSubmitManagerFeedback).toHaveBeenCalledWith({
          employee_id: 'emp-1',
          content: 'Voice input added',
          source: 'voice'
        });
      });
    });

    it('should submit feedback with web source when typed', async () => {
      render(<FeedbackInputForm {...defaultProps} />);
      
      // Select employee
      const employeeSelect = screen.getByTestId('employee-select');
      fireEvent.change(employeeSelect, { target: { value: 'emp-1' } });
      
      // Type feedback
      const textarea = screen.getByTestId('feedback-textarea');
      fireEvent.change(textarea, { target: { value: 'This is typed feedback' } });
      
      // Submit form
      const form = screen.getByTestId('card-content').querySelector('form');
      fireEvent.submit(form!);
      
      await waitFor(() => {
        expect(mockSubmitManagerFeedback).toHaveBeenCalledWith({
          employee_id: 'emp-1',
          content: 'This is typed feedback',
          source: 'web'
        });
      });
    });

    it('should reset voice mode after successful submission', async () => {
      render(<FeedbackInputForm {...defaultProps} />);
      
      // Select employee
      const employeeSelect = screen.getByTestId('employee-select');
      fireEvent.change(employeeSelect, { target: { value: 'emp-1' } });
      
      // Use voice input (this sets voice mode to true)
      const voiceButton = screen.getByTestId('voice-button');
      fireEvent.click(voiceButton);
      
      // Wait for voice content to be added
      await waitFor(() => {
        expect(screen.getByTestId('voice-active-indicator')).toBeInTheDocument();
      });
      
      // Wait for the async content to be processed
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Submit form
      const form = screen.getByTestId('card-content').querySelector('form');
      fireEvent.submit(form!);
      
      await waitFor(() => {
        expect(mockSubmitManagerFeedback).toHaveBeenCalled();
      });
      
      // Voice mode should be reset (textarea should be visible again)
      await waitFor(() => {
        expect(screen.getByTestId('feedback-textarea')).toBeInTheDocument();
      });
    });
  });

  describe('Keyboard Shortcuts with Voice', () => {
    it('should submit with Cmd+Enter when voice input is used', async () => {
      render(<FeedbackInputForm {...defaultProps} />);
      
      // Select employee
      const employeeSelect = screen.getByTestId('employee-select');
      fireEvent.change(employeeSelect, { target: { value: 'emp-1' } });
      
      // Use voice input
      const voiceButton = screen.getByTestId('voice-button');
      fireEvent.click(voiceButton);
      
      // Wait for voice mode to be active
      await waitFor(() => {
        expect(screen.getByTestId('voice-active-indicator')).toBeInTheDocument();
      });
      
      // Wait a bit for the async voice content to be added
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Use keyboard shortcut (submit while in voice mode)
      fireEvent.keyDown(document, {
        key: 'Enter',
        metaKey: true
      });
      
      await waitFor(() => {
        expect(mockSubmitManagerFeedback).toHaveBeenCalledWith({
          employee_id: 'emp-1',
          content: 'Voice input added',
          source: 'voice'
        });
      });
    });
  });

  describe('Voice Input Validation', () => {
    it('should validate minimum length for voice input', async () => {
      // Mock short voice input
      vi.mocked(VoiceToTextInput).mockImplementation(({ value, onChange, onVoiceToggle }: any) => {
        const handleVoiceClick = () => {
          onChange('Short'); // Less than 10 characters
          onVoiceToggle?.(false);
        };

        return (
          <div data-testid="voice-to-text-input">
            <button data-testid="voice-button" onClick={handleVoiceClick}>
              Start Voice Input
            </button>
          </div>
        );
      });

      render(<FeedbackInputForm {...defaultProps} />);
      
      // Select employee
      const employeeSelect = screen.getByTestId('employee-select');
      fireEvent.change(employeeSelect, { target: { value: 'emp-1' } });
      
      // Use voice input (short content)
      const voiceButton = screen.getByTestId('voice-button');
      fireEvent.click(voiceButton);
      
      // Try to submit
      const form = screen.getByTestId('card-content').querySelector('form');
      fireEvent.submit(form!);
      
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: "Feedback Too Short",
          description: "Please provide more detailed feedback (at least 10 characters).",
          variant: "destructive"
        });
      });
      
      expect(mockSubmitManagerFeedback).not.toHaveBeenCalled();
    });

    it('should handle empty voice input', async () => {
      // Mock empty voice input
      vi.mocked(VoiceToTextInput).mockImplementation(({ value, onChange, onVoiceToggle }: any) => {
        const handleVoiceClick = () => {
          onChange(''); // Empty content
          onVoiceToggle?.(false);
        };

        return (
          <div data-testid="voice-to-text-input">
            <button data-testid="voice-button" onClick={handleVoiceClick}>
              Start Voice Input
            </button>
          </div>
        );
      });

      render(<FeedbackInputForm {...defaultProps} />);
      
      // Select employee
      const employeeSelect = screen.getByTestId('employee-select');
      fireEvent.change(employeeSelect, { target: { value: 'emp-1' } });
      
      // Use voice input (empty content)
      const voiceButton = screen.getByTestId('voice-button');
      fireEvent.click(voiceButton);
      
      // Try to submit
      const form = screen.getByTestId('card-content').querySelector('form');
      fireEvent.submit(form!);
      
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: "Feedback Required",
          description: "Please enter your feedback before submitting.",
          variant: "destructive"
        });
      });
    });
  });

  describe('Employee Selection with Voice', () => {
    it('should auto-enable voice when employee is pre-selected', () => {
      render(
        <FeedbackInputForm 
          {...defaultProps} 
          hideEmployeeSelector={true}
          employees={[mockEmployees[0]]} // Single employee
        />
      );
      
      expect(screen.getByTestId('voice-status')).toHaveTextContent('Voice Enabled');
    });

    it('should disable voice when employee selection is cleared', async () => {
      render(<FeedbackInputForm {...defaultProps} />);
      
      // Select employee first
      const employeeSelect = screen.getByTestId('employee-select');
      fireEvent.change(employeeSelect, { target: { value: 'emp-1' } });
      
      await waitFor(() => {
        expect(screen.getByTestId('voice-status')).toHaveTextContent('Voice Enabled');
      });
      
      // Clear selection
      fireEvent.change(employeeSelect, { target: { value: '' } });
      
      await waitFor(() => {
        expect(screen.getByTestId('voice-status')).toHaveTextContent('Voice Disabled');
      });
    });
  });

  describe('Voice Error Handling', () => {
    it('should handle voice input errors gracefully', async () => {
      // Mock voice input with error
      vi.mocked(VoiceToTextInput).mockImplementation(({ onVoiceToggle }: any) => {
        const handleVoiceError = () => {
          onVoiceToggle?.(false); // End voice mode
          // Voice component would handle showing error internally
        };

        return (
          <div data-testid="voice-to-text-input">
            <button data-testid="voice-error" onClick={handleVoiceError}>
              Trigger Error
            </button>
            <div>Voice Error: Microphone not found</div>
          </div>
        );
      });

      render(<FeedbackInputForm {...defaultProps} />);
      
      // Select employee
      const employeeSelect = screen.getByTestId('employee-select');
      fireEvent.change(employeeSelect, { target: { value: 'emp-1' } });
      
      // Trigger voice error
      const errorButton = screen.getByTestId('voice-error');
      fireEvent.click(errorButton);
      
      // Form should still be usable with text input
      await waitFor(() => {
        expect(screen.getByTestId('feedback-textarea')).toBeInTheDocument();
      });
      
      // User can still type feedback
      const textarea = screen.getByTestId('feedback-textarea');
      fireEvent.change(textarea, { target: { value: 'Fallback to typing' } });
      
      expect(textarea).toHaveValue('Fallback to typing');
    });
  });

  describe('Mixed Input Methods', () => {
    it('should handle combination of voice and typing', async () => {
      render(<FeedbackInputForm {...defaultProps} />);
      
      // Select employee
      const employeeSelect = screen.getByTestId('employee-select');
      fireEvent.change(employeeSelect, { target: { value: 'emp-1' } });
      
      // Start with typing
      const textarea = screen.getByTestId('feedback-textarea');
      fireEvent.change(textarea, { target: { value: 'Initial typed text' } });
      
      // Add voice input (should append to existing text)
      const voiceButton = screen.getByTestId('voice-button');
      fireEvent.click(voiceButton);
      
      // Wait for voice mode to activate 
      await waitFor(() => {
        expect(screen.getByText(/Voice input active/)).toBeInTheDocument();
      });
      
      // Wait for voice content to be processed
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // End voice mode by calling the mock's completion
      vi.mocked(VoiceToTextInput).mockImplementation(({ value, onChange, onVoiceToggle, disabled }: any) => {
        // Simulate voice mode ending and returning to text mode
        React.useEffect(() => {
          onVoiceToggle?.(false);
        }, []);
        
        return (
          <div data-testid="voice-to-text-input">
            <button data-testid="voice-button" disabled={disabled}>Voice Input Complete</button>
            <div data-testid="voice-status">{disabled ? 'Voice Disabled' : 'Voice Enabled'}</div>
          </div>
        );
      });
      
      // Re-render to apply the mock change
      fireEvent.change(employeeSelect, { target: { value: 'emp-1' } });
      
      // Wait for textarea to be visible again
      await waitFor(() => {
        const newTextarea = screen.getByTestId('feedback-textarea');
        expect(newTextarea).toBeInTheDocument();
      });
      
      // Continue typing (this should override voice mode)
      const newTextarea = screen.getByTestId('feedback-textarea');
      fireEvent.change(newTextarea, { 
        target: { value: 'Initial typed text Voice input added and more typing' } 
      });
      
      // Submit should use web source since last action was typing
      const form = screen.getByTestId('card-content').querySelector('form');
      fireEvent.submit(form!);
      
      await waitFor(() => {
        expect(mockSubmitManagerFeedback).toHaveBeenCalledWith({
          employee_id: 'emp-1',
          content: 'Initial typed text Voice input added and more typing',
          source: 'web'
        });
      });
    });
  });
}); 