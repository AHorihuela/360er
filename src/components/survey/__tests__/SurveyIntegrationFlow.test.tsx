import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { DynamicSurveyForm } from '../DynamicSurveyForm';
import { SurveyQuestion, StructuredResponses, QuestionOption } from '@/types/survey';

// Mock the components that are used within DynamicSurveyForm
vi.mock('../LikertScaleQuestion', () => ({
  LikertScaleQuestion: ({ id, questionText, options, value, onChange }: {
    id: string;
    questionText: string;
    options: QuestionOption[];
    value?: number;
    onChange: (value: number) => void;
  }) => (
    <div data-testid={`likert-question-${id}`}>
      <h3>{questionText}</h3>
      <div className="options">
        {options.map((option) => (
          <label key={option.value} data-testid={`option-${option.value}`}>
            <input
              type="radio"
              checked={value === option.value}
              onChange={() => onChange(Number(option.value))}
              data-testid={`radio-${option.value}`}
            />
            {option.label}
          </label>
        ))}
      </div>
    </div>
  )
}));

vi.mock('../OpenEndedQuestion', () => ({
  OpenEndedQuestion: ({ id, questionText, value, onChange }: {
    id: string;
    questionText: string;
    value: string;
    onChange: (value: string) => void;
  }) => (
    <div data-testid={`open-ended-question-${id}`}>
      <h3>{questionText}</h3>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        data-testid={`textarea-${id}`}
      />
    </div>
  )
}));

