# 🚀 Langkah-Langkah Setup Firebase untuk Halaman Forum

Panduan praktis step-by-step untuk setup Firebase Firestore.

---

## 📋 Persiapan

Pastikan Anda sudah:
- ✅ Memiliki akses ke Firebase Console
- ✅ Project Firebase sudah dibuat
- ✅ Firestore Database sudah diaktifkan

---

## LANGKAH 1: Buka Firebase Console

1. Buka browser dan kunjungi: **https://console.firebase.google.com**
2. Pilih project Anda (atau buat project baru jika belum ada)
3. Klik menu **"Firestore Database"** di sidebar kiri

---

## LANGKAH 2: Setup Firestore Indexes

### Index 1: aggregate_data

1. Di halaman Firestore Database, klik tab **"Indexes"** (di bagian atas)
2. Klik tombol **"Create Index"** (atau "Create index")
3. Isi form berikut:
   - **Collection ID:** `aggregate_data`
   - **Fields to index:**
     - Field 1: `userId` → Order: **Ascending** (↑)
     - Field 2: `timestamp` → Order: **Descending** (↓)
   - **Query scope:** Pilih **"Collection"**
4. Klik **"Create"**
5. Tunggu hingga status berubah menjadi **"Enabled"** (biasanya 1-2 menit)

### Index 2: ai_summaries

1. Klik tombol **"Create Index"** lagi
2. Isi form berikut:
   - **Collection ID:** `ai_summaries`
   - **Fields to index:**
     - Field 1: `userId` → Order: **Ascending** (↑)
     - Field 2: `date` → Order: **Descending** (↓)
   - **Query scope:** Pilih **"Collection"**
3. Klik **"Create"**
4. Tunggu hingga status berubah menjadi **"Enabled"**

**Catatan:** Jika index sudah ada, Firebase akan menampilkan pesan "Index already exists". Itu berarti sudah siap digunakan.

---

## LANGKAH 3: Setup Security Rules

1. Di halaman Firestore Database, klik tab **"Rules"** (di bagian atas)
2. Anda akan melihat editor untuk Firestore Rules
3. **Copy dan paste** rules berikut di bagian akhir (sebelum closing brace `}`):

```javascript
// User Preferences - User hanya bisa akses preferences mereka sendiri
match /user_preferences/{userId} {
  allow read, write: if request.auth != null && request.auth.uid == userId;
}

// Report Views - User bisa create tracking, admin bisa read semua
match /report_views/{viewId} {
  allow create: if request.auth != null && 
                   request.resource.data.userId == request.auth.uid;
  allow read: if request.auth != null;
  allow update, delete: if false;
}
```

