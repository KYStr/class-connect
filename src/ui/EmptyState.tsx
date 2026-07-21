interface EmptyStateProps {
  icon?: string;
  children: React.ReactNode;
}

// Friendly empty state (SPEC L14, DESIGN.md §8). Never leave a list blank.
export function EmptyState({ icon, children }: EmptyStateProps) {
  return (
    <div className="empty">
      {icon && <span className="big">{icon}</span>}
      {children}
    </div>
  );
}
