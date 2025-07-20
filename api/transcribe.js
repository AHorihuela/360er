import OpenAI from 'openai';
import formidable from 'formidable';
import fs from 'fs';

// Disable default body parser to handle file uploads
export const config = {
  api: {
    bodyParser: false,
  },
};

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
    console.log('🎤 Transcribe endpoint hit:', {
      method: req.method,
      url: req.url,
      headers: Object.keys(req.headers)
    });

    if (!process.env.OPENAI_API_KEY) {
      console.error('❌ OpenAI API key not configured');
      return res.status(500).json({ 
        error: 'OpenAI API key not configured',
        details: 'OPENAI_API_KEY environment variable is missing'
      });
    }

    // Parse the multipart form data
    const form = formidable({
      maxFileSize: 25 * 1024 * 1024, // 25MB limit
      keepExtensions: true,
    });

    const [fields, files] = await form.parse(req);
    
    console.log('Parsed form data:', {
      fields: Object.keys(fields),
      files: Object.keys(files)
    });

    if (!files.audio || !files.audio[0]) {
      return res.status(400).json({ 
        error: 'No audio file provided',
        details: 'Please upload an audio file for transcription'
      });
    }

    const audioFile = files.audio[0];
    
    console.log('Received audio file:', {
      originalFilename: audioFile.originalFilename,
      mimetype: audioFile.mimetype,
      size: audioFile.size,
      filepath: audioFile.filepath
    });

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    try {
      // Simple prompt for professional transcription
      const prompt = 'Employee feedback';

      // Transcribe with Whisper
      const transcription = await openai.audio.transcriptions.create({
        file: fs.createReadStream(audioFile.filepath),
        model: "whisper-1",
        language: "en",
        response_format: "verbose_json",
        temperature: 0.1,
        prompt: prompt
      });

      // Clean up temporary file
      try {
        fs.unlinkSync(audioFile.filepath);
      } catch (cleanupError) {
        console.warn('Failed to cleanup temp file:', cleanupError);
      }

      // Process the transcription for better formatting
      const processedText = processTranscription(transcription.text);

      return res.status(200).json({
        success: true,
        transcription: processedText,
        originalText: transcription.text,
        duration: transcription.duration,
        language: transcription.language || 'en'
      });

    } catch (whisperError) {
      // Clean up temp file even if transcription fails
      try {
        if (audioFile.filepath && fs.existsSync(audioFile.filepath)) {
          fs.unlinkSync(audioFile.filepath);
        }
      } catch (cleanupError) {
        console.warn('Failed to cleanup temp file after error:', cleanupError);
      }

      console.error('Whisper API error:', whisperError);
      
      let errorMessage = 'Failed to transcribe audio';
      if (whisperError.code === 'invalid_request_error') {
        errorMessage = 'Audio file format not supported or file too large';
      } else if (whisperError.code === 'rate_limit_exceeded') {
        errorMessage = 'Rate limit exceeded. Please try again in a moment';
      }

      return res.status(500).json({
        error: errorMessage,
        details: whisperError.message,
        code: whisperError.code
      });
    }

  } catch (error) {
    console.error('Transcription endpoint error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
}

// Process transcription for better formatting
function processTranscription(text) {
  if (!text) return text;
  
  let processed = text.trim();
  
  // Ensure first letter is capitalized
  processed = processed.charAt(0).toUpperCase() + processed.slice(1);
  
  // Add period at the end if it doesn't have punctuation
  if (!/[.!?]$/.test(processed)) {
    processed += '.';
  }
  
  // Clean up multiple spaces
  processed = processed.replace(/\s+/g, ' ');
  
  // Improve sentence structure - add periods before capitalized words that start new sentences
  processed = processed.replace(/([a-z])\s+([A-Z][a-z])/g, '$1. $2');
  
  return processed;
} 