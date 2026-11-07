import { useState, useEffect, useRef } from 'react';
import {
  Upload,
  ScanLine,
  PlusCircle,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  FileCheck,
  X,
  File,
  Loader2,
  ShieldOff,
} from 'lucide-react';
import api from '../../services/api';
import PageHeader from '../../components/ui/PageHeader';
import Card, { CardHeader } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { Input, Select } from '../../components/ui/Input';
import CopyText from '../../components/ui/CopyText';

const DOCUMENT_TYPE = 'transkrip';

export default function IssueDocument() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [file, setFile] = useState(null);
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    studentId: '',
    docTitle: '',
  });

  const [transcriptData, setTranscriptData] = useState({
    totalSks: '',
    ipk: '',
    tahunMasuk: '',
    courses: [{ kodeMk: '', namaMk: '', sks: '', nilai: '', semester: '' }],
  });

  // State untuk peringatan dokumen duplikat
  const [dupModal, setDupModal] = useState(false);
  const [dupDoc, setDupDoc] = useState(null);
  const [revoking, setRevoking] = useState(false);
  const [pendingFormData, setPendingFormData] = useState(null);

  // State untuk hasil sukses penerbitan
  const [issuedSuccess, setIssuedSuccess] = useState(null);

  useEffect(() => {
    api.get('/students')
      .then((res) => setStudents(res.data.students || []))
      .catch(console.error);
  }, []);

  const selectedStudentObj = students.find((s) => String(s.id) === String(formData.studentId));

  const addCourse = () => {
    setTranscriptData((prev) => ({
      ...prev,
      courses: [
        ...prev.courses,
        { kodeMk: '', namaMk: '', sks: '', nilai: '', semester: '' },
      ],
    }));
  };

  const removeCourse = (index) => {
    if (transcriptData.courses.length <= 1) return;
    setTranscriptData((prev) => ({
      ...prev,
      courses: prev.courses.filter((_, i) => i !== index),
    }));
  };

  const updateCourse = (index, field, value) => {
    setTranscriptData((prev) => ({
      ...prev,
      courses: prev.courses.map((c, i) => (i === index ? { ...c, [field]: value } : c)),
    }));
  };

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      // Auto-fill title if empty
      if (!formData.docTitle) {
        setFormData((prev) => ({ ...prev, docTitle: 'Transkrip Nilai Akademik' }));
      }
    }
  };

  const clearFile = () => {
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleScan = async () => {
    if (!file) {
      alert('Pilih berkas dokumen terlebih dahulu sebelum memindai.');
      return;
    }
    setScanning(true);
    const data = new FormData();
    data.append('document', file);
    try {
      const res = await api.post('/documents/scan', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const { totalSks, ipk, tahunMasuk, courses } = res.data.data;
      setTranscriptData({
        totalSks: totalSks || '',
        ipk: ipk || '',
        tahunMasuk: tahunMasuk || '',
        courses: courses && courses.length > 0 ? courses : [{ kodeMk: '', namaMk: '', sks: '', nilai: '', semester: '' }],
      });
    } catch (err) {
      alert(err.response?.data?.error || 'Gagal memindai dokumen secara otomatis.');
    } finally {
      setScanning(false);
    }
  };

  const doIssue = async (data) => {
    try {
      const res = await api.post('/documents/issue', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setIssuedSuccess({
        verificationId: res.data.verificationId,
        txHash: res.data.txHash,
        docTitle: formData.docTitle,
      });
      // Reset form
      setFormData({ studentId: '', docTitle: '' });
      clearFile();
      setTranscriptData({
        totalSks: '',
        ipk: '',
        tahunMasuk: '',
        courses: [{ kodeMk: '', namaMk: '', sks: '', nilai: '', semester: '' }],
      });
    } catch (err) {
      alert(err.response?.data?.error || 'Gagal menerbitkan dokumen ke blockchain.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      alert('Silakan pilih berkas dokumen yang akan diterbitkan.');
      return;
    }
    if (!formData.studentId) {
      alert('Silakan pilih mahasiswa tujuan.');
      return;
    }
    if (!formData.docTitle.trim()) {
      alert('Silakan isi judul dokumen.');
      return;
    }

    setLoading(true);
    setIssuedSuccess(null);

    try {
      // Cek apakah mahasiswa sudah punya transkrip aktif
      const checkRes = await api.get(`/documents/check-existing/${formData.studentId}`);
      if (checkRes.data.hasExisting) {
        const data = new FormData();
        data.append('studentId', formData.studentId);
        data.append('docType', DOCUMENT_TYPE);
        data.append('docTitle', formData.docTitle);
        data.append('document', file);
        data.append('transcriptData', JSON.stringify(transcriptData));
        setPendingFormData(data);
        setDupDoc(checkRes.data.existing);
        setDupModal(true);
        return;
      }

      // Tidak ada duplikat -> langsung terbitkan
      const data = new FormData();
      data.append('studentId', formData.studentId);
      data.append('docType', DOCUMENT_TYPE);
      data.append('docTitle', formData.docTitle);
      data.append('document', file);
      data.append('transcriptData', JSON.stringify(transcriptData));
      await doIssue(data);
    } catch (err) {
      alert(err.response?.data?.error || 'Gagal memeriksa status dokumen mahasiswa.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelIssue = () => {
    setDupModal(false);
    setDupDoc(null);
    setPendingFormData(null);
  };

  const handleRevokeAndIssue = async () => {
    if (!dupDoc) return;
    setRevoking(true);
    try {
      await api.post(`/documents/revoke/${dupDoc.verification_id}`, {
        reason: 'Digantikan oleh transkrip nilai baru yang diterbitkan oleh Administrator.',
      });
      setDupModal(false);
      setDupDoc(null);
      await doIssue(pendingFormData);
      setPendingFormData(null);
    } catch (err) {
      alert(err.response?.data?.error || 'Gagal mencabut dokumen sebelumnya.');
    } finally {
      setRevoking(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  const isFormValid = !!file && !!formData.studentId && !!formData.docTitle.trim();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Terbitkan Dokumen ke Blockchain"
        description="Daftarkan transkrip nilai akademik ke dalam smart contract ledger permanen."
      />

      {issuedSuccess && (
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
                Dokumen "{issuedSuccess.docTitle}" telah dicatat secara permanen dan sah.
              </p>
            </div>
          </div>
          <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-white rounded-lg border border-emerald-100">
              <span className="text-[11px] text-muted block mb-1">Verification ID</span>
              <CopyText text={issuedSuccess.verificationId} showFull />
            </div>
            <div className="p-3 bg-white rounded-lg border border-emerald-100">
              <span className="text-[11px] text-muted block mb-1">TX Hash (Transaksi Blockchain)</span>
              <CopyText text={issuedSuccess.txHash} showFull />
            </div>
          </div>
        </div>
      )}

      {/* Grid 2 Kolom: Kiri (2/3) Form Bertahap, Kanan (1/3) Ringkasan Sticky */}
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Kolom Kiri: Form Bertahap */}
          <div className="lg:col-span-2 space-y-6">
            {/* 1. Kartu Informasi Dokumen */}
            <Card>
              <CardHeader
                title="1. Informasi Dokumen"
                description="Pilih mahasiswa penerima untuk menerbitkan transkrip nilai akademik."
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Select
                  label="Pilih Mahasiswa"
                  required
                  value={formData.studentId}
                  onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                >
                  <option value="">-- Pilih Mahasiswa --</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.student_id_number} - {s.full_name}
                    </option>
                  ))}
                </Select>

                <Input
                  label="Judul Dokumen"
                  required
                  placeholder="e.g. Transkrip Nilai Akademik"
                  value={formData.docTitle}
                  onChange={(e) => setFormData({ ...formData, docTitle: e.target.value })}
                />
              </div>
            </Card>

            {/* 2. Kartu Berkas */}
            <Card>
              <CardHeader
                title="2. Berkas Dokumen"
                description="Unggah salinan dokumen dalam format PDF atau gambar resolusi tinggi."
              />

              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,image/*"
                onChange={handleFileChange}
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
                        onClick={clearFile}
                        aria-label="Hapus berkas"
                        className="p-1.5 rounded-lg bg-white border border-[#CBD5E1] text-[#334155] hover:bg-[#FEF2F2] hover:text-[#B91C1C] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B91C1C]"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-4 p-3.5 bg-canvas rounded-lg border border-border">
                    <div className="text-xs text-muted">
                      Pindai berkas secara otomatis untuk mengekstrak data nilai dan mata kuliah.
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      icon={ScanLine}
                      loading={scanning}
                      disabled={scanning}
                      onClick={handleScan}
                    >
                      {scanning ? 'Memindai...' : 'Scan File'}
                    </Button>
                  </div>
                </div>
              )}

              <p className="text-xs text-muted mt-3">
                File akan di-hash (SHA-256) dan hash dicatat secara permanen di blockchain.
              </p>
            </Card>

            {/* 3. Kartu Data Konten Transkrip */}
            <Card>
              <CardHeader
                title="3. Data Konten Transkrip"
                description="Informasi kumulatif transkrip nilai mahasiswa (dapat diisi manual atau otomatis via Scan File)."
              />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Input
                  label="Tahun Masuk"
                  placeholder="Contoh: 2022"
                  value={transcriptData.tahunMasuk}
                  onChange={(e) =>
                    setTranscriptData({ ...transcriptData, tahunMasuk: e.target.value })
                  }
                />
                <Input
                  label="Total SKS Diperoleh"
                  type="number"
                  placeholder="Contoh: 144"
                  value={transcriptData.totalSks}
                  onChange={(e) =>
                    setTranscriptData({ ...transcriptData, totalSks: e.target.value })
                  }
                />
                <Input
                  label="Indeks Prestasi Kumulatif (IPK)"
                  type="number"
                  step="0.01"
                  placeholder="Contoh: 3.75"
                  value={transcriptData.ipk}
                  onChange={(e) =>
                    setTranscriptData({ ...transcriptData, ipk: e.target.value })
                  }
                />
              </div>
            </Card>

            {/* 4. Kartu Daftar Mata Kuliah */}
            <Card>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-semibold text-brand-900">4. Daftar Mata Kuliah</h3>
                  <p className="text-xs text-muted mt-0.5">
                    Rincian seluruh mata kuliah yang telah diselesaikan ({transcriptData.courses.length} mata kuliah)
                  </p>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  icon={PlusCircle}
                  onClick={addCourse}
                >
                  Tambah MK
                </Button>
              </div>

              {/* Tabel Scroll Internal */}
              <div className="border border-border rounded-lg overflow-hidden max-h-80 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-canvas sticky top-0 border-b border-border text-muted uppercase tracking-wider font-semibold z-10">
                    <tr>
                      <th className="px-3 py-2.5 w-28">Kode MK</th>
                      <th className="px-3 py-2.5">Nama Mata Kuliah</th>
                      <th className="px-3 py-2.5 w-20">SKS</th>
                      <th className="px-3 py-2.5 w-24">Nilai</th>
                      <th className="px-3 py-2.5 w-24">Semester</th>
                      <th className="px-3 py-2.5 w-12 text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border bg-surface">
                    {transcriptData.courses.map((course, idx) => (
                      <tr key={idx} className="hover:bg-brand-50/50">
                        <td className="px-2 py-1.5">
                          <input
                            type="text"
                            placeholder="INF101"
                            value={course.kodeMk}
                            onChange={(e) => updateCourse(idx, 'kodeMk', e.target.value)}
                            className="w-full px-2 py-1.5 bg-surface border border-border rounded text-xs focus:outline-none focus:ring-1 focus:ring-brand-600 font-mono"
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <input
                            type="text"
                            placeholder="Pemrograman Dasar"
                            value={course.namaMk}
                            onChange={(e) => updateCourse(idx, 'namaMk', e.target.value)}
                            className="w-full px-2 py-1.5 bg-surface border border-border rounded text-xs focus:outline-none focus:ring-1 focus:ring-brand-600"
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <input
                            type="number"
                            placeholder="3"
                            value={course.sks}
                            onChange={(e) => updateCourse(idx, 'sks', e.target.value)}
                            className="w-full px-2 py-1.5 bg-surface border border-border rounded text-xs focus:outline-none focus:ring-1 focus:ring-brand-600"
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <select
                            value={course.nilai}
                            onChange={(e) => updateCourse(idx, 'nilai', e.target.value)}
                            className="w-full px-2 py-1.5 bg-surface border border-border rounded text-xs focus:outline-none focus:ring-1 focus:ring-brand-600 cursor-pointer"
                          >
                            <option value="">-</option>
                            {['A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'D', 'E'].map((n) => (
                              <option key={n} value={n}>
                                {n}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-2 py-1.5">
                          <input
                            type="number"
                            placeholder="1"
                            value={course.semester}
                            onChange={(e) => updateCourse(idx, 'semester', e.target.value)}
                            className="w-full px-2 py-1.5 bg-surface border border-border rounded text-xs focus:outline-none focus:ring-1 focus:ring-brand-600"
                          />
                        </td>
                        <td className="px-2 py-1.5 text-center">
                          {transcriptData.courses.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeCourse(idx)}
                              aria-label="Hapus baris mata kuliah"
                              className="p-1 rounded-md bg-white border border-red-200 text-[#B91C1C] hover:bg-[#FEF2F2] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#B91C1C]"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>

          {/* Kolom Kanan: Ringkasan Penerbitan (Sticky) */}
          <div className="lg:col-span-1 lg:sticky lg:top-6 space-y-6">
            <Card>
              <h3 className="text-base font-semibold text-brand-900 border-b border-border pb-3 mb-4">
                Ringkasan Penerbitan
              </h3>

              <div className="space-y-3.5 text-xs">
                <div>
                  <span className="text-muted block text-[11px] uppercase tracking-wider mb-0.5">
                    Mahasiswa Terpilih
                  </span>
                  {selectedStudentObj ? (
                    <div>
                      <span className="font-semibold text-ink block">
                        {selectedStudentObj.full_name}
                      </span>
                      <span className="font-mono text-muted text-[11px]">
                        {selectedStudentObj.student_id_number}
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
                    {formData.docTitle || <span className="text-muted italic">Belum diisi</span>}
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
          </div>
        </div>
      </form>

      {/* Modal Peringatan Dokumen Duplikat */}
      {dupModal && dupDoc && (
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
                <span className="font-mono font-medium text-ink">{dupDoc.verification_id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Judul:</span>
                <span className="font-medium text-ink">{dupDoc.doc_title}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Tanggal Terbit:</span>
                <span className="font-medium text-ink">
                  {dupDoc.issued_at
                    ? new Date(dupDoc.issued_at).toLocaleDateString('id-ID', {
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
                onClick={handleRevokeAndIssue}
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
                onClick={handleCancelIssue}
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
      )}
    </div>
  );
}
