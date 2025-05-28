import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Image from '@tiptap/extension-image';

export const editorExtensions = [
  StarterKit.configure({
    heading: {
      levels: [1, 2, 3],
      HTMLAttributes: {
        class: 'font-bold',
      }
    },
    bulletList: {
      keepMarks: true,
      keepAttributes: true,
      HTMLAttributes: {
        class: 'list-disc pl-6 my-4 text-base',
      },
    },
    orderedList: {
      keepMarks: true,
      keepAttributes: true,
      HTMLAttributes: {
        class: 'list-decimal pl-6 my-4 text-base',
      },
    },
    paragraph: {
      HTMLAttributes: {
        class: 'text-base my-4',
      },
    },
    listItem: {
      HTMLAttributes: {
        class: 'my-2 text-base',
      },
    },
  }),
  Underline,
  TextAlign.configure({
    types: ['heading', 'paragraph'],
  }),
  Image.configure({
    inline: false,
    allowBase64: true,
    HTMLAttributes: {
      class: 'max-w-full h-auto rounded-lg border border-gray-200 my-4 mx-auto block',
    },
  }),
];

export const editorProps = {
  attributes: {
    class: 'prose prose-lg max-w-none focus:outline-none min-h-[400px] w-full rounded-md border border-input bg-background p-4 [&>h1]:text-2xl [&>h1]:mt-8 [&>h1]:mb-6 [&>h2]:text-xl [&>h2]:mt-6 [&>h2]:mb-4 [&>h3]:text-lg [&>h3]:mt-4 [&>h3]:mb-3 [&>p]:text-base [&>p]:leading-relaxed [&>ul]:text-base [&>ol]:text-base [&>ul]:pl-6 [&>ol]:pl-6 [&>hr]:my-8 [&>hr]:border-t-2 [&>hr]:border-border'
  }
}; 