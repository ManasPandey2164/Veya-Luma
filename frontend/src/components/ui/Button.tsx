import React from 'react';
import { cn } from '../../utils/cn';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      disabled,
      className,
      children,
      type = 'button',
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium font-sans transition-all duration-200 select-none disabled:opacity-40 disabled:pointer-events-none disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-luminous-cyan/70 focus-visible:ring-offset-2 focus-visible:ring-offset-obsidian-void active:scale-[0.98]';

    const variantStyles: Record<ButtonVariant, string> = {
      primary:
        'bg-luminous-cyan text-obsidian-void font-semibold hover:bg-luminous-cyan/90 hover:shadow-cyan-glow border border-transparent',
      secondary:
        'bg-obsidian-chamber/90 text-white hover:bg-obsidian-plate border border-white/10 hover:border-white/20',
      ghost:
        'bg-transparent text-slate-300 hover:text-white hover:bg-white/5 border border-transparent',
      outline:
        'bg-transparent text-white border border-white/20 hover:border-luminous-cyan/50 hover:text-luminous-cyan hover:bg-luminous-cyan/5',
      danger:
        'bg-luminous-crimson/15 text-luminous-crimson border border-luminous-crimson/30 hover:bg-luminous-crimson/25 hover:border-luminous-crimson/50 hover:shadow-crimson-glow',
    };

    const sizeStyles: Record<ButtonSize, string> = {
      sm: 'h-8 px-3 text-xs rounded-sm gap-1.5',
      md: 'h-10 px-4 text-sm rounded-md gap-2',
      lg: 'h-12 px-6 text-base rounded-md gap-2.5',
    };

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || isLoading}
        aria-busy={isLoading ? 'true' : undefined}
        className={cn(baseStyles, variantStyles[variant], sizeStyles[size], className)}
        {...props}
      >
        {isLoading ? (
          <span className="inline-flex items-center gap-2">
            <svg
              className="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span>Loading...</span>
          </span>
        ) : (
          <>
            {leftIcon && <span className="shrink-0">{leftIcon}</span>}
            <span>{children}</span>
            {rightIcon && <span className="shrink-0">{rightIcon}</span>}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';
export default Button;
