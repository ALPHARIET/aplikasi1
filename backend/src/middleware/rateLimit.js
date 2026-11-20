// Pembatas jumlah permintaan per IP dalam jendela waktu tetap (tanpa dependensi).
// Dipakai untuk endpoint publik yang berat, mis. POST /documents/verify-file yang membaca dan
// membandingkan dua PDF: tanpa batas, satu pengirim bisa membuat pemeriksaan lambat untuk semua orang.
function createRateLimit({ max, windowMs, message, now = () => Date.now() }) {
  const hits = new Map(); // ip -> { count, resetAt }

  function rateLimit(req, res, next) {
    const t = now();
    if (hits.size > 10000) {
      for (const [k, e] of hits) if (e.resetAt <= t) hits.delete(k);
    }
    const key = req.ip || 'unknown';
    let entry = hits.get(key);
    if (!entry || entry.resetAt <= t) {
      entry = { count: 0, resetAt: t + windowMs };
      hits.set(key, entry);
    }
    entry.count += 1;
    if (entry.count > max) {
      const seconds = Math.max(1, Math.ceil((entry.resetAt - t) / 1000));
      res.set('Retry-After', String(seconds));
      return res.status(429).json({ error: message(seconds), code: 'RATE_LIMITED', retryAfterSeconds: seconds });
    }
    next();
  }

  rateLimit.reset = () => hits.clear();
  return rateLimit;
}

// 60 pemeriksaan berkas per menit per IP: jauh di atas kebutuhan pemeriksa biasa
const verifyFileLimit = createRateLimit({
  max: Number(process.env.VERIFY_FILE_MAX_PER_MINUTE) || 60,
  windowMs: 60 * 1000,
  message: (s) => `Terlalu banyak pemeriksaan berkas dari perangkat ini. Coba lagi dalam ${s} detik.`
});

module.exports = { createRateLimit, verifyFileLimit };
