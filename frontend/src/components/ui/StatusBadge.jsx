export default function StatusBadge({ status, label, className = '' }) {
  const normStatus = (status || '').toLowerCase();

  let styles = 'bg-[#FEF3C7] text-[#92400E]'; // default pending
  let defaultLabel = 'Pending';

  if (normStatus === 'issued' || normStatus === 'valid') {
    styles = 'bg-[#DCFCE7] text-[#0F766E]';
    defaultLabel = 'Valid';
  } else if (normStatus === 'revoked' || normStatus === 'failed' || normStatus === 'tampered') {
    styles = 'bg-[#FEE2E2] text-[#B91C1C]';
    defaultLabel = normStatus === 'revoked' ? 'Dicabut' : 'Tidak Valid';
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

