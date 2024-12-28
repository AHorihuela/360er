import OpenAI from 'openai';
import { FeedbackResponse } from '@/types/review';

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

const SYSTEM_PROMPT = `You are assisting a manager in creating a 360-degree feedback report. Your task is to analyze feedback from multiple reviewers and create a comprehensive report that combines the manager's perspective with insights from the feedback.

Follow these guidelines:
1. Structure the report into clear sections:
   - Executive Summary (briefly introducing the review's purpose and scope)
   - Key Strengths (highlighting consistent themes and notable achievements)
   - Areas for Development (constructive feedback and growth opportunities)
   - Recommendations (actionable suggestions for improvement)
2. Maintain anonymity while incorporating specific feedback insights
3. Use a balanced, professional tone that reflects managerial oversight
4. Include relevant quotes (marked with quotation marks) to support key points
5. Quantify feedback when multiple reviewers share similar sentiments
6. Focus on specific, actionable insights
7. Ensure a balanced perspective between strengths and development areas
8. End with clear, actionable recommendations for growth

Format the report in markdown for easy reading.`;

const USER_PROMPT_TEMPLATE = `Please analyze the following feedback data and create a comprehensive 360-degree feedback report that combines managerial oversight with team insights.

FEEDBACK DATA:
{feedbackData}

Generate a report that:
1. Synthesizes the feedback into clear, actionable insights
2. Incorporates specific examples and quotes from the feedback
3. Quantifies feedback when multiple reviewers share similar views
4. Provides concrete, actionable recommendations
5. Maintains a professional and constructive tone
6. Concludes with specific development goals and growth opportunities`;

export async function generateAIReport(
  employeeName: string,
  employeeRole: string,
  feedback: FeedbackResponse[]
): Promise<string> {
  try {
    console.log('Formatting feedback for prompt...');
    const formattedFeedback = formatFeedbackForPrompt(employeeName, employeeRole, feedback);
    const userPrompt = USER_PROMPT_TEMPLATE.replace('{feedbackData}', formattedFeedback);

    console.log('Sending request to OpenAI...');
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 2000
    });

    console.log('OpenAI response received:', response.choices[0]?.message);
    const markdownContent = response.choices[0]?.message?.content || 'Failed to generate report';
    console.log('Markdown content:', markdownContent.substring(0, 200) + '...');
    
    // Replace the title with the correct employee name
    const updatedMarkdown = markdownContent.replace(
      /# [\s\S]*?(?=##)/,
      `# 360-Degree Feedback Analysis Report for ${employeeName} (${employeeRole})\n\n`
    );
    
    console.log('Final markdown:', updatedMarkdown.substring(0, 200) + '...');
    if (!updatedMarkdown.trim()) {
      throw new Error('Generated report is empty');
    }
    
    return updatedMarkdown;
  } catch (error) {
    console.error('Error generating AI report:', error);
    throw error;
  }
} 