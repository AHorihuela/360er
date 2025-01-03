import { renderHook } from '@testing-library/react';
import { useSuggestionFiltering } from './useSuggestionFiltering';

describe('useSuggestionFiltering', () => {
  const mockSuggestions = [
    {
      type: 'enhancement' as const,
      category: 'clarity' as const,
      suggestion: 'Be more specific',
      context: 'Shows good initiative',
      highlightStart: 'Shows',
      highlightEnd: 'initiative'
    },
    {
      type: 'critical' as const,
      category: 'specificity' as const,
      suggestion: 'Add examples',
      context: 'Could improve in some areas...',
      highlightStart: 'Could',
      highlightEnd: 'areas'
    }
  ];

  it('should filter suggestions based on exact text match', () => {
    const text = 'Shows good initiative in the project';
    const { result } = renderHook(() => useSuggestionFiltering(mockSuggestions, text));
    
    expect(result.current).toHaveLength(1);
    expect(result.current[0].context).toBe('Shows good initiative');
  });

  it('should handle text with trailing dots', () => {
    const text = 'Could improve in some areas...';
    const { result } = renderHook(() => useSuggestionFiltering(mockSuggestions, text));
    
    expect(result.current).toHaveLength(1);
    expect(result.current[0].context).toBe('Could improve in some areas');
  });

  it('should handle case insensitive matching', () => {
    const text = 'SHOWS GOOD INITIATIVE';
    const { result } = renderHook(() => useSuggestionFiltering(mockSuggestions, text));
    
    expect(result.current).toHaveLength(1);
    expect(result.current[0].context).toBe('Shows good initiative');
  });

  it('should handle extra whitespace', () => {
    const text = '  Shows    good    initiative  ';
    const { result } = renderHook(() => useSuggestionFiltering(mockSuggestions, text));
    
    expect(result.current).toHaveLength(1);
    expect(result.current[0].context).toBe('Shows good initiative');
  });

  it('should handle empty suggestions array', () => {
    const text = 'Some text';
    const { result } = renderHook(() => useSuggestionFiltering([], text));
    
    expect(result.current).toHaveLength(0);
  });

  it('should handle empty text', () => {
    const { result } = renderHook(() => useSuggestionFiltering(mockSuggestions, ''));
    
    expect(result.current).toHaveLength(0);
  });

  it('should handle suggestions without context', () => {
    const suggestionsWithoutContext = [
      {
        type: 'enhancement' as const,
        category: 'clarity' as const,
        suggestion: 'Be more specific'
      }
    ];
    
    const { result } = renderHook(() => 
      useSuggestionFiltering(suggestionsWithoutContext, 'Some text')
    );
    
    expect(result.current).toHaveLength(0);
  });
}); 