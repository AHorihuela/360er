import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from '@testing-library/react';
import { AIReport } from '../AIReport';

// Mock the feedback component and its dependencies
vi.mock('@/components/feedback/MarkdownEditor', () => ({
  MarkdownEditor: () => <div>MarkdownEditor</div>
}));

vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() })
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: () => ({
      update: () => ({ eq: () => Promise.resolve({}) })
    })
  }
}));

describe('AIReport Page Leave Warning', () => {
  const mockProps = {
    feedbackRequest: {
      id: 'test-id',
      employee: {
        name: 'John Doe',
        role: 'Developer'
      },
      feedback: [{
        id: '1',
        feedback_request_id: 'test-id',
        session_id: 'session-1',
        relationship: 'peer',
        strengths: 'Good communication',
        areas_for_improvement: 'Time management',
        submitted_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        status: 'submitted',
        severity: 'moderate'
      }],
      ai_reports: []
    },
    onExportPDF: vi.fn(),
    onReportChange: vi.fn(),
    onGenerateReport: vi.fn(),
    generationStep: 0,
    startTime: Date.now(),
    elapsedSeconds: 15,
    surveyType: '360_review' as const
  };

  beforeEach(() => {
    // Mock window.addEventListener and removeEventListener
    Object.defineProperty(window, 'addEventListener', {
      value: vi.fn(),
      writable: true,
    });
    Object.defineProperty(window, 'removeEventListener', {
      value: vi.fn(),
      writable: true,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('adds beforeunload event listener when generating report', () => {
    render(
      <AIReport
        {...mockProps}
        isGeneratingReport={true}
      />
    );

    expect(window.addEventListener).toHaveBeenCalledWith(
      'beforeunload',
      expect.any(Function)
    );
  });

  it('does not add beforeunload event listener when not generating report', () => {
    render(
      <AIReport
        {...mockProps}
        isGeneratingReport={false}
      />
    );

    expect(window.addEventListener).not.toHaveBeenCalledWith(
      'beforeunload',
      expect.any(Function)
    );
  });

  it('removes beforeunload event listener when generation stops', () => {
    const { rerender } = render(
      <AIReport
        {...mockProps}
        isGeneratingReport={true}
      />
    );

    // Initially adds the listener
    expect(window.addEventListener).toHaveBeenCalledWith(
      'beforeunload',
      expect.any(Function)
    );

    // Clear the mock to track removal
    vi.clearAllMocks();

    // Stop generation
    rerender(
      <AIReport
        {...mockProps}
        isGeneratingReport={false}
      />
    );

    expect(window.removeEventListener).toHaveBeenCalledWith(
      'beforeunload',
      expect.any(Function)
    );
  });

  it('shows warning message during generation', () => {
    const { getByText } = render(
      <AIReport
        {...mockProps}
        isGeneratingReport={true}
      />
    );

    expect(getByText(/Please do not leave or refresh this page/)).toBeInTheDocument();
  });

  it('does not show warning message when not generating', () => {
    const { queryByText } = render(
      <AIReport
        {...mockProps}
        isGeneratingReport={false}
      />
    );

    expect(queryByText(/Please do not leave or refresh this page/)).not.toBeInTheDocument();
  });
}); 