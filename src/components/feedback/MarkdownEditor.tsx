import { useEditor, EditorContent } from '@tiptap/react';
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
  html: false,
  breaks: true,
  linkify: true,
});

export function MarkdownEditor({ value, onChange, actionButtons }: MarkdownEditorProps) {
  const editor = useEditor({
    extensions: editorExtensions,
    content: md.render(value),
    editable: true,
    editorProps,
    onUpdate: ({ editor }) => {
      // Convert HTML back to markdown
      const html = editor.getHTML();
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = html;
      
      let markdown = '';
      
      // Process nodes recursively
      const processNode = (node: Node) => {
        if (node.nodeType === Node.TEXT_NODE) {
          markdown += node.textContent;
          return;
        }
        
        if (node.nodeType === Node.ELEMENT_NODE) {
          const element = node as HTMLElement;
          const tagName = element.tagName.toLowerCase();
          
          switch (tagName) {
            case 'h1':
              markdown += '# ';
              break;
            case 'h2':
              markdown += '## ';
              break;
            case 'h3':
              markdown += '### ';
              break;
            case 'p':
              if (markdown && !markdown.endsWith('\n\n')) {
                markdown += '\n\n';
              }
              break;
            case 'ul':
              if (!markdown.endsWith('\n')) markdown += '\n';
              break;
            case 'ol':
              if (!markdown.endsWith('\n')) markdown += '\n';
              break;
            case 'li':
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
          }
          
          Array.from(node.childNodes).forEach(processNode);
          
          switch (tagName) {
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
              markdown += '\n';
              break;
            case 'p':
              if (!markdown.endsWith('\n\n')) {
                markdown += '\n\n';
              }
              break;
          }
        }
      }
      
      Array.from(tempDiv.childNodes).forEach(processNode);
      
      // Clean up extra newlines and spaces
      markdown = markdown
        .replace(/\n{3,}/g, '\n\n')
        .replace(/^\s+|\s+$/g, '');
      
      onChange(markdown);
    }
  });

  if (!editor) {
    return null;
  }

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