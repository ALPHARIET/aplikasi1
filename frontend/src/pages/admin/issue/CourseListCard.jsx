import { PlusCircle, Trash2 } from 'lucide-react';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import { GRADE_OPTIONS } from './issueForm';

const cellInput = 'w-full px-2 py-1.5 bg-surface border border-border rounded text-xs focus:outline-none focus:ring-1 focus:ring-brand-600';

// Kartu 4: tabel mata kuliah yang bisa ditambah, diubah, dan dihapus per baris
export default function CourseListCard({ courses, onAdd, onRemove, onUpdate }) {
  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold text-brand-900">4. Daftar Mata Kuliah</h3>
          <p className="text-xs text-muted mt-0.5">
            Rincian seluruh mata kuliah yang telah diselesaikan ({courses.length} mata kuliah)
          </p>
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          icon={PlusCircle}
          onClick={onAdd}
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
            {courses.map((course, idx) => (
              <tr key={idx} className="hover:bg-brand-50/50">
                <td className="px-2 py-1.5">
                  <input
                    type="text"
                    placeholder="INF101"
                    value={course.kodeMk}
                    onChange={(e) => onUpdate(idx, 'kodeMk', e.target.value)}
                    className={`${cellInput} font-mono`}
                  />
                </td>
                <td className="px-2 py-1.5">
                  <input
                    type="text"
                    placeholder="Pemrograman Dasar"
                    value={course.namaMk}
                    onChange={(e) => onUpdate(idx, 'namaMk', e.target.value)}
                    className={cellInput}
                  />
                </td>
                <td className="px-2 py-1.5">
                  <input
                    type="number"
                    placeholder="3"
                    value={course.sks}
                    onChange={(e) => onUpdate(idx, 'sks', e.target.value)}
                    className={cellInput}
                  />
                </td>
                <td className="px-2 py-1.5">
                  <select
                    value={course.nilai}
                    onChange={(e) => onUpdate(idx, 'nilai', e.target.value)}
                    className={`${cellInput} cursor-pointer`}
                  >
                    <option value="">-</option>
                    {GRADE_OPTIONS.map((n) => (
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
                    onChange={(e) => onUpdate(idx, 'semester', e.target.value)}
                    className={cellInput}
                  />
                </td>
                <td className="px-2 py-1.5 text-center">
                  {courses.length > 1 && (
                    <button
                      type="button"
                      onClick={() => onRemove(idx)}
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
  );
}
