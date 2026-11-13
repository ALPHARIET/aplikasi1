const TranscriptRequestModel = require('../models/transcriptRequestModel');

const AdminTranscriptController = {
  // Ambil semua daftar permintaan transkrip untuk Admin
  getAllRequests: async (req, res) => {
    try {
      const { status = 'all', search = '' } = req.query;
      const requests = await TranscriptRequestModel.getAllAdmin({ status, search });
      const pendingCount = await TranscriptRequestModel.getPendingCount();
      res.json({ requests, pendingCount });
    } catch (error) {
      console.error('Get All Transcript Requests Error:', error);
      res.status(500).json({ error: 'Gagal mengambil daftar permintaan transkrip' });
    }
  },

  // Hitung jumlah permintaan berstatus pending (untuk badge navigasi & dashboard)
  getPendingCount: async (req, res) => {
    try {
      const count = await TranscriptRequestModel.getPendingCount();
      res.json({ count });
    } catch (error) {
      console.error('Get Pending Count Error:', error);
      res.status(500).json({ error: 'Gagal menghitung permintaan pending' });
    }
  },

  // Tolak permintaan transkrip dengan alasan
  rejectRequest: async (req, res) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      if (!reason || !reason.trim()) {
        return res.status(400).json({ error: 'Alasan penolakan permintaan wajib diisi' });
      }

      const request = await TranscriptRequestModel.getById(id);
      if (!request) {
        return res.status(404).json({ error: 'Permintaan transkrip tidak ditemukan' });
      }

      if (request.status !== 'pending') {
        return res.status(400).json({ error: 'Hanya permintaan berstatus pending yang dapat ditolak' });
      }

      await TranscriptRequestModel.reject(id, req.user.id, reason.trim());
      res.json({ message: 'Permintaan transkrip nilai berhasil ditolak' });
    } catch (error) {
      console.error('Reject Transcript Request Error:', error);
      res.status(500).json({ error: 'Gagal menolak permintaan transkrip' });
    }
  }
};

module.exports = AdminTranscriptController;

