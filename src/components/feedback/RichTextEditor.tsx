import { useCallback, useMemo } from 'react';
import { createEditor, Descendant, Node, Range, Text, NodeEntry, BaseRange, Element } from 'slate';
import { Slate, Editable, withReact, RenderLeafProps } from 'slate-react';
import { withHistory } from 'slate-history';

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

interface CustomRange extends BaseRange {
  highlight?: {
    type: 'critical' | 'enhancement';
    category: 'clarity' | 'specificity' | 'actionability' | 'tone' | 'completeness';
    suggestion: string;
    key: string;
  };
}

interface CustomText {
  text: string;
  highlight?: {
    type: 'critical' | 'enhancement';
    category: 'clarity' | 'specificity' | 'actionability' | 'tone' | 'completeness';
    suggestion: string;
    key: string;
  };
}

interface CustomElement {
  type: 'paragraph';
  children: CustomText[];
}

declare module 'slate' {
  interface CustomTypes {
    Element: CustomElement;
    Range: CustomRange;
    Text: CustomText;
  }
}

// Convert plain text to Slate nodes
const deserialize = (text: string): Descendant[] => {
  // Split text into paragraphs
  const paragraphs = text.split('\n').map(line => ({
    type: 'paragraph' as const,
    children: [{ text: line }],
  }));

  return paragraphs.length > 0 ? paragraphs : [{ type: 'paragraph' as const, children: [{ text: '' }] }];
};

// Convert Slate nodes back to plain text
const serialize = (nodes: Descendant[]): string => {
  return nodes.map(n => Node.string(n)).join('\n');
};

export function RichTextEditor({ value, onChange, highlights = [] }: RichTextEditorProps) {
  // Create a Slate editor object that won't change across renders
  const editor = useMemo(() => withHistory(withReact(createEditor())), []);

  // Initialize the editor's content
  const initialValue = useMemo(() => deserialize(value), [value]);

  // Define the change handler
  const handleChange = useCallback(
    (newValue: Descendant[]) => {
      const newText = serialize(newValue);
      // Only trigger onChange if the content has actually changed
      if (newText !== value) {
        onChange(newText);
      }
    },
    [onChange, value]
  );

  // Decorate text with highlights
  const decorate = useCallback(
    ([node, path]: NodeEntry): Range[] => {
      const ranges: Range[] = [];

      if (!Text.isText(node) || !node.text) {
        return ranges;
      }

      const text = node.text.toLowerCase();

      highlights.forEach((highlight, index) => {
        if (!highlight?.context) return;
        
        const context = highlight.context.toLowerCase();
        let start = 0;
        let matchIndex = text.indexOf(context, start);

        while (matchIndex !== -1) {
          ranges.push({
            anchor: { path, offset: matchIndex },
            focus: { path, offset: matchIndex + context.length },
            highlight: {
              type: highlight.type,
              category: highlight.category,
              suggestion: highlight.suggestion,
              key: `highlight-${index}-${matchIndex}-${path.join('-')}`
            },
          } as CustomRange);

          start = matchIndex + context.length;
          matchIndex = text.indexOf(context, start);
        }
      });

      return ranges;
    },
    [highlights]
  );

  // Render leaf with highlight styles
  const renderLeaf = useCallback((props: RenderLeafProps) => {
    const { attributes, children, leaf } = props;
    const customLeaf = leaf as CustomText;

    if (customLeaf.highlight) {
      const bgColor = customLeaf.highlight.type === 'critical' ? 'bg-red-100' : 'bg-blue-100';
      
      return (
        <span
          {...attributes}
          className={`group relative inline ${bgColor} hover:bg-opacity-75`}
          key={customLeaf.highlight.key}
        >
          {children}
          <span 
            contentEditable={false}
            suppressContentEditableWarning
            className="pointer-events-none fixed sm:absolute left-4 sm:left-1/2 right-4 sm:right-auto bottom-4 sm:bottom-[calc(100%+8px)] -translate-x-0 sm:-translate-x-1/2 z-[9999] invisible group-hover:visible"
          >
            <span className="relative flex flex-col items-center min-w-[200px] sm:min-w-[300px]">
              <span className="bg-slate-800 text-white text-sm rounded-lg p-4 whitespace-normal shadow-xl w-full">
                <span className="font-semibold mb-2 block border-b border-slate-600 pb-2">
                  {customLeaf.highlight.category.charAt(0).toUpperCase() + customLeaf.highlight.category.slice(1)}
                </span>
                {customLeaf.highlight.suggestion}
              </span>
              <span className="hidden sm:block border-[8px] border-transparent border-t-slate-800 -mt-[1px]" />
            </span>
          </span>
        </span>
      );
    }

    return <span {...attributes}>{children}</span>;
  }, []);

  // Render the editor
  return (
    <div className="relative min-h-[120px] w-full rounded-lg border border-input bg-background">
      <Slate
        editor={editor}
        initialValue={initialValue}
        onChange={handleChange}
      >
        <Editable
          className="min-h-[120px] w-full px-3 py-2 text-sm sm:text-base"
          placeholder="Enter your feedback..."
          decorate={decorate}
          renderLeaf={renderLeaf}
        />
      </Slate>
      {highlights.length > 0 && (
        <div className="absolute bottom-0 right-0 m-2">
          <div className="text-xs text-yellow-500">
            {highlights.length} suggestion{highlights.length !== 1 ? 's' : ''}
          </div>
        </div>
      )}
    </div>
  );
} 