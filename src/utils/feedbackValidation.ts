interface ValidationResult {
  isValid: boolean;
  message: string;
  warnings?: string[];
}

const MIN_FEEDBACK_LENGTH = 50;
const MAX_FEEDBACK_LENGTH = 2000;
const MIN_WORDS = 10;

// Common generic phrases that might indicate low-quality feedback
const GENERIC_PHRASES = [
  'good job',
  'great work',
  'needs improvement',
  'could be better',
  'keep up the good work',
  'needs to work on',
  'should improve',
];

// Potentially non-constructive language
const NON_CONSTRUCTIVE_PHRASES = [
  'always',
  'never',
  'terrible',
  'horrible',
  'worst',
  'lazy',
  'incompetent',
  'useless',
  'stupid',
];

function checkForRepetition(text: string): boolean {
  const words = text.toLowerCase().split(/\s+/);
  const wordFrequency: { [key: string]: number } = {};
  
  words.forEach(word => {
    if (word.length > 3) { // Only check words longer than 3 letters
      wordFrequency[word] = (wordFrequency[word] || 0) + 1;
    }
  });

  // Check if any word (except common words) appears too frequently
  return Object.values(wordFrequency).some(freq => freq > 3);
}

function containsGenericPhrases(text: string): string[] {
  const lowercaseText = text.toLowerCase();
  return GENERIC_PHRASES.filter(phrase => 
    lowercaseText.includes(phrase.toLowerCase())
  );
}

function containsNonConstructiveLanguage(text: string): string[] {
  const lowercaseText = text.toLowerCase();
  return NON_CONSTRUCTIVE_PHRASES.filter(phrase => 
    lowercaseText.includes(phrase.toLowerCase())
  );
}

export function validateFeedback(text: string): ValidationResult {
  const warnings: string[] = [];
  
  // Basic length checks
  if (text.length < MIN_FEEDBACK_LENGTH) {
    return {
      isValid: false,
      message: `Please provide at least ${MIN_FEEDBACK_LENGTH} characters (${text.length}/${MIN_FEEDBACK_LENGTH})`
    };
  }

  if (text.length > MAX_FEEDBACK_LENGTH) {
    return {
      isValid: false,
      message: `Exceeds maximum length of ${MAX_FEEDBACK_LENGTH} characters (${text.length}/${MAX_FEEDBACK_LENGTH})`
    };
  }

  // Word count check
  const wordCount = text.split(/\s+/).filter(word => word.length > 0).length;
  if (wordCount < MIN_WORDS) {
    return {
      isValid: false,
      message: `Please provide at least ${MIN_WORDS} words (currently ${wordCount} words)`
    };
  }

  // Check for repetitive language
  if (checkForRepetition(text)) {
    warnings.push('Consider using more varied language - some words appear frequently');
  }

  // Check for generic phrases
  const genericPhrases = containsGenericPhrases(text);
  if (genericPhrases.length > 0) {
    warnings.push('Try to be more specific instead of using generic phrases like: ' + 
      genericPhrases.join(', '));
  }

  // Check for non-constructive language
  const nonConstructivePhrases = containsNonConstructiveLanguage(text);
  if (nonConstructivePhrases.length > 0) {
    warnings.push('Consider rephrasing to be more constructive - avoid terms like: ' + 
      nonConstructivePhrases.join(', '));
  }

  // Check for sentence structure (rough approximation)
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  if (sentences.length < 2) {
    warnings.push('Consider providing feedback in multiple complete sentences');
  }

  return {
    isValid: true,
    message: `${text.length}/${MAX_FEEDBACK_LENGTH} characters`,
    warnings: warnings.length > 0 ? warnings : undefined
  };
} 