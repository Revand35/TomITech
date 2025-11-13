# Troubleshooting Guide

## Masalah yang Sering Terjadi

### 1. Content Security Policy (CSP) Violations untuk Font

**Gejala:**
```
Loading the font '<URL>' violates the following Content Security Policy directive: "font-src ..."
```

**Solusi:**
1. CSP sudah diperbarui di `chat.html` untuk mengizinkan font dari berbagai sumber
2. Jika masih error, coba:
   - **Hard refresh browser**: `Ctrl + Shift + R` (Windows) atau `Cmd + Shift + R` (Mac)
   - **Clear browser cache**: Hapus cache browser untuk halaman ini
   - **Disable browser extensions**: Beberapa extension bisa memblokir font loading

3. Jika masih bermasalah, tambahkan ini ke CSP (temporary untuk testing):
   ```html
   font-src 'self' https: data: blob: *;
   ```

### 2. Error 404 untuk firebase-init.js

**Gejala:**
```
GET http://127.0.0.1:8080/assets/config/firebase-init.js net::ERR_ABORTED 404 (Not Found)
```

**Penyebab:**
- Path relatif tidak benar di beberapa file JavaScript
- File `firebase-init.js` ada di `config/` (root), bukan `assets/config/`

**Solusi:**

#### A. Pastikan Struktur Folder Benar:
```
TomITech/
├── config/
│   └── firebase-init.js  ✅ Harus ada di sini
├── assets/
│   └── js/
│       ├── greenhouse/
│       │   └── greenhouse-service.js
│       └── core/
│           ├── hybrid-storage-service.js
│           └── firebase-activity-service.js
```

#### B. Path Import yang Benar (Sudah Diperbaiki):
- Dari `assets/js/greenhouse/greenhouse-service.js`: `../../../config/firebase-init.js`
- Dari `assets/js/core/hybrid-storage-service.js`: `../../../config/firebase-init.js`
- Dari `assets/js/core/firebase-activity-service.js`: `../../../config/firebase-init.js`
- Dari `pages/features/chat.html`: `../../config/firebase-init.js`

**Catatan:** File-file yang salah path sudah diperbaiki. Jika masih error, coba:
1. Hard refresh browser (`Ctrl + Shift + R`)
2. Clear browser cache
3. Restart development server

#### C. Jika Menggunakan Live Server:
1. Pastikan server dijalankan dari **root folder** (`TomITech/`)
2. Buka browser ke: `http://localhost:8080/pages/features/chat.html`
3. Jangan buka dari subfolder

#### D. Jika Menggunakan VS Code Live Server:
1. Klik kanan pada `chat.html`
2. Pilih "Open with Live Server"
3. Atau pastikan root folder di VS Code adalah `TomITech/`

#### E. Alternatif: Gunakan Absolute Path (untuk testing):
```javascript
// Hanya untuk testing lokal
const baseUrl = window.location.origin;
const { auth } = await import(`${baseUrl}/config/firebase-init.js`);
```

### 3. Font Tidak Tampil

**Solusi:**
1. **Cek koneksi internet**: Font Google Fonts memerlukan koneksi internet
2. **Cek console browser**: Lihat apakah ada error loading font
3. **Gunakan fallback font**: CSS sudah memiliki fallback:
   ```css
   font-family: 'Poppins', 'Inter', sans-serif;
   ```

### 4. Import Module Error

**Gejala:**
```
Failed to resolve module specifier
```

**Solusi:**
1. Pastikan menggunakan `type="module"` di script tag:
   ```html
   <script type="module">
   ```
2. Pastikan path menggunakan `.js` extension:
   ```javascript
   import { auth } from '../../config/firebase-init.js'; // ✅
   import { auth } from '../../config/firebase-init';    // ❌
   ```

### 5. Tracking Prevention Warnings

**Gejala:**
```
Tracking Prevention blocked access to storage for <URL>
```

**Penjelasan:**
- Ini adalah **warning**, bukan error
- Browser Edge (dan beberapa browser modern) memblokir akses storage dari third-party untuk privasi
- Aplikasi tetap berfungsi normal
- Biasanya muncul untuk resource eksternal (Google Fonts, Firebase CDN, dll)

**Solusi:**
1. **Tidak perlu action** - Ini hanya warning, tidak mempengaruhi fungsi aplikasi
2. Jika ingin mengurangi warning:
   - Gunakan self-hosted fonts (download dan serve lokal)
   - Pastikan semua resource menggunakan HTTPS
   - Gunakan `rel="preconnect"` untuk resource eksternal:
     ```html
     <link rel="preconnect" href="https://fonts.googleapis.com">
     <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
     ```
3. **Tidak bisa di-disable** - Ini adalah fitur keamanan browser

## Checklist Troubleshooting

- [ ] File `config/firebase-init.js` ada dan bisa diakses
- [ ] Path import menggunakan `../../config/firebase-init.js` dari `pages/features/`
- [ ] Server dijalankan dari root folder project
- [ ] Browser cache sudah di-clear
- [ ] Hard refresh sudah dilakukan (`Ctrl + Shift + R`)
- [ ] Console browser tidak ada error lain
- [ ] Koneksi internet aktif (untuk Google Fonts)

## Testing

1. Buka browser console (`F12`)
2. Cek tab **Network** untuk melihat request yang gagal
3. Cek tab **Console** untuk error messages
4. Cek tab **Security** untuk CSP violations

## Kontak Support

Jika masalah masih terjadi setelah mengikuti semua langkah di atas:
1. Screenshot error di console
2. Screenshot struktur folder
3. Informasi browser dan versi
4. Informasi server yang digunakan (Live Server, XAMPP, dll)

