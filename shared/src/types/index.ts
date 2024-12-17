export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'manager' | 'employee';
  createdAt: string;
  updatedAt: string;
}

export interface ReviewCycle {
  id: string;
  managerId: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  status: 'draft' | 'active' | 'completed';
  createdAt: string;
  updatedAt: string;
}

export interface Reviewee {
  id: string;
  reviewCycleId: string;
  employeeId: string;
  status: 'pending' | 'in_progress' | 'completed';
  createdAt: string;
  updatedAt: string;
}

export interface Feedback {
  id: string;
  revieweeId: string;
  relationship: 'peer' | 'direct_report' | 'manager';
  strengths: string;
  improvements: string;
  rating: number;
  anonymous: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
} 