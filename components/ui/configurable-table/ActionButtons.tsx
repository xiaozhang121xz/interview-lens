'use client';

import { useState } from 'react';
import { MoreHorizontal, Edit, Trash2, Eye, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ActionConfig, BaseRecord } from './types';

interface ActionButtonsProps<T extends BaseRecord> {
  record: T;
  index: number;
  actions: ActionConfig<T>[];
  size?: 'small' | 'middle' | 'large';
}

// 类型守卫：判断是否为函数
function isFunction<T>(
  value: string | ((record: T) => string)
): value is (record: T) => string {
  return typeof value === 'function';
}

// 获取显示文本（处理string或函数）
function getText<T>(
  value: string | ((record: T) => string) | undefined,
  record: T,
  fallback: string
): string {
  if (!value) return fallback;
  if (isFunction(value)) return value(record);
  return value;
}

export function ActionButtons<T extends BaseRecord>({
  record,
  index,
  actions,
  size = 'middle',
}: ActionButtonsProps<T>) {
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    action: ActionConfig<T> | null;
  }>({ open: false, action: null });

  const visibleActions = actions.filter(
    (action) => !action.hidden || !action.hidden(record)
  );

  const handleActionClick = async (action: ActionConfig<T>) => {
    if (action.confirm) {
      setConfirmDialog({ open: true, action });
    } else {
      await action.onClick(record, index);
    }
  };

  const handleConfirmAction = async () => {
    if (confirmDialog.action) {
      await confirmDialog.action.onClick(record, index);
      setConfirmDialog({ open: false, action: null });
    }
  };

  // 如果没有可见的操作，返回空
  if (visibleActions.length === 0) {
    return null;
  }

  // 如果只有一个操作，直接显示按钮
  if (visibleActions.length === 1) {
    const action = visibleActions[0];
    const isDisabled = action.disabled ? action.disabled(record) : false;
    const Icon = action.icon;

    return (
      <>
        <Button
          variant={action.variant || 'ghost'}
          size={action.size || 'sm'}
          disabled={isDisabled}
          onClick={() => handleActionClick(action)}
          className={`h-8 w-8 p-0 ${
            action.className || 'hover:bg-primary/10 hover:text-primary'
          }`}
        >
          {Icon && <Icon className="h-4 w-4" />}
        </Button>

        <Dialog
          open={confirmDialog.open}
          onOpenChange={(open) => setConfirmDialog({ ...confirmDialog, open })}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {getText(action.confirm?.title, record, '确认操作')}
              </DialogTitle>
              <DialogDescription>
                {getText(
                  action.confirm?.description,
                  record,
                  '此操作不可撤销，请确认是否继续？'
                )}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setConfirmDialog({ open: false, action: null })}
              >
                取消
              </Button>
              <Button onClick={handleConfirmAction}>确认</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // 多个操作时，显示主要操作按钮和下拉菜单
  const primaryAction =
    visibleActions.find(
      (action) => action.variant !== 'ghost' && action.variant !== 'outline'
    ) || visibleActions[0];

  const secondaryActions = visibleActions.filter(
    (action) => action !== primaryAction
  );

  return (
    <>
      <div className="flex items-center gap-1">
        {/* 主要操作按钮 */}
        <Button
          variant={primaryAction.variant || 'ghost'}
          size={primaryAction.size || 'sm'}
          disabled={
            primaryAction.disabled ? primaryAction.disabled(record) : false
          }
          onClick={() => handleActionClick(primaryAction)}
          className={`h-8 w-8 p-0 ${
            primaryAction.className || 'hover:bg-primary/10 hover:text-primary'
          }`}
        >
          {primaryAction.icon && <primaryAction.icon className="h-4 w-4" />}
        </Button>

        {/* 更多操作下拉菜单 */}
        {secondaryActions.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 hover:bg-gray-100"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {secondaryActions.map((action) => {
                const isDisabled = action.disabled
                  ? action.disabled(record)
                  : false;
                const Icon = action.icon;

                return (
                  <DropdownMenuItem
                    key={action.key}
                    disabled={isDisabled}
                    onClick={() => handleActionClick(action)}
                    className="text-sm cursor-pointer"
                  >
                    {Icon && <Icon className="h-4 w-4 mr-2" />}
                    {action.label}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* 确认对话框 */}
      <Dialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog({ ...confirmDialog, open })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {getText(
                confirmDialog.action?.confirm?.title,
                record,
                '确认操作'
              )}
            </DialogTitle>
            <DialogDescription>
              {getText(
                confirmDialog.action?.confirm?.description,
                record,
                '此操作不可撤销，请确认是否继续？'
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setConfirmDialog({ ...confirmDialog, open: false })
              }
            >
              取消
            </Button>
            <Button onClick={handleConfirmAction}>确认</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
