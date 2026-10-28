'use client';

/**
 * Tiptap编辑器基础组件
 */

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import CharacterCount from '@tiptap/extension-character-count';
import { useEffect } from 'react';
import { useAIEditorStore } from '@/stores/features/aiEditorStore';
import './tiptap.css';

interface TiptapEditorProps {
  content?: string;
  onChange?: (content: string) => void;
  placeholder?: string;
  editable?: boolean;
}

export function TiptapEditor({
  content = '',
  onChange,
  placeholder = '开始输入内容...',
  editable = true,
}: TiptapEditorProps) {
  const { setEditor } = useAIEditorStore();

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
      CharacterCount,
    ],
    content,
    editable,
    immediatelyRender: false, // 避免SSR hydration问题
    onUpdate: ({ editor }) => {
      if (onChange) {
        onChange(editor.getHTML());
      }
    },
    editorProps: {
      attributes: {
        class:
          'prose prose-sm sm:prose lg:prose-lg xl:prose-xl focus:outline-none max-w-none',
      },
    },
  });

  // 更新store中的编辑器实例
  useEffect(() => {
    if (editor) {
      setEditor(editor);
    }

    return () => {
      setEditor(null);
    };
  }, [editor, setEditor]);

  if (!editor) {
    return null;
  }

  return (
    <div className="tiptap-editor-container">
      <EditorContent editor={editor} />
    </div>
  );
}
