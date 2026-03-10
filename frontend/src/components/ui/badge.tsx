import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/80',
        secondary: 'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
        destructive: 'border-transparent bg-destructive text-destructive-foreground shadow hover:bg-destructive/80',
        outline: 'text-foreground',
        open: 'border-transparent bg-blue-900 text-blue-200',
        in_progress: 'border-transparent bg-yellow-900 text-yellow-200',
        resolved: 'border-transparent bg-green-900 text-green-200',
        closed: 'border-transparent bg-gray-700 text-gray-300',
        low: 'border-transparent bg-slate-700 text-slate-200',
        medium: 'border-transparent bg-blue-900 text-blue-200',
        high: 'border-transparent bg-orange-900 text-orange-200',
        urgent: 'border-transparent bg-red-900 text-red-200',
      },
    },
    defaultVariants: { variant: 'default' },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
