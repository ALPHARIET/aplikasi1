import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { ShieldCheck, ShieldAlert, Upload, Search, FileText, Loader2, AlertTriangle, ClipboardList, GitCompareArrows } from 'lucide-react';
import api from '../services/api';

// Komponen untuk menampilkan data transkrip asli (read-only)
const TranscriptDataView = ({ data, title, icon }) => {
  if (!data) return null;

  return (
    <div className="mt-6 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
        <h4 className="font-bold text-slate-900 flex items-center gap-2">
          {icon}
          {title}
        </h4>
      </div>
      <div className="p-6 space-y-4">
        {/* Header Info */}
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div className="bg-slate-50 rounded-lg p-3">
            <dt className="text-slate-500 text-xs font-medium">Tahun Masuk</dt>
            <dd className="mt-1 text-slate-900 font-semibold">{data.tahunMasuk || '-'}</dd>
          </div>
          <div className="bg-slate-50 rounded-lg p-3">
            <dt className="text-slate-500 text-xs font-medium">Total SKS</dt>
            <dd className="mt-1 text-slate-900 font-semibold">{data.totalSks || '-'}</dd>
          </div>
          <div className="bg-slate-50 rounded-lg p-3">
            <dt className="text-slate-500 text-xs font-medium">IPK</dt>
            <dd className="mt-1 text-slate-900 font-semibold">{data.ipk || '-'}</dd>
          </div>
        </div>

        {/* Tabel Mata Kuliah */}
        {data.courses && data.courses.length > 0 && (
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-2.5 text-left font-medium text-xs">No</th>
                  <th className="px-4 py-2.5 text-left font-medium text-xs">Kode MK</th>
                  <th className="px-4 py-2.5 text-left font-medium text-xs">Nama Mata Kuliah</th>
                  <th className="px-4 py-2.5 text-left font-medium text-xs">SKS</th>
                  <th className="px-4 py-2.5 text-left font-medium text-xs">Nilai</th>
                  <th className="px-4 py-2.5 text-left font-medium text-xs">Semester</th>
                </tr>
              </thead>
              <tbody>
                {data.courses.map((c, i) => (
                  <tr key={i} className="border-t border-slate-100 hover:bg-slate-50/50">
                    <td className="px-4 py-2.5 text-slate-500">{i + 1}</td>
                    <td className="px-4 py-2.5 font-mono text-xs">{c.kodeMk}</td>
                    <td className="px-4 py-2.5">{c.namaMk}</td>
                    <td className="px-4 py-2.5">{c.sks}</td>
                    <td className="px-4 py-2.5 font-semibold">{c.nilai}</td>
                    <td className="px-4 py-2.5">{c.semester}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

// Komponen Comparison Mode — input data dari dokumen yang dicurigakan & bandingkan
const TranscriptComparison = ({ originalData }) => {
  const [compareMode, setCompareMode] = useState(false);
  const [inputData, setInputData] = useState({
    totalSks: '',
    ipk: '',
    tahunMasuk: '',
    courses: originalData?.courses?.map(() => ({ kodeMk: '', namaMk: '', sks: '', nilai: '' })) || []
  });
  const [comparisonResult, setComparisonResult] = useState(null);

  if (!originalData || !originalData.courses || originalData.courses.length === 0) return null;

  const updateCourseInput = (index, field, value) => {
    setInputData(prev => ({
      ...prev,
      courses: prev.courses.map((c, i) => i === index ? { ...c, [field]: value } : c)
    }));
  };

  const runComparison = () => {
    const diffs = {
      header: {},
      courses: [],
      totalDiffs: 0
    };

    // Bandingkan header fields
    if (inputData.totalSks && String(inputData.totalSks) !== String(originalData.totalSks)) {
      diffs.header.totalSks = true;
      diffs.totalDiffs++;
    }
    if (inputData.ipk && String(inputData.ipk) !== String(originalData.ipk)) {
      diffs.header.ipk = true;
      diffs.totalDiffs++;
    }
    if (inputData.tahunMasuk && inputData.tahunMasuk !== String(originalData.tahunMasuk || '')) {
      diffs.header.tahunMasuk = true;
      diffs.totalDiffs++;
    }

    // Bandingkan mata kuliah field-by-field
    originalData.courses.forEach((origCourse, i) => {
      const inputCourse = inputData.courses[i] || {};
      const courseDiff = {};
      let hasDiff = false;

      if (inputCourse.kodeMk && inputCourse.kodeMk.trim().toUpperCase() !== (origCourse.kodeMk || '').trim().toUpperCase()) {
        courseDiff.kodeMk = true;
        diffs.totalDiffs++;
        hasDiff = true;
      }
      if (inputCourse.namaMk && inputCourse.namaMk.trim().toLowerCase() !== (origCourse.namaMk || '').trim().toLowerCase()) {
        courseDiff.namaMk = true;
        diffs.totalDiffs++;
        hasDiff = true;
      }
      if (inputCourse.sks && String(inputCourse.sks) !== String(origCourse.sks)) {
        courseDiff.sks = true;
        diffs.totalDiffs++;
        hasDiff = true;
      }
      if (inputCourse.nilai && inputCourse.nilai.trim().toUpperCase() !== (origCourse.nilai || '').trim().toUpperCase()) {
        courseDiff.nilai = true;
        diffs.totalDiffs++;
        hasDiff = true;
      }

      diffs.courses.push({ hasDiff, fields: courseDiff });
    });

    setComparisonResult(diffs);
  };

  // Helper: CSS class untuk field yang berbeda vs cocok
  const getDiffClass = (isDiff, hasValue) => {
    if (!hasValue) return 'border-slate-200 bg-white'; // Belum diisi
    if (isDiff) return 'border-red-500 bg-red-50 ring-2 ring-red-200'; // Berbeda — kotak merah!
    return 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-200'; // Cocok — kotak hijau
  };

  // Helper: CSS class untuk baris tabel yang berbeda
  const getRowDiffClass = (courseDiff) => {
    if (!courseDiff || !comparisonResult) return '';
    if (courseDiff.hasDiff) return 'bg-red-50/70';
    return '';
  };

  if (!compareMode) {
    return (
      <div className="mt-4 text-center">
        <button
          onClick={() => setCompareMode(true)}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-50 text-amber-800 border border-amber-200 rounded-xl text-sm font-medium hover:bg-amber-100 transition-colors"
        >
          <GitCompareArrows className="w-4 h-4" />
          Bandingkan dengan Data di Dokumen Anda
        </button>
        <p className="text-xs text-slate-400 mt-2">Input data dari dokumen yang Anda miliki untuk melihat perbedaan field-by-field</p>
      </div>
    );
  }

  return (
    <div className="mt-6 bg-white rounded-xl border-2 border-amber-300 shadow-lg overflow-hidden">
      <div className="px-6 py-4 bg-amber-50 border-b border-amber-200">
        <h4 className="font-bold text-amber-900 flex items-center gap-2">
          <GitCompareArrows className="w-5 h-5 text-amber-600" />
          Mode Perbandingan — Input Data dari Dokumen Anda
        </h4>
        <p className="text-xs text-amber-700 mt-1">
          Masukkan data yang tertera di dokumen yang Anda miliki. Field yang <span className="font-bold text-red-600">berbeda</span> akan ditandai merah.
        </p>
      </div>

      <div className="p-6 space-y-5">
        {/* Comparison Summary */}
        {comparisonResult && (
          <div className={`rounded-lg p-4 flex items-center gap-3 ${comparisonResult.totalDiffs > 0 ? 'bg-red-50 border-2 border-red-300' : 'bg-emerald-50 border-2 border-emerald-300'}`}>
            {comparisonResult.totalDiffs > 0 ? (
              <>
                <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0" />
                <div>
                  <p className="font-bold text-red-900">
                    ⚠️ Ditemukan {comparisonResult.totalDiffs} perbedaan!
                  </p>
                  <p className="text-sm text-red-700">
                    Dokumen telah dimodifikasi. Field yang berbeda ditandai dengan kotak merah.
                  </p>
                </div>
              </>
            ) : (
              <>
                <ShieldCheck className="w-6 h-6 text-emerald-600 flex-shrink-0" />
                <div>
                  <p className="font-bold text-emerald-900">
                    ✅ Semua field yang diinput cocok dengan data asli.
                  </p>
                </div>
              </>
            )}
          </div>
        )}

        {/* Header Comparison */}
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              Tahun Masuk <span className="text-slate-400">(Asli: {originalData.tahunMasuk || '-'})</span>
            </label>
            <input
              type="text" placeholder="Masukkan tahun masuk"
              value={inputData.tahunMasuk}
              onChange={e => setInputData({ ...inputData, tahunMasuk: e.target.value })}
              className={`w-full p-2.5 border-2 rounded-lg text-sm transition-all ${getDiffClass(comparisonResult?.header?.tahunMasuk, inputData.tahunMasuk)}`}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              Total SKS <span className="text-slate-400">(Asli: {originalData.totalSks || '-'})</span>
            </label>
            <input
              type="number" placeholder="Total SKS"
              value={inputData.totalSks}
              onChange={e => setInputData({ ...inputData, totalSks: e.target.value })}
              className={`w-full p-2.5 border-2 rounded-lg text-sm transition-all ${getDiffClass(comparisonResult?.header?.totalSks, inputData.totalSks)}`}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              IPK <span className="text-slate-400">(Asli: {originalData.ipk || '-'})</span>
            </label>
            <input
              type="number" step="0.01" placeholder="IPK"
              value={inputData.ipk}
              onChange={e => setInputData({ ...inputData, ipk: e.target.value })}
              className={`w-full p-2.5 border-2 rounded-lg text-sm transition-all ${getDiffClass(comparisonResult?.header?.ipk, inputData.ipk)}`}
            />
          </div>
        </div>

        {/* Tabel Perbandingan Mata Kuliah */}
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-3 py-2.5 text-left font-medium text-xs w-8">No</th>
                <th className="px-3 py-2.5 text-left font-medium text-xs">
                  Kode MK <span className="text-slate-400 font-normal">(Asli)</span>
                </th>
                <th className="px-3 py-2.5 text-left font-medium text-xs">
                  Kode MK <span className="text-amber-500 font-normal">(Dokumen Anda)</span>
                </th>
                <th className="px-3 py-2.5 text-left font-medium text-xs">
                  Nama MK <span className="text-amber-500 font-normal">(Dokumen Anda)</span>
                </th>
                <th className="px-3 py-2.5 text-left font-medium text-xs w-20">
                  SKS <span className="text-amber-500 font-normal">(Anda)</span>
                </th>
                <th className="px-3 py-2.5 text-left font-medium text-xs w-20">
                  Nilai <span className="text-amber-500 font-normal">(Anda)</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {originalData.courses.map((origCourse, idx) => {
                const courseDiff = comparisonResult?.courses?.[idx];
                return (
                  <tr key={idx} className={`border-t border-slate-100 ${getRowDiffClass(courseDiff)}`}>
                    <td className="px-3 py-2 text-slate-400 text-xs">{idx + 1}</td>
                    {/* Kolom asli */}
                    <td className="px-3 py-2">
                      <div className="text-xs">
                        <span className="font-mono text-slate-700">{origCourse.kodeMk}</span>
                        <br />
                        <span className="text-slate-400">{origCourse.namaMk}</span>
                        <span className="text-slate-300 ml-1">| SKS: {origCourse.sks} | Nilai: {origCourse.nilai}</span>
                      </div>
                    </td>
                    {/* Kolom input */}
                    <td className="px-2 py-1.5">
                      <input type="text" placeholder={origCourse.kodeMk}
                        value={inputData.courses[idx]?.kodeMk || ''}
                        onChange={e => updateCourseInput(idx, 'kodeMk', e.target.value)}
                        className={`w-full p-1.5 border-2 rounded text-xs transition-all ${getDiffClass(courseDiff?.fields?.kodeMk, inputData.courses[idx]?.kodeMk)}`}
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <input type="text" placeholder={origCourse.namaMk}
                        value={inputData.courses[idx]?.namaMk || ''}
                        onChange={e => updateCourseInput(idx, 'namaMk', e.target.value)}
                        className={`w-full p-1.5 border-2 rounded text-xs transition-all ${getDiffClass(courseDiff?.fields?.namaMk, inputData.courses[idx]?.namaMk)}`}
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <input type="number" placeholder={String(origCourse.sks)}
                        value={inputData.courses[idx]?.sks || ''}
                        onChange={e => updateCourseInput(idx, 'sks', e.target.value)}
                        className={`w-full p-1.5 border-2 rounded text-xs transition-all ${getDiffClass(courseDiff?.fields?.sks, inputData.courses[idx]?.sks)}`}
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <input type="text" placeholder={origCourse.nilai}
                        value={inputData.courses[idx]?.nilai || ''}
                        onChange={e => updateCourseInput(idx, 'nilai', e.target.value)}
                        className={`w-full p-1.5 border-2 rounded text-xs transition-all ${getDiffClass(courseDiff?.fields?.nilai, inputData.courses[idx]?.nilai)}`}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Tombol Bandingkan */}
        <div className="flex gap-3">
          <button
            onClick={runComparison}
            className="flex-1 flex justify-center items-center gap-2 py-3 bg-amber-600 text-white rounded-xl font-bold hover:bg-amber-700 transition-colors shadow-sm"
          >
            <GitCompareArrows className="w-5 h-5" />
            Bandingkan Sekarang
          </button>
          <button
            onClick={() => { setCompareMode(false); setComparisonResult(null); }}
            className="px-4 py-3 text-slate-600 bg-slate-100 rounded-xl font-medium hover:bg-slate-200 transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};


export default function Verify() {
  const { verificationId: paramId } = useParams();
  const [verificationId, setVerificationId] = useState(paramId || '');
  const [file, setFile] = useState(null);
  
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleVerifyById = async (e) => {
    e.preventDefault();
    if (!verificationId) return;
    
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await api.get(`/documents/verify/${verificationId}`);
      setResult(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Verification failed. Document not found.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyByFile = async (e) => {
    e.preventDefault();
    if (!verificationId || !file) {
      setError('Both Verification ID and File are required for strict verification.');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    const formData = new FormData();
    formData.append('verificationId', verificationId);
    formData.append('document', file);

    try {
      const response = await api.post('/documents/verify-file', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setResult(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Verification failed.');
    } finally {
      setLoading(false);
    }
  };

  // Cek apakah dokumen adalah transkrip
  const isTranskrip = result?.documentInfo?.docType === 'transkrip' || result?.documentInfo?.doc_type === 'transkrip';

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
            
            {/* Tabs / Options */}
            <div className="grid md:grid-cols-2 gap-8">
              
              {/* Option 1: By ID */}
              <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
                <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <Search className="w-5 h-5 text-indigo-600" />
                  Quick Check
                </h3>
                <form onSubmit={handleVerifyById} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Verification ID</label>
                    <input
                      type="text"
                      value={verificationId}
                      onChange={(e) => setVerificationId(e.target.value)}
                      placeholder="e.g. DOC-2026-123-ABC"
                      className="block w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-transparent text-sm"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading || !verificationId}
                    className="w-full flex justify-center py-2.5 px-4 rounded-lg text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 transition-colors"
                  >
                    Check Status
                  </button>
                </form>
              </div>

              {/* Option 2: By File */}
              <div className="bg-indigo-50 p-6 rounded-xl border border-indigo-100">
                <h3 className="text-lg font-bold text-indigo-900 mb-4 flex items-center gap-2">
                  <Upload className="w-5 h-5 text-indigo-600" />
                  Strict Verification (File)
                </h3>
                <form onSubmit={handleVerifyByFile} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-indigo-900 mb-1">Upload Document File (PDF)</label>
                    <input
                      type="file"
                      accept=".pdf,image/*"
                      onChange={(e) => setFile(e.target.files[0])}
                      className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-100 file:text-indigo-700 hover:file:bg-indigo-200 cursor-pointer"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading || !verificationId || !file}
                    className="w-full flex justify-center py-2.5 px-4 rounded-lg text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                  >
                    Verify Exact Match
                  </button>
                </form>
              </div>

            </div>

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

                {/* ============================================= */}
                {/* TRANSKRIP: Tampilkan Data Asli + Comparison    */}
                {/* ============================================= */}
                
                {/* Jika dokumen valid & bertipe transkrip → tampilkan data transkrip asli */}
                {result.isValid && isTranskrip && result.originalTranscriptData && (
                  <TranscriptDataView 
                    data={result.originalTranscriptData} 
                    title="📋 Data Transkrip (Terverifikasi)"
                    icon={<ClipboardList className="w-5 h-5 text-emerald-600" />}
                  />
                )}

                {/* Jika dokumen TIDAK valid & bertipe transkrip → tampilkan data asli + comparison mode */}
                {!result.isValid && isTranskrip && result.originalTranscriptData && (
                  <>
                    {/* Peringatan khusus transkrip */}
                    <div className="mt-6 bg-amber-50 border-2 border-amber-300 rounded-xl p-5 flex items-start gap-4">
                      <AlertTriangle className="w-7 h-7 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-bold text-amber-900 text-lg">⚠️ Dokumen Transkrip Telah Dimodifikasi</h4>
                        <p className="text-sm text-amber-800 mt-1">
                          File yang diupload <strong>berbeda dari file asli</strong> yang terdaftar di blockchain. 
                          Di bawah ini adalah data konten transkrip yang <strong>asli dan sah</strong> sebagai referensi.
                        </p>
                        <p className="text-sm text-amber-700 mt-2">
                          Gunakan fitur <strong>"Bandingkan"</strong> di bawah untuk melihat field mana yang berbeda.
                        </p>
                      </div>
                    </div>

                    {/* Data Asli */}
                    <TranscriptDataView 
                      data={result.originalTranscriptData}
                      title="📋 Data Transkrip Asli (Referensi Sah)"
                      icon={<ClipboardList className="w-5 h-5 text-indigo-600" />}
                    />

                    {/* Mode Perbandingan */}
                    <TranscriptComparison originalData={result.originalTranscriptData} />
                  </>
                )}
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
