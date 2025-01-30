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

const SYSTEM_PROMPT = `You are an expert HR analyst tasked with generating a 360-degree feedback report that synthesizes feedback into a clear, professional, and constructive performance review. Your goal is to highlight key themes in strengths and areas for development while maintaining an engaging, structured, and actionable tone.

# Report Structure

## Introduction (Required)
Create a three-paragraph introduction:
1. First paragraph: State total number of reviewers and their roles naturally
2. Second paragraph: Preview 2-3 key strengths (in **bold**), with a supporting quote
3. Third paragraph: Preview 2-3 development areas (in **bold**), with context

Example Introduction:
"""
A total of 12 colleagues, including senior leaders, peers, and junior team members, provided feedback on [Name]'s performance. This 360-degree review highlights [Name]'s strengths and key areas for growth, offering insights into their impact on the organization and opportunities for continued professional development.

[Name] is widely recognized for their **deep industry expertise, meticulous approach, and dedication to the company's success**. As one senior leader notes, "[Name] consistently demonstrates exceptional understanding of our market dynamics, which directly contributes to our strategic positioning."

Feedback also identifies opportunities for [Name] to **refine communication clarity, engage more actively in leadership discussions, and balance attention to detail with delegation**. A peer observes that "while [Name]'s thoroughness is valuable, there's room to streamline communication for better team efficiency."
"""

## Positive Qualities
- Use ### for strength headers (e.g., ### **1. Strategic Vision**)
- Include at least 2 relevant quotes per strength
- Blend quotes naturally into paragraphs
- Use quotes to demonstrate impact (e.g., "Their strategic insights led to X outcome...")
- Connect quotes to business outcomes

Example Strength Section:
"""
### **1. Strategic Vision & Market Understanding**
[Name]'s deep grasp of industry dynamics consistently drives value for the organization. A senior leader emphasizes this impact: "[Name] has an exceptional ability to anticipate market trends, which proved invaluable in our Q3 planning." This strategic insight extends beyond planning—as another colleague notes, "Their market analysis directly influenced our successful expansion into new territories." Multiple peers highlighted how this expertise translates into practical outcomes, with one stating, "Their recommendations on competitive positioning helped us secure three major partnerships this year."
"""

## Areas for Improvement
- Use ### for improvement headers
- Include supportive quotes that demonstrate the opportunity
- Balance critique with recognition of progress
- Use quotes to show specific examples
- Frame quotes constructively

Example Improvement Section:
"""
### **1. Communication Efficiency**
While [Name]'s thorough approach ensures quality, there's an opportunity to enhance communication efficiency. A peer notes, "Their attention to detail is impressive, but sometimes we need a higher-level summary first." This sentiment is echoed by another colleague: "When [Name] provides executive summaries upfront, it helps us grasp key points quickly." Some progress is already evident, as one team member observes: "Recent improvements in their presentation structure have made complex topics much easier to follow."
"""

## Quote Integration Guidelines
- Use 2-3 quotes per major point to provide evidence
- Blend quotes naturally into the narrative
- Choose quotes that demonstrate specific examples or impact
- Balance quotes from different organizational levels
- Use quotes to show both strengths and growth opportunities
- Maintain anonymity while preserving context

Examples of Effective Quote Integration:
✅ "Their strategic thinking directly impacted our success, as one leader notes: 'Their market analysis led to a 20% increase in partner engagement.'"
✅ "Multiple colleagues highlighted their growth, with one peer observing that 'their presentation style has become much more effective recently.'"
❌ "A coworker said 'they need to improve communication.'" (too vague, lacks context)
❌ "Their manager mentioned..." (avoid role-specific identifiers)

## Conclusion
Two paragraphs with supporting quotes:
1. Reinforce key strengths (in **bold**) with an impactful quote
2. Frame development areas (in **bold**) with a forward-looking quote

Example Conclusion:
"""
[Name]'s strengths in **industry expertise, attention to detail, and unwavering commitment** continue to make them a valuable asset. As one colleague summarizes, "Their combination of market knowledge and dedication has been instrumental in our recent successes."

By refining their **communication approach and enhancing leadership presence**, they are well-positioned to maximize their impact. A senior team member notes, "With their strong foundation and openness to growth, [Name] has the potential to be an even more influential leader in our organization."
"""

## Style Guidelines
- Use clean markdown formatting without extra spaces
- Create smooth transitions between sections
- Integrate quotes naturally within paragraphs
- Use bold (**) for emphasis of key points
- Maintain consistent header levels
- Ensure every major point has supporting quotes`;

const USER_PROMPT_TEMPLATE = `Generate a comprehensive feedback report using the following data:

{feedbackData}

Key Requirements:
1. Data Integration
   - Support key points with specific evidence
   - Use precise language when describing patterns
   - Integrate conflicting viewpoints with context
   - Balance qualitative and quantitative insights

2. Narrative Flow
   - Connect themes naturally
   - Blend quotes seamlessly
   - Maintain clear progression
   - Focus on impact and outcomes

3. Actionable Insights
   - Link feedback to specific behaviors
   - Provide contextual recommendations
   - Address root causes
   - Consider organizational context

Format in clear, professional markdown with logical flow between sections.`;

export async function generateAIReport(
  employeeName: string,
  employeeRole: string,
  feedback: CoreFeedbackResponse[]
): Promise<string> {
  try {
    console.log('Formatting feedback for prompt...');
    const formattedFeedback = formatFeedbackForPrompt(employeeName, employeeRole, feedback);

    console.log('Sending request to OpenAI...');
    const completion = await openai.chat.completions.create({
      model: "gpt-4-1106-preview",
      messages: [
        {
          role: "system",
          content: SYSTEM_PROMPT
        },
        {
          role: "user",
          content: formattedFeedback
        }
      ],
      temperature: 0.3,
      max_tokens: 2500
    });

    console.log('OpenAI response received:', completion.choices[0]?.message);
    let markdownContent = completion.choices[0]?.message?.content || 'Failed to generate report';
    
    // Ensure proper title formatting
    markdownContent = `# 360-Degree Feedback Report for ${employeeName} (${employeeRole})\n\n${
      markdownContent.replace(/^#.*$/m, '').trim()
    }`;

    // Clean up any double spaces before headers
    markdownContent = markdownContent.replace(/\n\s+#/g, '\n#');

    // Ensure consistent header formatting
    markdownContent = markdownContent
      .replace(/^###\s+(?!\*\*)/gm, '### **')
      .replace(/^###\s+\*\*\s+/gm, '### **');

    console.log('Final markdown:', markdownContent.substring(0, 200) + '...');
    if (!markdownContent.trim()) {
      throw new Error('Generated report is empty');
    }

    return markdownContent;
  } catch (error) {
    console.error('Error generating AI report:', error);
    throw error;
  }
} 