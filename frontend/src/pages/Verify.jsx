import { useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ShieldCheck, ShieldAlert, Upload, Search, FileText, Loader2, X } from 'lucide-react';
import api from '../services/api';
import DocumentDiffViewer from '../components/DocumentDiffViewer';

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
        headers: { 'Content-Type': 'multipart/form-data' }
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

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">

        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-indigo-100 mb-4">
            <ShieldCheck className="w-8 h-8 text-indigo-600" />
          </div>
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">Document Verification</h1>
          <p className="mt-4 text-lg text-slate-600">
            Verify the authenticity of academic documents using our Blockchain Registry.
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
          <div className="p-8">

            <form onSubmit={handleVerify} className="space-y-5">
              <div className="grid md:grid-cols-2 gap-5">
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-1.5">
                    <Search className="w-4 h-4 text-indigo-600" />
                    Verification ID
                  </label>
                  <input
                    type="text"
                    value={verificationId}
                    onChange={(e) => setVerificationId(e.target.value)}
                    placeholder="e.g. DOC-2026-123-ABC"
                    className="block w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-transparent text-sm"
                  />
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-1.5">
                    <Upload className="w-4 h-4 text-indigo-600" />
                    Document File <span className="font-normal text-slate-400">(PDF)</span>
                  </label>
                  <div className="flex items-center gap-2 px-2 py-1.5 border border-slate-300 rounded-lg bg-white">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,image/*"
                      onChange={(e) => setFile(e.target.files[0] || null)}
                      className="block w-full min-w-0 text-sm text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-100 file:text-indigo-700 hover:file:bg-indigo-200 cursor-pointer"
                    />
                    {file && (
                      <button
                        type="button"
                        onClick={clearFile}
                        title="Remove file"
                        className="p-1 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 flex-shrink-0"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !verificationId.trim() || !file}
                className="w-full flex justify-center items-center gap-2 py-3 px-4 rounded-lg text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                <ShieldCheck className="w-4 h-4" />
                Verify Document
              </button>
              <p className="text-xs text-slate-500 text-center">
                {verificationId.trim() && file
                  ? 'File will be matched against the blockchain record. Any modified fields will be highlighted.'
                  : 'Fill in the Verification ID and upload the document file to verify.'}
              </p>
            </form>

            {/* Results Section */}
            {loading && (
              <div className="mt-12 flex flex-col items-center justify-center py-8">
                <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mb-4" />
                <p className="text-slate-500">Querying Blockchain...</p>
              </div>
            )}

            {error && (
              <div className="mt-8 bg-red-50 border border-red-200 rounded-xl p-6 flex flex-col items-center text-center">
                <ShieldAlert className="w-12 h-12 text-red-500 mb-3" />
                <h3 className="text-lg font-bold text-red-900">Verification Failed</h3>
                <p className="text-red-700 mt-1">{error}</p>
              </div>
            )}

            {result && !loading && !error && (
              <div className={`mt-8 border rounded-xl p-8 ${result.isValid ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                <div className="flex flex-col items-center text-center mb-8">
                  {result.isValid ? (
                    <>
                      <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
                        <ShieldCheck className="w-10 h-10 text-emerald-600" />
                      </div>
                      <h3 className="text-2xl font-bold text-emerald-900">Document is Authentic!</h3>
                      <p className="text-emerald-700 mt-2">
                        {result.message || 'This document has been successfully verified on the blockchain.'}
                      </p>
                    </>
                  ) : (
                    <>
                      <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                        <ShieldAlert className="w-10 h-10 text-red-600" />
                      </div>
                      <h3 className="text-2xl font-bold text-red-900">Verification Failed</h3>
                      <p className="text-red-700 mt-2">
                        {result.message || 'This document is invalid, has been modified, or was revoked.'}
                      </p>
                      {result.revocationReason && (
                        <div className="mt-4 p-4 bg-white/50 rounded-lg text-sm text-red-800 text-left w-full max-w-md">
                          <strong>Reason for Revocation:</strong> {result.revocationReason}
                        </div>
                      )}
                      {result.matchedDocument && (
                        <div className="mt-5 p-5 bg-amber-50 border border-amber-300 rounded-xl text-sm text-amber-900 text-left w-full max-w-lg">
                          <p className="font-bold">Verification ID tidak sesuai dengan file</p>
                          <p className="mt-1">
                            File yang Anda upload adalah dokumen asli, tetapi terdaftar sebagai{' '}
                            <strong>{result.matchedDocument.docTitle}</strong> dengan Verification ID{' '}
                            <span className="font-mono break-all">{result.matchedDocument.verificationId}</span>.
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              setVerificationId(result.matchedDocument.verificationId);
                              handleVerify(null, result.matchedDocument.verificationId);
                            }}
                            className="mt-3 px-4 py-2 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 transition-colors"
                          >
                            Verifikasi dengan ID ini
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {result.documentInfo && (
                  <div className="bg-white rounded-lg p-6 shadow-sm border border-slate-100">
                    <h4 className="font-bold text-slate-900 border-b border-slate-100 pb-3 mb-4 flex items-center gap-2">
                      <FileText className="w-5 h-5 text-indigo-600" />
                      Document Details
                    </h4>
                    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 text-sm">
                      <div>
                        <dt className="text-slate-500 font-medium">Student Name</dt>
                        <dd className="mt-1 text-slate-900 font-semibold">{result.documentInfo.studentName || result.documentInfo.full_name}</dd>
                      </div>
                      <div>
                        <dt className="text-slate-500 font-medium">Student ID (NIM)</dt>
                        <dd className="mt-1 text-slate-900 font-semibold">{result.documentInfo.studentId || result.documentInfo.student_id_number}</dd>
                      </div>
                      <div>
                        <dt className="text-slate-500 font-medium">Document Type</dt>
                        <dd className="mt-1 text-slate-900 font-semibold uppercase">{result.documentInfo.docType || result.documentInfo.doc_type}</dd>
                      </div>
                      <div>
                        <dt className="text-slate-500 font-medium">Issued Date</dt>
                        <dd className="mt-1 text-slate-900 font-semibold">
                          {result.documentInfo.issuedAt || result.documentInfo.issued_at
                            ? new Date(result.documentInfo.issuedAt || result.documentInfo.issued_at).toLocaleDateString('id-ID', {
                                year: 'numeric', month: 'long', day: 'numeric'
                              })
                            : '-'}
                        </dd>
                      </div>
                      {(result.documentInfo.txHash || result.documentInfo.tx_hash) && (
                        <div className="sm:col-span-2 pt-4 border-t border-slate-50">
                          <dt className="text-slate-500 font-medium">Blockchain Transaction Hash</dt>
                          <dd className="mt-1 text-xs font-mono text-slate-600 break-all bg-slate-50 p-2 rounded border border-slate-100">
                            {result.documentInfo.txHash || result.documentInfo.tx_hash}
                          </dd>
                        </div>
                      )}
                    </dl>
                  </div>
                )}

                {/* Dokumen dimodifikasi → tandai field yang berbeda dari dokumen asli */}
                {!result.isValid && result.comparison && (
                  <DocumentDiffViewer file={verifiedFile} comparison={result.comparison} />
                )}

              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
