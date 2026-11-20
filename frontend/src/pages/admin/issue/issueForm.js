// Bentuk data dan helper formulir penerbitan dokumen (tanpa React)

export const DOCUMENT_TYPE = 'transkrip';

// Isi multipart untuk POST /documents/issue. Isi transkrip (nilai, IPK, mata kuliah) tidak dikirim
// terpisah: berkas PDF itulah transkripnya, dan berkas itu yang di-hash serta dibandingkan saat verifikasi.
export function buildIssueFormData({ formData, file, requestId }) {
  const data = new FormData();
  data.append('studentId', formData.studentId);
  data.append('docType', DOCUMENT_TYPE);
  data.append('docTitle', formData.docTitle);
  data.append('document', file);
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
