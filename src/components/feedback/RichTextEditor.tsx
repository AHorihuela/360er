import { useMemo, useCallback, useEffect } from 'react';
import { createEditor, Descendant, Text, Node, Transforms, Editor, Range, NodeEntry } from 'slate';
import { Slate, Editable, withReact } from 'slate-react';
import { withHistory } from 'slate-history';
import { withLists } from './plugins/withLists';
import { CustomElement, CustomText } from './types';

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

const LIST_TYPES = ['numbered-list', 'bulleted-list'];

// Helper function to create a list item
const createListItem = (text: string): CustomElement => ({
  type: 'list-item',
  children: [{ text }] as CustomText[]
});

// Helper function to create a list
const createList = (type: 'numbered-list' | 'bulleted-list'): CustomElement => ({
  type,
  children: [] as CustomElement[]
});

// Helper function to create a heading
const createHeading = (type: 'heading-one' | 'heading-two' | 'heading-three', text: string): CustomElement => ({
  type,
  children: [{ text }] as CustomText[]
});

export function RichTextEditor({ value, onChange, highlights = [] }: RichTextEditorProps) {
  const editor = useMemo(() => {
    const e = withLists(withHistory(withReact(createEditor())));
    
    // Override the editor's normalizeNode function to handle lists and headings
    const { normalizeNode } = e;
    e.normalizeNode = ([node, path]: NodeEntry) => {
      if (path.length === 0) {
        // Ensure there's always at least one node
        if ((node as CustomElement).children.length === 0) {
          Transforms.insertNodes(e, {
            type: 'paragraph',
            children: [{ text: '' }],
          } as CustomElement);
          return;
        }

        // Ensure each top-level node has a valid type
        for (const [child, childPath] of Node.children(e, path)) {
          const type = (child as CustomElement).type;
          if (!type) {
            Transforms.setNodes(
              e,
              { type: 'paragraph' } as Partial<CustomElement>,
              { at: childPath }
            );
            return;
          }
        }

        // Prevent merging of different heading levels
        const children = (node as CustomElement).children;
        for (let i = 0; i < children.length - 1; i++) {
          const current = children[i] as CustomElement;
          const next = children[i + 1] as CustomElement;
          if (current.type?.startsWith('heading-') && next.type?.startsWith('heading-') && current.type !== next.type) {
            Transforms.insertNodes(
              e,
              { type: 'paragraph', children: [{ text: '' }] } as CustomElement,
              { at: [i + 1] }
            );
            return;
          }
        }
      }

      // Handle list items
      if ((node as CustomElement).type === 'list-item') {
        const parent = Node.parent(e, path);
        if (!LIST_TYPES.includes((parent as CustomElement).type)) {
          Transforms.wrapNodes(
            e,
            { type: 'bulleted-list', children: [] } as CustomElement,
            { at: path }
          );
          return;
        }
      }

      normalizeNode([node, path]);
    };
    
    return e;
  }, []);

  // Convert plain text to Slate's initial value with proper structure
  const initialValue = useMemo((): Descendant[] => {
    const parseTextToBlocks = (text: string): Descendant[] => {
      const lines = text.split('\n');
      const blocks: Descendant[] = [];
      let currentList: CustomElement | null = null;
      let listItemNumber = 1;

      for (const line of lines) {
        // Handle headings with proper spacing
        if (line.startsWith('# ')) {
          if (currentList) {
            blocks.push(currentList);
            currentList = null;
            listItemNumber = 1;
          }
          blocks.push(createHeading('heading-one', line.slice(2)));
          // Add spacing after heading
          blocks.push({ type: 'paragraph', children: [{ text: '' }] } as CustomElement);
          continue;
        }
        if (line.startsWith('## ')) {
          if (currentList) {
            blocks.push(currentList);
            currentList = null;
            listItemNumber = 1;
          }
          blocks.push(createHeading('heading-two', line.slice(3)));
          // Add spacing after heading
          blocks.push({ type: 'paragraph', children: [{ text: '' }] } as CustomElement);
          continue;
        }
        if (line.startsWith('### ')) {
          if (currentList) {
            blocks.push(currentList);
            currentList = null;
            listItemNumber = 1;
          }
          blocks.push(createHeading('heading-three', line.slice(4)));
          // Add spacing after heading
          blocks.push({ type: 'paragraph', children: [{ text: '' }] } as CustomElement);
          continue;
        }

        // Handle numbered lists with proper numbering
        const numberedMatch = line.match(/^\d+\.\s(.+)/);
        if (numberedMatch) {
          if (!currentList || currentList.type !== 'numbered-list') {
            if (currentList) {
              blocks.push(currentList);
            }
            currentList = createList('numbered-list');
            listItemNumber = 1;
          }
          currentList.children.push(createListItem(numberedMatch[1]));
          listItemNumber++;
          continue;
        }

        // Handle bullet lists
        if (line.startsWith('- ') || line.startsWith('* ')) {
          if (!currentList || currentList.type !== 'bulleted-list') {
            if (currentList) {
              blocks.push(currentList);
            }
            currentList = createList('bulleted-list');
          }
          currentList.children.push(createListItem(line.slice(2)));
          continue;
        }

        // Handle line breaks and list termination
        if (!line.trim()) {
          if (currentList) {
            blocks.push(currentList);
            currentList = null;
            listItemNumber = 1;
          }
          blocks.push({ type: 'paragraph', children: [{ text: '' }] } as CustomElement);
          continue;
        }

        // Handle regular paragraphs
        if (currentList) {
          blocks.push(currentList);
          currentList = null;
          listItemNumber = 1;
        }
        if (line.trim()) {
          blocks.push({ type: 'paragraph', children: [{ text: line }] } as CustomElement);
        }
      }

      // Don't forget to add the last list if it exists
      if (currentList) {
        blocks.push(currentList);
      }

      return blocks.length ? blocks : [{ type: 'paragraph', children: [{ text: '' }] } as CustomElement];
    };

    return parseTextToBlocks(value || '');
  }, [value]);

  // Update content when value prop changes
  useEffect(() => {
    if (!editor || !value) return;

    const content = Node.string(editor);
    if (content !== value) {
      try {
        const point = editor.selection && Range.isRange(editor.selection)
          ? Range.start(editor.selection)
          : { path: [0, 0], offset: 0 };

        Editor.withoutNormalizing(editor, () => {
          // Store the current selection state
          const currentSelection = editor.selection;
          
          // Store any existing highlights
          const existingHighlights = Editor.nodes(editor, {
            match: n => Text.isText(n) && n.highlight !== undefined,
          });
          
          // Update content while preserving structure
          const blocks = initialValue;
          Transforms.delete(editor, {
            at: {
              anchor: Editor.start(editor, []),
              focus: Editor.end(editor, []),
            },
          });
          
          Transforms.insertNodes(editor, blocks);

          // Restore selection if possible
          if (currentSelection && point.offset <= value.length) {
            try {
              Transforms.select(editor, point);
            } catch (e) {
              // Ignore cursor restoration errors
            }
          }
        });
      } catch (error) {
        console.error('Error updating editor content:', error);
      }
    }
  }, [value, editor, initialValue]);

  // Decorate text with highlights
  const decorate = useCallback(
    ([node, path]: NodeEntry<Node>): Range[] => {
      const ranges: Range[] = [];

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
          } as Range);

          start = index + context.length;
          index = text.indexOf(context, start);
        }
      });

      return ranges;
    },
    [highlights]
  );

  // Render leaf with highlight styles
  const renderLeaf = useCallback((props: {
    attributes: Record<string, unknown>;
    children: React.ReactNode;
    leaf: CustomText & { highlight?: {
      type: 'critical' | 'enhancement';
      category: 'clarity' | 'specificity' | 'actionability' | 'tone' | 'completeness';
      suggestion: string;
    }};
  }) => {
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
            className="pointer-events-none fixed sm:absolute left-4 sm:left-1/2 right-4 sm:right-auto bottom-4 sm:bottom-[calc(100%+8px)] -translate-x-0 sm:-translate-x-1/2 z-[9999] invisible group-hover:visible"
          >
            <span className="relative flex flex-col items-center min-w-[200px] sm:min-w-[300px]">
              <span className="bg-slate-800 text-white text-sm rounded-lg p-4 whitespace-normal shadow-xl w-full">
                <span className="font-semibold mb-2 block border-b border-slate-600 pb-2">
                  {leaf.highlight.category.charAt(0).toUpperCase() + leaf.highlight.category.slice(1)}
                </span>
                {leaf.highlight.suggestion}
              </span>
              <span className="hidden sm:block border-[8px] border-transparent border-t-slate-800 -mt-[1px]" />
            </span>
          </span>
        </span>
      );
    }

    return <span {...attributes}>{children}</span>;
  }, []);

  // Render element with proper formatting
  const renderElement = useCallback((props: any) => {
    const { attributes, children, element } = props;

    switch (element.type) {
      case 'heading-one':
        return <h1 {...attributes} className="text-2xl font-bold my-4">{children}</h1>;
      case 'heading-two':
        return <h2 {...attributes} className="text-xl font-bold my-3">{children}</h2>;
      case 'heading-three':
        return <h3 {...attributes} className="text-lg font-bold my-2">{children}</h3>;
      case 'numbered-list':
        return <ol {...attributes} className="list-decimal pl-6 my-4">{children}</ol>;
      case 'bulleted-list':
        return <ul {...attributes} className="list-disc pl-6 my-4">{children}</ul>;
      case 'list-item':
        return <li {...attributes} className="my-1">{children}</li>;
      default:
        return <p {...attributes} className="my-2">{children}</p>;
    }
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
          renderElement={renderElement}
          placeholder="Enter your feedback here..."
          onKeyDown={(event) => {
            // Handle special key combinations
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