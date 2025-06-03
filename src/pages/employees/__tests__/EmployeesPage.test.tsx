import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import * as matchers from '@testing-library/jest-dom/matchers';
import { EmployeesPage } from '../EmployeesPage';

// Extend expect with jest-dom matchers
expect.extend(matchers);

// Mock dependencies
const mockNavigate = vi.fn();
const mockToast = vi.fn();
const mockUser = {
  id: 'user-123',
  email: 'test@example.com'
};

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: mockUser,
    isMasterAccount: false,
    viewingAllAccounts: false
  }),
}));

// Mock Supabase
const mockSupabaseAuth = {
  getUser: vi.fn()
};

const mockSupabaseFrom = vi.fn();
const mockSupabaseSelect = vi.fn();
const mockSupabaseEq = vi.fn();
const mockSupabaseOrder = vi.fn();
const mockSupabaseInsert = vi.fn();
const mockSupabaseUpdate = vi.fn();
const mockSupabaseDelete = vi.fn();
const mockSupabaseSingle = vi.fn();
const mockSupabaseIn = vi.fn();

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: mockSupabaseAuth,
    from: mockSupabaseFrom,
  },
}));

// Sample test data
const sampleEmployees = [
  {
    id: 'emp1',
    name: 'John Doe',
    role: 'Software Engineer',
    user_id: 'user-123',
    created_at: '2023-01-01T00:00:00Z',
    feedback_requests: [
      {
        id: 'req1',
        review_cycle_id: 'cycle1',
        created_at: '2023-06-01T00:00:00Z'
      }
    ]
  },
  {
    id: 'emp2',
    name: 'Jane Smith',
    role: 'Product Manager',
    user_id: 'user-123',
    created_at: '2023-01-02T00:00:00Z',
    feedback_requests: []
  }
];

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>{children}</BrowserRouter>
);

