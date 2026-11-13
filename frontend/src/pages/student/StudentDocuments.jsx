import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText,
  Download,
  ShieldCheck,
  AlertTriangle,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import api from '../../services/api';
import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import StatusBadge from '../../components/ui/StatusBadge';
import CopyText from '../../components/ui/CopyText';
import EmptyState from '../../components/ui/EmptyState';
import DataTable, { TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from '../../components/ui/DataTable';
import { SkeletonTableRow } from '../../components/ui/Skeleton';

export default function StudentDocuments() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState(null);
  const [error, setError] = useState('');

  const fetchDocuments = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/student/documents');
      setDocuments(res.data.documents || []);
    } catch (err) {
      console.error(err);
      setError('Gagal memuat dokumen transkrip nilai akademik.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const handleDownload = async (doc) => {
    setDownloadingId(doc.id);
    try {
      const res = await api.get(`/student/documents/${doc.id}/download`, {
        responseType: 'blob'
      });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${doc.verification_id}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Gagal mengunduh berkas transkrip. Silakan coba kembali.');
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dokumen Saya"
        description="Daftar berkas transkrip nilai akademik Anda yang tercatat secara sah dan permanen di blockchain."
        badge={
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand-100 text-brand-700">
            {documents.length} Dokumen
          </span>
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

      <Card className="p-0 overflow-hidden">
        <DataTable
          footer={
            <span>
              Menampilkan <strong className="text-ink font-semibold">{documents.length}</strong> dokumen transkrip
            </span>
          }
        >
          <TableHead>
            <tr>
              <TableHeaderCell>Dokumen</TableHeaderCell>
              <TableHeaderCell>Tanggal Terbit</TableHeaderCell>
              <TableHeaderCell>Status</TableHeaderCell>
              <TableHeaderCell>Verification ID</TableHeaderCell>
              <TableHeaderCell>TX Hash (Blockchain)</TableHeaderCell>
              <TableHeaderCell className="text-right w-44">Aksi</TableHeaderCell>
            </tr>
          </TableHead>
          <TableBody>
            {loading ? (
              <>
                <SkeletonTableRow columns={6} />
                <SkeletonTableRow columns={6} />
                <SkeletonTableRow columns={6} />
              </>
            ) : documents.length === 0 ? (
              <tr>
                <td colSpan="6" className="py-12">
                  <EmptyState
                    icon={FileText}
                    title="Belum Ada Dokumen Transkrip"
                    description="Belum ada transkrip nilai akademik yang diterbitkan untuk akun Anda. Silakan ajukan permohonan transkrip nilai baru."
                    action={
                      <Link to="/student/requests">
                        <Button variant="primary" size="sm">
                          Ajukan Permintaan Transkrip
                        </Button>
                      </Link>
                    }
                  />
                </td>
              </tr>
            ) : (
              documents.map((doc) => (
                <TableRow key={doc.id}>
                  <TableCell>
                    <span className="font-semibold text-brand-900 block text-xs">
                      {doc.doc_title}
                    </span>
                    <span className="text-[11px] text-muted uppercase tracking-wider block mt-0.5 font-medium">
                      {doc.doc_type}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-ink block">
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
                    <div className="space-y-1">
                      <StatusBadge status={doc.status} />
                      {doc.status === 'revoked' && doc.revocation_reason && (
                        <p className="text-[11px] text-red-700 font-medium">
                          Alasan: {doc.revocation_reason}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <CopyText text={doc.verification_id} />
                  </TableCell>
                  <TableCell>
                    {doc.tx_hash ? (
                      <CopyText text={doc.tx_hash} />
                    ) : (
                      <span className="text-muted text-xs italic">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link to={`/verify/${doc.verification_id}`} target="_blank">
                        <Button variant="secondary" size="sm" icon={ShieldCheck}>
                          Verifikasi
                        </Button>
                      </Link>
                      <Button
                        variant="primary"
                        size="sm"
                        icon={Download}
                        loading={downloadingId === doc.id}
                        disabled={downloadingId === doc.id}
                        onClick={() => handleDownload(doc)}
                      >
                        Unduh
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </DataTable>
      </Card>
    </div>
  );
}

