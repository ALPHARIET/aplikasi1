import { useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ShieldCheck,
  ShieldX,
  ArrowLeftRight,
  Ban,
  FileQuestion,
  FileText,
  Loader2,
  X,
  AlertCircle,
  ChevronRight,
} from 'lucide-react';
import api from '../services/api';
import DocumentDiffViewer from '../components/DocumentDiffViewer';
import PublicLayout from '../components/public/PublicLayout';
import { classifyResult, formatSize, validateVerifyFile } from '../utils/verifyOutcome';

const focusRing = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-unib-blue focus-visible:ring-offset-2';

// Teks Indonesia untuk tiap jenis hasil dari classifyResult
const OUTCOME_COPY = {
  valid: {
    icon: ShieldCheck,
    status: 'Valid',
    tone: 'text-pub-up',
    title: 'Transkrip asli',
    body: 'Sidik jari berkas cocok dengan catatan di blockchain, dan transkrip ini masih berlaku.',
  },
  modified: {
    icon: ShieldX,
    status: 'Tidak valid',
    tone: 'text-pub-down',
    title: 'Berkas sudah diubah',
    body: 'Sidik jari berkas tidak cocok dengan yang tercatat saat transkrip diterbitkan. Bagian yang berbeda ditandai di bawah.',
  },
  swapped: {
    icon: ArrowLeftRight,
    status: 'Perlu dicek',
    tone: 'text-[#B45309]',
    title: 'Terdaftar dengan Verification ID lain',
    body: 'Berkas ini asli, tetapi tidak tercatat dengan Verification ID yang Anda masukkan.',
  },
  revoked: {
    icon: Ban,
    status: 'Tidak valid',
    tone: 'text-pub-down',
    title: 'Transkrip sudah dicabut',
    body: 'Transkrip ini pernah diterbitkan, lalu dicabut oleh bagian akademik Universitas Bengkulu.',
  },
  unregistered: {
    icon: FileQuestion,
    status: 'Tidak ditemukan',
    tone: 'text-pub-muted',
    title: 'Verification ID tidak terdaftar',
    body: 'Tidak ada catatan untuk Verification ID ini di blockchain. Periksa lagi penulisannya, atau minta ID yang benar kepada pemilik transkrip.',
  },
};

const DOC_TYPE_LABEL = { transkrip: 'Transkrip nilai', ijazah: 'Ijazah' };

const formatDate = (value) =>
  value ? new Date(value).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' }) : '-';

function DetailRow({ label, children, mono = false, wide = false }) {
  return (
    <div className={`border-b border-pub-line py-4 ${wide ? 'sm:col-span-2' : ''}`}>
      <dt className="text-sm text-pub-muted">{label}</dt>
      <dd className={`mt-1 text-base font-semibold text-pub-ink ${mono ? 'break-all font-mono text-[13px] font-medium' : ''}`}>{children}</dd>
    </div>
  );
}

