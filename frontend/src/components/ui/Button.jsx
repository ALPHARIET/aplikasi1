import { Loader2 } from 'lucide-react';

const VARIANTS = {
  // Primary: Isi #151B54, Teks #FFFFFF, Tepi tidak ada, Hover #1E2A78
  primary: 'bg-[#151B54] text-[#FFFFFF] hover:bg-[#1E2A78] border-0 shadow-sm',

  // Secondary (outline): Isi #FFFFFF, Teks #151B54, Tepi #151B54 1.5px, Hover isi #F3F5FD
  secondary: 'bg-[#FFFFFF] text-[#151B54] border-[1.5px] border-[#151B54] hover:bg-[#F3F5FD]',

  // Danger: Isi #B91C1C, Teks #FFFFFF, Tepi tidak ada, Hover #991B1B
  danger: 'bg-[#B91C1C] text-[#FFFFFF] hover:bg-[#991B1B] border-0 shadow-sm',

  // Danger outline: Isi #FFFFFF, Teks #B91C1C, Tepi #B91C1C 1.5px, Hover isi #FEF2F2
  dangerOutline: 'bg-[#FFFFFF] text-[#B91C1C] border-[1.5px] border-[#B91C1C] hover:bg-[#FEF2F2]',

  // Icon button: Isi #FFFFFF, Ikon #334155, Tepi #CBD5E1 1px, Hover isi #E6EAFB
  icon: 'bg-[#FFFFFF] text-[#334155] border border-[#CBD5E1] hover:bg-[#E6EAFB]',

  // Tombol pada latar gelap (panel kiri login): Isi #FFFFFF, Teks #151B54
  inverted: 'bg-[#FFFFFF] text-[#151B54] hover:bg-[#F3F5FD] border-0 shadow-sm',

  // Ghost untuk tautan/aksi sekunder ringan
  ghost: 'bg-transparent text-[#334155] hover:bg-[#F3F5FD] hover:text-[#151B54] border-0',
};

// Disabled: Isi #E2E8F0, Teks #475569, Tepi #CBD5E1 1px, tidak ada hover (tanpa opacity!)
const DISABLED_STYLES = 'bg-[#E2E8F0] text-[#475569] border border-[#CBD5E1] cursor-not-allowed hover:bg-[#E2E8F0] shadow-none';

const SIZES = {
  sm: 'px-3 py-1.5 text-xs rounded-lg gap-1.5',
  md: 'px-4 py-2.5 text-sm rounded-lg gap-2',
  lg: 'px-5 py-3 text-base rounded-lg gap-2.5',
  iconSm: 'p-1.5 rounded-lg',
  iconMd: 'p-2 rounded-lg',
};

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  type = 'button',
  loading = false,
  disabled = false,
  icon: Icon,
  iconPosition = 'left',
  className = '',
  ...props
}) {
  const isDisabled = disabled || loading;
  const isActuallyDisabled = disabled && !loading;

  // Jika tombol benar-benar disabled (bukan karena loading), gunakan DISABLED_STYLES
  const appliedVariant = isActuallyDisabled ? DISABLED_STYLES : (VARIANTS[variant] || VARIANTS.primary);
  const sizeStyles = SIZES[size] || SIZES.md;

  return (
    <button
      type={type}
      disabled={isDisabled}
      className={`inline-flex items-center justify-center font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2B3FA8] focus-visible:ring-offset-2 select-none ${appliedVariant} ${sizeStyles} ${className}`}
      {...props}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin shrink-0" />
      ) : Icon && iconPosition === 'left' ? (
        <Icon className="w-4 h-4 shrink-0" />
      ) : null}

      {children && <span>{children}</span>}

      {!loading && Icon && iconPosition === 'right' && (
        <Icon className="w-4 h-4 shrink-0" />
      )}
    </button>
  );
}
