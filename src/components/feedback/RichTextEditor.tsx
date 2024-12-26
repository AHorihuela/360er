import { useMemo, useCallback, useEffect } from 'react';
import { createEditor, BaseEditor, Descendant, Text, Node, Transforms, Editor, Range } from 'slate';
import { Slate, Editable, withReact, ReactEditor } from 'slate-react';
import { withHistory } from 'slate-history';

type CustomElement = {
  type: 'paragraph';
  children: CustomText[];
};

type CustomText = {
  text: string;
  highlight?: {
    type: 'critical' | 'enhancement';
    category: 'clarity' | 'specificity' | 'actionability' | 'tone' | 'completeness';
    suggestion: string;
  };
};

type CustomEditor = BaseEditor & ReactEditor;

declare module 'slate' {
  interface CustomTypes {
    Editor: CustomEditor;
    Element: CustomElement;
    Text: CustomText;
  }
}

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  highlights?: Array<{
    type: 'critical' | 'enhancement';
    category: 'clarity' | 'specificity' | 'actionability' | 'tone' | 'completeness';
    suggestion: string;
    context: string;
  }>;
}

export function RichTextEditor({ value, onChange, highlights = [] }: RichTextEditorProps) {
  const editor = useMemo(() => {
    const e = withHistory(withReact(createEditor()));
    
    // Override the editor's normalizeNode function to prevent unwanted normalization
    const { normalizeNode } = e;
    e.normalizeNode = ([node, path]) => {
      if (path.length === 0) {
        const element = node as CustomElement;
        if (element.children.length === 0) {
          const paragraph: CustomElement = {
            type: 'paragraph',
            children: [{ text: '' }],
          };
          Transforms.insertNodes(e, paragraph, { at: path.concat(0) });
          return;
        }
      }
      normalizeNode([node, path]);
    };
    
    return e;
  }, []);

  // Convert plain text to Slate's initial value
  const initialValue = useMemo((): Descendant[] => {
    return [{
      type: 'paragraph',
      children: [{ text: value || '' }]
    }];
  }, []);

  // Update content when value prop changes
  useEffect(() => {
    const content = Node.string(editor);
    if (content !== value) {
      try {
        const point = editor.selection && Range.isRange(editor.selection) 
          ? Range.start(editor.selection) 
          : { path: [0, 0], offset: 0 };

        Editor.withoutNormalizing(editor, () => {
          // First ensure we have at least one paragraph
          if (editor.children.length === 0) {
            Transforms.insertNodes(editor, {
              type: 'paragraph',
              children: [{ text: '' }]
            });
          }

          // Then update the text content
          Transforms.delete(editor, {
            at: {
              anchor: Editor.start(editor, []),
              focus: Editor.end(editor, []),
            },
          });

          Transforms.insertText(editor, value || '', {
            at: Editor.start(editor, [])
          });

          // Try to restore cursor position
          try {
            if (point.offset <= (value || '').length) {
              Transforms.select(editor, point);
            }
          } catch (e) {
            // Ignore cursor restoration errors
          }
        });
      } catch (error) {
        console.error('Error updating editor content:', error);
      }
    }
  }, [value, editor]);

  // Decorate text with highlights
  const decorate = useCallback(
    ([node, path]: any) => {
      const ranges: any[] = [];

      if (!Text.isText(node) || !node.text) {
        return ranges;
      }

      const text = node.text.toLowerCase();

      highlights.forEach((highlight) => {
        if (!highlight?.context) return;
        
        const context = highlight.context.toLowerCase();
        let start = 0;
        let index = text.indexOf(context, start);

        while (index !== -1) {
          ranges.push({
            anchor: { path, offset: index },
            focus: { path, offset: index + context.length },
            highlight: {
              type: highlight.type,
              category: highlight.category,
              suggestion: highlight.suggestion,
            },
          });

          start = index + context.length;
          index = text.indexOf(context, start);
        }
      });

      return ranges;
    },
    [highlights]
  );

  // Render leaf with highlight styles
  const renderLeaf = useCallback((props: any) => {
    const { attributes, children, leaf } = props;

    if (leaf.highlight) {
      const bgColor = leaf.highlight.type === 'critical' ? 'bg-red-100' : 'bg-blue-100';
      
      return (
        <span
          {...attributes}
          className={`group relative inline ${bgColor} hover:bg-opacity-75`}
        >
          {children}
          <span 
            contentEditable={false}
            suppressContentEditableWarning
            className="pointer-events-none absolute bottom-[calc(100%+8px)] left-1/2 -translate-x-1/2 z-[9999] invisible group-hover:visible"
          >
            <span className="relative flex flex-col items-center min-w-[300px]">
              <span className="bg-slate-800 text-white text-sm rounded-lg p-4 whitespace-normal shadow-xl w-full">
                <span className="font-semibold mb-2 block border-b border-slate-600 pb-2">
                  {leaf.highlight.category.charAt(0).toUpperCase() + leaf.highlight.category.slice(1)}
                </span>
                {leaf.highlight.suggestion}
              </span>
              <span className="border-[8px] border-transparent border-t-slate-800 -mt-[1px]" />
            </span>
          </span>
        </span>
      );
    }

    return <span {...attributes}>{children}</span>;
  }, []);

  return (
    <div className="min-h-[200px] w-full rounded-md border border-input bg-background px-3 py-2">
      <Slate
        editor={editor}
        initialValue={initialValue}
        onChange={() => {
          const newText = Node.string(editor);
          if (newText !== value) {
            onChange(newText);
          }
        }}
      >
        <Editable
          className="min-h-[200px] w-full resize-none focus:outline-none"
          decorate={decorate}
          renderLeaf={renderLeaf}
          placeholder="Enter your feedback here..."
          onKeyDown={(event) => {
            // Handle special key combinations if needed
            if (event.key === 'Enter' && event.shiftKey) {
              event.preventDefault();
              editor.insertText('\n');
            }
          }}
        />
      </Slate>
    </div>
  );
} 