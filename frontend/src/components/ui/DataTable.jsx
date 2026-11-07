export default function DataTable({
  children,
  footer,
  className = '',
  containerClassName = '',
}) {
  return (
    <div className={`bg-surface rounded-xl border border-border shadow-sm overflow-hidden ${containerClassName}`}>
      <div className="overflow-x-auto">
        <table className={`w-full text-left text-sm text-ink border-collapse ${className}`}>
          {children}
        </table>
      </div>
      {footer && (
        <div className="px-6 py-3 border-t border-border bg-surface text-xs text-muted flex items-center justify-between">
          {footer}
        </div>
      )}
    </div>
  );
}

export function TableHead({ children, className = '' }) {
  return (
    <thead className={`bg-canvas/70 border-b border-border text-xs font-semibold uppercase tracking-wider text-muted ${className}`}>
      {children}
    </thead>
  );
}

export function TableBody({ children, className = '' }) {
  return (
    <tbody className={`divide-y divide-border ${className}`}>
      {children}
    </tbody>
  );
}

export function TableRow({ children, className = '', onClick, ...props }) {
  return (
    <tr
      onClick={onClick}
      className={`transition-colors duration-150 hover:bg-brand-50 ${
        onClick ? 'cursor-pointer' : ''
      } ${className}`}
      {...props}
    >
      {children}
    </tr>
  );
}

export function TableHeaderCell({ children, className = '', ...props }) {
  return (
    <th className={`px-6 py-3.5 font-semibold ${className}`} {...props}>
      {children}
    </th>
  );
}

export function TableCell({ children, className = '', ...props }) {
  return (
    <td className={`px-6 py-4 align-middle ${className}`} {...props}>
      {children}
    </td>
  );
}

