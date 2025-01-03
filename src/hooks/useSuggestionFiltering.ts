import { useMemo } from 'react';

interface AiFeedbackSuggestion {
  type: 'critical' | 'enhancement';
  category: 'clarity' | 'specificity' | 'actionability' | 'tone' | 'completeness';
  suggestion: string;
  context?: string;
  highlightStart?: string;
  highlightEnd?: string;
}

// Helper function for fuzzy text matching
function fuzzyMatch(text: string, pattern: string): boolean {
  if (!pattern) return false;
  
  const cleanText = text.toLowerCase().replace(/\s+/g, ' ').trim();
  const cleanPattern = pattern.toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/\.{3,}$/, '') // Remove trailing ellipsis
    .replace(/\s*\.$/, '') // Remove single trailing dot
    .trim();
  
  // Try exact match first
  if (cleanText.includes(cleanPattern)) return true;
  
  // Try matching with some flexibility
  const words = cleanPattern.split(' ');
  let lastIndex = -1;
  
  return words.every(word => {
    const index = cleanText.indexOf(word, lastIndex + 1);
    if (index === -1) return false;
    lastIndex = index;
    return true;
  });
}

export function useSuggestionFiltering(
  suggestions: AiFeedbackSuggestion[],
  text: string
) {
  return useMemo(() => {
    return suggestions
      .filter((s): s is AiFeedbackSuggestion & { context: string } => {
        if (!s.context) return false;
        // Clean up the context by removing trailing dots and whitespace
        const cleanContext = s.context.toLowerCase()
          .replace(/\.{3,}$/, '') // Remove trailing ellipsis
          .replace(/\s*\.$/, '') // Remove single trailing dot
          .trim();
        return fuzzyMatch(text.toLowerCase(), cleanContext);
      })
      .map(s => ({
        ...s,
        // Clean up the context for display
        context: s.context.replace(/\.{3,}$/, '').replace(/\s*\.$/, '').trim()
      }));
  }, [suggestions, text]);
} 