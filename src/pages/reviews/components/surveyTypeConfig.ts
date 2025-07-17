import { Users, TrendingUp, MessageSquare } from 'lucide-react';
import { ReviewCycleType } from '@/types/survey';

export interface SurveyTypeConfig {
  title: string;
  description: string;
  icon: typeof Users;
  badge: string;
  color: string;
  questions: string[];
}

export const surveyTypeInfo: Record<ReviewCycleType, SurveyTypeConfig> = {
  '360_review': {
    title: '360° Feedback Review',
    description: 'Comprehensive feedback from multiple perspectives',
    icon: Users,
    badge: '360° Review',
    color: 'bg-blue-50 border-blue-200 hover:bg-blue-100',
    questions: [
      'What are this person\'s strengths?',
      'What are areas for improvement for this person?'
    ]
  },
  'manager_effectiveness': {
    title: 'Manager Effectiveness Survey',
    description: 'Structured feedback about leadership and management skills',
    icon: TrendingUp,
    badge: 'Management',
    color: 'bg-green-50 border-green-200 hover:bg-green-100',
    questions: [
      'I understand what is expected of me at work.',
      'My manager contributes to my productivity.',
      'My manager frequently provides feedback that helps me improve my performance.',
      '... and more structured questions'
    ]
  },
  'manager_to_employee': {
    title: 'Manager-to-Employee Feedback',
    description: 'Ongoing feedback cycle for continuous observations',
    icon: MessageSquare,
    badge: 'Continuous',
    color: 'bg-orange-50 border-orange-200 hover:bg-orange-100',
    questions: [
      'Capture real-time observations about performance',
      'Record specific examples and situations as they occur',
      'Generate reports for any time period (weekly, monthly, quarterly)',
      'No fixed deadlines - truly continuous feedback collection'
    ]
  }
};

export const getDefaultFormData = (type: ReviewCycleType) => {
  let defaultTitle: string;
  let defaultDate: string;
  
  switch (type) {
    case '360_review':
      defaultTitle = `360° Review - ${new Date().toLocaleDateString()}`;
      const date360 = new Date();
      date360.setDate(date360.getDate() + 30);
      defaultDate = date360.toISOString().split('T')[0];
      break;
    case 'manager_effectiveness':
      defaultTitle = `Manager Survey - ${new Date().toLocaleDateString()}`;
      const dateManager = new Date();
      dateManager.setDate(dateManager.getDate() + 30);
      defaultDate = dateManager.toISOString().split('T')[0];
      break;
    case 'manager_to_employee':
      defaultTitle = `Manager to Employee Feedback`;
      const dateContinuous = new Date();
      dateContinuous.setFullYear(dateContinuous.getFullYear() + 10);
      defaultDate = dateContinuous.toISOString().split('T')[0];
      break;
    default:
      defaultTitle = `Review Cycle - ${new Date().toLocaleDateString()}`;
      const dateDefault = new Date();
      dateDefault.setDate(dateDefault.getDate() + 30);
      defaultDate = dateDefault.toISOString().split('T')[0];
  }
  
  return { defaultTitle, defaultDate };
}; 