'use client';

import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ChevronUp,
  ChevronDown,
  MoreHorizontal,
  RefreshCw,
} from 'lucide-react';
import { ConfigurableTableProps, BaseRecord } from './types';
import { SearchFilters } from './SearchFilters';
import { ActionButtons } from './ActionButtons';
import { useTableData } from './hooks/useTableData';
import { TABLE_SIZE_CONFIG } from './config';

// 分页组件
function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  total,
  pageSize,
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  total: number;
  pageSize: number;
}) {
  const maxVisiblePages = 5;
  const pages = [];

  let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
  const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

  if (endPage - startPage + 1 < maxVisiblePages) {
    startPage = Math.max(1, endPage - maxVisiblePages + 1);
  }

  for (let i = startPage; i <= endPage; i++) {
    pages.push(i);
  }

  return (
    <div className="flex items-center justify-between">
      <div className="text-sm text-muted-foreground">
        显示第 {(currentPage - 1) * pageSize + 1} 到{' '}
        {Math.min(currentPage * pageSize, total)} 条，共 {total} 条记录
      </div>
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
        >
          首页
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
        >
          上一页
        </Button>

        {startPage > 1 && (
          <>
            <Button variant="ghost" size="sm" disabled>
              ...
            </Button>
          </>
        )}

        {pages.map((page) => (
          <Button
            key={page}
            variant={currentPage === page ? 'default' : 'outline'}
            size="sm"
            onClick={() => onPageChange(page)}
          >
            {page}
          </Button>
        ))}

        {endPage < totalPages && (
          <>
            <Button variant="ghost" size="sm" disabled>
              ...
            </Button>
          </>
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          下一页
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
        >
          末页
        </Button>
      </div>
    </div>
  );
}

export function ConfigurableTable<T extends BaseRecord>({
  config,
  className = '',
  externalPagination,
  onDataUpdate,
}: ConfigurableTableProps<T>) {
  // 使用自定义hook管理数据
  const {
    data,
    loading,
    pagination,
    searchValue,
    filters,
    sort,
    fetchData,
    refresh,
    handlePageChange,
    setSearchValue,
    setFilters,
    handleSortChange,
  } = useTableData({ config });

  // 处理筛选变化
  const handleFilterChange = useCallback(
    (key: string, value: any) => {
      setFilters({ ...filters, [key]: value });
    },
    [filters, setFilters]
  );

  // 处理新增按钮点击
  const handleAddClick = useCallback(() => {
    const addAction = config.actions?.find((action) => action.key === 'add');
    if (addAction) {
      addAction.onClick({} as T, -1);
    }
  }, [config.actions]);

  // 处理行点击
  const handleRowClick = useCallback(
    (record: T, index: number, event: React.MouseEvent) => {
      // 如果点击的是按钮，不触发行点击
      const target = event.target as HTMLElement;
      if (target.closest('button')) {
        return;
      }
      config.onRowClick?.(record, index, event);
    },
    [config.onRowClick]
  );

  // 获取表格列配置（过滤隐藏列）
  const visibleColumns = config.columns.filter((column) => !column.hidden);

  // 获取表格尺寸配置
  const sizeConfig = TABLE_SIZE_CONFIG[config.size || 'middle'];

  return (
    <div className={`space-y-3 ${className}`}>
      {/* 主表格卡片 */}
      <Card>
        {/* 表格标题栏：包含标题、搜索、筛选和新增按钮 */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-4 pt-0 pb-0">
          {/* 左侧标题容器 */}
          <div className="flex-1">
            {config.title && (
              <h3 className="text-base font-semibold text-gray-900">
                {config.title}
              </h3>
            )}
          </div>

          {/* 右侧按钮容器 */}
          <div className="flex items-center gap-2 sm:gap-2">
            {/* 刷新按钮 */}
            <Button
              variant="outline"
              size="sm"
              onClick={refresh}
              disabled={loading}
              className="shrink-0"
            >
              <RefreshCw
                className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`}
              />
              <span className="hidden sm:inline ml-2">刷新</span>
            </Button>

            {/* 搜索和筛选 */}
            {config.search && (
              <SearchFilters
                config={config.search}
                value={searchValue}
                filters={filters}
                loading={loading}
                onSearch={setSearchValue}
                onFilterChange={handleFilterChange}
                onReset={() => {
                  setSearchValue('');
                  const resetFilters: Record<string, any> = {};
                  config.search?.filters?.forEach((filter) => {
                    resetFilters[filter.key] = '';
                  });
                  setFilters(resetFilters);
                }}
              />
            )}

            {/* 新增按钮 */}
            {(() => {
              const addAction = config.actions?.find(
                (action) => action.key === 'add'
              );
              if (!addAction) return null;

              const Icon = addAction.icon;

              return (
                <Button
                  onClick={handleAddClick}
                  size={addAction.size || 'sm'}
                  className={`shrink-0 ${addAction.className || ''}`}
                  variant={addAction.variant || 'default'}
                  disabled={
                    addAction.disabled ? addAction.disabled({} as T) : false
                  }
                >
                  {Icon && <Icon className="mr-2 h-4 w-4" />}
                  <span className="hidden sm:inline">{addAction.label}</span>
                  <span className="sm:hidden">
                    {(addAction as any).shortLabel || addAction.label}
                  </span>
                </Button>
              );
            })()}
          </div>
        </div>

        {/* 表格内容 */}
        <div className="px-4 pt-2 pb-3">
          {/* 加载状态 */}
          {loading && (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    {visibleColumns.map((column) => (
                      <TableHead
                        key={String(column.key)}
                        className={column.headerClassName}
                      >
                        {column.title}
                      </TableHead>
                    ))}
                    {config.actions && config.actions.length > 0 && (
                      <TableHead className="w-[100px]">操作</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
              </Table>
              <div className="flex items-center justify-center py-8">
                <div className="text-sm text-muted-foreground">加载中...</div>
              </div>
            </div>
          )}

          {/* 空状态 */}
          {!loading && data.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="text-sm text-muted-foreground">
                {config.empty?.description || '暂无数据'}
              </div>
            </div>
          )}

          {/* 数据表格 */}
          {!loading && data.length > 0 && (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {visibleColumns.map((column) => (
                        <TableHead
                          key={String(column.key)}
                          className={`${column.headerClassName} ${
                            column.sortable
                              ? 'cursor-pointer hover:bg-gray-50'
                              : ''
                          }`}
                          onClick={() =>
                            column.sortable &&
                            handleSortChange(String(column.key))
                          }
                        >
                          <div className="flex items-center gap-1">
                            {column.title}
                            {column.sortable &&
                              sort?.key === String(column.key) &&
                              (sort.direction === 'asc' ? (
                                <ChevronUp className="h-3 w-3" />
                              ) : (
                                <ChevronDown className="h-3 w-3" />
                              ))}
                          </div>
                        </TableHead>
                      ))}
                      {config.actions && config.actions.length > 0 && (
                        <TableHead className="w-[100px]">操作</TableHead>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.map((record: T, index: number) => (
                      <TableRow
                        key={record.id}
                        className={`${config.hover ? 'hover:bg-gray-50' : ''} ${
                          config.striped && index % 2 === 1
                            ? 'bg-gray-50/50'
                            : ''
                        } ${config.onRowClick ? 'cursor-pointer' : ''}`}
                        onClick={(e) => handleRowClick(record, index, e)}
                      >
                        {visibleColumns.map((column) => {
                          const value = record[column.key as keyof T];
                          return (
                            <TableCell
                              key={String(column.key)}
                              className={`${column.className} ${sizeConfig.fontSize}`}
                            >
                              {column.render
                                ? column.render(value, record, index)
                                : value || '-'}
                            </TableCell>
                          );
                        })}
                        {config.actions && config.actions.length > 0 && (
                          <TableCell>
                            <ActionButtons
                              record={record}
                              index={index}
                              actions={config.actions.filter(
                                (action) => action.key !== 'add'
                              )}
                              size={config.size}
                            />
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* 分页 */}
              {(config.pagination?.enabled !== false &&
                pagination.totalPages > 1) ||
              externalPagination ? (
                <div className="mt-6 pt-4 border-t">
                  <Pagination
                    currentPage={
                      externalPagination
                        ? externalPagination.page
                        : pagination.page
                    }
                    totalPages={
                      externalPagination
                        ? externalPagination.totalPages
                        : pagination.totalPages
                    }
                    onPageChange={
                      externalPagination
                        ? externalPagination.onPageChange
                        : handlePageChange
                    }
                    total={
                      externalPagination
                        ? externalPagination.total
                        : pagination.total
                    }
                    pageSize={
                      externalPagination
                        ? externalPagination.pageSize
                        : pagination.pageSize
                    }
                  />
                </div>
              ) : null}
            </>
          )}
        </div>
      </Card>
    </div>
  );
}

export default ConfigurableTable;