export default function Verify() {
  const { verificationId: paramId } = useParams();
  const [verificationId, setVerificationId] = useState(paramId || '');
  const [file, setFile] = useState(null);
  const [fileError, setFileError] = useState('');
  const [dragging, setDragging] = useState(false);
  const [verifiedFile, setVerifiedFile] = useState(null);
  const fileInputRef = useRef(null);

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  // Verification ID + berkas wajib: cocokkan hash ke blockchain + bandingkan isi dokumen
  const handleVerify = async (e, idOverride) => {
    e?.preventDefault();
    const id = (idOverride || verificationId).trim();
    if (!id || !file) return;

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('verificationId', id);
      formData.append('document', file);
      const response = await api.post('/documents/verify-file', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setVerifiedFile(file);
      setResult(response.data);
    } catch (err) {
      setError(
        err.response
          ? 'Pemeriksaan gagal diproses. Pastikan berkasnya PDF, JPG, atau PNG berukuran maksimal 5 MB, lalu coba lagi.'
          : 'Server pemeriksaan tidak bisa dihubungi. Periksa koneksi internet Anda, lalu coba lagi.'
      );
    } finally {
      setLoading(false);
    }
  };

  const pickFile = (picked) => {
    if (!picked) return;
    const problem = validateVerifyFile(picked);
    setFileError(problem);
    if (!problem) setFile(picked);
  };

  const clearFile = () => {
    setFile(null);
    setFileError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const isFormValid = !!verificationId.trim() && !!file;
  const outcome = result ? classifyResult(result) : null;
  const copy = outcome ? OUTCOME_COPY[outcome] : null;
  const info = result?.documentInfo;

  return (
    <PublicLayout>
      {/* Kepala halaman: navy UNIB dengan tepi miring */}
      <section className="relative overflow-hidden bg-unib-deep text-white">
        <div className="relative mx-auto max-w-[1200px] px-4 pb-40 pt-12 sm:px-6 lg:pt-16">
          <nav aria-label="Jejak navigasi" className="flex items-center gap-1.5 text-sm text-[#A8B3DA]">
            <Link to="/" className={`rounded hover:text-white ${focusRing}`}>Beranda</Link>
            <ChevronRight className="w-4 h-4" aria-hidden="true" />
            <span aria-current="page" className="text-white">Periksa dokumen</span>
          </nav>
          <h1 className="mt-6 text-[2.5rem] font-normal leading-none tracking-[-0.025em] sm:text-[3.25rem]">Periksa dokumen</h1>
          <p className="mt-5 max-w-2xl text-lg leading-normal text-[#C9D2F2]">
            Cocokkan berkas transkrip dengan catatan yang diterbitkan Universitas Bengkulu di blockchain. Tidak perlu akun.
          </p>
        </div>
        <svg aria-hidden="true" className="absolute bottom-0 left-0 h-[48px] w-full sm:h-[72px]" viewBox="0 0 1440 72" preserveAspectRatio="none">
          <polygon points="0,6 1440,62 1440,72 0,16" fill="#FBEB00" />
          <polygon points="0,16 1440,72 0,72" fill="#F7F7F7" />
        </svg>
      </section>

      <section className="bg-pub-soft pb-24">
        <div className="relative z-10 mx-auto -mt-28 max-w-4xl px-4 sm:px-6">
          {/* Formulir pemeriksaan */}
          <form onSubmit={handleVerify} className="rounded-3xl border border-pub-line bg-white p-6 shadow-soft sm:p-10">
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <label htmlFor="verification-id" className="block text-sm font-semibold text-pub-ink">
                  Verification ID
                </label>
                <input
                  id="verification-id"
                  type="text"
                  value={verificationId}
                  onChange={(e) => setVerificationId(e.target.value)}
                  placeholder="DOC-2026-G1A022001-OU6Q21"
                  autoComplete="off"
                  spellCheck={false}
                  aria-describedby="verification-id-hint"
                  className="mt-2 h-12 w-full rounded-xl border border-pub-line bg-white px-4 font-mono text-[15px] text-pub-ink placeholder:text-[#A8ACB3] focus:border-2 focus:border-unib-blue focus:px-[15px] focus:outline-none"
                />
                <p id="verification-id-hint" className="mt-2 text-sm text-pub-muted">
                  Minta kepada pemilik transkrip. Mahasiswa bisa menyalinnya di Portal Mahasiswa.
                </p>
              </div>

              <div>
                <span id="file-label" className="block text-sm font-semibold text-pub-ink">
                  Berkas transkrip
                </span>
                <input
                  ref={fileInputRef}
                  id="document-file"
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => pickFile(e.target.files[0])}
                  className="sr-only"
                  aria-labelledby="file-label"
                  aria-describedby="file-hint"
                />
                {file ? (
                  <div className="mt-2 flex h-12 items-center gap-3 rounded-xl border border-pub-line bg-pub-soft px-3">
                    <FileText className="w-5 h-5 shrink-0 text-unib-navy" aria-hidden="true" />
                    <span className="min-w-0 flex-1 truncate text-[15px] font-medium text-pub-ink" title={file.name}>{file.name}</span>
                    <span className="shrink-0 text-sm text-pub-muted">{formatSize(file.size)}</span>
                    <button
                      type="button"
                      onClick={clearFile}
                      aria-label={`Hapus berkas ${file.name}`}
                      className={`shrink-0 rounded-full p-1.5 text-pub-body hover:bg-pub-strong hover:text-pub-down ${focusRing}`}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label
                    htmlFor="document-file"
                    onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={(e) => { e.preventDefault(); setDragging(false); pickFile(e.dataTransfer.files[0]); }}
                    className={`mt-2 flex h-12 cursor-pointer items-center justify-between gap-3 rounded-xl border border-dashed px-3 transition-colors ${
                      dragging ? 'border-unib-blue bg-[#EEF3FF]' : 'border-[#C5CAD3] hover:border-unib-navy'
                    }`}
                  >
                    <span className="truncate text-[15px] text-pub-muted">Seret berkas ke sini</span>
                    <span className="shrink-0 rounded-full bg-pub-strong px-4 py-1.5 text-sm font-semibold text-pub-ink">Pilih berkas</span>
                  </label>
                )}
                <p id="file-hint" className={`mt-2 text-sm ${fileError ? 'text-pub-down' : 'text-pub-muted'}`}>
                  {fileError || 'PDF, JPG, atau PNG, maksimal 5 MB. Gunakan berkas asli, bukan hasil scan.'}
                </p>
              </div>
            </div>

            <div className="mt-8 flex flex-col gap-4 border-t border-pub-line pt-8 sm:flex-row sm:items-center">
              <button
                type="submit"
                disabled={loading || !isFormValid}
                className={`inline-flex h-14 items-center justify-center gap-2 rounded-full px-8 text-base font-semibold text-white transition-colors ${focusRing} ${
                  loading || !isFormValid ? 'cursor-not-allowed bg-[#A8B3CC]' : 'bg-unib-navy hover:bg-[#1D2F86] active:bg-unib-night'
                }`}
              >
                {loading && <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />}
                {loading ? 'Memeriksa…' : 'Periksa dokumen'}
              </button>
              <p className="text-sm text-pub-muted" aria-live="polite">
                {loading
                  ? 'Menghitung sidik jari berkas dan mencocokkannya dengan catatan di blockchain.'
                  : isFormValid
                    ? 'Kolom yang berbeda dari aslinya akan ditandai.'
                    : 'Isi Verification ID dan pilih berkasnya untuk mulai memeriksa.'}
              </p>
            </div>
          </form>

          {/* Galat permintaan */}
          {error && !loading && (
            <div role="alert" className="mt-6 flex items-start gap-3 rounded-3xl border border-pub-line bg-white p-6 sm:p-8">
              <AlertCircle className="mt-0.5 w-5 h-5 shrink-0 text-pub-down" aria-hidden="true" />
              <div>
                <h2 className="text-lg font-semibold text-pub-ink">Pemeriksaan belum bisa dilakukan</h2>
                <p className="mt-1 text-base text-pub-body">{error}</p>
              </div>
            </div>
          )}

          {/* Hasil pemeriksaan */}
          {result && copy && !loading && !error && (
            <section aria-labelledby="hasil-judul" className="mt-6 rounded-3xl border border-pub-line bg-white p-6 sm:p-10">
              <div className="flex items-start gap-5">
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-pub-strong">
                  <copy.icon className={`w-6 h-6 ${copy.tone}`} aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className={`inline-flex items-center gap-1.5 text-sm font-semibold ${copy.tone}`}>
                    <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current" />
                    {copy.status}
                  </p>
                  <h2 id="hasil-judul" className="mt-1 text-[1.75rem] font-normal leading-tight tracking-[-0.015em] text-pub-ink sm:text-[2rem]">
                    {copy.title}
                  </h2>
                  <p className="mt-2 text-base leading-normal text-pub-body">{copy.body}</p>
                </div>
              </div>

              {outcome === 'revoked' && result.revocationReason && (
                <div className="mt-6 rounded-2xl bg-pub-soft p-5">
                  <p className="text-sm text-pub-muted">Alasan pencabutan</p>
                  <p className="mt-1 text-base font-semibold text-pub-ink">{result.revocationReason}</p>
                </div>
              )}

              {outcome === 'swapped' && (
                <div className="mt-6 rounded-2xl bg-pub-soft p-5">
                  <p className="text-base text-pub-body">
                    Berkas ini tercatat sebagai <strong className="font-semibold text-pub-ink">{result.matchedDocument.docTitle}</strong> dengan
                    Verification ID <span className="break-all font-mono text-[14px] font-medium text-pub-ink">{result.matchedDocument.verificationId}</span>.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setVerificationId(result.matchedDocument.verificationId);
                      handleVerify(null, result.matchedDocument.verificationId);
                    }}
                    className={`mt-4 inline-flex h-11 items-center rounded-full bg-unib-navy px-5 text-base font-semibold text-white hover:bg-[#1D2F86] ${focusRing}`}
                  >
                    Periksa dengan ID ini
                  </button>
                </div>
              )}

              {info && (
                <div className="mt-8">
                  <h3 className="text-lg font-semibold text-pub-ink">Data transkrip terdaftar</h3>
                  <dl className="mt-2 grid gap-x-8 border-t border-pub-line sm:grid-cols-2">
                    <DetailRow label="Nama mahasiswa">{info.studentName || '-'}</DetailRow>
                    <DetailRow label="NIM" mono>{info.studentId || '-'}</DetailRow>
                    <DetailRow label="Dokumen">{info.docTitle || DOC_TYPE_LABEL[info.docType] || '-'}</DetailRow>
                    <DetailRow label="Tanggal terbit">{formatDate(info.issuedAt)}</DetailRow>
                    {info.program && <DetailRow label="Program studi">{info.program}</DetailRow>}
                    {info.faculty && <DetailRow label="Fakultas">{info.faculty}</DetailRow>}
                    {info.txHash && (
                      <DetailRow label="Hash transaksi blockchain" mono wide>
                        <span className="select-all">{info.txHash}</span>
                      </DetailRow>
                    )}
                  </dl>
                </div>
              )}

              {outcome === 'modified' && result.comparison && (
                <DocumentDiffViewer file={verifiedFile} comparison={result.comparison} />
              )}
            </section>
          )}
        </div>
      </section>
    </PublicLayout>
  );
}
