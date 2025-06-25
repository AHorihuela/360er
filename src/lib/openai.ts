// SECURITY FIX: This file previously exposed OpenAI API keys to client-side
// All OpenAI operations now happen server-side only for security

import { CoreFeedbackResponse } from '@/types/feedback/base';

// Use server-side API instead of direct OpenAI client
export async function makeOpenAIRequest(prompt: string, options: any = {}) {
  const response = await fetch('/api/analyze-feedback', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ prompt, ...options }),
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || `HTTP ${response.status}`);
  }
  
  return response.json();
}

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

// New function to format manager survey feedback for prompt
function formatManagerSurveyForPrompt(
  managerName: string,
  managerRole: string,
  feedback: CoreFeedbackResponse[],
  surveyQuestions?: Record<string, string>
): string {
  // Get all numeric responses, calculate averages
  const likertResponses: Record<string, { values: number[], questionText: string }> = {};
  const openEndedResponses: Record<string, { responses: string[], questionText: string }> = {};
  
  // Process all feedback responses
  feedback.forEach(response => {
    if (!response.responses) return;
    
    // Process each question response
    Object.entries(response.responses).forEach(([questionId, value]) => {
      // Handle numeric (Likert) responses
      if (typeof value === 'number') {
        if (!likertResponses[questionId]) {
          // Use actual question text from surveyQuestions mapping if available
          const questionText = surveyQuestions?.[questionId] || `Question ${questionId.substring(0, 8)}...`;
          likertResponses[questionId] = { 
            values: [], 
            questionText
          };
        }
        likertResponses[questionId].values.push(value);
      } 
      // Handle string (open-ended) responses
      else if (typeof value === 'string' && value.trim()) {
        if (!openEndedResponses[questionId]) {
          // Use actual question text from surveyQuestions mapping if available
          const questionText = surveyQuestions?.[questionId] || `Question ${questionId.substring(0, 8)}...`;
          openEndedResponses[questionId] = { 
            responses: [], 
            questionText
          };
        }
        openEndedResponses[questionId].responses.push(value.trim());
      }
    });
  });

  // Calculate averages for Likert questions
  const likertScores = Object.entries(likertResponses).map(([id, data]) => {
    const avg = data.values.length > 0
      ? data.values.reduce((sum, val) => sum + val, 0) / data.values.length
      : 0;
    return {
      id,
      questionText: data.questionText,
      average: parseFloat(avg.toFixed(2)),
      count: data.values.length,
      values: data.values
    };
  }).sort((a, b) => b.average - a.average); // Sort by highest to lowest average
  
  // Format the Likert scores for the prompt
  const likertSection = likertScores.length > 0 ? `
Likert Scale Responses (1-5 scale, where 5 is best):
${likertScores.map(q => `
- ${q.questionText}
  Average Score: ${q.average} (from ${q.count} responses)
  Raw Scores: ${q.values.join(', ')}
`).join('')}` : '';

  // Format open-ended responses
  const openEndedSection = Object.keys(openEndedResponses).length > 0 ? `
Open-Ended Responses:
${Object.entries(openEndedResponses).map(([id, data]) => `
Question: ${data.questionText}
${data.responses.map((r, i) => `Response ${i+1}: "${r}"`).join('\n')}
`).join('')}` : '';

  // Format general feedback (strengths/areas_for_improvement)
  const generalFeedback = feedback.filter(f => f.strengths || f.areas_for_improvement).map((f, i) => `
Reviewer ${i + 1}:
${f.strengths ? `Strengths: "${f.strengths}"` : ''}
${f.areas_for_improvement ? `Areas for Improvement: "${f.areas_for_improvement}"` : ''}
`).join('\n');

  const generalFeedbackSection = generalFeedback ? `
General Feedback:
${generalFeedback}
` : '';

  return `
Manager Information:
- Name: ${managerName}
- Role: ${managerRole}

Feedback Overview:
- Total Responses: ${feedback.length}
- Likert Questions: ${Object.keys(likertResponses).length}
- Open-Ended Questions: ${Object.keys(openEndedResponses).length}

${likertSection}

${openEndedSection}

${generalFeedbackSection}`;
}

// Original 360 review system prompt remains the same
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

