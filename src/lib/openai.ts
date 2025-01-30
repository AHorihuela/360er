import OpenAI from 'openai';
import { CoreFeedbackResponse } from '@/types/feedback/base';

export const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true
});

function formatFeedbackForPrompt(
  employeeName: string,
  employeeRole: string,
  feedback: CoreFeedbackResponse[]
): string {
  // Group feedback by relationship
  const groupedFeedback = {
    senior: feedback.filter(f => f.relationship.includes('senior')),
    peer: feedback.filter(f => f.relationship.includes('equal')),
    junior: feedback.filter(f => f.relationship.includes('junior'))
  };

  // Format feedback statistics
  const stats = `
Feedback Overview:
- Total Reviews: ${feedback.length}
- Senior Reviews: ${groupedFeedback.senior.length}
- Peer Reviews: ${groupedFeedback.peer.length}
- Junior Reviews: ${groupedFeedback.junior.length}`;

  // Format feedback by relationship type
  const formatGroupFeedback = (group: CoreFeedbackResponse[], type: string) => {
    if (group.length === 0) return '';
    return `
${type} Feedback:
${group.map((f, i) => `
Reviewer ${i + 1}:
Strengths: "${f.strengths}"
Areas for Improvement: "${f.areas_for_improvement}"
`).join('\n')}`;
  };

  return `
Employee Information:
- Name: ${employeeName}
- Role: ${employeeRole}

${stats}

${formatGroupFeedback(groupedFeedback.senior, 'Senior')}
${formatGroupFeedback(groupedFeedback.peer, 'Peer')}
${formatGroupFeedback(groupedFeedback.junior, 'Junior')}`;
}

const SYSTEM_PROMPT = `You are an expert HR analyst tasked with generating a 360-degree feedback report for the employee. Your goal is to synthesize feedback from peers, juniors, seniors, and managers into a professional, actionable report for the employee's self-improvement.

Report Structure:
1. Executive Summary
   - Precisely state reviewer counts (e.g., "8 reviewers: 3/5 seniors, 3/6 peers, 2/4 juniors")
   - Briefly explain the report's purpose and methodology
   - Preview the major themes identified across all feedback with quantified consensus

2. Key Strengths (Organized by Theme)
   - Identify 3-5 major strength themes that emerged across feedback
   - For each theme:
     * Describe the theme and its impact
     * Quantify consensus using exact fractions (e.g., "4/6 peers and 2/3 seniors noted...")
     * Include 2-3 supporting quotes with role attribution and context
     * Note any role-specific variations in perception
     * When multiple reviewers express similar sentiments, indicate the count (e.g., "3/5 seniors expressed similar views...")

3. Areas for Improvement (Organized by Theme)
   - Present 3-5 key development themes
   - For each theme:
     * Describe the specific challenge or opportunity
     * Quantify feedback using precise ratios (e.g., "2/4 juniors and 3/5 peers mentioned...")
     * Support with multiple role-attributed quotes
     * Note any contradictions with exact numbers (e.g., "While 3/4 peers praised X, 2/3 seniors noted Y...")
     * Include context around when/how the behavior impacts work

4. Recommendations
   - For each major development theme:
     * Current Challenge: Specific description with quantified impact
     * Supporting Evidence: Include relevant quotes and exact numbers
     * Target Outcome: Clear success metrics
     * Action Plan: Concrete steps with timelines
   - Address any contradictions with specific numbers
   - Ensure recommendations align with the quantified feedback

Tone & Style:
- Professional yet empathetic
- Frame areas for improvement as growth opportunities
- Always attribute quotes to roles with context
- Use clear section headers and bullet points
- Never use generic phrases like "Anonymized quote" or "some reviewers"
- Always provide exact numbers and ratios

Data Analysis:
- Use precise fractions for all consensus statements
- Include multiple supporting quotes for each major point
- Highlight exact numbers when discussing patterns
- Note specific contexts where feedback applies
- Quantify both positive and negative feedback
- When feedback conflicts, provide exact counts for each perspective

Format the report in clean, readable markdown with clear section breaks and consistent formatting.`;

const USER_PROMPT_TEMPLATE = `Generate a comprehensive 360-degree feedback report using the following feedback data. Focus on precise quantification and detailed evidence.

FEEDBACK DATA:
{feedbackData}

Requirements:
1. Quantification Requirements
   - Use exact fractions for all consensus statements (e.g., "3/5 seniors noted...")
   - Provide specific counts when discussing patterns
   - Include precise ratios when comparing different perspectives
   - Never use vague quantifiers (e.g., "some," "many," "most")
   - When discussing contradictions, give exact numbers for each view

2. Evidence and Quotes
   - Include multiple supporting quotes for each major point
   - Provide context for each quote (when/where/how it applies)
   - When similar feedback appears multiple times, quantify it (e.g., "4/6 peers expressed this sentiment...")
   - Use role attribution with specific numbers (e.g., "2/3 senior colleagues observed...")

3. Theme Analysis
   - For each theme:
     * State exact number of reviewers who mentioned it
     * Break down mentions by role with precise ratios
     * Include multiple supporting quotes with context
     * Note any contradictions with specific numbers

4. Structure & Format
   - Begin with precise reviewer counts by role
   - Present analysis organized by themes
   - Use exact numbers throughout
   - Support all statements with specific evidence
   - Quantify all patterns and trends

5. Special Considerations
   - Highlight exact proportions for each major finding
   - Note specific contexts where feedback applies
   - Track and report conflicting viewpoints with precise numbers
   - Ensure recommendations align with quantified feedback
   - Include multiple relevant quotes for each key point`;

export async function generateAIReport(
  employeeName: string,
  employeeRole: string,
  feedback: CoreFeedbackResponse[]
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
      max_tokens: 2500  // Increased to accommodate more detailed analysis
    });

    console.log('OpenAI response received:', response.choices[0]?.message);
    const markdownContent = response.choices[0]?.message?.content || 'Failed to generate report';
    console.log('Markdown content:', markdownContent.substring(0, 200) + '...');
    
    // Replace the title with the correct employee name
    const updatedMarkdown = markdownContent.replace(
      /# [\s\S]*?(?=##)/,
      `# 360-Degree Feedback Report for ${employeeName} (${employeeRole})\n\n`
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