'use client';

/**
 * Notion-like 编辑器组件
 * 基于 Tiptap v3 的 Notion 风格编辑器
 */

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import CharacterCount from '@tiptap/extension-character-count';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  List,
  ListOrdered,
  Quote,
  Heading1,
  Heading2,
  Undo,
  Redo,
  Link2,
  HelpCircle,
} from 'lucide-react';
import { FloatingMenu } from './FloatingMenu';
import { SlashMenu } from './SlashMenu';
import { BlockMenu } from './BlockMenu';
import './notion-editor.css';

interface NotionLikeEditorProps {
  placeholder?: string;
  enableCollaboration?: boolean;
}

export function NotionLikeEditor({
  placeholder = '输入 "/" 查看命令，或直接开始写作...',
  enableCollaboration = false,
}: NotionLikeEditorProps) {
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
    content: `
      <h1>欢迎使用 Notion-like 编辑器</h1>
      <p>这是一个功能强大的协作编辑器，支持：</p>
      <ul>
        <li><strong>实时协作</strong> - 多人同时编辑</li>
        <li><strong>Slash 命令</strong> - 输入 "/" 快速插入内容</li>
        <li><strong>拖放排序</strong> - 拖动块重新排序</li>
        <li><strong>AI 辅助</strong> - 智能写作助手</li>
      </ul>
      <blockquote>试试选中文本，会弹出格式化菜单！</blockquote>
      <p>输入 <code>/</code> 开始使用 Slash 命令...</p>
    `,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          'prose prose-sm sm:prose lg:prose-lg xl:prose-xl focus:outline-none max-w-none min-h-[500px]',
      },
    },
  });

  if (!editor) {
    return null;
  }

  return (
    <div className="notion-editor-container">
      {/* 工具栏 */}
      <div className="editor-toolbar sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b border-gray-200 p-2 rounded-t-lg">
        <div className="flex items-center gap-1 flex-wrap">
          {/* 撤销/重做 */}
          <div className="flex items-center gap-1 pr-2 border-r border-gray-200">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().undo().run()}
              disabled={!editor.can().undo()}
              className="h-8 w-8 p-0"
            >
              <Undo className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().redo().run()}
              disabled={!editor.can().redo()}
              className="h-8 w-8 p-0"
            >
              <Redo className="h-4 w-4" />
            </Button>
          </div>

          {/* 标题 */}
          <div className="flex items-center gap-1 px-2 border-r border-gray-200">
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                editor.chain().focus().toggleHeading({ level: 1 }).run()
              }
              className={`h-8 w-8 p-0 ${editor.isActive('heading', { level: 1 }) ? 'bg-primary/10 text-primary' : ''}`}
            >
              <Heading1 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                editor.chain().focus().toggleHeading({ level: 2 }).run()
              }
              className={`h-8 w-8 p-0 ${editor.isActive('heading', { level: 2 }) ? 'bg-primary/10 text-primary' : ''}`}
            >
              <Heading2 className="h-4 w-4" />
            </Button>
          </div>

          {/* 文本格式 */}
          <div className="flex items-center gap-1 px-2 border-r border-gray-200">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().toggleBold().run()}
              className={`h-8 w-8 p-0 ${editor.isActive('bold') ? 'bg-primary/10 text-primary' : ''}`}
            >
              <Bold className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().toggleItalic().run()}
              className={`h-8 w-8 p-0 ${editor.isActive('italic') ? 'bg-primary/10 text-primary' : ''}`}
            >
              <Italic className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().toggleStrike().run()}
              className={`h-8 w-8 p-0 ${editor.isActive('strike') ? 'bg-primary/10 text-primary' : ''}`}
            >
              <Strikethrough className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().toggleCode().run()}
              className={`h-8 w-8 p-0 ${editor.isActive('code') ? 'bg-primary/10 text-primary' : ''}`}
            >
              <Code className="h-4 w-4" />
            </Button>
          </div>

          {/* 列表 */}
          <div className="flex items-center gap-1 px-2 border-r border-gray-200">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              className={`h-8 w-8 p-0 ${editor.isActive('bulletList') ? 'bg-primary/10 text-primary' : ''}`}
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              className={`h-8 w-8 p-0 ${editor.isActive('orderedList') ? 'bg-primary/10 text-primary' : ''}`}
            >
              <ListOrdered className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              className={`h-8 w-8 p-0 ${editor.isActive('blockquote') ? 'bg-primary/10 text-primary' : ''}`}
            >
              <Quote className="h-4 w-4" />
            </Button>
          </div>

          {/* 其他 */}
          <div className="flex items-center gap-1 pl-2">
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
            >
              <Link2 className="h-4 w-4" />
            </Button>
          </div>

          {/* 帮助按钮 */}
          <div className="ml-auto">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-3 text-xs text-gray-600"
              onClick={() => {
                alert(
                  '快捷键提示：\n' +
                    '- Ctrl/Cmd + B: 粗体\n' +
                    '- Ctrl/Cmd + I: 斜体\n' +
                    '- Ctrl/Cmd + U: 下划线\n' +
                    '- Ctrl/Cmd + K: 插入链接\n' +
                    '- 输入 /: Slash 命令\n' +
                    '- 拖动块: 重新排序'
                );
              }}
            >
              <HelpCircle className="h-4 w-4 mr-1" />
              快捷键
            </Button>
          </div>
        </div>
      </div>

      {/* 编辑器内容区 */}
      <div className="editor-content border border-t-0 border-gray-200 rounded-b-lg bg-white">
        <EditorContent editor={editor} />
      </div>

      {/* 底部状态栏 */}
      <div className="editor-status-bar mt-2 flex items-center justify-between text-xs text-gray-500 px-2">
        <div>
          {editor.storage.characterCount.characters()} 字符 ·{' '}
          {editor.storage.characterCount.words()} 单词
        </div>
        <div>
          {enableCollaboration ? (
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              协作已启用
            </span>
          ) : (
            <span>本地模式</span>
          )}
        </div>
      </div>

      {/* 浮动菜单（选中文本时显示） */}
      <FloatingMenu editor={editor} />

      {/* Slash 命令菜单（输入 / 触发） */}
      <SlashMenu editor={editor} />

      {/* 段落悬停菜单（悬停在段落左侧时显示） */}
      <BlockMenu editor={editor} />
    </div>
  );
}
