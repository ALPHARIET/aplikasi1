// Bentuk data dan helper formulir penerbitan dokumen (tanpa React)

export const DOCUMENT_TYPE = 'transkrip';

export const GRADE_OPTIONS = ['A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'D', 'E'];

// Selalu buat objek baru: nilai ini dipakai sebagai state React
export const emptyCourse = () => ({ kodeMk: '', namaMk: '', sks: '', nilai: '', semester: '' });

export const emptyTranscript = () => ({
  totalSks: '',
  ipk: '',
  tahunMasuk: '',
  courses: [emptyCourse()],
});

// Isi multipart untuk POST /documents/issue
export function buildIssueFormData({ formData, file, transcriptData, requestId }) {
  const data = new FormData();
  data.append('studentId', formData.studentId);
  data.append('docType', DOCUMENT_TYPE);
  data.append('docTitle', formData.docTitle);
  data.append('document', file);
  data.append('transcriptData', JSON.stringify(transcriptData));
  if (requestId) data.append('requestId', requestId);
  return data;
}

export const formatFileSize = (bytes) => {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
};
