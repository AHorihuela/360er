import express from 'express';
import cors from 'cors';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

const app = express();
const port = process.env.PORT || 5174; // Use a different port than Vite

app.use(cors());
app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY // Server-side only, secure environment variable
});

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
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

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
}); 