# 🔑 API Key Rotation untuk Gemini AI

Dokumentasi ini menjelaskan sistem rotasi API key otomatis untuk Gemini AI di aplikasi TOMITECH.

## 📋 Overview

Sistem rotasi API key memungkinkan aplikasi untuk menggunakan beberapa API key Gemini secara bergantian. Jika satu API key gagal (expired, invalid, atau quota habis), sistem akan otomatis beralih ke API key berikutnya.

## ✨ Fitur

- ✅ **Rotasi Otomatis**: Sistem otomatis menggunakan API key yang tersedia
- ✅ **Fallback Mechanism**: Jika satu key gagal, otomatis switch ke key berikutnya
- ✅ **Tracking Failed Keys**: Sistem mencatat key yang sudah gagal untuk menghindari penggunaan ulang
- ✅ **Daily Reset**: Failed keys di-reset setiap hari untuk memberikan kesempatan kedua
- ✅ **Persistent State**: State rotasi disimpan di localStorage
- ✅ **Backward Compatible**: Tetap mendukung `geminiApiKey` single key

## 🔧 Konfigurasi

### 1. Menambahkan Multiple API Keys

Edit file `config/config.js` dan tambahkan beberapa API key ke dalam array `geminiApiKeys`:

```javascript
export const geminiApiKeys = [
    "AIzaSyB_LrfNSRdHRarokIAjEsOahfSkshSeWXM", // Primary key
    "AIzaSy...", // Key 2
    "AIzaSy...", // Key 3
    // Tambahkan lebih banyak key sesuai kebutuhan
];
```

### 2. Mendapatkan API Key Baru

1. Buka: https://aistudio.google.com/app/apikey
2. Klik "Create API Key"
3. Pilih project atau buat project baru
4. Copy API key yang dihasilkan
5. Tambahkan ke array `geminiApiKeys` di `config/config.js`

## 🚀 Cara Kerja

### 1. Initialization
- Saat aplikasi dimuat, sistem akan memuat index API key terakhir yang digunakan dari localStorage
- Jika tidak ada, akan menggunakan key pertama (index 0)

### 2. API Key Selection
- Sistem menggunakan `getCurrentApiKey()` untuk mendapatkan API key yang sedang aktif
- Key dipilih berdasarkan `currentApiKeyIndex`

### 3. Error Handling
Ketika terjadi error, sistem akan:

1. **API Key Error (401/403)**: 
   - Mark current key sebagai failed
   - Switch ke key berikutnya
   - Retry request dengan key baru

2. **Quota Error (429)**:
   - Mark current key sebagai failed (quota exceeded)
   - Switch ke key berikutnya
   - Retry request dengan key baru

3. **All Keys Failed**:
   - Tampilkan error message
   - Berikan instruksi untuk menambahkan key baru

### 4. Daily Reset
- Setiap hari, sistem akan otomatis reset failed keys list
- Memberikan kesempatan kedua untuk key yang sebelumnya gagal

## 📊 Monitoring

### Console Logs

Sistem akan menampilkan log di browser console:

```
🔑 API Key Rotation initialized. Using key 1/3
✅ Gemini AI initialized successfully with API key 1/3
⚠️ API key 1 failed (401), trying next key...
🔄 Switched to API key 2/3
✅ Available models (prioritized) with API key 2/3: [...]
```

### localStorage Keys

Sistem menyimpan state di localStorage:

- `gemini_current_api_key_index`: Index API key yang sedang digunakan
- `gemini_failed_api_keys`: Array index key yang sudah gagal
- `gemini_failed_keys_reset_date`: Tanggal terakhir reset failed keys

## 🔍 Troubleshooting

### Semua API Key Gagal

Jika semua API key gagal, lakukan:

1. **Cek API Keys**:
   - Pastikan semua key valid di https://aistudio.google.com/app/apikey
   - Pastikan key tidak expired
   - Pastikan key memiliki quota yang tersedia

2. **Reset Manual**:
   ```javascript
   // Di browser console:
   localStorage.removeItem('gemini_current_api_key_index');
   localStorage.removeItem('gemini_failed_api_keys');
   localStorage.removeItem('gemini_failed_keys_reset_date');
   // Refresh halaman
   ```

3. **Tambah Key Baru**:
   - Buat API key baru
   - Tambahkan ke array `geminiApiKeys`
   - Refresh halaman

### Key Tidak Berpindah

Jika key tidak otomatis berpindah:

1. Cek console untuk error messages
2. Pastikan ada lebih dari 1 key di array `geminiApiKeys`
3. Cek apakah key yang gagal sudah di-mark sebagai failed di localStorage

## 💡 Best Practices

1. **Gunakan 3-5 API Keys**: 
   - Memberikan redundancy yang cukup
   - Memungkinkan distribusi beban

2. **Monitor Quota**:
   - Cek quota setiap key secara berkala
   - Tambahkan key baru sebelum quota habis

3. **Backup Keys**:
   - Simpan API keys di tempat aman
   - Jangan commit API keys ke public repository

4. **Regular Maintenance**:
   - Review failed keys secara berkala
   - Hapus key yang sudah tidak valid

## 📝 Contoh Konfigurasi

```javascript
// config/config.js
export const geminiApiKeys = [
    "AIzaSyB_LrfNSRdHRarokIAjEsOahfSkshSeWXM", // Primary - Production
    "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",     // Backup 1
    "AIzaSyYYYYYYYYYYYYYYYYYYYYYYYYYYYYY",     // Backup 2
    "AIzaSyZZZZZZZZZZZZZZZZZZZZZZZZZZZZ",     // Backup 3
];
```

## 🔐 Security Notes

- ⚠️ **Jangan commit API keys ke Git**: Gunakan environment variables atau config yang di-ignore
- ⚠️ **Rotate keys secara berkala**: Ganti key yang sudah lama digunakan
- ⚠️ **Monitor usage**: Cek penggunaan setiap key untuk deteksi abuse
- ⚠️ **Limit permissions**: Gunakan API key dengan permission minimal yang diperlukan

## 📚 Related Documentation

- [FIX_API_KEY_EXPIRED.md](./FIX_API_KEY_EXPIRED.md) - Cara memperbaiki expired API key
- [Gemini API Documentation](https://ai.google.dev/docs) - Dokumentasi resmi Gemini API

