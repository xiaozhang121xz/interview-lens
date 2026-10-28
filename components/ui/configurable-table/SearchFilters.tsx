'use client';

import { useState, useMemo } from 'react';
import { Search, X, RotateCcw } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SearchConfig, FilterConfig } from './types';

interface SearchFiltersProps {
  config: SearchConfig;
  value: string;
  filters: Record<string, any>;
  loading?: boolean;
  onSearch: (value: string) => void;
  onFilterChange: (key: string, value: any) => void;
  onReset: () => void;
}

export function SearchFilters({
  config,
  value,
  filters,
  loading = false,
  onSearch,
  onFilterChange,
  onReset,
}: SearchFiltersProps) {
  const [isAdvanced, setIsAdvanced] = useState(config.defaultAdvanced || false);
  const hasActiveFilters = useMemo(() => {
    return Object.values(filters).some(
      (filterValue) =>
        filterValue && filterValue !== 'all' && filterValue !== ''
    );
  }, [filters]);

  const hasContent = value || hasActiveFilters;

  const handleReset = () => {
    onSearch('');
    config.filters?.forEach((filter) => {
      onFilterChange(filter.key, filter.options?.[0]?.value || '');
    });
  };

  const getFilterLabel = (filterConfig: FilterConfig, filterValue: any) => {
    const option = filterConfig.options?.find(
      (opt) => opt.value === filterValue
    );
    return option?.label || filterValue;
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* 搜索框 */}
      <div className="relative flex-shrink-0">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder={config.placeholder || '搜索...'}
          value={value}
          onChange={(e) => onSearch(e.target.value)}
          className="pl-10 h-9 text-sm border-gray-200 focus:border-primary focus:ring-primary/20 w-64"
        />
        {value && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onSearch('')}
            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0 hover:bg-gray-100"
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>

      {/* 筛选条件 */}
      {(config.defaultAdvanced || config.filters) &&
        config.filters?.map((filterConfig) => {
          // 获取筛选值，如果为空或'all'，则使用空字符串
          const filterValue = filters[filterConfig.key] || '';
          // 将内部值转换为Select组件的显示值
          // 空字符串对应'all'选项，其他值保持不变
          const selectValue = filterValue === '' ? 'all' : filterValue;

          if (
            filterConfig.type === 'select' ||
            filterConfig.type === 'multiSelect'
          ) {
            return (
              <Select
                key={filterConfig.key}
                value={selectValue}
                onValueChange={(newValue) =>
                  // 将'all'转换回空字符串
                  onFilterChange(
                    filterConfig.key,
                    newValue === 'all' ? '' : newValue
                  )
                }
              >
                <SelectTrigger className="h-9 text-sm border-gray-200 min-w-[120px] flex-shrink-0">
                  <SelectValue
                    placeholder={filterConfig.placeholder || filterConfig.label}
                  />
                </SelectTrigger>
                <SelectContent>
                  {filterConfig.options?.map((option) => (
                    <SelectItem
                      key={option.value}
                      value={option.value}
                      className="text-sm"
                    >
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            );
          }

          // 其他类型的筛选器可以在这里扩展
          return null;
        })}

      {/* 高级筛选切换按钮 */}
      {config.showAdvancedToggle && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsAdvanced(!isAdvanced)}
          className="h-9 text-xs text-primary hover:bg-primary/5 flex-shrink-0"
        >
          {isAdvanced ? '收起筛选' : '展开筛选'}
        </Button>
      )}

      {/* 重置按钮 */}
      {hasContent && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleReset}
          disabled={!hasContent}
          className="h-9 text-xs border-gray-200 hover:bg-gray-50 flex-shrink-0"
        >
          <RotateCcw className="h-3 w-3 mr-1" />
          重置
        </Button>
      )}

      {/* 活跃筛选条件显示（紧凑显示） */}
      {hasActiveFilters && (
        <div className="flex items-center gap-1 ml-2">
          <span className="text-xs text-gray-500 whitespace-nowrap">
            当前筛选:
          </span>
          {config.filters?.map((filterConfig) => {
            const filterValue = filters[filterConfig.key];
            if (!filterValue || filterValue === 'all' || filterValue === '') {
              return null;
            }
            return (
              <Badge
                key={filterConfig.key}
                variant="secondary"
                className="text-xs gap-1 flex-shrink-0"
              >
                {filterConfig.label}:{' '}
                {getFilterLabel(filterConfig, filterValue)}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0 hover:bg-gray-200"
                  onClick={() => onFilterChange(filterConfig.key, '')}
                >
                  <X className="h-2 w-2" />
                </Button>
              </Badge>
            );
          })}
        </div>
      )}
    </div>
  );
}
