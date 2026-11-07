import { useEffect } from 'react';
import { AlertTriangle, AlertCircle, Info } from 'lucide-react';
import Button from './Button';

const ICONS = {
  danger: { icon: AlertTriangle, color: 'text-[#B91C1C]', bg: 'bg-[#FEE2E2]' },
  warning: { icon: AlertCircle, color: 'text-amber-600', bg: 'bg-amber-100' },
  primary: { icon: Info, color: 'text-[#151B54]', bg: 'bg-[#E6EAFB]' },
};

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Konfirmasi',
  cancelText = 'Batal',
  variant = 'danger',
  loading = false,
  children,
  maxWidth = 'max-w-md',
}) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen && !loading) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, loading]);

  if (!isOpen) return null;

  const cfg = ICONS[variant] || ICONS.danger;
  const Icon = cfg.icon;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="min-h-full flex items-center justify-center p-4 text-center">
        {/* Backdrop */}
        <div
          onClick={loading ? undefined : onClose}
          aria-hidden="true"
          className="fixed inset-0 bg-[#0B0F33]/50 backdrop-blur-[2px] transition-opacity"
        />

        <div
          className={`relative bg-white rounded-xl border border-[#E3E6F0] shadow-2xl p-6 w-full ${maxWidth} text-left transition-all`}
          role="dialog"
          aria-modal="true"
        >
          <div className="flex items-start gap-4 mb-4">
            <div className={`p-2.5 rounded-xl ${cfg.bg} ${cfg.color} shrink-0`}>
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#111633]">{title}</h3>
              {description && (
                <p className="text-xs text-[#5B6180] mt-1 leading-relaxed">{description}</p>
              )}
            </div>
          </div>

          {children && <div className="mb-5">{children}</div>}

          <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-[#E3E6F0]">
            <Button
              variant="secondary"
              size="md"
              onClick={onClose}
              disabled={loading}
            >
              {cancelText}
            </Button>
            <Button
              variant={variant === 'warning' ? 'danger' : variant}
              size="md"
              onClick={onConfirm}
              loading={loading}
            >
              {confirmText}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