describe('Survey Integration Flow', () => {
  // Sample questions for testing
  const sampleQuestions: SurveyQuestion[] = [
    {
      id: 'q1',
      reviewCycleType: 'manager_effectiveness',
      questionText: 'I understand what is expected of me at work.',
      questionType: 'likert',
      options: [
        { value: 1, label: 'Strongly Disagree' },
        { value: 2, label: 'Disagree' },
        { value: 3, label: 'Neither agree nor disagree' },
        { value: 4, label: 'Agree' },
        { value: 5, label: 'Strongly Agree' }
      ],
      order: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'q2',
      reviewCycleType: 'manager_effectiveness',
      questionText: 'My manager contributes to my productivity.',
      questionType: 'likert',
      options: [
        { value: 1, label: 'Strongly Disagree' },
        { value: 2, label: 'Disagree' },
        { value: 3, label: 'Neither agree nor disagree' },
        { value: 4, label: 'Agree' },
        { value: 5, label: 'Strongly Agree' }
      ],
      order: 2,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'q3',
      reviewCycleType: 'manager_effectiveness',
      questionText: 'Is there any additional feedback you would like to share?',
      questionType: 'open_ended',
      order: 3,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ];

  const mockSubmit = vi.fn().mockImplementation(() => Promise.resolve());

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('allows users to navigate through all questions and submit the survey', async () => {
    render(
      <DynamicSurveyForm
        questions={sampleQuestions}
        surveyType="manager_effectiveness"
        employeeName="John Doe"
        employeeRole="Manager"
        onSubmit={mockSubmit}
        isSubmitting={false}
      />
    );

    // Verify the form starts on the first question
    expect(screen.getByText('Question 1 of 3')).toBeInTheDocument();
    expect(screen.getByText('I understand what is expected of me at work.')).toBeInTheDocument();
    
    // Expect the Next button parent to be disabled initially
    const nextButton = screen.getByRole('button', { name: /Next/i });
    expect(nextButton).toBeDisabled();
    
    // Select an answer for the first question
    fireEvent.click(screen.getByTestId('radio-4')); // Select "Agree"
    
    // Next button should be enabled now
    expect(nextButton).not.toBeDisabled();
    
    // Move to the next question
    fireEvent.click(nextButton);
    
    // Verify we're on the second question
    await waitFor(() => {
      expect(screen.getByText('Question 2 of 3')).toBeInTheDocument();
      expect(screen.getByText('My manager contributes to my productivity.')).toBeInTheDocument();
    });
    
    // The Next button should be disabled again for the new question
    const secondNextButton = screen.getByRole('button', { name: /Next/i });
    expect(secondNextButton).toBeDisabled();
    
    // Select an answer for the second question
    fireEvent.click(screen.getByTestId('radio-5')); // Select "Strongly Agree"
    
    // Move to the next question
    fireEvent.click(secondNextButton);
    
    // Verify we're on the last question (open-ended)
    await waitFor(() => {
      expect(screen.getByText('Question 3 of 3')).toBeInTheDocument();
      expect(screen.getByText('Is there any additional feedback you would like to share?')).toBeInTheDocument();
    });
    
    // The Submit button should be visible (and enabled, since this question is optional)
    const submitButton = screen.getByRole('button', { name: /Submit/i });
    expect(submitButton).toBeInTheDocument();
    expect(submitButton).not.toBeDisabled();
    
    // Enter some text in the open-ended question
    fireEvent.change(screen.getByTestId('textarea-q3'), {
      target: { value: 'This is some additional feedback.' }
    });
    
    // Submit the form
    fireEvent.click(submitButton);
    
    // Check that onSubmit was called with the correct data
    await waitFor(() => {
      expect(mockSubmit).toHaveBeenCalledTimes(1);
      expect(mockSubmit).toHaveBeenCalledWith({
        q1: 4,
        q2: 5,
        q3: 'This is some additional feedback.'
      });
    });
  });

  it('allows users to navigate back to previous questions and change answers', async () => {
    render(
      <DynamicSurveyForm
        questions={sampleQuestions}
        surveyType="manager_effectiveness"
        employeeName="John Doe"
        employeeRole="Manager"
        onSubmit={mockSubmit}
        isSubmitting={false}
      />
    );
    
    // Answer the first question
    fireEvent.click(screen.getByTestId('radio-4'));
    
    // Go to the next question
    fireEvent.click(screen.getByText('Next'));
    
    // Answer the second question
    await waitFor(() => {
      fireEvent.click(screen.getByTestId('radio-3'));
    });
    
    // Go to the next question
    fireEvent.click(screen.getByText('Next'));
    
    // Go back to the previous question
    await waitFor(() => {
      fireEvent.click(screen.getByText('Previous'));
    });
    
    // Verify we're back on the second question
    await waitFor(() => {
      expect(screen.getByText('Question 2 of 3')).toBeInTheDocument();
    });
    
    // Change the answer
    fireEvent.click(screen.getByTestId('radio-5'));
    
    // Go back to the first question
    fireEvent.click(screen.getByText('Previous'));
    
    // Verify we're on the first question
    await waitFor(() => {
      expect(screen.getByText('Question 1 of 3')).toBeInTheDocument();
    });
    
    // Change the first answer
    fireEvent.click(screen.getByTestId('radio-2'));
    
    // Go forward to the second question
    fireEvent.click(screen.getByText('Next'));
    
    // Go forward to the third question
    await waitFor(() => {
      fireEvent.click(screen.getByText('Next'));
    });
    
    // Submit the form
    fireEvent.click(screen.getByText('Submit'));
    
    // Check that onSubmit was called with the updated answers
    await waitFor(() => {
      expect(mockSubmit).toHaveBeenCalled();
      const submitCall = mockSubmit.mock.calls[0][0];
      expect(submitCall.q1).toBe(2);
      expect(submitCall.q2).toBe(5);
      // The q3 property might be undefined or empty string, depending on implementation
      expect(submitCall.q3 === '' || submitCall.q3 === undefined).toBeTruthy();
    });
  });

  it('handles optional open-ended question correctly', async () => {
    render(
      <DynamicSurveyForm
        questions={sampleQuestions}
        surveyType="manager_effectiveness"
        employeeName="John Doe"
        employeeRole="Manager"
        onSubmit={mockSubmit}
        isSubmitting={false}
      />
    );
    
    // Answer first two questions
    fireEvent.click(screen.getByTestId('radio-4'));
    fireEvent.click(screen.getByText('Next'));
    
    await waitFor(() => {
      fireEvent.click(screen.getByTestId('radio-5'));
    });
    
    fireEvent.click(screen.getByText('Next'));
    
    // Submit without answering the optional question
    await waitFor(() => {
      fireEvent.click(screen.getByText('Submit'));
    });
    
    // Check that onSubmit was called with empty string for the optional question
    await waitFor(() => {
      expect(mockSubmit).toHaveBeenCalled();
      const submitCall = mockSubmit.mock.calls[0][0];
      expect(submitCall.q1).toBe(4);
      expect(submitCall.q2).toBe(5);
      // The q3 property might be undefined or empty string, depending on implementation
      expect(submitCall.q3 === '' || submitCall.q3 === undefined).toBeTruthy();
    });
  });

  it('shows correct progress indication throughout the survey', async () => {
    render(
      <DynamicSurveyForm
        questions={sampleQuestions}
        surveyType="manager_effectiveness"
        employeeName="John Doe"
        employeeRole="Manager"
        onSubmit={mockSubmit}
        isSubmitting={false}
      />
    );
    
    // First question should show 0% progress
    expect(screen.getByText('Question 1 of 3')).toBeInTheDocument();
    expect(screen.getByText('0% complete')).toBeInTheDocument();
    
    // Answer and go to next question
    fireEvent.click(screen.getByTestId('radio-3'));
    fireEvent.click(screen.getByText('Next'));
    
    // Second question should show 33% progress
    await waitFor(() => {
      expect(screen.getByText('Question 2 of 3')).toBeInTheDocument();
      expect(screen.getByText('33% complete')).toBeInTheDocument();
    });
    
    // Answer and go to last question
    fireEvent.click(screen.getByTestId('radio-4'));
    fireEvent.click(screen.getByText('Next'));
    
    // Third question should show 67% progress instead of 66%
    await waitFor(() => {
      expect(screen.getByText('Question 3 of 3')).toBeInTheDocument();
      expect(screen.getByText('67% complete')).toBeInTheDocument();
    });
  });

  it('disables navigation when form is submitting', async () => {
    const { rerender } = render(
      <DynamicSurveyForm
        questions={sampleQuestions}
        surveyType="manager_effectiveness"
        employeeName="John Doe"
        employeeRole="Manager"
        onSubmit={mockSubmit}
        isSubmitting={false}
      />
    );
    
    // Answer the first question
    fireEvent.click(screen.getByTestId('radio-4'));
    
    // Set isSubmitting to true
    rerender(
      <DynamicSurveyForm
        questions={sampleQuestions}
        surveyType="manager_effectiveness"
        employeeName="John Doe"
        employeeRole="Manager"
        onSubmit={mockSubmit}
        isSubmitting={true}
      />
    );
    
    // Both buttons should be disabled
    expect(screen.getByRole('button', { name: /Previous/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Next/i })).toBeDisabled();
  });
}); 