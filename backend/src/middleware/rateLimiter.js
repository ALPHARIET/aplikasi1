const rateLimit = require('express-rate-limit');

// Rate limiter untuk login: maksimal 10 percobaan per 15 menit per IP
const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 menit
  max: 10, // Maksimal 10 request per windowMs
  standardHeaders: true, // Kembalikan info rate limit di headers `RateLimit-*`
  legacyHeaders: false, // Nonaktifkan headers `X-RateLimit-*`
  message: {
    error: 'Terlalu banyak percobaan masuk. Silakan coba lagi setelah 15 menit.'
  }
});

module.exports = {
  loginRateLimiter
};

