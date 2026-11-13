import { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Search,
  Eye,
  Trash2,
  AlertCircle,
  KeyRound,
  EyeOff,
  Dices,
  CheckCircle2,
  Copy,
  Lock,
} from 'lucide-react';
import api from '../../services/api';
import PageHeader from '../../components/ui/PageHeader';
import Button from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import DataTable, { TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from '../../components/ui/DataTable';
import Drawer from '../../components/ui/Drawer';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import EmptyState from '../../components/ui/EmptyState';
import CopyText from '../../components/ui/CopyText';
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
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    studentIdNumber: '',
    email: '',
    password: '',
    faculty: '',
    program: '',
    graduationYear: '',
  });

  // Modal Konfirmasi Kredensial Baru Dibuat (hanya tampil sekali)
  const [newCredentials, setNewCredentials] = useState(null);

  // Modal Detail Mahasiswa
  const [selectedStudent, setSelectedStudent] = useState(null);

  // Modal Reset Kata Sandi
  const [resetTarget, setResetTarget] = useState(null);
  const [resetting, setResetting] = useState(false);
  const [resetResult, setResetResult] = useState(null);

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

  const handleGenerateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    const pwd = Array.from({ length: 8 }, () => chars.charAt(Math.floor(Math.random() * chars.length))).join('');
    setFormData((prev) => ({ ...prev, password: pwd }));
    setShowPassword(true);
  };

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
    setShowPassword(false);
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

    if (formData.password.length < 6) {
      setFormError('Kata sandi harus terdiri dari minimal 6 karakter.');
      return;
    }

    setSubmitting(true);

    try {
      await api.post('/students', formData);
      setIsAddDrawerOpen(false);
      // Tampilkan kartu kredensial sekali kepada admin untuk disampaikan ke mahasiswa
      setNewCredentials({
        name: formData.fullName,
        nim: formData.studentIdNumber,
        email: formData.email,
        password: formData.password,
      });

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

  const handleConfirmResetPassword = async () => {
    if (!resetTarget) return;
    setResetting(true);
    try {
      const res = await api.put(`/students/${resetTarget.id}/password`);
      setResetResult({
        name: resetTarget.full_name,
        nim: resetTarget.student_id_number,
        newPassword: res.data.newPassword,
      });
      setResetTarget(null);
    } catch (err) {
      alert(err.response?.data?.error || 'Gagal mereset kata sandi mahasiswa');
    } finally {
      setResetting(false);
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
        description="Daftar mahasiswa terdaftar untuk akun portal dan penerbitan transkrip nilai akademik."
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

      {/* Baris Pencarian */}
      <div className="max-w-md">
        <Input
          placeholder="Cari berdasarkan nama, NIM, fakultas, atau prodi..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          icon={Search}
          className="bg-surface shadow-sm"
        />
      </div>

      {/* Tabel Mahasiswa */}
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
            <TableHeaderCell>Mahasiswa</TableHeaderCell>
            <TableHeaderCell>NIM</TableHeaderCell>
            <TableHeaderCell>Fakultas / Prodi</TableHeaderCell>
            <TableHeaderCell>Tahun Lulus</TableHeaderCell>
            <TableHeaderCell className="text-right w-36">Aksi</TableHeaderCell>
          </tr>
        </TableHead>
        <TableBody>
          {loading ? (
            <>
              <SkeletonTableRow columns={5} />
              <SkeletonTableRow columns={5} />
              <SkeletonTableRow columns={5} />
              <SkeletonTableRow columns={5} />
            </>
          ) : filteredStudents.length === 0 ? (
            <tr>
              <td colSpan="5" className="py-12">
                <EmptyState
                  icon={Users}
                  title="Tidak ada mahasiswa ditemukan"
                  description={
                    search
                      ? 'Tidak ada data mahasiswa yang cocok dengan kata kunci pencarian.'
                      : 'Belum ada data mahasiswa terdaftar. Klik tombol Tambah Mahasiswa untuk mendaftarkan akun baru.'
                  }
                  action={
                    !search && (
                      <Button variant="primary" size="sm" icon={UserPlus} onClick={handleOpenAddDrawer}>
                        Tambah Mahasiswa Baru
                      </Button>
                    )
                  }
                />
              </td>
            </tr>
          ) : (
            filteredStudents.map((s) => (
              <TableRow key={s.id}>
                <TableCell>
                  <span className="font-semibold text-brand-900 block text-xs">
                    {s.full_name}
                  </span>
                  <span className="text-[11px] text-muted block mt-0.5">
                    {s.email}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="font-mono text-xs font-semibold text-ink bg-canvas px-2 py-0.5 rounded border border-border">
                    {s.student_id_number}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="text-xs text-ink block">{s.faculty}</span>
                  <span className="text-[11px] text-muted block">{s.program || '-'}</span>
                </TableCell>
                <TableCell>
                  <span className="text-xs text-ink">
                    {s.graduation_year || <span className="text-muted italic">Aktif</span>}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={() => setSelectedStudent(s)}
                      aria-label="Lihat detail mahasiswa"
                      title="Lihat Detail"
                      className="p-1.5 rounded-lg bg-white border border-[#CBD5E1] text-[#334155] hover:bg-[#E6EAFB] hover:text-[#151B54] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2B3FA8]"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setResetTarget(s)}
                      aria-label="Reset kata sandi mahasiswa"
                      title="Reset Kata Sandi"
                      className="p-1.5 rounded-lg bg-white border border-[#CBD5E1] text-[#D97706] hover:bg-[#FEF3C7] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D97706]"
                    >
                      <KeyRound className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(s)}
                      aria-label="Hapus data mahasiswa"
                      title="Hapus Mahasiswa"
                      className="p-1.5 rounded-lg bg-white border border-[#CBD5E1] text-[#334155] hover:bg-[#FEF2F2] hover:text-[#B91C1C] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B91C1C]"
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
          <div className="p-3.5 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2.5 text-xs text-red-700 mb-4">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <span>{formError}</span>
          </div>
        )}

        <form
          id="add-student-form"
          onSubmit={handleSubmit}
          autoComplete="off"
          className="space-y-4"
        >
          {/* Hidden inputs to prevent browser autofill */}
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
            hint="NIM akan digunakan sebagai identitas akun mahasiswa saat masuk portal."
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

          <div className="space-y-1">
            <Input
              label="Kata Sandi Login Mahasiswa"
              type={showPassword ? 'text' : 'password'}
              required
              name="new_student_secret_pass"
              placeholder="Minimal 6 karakter"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              autoComplete="new-password"
              hint="Kata sandi sementara untuk mahasiswa masuk ke portal."
              rightSlot={
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                    className="p-1 rounded-md text-muted hover:text-ink transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              }
            />
            <div className="pt-1 flex justify-end">
              <button
                type="button"
                onClick={handleGenerateRandomPassword}
                className="text-xs text-brand-600 hover:text-brand-900 font-medium inline-flex items-center gap-1.5 transition-colors"
              >
                <Dices className="w-3.5 h-3.5" />
                <span>Buat kata sandi acak</span>
              </button>
            </div>
          </div>

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
            hint="Kosongkan jika mahasiswa masih berstatus aktif."
          />
        </form>
      </Drawer>

      {/* Modal Kredensial Baru Dibuat (Hanya tampil sekali) */}
      {newCredentials && (
        <div className="fixed inset-0 bg-brand-950/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface rounded-xl shadow-2xl max-w-md w-full p-6 border border-border space-y-4">
            <div className="flex items-center gap-3 text-emerald-700">
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-brand-900">Mahasiswa Berhasil Didaftarkan!</h3>
                <p className="text-xs text-muted">Kredensial login portal mahasiswa telah dibuat.</p>
              </div>
            </div>

            <div className="p-4 bg-canvas rounded-lg border border-border space-y-2.5 text-xs">
              <p className="text-[11px] font-semibold text-muted uppercase tracking-wider">
                Informasi Masuk Mahasiswa:
              </p>
              <div className="flex justify-between items-center py-1 border-b border-border">
                <span className="text-muted">Nama:</span>
                <span className="font-semibold text-ink">{newCredentials.name}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-border">
                <span className="text-muted">NIM (Username):</span>
                <div className="flex items-center gap-1.5 font-mono font-bold text-brand-900">
                  <span>{newCredentials.nim}</span>
                  <CopyText text={newCredentials.nim} />
                </div>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-muted">Kata Sandi:</span>
                <div className="flex items-center gap-1.5 font-mono font-bold text-brand-900">
                  <span>{newCredentials.password}</span>
                  <CopyText text={newCredentials.password} />
                </div>
              </div>
            </div>

            <p className="text-[11px] text-amber-800 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
              ⚠️ <strong>Penting:</strong> Salin NIM dan kata sandi di atas dan sampaikan kepada mahasiswa. Kata sandi ini hanya ditampilkan sekali.
            </p>

            <Button
              variant="primary"
              className="w-full"
              onClick={() => setNewCredentials(null)}
            >
              Saya Sudah Menyalin Kredensial
            </Button>
          </div>
        </div>
      )}

      {/* Modal Hasil Reset Kata Sandi */}
      {resetResult && (
        <div className="fixed inset-0 bg-brand-950/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface rounded-xl shadow-2xl max-w-md w-full p-6 border border-border space-y-4">
            <div className="flex items-center gap-3 text-amber-700">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                <KeyRound className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-brand-900">Kata Sandi Berhasil Direset</h3>
                <p className="text-xs text-muted">Berikan kata sandi baru ini kepada mahasiswa.</p>
              </div>
            </div>

            <div className="p-4 bg-canvas rounded-lg border border-border space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted">Mahasiswa:</span>
                <span className="font-semibold text-ink">{resetResult.name} ({resetResult.nim})</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-border">
                <span className="text-muted">Kata Sandi Baru:</span>
                <div className="flex items-center gap-1.5 font-mono font-bold text-base text-brand-900">
                  <span>{resetResult.newPassword}</span>
                  <CopyText text={resetResult.newPassword} />
                </div>
              </div>
            </div>

            <p className="text-[11px] text-muted">
              Mahasiswa disarankan segera mengubah kata sandinya setelah berhasil masuk ke portal.
            </p>

            <Button
              variant="primary"
              className="w-full"
              onClick={() => setResetResult(null)}
            >
              Selesai & Tutup
            </Button>
          </div>
        </div>
      )}

      {/* Modal Detail Mahasiswa */}
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

      {/* Dialog Konfirmasi Reset Kata Sandi */}
      <ConfirmDialog
        isOpen={!!resetTarget}
        title="Reset Kata Sandi Mahasiswa?"
        message={`Apakah Anda yakin ingin mereset kata sandi mahasiswa "${resetTarget?.full_name}" (NIM: ${resetTarget?.student_id_number})? Kata sandi baru acak akan dibuat.`}
        confirmLabel={resetting ? 'Mereset...' : 'Ya, Reset Kata Sandi'}
        cancelLabel="Batal"
        onConfirm={handleConfirmResetPassword}
        onCancel={() => setResetTarget(null)}
      />

      {/* Dialog Konfirmasi Hapus Mahasiswa */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Hapus Data Mahasiswa?"
        message={`Apakah Anda yakin ingin menghapus data mahasiswa "${deleteTarget?.full_name}" (NIM: ${deleteTarget?.student_id_number})? Tindakan ini tidak dapat dibatalkan.`}
        confirmLabel={deleting ? 'Menghapus...' : 'Ya, Hapus'}
        cancelLabel="Batal"
        danger
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
