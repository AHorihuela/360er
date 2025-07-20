import OpenAI from 'openai';

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
    console.log('Received request body:', JSON.stringify(req.body, null, 2));
    
    const { relationship, strengths, areas_for_improvement } = req.body;
    
    if (!process.env.OPENAI_API_KEY) {
      console.error('OpenAI API key not configured');
      return res.status(500).json({ error: 'OpenAI API key not configured' });
    }
    
    if (!relationship || !strengths || !areas_for_improvement) {
      console.error('Missing required fields:', { relationship, strengths, areas_for_improvement });
      return res.status(400).json({ 
        error: 'Missing required fields: relationship, strengths, and areas_for_improvement are required' 
      });
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
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

    const analysis = JSON.parse(completion.choices[0].message.content);
    console.log('AI Analysis Response:', JSON.stringify(analysis, null, 2));
    
    return res.status(200).json(analysis);
  } catch (error) {
    console.error('OpenAI API error:', error);
    
    return res.status(500).json({
      error: 'Failed to analyze feedback',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 