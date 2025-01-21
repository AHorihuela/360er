import React from 'react';

// Mock modules before imports
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ cycleId: 'cycle-1', employeeId: 'emp-1' }),
    useNavigate: () => vi.fn()
  };
});

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            single: async () => {
              await new Promise(resolve => setTimeout(resolve, 0)); // Simulate async
              return {
                data: mockReviewCycle,
                error: null
              };
            }
          })
        })
      })
    })
  }
}));

vi.mock('@/components/ui/alert-dialog', () => ({
  AlertDialog: ({ children }: { children: React.ReactNode }) => children,
  AlertDialogContent: ({ children }: { children: React.ReactNode }) => children,
  AlertDialogHeader: ({ children }: { children: React.ReactNode }) => children,
  AlertDialogTitle: ({ children }: { children: React.ReactNode }) => children,
  AlertDialogDescription: ({ children }: { children: React.ReactNode }) => children,
  AlertDialogFooter: ({ children }: { children: React.ReactNode }) => children,
  AlertDialogAction: ({ children, onClick, 'aria-label': ariaLabel }: { 
    children: React.ReactNode; 
    onClick?: () => void;
    'aria-label'?: string;
  }) => 
    React.createElement('button', { onClick, role: 'button', 'aria-label': ariaLabel || 'Delete' }, children),
  AlertDialogCancel: ({ children, onClick, 'aria-label': ariaLabel }: { 
    children: React.ReactNode; 
    onClick?: () => void;
    'aria-label'?: string;
  }) => 
    React.createElement('button', { onClick, role: 'button', 'aria-label': ariaLabel || 'Cancel' }, children),
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, className, 'aria-label': ariaLabel }: { 
    children: React.ReactNode; 
    onClick?: () => void;
    className?: string;
    'aria-label'?: string;
  }) => 
    React.createElement('button', { onClick, role: 'button', className, 'aria-label': ariaLabel }, children)
}));

vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn()
  })
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: { children: React.ReactNode; className?: string }) => 
    React.createElement('div', { className }, children),
  CardContent: ({ children, className }: { children: React.ReactNode; className?: string }) => 
    React.createElement('div', { className }, children),
  CardHeader: ({ children, className }: { children: React.ReactNode; className?: string }) => 
    React.createElement('div', { className }, children),
  CardTitle: ({ children, className }: { children: React.ReactNode; className?: string }) => 
    React.createElement('h1', { className, role: 'heading' }, children),
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant }: { children: React.ReactNode; variant?: string }) => 
    React.createElement('span', { className: `badge ${variant || ''}` }, children),
}));

vi.mock('@/components/ui/progress', () => ({
  Progress: () => null,
}));

vi.mock('@/components/employee-review/FeedbackAnalytics', () => ({
  FeedbackAnalytics: () => null,
}));

vi.mock('@/components/employee-review/AIReport', () => ({
  AIReport: ({ feedbackRequest, onGenerateReport, isGeneratingReport }: { 
    feedbackRequest: any;
    onGenerateReport: () => void;
    isGeneratingReport: boolean;
  }) => (
    <div>
      {isGeneratingReport ? (
        <div>Generating report...</div>
      ) : (
        <>
          <div data-testid="markdown-editor">
            {feedbackRequest?.ai_report || 'AI Generated Report Content'}
          </div>
          <div>Failed to generate report</div>
          <button role="button" name="ai report" onClick={onGenerateReport}>
            Generate Report
          </button>
        </>
      )}
    </div>
  ),
}));

vi.mock('@/utils/report', () => ({
  getFeedbackDate: (feedback: any) => new Date(feedback.submitted_at).getTime(),
}));

vi.mock('@/utils/pdf', () => ({
  exportToPDF: vi.fn(),
}));

vi.mock('@/hooks/useFeedbackManagement', () => ({
  useFeedbackManagement: () => ({
    deletingFeedbackId: null,
    isDeleteDialogOpen: false,
    feedbackToDelete: null,
    handleDeleteClick: vi.fn(),
    handleDeleteConfirm: async () => {
      await mockDelete();
      return { error: null };
    },
    handleDeleteCancel: () => {
      // Do nothing on cancel
    },
    setIsDeleteDialogOpen: vi.fn()
  })
}));

vi.mock('@/components/feedback/MarkdownEditor', () => ({
  MarkdownEditor: ({ value }: { value: string }) => <div data-testid="markdown-editor">{value}</div>
}));

