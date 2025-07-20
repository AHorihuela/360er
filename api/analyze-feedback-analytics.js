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
    console.log('Analytics analysis request:', JSON.stringify(req.body, null, 2));
    
    const { relationship, strengths, areas_for_improvement } = req.body;
    
    if (!process.env.OPENAI_API_KEY) {
      console.error('OpenAI API key not configured');
      return res.status(500).json({ 
        error: 'OpenAI API key not configured',
        details: 'OPENAI_API_KEY environment variable is missing'
      });
    }

    if (!relationship || !strengths || !areas_for_improvement) {
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
          content: `You are an expert in performance analysis and competency assessment. Analyze the provided feedback and extract:

1. Key insights/themes from the feedback
2. Competency scores based on evidence in the feedback

Focus on these core competencies: Technical/Functional Expertise, Leadership & Influence, Collaboration & Communication, Innovation & Problem-Solving, Execution & Accountability, Emotional Intelligence & Culture Fit, Growth & Development.

Rate each competency from 1-5 based on evidence in the feedback (1=Poor, 2=Below Average, 3=Average, 4=Good, 5=Excellent). Only include competencies that have clear evidence in the feedback.`
        },
        { 
          role: "user", 
          content: `Please analyze this ${relationship} feedback:

Strengths:
${strengths}

Areas for Improvement:
${areas_for_improvement}

Provide your response in this exact JSON format:
{
  "competency_scores": [
    {
      "name": "Collaboration & Communication",
      "score": 4,
      "evidence": "Quote from feedback that supports this score",
      "confidence": "high"
    }
  ],
  "key_insights": [
    "Clear, actionable insight derived from the feedback"
  ]
}`
        }
      ],
      temperature: 0.3,
      response_format: { type: "json_object" }
    });

    const analysis = JSON.parse(completion.choices[0].message.content);
    console.log('Analytics AI Response:', JSON.stringify(analysis, null, 2));
    
    return res.status(200).json(analysis);
  } catch (error) {
    console.error('Analytics OpenAI API error:', error);
    return res.status(500).json({
      error: 'Failed to analyze feedback for analytics',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 