'use client';

/**
 * Slash 命令菜单组件
 * 用户输入 "/" 时触发，显示可插入的内容类型
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import type { MouseEvent as ReactMouseEvent } from 'react';
import type { Editor } from '@tiptap/react';
import { createPortal } from 'react-dom';
import {
  Type,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  Quote,
  Code,
  CheckSquare,
  Minus,
} from 'lucide-react';

interface SlashMenuItem {
  id: string;
  label: string;
  description: string;
  icon: any;
  action: (editor: Editor) => void;
}

interface SlashMenuProps {
  editor: Editor | null;
}

export function SlashMenu({ editor }: SlashMenuProps) {
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const slashPosRef = useRef<number | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Slash 命令菜单项
  const menuItems: SlashMenuItem[] = [
    {
      id: 'text',
      label: '文本',
      description: '纯文本段落',
      icon: Type,
      action: (editor) => editor.chain().focus().setParagraph().run(),
    },
    {
      id: 'h1',
      label: '标题 1',
      description: '大标题',
      icon: Heading1,
      action: (editor) =>
        editor.chain().focus().toggleHeading({ level: 1 }).run(),
    },
    {
      id: 'h2',
      label: '标题 2',
      description: '中标题',
      icon: Heading2,
      action: (editor) =>
        editor.chain().focus().toggleHeading({ level: 2 }).run(),
    },
    {
      id: 'bullet-list',
      label: '无序列表',
      description: '项目符号列表',
      icon: List,
      action: (editor) => editor.chain().focus().toggleBulletList().run(),
    },
    {
      id: 'ordered-list',
      label: '有序列表',
      description: '编号列表',
      icon: ListOrdered,
      action: (editor) => editor.chain().focus().toggleOrderedList().run(),
    },
    {
      id: 'quote',
      label: '引用',
      description: '引用块',
      icon: Quote,
      action: (editor) => editor.chain().focus().toggleBlockquote().run(),
    },
    {
      id: 'code',
      label: '代码块',
      description: '代码块',
      icon: Code,
      action: (editor) => editor.chain().focus().toggleCodeBlock().run(),
    },
    {
      id: 'divider',
      label: '分隔线',
      description: '水平线',
      icon: Minus,
      action: (editor) => editor.chain().focus().setHorizontalRule().run(),
    },
  ];

  // 过滤菜单项
  const filteredItems = menuItems.filter(
    (item) =>
      item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // 根据搜索结果调整选中索引
  useEffect(() => {
    if (filteredItems.length > 0 && selectedIndex >= filteredItems.length) {
      setSelectedIndex(0);
    }
  }, [filteredItems.length, selectedIndex]);

  // 更新菜单位置并返回斜杠前的位置
  const updatePosition = useCallback(() => {
    if (!editor) return null;

    const { view } = editor;
    const { state } = view;
    const { selection } = state;

    // 获取光标位置
    const coords = view.coordsAtPos(selection.from);
    setPosition({
      top: coords.bottom + 10,
      left: coords.left,
    });
    setVisible(true);
    setSelectedIndex(0);
    setSearchQuery('');

    return selection.from; // 返回斜杠的位置
  }, [editor]);

  // 监听编辑器输入
  useEffect(() => {
    if (!editor) return;

    const handleUpdate = () => {
      const { state } = editor;
      const { selection } = state;

      // 检查是否有文本被输入
      const textBefore = state.doc.textBetween(0, selection.from);
      const lastChar = textBefore.slice(-1);

      // 如果输入了斜杠且菜单未显示，显示菜单
      if (lastChar === '/' && !visible) {
        slashPosRef.current = selection.from - 1;
        setTimeout(updatePosition, 0);
        return;
      }

      // 如果菜单已显示，检查是否还在斜杠后
      if (visible && slashPosRef.current !== null) {
        const textAfterSlash = textBefore.slice(slashPosRef.current + 1);

        // 如果删除了斜杠，隐藏菜单
        if (selection.from <= slashPosRef.current) {
          setVisible(false);
          slashPosRef.current = null;
          return;
        }

        // 更新搜索查询
        setSearchQuery(textAfterSlash);

        // 如果按了空格或回车，隐藏菜单
        if (textAfterSlash.endsWith(' ') || textAfterSlash.endsWith('\n')) {
          setVisible(false);
          slashPosRef.current = null;
        }
      }
    };

    editor.on('update', handleUpdate);

    return () => {
      editor.off('update', handleUpdate);
    };
  }, [editor, visible, updatePosition]);

  // 监听键盘导航
  useEffect(() => {
    if (!editor || !visible) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // 键盘导航
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % filteredItems.length);
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        setSelectedIndex(
          (prev) => (prev - 1 + filteredItems.length) % filteredItems.length
        );
      } else if (event.key === 'Enter') {
        event.preventDefault();
        if (filteredItems.length > 0) {
          const selectedItem = filteredItems[selectedIndex];

          // 删除斜杠和搜索文本
          if (slashPosRef.current !== null) {
            editor
              .chain()
              .focus()
              .deleteRange({
                from: slashPosRef.current,
                to: editor.state.selection.from,
              })
              .run();
          }

          selectedItem.action(editor);
          setVisible(false);
          slashPosRef.current = null;
          setSearchQuery('');
        }
      } else if (event.key === 'Escape') {
        event.preventDefault();
        setVisible(false);
        slashPosRef.current = null;
        setSearchQuery('');
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [editor, visible, selectedIndex, filteredItems]);

  // 点击外部隐藏菜单
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setVisible(false);
      }
    };

    if (visible) {
      document.addEventListener('mousedown', handleClickOutside);
      return () =>
        document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [visible]);

  const handleItemClick = (event: ReactMouseEvent<HTMLButtonElement>) => {
      const item = menuItems.find(
        (candidate) => candidate.id === event.currentTarget.dataset.itemId
      );
      if (!item) return;

      const slashPosition = slashPosRef.current;
      if (slashPosition !== null && editor) {
        editor
          .chain()
          .focus()
          .deleteRange({
            from: slashPosition,
            to: editor.state.selection.from,
          })
          .run();
      }

      if (editor) item.action(editor);
      setVisible(false);
      slashPosRef.current = null;
      setSearchQuery('');
  };

  if (!editor || !visible) {
    return null;
  }

  const menu = (
    <div
      ref={menuRef}
      className="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-xl py-2 w-72 max-h-80 overflow-y-auto animate-in fade-in zoom-in-95 duration-200"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
      }}
    >
      <div className="px-3 py-2 border-b border-gray-100">
        <p className="text-xs font-semibold text-gray-500 uppercase">基础块</p>
      </div>

      {filteredItems.length === 0 ? (
        <div className="px-3 py-8 text-center text-sm text-gray-500">
          没有找到匹配的命令
        </div>
      ) : (
        filteredItems.map((item, index) => {
          const Icon = item.icon;
          const isSelected = index === selectedIndex;

          return (
            <button
              key={item.id}
              data-item-id={item.id}
              onClick={handleItemClick}
              className={`w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-gray-50 transition-colors ${
                isSelected ? 'bg-primary/5' : ''
              }`}
            >
              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Icon className="h-5 w-5 text-gray-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900">
                  {item.label}
                </div>
                <div className="text-xs text-gray-500 truncate">
                  {item.description}
                </div>
              </div>
              {isSelected && (
                <div className="w-2 h-2 bg-primary rounded-full"></div>
              )}
            </button>
          );
        })
      )}

      <div className="px-3 py-2 mt-2 border-t border-gray-100">
        <p className="text-xs text-gray-500">
          使用 ↑↓ 选择，Enter 确认，Esc 取消
        </p>
      </div>
    </div>
  );

  return createPortal(menu, document.body);
}