4. **Contoh Rules Lengkap** (jika rules Anda masih kosong):

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // User Preferences
    match /user_preferences/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Report Views (Analytics)
    match /report_views/{viewId} {
      allow create: if request.auth != null && 
                       request.resource.data.userId == request.auth.uid;
      allow read: if request.auth != null;
      allow update, delete: if false;
    }
    
    // Aggregate Data (untuk reports)
    match /aggregate_data/{dataId} {
      allow read, write: if request.auth != null && 
                           request.resource.data.userId == request.auth.uid;
    }
    
    // AI Summaries (untuk reports)
    match /ai_summaries/{summaryId} {
      allow read, write: if request.auth != null && 
                            request.resource.data.userId == request.auth.uid;
    }
  }
}
```

5. Klik tombol **"Publish"** (di bagian atas editor)
6. Konfirmasi jika ada dialog popup

**Catatan:** 
- Rules ini memastikan user hanya bisa akses data mereka sendiri
- User bisa membuat tracking views untuk analytics
- User tidak bisa update/delete views (untuk data integrity)

---

## LANGKAH 4: Verifikasi Collections (Opsional)

Collections akan dibuat **otomatis** saat pertama kali digunakan. Tapi jika ingin verifikasi:

1. Klik tab **"Data"** di Firestore Database
2. Anda akan melihat daftar collections
3. Collections yang akan dibuat otomatis:
   - `user_preferences` (saat user pertama kali save preferences)
   - `report_views` (saat user pertama kali klik report)

**Tidak perlu membuat manual!** Biarkan aplikasi yang membuat saat runtime.

---

## LANGKAH 5: Test Setup

### Test 1: Buka Aplikasi

1. Buka halaman `forum.html` di browser
2. Buka **Developer Console** (tekan `F12` atau `Ctrl+Shift+I`)
3. Cek console log, harus muncul:
   ```
   ✅ User authenticated: [email]
   ✅ Real-time listener setup complete
   📡 Setting up real-time reports listener for user: [userId]
   ```

### Test 2: Test User Preferences

1. Di halaman forum, ubah **filter category** (misalnya klik "Tanaman")
2. Ubah **search term** (ketik sesuatu di search box)
3. Ubah **sort option** (klik tombol sort, pilih sorting)
4. **Refresh halaman** (F5)
5. **Verifikasi:** Preferences harus tersimpan dan auto-load

**Cek di Firebase Console:**
- Buka Firestore Database → Data
- Klik collection `user_preferences`
- Harus ada document dengan ID = `{userId}`
- Cek field `reports` berisi preferences yang disimpan

### Test 3: Test Real-time Updates

1. Buka halaman `forum.html`
2. Buka **Firebase Console** di tab lain
3. Buka Firestore Database → Data
4. Pilih collection `aggregate_data` atau `ai_summaries`
5. **Edit salah satu document** (ubah field apapun)
6. **Kembali ke browser** dengan halaman forum
7. **Verifikasi:** Harus muncul notifikasi "Memperbarui laporan..." di browser

### Test 4: Test Analytics Tracking

1. Di halaman forum, **klik salah satu report card**
2. Modal detail harus terbuka
3. **Cek di Firebase Console:**
   - Buka Firestore Database → Data
   - Klik collection `report_views`
   - Harus ada document baru dengan:
     - `userId` = user ID yang sedang login
     - `reportId` = ID report yang diklik
     - `reportType` = "aggregate" atau "summary"
     - `viewedAt` = timestamp saat ini

---

## LANGKAH 6: Troubleshooting

### Error: "The query requires an index"

**Solusi:**
1. Klik **link yang muncul di error message** (Firebase akan redirect ke halaman create index)
2. Atau buat index manual di Firebase Console → Indexes
3. Pastikan index status = **"Enabled"** (bukan "Building")

### Error: "Missing or insufficient permissions"

**Solusi:**
1. Cek Security Rules sudah di-publish
2. Pastikan user sudah **login** di aplikasi
3. Pastikan `userId` di document match dengan user yang login
4. Cek console browser untuk error detail

### Real-time listener tidak bekerja

**Solusi:**
1. Cek console browser untuk error messages
2. Pastikan indexes sudah dibuat dan status **"Enabled"**
3. Pastikan security rules mengizinkan **read** access
4. Cek koneksi internet stabil
5. Refresh halaman (F5)

### Preferences tidak tersimpan

**Solusi:**
1. Cek console browser untuk error messages
2. Pastikan security rules mengizinkan **write** access untuk `user_preferences`
3. Pastikan user sudah **login**
4. Cek localStorage sebagai fallback (buka DevTools → Application → Local Storage)

---

## ✅ Checklist Final

Setelah semua langkah selesai, pastikan:

- [ ] Index `aggregate_data` (userId + timestamp) sudah dibuat dan **Enabled**
- [ ] Index `ai_summaries` (userId + date) sudah dibuat dan **Enabled**
- [ ] Security Rules sudah di-update dan di-publish
- [ ] Test real-time listener berhasil (console log muncul)
- [ ] Test user preferences berhasil (tersimpan dan auto-load)
- [ ] Test analytics tracking berhasil (document muncul di `report_views`)
- [ ] Tidak ada error di console browser

---

## 🎯 Quick Reference

### URL Penting:
- **Firebase Console:** https://console.firebase.google.com
- **Firestore Database:** https://console.firebase.google.com/project/[PROJECT_ID]/firestore
- **Indexes:** https://console.firebase.google.com/project/[PROJECT_ID]/firestore/indexes
- **Rules:** https://console.firebase.google.com/project/[PROJECT_ID]/firestore/rules

### Collections yang Akan Dibuat Otomatis:
- `user_preferences/{userId}` - Preferensi user (filter, sort, search)
- `report_views/{autoId}` - Analytics tracking untuk report views

### Collections yang Sudah Ada (Pastikan Rules Benar):
- `aggregate_data` - Data agregat untuk reports
- `ai_summaries` - AI summaries untuk reports

---

## 📞 Bantuan

Jika masih ada masalah:
1. Cek **console browser** untuk error messages detail
2. Cek **Firebase Console → Firestore → Usage** untuk melihat aktivitas
3. Pastikan semua **indexes status = "Enabled"**
4. Pastikan **Security Rules sudah di-publish**

---

**Last Updated:** 2025-01-XX  
**Version:** 1.0

