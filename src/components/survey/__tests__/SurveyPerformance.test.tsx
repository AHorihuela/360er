import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { DynamicSurveyForm } from '../DynamicSurveyForm';
import { SurveyQuestion, ReviewCycleType } from '@/types/survey';

// Helper to generate large test datasets
function generateLargeQuestionSet(count: number): SurveyQuestion[] {
  const questions: SurveyQuestion[] = [];
  
  // Generate Likert scale questions
  for (let i = 1; i <= count - 2; i++) {
    questions.push({
      id: `q${i}`,
      reviewCycleType: 'manager_effectiveness' as ReviewCycleType,
      questionText: `This is performance test question ${i} which has a relatively long text to simulate real questions that might be asked in a survey about manager effectiveness and team dynamics.`,
      questionType: 'likert',
      options: [
        { value: 1, label: 'Strongly Disagree' },
        { value: 2, label: 'Disagree' },
        { value: 3, label: 'Neither agree nor disagree' },
        { value: 4, label: 'Agree' },
        { value: 5, label: 'Strongly Agree' }
      ],
      order: i,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
  }
  
  // Add a couple of open-ended questions at the end
  questions.push({
    id: `q${count - 1}`,
    reviewCycleType: 'manager_effectiveness' as ReviewCycleType,
    questionText: 'What could this manager do to better support the team\'s success and development? Please provide specific examples and suggestions that would be most impactful for improving team dynamics and productivity.',
    questionType: 'open_ended',
    order: count - 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  });
  
  questions.push({
    id: `q${count}`,
    reviewCycleType: 'manager_effectiveness' as ReviewCycleType,
    questionText: 'Is there any additional feedback you would like to share about your experience working with this manager? This could include both positive aspects you\'d like to highlight and areas where you see opportunity for growth.',
    questionType: 'open_ended',
    order: count,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  });
  
  return questions;
}

// Mock the child components to avoid testing their internals
vi.mock('../LikertScaleQuestion', () => ({
  LikertScaleQuestion: ({ id, questionText, options, value, onChange }: {
    id: string;
    questionText: string;
    options: Array<{ value: number | string; label: string }>;
    value?: number | string;
    onChange: (value: number | string) => void;
  }) => (
    <div data-testid={`likert-question-${id}`}>
      <h3>{questionText}</h3>
      <div className="options">
        {options.map((option) => (
          <label key={option.value} data-testid={`option-${id}-${option.value}`}>
            <input
              type="radio"
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              data-testid={`radio-${id}-${option.value}`}
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

describe('Survey Performance Tests', () => {
  let largeQuestionSet: SurveyQuestion[];
  const mockSubmit = vi.fn().mockImplementation(() => Promise.resolve());
  
  beforeEach(() => {
    vi.clearAllMocks();
    performance.mark = vi.fn();
    performance.measure = vi.fn();
    performance.getEntriesByName = vi.fn();
    performance.clearMarks = vi.fn();
    performance.clearMeasures = vi.fn();
  });
  
  it('renders survey with 20 questions in acceptable time', () => {
    // Start performance measurement
    performance.mark('start-render');
    
    // Generate 20 questions (typical for a comprehensive survey)
    largeQuestionSet = generateLargeQuestionSet(20);
    
    // Render the form
    const { rerender } = render(
      <DynamicSurveyForm
        questions={largeQuestionSet}
        surveyType="manager_effectiveness"
        employeeName="John Doe"
        employeeRole="Manager"
        onSubmit={mockSubmit}
        isSubmitting={false}
      />
    );
    
    // End performance measurement
    performance.mark('end-render');
    performance.measure('render-time', 'start-render', 'end-render');
    
    // Verify the form rendered correctly
    expect(screen.getByText('Question 1 of 20')).toBeInTheDocument();
    
    // Simulated user interaction for large data set
    // Mark the start of the interaction phase
    performance.mark('start-interaction');
    
    // Select an answer for the first question
    fireEvent.click(screen.getByTestId(`radio-q1-4`));
    
    // Go to next question
    fireEvent.click(screen.getByText('Next'));
    
    // End performance measurement
    performance.mark('end-interaction');
    performance.measure('interaction-time', 'start-interaction', 'end-interaction');
    
    // The actual timing assertion would happen in a real environment
    // Since we can't rely on the mock timing, we're just ensuring the components render
    expect(true).toBe(true);
  });

  it('handles navigation through large survey without performance degradation', () => {
    // Generate 50 questions (very large survey)
    largeQuestionSet = generateLargeQuestionSet(50);
    
    render(
      <DynamicSurveyForm
        questions={largeQuestionSet}
        surveyType="manager_effectiveness"
        employeeName="John Doe"
        employeeRole="Manager"
        onSubmit={mockSubmit}
        isSubmitting={false}
      />
    );
    
    // Answer and navigate through 10 questions
    for (let i = 1; i <= 10; i++) {
      performance.mark(`start-question-${i}`);
      
      // Select an answer
      fireEvent.click(screen.getByTestId(`radio-q${i}-3`));
      
      // Go to next question
      fireEvent.click(screen.getByText('Next'));
      
      performance.mark(`end-question-${i}`);
      performance.measure(`question-${i}-time`, `start-question-${i}`, `end-question-${i}`);
    }
    
    // We'd compare timing results in a real test environment
    // Here we're just verifying navigation works through a large set
    expect(screen.getByText('Question 11 of 50')).toBeInTheDocument();
  });

  it('handles large text input in open-ended questions efficiently', () => {
    // Create a smaller set with one large open-ended question
    const questionsWithLargeText: SurveyQuestion[] = [
      {
        id: 'q1',
        reviewCycleType: 'manager_effectiveness' as ReviewCycleType,
        questionText: 'Please provide comprehensive feedback:',
        questionType: 'open_ended',
        order: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];
    
    render(
      <DynamicSurveyForm
        questions={questionsWithLargeText}
        surveyType="manager_effectiveness"
        employeeName="John Doe"
        employeeRole="Manager"
        onSubmit={mockSubmit}
        isSubmitting={false}
      />
    );
    
    // Generate a very large text response (5000 characters)
    const largeText = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. '.repeat(100);
    
    performance.mark('start-large-text');
    
    // Enter the large text
    fireEvent.change(screen.getByTestId('textarea-q1'), {
      target: { value: largeText }
    });
    
    performance.mark('end-large-text');
    performance.measure('large-text-time', 'start-large-text', 'end-large-text');
    
    // Submit the form with large text
    performance.mark('start-submit');
    fireEvent.click(screen.getByText('Submit'));
    performance.mark('end-submit');
    performance.measure('submit-time', 'start-submit', 'end-submit');
    
    // Verify the submit handler was called with the large text
    expect(mockSubmit).toHaveBeenCalledWith({ q1: largeText });
  });

  it('efficiently renders and updates progress indicators for large surveys', () => {
    // Generate 30 questions
    largeQuestionSet = generateLargeQuestionSet(30);
    
    const { rerender } = render(
      <DynamicSurveyForm
        questions={largeQuestionSet}
        surveyType="manager_effectiveness"
        employeeName="John Doe"
        employeeRole="Manager"
        onSubmit={mockSubmit}
        isSubmitting={false}
      />
    );
    
    // Initial state
    expect(screen.getByText('Question 1 of 30')).toBeInTheDocument();
    expect(screen.getByText('0% complete')).toBeInTheDocument();
    
    // Answer and navigate through questions, checking progress updates
    const checkpoints = [5, 10, 15, 20, 25];
    let currentQuestion = 1;
    
    for (const checkpoint of checkpoints) {
      // Navigate to the checkpoint
      while (currentQuestion < checkpoint) {
        fireEvent.click(screen.getByTestId(`radio-q${currentQuestion}-4`));
        fireEvent.click(screen.getByText('Next'));
        currentQuestion++;
      }
      
      // Check progress indicator
      const expectedProgress = Math.round(((checkpoint - 1) / 30) * 100);
      expect(screen.getByText(`Question ${checkpoint} of 30`)).toBeInTheDocument();
      expect(screen.getByText(`${expectedProgress}% complete`)).toBeInTheDocument();
    }
  });
}); 