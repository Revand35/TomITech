# 🔧 Fix Error: Unauthorized Domain

## ❌ Error yang Terjadi
```
Firebase: Error (auth/unauthorized-domain)
Domain tidak diizinkan. Hubungi administrator.
```

## ✅ Solusi

### Langkah 1: Buka Firebase Console
1. Buka [Firebase Console](https://console.firebase.google.com/)
2. Pilih project **`tomitech-id`**

### Langkah 2: Tambahkan Authorized Domains
1. Di sidebar, klik **"Authentication"**
2. Klik tab **"Settings"** (ikon ⚙️ di bagian atas)
3. Scroll ke bawah ke bagian **"Authorized domains"**
4. Klik **"Add domain"**
5. Tambahkan domain berikut:
   - `127.0.0.1` (untuk localhost dengan IP)
   - `localhost` (untuk localhost dengan nama)
6. Klik **"Add"** untuk masing-masing domain

### Langkah 3: Verifikasi
Setelah menambahkan domain, Anda akan melihat:
- ✅ `localhost` - Added
- ✅ `127.0.0.1` - Added
- ✅ `tomitech-id.firebaseapp.com` - Default (sudah ada)
- ✅ `tomitech-id.web.app` - Default (sudah ada)

### Langkah 4: Test Lagi
1. Refresh halaman login di browser
2. Coba login dengan Google lagi
3. Seharusnya sudah berhasil!

## 📝 Catatan

### Domain yang Perlu Ditambahkan:
- **Development**: `localhost`, `127.0.0.1`
- **Production**: Domain Anda (misalnya: `tomitech.web.app`)

### Screenshot Lokasi:
1. Firebase Console > Authentication > Settings
2. Scroll ke "Authorized domains"
3. Klik "Add domain"

## 🎯 Quick Fix
Jika masih error setelah menambahkan domain:
1. **Clear browser cache** atau gunakan **Incognito/Private mode**
2. **Hard refresh** halaman (Ctrl+Shift+R atau Cmd+Shift+R)
3. Tunggu beberapa detik agar perubahan tersinkronisasi

---

**Status**: Setelah menambahkan domain, error akan hilang dan login Google akan berfungsi! ✅

