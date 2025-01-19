import { vi } from 'vitest';
import React from 'react';

// Types
export type GenerationStep = 0 | 1 | 2 | 3;

// Mock data
export const mockReviewCycle = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  employee_name: 'John Doe',
  employee_title: 'Software Engineer',
  feedback_requests: [
    {
      id: '123e4567-e89b-12d3-a456-426614174002',
      employee_id: '123e4567-e89b-12d3-a456-426614174001',
      status: 'completed',
      target_responses: 5,
      unique_link: 'unique-link-1',
      employee: {
        id: '123e4567-e89b-12d3-a456-426614174001',
        name: 'John Doe',
        role: 'Software Engineer'
      },
      feedback_responses: [
        {
          id: '123e4567-e89b-12d3-a456-426614174003',
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
export const mockDelete = vi.fn().mockResolvedValue({ data: null, error: null });
export const mockEq = vi.fn().mockReturnThis();
export const mockSelect = vi.fn().mockReturnThis();
export const mockSingle = vi.fn().mockResolvedValue({ data: mockReviewCycle, error: null });
export const mockFrom = vi.fn().mockImplementation((table: string) => ({
  select: mockSelect,
  eq: mockEq,
  single: mockSingle,
  delete: mockDelete,
}));

// Mock components
export const AlertDialog: React.FC<{ children: React.ReactNode }> = ({ children }) => <div>{children}</div>;
export const AlertDialogTrigger: React.FC<{ children: React.ReactNode }> = ({ children }) => <>{children}</>;
export const AlertDialogContent: React.FC<{ children: React.ReactNode }> = ({ children }) => <div>{children}</div>;
export const AlertDialogHeader: React.FC<{ children: React.ReactNode }> = ({ children }) => <div>{children}</div>;
export const AlertDialogTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => <div>{children}</div>;
export const AlertDialogDescription: React.FC<{ children: React.ReactNode }> = ({ children }) => <div>{children}</div>;
export const AlertDialogFooter: React.FC<{ children: React.ReactNode }> = ({ children }) => <div>{children}</div>;
export const AlertDialogAction: React.FC<{ children: React.ReactNode; onClick?: () => void }> = ({ children, onClick }) => (
  <button onClick={onClick}>{children}</button>
);
export const AlertDialogCancel: React.FC<{ children: React.ReactNode; onClick?: () => void }> = ({ children, onClick }) => (
  <button onClick={onClick}>{children}</button>
);

// Mock hooks
export const mockUseAIReportManagement = vi.fn(() => ({
  handleGenerateReport: mockHandleGenerateReport,
  isGeneratingReport: false,
  generationStep: 0 as GenerationStep,
  aiReport: null as string | null,
  error: null,
  startTime: null,
  handleReportChange: vi.fn(),
  setAiReport: vi.fn()
})); 