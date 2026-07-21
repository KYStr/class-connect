import type { ReactNode } from 'react';

interface CardProps {
  label?: ReactNode;
  children: ReactNode;
  variant?: 'default' | 'hero' | 'announce' | 'announce-imp';
  className?: string;
  onClick?: () => void;
}

const variantClass: Record<NonNullable<CardProps['variant']>, string> = {
  default: '',
  hero: ' hero-card',
  announce: ' announce',
  'announce-imp': ' announce imp',
};

export function Card({ label, children, variant = 'default', className = '', onClick }: CardProps) {
  return (
    <div className={`card${variantClass[variant]}${className ? ` ${className}` : ''}`} onClick={onClick}>
      {label != null && <div className="lab">{label}</div>}
      {children}
    </div>
  );
}
