import { cn } from '@/lib/utils';
import { ButtonHTMLAttributes, forwardRef } from 'react';
import { Loader2 } from 'lucide-react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'destructive' | 'success';
type Size    = 'sm' | 'md' | 'lg';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
}

const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { variant = 'primary', size = 'md', loading, fullWidth, className, children, disabled, ...rest },
  ref,
) {
  const v = {
    primary:     'bg-brick text-white hover:bg-brick-600 shadow-sm shadow-brick/20',
    secondary:   'bg-surface-2 text-text border border-border hover:bg-surface-3',
    ghost:       'text-text-muted hover:text-text hover:bg-surface-2',
    destructive: 'bg-destructive text-white hover:bg-destructive/90',
    success:     'bg-success text-white hover:bg-success/90',
  }[variant];
  const s = {
    sm: 'h-8  px-3 text-xs',
    md: 'h-10 px-4 text-sm',
    lg: 'h-12 px-5 text-sm',
  }[size];
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed',
        v, s, fullWidth && 'w-full',
        className,
      )}
      {...rest}
    >
      {loading && <Loader2 size={14} className="animate-spin" />}
      {children}
    </button>
  );
});

export default Button;
