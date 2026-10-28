'use client';

/**
 * 段落块操作菜单组件（Block Menu）
 * 类似 Notion 的块操作按钮，点击段落后显示
 */

import { useEffect, useState, useRef, useCallback } from 'react';
import type { Editor } from '@tiptap/react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import {
  GripVertical,
  Trash2,
  Copy,
  ChevronUp,
  ChevronDown,
  Plus,
} from 'lucide-react';

interface BlockMenuProps {
  editor: Editor | null;
}

export function BlockMenu({ editor }: BlockMenuProps) {
  const [visible, setVisible] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [activeBlockPos, setActiveBlockPos] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const buttonRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // 监听光标位置变化
  useEffect(() => {
    if (!editor) return;

    const handleSelectionUpdate = () => {
      // 只在编辑器有焦点时更新位置
      if (!editor.isFocused) return;

      const { state } = editor;
      const { selection } = state;
      const { $from } = selection;

      // 获取当前段落位置（更准确的方法）
      const pos = $from.start($from.depth);
      const node = state.doc.nodeAt(pos);

      if (node) {
        setActiveBlockPos(pos);

        // 计算按钮位置
        const coords = editor.view.coordsAtPos(pos);
        const editorRect = editor.view.dom.getBoundingClientRect();

        setPosition({
          top: coords.top + window.scrollY, // 相对于文档的位置
          left: editorRect.left + window.scrollX - 40, // 相对于文档的位置
        });
        setVisible(true);
      }
    };

    // 监听选区变化
    editor.on('selectionUpdate', handleSelectionUpdate);

    return () => {
      editor.off('selectionUpdate', handleSelectionUpdate);
    };
  }, [editor]);

  // 点击编辑器外部隐藏按钮
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const proseMirror = editor?.view.dom;
      if (!proseMirror) return;

      const target = e.target as HTMLElement;
      if (!proseMirror.contains(target)) {
        setVisible(false);
        setMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [editor]);

  // 点击外部关闭菜单
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        if (
          buttonRef.current &&
          !buttonRef.current.contains(e.target as Node)
        ) {
          setMenuOpen(false);
        }
      }
    };

    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () =>
        document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [menuOpen]);

  // 插入段落
  const insertParagraph = () => {
    if (!editor) return;

    try {
      editor.chain().focus().insertContent('<p></p>').run();
      setMenuOpen(false);
    } catch (error) {
      console.error('Failed to insert paragraph:', error);
    }
  };

  // 删除当前块
  const deleteBlock = () => {
    if (!editor) return;

    try {
      // 使用 Tiptap 的 delete 命令
      editor.chain().focus().deleteSelection().run();

      // 如果选区为空，删除整个段落
      const { state } = editor;
      const { selection } = state;
      if (selection.from === selection.to) {
        // 选中整个当前块
        const { $from } = selection;
        const start = $from.start($from.depth);
        const end = $from.end($from.depth);
        editor
          .chain()
          .focus()
          .setTextSelection({ from: start, to: end })
          .deleteSelection()
          .run();
      }
      setMenuOpen(false);
    } catch (error) {
      console.error('Failed to delete block:', error);
    }
  };

  // 复制文本
  const copyText = async () => {
    if (!editor) return;

    try {
      // 获取选中的文本或当前段落
      const { state } = editor;
      const { selection } = state;
      let text = '';

      if (selection.from === selection.to) {
        // 没有选区，复制整个段落
        const { $from } = selection;
        const start = $from.start($from.depth);
        const end = $from.end($from.depth);
        text = state.doc.textBetween(start, end);
      } else {
        // 有选区，复制选中的文本
        text = state.doc.textBetween(selection.from, selection.to);
      }

      await navigator.clipboard.writeText(text);
      setMenuOpen(false);
    } catch (error) {
      console.error('Failed to copy text:', error);
    }
  };

  // 上移块（交换当前块和前一个块）
  const moveUp = () => {
    if (!editor) return;

    try {
      const { state } = editor;
      const { selection } = state;
      const { $from } = selection;

      // 获取当前块的起始位置
      const currentBlockStart = $from.start($from.depth);

      // 查找前一个块
      const posBefore = state.doc.resolve(currentBlockStart - 1);
      const nodeBefore = posBefore.node(posBefore.depth);

      if (nodeBefore && nodeBefore.type.name !== 'doc') {
        // 找到前一个块的起始和结束位置
        const beforeStart = posBefore.start(posBefore.depth);
        const beforeEnd = posBefore.end(posBefore.depth);
        const currentEnd = $from.end($from.depth);

        // 获取两个块的内容
        const currentContent = state.doc.textBetween(
          currentBlockStart,
          currentEnd
        );
        const beforeContent = state.doc.textBetween(beforeStart, beforeEnd);

        // 替换前一个块为当前块
        editor
          .chain()
          .focus()
          .setTextSelection({ from: beforeStart, to: beforeEnd })
          .deleteSelection()
          .insertContentAt(beforeStart, currentContent)
          .run();

        // 替换当前块位置为前一个块
        setTimeout(() => {
          editor
            ?.chain()
            .setTextSelection({
              from: currentBlockStart,
              to: currentBlockStart + beforeContent.length,
            })
            .deleteSelection()
            .insertContentAt(currentBlockStart, beforeContent)
            .run();
        }, 0);
      } else {
        alert('已经是第一个段落了');
      }
      setMenuOpen(false);
    } catch (error) {
      console.error('Failed to move up:', error);
    }
  };

  // 下移块（交换当前块和下一个块）
  const moveDown = () => {
    if (!editor) return;

    try {
      const { state } = editor;
      const { selection } = state;
      const { $from } = selection;

      // 获取当前块的结束位置
      const currentBlockEnd = $from.end($from.depth);

      // 查找后一个块
      const posAfter = state.doc.resolve(currentBlockEnd + 1);
      const nodeAfter = posAfter.node(posAfter.depth);

      if (nodeAfter && nodeAfter.type.name !== 'doc') {
        // 找到后一个块的起始和结束位置
        const afterStart = posAfter.start(posAfter.depth);
        const afterEnd = posAfter.end(posAfter.depth);
        const currentStart = $from.start($from.depth);

        // 获取两个块的内容
        const currentContent = state.doc.textBetween(
          currentStart,
          currentBlockEnd
        );
        const afterContent = state.doc.textBetween(afterStart, afterEnd);

        // 替换后一个块为当前块
        editor
          .chain()
          .focus()
          .setTextSelection({ from: afterStart, to: afterEnd })
          .deleteSelection()
          .insertContentAt(afterStart, currentContent)
          .run();

        // 替换当前块位置为后一个块
        setTimeout(() => {
          editor
            ?.chain()
            .setTextSelection({
              from: currentStart,
              to: currentStart + afterContent.length,
            })
            .deleteSelection()
            .insertContentAt(currentStart, afterContent)
            .run();
        }, 0);
      } else {
        alert('已经是最后一个段落了');
      }
      setMenuOpen(false);
    } catch (error) {
      console.error('Failed to move down:', error);
    }
  };

  if (!editor || !visible) {
    return null;
  }

  // 块操作按钮
  const blockButton = (
    <div
      ref={buttonRef}
      className="absolute z-40"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
      }}
      onMouseDown={(e) => {
        // 阻止事件冒泡，防止触发点击外部检测
        e.stopPropagation();
        e.preventDefault();
      }}
    >
      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0 bg-white border border-gray-200 shadow-sm hover:bg-gray-50"
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          setMenuOpen(!menuOpen);
        }}
        title="点击显示块操作菜单"
      >
        <GripVertical className="h-4 w-4 text-gray-500" />
      </Button>
    </div>
  );

  // 弹出菜单
  const menu = menuOpen ? (
    <div
      ref={menuRef}
      className="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-lg py-1 w-48 animate-in fade-in zoom-in-95 duration-200"
      style={{
        top: `${position.top}px`,
        left: `${position.left + 45}px`,
      }}
    >
      <div className="px-3 py-2 border-b border-gray-100">
        <p className="text-xs font-semibold text-gray-500 uppercase">块操作</p>
      </div>

      <button
        onClick={insertParagraph}
        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors text-left"
      >
        <Plus className="h-4 w-4" />
        在上方添加段落
      </button>

      <button
        onClick={deleteBlock}
        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors text-left"
      >
        <Trash2 className="h-4 w-4" />
        删除
      </button>

      <button
        onClick={copyText}
        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors text-left"
      >
        <Copy className="h-4 w-4" />
        复制文本
      </button>

      <div className="border-t border-gray-100 my-1"></div>

      <button
        onClick={moveUp}
        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors text-left"
      >
        <ChevronUp className="h-4 w-4" />
        上移
      </button>

      <button
        onClick={moveDown}
        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors text-left"
      >
        <ChevronDown className="h-4 w-4" />
        下移
      </button>
    </div>
  ) : null;

  return (
    <>
      {createPortal(blockButton, document.body)}
      {createPortal(menu, document.body)}
    </>
  );
}