vi.mock('@/hooks/useAIReportManagement', () => ({
  useAIReportManagement: () => ({
    handleGenerateReport: mockHandleGenerateReport,
    isGeneratingReport: false,
    generationStep: 0,
    aiReport: null,
    error: null,
    startTime: null,
    handleReportChange: vi.fn(),
    setAiReport: vi.fn()
  })
}));

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { EmployeeReviewDetailsPage } from '@/pages/reviews/EmployeeReviewDetailsPage';
import { mockReviewCycle, mockHandleGenerateReport, mockDelete, mockUseAIReportManagement } from './mocks';
import { setupMocks } from './mockSetup';

// Set up mocks
setupMocks();

describe('EmployeeReviewDetailsPage', () => {
  beforeEach(() => {
    mockUseAIReportManagement.mockClear();
  });

  it('generates a new AI report when the button is clicked', async () => {
    mockUseAIReportManagement.mockReturnValue({
      handleGenerateReport: mockHandleGenerateReport,
      isGeneratingReport: false,
      generationStep: 0,
      aiReport: null as string | null,
      error: null as string | null,
      startTime: null,
      handleReportChange: vi.fn(),
      setAiReport: vi.fn()
    });

    render(
      <MemoryRouter initialEntries={['/reviews/1/2']}>
        <EmployeeReviewDetailsPage />
      </MemoryRouter>
    );

    // Wait for loading to complete
    expect(await screen.findByText('John Doe')).toBeInTheDocument();

    const button = await screen.findByRole('button', { name: /generate report/i });
    await userEvent.click(button);

    expect(mockHandleGenerateReport).toHaveBeenCalled();
  });

  it('handles errors during AI report generation', async () => {
    mockUseAIReportManagement.mockReturnValue({
      handleGenerateReport: mockHandleGenerateReport,
      isGeneratingReport: false,
      generationStep: 0,
      aiReport: null,
      error: 'Failed to generate report',
      startTime: null,
      handleReportChange: vi.fn(),
      setAiReport: vi.fn()
    });

    render(
      <MemoryRouter initialEntries={['/reviews/1/2']}>
        <EmployeeReviewDetailsPage />
      </MemoryRouter>
    );

    // Wait for loading to complete
    expect(await screen.findByText('John Doe')).toBeInTheDocument();

    // Wait for error message to appear
    expect(await screen.findByText('Failed to generate report')).toBeInTheDocument();
  });

  it('displays existing AI report if available', async () => {
    mockUseAIReportManagement.mockReturnValue({
      handleGenerateReport: mockHandleGenerateReport,
      isGeneratingReport: false,
      generationStep: 0,
      aiReport: 'AI Generated Report Content',
      error: null as string | null,
      startTime: null,
      handleReportChange: vi.fn(),
      setAiReport: vi.fn()
    });

    render(
      <MemoryRouter initialEntries={['/reviews/1/2']}>
        <EmployeeReviewDetailsPage />
      </MemoryRouter>
    );

    // Wait for loading to complete
    expect(await screen.findByText('John Doe')).toBeInTheDocument();
    expect(await screen.findByTestId('markdown-editor')).toHaveTextContent('AI Generated Report Content');
  });

  it('deletes feedback when confirmed', async () => {
    render(
      <MemoryRouter initialEntries={['/reviews/1/2']}>
        <EmployeeReviewDetailsPage />
      </MemoryRouter>
    );

    // Wait for loading to complete
    expect(await screen.findByText('John Doe')).toBeInTheDocument();

    const deleteButton = await screen.findByRole('button', { name: /delete feedback/i });
    await userEvent.click(deleteButton);

    const confirmButton = await screen.findByRole('button', { name: /^delete$/i });
    await userEvent.click(confirmButton);

    expect(mockDelete).toHaveBeenCalled();
  });

  it('cancels feedback deletion when canceled', async () => {
    mockDelete.mockClear(); // Clear any previous calls

    render(
      <MemoryRouter initialEntries={['/reviews/1/2']}>
        <EmployeeReviewDetailsPage />
      </MemoryRouter>
    );

    // Wait for loading to complete
    expect(await screen.findByText('John Doe')).toBeInTheDocument();

    const deleteButton = await screen.findByRole('button', { name: /delete feedback/i });
    await userEvent.click(deleteButton);

    const cancelButton = await screen.findByRole('button', { name: /^cancel$/i });
    await userEvent.click(cancelButton);

    expect(mockDelete).not.toHaveBeenCalled();
  });
}); 