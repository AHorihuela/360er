import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Highlight from '@tiptap/extension-highlight'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import Placeholder from '@tiptap/extension-placeholder'
import { marked } from 'marked'
import { cn } from '@/lib/utils'
import { useEffect } from 'react'

interface RichTextEditorProps {
  content: string
  onChange?: (content: string) => void
  className?: string
  placeholder?: string
  editable?: boolean
}

const globalStyles = `
  .ProseMirror {
    min-height: calc(100vh - 20rem);
    max-height: calc(100vh - 20rem);
    padding: 1rem;
    outline: none;
    overflow-y: auto;
  }

  .ProseMirror > * + * {
    margin-top: 0.75em;
  }

  .ProseMirror ul,
  .ProseMirror ol {
    padding: 0 1rem;
    list-style-type: disc;
  }

  .ProseMirror ol {
    list-style-type: decimal;
  }

  .ProseMirror h1 {
    font-size: 2em;
    font-weight: 600;
    margin-top: 1em;
    margin-bottom: 0.5em;
    line-height: 1.2;
  }

  .ProseMirror h2 {
    font-size: 1.5em;
    font-weight: 600;
    margin-top: 1em;
    margin-bottom: 0.5em;
    line-height: 1.3;
  }

  .ProseMirror h3 {
    font-size: 1.25em;
    font-weight: 600;
    margin-top: 1em;
    margin-bottom: 0.5em;
    line-height: 1.4;
  }

  .ProseMirror code {
    background-color: rgba(97, 97, 97, 0.1);
    color: #616161;
    padding: 0.2em 0.4em;
    border-radius: 3px;
    font-family: monospace;
    font-size: 0.9em;
  }

  .ProseMirror pre {
    background: #0D0D0D;
    color: #FFF;
    padding: 0.75rem 1rem;
    border-radius: 0.5rem;
    overflow-x: auto;
  }

  .ProseMirror pre code {
    color: inherit;
    padding: 0;
    background: none;
    font-size: 0.9em;
  }

  .ProseMirror mark {
    background-color: #FAF594;
  }

  .ProseMirror img {
    max-width: 100%;
    height: auto;
  }

  .ProseMirror hr {
    margin: 2rem 0;
    border: none;
    border-top: 2px solid rgba(13, 13, 13, 0.1);
  }

  .ProseMirror blockquote {
    padding-left: 1rem;
    border-left: 3px solid rgba(13, 13, 13, 0.2);
    color: rgba(13, 13, 13, 0.8);
    font-style: italic;
    margin: 1rem 0;
  }

  .ProseMirror p.is-editor-empty:first-child::before {
    color: #adb5bd;
    content: attr(data-placeholder);
    float: left;
    height: 0;
    pointer-events: none;
  }

  .ProseMirror:focus {
    outline: none;
  }
`

export function RichTextEditor({
  content,
  onChange,
  className,
  placeholder = 'Start typing...',
  editable = true,
}: RichTextEditorProps) {
  const initialContent = content ? marked(content, { headerIds: false, mangle: false }) : ''

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Highlight,
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      Placeholder.configure({
        placeholder,
      }),
    ],
    content: initialContent,
    editable,
    onUpdate: ({ editor }) => {
      onChange?.(editor.getHTML())
    },
  })

  useEffect(() => {
    if (editor && content) {
      const newContent = marked(content, { headerIds: false, mangle: false })
      if (newContent !== editor.getHTML()) {
        editor.commands.setContent(newContent)
      }
    }
  }, [editor, content])

  if (!editor) {
    return null
  }

  return (
    <div className={cn('prose prose-stone dark:prose-invert max-w-none w-full', className)}>
      <EditorContent editor={editor} />
      <style dangerouslySetInnerHTML={{ __html: globalStyles }} />
    </div>
  )
} 