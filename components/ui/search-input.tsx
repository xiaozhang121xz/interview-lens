import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { X, Search } from 'lucide-react';

interface SearchInputProps {
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  onClear?: () => void;
  className?: string;
  clearable?: boolean;
}

export function SearchInput({
  placeholder = '搜索...',
  value,
  onChange,
  onClear,
  className = '',
  clearable = true,
}: SearchInputProps) {
  const handleClear = () => {
    onChange('');
    onClear?.();
  };

  return (
    <div className="relative group">
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 group-focus-within:text-primary transition-colors" />
      <Input
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`pl-10 pr-4 transition-all duration-200 focus:shadow-sm focus:ring-2 focus:ring-primary/10 ${clearable && value ? 'pr-10' : ''} ${className}`}
      />
      {clearable && value && (
        <button
          onClick={handleClear}
          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full p-0.5 transition-all duration-200"
          title="清除搜索"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
