import { CheckCircle2 } from 'lucide-react';
import CopyText from '../../../components/ui/CopyText';

// Pemberitahuan setelah dokumen tercatat di blockchain
export default function IssuedSuccessBanner({ issued }) {
  return (
    <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-xl space-y-3">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
          <CheckCircle2 className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-emerald-900">
            Dokumen Berhasil Diterbitkan ke Blockchain!
          </h3>
          <p className="text-xs text-emerald-700">
            Dokumen "{issued.docTitle}" telah dicatat secara permanen dan sah.
          </p>
        </div>
      </div>
      <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        <div className="p-3 bg-white rounded-lg border border-emerald-100">
          <span className="text-[11px] text-muted block mb-1">Verification ID</span>
          <CopyText text={issued.verificationId} showFull />
        </div>
        <div className="p-3 bg-white rounded-lg border border-emerald-100">
          <span className="text-[11px] text-muted block mb-1">TX Hash (Transaksi Blockchain)</span>
          <CopyText text={issued.txHash} showFull />
        </div>
      </div>
    </div>
  );
}
