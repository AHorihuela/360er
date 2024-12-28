import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import MarkdownIt from 'markdown-it';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Heading1,
  Heading2,
  Heading3,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
}

const md = new MarkdownIt({
  html: false,
  breaks: true,
  linkify: true,
});

export function MarkdownEditor({ value, onChange }: MarkdownEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
          HTMLAttributes: {
            class: 'font-bold',
          },
        },
        bulletList: {
          keepMarks: true,
          keepAttributes: true,
          HTMLAttributes: {
            class: 'list-disc pl-6 my-4',
          },
        },
        orderedList: {
          keepMarks: true,
          keepAttributes: true,
          HTMLAttributes: {
            class: 'list-decimal pl-6 my-4',
          },
        },
        paragraph: {
          HTMLAttributes: {
            class: 'my-4',
          },
        },
        listItem: {
          HTMLAttributes: {
            class: 'my-2',
          },
        },
      }),
      Underline,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
    ],
    content: md.render(value),
    editable: true,
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl max-w-none focus:outline-none min-h-[400px] w-full rounded-md border border-input bg-background p-4 [&>h1]:text-2xl [&>h1]:mt-8 [&>h1]:mb-4 [&>h2]:text-xl [&>h2]:mt-6 [&>h2]:mb-3 [&>h3]:text-lg [&>h3]:mt-4 [&>h3]:mb-2'
      }
    },
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
      };
      
      Array.from(tempDiv.childNodes).forEach(processNode);
      
      // Clean up extra newlines and spaces
      markdown = markdown
        .replace(/\n{3,}/g, '\n\n')
        .replace(/^\s+|\s+$/g, '');
      
      onChange(markdown);
    },
  });

  if (!editor) {
    return null;
  }

  return (
    <div className="relative flex flex-col gap-2">
      <div className="sticky top-[64px] z-30 flex flex-wrap items-center gap-1 rounded-md border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={cn(
            'h-8 w-8 p-0',
            editor.isActive('bold') && 'bg-muted'
          )}
          title="Bold"
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={cn(
            'h-8 w-8 p-0',
            editor.isActive('italic') && 'bg-muted'
          )}
          title="Italic"
        >
          <Italic className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={cn(
            'h-8 w-8 p-0',
            editor.isActive('underline') && 'bg-muted'
          )}
          title="Underline"
        >
          <UnderlineIcon className="h-4 w-4" />
        </Button>

        <div className="mx-2 h-4 w-[1px] bg-border" />

        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={cn(
            'h-8 w-8 p-0',
            editor.isActive('heading', { level: 1 }) && 'bg-muted'
          )}
          title="Heading 1"
        >
          <Heading1 className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={cn(
            'h-8 w-8 p-0',
            editor.isActive('heading', { level: 2 }) && 'bg-muted'
          )}
          title="Heading 2"
        >
          <Heading2 className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={cn(
            'h-8 w-8 p-0',
            editor.isActive('heading', { level: 3 }) && 'bg-muted'
          )}
          title="Heading 3"
        >
          <Heading3 className="h-4 w-4" />
        </Button>

        <div className="mx-2 h-4 w-[1px] bg-border" />

        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={cn(
            'h-8 w-8 p-0',
            editor.isActive('bulletList') && 'bg-muted'
          )}
          title="Bullet List"
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={cn(
            'h-8 w-8 p-0',
            editor.isActive('orderedList') && 'bg-muted'
          )}
          title="Ordered List"
        >
          <ListOrdered className="h-4 w-4" />
        </Button>

        <div className="mx-2 h-4 w-[1px] bg-border" />

        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          className={cn(
            'h-8 w-8 p-0',
            editor.isActive({ textAlign: 'left' }) && 'bg-muted'
          )}
          title="Align Left"
        >
          <AlignLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          className={cn(
            'h-8 w-8 p-0',
            editor.isActive({ textAlign: 'center' }) && 'bg-muted'
          )}
          title="Align Center"
        >
          <AlignCenter className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          className={cn(
            'h-8 w-8 p-0',
            editor.isActive({ textAlign: 'right' }) && 'bg-muted'
          )}
          title="Align Right"
        >
          <AlignRight className="h-4 w-4" />
        </Button>
      </div>
      <div className="relative">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
} 