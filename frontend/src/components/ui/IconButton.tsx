import React from 'react';
import { cn } from '../../utils/cn';

export type IconButtonVariant = 'ghost' | 'secondary' | 'primary' | 'active';
export type IconButtonSize = 'sm' | 'md' | 'lg';

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode;
  label: string;
  variant?: IconButtonVariant;
  size?: IconButtonSize;
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    {
      icon,
      label,
      variant = 'ghost',
      size = 'md',
      disabled,
      className,
      type = 'button',
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center transition-all duration-200 select-none disabled:opacity-30 disabled:pointer-events-none disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-luminous-cyan/70 focus-visible:ring-offset-2 focus-visible:ring-offset-obsidian-void active:scale-95';

    const variantStyles: Record<IconButtonVariant, string> = {
      ghost:
        'bg-transparent text-slate-400 hover:text-white hover:bg-white/5 border border-transparent',
      secondary:
        'bg-obsidian-chamber/80 text-slate-300 hover:text-white hover:bg-obsidian-plate border border-white/10 hover:border-white/20',
      primary:
        'bg-luminous-cyan text-obsidian-void hover:bg-luminous-cyan/90 hover:shadow-cyan-glow border border-transparent',
      active:
        'bg-luminous-cyan/15 text-luminous-cyan border border-luminous-cyan/40 shadow-cyan-glow hover:bg-luminous-cyan/25',
    };

    const sizeStyles: Record<IconButtonSize, string> = {
      sm: 'w-8 h-8 rounded-sm text-xs',
      md: 'w-10 h-10 rounded-md text-sm',
      lg: 'w-12 h-12 rounded-md text-base',
    };

    return (
      <button
        ref={ref}
        type={type}
        aria-label={label}
        title={label}
        disabled={disabled}
        className={cn(baseStyles, variantStyles[variant], sizeStyles[size], className)}
        {...props}
      >
        {icon}
      </button>
    );
  }
);

IconButton.displayName = 'IconButton';
export default IconButton;
