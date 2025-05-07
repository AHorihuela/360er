import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { LikertScaleQuestion } from '../LikertScaleQuestion';
import { QuestionOption } from '@/types/survey';

describe('LikertScaleQuestion', () => {
  const defaultOptions: QuestionOption[] = [
    { value: 1, label: 'Strongly Disagree' },
    { value: 2, label: 'Disagree' },
    { value: 3, label: 'Neither agree nor disagree' },
    { value: 4, label: 'Agree' },
    { value: 5, label: 'Strongly Agree' }
  ];

  const defaultProps = {
    id: 'test-question',
    questionText: 'This is a test question',
    options: defaultOptions,
    value: undefined,
    onChange: vi.fn(),
    required: true
  };

  it('renders the question text correctly', () => {
    render(<LikertScaleQuestion {...defaultProps} />);
    expect(screen.getByText('This is a test question')).toBeInTheDocument();
    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it('renders all options', () => {
    render(<LikertScaleQuestion {...defaultProps} />);
    defaultOptions.forEach(option => {
      expect(screen.getByText(option.label)).toBeInTheDocument();
    });
  });

  it('does not show required indicator when required is false', () => {
    render(<LikertScaleQuestion {...defaultProps} required={false} />);
    expect(screen.getByText('This is a test question')).toBeInTheDocument();
    expect(screen.queryByText('*')).not.toBeInTheDocument();
  });

  it('calls onChange when an option is clicked', () => {
    const onChange = vi.fn();
    render(<LikertScaleQuestion {...defaultProps} onChange={onChange} />);
    
    // Find and click the "Agree" option
    fireEvent.click(screen.getByText('Agree'));
    
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(4); // Value for "Agree"
  });

  it('highlights the selected option', () => {
    render(<LikertScaleQuestion {...defaultProps} value={4} />);
    
    // Instead of checking the radiogroup state, find the selected radio button
    const selectedRadio = screen.getByRole('radio', { name: 'Agree' });
    expect(selectedRadio).toHaveAttribute('aria-checked', 'true');
    
    // Verify the non-selected options are not checked
    const nonSelectedRadio = screen.getByRole('radio', { name: 'Disagree' });
    expect(nonSelectedRadio).toHaveAttribute('aria-checked', 'false');
  });

  it('allows changing the selection', () => {
    const onChange = vi.fn();
    render(<LikertScaleQuestion {...defaultProps} value={2} onChange={onChange} />);
    
    // Change selection to "Strongly Agree"
    fireEvent.click(screen.getByText('Strongly Agree'));
    
    expect(onChange).toHaveBeenCalledWith(5);
  });

  it('handles empty options gracefully', () => {
    render(<LikertScaleQuestion {...defaultProps} options={[]} />);
    expect(screen.getByText('Error: No options available for this question.')).toBeInTheDocument();
  });
}); 