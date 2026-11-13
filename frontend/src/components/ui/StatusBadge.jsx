export default function StatusBadge({ status, label, className = '' }) {
  const normStatus = (status || '').toLowerCase();

  let styles = 'bg-[#FEF3C7] text-[#92400E]'; // default pending
  let defaultLabel = 'Menunggu';

  if (normStatus === 'issued' || normStatus === 'valid') {
    styles = 'bg-[#DCFCE7] text-[#166534]';
    defaultLabel = normStatus === 'valid' ? 'Valid' : 'Selesai';
  } else if (normStatus === 'revoked' || normStatus === 'failed' || normStatus === 'tampered') {
    styles = 'bg-[#FEE2E2] text-[#B91C1C]';
    defaultLabel = normStatus === 'revoked' ? 'Dicabut' : 'Tidak Valid';
  } else if (normStatus === 'rejected') {
    styles = 'bg-[#FEE2E2] text-[#B91C1C]';
    defaultLabel = 'Ditolak';
  } else if (normStatus === 'cancelled') {
    styles = 'bg-[#F1F5F9] text-[#475569] border border-[#CBD5E1]';
    defaultLabel = 'Dibatalkan';
  } else if (normStatus === 'pending') {
    styles = 'bg-[#FEF3C7] text-[#92400E]';
    defaultLabel = 'Menunggu';
  }

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium tracking-wide ${styles} ${className}`}
    >
      {label || defaultLabel}
    </span>
  );
}
