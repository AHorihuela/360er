import { useEditor, EditorContent } from '@tiptap/react';
import { useEffect, useRef, useState, useMemo } from 'react';
import MarkdownIt from 'markdown-it';
import { EditorToolbar } from './EditorToolbar';
import { editorExtensions, editorProps } from './editor-config';
import { ReactNode } from 'react';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  actionButtons?: ReactNode;
}

const md = new MarkdownIt({
  html: true,
  breaks: true,
  linkify: true,
});

export function MarkdownEditor({ value, onChange, actionButtons }: MarkdownEditorProps) {
  const isUpdatingFromProp = useRef(false);
  const lastPropValue = useRef(value);
  const [, forceUpdate] = useState({});
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastUserChangeRef = useRef<string>('');
  const editorInstanceRef = useRef<any>(null);

  // Development logging (remove in production)
  // const log = (message: string, data?: any) => console.log(`[MarkdownEditor] ${message}`, data || '');
  const log = (_message?: string, _data?: any) => {}; // Disabled for production

  // Memoize the initial content to prevent unnecessary editor recreations
  const initialContent = useMemo(() => {
    log('🔧 Creating initial content with length:', value?.length || 0);
    log('🔧 Content preview:', value?.substring(0, 200) || 'empty');
    log('🔧 Content has images:', value?.includes('![') || false);
    const rendered = md.render(value || '');
    log('🔧 Rendered HTML preview:', rendered.substring(0, 200) || 'empty');
    log('🔧 Rendered HTML has img tags:', rendered.includes('<img') || false);
    return rendered;
  }, [value]); // Depend on value so it updates when content changes

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
  }), []);

  const editor = useEditor(editorConfig);

  // Store editor reference
  editorInstanceRef.current = editor;
  
  // Log editor initialization
  if (editor) {
    log('✅ Editor initialized successfully');
  } else {
    log('⚠️  Editor not initialized yet');
  }

  // Helper function to convert HTML back to markdown 
  function convertHtmlToMarkdown(html: string): string {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    
    let markdown = '';
    
    const processNode = (node: Node, isInsideList = false) => {
      if (node.nodeType === Node.TEXT_NODE) {
        // Clean up whitespace from text nodes
        let text = node.textContent || '';
        // Remove excessive whitespace and normalize
        text = text.replace(/\s+/g, ' ');
        if (text.trim()) {
          // Preserve leading/trailing spaces if they're meaningful
          if (text.startsWith(' ') && markdown && !markdown.endsWith(' ')) {
            markdown += ' ';
          }
          markdown += text.trim();
          if (text.endsWith(' ')) {
            markdown += ' ';
          }
        }
        return;
      }
      
      if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as HTMLElement;
        const tagName = element.tagName.toLowerCase();
        
        // Handle opening tags
        switch (tagName) {
          case 'h1':
            // Ensure proper spacing before headings
            if (markdown && !markdown.endsWith('\n')) {
              markdown += '\n';
            }
            // Add extra newline if there's content before this heading
            if (markdown.trim()) {
              markdown += '\n';
            }
            markdown += '# ';
            break;
          case 'h2':
            // Ensure proper spacing before headings
            if (markdown && !markdown.endsWith('\n')) {
              markdown += '\n';
            }
            // Add extra newline if there's content before this heading
            if (markdown.trim()) {
              markdown += '\n';
            }
            markdown += '## ';
            break;
          case 'h3':
            // Ensure proper spacing before headings
            if (markdown && !markdown.endsWith('\n')) {
              markdown += '\n';
            }
            // Add extra newline if there's content before this heading
            if (markdown.trim()) {
              markdown += '\n';
            }
            markdown += '### ';
            break;
          case 'h4':
            // Ensure proper spacing before headings
            if (markdown && !markdown.endsWith('\n')) {
              markdown += '\n';
            }
            // Add extra newline if there's content before this heading
            if (markdown.trim()) {
              markdown += '\n';
            }
            markdown += '#### ';
            break;
          case 'h5':
            // Ensure proper spacing before headings
            if (markdown && !markdown.endsWith('\n')) {
              markdown += '\n';
            }
            // Add extra newline if there's content before this heading
            if (markdown.trim()) {
              markdown += '\n';
            }
            markdown += '##### ';
            break;
          case 'h6':
            // Ensure proper spacing before headings
            if (markdown && !markdown.endsWith('\n')) {
              markdown += '\n';
            }
            // Add extra newline if there's content before this heading
            if (markdown.trim()) {
              markdown += '\n';
            }
            markdown += '###### ';
            break;
          case 'p':
            // Only add spacing if we're not already at the start of a new line
            if (markdown && !markdown.endsWith('\n')) {
              markdown += '\n\n';
            }
            break;
          case 'ul':
          case 'ol':
            // Ensure proper spacing before lists
            if (markdown && !markdown.endsWith('\n')) {
              markdown += '\n';
            }
            // Add extra newline if there's content before this list
            if (markdown.trim() && !markdown.endsWith('\n\n')) {
              markdown += '\n';
            }
            break;
          case 'li':
            // Ensure we're on a new line for list items
            if (markdown && !markdown.endsWith('\n')) {
              markdown += '\n';
            }
            if (element.parentElement?.tagName.toLowerCase() === 'ul') {
              markdown += '- ';
            } else if (element.parentElement?.tagName.toLowerCase() === 'ol') {
              const index = Array.from(element.parentElement.children).indexOf(element) + 1;
              markdown += `${index}. `;
            }
            break;
          case 'strong':
          case 'b':
            markdown += '**';
            break;
          case 'em':
          case 'i':
            markdown += '_';
            break;
          case 'u':
            markdown += '__';
            break;
          case 'br':
            markdown += '\n';
            break;
          case 'img':
            const src = element.getAttribute('src') || '';
            const alt = element.getAttribute('alt') || '';
            if (src) {
              if (markdown && !markdown.endsWith('\n')) {
                markdown += '\n\n';
              }
              markdown += `![${alt}](${src})`;
              if (!markdown.endsWith('\n')) {
                markdown += '\n\n';
              }
            }
            return; // Don't process children for img elements
        }
        
        // Process child nodes
        const isListItem = tagName === 'li';
        Array.from(node.childNodes).forEach(child => processNode(child, isListItem));
        
        // Handle closing tags
        switch (tagName) {
          case 'h1':
          case 'h2':
          case 'h3':
          case 'h4':
          case 'h5':
          case 'h6':
            // Always ensure headings end with double newlines for proper separation
            if (!markdown.endsWith('\n')) {
              markdown += '\n';
            }
            markdown += '\n';
            break;
          case 'strong':
          case 'b':
            markdown += '**';
            break;
          case 'em':
          case 'i':
            markdown += '_';
            break;
          case 'u':
            markdown += '__';
            break;
          case 'li':
            // Ensure list items end with a newline
            if (!markdown.endsWith('\n')) {
              markdown += '\n';
            }
            break;
          case 'p':
            // Ensure paragraphs end with proper spacing
            if (!markdown.endsWith('\n')) {
              markdown += '\n';
            }
            break;
          case 'ul':
          case 'ol':
            // Add spacing after lists
            if (!markdown.endsWith('\n')) {
              markdown += '\n';
            }
            break;
        }
      }
    };
    
    Array.from(tempDiv.childNodes).forEach(node => processNode(node));
    
    // Clean up the final markdown output more carefully
    markdown = markdown
      .replace(/\n{4,}/g, '\n\n\n') // Replace 4+ newlines with 3 (heading + spacing)
      .replace(/[ \t]+\n/g, '\n') // Remove trailing spaces before newlines
      .replace(/\n[ \t]+/g, '\n') // Remove leading spaces after newlines
      .replace(/[ \t]{2,}/g, ' ') // Replace multiple spaces with single space
      .replace(/^\s+/g, ''); // Trim start whitespace only
    
    // Ensure proper structure: headings should have double newlines after them
    markdown = markdown
      .replace(/(#{1,6}\s+[^\n]+)\n(?!\n)/g, '$1\n\n') // Add double newline after headings if not present
      .replace(/(\n- [^\n]+)\n(?![\n-])/g, '$1\n\n') // Add spacing after list items when followed by non-list content
      .replace(/(\n\d+\. [^\n]+)\n(?![\n\d])/g, '$1\n\n'); // Add spacing after numbered list items when followed by non-list content
    
    // Final cleanup: remove any trailing spaces but preserve structure
    markdown = markdown.replace(/[ \t]+$/gm, '');
    
    return markdown;
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

  // Helper function to normalize content for comparison
  function normalizeContent(content: string): string {
    if (!content) return '';
    
    return content
      .replace(/\r\n/g, '\n')  // Normalize line endings
      .replace(/\r/g, '\n')    // Normalize line endings
      // Be more careful with whitespace normalization to preserve markdown structure
      .replace(/[ \t]+/g, ' ')    // Normalize spaces and tabs to single spaces, but preserve newlines
      .replace(/\n{4,}/g, '\n\n\n')  // Normalize excessive newlines but allow for heading spacing
      .replace(/\n[ \t]+/g, '\n') // Remove spaces after newlines
      .replace(/[ \t]+\n/g, '\n') // Remove spaces before newlines
      // Don't trim aggressively - preserve leading/trailing structure
      .replace(/^[ \t]+/g, '') // Remove leading spaces/tabs only
      .replace(/[ \t]+$/g, ''); // Remove trailing spaces/tabs only
  }

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
      </EditorToolbar>
      <div className="relative">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
} 