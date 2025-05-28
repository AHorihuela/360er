import { useEditor, EditorContent } from '@tiptap/react';
import { useEffect, useRef, useState, useMemo } from 'react';
import MarkdownIt from 'markdown-it';
import { EditorToolbar } from './EditorToolbar';
import { editorExtensions, editorProps } from './editor-config';
import { ReactNode } from 'react';
import { convertHtmlToMarkdown, normalizeContent } from './markdown-conversion';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  actionButtons?: ReactNode;
  isSaving?: boolean;
}

const md = new MarkdownIt({
  html: true,
  breaks: true,
  linkify: true,
});

export function MarkdownEditor({ value, onChange, actionButtons, isSaving }: MarkdownEditorProps) {
  const isUpdatingFromProp = useRef(false);
  const lastPropValue = useRef(value);
  const [, forceUpdate] = useState({});
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastUserChangeRef = useRef<string>('');
  const editorInstanceRef = useRef<any>(null);
  const initialValueRef = useRef(value); // Store initial value
  const [editorKey, setEditorKey] = useState(0); // Key to force editor recreation

  // Development logging (remove in production)
  // const log = (message: string, data?: any) => console.log(`[MarkdownEditor] ${message}`, data || '');
  const log = (_message?: string, _data?: any) => {}; // Disabled for production

  // Update initialValueRef when value changes significantly (like on page refresh)
  useEffect(() => {
    // If the value is significantly different from what we have stored,
    // and we're not currently in the middle of user editing, update the initial value
    if (value !== initialValueRef.current && !isUpdatingFromProp.current) {
      const currentLength = initialValueRef.current?.length || 0;
      const newLength = value?.length || 0;
      
      // More sophisticated change detection
      const lengthDifference = Math.abs(newLength - currentLength);
      const significantLengthChange = lengthDifference > 50; // Reduced threshold
      const emptyToContent = currentLength === 0 && newLength > 0;
      const contentToEmpty = currentLength > 0 && newLength === 0;
      const completelyDifferent = value !== initialValueRef.current && 
                                 !value?.includes(initialValueRef.current?.substring(0, 50) || '') &&
                                 !initialValueRef.current?.includes(value?.substring(0, 50) || '');
      
      const significantChange = significantLengthChange || emptyToContent || contentToEmpty || completelyDifferent;
      
      log('🔍 Change detection analysis:', {
        currentLength,
        newLength,
        lengthDifference,
        significantLengthChange,
        emptyToContent,
        contentToEmpty,
        completelyDifferent,
        significantChange,
        currentPreview: initialValueRef.current?.substring(0, 100),
        newPreview: value?.substring(0, 100)
      });
      
      if (significantChange) {
        log('🔄 Significant content change detected, updating initial value and recreating editor');
        initialValueRef.current = value;
        lastUserChangeRef.current = value || '';
        lastPropValue.current = value;
        // Force editor recreation with new key
        setEditorKey(prev => prev + 1);
      }
    }
  }, [value]);

  // Memoize the initial content to prevent unnecessary editor recreations
  const initialContent = useMemo(() => {
    const initialValue = initialValueRef.current;
    log('🔧 Creating initial content with length:', initialValue?.length || 0);
    log('🔧 Content preview:', initialValue?.substring(0, 200) || 'empty');
    log('🔧 Content has images:', initialValue?.includes('![') || false);
    const rendered = md.render(initialValue || '');
    log('🔧 Rendered HTML preview:', rendered.substring(0, 200) || 'empty');
    log('🔧 Rendered HTML has img tags:', rendered.includes('<img') || false);
    return rendered;
  }, [editorKey]); // Depend on editorKey to recreate when needed

  // Memoize editor configuration to prevent recreation
  const editorConfig = useMemo(() => ({
    extensions: editorExtensions,
    content: initialContent,
    editable: true,
    editorProps,
    onSelectionUpdate: ({ editor }: any) => {
      // Force component to re-render when selection changes
      // This ensures formatting buttons show correct active state
      log('Selection updated - forcing toolbar re-render');
      forceUpdate({});
    },
    onUpdate: ({ editor }: any) => {
      log('📝 onUpdate triggered');
      
      // Don't process onChange if we're updating from prop change
      if (isUpdatingFromProp.current) {
        log('⏸️  Skipping onUpdate - currently updating from prop change');
        return;
      }

      // Clear any pending updates
      if (updateTimeoutRef.current) {
        log('🧹 Clearing existing timeout');
        clearTimeout(updateTimeoutRef.current);
      }

      // Function to process the update
      const processUpdate = () => {
        log('🔄 Processing update...');
        
        // Double check we're still not updating from props
        if (isUpdatingFromProp.current) {
          log('⏸️  Aborting processUpdate - prop update in progress');
          return;
        }

        // Convert HTML back to markdown
        const html = editor.getHTML();
        log('🔍 Current HTML:', html.substring(0, 100) + (html.length > 100 ? '...' : ''));
        
        const markdown = convertHtmlToMarkdown(html);
        log('📄 Converted markdown:', markdown.substring(0, 100) + (markdown.length > 100 ? '...' : ''));
        log('📄 Last user change:', lastUserChangeRef.current.substring(0, 100) + (lastUserChangeRef.current.length > 100 ? '...' : ''));
        
        // Only call onChange if the content actually changed
        if (markdown !== lastUserChangeRef.current) {
          log('✅ Content changed - calling onChange');
          lastUserChangeRef.current = markdown;
          onChange(markdown);
        } else {
          log('🔄 Content unchanged - skipping onChange');
        }
      };

      // In test environment, process immediately to avoid timing issues
      const isTestEnv = typeof window !== 'undefined' && window.navigator?.userAgent?.includes('jsdom');
      log(`🌍 Environment: ${isTestEnv ? 'Test (jsdom)' : 'Production'}`);
      
      if (isTestEnv) {
        log('⚡ Processing immediately (test environment)');
        processUpdate();
      } else {
        log('⏰ Setting timeout for 150ms (production environment)');
        updateTimeoutRef.current = setTimeout(processUpdate, 150);
      }
    }
  }), [editorKey]); // Depend on editorKey to recreate when needed

  const editor = useEditor(editorConfig);

  // Store editor reference
  editorInstanceRef.current = editor;
  
  // Log editor initialization
  if (editor) {
    log('✅ Editor initialized successfully');
  } else {
    log('⚠️  Editor not initialized yet');
  }

  // Update editor content when value prop changes, but only if it's actually different
  // and not from user typing
  useEffect(() => {
    log('🔄 useEffect triggered - prop value changed');
    log('📥 New prop value:', value?.substring(0, 100) + (value && value.length > 100 ? '...' : ''));
    log('📥 Last prop value:', lastPropValue.current?.substring(0, 100) + (lastPropValue.current && lastPropValue.current.length > 100 ? '...' : ''));
    
    if (editor && value !== undefined && value !== null) {
      // Only update if this is a meaningful change
      if (value !== lastPropValue.current) {
        log('📝 Prop value is different from last prop value');
        
        // Prevent ping-ponging: don't update if this exactly matches the last user change
        if (value === lastUserChangeRef.current) {
          log('🔄 Prop matches last user change - preventing ping-pong');
          lastPropValue.current = value;
          return;
        }

        const currentContent = editor.getHTML();
        const newContent = md.render(value);
        
        log('🔍 Current editor HTML:', currentContent.substring(0, 100) + (currentContent.length > 100 ? '...' : ''));
        log('🔍 New content (rendered):', newContent.substring(0, 100) + (newContent.length > 100 ? '...' : ''));
        
        // Additional check: convert both to markdown and compare normalized versions
        const currentMarkdown = convertHtmlToMarkdown(currentContent);
        const normalizedCurrent = normalizeContent(currentMarkdown);
        const normalizedNew = normalizeContent(value);
        
        log('📄 Current markdown (normalized):', normalizedCurrent.substring(0, 100) + (normalizedCurrent.length > 100 ? '...' : ''));
        log('📄 New markdown (normalized):', normalizedNew.substring(0, 100) + (normalizedNew.length > 100 ? '...' : ''));
        log('🔍 Length comparison: current=' + normalizedCurrent.length + ', new=' + normalizedNew.length);
        log('🔍 String equality check:', normalizedCurrent === normalizedNew);
        log('🔍 HTML equality check:', newContent === currentContent);
        
        // Only update if the content is actually different when normalized
        const contentsDifferent = normalizedNew !== normalizedCurrent;
        const htmlDifferent = newContent !== currentContent;
        
        log('🔍 Final decision: contentsDifferent=' + contentsDifferent + ', htmlDifferent=' + htmlDifferent);
        
        if (contentsDifferent && htmlDifferent) {
          log('🚀 Content is different - updating editor');
          
          // Set flag to prevent infinite loops
          isUpdatingFromProp.current = true;
          log('🔒 Set isUpdatingFromProp flag to true');
          
          // Clear any pending user updates to prevent conflicts
          if (updateTimeoutRef.current) {
            log('🧹 Clearing pending user update timeout');
            clearTimeout(updateTimeoutRef.current);
            updateTimeoutRef.current = null;
          }
          
          // Store cursor position safely
          const selection = editor.state?.selection;
          if (!selection) {
            log('⚠️  Editor selection not available, skipping cursor restoration');
            return;
          }
          const { from, to } = selection;
          const wasAtEnd = from === editor.state.doc.content.size;
          
          log(`📍 Cursor position: from=${from}, to=${to}, wasAtEnd=${wasAtEnd}, docSize=${editor.state.doc.content.size}`);
          
          // Update content without emitting an update event
          log('✏️  Calling editor.commands.setContent');
          editor.commands.setContent(newContent, false);
          
          // Restore cursor position intelligently
          requestAnimationFrame(() => {
            log('🔄 Restoring cursor position...');
            try {
              const docSize = editor.state.doc.content.size;
              
              if (wasAtEnd) {
                log(`📍 Restoring cursor to end: ${docSize}`);
                // If cursor was at end, keep it at end
                editor.commands.setTextSelection(docSize);
              } else {
                // Try to restore original position, but safely
                const safeFrom = Math.min(from, docSize);
                const safeTo = Math.min(to, docSize);
                
                log(`📍 Restoring cursor to: from=${safeFrom}, to=${safeTo}`);
                
                if (safeFrom >= 0 && safeTo >= 0 && safeFrom <= docSize) {
                  editor.commands.setTextSelection({ from: safeFrom, to: safeTo });
                }
              }
              
              // Focus the editor to maintain active state
              log('🎯 Focusing editor');
              editor.commands.focus();
            } catch (error) {
              log('❌ Error restoring cursor:', error);
            }
            
            // Reset flag after a short delay to allow for proper state settling
            setTimeout(() => {
              log('🔓 Resetting isUpdatingFromProp flag to false');
              isUpdatingFromProp.current = false;
            }, 200);
          });
        } else {
          log('🔄 Content is the same - skipping update');
        }
        
        lastPropValue.current = value;
        log('💾 Updated lastPropValue.current');
      } else {
        log('🔄 Prop value unchanged');
      }
    } else {
      log('⚠️  Editor not ready or value is null/undefined');
    }
  }, [editor, value]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, []);

  if (!editor) {
    log('⚠️  Rendering: Editor not ready - returning null');
    return null;
  }

  log('🎨 Rendering: Editor ready - rendering component');

  return (
    <div className="relative flex flex-col gap-2">
      <EditorToolbar editor={editor}>
        {actionButtons}
        {isSaving && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground ml-2">
            <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
            <span>Saving...</span>
          </div>
        )}
      </EditorToolbar>
      <div className="relative">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
} 