import { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Search,
  Eye,
  Trash2,
  AlertCircle,
} from 'lucide-react';
import api from '../../services/api';
import PageHeader from '../../components/ui/PageHeader';
import Button from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import DataTable, { TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from '../../components/ui/DataTable';
import Drawer from '../../components/ui/Drawer';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import EmptyState from '../../components/ui/EmptyState';
import { SkeletonTableRow } from '../../components/ui/Skeleton';

export default function StudentsManager() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  // Drawer Tambah Mahasiswa
  const [isAddDrawerOpen, setIsAddDrawerOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [formData, setFormData] = useState({
    fullName: '',
    studentIdNumber: '',
    email: '',
    password: '',
    faculty: '',
    program: '',
    graduationYear: '',
  });

  // Modal Detail Mahasiswa
  const [selectedStudent, setSelectedStudent] = useState(null);

  // Modal Konfirmasi Hapus
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchStudents = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/students');
      setStudents(res.data.students || []);
    } catch (err) {
      console.error(err);
      setError('Gagal memuat data mahasiswa dari server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const handleOpenAddDrawer = () => {
    setFormData({
      fullName: '',
      studentIdNumber: '',
      email: '',
      password: '',
      faculty: '',
      program: '',
      graduationYear: '',
    });
    setFormError('');
    setIsAddDrawerOpen(true);
  };

  const handleCloseAddDrawer = () => {
    if (!submitting) {
      setIsAddDrawerOpen(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);

    try {
      await api.post('/students', formData);
      setIsAddDrawerOpen(false);
      setFormData({
        fullName: '',
        studentIdNumber: '',
        email: '',
        password: '',
        faculty: '',
        program: '',
        graduationYear: '',
      });
      await fetchStudents();
    } catch (err) {
      setFormError(err.response?.data?.error || 'Gagal menambahkan data mahasiswa. Silakan periksa kembali formulir.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/students/${deleteTarget.id}`);
      setDeleteTarget(null);
      await fetchStudents();
    } catch (err) {
      alert(err.response?.data?.error || 'Gagal menghapus mahasiswa');
    } finally {
      setDeleting(false);
    }
  };

  const filteredStudents = students.filter((s) => {
    const q = search.toLowerCase();
    return (
      s.full_name?.toLowerCase().includes(q) ||
      s.student_id_number?.toLowerCase().includes(q) ||
      s.email?.toLowerCase().includes(q) ||
      s.faculty?.toLowerCase().includes(q) ||
      s.program?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Kelola Mahasiswa"
        description="Daftar mahasiswa terdaftar untuk penerbitan ijazah dan transkrip nilai akademik."
        badge={
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand-100 text-brand-700">
            {students.length} Mahasiswa
          </span>
        }
        action={
          <Button variant="primary" icon={UserPlus} onClick={handleOpenAddDrawer}>
            Tambah Mahasiswa
          </Button>
        }
      />

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center justify-between">
          <span>{error}</span>
          <Button variant="secondary" size="sm" onClick={fetchStudents}>
            Muat Ulang
          </Button>
        </div>
      )}

      {/* Search Bar Selebar Penuh */}
      <div className="w-full">
        <Input
          placeholder="Cari berdasarkan nama, NIM, fakultas, program studi, atau email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          icon={Search}
          className="bg-surface shadow-sm"
        />
      </div>

      {/* Tabel Selebar Penuh */}
      <DataTable
        footer={
          <span>
            Menampilkan <strong className="text-ink font-semibold">{filteredStudents.length}</strong> dari{' '}
            <strong className="text-ink font-semibold">{students.length}</strong> total mahasiswa
          </span>
        }
      >
        <TableHead>
          <tr>
            <TableHeaderCell className="w-32">NIM</TableHeaderCell>
            <TableHeaderCell>Nama Lengkap</TableHeaderCell>
            <TableHeaderCell>Fakultas</TableHeaderCell>
            <TableHeaderCell>Program Studi</TableHeaderCell>
            <TableHeaderCell>Email</TableHeaderCell>
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
          ) : filteredStudents.length === 0 ? (
            <tr>
              <td colSpan="6" className="py-12">
                <EmptyState
                  icon={Users}
                  title="Tidak ada mahasiswa ditemukan"
                  description={
                    search
                      ? `Tidak ada hasil yang cocok dengan kata kunci "${search}".`
                      : 'Belum ada mahasiswa yang ditambahkan ke sistem.'
                  }
                  action={
                    !search && (
                      <Button variant="primary" size="sm" icon={UserPlus} onClick={handleOpenAddDrawer}>
                        Tambah Mahasiswa Sekarang
                      </Button>
                    )
                  }
                />
              </td>
            </tr>
          ) : (
            filteredStudents.map((student) => (
              <TableRow key={student.id}>
                <TableCell className="font-mono text-xs font-semibold text-brand-900">
                  {student.student_id_number}
                </TableCell>
                <TableCell>
                  <span className="font-medium text-ink block">{student.full_name}</span>
                  {student.graduation_year && (
                    <span className="text-[11px] text-muted block">Lulus {student.graduation_year}</span>
                  )}
                </TableCell>
                <TableCell className="text-xs text-muted">
                  {student.faculty || '-'}
                </TableCell>
                <TableCell className="text-xs text-muted">
                  {student.program || '-'}
                </TableCell>
                <TableCell className="text-xs text-muted font-mono">
                  {student.email}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedStudent(student)}
                      aria-label={`Lihat detail ${student.full_name}`}
                      title="Lihat Detail"
                      className="p-1.5 rounded-lg bg-white border border-[#CBD5E1] text-[#334155] hover:bg-[#E6EAFB] hover:text-[#151B54] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2B3FA8]"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(student)}
                      aria-label={`Hapus ${student.full_name}`}
                      title="Hapus Mahasiswa"
                      className="p-1.5 rounded-lg bg-white border-[1.5px] border-[#B91C1C] text-[#B91C1C] hover:bg-[#FEF2F2] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B91C1C]"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </DataTable>

      {/* Drawer Tambah Mahasiswa */}
      <Drawer
        isOpen={isAddDrawerOpen}
        onClose={handleCloseAddDrawer}
        title="Tambah Mahasiswa Baru"
        description="Masukkan data identitas mahasiswa untuk akun portal dan penerbitan dokumen."
        maxWidth="max-w-lg"
        footer={
          <>
            <Button variant="secondary" size="md" onClick={handleCloseAddDrawer} disabled={submitting}>
              Batal
            </Button>
            <Button
              type="submit"
              form="add-student-form"
              variant="primary"
              size="md"
              loading={submitting}
            >
              Simpan Mahasiswa
            </Button>
          </>
        }
      >
        {formError && (
          <div className="p-3.5 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2.5 text-xs text-red-700">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <span>{formError}</span>
          </div>
        )}

        {/* Form dengan perlindungan anti-autofill */}
        <form
          id="add-student-form"
          onSubmit={handleSubmit}
          autoComplete="off"
          className="space-y-4"
        >
          {/* Hidden inputs to prevent aggressive browser credential manager autofill */}
          <input type="text" style={{ display: 'none' }} tabIndex="-1" readOnly />
          <input type="password" style={{ display: 'none' }} tabIndex="-1" readOnly />

          <Input
            label="Nama Lengkap"
            required
            name="new_student_fullname"
            placeholder="Contoh: Budi Santoso"
            value={formData.fullName}
            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
            autoComplete="off"
          />

          <Input
            label="Nomor Induk Mahasiswa (NIM)"
            required
            name="new_student_nim_unique"
            placeholder="Contoh: G1A022001"
            value={formData.studentIdNumber}
            onChange={(e) => setFormData({ ...formData, studentIdNumber: e.target.value })}
            autoComplete="off"
            hint="NIM akan digunakan sebagai identitas akun mahasiswa."
          />

          <Input
            label="Alamat Email Mahasiswa"
            type="email"
            required
            name="new_student_email_val"
            placeholder="budi@demo.univ.edu"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            autoComplete="off"
          />

          <Input
            label="Kata Sandi Login Mahasiswa"
            type="password"
            required
            name="new_student_secret_pass"
            placeholder="Minimal 6 karakter"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            autoComplete="new-password"
            hint="Kata sandi sementara untuk mahasiswa masuk ke portal."
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Fakultas"
              required
              name="new_student_faculty"
              placeholder="Contoh: Teknik"
              value={formData.faculty}
              onChange={(e) => setFormData({ ...formData, faculty: e.target.value })}
              autoComplete="off"
            />
            <Input
              label="Program Studi"
              name="new_student_program"
              placeholder="Contoh: Informatika"
              value={formData.program}
              onChange={(e) => setFormData({ ...formData, program: e.target.value })}
              autoComplete="off"
            />
          </div>

          <Input
            label="Tahun Lulus"
            type="number"
            name="new_student_grad_year"
            placeholder="Contoh: 2026"
            value={formData.graduationYear}
            onChange={(e) => setFormData({ ...formData, graduationYear: e.target.value })}
            autoComplete="off"
            hint="Kosongkan jika mahasiswa masih aktif."
          />
        </form>
      </Drawer>

      {/* Drawer Detail Mahasiswa */}
      <Drawer
        isOpen={!!selectedStudent}
        onClose={() => setSelectedStudent(null)}
        title="Detail Mahasiswa"
        description="Informasi lengkap data mahasiswa terdaftar"
        maxWidth="max-w-md"
        footer={
          <Button variant="secondary" size="sm" onClick={() => setSelectedStudent(null)}>
            Tutup
          </Button>
        }
      >
        {selectedStudent && (
          <div className="space-y-4">
            <div className="p-4 bg-canvas rounded-xl border border-border">
              <p className="text-xs text-muted">Nomor Induk Mahasiswa (NIM)</p>
              <p className="text-base font-mono font-semibold text-brand-900 mt-0.5">
                {selectedStudent.student_id_number}
              </p>
            </div>

            <div className="divide-y divide-border text-sm">
              <div className="py-2.5 flex justify-between gap-4">
                <span className="text-xs text-muted">Nama Lengkap</span>
                <span className="font-medium text-ink text-right">{selectedStudent.full_name}</span>
              </div>
              <div className="py-2.5 flex justify-between gap-4">
                <span className="text-xs text-muted">Email</span>
                <span className="font-mono text-xs text-ink text-right">{selectedStudent.email}</span>
              </div>
              <div className="py-2.5 flex justify-between gap-4">
                <span className="text-xs text-muted">Fakultas</span>
                <span className="font-medium text-ink text-right">{selectedStudent.faculty || '-'}</span>
              </div>
              <div className="py-2.5 flex justify-between gap-4">
                <span className="text-xs text-muted">Program Studi</span>
                <span className="font-medium text-ink text-right">{selectedStudent.program || '-'}</span>
              </div>
              <div className="py-2.5 flex justify-between gap-4">
                <span className="text-xs text-muted">Tahun Lulus</span>
                <span className="font-medium text-ink text-right">{selectedStudent.graduation_year || '-'}</span>
              </div>
              <div className="py-2.5 flex justify-between gap-4">
                <span className="text-xs text-muted">Terdaftar Pada</span>
                <span className="text-xs text-ink text-right">
                  {selectedStudent.created_at
                    ? new Date(selectedStudent.created_at).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })
                    : '-'}
                </span>
              </div>
            </div>
          </div>
        )}
      </Drawer>

      {/* Dialog Konfirmasi Hapus Mahasiswa */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Hapus Mahasiswa"
        description={`Apakah Anda yakin ingin menghapus data mahasiswa "${deleteTarget?.full_name}"? Semua data dan riwayat terkait akan dibersihkan dari sistem. Tindakan ini tidak dapat dibatalkan.`}
        confirmText="Hapus Mahasiswa"
        cancelText="Batal"
        variant="danger"
        loading={deleting}
      />
    </div>
  );
}
