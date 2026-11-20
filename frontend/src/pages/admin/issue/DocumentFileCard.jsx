import { File, Upload, X } from 'lucide-react';
import Card, { CardHeader } from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import { formatFileSize } from './issueForm';

// Kartu 2: pilih berkas dokumen yang akan diterbitkan
export default function DocumentFileCard({ file, fileInputRef, onFileChange, onClear }) {
  return (
    <Card>
      <CardHeader
        title="2. Berkas Dokumen"
        description="Unggah salinan dokumen dalam format PDF atau gambar resolusi tinggi."
      />

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,image/*"
        onChange={onFileChange}
        className="hidden"
        id="file-upload-input"
      />

      {!file ? (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-border hover:border-brand-500 rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer bg-canvas/40 hover:bg-brand-50/50 transition-colors"
        >
          <div className="w-12 h-12 rounded-xl bg-brand-100 text-brand-600 flex items-center justify-center mb-3">
            <Upload className="w-6 h-6" />
          </div>
          <p className="text-sm font-semibold text-brand-900">
            Klik untuk memilih berkas atau seret berkas ke sini
          </p>
          <p className="text-xs text-muted mt-1">Format PDF atau gambar (JPG, PNG)</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="p-4 bg-brand-50/60 border border-brand-100 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-lg bg-brand-100 text-brand-700 flex items-center justify-center shrink-0">
                <File className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-brand-900 truncate">
                  {file.name}
                </p>
                <p className="text-[11px] text-muted">
                  {formatFileSize(file.size)} • {file.type || 'Dokumen'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
              >
                Ganti
              </Button>
              <button
                type="button"
                onClick={onClear}
                aria-label="Hapus berkas"
                className="p-1.5 rounded-lg bg-white border border-[#CBD5E1] text-[#334155] hover:bg-[#FEF2F2] hover:text-[#B91C1C] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B91C1C]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      <p className="text-xs text-muted mt-3">
        Isi transkrip dibaca langsung dari berkas ini. Sidik jari berkas (hash SHA-256) dicatat
        permanen di blockchain, jadi pastikan berkasnya sudah final.
      </p>
    </Card>
  );
}
