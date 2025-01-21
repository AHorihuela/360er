import React from 'react';
import { vi } from 'vitest';
import { mockFrom, mockUseAIReportManagement } from './mocks';

export function setupMocks() {
  // Mock react-router-dom
  vi.mock('react-router-dom', () => ({
    useParams: () => ({
      cycleId: '123e4567-e89b-12d3-a456-426614174000',
      employeeId: '123e4567-e89b-12d3-a456-426614174001'
    }),
    useNavigate: () => vi.fn(),
    MemoryRouter: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children),
    Route: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children),
    Routes: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children)
  }));

  // Mock useToast
  vi.mock('@/components/ui/use-toast', () => ({
    useToast: () => ({
      toast: vi.fn()
    })
  }));

  // Mock useAIReportManagement
  vi.mock('@/hooks/useAIReportManagement', () => ({
    useAIReportManagement: mockUseAIReportManagement
  }));

  // Mock supabase
  vi.mock('@/lib/supabase', () => ({
    supabase: {
      from: mockFrom
    }
  }));

  // Mock scrollIntoView
  Element.prototype.scrollIntoView = vi.fn();

  // Mock AlertDialog components
  vi.mock('@/components/ui/alert-dialog', () => ({
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
  }));
} 