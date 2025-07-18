import express from 'express';
import multer from 'multer';
import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';

// Extend Express Request type to include file from multer
interface MulterRequest extends express.Request {
  file?: Express.Multer.File;
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Configure multer for file uploads (store in memory)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024 // 25MB limit (Whisper's max)
  },
  fileFilter: (req: express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    // Accept audio files
    if (file.mimetype.startsWith('audio/') || file.mimetype === 'video/webm') {
      cb(null, true);
    } else {
      cb(new Error('Only audio files are allowed'));
    }
  }
});

export async function transcribeAudio(req: MulterRequest, res: express.Response) {
  console.log('🎤 Transcribe endpoint hit:', {
    method: req.method,
    url: req.url,
    hasFile: !!req.file,
    teamMemberName: req.body?.teamMemberName,
    headers: Object.keys(req.headers)
  });
  
  try {
    if (!process.env.OPENAI_API_KEY) {
      console.error('❌ OpenAI API key not configured');
      return res.status(500).json({ 
        error: 'OpenAI API key not configured',
        details: 'OPENAI_API_KEY environment variable is missing'
      });
    }

    if (!req.file) {
      return res.status(400).json({ 
        error: 'No audio file provided',
        details: 'Please upload an audio file for transcription'
      });
    }

    const audioFile = req.file;
    
    console.log('Received audio file:', {
      originalname: audioFile.originalname,
      mimetype: audioFile.mimetype,
      size: audioFile.size
    });

    // Create a temporary file for Whisper API
    const tempDir = path.join(process.cwd(), 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const tempFilename = `audio_${Date.now()}_${Math.random().toString(36).substring(7)}.webm`;
    const tempFilePath = path.join(tempDir, tempFilename);

    // Write the buffer to a temporary file
    fs.writeFileSync(tempFilePath, audioFile.buffer);

    try {
      // Simple prompt for professional transcription
      const prompt = 'Employee feedback';

      // Transcribe with Whisper
      const transcription = await openai.audio.transcriptions.create({
        file: fs.createReadStream(tempFilePath),
        model: "whisper-1",
        language: "en", // Can be made configurable
        response_format: "verbose_json", // Get timestamps and confidence
        temperature: 0.1, // Lower temperature for more consistent results
        prompt: prompt // Add context for better name recognition
      });

      // Clean up temporary file
      fs.unlinkSync(tempFilePath);

      // Process the transcription for better formatting
      const processedText = processTranscription(transcription.text);

      res.json({
        success: true,
        transcription: processedText,
        originalText: transcription.text,
        duration: transcription.duration,
        language: transcription.language || 'en'
      });

    } catch (whisperError: any) {
      // Clean up temp file even if transcription fails
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }

      console.error('Whisper API error:', whisperError);
      
      let errorMessage = 'Failed to transcribe audio';
      if (whisperError.code === 'invalid_request_error') {
        errorMessage = 'Audio file format not supported or file too large';
      } else if (whisperError.code === 'rate_limit_exceeded') {
        errorMessage = 'Rate limit exceeded. Please try again in a moment';
      }

      res.status(500).json({
        error: errorMessage,
        details: whisperError.message,
        code: whisperError.code
      });
    }

  } catch (error: any) {
    console.error('Transcription endpoint error:', error);
    res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
}

// Process transcription for better formatting
function processTranscription(text: string): string {
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



// Export the multer middleware for use in routes
export const audioUpload = upload.single('audio'); 