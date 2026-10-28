import * as React from 'react';

import { cn } from '@/lib/utils';

function CompactCard({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="compact-card"
      className={cn(
        'bg-card text-card-foreground flex flex-col rounded-xl border shadow-sm',
        className
      )}
      {...props}
    />
  );
}

function CompactCardHeader({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="compact-card-header"
      className={cn(
        '@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-1.5 px-5 py-3',
        className
      )}
      {...props}
    />
  );
}

function CompactCardTitle({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="compact-card-title"
      className={cn('leading-none font-semibold', className)}
      {...props}
    />
  );
}

function CompactCardDescription({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="compact-card-description"
      className={cn('text-muted-foreground text-sm', className)}
      {...props}
    />
  );
}

function CompactCardContent({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="compact-card-content"
      className={cn('px-5 pb-4', className)}
      {...props}
    />
  );
}

function CompactCardFooter({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="compact-card-footer"
      className={cn('flex items-center px-5 pb-4 pt-0', className)}
      {...props}
    />
  );
}

export {
  CompactCard,
  CompactCardHeader,
  CompactCardFooter,
  CompactCardTitle,
  CompactCardDescription,
  CompactCardContent,
};