// New system prompt for manager surveys
const MANAGER_SYSTEM_PROMPT = `You are an expert HR analyst tasked with generating a Manager Effectiveness Report that synthesizes survey feedback into a clear, professional, and constructive evaluation. Your goal is to identify strengths and areas for improvement based on Likert scale responses and open-ended feedback, providing actionable insights for the manager.

# Report Structure

## Introduction (Required)
Create a concise introduction:
1. Mention the total number of responses
2. Explain the purpose of a manager effectiveness survey
3. Highlight the importance of both quantitative and qualitative feedback

Example Introduction:
"""
This Manager Effectiveness Report summarizes feedback from 8 team members who provided both quantitative ratings and qualitative comments about [Name]'s management approach. The survey was designed to evaluate key management competencies and identify both areas of strength and opportunities for development.

The survey results provide [Name] with valuable insights into their management effectiveness across multiple dimensions. The following sections analyze patterns in the feedback and offer specific, actionable recommendations based on both the numerical ratings and written comments.
"""

## Strengths (Based on Highest Ratings)
- Use ### for strength headers
- Focus on the questions that received the highest ratings (4.0+)
- Include relevant quotes from open-ended responses when available
- Explain why these are important management competencies
- Connect to business outcomes where possible

Example Strength Section:
"""
### **1. Clear Communication of Expectations**
[Name] received an average score of 4.8 on "I understand what is expected of me at work," indicating exceptional effectiveness in setting clear expectations. Team members consistently understand their roles and responsibilities, which contributes to efficient operations. As one team member commented, "I always know exactly what I need to focus on, which helps me prioritize effectively."

This clarity of expectations is a fundamental leadership skill that reduces ambiguity and helps team members align their efforts with organizational goals. Research shows that teams with clear expectations are 23% more productive than those with unclear direction.
"""

## Areas for Development (Based on Lowest Ratings)
- Use ### for development area headers
- Focus on questions with lower scores (below 3.5)
- Reference specific feedback from open-ended questions
- Frame as opportunities rather than criticisms
- Provide 1-2 specific, actionable recommendations for improvement

Example Development Section:
"""
### **1. Providing Regular Feedback**
[Name] received an average score of 3.2 on "My manager frequently provides feedback that helps me improve my performance." Several team members indicated they would benefit from more regular check-ins and specific feedback on their work.

Recommendation: Consider implementing a structured feedback schedule, such as brief weekly check-ins and more comprehensive monthly feedback sessions. One team member suggested, "It would be helpful to get feedback in real-time rather than waiting for formal reviews." Additionally, using the SBI (Situation-Behavior-Impact) framework can make feedback more specific and actionable.
"""

## Overall Assessment
Provide a balanced assessment of the manager's effectiveness:
1. Note the overall average rating across all categories
2. Identify patterns or themes from the feedback
3. Highlight how strengths can be leveraged to address development areas

Example Overall Assessment:
"""
With an overall rating of 3.9 across all dimensions, [Name] demonstrates solid management capabilities, particularly in setting clear expectations and directing resources effectively. The feedback reveals a consistent pattern of strength in organizational and structural aspects of management, with opportunities to enhance the interpersonal and developmental dimensions of leadership.

[Name] can leverage their strong ability to communicate expectations to improve in areas like providing regular feedback by extending their clarity to performance discussions. By applying the same structured approach to feedback sessions that they successfully use for setting expectations, [Name] can create a more consistent experience for team members.
"""

## Recommendations
Provide 3-5 specific, actionable recommendations:
- Use bullet points for clarity
- Make recommendations specific and achievable
- Base recommendations on both quantitative and qualitative feedback
- Include a timeframe or implementation approach when appropriate

Example Recommendations:
"""
### Recommended Actions:

- **Implement regular feedback sessions**: Schedule 15-minute weekly check-ins with each team member, focused specifically on providing timely feedback on current work.

- **Develop a growth plan for each team member**: Work with each individual to create a personal development plan that aligns with their career aspirations and the team's needs.

- **Delegate with development in mind**: When assigning tasks, explicitly connect them to the team member's growth goals to demonstrate commitment to their advancement.

- **Establish a "skip-level" meeting structure**: Create opportunities for your team members to engage with your manager quarterly, which models good upward management and transparency.
"""

## Style Guidelines
- Use clean markdown formatting without extra spaces
- Create smooth transitions between sections
- Integrate data points and quotes naturally within paragraphs
- Use bold (**) for emphasis of key points
- Maintain consistent header levels
- Ensure every recommendation is specific and actionable
- Keep a professional, constructive tone throughout`;

// Original generateAIReport function for 360 reviews
export async function generateAIReport(
  employeeName: string,
  employeeRole: string,
  feedback: CoreFeedbackResponse[],
  surveyType?: string,
  surveyQuestions?: Record<string, string>
): Promise<string> {
  // SECURITY FIX: All OpenAI calls now happen server-side
  // This function has been disabled to prevent API key exposure
  throw new Error('generateAIReport has been moved to server-side for security. Use /api/generate-report endpoint instead.');
}

// Export default to maintain compatibility
export default { makeOpenAIRequest, generateAIReport }; 