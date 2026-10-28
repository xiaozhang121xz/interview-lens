'use client';

/**
 * 自定义浮动菜单组件
 * 监听编辑器选区变化，在选中文本附近显示格式化工具栏
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import type { Editor } from '@tiptap/react';
import { Button } from '@/components/ui/button';
import { Bold, Italic, Strikethrough, Code, Link2, X } from 'lucide-react';
import { createPortal } from 'react-dom';

interface FloatingMenuProps {
  editor: Editor | null;
}

export function FloatingMenu({ editor }: FloatingMenuProps) {
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const menuRef = useRef<HTMLDivElement>(null);

  // 计算菜单位置
  const updatePosition = useCallback(() => {
    if (!editor || !menuRef.current) return;

    const { from, to } = editor.state.selection;
    const hasSelection = from !== to;

    if (!hasSelection) {
      setVisible(false);
      return;
    }

    // 获取选区的坐标
    const { view } = editor;
    const start = view.coordsAtPos(from);
    const end = view.coordsAtPos(to);

    // 计算选区宽度和中心点
    const selectionWidth = end.right - start.left;
    const selectionCenterX = start.left + selectionWidth / 2;

    // 菜单应该显示在选区上方
    const top = Math.max(start.top - 60, 10); // 在选区上方 60px

    // 菜单水平居中，但不要超出视口
    const menuWidth = 400; // 估计的菜单宽度
    let left = selectionCenterX - menuWidth / 2;

    // 确保菜单不超出视口左边界
    if (left < 10) {
      left = 10;
    }
    // 确保菜单不超出视口右边界
    else if (left + menuWidth > window.innerWidth - 10) {
      left = window.innerWidth - menuWidth - 10;
    }

    setPosition({ top, left });
    setVisible(true);
  }, [editor]);

  // 监听选区变化
  useEffect(() => {
    if (!editor) return;

    const handleSelectionUpdate = () => {
      updatePosition();
    };

    // 监听选区变化
    editor.on('selectionUpdate', handleSelectionUpdate);
    editor.on('transaction', handleSelectionUpdate);

    return () => {
      editor.off('selectionUpdate', handleSelectionUpdate);
      editor.off('transaction', handleSelectionUpdate);
    };
  }, [editor, updatePosition]);

  // 点击外部隐藏菜单
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        const { from, to } = editor?.state.selection || { from: 0, to: 0 };
        if (from === to) {
          setVisible(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [editor]);

  if (!editor || !visible) {
    return null;
  }

  const menu = (
    <div
      ref={menuRef}
      className="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-1 flex items-center gap-1 animate-in fade-in slide-in-from-top-2 duration-200"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
      }}
    >
      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={`h-8 w-8 p-0 ${editor.isActive('bold') ? 'bg-primary/10 text-primary' : ''}`}
        title="粗体 (Ctrl+B)"
      >
        <Bold className="h-4 w-4" />
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={`h-8 w-8 p-0 ${editor.isActive('italic') ? 'bg-primary/10 text-primary' : ''}`}
        title="斜体 (Ctrl+I)"
      >
        <Italic className="h-4 w-4" />
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleStrike().run()}
        className={`h-8 w-8 p-0 ${editor.isActive('strike') ? 'bg-primary/10 text-primary' : ''}`}
        title="删除线 (Ctrl+Shift+X)"
      >
        <Strikethrough className="h-4 w-4" />
      </Button>

      <div className="w-px h-6 bg-gray-200 mx-1" />

      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleCode().run()}
        className={`h-8 w-8 p-0 ${editor.isActive('code') ? 'bg-primary/10 text-primary' : ''}`}
        title="行内代码 (Ctrl+E)"
      >
        <Code className="h-4 w-4" />
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          const url = window.prompt('输入链接 URL:');
          if (url) {
            editor.chain().focus().setLink({ href: url }).run();
          }
        }}
        className={`h-8 w-8 p-0 ${editor.isActive('link') ? 'bg-primary/10 text-primary' : ''}`}
        title="插入链接 (Ctrl+K)"
      >
        <Link2 className="h-4 w-4" />
      </Button>

      <div className="w-px h-6 bg-gray-200 mx-1" />

      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        className={`h-8 px-2 text-xs ${editor.isActive('heading', { level: 1 }) ? 'bg-primary/10 text-primary' : ''}`}
        title="标题 1"
      >
        H1
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        className={`h-8 px-2 text-xs ${editor.isActive('heading', { level: 2 }) ? 'bg-primary/10 text-primary' : ''}`}
        title="标题 2"
      >
        H2
      </Button>

      <div className="w-px h-6 bg-gray-200 mx-1" />

      <Button
        variant="ghost"
        size="sm"
        onClick={() => setVisible(false)}
        className="h-8 w-8 p-0 text-gray-500 hover:text-gray-700"
        title="关闭"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );

  // 使用 Portal 渲染到 body
  return createPortal(menu, document.body);
}
