interface ValidationResult {
  isValid: boolean;
  message: string;
  warnings?: string[];
  showLengthWarning: boolean;
}

const MIN_FEEDBACK_LENGTH = 100;
const MIN_WORDS = 20;

// Common generic phrases that might indicate low-quality feedback
const GENERIC_PHRASES = [
  'good job',
  'great work',
  'needs improvement',
  'could be better',
  'keep up the good work',
  'needs to work on',
  'should improve',
  'doing well',
  'doing great',
  'keep it up',
  'doing fine',
  'meets expectations',
  'below expectations',
  'above expectations',
  'satisfactory',
  'unsatisfactory',
  'adequate',
  'inadequate',
  'good performance',
  'poor performance',
];

// Potentially non-constructive language
const NON_CONSTRUCTIVE_PHRASES = [
  'never',
  'terrible',
  'horrible',
  'worst',
  'lazy',
  'incompetent',
  'useless',
  'stupid',
  'bad',
  'awful',
  'pathetic',
  'hopeless',
  'worthless',
  'clueless',
  'impossible',
  'disaster',
  'failure',
  'mess',
  'waste',
  'careless',
  'sloppy',
];

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

export function validateFeedback(text: string, showLengthRequirements: boolean = false): ValidationResult {
  const warnings: string[] = [];
  
  // Only show length warnings if explicitly requested (e.g., after submission attempt)
  if (showLengthRequirements) {
    if (text.length < MIN_FEEDBACK_LENGTH) {
      return {
        isValid: false,
        message: `Please provide at least ${MIN_FEEDBACK_LENGTH} characters (currently ${text.length})`,
        showLengthWarning: true
      };
    }

    const wordCount = text.split(/\s+/).filter(word => word.length > 0).length;
    if (wordCount < MIN_WORDS) {
      return {
        isValid: false,
        message: `Please provide at least ${MIN_WORDS} words (currently ${wordCount})`,
        showLengthWarning: true
      };
    }
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
  const words = text.split(/\s+/).filter(word => word.length > 0);
  
  // Only add the sentence warning if there's substantial content but not properly structured
  if (words.length >= 10 && sentences.length < 2) {
    warnings.push('Consider providing feedback in multiple complete sentences');
  }

  return {
    isValid: true,
    message: showLengthRequirements ? `${text.length} characters` : '',
    warnings: warnings.length > 0 ? warnings : undefined,
    showLengthWarning: showLengthRequirements
  };
} 