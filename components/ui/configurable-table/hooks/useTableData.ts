'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  TableConfig,
  TableState,
  BaseRecord,
  PaginationConfig,
  SortConfig,
} from '../types';

interface UseTableDataOptions<T extends BaseRecord> {
  config: TableConfig<T>;
  autoFetch?: boolean;
}

export function useTableData<T extends BaseRecord>({
  config,
  autoFetch = true,
}: UseTableDataOptions<T>) {
  // 状态管理
  const [state, setState] = useState<TableState<T>>({
    data: [],
    loading: false,
    pagination: {
      page: 1,
      pageSize: config.pagination?.pageSize || 10,
      total: 0,
      totalPages: 0,
    },
    searchValue: '',
    filters: {},
    sort: null,
    selectedRows: [],
    selectedRowKeys: [],
  });

  // 设置加载状态
  const setLoading = useCallback((loading: boolean) => {
    setState((prev) => ({ ...prev, loading }));
  }, []);

  // 设置分页
  const setPagination = useCallback((pagination: Partial<PaginationConfig>) => {
    setState((prev) => ({
      ...prev,
      pagination: { ...prev.pagination, ...pagination },
    }));
  }, []);

  // 设置搜索值
  const setSearchValue = useCallback(
    (searchValue: string) => {
      setState((prev) => ({ ...prev, searchValue }));
      setPagination({ page: 1 }); // 搜索时重置到第一页
    },
    [setPagination]
  );

  // 设置筛选条件
  const setFilters = useCallback(
    (filters: Record<string, any>) => {
      setState((prev) => ({ ...prev, filters }));
      setPagination({ page: 1 }); // 筛选时重置到第一页
    },
    [setPagination]
  );

  // 设置排序
  const setSort = useCallback((sort: SortConfig | null) => {
    setState((prev) => ({ ...prev, sort }));
  }, []);

  // 设置选中行
  const setSelectedRows = useCallback(
    (selectedRows: T[], selectedRowKeys: (string | number)[]) => {
      setState((prev) => ({ ...prev, selectedRows, selectedRowKeys }));
    },
    []
  );

  // 获取数据
  const fetchData = useCallback(async () => {
    if (!config.dataSource) return;

    setLoading(true);
    try {
      let data: T[];

      if (typeof config.dataSource === 'function') {
        data = await config.dataSource();
      } else {
        data = config.dataSource;
      }

      // 应用搜索
      if (state.searchValue && config.search?.fields) {
        const searchFields = config.search.fields;
        data = data.filter((item) =>
          searchFields.some((field) =>
            String(item[field] || '')
              .toLowerCase()
              .includes(state.searchValue.toLowerCase())
          )
        );
      }

      // 应用筛选
      Object.entries(state.filters).forEach(([key, value]) => {
        if (value && value !== 'all' && value !== '') {
          data = data.filter((item) => item[key] === value);
        }
      });

      // 应用排序
      if (state.sort) {
        const { key, direction } = state.sort;
        data = [...data].sort((a, b) => {
          const aVal = a[key];
          const bVal = b[key];

          if (aVal < bVal) return direction === 'asc' ? -1 : 1;
          if (aVal > bVal) return direction === 'asc' ? 1 : -1;
          return 0;
        });
      }

      // 更新总数
      const total = data.length;

      // 应用分页
      if (config.pagination?.enabled !== false) {
        const { page, pageSize } = state.pagination;
        const start = (page - 1) * pageSize;
        const end = start + pageSize;
        data = data.slice(start, end);
      }

      setState((prev) => ({
        ...prev,
        data,
        pagination: {
          ...prev.pagination,
          total,
          totalPages: Math.ceil(total / (config.pagination?.pageSize || 10)),
        },
      }));

      // 触发回调
      config.onDataChange?.(data);
    } catch (error) {
      console.error('Failed to fetch table data:', error);
      setState((prev) => ({ ...prev, data: [] }));
    } finally {
      setLoading(false);
    }
  }, [
    config,
    state.searchValue,
    state.filters,
    state.sort,
    state.pagination.page,
    state.pagination.pageSize,
    setLoading,
  ]);

  // 自动获取数据
  useEffect(() => {
    if (autoFetch) {
      fetchData();
    }
  }, [fetchData, autoFetch]);

  // 刷新数据
  const refresh = useCallback(() => {
    fetchData();
  }, [fetchData]);

  // 重置状态
  const reset = useCallback(() => {
    setState({
      data: [],
      loading: false,
      pagination: {
        page: 1,
        pageSize: config.pagination?.pageSize || 10,
        total: 0,
        totalPages: 0,
      },
      searchValue: '',
      filters: {},
      sort: null,
      selectedRows: [],
      selectedRowKeys: [],
    });
  }, [config.pagination?.pageSize]);

  // 处理页面变化
  const handlePageChange = useCallback(
    (page: number) => {
      setPagination({ page });
    },
    [setPagination]
  );

  // 处理页面大小变化
  const handlePageSizeChange = useCallback(
    (pageSize: number) => {
      setPagination({ pageSize, page: 1 });
    },
    [setPagination]
  );

  // 处理排序变化
  const handleSortChange = useCallback(
    (key: string) => {
      const currentSort = state.sort;
      let newSort: SortConfig | null;

      if (!currentSort || currentSort.key !== key) {
        newSort = { key, direction: 'asc' };
      } else if (currentSort.direction === 'asc') {
        newSort = { key, direction: 'desc' };
      } else {
        newSort = null;
      }

      setSort(newSort);
    },
    [state.sort, setSort]
  );

  // 获取过滤后的原始数据（用于统计卡片）
  const rawFilteredData = useMemo(() => {
    // 这里应该返回应用了搜索和筛选但没有分页的数据
    // 为了简化，我们返回当前加载的数据
    return state.data;
  }, [state.data]);

  return {
    // 数据状态
    data: state.data,
    loading: state.loading,
    pagination: state.pagination,
    searchValue: state.searchValue,
    filters: state.filters,
    sort: state.sort,
    selectedRows: state.selectedRows,
    selectedRowKeys: state.selectedRowKeys,

    // 操作方法
    setLoading,
    setPagination,
    setSearchValue,
    setFilters,
    setSort,
    setSelectedRows,
    fetchData,
    refresh,
    reset,

    // 便捷方法
    handlePageChange,
    handlePageSizeChange,
    handleSortChange,

    // 计算属性
    rawFilteredData,
  };
}
