import { CheckCircle2, FileCheck } from 'lucide-react';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';

// Kolom kanan: ringkasan isian dan tombol terbitkan
export default function IssueSummaryCard({ student, docTitle, file, transcriptData, isFormValid, loading }) {
  return (
    <Card>
      <h3 className="text-base font-semibold text-brand-900 border-b border-border pb-3 mb-4">
        Ringkasan Penerbitan
      </h3>

      <div className="space-y-3.5 text-xs">
        <div>
          <span className="text-muted block text-[11px] uppercase tracking-wider mb-0.5">
            Mahasiswa Terpilih
          </span>
          {student ? (
            <div>
              <span className="font-semibold text-ink block">
                {student.full_name}
              </span>
              <span className="font-mono text-muted text-[11px]">
                {student.student_id_number}
              </span>
            </div>
          ) : (
            <span className="text-muted italic">Belum dipilih</span>
          )}
        </div>

        <div>
          <span className="text-muted block text-[11px] uppercase tracking-wider mb-0.5">
            Jenis Dokumen
          </span>
          <span className="font-semibold text-brand-900">
            Transkrip Nilai
          </span>
        </div>

        <div>
          <span className="text-muted block text-[11px] uppercase tracking-wider mb-0.5">
            Judul Dokumen
          </span>
          <span className="font-medium text-ink">
            {docTitle || <span className="text-muted italic">Belum diisi</span>}
          </span>
        </div>

        <div>
          <span className="text-muted block text-[11px] uppercase tracking-wider mb-0.5">
            Berkas
          </span>
          {file ? (
            <div className="flex items-center gap-1.5 text-emerald-700">
              <FileCheck className="w-4 h-4 shrink-0" />
              <span className="truncate font-medium">{file.name}</span>
            </div>
          ) : (
            <span className="text-muted italic">Belum dipilih</span>
          )}
        </div>

        <div className="pt-2 border-t border-border grid grid-cols-2 gap-2 text-[11px]">
          <div>
            <span className="text-muted block">Total SKS:</span>
            <span className="font-semibold text-ink">
              {transcriptData.totalSks || '-'}
            </span>
          </div>
          <div>
            <span className="text-muted block">IPK:</span>
            <span className="font-semibold text-ink">
              {transcriptData.ipk || '-'}
            </span>
          </div>
          <div className="col-span-2">
            <span className="text-muted block">Jumlah Mata Kuliah:</span>
            <span className="font-semibold text-ink">
              {transcriptData.courses.length} MK
            </span>
          </div>
        </div>
      </div>

      <div className="pt-5 mt-5 border-t border-border">
        <Button
          type="submit"
          variant="primary"
          size="md"
          className="w-full"
          disabled={!isFormValid || loading}
          loading={loading}
          icon={CheckCircle2}
        >
          {loading ? 'Menerbitkan ke Blockchain...' : 'Terbitkan Dokumen'}
        </Button>

        {!isFormValid && (
          <p className="text-[11px] text-muted text-center mt-2">
            Lengkapi mahasiswa, berkas, dan judul dokumen untuk menerbitkan.
          </p>
        )}
      </div>
    </Card>
  );
}
