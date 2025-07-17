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

// Analyze feedback endpoint (kept in main file for now - could be moved to routes later)
app.post('/api/analyze-feedback', async (req, res) => {
  try {
    console.log('Received request body:', JSON.stringify(req.body, null, 2));
    
    const { relationship, strengths, areas_for_improvement } = req.body;
    
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: 'OpenAI API key not configured' });
    }

    // Prepare the feedback text for analysis
    const feedbackText = `
Relationship: ${relationship}
Strengths: ${strengths}
Areas for Improvement: ${areas_for_improvement}
    `.trim();

    const openai = getOpenAIClient();

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an AI assistant that analyzes 360-degree feedback and provides insights.
          
Analyze the feedback and provide:
1. Key themes in the feedback
2. Specific actionable recommendations
3. Areas of strength to build upon
4. Growth opportunities

Be constructive, specific, and professional. Focus on actionable insights that can help with professional development.`
        },
        {
          role: "user",
          content: `Please analyze this feedback: ${feedbackText}`
        }
      ],
      temperature: 0.7,
      max_tokens: 1000
    });

    const analysis = completion.choices[0].message.content;
    
    res.json({
      analysis,
      feedback: {
        relationship,
        strengths,
        areas_for_improvement
      }
    });
  } catch (error) {
    console.error('OpenAI API error:', error);
    res.status(500).json({
      error: 'Failed to analyze feedback',
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