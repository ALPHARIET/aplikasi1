export default function StatCard({
  label,
  value,
  icon: Icon,
  helperText,
  iconBg = 'bg-brand-100',
  iconColor = 'text-brand-600',
  className = '',
}) {
  return (
    <div
      className={`bg-surface rounded-xl border border-border p-6 shadow-sm flex flex-col justify-between transition-colors ${className}`}
    >
      <div className="flex items-center justify-between gap-3 mb-3">
        <span className="text-xs font-medium text-muted tracking-wide">{label}</span>
        {Icon && (
          <div className={`w-9 h-9 rounded-lg ${iconBg} ${iconColor} flex items-center justify-center shrink-0`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>

      <div>
        <p className="text-3xl font-semibold tabular-nums text-ink">{value}</p>
        {helperText && <p className="text-xs text-muted mt-1">{helperText}</p>}
      </div>
    </div>
  );
}

