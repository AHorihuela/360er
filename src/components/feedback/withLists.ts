import { Editor, Element, Transforms, Node, Path, Point } from 'slate';
import { CustomElement } from './types';

export const withLists = (editor: Editor) => {
  const { deleteBackward } = editor;

  editor.deleteBackward = (...args) => {
    const { selection } = editor;

    if (selection && selection.anchor.offset === 0) {
      const [match] = Editor.nodes(editor, {
        match: n =>
          !Editor.isEditor(n) &&
          Element.isElement(n) &&
          (n as CustomElement).type === 'list-item',
      });

      if (match) {
        const [, path] = match;
        const start = Editor.start(editor, path);

        if (Point.equals(selection.anchor, start)) {
          const parentPath = Path.parent(path);
          const parent = Node.get(editor, parentPath) as CustomElement;
          
          if (parent.type === 'bulleted-list' || parent.type === 'numbered-list') {
            Transforms.unwrapNodes(editor, {
              match: n =>
                !Editor.isEditor(n) &&
                Element.isElement(n) &&
                ((n as CustomElement).type === 'bulleted-list' || (n as CustomElement).type === 'numbered-list'),
              split: true,
            });
            return;
          }
        }
      }
    }

    deleteBackward(...args);
  };

  return editor;
}; 