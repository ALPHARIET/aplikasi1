import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildIssueFormData, emptyTranscript, emptyCourse, formatFileSize } from '../src/pages/admin/issue/issueForm.js';

test('emptyTranscript selalu membuat objek baru (aman dipakai sebagai state)', () => {
  const a = emptyTranscript();
  const b = emptyTranscript();
  assert.deepEqual(a, { totalSks: '', ipk: '', tahunMasuk: '', courses: [emptyCourse()] });
  assert.notEqual(a, b);
  assert.notEqual(a.courses[0], b.courses[0]);
});

test('buildIssueFormData berisi field yang dibaca POST /documents/issue', async () => {
  const file = new File(['%PDF'], 'transkrip.pdf', { type: 'application/pdf' });
  const transcriptData = emptyTranscript();
  const data = buildIssueFormData({ formData: { studentId: '7', docTitle: 'Transkrip' }, file, transcriptData, requestId: '3' });
  assert.equal(data.get('studentId'), '7');
  assert.equal(data.get('docType'), 'transkrip');
  assert.equal(data.get('docTitle'), 'Transkrip');
  assert.equal(data.get('requestId'), '3');
  assert.equal(data.get('transcriptData'), JSON.stringify(transcriptData));
  assert.equal(await data.get('document').text(), '%PDF');
});

test('buildIssueFormData tanpa requestId tidak mengirim field requestId', () => {
  const file = new File(['x'], 'a.pdf', { type: 'application/pdf' });
  const data = buildIssueFormData({ formData: { studentId: '1', docTitle: 'T' }, file, transcriptData: emptyTranscript(), requestId: '' });
  assert.equal(data.has('requestId'), false);
});

test('formatFileSize', () => {
  assert.equal(formatFileSize(0), '0 B');
  assert.equal(formatFileSize(512), '512.0 B');
  assert.equal(formatFileSize(2048), '2.0 KB');
  assert.equal(formatFileSize(3 * 1024 * 1024), '3.0 MB');
});
