# aplikasi1 — Diploma Registry berbasis Blockchain

Ini web belajar blockchain: sistem penerbitan dan verifikasi ijazah/transkrip. Hash SHA-256 dokumen disimpan di smart contract, data lengkap disimpan di MySQL, dan setiap dokumen mendapat QR code untuk verifikasi publik.

## Struktur

| Folder        | Isi                                                                 |
|---------------|---------------------------------------------------------------------|
| `blockchain/` | Smart contract `DocumentRegistry.sol` (Hardhat 3 + OpenZeppelin)    |
| `backend/`    | REST API Express + MySQL + ethers v6 (JWT, upload, QR, OCR)         |
| `frontend/`   | React + Vite + Tailwind (Login, Admin, Mahasiswa, Verifikasi)       |
| `uploads/`    | File dokumen & QR code hasil upload (dibuat otomatis, tidak di-commit) |

## Prasyarat

- **Node.js 22+** (dibutuhkan Hardhat 3) — cek dengan `node -v`
- **MySQL** yang sedang berjalan (misalnya lewat XAMPP / Laragon)
- Git

## 1. Konfigurasi `backend/.env`

Buat file `backend/.env` (tidak ikut di-commit) dengan isi seperti ini:

```env
PORT=5000
NODE_ENV=development

# Database Config
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=diploma_registry

# JWT Config
JWT_SECRET=ganti_dengan_teks_acak_panjang
JWT_EXPIRES_IN=24h

# Blockchain Config (Local Hardhat Node)
RPC_URL=http://127.0.0.1:8545
# Kosongkan agar otomatis dibaca dari blockchain/deployment.json
CONTRACT_ADDRESS=
# Private key Account #0 yang tampil saat `npx hardhat node` dijalankan
OWNER_PRIVATE_KEY=
```

> `OWNER_PRIVATE_KEY` harus milik akun yang men-deploy contract (Account #0), karena hanya owner yang boleh menerbitkan/mencabut dokumen.

## 2. Jalankan aplikasi (4 terminal)

### Terminal 1 — Blockchain lokal (biarkan tetap terbuka)

```bash
cd blockchain
npm install
npx hardhat node
```

Node berjalan di `http://127.0.0.1:8545`. Salin private key **Account #0** ke `OWNER_PRIVATE_KEY` di `backend/.env`.

### Terminal 2 — Deploy smart contract

```bash
cd blockchain
npx hardhat run scripts/deploy.js --network localhost
```

Perintah ini menulis `blockchain/deployment.json` (alamat contract + ABI) yang dibaca oleh backend.

### Terminal 3 — Backend

```bash
cd backend
npm install
node database/migrations/run_migration.js   # buat database + tabel (sekali saja)
node database/migrations/seed_admin.js      # buat akun admin (sekali saja)
npm run dev                                  # API di http://localhost:5000
```

Jika berhasil, log akan menampilkan:

```
✅ Connected to MySQL Database
✅ Blockchain Service Initialized. Contract: 0x...
```

### Terminal 4 — Frontend

```bash
cd frontend
npm install
npm run dev                                  # buka http://localhost:5173
```

## 3. Mencoba aplikasi

- Login admin: **admin@univ.edu** / **adminpassword123**
- Admin dapat menambah mahasiswa, upload & menerbitkan dokumen ke blockchain, dan mencabut (revoke) dokumen.
- Halaman verifikasi publik: `http://localhost:5173/verify` (bisa lewat Verification ID, QR code, atau upload file untuk dicocokkan hash-nya).
  Jika file transkrip yang diupload berbeda dari aslinya, field yang dimanipulasi ditandai kotak merah di atas dokumen.

### Data demo (opsional)

Dengan backend dan Hardhat node berjalan:

```bash
cd backend
npm run seed:demo
```

Perintah ini membuat **10 mahasiswa demo** (data fiktif, "Universitas Contoh Nusantara"). Masing-masing punya akun
sendiri dan **1 transkrip asli** yang langsung diterbitkan ke blockchain, plus **1 versi palsu** yang tidak diterbitkan.
Semua akun mahasiswa demo memakai password **demopassword123**.

Hasilnya tersimpan di `backend/database/seeds/demo-transcripts/`:

- `asli/` — 10 file yang diterbitkan (verifikasi → valid)
- `palsu/` — 10 versi yang sudah dimanipulasi (verifikasi → field yang diubah ditandai kotak merah)
- `DAFTAR-VERIFICATION-ID.txt` — nama, email login, Verification ID, dan pasangan file asli/palsu tiap mahasiswa

Upload file dengan Verification ID pasangannya di halaman verifikasi. Aman dijalankan ulang: transkrip yang masih valid
di blockchain dipertahankan, yang tidak valid (mis. setelah Hardhat node di-restart dan contract di-deploy ulang)
diterbitkan ulang. File PDF dibuat deterministik, jadi file `asli/` selalu cocok dengan yang terdaftar.

## Catatan penting

- **Hardhat node menyimpan data di memori.** Setiap kali `npx hardhat node` dimatikan, semua data blockchain hilang. Setelah menyalakannya lagi, ulangi langkah deploy (Terminal 2) lalu restart backend. Dokumen lama di MySQL akan terbaca **tidak valid** karena tidak ada lagi di blockchain — terbitkan ulang untuk demo.
- Jika `CONTRACT_ADDRESS` diisi di `.env`, nilainya menimpa `deployment.json`. Pastikan sama dengan alamat hasil deploy terbaru, atau kosongkan saja.
- Frontend memanggil API di `http://localhost:5000/api/v1` (`frontend/src/services/api.js`), jadi backend harus berjalan di port 5000.

## Testing smart contract

```bash
cd blockchain
npx hardhat test
```
