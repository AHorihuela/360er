import { Editor } from '@tiptap/react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
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

interface EditorToolbarProps {
  editor: Editor;
}

export function EditorToolbar({ editor }: EditorToolbarProps) {
  return (
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
  );
} 