import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ClipboardList,
  Search,
  CheckCircle2,
  XCircle,
  FilePlus,
  AlertCircle,
  Eye,
  ShieldCheck,
} from 'lucide-react';
import api from '../../services/api';
import PageHeader from '../../components/ui/PageHeader';
import Button from '../../components/ui/Button';
import { Input, Select } from '../../components/ui/Input';
import DataTable, { TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from '../../components/ui/DataTable';
import StatusBadge from '../../components/ui/StatusBadge';
import Drawer from '../../components/ui/Drawer';
import EmptyState from '../../components/ui/EmptyState';
import { SkeletonTableRow } from '../../components/ui/Skeleton';

export default function TranscriptRequestsManager() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  // Modal / Dialog Tolak Permintaan
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejecting, setRejecting] = useState(false);
  const [rejectError, setRejectError] = useState('');

  // Drawer Detail Permintaan
  const [selectedRequest, setSelectedRequest] = useState(null);

  const navigate = useNavigate();

  const fetchRequests = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/admin/transcript-requests', {
        params: { status: filterStatus, search }
      });
      setRequests(res.data.requests || []);
    } catch (err) {
      console.error(err);
      setError('Gagal memuat daftar permintaan transkrip.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [filterStatus]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchRequests();
  };

  const handleOpenReject = (req) => {
    setRejectTarget(req);
    setRejectReason('');
    setRejectError('');
  };

  const handleConfirmReject = async () => {
    if (!rejectTarget) return;
    if (!rejectReason.trim()) {
      setRejectError('Alasan penolakan permintaan wajib diisi.');
      return;
    }

    setRejecting(true);
    setRejectError('');
    try {
      await api.patch(`/admin/transcript-requests/${rejectTarget.id}/reject`, {
        reason: rejectReason.trim()
      });
      setRejectTarget(null);
      await fetchRequests();
    } catch (err) {
      setRejectError(err.response?.data?.error || 'Gagal menolak permintaan transkrip.');
    } finally {
      setRejecting(false);
    }
  };

  const handleIssueForRequest = (req) => {
    navigate(`/admin/issue?studentId=${req.student_id}&requestId=${req.id}`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Permintaan Transkrip Nilai"
        description="Kelola pengajuan permohonan transkrip nilai akademik dari mahasiswa."
        badge={
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand-100 text-brand-700">
            {requests.length} Permintaan
          </span>
        }
      />

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center justify-between">
          <span>{error}</span>
          <Button variant="secondary" size="sm" onClick={fetchRequests}>
            Muat Ulang
          </Button>
        </div>
      )}

      {/* Filter & Pencarian */}
      <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="flex-1">
          <Input
            placeholder="Cari berdasarkan nama mahasiswa atau NIM..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            icon={Search}
            className="bg-surface shadow-sm"
          />
        </div>
        <div className="w-48">
          <Select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-surface shadow-sm text-xs"
          >
            <option value="all">Semua Status</option>
            <option value="pending">Menunggu (Pending)</option>
            <option value="issued">Selesai (Issued)</option>
            <option value="rejected">Ditolak (Rejected)</option>
            <option value="cancelled">Dibatalkan</option>
          </Select>
        </div>
      </form>

      {/* Tabel Permintaan */}
      <DataTable
        footer={
          <span>
            Menampilkan <strong className="text-ink font-semibold">{requests.length}</strong> total permintaan
          </span>
        }
      >
        <TableHead>
          <tr>
            <TableHeaderCell>Mahasiswa</TableHeaderCell>
            <TableHeaderCell>NIM</TableHeaderCell>
            <TableHeaderCell>Keperluan</TableHeaderCell>
            <TableHeaderCell>Waktu Pengajuan</TableHeaderCell>
            <TableHeaderCell>Status</TableHeaderCell>
            <TableHeaderCell className="text-right w-36">Aksi</TableHeaderCell>
          </tr>
        </TableHead>
        <TableBody>
          {loading ? (
            <>
              <SkeletonTableRow columns={6} />
              <SkeletonTableRow columns={6} />
              <SkeletonTableRow columns={6} />
              <SkeletonTableRow columns={6} />
            </>
          ) : requests.length === 0 ? (
            <tr>
              <td colSpan="6" className="py-12">
                <EmptyState
                  icon={ClipboardList}
                  title="Tidak ada permintaan ditemukan"
                  description={
                    search || filterStatus !== 'all'
                      ? 'Tidak ada permohonan transkrip nilai yang sesuai dengan filter.'
                      : 'Belum ada permohonan transkrip nilai yang diajukan oleh mahasiswa.'
                  }
                />
              </td>
            </tr>
          ) : (
            requests.map((r) => (
              <TableRow key={r.id}>
                <TableCell>
                  <span className="font-semibold text-brand-900 block text-xs">
                    {r.full_name}
                  </span>
                  <span className="text-[11px] text-muted block">
                    {r.faculty} • {r.program || '-'}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="font-mono text-xs font-semibold text-ink bg-canvas px-2 py-0.5 rounded border border-border">
                    {r.student_id_number}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="text-xs text-ink line-clamp-1">
                    {r.purpose || <span className="text-muted italic">Tidak ada keterangan</span>}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="text-xs text-muted block">
                    {r.requested_at
                      ? new Date(r.requested_at).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : '-'}
                  </span>
                </TableCell>
                <TableCell>
                  <StatusBadge status={r.status} />
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={() => setSelectedRequest(r)}
                      title="Lihat Detail Permintaan"
                      aria-label="Lihat detail permintaan"
                      className="p-1.5 rounded-lg bg-white border border-[#CBD5E1] text-[#334155] hover:bg-[#E6EAFB] hover:text-[#151B54] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2B3FA8]"
                    >
                      <Eye className="w-4 h-4" />
                    </button>

                    {r.status === 'pending' && (
                      <>
                        <Button
                          variant="primary"
                          size="sm"
                          icon={FilePlus}
                          onClick={() => handleIssueForRequest(r)}
                          title="Terbitkan Transkrip ke Blockchain"
                        >
                          Terbitkan
                        </Button>
                        <button
                          type="button"
                          onClick={() => handleOpenReject(r)}
                          title="Tolak Permintaan"
                          aria-label="Tolak permintaan"
                          className="p-1.5 rounded-lg bg-white border border-[#CBD5E1] text-[#B91C1C] hover:bg-[#FEF2F2] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B91C1C]"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </>
                    )}

                    {r.status === 'issued' && r.verification_id && (
                      <button
                        type="button"
                        onClick={() => window.open(`/verify/${r.verification_id}`, '_blank')}
                        title="Verifikasi Dokumen yang Diterbitkan"
                        aria-label="Verifikasi dokumen"
                        className="p-1.5 rounded-lg bg-white border border-[#CBD5E1] text-[#166534] hover:bg-[#DCFCE7] transition-colors"
                      >
                        <ShieldCheck className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </DataTable>

      {/* Drawer Detail Permintaan */}
      <Drawer
        isOpen={!!selectedRequest}
        onClose={() => setSelectedRequest(null)}
        title="Detail Permintaan Transkrip"
        description="Informasi pengajuan transkrip nilai akademik mahasiswa"
        maxWidth="max-w-md"
        footer={
          <div className="flex justify-end gap-2 w-full">
            {selectedRequest?.status === 'pending' && (
              <Button
                variant="primary"
                size="sm"
                icon={FilePlus}
                onClick={() => {
                  const req = selectedRequest;
                  setSelectedRequest(null);
                  handleIssueForRequest(req);
                }}
              >
                Terbitkan Sekarang
              </Button>
            )}
            <Button variant="secondary" size="sm" onClick={() => setSelectedRequest(null)}>
              Tutup
            </Button>
          </div>
        }
      >
        {selectedRequest && (
          <div className="space-y-4">
            <div className="p-4 bg-canvas rounded-xl border border-border flex items-center justify-between">
              <div>
                <p className="text-xs text-muted">Status Permintaan</p>
                <div className="mt-1">
                  <StatusBadge status={selectedRequest.status} />
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted">ID Permintaan</p>
                <p className="font-mono text-sm font-semibold text-brand-900 mt-0.5">
                  #{selectedRequest.id}
                </p>
              </div>
            </div>

            <div className="divide-y divide-border text-sm">
              <div className="py-2.5 flex justify-between gap-4">
                <span className="text-xs text-muted">Nama Mahasiswa</span>
                <span className="font-medium text-ink text-right">{selectedRequest.full_name}</span>
              </div>
              <div className="py-2.5 flex justify-between gap-4">
                <span className="text-xs text-muted">NIM</span>
                <span className="font-mono text-xs font-semibold text-ink text-right">
                  {selectedRequest.student_id_number}
                </span>
              </div>
              <div className="py-2.5 flex justify-between gap-4">
                <span className="text-xs text-muted">Fakultas / Prodi</span>
                <span className="font-medium text-ink text-right">
                  {selectedRequest.faculty} / {selectedRequest.program || '-'}
                </span>
              </div>
              <div className="py-2.5 flex justify-between gap-4">
                <span className="text-xs text-muted">Waktu Diajukan</span>
                <span className="text-xs text-ink text-right">
                  {selectedRequest.requested_at
                    ? new Date(selectedRequest.requested_at).toLocaleString('id-ID', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : '-'}
                </span>
              </div>

              <div className="py-3">
                <span className="text-xs text-muted block mb-1">Keperluan Pengajuan:</span>
                <div className="p-3 bg-canvas rounded-lg border border-border text-xs text-ink leading-relaxed">
                  {selectedRequest.purpose || 'Tidak mencantumkan keperluan khusus.'}
                </div>
              </div>

              {selectedRequest.status === 'rejected' && (
                <div className="py-3">
                  <span className="text-xs text-red-700 font-semibold block mb-1">Alasan Penolakan:</span>
                  <div className="p-3 bg-red-50 rounded-lg border border-red-200 text-xs text-red-700 leading-relaxed">
                    {selectedRequest.reject_reason || '-'}
                  </div>
                </div>
              )}

              {selectedRequest.status === 'issued' && selectedRequest.verification_id && (
                <div className="py-2.5 flex justify-between gap-4">
                  <span className="text-xs text-muted">Verification ID Dokumen</span>
                  <span className="font-mono text-xs text-brand-600 font-semibold text-right">
                    {selectedRequest.verification_id}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </Drawer>

      {/* Modal Dialog Tolak Permintaan */}
      {rejectTarget && (
        <div className="fixed inset-0 bg-brand-950/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface rounded-xl shadow-2xl max-w-md w-full p-6 border border-border space-y-4">
            <div className="flex items-start gap-3.5">
              <div className="p-2.5 bg-red-100 text-red-700 rounded-xl shrink-0">
                <XCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-brand-900">
                  Tolak Permintaan Transkrip?
                </h3>
                <p className="text-xs text-muted mt-1 leading-relaxed">
                  Permintaan mahasiswa <strong className="text-ink">{rejectTarget.full_name}</strong> ({rejectTarget.student_id_number}) akan ditolak. Berikan alasan penolakan yang jelas.
                </p>
              </div>
            </div>

            {rejectError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{rejectError}</span>
              </div>
            )}

            <div>
              <label htmlFor="reject-reason" className="block text-xs font-medium text-ink mb-1.5">
                Alasan Penolakan <span className="text-red-500">*</span>
              </label>
              <textarea
                id="reject-reason"
                rows={3}
                placeholder="Contoh: Belum menyelesaikan administrasi semester atau syarat skripsi..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-xs text-ink focus:outline-none focus:ring-2 focus:ring-brand-600"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setRejectTarget(null)}
                disabled={rejecting}
              >
                Batal
              </Button>
              <Button
                variant="danger"
                size="sm"
                loading={rejecting}
                onClick={handleConfirmReject}
              >
                Tolak Permintaan
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

