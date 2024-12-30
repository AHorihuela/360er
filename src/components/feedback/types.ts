import { BaseEditor } from 'slate';
import { ReactEditor } from 'slate-react';

export type CustomText = {
  text: string;
  highlight?: {
    type: 'critical' | 'enhancement';
    category: 'clarity' | 'specificity' | 'actionability' | 'tone' | 'completeness';
    suggestion: string;
  };
  bold?: boolean;
  italic?: boolean;
};

export type CustomElement = {
  type: 'paragraph' | 'heading-one' | 'heading-two' | 'heading-three' | 'numbered-list' | 'bulleted-list' | 'list-item';
  children: Array<CustomElement | CustomText>;
  level?: number;
};

export type CustomEditor = BaseEditor & ReactEditor;

declare module 'slate' {
  interface CustomTypes {
    Editor: CustomEditor;
    Element: CustomElement;
    Text: CustomText;
  }
} 