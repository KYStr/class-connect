interface EmptyStateProps {
  icon?: string;
  children: React.ReactNode;
}

// Friendly empty state (SPEC L14, DESIGN.md §8). Never leave a list blank.
export function EmptyState({ icon, children }: EmptyStateProps) {
  return (
    <div className="empty" role="status" aria-live="polite">
      {icon && (
        <span className="big" aria-hidden="true">
          {icon}
        </span>
      )}
      {children}
    </div>
  );
}
