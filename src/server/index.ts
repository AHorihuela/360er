import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

const app = express();
const port = process.env.API_PORT || 3001; // Use port 3001 to avoid conflicts with Vite dev server

app.use(cors());
app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY // Server-side only, secure environment variable
});

// Server-side Supabase client - isolated from client-side auth
const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!,
  {
    auth: {
      persistSession: false, // Don't persist session on server
      autoRefreshToken: false, // No auto-refresh on server
      detectSessionInUrl: false // No URL detection on server
    },
    global: {
      headers: {
        'X-Client-Info': 'server-side-client' // Help identify in logs
      }
    }
  }
);

const SYSTEM_PROMPT = `You are an expert in 360-degree performance reviews and feedback. You understand workplace dynamics, professional boundaries, and the different perspectives that come from various organizational relationships.

Analyze the feedback and return a JSON object with the following structure:
{
  "overallQuality": "excellent" | "good" | "needs_improvement",
  "summary": "A single paragraph summarizing the overall feedback quality",
  "suggestions": [
    {
      "type": "critical" | "enhancement",
      "category": "clarity" | "specificity" | "actionability" | "tone" | "completeness",
      "suggestion": "The specific suggestion text",
      "context": "The exact quote from the feedback that needs improvement",
      "highlightStart": "The first few words of the section to highlight",
      "highlightEnd": "The last few words of the section to highlight"
    }
  ]
}

When analyzing feedback, consider:
1. The reviewer's relationship to the employee (senior, peer, or junior) affects:
   - The expected level of detail in improvement suggestions
   - The scope of feedback they can reasonably provide
   - The appropriate tone and perspective
2. Focus on professional impact and work performance observations
3. Understand that specific improvement suggestions are optional and depend on:
   - The reviewer's role relative to the reviewee
   - The reviewer's area of expertise
   - The nature of their working relationship
4. Maintain objectivity and professionalism in all suggestions
5. Ensure feedback addresses observable behaviors and outcomes

CRITICAL REQUIREMENTS:
- The 'Areas for Improvement' section MUST contain different content from the 'Strengths' section
- If the sections are identical or very similar, this should be treated as a critical issue and result in a 'needs_improvement' rating
- Duplicate content between sections should be explicitly called out in the suggestions`;

