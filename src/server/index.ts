import express from 'express';
import cors from 'cors';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

const app = express();
const port = process.env.PORT || 5174; // Use a different port than Vite

app.use(cors());
app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.VITE_OPENAI_API_KEY
});

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

const SYSTEM_PROMPT = `You are an expert in performance reviews and feedback. Analyze the provided feedback and provide structured suggestions for improvement. Focus on:

1. Clarity: Is the feedback clear and easy to understand?
2. Specificity: Does it include specific examples and behaviors?
3. Actionability: Are there concrete suggestions for improvement?
4. Tone: Is the feedback constructive and professional?
5. Completeness: Are all aspects adequately addressed?

Categorize suggestions as either 'critical' (must be addressed) or 'enhancement' (would improve but not essential).`;

app.post('/api/analyze-feedback', async (req, res) => {
  try {
    const { strengths, areas_for_improvement } = req.body;

    if (!process.env.VITE_OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured');
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { 
          role: "user", 
          content: `Please analyze this feedback:

Strengths:
${strengths}

Areas for Improvement:
${areas_for_improvement}

Provide your response in this exact JSON format:
{
  "overallQuality": "excellent" | "good" | "needs_improvement",
  "summary": "A brief 1-2 sentence overview",
  "suggestions": [
    {
      "type": "critical" | "enhancement",
      "category": "clarity" | "specificity" | "actionability" | "tone" | "completeness",
      "suggestion": "The specific suggestion",
      "context": "The relevant text from the feedback (if applicable)"
    }
  ]
}`
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