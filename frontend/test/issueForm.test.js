import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildIssueFormData, formatFileSize } from '../src/pages/admin/issue/issueForm.js';

test('buildIssueFormData berisi field yang dibaca POST /documents/issue', async () => {
  const file = new File(['%PDF'], 'transkrip.pdf', { type: 'application/pdf' });
  const data = buildIssueFormData({ formData: { studentId: '7', docTitle: 'Transkrip' }, file, requestId: '3' });
  assert.equal(data.get('studentId'), '7');
  assert.equal(data.get('docType'), 'transkrip');
  assert.equal(data.get('docTitle'), 'Transkrip');
  assert.equal(data.get('requestId'), '3');
  assert.equal(await data.get('document').text(), '%PDF');
});

test('buildIssueFormData tidak mengirim data yang tidak disimpan backend', () => {
  const file = new File(['x'], 'a.pdf', { type: 'application/pdf' });
  const data = buildIssueFormData({ formData: { studentId: '1', docTitle: 'T' }, file, requestId: '' });
  assert.equal(data.has('requestId'), false);
  assert.equal(data.has('transcriptData'), false);
  assert.deepEqual([...data.keys()].sort(), ['docTitle', 'docType', 'document', 'studentId']);
});

test('formatFileSize', () => {
  assert.equal(formatFileSize(0), '0 B');
  assert.equal(formatFileSize(512), '512.0 B');
  assert.equal(formatFileSize(2048), '2.0 KB');
  assert.equal(formatFileSize(3 * 1024 * 1024), '3.0 MB');
});