app.post('/api/analyze-feedback', async (req, res) => {
  try {
    const { relationship, strengths, areas_for_improvement } = req.body;

    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured');
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { 
          role: "user", 
          content: `Please analyze this feedback. The reviewer's relationship to the employee is: ${relationship}.

Strengths:
${strengths}

Areas for Improvement:
${areas_for_improvement}`
        }
      ],
      temperature: 0.7,
      response_format: { type: "json_object" }
    });

    const analysis = JSON.parse(completion.choices[0].message.content!);

    // Store the analysis for future reference
    try {
      await supabase
        .from('feedback_analyses')
        .insert({
          strengths: strengths,
          areas_for_improvement: areas_for_improvement,
          analysis: analysis,
          model_version: 'gpt-4o',
          prompt_version: '1.0'
        });
    } catch (error) {
      console.error('Failed to store analysis:', error);
      // Continue even if storage fails
    }

    return res.json(analysis);
  } catch (error) {
    console.error('Error in analyze-feedback:', error);
    return res.status(500).json({ 
      error: 'Failed to analyze feedback',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Add system prompts for report generation
const REPORT_SYSTEM_PROMPT = `You are an expert HR analyst tasked with generating a 360-degree feedback report that synthesizes feedback into a clear, professional, and constructive performance review. Your goal is to highlight key themes in strengths and areas for development while maintaining an engaging, structured, and actionable tone.

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

## Areas for Improvement
- Use ### for improvement headers
- Include supportive quotes that demonstrate the opportunity
- Balance critique with recognition of progress

## Conclusion
Two paragraphs with supporting quotes:
1. Reinforce key strengths (in **bold**) with an impactful quote
2. Frame development areas (in **bold**) with a forward-looking quote

## Style Guidelines
- Use clean markdown formatting without extra spaces
- Create smooth transitions between sections
- Use bold (**) for emphasis of key points
- Maintain consistent header levels`;

const MANAGER_EFFECTIVENESS_PROMPT = `You are an expert HR analyst tasked with generating a Manager Effectiveness Report that synthesizes survey feedback into a clear, professional, and constructive evaluation. Your goal is to identify strengths and areas for improvement based on Likert scale responses and open-ended feedback, providing actionable insights for the manager.

# Report Structure

## Introduction
Create a concise introduction mentioning the total number of responses and explaining the purpose.

## Strengths (Based on Highest Ratings)
- Use ### for strength headers
- Focus on the questions that received the highest ratings (4.0+)
- Include relevant quotes from open-ended responses when available

## Areas for Development (Based on Lowest Ratings)
- Use ### for development area headers
- Focus on questions with lower scores (below 3.5)
- Provide 1-2 specific, actionable recommendations for improvement

## Recommendations
Provide 3-5 specific, actionable recommendations with bullet points.

## Style Guidelines
- Use clean markdown formatting
- Use bold (**) for emphasis
- Keep a professional, constructive tone`;

// Add the generate-report endpoint
app.post('/api/generate-report', async (req, res) => {
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
      throw new Error('OpenAI API key not configured');
    }

    // Define interfaces for type safety
    interface FeedbackItem {
      strengths: string;
      areas_for_improvement: string;
      relationship: string;
      responses?: any;
      created_at?: string;
    }

    // Determine which system prompt to use based on survey type
    let systemPrompt = REPORT_SYSTEM_PROMPT; // Default 360 review prompt
    let userContent = '';

    if (surveyType === 'manager-effectiveness') {
      systemPrompt = MANAGER_EFFECTIVENESS_PROMPT;
      
      // Process survey responses for manager effectiveness
      const processedResponses = (feedback as FeedbackItem[]).map((response: FeedbackItem) => ({
        responses: response.responses,
        relationship: response.relationship,
        strengths: response.strengths,
        areas_for_improvement: response.areas_for_improvement
      }));

      userContent = `Generate a manager effectiveness report for ${employeeName} (${employeeRole}).

Survey Questions: ${JSON.stringify(surveyQuestions, null, 2)}

Feedback Responses: ${JSON.stringify(processedResponses, null, 2)}

Total responses: ${feedback.length}`;
    } else if (surveyType === 'manager-to-employee') {
      // For manager-to-employee feedback, use a simpler approach
      systemPrompt = `You are an expert HR analyst tasked with generating a Manager-to-Employee Feedback Report. This report synthesizes direct feedback from a manager about their employee's performance into a clear, professional, and constructive review.

# Report Structure

## Introduction
Create a brief introduction that includes:
- This is direct feedback from the manager about the employee's performance
- The specific time period covered by the feedback (e.g., "based on feedback from January 1 - March 31, 2024")
- Number of feedback entries included
- Brief overview of what the report covers

## Strengths
Use ### headers for each strength area
Include specific examples and observations from the manager
Connect strengths to business impact where possible

## Areas for Growth
Use ### headers for each development area  
Frame as opportunities for development
Include specific, actionable recommendations
Reference examples provided by the manager

## Next Steps
Provide 3-5 specific, actionable recommendations for the employee
Focus on how to leverage strengths and address development areas

## Style Guidelines
- Use clean markdown formatting
- Use ### for section headers
- Use **bold** for emphasis
- Keep a professional, constructive tone
- Focus on specific behaviors and outcomes
- Always include the time period context in the introduction`;

      // Filter feedback by time range if provided
      let filteredFeedback = feedback as FeedbackItem[];
      let timeRangeText = 'all available feedback';
      
      if (timeRange && timeRange.startDate && timeRange.endDate) {
        const startDate = new Date(timeRange.startDate);
        const endDate = new Date(timeRange.endDate);
        
        filteredFeedback = (feedback as FeedbackItem[]).filter((f: FeedbackItem) => {
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

      userContent = `Generate a manager-to-employee feedback report for ${employeeName} (${employeeRole}).

Time Period: This report covers ${timeRangeText}.
Total feedback entries in period: ${filteredFeedback.length}
${feedback.length !== filteredFeedback.length ? `(Filtered from ${feedback.length} total entries)` : ''}

Manager Feedback Entries:
${managerFeedback.map((f, i) => `${i + 1}. ${f.feedback} (${f.timestamp})`).join('\n\n')}`;
    } else {
      // Standard 360 review
      const feedbackByRelationship = (feedback as FeedbackItem[]).reduce((acc: Record<string, Array<{strengths: string, areas_for_improvement: string}>>, response: FeedbackItem) => {
        if (!acc[response.relationship]) {
          acc[response.relationship] = [];
        }
        acc[response.relationship].push({
          strengths: response.strengths,
          areas_for_improvement: response.areas_for_improvement
        });
        return acc;
      }, {});

      userContent = `Generate a comprehensive 360-degree feedback report for ${employeeName} (${employeeRole}).

Feedback organized by relationship:
${Object.entries(feedbackByRelationship).map(([relationship, responses]) => 
  `${relationship.toUpperCase()}:\n${responses.map((r, i) => 
    `Response ${i + 1}:\nStrengths: ${r.strengths}\nAreas for Improvement: ${r.areas_for_improvement}`
  ).join('\n\n')}`
).join('\n\n')}

Total reviewers: ${feedback.length}`;
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

    return res.json({ content: reportContent });
  } catch (error) {
    console.error('Error in generate-report:', error);
    return res.status(500).json({ 
      error: 'Failed to generate report',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Simple test endpoint
app.get('/api/test', (req, res) => {
  res.json({ message: 'Server is working', timestamp: new Date().toISOString() });
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
  console.log('Available endpoints:');
  console.log('  POST /api/analyze-feedback');
  console.log('  POST /api/generate-report');
  console.log('  GET  /api/test');
}); 