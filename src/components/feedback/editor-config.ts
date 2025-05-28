// TipTap editor configuration
// Extracted from MarkdownEditor for better maintainability

import StarterKit from '@tiptap/starter-kit';
import Highlight from '@tiptap/extension-highlight';
import Image from '@tiptap/extension-image';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';

export const editorExtensions = [
  StarterKit.configure({
    heading: {
      levels: [1, 2, 3, 4, 5, 6],
    },
    bulletList: {
      keepMarks: true,
      keepAttributes: false,
    },
    orderedList: {
      keepMarks: true,
      keepAttributes: false,
    },
  }),
  Highlight.configure({
    multicolor: true,
  }),
  Image.configure({
    inline: true,
    allowBase64: true,
  }),
  Underline,
  TextAlign.configure({
    types: ['heading', 'paragraph'],
  }),
];

export const editorProps = {
  attributes: {
    class: 'prose prose-gray dark:prose-invert max-w-none focus:outline-none min-h-[200px] p-4 border rounded-md',
  },
}; 