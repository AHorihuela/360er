import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY
});

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL!,
  import.meta.env.VITE_SUPABASE_ANON_KEY!
);

export async function POST(request: Request) {
  try {
    const { strengths, areas_for_improvement } = await request.json();

    if (!import.meta.env.VITE_OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured');
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { 
          role: "system", 
          content: `You are an expert in performance reviews and feedback. Analyze the provided feedback and provide structured suggestions for improvement. Focus on:

1. Clarity: Is the feedback clear and easy to understand?
2. Specificity: Does it include specific examples and behaviors?
3. Actionability: Are there concrete suggestions for improvement?
4. Tone: Is the feedback constructive and professional?
5. Completeness: Are all aspects adequately addressed?

Categorize suggestions as either 'critical' (must be addressed) or 'enhancement' (would improve but not essential).`
        },
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
          model_version: 'gpt-4',
          prompt_version: '1.0'
        });
    } catch (error) {
      console.error('Failed to store analysis:', error);
      // Continue even if storage fails
    }

    return new Response(JSON.stringify(analysis), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error in analyze-feedback:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to analyze feedback',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
} 