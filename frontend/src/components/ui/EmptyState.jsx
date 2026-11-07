export default function EmptyState({
  icon: Icon,
  title = 'Tidak ada data',
  description = 'Belum ada data yang tersedia untuk ditampilkan saat ini.',
  action,
  className = '',
}) {
  return (
    <div className={`flex flex-col items-center justify-center text-center p-8 sm:p-12 ${className}`}>
      {Icon && (
        <div className="w-12 h-12 rounded-xl bg-brand-100 text-brand-600 flex items-center justify-center mb-4">
          <Icon className="w-6 h-6" />
        </div>
      )}
      <h3 className="text-base font-semibold text-brand-900">{title}</h3>
      <p className="text-xs text-muted max-w-sm mt-1 leading-relaxed">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

