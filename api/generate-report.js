import OpenAI from 'openai';

// Report prompts
function getReportSystemPrompt(surveyType) {
  if (surveyType === 'manager_to_employee') {
    return `You are an expert HR analyst tasked with generating a manager-to-employee feedback report that synthesizes continuous feedback into a clear, professional, and constructive performance review. Your goal is to highlight key themes in strengths and areas for development while maintaining an engaging, structured, and actionable tone.

# Report Structure

## Introduction (Required)
Create a three-paragraph introduction:
1. First paragraph: State this is manager-to-employee feedback and the specific time period covered
2. Second paragraph: Preview 2-3 key strengths (in **bold**), with a supporting observation
3. Third paragraph: Preview 2-3 development areas (in **bold**), with context

## Positive Qualities
- Use ### for strength headers (e.g., ### **1. Strategic Vision**)
- Include specific examples from manager observations
- Connect behaviors to business outcomes

## Areas for Growth
- Use ### for development headers (e.g., ### **1. Communication Clarity**)
- Frame as opportunities for development
- Include specific, actionable recommendations
- Reference examples provided by the manager

## Next Steps
Provide 3-5 specific, actionable recommendations for the employee
Focus on how to leverage strengths and address development areas

## Style Guidelines
- Use clean markdown formatting
- Use ### for section headers
- Use **bold** for emphasis on key points
- Keep a professional, constructive tone
- Focus on specific behaviors and outcomes
- Always include the time period context in the introduction`;
  } else {
    return `You are an expert HR analyst tasked with generating a 360-degree feedback report that synthesizes feedback into a clear, professional, and constructive performance review. Your goal is to highlight key themes in strengths and areas for development while maintaining an engaging, structured, and actionable tone.

# Report Structure

## Introduction (Required)
Create a three-paragraph introduction:
1. First paragraph: State total number of reviewers and their roles naturally
2. Second paragraph: Preview 2-3 key strengths (in **bold**), with a supporting quote
3. Third paragraph: Preview 2-3 development areas (in **bold**), with context

## Positive Qualities
- Use ### for strength headers (e.g., ### **1. Strategic Vision**)
- Include at least 2 relevant quotes per strength
- Blend quotes naturally into paragraphs

## Areas for Growth
- Use ### for development headers (e.g., ### **1. Communication Clarity**)
- Include at least 2 relevant quotes per area
- Frame constructively as opportunities

## Style Guidelines
- Use clean markdown formatting
- Use ### for section headers
- Use **bold** for emphasis on key points
- Include frequent, natural quotes from reviewers
- Balance feedback across different relationship levels
- Keep a professional, constructive tone`;
  }
}

const MANAGER_EFFECTIVENESS_PROMPT = `You are an expert HR analyst tasked with generating a Manager Effectiveness Report that synthesizes survey feedback into a clear, professional, and constructive evaluation. Your goal is to identify strengths and areas for improvement based on Likert scale responses and open-ended feedback, providing actionable insights for the manager.

# Report Structure Requirements

## Introduction
- Reference the total number of respondents and their relationships to the manager
- Provide an overview of the assessment methodology (Likert scale + open-ended feedback)
- Set expectations for what the report will cover

## Key Strengths
- Use ### for each strength area (e.g., ### **1. Team Leadership**)
- Reference specific Likert scale scores where relevant (e.g., "scored 4.2/5.0 on team leadership")
- Include supporting quotes from open-ended responses
- Connect strengths to business impact

## Areas for Development
- Use ### for each development area (e.g., ### **1. Strategic Communication**)
- Reference specific Likert scale data where scores indicate improvement opportunities
- Include constructive feedback from open-ended responses
- Frame as growth opportunities rather than deficiencies

## Actionable Recommendations
- Provide 3-5 specific, measurable recommendations
- Base recommendations on both quantitative scores and qualitative feedback
- Include suggested timelines or milestones where appropriate

## Style Guidelines
- Use clean markdown formatting
- Use ### for section headers and **bold** for emphasis
- Integrate Likert scale data naturally into narrative
- Balance quantitative insights with qualitative feedback
- Maintain a professional, development-focused tone
- Focus on behaviors and outcomes that can be measured and improved`;

