import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../services/api';
import PageHeader from '../../components/ui/PageHeader';
import Card, { CardHeader } from '../../components/ui/Card';
import { Input, Select } from '../../components/ui/Input';
import { buildIssueFormData } from './issue/issueForm';
import IssuedSuccessBanner from './issue/IssuedSuccessBanner';
import DocumentFileCard from './issue/DocumentFileCard';
import IssueSummaryCard from './issue/IssueSummaryCard';
import DuplicateDocumentModal from './issue/DuplicateDocumentModal';

export default function IssueDocument() {
  const [searchParams] = useSearchParams();
  const paramStudentId = searchParams.get('studentId') || '';
  const paramRequestId = searchParams.get('requestId') || '';

  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState(null);
  const fileInputRef = useRef(null);
  // Diambil sekali dari URL saat halaman dibuka
  const [requestId] = useState(paramRequestId);

  const [formData, setFormData] = useState({
    studentId: paramStudentId,
    docTitle: '',
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
      const data = buildIssueFormData({ formData, file, requestId });

      // Mahasiswa yang sudah punya transkrip aktif: tanya dulu lewat modal duplikat
      const checkRes = await api.get(`/documents/check-existing/${formData.studentId}`);
      if (checkRes.data.hasExisting) {
        setPendingFormData(data);
        setDupDoc(checkRes.data.existing);
        setDupModal(true);
        return;
      }

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

  const isFormValid = !!file && !!formData.studentId && !!formData.docTitle.trim();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Terbitkan Dokumen ke Blockchain"
        description="Sidik jari (hash SHA-256) berkas transkrip dicatat permanen di blockchain."
      />

      {issuedSuccess && <IssuedSuccessBanner issued={issuedSuccess} />}

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

              {requestId && (
                <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-center justify-between">
                  <span>Menerbitkan transkrip untuk <strong>Permintaan Transkrip #{requestId}</strong>.</span>
                  <span className="text-[11px] text-amber-700">Permintaan akan otomatis selesai setelah transaksi blockchain sukses.</span>
                </div>
              )}

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
                  placeholder="Contoh: Transkrip Nilai Akademik"
                  value={formData.docTitle}
                  onChange={(e) => setFormData({ ...formData, docTitle: e.target.value })}
                />
              </div>
            </Card>

            <DocumentFileCard
              file={file}
              fileInputRef={fileInputRef}
              onFileChange={handleFileChange}
              onClear={clearFile}
            />
          </div>

          {/* Kolom Kanan: Ringkasan Penerbitan (Sticky) */}
          <div className="lg:col-span-1 lg:sticky lg:top-6 space-y-6">
            <IssueSummaryCard
              student={selectedStudentObj}
              docTitle={formData.docTitle}
              file={file}
              isFormValid={isFormValid}
              loading={loading}
            />
          </div>
        </div>
      </form>

      {dupModal && dupDoc && (
        <DuplicateDocumentModal
          doc={dupDoc}
          revoking={revoking}
          onRevokeAndIssue={handleRevokeAndIssue}
          onCancel={handleCancelIssue}
        />
      )}
    </div>
  );
}
