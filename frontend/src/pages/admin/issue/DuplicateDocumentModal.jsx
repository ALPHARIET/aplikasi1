import { AlertTriangle, Loader2, ShieldOff, X } from 'lucide-react';

// Muncul kalau mahasiswa sudah punya transkrip aktif: cabut yang lama lalu terbitkan, atau batal
export default function DuplicateDocumentModal({ doc, revoking, onRevokeAndIssue, onCancel }) {
  return (
    <div className="fixed inset-0 bg-brand-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-surface rounded-xl shadow-2xl max-w-md w-full p-6 border border-border">
        <div className="flex items-start gap-3.5 mb-4">
          <div className="p-2.5 bg-amber-100 text-amber-700 rounded-xl shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-brand-900">
              Mahasiswa Sudah Memiliki Transkrip Aktif
            </h3>
            <p className="text-xs text-muted mt-1 leading-relaxed">
              Mahasiswa ini telah memiliki dokumen aktif di blockchain. Sistem tidak mengizinkan lebih dari satu dokumen aktif untuk mahasiswa yang sama.
            </p>
          </div>
        </div>

        <div className="bg-canvas border border-border rounded-lg p-3.5 mb-5 space-y-1.5 text-xs">
          <p className="text-[11px] font-semibold text-muted uppercase tracking-wider mb-1">
            Dokumen yang Sudah Ada:
          </p>
          <div className="flex justify-between">
            <span className="text-muted">Verification ID:</span>
            <span className="font-mono font-medium text-ink">{doc.verification_id}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">Judul:</span>
            <span className="font-medium text-ink">{doc.doc_title}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">Tanggal Terbit:</span>
            <span className="font-medium text-ink">
              {doc.issued_at
                ? new Date(doc.issued_at).toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })
                : '-'}
            </span>
          </div>
        </div>

        <p className="text-xs font-semibold text-ink mb-3">Pilih tindakan:</p>

        <div className="space-y-3">
          <button
            type="button"
            onClick={onRevokeAndIssue}
            disabled={revoking}
            className="w-full flex items-start gap-3 p-3.5 border-[1.5px] border-[#B91C1C] rounded-xl bg-[#FEF2F2] hover:bg-red-100 text-left transition-colors disabled:opacity-50"
          >
            <div className="p-1.5 bg-red-100 text-[#B91C1C] rounded-md shrink-0 mt-0.5">
              {revoking ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldOff className="w-4 h-4" />}
            </div>
            <div>
              <p className="font-bold text-[#B91C1C] text-xs">
                {revoking ? 'Memproses pencabutan...' : 'Cabut Dokumen Lama & Terbitkan yang Baru'}
              </p>
              <p className="text-[11px] text-red-700 mt-0.5 font-medium">
                Dokumen sebelumnya akan dicabut secara permanen di blockchain, lalu dokumen baru langsung diterbitkan.
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={onCancel}
            disabled={revoking}
            className="w-full flex items-start gap-3 p-3.5 border-[1.5px] border-[#151B54] rounded-xl bg-white hover:bg-[#F3F5FD] text-left transition-colors"
          >
            <div className="p-1.5 bg-[#E6EAFB] text-[#151B54] rounded-md shrink-0 mt-0.5">
              <X className="w-4 h-4" />
            </div>
            <div>
              <p className="font-bold text-[#151B54] text-xs">Batalkan Penerbitan</p>
              <p className="text-[11px] text-[#5B6180] mt-0.5">
                Kembali ke formulir tanpa melakukan perubahan apapun.
              </p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
