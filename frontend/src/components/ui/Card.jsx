export default function Card({ children, className = '', ...props }) {
  return (
    <div
      className={`bg-surface rounded-xl border border-border shadow-sm p-6 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ title, description, action, className = '' }) {
  if (!title && !description && !action) return null;
  return (
    <div className={`flex items-start justify-between gap-4 mb-5 ${className}`}>
      <div>
        {title && <h3 className="text-base font-semibold text-brand-900">{title}</h3>}
        {description && <p className="text-xs text-muted mt-0.5">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

