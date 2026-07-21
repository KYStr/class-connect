import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  tone?: 'primary' | 'amber';
  full?: boolean;
}

// Primary action button (DESIGN.md §6). Green (parent) or amber (teacher) gradient.
export function Button({ children, tone = 'primary', className = '', ...rest }: ButtonProps) {
  const cls = ['btn', tone === 'amber' ? 'amber' : '', className].filter(Boolean).join(' ');
  return (
    <button className={cls} {...rest}>
      {children}
    </button>
  );
}

interface GhostButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
}

export function GhostButton({ children, className = '', ...rest }: GhostButtonProps) {
  return (
    <button className={`ghost-btn${className ? ` ${className}` : ''}`} {...rest}>
      {children}
    </button>
  );
}
