import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ClipboardList,
  FilePlus,
  Clock,
  AlertCircle,
  XCircle,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import api from '../../services/api';
import PageHeader from '../../components/ui/PageHeader';
import Card, { CardHeader } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import DataTable, { TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from '../../components/ui/DataTable';
import StatusBadge from '../../components/ui/StatusBadge';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import EmptyState from '../../components/ui/EmptyState';
import { SkeletonTableRow } from '../../components/ui/Skeleton';

export default function StudentRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [purpose, setPurpose] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [cancelTarget, setCancelTarget] = useState(null);

  const fetchRequests = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/student/transcript-requests');
      setRequests(res.data.requests || []);
    } catch (err) {
      console.error(err);
      setError('Gagal memuat riwayat permintaan transkrip nilai.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const hasPendingRequest = requests.some((r) => r.status === 'pending');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (hasPendingRequest) return;

    setError('');
    setSuccessMsg('');
    setSubmitting(true);

    try {
      const res = await api.post('/student/transcript-requests', { purpose });
      setSuccessMsg(res.data.message || 'Permintaan transkrip nilai berhasil diajukan.');
      setPurpose('');
      await fetchRequests();
    } catch (err) {
      setError(err.response?.data?.error || 'Gagal mengajukan permintaan transkrip nilai.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmCancel = async () => {
    if (!cancelTarget) return;
    setCancelling(true);
    try {
      await api.patch(`/student/transcript-requests/${cancelTarget.id}/cancel`);
      setCancelTarget(null);
      await fetchRequests();
    } catch (err) {
      alert(err.response?.data?.error || 'Gagal membatalkan permintaan');
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Permintaan Transkrip Nilai"
        description="Ajukan permohonan penerbitan transkrip nilai akademik resmi ke smart contract blockchain."
      />

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center justify-between">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError('')}
            className="text-red-700 hover:text-red-900 font-semibold"
          >
            ✕
          </button>
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Kartu Form Pengajuan */}
      <Card>
        <CardHeader
          title="Ajukan Permohonan Transkrip Baru"
          description="Sampaikan permohonan transkrip nilai kepada bagian akademik universitas."
        />

        {hasPendingRequest ? (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3 text-xs text-amber-800">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-amber-900">
                Anda Masih Memiliki Permintaan yang Sedang Diproses
              </p>
              <p className="text-amber-700 leading-relaxed">
                Sistem menerapkan kebijakan satu permohonan aktif pada satu waktu. Harap menunggu hingga permohonan Anda sebelumnya diproses oleh bagian akademik atau dibatalkan sebelum mengajukan kembali.
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="purpose" className="block text-xs font-medium text-ink mb-1.5">
                Keperluan Pengajuan <span className="text-muted">(Opsional)</span>
              </label>
              <Input
                id="purpose"
                placeholder="Contoh: Pendaftaran beasiswa luar negeri, persyaratan kelulusan, atau melamar pekerjaan..."
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                disabled={submitting}
                className="bg-surface"
              />
            </div>

            <div className="flex justify-end">
              <Button
                type="submit"
                variant="primary"
                size="md"
                icon={FilePlus}
                loading={submitting}
                disabled={submitting}
              >
                {submitting ? 'Mengajukan...' : 'Ajukan Permintaan Transkrip'}
              </Button>
            </div>
          </form>
        )}
      </Card>

      {/* Tabel Riwayat Permohonan */}
      <Card className="p-0 overflow-hidden">
        <div className="p-6 pb-4 border-b border-border">
          <h2 className="text-base font-semibold text-brand-900">Riwayat Pengajuan Transkrip</h2>
          <p className="text-xs text-muted mt-0.5">Daftar seluruh permohonan transkrip nilai yang pernah Anda ajukan</p>
        </div>

        <DataTable
          footer={
            <span>
              Menampilkan <strong className="text-ink font-semibold">{requests.length}</strong> riwayat pengajuan
            </span>
          }
        >
          <TableHead>
            <tr>
              <TableHeaderCell>ID</TableHeaderCell>
              <TableHeaderCell>Tanggal Diajukan</TableHeaderCell>
              <TableHeaderCell>Keperluan</TableHeaderCell>
              <TableHeaderCell>Status</TableHeaderCell>
              <TableHeaderCell>Catatan / Alasan</TableHeaderCell>
              <TableHeaderCell className="text-right w-28">Aksi</TableHeaderCell>
            </tr>
          </TableHead>
          <TableBody>
            {loading ? (
              <>
                <SkeletonTableRow columns={6} />
                <SkeletonTableRow columns={6} />
              </>
            ) : requests.length === 0 ? (
              <tr>
                <td colSpan="6" className="py-12">
                  <EmptyState
                    icon={ClipboardList}
                    title="Belum Ada Riwayat Pengajuan"
                    description="Anda belum pernah mengajukan permohonan transkrip nilai."
                  />
                </td>
              </tr>
            ) : (
              requests.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <span className="font-mono text-xs font-semibold text-brand-900">
                      #{r.id}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-ink block">
                      {new Date(r.requested_at).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                    <span className="text-[11px] text-muted">
                      {new Date(r.requested_at).toLocaleTimeString('id-ID', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-ink">
                      {r.purpose || <span className="text-muted italic">Tidak dicantumkan</span>}
                    </span>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={r.status} />
                  </TableCell>
                  <TableCell>
                    {r.status === 'rejected' && r.reject_reason && (
                      <span className="text-xs text-red-700 font-medium line-clamp-2">
                        {r.reject_reason}
                      </span>
                    )}
                    {r.status === 'issued' && r.verification_id && (
                      <span className="font-mono text-[11px] text-brand-600 block truncate">
                        ID: {r.verification_id}
                      </span>
                    )}
                    {r.status === 'pending' && (
                      <span className="text-[11px] text-amber-700 italic">
                        Menunggu antrean bagian akademik
                      </span>
                    )}
                    {r.status === 'cancelled' && (
                      <span className="text-[11px] text-muted italic">
                        Dibatalkan oleh mahasiswa
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {r.status === 'pending' && (
                      <Button
                        variant="dangerOutline"
                        size="sm"
                        onClick={() => setCancelTarget(r)}
                      >
                        Batalkan
                      </Button>
                    )}
                    {r.status === 'issued' && r.verification_id && (
                      <Link to={`/verify/${r.verification_id}`}>
                        <Button variant="secondary" size="sm" icon={ShieldCheck}>
                          Verifikasi
                        </Button>
                      </Link>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </DataTable>
      </Card>

      {/* Dialog Konfirmasi Pembatalan */}
      <ConfirmDialog
        isOpen={!!cancelTarget}
        title="Batalkan Permintaan Transkrip?"
        message="Apakah Anda yakin ingin membatalkan pengajuan transkrip nilai ini? Anda dapat mengajukan kembali setelah dibatalkan."
        confirmLabel={cancelling ? 'Membatalkan...' : 'Ya, Batalkan'}
        cancelLabel="Kembali"
        danger
        onConfirm={handleConfirmCancel}
        onCancel={() => setCancelTarget(null)}
      />
    </div>
  );
}
