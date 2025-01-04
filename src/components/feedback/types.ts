import { BaseEditor } from 'slate';
import { ReactEditor } from 'slate-react';

export type CustomText = {
  text: string;
  highlight?: {
    type: 'critical' | 'enhancement';
    category: 'clarity' | 'specificity' | 'actionability' | 'tone' | 'completeness';
    suggestion: string;
    key: string;
  };
};

export type CustomElement = {
  type: 'paragraph' | 'bulleted-list' | 'numbered-list' | 'list-item';
  children: CustomText[];
};

export type CustomEditor = BaseEditor & ReactEditor;

declare module 'slate' {
  interface CustomTypes {
    Editor: CustomEditor;
    Element: CustomElement;
    Text: CustomText;
  }
} 