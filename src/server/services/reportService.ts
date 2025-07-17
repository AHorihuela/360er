import OpenAI from 'openai';
import { getReportSystemPrompt, MANAGER_EFFECTIVENESS_PROMPT, M2E_INLINE_PROMPT } from '../prompts/reportPrompts';

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Define interfaces for type safety
interface FeedbackItem {
  strengths: string;
  areas_for_improvement: string;
  relationship: string;
  responses?: any;
  created_at?: string;
}

interface TimeRange {
  startDate: string;
  endDate: string;
  label?: string;
}

interface ReportGenerationRequest {
  employeeName: string;
  employeeRole: string;
  feedback: FeedbackItem[];
  surveyType: string;
  surveyQuestions?: Record<string, string>;
  timeRange?: TimeRange;
}

export class ReportService {
  async generateReport(request: ReportGenerationRequest): Promise<string> {
    const { employeeName, employeeRole, feedback, surveyType, surveyQuestions, timeRange } = request;

    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured');
    }

    // Determine which system prompt to use based on survey type
    let systemPrompt = getReportSystemPrompt(surveyType);
    let userContent = '';

    if (surveyType === 'manager_effectiveness') {
      systemPrompt = MANAGER_EFFECTIVENESS_PROMPT;
      userContent = this.generateManagerEffectivenessContent(feedback, surveyQuestions, employeeName, employeeRole);
    } else if (surveyType === 'manager_to_employee') {
      systemPrompt = M2E_INLINE_PROMPT;
      userContent = this.generateManagerToEmployeeContent(feedback, timeRange, employeeName, employeeRole);
    } else {
      // Standard 360 review
      userContent = this.generate360ReviewContent(feedback, employeeName, employeeRole);
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent }
      ],
      temperature: 0.7,
      max_tokens: 4000
    });

    const reportContent = completion.choices[0].message.content;

    if (!reportContent) {
      throw new Error('Failed to generate report content from OpenAI');
    }

    return reportContent;
  }

  private generateManagerEffectivenessContent(
    feedback: FeedbackItem[], 
    surveyQuestions: Record<string, string> | undefined, 
    employeeName: string, 
    employeeRole: string
  ): string {
    const processedResponses = feedback.map((response: FeedbackItem) => ({
      responses: response.responses,
      relationship: response.relationship,
      strengths: response.strengths,
      areas_for_improvement: response.areas_for_improvement
    }));

    return `Generate a manager effectiveness report for ${employeeName} (${employeeRole}).

Survey Questions: ${JSON.stringify(surveyQuestions, null, 2)}

Feedback Responses: ${JSON.stringify(processedResponses, null, 2)}

Total responses: ${feedback.length}`;
  }

  private generateManagerToEmployeeContent(
    feedback: FeedbackItem[], 
    timeRange: TimeRange | undefined, 
    employeeName: string, 
    employeeRole: string
  ): string {
    // Filter feedback by time range if provided
    let filteredFeedback = feedback;
    let timeRangeText = 'all available feedback';
    
    if (timeRange && timeRange.startDate && timeRange.endDate) {
      const startDate = new Date(timeRange.startDate);
      const endDate = new Date(timeRange.endDate);
      
      filteredFeedback = feedback.filter((f: FeedbackItem) => {
        if (!f.created_at) return true; // Include feedback without dates
        const feedbackDate = new Date(f.created_at);
        return feedbackDate >= startDate && feedbackDate <= endDate;
      });
      
      // Format the time range for the prompt
      const formatDate = (date: Date) => date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
      
      timeRangeText = `feedback from ${formatDate(startDate)} to ${formatDate(endDate)}`;
      
      if (timeRange.label) {
        timeRangeText += ` (${timeRange.label})`;
      }
    }

    const managerFeedback = filteredFeedback.map((f: FeedbackItem) => {
      // M2E feedback might have content in either strengths OR areas_for_improvement
      // Combine both fields, filtering out empty ones
      const combinedContent = [f.strengths, f.areas_for_improvement]
        .filter(content => content && content.trim().length > 0)
        .join(' ');
      
      return {
        feedback: combinedContent || 'No content provided',
        timestamp: f.created_at || 'N/A'
      };
    });

    return `Generate a manager-to-employee feedback report for ${employeeName} (${employeeRole}).

Time Period: This report covers ${timeRangeText}.
Total feedback entries in period: ${filteredFeedback.length}
${feedback.length !== filteredFeedback.length ? `(Filtered from ${feedback.length} total entries)` : ''}

Manager Feedback Entries:
${managerFeedback.map((f, i) => `${i + 1}. ${f.feedback} (${f.timestamp})`).join('\n\n')}`;
  }

  private generate360ReviewContent(
    feedback: FeedbackItem[], 
    employeeName: string, 
    employeeRole: string
  ): string {
    const feedbackByRelationship = feedback.reduce((acc: Record<string, Array<{strengths: string, areas_for_improvement: string}>>, response: FeedbackItem) => {
      if (!acc[response.relationship]) {
        acc[response.relationship] = [];
      }
      acc[response.relationship].push({
        strengths: response.strengths,
        areas_for_improvement: response.areas_for_improvement
      });
      return acc;
    }, {});

    return `Generate a comprehensive 360-degree feedback report for ${employeeName} (${employeeRole}).

Feedback organized by relationship:
${Object.entries(feedbackByRelationship).map(([relationship, responses]) => 
  `${relationship.toUpperCase()}:\n${responses.map((r, i) => 
    `Response ${i + 1}:\nStrengths: ${r.strengths}\nAreas for Improvement: ${r.areas_for_improvement}`
  ).join('\n\n')}`
).join('\n\n')}

Total reviewers: ${feedback.length}`;
  }
} 