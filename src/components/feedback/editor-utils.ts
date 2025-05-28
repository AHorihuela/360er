// Editor utility functions
// Extracted from MarkdownEditor for better maintainability

export function createDebugLogger(enabled: boolean = false) {
  return (message: string, data?: any) => {
    if (enabled) {
      console.log(`[MarkdownEditor] ${message}`, data || '');
    }
  };
}

export function isTestEnvironment(): boolean {
  return typeof window !== 'undefined' && window.navigator?.userAgent?.includes('jsdom');
}

export function safeCursorRestore(editor: any, from: number, to: number, wasAtEnd: boolean) {
  try {
    const docSize = editor.state.doc.content.size;
    
    if (wasAtEnd) {
      // If cursor was at end, keep it at end
      editor.commands.setTextSelection(docSize);
    } else {
      // Try to restore original position, but safely
      const safeFrom = Math.min(from, docSize);
      const safeTo = Math.min(to, docSize);
      
      if (safeFrom >= 0 && safeTo >= 0 && safeFrom <= docSize) {
        editor.commands.setTextSelection({ from: safeFrom, to: safeTo });
      }
    }
    
    // Focus the editor to maintain active state
    editor.commands.focus();
  } catch (error) {
    console.warn('Error restoring cursor:', error);
  }
} 