describe('EmployeesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default Supabase mocks
    mockSupabaseAuth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null
    });

    mockSupabaseFrom.mockReturnValue({
      select: mockSupabaseSelect,
      insert: mockSupabaseInsert,
      update: mockSupabaseUpdate,
      delete: mockSupabaseDelete,
    });

    mockSupabaseSelect.mockReturnValue({
      eq: mockSupabaseEq,
      order: mockSupabaseOrder,
      in: mockSupabaseIn,
    });

    mockSupabaseEq.mockReturnValue({
      eq: mockSupabaseEq,
      order: mockSupabaseOrder,
    });

    mockSupabaseOrder.mockResolvedValue({
      data: sampleEmployees,
      error: null
    });

    mockSupabaseInsert.mockReturnValue({
      select: () => ({
        single: mockSupabaseSingle
      })
    });

    mockSupabaseUpdate.mockReturnValue({
      eq: mockSupabaseEq
    });

    mockSupabaseDelete.mockReturnValue({
      eq: mockSupabaseEq
    });

    mockSupabaseIn.mockResolvedValue({
      data: [
        { feedback_request_id: 'req1' },
        { feedback_request_id: 'req1' }
      ],
      error: null
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Component Rendering', () => {
    it('should render the main page elements', async () => {
      render(<EmployeesPage />, { wrapper: TestWrapper });

      expect(screen.getByText('Team Members')).toBeInTheDocument();
      expect(screen.getByText('Manage your team members')).toBeInTheDocument();
      expect(screen.getByText('Add Team Member')).toBeInTheDocument();
    });

    it('should show loading state initially', async () => {
      render(<EmployeesPage />, { wrapper: TestWrapper });

      expect(screen.getByText('Loading team members...')).toBeInTheDocument();
    });

    it('should display employees after loading', async () => {
      render(<EmployeesPage />, { wrapper: TestWrapper });

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('Software Engineer')).toBeInTheDocument();
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
        expect(screen.getByText('Product Manager')).toBeInTheDocument();
      });
    });

    it('should show empty state when no employees exist', async () => {
      mockSupabaseOrder.mockResolvedValue({
        data: [],
        error: null
      });

      render(<EmployeesPage />, { wrapper: TestWrapper });

      await waitFor(() => {
        expect(screen.getByText('No team members found')).toBeInTheDocument();
        expect(screen.getByText('Add your first team member to start collecting feedback')).toBeInTheDocument();
      });
    });
  });

  describe('Employee Data Fetching', () => {
    it('should fetch employees with correct query parameters', async () => {
      render(<EmployeesPage />, { wrapper: TestWrapper });

      await waitFor(() => {
        expect(mockSupabaseFrom).toHaveBeenCalledWith('employees');
        expect(mockSupabaseSelect).toHaveBeenCalledWith(expect.stringContaining('feedback_requests'));
        expect(mockSupabaseEq).toHaveBeenCalledWith('user_id', 'user-123');
        expect(mockSupabaseOrder).toHaveBeenCalledWith('created_at', { ascending: false });
      });
    });

    it('should handle authentication errors', async () => {
      mockSupabaseAuth.getUser.mockResolvedValue({
        data: { user: null },
        error: null
      });

      render(<EmployeesPage />, { wrapper: TestWrapper });

      await waitFor(() => {
        expect(screen.getByText('No authenticated user found')).toBeInTheDocument();
      });
    });

    it('should handle database errors', async () => {
      mockSupabaseOrder.mockResolvedValue({
        data: null,
        error: { message: 'Database connection failed' }
      });

      render(<EmployeesPage />, { wrapper: TestWrapper });

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: "Error",
          description: "Failed to load employees. Please try again.",
          variant: "destructive",
        });
      });
    });

    it('should fetch and display response counts for feedback requests', async () => {
      render(<EmployeesPage />, { wrapper: TestWrapper });

      await waitFor(() => {
        expect(mockSupabaseIn).toHaveBeenCalledWith('feedback_request_id', ['req1']);
      });

      await waitFor(() => {
        // Should show response count badge
        const responseCountBadge = screen.getByText('2');
        expect(responseCountBadge).toBeInTheDocument();
      });
    });
  });

  describe('Employee Creation', () => {
    it('should open add employee modal when button is clicked', async () => {
      render(<EmployeesPage />, { wrapper: TestWrapper });

      await waitFor(() => {
        fireEvent.click(screen.getByText('Add Team Member'));
      });

      expect(screen.getByText('Add Team Member')).toBeInTheDocument();
      expect(screen.getByLabelText('Name')).toBeInTheDocument();
      expect(screen.getByLabelText('Role')).toBeInTheDocument();
    });

    it('should create new employee successfully', async () => {
      const newEmployee = {
        id: 'emp3',
        name: 'Bob Johnson',
        role: 'Designer',
        user_id: 'user-123',
        created_at: '2023-01-03T00:00:00Z'
      };

      mockSupabaseSingle.mockResolvedValue({
        data: newEmployee,
        error: null
      });

      mockSupabaseEq.mockResolvedValue({
        error: null
      });

      render(<EmployeesPage />, { wrapper: TestWrapper });

      await waitFor(() => {
        fireEvent.click(screen.getByText('Add Team Member'));
      });

      fireEvent.change(screen.getByLabelText('Name'), {
        target: { value: 'Bob Johnson' }
      });
      fireEvent.change(screen.getByLabelText('Role'), {
        target: { value: 'Designer' }
      });

      fireEvent.click(screen.getByText('Create'));

      await waitFor(() => {
        expect(mockSupabaseInsert).toHaveBeenCalledWith([{
          name: 'Bob Johnson',
          role: 'Designer',
          user_id: 'user-123'
        }]);
        expect(mockToast).toHaveBeenCalledWith({
          title: "Success",
          description: "Employee added successfully",
        });
      });
    });

    it('should handle employee creation errors', async () => {
      mockSupabaseSingle.mockResolvedValue({
        data: null,
        error: { message: 'Validation failed' }
      });

      render(<EmployeesPage />, { wrapper: TestWrapper });

      await waitFor(() => {
        fireEvent.click(screen.getByText('Add Team Member'));
      });

      fireEvent.change(screen.getByLabelText('Name'), {
        target: { value: 'Test User' }
      });
      fireEvent.change(screen.getByLabelText('Role'), {
        target: { value: 'Test Role' }
      });

      fireEvent.click(screen.getByText('Create'));

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: "Error",
          description: "Failed to add employee",
          variant: "destructive",
        });
      });
    });
  });

  describe('Employee Editing', () => {
    it('should open edit modal with pre-filled data', async () => {
      render(<EmployeesPage />, { wrapper: TestWrapper });

      await waitFor(() => {
        const editButtons = screen.getAllByRole('button');
        const editButton = editButtons.find(button => 
          button.querySelector('[class*="Pencil"]')
        );
        if (editButton) {
          fireEvent.click(editButton);
        }
      });

      await waitFor(() => {
        expect(screen.getByText('Edit Team Member')).toBeInTheDocument();
        expect(screen.getByDisplayValue('John Doe')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Software Engineer')).toBeInTheDocument();
      });
    });

    it('should update employee successfully', async () => {
      mockSupabaseEq.mockResolvedValue({
        error: null
      });

      render(<EmployeesPage />, { wrapper: TestWrapper });

      await waitFor(() => {
        const editButtons = screen.getAllByRole('button');
        const editButton = editButtons.find(button => 
          button.querySelector('[class*="Pencil"]')
        );
        if (editButton) {
          fireEvent.click(editButton);
        }
      });

      await waitFor(() => {
        fireEvent.change(screen.getByDisplayValue('John Doe'), {
          target: { value: 'John Updated' }
        });
        fireEvent.change(screen.getByDisplayValue('Software Engineer'), {
          target: { value: 'Senior Engineer' }
        });
      });

      fireEvent.click(screen.getByText('Update'));

      await waitFor(() => {
        expect(mockSupabaseUpdate).toHaveBeenCalledWith({
          name: 'John Updated',
          role: 'Senior Engineer'
        });
        expect(mockToast).toHaveBeenCalledWith({
          title: "Success",
          description: "Employee updated successfully",
        });
      });
    });
  });

  describe('Employee Deletion', () => {
    it('should show confirmation dialog when delete is clicked', async () => {
      render(<EmployeesPage />, { wrapper: TestWrapper });

      await waitFor(() => {
        const deleteButtons = screen.getAllByRole('button');
        const deleteButton = deleteButtons.find(button => 
          button.querySelector('[class*="Trash2"]')
        );
        if (deleteButton) {
          fireEvent.click(deleteButton);
        }
      });

      await waitFor(() => {
        expect(screen.getByText('Are you sure?')).toBeInTheDocument();
        expect(screen.getByText('This will permanently delete this team member and all associated feedback.')).toBeInTheDocument();
      });
    });

    it('should delete employee successfully', async () => {
      mockSupabaseEq.mockResolvedValue({
        error: null
      });

      render(<EmployeesPage />, { wrapper: TestWrapper });

      await waitFor(() => {
        const deleteButtons = screen.getAllByRole('button');
        const deleteButton = deleteButtons.find(button => 
          button.querySelector('[class*="Trash2"]')
        );
        if (deleteButton) {
          fireEvent.click(deleteButton);
        }
      });

      await waitFor(() => {
        fireEvent.click(screen.getByText('Delete'));
      });

      await waitFor(() => {
        expect(mockSupabaseDelete).toHaveBeenCalled();
        expect(mockToast).toHaveBeenCalledWith({
          title: "Success",
          description: "Employee deleted successfully",
        });
      });
    });

    it('should cancel deletion when cancel is clicked', async () => {
      render(<EmployeesPage />, { wrapper: TestWrapper });

      await waitFor(() => {
        const deleteButtons = screen.getAllByRole('button');
        const deleteButton = deleteButtons.find(button => 
          button.querySelector('[class*="Trash2"]')
        );
        if (deleteButton) {
          fireEvent.click(deleteButton);
        }
      });

      fireEvent.click(screen.getByText('Cancel'));

      await waitFor(() => {
        expect(screen.queryByText('Are you sure?')).not.toBeInTheDocument();
      });
    });
  });

  describe('Review Navigation', () => {
    it('should navigate to review page when view review button is clicked', async () => {
      render(<EmployeesPage />, { wrapper: TestWrapper });

      await waitFor(() => {
        const reviewButtons = screen.getAllByRole('button');
        const reviewButton = reviewButtons.find(button => 
          button.querySelector('[class*="FileText"]')
        );
        if (reviewButton) {
          fireEvent.click(reviewButton);
        }
      });

      expect(mockNavigate).toHaveBeenCalledWith('/reviews/cycle1/employee/emp1');
    });

    it('should only show review button for employees with feedback requests', async () => {
      render(<EmployeesPage />, { wrapper: TestWrapper });

      await waitFor(() => {
        const tableRows = screen.getAllByRole('row');
        
        // John Doe should have review button (has feedback request)
        const johnRow = tableRows.find(row => 
          within(row).queryByText('John Doe')
        );
        expect(within(johnRow!).getByRole('button', { name: /View Latest Review/i })).toBeInTheDocument();

        // Jane Smith should not have review button (no feedback requests)
        const janeRow = tableRows.find(row => 
          within(row).queryByText('Jane Smith')
        );
        expect(within(janeRow!).queryByRole('button', { name: /View Latest Review/i })).not.toBeInTheDocument();
      });
    });
  });

  describe('Form Validation', () => {
    it('should require name field', async () => {
      render(<EmployeesPage />, { wrapper: TestWrapper });

      await waitFor(() => {
        fireEvent.click(screen.getByText('Add Team Member'));
      });

      const nameInput = screen.getByLabelText('Name');
      expect(nameInput).toHaveAttribute('required');
    });

    it('should require role field', async () => {
      render(<EmployeesPage />, { wrapper: TestWrapper });

      await waitFor(() => {
        fireEvent.click(screen.getByText('Add Team Member'));
      });

      const roleInput = screen.getByLabelText('Role');
      expect(roleInput).toHaveAttribute('required');
    });

    it('should clear form when modal is closed', async () => {
      render(<EmployeesPage />, { wrapper: TestWrapper });

      await waitFor(() => {
        fireEvent.click(screen.getByText('Add Team Member'));
      });

      fireEvent.change(screen.getByLabelText('Name'), {
        target: { value: 'Test Name' }
      });

      fireEvent.click(screen.getByText('Cancel'));

      // Reopen modal
      fireEvent.click(screen.getByText('Add Team Member'));

      expect(screen.getByLabelText('Name')).toHaveValue('');
    });
  });

  describe('Loading States', () => {
    it('should show loading state during employee creation', async () => {
      // Mock slow response
      mockSupabaseSingle.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ data: {}, error: null }), 100))
      );

      render(<EmployeesPage />, { wrapper: TestWrapper });

      await waitFor(() => {
        fireEvent.click(screen.getByText('Add Team Member'));
      });

      fireEvent.change(screen.getByLabelText('Name'), {
        target: { value: 'Test User' }
      });
      fireEvent.change(screen.getByLabelText('Role'), {
        target: { value: 'Test Role' }
      });

      fireEvent.click(screen.getByText('Create'));

      expect(screen.getByText('Saving...')).toBeInTheDocument();
    });

    it('should show loading state during employee deletion', async () => {
      // Mock slow response
      mockSupabaseEq.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ error: null }), 100))
      );

      render(<EmployeesPage />, { wrapper: TestWrapper });

      await waitFor(() => {
        const deleteButtons = screen.getAllByRole('button');
        const deleteButton = deleteButtons.find(button => 
          button.querySelector('[class*="Trash2"]')
        );
        if (deleteButton) {
          fireEvent.click(deleteButton);
        }
      });

      fireEvent.click(screen.getByText('Delete'));

      await waitFor(() => {
        expect(screen.getByText('Deleting...')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should display error state when fetch fails', async () => {
      mockSupabaseOrder.mockResolvedValue({
        data: null,
        error: { message: 'Network error' }
      });

      render(<EmployeesPage />, { wrapper: TestWrapper });

      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });
    });

    it('should handle update errors gracefully', async () => {
      mockSupabaseEq.mockResolvedValue({
        error: { message: 'Update failed' }
      });

      render(<EmployeesPage />, { wrapper: TestWrapper });

      await waitFor(() => {
        const editButtons = screen.getAllByRole('button');
        const editButton = editButtons.find(button => 
          button.querySelector('[class*="Pencil"]')
        );
        if (editButton) {
          fireEvent.click(editButton);
        }
      });

      await waitFor(() => {
        fireEvent.click(screen.getByText('Update'));
      });

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: "Error",
          description: "Failed to update employee",
          variant: "destructive",
        });
      });
    });
  });

  describe('Data Processing', () => {
    it('should correctly process latest feedback request for each employee', async () => {
      const employeeWithMultipleRequests = {
        ...sampleEmployees[0],
        feedback_requests: [
          {
            id: 'req1',
            review_cycle_id: 'cycle1',
            created_at: '2023-06-01T00:00:00Z'
          },
          {
            id: 'req2',
            review_cycle_id: 'cycle2',
            created_at: '2023-07-01T00:00:00Z' // More recent
          }
        ]
      };

      mockSupabaseOrder.mockResolvedValue({
        data: [employeeWithMultipleRequests],
        error: null
      });

      render(<EmployeesPage />, { wrapper: TestWrapper });

      await waitFor(() => {
        // Should use the most recent feedback request (req2)
        expect(mockSupabaseIn).toHaveBeenCalledWith('feedback_request_id', ['req2']);
      });
    });

    it('should handle employees with no feedback requests', async () => {
      const employeeWithoutRequests = {
        ...sampleEmployees[1],
        feedback_requests: []
      };

      mockSupabaseOrder.mockResolvedValue({
        data: [employeeWithoutRequests],
        error: null
      });

      render(<EmployeesPage />, { wrapper: TestWrapper });

      await waitFor(() => {
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
        // Should not try to fetch response counts for empty array
        expect(mockSupabaseIn).not.toHaveBeenCalled();
      });
    });
  });
});