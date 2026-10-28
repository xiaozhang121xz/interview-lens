import { Input } from '@/components/ui/input';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InputWithIconProps {
  icon?: LucideIcon;
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url';
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
  id?: string;
  name?: string;
  required?: boolean;
  disabled?: boolean;
  error?: boolean;
}

/**
 * 带图标的输入框组件
 *
 * 这是一个简单的输入框包装，用于显示带图标的输入字段。
 *
 * 对于复杂的表单场景，请使用 shadcn/ui 的 Form 组件：
 * ```tsx
 * import { Form, FormField, FormItem, FormLabel, FormControl } from '@/components/ui/form'
 * import { useForm } from 'react-hook-form'
 * ```
 */
export function InputWithIcon({
  icon: Icon,
  type = 'text',
  placeholder,
  value,
  onChange,
  className = '',
  id,
  name,
  required = false,
  disabled = false,
  error = false,
}: InputWithIconProps) {
  return (
    <div className="relative">
      {Icon && (
        <Icon
          className={cn(
            'absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5',
            error ? 'text-destructive' : 'text-muted-foreground'
          )}
        />
      )}
      <Input
        id={id}
        name={name}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          Icon && 'pl-10',
          error &&
            'border-destructive focus:border-destructive focus:ring-destructive/20',
          className
        )}
        required={required}
        disabled={disabled}
        aria-invalid={error}
      />
    </div>
  );
}
