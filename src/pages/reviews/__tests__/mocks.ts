import { vi } from 'vitest';
import { GenerationStep } from '@/types/reviews/employee-review';
import React from 'react';

// Mock data
export const mockReviewCycle = {
  id: 'cycle-1',
  employee_name: 'John Doe',
  employee_title: 'Software Engineer',
  feedback_requests: [
    {
      id: 'feedback-1',
      employee_id: 'emp-1',
      status: 'completed',
      target_responses: 5,
      unique_link: 'unique-link-1',
      employee: {
        id: 'emp-1',
        name: 'John Doe',
        role: 'Software Engineer'
      },
      feedback_responses: [
        {
          submitted_at: '2024-01-01T00:00:00Z',
          relationship: 'equal_colleague',
          strengths: 'Great technical skills',
          areas_for_improvement: 'Could improve communication',
          created_at: '2024-01-01T00:00:00Z'
        }
      ],
      _count: {
        feedback_responses: 1,
        page_views: 5,
        unique_viewers: 3
      }
    }
  ]
};

// Mock functions
export const mockHandleGenerateReport = vi.fn();
export const mockDelete = vi.fn().mockResolvedValue({ error: null });
export const mockEq = vi.fn().mockReturnThis();
export const mockSelect = vi.fn().mockReturnThis();
export const mockSingle = vi.fn().mockResolvedValue({ data: mockReviewCycle, error: null });
export const mockFrom = vi.fn().mockReturnValue({
  select: mockSelect,
  eq: mockEq,
  single: mockSingle,
  delete: mockDelete,
});

// Mock components
export const mockAlertDialog = {
  AlertDialog: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children),
  AlertDialogTrigger: ({ children }: { children: React.ReactNode }) => children,
  AlertDialogContent: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children),
  AlertDialogHeader: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children),
  AlertDialogTitle: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children),
  AlertDialogDescription: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children),
  AlertDialogFooter: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children),
  AlertDialogAction: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => 
    React.createElement('button', { onClick }, children),
  AlertDialogCancel: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => 
    React.createElement('button', { onClick }, children),
};

// Mock hooks
export const mockUseAIReportManagement = vi.fn(() => ({
  handleGenerateReport: mockHandleGenerateReport,
  isGeneratingReport: false,
  generationStep: 0 as GenerationStep,
  aiReport: null as string | null,
  error: null as string | null,
  startTime: null,
  handleReportChange: vi.fn(),
  setAiReport: vi.fn()
})); 