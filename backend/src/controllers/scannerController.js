const fs = require('fs');
const pdfParse = require('pdf-parse');
const Tesseract = require('tesseract.js');
const path = require('path');

const ScannerController = {
  scanDocument: async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const filePath = req.file.path;
      const ext = path.extname(req.file.originalname).toLowerCase();
      
      let text = '';

      // 1. Ekstrak Teks dari PDF atau Gambar
      if (ext === '.pdf') {
        const dataBuffer = fs.readFileSync(filePath);
        const data = await pdfParse(dataBuffer);
        text = data.text;
      } else if (['.jpg', '.jpeg', '.png'].includes(ext)) {
        const { data: { text: ocrText } } = await Tesseract.recognize(
          filePath,
          'eng+ind',
          { logger: m => console.log(m) }
        );
        text = ocrText;
      } else {
        // Hapus file
        fs.unlinkSync(filePath);
        return res.status(400).json({ error: 'Unsupported file type for scanning. Use PDF, JPG, or PNG.' });
      }

      // Hapus file sementara setelah diproses
      fs.unlinkSync(filePath);

      // 2. Lakukan Ekstraksi Data menggunakan Regex
      
      // -- Total SKS --
      let totalSks = '';
      const sksMatch = text.match(/Total Credits\s*:\s*(\d+)/i) || text.match(/Total SKS\s*:\s*(\d+)/i);
      if (sksMatch) totalSks = sksMatch[1];

      // -- IPK --
      let ipk = '';
      const ipkMatch = text.match(/Grade Point Average\s*:\s*(\d\.\d+)/i) || text.match(/Indeks Prestasi Kumulatif\s*:\s*(\d\.\d+)/i);
      if (ipkMatch) ipk = ipkMatch[1];

      // -- Tahun Masuk (Coba tebak dari NIM misalnya G1A024...) --
      let tahunMasuk = '';
      const nimMatch = text.match(/[A-Z]\d[A-Z]\d(\d{2})\d{3}/i);
      if (nimMatch) {
        tahunMasuk = '20' + nimMatch[1]; // misal '24' -> '2024'
      }

      // -- Daftar Mata Kuliah --
      const courses = [];
      // Pola: KODE (MFG-101) <spasi> Nama MK <spasi> SKS (1 digit) <spasi> Nilai (A/B+/C dll) <spasi> Bobot (angka.angka)
      // Menggunakan regex global untuk menangkap semua baris/pola mata kuliah
      // const courseRegex = /([A-Z]{3,4}-\d{3,4})\s+(.+?)\s+(\d)\s+([A-E][+-]?)\s+(?:\d+\.\d{1,2})\s+(?:\d+\.\d{1,2}|0)/g;
      
      // Pola yang lebih toleran jika hasil OCR agak kacau
      const courseRegex = /([A-Z]{3,4}-\d{3,4})\s+(.+?)\s+(\d)\s+([A-E][+-]?)\s+\d+\.\d+/g;
      let match;
      let courseCount = 0;
      
      while ((match = courseRegex.exec(text)) !== null) {
        let kodeMk = match[1].trim();
        let namaMk = match[2].trim();
        
        // Bersihkan namaMK dari karakter aneh akibat kolom sebelumnya jika ada
        // misal: "15 TIF-1202 PROYEK..." -> hapus "15 " di depan
        namaMk = namaMk.replace(/^\d+\s+/, '');
        
        // Hapus kode MK sebelumnya jika ada yang nyangkut di akhir namaMK
        // misal "STATISTIK TERAPAN 29 TIF-2110" -> ini sulit, tapi setidaknya kita punya data dasar
        
        let sks = match[3];
        let nilai = match[4];

        // Karena di OCR, nilai semester mungkin tidak terdeteksi langsung per baris, 
        // kita estimasikan semester berdasarkan urutan (misal tiap 7-8 matkul nambah 1 semester)
        let semester = Math.floor(courseCount / 8) + 1;
        
        courses.push({
          kodeMk,
          namaMk,
          sks,
          nilai,
          semester
        });
        courseCount++;
      }

      // 3. Kembalikan respons
      res.json({
        success: true,
        data: {
          totalSks,
          ipk,
          tahunMasuk,
          courses
        },
        rawText: text // untuk keperluan debugging frontend jika perlu
      });

    } catch (error) {
      console.error('Scanning Error:', error);
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      res.status(500).json({ error: 'Failed to scan document: ' + error.message });
    }
  }
};

module.exports = ScannerController;
