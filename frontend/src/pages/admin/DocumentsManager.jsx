import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText,
  FilePlus,
  Search,
  Eye,
  ShieldOff,
  Trash2,
} from 'lucide-react';
import api from '../../services/api';
import PageHeader from '../../components/ui/PageHeader';
import Button from '../../components/ui/Button';
import { Input, Select } from '../../components/ui/Input';
import DataTable, { TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from '../../components/ui/DataTable';
import StatusBadge from '../../components/ui/StatusBadge';
import CopyText from '../../components/ui/CopyText';
import Drawer from '../../components/ui/Drawer';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import EmptyState from '../../components/ui/EmptyState';
import { SkeletonTableRow } from '../../components/ui/Skeleton';

export default function DocumentsManager() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  // Drawer Detail Dokumen
  const [selectedDoc, setSelectedDoc] = useState(null);

  // Modal Revoke Dokumen
  const [revokeTarget, setRevokeTarget] = useState(null);
  const [revoking, setRevoking] = useState(false);
  const [revokeReason, setRevokeReason] = useState('');
  const [revokeError, setRevokeError] = useState('');

  // Modal Hapus Dokumen Revoked
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchDocuments = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/documents');
      setDocuments(res.data.documents || []);
    } catch (err) {
      console.error(err);
      setError('Gagal memuat daftar dokumen dari server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const handleOpenRevoke = (doc) => {
    setRevokeTarget(doc);
    setRevokeReason('');
    setRevokeError('');
  };

  const handleConfirmRevoke = async () => {
    if (!revokeTarget) return;
    if (!revokeReason.trim()) {
      setRevokeError('Alasan pencabutan dokumen wajib diisi.');
      return;
    }

    setRevoking(true);
    setRevokeError('');
    try {
      await api.post(`/documents/revoke/${revokeTarget.verification_id}`, {
        reason: revokeReason.trim(),
      });
      setRevokeTarget(null);
      if (selectedDoc?.id === revokeTarget.id) {
        setSelectedDoc(null);
      }
      await fetchDocuments();
    } catch (err) {
      setRevokeError(err.response?.data?.error || 'Gagal mencabut dokumen di blockchain.');
    } finally {
      setRevoking(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/documents/${deleteTarget.id}`);
      setDeleteTarget(null);
      if (selectedDoc?.id === deleteTarget.id) {
        setSelectedDoc(null);
      }
      await fetchDocuments();
    } catch (err) {
      alert(err.response?.data?.error || 'Gagal menghapus dokumen.');
    } finally {
      setDeleting(false);
    }
  };

  const filteredDocs = documents.filter((doc) => {
    const q = search.toLowerCase();
    const matchSearch =
      doc.full_name?.toLowerCase().includes(q) ||
      doc.student_id_number?.toLowerCase().includes(q) ||
      doc.doc_title?.toLowerCase().includes(q) ||
      doc.verification_id?.toLowerCase().includes(q);

    const matchStatus = filterStatus === 'all' || doc.status === filterStatus;

    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Daftar Dokumen"
        description="Kelola dan pantau status sertifikat akademik, ijazah, dan transkrip nilai yang tercatat di blockchain."
        badge={
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand-100 text-brand-700">
            {documents.length} Dokumen
          </span>
        }
        action={
          <Link to="/admin/issue">
            <Button variant="primary" icon={FilePlus}>
              Terbitkan Dokumen
            </Button>
          </Link>
        }
      />

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center justify-between">
          <span>{error}</span>
          <Button variant="secondary" size="sm" onClick={fetchDocuments}>
            Muat Ulang
          </Button>
        </div>
      )}

      {/* Baris Filter: Search dan Status */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="flex-1">
          <Input
            placeholder="Cari berdasarkan nama mahasiswa, NIM, judul, atau Verification ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            icon={Search}
            className="bg-surface shadow-sm"
          />
        </div>
        <div className="flex items-center gap-3">
          <div className="w-48">
            <Select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-surface shadow-sm text-xs"
            >
              <option value="all">Semua Status</option>
              <option value="issued">Valid</option>
              <option value="revoked">Dicabut (Revoked)</option>
              <option value="pending">Menunggu (Pending)</option>
            </Select>
          </div>
        </div>
      </div>

      {/* Tabel Dokumen */}
      <DataTable
        footer={
          <span>
            Menampilkan <strong className="text-ink font-semibold">{filteredDocs.length}</strong> dari{' '}
            <strong className="text-ink font-semibold">{documents.length}</strong> total dokumen
          </span>
        }
      >
        <TableHead>
          <tr>
            <TableHeaderCell>Dokumen</TableHeaderCell>
            <TableHeaderCell>Mahasiswa</TableHeaderCell>
            <TableHeaderCell>Status</TableHeaderCell>
            <TableHeaderCell>Verification ID</TableHeaderCell>
            <TableHeaderCell>TX Hash</TableHeaderCell>
            <TableHeaderCell className="text-right w-24">Aksi</TableHeaderCell>
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
          ) : filteredDocs.length === 0 ? (
            <tr>
              <td colSpan="6" className="py-12">
                <EmptyState
                  icon={FileText}
                  title="Tidak ada dokumen ditemukan"
                  description={
                    search || filterStatus !== 'all'
                      ? 'Tidak ada dokumen yang sesuai dengan kriteria filter saat ini.'
                      : 'Belum ada dokumen yang diterbitkan ke blockchain.'
                  }
                  action={
                    !search && filterStatus === 'all' && (
                      <Link to="/admin/issue">
                        <Button variant="primary" size="sm" icon={FilePlus}>
                          Terbitkan Dokumen Baru
                        </Button>
                      </Link>
                    )
                  }
                />
              </td>
            </tr>
          ) : (
            filteredDocs.map((doc) => (
              <TableRow key={doc.id}>
                <TableCell>
                  <span className="font-semibold text-brand-900 block text-xs uppercase tracking-wide">
                    {doc.doc_type}
                  </span>
                  <span className="text-xs text-ink block font-medium">
                    {doc.doc_title}
                  </span>
                  <span className="text-[11px] text-muted block mt-0.5 tabular-nums">
                    {doc.issued_at
                      ? new Date(doc.issued_at).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })
                      : '-'}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="font-medium text-ink block text-xs">
                    {doc.full_name}
                  </span>
                  <span className="text-[11px] font-mono text-muted block">
                    {doc.student_id_number}
                  </span>
                </TableCell>
                <TableCell>
                  <StatusBadge status={doc.status} />
                </TableCell>
                <TableCell>
                  <CopyText text={doc.verification_id} displayLength={14} />
                </TableCell>
                <TableCell>
                  <CopyText text={doc.tx_hash} displayLength={14} />
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    {/* Tombol Lihat Detail */}
                    <button
                      type="button"
                      onClick={() => setSelectedDoc(doc)}
                      aria-label="Lihat detail dokumen"
                      title="Lihat Detail"
                      className="p-1.5 rounded-lg bg-white border border-[#CBD5E1] text-[#334155] hover:bg-[#E6EAFB] hover:text-[#151B54] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2B3FA8]"
                    >
                      <Eye className="w-4 h-4" />
                    </button>

                    {/* Tombol Cabut Dokumen (Issued) */}
                    {doc.status === 'issued' && (
                      <button
                        type="button"
                        onClick={() => handleOpenRevoke(doc)}
                        aria-label="Cabut dokumen"
                        title="Cabut Dokumen (Revoke)"
                        className="p-1.5 rounded-lg bg-white border-[1.5px] border-[#B91C1C] text-[#B91C1C] hover:bg-[#FEF2F2] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B91C1C]"
                      >
                        <ShieldOff className="w-4 h-4" />
                      </button>
                    )}

                    {/* Tombol Hapus Dokumen Revoked */}
                    {doc.status === 'revoked' && (
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(doc)}
                        aria-label="Hapus dokumen yang telah dicabut"
                        title="Hapus Dokumen"
                        className="p-1.5 rounded-lg bg-white border-[1.5px] border-[#B91C1C] text-[#B91C1C] hover:bg-[#FEF2F2] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B91C1C]"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </DataTable>

      {/* Drawer Detail Dokumen */}
      <Drawer
        isOpen={!!selectedDoc}
        onClose={() => setSelectedDoc(null)}
        title="Detail Dokumen Blockchain"
        description="Informasi rinci dokumen akademik dan rekaman audit trail pada smart contract."
        maxWidth="max-w-lg"
        footer={
          <div className="flex items-center justify-between w-full">
            <div>
              {selectedDoc?.status === 'issued' && (
                <Button
                  variant="danger"
                  size="sm"
                  icon={ShieldOff}
                  onClick={() => {
                    handleOpenRevoke(selectedDoc);
                  }}
                >
                  Cabut Dokumen
                </Button>
              )}
            </div>
            <Button variant="secondary" size="sm" onClick={() => setSelectedDoc(null)}>
              Tutup
            </Button>
          </div>
        }
      >
        {selectedDoc && (
          <div className="space-y-4">
            <div className="p-4 bg-canvas rounded-xl border border-border space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted">Status Dokumen</span>
                <StatusBadge status={selectedDoc.status} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted">Jenis Dokumen</span>
                <span className="text-xs font-semibold uppercase text-brand-900">
                  {selectedDoc.doc_type}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted">Judul Dokumen</span>
                <span className="text-xs font-medium text-ink">{selectedDoc.doc_title}</span>
              </div>
            </div>

            <div className="divide-y divide-border text-sm">
              <div className="py-2.5 flex justify-between gap-4">
                <span className="text-xs text-muted">Nama Mahasiswa</span>
                <span className="font-medium text-ink text-right">{selectedDoc.full_name}</span>
              </div>
              <div className="py-2.5 flex justify-between gap-4">
                <span className="text-xs text-muted">NIM</span>
                <span className="font-mono text-xs text-ink text-right">
                  {selectedDoc.student_id_number}
                </span>
              </div>
              <div className="py-2.5 flex justify-between gap-4">
                <span className="text-xs text-muted">Fakultas</span>
                <span className="text-xs text-ink text-right">{selectedDoc.faculty || '-'}</span>
              </div>
              <div className="py-2.5 flex justify-between gap-4">
                <span className="text-xs text-muted">Tanggal Terbit</span>
                <span className="text-xs text-ink text-right">
                  {selectedDoc.issued_at
                    ? new Date(selectedDoc.issued_at).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })
                    : '-'}
                </span>
              </div>
            </div>

            <div className="pt-3 border-t border-border space-y-3">
              <div>
                <p className="text-[11px] font-medium text-muted uppercase tracking-wider mb-1">
                  Verification ID
                </p>
                <div className="p-2.5 bg-canvas rounded-lg border border-border">
                  <CopyText text={selectedDoc.verification_id} showFull className="w-full" />
                </div>
              </div>

              <div>
                <p className="text-[11px] font-medium text-muted uppercase tracking-wider mb-1">
                  TX Hash (Transaksi Blockchain)
                </p>
                <div className="p-2.5 bg-canvas rounded-lg border border-border">
                  <CopyText text={selectedDoc.tx_hash} showFull className="w-full" />
                </div>
              </div>

              <div>
                <p className="text-[11px] font-medium text-muted uppercase tracking-wider mb-1">
                  File Hash (SHA-256)
                </p>
                <div className="p-2.5 bg-canvas rounded-lg border border-border">
                  <CopyText text={selectedDoc.file_hash} showFull className="w-full" />
                </div>
              </div>

              {selectedDoc.status === 'revoked' && selectedDoc.revocation_reason && (
                <div className="p-3.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800">
                  <p className="font-semibold text-red-900 mb-1">Alasan Pencabutan:</p>
                  <p className="leading-relaxed">{selectedDoc.revocation_reason}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </Drawer>

      {/* Modal Revoke Dokumen */}
      <ConfirmDialog
        isOpen={!!revokeTarget}
        onClose={() => setRevokeTarget(null)}
        onConfirm={handleConfirmRevoke}
        title="Cabut (Revoke) Dokumen"
        description={`Dokumen "${revokeTarget?.doc_title}" atas nama ${revokeTarget?.full_name} (${revokeTarget?.student_id_number}) akan dicabut secara permanen di blockchain.`}
        confirmText="Cabut Dokumen Sekarang"
        cancelText="Batal"
        variant="danger"
        loading={revoking}
      >
        <div className="space-y-3 mt-4">
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 leading-relaxed">
            Pencabutan dokumen dicatat secara permanen di blockchain dan tidak dapat dibatalkan. Status dokumen akan berubah menjadi <strong>Revoked</strong> dan akan terdeteksi tidak sah pada verifikasi publik.
          </div>

          <div>
            <label className="block text-xs font-medium text-ink mb-1.5">
              Alasan Pencabutan <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={3}
              required
              value={revokeReason}
              onChange={(e) => setRevokeReason(e.target.value)}
              placeholder="Contoh: Kesalahan input nilai IPK, digantikan oleh transkrip revisi, atau pembatalan kelulusan..."
              className="w-full px-3.5 py-2.5 bg-surface border border-border rounded-lg text-xs text-ink placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent resize-none"
            />
            {revokeError && <p className="text-xs text-red-600 mt-1">{revokeError}</p>}
          </div>
        </div>
      </ConfirmDialog>

      {/* Modal Hapus Dokumen Revoked */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Hapus Dokumen"
        description={`Apakah Anda yakin ingin menghapus arsip dokumen "${deleteTarget?.doc_title}"? Dokumen ini berstatus Revoked dan tindakan ini akan membersihkan berkas dan data dari database.`}
        confirmText="Hapus Dokumen"
        cancelText="Batal"
        variant="danger"
        loading={deleting}
      />
    </div>
  );
}
