import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OpenEndedQuestion } from '../OpenEndedQuestion';

// Mock the validateFeedback function
vi.mock('@/utils/feedbackValidation', () => ({
  validateFeedback: vi.fn().mockImplementation((text, showValidation) => ({
    isValid: text.length >= 30,
    message: text.length >= 30 ? `${text.length}/2000 characters` : `Please provide at least 30 characters (currently ${text.length})`,
    warnings: [],
    showLengthWarning: showValidation
  }))
}));

describe('OpenEndedQuestion', () => {
  const defaultProps = {
    id: 'test-question',
    questionText: 'This is a test question',
    value: '',
    onChange: vi.fn(),
    placeholder: 'Type your answer here',
    showValidation: false,
    required: true,
    minLength: 30
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the question text with required indicator', () => {
    render(<OpenEndedQuestion {...defaultProps} />);
    expect(screen.getByText('This is a test question')).toBeInTheDocument();
    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it('renders the textarea with the correct placeholder', () => {
    render(<OpenEndedQuestion {...defaultProps} />);
    const textarea = screen.getByPlaceholderText('Type your answer here');
    expect(textarea).toBeInTheDocument();
  });

  it('calls onChange when text is entered', () => {
    const onChange = vi.fn();
    render(<OpenEndedQuestion {...defaultProps} onChange={onChange} />);
    
    const textarea = screen.getByPlaceholderText('Type your answer here');
    fireEvent.change(textarea, { target: { value: 'New text input' } });
    
    expect(onChange).toHaveBeenCalledWith('New text input');
  });

  it('shows validation message when showValidation is true and text is too short', async () => {
    render(<OpenEndedQuestion {...defaultProps} value="Short" showValidation={true} />);
    
    await waitFor(() => {
      expect(screen.getByText('Please provide at least 30 characters (currently 5)')).toBeInTheDocument();
    });
  });

  it('treats the question as optional when it contains "additional feedback you would like to share"', () => {
    render(
      <OpenEndedQuestion 
        {...defaultProps} 
        questionText="Is there any additional feedback you would like to share?" 
      />
    );
    
    // Should not show required indicator (*)
    expect(screen.getByText('Is there any additional feedback you would like to share?')).toBeInTheDocument();
    expect(screen.queryByText('*')).not.toBeInTheDocument();
  });

  it('does not validate optional questions for minimum length', async () => {
    const shortText = 'Just a short comment';
    
    render(
      <OpenEndedQuestion 
        {...defaultProps} 
        questionText="Is there any additional feedback you would like to share?" 
        value={shortText}
        showValidation={true}
      />
    );
    
    // Should not show validation errors for the optional question
    await waitFor(() => {
      expect(screen.queryByText(/Please provide at least/)).not.toBeInTheDocument();
    });
  });

  it('does not show required indicator for explicitly optional questions', () => {
    render(<OpenEndedQuestion {...defaultProps} required={false} />);
    expect(screen.getByText('This is a test question')).toBeInTheDocument();
    expect(screen.queryByText('*')).not.toBeInTheDocument();
  });

  it('handles long text input correctly', () => {
    const longText = 'This is a very long text input that exceeds the minimum length requirement of 30 characters for required questions.';
    const onChange = vi.fn();
    
    render(<OpenEndedQuestion {...defaultProps} value={longText} onChange={onChange} />);
    
    const textarea = screen.getByPlaceholderText('Type your answer here');
    expect(textarea).toHaveValue(longText);
  });
}); 