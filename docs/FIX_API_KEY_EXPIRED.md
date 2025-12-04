# 🔧 Cara Memperbaiki API Key Expired

## Masalah
Error yang muncul:
```
API key expired. Please renew the API key.
API_KEY_INVALID
```

## Solusi

### 1. Generate API Key Baru di Google AI Studio

1. **Buka Google AI Studio:**
   - Kunjungi: https://aistudio.google.com/app/apikey
   - Login dengan akun Google yang sama dengan Firebase project

2. **Buat API Key Baru:**
   - Klik **"Create API Key"** atau **"Get API Key"**
   - Pilih project Firebase Anda (tomitech-id)
   - Copy API key yang baru dibuat

3. **Update API Key di Project:**

   Buka file: `config/config.js`
   
   Ganti baris ini:
   ```javascript
   export const geminiApiKey = "AIzaSyBKCLB3d6ucJOMjnShtQogMFh6OHVL2Mck";
   ```
   
   Dengan API key baru Anda:
   ```javascript
   export const geminiApiKey = "YOUR_NEW_API_KEY_HERE";
   ```

4. **Simpan dan Refresh:**
   - Simpan file `config/config.js`
   - Refresh halaman chat (F5 atau Ctrl+R)
   - Coba kirim pesan lagi

### 2. Verifikasi API Key

Setelah update, cek console browser:
- ✅ `✅ Gemini AI initialized successfully` = API key valid
- ❌ `❌ API Key Error` = API key masih tidak valid

### 3. Tips Keamanan

⚠️ **PENTING:** Jangan commit API key ke public repository!

- Pastikan `config/config.js` ada di `.gitignore`
- Gunakan environment variables untuk production
- Rotate API key secara berkala

---

## Masalah Lain: Tracking Prevention Warning

Warning ini biasanya tidak kritis dan muncul karena:
- Browser (Edge) memblokir akses storage dari third-party
- Biasanya tidak mempengaruhi fungsi aplikasi

**Solusi (Opsional):**
- Buka Edge Settings → Privacy, search, and services
- Di bagian "Tracking prevention", pilih "Balanced" atau "Basic"
- Atau tambahkan domain ke "Exceptions"

---

## Firestore Index Missing

Warning tentang index yang diperlukan untuk query chat history.

**Solusi:**

1. **Otomatis (Recommended):**
   - Klik link yang muncul di console:
   ```
   https://console.firebase.google.com/v1/r/project/tomitech-id/firestore/indexes?create_composite=...
   ```
   - Klik "Create Index"
   - Tunggu beberapa menit hingga index selesai dibuat

2. **Manual:**
   - Buka Firebase Console → Firestore Database → Indexes
   - Klik "Create Index"
   - Collection: `chatHistory`
   - Fields:
     - `userId` (Ascending)
     - `createdAt` (Descending)
   - Klik "Create"

---

## Troubleshooting

### API Key masih tidak bekerja?

1. **Cek API Key di Google AI Studio:**
   - Pastikan API key aktif
   - Pastikan Gemini API enabled untuk project

2. **Cek Quota:**
   - Buka: https://aistudio.google.com/app/apikey
   - Lihat usage dan quota
   - Pastikan tidak melebihi limit

3. **Cek Browser Console:**
   - Buka Developer Tools (F12)
   - Lihat tab Console untuk error detail

4. **Clear Cache:**
   - Clear browser cache
   - Hard refresh (Ctrl+Shift+R)

---

## Support

Jika masih ada masalah:
1. Cek error message di browser console
2. Verifikasi API key di Google AI Studio
3. Pastikan project Firebase dan Google AI Studio menggunakan akun yang sama

