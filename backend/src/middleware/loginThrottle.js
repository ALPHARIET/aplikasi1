// Penahan tebak kata sandi (brute force) untuk rute login.
// Hanya percobaan yang GAGAL (401) yang dihitung, jadi pengguna yang masuk dengan benar tidak
// pernah tertahan. Login yang berhasil menghapus hitungan akun itu.
//  - per akun + IP: setelah MAX_PER_ACCOUNT kali salah, akun itu ditahan dari IP tersebut
//  - per IP: setelah MAX_PER_IP kali salah ke akun mana pun, IP itu ditahan (menahan tebakan massal)
// Penahanan berlaku sampai jendela WINDOW_MS sejak kegagalan pertama habis.

function createLoginThrottle({
  maxPerAccount = Number(process.env.LOGIN_MAX_FAILS_PER_ACCOUNT) || 10,
  maxPerIp = Number(process.env.LOGIN_MAX_FAILS_PER_IP) || 50,
  windowMs = (Number(process.env.LOGIN_LOCK_MINUTES) || 15) * 60 * 1000,
  now = () => Date.now()
} = {}) {
  const failures = new Map(); // key -> { count, resetAt }

  const current = (key) => {
    const entry = failures.get(key);
    if (entry && entry.resetAt <= now()) {
      failures.delete(key);
      return null;
    }
    return entry || null;
  };

  const addFailure = (key) => {
    const entry = current(key);
    if (entry) entry.count += 1;
    else failures.set(key, { count: 1, resetAt: now() + windowMs });
  };

  const loginIdOf = (body = {}) =>
    String(body.identifier || body.studentIdNumber || body.email || '').trim().toLowerCase();

  function loginThrottle(req, res, next) {
    const ip = req.ip || 'unknown';
    const accountKey = `akun:${loginIdOf(req.body)}|${ip}`;
    const ipKey = `ip:${ip}`;

    const account = current(accountKey);
    const byIp = current(ipKey);
    const blocked = (account && account.count >= maxPerAccount && account)
      || (byIp && byIp.count >= maxPerIp && byIp);

    if (blocked) {
      const seconds = Math.max(1, Math.ceil((blocked.resetAt - now()) / 1000));
      res.set('Retry-After', String(seconds));
      return res.status(429).json({
        error: `Terlalu banyak kata sandi salah. Coba lagi dalam ${Math.ceil(seconds / 60)} menit.`,
        code: 'LOGIN_LOCKED',
        retryAfterSeconds: seconds
      });
    }

    res.on('finish', () => {
      if (res.statusCode === 401) {
        addFailure(accountKey);
        addFailure(ipKey);
      } else if (res.statusCode === 200) {
        failures.delete(accountKey);
      }
    });
    next();
  }

  loginThrottle.reset = () => failures.clear();
  return loginThrottle;
}

module.exports = { createLoginThrottle, loginThrottle: createLoginThrottle() };
