import OpenAI from 'openai';
import { FeedbackResponse } from '@/types/review';
import { marked } from 'marked';

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true
});

function formatFeedbackForPrompt(
  employeeName: string,
  employeeRole: string,
  feedback: FeedbackResponse[]
): string {
  const formattedFeedback = feedback.map(f => `
Relationship: ${f.relationship.replace('_', ' ')}
Strengths: "${f.strengths}"
Areas for Improvement: "${f.areas_for_improvement}"
  `).join('\n');

  return `
Employee Name: ${employeeName}
Employee Role: ${employeeRole}

Feedback Received:
${formattedFeedback}
`;
}

const SYSTEM_PROMPT = `You are a professional 360-degree feedback report generator. Your task is to analyze feedback from multiple reviewers and create a comprehensive, anonymous report that highlights key themes and actionable insights.

Follow these guidelines:
1. Maintain strict anonymity - never reveal individual identities or roles
2. Structure the report into clear sections:
   - Executive Summary
   - Key Strengths (with supporting quotes)
   - Areas for Development (with supporting quotes)
   - Actionable Recommendations
3. Use a professional, constructive tone
4. Include relevant quotes (marked with quotation marks) without attribution
5. Quantify feedback when multiple reviewers share similar sentiments
6. Focus on specific, actionable insights
7. Ensure a balanced perspective between strengths and development areas
8. DO NOT include any meta-commentary about the report itself or its tone
9. End the report with the final recommendation section - no concluding remarks about the report

Format the report in markdown for easy reading.`;

const USER_PROMPT_TEMPLATE = `Please generate a 360-degree feedback report based on the following feedback data. Remember to maintain anonymity and follow the guidelines.

FEEDBACK DATA:
{feedbackData}

Generate a comprehensive report that:
1. Identifies and analyzes key themes from the feedback
2. Includes relevant anonymous quotes to support each point
3. Quantifies feedback when multiple reviewers share similar views
4. Provides specific, actionable recommendations
5. Maintains a professional and constructive tone throughout
6. Ends with the recommendations section - no meta-commentary or concluding remarks about the report itself`;

export async function generateAIReport(
  employeeName: string,
  employeeRole: string,
  feedback: FeedbackResponse[]
): Promise<string> {
  try {
    const formattedFeedback = formatFeedbackForPrompt(employeeName, employeeRole, feedback);
    const userPrompt = USER_PROMPT_TEMPLATE.replace('{feedbackData}', formattedFeedback);

    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 2000
    });

    const markdownContent = response.choices[0]?.message?.content || 'Failed to generate report';
    
    // Replace the title with the correct employee name
    const updatedMarkdown = markdownContent.replace(
      /# [\s\S]*?(?=##)/,
      `# 360-Degree Feedback Analysis Report for ${employeeName} (${employeeRole})\n\n`
    );
    
    return updatedMarkdown;
  } catch (error) {
    console.error('Error generating AI report:', error);
    throw new Error('Failed to generate AI report. Please try again.');
  }
} 