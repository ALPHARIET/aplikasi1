import { useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ShieldCheck, ShieldAlert, Upload, Search, FileText, Loader2, X } from 'lucide-react';
import api from '../services/api';
import DocumentDiffViewer from '../components/DocumentDiffViewer';
import BrandLogo from '../components/BrandLogo';
import Button from '../components/ui/Button';

export default function Verify() {
  const { verificationId: paramId } = useParams();
  const [verificationId, setVerificationId] = useState(paramId || '');
  const [file, setFile] = useState(null);
  const [verifiedFile, setVerifiedFile] = useState(null);
  const fileInputRef = useRef(null);

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  // Verification ID + file wajib: cocokkan hash ke blockchain + bandingkan isi dokumen
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
      setError(err.response?.data?.error || 'Verification failed. Document not found.');
    } finally {
      setLoading(false);
    }
  };

  const clearFile = () => {
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const isFormValid = !!verificationId.trim() && !!file;

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header Bersih Sebelum Revisi */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-4">
            <BrandLogo className="h-24 w-auto object-contain" />
          </div>
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">
            Document Verification
          </h1>
          <p className="mt-4 text-lg text-slate-600">
            Verify the authenticity of academic documents using our Blockchain Registry.
          </p>
        </div>

        {/* Kartu Form Verifikasi */}
        <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
          <div className="p-8">
            <form onSubmit={handleVerify} className="space-y-5">
              <div className="grid md:grid-cols-2 gap-5">
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-1.5">
                    <Search className="w-4 h-4 text-[#151B54]" />
                    Verification ID
                  </label>
                  <input
                    type="text"
                    value={verificationId}
                    onChange={(e) => setVerificationId(e.target.value)}
                    placeholder="e.g. DOC-2026-123-ABC"
                    className="block w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2B3FA8] focus:border-transparent text-sm font-mono"
                  />
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-1.5">
                    <Upload className="w-4 h-4 text-[#151B54]" />
                    Document File <span className="font-normal text-slate-400">(PDF)</span>
                  </label>
                  <div className="flex items-center gap-2 px-2 py-1.5 border border-slate-300 rounded-lg bg-white">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,image/*"
                      onChange={(e) => setFile(e.target.files[0] || null)}
                      className="block w-full min-w-0 text-sm text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[#E6EAFB] file:text-[#151B54] hover:file:bg-[#DDE1EE] cursor-pointer"
                    />
                    {file && (
                      <button
                        type="button"
                        onClick={clearFile}
                        title="Remove file"
                        className="p-1.5 rounded-lg bg-white border border-[#CBD5E1] text-[#334155] hover:bg-[#FEF2F2] hover:text-[#B91C1C] flex-shrink-0 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Tombol Verifikasi Dokumen Kontras Tinggi */}
              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full text-base font-semibold py-3.5"
                disabled={loading || !isFormValid}
                loading={loading}
                icon={ShieldCheck}
              >
                {loading ? 'Querying Blockchain...' : 'Verify Document'}
              </Button>

              <p className="text-xs text-slate-500 text-center">
                {isFormValid
                  ? 'File will be matched against the blockchain record. Any modified fields will be highlighted.'
                  : 'Fill in the Verification ID and upload the document file to verify.'}
              </p>
            </form>

            {/* State Loading */}
            {loading && (
              <div className="mt-12 flex flex-col items-center justify-center py-8">
                <Loader2 className="w-10 h-10 text-[#151B54] animate-spin mb-4" />
                <p className="text-slate-600 font-medium">Querying Blockchain...</p>
              </div>
            )}

            {/* State Error */}
            {error && !loading && (
              <div className="mt-8 bg-red-50 border border-red-200 rounded-xl p-6 flex flex-col items-center text-center">
                <ShieldAlert className="w-12 h-12 text-red-500 mb-3" />
                <h3 className="text-lg font-bold text-red-900">Verification Failed</h3>
                <p className="text-red-700 mt-1">{error}</p>
              </div>
            )}

            {/* Bagian Hasil Verifikasi */}
            {result && !loading && !error && (
              <div
                className={`mt-8 border rounded-2xl p-8 ${
                  result.isValid
                    ? 'bg-emerald-50/70 border-emerald-200'
                    : 'bg-red-50/70 border-red-200'
                }`}
              >
                {/* Header Hasil */}
                <div className="flex flex-col items-center text-center mb-8">
                  {result.isValid ? (
                    <>
                      <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4 shadow-sm">
                        <ShieldCheck className="w-10 h-10 text-emerald-600" />
                      </div>
                      <h3 className="text-2xl font-bold text-emerald-900">
                        Document is authentic and unmodified
                      </h3>
                      <p className="text-emerald-700 mt-2">
                        {result.message || 'This document has been successfully verified on the blockchain.'}
                      </p>
                    </>
                  ) : (
                    <>
                      <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4 shadow-sm">
                        <ShieldAlert className="w-10 h-10 text-red-600" />
                      </div>
                      <h3 className="text-2xl font-bold text-red-900">Verification Failed</h3>
                      <p className="text-red-700 mt-2">
                        {result.message || 'Document has been modified or is fake. Hash does not match.'}
                      </p>

                      {result.revocationReason && (
                        <div className="mt-4 p-4 bg-white/80 rounded-xl border border-red-200 text-sm text-red-800 text-left w-full max-w-md shadow-sm">
                          <strong>Reason for Revocation:</strong> {result.revocationReason}
                        </div>
                      )}

                      {result.matchedDocument && (
                        <div className="mt-5 p-5 bg-amber-50 border border-amber-300 rounded-xl text-sm text-amber-900 text-left w-full max-w-lg shadow-sm">
                          <p className="font-bold">Verification ID tidak sesuai dengan file</p>
                          <p className="mt-1">
                            File yang Anda upload adalah dokumen asli, tetapi terdaftar sebagai{' '}
                            <strong>{result.matchedDocument.docTitle}</strong> dengan Verification ID{' '}
                            <span className="font-mono break-all font-bold">
                              {result.matchedDocument.verificationId}
                            </span>.
                          </p>
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => {
                              setVerificationId(result.matchedDocument.verificationId);
                              handleVerify(null, result.matchedDocument.verificationId);
                            }}
                            className="mt-3"
                          >
                            Verifikasi dengan ID ini
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Document Details Card */}
                {result.documentInfo && (
                  <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
                    <h4 className="font-bold text-slate-900 border-b border-slate-100 pb-3 mb-4 flex items-center gap-2">
                      <FileText className="w-5 h-5 text-[#151B54]" />
                      Document Details
                    </h4>
                    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 text-sm">
                      <div>
                        <dt className="text-slate-500 font-medium">Student Name</dt>
                        <dd className="mt-1 text-slate-900 font-semibold text-base">
                          {result.documentInfo.studentName || result.documentInfo.full_name}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-slate-500 font-medium">Student ID (NIM)</dt>
                        <dd className="mt-1 text-slate-900 font-semibold text-base font-mono">
                          {result.documentInfo.studentId || result.documentInfo.student_id_number}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-slate-500 font-medium">Document Type</dt>
                        <dd className="mt-1 text-slate-900 font-semibold uppercase">
                          {result.documentInfo.docType || result.documentInfo.doc_type}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-slate-500 font-medium">Issued Date</dt>
                        <dd className="mt-1 text-slate-900 font-semibold">
                          {result.documentInfo.issuedAt || result.documentInfo.issued_at
                            ? new Date(
                                result.documentInfo.issuedAt || result.documentInfo.issued_at
                              ).toLocaleDateString('id-ID', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                              })
                            : '-'}
                        </dd>
                      </div>
                      {(result.documentInfo.txHash || result.documentInfo.tx_hash) && (
                        <div className="sm:col-span-2 pt-4 border-t border-slate-100">
                          <dt className="text-slate-500 font-medium">Blockchain Transaction Hash</dt>
                          <dd className="mt-1 text-xs font-mono text-slate-700 break-all bg-slate-50 p-2.5 rounded-lg border border-slate-200 select-all">
                            {result.documentInfo.txHash || result.documentInfo.tx_hash}
                          </dd>
                        </div>
                      )}
                    </dl>
                  </div>
                )}

                {/* Dokumen dimodifikasi -> Dokumen Diff Viewer selebar penuh */}
                {!result.isValid && result.comparison && (
                  <DocumentDiffViewer file={verifiedFile} comparison={result.comparison} />
                )}
              </div>
            )}
          </div>
        </div>

        {/* Tautan ke Admin Portal */}
        <div className="text-center text-xs text-slate-500 pt-6">
          <Link
            to="/login"
            className="text-[#151B54] hover:text-[#1E2A78] font-semibold transition-colors"
          >
            Portal Admin BlockCertify &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
}
