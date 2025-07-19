import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import OpenAI from 'openai';
import reportRoutes from './routes/reportRoutes';
import { transcribeAudio, audioUpload } from './api/whisper-transcribe';

const app = express();
const port = process.env.PORT || 3000;

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper function to get OpenAI client when needed
function getOpenAIClient(): OpenAI {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured');
  }
  
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

// Middleware
app.use(cors());
app.use(express.json());

// API Routes FIRST (before static files)
app.use('/api', reportRoutes);

// Whisper transcription endpoint
app.post('/api/transcribe', audioUpload, transcribeAudio);

// Serve static files from the dist directory (after API routes)
app.use(express.static(path.join(__dirname, '../../dist')));

// Analyze feedback endpoint with structured response for AI suggestions
app.post('/api/analyze-feedback', async (req, res) => {
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

    const openai = getOpenAIClient();

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

    const analysis = JSON.parse(completion.choices[0].message.content!);
    console.log('AI Analysis Response:', JSON.stringify(analysis, null, 2));
    
    res.json(analysis);
  } catch (error) {
    console.error('OpenAI API error:', error);
    
    // Ensure we always send a valid JSON response
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Failed to analyze feedback',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
});

// Analyze feedback for analytics (competency scores and insights)
app.post('/api/analyze-feedback-analytics', async (req, res) => {
  try {
    console.log('Analytics analysis request:', JSON.stringify(req.body, null, 2));
    
    const { relationship, strengths, areas_for_improvement } = req.body;
    
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: 'OpenAI API key not configured' });
    }

    const openai = getOpenAIClient();

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

    const analysis = JSON.parse(completion.choices[0].message.content!);
    console.log('Analytics AI Response:', JSON.stringify(analysis, null, 2));
    
    res.json(analysis);
  } catch (error) {
    console.error('Analytics OpenAI API error:', error);
    res.status(500).json({
      error: 'Failed to analyze feedback for analytics',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Catch all handler: send back React's index.html file for any non-API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../../dist/index.html'));
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

export default app; 