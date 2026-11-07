import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

export default function CopyText({
  text,
  displayLength = 16,
  showFull = false,
  className = '',
}) {
  const [copied, setCopied] = useState(false);

  if (!text) {
    return <span className="text-[#5B6180] text-xs font-mono">-</span>;
  }

  const handleCopy = async (e) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  const displayText = showFull
    ? text
    : text.length > displayLength
    ? `${text.slice(0, displayLength)}...`
    : text;

  return (
    <div className={`inline-flex items-center gap-2 font-mono text-xs text-[#111633] ${className}`}>
      <span title={text} className="truncate">
        {displayText}
      </span>
      <button
        type="button"
        onClick={handleCopy}
        aria-label="Salin ke clipboard"
        title={copied ? 'Tersalin!' : 'Salin ke clipboard'}
        className="p-1 rounded-md bg-white border border-[#CBD5E1] text-[#334155] hover:bg-[#E6EAFB] hover:text-[#151B54] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2B3FA8] shrink-0"
      >
        {copied ? (
          <Check className="w-3.5 h-3.5 text-emerald-600 animate-in fade-in" />
        ) : (
          <Copy className="w-3.5 h-3.5" />
        )}
      </button>
      {copied && (
        <span className="text-[10px] text-emerald-800 bg-[#DCFCE7] font-semibold px-1.5 py-0.5 rounded font-sans shadow-sm">
          Tersalin!
        </span>
      )}
    </div>
  );
}