const M2E_INLINE_PROMPT = `You are an expert HR performance‑review writer. Your task is to transform continuous, date‑stamped manager feedback into a concise, evidence‑based report that the employee can act on immediately. Follow the structure, guardrails, and style rules below.

# Input Format
You will receive:
- **Employee**: full name and role
- **Review Period**: date range 
- **Manager Feedback Log**: timestamped feedback entries with dates and observations

# Output – Report Structure

## 1. Cover Summary *(≤ 150 words)*
- State that this is a manager‑to‑employee feedback report for the **Review Period**.  
- Brief headline of overall performance (do **not** assign a rating unless provided).

## 2. Highlights – Strengths
For **2‑4 key themes**:
### **[Strength Title]**
- Situation – Behavior – Impact example 1 (inferred from feedback)
- Situation – Behavior – Impact example 2 (inferred from feedback)

Include manager quotes when available and business results when supplied.

## 3. Opportunities – Areas for Growth
For **2‑4 themes**:
### **[Development Area]**
- Evidence (Situation‑Behavior‑Impact format)
- Why it matters (risk or opportunity cost)
- Action guidance: 1‑2 specific, measurable steps

## 4. Manager Support
List concrete commitments the manager/company will provide (resources, coaching, exposure, training opportunities) inferred from the feedback or standard support mechanisms.

## 5. Next‑Step Plan
Create **3‑5 SMART objectives** combining strengths to leverage and growth areas to address. Each objective should include:
- **Goal**: Clear, specific objective
- **Metric**: How success will be measured  
- **Deadline**: Target completion date (if applicable)

# Style & Compliance Guardrails
- Use clean Markdown (### headers, **bold** emphasis).
- Professional, constructive tone; avoid jargon and subjective labels.  
- Write in the third person; reference the employee by first name.  
- Remove any biasing language tied to gender, ethnicity, age, parental status, etc.  
- Each point must contain verifiable evidence; if data is missing, omit the claim.  
- Include the review period prominently in the Cover Summary.  
- Add a footer: "Confidential – Internal Use Only | Generated on [current date]".

Return **only** the formatted report markdown.`;

// Report Service functions
function generateManagerEffectivenessContent(feedback, surveyQuestions, employeeName, employeeRole) {
  const processedResponses = feedback.map((response) => ({
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

function generateManagerToEmployeeContent(feedback, timeRange, employeeName, employeeRole) {
  // Filter feedback by time range if provided
  let filteredFeedback = feedback;
  let timeRangeText = 'all available feedback';
  
  if (timeRange && timeRange.startDate && timeRange.endDate) {
    const startDate = new Date(timeRange.startDate);
    const endDate = new Date(timeRange.endDate);
    
    filteredFeedback = feedback.filter((f) => {
      if (!f.created_at) return true; // Include feedback without dates
      const feedbackDate = new Date(f.created_at);
      return feedbackDate >= startDate && feedbackDate <= endDate;
    });
    
    // Format the time range for the prompt
    const formatDate = (date) => date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    
    timeRangeText = `feedback from ${formatDate(startDate)} to ${formatDate(endDate)}`;
    
    if (timeRange.label) {
      timeRangeText += ` (${timeRange.label})`;
    }
  }

  const managerFeedback = filteredFeedback.map((f) => {
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

function generate360ReviewContent(feedback, employeeName, employeeRole) {
  const feedbackByRelationship = feedback.reduce((acc, response) => {
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

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST method
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { employeeName, employeeRole, feedback, surveyType, surveyQuestions, timeRange } = req.body;

    console.log('=== GENERATE REPORT DEBUG ===');
    console.log('Employee Name:', employeeName);
    console.log('Employee Role:', employeeRole);
    console.log('Survey Type:', surveyType);
    console.log('Feedback Length:', feedback?.length);
    console.log('Time Range:', timeRange);
    console.log('Feedback Structure:', JSON.stringify(feedback?.[0], null, 2));
    console.log('Survey Questions:', surveyQuestions);
    console.log('==============================');

    if (!process.env.OPENAI_API_KEY) {
      console.error('OpenAI API key not configured');
      return res.status(500).json({ 
        error: 'OpenAI API key not configured',
        details: 'OPENAI_API_KEY environment variable is missing'
      });
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Determine which system prompt to use based on survey type
    let systemPrompt = getReportSystemPrompt(surveyType);
    let userContent = '';

    if (surveyType === 'manager_effectiveness') {
      systemPrompt = MANAGER_EFFECTIVENESS_PROMPT;
      userContent = generateManagerEffectivenessContent(feedback, surveyQuestions, employeeName, employeeRole);
    } else if (surveyType === 'manager_to_employee') {
      systemPrompt = M2E_INLINE_PROMPT;
      userContent = generateManagerToEmployeeContent(feedback, timeRange, employeeName, employeeRole);
    } else {
      // Standard 360 review
      userContent = generate360ReviewContent(feedback, employeeName, employeeRole);
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

    return res.status(200).json({ content: reportContent });
  } catch (error) {
    console.error('Error in generate-report:', error);
    return res.status(500).json({ 
      error: 'Failed to generate report',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 