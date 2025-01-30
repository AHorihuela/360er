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
   - State the number of reviewers and their roles (e.g., "8 reviewers: 3 seniors, 3 peers, 2 juniors")
   - Briefly explain the report's purpose and methodology
   - Preview the major themes identified across all feedback

2. Key Strengths (Organized by Theme)
   - Identify 3-5 major strength themes that emerged across feedback
   - For each theme:
     * Describe the theme and its impact
     * Quantify consensus across roles (e.g., "This strength was noted by 2 seniors and 3 peers")
     * Include 2-3 supporting quotes with role attribution
     * Note any role-specific perspectives on the theme

3. Areas for Improvement (Organized by Theme)
   - Present 3-5 key development themes
   - For each theme:
     * Describe the specific challenge or opportunity
     * Show how different roles perceive this area
     * Support with role-attributed quotes
     * Note any contradictions or varying perspectives

4. Recommendations
   - For each major development theme:
     * Current Challenge: Specific description of the issue
     * Target Outcome: Clear success metrics
     * Action Plan: Concrete steps with timelines
   - Address any contradictions in perspectives
   - Ensure recommendations are specific and achievable

Tone & Style:
- Professional yet empathetic
- Frame areas for improvement as growth opportunities
- Always attribute quotes to roles (e.g., "A peer shared...", "One senior colleague mentioned...")
- Use clear section headers and bullet points
- Never use generic phrases like "Anonymized quote"

Data Analysis:
- Focus on identifying and clustering common themes across all feedback
- Within each theme, analyze how different roles perceive it
- Use role attribution to show perspective diversity
- Highlight where themes appear across multiple roles
- Note unique insights that don't fit major themes

Format the report in clean, readable markdown with clear section breaks and consistent formatting.`;

const USER_PROMPT_TEMPLATE = `Generate a comprehensive 360-degree feedback report using the following feedback data. Focus on identifying and analyzing themes that emerge across all feedback, regardless of reviewer role.

FEEDBACK DATA:
{feedbackData}

Requirements:
1. Theme-Based Analysis
   - Identify major themes that appear across feedback from all roles
   - For each theme:
     * Describe the theme's core characteristics
     * Show how different roles perceive it
     * Support with role-attributed quotes
     * Note any contradictions or variations in perspective

2. Structure & Content
   - Begin with a clear executive summary including reviewer count by role
   - Present analysis organized by themes, not by reviewer roles
   - Include role-attributed quotes to support each theme
   - Quantify theme frequency across roles
   - Address contradictions within themes explicitly

3. Key Areas to Cover
   - Present 3-5 major strength themes with evidence
   - Identify 3-5 development themes with specific examples
   - For each development theme, provide:
     * Clear description of current challenge
     * Specific target outcome
     * Detailed action steps with timeline

4. Style Guidelines
   - Use role attribution for all quotes (e.g., "A peer shared...", "Multiple senior colleagues noted...")
   - Frame development areas constructively
   - Keep tone professional and growth-oriented
   - Use clear section headers and bullet points

5. Special Considerations
   - Focus on themes that appear across multiple roles
   - Note unique insights that don't fit major themes
   - Support all themes with specific examples and quotes
   - Ensure recommendations align with identified themes`;

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